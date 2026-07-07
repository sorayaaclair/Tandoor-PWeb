// src/pages/admin/AdminDashboard.jsx
import React, { useState, useEffect } from 'react';
import { supabase, adjustStock } from '../../supabaseClient';

import packageImg from '../../assets/package.png';
import groupImg from '../../assets/Group_light.png';
import timeImg from '../../assets/Time.png';
import deliveryImg from '../../assets/package_car.png';
import deskImg from '../../assets/Desk_alt.png';
import userImg from '../../assets/User.png';
import delivery2Img from '../../assets/package_car (1).png';
import analysisImg from '../../assets/Line_up.png';
import paymentImg from '../../assets/Arhive_alt_add.png';
import package2Img from '../../assets/package (1).png';
import messageImg from '../../assets/Message.png'; 

const AdminDashboard = ({ session, setPage, currentPage }) => {
  const [rentals, setRentals] = useState([]);
  const [totalCustomers, setTotalCustomers] = useState(0); 
  const [totalPeralatan, setTotalPeralatan] = useState(0);
  const [loadingFetch, setLoadingFetch] = useState(true);

  // STATE BARU: Untuk kontrol pop-up modal penolakan
  const [rejectModal, setRejectModal] = useState({ isOpen: false, transaksiId: null, reason: "" });

  useEffect(() => {
    fetchPenyewaanData();
  }, []);

  const fetchPenyewaanData = async () => {
    try {
      setLoadingFetch(true);
      
      const { data: penyewaanData, error: penyewaanError } = await supabase
        .from('penyewaan')
        .select('*')
        .order('tgl_pesan', { ascending: false });

      if (penyewaanError) throw penyewaanError;

      let initialFinalized = [];
      if (penyewaanData && penyewaanData.length > 0) {
        initialFinalized = penyewaanData.map(sewa => ({
          ...sewa,
          nama_lahan_display: sewa.nama_pertanian || 'Tidak Ada Nama Lahan',
          nama_pelanggan_display: 'Pelanggan Tandoor',
          bukti_pembayaran_url: null
        }));
      }

      try {
        const { data: lahanData } = await supabase.from('informasi_lahan').select('*');
        const { data: customerData } = await supabase.from('customer').select('*');
        const { data: pembayaranData } = await supabase.from('pembayaran').select('id_pembayaran, bukti_pembayaran');
        const { data: peralatanData } = await supabase.from('katalog_alat').select('id_alat');

        if (customerData) {
          setTotalCustomers(customerData.length);
        }
        if (peralatanData) {
          setTotalPeralatan(peralatanData.length);
        }

        if (penyewaanData && penyewaanData.length > 0) {
          initialFinalized = penyewaanData.map(sewa => {
            const cocokLahan = lahanData?.find(lahan => {
              const alamatLahan = lahan.alamat || lahan.alamat_lahan || '';
              return lahan.id_cust === sewa.id_cust && alamatLahan === sewa.alamat_pengantaran;
            });

            const cocokCust = customerData?.find(cust => cust.id_cust === sewa.id_cust);
            const cocokBayar = pembayaranData?.find(p => p.id_pembayaran === sewa.id_pembayaran);
            
            let namaLengkap = null;
            if (cocokCust) {
              const depan = cocokCust.nama_depan ? cocokCust.nama_depan.trim() : "";
              const belakang = cocokCust.nama_belakang ? cocokCust.nama_belakang.trim() : "";
              namaLengkap = `${depan} ${belakang}`.trim();
            }

            return {
              ...sewa,
              nama_lahan_display: cocokLahan ? cocokLahan.nama_lahan : (sewa.nama_pertanian || 'Tidak Ada Nama Lahan'),
              nama_pelanggan_display: namaLengkap || 'Pelanggan Tandoor',
              bukti_pembayaran_url: cocokBayar ? cocokBayar.bukti_pembayaran : null
            };
          });
        }
      } catch (innerErr) {
        console.warn("Pencocokan silang dilewati karena variasi skema tabel:", innerErr.message);
      }

      setRentals(initialFinalized);
    } catch (err) {
      console.error("Gagal mengambil data dari tabel penyewaan:", err.message);
    } finally {
      setLoadingFetch(false);
    }
  };

  // PENYESUAIAN: Menyelaraskan dengan pemetaan status Supabase (1: Pending, 2: Dikirim, 3: Aktif, 4: Selesai, 5: Ditolak, 6: Dibatalkan)
  const getStatusText = (statusCode) => {
    const code = Number(statusCode);
    switch (code) {
      case 1: return "Pending";
      case 2: return "Dikirim";
      case 3: return "Aktif";
      case 4: return "Selesai";
      case 5: return "Ditolak";
      case 6: return "Dibatalkan";
      default: return "Pending";
    }
  };

  const handleStatusChange = async (transaksiId, currentItem, newStatusText) => {
    let newStatusCode = 1;
    if (newStatusText === 'Disetujui') newStatusCode = 2; // Setujui mengubah status ke 2 (Dikirim)

    try {
      const { data, error } = await supabase
        .from('penyewaan')
        .update({ status_transaksi: newStatusCode })
        .eq('transaksi_id', Number(transaksiId))
        .select();

      if (error) throw error;
      if (!data || data.length === 0) {
        throw new Error("Data tidak ditemukan atau Anda tidak memiliki akses untuk mengubah transaksi ini.");
      }

      // Update stok otomatis
      await adjustStock(currentItem.nama_pertanian, currentItem.status_transaksi, newStatusCode);

      fetchPenyewaanData();
    } catch (err) {
      alert("Gagal memperbarui status transaksi: " + err.message);
    }
  };

  // FUNGSI BARU: Mengeksekusi penolakan ke Supabase dengan menyertakan alasan teks
  const submitReject = async () => {
    if (!rejectModal.reason.trim()) {
      return alert("Harap masukkan alasan penolakan!");
    }

    try {
      const targetItem = rentals.find(r => r.transaksi_id === rejectModal.transaksiId);
      const prevStatus = targetItem ? targetItem.status_transaksi : 1;
      const toolName = targetItem ? targetItem.nama_pertanian : "";

      const { data, error } = await supabase
        .from('penyewaan')
        .update({ 
          status_transaksi: 5, // Kode 5 = Ditolak
          alasan_ditolak: rejectModal.reason 
        })
        .eq('transaksi_id', Number(rejectModal.transaksiId))
        .select();

      if (error) throw error;
      if (!data || data.length === 0) {
        throw new Error("Data tidak ditemukan atau Anda tidak memiliki akses untuk mengubah transaksi ini.");
      }

      // Update stok otomatis
      await adjustStock(toolName, prevStatus, 5);

      // Tutup modal dan reset form input
      setRejectModal({ isOpen: false, transaksiId: null, reason: "" });
      fetchPenyewaanData();
    } catch (err) {
      alert("Gagal menolak pemesanan: " + err.message);
    }
  };

  const handleLogout = async () => {
    const confirmLogout = window.confirm("Apakah Anda yakin ingin keluar dari akun Admin?");
    if (!confirmLogout) return;
    try {
      await supabase.auth.signOut();
      setPage("home");
    } catch (err) {
      console.error("Gagal melakukan sign-out:", err.message);
    }
  };

  const totalPenyewaanAktif = rentals.filter(r => Number(r.status_transaksi) === 2).length;
  const totalPending = rentals.filter(r => Number(r.status_transaksi) === 1).length;

  return (
    <div className="admin-container">
      <nav className="navbar">
        <div className="nav-container">
          <div className="brand-logo" onClick={() => setPage("admin-home")} style={{ cursor: 'pointer' }}>tandoor</div>
          <div className="user-nav-wrapper"> 
            <div className="user-profile">Admin</div>
            <button className="logout-btn" onClick={handleLogout} title="Keluar">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                <polyline points="16 17 21 12 16 7"></polyline>
                <line x1="21" y1="12" x2="9" y2="12"></line>
              </svg>
            </button>
          </div>
        </div>
      </nav>

      <main className="admin-content">
        <header className="page-header">
          <h1>Dashboard Admin</h1>
          <p>Kelola operasional platform dan permintaan pengguna</p>
        </header>

        <section className="stats-container">
          <div className="stat-card">
            <div className="stat-info">
              <span>Total Penyewaan Aktif</span>
              <h2>{loadingFetch ? "..." : totalPenyewaanAktif}</h2>
            </div>
            <img src={packageImg} alt="Package" className="custom-icon" />
          </div>
          <div className="stat-card">
            <div className="stat-info">
              <span>Pengguna Aktif</span>
              <h2>{loadingFetch ? "..." : totalCustomers}</h2>
            </div>
            <img src={groupImg} alt="Group" className="custom-icon" />
          </div>
          <div className="stat-card">
            <div className="stat-info">
              <span>Permintaan Tertunda</span>
              <h2>{loadingFetch ? "..." : totalPending}</h2>
            </div>
            <img src={timeImg} alt="Time" className="custom-icon" />
          </div>
          <div className="stat-card">
            <div className="stat-info"><span>Peralatan</span><h2>{loadingFetch ? "..." : totalPeralatan}</h2></div>
            <img src={deliveryImg} alt="Delivery" className="custom-icon" />
          </div>
        </section>

        <div className="tab-navigation">
          <button className={`tab-btn ${currentPage === 'admin-home' || currentPage === 'home' || !currentPage ? 'active' : ''}`} onClick={() => setPage('admin-home')}> 
            Permintaan Sewa <img src={deskImg} alt="Desk" style={{ width: '16px', height: '16px', marginLeft: '5px' }} className="tab-icon-small" />
          </button>
          <button className={`tab-btn ${currentPage === 'admin-pengguna' ? 'active' : ''}`} onClick={() => setPage('admin-pengguna')}> 
            Pengguna <img src={userImg} alt="User" style={{ width: '16px', height: '16px', marginLeft: '5px' }} className="tab-icon-small" />
          </button>
          <button className={`tab-btn ${currentPage === 'admin-delivery' ? 'active' : ''}`} onClick={() => setPage('admin-delivery')}> 
            Pengiriman <img src={package2Img} alt="pack" style={{ width: '20px', height: '20px', marginLeft: '5px' }} className="tab-icon-small" />
          </button>
          <button className={`tab-btn ${currentPage === 'admin-equipment' ? 'active' : ''}`} onClick={() => setPage('admin-equipment')}> 
            Peralatan <img src={delivery2Img} alt="Delivery2" style={{ width: '20px', height: '20px', marginLeft: '5px' }} className="tab-icon-small" />
          </button>
          <button className={`tab-btn ${currentPage === 'admin-analitik' ? 'active' : ''}`} onClick={() => setPage('admin-analitik')}> 
            Analitik <img src={analysisImg} alt="Analysis" style={{ width: '16px', height: '16px', marginLeft: '5px' }} className="tab-icon-small" />
          </button>
          <button className={`tab-btn ${currentPage === 'admin-feedback' ? 'active' : ''}`} onClick={() => setPage('admin-feedback')}> 
            Feedback <img src={messageImg} alt="Feedback" style={{ width: '16px', height: '16px', marginLeft: '5px' }} className="tab-icon-small" />
          </button>
        </div>

        <div className="rental-list">
          {loadingFetch ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>Menghubungkan & memuat data dari Supabase...</div>
          ) : rentals.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>Tidak ada data permintaan sewa di database.</div>
          ) : (
            rentals.map((item) => {
              const currentStatus = getStatusText(item.status_transaksi);
              return (
                <div key={item.transaksi_id} className={`rental-item-card status-${currentStatus.toLowerCase()}`}>
                  <div className="card-header">
                    <h4 className="equipment-title">Transaksi #{item.id_penyewaan || item.transaksi_id}</h4>
                    <span className={`status-badge badge-${currentStatus.toLowerCase()}`}>{currentStatus}</span>
                  </div>

                  <div className="card-info-grid">
                    <div className="info-col">
                      <label>Pelanggan:</label>
                      <p className="primary-text">{item.nama_pelanggan_display}</p>
                      <p className="secondary-text" style={{ fontSize: '10px', wordBreak: 'break-all', marginTop: '2px' }}>ID: {item.id_cust}</p>
                    </div>
                    <div className="info-col">
                      <label>Lahan Pertanian:</label>
                      <p className="primary-text">{item.nama_lahan_display}</p>
                    </div>
                    <div className="info-col">
                      <label>Tanggal Sewa:</label>
                      <p className="primary-text">{item.tgl_sewa || item.tgl_pesan}</p>
                    </div>
                    <div className="info-col">
                      <label>Total Biaya:</label>
                      <p className="primary-text price-text">
                        {item.total_harga ? `Rp ${Number(item.total_harga).toLocaleString('id-ID')}` : 'Rp 0'}
                      </p>
                    </div>
                    <div className="info-col">
                      <label>Bukti Pembayaran:</label>
                      {item.bukti_pembayaran_url ? (
                        <a 
                          href={item.bukti_pembayaran_url} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="file-attachment"
                          style={{ textDecoration: "none", color: "inherit" }}
                        >
                          <img src={paymentImg} alt="icon" className="file-icon-green" />
                          <span className="file-link-text">Lihat Transfer.png</span>
                        </a>
                      ) : (
                        <div className="file-attachment">
                          <img src={paymentImg} alt="icon" className="file-icon-green" />
                          <span className="file-link-text">ID_Bayar_{item.id_pembayaran || 'Pending'}.pdf</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* MENAMPILKAN ALASAN DI SISI ADMIN JIKA STATUSNYA DITOLAK */}
                  {item.alasan_ditolak && Number(item.status_transaksi) === 5 && (
                    <div className="reason-box-display" style={{ backgroundColor: '#fdf2f2', padding: '10px', borderRadius: '6px', marginTop: '12px', borderLeft: '4px solid #f05252' }}>
                      <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#c81e1e', display: 'block' }}>Alasan Penolakan Admin:</span>
                      <p style={{ fontSize: '13px', color: '#4b5563', margin: '2px 0 0 0' }}>"{item.alasan_ditolak}"</p>
                    </div>
                  )}

                  {currentStatus === 'Pending' && (
                    <div className="card-footer-action">
                      <button className="btn-approve-outline" onClick={() => handleStatusChange(item.transaksi_id, item, 'Disetujui')}>
                        Setujui Permintaan
                      </button>
                      {/* MODIFIKASI: Tombol tolak memicu pemanggilan state pop-up */}
                      <button className="btn-reject-outline" onClick={() => setRejectModal({ isOpen: true, transaksiId: item.transaksi_id, reason: "" })}>
                        Tolak
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </main>

      {/* COMPONENT BARU: INTERFACES MODAL POPUP INPUT ALASAN PENOLAKAN */}
      {rejectModal.isOpen && (
        <div className="auth-overlay" style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div className="auth-modal" style={{ backgroundColor: '#fff', padding: '24px', borderRadius: '8px', width: '90%', maxWidth: '420px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}>
            <h3 style={{ margin: '0 0 10px 0', color: '#111827' }}>Berikan Alasan Penolakan</h3>
            <p style={{ fontSize: '13px', color: '#6b7280', marginBottom: '15px' }}>Alasan ini akan dikirimkan dan langsung tampil pada dasbor halaman riwayat konsumen terkait.</p>
            
            <textarea 
              rows="4"
              placeholder="Contoh: Alat pertanian sedang dalam masa maintenance berkala atau kuota jadwal pengiriman penuh..."
              value={rejectModal.reason}
              onChange={(e) => setRejectModal({ ...rejectModal, reason: e.target.value })}
              style={{ width: '100%', boxSizing: 'border-box', padding: '10px', borderRadius: '6px', border: '1px solid #d1d5db', resize: 'none', fontFamily: 'inherit', fontSize: '14px', marginBottom: '15px' }}
            />

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button className="btn-outline" onClick={() => setRejectModal({ isOpen: false, transaksiId: null, reason: "" })} style={{ padding: '8px 16px', cursor: 'pointer' }}>Batal</button>
              <button className="btn-submit" onClick={submitReject} style={{ padding: '8px 16px', backgroundColor: '#dc2626', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>Tolak Pesanan</button>
            </div>
          </div>
        </div>
      )}

      <footer className="footer-spacer"></footer>
    </div>
  );
};

export default AdminDashboard;
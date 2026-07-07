// src/pages/admin/AdminDelivery.jsx
import React, { useState, useEffect } from "react";
import { supabase, adjustStock } from '../../supabaseClient'; 
import '../../styles/AdminDelivery.css';
import InvoiceModal from '../../components/InvoiceModal';

import packageImg from '../../assets/package.png';
import deskImg from '../../assets/Desk_alt.png';
import analysisImg from '../../assets/Line_up.png';
import delivery2Img from '../../assets/package_car (1).png';
import userImg from '../../assets/User.png';
import groupImg from '../../assets/Group_light.png';
import deliveryImg from '../../assets/package_car.png';
import timeImg from '../../assets/Time.png';
import package2Img from '../../assets/package (1).png';
import searchImg from '../../assets/Search.png';
import messageImg from '../../assets/Message.png';

const AdminDelivery = ({ session, setPage, currentPage }) => {
  const [deliveryData, setDeliveryData] = useState([]);
  const [loadingFetch, setLoadingFetch] = useState(true);

  // State untuk Invoice
  const [selectedRentalForInvoice, setSelectedRentalForInvoice] = useState(null);
  const [isInvoiceOpen, setIsInvoiceOpen] = useState(false);

  // STATE BARU: Untuk menyimpan kata kunci pencarian dari admin
  const [searchQuery, setSearchQuery] = useState("");

  const [totalPenyewaanAktif, setTotalPenyewaanAktif] = useState(0);
  const [totalCustomers, setTotalCustomers] = useState(0);
  const [totalPending, setTotalPending] = useState(0);
  const [totalPeralatan, setTotalPeralatan] = useState(0);

  useEffect(() => {
    fetchStatsAndDeliveries();
  }, []);

  const fetchStatsAndDeliveries = async (showLoading = true) => {
    try {
      if (showLoading) {
        setLoadingFetch(true);
      }

      const [penyewaanRes, customerRes, peralatanRes] = await Promise.all([
        supabase.from('penyewaan').select('*').order('tgl_pesan', { ascending: false }),
        supabase.from('customer').select('*'),
        supabase.from('katalog_alat').select('id_alat')
      ]);

      if (penyewaanRes.error) throw penyewaanRes.error;
      if (customerRes.error) throw customerRes.error;

      const rawRentals = penyewaanRes.data || [];
      const rawCustomers = customerRes.data || [];

      const aktifCount = rawRentals.filter(r => Number(r.status_transaksi) === 3).length; 
      setTotalPenyewaanAktif(aktifCount);
      setTotalCustomers(rawCustomers.length);
      const pendingCount = rawRentals.filter(r => Number(r.status_transaksi) === 1).length; 
      setTotalPending(pendingCount);
      setTotalPeralatan(peralatanRes.data?.length || 0);

      const formattedDeliveries = rawRentals.map((item, index) => {
        const cocokCust = rawCustomers.find(cust => cust.id_cust === item.id_cust);
        let namaPenerima = "Pelanggan Tandoor";
        if (cocokCust) {
          const depan = cocokCust.nama_depan ? cocokCust.nama_depan.trim() : "";
          const belakang = cocokCust.nama_belakang ? cocokCust.nama_belakang.trim() : "";
          namaPenerima = `${depan} ${belakang}`.trim() || "Pelanggan Tandoor";
        }

        return {
          transaksiId: item.transaksi_id,
          idPengiriman: `SHP-${String(rawRentals.length - index).padStart(3, '0')}`,
          tanggal: item.tgl_sewa || item.tgl_pesan || "30 Mei 2026",
          alamat: item.alamat_pengantaran || "Alamat Lahan User",
          penerima: namaPenerima,
          barang: item.nama_pertanian || "Alat Pertanian", 
          statusTransaksi: Number(item.status_transaksi) || 1,
          rawItem: item
        };
      });

      setDeliveryData(formattedDeliveries);
    } catch (err) {
      console.error("Gagal memuat manajemen pengiriman realtime:", err.message);
    } finally {
      if (showLoading) {
        setLoadingFetch(false);
      }
    }
  };

  const handleUpdateStatus = async (transaksiId, newStatusValue) => {
    if (!newStatusValue) return;
    
    const targetItem = deliveryData.find(d => d.transaksiId === transaksiId);
    const prevStatus = targetItem ? targetItem.statusTransaksi : 1;
    const toolName = targetItem ? targetItem.barang : "";
    const nextStatusNum = Number(newStatusValue);

    // Update state lokal secara synchronous agar dropdown langsung berganti seketika
    setDeliveryData(prevData => 
      prevData.map(item => 
        item.transaksiId === transaksiId ? { ...item, statusTransaksi: nextStatusNum } : item
      )
    );

    try {
      const { data, error } = await supabase
        .from('penyewaan')
        .update({ status_transaksi: nextStatusNum })
        .eq('transaksi_id', Number(transaksiId))
        .select();

      if (error) throw error;
      if (!data || data.length === 0) {
        throw new Error("Data tidak ditemukan atau Anda tidak memiliki akses untuk mengubah transaksi ini.");
      }

      // Update stok otomatis
      await adjustStock(toolName, prevStatus, nextStatusNum);

      // Sinkronkan data di background tanpa memicu loading screen table (flicker)
      fetchStatsAndDeliveries(false);
    } catch (err) {
      // Kembalikan ke status semula jika gagal
      setDeliveryData(prevData => 
        prevData.map(item => 
          item.transaksiId === transaksiId ? { ...item, statusTransaksi: prevStatus } : item
        )
      );
      alert("Gagal memperbarui status pengiriman: " + err.message);
      // Sinkronkan ulang status asli dari server untuk memulihkan konsistensi data
      fetchStatsAndDeliveries(true);
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

  // LOGIK REFACTORING: Menyaring data delivery berdasarkan kata kunci pencarian secara realtime
  const filteredDeliveries = deliveryData.filter((item) => {
    const query = searchQuery.toLowerCase();
    return (
      item.penerima.toLowerCase().includes(query) || 
      item.alamat.toLowerCase().includes(query) ||
      item.idPengiriman.toLowerCase().includes(query)
    );
  });

  // MAPPING STATUS TRANSAKSI KE STATUS PENGIRIMAN
  const getStatusPengiriman = (statusTransaksi) => {
    const code = Number(statusTransaksi);
    switch (code) {
      case 1: return { text: "Belum Dikirim", color: "#6b7280", bg: "#f3f4f6" };
      case 2: return { text: "Sedang Dikirim", color: "#0369a1", bg: "#e0f2fe" };
      case 3: return { text: "Sampai Tujuan", color: "#15803d", bg: "#dcfce7" };
      case 4: return { text: "Selesai", color: "#475569", bg: "#f1f5f9" };
      case 5: return { text: "Dibatalkan", color: "#b91c1c", bg: "#fee2e2" };
      default: return { text: "Belum Dikirim", color: "#6b7280", bg: "#f3f4f6" };
    }
  };

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
            <img src={packageImg} alt="Stats" className="custom-icon" />
          </div>
          <div className="stat-card">
            <div className="stat-info">
              <span>Pengguna Aktif</span>
              <h2>{loadingFetch ? "..." : totalCustomers}</h2>
            </div>
            <img src={groupImg} alt="Stats" className="custom-icon" />
          </div>
          <div className="stat-card">
            <div className="stat-info">
              <span>Permintaan Tertunda</span>
              <h2>{loadingFetch ? "..." : totalPending}</h2>
            </div>
            <img src={timeImg} alt="Stats" className="custom-icon" />
          </div>
          <div className="stat-card">
            <div className="stat-info"><span>Peralatan</span><h2>{loadingFetch ? "..." : totalPeralatan}</h2></div>
            <img src={deliveryImg} alt="Delivery" className="custom-icon" />
          </div>
        </section>

        <div className="tab-navigation">
          <button className={`tab-btn ${currentPage === 'admin-home' || currentPage === 'home' || !currentPage ? 'active' : ''}`} onClick={() => setPage('admin-home')}> 
            Permintaan Sewa <img src={deskImg} alt="" style={{ width: '16px', height: '16px', marginLeft: '5px' }} className="tab-icon-small" />
          </button>
          <button className={`tab-btn ${currentPage === 'admin-pengguna' ? 'active' : ''}`} onClick={() => setPage('admin-pengguna')}> 
            Pengguna <img src={userImg} alt="" style={{ width: '16px', height: '16px', marginLeft: '5px' }} className="tab-icon-small" />
          </button>
          <button className={`tab-btn active`} onClick={() => setPage('admin-delivery')}> 
            Pengiriman <img src={package2Img} alt="" style={{ width: '20px', height: '20px', marginLeft: '5px' }} className="tab-icon-small" />
          </button>
          <button className={`tab-btn ${currentPage === 'admin-equipment' ? 'active' : ''}`} onClick={() => setPage('admin-equipment')}> 
            Peralatan <img src={delivery2Img} alt="" style={{ width: '20px', height: '20px', marginLeft: '5px' }} className="tab-icon-small" />
          </button>
          <button className={`tab-btn ${currentPage === 'admin-analitik' ? 'active' : ''}`} onClick={() => setPage('admin-analitik')}> 
            Analitik <img src={analysisImg} alt="" style={{ width: '16px', height: '16px', marginLeft: '5px' }} className="tab-icon-small" />
          </button>
          <button className={`tab-btn ${currentPage === 'admin-feedback' ? 'active' : ''}`} onClick={() => setPage('admin-feedback')}> 
            Feedback <img src={messageImg} alt="" style={{ width: '16px', height: '16px', marginLeft: '5px' }} className="tab-icon-small" />
          </button>
        </div>

        <div className="delivery-table-wrapper">
          <div className="delivery-header-row">
            <h2 className="delivery-title">Semua Pengiriman</h2>
            <div className="search-wrapper-delivery">
              {/* PERBAIKAN: Hubungkan input ini ke state searchQuery */}
              <input 
                type="text" 
                placeholder="Telusuri penerima, alamat, atau ID..." 
                className="search-input-delivery" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <img src={searchImg} alt="search" className="search-icon-delivery" />
            </div>
          </div>

          <table className="delivery-table">
            <thead>
              <tr>
                <th>ID Pengiriman</th>
                <th>Tanggal Pengiriman</th>
                <th>Alamat</th>
                <th>Penerima</th>
                <th>Barang</th>
                <th className="text-center" style={{ width: "130px" }}>Status Pengiriman</th>
                <th className="text-center" style={{ width: "180px" }}>Status Transaksi</th>
                <th className="text-center">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {loadingFetch ? (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', padding: '30px', color: '#888' }}>
                    Menghubungkan data logistik Supabase...
                  </td>
                </tr>
              ) : filteredDeliveries.length === 0 ? (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', padding: '30px', color: '#888' }}>
                    {searchQuery ? "Hasil pencarian tidak ditemukan." : "Belum ada riwayat pengiriman barang saat ini."}
                  </td>
                </tr>
              ) : (
                // PERBAIKAN: Loop dialihkan ke filteredDeliveries
                filteredDeliveries.map((item, index) => (
                  <tr key={index}>
                    <td className="font-bold">{item.idPengiriman}</td>
                    <td>{item.tanggal}</td>
                    <td className="addr-cell" style={{ fontSize: '11px' }}>{item.alamat}</td>
                    <td className="font-bold">{item.penerima}</td>
                    <td className="item-cell">{item.barang}</td>
                    <td className="text-center">
                      {(() => {
                        const sp = getStatusPengiriman(item.statusTransaksi);
                        return (
                          <span style={{
                            display: 'inline-block',
                            padding: '5px 14px',
                            borderRadius: '20px',
                            fontSize: '11px',
                            fontWeight: '600',
                            color: sp.color,
                            backgroundColor: sp.bg,
                            minWidth: '110px',
                            textAlign: 'center'
                          }}>
                            {sp.text}
                          </span>
                        );
                      })()}
                    </td>
                    <td className="text-center">
                      <div className="dropdown-container">
                        <select 
                          className="select-driver-minimal"
                          value={item.statusTransaksi}
                          onChange={(e) => handleUpdateStatus(item.transaksiId, e.target.value)}
                          style={{
                            fontWeight: '600',
                            padding: '6px 10px',
                            borderRadius: '6px',
                            border: '1px solid #ccc',
                            backgroundColor: item.statusTransaksi === 1 ? '#fff3cd' : 
                                            item.statusTransaksi === 2 ? '#cff4fc' : 
                                            item.statusTransaksi === 3 ? '#d1e7dd' : '#f8f9fa',
                            color: item.statusTransaksi === 1 ? '#856404' : 
                                   item.statusTransaksi === 2 ? '#055160' : 
                                   item.statusTransaksi === 3 ? '#0f5132' : '#6c757d'
                          }}
                        >
                          <option value="1">Menunggu Konfirmasi</option>
                          <option value="2">Dikirim</option>
                          <option value="3">Aktif</option>
                          <option value="4">Selesai</option>
                        </select>
                      </div>
                    </td>
                    <td className="text-center">
                      <button 
                        className="btn-new-request" 
                        style={{ padding: "6px 12px", fontSize: "11px", backgroundColor: "#1a4d2e", margin: "0 auto", display: "block" }}
                        onClick={() => { setSelectedRentalForInvoice(item.rawItem); setIsInvoiceOpen(true); }}
                      >
                        Lihat Nota
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </main>
      
      <InvoiceModal
        isOpen={isInvoiceOpen}
        onClose={() => { setIsInvoiceOpen(false); setSelectedRentalForInvoice(null); }}
        rental={selectedRentalForInvoice}
        customerName={selectedRentalForInvoice ? deliveryData.find(d => d.transaksiId === selectedRentalForInvoice.transaksi_id)?.penerima : ""}
      />

      <footer className="footer-spacer"></footer>
    </div> 
  );
};

export default AdminDelivery;
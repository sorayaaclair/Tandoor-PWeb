// src/pages/admin/AdminFeedback.jsx
import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';

import packageImg from '../../assets/package.png';
import groupImg from '../../assets/Group_light.png';
import timeImg from '../../assets/Time.png';
import deliveryImg from '../../assets/package_car.png';
import deskImg from '../../assets/Desk_alt.png';
import analysisImg from '../../assets/Line_up.png';
import delivery2Img from '../../assets/package_car (1).png';
import userImg from '../../assets/User.png';
import package2Img from '../../assets/package (1).png';
import messageImg from '../../assets/Message.png';
import searchImg from '../../assets/Search.png';

const AdminFeedback = ({ setPage, session, currentPage }) => {
  // GANTI: State feedbacks sekarang defaultnya array kosong, diisi dari Supabase
  const [feedbacks, setFeedbacks] = useState([]);
  const [loadingFeedbacks, setLoadingFeedbacks] = useState(true);

  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('Semua');
  const [filterRating, setFilterRating] = useState('Semua');

  // State data statistik atas
  const [totalPenyewaanAktif, setTotalPenyewaanAktif] = useState(0);
  const [totalCustomers, setTotalCustomers] = useState(0);
  const [totalPending, setTotalPending] = useState(0);
  const [loadingStats, setLoadingStats] = useState(true);

  useEffect(() => {
    fetchSupabaseStats();
    fetchFeedbacks();
  }, []);

  // 1. AMBIL DATA FEEDBACK DARI SUPABASE
  const fetchFeedbacks = async () => {
    try {
      setLoadingFeedbacks(true);
      const { data, error } = await supabase
        .from('feedback')
        .select('*')
        .order('created_at', { ascending: false }); // Yang paling baru di atas

      if (error) throw error;
      setFeedbacks(data || []);
    } catch (err) {
      console.error("Gagal mengambil data ulasan:", err.message);
    } finally {
      setLoadingFeedbacks(false);
    }
  };

  // 2. AMBIL DATA STATISTIK ATAS
  const fetchSupabaseStats = async () => {
    try {
      setLoadingStats(true);
      const [penyewaanRes, customerRes] = await Promise.all([
        supabase.from('penyewaan').select('status_transaksi'),
        supabase.from('customer').select('id_cust')
      ]);

      if (!penyewaanRes.error && penyewaanRes.data) {
        const rawRentals = penyewaanRes.data;
        setTotalPenyewaanAktif(rawRentals.filter(r => r.status_transaksi === 2 || r.status_transaksi === "2").length);
        setTotalPending(rawRentals.filter(r => r.status_transaksi === 1 || r.status_transaksi === "1").length);
      }
      if (!customerRes.error && customerRes.data) {
        setTotalCustomers(customerRes.data.length);
      }
    } catch (err) {
      console.error("Gagal menyamakan statistik ringkasan:", err.message);
    } finally {
      setLoadingStats(false);
    }
  };

  // 3. HAPUS DATA FEEDBACK DI SUPABASE
  const handleDeleteFeedback = async (id) => {
    if (window.confirm("Apakah Anda yakin ingin menghapus masukan ini dari database Supabase?")) {
      try {
        const { error } = await supabase
          .from('feedback')
          .delete()
          .eq('id', id);

        if (error) throw error;

        // Update state di UI lokal agar langsung terhapus tanpa reload halaman
        setFeedbacks(feedbacks.filter(item => item.id !== id));
        alert("Ulasan berhasil dihapus!");
      } catch (err) {
        console.error("Gagal menghapus feedback:", err.message);
        alert("Gagal menghapus ulasan: " + err.message);
      }
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

  // Filter logika ulasan
  const filteredFeedbacks = feedbacks.filter(item => {
    const matchesSearch =
      (item.nama && item.nama.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (item.email && item.email.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (item.pesan && item.pesan.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesCategory = filterCategory === 'Semua' || item.kategori === filterCategory;
    const matchesRating = filterRating === 'Semua' || item.rating === parseInt(filterRating);

    return matchesSearch && matchesCategory && matchesRating;
  });

  const getCategoryBadgeClass = (category) => {
    switch (category) {
      case 'Masalah Teknis': return 'badge-teknis';
      case 'Layanan Penyewaan': return 'badge-layanan';
      case 'Saran Fitur': return 'badge-saran';
      default: return 'badge-umum';
    }
  };

  // Fungsi pembantu format tanggal supabse biar rapi
  const formatTanggal = (isoString) => {
    if (!isoString) return "";
    const date = new Date(isoString);
    return date.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }) + " WIB";
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
              <h2>{loadingStats ? "..." : totalPenyewaanAktif}</h2>
            </div>
            <img src={packageImg} alt="Stats" className="custom-icon" />
          </div>
          <div className="stat-card">
            <div className="stat-info">
              <span>Pengguna Aktif</span>
              <h2>{loadingStats ? "..." : totalCustomers}</h2>
            </div>
            <img src={groupImg} alt="Stats" className="custom-icon" />
          </div>
          <div className="stat-card">
            <div className="stat-info">
              <span>Permintaan Tertunda</span>
              <h2>{loadingStats ? "..." : totalPending}</h2>
            </div>
            <img src={timeImg} alt="Stats" className="custom-icon" />
          </div>
          <div className="stat-card">
            <div className="stat-info"><span>Peralatan</span><h2>3</h2></div>
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
          <button className="tab-btn active" onClick={() => setPage('admin-feedback')}>
            Feedback <img src={messageImg} alt="Feedback" style={{ width: '16px', height: '16px', marginLeft: '5px' }} className="tab-icon-small" />
          </button>
        </div>

        <div className="feedback-toolbar">
          <div className="feedback-search-wrapper">
            <img src={searchImg} alt="search" className="feedback-search-icon" />
            <input
              type="text"
              placeholder="Cari masukan, nama, atau email..."
              className="feedback-search-input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="feedback-filters">
            <select className="feedback-select-filter" value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}>
              <option value="Semua">Semua Kategori</option>
              <option value="Masukan Umum">Masukan Umum</option>
              <option value="Masalah Teknis">Masalah Teknis</option>
              <option value="Layanan Penyewaan">Layanan Penyewaan</option>
              <option value="Saran Fitur">Saran Fitur</option>
            </select>

            <select className="feedback-select-filter" value={filterRating} onChange={(e) => setFilterRating(e.target.value)}>
              <option value="Semua">Semua Rating</option>
              <option value="5">5 Bintang</option>
              <option value="4">4 Bintang</option>
              <option value="3">3 Bintang</option>
              <option value="2">2 Bintang</option>
              <option value="1">1 Bintang</option>
            </select>
          </div>
        </div>

        {loadingFeedbacks ? (
          <div style={{ textAlign: 'center', padding: '40px', fontSize: '18px', color: '#666' }}>Memuat ulasan dari Supabase...</div>
        ) : filteredFeedbacks.length > 0 ? (
          <div className="feedback-grid">
            {filteredFeedbacks.map((item) => (
              <div key={item.id} className="feedback-card">
                <div>
                  <div className="feedback-card-header">
                    <div className="feedback-user-info">
                      <h4 className="feedback-user-name">{item.nama || "Anonim"}</h4>
                      {item.email && <p className="feedback-user-email">{item.email}</p>}
                    </div>
                    <span className={`feedback-category-badge ${getCategoryBadgeClass(item.kategori)}`}>
                      {item.kategori}
                    </span>
                  </div>

                  <div className="feedback-card-rating">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <svg key={star} viewBox="0 0 24 24" className={`star-mini ${item.rating >= star ? 'filled' : 'empty'}`}>
                        <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                      </svg>
                    ))}
                  </div>

                  <p className="feedback-card-text">"{item.pesan}"</p>
                </div>

                <div className="feedback-card-footer">
                  <span className="feedback-date">{formatTanggal(item.created_at)}</span>
                  <button className="feedback-btn-delete" onClick={() => handleDeleteFeedback(item.id)} title="Hapus masukan">
                    <svg viewBox="0 0 24 24">
                      <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="feedback-empty-state">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="feedback-empty-icon">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 10.742h.01m3.992 0h.01M15.4 15.4h-6.8a1 1 0 01-1-1v-4a1 1 0 011-1h6.8a1 1 0 011 1v4a1 1 0 01-1 1z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" />
            </svg>
            <h3>Tidak ada masukan</h3>
            <p>Belum ada ulasan yang sesuai dengan kriteria filter saat ini.</p>
          </div>
        )}
      </main>
      <footer className="footer-spacer"></footer>
    </div>
  );
};

export default AdminFeedback;
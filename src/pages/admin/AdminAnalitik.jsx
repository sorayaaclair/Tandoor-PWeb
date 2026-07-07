// src/pages/admin/AdminAnalitik.jsx
import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient'; // Memastikan koneksi database aktif
import '../../styles/AdminPeralatan.css'; 
import '../../styles/AdminAnalitik.css'; 

import deskImg from '../../assets/Desk_alt.png';
import analysisImg from '../../assets/Line_up.png';
import delivery2Img from '../../assets/package_car (1).png';
import userImg from '../../assets/User.png';
import groupImg from '../../assets/Group_light.png';
import packageImg from '../../assets/package.png';
import deliveryImg from '../../assets/package_car.png';
import timeImg from '../../assets/Time.png';
import package2Img from '../../assets/package (1).png';
// IMPORT IKON MESSAGE UNTUK TAB MENU FEEDBACK
import messageImg from '../../assets/Message.png';

const AdminAnalitik = ({ session, setPage, currentPage }) => {
  // --- STATE DATA STATISTIK ATAS (DINAMIS SUPABASE) ---
  const [totalPenyewaanAktif, setTotalPenyewaanAktif] = useState(0);
  const [totalCustomers, setTotalCustomers] = useState(0);
  const [totalPending, setTotalPending] = useState(0);
  const [totalPeralatan, setTotalPeralatan] = useState(0);
  const [loadingStats, setLoadingStats] = useState(true);

  // STATE BARU: Untuk menyimpan data pendapatan & alat populer secara dinamis
  const [revenueStats, setRevenueStats] = useState({
    thisMonth: 0,
    lastMonth: 0,
    total: 0
  });
  const [popularTools, setPopularTools] = useState([]);

  // Load indikator ringkasan statistik atas saat komponen dimuat
  useEffect(() => {
    fetchStatsData();
  }, []);

  const fetchStatsData = async () => {
    try {
      setLoadingStats(true);

      // Ambil data paralel secara bersamaan dari tabel penyewaan dan customer
      const [penyewaanRes, customerRes, peralatanRes] = await Promise.all([
        supabase.from('penyewaan').select('status_transaksi, total_harga, tgl_pesan, tgl_sewa, nama_pertanian'),
        supabase.from('customer').select('id_cust'),
        supabase.from('katalog_alat').select('id_alat')
      ]);

      if (penyewaanRes.error) throw penyewaanRes.error;
      if (customerRes.error) throw customerRes.error;

      const rentals = penyewaanRes.data || [];
      const customers = customerRes.data || [];
      const peralatan = peralatanRes.data || [];

      // Total Peralatan dari katalog_alat
      setTotalPeralatan(peralatan.length);

      // 1. Total Penyewaan Aktif (Kode status 2 = Dikirim, 3 = Aktif)
      const aktifCount = rentals.filter(r => Number(r.status_transaksi) === 2 || Number(r.status_transaksi) === 3).length;
      setTotalPenyewaanAktif(aktifCount);

      // 2. Pengguna Aktif (Jumlah total baris customer)
      setTotalCustomers(customers.length);

      // 3. Permintaan Tertunda (Kode status 1 = Pending)
      const pendingCount = rentals.filter(r => Number(r.status_transaksi) === 1).length;
      setTotalPending(pendingCount);

      // 4. Kalkulasi Pendapatan Dinamis (Status sukses: 2, 3, 4)
      const validRentals = rentals.filter(r => [2, 3, 4].includes(Number(r.status_transaksi)));
      let total = 0;
      let thisMonth = 0;
      let lastMonth = 0;

      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth(); // 0-11

      const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
      const prevMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;

      validRentals.forEach(r => {
        const price = Number(r.total_harga) || 0;
        total += price;

        const dateStr = r.tgl_sewa || r.tgl_pesan;
        if (dateStr) {
          const rDate = new Date(dateStr);
          if (!isNaN(rDate.getTime())) {
            const rYear = rDate.getFullYear();
            const rMonth = rDate.getMonth();

            if (rYear === currentYear && rMonth === currentMonth) {
              thisMonth += price;
            } else if (rYear === prevMonthYear && rMonth === prevMonth) {
              lastMonth += price;
            }
          }
        }
      });

      setRevenueStats({ thisMonth, lastMonth, total });

      // 5. Kalkulasi Alat Terpopuler Dinamis
      const toolCounts = {};
      rentals.forEach(r => {
        const toolName = r.nama_pertanian || "Alat Pertanian";
        toolCounts[toolName] = (toolCounts[toolName] || 0) + 1;
      });

      const sortedTools = Object.entries(toolCounts)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 3);

      setPopularTools(sortedTools);

    } catch (err) {
      console.error("Gagal memuat indikator statistik di menu analitik:", err.message);
    } finally {
      setLoadingStats(false);
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

  return (
    // DIUBAH: Menggunakan 'admin-container' agar layout halaman full layar konsisten
    <div className="admin-container">
      {/* Navbar Atas */}
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

      {/* DIUBAH: Menggunakan pembungkus 'main' dengan kelas 'admin-content' agar struktur CSS-nya seragam */}
      <main className="admin-content">
        <header className="page-header">
          <h1>Dashboard Admin</h1>
          <p>Kelola operasional platform dan permintaan pengguna</p>
        </header>
      
        {/* SINKRONISASI INDIKATOR ANGKA ATAS DENGAN DATABASE SUPABASE */}
        <section className="stats-container">
          <div className="stat-card">
            <div className="stat-info">
              <span>Total Penyewaan Aktif</span>
              <h2>{loadingStats ? "..." : totalPenyewaanAktif}</h2>
            </div>
            <img src={packageImg} alt="Package" className="custom-icon" />
          </div>
          <div className="stat-card">
            <div className="stat-info">
              <span>Pengguna Aktif</span>
              <h2>{loadingStats ? "..." : totalCustomers}</h2>
            </div>
            <img src={groupImg} alt="Group" className="custom-icon" />
          </div>
          <div className="stat-card">
            <div className="stat-info">
              <span>Permintaan Tertunda</span>
              <h2>{loadingStats ? "..." : totalPending}</h2>
            </div>
            <img src={timeImg} alt="Time" className="custom-icon" />
          </div>
          <div className="stat-card">
            <div className="stat-info"><span>Peralatan</span><h2>{loadingStats ? "..." : totalPeralatan}</h2></div>
            <img src={deliveryImg} alt="Delivery" className="custom-icon" />
          </div>
        </section>
      
        {/* TAB NAVIGATION SINKRON PERMANEN */}
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
          <button className="tab-btn active" onClick={() => setPage('admin-analitik')}> 
            Analitik <img src={analysisImg} alt="Analysis" style={{ width: '16px', height: '16px', marginLeft: '5px' }} className="tab-icon-small" />
          </button>
          {/* TOMBOL TAB FEEDBACK PERMANEN */}
          <button className={`tab-btn ${currentPage === 'admin-feedback' ? 'active' : ''}`} onClick={() => setPage('admin-feedback')}> 
            Feedback <img src={messageImg} alt="Feedback" style={{ width: '16px', height: '16px', marginLeft: '5px' }} className="tab-icon-small" />
          </button>
        </div>

        <div className="analitik-grid">
          <div className="analitik-card">
            <h3 className="card-title">Ringkasan Pendapatan</h3>
            <div className="income-list">
              <div className="income-item highlight">
                <span>Bulan Ini</span>
                <span className="price-text">Rp {revenueStats.thisMonth.toLocaleString('id-ID')}</span>
              </div>
              <div className="income-item">
                <span>Bulan Lalu</span>
                <span className="price-text">Rp {revenueStats.lastMonth.toLocaleString('id-ID')}</span>
              </div>
              <div className="income-item">
                <span>Total Pendapatan</span>
                <span className="price-text">Rp {revenueStats.total.toLocaleString('id-ID')}</span>
              </div>
            </div>
          </div>

          <div className="analitik-card">
            <h3 className="card-title">Peralatan Populer</h3>
            <div className="popular-list">
              {popularTools.length > 0 ? (
                popularTools.map((item, idx) => (
                  <div key={idx} className="popular-item">
                    <div className="rank-badge">{idx + 1}</div>
                    <div className="item-details">
                      <span className="tool-name">{item.name}</span>
                      <span className="rental-count">{item.count} penyewaan</span>
                    </div>
                  </div>
                ))
              ) : (
                <div style={{ fontSize: '13px', color: '#666', padding: '10px 0' }}>Belum ada data populer.</div>
              )}
            </div>
          </div>
        </div>
      </main>
      <footer className="footer-spacer"></footer>
    </div>
  );
};

export default AdminAnalitik;
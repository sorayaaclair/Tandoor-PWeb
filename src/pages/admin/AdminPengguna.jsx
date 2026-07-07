// src/pages/admin/AdminPengguna.jsx
import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient'; // Memastikan koneksi database aktif
import '../../styles/AdminUser.css';

import deskImg from '../../assets/Desk_alt.png';
import analysisImg from '../../assets/Line_up.png';
import delivery2Img from '../../assets/package_car (1).png';
import userImg from '../../assets/User.png';
import groupImg from '../../assets/Group_light.png';
import packageImg from '../../assets/package.png';
import deliveryImg from '../../assets/package_car.png';
import timeImg from '../../assets/Time.png';
import searchImg from '../../assets/Search.png';
import editImg from '../../assets/Edit_light (1).png';
import deleteImg from '../../assets/Trash_light.png';
import package2Img from '../../assets/package (1).png';
import messageImg from '../../assets/Message.png';

const AdminPengguna = ({ session, setPage, currentPage }) => {
  // --- STATE DATA UTAMA USER ---
  const [userData, setUserData] = useState([
    { 
      id: 1, 
      nama: 'Carlitos Marlitos', 
      email: 'Carlo@gmail.com', 
      lahan: [
        { namaLahan: 'Lahan Padi', luasHektar: 19 },
        { namaLahan: 'Lahan Jagung', luasHektar: 19 }
      ],
      joinDate: '1 Februari 2026', 
      rental: 1
    },
    { 
      id: 2, 
      nama: 'Robinavitch', 
      email: 'rrobby@email.com', 
      lahan: [
        { namaLahan: 'Lahan Cabai', luasHektar: 180 }
      ],
      joinDate: '20 Januari 2026', 
      rental: 3
    },
    { 
      id: 3, 
      nama: 'Sean Demirez', 
      email: 'sstean.d@email.com', 
      lahan: [
        { namaLahan: 'Lahan Padi', luasHektar: 320 }
      ],
      joinDate: '17 September 2025', 
      rental: 3
    },
  ]);

  // --- STATE DATA STATISTIK ATAS (DINAMIS SUPABASE) ---
  const [totalPenyewaanAktif, setTotalPenyewaanAktif] = useState(0);
  const [totalCustomers, setTotalCustomers] = useState(0);
  const [totalPending, setTotalPending] = useState(0);
  const [totalPeralatan, setTotalPeralatan] = useState(0);
  const [loadingStats, setLoadingStats] = useState(true);

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);

  // Ambil data statistik dari Supabase saat load agar kotak ringkasan sinkron
  useEffect(() => {
    fetchSupabaseStats();
  }, []);

  const fetchSupabaseStats = async () => {
    try {
      setLoadingStats(true);
      const [penyewaanRes, customerRes, peralatanRes] = await Promise.all([
        supabase.from('penyewaan').select('status_transaksi'),
        supabase.from('customer').select('id_cust'),
        supabase.from('katalog_alat').select('id_alat')
      ]);

      if (!penyewaanRes.error && penyewaanRes.data) {
        const rawRentals = penyewaanRes.data;
        setTotalPenyewaanAktif(rawRentals.filter(r => r.status_transaksi === 2 || r.status_transaksi === "2").length);
        setTotalPending(rawRentals.filter(r => r.status_transaksi === 1 || r.status_transaksi === "1").length);
      }
      
      if (!customerRes.error && customerRes.data) {
        setTotalCustomers(customerRes.data.length);
      }
      if (!peralatanRes.error && peralatanRes.data) {
        setTotalPeralatan(peralatanRes.data.length);
      }
    } catch (err) {
      console.error("Gagal menyamakan statistik ringkasan:", err.message);
    } finally {
      setLoadingStats(false);
    }
  };

  const handleDelete = (id) => {
    if (window.confirm("Apakah Anda yakin ingin menghapus pengguna ini?")) {
      setUserData(userData.filter(user => user.id !== id));
    }
  };

  const handleSaveEdit = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    
    const updatedUser = {
      ...selectedUser,
      nama: formData.get("nama"),
      email: formData.get("email"),
      lahan: [
        { 
          namaLahan: formData.get("lahan"), 
          luasHektar: formData.get("luas") 
        }
      ],
    };

    setUserData(userData.map(u => u.id === selectedUser.id ? updatedUser : u));
    setIsEditModalOpen(false);
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
    <div className="admin-container">
      <nav className="navbar">
        <div className="nav-container">
          <div className="brand-logo" onClick={() => setPage("admin-home")} style={{ cursor: 'pointer' }}>tandoor</div>
          <div className="user-nav-wrapper"> 
            <div className="user-profile">Admin</div>
            <button className="logout-btn" onClick={handleLogout} title="Keluar">
              <svg 
                width="18" 
                height="18" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2" 
                strokeLinecap="round" 
                strokeLinejoin="round"
              >
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

        {/* KOTAK RINGKASAN ATAS - DINAMIS & SINKRON */}
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

        {/* TAB NAVIGATION SINKRON PERMANEN DENGAN setPage */}
        <div className="tab-navigation">
          <button 
            className={`tab-btn ${currentPage === 'admin-home' || currentPage === 'home' || !currentPage ? 'active' : ''}`} 
            onClick={() => setPage('admin-home')}> 
            Permintaan Sewa <img src={deskImg} alt="Desk" style={{ width: '16px', height: '16px', marginLeft: '5px' }} className="tab-icon-small" />
          </button>
          <button 
            className="tab-btn active" 
            onClick={() => setPage('admin-pengguna')}> 
            Pengguna <img src={userImg} alt="User" style={{ width: '16px', height: '16px', marginLeft: '5px' }} className="tab-icon-small" />
          </button>
          <button 
            className={`tab-btn ${currentPage === 'admin-delivery' ? 'active' : ''}`} 
            onClick={() => setPage('admin-delivery')}> 
            Pengiriman <img src={package2Img} alt="pack" style={{ width: '20px', height: '20px', marginLeft: '5px' }} className="tab-icon-small" />
          </button>
          <button 
            className={`tab-btn ${currentPage === 'admin-equipment' ? 'active' : ''}`} 
            onClick={() => setPage('admin-equipment')}> 
            Peralatan <img src={delivery2Img} alt="Delivery2" style={{ width: '20px', height: '20px', marginLeft: '5px' }} className="tab-icon-small" />
          </button>
          <button 
            className={`tab-btn ${currentPage === 'admin-analitik' ? 'active' : ''}`} 
            onClick={() => setPage('admin-analitik')}> 
            Analitik <img src={analysisImg} alt="Analysis" style={{ width: '16px', height: '16px', marginLeft: '5px' }} className="tab-icon-small" />
          </button>
          <button 
            className={`tab-btn ${currentPage === 'admin-feedback' ? 'active' : ''}`} 
            onClick={() => setPage('admin-feedback')}> 
            Feedback <img src={messageImg} alt="Feedback" style={{ width: '16px', height: '16px', marginLeft: '5px' }} className="tab-icon-small" />
          </button>
        </div>

        <div className="table-container">
          <div className="table-header">
            <h3 className="table-title">User Management</h3>
            <div className="search-wrapper">
              <img src={searchImg} alt="search" className="search-icon-inside" />
              <input type="text" placeholder="Search users..." className="search-input" />
            </div>
          </div>

          <table className="user-table">
            <thead>
              <tr>
                <th>Nama</th>
                <th>Email</th>
                <th>Lahan</th>
                <th>Tanggal Bergabung</th>
                <th>Rental</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {userData.map((user) => (
                <tr key={user.id}>
                  <td className="font-bold">{user.nama}</td>
                  <td className="text-gray">{user.email}</td>
                  <td>
                    <div className="lahan-container">
                      <div className="lahan-badge">{user.lahan.length} Lahan</div>
                      {user.lahan.map((item, index) => (
                        <div key={index} className="lahan-item">
                          <span className="lahan-nama">{item.namaLahan}</span>
                          <span className="lahan-luas">{item.luasHektar} Hektar</span>
                        </div>
                      ))}
                    </div>
                  </td>
                  <td className="text-gray">{user.joinDate}</td>
                  <td className="text-center">{user.rental}</td>
                  <td>
                    <div className="action-buttons">
                      <button className="btn-action btn-view" onClick={() => { setSelectedUser(user); setIsEditModalOpen(true); }}>
                        <img src={editImg} alt="Edit" className="action-icon" />
                      </button>
                      <button className="btn-action btn-delete" onClick={() => handleDelete(user.id)}>
                        <img src={deleteImg} alt="Delete" className="action-icon" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>

      {isEditModalOpen && selectedUser && (
        <div className="modal-overlay">
          <div className="modal-content-edit">
            <div className="modal-header">
              <h2>Edit User Information</h2>
              <button className="close-x" onClick={() => setIsEditModalOpen(false)}>&times;</button>
            </div>
            <form className="edit-form" onSubmit={handleSaveEdit}>
              <h4 className="form-section-title">Personal Information</h4>
              <div className="form-row two-cols">
                <div className="form-group"><label>Full Name *</label><input name="nama" type="text" defaultValue={selectedUser.nama} required /></div>
                <div className="form-group"><label>Email Address *</label><input name="email" type="email" defaultValue={selectedUser.email} required /></div>
              </div>
              <h4 className="form-section-title">Farm Information</h4>
              <div className="form-row two-cols">
                <div className="form-group">
                  <label>Farm Name (Main) *</label>
                  <input name="lahan" type="text" defaultValue={selectedUser.lahan[0]?.namaLahan} required />
                </div>
                <div className="form-group">
                  <label>Farm Size (Hektar) *</label>
                  <input name="luas" type="text" defaultValue={selectedUser.lahan[0]?.luasHektar} required />
                </div>
              </div>
              <div className="modal-actions-edit">
                <button type="submit" className="btn-submit">Save Changes</button>
                <button type="button" className="btn-cancel" onClick={() => setIsEditModalOpen(false)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
      <footer className="footer-spacer"></footer>
    </div>
  );
};

export default AdminPengguna;
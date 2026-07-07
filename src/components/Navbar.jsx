// src/components/Navbar.jsx
import { useState, useEffect } from "react";
import logo from "../assets/logo.png";
import { supabase } from "../supabaseClient";
// 1. Import FeedbackModal yang berada satu folder (berdasarkan image_f4843b.png)
import FeedbackModal from "./FeedbackModal";

function Navbar({ setPage, currentPage, session }) {
  // State untuk menampung nama depan yang diambil dari tabel database customer
  const [dbFirstName, setDbFirstName] = useState("");
  // 2. State untuk mengontrol buka/tutup modal feedback
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);

  useEffect(() => {
    async function fetchCustomerProfile() {
      if (session?.user) {
        try {
          const { data, error } = await supabase
            .from("customer")
            .select("nama_depan")
            .eq("id_cust", session.user.id)
            .single();

          if (error) throw error;

          if (data) {
            setDbFirstName(data.nama_depan);
          }
        } catch (err) {
          console.error("Gagal mengambil nama depan dari database:", err.message);
          setDbFirstName(session.user.user_metadata?.first_name || "User");
        }
      } else {
        setDbFirstName("");
      }
    }

    fetchCustomerProfile();
  }, [session]);

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (!error) {
      setPage("home");
    }
  };

  return (
    <nav className="navbar sticky-navbar">
      <div className="container navbar__inner">
        <div className="navbar__logo" onClick={() => setPage("home")}>
          <img src={logo} alt="Tandoor" className="logo-img" />
        </div>

        <ul className="navbar__menu">
          <li
            className={currentPage === "home" ? "active-link" : "nav-item"}
            onClick={() => setPage("home")}
          >
            Beranda
          </li>
          <li
            className={
              currentPage === "equipment" || currentPage === "equipment-detail"
                ? "active-link"
                : "nav-item"
            }
            onClick={() => setPage("equipment")}
          >
            Peralatan
          </li>
          {session && (
            <>
              <li
                className={
                  currentPage === "dashboard" ? "active-link" : "nav-item"
                }
                onClick={() => setPage("dashboard")}
              >
                Penyewaan Saya
              </li>
              {/* 3. Tambahkan onClick untuk mengubah state modal menjadi true */}
              <li 
                className="nav-item" 
                onClick={() => setIsFeedbackOpen(true)}
                style={{ cursor: 'pointer' }}
              >
                Feedback
              </li>
            </>
          )}
        </ul>

        <div className="navbar__auth">
          {session ? (
            <div className="user-profile-nav">
              <span className="user-name-text">{dbFirstName || "Loading..."}</span>
              <button
                className="logout-icon-btn"
                onClick={handleLogout}
                title="Keluar"
              >
                <svg
                  width="20"
                  height="20"
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
          ) : (
            <>
              <span className="btn-login" onClick={() => setPage("login")}>
                Masuk
              </span>
              <span className="btn-daftar" onClick={() => setPage("register")}>
                Daftar
              </span>
            </>
          )}
        </div>
      </div>

      {/* 4. Render FeedbackModal di sini agar dia bisa muncul di mana saja saat di-klik */}
      <FeedbackModal 
        isOpen={isFeedbackOpen} 
        onClose={() => setIsFeedbackOpen(false)} 
      />
    </nav>
  );
}

export default Navbar;
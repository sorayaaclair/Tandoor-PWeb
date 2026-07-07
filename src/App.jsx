import { useState, useEffect } from "react";
import { supabase } from "./supabaseClient"; 
import Home from "./pages/Home";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Equipment from "./pages/Equipment";
import LandInfo from "./pages/LandInfo";
import RentForm from "./pages/RentForm";
import Terms from "./pages/Terms";
import EquipmentDetail from "./pages/EquipmentDetail";
import Payment from "./pages/Payment";
import Success from "./pages/Success";
import Dashboard from "./pages/Dashboard";

import HomeAdmin from "./pages/admin/AdminDashboard";
import EquipmentAdmin from "./pages/admin/AdminAnalitik";
import AdminPengguna from "./pages/admin/AdminPengguna";   
import AdminDelivery from "./pages/admin/AdminDelivery";   
import AdminPeralatan from "./pages/admin/AdminPeralatan"; 
import AdminFeedback from "./pages/admin/AdminFeedback"; 

import "./App.css";

// IMPORT STYLE ADMIN YANG SUDAH TERISOLASI DI DALAM SASS
import './styles/Admin.scss';
import "./styles/AdminFeedback.css"; 

function App() {
  // Membaca URL aktif saat refresh agar state tidak kembali amnesia
  const [page, setPage] = useState(() => {
    const path = window.location.pathname.toLowerCase();
    if (path === "/peralatan") return "equipment";
    if (path === "/detail-peralatan") return "equipment-detail";
    if (path === "/dashboard") return "dashboard";
    if (path === "/form-penyewaan") return "rent-form";
    if (path === "/login") return "login";
    if (path === "/register") return "register";
    
    // Konfigurasi Path Admin
    if (path === "/admin/permintaan-sewa") return "admin-home";
    if (path === "/admin/pengguna") return "admin-pengguna";
    if (path === "/admin/pengiriman") return "admin-delivery";
    if (path === "/admin/peralatan") return "admin-equipment";
    if (path === "/admin/analitik") return "admin-analitik";
    if (path === "/admin/feedback") return "admin-feedback"; 
    
    return "home"; // Jalur beranda default
  });

  const [session, setSession] = useState(null);
  const [role, setRole] = useState(null); 
  const [editLandData, setEditLandData] = useState(null);
  const [loading, setLoading] = useState(true); 

  // STATE UTAMA: Menyimpan ID Alat yang dipilih dari katalog Supabase
  const [selectedEquipmentId, setSelectedEquipmentId] = useState(null);

  // FUNGSI CUSTOM NAVIGATION: Menerima kiriman parameter ID dari komponen anak
  const handleNavigation = (pageName, idParam = null) => {
    setPage(pageName);
    if (idParam) {
      setSelectedEquipmentId(idParam);
    }
  };

  const [rentFormData, setRentFormData] = useState({
    startDate: "",
    endDate: "",
    deliveryAddress: "",
    note: "",
    isAgreed: false,
  });

  // =========================================================
  // SINKRONISASI STATE HALAMAN KE URL BROWSER (HISTORY API)
  // =========================================================
  useEffect(() => {
    let urlPath = "/";

    switch (page) {
      case "home":
        urlPath = "/";
        break;
      case "equipment":
        urlPath = "/Peralatan";
        break;
      case "equipment-detail":
        urlPath = "/Detail-Peralatan";
        break;
      case "dashboard":
        urlPath = "/Dashboard";
        break;
      case "rent-form":
        urlPath = "/Form-Penyewaan";
        break;
      
      // --- ROUTE URL UNTUK HALAMAN PANEL ADMIN ---
      case "admin-home":
        urlPath = "/admin/Permintaan-Sewa";
        break;
      case "admin-pengguna":
        urlPath = "/admin/Pengguna";
        break;
      case "admin-delivery":
        urlPath = "/admin/Pengiriman";
        break;
      case "admin-equipment":
        urlPath = "/admin/Peralatan";
        break;
      case "admin-analitik":
        urlPath = "/admin/Analitik";
        break;
      case "admin-feedback":
        urlPath = "/admin/Feedback"; 
        break;
        
      default:
        urlPath = `/${page}`;
    }

    window.history.pushState({ page }, "", urlPath);
  }, [page]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) checkRole(session.user.id);
      else setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        checkRole(session.user.id);
      } else {
        setRole(null);
        handleNavigation("home");
        setLoading(false); 
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const checkRole = async (userId) => {
    try {
      const { data, error } = await supabase
        .from("customer")
        .select("id_cust")
        .eq("id_cust", userId);

      if (error) throw error;

      if (data && data.length > 0) {
        setRole("customer");
      } else {
        setRole("admin");
      }
    } catch (err) {
      console.error("Gagal memeriksa hak akses, memaksa ke mode admin cek:", err.message);
      setRole("admin"); 
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (loading) return; 

    if (session && role) {
      if (page === "login" || page === "register") {
        if (role === "admin") {
          handleNavigation("admin-home"); 
        } else {
          handleNavigation("dashboard");   
        }
      }
    } else if (!session) {
      if (page !== "home" && page !== "login" && page !== "register" && page !== "equipment") {
        handleNavigation("home");
      }
    }
  }, [session, role, page, loading]); 

  const isModalOpen =
    role !== "admin" && (
      page === "login" ||
      page === "register" ||
      page === "landinfo" ||
      page === "rent-form" ||
      page === "terms" ||
      page === "payment" ||
      page === "success"
    );

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>Memuat Aplikasi Tandoor...</div>;
  }

  return (
    <div className={`app-wrapper ${isModalOpen ? "modal-open" : ""}`}>
      
      {/* ========================================================= */}
      {/* A. JALUR RENDERING HALAMAN JIKA LOGIN SEBAGAI ADMIN     */}
      {/* ========================================================= */}
      {session && role === "admin" ? (
        <div className="admin-global-scope">
          {page === "admin-home" || page === "home" || !page ? (
            <HomeAdmin session={session} setPage={handleNavigation} currentPage={page} />
          ) : page === "admin-pengguna" ? (
            <AdminPengguna session={session} setPage={handleNavigation} currentPage={page} />
          ) : page === "admin-delivery" ? (
            <AdminDelivery session={session} setPage={handleNavigation} currentPage={page} />
          ) : page === "admin-equipment" ? (
            <AdminPeralatan session={session} setPage={handleNavigation} currentPage={page} />
          ) : page === "admin-analitik" ? (
            <EquipmentAdmin session={session} setPage={handleNavigation} currentPage={page} />
          ) : page === "admin-feedback" ? (
            <AdminFeedback session={session} setPage={handleNavigation} currentPage={page} /> 
          ) : (
            <HomeAdmin session={session} setPage={handleNavigation} currentPage={page} />
          )}
        </div>
      ) : (
        
        /* ========================================================= */
        /* B. JALUR RENDERING HALAMAN JIKA CUSTOMER / BELUM LOGIN  */
        /* ========================================================= */
        <>
          {page === "home" || page === "login" || page === "register" ? (
            <Home setPage={handleNavigation} currentPage={page} session={session} />
          ) : page === "equipment" ? (
            <Equipment setPage={handleNavigation} currentPage={page} session={session} />
          ) : page === "equipment-detail" ||
            page === "rent-form" ||
            page === "terms" ||
            page === "payment" ||
            page === "success" ? (
            <EquipmentDetail 
              setPage={handleNavigation} 
              currentPage={page} 
              session={session} 
              selectedEquipmentId={selectedEquipmentId} 
            />
          ) : page === "dashboard" || page === "landinfo" ? (
            <Dashboard setPage={handleNavigation} currentPage={page} session={session} setEditLandData={setEditLandData} />
          ) : (
            <Home setPage={handleNavigation} currentPage={page} session={session} />
          )}

          {/* --- LAYER MODAL SISI USER --- */}
          {page === "login" && <Login setPage={handleNavigation} />}
          {page === "register" && <Register setPage={handleNavigation} />}
          
          {page === "landinfo" && (
            <LandInfo setPage={handleNavigation} session={session} editLandData={editLandData} setEditLandData={setEditLandData} />
          )}

          {/* MENERUSKAN STATE ID ALAT KE DALAM MODAL RENTFORM */}
          {page === "rent-form" && (
            <RentForm 
              setPage={handleNavigation} 
              session={session} 
              rentData={rentFormData} 
              setRentData={setRentFormData} 
              selectedEquipmentId={selectedEquipmentId} 
            />
          )}
          {page === "terms" && <Terms setPage={handleNavigation} />}
          {page === "payment" && (
            <Payment setPage={handleNavigation} session={session} rentData={rentFormData} setRentData={setRentFormData} />
          )}
          {page === "success" && <Success setPage={handleNavigation} />}
        </>
      )}
    </div>
  );
}

export default App;
import { useState, useEffect } from "react";
import { supabase } from "../supabaseClient"; // Pastikan path ke client Supabase sudah benar
import Navbar from "../components/Navbar";
import peralatanImg from "../assets/peralatan.png";

function Equipment({ setPage, session }) {
  const [tractors, setTractors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeFilter, setActiveFilter] = useState("Semua");

  // Jalankan fetch data saat halaman pertama kali dibuka atau saat filter kategori berubah
  useEffect(() => {
    fetchEquipment();
  }, [activeFilter]);

  // Fungsi untuk mengambil data dari tabel katalog_alat Supabase
  const fetchEquipment = async () => {
    try {
      setLoading(true);
      let query = supabase.from("katalog_alat").select("*");
      if (activeFilter !== "Semua") {
        query = query.ilike("nama_alat", `%${activeFilter}%`);
      }

      const { data, error } = await query;

      if (error) throw error;
      setTractors(data || []);
    } catch (err) {
      console.error("Gagal memuat peralatan:", err.message);
    } finally {
      setLoading(false);
    }
  };

  // Fungsi untuk menangani pencarian teks langsung ke Supabase
  const handleSearch = async () => {
    try {
      setLoading(true);
      let query = supabase.from("katalog_alat").select("*");

      if (searchTerm) {
        query = query.ilike("nama_alat", `%${searchTerm}%`);
      } else if (activeFilter !== "Semua") {
        query = query.ilike("nama_alat", `%${activeFilter}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      setTractors(data || []);
    } catch (err) {
      console.error("Gagal mencari peralatan:", err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDetailClick = (id_alat) => {
    if (session) {
      // PENTING: Oper id_alat ke fungsi setPage agar EquipmentDetail bisa mengambil datanya
      if (typeof setPage === "function") {
        setPage("equipment-detail", id_alat);
      } else {
        setPage("equipment-detail");
      }
    } else {
      alert("Silakan login terlebih dahulu untuk melihat detail peralatan.");
      setPage("login");
    }
  };

  // Fungsi pembantu untuk mengubah angka biasa menjadi format Rupiah
  const formatRupiah = (angka) => {
    if (!angka) return "Rp 0";
    return "Rp " + parseInt(angka).toLocaleString("id-ID");
  };

  // Fungsi pembantu untuk menerjemahkan status_alat (int4) menjadi teks visual
  const getStatusText = (status) => {
    // Sesuai ERD kamu status_alat bertipe int4, misal: 1 = Tersedia, 0 = Habis/Disewa
    return status === 1 || status === "1" ? "Tersedia" : "Disewa";
  };

  return (
    <div className="equipment-page">
      <Navbar setPage={setPage} currentPage="equipment" session={session} />

      <div className="container">
        <div className="equipment-header">
          <div className="header-text">
            <h2>Cari Peralatan</h2>
            <p>
              Pilih alat pertanian yang sesuai dengan kebutuhan pekerjaan Anda.
            </p>
          </div>

          <div className="search-wrapper">
            <input
              type="text"
              placeholder="Telusuri alat..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && handleSearch()}
            />
            <span className="search-icon" onClick={handleSearch} style={{ cursor: "pointer" }}>
              🔍
            </span>
          </div>
        </div>

        <div className="filter-group">
          {["Semua", "Traktor", "Bajak", "Cultivator"].map((category) => (
            <button
              key={category}
              className={`filter-btn ${activeFilter === category ? "active" : ""}`}
              onClick={() => {
                setActiveFilter(category);
                setSearchTerm(""); // Reset text pencarian saat ganti kategori
              }}
            >
              {category}
            </button>
          ))}
        </div>

        {loading ? (
          <div style={{ textAlign: "center", padding: "50px", fontSize: "18px", color: "#666" }}>
            Memuat daftar peralatan dari Supabase...
          </div>
        ) : tractors.length > 0 ? (
          <div className="equipment-grid">
            {tractors.map((item) => (
              <div key={item.id_alat} className="equipment-card">
                <div className="card-image">
                  {/* Gunakan foto dari database jika ada, jika tidak pakai gambar default asset */}
                  <img src={item.foto_alat || peralatanImg} alt={item.nama_alat} />
                  <span className={`status-badge ${getStatusText(item.status_alat) === "Tersedia" ? "" : "booked"}`}>
                    {getStatusText(item.status_alat)}
                  </span>
                </div>
                <div className="card-body">
                  <div className="card-title-row">
                    <h3>{item.nama_alat}</h3>
                    <span className="price">{formatRupiah(item.harga_sewa_hari)}/Hari</span>
                  </div>
                  {/* Sesuai gambar ERD kamu, nama_kategori bisa diisi manual atau dinamis */}
                  <span className="category-tag">Alat Tandoor</span>
                  <p className="card-desc">{item.deskripsi || "Tidak ada deskripsi untuk alat ini."}</p>
                  <div className="card-info">
                    <span>📅 Rental harian (Stok: {item.stock || 0})</span>
                    <span>🚚 Pengiriman</span>
                  </div>
                  <button
                    className="btn-detail"
                    onClick={() => handleDetailClick(item.id_alat)}
                  >
                    Lihat Detail
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ textAlign: "center", padding: "50px", color: "#999" }}>
            <h3>Peralatan tidak ditemukan</h3>
            <p>Belum ada alat dengan kategori atau nama tersebut di database.</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default Equipment;
// src/pages/EquipmentDetail.jsx
import { useState, useEffect } from "react";
import { supabase } from "../supabaseClient"; // Pastikan path ke client Supabase sudah benar
import Navbar from "../components/Navbar";
import peralatanImg from "../assets/peralatan.png";

// TAMBAHKAN selectedEquipmentId sebagai props untuk menangkap ID alat yang diklik dari halaman Equipment
function EquipmentDetail({ setPage, currentPage, session, selectedEquipmentId }) {
  const [equipment, setEquipment] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (selectedEquipmentId) {
      fetchEquipmentDetail();
    }
  }, [selectedEquipmentId]);

  const fetchEquipmentDetail = async () => {
    try {
      setLoading(true);
      // Query mengambil satu data alat yang cocok dengan ID dari tabel katalog_alat
      const { data, error } = await supabase
        .from("katalog_alat")
        .select("*")
        .eq("id_alat", selectedEquipmentId)
        .single();

      if (error) throw error;
      setEquipment(data);
    } catch (err) {
      console.error("Gagal memuat detail peralatan:", err.message);
    } finally {
      setLoading(false);
    }
  };

  // Fungsi pembantu format Rupiah
  const formatRupiah = (angka) => {
    if (!angka) return "Rp 0";
    return "Rp " + parseInt(angka).toLocaleString("id-ID");
  };

  // Fungsi pembantu menerjemahkan status_alat (int4)
  const getStatusText = (status) => {
    return status === 1 || status === "1" ? "Tersedia" : "Disewa";
  };

  // Fungsi untuk memecah teks baris baru (\n) dari database menjadi list peluru (bullet points)
  const renderListFromText = (textData, fallbackMessage) => {
    if (!textData) return <li>{fallbackMessage}</li>;
    // Memisahkan teks berdasarkan baris baru atau koma jika diinput berjajar
    const items = textData.includes("\n") ? textData.split("\n") : textData.split(",");
    return items.map((item, index) => {
      if (!item.trim()) return null;
      return <li key={index}>{item.trim()}</li>;
    });
  };

  // Fungsi khusus untuk memecah teks spesifikasi format "Key: Value" (misal: "Berat: 4500 kg")
  const renderSpecsFromText = (textData) => {
    if (!textData) return <li>Tidak ada spesifikasi khusus.</li>;
    const items = textData.includes("\n") ? textData.split("\n") : textData.split(",");
    return items.map((item, index) => {
      if (!item.trim()) return null;
      
      // Cek apakah ada pemisah titik dua (:) untuk memisahkan Label dan Nilai Angka
      if (item.includes(":")) {
        const [key, value] = item.split(":");
        return (
          <li key={index}>
            <span>{key.trim()}:</span> <strong>{value.trim()}</strong>
          </li>
        );
      }
      return <li key={index}><strong>{item.trim()}</strong></li>;
    });
  };

  if (loading) {
    return (
      <div className="detail-page">
        <Navbar setPage={setPage} currentPage="peralatan" session={session}/>
        <div className="container" style={{ textAlign: "center", padding: "100px 0", fontSize: "18px", color: "#666" }}>
          Memuat detail spesifikasi alat dari Supabase...
        </div>
      </div>
    );
  }

  if (!equipment) {
    return (
      <div className="detail-page">
        <Navbar setPage={setPage} currentPage="peralatan" session={session}/>
        <div className="container" style={{ textAlign: "center", padding: "100px 0" }}>
          <h3>Data Peralatan Tidak Ditemukan</h3>
          <p onClick={() => setPage("equipment")} style={{ color: "green", cursor: "pointer", marginTop: "10px" }}>
            ← Kembali ke Katalog
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="detail-page">
      <Navbar setPage={setPage} currentPage="peralatan" session={session}/>

      <div className="container">
        <div className="back-link" onClick={() => setPage("equipment")}>
          <span>← Kembali</span>
        </div>

        <div className="detail-main">
          <div className="detail-image-box">
            {/* Mengambil url dari foto_alat Supabase, fallback ke assets lokal jika kosong */}
            <img src={equipment.foto_alat || peralatanImg} alt={equipment.nama_alat} />
          </div>

          <div className="detail-info-box">
            <div className="title-row">
              <h2>{equipment.nama_alat}</h2>
              <span className={`status-badge ${getStatusText(equipment.status_alat) === "Tersedia" ? "" : "booked"}`}>
                {getStatusText(equipment.status_alat)}
              </span>
            </div>
            <p className="detail-desc">
              {equipment.deskripsi || "Tidak ada deskripsi tertulis untuk alat pertanian ini."}
            </p>

            <div className="price-card">
              <span>Harga Sewa</span>
              <span className="price-value">{formatRupiah(equipment.harga_sewa_hari)}/hari</span>
            </div>

            <div className="action-box">
              <div className="action-info">
                <span>📅 Stok Tersedia: {equipment.stock || 0} unit</span>
                <span>🚚 Tersedia layanan pengiriman armada Tandoor</span>
              </div>
              {/* Oper id_alat ke form order sewa agar form sewa tahu traktor apa yang dipesan */}
              <button
                className="btn-pesan"
                disabled={equipment.stock <= 0 || getStatusText(equipment.status_alat) !== "Tersedia"}
                onClick={() => {
                  if (typeof setPage === "function") {
                    setPage("rent-form", equipment.id_alat);
                  } else {
                    setPage("rent-form");
                  }
                }}
              >
                {equipment.stock > 0 && getStatusText(equipment.status_alat) === "Tersedia" ? "Pesan Sekarang" : "Stok Habis"}
              </button>
            </div>
          </div>
        </div>

        <div className="detail-grid-info">
          <div className="info-card">
            <h3>Spesifikasi</h3>
            <ul className="spec-list">
              {/* Memotong teks dinamis kolom spesifikasi_alat dari Supabase */}
              {renderSpecsFromText(equipment.spesifikasi_alat)}
            </ul>
          </div>

          <div className="info-card">
            <h3>Fitur</h3>
            <ul className="feature-list">
              {/* Memotong teks dinamis kolom fitur_alat dari Supabase */}
              {renderListFromText(equipment.fitur_alat, "Tidak ada daftar fitur khusus.")}
            </ul>
          </div>

          <div className="info-card">
            <h3>Fasilitas Penyewaan</h3>
            <ul className="feature-list">
              {/* Memotong teks dinamis kolom fasilitas_penyewaan dari Supabase */}
              {renderListFromText(equipment.fasilitas_penyewaan, "Fasilitas standar perawatan unit terjamin.")}
            </ul>
          </div>
        </div>
      </div>

      <div className="footer-green"></div>
    </div>
  );
}

export default EquipmentDetail;
// src/pages/RentForm.jsx
import { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";

function RentForm({ setPage, session, rentData, setRentData, selectedEquipmentId }) {
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  
  const [userLands, setUserLands] = useState([]);
  const [fetchingLands, setFetchingLands] = useState(false);
  const [customerName, setCustomerName] = useState("User");

  const [equipmentData, setEquipmentData] = useState(null);
  const [hargaPerHari, setHargaPerHari] = useState(0);
  const [fetchingAlat, setFetchingAlat] = useState(true);

  useEffect(() => {
    async function loadData() {
      const userId = session?.user?.id;
      if (!userId) return;

      // 1. Ambil Nama Lengkap Customer
      try {
        const { data: customerData, error: customerError } = await supabase
          .from("customer")
          .select("nama_depan, nama_belakang")
          .eq("id_cust", userId)
          .single();
        
        if (customerError) throw customerError;
        if (customerData) {
          const mergedName = `${customerData.nama_depan || ""} ${customerData.nama_belakang || ""}`.trim();
          setCustomerName(mergedName || "User Tandoor");
        }
      } catch (err) {
        console.error("Gagal memuat nama customer:", err.message);
        const metaName = session?.user?.user_metadata?.full_name || session?.user?.user_metadata?.name;
        if (metaName) setCustomerName(metaName);
      }

      // 2. Ambil Harga Sewa Asli Berdasarkan ID yang Dikirim
      if (selectedEquipmentId) {
        try {
          setFetchingAlat(true);
          const { data: alat, error: alatError } = await supabase
            .from("katalog_alat")
            .select("id_alat, nama_alat, harga_sewa_hari")
            .eq("id_alat", selectedEquipmentId)
            .single();

          if (alatError) throw alatError;

          if (alat) {
            console.log("Berhasil mengambil tarif alat dari DB:", alat);
            setEquipmentData(alat);
            setHargaPerHari(Number(alat.harga_sewa_hari));
          }
        } catch (err) {
          console.error("Gagal memuat harga spesifik alat:", err.message);
          setHargaPerHari(0);
        } finally {
          setFetchingAlat(false);
        }
      } else {
        console.warn("RentForm dibuka tanpa memuat selectedEquipmentId!");
        setFetchingAlat(false);
      }

      // 3. Ambil Daftar Dropdown Lahan Milik User
      setFetchingLands(true);
      try {
        const { data: landData, error: landError } = await supabase
          .from("informasi_lahan")
          .select("id_lahan, nama_lahan, alamat_lahan")
          .eq("id_cust", userId);
        
        if (landError) throw landError;
        setUserLands(landData || []);
      } catch (err) {
        console.error("Gagal memuat lahan untuk dropdown:", err.message);
      } finally {
        setFetchingLands(false);
      }
    }

    loadData();
  }, [session, selectedEquipmentId]);

  const handleForceResetAndClose = () => {
    setRentData({ startDate: "", endDate: "", deliveryAddress: "", note: "", isAgreed: false });
    setPage("equipment-detail");
  };

  const calculateTotalPrice = () => {
    if (!rentData.startDate || !rentData.endDate || hargaPerHari === 0) return 0;
    const start = new Date(rentData.startDate);
    const end = new Date(rentData.endDate);
    const diffTime = Math.abs(end - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return diffDays * hargaPerHari;
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    let newValue = type === "checkbox" ? checked : value;
    const today = new Date().toISOString().split("T")[0];

    if (name === "startDate" && value < today) {
      alert("Tanggal mulai tidak boleh tanggal yang sudah lewat!");
      return;
    }
    
    if (name === "endDate" && rentData.startDate && value < rentData.startDate) {
      alert("Tanggal selesai tidak boleh lebih awal dari tanggal mulai.");
      return;
    }

    setRentData((prev) => ({ ...prev, [name]: newValue }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: false }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    let tempErrors = {};

    if (!rentData.startDate) tempErrors.startDate = true;
    if (!rentData.endDate) tempErrors.endDate = true;
    if (!rentData.deliveryAddress) tempErrors.deliveryAddress = true;
    if (!rentData.isAgreed) tempErrors.isAgreed = true;

    setErrors(tempErrors);

    if (Object.keys(tempErrors).length === 0) {
      setLoading(true);
      try {
        const userId = session?.user?.id;
        if (!userId) throw new Error("Sesi tidak ditemukan.");

        const todayDate = new Date().toISOString().split("T")[0];

        // Memasukkan data sewa baru langsung ke kolom resmi database Supabase kamu
        const { error } = await supabase.from("penyewaan").insert([
          {
            id_cust: userId,                               
            tgl_pesan: todayDate,                          
            tgl_sewa: rentData.startDate,                  
            tgl_selesai: rentData.endDate,                 
            total_harga: calculateTotalPrice(),            
            alamat_pengantaran: rentData.deliveryAddress,  
            status_transaksi: 1,                           
            metode_pembayaran: 1,                          
            catatan_tambahan: rentData.note || null,
            nama_pertanian: equipmentData?.nama_alat || "Alat Pertanian" // <-- Masuk ke kolom ini
          },
        ]);

        if (error) throw error;
        setPage("payment");
      } catch (err) {
        alert("Gagal memproses penyewaan: " + err.message);
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div className="auth-overlay">
      <div className="auth-modal rent-modal">
        <button className="close-btn" onClick={handleForceResetAndClose} disabled={loading}>✕</button>

        <h2 className="auth-title">Formulir Pengajuan Sewa</h2>
        <p className="auth-subtitle">
          {fetchingAlat ? "Memuat nama produk..." : (equipmentData?.nama_alat || "Alat Pertanian")}
        </p>

        <div style={{ background: '#eef5f0', padding: '15px', borderRadius: '8px', marginBottom: '20px', textAlign: 'center', border: '1px dashed #1a4d2e', marginTop: '15px' }}>
          <span style={{ fontSize: '14px', color: '#666' }}>Estimasi Biaya Sewa: </span>
          <strong style={{ fontSize: '18px', color: '#1a4d2e' }}>
            Rp {calculateTotalPrice().toLocaleString('id-ID')}
          </strong>
          <div style={{ fontSize: '11px', color: '#666', marginTop: '3px' }}>
            (Tarif dasar: Rp {hargaPerHari.toLocaleString('id-ID')} / hari)
          </div>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="form-section-header">
            <h3 style={{ fontSize: "16px", marginBottom: "10px", color: "#1a4d2e", fontWeight: '600' }}>Informasi Penyewa</h3>
          </div>

          <div className="user-info-statis" style={{ background: "#f8faf9", padding: "15px", borderRadius: "8px", marginBottom: "20px", border: "1px solid #e0e6e2" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "5px" }}>
              <span style={{ color: "#666", fontSize: "14px" }}>Nama:</span>
              <span style={{ fontWeight: "600", fontSize: "14px" }}>{customerName}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "#666", fontSize: "14px" }}>Email:</span>
              <span style={{ fontWeight: "600", fontSize: "14px" }}>{session?.user?.email}</span>
            </div>
          </div>

          <hr style={{ margin: "20px 0", border: "0", borderTop: "1px solid #eee" }} />

          <div className="input-field">
            <label>Tanggal Mulai Sewa <span className="red">*</span></label>
            <div className={`input-group ${errors.startDate ? "error-border" : ""}`}>
              <input type="date" name="startDate" value={rentData.startDate} onChange={handleChange} disabled={loading} />
            </div>
          </div>

          <div className="input-field">
            <label>Tanggal Selesai Sewa <span className="red">*</span></label>
            <div className={`input-group ${errors.endDate ? "error-border" : ""}`}>
              <input type="date" name="endDate" value={rentData.endDate} onChange={handleChange} disabled={loading} />
            </div>
          </div>

          <div className="input-field">
            <label>Pilih Lahan Pengantaran <span className="red">*</span></label>
            <div className={`input-group ${errors.deliveryAddress ? "error-border" : ""}`}>
              <select name="deliveryAddress" value={rentData.deliveryAddress} onChange={handleChange} disabled={loading || fetchingLands} style={{ width: "100%", padding: "10px", borderRadius: "6px", border: "none", background: "none", fontSize: "14px" }}>
                <option value="">-- {fetchingLands ? "Memuat lahan..." : "Pilih Lahan Terdaftar"} --</option>
                {userLands.map((land) => (
                  <option key={land.id_lahan} value={land.alamat_lahan}>{land.nama_lahan} ({land.alamat_lahan})</option>
                ))}
              </select>
            </div>
          </div>

          <div className="input-field">
            <label>Catatan Tambahan (Opsional)</label>
            <div className="input-group">
              <input type="text" name="note" placeholder="Contoh: Kirim sebelum jam 9 Pagi" value={rentData.note} onChange={handleChange} disabled={loading} />
            </div>
          </div>

          <div className="terms-checkbox" style={{ marginTop: "15px", display: "flex", alignItems: "flex-start", gap: "10px" }}>
            <input type="checkbox" name="isAgreed" id="isAgreed" checked={rentData.isAgreed} onChange={handleChange} disabled={loading} />
            <label htmlFor="isAgreed" style={{ fontSize: "12px", color: errors.isAgreed ? 'red' : '#555' }}>
              Saya menyetujui <span className="green-link" onClick={() => setPage("terms")} style={{ cursor: "pointer", fontWeight: 'bold' }}>Syarat dan Ketentuan</span>.
            </label>
          </div>

          <div className="form-actions" style={{ display: "flex", gap: "10px", marginTop: "20px" }}>
            <button type="button" className="btn-cancel" onClick={handleForceResetAndClose} disabled={loading} style={{ flex: 1, padding: "12px", borderRadius: "8px", border: "1px solid #ddd", background: "white" }}>Batal</button>
            <button type="submit" className="btn-submit" disabled={loading || userLands.length === 0 || hargaPerHari === 0} style={{ flex: 3, padding: "12px", borderRadius: "8px", border: "none", background: (loading || userLands.length === 0 || hargaPerHari === 0) ? "#ccc" : "#1a4d2e", color: "white", fontWeight: "600" }}>
              {loading ? "Mengirim..." : "Lanjut ke Pembayaran"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default RentForm;
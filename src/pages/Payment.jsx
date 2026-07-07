// src/pages/Payment.jsx
import { useState, useEffect, useRef } from "react";
import { supabase } from "../supabaseClient";

function Payment({ setPage, session, rentData, setRentData }) {
  const [file, setFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [latestRent, setLatestRent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [customerName, setCustomerName] = useState("");

  const fileInputRef = useRef(null);
  const deliveryFee = 100000; // Ongkir tetap Rp 100.000

  useEffect(() => {
    const fetchLatestRentalAndUser = async () => {
      try {
        const userId = session?.user?.id;
        if (!userId) return;

        // 1. Ambil Nama Lengkap dari tabel customer
        const { data: userData } = await supabase
          .from("customer")
          .select("nama_depan, nama_belakang")
          .eq("id_cust", userId)
          .single();
        
        if (userData) {
          const mergedName = `${userData.nama_depan || ""} ${userData.nama_belakang || ""}`.trim();
          setCustomerName(mergedName || "User Tandoor");
        }

        // 2. Ambil transaksi sewa terakhir yang baru saja di-insert di RentForm
        const { data: rentDataList, error: rentError } = await supabase
          .from("penyewaan")
          .select("*")
          .eq("id_cust", userId)
          .order("transaksi_id", { ascending: false }) 
          .limit(1);

        if (rentError) throw rentError;
        if (rentDataList && rentDataList.length > 0) {
          setLatestRent(rentDataList[0]);
        }
      } catch (err) {
        console.error("Gagal memuat data sewa di Payment:", err.message);
      } finally {
        setLoading(false); // Perbaikan: kata 'file' sudah diganti menjadi 'finally'
      }
    };
    fetchLatestRentalAndUser();
  }, [session]);

  const calculateDuration = () => {
    const start = latestRent?.tgl_sewa;
    const end = latestRent?.tgl_selesai;
    if (!start || !end) return 0;
    return Math.ceil(Math.abs(new Date(end) - new Date(start)) / (1000 * 60 * 60 * 24)) + 1;
  };

  const rentalPrice = latestRent?.total_harga ? Number(latestRent.total_harga) : 0;
  const grandTotal = rentalPrice + deliveryFee;

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile && selectedFile.size <= 5 * 1024 * 1024) {
      setFile(selectedFile);
    } else if (selectedFile) {
      alert("Ukuran file maksimal 5MB");
    }
  };

  const handleConfirm = async () => {
    if (!file) return alert("Harap unggah bukti pembayaran.");

    setIsUploading(true);
    try {
      const userId = session?.user?.id;
      const fileName = `${userId}-${Date.now()}.${file.name.split(".").pop()}`;

      // 1. Upload Bukti Gambar ke Storage Bucket Supabase 'bukti-transfer'
      const { error: uploadError } = await supabase.storage
        .from("bukti-transfer")
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // 2. Dapatkan Link Gambar Publiknya
      const { data: publicUrlData } = supabase.storage
        .from("bukti-transfer")
        .getPublicUrl(fileName);

      const todayDate = new Date().toISOString().split("T")[0];
      const uuidPembayaran = crypto.randomUUID();

      // 3. Simpan data verifikasi ke tabel pembayaran
      const { error: insertPaymentError } = await supabase
        .from("pembayaran")
        .insert([
          {
            id_pembayaran: uuidPembayaran, 
            tgl_bayar: todayDate,                        
            jumlah_bayar: grandTotal,                    
            metode_pembayaran: 1,                        
            status_pembayaran: 1,                        
            bukti_pembayaran: publicUrlData.publicUrl,    
            id_penyewaan: latestRent?.id_penyewaan,       
            id_cust: userId,                              
            id_admin: null                                
          }
        ]);

      if (insertPaymentError) throw insertPaymentError;

      // 4. Update akumulasi total_harga final + Ubah status ke 'Menunggu Konfirmasi' (1) dan hubungkan id_pembayaran
      const { error: updateRentError } = await supabase
        .from("penyewaan")
        .update({ 
          total_harga: grandTotal, 
          status_transaksi: 1,
          id_pembayaran: uuidPembayaran
        })
        .eq("transaksi_id", latestRent?.transaksi_id);

      if (updateRentError) throw updateRentError;

      // Reset State global setelah sukses transaksi
      setRentData({ startDate: "", endDate: "", deliveryAddress: "", note: "", isAgreed: false });
      setPage("success");
    } catch (err) {
      alert("Kesalahan simpan pembayaran: " + err.message);
    } finally {
      setIsUploading(false);
    }
  };

  if (loading) return <div className="auth-overlay">Memuat info ringkasan tagihan...</div>;

  return (
    <div className="auth-overlay">
      <div className="auth-modal payment-confirm-modal">
        <button className="close-btn" onClick={() => setPage("rent-form")}>✕</button>
        <h2 className="auth-title">Konfirmasi Pembayaran</h2>
        <p className="auth-subtitle">Sewa Alat Pertanian Tandoor</p>

        <div className="payment-content">
          <div className="summary-box">
            <h4>Ringkasan Pemesanan</h4>
            <div className="summary-item"><span>Nama Penyewa:</span> <strong>{customerName}</strong></div>
            <div className="summary-item"><span>Durasi Sewa:</span> <strong>{calculateDuration()} Hari</strong></div>
            <div className="summary-item"><span>Biaya Sewa Alat:</span> <strong>Rp {rentalPrice.toLocaleString('id-ID')}</strong></div>
            <div className="summary-item" style={{ color: '#1a4d2e' }}><span>Tarif Kirim Armada:</span> <strong>Rp {deliveryFee.toLocaleString('id-ID')}</strong></div>
            <hr />
            <div className="total-row"><span>Total Wajib Bayar:</span><span className="total-price">Rp {grandTotal.toLocaleString('id-ID')}</span></div>
          </div>

          <div className="upload-form" style={{ marginTop: '15px' }}>
            <label>Unggah Bukti Transaksi <span className="red">*</span></label>
            <input type="file" ref={fileInputRef} style={{ display: 'none' }} onChange={handleFileChange} accept="image/*" />
            {!file ? (
              <div className="upload-area" onClick={() => fileInputRef.current.click()}>
                <p><span>Klik untuk memilih gambar</span></p>
                <small>PNG, JPG (Maks. 5MB)</small>
              </div>
            ) : (
              <div className="uploaded-file-box">
                <span>✅ {file.name}</span>
                <button className="btn-remove-file" onClick={() => setFile(null)}>Ganti File</button>
              </div>
            )}
          </div>

          <div className="btn-group-row" style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
            <button className="btn-outline" onClick={() => setPage("rent-form")} disabled={isUploading}>Kembali</button>
            <button className="btn-submit btn-confirm" onClick={handleConfirm} disabled={isUploading}>
              {isUploading ? "Memproses..." : "Konfirmasi Pembayaran"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Payment;
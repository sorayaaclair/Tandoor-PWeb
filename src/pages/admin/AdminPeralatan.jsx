// src/pages/admin/AdminPeralatan.jsx
import React, { useState, useEffect } from "react";
import { supabase } from "../../supabaseClient"; 
import "../../styles/AdminPeralatan.css";

import deskImg from "../../assets/Desk_alt.png";
import analysisImg from "../../assets/Line_up.png";
import delivery2Img from "../../assets/package_car (1).png";
import userImg from "../../assets/User.png";
import groupImg from "../../assets/Group_light.png";
import packageImg from "../../assets/package.png";
import deliveryImg from "../../assets/package_car.png";
import timeImg from "../../assets/Time.png";
import package2Img from "../../assets/package (1).png";
import messageImg from "../../assets/Message.png";

const AdminPeralatan = ({ session, setPage, currentPage }) => {
  // --- STATE DATA STATISTIK ATAS ---
  const [totalPenyewaanAktif, setTotalPenyewaanAktif] = useState(0);
  const [totalCustomers, setTotalCustomers] = useState(0);
  const [totalPending, setTotalPending] = useState(0);
  const [loadingStats, setLoadingStats] = useState(true);

  // --- STATE DAFTAR ALAT & KATEGORI ---
  const [tools, setTools] = useState([]);
  const [categories, setCategories] = useState([]); 
  const [loadingTools, setLoadingTools] = useState(true);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedTool, setSelectedTool] = useState(null);

  // State tambahan untuk proses upload gambar
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchStatsData();
    fetchToolsData();
    fetchCategoriesData(); 
  }, []);

  const fetchStatsData = async () => {
    try {
      setLoadingStats(true);
      const [penyewaanRes, customerRes] = await Promise.all([
        supabase.from("penyewaan").select("status_transaksi"),
        supabase.from("customer").select("id_cust"),
      ]);

      if (penyewaanRes.error) throw penyewaanRes.error;
      if (customerRes.error) throw customerRes.error;

      const rentals = penyewaanRes.data || [];
      const customers = customerRes.data || [];

      const aktifCount = rentals.filter((r) => String(r.status_transaksi) === "2").length;
      setTotalPenyewaanAktif(aktifCount);
      setTotalCustomers(customers.length);

      const pendingCount = rentals.filter((r) => String(r.status_transaksi) === "1").length;
      setTotalPending(pendingCount);
    } catch (err) {
      console.error("Gagal memuat indikator statistik:", err.message);
    } finally {
      setLoadingStats(false);
    }
  };

  const fetchCategoriesData = async () => {
    try {
      const { data, error } = await supabase.from("kategori_alat").select("*");
      if (error) throw error;
      setCategories(data || []);
    } catch (err) {
      console.error("Gagal memuat data kategori_alat:", err.message);
    }
  };

  const fetchToolsData = async () => {
    try {
      setLoadingTools(true);
      const { data, error } = await supabase
        .from("katalog_alat")
        .select("*")
        .order("id_alat", { ascending: false });

      if (error) throw error;
      setTools(data || []);
    } catch (err) {
      console.error("Gagal memuat data katalog_alat:", err.message);
    } finally {
      setLoadingTools(false);
    }
  };

  // Fungsi Helper untuk mengupload gambar ke Supabase Storage (Bucket: 'Katalog Alat')
  const uploadImage = async (file) => {
    if (!file) return null;
    try {
      setUploading(true);
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `public/${fileName}`;

      // Menggunakan nama bucket asli kamu yang ada di Supabase
      const { error: uploadError } = await supabase.storage
        .from('Katalog Alat') 
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from('Katalog Alat').getPublicUrl(filePath);
      return data.publicUrl;
    } catch (error) {
      console.error('Error uploading image:', error.message);
      return null;
    } finally {
      setUploading(false);
    }
  };

  // ACTION TAMBAH DATA (INSERT)
  const handleAddTool = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);

    // Validasi input gambar wajib di-upload karena diatur NOT NULL di database kamu
    const imageFile = e.target.foto_alat.files[0];
    if (!imageFile) {
      alert("Foto alat wajib dipilih karena database memerlukan data foto_alat!");
      return;
    }

    try {
      // 1. Ambil data katalog untuk mendeteksi ID terakhir (format bpchar string)
      const { data: allTools, error: fetchError } = await supabase
        .from("katalog_alat")
        .select("id_alat");

      if (fetchError) throw fetchError;

      // 2. Kalkulasi nomor urut berikutnya dari format teks ID yang sudah ada
      let nextNumber = 1;
      if (allTools && allTools.length > 0) {
        const numbers = allTools.map(t => {
          const match = t.id_alat.match(/\d+/);
          return match ? parseInt(match[0], 10) : 0;
        });
        const maxNumber = Math.max(...numbers, 0);
        nextNumber = maxNumber + 1;
      }

      // 3. Format string penomoran unik (Hasil contoh: "ALAT_001")
      const generatedStrId = `ALAT_${String(nextNumber).padStart(3, '0')}`;

      const brand = formData.get("brand") || "-";
      const model = formData.get("model") || "-";
      const year = formData.get("year") || "-";
      const generatedSpecs = `Manufaktur: ${brand}\nModel: ${model}\nTahun: ${year}`;

      // 4. Proses upload gambar ke bucket 'Katalog Alat'
      let imageUrl = await uploadImage(imageFile);
      
      // Pengaman jika upload storage bermasalah, gunakan link placeholder eksternal yang valid
      if (!imageUrl) {
        console.warn("Gagal mengunggah ke Storage. Menggunakan gambar cadangan.");
        imageUrl = "https://images.unsplash.com/photo-1624462966581-bc6d768cbce5?q=80&w=1000&auto=format&fit=crop";
      }

      let selectedCatValue = formData.get("category_id");
      if (selectedCatValue === "Cultivator") selectedCatValue = 1;
      else if (selectedCatValue === "Traktor") selectedCatValue = 2;
      else if (selectedCatValue === "Bajak") selectedCatValue = 3;

      const newEquipment = {
        id_alat: generatedStrId,
        nama_alat: formData.get("name"),
        kategori: parseInt(selectedCatValue) || null, 
        harga_sewa_hari: parseInt(formData.get("price")) || 0,
        stock: parseInt(formData.get("stock")) || 1,
        status_alat: 1, 
        deskripsi: formData.get("desc"),
        spesifikasi_alat: generatedSpecs,
        foto_alat: imageUrl, 
        fitur_alat: formData.get("features") || "", 
        fasilitas_penyewaan: formData.get("facilities") || "" 
      };

      const { error } = await supabase.from("katalog_alat").insert([newEquipment]);
      if (error) throw error;
      
      setIsAddModalOpen(false);
      fetchToolsData(); 
      alert("Peralatan baru berhasil ditambahkan!");
    } catch (err) {
      alert("Gagal menambahkan alat baru: " + err.message);
    }
  };

  // ACTION EDIT DATA (UPDATE)
  const handleEditTool = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);

    const brand = formData.get("brand") || "-";
    const model = formData.get("model") || "-";
    const generatedSpecs = `Manufaktur: ${brand}\nModel: ${model}`;

    const imageFile = e.target.foto_alat.files[0];
    let imageUrl = selectedTool.foto_alat; 
    if (imageFile) {
      const newUrl = await uploadImage(imageFile);
      if (newUrl) imageUrl = newUrl;
    }

    let selectedCatValue = formData.get("category_id");
    if (selectedCatValue === "Cultivator") selectedCatValue = 1;
    else if (selectedCatValue === "Traktor") selectedCatValue = 2;
    else if (selectedCatValue === "Bajak") selectedCatValue = 3;

    const updatedData = {
      nama_alat: formData.get("name"),
      kategori: parseInt(selectedCatValue) || null, 
      harga_sewa_hari: parseInt(formData.get("price")) || 0,
      stock: parseInt(formData.get("stock")) || 0,
      status_alat: parseInt(formData.get("status")), 
      deskripsi: formData.get("desc"),
      spesifikasi_alat: generatedSpecs,
      foto_alat: imageUrl,
      fitur_alat: formData.get("features") || "",
      fasilitas_penyewaan: formData.get("facilities") || ""
    };

    try {
      const { error } = await supabase
        .from("katalog_alat")
        .update(updatedData)
        .eq("id_alat", selectedTool.id_alat);

      if (error) throw error;
      setIsEditModalOpen(false);
      fetchToolsData(); 
      alert("Perubahan data alat berhasil disimpan!");
    } catch (err) {
      alert("Gagal memperbarui data alat: " + err.message);
    }
  };

  const handleDeleteTool = async (idAlat) => {
    if (window.confirm("Apakah Anda yakin ingin menghapus peralatan ini secara permanen dari Supabase?")) {
      try {
        const { error } = await supabase.from("katalog_alat").delete().eq("id_alat", idAlat);
        if (error) throw error;
        fetchToolsData(); 
      } catch (err) {
        alert("Gagal menghapus alat: " + err.message);
      }
    }
  };

  // FUNGSI BARU: Update stok cepat (+1 atau -1) langsung dari card tanpa modal
  const handleQuickStockUpdate = async (tool, diff) => {
    const newStock = Math.max(0, (tool.stock || 0) + diff);
    
    // Optimistic update: langsung ubah state lokal
    setTools(prevTools =>
      prevTools.map(t =>
        t.id_alat === tool.id_alat ? { ...t, stock: newStock } : t
      )
    );

    try {
      const { error } = await supabase
        .from("katalog_alat")
        .update({ stock: newStock })
        .eq("id_alat", tool.id_alat);

      if (error) throw error;
      console.log(`[QuickStock] ${tool.nama_alat}: ${tool.stock} → ${newStock}`);
    } catch (err) {
      // Rollback jika gagal
      setTools(prevTools =>
        prevTools.map(t =>
          t.id_alat === tool.id_alat ? { ...t, stock: tool.stock } : t
        )
      );
      alert("Gagal memperbarui stok: " + err.message);
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

  const getCategoryName = (catId) => {
    if (!catId) return "Alat Tandoor";
    if (String(catId) === "1") return "Cultivator";
    if (String(catId) === "2") return "Traktor";
    if (String(catId) === "3") return "Bajak";
    
    const found = categories.find((c) => String(c.id_kategori) === String(catId));
    return found ? found.nama_kategori : "Alat Pertanian";
  };

  const getSpecValue = (specText, keyName) => {
    if (!specText) return "";
    const lines = specText.split("\n");
    const foundLine = lines.find((line) => line.toLowerCase().includes(keyName.toLowerCase()));
    if (foundLine && foundLine.includes(":")) {
      return foundLine.split(":")[1].trim();
    }
    return "";
  };

  return (
    <div className="admin-container">
      <nav className="navbar">
        <div className="nav-container">
          <div className="brand-logo" onClick={() => setPage("admin-home")} style={{ cursor: "pointer" }}>
            tandoor
          </div>
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
            <div className="stat-info">
              <span>Peralatan</span>
              <h2>{loadingTools ? "..." : tools.length}</h2>
            </div>
            <img src={deliveryImg} alt="Delivery" className="custom-icon" />
          </div>
        </section>

        <div className="tab-navigation">
          <button className={`tab-btn ${currentPage === "admin-home" || currentPage === "home" || !currentPage ? "active" : ""}`} onClick={() => setPage("admin-home")}>
            Permintaan Sewa <img src={deskImg} alt="Desk" style={{ width: "16px", height: "16px", marginLeft: "5px" }} className="tab-icon-small" />
          </button>
          <button className={`tab-btn ${currentPage === "admin-pengguna" ? "active" : ""}`} onClick={() => setPage("admin-pengguna")}>
            Pengguna <img src={userImg} alt="User" style={{ width: "16px", height: "16px", marginLeft: "5px" }} className="tab-icon-small" />
          </button>
          <button className={`tab-btn ${currentPage === "admin-delivery" ? "active" : ""}`} onClick={() => setPage("admin-delivery")}>
            Pengiriman <img src={package2Img} alt="pack" style={{ width: "20px", height: "20px", marginLeft: "5px" }} className="tab-icon-small" />
          </button>
          <button className="tab-btn active" onClick={() => setPage("admin-equipment")}>
            Peralatan <img src={delivery2Img} alt="Delivery2" style={{ width: "20px", height: "20px", marginLeft: "5px" }} className="tab-icon-small" />
          </button>
          <button className={`tab-btn ${currentPage === "admin-analitik" ? "active" : ""}`} onClick={() => setPage("admin-analitik")}>
            Analitik <img src={analysisImg} alt="Analysis" style={{ width: "16px", height: "16px", marginLeft: "5px" }} className="tab-icon-small" />
          </button>
          <button className={`tab-btn ${currentPage === "admin-feedback" ? "active" : ""}`} onClick={() => setPage("admin-feedback")}>
            Feedback <img src={messageImg} alt="Feedback" style={{ width: "16px", height: "16px", marginLeft: "5px" }} className="tab-icon-small" />
          </button>
        </div>

        <section className="management-box">
          <div className="management-header">
            <h2>Manajemen Alat</h2>
            <button className="btn-add" onClick={() => setIsAddModalOpen(true)}>
              Tambah Alat
            </button>
          </div>

          {loadingTools ? (
            <div style={{ textAlign: "center", padding: "40px", color: "#666" }}>Memuat katalog alat...</div>
          ) : tools.length > 0 ? (
            <div className="tools-grid">
              {tools.map((tool) => (
                <div key={tool.id_alat} className="tool-card">
                  <div className="tool-card-header">
                    <h3>{tool.nama_alat}</h3>
                    <span className={`status-badge ${parseInt(tool.status_alat) === 1 ? "tersedia" : "disewa"}`}>
                      {parseInt(tool.status_alat) === 1 ? "Tersedia" : "Disewa"}
                    </span>
                  </div>
                  <span className="category">{getCategoryName(tool.kategori)}</span>
                  
                  {tool.foto_alat && (
                    <div style={{ width: "100%", height: "120px", overflow: "hidden", margin: "10px 0", borderRadius: "6px" }}>
                      <img src={tool.foto_alat} alt={tool.nama_alat} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    </div>
                  )}

                  <div className="tool-details">
                    <div className="detail-row">
                      <span className="detail-label">Harga Sewa</span>
                      <span className="detail-value">Rp {parseInt(tool.harga_sewa_hari).toLocaleString("id-ID")}/Hari</span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">Stok Unit</span>
                      <div className="stock-control">
                        <button 
                          className="stock-btn stock-btn-minus" 
                          onClick={() => handleQuickStockUpdate(tool, -1)}
                          disabled={(tool.stock || 0) <= 0}
                          title="Kurangi stok"
                        >
                          −
                        </button>
                        <span className="stock-value">{tool.stock || 0}</span>
                        <button 
                          className="stock-btn stock-btn-plus" 
                          onClick={() => handleQuickStockUpdate(tool, 1)}
                          title="Tambah stok"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </div>
                  <div className="tool-actions">
                    <button
                      className="btn-edit"
                      onClick={() => {
                        setSelectedTool(tool);
                        setIsEditModalOpen(true);
                      }}
                    >
                      Edit
                    </button>
                    <button className="btn-delete" onClick={() => handleDeleteTool(tool.id_alat)}>
                      Hapus
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ textAlign: "center", padding: "40px", color: "#999" }}>Belum ada alat yang terdaftar.</div>
          )}
        </section>
      </main>

      {/* --- MODAL TAMBAH ALAT BARU --- */}
      {isAddModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxHeight: "85vh", overflowY: "auto" }}>
            <button className="close-x" onClick={() => setIsAddModalOpen(false)}>&times;</button>
            <div className="modal-header-text">
              <h2>Tambah Peralatan Baru</h2>
            </div>
            <form className="modal-form" onSubmit={handleAddTool}>
              <div className="form-section">
                <h3>Informasi Alat</h3>
                <div className="form-group">
                  <label>Nama Alat *</label>
                  <input name="name" type="text" required placeholder="Contoh: John Deere 5075E" />
                </div>
                
                <div className="form-row">
                  <div className="form-group">
                    <label>Kategori Alat *</label>
                    <select name="category_id" required className="modal-select-field">
                      <option value="">-- Pilih Kategori --</option>
                      <option value="Cultivator">Cultivator</option>
                      <option value="Traktor">Traktor</option>
                      <option value="Bajak">Bajak</option>
                      {categories.map((cat) => (
                        <option key={cat.id_kategori} value={cat.id_kategori}>
                          {cat.nama_kategori}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Stok Awal *</label>
                    <input name="stock" type="number" defaultValue="1" min="1" required />
                  </div>
                </div>

                <div className="form-group">
                  <label>Harga Sewa Harian (Rupiah Angka Saja) *</label>
                  <input name="price" type="number" placeholder="Contoh: 200000" required />
                </div>

                <div className="form-group">
                  <label>Foto Alat (File Gambar) *</label>
                  <input name="foto_alat" type="file" accept="image/*" required className="modal-select-field" style={{ padding: "6px" }} />
                </div>

                <div className="form-group">
                  <label>Deskripsi Alat</label>
                  <textarea name="desc" placeholder="Tulis deskripsi singkat performa alat pertanian..."></textarea>
                </div>

                <div className="form-group">
                  <label>Fitur Keunggulan Alat</label>
                  <textarea name="features" placeholder="Contoh: Lampu LED kerja, Power steering, Kabin AC..."></textarea>
                </div>

                <div className="form-group">
                  <label>Fasilitas / Layanan Sewa</label>
                  <textarea name="facilities" placeholder="Contoh: Gratis buku operasional, Layanan bantuan mekanik..."></textarea>
                </div>
              </div>

              <div className="form-section">
                <h3>Spesifikasi</h3>
                <div className="form-row">
                  <div className="form-group">
                    <label>Manufaktur/Brand</label>
                    <input name="brand" type="text" placeholder="John Deere / Kubota" />
                  </div>
                  <div className="form-group">
                    <label>Model</label>
                    <input name="model" type="text" placeholder="5075E / L4400" />
                  </div>
                  <div className="form-group">
                    <label>Tahun Rilis</label>
                    <input name="year" type="text" placeholder="2024" />
                  </div>
                </div>
              </div>

              <div className="modal-actions">
                <button type="submit" className="btn-submit" disabled={uploading}>
                  {uploading ? "Mengupload Gambar..." : "Tambahkan Alat"}
                </button>
                <button type="button" className="btn-batal" onClick={() => setIsAddModalOpen(false)}>Batal</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL EDIT ALAT --- */}
      {isEditModalOpen && selectedTool && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxHeight: "85vh", overflowY: "auto" }}>
            <button className="close-x" onClick={() => setIsEditModalOpen(false)}>&times;</button>
            <div className="modal-header-text">
              <h2>Edit Informasi Alat</h2>
            </div>
            <form className="modal-form" onSubmit={handleEditTool}>
              <div className="form-section">
                <div className="form-group">
                  <label>Nama Alat *</label>
                  <input name="name" type="text" defaultValue={selectedTool.nama_alat} required />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Kategori Alat *</label>
                    <select name="category_id" defaultValue={selectedTool.kategori} required className="modal-select-field">
                      <option value="">-- Pilih Kategori --</option>
                      <option value="Cultivator">Cultivator</option>
                      <option value="Traktor">Traktor</option>
                      <option value="Bajak">Bajak</option>
                      {categories.map((cat) => (
                        <option key={cat.id_kategori} value={cat.id_kategori}>
                          {cat.nama_kategori}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Stok Alat *</label>
                    <input name="stock" type="number" defaultValue={selectedTool.stock} required />
                  </div>
                </div>
                <div className="form-group">
                  <label>Harga Sewa Harian (Angka) *</label>
                  <input name="price" type="number" defaultValue={selectedTool.harga_sewa_hari} required />
                </div>

                <div className="form-group">
                  <label>Ganti Foto Alat</label>
                  <input name="foto_alat" type="file" accept="image/*" className="modal-select-field" style={{ padding: "6px" }} />
                  {selectedTool.foto_alat && (
                    <p style={{ fontSize: "12px", color: "#666", marginTop: "4px" }}>Foto saat ini aktif tersedia</p>
                  )}
                </div>

                <div className="form-group">
                  <label>Deskripsi Alat</label>
                  <textarea name="desc" defaultValue={selectedTool.deskripsi} placeholder="Tulis deskripsi singkat..."></textarea>
                </div>

                <div className="form-group">
                  <label>Fitur Keunggulan Alat</label>
                  <textarea name="features" defaultValue={selectedTool.fitur_alat} placeholder="Fitur keunggulan..."></textarea>
                </div>

                <div className="form-group">
                  <label>Fasilitas / Layanan Sewa</label>
                  <textarea name="facilities" defaultValue={selectedTool.fasilitas_penyewaan} placeholder="Layanan sewa..."></textarea>
                </div>
              </div>
              
              <div className="form-section">
                <div className="form-row">
                  <div className="form-group">
                    <label>Manufaktur/Brand</label>
                    <input name="brand" type="text" defaultValue={getSpecValue(selectedTool.spesifikasi_alat, "Manufaktur")} />
                  </div>
                  <div className="form-group">
                    <label>Model</label>
                    <input name="model" type="text" defaultValue={getSpecValue(selectedTool.spesifikasi_alat, "Model")} />
                  </div>
                </div>
                <div className="form-group">
                  <label>Status Alat</label>
                  <select name="status" defaultValue={selectedTool.status_alat}>
                    <option value="1">Tersedia</option>
                    <option value="0">Disewa / Habis</option>
                  </select>
                </div>
              </div>
              <div className="modal-actions">
                <button type="submit" className="btn-submit" disabled={uploading}>
                  {uploading ? "Menyimpan Gambar..." : "Simpan Perubahan"}
                </button>
                <button type="button" className="btn-batal" onClick={() => setIsEditModalOpen(false)}>Batal</button>
              </div>
            </form>
          </div>
        </div>
      )}
      <footer className="footer-spacer"></footer>
    </div>
  );
};

export default AdminPeralatan;
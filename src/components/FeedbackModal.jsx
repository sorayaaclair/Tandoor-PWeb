import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient'; 
import '../styles/FeedbackModal.css';

function FeedbackModal({ isOpen, onClose, session }) {
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [kategori, setKategori] = useState('Masukan Umum');
  const [pesan, setPesan] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!pesan) {
      alert("Harap tuliskan pesan ulasan Anda.");
      return;
    }

    try {
      setSubmitting(true);

      // SINKRONISASI DATA LANGSUNG KE TABEL SUPABASE feedback (tanpa nama & email agar langsung menilai)
      const { error } = await supabase
        .from('feedback')
        .insert([
          {
            rating: rating,
            kategori: kategori,
            pesan: pesan
          }
        ]);

      if (error) throw error;

      setIsSubmitted(true);

    } catch (err) {
      console.error("Gagal mengirim feedback ke Supabase:", err.message);
      alert("Gagal mengirim masukan: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleResetAndClose = () => {
    setPesan('');
    setKategori('Masukan Umum');
    setRating(5);
    setIsSubmitted(false);
    onClose();
  };

  const ratingDescriptions = {
    1: 'Sangat Buruk',
    2: 'Buruk',
    3: 'Cukup Baik',
    4: 'Baik',
    5: 'Sangat Baik'
  };

  return (
    <div className="feedback-modal-overlay" onClick={handleResetAndClose}>
      <div className="feedback-modal-content" onClick={(e) => e.stopPropagation()}>
        
        <div className="feedback-modal-header">
          <h2>Beri Masukan</h2>
          <button className="feedback-modal-close" onClick={handleResetAndClose}>
            &times;
          </button>
        </div>

        {!isSubmitted ? (
          <form className="feedback-modal-body" onSubmit={handleSubmit}>
            
            {/* Input nama & email tersembunyi demi estetika UI/UX minimalis */}

            <div className="feedback-form-group">
              <label>Tingkat Kepuasan *</label>
              <div className="star-rating-container">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    className="star-btn"
                    onClick={() => setRating(star)}
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                  >
                    <svg 
                      viewBox="0 0 24 24" 
                      className={(hoverRating || rating) >= star ? "star-active" : "star-inactive"}
                    >
                      <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                    </svg>
                  </button>
                ))}
                <span className="rating-text">
                  {ratingDescriptions[hoverRating || rating]}
                </span>
              </div>
            </div>

            <div className="feedback-form-group">
              <label>Kategori Masukan *</label>
              <select value={kategori} onChange={(e) => setKategori(e.target.value)}>
                <option value="Masukan Umum">Masukan Umum</option>
                <option value="Masalah Teknis">Masalah Teknis</option>
                <option value="Layanan Penyewaan">Layanan Penyewaan</option>
                <option value="Saran Fitur">Saran Fitur</option>
              </select>
            </div>

            <div className="feedback-form-group">
              <label>Pesan Ulasan *</label>
              <textarea 
                value={pesan} 
                onChange={(e) => setPesan(e.target.value)} 
                placeholder="Tuliskan masukan atau pengalaman Anda menggunakan Tandoor..."
                required
              />
            </div>

            <div className="feedback-modal-actions">
              <button type="button" className="feedback-btn-cancel" onClick={handleResetAndClose}>
                Batal
              </button>
              <button 
                type="submit" 
                className="feedback-btn-submit" 
                disabled={submitting}
              >
                {submitting ? "Mengirim..." : "Kirim Masukan"}
              </button>
            </div>
          </form>
        ) : (
          <div className="feedback-success-state">
            <div className="success-icon-wrapper">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <h3>Terima Kasih!</h3>
            <p>
              Masukan Anda berhasil dikirimkan. Ulasan Anda sangat berharga bagi kami untuk terus meningkatkan layanan Tandoor.
            </p>
            <button className="feedback-btn-ok" onClick={handleResetAndClose}>
              Selesai
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default FeedbackModal;
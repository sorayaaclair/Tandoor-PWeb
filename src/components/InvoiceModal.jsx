// src/components/InvoiceModal.jsx
import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import '../styles/InvoiceModal.css';

function InvoiceModal({ isOpen, onClose, rental, customerName }) {
  const [paymentInfo, setPaymentInfo] = useState(null);
  const [customerPhone, setCustomerPhone] = useState(null);

  useEffect(() => {
    if (isOpen && rental) {
      fetchAdditionalData();
    }
  }, [isOpen, rental]);

  const fetchAdditionalData = async () => {
    try {
      // Ambil data pembayaran
      if (rental.id_pembayaran) {
        const { data: bayarData } = await supabase
          .from('pembayaran')
          .select('metode_pembayaran, bukti_pembayaran')
          .eq('id_pembayaran', rental.id_pembayaran)
          .single();
        if (bayarData) setPaymentInfo(bayarData);
      }

      // Ambil nomor telepon customer
      if (rental.id_cust) {
        const { data: custData } = await supabase
          .from('customer')
          .select('telf_cust')
          .eq('id_cust', rental.id_cust)
          .single();
        if (custData && custData.telf_cust) {
          setCustomerPhone(`0${custData.telf_cust}`);
        }
      }
    } catch (err) {
      console.warn('[InvoiceModal] Gagal memuat data tambahan:', err.message);
    }
  };

  if (!isOpen || !rental) return null;

  const calculateDays = (start, end) => {
    if (!start || !end) return 1;
    const d1 = new Date(start);
    const d2 = new Date(end);
    const diff = Math.abs(d2 - d1);
    return Math.ceil(diff / (1000 * 60 * 60 * 24)) + 1;
  };

  const days = calculateDays(rental.tgl_sewa, rental.tgl_selesai);
  
  // Ongkir tetap Rp 100.000
  const deliveryFee = 100000;
  const grandTotal = rental.total_harga || 0;
  // Biaya sewa alat saja (grandTotal - deliveryFee), pastikan tidak negatif
  const totalRentalPrice = Math.max(0, grandTotal - deliveryFee);
  const pricePerDay = days > 0 ? Math.round(totalRentalPrice / days) : 0;

  const getStatusBadgeClass = (status) => {
    const code = Number(status);
    switch (code) {
      case 1: return "pending";
      case 2: return "dikirim";
      case 3: return "aktif";
      case 4: return "selesai";
      case 5: return "ditolak";
      case 6: return "dibatalkan";
      default: return "pending";
    }
  };

  const getStatusText = (status) => {
    const code = Number(status);
    switch (code) {
      case 1: return "Menunggu Konfirmasi";
      case 2: return "Dikirim";
      case 3: return "Aktif";
      case 4: return "Selesai";
      case 5: return "Ditolak";
      case 6: return "Dibatalkan";
      default: return "Menunggu Konfirmasi";
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const invoiceId = rental.id_penyewaan ? `INV-${rental.id_penyewaan.substring(0, 8).toUpperCase()}` : `INV-${rental.transaksi_id}`;

  return (
    <div className="invoice-overlay" onClick={onClose}>
      <div className="invoice-modal" onClick={(e) => e.stopPropagation()}>
        <button className="invoice-close-x" onClick={onClose}>&times;</button>
        
        <div className="invoice-header">
          <div className="invoice-logo">tandoor</div>
          <div className="invoice-title">Nota Penyewaan Alat</div>
          <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>
            ID Transaksi: {rental.id_penyewaan || rental.transaksi_id}
          </div>
        </div>

        <div className="invoice-details-grid">
          <div className="invoice-col">
            <div className="invoice-section-title">Penyewa</div>
            <p><strong>Nama:</strong> {customerName || "Pelanggan Tandoor"}</p>
            {customerPhone && <p><strong>Telepon:</strong> {customerPhone}</p>}
            <p style={{ wordBreak: 'break-all' }}><strong>Alamat Pengiriman:</strong> {rental.alamat_pengantaran || rental.alamat || "-"}</p>
          </div>
          <div className="invoice-col" style={{ textAlign: 'right' }}>
            <div className="invoice-section-title" style={{ textAlign: 'right' }}>Detail Nota</div>
            <p><strong>No. Nota:</strong> {invoiceId}</p>
            <p><strong>Tanggal Pesan:</strong> {rental.tgl_pesan || "-"}</p>
            <p>
              <strong>Status: </strong>
              <span className={`invoice-badge ${getStatusBadgeClass(rental.status_transaksi)}`}>
                {getStatusText(rental.status_transaksi)}
              </span>
            </p>
          </div>
        </div>

        <div className="invoice-table-wrapper">
          <table className="invoice-table">
            <thead>
              <tr>
                <th>Item Alat</th>
                <th style={{ textAlign: 'center' }}>Durasi</th>
                <th style={{ textAlign: 'right' }}>Harga Harian</th>
                <th style={{ textAlign: 'right' }}>Subtotal</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>{rental.nama_pertanian || rental.alat_disewa || rental.barang || "Alat Pertanian"}</td>
                <td style={{ textAlign: 'center' }}>{days} Hari<br/><small style={{ fontSize: '10px', color: '#64748b' }}>({rental.tgl_sewa} s/d {rental.tgl_selesai})</small></td>
                <td style={{ textAlign: 'right' }}>Rp {pricePerDay.toLocaleString('id-ID')}</td>
                <td style={{ textAlign: 'right' }}>Rp {totalRentalPrice.toLocaleString('id-ID')}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="invoice-summary-box">
          <div className="invoice-summary-row">
            <span>Subtotal Sewa Alat:</span>
            <span>Rp {totalRentalPrice.toLocaleString('id-ID')}</span>
          </div>
          <div className="invoice-summary-row">
            <span>Tarif Pengiriman Armada:</span>
            <span>Rp {deliveryFee.toLocaleString('id-ID')}</span>
          </div>
          <div className="invoice-summary-row total">
            <span>Total Bayar:</span>
            <span>Rp {grandTotal.toLocaleString('id-ID')}</span>
          </div>
          {(() => {
            // Mapping metode pembayaran: bisa dari tabel pembayaran (integer) atau dari tabel penyewaan (integer)
            const getMetodePembayaranText = (code) => {
              const c = Number(code);
              switch (c) {
                case 1: return "Transfer Bank";
                case 2: return "E-Wallet";
                case 3: return "COD (Bayar di Tempat)";
                default: return `Metode ${code}`;
              }
            };

            const metodeRaw = paymentInfo?.metode_pembayaran || rental?.metode_pembayaran;
            if (!metodeRaw) return null;

            return (
              <div className="invoice-summary-row" style={{ marginTop: '6px', paddingTop: '6px', borderTop: '1px dashed #e2e8f0' }}>
                <span>Metode Pembayaran:</span>
                <span style={{ fontWeight: '600' }}>{getMetodePembayaranText(metodeRaw)}</span>
              </div>
            );
          })()}
        </div>

        {rental.catatan_tambahan && (
          <div style={{ background: '#f8fafc', padding: '10px 15px', borderRadius: '8px', fontSize: '11px', color: '#475569', marginBottom: '20px', borderLeft: '3px solid #1a4d2e', textAlign: 'left' }}>
            <strong>Catatan Pengiriman:</strong> "{rental.catatan_tambahan}"
          </div>
        )}

        {rental.alasan_ditolak && Number(rental.status_transaksi) === 5 && (
          <div style={{ background: '#fdf2f2', padding: '10px 15px', borderRadius: '8px', fontSize: '11px', color: '#b91c1c', marginBottom: '20px', borderLeft: '3px solid #b91c1c', textAlign: 'left' }}>
            <strong>Alasan Ditolak Admin:</strong> "{rental.alasan_ditolak}"
          </div>
        )}

        <div className="invoice-footer">
          <button className="invoice-btn-print" onClick={handlePrint}>Cetak Nota</button>
          <button className="invoice-btn-close" onClick={onClose}>Tutup</button>
        </div>
      </div>
    </div>
  );
}

export default InvoiceModal;

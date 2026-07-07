import { createClient } from '@supabase/supabase-js';

// Mengambil URL dan Anon Key dari environment variables Vite
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Inisialisasi client Supabase
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Helper untuk memperbarui stok barang secara otomatis di katalog_alat berdasarkan transisi status transaksi.
 * Status dialokasikan (mengurangi stok): 2 (Dikirim), 3 (Aktif)
 * Status tidak dialokasikan (mengembalikan stok): 1 (Pending), 4 (Selesai), 5 (Ditolak), 6 (Dibatalkan)
 */
export const adjustStock = async (namaAlat, prevStatus, newStatus) => {
  if (!namaAlat || namaAlat === "Alat Pertanian") return;

  const isAllocated = (status) => [2, 3].includes(Number(status));
  const wasAllocated = isAllocated(prevStatus);
  const willBeAllocated = isAllocated(newStatus);

  let stockDiff = 0;
  if (!wasAllocated && willBeAllocated) {
    stockDiff = -1; // Kurangi stok
  } else if (wasAllocated && !willBeAllocated) {
    stockDiff = 1; // Kembalikan stok
  }

  if (stockDiff !== 0) {
    try {
      const { data: tool, error: fetchError } = await supabase
        .from("katalog_alat")
        .select("id_alat, stock")
        .eq("nama_alat", namaAlat)
        .limit(1);

      if (!fetchError && tool && tool.length > 0) {
        const targetTool = tool[0];
        const newStock = Math.max(0, (targetTool.stock || 0) + stockDiff);
        
        const { error: updateError } = await supabase
          .from("katalog_alat")
          .update({ stock: newStock })
          .eq("id_alat", targetTool.id_alat);

        if (updateError) throw updateError;
        console.log(`[adjustStock] Berhasil memperbarui stok ${namaAlat} (${targetTool.id_alat}): dari ${targetTool.stock} ke ${newStock}`);
      } else {
        console.warn(`[adjustStock] Alat dengan nama "${namaAlat}" tidak ditemukan di database.`);
      }
    } catch (err) {
      console.error("[adjustStock] Kesalahan saat memperbarui stok:", err.message);
    }
  }
};
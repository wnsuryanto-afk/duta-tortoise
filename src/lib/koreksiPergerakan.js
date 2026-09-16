/**
 * koreksiPergerakan.js — SATU definisi "batalkan satu pergerakan stok".
 *
 * ── KENAPA ADA ─────────────────────────────────────────────────────
 *
 * Pergerakan stok masuk lewat tiga pintu, dan salah satunya adalah kamera:
 * Ambil Barang membaca foto/barcode lalu langsung menulis StockMovement,
 * memotong current_stock, dan memotong sisa batch. Kalau pembacaannya
 * meleset — barang yang salah, jumlah yang salah — tidak ada satu pun
 * tombol di halaman Pergerakan Stok untuk membatalkannya.
 *
 * Tab Riwayat Pakan punya tombol hapus lengkap dengan pengembalian stok.
 * Tab Pergerakan Stok gudang tidak punya apa pun. Baris yang sama, dua
 * perlakuan berbeda — dan yang tanpa tombol justru yang diisi kamera.
 *
 * ── YANG HARUS IKUT DIKEMBALIKAN ───────────────────────────────────
 *
 * Satu pengambilan menyentuh TIGA angka: baris pergerakannya,
 * `current_stock` barangnya, dan `jumlah_sisa` batchnya. Mengembalikan
 * dua dari tiga menghasilkan barang yang stok gudangnya benar tapi sisa
 * batchnya kurang — dua angka untuk satu barang, dan yang salah tidak
 * akan pernah ketahuan karena keduanya tetap "masuk akal".
 *
 * ── KAPAN STOK MEMANG BERGERAK ─────────────────────────────────────
 *
 * Hanya pada status `selesai` dan `disetujui`. Baris `menunggu_approval`
 * dan `ditolak` belum pernah menyentuh stok, jadi membatalkannya TIDAK
 * boleh mengembalikan apa pun — kalau dikembalikan, stok justru bertambah
 * dari transaksi yang tidak pernah terjadi.
 */

/** Status yang berarti angka stok sudah benar-benar bergerak. */
const STATUS_BERGERAK = new Set(["selesai", "disetujui"]);

function angka(nilai) {
  const n = Number(nilai);
  return Number.isFinite(n) ? n : 0;
}

/** Apakah baris ini sudah menggerakkan angka stok? */
export function sudahMenggerakkanStok(mov) {
  return STATUS_BERGERAK.has(mov?.status || "selesai");
}

/**
 * Berapa yang harus ditambahkan ke current_stock untuk mengembalikan
 * keadaan. Masuk → dikurangi lagi; keluar → dikembalikan.
 */
export function pengembalian(mov) {
  if (!sudahMenggerakkanStok(mov)) return 0;
  const q = angka(mov?.quantity);
  return mov?.type === "masuk" ? -q : q;
}

/** Kalimat konfirmasi yang menyebut persis apa yang akan berubah. */
export function pesanKonfirmasi(mov, { adaBatch } = {}) {
  const arah = mov?.type === "masuk" ? "masuk" : "keluar";
  const inti = `Hapus pergerakan ${arah} ${angka(mov?.quantity)} ${mov?.unit || ""} ${mov?.item_name || ""}?`;
  if (!sudahMenggerakkanStok(mov)) {
    return `${inti}\n\nBaris ini belum pernah menggerakkan stok (status ${mov?.status}), jadi angka stok tidak akan berubah.`;
  }
  return (
    `${inti}\n\nStok ${mov?.item_name || "barang"} akan dikembalikan ` +
    `${pengembalian(mov) >= 0 ? "+" : ""}${pengembalian(mov)} ${mov?.unit || ""}` +
    (adaBatch ? ", dan sisa batchnya ikut dikembalikan." : ".")
  );
}

/**
 * Batalkan satu pergerakan: kembalikan stok barang, kembalikan sisa batch
 * bila ada, lalu hapus barisnya.
 *
 * Urutannya sengaja: angka dulu, baris terakhir. Kalau pengembalian stok
 * gagal di tengah jalan, barisnya masih ada sebagai jejak — lebih baik
 * daripada baris hilang tapi stok tidak pernah kembali.
 *
 * @param base44   klien entity
 * @param mov      baris StockMovement
 * @param daftar   { pakan: FeedStock[], gudang: WarehouseItem[], batch: BatchBarang[] }
 * @returns {{ stokDikembalikan: boolean, batchDikembalikan: boolean }}
 */
export async function batalkanPergerakan(base44, mov, daftar = {}) {
  const hasil = { stokDikembalikan: false, batchDikembalikan: false };
  const delta = pengembalian(mov);

  if (delta !== 0) {
    const pakan = mov?.item_type === "feedstock";
    const sumber = pakan ? daftar.pakan : daftar.gudang;
    const entity = pakan ? base44.entities.FeedStock : base44.entities.WarehouseItem;
    const item = (sumber || []).find((i) => i.id === mov.item_id);
    if (item) {
      await entity.update(mov.item_id, {
        current_stock: Math.max(0, angka(item.current_stock) + delta),
        last_edited_by: "sistem (pembatalan pergerakan)",
        last_edited_at: new Date().toISOString(),
      });
      hasil.stokDikembalikan = true;
    }

    // Batch hanya ada pada pengambilan gudang lewat Ambil Barang.
    const batch = mov?.batch_id
      ? (daftar.batch || []).find((b) => b.id === mov.batch_id)
      : null;
    if (batch) {
      await base44.entities.BatchBarang.update(batch.id, {
        jumlah_sisa: Math.max(0, angka(batch.jumlah_sisa) + delta),
      });
      hasil.batchDikembalikan = true;
    }
  }

  await base44.entities.StockMovement.delete(mov.id);
  return hasil;
}

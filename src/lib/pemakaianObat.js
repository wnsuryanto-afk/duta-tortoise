/**
 * pemakaianObat.js — obat yang diberikan ke kura akhirnya mengurangi stok.
 *
 * ── Cacat 1: stok obat hanya pernah NAIK ─────────────────────────────────────
 *
 * Layar catatan kesehatan punya pemilih obat lengkap: mencari dari gudang,
 * menampilkan sisa stok, menghitung biaya, bahkan menolak menyimpan bila
 * jumlahnya melebihi stok (`hasOverStock`). Yang tidak pernah terjadi hanyalah
 * pengurangan stoknya. `HealthForm.handleSubmit` menyimpan `treatment_items` ke
 * dalam HealthRecord, membuat catatan keuangan, lalu berhenti.
 *
 * Tidak ada satu pun jalur di seluruh aplikasi — peramban maupun server — yang
 * mengurangi `WarehouseItem.current_stock` karena pengobatan.
 *
 * Akibatnya angka stok obat hanya bisa naik, dan itulah yang membuat gudang
 * terbaca 505 ampul Vitamin B dan 22 ampul Oxytocin: seluruh pembelian
 * tercatat, tidak satu pun pemakaian. Penjaga `hasOverStock` pun jadi hiasan —
 * ia membandingkan dengan angka yang tidak pernah turun, jadi tidak akan pernah
 * benar-benar menahan apa pun.
 *
 * Skema StockMovement bahkan sudah menyediakan tempatnya sejak awal:
 * `keperluan: "pengobatan_kura"` dan `tortoise_code`. Mekanismenya dirancang,
 * lalu tidak pernah disambungkan.
 *
 * ── Cacat 2: biaya obat dicatat dua kali ─────────────────────────────────────
 *
 * Aplikasi ini mencatat biaya saat BARANG DIBELI — dua puluh pembelian yang ada
 * semuanya sudah masuk laba rugi begitu barangnya diterima. Lalu
 * `HealthForm` membuat catatan pengeluaran KEDUA saat obat itu diberikan,
 * sebesar `quantity × purchase_price`. Rupiah yang sama keluar dua kali dari
 * pembukuan.
 *
 * Belum terlihat di data karena belum ada satu pun catatan kesehatan yang
 * memakai pemilih obat — jadi ini diperbaiki sebelum sempat merusak apa pun,
 * bukan sesudah.
 *
 * Aturan yang dipakai sekarang:
 *
 *   · Obat dari GUDANG  → stok berkurang, biayanya dicatat pada kuranya sebagai
 *                          atribusi, TIDAK menjadi pengeluaran baru. Uangnya
 *                          sudah keluar saat membeli.
 *   · Biaya diketik MANUAL tanpa obat gudang → obat beli dadakan di luar stok;
 *                          menjadi pengeluaran, dan tidak ada stok yang
 *                          dikurangi.
 */

import { base44 } from "@/api/base44Client";

export const KEPERLUAN = "pengobatan_kura";

/** Peta item_id → jumlah, dari daftar treatment_items. */
function petaJumlah(items = []) {
  const peta = new Map();
  for (const it of items || []) {
    if (!it?.item_id) continue;
    peta.set(it.item_id, (peta.get(it.item_id) || 0) + Number(it.quantity || 0));
  }
  return peta;
}

/**
 * Selisih pemakaian antara catatan LAMA dan BARU.
 *
 * Ini bagian yang paling mudah salah. Menyimpan ulang catatan yang sudah ada
 * tidak boleh memotong stok untuk kedua kalinya, dan mengurangi jumlah obat
 * pada catatan yang sudah tersimpan harus MENGEMBALIKAN selisihnya.
 *
 * `delta` positif berarti obat terpakai lagi (stok berkurang sebanyak itu),
 * negatif berarti obat dikembalikan ke gudang.
 */
export function selisihPemakaian(itemsLama = [], itemsBaru = []) {
  const lama = petaJumlah(itemsLama);
  const baru = petaJumlah(itemsBaru);
  const rincian = new Map();

  for (const [id, jml] of baru) rincian.set(id, jml - (lama.get(id) || 0));
  for (const [id, jml] of lama) if (!baru.has(id)) rincian.set(id, -jml);

  const hasil = [];
  for (const [item_id, delta] of rincian) {
    if (delta === 0) continue;
    const contoh = (itemsBaru || []).find((x) => x.item_id === item_id)
      || (itemsLama || []).find((x) => x.item_id === item_id)
      || {};
    hasil.push({
      item_id,
      delta,
      item_name: contoh.item_name || "",
      item_sku: contoh.item_sku || "",
      unit: contoh.unit || "",
      unit_price: Number(contoh.unit_price || 0),
    });
  }
  return hasil;
}

/**
 * Apakah catatan ini menghasilkan pengeluaran BARU?
 *
 * Hanya bila biayanya tidak berasal dari obat gudang. Obat gudang sudah
 * dibiayakan saat dibeli — mencatatnya lagi di sini menghitung rupiah yang
 * sama dua kali.
 */
export function menjadiPengeluaran(record) {
  if (!record) return false;
  if (Number(record.biaya_obat || 0) <= 0) return false;
  if (!["sakit", "obat"].includes(record.type)) return false;
  return (record.treatment_items || []).length === 0;
}

/**
 * Terapkan pemakaian obat ke stok gudang.
 *
 * Untuk setiap selisih dibuat satu StockMovement (jejak yang bisa ditelusuri
 * dan sudah dipakai layar Pergerakan Stok) lalu stok barangnya disesuaikan.
 *
 * Dikembalikan `{ diterapkan, gagal }`. Kegagalan sebagian DILAPORKAN, tidak
 * ditelan: stok yang meleset diam-diam adalah persis cacat yang sedang
 * diperbaiki di sini.
 */
export async function terapkanPemakaianObat({ record, itemsLama, itemsBaru, user, tandaUji }) {
  const selisih = selisihPemakaian(itemsLama, itemsBaru);
  if (selisih.length === 0) return { diterapkan: 0, gagal: [] };

  let diterapkan = 0;
  const gagal = [];
  const tanggal = record?.date || new Date().toISOString().slice(0, 10);

  for (const s of selisih) {
    try {
      const daftar = await base44.entities.WarehouseItem.filter({ id: s.item_id });
      const barang = (daftar || [])[0];
      if (!barang) {
        gagal.push(`${s.item_name || s.item_id}: barang gudang tidak ditemukan`);
        continue;
      }

      const stokSekarang = Number(barang.current_stock || 0);
      const stokBaru = Math.max(0, stokSekarang - s.delta);

      await base44.entities.StockMovement.create({
        item_id: s.item_id,
        item_type: "warehouse",
        item_name: s.item_name || barang.name,
        item_sku: s.item_sku || barang.sku || "",
        // Delta negatif berarti obat kembali ke gudang — dicatat sebagai
        // pergerakan "masuk" supaya riwayatnya terbaca apa adanya.
        type: s.delta > 0 ? "keluar" : "masuk",
        quantity: Math.abs(s.delta),
        unit: s.unit || barang.unit || "",
        unit_price: s.unit_price || Number(barang.purchase_price || 0),
        total_value: Math.abs(s.delta) * (s.unit_price || Number(barang.purchase_price || 0)),
        stock_after: stokBaru,
        keperluan: KEPERLUAN,
        tortoise_code: record?.tortoise_name || "",
        by_email: user?.email || "sistem",
        by_name: user?.full_name || user?.email || "sistem",
        date: tanggal,
        status: "selesai",
        notes:
          s.delta > 0
            ? `Pengobatan ${record?.tortoise_name || "kura"}`
            : `Koreksi catatan pengobatan ${record?.tortoise_name || "kura"} — obat dikembalikan`,
        ...(tandaUji || {}),
      });

      await base44.entities.WarehouseItem.update(s.item_id, { current_stock: stokBaru });
      diterapkan++;
    } catch (e) {
      gagal.push(`${s.item_name || s.item_id}: ${e?.message || "gagal"}`);
    }
  }

  return { diterapkan, gagal };
}

/** Kembalikan seluruh obat sebuah catatan ke gudang — dipakai saat catatan dihapus. */
export async function kembalikanPemakaianObat({ record, user, tandaUji }) {
  return terapkanPemakaianObat({
    record,
    itemsLama: record?.treatment_items || [],
    itemsBaru: [],
    user,
    tandaUji,
  });
}

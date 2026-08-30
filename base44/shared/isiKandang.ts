/**
 * Satu cara menyegarkan `current_count` kandang — sisi backend.
 *
 * Kembarannya di frontend ada di src/lib/enclosureCount.js, dan aturan
 * hitungnya sama dengan src/lib/kandang.js (hitungIsiKandang) serta
 * recalculateAllEnclosures.
 *
 * ── Kenapa HITUNG ULANG, bukan tambah/kurang satu ──
 *
 * Tiga fungsi backend dulu menyegarkan angka ini dengan
 * `current_count - 1` / `+ 1`. Pola itu benar hanya kalau setiap kejadian
 * dijalankan tepat sekali, selamanya. Kenyataannya sebuah penjualan bisa
 * menyentuh dua fungsi sekaligus (createSaleWithSync dan onSaleCreated), dan
 * kesalahannya tidak pernah terkoreksi sendiri: sekali meleset, angkanya
 * meleset permanen sampai ada yang menjalankan penghitungan ulang manual.
 *
 * Menghitung ulang bersifat idempoten. Dijalankan dua kali hasilnya sama;
 * dilewatkan sekali, pemanggilan berikutnya membetulkannya.
 *
 * ── Dua jebakan yang sudah pernah terjadi ──
 *
 * 1. `Enclosure.get(tortoise.enclosure)` — `enclosure` berisi NAMA ("W1"),
 *    sedangkan `get()` mencari berdasarkan id. Pencariannya tidak pernah
 *    ketemu, jadi penyegarannya gagal diam-diam tanpa galat apa pun.
 * 2. Daftar putih status ['aktif','baby','sakit','breeding','karantina'].
 *    Status baru yang ditambahkan ke skema diam-diam hilang dari hitungan.
 *    Karena itu di sini dipakai daftar status yang KELUAR.
 */

import { diPeternakan } from "./kura.ts";

const BATAS = 2000;

function namaSama(a: any, b: any): boolean {
  return String(a || "").trim().toLowerCase() === String(b || "").trim().toLowerCase();
}

/**
 * Hitung ulang isi kandang dari data kura yang sebenarnya.
 *
 * @param db      base44.asServiceRole
 * @param names   Nama kandang yang ingin disegarkan; kosongkan untuk semua.
 * @returns       { diperbarui, diperiksa } — atau { error } bila data terpotong.
 */
export async function segarkanIsiKandang(
  db: any,
  names: string[] | null = null,
): Promise<{ diperbarui: number; diperiksa: number; error?: string }> {
  const target = Array.isArray(names) ? names.filter(Boolean).map((n) => String(n).trim().toLowerCase()) : null;

  const [enclosures, tortoises] = await Promise.all([
    db.entities.Enclosure.list("name", BATAS),
    db.entities.Tortoise.list("-created_date", BATAS),
  ]);

  // Data yang terpotong menghasilkan angka yang terlalu kecil untuk SETIAP
  // kandang, dan kesalahannya menetap di basis data. Lebih baik tidak menulis.
  if ((tortoises || []).length >= BATAS) {
    return {
      diperbarui: 0,
      diperiksa: 0,
      error: `Jumlah kura menyentuh batas ${BATAS}. Penghitungan dihentikan supaya tidak menyimpan angka yang terpotong.`,
    };
  }

  let diperbarui = 0;
  let diperiksa = 0;
  for (const enc of enclosures || []) {
    if (target && !target.includes(String(enc.name || "").trim().toLowerCase())) continue;
    diperiksa += 1;

    // Cocokkan lewat NOMOR kandang; nama hanya untuk kura yang nomornya belum
    // terisi. Mencocokkan lewat nama saja membuat seluruh penghuni sebuah
    // kandang lepas begitu kandangnya diganti nama.
    const count = (tortoises || []).filter(
      (t: any) =>
        diPeternakan(t) &&
        (t.enclosure_id ? t.enclosure_id === enc.id : namaSama(t.enclosure, enc.name)),
    ).length;

    if (count !== (enc.current_count || 0)) {
      await db.entities.Enclosure.update(enc.id, { current_count: count });
      diperbarui += 1;
    }
  }
  return { diperbarui, diperiksa };
}

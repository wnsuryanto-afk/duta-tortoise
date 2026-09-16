/**
 * ukuran.ts — SATU definisi "berapa ukuran kura ini menurut riwayatnya".
 *
 * Dipakai bersama oleh automation onMeasurementSaved dan sapuan mingguan
 * sinkronProfilKura. Keduanya menjawab pertanyaan yang sama, jadi keduanya
 * harus memakai aturan yang sama persis.
 *
 * ── ATURANNYA: PER KOLOM, BUKAN PER BARIS ──────────────────────────
 *
 * Godaan pertama adalah "ambil baris sah paling akhir, salin semuanya".
 * Itu salah, dan salahnya menghapus data:
 *
 *   B116  22 Mei 2026   —      / 50 cm     ← baris paling akhir
 *   B116  16 Jul 2025   19,9 kg /  —
 *
 * Kiper hari itu hanya mengukur panjangnya. Menyalin baris paling akhir
 * bulat-bulat membuat berat B116 jadi KOSONG, padahal beratnya tercatat
 * dengan baik di baris sebelumnya. Satu penimbangan yang tidak lengkap
 * menghapus penimbangan yang lengkap.
 *
 * Jadi setiap kolom diambil dari baris sah TERAKHIR YANG MENGISI KOLOM
 * ITU. Berat dari penimbangan terakhir yang benar-benar menimbang;
 * panjang dari pengukuran terakhir yang benar-benar mengukur.
 *
 * Berat di profil dipakai DosisKalkulator untuk membagi dosis obat.
 * Kolom kosong membuatnya menolak menghitung — aman, tapi berarti kura
 * itu tidak bisa diobati lewat aplikasi sampai ditimbang ulang.
 */
import { masukLaporan } from "./laporan.ts";

export type Ukuran = {
  weight_grams: number | null;
  shell_length_cm: number | null;
  last_weighed_date: string | null;
};

function angka(v: any): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

/** Urut dari yang paling baru; tanggal dulu, waktu tulis sebagai pemutus. */
function terbaruDulu(a: any, b: any): number {
  const ta = String(a?.date || "");
  const tb = String(b?.date || "");
  if (ta !== tb) return ta < tb ? 1 : -1;
  return String(b?.created_date || "").localeCompare(String(a?.created_date || ""));
}

/**
 * Ukuran kura menurut riwayatnya. Baris yang dikecualikan atau bertanda
 * data uji tidak ikut dihitung sama sekali.
 *
 * Mengembalikan null pada kolom yang memang tidak pernah terisi — itu
 * jujur, dan lebih baik daripada menahan angka lama yang sudah dinyatakan
 * salah oleh pemiliknya.
 */
export function ukuranDariRiwayat(riwayat: any[] = []): Ukuran {
  const sah = (riwayat || []).filter(masukLaporan).slice().sort(terbaruDulu);
  const adaBerat = sah.find((m) => angka(m?.weight_grams) > 0);
  const adaPanjang = sah.find((m) => angka(m?.shell_length_cm) > 0);
  return {
    weight_grams: adaBerat ? angka(adaBerat.weight_grams) : null,
    shell_length_cm: adaPanjang ? angka(adaPanjang.shell_length_cm) : null,
    // Tanggal diambil dari baris sah paling akhir apa pun isinya: kura itu
    // memang disentuh hari itu, dan kolom ini menjawab "sudah berapa lama
    // tidak diperiksa", bukan "kapan terakhir ditimbang beratnya".
    last_weighed_date: sah[0]?.date || null,
  };
}

/** Beda yang layak disebut. null vs 0 vs "" tidak dihitung sebagai beda. */
export function bedaAngka(a: any, b: any): boolean {
  const na = angka(a), nb = angka(b);
  if (na === 0 && nb === 0) return false;
  return Math.abs(na - nb) > 0.001;
}

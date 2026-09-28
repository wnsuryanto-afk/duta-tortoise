import { base44 } from "@/api/base44Client";

/**
 * kueriUang.js — satu kunci cache untuk seluruh tabel FinanceTransaction.
 *
 * ── Kenapa berkas ini ada ──────────────────────────────────────────────────
 *
 * Ada tiga belas tempat di aplikasi ini yang menjalankan panggilan yang sama
 * persis — `FinanceTransaction.list("-date")` — di bawah tiga belas queryKey
 * yang berbeda. Artinya tiga belas salinan tabel yang sama di dalam cache,
 * masing-masing dengan staleTime sendiri, masing-masing kedaluwarsa pada
 * saat yang berlainan.
 *
 * Selama tiap salinan dipakai di halaman yang berbeda, akibatnya cuma boros.
 * Yang tidak bisa dibiarkan adalah ketika dua salinan tampil di SATU layar:
 * lencana "Laba 2026" di kepala beranda pemilik dan kartu "Keuangan 2026"
 * sepuluh sentimeter di bawahnya menjumlahkan tabel yang sama dengan rumus
 * yang sama. Kalau salinannya dua, keduanya bisa menyebut angka berbeda
 * selama beberapa menit setiap kali salah satunya menyegarkan lebih dulu —
 * dan tidak ada apa pun di layar yang menjelaskan kenapa.
 *
 * Tiga pemakai di beranda pemilik kini memakai kunci yang sama di bawah ini,
 * jadi TanStack Query menyimpannya sekali dan memberikan larik yang sama
 * kepada ketiganya. Sepuluh pemakai lain di halaman-halaman terpisah belum
 * dipindahkan; itu pekerjaan tersendiri dan tidak mendesak selama mereka
 * tidak pernah tampil berdampingan.
 *
 * ── Tanpa batas eksplisit ──────────────────────────────────────────────────
 *
 * Pembungkus di api/base44Client.js memakai BATAS_AMBIL dan memperingatkan
 * saat hasilnya pas di batas. Limit eksplisit yang lebih kecil mematikan
 * penjagaan itu tanpa suara — sudah pernah terjadi di sebelas layar uang.
 */

/** Kunci cache bersama. Tidak bergantung tahun: kuerinya menarik semuanya. */
export const KUNCI_UANG = ["uang-semua"];

/** Seluruh FinanceTransaction, terbaru dulu. */
export function ambilUang() {
  return base44.entities.FinanceTransaction.list("-date");
}

/** Setelan kueri siap pakai, supaya staleTime-nya pun tidak bercabang. */
export const kueriUang = {
  queryKey: KUNCI_UANG,
  queryFn: ambilUang,
  staleTime: 5 * 60 * 1000,
};

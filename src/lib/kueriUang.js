import { base44 } from "@/api/base44Client";
import { hanyaLaporan } from "@/lib/laporan";

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
 *
 * ── Kenapa penyaringan laporan ada DI SINI ────────────────────────────────
 *
 * Ditambahkan 30-09-2026. Berkas ini punya tiga pemakai: lencana "Laba
 * <tahun>" dan kartu ringkasan di beranda pemilik, layar Ringkasan Pagi, dan
 * kartu "Keuangan <tahun>" (LabaRugiWidget). Dua yang pertama menyaring
 * sendiri dengan `.filter(masukLaporan)`. LabaRugiWidget TIDAK.
 *
 * Akibatnya persis seperti yang berkas ini dibuat untuk mencegah, hanya pada
 * sumbu yang berbeda: dua angka dari tabel yang sama, di layar yang sama,
 * berselisih. Lencana "Laba 2026" mengeluarkan baris yang ditandai pemilik;
 * kartu "Omzet tahun 2026" sepuluh sentimeter di bawahnya memasukkannya.
 *
 * Yang dipertaruhkan bukan angka kecil. Per 30-09-2026 ada tiga baris
 * bertanda `excluded_from_reports`, dan salah satunya PEMASUKAN sebesar
 * Rp 9.522.500 — penjualan yang sengaja dikeluarkan pemilik dari laporan.
 * Itu ikut terhitung di omzet tahunan yang tampil di beranda.
 *
 * Disaring di sini, bukan di tiap pemakai, karena itulah gunanya berkas ini:
 * satu jawaban untuk satu pertanyaan. `.filter(masukLaporan)` di dua pemakai
 * lain dibiarkan — menyaring dua kali tidak mengubah hasilnya, dan
 * membuangnya berarti mereka bergantung diam-diam pada berkas ini.
 */

/** Kunci cache bersama. Tidak bergantung tahun: kuerinya menarik semuanya. */
export const KUNCI_UANG = ["uang-semua"];

/**
 * FinanceTransaction yang boleh masuk laporan, terbaru dulu.
 *
 * Baris bertanda `is_test_data` atau `excluded_from_reports` dibuang di sini
 * — lihat catatan di atas. Layar yang memang perlu melihat baris yang
 * dikecualikan (mis. Laporan Keuangan dengan tombol ExcludeToggle-nya)
 * memakai kuerinya sendiri, bukan yang ini.
 */
export function ambilUang() {
  return base44.entities.FinanceTransaction.list("-date").then(hanyaLaporan);
}

/** Setelan kueri siap pakai, supaya staleTime-nya pun tidak bercabang. */
export const kueriUang = {
  queryKey: KUNCI_UANG,
  queryFn: ambilUang,
  staleTime: 5 * 60 * 1000,
};

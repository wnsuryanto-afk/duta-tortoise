/**
 * kunciSetelan.js — SATU baris CompanySettings, tujuh kunci cache, satu tempat
 * untuk menyegarkan semuanya.
 *
 * ── Kenapa berkas ini ada ───────────────────────────────────────────────────
 *
 * Seluruh aplikasi membaca SATU baris: `CompanySettings` dengan
 * `setting_key: "main"`. Tetapi baris itu diambil lewat tujuh kunci cache yang
 * berbeda, karena setiap layar baru dulu membuat kuncinya sendiri:
 *
 *     company-settings            10 pembaca (OwnerDashboard, useTestMode, …)
 *     company-settings-main       15 pembaca (useCompanySettings — slip gaji,
 *                                 KOP surat, nilai poin, persetujuan SOP)
 *     company-settings-main-all   PengaturanPoinPage
 *     company-settings-keadaan    useKeadaanJadwal
 *     company-settings-musim      TreatmentPage
 *     company-settings-hpp        PengaturanHPP
 *     company-settings-cost       hitungan biaya per ekor
 *
 * Nama-nama itu TAMPAK seperti susunan bertingkat, dan di situ jebakannya:
 * TanStack Query mencocokkan kunci per BAGIAN, bukan per awalan teks.
 * `["company-settings"]` tidak pernah cocok dengan `["company-settings-main"]`
 * — keduanya satu bagian, dan teksnya berbeda. Jadi menyegarkan yang satu
 * tidak menyegarkan yang lain, sama sekali.
 *
 * ── Yang benar-benar terjadi (6 Oktober 2026) ───────────────────────────────
 *
 * Delapan layar menyimpan baris ini, dan TIDAK SATU PUN menyegarkan ketujuh
 * kunci. Tiga akibat yang bisa ditunjuk:
 *
 *   · HRPage menyimpan identitas perusahaan — nama, alamat, logo, nama
 *     direktur — lalu menyegarkan `company-settings` saja. Padahal KOP surat,
 *     slip gaji, dan laporan gaji membacanya lewat `useCompanySettings()`,
 *     yaitu kunci `-main`. Nama perusahaan yang baru disimpan TIDAK muncul di
 *     slip gaji sampai halaman dimuat ulang dari awal.
 *
 *   · PengaturanPoinPage menyimpan `nilai_per_poin` lalu menyegarkan `-main`
 *     dan `-main-all`. OwnerDashboard membacanya lewat `company-settings`
 *     dengan `staleTime` 15 menit DAN `refetchInterval: false` — jadi angka
 *     rupiah bonus di beranda pemilik tetap dihitung dengan nilai poin yang
 *     LAMA, dan tidak ada yang memberi tahu.
 *
 *   · PengaturanHPP menyimpan `hpp_fallback_per_ekor` lalu menyegarkan `-hpp`
 *     dan `-cost`; `useCostPerTortoise` membacanya lewat `company-settings`.
 *     Biaya per ekor — yang dipakai menghitung HPP dan harga jual — tetap
 *     memakai angka lama. Sebaliknya FinancePage menyimpan field yang sama dan
 *     hanya menyegarkan `company-settings`, jadi layar PengaturanHPP yang
 *     menampilkannya ikut tertinggal.
 *
 * Tidak ada galat di satu pun kasus. Yang terjadi hanya angka yang sudah
 * diganti tetap tampil seperti sebelum diganti — jenis cacat yang paling lama
 * tidak ketahuan, karena satu-satunya gejalanya adalah orang yang menyimpan
 * dua kali lalu menyangka dirinya salah ingat.
 *
 * ── Aturannya ───────────────────────────────────────────────────────────────
 *
 * Siapa pun yang MENULIS CompanySettings memanggil `segarkanSetelan(qc)`,
 * bukan menyusun daftar `invalidateQueries` sendiri. Penjaga `cek-kunci`
 * memeriksa dua hal: setiap penulis memakai fungsi ini, dan setiap kunci
 * `["company-settings…"]` yang ada di kode tercatat di daftar bawah ini.
 * Kunci baru yang lupa didaftarkan membuat penjaga merah, bukan membuat satu
 * layar diam-diam tertinggal.
 */

/** Setiap kunci cache yang memuat baris CompanySettings "main". */
export const KUNCI_SETELAN = [
  "company-settings",
  "company-settings-main",
  "company-settings-main-all",
  "company-settings-keadaan",
  "company-settings-musim",
  "company-settings-hpp",
  "company-settings-cost",
];

/** Kunci yang dipakai `useCompanySettings()` — satu-satunya bentuk objek. */
export const KUNCI_UTAMA = "company-settings-main";

/**
 * Segarkan SEMUA pembaca CompanySettings setelah barisnya disimpan.
 *
 * @param {{invalidateQueries: Function}} qc QueryClient dari useQueryClient()
 */
export function segarkanSetelan(qc) {
  if (!qc?.invalidateQueries) return;
  for (const kunci of KUNCI_SETELAN) {
    qc.invalidateQueries({ queryKey: [kunci] });
  }
}

export default segarkanSetelan;

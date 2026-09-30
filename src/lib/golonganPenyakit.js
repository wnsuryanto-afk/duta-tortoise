/**
 * golonganPenyakit.js — nama dan warna golongan penyakit, di satu tempat.
 *
 * ── Kenapa berkas ini ada ──────────────────────────────────────────────────
 *
 * Dua tetapan ini tinggal di dalam berkas HALAMAN `PanduanPenyakitPage.jsx`
 * dan diimpor dari sana oleh dua berkas lain — halaman rinciannya dan
 * formulir protokol diagnosis. Selama halamannya tidak pernah pindah, itu
 * tidak apa-apa.
 *
 * Halaman itu pindah pada 30 September 2026, saat panduan penyakit disatukan
 * jadi tab di Catatan Sakit — dan build langsung gagal:
 *
 *   Could not resolve "./PanduanPenyakitPage" from "PanduanPenyakitDetailPage.jsx"
 *
 * Lint tidak melihatnya; build yang melihat. Pelajarannya sama persis dengan
 * `calcAgeCategory` yang sempat tinggal di berkas komponen: data bersama yang
 * dititipkan di berkas layar akan menahan layar itu di tempatnya, atau patah
 * ketika layarnya pindah. Sekarang ia tinggal di pustaka, dan tidak ada lagi
 * berkas layar yang menjadi tempat bergantung.
 */

export const CATEGORY_CONFIG = {
  infeksi_bakteri: { label: "Infeksi Bakteri", color: "bg-red-100 text-red-700 border-red-200" },
  infeksi_jamur:  { label: "Infeksi Jamur",   color: "bg-purple-100 text-purple-700 border-purple-200" },
  parasit:        { label: "Parasit",          color: "bg-orange-100 text-orange-700 border-orange-200" },
  nutrisi:        { label: "Nutrisi",          color: "bg-green-100 text-green-700 border-green-200" },
  reproduksi:     { label: "Reproduksi",       color: "bg-pink-100 text-pink-700 border-pink-200" },
  trauma:         { label: "Trauma",           color: "bg-amber-100 text-amber-700 border-amber-200" },
  organ:          { label: "Organ",            color: "bg-indigo-100 text-indigo-700 border-indigo-200" },
  pernapasan:     { label: "Pernapasan",       color: "bg-cyan-100 text-cyan-700 border-cyan-200" },
  pencernaan:     { label: "Pencernaan",       color: "bg-lime-100 text-lime-700 border-lime-200" },
  mata:           { label: "Mata",             color: "bg-blue-100 text-blue-700 border-blue-200" },
  kulit:          { label: "Kulit",            color: "bg-teal-100 text-teal-700 border-teal-200" },
  lainnya:        { label: "Lainnya",          color: "bg-muted text-foreground border-border" },
};

export const SEVERITY_CONFIG = {
  ringan:  { label: "Ringan",  color: "bg-green-100 text-green-700 border-green-300" },
  sedang:  { label: "Sedang",  color: "bg-yellow-100 text-yellow-700 border-yellow-300" },
  berat:   { label: "Berat",   color: "bg-orange-100 text-orange-700 border-orange-300" },
  kritis:  { label: "Kritis",  color: "bg-red-100 text-red-700 border-red-300" },
};


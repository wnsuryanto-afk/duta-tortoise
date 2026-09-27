/**
 * judulTugas.js — memisahkan APA YANG DIKERJAKAN dari keterangannya.
 *
 * Judul tugas di peternakan ini menampung tiga hal sekaligus dalam satu baris:
 * pekerjaannya, jadwalnya, dan peringatannya.
 *
 *     "Mandikan kura + cek (1 hari 1 kandang, BERGILIR)"
 *     "Pupuk kandang kolam azolla (2 minggu sekali, 1 karung/kolam)"
 *     "Kebersihan jalan area kandang (2 bulan sekali, bulan ganjil)"
 *     "Vitamin Reproduksi 1 sdm (15g) - SEMUA kura BETINA (menggantikan
 *      kalsium/vitE/folavit terpisah utk betina)"
 *
 * Diukur pada 37 tugas yang aktif: 89% memakai tanda kurung, panjang rata-rata
 * 44 huruf, terpanjang 106. Di lebar kartu ponsel (~34 huruf per baris),
 * **30 dari 37 judul melipat lebih dari satu baris** — dan keeper membaca
 * daftar itu belasan kali sehari sambil berdiri di kandang.
 *
 * Yang dilakukan di sini BUKAN memotong keterangan. Semua katanya tetap
 * ditampilkan, hanya dipindah ke baris kedua yang lebih kecil, supaya mata
 * menangkap pekerjaannya dulu. Sesudah dipisah, tinggal 4 dari 37 yang pokoknya
 * masih melipat.
 *
 * Judulnya sendiri tidak diubah di basis data. Mengubah 37 judul adalah
 * keputusan pemilik, bukan keputusan yang boleh diambil diam-diam oleh layar
 * yang menampilkannya.
 */

/** Pemisah yang menandai "mulai dari sini keterangan", bukan pekerjaan. */
const AWAL_KETERANGAN = /\s+[-–—]\s+|\s*\(/;

/**
 * Pecah satu judul jadi `{ pokok, catatan }`.
 *
 * `pokok` adalah pekerjaannya; `catatan` adalah sisanya, sudah dibersihkan dari
 * kurung dan tanda hubung yang menggantung, dan bagian-bagiannya dirangkai
 * dengan titik tengah supaya terbaca sebagai daftar pendek.
 *
 * Judul tanpa keterangan dikembalikan apa adanya dengan `catatan` kosong —
 * "Siram tanaman" tidak perlu diapa-apakan.
 */
export function pisahJudulTugas(judul) {
  const teks = String(judul || "").trim();
  if (!teks) return { pokok: "", catatan: "" };

  const m = AWAL_KETERANGAN.exec(teks);
  if (!m || m.index === 0) return { pokok: teks, catatan: "" };

  const pokok = teks.slice(0, m.index).trim();
  // Pokok yang terlalu pendek biasanya tanda pemisahnya salah tempat —
  // "Cuci rumput / sayuran rempesan (pagi)" tidak boleh jadi pokok "Cuci".
  if (pokok.length < 6) return { pokok: teks, catatan: "" };

  const sisa = teks.slice(m.index);
  const catatan = sisa
    // setiap kurung dan tanda hubung pemisah jadi batas potongan
    .split(/[()[\]]|\s+[-–—]\s+/)
    .map((b) => b.trim().replace(/^[,;·]+|[,;·]+$/g, "").trim())
    .filter(Boolean)
    .join(" · ");

  return { pokok, catatan };
}

/** Judul yang ditampilkan bila hanya tersedia satu baris (mis. pada notifikasi). */
export function pokokJudulTugas(judul) {
  return pisahJudulTugas(judul).pokok;
}

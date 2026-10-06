/**
 * usulPoinInisiatif.js — AI MENGUSULKAN poin Inisiatif; manusia yang memutuskan.
 *
 * ── Kenapa usulan, bukan penilaian otomatis ────────────────────────────────
 *
 * Angka ini adalah penilaian atas pekerjaan seseorang. Bonus poin peternakan
 * MENYALA (`poin_bonus_enabled: true`, Rp 50 per poin), jadi niat angkanya
 * memang uang — meski jalur poin Inisiatif hari ini berhenti di layar "Poin
 * Saya" dan belum sampai ke slip gaji (lihat catatan di laporan tanggal
 * 6 Oktober 2026).
 *
 * Ada jarak besar antara "AI mengisikan angka supaya penilai tidak mulai dari
 * kosong" dan "AI yang menilai kerja orang". Yang pertama menghapus pekerjaan
 * membosankan; yang kedua memindahkan penilaian ke sesuatu yang tidak bisa
 * dimintai pertanggungjawaban oleh orang yang dinilainya.
 *
 * Jadi fungsi di sini hanya menyiapkan USULAN beserta alasannya. Penyetuju
 * tetap menekan tombolnya, dan tetap bisa mengubah angkanya. Satu ketukan,
 * bukan nol ketukan — dan itu disengaja.
 *
 * ── Kenapa keluaran AI tidak dipercaya apa adanya ──────────────────────────
 *
 * Model bahasa akan dengan senang hati menjawab 12 ketika pilihannya hanya
 * 0/5/10/15, menjawab "sepuluh", menjawab 10000, atau menjawab null. Ketiganya
 * pernah terjadi di tempat lain pada aplikasi ini — teks "null" yang lolos
 * pemeriksaan kebenaran sampai mematikan satu halaman penuh.
 *
 * `bacaUsul()` karena itu TIDAK memakai angka yang dikembalikan model sebagai
 * poin. Ia memilih angka TERDEKAT dari daftar pilihan yang benar-benar
 * diizinkan peternakan. Apa pun yang dijawab model, yang keluar dari sini
 * selalu salah satu dari pilihan itu.
 */

/** Skema jawaban yang diminta dari model. */
export const SKEMA_USUL = {
  type: "object",
  properties: {
    poin: { type: "number", description: "Usulan poin, harus salah satu dari pilihan yang diberikan" },
    alasan: { type: "string", description: "Satu kalimat pendek dalam Bahasa Indonesia, menyebut apa yang dikerjakan dan kira-kira berapa lama" },
    keyakinan: { type: "string", enum: ["tinggi", "sedang", "rendah"] },
  },
  required: ["poin", "alasan"],
};

/**
 * Prompt penilai. Pilihan poin dan batasnya ikut dikirim supaya model menilai
 * dengan aturan peternakan ini, bukan dengan aturan yang dikarangnya sendiri.
 */
export function promptUsulPoin({ judul, catatan = "", opsi = [], maks = 0, terpakai = 0, adaFoto = false }) {
  const daftar = (opsi || []).join(", ");
  const sisa = Math.max(0, Number(maks) - Number(terpakai));
  return [
    "Anda membantu menilai pekerjaan INISIATIF di sebuah peternakan kura-kura sulcata di Probolinggo.",
    "Inisiatif = pekerjaan di luar checklist harian yang dikerjakan sendiri oleh kiper, lalu dicatat untuk dinilai.",
    "",
    `Pekerjaan: "${String(judul || "").trim()}"`,
    catatan ? `Catatan kiper: "${String(catatan).trim()}"` : "",
    "",
    `Pilihan poin yang SAH hanya: ${daftar}. Jawab dengan salah satu angka itu, bukan angka lain.`,
    "",
    adaFoto
      ? "Foto bukti pekerjaan ini dilampirkan. Pakai foto itu untuk memperkirakan besar pekerjaannya. Bila foto jelas TIDAK menunjukkan pekerjaan yang disebut, usulkan poin terkecil dan keyakinan \"rendah\", dan katakan di alasan."
      : "Tidak ada foto bukti, jadi penilaian hanya dari judul dan catatan. Turunkan keyakinan satu tingkat karena itu.",
    "",
    "Pedoman, berdasarkan perkiraan waktu dan beratnya:",
    "- Pekerjaan sangat ringan atau sudah termasuk tugas rutin: poin terkecil.",
    "- Di bawah 30 menit, tenaga ringan: poin kecil.",
    "- 30 menit sampai 2 jam, atau perlu tenaga/keahlian: poin menengah.",
    "- Di atas 2 jam, berat, atau memperbaiki sesuatu yang rusak: poin terbesar.",
    "",
    "Pekerjaan perbaikan (menambal bocor, memperbaiki kran, menguras kolam) biasanya",
    "lebih berharga daripada pekerjaan mengangkut atau merapikan dengan durasi sama,",
    "karena menghindarkan kerusakan yang lebih besar.",
    "",
    `Sisa kuota orang ini hari ini ${sisa} poin dari batas ${maks}. Ini HANYA keterangan;`,
    "tetap usulkan poin yang pantas menurut pekerjaannya — pemotongan kuota diurus terpisah.",
    "",
    "Jawab JSON: poin (angka dari daftar sah), alasan (satu kalimat Bahasa Indonesia,",
    "menyebut apa yang dikerjakan dan kira-kira berapa lama), keyakinan (tinggi/sedang/rendah).",
    "Bila judulnya terlalu kabur untuk dinilai, pakai poin terkecil dan keyakinan \"rendah\".",
  ].filter(Boolean).join("\n");
}

/** Angka terdekat dari daftar pilihan. Seri dimenangkan yang lebih kecil. */
export function poinTerdekat(nilai, opsi = []) {
  const daftar = (opsi || []).map(Number).filter((n) => Number.isFinite(n) && n >= 0);
  if (daftar.length === 0) return 0;
  const urut = [...daftar].sort((a, b) => a - b);
  const n = Number(nilai);
  if (!Number.isFinite(n)) return urut[0];
  let pilih = urut[0];
  let jarak = Math.abs(n - pilih);
  for (const k of urut) {
    const j = Math.abs(n - k);
    if (j < jarak) { pilih = k; jarak = j; }
  }
  return pilih;
}

/**
 * Baca jawaban model menjadi usulan yang aman dipakai layar.
 *
 * @returns {{poin:number, alasan:string, keyakinan:string, dibetulkan:boolean}}
 *   `dibetulkan` true bila angka yang dijawab model bukan salah satu pilihan
 *   yang sah — layar menampilkannya apa adanya, karena usulan yang diam-diam
 *   digeser adalah usulan yang tidak bisa dipercaya penilainya.
 */
export function bacaUsul(hasil, opsi = []) {
  const mentah = hasil?.poin;
  const poin = poinTerdekat(mentah, opsi);
  /*
    `typeof mentah === "number"` lebih dulu, dan itu bukan kerewelan.

    `Number(null)` dan `Number("")` keduanya 0, dan 0 biasanya ADA di daftar
    pilihan. Tanpa pemeriksaan tipe, model yang menjawab null atau string
    kosong terbaca sebagai "mengusulkan 0 dengan sah" — padahal ia tidak
    mengusulkan apa pun. Penilai lalu melihat usulan 0 yang tampak meyakinkan.

    Ini pola yang sama dengan teks "null" yang pernah lolos pemeriksaan
    kebenaran di aplikasi ini sampai mematikan satu halaman penuh.
  */
  const angkaSah = typeof mentah === "number"
    && Number.isFinite(mentah)
    && (opsi || []).map(Number).includes(mentah);
  const alasan = String(hasil?.alasan ?? "").trim();
  const keyakinan = ["tinggi", "sedang", "rendah"].includes(hasil?.keyakinan) ? hasil.keyakinan : "rendah";
  return {
    poin,
    alasan: alasan || "AI tidak memberi alasan — periksa sendiri sebelum memakai.",
    keyakinan: alasan ? keyakinan : "rendah",
    dibetulkan: !angkaSah,
  };
}

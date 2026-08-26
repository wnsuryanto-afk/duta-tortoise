/**
 * statusKura.js — aturan perpindahan status kura.
 *
 * Ada tiga tempat berbeda yang menandai kura sembuh: layar keeper, panel tutup
 * kasus di Rekam Kesehatan, dan formulir catatan kesehatan. Ketiganya menulis
 * `status: "aktif"` secara harfiah.
 *
 * Akibatnya kura **baby** yang sakit lalu sembuh berubah jadi **aktif** dan
 * tidak pernah kembali jadi baby. Klasifikasi itu ikut dipakai menghitung
 * populasi baby di beranda dan menentukan perlakuan hariannya, jadi yang hilang
 * bukan sekadar label.
 *
 * Skema entitas sudah menyediakan `previous_status` untuk keperluan ini —
 * hanya saja baru dipakai oleh TortoiseForm.
 */

/** Status yang masuk akal untuk kura yang masih hidup dan ada di peternakan. */
const STATUS_HIDUP = ["aktif", "baby", "breeding"];

/**
 * Status yang seharusnya dipakai setelah kura dinyatakan sembuh.
 *
 * Mengembalikan status sebelum sakit bila masih masuk akal. "sakit" sendiri
 * tidak pernah dikembalikan (itu yang baru saja diakhiri), begitu pula status
 * yang berarti kura sudah tidak dirawat lagi — mati, terjual, diarsipkan —
 * karena memulihkannya akan menghidupkan kembali data yang sudah ditutup.
 *
 * @param {object} kura data kura, atau objek apa pun yang membawa previous_status
 * @returns {string}
 */
export function statusSetelahSembuh(kura) {
  const sebelumnya = kura?.previous_status;
  return STATUS_HIDUP.includes(sebelumnya) ? sebelumnya : "aktif";
}

/**
 * Perubahan yang harus ditulis saat kura ditandai sembuh.
 *
 * Dikumpulkan di satu tempat supaya kedua penanda sakit — `status` dan
 * `is_currently_sick` — tidak pernah dibersihkan sebagian. Keduanya dibaca di
 * belasan tempat dengan pola `status === "sakit" || is_currently_sick`, jadi
 * satu saja yang tertinggal membuat kura tampak sakit selamanya di separuh
 * aplikasi.
 */
export function perubahanSembuh(kura, tanggal) {
  return {
    is_currently_sick: false,
    status: statusSetelahSembuh(kura),
    last_status_change: tanggal || new Date().toISOString().split("T")[0],
  };
}

/**
 * Perubahan yang harus ditulis saat kura ditandai sakit.
 *
 * `previous_status` hanya disimpan bila status sekarang bukan "sakit", supaya
 * laporan sakit kedua kalinya tidak menimpa status asli dengan "sakit" —
 * yang akan membuat kura tidak pernah bisa kembali ke status semula.
 */
export function perubahanSakit(kura, tanggal) {
  const sekarang = kura?.status;
  return {
    is_currently_sick: true,
    status: "sakit",
    previous_status: sekarang && sekarang !== "sakit" ? sekarang : kura?.previous_status,
    last_status_change: tanggal || new Date().toISOString().split("T")[0],
  };
}

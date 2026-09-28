import { selisihHari, tanggalHariIni } from "@/lib/safeDate";

/**
 * bonusTertunda.js — bonus yang sudah dijanjikan tetapi belum dibayar.
 *
 * ── Kenapa berkas ini ada ──────────────────────────────────────────────────
 *
 * Pada 3 September 2026 dibuat dua baris BonusReward: ganti rugi tiga hari
 * (13-15 Agustus) saat aplikasi mati dan checklist tidak bisa dikirim. Angkanya
 * dihitung dari MEDIAN poin harian masing-masing orang, alasannya ditulis
 * panjang lebar di kolom catatan, dan dibuat atas permintaan pemilik sendiri.
 *
 *   Angsolo       363 poin   Rp 27.225
 *   Sholehuddin   456 poin   Rp 34.200
 *
 * Dua puluh lima hari kemudian keduanya masih `status: "pending"`.
 *
 * Bukan karena disembunyikan. BonusReward memang ditampilkan — di tab "KPI &
 * Poin", sebagai daftar pasif yang dikelompokkan per karyawan, lengkap dengan
 * tombol "tandai dibayar". Tetapi daftar yang harus SENGAJA DICARI bukan
 * pengingat. Tidak ada satu pun tempat yang berkata "ada Rp 61.425 yang sudah
 * dijanjikan dan belum keluar".
 *
 * Ini pola yang sama dengan beberapa temuan lain: PrinterConfig yang diisi lalu
 * tidak pernah dibaca, kunci panen azolla yang dipasang dengan niat dibuka lagi,
 * RempesanLog yang punya halaman lengkap dan nol catatan. Alatnya ada, niatnya
 * ada — yang tidak ada adalah sesuatu yang membawanya kembali ke perhatian.
 *
 * Yang membedakan yang satu ini: ia uang milik orang tertentu, yang sudah
 * dijanjikan dengan alasan tertulis.
 */

/** Data uji tidak pernah berarti uang yang harus dibayar. */
function nyata(r) {
  return r && r.is_test_data !== true && r.excluded_from_reports !== true && r.is_sample !== true;
}

/**
 * Bonus yang menunggu dibayar.
 *
 * Baris ber-`bonus_amount` nol TIDAK ikut: tidak ada yang bisa dibayarkan, dan
 * menagih nol rupiah hanya akan membuat daftarnya diabaikan. Baris seperti itu
 * biasanya catatan poin yang belum sempat dinilai rupiahnya — itu pekerjaan
 * lain, bukan pembayaran yang tertunda.
 *
 * @param {Array} rewards BonusReward
 * @param {string} hariIni "YYYY-MM-DD"; default hari ini menurut jam setempat
 */
export function bonusTertunda(rewards = [], hariIni = tanggalHariIni()) {
  return (rewards || [])
    .filter(nyata)
    .filter((r) => r?.status === "pending")
    .filter((r) => Number(r?.bonus_amount) > 0)
    .map((r) => {
      // Umur dihitung dari kapan barisnya DIBUAT, bukan dari periodenya.
      // Bonus untuk periode Agustus yang baru dibuat kemarin belum terlambat;
      // yang dibuat awal September dan masih menggantung, sudah.
      const dibuat = String(r.created_date || "").slice(0, 10);
      const umur = selisihHari(dibuat, hariIni);
      return {
        id: r.id,
        nama: r.employee_name || r.employee_email || "(tanpa nama)",
        email: r.employee_email || "",
        periode: r.period || "",
        poin: Number(r.total_points) || 0,
        rupiah: Number(r.bonus_amount) || 0,
        alasan: r.reward_description || "",
        dibuat,
        umurHari: Number.isFinite(umur) && umur >= 0 ? umur : null,
      };
    })
    .sort((a, b) => (b.umurHari ?? -1) - (a.umurHari ?? -1) || b.rupiah - a.rupiah);
}

/** Ringkasan sekali lihat: berapa orang, berapa rupiah, yang tertua berapa hari. */
export function ringkasBonusTertunda(daftar = []) {
  const orang = new Set(daftar.map((b) => b.email || b.nama));
  const umur = daftar.map((b) => b.umurHari).filter((n) => Number.isFinite(n));
  return {
    jumlah: daftar.length,
    orang: orang.size,
    rupiah: daftar.reduce((s, b) => s + b.rupiah, 0),
    umurTertua: umur.length > 0 ? Math.max(...umur) : null,
  };
}

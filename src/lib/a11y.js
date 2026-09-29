/**
 * a11y.js — penolong kecil untuk hal yang bisa ditekan.
 *
 * ── Kenapa berkas ini ada ──────────────────────────────────────────────────
 *
 * Audit desain 29 September menemukan 14 tempat di mana sesuatu yang bisa
 * ditekan ditulis sebagai `<div onClick>`. Tiga hal hilang setiap kali:
 *
 *   1. Tombol Tab tidak pernah singgah di sana — pengurus yang memakai
 *      keyboard (dan pembaca layar, yang berjalan di atas fokus yang sama)
 *      tidak bisa mencapainya sama sekali.
 *   2. Enter dan Spasi tidak melakukan apa pun, karena div bukan tombol.
 *   3. Pembaca layar menyebutnya "grup", bukan "tombol" — jadi tidak ada
 *      satu pun tanda bahwa benda itu bisa ditekan.
 *
 * Obat yang benar untuk SEBAGIAN BESAR kasus adalah `<button type="button">`
 * sungguhan: ia sudah membawa ketiganya tanpa satu baris tambahan. Itulah
 * yang dipakai di sepuluh dari empat belas tempat tadi.
 *
 * Empat sisanya TIDAK BISA jadi <button>, dan bukan karena malas: di dalamnya
 * sudah ada tombol lain (tombol hapus di baris notifikasi, tombol "Pilih" di
 * daftar grup WhatsApp). HTML melarang tombol di dalam tombol — browser akan
 * membongkar susunannya diam-diam dan hasilnya lebih rusak daripada sebelum
 * diperbaiki. Untuk empat itu baris tetap <div>, dan penolong di bawah ini
 * memasang ketiga hal tadi dengan tangan.
 *
 * Pakai `propsTekan` HANYA kalau <button> benar-benar tidak mungkin.
 */

/**
 * Kembalikan atribut yang membuat elemen non-tombol berperilaku seperti tombol.
 *
 * @param {Function} onKlik  aksi yang dijalankan saat ditekan
 * @param {object} opsi
 * @param {boolean} opsi.aktif  kalau false, elemennya tidak bisa ditekan
 */
export function propsTekan(onKlik, { aktif = true } = {}) {
  if (!aktif || typeof onKlik !== "function") return {};
  return {
    role: "button",
    tabIndex: 0,
    onClick: onKlik,
    onKeyDown: (e) => {
      // Justru karena penolong ini HANYA dipakai di baris yang punya tombol
      // lain di dalamnya, penjaga ini wajib: tanpa dia, menekan Enter saat
      // fokus ada di tombol "Foto" akan menjalankan tombol Foto DAN aksi
      // barisnya sekaligus — keydown-nya naik ke baris. Untuk pemakai tetikus
      // masalah ini sudah dicegah `stopPropagation` di tiap tombol dalam; ini
      // pasangannya untuk keyboard.
      if (e.target !== e.currentTarget) return;
      // Enter dan Spasi adalah dua tombol yang dipakai <button> asli. Spasi
      // juga menggulung halaman, jadi harus ditahan — kalau tidak, menekan
      // baris dengan keyboard ikut melompatkan layar.
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        onKlik(e);
      }
    },
  };
}

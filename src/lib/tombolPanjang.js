/**
 * tombolPanjang.js — kelas untuk tombol yang labelnya berupa kalimat.
 *
 * ── Kenapa ini ada ──────────────────────────────────────────────────────
 *
 * Tombol bawaan (components/ui/button.jsx) memakai `whitespace-nowrap` dan
 * tinggi tetap `h-9`. Keduanya benar untuk label pendek: "Simpan" tidak
 * boleh patah dua baris, dan tinggi yang seragam membuat barisan tombol
 * rata.
 *
 * Tetapi banyak label di aplikasi ini berupa kalimat — "Jalankan Tagging
 * Data Test Lama", "Buka Pengaturan Poin & Simulasi", "Catat pesanan dari
 * screenshot". Pada lebar 280px, yaitu layar luar HP lipat saat terlipat,
 * kalimat-kalimat itu lebih panjang daripada kartu yang memuatnya. Karena
 * tidak boleh patah, yang terjadi bukan tombol yang melebar: tulisannya
 * DIPOTONG di tengah huruf, tanpa elipsis, tanpa tanda apa pun bahwa ada
 * yang hilang. Diukur 12 Okt 2026: enam tombol begitu di lima layar.
 *
 * Kelas ini membolehkannya patah, lalu melepas tinggi tetapnya supaya baris
 * kedua punya tempat. `min-h-9` menjaga tombol berlabel pendek tetap
 * setinggi tombol di sebelahnya, jadi tidak ada barisan yang jadi tidak
 * rata.
 *
 * Dipakai HANYA di tombol yang labelnya memang kalimat. Memasangnya di
 * semua tombol akan membuat "Simpan" boleh patah jadi "Sim-" / "pan" di
 * kotak yang kebetulan sempit — cacat yang lebih buruk daripada yang
 * sedang diperbaiki.
 */
export const TOMBOL_PANJANG = "whitespace-normal h-auto min-h-9 py-1.5 leading-tight";

export default TOMBOL_PANJANG;

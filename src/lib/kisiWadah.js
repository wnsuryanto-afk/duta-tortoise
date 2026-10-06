/**
 * kisiWadah — kisi yang membaca lebar WADAH, bukan lebar LAYAR.
 *
 * ── Kenapa berkas ini ada ───────────────────────────────────────────────────
 *
 * Titik henti Tailwind (`sm:`, `md:`, `lg:`) membaca lebar LAYAR. Komponen
 * yang hidup di dalam kolom sempit — panel sisi, kepala halaman, atau
 * aplikasi yang dibuka di panel pratinjau iPad — tetap memakai tata letak
 * "md" meskipun ruang yang benar-benar ada selebar ponsel.
 *
 * Akibatnya terukur: `grid-cols-2 md:grid-cols-4` di dalam wadah 320px
 * memberi empat kolom selebar 71px. Dikurangi bantalan kartu, tinggal 39px
 * untuk tulisan — dan "Total Aktivitas" terpotong di tengah huruf, tanpa
 * elipsis, tanpa jalan gulung. Pada 6 Oktober 2026 ada 54 tulisan terpotong
 * dari sebab yang sama persis di 14 layar.
 *
 * `repeat(auto-fit, minmax(…, 1fr))` tidak punya titik henti sama sekali: ia
 * membagi ruang yang BENAR-BENAR ada. Wadah 320px memberi dua kolom, wadah
 * 1000px memberi enam, dan tidak ada ukuran di antaranya yang memotong
 * tulisan.
 *
 * Dipakai sebagai `style`, bukan kelas, karena nilai minimumnya berbeda
 * per layar dan Tailwind tidak bisa menyusun kelas dari angka yang dihitung.
 */

/**
 * @param {number} minPx lebar minimum satu kolom sebelum kisi melipat
 * @returns {object} style untuk dipasang di elemen dengan className "grid"
 */
export function kisiWadah(minPx = 150) {
  return { gridTemplateColumns: `repeat(auto-fit, minmax(${minPx}px, 1fr))` };
}

/**
 * Sama, tetapi lubang di baris terakhir diisi ubin yang lebih kecil.
 * Dipakai RingkasanAngka, yang ubinnya boleh berukuran dua kolom.
 */
export function kisiWadahRapat(minPx = 150) {
  return { ...kisiWadah(minPx), gridAutoFlow: "dense" };
}

export default kisiWadah;

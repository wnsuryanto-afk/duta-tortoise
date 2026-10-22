/**
 * kunciBreeding.js — satu clutch, dua kunci cache, satu tempat menyegarkan.
 *
 * ── Cacat yang dilaporkan 22 Oktober 2026 ───────────────────────────────────
 *
 * "Pada saat telur disimpan, kadang-kadang gagal tercatat. Kadang bisa
 * tercatat, tetapi tidak berwarna hitam seperti yang seharusnya."
 *
 * Keduanya satu sebab, dan sebabnya ada di sini.
 *
 * Clutch dibaca lewat DUA kunci cache yang berbeda:
 *
 *     ["breedings"]                halaman daftar, beranda, pengingat menetas,
 *                                  peringkat indukan — 6 pembaca
 *     ["breeding-detail", id]      halaman rinci satu clutch — 1 pembaca
 *
 * EggGrid menyegarkan `["breedings"]` saja. TanStack Query mencocokkan kunci
 * per BAGIAN, dan `"breedings"` bukan `"breeding-detail"` — jadi di halaman
 * rinci, penyimpanan BERHASIL tetapi layarnya tidak pernah mengambil ulang
 * datanya. Telur yang baru ditandai tetap berwarna seperti sebelum ditandai.
 * Itu gejala yang kedua.
 *
 * Gejala yang pertama lahir dari gejala kedua, dan jauh lebih merusak.
 * EggGrid menyusun muatannya dari `breeding.egg_records` yang ADA DI LAYAR,
 * lalu mengirim SELURUH array-nya. Karena layar rinci tidak pernah segar,
 * array itu selamanya array yang pertama kali dimuat:
 *
 *     tandai telur #1 gagal  → kirim [#1 gagal, #2 belum, #3 belum, …]  ✓
 *     tandai telur #2 gagal  → kirim [#1 BELUM, #2 gagal, #3 belum, …]  ✗
 *
 * Penandaan kedua MENGEMBALIKAN yang pertama. Di halaman rinci, hanya satu
 * telur yang bisa bertahan — yang terakhir ditandai. Tidak ada galat, tidak
 * ada pesan; telur yang sudah ditandai hanya kembali kosong, dan orang yang
 * menandainya menyangka simpanannya gagal.
 *
 * Clutch di layar itu bertelur 6 September, candling-nya lewat H+30, dan
 * ke-25 telurnya masih "Belum Cek" — sesudah berkali-kali ditandai.
 *
 * ── Aturannya ───────────────────────────────────────────────────────────────
 *
 * Siapa pun yang MENULIS Breeding memanggil `segarkanBreeding(qc)`, bukan
 * menyusun daftar `invalidateQueries` sendiri. Penjaga `cek-kunci` memeriksa
 * keduanya: setiap penulis memakai fungsi ini, dan setiap kunci yang memuat
 * clutch terdaftar di bawah. Kunci baru yang lupa didaftarkan membuat penjaga
 * merah, bukan membuat satu layar diam-diam tertinggal.
 *
 * Bentuknya sengaja sama persis dengan kunciSetelan.js. Penyakitnya memang
 * sama — di sana tujuh kunci untuk satu baris CompanySettings, di sini dua
 * kunci untuk satu clutch — dan obat yang berbeda bentuk untuk penyakit yang
 * sama hanya menambah satu hal lagi yang harus diingat orang.
 */

/** Setiap kunci cache yang memuat baris Breeding. */
export const KUNCI_BREEDING = [
  "breedings",
  "breeding-detail",
];

/**
 * Segarkan SEMUA pembaca clutch.
 *
 * `["breeding-detail"]` tanpa id ikut mencocokkan `["breeding-detail", id]`
 * mana pun: TanStack mencocokkan dari depan, bagian demi bagian, jadi kunci
 * yang lebih pendek adalah awalan bagi yang lebih panjang. Itu berbeda dari
 * jebakan di kunciSetelan.js, yang awalan TEKS-nya mirip tetapi bagiannya
 * berbeda.
 */
export function segarkanBreeding(qc) {
  if (!qc) return;
  for (const kunci of KUNCI_BREEDING) qc.invalidateQueries({ queryKey: [kunci] });
}

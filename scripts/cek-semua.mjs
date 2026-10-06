/**
 * cek-semua.mjs — jalankan semua penjaga sekaligus.
 *
 * Semuanya lahir dari kesalahan nyata yang terjadi di aplikasi ini, dan
 * semuanya memeriksa hal yang TIDAK ditangkap oleh `vite build`:
 *
 *   cek-impor       fungsi pustaka dipakai tanpa di-import → komponen crash
 *                   saat dirender, build tetap hijau
 *   cek-kolom-hantu kolom ditulis tapi tidak ada di skema → datanya dibuang
 *   cek-temuan      penyangkalan dibaca sebagai masalah → "tidak ada luka"
 *                   masuk daftar merah, dan 40% kartu temuan berisi
 *                   kabar baik sehingga temuan sungguhan tenggelam
 *   cek-ronda       kandang berisi kura tidak punya ubin → kura di dalamnya
 *                   tidak punya jalur pencatatan pakan maupun kebersihan;
 *                   dan aplikasi usang yang tidak memperbaiki dirinya →
 *                   daftar kerja sehari penuh dibaca dari bundel lama
 *   cek-gaji        slip mingguan diterbitkan lagi di samping bulanan →
 *                   satu periode dibayar dua kali; dan peran yang digaji
 *                   kehilangan pintu ke slipnya sendiri saat modul gaji
 *                   digabung — penggabungan yang terlihat menyederhanakan
 *   cek-lebar       tulisan terpotong di tengah huruf pada layar 360px →
 *                   `line-clamp-1` bersama `whitespace-nowrap` di komponen
 *                   Select membuat elipsisnya tidak pernah muncul, jadi
 *                   setiap penyaring di aplikasi memotong tanpa tanda
 *   cek-rupiah      aturan menulis angka rupiah disalin ke berkas lain →
 *                   satu layar menyebut angka yang sama dengan bentuk
 *                   berbeda dari layar sebelahnya, dan salinan yang lupa
 *                   Number() mencetak "Rp 1500000" tanpa titik ribuan
 *   cek-modeuji     baris baru dibuat tanpa penanda Mode Uji → percobaan
 *                   pemilik tersimpan bertanda "BUKAN data uji" (kolomnya
 *                   default false) dan tidak bisa lagi dipisahkan dari
 *                   data sungguhan oleh laporan mana pun
 *   cek-pintu       pintu menu memakai section yang tidak dimiliki peran
 *                   mana pun → pintunya tidak pernah muncul, dan layar di
 *                   baliknya tidak pernah dibuka siapa pun
 *   cek-keyakinan   ai_confidence dibandingkan mentah-mentah → skala
 *                   pecahan vs persen tertukar, dan pesan untuk kiper
 *                   tersaring habis tanpa satu pun error
 *   cek-timbang     aturan "siapa perlu ditimbang" menjawab salah → kura
 *                   sakit terlewat, atau rotasi yang tak selesai kembali
 *   cek-batch       stok gudang berkurang tanpa menurunkan sisa batch →
 *                   dua angka untuk satu rak, keduanya masuk akal
 *   cek-fungsi      berkas fungsi yang dijalankan ≠ yang diedit → perbaikan
 *                   yang terlihat selesai tapi tidak pernah terpasang
 *   cek-kolom-baca  kolom dibaca tapi tidak ada di skema → filter nol baris,
 *                   alarm mati, dan laporan yang terlihat bersih
 *                   diam-diam, tanpa error
 *   cek-kepatuhan   angka kepatuhan SOP menjawab salah → bonus dan
 *                   kepercayaan kiper dihitung dari angka yang bocor
 *   cek-kembar      pustaka frontend dan kembaran backend-nya melenceng →
 *                   layar dan otomatisasi malam menjawab beda
 *   cek-unggah      UploadFile dikirimi Blob tanpa nama berkas → ditolak
 *                   server, dan dua pemakainya menelan errornya
 *   cek-laporan     angka uang yang ditampilkan tanpa menyaring penjualan
 *                   yang dikecualikan atau data Mode Uji
 *   cek-entitas     tabel yang dibaca tapi tak pernah ditulis (layar selalu
 *                   kosong), ditulis tapi tak pernah dibaca (data hilang), atau
 *                   menganggur menunggu ditulisi orang yang salah sangka
 *   cek-tataletak   angka ringkasan di kepala halaman yang tidak bisa diklik →
 *                   "Sakit 3" memunculkan pertanyaan lalu membiarkan orang
 *                   mencari sendiri halamannya; dan judul halaman yang
 *                   dibuat sendiri-sendiri alih-alih memakai PageHeader
 *   cek-boolean     kolom boolean diisi hasil `a || b` → nilainya salah satu
 *                   operandnya, bukan true/false; semua pembacanya memakai
 *                   `=== true`, jadi ia ditolak diam-diam dan spanduk
 *                   "profil belum lengkap" menempel selamanya
 *   cek-label       label kotak telur digambar sungguhan lalu diperiksa →
 *                   label 100×50 mm menutupi kotak telur yang bening sehingga
 *                   telurnya tidak kelihatan, perkiraan menetas tercetak lebih
 *                   kecil daripada nama induk (di versi termal tidak ada sama
 *                   sekali), dan nomor tray tidak pernah ikut tercetak
 *   cek-foto        gambar yang tidak bisa diketuk →  95 tempat menampilkan
 *                   gambar dan tidak satu pun bisa diperbesar; dialog foto SOP
 *                   memakai max-w-md sehingga foto tegak dari ponsel terpotong
 *                   tanpa cara memperbesar atau menggeser
 *   cek-kunci       satu kunci cache TanStack dipakai dengan dua bentuk data
 *                   → pembaca yang mengira array dan yang mengira objek
 *                   membaca tempat yang sama; yang terakhir mengisi cache
 *                   menentukan bentuknya, jadi salah satu selalu salah.
 *                   Ditemukan 06-10-2026: tiga layar mati total.
 *
 *   cek-penjaga     penjaga yang mengupas komentar sendiri → satu atribut
 *                   accept="image/*" membuatnya ikut memakan kode sesudahnya,
 *                   dan penjaganya hijau karena tidak pernah melihatnya
 *   eslint          variabel yang dipakai tapi tidak ada (no-undef). Halaman
 *                   Pembelian pernah mati karena satu sisa nama variabel di
 *                   daftar dependensi useMemo — build tetap hijau. Peringatan
 *                   ikut dihitung dengan langit-langit yang tidak boleh naik:
 *                   prop yang diterima lalu diabaikan bersembunyi di situ.
 *
 * Jalankan:  node scripts/cek-semua.mjs
 */
import { execFileSync } from "child_process";

// cek-render ditambahkan 03-09-2026. Lima penjaga sebelumnya memeriksa apakah
// kodenya SAH; tidak satu pun pernah MENJALANKANNYA. Penjaga baru ini merender
// komponen layar kiper, dan pada hari pertama langsung menemukan tombol yang
// melempar TypeError saat data user belum termuat.
const PENJAGA = ["cek-impor.mjs", "cek-kolom-hantu.mjs", "cek-kolom-baca.mjs", "cek-fungsi.mjs", "cek-batch.mjs", "cek-timbang.mjs", "cek-kepatuhan.mjs", "cek-kembar.mjs", "cek-unggah.mjs", "cek-entitas.mjs", "cek-batas.mjs", "cek-laporan.mjs", "cek-render.mjs", "cek-keyakinan.mjs", "cek-pintu.mjs", "cek-temuan.mjs", "cek-modeuji.mjs", "cek-rupiah.mjs", "cek-gaji.mjs", "cek-ronda.mjs", "cek-lebar.mjs", "cek-boolean.mjs", "cek-tataletak.mjs", "cek-penjaga.mjs", "cek-label.mjs", "cek-foto.mjs", "cek-kunci.mjs"];
let gagal = 0;

for (const p of PENJAGA) {
  process.stdout.write(`\n── ${p} ${"─".repeat(Math.max(0, 46 - p.length))}\n`);
  try {
    process.stdout.write(execFileSync("node", [`scripts/${p}`], { encoding: "utf8" }));
  } catch (e) {
    process.stdout.write(e.stdout || "");
    process.stderr.write(e.stderr || "");
    gagal++;
  }
}

// ESLint ikut dijalankan di sini, bukan berdiri sendiri — penjaga yang harus
// diingat orang untuk dijalankan terpisah adalah penjaga yang tidak dijalankan.
process.stdout.write(`\n── eslint ${"─".repeat(40)}\n`);

// `--quiet` hanya melihat ERROR. Peringatan dibiarkan lewat, dan di situ
// bersembunyi pola yang sudah berkali-kali jadi cacat nyata di aplikasi ini:
// prop yang diterima lalu diabaikan (nilai yang kelihatan bisa diklik tapi
// tidak melakukan apa-apa), dan sisa variabel yang menandai jalur yang dulu
// ada lalu dilupakan. Contohnya ditemukan 05-10-2026: `InfoRow` menerima
// `clickable` dan tidak pernah memakainya, dan FinancePage memanggil
// useQueryClient() yang tidak menyegarkan apa pun.
//
// Memperbaiki 101 peringatan sekaligus bukan perbaikan, itu pengeditan massal
// pada file yang tidak sedang dikerjakan. Jadi yang dijaga adalah ARAHNYA:
// angkanya boleh turun, tidak boleh naik. Turunkan BATAS_PERINGATAN setiap
// kali ada yang dibersihkan — penjaga ini akan memaksanya.
const BATAS_PERINGATAN = 101;

let keluaranEslint = "";
let eslintMelempar = false;
try {
  keluaranEslint = execFileSync("npx", ["eslint", "."], { encoding: "utf8", stdio: "pipe" });
} catch (e) {
  keluaranEslint = e.stdout || "";
  eslintMelempar = true;
}

// Baris ringkasan eslint: "✖ 102 problems (0 errors, 102 warnings)". Kedua
// angkanya dibaca dari DALAM tanda kurung. Mencocokkan "0 errors" di mana saja
// adalah jebakan: teks "10 errors" juga memuatnya, jadi sepuluh error akan
// terbaca sebagai nol.
const ringkasan = keluaranEslint.match(/\((\d+) errors?, (\d+) warnings?\)/);

if (!ringkasan) {
  // Tidak ada ringkasan: entah benar-benar bersih, entah eslint sendiri gagal
  // jalan. Keduanya tidak boleh dilaporkan sebagai lolos tanpa dilihat.
  if (eslintMelempar) {
    process.stdout.write(keluaranEslint || "eslint gagal dijalankan dan tidak mengeluarkan apa pun.\n");
    gagal++;
  } else if (BATAS_PERINGATAN > 0) {
    process.stdout.write(`Tidak ada temuan eslint sama sekali — turunkan BATAS_PERINGATAN di scripts/cek-semua.mjs menjadi 0.\n`);
    gagal++;
  } else {
    process.stdout.write("Tidak ada temuan eslint.\n");
  }
} else {
  const error = Number(ringkasan[1]);
  const peringatan = Number(ringkasan[2]);
  if (error > 0) {
    process.stdout.write(keluaranEslint);
    process.stdout.write(`\nGAGAL: ${error} error eslint.\n`);
    gagal++;
  } else if (peringatan > BATAS_PERINGATAN) {
    process.stdout.write(keluaranEslint);
    process.stdout.write(`\nGAGAL: peringatan eslint naik dari ${BATAS_PERINGATAN} ke ${peringatan}.\n`);
    gagal++;
  } else if (peringatan < BATAS_PERINGATAN) {
    process.stdout.write(`Tidak ada error. Peringatan turun ke ${peringatan} — turunkan BATAS_PERINGATAN di scripts/cek-semua.mjs menjadi ${peringatan}.\n`);
    gagal++;
  } else {
    process.stdout.write(`Tidak ada error eslint; ${peringatan} peringatan (batas ${BATAS_PERINGATAN}, tidak boleh naik).\n`);
  }
}

console.log(gagal === 0 ? "\nSemua penjaga lolos." : `\n${gagal} penjaga gagal.`);
process.exit(gagal ? 1 : 0);

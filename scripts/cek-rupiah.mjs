/**
 * cek-rupiah.mjs — aturan menulis angka rupiah hanya boleh tinggal di
 * satu berkas.
 *
 * ── Kenapa penjaga ini ada ──────────────────────────────────────────
 *
 * `src/lib/rupiah.js` sudah ada sejak lama, lengkap dengan penjelasan
 * panjang tentang kenapa satu salinan lebih baik daripada dua. Saat
 * penjaga ini ditulis, TEPAT SATU berkas mengimpornya. Lima puluh
 * lima berkas lain menulis ulang aturannya sendiri — dengan empat nama
 * berbeda (`formatRp`, `fmt`, `rp`, `rupiah`, `fmtRp`, `formatRpLocal`)
 * dan tiga perilaku berbeda:
 *
 *   Number(n || 0).toLocaleString("id-ID")              tanpa pembulatan
 *   Math.round(Number(n) || 0).toLocaleString("id-ID")  dengan pembulatan
 *   (n || 0).toLocaleString("id-ID")                    tanpa Number()
 *
 * Yang ketiga paling berbahaya: `String.prototype.toLocaleString`
 * mengembalikan stringnya apa adanya, jadi nilai berupa teks "1500000"
 * — yang persis keluar dari `<Input type="number">` — tampil sebagai
 * `Rp 1500000`, tanpa titik ribuan sama sekali. Satu berkas sudah
 * menambal ini di satu tempat dengan `fmt(Number(currentVal))`; tempat
 * lain di berkas yang sama tidak.
 *
 * Pada data hari ini ketiganya kebetulan mencetak sama, karena semua
 * nilai uang di basis data bilangan bulat. "Kebetulan sama" bukan
 * jaminan — dan satu berkas pun sudah cukup untuk membuat satu layar
 * menyebut angka yang sama dengan bentuk berbeda dari layar sebelahnya.
 *
 * Bentuk ringkasnya punya cerita yang sama persis, dan lebih telanjang:
 * komentar di lib/rupiah.js MENYEBUT salinan lokal di
 * components/ui/grafik-uang.jsx sebagai alasan berkas itu dibuat —
 * tetapi salinannya tidak pernah ikut dicabut. Selama ini sumbu grafik
 * menyebut Rp 18.000 sebagai "18 rb" sementara kartu di atasnya
 * menyebutnya "18.000".
 *
 * Yang DITOLAK: berkas selain src/lib/rupiah.js yang MENDEFINISIKAN
 * pemformat uangnya sendiri — fungsi bernama apa pun yang tubuhnya
 * memuat `toLocaleString("id-ID")` bersama "Rp". Itu bentuk yang baru
 * saja dicabut dari 55 berkas, dan itu yang tidak boleh tumbuh lagi.
 *
 * Yang DIHITUNG tapi tidak ditolak: penulisan sebaris di dalam JSX,
 * `Rp {x.toLocaleString("id-ID")}`. Bentuknya duplikasi yang sama,
 * tetapi tidak satu pun yang ada sekarang salah atau bisa membuat
 * layar mati — semuanya dijaga `> 0` di depannya, dan semua nilai uang
 * di basis data bilangan bulat. Mengubah 79 tempat di dalam JSX tanpa
 * satu pun perubahan yang terlihat pengguna adalah risiko tanpa
 * imbalan. Jumlahnya dicetak setiap kali penjaga ini jalan supaya
 * tidak diam-diam bertambah.
 *
 * Jalankan:  node scripts/cek-rupiah.mjs
 */
import fs from "node:fs";
import path from "node:path";

const AKAR = process.cwd();
const SUMBER = "src/lib/rupiah.js";

/*
 * Berkas yang boleh memakai toLocaleString("id-ID") untuk hal lain —
 * tanggal, berat, jumlah barang. Tiap entri WAJIB punya alasan.
 */
const DIKECUALIKAN = new Map([
  [SUMBER, "inilah satu-satunya tempat aturannya boleh ditulis"],
]);

function berkas(dir, keluar = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) berkas(p, keluar);
    else if (/\.(js|jsx)$/.test(e.name)) keluar.push(p);
  }
  return keluar;
}

const temuan = [];
let diperiksa = 0;
let sebaris = 0;

for (const p of berkas(path.join(AKAR, "src"))) {
  const rel = path.relative(AKAR, p);
  if (DIKECUALIKAN.has(rel)) continue;
  const baris = fs.readFileSync(p, "utf8").split("\n");

  baris.forEach((b, i) => {
    // Komentar dilewati: penjelasan cacat ini memuat contohnya sendiri.
    const t = b.trim();
    if (t.startsWith("//") || t.startsWith("*") || t.startsWith("/*")) return;
    if (!b.includes('toLocaleString("id-ID")')) return;
    diperiksa++;

    const sebelum = b.slice(0, b.indexOf('toLocaleString("id-ID")'));
    const uang = /\bRp\b/.test(sebelum) || /\b1e[369]\b|\b1000000\b/.test(b);
    if (!uang) return;                       // tanggal, berat, jumlah — bukan uang

    // Sebuah DEFINISI, bukan pemakaian sebaris?
    const def = /^(?:export\s+)?(?:const|function)\s+\w+\s*[=(]/.test(t) ||
                /^\s*(?:const|function)\s+\w+\s*[=(]/.test(b);
    if (def) temuan.push(`${rel}:${i + 1}  ${t.slice(0, 78)}`);
    else sebaris++;
  });
}

if (temuan.length) {
  console.error(
    `${temuan.length} tempat menulis ulang aturan angka rupiah.\n\n` +
    `Aturannya tinggal di ${SUMBER}. Memakai salinan sendiri membuat satu\n` +
    `layar menyebut angka yang sama dengan bentuk berbeda dari layar\n` +
    `sebelahnya, dan salinan yang lupa Number() mencetak "Rp 1500000"\n` +
    `tanpa titik ribuan begitu nilainya datang sebagai teks.\n\n` +
    `Pakai salah satu dari ${SUMBER}:\n` +
    `  rupiah(n)           "Rp 1.500.000"\n` +
    `  angkaRibuan(n)      "1.500.000"   (markup sudah menulis "Rp" sendiri)\n` +
    `  rupiahAtauStrip(n)  "—" bila kosong, "Rp 0" bila memang nol\n` +
    `  rupiahSingkat(n)    "Rp 1,5 jt"   (kotak sempit, label sumbu grafik)\n\n` +
    temuan.map((t) => "  " + t).join("\n")
  );
  process.exit(1);
}
console.log(
  `Tidak ada pemformat rupiah kembar (${diperiksa} pemakaian toLocaleString diperiksa; ` +
  `${sebaris} penulisan sebaris di JSX belum dipindahkan — jumlah ini tidak boleh naik).`
);
process.exit(0);

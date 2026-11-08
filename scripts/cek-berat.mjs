/**
 * cek-berat.mjs — satu pintu untuk mengisi berat kura.
 *
 * ── Kejadian yang melahirkannya ──────────────────────────────────────
 *
 * `src/lib/satuanBerat.js` dibuat karena tujuh formulir masing-masing
 * menampilkan satu kotak angka berlabel "Berat (gram)", lalu menyerahkan
 * perkaliannya ke kepala orang yang sedang berdiri di kandang dengan
 * timbangan gantung yang menunjukkan "22,8". 48 catatan antara Juli dan
 * September 2026 kehilangan tiga angka nol karena itu.
 *
 * `src/components/common/InputBerat.jsx` membuka dirinya dengan kalimat
 * "satu-satunya kotak isian berat di aplikasi ini". Sampai 8 Nov 2026
 * kalimat itu TIDAK BENAR: lima formulir dipindahkan, dua tidak — dan yang
 * dua itu justru pintu penetasan, tempat angka pertama seekor kura
 * dicatat:
 *
 *   HatchDialog.jsx:90   <Label>Berat (gram)</Label> + <Input type="number">
 *   EggGrid.jsx:478      <Label>Berat Awal (gram) — opsional</Label> + <Input>
 *
 * Labelnya masih berbunyi persis seperti bentuk yang dikeluhkan. Yang hilang
 * di dua pintu itu: pilihan satuan g/kg, bacaan balik "tersimpan sebagai …",
 * dan jaring kewajaran beratMencurigakan() terhadap panjang tempurung.
 *
 * Pintu per-telur di EggGrid bahkan tidak menanyakan panjang tempurung sama
 * sekali, jadi `shell_length_cm` tidak pernah tertulis dari sana. Akibatnya
 * terbaca di data: BB-2026050 sampai BB-2026063 — keempat belas bayi yang
 * menetas 8 Nov 2026 — masuk tanpa berat MAUPUN panjang, dan incompleteChecks
 * mewajibkan keduanya, jadi keempat belasnya berdiri di daftar "data belum
 * lengkap" sejak detik pertama. Pintu massal (HatchDialog) menanyakannya.
 * Dua pintu, dua bentuk data — cacat yang komentar di EggGrid.jsx sendiri
 * sudah mengaku pernah terjadi dan dinyatakan beres 7 Okt 2026.
 *
 * ── Enam hal yang dijaga ─────────────────────────────────────────────
 *
 * 1. Tidak ada kotak isian yang mengikat `weight_grams` di luar InputBerat.
 *    Ini aturan pokoknya: satu pintu, bukan tujuh.
 *
 * 2. Label "Berat (gram)" tidak muncul lagi di mana pun. Satuan ditanyakan,
 *    tidak dipatok di dalam label.
 *
 * 3. Setiap pemakaian InputBerat mengirim `panjangCm`. Tanpa panjangnya
 *    beratMencurigakan() mengembalikan null untuk apa pun — jaringnya
 *    terpasang tapi tidak menangkap apa-apa, dan tidak ada yang kelihatan
 *    salah di layar mana pun.
 *
 * 4. InputBerat benar-benar memanggil jaring itu. Kalau impornya hilang,
 *    ketiga aturan di atas tetap hijau sementara jaringnya sudah tidak ada.
 *
 * 5. Pemakainya tidak boleh menyusut. Penjaga yang hijau karena tidak ada
 *    lagi yang diperiksa lebih buruk daripada tidak ada penjaga.
 *
 * 6. Kedua pintu penetasan menanyakan DAN menulis `shell_length_cm`.
 *
 * Jalankan:  node scripts/cek-berat.mjs
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { kupasKomentar } from "./lib/kupasKomentar.mjs";

const AKAR = process.cwd();
const temuan = [];

function daftarBerkas(dir, akhiran, keluar = []) {
  const penuh = join(AKAR, dir);
  for (const nama of readdirSync(penuh)) {
    const p = join(penuh, nama);
    if (statSync(p).isDirectory()) daftarBerkas(relative(AKAR, p), akhiran, keluar);
    else if (akhiran.some((a) => nama.endsWith(a))) keluar.push(relative(AKAR, p));
  }
  return keluar;
}

const PINTU_BERAT = "src/components/common/InputBerat.jsx";
const PINTU_PENETASAN = [
  "src/components/breeding/HatchDialog.jsx",
  "src/components/breeding/EggGrid.jsx",
];

const berkas = daftarBerkas("src", [".jsx", ".js"]);
const isi = new Map();
for (const b of berkas) isi.set(b, kupasKomentar(readFileSync(join(AKAR, b), "utf8")));

/**
 * Potongan teks satu tag JSX, dari `<Nama` sampai `/>` penutupnya.
 *
 * Tidak memakai /<Nama[^>]*>/ : atribut JSX penuh panah gemuk (`e => ...`),
 * dan tanda `>` di dalamnya memotong tag terlalu dini — tag yang isinya
 * justru yang diperiksa akan terbaca kosong dan setiap aturan di bawah
 * lolos tanpa pernah melihat apa pun.
 */
function tagJsx(sumber, nama) {
  const keluar = [];
  const pola = new RegExp(`<${nama}\\b`, "g");
  let m;
  while ((m = pola.exec(sumber)) !== null) {
    const mulai = m.index;
    const tutup = sumber.indexOf("/>", mulai);
    const batas = tutup === -1 ? mulai + 800 : tutup + 2;
    keluar.push({ mulai, teks: sumber.slice(mulai, Math.min(batas, mulai + 800)) });
  }
  return keluar;
}

const barisKe = (sumber, i) => sumber.slice(0, i).split("\n").length;

/* ── 1. Tidak ada kotak berat di luar InputBerat ────────────────────── */

for (const [b, s] of isi) {
  if (b === PINTU_BERAT) continue;
  for (const nama of ["Input", "input"]) {
    for (const t of tagJsx(s, nama)) {
      if (!t.teks.includes("weight_grams")) continue;
      temuan.push(
        `${b}:${barisKe(s, t.mulai)} — <${nama}> mengikat weight_grams sendiri.\n` +
        `      Pakai <InputBerat gram=… onChange=… panjangCm=… />: satuan ditanyakan,\n` +
        `      hasil simpannya terbaca sebelum disimpan, dan kewajarannya diperiksa.`,
      );
    }
  }
}

/* ── 2. Label "Berat (gram)" tidak muncul lagi ──────────────────────── */

/*
 * Hanya teks LABEL di layar, bukan setiap kemunculan "(gram)".
 *
 * Percobaan pertama saya mencari polanya di seluruh berkas dan menuduh
 * src/lib/logActivity.js:8 — `weight_grams: "Berat (gram)"`, peta nama kolom
 * untuk log aktivitas. Di sana "(gram)" justru keterangan yang benar: yang
 * ditampilkan adalah kolom yang berubah beserta satuan simpannya, bukan
 * kotak isian. Yang dilarang adalah MEMINTA angka tanpa menanyakan
 * satuannya, jadi yang diperiksa hanya label dan placeholder di layar.
 */
const POLA_GRAM = /Berat[^<\n]{0,24}\(gram\)/;
const KONTEKS_LABEL = [
  /<Label\b[\s\S]{0,200}?>([\s\S]{0,140}?)<\/Label>/g,
  /\b(?:label|placeholder)\s*=\s*"([^"]*)"/g,
];
for (const [b, s] of isi) {
  if (b === PINTU_BERAT || !b.endsWith(".jsx")) continue;
  for (const pola of KONTEKS_LABEL) {
    pola.lastIndex = 0;
    let m;
    while ((m = pola.exec(s)) !== null) {
      if (!POLA_GRAM.test(m[1])) continue;
      temuan.push(
        `${b}:${barisKe(s, m.index)} — label "${m[1].trim()}" memakukan satuan di dalam teksnya.\n` +
        `      Timbangan gantung menunjukkan kilogram; satuannya ditanyakan, bukan dipatok.`,
      );
    }
  }
}

/* ── 3. Setiap InputBerat mengirim panjangCm ────────────────────────── */

let pemakai = 0;
const berkasPemakai = new Set();
for (const [b, s] of isi) {
  if (b === PINTU_BERAT) continue;
  for (const t of tagJsx(s, "InputBerat")) {
    pemakai++;
    berkasPemakai.add(b);
    if (!/\bpanjangCm\s*=/.test(t.teks)) {
      temuan.push(
        `${b}:${barisKe(s, t.mulai)} — <InputBerat> tanpa panjangCm.\n` +
        `      beratMencurigakan() mengembalikan null untuk apa pun tanpa panjangnya,\n` +
        `      jadi jaringnya terpasang tetapi tidak menangkap satu pun salah satuan.`,
      );
    }
  }
}

/* ── 4. InputBerat benar-benar memanggil jaringnya ──────────────────── */

const pintu = isi.get(PINTU_BERAT) || "";
if (!pintu) {
  temuan.push(`${PINTU_BERAT} tidak ditemukan — seluruh penjaga ini kehilangan dasarnya.`);
} else {
  if (!/import\s*\{[^}]*\bberatMencurigakan\b[^}]*\}\s*from\s*["']@\/lib\/beratMasukAkal["']/.test(pintu)) {
    temuan.push(
      `${PINTU_BERAT} tidak lagi mengimpor beratMencurigakan dari lib/beratMasukAkal.\n` +
      `      Tanpa itu satu pintu berat tetap satu pintu, tapi pintunya tidak berjaring.`,
    );
  }
  if (!/\bberatMencurigakan\s*\(/.test(pintu)) {
    temuan.push(`${PINTU_BERAT} mengimpor beratMencurigakan tetapi tidak memanggilnya.`);
  }
  if (!/\bSATUAN_BERAT\b/.test(pintu)) {
    temuan.push(`${PINTU_BERAT} tidak lagi menawarkan pilihan satuan dari lib/satuanBerat.`);
  }
}

/* ── 5. Pemakainya tidak boleh menyusut ────────────────────────────────
 *
 * Tujuh formulir yang disebut satuanBerat.js, ketujuhnya sekarang lewat satu
 * pintu. Angka ini batas bawah, bukan sasaran: ia ada supaya penjaga ini
 * tidak bisa hijau karena pemakainya habis dihapus satu per satu.
 */
const MINIMAL_PEMAKAI = 7;
if (berkasPemakai.size < MINIMAL_PEMAKAI) {
  temuan.push(
    `Hanya ${berkasPemakai.size} berkas memakai InputBerat (harap ≥ ${MINIMAL_PEMAKAI}).\n` +
    `      Kalau satu formulir sengaja dihapus, turunkan batasnya di berkas ini —\n` +
    `      jangan biarkan penjaga ini hijau karena tidak ada lagi yang diperiksa.`,
  );
}

/* ── 6. Kedua pintu penetasan menanyakan dan menulis panjang ────────── */

for (const b of PINTU_PENETASAN) {
  const s = isi.get(b);
  if (!s) { temuan.push(`${b} tidak ditemukan.`); continue; }

  if (!berkasPemakai.has(b)) {
    temuan.push(
      `${b} — pintu penetasan ini tidak memakai InputBerat.\n` +
      `      Angka pertama seekor kura dicatat di sini; justru di sini jaringnya perlu.`,
    );
  }
  /* Ditanyakan: ada kotak isian yang mengikatnya. */
  const ditanya = tagJsx(s, "Input").some((t) => t.teks.includes("shell_length_cm"));
  if (!ditanya) {
    temuan.push(
      `${b} — tidak ada kotak isian panjang tempurung.\n` +
      `      Tanpa panjangnya, jaring kewajaran berat di layar ini diam, dan\n` +
      `      bayinya masuk ke daftar "data belum lengkap" sejak detik pertama.`,
    );
  }
  /*
    Ditulis: ada kunci shell_length_cm yang nilainya BUKAN tetapan kosong.

    Percobaan pertama saya cuma mencari `shell_length_cm:` dan lolos — kedua
    berkas memulai state formulirnya dengan `shell_length_cm: ""`, jadi
    menghapus baris payload-nya tetap menyisakan kunci yang mencocoki. Yang
    harus ada adalah kunci yang benar-benar membawa isian orangnya keluar.
  */
  const nilaiKunci = [...s.matchAll(/\bshell_length_cm\s*:\s*([^,\n]{0,60})/g)]
    .map((m) => m[1].trim());
  const ditulis = nilaiKunci.some((v) => v !== '""' && v !== "''" && v !== "null" && v !== "undefined");
  if (!ditulis) {
    temuan.push(
      `${b} — shell_length_cm tidak pernah ditulis ke payload Tortoise` +
      (nilaiKunci.length ? ` (${nilaiKunci.length} kunci, semuanya tetapan kosong)` : "") + `.\n` +
      `      Dua pintu penetasan harus menulis satu bentuk data yang sama.`,
    );
  }
}

if (temuan.length) {
  console.error(
    `${temuan.length} masalah pintu berat.\n\n` +
    `Satu kolom, dua satuan di lapangan. Satuannya ditanyakan di satu tempat\n` +
    `saja — InputBerat — supaya tidak ada formulir yang menebak sendiri.\n\n` +
    temuan.map((t) => "  " + t).join("\n") + "\n",
  );
  process.exit(1);
}

console.log(
  `Pintu berat tunggal: ${pemakai} pemakaian InputBerat di ${berkasPemakai.size} berkas, ` +
  `semuanya mengirim panjang tempurung, tidak ada kotak weight_grams di luarnya, ` +
  `tidak ada label "Berat (gram)", dan kedua pintu penetasan menanyakan serta ` +
  `menulis shell_length_cm.`,
);
process.exit(0);

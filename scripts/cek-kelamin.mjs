/**
 * cek-kelamin.mjs — jangan menanyakan apa yang belum bisa diketahui, dan
 * jangan memakai jawabannya untuk memilih siapa yang diberi obat.
 *
 * ── Kejadian yang melahirkannya ──────────────────────────────────────
 *
 * 8 Nov 2026 pemiliknya menekan "Menetas" pada telur #8 dan layarnya
 * meminta JENIS KELAMIN bayi yang baru keluar dari cangkangnya. Sulcata
 * menetas pada ±4,5 cm; cirinya baru terbaca mulai ±30 cm. Tidak ada yang
 * bisa diisi di situ selain tebakan.
 *
 * Yang membuatnya bukan sekadar pertanyaan yang salah tempat: kolom itu
 * memilih penerima obat.
 *
 *     TreatmentPage.getTargetTortoises
 *       → tortoises.filter(t => t.gender === "betina")
 *
 * Jadwal "Boost Kalsium Betina (Musim Bertelur)" dan "Kapsul DUTA FEMALE
 * PLUS Harian (Betina)" mengambil daftarnya persis dari sana. Jadi satu
 * tebakan di hari penetasan memasukkan bayi 50 gram ke daftar vitamin
 * reproduksi betina dewasa.
 *
 * Dan saringan yang seharusnya mencegahnya DIAM: `age_filter` tersimpan,
 * tampil di tabel syarat-ketentuan, dan tidak pernah dibaca oleh satu pun
 * baris yang memilih kura. Jadwal yang pemiliknya tandai "dewasa" menyasar
 * setiap betina, berapa pun umurnya.
 *
 * ── Empat hal yang dijaga ────────────────────────────────────────────
 *
 * 1. Layar penetasan tidak menanyakan jenis kelamin. Bayi yang baru
 *    menetas selalu "belum_diketahui", dan itu bukan kekurangan data —
 *    itu satu-satunya jawaban yang jujur.
 *
 * 2. Tidak ada ambang kelamin yang ditulis sebagai angka telanjang.
 *    Sebelumnya ada 20 cm di dua tempat dan tidak ada sama sekali di dua
 *    tempat lain. Yang 20 cm itu bukan hanya terlalu dini, ia MENAGIH:
 *    saringan "Data Belum Lengkap" menandai setiap kura di atasnya yang
 *    kelaminnya kosong, jadi yang mengisinya mengisi karena ditagih.
 *
 * 2b. Tempat yang memutuskan "kelamin wajib diisi" mengambil keputusannya
 *    dari kelaminKura.js, bukan dari angkanya sendiri.
 *
 * 3. Setiap tempat yang menyaring dengan gender_filter harus lewat
 *    saringTarget, supaya age_filter ikut terpakai. Penyaringan tangan
 *    adalah persis bentuk yang membuat age_filter diam selama ini.
 *
 * 4. Aturan saringTarget sendiri benar — terutama bahwa juvenile dan umur
 *    yang tidak diketahui TIDAK ikut "dewasa".
 *
 * Jalankan:  node scripts/cek-kelamin.mjs
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { kupasKomentar } from "./lib/kupasKomentar.mjs";
import { saringTarget } from "../src/lib/sasaranPerawatan.js";
import { bisaDikelamini, kelaminTerlaluDini, kelaminPerluDipastikan, BATAS_KELAMIN_CM } from "../src/lib/kelaminKura.js";

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

const berkas = [
  ...daftarBerkas("src", [".jsx", ".js"]),
  ...daftarBerkas("base44/functions", [".ts"]),
  ...daftarBerkas("base44/shared", [".ts"]),
];

/* ── 1. Layar penetasan tidak menanyakan jenis kelamin ──────────────── */

const LAYAR_TETAS = [
  "src/components/breeding/HatchDialog.jsx",
  "src/components/breeding/EggGrid.jsx",
];

for (const rel of LAYAR_TETAS) {
  const kode = kupasKomentar(readFileSync(join(AKAR, rel), "utf8"));
  /*
   * Yang dicari: sebuah KENDALI yang mengubah gender — onValueChange atau
   * onChange yang menulis ke kolom itu. Menulis `gender: "belum_diketahui"`
   * saat membuat kura justru yang benar, jadi itu tidak boleh ikut tertuduh.
   */
  const kendali = [
    /onValueChange=\{[^}]*gender/,
    /onChange=\{[^}]*gender\s*:/,
    /set\(\s*["']gender["']/,
  ];
  if (kendali.some((p) => p.test(kode))) {
    temuan.push(
      `${rel}  menanyakan jenis kelamin di layar penetasan. Bayi sulcata ` +
      `menetas pada ±4,5 cm dan baru bisa dikelamini pada ±${BATAS_KELAMIN_CM} cm, ` +
      `jadi yang terisi di situ adalah tebakan — dan TreatmentPage memilih ` +
      `penerima vitamin reproduksi betina langsung dari kolom itu. Tulis ` +
      `"belum_diketahui" dan sebutkan alasannya di layar.`,
    );
  }
  if (!/belum_diketahui/.test(kode)) {
    temuan.push(
      `${rel}  tidak lagi menulis gender "belum_diketahui". Kura baru harus ` +
      `punya nilai yang jujur, bukan kolom kosong.`,
    );
  }
}

/* ── 2. Tidak ada ambang kelamin yang ditulis sebagai angka telanjang ── */

/*
 * Pemeriksaan ini memakai JARAK, bukan baris.
 *
 * Percobaan pertama hanya melihat baris yang menyebut gender DAN
 * shell_length_cm sekaligus. Diuji merah, ia LOLOS — dan bentuk bug yang
 * aslinya pun akan lolos, karena di incompleteChecks kedua kata itu memang
 * ada di baris yang berbeda:
 *
 *     { key: "gender", label: "Gender", check: (d) => {
 *         const isSmall = (d.shell_length_cm && d.shell_length_cm < 20) || ...
 *
 * Ditambah lagi kupasKomentar membuang komentar, jadi kata "gender" yang
 * kebetulan ada di komentar baris itu ikut hilang. Penjaga yang hijau pada
 * kejadian yang melahirkannya bukan penjaga.
 *
 * Sekarang: cari setiap perbandingan shell_length_cm ke sebuah angka, lalu
 * lihat apakah kata "gender" ada di sekitarnya (±JARAK huruf).
 *
 * Yang TIDAK dituduh: perbandingan ke 0. `shell_length_cm > 0` adalah
 * pemeriksaan "sudah diisi atau belum", bukan ambang — dan baris itu memang
 * ada di incompleteChecks, tepat di sebelah pemeriksaan gender.
 */
const SUMBER_AMBANG = "src/lib/kelaminKura.js";
const JARAK = 400;

for (const rel of berkas) {
  if (rel === SUMBER_AMBANG) continue;
  const kode = kupasKomentar(readFileSync(join(AKAR, rel), "utf8"));
  if (!/gender/.test(kode)) continue;
  /*
   * Ambangnya bisa ditulis lewat PERANTARA. Bentuk bug yang asli di
   * TortoiseForm begini:
   *
   *     const shellLen = form.shell_length_cm ? Number(form.shell_length_cm) : 0;
   *     const isSmall = shellLen < 20 || form.age_category === "baby";
   *
   * Angkanya tidak pernah bersebelahan dengan kata shell_length_cm. Diuji
   * merah, pemeriksaan yang hanya melihat `shell_length_cm < 20` LOLOS pada
   * bentuk ini. Jadi nama perantaranya dikumpulkan dulu, lalu ikut dicari.
   */
  const perantara = new Set();
  for (const a of kode.matchAll(/(?:const|let|var)\s+(\w+)\s*=[^;\n]*shell_length_cm/g)) {
    perantara.add(a[1]);
  }
  const namaUkuran = ["shell_length_cm", ...perantara].join("|");
  const polaAmbang = new RegExp(`(?:${namaUkuran})\\s*\\)?\\s*([<>]=?)\\s*(\\d+(?:\\.\\d+)?)`, "g");
  for (const m of kode.matchAll(polaAmbang)) {
    const angka = Number(m[2]);
    if (angka === 0) continue;  // pemeriksaan "sudah diisi", bukan ambang
    const sekitar = kode.slice(Math.max(0, m.index - JARAK), m.index + JARAK);
    if (!/gender/.test(sekitar)) continue;
    temuan.push(
      `${rel}  memakai ambang panjang cangkang ${angka} cm sendiri di dekat ` +
      `kode gender. Satu-satunya ambang yang berlaku ada di ${SUMBER_AMBANG} ` +
      `(BATAS_KELAMIN_CM = ${BATAS_KELAMIN_CM}); pakai bisaDikelamini(). Dua ` +
      `ambang yang berbeda berarti satu layar menagih jawaban yang layar lain ` +
      `bilang belum mungkin — dan yang 20 cm itulah yang membuat AMBON (20,5 cm) ` +
      `dan H3 (20,7 cm) terlanjur dikelamini.`,
    );
  }
}

/* ── 2b. Yang memutuskan "kelamin wajib diisi" harus lewat kelaminKura ── */

/*
 * Aturan POSITIF, bukan perburuan pola.
 *
 * Ambang bisa ditulis dengan tak terhingga banyak cara, dan tiap pola yang
 * dikejar meninggalkan satu celah berikutnya — pemeriksaan ambang di atas
 * sudah dua kali lolos saat diuji merah sebelum bentuknya cukup lebar.
 *
 * Yang pasti hanyalah daftar tempat yang MEMUTUSKAN soal jenis kelamin, dan
 * semuanya harus mengambil keputusan itu dari satu sumber. Kalau nanti ada
 * tempat keempat, penjaga ini tidak akan tahu; tetapi yang ada sekarang
 * tidak bisa diam-diam kembali memakai angkanya sendiri.
 */
const PEMUTUS_WAJIB = [
  "src/components/tortoise/TortoiseForm.jsx",
  "src/lib/incompleteChecks.js",
  "src/pages/TortoisePassport.jsx",
];

for (const rel of PEMUTUS_WAJIB) {
  const kode = kupasKomentar(readFileSync(join(AKAR, rel), "utf8"));
  if (!/from\s+["'][^"']*kelaminKura["']/.test(kode)) {
    temuan.push(
      `${rel}  memutuskan soal jenis kelamin tanpa mengimpor dari ` +
      `${SUMBER_AMBANG}. Keputusan "sudah boleh dikelamini atau belum" hanya ` +
      `boleh datang dari bisaDikelamini() — kalau tidak, ambangnya kembali ` +
      `tersebar dan kembali berbeda-beda.`,
    );
  }
}

/* ── 3. gender_filter tidak boleh disaring tangan ───────────────────── */

const SUMBER_SARING = "src/lib/sasaranPerawatan.js";
for (const rel of berkas) {
  if (rel === SUMBER_SARING) continue;
  const kode = kupasKomentar(readFileSync(join(AKAR, rel), "utf8"));
  if (!/gender_filter/.test(kode)) continue;
  /*
   * Bentuk yang dilarang: menyaring daftar kura dengan membandingkan
   * t.gender ke gender_filter. Menampilkan nilainya sebagai lencana, atau
   * menyimpannya dari formulir, sama sekali tidak apa-apa.
   */
  const saringTangan = /\.filter\(\s*\w+\s*=>\s*\w+\.gender\s*===\s*[\w.]*gender_filter/;
  if (saringTangan.test(kode)) {
    temuan.push(
      `${rel}  menyaring kura dengan gender_filter sendiri. age_filter akan ` +
      `ikut terlewat — persis sebabnya jadwal "DUTA FEMALE PLUS" yang ` +
      `ditandai "dewasa" menyasar setiap betina berapa pun umurnya. Pakai ` +
      `saringTarget dari ${SUMBER_SARING}.`,
    );
  }
}

/* ── 4. Aturannya sendiri benar ─────────────────────────────────────── */

const uji = [];
const cek = (nama, dapat, harus) => {
  uji.push(nama);
  if (JSON.stringify(dapat) !== JSON.stringify(harus)) {
    temuan.push(`${nama}: dapat ${JSON.stringify(dapat)}, harus ${JSON.stringify(harus)}`);
  }
};

const PADA = new Date("2026-11-08");
const K = (code, gender, birth_date, shell_length_cm, age_category) =>
  ({ code, gender, birth_date, shell_length_cm, age_category });

const kawanan = [
  K("bayi", "belum_diketahui", "2026-11-08", null, "baby"),
  K("bayi-tebakan", "betina", "2026-11-01", 4.5, "baby"),
  K("juvenile", "betina", "2024-01-01", 15),
  K("dewasa-betina", "betina", "2010-01-01", 52),
  K("dewasa-jantan", "jantan", "2010-01-01", 60),
  K("tanpa-umur", "betina", null, 50),
];
const sasar = (j) => saringTarget(kawanan, j, PADA).map((t) => t.code);

cek("betina+dewasa tidak menyentuh bayi maupun juvenile",
  sasar({ gender_filter: "betina", age_filter: "dewasa" }), ["dewasa-betina"]);
cek("tanpa age_filter, semua betina ikut",
  sasar({ gender_filter: "betina" }), ["bayi-tebakan", "juvenile", "dewasa-betina", "tanpa-umur"]);
cek("age_filter baby saja",
  sasar({ age_filter: "baby" }), ["bayi", "bayi-tebakan"]);
cek("umur tidak diketahui tidak ikut dewasa",
  sasar({ age_filter: "dewasa" }).includes("tanpa-umur"), false);
cek("juvenile tidak ikut dewasa",
  sasar({ age_filter: "dewasa" }).includes("juvenile"), false);
cek("tanpa saringan apa pun, semuanya", sasar({}).length, kawanan.length);
cek("saringan kosong tidak melempar", [saringTarget().length, saringTarget(null, null).length], [0, 0]);

cek(`bayi 4,5 cm belum bisa dikelamini`,
  bisaDikelamini({ shell_length_cm: 4.5 }).bisa, false);
cek(`${BATAS_KELAMIN_CM - 0.1} cm belum bisa`,
  bisaDikelamini({ shell_length_cm: BATAS_KELAMIN_CM - 0.1 }).bisa, false);
cek(`tepat ${BATAS_KELAMIN_CM} cm sudah bisa`,
  bisaDikelamini({ shell_length_cm: BATAS_KELAMIN_CM }).bisa, true);
cek("20,5 cm — persis di atas ambang LAMA — tetap belum bisa",
  bisaDikelamini({ shell_length_cm: 20.5 }).bisa, false);
cek("belum diukur dan masih bayi: belum bisa",
  bisaDikelamini({ age_category: "baby" }).bisa, false);
cek("belum diukur dan bukan bayi: tidak dituduh",
  bisaDikelamini({}).bisa, true);
cek("sebabnya disebutkan, bukan sekadar false",
  bisaDikelamini({ shell_length_cm: 15 }).sebab.includes(String(BATAS_KELAMIN_CM)), true);

cek("betina 15 cm = tercatat terlalu dini",
  kelaminTerlaluDini({ gender: "betina", shell_length_cm: 15 }), true);
cek("belum_diketahui 15 cm = bukan masalah",
  kelaminTerlaluDini({ gender: "belum_diketahui", shell_length_cm: 15 }), false);
cek("betina 52 cm = wajar",
  kelaminTerlaluDini({ gender: "betina", shell_length_cm: 52 }), false);
cek("daftar perlu-dipastikan terurut dari yang terkecil, yang mati dilewati",
  kelaminPerluDipastikan([
    K("besar", "betina", null, 52),
    K("kecil", "betina", null, 15),
    K("sedang", "betina", null, 20.5),
    { code: "mati", gender: "betina", shell_length_cm: 10, status: "mati" },
  ]).map((t) => t.code), ["kecil", "sedang"]);
cek("daftar kosong tidak melempar", kelaminPerluDipastikan().length, 0);

if (temuan.length) {
  console.error(`${temuan.length} masalah jenis kelamin kura.\n\n` + temuan.map((t) => "  " + t).join("\n") + "\n");
  process.exit(1);
}
console.log(
  `Jenis kelamin aman: ${LAYAR_TETAS.length} layar penetasan tidak menanyakannya, ` +
  `${PEMUTUS_WAJIB.length} pemutus kewajiban memakai BATAS_KELAMIN_CM = ${BATAS_KELAMIN_CM} cm tanpa ambang tandingan, ` +
  `tidak ada penyaringan gender_filter di luar saringTarget, dan ${uji.length} aturan terpenuhi.`,
);
process.exit(0);

/**
 * cek-retak.mjs — telur retak adalah KEADAAN CANGKANG, bukan status.
 *
 * ── Permintaan yang melahirkannya ────────────────────────────────────
 *
 * 8 Nov 2026: "Sering kali kura bertelur, ada beberapa yang retak, yang
 * perlu perlakuan dan perlu pendataan. Kita jadi bisa sendirikan supaya
 * ada perhatian lebih untuk yang retak."
 *
 * ── Godaan yang dijaga penjaga ini ───────────────────────────────────
 *
 * Cara termudah menambahkannya adalah menaruh "retak" sebagai nilai
 * keenam di enum status, di samping belum_dicek / fertile / infertil /
 * menetas / gagal. Satu baris, dan layarnya langsung bisa dipakai.
 *
 * Itu akan salah, dan salahnya DIAM:
 *
 *   1. Menandai retak menghapus status fertilitasnya. Telur yang sudah
 *      terbukti fertil lalu ketahuan retak kehilangan catatan fertilnya.
 *
 *   2. ringkasDariBarisTelur menghitung per status. Telur "retak" tidak
 *      masuk fertile_count, tidak masuk infertile_count, tidak masuk
 *      hatched_count — ia menguap dari seluruh hitungan. Fertilitas
 *      mengukur PEJANTAN dan daya tetas mengukur INKUBATOR; telur yang
 *      menguap menekan keduanya tanpa alasan, dan Ranking Indukan
 *      memakai angka itu untuk memutuskan indukan mana yang dilepas.
 *
 *   3. Pertanyaan yang paling berguna jadi mustahil dijawab: "dari telur
 *      yang retak, berapa yang akhirnya menetas?" menuntut retak DAN
 *      status berdampingan.
 *
 * ── Empat hal yang dijaga ────────────────────────────────────────────
 *
 * 1. "retak" tidak pernah jadi nilai status — tidak di skema, tidak di
 *    daftar pilihan layar, tidak di perbandingan kode.
 *
 * 2. Menandai retak tidak mengubah satu pun angka ringkas clutch.
 *    Diuji dengan menjalankan ringkasDariBarisTelur pada baris yang sama
 *    dengan dan tanpa tanda retak.
 *
 * 3. Jumlah retak TIDAK disimpan sebagai kolom tersendiri. Dua tempat
 *    yang menjawab "berapa yang retak" akan berselisih diam-diam —
 *    persis cacat egg_count vs egg_records yang sudah dijelaskan panjang
 *    di jumlahTelurClutch.
 *
 * 4. Aturan telurRetak.js sendiri benar.
 *
 * Jalankan:  node scripts/cek-retak.mjs
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { kupasKomentar } from "./lib/kupasKomentar.mjs";
import { tandaiRetak, tandaiRetakMassal, ringkasRetak, telurRetakPerluPerhatian, retak } from "../src/lib/telurRetak.js";
import { ringkasDariBarisTelur } from "../src/lib/hasilInkubasi.js";

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

/* ── 1. "retak" bukan nilai status ──────────────────────────────────── */

const skema = JSON.parse(readFileSync(join(AKAR, "base44/entities/Breeding.jsonc"), "utf8"));
const enumStatus = skema?.properties?.egg_records?.items?.properties?.status?.enum || [];

if (enumStatus.includes("retak")) {
  temuan.push(
    `base44/entities/Breeding.jsonc  memasukkan "retak" ke enum status telur. ` +
    `Retak adalah keadaan cangkang, bukan perjalanan hidup telur: telur retak ` +
    `tetap punya status fertilitasnya sendiri dan tetap bisa menetas. Sebagai ` +
    `status, ia akan menghapus status itu DAN menguap dari fertile_count, ` +
    `infertile_count, dan hatched_count sekaligus. Pakai penanda \`retak\` ` +
    `yang berdiri sendiri — lihat src/lib/telurRetak.js.`,
  );
}
if (!skema?.properties?.egg_records?.items?.properties?.retak) {
  temuan.push(
    `base44/entities/Breeding.jsonc  tidak lagi punya kolom \`retak\` pada ` +
    `egg_records. Tanpa kolomnya di skema, Base44 membuang nilainya diam-diam ` +
    `saat menyimpan — telur yang ditandai retak akan kembali bersih tanpa ` +
    `satu pun galat.`,
  );
}

/*
 * Di KODE: perbandingan status ke "retak". Menyimpan `retak: true` atau
 * membaca `e.retak` justru yang benar, jadi yang dicari hanya bentuk
 * `status === "retak"` dan sejenisnya.
 */
const SUMBER_RETAK = "src/lib/telurRetak.js";
for (const rel of berkas) {
  const kode = kupasKomentar(readFileSync(join(AKAR, rel), "utf8"));
  if (/status\s*(===?|!==?|:)\s*["']retak["']/.test(kode)) {
    temuan.push(
      `${rel}  memperlakukan "retak" sebagai nilai status. Ia penanda ` +
      `tersendiri di samping status, bukan salah satu nilainya — lihat ` +
      `${SUMBER_RETAK}.`,
    );
  }
}

/* ── 2. Menandai retak tidak mengubah angka ringkas ─────────────────── */

const uji = [];
const cek = (nama, dapat, harus) => {
  uji.push(nama);
  if (JSON.stringify(dapat) !== JSON.stringify(harus)) {
    temuan.push(`${nama}: dapat ${JSON.stringify(dapat)}, harus ${JSON.stringify(harus)}`);
  }
};

const T = (n, status, rt = false) => ({ egg_number: n, status, retak: rt });
const campur = [T(1, "menetas", true), T(2, "menetas"), T(3, "gagal", true), T(4, "infertil"), T(5, "fertile", true)];
const tanpaTanda = campur.map((e) => ({ ...e, retak: false }));

cek("ringkas clutch SAMA PERSIS dengan dan tanpa tanda retak",
  ringkasDariBarisTelur(campur), ringkasDariBarisTelur(tanpaTanda));
cek("fertil tetap menetas 2 + gagal 1 + fertile 1",
  ringkasDariBarisTelur(campur).fertile_count, 4);
{
  const r = ringkasDariBarisTelur(campur);
  const berkembang = r.fertile_count - r.hatched_count - r.failed_count;
  cek("tidak ada baris yang menguap dari hitungan",
    r.hatched_count + r.failed_count + berkembang + r.infertile_count + r.belum_dicek, campur.length);
}
cek("menandai retak tidak menyentuh status",
  tandaiRetak(campur, { eggNumber: 2, tanggal: "2026-11-08" }).map((e) => e.status),
  campur.map((e) => e.status));

/* ── 3. Jumlah retak tidak disimpan sebagai kolom tersendiri ────────── */

const KOLOM_TERLARANG = ["retak_count", "cracked_count", "jumlah_retak"];
for (const k of KOLOM_TERLARANG) {
  if (Object.prototype.hasOwnProperty.call(skema.properties, k)) {
    temuan.push(
      `base44/entities/Breeding.jsonc  punya kolom \`${k}\`. Jumlah retak ` +
      `harus dihitung dari baris telurnya, bukan disimpan terpisah — dua ` +
      `tempat yang menjawab satu pertanyaan pasti berselisih, persis seperti ` +
      `egg_count vs egg_records yang sudah dijelaskan di jumlahTelurClutch.`,
    );
  }
  for (const rel of berkas) {
    const kode = kupasKomentar(readFileSync(join(AKAR, rel), "utf8"));
    if (new RegExp(`\\b${k}\\b`).test(kode)) {
      temuan.push(`${rel}  memakai \`${k}\`. Hitung dari baris telurnya lewat ringkasRetak().`);
    }
  }
}

/* ── 4. Aturannya sendiri benar ─────────────────────────────────────── */

const lima = [T(1, "belum_dicek"), T(2, "belum_dicek"), T(3, "belum_dicek"), T(4, "belum_dicek"), T(5, "belum_dicek")];

cek("3 retak menandai telur 1-3",
  tandaiRetakMassal(lima, { jumlah: 3 }).hasil.filter(retak).map((e) => e.egg_number), [1, 2, 3]);
cek("minta lebih banyak dari yang ada → dilaporkan, bukan didiamkan",
  (({ tertandai, takMuat }) => ({ tertandai, takMuat }))(tandaiRetakMassal(lima, { jumlah: 9 })),
  { tertandai: 5, takMuat: 4 });
{
  const tiga = tandaiRetakMassal(lima, { jumlah: 3 }).hasil;
  cek("diminta 3 lagi pada yang sudah 3 → tetap 3, tidak menumpuk",
    tandaiRetakMassal(tiga, { jumlah: 3 }).hasil.filter(retak).length, 3);
  cek("dinaikkan ke 5 → jadi 5",
    tandaiRetakMassal(tiga, { jumlah: 5 }).hasil.filter(retak).length, 5);
}
cek("telur yang sudah menetas tidak ikut ditandai",
  tandaiRetakMassal([T(1, "menetas"), T(2, "belum_dicek"), T(3, "belum_dicek")], { jumlah: 3 })
    .hasil.filter(retak).map((e) => e.egg_number), [2, 3]);
cek("melepas tanda ikut mengosongkan catatan perlakuan",
  (() => {
    const a = tandaiRetak(lima, { eggNumber: 2, catatan: "lilin" });
    const b = tandaiRetak(a, { eggNumber: 2, nilai: false });
    return [b[1].retak, b[1].retak_catatan];
  })(), [false, ""]);

cek("ringkasRetak memisah selamat / gagal / masih berjalan",
  (({ total, selamat, gagal, berjalan, persenSelamat }) => ({ total, selamat, gagal, berjalan, persenSelamat }))(ringkasRetak(campur)),
  { total: 3, selamat: 1, gagal: 1, berjalan: 1, persenSelamat: 50 });
cek("belum ada hasil → persen null, bukan 0",
  ringkasRetak([T(1, "belum_dicek", true)]).persenSelamat, null);

{
  const clutches = [
    { id: "a", status: "inkubasi", male_name: "A40", female_name: "C23", egg_laying_date: "2026-10-01",
      egg_records: [T(1, "fertile", true), T(2, "menetas", true), T(3, "belum_dicek", true), T(4, "fertile")] },
    { id: "b", status: "selesai", male_name: "A29", female_name: "C14", egg_laying_date: "2026-05-01",
      egg_records: [T(1, "fertile", true)] },
  ];
  cek("daftar perhatian: hanya clutch berjalan, hanya yang belum ada hasilnya",
    telurRetakPerluPerhatian(clutches).map((x) => `${x.pasangan}#${x.egg_number}`),
    ["A40 × C23#1", "A40 × C23#3"]);
}
cek("tanpa argumen tidak melempar",
  [telurRetakPerluPerhatian().length, ringkasRetak().total, tandaiRetakMassal().tertandai, tandaiRetak().length], [0, 0, 0, 0]);

if (temuan.length) {
  console.error(`${temuan.length} masalah telur retak.\n\n` + temuan.map((t) => "  " + t).join("\n") + "\n");
  process.exit(1);
}
console.log(
  `Telur retak aman: "retak" bukan nilai status (enum tetap ${enumStatus.length} nilai), ` +
  `menandainya tidak mengubah satu pun angka ringkas clutch, jumlahnya tidak disimpan ` +
  `sebagai kolom kedua, dan ${uji.length} aturan terpenuhi.`,
);
process.exit(0);

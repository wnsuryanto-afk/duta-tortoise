/**
 * cek-ronda.mjs — ronda kandang lengkap, dan aplikasi yang usang
 * memperbaiki dirinya sendiri.
 *
 * ── Dua hal yang dijaga ─────────────────────────────────────────────
 *
 * 1. SETIAP KANDANG BERISI KURA PUNYA UBINNYA.
 *
 *    Ubin "Kunjungan Kandang" adalah satu-satunya jalur pencatatan pakan
 *    dan kebersihan. Kandang yang tidak punya ubin bukan sekadar hilang
 *    dari layar — kura di dalamnya tidak punya jalur kerja sama sekali.
 *
 *    Itu sudah terjadi dua kali. Pertama saat N1-N3 digabung jadi N: 28
 *    kura hilang dari ronda karena daftarnya ditulis mati di kode. Lalu
 *    empat kandang Bonsai berisi 36 kura, yang memang tidak pernah ada
 *    di daftar itu.
 *
 *    Jawabannya `ronda_harian` di data. Penjaga ini memastikan jalur
 *    data itu benar-benar yang dipakai, bukan diam-diam jatuh ke daftar
 *    mati — karena kalau jatuh, Bonsai hilang lagi tanpa satu pun error.
 *
 * 2. APLIKASI USANG MEMPERBAIKI DIRINYA, TAPI TIDAK DI TENGAH KERJA.
 *
 *    01-10-2026 sebuah HP masih menampilkan daftar kandang dari sebelum
 *    27-09-2026 — LIMA HARI. Selama itu keempat Bonsai tidak punya ubin.
 *    Kodenya benar, datanya benar; bundel di HP-nya yang tertinggal.
 *
 *    Bilah "ada versi baru" sudah ada sejak 30-09, dan ia benar. Tapi
 *    bilah hanya bisa jalan di bundel yang SUDAH memuatnya — HP itu
 *    lebih tua daripada bilahnya sendiri. Dan bilah yang sopan dan
 *    menunggu ternyata tidak cukup untuk hal yang merusak daftar kerja
 *    sehari penuh.
 *
 *    Jadi sekarang aplikasi memuat ulang sendiri — HANYA pada detik
 *    pertama sesudah dibuka, hanya bila belum ada yang disentuh, dan
 *    hanya sekali per sesi. Ketiga syarat itu diuji di sini.
 *
 * Jalankan:  node scripts/cek-ronda.mjs
 */
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const AKAR = process.cwd();
const dir = mkdtempSync(join(tmpdir(), "cek-ronda-"));
const bundel = (masuk, keluar) =>
  execFileSync("npx", ["esbuild", masuk, "--bundle", "--format=cjs", "--platform=node",
    "--outfile=" + join(dir, keluar), "--log-level=error",
    "--alias:@=" + join(AKAR, "src")], { cwd: AKAR });

bundel("src/lib/kandang.js", "kandang.cjs");
bundel("src/lib/versiAplikasi.js", "versi.cjs");
bundel("src/lib/jadwalPerawatan.js", "jadwal.cjs");
bundel("src/lib/daftarBelanja.js", "belanja.cjs");
bundel("src/lib/resepRacikan.js", "resep.cjs");
bundel("src/lib/stokMenipis.js", "stok.cjs");
bundel("src/lib/cariInduk.js", "cari.cjs");
bundel("src/lib/trayTelur.js", "tray.cjs");
const K = await import("file://" + join(dir, "kandang.cjs")).then((m) => m.default || m);
const V = await import("file://" + join(dir, "versi.cjs")).then((m) => m.default || m);
const J = await import("file://" + join(dir, "jadwal.cjs")).then((m) => m.default || m);
const B = await import("file://" + join(dir, "belanja.cjs")).then((m) => m.default || m);
const R = await import("file://" + join(dir, "resep.cjs")).then((m) => m.default || m);
const S = await import("file://" + join(dir, "stok.cjs")).then((m) => m.default || m);
const C = await import("file://" + join(dir, "cari.cjs")).then((m) => m.default || m);
const T = await import("file://" + join(dir, "tray.cjs")).then((m) => m.default || m);

const temuan = [];

/* ── 1. Ronda kandang ──────────────────────────────────────────────── */

/*
 * Bentuk data disalin dari Enclosure yang sungguhan (1 Okt 2026) supaya
 * yang diuji bukan kasus karangan yang kebetulan lolos.
 */
const e = (name, current_count, ronda_harian) =>
  ({ name, current_count, ronda_harian, is_active: true, is_archived: false });

const NYATA = [
  e("W1", 4, true), e("W2", 4, true), e("W3", 4, true), e("W4", 4, true), e("W5", 5, true),
  e("E1", 15, true), e("E2", 4, true), e("E3", 4, true), e("E4", 4, true), e("E5", 4, true),
  e("N", 28, true), e("L1", 0, true), e("L2", 4, true),
  e("Bonsai 1", 10, true), e("Bonsai 2", 10, true), e("Bonsai 3", 8, true), e("Bonsai 4", 8, true),
  e("Baby 1", 16, false), e("Baby 2", 0, false), e("Baby 3", 0, false),
];

const ronda = K.kandangWajib(NYATA);

// Setiap kandang bertanda ronda DAN berisi kura wajib punya ubin.
for (const k of NYATA) {
  const harusIkut = k.ronda_harian === true && Number(k.current_count) > 0;
  const ikut = ronda.includes(k.name);
  if (harusIkut && !ikut) {
    temuan.push(`"${k.name}" berisi ${k.current_count} kura dan bertanda ronda, tetapi tidak punya ubin — kura di dalamnya tidak punya jalur kerja`);
  }
  if (!harusIkut && ikut && Number(k.current_count) === 0) {
    temuan.push(`"${k.name}" kosong tetapi tetap dituntut — kepatuhan tidak akan pernah bisa 100%`);
  }
}

// Jalur data HARUS yang dipakai. Kalau diam-diam jatuh ke daftar mati,
// Bonsai hilang lagi — dan itu persis cacat yang penjaga ini jaga.
for (const b of ["Bonsai 1", "Bonsai 2", "Bonsai 3", "Bonsai 4"]) {
  if (!ronda.includes(b)) {
    temuan.push(`${b} tidak ada di ronda — jalur \`ronda_harian\` tidak dipakai, dan daftar mati KANDANG_LIST tidak memuat Bonsai`);
  }
}
if (K.KANDANG_LIST.some((k) => /^N[123]$/.test(k))) {
  temuan.push("KANDANG_LIST masih memuat N1/N2/N3 — ketiganya sudah digabung jadi N pada 27-09-2026");
}

/* ── 2. Muat ulang otomatis: tiga syarat ───────────────────────────── */

const syarat = [
  ["baru dibuka, belum disentuh → muat ulang", { tersentuh: false, umurMs: 1000, sudahPernah: false }, true],
  ["sudah disentuh → jangan", { tersentuh: true, umurMs: 1000, sudahPernah: false }, false],
  ["lewat jeda aman → jangan", { tersentuh: false, umurMs: V.JEDA_AMAN_MS + 1, sudahPernah: false }, false],
  ["tepat di batas → jangan", { tersentuh: false, umurMs: V.JEDA_AMAN_MS, sudahPernah: false }, false],
  ["sudah pernah di sesi ini → jangan", { tersentuh: false, umurMs: 1000, sudahPernah: true }, false],
];
for (const [nama, masuk, harap] of syarat) {
  if (V.bolehMuatUlangOtomatis(masuk) !== harap) {
    temuan.push(`bolehMuatUlangOtomatis: "${nama}" menjawab ${!harap}`);
  }
}

/* ── 3. Jadwal yang berjalan lebih sering daripada tertulis ────────── */

/*
 * Sebuah jadwal berjudul "Vitamin E IPI Selang-Seling (2 Hari Sekali)",
 * seluruh takarannya dihitung untuk empat kali pemberian seminggu,
 * punya `frequency: "harian"` — tampil tujuh kali, dua kali lipat.
 *
 * Cacatnya sudah tertulis lengkap di catatan jadwal itu sendiri sejak
 * 30-08-2026 ("perbaiki frekuensinya lebih dulu bila kelak dihidupkan
 * lagi tanpa racikan") dan tetap lolos sebulan — karena peringatan itu
 * sebuah KOMENTAR, sementara yang menghidupkannya kembali adalah KODE.
 *
 * Yang diuji di sini: pembacanya menangkap yang benar-benar tak cocok,
 * DAN tidak menuduh jadwal yang memang harian. Tuduhan palsu pada
 * kalsium atau folat akan membuat peringatannya ikut diabaikan.
 */
const jadwalUji = [
  ["Vitamin E asli — judul 2 hari, kolom harian", {
    is_active: true, frequency: "harian",
    title: "Vitamin E IPI Selang-Seling (2 Hari Sekali)",
    sop_task_title: "Berikan Vitamin E (J:3 tab / B:2 tab) — setiap 2 hari",
    notes: "SELANG-SELING - berikan setiap 2 hari sekali, bukan setiap hari.",
  }, 2],
  ["Asam folat — memang harian", {
    is_active: true, frequency: "harian",
    title: "Folavit (Asam Folat) Harian (Betina)",
    notes: "Dosis: setara 1 tablet Folavit 400 mcg per ekor per hari.",
  }, null],
  ["Kalsium — memang harian", {
    is_active: true, frequency: "harian",
    title: "Kalsium Harian",
    notes: "Dosis: Jantan 10 gram/ekor/hari | Betina 15 gram/ekor/hari.",
  }, null],
  ["sudah dimatikan — bukan urusan lagi", {
    is_active: false, frequency: "harian", title: "Vitamin E (2 Hari Sekali)",
  }, null],
  ["kolomnya sudah dibetulkan", {
    is_active: true, frequency: "dua_harian", frequency_interval_days: 2,
    title: "Vitamin E (2 Hari Sekali)",
  }, null],
  ["ditulis dengan huruf", {
    is_active: true, frequency: "harian", title: "Suplemen setiap dua hari sekali",
  }, 2],
];
for (const [nama, j, harap] of jadwalUji) {
  const h = J.iramaTakCocok(j);
  const dapat = h ? h.tertulisHari : null;
  if (dapat !== harap) {
    temuan.push(`iramaTakCocok: "${nama}" menjawab ${dapat}, seharusnya ${harap}`);
  }
}

/* ── 4. Barang yang diracik sendiri tidak ditawarkan untuk dibeli ──── */

/*
 * VIT-REP00 "RACIKAN Vitamin Reproduksi Betina" dibuat dari 12 bahan,
 * bukan dipesan. Stoknya nol dan batas minimumnya 3.000 g, jadi penilai
 * stok menandainya gawat dan tombol beranda memasukkannya ke daftar
 * belanja seperti barang biasa.
 *
 * Itu sudah pernah ketahuan: 31-08-2026 barisnya dibatalkan dengan
 * keterangan yang menjelaskan persis duduk perkaranya. Tiga minggu
 * kemudian, 20-09-2026, barisnya masuk lagi — karena keterangan itu
 * menunggu dibaca, sementara yang memasukkannya kembali adalah tombol.
 *
 * Yang diuji di sini dua arah sekaligus. Barang jadi harus dikecualikan,
 * DAN bahan-bahannya harus TETAP ditawarkan: ketiga bahan pemblokir Duta
 * Repro memang perlu dibeli, dan mengecualikan mereka ikut-ikutan akan
 * membuat racikannya tidak pernah bisa dibuat lagi.
 */
const RESEP_UJI = [
  { name: "DUTA REPRO", output_item_id: "6a50c9c9d70aed0d5b585621" },
  { name: "DUTA FEMALE PLUS", output_item_id: "6a95ec40671f08cfb8de68f0" },
  { name: "DUTA HERBAL BOOST", output_item_id: "6a95ec40671f08cfb8de68f1" },
  { name: "DUTA DAILY BOOST", output_item_id: "6a95ec40671f08cfb8de68ef" },
];
const idRacikan = B.idBarangRacikan(RESEP_UJI);

const belanjaUji = [
  ["VIT-REP00 racikan jadi", "6a50c9c9d70aed0d5b585621", true],
  ["VIT-REP01 Vitamin E (bahan)", "6a50c9c9d70aed0d5b585615", false],
  ["VIT-REP02 Vitamin D3 (bahan)", "6a50c9c9d70aed0d5b585616", false],
  ["VIT-REP04 Fermipan (bahan)", "6a50c9c9d70aed0d5b585618", false],
  ["kapsul Female Plus (jadi)", "6a95ec40671f08cfb8de68f0", true],
  ["Burnazin (obat biasa)", "6a23a4f796f1eb73e8d6a424", false],
];
for (const [nama, id, harap] of belanjaUji) {
  if (B.diracikSendiri({ id }, idRacikan) !== harap) {
    temuan.push(`diracikSendiri: "${nama}" menjawab ${!harap}, seharusnya ${harap}`);
  }
}
if (B.diracikSendiri({ id: "apa-saja" }, B.idBarangRacikan([])) !== false) {
  temuan.push("diracikSendiri: tanpa resep sama sekali, masih menuduh ada yang diracik");
}

/* ── 5. Resep racikan: dosis per ekor, dan bahan mikro ─────────────── */

/*
 * Duta Repro v5 memakai Vitamin D3 2,5 g dalam batch 21.000 g —
 * 0,0119%. Angka itu menentukan 179 IU per ekor per hari, dan resepnya
 * sendiri menuliskan batasnya.
 *
 * Mengetik 25 g alih-alih 2,5 melipatgandakan dosisnya SEPULUH KALI dan
 * hanya menggeser jumlah adonan 0,110% — di bawah ambang kewajaran mana
 * pun. Jadi pemeriksaan "jumlahnya cocok atau tidak" TIDAK menangkapnya,
 * justru KARENA bahannya mikro.
 *
 * Yang diuji di sini: angka per dosis yang dihitung harus cocok dengan
 * tabel resmi v5, DAN salah ketik sepuluh kali lipat harus terlihat di
 * angka itu meski jumlahnya masih dianggap seimbang.
 */
const V5 = {
  yield_kg: 21,
  ingredients: [
    { item_name: "Tepung hijauan — VIT-REP20", quantity_kg: 11.398 },
    { item_name: "Kalsium karbonat — VIT-REP07", quantity_kg: 5.25 },
    { item_name: "Moringa — VIT-REP03", quantity_kg: 4.2 },
    { item_name: "Vitamin E 50% — VIT-REP01", quantity_kg: 0.15 },
    { item_name: "Vitamin D3 — VIT-REP02", quantity_kg: 0.0025 },
  ],
};
const hasilV5 = R.periksaResep(V5, 15);
const dekat = (a, b, toleransi) => Math.abs(a - b) <= toleransi;

// Angka resmi dari dokumen v5 FINAL, tabel bagian 1 dan 2.
const RESMI = [
  ["Tepung hijauan", 54.27, 8.14],
  ["Kalsium karbonat", 25.00, 3.75],
  ["Moringa", 20.00, 3.00],
  ["Vitamin E 50%", 0.71, 0.11],
  ["Vitamin D3", 0.0119, 0.0018],
];
if (!hasilV5) {
  temuan.push("periksaResep: tidak bisa membaca resep v5");
} else {
  if (!hasilV5.seimbang) temuan.push(`periksaResep: v5 dianggap tidak seimbang (selisih ${hasilV5.selisihPersen.toFixed(3)}%)`);
  RESMI.forEach(([nama, persen, perDosis], i) => {
    const b = hasilV5.bahan[i];
    if (!dekat(b.persen, persen, 0.01)) {
      temuan.push(`periksaResep: "${nama}" ${b.persen.toFixed(4)}%, dokumen v5 menulis ${persen}%`);
    }
    if (!dekat(b.perDosisGram, perDosis, 0.005)) {
      temuan.push(`periksaResep: "${nama}" ${b.perDosisGram.toFixed(4)} g per dosis, dokumen v5 menulis ${perDosis} g`);
    }
  });
  const d3 = hasilV5.bahan[4];
  if (!d3.mikro) temuan.push("periksaResep: Vitamin D3 tidak ditandai bahan mikro — pengenceran bertingkat jadi tidak diingatkan");
  if (hasilV5.bahan[0].mikro) temuan.push("periksaResep: pembawa utama salah ditandai bahan mikro");
}

// Salah ketik sepuluh kali lipat pada D3.
const SALAH = { ...V5, ingredients: V5.ingredients.map((b) =>
  b.item_name.includes("D3") ? { ...b, quantity_kg: 0.025 } : b) };
const hasilSalah = R.periksaResep(SALAH, 15);
const d3Salah = hasilSalah.bahan[4].perDosisGram * 1000;
if (!(d3Salah > 17 && d3Salah < 19)) {
  temuan.push(`periksaResep: salah ketik D3 10x seharusnya terlihat sebagai ~17,8 mg per dosis, terbaca ${d3Salah.toFixed(2)} mg`);
}

/* ── 6. Golongan stok: yang diracik tidak pernah "perlu dibeli" ────── */

/*
 * Empat tempat membaca "di bawah minimum", dan sampai 02-10-2026 hanya SATU
 * yang tahu bahwa barang hasil resep tidak bisa dibeli: kartu Keputusan Hari
 * Ini. Tiga sisanya — peringatan gawat di beranda, pemeriksaan stok harian di
 * server, dan daftar belanja otomatis — menyebut RACIKAN Duta Repro sebagai
 * barang yang perlu DIBELI. Pemiliknya sudah membatalkan baris belanjanya dua
 * kali dengan keterangan yang menjelaskan hal itu.
 *
 * Aturannya sekarang hidup di golonganStok(), yang dipakai ketiga-tiganya.
 *
 * Yang diuji di sini tiga hal, dan yang ketiga yang paling penting:
 *   1. barang jadi masuk `perluDiracik`, dan TIDAK ikut `habis`;
 *   2. BAHANNYA tetap masuk `habis` — kalau bahan ikut dikecualikan,
 *      racikannya tidak akan pernah bisa dibuat lagi;
 *   3. tanpa daftar resep, barang jadi itu JATUH KEMBALI ke `habis` — bukti
 *      bahwa yang memindahkannya adalah data resep, bukan pencocokan nama.
 */
const RACIKAN_JADI = "6a50c9c9d70aed0d5b585621";
const stokUji = [
  { id: RACIKAN_JADI, name: "RACIKAN Duta Repro v5", current_stock: 0, minimum_stock: 3000, is_mandatory: true },
  { id: "6a50c9c9d70aed0d5b585615", name: "Vitamin E 50% (bahan)", current_stock: 0, minimum_stock: 160, is_mandatory: true },
  { id: "menipis-1", name: "Barang menipis", current_stock: 5, minimum_stock: 10, is_mandatory: true },
  { id: "tanpa-min", name: "Wajib tanpa minimum", current_stock: 0, minimum_stock: 0, is_mandatory: true },
];
const nama = (d) => d.map((i) => i.name).sort().join(" | ");

const g1 = S.golonganStok(stokUji, idRacikan);
if (nama(g1.perluDiracik) !== "RACIKAN Duta Repro v5") {
  temuan.push(`golonganStok: perluDiracik seharusnya hanya barang jadi, terbaca "${nama(g1.perluDiracik)}"`);
}
if (nama(g1.habis) !== "Vitamin E 50% (bahan)") {
  temuan.push(`golonganStok: habis seharusnya hanya BAHANnya, terbaca "${nama(g1.habis)}"`);
}
if (nama(g1.menipis) !== "Barang menipis") {
  temuan.push(`golonganStok: menipis berubah, terbaca "${nama(g1.menipis)}"`);
}
if (nama(g1.wajibTanpaMinimum) !== "Wajib tanpa minimum") {
  temuan.push(`golonganStok: wajibTanpaMinimum berubah, terbaca "${nama(g1.wajibTanpaMinimum)}"`);
}

// Tanpa resep: barang jadi harus kembali dianggap perlu dibeli.
const g0 = S.golonganStok(stokUji, null);
if (g0.perluDiracik.length !== 0) {
  temuan.push("golonganStok: tanpa daftar resep, masih ada yang dianggap diracik");
}
if (!g0.habis.some((i) => i.id === RACIKAN_JADI)) {
  temuan.push("golonganStok: tanpa daftar resep, barang jadi hilang dari habis — artinya yang memindahkannya bukan data resep");
}

/* ── 7. Pencarian induk: riwayat bertelur tiap kura ────────────────── */

/*
 * Nama kura di kebun ini tidak rapi, dan itu bukan kesalahan yang bisa
 * diperbaiki sekali lalu dilupakan — ia datang dari impor awal dan dari
 * orang yang mengetik di ponsel. Dua contoh nyata dari data:
 *
 *   "RD besar "   berspasi ekor
 *   "8 BESAR"     huruf besar semua
 *
 * Kalau pencarian membandingkan apa adanya, mengetik "rd besar" tidak akan
 * menemukan kuranya sendiri, dan orang akan menyimpulkan kura itu belum
 * pernah bertelur — kesimpulan yang persis terbalik.
 */
const BREED_UJI = [
  { female_name: "A31", male_name: "A36", status: "bertelur", egg_laying_date: "2026-10-01", egg_count: 22 },
  { female_name: "A31", male_name: "A36", status: "bertelur", egg_laying_date: "2026-09-04", egg_count: 23, hatched_count: 0 },
  { female_name: "C24", male_name: "A36", status: "selesai",  egg_laying_date: "2026-04-08", egg_count: 24, hatched_count: 22 },
  { female_name: "RD besar ", male_name: "A35", status: "bertelur", egg_laying_date: "2026-08-01", egg_count: 10 },
  { female_name: "8 BESAR", male_name: "A35", status: "bertelur", egg_laying_date: "2026-07-01", egg_count: 11 },
  // Catatan baru yang tanggalnya belum diisi — penjebak "terakhir bertelur".
  { female_name: "A31", male_name: "A36", status: "bertelur", egg_count: 0 },
];

const cariUji = [
  ["A31", 3, "induk betina"],
  ["a31", 3, "huruf kecil"],
  ["A36", 4, "nama PEJANTAN juga dikenali"],
  ["rd besar", 1, "nama berspasi ekor"],
  ["8  besar", 1, "spasi ganda yang diketik orang"],
  ["Z99", 0, "tidak ada"],
  ["", 6, "kata kosong TIDAK menyaring"],
  ["   ", 6, "spasi saja TIDAK menyaring"],
];
for (const [kata, harap, kenapa] of cariUji) {
  const dapat = C.saringBreeding(BREED_UJI, kata).length;
  if (dapat !== harap) {
    temuan.push(`saringBreeding("${kata}"): dapat ${dapat}, seharusnya ${harap} — ${kenapa}`);
  }
}

// Dikelompokkan per INDUK BETINA, terbanyak di atas.
const kel = C.kelompokkanPerInduk(C.saringBreeding(BREED_UJI, "A36"));
if (kel.length !== 2 || kel[0].nama !== "A31" || kel[0].clutch.length !== 3) {
  temuan.push(`kelompokkanPerInduk: mencari pejantan A36 seharusnya memberi 2 induk dengan A31 (3 clutch) di atas, dapat ${JSON.stringify(kel.map((k) => [k.nama, k.clutch.length]))}`);
}
// Nama yang ditampilkan harus nama asli, bukan versi yang sudah dirapikan.
const kelRd = C.kelompokkanPerInduk(C.saringBreeding(BREED_UJI, "rd besar"));
if (kelRd[0]?.nama !== "RD besar") {
  temuan.push(`kelompokkanPerInduk: nama tampil seharusnya "RD besar", dapat "${kelRd[0]?.nama}"`);
}

/*
 * Clutch tanpa tanggal tidak boleh ikut menentukan "terakhir bertelur".
 * Kalau ikut, `new Date(undefined)` atau string kosong akan menjadikan
 * terakhir bertelur melompat ke 1970 dan "hari lalu" menjadi puluhan ribu.
 */
const akhirA31 = C.terakhirBertelur(
  BREED_UJI.filter((b) => b.female_name === "A31"),
  new Date("2026-10-02"),
);
if (akhirA31.tanggal !== "2026-10-01" || akhirA31.hariLalu !== 1) {
  temuan.push(`terakhirBertelur: seharusnya 2026-10-01 / 1 hari lalu, dapat ${akhirA31.tanggal} / ${akhirA31.hariLalu}`);
}
if (C.terakhirBertelur([]).tanggal !== null) {
  temuan.push("terakhirBertelur: daftar kosong seharusnya memberi null");
}

/* ── 8. Resep nonaktif tidak boleh bisa diracik ────────────────────── */

/*
 * Arsip "DUTA REPRO v4" sengaja disimpan di aplikasi supaya angka resep lama
 * tidak hilang. Namanya berbunyi JANGAN DIRACIK — tetapi nama menunggu
 * dibaca, sedangkan tombol dijalankan. Menekan "Buat Pelet" pada arsip itu
 * memotong 7 kg kalsium, 3,15 kg tepung kedelai, maltodextrin, dextrose dan
 * Fermipan, lalu menghasilkan batch yang sudah ditinggalkan v5.
 *
 * Perhatikan kasus `undefined`: resep yang dibuat sebelum kolom is_active ada
 * tidak punya nilainya. Memakai `=== true` akan mematikan tombol meracik pada
 * resep yang sah. Itu kesalahan yang arahnya berlawanan dan sama buruknya —
 * racikan yang memang perlu dibuat jadi tidak bisa dibuat.
 */
const racikUji = [
  [{ name: "DUTA REPRO v5", is_active: true }, true, "resep aktif"],
  [{ name: "ARSIP v4", is_active: false }, false, "arsip nonaktif"],
  [{ name: "DUTA FEMALE PLUS", is_active: false }, false, "resep lama yang dimatikan"],
  [{ name: "resep lama tanpa kolom" }, true, "is_active undefined — tetap boleh"],
  [null, false, "tanpa resep sama sekali"],
];
for (const [resep, harap, kenapa] of racikUji) {
  if (R.bolehDiracik(resep) !== harap) {
    temuan.push(`bolehDiracik(${kenapa}): menjawab ${!harap}, seharusnya ${harap}`);
  }
}
/*
 * Dan TOMBOLNYA sendiri yang harus dijaga, bukan sekadar berkasnya.
 *
 * Pemeriksaan pertama di sini cuma mencari kata "bolehDiracik(r)" di mana pun
 * dalam berkas. Itu lolos walaupun gerbang tombolnya sudah dilepas, karena
 * lencana "nonaktif" di kartu yang sama juga memakai kata itu. Diuji dengan
 * melepas gerbangnya: penjaganya tetap hijau. Jadi yang dicocokkan sekarang
 * adalah gerbang tombol Buat Pelet itu sendiri.
 */
const layarResep = readFileSync("src/components/stok/StokResepTab.jsx", "utf8");
if (!layarResep.includes("canEdit && bolehDiracik(r)")) {
  temuan.push("Tombol Buat Pelet di StokResepTab tidak lagi dijaga bolehDiracik() — resep nonaktif bisa diracik dan memotong stok");
}

/* ── 9. Tray telur: satu clutch boleh memakai lebih dari satu ──────── */

/*
 * Kolom `tray_number` menyimpan SATU angka. Pada data 2 Okt 2026 ada clutch
 * 28 butir, 25 butir, dan dua clutch 23 butir — tidak muat di satu tray.
 *
 * Yang paling mudah salah di sini bukan penguraiannya, melainkan URUTAN
 * SUMBERNYA: kalau `tray_number` dibaca lebih dulu, clutch yang baru diisi
 * dua tray akan terbaca satu tray saja selama kolom lamanya masih terisi —
 * dan kolom lamanya MEMANG masih diisi, dengan tray pertama, supaya layar
 * lama tidak kosong. Jadi salah urutan di sini tidak akan terlihat sebagai
 * error; ia hanya diam-diam menghilangkan tray kedua.
 */
const trayUji = [
  [{ tray_numbers: [2, 1], tray_number: 2 }, [1, 2], "tray_numbers menang atas tray_number, dan diurutkan"],
  [{ tray_number: 3 }, [3], "catatan lama: jatuh ke tray_number"],
  [{ tray_numbers: [], tray_number: 4 }, [4], "tray_numbers kosong: jatuh ke tray_number"],
  [{ tray_numbers: [5, 5, 5] }, [5], "kembar dibuang"],
  [{ tray_numbers: [1, 0, -2, null] }, [1], "nol, minus, dan kosong dibuang"],
  [{}, [], "tanpa tray sama sekali"],
  [null, [], "tanpa catatan sama sekali"],
];
for (const [b, harap, kenapa] of trayUji) {
  const dapat = T.daftarTray(b);
  if (JSON.stringify(dapat) !== JSON.stringify(harap)) {
    temuan.push(`daftarTray (${kenapa}): dapat ${JSON.stringify(dapat)}, seharusnya ${JSON.stringify(harap)}`);
  }
}

// Ketikan orang di lapangan — pemisah apa pun yang ada di kepalanya.
for (const [teks, harap] of [
  ["1, 2", [1, 2]], ["1,2", [1, 2]], ["1 2", [1, 2]], ["1;2", [1, 2]],
  ["Tray 1 dan 2", [1, 2]], ["2, 1", [1, 2]], ["", []], ["   ", []], ["abc", []],
]) {
  const dapat = T.uraikanTray(teks);
  if (JSON.stringify(dapat) !== JSON.stringify(harap)) {
    temuan.push(`uraikanTray("${teks}"): dapat ${JSON.stringify(dapat)}, seharusnya ${JSON.stringify(harap)}`);
  }
}

if (T.teksTray({ tray_numbers: [1, 2] }) !== "Tray 1, 2") temuan.push("teksTray: dua tray salah tulis");
if (T.teksTray({}) !== "") temuan.push("teksTray: tanpa tray seharusnya kosong");

/*
 * Bentrok tray. Tray adalah satu-satunya hal yang membedakan telur induk A
 * dari induk B setelah keduanya masuk inkubator yang sama; dua clutch di satu
 * tray berarti saat menetas tidak ada lagi cara tahu anak itu anak siapa.
 */
const clutchUji = [
  { id: "a", female_name: "A31", tray_numbers: [1, 2] },
  { id: "b", female_name: "C23", tray_numbers: [2, 3] },
  { id: "c", female_name: "A47", tray_numbers: [4] },
];
const bentrok = T.trayBentrok(clutchUji);
if (bentrok.length !== 1 || bentrok[0].tray !== 2 || bentrok[0].clutch.length !== 2) {
  temuan.push(`trayBentrok: seharusnya hanya tray 2 yang bentrok antara 2 clutch, dapat ${JSON.stringify(bentrok.map((x) => [x.tray, x.clutch.length]))}`);
}
// Saat mengedit clutch itu sendiri, traynya sendiri tidak boleh dihitung bentrok.
if (T.trayTerpakai(clutchUji, { kecuali: "a" }).has(1)) {
  temuan.push("trayTerpakai: clutch yang sedang diedit masih dihitung memakai traynya sendiri");
}

rmSync(dir, { recursive: true, force: true });

if (temuan.length) {
  console.error(`${temuan.length} masalah pada ronda kandang.\n\n` + temuan.map((t) => "  " + t).join("\n") + "\n");
  process.exit(1);
}
console.log(
  `Ronda lengkap (${ronda.length} kandang dari ${NYATA.length} tercatat, keempat Bonsai ikut), ` +
  `${syarat.length} syarat muat ulang + ${jadwalUji.length} irama jadwal + ${belanjaUji.length} barang belanja + ` +
  `resep v5 (${RESMI.length} bahan) + ${stokUji.length} golongan stok + ${cariUji.length} pencarian induk + ${racikUji.length} izin meracik + ${trayUji.length} tray telur diuji.`,
);
process.exit(0);

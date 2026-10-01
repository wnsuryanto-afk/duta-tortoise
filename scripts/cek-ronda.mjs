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
import { mkdtempSync, rmSync } from "node:fs";
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
const K = await import("file://" + join(dir, "kandang.cjs")).then((m) => m.default || m);
const V = await import("file://" + join(dir, "versi.cjs")).then((m) => m.default || m);
const J = await import("file://" + join(dir, "jadwal.cjs")).then((m) => m.default || m);
const B = await import("file://" + join(dir, "belanja.cjs")).then((m) => m.default || m);
const R = await import("file://" + join(dir, "resep.cjs")).then((m) => m.default || m);

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

rmSync(dir, { recursive: true, force: true });

if (temuan.length) {
  console.error(`${temuan.length} masalah pada ronda kandang.\n\n` + temuan.map((t) => "  " + t).join("\n") + "\n");
  process.exit(1);
}
console.log(
  `Ronda lengkap (${ronda.length} kandang dari ${NYATA.length} tercatat, keempat Bonsai ikut), ` +
  `${syarat.length} syarat muat ulang + ${jadwalUji.length} irama jadwal + ${belanjaUji.length} barang belanja + resep v5 (${RESMI.length} bahan) diuji.`,
);
process.exit(0);

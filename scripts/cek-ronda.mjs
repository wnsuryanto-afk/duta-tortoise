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
import { kupasKomentar } from "./lib/kupasKomentar.mjs";

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
bundel("src/lib/inkubator.js", "inkubator.cjs");
bundel("src/lib/hitungMundur.js", "mundur.cjs");
bundel("src/lib/peringkatIndukan.js", "peringkat.cjs");
bundel("src/lib/rekapTahunan.js", "tahunan.cjs");
bundel("src/lib/tanggalMasukAkal.js", "tanggal.cjs");
bundel("src/lib/hasilInkubasi.js", "hasil.cjs");
bundel("src/lib/hppKura.js", "hpp.cjs");
bundel("src/lib/usulPoinInisiatif.js", "usulpoin.cjs");
bundel("src/lib/kunciSetelan.js", "kunci.cjs");
bundel("src/lib/miripTugas.js", "mirip.cjs");
bundel("src/lib/kunciTugas.js", "kuncitugas.cjs");
bundel("src/lib/poinBarisChecklist.js", "poinchecklist.cjs");
bundel("base44/shared/bayarSurut.ts", "bayarsurut.cjs");
bundel("src/lib/anakanKura.js", "anakan.cjs");
bundel("src/lib/laporan.js", "laporan.cjs");
bundel("src/lib/siklusBertelur.js", "siklus.cjs");
bundel("src/lib/targetTahunan.js", "target.cjs");
bundel("src/lib/jendelaSurut.js", "jendelasurut.cjs");
bundel("src/lib/diagnosaInduk.js", "diagnosa.cjs");
bundel("src/lib/diseaseClusterUtils.js", "kluster.cjs");
bundel("src/lib/kelompokInisiatif.js", "kelompok.cjs");
bundel("src/lib/hargaSupplier.js", "harga.cjs");
bundel("src/lib/pasarSupplier.js", "pasar.cjs");
bundel("src/lib/bersihkanKura.js", "bersihkura.cjs");
bundel("src/lib/incompleteChecks.js", "lengkap.cjs");
bundel("src/lib/pitaUkuran.js", "pita.cjs");
bundel("src/lib/hargaEstimasi.js", "hargaest.cjs");
bundel("src/lib/hargaBarang.js", "hargabrg.cjs");
const K = await import("file://" + join(dir, "kandang.cjs")).then((m) => m.default || m);
const HPP = await import("file://" + join(dir, "hpp.cjs")).then((m) => m.default || m);
const UP = await import("file://" + join(dir, "usulpoin.cjs")).then((m) => m.default || m);
const KS = await import("file://" + join(dir, "kunci.cjs")).then((m) => m.default || m);
const MT = await import("file://" + join(dir, "mirip.cjs")).then((m) => m.default || m);
const KT = await import("file://" + join(dir, "kuncitugas.cjs")).then((m) => m.default || m);
const PK = await import("file://" + join(dir, "poinchecklist.cjs")).then((m) => m.default || m);
const BS = await import("file://" + join(dir, "bayarsurut.cjs")).then((m) => m.default || m);
const AN = await import("file://" + join(dir, "anakan.cjs")).then((m) => m.default || m);
const LP = await import("file://" + join(dir, "laporan.cjs")).then((m) => m.default || m);
const SB = await import("file://" + join(dir, "siklus.cjs")).then((m) => m.default || m);
const JS = await import("file://" + join(dir, "jendelasurut.cjs")).then((m) => m.default || m);
const DI = await import("file://" + join(dir, "diagnosa.cjs")).then((m) => m.default || m);
const V = await import("file://" + join(dir, "versi.cjs")).then((m) => m.default || m);
const J = await import("file://" + join(dir, "jadwal.cjs")).then((m) => m.default || m);
const B = await import("file://" + join(dir, "belanja.cjs")).then((m) => m.default || m);
const R = await import("file://" + join(dir, "resep.cjs")).then((m) => m.default || m);
const S = await import("file://" + join(dir, "stok.cjs")).then((m) => m.default || m);
const C = await import("file://" + join(dir, "cari.cjs")).then((m) => m.default || m);
const T = await import("file://" + join(dir, "tray.cjs")).then((m) => m.default || m);
const I = await import("file://" + join(dir, "inkubator.cjs")).then((m) => m.default || m);
const M = await import("file://" + join(dir, "mundur.cjs")).then((m) => m.default || m);
const P = await import("file://" + join(dir, "peringkat.cjs")).then((m) => m.default || m);
const Y = await import("file://" + join(dir, "tahunan.cjs")).then((m) => m.default || m);
const TGL = await import("file://" + join(dir, "tanggal.cjs")).then((m) => m.default || m);
const H = await import("file://" + join(dir, "hasil.cjs")).then((m) => m.default || m);

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
 * VIT-REP00 "RACIKAN Vitamin Reproduksi Betina" DIRACIK, bukan dipesan.
 * Stoknya nol dan batas minimumnya 6.500 g, jadi penilai
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
 * Duta Repro v7 FINAL memakai Vitamin D3 4,6 g dalam batch 28.000 g —
 * 0,0164%. Angka itu menentukan 164 IU per ekor per hari, dan resepnya
 * sendiri menuliskan batasnya.
 *
 * Mengetik 46 g alih-alih 4,6 melipatgandakan dosisnya SEPULUH KALI dan
 * hanya menggeser jumlah adonan 0,148% — di bawah ambang kewajaran mana
 * pun. Jadi pemeriksaan "jumlahnya cocok atau tidak" TIDAK menangkapnya,
 * justru KARENA bahannya mikro.
 *
 * Yang diuji di sini: angka per dosis yang dihitung harus cocok dengan
 * tabel resmi v7, DAN salah ketik sepuluh kali lipat harus terlihat di
 * angka itu meski jumlahnya masih dianggap seimbang.
 */
const V7 = {
  yield_kg: 28,
  ingredients: [
    { item_name: "Tepung hijauan — VIT-REP20", quantity_kg: 18.3254 },
    { item_name: "Kalsium karbonat — VIT-REP07", quantity_kg: 9.52 },
    { item_name: "Vitamin E asetat 50% — VIT-REP01", quantity_kg: 0.15 },
    { item_name: "Vitamin D3 — VIT-REP02", quantity_kg: 0.0046 },
  ],
};
const DOSIS_V7 = 10;
const hasilV7 = R.periksaResep(V7, DOSIS_V7);
const dekat = (a, b, toleransi) => Math.abs(a - b) <= toleransi;

// Angka resmi dari dokumen "Duta Repro — review resep awal & formulasi
// final" (5 Okt 2026), bagian 4.
const RESMI = [
  ["Tepung hijauan", 65.45, 6.54],
  ["Kalsium karbonat", 34.00, 3.40],
  ["Vitamin E asetat 50%", 0.536, 0.05],
  ["Vitamin D3", 0.0164, 0.00164],
];
if (!hasilV7) {
  temuan.push("periksaResep: tidak bisa membaca resep v7");
} else {
  if (!hasilV7.seimbang) temuan.push(`periksaResep: v7 dianggap tidak seimbang (selisih ${hasilV7.selisihPersen.toFixed(3)}%)`);
  RESMI.forEach(([nama, persen, perDosis], i) => {
    const b = hasilV7.bahan[i];
    if (!dekat(b.persen, persen, 0.01)) {
      temuan.push(`periksaResep: "${nama}" ${b.persen.toFixed(4)}%, dokumen v7 menulis ${persen}%`);
    }
    if (!dekat(b.perDosisGram, perDosis, 0.005)) {
      temuan.push(`periksaResep: "${nama}" ${b.perDosisGram.toFixed(5)} g per dosis, dokumen v7 menulis ${perDosis} g`);
    }
  });
  const d3 = hasilV7.bahan[3];
  if (!d3.mikro) temuan.push("periksaResep: Vitamin D3 tidak ditandai bahan mikro — pengenceran bertingkat jadi tidak diingatkan");
  if (hasilV7.bahan[0].mikro) temuan.push("periksaResep: pembawa utama salah ditandai bahan mikro");

  // Kandungan per ekor per hari, angka yang dibandingkan dengan rentang
  // rujukan. Kalsium karbonat 40,04% kalsium menurut massa molekulnya.
  const caMg = hasilV7.bahan[1].perDosisGram * 1000 * 0.4004;
  if (!dekat(caMg, 1360, 15)) temuan.push(`periksaResep: kalsium ${Math.round(caMg)} mg/ekor/hari, dokumen v7 menulis 1.360 mg`);
  const d3IU = hasilV7.bahan[3].perDosisGram * 100000;
  if (!dekat(d3IU, 164, 2)) temuan.push(`periksaResep: vitamin D3 ${d3IU.toFixed(1)} IU/ekor/hari, dokumen v7 menulis 164 IU`);
  const eMg = hasilV7.bahan[2].perDosisGram * 1000 * 0.5;
  if (!dekat(eMg, 26.8, 0.5)) temuan.push(`periksaResep: vitamin E aktif ${eMg.toFixed(1)} mg/ekor/hari, dokumen v7 menulis 26,8 mg`);
}

/*
 * Minimum stok tiap bahan harus menutupi SATU BATCH.
 *
 * "Stok di atas minimum" dibaca orang sebagai "aman, bisa jalan". Untuk bahan
 * racikan itu hanya benar kalau minimumnya sendiri setidaknya sebesar satu
 * batch. Pada 5 Okt 2026 tidak: resep pindah ke v7 (batch 28 kg) sementara
 * minimumnya tertinggal di ukuran v5 — tepung hijauan 12.000 g untuk kebutuhan
 * 18.325 g, kalsium 5.500 g untuk kebutuhan 9.520 g. Peringatannya menyala
 * terlambat, dan terlambat untuk bahan yang harus dibeli dulu berarti betina
 * berhenti menerima racikannya.
 */
const BARANG_V7 = [
  { id: "i-hijauan", sku: "VIT-REP20", name: "Tepung hijauan", minimum_stock: 18400 },
  { id: "i-kalsium", sku: "VIT-REP07", name: "Kalsium karbonat", minimum_stock: 9600 },
  { id: "i-vite", sku: "VIT-REP01", name: "Vitamin E", minimum_stock: 160 },
  { id: "i-vitd", sku: "VIT-REP02", name: "Vitamin D3", minimum_stock: 10 },
];
const RESEP_V7_BERBARANG = {
  yield_kg: 28,
  ingredients: [
    { item_id: "i-hijauan", item_name: "Tepung hijauan", quantity_kg: 18.3254 },
    { item_id: "i-kalsium", item_name: "Kalsium karbonat", quantity_kg: 9.52 },
    { item_id: "i-vite", item_name: "Vitamin E", quantity_kg: 0.15 },
    { item_id: "i-vitd", item_name: "Vitamin D3", quantity_kg: 0.0046 },
  ],
};
const kurangCukup = R.minimumTidakCukupSebatch(RESEP_V7_BERBARANG, BARANG_V7);
if (kurangCukup.length > 0) {
  for (const k of kurangCukup) {
    temuan.push(`minimumTidakCukupSebatch: ${k.sku} minimum ${k.minimumGram} g < satu batch ${k.butuhGram} g`);
  }
}
// Dan ia harus BISA merah: minimum ukuran v5 pada resep v7.
const BARANG_V5 = BARANG_V7.map((b) =>
  b.sku === "VIT-REP20" ? { ...b, minimum_stock: 12000 }
  : b.sku === "VIT-REP07" ? { ...b, minimum_stock: 5500 } : b);
const kurangV5 = R.minimumTidakCukupSebatch(RESEP_V7_BERBARANG, BARANG_V5);
if (kurangV5.length !== 2) {
  temuan.push(`minimumTidakCukupSebatch: minimum ukuran v5 seharusnya memberi 2 temuan, memberi ${kurangV5.length}`);
}
// Bahan yang tidak ada di gudang dilewati, bukan dianggap kurang.
if (R.minimumTidakCukupSebatch(RESEP_V7_BERBARANG, []).length !== 0) {
  temuan.push("minimumTidakCukupSebatch: bahan tanpa barang gudang seharusnya dilewati");
}

/* ── Usulan poin Inisiatif dari AI: keluarannya tidak pernah dipercaya ──
 *
 * Poin Inisiatif berakhir menjadi UANG lewat bonus poin bulanan. Model bahasa
 * akan dengan senang hati menjawab 12 ketika pilihannya hanya 0/5/10/15,
 * menjawab "sepuluh", menjawab 10000, atau menjawab null — dan `Number(null)`
 * adalah 0, yang biasanya ADA di daftar pilihan. Tanpa pemeriksaan tipe,
 * jawaban kosong terbaca sebagai "mengusulkan 0 dengan sah".
 *
 * Yang dijaga: apa pun yang dijawab model, yang keluar selalu salah satu
 * pilihan yang benar-benar diizinkan peternakan, DAN layar diberi tahu kalau
 * angkanya terpaksa dibetulkan.
 */
const OPSI_UJI = [0, 5, 10, 15];
const usulUji = [
  ["angka sah 10", { poin: 10, alasan: "ok" }, 10, false],
  ["angka sah 0", { poin: 0, alasan: "ok" }, 0, false],
  ["di luar daftar 12", { poin: 12, alasan: "ok" }, 10, true],
  ["jauh di atas", { poin: 10000, alasan: "ok" }, 15, true],
  ["teks", { poin: "sepuluh", alasan: "ok" }, 0, true],
  ["null", { poin: null, alasan: "ok" }, 0, true],
  ["string kosong", { poin: "", alasan: "ok" }, 0, true],
  ["negatif", { poin: -5, alasan: "ok" }, 0, true],
  ["hasil kosong", null, 0, true],
];
for (const [nama, hasil, poinHarap, betulHarap] of usulUji) {
  const r = UP.bacaUsul(hasil, OPSI_UJI);
  if (r.poin !== poinHarap) temuan.push(`bacaUsul: ${nama} -> poin ${r.poin}, seharusnya ${poinHarap}`);
  if (r.dibetulkan !== betulHarap) temuan.push(`bacaUsul: ${nama} -> dibetulkan ${r.dibetulkan}, seharusnya ${betulHarap}`);
  if (!OPSI_UJI.includes(r.poin)) temuan.push(`bacaUsul: ${nama} -> ${r.poin} bukan salah satu pilihan yang sah`);
}
// Tanpa alasan = keyakinan turun ke rendah, apa pun yang diakui model.
const tanpaAlasan = UP.bacaUsul({ poin: 5, alasan: "", keyakinan: "tinggi" }, OPSI_UJI);
if (tanpaAlasan.keyakinan !== "rendah") {
  temuan.push(`bacaUsul: usulan tanpa alasan seharusnya berkeyakinan rendah, terbaca ${tanpaAlasan.keyakinan}`);
}
// Prompt harus MENYEBUT pilihan yang sah — kalau tidak, model menebak sendiri.
const prompt = UP.promptUsulPoin({ judul: "Nambal kolam azola", opsi: OPSI_UJI, maks: 30, terpakai: 10 });
for (const harus of ["0, 5, 10, 15", "Nambal kolam azola", "sisa kuota", "Sisa kuota"]) {
  if (!prompt.toLowerCase().includes(harus.toLowerCase())) {
    temuan.push(`promptUsulPoin: tidak menyebut "${harus}"`);
  }
}
// Bila pekerjaannya sudah ada di checklist, model HARUS diberi tahu — kalau
// tidak, ia mengusulkan poin penuh untuk pekerjaan yang poinnya sudah ada di
// tempat lain, dan penilai menyetujuinya tanpa tahu.
const promptMirip = UP.promptUsulPoin({
  judul: "Siram tanaman", opsi: OPSI_UJI, maks: 30, terpakai: 0,
  tugasChecklist: { judul: "Siram tanaman", poin: 5, frekuensi: "harian" },
});
for (const harus of ["checklist", "harian", "5 poin", "TERKECIL"]) {
  if (!promptMirip.includes(harus)) temuan.push(`promptUsulPoin (mirip checklist): tidak menyebut "${harus}"`);
}
if (prompt.includes("TERKECIL")) {
  temuan.push("promptUsulPoin: menyuruh poin TERKECIL padahal tidak ada tugas checklist yang mirip");
}

/* ── Inisiatif yang sebenarnya sudah ada di checklist ────────────────────
 *
 * "Siram tanaman" adalah tugas SOP HARIAN bernilai 5 poin, dan ada 8 catatan
 * Inisiatif berjudul persis itu — masing-masing bernilai NOL, karena Inisiatif
 * masuk dengan poin_earned 0. Bukan dibayar dua kali: dibayar nol kali.
 *
 * Judul-judul di bawah ini SELURUHNYA dari data nyata 6 Okt 2026, termasuk
 * empat yang versi pertama pencocok ini SALAH anggap mirip. Keempatnya ada di
 * sini justru supaya tidak kembali: pencocok yang memperingatkan kiper tentang
 * pekerjaan yang sebenarnya berbeda akan diabaikan, termasuk ketika ia benar.
 */
const SOP_UJI = [
  { title: "Siram tanaman", points: 5, frequency: "harian" },
  { title: "Pembersihan kandang (all kandang)", points: 8, frequency: "mingguan" },
  { title: "Kebersihan jalan area kandang (2 bulan sekali, bulan ganjil)", points: 15, frequency: "bulanan" },
  { title: "Bersihkan rumput di pagar (1 bulan sekali)", points: 15, frequency: "bulanan" },
  { title: "Potong bunga sepatu & rumput liar + tambahan (Minggu)", points: 15, frequency: "mingguan" },
  { title: "Pupuk pohon buah (1 bulan sekali)", points: 10, frequency: "bulanan" },
  { title: "Cari kaktus untuk pakan kura (Minggu)", points: 15, frequency: "mingguan" },
  { title: "Cuci rumput / sayuran rempesan (pagi)", points: 10, frequency: "mingguan" },
  { title: "Pemberian pakan kura (siang)", points: 10, frequency: "mingguan" },
  { title: "Perawatan tanaman detail (pangkas & rapikan)", points: 10, frequency: "mingguan" },
  { title: "Kebersihan lingkungan & jalan (sapu area, Senin-Sabtu)", points: 5, frequency: "mingguan" },
  { title: "Perawatan kolam azolla (cek air, buang kotoran)", points: 5, frequency: "mingguan" },
];

// [judul Inisiatif nyata, judul tugas yang harus cocok atau null]
const miripUji = [
  ["Siram tanaman", "Siram tanaman"],
  ["Bersihkan kandang pagi", "Pembersihan kandang (all kandang)"],
  ["Bersihkan kandang bonsai", "Pembersihan kandang (all kandang)"],
  // Empat kecocokan SALAH dari versi pertama:
  ["Bersihkan tempat cuci rumput", null],
  ["Pangkas pohon buah juwet", null],
  ["Cabut rumput liar", null],
  ["Nyabuti rumput liar", null],
  // Pekerjaan harian yang memang TIDAK ada di checklist mana pun:
  ["Cari rumput", null],
  ["Pakan adabra", null],
  ["Kasik pakan adabra", null],
  ["Bersihkan tempat tamu", null],
  ["Siram odot", null],
  ["Nambal kolam azola", null],
  ["Rapikan tanaman angrek", null],
  ["Bersihkan aquarium dan kasibo", null],
  ["Nambal tempat minum yg bocor w1w2 e5", null],
  // Judul kosong tidak boleh cocok dengan apa pun.
  ["", null],
  ["   ", null],
];

for (const [judul, harap] of miripUji) {
  const cocok = MT.tugasMirip(judul, SOP_UJI);
  const dapat = cocok ? cocok.judul : null;
  if (dapat !== harap) {
    temuan.push(`tugasMirip("${judul}") -> ${dapat === null ? "tidak cocok" : `"${dapat}"`}, seharusnya ${harap === null ? "tidak cocok" : `"${harap}"`}`);
  }
  if (cocok && !(cocok.skor >= MT.AMBANG_MIRIP)) {
    temuan.push(`tugasMirip("${judul}") -> skor ${cocok.skor} di bawah ambang ${MT.AMBANG_MIRIP}`);
  }
}

/*
  Empat tugas baru, dan enam cara kiper menuliskannya.

  Sejak 7 Oktober 2026 keempat pekerjaan yang paling sering dicatat sebagai
  Inisiatif punya barisnya sendiri di checklist. Kedua kiper belum tentu
  langsung memakai barisnya: pada hari pertama keduanya masih mencatat
  "Cari rumput" dan "Pakan adabra" lewat tombol Inisiatif seperti biasa.

  Yang menjaga pemilik dari membayarnya dua kali adalah peringatan di layar
  penilaian — "mirip tugas checklist X, 5 poin". Kalau pencocoknya meleset,
  peringatannya tidak muncul, dan pekerjaan yang sudah punya barisnya dibayar
  sekali lagi tanpa ada yang tahu. Judul-judul di sebelah kiri seluruhnya
  tulisan kiper yang nyata.

  Tandanya halus: "Pakan adabra" hanya cocok dengan "Pakan adabra (Aldabra) -
  pagi" karena bagian dalam tanda kurung dan kata waktunya memang dibuang
  pencocoknya. Kalau pembuangan itu hilang, skornya jatuh ke 0,5 — di bawah
  ambang — dan peringatannya diam.
*/
const SOP_BARU = [
  { title: "Cari rumput untuk pakan", points: 5, frequency: "mingguan" },
  { title: "Pakan adabra (Aldabra) - pagi", points: 5, frequency: "harian" },
  { title: "Bersihkan tempat cuci rumput", points: 5, frequency: "mingguan" },
  { title: "Bersihkan tempat tamu", points: 5, frequency: "mingguan" },
];

const miripBaruUji = [
  ["Cari rumput", "Cari rumput untuk pakan"],
  ["Cari pakan", "Cari rumput untuk pakan"],
  ["Pakan adabra", "Pakan adabra (Aldabra) - pagi"],
  ["Kasik pakan adabra", "Pakan adabra (Aldabra) - pagi"],
  ["Bersihkan tempat cuci rumput", "Bersihkan tempat cuci rumput"],
  ["Bersihkan tempat tamu", "Bersihkan tempat tamu"],
  // Pekerjaan lain yang tetap tidak boleh ikut tertuduh:
  ["Siram tanaman", null],
  ["Bersihkan kandang bonsai", null],
  ["Nambal kolam azola", null],
];

for (const [judul, harap] of miripBaruUji) {
  const cocok = MT.tugasMirip(judul, SOP_BARU);
  const dapat = cocok ? cocok.judul : null;
  if (dapat !== harap) {
    temuan.push(`tugasMirip baru ("${judul}") -> ${dapat === null ? "tidak cocok" : `"${dapat}"`}, seharusnya ${harap === null ? "tidak cocok" : `"${harap}"`}`);
  }
}

// Pesannya harus MENYEBUT tugas penggantinya dan poinnya — peringatan tanpa
// jalan keluar hanya membuat orang bingung di tempat yang sama.
const pesanCocok = MT.pesanMirip(MT.tugasMirip("Siram tanaman", SOP_UJI));
for (const harus of ["Siram tanaman", "5 poin", "checklist"]) {
  if (!pesanCocok.includes(harus)) temuan.push(`pesanMirip: tidak menyebut "${harus}"`);
}
if (MT.pesanMirip(null) !== "") temuan.push("pesanMirip(null) seharusnya kosong");

// Daftar tugas kosong atau tak bernama tidak boleh melempar.
try {
  MT.tugasMirip("Siram tanaman", []);
  MT.tugasMirip("Siram tanaman", null);
  MT.tugasMirip("Siram tanaman", [{}, { title: "" }, null]);
} catch (e) {
  temuan.push(`tugasMirip: melempar pada daftar tugas kosong (${e?.message || e})`);
}

/* ── Poin Inisiatif yang dinilai harus mengenai baris yang benar ─────────
 *
 * `terapkanPoin` tidak diuji di sini karena ia butuh base44; yang diuji adalah
 * kunci pencocokannya, yang menentukan baris mana yang kena. Barisnya salah =
 * poin dituliskan ke pekerjaan lain, atau tidak dituliskan sama sekali.
 *
 * Kolom `notes` dipakai dua arti sekaligus: nama kandang untuk tugas
 * berkandang, dan penanda jenis untuk yang tidak. Penanda jenis Inisiatif
 * sendiri sudah berubah sekali — dari "Tugas Tambahan" menjadi "Inisiatif" —
 * dan bila penanda ikut dihitung sebagai kandang, satu pekerjaan yang sama
 * terbaca sebagai dua baris berbeda.
 */
const tugasUji = [
  // Satu hari nyata: tugas SOP "Siram tanaman" DAN Inisiatif berjudul sama.
  { task_title: "Siram tanaman", notes: "Tugas Harian", points: 5 },
  { task_title: "Siram tanaman", notes: "Inisiatif", points: 0 },
  { task_title: "Kebersihan W1", notes: "W1", points: 23 },
  { task_title: "Cari rumput", notes: "Tugas Tambahan", points: 0 },
];
const barisUji = [
  // [judul, kandang/penanda, indeks baris yang harus ketemu]
  ["Kebersihan W1", "W1", 2],
  ["Kebersihan W1", "W2", -1],                 // kandang beda = tugas beda
  ["Siram tanaman", "Tugas Harian", 0],        // tugas SOP-nya
  ["Siram tanaman", "", 0],                    // penanda jenis = kandang kosong
  ["Siram tanaman", "Suplemen", 0],
  // INI yang paling penting: Inisiatif berjudul sama dengan tugas SOP harus
  // mengenai BARISNYA SENDIRI. Bila penanda "Inisiatif" ikut dinormalkan
  // menjadi kosong, poin Inisiatif akan dituliskan ke baris tugas SOP —
  // menimpa 5 poin yang sudah sah di sana.
  ["Siram tanaman", "Inisiatif", 1],
  ["siram tanaman", "inisiatif", 1],
  ["  Siram tanaman  ", "Inisiatif", 1],
  ["Cari rumput", "Tugas Tambahan", 3],
  ["Cari rumput", "Inisiatif", -1],            // penanda lama vs baru = baris beda
  ["Cari rumput", "W1", -1],
  ["Siram odot", "Inisiatif", -1],
  ["", "", -1],
];
for (const [judul, kandang, harap] of barisUji) {
  const dapat = KT.cariTugas(tugasUji, judul, kandang);
  if (dapat !== harap) {
    temuan.push(`cariTugas("${judul}", "${kandang}") -> ${dapat}, seharusnya ${harap}`);
  }
}
// Penanda "Inisiatif" TIDAK boleh dinormalkan menjadi kandang kosong: kalau ia
// kosong, kunci Inisiatif "Siram tanaman" sama dengan kunci tugas SOP "Siram
// tanaman", dan poin Inisiatif menimpa poin tugas SOP.
if (KT.normalKandang("Inisiatif") === "") {
  temuan.push('normalKandang: penanda "Inisiatif" dikosongkan — kunci Inisiatif jadi sama dengan kunci tugas SOP berjudul sama');
}
if (KT.normalKandang("Tugas Harian") !== "" || KT.normalKandang("Suplemen") !== "") {
  temuan.push("normalKandang: penanda tugas harian/suplemen seharusnya menjadi kandang kosong");
}
if (KT.normalKandang("W1") !== "w1") {
  temuan.push("normalKandang: nama kandang sungguhan tidak boleh dikosongkan");
}

/* ── Poin yang disetujui untuk satu judul di satu hari dijumlahkan ───────
 *
 * Kiper bisa mencatat judul yang sama dua kali sehari — "Cari rumput" pagi dan
 * sore. Di checklist keduanya mengenai SATU baris, karena `onMaintenanceDone`
 * menyatukan baris berjudul sama. Jadi yang dituliskan ke baris itu harus
 * JUMLAH poin yang disetujui untuk judul itu hari itu; menuliskan poin satu
 * catatan saja berarti penilaian kedua menimpa yang pertama.
 */
const logUji = [
  { is_extra: true, item_label: "Cari rumput", done_by_email: "a@x.id", period_key: "2026-10-06", approval_status: "approved", poin_earned: 5 },
  { is_extra: true, item_label: "cari rumput ", done_by_email: "a@x.id", period_key: "2026-10-06", approval_status: "approved", poin_earned: 10 },
  // Nilai yang BELUM disetujui tidak boleh ikut, meski angkanya sudah terisi:
  // yang menentukan status persetujuannya, bukan ada tidaknya angka.
  { id: "menunggu", is_extra: true, item_label: "Cari rumput", done_by_email: "a@x.id", period_key: "2026-10-06", approval_status: "pending", poin_earned: 7 },
  { is_extra: true, item_label: "Cari rumput", done_by_email: "a@x.id", period_key: "2026-10-06", approval_status: "rejected", poin_earned: 5 },
  { is_extra: true, item_label: "Cari rumput", done_by_email: "b@x.id", period_key: "2026-10-06", approval_status: "approved", poin_earned: 15 },
  { is_extra: true, item_label: "Cari rumput", done_by_email: "a@x.id", period_key: "2026-10-05", approval_status: "approved", poin_earned: 15 },
  { is_extra: true, item_label: "Cari rumput", done_by_email: "a@x.id", period_key: "2026-10-06", approval_status: "approved", poin_earned: 5, is_test_data: true },
  { is_extra: false, item_label: "Cari rumput", done_by_email: "a@x.id", period_key: "2026-10-06", approval_status: "approved", poin_earned: 99 },
];
const jumlahUji = [
  // [judul, email, tanggal, tambahan {id,poin}, jumlah yang diharapkan]
  ["Cari rumput", "a@x.id", "2026-10-06", null, 15],      // 5 + 10, bukan yang pending/orang lain/hari lain/uji
  ["Siram tanaman", "a@x.id", "2026-10-06", null, 0],
  ["Cari rumput", "a@x.id", "2026-10-07", null, 0],
];
for (const [judul, email, tanggal, , harap] of jumlahUji) {
  const dapat = PK.poinJudulHari(logUji, { judul, email, tanggal });
  if (dapat !== harap) {
    temuan.push(`poinJudulHari("${judul}", ${tanggal}) -> ${dapat}, seharusnya ${harap}`);
  }
}
// Catatan yang SEDANG dinilai harus ikut dihitung dengan angka barunya, bukan
// dengan angka lamanya yang masih nol di dalam daftar.
const denganBaru = PK.poinJudulHari(logUji, {
  judul: "Cari rumput", email: "a@x.id", tanggal: "2026-10-06",
  tambahan: { log: { id: "menunggu" }, poin: 10 },
});
if (denganBaru !== 25) {
  temuan.push(`poinJudulHari dengan catatan yang sedang dinilai -> ${denganBaru}, seharusnya 25`);
}

/* ── terapkanPoin: barisnya berubah, DAN totalnya ikut berubah ───────────
 *
 * `total_points_claimed` adalah angka yang dilihat pemilik di layar Approval
 * Poin dan yang ia setujui. Kalau barisnya diubah tetapi totalnya dihitung dari
 * daftar yang LAMA, yang disetujui bukan yang tertulis — dan tidak ada yang
 * memberi tahu, karena keduanya tampak wajar.
 */
const terap1 = PK.terapkanPoin(tugasUji, { judul: "Siram tanaman", kandang: "Inisiatif", poin: 10 });
if (!terap1.ketemu || !terap1.berubah) temuan.push("terapkanPoin: baris Inisiatif tidak ditemukan atau tidak berubah");
if (terap1.tugas[1]?.points !== 10) temuan.push(`terapkanPoin: baris Inisiatif bernilai ${terap1.tugas[1]?.points}, seharusnya 10`);
if (terap1.tugas[0]?.points !== 5) temuan.push("terapkanPoin: baris tugas SOP berjudul sama ikut berubah");
if (terap1.totalBaru !== PK.totalPoinTugas(terap1.tugas)) {
  temuan.push(`terapkanPoin: totalBaru ${terap1.totalBaru} tidak sama dengan jumlah barisnya ${PK.totalPoinTugas(terap1.tugas)}`);
}
if (terap1.totalBaru !== 38) temuan.push(`terapkanPoin: totalBaru ${terap1.totalBaru}, seharusnya 38 (5+10+23+0)`);
if (tugasUji[1].points !== 0) temuan.push("terapkanPoin: daftar aslinya ikut diubah (harus salinan)");

const terap2 = PK.terapkanPoin(tugasUji, { judul: "Siram tanaman", kandang: "Inisiatif", poin: 0 });
if (terap2.berubah) temuan.push("terapkanPoin: nilai yang sama seharusnya tidak dianggap berubah");

const terap3 = PK.terapkanPoin(tugasUji, { judul: "Tidak ada ini", kandang: "Inisiatif", poin: 10 });
if (terap3.ketemu || terap3.berubah) temuan.push("terapkanPoin: baris yang tidak ada seharusnya ketemu=false");

const terap4 = PK.terapkanPoin(tugasUji, { judul: "Siram tanaman", kandang: "Inisiatif", poin: -5 });
if (terap4.tugas[1]?.points !== 0) temuan.push("terapkanPoin: poin negatif seharusnya menjadi 0");

// Pesan status: yang penting hari yang sudah disetujui DIKATAKAN, bukan didiamkan.
const pesanSudah = PK.pesanStatus({ status: PK.STATUS.SUDAH_DISETUJUI, tanggal: "2026-10-03" });
for (const harus of ["sudah disetujui", "2026-10-03"]) {
  if (!pesanSudah.includes(harus)) temuan.push(`pesanStatus(sudah-disetujui): tidak menyebut "${harus}"`);
}
if (PK.pesanStatus({ status: PK.STATUS.TERSIMPAN }) !== "") {
  temuan.push("pesanStatus(tersimpan) seharusnya kosong — tidak ada yang perlu dikatakan");
}

/* ── Anakan: satu aturan, dan umurnya yang menentukan ────────────────────
 *
 * Sampai 7 Okt 2026 "apakah kura ini anakan" dijawab tiga cara di tiga
 * berkas, dan yang ketiga menjawab NOL untuk seluruh data — ia menyaring
 * `status: "baby"`, status yang sudah dimigrasikan keluar. Nol itu dipakai
 * untuk menyembunyikan tugas "Jemur matahari pagi — SEMUA BABY", jadi lima
 * belas tukik berumur tiga bulan tidak punya tugas menjemur di layar kiper.
 *
 * Bentuk-bentuk kura di bawah ini seluruhnya ada di data peternakan: tukik
 * 8 Juli 2026 (EggGrid), bentuk lama HatchDialog, indukan 2010 tanpa
 * age_category, dan tukik yang sudah terjual.
 */
const HARI_UJI = new Date("2026-10-07T00:00:00Z");
const anakanUji = [
  // [nama kasus, kura, apakah anakan]
  ["tukik EggGrid 8 Juli 2026", { status: "aktif", age_category: "baby", birth_date: "2026-07-08" }, true],
  ["tukik bentuk lama HatchDialog", { status: "baby", birth_date: "2026-07-08" }, true],
  ["tukik tanpa tanggal lahir, kolomnya baby", { status: "aktif", age_category: "baby" }, true],
  ["tukik yang sudah terjual", { status: "terjual", age_category: "baby", birth_date: "2026-07-08" }, false],
  ["tukik yang mati", { status: "mati", age_category: "baby", birth_date: "2026-07-08" }, false],
  ["tukik yang diarsipkan", { status: "aktif", age_category: "baby", birth_date: "2026-07-08", is_archived: true }, false],
  // Umurnya yang menentukan, bukan kolomnya: kolom age_category tidak pernah
  // dihitung ulang sejak ditulis saat menetas.
  ["kura 2 tahun yang kolomnya masih baby", { status: "aktif", age_category: "baby", birth_date: "2024-07-08" }, false],
  ["indukan 2010 tanpa age_category", { status: "aktif", birth_date: "2010-01-01" }, false],
  ["kura 2021 (remaja)", { status: "aktif", birth_date: "2021-01-01" }, false],
  ["kura sakit yang masih tukik", { status: "sakit", birth_date: "2026-07-08" }, true],
  ["tanpa data apa pun", { status: "aktif" }, false],
  ["null", null, false],
];
for (const [nama, kura, harap] of anakanUji) {
  const dapat = AN.anakan(kura, HARI_UJI);
  if (dapat !== harap) temuan.push(`anakan [${nama}] -> ${dapat}, seharusnya ${harap}`);
}

// Komposisi: bentuk nyata peternakan pada 7 Okt 2026 (135 di kebun).
const kebunUji = [
  ...Array(112).fill(null).map(() => ({ status: "aktif", birth_date: "2010-01-01" })),
  ...Array(8).fill(null).map(() => ({ status: "aktif", birth_date: "2021-01-01" })),
  ...Array(15).fill(null).map(() => ({ status: "aktif", age_category: "baby", birth_date: "2026-07-08" })),
  ...Array(43).fill(null).map(() => ({ status: "terjual", birth_date: "2010-01-01" })),
  { status: "aktif" },   // tanpa tanggal lahir dan tanpa kolom umur
];
const ringkas = AN.ringkasUmur(kebunUji, HARI_UJI);
const ringkasHarap = { total: 136, anakan: 15, remaja: 8, dewasa: 112, takDiketahui: 1 };
for (const [kunci, nilai] of Object.entries(ringkasHarap)) {
  if (ringkas[kunci] !== nilai) temuan.push(`ringkasUmur.${kunci} -> ${ringkas[kunci]}, seharusnya ${nilai}`);
}
if (ringkas.anakan + ringkas.remaja + ringkas.dewasa + ringkas.takDiketahui !== ringkas.total) {
  temuan.push("ringkasUmur: bagian-bagiannya tidak berjumlah sama dengan totalnya");
}
// Yang sudah terjual tidak boleh ikut: 43 di daftar, nol di hitungan.
if (ringkas.total !== 136) temuan.push(`ringkasUmur: total ${ringkas.total} memuat kura yang sudah keluar`);

const kalimat = AN.kalimatKomposisi(ringkas);
for (const harus of ["112 dewasa", "8 remaja", "15 anakan"]) {
  if (!kalimat.includes(harus)) temuan.push(`kalimatKomposisi: tidak menyebut "${harus}" (${kalimat})`);
}
// Bagian yang nol dibuang — baris ubinnya sempit.
const tanpaRemaja = AN.kalimatKomposisi({ total: 3, dewasa: 3, remaja: 0, anakan: 0, takDiketahui: 0 });
if (tanpaRemaja.includes("0 ")) temuan.push(`kalimatKomposisi: bagian nol ikut ditulis (${tanpaRemaja})`);
if (AN.kalimatKomposisi({ total: 0 }) !== "") temuan.push("kalimatKomposisi: peternakan kosong seharusnya tanpa kalimat");

// Tetapan pembuatan tukik: dipakai KEDUA pintu penetasan, jadi bentuknya harus
// yang baru — status "baby" membuat tukik tidak terbaca sebagai kura aktif.
if (AN.TANDA_ANAKAN.status !== "aktif" || AN.TANDA_ANAKAN.age_category !== "baby") {
  temuan.push(`TANDA_ANAKAN salah bentuk: ${JSON.stringify(AN.TANDA_ANAKAN)}`);
}
if (!AN.anakan({ ...AN.TANDA_ANAKAN, birth_date: "2026-10-01" }, HARI_UJI)) {
  temuan.push("TANDA_ANAKAN: tukik yang baru dibuat dengan tetapan ini tidak terbaca sebagai anakan");
}

/* ── Pembayaran surut Inisiatif: hitungan UANG, sekali jalan ─────────────
 *
 * Fungsi bayarInisiatifSurut dijalankan SEKALI untuk 210 catatan dua orang.
 * Sekali jalan berarti tidak ada kesempatan kedua untuk memperhatikan bahwa
 * angkanya keliru: slip sudah dicetak, orang sudah dibayar, dan yang tersisa
 * hanya menelusuri ke belakang. Jadi keputusannya diuji di sini lebih dulu,
 * dengan bentuk-bentuk hari yang benar-benar ada di data peternakan ini.
 */
const barisSOP = (judul, poin, penanda) => ({ task_title: judul, notes: penanda || "Tugas Harian", points: poin });
const logInisiatif = (id, judul, jam) => ({ id, item_label: judul, enclosure_name: "Inisiatif", done_at: jam });

const hariUji = [
  {
    nama: "hari biasa: dua Inisiatif, keduanya dibayar penuh",
    masuk: {
      logs: [logInisiatif("a", "Cari rumput", "08:00"), logInisiatif("b", "Pakan adabra", "09:00")],
      baris: [barisSOP("Cari rumput", 0, "Inisiatif"), barisSOP("Pakan adabra", 0, "Inisiatif"), barisSOP("Kebersihan W1", 23, "W1")],
    },
    poin: [5, 5], sebab: ["dibayar", "dibayar"], totalBaru: 10 + 23, selisih: 10,
  },
  {
    nama: "judul yang sama sudah berpoin di baris tugas SOP → nol",
    masuk: {
      logs: [logInisiatif("a", "Siram tanaman", "16:00")],
      baris: [barisSOP("Siram tanaman", 5, "Tugas Harian"), barisSOP("Siram tanaman", 0, "Inisiatif")],
    },
    poin: [0], sebab: ["sudah-dibayar"], totalBaru: 5, selisih: 0,
  },
  {
    nama: "judul sama TAPI baris SOP-nya belum berpoin → tetap dibayar",
    masuk: {
      logs: [logInisiatif("a", "Siram tanaman", "16:00")],
      baris: [barisSOP("Siram tanaman", 0, "Tugas Harian"), barisSOP("Siram tanaman", 0, "Inisiatif")],
    },
    poin: [5], sebab: ["dibayar"], totalBaru: 5, selisih: 5,
  },
  {
    nama: "satu judul dicatat dua kali sehari → barisnya dapat JUMLAHNYA",
    masuk: {
      logs: [logInisiatif("a", "Cari rumput", "08:00"), logInisiatif("b", "Cari rumput", "15:00")],
      baris: [barisSOP("Cari rumput", 0, "Inisiatif")],
    },
    poin: [5, 5], sebab: ["dibayar", "dibayar"], totalBaru: 10, selisih: 10,
  },
  {
    nama: "enam Inisiatif sehari: 30 poin, tepat di batas",
    masuk: {
      logs: ["a", "b", "c", "d", "e", "f"].map((id, i) => logInisiatif(id, `Kerja ${id}`, `0${i}:00`)),
      baris: ["a", "b", "c", "d", "e", "f"].map((id) => barisSOP(`Kerja ${id}`, 0, "Inisiatif")),
    },
    poin: [5, 5, 5, 5, 5, 5], sebab: Array(6).fill("dibayar"), totalBaru: 30, selisih: 30,
  },
  {
    nama: "tujuh Inisiatif sehari: yang ketujuh kehabisan kuota",
    masuk: {
      logs: ["a", "b", "c", "d", "e", "f", "g"].map((id, i) => logInisiatif(id, `Kerja ${id}`, `0${i}:00`)),
      baris: ["a", "b", "c", "d", "e", "f", "g"].map((id) => barisSOP(`Kerja ${id}`, 0, "Inisiatif")),
    },
    poin: [5, 5, 5, 5, 5, 5, 0], sebab: [...Array(6).fill("dibayar"), "kuota-habis"], totalBaru: 30, selisih: 30,
  },
  {
    nama: "kuota sudah terpakai 28 poin → yang berikutnya terpotong jadi 2",
    masuk: {
      logs: [logInisiatif("a", "Cari rumput", "08:00"), logInisiatif("b", "Pakan adabra", "09:00")],
      baris: [barisSOP("Cari rumput", 0, "Inisiatif"), barisSOP("Pakan adabra", 0, "Inisiatif")],
      terpakai: 28,
    },
    poin: [2, 0], sebab: ["kuota-terpotong", "kuota-habis"], totalBaru: 2, selisih: 2,
  },
  {
    nama: "barisnya tidak ada di checklist → poin diputuskan, baris dilaporkan hilang",
    masuk: { logs: [logInisiatif("a", "Cari rumput", "08:00")], baris: [barisSOP("Kebersihan W1", 23, "W1")] },
    poin: [5], sebab: ["dibayar"], totalBaru: 23, selisih: 0, tanpaBaris: 1,
  },
  {
    nama: "checklist kosong",
    masuk: { logs: [logInisiatif("a", "Cari rumput", "08:00")], baris: [] },
    poin: [5], sebab: ["dibayar"], totalBaru: 0, selisih: 0, tanpaBaris: 1,
  },
  {
    nama: "tidak ada catatan: tidak ada yang berubah",
    masuk: { logs: [], baris: [barisSOP("Kebersihan W1", 23, "W1")] },
    poin: [], sebab: [], totalBaru: 23, selisih: 0,
  },
];

for (const kasus of hariUji) {
  /*
    Potret daftar barisnya diambil SEBELUM fungsi apa pun dipanggil.

    Versi pertama pemeriksaan ini mengambilnya SESUDAH pasangKeBaris dipanggil
    sekali, lalu memanggilnya lagi dan membandingkan. Kalau pemanggilan pertama
    sudah merusak daftarnya, potretnya memuat kerusakan itu dan pemanggilan
    kedua tidak mengubah apa-apa lagi — hijau. Diuji-merah dengan menghapus
    `.slice()` dan penjaganya memang tetap hijau; pemeriksaan yang mengukur
    sesudah kerusakan tidak mengukur apa pun.
  */
  const aslinya = JSON.stringify(kasus.masuk.baris || []);
  const { keputusan, perJudul } = BS.rencanaHari({ maks: 30, poinSatuan: 5, ...kasus.masuk });
  const poin = keputusan.map((k) => k.poin);
  const sebab = keputusan.map((k) => k.sebab);
  if (JSON.stringify(poin) !== JSON.stringify(kasus.poin)) {
    temuan.push(`bayarSurut [${kasus.nama}]: poin ${JSON.stringify(poin)}, seharusnya ${JSON.stringify(kasus.poin)}`);
  }
  if (JSON.stringify(sebab) !== JSON.stringify(kasus.sebab)) {
    temuan.push(`bayarSurut [${kasus.nama}]: sebab ${JSON.stringify(sebab)}, seharusnya ${JSON.stringify(kasus.sebab)}`);
  }
  const hasil = BS.pasangKeBaris(kasus.masuk.baris || [], perJudul);
  if (hasil.total !== kasus.totalBaru) {
    temuan.push(`bayarSurut [${kasus.nama}]: total baru ${hasil.total}, seharusnya ${kasus.totalBaru}`);
  }
  if (hasil.selisih !== kasus.selisih) {
    temuan.push(`bayarSurut [${kasus.nama}]: selisih ${hasil.selisih}, seharusnya ${kasus.selisih}`);
  }
  if ((kasus.tanpaBaris || 0) !== hasil.tanpaBaris) {
    temuan.push(`bayarSurut [${kasus.nama}]: baris hilang ${hasil.tanpaBaris}, seharusnya ${kasus.tanpaBaris || 0}`);
  }
  // Daftar baris aslinya tidak boleh ikut berubah: fungsi ini dipanggil saat
  // laporan kering disusun, SEBELUM ada keputusan menulis apa pun.
  if (JSON.stringify(kasus.masuk.baris || []) !== aslinya) {
    temuan.push(`bayarSurut [${kasus.nama}]: daftar baris aslinya ikut diubah`);
  }
  // Jumlah poin yang diberikan tidak boleh melewati batas harian.
  const diberikan = poin.reduce((j, p) => j + p, 0);
  if (diberikan + (kasus.masuk.terpakai || 0) > 30) {
    temuan.push(`bayarSurut [${kasus.nama}]: total ${diberikan + (kasus.masuk.terpakai || 0)} poin melewati batas 30`);
  }
}

/* ── Siklus bertelur: perkiraan yang harus mengaku tebakan ──────────────
 *
 * Pemilik menyebut polanya lebih dulu: "yang sudah bertelur cenderung
 * bertelur lagi bulan berikutnya, tapi tidak selalu". Data kebun ini
 * mendukungnya — lima jarak antar-clutch yang terukur, semuanya 23–30
 * hari, median 28.
 *
 * LIMA. Itu pengamatan, bukan statistik, dan seluruh layar hitung mundur
 * berdiri di atasnya. Maka yang diuji di sini bukan hanya angkanya, tetapi
 * juga KEJUJURANNYA: betina yang baru sekali bertelur tidak punya jarak
 * sendiri, dan layarnya harus mengatakan angkanya pinjaman dari kebun.
 * Perkiraan yang menyamarkan dari mana angkanya datang membuat orang
 * menyiapkan sarang untuk tanggal yang tidak pernah dijanjikan siapa pun.
 *
 * Tanggal di bawah ini seluruhnya catatan nyata kebun ini per 9 Okt 2026.
 */
const siklusUji = [
  {
    nama: "C23 — tiga clutch, punya jarak sendiri",
    tanggal: ["2026-08-12", "2026-09-09", "2026-10-02"],
    status: "menunggu", jarak: 26, sumber: "sendiri", keyakinan: "kuat",
  },
  {
    nama: "A31 — dua clutch, jaraknya baru sekali terukur",
    tanggal: ["2026-09-04", "2026-10-01"],
    status: "menunggu", jarak: 27, sumber: "sendiri-sekali", keyakinan: "sedang",
  },
  {
    nama: "C22 — sekali bertelur, meminjam median kebun",
    tanggal: ["2026-09-14"],
    status: "jendela", jarak: 28, sumber: "kebun", keyakinan: "lemah",
  },
  {
    nama: "A47 — di dalam jendela, sudah lewat perkiraan 5 hari",
    tanggal: ["2026-09-06"],
    status: "jendela", jarak: 28, sumber: "kebun", keyakinan: "lemah",
  },
  {
    nama: "C24 — indukan terbukti yang BERHENTI (184 hari)",
    tanggal: ["2026-03-09", "2026-04-08"],
    status: "berhenti", jarak: 30, sumber: "sendiri-sekali", keyakinan: "sedang",
  },
  {
    nama: "C14 — berhenti 207 hari, jaraknya pinjaman",
    tanggal: ["2026-03-16"],
    status: "berhenti", jarak: 28, sumber: "kebun", keyakinan: "lemah",
  },
  {
    nama: "tepat di tepi jendela (7 hari lagi) masih jendela",
    tanggal: ["2026-09-18"], status: "jendela", jarak: 28, sumber: "kebun", keyakinan: "lemah",
  },
  {
    nama: "delapan hari lagi sudah menunggu, bukan jendela",
    tanggal: ["2026-09-19"], status: "menunggu", jarak: 28, sumber: "kebun", keyakinan: "lemah",
  },
  {
    nama: "lewat 8 hari: telat, belum berhenti",
    tanggal: ["2026-09-03"], status: "telat", jarak: 28, sumber: "kebun", keyakinan: "lemah",
  },
  {
    nama: "belum pernah bertelur",
    tanggal: [], status: "belum-pernah", jarak: null, sumber: null, keyakinan: null,
  },
  {
    nama: "tanggal ganda dan tidak urut tetap dihitung sekali",
    tanggal: ["2026-10-02", "2026-08-12", "2026-09-09", "2026-10-02"],
    status: "menunggu", jarak: 26, sumber: "sendiri", keyakinan: "kuat",
  },
];

const HARI_INDUK = "2026-10-09";
for (const u of siklusUji) {
  const s = SB.siklusBetina(u.tanggal, { hariIni: HARI_INDUK, jarakKebun: 28 });
  if (s.status !== u.status) temuan.push(`siklusBetina [${u.nama}]: status ${s.status}, seharusnya ${u.status}`);
  if (s.jarakDipakai !== u.jarak) temuan.push(`siklusBetina [${u.nama}]: jarak ${s.jarakDipakai}, seharusnya ${u.jarak}`);
  if (s.sumberJarak !== u.sumber) temuan.push(`siklusBetina [${u.nama}]: sumber ${s.sumberJarak}, seharusnya ${u.sumber}`);
  if (s.keyakinan !== u.keyakinan) temuan.push(`siklusBetina [${u.nama}]: keyakinan ${s.keyakinan}, seharusnya ${u.keyakinan}`);
  /*
    Kejujuran sumbernya, diuji terpisah dari status: betina yang jaraknya
    DIPINJAM tidak boleh menyebutnya milik sendiri. Ini pemeriksaan yang
    paling mudah lolos tanpa sadar, karena angka perkiraannya tetap benar.
  */
  if (u.tanggal.length <= 1 && s.sumberJarak && s.sumberJarak.startsWith("sendiri")) {
    temuan.push(`siklusBetina [${u.nama}]: mengaku jarak sendiri padahal baru ${u.tanggal.length} clutch`);
  }
  if (s.perkiraan && (s.jendelaAwal >= s.perkiraan || s.jendelaAkhir <= s.perkiraan)) {
    temuan.push(`siklusBetina [${u.nama}]: jendela ${s.jendelaAwal}..${s.jendelaAkhir} tidak mengurung perkiraan ${s.perkiraan}`);
  }
}

/*
  Median kebun dihitung PER BETINA lebih dulu.

  Kalau seluruh tanggal dicampur jadi satu lalu diselisihkan, jarak antara
  clutch C23 dan clutch A46 akan terhitung sebagai sebuah siklus — padahal
  itu dua ekor berbeda. Pada data kebun ini campuran itu menghasilkan belasan
  jarak pendek palsu (beberapa nol dan satu hari), dan mediannya jatuh dari
  28 ke sekitar 2. Perkiraannya lalu menyuruh kiper menyiapkan sarang
  setiap dua hari.
*/
const brUji = [
  ["C6", "2026-10-09"], ["A46", "2026-10-04"], ["C23", "2026-10-02"], ["A31", "2026-10-01"],
  ["B108", "2026-09-30"], ["A48", "2026-09-26"], ["C22", "2026-09-14"], ["C23", "2026-09-09"],
  ["A47", "2026-09-06"], ["A31", "2026-09-04"], ["A46", "2026-09-04"], ["C23", "2026-08-12"],
  ["C24", "2026-04-08"], ["C14", "2026-03-16"], ["C24", "2026-03-09"],
].map(([f, d]) => ({ female_id: f, female_name: f, egg_laying_date: d }));

const kebunUjiInd = SB.jarakKebun(brUji);
if (JSON.stringify(kebunUjiInd.jarak) !== JSON.stringify([23, 27, 28, 30, 30])) {
  temuan.push(`jarakKebun: ${JSON.stringify(kebunUjiInd.jarak)}, seharusnya [23,27,28,30,30] — jarak dihitung antar betina yang berbeda?`);
}
if (kebunUjiInd.median !== 28) temuan.push(`jarakKebun: median ${kebunUjiInd.median}, seharusnya 28`);

// Urutan tampil: yang perlu disiapkan dulu, yang berhenti tidak menyelinap ke atas.
const urutUji = SB.urutkanSiklus([
  { nama: "berhenti", siklus: SB.siklusBetina(["2026-03-16"], { hariIni: HARI_INDUK, jarakKebun: 28 }) },
  { nama: "menunggu", siklus: SB.siklusBetina(["2026-09-25"], { hariIni: HARI_INDUK, jarakKebun: 28 }) },
  { nama: "jendela", siklus: SB.siklusBetina(["2026-09-14"], { hariIni: HARI_INDUK, jarakKebun: 28 }) },
]).map((r) => r.nama);
if (JSON.stringify(urutUji) !== JSON.stringify(["jendela", "menunggu", "berhenti"])) {
  temuan.push(`urutkanSiklus: ${JSON.stringify(urutUji)}, seharusnya ["jendela","menunggu","berhenti"]`);
}

/* ── Diagnosa indukan: rekam kandang, dan siapa yang dipertahankan ───────
 *
 * Satu pemindahan jantan menyentuh belasan betina; satu betina hanya
 * dirinya. Jadi keputusan "jantan mana yang dipertahankan di kandang
 * berisi banyak jantan" adalah keputusan paling berdampak di layar ini.
 *
 * Versi pertama memilihnya dengan `Set` berisi "pernah punya clutch" lalu
 * umur sebagai pemutus. Di kandang N — tujuh jantan — A35 (4 clutch dari 3
 * betina) dan A43 (1 clutch) sama-sama "pernah", jadi umur yang memutuskan,
 * dan usulannya memindahkan A35 KELUAR: jantan paling produktif kedua di
 * kebun ini. Jumlah clutch bukti yang jauh lebih kuat daripada umur.
 */
const barisKandangUji = [
  // N: 14 betina, 3 produktif, 7 jantan
  ...Array.from({ length: 14 }, (_, i) => ({
    id: `N${i}`, nama: `N${i}`, kandang: "N", umur: 10, clutch: i < 3 ? 1 : 0, purchaseDate: "2024-12-26",
    ayah: { jumlah: 7, kandidat: ["A43", "A35", "B10", "A34", "B1", "A49", "B45"], muda: [], hanyaMuda: false },
  })),
  // Bonsai 1: 9 betina, 0 produktif, 3 jantan
  ...Array.from({ length: 9 }, (_, i) => ({
    id: `BS${i}`, nama: `BS${i}`, kandang: "Bonsai 1", umur: 16, clutch: 0, purchaseDate: "2024-12-26",
    ayah: { jumlah: 3, kandidat: ["B6", "A23", "B9"], muda: [], hanyaMuda: false },
  })),
  // E1: 6 betina, jantannya ada tapi belum cukup umur
  ...Array.from({ length: 6 }, (_, i) => ({
    id: `E1${i}`, nama: `E1${i}`, kandang: "E1", umur: 6.5, clutch: 0, purchaseDate: null,
    ayah: { jumlah: 0, kandidat: [], muda: ["Yuwono"], hanyaMuda: true },
  })),
  // W3: 3 betina, 3 produktif, 1 jantan — kandang yang berhasil
  ...Array.from({ length: 3 }, (_, i) => ({
    id: `W3${i}`, nama: `W3${i}`, kandang: "W3", umur: 16, clutch: 2, purchaseDate: "2025-05-07",
    ayah: { jumlah: 1, kandidat: ["A36"], ayah: "A36", muda: [], hanyaMuda: false },
  })),
  // Satu betina sendirian: TIDAK boleh dipakai menilai kandangnya
  {
    id: "S1", nama: "S1", kandang: "Sendirian", umur: 16, clutch: 0, purchaseDate: "2024-12-26",
    ayah: { jumlah: 1, kandidat: ["X1"], ayah: "X1", muda: [], hanyaMuda: false },
  },
];

const rekamUji = DI.rekamKandang(barisKandangUji);
const cekKandang = [
  ["N", { betina: 14, produktif: 3, nolProduksi: false, bisaDinilai: true }],
  ["Bonsai 1", { betina: 9, produktif: 0, nolProduksi: true, bisaDinilai: true }],
  ["E1", { betina: 6, produktif: 0, nolProduksi: true, bisaDinilai: true }],
  ["W3", { betina: 3, produktif: 3, nolProduksi: false, bisaDinilai: true }],
  // Satu ekor bukan bukti tentang kandangnya.
  ["Sendirian", { betina: 1, produktif: 0, nolProduksi: false, bisaDinilai: false }],
];
for (const [nama, harap] of cekKandang) {
  const k = rekamUji.get(nama) || {};
  for (const [kolom, nilai] of Object.entries(harap)) {
    if (k[kolom] !== nilai) temuan.push(`rekamKandang [${nama}].${kolom}: ${k[kolom]}, seharusnya ${nilai}`);
  }
}

const usulUjiInd = DI.usulanJantan(rekamUji, {
  clutchJantan: new Map([["A35", 4], ["A43", 1], ["A36", 5]]),
  umurJantan: new Map([["A43", 8.4], ["A35", 16.8], ["B10", 16.8], ["B6", 16.8], ["A23", 18.8], ["B9", 16.8]]),
});
/*
  Fixture ini sengaja membuat UMUR dan JUMLAH CLUTCH berbeda pendapat.

  Versi pertama uji ini memakai umur kandang N yang sebenarnya — A35 paling
  tua DAN paling banyak clutch-nya — sehingga kedua aturan menunjuk ekor yang
  sama. Diuji-merah dengan menghapus perbandingan jumlah clutch, dan
  penjaganya tetap hijau: fixture yang membiarkan dua aturan berbeda memberi
  jawaban sama tidak menguji satu pun di antaranya.
*/
const usulBedaInd = DI.usulanJantan(
  DI.rekamKandang([
    { id: "x1", nama: "x1", kandang: "X", umur: 16, clutch: 0, purchaseDate: "2024-01-01",
      ayah: { jumlah: 2, kandidat: ["Tua", "Muda"], muda: [], hanyaMuda: false } },
    { id: "x2", nama: "x2", kandang: "X", umur: 16, clutch: 0, purchaseDate: "2024-01-01",
      ayah: { jumlah: 2, kandidat: ["Tua", "Muda"], muda: [], hanyaMuda: false } },
    { id: "x3", nama: "x3", kandang: "X", umur: 16, clutch: 0, purchaseDate: "2024-01-01",
      ayah: { jumlah: 2, kandidat: ["Tua", "Muda"], muda: [], hanyaMuda: false } },
  ]),
  { clutchJantan: new Map([["Muda", 4], ["Tua", 0]]), umurJantan: new Map([["Tua", 20], ["Muda", 7]]) },
);
const pertahankanBeda = usulBedaInd.berlebih.find((b) => b.kandang === "X")?.pertahankan;
if (pertahankanBeda !== "Muda") {
  temuan.push(
    `usulanJantan [umur vs clutch]: mempertahankan ${pertahankanBeda}, seharusnya "Muda" — ` +
    `4 clutch tercatat mengalahkan umur 20 tahun tanpa satu pun clutch`,
  );
}

const nUsul = usulUjiInd.berlebih.find((b) => b.kandang === "N");
if (nUsul?.pertahankan !== "A35") {
  temuan.push(`usulanJantan [N]: mempertahankan ${nUsul?.pertahankan}, seharusnya A35 — jantan dengan clutch terbanyak`);
}
if (nUsul && nUsul.pindahkan.includes("A35")) {
  temuan.push("usulanJantan [N]: mengusulkan memindahkan A35, jantan paling produktif di kandang itu");
}
const e1Usul = usulUjiInd.kurang.find((k) => k.kandang === "E1");
if (!e1Usul) temuan.push("usulanJantan: E1 tidak terdaftar sebagai kandang tanpa jantan dewasa");
if (e1Usul && e1Usul.alasan !== "jantannya belum cukup umur") {
  temuan.push(`usulanJantan [E1]: alasan "${e1Usul.alasan}" — jantannya ADA, hanya belum cukup umur; dua keadaan itu menuntut tindakan berbeda`);
}
if (usulUjiInd.berlebih.some((b) => b.kandang === "W3")) {
  temuan.push("usulanJantan: W3 berisi satu jantan dan 3/3 betinanya bertelur — tidak boleh ikut diusulkan diubah");
}
// 6+2 jantan berlebih, 1 kandang kurang -> 7 tidak punya tujuan.
if (usulUjiInd.tanpaTujuan !== 7) {
  temuan.push(`usulanJantan: tanpaTujuan ${usulUjiInd.tanpaTujuan}, seharusnya 7 — angka inilah yang mengakui usulannya tidak bisa dijalankan sampai habis`);
}

// Batas "baru datang" dihitung dari kebun ini sendiri, bukan dari buku.
const adaptasiUji = DI.bulanAdaptasiTercepat(
  [{ id: "f1", purchase_date: "2025-05-07" }, { id: "f2", purchase_date: "2024-12-26" }],
  [{ female_id: "f1", egg_laying_date: "2026-03-09" }, { female_id: "f2", egg_laying_date: "2026-09-30" }],
);
if (adaptasiUji !== 10) temuan.push(`bulanAdaptasiTercepat: ${adaptasiUji}, seharusnya 10 bulan`);

/*
  Antrean: betina yang BARU datang tidak boleh naik ke atas hanya karena
  kandangnya nol. Menagih betina tiga bulan sesudah tiba adalah cara
  tercepat membuat seluruh daftarnya diabaikan.
*/
const antreanUji = DI.antreanPerbaikan(
  [
    { id: "lama", nama: "lama", kandang: "Bonsai 1", umur: 16, clutch: 0, purchaseDate: "2019-01-01",
      ayah: { jumlah: 3, kandidat: ["B6", "A23", "B9"], muda: [], hanyaMuda: false } },
    // Betina ketiga: tanpa dia, Bonsai 1 belum cukup untuk DINILAI sebagai
    // kandang (batasnya 3 ekor), jadi "jantan berdesakan" tidak pernah
    // berlaku dan separuh bobot prioritas tidak ikut teruji.
    { id: "lama2", nama: "lama2", kandang: "Bonsai 1", umur: 16, clutch: 0, purchaseDate: "2024-12-26",
      ayah: { jumlah: 3, kandidat: ["B6", "A23", "B9"], muda: [], hanyaMuda: false } },
    { id: "baru", nama: "baru", kandang: "Bonsai 1", umur: 16, clutch: 0, purchaseDate: "2026-08-01",
      ayah: { jumlah: 3, kandidat: ["B6", "A23", "B9"], muda: [], hanyaMuda: false } },
    { id: "tanpaJantan", nama: "tanpaJantan", kandang: "E1", umur: 16, clutch: 0, purchaseDate: "2025-01-01",
      ayah: { jumlah: 0, kandidat: [], muda: [], hanyaMuda: false } },
    { id: "sudah", nama: "sudah", kandang: "W3", umur: 16, clutch: 2, purchaseDate: "2019-01-01",
      ayah: { jumlah: 1, kandidat: ["A36"], ayah: "A36", muda: [], hanyaMuda: false } },
  ],
  { bulanAdaptasi: 10, hariIni: HARI_INDUK },
);
const urutAntrean = antreanUji.map((r) => r.nama);
if (JSON.stringify(urutAntrean) !== JSON.stringify(["tanpaJantan", "lama", "lama2", "baru"])) {
  temuan.push(`antreanPerbaikan: urutan ${JSON.stringify(urutAntrean)}, seharusnya ["tanpaJantan","lama","lama2","baru"]`);
}
if (antreanUji.some((r) => r.nama === "sudah")) {
  temuan.push("antreanPerbaikan: betina yang SUDAH bertelur ikut masuk antrean perbaikan");
}
const diagBaru = antreanUji.find((r) => r.nama === "baru")?.diagnosa;
const diagLama = antreanUji.find((r) => r.nama === "lama")?.diagnosa;
if (!diagBaru?.usulan.some((u) => u.kode === "baru-datang")) {
  temuan.push("antreanPerbaikan: betina yang baru 2 bulan datang tidak ditandai baru-datang");
}
/*
  Bobotnya diperiksa sebagai ANGKA, bukan lewat urutan daftar.

  Versi pertama hanya membandingkan urutan "lama" dan "baru". Keduanya di
  kandang yang sama, jadi "lama" menang karena lamanya saja (393 lawan 302) —
  dan uji itu tetap hijau ketika keringanan untuk yang baru datang dihapus
  seluruhnya. Urutan yang kebetulan benar bukan bukti bobotnya bekerja.
*/
if (diagLama?.prioritas !== 393) {
  temuan.push(`diagnosaBetina [lama]: prioritas ${diagLama?.prioritas}, seharusnya 393 (berdesakan 300 + 93 bulan)`);
}
if (diagBaru?.prioritas !== -98) {
  temuan.push(
    `diagnosaBetina [baru]: prioritas ${diagBaru?.prioritas}, seharusnya -98 (berdesakan 300 + 2 bulan - 400 keringanan baru datang). ` +
    `Tanpa keringanan itu, betina yang baru dua bulan tiba ikut ditagih bersama yang sudah tujuh tahun di sini.`,
  );
}
// Kemungkinan "bertelur tanpa tercatat" tidak boleh hilang dari satu pun baris.
for (const r of antreanUji) {
  if (!r.diagnosa.usulan.some((u) => u.kode === "mungkin-tidak-tercatat")) {
    temuan.push(`antreanPerbaikan [${r.nama}]: kemungkinan "bertelur tanpa tercatat" hilang dari diagnosanya`);
  }
}

/* ── Satu centang, dua catatan, satu kenyataan ──────────────────────────
 *
 * 5 Oktober 2026, 19.30. Pemilik mencentang "Kalibrasi sendok takar Duta
 * Repro" di layar kiper. Dua catatan lahir dari satu centang:
 *
 *   MaintenanceLog   is_test_data: true,  excluded_from_reports: true   ✓
 *   DailyChecklist   is_test_data: false, excluded_from_reports: false  ✗
 *
 * Yang kedua dibuat onMaintenanceDone DARI yang pertama, lalu membuang
 * tandanya. Dan yang tanpa tanda itulah yang dipakai: KPI, slip gaji,
 * hitungan milestone, dan antrean Approval Poin — tempat ia tidak bisa
 * dikeluarkan oleh siapa pun, karena checklist milik sendiri harus disetujui
 * orang lain dan pemiliknya satu-satunya orang yang membuka layar itu.
 *
 * Empat pintu menjawab pertanyaan yang sama dengan empat cara berbeda; yang
 * diuji di sini jawaban bersamanya. Bahwa setiap pintu benar-benar memakainya
 * dijaga cek-tataletak — fungsi yang benar tetapi tidak dipanggil sama saja
 * akibatnya dengan fungsi yang keliru.
 */
const tandaUjiKasus = [
  { nama: "catatan sumber data uji → turunannya ikut", sumber: { is_test_data: true }, harap: { is_test_data: true, excluded_from_reports: false } },
  { nama: "sumber dikecualikan manual → turunannya ikut", sumber: { excluded_from_reports: true }, harap: { is_test_data: false, excluded_from_reports: true } },
  { nama: "sumber bertanda keduanya", sumber: { is_test_data: true, excluded_from_reports: true }, harap: { is_test_data: true, excluded_from_reports: true } },
  { nama: "sumber sungguhan", sumber: { is_test_data: false, excluded_from_reports: false }, harap: { is_test_data: false, excluded_from_reports: false } },
  { nama: "sumber tanpa kolom sama sekali", sumber: {}, harap: { is_test_data: false, excluded_from_reports: false } },
  { nama: "sumber kosong", sumber: null, harap: { is_test_data: false, excluded_from_reports: false } },
  // Kolomnya berisi string "true"/"false", bukan boolean — sama seperti alasan
  // masukLaporan memakai `!== true` dan bukan `!nilai`.
  { nama: 'kolomnya string "false"', sumber: { is_test_data: "false" }, harap: { is_test_data: false, excluded_from_reports: false } },
];
for (const kasus of tandaUjiKasus) {
  const dapat = LP.tandaLaporan(kasus.sumber);
  if (JSON.stringify(dapat) !== JSON.stringify(kasus.harap)) {
    temuan.push(`tandaLaporan [${kasus.nama}]: ${JSON.stringify(dapat)}, seharusnya ${JSON.stringify(kasus.harap)}`);
  }
}

/*
  Checklist BARU: dua sebab terpisah, dan keduanya harus berlaku sendiri-sendiri.

  Sampai 9 Oktober 2026 GuidedHariIni hanya memeriksa Mode Uji dan
  claimIncidentalTask tidak memeriksa apa pun — jadi checklist pemilik yang
  lahir lewat pintu-pintu itu keluar tanpa tanda meski Mode Uji mati. Dua kasus
  pertama di bawah ini persis itu.
*/
const checklistBaruKasus = [
  { nama: "pemilik, Mode Uji MATI", masuk: { email: "wnsuryanto@gmail.com", modeUji: false }, harap: true },
  { nama: "pemilik, huruf besar dan spasi", masuk: { email: "  WNSuryanto@Gmail.com " }, harap: true },
  { nama: "kiper, Mode Uji HIDUP", masuk: { email: "ssholehuddin15@gmail.com", modeUji: true }, harap: true },
  { nama: "kiper, Mode Uji mati", masuk: { email: "ssholehuddin15@gmail.com", modeUji: false }, harap: false },
  { nama: "kepala feeder biasa", masuk: { email: "angsolo98@gmail.com" }, harap: false },
  { nama: "pemilik LAIN tidak ikut aturan akun", masuk: { email: "dverdinand@gmail.com" }, harap: false },
  { nama: "tanpa email", masuk: {}, harap: false },
  { nama: "tanpa argumen", masuk: undefined, harap: false },
];
for (const kasus of checklistBaruKasus) {
  const dapat = LP.tandaChecklistBaru(kasus.masuk);
  const bertanda = dapat.is_test_data === true && dapat.excluded_from_reports === true;
  if (bertanda !== kasus.harap) {
    temuan.push(
      `tandaChecklistBaru [${kasus.nama}]: ${bertanda ? "ditandai data uji" : "tanpa tanda"}, ` +
      `seharusnya ${kasus.harap ? "ditandai data uji" : "tanpa tanda"}`,
    );
  }
  // Separuh tanda lebih berbahaya daripada tanpa tanda: layar yang memeriksa
  // penanda yang lain akan tetap menghitungnya sebagai pekerjaan sungguhan.
  if (dapat.is_test_data !== dapat.excluded_from_reports) {
    temuan.push(`tandaChecklistBaru [${kasus.nama}]: hanya separuh penanda dipasang — ${JSON.stringify(dapat)}`);
  }
}

// Checklist yang bertanda tidak boleh lolos ke laporan, dan yang bersih harus lolos.
for (const kasus of checklistBaruKasus) {
  const checklist = { date: "2026-10-05", ...LP.tandaChecklistBaru(kasus.masuk) };
  if (LP.masukLaporan(checklist) === kasus.harap) {
    temuan.push(
      `tandaChecklistBaru [${kasus.nama}]: hasil tandanya ${kasus.harap ? "masih" : "tidak"} lolos masukLaporan — ` +
      `tanda dan saringan tidak sepakat.`,
    );
  }
}

/* ── Jendela pembayaran surut: siapa yang ikut dibayar ───────────────────
 *
 * Keputusan "berapa" diuji di atas. Yang diuji di sini keputusan "siapa", yang
 * sama menentukannya — dan yang paling mudah salah justru di UJUNG ATASNYA.
 *
 * Versi pertama fungsinya tidak punya ujung atas: ia membayar rata 5 poin
 * setiap catatan Inisiatif yang masih "pending" pada saat tombolnya ditekan.
 * Pemilik menyetujui 210 catatan, yaitu yang ada di dalam jendela 28 Juli –
 * 6 Oktober; "yang masih pending" sama dengan 210 hanya pada hari pertama.
 * Sehari kemudian ia sudah 212, dan dua yang baru itu justru pekerjaan yang
 * sejak 7 Oktober punya baris SOP sendiri — dibayar sekali lewat barisnya,
 * sekali lewat catatan Inisiatifnya. Uji dobel-bayar di `rencanaHari` tidak
 * menangkapnya: "Cari rumput" bukan "Cari rumput untuk pakan".
 */
const logSurut = (id, hari, lain) => ({
  id, is_extra: true, period_key: hari, done_by_email: "kiper@contoh.id",
  item_label: "Cari rumput", approval_status: "pending", ...(lain || {}),
});

const jendelaUji = [
  { nama: "di dalam jendela", log: logSurut("a", "2026-08-15"), ikut: true },
  { nama: "hari pertama jendela", log: logSurut("b", "2026-07-28"), ikut: true },
  { nama: "hari terakhir jendela", log: logSurut("c", "2026-10-06"), ikut: true },
  { nama: "sehari sebelum cacatnya", log: logSurut("d", "2026-07-27"), ikut: false },
  { nama: "HARI INI, sesudah layar penilaian berfungsi", log: logSurut("e", "2026-10-07"), ikut: false },
  { nama: "besok", log: logSurut("f", "2026-10-08"), ikut: false },
  { nama: "belum punya approval_status", log: logSurut("g", "2026-09-01", { approval_status: null }), ikut: true },
  { nama: "sudah disetujui", log: logSurut("h", "2026-09-01", { approval_status: "approved" }), ikut: false },
  { nama: "sudah ditolak", log: logSurut("i", "2026-09-01", { approval_status: "rejected" }), ikut: false },
  { nama: "data uji", log: logSurut("j", "2026-09-01", { is_test_data: true }), ikut: false },
  { nama: "dikecualikan dari laporan", log: logSurut("k", "2026-09-01", { excluded_from_reports: true }), ikut: false },
  { nama: "tanpa email pelaku", log: logSurut("l", "2026-09-01", { done_by_email: "" }), ikut: false },
  { nama: "tanpa tanggal", log: logSurut("m", "", {}), ikut: false },
  { nama: "bukan Inisiatif (tugas SOP biasa)", log: logSurut("n", "2026-09-01", { is_extra: false }), ikut: false },
];

const lolos = new Set(BS.saringSasaran(jendelaUji.map((u) => u.log)).map((l) => l.id));
for (const uji of jendelaUji) {
  const ikut = lolos.has(uji.log.id);
  if (ikut !== uji.ikut) {
    temuan.push(
      `saringSasaran [${uji.nama}]: ${ikut ? "ikut dibayar" : "tidak ikut"}, seharusnya ${uji.ikut ? "ikut" : "tidak ikut"}`,
    );
  }
}

/*
  Jendela di LAYAR harus sama persis dengan jendela di FUNGSI.

  Angkanya memang ditulis dua kali — Deno tidak bisa mengimpor src/ — tetapi
  di sini keduanya benar-benar dibandingkan, bukan dipercaya lewat komentar.
  Kalau yang satu digeser dan yang lain tidak, kartu di Pemeliharaan Sistem
  akan menghitung catatan yang berbeda dari yang dibayar fungsinya: ia
  menyatakan pekerjaannya selesai padahal masih ada yang tertinggal, atau
  terus menawarkan pekerjaan yang sudah tidak ada.
*/
if (JSON.stringify(JS.JENDELA_SURUT) !== JSON.stringify(BS.JENDELA)) {
  temuan.push(
    `JENDELA_SURUT di layar ${JSON.stringify(JS.JENDELA_SURUT)} tidak sama dengan JENDELA di fungsi ${JSON.stringify(BS.JENDELA)}`,
  );
}

// Jendelanya sendiri: kalau ujung atasnya hilang, yang di atas ikut terbawa.
if (BS.JENDELA.dari !== "2026-07-28" || BS.JENDELA.sampai !== "2026-10-06") {
  temuan.push(`JENDELA pembayaran surut berubah: ${BS.JENDELA.dari} s/d ${BS.JENDELA.sampai}`);
}
if (!BS.JENDELA.sampai) {
  temuan.push("JENDELA tanpa ujung atas: tombol bayar surut akan membayar rata catatan yang sekarang dinilai pemilik sendiri");
}

/* ── Satu baris setelan, tujuh kunci cache, satu penyegaran ─────────────
 *
 * `segarkanSetelan` harus menyentuh SETIAP kunci, bukan sebagian. Yang diuji
 * di sini perilakunya, bukan bentuknya: penjaga cek-kunci memastikan semua
 * penulis memanggilnya, dan uji ini memastikan yang dipanggil itu benar-benar
 * menyegarkan ketujuhnya. Tanpa uji ini, fungsi yang tubuhnya kosong akan
 * lolos pemeriksaan bentuk dengan mulus.
 */
const dicatat = [];
KS.segarkanSetelan({ invalidateQueries: ({ queryKey }) => dicatat.push(queryKey[0]) });
for (const kunci of KS.KUNCI_SETELAN) {
  if (!dicatat.includes(kunci)) temuan.push(`segarkanSetelan: kunci "${kunci}" tidak disegarkan`);
}
if (dicatat.length !== KS.KUNCI_SETELAN.length) {
  temuan.push(`segarkanSetelan: ${dicatat.length} penyegaran untuk ${KS.KUNCI_SETELAN.length} kunci`);
}
if (!KS.KUNCI_SETELAN.includes(KS.KUNCI_UTAMA)) {
  temuan.push(`segarkanSetelan: KUNCI_UTAMA "${KS.KUNCI_UTAMA}" tidak ada di KUNCI_SETELAN — hook utama tidak akan ikut disegarkan`);
}
// Dipanggil tanpa QueryClient (misal dari fungsi latar) tidak boleh melempar:
// penyimpanannya sudah berhasil, dan penyegaran yang gagal bukan alasan
// menggagalkannya.
try {
  KS.segarkanSetelan(undefined);
  KS.segarkanSetelan({});
} catch (e) {
  temuan.push(`segarkanSetelan: melempar saat dipanggil tanpa QueryClient (${e?.message || e})`);
}
const setelanUji = KS.KUNCI_SETELAN;

/* ── Ongkos kirim: hanya yang ditanggung PENJUAL yang masuk HPP ──────────
 *
 * Sebelum 6 Okt 2026 ongkir selalu ditambahkan ke HPP, jadi setiap penjualan
 * dihitung seolah peternakan yang membayar kurirnya. Padahal sering pembeli
 * yang menanggung — entah membayar kurir langsung, entah menggantinya ke
 * peternakan — dan pada kedua cara itu pengaruhnya ke laba NOL.
 *
 * Yang diuji di sini termasuk bawaannya: penjualan lama tidak punya kolom
 * `ongkir_ditanggung`, dan angkanya tidak boleh berubah surut.
 */
const ongkirUji = [
  ["ditanggung penjual", 50000, "penjual", 50000],
  ["ditanggung pembeli", 50000, "pembeli", 0],
  ["kolom kosong (penjualan lama)", 50000, undefined, 50000],
  ["nilai teks", "50000", "penjual", 50000],
  ["nilai kosong", "", "pembeli", 0],
  ["nilai tak masuk akal", "abc", "penjual", 0],
];
for (const [nama, nilai, ditanggung, harap] of ongkirUji) {
  const nyata = ditanggung === undefined
    ? HPP.ongkirUntukHpp(nilai)
    : HPP.ongkirUntukHpp(nilai, ditanggung);
  if (nyata !== harap) {
    temuan.push(`ongkirUntukHpp: ${nama} -> ${nyata}, seharusnya ${harap}`);
  }
}

// Dan lewat penghitung HPP yang sesungguhnya: totalnya harus ikut berubah.
const kuraUji = { id: "k1", purchase_price: 400000, acquisition_date: "2026-01-01" };
const hppPenjual = HPP.hitungHppKura({ kura: kuraUji, tarifPerBulan: 0, ongkir: 50000, ongkirDitanggung: "penjual", tanggalJual: "2026-01-01" });
const hppPembeli = HPP.hitungHppKura({ kura: kuraUji, tarifPerBulan: 0, ongkir: 50000, ongkirDitanggung: "pembeli", tanggalJual: "2026-01-01" });
if (hppPenjual.total - hppPembeli.total !== 50000) {
  temuan.push(`hitungHppKura: selisih penjual vs pembeli ${hppPenjual.total - hppPembeli.total}, seharusnya 50000`);
}
// Nilai aslinya tetap dilaporkan supaya layar bisa menulis "dibayar pembeli".
if (hppPembeli.ongkirNilai !== 50000 || hppPembeli.ongkir !== 0) {
  temuan.push(`hitungHppKura: ongkir ditanggung pembeli seharusnya ongkirNilai 50000 & ongkir 0, terbaca ${hppPembeli.ongkirNilai} & ${hppPembeli.ongkir}`);
}
// Tanpa kolomnya sama sekali = perilaku lama.
const hppLama = HPP.hitungHppKura({ kura: kuraUji, tarifPerBulan: 0, ongkir: 50000, tanggalJual: "2026-01-01" });
if (hppLama.total !== hppPenjual.total) {
  temuan.push(`hitungHppKura: penjualan tanpa kolom ongkir_ditanggung berubah angkanya (${hppLama.total} vs ${hppPenjual.total})`);
}

// Salah ketik sepuluh kali lipat pada D3: 4,6 g diketik 46 g.
//
// Jumlah adonannya hanya bergeser 0,148% — di bawah ambang kewajaran, jadi
// pemeriksaan keseimbangan tetap menganggapnya wajar. Yang harus berteriak
// adalah angka per dosisnya.
const SALAH = { ...V7, ingredients: V7.ingredients.map((b) =>
  b.item_name.includes("D3") ? { ...b, quantity_kg: 0.046 } : b) };
const hasilSalah = R.periksaResep(SALAH, DOSIS_V7);
if (!hasilSalah.seimbang) {
  temuan.push("periksaResep: salah ketik D3 10x ternyata tertangkap pemeriksaan keseimbangan — ujinya jadi tidak membuktikan apa pun");
}
const d3Salah = hasilSalah.bahan[3].perDosisGram * 1000;
if (!(d3Salah > 16 && d3Salah < 17)) {
  temuan.push(`periksaResep: salah ketik D3 10x seharusnya terlihat sebagai ~16,4 mg per dosis, terbaca ${d3Salah.toFixed(2)} mg`);
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
  { id: RACIKAN_JADI, name: "RACIKAN Duta Repro v7", current_stock: 0, minimum_stock: 6500, is_mandatory: true },
  { id: "6a50c9c9d70aed0d5b585615", name: "Vitamin E 50% (bahan)", current_stock: 0, minimum_stock: 160, is_mandatory: true },
  { id: "menipis-1", name: "Barang menipis", current_stock: 5, minimum_stock: 10, is_mandatory: true },
  { id: "tanpa-min", name: "Wajib tanpa minimum", current_stock: 0, minimum_stock: 0, is_mandatory: true },
];
const nama = (d) => d.map((i) => i.name).sort().join(" | ");

const g1 = S.golonganStok(stokUji, idRacikan);
if (nama(g1.perluDiracik) !== "RACIKAN Duta Repro v7") {
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

/* ── Mencari per BULAN ─────────────────────────────────────────────── */

/*
 * Angka harapannya diambil dari BREED_UJI di atas, yang bentuknya meniru
 * data sungguhan: dua clutch A31 di bulan berbeda, satu catatan TANPA
 * tanggal, dan dua nama berantakan yang sebenarnya satu kura ("RD besar "
 * dan "8 BESAR" adalah dua kura berbeda, tapi ejaannya tidak rapi).
 */
const bulanUji = [
  ["2026-10", 1, 1, "Oktober: satu clutch A31"],
  ["2026-09", 1, 1, "September: satu clutch A31"],
  ["2026-04", 1, 1, "April: C24 yang sudah selesai TETAP terhitung"],
  ["2026-01", 0, 0, "bulan tanpa catatan"],
  ["", 6, 0, "bulan kosong TIDAK menyaring"],
];
for (const [kunci, harapClutch, harapInduk, kenapa] of bulanUji) {
  const clutch = C.saringBulan(BREED_UJI, kunci);
  if (clutch.length !== harapClutch) {
    temuan.push(`saringBulan("${kunci}"): dapat ${clutch.length} clutch, seharusnya ${harapClutch} — ${kenapa}`);
  }
  if (kunci) {
    const induk = C.kelompokkanPerInduk(clutch).length;
    if (induk !== harapInduk) {
      temuan.push(`saringBulan("${kunci}") -> kelompokkanPerInduk: dapat ${induk} induk, seharusnya ${harapInduk} — ${kenapa}`);
    }
  }
}

/*
 * Catatan tanpa `egg_laying_date` tidak boleh masuk bulan mana pun. Kalau ia
 * ikut terhitung, "September" akan menyebut satu induk yang tidak pernah
 * bertelur di September.
 */
const semuaBulan = C.daftarBulanBertelur(BREED_UJI);
const jumlahDiBulan = semuaBulan.reduce((t, b) => t + b.clutch, 0);
if (jumlahDiBulan !== BREED_UJI.filter((b) => b.egg_laying_date).length) {
  temuan.push(`daftarBulanBertelur: ${jumlahDiBulan} clutch terbagi ke bulan, seharusnya ${BREED_UJI.filter((b) => b.egg_laying_date).length} (catatan tanpa tanggal tidak punya bulan)`);
}
if (semuaBulan[0]?.kunci !== "2026-10") {
  temuan.push(`daftarBulanBertelur: bulan pertama "${semuaBulan[0]?.kunci}", seharusnya "2026-10" — terbaru dulu`);
}
if (semuaBulan.some((b) => b.clutch === 0)) {
  temuan.push("daftarBulanBertelur: ada bulan kosong di daftar pilihan — hanya bulan yang punya catatan yang boleh muncul");
}

/*
 * Bulan dipotong dari TEKS tanggalnya, bukan lewat new Date(). Tanggal 1
 * adalah pembuktinya: `new Date("2026-10-01")` di zona waktu barat Greenwich
 * jatuh ke 30 September.
 */
const kunciUji = [
  ["2026-10-01", "2026-10", "tanggal 1 — penjebak zona waktu"],
  ["2026-12-31", "2026-12", "tanggal terakhir tahun"],
  ["2026-09-04T00:00:00", "2026-09", "tanggal berjam"],
  ["", null, "kosong"],
  [null, null, "null"],
  ["bukan tanggal", null, "teks sembarang"],
];
for (const [nilai, harap, kenapa] of kunciUji) {
  const dapat = C.kunciBulan(nilai);
  if (dapat !== harap) {
    temuan.push(`kunciBulan(${JSON.stringify(nilai)}): dapat ${JSON.stringify(dapat)}, seharusnya ${JSON.stringify(harap)} — ${kenapa}`);
  }
}
if (C.labelBulan("2026-09") !== "September 2026") {
  temuan.push(`labelBulan("2026-09"): dapat "${C.labelBulan("2026-09")}", seharusnya "September 2026"`);
}

/* ── Hitung mundur menetas ─────────────────────────────────────────── */

/*
 * Clutch C23 12 Agt 2026 yang sungguhan: mulai 31 Okt, akhir 25 Nov. Hari
 * acuannya dipatok supaya jawabannya tidak berubah tiap penjaga dijalankan.
 */
const CLUTCH_MUNDUR = { status: "bertelur", estimated_hatch_start: "2026-10-31", estimated_hatch_end: "2026-11-25" };
const mundurUji = [
  [CLUTCH_MUNDUR, "2026-10-04", "menuju", 27, "masih jauh"],
  [CLUTCH_MUNDUR, "2026-10-24", "menuju", 7, "tujuh hari — batas merah"],
  [CLUTCH_MUNDUR, "2026-10-30", "menuju", 1, "besok"],
  [CLUTCH_MUNDUR, "2026-10-31", "masa", 25, "hari pertama jendela menetas"],
  [CLUTCH_MUNDUR, "2026-11-25", "masa", 0, "hari terakhir jendela — masih di DALAM"],
  [CLUTCH_MUNDUR, "2026-11-26", "lewat", 1, "sehari lewat"],
  [{ ...CLUTCH_MUNDUR, status: "selesai" }, "2026-11-26", "selesai", null, "sudah difinalisasi"],
  [{ ...CLUTCH_MUNDUR, status: "menetas" }, "2026-11-26", "menetas", null, "sudah menetas"],
  [{ ...CLUTCH_MUNDUR, status: "gagal" }, "2026-11-26", "gagal", null, "gagal"],
  // Cadangan `estimated_hatch_date` dipakai sebagai tanggal AKHIR.
  [{ status: "bertelur", estimated_hatch_start: "2026-10-31", estimated_hatch_date: "2026-11-25" }, "2026-11-10", "masa", 15, "akhir diambil dari estimated_hatch_date"],
];
for (const [clutch, hari, harapJenis, harapHari, kenapa] of mundurUji) {
  // Sengaja memakai jam SORE: inilah saat selisih UTC-vs-lokal mulai
  // menggeser jawaban kalau tanggalnya tidak diturunkan ke "hari" dulu.
  const m = M.hitungMundur(clutch, new Date(`${hari}T17:30:00`));
  if (!m) {
    temuan.push(`hitungMundur pada ${hari}: tidak menjawab apa-apa — ${kenapa}`);
    continue;
  }
  if (m.jenis !== harapJenis || m.hari !== harapHari) {
    temuan.push(`hitungMundur pada ${hari}: dapat ${m.jenis}/${m.hari}, seharusnya ${harapJenis}/${harapHari} — ${kenapa}`);
  }
}
// Tanpa satu pun tanggal perkiraan, TIDAK boleh menjawab angka.
if (M.hitungMundur({ status: "bertelur" }) !== null) {
  temuan.push("hitungMundur tanpa tanggal perkiraan: menjawab angka — seharusnya diam");
}
if (M.hitungMundur(null) !== null) {
  temuan.push("hitungMundur(null): menjawab angka — seharusnya diam");
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

// Keadaan NYATA 2 Okt 2026 — 208 telur, hanya 41 yang induknya pasti.
const CLUTCH_NYATA = [
  { id: "1", female_name: "C23", egg_count: 22, status: "bertelur" },
  { id: "2", female_name: "A31", egg_count: 23, status: "bertelur" },
  { id: "3", female_name: "A46", egg_count: 22, status: "bertelur" },
  { id: "4", female_name: "A47", egg_count: 25, status: "bertelur" },
  { id: "5", female_name: "C23", egg_count: 23, status: "bertelur", tray_number: 8 },
  { id: "6", female_name: "C22", egg_count: 17, status: "bertelur", tray_number: 8 },
  { id: "7", female_name: "A48", egg_count: 13, status: "bertelur", tray_number: 7 },
  { id: "8", female_name: "B108", egg_count: 13, status: "bertelur" },
  { id: "9", female_name: "A31", egg_count: 22, status: "bertelur", tray_numbers: [] },
  { id: "10", female_name: "C23", egg_count: 28, status: "bertelur", tray_number: 3 },
  // Clutch yang SUDAH SELESAI tidak boleh ikut diperingatkan lagi.
  { id: "x", female_name: "C24", egg_count: 24, status: "selesai" },
];
const tanpa = T.clutchTanpaTray(CLUTCH_NYATA);
if (tanpa.length !== 6) {
  temuan.push(`clutchTanpaTray: dapat ${tanpa.length} clutch, seharusnya 6 (clutch selesai tidak ikut)`);
}
if (tanpa.reduce((s, b) => s + b.egg_count, 0) !== 127) {
  temuan.push(`clutchTanpaTray: jumlah butirnya ${tanpa.reduce((s, b) => s + b.egg_count, 0)}, seharusnya 127`);
}
if (tanpa.some((b) => b.status === "selesai")) {
  temuan.push("clutchTanpaTray: clutch yang sudah selesai ikut diperingatkan");
}
const bAktif = T.bentrokTrayAktif(CLUTCH_NYATA);
if (bAktif.length !== 1 || bAktif[0].tray !== 8) {
  temuan.push(`bentrokTrayAktif: seharusnya hanya tray 8, dapat ${JSON.stringify(bAktif.map((x) => x.tray))}`);
}
// Semua beres -> kedua daftar harus kosong, supaya kartunya diam.
const beres = [{ id: "a", status: "bertelur", tray_numbers: [1] }, { id: "b", status: "bertelur", tray_numbers: [2] }];
if (T.clutchTanpaTray(beres).length !== 0 || T.bentrokTrayAktif(beres).length !== 0) {
  temuan.push("tray: keadaan yang sudah beres masih memunculkan peringatan");
}

/* ── 10. Setelan alarm inkubator: target harus di DALAM pitanya ────── */

/*
 * Setelan nyata kedua inkubator pada 2 Okt 2026: target 31 °C, alarm bawah
 * 31, alarm atas 32. Terlihat benar di layar. Dijalankan satu per satu:
 *
 *   30,8 -> suhu_rendah   (0,2 di bawah target sudah alarm)
 *   31,9 -> normal        (0,9 di atas target masih diam)
 *
 * Toleransinya −0,0 ke bawah dan +1,0 ke atas. Salah dua arah sekaligus:
 * alarm palsu yang membuat alarmnya berhenti dipercaya, DAN diam saat suhu
 * benar-benar naik. Dua pembacaan yang pernah ada keduanya tepat 31,0 —
 * persis di tepi itu, dan tidak ada yang menyadarinya.
 */
const INC_NYATA = { temp_setting: 31, temp_min_alarm: 31, temp_max_alarm: 32,
                humidity_setting: 80, humidity_min_alarm: 70, humidity_max_alarm: 90 };
const mAmbang = I.periksaAmbang(INC_NYATA);
if (!mAmbang.some((m) => m.jenis === "target_di_tepi_bawah")) {
  temuan.push("periksaAmbang: setelan nyata (target 31, alarm bawah 31) tidak terdeteksi bermasalah");
}
if (mAmbang.length !== 1) {
  temuan.push(`periksaAmbang: setelan nyata seharusnya memberi TEPAT 1 masalah (suhu saja; kelembapan 80 di antara 70-90 sudah benar), dapat ${mAmbang.length}`);
}

const ambangUji = [
  [{ temp_setting: 31, temp_min_alarm: 30.5, temp_max_alarm: 31.5 }, 0, "target di tengah pita — benar"],
  [{ temp_setting: 31, temp_min_alarm: 31, temp_max_alarm: 32 }, 1, "target duduk di tepi bawah"],
  [{ temp_setting: 32, temp_min_alarm: 31, temp_max_alarm: 32 }, 1, "target duduk di tepi atas"],
  [{ temp_setting: 31, temp_min_alarm: 32, temp_max_alarm: 31 }, 3, "pita terbalik — bawah > atas"],
  [{ temp_setting: 31 }, 0, "tanpa ambang sama sekali: diam, bukan menuduh"],
  [{}, 0, "record kosong"],
  [null, 0, "tanpa inkubator"],
];
for (const [inc, harap, kenapa] of ambangUji) {
  const dapat = I.periksaAmbang(inc).length;
  if (dapat !== harap) {
    temuan.push(`periksaAmbang (${kenapa}): dapat ${dapat} masalah, seharusnya ${harap}`);
  }
}

/*
 * Isi inkubator dihitung dari CLUTCH-nya, bukan dari kolom current_eggs.
 * Kolom itu hanya berubah saat ada yang menekan sinkron: pada 2 Okt 2026 ia
 * berbunyi 72 sementara clutch yang menunjuk inkubator itu berisi 208 butir —
 * angka Juni yang sudah empat bulan tidak benar.
 */
const incNyata = { id: "inc1", name: "Inkubator  kecil ", capacity_eggs: 192, current_eggs: 72 };
const isi = I.isiInkubator(incNyata, CLUTCH_NYATA.map((b) => ({ ...b, incubator_id: "inc1" })));
if (isi.telur !== 208) {
  temuan.push(`isiInkubator: menghitung ${isi.telur} butir dari clutch, seharusnya 208 — clutch yang sudah SELESAI tidak boleh ikut mengisi inkubator`);
}
if (isi.tercatat !== 72 || !isi.melencengDariCatatan) {
  temuan.push("isiInkubator: selisih terhadap current_eggs tidak terdeteksi");
}

/*
 * Satu aturan alarm untuk semua layar.
 *
 * Sampai 02-10-2026 beranda KIPER memakai ambang `28..33` yang ditulis mati —
 * paling longgar dari tiga penilaian yang ada — sementara komentarnya sendiri
 * berbunyi "29-31". Orang yang membaca alat ukurnya tiap hari justru yang
 * paling kecil kemungkinannya diberi tahu.
 */
const INC30 = { temp_setting: 30, temp_min_alarm: 29, temp_max_alarm: 31,
                humidity_setting: 80, humidity_min_alarm: 70, humidity_max_alarm: 90 };
const alarmUji = [
  [30, 80, "normal", "tepat target"],
  [29, 80, "normal", "tepat di batas bawah — belum alarm"],
  [31, 80, "normal", "tepat di batas atas — belum alarm"],
  [28.9, 80, "suhu_rendah", "di bawah batas"],
  [31.1, 80, "suhu_tinggi", "di atas batas"],
  [32.5, 80, "suhu_tinggi", "angka yang DULU berwarna hijau di beranda kiper"],
  [30, 69, "humidity_rendah", "kelembapan di bawah batas"],
  [30, 91, "humidity_tinggi", "kelembapan di atas batas"],
];
for (const [t, h, harap, kenapa] of alarmUji) {
  const dapat = I.jenisAlarm(t, h, INC30);
  if (dapat !== harap) {
    temuan.push(`jenisAlarm(${t}, ${h}) [${kenapa}]: dapat "${dapat}", seharusnya "${harap}"`);
  }
}
// Setelan baru pemiliknya harus LOLOS pemeriksaan ambang.
if (I.periksaAmbang(INC30).length !== 0) {
  temuan.push(`periksaAmbang: setelan baru (target 30, pita 29-31) seharusnya bersih, dapat ${JSON.stringify(I.periksaAmbang(INC30))}`);
}
/*
 * Kolom pembacaan. Widget kiper membaca `temperature`/`humidity`; skemanya
 * `temperature_actual`/`humidity_actual`. Selalu undefined, jadi widgetnya
 * tidak pernah bisa menampilkan satu pun pembacaan — tanpa error.
 */
const ap = I.angkaPembacaan({ temperature_actual: 30.5, humidity_actual: 82 });
if (ap.suhu !== 30.5 || ap.kelembapan !== 82) {
  temuan.push(`angkaPembacaan: dapat ${JSON.stringify(ap)}, seharusnya { suhu: 30.5, kelembapan: 82 }`);
}
if (I.angkaPembacaan({ temperature: 30.5 }).suhu !== null) {
  temuan.push("angkaPembacaan: kolom lama `temperature` seharusnya TIDAK dibaca — kolomnya tidak ada di skema");
}

/* ── Target tahunan: kemajuan SELALU dibandingkan dengan waktu ─────────────
 *
 * Bilah kemajuan yang hanya menghitung `capai / target` menyesatkan dengan
 * cara yang halus. Omzet 2026 ada di 21% pada 11 Oktober; seperlima bilah
 * terbaca seperti "baru mulai", padahal 78% tahunnya sudah lewat.
 *
 * Yang diuji di sini karena itu bukan persentasenya saja, melainkan
 * perbandingannya dengan waktu — dan hitungan "perlu berapa per hari", yang
 * merupakan satu-satunya angka di panel itu yang bisa dikerjakan orang.
 */
const TGT = await import(`file://${join(dir, "target.cjs")}`).then((m) => m.default || m);
const GOAL = { year: 2026, egg_production_target: 500, revenue_target: 300000000 };
const hari = (t) => new Date(`${t}T00:00:00Z`);

const targetUji = [
  // [nama, telur, omzet, tanggal, harap]
  ["angka nyata 11 Okt 2026", 343, 61821248, "2026-10-11",
    { persenWaktu: 78, sisaHari: 81, telurPersen: 69, telurStatus: "waspada", omzetPersen: 21, omzetStatus: "tertinggal" }],
  // Tepat di laju: separuh target pada separuh tahun = aman, bukan "baru separuh".
  ["tepat di laju", 250, 150000000, "2026-07-02",
    { persenWaktu: 50, telurPersen: 50, telurStatus: "aman", omzetPersen: 50, omzetStatus: "aman" }],
  // Awal tahun: nol pada 1 Januari belum tertinggal apa pun.
  ["hari pertama", 0, 0, "2026-01-01",
    { persenWaktu: 0, telurStatus: "aman", omzetStatus: "aman" }],
  // Hari terakhir: waktunya 100%, jadi yang belum selesai memang tertinggal.
  ["hari terakhir", 500, 0, "2026-12-31",
    { persenWaktu: 100, sisaHari: 0, telurStatus: "aman", omzetStatus: "tertinggal" }],
];

for (const [nama, telur, omzet, tgl, harap] of targetUji) {
  const k = TGT.kemajuanTarget({ goal: GOAL, telur, omzet, hariIni: hari(tgl) });
  if (!k) { temuan.push(`target ${nama}: tidak menghasilkan apa-apa`); continue; }
  for (const [kunci, nilai] of Object.entries(harap)) {
    const dapat =
      kunci === "persenWaktu" ? k.persenWaktu :
      kunci === "sisaHari" ? k.sisaHari :
      kunci === "telurPersen" ? k.telur.persen :
      kunci === "telurStatus" ? k.telur.status :
      kunci === "omzetPersen" ? k.omzet.persen : k.omzet.status;
    if (dapat !== nilai) temuan.push(`target ${nama}: ${kunci} = ${dapat}, bukan ${nilai}`);
  }
}

/*
  ── HARGA SUPPLIER: kalimat dari screenshot jadi angka per kilogram ────────

  Harga lead masuk sebagai kalimat yang ditulis penjual, bukan angka. Yang
  diuji di sini keempat bentuk yang BENAR-BENAR ada di tujuh lead pertama
  (17 Okt 2026), ditambah dua jebakan:

  · "nego" dan "Obral" tidak boleh terbaca sebagai NOL. Kalau terbaca nol,
    penjual yang tidak menyebut harga akan selalu menang sebagai termurah —
    peringkat yang tegas dan salah.
  · Satuan yang tidak bisa ditimbang ("ikat") tidak boleh ditebak beratnya.
*/
const HS = await import(`file://${join(dir, "harga.cjs")}`).then((m) => m.default || m);
const hargaUji = [
  // [teks, harga terendah per kg yang diharapkan, berapa penawaran terbaca]
  ["10.000/3kg, 8.000/3kg, 6.000/3kg, 5.000/2kg", 2000, 4],
  ["4rb per kg", 4000, 1],
  ["15k/kg", 15000, 1],
  ["1,5jt/kg", 1500000, 1],
  ["nego", null, 1],
  ["Obral", null, 1],
  ["", null, 0],
  ["5.000/ikat", null, 1],
  ["10.000/ons", 100000, 1],
];
for (const [teks, harap, jml] of hargaUji) {
  const dapat = HS.hargaTerendahPerKg(teks);
  if (dapat !== harap) temuan.push(`harga supplier ${JSON.stringify(teks)}: terendah ${dapat}, seharusnya ${harap}`);
  const n = HS.bacaHarga(teks).length;
  if (n !== jml) temuan.push(`harga supplier ${JSON.stringify(teks)}: ${n} penawaran terbaca, seharusnya ${jml}`);
}
/* Titik SELALU pemisah ribuan: "10.000" sepuluh ribu, bukan sepuluh. */
if (HS.bacaAngka("10.000") !== 10000) temuan.push(`harga supplier: "10.000" terbaca ${HS.bacaAngka("10.000")}, seharusnya 10000`);
if (HS.bacaAngka("1,5") !== 1.5) temuan.push(`harga supplier: "1,5" terbaca ${HS.bacaAngka("1,5")}, seharusnya 1.5`);
/* Yang tidak bisa dibanding tetap DILAPORKAN, bukan dibuang diam-diam. */
const nego = HS.bacaHarga("nego")[0];
if (nego.bisaDibanding !== false || !nego.sebab) temuan.push("harga supplier: 'nego' tidak menyebutkan sebab tidak bisa dibanding");

const barangUji = [
  ["Sayur (tomat, jagung manis, terong, gondes)", 4],
  ["sayur (kyuri, zucchini, kabocca, kentang, dll)", 4],   // "dll" dibuang
  // "A atau B" = satu barang dua nama, bukan dua barang.
  ["Waluh atau labu kuning", 1],
  ["tomat dan terong", 2],
  ["Semangka", 1],
  ["", 0],
];
for (const [teks, harap] of barangUji) {
  const n = HS.bacaBarang(teks).length;
  if (n !== harap) temuan.push(`barang supplier ${JSON.stringify(teks)}: ${n} nama, seharusnya ${harap}`);
}

/*
  ── HARGA BARANG GUDANG: 53 barang berstok tanpa harga beli ────────────────

  18 Okt 2026: 53 dari 87 barang bergudang punya stok tetapi harga belinya
  Rp 0 — 18 di antaranya alat kerja (cangkul, clurit, palu, mesin giling).
  Modal alat di beranda karena itu praktis hanya lampu UVB, dan tidak ada
  satu pun layar yang menyebutkannya.

  Dua hal yang dijaga, dan keduanya pernah salah saya kira:

  · BARANG HABIS dianggap LENGKAP. Ia tidak menyumbang modal apa pun hari
    ini; memintanya diberi harga menambah puluhan baris kerja yang tidak
    mengubah satu angka pun. Harganya ditanyakan saat dibeli lagi.
  · Rp 0 dianggap BELUM DIISI di sini — berbeda dari harga beli KURA, yang
    nol-nya sah (hadiah, warisan, anakan sendiri). Bedanya: kolom harga
    barang bawaannya 0 di skema, jadi nol adalah apa yang tertulis ketika
    tidak ada yang mengisi, bukan pernyataan siapa pun.

  Dan aturannya satu untuk DUA pemakai — layar isian massal dan saringan
  Data Belum Lengkap. Dua salinan yang sedikit berbeda membuat barang
  muncul di satu daftar tetapi tidak di daftar lain, tanpa error apa pun.
*/
const LG = await import(`file://${join(dir, "lengkap.cjs")}`).then((m) => m.default || m);
const HB = await import(`file://${join(dir, "hargabrg.cjs")}`).then((m) => m.default || m);
const cekHargaBarang = LG.INCOMPLETE_CHECKS.warehouseItem.fields.find((f) => f.key === "purchase_price");
if (!cekHargaBarang) temuan.push("harga barang: pemeriksa kelengkapan tidak punya kolom purchase_price");

const brgUji = [
  // [nama, barang, dianggap lengkap?]
  ["alat kerja berstok tanpa harga (18 nyata)", { current_stock: 2, purchase_price: 0 }, false],
  ["harga null, stok ada", { current_stock: 1, purchase_price: null }, false],
  ["kolom harga tidak ada sama sekali", { current_stock: 1 }, false],
  ["berstok dan berharga", { current_stock: 2, purchase_price: 425000 }, true],
  // Barang habis tidak menyumbang modal, jadi tidak ditagih harganya.
  ["habis, tanpa harga", { current_stock: 0, purchase_price: 0 }, true],
  ["habis, berharga", { current_stock: 0, purchase_price: 10000 }, true],
];
for (const [nama, brg, lengkap] of brgUji) {
  const dapat = cekHargaBarang ? !!cekHargaBarang.check(brg) : false;
  if (dapat !== lengkap) {
    temuan.push(`harga barang "${nama}": ${dapat ? "lengkap" : "belum lengkap"}, seharusnya ${lengkap ? "lengkap" : "belum lengkap"}`);
  }
  /* Saringan dan pemeriksa kelengkapan HARUS sepakat — kalau berpisah,
     barang muncul di satu daftar dan hilang dari daftar yang lain. */
  const diDaftarMassal = HB.barangTanpaHarga([brg]).length === 1;
  if (diDaftarMassal === dapat) {
    temuan.push(`harga barang "${nama}": layar isian massal dan Data Belum Lengkap tidak sepakat`);
  }
}

/* Ringkasan kelengkapan dipakai beranda; angkanya harus utuh. */
const ringkasBrg = HB.kelengkapanHargaBarang([
  { current_stock: 2, purchase_price: 425000 },
  { current_stock: 1, purchase_price: 0 },
  { current_stock: 3, purchase_price: null },
  { current_stock: 0, purchase_price: 0 },   // habis: di luar hitungan
]);
if (ringkasBrg.berstok !== 3) temuan.push(`harga barang: ${ringkasBrg.berstok} barang berstok, seharusnya 3 (yang habis tidak ikut)`);
if (ringkasBrg.berharga !== 1) temuan.push(`harga barang: ${ringkasBrg.berharga} berharga, seharusnya 1`);
if (ringkasBrg.kosong !== 2) temuan.push(`harga barang: ${ringkasBrg.kosong} kosong, seharusnya 2`);
if (ringkasBrg.persen !== 33) temuan.push(`harga barang: ${ringkasBrg.persen}% lengkap, seharusnya 33`);

/*
  ── PITA UKURAN & NILAI ASET: perkiraan harga jual kawanan ─────────────────

  Diminta pemiliknya 18 Okt 2026, untuk kolom "estimasi total aset" di
  beranda. Aturan pitanya kata-katanya sendiri: "jika baby rentangnya lebih
  kecil — lima, enam, tujuh, delapan, sembilan, sepuluh juga akan berbeda;
  tapi kalau untuk indukan rentangnya semakin lebar, biasanya per lima senti".

  Jadi dua aturan dalam satu fungsi, dan di situlah yang paling mudah salah:

  · BATAS PITA TERBUKA DI ATAS. Kura 55,0 cm harus masuk pita 55 dan BUKAN
    pita 50–55. Kalau batasnya tertutup di kedua ujung, kura di titik batas
    jatuh ke dua pita sekaligus tergantung urutan pemeriksaan, dan nilainya
    berubah-ubah tanpa sebab yang terlihat.
  · KELOMPOK YANG BELUM BERHARGA BUKAN NOL. Menghitungnya nol membuat nilai
    aset terlihat utuh padahal separuh kawanan tidak dihargai — angka yang
    lebih berbahaya daripada tidak ada angka sama sekali.
*/
const PU = await import(`file://${join(dir, "pita.cjs")}`).then((m) => m.default || m);
const HE = await import(`file://${join(dir, "hargaest.cjs")}`).then((m) => m.default || m);

const pitaUji = [
  // [cm, batas bawah yang diharapkan, label]
  [5.3, 5, "5 cm"],          // anakan: per 1 cm
  [6, 6, "6 cm"],
  [7, 7, "7 cm"],
  [9.9, 9, "9 cm"],
  [10, 10, "10–15 cm"],      // tepat di batas aturan: sudah per 5 cm
  [15, 15, "15–20 cm"],
  [54.9, 50, "50–55 cm"],
  // Titik batas yang menentukan: 55,0 masuk pita 55, BUKAN 50–55.
  [55, 55, "55–60 cm"],
  [76, 75, "75–80 cm"],
];
for (const [cm, min, label] of pitaUji) {
  const p = PU.pitaUkuran(cm);
  if (!p || p.min !== min) temuan.push(`pita ${cm} cm: batas bawah ${p ? p.min : "null"}, seharusnya ${min}`);
  if (p && p.label !== label) temuan.push(`pita ${cm} cm: label "${p.label}", seharusnya "${label}"`);
  if (p && !PU.didalamPita(cm, min)) temuan.push(`pita ${cm} cm: didalamPita menolak pitanya sendiri`);
  if (p && PU.labelPita(min) !== label) temuan.push(`pita ${cm} cm: labelPita("${min}") = "${PU.labelPita(min)}", seharusnya "${label}"`);
}
/* Tanpa ukuran TIDAK boleh jatuh ke pita mana pun. */
for (const kosong of [0, null, undefined, -3, "", "abc"]) {
  if (PU.pitaUkuran(kosong) !== null) temuan.push(`pita ${JSON.stringify(kosong)}: dapat pita, seharusnya null`);
}

/* ── Kunci harga ───────────────────────────────────────────────────────── */
const kura = (o) => ({ status: "aktif", species: "sulcata", morph: "normal", gender: "betina", ...o });
const kB = HE.kunciHarga(kura({ code: "B1", shell_length_cm: 52, asal_genetik: "wc" }));
if (kB !== "sulcata|normal|50|betina|-|wc") temuan.push(`kunci harga: "${kB}", seharusnya "sulcata|normal|50|betina|-|wc"`);
const kP = HE.kunciHarga(kura({ code: "P1", shell_length_cm: 57, is_proven: true, asal_genetik: "cb" }));
if (kP !== "sulcata|normal|55|betina|proven|cb") temuan.push(`kunci harga proven: "${kP}"`);
/* Asal kosong jadi "?", BUKAN cb — kura yang asalnya belum ditentukan tidak
   boleh diam-diam dihargai sebagai captive bred. */
const kQ = HE.kunciHarga(kura({ code: "Q1", shell_length_cm: 52 }));
if (!kQ.endsWith("|?")) temuan.push(`kunci harga tanpa asal: "${kQ}", seharusnya berakhir "|?"`);
/* Tanpa ukuran: tidak punya kunci sama sekali. */
if (HE.kunciHarga(kura({ code: "X" })) !== null) temuan.push("kunci harga tanpa ukuran: seharusnya null");

/* ── Nilai aset ────────────────────────────────────────────────────────── */
const KAWANAN = [
  kura({ code: "A", shell_length_cm: 52, asal_genetik: "wc" }),
  kura({ code: "B", shell_length_cm: 53, asal_genetik: "wc" }),
  kura({ code: "C", shell_length_cm: 57, asal_genetik: "wc" }),   // pita lain, belum berharga
  kura({ code: "D", shell_length_cm: null, asal_genetik: "wc" }), // tanpa ukuran
  kura({ code: "E", shell_length_cm: 52, asal_genetik: "wc", status: "terjual" }),
  kura({ code: "F", shell_length_cm: 52, asal_genetik: "wc", status: "mati" }),
  kura({ code: "G", shell_length_cm: 52, asal_genetik: "wc", is_archived: true }),
];
const HARGA = [{ kunci: "sulcata|normal|50|betina|-|wc", harga_min: 10_000_000, harga_maks: 14_000_000, diperbarui: "2026-10-01" }];
const aset = HE.nilaiAsetKura({ kura: KAWANAN, harga: HARGA });

const asetUji = [
  ["min", aset.min, 20_000_000],
  ["maks", aset.maks, 28_000_000],
  ["ekor ternilai", aset.ekorTernilai, 2],
  ["ekor belum ternilai", aset.ekorBelum, 1],
  ["tanpa ukuran", aset.tanpaUkuran, 1],
  ["total ekor", aset.totalEkor, 4],
  ["persen ternilai", aset.persenTernilai, 50],
];
for (const [nama, dapat, harap] of asetUji) {
  if (dapat !== harap) temuan.push(`nilai aset ${nama}: ${dapat}, seharusnya ${harap}`);
}
/* Terjual, mati, dan diarsipkan BUKAN aset lagi. */
if (aset.totalEkor !== 4) temuan.push(`nilai aset: ${aset.totalEkor} ekor dihitung, seharusnya 4 (terjual/mati/arsip dikeluarkan)`);
/* Baris yang belum berharga disebut, bukan disembunyikan. */
if (aset.barisKosong.length !== 1) temuan.push(`nilai aset: ${aset.barisKosong.length} baris kosong dilaporkan, seharusnya 1`);

/* Hanya harga terendah yang diisi → tertinggi mengikuti, bukan nol. */
const satuHarga = HE.nilaiAsetKura({
  kura: [kura({ code: "A", shell_length_cm: 52, asal_genetik: "wc" })],
  harga: [{ kunci: "sulcata|normal|50|betina|-|wc", harga_min: 9_000_000 }],
});
if (satuHarga.maks !== 9_000_000) temuan.push(`nilai aset: hanya harga_min diisi memberi maks ${satuHarga.maks}, seharusnya ikut 9.000.000`);

/* Nol adalah harga yang SAH dan berbeda dari kosong. */
const nolHarga = HE.nilaiAsetKura({
  kura: [kura({ code: "A", shell_length_cm: 52, asal_genetik: "wc" })],
  harga: [{ kunci: "sulcata|normal|50|betina|-|wc", harga_min: 0, harga_maks: 0 }],
});
if (nolHarga.ekorTernilai !== 1) temuan.push("nilai aset: harga 0 dianggap belum diisi, seharusnya sah");

/* Baris lahir dari kura, diurutkan dari yang paling banyak ekornya. */
const { baris } = HE.barisHarga({ kura: KAWANAN, harga: HARGA });
if (baris.length !== 2) temuan.push(`baris harga: ${baris.length} baris, seharusnya 2`);
if (baris[0].ekor < baris[baris.length - 1].ekor) temuan.push("baris harga: tidak diurutkan dari yang paling banyak ekornya");
if (!baris[0].terisi) temuan.push("baris harga: baris yang sudah berharga tidak ditandai terisi");

/*
  Baris yang kembar HANYA karena asalnya belum ditentukan.

  Ditemukan 18 Okt 2026 dengan menjalankan pustaka ini terhadap kawanan yang
  sebenarnya untuk pertama kali: 36 kura tanpa asal_genetik membentuk 24
  baris sendiri, dan 8 di antaranya berdampingan dengan baris yang isinya
  sama persis kecuali asalnya — "55-60 cm jantan asal? 4 ekor" tepat di
  sebelah "55-60 cm jantan WC 4 ekor". Yang mengisi harga harus memberi
  angka dua kali untuk hal yang sama.

  Yang dijaga: hanya pasangan yang BENAR-BENAR kembar yang dilaporkan.
  Melaporkan semua baris ber-asal kosong akan menyuruh pemiliknya
  mengerjakan 24 baris padahal yang menyatu cuma 8.
*/
const asalUji = [
  { species: "sulcata", morph: "normal", shell_length_cm: 57, gender: "jantan", asal_genetik: "wc", status: "aktif" },
  { species: "sulcata", morph: "normal", shell_length_cm: 58, gender: "jantan", status: "aktif" },            // kembar dgn di atas
  { species: "sulcata", morph: "normal", shell_length_cm: 22, gender: "betina", status: "aktif" },            // tidak ada pasangannya
  { species: "sulcata", morph: "normal", shell_length_cm: 57, gender: "betina", asal_genetik: "cb", status: "aktif" },
];
const barisAsal = HE.barisHarga({ kura: asalUji, harga: [] }).baris;
const kembarAsal = HE.barisKembarAsal(barisAsal);
if (barisAsal.length !== 4) temuan.push(`baris kembar: ${barisAsal.length} baris dibuat, seharusnya 4`);
if (kembarAsal.length !== 1) temuan.push(`baris kembar: ${kembarAsal.length} dilaporkan kembar, seharusnya 1`);
if (kembarAsal[0] && kembarAsal[0].gender !== "jantan") temuan.push("baris kembar: yang dilaporkan bukan pasangan jantan 55-60");
/* Yang SUDAH berasal tidak boleh ikut dilaporkan. */
if (kembarAsal.some((b) => b.asal)) temuan.push("baris kembar: baris yang sudah punya asal ikut dilaporkan");
/* Beda proven bukan kembar — itu memang dua harga yang berbeda. */
const bedaProven = HE.barisKembarAsal(HE.barisHarga({ kura: [
  { species: "sulcata", morph: "normal", shell_length_cm: 57, gender: "jantan", asal_genetik: "wc", is_proven: true, status: "aktif" },
  { species: "sulcata", morph: "normal", shell_length_cm: 58, gender: "jantan", status: "aktif" },
], harga: [] }).baris);
if (bedaProven.length !== 0) temuan.push("baris kembar: beda status proven dianggap kembar");

/* Harga yang sudah lama tidak disentuh ditandai. */
const KINI_HE = new Date("2026-10-18T00:00:00Z");
if (HE.hargaBasi("2026-10-01", KINI_HE)) temuan.push("harga basi: harga 17 hari lalu dianggap basi");
if (!HE.hargaBasi("2026-01-01", KINI_HE)) temuan.push("harga basi: harga 290 hari lalu tidak ditandai basi");
if (HE.hargaBasi("", KINI_HE)) temuan.push("harga basi: tanggal kosong dianggap basi");

/*
  ── HARGA BELI: kura yang DIBELI harus punya modalnya ──────────────────────

  Diminta pemiliknya 18 Okt 2026: "kalau kita membeli bukan dari anakan
  sendiri, saat memasukkan data perlu mencantumkan harga beli supaya bisa
  menentukan HPP saat nanti dijual".

  Keadaan saat itu: 47 kura beli tanpa harga beli sama sekali — termasuk
  tiga Sulcata Albino yang baru saja dimasukkan — dan saringan "Data Belum
  Lengkap" menghitungnya NOL, karena kolom itu memang tidak pernah
  diperiksa. Satu-satunya tempat mengisinya adalah SaleWizard, saat menjual:
  berbulan-bulan sesudah pembeliannya, dari ingatan.

  Yang dijaga di sini: aturan "dibeli" di pemeriksa kelengkapan SAMA dengan
  aturan yang dipakai perhitungan HPP (lahirDiFarm). Kalau keduanya berpisah,
  ada kura yang diminta harganya di satu layar tetapi dianggap hasil sendiri
  oleh layar yang menghitung modalnya — dan selisih itu tidak akan terlihat
  sampai ada yang menjual kura tersebut.
*/
const HPPK = await import(`file://${join(dir, "hpp.cjs")}`).then((m) => m.default || m);
const cekHarga = LG.INCOMPLETE_CHECKS.tortoise.fields.find((f) => f.key === "purchase_price");
if (!cekHarga) temuan.push("harga beli: pemeriksa kelengkapan tidak punya kolom purchase_price");

const hargaUjiKura = [
  // [nama, kura, lengkap?]
  ["beli lokal tanpa harga (47 kura nyata)", { source: "beli_lokal", code: "A40", purchase_price: null }, false],
  ["Sulcata Albino yang baru dimasukkan", { source: "beli_lokal", code: "SA01", purchase_price: null }, false],
  ["beli lokal dengan harga", { source: "beli_lokal", code: "A40", purchase_price: 2500000 }, true],
  // Nol adalah jawaban yang SAH: hadiah dan warisan memang bermodal nol.
  // Memeriksanya dengan `!!` akan menandainya belum lengkap selamanya.
  ["hadiah, dicatat nol", { source: "beli_lokal", code: "X1", purchase_price: 0 }, true],
  ["impor dengan harga", { source: "import", code: "B106", purchase_price: 8000000 }, true],
  ["impor tanpa harga", { source: "import", code: "B106", purchase_price: null }, false],
  // Hasil tetasan sendiri: modalnya biaya induk, bukan harga beli.
  ["hasil sendiri", { source: "hasil_sendiri", code: "BB-2026049", purchase_price: null }, true],
  // Kode BB- tetap terbaca hasil sendiri walau source-nya tidak diisi —
  // aturan yang sama dipakai hppKura.
  ["kode BB- tanpa source", { source: "", code: "BB-2026001", purchase_price: null }, true],
  ["teks kosong sama dengan belum diisi", { source: "wc", code: "A45", purchase_price: "" }, false],
];
for (const [nama, kura, lengkap] of hargaUjiKura) {
  const dapat = cekHarga ? !!cekHarga.check(kura) : false;
  if (dapat !== lengkap) {
    temuan.push(`harga beli "${nama}": ${dapat ? "lengkap" : "belum lengkap"}, seharusnya ${lengkap ? "lengkap" : "belum lengkap"}`);
  }
}
/* Aturannya harus BENAR-BENAR fungsi yang sama, bukan salinan yang mirip. */
for (const [nama, kura] of hargaUjiKura.map((x) => [x[0], x[1]])) {
  const kelengkapanBilangDibeli = cekHarga && !cekHarga.check({ ...kura, purchase_price: null });
  const hppBilangDibeli = !HPPK.lahirDiFarm(kura);
  if (kelengkapanBilangDibeli !== hppBilangDibeli) {
    temuan.push(`harga beli "${nama}": kelengkapan dan hitungan HPP tidak sepakat kura ini dibeli atau hasil sendiri`);
  }
}

/*
  ── KURA BARU: teks kosong tidak boleh masuk kolom angka ───────────────────

  18 Okt 2026 pemiliknya tidak bisa memasukkan Sulcata Albino yang baru
  dibeli: tombol Simpan berputar terus, tanpa pesan. Tidak satu pun kura
  tercatat lewat formulir itu sejak 14 Juli.

  Sebabnya satu baris di keadaan awal formulir — `proven_year: ""` — yang
  ikut terkirim ke kolom bertipe ANGKA selama kura itu bukan proven breeder.
  Server menolak seluruh permintaan dengan 422, dan penolakannya tidak
  pernah ditangkap, jadi `setSaving(false)` tidak pernah tercapai.

  Dibuktikan dengan mengirim muatan formulir apa adanya ke API: dengan
  `proven_year: ""` ditolak 422, tanpa baris itu tersimpan.

  Yang dijaga di sini: setiap kolom angka dan tanggal di skema Tortoise
  mengubah teks kosong jadi `null` — `null`, bukan dibuang, supaya
  MENGOSONGKAN tanggal yang sudah terisi tetap benar-benar mengosongkannya.
*/
const BK = await import(`file://${join(dir, "bersihkura.cjs")}`).then((m) => m.default || m);

/* Muatan persis seperti yang dikirim formulir untuk kura baru. */
const kuraBaru = BK.bersihkanKura({
  name: "Albino 1", code: "ALB-1", gender: "", morph: "albino",
  species: "sulcata", source: "beli_lokal",
  is_proven: false, proven_year: "", birth_date: "", purchase_date: "",
  status: "aktif", enclosure: "W1", notes: "",
});
const bersihUji = [
  ["proven_year", null],
  ["birth_date", null],
  ["purchase_date", null],
  // Teks kosong bukan nilai enum yang dikenali siapa pun; anakan dari
  // EggGrid selalu "belum_diketahui", dan kura dari formulir kini sama.
  ["gender", "belum_diketahui"],
  // Yang bukan kolom angka/tanggal tidak boleh ikut berubah.
  ["notes", ""],
  ["morph", "albino"],
  ["enclosure", "W1"],
  ["is_proven", false],
];
for (const [kolom, harap] of bersihUji) {
  if (kuraBaru[kolom] !== harap) {
    temuan.push(`bersihkan kura: ${kolom} = ${JSON.stringify(kuraBaru[kolom])}, seharusnya ${JSON.stringify(harap)}`);
  }
}

/* Angka yang DITULIS tetap jadi angka, bukan teks. */
const kuraProven = BK.bersihkanKura({ proven_year: "2024", weight_grams: "3500", shell_length_cm: "28,5" });
if (kuraProven.proven_year !== 2024) temuan.push(`bersihkan kura: proven_year "2024" jadi ${JSON.stringify(kuraProven.proven_year)}, seharusnya angka 2024`);
if (kuraProven.weight_grams !== 3500) temuan.push(`bersihkan kura: weight_grams "3500" jadi ${JSON.stringify(kuraProven.weight_grams)}, seharusnya angka 3500`);
/* "28,5" bukan angka yang bisa dibaca Number() — jadi null, BUKAN NaN.
   NaN ditolak server dengan pesan yang sama membingungkannya. */
if (kuraProven.shell_length_cm !== null) temuan.push(`bersihkan kura: "28,5" jadi ${String(kuraProven.shell_length_cm)}, seharusnya null (bukan NaN)`);

/* Nol dan tanggal yang sah TIDAK boleh ikut dikosongkan. */
const kuraNol = BK.bersihkanKura({ weight_grams: 0, purchase_price: "0", birth_date: "2020-01-01" });
if (kuraNol.weight_grams !== 0) temuan.push(`bersihkan kura: berat 0 jadi ${JSON.stringify(kuraNol.weight_grams)}, seharusnya tetap 0`);
if (kuraNol.purchase_price !== 0) temuan.push(`bersihkan kura: harga "0" jadi ${JSON.stringify(kuraNol.purchase_price)}, seharusnya angka 0`);
if (kuraNol.birth_date !== "2020-01-01") temuan.push(`bersihkan kura: tanggal sah ikut dikosongkan`);

/* Kolom yang tidak dikirim TIDAK ditambahkan. */
const kuraSedikit = BK.bersihkanKura({ name: "X" });
if ("proven_year" in kuraSedikit || "gender" in kuraSedikit) {
  temuan.push("bersihkan kura: kolom yang tidak dikirim malah ditambahkan");
}

/* Spasi saja sama dengan kosong. */
if (BK.bersihkanKura({ proven_year: "   " }).proven_year !== null) {
  temuan.push("bersihkan kura: proven_year berisi spasi tidak dijadikan null");
}

/* Setiap kolom di daftar memang ada di skema Tortoise — salah ketik di
   daftarnya berarti kolom yang sebenarnya tetap lolos sebagai teks kosong. */
{
  const skema = JSON.parse(kupasKomentar(readFileSync(join(AKAR, "base44/entities/Tortoise.jsonc"), "utf8")));
  for (const k of BK.KOLOM_ANGKA) {
    if (skema.properties?.[k]?.type !== "number") temuan.push(`bersihkan kura: KOLOM_ANGKA "${k}" bukan number di skema Tortoise`);
  }
  for (const k of BK.KOLOM_TANGGAL) {
    if (skema.properties?.[k]?.format !== "date") temuan.push(`bersihkan kura: KOLOM_TANGGAL "${k}" bukan tanggal di skema Tortoise`);
  }
  /* Dan sebaliknya: kolom angka/tanggal BARU di skema harus ikut didaftar,
     kalau tidak cacat yang sama kembali lewat kolom yang lain. */
  for (const [k, v] of Object.entries(skema.properties || {})) {
    if (v?.type === "number" && !BK.KOLOM_ANGKA.includes(k)) temuan.push(`bersihkan kura: kolom angka "${k}" ada di skema tapi tidak didaftar`);
    if (v?.format === "date" && !BK.KOLOM_TANGGAL.includes(k)) temuan.push(`bersihkan kura: kolom tanggal "${k}" ada di skema tapi tidak didaftar`);
  }
}

/*
  ── KEANDALAN SUPPLIER: peringkat dari pengiriman yang BENAR-BENAR tercatat ─

  Sampai 18 Okt 2026 tidak ada satu pun barang masuk yang menunjuk balik ke
  entitas Supplier — kolomnya teks bebas dan nol baris terisi. Layar Harga
  karena itu mengatakan terus terang bahwa yang diurutkannya HARGA, bukan
  keandalan. `supplier_id` di StockMovement menutup jarak itu.

  Yang dijaga di sini adalah hal-hal yang membuat peringkat semacam ini
  berbohong dengan rapi:

  · Supplier yang BELUM pernah mengirim harus tetap muncul. Menyaringnya
    membuat daftar terbaca seperti semua supplier pernah datang — padahal
    yang paling perlu dilihat pemiliknya justru yang didaftarkan lalu
    menghilang.
  · Satu pengiriman tidak membuktikan irama apa pun. Menyebut supplier
    "tidak tepat janji" karena baru sekali datang adalah tuduhan yang tidak
    dimiliki datanya — jawabannya harus `null`, bukan `false`.
  · Barang keluar, data uji, dan baris yang dikecualikan dari laporan tidak
    boleh terhitung sebagai pengiriman.
*/
const PS = await import(`file://${join(dir, "pasar.cjs")}`).then((m) => m.default || m);
const KINI_PS = new Date("2026-10-18T00:00:00Z");
const sup = (id, nama, rutin, irama) => ({ id, name: nama, hp_whatsapp: "0812", rutin_kirim: rutin, irama_kirim: irama });
const gerak = (supplier_id, date, lain = {}) => ({ type: "masuk", supplier_id, date, total_value: 100, ...lain });

const SUP_UJI = [
  sup("s1", "Mingguan Tepat", true, "mingguan"),
  sup("s2", "Mingguan Molor", true, "mingguan"),
  sup("s3", "Baru Sekali", true, "mingguan"),
  sup("s4", "Tanpa Janji", false, ""),
  sup("s5", "Belum Pernah", true, "harian"),
];
const GERAK_UJI = [
  // s1: tiap 7 hari persis → rata-rata 7, janji 7 → tepat.
  gerak("s1", "2026-10-01"), gerak("s1", "2026-10-08"), gerak("s1", "2026-10-15"),
  // s2: tiap 20 hari, janji 7 → di luar toleransi 1,5×.
  gerak("s2", "2026-08-29"), gerak("s2", "2026-09-18"), gerak("s2", "2026-10-08"),
  // s3: sekali saja — tidak cukup untuk menilai irama.
  gerak("s3", "2026-10-10"),
  // s4: dua kali, tanpa janji → tidak ada yang bisa dibandingkan.
  gerak("s4", "2026-10-01"), gerak("s4", "2026-10-05"),
  // Yang TIDAK boleh terhitung:
  { type: "keluar", supplier_id: "s5", date: "2026-10-17", total_value: 100 },
  gerak("s5", "2026-10-17", { is_test_data: true }),
  gerak("s5", "2026-10-16", { excluded_from_reports: true }),
  gerak("", "2026-10-17"),
  gerak("s99", "2026-10-17"),
  // Dua baris pada TANGGAL yang sama = satu pengiriman: satu kedatangan
  // sering berisi beberapa jenis barang, dan menghitungnya dua kali membuat
  // supplier terlihat dua kali lebih sering datang daripada kenyataannya.
  gerak("s1", "2026-10-15", { total_value: 50 }),
];
const andal = PS.keandalanSupplier({ movements: GERAK_UJI, suppliers: SUP_UJI, hariIni: KINI_PS });
const cari = (id) => andal.find((a) => a.id === id);

const andalUji = [
  // [id, pengiriman, rataJeda, tepatJanji, hariSejakTerakhir]
  ["s1", 3, 7, true, 3],
  ["s2", 3, 20, false, 10],
  ["s3", 1, null, null, 8],
  ["s4", 2, 4, null, 13],
  ["s5", 0, null, null, null],
];
for (const [id, kirim, jeda, janji, sejak] of andalUji) {
  const a = cari(id);
  if (!a) { temuan.push(`keandalan supplier: ${id} tidak ada di hasil`); continue; }
  if (a.pengiriman !== kirim) temuan.push(`keandalan ${a.nama}: ${a.pengiriman} pengiriman, seharusnya ${kirim}`);
  if (a.rataJeda !== jeda) temuan.push(`keandalan ${a.nama}: rata-rata jeda ${a.rataJeda}, seharusnya ${jeda}`);
  if (a.tepatJanji !== janji) temuan.push(`keandalan ${a.nama}: tepatJanji ${a.tepatJanji}, seharusnya ${janji}`);
  if (a.hariSejakTerakhir !== sejak) temuan.push(`keandalan ${a.nama}: ${a.hariSejakTerakhir} hari sejak terakhir, seharusnya ${sejak}`);
}
/* Semua supplier terdaftar ikut, termasuk yang nol pengiriman. */
if (andal.length !== SUP_UJI.length) temuan.push(`keandalan supplier: ${andal.length} baris, seharusnya ${SUP_UJI.length} (yang belum pernah kirim ikut)`);
/* Nilai yang dijumlahkan hanya dari baris yang sah: 100+100+100+50. */
if (cari("s1")?.nilai !== 350) temuan.push(`keandalan s1: nilai ${cari("s1")?.nilai}, seharusnya 350`);
/* Baris yang ditolak tidak menyumbang nilai sepeser pun. */
if (cari("s5")?.nilai !== 0) temuan.push(`keandalan s5: nilai ${cari("s5")?.nilai}, seharusnya 0 — barang keluar/data uji ikut terhitung`);
/* Yang paling sering kirim di atas; yang belum pernah di bawah. */
if (andal[0].pengiriman < andal[andal.length - 1].pengiriman) temuan.push("keandalan supplier: urutannya tidak dari yang paling sering kirim");
if (andal[andal.length - 1].id !== "s5") temuan.push(`keandalan supplier: baris terakhir ${andal[andal.length - 1].id}, seharusnya s5 (belum pernah kirim)`);
/* Tanpa data sama sekali: daftar kosong, bukan error. */
if (PS.keandalanSupplier().length !== 0) temuan.push("keandalan supplier: tanpa argumen tidak mengembalikan daftar kosong");

/*
  ── INISIATIF DIKELOMPOKKAN: satu keputusan untuk banyak catatan ───────────

  Antrean 12 Okt 2026 berisi 303 catatan tetapi hanya 79 judul, dari dua
  orang, sepanjang 94 hari. Yang diuji di sini dua hal yang paling mudah
  salah:

  1. Pengelompokannya menyatukan pekerjaan yang sama ditulis beda ("Pakan
     adabra" / "Kasik pakan adabra" — 62 catatan) tanpa menyatukan pekerjaan
     yang berbeda.

  2. Kuota harian menumpuk SAMBIL BERJALAN. Batasnya berlaku per orang per
     tanggal; menghitung tiap catatan terhadap potret kuota yang sama membuat
     dua catatan sehari masing-masing melihat kuota penuh lalu bersama-sama
     melewatinya. Pada data sungguhan ini bukan kasus teori: 4 kelompok
     teratas @15 poin meminta 3.075 dan hanya 2.670 yang boleh keluar.
*/
const KI = await import(`file://${join(dir, "kelompok.cjs")}`).then((m) => m.default || m);
const SET_INI = { poin_tambahan_maks_harian: 30, poin_tambahan_opsi: [0, 5, 10, 15] };
const log = (id, judul, tgl, email = "a@x") => ({
  id, item_label: judul, period_key: tgl, done_by_email: email, done_by: email,
  is_extra: true, approval_status: "pending",
});

const kelUji = KI.kelompokkanInisiatif([
  log("1", "Pakan adabra", "2026-10-01"),
  log("2", "Kasik pakan adabra", "2026-10-02"),
  log("3", "Cari rumput", "2026-10-03"),
]);
if (kelUji.length !== 2) temuan.push(`kelompok inisiatif: ${kelUji.length} kelompok, seharusnya 2`);
const kPakan = kelUji.find((k) => k.judul.some((j) => j.includes("adabra")));
if (!kPakan || kPakan.jumlah !== 2) temuan.push("kelompok inisiatif: 'Pakan adabra' dan 'Kasik pakan adabra' tidak disatukan");
if (kPakan && kPakan.judul.length !== 2) temuan.push("kelompok inisiatif: judul anggotanya tidak dibawa keluar semua");

/*
  Pekerjaan yang NYARIS tertukar harus tetap terpisah.

  Pasangan ini bukan karangan: lib/miripTugas.js mencatatnya sebagai salah
  satu dari empat kecocokan salah yang membuat ambangnya dinaikkan ke 0,6 —
  "Bersihkan tempat cuci rumput" (30 catatan) sempat tercocokkan dengan
  "Bersihkan rumput di pagar". Tanpa kasus ini, melonggarkan ambang sampai
  0,2 pun tidak menjatuhkan satu uji pun: "Cari rumput" dan "Pakan adabra"
  memang tidak punya satu kata pun yang sama, jadi ia bukan penjaga ambang.
  Ditemukan lewat uji merah, 12 Okt 2026.
*/
const kelDekat = KI.kelompokkanInisiatif([
  log("x", "Bersihkan tempat cuci rumput", "2026-10-01"),
  log("y", "Bersihkan rumput di pagar", "2026-10-02"),
]);
if (kelDekat.length !== 2) {
  temuan.push(`kelompok inisiatif: "cuci rumput" dan "rumput di pagar" disatukan — ambang kemiripannya terlalu longgar`);
}

/* Dua catatan sehari, 15 poin, batas 30 → keduanya penuh. */
const satuHari = KI.kelompokkanInisiatif([log("a", "Cari rumput", "2026-10-01"), log("b", "Cari rumput", "2026-10-01")]);
const r2 = KI.rencanaPemberian({ kelompok: satuHari, pilihan: { [satuHari[0].kunci]: 15 }, logsLain: [], settings: SET_INI });
if (r2.totalDiberikan !== 30) temuan.push(`kelompok inisiatif: 2 catatan sehari @15 memberi ${r2.totalDiberikan}, seharusnya 30`);

/* TIGA catatan sehari → yang ketiga kena batas. Ini yang membedakan rencana
   yang menumpuk dari rencana yang membaca potret kuota yang sama. */
const tigaHari = KI.kelompokkanInisiatif([
  log("a", "Cari rumput", "2026-10-01"), log("b", "Cari rumput", "2026-10-01"), log("c", "Cari rumput", "2026-10-01"),
]);
const r3 = KI.rencanaPemberian({ kelompok: tigaHari, pilihan: { [tigaHari[0].kunci]: 15 }, logsLain: [], settings: SET_INI });
if (r3.totalDiberikan !== 30) temuan.push(`kelompok inisiatif: 3 catatan sehari @15 memberi ${r3.totalDiberikan}, seharusnya 30 (yang ketiga kena batas)`);
if (r3.jumlahTerpotong !== 1) temuan.push(`kelompok inisiatif: ${r3.jumlahTerpotong} baris terpotong, seharusnya 1`);

/* Hari berbeda → masing-masing dapat kuota sendiri. */
const beda = KI.kelompokkanInisiatif([log("a", "Cari rumput", "2026-10-01"), log("b", "Cari rumput", "2026-10-02"), log("c", "Cari rumput", "2026-10-03")]);
const r4 = KI.rencanaPemberian({ kelompok: beda, pilihan: { [beda[0].kunci]: 15 }, logsLain: [], settings: SET_INI });
if (r4.totalDiberikan !== 45) temuan.push(`kelompok inisiatif: 3 hari berbeda @15 memberi ${r4.totalDiberikan}, seharusnya 45`);

/* Orang berbeda pada hari yang sama → kuota masing-masing. */
const duaOrang = KI.kelompokkanInisiatif([
  log("a", "Cari rumput", "2026-10-01", "a@x"), log("b", "Cari rumput", "2026-10-01", "a@x"),
  log("c", "Cari rumput", "2026-10-01", "b@x"), log("d", "Cari rumput", "2026-10-01", "b@x"),
]);
const r5 = KI.rencanaPemberian({ kelompok: duaOrang, pilihan: { [duaOrang[0].kunci]: 15 }, logsLain: [], settings: SET_INI });
if (r5.totalDiberikan !== 60) temuan.push(`kelompok inisiatif: 2 orang × 2 catatan @15 memberi ${r5.totalDiberikan}, seharusnya 60`);

/* Poin yang SUDAH disetujui hari itu ikut memakan kuota. */
const r6 = KI.rencanaPemberian({
  kelompok: satuHari, pilihan: { [satuHari[0].kunci]: 15 },
  logsLain: [{ id: "lama", is_extra: true, approval_status: "approved", done_by_email: "a@x", period_key: "2026-10-01", poin_earned: 20 }],
  settings: SET_INI,
});
if (r6.totalDiberikan !== 10) temuan.push(`kelompok inisiatif: dengan 20 poin terpakai, 2 catatan @15 memberi ${r6.totalDiberikan}, seharusnya 10`);

/* Kelompok tanpa angka TIDAK ikut direncanakan — penilai belum memutuskan. */
const r7 = KI.rencanaPemberian({ kelompok: kelUji, pilihan: {}, logsLain: [], settings: SET_INI });
if (r7.jumlahCatatan !== 0) temuan.push(`kelompok inisiatif: kelompok tanpa pilihan ikut direncanakan (${r7.jumlahCatatan} baris)`);

/* Nol yang DIPILIH tetap direncanakan: "nol poin" adalah keputusan,
   berbeda dari "belum diputuskan". */
const r8 = KI.rencanaPemberian({ kelompok: satuHari, pilihan: { [satuHari[0].kunci]: 0 }, logsLain: [], settings: SET_INI });
if (r8.jumlahCatatan !== 2) temuan.push(`kelompok inisiatif: pilihan 0 poin tidak direncanakan (${r8.jumlahCatatan} baris)`);

/*
  ── KLUSTER PENYAKIT: yang lama berhenti meminta tindakan ──────────────────

  Kartu kluster di beranda berbunyi "Periksa pergantian pakan, cuaca, atau
  kualitas air pada tanggal 22 Jul 2026". Dideteksi tanpa batas waktu sama
  sekali, jadi pada 12 Okt 2026 ia masih meminta sesuatu yang mustahil — dan
  satu-satunya cara menghilangkannya adalah × yang disimpan per peramban.

  Yang diuji di sini: batasnya dihitung dari tanggal TERAKHIR kluster, bukan
  tanggal pertamanya. Kluster yang MULAI 20 hari lalu tetapi kasus terakhirnya
  kemarin masih berjalan, dan menyembunyikannya justru kebalikan dari yang
  dimaksud.
*/
const KL = await import(`file://${join(dir, "kluster.cjs")}`).then((m) => m.default || m);
const KINI = new Date("2026-10-12T00:00:00Z");
const klusterUji = [
  ["kluster Juli yang nyata (82 hari)", { end_date: "2026-07-22" }, false],
  ["tepat di batas 14 hari", { end_date: "2026-09-28" }, true],
  ["sehari lewat batas", { end_date: "2026-09-27" }, false],
  ["kemarin", { end_date: "2026-10-11" }, true],
  // Mulai lama, kasus terakhirnya kemarin: MASIH berjalan.
  ["mulai 20 hari lalu, kasus terakhir kemarin", { start_date: "2026-09-22", end_date: "2026-10-11" }, true],
  // Tanggal di masa depan (salah ketik) tetap tampil: itu justru perlu dilihat.
  ["tanggal besok", { end_date: "2026-10-13" }, true],
  ["tanpa tanggal", {}, false],
];
for (const [nama, k, harap] of klusterUji) {
  const lolos = KL.klusterAktif([k], { hariIni: KINI }).length === 1;
  if (lolos !== harap) {
    temuan.push(`kluster "${nama}": ${lolos ? "tampil" : "disembunyikan"}, seharusnya ${harap ? "tampil" : "disembunyikan"}`);
  }
}
// Ambangnya harus bisa diatur dari pemanggil, bukan dipatok mati.
if (KL.klusterAktif([{ end_date: "2026-07-22" }], { hariIni: KINI, hari: 365 }).length !== 1) {
  temuan.push("kluster: parameter `hari` tidak dipakai");
}
if (KL.HARI_KLUSTER_AKTIF !== 14) {
  temuan.push(`kluster: HARI_KLUSTER_AKTIF = ${KL.HARI_KLUSTER_AKTIF}, bukan 14`);
}

// Tanpa target: NULL, bukan nol. Bilah kosong terbaca "belum tercapai",
// padahal yang benar "belum ditetapkan" — dua keadaan yang berbeda tindakannya.
if (TGT.kemajuanTarget({ goal: null, telur: 10, omzet: 10 }) !== null) {
  temuan.push("target tanpa AnnualGoal: menghasilkan angka, seharusnya null");
}

// Melampaui target tidak dibulatkan jadi "pas".
{
  const k = TGT.kemajuanTarget({ goal: GOAL, telur: 600, omzet: 0, hariIni: hari("2026-10-11") });
  if (k.telur.persenAsli !== 120) temuan.push(`target lampaui: persenAsli ${k.telur.persenAsli}, bukan 120`);
  if (k.telur.persen !== 100) temuan.push(`target lampaui: bilahnya ${k.telur.persen}%, seharusnya dipotong di 100`);
}

// "Perlu per hari" adalah sisa dibagi hari yang BENAR-BENAR tersisa.
{
  const k = TGT.kemajuanTarget({ goal: GOAL, telur: 343, omzet: 0, hariIni: hari("2026-10-11") });
  const benar = (500 - 343) / 81;
  if (Math.abs(k.telur.perluPerHari - benar) > 1e-9) {
    temuan.push(`target perluPerHari: ${k.telur.perluPerHari}, bukan ${benar}`);
  }
  if (TGT.kalimatSasaran(k.telur, " telur") !== "perlu 1,9 telur/hari") {
    temuan.push(`target kalimat: "${TGT.kalimatSasaran(k.telur, " telur")}"`);
  }
}

// Tahun kabisat punya 366 hari — kalau tidak, persenWaktu meleset sepanjang tahun.
if (TGT.hariSetahun(2024) !== 366 || TGT.hariSetahun(2026) !== 365 || TGT.hariSetahun(2100) !== 365) {
  temuan.push("hariSetahun: kabisat salah");
}

rmSync(dir, { recursive: true, force: true });

/* ── Clutch yang perlu dipantau di beranda ─────────────────────────── */

/*
 * Clutch C23 yang sungguhan (12 Agt 2026): jendela menetas 31 Okt - 25 Nov.
 * Hari acuannya dipatok supaya jawabannya tidak berubah tiap penjaga
 * dijalankan.
 */
const KEBUN_MUNDUR = [
  { female_name: "C23", status: "bertelur", estimated_hatch_start: "2026-10-31", estimated_hatch_end: "2026-11-25" },
  { female_name: "A31", status: "bertelur", estimated_hatch_start: "2026-11-23", estimated_hatch_end: "2026-12-18" },
  { female_name: "A47", status: "bertelur", estimated_hatch_start: "2026-11-25", estimated_hatch_end: "2026-12-20" },
  { female_name: "C24", status: "selesai", estimated_hatch_start: "2026-06-27", estimated_hatch_end: "2026-07-22" },
];
const mendesakUji = [
  ["2026-10-04", 0, 0, 0, "masih jauh — beranda tidak menyebut apa-apa"],
  ["2026-10-27", 0, 0, 1, "C23 empat hari lagi"],
  ["2026-11-05", 0, 1, 0, "C23 sedang di dalam jendela"],
  // 20 Nov: C23 di dalam jendela; A31 (23 Nov) 3 hari lagi dan A47 (25 Nov)
  // 5 hari lagi — KEDUANYA di bawah tujuh hari, jadi dua-duanya "segera".
  ["2026-11-20", 0, 1, 2, "C23 masih menetas, A31 dan A47 di bawah tujuh hari"],
  // 26 Nov: jendela C23 (s/d 25 Nov) sudah lewat; jendela A31 dan A47
  // dua-duanya sudah terbuka.
  ["2026-11-26", 1, 2, 0, "C23 lewat perkiraan, A31 dan A47 sedang menetas"],
];
for (const [hari, lewat, masa, segera, kenapa] of mendesakUji) {
  const m = M.clutchMendesak(KEBUN_MUNDUR, new Date(`${hari}T17:30:00`));
  if (m.lewat.length !== lewat || m.masa.length !== masa || m.segera.length !== segera) {
    temuan.push(
      `clutchMendesak pada ${hari}: lewat ${m.lewat.length}/${lewat}, masa ${m.masa.length}/${masa}, ` +
      `segera ${m.segera.length}/${segera} — ${kenapa}`,
    );
  }
  if (m.total !== lewat + masa + segera) {
    temuan.push(`clutchMendesak pada ${hari}: total ${m.total}, seharusnya ${lewat + masa + segera}`);
  }
}
/*
 * Clutch yang sudah selesai TIDAK boleh ikut — kalau ikut, beranda akan
 * menagih penetasan yang sudah dicatat berbulan-bulan lalu, tiap hari,
 * selamanya.
 */
const adaSelesai = M.clutchMendesak(KEBUN_MUNDUR, new Date("2026-11-26T17:30:00"));
const semuaNama = [...adaSelesai.lewat, ...adaSelesai.masa, ...adaSelesai.segera].map((x) => x.breeding.female_name);
if (semuaNama.includes("C24")) {
  temuan.push("clutchMendesak: clutch berstatus \"selesai\" ikut ditagih — beranda akan menagihnya tiap hari selamanya");
}

/* ── Peringkat indukan ─────────────────────────────────────────────── */

/*
 * Ketigabelas clutch yang sungguhan, 4 Okt 2026. Angka harapannya dihitung
 * tangan dari daftar ini, bukan disalin dari keluaran kodenya sendiri — uji
 * yang menyalin jawabannya hanya memastikan kodenya tidak berubah, bukan
 * memastikan kodenya benar.
 */
const CLUTCH_NYATA_2026 = [
  { female_name: "C23", male_name: "A40", egg_laying_date: "2026-10-02", season_year: 2026, egg_count: 28, hatched_count: null, status: "bertelur" },
  { female_name: "A31", male_name: "A36", egg_laying_date: "2026-10-01", season_year: 2026, egg_count: 22, hatched_count: null, status: "bertelur" },
  { female_name: "B108", male_name: "A43", egg_laying_date: "2026-09-30", season_year: 2026, egg_count: 13, hatched_count: null, status: "bertelur" },
  { female_name: "A48", male_name: "A35", egg_laying_date: "2026-09-26", season_year: 2026, egg_count: 13, hatched_count: null, status: "bertelur" },
  { female_name: "C22", male_name: "A37", egg_laying_date: "2026-09-14", season_year: 2026, egg_count: 17, hatched_count: null, status: "bertelur" },
  { female_name: "C23", male_name: "A40", egg_laying_date: "2026-09-09", season_year: 2026, egg_count: 23, hatched_count: null, status: "bertelur" },
  { female_name: "A47", male_name: "A35", egg_laying_date: "2026-09-06", season_year: 2026, egg_count: 25, hatched_count: null, status: "bertelur" },
  { female_name: "A31", male_name: "A36", egg_laying_date: "2026-09-04", season_year: 2026, egg_count: 23, hatched_count: 0, status: "bertelur" },
  { female_name: "A46", male_name: "A35", egg_laying_date: "2026-09-04", season_year: 2026, egg_count: 22, hatched_count: null, status: "bertelur" },
  { female_name: "C23", male_name: "A40", egg_laying_date: "2026-08-12", season_year: 2026, egg_count: 22, hatched_count: null, status: "bertelur" },
  { female_name: "C24", male_name: "A36", egg_laying_date: "2026-03-09", season_year: 2026, egg_count: 25, hatched_count: 7, status: "selesai" },
  { female_name: "C14", male_name: "A29", egg_laying_date: "2026-03-16", season_year: 2026, egg_count: 23, hatched_count: 20, status: "selesai" },
  { female_name: "C24", male_name: "A36", egg_laying_date: "2026-04-08", season_year: 2026, egg_count: 24, hatched_count: 22, status: "selesai" },
];
const opsiPeringkat = { tahunIni: 2026, jumlahMusim: 1, healthRecords: [] };

/*
 * Tingkat penetasan kebun: 49 menetas dari 72 telur yang SUDAH ada hasilnya
 * (25 + 23 + 24). Bukan dari 280 telur yang pernah tercatat — 208 di
 * antaranya masih dierami hari ini, dan menghitungnya sebagai gagal membuat
 * 68,1% terbaca 17,5%.
 */
const semuaClutch = H.ringkasProduksi(CLUTCH_NYATA_2026);
if (semuaClutch.totalTelur !== 280) temuan.push(`ringkasProduksi.totalTelur: ${semuaClutch.totalTelur}, seharusnya 280`);
if (semuaClutch.telurAdaHasil !== 72) temuan.push(`ringkasProduksi.telurAdaHasil: ${semuaClutch.telurAdaHasil}, seharusnya 72`);
if (semuaClutch.totalMenetas !== 49) temuan.push(`ringkasProduksi.totalMenetas: ${semuaClutch.totalMenetas}, seharusnya 49`);
if (semuaClutch.telurMasihDierami !== 208) temuan.push(`ringkasProduksi.telurMasihDierami: ${semuaClutch.telurMasihDierami}, seharusnya 208`);
if (semuaClutch.hatchRate.toFixed(1) !== "68.1") {
  temuan.push(`hatchRate kebun: ${semuaClutch.hatchRate.toFixed(1)}%, seharusnya 68,1% (49/72 — bukan 49/280 = 17,5%)`);
}
if (H.ringkasTelurDicek(CLUTCH_NYATA_2026).persen.toFixed(1) !== semuaClutch.hatchRate.toFixed(1)) {
  temuan.push("ringkasTelurDicek dan ringkasProduksi menjawab beda untuk data yang sama — dua layar akan menyebut dua angka");
}

/*
 * Tab Induk Betina: tiap betina harus punya "clutch tahun ini" yang BENAR.
 * Dulu ditulis 0 mati di kode, jadi C23 yang bertelur tiga kali tahun ini
 * pun tertulis nol.
 */
const betinaPeringkat = P.peringkat(
  CLUTCH_NYATA_2026,
  (b) => b.female_name,
  (b) => ({ maleName: "—", femaleName: b.female_name }),
  opsiPeringkat,
);
const betinaUji = [
  ["C23", 3, 73, 0],
  ["A31", 2, 45, 0],
  ["C24", 2, 49, 29],
  ["C14", 1, 23, 20],
  ["B108", 1, 13, 0],
];
for (const [nama, clutchTahunIni, telur, menetas] of betinaUji) {
  const baris = betinaPeringkat.find((x) => x.femaleName === nama);
  if (!baris) { temuan.push(`peringkat betina: ${nama} tidak ada di daftar`); continue; }
  if (baris.clutchesThisYear !== clutchTahunIni) {
    temuan.push(`peringkat betina ${nama}: clutch tahun ini ${baris.clutchesThisYear}, seharusnya ${clutchTahunIni} — angka mati 0 pernah dipajang untuk semua betina`);
  }
  if (baris.totalEggs !== telur) temuan.push(`peringkat betina ${nama}: ${baris.totalEggs} telur, seharusnya ${telur}`);
  if (baris.totalHatched !== menetas) temuan.push(`peringkat betina ${nama}: ${baris.totalHatched} menetas, seharusnya ${menetas}`);
}
const c23Baris = betinaPeringkat.find((x) => x.femaleName === "C23");
if (c23Baris && c23Baris.terakhirBertelur !== "2026-10-02") {
  temuan.push(`peringkat betina C23: terakhir bertelur "${c23Baris.terakhirBertelur}", seharusnya "2026-10-02"`);
}
const jantanPeringkat = P.peringkat(CLUTCH_NYATA_2026, (b) => b.male_name, (b) => ({ maleName: b.male_name, femaleName: "—" }), opsiPeringkat);
const a35Baris = jantanPeringkat.find((x) => x.maleName === "A35");
if (!a35Baris || a35Baris.clutchesThisYear !== 3) {
  temuan.push(`peringkat jantan A35: clutch tahun ini ${a35Baris?.clutchesThisYear}, seharusnya 3`);
}
const jumlahBobot = P.BOBOT.hatchRate + P.BOBOT.telur + P.BOBOT.clutch;
if (Math.abs(jumlahBobot - 1) > 1e-9) {
  temuan.push(`BOBOT skor berjumlah ${jumlahBobot}, seharusnya 1`);
}

/* ── Telur per tahun ───────────────────────────────────────────────── */

/*
 * Keempat belas clutch yang sungguhan semuanya 2026 — catatan pertama
 * dibuat 17 Mei 2026, jadi 2025 benar-benar kosong. Rekap harus
 * MEMBEDAKAN "tidak ada catatan" dari "nol telur": yang pertama berarti
 * aplikasinya belum dipakai, yang kedua berarti tidak ada yang bertelur.
 */
const CLUTCH_TAHUNAN = [
  ...CLUTCH_NYATA_2026,
  // Catatan terbaru, 4 Okt 2026: A46 x A35, 24 butir, tray 5.
  { female_name: "A46", male_name: "A35", egg_laying_date: "2026-10-04", season_year: 2026, egg_count: 24, hatched_count: null, status: "bertelur" },
];
const rekap2026 = Y.rekapTahunan(CLUTCH_TAHUNAN, { tahunIni: 2026 });
const tahunanUji = [
  [2026, true, 14, 304, 49],
  [2025, false, 0, 0, 0],
];
for (const [tahun, adaCatatan, clutch, telur, menetas] of tahunanUji) {
  const b = rekap2026.find((x) => x.tahun === tahun);
  if (!b) { temuan.push(`rekapTahunan: tahun ${tahun} tidak muncul — tahun kosong pun harus tetap ada barisnya`); continue; }
  if (b.adaCatatan !== adaCatatan) temuan.push(`rekapTahunan ${tahun}: adaCatatan ${b.adaCatatan}, seharusnya ${adaCatatan}`);
  if (b.clutch !== clutch) temuan.push(`rekapTahunan ${tahun}: ${b.clutch} clutch, seharusnya ${clutch}`);
  if (b.telur !== telur) temuan.push(`rekapTahunan ${tahun}: ${b.telur} telur, seharusnya ${telur}`);
  if (b.menetas !== menetas) temuan.push(`rekapTahunan ${tahun}: ${b.menetas} menetas, seharusnya ${menetas}`);
}
// Sembilan betina berbeda bertelur pada 2026: C23, A31, B108, A48, C22,
// A47, A46, C24, C14 — A46 dan C23 masing-masing lebih dari sekali.
if (rekap2026.find((x) => x.tahun === 2026)?.induk !== 9) {
  temuan.push(`rekapTahunan 2026: ${rekap2026.find((x) => x.tahun === 2026)?.induk} induk, seharusnya 9 (betina yang sama tidak boleh dihitung dua kali)`);
}
// Terbaru dulu.
if (rekap2026[0]?.tahun !== 2026) {
  temuan.push(`rekapTahunan: baris pertama tahun ${rekap2026[0]?.tahun}, seharusnya 2026 — terbaru dulu`);
}
/*
 * Selisih TIDAK boleh dihitung terhadap tahun yang tidak punya catatan.
 * "+304 butir dibanding 2025" bukan pertumbuhan — itu hanya tanda kapan
 * pencatatan dimulai.
 */
if (rekap2026.find((x) => x.tahun === 2026)?.selisihTelur !== null) {
  temuan.push("rekapTahunan 2026: selisih dihitung terhadap 2025 yang tidak punya catatan — itu bukan pertumbuhan, itu awal pencatatan");
}
// Dua tahun yang sama-sama berisi: selisihnya dihitung.
const duaTahun = Y.rekapTahunan([
  { female_name: "C23", egg_laying_date: "2026-10-04", egg_count: 24, status: "bertelur" },
  { female_name: "A31", egg_laying_date: "2025-05-02", egg_count: 31, hatched_count: 18, status: "selesai" },
], { tahunIni: 2026 });
if (duaTahun.find((x) => x.tahun === 2026)?.selisihTelur !== -7) {
  temuan.push(`rekapTahunan selisih 2026 vs 2025: ${duaTahun.find((x) => x.tahun === 2026)?.selisihTelur}, seharusnya -7 (24 - 31)`);
}
// Tahun dipotong dari TEKS: 1 Januari tidak boleh jatuh ke tahun sebelumnya.
const januari = Y.rekapTahunan([{ female_name: "X", egg_laying_date: "2026-01-01", egg_count: 5, status: "bertelur" }], { tahunIni: 2026 });
if (januari.find((x) => x.tahun === 2026)?.telur !== 5) {
  temuan.push("rekapTahunan: clutch 1 Januari tidak terhitung di tahunnya sendiri — penjebak zona waktu");
}
// Tanpa tanggal, `season_year` dipakai sebagai cadangan.
const cadangan = Y.rekapTahunan([{ female_name: "X", season_year: 2026, egg_count: 9, status: "bertelur" }], { tahunIni: 2026 });
if (cadangan.find((x) => x.tahun === 2026)?.telur !== 9) {
  temuan.push("rekapTahunan: clutch tanpa egg_laying_date hilang dari rekap — season_year seharusnya jadi cadangan");
}

/* ── Telur fertil, dan tingkat menetas yang tidak boleh membengkak ── */

/*
 * Telur yang MENETAS jelas fertil. Telur yang mati di dalam cangkang juga
 * fertil — ia terbukti dibuahi saat candling lalu gagal berkembang. Yang
 * berstatus "fertile" di baris telur hanyalah yang masih berjalan.
 *
 * Menghitung fertil sebagai `status === "fertile"` saja mengembalikan NOL
 * untuk clutch yang seluruh telurnya sudah menetas. Bentuk data di bawah
 * disalin dari C14 x A29 (16 Mar 2026): 20 menetas, 2 gagal, 1 infertil —
 * 22 dari 23 telurnya fertil, dan `fertile_count` yang tersimpan memang 22.
 */
const barisTelur = (jumlah, status) => Array.from({ length: jumlah }, (_, i) => ({ egg_number: i + 1, status }));
const C14_BARIS = [
  ...barisTelur(20, "menetas"),
  ...barisTelur(2, "gagal"),
  ...barisTelur(1, "infertil"),
];
const fertilUji = [
  [{ egg_records: C14_BARIS, fertile_count: 22 }, 22, "C14 x A29 — menetas dan gagal ikut fertil"],
  [{ egg_records: barisTelur(24, "menetas"), fertile_count: 24 }, 24, "seluruhnya menetas — bukan nol"],
  [{ egg_records: barisTelur(10, "infertil") }, 0, "seluruhnya infertil"],
  [{ egg_records: barisTelur(6, "fertile") }, 6, "masih berjalan semua"],
  [{ egg_records: [], fertile_count: 14 }, 14, "tanpa baris telur — pakai angka tersimpan"],
  [{ fertile_count: 11 }, 11, "clutch lama tanpa egg_records"],
];
for (const [clutch, harap, kenapa] of fertilUji) {
  const dapat = H.fertilClutch(clutch);
  if (dapat !== harap) temuan.push(`fertilClutch: dapat ${dapat}, seharusnya ${harap} — ${kenapa}`);
}

/*
 * EggGrid menulis `hatched_count` setiap kali satu telur ditandai menetas,
 * TANPA mengubah status clutch-nya. Jadi clutch berstatus "inkubasi" bisa
 * punya tetasan. Pembilang dan penyebut harus datang dari himpunan yang
 * SAMA — kalau tidak, angkanya membengkak dan bisa melewati 100%.
 */
const SEDANG_MENETAS = [
  { egg_count: 23, hatched_count: 20, status: "selesai" },
  { egg_count: 28, hatched_count: 5, status: "inkubasi" },
  { egg_count: 22, hatched_count: 0, status: "bertelur" },
];
const rSedang = H.ringkasProduksi(SEDANG_MENETAS);
if (rSedang.hatchRate > 100) {
  temuan.push(`ringkasProduksi: hatchRate ${rSedang.hatchRate.toFixed(1)}% melewati 100% — pembilang dan penyebut dari himpunan berbeda`);
}
if (rSedang.telurAdaHasil !== 23 || rSedang.totalMenetas !== 20) {
  temuan.push(`ringkasProduksi pada clutch yang sedang menetas: ${rSedang.totalMenetas}/${rSedang.telurAdaHasil}, seharusnya 20/23 — tetasan clutch yang masih dierami tidak boleh masuk pembilang sendirian`);
}

/*
 * Dua salinan daftar status "masih berjalan" harus bernilai SAMA.
 *
 * hasilInkubasi.js menyalinnya dari breedingUtils.js alih-alih mengimpor,
 * karena breedingUtils mengimpor dari hasilInkubasi — saling-impor membuat
 * salah satunya menerima `undefined` saat bundel dimuat. Salinan yang tidak
 * dijaga adalah salinan yang kelak berselisih, dan selisihnya di sini berarti
 * clutch yang sedang menetas kembali dihitung sebagai sudah selesai.
 */
const statusDari = (berkas, nama) => {
  const m = kupasKomentar(readFileSync(join(AKAR, berkas), "utf8"))
    .match(new RegExp(`${nama}\\s*=\\s*\\[([^\\]]*)\\]`));
  return m ? m[1].split(",").map((x) => x.trim().replace(/["']/g, "")).filter(Boolean) : null;
};
const aktifUtils = statusDari("src/lib/breedingUtils.js", "STATUS_CLUTCH_AKTIF");
const aktifHasil = statusDari("src/lib/hasilInkubasi.js", "STATUS_MASIH_BERJALAN");
if (!aktifUtils || !aktifHasil) {
  temuan.push("daftar status clutch aktif tidak ketemu di salah satu berkasnya — penjaganya berhenti menjaga tanpa suara");
} else if (aktifUtils.join("|") !== aktifHasil.join("|")) {
  temuan.push(
    `Status clutch aktif berselisih: breedingUtils = [${aktifUtils}], hasilInkubasi = [${aktifHasil}]. ` +
    `Clutch yang sedang menetas akan dihitung sebagai sudah selesai di salah satunya.`,
  );
}

/*
 * Dan layar yang MELAPORKAN fertilitas harus memakai fungsinya, bukan
 * menghitung ulang. Laporan bulanan sempat melakukannya sendiri dan
 * menyebut fertilitas nol untuk clutch yang seluruh telurnya menetas.
 *
 * EggGrid dan EggHatchChart sengaja di luar daftar: keduanya menampilkan
 * "fertile" sebagai KATEGORI di samping menetas dan gagal, bukan sebagai
 * jumlah seluruh telur fertil.
 */
const LAYAR_LAPOR_FERTIL = [
  "src/components/finance/MonthlyReportExport.jsx",
];
for (const berkas of LAYAR_LAPOR_FERTIL) {
  const isi = kupasKomentar(readFileSync(join(AKAR, berkas), "utf8"));
  if (/status\s*===\s*["']fertile["']/.test(isi)) {
    temuan.push(`${berkas}  menghitung fertil sebagai status === "fertile" saja — telur yang menetas dan yang gagal di dalam cangkang ikut fertil. Pakai fertilClutch() dari lib/hasilInkubasi.js`);
  }
  if (!/fertilClutch\s*\(/.test(isi)) {
    temuan.push(`${berkas}  tidak memakai fertilClutch() — angka fertil di laporan bisa berbeda dari yang tersimpan`);
  }
}

/* ── Tanggal dari pembaca invoice AI ───────────────────────────────── */

/*
 * Pembaca invoice mengembalikan tanggal sebagai TEKS, dan saat tidak
 * menemukannya ia mengembalikan teks `"null"` — bukan nilai null. Penulisnya
 * dulu memakai `inv.tanggal || form.date`, dan teks "null" adalah nilai yang
 * benar menurut `||`, jadi ia lolos utuh.
 *
 * Dua baris FinanceTransaction tersimpan bertanggal "null" pada 4 Okt 2026
 * karena itu, dan halaman Catat Pengeluaran MATI TOTAL: new Date("nullT00:00:00")
 * tidak sah, format() melemparnya, dan seluruh halaman diganti layar
 * "Terjadi Kesalahan: Invalid time value".
 */
const tanggalUji = [
  ["null", "2026-10-04", "teks \"null\" dari pembaca AI — justru yang merusak"],
  ["undefined", "2026-10-04", "teks \"undefined\""],
  [null, "2026-10-04", "nilai null sungguhan"],
  [undefined, "2026-10-04", "tidak diisi"],
  ["", "2026-10-04", "kosong"],
  ["bukan tanggal", "2026-10-04", "teks sembarang"],
  ["2026-13-45", "2026-10-04", "berbentuk benar tetapi bulan/tanggal mustahil"],
  ["2026-09-13", "2026-09-13", "tanggal sah — dipakai apa adanya"],
  ["2026-09-13T08:00:00", "2026-09-13", "tanggal berjam — dipotong, bukan ditolak"],
];
for (const [nilai, harap, kenapa] of tanggalUji) {
  const dapat = TGL.tanggalISOAman(nilai, "2026-10-04");
  if (dapat !== harap) {
    temuan.push(`tanggalISOAman(${JSON.stringify(nilai)}): dapat "${dapat}", seharusnya "${harap}" — ${kenapa}`);
  }
}

/*
 * Dan layar tidak boleh mati karena satu baris data yang rusak.
 * tanggalTampil mengembalikan tanda hubung, bukan melempar.
 */
const pemformat = (d) => `${d.getFullYear()}`;
for (const [nilai, harap] of [["null", "—"], [null, "—"], ["2026-09-13", "2026"]]) {
  let dapat;
  try {
    dapat = TGL.tanggalTampil(nilai, pemformat);
  } catch (e) {
    temuan.push(`tanggalTampil(${JSON.stringify(nilai)}) MELEMPAR: ${e.message} — satu baris rusak tidak boleh mematikan halaman`);
    continue;
  }
  if (dapat !== harap) temuan.push(`tanggalTampil(${JSON.stringify(nilai)}): dapat "${dapat}", seharusnya "${harap}"`);
}
/*
 * Pemformat yang melempar pun tidak boleh lolos ke atas — dan pemeriksaannya
 * sendiri harus MELAPORKAN, bukan ikut melempar. Penjaga yang mati dengan
 * jejak tumpukan alih-alih satu kalimat membuat orang menebak apa yang rusak.
 */
try {
  if (TGL.tanggalTampil("2026-09-13", () => { throw new Error("uji"); }) !== "—") {
    temuan.push("tanggalTampil: lemparan dari pemformatnya tidak ditangkap");
  }
} catch (e) {
  temuan.push(`tanggalTampil meneruskan lemparan pemformatnya (${e.message}) — satu baris rusak akan mematikan halaman`);
}

/*
 * Penulisnya harus memakai penyaring itu. Tanpa pemeriksaan ini, cukup satu
 * orang menulis `inv.tanggal || form.date` lagi dan baris "null" kembali
 * masuk — kali ini tanpa ada yang tahu sampai halamannya mati lagi.
 */
const financeSrc = kupasKomentar(readFileSync(join(AKAR, "src/pages/FinancePage.jsx"), "utf8"));
if (/date:\s*inv\.tanggal\s*\|\|/.test(financeSrc)) {
  temuan.push('src/pages/FinancePage.jsx  menulis `date: inv.tanggal || …` — teks "null" dari pembaca AI lolos lewat ||. Pakai tanggalISOAman().');
}
if (!/tanggalISOAman\s*\(/.test(financeSrc)) {
  temuan.push("src/pages/FinancePage.jsx  tidak memakai tanggalISOAman() — tanggal dari pembaca invoice masuk tanpa diperiksa");
}

if (temuan.length) {
  console.error(`${temuan.length} masalah pada ronda kandang.\n\n` + temuan.map((t) => "  " + t).join("\n") + "\n");
  process.exit(1);
}
console.log(
  `Ronda lengkap (${ronda.length} kandang dari ${NYATA.length} tercatat, keempat Bonsai ikut), ` +
  `${syarat.length} syarat muat ulang + ${jadwalUji.length} irama jadwal + ${belanjaUji.length} barang belanja + ` +
  `resep v7 (${RESMI.length} bahan) + ${stokUji.length} golongan stok + ${cariUji.length} pencarian induk + ${bulanUji.length} saringan bulan + ${mundurUji.length} hitung mundur + ${mendesakUji.length} clutch mendesak + ${betinaUji.length} peringkat betina + ${tahunanUji.length} rekap tahunan + ${fertilUji.length} hitungan fertil + ${tanggalUji.length} tanggal tak terpercaya + ${racikUji.length} izin meracik + ${usulUji.length} usul poin AI + ${setelanUji.length} kunci setelan + ${miripUji.length + miripBaruUji.length} judul mirip tugas + ${anakanUji.length} bentuk anakan + ${barisUji.length} kunci baris checklist + ${hariUji.length} bentuk hari pembayaran surut + ${jendelaUji.length} jendela bayar surut + ${tandaUjiKasus.length + checklistBaruKasus.length} penanda data uji + ${siklusUji.length} siklus bertelur + ${cekKandang.length} rekam kandang + ${jumlahUji.length} jumlah poin sejudul + ${ongkirUji.length} penanggung ongkir + ${trayUji.length} tray telur + ${ambangUji.length} ambang + ${alarmUji.length} alarm inkubator + ${targetUji.length} kemajuan target + ${klusterUji.length} umur kluster penyakit + 10 kelompok inisiatif + ${hargaUji.length + barangUji.length} harga supplier + ${andalUji.length} keandalan supplier + ${bersihUji.length} kolom kura dibersihkan + ${hargaUjiKura.length} harga beli kura + ${pitaUji.length} pita ukuran + ${asetUji.length} nilai aset + ${brgUji.length} harga barang gudang + ${asalUji.length} baris kembar asal diuji.`,
);
process.exit(0);

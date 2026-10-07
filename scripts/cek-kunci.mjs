/**
 * cek-kunci.mjs — satu kunci cache, satu bentuk data.
 *
 * ── Cacat yang ditemukan 6 Oktober 2026 ─────────────────────────────────────
 *
 * Kunci `["company-settings"]` dipakai di belasan berkas. Sepuluh di antaranya
 * mengembalikan ARRAY hasil filter:
 *
 *     queryFn: () => base44.entities.CompanySettings.filter({ setting_key: "main" })
 *     const setting = settings[0];
 *
 * Lima lainnya mengembalikan SATU OBJEK, atau null:
 *
 *     queryFn: async () => {
 *       const res = await base44.entities.CompanySettings.filter({ setting_key: "main" });
 *       return res[0] || null;
 *     }
 *     const target = settings?.min_poin_bulanan ?? 0;
 *
 * TanStack Query menyimpan per KUNCI, bukan per pemanggil. Keduanya membaca
 * dan menulis satu tempat yang sama, jadi yang terakhir mengisi cache
 * menentukan bentuk data bagi SEMUA pembaca — dan mana yang terakhir
 * tergantung urutan komponen dipasang, yang berubah dari halaman ke halaman:
 *
 *   · bentuk objek menang → `settings[0]` pada objek memberi undefined, jadi
 *     Mode Uji diam-diam mati di setiap form yang memakai `useTestMode`;
 *     pada null ia MELEMPAR, dan layar penuh mati tanpa pesan apa pun;
 *   · bentuk array menang → `settings?.min_poin_bulanan` pada array memberi
 *     undefined, jadi target poin, nilai poin, dan koordinat kandang jatuh ke
 *     angka bawaan tanpa suara.
 *
 * Yang pertama benar-benar terjadi: KeeperDashboard, GuidedHariIni, dan
 * OwnerDashboard mati dengan "Cannot read properties of null (reading '0')" —
 * dan `cek-lebar` tidak melihatnya selama berbulan-bulan karena akar React
 * yang dilepas membuat bingkai ukurnya lenyap, sehingga 110 dari 123 kasus
 * dilaporkan "bersih" tanpa pernah digambar.
 *
 * ── Yang diperiksa di sini ──────────────────────────────────────────────────
 *
 * Setiap `queryKey: ["literal"]` dicatat beserta BENTUK yang dikembalikan
 * queryFn-nya: "array" bila ia meneruskan hasil filter/list apa adanya,
 * "satu" bila ia mengembalikan `hasil[0]`. Satu kunci dengan dua bentuk
 * adalah temuan.
 *
 * Yang TIDAK diperiksa: kunci dengan bagian berubah (`["x", email]`) tetap
 * ikut tercatat lewat bagian literal pertamanya, dan itu memang yang
 * dimaksud — dua pemanggil dengan kunci dasar sama tetap berbagi cache.
 *
 * Jalankan:  node scripts/cek-kunci.mjs
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { kupasKomentar } from "./lib/kupasKomentar.mjs";

const AKAR = process.cwd();

function berkasJs(d, keluar = []) {
  for (const nama of readdirSync(d)) {
    const p = join(d, nama);
    if (statSync(p).isDirectory()) { berkasJs(p, keluar); continue; }
    if (/\.(js|jsx)$/.test(nama)) keluar.push(p);
  }
  return keluar;
}

/*
 * Blok 12 baris sesudah `queryKey` sudah cukup untuk memuat queryFn-nya pada
 * seluruh pemanggil di repo ini; yang lebih panjang mulai menangkap query
 * BERIKUTNYA dan menyalahkan kunci yang keliru.
 */
const POLA_KUNCI = /queryKey:\s*\[\s*"([^"]+)"/;

/*
 * Bentuknya dibaca dari TUBUH queryFn saja, bukan dari sekian baris sesudah
 * queryKey.
 *
 * Versi pertama penjaga ini mengambil 12 baris sesudah `queryKey` dan mencari
 * `[0]` di dalamnya. Akibatnya ia menuduh tujuh kunci bercampur bentuk,
 * padahal yang terbaca adalah baris SESUDAH useQuery selesai:
 *
 *     const { data: settings = [] } = useQuery({
 *       queryKey: ["company-settings"],
 *       queryFn: () => base44.entities.CompanySettings.filter({ ... }),
 *     });
 *     const setting = settings[0];        // ← ini pemakaian, bukan bentuk
 *
 * Membaca `settings[0]` SESUDAH query justru tanda pembaca itu mengira
 * datanya array — kebalikan dari yang dituduhkan. Jadi batasnya dicari
 * sungguhan: dari `queryFn` sampai kurungnya tertutup.
 */
function tubuhQueryFn(baris, mulai) {
  let i = mulai;
  while (i < baris.length && i < mulai + 6 && !/queryFn/.test(baris[i])) i++;
  if (i >= baris.length || !/queryFn/.test(baris[i])) return "";
  // Hitung kurung dari baris queryFn sampai kembali seimbang. Satu baris
  // `queryFn: () => base44...filter({...}),` sudah seimbang di barisnya sendiri.
  let dalam = 0, keluar = [];
  for (let j = i; j < baris.length && j < i + 40; j++) {
    keluar.push(baris[j]);
    for (const c of baris[j]) {
      if (c === "(" || c === "{" || c === "[") dalam++;
      else if (c === ")" || c === "}" || c === "]") dalam--;
    }
    if (j > i || dalam <= 0) {
      if (dalam <= 0) break;
    }
  }
  return keluar.join("\n");
}

/*
 * Tiga golongan, bukan dua — dan yang ketiga sengaja TIDAK dibandingkan.
 *
 * "satu"  : queryFn mengindeks hasilnya (`res[0] || null`) → satu baris.
 * "array" : queryFn meneruskan filter/list apa adanya → daftar.
 * "lain"  : queryFn memanggil pemilih baris sendiri (`barisAbsensiSah(res)`,
 *           `checklistSah(res)`), memetakan, atau menyusun bentuknya sendiri.
 *
 * Golongan "lain" ada karena versi pertama penjaga ini menuduh
 * `["attendance-today"]` bercampur bentuk, padahal `barisAbsensiSah(res)`
 * juga mengembalikan SATU baris — ia hanya memilihnya dengan aturan yang
 * lebih baik. Penjaga yang menyuruh orang "memperbaiki" kode yang sudah
 * benar akan diabaikan secepat penjaga yang diam saja.
 */
const POLA_SATU = /\[0\]/;
const POLA_ARRAY = /base44[^\n]*\.(filter|list)\(/;

const peta = new Map();
for (const p of berkasJs(join(AKAR, "src"))) {
  const rel = relative(AKAR, p);
  // Komentar dikupas lebih dulu: penjelasan cacat ini memuat contoh kodenya,
  // dan penjaga yang tersandung komentarnya sendiri tidak berguna.
  const baris = kupasKomentar(readFileSync(p, "utf8")).split("\n");
  for (let i = 0; i < baris.length; i++) {
    const m = baris[i].match(POLA_KUNCI);
    if (!m) continue;
    const blok = tubuhQueryFn(baris, i);
    if (!blok) continue;                      // mutasi/invalidasi, bukan pembacaan
    const bentuk = POLA_SATU.test(blok)
      ? "satu"
      : POLA_ARRAY.test(blok) ? "array" : "lain";
    if (!peta.has(m[1])) peta.set(m[1], []);
    peta.get(m[1]).push({ rel, baris: i + 1, bentuk });
  }
}

const pemakaiRingkas = (pemakai) =>
  pemakai.map((x) => `      ${x.bentuk.padEnd(5)} ${x.rel}:${x.baris}`).join("\n");

const temuan = [];
for (const [kunci, pemakai] of peta) {
  const bentuk = new Set(pemakai.map((x) => x.bentuk).filter((b) => b !== "lain"));
  if (bentuk.size < 2) continue;
  temuan.push(
    `  ["${kunci}"] dipakai dengan ${bentuk.size} bentuk berbeda:\n` + pemakaiRingkas(pemakai),
  );
}

/* ── Bagian 2: setiap penulis CompanySettings menyegarkan SEMUA kuncinya ──
 *
 * Satu baris CompanySettings diambil lewat tujuh kunci cache berbeda, dan
 * nama-namanya TAMPAK bertingkat — `company-settings`, `company-settings-main`,
 * `company-settings-hpp`. Di situ jebakannya: TanStack Query mencocokkan kunci
 * per BAGIAN, bukan per awalan teks, jadi menyegarkan `["company-settings"]`
 * tidak menyentuh `["company-settings-main"]` sama sekali.
 *
 * Pada 6 Oktober 2026 delapan layar menyimpan baris itu dan tidak satu pun
 * menyegarkan ketujuh kunci. HRPage menyimpan nama dan logo perusahaan lalu
 * menyegarkan satu kunci; KOP surat dan slip gaji membaca kunci yang lain, dan
 * tetap menampilkan nama yang lama. Tidak ada galat — hanya angka dan nama
 * yang sudah diganti tetap tampil seperti sebelum diganti.
 *
 * Dua yang diperiksa:
 *   1. setiap berkas yang MENULIS CompanySettings memanggil segarkanSetelan();
 *   2. setiap kunci ["company-settings…"] yang ada di kode terdaftar di
 *      KUNCI_SETELAN — kunci baru yang lupa didaftarkan membuat penjaga merah,
 *      bukan membuat satu layar diam-diam tertinggal.
 */
const BERKAS_KUNCI = "src/lib/kunciSetelan.js";
const isiKunci = kupasKomentar(readFileSync(join(AKAR, BERKAS_KUNCI), "utf8"));
const blokDaftar = isiKunci.match(/KUNCI_SETELAN\s*=\s*\[([^\]]*)\]/);
const terdaftar = new Set(
  (blokDaftar?.[1] || "").match(/"([^"]+)"/g)?.map((t) => t.slice(1, -1)) || [],
);
if (terdaftar.size === 0) {
  temuan.push(`  KUNCI_SETELAN di ${BERKAS_KUNCI} tidak terbaca — daftar kuncinya hilang atau bentuknya berubah.`);
}

// 1. Penulis tanpa segarkanSetelan, dan invalidasi yang disusun sendiri.
for (const p of berkasJs(join(AKAR, "src"))) {
  const rel = relative(AKAR, p);
  if (rel === BERKAS_KUNCI) continue;
  const isi = kupasKomentar(readFileSync(p, "utf8"));
  const menulis = /CompanySettings\.(update|create)\s*\(/.test(isi);
  if (menulis && !/segarkanSetelan\s*\(/.test(isi)) {
    temuan.push(
      `  ${rel} menulis CompanySettings tanpa memanggil segarkanSetelan().\n` +
      `      Sebagian pembaca akan tetap menampilkan nilai yang lama.`,
    );
  }
  const sendiri = isi.match(/invalidateQueries\(\s*\{\s*queryKey:\s*\[\s*"company-settings[^"]*"/g);
  if (sendiri) {
    temuan.push(
      `  ${rel} menyusun ${sendiri.length} invalidasi company-settings sendiri.\n` +
      `      Pakai segarkanSetelan(qc) dari ${BERKAS_KUNCI}; daftar yang disusun\n` +
      `      sendiri selalu ketinggalan satu kunci.`,
    );
  }
}

// 2. Kunci yang dipakai tetapi tidak terdaftar.
if (terdaftar.size > 0) {
  const belum = [];
  for (const kunci of peta.keys()) {
    if (!kunci.startsWith("company-settings")) continue;
    if (terdaftar.has(kunci)) continue;
    belum.push(`  ["${kunci}"] dipakai di kode tetapi tidak ada di KUNCI_SETELAN.\n` +
      pemakaiRingkas(peta.get(kunci)));
  }
  temuan.push(...belum);
}

if (temuan.length) {
  console.error(
    `${temuan.length} temuan kunci cache.\n\n` +
    `TanStack Query menyimpan per KUNCI, dan mencocokkannya per BAGIAN —\n` +
    `bukan per awalan teks. Dua akibatnya:\n\n` +
    `  · dua bentuk data di bawah satu kunci: pembaca yang mengira array dan\n` +
    `    pembaca yang mengira objek membaca tempat yang sama, dan yang\n` +
    `    terakhir mengisi cache menentukan bentuknya untuk keduanya;\n` +
    `  · menyegarkan ["company-settings"] TIDAK menyentuh\n` +
    `    ["company-settings-main"], jadi layar yang membaca kunci lain tetap\n` +
    `    menampilkan nilai yang lama tanpa galat apa pun.\n\n` +
    `Bentuk: satukan lewat satu hook (src/lib/useCompanySettings.js), atau beri\n` +
    `kunci berbeda bila bentuknya memang harus berbeda.\n` +
    `Penyegaran: pakai segarkanSetelan(qc) dari src/lib/kunciSetelan.js.\n\n` +
    temuan.join("\n"),
  );
  process.exit(1);
}

console.log(
  `Setiap kunci cache satu bentuk (${peta.size} kunci literal diperiksa), ` +
  `dan ${terdaftar.size} kunci CompanySettings disegarkan dari satu tempat.`,
);
process.exit(0);

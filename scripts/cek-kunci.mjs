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

const temuan = [];
for (const [kunci, pemakai] of peta) {
  const bentuk = new Set(pemakai.map((x) => x.bentuk).filter((b) => b !== "lain"));
  if (bentuk.size < 2) continue;
  temuan.push(
    `  ["${kunci}"] dipakai dengan ${bentuk.size} bentuk berbeda:\n` +
    pemakai.map((x) => `      ${x.bentuk.padEnd(5)} ${x.rel}:${x.baris}`).join("\n"),
  );
}

if (temuan.length) {
  console.error(
    `${temuan.length} kunci cache dipakai dengan lebih dari satu bentuk data.\n\n` +
    `TanStack Query menyimpan per KUNCI. Pembaca yang mengira array dan\n` +
    `pembaca yang mengira objek membaca tempat yang sama, dan yang terakhir\n` +
    `mengisi cache menentukan bentuknya untuk keduanya — jadi salah satu\n` +
    `pembaca selalu salah, dan mana yang salah berubah menurut urutan\n` +
    `komponen dipasang.\n\n` +
    `Satukan lewat satu hook (lihat src/lib/useCompanySettings.js), atau beri\n` +
    `kunci yang berbeda bila bentuknya memang harus berbeda.\n\n` +
    temuan.join("\n"),
  );
  process.exit(1);
}

console.log(`Setiap kunci cache satu bentuk (${peta.size} kunci literal diperiksa).`);
process.exit(0);

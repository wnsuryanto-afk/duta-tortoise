/**
 * cek-diam.mjs — penyimpanan yang gagal tanpa suara.
 *
 * ── Kenapa penjaga ini ada ──────────────────────────────────────────────────
 *
 * Tiga kali keluhan yang sama, dengan tiga sebab teknis yang berbeda:
 *
 *   18 Jul–18 Okt  Tidak satu pun kura baru bisa dicatat. Tombol Simpan
 *                  berputar terus, tanpa pesan. Sebabnya `proven_year: ""`
 *                  ditolak server 422 — penolakan yang tidak pernah
 *                  ditangkap, jadi `setSaving(false)` tidak pernah tercapai.
 *
 *   22 Okt         "Pada saat telur disimpan, kadang-kadang gagal tercatat."
 *                  Kelima penyimpanan di EggGrid tidak punya penangkap galat
 *                  sama sekali.
 *
 * Yang sama di keduanya bukan sebabnya, melainkan BENTUKNYA: permintaan
 * ditolak, tidak ada yang menangkapnya, tidak ada yang memberi tahu, dan
 * orang yang menekan tombol menyangka dirinya salah pencet.
 *
 * Diukur 22 Okt 2026: dari 350 penulisan entity di aplikasi ini, 248 tidak
 * punya catch yang memberi tahu siapa pun, dan 70 di antaranya menyalakan
 * `setSaving(true)` lalu mematikannya SESUDAH await — di luar try, di luar
 * finally. Di ketujuh puluh tempat itu, satu kegagalan berarti tombol yang
 * berputar selamanya.
 *
 * ── Kenapa angkanya, bukan daftarnya ────────────────────────────────────────
 *
 * Memperbaiki 248 tempat sekaligus bukan perbaikan — itu pengeditan massal
 * pada berkas yang tidak sedang dikerjakan siapa pun, dan tiap berkas yang
 * disentuh tanpa alasan adalah satu kesempatan merusak sesuatu yang sedang
 * bekerja. Jadi yang dijaga ARAHNYA: angkanya boleh turun, tidak boleh naik.
 * Kode baru wajib menangani kegagalannya; kode lama diperbaiki saat
 * berkasnya memang sedang disentuh.
 *
 * Turunkan BATAS setiap kali ada yang dibereskan — penjaga ini memaksanya.
 *
 * ── Yang TIDAK dilihat penjaga ini ─────────────────────────────────────────
 *
 * Ia hanya melihat penulisan LANGSUNG — `await base44.entities.X.update(`.
 * Penyimpanan yang dibungkus fungsi pembantu tidak terlihat olehnya, jadi
 * penanda sibuk yang dinyalakan di sekitar pemanggilan pembantu itu tidak
 * ikut diperiksa. Itu pilihan, bukan kelalaian: menelusuri pemanggilan
 * antarfungsi memerlukan penelusuran yang bisa salah ke dua arah, dan
 * penjaga yang kadang menuduh tanpa sebab lebih cepat diabaikan orang
 * daripada penjaga yang melewatkan sebagian.
 *
 * Jalankan:  node scripts/cek-diam.mjs
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { kupasKomentar } from "./lib/kupasKomentar.mjs";

const AKAR = process.cwd();

/*
  Diukur 22 Okt 2026, SESUDAH bukti pembayaran dan panel foto dibereskan.
  Boleh turun, tidak boleh naik.

  Angka awalnya 233 dan 136. Penurunan pertama datang dari delapan tempat
  yang bentuknya sama dengan cacat telur: array utuh ditulis ulang dari
  daftar di layar, tanpa penangkap galat — bukti pembayaran (yang menentukan
  sisa tagihan pembeli) dan daftar foto kura.
*/
const BATAS = 226;
const BATAS_BERPUTAR = 135;

function berkasJs(d, keluar = []) {
  for (const nama of readdirSync(d)) {
    const p = join(d, nama);
    if (statSync(p).isDirectory()) berkasJs(p, keluar);
    else if (/\.(js|jsx)$/.test(nama)) keluar.push(p);
  }
  return keluar;
}

/**
 * Teks dengan isi string dikosongkan, supaya kurung di dalam string tidak
 * ikut menghitung kedalaman blok. Panjangnya dipertahankan persis agar
 * nomor barisnya tetap sama.
 */
function tanpaIsiString(teks) {
  let keluar = "";
  let kutip = null;
  for (let i = 0; i < teks.length; i++) {
    const c = teks[i];
    if (kutip) {
      if (c === "\\") { keluar += "  "; i++; continue; }
      if (c === kutip) { kutip = null; keluar += c; continue; }
      keluar += c === "\n" ? "\n" : " ";
      continue;
    }
    if (c === '"' || c === "'" || c === "`") { kutip = c; keluar += c; continue; }
    keluar += c;
  }
  return keluar;
}

/**
 * Rentang [mulai, selesai] tiap blok `try { … }`, beserta apakah `catch`
 * sesudahnya BENAR-BENAR memberi tahu seseorang.
 *
 * Kedalaman kurung dihitung dari awal berkas, bukan ditebak dari jarak baris:
 * jarak tetap seperti "40 baris ke atas" akan menganggap try milik fungsi
 * sebelahnya sebagai milik penyimpanan ini.
 */
function blokTry(teks) {
  const hasil = [];
  for (let i = 0; i < teks.length; i++) {
    if (!/\btry\s*\{/.test(teks.slice(i, i + 12))) continue;
    const buka = teks.indexOf("{", i);
    if (buka < 0) continue;
    let dalam = 0, tutup = -1;
    for (let j = buka; j < teks.length; j++) {
      if (teks[j] === "{") dalam++;
      else if (teks[j] === "}") { dalam--; if (dalam === 0) { tutup = j; break; } }
    }
    if (tutup < 0) continue;
    /*
      Badan catch dan finally, dibatasi dengan mencocokkan kurungnya —
      BUKAN dengan mengambil sekian ratus huruf sesudah try.

      Potongan berjarak tetap memungut isi fungsi di bawahnya: saat diuji
      dengan mencabut `toast.error` dari penambahan bukti pembayaran,
      penjaga ini tetap hijau karena ada `toast.error` milik fungsi
      berikutnya di dalam potongan yang sama. Penjaga yang hijau karena
      melihat kode tetangganya tidak menjaga apa pun.
    */
    const lanjut = (dari) => {
      const b = teks.indexOf("{", dari);
      if (b < 0) return -1;
      let d = 0;
      for (let j = b; j < teks.length; j++) {
        if (teks[j] === "{") d++;
        else if (teks[j] === "}") { d--; if (d === 0) return j; }
      }
      return -1;
    };
    let ujung = tutup;
    let bercatch = false;
    const sesudahTry = teks.slice(tutup, tutup + 40);
    if (/^\}\s*catch\s*(\([^)]*\))?\s*\{/.test(sesudahTry.replace(/\s+/g, " ").trim().replace(/^\}/, "}")) ||
        /^\s*\}\s*catch/.test(sesudahTry)) {
      bercatch = true;
      const akhirCatch = lanjut(tutup + 1);
      if (akhirCatch > 0) ujung = akhirCatch;
    }
    if (/^\s*\}\s*finally/.test(teks.slice(ujung, ujung + 20))) {
      const akhirFinally = lanjut(ujung + 1);
      if (akhirFinally > 0) ujung = akhirFinally;
    }
    const ekor = teks.slice(tutup, ujung + 1);
    hasil.push({ mulai: buka, tutup, bercatch, ekor });
    i = buka;
  }
  return hasil;
}

const POLA_TULIS = /await\s+base44\.(?:asServiceRole\.)?entities\.(\w+)\.(update|create|delete|bulkCreate)\s*\(/g;
const POLA_LAPOR = /(toast\.error|setError|setPesanGagal|alert\s*\(|console\.error)/;
const POLA_PUTAR = /set(Saving|Loading|Menyimpan|Submitting|Busy)\s*\(\s*true\s*\)/;
const POLA_FINALLY = /finally\s*\{[\s\S]{0,400}?set(Saving|Loading|Menyimpan|Submitting|Busy)\s*\(\s*false/;

const diam = [];
const berputar = [];
let total = 0;

for (const p of berkasJs(join(AKAR, "src"))) {
  const rel = relative(AKAR, p);
  const asli = kupasKomentar(readFileSync(p, "utf8"));
  const teks = tanpaIsiString(asli);
  const blok = blokTry(teks);
  const barisDari = (pos) => asli.slice(0, pos).split("\n").length;

  POLA_TULIS.lastIndex = 0;
  let m;
  while ((m = POLA_TULIS.exec(teks)) !== null) {
    total++;
    const pos = m.index;
    const pembungkus = blok.filter((b) => pos > b.mulai && pos < b.tutup);
    const terlapor = pembungkus.some((b) => b.bercatch && POLA_LAPOR.test(b.ekor));
    const amanPutar = pembungkus.some((b) => POLA_FINALLY.test(b.ekor));
    if (!terlapor) diam.push({ rel, baris: barisDari(pos), ent: m[1], op: m[2] });
    /*
      Menyalakan penanda sibuk sebelum menyimpan, tanpa finally yang
      mematikannya: satu kegagalan membuat tombolnya berputar selamanya.

      Yang dicari harus berada di FUNGSI YANG SAMA. Jarak tetap — "2000 huruf
      ke belakang" — melewati batas fungsi dan memungut `setSaving(true)`
      milik tetangganya; diukur begitu, berkas ini melaporkan 140 tombol
      berputar padahal yang benar jauh lebih sedikit. Batasnya diambil dari
      kata `async` terdekat sebelum penyimpanan, yaitu pembuka fungsinya
      sendiri.
    */
    const mulaiFungsi = asli.lastIndexOf("async", pos);
    const sebelum = asli.slice(mulaiFungsi < 0 ? Math.max(0, pos - 400) : mulaiFungsi, pos);
    if (POLA_PUTAR.test(sebelum) && !amanPutar) {
      berputar.push({ rel, baris: barisDari(pos), ent: m[1], op: m[2] });
    }
  }
}

const naik = diam.length > BATAS || berputar.length > BATAS_BERPUTAR;
if (naik) {
  const perBerkas = new Map();
  for (const d of diam) perBerkas.set(d.rel, (perBerkas.get(d.rel) || 0) + 1);
  console.error(
    `Penyimpanan yang gagal tanpa suara BERTAMBAH.\n\n` +
    `  gagal tanpa pesan : ${diam.length} (batas ${BATAS})\n` +
    `  tombol berputar   : ${berputar.length} (batas ${BATAS_BERPUTAR})\n\n` +
    `Permintaan yang ditolak server tanpa penangkap galat tidak memberi tahu\n` +
    `siapa pun: tombolnya berputar, tidak ada pesan, dan yang menekannya\n` +
    `menyangka dirinya salah pencet. Bentuk itu pernah menahan SELURUH\n` +
    `pencatatan kura selama tiga bulan tanpa ada yang tahu sebabnya.\n\n` +
    `Bentuk yang benar:\n\n` +
    `    try {\n` +
    `      await base44.entities.X.update(id, data);\n` +
    `      toast.success("…");\n` +
    `    } catch (e) {\n` +
    `      toast.error(\`Gagal menyimpan: \${e?.message || "kesalahan tidak diketahui"}\`);\n` +
    `    } finally {\n` +
    `      setSaving(false);\n` +
    `    }\n\n` +
    `Berkas dengan penulisan diam terbanyak:\n` +
    [...perBerkas].sort((a, b) => b[1] - a[1]).slice(0, 10)
      .map(([f, n]) => `  ${String(n).padStart(3)}  ${f}`).join("\n") + "\n\n" +
    `Tombol yang berputar selamanya bila gagal:\n` +
    berputar.slice(0, 20).map((b) => `  ${b.rel}:${b.baris}  ${b.ent}.${b.op}`).join("\n") + "\n",
  );
  process.exit(1);
}

const turun = diam.length < BATAS || berputar.length < BATAS_BERPUTAR;
console.log(
  `${total} penulisan entity: ${diam.length} gagal tanpa pesan (batas ${BATAS}), ` +
  `${berputar.length} tombol berputar selamanya bila gagal (batas ${BATAS_BERPUTAR})` +
  (turun ? ` — turunkan batasnya di scripts/cek-diam.mjs.` : `.`),
);
process.exit(0);

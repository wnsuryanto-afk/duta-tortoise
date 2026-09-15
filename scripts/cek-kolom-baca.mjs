/**
 * cek-kolom-baca.mjs — cari kolom yang DIBACA kode tapi tidak ada di skema
 * entity. Kembarannya cek-kolom-hantu.mjs, yang hanya memeriksa sisi TULIS.
 *
 * ── KENAPA PENJAGA INI ADA ─────────────────────────────────────────
 *
 * 15-09-2026 saya sendiri menulis pemeriksaan kedaluwarsa obat yang
 * membaca `BatchBarang.expired_date`. Nama kolom yang benar adalah
 * `tanggal_expired`; `expired_date` itu nama kolom milik WarehouseItem.
 * Akibatnya: filternya mengembalikan NOL baris, selamanya, tanpa error,
 * tanpa peringatan, tanpa apa pun yang merah. Peringatan obat kedaluwarsa
 * tidak akan pernah berbunyi sekali pun — dan tidak ada satu pun cara
 * untuk tahu, karena alarm yang diam terlihat persis sama dengan alarm
 * yang tidak punya alasan berbunyi.
 *
 * Sisi tulis sudah dijaga sejak lama. Sisi baca tidak, padahal akibatnya
 * lebih buruk: kolom hantu di sisi tulis membuang data yang mungkin
 * ketahuan hilang; kolom hantu di sisi baca MEMATIKAN alarm dan
 * meninggalkan laporan yang terlihat bersih.
 *
 * ── YANG DIPERIKSA ─────────────────────────────────────────────────
 *
 *   1. Kunci literal di dalam  Entity.filter({ … })
 *   2. Kolom pengurut di dalam Entity.list("-kolom")  dan
 *                              Entity.filter({…}, "-kolom")
 *   3. Pasangan { tabel: "Entity", kolom: "nama" } — nama kolom yang
 *      disimpan sebagai data, dipakai pendeteksi alarm mati.
 *
 * Kolom pengurut ikut diperiksa karena gagalnya juga sunyi: pengurutan
 * ke kolom yang tidak ada tidak melempar error, hanya mengembalikan
 * urutan sembarang — dan "10 kura terakhir ditimbang" diam-diam berisi
 * 10 kura sembarang.
 *
 * ── YANG TIDAK DIPERIKSA ───────────────────────────────────────────
 *
 * Pembacaan properti biasa (`b.tanggal_expired`) TIDAK diperiksa. Untuk
 * itu perlu tahu entity asal setiap variabel, dan menebaknya menghasilkan
 * temuan palsu — penjaga yang berisik lebih buruk daripada tidak ada
 * penjaga, karena orang belajar mengabaikannya. Yang diperiksa di sini
 * hanya yang bisa dipastikan secara statis.
 *
 * Pemanggilan yang argumennya variabel (`Entity.filter(kondisi)`)
 * dilaporkan di akhir sebagai "tidak terperiksa", supaya keterbatasan
 * ini terlihat dan bukan disangka sudah aman.
 *
 * Jalankan:  node scripts/cek-kolom-baca.mjs
 */
import fs from "fs";
import path from "path";

const BAWAAN = ["id", "created_date", "updated_date", "created_by", "created_by_id", "updated_by", "is_sample"];

// Operator query Base44, bukan nama kolom.
const OPERATOR = new Set(["$or", "$and", "$not", "$nor"]);

const skema = {};
for (const fn of fs.readdirSync("base44/entities")) {
  if (!fn.endsWith(".jsonc")) continue;
  const raw = fs.readFileSync(path.join("base44/entities", fn), "utf8").replace(/^\s*\/\/.*$/gm, "");
  let j;
  try { j = JSON.parse(raw); } catch { continue; }
  skema[fn.slice(0, -6)] = new Set([...Object.keys(j.properties || {}), ...BAWAAN]);
}

function berkas(dir, keluar = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (["node_modules", ".git", "dist", "scripts"].includes(e.name)) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) berkas(p, keluar);
    else if (/\.(js|jsx|ts)$/.test(e.name)) keluar.push(p);
  }
  return keluar;
}

/** Isi objek literal seimbang mulai dari '{' di indeks i (termasuk kurawalnya). */
function objekDari(s, i) {
  let dalam = 0;
  for (let j = i; j < Math.min(i + 6000, s.length); j++) {
    if (s[j] === "{") dalam++;
    else if (s[j] === "}") { dalam--; if (dalam === 0) return s.slice(i, j + 1); }
  }
  return null;
}

/**
 * Kunci di TINGKAT ATAS objek saja. Penting: `{ tanggal: { $gte: x } }`
 * hanya boleh menyumbang `tanggal`. Mengambil kunci bersarang membuat
 * setiap operator query dilaporkan sebagai kolom hantu.
 */
function kunciTingkatAtas(blok) {
  const keluar = [];
  let dalam = 0, kurung = 0, siku = 0;
  for (let i = 0; i < blok.length; i++) {
    const c = blok[i];
    if (c === "{") dalam++;
    else if (c === "}") dalam--;
    else if (c === "(") kurung++;
    else if (c === ")") kurung--;
    else if (c === "[") siku++;
    else if (c === "]") siku--;
    else if (c === ":" && dalam === 1 && kurung === 0 && siku === 0) {
      const m = /([$\w]+)\s*$/.exec(blok.slice(0, i));
      if (m) keluar.push(m[1]);
    }
  }
  return keluar;
}

const hantu = new Map();
const takTerperiksa = new Map();

function catat(peta, kunci, berkas) {
  if (!peta.has(kunci)) peta.set(kunci, new Set());
  peta.get(kunci).add(berkas);
}

for (const p of berkas(".")) {
  const s = fs.readFileSync(p, "utf8");

  // Menangkap bentuk frontend (`Tortoise.filter(`) sekaligus backend
  // (`base44.asServiceRole.entities.Tortoise.filter(`), karena yang kedua
  // berakhir dengan yang pertama. Nama yang bukan entity dilewati, jadi
  // `arr.filter(...)` pada array biasa tidak ikut terbaca.
  for (const m of s.matchAll(/\b([A-Z]\w*)\.(filter|list)\s*\(/g)) {
    const ent = m[1];
    if (!skema[ent]) continue;
    const i = m.index + m[0].length;
    const ekor = s.slice(i, i + 6000);
    const sesudahSpasi = ekor.replace(/^\s*/, "");

    if (m[2] === "filter") {
      if (!sesudahSpasi.startsWith("{")) {
        // Argumen berupa variabel — atau, kalau nama ini ternyata array
        // biasa, sebuah fungsi. Dua-duanya tidak bisa diperiksa di sini.
        const argv = /^\s*([A-Za-z_$][\w$]*)\s*[,)]/.exec(ekor);
        if (argv) catat(takTerperiksa, `${ent}.filter(${argv[1]})`, p);
        continue;
      }
      const blok = objekDari(s, i + (ekor.length - sesudahSpasi.length));
      if (!blok) continue;
      for (const k of kunciTingkatAtas(blok)) {
        if (OPERATOR.has(k) || skema[ent].has(k)) continue;
        catat(hantu, `${ent}.${k}  (syarat filter)`, p);
      }
    }
  }


  /*
   * Daftar (tabel, kolom) yang ditulis sebagai DATA, bukan kode.
   *
   * Pendeteksi alarm mati di higieneKembar menyimpan nama kolom yang
   * diperiksanya sebagai string di dalam tabel { tabel, kolom, … }. Nama
   * kolom di situ tidak pernah muncul sebagai `entity.kolom` di mana pun,
   * jadi tidak ada pemeriksa statis yang menyentuhnya — dan salahnya paling
   * mahal: `Enclosure.capacity` (nama yang benar `max_capacity`) membuat
   * rasio terisi selalu 0%, sehingga alarm kepadatan kandang yang sehat
   * dilaporkan MATI setiap minggu. Pendeteksi alarm palsu di dalam
   * pendeteksi alarm mati.
   */
  for (const m of s.matchAll(/\btabel:\s*["'](\w+)["']/g)) {
    const ent = m[1];
    if (!skema[ent]) continue;
    const k = /\bkolom:\s*["'](\w+)["']/.exec(s.slice(m.index, m.index + 900));
    if (!k) continue;
    if (!skema[ent].has(k[1])) catat(hantu, `${ent}.${k[1]}  (daftar tabel/kolom)`, p);
  }

  // Kolom pengurut: Entity.list("-kolom")  /  Entity.filter({…}, "-kolom")
  for (const m of s.matchAll(/\b([A-Z]\w*)\.list\s*\(\s*["'](-?\w+)["']/g)) {
    const [, ent, urut] = m;
    if (!skema[ent]) continue;
    const kolom = urut.replace(/^-/, "");
    if (!skema[ent].has(kolom)) catat(hantu, `${ent}.${kolom}  (pengurut list)`, p);
  }
  for (const m of s.matchAll(/\b([A-Z]\w*)\.filter\s*\(/g)) {
    const ent = m[1];
    if (!skema[ent]) continue;
    const i = m.index + m[0].length;
    const ekor = s.slice(i, i + 6000).replace(/^\s*/, "");
    if (!ekor.startsWith("{")) continue;
    const blok = objekDari(s, s.indexOf("{", i));
    if (!blok) continue;
    const sisa = s.slice(s.indexOf("{", i) + blok.length, s.indexOf("{", i) + blok.length + 60);
    const u = /^\s*,\s*["'](-?\w+)["']/.exec(sisa);
    if (!u) continue;
    const kolom = u[1].replace(/^-/, "");
    if (!skema[ent].has(kolom)) catat(hantu, `${ent}.${kolom}  (pengurut filter)`, p);
  }
}

if (takTerperiksa.size > 0) {
  console.log(
    `Catatan: ${takTerperiksa.size} pemanggilan filter mengirim variabel —\n` +
    `kolom syaratnya TIDAK diperiksa:`,
  );
  for (const [k, v] of [...takTerperiksa].sort()) {
    console.log(`  ${k}  (${[...v][0]}${v.size > 1 ? ` +${v.size - 1}` : ""})`);
  }
  console.log("");
}

if (hantu.size === 0) {
  console.log(`Tidak ada kolom hantu di sisi baca (${Object.keys(skema).length} entity diperiksa).`);
  process.exit(0);
}
console.error("KOLOM DIBACA TAPI TIDAK ADA DI SKEMA — filter/urutannya gagal diam-diam:\n");
for (const [k, v] of [...hantu].sort()) console.error(`  ${k}\n      ${[...v].sort().join("\n      ")}`);
console.error("\nFilter ke kolom yang tidak ada mengembalikan NOL baris tanpa error.");
console.error("Periksa nama kolom di base44/entities/<Entity>.jsonc.");
process.exit(1);

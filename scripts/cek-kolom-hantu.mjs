/**
 * cek-kolom-hantu.mjs — cari kolom yang DITULIS kode tapi tidak ada di skema
 * entity, dan karena itu dibuang diam-diam oleh Base44.
 *
 * Ini kelas bug yang paling sunyi di aplikasi ini: tidak ada error, tidak ada
 * peringatan build, tidak ada apa pun di layar. Barisnya tetap tersimpan,
 * hanya kolom itu yang hilang. Yang sudah ditemukan skrip ini:
 *
 *   ShoppingList.item_name       — kolom nama kedua yang isinya sudah lama
 *                                  tidak sinkron dengan item_sku di baris yang
 *                                  sama; sempat membuat saya menulis ulang 6
 *                                  baris belanja ke barang yang salah.
 *   ActivityLog.changes          — snapshot sebelum/sesudah pada catatan
 *                                  kematian kura, tidak pernah tersimpan.
 *   DiagnosisProtocol.images     — seluruh galeri foto penyakit: tombol
 *                                  "Setujui & Masukkan ke Panduan" tidak
 *                                  menyimpan apa pun, dan pemeriksa duplikat
 *                                  selalu membaca daftar kosong.
 *   UserProfile.tutorial_completed — penanda tur selesai yang kedua.
 *   CompanySettings.notes        — hasil deteksi duplikat stok.
 *
 * KETERBATASAN: pembacanya datar, tidak mengerti objek bersarang. Kolom di
 * dalam array (mis. items[].jumlah_diterima pada PembelianBarang, atau
 * changes_detail[].old_value pada ActivityLog) akan dilaporkan sebagai hantu
 * padahal sah. Periksa dulu apakah namanya ada di dalam `items` sebuah array
 * sebelum menyimpulkan.
 *
 * Jalankan:  node scripts/cek-kolom-hantu.mjs
 */
import fs from "fs";
import path from "path";

const BAWAAN = ["id", "created_date", "updated_date", "created_by", "created_by_id", "updated_by", "is_sample"];

// Nama kolom yang sah tapi bersarang di dalam array — jangan dilaporkan.
const DIMAAFKAN = new Set([
  "ActivityLog.field", "ActivityLog.label", "ActivityLog.old_value", "ActivityLog.new_value",
  "PembelianBarang.jumlah_diterima", "PembelianBarang.label_per_butir", "PembelianBarang.tanggal_expired",
  "User.full_name",
]);

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

/** Ambil objek literal yang benar-benar jadi argumen create()/update(). */
function blokArgumen(s, i) {
  let kurung = 1, kurawal = 0, mulai = null;
  for (let j = i; j < Math.min(i + 4000, s.length); j++) {
    const c = s[j];
    if (c === "(") kurung++;
    else if (c === ")") { kurung--; if (kurung === 0) return mulai === null ? null : s.slice(mulai, j); }
    else if (c === "{") { if (kurawal === 0 && mulai === null) mulai = j; kurawal++; }
    else if (c === "}") kurawal--;
    else if (c === ";" && kurawal === 0) return null;
  }
  return null;
}

const hantu = new Map();
for (const p of berkas(".")) {
  const s = fs.readFileSync(p, "utf8");
  for (const m of s.matchAll(/entities\.(\w+)\.(create|update|bulkCreate)\s*\(/g)) {
    const ent = m[1];
    if (!skema[ent]) continue;
    const blok = blokArgumen(s, m.index + m[0].length);
    if (!blok) continue;
    for (const km of blok.matchAll(/(?:^|[{,])\s*(\w+)\s*:/g)) {
      const k = km[1];
      const kunci = `${ent}.${k}`;
      if (skema[ent].has(k) || k === k.toUpperCase() || DIMAAFKAN.has(kunci)) continue;
      if (!hantu.has(kunci)) hantu.set(kunci, new Set());
      hantu.get(kunci).add(p);
    }
  }
}

if (hantu.size === 0) {
  console.log(`Tidak ada kolom hantu (${Object.keys(skema).length} entity diperiksa).`);
  process.exit(0);
}
console.error("KOLOM DITULIS TAPI TIDAK ADA DI SKEMA — datanya dibuang diam-diam:\n");
for (const [k, v] of [...hantu].sort()) console.error(`  ${k}\n      ${[...v].sort().join("\n      ")}`);
console.error("\nPeriksa dulu apakah kolom ini bersarang di dalam array yang sah sebelum memperbaiki.");
process.exit(1);

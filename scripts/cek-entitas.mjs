/**
 * cek-entitas.mjs — cari tabel yang sambungannya putus.
 *
 * Tiga bentuk kerusakan yang dicari, dan ketiganya diam:
 *
 *   DIBACA TAPI TIDAK PERNAH DITULIS — layarnya tampil rapi dan selalu kosong.
 *     Orang menyimpulkan aplikasinya rusak, lalu berhenti membukanya. Ini yang
 *     terjadi pada FeedingLog (panel "Pemakaian Pakan vs Ideal") dan
 *     MaintenanceSchedule (kartu "Perawatan Kandang" yang selamanya 0), dan
 *     pada WarehouseTransaction yang jadi buku stok kedua yang tak pernah diisi.
 *
 *   DITULIS TAPI TIDAK PERNAH DIBACA — data dikumpulkan tiap hari oleh orang
 *     yang mengira itu berguna, dan tidak pernah muncul di mana pun.
 *
 *   TIDAK DIPAKAI SAMA SEKALI — nama seperti `Purchase` yang menganggur di
 *     sebelah `PembelianBarang` cepat atau lambat akan menarik orang menulis
 *     ke tabel yang salah.
 *
 * Tabel yang memang sengaja ditinggalkan didaftarkan di USANG di bawah, supaya
 * penjaga ini berisik hanya untuk hal baru.
 *
 * Jalankan:  node scripts/cek-entitas.mjs
 */
import fs from "fs";
import path from "path";

/** Sengaja tidak dipakai lagi. Datanya dibiarkan, tapi jangan dipakai lagi. */
const USANG = new Set([
  "PettyCash", "PettyCashTransaction", "Purchase", "VegetablePickup",
  "FeedingLog", "WarehouseTransaction",
]);

/** Ditulis backend/otomatisasi saja, atau dibaca lewat cara yang tidak terbaca skrip ini. */
const DIMAAFKAN = new Set(["User"]);

function berkas(dir, keluar = []) {
  if (!fs.existsSync(dir)) return keluar;
  for (const nama of fs.readdirSync(dir)) {
    const p = path.join(dir, nama);
    if (nama === "node_modules" || nama === "dist") continue;
    if (fs.statSync(p).isDirectory()) berkas(p, keluar);
    else if (/\.(js|jsx|ts|tsx)$/.test(nama)) keluar.push(p);
  }
  return keluar;
}

const entitas = fs.readdirSync("base44/entities")
  .filter((f) => f.endsWith(".jsonc"))
  .map((f) => f.slice(0, -6));

const isi = [...berkas("src"), ...berkas("base44")].map((p) => fs.readFileSync(p, "utf8"));

const buta = [];   // ditulis, tak pernah dibaca
const hampa = [];  // dibaca, tak pernah ditulis
const mati = [];   // tak tersentuh

for (const e of entitas) {
  if (DIMAAFKAN.has(e)) continue;
  const tulis = new RegExp(`\\.${e}\\.(create|bulkCreate)\\s*\\(`);
  const ubah = new RegExp(`\\.${e}\\.(update|delete)\\s*\\(`);
  const baca = new RegExp(`\\.${e}\\.(list|filter|get)\\s*\\(`);

  const adaTulis = isi.some((s) => tulis.test(s));
  const adaUbah = isi.some((s) => ubah.test(s));
  const adaBaca = isi.some((s) => baca.test(s));

  if (!adaTulis && !adaUbah && !adaBaca) { if (!USANG.has(e)) mati.push(e); continue; }
  if (adaTulis && !adaBaca) buta.push(e);
  if (adaBaca && !adaTulis && !adaUbah && !USANG.has(e)) hampa.push(e);
}

const laporkan = (judul, daftar, saran) => {
  if (daftar.length === 0) return 0;
  console.log(`\n${judul}\n`);
  for (const e of daftar) console.log("  " + e);
  console.log("\n  " + saran);
  return daftar.length;
};

let gagal = 0;
gagal += laporkan(
  "DIBACA TAPI TIDAK PERNAH DITULIS — layarnya akan selalu kosong:",
  hampa,
  "Arahkan layarnya ke tabel yang benar-benar diisi, atau tandai tabel ini usang di USANG."
);
gagal += laporkan(
  "DITULIS TAPI TIDAK PERNAH DIBACA — datanya dikumpulkan lalu hilang:",
  buta,
  "Tampilkan datanya di suatu layar, atau berhenti menulisnya."
);
gagal += laporkan(
  "TIDAK DIPAKAI SAMA SEKALI:",
  mati,
  "Tandai usang di USANG supaya tidak ada yang menulis ke tabel yang salah."
);

if (gagal === 0) {
  console.log(`Semua tabel tersambung dua arah (${entitas.length} entity, ${USANG.size} ditandai usang).`);
  process.exit(0);
}
process.exit(1);

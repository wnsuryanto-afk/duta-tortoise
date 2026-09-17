/**
 * cek-timbang.mjs — uji aturan "siapa yang perlu ditimbang hari ini".
 *
 * Aturan ini mengganti rotasi 2 ekor/hari pada 17-09-2026. Ia memutuskan
 * pekerjaan nyata kiper tiap pagi, dan dua kesalahannya berbahaya dengan
 * cara yang berlawanan:
 *
 *   Terlalu longgar — kura yang tidak makan atau sedang diobati tidak
 *   muncul. Dosis obat dibagi dengan berat; berat 14 bulan lalu bukan
 *   dasar yang boleh dipakai.
 *
 *   Terlalu ketat — kura dewasa sehat ikut masuk daftar lagi, dan kita
 *   kembali ke rotasi yang tidak pernah selesai.
 *
 * Penjaga lain di repo ini memeriksa BENTUK kode. Yang ini memeriksa
 * JAWABANNYA, dengan angka yang benar-benar ada di peternakan.
 *
 * Jalankan:  node scripts/cek-timbang.mjs
 */
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const dir = mkdtempSync(join(tmpdir(), "cek-timbang-"));
try {
  execFileSync("npx", ["esbuild", "src/lib/jadwalTimbang.js",
    "--bundle", "--format=cjs", "--platform=node", `--outfile=${join(dir, "jt.cjs")}`,
  ], { cwd: process.cwd(), stdio: "pipe" });
} catch (e) {
  console.log("Gagal membundel jadwalTimbang:\n" + (e.stderr?.toString() || e.message));
  rmSync(dir, { recursive: true, force: true });
  process.exit(1);
}

const { perluDitimbang, alasanTimbang, laporanTerbukaPerKura } = await import(
  "file://" + join(dir, "jt.cjs")
).then((m) => m.default || m);

const HI = "2026-09-17";
let gagal = 0;
function cek(nama, dapat, harus) {
  if (JSON.stringify(dapat) !== JSON.stringify(harus)) {
    gagal++;
    console.error(`GAGAL  ${nama}\n   dapat: ${JSON.stringify(dapat)}\n   harus: ${JSON.stringify(harus)}`);
  }
}

// Inti perubahan: dewasa sehat TIDAK ditimbang, walau lama sekali tidak
// ditimbang. Angka 2025-07-12 adalah tanggal nyata 44 kura di peternakan ini.
cek("dewasa sehat 14 bulan tidak masuk daftar",
  alasanTimbang({ id: "a", shell_length_cm: 52, last_weighed_date: "2025-07-12" }, null, HI), null);

cek("dilaporkan tidak makan → pemicu 1",
  alasanTimbang({ id: "a", shell_length_cm: 52 }, { date: "2026-09-14" }, HI)?.kode, "tidak_makan");

cek("sedang diobati, baru ditimbang → belum perlu",
  alasanTimbang({ id: "a", is_currently_sick: true, shell_length_cm: 52, last_weighed_date: "2026-09-15" }, null, HI), null);

cek("sedang diobati, berat basi → perlu",
  alasanTimbang({ id: "a", is_currently_sick: true, shell_length_cm: 52, last_weighed_date: "2026-08-18" }, null, HI)?.kode, "sedang_diobati");

cek("baby 15 hari → perlu",
  alasanTimbang({ id: "b", age_category: "baby", last_weighed_date: "2026-09-02" }, null, HI)?.kode, "rutin_baby");

cek("baby 1 hari → belum",
  alasanTimbang({ id: "b", age_category: "baby", last_weighed_date: "2026-09-16" }, null, HI), null);

// Sebagian kura lama tidak punya age_category terisi sama sekali.
cek("tempurung 6 cm tanpa kategori tetap dihitung baby",
  alasanTimbang({ id: "b", shell_length_cm: 6, last_weighed_date: "2026-08-01" }, null, HI)?.kode, "rutin_baby");

cek("laporan ditutup 'makan_lagi' tidak memicu",
  laporanTerbukaPerKura([
    { tortoise_id: "x", date: "2026-09-10", status: "tidak_makan" },
    { tortoise_id: "x", date: "2026-09-12", status: "makan_lagi" },
  ]).has("x"), false);

cek("laporan yang sudah ditimbang tidak memicu lagi",
  laporanTerbukaPerKura([
    { tortoise_id: "y", date: "2026-09-10", status: "tidak_makan", sudah_ditimbang: true },
  ]).has("y"), false);

cek("urutan: tidak makan → diobati → baby, sehat tidak ikut",
  perluDitimbang(
    [
      { id: "baby", age_category: "baby", last_weighed_date: "2026-08-01" },
      { id: "sakit", is_currently_sick: true, shell_length_cm: 50, last_weighed_date: "2026-07-01" },
      { id: "lapar", shell_length_cm: 50, last_weighed_date: "2026-07-01" },
      { id: "sehat", shell_length_cm: 50, last_weighed_date: "2025-07-12" },
    ],
    [{ tortoise_id: "lapar", date: "2026-09-16", status: "tidak_makan" }],
    HI,
  ).map((d) => d.kura.id),
  ["lapar", "sakit", "baby"]);

rmSync(dir, { recursive: true, force: true });
if (gagal === 0) {
  console.log("Aturan jadwal timbang menjawab benar (10 kasus diperiksa).");
  process.exit(0);
}
console.error(`\n${gagal} kasus jadwal timbang menjawab salah.`);
process.exit(1);

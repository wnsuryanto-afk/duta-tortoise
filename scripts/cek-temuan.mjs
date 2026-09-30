/**
 * cek-temuan.mjs — uji bahwa layar "Temuan dari Foto" menunjukkan temuan,
 * bukan kabar baik, dan tidak membaca penyangkalan sebagai masalah.
 *
 * Kenapa penjaga ini ada. Prompt AI meminta "kosongkan jika tidak ada",
 * tapi modelnya menulis kalimat yang BERBUNYI "tidak ada temuan". Lalu
 * pencocokan kata kunci di temuanCategorize membaca kata tanpa melihat
 * kata "tidak" di depannya.
 *
 * Diukur atas 156 temuan nyata di DailyChecklist pada 30-09-2026 —
 * disimpan apa adanya di scripts/data/temuan-nyata.json:
 *
 *   SEBELUM   156 kartu, 63 (40%) berbunyi "tidak ada temuan",
 *             9 kartu 🐢 Kesehatan Kura — 5 di antaranya salah baca,
 *             misalnya "tidak terlihat ada luka atau lendir".
 *
 *   SESUDAH    90 kartu, 66 laporan aman dihitung terpisah,
 *              1 kartu 🐢 Kesehatan Kura, dan itu memang temuan.
 *
 * Yang dijaga bukan angkanya persis, melainkan dua sifat yang membuat
 * layar itu berguna: kalimat "tidak ada temuan" bukan kartu, dan
 * penyangkalan tidak pernah jadi alarm merah.
 *
 * Jalankan:  node scripts/cek-temuan.mjs
 */
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const AKAR = process.cwd();
const dir = mkdtempSync(join(tmpdir(), "cek-temuan-"));
let gagal = 0;
function cek(nama, dapat, harus) {
  if (JSON.stringify(dapat) !== JSON.stringify(harus)) {
    gagal++;
    console.error(`GAGAL  ${nama}\n   dapat: ${JSON.stringify(dapat)}\n   harus: ${JSON.stringify(harus)}`);
  }
}

try {
  execFileSync("npx", ["esbuild", "src/lib/temuanCategorize.js",
    "--bundle", "--format=cjs", "--platform=node", `--outfile=${join(dir, "t.cjs")}`,
  ], { cwd: AKAR, stdio: "pipe" });
} catch (e) {
  console.log("Gagal membundel temuanCategorize:\n" + (e.stderr?.toString() || e.message));
  rmSync(dir, { recursive: true, force: true });
  process.exit(1);
}
const { categorizeFinding, tidakAdaTemuan } = await import("file://" + join(dir, "t.cjs"))
  .then((m) => m.default || m);
rmSync(dir, { recursive: true, force: true });

// ── Kalimat yang benar-benar ditulis model, dikutip apa adanya ──────
cek("'Tidak ada temuan penting, semua baby terpantau aktif dan sehat.' bukan kartu",
  tidakAdaTemuan("Tidak ada temuan penting, semua baby terpantau aktif dan sehat."), true);
cek("'Tidak ada temuan khusus, pekerjaan sudah sesuai dengan instruksi.' bukan kartu",
  tidakAdaTemuan("Tidak ada temuan khusus, pekerjaan sudah sesuai dengan instruksi."), true);
cek("'Tidak ada temuan yang mendesak, kondisi kandang tampak bersih.' bukan kartu",
  tidakAdaTemuan("Tidak ada temuan yang mendesak, kondisi kandang tampak bersih."), true);
cek("teks kosong dianggap bukan temuan", tidakAdaTemuan("   "), true);

// Dan yang sebaliknya: temuan sungguhan HARUS tetap jadi kartu.
cek("'Terdapat beberapa helai rumput yang sudah menguning/layu' tetap kartu",
  tidakAdaTemuan("Terdapat beberapa helai rumput yang sudah menguning/layu tercampur di dalam tumpukan."), false);
cek("'Posisi kura masih di luar area rendaman' tetap kartu",
  tidakAdaTemuan("Posisi kura dalam foto masih berada di luar area rendaman air, sehingga prosedur memandikan belum selesai."), false);

// ── Penyangkalan tidak boleh jadi alarm ────────────────────────────
// Inilah bentuk yang paling sering ditulis model: satu penyangkalan lalu
// daftar bergaya koma. Memecah di koma membuat "lendir" dan "bengkak"
// berdiri tanpa kata "tidak"-nya.
cek("'tidak terlihat ada luka, lendir, atau bengkak' bukan Kesehatan Kura",
  categorizeFinding("Kura-kura tampak sehat, tidak terlihat ada luka, lendir, atau bengkak pada bagian yang terpantau."),
  "kualitas_foto");
cek("'tidak ada kendala kesehatan tanaman' bukan Tanaman & Kolam",
  categorizeFinding("Secara keseluruhan pekerjaan sudah sesuai instruksi, tidak ada kendala kesehatan tanaman yang terlihat."),
  "kualitas_foto");
cek("'tidak ada yang terlihat lemas' bukan Kesehatan Kura",
  categorizeFinding("Tidak ada temuan negatif, baby kura-kura tampak aktif dan tidak ada yang terlihat lemas."),
  "kualitas_foto");

// Tapi pembalikan arah TIDAK ikut dibatalkan — di situlah temuannya.
cek("'Kura sehat, namun kandang becek' tetap Kondisi Kandang",
  categorizeFinding("Kura-kura terlihat sehat, namun kandang becek di sudut kanan."), "kondisi_kandang");
cek("temuan luka tanpa penyangkalan tetap Kesehatan Kura",
  categorizeFinding("Terlihat luka pada kaki belakang sebelah kiri."), "kesehatan_kura");

// ── Atas seluruh 156 teks nyata ────────────────────────────────────
const NYATA = JSON.parse(readFileSync(join(AKAR, "scripts/data/temuan-nyata.json"), "utf8"));
const aman = NYATA.filter(tidakAdaTemuan);
const kartu = NYATA.filter((t) => !tidakAdaTemuan(t));
const merah = kartu.filter((t) => categorizeFinding(t) === "kesehatan_kura");

cek("jumlah teks nyata yang diuji", NYATA.length, 156);
// Ambang, bukan angka pasti: yang dijaga adalah sifatnya, supaya penjaga
// ini tidak rewel tiap kali satu kata kunci ditambah.
if (aman.length < 50) {
  gagal++;
  console.error(`GAGAL  hanya ${aman.length} dari ${NYATA.length} laporan aman yang dikenali (diharap >= 50).\n` +
    `   Kalau turun drastis, kemungkinan bunyi baru dari model belum masuk TIDAK_ADA.`);
}
if (merah.length > 3) {
  gagal++;
  console.error(`GAGAL  ${merah.length} kartu 🐢 Kesehatan Kura dari ${kartu.length} temuan (diharap <= 3).\n` +
    `   Kategori paling merah terisi terlalu banyak — biasanya tanda penyangkalan\n   terbaca lagi sebagai masalah. Yang terkena:\n` +
    merah.map((t) => "   · " + t.slice(0, 100)).join("\n"));
}

if (gagal === 0) {
  console.log(`Temuan foto terbaca benar (${NYATA.length} teks nyata: ${kartu.length} kartu, ${aman.length} laporan aman, ${merah.length} kesehatan kura).`);
}
process.exit(gagal === 0 ? 0 : 1);

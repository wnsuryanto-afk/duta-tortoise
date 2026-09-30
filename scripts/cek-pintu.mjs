/**
 * cek-pintu.mjs — memastikan setiap pintu di menu benar-benar bisa dibuka
 * oleh setidaknya satu peran, dan setiap pintu menunjuk rute yang ada.
 *
 * Kenapa penjaga ini ada. Pintu /catatan-saran terdaftar di menu selama
 * berbulan-bulan dengan section "catatan-saran" — section yang tidak ada
 * di satu pun daftar NAV_ACCESS. `canAccess()` mengembalikan false untuk
 * SEMUA peran, dan HubPage serta CommandPalette keduanya menyaring dengan
 * canAccess, jadi pintunya tidak pernah muncul di mana pun.
 *
 * Di baliknya ada 330 pesan tertulis untuk dua kiper yang tidak pernah
 * bisa dibaca orang yang dituju.
 *
 * Pintu yang tidak bisa dibuka siapa pun tidak meninggalkan keluhan — ia
 * hanya tidak pernah diklik. Itu sebabnya cacat semacam ini butuh
 * penjaga, bukan kewaspadaan.
 *
 * Yang diperiksa:
 *   1. setiap `section` di NAV_SECTIONS, SETTINGS_ITEMS, dan
 *      EXTRA_DESTINATIONS dimiliki setidaknya satu peran di NAV_ACCESS;
 *   2. setiap `path` punya <Route path="..."> di App.jsx — pintu menu
 *      yang menunjuk rute tak ada akan membuka layar kosong.
 *
 * Jalankan:  node scripts/cek-pintu.mjs
 */
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const AKAR = process.cwd();
const dir = mkdtempSync(join(tmpdir(), "cek-pintu-"));
let gagal = 0;

function bundel(masuk, keluar) {
  execFileSync("npx", ["esbuild", masuk, "--bundle", "--format=cjs",
    "--platform=node", `--outfile=${join(dir, keluar)}`,
    // lucide-react IKUT dibundel, tidak ditandai external: hasil bundelnya
    // dijalankan dari direktori sementara di luar repo, jadi `require`
    // runtime tidak akan menemukan node_modules dari sana.
  ], { cwd: AKAR, stdio: "pipe" });
}

try {
  bundel("src/lib/navigation.js", "nav.cjs");
  bundel("src/lib/permissions.js", "perm.cjs");
} catch (e) {
  console.log("Gagal membundel:\n" + (e.stderr?.toString() || e.message));
  rmSync(dir, { recursive: true, force: true });
  process.exit(1);
}

const nav = await import("file://" + join(dir, "nav.cjs")).then((m) => m.default || m);
const perm = await import("file://" + join(dir, "perm.cjs")).then((m) => m.default || m);
rmSync(dir, { recursive: true, force: true });

const PERAN = Object.keys(perm.NAV_ACCESS);
const pintu = [];
for (const area of nav.NAV_SECTIONS) {
  for (const i of area.items) pintu.push({ ...i, dari: `area ${area.label}` });
}
for (const i of nav.SETTINGS_ITEMS) pintu.push({ ...i, dari: "menu pengaturan" });
for (const i of nav.EXTRA_DESTINATIONS) pintu.push({ ...i, dari: "Ctrl+K" });

// ── 1. section yang tidak dimiliki peran mana pun ───────────────────
const yatim = pintu.filter((p) => !PERAN.some((r) => perm.canAccess(r, p.section)));
if (yatim.length) {
  gagal++;
  console.error(
    `GAGAL  ${yatim.length} pintu memakai section yang tidak dimiliki SATU PUN peran.\n` +
    `   Pintu ini tidak akan pernah muncul di menu maupun Ctrl+K, karena\n` +
    `   HubPage dan CommandPalette keduanya menyaring dengan canAccess().\n` +
    `   Tambahkan section-nya di lib/permissions.js, atau buang pintunya.\n` +
    yatim.map((p) => `   ${p.path}  section "${p.section}"  (${p.dari})`).join("\n")
  );
}

// ── 2. path yang tidak punya rute ───────────────────────────────────
const app = readFileSync(join(AKAR, "src/App.jsx"), "utf8");
const rute = new Set([...app.matchAll(/<Route\s+path="([^"]+)"/g)].map((m) => m[1]));
const nyasar = pintu.filter((p) => !rute.has(p.path.split("?")[0]));
if (nyasar.length) {
  gagal++;
  console.error(
    `GAGAL  ${nyasar.length} pintu menunjuk path yang tidak punya <Route> di App.jsx.\n` +
    nyasar.map((p) => `   ${p.path}  (${p.dari})`).join("\n")
  );
}

if (gagal === 0) {
  console.log(`Semua pintu bisa dibuka (${pintu.length} pintu, ${PERAN.length} peran diperiksa).`);
}
process.exit(gagal === 0 ? 0 : 1);

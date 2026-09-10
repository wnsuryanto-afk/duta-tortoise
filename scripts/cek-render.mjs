/**
 * cek-render.mjs — memastikan komponen penting benar-benar BISA dirender.
 *
 * Kenapa penjaga ini ada. eslint dan `vite build` memeriksa apakah kodenya
 * SAH; keduanya tidak pernah menjalankannya. Sebuah komponen bisa lolos
 * keduanya lalu melempar TypeError pada render pertama — dan pada layar kiper,
 * itu berarti layar putih di HP orang yang sedang berdiri di depan kandang
 * pukul enam pagi.
 *
 * Penjaga ini merender tiap komponen di scripts/render/kasus.jsx dengan
 * renderToString, pada keadaan-keadaan yang paling sering terlewat: data user
 * belum termuat, catatan absensi kosong, properti undefined.
 *
 * Pada 03-09-2026 penjaga ini langsung menemukan satu cacat nyata: tombol
 * "Hari ini saya libur" tetap tampil saat data user belum termuat, dan
 * menekannya melempar TypeError yang mematikan seluruh layar kiper.
 *
 * Yang TIDAK diperiksa: perilaku setelah tombol ditekan, dan tampilan visual.
 * Ini penjaga asap, bukan pengujian menyeluruh — dan penjaga asap yang berjalan
 * tiap kali lebih berguna daripada pengujian menyeluruh yang tidak pernah
 * ditulis.
 */

import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const AKAR = process.cwd();

// Catatan 10-09-2026: penjaga ini membuktikan komponen MAU tampil, bukan
// bahwa angkanya benar. Untuk TortoiseMorphSummary angkanya diperiksa
// terpisah dengan data uji (hypo & piebald dulu dihitung sebagai Normal;
// setelah perbaikan: Normal 4, Het Albino 1, Hypo 1, Piebald 1).

const dir = mkdtempSync(join(tmpdir(), "cek-render-"));

// Panggung minimal: SDK Base44 dan Radix menyentuh window/document saat dimuat.
const PANGGUNG = `
const elemen = () => ({ style: {}, setAttribute() {}, appendChild() {}, insertBefore() {},
  classList: { add() {}, remove() {} }, firstChild: null });
globalThis.window = {
  location: { href: "http://uji.local/", search: "", origin: "http://uji.local", pathname: "/" },
  history: { replaceState() {}, pushState() {} },
  addEventListener() {}, removeEventListener() {},
  localStorage: { getItem: () => null, setItem() {}, removeItem() {} },
  matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }),
};
globalThis.document = { title: "uji", cookie: "", addEventListener() {}, removeEventListener() {},
  head: elemen(), body: elemen(), documentElement: elemen(),
  getElementsByTagName: () => [elemen()], querySelector: () => null,
  createElement: () => elemen(), createTextNode: () => ({}) };
globalThis.localStorage = globalThis.window.localStorage;
globalThis.navigator = { userAgent: "cek-render" };
globalThis.matchMedia = globalThis.window.matchMedia;

// React memperingatkan useLayoutEffect pada render server. Itu bawaan cara
// pengujian ini bekerja, bukan cacat komponennya — jadi disenyapkan supaya
// kegagalan yang sebenarnya tidak tenggelam.
const _err = console.error;
console.error = (...a) => {
  if (typeof a[0] === "string" && a[0].includes("useLayoutEffect")) return;
  _err(...a);
};
require("./bundel.cjs");
`;

try {
  execFileSync("npx", ["esbuild", "scripts/render/entry.jsx",
    "--bundle", "--format=cjs", "--platform=node",
    `--outfile=${join(dir, "bundel.cjs")}`,
    "--loader:.jsx=jsx", `--alias:@=${join(AKAR, "src")}`,
    "--external:react", "--external:react-dom",
    "--external:@tanstack/react-query", "--external:react-router-dom",
    `--define:import.meta.env={"VITE_BASE44_APP_ID":"uji","MODE":"test"}`,
  ], { cwd: AKAR, stdio: "pipe" });
} catch (e) {
  console.log("Gagal membundel kasus render:\n" + (e.stderr?.toString() || e.message));
  rmSync(dir, { recursive: true, force: true });
  process.exit(1);
}

writeFileSync(join(dir, "jalankan.cjs"), PANGGUNG);

let kode = 0;
try {
  const keluaran = execFileSync("node", [join(dir, "jalankan.cjs")], {
    cwd: AKAR, encoding: "utf8", stdio: "pipe",
    env: { ...process.env, NODE_PATH: join(AKAR, "node_modules") },
  });
  process.stdout.write(keluaran);
} catch (e) {
  process.stdout.write(e.stdout?.toString() || "");
  process.stdout.write(e.stderr?.toString() || "");
  kode = 1;
}
rmSync(dir, { recursive: true, force: true });
process.exit(kode);

import { chromium } from "/tmp/pw/node_modules/playwright-core/index.mjs";

const url = process.argv[2];
const label = process.argv[3] || "user";
const browser = await chromium.launch({
  executablePath: "/root/.cache/ms-playwright/chromium-1148/chrome-linux/chrome",
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
});
const page = await browser.newPage({ viewport: { width: 420, height: 900 }, deviceScaleFactor: 1 });
const konsol = [];
const gagal = [];
page.on("console", (m) => { if (m.type() === "error" || m.type() === "warning") konsol.push(`[${m.type()}] ${m.text().slice(0, 300)}`); });
page.on("pageerror", (e) => konsol.push(`[pageerror] ${String(e.message).slice(0, 400)}`));
page.on("requestfailed", (r) => gagal.push(`${r.failure()?.errorText} ${r.url().slice(0, 160)}`));
page.on("response", (r) => { if (r.status() >= 400) gagal.push(`HTTP ${r.status()} ${r.url().slice(0, 160)}`); });

try {
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
} catch (e) {
  console.log("GOTO GAGAL:", e.message);
}
await page.waitForTimeout(12000);
const info = await page.evaluate(() => ({
  url: location.href,
  judul: document.title,
  teks: (document.body.innerText || "").replace(/\s+/g, " ").slice(0, 1200),
  akarKosong: !document.getElementById("root") || document.getElementById("root").children.length === 0,
}));
console.log("=== URL AKHIR:", info.url);
console.log("=== JUDUL:", info.judul);
console.log("=== AKAR REACT KOSONG:", info.akarKosong);
console.log("=== TEKS TERLIHAT:", info.teks);
console.log("=== KONSOL (" + konsol.length + "):");
for (const k of konsol.slice(0, 25)) console.log("   " + k);
console.log("=== PERMINTAAN GAGAL (" + gagal.length + "):");
for (const g of [...new Set(gagal)].slice(0, 25)) console.log("   " + g);
await page.screenshot({ path: `/tmp/potret-${label}.png`, fullPage: false });
console.log("potret: /tmp/potret-" + label + ".png");
await browser.close();

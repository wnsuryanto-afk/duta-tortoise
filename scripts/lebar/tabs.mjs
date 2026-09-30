import { chromium } from "playwright-core";
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
const p = await b.newPage({ viewport: { width: 390, height: 900 } });
const galat = [];
p.on("pageerror", (e) => galat.push(String(e).split("\n")[0].slice(0, 110)));
await p.goto("http://localhost:5199/", { waitUntil: "networkidle" });
await p.waitForTimeout(1500);
const nama = await p.evaluate(() => window.__kasus || []);

for (const kasus of ["RekapPoinGajiPage tanpa data", "SalarySlipPage (Gaji Saya) tanpa data"]) {
  const i = nama.indexOf(kasus);
  if (i < 0) { console.log("TIDAK ADA:", kasus); continue; }
  await p.evaluate((n) => window.__pindah(n), i);
  await p.waitForTimeout(1200);
  const tabs = await p.$$('#bingkai [role="tab"]');
  console.log(`\n══ ${kasus} — ${tabs.length} tab ══`);
  for (let t = 0; t < tabs.length; t++) {
    const all = await p.$$('#bingkai [role="tab"]');
    const label = (await all[t].textContent()).trim();
    const sebelum = galat.length;
    await all[t].click();
    await p.waitForTimeout(900);
    const isi = await p.evaluate(() => {
      const panel = document.querySelector('#bingkai [role="tabpanel"]:not([hidden])');
      return panel ? (panel.textContent || "").trim().replace(/\s+/g, " ").slice(0, 95) : "(tidak ada panel aktif)";
    });
    const baru = galat.length - sebelum;
    console.log(`  ${baru ? "GAGAL" : "  ok "} ${label.padEnd(14)} → ${isi}`);
  }
}
if (galat.length) console.log("\nGalat:\n  " + [...new Set(galat)].join("\n  "));
else console.log("\nTidak ada galat halaman.");
await b.close();

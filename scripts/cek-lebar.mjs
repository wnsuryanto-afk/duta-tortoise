/**
 * cek-lebar.mjs — tidak ada tulisan yang terpotong di layar HP.
 *
 * ── Kenapa penjaga ini ada ──────────────────────────────────────────
 *
 * Tiga penjaga lain sudah memeriksa apakah kodenya SAH (`vite build`),
 * apakah variabelnya ada (`eslint`), dan apakah komponennya MAU tampil
 * (`cek-render`). Tidak satu pun dari ketiganya pernah melihat hasilnya.
 * Sebuah layar bisa lolos ketiganya dengan tulisan yang terpotong di
 * tengah huruf.
 *
 * Dan itu memang terjadi. Pemicunya ada di komponen bersama
 * `ui/select.jsx`, jadi menyentuh SETIAP penyaring di aplikasi:
 *
 *   [&>span]:line-clamp-1   bersama   whitespace-nowrap
 *
 * `line-clamp` memasang elipsisnya pada BARIS. `whitespace-nowrap`
 * memastikan tulisannya tidak pernah pindah baris. Jadi elipsisnya tidak
 * pernah muncul, dan yang tersisa cuma `overflow: hidden` — potongan
 * keras di tengah huruf, tanpa satu pun tanda bahwa ada yang hilang.
 *
 * Pada layar 360px, "Semua Spesialisasi" (115px) di dalam kotak 104px
 * terbaca "Semua Spesialisas". Itu bukan keadaan tepi: itu keadaan
 * BAWAAN penyaringnya, yang dilihat setiap orang yang belum menyentuhnya.
 *
 * ── Apa yang diukur ─────────────────────────────────────────────────
 *
 * Tiap kasus di scripts/render/kasus.jsx dirender di Chromium selebar
 * 360px — HP paling sempit yang dipakai di lapangan — lalu tiap elemen
 * diperiksa: isinya lebih lebar daripada kotaknya, atau tepi kanannya
 * lewat dari layar?
 *
 * Yang SENGAJA tidak dihitung, masing-masing dengan alasannya:
 *
 *   1. Apa pun yang punya leluhur bisa digulung mendatar. Strip penyaring
 *      dan tabel lebar memang dibuat begitu supaya bisa dicapai; anaknya
 *      wajib lebih lebar dari layar. Tanpa pengecualian ini penjaga ini
 *      melaporkan tabel penjualan dan strip status kura sebagai cacat —
 *      keduanya sudah diperiksa dan keduanya baik-baik saja.
 *   2. Elemen tanpa tulisan. Lingkaran buram hias `-top-10 -right-10`
 *      di kartu dasbor memang dipotong `overflow-hidden`, dan memang
 *      itu maksudnya.
 *   3. Isi SVG. Label sumbu Recharts meleset 3px karena mesin
 *      grafiknya, bukan karena tata letak aplikasi ini.
 *
 * Jalankan:  node scripts/cek-lebar.mjs
 */
import { spawn } from "node:child_process";
import { chromium } from "playwright-core";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SINI = path.dirname(fileURLToPath(import.meta.url));
const AKAR = path.resolve(SINI, "..");
const PORT = Number(process.env.PORT_UJI || 5199);
const LEBAR = 360;
const CHROME = process.env.CHROME_UJI ||
  "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";

/** Diukur di dalam halaman. Dikirim sebagai teks, jadi mandiri. */
function ukur(lebarLayar) {
  const bingkai = document.getElementById("bingkai");
  if (!bingkai) return [];
  const keluar = [];
  const bisaGulung = (g) =>
    ["auto", "scroll"].includes(g.overflowX) || ["auto", "scroll"].includes(g.overflow);

  for (const el of bingkai.querySelectorAll("*")) {
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) continue;
    if (el.ownerSVGElement || el.tagName === "svg") continue;      // (3)
    const teks = (el.textContent || "").trim();
    if (!teks) continue;                                            // (2)

    const g = getComputedStyle(el);
    if (g.position === "fixed" || bisaGulung(g)) continue;

    let naik = el.parentElement, adaJalan = false;                  // (1)
    while (naik && naik !== document.body) {
      const gg = getComputedStyle(naik);
      if (bisaGulung(gg) && naik.scrollWidth > naik.clientWidth + 1) { adaJalan = true; break; }
      naik = naik.parentElement;
    }
    if (adaJalan) continue;

    // Elemen yang isinya cuma elemen lain bukan temuan tersendiri:
    // yang dicari yang tulisannya sendiri terpotong.
    const punyaTeksSendiri = [...el.childNodes].some(
      (n) => n.nodeType === 3 && n.textContent.trim(),
    );
    if (!punyaTeksSendiri) continue;

    const lebih = el.scrollWidth - el.clientWidth;
    if (lebih > 1 && el.clientWidth > 0) {
      keluar.push({ jenis: "terpotong", lebih, teks: teks.slice(0, 50) });
    } else if (r.right > lebarLayar + 1) {
      keluar.push({ jenis: "lewat tepi", lebih: Math.round(r.right - lebarLayar), teks: teks.slice(0, 50) });
    }
  }
  return keluar;
}

const server = spawn(
  "npx", ["vite", "--config", path.join(SINI, "lebar/vite.config.js")],
  { cwd: AKAR, env: { ...process.env, PORT_UJI: String(PORT) }, stdio: "ignore" },
);
const tutup = () => { try { server.kill("SIGTERM"); } catch { /* sudah mati */ } };
process.on("exit", tutup);

async function tunggu(url, detik = 40) {
  for (let i = 0; i < detik * 2; i++) {
    try { if ((await fetch(url)).ok) return true; } catch { /* belum siap */ }
    await new Promise((r) => setTimeout(r, 500));
  }
  return false;
}

const alamat = `http://localhost:${PORT}/`;
if (!await tunggu(alamat)) {
  console.error(`Server uji tidak mau hidup di ${alamat}.`);
  tutup(); process.exit(1);
}

const peramban = await chromium.launch({ executablePath: CHROME });
const halaman = await peramban.newPage({ viewport: { width: LEBAR, height: 900 } });
await halaman.goto(alamat, { waitUntil: "networkidle" });
await halaman.waitForTimeout(1500);

const nama = await halaman.evaluate(() => window.__kasus || []);
const temuan = [];

for (let i = 0; i < nama.length; i++) {
  await halaman.evaluate((n) => window.__pindah(n), i);
  await halaman.waitForTimeout(400);
  const hasil = await halaman.evaluate(ukur, LEBAR);
  const lihat = new Set();
  for (const t of hasil) {
    const kunci = t.jenis + "|" + t.teks;
    if (lihat.has(kunci)) continue;
    lihat.add(kunci);
    temuan.push(`${nama[i]}  ${t.jenis} +${t.lebih}px  "${t.teks}"`);
  }
}

if (temuan.length) {
  console.error(
    `${temuan.length} tulisan terpotong pada layar ${LEBAR}px.\n\n` +
    `Tidak ada yang bisa digulung untuk mencapainya dan tidak ada elipsis\n` +
    `yang memberi tahu bahwa ada yang hilang — jadi yang dilihat orang di\n` +
    `lapangan adalah kata yang putus di tengah huruf.\n\n` +
    `Lebarkan kotaknya, pendekkan tulisannya, atau beri jalan gulung\n` +
    `mendatar pada induknya.\n\n` +
    temuan.map((t) => "  " + t).join("\n"),
  );
  await peramban.close();
  tutup();
  process.exit(1);
}

/* ── Bagian 2: WADAH sempit di LAYAR lebar ───────────────────────────────
 *
 * Bagian di atas menyempitkan LAYARNYA. Itu tidak pernah bisa menangkap cacat
 * yang dilaporkan 5 Okt 2026, karena di situ layarnya justru LEBAR.
 *
 * Titik henti Tailwind (`sm:`, `lg:`) membaca lebar LAYAR. Komponen yang
 * hidup di dalam kolom sempit — kepala halaman, panel sisi, atau aplikasi
 * yang dibuka di panel pratinjau iPad — tetap memakai tata letak "lg"
 * meskipun ruang yang benar-benar ada selebar ponsel. Hasilnya di
 * RingkasanAngka: empat kolom selebar 150px, "Nilai stok" terpangkas jadi
 * "N…", "Pergerakan hari ini" jadi "P…", dan "Rp 9.455.201" patah dua baris.
 *
 * Layar 360px tidak melihatnya karena di situ titik hentinya memang kecil.
 * Jadi di sini layarnya dibiarkan lebar, dan WADAHNYA yang disempitkan.
 */
const LEBAR_WADAH = [320, 420, 560, 720];
const halaman2 = await peramban.newPage({ viewport: { width: 1280, height: 1000 } });
await halaman2.goto(alamat, { waitUntil: "networkidle" });
await halaman2.waitForTimeout(1500);

const temuan2 = [];
for (let i = 0; i < nama.length; i++) {
  await halaman2.evaluate((n) => window.__pindah(n), i);
  await halaman2.waitForTimeout(300);
  for (const w of LEBAR_WADAH) {
    await halaman2.evaluate((w) => {
      const b = document.getElementById("bingkai");
      if (b) { b.style.width = w + "px"; b.style.maxWidth = w + "px"; }
    }, w);
    await halaman2.waitForTimeout(250);
    const hasil = await halaman2.evaluate(ukur, 1280);
    const lihat = new Set();
    for (const t of hasil) {
      const kunci = t.jenis + "|" + t.teks;
      if (lihat.has(kunci)) continue;
      lihat.add(kunci);
      temuan2.push(`${nama[i]}  wadah ${w}px  ${t.jenis} +${t.lebih}px  "${t.teks}"`);
    }
  }
}

await peramban.close();
tutup();

if (temuan2.length) {
  console.error(
    `${temuan2.length} tulisan terpotong di WADAH sempit (layar 1280px).\n\n` +
    `Titik henti Tailwind membaca lebar LAYAR, bukan lebar wadahnya. Komponen\n` +
    `yang hidup di kolom sempit tetap memakai tata letak layar lebar.\n\n` +
    `Pakai lebar wadah: grid-template-columns: repeat(auto-fit, minmax(…, 1fr)),\n` +
    `atau container query — bukan sm:/lg:.\n\n` +
    temuan2.map((t) => "  " + t).join("\n"),
  );
  process.exit(1);
}

console.log(`Tidak ada tulisan terpotong (${nama.length} kasus pada layar ${LEBAR}px, dan pada wadah ${LEBAR_WADAH.join("/")}px di layar 1280px).`);
process.exit(0);

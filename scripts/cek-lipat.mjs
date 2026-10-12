import { spawn } from "node:child_process";
import { chromium } from "playwright-core";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ukur } from "./lebar/ukur.mjs";

/**
 * cek-lipat.mjs — tidak ada yang meluap keluar layar, di lebar HP yang nyata.
 *
 * ── Cacat yang dicarinya ────────────────────────────────────────────────
 *
 * Satu elemen yang lebih lebar daripada layarnya membuat SELURUH halaman
 * bisa digeser ke samping. Akibatnya bukan satu tombol yang jelek: setiap
 * gulungan ke bawah ikut menyerempet ke kanan, judul-judul bergeser keluar
 * bingkai, dan layarnya terasa rusak tanpa ada satu pun pesan galat.
 *
 * ── Kenapa cek-lebar tidak bisa menangkapnya ────────────────────────────
 *
 * cek-lebar menjawab pertanyaan lain: "adakah tulisan yang terpotong".
 * Bagian keduanya menyempitkan WADAH sampai 320px tetapi LAYARNYA tetap
 * 1280px — dan itu memang disengaja, untuk menangkap komponen yang dipakai
 * di kolom sempit. Harganya: setiap `sm:` dan `md:` membaca 1280px, jadi
 * susunan yang benar-benar dipakai HP tidak pernah sekali pun digambar.
 *
 * Penjaga ini menyempitkan LAYARNYA sungguhan dan menyuruh bingkai harness
 * mengikutinya (`__lebarBingkai(null)`), sehingga titik hentinya menyala
 * persis seperti di tangan orang.
 *
 * ── Kenapa lima lebar ini ───────────────────────────────────────────────
 *
 *   280  layar LUAR HP lipat saat terlipat (Galaxy Z Fold 3/4). Terdaftar
 *        pertama karena pemilik peternakan ini memakai HP lipat, dan di
 *        sinilah seluruh temuan pertama muncul: 15 luapan di 9 layar,
 *        12 Okt 2026.
 *   320  HP kecil dan layar luar lipat generasi lain.
 *   412  Android arus utama (Pixel). Mewakili HP biasa yang tidak lipat.
 *   673  layar DALAM HP lipat saat dibuka. Zona yang paling tidak pernah
 *        diuji: di atas titik henti `sm:` (640) tetapi di bawah `md:`
 *        (768), jadi separuh aturan tata letaknya menyala dan separuhnya
 *        tidak — gabungan yang tidak pernah muncul di layar lain.
 *   768  `md:` tepat di titik paling sempitnya.
 *
 * 360px sengaja TIDAK diulang di sini: cek-lebar sudah menggambar seluruh
 * kasus pada lebar itu dengan pemeriksaan yang lebih dalam.
 *
 * ── Yang TIDAK dilaporkan, dan kenapa ───────────────────────────────────
 *
 * Elemen yang dirinya sendiri — atau salah satu induknya — memotong atau
 * menggulung mendatar (`overflow` auto/scroll/hidden/clip) dibiarkan. Dua
 * hal yang sah bergantung padanya: barisan tab yang memang digulung ke
 * samping, dan lingkaran hias berblur yang sengaja dilempar keluar kartu
 * lalu dipotong kartunya. Versi pertama penjaga ini hanya menelusuri INDUK,
 * bukan elemennya sendiri, dan hanya mengenali auto/scroll — ia melaporkan
 * empat luapan palsu di setiap lebar, termasuk pada lebar yang sebenarnya
 * bersih. Penjaga yang berteriak tanpa sebab adalah penjaga yang diabaikan.
 */

const SINI = path.dirname(fileURLToPath(import.meta.url));
const AKAR = path.resolve(SINI, "..");
const PORT = Number(process.env.PORT_LIPAT || 5207);
const CHROME = process.env.CHROME_UJI ||
  "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";

const LEBAR = [280, 320, 412, 673, 768];

/** Berapa kasus paling sedikit yang harus tergambar supaya hasilnya dipercaya. */
const MINIMAL_KASUS = 100;

/**
 * Lebar yang juga diperiksa TULISAN TERPOTONG-nya, bukan cuma luapannya.
 *
 * cek-lebar sudah melakukannya di 360px dengan pengukur yang sama
 * (lebar/ukur.mjs — satu salinan, dipakai dua penjaga). Tetapi bingkainya
 * dipatok 360, jadi 280px tidak pernah terjangkau. Diukur 12 Okt 2026 pada
 * lebar itu: 8 tulisan terpotong di 6 layar — enam di antaranya label tombol
 * yang berupa kalimat, dan dua judul yang satu KATA-nya (122px) lebih lebar
 * daripada kotaknya (114px), sehingga melipat baris pun tidak menolong.
 *
 * Hanya 280px: lebar lain sudah dijaga cek-lebar lewat wadah sempitnya, dan
 * memeriksa kelimanya akan melipatgandakan waktu jalan tanpa menambah cacat
 * yang bisa ditemukan.
 */
const LEBAR_PERIKSA_TEKS = new Set([280]);

/** Diukur di dalam halaman; dikirim sebagai teks, jadi harus mandiri. */
function luapan(lebarLayar) {
  const bingkai = document.getElementById("bingkai");
  // Bingkai yang HILANG bukan bingkai yang bersih — cek-lebar pernah hijau
  // untuk 110 kasus yang tidak pernah digambar karena perbedaan itu kabur.
  if (!bingkai) return [{ tag: "—", lebih: 0, lebar: 0, kelas: "", teks: "BINGKAI HILANG" }];

  // Dialog digambar Radix lewat portal ke document.body, di luar bingkai.
  const akar = [bingkai, ...document.querySelectorAll('[role="dialog"]')];
  const keluar = [];
  const lihat = new Set();
  const memotong = (v) => ["auto", "scroll", "hidden", "clip"].includes(v);

  for (const a of akar) {
    for (const el of [a, ...a.querySelectorAll("*")]) {
      const r = el.getBoundingClientRect();
      if (r.width <= 1 || r.height <= 1) continue;
      const lebih = Math.round(r.right - lebarLayar);
      if (lebih <= 1) continue;

      // Mulai dari ELEMENNYA SENDIRI, bukan induknya.
      let p = el, aman = false;
      while (p && p !== document.body) {
        const g = getComputedStyle(p);
        if (memotong(g.overflowX) || memotong(g.overflow)) { aman = true; break; }
        p = p.parentElement;
      }
      if (aman) continue;

      const kelas = (el.className?.toString?.() || "").slice(0, 80);
      const k = el.tagName + "|" + kelas;
      if (lihat.has(k)) continue;
      lihat.add(k);
      keluar.push({
        tag: el.tagName.toLowerCase(),
        lebih,
        lebar: Math.round(r.width),
        kelas,
        teks: (el.textContent || "").trim().slice(0, 45),
      });
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

const alamat = `http://localhost:${PORT}/`;
let hidup = false;
for (let i = 0; i < 80; i++) {
  try { if ((await fetch(alamat)).ok) { hidup = true; break; } } catch { /* belum siap */ }
  await new Promise((r) => setTimeout(r, 500));
}
if (!hidup) {
  console.error(`Server uji tidak mau hidup di ${alamat}.`);
  tutup(); process.exit(1);
}

const peramban = await chromium.launch({ executablePath: CHROME });
const galat = [];
let totalDiukur = 0;

for (const w of LEBAR) {
  const hal = await peramban.newPage({ viewport: { width: w, height: 900 } });
  await hal.goto(alamat, { waitUntil: "networkidle" });
  await hal.waitForTimeout(1200);
  // Bingkai mengikuti layar; tanpa ini ia tetap dipatok 360px dan lebar
  // layar yang diuji tidak pernah menyentuh tata letaknya.
  await hal.evaluate(() => window.__lebarBingkai(null));
  await hal.waitForTimeout(200);

  const nama = await hal.evaluate(() => window.__kasus || []);
  if (nama.length < MINIMAL_KASUS) {
    console.error(
      `Hanya ${nama.length} kasus terbaca di layar ${w}px (harap ≥ ${MINIMAL_KASUS}).\n` +
      `Harness tidak termuat — hasil hijau di sini tidak berarti apa-apa.`,
    );
    await peramban.close(); tutup(); process.exit(1);
  }

  for (let i = 0; i < nama.length; i++) {
    await hal.evaluate((n) => window.__pindah(n), i);
    await hal.waitForTimeout(170);
    totalDiukur++;
    for (const t of (await hal.evaluate(luapan, w)) || []) {
      galat.push(
        `layar ${w}px — ${nama[i]}\n` +
        `      <${t.tag}> lebar ${t.lebar}px, keluar layar +${t.lebih}px  "${t.teks}"\n` +
        `      kelas: ${t.kelas}`,
      );
    }
    if (LEBAR_PERIKSA_TEKS.has(w)) {
      const lihat = new Set();
      for (const t of (await hal.evaluate(ukur, w)) || []) {
        if (t.jenis !== "terpotong") continue; // "lewat tepi" sudah dijawab luapan()
        const k = t.teks + "|" + t.kelas;
        if (lihat.has(k)) continue;
        lihat.add(k);
        galat.push(
          `layar ${w}px — ${nama[i]}\n` +
          `      tulisan terpotong +${t.lebih}px  "${t.teks}"\n` +
          `      kelas: ${t.kelas}\n      induk: ${t.induk}`,
        );
      }
    }
  }
  await hal.close();
}

await peramban.close();
tutup();

if (galat.length) {
  console.error(
    `\n${galat.length} elemen keluar layar (${LEBAR.join("/")}px):\n\n` +
    galat.map((g) => "  " + g).join("\n\n") +
    `\n\nSatu elemen yang lebih lebar daripada layarnya membuat SELURUH halaman\n` +
    `bisa digeser ke samping: setiap gulungan ke bawah ikut menyerempet ke\n` +
    `kanan dan judulnya bergeser keluar bingkai.\n\n` +
    `Perbaikinya biasanya flex-wrap pada barisnya, atau min-w-0 pada anggota\n` +
    `flex yang menolak mengecil — bukan titik henti baru, karena yang\n` +
    `menentukan muat atau tidak adalah lebar WADAH.\n`,
  );
  process.exit(1);
}

console.log(
  `Tidak ada yang keluar layar dan tidak ada tulisan terpotong: ${totalDiukur} ` +
  `pengukuran pada layar ${LEBAR.join("/")}px — termasuk 280px (HP lipat saat ` +
  `terlipat, tulisannya ikut diperiksa) dan 673px (saat dibuka, di antara ` +
  `titik henti sm: dan md:).`,
);

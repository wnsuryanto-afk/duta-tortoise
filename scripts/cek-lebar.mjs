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
  // Bingkai yang HILANG bukan bingkai yang bersih. Dulu keduanya
  // mengembalikan daftar kosong, dan 110 kasus lulus tanpa pernah digambar.
  if (!bingkai) return [{ jenis: "bingkai hilang", lebih: 0, teks: "" }];
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

    // Kelas elemen dan kelas induknya ikut dibawa. Tanpa itu temuan hanya
    // menyebut tulisannya, dan yang memperbaikinya harus menebak elemen mana
    // di antara belasan yang berbunyi sama di satu halaman.
    const kelas = typeof el.className === "string" ? el.className.slice(0, 70) : "";
    const induk = typeof el.parentElement?.className === "string"
      ? el.parentElement.className.slice(0, 70) : "";
    const lebih = el.scrollWidth - el.clientWidth;
    if (lebih > 1 && el.clientWidth > 0) {
      keluar.push({ jenis: "terpotong", lebih, teks: teks.slice(0, 50), kelas, induk });
    } else if (r.right > lebarLayar + 1) {
      keluar.push({ jenis: "lewat tepi", lebih: Math.round(r.right - lebarLayar), teks: teks.slice(0, 50), kelas, induk });
    }
  }
  return keluar;
}

/*
 * Dua cacat yang diukur di dalam peramban yang sama, karena keduanya hanya
 * terlihat SESUDAH digambar — bukan dari membaca JSX.
 *
 * 1. KALIMAT YANG SAMA BERULANG DI SATU LAYAR.
 *
 *    9 Okt 2026, dipotret di lebar telepon: tab "Naikkan produksi" menulis
 *    "betina pernah bertelur" enam belas kali berturut-turut, dan halaman
 *    Otomatisasi menaruh kalimat "Memanggil fungsinya sekali dan menampilkan
 *    jawabannya apa adanya" di samping SEMBILAN BELAS tombol — satu halaman,
 *    11,5 layar telepon, 8.371 huruf.
 *
 *    Penjelasan yang sama untuk semua baris adalah judul kolom atau catatan
 *    kaki, bukan isi baris. Yang diperiksa di sini bukan selera: sebuah baris
 *    teks yang SAMA PERSIS, cukup panjang untuk jadi kalimat, muncul berkali
 *    -kali di satu layar. Nama kura yang berulang tidak kena — terlalu pendek.
 *
 * 2. KALIMAT YANG DIPECAH FLEX MENJADI KOLOM.
 *
 *    `<p className="flex items-start gap-1.5">Sesudah <b>14 jantan</b> ...</p>`
 *    menjadikan TIAP potongan teks satu item flex, jadi kalimatnya tergambar
 *    sebagai kolom-kolom sempit yang bertumpuk ke bawah. Tidak ada yang
 *    terpotong, jadi pemeriksaan lebar tidak melihatnya — tetapi kalimatnya
 *    tidak bisa dibaca.
 */
function cacatTeks() {
  const bingkai = document.getElementById("bingkai");
  if (!bingkai) return null;
  const keluar = [];

  // (1) Baris identik yang berulang.
  const hitung = new Map();
  for (const baris of (bingkai.innerText || "").split("\n")) {
    const s = baris.trim();
    if (s.length < 25) continue;
    hitung.set(s, (hitung.get(s) || 0) + 1);
  }
  for (const [s, n] of hitung) {
    if (n >= 4) keluar.push({ jenis: "kalimat berulang", n, teks: s.slice(0, 70) });
  }

  // (2) Wadah flex mendatar yang isinya teks telanjang BERSAMA elemen lain.
  for (const el of bingkai.querySelectorAll("p, span, div")) {
    const g = getComputedStyle(el);
    if (g.display !== "flex" && g.display !== "inline-flex") continue;
    if (g.flexDirection !== "row" && g.flexDirection !== "row-reverse") continue;
    if (g.flexWrap === "wrap") continue;
    const anak = [...el.childNodes];
    const teksTelanjang = anak.filter((n) => n.nodeType === 3 && n.textContent.trim().length > 12);
    const elemen = anak.filter((n) => n.nodeType === 1);
    /*
      DUA potongan teks telanjang atau lebih, bukan satu.

      Versi pertama menandai "teks telanjang BERSAMA elemen" dan langsung
      berbunyi 40-an kali untuk `<h3 className="flex items-center gap-2">
      <Icon/> Judul</h3>` — ikon di samping label, idiom yang benar dan
      tergambar persis seperti yang dimaksud. Satu potongan teks di samping
      satu ikon memang duduk berdampingan; itu gunanya flex.

      Yang merusak kalimat adalah potongan teks KEDUA: begitu sebuah kalimat
      dipotong oleh <b> di tengahnya, potongan sebelum dan sesudahnya menjadi
      dua kolom terpisah, dan kalimatnya tergambar bertumpuk.
    */
    if (teksTelanjang.length >= 2) {
      keluar.push({
        jenis: "kalimat dipecah flex",
        n: teksTelanjang.length + elemen.length,
        teks: (el.textContent || "").trim().slice(0, 70),
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

/* ── Mengukur dua kali, bukan sekali ─────────────────────────────────────
 *
 * Penjaga ini pernah melaporkan 41 tulisan terpotong di delapan halaman yang
 * tidak sedang disentuh, lalu hijau sepenuhnya ketika dijalankan sendirian.
 * Sebabnya bukan tata letaknya: ia dijalankan BERSAMAAN dengan `vite build`,
 * dan jeda tetap 250–400 ms tidak cukup untuk Chromium yang sedang berebut
 * prosesor — DOM terukur di tengah penataan, sebelum lebar sebenarnya jadi.
 *
 * Penjaga yang berteriak 41 kali tanpa sebab adalah penjaga yang diabaikan
 * orang, dan itu lebih buruk daripada tidak ada penjaga. Jadi pengukurannya
 * dilakukan DUA kali dengan satu putaran gambar di antaranya, dan hanya yang
 * muncul di KEDUA pengukuran dilaporkan. Temuan yang lahir dari penataan yang
 * belum selesai tidak terulang di pengukuran kedua; tulisan yang benar-benar
 * terpotong terulang setiap kali.
 */
async function tenang(hal) {
  // `document.fonts.ready` lebih penting daripada jeda mana pun: lebar tulisan
  // tidak bisa diukur sebelum hurufnya yang benar terpasang.
  await hal.evaluate(() => document.fonts?.ready ?? Promise.resolve());
  await hal.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
}

const kunciTemuan = (t) => t.jenis + "|" + t.teks;

/*
 * Memastikan kasus yang DIUKUR adalah kasus yang DIMINTA.
 *
 * Dua kegagalan diam yang pernah terjadi bersamaan: bingkainya lenyap karena
 * akar React dilepas, dan nama yang tergambar tidak sama dengan nama yang
 * sedang diukur. Keduanya menghasilkan "tidak ada temuan", yang terbaca
 * sebagai lulus.
 */
async function pastikanTergambar(hal, harap) {
  for (let i = 0; i < 40; i++) {
    const k = await hal.evaluate(() => ({
      nama: window.__nama,
      ada: !!document.getElementById("bingkai"),
    }));
    if (k.ada && k.nama === harap) return "";
    await hal.waitForTimeout(100);
  }
  const k = await hal.evaluate(() => ({
    nama: window.__nama,
    ada: !!document.getElementById("bingkai"),
  }));
  if (!k.ada) return "bingkai React lenyap — akarnya dilepas, kasus ini tidak pernah digambar";
  return `yang tergambar "${k.nama}", bukan kasus yang diminta`;
}

async function ukurMantap(hal, lebar) {
  await tenang(hal);
  const satu = await hal.evaluate(ukur, lebar);
  if (satu.length === 0) return satu;
  await tenang(hal);
  const dua = new Set((await hal.evaluate(ukur, lebar)).map(kunciTemuan));
  return satu.filter((t) => dua.has(kunciTemuan(t)));
}

const peramban = await chromium.launch({ executablePath: CHROME });
const halaman = await peramban.newPage({ viewport: { width: LEBAR, height: 900 } });
await halaman.goto(alamat, { waitUntil: "networkidle" });
await halaman.waitForTimeout(1500);

const nama = await halaman.evaluate(() => window.__kasus || []);
const temuan = [];
const temuanTeks = [];

const takTerukur = [];
for (let i = 0; i < nama.length; i++) {
  await halaman.evaluate((n) => window.__pindah(n), i);
  await halaman.waitForTimeout(400);
  const salah = await pastikanTergambar(halaman, nama[i]);
  if (salah) { takTerukur.push(`${nama[i]}  ${salah}`); continue; }
  /*
    Buka dulu semua bagian yang tertutup.

    Sejak 9 Okt 2026 beberapa halaman panjang menutup bagiannya sendiri —
    Panduan Pakan, Pengaturan WhatsApp, kartu Pemeliharaan Sistem. Isinya
    tetap ada, hanya tidak tergambar; dan yang tidak tergambar TIDAK DIUKUR.
    Tanpa langkah ini, memasang penutup pada sebuah bagian akan membuat
    seluruh tulisan di dalamnya lolos pemeriksaan tanpa pernah dilihat —
    penjaga yang hijau karena layarnya kosong, pola yang sudah menggigit
    berkas ini sekali (110 kasus yang tidak pernah digambar).

    Hanya `button[aria-expanded="false"]`: atribut itu menandai pembuka
    bagian, bukan tombol yang mengirim atau menghapus sesuatu.
  */
  for (let putaran = 0; putaran < 3; putaran++) {
    const dibuka = await halaman.evaluate(() => {
      const tombol = [...document.querySelectorAll('#bingkai button[aria-expanded="false"]')];
      tombol.forEach((b) => b.click());
      return tombol.length;
    });
    if (!dibuka) break;
    await halaman.waitForTimeout(220);
  }

  const cacat = await halaman.evaluate(cacatTeks);
  for (const c of cacat || []) {
    if (c.jenis === "kalimat berulang") {
      temuanTeks.push(`${nama[i]}  kalimat yang sama ${c.n}×: "${c.teks}"`);
    } else {
      temuanTeks.push(`${nama[i]}  kalimat dipecah flex jadi ${c.n} kolom: "${c.teks}"`);
    }
  }
  const hasil = await ukurMantap(halaman, LEBAR);
  const lihat = new Set();
  for (const t of hasil) {
    const kunci = t.jenis + "|" + t.teks;
    if (lihat.has(kunci)) continue;
    lihat.add(kunci);
    temuan.push(`${nama[i]}  ${t.jenis} +${t.lebih}px  "${t.teks}"\n      kelas: ${t.kelas}\n      induk: ${t.induk}`);
  }
}

if (temuanTeks.length) {
  console.error(
    `${temuanTeks.length} masalah tulisan.\n\n` +
    `"Kalimat yang sama Nx" — penjelasan yang berlaku untuk semua baris adalah\n` +
    `judul kolom atau catatan kaki, bukan isi tiap baris.\n\n` +
    `"Kalimat dipecah flex" — wadah flex mendatar menjadikan tiap potongan teks\n` +
    `satu kolom, jadi kalimatnya tergambar bertumpuk ke bawah. Bungkus teksnya\n` +
    `dalam satu <span>, atau pakai flex-wrap.\n\n` +
    temuanTeks.map((t) => "  " + t).join("\n"),
  );
  await peramban.close();
  tutup();
  process.exit(1);
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
  const salah2 = await pastikanTergambar(halaman2, nama[i]);
  if (salah2) { takTerukur.push(`${nama[i]}  (wadah sempit)  ${salah2}`); continue; }
  for (const w of LEBAR_WADAH) {
    await halaman2.evaluate((w) => {
      const b = document.getElementById("bingkai");
      if (b) { b.style.width = w + "px"; b.style.maxWidth = w + "px"; }
    }, w);
    await halaman2.waitForTimeout(250);
    const hasil = await ukurMantap(halaman2, 1280);
    const lihat = new Set();
    for (const t of hasil) {
      const kunci = t.jenis + "|" + t.teks;
      if (lihat.has(kunci)) continue;
      lihat.add(kunci);
      temuan2.push(`${nama[i]}  wadah ${w}px  ${t.jenis} +${t.lebih}px  "${t.teks}"\n      kelas: ${t.kelas}\n      induk: ${t.induk}`);
    }
  }
}

const rusak = await halaman2.evaluate(() => window.__rusak || {});

await peramban.close();
tutup();

/*
 * Kasus yang MELEMPAR GALAT dilaporkan tersendiri, bukan didiamkan.
 *
 * `cek-render` memeriksa hal yang mirip tetapi tidak bisa melihat ini: di sana
 * query dimatikan, jadi jalur kode yang melempar setelah data datang tidak
 * pernah berjalan. Di sini query dinyalakan, dan justru itu yang menemukannya.
 */
if (Object.keys(rusak).length) {
  console.error(
    `${Object.keys(rusak).length} kasus melempar galat saat digambar, jadi lebarnya tidak bisa diukur:\n\n` +
    Object.entries(rusak).map(([n, m]) => `  ${n}\n      ${m}`).join("\n"),
  );
  process.exit(1);
}

if (takTerukur.length) {
  console.error(
    `${takTerukur.length} kasus tidak pernah terukur:\n\n` +
    `Penjaga yang melaporkan "bersih" untuk kasus yang tidak pernah digambar\n` +
    `lebih buruk daripada tidak ada penjaga.\n\n` +
    takTerukur.map((t) => "  " + t).join("\n"),
  );
  process.exit(1);
}

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

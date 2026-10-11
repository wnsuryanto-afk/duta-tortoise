import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

/**
 * cek-tautan.mjs — angka ringkasan harus bisa diklik, DAN mendarat di
 * tempat yang dijanjikannya.
 *
 * ── Kenapa penjaga ini ada ──────────────────────────────────────────────
 *
 * Disurvei 4 Okt 2026: sepuluh halaman memajang angka ringkasan dan tidak
 * satu pun bisa diklik. Itu diperbaiki di beranda Owner, lalu berhenti di
 * sana. Disurvei lagi 11 Okt 2026, masih ada 24 angka tanpa tujuan di
 * sembilan berkas — termasuk keempat dasbor peran lain, yang tidak pernah
 * ikut diperbaiki karena tidak ada yang memeriksanya.
 *
 * ── Tiga cacat yang dicarinya, dan kenapa ketiganya ─────────────────────
 *
 * 1. **Angka tanpa tujuan.** "Perlu approval 7" yang tidak bisa diklik
 *    memindahkan pekerjaan ke orang yang membacanya: ia sekarang tahu ada
 *    tujuh hal, dan harus mencari sendiri di mana.
 *
 * 2. **Tujuan yang tidak ada.** Rute salah ketik mendarat di layar kosong.
 *
 * 3. **Tujuan yang ADA tapi tidak menerima maksudnya.** Ini yang paling
 *    sulit terlihat, karena tidak ada yang rusak di layar. `/payroll`
 *    mengalihkan ke `/rekap-poin-gaji?tab=bonus`, tetapi tab sah halaman
 *    itu hanya terbitkan/kasbon/catatan/laporan/pengaturan — "bonus" adalah
 *    pilihan DI DALAM tab laporan, bukan tab. Jadi menu "Bonus & Reward"
 *    membuka "Terbitkan Slip", diam-diam, dan terlihat seperti halaman yang
 *    memang begitu. Tiga pengalihan lama mengidap ini sekaligus.
 *
 * Jangkar ("#…") diperiksa juga: tautan ke bagian yang id-nya tidak ada
 * terbaca bisa diklik, lalu tidak memindahkan layar satu piksel pun.
 */

const AKAR = "src";

/*
  Angka yang memang tidak menuju ke mana-mana menyatakannya SENDIRI, dengan
  `tanpaTujuan: "<alasan>"` di objeknya.

  Daftar putih di berkas ini akan menjadi tempat alasan-alasan itu menumpuk
  jauh dari angkanya, dan daftar seperti itu selalu berakhir sebagai tempat
  membuang peringatan. Alasan yang ditulis di sebelah angkanya terbaca oleh
  orang berikutnya yang menyentuh baris itu, dan ikut terhapus bersamanya.

  Alasannya wajib berupa kalimat, bukan `true`: "tidak perlu" bukan alasan,
  sedangkan "daftarnya tepat di bawah chip ini" bisa dinilai salah oleh
  pembaca berikutnya — dan itulah gunanya.

  `tanpaTujuan` tidak pernah sampai ke DOM: HeaderChip dan RingkasanAngka
  memilih propnya satu per satu, jadi prop ini berhenti di situ.
*/

function berkasJsx(dir, keluar = []) {
  for (const n of readdirSync(dir)) {
    const p = join(dir, n);
    if (statSync(p).isDirectory()) berkasJsx(p, keluar);
    else if (n.endsWith(".jsx")) keluar.push(p);
  }
  return keluar;
}

/** Potong blok seimbang mulai dari kurung `buka` pertama pada/ sesudah `i`. */
function blokSeimbang(s, i, buka, tutup) {
  const mulai = s.indexOf(buka, i);
  if (mulai < 0) return null;
  let d = 0;
  for (let j = mulai; j < s.length; j++) {
    if (s[j] === buka) d++;
    else if (s[j] === tutup) {
      d--;
      if (d === 0) return { teks: s.slice(mulai, j + 1), mulai, akhir: j };
    }
  }
  return null;
}

/* ── 1. Rute yang sah, beserta pengalihannya ───────────────────────────── */

const app = readFileSync("src/App.jsx", "utf8");
const rute = new Set();
const alih = new Map(); // "/payroll" -> "/rekap-poin-gaji?tab=bonus"

for (const m of app.matchAll(/<Route\s+path="([^"]+)"\s+element=\{([^}]*)\}/g)) {
  const [, path, el] = m;
  rute.add(path);
  const nav = el.match(/<Navigate\s+to="([^"]+)"/);
  if (nav) alih.set(path, nav[1]);
}
// Rute dengan parameter (`/breeding/:id`) dicocokkan sebagai pola.
const polaRute = [...rute].filter((r) => r.includes(":"));

function ruteAda(path) {
  if (rute.has(path)) return true;
  return polaRute.some((pola) => {
    const re = new RegExp("^" + pola.replace(/:[^/]+/g, "[^/]+") + "$");
    return re.test(path);
  });
}

/* ── 2. Tab yang diterima tiap halaman ─────────────────────────────────── */

/**
 * Tiap halaman bertab menyatakan tab sahnya dalam satu baris `TAB_SAH`, dan
 * baris itulah yang DIPAKAI halaman untuk memutuskan. Jadi penjaga ini
 * membaca sumber kebenaran yang sama dengan yang dijalankan, bukan salinan
 * kedua yang bisa berselisih diam-diam.
 */
function tabSah(filePath) {
  let s;
  try { s = readFileSync(filePath, "utf8"); } catch { return null; }
  const m = s.match(/TAB_SAH\s*=\s*\[([^\]]*)\]/);
  if (!m) return null;
  return [...m[1].matchAll(/"([^"]+)"/g)].map((x) => x[1]);
}

/** Dari path rute ke berkas halamannya, lewat import di App.jsx. */
function berkasHalaman(path) {
  const m = app.match(
    new RegExp(`<Route\\s+path="${path.replace(/[/\-]/g, "\\$&")}"\\s+element=\\{<(\\w+)`),
  );
  if (!m) return null;
  const imp = app.match(new RegExp(`import\\s+${m[1]}\\s+from\\s+['"]([^'"]+)['"]`));
  if (!imp) return null;
  return imp[1].replace(/^@\//, "src/") + ".jsx";
}

/* ── 3. Kumpulkan setiap angka ringkasan ───────────────────────────────── */

const semua = [];
for (const p of berkasJsx(AKAR)) {
  const s = readFileSync(p, "utf8");
  const pemicu = /chips=\{\[|ubin=\{|const\s+\w*[Cc]hips\w*\s*=\s*\[|const\s+ubin\w*\s*=\s*\[/g;
  for (const m of s.matchAll(pemicu)) {
    const blok = blokSeimbang(s, m.index, "[", "]");
    if (!blok) continue;
    let d = 0, mulai = null;
    for (let k = 0; k < blok.teks.length; k++) {
      const ch = blok.teks[k];
      if (ch === "{") { if (d === 0) mulai = k; d++; }
      else if (ch === "}") {
        d--;
        if (d === 0 && mulai !== null) {
          const obj = blok.teks.slice(mulai, k + 1);
          const lab = obj.match(/label:\s*(?:"([^"]*)"|`([^`]*)`|([^,\n]+))/);
          const nama = (lab ? (lab[1] ?? lab[2] ?? lab[3]) : "?").trim().slice(0, 50);
          const ke = obj.match(/\bke:\s*"([^"]+)"/);
          const keDinamis = /\bke:\s*[^",\s}]/.test(obj);
          const klik = /\bon(Click|Klik):\s*[^,\s}]/.test(obj);
          const alasan = obj.match(/\btanpaTujuan:\s*"([^"]*)"/);
          semua.push({
            berkas: p, nama, ke: ke ? ke[1] : null, keDinamis, klik,
            alasan: alasan ? alasan[1].trim() : null,
            // `tanpaTujuan: true` / `tanpaTujuan: {...}` — ditulis tanpa alasan.
            alasanKosong: !alasan && /\btanpaTujuan:/.test(obj),
          });
          mulai = null;
        }
      }
    }
  }
}

/* ── 4. Periksa ────────────────────────────────────────────────────────── */

const galat = [];

for (const u of semua) {
  if (u.alasanKosong || (u.alasan !== null && u.alasan.length < 12)) {
    galat.push(
      `${u.berkas}\n    angka "${u.nama}" memakai tanpaTujuan tanpa alasan yang bisa dibaca — ` +
      `tulis kenapa angka ini tidak menuju ke mana pun`,
    );
    continue;
  }
  if (!u.ke && !u.keDinamis && !u.klik) {
    if (!u.alasan) {
      galat.push(
        `${u.berkas}\n    angka "${u.nama}" tidak bisa diklik — beri ke:, onClick, ` +
        `atau tanpaTujuan: "<alasan>"`,
      );
    }
    continue;
  }
  if (!u.ke) continue; // tujuan dinamis / onClick: tidak bisa diperiksa statis

  if (u.ke.startsWith("#")) {
    const id = u.ke.slice(1);
    // Jangkar dicari di SELURUH src: beranda menaruh jangkarnya di komponen
    // bagian, bukan di berkas yang menulis ubinnya.
    const ketemu = berkasJsx(AKAR).some((f) => readFileSync(f, "utf8").includes(`id="${id}"`));
    if (!ketemu) galat.push(`${u.berkas}\n    angka "${u.nama}" menuju jangkar #${id} yang tidak ada di mana pun`);
    continue;
  }

  const [path, kueri] = u.ke.split("?");
  if (!ruteAda(path)) {
    galat.push(`${u.berkas}\n    angka "${u.nama}" menuju ${path} — rute itu tidak ada`);
    continue;
  }
  periksaTab(u.ke, `${u.berkas}\n    angka "${u.nama}"`, galat);
  void kueri;
}

/**
 * Tab yang dikirim harus diterima halaman tujuannya.
 *
 * Mengikuti pengalihan: `/payroll` adalah <Navigate> ke
 * `/rekap-poin-gaji?tab=bonus`, dan yang menentukan sah atau tidak adalah
 * TAB_SAH di halaman AKHIR, bukan di persinggahan.
 */
function periksaTab(tujuan, sebut, keluar) {
  let [path, kueri] = tujuan.split("?");
  let lompat = 0;
  while (alih.has(path) && lompat++ < 5) {
    /*
      Pengalihan MEMBUANG kueri yang datang.

      `<Navigate to="/x?tab=a">` menulis ulang seluruh alamat; bagian
      `?tab=` milik penautnya tidak ikut. Jadi tautan yang mengirim tab ke
      rute yang mengalihkan selalu mendarat di tab lain — dan karena tab
      lain itu sah, tidak ada yang terlihat rusak.

      Red test 11 Okt 2026 menemukan penjaga ini buta persis di situ: ia
      ikut MEMAKAI tab milik pengalihan, jadi `?tab=ngawur` ke /payroll
      lolos. Sekarang kueri penautnya dilaporkan hilang, bukan ditimpa.
    */
    if (kueri && new URLSearchParams(kueri).get("tab")) {
      keluar.push(
        `${sebut} mengirim ?${kueri} ke ${path}, tetapi ${path} adalah pengalihan ke ` +
        `${alih.get(path)} — kueri penautnya dibuang, jadi tab itu tidak pernah sampai. ` +
        `Tuju halaman akhirnya langsung.`,
      );
      return;
    }
    const berikut = alih.get(path);
    const [p2, k2] = berikut.split("?");
    path = p2;
    kueri = k2 || null;
  }
  if (!kueri) return;
  const tab = new URLSearchParams(kueri).get("tab");
  if (!tab) return;
  const f = berkasHalaman(path);
  if (!f) return;
  const sah = tabSah(f);
  if (!sah) return;
  if (!sah.includes(tab)) {
    keluar.push(`${sebut} mengirim ?tab=${tab} ke ${path}, tetapi tab sahnya hanya ${sah.join(", ")}`);
  }
}

/* ── 5. Pengalihan di App.jsx diperiksa dengan aturan yang sama ─────────── */

for (const [dari, ke] of alih) {
  const [path] = ke.split("?");
  if (!ruteAda(path)) {
    galat.push(`src/App.jsx\n    pengalihan ${dari} → ${path} — rute tujuan tidak ada`);
    continue;
  }
  periksaTab(ke, `src/App.jsx\n    pengalihan ${dari} →`, galat);
}

/* ── 6. SETIAP tautan, bukan hanya angka ringkasan ─────────────────────── */

/*
  Bagian 1–5 hanya melihat objek chip/ubin. Tetapi tombol "Approve" yang
  menuju "/" di dasbor Admin adalah <Link> BIASA, dan ia lolos — ditemukan
  11 Okt 2026 dengan mata, bukan oleh penjaga ini.

  Sapuan di bawah menutup jarak itu: setiap `to="/…"` dan `navigate("/…")`
  di seluruh src diperiksa dengan aturan yang sama. Pada sapuan pertama ia
  menemukan dua lagi yang tidak terlihat dari layar mana pun:

    · `/kandang` di layar Kebersihan Kandang — rute yang tidak pernah ada.
      Tombolnya hanya muncul saat daftar kandang KOSONG, yaitu persis saat
      orang paling butuh ia bekerja.
    · `Buka Panduan Lengkap` di dasbor Kepala Feeder, menuju "/".

  Tautan dinamis (`to={`/breeding/${id}`}`) dilewati: tujuannya baru ada
  saat dijalankan. Yang diperiksa hanya yang tertulis utuh.
*/

const TAUTAN = /(?:<Link\s[^>]*?\bto=|\bnavigate\()\s*["'`](\/[^"'`${}\s>]*)["'`]/g;

/**
 * Komponen di src/components/dashboard/ hanya tergambar di beranda, yaitu
 * rute "/". Jadi `to="/"` di sana selalu mengembalikan orang ke layar yang
 * sedang dibukanya — tidak ada keadaan di mana itu yang dimaksud.
 *
 * Di luar folder itu `to="/"` sah dan banyak dipakai: logo di bilah samping,
 * dan tombol "Kembali" di halaman penuh seperti Riwayat Kluster.
 */
const HANYA_DI_BERANDA = "src/components/dashboard/";

let tautanDisapu = 0;

for (const f of berkasJsx(AKAR)) {
  const s2 = readFileSync(f, "utf8");
  for (const m of s2.matchAll(TAUTAN)) {
    const tujuan = m[1];
    const baris = s2.slice(0, m.index).split("\n").length;
    const sebut = `${f}:${baris}`;

    if (tujuan === "/") {
      if (f.startsWith(HANYA_DI_BERANDA)) {
        galat.push(
          `${sebut}\n    tautan menuju "/" dari dalam beranda itu sendiri — ` +
          `menekannya mengembalikan orang ke layar yang sedang dibuka`,
        );
      }
      continue;
    }

    tautanDisapu++;
    const [path] = tujuan.split("?");
    if (!ruteAda(path)) {
      galat.push(`${sebut}\n    tautan menuju ${path} — rute itu tidak ada`);
      continue;
    }
    periksaTab(tujuan, `${sebut}\n    tautan`, galat);
  }
}

/* ── Laporan ───────────────────────────────────────────────────────────── */

const bisaDiklik = semua.filter((u) => u.ke || u.keDinamis || u.klik).length;
const beralasan = semua.filter((u) => !u.ke && !u.keDinamis && !u.klik && u.alasan).length;

if (galat.length) {
  console.error(`\nTautan bermasalah (${galat.length}):\n`);
  for (const g of galat) console.error(`  ${g}\n`);
  console.error(
    `Angka ringkasan yang tidak bisa diklik hanya memindahkan pekerjaan ke\n` +
    `orang yang membacanya, dan yang mendarat di tab yang salah lebih buruk\n` +
    `lagi: tidak ada yang terlihat rusak.\n`,
  );
  process.exit(1);
}

console.log(
  `Angka ringkasan: ${bisaDiklik}/${semua.length} bisa diklik, ${beralasan} menuliskan ` +
  `alasannya tidak. Tautan: ${tautanDisapu} tertulis utuh + ${alih.size} pengalihan — ` +
  `semuanya menuju rute yang ada, dan setiap ?tab= diterima halaman tujuannya.`,
);

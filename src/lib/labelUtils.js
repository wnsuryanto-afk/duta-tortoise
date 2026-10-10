/**
 * labelUtils.js — label kotak telur yang diunduh dari formulir clutch.
 *
 * ── Ukuran cetaknya, dan kenapa ia sempat tidak bisa diatur ────────────────
 *
 * 5 Okt 2026 pemiliknya mengeluh labelnya terlalu besar. Jawabannya waktu itu
 * adalah penggambar BARU — `components/breeding/labelRingkas.js` dengan pilihan
 * 50 × 30 mm, dan `scripts/cek-label.mjs` yang menjaganya. Tetapi tombol
 * "Download Label (PNG)" di formulir clutch tidak pernah ikut dipindahkan, dan
 * tombol itulah yang ditekan kiper tiap kali mencatat clutch baru. Jadi
 * keluhan yang sama datang lagi 10 Okt 2026, dengan foto label yang masih
 * digambar dari berkas ini.
 *
 * Diukur: 384 × 228 piksel CSS, digambar `scale: 3` → PNG 1.152 × 683 piksel.
 * Pada 300 DPI itu 98 × 58 mm — sekelas ukuran yang `lib/lembarLabel.js` sendiri
 * namai "Besar — menutupi hampir seluruh sisi kotak". Itu persis yang
 * dikeluhkan: labelnya menutupi telurnya, jadi saat menetas tidak ada yang
 * kelihatan.
 *
 * Yang membuatnya tidak bisa dibetulkan dengan sekadar mengurangi piksel: PNG
 * yang lama tidak menyatakan ukuran fisiknya sama sekali, sehingga yang keluar
 * dari printer ditentukan aplikasi pencetaknya. Penjelasannya ada di
 * `lib/dpiPng.js`; sejak berkas itu dipakai, UKURAN_CETAK_MM di bawah adalah
 * ukuran yang benar-benar keluar dari printer.
 *
 * ── Satu tingkat, bukan satu lompatan ──────────────────────────────────────
 *
 * Yang diminta 10 Okt 2026 adalah "turunkan satu ukuran saja". 98 → 80 mm
 * adalah satu tingkat: lebarnya 82%, luasnya 62%. Tata letaknya tidak diubah
 * sedikit pun — yang berubah hanya berapa piksel yang digambar untuk milimeter
 * yang diminta, jadi tidak ada huruf yang bisa pindah atau terpotong.
 *
 * Kalau masih terlalu besar, satu angka di bawah ini yang diubah — dan 65 mm
 * adalah tingkat berikutnya. Di bawah itu label ini memang tidak akan terbaca;
 * yang dipakai lalu seharusnya lembar 50 × 30 mm di daftar clutch.
 */

// ── Label Kotak Telur utilities ──────────────────────────────────────────

import { setelDpiPng } from "@/lib/dpiPng";

/**
 * Ketajaman cetaknya. Angka ini TIDAK mengubah ukuran label — ukurannya
 * dinyatakan dalam milimeter di bawah, dan jumlah pikselnya dihitung dari
 * keduanya. Menaikkannya hanya membuat hurufnya lebih tajam dan berkasnya
 * lebih besar.
 */
export const DPI_CETAK = 300;

/** Lebar label di kertas. Tingginya mengikuti tata letaknya, ±47 mm. */
export const LEBAR_CETAK_MM = 80;

/**
 * Berapa kali html2canvas harus memperbesar label supaya lebarnya jadi
 * `lebarMm` pada `dpi`.
 *
 * Dipisah jadi fungsi sendiri supaya `scripts/cek-label.mjs` bisa memeriksa
 * hitungannya tanpa menjalankan seluruh unduhan.
 */
export function skalaCetak(lebarCssPx, lebarMm = LEBAR_CETAK_MM, dpi = DPI_CETAK) {
  return (lebarMm * dpi) / 25.4 / lebarCssPx;
}

export function generateKodeLabel(maleCode, femaleCode, tgl) {
  if (!maleCode || !femaleCode || !tgl) return "";
  const d = new Date(tgl);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yy = String(d.getFullYear()).slice(2);
  return `K-${dd}${mm}${yy}-${maleCode}-${femaleCode}`;
}

export function buildLabelHTML({ maleCode, femaleCode, maleEnclosure, femaleEnclosure, tglBertelur, eggCount, inkubatorName, kode, qrDataUrl }) {
  const d = new Date(tglBertelur);
  const tglStr = d.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
  const hatchD = new Date(d.getTime() + 90 * 86400000);
  const hatch = hatchD.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
  const qrImg = qrDataUrl ? `<img src="${qrDataUrl}" width="78" height="78" style="display:block" />` : "";
  return `
<div style="width:380px;-webkit-text-size-adjust:100%;text-size-adjust:100%;font-family:'Segoe UI',Arial,sans-serif;background:linear-gradient(135deg,#f0fdf4,#fefce8);border-radius:14px;border:2px solid #16a34a;overflow:hidden">
  <div style="background:linear-gradient(90deg,#15803d,#16a34a,#22c55e);padding:9px 13px;display:flex;align-items:center;gap:9px">
    <div style="font-size:26px;line-height:1.2">🐢</div>
    <div style="flex:1">
      <div style="font-weight:800;font-size:14px;color:#fff;letter-spacing:.5px">DUTA TORTOISE</div>
      <div style="font-size:8px;color:#bbf7d0;margin-top:1px">Sulcata Breeding Farm · Probolinggo</div>
    </div>
    <div style="text-align:right">
      <div style="background:rgba(255,255,255,.2);border-radius:20px;padding:2px 9px;font-size:7px;color:#fff;font-weight:bold">📦 ${inkubatorName || "—"}</div>
      <div style="font-size:7px;color:#d1fae5;margin-top:3px">${tglStr}</div>
    </div>
  </div>
  <div style="background:#fef08a;border-bottom:1.5px dashed #ca8a04;padding:4px 13px;display:flex;align-items:center;justify-content:space-between">
    <div style="font-size:7px;color:#78350f;font-weight:600">🔖 KODE KOPLING</div>
    <div style="font-weight:800;font-size:11px;color:#78350f;letter-spacing:.5px">${kode}</div>
  </div>
  <div style="display:flex;padding:9px 13px;gap:9px;align-items:flex-start">
    <div style="flex:1">
      <div style="display:flex;gap:5px;margin-bottom:7px">
        <div style="flex:1;background:linear-gradient(135deg,#dbeafe,#eff6ff);border-radius:9px;padding:5px 7px;border:1.5px solid #93c5fd">
          <div style="font-size:7px;color:#1d4ed8;font-weight:700;text-transform:uppercase">♂ Jantan</div>
          <div style="font-size:18px;font-weight:900;color:#1e3a8a;line-height:1.1">${maleCode || "—"}</div>
          <div style="font-size:7px;color:#3b82f6">📍 ${maleEnclosure || "—"}</div>
        </div>
        <div style="display:flex;align-items:center;font-size:13px">💕</div>
        <div style="flex:1;background:linear-gradient(135deg,#fce7f3,#fff1f2);border-radius:9px;padding:5px 7px;border:1.5px solid #f9a8d4">
          <div style="font-size:7px;color:#be123c;font-weight:700;text-transform:uppercase">♀ Betina</div>
          <div style="font-size:18px;font-weight:900;color:#881337;line-height:1.1">${femaleCode || "—"}</div>
          <div style="font-size:7px;color:#f43f5e">📍 ${femaleEnclosure || "—"}</div>
        </div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:3px">
        <div style="background:#fef9c3;border-radius:6px;padding:3px 5px"><div style="font-size:6px;color:#94a3b8">🥚 Jumlah Telur</div><div style="font-size:8px;font-weight:700;color:#713f12">${eggCount ? eggCount + " butir" : "—"}</div></div>
        <div style="background:#f0fdf4;border-radius:6px;padding:3px 5px"><div style="font-size:6px;color:#94a3b8">📅 Tgl Bertelur</div><div style="font-size:8px;font-weight:700;color:#14532d">${tglStr}</div></div>
        <div style="background:#fff7ed;border-radius:6px;padding:3px 5px"><div style="font-size:6px;color:#94a3b8">🐣 Est. Menetas</div><div style="font-size:8px;font-weight:700;color:#7c2d12">${hatch}</div></div>
        <div style="background:#f0f9ff;border-radius:6px;padding:3px 5px"><div style="font-size:6px;color:#94a3b8">🌡 Status</div><div style="font-size:8px;font-weight:700;color:#0c4a6e">Inkubasi 🔄</div></div>
      </div>
    </div>
    <div style="display:flex;flex-direction:column;align-items:center;gap:4px;flex-shrink:0">
      <div style="background:#fff;border-radius:9px;padding:4px;border:2px solid #16a34a">${qrImg}</div>
      <div style="background:#15803d;color:#fff;border-radius:20px;padding:2px 7px;font-size:7px;font-weight:700">F2 · Captive-bred</div>
      <div style="font-size:6px;color:#6b7280;text-align:center;line-height:1.3">Scan untuk<br>info kura</div>
    </div>
  </div>
  <div style="background:linear-gradient(90deg,#15803d,#16a34a);padding:4px 13px;display:flex;justify-content:space-between;align-items:center">
    <div style="font-size:7px;color:#bbf7d0">🌿 Sulcata geochelone sulcata</div>
    <div style="font-size:7px;color:#bbf7d0">dutatortoises.com</div>
  </div>
</div>`;
}

export async function downloadLabel({ maleCode, femaleCode, maleEnclosure, femaleEnclosure, tglBertelur, eggCount, inkubatorName, lebarMm = LEBAR_CETAK_MM }) {
  let container = null;
  try {
    const kode = generateKodeLabel(maleCode, femaleCode, tglBertelur);
    if (!kode) return { ok: false, pesan: "Lengkapi jantan, betina, dan tanggal bertelur dulu." };
    const QRCode = await import("qrcode");
    const qrDataUrl = await new Promise((res, rej) => {
      QRCode.toDataURL(kode, { width: 200, margin: 2, color: { dark: "#166534", light: "#ffffff" } },
        (err, url) => err ? rej(err) : res(url));
    });
    const html = buildLabelHTML({ maleCode, femaleCode, maleEnclosure, femaleEnclosure, tglBertelur, eggCount, inkubatorName, kode, qrDataUrl });
    container = document.createElement("div");
    container.style.cssText = "position:fixed;left:-9999px;top:0;z-index:-1;";
    container.innerHTML = html;
    document.body.appendChild(container);
    const el = container.firstElementChild;

    // Skalanya DIHITUNG dari lebar yang benar-benar terukur, bukan dari angka
    // 380 yang ditulis di tata letaknya. Border, padding, dan huruf pengganti
    // di perangkat lain membuat keduanya berbeda — dan kalau skalanya dipatok,
    // selisih itu langsung jadi selisih milimeter di kertas.
    const lebarCss = el.getBoundingClientRect().width;
    if (!lebarCss) throw new Error("label tidak terukur di layar");
    const skala = skalaCetak(lebarCss, lebarMm, DPI_CETAK);

    const h2c = await import("html2canvas");
    const canvas = await h2c.default(el, { scale: skala, useCORS: true, backgroundColor: null, logging: false });

    const blob = await new Promise((res, rej) => canvas.toBlob(
      (b) => (b ? res(b) : rej(new Error("kanvas gagal diubah jadi PNG"))), "image/png"));
    // Tanpa baris ini jumlah piksel di atas tidak berarti apa-apa: lihat
    // lib/dpiPng.js.
    const bytes = setelDpiPng(new Uint8Array(await blob.arrayBuffer()), DPI_CETAK);
    const url = URL.createObjectURL(new Blob([bytes], { type: "image/png" }));
    const link = document.createElement("a");
    link.download = `Label-${kode}.png`;
    link.href = url;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 10000);

    const tinggiMm = Math.round((canvas.height / DPI_CETAK) * 25.4);
    return { ok: true, nama: link.download, lebarMm: Math.round(lebarMm), tinggiMm };
  } catch (e) {
    // Dikembalikan, bukan cuma dicatat di console: tombol yang tidak
    // menghasilkan apa-apa tanpa memberi tahu akan ditekan berkali-kali, dan
    // yang menekannya menyimpulkan labelnya memang tidak bisa diunduh.
    console.error("Label download error:", e);
    return { ok: false, pesan: e?.message || String(e) };
  } finally {
    if (container && container.parentNode) document.body.removeChild(container);
  }
}

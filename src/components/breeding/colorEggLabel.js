import QRCode from "qrcode";
import { daftarTray } from "@/lib/trayTelur";
import { labelRingkasHTML, gayaBaris, PALET_WARNA } from "@/components/breeding/labelRingkas";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";

/*
 * Badge "F1 · Captive-bred" dicabut dari label 4 Okt 2026 — di depan rak
 * inkubator tidak ada yang membacanya, dan layar yang dibuka QR sudah
 * menampilkannya. Fungsi computeGeneration() yang menghitungnya dari silsilah
 * ikut dibuang karena tidak ada pemanggil lain; aturannya — pencarian induk
 * HARUS lewat petaKura/cariInduk di lib/silsilah, bukan Map buatan sendiri,
 * karena ada kura yang namanya tersimpan dengan spasi di belakang ("B116 ")
 * — tetap berlaku dan tertulis di berkas itu.
 *
 * Catatan terpisah: src/lib/labelUtils.js masih mencetak "F2 · Captive-bred"
 * sebagai TULISAN MATI, bukan nilai yang dihitung. Itu label lain dan belum
 * diperbaiki.
 */

// ── Ikon SVG berwarna (garis), tanpa emoji ──
function ico(type, c, size = 16) {
  const s = `stroke="${c}"`;
  const w = size;
  if (type === "turtle") return `<svg width="${w}" height="${w}" viewBox="0 0 24 24" fill="none" ${s} stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><ellipse cx="12" cy="13" rx="7" ry="5"/><path d="M12 8V6"/><circle cx="12" cy="5" r="1.6"/><path d="M5 13l-2-1M19 13l2-1M6 17l-2 2M18 17l2 2"/></svg>`;
  if (type === "box") return `<svg width="${w}" height="${w}" viewBox="0 0 24 24" fill="none" ${s} stroke-width="1.8" stroke-linejoin="round"><rect x="4" y="4" width="16" height="16" rx="1"/><path d="M4 9h16M9 4v16"/></svg>`;
  if (type === "egg") return `<svg width="${w}" height="${w}" viewBox="0 0 24 24" fill="none" ${s} stroke-width="1.8"><ellipse cx="12" cy="12" rx="7.5" ry="9"/></svg>`;
  if (type === "cal") return `<svg width="${w}" height="${w}" viewBox="0 0 24 24" fill="none" ${s} stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="17" rx="1"/><path d="M3 9h18M8 2v4M16 2v4"/></svg>`;
  if (type === "pin") return `<svg width="${w}" height="${w}" viewBox="0 0 24 24" fill="none" ${s} stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21s7-6.5 7-11a7 7 0 0 0-14 0c0 4.5 7 11 7 11z"/><circle cx="12" cy="10" r="2.5"/></svg>`;
  if (type === "therm") return `<svg width="${w}" height="${w}" viewBox="0 0 24 24" fill="none" ${s} stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14 14V5a2 2 0 0 0-4 0v9a4 4 0 1 0 4 0z"/><path d="M12 9v5"/></svg>`;
  if (type === "heart") return `<svg width="${w}" height="${w}" viewBox="0 0 24 24" fill="none" ${s} stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21s-7-4.5-7-10a4 4 0 0 1 7-2 4 4 0 0 1 7 2c0 5.5-7 10-7 10z"/></svg>`;
  if (type === "mars") return `<svg width="${w}" height="${w}" viewBox="0 0 24 24" fill="none" ${s} stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="10" cy="14" r="5"/><path d="M14 10l5-5M14 5h5v5"/></svg>`;
  if (type === "venus") return `<svg width="${w}" height="${w}" viewBox="0 0 24 24" fill="none" ${s} stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="9" r="5"/><path d="M12 14v6M9 17h6"/></svg>`;
  if (type === "alert") return `<svg width="${w}" height="${w}" viewBox="0 0 24 24" fill="none" ${s} stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l9 16H3z"/><path d="M12 9v5M12 17h.01"/></svg>`;
  return "";
}

const DPI = 300;
const P = (mm) => Math.round((mm * DPI) / 25.4);

export async function renderColorLabelHTML(breeding, sizeDef) {
  const wPx = P(sizeDef.w), hPx = P(sizeDef.h);
  const qrText = `BREED:${breeding.id}`;
  const qrDataUrl = await QRCode.toDataURL(qrText, { width: 400, margin: 1, color: { dark: "#000000", light: "#ffffff" } });

  const d = breeding.egg_laying_date ? new Date(breeding.egg_laying_date) : null;
  const tglShort = d ? format(d, "d MMM yyyy", { locale: idLocale }) : "—";
  const hs = breeding.estimated_hatch_start ? new Date(breeding.estimated_hatch_start) : null;
  const he = breeding.estimated_hatch_end ? new Date(breeding.estimated_hatch_end) : null;
  const cd = (function () { const x = new Date(breeding.egg_laying_date); if (!breeding.egg_laying_date) return null; x.setDate(x.getDate() + 30); return x; })();
  const cdStr = cd ? format(cd, "d MMMM yyyy", { locale: idLocale }) : "—";
  const late = cd && cd < new Date() && !breeding.candling_day_30_done;
  const maleName = breeding.male_name || "—";
  const femaleName = breeding.female_name || "—";
  const eggNum = `${breeding.egg_count || 0}`;

  // Versi ringkas: tata letaknya milik bersama dengan label termal — alasan
  // tiap pembuangan dan pembesaran tertulis di components/breeding/labelRingkas.js.
  if (!sizeDef.full) {
    return labelRingkasHTML(breeding, { wPx, hPx }, qrDataUrl, PALET_WARNA);
  }

  // ── Versi penuh (100×50) ────────────────────────────────────────────────
  //
  // Pembuangan dan pembesaran yang sama dengan versi ringkas di atas berlaku di
  // sini — alasannya tertulis lengkap di sana dan tidak diulang. Yang berbeda
  // hanya akibat ruangnya: nama induk muat dalam kotak sendiri, dan tanggal
  // menetas bisa dicetak jauh lebih besar lagi.
  const qrPx = 150;

  const trayFull = daftarTray(breeding);
  const adaTrayFull = trayFull.length > 0;
  const trayTeksFull = adaTrayFull ? trayFull.join(" · ") : "?";

  const kepala = `<div style="background:linear-gradient(90deg,#1B4332,#2D6A4F);padding:10px 16px;display:flex;align-items:center;gap:14px;flex-shrink:0">
    <div style="flex:1;display:flex;align-items:center;gap:11px">${ico("turtle", "#D8F3DC", 26)}
      <div style="font-weight:800;color:#fff;letter-spacing:1px;${gayaBaris(26)}">DUTA TORTOISE</div>
    </div>
    <div style="color:#D8F3DC;${gayaBaris(13)}">bertelur ${tglShort}</div>
    <div style="background:${adaTrayFull ? "#fff" : "#DC2626"};border-radius:9px;padding:4px 13px;text-align:center;line-height:1;flex-shrink:0">
      <div style="font-weight:800;letter-spacing:1.5px;color:${adaTrayFull ? "#14532D" : "#fff"};${gayaBaris(11)}">TRAY</div>
      <div style="font-weight:900;color:${adaTrayFull ? "#14532D" : "#fff"};${gayaBaris(22)}">${trayTeksFull}</div>
    </div>
  </div>`;

  const induk = `<div style="display:flex;align-items:stretch;gap:9px;padding:0 16px;flex-shrink:0">
    <div style="flex:1;background:#DBEAFE;border:1.5px solid #3B82F6;border-radius:11px;padding:7px 12px;min-width:0">
      <div style="display:flex;align-items:center;gap:5px;font-weight:800;color:#1D4ED8;letter-spacing:1px;${gayaBaris(11)}">${ico("mars", "#1D4ED8", 14)} JANTAN</div>
      <div style="font-weight:900;color:#1E3A8A;${gayaBaris(42)}">${maleName}</div>
    </div>
    <div style="display:flex;align-items:center;flex-shrink:0">${ico("heart", "#E11D48", 18)}</div>
    <div style="flex:1;background:#FCE7F3;border:1.5px solid #EC4899;border-radius:11px;padding:7px 12px;min-width:0">
      <div style="display:flex;align-items:center;gap:5px;font-weight:800;color:#BE185D;letter-spacing:1px;${gayaBaris(11)}">${ico("venus", "#BE185D", 14)} BETINA</div>
      <div style="font-weight:900;color:#831843;${gayaBaris(42)}">${femaleName}</div>
    </div>
  </div>`;

  const menetas = `<div style="display:flex;align-items:center;gap:12px;padding:0 16px;flex-shrink:0;min-width:0">
    <div style="flex:1;min-width:0">
      <div style="font-weight:800;letter-spacing:1.5px;color:#2D6A4F;${gayaBaris(15)}">PERKIRAAN MENETAS</div>
      <div style="font-weight:900;color:#14532D;${gayaBaris(64)}">${hs ? format(hs, "d MMM yyyy", { locale: idLocale }) : "—"}</div>
      ${he ? `<div style="font-weight:700;color:#40916C;${gayaBaris(28)}">s/d ${format(he, "d MMM yyyy", { locale: idLocale })}</div>` : ""}
    </div>
    <div style="border:2px solid #166534;background:#DCFCE7;border-radius:11px;padding:7px 14px;text-align:center;flex-shrink:0">
      <div style="font-weight:900;color:#14532D;${gayaBaris(46)}">${eggNum}</div>
      <div style="font-weight:800;letter-spacing:1.5px;color:#14532D;${gayaBaris(11)}">BUTIR</div>
    </div>
  </div>`;

  const candling = `<div style="margin:0 16px;background:${late ? "#FEE2E2" : "#FEF3C7"};border:2.5px solid ${late ? "#DC2626" : "#B45309"};border-radius:11px;padding:8px 12px;flex-shrink:0">
    <div style="display:flex;align-items:center;gap:12px">
      <div style="flex:1;min-width:0">
        <div style="display:flex;align-items:center;gap:6px"><span style="font-weight:800;color:${late ? "#991B1B" : "#78350F"};letter-spacing:0.8px;display:inline-block;${gayaBaris(13)}">CANDLING HARI KE-30</span>${late ? ico("alert", "#DC2626", 15) : ""}</div>
        <div style="font-weight:900;color:${late ? "#991B1B" : "#1F2937"};${gayaBaris(32)}">${cdStr}${late ? " · TERLAMBAT" : ""}</div>
      </div>
      <div style="width:34px;height:34px;border:2.5px solid ${late ? "#DC2626" : "#1F2937"};background:#fff;border-radius:5px;flex-shrink:0"></div>
    </div>
  </div>`;

  const qrCol = `<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;padding:10px;flex-shrink:0;border-left:1px solid #B7E4C7;background:#F8FAF9">
    <img src="${qrDataUrl}" width="${qrPx}" height="${qrPx}" style="display:block"/>
  </div>`;

  const body = `<div style="flex:1 1 auto;display:flex;flex-direction:row;min-height:0">
    <div style="flex:1 1 auto;display:flex;flex-direction:column;justify-content:space-evenly;padding:6px 0;min-width:0">${induk}${menetas}${candling}</div>
    ${qrCol}
  </div>`;

  return `<div style="width:${wPx}px;height:${hPx}px;background:#fff;font-family:Arial, Helvetica, sans-serif;border:2px solid #2D6A4F;border-radius:12px;padding:0;box-sizing:border-box;display:flex;overflow:hidden">
    <div style="flex:1 1 auto;display:flex;flex-direction:column;overflow:hidden">${kepala}${body}</div>
  </div>`;
}

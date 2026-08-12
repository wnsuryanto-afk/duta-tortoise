import QRCode from "qrcode";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";

// ── Generasi otomatis dari silsilah (parent_male/parent_female) ──
// Foundation (tanpa induk tercatat) = 0; anak = 1 + max(gen induk).
export function computeGeneration(breeding, tortoises = []) {
  if (!tortoises || !tortoises.length) return "F1 · Captive-bred";
  const byKey = new Map();
  for (const t of tortoises) {
    if (t?.id) byKey.set(String(t.id), t);
    if (t?.code) byKey.set(String(t.code), t);
    if (t?.name) byKey.set(String(t.name), t);
  }
  const findT = (id, name) => {
    if (id && byKey.has(String(id))) return byKey.get(String(id));
    if (name && byKey.has(String(name))) return byKey.get(String(name));
    return null;
  };
  const memo = new Map();
  function genOf(t, depth) {
    if (!t || depth > 6) return 0;
    const key = t.id || t.code || t.name;
    if (memo.has(key)) return memo.get(key);
    memo.set(key, 0);
    const pm = t.parent_male ? byKey.get(String(t.parent_male)) : null;
    const pf = t.parent_female ? byKey.get(String(t.parent_female)) : null;
    let g = 0;
    if (pm || pf) g = 1 + Math.max(genOf(pm, depth + 1), genOf(pf, depth + 1));
    memo.set(key, g);
    return g;
  }
  const male = findT(breeding?.male_id, breeding?.male_name);
  const female = findT(breeding?.female_id, breeding?.female_name);
  const clutch = 1 + Math.max(genOf(male, 0), genOf(female, 0));
  return `F${clutch} · Captive-bred`;
}

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

function dotted(c, wpx) {
  return `<span style="display:inline-block;border-bottom:1.5px dotted ${c};width:${wpx}px;height:1em;vertical-align:bottom">&nbsp;</span>`;
}

export async function renderColorLabelHTML(breeding, sizeDef, tortoises = []) {
  const wPx = P(sizeDef.w), hPx = P(sizeDef.h);
  const qrText = `BREED:${breeding.id}`;
  const qrDataUrl = await QRCode.toDataURL(qrText, { width: 400, margin: 1, color: { dark: "#000000", light: "#ffffff" } });

  const d = breeding.egg_laying_date ? new Date(breeding.egg_laying_date) : null;
  const tglShort = d ? format(d, "d MMM yyyy", { locale: idLocale }) : "—";
  const kodeKopl = d ? `K-${format(d, "ddMMyy")}-${breeding.male_name || "?"}-${breeding.female_name || "?"}` : `K-??????-${breeding.male_name || "?"}-${breeding.female_name || "?"}`;
  const hs = breeding.estimated_hatch_start ? new Date(breeding.estimated_hatch_start) : null;
  const he = breeding.estimated_hatch_end ? new Date(breeding.estimated_hatch_end) : null;
  const hatchShort = hs && he ? `${format(hs, "d MMM", { locale: idLocale })} – ${format(he, "d MMM yyyy", { locale: idLocale })}` : "—";
  const cd = (function () { const x = new Date(breeding.egg_laying_date); if (!breeding.egg_laying_date) return null; x.setDate(x.getDate() + 30); return x; })();
  const cdStr = cd ? format(cd, "d MMMM yyyy", { locale: idLocale }) : "—";
  const late = cd && cd < new Date() && !breeding.candling_day_30_done;
  const generation = computeGeneration(breeding, tortoises);
  const maleName = breeding.male_name || "—";
  const femaleName = breeding.female_name || "—";
  const maleEnc = breeding.male_enclosure || "—";
  const femaleEnc = breeding.female_enclosure || "—";
  const eggNum = `${breeding.egg_count || 0}`;
  const incubatorName = breeding.incubator_name || "—";
  const status = breeding.status || "—";

  // ── Versi ringkas (50×30 / 40×30) ──
  if (!sizeDef.full) {
    const sm = sizeDef.id === "40x30";
    const brand = sm ? 15 : 17;
    const sub = sm ? 6 : 7;
    const nameF = sm ? 22 : 26;
    const qrPx = sm ? 128 : 150;
    const cTitle = sm ? 9 : 10;
    const cDate = sm ? 12 : 14;
    const cBox = sm ? 14 : 16;

    const kepala = `<div style="background:linear-gradient(90deg,#1B4332,#2D6A4F);padding:6px 9px;display:flex;align-items:center;gap:8px;flex-shrink:0">
      <div style="flex:1;display:flex;align-items:center;gap:7px">${ico("turtle", "#D8F3DC", 20)}
        <div>
          <div style="font-weight:800;font-size:${brand}px;color:#fff;letter-spacing:0.5px;line-height:1.1">DUTA TORTOISE</div>
          <div style="font-size:${sub}px;color:#D8F3DC;margin-top:1px">Sulcata Breeding Farm · Probolinggo</div>
        </div>
      </div>
      <div style="text-align:right">
        <div style="display:inline-block;background:rgba(255,255,255,.18);border:1px solid rgba(255,255,255,.4);border-radius:99px;padding:2px 8px;font-size:8px;font-weight:700;color:#fff">${incubatorName}</div>
        <div style="font-size:8px;color:#D8F3DC;margin-top:2px">${tglShort}</div>
      </div>
    </div>`;

    const parentRow = `<div style="display:flex;align-items:center;gap:6px;padding:6px 9px">
      <div style="flex:1;min-width:0">
        <div style="font-weight:900;font-size:${nameF}px;color:#1E3A8A;line-height:1.15;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${maleName}</div>
        <div style="font-weight:900;font-size:${nameF}px;color:#831843;line-height:1.15;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${femaleName}</div>
      </div>
      <div style="border:1.5px solid #166534;background:#DCFCE7;border-radius:8px;padding:4px 8px;text-align:center;flex-shrink:0">
        <div style="font-weight:900;font-size:${Math.round(nameF * 0.7)}px;color:#14532D;line-height:1">${eggNum}</div>
        <div style="font-size:7px;font-weight:700;color:#14532D;letter-spacing:0.5px">BUTIR</div>
      </div>
    </div>`;

    const candling = `<div style="margin:0 9px 7px;background:${late ? "#FEE2E2" : "#FEF3C7"};border:2px solid ${late ? "#DC2626" : "#B45309"};border-radius:8px;padding:5px 7px">
      <div style="display:flex;align-items:center;gap:8px">
        <div style="flex:1;min-width:0">
          <div style="font-weight:800;font-size:${cTitle}px;color:${late ? "#991B1B" : "#78350F"};letter-spacing:0.3px">CANDLING H+30</div>
          <div style="font-weight:900;font-size:${cDate}px;color:${late ? "#991B1B" : "#1F2937"};line-height:1.2;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${cdStr}${late ? " · TERLAMBAT" : ""}</div>
        </div>
        <div style="width:${cBox}px;height:${cBox}px;border:2px solid ${late ? "#DC2626" : "#1F2937"};background:#fff;border-radius:3px;flex-shrink:0"></div>
      </div>
    </div>`;

    const qrCol = `<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;padding:6px;flex-shrink:0;border-left:1px solid #2D6A4F;background:#F8FAF9">
      <div style="border:2px solid #2D6A4F;border-radius:10px;padding:4px;background:#fff"><img src="${qrDataUrl}" width="${qrPx}" height="${qrPx}" style="display:block"/></div>
      <div style="background:#1B4332;color:#fff;border-radius:99px;padding:2px 8px;font-size:8px;font-weight:700;margin-top:4px;text-align:center">${generation}</div>
      <div style="font-size:7px;color:#14532D;margin-top:2px;text-align:center">Pindai info kura</div>
    </div>`;

    const body = `<div style="flex:1 1 auto;display:flex;flex-direction:row;min-height:0">
      <div style="flex:1 1 auto;display:flex;flex-direction:column;min-width:0">${parentRow}${candling}</div>
      ${qrCol}
    </div>`;

    return `<div style="width:${wPx}px;height:${hPx}px;background:#fff;border:2px solid #2D6A4F;border-radius:10px;padding:0;box-sizing:border-box;display:flex;overflow:hidden">
      <div style="flex:1 1 auto;display:flex;flex-direction:column;overflow:hidden">${kepala}${body}</div>
    </div>`;
  }

  // ── Versi penuh (100×50) ──
  const qrPx = 188;
  const kepala = `<div style="background:linear-gradient(90deg,#1B4332,#2D6A4F);padding:9px 14px;display:flex;align-items:center;gap:12px;flex-shrink:0">
    <div style="flex:1;display:flex;align-items:center;gap:11px">${ico("turtle", "#D8F3DC", 26)}
      <div>
        <div style="font-weight:800;font-size:24px;color:#fff;letter-spacing:1px;line-height:1.1">DUTA TORTOISE</div>
        <div style="font-size:10px;color:#D8F3DC;margin-top:2px">Sulcata Breeding Farm · Probolinggo</div>
      </div>
    </div>
    <div style="text-align:right">
      <div style="display:inline-block;background:rgba(255,255,255,.18);border:1px solid rgba(255,255,255,.4);border-radius:99px;padding:3px 12px;font-size:11px;font-weight:700;color:#fff">${incubatorName}</div>
      <div style="font-size:11px;color:#D8F3DC;margin-top:4px">${tglShort}</div>
    </div>
  </div>`;

  const kode = `<div style="background:#FEF3C7;border-bottom:1.5px dashed #B45309;padding:7px 14px;display:flex;align-items:center;justify-content:space-between;flex-shrink:0">
    <div style="font-size:10px;font-weight:700;color:#78350F;letter-spacing:1.5px">KODE KOPLING</div>
    <div style="font-weight:900;font-size:24px;color:#B91C1C;letter-spacing:1px">${kodeKopl}</div>
  </div>`;

  const induk = `<div style="display:flex;align-items:stretch;gap:8px;padding:9px 14px">
    <div style="flex:1;background:#DBEAFE;border:1.5px solid #3B82F6;border-radius:11px;padding:8px 11px;min-width:0">
      <div style="display:flex;align-items:center;gap:5px;font-size:10px;font-weight:800;color:#1D4ED8;letter-spacing:1px">${ico("mars", "#1D4ED8", 14)} JANTAN</div>
      <div style="font-weight:900;font-size:32px;color:#1E3A8A;line-height:1.15;margin-top:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${maleName}</div>
      <div style="display:flex;align-items:center;gap:5px;font-size:11px;color:#1E40AF;margin-top:4px">${ico("pin", "#1E40AF", 13)} <span style="font-weight:600">${maleEnc}</span></div>
    </div>
    <div style="display:flex;align-items:center;flex-shrink:0">${ico("heart", "#E11D48", 18)}</div>
    <div style="flex:1;background:#FCE7F3;border:1.5px solid #EC4899;border-radius:11px;padding:8px 11px;min-width:0">
      <div style="display:flex;align-items:center;gap:5px;font-size:10px;font-weight:800;color:#BE185D;letter-spacing:1px">${ico("venus", "#BE185D", 14)} BETINA</div>
      <div style="font-weight:900;font-size:32px;color:#831843;line-height:1.15;margin-top:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${femaleName}</div>
      <div style="display:flex;align-items:center;gap:5px;font-size:11px;color:#9D174D;margin-top:4px">${ico("pin", "#9D174D", 13)} <span style="font-weight:600">${femaleEnc}</span></div>
    </div>
  </div>`;

  const gridBox = (bg, border, labelColor, icon, label, value) => `<div style="background:${bg};border:1px solid ${border};border-radius:9px;padding:6px 9px;min-width:0">
    <div style="display:flex;align-items:center;gap:5px;font-size:10px;font-weight:700;color:${labelColor}">${ico(icon, labelColor, 13)} ${label}</div>
    <div style="font-size:15px;font-weight:800;color:#1F2937;margin-top:2px;line-height:1.2;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${value}</div>
  </div>`;
  const grid = `<div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:7px;padding:0 14px;margin-top:2px">
    ${gridBox("#FEF9C3", "#CA8A04", "#713F12", "egg", "Jumlah Telur", `${eggNum} butir`)}
    ${gridBox("#DCFCE7", "#16A34A", "#14532D", "cal", "Tgl Bertelur", tglShort)}
    ${gridBox("#FFEDD5", "#EA580C", "#7C2D12", "therm", "Est. Menetas", hatchShort)}
    ${gridBox("#DBEAFE", "#2563EB", "#1E3A8A", "box", "Status", status)}
  </div>`;

  const candling = `<div style="margin:9px 14px;background:${late ? "#FEE2E2" : "#FEF3C7"};border:2.5px solid ${late ? "#DC2626" : "#B45309"};border-radius:11px;padding:8px 11px">
    <div style="display:flex;align-items:center;gap:12px">
      <div style="flex:1;min-width:0">
        <div style="display:flex;align-items:center;gap:6px"><span style="font-weight:800;font-size:14px;color:${late ? "#991B1B" : "#78350F"};letter-spacing:0.5px">CANDLING HARI KE-30</span>${late ? ico("alert", "#DC2626", 15) : ""}</div>
        <div style="font-weight:900;font-size:24px;color:${late ? "#991B1B" : "#1F2937"};line-height:1.2;margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${cdStr}${late ? " · TERLAMBAT" : ""}</div>
      </div>
      <div style="width:32px;height:32px;border:2.5px solid ${late ? "#DC2626" : "#1F2937"};background:#fff;border-radius:5px;flex-shrink:0"></div>
    </div>
    <div style="font-size:13px;color:${late ? "#991B1B" : "#1F2937"};margin-top:7px">Fertil: ${dotted(late ? "#991B1B" : "#1F2937", 80)} &nbsp;&nbsp; Infertil: ${dotted(late ? "#991B1B" : "#1F2937", 80)}</div>
  </div>`;

  const suhu = `<div style="font-size:13px;color:#1F2937;padding:7px 14px 5px">Suhu: ${dotted("#1F2937", 90)} °C &nbsp;&nbsp; Kelembapan: ${dotted("#1F2937", 90)} %</div>`;

  const leftCol = `${induk}${grid}${candling}${suhu}`;

  const qrCol = `<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;padding:9px 11px;flex-shrink:0;border-left:1px solid #2D6A4F;background:#F8FAF9">
    <div style="border:2.5px solid #2D6A4F;border-radius:13px;padding:6px;background:#fff"><img src="${qrDataUrl}" width="${qrPx}" height="${qrPx}" style="display:block"/></div>
    <div style="background:#1B4332;color:#fff;border-radius:99px;padding:4px 13px;font-size:12px;font-weight:700;margin-top:8px;text-align:center;white-space:nowrap">${generation}</div>
    <div style="font-size:10px;color:#14532D;margin-top:4px;text-align:center">Pindai untuk info kura</div>
  </div>`;

  const kaki = `<div style="background:#1B4332;color:#D8F3DC;padding:6px 14px;display:flex;justify-content:space-between;align-items:center;flex-shrink:0;gap:8px">
    <span style="font-style:italic;font-size:11px">Centrochelys sulcata <span style="font-style:normal;font-size:9px;opacity:.8">(African Spurred Tortoise)</span></span>
    <span style="font-size:11px;font-weight:600;color:#fff">dutatortoise.base44.app</span>
  </div>`;

  const body = `<div style="flex:1 1 auto;display:flex;flex-direction:row;min-height:0">
    <div style="flex:1 1 auto;display:flex;flex-direction:column;min-width:0">${leftCol}</div>
    ${qrCol}
  </div>`;

  return `<div style="width:${wPx}px;height:${hPx}px;background:#fff;border:2px solid #2D6A4F;border-radius:12px;padding:0;box-sizing:border-box;display:flex;overflow:hidden">
    <div style="flex:1 1 auto;display:flex;flex-direction:column;overflow:hidden">${kepala}${kode}${body}${kaki}</div>
  </div>`;
}
import { useState } from "react";
import QRCode from "qrcode";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, Printer, Loader2, AlertTriangle, CheckCircle2, FileText } from "lucide-react";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { renderColorLabelHTML } from "@/components/breeding/colorEggLabel";

// Definisi ukuran fisik (mm) dan konfigurasi font dasar (px @ 203 DPI)
const SIZE_DEFS = [
  { id: "100x50", label: "100 × 50 mm", w: 100, h: 50, full: true },
  { id: "50x30", label: "50 × 30 mm", w: 50, h: 30, full: false },
  { id: "40x30", label: "40 × 30 mm", w: 40, h: 30, full: false },
];
const FONT_CFG = {
  "100x50": { pita: 18, pPad: 6, kode: 50, egg: 28, eggLbl: 11, cTitle: 16, cDate: 28, cBox: 34, qr: 198, qrLbl: 10, pad: 10, lhKode: 1.2, lhDate: 1.25 },
  "50x30":  { pita: 11, pPad: 3, kode: 26, egg: 22, eggLbl: 8, cTitle: 10, cDate: 14, cBox: 16, qr: 150, qrLbl: 8, pad: 5, lhKode: 1.15, lhDate: 1.2 },
  "40x30":  { pita: 10, pPad: 2, kode: 21, egg: 18, eggLbl: 7, cTitle: 9, cDate: 12, cBox: 14, qr: 138, qrLbl: 7, pad: 4, lhKode: 1.15, lhDate: 1.2 },
};

export function candlingDate30(eggLayingDate) {
  if (!eggLayingDate) return null;
  const d = new Date(eggLayingDate);
  d.setDate(d.getDate() + 30);
  return d;
}
export function isCandlingLate(b) {
  const cd = candlingDate30(b?.egg_laying_date);
  if (!cd) return false;
  return cd < new Date() && !b.candling_day_30_done;
}

function svgIcon(type, color) {
  const s = `stroke="${color}"`;
  if (type === "cal") return `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" ${s} stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="17" rx="1"/><path d="M3 9h18M8 2v4M16 2v4"/></svg>`;
  if (type === "egg") return `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" ${s} stroke-width="2"><ellipse cx="12" cy="12" rx="7.5" ry="9"/></svg>`;
  if (type === "home") return `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" ${s} stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11l9-7 9 7"/><path d="M5 10v10h14V10"/></svg>`;
  return `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" ${s} stroke-width="2" stroke-linejoin="round"><rect x="4" y="4" width="16" height="16"/><path d="M4 9h16M9 4v16"/></svg>`;
}

function themeFor(mode, late) {
  if (mode === "color") {
    return {
      ink: "#1f2937", border: "#2D5016", pitaBg: "#2D5016", pitaFg: "#ffffff",
      eggBg: "#DCFCE7", eggBorder: "#166534", icon: "#166534",
      candBg: late ? "#FEE2E2" : "#FEF3C7", candBorder: late ? "#DC2626" : "#B45309", candText: late ? "#991B1B" : "#1f2937",
      lateBg: "#DC2626", lateFg: "#fff", qrBorder: "#2D5016", footerBorder: "#2D5016", frame: "#2D5016",
    };
  }
  return {
    ink: "#000", border: "#000", pitaBg: "#000", pitaFg: "#fff",
    eggBg: "#fff", eggBorder: "#000", icon: "#000",
    candBg: "#fff", candBorder: "#000", candText: "#000",
    lateBg: "#000", lateFg: "#fff", qrBorder: "#000", footerBorder: "#000", frame: "#000",
  };
}

// Bangun HTML label. mode: 'thermal' | 'color'. Mengembalikan { html, wPx, hPx }.
function buildLabelHTML(breeding, sizeDef, mode) {
  const dpi = mode === "color" ? 300 : 203;
  const F = (v) => Math.round((v * dpi) / 203);
  const wPx = Math.round((sizeDef.w * dpi) / 25.4);
  const hPx = Math.round((sizeDef.h * dpi) / 25.4);
  const S = FONT_CFG[sizeDef.id];

  const qrText = `BREED:${breeding.id}`;
  // QR dibangkitkan terpisah (async) — disisipkan via parameter qrDataUrl
  return { wPx, hPx, F, S, qrText, sizeDef };
}

async function renderLabelHTML(breeding, sizeDef, mode, tortoises = []) {
  if (mode === "color") return renderColorLabelHTML(breeding, sizeDef, tortoises);
  const { wPx, hPx, F, S, qrText } = buildLabelHTML(breeding, sizeDef, mode);
  const qrDataUrl = await QRCode.toDataURL(qrText, {
    width: 400, margin: 1, color: { dark: "#000000", light: "#ffffff" },
  });

  const d = breeding.egg_laying_date ? new Date(breeding.egg_laying_date) : null;
  const tglStr = d ? d.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" }) : "—";
  const hs = breeding.estimated_hatch_start ? new Date(breeding.estimated_hatch_start) : null;
  const he = breeding.estimated_hatch_end ? new Date(breeding.estimated_hatch_end) : null;
  const hatchStr = hs && he
    ? `${format(hs, "d MMM yyyy", { locale: idLocale })} – ${format(he, "d MMM yyyy", { locale: idLocale })}`
    : "—";
  const cd = candlingDate30(breeding.egg_laying_date);
  const cdStr = cd ? format(cd, "d MMMM yyyy", { locale: idLocale }) : "—";
  const late = isCandlingLate(breeding);
  const T = themeFor(mode, late);
  const parentCode = `${breeding.male_name || "?"} × ${breeding.female_name || "?"}`;
  const eggNum = `${breeding.egg_count || 0}`;
  const incubatorLine = [breeding.incubator_name, breeding.tray_number ? `Tray ${breeding.tray_number}` : ""].filter(Boolean).join(" · ") || "—";
  const season = breeding.season_year || "";
  const inkDays = (d && hs) ? Math.max(0, Math.round((hs - d) / 86400000)) : null;
  const printedDate = new Date().toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
  const findT = (id, name) => tortoises.find(t => (id && t.id === id) || (name && (t.name === name || t.code === name)));
  const maleEnc = (findT(breeding.male_id, breeding.male_name)?.enclosure) || "—";
  const femaleEnc = (findT(breeding.female_id, breeding.female_name)?.enclosure) || "—";
  const maleLine = `${breeding.male_name || "—"}${maleEnc !== "—" ? ` · ${maleEnc}` : ""}`;
  const femaleLine = `${breeding.female_name || "—"}${femaleEnc !== "—" ? ` · ${femaleEnc}` : ""}`;
  const compact = !sizeDef.full;

  const dotted = (w) => `<span style="display:inline-block;border-bottom:1.5px dotted ${T.border};width:${F(w)}px;height:1em;vertical-align:bottom">&nbsp;</span>`;
  const infoRow = (icon, label, value) => `<div style="display:flex;align-items:center;gap:${F(6)}px;font-size:${F(13)}px;line-height:1.3;color:${T.ink}">
    <span style="flex-shrink:0">${svgIcon(icon, T.icon)}</span>
    <span><span style="font-weight:600">${label}:</span> <span style="font-weight:700">${value}</span></span>
  </div>`;

  const pita = `<div style="background:${T.pitaBg};color:${T.pitaFg};text-align:center;font-weight:800;font-size:${F(S.pita)}px;letter-spacing:1px;padding:${F(S.pPad)}px ${F(S.pPad * 2)}px;flex-shrink:0">DUTA TORTOISE — KOTAK TELUR</div>`;

  const mainRow = `<div style="display:flex;align-items:center;gap:${F(compact ? 8 : 12)}px;padding:${F(compact ? 5 : 10)}px ${F(S.pad)}px ${F(compact ? 6 : 14)}px;flex-shrink:0">
    <div style="flex:1 1 auto;font-weight:900;font-size:${F(S.kode)}px;color:${T.ink};line-height:1.12;padding-bottom:${F(Math.round(S.kode * 0.22))}px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${parentCode}</div>
    <div style="border:${F(compact ? 1.5 : 2.5)}px solid ${T.eggBorder};background:${T.eggBg};border-radius:${F(6)}px;padding:${F(compact ? 3 : 5)}px ${F(compact ? 7 : 12)}px;text-align:center;flex-shrink:0">
      <div style="font-weight:900;font-size:${F(S.egg)}px;line-height:1.12;padding-bottom:${F(Math.round(S.egg * 0.2))}px;color:${T.ink}">${eggNum}</div>
      <div style="font-size:${F(S.eggLbl)}px;font-weight:700;letter-spacing:1px;color:${T.ink}">BUTIR</div>
    </div>
  </div>`;

  const candlingBox = `<div style="border:${F(compact ? 2 : 3)}px solid ${T.candBorder};background:${T.candBg};border-radius:${F(6)}px;padding:${F(compact ? 6 : 10)}px ${F(compact ? 7 : 12)}px ${F(compact ? 5 : 10)}px;margin:${F(compact ? 5 : 8)}px ${F(S.pad)}px;flex-shrink:0">
    <div style="display:flex;align-items:center;gap:${F(compact ? 8 : 12)}px">
      <div style="flex:1;min-width:0">
        <div style="font-weight:800;font-size:${F(S.cTitle)}px;letter-spacing:0.5px;color:${T.candText}">CANDLING HARI KE-30</div>
        <div style="font-weight:900;font-size:${F(S.cDate)}px;line-height:1.15;padding-bottom:${F(Math.round(S.cDate * 0.24))}px;margin-top:${F(2)}px;color:${T.candText};white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${cdStr}</div>
      </div>
      <div style="width:${F(S.cBox)}px;height:${F(S.cBox)}px;border:${F(compact ? 2 : 3)}px solid ${T.candBorder};background:#fff;flex-shrink:0"></div>
    </div>
  </div>`;

  const lateMargin = compact ? [4, 6, 0] : [4, S.pad, 0];
  const lateRibbon = late
    ? `<div style="background:${T.lateBg};color:${T.lateFg};text-align:center;font-weight:800;font-size:${F(compact ? 9 : 11)}px;letter-spacing:1px;padding:${F(2)}px ${F(4)}px;margin:${lateMargin.map((n) => F(n)).join("px ")}px;flex-shrink:0">${compact ? "⚠ CANDLING TERLAMBAT" : "⚠ CANDLING TERLAMBAT — periksa segera"}</div>`
    : "";

  let leftContent;
  if (compact) {
    leftContent = `${mainRow}${candlingBox}${lateRibbon}`;
  } else {
    const infoTable = `<div style="border-top:1.5px solid ${T.border};margin:0 ${F(S.pad)}px;flex-shrink:0"></div>
      <div style="display:flex;gap:${F(14)}px;padding:${F(7)}px ${F(S.pad)}px;flex-shrink:0">
        <div style="flex:1;display:flex;flex-direction:column;gap:${F(5)}px">
          ${infoRow("cal", "Bertelur", tglStr)}
          ${infoRow("cal", "Menetas", hatchStr)}
          ${infoRow("egg", "Inkubasi", inkDays != null ? `${inkDays} hari` : "—")}
        </div>
        <div style="flex:1;display:flex;flex-direction:column;gap:${F(5)}px">
          ${infoRow("home", "Jantan", maleLine)}
          ${infoRow("home", "Betina", femaleLine)}
          ${infoRow("box", "Inkubator", incubatorLine)}
        </div>
      </div>`;
    const suhuRow = `<div style="font-size:${F(13)}px;color:${T.ink};padding:${F(6)}px ${F(S.pad)}px ${F(2)}px;flex-shrink:0">Suhu: ${dotted(70)} °C &nbsp;&nbsp; Kelembapan: ${dotted(70)} %</div>`;
    const footer = `<div style="font-size:${F(11)}px;color:${T.ink};border-top:1px solid ${T.footerBorder};padding:${F(5)}px ${F(S.pad)}px;margin-top:auto;flex-shrink:0;display:flex;justify-content:space-between">
      <span style="font-weight:700">${season ? "MUSIM " + season : ""}</span>
      <span>Dicetak: ${printedDate}</span>
    </div>`;
    leftContent = `${mainRow}${infoTable}${candlingBox}${lateRibbon}${suhuRow}${footer}`;
  }

  const qrCol = `<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;padding:${F(compact ? 6 : 8)}px;flex-shrink:0;border-left:1px solid ${T.qrBorder};background:#fff">
    <img src="${qrDataUrl}" width="${F(S.qr)}" height="${F(S.qr)}" style="display:block" />
    <div style="font-size:${F(S.qrLbl)}px;color:${T.ink};text-align:center;margin-top:${F(3)}px;font-weight:600">Pindai untuk rincian</div>
  </div>`;

  const body = `<div style="flex:1 1 auto;display:flex;flex-direction:row;min-height:0">
    <div style="flex:1 1 auto;display:flex;flex-direction:column;min-width:0">${leftContent}</div>
    ${qrCol}
  </div>`;

  const html = `<div style="width:${wPx}px;height:${hPx}px;background:#fff;border:${F(3)}px solid ${T.frame};border-radius:${F(6)}px;padding:${F(5)}px;box-sizing:border-box;display:flex">
    <div style="border:1px solid ${T.frame};border-radius:${F(4)}px;flex:1 1 auto;display:flex;flex-direction:column;overflow:hidden">
      ${pita}${body}
    </div>
  </div>`;
  return html;
}

async function htmlToPng(html, wPx, hPx) {
  const container = document.createElement("div");
  container.style.cssText = "position:fixed;left:-9999px;top:0;z-index:-1;";
  container.innerHTML = html;
  document.body.appendChild(container);
  const h2c = (await import("html2canvas")).default;
  const canvas = await h2c(container.firstElementChild, {
    scale: 2, useCORS: true, backgroundColor: "#ffffff", logging: false, width: wPx, height: hPx,
  });
  document.body.removeChild(container);
  return canvas.toDataURL("image/png");
}

async function renderLabelPng(breeding, sizeDef, mode, tortoises = []) {
  const dpi = mode === "color" ? 300 : 203;
  const wPx = Math.round((sizeDef.w * dpi) / 25.4);
  const hPx = Math.round((sizeDef.h * dpi) / 25.4);
  const html = await renderLabelHTML(breeding, sizeDef, mode, tortoises);
  return htmlToPng(html, wPx, hPx);
}

// Lembar A4 (210×297 mm @ 300 DPI), 2 kolom × 5 baris label 100×50 mm, khusus mode warna
async function renderA4SheetPng(breedings, tortoises = []) {
  const dpi = 300;
  const mm = (v) => Math.round((v * dpi) / 25.4);
  const wA4 = mm(210), hA4 = mm(297);
  const labelDef = SIZE_DEFS.find((s) => s.id === "100x50");
  const lw = mm(100), lh = mm(50);
  const marginX = mm(5); // 5mm horizontal agar 2×100mm muat di 210mm
  const marginY = mm(8);

  const labels = breedings.slice(0, 10);
  const labelHtmls = [];
  for (const b of labels) {
    labelHtmls.push(await renderLabelHTML(b, labelDef, "color", tortoises));
  }

  const cells = [];
  for (let i = 0; i < labels.length; i++) {
    const col = i % 2, row = Math.floor(i / 2);
    const x = marginX + col * lw, y = marginY + row * lh;
    cells.push(`<div style="position:absolute;left:${x}px;top:${y}px;width:${lw}px;height:${lh}px;overflow:hidden">${labelHtmls[i]}</div>`);
  }
  // Garis potong putus-putus
  const cuts = [];
  cuts.push(`<div style="position:absolute;left:${marginX + lw}px;top:${marginY}px;border-left:1px dashed #999;height:${5 * lh}px;width:0"></div>`);
  for (let j = 1; j < 5; j++) {
    cuts.push(`<div style="position:absolute;left:${marginX}px;top:${marginY + j * lh}px;border-top:1px dashed #999;width:${2 * lw}px;height:0"></div>`);
  }

  const html = `<div style="width:${wA4}px;height:${hA4}px;background:#fff;position:relative;font-family:Arial,Helvetica,sans-serif;overflow:hidden">${cuts.join("")}${cells.join("")}</div>`;
  return htmlToPng(html, wA4, hA4);
}

function fileStem(b) {
  const code = `${b.male_name || "?"}x${b.female_name || "?"}`.replace(/\s+/g, "");
  const d = b.egg_laying_date ? new Date(b.egg_laying_date) : null;
  const ds = d ? `${format(d, "d", { locale: idLocale })}${format(d, "MMM", { locale: idLocale })}${format(d, "yyyy")}` : "tanpatgl";
  return `label-${code}-${ds}`;
}

export default function EggLabelGenerator({ breedings = [], allActiveBreedings = [], tortoises = [], open, onClose }) {
  const [printerMode, setPrinterMode] = useState("thermal");
  const [sizeId, setSizeId] = useState("100x50");
  const [previews, setPreviews] = useState([]);
  const [generating, setGenerating] = useState(false);
  const [a4Generating, setA4Generating] = useState(false);
  const [a4Done, setA4Done] = useState(false);
  const [doneIdx, setDoneIdx] = useState(null);

  const sizeDef = SIZE_DEFS.find((s) => s.id === sizeId);
  const colorMode = printerMode === "color";

  const handleGenerate = async () => {
    setGenerating(true);
    const out = [];
    for (const b of breedings) {
      try {
        const dataUrl = await renderLabelPng(b, sizeDef, printerMode, tortoises);
        out.push({ breeding: b, dataUrl });
      } catch (e) {
        out.push({ breeding: b, dataUrl: null });
      }
    }
    setPreviews(out);
    setGenerating(false);
  };

  const triggerDownload = (dataUrl, filename) => {
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleDownload = (dataUrl, breeding, idx) => {
    if (!dataUrl) return;
    const sizeTag = `${sizeDef.w}x${sizeDef.h}-${printerMode === "color" ? "warna" : "termal"}`;
    triggerDownload(dataUrl, `${fileStem(breeding)}-${sizeTag}.png`);
    setDoneIdx(idx);
    setTimeout(() => setDoneIdx(null), 2500);
  };

  const handleDownloadAll = () => {
    previews.forEach(({ dataUrl, breeding }) => {
      if (dataUrl) {
        const sizeTag = `${sizeDef.w}x${sizeDef.h}-${printerMode === "color" ? "warna" : "termal"}`;
        triggerDownload(dataUrl, `${fileStem(breeding)}-${sizeTag}.png`);
      }
    });
    setDoneIdx("all");
    setTimeout(() => setDoneIdx(null), 2500);
  };

  const handleA4 = async () => {
    setA4Generating(true);
    setA4Done(false);
    try {
      const dataUrl = await renderA4SheetPng(allActiveBreedings.length ? allActiveBreedings : breedings, tortoises);
      const tag = format(new Date(), "ddMMyyyy", { locale: idLocale });
      triggerDownload(dataUrl, `lembar-A4-label-telur-${tag}.png`);
      setA4Done(true);
      setTimeout(() => setA4Done(false), 3500);
    } catch (e) {
      console.error("A4 sheet error:", e);
    }
    setA4Generating(false);
  };

  const kodeNama = (b) => `${b.male_name || "?"} × ${b.female_name || "?"}`;

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { onClose(); setPreviews([]); setA4Done(false); } }}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Printer className="w-5 h-5" /> Cetak Label Kotak Telur
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          {/* Jenis printer */}
          <div>
            <label className="text-xs font-medium block mb-1">Jenis Printer</label>
            <Select value={printerMode} onValueChange={(v) => { setPrinterMode(v); setPreviews([]); setA4Done(false); }}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="thermal">Printer Termal (XP-420B) — hitam-putih 203 DPI</SelectItem>
                <SelectItem value="color">Printer Warna (Epson L385) — berwarna 300 DPI</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Ukuran label */}
          <div>
            <label className="text-xs font-medium block mb-1">Ukuran Label</label>
            <Select value={sizeId} onValueChange={(v) => { setSizeId(v); setPreviews([]); }}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                {SIZE_DEFS.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.label}{s.full ? " (lengkap)" : " (ringkas)"}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-[11px] text-muted-foreground mt-1">
              {sizeDef.full
                ? "Label lengkap: pita, kode induk, jumlah telur, tabel info, kotak candling, suhu, kaki."
                : "Versi ringkas: pita, kode induk, jumlah telur, candling, QR."}
            </p>
          </div>

          {colorMode && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-2.5 text-[11px] text-amber-800 flex gap-2">
              <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
              <span>Tinta inkjet luntur bila terkena air. Inkubator lembap — <b>laminasi label</b> atau lapisi <b>isolasi bening</b> sebelum ditempel.</span>
            </div>
          )}

          <div className="text-xs text-muted-foreground bg-muted/40 rounded-lg px-3 py-2">
            {breedings.length} label akan dibuat · QR <span className="font-mono">BREED:&lt;id&gt;</span> · {colorMode ? "berwarna 300 DPI" : "hitam-putih 203 DPI"}
          </div>

          <Button onClick={handleGenerate} disabled={generating || breedings.length === 0} className="w-full h-10">
            {generating ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Membuat label...</> : "⚡ Buat Label"}
          </Button>

          {colorMode && (
            <Button variant="outline" onClick={handleA4} disabled={a4Generating || (allActiveBreedings.length === 0 && breedings.length === 0)} className="w-full h-10 gap-2">
              {a4Generating ? <Loader2 className="w-4 h-4 animate-spin" /> : a4Done ? <CheckCircle2 className="w-4 h-4 text-green-600" /> : <FileText className="w-4 h-4" />}
              {a4Generating ? "Menyusun lembar A4..." : a4Done ? "Lembar A4 terunduh" : "Unduh Lembar A4 (semua label aktif)"}
            </Button>
          )}
          {colorMode && (
            <p className="text-[11px] text-center text-muted-foreground">
              A4 tegak (210×297 mm) · 2 kolom × 5 baris = maks. 10 label 100×50 mm · garis putus-putus panduan gunting
            </p>
          )}
        </div>

        {previews.length > 0 && (
          <div className="space-y-3 mt-2">
            <div className="flex justify-between items-center">
              <p className="text-sm font-semibold">{previews.length} label siap diunduh</p>
              {previews.length > 1 && (
                <Button size="sm" variant="outline" onClick={handleDownloadAll}>
                  {doneIdx === "all" ? <><CheckCircle2 className="w-3.5 h-3.5 mr-1 text-green-600" /> Terunduh</> : <><Download className="w-3.5 h-3.5 mr-1" /> Unduh Semua</>}
                </Button>
              )}
            </div>
            <div className="space-y-3">
              {previews.map(({ breeding, dataUrl }, idx) => (
                <div key={idx} className="border rounded-lg p-3 flex items-center gap-3">
                  {dataUrl ? (
                    <div className="rounded border-2 border-green-700/30 bg-green-50/40 p-1 flex-shrink-0">
                      <img src={dataUrl} alt={kodeNama(breeding)} className="rounded" style={{ height: 88 }} />
                    </div>
                  ) : (
                    <div className="h-20 w-32 flex items-center justify-center text-xs text-red-600 bg-red-50 rounded">Gagal</div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{kodeNama(breeding)}</p>
                    <p className="text-xs text-muted-foreground">{breeding.egg_count || 0} butir · {breeding.incubator_name || "—"}</p>
                    {isCandlingLate(breeding) && (
                      <p className="text-[11px] text-red-600 font-medium flex items-center gap-1 mt-0.5">
                        <AlertTriangle className="w-3 h-3" /> Candling terlambat
                      </p>
                    )}
                  </div>
                  <Button size="sm" variant="outline" disabled={!dataUrl} onClick={() => handleDownload(dataUrl, breeding, idx)}>
                    {doneIdx === idx ? <><CheckCircle2 className="w-3.5 h-3.5 mr-1 text-green-600" /> Terunduh</> : <><Download className="w-3.5 h-3.5 mr-1" /> PNG</>}
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
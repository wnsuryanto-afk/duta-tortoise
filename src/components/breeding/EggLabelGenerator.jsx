import { useState } from "react";
import QRCode from "qrcode";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, Printer, Loader2, AlertTriangle } from "lucide-react";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";

// Ukuran label pada 203 DPI (1 mm ≈ 8 px) untuk printer Niimbot XP-420B
const LABEL_SIZES = [
  { id: "50x30", label: "50 × 30 mm", w: 400, h: 240 },
  { id: "40x30", label: "40 × 30 mm", w: 320, h: 240 },
  { id: "100x50", label: "100 × 50 mm (kotak besar)", w: 800, h: 400 },
];

// Hitung tanggal candling hari ke-30 dari tanggal bertelur
export function candlingDate30(eggLayingDate) {
  if (!eggLayingDate) return null;
  const d = new Date(eggLayingDate);
  d.setDate(d.getDate() + 30);
  return d;
}

// Candling sudah lewat tapi belum dikerjakan
export function isCandlingLate(b) {
  const cd = candlingDate30(b?.egg_laying_date);
  if (!cd) return false;
  return cd < new Date() && !b.candling_day_30_done;
}

// Ikon garis sederhana (hitam, tidak terisi) — aman untuk cetak termal
const ICON = {
  cal: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#000" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="17" rx="1"/><path d="M3 9h18M8 2v4M16 2v4"/></svg>`,
  egg: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#000" stroke-width="2"><ellipse cx="12" cy="12" rx="7.5" ry="9"/></svg>`,
  home: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#000" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11l9-7 9 7"/><path d="M5 10v10h14V10"/></svg>`,
  box: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#000" stroke-width="2" stroke-linejoin="round"><rect x="4" y="4" width="16" height="16"/><path d="M4 9h16M9 4v16"/></svg>`,
};

function dotted(w) {
  return `<span style="display:inline-block;border-bottom:1.5px dotted #000;width:${w}px;height:1em;vertical-align:bottom">&nbsp;</span>`;
}

async function renderEggLabel(breeding, size) {
  const qrText = `BREED:${breeding.id}`;
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
  const parentCode = `${breeding.male_name || "?"} × ${breeding.female_name || "?"}`;
  const eggNum = `${breeding.egg_count || 0}`;
  const incubatorLine = [
    breeding.incubator_name,
    breeding.tray_number ? `Tray ${breeding.tray_number}` : "",
  ].filter(Boolean).join(" · ") || "—";
  const season = breeding.season_year || "";
  const inkDays = (d && hs) ? Math.max(0, Math.round((hs - d) / 86400000)) : null;
  const printedDate = new Date().toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });

  const compact = size.id !== "100x50";
  const { w, h } = size;

  // Penyesuaian ukuran per dimensi label
  let S;
  if (compact) {
    if (size.id === "50x30") {
      S = { pita: 11, pPad: 3, kode: 26, egg: 22, eggLbl: 8, cTitle: 10, cDate: 14, cBox: 16, qr: 150, qrLbl: 8, pad: 5 };
    } else {
      S = { pita: 10, pPad: 2, kode: 21, egg: 18, eggLbl: 7, cTitle: 9, cDate: 12, cBox: 14, qr: 138, qrLbl: 7, pad: 4 };
    }
  } else {
    S = { pita: 18, pPad: 6, kode: 50, egg: 28, eggLbl: 11, cTitle: 16, cDate: 28, cBox: 34, qr: 198, qrLbl: 10, pad: 10 };
  }

  const maleLine = `${breeding.male_name || "—"}${breeding.male_enclosure ? ` · ${breeding.male_enclosure}` : ""}`;
  const femaleLine = `${breeding.female_name || "—"}${breeding.female_enclosure ? ` · ${breeding.female_enclosure}` : ""}`;

  // Baris informasi dengan ikon garis (hanya ukuran penuh)
  function infoRow(icon, label, value) {
    return `<div style="display:flex;align-items:center;gap:6px;font-size:13px;line-height:1.25;color:#000">
      <span style="flex-shrink:0">${icon}</span>
      <span><span style="font-weight:600">${label}:</span> <span style="font-weight:700">${value}</span></span>
    </div>`;
  }

  // ── BINGKAI GANDA + PITA JUDUL ──
  const pita = `<div style="background:#000;color:#fff;text-align:center;font-weight:800;font-size:${S.pita}px;letter-spacing:1px;padding:${S.pPad}px ${S.pPad * 2}px;flex-shrink:0">DUTA TORTOISE — KOTAK TELUR</div>`;

  // ── BARIS UTAMA: kode induk + jumlah telur ──
  const mainRow = `<div style="display:flex;align-items:center;gap:${compact ? 8 : 12}px;padding:${compact ? 5 : 8}px ${S.pad}px">
    <div style="flex:1 1 auto;font-weight:900;font-size:${S.kode}px;color:#000;line-height:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${parentCode}</div>
    <div style="border:${compact ? 1.5 : 2.5}px solid #000;border-radius:6px;padding:${compact ? "3px 7px" : "5px 12px"};text-align:center;flex-shrink:0">
      <div style="font-weight:900;font-size:${S.egg}px;line-height:1;color:#000">${eggNum}</div>
      <div style="font-size:${S.eggLbl}px;font-weight:700;letter-spacing:1px;color:#000">BUTIR</div>
    </div>
  </div>`;

  // ── KOTAK CANDLING ──
  const candlingBox = `<div style="border:${compact ? 2 : 3}px solid #000;border-radius:6px;padding:${compact ? "5px 6px" : "8px 10px"};margin:${compact ? "5px 6px" : `0 ${S.pad}px`}">
    <div style="display:flex;align-items:center;gap:${compact ? 8 : 12}px">
      <div style="flex:1;min-width:0">
        <div style="font-weight:800;font-size:${S.cTitle}px;letter-spacing:0.5px;color:#000">CANDLING HARI KE-30</div>
        <div style="font-weight:900;font-size:${S.cDate}px;line-height:1.1;color:#000;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${cdStr}</div>
      </div>
      <div style="width:${S.cBox}px;height:${S.cBox}px;border:${compact ? 2 : 3}px solid #000;background:#fff;flex-shrink:0"></div>
    </div>
  </div>`;

  // ── PITA CANDLING TERLAMBAT (bila lewat & belum dikerjakan) ──
  const lateMargin = compact ? "4px 6px 0" : `4px ${S.pad}px 0`;
  const lateRibbon = late
    ? `<div style="background:#000;color:#fff;text-align:center;font-weight:800;font-size:${compact ? 9 : 11}px;letter-spacing:1px;padding:2px 4px;margin:${lateMargin}">⚠ CANDLING TERLAMBAT</div>`
    : "";

  // Konten kiri berbeda untuk ringkas vs penuh
  let leftContent;
  if (compact) {
    leftContent = `${mainRow}${candlingBox}${lateRibbon}`;
  } else {
    const infoTable = `<div style="border-top:1.5px solid #000;margin:0 ${S.pad}px"></div>
      <div style="display:flex;gap:14px;padding:6px ${S.pad}px">
        <div style="flex:1;display:flex;flex-direction:column;gap:4px">
          ${infoRow(ICON.cal, "Bertelur", tglStr)}
          ${infoRow(ICON.cal, "Menetas", hatchStr)}
          ${infoRow(ICON.egg, "Inkubasi", inkDays != null ? `${inkDays} hari` : "—")}
        </div>
        <div style="flex:1;display:flex;flex-direction:column;gap:4px">
          ${infoRow(ICON.home, "Jantan", maleLine)}
          ${infoRow(ICON.home, "Betina", femaleLine)}
          ${infoRow(ICON.box, "Inkubator", incubatorLine)}
        </div>
      </div>`;
    const suhuRow = `<div style="font-size:13px;color:#000;padding:5px ${S.pad}px 2px">Suhu: ${dotted(70)} °C &nbsp;&nbsp; Kelembapan: ${dotted(70)} %</div>`;
    const footer = `<div style="font-size:11px;color:#000;border-top:1px solid #000;padding:4px ${S.pad}px;margin-top:auto;display:flex;justify-content:space-between">
      <span style="font-weight:700">${season ? "MUSIM " + season : ""}</span>
      <span>Dicetak: ${printedDate}</span>
    </div>`;
    leftContent = `${mainRow}${infoTable}${candlingBox}${lateRibbon}${suhuRow}${footer}`;
  }

  // ── KOLOM QR ──
  const qrCol = `<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;padding:${compact ? 6 : 8}px;flex-shrink:0;border-left:1px solid #000;background:#fff">
    <img src="${qrDataUrl}" width="${S.qr}" height="${S.qr}" style="display:block" />
    <div style="font-size:${S.qrLbl}px;color:#000;text-align:center;margin-top:3px;font-weight:600">Pindai untuk rincian</div>
  </div>`;

  const body = `<div style="flex:1 1 auto;display:flex;flex-direction:row;min-height:0">
    <div style="flex:1 1 auto;display:flex;flex-direction:column;min-width:0">${leftContent}</div>
    ${qrCol}
  </div>`;

  // Bingkai ganda: garis luar tebal 3px + jarak + garis dalam tipis 1px
  const html = `<div style="width:${w}px;height:${h}px;background:#fff;border:3px solid #000;border-radius:6px;padding:5px;box-sizing:border-box;display:flex">
    <div style="border:1px solid #000;border-radius:4px;flex:1 1 auto;display:flex;flex-direction:column;overflow:hidden">
      ${pita}${body}
    </div>
  </div>`;

  const container = document.createElement("div");
  container.style.cssText = "position:fixed;left:-9999px;top:0;z-index:-1;";
  container.innerHTML = html;
  document.body.appendChild(container);
  const h2c = (await import("html2canvas")).default;
  const canvas = await h2c(container.firstElementChild, {
    scale: 3, useCORS: true, backgroundColor: "#ffffff", logging: false,
  });
  document.body.removeChild(container);
  return canvas.toDataURL("image/png");
}

export default function EggLabelGenerator({ breedings = [], open, onClose }) {
  const [sizeId, setSizeId] = useState("100x50");
  const [previews, setPreviews] = useState([]);
  const [generating, setGenerating] = useState(false);
  const size = LABEL_SIZES.find((s) => s.id === sizeId);

  const handleGenerate = async () => {
    setGenerating(true);
    const out = [];
    for (const b of breedings) {
      try {
        const dataUrl = await renderEggLabel(b, size);
        out.push({ breeding: b, dataUrl });
      } catch (e) {
        out.push({ breeding: b, dataUrl: null });
      }
    }
    setPreviews(out);
    setGenerating(false);
  };

  const handleDownload = (dataUrl, name) => {
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = `label-telur-${(name || "").replace(/\s+/g, "_")}-${sizeId}.png`;
    a.click();
  };

  const handleDownloadAll = () => {
    previews.forEach(({ dataUrl, breeding }) => {
      if (dataUrl) handleDownload(dataUrl, `${breeding.male_name}-${breeding.female_name}`);
    });
  };

  const kodeNama = (b) => `${b.male_name || "?"} × ${b.female_name || "?"}`;

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { onClose(); setPreviews([]); } }}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Printer className="w-5 h-5" /> Cetak Label Kotak Telur
          </DialogTitle>
        </DialogHeader>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-800 flex gap-2">
          <Printer className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold mb-0.5">{breedings.length} label · ukuran {size.label} (203 DPI · hitam-putih)</p>
            <p>Hasil PNG murni hitam-putih untuk printer termal. QR <span className="font-mono">BREED:&lt;id&gt;</span>.</p>
          </div>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium block mb-1">Pilih Ukuran Label</label>
            <Select value={sizeId} onValueChange={(v) => { setSizeId(v); setPreviews([]); }}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                {LABEL_SIZES.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-[11px] text-muted-foreground mt-1">
              100×50 mm = label lengkap. 50×30 & 40×30 mm = versi ringkas (pita, kode induk, jumlah telur, candling, QR).
            </p>
          </div>

          <Button onClick={handleGenerate} disabled={generating || breedings.length === 0} className="w-full h-10">
            {generating ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Membuat label...</> : "⚡ Buat Label"}
          </Button>
        </div>

        {previews.length > 0 && (
          <div className="space-y-3 mt-2">
            <div className="flex justify-between items-center">
              <p className="text-sm font-semibold">{previews.length} label siap diunduh</p>
              {previews.length > 1 && (
                <Button size="sm" variant="outline" onClick={handleDownloadAll}>
                  <Download className="w-3.5 h-3.5 mr-1" /> Unduh Semua
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
                  <Button size="sm" variant="outline" disabled={!dataUrl} onClick={() => handleDownload(dataUrl, `${breeding.male_name}-${breeding.female_name}`)}>
                    <Download className="w-3.5 h-3.5 mr-1" /> PNG
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
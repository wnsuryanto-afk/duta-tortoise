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

async function renderEggLabel(breeding, size) {
  const qrText = `BREED:${breeding.id}`;
  const qrDataUrl = await QRCode.toDataURL(qrText, {
    width: 300, margin: 1, color: { dark: "#000000", light: "#ffffff" },
  });
  const d = breeding.egg_laying_date ? new Date(breeding.egg_laying_date) : null;
  const tglStr = d ? d.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" }) : "—";
  const hs = breeding.estimated_hatch_start ? new Date(breeding.estimated_hatch_start) : null;
  const he = breeding.estimated_hatch_end ? new Date(breeding.estimated_hatch_end) : null;
  const hatchStr = hs && he
    ? `${format(hs, "d MMM", { locale: idLocale })} – ${format(he, "d MMM yyyy", { locale: idLocale })}`
    : "—";
  const cd = candlingDate30(breeding.egg_laying_date);
  const cdStr = cd ? format(cd, "d MMM yyyy", { locale: idLocale }) : "—";
  const late = isCandlingLate(breeding);
  const parentCode = `${breeding.male_name || "?"} × ${breeding.female_name || "?"}`;
  const eggCount = breeding.egg_count ? `${breeding.egg_count} butir` : "—";
  const incubatorLine = [
    breeding.incubator_name,
    breeding.tray_number ? `Tray ${breeding.tray_number}` : "",
  ].filter(Boolean).join(" · ") || "—";
  const season = breeding.season_year || "";

  const big = size.id === "100x50" ? 34 : size.id === "50x30" ? 20 : 16;
  const mid = size.id === "100x50" ? 18 : size.id === "50x30" ? 12 : 10;
  const small = size.id === "100x50" ? 13 : size.id === "50x30" ? 9 : 8;
  const pad = Math.round(size.h * 0.06);
  const qrPx = Math.round(size.h * 0.78);

  const html = `<div style="width:${size.w}px;height:${size.h}px;background:#ffffff;font-family:Arial,Helvetica,sans-serif;display:flex;flex-direction:row;box-sizing:border-box;border:1px solid #d1d5db;overflow:hidden">
  <div style="flex:1 1 auto;padding:${pad}px;display:flex;flex-direction:column;justify-content:space-between;min-width:0">
    <div>
      <div style="font-weight:900;font-size:${big}px;color:#14532d;line-height:1.05;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${parentCode}</div>
      <div style="font-weight:700;font-size:${mid}px;color:#1e3a8a;margin-top:2px">🥚 ${eggCount}</div>
    </div>
    <div style="font-size:${small}px;color:#374151;line-height:1.35">
      <div>📅 Bertelur: ${tglStr}</div>
      <div>🐣 Menetas: ${hatchStr}</div>
    </div>
    <div style="background:${late ? "#fee2e2" : "#fef3c7"};border:1.5px solid ${late ? "#dc2626" : "#d97706"};border-radius:6px;padding:3px 6px;font-weight:900;font-size:${mid}px;color:${late ? "#991b1b" : "#92400e"};display:flex;align-items:center;gap:4px">
      ${late ? "⚠ " : ""}CANDLING: ${cdStr}
    </div>
    <div style="font-size:${small}px;color:#6b7280">📦 ${incubatorLine}${season ? ` · Musim ${season}` : ""}</div>
  </div>
  <div style="display:flex;align-items:center;justify-content:center;padding:${Math.round(size.h * 0.05)}px;flex-shrink:0">
    <img src="${qrDataUrl}" width="${qrPx}" height="${qrPx}" style="display:block" />
  </div>
</div>`;

  const container = document.createElement("div");
  container.style.cssText = "position:fixed;left:-9999px;top:0;z-index:-1;";
  container.innerHTML = html;
  document.body.appendChild(container);
  const h2c = (await import("html2canvas")).default;
  const canvas = await h2c(container.firstElementChild, {
    scale: 3, useCORS: true, backgroundColor: null, logging: false,
  });
  document.body.removeChild(container);
  return canvas.toDataURL("image/png");
}

export default function EggLabelGenerator({ breedings = [], open, onClose }) {
  const [sizeId, setSizeId] = useState("50x30");
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
            <p className="font-semibold mb-0.5">{breedings.length} label · ukuran {size.label} (203 DPI)</p>
            <p>QR berisi <span className="font-mono">BREED:&lt;id&gt;</span> — dipindai membuka rincian pembiakan.</p>
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
                    <img src={dataUrl} alt={kodeNama(breeding)} className="border rounded" style={{ height: 80 }} />
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
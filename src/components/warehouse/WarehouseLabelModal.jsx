/**
 * WarehouseLabelModal — cetak label barang gudang untuk printer thermal Niimbot.
 *
 * Label PNG 50×30mm MONOKROME (hitam-putih). Isi:
 *  - Strip kode kategori (OBT/VIT/ALT/dll) — dari prefix SKU, fallback kode kategori.
 *  - QR code berisi SKU (generate dari field sku).
 *  - Nama barang, SKU, fungsi singkat (dari notes, jika ada).
 *  - Baris "Exp: ____________" kosong untuk diisi manual.
 *
 * Barang tanpa SKU tetap ditampilkan; pada label ditandai "BELUM ADA SKU"
 * (tanpa QR). Tidak mengubah data/stok gudang — hanya menghasilkan gambar.
 *
 * Hasil: unduh PNG satuan, atau ZIP untuk banyak barang (impor ke app Niimbot).
 */
import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, Printer, Info, AlertTriangle } from "lucide-react";
import { downloadDataUrl, dataUrlToBytes, downloadZip } from "@/lib/zipDownload";

const CAT_CODE = {
  obat: "OBT",
  vitamin: "VIT",
  suplemen: "SPL",
  alat_kerja: "ALT",
  peralatan: "PRL",
  lainnya: "LNN",
};

// 50×30mm @ ~8px/mm (≈203 DPI)
const W = 400;
const H = 240;

function wrapText(ctx, text, maxWidth, maxLines) {
  const words = String(text).split(/\s+/);
  const lines = [];
  let line = "";
  for (const word of words) {
    const test = line ? line + " " + word : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = word;
      if (lines.length >= maxLines - 1) break;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  if (lines.length > maxLines) lines.length = maxLines;
  if (lines.length === maxLines) {
    let last = lines[maxLines - 1];
    while (last.length > 0 && ctx.measureText(last + "…").width > maxWidth) last = last.slice(0, -1);
    if (last !== lines[maxLines - 1]) lines[maxLines - 1] = last + "…";
  }
  return lines;
}

function truncateText(ctx, text, maxWidth) {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let t = text;
  while (t.length > 0 && ctx.measureText(t + "…").width > maxWidth) t = t.slice(0, -1);
  return t + "…";
}

async function renderWarehouseLabel(canvas, item) {
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, W, H);

  const sku = item.sku || "";
  const strip = (sku.split("-")[0] || "").toUpperCase() || CAT_CODE[item.category] || "LNN";
  const stripH = 26;

  // Strip kategori (hitam, teks putih)
  ctx.fillStyle = "#000000";
  ctx.fillRect(0, 0, W, stripH);
  ctx.fillStyle = "#ffffff";
  ctx.textBaseline = "middle";
  ctx.textAlign = "left";
  ctx.font = "bold 15px Arial";
  ctx.fillText(strip, 10, stripH / 2);
  ctx.font = "10px Arial";
  ctx.textAlign = "right";
  ctx.fillText("DUTA TORTOISE", W - 8, stripH / 2);

  // Area QR
  const padY = stripH + 10;
  const qrSize = 108;
  const qrX = 10;
  const qrY = padY;

  if (sku) {
    const qr = document.createElement("canvas");
    await QRCode.toCanvas(qr, sku, {
      width: qrSize,
      margin: 1,
      color: { dark: "#000000", light: "#ffffff" },
    });
    ctx.drawImage(qr, qrX, qrY, qrSize, qrSize);
  } else {
    ctx.strokeStyle = "#000000";
    ctx.lineWidth = 2;
    ctx.strokeRect(qrX, qrY, qrSize, qrSize);
    ctx.fillStyle = "#000000";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = "bold 12px Arial";
    ctx.fillText("BELUM", qrX + qrSize / 2, qrY + qrSize / 2 - 18);
    ctx.fillText("ADA SKU", qrX + qrSize / 2, qrY + qrSize / 2);
    ctx.font = "9px Arial";
    ctx.fillText("(tanpa QR)", qrX + qrSize / 2, qrY + qrSize / 2 + 18);
  }

  // Kolom teks
  const tx = qrX + qrSize + 12;
  const tw = W - tx - 10;
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.fillStyle = "#000000";

  // Nama barang (bold, max 2 baris)
  ctx.font = "bold 17px Arial";
  const nameLines = wrapText(ctx, item.name || "—", tw, 2);
  let y = padY;
  for (const line of nameLines) {
    ctx.fillText(line, tx, y);
    y += 20;
  }

  // SKU
  ctx.font = "13px monospace";
  ctx.fillText(sku ? `SKU: ${sku}` : "SKU: -", tx, padY + 52);

  // Fungsi singkat (dari notes, jika ada)
  if (item.notes) {
    ctx.font = "11px Arial";
    ctx.fillText(truncateText(ctx, item.notes, tw), tx, padY + 72);
  }

  // Baris Exp kosong
  ctx.font = "12px monospace";
  ctx.fillText("Exp: ____________", tx, padY + 92);
}

function fileName(item) {
  const base = (item.sku || item.name || "item").replace(/[^a-zA-Z0-9_-]+/g, "_");
  return `label-${base}.png`;
}

export default function WarehouseLabelModal({ open, items = [], onClose }) {
  const [previews, setPreviews] = useState([]);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    if (!open || !items.length) {
      setPreviews([]);
      return;
    }
    let cancelled = false;
    (async () => {
      setGenerating(true);
      const out = [];
      for (const item of items) {
        const c = document.createElement("canvas");
        await renderWarehouseLabel(c, item);
        if (cancelled) return;
        out.push({ item, dataUrl: c.toDataURL("image/png") });
      }
      if (!cancelled) {
        setPreviews(out);
        setGenerating(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, items]);

  const noSkuCount = items.filter((i) => !i.sku).length;

  const handleDownloadOne = (p) => downloadDataUrl(p.dataUrl, fileName(p.item));

  const handleDownloadAll = () => {
    if (previews.length === 0) return;
    if (previews.length === 1) {
      handleDownloadOne(previews[0]);
      return;
    }
    const files = previews.map((p) => ({ name: fileName(p.item), bytes: dataUrlToBytes(p.dataUrl) }));
    downloadZip(files, "label-gudang.zip");
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { onClose(); setPreviews([]); } }}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Printer className="w-5 h-5" /> Cetak Label Gudang
          </DialogTitle>
        </DialogHeader>

        {/* Instruksi Niimbot */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-800 flex gap-2">
          <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold mb-1">Cara cetak ke Niimbot:</p>
            <p>Download lalu impor ke app Niimbot untuk cetak. Pilih "Import Gambar" di app Niimbot, atur ukuran 50×30mm, lalu cetak.</p>
          </div>
        </div>

        {noSkuCount > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800 flex gap-2">
            <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <p>{noSkuCount} barang belum punya SKU — tetap dibuat labelnya namun tanpa QR (ditandai "BELUM ADA SKU").</p>
          </div>
        )}

        <div className="text-xs text-muted-foreground bg-muted/40 rounded-lg px-3 py-2">
          {items.length} item dipilih: {items.slice(0, 3).map((i) => i.name).join(", ")}
          {items.length > 3 ? ` ...+${items.length - 3} lainnya` : ""}
        </div>

        {generating ? (
          <div className="flex items-center justify-center py-10">
            <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
            <span className="ml-3 text-sm text-muted-foreground">Membuat label…</span>
          </div>
        ) : previews.length > 0 ? (
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <p className="text-sm font-semibold">{previews.length} label siap diunduh</p>
              <Button size="sm" onClick={handleDownloadAll}>
                <Download className="w-3.5 h-3.5 mr-1" />
                {previews.length > 1 ? "Download ZIP" : "Download PNG"}
              </Button>
            </div>
            <div className="space-y-3">
              {previews.map(({ item, dataUrl }, idx) => (
                <div key={idx} className="border rounded-lg p-3 flex items-center gap-3">
                  <img src={dataUrl} alt={item.name} className="border rounded bg-white" style={{ height: 72 }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{item.name}</p>
                    <p className="text-xs text-muted-foreground font-mono">
                      {item.sku ? `QR isi SKU: ${item.sku}` : "belum ada SKU (tanpa QR)"}
                    </p>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => handleDownloadOne({ item, dataUrl })}>
                    <Download className="w-3.5 h-3.5 mr-1" /> PNG
                  </Button>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        <div className="flex justify-end pt-1">
          <Button variant="outline" onClick={() => { onClose(); setPreviews([]); }}>Tutup</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
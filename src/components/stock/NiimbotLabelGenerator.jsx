import { useRef, useState } from "react";
import QRCode from "qrcode";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, Printer, Info } from "lucide-react";
import { formatRp } from "@/lib/skuUtils";

// Label sizes in mm → px at 203 DPI (1mm = 7.99px ≈ 8px)
const LABEL_SIZES = [
  { id: "50x30", label: "50 × 30 mm", w: 400, h: 240, showPrice: true },
  { id: "40x30", label: "40 × 30 mm", w: 320, h: 240, showPrice: true },
  { id: "30x15", label: "30 × 15 mm", w: 240, h: 120, showPrice: false },
];

async function renderLabel(canvas, item, size) {
  const ctx = canvas.getContext("2d");
  const { w, h, showPrice } = size;
  canvas.width = w;
  canvas.height = h;

  // Background
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, w, h);

  // Border
  ctx.strokeStyle = "#cccccc";
  ctx.lineWidth = 2;
  ctx.strokeRect(1, 1, w - 2, h - 2);

  // QR Code
  const qrSize = Math.round(h * 0.75);
  const qrCanvas = document.createElement("canvas");
  await QRCode.toCanvas(qrCanvas, item.sku || item.code || item.name, {
    width: qrSize,
    margin: 0,
    color: { dark: "#000000", light: "#ffffff" },
  });
  const qrX = 8;
  const qrY = Math.round((h - qrSize) / 2);
  ctx.drawImage(qrCanvas, qrX, qrY, qrSize, qrSize);

  // Text area
  const textX = qrX + qrSize + 10;
  const textW = w - textX - 8;
  ctx.fillStyle = "#111111";

  // Name (bold, wrap if needed)
  const nameFontSize = size.id === "30x15" ? 14 : 18;
  ctx.font = `bold ${nameFontSize}px Arial`;
  const maxNameW = textW;
  let name = item.name || "";
  while (ctx.measureText(name).width > maxNameW && name.length > 4) {
    name = name.slice(0, -1);
  }
  if (name !== item.name) name += "…";
  ctx.fillText(name, textX, size.id === "30x15" ? 32 : 52);

  // SKU
  const skuFontSize = size.id === "30x15" ? 10 : 12;
  ctx.font = `${skuFontSize}px monospace`;
  ctx.fillStyle = "#555555";
  const sku = item.sku || item.code || "-";
  ctx.fillText(sku, textX, size.id === "30x15" ? 50 : 76);

  // Price (only for larger labels)
  if (showPrice) {
    const price = item.price_per_unit || item.purchase_price;
    if (price) {
      ctx.font = "bold 13px Arial";
      ctx.fillStyle = "#1a6e2c";
      ctx.fillText(formatRp(price) + "/" + (item.unit || "pcs"), textX, 102);
    }
  }

  // Category badge at bottom
  ctx.font = "10px Arial";
  ctx.fillStyle = "#888888";
  ctx.fillText((item.category || "").toUpperCase(), textX, h - 14);
}

export default function NiimbotLabelGenerator({ items = [], open, onClose }) {
  const [selectedSize, setSelectedSize] = useState("50x30");
  const [previews, setPreviews] = useState([]);
  const [generating, setGenerating] = useState(false);
  const canvasRefs = useRef([]);

  const size = LABEL_SIZES.find((s) => s.id === selectedSize);

  const handleGenerate = async () => {
    setGenerating(true);
    const results = [];
    for (const item of items) {
      const canvas = document.createElement("canvas");
      await renderLabel(canvas, item, size);
      results.push({ item, dataUrl: canvas.toDataURL("image/png") });
    }
    setPreviews(results);
    setGenerating(false);
  };

  const handleDownload = (dataUrl, name) => {
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = `label-${name.replace(/\s+/g, "_")}-${selectedSize}.png`;
    a.click();
  };

  const handleDownloadAll = () => {
    previews.forEach(({ dataUrl, item }) => handleDownload(dataUrl, item.name));
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { onClose(); setPreviews([]); } }}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Printer className="w-5 h-5" />
            Buat Label Niimbot B21
          </DialogTitle>
        </DialogHeader>

        {/* Instructions */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-800 flex gap-2">
          <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold mb-1">Cara mencetak ke Niimbot B21:</p>
            <ol className="list-decimal ml-3 space-y-0.5">
              <li>Klik "Generate Label" lalu "Download PNG"</li>
              <li>Simpan gambar ke HP/komputer Anda</li>
              <li>Buka aplikasi <strong>Niimbot</strong> di HP</li>
              <li>Pilih "Import Gambar" → pilih file PNG yang diunduh</li>
              <li>Atur ukuran sesuai stiker → Cetak</li>
            </ol>
          </div>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium block mb-1">Pilih Ukuran Label</label>
            <Select value={selectedSize} onValueChange={setSelectedSize}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LABEL_SIZES.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.label} {!s.showPrice && "· tanpa harga"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="text-xs text-muted-foreground bg-muted/40 rounded-lg px-3 py-2">
            {items.length} item dipilih: {items.slice(0, 3).map(i => i.name).join(", ")}{items.length > 3 ? `... +${items.length - 3} lainnya` : ""}
          </div>

          <Button onClick={handleGenerate} disabled={generating} className="w-full">
            {generating ? "Generating..." : "⚡ Generate Label"}
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
              {previews.map(({ item, dataUrl }, idx) => (
                <div key={idx} className="border rounded-lg p-3 flex items-center gap-3">
                  <img src={dataUrl} alt={item.name} className="border rounded" style={{ height: 80 }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{item.name}</p>
                    <p className="text-xs text-muted-foreground font-mono">{item.sku || item.code}</p>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => handleDownload(dataUrl, item.name)}>
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
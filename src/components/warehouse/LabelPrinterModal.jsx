import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Printer, Eye, Check } from "lucide-react";

const PRINTER_TYPES = [
  { id: "thermal_58", label: "Thermal 58mm", desc: "Label kecil, 1 kolom", width: "58mm", height: "40mm", fontSize: "7pt", cols: 1, perPage: 1 },
  { id: "thermal_80", label: "Thermal 80mm", desc: "Label medium, standar", width: "80mm", height: "50mm", fontSize: "8pt", cols: 1, perPage: 1 },
  { id: "a4_grid", label: "Label A4 (Grid)", desc: "Banyak label per halaman (3×8)", width: "210mm", height: "297mm", fontSize: "7pt", cols: 3, perPage: 24 },
  { id: "label_100x150", label: "Label 100×150mm", desc: "Label besar, info lengkap", width: "100mm", height: "150mm", fontSize: "10pt", cols: 1, perPage: 1 },
];

function BarcodeCanvas({ text, width = 200, height = 50 }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!canvasRef.current || !text) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    canvas.width = width;
    canvas.height = height;
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, width, height);

    // Simple Code128 approximation — draw vertical bars representing characters
    const barWidth = width / (text.length * 11 + 20);
    let x = barWidth * 5;
    ctx.fillStyle = "#000";

    // Start bar
    ctx.fillRect(x, 4, barWidth * 2, height - 10); x += barWidth * 3;
    ctx.fillRect(x, 4, barWidth, height - 10); x += barWidth * 2;

    // Character bars (simplified visual representation)
    for (let i = 0; i < text.length; i++) {
      const code = text.charCodeAt(i);
      const pattern = [
        (code >> 5) & 1 ? barWidth * 2 : barWidth,
        barWidth,
        (code >> 4) & 1 ? barWidth * 2 : barWidth,
        barWidth,
        (code >> 3) & 1 ? barWidth * 2 : barWidth,
        barWidth * 1.5,
      ];
      pattern.forEach((w, idx) => {
        if (idx % 2 === 0) ctx.fillRect(x, 4, w, height - 10);
        x += w + barWidth * 0.3;
      });
    }
    // Stop bar
    ctx.fillRect(x, 4, barWidth * 2, height - 10);
  }, [text, width, height]);

  return <canvas ref={canvasRef} className="max-w-full" style={{ imageRendering: "pixelated" }} />;
}

function LabelPreview({ item, printerType }) {
  const p = PRINTER_TYPES.find(t => t.id === printerType) || PRINTER_TYPES[1];
  const isSmall = printerType === "thermal_58";
  const isLarge = printerType === "label_100x150";

  return (
    <div
      className="bg-white border-2 border-dashed border-gray-300 flex flex-col items-center justify-center p-3 mx-auto shadow"
      style={{
        width: isSmall ? "120px" : isLarge ? "200px" : "160px",
        minHeight: isSmall ? "80px" : isLarge ? "200px" : "100px",
        fontFamily: "monospace",
        fontSize: isSmall ? "7px" : isLarge ? "11px" : "8px",
      }}
    >
      <p className="font-bold text-center leading-tight" style={{ fontSize: isSmall ? "8px" : isLarge ? "12px" : "9px" }}>
        DUTA TORTOISE
      </p>
      <hr className="w-full border-gray-400 my-1" />
      <p className="font-bold text-center truncate w-full text-center">{item.name}</p>
      {item.code && <p className="text-center text-gray-600">{item.code}</p>}
      <div className="my-1 flex justify-center">
        <BarcodeCanvas text={item.code || item.name} width={isSmall ? 80 : isLarge ? 160 : 120} height={isSmall ? 24 : isLarge ? 40 : 30} />
      </div>
      <p className="text-center">Stok: {item.current_stock} {item.unit}</p>
      {item.expired_date && <p className="text-center text-red-600">Exp: {item.expired_date}</p>}
      {item.location && <p className="text-center text-gray-500">{item.location}</p>}
    </div>
  );
}

export default function LabelPrinterModal({ open, onClose, items = [] }) {
  const [printerType, setPrinterType] = useState(() => localStorage.getItem("last_printer") || "thermal_80");
  const [step, setStep] = useState("select"); // select | preview

  const p = PRINTER_TYPES.find(t => t.id === printerType);

  const handlePrint = () => {
    localStorage.setItem("last_printer", printerType);
    const isA4 = printerType === "a4_grid";
    const labelW = p.width;
    const labelH = p.height;
    const cols = p.cols;
    const fontSize = p.fontSize;

    const labelsHtml = items.map(item => `
      <div class="label">
        <div class="farm-name">DUTA TORTOISE</div>
        <hr />
        <div class="item-name">${item.name}</div>
        ${item.code ? `<div class="item-code">${item.code}</div>` : ""}
        <div class="barcode-placeholder">||||| ${item.code || item.name} |||||</div>
        <div class="stock">Stok: ${item.current_stock} ${item.unit}</div>
        ${item.expired_date ? `<div class="expired">Exp: ${item.expired_date}</div>` : ""}
        ${item.location ? `<div class="location">${item.location}</div>` : ""}
      </div>
    `).join("");

    const printHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8" />
        <title>Label Printer</title>
        <style>
          @media print {
            body { margin: 0; padding: 0; }
            .label-container { display: ${isA4 ? "grid" : "block"}; ${isA4 ? `grid-template-columns: repeat(${cols}, 1fr);` : ""} gap: 4px; padding: ${isA4 ? "8mm" : "2mm"}; }
            .label { 
              width: ${isA4 ? "auto" : labelW}; 
              height: ${isA4 ? "auto" : labelH};
              padding: 3mm; 
              border: 0.5pt solid #999;
              page-break-inside: avoid;
              font-family: monospace;
              font-size: ${fontSize};
              display: flex; flex-direction: column; align-items: center;
              text-align: center;
              ${isA4 ? "min-height: 30mm;" : ""}
            }
            .farm-name { font-weight: bold; font-size: calc(${fontSize} + 1pt); }
            .item-name { font-weight: bold; font-size: calc(${fontSize} + 0.5pt); margin: 1mm 0; }
            .item-code { color: #555; font-size: calc(${fontSize} - 0.5pt); }
            .barcode-placeholder { letter-spacing: 2px; font-size: calc(${fontSize} + 3pt); margin: 1.5mm 0; font-family: 'Libre Barcode 128', monospace; }
            .stock { font-size: ${fontSize}; }
            .expired { color: red; font-size: ${fontSize}; }
            .location { color: #888; font-size: calc(${fontSize} - 1pt); }
            hr { width: 100%; margin: 1mm 0; border-color: #999; }
          }
          body { font-family: monospace; }
        </style>
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Libre+Barcode+128&display=swap">
      </head>
      <body>
        <div class="label-container">${labelsHtml}</div>
        <script>window.onload = () => { window.print(); setTimeout(() => window.close(), 500); }</script>
      </body>
      </html>
    `;

    const win = window.open("", "_blank");
    win.document.write(printHtml);
    win.document.close();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Printer className="w-5 h-5 text-primary" />
            Cetak Label — {items.length} Item
          </DialogTitle>
        </DialogHeader>

        {step === "select" && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Pilih jenis printer yang akan digunakan:</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {PRINTER_TYPES.map(pt => (
                <button
                  key={pt.id}
                  onClick={() => setPrinterType(pt.id)}
                  className={`p-4 rounded-xl border-2 text-left transition-all ${printerType === pt.id ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"}`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <p className="font-semibold text-sm">{pt.label}</p>
                    {printerType === pt.id && <Check className="w-4 h-4 text-primary" />}
                  </div>
                  <p className="text-xs text-muted-foreground">{pt.desc}</p>
                  <p className="text-xs text-muted-foreground mt-1">{pt.width} × {pt.height}</p>
                </button>
              ))}
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={onClose}>Batal</Button>
              <Button onClick={() => setStep("preview")}>
                <Eye className="w-4 h-4 mr-2" /> Preview Label
              </Button>
            </div>
          </div>
        )}

        {step === "preview" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">Preview: {p?.label}</p>
              <button onClick={() => setStep("select")} className="text-xs text-primary hover:underline">← Ganti Printer</button>
            </div>
            <div className={`flex flex-wrap gap-3 justify-center p-4 bg-muted/30 rounded-xl max-h-80 overflow-y-auto`}>
              {items.map(item => (
                <LabelPreview key={item.id} item={item} printerType={printerType} />
              ))}
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={onClose}>Batal</Button>
              <Button onClick={handlePrint}>
                <Printer className="w-4 h-4 mr-2" /> Print Sekarang
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
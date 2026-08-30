import { useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";

function BarcodeCanvas({ value, id }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!canvasRef.current || !value) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const W = 280, H = 60;
    canvas.width = W;
    canvas.height = H;

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "#000000";

    const chars = value.split("");
    const totalBars = chars.length * 8 + 20;
    const barWidth = Math.max(1, Math.floor((W - 20) / totalBars));
    let x = 10;

    for (let i = 0; i < 3; i++) {
      if (i % 2 === 0) ctx.fillRect(x, 0, barWidth, H - 14);
      x += barWidth;
    }
    chars.forEach((c) => {
      const code = c.charCodeAt(0);
      for (let bit = 7; bit >= 0; bit--) {
        if ((code >> bit) & 1) ctx.fillRect(x, 0, barWidth, H - 14);
        x += barWidth;
      }
    });
    for (let i = 0; i < 3; i++) {
      if (i % 2 === 0) ctx.fillRect(x, 0, barWidth, H - 14);
      x += barWidth;
    }

    ctx.fillStyle = "#000";
    ctx.font = "10px monospace";
    ctx.textAlign = "center";
    ctx.fillText(value, W / 2, H - 2);
  }, [value]);

  return (
    <canvas
      ref={canvasRef}
      id={id}
      className="mx-auto block"
      style={{ imageRendering: "pixelated" }}
    />
  );
}

export default function BarcodeModal({ open, onClose, item }) {
  const handlePrint = () => {
    const canvas = document.getElementById("barcode-main-canvas");
    if (!canvas) return;
    const dataUrl = canvas.toDataURL("image/png");
    const win = window.open("", "_blank");
    win.document.write(`
      <html>
      <head>
        <title>Label - ${item?.name}</title>
        <style>
          @page { size: 50mm 30mm; margin: 0; }
          body { margin: 0; display: flex; align-items: center; justify-content: center; min-height: 100vh; font-family: sans-serif; }
          .label {
            width: 50mm; height: 30mm; border: 0.5px solid #ccc;
            padding: 2mm; box-sizing: border-box;
            display: flex; flex-direction: column; align-items: center; justify-content: center;
          }
          .name { font-size: 8pt; font-weight: bold; text-align: center; margin: 0 0 1mm; }
          .code { font-size: 6pt; color: #555; margin: 0; font-family: monospace; text-align: center; }
          .info { font-size: 5.5pt; color: #333; margin: 0.5mm 0 0; text-align: center; }
          .exp { color: #c00; font-weight: bold; }
          img { width: 46mm; height: auto; margin: 1mm 0; }
        </style>
      </head>
      <body onload="window.print();window.close()">
        <div class="label">
          <p class="name">${item?.name || ""}</p>
          <img src="${dataUrl}" />
          <p class="code">${item?.code || item?.name || ""}</p>
          <p class="info">Stok: ${item?.current_stock ?? ""} ${item?.unit || ""}</p>
          ${item?.expired_date ? `<p class="info exp">Exp: ${item.expired_date}</p>` : ""}
        </div>
      </body>
      </html>
    `);
    win.document.close();
  };

  if (!item) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Printer className="w-4 h-4" /> Cetak Label Barcode
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          {/* Preview label 5×3cm */}
          <div className="border-2 border-dashed border-muted-foreground/30 rounded-xl p-4 bg-card mx-auto" style={{ width: "200px" }}>
            <p className="text-xs font-bold text-center mb-1 truncate">{item.name}</p>
            <BarcodeCanvas value={item.code || item.name} id="barcode-main-canvas" />
            <p className="text-[10px] font-mono text-center text-muted-foreground mt-1">
              {item.code || item.name}
            </p>
            <p className="text-[10px] text-center text-muted-foreground">
              Stok: <strong>{item.current_stock}</strong> {item.unit}
            </p>
            {item.expired_date && (
              <p className="text-[10px] text-center text-red-600 font-medium">
                Exp: {item.expired_date}
              </p>
            )}
          </div>
          <p className="text-xs text-muted-foreground text-center">Preview label ukuran 5cm × 3cm</p>
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={onClose}>Tutup</Button>
            <Button className="flex-1 gap-2" onClick={handlePrint}>
              <Printer className="w-4 h-4" /> Cetak
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
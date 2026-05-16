import { useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";

// Simple barcode renderer using canvas (Code128-like visual)
function BarcodeCanvas({ value }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!canvasRef.current || !value) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const W = 300, H = 80;
    canvas.width = W;
    canvas.height = H;

    // Simple pattern: alternate bar widths based on char codes
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "#000000";

    const chars = value.split("");
    const totalBars = chars.length * 8 + 20;
    const barWidth = Math.floor((W - 20) / totalBars);
    let x = 10;

    // Start bars
    for (let i = 0; i < 3; i++) {
      if (i % 2 === 0) ctx.fillRect(x, 0, barWidth, H - 16);
      x += barWidth;
    }

    // Data bars
    chars.forEach((c) => {
      const code = c.charCodeAt(0);
      for (let bit = 7; bit >= 0; bit--) {
        if ((code >> bit) & 1) ctx.fillRect(x, 0, barWidth, H - 16);
        x += barWidth;
      }
    });

    // Stop bars
    for (let i = 0; i < 3; i++) {
      if (i % 2 === 0) ctx.fillRect(x, 0, barWidth, H - 16);
      x += barWidth;
    }

    // Text
    ctx.fillStyle = "#000";
    ctx.font = "11px monospace";
    ctx.textAlign = "center";
    ctx.fillText(value, W / 2, H - 3);
  }, [value]);

  return <canvas ref={canvasRef} className="mx-auto block" style={{ imageRendering: "pixelated" }} />;
}

export default function BarcodeModal({ open, onClose, item }) {
  const handlePrint = () => {
    const canvas = document.getElementById("barcode-canvas-print");
    if (!canvas) return;
    const dataUrl = canvas.toDataURL("image/png");
    const win = window.open("", "_blank");
    win.document.write(`
      <html><head><title>Barcode - ${item?.name}</title>
      <style>body{margin:0;display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;font-family:sans-serif;}
      .box{border:1px solid #ccc;padding:16px;text-align:center;width:320px;}
      h2{font-size:14px;margin:0 0 8px;}
      p{font-size:11px;color:#666;margin:4px 0;}
      </style></head>
      <body onload="window.print();window.close()">
      <div class="box">
        <h2>${item?.name || ""}</h2>
        ${item?.category ? `<p>${item.category}${item?.unit ? " · " + item.unit : ""}</p>` : ""}
        <img src="${dataUrl}" style="width:300px;height:80px;" />
        ${item?.supplier ? `<p>Supplier: ${item.supplier}</p>` : ""}
      </div>
      </body></html>
    `);
    win.document.close();
  };

  if (!item) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Printer className="w-4 h-4" /> Cetak Barcode
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="border rounded-xl p-4 bg-white">
            <p className="text-sm font-semibold text-center mb-1">{item.name}</p>
            {item.category && (
              <p className="text-xs text-muted-foreground text-center mb-3">
                {item.category}{item.unit ? ` · ${item.unit}` : ""}
              </p>
            )}
            <div id="barcode-canvas-print">
              <BarcodeCanvas value={item.code || item.name} />
            </div>
            <p className="text-xs text-muted-foreground text-center mt-2">
              Kode: <span className="font-mono font-bold">{item.code || item.name}</span>
            </p>
          </div>
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
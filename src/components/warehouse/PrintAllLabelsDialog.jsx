import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";

export default function PrintAllLabelsDialog({ open, onClose, items }) {
  const handlePrint = () => {
    const rows = items.map(item => {
      const barcodeValue = item.code || item.name;
      // Simple visual barcode from chars
      const bars = barcodeValue.split("").map(c => c.charCodeAt(0).toString(2).padStart(8, "0")).join("");
      const barsHtml = bars.split("").map(b =>
        `<span style="display:inline-block;width:2px;height:30px;background:${b === "1" ? "#000" : "#fff"};"></span>`
      ).join("");

      return `
        <div class="label">
          <p class="name">${item.name}</p>
          ${item.code ? `<p class="code">Kode: ${item.code}</p>` : ""}
          <div class="barcode">${barsHtml}</div>
          <p class="code">${barcodeValue}</p>
          <p class="info">Stok: ${item.current_stock} ${item.unit}</p>
          ${item.expired_date ? `<p class="info exp">Exp: ${item.expired_date}</p>` : ""}
        </div>
      `;
    }).join("");

    const win = window.open("", "_blank");
    win.document.write(`
      <html>
      <head>
        <title>Print Semua Label Gudang</title>
        <style>
          @page { size: auto; margin: 5mm; }
          body { margin: 0; font-family: sans-serif; }
          .grid { display: flex; flex-wrap: wrap; gap: 4mm; padding: 4mm; }
          .label {
            width: 50mm; height: 30mm; border: 1px solid #999;
            padding: 2mm; box-sizing: border-box; overflow: hidden;
            display: flex; flex-direction: column; align-items: center; justify-content: center;
            page-break-inside: avoid;
          }
          .name { font-size: 8pt; font-weight: bold; text-align: center; margin: 0 0 1mm 0; }
          .code { font-size: 6pt; color: #555; margin: 0; font-family: monospace; }
          .info { font-size: 6pt; margin: 0.5mm 0 0 0; }
          .exp { color: #c00; }
          .barcode { margin: 1mm 0; line-height: 0; }
        </style>
      </head>
      <body onload="window.print();window.close()">
        <div class="grid">${rows}</div>
      </body>
      </html>
    `);
    win.document.close();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Printer className="w-4 h-4" /> Cetak Semua Label
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <p className="text-sm text-muted-foreground">
            Akan mencetak <strong>{items.length} label</strong> ukuran 5cm × 3cm untuk seluruh item gudang yang tersaring saat ini.
          </p>
          <div className="p-3 rounded-xl bg-muted/40 text-xs text-muted-foreground">
            Setiap label berisi: nama, kode barcode, stok saat ini, satuan, dan tanggal kadaluarsa (jika ada).
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={onClose}>Batal</Button>
            <Button className="flex-1 gap-2" onClick={handlePrint}>
              <Printer className="w-4 h-4" /> Cetak Sekarang
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
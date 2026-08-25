import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Printer, Loader2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

const TEMPLATES = {
  tortoise_qr: {
    label: "🐢 Label QR Kura-kura (100×150mm)",
    size: "100mm 150mm",
    generate: (item) => `
      <div style="width:96mm;padding:4mm;font-family:sans-serif;text-align:center;">
        <p style="font-size:11pt;font-weight:bold;margin:0 0 2mm">DUTA TORTOISE 🐢</p>
        <div style="margin:3mm auto;width:52mm;height:52mm;background:#f0f0f0;display:flex;align-items:center;justify-content:center;font-size:9pt;color:#999;border:1px dashed #ccc;">[QR Code]</div>
        <p style="font-size:14pt;font-weight:bold;margin:2mm 0 1mm">${item?.name || "-"}</p>
        <p style="font-size:10pt;margin:0 0 2mm;color:#555">${item?.code || item?.id?.substring(0, 8) || ""}</p>
        <table style="width:100%;font-size:9pt;border-collapse:collapse;text-align:left;">
          <tr>
            <td style="padding:1mm 2mm;background:#f5f5f5;width:50%"><b>Morph</b><br>${item?.morph || "-"}</td>
            <td style="padding:1mm 2mm;width:50%"><b>Gender</b><br>${item?.gender || "-"}</td>
          </tr>
          <tr>
            <td style="padding:1mm 2mm"><b>Berat</b><br>${item?.weight_grams ? item.weight_grams + "g" : "-"}</td>
            <td style="padding:1mm 2mm;background:#f5f5f5"><b>Kandang</b><br>${item?.enclosure || "-"}</td>
          </tr>
          <tr>
            <td style="padding:1mm 2mm;background:#f5f5f5"><b>Tgl Lahir</b><br>${item?.birth_date || "-"}</td>
            <td style="padding:1mm 2mm"><b>Sumber</b><br>${item?.source || "-"}</td>
          </tr>
        </table>
        <p style="font-size:7pt;color:#aaa;margin:2mm 0 0">Dicetak: ${new Date().toLocaleDateString("id-ID")}</p>
      </div>
    `,
  },
  warehouse_barcode: {
    label: "📦 Label Barcode Gudang (50×30mm)",
    size: "50mm 30mm",
    generate: (item) => `
      <div style="width:46mm;padding:2mm;font-family:sans-serif;">
        <p style="font-size:6pt;margin:0;color:#666">Duta Tortoise</p>
        <p style="font-size:9pt;font-weight:bold;margin:1mm 0;line-height:1.2">${item?.name || "-"}</p>
        <div style="text-align:center;background:#f0f0f0;padding:2mm 1mm;font-size:8pt;color:#999;margin:1mm 0;">[Barcode: ${item?.code || item?.id?.substring(0,8) || "ITEM"}]</div>
        <div style="display:flex;justify-content:space-between;font-size:7pt;margin-top:1mm">
          <span>Stok: ${item?.current_stock ?? "-"} ${item?.unit || ""}</span>
          ${item?.expired_date ? `<span style="color:red">Exp: ${item.expired_date}</span>` : ""}
        </div>
      </div>
    `,
  },
  shipping: {
    label: "📮 Label Pengiriman (100×150mm)",
    size: "100mm 150mm",
    generate: (item) => `
      <div style="width:96mm;padding:4mm;font-family:sans-serif;">
        <div style="border-bottom:1px solid #333;padding-bottom:2mm;margin-bottom:2mm;">
          <p style="font-size:10pt;font-weight:bold;margin:0">DUTA TORTOISE 🐢</p>
          <p style="font-size:7pt;color:#666;margin:0">Jl. Peternakan No.1 | Tlp: -</p>
        </div>
        <p style="font-size:8pt;color:#666;margin:0 0 1mm">KEPADA:</p>
        <p style="font-size:13pt;font-weight:bold;margin:0 0 1mm">${item?.buyer_name || item?.name || "-"}</p>
        <p style="font-size:9pt;margin:0 0 1mm;line-height:1.4">${item?.buyer_address || item?.address || "-"}</p>
        <p style="font-size:9pt;margin:0 0 3mm">HP: ${item?.buyer_phone || item?.phone || "-"}</p>
        <div style="border-top:1px dashed #999;padding-top:2mm;font-size:8pt">
          <div style="display:flex;justify-content:space-between">
            <span>Order: ${item?.id?.substring(0,8) || "-"}</span>
            <span>${item?.sale_date || new Date().toLocaleDateString("id-ID")}</span>
          </div>
          <p style="margin:1mm 0">Isi: ${item?.tortoise_name || "Kura-kura"}</p>
        </div>
        <div style="text-align:center;margin-top:3mm;background:#f0f0f0;padding:4mm;font-size:8pt;color:#999;">[QR Tracking]</div>
      </div>
    `,
  },
  enclosure_id: {
    label: "🏠 Label Identitas Kandang (100×100mm)",
    size: "100mm 100mm",
    generate: (item) => `
      <div style="width:96mm;padding:4mm;font-family:sans-serif;text-align:center;">
        <p style="font-size:9pt;color:#666;margin:0 0 1mm">DUTA TORTOISE — KANDANG</p>
        <p style="font-size:28pt;font-weight:bold;margin:2mm 0">${item?.name || "-"}</p>
        <p style="font-size:11pt;margin:0 0 2mm;color:#555">${item?.location || ""}</p>
        <p style="font-size:11pt;margin:0 0 4mm">Kapasitas: ${item?.current_count || 0}/${item?.max_capacity || "-"}</p>
        <div style="background:#f0f0f0;padding:6mm;margin:0 auto;width:40mm;height:40mm;display:flex;align-items:center;justify-content:center;font-size:9pt;color:#999;">[QR List Kura-kura]</div>
        <p style="font-size:7pt;color:#aaa;margin:3mm 0 0">Scan QR untuk melihat isi kandang | Dicetak: ${new Date().toLocaleDateString("id-ID")}</p>
      </div>
    `,
  },
};

export default function PrintLabelModal({ open, onClose, defaultTemplate = "tortoise_qr", item = null }) {
  const [selectedPrinter, setSelectedPrinter] = useState(null);
  const [selectedTemplate, setSelectedTemplate] = useState(defaultTemplate);
  const [printing, setPrinting] = useState(false);
  const [fallbackShown, setFallbackShown] = useState(false);

  const { data: printers = [] } = useQuery({
    queryKey: ["printers"],
    queryFn: () => base44.entities.PrinterConfig.list("-updated_date"),
    enabled: open,
    onSuccess: (data) => {
      if (!selectedPrinter) {
        const def = data.find(p => p.is_default) || data[0];
        if (def) setSelectedPrinter(def.id);
      }
    },
  });

  const printer = printers.find(p => p.id === selectedPrinter) || printers.find(p => p.is_default) || printers[0];
  const template = TEMPLATES[selectedTemplate];

  const printViaUSB = () => {
    const tmpl = TEMPLATES[selectedTemplate];
    const size = tmpl.size;
    const content = tmpl.generate(item);
    const w = window.open("", "_blank", "width=500,height=600");
    w.document.write(`
      <html><head><title>Print Label</title>
      <style>
        @page { size: ${size}; margin: 0; }
        body { margin: 0; padding: 0; }
        * { box-sizing: border-box; }
      </style></head>
      <body>${content}<script>window.onload=()=>{window.print();window.close();}<\/script></body>
      </html>
    `);
    w.document.close();
  };

  const printViaNetwork = async () => {
    if (!printer?.ip_address) {
      toast.error("IP address printer tidak ditemukan");
      return;
    }
    try {
      await fetch(`http://${printer.ip_address}:${printer.port || 9100}/print`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ template: selectedTemplate, data: item }),
        signal: AbortSignal.timeout(5000),
      });
      toast.success(`Label dicetak ke ${printer.name}`);
    } catch {
      setFallbackShown(true);
    }
  };

  const handlePrint = async () => {
    if (!printer) { toast.error("Pilih printer terlebih dahulu"); return; }
    setPrinting(true);
    setFallbackShown(false);
    try {
      if (printer.connection_type === "usb_dialog") {
        printViaUSB();
        toast.success("Dialog print dibuka");
        onClose();
      } else {
        await printViaNetwork();
      }
    } finally {
      setPrinting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Printer className="w-5 h-5 text-primary" /> Print Label
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Printer selector */}
          <div className="space-y-1.5">
            <Label className="text-xs">Pilih Printer</Label>
            {printers.length === 0 ? (
              <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                Belum ada printer dikonfigurasi. Buka Pengaturan → Konfigurasi Printer.
              </div>
            ) : (
              <Select value={selectedPrinter || ""} onValueChange={setSelectedPrinter}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="Pilih printer..." />
                </SelectTrigger>
                <SelectContent>
                  {printers.map(p => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.is_default ? "⭐ " : ""}{p.name} ({p.connection_type === "usb_dialog" ? "🔌 USB" : p.connection_type === "lan" ? "🔗 LAN" : "📶 WiFi"})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Template selector */}
          <div className="space-y-1.5">
            <Label className="text-xs">Template Label</Label>
            <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
              <SelectTrigger className="h-9 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(TEMPLATES).map(([k, t]) => (
                  <SelectItem key={k} value={k}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Preview */}
          {template && item && (
            <div className="space-y-1.5">
              <Label className="text-xs">Preview (tidak akurat skala)</Label>
              <div
                className="border border-border rounded-lg overflow-auto bg-white p-2 max-h-40"
                style={{ fontSize: "60%" }}
                dangerouslySetInnerHTML={{ __html: template.generate(item) }}
              />
            </div>
          )}

          {/* Fallback offer */}
          {fallbackShown && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 space-y-2">
              <p className="text-xs font-semibold text-red-700 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5" /> Printer jaringan tidak merespons
              </p>
              <p className="text-xs text-red-600">Cek IP, printer menyala, dan print bridge aktif.</p>
              <Button size="sm" variant="outline" className="w-full gap-2 border-red-300 text-red-700 hover:bg-red-50" onClick={printViaUSB}>
                <Printer className="w-3.5 h-3.5" /> Cetak via Browser sebagai gantinya
              </Button>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose}>Batal</Button>
          <Button onClick={handlePrint} disabled={printing || !printer} className="gap-2">
            {printing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Printer className="w-4 h-4" />}
            {printing ? "Mencetak..." : `Cetak ke ${printer?.name || "Printer"}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
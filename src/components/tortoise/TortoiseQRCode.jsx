import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Download, ExternalLink, Loader2 } from "lucide-react";
import QRCode from "qrcode";

/**
 * QR kura — dibuat lokal saat dibutuhkan, tidak disimpan ke database.
 *
 * Sebelumnya QR diambil dari layanan pihak ketiga (api.qrserver.com) dan URL-nya
 * disimpan ke field `qr_code_url` tiap kura. Dua masalah:
 *   1. Label gagal tercetak kalau internet mati atau layanan itu berubah.
 *   2. 142 record menyimpan data yang sebenarnya bisa dihitung dari ID kura.
 *
 * Sekarang QR digambar di perangkat memakai pustaka `qrcode` (sudah dipakai
 * label telur), sehingga selalu akurat dan tidak ada data yang bisa basi.
 */
export default function TortoiseQRCode({ tortoise }) {
  const [qrDataUrl, setQrDataUrl] = useState("");
  const profileUrl = `${window.location.origin}/passport?id=${tortoise.id}`;

  useEffect(() => {
    let cancelled = false;
    QRCode.toDataURL(profileUrl, { width: 300, margin: 1, errorCorrectionLevel: "M" })
      .then((url) => { if (!cancelled) setQrDataUrl(url); })
      .catch(() => { if (!cancelled) setQrDataUrl(""); });
    return () => { cancelled = true; };
  }, [profileUrl]);

  const handleDownload = () => {
    if (!qrDataUrl) return;
    const a = document.createElement("a");
    a.href = qrDataUrl;
    a.download = `QR-${tortoise.name || tortoise.id}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handlePrint = () => {
    if (!qrDataUrl) return;
    const win = window.open("", "_blank");
    win.document.write(`
      <html><head><title>Label QR — ${tortoise.name}</title>
      <style>
        @page { size: 50mm 30mm; margin: 0; }
        body { margin: 0; font-family: Arial, sans-serif; }
        .label { width: 50mm; height: 30mm; display: flex; align-items: center;
                 gap: 2mm; padding: 2mm; box-sizing: border-box; }
        .qr { width: 24mm; height: 24mm; }
        .info { flex: 1; min-width: 0; }
        .nm { font-size: 11pt; font-weight: bold; margin: 0; line-height: 1.1;
              overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .sub { font-size: 6pt; color: #444; margin: 1mm 0 0; line-height: 1.2; }
      </style></head><body>
      <div class="label">
        <img class="qr" src="${qrDataUrl}" />
        <div class="info">
          <p class="nm">${tortoise.name || ""}</p>
          ${tortoise.enclosure ? `<p class="sub">Kandang: ${tortoise.enclosure}</p>` : ""}
          <p class="sub">Duta Tortoise Farm</p>
        </div>
      </div>
      <script>window.onload=()=>{window.print();}<\/script>
      </body></html>
    `);
    win.document.close();
  };

  if (!qrDataUrl) {
    return (
      <div className="flex items-center justify-center py-10 text-muted-foreground">
        <Loader2 className="w-5 h-5 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="border-2 border-border rounded-xl p-3 bg-white">
        <img src={qrDataUrl} alt={`QR ${tortoise.name}`} className="w-48 h-48 object-contain" />
      </div>

      <div className="text-center">
        <p className="text-xs text-muted-foreground font-medium">{tortoise.name}</p>
        {tortoise.enclosure && <p className="text-xs text-muted-foreground">Kandang {tortoise.enclosure}</p>}
      </div>

      <div className="text-xs text-muted-foreground text-center break-all px-2 bg-muted/30 rounded-lg p-2">
        <ExternalLink className="inline w-3 h-3 mr-1" />
        {profileUrl}
      </div>

      <div className="flex gap-2 w-full">
        <Button variant="outline" size="sm" className="flex-1 gap-1.5" onClick={handleDownload}>
          <Download className="w-3.5 h-3.5" /> Unduh
        </Button>
        <Button variant="outline" size="sm" className="flex-1 gap-1.5" onClick={handlePrint}>
          🖨️ Cetak Label
        </Button>
      </div>
    </div>
  );
}

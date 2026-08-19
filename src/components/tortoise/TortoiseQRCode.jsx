import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { QrCode, Download, Loader2, ExternalLink } from "lucide-react";
import { base44 } from "@/api/base44Client";

// QR code menggunakan API gratis qrserver.com
function getQRUrl(text, size = 200) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(text)}&format=png&margin=10`;
}

export default function TortoiseQRCode({ tortoise }) {
  const [profileUrl, setProfileUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    // Buat URL publik profil kura-kura (berbasis domain saat ini)
    const base = window.location.origin;
    // Paspor kura membaca ?id= (lihat TortoisePassport.jsx).
    // Sebelumnya QR menunjuk /tortoise-profile/<id> yang tidak punya route sama sekali,
    // sehingga semua QR yang sudah tercetak mengarah ke halaman kosong.
    const url = `${base}/passport?id=${tortoise.id}`;
    setProfileUrl(url);
  }, [tortoise.id]);

  const qrImageUrl = profileUrl ? getQRUrl(profileUrl, 300) : "";

  const handleSaveQR = async () => {
    if (!qrImageUrl || saving) return;
    setSaving(true);
    try {
      // Update field qr_code_url di entity Tortoise
      await base44.entities.Tortoise.update(tortoise.id, { qr_code_url: qrImageUrl });
      setSaved(true);
    } catch (_) {}
    setSaving(false);
  };

  const handleDownload = () => {
    if (!qrImageUrl) return;
    const a = document.createElement("a");
    a.href = qrImageUrl;
    a.download = `QR-${tortoise.name || tortoise.id}.png`;
    a.target = "_blank";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handlePrint = () => {
    const win = window.open("", "_blank");
    win.document.write(`
      <html><head><title>Label QR — ${tortoise.name}</title>
      <style>
        body { font-family: Arial, sans-serif; text-align: center; padding: 20px; }
        .label { border: 2px solid #333; display: inline-block; padding: 16px 20px; border-radius: 8px; }
        h2 { margin: 0 0 4px; font-size: 18px; }
        p { margin: 2px 0; font-size: 12px; color: #555; }
        img { margin-top: 8px; }
      </style></head><body>
      <div class="label">
        <h2>${tortoise.name}</h2>
        ${tortoise.code ? `<p>Kode: ${tortoise.code}</p>` : ""}
        ${tortoise.morph && tortoise.morph !== "normal" ? `<p>Morph: ${tortoise.morph}</p>` : ""}
        <img src="${qrImageUrl}" width="200" height="200" />
        <p style="margin-top:8px; font-size:10px; color:#888;">Scan untuk profil lengkap</p>
      </div>
      <script>window.onload=()=>window.print();</script>
      </body></html>
    `);
    win.document.close();
  };

  if (!profileUrl) return null;

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="border-2 border-border rounded-xl p-3 bg-white">
        <img
          src={qrImageUrl}
          alt={`QR Code ${tortoise.name}`}
          className="w-48 h-48 object-contain"
          loading="lazy"
        />
      </div>

      <div className="text-center">
        <p className="text-xs text-muted-foreground font-medium">{tortoise.name}</p>
        {tortoise.code && <p className="text-xs text-muted-foreground">{tortoise.code}</p>}
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
          🖨️ Print Label
        </Button>
      </div>

      {!tortoise.qr_code_url && (
        <Button
          size="sm"
          className="w-full gap-2 bg-primary"
          onClick={handleSaveQR}
          disabled={saving || saved}
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <QrCode className="w-4 h-4" />}
          {saved ? "✓ QR Tersimpan" : "Simpan QR ke Data Kura-Kura"}
        </Button>
      )}
      {tortoise.qr_code_url && (
        <p className="text-xs text-green-600 font-medium">✓ QR sudah tersimpan di data kura-kura</p>
      )}
    </div>
  );
}
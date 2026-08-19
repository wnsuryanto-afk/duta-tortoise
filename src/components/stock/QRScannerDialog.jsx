import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { QrCode } from "lucide-react";
import { useNavigate } from "react-router-dom";

/**
 * QR Scanner dialog using html5-qrcode.
 * onResult(sku: string) - called when a QR code is scanned or manual SKU is submitted.
 */
export default function QRScannerDialog({ open, onClose, onResult }) {
  const [mode, setMode] = useState("camera"); // "camera" | "manual"
  const [manualSku, setManualSku] = useState("");
  const [error, setError] = useState("");
  const scannerRef = useRef(null);
  const scannerDivId = "qr-scanner-container";
  const navigate = useNavigate();

  // Pemindai mengenali awalan "BREED:" → buka rincian pembiakan
  const handleDecoded = (text) => {
    const t = (text || "").trim();
    if (t.toUpperCase().startsWith("BREED:")) {
      const breedId = t.slice(6).trim();
      handleClose();
      navigate(`/breeding/${breedId}`);
      return;
    }
    // QR kura berisi URL penuh menuju paspor -> ambil id-nya dan buka di dalam aplikasi
    if (t.includes("/passport?id=")) {
      const id = t.split("/passport?id=")[1].split(/[&#\s]/)[0];
      handleClose();
      navigate(`/passport?id=${id}`);
      return;
    }
    onResult(t.toUpperCase());
    handleClose();
  };

  useEffect(() => {
    if (!open || mode !== "camera") return;

    let scanner;
    const timeout = setTimeout(async () => {
      try {
        scanner = new Html5Qrcode(scannerDivId);
        scannerRef.current = scanner;
        await scanner.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 220, height: 220 } },
          (decodedText) => {
            handleDecoded(decodedText);
          },
          () => {}
        );
      } catch (err) {
        setError("Kamera tidak dapat diakses. Gunakan input manual.");
        setMode("manual");
      }
    }, 300);

    return () => {
      clearTimeout(timeout);
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {});
        scannerRef.current = null;
      }
    };
  }, [open, mode]);

  const handleClose = () => {
    if (scannerRef.current) {
      scannerRef.current.stop().catch(() => {});
      scannerRef.current = null;
    }
    setError("");
    setManualSku("");
    onClose();
  };

  const handleManualSubmit = (e) => {
    e.preventDefault();
    if (!manualSku.trim()) return;
    handleDecoded(manualSku.trim());
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <QrCode className="w-5 h-5" />
            Scan Barang
          </DialogTitle>
        </DialogHeader>

        <div className="flex gap-2 mb-3">
          <button
            onClick={() => { setMode("camera"); setError(""); }}
            className={`flex-1 py-2 text-xs rounded-lg border font-medium transition-colors ${mode === "camera" ? "bg-primary text-primary-foreground border-primary" : "bg-background border-border"}`}
          >
            📷 Kamera
          </button>
          <button
            onClick={() => { setMode("manual"); }}
            className={`flex-1 py-2 text-xs rounded-lg border font-medium transition-colors ${mode === "manual" ? "bg-primary text-primary-foreground border-primary" : "bg-background border-border"}`}
          >
            ⌨️ Manual SKU
          </button>
        </div>

        {mode === "camera" && (
          <div className="space-y-3">
            {error && (
              <div className="text-xs text-red-600 bg-red-50 rounded-lg p-2">{error}</div>
            )}
            <div
              id={scannerDivId}
              className="w-full rounded-lg overflow-hidden bg-black"
              style={{ minHeight: 260 }}
            />
            <p className="text-xs text-center text-muted-foreground">
              Arahkan kamera ke QR code pada label barang
            </p>
          </div>
        )}

        {mode === "manual" && (
          <form onSubmit={handleManualSubmit} className="space-y-3">
            <div>
              <label className="text-xs font-medium block mb-1">Masukkan SKU</label>
              <Input
                value={manualSku}
                onChange={(e) => setManualSku(e.target.value)}
                placeholder="cth: PKN-0001 atau OBT-0023"
                className="font-mono"
                autoFocus
              />
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="outline" className="flex-1" onClick={handleClose}>Batal</Button>
              <Button type="submit" className="flex-1" disabled={!manualSku.trim()}>Cari Barang</Button>
            </div>
          </form>
        )}

        {mode === "camera" && (
          <Button variant="outline" className="w-full" onClick={handleClose}>Tutup</Button>
        )}
      </DialogContent>
    </Dialog>
  );
}
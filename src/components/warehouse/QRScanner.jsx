import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { QrCode, X } from "lucide-react";

export default function QRScanner({ onResult, onClose }) {
  const videoRef = useRef(null);
  const [manualCode, setManualCode] = useState("");
  const [error, setError] = useState("");
  const [scanning, setScanning] = useState(false);
  const intervalRef = useRef(null);
  const streamRef = useRef(null);

  const startCamera = async () => {
    setError("");
    setScanning(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" }
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch (e) {
      setError("Tidak bisa mengakses kamera. Gunakan input manual.");
      setScanning(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    setScanning(false);
  };

  useEffect(() => {
    return () => stopCamera();
  }, []);

  // Use BarcodeDetector API if available
  useEffect(() => {
    if (!scanning || !videoRef.current) return;

    if ("BarcodeDetector" in window) {
      const detector = new window.BarcodeDetector({ formats: ["qr_code", "code_128", "code_39", "ean_13"] });
      intervalRef.current = setInterval(async () => {
        if (!videoRef.current) return;
        try {
          const barcodes = await detector.detect(videoRef.current);
          if (barcodes.length > 0) {
            clearInterval(intervalRef.current);
            stopCamera();
            onResult(barcodes[0].rawValue);
          }
        } catch (e) {}
      }, 500);
    }

    return () => clearInterval(intervalRef.current);
  }, [scanning]);

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <QrCode className="w-5 h-5" /> Scan Barcode / QR Code
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {scanning ? (
            <div className="relative">
              <video
                ref={videoRef}
                className="w-full rounded-xl aspect-square object-cover bg-black"
                autoPlay
                muted
                playsInline
              />
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-48 h-48 border-2 border-white/60 rounded-xl" />
              </div>
              <Button
                variant="outline"
                size="sm"
                className="absolute top-2 right-2 bg-white/80"
                onClick={stopCamera}
              >
                <X className="w-4 h-4" />
              </Button>
              {!("BarcodeDetector" in window) && (
                <p className="text-xs text-center text-muted-foreground mt-2">
                  Browser ini tidak mendukung deteksi otomatis. Masukkan kode manual di bawah.
                </p>
              )}
            </div>
          ) : (
            <div className="text-center space-y-3">
              <div className="w-20 h-20 bg-muted rounded-2xl flex items-center justify-center mx-auto">
                <QrCode className="w-10 h-10 text-muted-foreground" />
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button onClick={startCamera} className="w-full">
                Buka Kamera
              </Button>
            </div>
          )}

          <div className="relative flex items-center gap-2">
            <div className="flex-1 h-px bg-border" />
            <span className="text-xs text-muted-foreground">atau ketik manual</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          <div className="flex gap-2">
            <Input
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
              placeholder="Masukkan kode barang..."
              onKeyDown={(e) => {
                if (e.key === "Enter" && manualCode.trim()) {
                  stopCamera();
                  onResult(manualCode.trim());
                }
              }}
            />
            <Button
              onClick={() => { if (manualCode.trim()) { stopCamera(); onResult(manualCode.trim()); } }}
              disabled={!manualCode.trim()}
            >
              Cari
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
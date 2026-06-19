import { useState, useRef, useCallback, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Camera, RotateCcw, Check, Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";

export default function SelfieCaptureDialog({ open, onClose, onCapture, title = "Ambil Selfie" }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const [captured, setCaptured] = useState(null);
  const [capturedBlob, setCapturedBlob] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const [cameraReady, setCameraReady] = useState(false);

  const startCamera = useCallback(async () => {
    setError(null);
    setCameraReady(false);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current.play();
          setCameraReady(true);
        };
      }
    } catch {
      setError("Tidak bisa mengakses kamera. Izinkan akses kamera di pengaturan browser/HP.");
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    setCameraReady(false);
  }, []);

  useEffect(() => {
    if (open) {
      setCaptured(null);
      setCapturedBlob(null);
      setError(null);
      startCamera();
    } else {
      stopCamera();
    }
    return () => stopCamera();
  }, [open, startCamera, stopCamera]);

  const handleCapture = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    // Mirror horizontally for selfie
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0);
    canvas.toBlob((blob) => {
      if (blob) {
        setCaptured(URL.createObjectURL(blob));
        setCapturedBlob(blob);
        stopCamera();
      }
    }, "image/jpeg", 0.8);
  };

  const handleRetake = () => {
    if (captured) URL.revokeObjectURL(captured);
    setCaptured(null);
    setCapturedBlob(null);
    startCamera();
  };

  const handleConfirm = async () => {
    if (!capturedBlob) return;
    setUploading(true);
    try {
      const file = new File([capturedBlob], `selfie_${Date.now()}.jpg`, { type: "image/jpeg" });
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      onCapture(file_url);
      onClose();
    } catch {
      setError("Gagal upload foto. Coba lagi.");
    } finally {
      setUploading(false);
    }
  };

  const handleClose = () => {
    stopCamera();
    if (captured) URL.revokeObjectURL(captured);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={v => !v && handleClose()}>
      <DialogContent className="max-w-sm p-0 overflow-hidden">
        <DialogHeader className="px-4 pt-4 pb-2">
          <DialogTitle className="flex items-center gap-2 text-base">
            <Camera className="w-5 h-5" /> {title}
          </DialogTitle>
        </DialogHeader>

        <div className="px-4 pb-4 space-y-3">
          {error && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {error}
            </div>
          )}

          {!captured ? (
            <>
              <div className="relative rounded-xl overflow-hidden bg-black aspect-[4/3]">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                  style={{ transform: "scaleX(-1)" }}
                />
                {!cameraReady && !error && (
                  <div className="absolute inset-0 flex items-center justify-center bg-gray-900/80">
                    <Loader2 className="w-8 h-8 text-white animate-spin" />
                  </div>
                )}
              </div>
              <canvas ref={canvasRef} className="hidden" />
              <p className="text-xs text-center text-gray-400">Pastikan wajah terlihat jelas 📸</p>
              <Button
                onClick={handleCapture}
                disabled={!cameraReady}
                className="w-full gap-2 py-6 text-base font-bold"
              >
                <Camera className="w-5 h-5" /> Ambil Foto
              </Button>
            </>
          ) : (
            <>
              <div className="rounded-xl overflow-hidden bg-black aspect-[4/3]">
                <img src={captured} alt="Selfie" className="w-full h-full object-cover" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" onClick={handleRetake} disabled={uploading} className="gap-2">
                  <RotateCcw className="w-4 h-4" /> Ulangi
                </Button>
                <Button onClick={handleConfirm} disabled={uploading} className="gap-2">
                  {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  {uploading ? "Upload..." : "Gunakan"}
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
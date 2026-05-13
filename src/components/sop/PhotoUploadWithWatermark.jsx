import { useState, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Camera, X, Loader2, CheckCircle2 } from "lucide-react";

/**
 * Upload foto dengan watermark otomatis menggunakan Canvas.
 * Watermark berisi: nama karyawan, tanggal & jam, nama task, dan "Sulcata Farm".
 */
export default function PhotoUploadWithWatermark({ taskTitle, employeeName, onUploaded, photoUrl }) {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState(photoUrl || null);
  const inputRef = useRef();

  const applyWatermark = (file) => {
    return new Promise((resolve) => {
      const img = new Image();
      const reader = new FileReader();
      reader.onload = (e) => {
        img.src = e.target.result;
        img.onload = () => {
          const canvas = document.createElement("canvas");
          const MAX = 1200;
          let w = img.width;
          let h = img.height;
          if (w > MAX) { h = Math.round(h * MAX / w); w = MAX; }
          if (h > MAX) { w = Math.round(w * MAX / h); h = MAX; }
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext("2d");

          // Draw image
          ctx.drawImage(img, 0, 0, w, h);

          // Watermark overlay background
          const barH = Math.max(56, h * 0.13);
          ctx.fillStyle = "rgba(0, 0, 0, 0.55)";
          ctx.fillRect(0, h - barH, w, barH);

          // Text styles
          const baseFontSize = Math.max(13, Math.round(w * 0.022));
          const smallFontSize = Math.max(11, Math.round(w * 0.018));

          // Line 1: Task title
          ctx.fillStyle = "#FFD700";
          ctx.font = `bold ${baseFontSize}px Arial`;
          ctx.fillText(`✓ ${taskTitle}`, 12, h - barH + baseFontSize + 6);

          // Line 2: Employee + date/time
          const now = new Date();
          const dateStr = now.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
          const timeStr = now.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
          ctx.fillStyle = "#FFFFFF";
          ctx.font = `${smallFontSize}px Arial`;
          ctx.fillText(`${employeeName}  •  ${dateStr} ${timeStr}`, 12, h - barH + baseFontSize + 6 + smallFontSize + 6);

          // Line 3: Brand
          ctx.fillStyle = "rgba(255,255,255,0.55)";
          ctx.font = `italic ${smallFontSize - 1}px Arial`;
          ctx.fillText("Sulcata Farm Manager", 12, h - barH + baseFontSize + 6 + smallFontSize * 2 + 10);

          // Bottom-right timestamp
          ctx.fillStyle = "rgba(255,255,255,0.7)";
          ctx.font = `${smallFontSize - 1}px Arial`;
          const tsText = `${dateStr} ${timeStr}`;
          const tsW = ctx.measureText(tsText).width;
          ctx.fillText(tsText, w - tsW - 10, h - 8);

          canvas.toBlob((blob) => resolve(blob), "image/jpeg", 0.88);
        };
      };
      reader.readAsDataURL(file);
    });
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);

    const watermarkedBlob = await applyWatermark(file);
    const watermarkedFile = new File([watermarkedBlob], file.name, { type: "image/jpeg" });

    // Show local preview immediately
    setPreview(URL.createObjectURL(watermarkedBlob));

    const { file_url } = await base44.integrations.Core.UploadFile({ file: watermarkedFile });
    onUploaded(file_url);
    setPreview(file_url);
    setUploading(false);
  };

  const handleRemove = () => {
    setPreview(null);
    onUploaded(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  if (preview) {
    return (
      <div className="ml-7 relative inline-block">
        <img src={preview} alt="Bukti" className="h-24 w-36 object-cover rounded-lg border" />
        <button
          onClick={handleRemove}
          className="absolute -top-2 -right-2 w-5 h-5 bg-destructive text-white rounded-full flex items-center justify-center"
        >
          <X className="w-3 h-3" />
        </button>
        <div className="absolute bottom-1 right-1">
          <CheckCircle2 className="w-4 h-4 text-green-400 drop-shadow" />
        </div>
      </div>
    );
  }

  return (
    <div className="ml-7">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFileChange}
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-8 text-xs border-dashed"
        disabled={uploading}
        onClick={() => inputRef.current?.click()}
      >
        {uploading ? (
          <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />Memproses...</>
        ) : (
          <><Camera className="w-3.5 h-3.5 mr-1.5" />Upload Foto Bukti</>
        )}
      </Button>
    </div>
  );
}
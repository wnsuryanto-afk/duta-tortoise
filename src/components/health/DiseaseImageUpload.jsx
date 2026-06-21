import { useState, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Upload, Link as LinkIcon, Camera } from "lucide-react";
import { toast } from "sonner";
import { compressImage } from "@/lib/useImageCompression";

/**
 * Komponen upload gambar untuk DiagnosisProtocol.
 * Tab 1: Upload dari galeri (file picker). Tab 2: Paste URL.
 */
export default function DiseaseImageUpload({ protocolId, onSaved }) {
  const [mode, setMode] = useState("upload"); // "upload" | "url"
  const [uploading, setUploading] = useState(false);
  const [urlInput, setUrlInput] = useState("");
  const [captionInput, setCaptionInput] = useState("");
  const fileRef = useRef(null);

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.match(/^image\/(jpeg|jpg|png|webp)$/)) {
      toast.error("Format harus JPG, PNG, atau WEBP");
      e.target.value = "";
      return;
    }

    setUploading(true);
    try {
      // Kompres dulu
      let fileToUpload = file;
      if (file.size > 500 * 1024) {
        try {
          const result = await compressImage(file, { maxWidthOrHeight: 1280, quality: 0.8 });
          fileToUpload = result.file;
        } catch {
          // fallback: pakai file asli jika kompresi gagal
        }
      }

      const { file_url } = await base44.integrations.Core.UploadFile({ file: fileToUpload });
      await base44.entities.DiagnosisProtocol.update(protocolId, { image_url: file_url });
      onSaved?.(file_url);
      toast.success("Gambar berhasil diupload!");
    } catch (err) {
      toast.error("Gagal upload: " + (err?.message || ""));
    }
    setUploading(false);
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleSaveUrl = async () => {
    if (!urlInput.trim()) return;
    setUploading(true);
    try {
      await base44.entities.DiagnosisProtocol.update(protocolId, {
        image_url: urlInput.trim(),
        image_caption: captionInput.trim(),
      });
      onSaved?.(urlInput.trim());
      setUrlInput("");
      setCaptionInput("");
      toast.success("URL gambar disimpan!");
    } catch (err) {
      toast.error("Gagal menyimpan: " + (err?.message || ""));
    }
    setUploading(false);
  };

  return (
    <div className="w-full max-w-md space-y-3">
      {/* Tab toggle */}
      <div className="flex gap-1 p-1 bg-muted rounded-lg">
        <button
          onClick={() => setMode("upload")}
          className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
            mode === "upload" ? "bg-background shadow-sm text-primary" : "text-muted-foreground"
          }`}
        >
          <Camera className="w-3.5 h-3.5" /> Upload dari Galeri
        </button>
        <button
          onClick={() => setMode("url")}
          className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
            mode === "url" ? "bg-background shadow-sm text-primary" : "text-muted-foreground"
          }`}
        >
          <LinkIcon className="w-3.5 h-3.5" /> Tempel URL
        </button>
      </div>

      {mode === "upload" ? (
        <div className="space-y-2">
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/jpg,image/png,image/webp"
            className="hidden"
            onChange={handleFileSelect}
            disabled={uploading}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-full gap-2"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            {uploading ? "Mengupload..." : "Pilih Foto dari Galeri"}
          </Button>
          <p className="text-xs text-muted-foreground text-center">
            Format: JPG, PNG, WEBP — otomatis dikompres
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          <Input
            type="url"
            placeholder="https://..."
            value={urlInput}
            onChange={e => setUrlInput(e.target.value)}
            disabled={uploading}
          />
          <Input
            type="text"
            placeholder="Caption / sumber gambar (opsional)"
            value={captionInput}
            onChange={e => setCaptionInput(e.target.value)}
            disabled={uploading}
          />
          <Button
            type="button"
            size="sm"
            className="w-full gap-2"
            onClick={handleSaveUrl}
            disabled={uploading || !urlInput.trim()}
          >
            {uploading && <Loader2 className="w-4 h-4 animate-spin" />}
            Simpan URL
          </Button>
        </div>
      )}
    </div>
  );
}
import { useState } from "react";
import { fileToCompressedBase64 } from "@/lib/aiImageBase64";
import { X, ImagePlus, Camera, Loader2 } from "lucide-react";

/**
 * Pemilih banyak gambar untuk AI Vision.
 * images: array of { base64, dataUrl, blob }
 * onChange(images)
 * max: batas jumlah gambar (default 5)
 * hint: teks bantuan kontekstual
 */
export default function MultiImagePicker({ images = [], onChange, max = 5, hint }) {
  const [processing, setProcessing] = useState(false);
  const [notice, setNotice] = useState(null);

  const addFiles = async (fileList) => {
    const files = Array.from(fileList || []);
    if (files.length === 0) return;
    setNotice(null);
    const available = max - images.length;
    if (available <= 0) {
      setNotice(`Maksimal ${max} foto per analisis.`);
      return;
    }
    const toAdd = files.slice(0, available);
    const rejected = files.length - toAdd.length;
    setProcessing(true);
    const processed = [];
    for (const f of toAdd) {
      try {
        const { base64, dataUrl, blob } = await fileToCompressedBase64(f, 1500);
        processed.push({ base64, dataUrl, blob });
      } catch { /* lewati berkas tidak terbaca */ }
    }
    onChange([...images, ...processed]);
    setProcessing(false);
    if (rejected > 0) setNotice(`Maksimal ${max} foto per analisis — ${rejected} foto diabaikan.`);
  };

  const removeAt = (i) => {
    onChange(images.filter((_, x) => x !== i));
    setNotice(null);
  };

  return (
    <div className="space-y-2">
      <div className="flex gap-2 flex-wrap">
        <label className="flex items-center gap-1.5 border-2 border-dashed rounded-lg px-3 py-2 cursor-pointer hover:border-blue-400 text-xs text-muted-foreground transition-colors">
          <ImagePlus className="w-4 h-4" /> Pilih dari Galeri
          <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => { addFiles(e.target.files); e.target.value = ""; }} />
        </label>
        <label className="flex items-center gap-1.5 border-2 border-dashed rounded-lg px-3 py-2 cursor-pointer hover:border-blue-400 text-xs text-muted-foreground transition-colors">
          <Camera className="w-4 h-4" /> Tambah dari Kamera
          <input type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => { addFiles(e.target.files); e.target.value = ""; }} />
        </label>
      </div>

      {images.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {images.map((img, i) => (
            <div key={i} className="relative w-16 h-16 rounded-lg overflow-hidden border">
              <img src={img.dataUrl} alt={`foto-${i + 1}`} className="w-full h-full object-cover" />
              <button type="button" onClick={() => removeAt(i)} className="absolute top-0 right-0 bg-black/60 text-white rounded-bl-md p-0.5 hover:bg-black/80" aria-label="Hapus foto">
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs font-medium text-muted-foreground">{images.length} dari {max} foto</span>
        {processing && <span className="text-xs text-muted-foreground flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" /> Memproses...</span>}
        {notice && <span className="text-xs text-amber-700">⚠ {notice}</span>}
      </div>

      {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
      <p className="text-[10px] text-muted-foreground">Beberapa foto membantu AI lebih akurat, tapi menambah biaya. Gunakan seperlunya.</p>
    </div>
  );
}
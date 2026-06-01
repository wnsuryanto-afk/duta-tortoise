/**
 * TortoisePhotoGallery — max 5 foto, is_primary support, download, lightbox
 * photos = [{url, is_primary, ...}]
 * onChange(photos, primaryUrl)
 */
import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { base44 } from "@/api/base44Client";
import { Camera, ImagePlus, Star, Trash2, Share2, X, Loader2, ChevronLeft, ChevronRight, Download } from "lucide-react";

const MAX_PHOTOS = 5;

function getPrimaryUrl(photos) {
  const primary = photos.find(p => p.is_primary);
  return primary?.url || photos[0]?.url || "";
}

// Auto-migrate: jika tidak ada is_primary=true, set photos[0].is_primary=true
function migratePrimary(photos) {
  if (!photos || photos.length === 0) return photos;
  const hasPrimary = photos.some(p => p.is_primary);
  if (hasPrimary) return photos;
  return photos.map((p, i) => ({ ...p, is_primary: i === 0 }));
}

export default function TortoisePhotoGallery({ photos: rawPhotos = [], thumbnailUrl, tortoiseName = "", onChange }) {
  const photos = migratePrimary(rawPhotos);
  const [uploading, setUploading] = useState(false);
  const [lightbox, setLightbox]   = useState(null);
  const [downloadError, setDownloadError] = useState("");
  const fileRef   = useRef();
  const cameraRef = useRef();

  const primaryUrl = getPrimaryUrl(photos);

  const handleFiles = async (files) => {
    if (!files || files.length === 0) return;
    const remaining = MAX_PHOTOS - photos.length;
    if (remaining <= 0) {
      alert(`Sudah mencapai batas ${MAX_PHOTOS} foto. Hapus salah satu dulu untuk upload yang baru.`);
      return;
    }
    const toUpload = Array.from(files).slice(0, remaining);
    setUploading(true);
    const newPhotos = [...photos];
    for (const file of toUpload) {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      const isPrimary = newPhotos.length === 0;
      newPhotos.push({ url: file_url, is_primary: isPrimary });
    }
    const nextPrimary = getPrimaryUrl(newPhotos);
    onChange(newPhotos, nextPrimary);
    setUploading(false);
  };

  const setPrimary = (idx) => {
    const updated = photos.map((p, i) => ({ ...p, is_primary: i === idx }));
    onChange(updated, updated[idx].url);
  };

  const removePhoto = (idx) => {
    if (!confirm("Hapus foto ini?")) return;
    const next = photos.filter((_, i) => i !== idx);
    // Jika yang dihapus adalah primary & masih ada foto lain
    const wasPhotoIdx = photos[idx];
    let newNext = next;
    if (wasPhotoIdx?.is_primary && next.length > 0) {
      newNext = next.map((p, i) => ({ ...p, is_primary: i === 0 }));
    }
    const nextPrimary = getPrimaryUrl(newNext);
    onChange(newNext, nextPrimary);
    if (lightbox === idx) setLightbox(null);
    else if (lightbox !== null && lightbox > idx) setLightbox(lightbox - 1);
  };

  const shareWA = (url) => {
    const text = encodeURIComponent(`Foto kura-kura ${tortoiseName}: ${url}`);
    window.open(`https://wa.me/?text=${text}`, "_blank");
  };

  const downloadPhoto = async (url, idx) => {
    setDownloadError("");
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const dateStr = new Date().toISOString().slice(0, 10);
      a.href = objectUrl;
      a.download = `${tortoiseName || "tortoise"}_${dateStr}_foto${idx + 1}.jpg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(objectUrl);
    } catch (_) {
      setDownloadError("Download gagal di browser ini. Tekan & tahan foto, lalu pilih Simpan Gambar.");
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 flex-wrap">
        {photos.map((p, idx) => (
          <div key={idx} className="relative group">
            <button type="button" onClick={() => setLightbox(idx)}
              className={`w-16 h-16 rounded-xl overflow-hidden border-2 transition-all hover:opacity-80 ${p.is_primary ? "border-yellow-400 ring-2 ring-yellow-300" : "border-border"}`}>
              <img src={p.url} alt={`foto-${idx}`} className="w-full h-full object-cover" />
            </button>
            {/* Primary badge */}
            {p.is_primary && (
              <span className="absolute -top-1.5 -left-1.5 w-5 h-5 rounded-full bg-yellow-400 text-white flex items-center justify-center shadow text-[10px]">⭐</span>
            )}
            {/* Set as primary */}
            {!p.is_primary && (
              <button type="button" onClick={() => setPrimary(idx)} title="Jadikan foto utama"
                className="absolute -top-1.5 -left-1.5 w-5 h-5 rounded-full bg-white text-muted-foreground border shadow opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <Star className="w-2.5 h-2.5" />
              </button>
            )}
            {/* Hapus */}
            <button type="button" onClick={() => removePhoto(idx)}
              className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-destructive text-white flex items-center justify-center shadow opacity-0 group-hover:opacity-100 transition-opacity">
              <X className="w-2.5 h-2.5" />
            </button>
          </div>
        ))}

        {/* Tombol tambah (hanya jika < MAX_PHOTOS) */}
        {photos.length < MAX_PHOTOS ? (
          <div className="flex flex-col gap-1.5">
            <label className="cursor-pointer">
              <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => handleFiles(e.target.files)} />
              <span className="flex items-center gap-1.5 text-xs text-primary bg-primary/5 hover:bg-primary/10 border border-primary/20 px-2.5 py-1.5 rounded-lg transition-colors">
                <ImagePlus className="w-3.5 h-3.5" /> Galeri
              </span>
            </label>
            <label className="cursor-pointer">
              <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => handleFiles(e.target.files)} />
              <span className="flex items-center gap-1.5 text-xs text-primary bg-primary/5 hover:bg-primary/10 border border-primary/20 px-2.5 py-1.5 rounded-lg transition-colors">
                <Camera className="w-3.5 h-3.5" /> Kamera
              </span>
            </label>
          </div>
        ) : (
          <div className="text-xs text-muted-foreground px-2 py-1.5 bg-muted/40 rounded-lg border border-dashed border-muted-foreground/30">
            Batas {MAX_PHOTOS} foto tercapai
          </div>
        )}
        {uploading && <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />}
      </div>
      <p className="text-[11px] text-muted-foreground">⭐ = foto utama (tampil di card). Maks. {MAX_PHOTOS} foto.</p>

      {/* Lightbox */}
      {lightbox !== null && photos[lightbox] && (
        <Dialog open={lightbox !== null} onOpenChange={() => setLightbox(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{tortoiseName} — Foto {lightbox + 1}/{photos.length} {photos[lightbox].is_primary ? "⭐" : ""}</DialogTitle>
            </DialogHeader>
            <div className="relative">
              <img src={photos[lightbox].url} alt="foto" className="w-full rounded-xl object-contain max-h-[60vh]" />
              {photos.length > 1 && (
                <>
                  <button type="button" onClick={() => setLightbox((lightbox - 1 + photos.length) % photos.length)}
                    className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/40 text-white flex items-center justify-center hover:bg-black/60">
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button type="button" onClick={() => setLightbox((lightbox + 1) % photos.length)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/40 text-white flex items-center justify-center hover:bg-black/60">
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </>
              )}
            </div>

            {/* Thumbnail strip */}
            {photos.length > 1 && (
              <div className="flex gap-2 overflow-x-auto py-1">
                {photos.map((p, i) => (
                  <button key={i} type="button" onClick={() => setLightbox(i)}
                    className={`w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 border-2 transition-all relative ${i === lightbox ? "border-primary" : "border-transparent"}`}>
                    <img src={p.url} alt="" className="w-full h-full object-cover" />
                    {p.is_primary && <span className="absolute top-0.5 left-0.5 text-[9px]">⭐</span>}
                  </button>
                ))}
              </div>
            )}

            {downloadError && <p className="text-xs text-orange-600 bg-orange-50 border border-orange-200 rounded-lg p-2">{downloadError}</p>}

            <div className="flex gap-2 mt-1">
              <Button type="button" variant="outline" size="sm" className="gap-2 flex-1" onClick={() => setPrimary(lightbox)}>
                <Star className="w-3.5 h-3.5 text-yellow-500" />
                {photos[lightbox].is_primary ? "Ini Foto Utama" : "Set Foto Utama"}
              </Button>
              <Button type="button" variant="outline" size="sm" className="gap-2 flex-1" onClick={() => downloadPhoto(photos[lightbox].url, lightbox)}>
                <Download className="w-3.5 h-3.5 text-blue-600" /> Download
              </Button>
              <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={() => shareWA(photos[lightbox].url)}>
                <Share2 className="w-3.5 h-3.5 text-green-600" />
              </Button>
              <Button type="button" variant="destructive" size="sm" onClick={() => removePhoto(lightbox)}>
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
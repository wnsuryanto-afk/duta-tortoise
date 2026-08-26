/**
 * TortoisePhotoGallery — max 5 foto, is_primary support, download, lightbox
 * photos = [{url, is_primary, ...}]
 * onChange(photos, primaryUrl)
 */
import { useState, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Camera, ImagePlus, Star, X, Loader2 } from "lucide-react";
import TortoisePhotoLightbox from "./TortoisePhotoLightbox";

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

export default function TortoisePhotoGallery({ photos: rawPhotos = [], thumbnailUrl, tortoiseName = "", tortoiseCode = "", onChange }) {
  const photos = migratePrimary(rawPhotos);
  const [uploading, setUploading] = useState(false);
  const [lightbox, setLightbox]   = useState(null);
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
    setLightbox(null);
  };

  const shareWA = (url) => {
    const text = encodeURIComponent(`Foto kura-kura ${tortoiseName}: ${url}`);
    window.open(`https://wa.me/?text=${text}`, "_blank");
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
                className="absolute -top-1.5 -left-1.5 w-5 h-5 rounded-full bg-white text-muted-foreground border shadow opacity-100 lg:opacity-0 lg:group-hover:opacity-100 lg:focus-within:opacity-100 transition-opacity flex items-center justify-center">
                <Star className="w-2.5 h-2.5" />
              </button>
            )}
            {/* Hapus */}
            <button type="button" onClick={() => removePhoto(idx)}
              className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-destructive text-white flex items-center justify-center shadow opacity-100 lg:opacity-0 lg:group-hover:opacity-100 lg:focus-within:opacity-100 transition-opacity">
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

      {/* Lightbox fullscreen */}
      {lightbox !== null && photos[lightbox] && (
        <TortoisePhotoLightbox
          photos={photos}
          startIndex={lightbox}
          tortoiseCode={tortoiseCode}
          tortoiseName={tortoiseName}
          onClose={() => setLightbox(null)}
          onSetPrimary={(i) => setPrimary(i)}
          onRemove={(i) => removePhoto(i)}
          onShare={(url) => shareWA(url)}
        />
      )}
    </div>
  );
}
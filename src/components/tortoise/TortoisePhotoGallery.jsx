import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { base44 } from "@/api/base44Client";
import { Camera, ImagePlus, Star, Trash2, Share2, X, Loader2, ChevronLeft, ChevronRight } from "lucide-react";

// photos = [{url, thumbnail}], thumbnailUrl, onChange(photos, thumbnailUrl)
export default function TortoisePhotoGallery({ photos = [], thumbnailUrl, tortoiseName = "", onChange }) {
  const [uploading, setUploading] = useState(false);
  const [lightbox, setLightbox] = useState(null); // index
  const fileRef = useRef();
  const cameraRef = useRef();

  const handleFiles = async (files) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    const newPhotos = [...photos];
    let newThumb = thumbnailUrl;
    for (const file of Array.from(files)) {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      newPhotos.push({ url: file_url, thumbnail: false });
      if (newPhotos.length === 1) newThumb = file_url; // auto-set first
    }
    if (!newThumb && newPhotos.length > 0) newThumb = newPhotos[0].url;
    onChange(newPhotos, newThumb);
    setUploading(false);
  };

  const setThumbnail = (url) => onChange(photos, url);

  const removePhoto = (idx) => {
    const next = photos.filter((_, i) => i !== idx);
    let newThumb = thumbnailUrl;
    if (thumbnailUrl === photos[idx].url) {
      newThumb = next.length > 0 ? next[0].url : "";
    }
    onChange(next, newThumb);
    if (lightbox === idx) setLightbox(null);
  };

  const shareWA = (url) => {
    const text = encodeURIComponent(`Foto kura-kura ${tortoiseName}: ${url}`);
    window.open(`https://wa.me/?text=${text}`, "_blank");
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 flex-wrap">
        {/* Galeri thumbnail */}
        {photos.map((p, idx) => (
          <div key={idx} className="relative group">
            <button type="button" onClick={() => setLightbox(idx)} className="w-16 h-16 rounded-xl overflow-hidden border-2 transition-all hover:opacity-80"
              style={{ borderColor: thumbnailUrl === p.url ? "hsl(var(--primary))" : "hsl(var(--border))" }}>
              <img src={p.url} alt={`foto-${idx}`} className="w-full h-full object-cover" />
            </button>
            {/* Thumbnail star */}
            <button
              type="button"
              onClick={() => setThumbnail(p.url)}
              title="Jadikan thumbnail"
              className={`absolute -top-1.5 -left-1.5 w-5 h-5 rounded-full flex items-center justify-center shadow transition-all ${thumbnailUrl === p.url ? "bg-yellow-400 text-white" : "bg-white text-muted-foreground opacity-0 group-hover:opacity-100 border"}`}
            >
              <Star className="w-2.5 h-2.5" />
            </button>
            {/* Hapus */}
            <button
              type="button"
              onClick={() => removePhoto(idx)}
              className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-destructive text-white flex items-center justify-center shadow opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <X className="w-2.5 h-2.5" />
            </button>
          </div>
        ))}

        {/* Tombol tambah */}
        <div className="flex flex-col gap-1.5">
          {/* Galeri */}
          <label className="cursor-pointer">
            <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => handleFiles(e.target.files)} />
            <span className="flex items-center gap-1.5 text-xs text-primary bg-primary/5 hover:bg-primary/10 border border-primary/20 px-2.5 py-1.5 rounded-lg transition-colors">
              <ImagePlus className="w-3.5 h-3.5" />
              Galeri
            </span>
          </label>
          {/* Kamera */}
          <label className="cursor-pointer">
            <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => handleFiles(e.target.files)} />
            <span className="flex items-center gap-1.5 text-xs text-primary bg-primary/5 hover:bg-primary/10 border border-primary/20 px-2.5 py-1.5 rounded-lg transition-colors">
              <Camera className="w-3.5 h-3.5" />
              Kamera
            </span>
          </label>
        </div>
        {uploading && <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />}
      </div>
      <p className="text-[11px] text-muted-foreground">⭐ = thumbnail utama. Bisa upload banyak foto.</p>

      {/* Lightbox */}
      {lightbox !== null && photos[lightbox] && (
        <Dialog open={lightbox !== null} onOpenChange={() => setLightbox(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{tortoiseName} — Foto {lightbox + 1}/{photos.length}</DialogTitle>
            </DialogHeader>
            <div className="relative">
              <img src={photos[lightbox].url} alt="foto" className="w-full rounded-xl object-contain max-h-[60vh]" />
              {/* Nav */}
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
            <div className="flex gap-2 mt-1">
              <Button type="button" variant="outline" size="sm" className="flex-1 gap-1.5" onClick={() => setThumbnail(photos[lightbox].url)}>
                <Star className="w-3.5 h-3.5 text-yellow-500" /> Jadikan Thumbnail
              </Button>
              <Button type="button" variant="outline" size="sm" className="flex-1 gap-1.5" onClick={() => shareWA(photos[lightbox].url)}>
                <Share2 className="w-3.5 h-3.5 text-green-600" /> Share WhatsApp
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
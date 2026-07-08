import { useState, useEffect, useCallback } from "react";
import { X, ChevronLeft, ChevronRight, BookOpen } from "lucide-react";

/**
 * Galeri foto untuk DiagnosisProtocol.
 * - Main image (klik → lightbox fullscreen)
 * - Thumbnail strip horizontal scroll (80x80, active border orange #E76F00)
 * - Lightbox: bg black 90%, navigasi panah, caption, klik area gelap = tutup
 *
 * Jika `images` kosong tapi `image_url` ada → image_url jadi single item.
 */
export default function DiseaseImageGallery({ protocol }) {
  // Bangun daftar galeri: prioritaskan `images` array, fallback ke image_url legacy
  const gallery = (() => {
    const imgs = (protocol.images || []).filter(Boolean).map((img, i) => ({
      url: typeof img === "string" ? img : img.url,
      caption: typeof img === "string" ? (i === 0 ? protocol.image_caption : "") : (img.caption || ""),
    })).filter(g => g.url);

    if (imgs.length > 0) return imgs;
    if (protocol.image_url) {
      return [{ url: protocol.image_url, caption: protocol.image_caption || "" }];
    }
    return [];
  })();

  const [activeIdx, setActiveIdx] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  // Reset ke index 0 saat protocol berubah (gambar berubah)
  useEffect(() => {
    setActiveIdx(0);
  }, [protocol.id]);

  const safeIdx = gallery.length > 0 ? Math.min(activeIdx, gallery.length - 1) : 0;
  const activeImage = gallery[safeIdx];

  const goNext = useCallback(() => {
    setActiveIdx(i => (i + 1) % gallery.length);
  }, [gallery.length]);

  const goPrev = useCallback(() => {
    setActiveIdx(i => (i - 1 + gallery.length) % gallery.length);
  }, [gallery.length]);

  // Keyboard navigation di lightbox
  useEffect(() => {
    if (!lightboxOpen) return;
    const handler = (e) => {
      if (e.key === "Escape") setLightboxOpen(false);
      else if (e.key === "ArrowRight") goNext();
      else if (e.key === "ArrowLeft") goPrev();
    };
    window.addEventListener("keydown", handler);
    // Lock scroll body
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", handler);
      document.body.style.overflow = "";
    };
  }, [lightboxOpen, goNext, goPrev]);

  if (gallery.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
        <BookOpen className="w-12 h-12 text-muted-foreground/30 mb-2" />
        <p className="text-sm text-muted-foreground">Belum ada gambar referensi</p>
      </div>
    );
  }

  return (
    <>
      {/* MAIN IMAGE */}
      <div className="relative">
        <button
          type="button"
          onClick={() => setLightboxOpen(true)}
          className="block w-full bg-[#f5f5f5] rounded-xl overflow-hidden group cursor-zoom-in"
          aria-label="Buka gambar fullscreen"
        >
          <img
            src={activeImage.url}
            alt={activeImage.caption || protocol.diagnosis_name || "Gambar penyakit"}
            className="w-full max-h-80 object-contain mx-auto transition-transform duration-200 group-hover:scale-[1.02]"
            style={{ maxHeight: "320px" }}
          />
        </button>
        {activeImage.caption && (
          <p className="text-xs text-muted-foreground px-4 py-2 bg-muted/30 border-t text-center">
            {activeImage.caption}
          </p>
        )}
        {gallery.length > 1 && (
          <span className="absolute top-2 left-2 bg-black/60 text-white text-[10px] font-semibold px-2 py-0.5 rounded-full">
            {safeIdx + 1} / {gallery.length}
          </span>
        )}
      </div>

      {/* THUMBNAIL STRIP */}
      {gallery.length > 1 && (
        <div className="px-3 pb-3 pt-2">
          <div className="flex gap-2 overflow-x-auto pb-1">
            {gallery.map((img, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setActiveIdx(i)}
                className="flex-shrink-0 rounded-lg overflow-hidden transition-all"
                style={{
                  width: "80px",
                  height: "80px",
                  border: `2px solid ${i === safeIdx ? "#E76F00" : "transparent"}`,
                  borderRadius: "8px",
                }}
                aria-label={`Lihat gambar ${i + 1}`}
              >
                <img
                  src={img.url}
                  alt={img.caption || `Foto ${i + 1}`}
                  className="w-full h-full object-cover"
                />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* LIGHTBOX FULLSCREEN */}
      {lightboxOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center"
          style={{ background: "rgba(0,0,0,0.9)" }}
          onClick={() => setLightboxOpen(false)}
        >
          {/* Close button */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setLightboxOpen(false);
            }}
            className="absolute top-4 right-4 text-white/80 hover:text-white p-2 rounded-full hover:bg-white/10 transition-colors z-10"
            aria-label="Tutup"
          >
            <X className="w-7 h-7" />
          </button>

          {/* Prev arrow */}
          {gallery.length > 1 && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                goPrev();
              }}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-white/70 hover:text-white p-2 rounded-full hover:bg-white/10 transition-colors z-10"
              aria-label="Sebelumnya"
            >
              <ChevronLeft className="w-8 h-8" />
            </button>
          )}

          {/* Next arrow */}
          {gallery.length > 1 && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                goNext();
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-white/70 hover:text-white p-2 rounded-full hover:bg-white/10 transition-colors z-10"
              aria-label="Berikutnya"
            >
              <ChevronRight className="w-8 h-8" />
            </button>
          )}

          {/* Image + caption (stop propagation agar klik gambar tidak tutup) */}
          <div
            className="flex flex-col items-center max-w-[90vw] max-h-[85vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={activeImage.url}
              alt={activeImage.caption || protocol.diagnosis_name || "Gambar penyakit"}
              className="max-w-[90vw] max-h-[85vh] object-contain"
            />
            {activeImage.caption && (
              <p className="text-white text-sm mt-3 text-center px-4 max-w-[90vw]">
                {activeImage.caption}
              </p>
            )}
          </div>
        </div>
      )}
    </>
  );
}
/**
 * TortoisePhotoLightbox — viewer foto fullscreen untuk detail kura.
 * Fitur: fit-to-screen (object-contain), pinch/double-tap zoom, pan,
 * swipe antar foto, indikator posisi, tombol Unduh (nama = kode kura), tombol tutup.
 *
 * Props:
 *  - photos: [{url, is_primary}]
 *  - startIndex: index foto awal
 *  - tortoiseCode: kode kura untuk nama file unduh (cth: "B-84")
 *  - tortoiseName: fallback nama file
 *  - onClose, onSetPrimary(idx), onRemove(idx), onShare(url)
 */
import { useState, useRef, useEffect, useCallback } from "react";
import { Download, X, ChevronLeft, ChevronRight, Loader2, Share2, Star, Trash2 } from "lucide-react";

const MIN_SCALE = 1;
const MAX_SCALE = 5;
const DOUBLE_TAP_SCALE = 2.5;
const SWIPE_THRESHOLD = 50;
const DOUBLE_TAP_MS = 300;

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

export default function TortoisePhotoLightbox({
  photos = [],
  startIndex = 0,
  tortoiseCode = "",
  tortoiseName = "",
  onClose,
  onSetPrimary,
  onRemove,
  onShare,
}) {
  const [index, setIndex] = useState(() =>
    clamp(startIndex, 0, Math.max(0, photos.length - 1))
  );
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [downloading, setDownloading] = useState(false);
  const [dlError, setDlError] = useState("");

  const pointers = useRef(new Map());
  const pinchStart = useRef(null);
  const panStart = useRef(null);
  const lastTap = useRef(0);

  const photo = photos[index];
  const hasMultiple = photos.length > 1;

  const resetZoom = useCallback(() => {
    setScale(1);
    setOffset({ x: 0, y: 0 });
  }, []);

  const goTo = useCallback(
    (i) => {
      setIndex(i);
      resetZoom();
    },
    [resetZoom]
  );

  const prevPhoto = useCallback(() => {
    if (hasMultiple) goTo((index - 1 + photos.length) % photos.length);
  }, [index, photos.length, hasMultiple, goTo]);

  const nextPhoto = useCallback(() => {
    if (hasMultiple) goTo((index + 1) % photos.length);
  }, [index, photos.length, hasMultiple, goTo]);

  // Jaga index tetap valid jika photos berubah
  useEffect(() => {
    if (photos.length === 0) {
      onClose();
      return;
    }
    if (index > photos.length - 1) setIndex(photos.length - 1);
  }, [photos.length]); // eslint-disable-line react-hooks/exhaustive-deps

  // Navigasi keyboard (desktop)
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowLeft") prevPhoto();
      else if (e.key === "ArrowRight") nextPhoto();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, prevPhoto, nextPhoto]);

  const handleDoubleTap = () => {
    if (scale > 1) resetZoom();
    else setScale(DOUBLE_TAP_SCALE);
  };

  const onPointerDown = (e) => {
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (pointers.current.size === 2) {
      panStart.current = null; // sedang pinch, bukan pan
      const pts = [...pointers.current.values()];
      const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      pinchStart.current = { dist, scale };
    } else if (pointers.current.size === 1) {
      panStart.current = { x: e.clientX, y: e.clientY, ox: offset.x, oy: offset.y };
      const now = Date.now();
      if (now - lastTap.current < DOUBLE_TAP_MS) {
        handleDoubleTap();
        lastTap.current = 0;
      } else {
        lastTap.current = now;
      }
    }
  };

  const onPointerMove = (e) => {
    if (!pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (pointers.current.size >= 2 && pinchStart.current) {
      const pts = [...pointers.current.values()];
      const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      setScale(
        clamp(
          (dist / pinchStart.current.dist) * pinchStart.current.scale,
          MIN_SCALE,
          MAX_SCALE
        )
      );
    } else if (pointers.current.size === 1 && panStart.current && scale > 1) {
      setOffset({
        x: panStart.current.ox + (e.clientX - panStart.current.x),
        y: panStart.current.oy + (e.clientY - panStart.current.y),
      });
    }
  };

  const onPointerUp = (e) => {
    const startX = panStart.current?.x;
    const wasSingle = pointers.current.size === 1;
    pointers.current.delete(e.pointerId);

    if (pointers.current.size < 2) pinchStart.current = null;

    // Swipe horizontal hanya saat tidak zoom & single touch cepat
    if (wasSingle && startX != null && scale <= 1) {
      const dx = e.clientX - startX;
      if (Math.abs(dx) > SWIPE_THRESHOLD) {
        if (dx > 0) prevPhoto();
        else nextPhoto();
      }
    }

    if (pointers.current.size === 0) {
      panStart.current = null;
      if (scale <= 1) setOffset({ x: 0, y: 0 });
    }
  };

  const buildFilename = (idx) => {
    const code = (tortoiseCode || tortoiseName || "tortoise")
      .trim()
      .replace(/[^\w-]/g, "_");
    return idx === 0 ? `${code}.jpg` : `${code}_${idx + 1}.jpg`;
  };

  const handleDownload = async () => {
    const url = photo?.url;
    if (!url) return;
    setDlError("");
    setDownloading(true);
    const filename = buildFilename(index);
    try {
      const res = await fetch(url, { mode: "cors" });
      if (!res.ok) throw new Error("fetch failed");
      const blob = await res.blob();

      // Web Share API (iOS "Save to Photos")
      const file = new File([blob], filename, { type: blob.type || "image/jpeg" });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: tortoiseName || "Foto Kura" });
        setDownloading(false);
        return;
      }

      // Fallback: anchor download
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objectUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(objectUrl), 2000);
    } catch {
      setDlError("Unduh otomatis gagal. Tekan & tahan foto pada layar ini, lalu pilih 'Simpan Gambar'.");
    }
    setDownloading(false);
  };

  if (!photo) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-black select-none">
      {/* Area gesture (fullscreen) */}
      <div
        className="absolute inset-0 flex items-center justify-center overflow-hidden touch-none"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <img
          src={photo.url}
          alt={`Foto ${index + 1}`}
          draggable={false}
          className="max-w-full max-h-full object-contain pointer-events-none will-change-transform"
          style={{
            transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
            transformOrigin: "center center",
          }}
        />
      </div>

      {/* Tombol tutup */}
      <button
        type="button"
        onClick={onClose}
        className="absolute top-4 right-4 z-20 w-10 h-10 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80 active:scale-95 transition"
        aria-label="Tutup"
      >
        <X className="w-6 h-6" />
      </button>

      {/* Indikator posisi */}
      {hasMultiple && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 px-3 py-1 rounded-full bg-black/60 text-white text-sm font-medium">
          {index + 1} / {photos.length}
        </div>
      )}

      {/* Panah kiri / kanan */}
      {hasMultiple && (
        <>
          <button
            type="button"
            onClick={prevPhoto}
            className="absolute left-2 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70 active:scale-95 transition"
            aria-label="Sebelumnya"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <button
            type="button"
            onClick={nextPhoto}
            className="absolute right-2 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70 active:scale-95 transition"
            aria-label="Berikutnya"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        </>
      )}

      {/* Toolbar bawah */}
      <div className="absolute bottom-0 left-0 right-0 z-20 px-4 pt-6 pb-[max(env(safe-area-inset-bottom),0.75rem)] bg-gradient-to-t from-black/80 to-transparent">
        {dlError && (
          <p className="text-xs text-orange-300 text-center mb-2 px-3">{dlError}</p>
        )}
        <div className="flex items-center justify-center gap-2">
          {/* Unduh (utama) */}
          <button
            type="button"
            onClick={handleDownload}
            disabled={downloading}
            className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-card text-black font-medium hover:bg-white/90 active:scale-95 transition disabled:opacity-60"
          >
            {downloading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Download className="w-5 h-5" />
            )}
            <span className="text-sm">
              {downloading ? "Menyimpan..." : "Unduh Foto"}
            </span>
          </button>

          {/* Bagikan */}
          {onShare && (
            <button
              type="button"
              onClick={() => onShare(photo.url)}
              className="w-10 h-10 rounded-full bg-white/20 text-white flex items-center justify-center hover:bg-white/30 active:scale-95 transition"
              aria-label="Bagikan"
            >
              <Share2 className="w-5 h-5" />
            </button>
          )}

          {/* Jadikan foto utama */}
          {onSetPrimary && (
            <button
              type="button"
              onClick={() => onSetPrimary(index)}
              className="w-10 h-10 rounded-full bg-white/20 text-white flex items-center justify-center hover:bg-white/30 active:scale-95 transition"
              aria-label="Jadikan foto utama"
            >
              <Star
                className={`w-5 h-5 ${photo.is_primary ? "fill-yellow-400 text-yellow-400" : ""}`}
              />
            </button>
          )}

          {/* Hapus */}
          {onRemove && (
            <button
              type="button"
              onClick={() => onRemove(index)}
              className="w-10 h-10 rounded-full bg-white/20 text-red-400 flex items-center justify-center hover:bg-red-500/30 active:scale-95 transition"
              aria-label="Hapus foto"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Pencil, Trash2, Shell, ArrowRightLeft, MapPin, Egg, ChevronLeft, ChevronRight, Share2, Ruler, Download, Camera, Tag, QrCode } from "lucide-react";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import EnclosureHistoryPanel from "./EnclosureHistoryPanel";
import EggHistoryPanel from "./EggHistoryPanel";
import SizeHistoryPanel from "./SizeHistoryPanel";
import GrowthTimeline from "./GrowthTimeline";
import TortoiseQRCode from "./TortoiseQRCode";

const healthConfig = {
  critical: { border: "border-l-4 border-l-red-500",    dot: "bg-red-500",    label: "Butuh Perawatan",  badge: "bg-red-100 text-red-700" },
  warning:  { border: "border-l-4 border-l-yellow-400", dot: "bg-yellow-400", label: "Perlu Perhatian",  badge: "bg-yellow-100 text-yellow-700" },
  ok:       { border: "border-l-4 border-l-green-400",  dot: "bg-green-400",  label: "Sehat",            badge: "bg-green-100 text-green-700" },
  none:     { border: "",                                dot: "bg-muted-foreground/30", label: "Belum Ada Rekam", badge: "bg-muted text-muted-foreground" },
};

const statusColors = {
  aktif:   "bg-primary/10 text-primary border-primary/20",
  baby:    "bg-sky-100 text-sky-700 border-sky-300",
  terjual: "bg-yellow-100 text-yellow-800 border-yellow-300",
  mati:    "bg-muted text-muted-foreground border-border",
  sakit:   "bg-red-100 text-red-700 border-red-300",
};

const sourceLabel = {
  hasil_sendiri: { text: "CBB", color: "bg-green-100 text-green-800 border-green-300" },
  import:        { text: "CB",  color: "bg-blue-100 text-blue-800 border-blue-300" },
  beli_lokal:    { text: "LB",  color: "bg-amber-100 text-amber-800 border-amber-300" },
};

// Background warna untuk card berdasarkan kondisi
function getCardBg(tortoise) {
  if (tortoise.status === "sakit") return "bg-red-50 border-red-200";
  if (tortoise.status === "terjual") return "bg-yellow-50 border-yellow-200";
  if (tortoise.status === "baby") return "bg-sky-50 border-sky-200";
  if (tortoise.is_proven) return "bg-green-50 border-green-200";
  if (tortoise.gender === "betina") return "bg-pink-50 border-pink-200";
  return "";
}

const morphLabels = {
  normal: "Normal", over_scute: "Over Scute", less_scute: "Less Scute",
  het_albino: "Het Albino", ivory: "Ivory", albino: "Albino",
  wc: "WC", cb: "CB",
};
const morphColors = {
  normal: "bg-muted text-muted-foreground", over_scute: "bg-blue-100 text-blue-700",
  less_scute: "bg-purple-100 text-purple-700", het_albino: "bg-orange-100 text-orange-700",
  ivory: "bg-yellow-100 text-yellow-700", albino: "bg-pink-100 text-pink-700",
  wc: "bg-amber-100 text-amber-800", cb: "bg-teal-100 text-teal-700",
};
const genderLabels = {
  jantan: "♂ Jantan", betina: "♀ Betina", belum_diketahui: "? Belum Diketahui",
};

function ProvenBadge({ gender }) {
  if (gender === "jantan") return (
    <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-bold bg-blue-600 text-white shadow-sm">
      ♂ ✓ Proven
    </span>
  );
  if (gender === "betina") return (
    <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-bold bg-pink-500 text-white shadow-sm">
      ♀ ✓ Proven
    </span>
  );
  return (
    <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-bold bg-green-500 text-white shadow-sm">
      ✓ Proven
    </span>
  );
}

export default function TortoiseCard({ tortoise, onEdit, onDelete, onMove, healthStatus = "none", latestHealth, parentIndicator }) {
  const [showHistory, setShowHistory] = useState(false);
  const [showEggHistory, setShowEggHistory] = useState(false);
  const [showSizeHistory, setShowSizeHistory] = useState(false);
  const [showGrowth, setShowGrowth] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [lightboxIdx, setLightboxIdx] = useState(null);

  const showActions = onEdit || onDelete || onMove;
  const health = healthConfig[healthStatus] || healthConfig.none;
  const morph = tortoise.morph || "normal";

  // Ambil semua foto (support multi-foto & backward compat single photo_url)
  const photos = Array.isArray(tortoise.photos) && tortoise.photos.length > 0
    ? tortoise.photos
    : tortoise.photo_url ? [{ url: tortoise.photo_url }] : [];
  const thumbnailUrl = tortoise.photo_url || (photos[0]?.url || "");

  const shareWA = (url) => {
    const text = encodeURIComponent(`Foto kura-kura ${tortoise.name}: ${url}`);
    window.open(`https://wa.me/?text=${text}`, "_blank");
  };

  const saveToDevice = async (url) => {
    const a = document.createElement("a");
    a.href = url;
    a.download = `${tortoise.name || "tortoise"}.jpg`;
    a.target = "_blank";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const cardBg = getCardBg(tortoise);

  return (
    <>
    <Card className={`p-4 hover:shadow-md transition-shadow duration-200 group ${health.border} ${cardBg}`}>
      <div className="flex items-start gap-3">
        {/* Foto Thumbnail */}
        <button
          className="w-24 h-24 rounded-xl bg-primary/5 flex items-center justify-center flex-shrink-0 overflow-hidden border hover:opacity-80 transition-opacity relative"
          onClick={() => photos.length > 0 && setLightboxIdx(0)}
          type="button"
        >
          {thumbnailUrl ? (
            <>
              <img src={thumbnailUrl} alt={tortoise.name} className="w-24 h-24 object-cover" />
              {photos.length > 1 && (
                <span className="absolute bottom-0 right-0 bg-black/50 text-white text-[9px] px-1.5 py-0.5 rounded-tl-md">
                  +{photos.length - 1}
                </span>
              )}
            </>
          ) : (
            <Shell className="w-8 h-8 text-primary/40" />
          )}
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className={`font-bold ${tortoise.gender === "betina" ? "text-base text-pink-700" : "text-sm"}`}>
              {tortoise.name}
            </h3>
            {tortoise.code && <span className="text-xs text-muted-foreground">({tortoise.code})</span>}
            {tortoise.is_proven && <ProvenBadge gender={tortoise.gender} />}
          </div>

          <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
            <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${statusColors[tortoise.status] || ""}`}>
              {tortoise.status}
            </Badge>
            <span className="text-[11px] text-muted-foreground">{genderLabels[tortoise.gender]}</span>
            {morph !== "normal" && (
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${morphColors[morph]}`}>
                {morphLabels[morph]}
              </span>
            )}
            {tortoise.source && sourceLabel[tortoise.source] && (
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full border font-bold ${sourceLabel[tortoise.source].color}`}>
                {sourceLabel[tortoise.source].text}
              </span>
            )}
            <span className={`inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full font-medium ${health.badge}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${health.dot}`} />
              {health.label}
            </span>
          </div>

          <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1.5 text-xs text-muted-foreground">
            {tortoise.weight_grams && <span>{tortoise.weight_grams}g</span>}
            {tortoise.shell_length_cm && <span>{tortoise.shell_length_cm}cm</span>}
            {tortoise.enclosure && <span>📍 {tortoise.enclosure}</span>}
            {tortoise.birth_date && <span>🐣 {format(new Date(tortoise.birth_date), "d MMM yyyy", { locale: id })}</span>}
            {tortoise.purchase_date && <span>🛒 {format(new Date(tortoise.purchase_date), "d MMM yyyy", { locale: id })}</span>}
          </div>
          {/* Tags */}
          {Array.isArray(tortoise.tags) && tortoise.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1.5">
              {tortoise.tags.map(tag => (
                <span key={tag} className="inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded-full bg-accent/10 text-accent border border-accent/20 font-medium">
                  <Tag className="w-2.5 h-2.5" />{tag}
                </span>
              ))}
            </div>
          )}
        </div>

        {showActions && (
          <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground" title="Riwayat Kandang" onClick={() => setShowHistory(true)}>
              <MapPin className="w-3 h-3" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7 text-accent" title="History Bertelur" onClick={() => setShowEggHistory(true)}>
              <Egg className="w-3 h-3" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7 text-chart-4" title="Riwayat Ukuran" onClick={() => setShowSizeHistory(true)}>
              <Ruler className="w-3 h-3" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7 text-accent" title="Foto Perkembangan" onClick={() => setShowGrowth(true)}>
              <Camera className="w-3 h-3" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground" title="QR Code" onClick={() => setShowQR(true)}>
              <QrCode className="w-3 h-3" />
            </Button>
            {onEdit && (
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEdit(tortoise)}>
                <Pencil className="w-3 h-3" />
              </Button>
            )}
            {onMove && (
              <Button variant="ghost" size="icon" className="h-7 w-7 text-chart-4" title="Pindah Kandang" onClick={() => onMove(tortoise)}>
                <ArrowRightLeft className="w-3 h-3" />
              </Button>
            )}
            {onDelete && (
              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => onDelete(tortoise)}>
                <Trash2 className="w-3 h-3" />
              </Button>
            )}
          </div>
        )}
      </div>
    </Card>

    {/* Lightbox multi-foto */}
    {lightboxIdx !== null && photos.length > 0 && (
      <Dialog open={lightboxIdx !== null} onOpenChange={() => setLightboxIdx(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{tortoise.name} — Foto {lightboxIdx + 1}/{photos.length}</DialogTitle>
          </DialogHeader>
          <div className="relative">
            <img src={photos[lightboxIdx].url} alt={tortoise.name} className="w-full rounded-xl object-contain max-h-96" />
            {photos.length > 1 && (
              <>
                <button type="button" onClick={() => setLightboxIdx((lightboxIdx - 1 + photos.length) % photos.length)}
                  className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/40 text-white flex items-center justify-center hover:bg-black/60">
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button type="button" onClick={() => setLightboxIdx((lightboxIdx + 1) % photos.length)}
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
                <button key={i} type="button" onClick={() => setLightboxIdx(i)}
                  className={`w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 border-2 transition-all ${i === lightboxIdx ? "border-primary" : "border-transparent"}`}>
                  <img src={p.url} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
          <div className="flex gap-2 mt-1">
            <Button type="button" variant="outline" size="sm" className="gap-2 flex-1" onClick={() => shareWA(photos[lightboxIdx].url)}>
              <Share2 className="w-3.5 h-3.5 text-green-600" /> WhatsApp
            </Button>
            <Button type="button" variant="outline" size="sm" className="gap-2 flex-1" onClick={() => saveToDevice(photos[lightboxIdx].url)}>
              <Download className="w-3.5 h-3.5 text-blue-600" /> Simpan ke HP
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    )}

    {/* Riwayat Kandang */}
    <Dialog open={showHistory} onOpenChange={setShowHistory}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <MapPin className="w-4 h-4 text-primary" />
            Riwayat Kandang — {tortoise.name}
          </DialogTitle>
        </DialogHeader>
        <div className="py-2">
          <EnclosureHistoryPanel tortoiseId={tortoise.id} />
        </div>
      </DialogContent>
    </Dialog>

    {/* History Bertelur */}
    <Dialog open={showEggHistory} onOpenChange={setShowEggHistory}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Egg className="w-4 h-4 text-accent" />
            History Bertelur — {tortoise.name}
          </DialogTitle>
        </DialogHeader>
        <div className="py-2">
          <EggHistoryPanel tortoiseId={tortoise.id} tortoiseName={tortoise.name} />
        </div>
      </DialogContent>
    </Dialog>

    {/* Riwayat Ukuran */}
    <Dialog open={showSizeHistory} onOpenChange={setShowSizeHistory}>
      <DialogContent className="max-w-sm max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Ruler className="w-4 h-4 text-chart-4" />
            Riwayat Ukuran — {tortoise.name}
          </DialogTitle>
        </DialogHeader>
        <div className="py-2">
          <SizeHistoryPanel tortoiseId={tortoise.id} tortoiseName={tortoise.name} />
        </div>
      </DialogContent>
    </Dialog>

    {/* QR Code Dialog */}
    <Dialog open={showQR} onOpenChange={setShowQR}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <QrCode className="w-4 h-4" />
            QR Code — {tortoise.name}
          </DialogTitle>
        </DialogHeader>
        <div className="py-2">
          <TortoiseQRCode tortoise={tortoise} />
        </div>
      </DialogContent>
    </Dialog>

    {/* Foto Perkembangan */}
    <Dialog open={showGrowth} onOpenChange={setShowGrowth}>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Camera className="w-4 h-4 text-accent" />
            Perkembangan — {tortoise.name}
          </DialogTitle>
        </DialogHeader>
        <div className="py-2">
          <GrowthTimeline tortoise={tortoise} />
        </div>
      </DialogContent>
    </Dialog>
    </>
  );
}
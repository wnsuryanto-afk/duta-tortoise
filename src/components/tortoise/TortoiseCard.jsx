import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Pencil, Trash2, ArrowRightLeft, MapPin, Egg, Ruler, Camera, Tag, QrCode, Lock, FileText, ShoppingBag, GitBranch } from "lucide-react";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import EnclosureHistoryPanel from "./EnclosureHistoryPanel";
import EggHistoryPanel from "./EggHistoryPanel";
import SizeHistoryPanel from "./SizeHistoryPanel";
import PhotoProgressPanel from "./PhotoProgressPanel";
import TortoiseQRCode from "./TortoiseQRCode";
import IncompleteBadge from "@/components/common/IncompleteBadge";
import { getMissingFields } from "@/lib/incompleteChecks";
import TortoiseCompletenessPanel from "./TortoiseCompletenessPanel";
import { canViewPrice } from "@/lib/permissions";
import { useCurrentUser } from "@/lib/useCurrentUser";
import { AgeBadge } from "./AgeDisplay";
import TortoiseLineagePanel from "./TortoiseLineagePanel";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import TortoisePhotoLightbox from "./TortoisePhotoLightbox";
import { TortoiseArt } from "@/components/common/Illustration";

function PriceField({ label }) {
  return (
    <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground border border-border">
      <Lock className="w-2.5 h-2.5" /> {label}: 🔒
    </span>
  );
}

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
  hasil_sendiri:  { text: "🐣 CBB",  color: "bg-green-100 text-green-800 border-green-300",  title: "Captive Bred & Born (Duta Tortoise)" },
  cb:             { text: "🏠 CB",   color: "bg-blue-100 text-blue-800 border-blue-300",      title: "Captive Bred" },
  wc:             { text: "🌿 WC",   color: "bg-amber-100 text-amber-800 border-amber-300",   title: "Wild Caught" },
  f1:             { text: "🔬 F1",   color: "bg-purple-100 text-purple-800 border-purple-300",title: "F1 – Generasi pertama dari WC" },
  f2:             { text: "🔬 F2",   color: "bg-indigo-100 text-indigo-800 border-indigo-300",title: "F2 – Generasi kedua" },
  ltc:            { text: "⏳ LTC",  color: "bg-orange-100 text-orange-800 border-orange-300",title: "Long Term Captive" },
  import:         { text: "✈️ Import", color: "bg-blue-100 text-blue-800 border-blue-300",   title: "Import" },
  beli_lokal:     { text: "🛒 Lokal", color: "bg-teal-100 text-teal-800 border-teal-300",    title: "Beli Lokal" },
  tidak_diketahui:{ text: "❓ Unknown", color: "bg-gray-100 text-gray-700 border-gray-300",  title: "Asal Tidak Diketahui" },
};

// Background warna untuk card berdasarkan kondisi
function getCardBg(tortoise) {
  if (tortoise.status === "mati") return "bg-gray-100 border-gray-400 opacity-80";
  if (tortoise.status === "sakit") return "bg-red-50 border-red-200";
  if (tortoise.status === "terjual") return "bg-yellow-50 border-yellow-200";
  if (tortoise.status === "baby") return "bg-sky-50 border-sky-200";
  if (tortoise.is_proven) return "bg-green-50 border-green-200";
  if (tortoise.gender === "betina") return "bg-pink-50 border-pink-200";
  return "";
}

const morphLabels = {
  normal: "Normal",
  het_albino: "Het. Albino", het_caramel_albino: "Het. Caramel Albino",
  het_hypo: "Het. Hypo", het_ivory: "Het. Ivory", double_het: "Double Het",
  albino: "Albino", ivory: "Ivory", caramel_albino: "Caramel Albino",
  hypo: "Hypo", golden_greek: "Golden Greek", piebald: "Piebald",
  genetic_stripe: "Genetic Stripe", high_yellow: "High Yellow",
  dark: "Dark", paradox: "Paradox", anerythristic: "Anerythristic",
  axanthic: "Axanthic", melanistic: "Melanistic", mix: "Mix", unknown: "Unknown",
  // legacy
  over_scute: "Over Scute", less_scute: "Less Scute", wc: "WC", cb: "CB",
};
const morphColors = {
  normal: "bg-muted text-muted-foreground",
  het_albino: "bg-orange-100 text-orange-700", het_caramel_albino: "bg-amber-100 text-amber-700",
  het_hypo: "bg-lime-100 text-lime-700", het_ivory: "bg-yellow-100 text-yellow-700",
  double_het: "bg-purple-100 text-purple-700",
  albino: "bg-pink-100 text-pink-700",
  ivory: "bg-yellow-100 text-yellow-700",
  caramel_albino: "bg-amber-100 text-amber-700",
  hypo: "bg-lime-100 text-lime-700",
  golden_greek: "bg-yellow-200 text-yellow-800",
  piebald: "bg-purple-100 text-purple-700",
  genetic_stripe: "bg-teal-100 text-teal-700",
  high_yellow: "bg-orange-100 text-orange-700",
  dark: "bg-slate-200 text-slate-700",
  paradox: "bg-indigo-100 text-indigo-700",
  anerythristic: "bg-gray-200 text-gray-700",
  axanthic: "bg-blue-100 text-blue-700",
  melanistic: "bg-gray-900 text-gray-100",
  mix: "bg-gradient-to-r from-purple-100 to-blue-100 text-purple-700",
  unknown: "bg-muted text-muted-foreground",
  // legacy
  over_scute: "bg-blue-100 text-blue-700",
  less_scute: "bg-purple-100 text-purple-700",
  wc: "bg-amber-100 text-amber-800",
  cb: "bg-teal-100 text-teal-700",
};

const speciesConfig = {
  sulcata:     { label: "Sulcata",      color: "bg-earth-600 text-white" },
  red_foot:    { label: "Red Foot",     color: "bg-red-600 text-white" },
  leopard:     { label: "Leopard",      color: "bg-yellow-600 text-white" },
  aldabra:     { label: "Aldabra",      color: "bg-emerald-700 text-white" },
  russian:     { label: "Russian",      color: "bg-blue-700 text-white" },
  hermann:     { label: "Hermann",      color: "bg-orange-600 text-white" },
  greek:       { label: "Greek",        color: "bg-cyan-700 text-white" },
  indian_star: { label: "Indian Star",  color: "bg-purple-700 text-white" },
  lainnya:     { label: "Lainnya",      color: "bg-gray-500 text-white" },
};

const shellTypeConfig = {
  normal:      { label: "Normal",      color: "bg-green-100 text-green-700" },
  smooth:      { label: "Smooth",      color: "bg-green-100 text-green-700" },
  less_scute:  { label: "Less Scute",  color: "bg-blue-100 text-blue-700" },
  over_scute:  { label: "Over Scute",  color: "bg-blue-100 text-blue-700" },
  pyramiding:  { label: "Pyramiding",  color: "bg-red-100 text-red-700" },
  wavy:        { label: "Wavy",        color: "bg-muted text-muted-foreground" },
  irregular:   { label: "Irregular",   color: "bg-orange-100 text-orange-700" },
};
const genderLabels = {
  jantan: "♂ Jantan", betina: "♀ Betina", belum_diketahui: "? Belum Diketahui",
};

function ProvenBadge({ gender, provenYear }) {
  const year = provenYear ? ` ${provenYear}` : "";
  if (gender === "jantan") return (
    <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-bold bg-blue-600 text-white shadow-sm">
      ♂ ✓ PROVEN{year}
    </span>
  );
  if (gender === "betina") return (
    <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-bold bg-pink-500 text-white shadow-sm">
      ♀ ✓ PROVEN{year}
    </span>
  );
  return (
    <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-bold bg-green-500 text-white shadow-sm">
      ✓ PROVEN{year}
    </span>
  );
}

export default function TortoiseCard({ tortoise, onEdit, onDelete, onMove, onSell, healthStatus = "none", latestHealth, parentIndicator, isSick = false }) {
  const { role } = useCurrentUser();
  const showPrice = canViewPrice(role);
  const [showHistory, setShowHistory] = useState(false);
  const [showEggHistory, setShowEggHistory] = useState(false);
  const [showSizeHistory, setShowSizeHistory] = useState(false);
  const [showGrowth, setShowGrowth] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [showLineage, setShowLineage] = useState(false);
  const [lightboxIdx, setLightboxIdx] = useState(null);

  const { data: allTortoises = [] } = useQuery({
    queryKey: ["tortoises-lineage"],
    queryFn: () => base44.entities.Tortoise.list("-created_date", 500),
    enabled: showLineage,
    staleTime: 5 * 60 * 1000,
  });

  const showActions = onEdit || onDelete || onMove;
  const health = healthConfig[healthStatus] || healthConfig.none;
  const morph = tortoise.morph || "normal";

  // Ambil semua foto (support multi-foto, is_primary, backward compat single photo_url)
  const photos = Array.isArray(tortoise.photos) && tortoise.photos.length > 0
    ? tortoise.photos
    : tortoise.photo_url ? [{ url: tortoise.photo_url, is_primary: true }] : [];
  // Gunakan foto is_primary=true sebagai thumbnail utama
  const primaryPhoto = photos.find(p => p.is_primary) || photos[0];
  const thumbnailUrl = primaryPhoto?.url || tortoise.photo_url || "";

  const shareWA = (url) => {
    const text = encodeURIComponent(`Foto kura-kura ${tortoise.name}: ${url}`);
    window.open(`https://wa.me/?text=${text}`, "_blank");
  };

  const cardBg = getCardBg(tortoise);
  const missingFields = getMissingFields("tortoise", tortoise);
  const activelySick = isSick || healthStatus === "critical";

  return (
    <>
    <Card className={`p-4 hover-lift group ${health.border} ${cardBg} ${activelySick ? "border-orange-400 border-2" : ""}`}>
      <div className="flex items-start gap-3">
        {/* Foto Thumbnail - DIPERBESAR */}
        <button
          className="w-24 h-24 sm:w-28 sm:h-28 rounded-xl bg-primary/5 flex items-center justify-center flex-shrink-0 overflow-hidden border-2 border-primary/10 hover:shadow-lg hover:scale-105 transition-all duration-200 relative group"
          onClick={() => photos.length > 0 && setLightboxIdx(0)}
          type="button"
        >
          {thumbnailUrl ? (
            <>
              <img src={thumbnailUrl} alt={tortoise.name} className={`w-full h-full object-cover group-hover:scale-110 transition-transform duration-300 ${tortoise.status === "mati" ? "grayscale" : ""}`} loading="lazy" />
              {photos.length > 1 && (
                <span className="absolute bottom-0 right-0 bg-black/60 text-white text-xs px-2 py-1 rounded-tl-md font-semibold">
                  +{photos.length - 1}
                </span>
              )}
            </>
          ) : (
            <div className={`w-full h-full flex flex-col items-center justify-center gap-0.5 ${
              tortoise.gender === "jantan" ? "bg-green-50 dark:bg-green-950/40" :
              tortoise.gender === "betina" ? "bg-orange-50 dark:bg-orange-950/40" :
              "bg-muted"
            }`}>
              <TortoiseArt size={78} className="opacity-60" />
              <span className="inline-flex items-center gap-1 text-[10px] font-medium text-muted-foreground">
                <Camera className="w-3 h-3" /> Tambah foto
              </span>
            </div>
          )}
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className={`font-bold ${tortoise.gender === "betina" ? "text-base text-pink-700" : "text-sm"}`}>
              {tortoise.name}
            </h3>
            {tortoise.code && <span className="text-xs text-muted-foreground">({tortoise.code})</span>}
            {tortoise.is_proven && <ProvenBadge gender={tortoise.gender} provenYear={tortoise.proven_year} />}
            {activelySick && (
              <span className="inline-flex items-center gap-0.5 text-[10px] px-2 py-0.5 rounded-full font-bold bg-red-600 text-white animate-pulse">
                🏥 SAKIT
              </span>
            )}
            <IncompleteBadge missingFields={missingFields} onEdit={onEdit ? () => onEdit(tortoise) : undefined} />
            {tortoise.age_category === "baby" && photos.length === 0 && (
              <span className="inline-flex items-center gap-0.5 text-[10px] px-2 py-0.5 rounded-full font-medium bg-gray-100 text-gray-600 border border-gray-300">
                📷 Belum ada foto
              </span>
            )}
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
            {tortoise.species && tortoise.species !== "sulcata" && speciesConfig[tortoise.species] && (
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${speciesConfig[tortoise.species].color}`}>
                {speciesConfig[tortoise.species].label}
              </span>
            )}
            {tortoise.source && sourceLabel[tortoise.source] && (
              <span 
                title={sourceLabel[tortoise.source].title}
                className={`text-[10px] px-2 py-1 rounded-full border font-bold ${sourceLabel[tortoise.source].color}`}
              >
                {sourceLabel[tortoise.source].text}
              </span>
            )}
            {tortoise.shell_type && tortoise.shell_type !== "normal" && shellTypeConfig[tortoise.shell_type] && (
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${shellTypeConfig[tortoise.shell_type].color}`}>
                🐚 {shellTypeConfig[tortoise.shell_type].label}
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
          {/* Death info */}
          {tortoise.status === "mati" && (
            <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-700 text-white font-semibold">💀 Mati</span>
              {tortoise.death_date && <span className="text-[10px] text-muted-foreground">{format(new Date(tortoise.death_date), "d MMM yyyy", { locale: id })}</span>}
              {tortoise.death_cause && <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-200 text-gray-700">{tortoise.death_cause.replace(/_/g, " ")}</span>}
            </div>
          )}
          {/* Umur otomatis dari birth_date */}
          <div className="mt-1.5">
            <AgeBadge birthDate={tortoise.birth_date} />
            {tortoise.last_weighed_date && (() => {
              const lastWeighed = new Date(tortoise.last_weighed_date);
              const today = new Date();
              const diffDays = Math.floor((today - lastWeighed) / (1000 * 60 * 60 * 24));
              const interval = tortoise.weighing_interval_days || 30;
              const needsWeighing = diffDays > interval;
              return (
                <span className={`inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full border ml-1 ${needsWeighing ? "bg-red-100 text-red-700 border-red-200 font-semibold" : "bg-muted text-muted-foreground border-border"}`}>
                  ⚖️ {needsWeighing ? `Perlu ditimbang! (${diffDays}h lalu)` : `Ditimbang ${diffDays}h lalu`}
                </span>
              );
            })()}
            {!tortoise.last_weighed_date && (
              <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full border ml-1 bg-amber-50 text-amber-700 border-amber-200">
                ⚖️ Belum pernah ditimbang
              </span>
            )}
          </div>
          {/* HPP - hanya untuk owner/admin/manajer */}
          {tortoise.hpp && (
            <div className="flex flex-wrap gap-1.5 mt-1.5">
              {showPrice
                ? <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200">HPP: Rp {tortoise.hpp.toLocaleString("id-ID")}</span>
                : <PriceField label="HPP" />
              }
            </div>
          )}
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
          {/* Harga beli — kecil & samar di bawah kartu */}
          {tortoise.purchase_price > 0 && (
            <p className="text-[10px] text-gray-400 mt-1.5">
              Beli: {showPrice ? `Rp ${tortoise.purchase_price.toLocaleString("id-ID")}` : "🔒"}
            </p>
          )}
        </div>

        {showActions && (
          <div className="flex flex-wrap gap-1 justify-end content-start w-[72px] opacity-100 lg:opacity-0 lg:group-hover:opacity-100 lg:focus-within:opacity-100 transition-opacity">
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
            {(tortoise.parent_male || tortoise.parent_female || tortoise.source === "hasil_sendiri") && (
              <Button variant="ghost" size="icon" className="h-7 w-7 text-primary" title="Silsilah" onClick={() => setShowLineage(true)}>
                <GitBranch className="w-3 h-3" />
              </Button>
            )}
            <Button variant="ghost" size="icon" className="h-7 w-7 text-emerald-600" title="Passport Digital"
              onClick={() => window.open(`/passport?id=${tortoise.id}`, "_blank")}>
              <FileText className="w-3 h-3" />
            </Button>
            {onSell && !["terjual", "mati", "diarsipkan"].includes(tortoise.status) && (
              <Button variant="ghost" size="icon" className="h-7 w-7 text-emerald-600" title="Jual Kura Ini" onClick={() => onSell(tortoise)}>
                <ShoppingBag className="w-3 h-3" />
              </Button>
            )}
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

      {/* Completeness Panel */}
      {missingFields.length > 0 && (
        <TortoiseCompletenessPanel tortoise={tortoise} onEdit={onEdit ? () => onEdit(tortoise) : undefined} />
      )}
    </Card>

    {/* Lightbox fullscreen in-app */}
    {lightboxIdx !== null && photos.length > 0 && (
      <TortoisePhotoLightbox
        photos={photos}
        startIndex={lightboxIdx}
        tortoiseCode={tortoise.code || ""}
        tortoiseName={tortoise.name || ""}
        onClose={() => setLightboxIdx(null)}
        onSetPrimary={async (i) => {
          const updated = photos.map((p, idx) => ({ ...p, is_primary: idx === i }));
          await base44.entities.Tortoise.update(tortoise.id, { photos: updated });
          setLightboxIdx(null);
        }}
        onShare={(url) => shareWA(url)}
      />
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

    {/* Foto Progres Pertumbuhan */}
    <Dialog open={showGrowth} onOpenChange={setShowGrowth}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Camera className="w-4 h-4 text-accent" />
            Foto Progres — {tortoise.name}
          </DialogTitle>
        </DialogHeader>
        <div className="py-2">
          <PhotoProgressPanel tortoise={tortoise} onClose={() => setShowGrowth(false)} />
        </div>
      </DialogContent>
    </Dialog>

    {/* Silsilah */}
    <Dialog open={showLineage} onOpenChange={setShowLineage}>
      <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <GitBranch className="w-4 h-4 text-primary" />
            Silsilah — {tortoise.name}
          </DialogTitle>
        </DialogHeader>
        <div className="py-2">
          <TortoiseLineagePanel tortoise={tortoise} allTortoises={allTortoises} />
        </div>
      </DialogContent>
    </Dialog>
    </>
  );
}
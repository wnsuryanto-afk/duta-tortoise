import { safeFormatDate } from "@/lib/safeDate";
import { CATEGORIES } from "@/lib/temuanCategorize";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RefreshCw, Stethoscope, CheckCircle2, XCircle, Pin } from "lucide-react";

/**
 * TemuanCard — kartu satu temuan AI Vision dengan thumbnail, info, dan tombol aksi.
 */
export default function TemuanCard({ finding, isRecurring, onPhotoClick, onSakit, onIncidental, onResolve, onIgnore }) {
  const cat = CATEGORIES[finding.category] || CATEGORIES.kualitas_foto;
  const isResolved = finding.status !== "active";
  const timeStr = finding.photo_taken_at || finding.resolved_at || "";

  return (
    <div className={`rounded-lg border p-3 ${cat.color} ${isResolved ? "opacity-60" : ""}`}>
      <div className="flex gap-2.5">
        {/* Thumbnail */}
        {finding.photo_url ? (
          <button onClick={() => onPhotoClick(finding.photo_url)} className="flex-shrink-0">
            <img
              src={finding.photo_url}
              alt="Bukti foto"
              className="h-16 w-20 object-cover rounded border hover:opacity-80 transition-opacity"
            />
          </button>
        ) : (
          <div className="h-16 w-20 bg-muted rounded border flex items-center justify-center text-muted-foreground text-xs">
            📷
          </div>
        )}

        {/* Info */}
        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <Badge variant="outline" className={`text-[10px] ${cat.badgeColor}`}>
              {cat.icon} {cat.label.replace(/^[^\s]+\s/, "")}
            </Badge>
            {isRecurring && !isResolved && (
              <Badge className="text-[10px] bg-orange-100 text-orange-700 border border-orange-200">
                🔁 Berulang
              </Badge>
            )}
            {isResolved && (
              <Badge className="text-[10px] bg-muted text-muted-foreground border border-border">
                {finding.status === "ignored" ? "Diabaikan" : "✓ Ditangani"}
              </Badge>
            )}
          </div>

          <p className="text-xs text-muted-foreground">
            {safeFormatDate(finding.date, "d MMM", undefined)}{timeStr ? ` · ${timeStr}` : ""}
            {" · "}{finding.task_title}
          </p>

          <p className="text-xs text-muted-foreground">
            👤 {finding.employee_name}
            {finding.enclosure ? ` · 🏠 ${finding.enclosure}` : ""}
          </p>

          <p className="text-sm font-medium text-foreground leading-snug">
            {finding.finding_text}
          </p>

          {isResolved && finding.resolution_action && (
            <p className="text-[10px] text-muted-foreground">
              {finding.resolution_action === "sick_report" ? "🤒 Dibuat laporan sakit" : finding.resolution_action === "incidental_task" ? "📌 Dibuat tugas insidentil" : "✓ Ditandai selesai"}
              {finding.resolved_by ? ` oleh ${finding.resolved_by}` : ""}
              {finding.resolved_at ? ` · ${safeFormatDate(finding.resolved_at, "d MMM HH:mm", undefined)}` : ""}
            </p>
          )}
        </div>
      </div>

      {/* Action buttons */}
      {!isResolved && (
        <div className="flex gap-1.5 mt-2 flex-wrap">
          {finding.category === "kesehatan_kura" && (
            <Button size="sm" variant="outline" className="h-7 text-[11px] gap-1 bg-red-50 border-red-200 text-red-700 hover:bg-red-100" onClick={() => onSakit(finding)}>
              <Stethoscope className="w-3 h-3" /> Buat Laporan Sakit
            </Button>
          )}
          <Button size="sm" variant="outline" className="h-7 text-[11px] gap-1 bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100" onClick={() => onIncidental(finding)}>
            <Pin className="w-3 h-3" /> Jadikan Tugas
          </Button>
          <Button size="sm" variant="outline" className="h-7 text-[11px] gap-1 bg-green-50 border-green-200 text-green-700 hover:bg-green-100" onClick={() => onResolve(finding, "manual")}>
            <CheckCircle2 className="w-3 h-3" /> Sudah ditangani
          </Button>
          <Button size="sm" variant="outline" className="h-7 text-[11px] gap-1 bg-muted border-border text-muted-foreground hover:bg-muted" onClick={() => onIgnore(finding)}>
            <XCircle className="w-3 h-3" /> Abaikan
          </Button>
        </div>
      )}
    </div>
  );
}
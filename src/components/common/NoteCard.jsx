import { Info, Lightbulb, AlertTriangle, CheckCircle2, StickyNote, X } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * NoteCard — kartu catatan bergaya memo tempel.
 *
 * Dipakai untuk kalimat yang menjelaskan angka di sekitarnya: apa artinya,
 * apa yang perlu dilakukan. Nadanya (`tone`) menentukan warna dan ikon, jadi
 * catatan penting terbaca duluan tanpa harus dibaca seluruhnya.
 *
 * tone: "info" | "tip" | "warning" | "success" | "note"
 */
const TONES = {
  info: {
    icon: Info,
    wrap: "bg-blue-50 border-blue-200 border-l-blue-400 dark:bg-blue-950/30 dark:border-blue-900 dark:border-l-blue-600",
    title: "text-blue-900 dark:text-blue-200",
    body: "text-blue-800/80 dark:text-blue-300/80",
    iconCls: "text-blue-500",
  },
  tip: {
    icon: Lightbulb,
    wrap: "bg-amber-50 border-amber-200 border-l-amber-400 dark:bg-amber-950/30 dark:border-amber-900 dark:border-l-amber-600",
    title: "text-amber-900 dark:text-amber-200",
    body: "text-amber-800/80 dark:text-amber-300/80",
    iconCls: "text-amber-500",
  },
  warning: {
    icon: AlertTriangle,
    wrap: "bg-red-50 border-red-200 border-l-red-400 dark:bg-red-950/30 dark:border-red-900 dark:border-l-red-600",
    title: "text-red-900 dark:text-red-200",
    body: "text-red-800/80 dark:text-red-300/80",
    iconCls: "text-red-500",
  },
  success: {
    icon: CheckCircle2,
    wrap: "bg-emerald-50 border-emerald-200 border-l-emerald-400 dark:bg-emerald-950/30 dark:border-emerald-900 dark:border-l-emerald-600",
    title: "text-emerald-900 dark:text-emerald-200",
    body: "text-emerald-800/80 dark:text-emerald-300/80",
    iconCls: "text-emerald-500",
  },
  note: {
    icon: StickyNote,
    wrap: "bg-muted/60 border-border border-l-primary/50",
    title: "text-foreground",
    body: "text-muted-foreground",
    iconCls: "text-primary/70",
  },
};

export default function NoteCard({
  tone = "note",
  title,
  children,
  icon,
  action,
  onDismiss,
  compact = false,
  className,
}) {
  const t = TONES[tone] || TONES.note;
  const Icon = icon || t.icon;

  return (
    <div
      className={cn(
        "surface-note flex items-start gap-2.5 animate-fade-in",
        compact ? "p-2.5" : "p-3.5",
        t.wrap,
        className
      )}
    >
      <Icon className={cn("flex-shrink-0 mt-0.5", compact ? "w-4 h-4" : "w-[18px] h-[18px]", t.iconCls)} />
      <div className="flex-1 min-w-0">
        {title && (
          <p className={cn("font-semibold leading-snug", compact ? "text-xs" : "text-[13px]", t.title)}>
            {title}
          </p>
        )}
        {children && (
          <div className={cn("leading-relaxed", compact ? "text-[11px]" : "text-xs", t.body, title && "mt-0.5")}>
            {children}
          </div>
        )}
        {action && <div className="mt-2">{action}</div>}
      </div>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Tutup catatan"
          className="flex-shrink-0 p-1 -m-1 rounded-lg text-current/50 hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
        >
          <X className="w-3.5 h-3.5 opacity-60" />
        </button>
      )}
    </div>
  );
}

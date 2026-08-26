import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * TrendPill — selisih terhadap periode sebelumnya, lengkap dengan arah.
 *
 * "Rp 12.000.000" saja tidak memberi tahu apa pun; "Rp 12.000.000, naik 8%
 * dari bulan lalu" baru bisa ditindaklanjuti. Naik tidak selalu berarti baik —
 * pengeluaran yang naik itu buruk — jadi warna ditentukan `positiveIsGood`,
 * bukan oleh tanda angkanya.
 */
export default function TrendPill({
  value = 0,
  previous,
  positiveIsGood = true,
  format,
  suffix = "",
  label = "vs bln lalu",
  showPercent = true,
  size = "sm",
  className,
}) {
  const delta = previous === undefined ? Number(value) : Number(value) - Number(previous);
  const flat = !Number.isFinite(delta) || Math.abs(delta) < 0.0001;

  const percent =
    previous !== undefined && Number(previous) !== 0
      ? (delta / Math.abs(Number(previous))) * 100
      : null;

  const naik = delta > 0;
  const baik = positiveIsGood ? naik : !naik;

  const tone = flat
    ? "bg-muted text-muted-foreground"
    : baik
      ? "bg-accent/12 text-accent"
      : "bg-destructive/12 text-destructive";

  const Icon = flat ? Minus : naik ? TrendingUp : TrendingDown;
  const pad = size === "xs" ? "px-1.5 py-0.5 text-[10px]" : "px-2 py-0.5 text-[11px]";
  const iconSize = size === "xs" ? "w-2.5 h-2.5" : "w-3 h-3";

  const angka = format
    ? format(Math.abs(delta))
    : Math.abs(delta).toLocaleString("id-ID");

  return (
    <span className={cn("inline-flex items-center gap-1 flex-wrap", className)}>
      <span
        className={cn(
          "inline-flex items-center gap-0.5 rounded-full font-semibold tabular",
          pad,
          tone
        )}
      >
        <Icon className={iconSize} />
        {flat ? (
          "sama"
        ) : (
          <>
            {naik ? "+" : "−"}
            {showPercent && percent !== null
              ? `${Math.abs(percent).toFixed(percent >= 100 ? 0 : 1)}%`
              : `${angka}${suffix}`}
          </>
        )}
      </span>
      {label && (
        <span className="text-[10px] text-muted-foreground whitespace-nowrap">{label}</span>
      )}
    </span>
  );
}

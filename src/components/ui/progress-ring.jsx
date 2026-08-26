import { useId } from "react";
import { cn } from "@/lib/utils";

/**
 * ProgressRing — cincin persentase.
 *
 * Dipakai untuk hal yang punya batas jelas (target poin, kelengkapan data,
 * tingkat penetasan). Untuk angka tanpa plafon, batang atau garis tren lebih
 * jujur karena tidak memaksakan "100%" yang tidak ada.
 */
export default function ProgressRing({
  value = 0,
  max = 100,
  size = 72,
  thickness = 7,
  label,
  sublabel,
  tone,
  className,
  children,
}) {
  const gid = useId();
  const pct = max > 0 ? Math.max(0, Math.min(1, Number(value) / Number(max))) : 0;
  const r = (size - thickness) / 2;
  const c = 2 * Math.PI * r;

  // Warna mengikuti capaian, jadi status terbaca tanpa membaca angkanya
  const auto =
    pct >= 0.85 ? "accent" : pct >= 0.5 ? "chart-5" : pct >= 0.25 ? "chart-2" : "destructive";
  const key = tone || auto;
  const stroke = `hsl(var(--${key}))`;

  return (
    <div
      className={cn("relative inline-flex items-center justify-center", className)}
      style={{ width: size, height: size }}
      role="img"
      aria-label={`${Math.round(pct * 100)}% ${label || ""}`.trim()}
    >
      <svg width={size} height={size} className="-rotate-90">
        <defs>
          <linearGradient id={`ring-${gid}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={stroke} stopOpacity="0.65" />
            <stop offset="100%" stopColor={stroke} />
          </linearGradient>
        </defs>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="hsl(var(--muted))"
          strokeWidth={thickness}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={`url(#ring-${gid})`}
          strokeWidth={thickness}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - pct)}
          style={{ transition: "stroke-dashoffset .9s cubic-bezier(.16,1,.3,1)" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center leading-none">
        {children ?? (
          <>
            <span
              className="font-heading font-bold tabular"
              style={{ fontSize: size * 0.26 }}
            >
              {Math.round(pct * 100)}%
            </span>
            {sublabel && (
              <span
                className="text-muted-foreground mt-0.5"
                style={{ fontSize: Math.max(8, size * 0.13) }}
              >
                {sublabel}
              </span>
            )}
          </>
        )}
      </div>
    </div>
  );
}

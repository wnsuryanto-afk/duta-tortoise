import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import AnimatedNumber from "@/components/ui/animated-number";
import TrendPill from "@/components/ui/trend-pill";
import { Sparkline } from "@/components/ui/sparkline";
import InfoHint from "@/components/ui/info-hint";
import { cn } from "@/lib/utils";

/**
 * StatCard — satu angka penting beserta konteksnya.
 *
 * Angka telanjang tidak bisa dipakai memutuskan apa pun, jadi kartu ini
 * menyediakan tempat untuk tiga hal sekaligus: arah (`trend`), bentuk
 * pergerakan (`spark`), dan arti (`hint` / `sub`). Semuanya opsional —
 * pemakaian lama yang hanya mengirim label/value/icon/color tetap jalan
 * seperti sebelumnya.
 */
export default function StatCard({
  label,
  value,
  icon: Icon,
  color = "bg-primary/15 text-primary",
  sub,
  hint,
  hintTitle,
  trend,
  spark,
  sparkPositiveIsGood = true,
  href,
  onClick,
  format,
  animate = true,
  accent,
  className,
}) {
  // Angka murni dianimasikan; nilai yang sudah diformat (mis. "Rp 1,2jt")
  // ditampilkan apa adanya karena tidak ada yang bisa dihitung darinya.
  const numeric = typeof value === "number" && Number.isFinite(value);
  const tampilan =
    animate && numeric ? <AnimatedNumber value={value} format={format} /> : value;

  const interaktif = !!(href || onClick);

  const body = (
    <div
      className={cn(
        "surface-raised relative overflow-hidden p-4 sm:p-5 h-full flex flex-col",
        interaktif && "hover-lift cursor-pointer group",
        className
      )}
    >
      {/* Sapuan warna lembut di sudut — memberi kartu kedalaman tanpa garis tegas */}
      <div
        className={cn(
          "absolute -top-10 -right-10 w-28 h-28 rounded-full blur-2xl opacity-[0.14] transition-opacity",
          interaktif && "group-hover:opacity-25",
          color.split(" ").find((c) => c.startsWith("bg-")) || "bg-primary"
        )}
      />

      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-1">
            <p className="text-xs sm:text-[13px] text-muted-foreground font-medium truncate">
              {label}
            </p>
            {hint && (
              <InfoHint title={hintTitle || label} size={13}>
                {hint}
              </InfoHint>
            )}
          </div>
          <p className="stat-value text-2xl sm:text-[28px] mt-1.5 text-foreground">
            {tampilan}
          </p>
        </div>

        {Icon && (
          <div
            className={cn(
              "w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center flex-shrink-0 transition-transform",
              interaktif && "group-hover:scale-110 group-hover:rotate-3",
              color
            )}
          >
            <Icon className="w-5 h-5" />
          </div>
        )}
      </div>

      <div className="relative flex items-end justify-between gap-2 mt-auto pt-2.5 min-h-[26px]">
        <div className="min-w-0">
          {trend ? (
            <TrendPill {...trend} />
          ) : sub ? (
            <span className="text-[11px] text-muted-foreground leading-snug">{sub}</span>
          ) : null}
        </div>
        {spark?.length > 1 && (
          <Sparkline data={spark} positiveIsGood={sparkPositiveIsGood} />
        )}
      </div>

      {/* Garis aksen bawah — penanda kategori kartu */}
      <div
        className={cn(
          "absolute bottom-0 left-0 right-0 h-[3px] opacity-70",
          accent || color.split(" ").find((c) => c.startsWith("bg-")) || "bg-primary"
        )}
      />

      {interaktif && (
        <ArrowRight className="absolute bottom-3 right-3 w-3.5 h-3.5 text-muted-foreground opacity-0 -translate-x-1 group-hover:opacity-60 group-hover:translate-x-0 transition-all" />
      )}
    </div>
  );

  if (href) return <Link to={href} className="block h-full">{body}</Link>;
  if (onClick)
    return (
      <button type="button" onClick={onClick} className="block w-full h-full text-left">
        {body}
      </button>
    );
  return body;
}

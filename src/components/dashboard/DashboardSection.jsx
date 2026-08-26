import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * DashboardSection — pembungkus satu kelompok widget dashboard.
 *
 * Judulnya kini bisa membawa keterangan singkat dan penghitung, supaya
 * pengguna tahu isi bagian sebelum membukanya. Anak-anaknya muncul berurutan
 * (`stagger`) agar halaman terasa mengalir, bukan menghentak sekaligus.
 */
export default function DashboardSection({
  title,
  description,
  icon: Icon,
  count,
  badge,
  action,
  children,
  defaultOpen = true,
  canCollapse = true,
  stagger = true,
  className,
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  const heading = (
    <>
      {Icon && (
        <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10 text-primary flex-shrink-0 transition-colors group-hover:bg-primary/18">
          <Icon className="w-[17px] h-[17px]" />
        </span>
      )}
      <span className="min-w-0 text-left">
        <span className="flex items-center gap-2 flex-wrap">
          <span className="font-heading text-[15px] sm:text-base font-semibold text-foreground">
            {title}
          </span>
          {count !== undefined && count !== null && (
            <span className="badge-pill bg-primary/10 text-primary tabular">{count}</span>
          )}
          {badge}
        </span>
        {description && (
          <span className="block text-[11px] text-muted-foreground font-normal mt-0.5 leading-snug">
            {description}
          </span>
        )}
      </span>
    </>
  );

  return (
    <section className={cn("space-y-3", className)}>
      <div className="flex items-center gap-2">
        {canCollapse ? (
          <button
            onClick={() => setIsOpen((v) => !v)}
            aria-expanded={isOpen}
            className="group flex items-center gap-2.5 flex-1 min-w-0 py-1 rounded-lg hover:text-primary transition-colors"
          >
            {heading}
            <ChevronDown
              className={cn(
                "w-4 h-4 ml-auto flex-shrink-0 text-muted-foreground transition-transform duration-300",
                isOpen && "rotate-180"
              )}
            />
          </button>
        ) : (
          <div className="group flex items-center gap-2.5 flex-1 min-w-0">{heading}</div>
        )}
        {action && <div className="flex-shrink-0">{action}</div>}
      </div>

      {isOpen && (
        <div className={cn("animate-fade-in", stagger && "stagger")}>{children}</div>
      )}
    </section>
  );
}

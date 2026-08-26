import { HelpCircle, Info } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

/**
 * InfoHint — penjelasan singkat di sebelah angka atau label.
 *
 * Dibangun di atas Popover, bukan Tooltip: sebagian besar tim membuka aplikasi
 * ini dari ponsel, dan tooltip hover tidak pernah muncul di layar sentuh.
 * Popover terbuka lewat ketukan, jadi penjelasannya benar-benar terbaca.
 */
export default function InfoHint({
  children,
  title,
  variant = "help",
  side = "top",
  align = "center",
  className,
  size = 14,
}) {
  const Icon = variant === "info" ? Info : HelpCircle;
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={title ? `Penjelasan: ${title}` : "Penjelasan"}
          onClick={(e) => e.stopPropagation()}
          className={cn(
            "inline-flex items-center justify-center rounded-full text-muted-foreground/70",
            "hover:text-primary hover:bg-primary/10 transition-colors align-middle p-0.5",
            className
          )}
        >
          <Icon style={{ width: size, height: size }} />
        </button>
      </PopoverTrigger>
      <PopoverContent
        side={side}
        align={align}
        className="w-64 p-3 text-xs leading-relaxed"
        onClick={(e) => e.stopPropagation()}
      >
        {title && <p className="font-semibold text-foreground mb-1 text-[13px]">{title}</p>}
        <div className="text-muted-foreground space-y-1">{children}</div>
      </PopoverContent>
    </Popover>
  );
}

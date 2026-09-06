import { LeafPattern } from "@/components/common/Illustration";
import { cn } from "@/lib/utils";

/**
 * PageHeader — kepala halaman bergradien dengan ringkasan angka.
 *
 * Menggantikan judul polos: selain nama halaman, ia langsung menampilkan
 * beberapa angka penting (`chips`) sehingga pengguna tahu keadaan sebelum
 * menggulir. Ilustrasi ditaruh di kanan dan disembunyikan di layar sempit —
 * di ponsel, ruang itu lebih berguna untuk angka.
 *
 * ── KENAPA SUSUNANNYA MENUMPUK DI PONSEL ───────────────────────────
 *
 * Dulu kepala halaman ini SELALU dua kolom bersebelahan: teks di kiri,
 * tombol di kanan. Kolom tombol memakai flex-shrink-0 — artinya menolak
 * mengecil — sementara kolom teks memakai flex-1 min-w-0, artinya bersedia
 * mengecil sampai nyaris nol.
 *
 * Di ponsel, halaman dengan tiga tombol lebar (Breeding: "Pindai Label",
 * "Unduh Label Aktif", "Tambah Data") membuat kolom tombol memakan hampir
 * seluruh lebar layar. Sisanya untuk judul: "Breeding & Telur" terpotong
 * jadi "B.", anak judulnya turun satu kata per baris, dan keempat angka
 * ringkasan berdiri bertumpuk ke bawah.
 *
 * Sekarang di bawah md kepala halaman menumpuk: teks dulu, tombol di
 * bawahnya dengan lebar penuh. Bersebelahan hanya mulai md ke atas, di
 * mana memang ada ruangnya.
 */
export function HeaderChip({ icon: Icon, label, value, tone = "default", onClick, title }) {
  const tones = {
    default: "bg-card/70 text-foreground border-border",
    good: "bg-accent/12 text-accent border-accent/25",
    warn: "bg-amber-500/12 text-amber-700 dark:text-amber-400 border-amber-500/25",
    bad: "bg-destructive/12 text-destructive border-destructive/25",
  };
  const Comp = onClick ? "button" : "div";
  return (
    <Comp
      onClick={onClick}
      title={title}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold backdrop-blur-sm",
        "transition-all",
        onClick && "hover:-translate-y-0.5 hover:shadow-card cursor-pointer",
        tones[tone] || tones.default
      )}
    >
      {Icon && <Icon className="w-3.5 h-3.5 flex-shrink-0" />}
      <span className="text-muted-foreground font-medium">{label}</span>
      <span className="tabular">{value}</span>
    </Comp>
  );
}

export default function PageHeader({
  title,
  subtitle,
  description,
  icon: Icon,
  art,
  chips,
  actions,
  children,
  className,
}) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border border-border surface-leaf p-5 sm:p-6 mb-5 animate-fade-in",
        className
      )}
    >
      <LeafPattern className="text-primary opacity-[0.045]" />

      <div className="relative flex flex-col md:flex-row md:items-start md:justify-between gap-4">
        <div className="min-w-0 md:flex-1">
          <div className="flex items-center gap-2.5">
            {Icon && (
              <span className="flex items-center justify-center w-9 h-9 rounded-xl bg-primary/12 text-primary flex-shrink-0">
                <Icon className="w-[18px] h-[18px]" />
              </span>
            )}
            <div className="min-w-0">
              {/* Tanpa truncate: judul halaman yang terpotong jadi satu huruf
                  lebih buruk daripada judul yang turun dua baris. */}
              <h1 className="font-heading text-lg sm:text-xl font-bold text-foreground leading-tight break-words">
                {title}
              </h1>
              {subtitle && (
                <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
              )}
            </div>
          </div>

          {description && (
            <p className="text-[13px] text-muted-foreground mt-2.5 max-w-2xl leading-relaxed">
              {description}
            </p>
          )}

          {chips?.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 mt-4">
              {/* `key` dikeluarkan dari objeknya: menyebarkan objek yang masih
                  memuat key ke JSX membuat React memperingatkan, dan key itu
                  bukan prop yang perlu diterima HeaderChip. */}
              {chips.map(({ key, ...c }, i) => (
                <HeaderChip key={key || c.label || i} {...c} />
              ))}
            </div>
          )}

          {children && <div className="mt-4">{children}</div>}
        </div>

        <div className="flex flex-col md:items-end gap-3 md:flex-shrink-0">
          {actions && (
            <div className="flex items-center gap-2 flex-wrap justify-start md:justify-end">{actions}</div>
          )}
          {art && (
            <div className="hidden md:block opacity-90 animate-float">{art}</div>
          )}
        </div>
      </div>
    </div>
  );
}

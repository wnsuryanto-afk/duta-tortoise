import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import Illustration from "@/components/common/Illustration";
import { cn } from "@/lib/utils";

/**
 * Layar tunggu, gagal, dan kosong yang dipakai lintas halaman.
 *
 * Skeleton lebih disukai daripada spinner bila bentuk hasilnya sudah bisa
 * ditebak: pengguna melihat tata letak terbentuk lebih dulu, jadi halaman
 * terasa lebih cepat meski waktu muatnya sama.
 */
export function LoadingSpinner({ message = "Memuat data..." }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-3">
      <div className="relative">
        <div className="w-9 h-9 border-4 border-primary/15 border-t-primary rounded-full animate-spin" />
      </div>
      <p className="text-sm text-muted-foreground animate-skeleton">{message}</p>
    </div>
  );
}

/** Kerangka kartu — dipakai saat jumlah kartu yang akan datang sudah diketahui */
export function SkeletonCards({ count = 4, className }) {
  return (
    <div className={cn("grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4", className)}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="surface-raised p-5 space-y-3">
          <div className="flex items-start justify-between">
            <div className="h-3 w-20 rounded shimmer" />
            <div className="h-10 w-10 rounded-xl shimmer" />
          </div>
          <div className="h-7 w-24 rounded shimmer" />
          <div className="h-2.5 w-16 rounded shimmer" />
        </div>
      ))}
    </div>
  );
}

/** Kerangka daftar — baris berulang dengan tinggi yang sama */
export function SkeletonList({ rows = 5, className }) {
  return (
    <div className={cn("space-y-2", className)}>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 p-3 rounded-xl border border-border">
          <div className="h-10 w-10 rounded-full shimmer flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-3 rounded shimmer" style={{ width: `${60 + ((i * 13) % 30)}%` }} />
            <div className="h-2.5 w-1/3 rounded shimmer" />
          </div>
          <div className="h-6 w-14 rounded-full shimmer flex-shrink-0" />
        </div>
      ))}
    </div>
  );
}

/** Kerangka grafik — kotak dengan batang berbeda tinggi agar mirip hasil akhirnya */
export function SkeletonChart({ height = 200, className }) {
  const tinggi = [45, 70, 35, 85, 60, 75];
  return (
    <div className={cn("surface-raised p-5", className)}>
      <div className="h-3.5 w-32 rounded shimmer mb-4" />
      <div className="flex items-end gap-2" style={{ height }}>
        {tinggi.map((t, i) => (
          <div key={i} className="flex-1 rounded-t-md shimmer" style={{ height: `${t}%` }} />
        ))}
      </div>
    </div>
  );
}

export function ErrorState({ message = "Gagal memuat data.", onRetry }) {
  return (
    <div className="flex flex-col items-center justify-center py-14 gap-3 text-center px-4">
      <div className="w-14 h-14 rounded-full bg-destructive/10 flex items-center justify-center">
        <span className="text-2xl">⚠️</span>
      </div>
      <div>
        <p className="text-sm text-destructive font-semibold">{message}</p>
        <p className="text-xs text-muted-foreground mt-1">
          Periksa koneksi internet, lalu coba muat ulang.
        </p>
      </div>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry} className="gap-2 hover-lift">
          <RefreshCw className="w-3.5 h-3.5" />
          Coba Lagi
        </Button>
      )}
    </div>
  );
}

export function EmptyState({
  title = "Belum ada data",
  description,
  action,
  actionLabel = "Tambah",
  art = "empty",
}) {
  return (
    <div className="flex flex-col items-center justify-center py-14 gap-3 text-center px-4">
      <Illustration name={art} size="md" className="animate-float" />
      <div>
        <p className="font-heading font-semibold text-foreground">{title}</p>
        {description && <p className="text-sm text-muted-foreground mt-1 max-w-sm">{description}</p>}
      </div>
      {action && (
        <Button size="sm" onClick={action} className="gap-2 hover-lift">
          + {actionLabel}
        </Button>
      )}
    </div>
  );
}

export default LoadingSpinner;

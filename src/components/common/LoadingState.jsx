import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export function LoadingSpinner({ message = "Memuat data..." }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-3">
      <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );
}

export function ErrorState({ message = "Gagal memuat data.", onRetry }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-3 text-center px-4">
      <p className="text-sm text-destructive font-medium">
        ⚠️ {message}
      </p>
      <p className="text-xs text-muted-foreground">Coba refresh halaman.</p>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry} className="gap-2">
          <RefreshCw className="w-3.5 h-3.5" />
          Coba Lagi
        </Button>
      )}
    </div>
  );
}

export function EmptyState({ title = "Belum ada data", description, action, actionLabel = "Tambah" }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-3 text-center px-4">
      <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center">
        <span className="text-2xl">📭</span>
      </div>
      <div>
        <p className="font-medium text-foreground">{title}</p>
        {description && <p className="text-sm text-muted-foreground mt-1">{description}</p>}
      </div>
      {action && (
        <Button size="sm" onClick={action} className="gap-2">
          + {actionLabel}
        </Button>
      )}
    </div>
  );
}

export default LoadingSpinner;
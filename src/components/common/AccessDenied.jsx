import { ShieldOff } from "lucide-react";

export default function AccessDenied({ message }) {
  return (
    <div className="flex flex-col items-center justify-center py-32 text-muted-foreground">
      <ShieldOff className="w-14 h-14 mb-4 opacity-20" />
      <p className="text-lg font-semibold text-foreground">🔒 Akses Terbatas</p>
      <p className="text-sm mt-1">{message || "Anda tidak memiliki izin untuk mengakses halaman ini."}</p>
      <p className="text-xs mt-2 text-muted-foreground/60">Hubungi Owner jika Anda memerlukan akses</p>
    </div>
  );
}
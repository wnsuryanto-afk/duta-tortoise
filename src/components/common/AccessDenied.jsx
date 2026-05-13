import { ShieldOff } from "lucide-react";

export default function AccessDenied() {
  return (
    <div className="flex flex-col items-center justify-center py-32 text-muted-foreground">
      <ShieldOff className="w-14 h-14 mb-4 opacity-25" />
      <p className="text-lg font-medium">Akses Ditolak</p>
      <p className="text-sm mt-1">Anda tidak memiliki izin untuk mengakses halaman ini.</p>
    </div>
  );
}
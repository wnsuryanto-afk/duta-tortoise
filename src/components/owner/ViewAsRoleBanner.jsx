import { AlertTriangle, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ViewAsRoleBanner({ viewAsLabel, onReset }) {
  return (
    <div className="fixed top-0 left-0 right-0 z-[100] bg-yellow-400 text-yellow-900 px-4 py-2 flex items-center justify-between gap-3 shadow-md">
      <div className="flex items-center gap-2 min-w-0">
        <AlertTriangle className="w-4 h-4 flex-shrink-0" />
        <span className="text-sm font-medium truncate">
          ⚠️ Mode Pratinjau — Anda melihat tampilan sebagai <strong>{viewAsLabel}</strong>
        </span>
      </div>
      <Button
        size="sm"
        variant="outline"
        className="border-yellow-700 text-yellow-900 hover:bg-yellow-300 whitespace-nowrap flex-shrink-0 h-7 text-xs"
        onClick={onReset}
      >
        <X className="w-3 h-3 mr-1" /> Kembali ke Tampilan Owner
      </Button>
    </div>
  );
}
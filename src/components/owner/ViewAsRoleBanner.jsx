import { Eye, X, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

const ROLE_META = {
  owner:          { emoji: "👑", label: "Owner" },
  manajer:        { emoji: "📊", label: "Manajer" },
  admin:          { emoji: "🗂️", label: "Admin" },
  kepala_feeder:  { emoji: "👨‍💼", label: "Kepala Feeder" },
  keeper:         { emoji: "👷", label: "Keeper" },
  investor:       { emoji: "👁", label: "Investor" },
};

export default function ViewAsRoleBanner({ viewAsLabel, viewAsRole, onReset }) {
  const meta = ROLE_META[viewAsRole] || { emoji: "👁", label: viewAsLabel };

  return (
    <div className="fixed top-0 left-0 right-0 z-[100] bg-blue-600 text-white px-4 py-2 flex items-center justify-between gap-3 shadow-lg">
      <div className="flex items-center gap-2 min-w-0">
        <Eye className="w-4 h-4 flex-shrink-0 opacity-80" />
        <span className="text-sm font-medium truncate">
          👁 Melihat sebagai: <strong>{meta.emoji} {viewAsLabel || meta.label}</strong>
        </span>
        <span className="hidden sm:inline text-xs bg-white/20 px-2 py-0.5 rounded-full ml-1">
          Mode Pratinjau — tidak ada perubahan yang bisa disimpan
        </span>
      </div>
      <Button
        size="sm"
        variant="outline"
        className="border-white/50 text-white hover:bg-white/20 hover:text-white whitespace-nowrap flex-shrink-0 h-7 text-xs bg-transparent"
        onClick={onReset}
      >
        <ArrowLeft className="w-3 h-3 mr-1" /> Kembali ke Owner
      </Button>
    </div>
  );
}
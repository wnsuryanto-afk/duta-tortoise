import { useState } from "react";
import { AlertTriangle, X, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

/**
 * Banner kuning untuk owner — muncul HANYA jika profile tidak complete.
 * Cek utama: is_complete flag di UserProfile.
 * Field opsional (bank, hp_whatsapp) tidak memicu banner jika is_complete sudah true.
 */
export default function IncompleteProfileBanner({ user, profile }) {
  const [dismissed, setDismissed] = useState(false);
  const navigate = useNavigate();

  if (dismissed) return null;
  if (!user) return null;

  // Cek utama: is_complete flag
  if (profile?.is_complete === true) return null;
  // Tanpa profile, anggap belum lengkap
  if (!profile) return null;

  return (
    <div className="bg-amber-50 border border-amber-300 rounded-xl px-4 py-3 flex items-start gap-3 mb-4">
      <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-amber-900">⚠️ Profil kamu belum lengkap</p>
        <p className="text-xs text-amber-700 mt-0.5">
          Lengkapi data profil agar laporan dan notifikasi berjalan dengan baik.
        </p>
      </div>
      <div className="flex gap-2 flex-shrink-0">
        <Button
          size="sm"
          className="h-7 text-xs bg-amber-600 hover:bg-amber-700 text-white gap-1"
          onClick={() => navigate("/edit-profil")}
        >
          Lengkapi <ChevronRight className="w-3 h-3" />
        </Button>
        <button onClick={() => setDismissed(true)} className="text-amber-500 hover:text-amber-700 p-1">
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
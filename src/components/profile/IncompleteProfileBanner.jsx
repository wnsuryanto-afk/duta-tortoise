import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { AlertTriangle, X, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

const REQUIRED_FIELDS = ["full_name", "phone", "join_date", "bank_name", "bank_account_number"];

function isProfileIncomplete(profile) {
  if (!profile) return true;
  return REQUIRED_FIELDS.some(f => !profile[f] || profile[f] === "-");
}

export default function IncompleteProfileBanner({ user, profile }) {
  const [dismissed, setDismissed] = useState(false);
  const navigate = useNavigate();

  if (dismissed) return null;
  if (!user || !isProfileIncomplete(profile)) return null;

  const missing = REQUIRED_FIELDS.filter(f => !profile?.[f] || profile[f] === "-");
  const fieldLabels = {
    full_name: "Nama Lengkap", phone: "No. Telepon", join_date: "Tanggal Bergabung",
    bank_name: "Nama Bank", bank_account_number: "No. Rekening"
  };

  return (
    <div className="bg-amber-50 border border-amber-300 rounded-xl px-4 py-3 flex items-start gap-3 mb-4">
      <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-amber-900">⚠️ Profil kamu belum lengkap</p>
        <p className="text-xs text-amber-700 mt-0.5">
          Lengkapi data berikut agar gaji dan notifikasi berjalan dengan baik:{" "}
          <span className="font-medium">{missing.map(f => fieldLabels[f]).join(", ")}</span>
        </p>
      </div>
      <div className="flex gap-2 flex-shrink-0">
        <Button
          size="sm"
          className="h-7 text-xs bg-amber-600 hover:bg-amber-700 text-white gap-1"
          onClick={() => navigate("/hr")}
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
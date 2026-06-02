import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useCurrentUser } from "@/lib/useCurrentUser";
import { FlaskConical } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";

export default function TestModeBanner() {
  const { user, role } = useCurrentUser();
  const qc = useQueryClient();
  const [turning, setTurning] = useState(false);

  const { data: settings = [] } = useQuery({
    queryKey: ["company-settings"],
    queryFn: () => base44.entities.CompanySettings.filter({ setting_key: "main" }),
    staleTime: 30 * 1000,
  });

  const setting = settings[0];
  if (!setting?.test_mode_active) return null;

  const handleTurnOff = async () => {
    if (role !== "owner") return;
    setTurning(true);
    await base44.entities.CompanySettings.update(setting.id, { test_mode_active: false });
    qc.invalidateQueries({ queryKey: ["company-settings"] });
    toast.success("✅ Test Mode dimatikan");
    setTurning(false);
  };

  return (
    <div className="bg-red-600 text-white px-4 py-2.5 flex items-center justify-between gap-3 flex-wrap">
      <div className="flex items-center gap-2">
        <FlaskConical className="w-4 h-4 flex-shrink-0 animate-pulse" />
        <span className="text-sm font-semibold">
          TEST MODE AKTIF — Data yang Anda buat tidak akan masuk laporan.
        </span>
      </div>
      {role === "owner" && (
        <button
          onClick={handleTurnOff}
          disabled={turning}
          className="text-xs font-semibold bg-white text-red-700 hover:bg-red-50 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-60 whitespace-nowrap"
        >
          {turning ? "Mematikan..." : "Matikan Test Mode"}
        </button>
      )}
    </div>
  );
}
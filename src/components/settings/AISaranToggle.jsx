import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Switch } from "@/components/ui/switch";
import { Sparkles, ScanEye, Loader2 } from "lucide-react";
import { toast } from "sonner";

/**
 * AISaranToggle — pengaturan AI Vision untuk owner.
 * - Saklar 1: Aktif/nonaktifkan AI Vision keseluruhan (verifikasi foto task).
 * - Saklar 2: Aktif/nonaktifkan pengiriman saran ke keeper (apresiasi + saran).
 * Penilaian teknis tetap untuk owner walau saran dinonaktifkan.
 */
export default function AISaranToggle() {
  const qc = useQueryClient();
  const [togglingVision, setTogglingVision] = useState(false);
  const [togglingSaran, setTogglingSaran] = useState(false);

  const { data: settings = [] } = useQuery({
    queryKey: ["company-settings"],
    queryFn: () => base44.entities.CompanySettings.filter({ setting_key: "main" }),
    staleTime: 30 * 1000,
  });

  const setting = settings[0];
  const visionEnabled = setting?.ai_vision_enabled !== false;
  const saranEnabled = setting?.ai_saran_enabled !== false;

  const handleToggleVision = async (checked) => {
    setTogglingVision(true);
    try {
      if (setting) {
        await base44.entities.CompanySettings.update(setting.id, { ai_vision_enabled: checked });
      }
      qc.invalidateQueries({ queryKey: ["company-settings"] });
      qc.invalidateQueries({ queryKey: ["company-settings-main"] });
      toast.success(checked ? "AI Vision diaktifkan" : "AI Vision dinonaktifkan — foto tidak dianalisis");
    } catch (e) {
      toast.error("Gagal: " + (e.message || e));
    }
    setTogglingVision(false);
  };

  const handleToggleSaran = async (checked) => {
    setTogglingSaran(true);
    try {
      if (setting) {
        await base44.entities.CompanySettings.update(setting.id, { ai_saran_enabled: checked });
      }
      qc.invalidateQueries({ queryKey: ["company-settings"] });
      qc.invalidateQueries({ queryKey: ["company-settings-main"] });
      toast.success(checked ? "Saran AI diaktifkan untuk keeper" : "Saran AI dinonaktifkan untuk keeper");
    } catch (e) {
      toast.error("Gagal: " + (e.message || e));
    }
    setTogglingSaran(false);
  };

  return (
    <div className="space-y-3">
      {/* AI Vision on/off */}
      <div className="flex items-center justify-between gap-3 p-4 rounded-xl border border-indigo-200 bg-indigo-50/30">
        <div className="flex items-start gap-2.5">
          <ScanEye className="w-5 h-5 text-indigo-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-foreground">AI Vision (Verifikasi Foto)</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Saat aktif, foto bukti task dianalisis AI secara otomatis di latar belakang.
              Jika dinonaktifkan, foto tidak dianalisis sama sekali.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {togglingVision && <Loader2 className="w-3.5 h-3.5 text-muted-foreground animate-spin" />}
          <Switch checked={visionEnabled} onCheckedChange={handleToggleVision} disabled={togglingVision} />
        </div>
      </div>

      {/* Saran to keeper on/off */}
      <div className="flex items-center justify-between gap-3 p-4 rounded-xl border border-purple-200 bg-purple-50/30">
        <div className="flex items-start gap-2.5">
          <Sparkles className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-foreground">Saran AI untuk Keeper</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Saat aktif, keeper menerima apresiasi & saran membangun dari AI setelah foto task.
              Penilaian teknis tetap untuk owner. Jika nonaktif, keeper tidak melihat saran AI.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {togglingSaran && <Loader2 className="w-3.5 h-3.5 text-muted-foreground animate-spin" />}
          <Switch checked={saranEnabled} onCheckedChange={handleToggleSaran} disabled={togglingSaran} />
        </div>
      </div>
    </div>
  );
}
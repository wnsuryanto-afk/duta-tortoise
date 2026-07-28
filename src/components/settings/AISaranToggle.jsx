import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Switch } from "@/components/ui/switch";
import { Sparkles, Loader2 } from "lucide-react";
import { toast } from "sonner";

/**
 * AISaranToggle — saklar untuk owner menonaktifkan saran AI otomatis ke keeper.
 * Jika nonaktif: keeper tidak melihat apresiasi/saran AI (penilaian teknis tetap untuk owner).
 */
export default function AISaranToggle() {
  const qc = useQueryClient();
  const [toggling, setToggling] = useState(false);

  const { data: settings = [] } = useQuery({
    queryKey: ["company-settings"],
    queryFn: () => base44.entities.CompanySettings.filter({ setting_key: "main" }),
    staleTime: 30 * 1000,
  });

  const setting = settings[0];
  const enabled = setting?.ai_saran_enabled !== false;

  const handleToggle = async (checked) => {
    setToggling(true);
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
    setToggling(false);
  };

  return (
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
        {toggling && <Loader2 className="w-3.5 h-3.5 text-muted-foreground animate-spin" />}
        <Switch checked={enabled} onCheckedChange={handleToggle} disabled={toggling} />
      </div>
    </div>
  );
}
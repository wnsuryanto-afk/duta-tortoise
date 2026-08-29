import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ChevronDown, ChevronRight, Settings, Save, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useCompanySettings } from "@/lib/useCompanySettings";

/**
 * Pengaturan tarif gaji mingguan (owner only).
 * Tarif harian, lembur per jam, dan rempesan per trip — semuanya bisa
 * diubah dari sini, tidak ditanam di kode.
 */
const ROLES = ["keeper", "kepala_feeder"];

export default function WeeklyRateSettings() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(null);
  const [saving, setSaving] = useState(false);

  const { data: configs = [] } = useQuery({
    queryKey: ["salary-configs"],
    queryFn: () => base44.entities.SalaryConfig.list(),
    staleTime: 60 * 1000,
  });

  const companySettings = useCompanySettings();
  const [autoOvertime, setAutoOvertime] = useState(true);
  const [poinBonus, setPoinBonus] = useState(false);
  const [savingToggles, setSavingToggles] = useState(false);

  useEffect(() => {
    setAutoOvertime(companySettings.auto_overtime_enabled !== false);
    setPoinBonus(companySettings.poin_bonus_enabled === true);
  }, [companySettings.auto_overtime_enabled, companySettings.poin_bonus_enabled, companySettings.id]);

  const saveToggles = async () => {
    setSavingToggles(true);
    try {
      if (companySettings.id) {
        await base44.entities.CompanySettings.update(companySettings.id, {
          auto_overtime_enabled: autoOvertime,
          poin_bonus_enabled: poinBonus,
        });
        qc.invalidateQueries({ queryKey: ["company-settings-main"] });
        toast.success("Pengaturan disimpan");
      } else {
        toast.error("Pengaturan perusahaan belum tersedia. Lengkapi data perusahaan dulu.");
      }
    } catch (e) {
      toast.error("Gagal menyimpan: " + (e?.message || "kesalahan"));
    }
    setSavingToggles(false);
  };

  // Inisialisasi draft saat configs dimuat / panel dibuka
  const ensureDraft = () => {
    if (draft) return;
    const d = {};
    ROLES.forEach((r) => {
      const c = configs.find((x) => x.role === r) || {};
      d[r] = {
        id: c.id || null,
        base_salary: c.base_salary ?? 70000,
        overtime_rate_per_hour: c.overtime_rate_per_hour ?? 10000,
        rempesan_rate_per_trip: c.rempesan_rate_per_trip ?? 30000,
      };
    });
    setDraft(d);
  };

  const setField = (role, field, value) =>
    setDraft((p) => ({ ...p, [role]: { ...p[role], [field]: Number(value) || 0 } }));

  const handleSave = async () => {
    setSaving(true);
    try {
      for (const r of ROLES) {
        const d = draft[r];
        if (d.id) {
          await base44.entities.SalaryConfig.update(d.id, {
            base_salary: d.base_salary,
            overtime_rate_per_hour: d.overtime_rate_per_hour,
            rempesan_rate_per_trip: d.rempesan_rate_per_trip,
          });
        } else {
          await base44.entities.SalaryConfig.create({
            role: r,
            base_salary: d.base_salary,
            overtime_rate_per_hour: d.overtime_rate_per_hour,
            rempesan_rate_per_trip: d.rempesan_rate_per_trip,
          });
        }
      }
      qc.invalidateQueries({ queryKey: ["salary-configs"] });
      toast.success("Tarif gaji mingguan disimpan");
    } catch (e) {
      toast.error("Gagal menyimpan: " + (e?.message || "kesalahan"));
    }
    setSaving(false);
  };

  const fmt = (n) => `Rp ${Number(n || 0).toLocaleString("id-ID")}`;

  return (
    <Card className="overflow-hidden">
      <button
        className="w-full flex items-center justify-between p-4 text-left"
        onClick={() => {
          const next = !open;
          setOpen(next);
          if (next) ensureDraft();
        }}
      >
        <span className="flex items-center gap-2 font-semibold text-sm">
          <Settings className="w-4 h-4 text-primary" /> Pengaturan Tarif Mingguan
        </span>
        {open ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
      </button>
      {open && draft && (
        <div className="px-4 pb-4 space-y-4">
          <p className="text-xs text-muted-foreground">
            Tarif dipakai untuk slip gaji mingguan keeper & kepala feeder. Diubah di sini, slip berikutnya otomatis memakai nilai baru.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-muted/40 text-xs text-muted-foreground">
                  <th className="text-left p-2 border border-border">Peran</th>
                  <th className="text-right p-2 border border-border">Tarif Harian</th>
                  <th className="text-right p-2 border border-border">Lembur/Jam</th>
                  <th className="text-right p-2 border border-border">Rempesan/Trip</th>
                </tr>
              </thead>
              <tbody>
                {ROLES.map((r) => (
                  <tr key={r}>
                    <td className="p-2 border border-border font-medium capitalize">
                      {r === "kepala_feeder" ? "Kepala Feeder" : "Keeper"}
                    </td>
                    <td className="p-2 border border-border">
                      <Input
                        type="number"
                        value={draft[r].base_salary}
                        onChange={(e) => setField(r, "base_salary", e.target.value)}
                        className="h-8 text-right"
                      />
                    </td>
                    <td className="p-2 border border-border">
                      <Input
                        type="number"
                        value={draft[r].overtime_rate_per_hour}
                        onChange={(e) => setField(r, "overtime_rate_per_hour", e.target.value)}
                        className="h-8 text-right"
                      />
                    </td>
                    <td className="p-2 border border-border">
                      <Input
                        type="number"
                        value={draft[r].rempesan_rate_per_trip}
                        onChange={(e) => setField(r, "rempesan_rate_per_trip", e.target.value)}
                        className="h-8 text-right"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="rounded-lg border border-border p-3 space-y-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Pengaturan Perhitungan</p>
            <div className="flex items-center justify-between gap-3">
              <div className="flex-1">
                <p className="text-sm font-medium">Hitung lembur otomatis</p>
                <p className="text-[11px] text-muted-foreground">Bila dimatikan, jam lembur diisi manual per karyawan di slip mingguan. Bawaan aktif.</p>
              </div>
              <Switch checked={autoOvertime} onCheckedChange={setAutoOvertime} />
            </div>
            <div className="flex items-center justify-between gap-3">
              <div className="flex-1">
                <p className="text-sm font-medium">Aktifkan bonus poin</p>
                <p className="text-[11px] text-muted-foreground">Bila dimatikan, poin tetap dicatat sebagai pencapaian tetapi tidak menjadi uang. Bawaan MATI.</p>
              </div>
              <Switch checked={poinBonus} onCheckedChange={setPoinBonus} />
            </div>
            <div className="flex justify-end">
              <Button onClick={saveToggles} disabled={savingToggles} size="sm" variant="outline" className="gap-1.5">
                {savingToggles ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                Simpan Pengaturan
              </Button>
            </div>
          </div>
          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={saving} className="gap-2" size="sm">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Simpan Tarif
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}
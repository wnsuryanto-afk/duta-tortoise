import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useCurrentUser } from "@/lib/useCurrentUser";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Star, Target, TrendingUp, Save, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

function formatRp(val) {
  return "Rp " + Number(val || 0).toLocaleString("id-ID");
}

export default function TargetPoinSettings() {
  const { role } = useCurrentUser();
  const queryClient = useQueryClient();
  const canEdit = ["owner", "manajer"].includes(role);

  const { data: settings, isLoading } = useQuery({
    queryKey: ["company-settings"],
    queryFn: async () => {
      const res = await base44.entities.CompanySettings.filter({ setting_key: "main" });
      return res[0] || null;
    },
    staleTime: 5 * 60 * 1000,
  });

  const [target, setTarget] = useState("");
  const [nilaiPoin, setNilaiPoin] = useState("");
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (settings) {
      setTarget(String(settings.min_poin_bulanan ?? 300));
      setNilaiPoin(String(settings.nilai_per_poin ?? 500));
      setDirty(false);
    }
  }, [settings]);

  const handleSave = async () => {
    const t = parseInt(target);
    const n = parseInt(nilaiPoin);
    if (isNaN(t) || t <= 0) { toast.error("Target poin harus > 0"); return; }
    if (isNaN(n) || n < 0) { toast.error("Nilai per poin tidak boleh negatif"); return; }

    setSaving(true);
    if (settings?.id) {
      await base44.entities.CompanySettings.update(settings.id, {
        min_poin_bulanan: t,
        nilai_per_poin: n,
      });
    } else {
      await base44.entities.CompanySettings.create({
        setting_key: "main",
        company_name: "Duta Tortoise",
        min_poin_bulanan: t,
        nilai_per_poin: n,
      });
    }
    queryClient.invalidateQueries({ queryKey: ["company-settings"] });
    toast.success("Pengaturan target & poin disimpan ✅");
    setSaving(false);
    setDirty(false);
  };

  const targetNum = parseInt(target) || 0;
  const nilaiNum = parseInt(nilaiPoin) || 0;
  const contohBonus = formatRp(targetNum * nilaiNum);

  if (isLoading) return <div className="h-20 animate-pulse rounded-xl bg-muted" />;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Star className="w-5 h-5 text-amber-500 fill-amber-400" />
          Target & Poin Bulanan
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Target Poin */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium flex items-center gap-1.5">
              <Target className="w-4 h-4 text-primary" />
              Target Poin Bulanan per Karyawan
            </label>
            {canEdit ? (
              <Input
                type="number"
                min={1}
                value={target}
                onChange={e => { setTarget(e.target.value); setDirty(true); }}
                placeholder="Contoh: 300"
              />
            ) : (
              <div className="h-9 flex items-center px-3 rounded-md border bg-muted text-sm font-semibold text-primary">
                {settings?.min_poin_bulanan ?? 300} poin
              </div>
            )}
            <p className="text-xs text-muted-foreground">Poin minimum yang harus dicapai tiap bulan</p>
          </div>

          {/* Nilai per Poin */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-green-600" />
              Nilai Rupiah per Poin
            </label>
            {canEdit ? (
              <Input
                type="number"
                min={0}
                value={nilaiPoin}
                onChange={e => { setNilaiPoin(e.target.value); setDirty(true); }}
                placeholder="Contoh: 500"
              />
            ) : (
              <div className="h-9 flex items-center px-3 rounded-md border bg-muted text-sm font-semibold text-green-700">
                {formatRp(settings?.nilai_per_poin ?? 500)} / poin
              </div>
            )}
            <p className="text-xs text-muted-foreground">Bonus per poin di atas target minimum</p>
          </div>
        </div>

        {/* Contoh perhitungan */}
        <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-sm">
          <p className="font-semibold text-amber-800 mb-1">💡 Contoh Perhitungan</p>
          <p className="text-amber-700">
            Jika karyawan mencapai{" "}
            <span className="font-bold">{targetNum.toLocaleString("id-ID")} poin</span>
            {" "}= bonus{" "}
            <span className="font-bold text-green-700">{contohBonus}</span>
          </p>
          <p className="text-xs text-amber-600 mt-1">
            Poin di atas target × Rp {nilaiNum.toLocaleString("id-ID")} = bonus tambahan
          </p>
        </div>

        {!canEdit && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground p-2 bg-muted rounded-lg">
            <AlertTriangle className="w-3.5 h-3.5" />
            Hanya Owner & Manajer yang dapat mengubah pengaturan ini
          </div>
        )}

        {canEdit && (
          <Button
            onClick={handleSave}
            disabled={saving || !dirty}
            className="gap-2"
          >
            <Save className="w-4 h-4" />
            {saving ? "Menyimpan..." : "Simpan Pengaturan"}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
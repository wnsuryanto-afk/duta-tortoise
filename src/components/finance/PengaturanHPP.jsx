import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { diPeternakan } from "@/lib/populasiKura";
import { Info, Save, Loader2, Settings } from "lucide-react";
import { masukLaporan } from "@/lib/laporan";

function fmt(n) { return (n || 0).toLocaleString("id-ID"); }

export default function PengaturanHPP() {
  const qc = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState("");

  const { data: settings = [] } = useQuery({
    queryKey: ["company-settings-hpp"],
    queryFn: () => base44.entities.CompanySettings.list("setting_key", 5),
  });

  const currentFallback = settings[0]?.hpp_fallback_per_ekor ?? 100000;
  const [fallback, setFallback] = useState(null);

  // Fetch data untuk tabel riwayat biaya per ekor
  const { data: allFinanceTx = [] } = useQuery({
    queryKey: ["finance-transactions-hpp"],
    queryFn: () => base44.entities.FinanceTransaction.list("-date", 500),
  });
  const { data: tortoises = [] } = useQuery({
    queryKey: ["tortoises-hpp"],
    queryFn: () => base44.entities.Tortoise.list("name", 2000),
  });

  // Hitung riwayat bulanan
  const monthlyHistory = useMemo(() => {
    const now = new Date();
    const months = [];
    for (let i = 0; i < 12; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      months.push(key);
    }

    return months.map(month => {
      const totalFinance = allFinanceTx
        .filter(t => t.type === "pengeluaran" && (t.date || "").startsWith(month) && masukLaporan(t))
        .reduce((s, t) => s + (t.amount || 0), 0);

      // Hanya totalFinance. Gaji sudah ada di dalamnya sejak slip yang ditandai
      // dibayar membuat FinanceTransaction-nya sendiri (D18), dan pencairan kas
      // kecil bukan biaya - biayanya muncul saat dibelanjakan, juga sebagai
      // FinanceTransaction. Menjumlahkan ketiganya menghitung sebagian biaya dua
      // kali dan menggelembungkan HPP setiap kura.
      const total = totalFinance;
      // Definisi populasi yang sama dengan seluruh aplikasi: yang dikecualikan
      // adalah yang sudah keluar, bukan daftar putih status. Daftar putih
      // melewatkan kura berstatus "sakit", sehingga kura yang sakit menghilang
      // dari pembagi dan menaikkan biaya per ekor semua kura lain.
      const activeCount = tortoises.filter(diPeternakan).length;

      const costPer = (activeCount > 0 && total > 0) ? Math.round(total / activeCount) : null;

      return {
        month,
        label: new Date(parseInt(month.split("-")[0]), parseInt(month.split("-")[1]) - 1, 1).toLocaleDateString("id-ID", { month: "long", year: "numeric" }),
        total_pengeluaran: total,
        active_count: activeCount,
        cost_per_tortoise: costPer,
      };
    }).filter(m => m.cost_per_tortoise != null);
  }, [allFinanceTx, tortoises]);

  const handleSave = async () => {
    setSaving(true);
    setSuccess("");
    const val = fallback != null ? fallback : currentFallback;
    try {
      if (settings.length > 0) {
        await base44.entities.CompanySettings.update(settings[0].id, { hpp_fallback_per_ekor: val });
      }
      qc.invalidateQueries({ queryKey: ["company-settings-hpp"] });
      qc.invalidateQueries({ queryKey: ["company-settings-cost"] });
      setSuccess("Pengaturan disimpan ✓");
      setFallback(null);
    } catch (_) { setSuccess("Gagal menyimpan"); }
    setSaving(false);
  };

  const displayFallback = fallback != null ? fallback : currentFallback;

  return (
    <div className="space-y-5">
      <Card className="p-5">
        <h2 className="font-semibold text-base mb-4 flex items-center gap-2">
          <Settings className="w-4 h-4" /> Pengaturan HPP — Fallback Biaya Per Ekor
        </h2>
        <p className="text-sm text-muted-foreground mb-4">
          Biaya ini dipakai sebagai <strong>estimasi default</strong> saat belum ada data pengeluaran aktual bulan ini.
          Setelah ada data pengeluaran, sistem akan menghitung otomatis dari total pengeluaran ÷ jumlah kura aktif.
        </p>

        <div className="flex items-end gap-3">
          <div className="space-y-1.5">
            <Label>Fallback Biaya Per Ekor/Bulan (Rp)</Label>
            <Input
              type="number"
              min={0}
              value={displayFallback}
              onChange={e => setFallback(Number(e.target.value))}
              className="w-52"
            />
          </div>
          <Button onClick={handleSave} disabled={saving} className="gap-2">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Simpan
          </Button>
        </div>
        {success && <p className="text-xs text-green-600 mt-2">{success}</p>}

        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-start gap-2">
          <Info className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-xs text-blue-800">
            <p><strong>Rumus biaya aktual:</strong> Total pengeluaran bulan ini ÷ Jumlah kura di peternakan</p>
            <p className="mt-1">Pengeluaran dihitung dari FinanceTransaction saja. Gaji sudah termasuk di dalamnya — slip yang ditandai dibayar membuat catatan biayanya sendiri. Pencairan kas kecil tidak dihitung di sini: biayanya muncul saat uangnya dibelanjakan, juga sebagai FinanceTransaction. Data uji dan catatan yang dikecualikan tidak ikut.</p>
            <p className="mt-1">Pembaginya memakai jumlah kura <strong>saat ini</strong> untuk semua bulan, termasuk bulan-bulan lampau — riwayat populasi per bulan belum disimpan, jadi biaya per ekor bulan lama hanya perkiraan kasar.</p>
          </div>
        </div>
      </Card>

      {/* Riwayat Biaya Per Ekor */}
      <Card className="p-5">
        <h2 className="font-semibold text-base mb-4">📈 Riwayat Biaya Per Ekor Per Bulan</h2>
        {monthlyHistory.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">Belum ada data pengeluaran yang tercatat</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs text-muted-foreground">
                  <th className="pb-2">Bulan</th>
                  <th className="pb-2 text-right">Total Pengeluaran</th>
                  <th className="pb-2 text-right">Kura Aktif</th>
                  <th className="pb-2 text-right">Biaya/Ekor</th>
                  <th className="pb-2 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {monthlyHistory.map(m => (
                  <tr key={m.month}>
                    <td className="py-2 font-medium">{m.label}</td>
                    <td className="py-2 text-right">Rp {fmt(m.total_pengeluaran)}</td>
                    <td className="py-2 text-right">{m.active_count} ekor</td>
                    <td className="py-2 text-right font-semibold">{m.cost_per_tortoise ? `Rp ${fmt(m.cost_per_tortoise)}` : "-"}</td>
                    <td className="py-2 text-center">
                      <Badge className="bg-green-100 text-green-700 text-[10px] border-0">Data aktual</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
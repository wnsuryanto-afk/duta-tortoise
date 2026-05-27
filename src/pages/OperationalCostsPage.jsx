import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Users, Pill, Leaf, Salad, Loader2, TrendingDown, TrendingUp, Trophy } from "lucide-react";
import { format, subMonths } from "date-fns";
import { id } from "date-fns/locale";
import { useCurrentUser } from "@/lib/useCurrentUser";
import { canAccess } from "@/lib/permissions";
import AccessDenied from "@/components/common/AccessDenied";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

const CATEGORIES = {
  gaji: {
    label: "Gaji",
    icon: Users,
    color: "bg-blue-100 text-blue-700",
    chartColor: "#3B82F6",
    subCategories: ["Gaji Mingguan", "Gaji Bulanan", "Kasbon", "Lembur"],
  },
  obat_perawatan: {
    label: "Obat & Perawatan",
    icon: Pill,
    color: "bg-red-100 text-red-700",
    chartColor: "#EF4444",
    subCategories: ["Obat-obatan", "Alat Medis", "Biaya Drh/Konsultasi"],
  },
  vitamin_suplemen: {
    label: "Vitamin & Suplemen",
    icon: Leaf,
    color: "bg-green-100 text-green-700",
    chartColor: "#22C55E",
    subCategories: ["Vitamin", "Suplemen", "Kalsium", "Probiotik"],
  },
  pakan: {
    label: "Pakan",
    icon: Salad,
    color: "bg-lime-100 text-lime-700",
    chartColor: "#84CC16",
    subCategories: ["Pakan Wajib", "Pakan Tidak Wajib", "Sayur", "Pelet", "Rumput/Hay"],
  },
};

function formatRp(v) { return "Rp " + (v || 0).toLocaleString("id-ID"); }

const LAST_12 = Array.from({ length: 12 }, (_, i) => {
  const d = subMonths(new Date(), 11 - i);
  return { value: format(d, "yyyy-MM"), label: format(d, "MMM yy", { locale: id }) };
});

const EMPTY_FORM = {
  category: "gaji",
  sub_category: "",
  amount: "",
  date: format(new Date(), "yyyy-MM-dd"),
  description: "",
};

export default function OperationalCostsPage() {
  const { user, role } = useCurrentUser();
  const qc = useQueryClient();
  const canManage = ["owner", "admin", "manajer"].includes(role);

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [activeCard, setActiveCard] = useState(null);

  const { data: transactions = [], isLoading } = useQuery({
    queryKey: ["finance-transactions-ops"],
    queryFn: () => base44.entities.FinanceTransaction.list("-date", 500),
  });

  const { data: salarySlips = [] } = useQuery({
    queryKey: ["salary-slips-ops"],
    queryFn: () => base44.entities.SalarySlip.list("-created_date", 200),
  });

  if (!canAccess(role, "finance")) return <AccessDenied />;

  const opsTx = transactions.filter(t => Object.keys(CATEGORIES).includes(t.category));
  const thisMonth = format(new Date(), "yyyy-MM");
  const lastMonth = format(subMonths(new Date(), 1), "yyyy-MM");
  const thisMonthTx = opsTx.filter(t => t.date?.startsWith(thisMonth));
  const lastMonthTx = opsTx.filter(t => t.date?.startsWith(lastMonth));
  const totalThisMonth = thisMonthTx.reduce((s, t) => s + (t.amount || 0), 0);
  const totalLastMonth = lastMonthTx.reduce((s, t) => s + (t.amount || 0), 0);

  const chartData = LAST_12.map(({ value, label }) => {
    const monthTx = opsTx.filter(t => t.date?.startsWith(value));
    const entry = { month: label };
    Object.keys(CATEGORIES).forEach(cat => {
      entry[cat] = monthTx.filter(t => t.category === cat).reduce((s, t) => s + (t.amount || 0), 0);
    });
    return entry;
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.category || !form.amount || !form.date) return;
    setSaving(true);
    await base44.entities.FinanceTransaction.create({
      type: "pengeluaran",
      category: form.category,
      sub_category: form.sub_category,
      amount: Number(form.amount),
      date: form.date,
      description: form.description || `${CATEGORIES[form.category]?.label} — ${form.sub_category || ""}`,
      created_by_name: user?.full_name || user?.email,
    });
    qc.invalidateQueries({ queryKey: ["finance-transactions-ops"] });
    qc.invalidateQueries({ queryKey: ["finance-transactions"] });
    setSaving(false);
    setShowForm(false);
    setForm(EMPTY_FORM);
  };

  const detailTx = activeCard
    ? thisMonthTx.filter(t => t.category === activeCard)
    : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-heading font-bold flex items-center gap-2">
            <TrendingDown className="w-6 h-6 text-primary" /> Biaya Operasional
          </h1>
          <p className="text-muted-foreground text-sm mt-1">Gaji, Obat & Perawatan, Vitamin, Pakan</p>
        </div>
        {canManage && (
          <Button onClick={() => setShowForm(true)} className="gap-2">
            <Plus className="w-4 h-4" /> Catat Biaya
          </Button>
        )}
      </div>

      {/* Total + Poin Widget */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card className="p-4 col-span-2">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Total Pengeluaran Bulan Ini</p>
              <p className="text-2xl font-bold">{formatRp(totalThisMonth)}</p>
              <p className="text-xs text-muted-foreground">{format(new Date(), "MMMM yyyy", { locale: id })}</p>
            </div>
            <div className="text-right">
              {totalLastMonth > 0 && (
                <div className={`flex items-center gap-1 text-sm font-medium ${totalThisMonth > totalLastMonth ? "text-red-500" : "text-green-600"}`}>
                  {totalThisMonth > totalLastMonth ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                  {totalLastMonth > 0 ? `${Math.abs(Math.round((totalThisMonth - totalLastMonth) / totalLastMonth * 100))}% vs bulan lalu` : ""}
                </div>
              )}
            </div>
          </div>
        </Card>
        <Card className="p-4 bg-amber-50 border-amber-200">
          <div className="flex items-center gap-2 mb-1">
            <Trophy className="w-5 h-5 text-amber-600" />
            <p className="text-sm font-semibold text-amber-800">Sistem Poin</p>
          </div>
          <p className="text-xs text-amber-700">Sistem poin belum diaktifkan</p>
          <p className="text-xs text-muted-foreground mt-1">Aktifkan di Pengaturan Finance</p>
        </Card>
      </div>

      {/* Category Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {Object.entries(CATEGORIES).map(([key, conf]) => {
          const Icon = conf.icon;
          const total = thisMonthTx.filter(t => t.category === key).reduce((s, t) => s + (t.amount || 0), 0);
          const lastTotal = lastMonthTx.filter(t => t.category === key).reduce((s, t) => s + (t.amount || 0), 0);
          const pct = totalThisMonth > 0 ? Math.round((total / totalThisMonth) * 100) : 0;
          const trend = total > lastTotal ? "up" : total < lastTotal ? "down" : "flat";
          return (
            <Card
              key={key}
              className={`p-4 cursor-pointer hover:shadow-md transition-all ${activeCard === key ? "ring-2 ring-primary" : ""}`}
              onClick={() => setActiveCard(activeCard === key ? null : key)}
            >
              <div className="flex items-center gap-2 mb-2">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${conf.color}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <span className="text-xs font-medium text-muted-foreground flex-1">{conf.label}</span>
                {trend === "up" && <TrendingUp className="w-3.5 h-3.5 text-red-500" />}
                {trend === "down" && <TrendingDown className="w-3.5 h-3.5 text-green-600" />}
              </div>
              <p className="text-lg font-bold">{formatRp(total)}</p>
              <p className="text-[10px] text-muted-foreground">{pct}% dari total</p>
            </Card>
          );
        })}
      </div>

      {/* Detail per kategori */}
      {activeCard && (
        <Card className="overflow-hidden">
          <div className="p-4 border-b flex items-center justify-between">
            <h3 className="font-semibold text-sm">Detail — {CATEGORIES[activeCard]?.label} (Bulan Ini)</h3>
            <Button size="sm" variant="ghost" onClick={() => setActiveCard(null)}>✕</Button>
          </div>
          <div className="divide-y">
            {detailTx.length === 0 ? (
              <p className="text-center py-6 text-muted-foreground text-sm">Belum ada catatan bulan ini</p>
            ) : (
              detailTx.map(tx => (
                <div key={tx.id} className="flex items-center gap-3 px-4 py-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{tx.description}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{tx.date ? format(new Date(tx.date), "d MMM yyyy", { locale: id }) : "—"}</span>
                      {tx.sub_category && <Badge variant="outline" className="text-[10px]">{tx.sub_category}</Badge>}
                    </div>
                  </div>
                  <p className="text-sm font-bold text-red-600 flex-shrink-0">-{formatRp(tx.amount)}</p>
                </div>
              ))
            )}
          </div>
        </Card>
      )}

      {/* Trend chart */}
      <Card className="p-5">
        <h3 className="font-semibold mb-4">Tren Biaya 12 Bulan Terakhir</h3>
        {isLoading ? (
          <div className="flex items-center justify-center h-48">
            <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E1D8" />
              <XAxis dataKey="month" tick={{ fontSize: 10 }} />
              <YAxis tickFormatter={v => v > 0 ? `${Math.round(v / 1000)}K` : "0"} tick={{ fontSize: 10 }} />
              <Tooltip formatter={(v, name) => [formatRp(v), CATEGORIES[name]?.label || name]} />
              {Object.entries(CATEGORIES).map(([key, conf], i) => (
                <Bar key={key} dataKey={key} stackId="a" fill={conf.chartColor}
                  radius={i === Object.keys(CATEGORIES).length - 1 ? [4, 4, 0, 0] : undefined} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        )}
      </Card>

      {/* Recent transactions */}
      <Card className="overflow-hidden">
        <div className="p-4 border-b"><h3 className="font-semibold text-sm">Riwayat Transaksi</h3></div>
        <div className="divide-y">
          {opsTx.slice(0, 30).map(tx => {
            const conf = CATEGORIES[tx.category];
            const Icon = conf?.icon || TrendingDown;
            return (
              <div key={tx.id} className="flex items-center gap-3 px-4 py-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${conf?.color || "bg-muted text-muted-foreground"}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{tx.description || conf?.label}</p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{tx.date ? format(new Date(tx.date), "d MMM yyyy", { locale: id }) : "—"}</span>
                    {tx.sub_category && <span>· {tx.sub_category}</span>}
                  </div>
                </div>
                <p className="text-sm font-bold text-red-600 flex-shrink-0">-{formatRp(tx.amount)}</p>
              </div>
            );
          })}
          {opsTx.length === 0 && !isLoading && (
            <p className="text-center py-10 text-muted-foreground text-sm">Belum ada catatan biaya operasional</p>
          )}
        </div>
      </Card>

      {/* Form dialog */}
      <Dialog open={showForm} onOpenChange={o => !o && setShowForm(false)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="w-5 h-5 text-primary" /> Catat Biaya Operasional
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-3 mt-2">
            <div>
              <Label className="text-xs">Kategori *</Label>
              <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v, sub_category: "" }))}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(CATEGORIES).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Sub-kategori</Label>
              <Select value={form.sub_category} onValueChange={v => setForm(f => ({ ...f, sub_category: v }))}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Pilih sub-kategori..." /></SelectTrigger>
                <SelectContent>
                  {(CATEGORIES[form.category]?.subCategories || []).map(s => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Nominal (Rp) *</Label>
              <Input type="number" min={0} value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} required className="mt-1" placeholder="150000" />
            </div>
            <div>
              <Label className="text-xs">Tanggal *</Label>
              <Input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} className="mt-1" required />
            </div>
            <div>
              <Label className="text-xs">Keterangan</Label>
              <Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className="mt-1" placeholder="Keterangan opsional..." />
            </div>
            <div className="flex gap-2 pt-1">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setShowForm(false)}>Batal</Button>
              <Button type="submit" className="flex-1" disabled={saving || !form.amount || !form.date}>
                {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Simpan
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
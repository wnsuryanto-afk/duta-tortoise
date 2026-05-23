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
import { Plus, Zap, Droplets, Wifi, Home, Hammer, Loader2, TrendingDown } from "lucide-react";
import { format, subMonths, startOfMonth } from "date-fns";
import { id } from "date-fns/locale";
import { useCurrentUser } from "@/lib/useCurrentUser";
import { canAccess } from "@/lib/permissions";
import AccessDenied from "@/components/common/AccessDenied";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

const UTIL_CATEGORIES = {
  listrik:          { label: "Listrik", icon: Zap,      color: "bg-yellow-100 text-yellow-700", chartColor: "#EAB308" },
  air:              { label: "Air",     icon: Droplets,  color: "bg-blue-100 text-blue-700",    chartColor: "#3B82F6" },
  internet:         { label: "Internet",icon: Wifi,      color: "bg-purple-100 text-purple-700",chartColor: "#A855F7" },
  sewa:             { label: "Sewa",    icon: Home,      color: "bg-orange-100 text-orange-700",chartColor: "#F97316" },
  perawatan_kandang:{ label: "Perawatan Kandang", icon: Hammer, color: "bg-green-100 text-green-700", chartColor: "#22C55E" },
};

function formatRp(v) { return "Rp " + (v || 0).toLocaleString("id-ID"); }

// Build last 12 months label list
const LAST_12 = Array.from({ length: 12 }, (_, i) => {
  const d = subMonths(new Date(), 11 - i);
  return { value: format(d, "yyyy-MM"), label: format(d, "MMM yy", { locale: id }) };
});

export default function OperationalCostsPage() {
  const { user, role } = useCurrentUser();
  const qc = useQueryClient();
  const canManage = ["owner", "admin", "manajer"].includes(role);

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    category: "listrik",
    amount: "",
    date: format(new Date(), "yyyy-MM-dd"),
    description: "",
    enclosure_name: "",
  });
  const [saving, setSaving] = useState(false);

  const { data: transactions = [], isLoading } = useQuery({
    queryKey: ["finance-transactions-util"],
    queryFn: () => base44.entities.FinanceTransaction.list("-date", 500),
  });

  const { data: enclosures = [] } = useQuery({
    queryKey: ["enclosures"],
    queryFn: () => base44.entities.Enclosure.list("name"),
  });

  if (!canAccess(role, "finance")) return <AccessDenied />;

  // Filter only utility categories
  const utilTx = transactions.filter(t => Object.keys(UTIL_CATEGORIES).includes(t.category));

  // Chart data: last 12 months, per category
  const chartData = LAST_12.map(({ value, label }) => {
    const monthTx = utilTx.filter(t => t.date?.startsWith(value));
    const entry = { month: label };
    Object.keys(UTIL_CATEGORIES).forEach(cat => {
      entry[cat] = monthTx.filter(t => t.category === cat).reduce((s, t) => s + (t.amount || 0), 0);
    });
    return entry;
  });

  // Current month totals
  const thisMonth = format(new Date(), "yyyy-MM");
  const thisMonthTx = utilTx.filter(t => t.date?.startsWith(thisMonth));
  const totalThisMonth = thisMonthTx.reduce((s, t) => s + (t.amount || 0), 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    await base44.entities.FinanceTransaction.create({
      type: "pengeluaran",
      category: form.category,
      amount: Number(form.amount),
      date: form.date,
      description: form.description || UTIL_CATEGORIES[form.category]?.label || form.category,
      enclosure_name: form.enclosure_name || undefined,
      created_by_name: user?.full_name || user?.email,
    });
    qc.invalidateQueries({ queryKey: ["finance-transactions-util"] });
    qc.invalidateQueries({ queryKey: ["finance-transactions"] });
    setSaving(false);
    setShowForm(false);
    setForm({ category: "listrik", amount: "", date: format(new Date(), "yyyy-MM-dd"), description: "", enclosure_name: "" });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-heading font-bold flex items-center gap-2">
            <TrendingDown className="w-6 h-6 text-primary" /> Biaya Operasional Rutin
          </h1>
          <p className="text-muted-foreground text-sm mt-1">Listrik, air, internet, sewa, perawatan kandang</p>
        </div>
        {canManage && (
          <Button onClick={() => setShowForm(true)} className="gap-2">
            <Plus className="w-4 h-4" /> Catat Biaya
          </Button>
        )}
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {Object.entries(UTIL_CATEGORIES).map(([key, conf]) => {
          const Icon = conf.icon;
          const total = thisMonthTx.filter(t => t.category === key).reduce((s, t) => s + (t.amount || 0), 0);
          return (
            <Card key={key} className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${conf.color}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <span className="text-xs font-medium text-muted-foreground">{conf.label}</span>
              </div>
              <p className="text-lg font-bold text-foreground">{formatRp(total)}</p>
              <p className="text-[10px] text-muted-foreground">Bulan ini</p>
            </Card>
          );
        })}
      </div>

      <Card className="p-4">
        <div className="flex items-center justify-between mb-1">
          <h3 className="font-semibold text-sm">Total Biaya Bulan Ini</h3>
          <Badge className="bg-orange-100 text-orange-700">{formatRp(totalThisMonth)}</Badge>
        </div>
        <p className="text-xs text-muted-foreground">{format(new Date(), "MMMM yyyy", { locale: id })}</p>
      </Card>

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
              <YAxis tickFormatter={v => v > 0 ? `${Math.round(v/1000)}K` : "0"} tick={{ fontSize: 10 }} />
              <Tooltip formatter={(v, name) => [formatRp(v), UTIL_CATEGORIES[name]?.label || name]} />
              {Object.entries(UTIL_CATEGORIES).map(([key, conf]) => (
                <Bar key={key} dataKey={key} stackId="a" fill={conf.chartColor} radius={key === "perawatan_kandang" ? [4,4,0,0] : undefined} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        )}
      </Card>

      {/* Recent transactions */}
      <Card className="overflow-hidden">
        <div className="p-4 border-b">
          <h3 className="font-semibold text-sm">Riwayat Transaksi</h3>
        </div>
        <div className="divide-y">
          {utilTx.slice(0, 30).map(tx => {
            const conf = UTIL_CATEGORIES[tx.category];
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
                    {tx.enclosure_name && <span>📦 {tx.enclosure_name}</span>}
                  </div>
                </div>
                <p className="text-sm font-bold text-red-600 flex-shrink-0">-{formatRp(tx.amount)}</p>
              </div>
            );
          })}
          {utilTx.length === 0 && !isLoading && (
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
              <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(UTIL_CATEGORIES).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Nominal (Rp) *</Label>
              <Input type="number" min={0} value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} required className="mt-1" placeholder="150000" />
            </div>
            <div>
              <Label className="text-xs">Tanggal</Label>
              <Input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} className="mt-1" />
            </div>
            <div>
              <Label className="text-xs">Keterangan</Label>
              <Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className="mt-1" placeholder="Tagihan PLN Mei 2026" />
            </div>
            <div>
              <Label className="text-xs">Alokasi Kandang (opsional)</Label>
              <Select value={form.enclosure_name} onValueChange={v => setForm(f => ({ ...f, enclosure_name: v }))}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Pilih kandang..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={null}>Tidak spesifik</SelectItem>
                  {enclosures.map(e => <SelectItem key={e.id} value={e.name}>{e.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2 pt-1">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setShowForm(false)}>Batal</Button>
              <Button type="submit" className="flex-1" disabled={saving}>
                {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Simpan
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
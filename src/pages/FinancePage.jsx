import { useState } from "react";
import MonthlyReportExport from "@/components/finance/MonthlyReportExport";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Plus, TrendingUp, TrendingDown, DollarSign, Loader2 } from "lucide-react";
import { format, startOfMonth, endOfMonth, parseISO } from "date-fns";
import { id } from "date-fns/locale";
import { useCurrentUser } from "@/lib/useCurrentUser";
import { canAccess } from "@/lib/permissions";
import AccessDenied from "@/components/common/AccessDenied";
import ExcludeToggle from "@/components/owner/ExcludeToggle";

const CATEGORIES = {
  penjualan_tortoise: { label: "Penjualan Tortoise",     color: "bg-green-100 text-green-700",   type: "pemasukan"    },
  pembelian_barang:   { label: "Pembelian Barang Gudang",color: "bg-red-100 text-red-700",       type: "pengeluaran"  },
  gaji_karyawan:      { label: "Gaji Karyawan",          color: "bg-orange-100 text-orange-700", type: "pengeluaran"  },
  operasional:        { label: "Operasional",            color: "bg-yellow-100 text-yellow-700", type: "pengeluaran"  },
  listrik:            { label: "Listrik",                color: "bg-yellow-100 text-yellow-700", type: "pengeluaran"  },
  air:                { label: "Air",                    color: "bg-blue-100 text-blue-700",     type: "pengeluaran"  },
  internet:           { label: "Internet",               color: "bg-purple-100 text-purple-700", type: "pengeluaran"  },
  sewa:               { label: "Sewa",                   color: "bg-orange-100 text-orange-700", type: "pengeluaran"  },
  perawatan_kandang:  { label: "Perawatan Kandang",      color: "bg-green-100 text-green-700",   type: "pengeluaran"  },
  lainnya:            { label: "Lainnya",                color: "bg-gray-100 text-gray-700",     type: "pemasukan"    },
};

const MONTHS = Array.from({ length: 12 }, (_, i) => ({
  value: format(new Date(2026, i, 1), "yyyy-MM"),
  label: format(new Date(2026, i, 1), "MMMM yyyy", { locale: id }),
}));

export default function FinancePage() {
  const { user, role } = useCurrentUser();
  const qc = useQueryClient();
  const canManage = ["admin", "owner"].includes(role);
  const currentPeriod = format(new Date(), "yyyy-MM");
  const [period, setPeriod] = useState(currentPeriod);
  const [showForm, setShowForm] = useState(false);
  const [tab, setTab] = useState("ringkasan");
  const [form, setForm] = useState({ type: "pemasukan", category: "lainnya", amount: "", date: format(new Date(), "yyyy-MM-dd"), description: "" });
  const [saving, setSaving] = useState(false);

  const { data: transactions = [] } = useQuery({
    queryKey: ["finance-transactions"],
    queryFn: () => base44.entities.FinanceTransaction.list("-date", 1000),
  });

  // Pre-fetch sales untuk tab laba-rugi (hooks harus dipanggil sebelum guard)
  useQuery({
    queryKey: ["sales-finance"],
    queryFn: () => base44.entities.Sale.list("-sale_date", 500),
    enabled: tab === "laba-rugi",
  });

  if (!canAccess(role, "finance")) return <AccessDenied />;

  const isOwner = role === "owner";

  // Filter by period — laporan hanya tampil yang tidak di-exclude
  const periodTx = transactions.filter((t) => t.date?.startsWith(period) && !t.excluded_from_reports);
  // Untuk list lengkap (termasuk excluded, tapi ditandai)
  const periodTxAll = transactions.filter((t) => t.date?.startsWith(period));

  const totalPemasukan = periodTx.filter((t) => t.type === "pemasukan").reduce((s, t) => s + (t.amount || 0), 0);
  const totalPengeluaran = periodTx.filter((t) => t.type === "pengeluaran").reduce((s, t) => s + (t.amount || 0), 0);
  const labaRugi = totalPemasukan - totalPengeluaran;

  // Per kategori
  const byCategory = {};
  periodTx.forEach((t) => {
    if (!byCategory[t.category]) byCategory[t.category] = 0;
    byCategory[t.category] += t.amount || 0;
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    await base44.entities.FinanceTransaction.create({
      ...form,
      amount: Number(form.amount),
      created_by_name: user?.full_name || user?.email || "",
    });
    qc.invalidateQueries({ queryKey: ["finance-transactions"] });
    setSaving(false);
    setShowForm(false);
    setForm({ type: "pemasukan", category: "lainnya", amount: "", date: format(new Date(), "yyyy-MM-dd"), description: "" });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-heading font-bold">Laporan Keuangan</h1>
          <p className="text-muted-foreground text-sm">Laba rugi, pemasukan & pengeluaran</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MONTHS.map((m) => (
                <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {canManage && (
            <Button onClick={() => setShowForm(true)} className="gap-2">
              <Plus className="w-4 h-4" /> Tambah Transaksi
            </Button>
          )}
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-5 bg-green-50 border-green-200">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-green-100">
              <TrendingUp className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Pemasukan</p>
              <p className="text-xl font-bold text-green-700">Rp {totalPemasukan.toLocaleString("id-ID")}</p>
            </div>
          </div>
        </Card>
        <Card className="p-5 bg-red-50 border-red-200">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-red-100">
              <TrendingDown className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Pengeluaran</p>
              <p className="text-xl font-bold text-red-700">Rp {totalPengeluaran.toLocaleString("id-ID")}</p>
            </div>
          </div>
        </Card>
        <Card className={`p-5 ${labaRugi >= 0 ? "bg-primary/5 border-primary/20" : "bg-orange-50 border-orange-200"}`}>
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl ${labaRugi >= 0 ? "bg-primary/10" : "bg-orange-100"}`}>
              <DollarSign className={`w-5 h-5 ${labaRugi >= 0 ? "text-primary" : "text-orange-600"}`} />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{labaRugi >= 0 ? "Laba" : "Rugi"}</p>
              <p className={`text-xl font-bold ${labaRugi >= 0 ? "text-primary" : "text-orange-700"}`}>
                Rp {Math.abs(labaRugi).toLocaleString("id-ID")}
              </p>
            </div>
          </div>
        </Card>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="ringkasan">Ringkasan</TabsTrigger>
          <TabsTrigger value="laba-rugi">Laba Rugi</TabsTrigger>
          <TabsTrigger value="pemasukan">Pemasukan</TabsTrigger>
          <TabsTrigger value="pengeluaran">Pengeluaran</TabsTrigger>
          <TabsTrigger value="semua">Semua Transaksi</TabsTrigger>
        </TabsList>

        {/* Ringkasan per kategori */}
        <TabsContent value="ringkasan" className="mt-4 space-y-3">
          <Card className="p-5">
            <h2 className="font-semibold text-base mb-4">Rincian per Kategori</h2>
            <div className="space-y-3">
              {Object.entries(CATEGORIES).map(([key, conf]) => {
                const amount = byCategory[key] || 0;
                if (amount === 0) return null;
                return (
                  <div key={key} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${conf.color}`}>{conf.label}</span>
                    </div>
                    <span className={`text-sm font-semibold ${conf.type === "pemasukan" ? "text-green-600" : "text-red-600"}`}>
                      {conf.type === "pemasukan" ? "+" : "-"}Rp {amount.toLocaleString("id-ID")}
                    </span>
                  </div>
                );
              })}
              {Object.keys(byCategory).length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">Belum ada transaksi bulan ini</p>
              )}
            </div>
          </Card>
        </TabsContent>

        {/* Laba Rugi */}
        <TabsContent value="laba-rugi" className="mt-4 space-y-4">
          <LabaRugiPanel period={period} transactions={periodTx} />
        </TabsContent>

        {/* Pemasukan */}
        <TabsContent value="pemasukan" className="mt-4 space-y-2">
          {periodTxAll.filter(t => t.type === "pemasukan").length === 0 ? (
            <p className="text-center py-10 text-muted-foreground">Belum ada pemasukan bulan ini</p>
          ) : periodTxAll.filter(t => t.type === "pemasukan").map((t) => (
            <TxRow key={t.id} tx={t} isOwner={isOwner} />
          ))}
        </TabsContent>

        {/* Pengeluaran */}
        <TabsContent value="pengeluaran" className="mt-4 space-y-2">
          {periodTxAll.filter(t => t.type === "pengeluaran").length === 0 ? (
            <p className="text-center py-10 text-muted-foreground">Belum ada pengeluaran bulan ini</p>
          ) : periodTxAll.filter(t => t.type === "pengeluaran").map((t) => (
            <TxRow key={t.id} tx={t} isOwner={isOwner} />
          ))}
        </TabsContent>

        {/* Semua */}
        <TabsContent value="semua" className="mt-4 space-y-2">
          {periodTxAll.length === 0 ? (
            <p className="text-center py-10 text-muted-foreground">Belum ada transaksi bulan ini</p>
          ) : periodTxAll.map((t) => (
            <TxRow key={t.id} tx={t} isOwner={isOwner} />
          ))}
        </TabsContent>
      </Tabs>

      {/* Add transaction dialog */}
      <Dialog open={showForm} onOpenChange={(o) => !o && setShowForm(false)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Tambah Transaksi Manual</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-3 mt-2">
            <div className="flex gap-2">
              <button type="button" onClick={() => setForm(p => ({ ...p, type: "pemasukan" }))}
                className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${form.type === "pemasukan" ? "bg-green-500 text-white border-green-500" : "bg-background border-border"}`}>
                ↑ Pemasukan
              </button>
              <button type="button" onClick={() => setForm(p => ({ ...p, type: "pengeluaran" }))}
                className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${form.type === "pengeluaran" ? "bg-red-500 text-white border-red-500" : "bg-background border-border"}`}>
                ↓ Pengeluaran
              </button>
            </div>
            <div>
              <Label className="text-xs">Kategori</Label>
              <Select value={form.category} onValueChange={(v) => setForm(p => ({ ...p, category: v }))}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(CATEGORIES).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Nominal (Rp) *</Label>
              <Input type="number" min={0} value={form.amount} onChange={(e) => setForm(p => ({ ...p, amount: e.target.value }))} required className="mt-1" />
            </div>
            <div>
              <Label className="text-xs">Tanggal</Label>
              <Input type="date" value={form.date} onChange={(e) => setForm(p => ({ ...p, date: e.target.value }))} className="mt-1" />
            </div>
            <div>
              <Label className="text-xs">Keterangan</Label>
              <Input value={form.description} onChange={(e) => setForm(p => ({ ...p, description: e.target.value }))} className="mt-1" />
            </div>
            <div className="flex gap-2 pt-1">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setShowForm(false)}>Batal</Button>
              <Button type="submit" className="flex-1" disabled={saving}>
                {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Simpan
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function LabaRugiPanel({ period, transactions }) {
  const pemasukan = transactions.filter(t => t.type === "pemasukan");
  const pengeluaran = transactions.filter(t => t.type === "pengeluaran");
  const totalPemasukan = pemasukan.reduce((s, t) => s + (t.amount || 0), 0);
  const totalPengeluaran = pengeluaran.reduce((s, t) => s + (t.amount || 0), 0);
  const labaRugi = totalPemasukan - totalPengeluaran;

  // Sales breakdown dari penjualan_tortoise transactions (yang punya description dengan "Penjualan")
  const saleTx = pemasukan.filter(t => t.category === "penjualan_tortoise");

  return (
    <div className="space-y-4">
      {/* Ringkasan L/R */}
      <Card className="p-5">
        <h2 className="font-semibold text-base mb-4">Laporan Laba Rugi — {period}</h2>
        <div className="space-y-2">
          <div className="flex justify-between items-center py-2 border-b">
            <span className="text-sm font-medium text-green-700">TOTAL PEMASUKAN</span>
            <span className="font-bold text-green-700">Rp {totalPemasukan.toLocaleString("id-ID")}</span>
          </div>
          <div className="flex justify-between items-center py-2 border-b">
            <span className="text-sm font-medium text-red-600">TOTAL PENGELUARAN</span>
            <span className="font-bold text-red-600">-Rp {totalPengeluaran.toLocaleString("id-ID")}</span>
          </div>
          <div className={`flex justify-between items-center py-3 px-4 rounded-xl ${labaRugi >= 0 ? "bg-green-50 border border-green-200" : "bg-red-50 border border-red-200"}`}>
            <span className={`text-base font-bold ${labaRugi >= 0 ? "text-green-800" : "text-red-800"}`}>
              {labaRugi >= 0 ? "LABA BERSIH" : "RUGI BERSIH"}
            </span>
            <span className={`text-xl font-bold ${labaRugi >= 0 ? "text-green-700" : "text-red-700"}`}>
              Rp {Math.abs(labaRugi).toLocaleString("id-ID")}
            </span>
          </div>
        </div>
      </Card>

      {/* Breakdown per kura */}
      {saleTx.length > 0 && (
        <Card className="p-5">
          <h2 className="font-semibold text-base mb-3">Breakdown Penjualan per Kura</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-muted-foreground border-b">
                  <th className="text-left pb-2">Keterangan</th>
                  <th className="text-right pb-2">Harga Jual</th>
                  <th className="text-right pb-2">Tanggal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {saleTx.map(tx => (
                  <tr key={tx.id}>
                    <td className="py-2 text-sm">{tx.description || "-"}</td>
                    <td className="py-2 text-right font-semibold text-green-700">Rp {(tx.amount || 0).toLocaleString("id-ID")}</td>
                    <td className="py-2 text-right text-muted-foreground text-xs">{tx.date || "-"}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t font-bold">
                  <td className="py-2">Total Penjualan</td>
                  <td className="py-2 text-right text-green-700">Rp {saleTx.reduce((s,t) => s + (t.amount||0), 0).toLocaleString("id-ID")}</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </Card>
      )}

      {/* Pengeluaran per kategori */}
      {pengeluaran.length > 0 && (
        <Card className="p-5">
          <h2 className="font-semibold text-base mb-3">Rincian Pengeluaran</h2>
          <div className="space-y-2">
            {Object.entries(pengeluaran.reduce((map, t) => {
              const cat = t.category || "lainnya";
              if (!map[cat]) map[cat] = 0;
              map[cat] += t.amount || 0;
              return map;
            }, {})).sort((a,b) => b[1]-a[1]).map(([cat, amt]) => (
              <div key={cat} className="flex justify-between items-center">
                <span className="text-sm capitalize">{cat.replace(/_/g, " ")}</span>
                <span className="text-sm font-semibold text-red-600">-Rp {amt.toLocaleString("id-ID")}</span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

function TxRow({ tx, isOwner }) {
  const conf = CATEGORIES[tx.category] || CATEGORIES.lainnya;
  return (
    <Card className={`p-3 flex items-center gap-3 ${tx.excluded_from_reports ? "opacity-60 border-dashed border-gray-300" : ""}`}>
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-sm ${tx.type === "pemasukan" ? "bg-green-100" : "bg-red-100"}`}>
        {tx.type === "pemasukan" ? "↑" : "↓"}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{tx.description || conf.label}</p>
        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${conf.color}`}>{conf.label}</span>
          {tx.created_by_name && <span className="text-xs text-muted-foreground">{tx.created_by_name}</span>}
        </div>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <div className="text-right">
          <p className={`text-sm font-bold ${tx.type === "pemasukan" ? "text-green-600" : "text-red-600"}`}>
            {tx.type === "pemasukan" ? "+" : "-"}Rp {(tx.amount || 0).toLocaleString("id-ID")}
          </p>
          <p className="text-xs text-muted-foreground">
            {tx.date && format(parseISO(tx.date), "d MMM", { locale: id })}
          </p>
        </div>
        {isOwner && (
          <ExcludeToggle
            record={tx}
            entityName="FinanceTransaction"
            queryKey={["finance-transactions"]}
          />
        )}
      </div>
    </Card>
  );
}
import { useState } from "react";
import MonthlyReportExport from "@/components/finance/MonthlyReportExport";
import LabaRugiEnhanced from "@/components/finance/LabaRugiEnhanced";
import EditTransactionDialog from "@/components/finance/EditTransactionDialog";
import InvoiceVisionUpload from "@/components/ai/InvoiceVisionUpload";
import { toast } from "sonner";
import { useFinanceCategories } from "@/hooks/useEntityCategories";
import { logActivity } from "@/lib/logActivity";
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
import { Plus, TrendingUp, TrendingDown, DollarSign, Loader2, Settings, Edit2 } from "lucide-react";
import { format, parseISO } from "date-fns";
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
  kas_kecil:          { label: "Kas Kecil",              color: "bg-indigo-100 text-indigo-700", type: "pengeluaran"  },
  solar_bbm:          { label: "Solar / BBM",            color: "bg-amber-100 text-amber-700",   type: "pengeluaran"  },
  rokok:              { label: "Rokok",                  color: "bg-stone-100 text-stone-700",   type: "pengeluaran"  },
  lainnya:            { label: "Lainnya",                color: "bg-gray-100 text-gray-700",     type: "both"          },
};

const MONTHS = Array.from({ length: 12 }, (_, i) => ({
  value: format(new Date(2026, i, 1), "yyyy-MM"),
  label: format(new Date(2026, i, 1), "MMMM yyyy", { locale: id }),
}));

function guessCategory(text) {
  const t = (text || "").toLowerCase();
  if (/pakan|sayur|kangkung|pelet|rumput|hibiscus|azolla|buah|gamal|kaladi|pegagan/.test(t)) return "pakan";
  if (/vitamin|suplemen|supplement|calcium|kalsium|nevitan|zylkene/.test(t)) return "vitamin_suplemen";
  if (/obat|paracet|syrup|salep|antibiot|injek|obat cacing|deoworm/.test(t)) return "obat_perawatan";
  if (/solar|bbm|bensin|pertalite|pertamax/.test(t)) return "solar_bbm";
  if (/rokok/.test(t)) return "rokok";
  return "lainnya";
}

// ── Add Transaction Form ───────────────────────────────────────────────────────
function AddTransactionForm({ user, onClose, onSaved }) {
  const qc = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    type: "pengeluaran",
    category: "lainnya",
    qty: "",
    harga_satuan: "",
    amount: "",
    date: format(new Date(), "yyyy-MM-dd"),
    description: "",
  });
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const [pendingInvoice, setPendingInvoice] = useState(null);
  const [invoicePhotoUrl, setInvoicePhotoUrl] = useState(null);
  const [splitMode, setSplitMode] = useState("single");

  const { pemasukan, pengeluaran } = useFinanceCategories();
  const catOptions = form.type === "pemasukan"
    ? (pemasukan.length ? pemasukan : [{ value: "penjualan_tortoise", label: "Penjualan Tortoise" }, { value: "lainnya", label: "Lainnya" }])
    : (pengeluaran.length ? pengeluaran : Object.entries(CATEGORIES).filter(([, v]) => v.type === "pengeluaran" || v.type === "both").map(([k, v]) => ({ value: k, label: v.label })));

  const qtyNum = Number(form.qty) || 0;
  const hargaNum = Number(form.harga_satuan) || 0;
  const autoTotal = qtyNum > 0 && hargaNum > 0 ? qtyNum * hargaNum : null;
  const displayAmount = autoTotal !== null ? autoTotal : (Number(form.amount) || 0);

  const handleApplyInvoice = async (inv, photoUrls) => {
    const photoUrl = photoUrls?.[0] || null;
    setInvoicePhotoUrl(photoUrl);
    const items = inv.items || [];
    if (splitMode === "split" && items.length > 1) {
      setSaving(true);
      try {
        for (const it of items) {
          const sub = Number(it.subtotal) || 0;
          if (sub <= 0) continue;
          await base44.entities.FinanceTransaction.create({
            type: "pengeluaran",
            category: guessCategory(it.nama),
            amount: sub,
            date: inv.tanggal || form.date,
            description: `${inv.toko || "Invoice"} — ${it.nama}`.slice(0, 200),
            qty: Number(it.qty) > 0 ? Number(it.qty) : undefined,
            harga_satuan: Number(it.harga_satuan) > 0 ? Number(it.harga_satuan) : undefined,
            created_by_name: user?.full_name || user?.email || "",
            ...(photoUrl ? { invoice_photo_url: photoUrl } : {}),
          });
        }
        await logActivity({
          action: "create",
          entity_type: "FinanceTransaction",
          entity_id: "batch-invoice",
          entity_name: `Invoice ${inv.toko || ""} (${items.length} item)`,
          changes_summary: `Pecah invoice AI menjadi ${items.length} transaksi pengeluaran.`,
        });
        qc.invalidateQueries({ queryKey: ["finance-transactions"] });
        toast.success(`${items.length} transaksi dibuat dari invoice`);
        setSaving(false);
        onSaved?.();
        onClose();
      } catch {
        setSaving(false);
        toast.error("Gagal menyimpan sebagian transaksi");
      }
      return;
    }
    const total = Number(inv.total) || items.reduce((s, i) => s + (Number(i.subtotal) || 0), 0);
    const ringkas = items.map((i) => i.nama).filter(Boolean).join(", ");
    setForm((p) => ({
      ...p,
      type: "pengeluaran",
      amount: String(total || ""),
      date: inv.tanggal || p.date,
      description: `${inv.toko || "Invoice"} — ${ringkas}`.slice(0, 200),
      category: guessCategory(items.map((i) => i.nama).join(" ")),
    }));
    setPendingInvoice(null);
    toast.success("Hasil scan diisi ke form — periksa sebelum simpan");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!displayAmount || displayAmount <= 0) return;
    setSaving(true);
    const payload = {
      type: form.type,
      category: form.category,
      amount: displayAmount,
      date: form.date,
      description: form.description,
      created_by_name: user?.full_name || user?.email || "",
    };
    if (qtyNum > 0) payload.qty = qtyNum;
    if (hargaNum > 0) payload.harga_satuan = hargaNum;
    if (invoicePhotoUrl) payload.invoice_photo_url = invoicePhotoUrl;
    const created = await base44.entities.FinanceTransaction.create(payload);
    await logActivity({
      action: "create",
      entity_type: "FinanceTransaction",
      entity_id: created.id,
      entity_name: payload.description || payload.category,
      changes_summary: `Menambah ${payload.type === "pemasukan" ? "pemasukan" : "pengeluaran"} "${payload.description || payload.category}" sebesar Rp ${(payload.amount || 0).toLocaleString("id-ID")}`,
    });
    qc.invalidateQueries({ queryKey: ["finance-transactions"] });
    setSaving(false);
    onSaved?.();
    onClose();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3 mt-2">
      <InvoiceVisionUpload onApplied={({ invoice, photoUrls }) => setPendingInvoice({ invoice, photoUrls })} />
      {pendingInvoice && (
        <div className="border border-blue-200 rounded-lg p-3 bg-blue-50/50 space-y-2">
          <p className="text-xs font-semibold text-blue-800">
            Hasil Scan: {pendingInvoice.invoice.toko || "Invoice"} — {pendingInvoice.invoice.items?.length || 0} item
          </p>
          {(pendingInvoice.invoice.items?.length || 0) > 1 && (
            <div className="flex gap-3 text-xs flex-wrap">
              <label className="flex items-center gap-1 cursor-pointer">
                <input type="radio" checked={splitMode === "single"} onChange={() => setSplitMode("single")} />
                Satu transaksi (pakai total)
              </label>
              <label className="flex items-center gap-1 cursor-pointer">
                <input type="radio" checked={splitMode === "split"} onChange={() => setSplitMode("split")} />
                Pecah jadi beberapa transaksi
              </label>
            </div>
          )}
          <div className="flex gap-2">
            <Button type="button" size="sm" onClick={() => handleApplyInvoice(pendingInvoice.invoice, pendingInvoice.photoUrls)}>
              Terapkan Hasil Scan
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => { setPendingInvoice(null); setInvoicePhotoUrl(null); }}>
              Batal Scan
            </Button>
          </div>
        </div>
      )}
      <div className="flex gap-2">
        {["pemasukan", "pengeluaran"].map(t => (
          <button key={t} type="button" onClick={() => setForm(p => ({ ...p, type: t, category: t === "pemasukan" ? "penjualan_tortoise" : "operasional" }))}
            className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${form.type === t ? (t === "pemasukan" ? "bg-green-500 text-white border-green-500" : "bg-red-500 text-white border-red-500") : "bg-background border-border"}`}>
            {t === "pemasukan" ? "↑ Pemasukan" : "↓ Pengeluaran"}
          </button>
        ))}
      </div>
      <div>
        <Label className="text-xs">Kategori</Label>
        <Select value={form.category} onValueChange={v => set("category", v)}>
          <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
          <SelectContent className="max-h-72 overflow-y-auto">
            {catOptions.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Qty + Harga Satuan */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label className="text-xs">Qty (opsional)</Label>
          <Input type="number" min={0} value={form.qty} onChange={e => set("qty", e.target.value)} placeholder="cth: 5" className="mt-1" />
        </div>
        <div>
          <Label className="text-xs">Harga Satuan (Rp)</Label>
          <Input type="number" min={0} value={form.harga_satuan} onChange={e => set("harga_satuan", e.target.value)} placeholder="cth: 20000" className="mt-1" />
        </div>
      </div>

      {/* Total */}
      {autoTotal !== null ? (
        <div>
          <Label className="text-xs text-green-700 font-semibold">
            Total Otomatis: {qtyNum} × Rp {hargaNum.toLocaleString("id-ID")} =
          </Label>
          <div className="mt-1 px-3 py-2 bg-green-50 border border-green-200 rounded-lg text-base font-bold text-green-700">
            Rp {autoTotal.toLocaleString("id-ID")}
          </div>
        </div>
      ) : (
        <div>
          <Label className="text-xs">Nominal (Rp) *</Label>
          <Input type="number" min={0} value={form.amount} onChange={e => set("amount", e.target.value)} required className="mt-1" />
        </div>
      )}

      <div>
        <Label className="text-xs">Tanggal</Label>
        <Input type="date" value={form.date} onChange={e => set("date", e.target.value)} className="mt-1" />
      </div>
      <div>
        <Label className="text-xs">Keterangan</Label>
        <Input value={form.description} onChange={e => set("description", e.target.value)} className="mt-1" />
      </div>
      <div className="flex gap-2 pt-1">
        <Button type="button" variant="outline" className="flex-1" onClick={onClose}>Batal</Button>
        <Button type="submit" className="flex-1" disabled={saving || displayAmount <= 0}>
          {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          Simpan
        </Button>
      </div>
    </form>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function FinancePage() {
  const { user, role } = useCurrentUser();
  const qc = useQueryClient();
  const canManage = ["admin", "owner", "manajer"].includes(role);
  const canDelete = ["admin", "owner"].includes(role);
  const currentPeriod = format(new Date(), "yyyy-MM");
  const [period, setPeriod] = useState(currentPeriod);
  const [showForm, setShowForm] = useState(false);
  const [editTx, setEditTx] = useState(null);
  const [tab, setTab] = useState("ringkasan");

  const { data: transactions = [] } = useQuery({
    queryKey: ["finance-transactions"],
    queryFn: () => base44.entities.FinanceTransaction.list("-date", 1000),
  });

  useQuery({
    queryKey: ["sales-finance"],
    queryFn: () => base44.entities.Sale.list("-sale_date", 500),
    enabled: tab === "laba-rugi",
  });

  if (!canAccess(role, "finance")) return <AccessDenied />;

  const isOwner = role === "owner";

  const periodTx    = transactions.filter((t) => t.date?.startsWith(period) && !t.excluded_from_reports);
  const periodTxAll = transactions.filter((t) => t.date?.startsWith(period));

  const totalPemasukan  = periodTx.filter((t) => t.type === "pemasukan").reduce((s, t) => s + (t.amount || 0), 0);
  const totalPengeluaran = periodTx.filter((t) => t.type === "pengeluaran").reduce((s, t) => s + (t.amount || 0), 0);
  const labaRugi = totalPemasukan - totalPengeluaran;

  const byCategory = {};
  periodTx.forEach((t) => {
    if (!byCategory[t.category]) byCategory[t.category] = 0;
    byCategory[t.category] += t.amount || 0;
  });

  const TxRow = ({ tx }) => {
    const conf = CATEGORIES[tx.category] || CATEGORIES.lainnya;
    return (
      <Card className={`p-3 flex items-start gap-3 ${tx.excluded_from_reports ? "opacity-60 border-dashed border-gray-300" : ""}`}>
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-sm mt-0.5 ${tx.type === "pemasukan" ? "bg-green-100" : "bg-red-100"}`}>
          {tx.type === "pemasukan" ? "↑" : "↓"}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium">{tx.description || conf.label}</p>
          {/* Tampilkan qty × harga jika ada */}
          {tx.qty && tx.harga_satuan && (
            <p className="text-xs text-muted-foreground mt-0.5">
              {tx.qty} × Rp {Number(tx.harga_satuan).toLocaleString("id-ID")} = Rp {(tx.qty * tx.harga_satuan).toLocaleString("id-ID")}
            </p>
          )}
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${conf.color}`}>{conf.label}</span>
            {tx.created_by_name && <span className="text-xs text-muted-foreground">{tx.created_by_name}</span>}
          </div>
          {/* Audit trail edit */}
          {tx.edited_by && (
            <p className="text-[10px] text-muted-foreground mt-0.5 italic">
              Diedit oleh {tx.edited_by} · {tx.edited_at ? format(new Date(tx.edited_at), "d MMM HH:mm", { locale: id }) : ""}
            </p>
          )}
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <div className="text-right">
            <p className={`text-sm font-bold ${tx.type === "pemasukan" ? "text-green-600" : "text-red-600"}`}>
              {tx.type === "pemasukan" ? "+" : "-"}Rp {(tx.amount || 0).toLocaleString("id-ID")}
            </p>
            <p className="text-xs text-muted-foreground">
              {tx.date && format(parseISO(tx.date), "d MMM", { locale: id })}
            </p>
          </div>
          {canManage && (
            <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground" onClick={() => setEditTx(tx)}>
              <Edit2 className="w-3.5 h-3.5" />
            </Button>
          )}
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
            <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              {MONTHS.map((m) => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <MonthlyReportExport role={role} />
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
            <div className="p-2.5 rounded-xl bg-green-100"><TrendingUp className="w-5 h-5 text-green-600" /></div>
            <div>
              <p className="text-xs text-muted-foreground">Total Pemasukan</p>
              <p className="text-xl font-bold text-green-700">Rp {totalPemasukan.toLocaleString("id-ID")}</p>
            </div>
          </div>
        </Card>
        <Card className="p-5 bg-red-50 border-red-200">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-red-100"><TrendingDown className="w-5 h-5 text-red-600" /></div>
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
          {canManage && <TabsTrigger value="pengaturan">Pengaturan</TabsTrigger>}
        </TabsList>

        <TabsContent value="ringkasan" className="mt-4 space-y-3">
          <Card className="p-5">
            <h2 className="font-semibold text-base mb-4">Rincian per Kategori</h2>
            <div className="space-y-3">
              {Object.entries(CATEGORIES).map(([key, conf]) => {
                const amount = byCategory[key] || 0;
                if (amount === 0) return null;
                return (
                  <div key={key} className="flex items-center justify-between">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${conf.color}`}>{conf.label}</span>
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

        <TabsContent value="laba-rugi" className="mt-4 space-y-4">
          <LabaRugiEnhanced period={period} />
        </TabsContent>

        <TabsContent value="pemasukan" className="mt-4 space-y-2">
          {periodTxAll.filter(t => t.type === "pemasukan").length === 0
            ? <p className="text-center py-10 text-muted-foreground">Belum ada pemasukan bulan ini</p>
            : periodTxAll.filter(t => t.type === "pemasukan").map(t => <TxRow key={t.id} tx={t} />)}
        </TabsContent>

        <TabsContent value="pengeluaran" className="mt-4 space-y-2">
          {periodTxAll.filter(t => t.type === "pengeluaran").length === 0
            ? <p className="text-center py-10 text-muted-foreground">Belum ada pengeluaran bulan ini</p>
            : periodTxAll.filter(t => t.type === "pengeluaran").map(t => <TxRow key={t.id} tx={t} />)}
        </TabsContent>

        <TabsContent value="semua" className="mt-4 space-y-2">
          {periodTxAll.length === 0
            ? <p className="text-center py-10 text-muted-foreground">Belum ada transaksi bulan ini</p>
            : periodTxAll.map(t => <TxRow key={t.id} tx={t} />)}
        </TabsContent>

        {canManage && (
          <TabsContent value="pengaturan" className="mt-4">
            <PengaturanHPP />
          </TabsContent>
        )}
      </Tabs>

      {/* Add transaction dialog */}
      <Dialog open={showForm} onOpenChange={(o) => !o && setShowForm(false)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Tambah Transaksi Manual</DialogTitle></DialogHeader>
          <AddTransactionForm user={user} onClose={() => setShowForm(false)} onSaved={() => {}} />
        </DialogContent>
      </Dialog>

      {/* Edit transaction dialog */}
      {editTx && (
        <EditTransactionDialog
          tx={editTx}
          user={user}
          canDelete={canDelete}
          onClose={() => setEditTx(null)}
          onSaved={() => setEditTx(null)}
        />
      )}
    </div>
  );
}

function PengaturanHPP() {
  const qc = useQueryClient();
  const { data: settings = [] } = useQuery({
    queryKey: ["company-settings"],
    queryFn: () => base44.entities.CompanySettings.filter({ setting_key: "main" }),
  });
  const current = settings[0];
  const [fallback, setFallback] = useState(current?.hpp_fallback_per_ekor || 100000);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!current) return;
    setSaving(true);
    await base44.entities.CompanySettings.update(current.id, { hpp_fallback_per_ekor: Number(fallback) });
    qc.invalidateQueries({ queryKey: ["company-settings"] });
    setSaving(false);
  };

  return (
    <Card className="p-5">
      <div className="flex items-center gap-2 mb-4">
        <Settings className="w-5 h-5 text-muted-foreground" />
        <h2 className="font-semibold text-base">Pengaturan HPP</h2>
      </div>
      <div className="space-y-4">
        <div>
          <Label className="text-sm">Fallback Biaya Per Ekor/Bulan (Rp)</Label>
          <p className="text-xs text-muted-foreground mb-2">Dipakai jika belum ada data pengeluaran aktual bulan ini. Default: Rp 100.000</p>
          <Input type="number" min={0} step={10000} value={fallback} onChange={(e) => setFallback(Number(e.target.value))} className="max-w-xs" />
        </div>
        <Button onClick={handleSave} disabled={saving} size="sm">
          {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          Simpan
        </Button>
      </div>
    </Card>
  );
}
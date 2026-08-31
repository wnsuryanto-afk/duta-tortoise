import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ShoppingCart, Plus, CheckCircle2, Package, Clock } from "lucide-react";


/**
 * Entitas ShoppingList berisi DUA generasi nama field:
 *   lama (Juni 2026): item_name, qty_needed, unit, est_price, platform
 *   baru (Juli 2026): nama_barang, jumlah, satuan, harga_est_per_unit, platform_beli
 *
 * 36 record lama tampil sebagai "(tanpa nama)" karena widget hanya membaca nama
 * baru. Penormal ini membuat keduanya terbaca tanpa perlu mengubah data.
 */
function normalizeItem(i) {
  const platform = i.platform_beli || (i.platform ? String(i.platform).replace(/_/g, " ") : "");
  return {
    ...i,
    nama_barang: i.nama_barang || "",
    jumlah: i.jumlah ?? i.qty_needed ?? 0,
    satuan: i.satuan || i.unit || "",
    platform_beli: platform,
    harga_est_per_unit: i.harga_est_per_unit ?? i.est_price ?? 0,
    harga_aktual: i.harga_aktual ?? i.bought_price ?? null,
    qty_aktual: i.qty_aktual ?? i.bought_qty ?? null,
    tanggal_dibeli: i.tanggal_dibeli || i.bought_date || null,
    link_produk: i.link_produk || "",
  };
}

const PRIORITY_SECTIONS = [
  { key: "segera",     label: "🔴 Segera",    className: "border-red-200 bg-red-50" },
  { key: "minggu_ini", label: "🟡 Minggu Ini", className: "border-yellow-200 bg-yellow-50" },
  { key: "bulan_ini",  label: "🔵 Bulan Ini",  className: "border-blue-200 bg-blue-50" },
  { key: "opsional",   label: "⚪ Opsional",   className: "border-slate-200 bg-slate-50" },
];

const STATUS_BADGE = {
  belum_dibeli:  { label: "Belum Dibeli",  className: "bg-red-100 text-red-700 border-red-200" },
  sudah_dipesan: { label: "Sudah Dipesan", className: "bg-yellow-100 text-yellow-700 border-yellow-200" },
  sudah_dibeli:  { label: "Sudah Dibeli",  className: "bg-green-100 text-green-700 border-green-200" },
};

const SATUAN_OPTIONS = ["pcs", "botol", "sachet", "kg", "gram", "liter", "ml", "ikat", "box", "strip", "buah"];
const PLATFORM_OPTIONS = ["Tokopedia", "Shopee", "Apotek", "Toko Hewan", "Langsung", "Lainnya"];

function formatRp(val) {
  if (!val) return "-";
  return "Rp " + Number(val).toLocaleString("id-ID");
}

function AddItemDialog({ open, onClose, onSaved }) {
  const [form, setForm] = useState({
    nama_barang: "", jumlah: "", satuan: "pcs",
    platform_beli: "Tokopedia", harga_est_per_unit: "",
    priority: "minggu_ini", notes: "",
  });
  const [saving, setSaving] = useState(false);

  const set = (k, v) => setForm(prev => ({ ...prev, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    const jumlah = parseFloat(form.jumlah) || 0;
    const harga = parseFloat(form.harga_est_per_unit) || 0;
    await base44.entities.ShoppingList.create({
      ...form,
      jumlah,
      harga_est_per_unit: harga,
      total_est: jumlah * harga,
      status: "belum_dibeli",
    });
    setSaving(false);
    onSaved();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Tambah Item Belanja</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3 mt-2">
          <div className="space-y-1.5">
            <Label>Nama Barang *</Label>
            <Input value={form.nama_barang} onChange={e => set("nama_barang", e.target.value)} required placeholder="Contoh: Baytril 2.5%" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Jumlah *</Label>
              <Input type="number" min="0" step="0.1" value={form.jumlah} onChange={e => set("jumlah", e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label>Satuan</Label>
              <Select value={form.satuan} onValueChange={v => set("satuan", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{SATUAN_OPTIONS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Prioritas</Label>
              <Select value={form.priority} onValueChange={v => set("priority", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="segera">🔴 Segera</SelectItem>
                  <SelectItem value="minggu_ini">🟡 Minggu Ini</SelectItem>
                  <SelectItem value="bulan_ini">🔵 Bulan Ini</SelectItem>
                  <SelectItem value="opsional">⚪ Opsional</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Platform Beli</Label>
              <Select value={form.platform_beli} onValueChange={v => set("platform_beli", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{PLATFORM_OPTIONS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Estimasi Harga per Unit (Rp)</Label>
            <Input type="number" min="0" value={form.harga_est_per_unit} onChange={e => set("harga_est_per_unit", e.target.value)} placeholder="0" />
          </div>
          <div className="space-y-1.5">
            <Label>Catatan</Label>
            <Input value={form.notes} onChange={e => set("notes", e.target.value)} placeholder="Opsional..." />
          </div>
          <div className="flex gap-2 pt-1">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose}>Batal</Button>
            <Button type="submit" className="flex-1" disabled={saving}>{saving ? "Menyimpan..." : "Tambah"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function BoughtInputDialog({ open, item, onClose, onSaved }) {
  const [qtyAktual, setQtyAktual] = useState(item?.jumlah || "");
  const [hargaAktual, setHargaAktual] = useState(item?.total_est || "");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    await base44.entities.ShoppingList.update(item.id, {
      status: "sudah_dibeli",
      qty_aktual: parseFloat(qtyAktual) || 0,
      harga_aktual: parseFloat(hargaAktual) || 0,
      tanggal_dibeli: new Date().toISOString().split("T")[0],
    });
    setSaving(false);
    onSaved();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Detail Pembelian</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3 mt-2">
          <p className="text-sm font-medium text-foreground">{item?.nama_barang}</p>
          <div className="space-y-1.5">
            <Label>Qty Aktual Dibeli ({item?.satuan})</Label>
            <Input type="number" min="0" step="0.1" value={qtyAktual} onChange={e => setQtyAktual(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Harga Aktual Total (Rp)</Label>
            <Input type="number" min="0" value={hargaAktual} onChange={e => setHargaAktual(e.target.value)} />
          </div>
          <div className="flex gap-2 pt-1">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose}>Batal</Button>
            <Button type="submit" className="flex-1" disabled={saving}>{saving ? "Menyimpan..." : "Konfirmasi Dibeli"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ShoppingItem({ item, onUpdate }) {
  const [updatingStatus, setUpdatingStatus] = useState(null);
  const [showBoughtDialog, setShowBoughtDialog] = useState(false);

  const handleDipesan = async () => {
    setUpdatingStatus("sudah_dipesan");
    await base44.entities.ShoppingList.update(item.id, { status: "sudah_dipesan" });
    setUpdatingStatus(null);
    onUpdate();
  };

  const badge = STATUS_BADGE[item.status] || STATUS_BADGE.belum_dibeli;

  return (
    <>
      {/* Nama barang diberi baris sendiri. Versi lama menaruhnya sebaris dengan
          badge memakai `truncate` tanpa min-w-0 — di layar sempit elemen itu
          menyusut sampai nol lebar, sehingga yang tersisa hanya badge & harga. */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-2 px-3 py-2.5 bg-card rounded-lg border border-border hover:shadow-sm transition-shadow">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground leading-snug break-words">
            {item.nama_barang || "(nama belum diisi)"}
          </p>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <Badge className={`text-[10px] px-1.5 py-0 border ${badge.className}`}>{badge.label}</Badge>
            <span className="text-xs text-muted-foreground">{item.jumlah} {item.satuan}</span>
            {item.total_est > 0 && (
              <span className="text-xs font-semibold text-foreground">{formatRp(item.total_est)}</span>
            )}
            {item.platform_beli && (
              <span className="text-xs text-muted-foreground">📦 {item.platform_beli}</span>
            )}
            {item.status === "sudah_dibeli" && item.harga_aktual > 0 && (
              <span className="text-xs text-green-600">Aktual: {formatRp(item.harga_aktual)}</span>
            )}
          </div>
          {item.notes && <p className="text-xs text-muted-foreground mt-0.5 italic">{item.notes}</p>}
        </div>
        <div className="flex gap-1.5 shrink-0 self-end sm:self-auto">
          {item.status === "belum_dibeli" && (
            <Button size="sm" variant="outline" className="text-xs h-7 px-2 border-yellow-300 text-yellow-700 hover:bg-yellow-50"
              disabled={updatingStatus === "sudah_dipesan"} onClick={handleDipesan}>
              <Clock className="w-3 h-3 mr-1" />
              Dipesan
            </Button>
          )}
          {item.status !== "sudah_dibeli" && (
            <Button size="sm" variant="outline" className="text-xs h-7 px-2 border-green-300 text-green-700 hover:bg-green-50"
              onClick={() => setShowBoughtDialog(true)}>
              <CheckCircle2 className="w-3 h-3 mr-1" />
              Dibeli
            </Button>
          )}
        </div>
      </div>
      {showBoughtDialog && (
        <BoughtInputDialog
          open={showBoughtDialog}
          item={item}
          onClose={() => setShowBoughtDialog(false)}
          onSaved={onUpdate}
        />
      )}
    </>
  );
}

export default function ShoppingListWidget() {
  const queryClient = useQueryClient();
  const [showAddDialog, setShowAddDialog] = useState(false);

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["shopping-list"],
    queryFn: async () => {
      const raw = await base44.entities.ShoppingList.list("-created_date", 200);
      return raw.map(normalizeItem);
    },
    staleTime: 2 * 60 * 1000,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["shopping-list"] });

  // Ringkasan
  const totalBelumDibeli = items.filter(i => i.status !== "sudah_dibeli").length;
  const totalEst = items.filter(i => i.status === "belum_dibeli" || i.status === "sudah_dipesan")
    .reduce((s, i) => s + (i.total_est || 0), 0);
  const sudahDibeli = items.filter(i => i.status === "sudah_dibeli").length;
  const progress = items.length > 0 ? Math.round((sudahDibeli / items.length) * 100) : 0;

  return (
    <div className="card-base p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShoppingCart className="w-5 h-5 text-primary" />
          <h3 className="font-heading font-semibold text-base text-foreground">Daftar Belanja Obat & Alat</h3>
        </div>
        <Button size="sm" variant="outline" className="gap-1.5 text-xs" onClick={() => setShowAddDialog(true)}>
          <Plus className="w-3.5 h-3.5" /> Tambah Item
        </Button>
      </div>

      {/* Ringkasan */}
      {items.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-center">
            <p className="text-lg font-bold text-red-700">{totalBelumDibeli}</p>
            <p className="text-xs text-red-600">Belum Dibeli</p>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 text-center">
            <p className="text-sm font-bold text-blue-700 leading-tight">{formatRp(totalEst)}</p>
            <p className="text-xs text-blue-600">Est. Biaya</p>
          </div>
          <div className="bg-green-50 border border-green-200 rounded-lg px-3 py-2 text-center">
            <p className="text-lg font-bold text-green-700">{progress}%</p>
            <p className="text-xs text-green-600">Selesai</p>
          </div>
        </div>
      )}

      {/* Progress bar */}
      {items.length > 0 && (
        <div className="w-full bg-muted rounded-full h-2">
          <div
            className="bg-green-500 h-2 rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      {/* Sections */}
      {isLoading ? (
        <div className="flex items-center justify-center py-6 text-muted-foreground text-sm">
          <Package className="w-4 h-4 mr-2 animate-pulse" /> Memuat daftar belanja...
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-6 text-muted-foreground text-sm">
          <ShoppingCart className="w-8 h-8 mx-auto mb-2 opacity-30" />
          <p>Daftar belanja kosong</p>
          <p className="text-xs mt-1">Klik "+ Tambah Item" untuk mulai</p>
        </div>
      ) : (
        <div className="space-y-4">
          {PRIORITY_SECTIONS.map(section => {
            const sectionItems = items.filter(i => i.priority === section.key);
            if (sectionItems.length === 0) return null;
            return (
              <div key={section.key}>
                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border mb-2 ${section.className}`}>
                  <p className="text-xs font-bold">{section.label}</p>
                  <span className="text-xs text-muted-foreground">({sectionItems.length} item)</span>
                </div>
                <div className="space-y-1.5">
                  {sectionItems.map(item => (
                    <ShoppingItem key={item.id} item={item} onUpdate={invalidate} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <AddItemDialog
        open={showAddDialog}
        onClose={() => setShowAddDialog(false)}
        onSaved={invalidate}
      />
    </div>
  );
}
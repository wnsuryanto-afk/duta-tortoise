import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertTriangle, Loader2, ExternalLink } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

const CATEGORIES = {
  penjualan_tortoise: "Penjualan Tortoise",
  gaji_karyawan: "Gaji Karyawan",
  obat_perawatan: "Obat & Perawatan",
  vitamin_suplemen: "Vitamin & Suplemen",
  pakan: "Pakan",
  operasional: "Operasional",
  kas_kecil: "Kas Kecil",
  lainnya: "Lainnya",
};

// Deteksi apakah transaksi tertaut ke sumber lain
function detectSource(tx) {
  if (!tx.reference_id) return null;
  if (tx.category === "penjualan_tortoise") return { label: "Penjualan", path: "/sales" };
  if (tx.category === "kas_kecil") return { label: "Kas Kecil", path: "/petty-cash" };
  if (tx.category === "gaji_karyawan") return { label: "Gaji", path: "/salary" };
  return { label: "Transaksi Terkait", path: null };
}

export default function EditTransactionDialog({ tx, user, onClose, onSaved }) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const source = detectSource(tx);

  // State flow: null = belum pilih, "linked-warning" = tampil pilihan, "edit" = buka form, "delete-confirm" = konfirmasi hapus
  const [flow, setFlow] = useState(source ? "linked-warning" : "edit");
  const [showDelete, setShowDelete] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [form, setForm] = useState({
    type: tx.type,
    category: tx.category,
    description: tx.description || "",
    date: tx.date || "",
    qty: tx.qty || "",
    harga_satuan: tx.harga_satuan || "",
    amount: tx.amount || "",
  });

  const qty = Number(form.qty) || 0;
  const harga = Number(form.harga_satuan) || 0;
  const autoTotal = qty > 0 && harga > 0 ? qty * harga : null;
  const displayAmount = autoTotal !== null ? autoTotal : Number(form.amount) || 0;

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleSave = async () => {
    if (!displayAmount || displayAmount <= 0) { toast.error("Nominal harus > 0"); return; }
    setSaving(true);
    const payload = {
      type: form.type,
      category: form.category,
      description: form.description,
      date: form.date,
      amount: displayAmount,
      edited_by: user?.full_name || user?.email || "–",
      edited_at: new Date().toISOString(),
    };
    if (form.qty) payload.qty = Number(form.qty);
    if (form.harga_satuan) payload.harga_satuan = Number(form.harga_satuan);
    await base44.entities.FinanceTransaction.update(tx.id, payload);
    qc.invalidateQueries({ queryKey: ["finance-transactions"] });
    toast.success("Transaksi diperbarui");
    onSaved?.();
    onClose();
    setSaving(false);
  };

  const handleDelete = async () => {
    setDeleting(true);
    await base44.entities.FinanceTransaction.delete(tx.id);
    qc.invalidateQueries({ queryKey: ["finance-transactions"] });
    toast.success("Transaksi dihapus");
    onSaved?.();
    onClose();
    setDeleting(false);
  };

  // ── Linked Warning Dialog ──────────────────────────────────────────────────
  if (flow === "linked-warning") {
    return (
      <Dialog open onOpenChange={onClose}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-700">
              <AlertTriangle className="w-5 h-5" />
              Transaksi terhubung ke {source?.label}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-1">
            <p className="text-sm text-muted-foreground">
              Mengedit di sini bisa membuat data tidak cocok dengan sumbernya. Pilih:
            </p>
            {source?.path && (
              <Button
                className="w-full gap-2 bg-primary"
                onClick={() => { onClose(); navigate(source.path); }}
              >
                <ExternalLink className="w-4 h-4" />
                Edit di Sumbernya (disarankan)
              </Button>
            )}
            <Button
              variant="outline"
              className="w-full border-red-300 text-red-700 hover:bg-red-50"
              onClick={() => setFlow("edit")}
            >
              Tetap Edit di Sini (berisiko)
            </Button>
            <Button variant="ghost" className="w-full" onClick={onClose}>Batal</Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // ── Edit Form ──────────────────────────────────────────────────────────────
  return (
    <>
      <Dialog open onOpenChange={onClose}>
        <DialogContent className="max-w-sm max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Transaksi</DialogTitle>
          </DialogHeader>

          {source && (
            <div className="flex items-start gap-2 p-2.5 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
              <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>⚠️ Perubahan <strong>tidak</strong> akan update {source.label}-nya. Pastikan Anda mengerti.</span>
            </div>
          )}

          <div className="space-y-3 mt-1">
            {/* Tipe */}
            <div className="flex gap-2">
              {["pemasukan", "pengeluaran"].map(t => (
                <button key={t} type="button" onClick={() => set("type", t)}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${form.type === t ? (t === "pemasukan" ? "bg-green-500 text-white border-green-500" : "bg-red-500 text-white border-red-500") : "bg-background border-border"}`}>
                  {t === "pemasukan" ? "↑ Pemasukan" : "↓ Pengeluaran"}
                </button>
              ))}
            </div>

            {/* Kategori */}
            <div>
              <Label className="text-xs">Kategori</Label>
              <Select value={form.category} onValueChange={v => set("category", v)}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(CATEGORIES).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {/* Qty + Harga Satuan */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Qty (opsional)</Label>
                <Input type="number" min={0} value={form.qty} onChange={e => set("qty", e.target.value)} placeholder="1" className="mt-1" />
              </div>
              <div>
                <Label className="text-xs">Harga Satuan (Rp)</Label>
                <Input type="number" min={0} value={form.harga_satuan} onChange={e => set("harga_satuan", e.target.value)} placeholder="0" className="mt-1" />
              </div>
            </div>

            {/* Total */}
            <div>
              <Label className="text-xs">
                {autoTotal !== null ? (
                  <span>Total <span className="text-green-600 font-semibold">(otomatis = {qty} × Rp {harga.toLocaleString("id-ID")})</span></span>
                ) : "Nominal (Rp) *"}
              </Label>
              {autoTotal !== null ? (
                <div className="mt-1 px-3 py-2 bg-muted rounded-md text-sm font-bold text-primary">
                  Rp {displayAmount.toLocaleString("id-ID")}
                </div>
              ) : (
                <Input type="number" min={0} value={form.amount} onChange={e => set("amount", e.target.value)} className="mt-1" />
              )}
            </div>

            {/* Tanggal */}
            <div>
              <Label className="text-xs">Tanggal</Label>
              <Input type="date" value={form.date} onChange={e => set("date", e.target.value)} className="mt-1" />
            </div>

            {/* Keterangan */}
            <div>
              <Label className="text-xs">Keterangan</Label>
              <Input value={form.description} onChange={e => set("description", e.target.value)} className="mt-1" />
            </div>

            <div className="flex gap-2 pt-1">
              <Button variant="outline" className="flex-1" onClick={onClose}>Batal</Button>
              <Button className="flex-1" onClick={handleSave} disabled={saving || displayAmount <= 0}>
                {saving && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
                Simpan
              </Button>
            </div>

            {/* Tombol hapus */}
            <Button variant="ghost" className="w-full text-red-600 hover:bg-red-50 text-xs" onClick={() => setShowDelete(true)}>
              Hapus Transaksi Ini
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <AlertDialog open={showDelete} onOpenChange={setShowDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Transaksi?</AlertDialogTitle>
            <AlertDialogDescription>
              {source
                ? `⚠️ Menghapus di sini tidak menghapus ${source.label}-nya. Data bisa tidak sinkron.`
                : "Data ini akan dihapus permanen."
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive" onClick={handleDelete} disabled={deleting}>
              {deleting && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
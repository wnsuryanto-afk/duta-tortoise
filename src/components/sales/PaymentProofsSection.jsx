import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { base44 } from "@/api/base44Client";
import { Plus, Upload, Loader2, X, CheckCircle2 } from "lucide-react";
import { format } from "date-fns";
import { id } from "date-fns/locale";

function formatRp(v) {
  return "Rp " + (v || 0).toLocaleString("id-ID");
}

export default function PaymentProofsSection({ sale, onUpdated }) {
  const [showAdd, setShowAdd] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ amount: "", date: new Date().toISOString().split("T")[0], notes: "", photo_url: "" });

  const proofs = sale?.payment_proofs || [];
  const totalPaid = proofs.reduce((s, p) => s + (p.amount || 0), 0);
  const price = sale?.price || 0;
  const remaining = price - totalPaid;
  const pct = price > 0 ? Math.min(100, Math.round((totalPaid / price) * 100)) : 0;

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const res = await base44.integrations.Core.UploadFile({ file });
    setForm(f => ({ ...f, photo_url: res.file_url }));
    setUploading(false);
  };

  const handleAdd = async () => {
    if (!form.amount) return;
    setSaving(true);
    const newProof = { amount: Number(form.amount), date: form.date, notes: form.notes, photo_url: form.photo_url };
    const newProofs = [...proofs, newProof];
    const newTotalPaid = newProofs.reduce((s, p) => s + (p.amount || 0), 0);
    const newRemaining = price - newTotalPaid;
    const newStatus = newTotalPaid >= price ? "lunas" : "dp";

    await base44.entities.Sale.update(sale.id, {
      payment_proofs: newProofs,
      total_paid: newTotalPaid,
      remaining_balance: newRemaining,
      payment_status: newStatus,
    });

    setSaving(false);
    setShowAdd(false);
    setForm({ amount: "", date: new Date().toISOString().split("T")[0], notes: "", photo_url: "" });
    onUpdated?.();
  };

  const handleRemove = async (idx) => {
    if (!confirm("Hapus bukti pembayaran ini?")) return;
    const newProofs = proofs.filter((_, i) => i !== idx);
    const newTotalPaid = newProofs.reduce((s, p) => s + (p.amount || 0), 0);
    const newRemaining = price - newTotalPaid;
    const newStatus = newTotalPaid >= price ? "lunas" : newProofs.length > 0 ? "dp" : "belum_bayar";
    await base44.entities.Sale.update(sale.id, {
      payment_proofs: newProofs,
      total_paid: newTotalPaid,
      remaining_balance: newRemaining,
      payment_status: newStatus,
    });
    onUpdated?.();
  };

  return (
    <div className="space-y-3">
      {/* Progress */}
      <div className="bg-muted/40 rounded-xl p-4">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium">Progress Pembayaran</span>
          <span className="text-sm font-bold text-primary">{pct}%</span>
        </div>
        <div className="w-full h-2.5 bg-muted rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${pct >= 100 ? "bg-green-500" : "bg-primary"}`}
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="flex justify-between mt-2 text-xs text-muted-foreground">
          <span>Sudah Bayar: <strong className="text-foreground">{formatRp(totalPaid)}</strong></span>
          <span>Sisa: <strong className={remaining > 0 ? "text-destructive" : "text-green-600"}>{formatRp(remaining)}</strong></span>
        </div>
        {pct >= 100 && (
          <div className="flex items-center gap-1.5 mt-2 text-green-600 text-xs font-semibold">
            <CheckCircle2 className="w-4 h-4" /> Pembayaran Lunas!
          </div>
        )}
      </div>

      {/* Proof list */}
      {proofs.length > 0 && (
        <div className="space-y-2">
          {proofs.map((p, i) => (
            <div key={i} className="flex items-center gap-3 p-3 bg-card border border-border rounded-xl">
              {p.photo_url && (
                <img src={p.photo_url} alt="bukti" className="w-12 h-12 rounded-lg object-cover flex-shrink-0 border" />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-green-700">{formatRp(p.amount)}</p>
                <p className="text-xs text-muted-foreground">
                  {p.date ? format(new Date(p.date), "d MMM yyyy", { locale: id }) : "—"}
                  {p.notes && ` · ${p.notes}`}
                </p>
              </div>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive flex-shrink-0" onClick={() => handleRemove(i)}>
                <X className="w-3.5 h-3.5" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Add form */}
      {showAdd ? (
        <div className="border border-border rounded-xl p-4 space-y-3 bg-muted/20">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Jumlah Dibayar (Rp) *</Label>
              <Input type="number" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} placeholder="500000" className="mt-1" />
            </div>
            <div>
              <Label className="text-xs">Tanggal</Label>
              <Input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} className="mt-1" />
            </div>
          </div>
          <div>
            <Label className="text-xs">Catatan</Label>
            <Input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Transfer BCA, dll" className="mt-1" />
          </div>
          <div>
            <Label className="text-xs">Foto Bukti Transfer</Label>
            <div className="mt-1 flex items-center gap-2">
              <label className="cursor-pointer flex items-center gap-2 px-3 py-2 border border-border rounded-lg bg-background hover:bg-muted text-xs">
                {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                {form.photo_url ? "Ganti Foto" : "Upload Foto"}
                <input type="file" accept="image/*" className="hidden" onChange={handleUpload} />
              </label>
              {form.photo_url && <img src={form.photo_url} alt="preview" className="w-10 h-10 rounded-lg object-cover border" />}
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="flex-1" onClick={() => setShowAdd(false)}>Batal</Button>
            <Button size="sm" className="flex-1" onClick={handleAdd} disabled={saving || !form.amount}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Simpan"}
            </Button>
          </div>
        </div>
      ) : (
        <Button variant="outline" size="sm" className="w-full gap-2" onClick={() => setShowAdd(true)}>
          <Plus className="w-4 h-4" /> Tambah Bukti Pembayaran
        </Button>
      )}
    </div>
  );
}
import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Upload, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { compressImage } from "@/lib/useImageCompression";

const PEMAKAIAN_CATS = [
  { value: "obat", label: "Obat" },
  { value: "vitamin", label: "Vitamin" },
  { value: "pakan", label: "Pakan" },
  { value: "peralatan_kandang", label: "Peralatan Kandang" },
  { value: "transportasi", label: "Transportasi" },
  { value: "konsumsi", label: "Konsumsi" },
  { value: "lainnya", label: "Lainnya" },
];

export default function PemakaianForm({ currentSaldo, user, role, onClose, onSaved }) {
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [entryDate, setEntryDate] = useState(new Date().toISOString().split("T")[0]);
  const [proofPhoto, setProofPhoto] = useState("");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirmOver, setConfirmOver] = useState(false);

  const amt = Number(amount) || 0;
  const isOver = amt > currentSaldo;

  const handlePhoto = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.match(/^image\/(jpeg|jpg|png|webp)$/)) { toast.error("Format harus JPG/PNG/WEBP"); return; }
    setUploading(true);
    try {
      let f = file;
      if (file.size > 500 * 1024) {
        const res = await compressImage(file, { maxWidthOrHeight: 1280, quality: 0.8 });
        f = res.file;
      }
      const { file_url } = await base44.integrations.Core.UploadFile({ file: f });
      setProofPhoto(file_url);
    } catch { toast.error("Gagal upload foto"); }
    setUploading(false);
  };

  const handleSave = async () => {
    if (!amt || amt <= 0) { toast.error("Nominal harus > 0"); return; }
    if (!category) { toast.error("Pilih kategori"); return; }
    if (!description.trim()) { toast.error("Keterangan wajib diisi"); return; }
    if (isOver && !confirmOver) { setConfirmOver(true); return; }
    setSaving(true);
    try {
      const balanceAfter = currentSaldo - amt;
      const ledger = await base44.entities.PettyCashLedger.create({
        entry_type: "pemakaian",
        amount: amt,
        balance_after: balanceAfter,
        category,
        description: description.trim(),
        entry_date: entryDate,
        proof_photo: proofPhoto || undefined,
        recorded_by_name: user?.full_name || user?.email,
        recorded_by_email: user?.email,
        recorded_by_role: role,
      });
      // Auto-create FinanceTransaction (only for pemakaian)
      const tx = await base44.entities.FinanceTransaction.create({
        type: "pengeluaran",
        category: "kas_kecil",
        amount: amt,
        date: entryDate,
        description: description.trim(),
        reference_id: ledger.id,
        created_by_name: user?.full_name || user?.email,
      });
      if (tx?.id) {
        await base44.entities.PettyCashLedger.update(ledger.id, { finance_tx_id: tx.id });
      }
      toast.success("Pemakaian dicatat & masuk Laba Rugi!");
      onSaved();
      onClose();
    } catch (err) {
      toast.error("Gagal: " + (err?.message || ""));
    }
    setSaving(false);
  };

  return (
    <div className="space-y-3">
      <div>
        <Label className="text-xs">Nominal (Rp) *</Label>
        <Input type="number" value={amount} onChange={e => { setAmount(e.target.value); setConfirmOver(false); }} placeholder="0" className="mt-1 text-lg font-semibold" autoFocus />
      </div>
      {isOver && (
        <div className="flex items-start gap-2 p-2.5 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
          <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>Saldo tidak cukup (sisa Rp {Number(currentSaldo).toLocaleString("id-ID")}). {confirmOver ? "Akan dilanjutkan — saldo bisa minus." : "Lanjutkan?"}</span>
        </div>
      )}
      <div>
        <Label className="text-xs">Kategori *</Label>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="mt-1"><SelectValue placeholder="Pilih kategori..." /></SelectTrigger>
          <SelectContent>
            {PEMAKAIAN_CATS.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label className="text-xs">Keterangan *</Label>
        <Input value={description} onChange={e => setDescription(e.target.value)} placeholder="cth: Beli pakan rumput 5kg" className="mt-1" />
      </div>
      <div>
        <Label className="text-xs">Tanggal *</Label>
        <Input type="date" value={entryDate} onChange={e => setEntryDate(e.target.value)} className="mt-1" />
      </div>
      <div>
        <Label className="text-xs">Foto Nota (opsional)</Label>
        <div className="flex items-center gap-2 mt-1">
          <label className="flex items-center gap-1.5 px-3 py-2 border rounded-lg cursor-pointer hover:bg-muted text-xs text-muted-foreground">
            <Upload className="w-3.5 h-3.5" /> {uploading ? "Uploading..." : "Pilih Foto"}
            <input type="file" accept="image/jpeg,image/jpg,image/png,image/webp" className="hidden" onChange={handlePhoto} disabled={uploading} />
          </label>
          {proofPhoto && <img src={proofPhoto} alt="nota" className="w-12 h-12 rounded-lg object-cover border" />}
        </div>
      </div>
      {confirmOver && (
        <p className="text-xs text-red-600 font-medium">⚠️ Konfirmasi: Saldo akan menjadi minus (Rp {(currentSaldo - amt).toLocaleString("id-ID")})</p>
      )}
      <div className="flex gap-2 pt-1">
        <Button variant="outline" className="flex-1" onClick={onClose}>Batal</Button>
        <Button className="flex-1" onClick={handleSave} disabled={saving || uploading || !amount || !category || !description.trim()}
          variant={isOver ? "destructive" : "default"}>
          {saving && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
          {isOver && !confirmOver ? "Lanjutkan?" : "Catat Pemakaian"}
        </Button>
      </div>
    </div>
  );
}
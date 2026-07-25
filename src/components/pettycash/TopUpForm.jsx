import { useState, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, ImagePlus, X } from "lucide-react";
import { toast } from "sonner";
import { compressImage } from "@/lib/useImageCompression";

const QUICK_AMOUNTS = [500000, 1000000, 2000000];

export default function TopUpForm({ currentSaldo, user, role, onClose, onSaved }) {
  const [amount, setAmount] = useState("");
  const [entryDate, setEntryDate] = useState(new Date().toISOString().split("T")[0]);
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [proofUrl, setProofUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const compressed = await compressImage(file, { maxSizeMB: 0.5, maxWidthOrHeight: 1280, quality: 0.8 });
      const { file_url } = await base44.integrations.Core.UploadFile({ file: compressed.file });
      setProofUrl(file_url);
    } catch (err) {
      toast.error("Gagal upload: " + (err?.message || ""));
    }
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSave = async () => {
    const amt = Number(amount);
    if (!amt || amt <= 0) { toast.error("Nominal harus > 0"); return; }
    setSaving(true);
    try {
      const balanceAfter = Math.round(currentSaldo + amt);
      await base44.entities.PettyCashLedger.create({
        entry_type: "top_up",
        amount: amt,
        balance_after: balanceAfter,
        entry_date: entryDate,
        description: description || "Top up kas kecil",
        proof_photo: proofUrl || undefined,
        recorded_by_name: user?.full_name || user?.email,
        recorded_by_email: user?.email,
        recorded_by_role: role,
      });
      // Recalculate all balance_after to ensure chain consistency
      await base44.functions.invoke('recalculatePettyCashBalance', {});
      toast.success("Saldo berhasil diisi!");
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
        <Input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0" className="mt-1 text-lg font-semibold" autoFocus />
        <div className="flex gap-1.5 mt-2">
          {QUICK_AMOUNTS.map(a => (
            <button key={a} type="button" onClick={() => setAmount(String(a))}
              className="flex-1 text-xs py-1.5 rounded-lg border border-border bg-muted/30 hover:bg-primary/10 hover:border-primary/40 transition-colors">
              Rp {a / 1000}rb
            </button>
          ))}
        </div>
      </div>
      <div>
        <Label className="text-xs">Tanggal *</Label>
        <Input type="date" value={entryDate} onChange={e => setEntryDate(e.target.value)} className="mt-1" />
      </div>
      <div>
        <Label className="text-xs">Sumber / Keterangan</Label>
        <Input value={description} onChange={e => setDescription(e.target.value)} placeholder="cth: Tarik dari rekening BCA" className="mt-1" />
      </div>
      <div>
        <Label className="text-xs">Bukti Transfer (opsional)</Label>
        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileSelect} />
        {proofUrl ? (
          <div className="relative mt-1 inline-block w-full">
            <img src={proofUrl} alt="bukti transfer" className="w-full max-h-40 object-contain rounded-lg border" />
            <button type="button" onClick={() => setProofUrl("")} className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-1 hover:bg-black/80">
              <X className="w-3 h-3" />
            </button>
          </div>
        ) : (
          <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploading}
            className="mt-1 w-full border-2 border-dashed border-border rounded-lg p-3 text-center hover:border-primary/40 hover:bg-primary/5 transition-colors">
            {uploading ? <Loader2 className="w-5 h-5 mx-auto animate-spin text-muted-foreground" /> : <ImagePlus className="w-5 h-5 mx-auto text-muted-foreground" />}
            <p className="text-xs text-muted-foreground mt-1">{uploading ? "Mengupload..." : "Upload bukti (opsional)"}</p>
          </button>
        )}
      </div>
      <div className="flex gap-2 pt-1">
        <Button variant="outline" className="flex-1" onClick={onClose}>Batal</Button>
        <Button className="flex-1" onClick={handleSave} disabled={saving || uploading || !amount}>
          {saving && <Loader2 className="w-4 h-4 mr-1 animate-spin" />} Isi Saldo
        </Button>
      </div>
    </div>
  );
}
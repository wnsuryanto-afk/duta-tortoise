import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Upload, Camera, X } from "lucide-react";
import { toast } from "sonner";
import { usePettyCashCategories } from "@/hooks/useEntityCategories";
import { PETTYCASH_CATS } from "@/lib/financeCategories";
import { logActivity } from "@/lib/logActivity";
import { compressImage } from "@/lib/useImageCompression";
import { useCurrentUser } from "@/lib/useCurrentUser";

export default function EditLedgerEntryDialog({ entry, onClose, onSaved }) {
  const { user } = useCurrentUser();
  const [qty, setQty] = useState(entry.qty ? String(entry.qty) : "");
  const [hargaSatuan, setHargaSatuan] = useState(entry.harga_satuan ? String(entry.harga_satuan) : "");
  const [amountManual, setAmountManual] = useState(String(entry.amount || ""));
  const [category, setCategory] = useState(entry.category || "lainnya");
  const [description, setDescription] = useState(entry.description || "");
  const [entryDate, setEntryDate] = useState(entry.entry_date || new Date().toISOString().split("T")[0]);
  const [proofPhoto, setProofPhoto] = useState(entry.proof_photo || "");
  const [noNota, setNoNota] = useState(!entry.proof_photo && !!entry.notes);
  const [noNotaReason, setNoNotaReason] = useState((!entry.proof_photo && entry.notes) ? entry.notes : "");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const { cats: pettyCats } = usePettyCashCategories();

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
      setNoNota(false);
    } catch { toast.error("Gagal upload foto"); }
    setUploading(false);
  };

  const qtyNum = Number(qty) || 0;
  const hargaNum = Number(hargaSatuan) || 0;
  const autoTotal = qtyNum > 0 && hargaNum > 0 ? qtyNum * hargaNum : null;
  const amt = autoTotal !== null ? autoTotal : (Number(amountManual) || 0);

  const isPemakaian = entry.entry_type === "pemakaian";

  const handleSave = async () => {
    if (!amt || amt <= 0) { toast.error("Nominal harus > 0"); return; }
    if (!description.trim()) { toast.error("Keterangan wajib diisi"); return; }
    if (isPemakaian) {
      if (!proofPhoto && !noNota) { toast.error("Foto nota wajib. Atau centang 'Tidak ada nota' dengan alasan."); return; }
      if (noNota && !noNotaReason.trim()) { toast.error("Alasan 'tidak ada nota' wajib diisi"); return; }
    }
    setSaving(true);
    try {
      const before = { ...entry };
      const updateData = {
        amount: amt,
        description: description.trim(),
        entry_date: entryDate,
      };
      if (isPemakaian) {
        updateData.category = category;
        updateData.proof_photo = noNota ? "" : (proofPhoto || "");
        updateData.notes = noNota ? noNotaReason.trim() : "";
      }
      if (qtyNum > 0) updateData.qty = qtyNum;
      if (hargaNum > 0) updateData.harga_satuan = hargaNum;

      await base44.entities.PettyCashLedger.update(entry.id, updateData);

      // Update linked FinanceTransaction
      if (entry.finance_tx_id) {
        const txDesc = qtyNum > 0 && hargaNum > 0
          ? `${description.trim()} — ${qtyNum} × Rp ${hargaNum.toLocaleString("id-ID")} = Rp ${amt.toLocaleString("id-ID")}`
          : description.trim();
        await base44.entities.FinanceTransaction.update(entry.finance_tx_id, {
          amount: amt,
          description: txDesc,
          date: entryDate,
          edited_by: user?.full_name || user?.email || "",
          edited_at: new Date().toISOString(),
        });
      }

      // Recalculate all balance_after (cascade)
      await base44.functions.invoke('recalculatePettyCashBalance', {});

      await logActivity({
        action: "update",
        entity_type: "PettyCashLedger",
        entity_id: entry.id,
        entity_name: `Kas kecil — ${description.trim()}`,
        before,
        after: { ...entry, ...updateData },
      });

      toast.success("Entri diperbarui & saldo dihitung ulang!");
      onSaved();
      onClose();
    } catch (err) {
      toast.error("Gagal: " + (err?.message || ""));
    }
    setSaving(false);
  };

  return (
    <div className="space-y-3">
      <div className="text-xs text-muted-foreground">
        Jenis: <span className="font-semibold capitalize">{entry.entry_type?.replace(/_/g, " ")}</span>
      </div>

      {isPemakaian && (
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label className="text-xs">Qty (opsional)</Label>
            <Input type="number" min={0} value={qty} onChange={e => setQty(e.target.value)} placeholder="cth: 5" className="mt-1" />
          </div>
          <div>
            <Label className="text-xs">Harga Satuan (Rp)</Label>
            <Input type="number" min={0} value={hargaSatuan} onChange={e => setHargaSatuan(e.target.value)} placeholder="cth: 20000" className="mt-1" />
          </div>
        </div>
      )}

      <div>
        {autoTotal !== null ? (
          <>
            <Label className="text-xs text-green-700 font-semibold">Total Otomatis:</Label>
            <div className="mt-1 px-3 py-2.5 bg-green-50 border border-green-200 rounded-lg text-lg font-bold text-green-700">
              Rp {autoTotal.toLocaleString("id-ID")}
            </div>
          </>
        ) : (
          <>
            <Label className="text-xs">Nominal (Rp) *</Label>
            <Input type="number" min={0} value={amountManual} onChange={e => setAmountManual(e.target.value)} placeholder="0" className="mt-1 text-lg font-semibold" />
          </>
        )}
      </div>

      {isPemakaian && (
        <div>
          <Label className="text-xs">Kategori</Label>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
            <SelectContent className="max-h-72 overflow-y-auto">
              {(pettyCats.length ? pettyCats : PETTYCASH_CATS).map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      )}

      <div>
        <Label className="text-xs">Keterangan *</Label>
        <Input value={description} onChange={e => setDescription(e.target.value)} className="mt-1" />
      </div>
      <div>
        <Label className="text-xs">Tanggal *</Label>
        <Input type="date" value={entryDate} onChange={e => setEntryDate(e.target.value)} className="mt-1" />
      </div>

      {isPemakaian && (
        <div className="space-y-2 p-3 bg-muted/30 rounded-lg border border-border">
          <Label className="text-xs font-semibold flex items-center gap-1.5">
            <Camera className="w-3.5 h-3.5" /> Foto Nota {noNota ? "" : "*"}
          </Label>
          {!noNota && (
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-1.5 px-3 py-2 border rounded-lg cursor-pointer hover:bg-muted text-xs text-muted-foreground bg-background">
                <Upload className="w-3.5 h-3.5" /> {uploading ? "Uploading..." : "Pilih / Ambil Foto"}
                <input type="file" accept="image/jpeg,image/jpg,image/png,image/webp" capture="environment" className="hidden" onChange={handlePhoto} disabled={uploading || saving} />
              </label>
              {proofPhoto && (
                <div className="relative">
                  <img src={proofPhoto} alt="nota" className="w-14 h-14 rounded-lg object-cover border" />
                  <button type="button" onClick={() => setProofPhoto("")} className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full flex items-center justify-center">
                    <X className="w-2.5 h-2.5" />
                  </button>
                </div>
              )}
            </div>
          )}
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={noNota} onChange={e => setNoNota(e.target.checked)} className="w-4 h-4 rounded border-border" />
            <span className="text-xs text-muted-foreground">Tidak ada nota</span>
          </label>
          {noNota && (
            <Input value={noNotaReason} onChange={e => setNoNotaReason(e.target.value)} placeholder="Alasan (cth: parkir, tanpa nota) *" className="text-xs" />
          )}
        </div>
      )}

      <div className="flex gap-2 pt-1">
        <Button variant="outline" className="flex-1" onClick={onClose}>Batal</Button>
        <Button className="flex-1" onClick={handleSave} disabled={saving || uploading || !amt || !description.trim() || (isPemakaian && !proofPhoto && !noNota) || (isPemakaian && noNota && !noNotaReason.trim())}>
          {saving && <Loader2 className="w-4 h-4 mr-1 animate-spin" />} Simpan Perubahan
        </Button>
      </div>
    </div>
  );
}
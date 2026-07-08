import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { usePettyCashCategories } from "@/hooks/useEntityCategories";
import { PETTYCASH_CATS } from "@/lib/financeCategories";
import { logActivity } from "@/lib/logActivity";
import { useCurrentUser } from "@/lib/useCurrentUser";

export default function EditLedgerEntryDialog({ entry, onClose, onSaved }) {
  const { user } = useCurrentUser();
  const [qty, setQty] = useState(entry.qty ? String(entry.qty) : "");
  const [hargaSatuan, setHargaSatuan] = useState(entry.harga_satuan ? String(entry.harga_satuan) : "");
  const [amountManual, setAmountManual] = useState(String(entry.amount || ""));
  const [category, setCategory] = useState(entry.category || "lainnya");
  const [description, setDescription] = useState(entry.description || "");
  const [entryDate, setEntryDate] = useState(entry.entry_date || new Date().toISOString().split("T")[0]);
  const [saving, setSaving] = useState(false);
  const { cats: pettyCats } = usePettyCashCategories();

  const qtyNum = Number(qty) || 0;
  const hargaNum = Number(hargaSatuan) || 0;
  const autoTotal = qtyNum > 0 && hargaNum > 0 ? qtyNum * hargaNum : null;
  const amt = autoTotal !== null ? autoTotal : (Number(amountManual) || 0);

  const isPemakaian = entry.entry_type === "pemakaian";

  const handleSave = async () => {
    if (!amt || amt <= 0) { toast.error("Nominal harus > 0"); return; }
    if (!description.trim()) { toast.error("Keterangan wajib diisi"); return; }
    setSaving(true);
    try {
      const before = { ...entry };
      const updateData = {
        amount: amt,
        description: description.trim(),
        entry_date: entryDate,
      };
      if (isPemakaian) updateData.category = category;
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

      <div className="flex gap-2 pt-1">
        <Button variant="outline" className="flex-1" onClick={onClose}>Batal</Button>
        <Button className="flex-1" onClick={handleSave} disabled={saving || !amt || !description.trim()}>
          {saving && <Loader2 className="w-4 h-4 mr-1 animate-spin" />} Simpan Perubahan
        </Button>
      </div>
    </div>
  );
}
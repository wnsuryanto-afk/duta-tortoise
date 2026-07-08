import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

export default function RekonsiliasiForm({ currentSaldo, user, role, onClose, onSaved }) {
  const [physicalCash, setPhysicalCash] = useState("");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);

  const phys = Number(physicalCash) || 0;
  const selisih = phys - currentSaldo;

  const handleSave = async () => {
    if (!physicalCash) { toast.error("Masukkan saldo fisik"); return; }
    if (selisih === 0) { toast.info("Saldo app sama dengan fisik — tidak perlu penyesuaian"); onClose(); return; }
    if (!reason.trim()) { toast.error("Alasan selisih wajib diisi"); return; }
    setSaving(true);
    try {
      const entryDate = new Date().toISOString().split("T")[0];
      await base44.entities.PettyCashLedger.create({
        entry_type: "penyesuaian",
        amount: Math.abs(selisih),
        balance_after: phys,
        entry_date: entryDate,
        description: `Rekonsiliasi: ${selisih > 0 ? "tambah" : "kurang"} Rp ${Math.abs(selisih).toLocaleString("id-ID")}`,
        notes: reason.trim(),
        recorded_by_name: user?.full_name || user?.email,
        recorded_by_email: user?.email,
        recorded_by_role: role,
      });
      // Penyesuaian TIDAK membuat FinanceTransaction
      // Recalculate all balance_after to ensure chain consistency
      await base44.functions.invoke('recalculatePettyCashBalance', {});
      toast.success("Rekonsiliasi disimpan! Saldo disesuaikan.");
      onSaved();
      onClose();
    } catch (err) {
      toast.error("Gagal: " + (err?.message || ""));
    }
    setSaving(false);
  };

  return (
    <div className="space-y-3">
      <div className="p-3 bg-muted/30 rounded-lg text-sm">
        <p className="text-muted-foreground">Saldo di App:</p>
        <p className="text-lg font-bold">Rp {Number(currentSaldo).toLocaleString("id-ID")}</p>
      </div>
      <div>
        <Label className="text-xs">Saldo Fisik Uang Sekarang (Rp) *</Label>
        <Input type="number" value={physicalCash} onChange={e => setPhysicalCash(e.target.value)} placeholder="0" className="mt-1 text-lg font-semibold" autoFocus />
      </div>
      {physicalCash !== "" && selisih !== 0 && (
        <div className={`flex items-start gap-2 p-2.5 rounded-lg text-xs ${selisih > 0 ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-700 border border-red-200"}`}>
          <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>Selisih: <strong>{selisih > 0 ? "+" : ""}Rp {Math.abs(selisih).toLocaleString("id-ID")}</strong> ({selisih > 0 ? "fisik lebih banyak" : "fisik kurang"}). Akan dibuat penyesuaian.</span>
        </div>
      )}
      {physicalCash !== "" && selisih !== 0 && (
        <div>
          <Label className="text-xs">Alasan Selisih *</Label>
          <Textarea value={reason} onChange={e => setReason(e.target.value)} placeholder="cth: Lupa catat pengeluaran Rp 50rb untuk..." className="mt-1 resize-none h-16" />
        </div>
      )}
      <div className="flex gap-2 pt-1">
        <Button variant="outline" className="flex-1" onClick={onClose}>Batal</Button>
        <Button className="flex-1" onClick={handleSave} disabled={saving || !physicalCash || (selisih !== 0 && !reason.trim())}>
          {saving && <Loader2 className="w-4 h-4 mr-1 animate-spin" />} Rekonsiliasi
        </Button>
      </div>
    </div>
  );
}
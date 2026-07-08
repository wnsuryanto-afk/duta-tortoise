import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { logActivity } from "@/lib/logActivity";
import { useCurrentUser } from "@/lib/useCurrentUser";
import { toast } from "sonner";
import { format } from "date-fns";

const fmt = (n) => `Rp ${Number(n || 0).toLocaleString("id-ID")}`;

export default function DeductionDialog({ kasbon, mode, onClose }) {
  const { user } = useCurrentUser();
  const sisa = (kasbon.amount || 0) - (kasbon.total_paid || 0);
  const defaultAmt = mode === "cash" ? sisa : Math.min(kasbon.weekly_deduction || 100000, sisa);

  const [amount, setAmount] = useState(String(defaultAmt));
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const isCash = mode === "cash";
  const title = isCash ? "Pelunasan Tunai" : "Catat Potongan Kasbon";

  const handleSubmit = async (e) => {
    e.preventDefault();
    const amt = Number(amount);
    if (!amt || amt <= 0) { toast.error("Nominal tidak valid"); return; }
    if (amt > sisa) { toast.error("Nominal melebihi sisa kasbon"); return; }
    setSaving(true);
    try {
      const newPaid = (kasbon.total_paid || 0) + amt;
      const lunas = newPaid >= kasbon.amount;
      const newLog = [...(kasbon.deduction_log || []), {
        amount: amt,
        date,
        method: isCash ? "cash" : "manual",
        recorded_by: user?.full_name || user?.email,
        notes: notes || (isCash ? "Pelunasan tunai" : "Potongan manual"),
      }];
      await base44.entities.Kasbon.update(kasbon.id, {
        total_paid: newPaid,
        status: lunas ? "lunas" : "approved",
        deduction_log: newLog,
      });
      await logActivity({
        action: "update",
        entity_type: "Kasbon",
        entity_id: kasbon.id,
        entity_name: kasbon.employee_name,
        changes_summary: `${isCash ? "Pelunasan tunai" : "Potongan"} Rp ${amt.toLocaleString("id-ID")}${lunas ? " — LUNAS" : ""}`,
      });
      toast.success(`${isCash ? "Pelunasan" : "Potongan"} ${fmt(amt)} dicatat${lunas ? " — Kasbon lunas" : ""}`);
      onClose();
    } catch (err) {
      toast.error(err.message || "Gagal mencatat potongan");
    }
    setSaving(false);
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="p-3 bg-muted/40 rounded-lg text-sm space-y-1">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Karyawan</span>
              <span className="font-medium">{kasbon.employee_name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total Pinjaman</span>
              <span>{fmt(kasbon.amount)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Sudah Dibayar</span>
              <span>{fmt(kasbon.total_paid)}</span>
            </div>
            <div className="flex justify-between font-semibold">
              <span>Sisa</span>
              <span className="text-primary">{fmt(sisa)}</span>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Nominal {isCash ? "Pelunasan" : "Potongan"} (Rp) *</Label>
            <Input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              disabled={isCash}
              max={sisa}
              required
            />
            {!isCash && (
              <p className="text-xs text-muted-foreground">
                Maks: {fmt(sisa)} · Default potongan per periode: {fmt(kasbon.weekly_deduction)}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label>Tanggal *</Label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
          </div>

          <div className="space-y-1.5">
            <Label>Catatan</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={isCash ? "Pelunasan tunai..." : "Catatan potongan..."}
              rows={2}
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>Batal</Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Menyimpan..." : isCash ? "Lunasi" : "Catat Potongan"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
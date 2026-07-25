import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

const QUICK_AMOUNTS = [500000, 1000000, 2000000];

export default function TopUpRequestForm({ user, onClose, onSaved }) {
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    const amt = Number(amount);
    if (!amt || amt <= 0) { toast.error("Nominal harus > 0"); return; }
    if (!reason.trim()) { toast.error("Alasan wajib diisi"); return; }
    setSaving(true);
    try {
      await base44.entities.PettyCashTopUpRequest.create({
        requester_email: user?.email,
        requester_name: user?.full_name || user?.email,
        amount_requested: amt,
        reason: reason.trim(),
        request_date: new Date().toISOString().split("T")[0],
        status: "pending",
      });
      toast.success("Request top-up terkirim ke owner");
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
        <Label className="text-xs">Nominal Top-up (Rp) *</Label>
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
        <Label className="text-xs">Alasan *</Label>
        <Textarea value={reason} onChange={e => setReason(e.target.value)} placeholder="cth: kas menipis, sisa 150rb" className="mt-1 resize-none h-16" />
      </div>
      <div className="flex gap-2 pt-1">
        <Button variant="outline" className="flex-1" onClick={onClose}>Batal</Button>
        <Button className="flex-1" onClick={handleSave} disabled={saving || !amount || !reason.trim()}>
          {saving && <Loader2 className="w-4 h-4 mr-1 animate-spin" />} Kirim Request
        </Button>
      </div>
    </div>
  );
}
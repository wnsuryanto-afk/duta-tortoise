import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { logActivity } from "@/lib/logActivity";
import { useCurrentUser } from "@/lib/useCurrentUser";
import { toast } from "sonner";
import { format } from "date-fns";
import { formatRole } from "@/lib/permissions";
import { useTestMode } from "@/lib/useTestMode";

export default function KasbonForm({ users, usersLoading, onClose }) {
  const { testModeTag } = useTestMode();
  const { user } = useCurrentUser();
  const [form, setForm] = useState({
    employee_email: "",
    amount: "",
    reason: "",
    weekly_deduction: "100000",
    record_expense: true,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const eligibleUsers = users.filter(u =>
    ["keeper", "kepala_feeder", "admin", "manajer"].includes(u.role) && u.email
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    const emp = users.find(u => u.email === form.employee_email);
    if (!emp) { setError("Pilih karyawan terlebih dahulu."); return; }
    const amt = Number(form.amount);
    if (!amt || amt <= 0) { setError("Nominal kasbon harus diisi."); return; }
    const weekly = Number(form.weekly_deduction) || 100000;
    if (weekly <= 0) { setError("Potongan per minggu tidak valid."); return; }

    setSaving(true);
    try {
      const today = format(new Date(), "yyyy-MM-dd");
      const kasbonData = {
        employee_id: emp.id,
        employee_name: emp.full_name || emp.email,
        employee_email: emp.email,
        amount: amt,
        request_date: today,
        reason: form.reason || "-",
        weekly_deduction: weekly,
        total_paid: 0,
        status: "approved",
        approved_by: user?.full_name || user?.email,
        approved_date: today,
        deduction_log: [],
      };
      const created = await base44.entities.Kasbon.create(kasbonData);

      if (form.record_expense) {
        const tx = await base44.entities.FinanceTransaction.create({
          type: "pengeluaran",
          category: "gaji_karyawan",
          sub_category: "Kasbon",
          amount: amt,
          date: today,
          description: `Kasbon ${emp.full_name || emp.email}`,
          reference_id: created.id,
          created_by_name: user?.full_name || user?.email,
          ...testModeTag,
        });
        await base44.entities.Kasbon.update(created.id, { finance_tx_id: tx.id });
      }

      await logActivity({
        action: "create",
        entity_type: "Kasbon",
        entity_id: created.id,
        entity_name: emp.full_name || emp.email,
        changes_summary: `Kasbon baru Rp ${amt.toLocaleString("id-ID")} untuk ${emp.full_name || emp.email}${form.record_expense ? " (dicatat sebagai pengeluaran)" : ""}`,
      });

      toast.success(`Kasbon ${emp.full_name || emp.email} berhasil dibuat`);
      onClose();
    } catch (err) {
      setError(err.message || "Gagal membuat kasbon");
    }
    setSaving(false);
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Kasbon Baru</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <Label>Karyawan *</Label>
            {usersLoading ? (
              <div className="text-sm text-muted-foreground py-2">Memuat daftar karyawan...</div>
            ) : eligibleUsers.length === 0 ? (
              <div className="text-sm text-amber-700 py-2 bg-amber-50 border border-amber-200 rounded-md px-3">
                Tidak ada karyawan yang bisa dipilih. Periksa Manajemen User untuk memastikan ada karyawan aktif (keeper/kepala feeder/admin/manajer).
              </div>
            ) : (
              <Select value={form.employee_email} onValueChange={(v) => setForm(p => ({ ...p, employee_email: v }))}>
                <SelectTrigger><SelectValue placeholder="Pilih karyawan" /></SelectTrigger>
                <SelectContent>
                  {eligibleUsers.map(u => (
                    <SelectItem key={u.id} value={u.email}>
                      {u.full_name || u.email} · {formatRole(u.role)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="space-y-1.5">
            <Label>Nominal Kasbon (Rp) *</Label>
            <Input
              type="number"
              value={form.amount}
              onChange={(e) => setForm(p => ({ ...p, amount: e.target.value }))}
              placeholder="Contoh: 500000"
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label>Keperluan / Alasan</Label>
            <Textarea
              value={form.reason}
              onChange={(e) => setForm(p => ({ ...p, reason: e.target.value }))}
              placeholder="Jelaskan keperluan kasbon..."
              rows={2}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Potongan per Periode (Rp)</Label>
            <Input
              type="number"
              value={form.weekly_deduction}
              onChange={(e) => setForm(p => ({ ...p, weekly_deduction: e.target.value }))}
              placeholder="100000"
            />
            {form.amount && Number(form.amount) > 0 && (
              <p className="text-xs text-muted-foreground">
                Lunas dalam ~{Math.ceil(Number(form.amount) / (Number(form.weekly_deduction) || 100000))} periode
              </p>
            )}
          </div>

          <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <Checkbox
              id="record_expense"
              checked={form.record_expense}
              onCheckedChange={(v) => setForm(p => ({ ...p, record_expense: !!v }))}
            />
            <Label htmlFor="record_expense" className="text-xs cursor-pointer">
              Catat sebagai pengeluaran kas (FinanceTransaction kategori "Gaji Karyawan")
            </Label>
          </div>

          {error && <p className="text-xs text-destructive font-medium">{error}</p>}

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>Batal</Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Menyimpan..." : "Buat Kasbon"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
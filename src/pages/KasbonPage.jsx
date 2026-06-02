import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useCurrentUser } from "@/lib/useCurrentUser";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, CreditCard, CheckCircle2, XCircle, Clock, Wallet, Minus } from "lucide-react";
import { logActivity } from "@/lib/logActivity";
import { toast } from "sonner";
import { format, addWeeks, nextSaturday } from "date-fns";
import { id } from "date-fns/locale";

const MAX_KASBON = 1000000;
const WEEKLY_DEDUCTION = 100000;

const statusConfig = {
  pending:  { label: "Menunggu",  color: "bg-amber-100 text-amber-700" },
  approved: { label: "Disetujui", color: "bg-green-100 text-green-700" },
  rejected: { label: "Ditolak",   color: "bg-red-100 text-red-700" },
  lunas:    { label: "Lunas",     color: "bg-muted text-muted-foreground" },
};

function getNextSaturdays(totalAmount) {
  const weeks = Math.ceil(totalAmount / WEEKLY_DEDUCTION);
  const dates = [];
  let current = nextSaturday(new Date());
  for (let i = 0; i < weeks; i++) {
    dates.push(addWeeks(current, i));
  }
  return dates;
}

export default function KasbonPage() {
  const { user, role } = useCurrentUser();
  const queryClient = useQueryClient();
  const isAdmin = ["owner", "admin", "manajer"].includes(role);
  // Bagian 2: semua kecuali owner & investor bisa ajukan
  const canApply = !["owner", "investor", "kicked"].includes(role);

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ amount: "", reason: "" });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  const { data: kasbons = [], isLoading } = useQuery({
    queryKey: ["kasbons"],
    queryFn: () => base44.entities.Kasbon.list("-request_date", 200),
  });

  // Keeper hanya lihat miliknya
  const myKasbons = useMemo(() => {
    if (isAdmin) return kasbons;
    return kasbons.filter((k) => k.employee_email === user?.email);
  }, [kasbons, user, isAdmin]);

  // Sisa kasbon aktif keeper
  const activeKasbon = myKasbons.find(
    (k) => k.employee_email === user?.email && (k.status === "approved")
  );
  const sisaAktif = activeKasbon
    ? (activeKasbon.amount || 0) - (activeKasbon.total_paid || 0)
    : 0;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError("");
    const amt = Number(form.amount);
    if (!amt || amt <= 0) { setFormError("Nominal kasbon harus diisi."); return; }
    if (amt > MAX_KASBON) { setFormError(`Maksimal kasbon adalah Rp ${MAX_KASBON.toLocaleString("id-ID")}`); return; }
    if (activeKasbon) { setFormError("Anda masih memiliki kasbon aktif yang belum lunas."); return; }
    setSaving(true);
    await base44.entities.Kasbon.create({
      employee_name: user.full_name || user.email,
      employee_email: user.email,
      amount: amt,
      reason: form.reason,
      request_date: format(new Date(), "yyyy-MM-dd"),
      weekly_deduction: WEEKLY_DEDUCTION,
      total_paid: 0,
      status: "pending",
    });
    queryClient.invalidateQueries({ queryKey: ["kasbons"] });
    setSaving(false);
    setShowForm(false);
    setForm({ amount: "", reason: "" });
  };

  const canApprove = ["kepala_feeder", "manajer", "admin", "owner"].includes(role);

  const handleApprove = async (kasbon) => {
    if (kasbon.employee_email === user?.email) {
      toast.error("Anda tidak bisa menyetujui pengajuan milik sendiri. Minta atasan atau admin untuk menyetujui.");
      return;
    }
    await base44.entities.Kasbon.update(kasbon.id, {
      status: "approved",
      approved_by: user.full_name || user.email,
      approved_date: format(new Date(), "yyyy-MM-dd"),
    });
    await logActivity({
      action: "approve",
      entity_type: "Kasbon",
      entity_id: kasbon.id,
      entity_name: kasbon.employee_name,
      changes_detail: [
        { field: "status", label: "Status Kasbon", old_value: "pending", new_value: "approved" },
      ],
      changes_summary: `Kasbon Rp ${(kasbon.amount || 0).toLocaleString("id-ID")} disetujui`,
    });
    queryClient.invalidateQueries({ queryKey: ["kasbons"] });
  };

  const handleReject = async (kasbon) => {
    if (!confirm("Tolak pengajuan kasbon ini?")) return;
    await base44.entities.Kasbon.update(kasbon.id, { status: "rejected" });
    await logActivity({
      action: "reject",
      entity_type: "Kasbon",
      entity_id: kasbon.id,
      entity_name: kasbon.employee_name,
      changes_detail: [
        { field: "status", label: "Status Kasbon", old_value: "pending", new_value: "rejected" },
      ],
      changes_summary: "Kasbon ditolak",
    });
    queryClient.invalidateQueries({ queryKey: ["kasbons"] });
  };

  const handlePotong = async (kasbon) => {
    const sisa = (kasbon.amount || 0) - (kasbon.total_paid || 0);
    const potongan = Math.min(WEEKLY_DEDUCTION, sisa);
    const newPaid = (kasbon.total_paid || 0) + potongan;
    const lunas = newPaid >= kasbon.amount;
    await base44.entities.Kasbon.update(kasbon.id, {
      total_paid: newPaid,
      status: lunas ? "lunas" : "approved",
    });
    queryClient.invalidateQueries({ queryKey: ["kasbons"] });
  };

  const schedule = form.amount ? getNextSaturdays(Number(form.amount)) : [];

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-heading font-bold">Kasbon Keeper</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Maksimal Rp {MAX_KASBON.toLocaleString("id-ID")} · Dipotong Rp {WEEKLY_DEDUCTION.toLocaleString("id-ID")}/minggu setiap Sabtu
          </p>
        </div>
        {canApply && (
          <Button onClick={() => setShowForm(true)} disabled={!!activeKasbon}>
            <Plus className="w-4 h-4 mr-2" />
            Ajukan Kasbon
          </Button>
        )}
      </div>

      {/* Info box karyawan */}
      {canApply && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Card className="p-4 bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
            <div className="flex items-center gap-3">
              <Wallet className="w-8 h-8 text-primary opacity-70" />
              <div>
                <p className="text-xs text-muted-foreground">Sisa Kasbon Aktif</p>
                <p className="text-xl font-heading font-bold text-primary">
                  {activeKasbon ? `Rp ${sisaAktif.toLocaleString("id-ID")}` : "—"}
                </p>
              </div>
            </div>
          </Card>
          <Card className="p-4 bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200">
            <div className="flex items-center gap-3">
              <Minus className="w-8 h-8 text-amber-500 opacity-70" />
              <div>
                <p className="text-xs text-muted-foreground">Potongan/Minggu</p>
                <p className="text-xl font-heading font-bold text-amber-700">
                  Rp {WEEKLY_DEDUCTION.toLocaleString("id-ID")}
                </p>
                <p className="text-[11px] text-amber-600">Setiap hari Sabtu</p>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* List kasbon */}
      <Card className="overflow-hidden">
        <div className="p-4 border-b bg-muted/30">
          <h2 className="font-semibold text-sm flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-primary" />
            {isAdmin ? "Semua Pengajuan Kasbon" : "Riwayat Kasbon Saya"}
          </h2>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
          </div>
        ) : myKasbons.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground text-sm">
            Belum ada pengajuan kasbon
          </div>
        ) : (
          <div className="divide-y">
            {myKasbons.map((k) => {
              const sisa = (k.amount || 0) - (k.total_paid || 0);
              const pct = k.amount ? Math.round(((k.total_paid || 0) / k.amount) * 100) : 0;
              const conf = statusConfig[k.status] || statusConfig.pending;
              return (
                <div key={k.id} className="p-4 hover:bg-muted/20 transition-colors">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="font-semibold text-sm">{k.employee_name}</span>
                        <Badge className={`text-[11px] ${conf.color}`}>{conf.label}</Badge>
                      </div>
                      <p className="text-lg font-bold text-primary">Rp {(k.amount || 0).toLocaleString("id-ID")}</p>
                      {k.reason && <p className="text-xs text-muted-foreground mt-0.5">"{k.reason}"</p>}
                      <p className="text-xs text-muted-foreground mt-1">
                        Diajukan: {k.request_date ? format(new Date(k.request_date), "d MMM yyyy", { locale: id }) : "—"}
                        {k.approved_date && ` · Disetujui: ${format(new Date(k.approved_date), "d MMM yyyy", { locale: id })}`}
                      </p>

                      {k.status === "approved" && (
                        <div className="mt-2">
                          <div className="flex justify-between text-xs text-muted-foreground mb-1">
                            <span>Terbayar: Rp {(k.total_paid || 0).toLocaleString("id-ID")}</span>
                            <span>Sisa: Rp {sisa.toLocaleString("id-ID")} ({pct}%)</span>
                          </div>
                          <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                            <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      )}
                    </div>

                    {isAdmin && (
                      <div className="flex gap-2 flex-shrink-0">
                        {k.status === "pending" && (
                          <>
                            <Button size="sm" onClick={() => handleApprove(k)} className="gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Setujui
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => handleReject(k)} className="gap-1 text-destructive border-destructive hover:bg-destructive/10">
                              <XCircle className="w-3.5 h-3.5" /> Tolak
                            </Button>
                          </>
                        )}
                        {k.status === "approved" && sisa > 0 && (
                          <Button size="sm" variant="outline" onClick={() => handlePotong(k)} className="gap-1">
                            <Minus className="w-3.5 h-3.5" />
                            Potong Sabtu Ini
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Form pengajuan kasbon */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-heading">Ajukan Kasbon</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 mt-2">
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 space-y-1">
              <p>• Maksimal kasbon: <strong>Rp {MAX_KASBON.toLocaleString("id-ID")}</strong></p>
              <p>• Dipotong: <strong>Rp {WEEKLY_DEDUCTION.toLocaleString("id-ID")}/minggu</strong> setiap Sabtu</p>
            </div>

            <div className="space-y-1.5">
              <Label>Nominal Kasbon (Rp) *</Label>
              <Input
                type="number"
                value={form.amount}
                onChange={(e) => setForm(p => ({ ...p, amount: e.target.value }))}
                placeholder="Contoh: 500000"
                max={MAX_KASBON}
                required
              />
              {form.amount && Number(form.amount) > 0 && Number(form.amount) <= MAX_KASBON && (
                <p className="text-xs text-muted-foreground">
                  Lunas dalam <strong>{Math.ceil(Number(form.amount) / WEEKLY_DEDUCTION)} minggu</strong>
                  {schedule.length > 0 && ` · Selesai sekitar ${format(schedule[schedule.length - 1], "d MMM yyyy", { locale: id })}`}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label>Keperluan / Alasan</Label>
              <Textarea
                value={form.reason}
                onChange={(e) => setForm(p => ({ ...p, reason: e.target.value }))}
                placeholder="Jelaskan keperluan kasbon..."
                rows={3}
              />
            </div>

            {formError && <p className="text-xs text-destructive font-medium">{formError}</p>}

            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Batal</Button>
              <Button type="submit" disabled={saving}>
                {saving ? "Mengajukan..." : "Ajukan Kasbon"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
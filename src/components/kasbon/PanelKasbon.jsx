import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useActiveUsers } from "@/hooks/useActiveUsers";
import { base44 } from "@/api/base44Client";
import { useTestMode } from "@/lib/useTestMode";
import { useCurrentUser } from "@/lib/useCurrentUser";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, CreditCard, Wallet, TrendingDown, Users } from "lucide-react";
import { logActivity } from "@/lib/logActivity";
import { toast } from "sonner";
import { format } from "date-fns";
import KasbonForm from "@/components/kasbon/KasbonForm";
import KasbonCard from "@/components/kasbon/KasbonCard";
import DeductionDialog from "@/components/kasbon/DeductionDialog";
import PageHeader from "@/components/common/PageHeader";
import { WalletArt } from "@/components/common/Illustration";
import { rupiah } from "@/lib/rupiah";

const MAX_KASBON = 1000000;
const WEEKLY_DEDUCTION = 100000;


/**
 * PanelKasbon — isi layar Kasbon, dipakai DUA pintu sekaligus:
 * halaman /kasbon dan tab "Kasbon" di Penggajian Karyawan.
 *
 * ── Kenapa dijadikan satu ───────────────────────────────────────────
 *
 * Sampai 30-09-2026 kedua pintu itu punya implementasinya SENDIRI-SENDIRI,
 * dan keduanya menulis ke tabel Kasbon dengan aturan yang berbeda:
 *
 *                        halaman /kasbon          tab di Penggajian
 *   pinjaman kedua       DILARANG selama          boleh, asal total
 *                        masih ada yang aktif     <= Rp 1.000.000
 *   potongan per minggu  tetap Rp 100.000         amount / (1|2|4),
 *                                                 jadi rencana "1x"
 *                                                 memotong SELURUH
 *                                                 pinjaman sekaligus
 *
 * Orang yang sama mengajukan lewat pintu berbeda mendapat jawaban
 * berbeda — dan potongannya bisa berbeda sepuluh kali lipat. Kasbon
 * Rp 1.000.000 dengan rencana "1x" memotong Rp 1.000.000 dari gaji satu
 * minggu; gaji mingguan seluruh tim di peternakan ini sekitar Rp 910.000.
 * `hitungGaji` memang menjepit potongan ke sisa utang
 * (`Math.min(weekly_deduction, sisaKasbon)`) tetapi TIDAK ke besar gajinya.
 *
 * Diperiksa di basis data 30-09-2026: hanya ada 2 baris Kasbon, keduanya
 * `weekly_deduction` Rp 100.000 tanpa `installment_plan` — keduanya lahir
 * dari halaman /kasbon. Jalur satunya belum pernah dipakai, jadi tidak ada
 * data yang perlu dibetulkan. Ditutup sebelum dipakai, bukan sesudah.
 *
 * Aturan yang dipertahankan adalah aturan halaman /kasbon: yang sudah
 * teruji dipakai, dan yang lebih aman dari keduanya.
 *
 * Rencana cicilan 1x/2x/4x dari jalur yang dibuang TIDAK dipindahkan ke
 * sini. Ia belum pernah dipakai sekali pun, dan bentuknya sekarang bisa
 * menghabiskan gaji satu minggu. Kalau memang diperlukan, ia layak
 * dirancang ulang dengan batas terhadap gaji — bukan diselundupkan ikut
 * penyatuan ini.
 *
 * @param {boolean} tanpaKepala true bila dipakai sebagai tab — kepala
 *   halamannya dibuang karena halaman induknya sudah punya satu.
 */
export default function PanelKasbon({ tanpaKepala = false }) {
  const { user, role } = useCurrentUser();
  const qc = useQueryClient();
  const isAdmin = ["owner", "admin", "manajer"].includes(role);
  const isOwner = role === "owner";
  const canApply = !["owner", "investor", "kicked"].includes(role);

  const [showAdminForm, setShowAdminForm] = useState(false);
  const { testModeTag } = useTestMode();
  const [showApplyForm, setShowApplyForm] = useState(false);
  const [deductTarget, setDeductTarget] = useState(null);
  const [rejectTarget, setRejectTarget] = useState(null);
  const [rejectReason, setRejectReason] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");

  // Employee self-apply form state
  const [applyForm, setApplyForm] = useState({ amount: "", reason: "" });
  const [savingApply, setSavingApply] = useState(false);

  const { data: kasbons = [], isLoading } = useQuery({
    queryKey: ["kasbons"],
    queryFn: () => base44.entities.Kasbon.list("-request_date", 200),
  });

  const { data: users = [], isLoading: usersLoading } = useActiveUsers({ enabled: isAdmin });

  // Role-based filtering
  const visibleKasbons = useMemo(() => {
    let list = isAdmin ? kasbons : kasbons.filter((k) => k.employee_email === user?.email);
    if (filterStatus !== "all") list = list.filter((k) => k.status === filterStatus);
    return list;
  }, [kasbons, user, isAdmin, filterStatus]);

  // Stats
  const stats = useMemo(() => {
    const active = kasbons.filter(k => k.status === "approved");
    const totalOutstanding = active.reduce((s, k) => s + Math.max(0, (k.amount || 0) - (k.total_paid || 0)), 0);
    const totalPaid = kasbons.reduce((s, k) => s + (k.total_paid || 0), 0);
    const pendingCount = kasbons.filter(k => k.status === "pending").length;
    return { activeCount: active.length, totalOutstanding, totalPaid, pendingCount };
  }, [kasbons]);

  // Employee's active kasbon
  const activeKasbon = kasbons.find(k => k.employee_email === user?.email && k.status === "approved");
  const mySisa = activeKasbon ? (activeKasbon.amount || 0) - (activeKasbon.total_paid || 0) : 0;

  const handleApprove = async (kasbon) => {
    if (kasbon.employee_email === user?.email) {
      toast.error("Anda tidak bisa menyetujui pengajuan milik sendiri.");
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
      changes_summary: `Kasbon ${rupiah(kasbon.amount)} disetujui`,
    });
    qc.invalidateQueries({ queryKey: ["kasbons"] });
    toast.success("Kasbon disetujui");
  };

  const handleReject = (kasbon) => {
    setRejectTarget(kasbon);
    setRejectReason("");
  };

  const confirmReject = async () => {
    if (!rejectTarget) return;
    if (!rejectReason.trim()) { toast.error("Alasan penolakan wajib diisi"); return; }
    try {
      await base44.entities.Kasbon.update(rejectTarget.id, {
        status: "rejected",
        rejection_reason: rejectReason.trim(),
      });
      await logActivity({
        action: "reject",
        entity_type: "Kasbon",
        entity_id: rejectTarget.id,
        entity_name: rejectTarget.employee_name,
        changes_summary: `Kasbon ditolak: ${rejectReason.trim()}`,
      });
      qc.invalidateQueries({ queryKey: ["kasbons"] });
      toast.success("Kasbon ditolak");
      setRejectTarget(null);
      setRejectReason("");
    } catch (err) {
      toast.error(err.message || "Gagal menolak kasbon");
    }
  };

  const handleApplySubmit = async (e) => {
    e.preventDefault();
    const amt = Number(applyForm.amount);
    if (!amt || amt <= 0) { toast.error("Nominal kasbon harus diisi."); return; }
    if (amt > MAX_KASBON) { toast.error(`Maksimal kasbon ${rupiah(MAX_KASBON)}`); return; }
    if (activeKasbon) { toast.error("Anda masih memiliki kasbon aktif yang belum lunas."); return; }
    setSavingApply(true);
    try {
      await base44.entities.Kasbon.create({
        employee_name: user.full_name || user.email,
        employee_email: user.email,
        amount: amt,
        reason: applyForm.reason || "-",
        request_date: format(new Date(), "yyyy-MM-dd"),
        weekly_deduction: WEEKLY_DEDUCTION,
        total_paid: 0,
        status: "pending",
        deduction_log: [],
        ...testModeTag,
      });
      await logActivity({
        action: "create",
        entity_type: "Kasbon",
        entity_name: user.full_name || user.email,
        changes_summary: `Pengajuan kasbon ${rupiah(amt)} (pending)`,
      });
      qc.invalidateQueries({ queryKey: ["kasbons"] });
      toast.success("Pengajuan kasbon dikirim (menunggu persetujuan)");
      setShowApplyForm(false);
      setApplyForm({ amount: "", reason: "" });
    } catch (err) {
      toast.error(err.message || "Gagal mengajukan kasbon");
    }
    setSavingApply(false);
  };

  const tombolAksi = (
    <>
      {isAdmin && (
        <Button onClick={() => setShowAdminForm(true)} className="gap-2">
          <Plus className="w-4 h-4" /> Kasbon Baru
        </Button>
      )}
      {canApply && (
        <Button variant="outline" onClick={() => setShowApplyForm(true)} disabled={!!activeKasbon} className="gap-2">
          <Plus className="w-4 h-4" /> Ajukan Kasbon
        </Button>
      )}
    </>
  );

  return (
    <div className={tanpaKepala ? "space-y-6" : "space-y-6 max-w-4xl mx-auto"}>
      {/*
        Tombolnya disusun SEKALI lalu dipakai di dua tempat.
        Semula ia hidup di dalam `actions` PageHeader — dan begitu kepala
        halaman disembunyikan untuk mode tab, "Kasbon Baru" dan "Ajukan
        Kasbon" ikut hilang bersamanya. Layar kasbon tanpa tombol mengajukan
        kasbon bukan layar kasbon.
      */}
      {!tanpaKepala ? (
        <PageHeader
          title="Kasbon Karyawan"
          subtitle={isAdmin ? "Kelola kasbon semua karyawan" : "Riwayat kasbon Anda"}
          icon={Wallet}
          art={<WalletArt size="md" />}
          actions={tombolAksi}
        />
      ) : (
        (isAdmin || canApply) && (
          <div className="flex flex-wrap items-center gap-2">{tombolAksi}</div>
        )
      )}

      {/* Stats */}
      {isAdmin ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Card className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center">
              <CreditCard className="w-5 h-5 text-green-700" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Kasbon Aktif</p>
              <p className="font-bold">{stats.activeCount}</p>
            </div>
          </Card>
          <Card className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center">
              <TrendingDown className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Outstanding</p>
              <p className="font-bold text-red-600">{rupiah(stats.totalOutstanding)}</p>
            </div>
          </Card>
          <Card className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
              <Wallet className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Terbayar</p>
              <p className="font-bold text-blue-600">{rupiah(stats.totalPaid)}</p>
            </div>
          </Card>
          <Card className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
              <Users className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Menunggu Approval</p>
              <p className="font-bold">{stats.pendingCount}</p>
            </div>
          </Card>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Card className="p-4 bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
            <div className="flex items-center gap-3">
              <Wallet className="w-8 h-8 text-primary opacity-70" />
              <div>
                <p className="text-xs text-muted-foreground">Sisa Kasbon Aktif</p>
                <p className="text-xl font-heading font-bold text-primary">
                  {activeKasbon ? rupiah(mySisa) : "—"}
                </p>
              </div>
            </div>
          </Card>
          <Card className="p-4 bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200">
            <div className="flex items-center gap-3">
              <TrendingDown className="w-8 h-8 text-amber-500 opacity-70" />
              <div>
                <p className="text-xs text-muted-foreground">Potongan/Periode</p>
                <p className="text-xl font-heading font-bold text-amber-700">
                  {activeKasbon ? rupiah(activeKasbon.weekly_deduction) : "—"}
                </p>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Filter (admin) */}
      {isAdmin && (
        <div className="flex gap-2 items-center">
          {["all", "pending", "approved", "lunas", "rejected"].map(s => (
            <Button
              key={s}
              size="sm"
              variant={filterStatus === s ? "default" : "outline"}
              onClick={() => setFilterStatus(s)}
            >
              {s === "all" ? "Semua" : s === "pending" ? "Menunggu" : s === "approved" ? "Aktif" : s === "lunas" ? "Lunas" : "Ditolak"}
            </Button>
          ))}
        </div>
      )}

      {/* List */}
      <Card className="overflow-hidden">
        <div className="p-4 border-b bg-muted/30">
          <h2 className="font-semibold text-sm flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-primary" />
            {isAdmin ? "Semua Kasbon" : "Riwayat Kasbon Saya"}
          </h2>
        </div>
        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
          </div>
        ) : visibleKasbons.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground text-sm">
            <CreditCard className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p>Belum ada kasbon</p>
          </div>
        ) : (
          <div className="divide-y">
            {visibleKasbons.map(k => (
              <KasbonCard
                key={k.id}
                kasbon={k}
                isAdmin={isAdmin}
                isOwner={isOwner}
                onApprove={handleApprove}
                onReject={handleReject}
                onDeduct={setDeductTarget}
                onPayoff={(kasbon) => setDeductTarget({ ...kasbon, _mode: "cash" })}
              />
            ))}
          </div>
        )}
      </Card>

      {/* Admin create form */}
      {showAdminForm && (
        <KasbonForm users={users} usersLoading={usersLoading} onClose={() => setShowAdminForm(false)} />
      )}

      {/* Deduction dialog */}
      {deductTarget && (
        <DeductionDialog
          kasbon={deductTarget}
          mode={deductTarget._mode === "cash" ? "cash" : "manual"}
          onClose={() => {
            setDeductTarget(null);
            qc.invalidateQueries({ queryKey: ["kasbons"] });
          }}
        />
      )}

      {/* Employee apply form */}
      <Dialog open={showApplyForm} onOpenChange={setShowApplyForm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-heading">Ajukan Kasbon</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleApplySubmit} className="space-y-4 mt-2">
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 space-y-1">
              <p>• Maksimal kasbon: <strong>{rupiah(MAX_KASBON)}</strong></p>
              <p>• Dipotong: <strong>{rupiah(WEEKLY_DEDUCTION)}/periode</strong> dari gaji</p>
              <p>• Pengajuan Anda akan menunggu persetujuan admin</p>
            </div>
            <div className="space-y-1.5">
              <Label>Nominal Kasbon (Rp) *</Label>
              <Input
                type="number"
                value={applyForm.amount}
                onChange={(e) => setApplyForm(p => ({ ...p, amount: e.target.value }))}
                placeholder="Contoh: 500000"
                max={MAX_KASBON}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label>Keperluan / Alasan</Label>
              <Textarea
                value={applyForm.reason}
                onChange={(e) => setApplyForm(p => ({ ...p, reason: e.target.value }))}
                placeholder="Jelaskan keperluan kasbon..."
                rows={3}
              />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => setShowApplyForm(false)}>Batal</Button>
              <Button type="submit" disabled={savingApply}>
                {savingApply ? "Mengajukan..." : "Ajukan Kasbon"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Reject dialog (owner only) */}
      <Dialog open={!!rejectTarget} onOpenChange={(o) => !o && setRejectTarget(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Tolak Pengajuan Kasbon</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            <p className="text-sm text-muted-foreground">
              Tolak pengajuan <strong>{rejectTarget?.employee_name}</strong> ({rupiah(rejectTarget?.amount || 0)})?
            </p>
            <div className="space-y-1.5">
              <Label>Alasan penolakan (wajib)</Label>
              <Textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Alasan akan ditampilkan ke karyawan"
                rows={3}
              />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => setRejectTarget(null)}>Batal</Button>
              <Button type="button" variant="destructive" onClick={confirmReject}>Tolak Kasbon</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
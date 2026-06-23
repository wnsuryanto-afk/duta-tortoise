import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Wallet, Plus, Minus, Scale, Clock, CheckCircle2, XCircle, Banknote, TrendingDown } from "lucide-react";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { useCurrentUser } from "@/lib/useCurrentUser";
import AccessDenied from "@/components/common/AccessDenied";
import { toast } from "sonner";
import TopUpForm from "@/components/pettycash/TopUpForm";
import PemakaianForm from "@/components/pettycash/PemakaianForm";
import RekonsiliasiForm from "@/components/pettycash/RekonsiliasiForm";
import LedgerHistory from "@/components/pettycash/LedgerHistory";

const REQUEST_CATEGORIES = ["Obat", "Vitamin", "Pakan", "Peralatan Kandang", "Transportasi", "Lainnya"];

const STATUS_CONFIG = {
  diajukan:  { label: "Diajukan",  color: "bg-amber-100 text-amber-700" },
  disetujui: { label: "Disetujui", color: "bg-blue-100 text-blue-700" },
  dicairkan: { label: "Dicairkan", color: "bg-green-100 text-green-700" },
  ditolak:   { label: "Ditolak",   color: "bg-red-100 text-red-700" },
};

function formatRp(n) {
  return "Rp " + Number(n || 0).toLocaleString("id-ID");
}

function RequestForm({ user, role, users, onClose, onSaved }) {
  const isKepalaFeeder = role === "kepala_feeder";
  const [form, setForm] = useState({
    keperluan: "", amount: "", category: "", need_date: "", notes: "",
    feeder_email: isKepalaFeeder ? user?.email : "",
    feeder_name: isKepalaFeeder ? (user?.full_name || user?.email) : "",
  });
  const [saving, setSaving] = useState(false);
  const kepalaFeeders = (users || []).filter(u => u.role === "kepala_feeder");

  const handleSave = async () => {
    if (!form.keperluan || !form.amount || !form.category || !form.need_date) {
      toast.error("Isi semua field wajib"); return;
    }
    setSaving(true);
    await base44.entities.PettyCashRequest.create({
      requester_email: form.feeder_email || user?.email,
      requester_name: form.feeder_name || user?.full_name || user?.email,
      reason: form.keperluan, amount_requested: Number(form.amount),
      category: form.category, need_date: form.need_date, notes: form.notes,
      status: "diajukan", request_date: new Date().toISOString().split("T")[0],
    });
    setSaving(false); onSaved(); onClose();
    toast.success("Request kas kecil berhasil diajukan");
  };

  return (
    <div className="space-y-3">
      {!isKepalaFeeder && kepalaFeeders.length > 0 && (
        <div>
          <Label className="text-xs">Kepala Feeder *</Label>
          <Select value={form.feeder_email} onValueChange={v => {
            const kf = kepalaFeeders.find(u => u.email === v);
            setForm(f => ({ ...f, feeder_email: v, feeder_name: kf?.full_name || v }));
          }}>
            <SelectTrigger className="mt-1"><SelectValue placeholder="Pilih Kepala Feeder..." /></SelectTrigger>
            <SelectContent>
              {kepalaFeeders.map(u => <SelectItem key={u.email} value={u.email}>{u.full_name || u.email}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      )}
      <div><Label className="text-xs">Keperluan *</Label><Input value={form.keperluan} onChange={e => setForm(f => ({ ...f, keperluan: e.target.value }))} placeholder="Jelaskan keperluan..." className="mt-1" /></div>
      <div><Label className="text-xs">Nominal (Rp) *</Label><Input type="number" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} placeholder="0" className="mt-1" /></div>
      <div>
        <Label className="text-xs">Kategori *</Label>
        <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
          <SelectTrigger className="mt-1"><SelectValue placeholder="Pilih kategori..." /></SelectTrigger>
          <SelectContent>{REQUEST_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div><Label className="text-xs">Tanggal Butuh *</Label><Input type="date" value={form.need_date} onChange={e => setForm(f => ({ ...f, need_date: e.target.value }))} className="mt-1" /></div>
      <div><Label className="text-xs">Keterangan Tambahan</Label><Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Opsional..." className="mt-1 resize-none h-16" /></div>
      <div className="flex gap-2 pt-1">
        <Button variant="outline" className="flex-1" onClick={onClose}>Batal</Button>
        <Button className="flex-1" onClick={handleSave} disabled={saving || !form.keperluan || !form.amount || !form.category || !form.need_date}>{saving ? "Mengirim..." : "Ajukan Request"}</Button>
      </div>
    </div>
  );
}

export default function PettyCashPage() {
  const qc = useQueryClient();
  const { role, user } = useCurrentUser();

  const { data: settingsArr = [] } = useQuery({
    queryKey: ["company-settings"],
    queryFn: () => base44.entities.CompanySettings.filter({ setting_key: "main" }),
    staleTime: 5 * 60 * 1000,
  });
  const settings = settingsArr[0];

  // Hak akses baca dari CompanySettings, fallback ke default jika belum ada
  const accessRoles  = settings?.petty_cash_access_roles  || ["owner", "manajer", "admin", "kepala_feeder"];
  const recordRoles  = settings?.petty_cash_record_roles  || ["owner", "manajer", "admin", "kepala_feeder"];
  const approveRoles = settings?.petty_cash_approve_roles || ["owner", "manajer"];

  const canAccessModule  = accessRoles.includes(role);
  const isOwnerAdminManajer = recordRoles.includes(role);  // bisa lihat ledger & catat pemakaian
  const canApproveRequest   = approveRoles.includes(role);
  const canReconcile        = approveRoles.includes(role);
  const isFeeder = role === "kepala_feeder";

  const { data: ledger = [], isLoading: ledgerLoading } = useQuery({
    queryKey: ["petty-cash-ledger"],
    queryFn: () => base44.entities.PettyCashLedger.list("-entry_date", 200),
    staleTime: 30 * 1000,
  });

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ["petty-cash-requests"],
    queryFn: () => base44.entities.PettyCashRequest.list("-request_date", 200),
  });

  const { data: users = [] } = useQuery({
    queryKey: ["users-all"],
    queryFn: () => base44.entities.User.list(),
  });

  const [showTopUp, setShowTopUp] = useState(false);
  const [showPemakaian, setShowPemakaian] = useState(false);
  const [showRekonsiliasi, setShowRekonsiliasi] = useState(false);
  const [showRequestForm, setShowRequestForm] = useState(false);

  const currentSaldo = ledger.length > 0 ? (ledger[0].balance_after || 0) : 0;
  const isNeg = currentSaldo <= 0;

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["petty-cash-ledger"] });
    qc.invalidateQueries({ queryKey: ["petty-cash-requests"] });
    qc.invalidateQueries({ queryKey: ["finance-transactions"] });
  };

  // Disburse: update status only, NO FinanceTransaction (cegah dobel — pemakaian resmi lewat ledger)
  const handleDisburse = async (req) => {
    await base44.entities.PettyCashRequest.update(req.id, {
      status: "dicairkan",
      disbursement_date: new Date().toISOString().split("T")[0],
    });
    invalidate();
    toast.success("Dicairkan. Catat sebagai pemakaian di Kas Kecil untuk masuk Laba Rugi.");
  };

  const handleApprove = async (req, approved) => {
    if (req.requester_email === user?.email) {
      toast.error("Anda tidak bisa menyetujui pengajuan milik sendiri."); return;
    }
    await base44.entities.PettyCashRequest.update(req.id, {
      status: approved ? "disetujui" : "ditolak",
      approved_by: user?.full_name || user?.email,
      approved_date: new Date().toISOString().split("T")[0],
    });
    invalidate();
    toast.success(approved ? "Request disetujui" : "Request ditolak");
  };

  if (!canAccessModule) return <AccessDenied />;

  const activeRequests = requests.filter(r => ["diajukan", "disetujui"].includes(r.status));
  const historyRequests = requests.filter(r => ["dicairkan", "ditolak"].includes(r.status));
  const waitingCount = requests.filter(r => r.status === "diajukan").length;

  const RequestCard = ({ req }) => {
    const sc = STATUS_CONFIG[req.status] || STATUS_CONFIG.diajukan;
    return (
      <Card className="p-4">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="font-semibold text-sm">{req.requester_name}</span>
              <Badge className={sc.color}>{sc.label}</Badge>
              {req.category && <Badge variant="outline" className="text-xs">{req.category}</Badge>}
            </div>
            <p className="text-lg font-bold text-primary">{formatRp(req.amount_requested)}</p>
            <p className="text-sm text-muted-foreground mt-1">{req.reason}</p>
          </div>
          {canApproveRequest && (
            <div className="flex flex-col gap-1.5">
              {req.status === "diajukan" && (
                <>
                  <Button size="sm" className="gap-1.5 bg-green-600 hover:bg-green-700" onClick={() => handleApprove(req, true)}><CheckCircle2 className="w-3.5 h-3.5" /> Setujui</Button>
                  <Button size="sm" variant="outline" className="gap-1.5 text-red-600 border-red-200" onClick={() => handleApprove(req, false)}><XCircle className="w-3.5 h-3.5" /> Tolak</Button>
                </>
              )}
              {req.status === "disetujui" && (
                <Button size="sm" className="gap-1.5" onClick={() => handleDisburse(req)}><Banknote className="w-3.5 h-3.5" /> Cairkan</Button>
              )}
            </div>
          )}
        </div>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-heading font-bold flex items-center gap-2">
          <Wallet className="w-6 h-6 text-primary" /> Kas Kecil
        </h1>
        <p className="text-muted-foreground text-sm mt-1">Saldo kas kecil operasional & request dana</p>
      </div>

      {/* ── SALDO PANEL ── */}
      {isOwnerAdminManajer && (
        <Card className={`p-5 ${isNeg ? "border-red-300 bg-red-50" : "border-green-200 bg-green-50/50"}`}>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Saldo Kas Kecil Saat Ini</p>
              <p className={`text-4xl font-bold mt-1 ${isNeg ? "text-red-600" : "text-green-700"}`}>
                {formatRp(currentSaldo)}
              </p>
              {isNeg && <p className="text-xs text-red-500 mt-0.5">⚠️ Saldo minus — perlu top up</p>}
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button onClick={() => setShowTopUp(true)} className="gap-2 bg-green-600 hover:bg-green-700">
                <Plus className="w-4 h-4" /> Isi Saldo
              </Button>
              <Button onClick={() => setShowPemakaian(true)} variant="destructive" className="gap-2">
                <Minus className="w-4 h-4" /> Catat Pemakaian
              </Button>
              {canReconcile && (
                <Button onClick={() => setShowRekonsiliasi(true)} variant="outline" className="gap-2">
                  <Scale className="w-4 h-4" /> Rekonsiliasi
                </Button>
              )}
            </div>
          </div>
        </Card>
      )}

      {/* ── TABS ── */}
      <Tabs defaultValue={isOwnerAdminManajer ? "ledger" : "request"}>
        <TabsList>
          {isOwnerAdminManajer && <TabsTrigger value="ledger">Kas Kecil (Ledger)</TabsTrigger>}
          <TabsTrigger value="request">
            Request Dana
            {waitingCount > 0 && <span className="ml-1.5 bg-red-500 text-white text-[10px] rounded-full px-1.5 py-0.5 font-bold">{waitingCount}</span>}
          </TabsTrigger>
        </TabsList>

        {/* LEDGER TAB */}
        {isOwnerAdminManajer && (
          <TabsContent value="ledger" className="mt-4">
            {ledgerLoading ? (
              <div className="text-center py-8 text-muted-foreground">Memuat...</div>
            ) : ledger.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-xl">
                <Wallet className="w-10 h-10 mx-auto mb-3 opacity-20" />
                <p className="font-medium">Belum ada transaksi kas kecil</p>
                <p className="text-sm mt-1">Klik "Isi Saldo" untuk memulai</p>
              </div>
            ) : (
              <LedgerHistory ledger={ledger} />
            )}
          </TabsContent>
        )}

        {/* REQUEST TAB */}
        <TabsContent value="request" className="mt-4 space-y-3">
          {(isOwnerAdminManajer || isFeeder) && (
            <div className="flex justify-end">
              <Button onClick={() => setShowRequestForm(true)} variant="outline" className="gap-2">
                <Plus className="w-4 h-4" /> Request Kas Kecil
              </Button>
            </div>
          )}
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Memuat...</div>
          ) : (
            <>
              {activeRequests.length === 0 && historyRequests.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground">
                  <Clock className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p>Belum ada request</p>
                </div>
              ) : (
                <>
                  {activeRequests.length > 0 && (
                    <div className="space-y-3">
                      <p className="text-xs font-semibold text-muted-foreground uppercase">Aktif ({activeRequests.length})</p>
                      {activeRequests.map(req => <RequestCard key={req.id} req={req} />)}
                    </div>
                  )}
                  {historyRequests.length > 0 && (
                    <div className="space-y-3">
                      <p className="text-xs font-semibold text-muted-foreground uppercase">Riwayat</p>
                      {historyRequests.map(req => <RequestCard key={req.id} req={req} />)}
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </TabsContent>
      </Tabs>

      {/* ── DIALOGS ── */}
      <Dialog open={showTopUp} onOpenChange={setShowTopUp}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Plus className="w-5 h-5 text-green-600" /> Isi Saldo (Top Up)</DialogTitle></DialogHeader>
          <TopUpForm currentSaldo={currentSaldo} user={user} role={role} onClose={() => setShowTopUp(false)} onSaved={invalidate} />
        </DialogContent>
      </Dialog>

      <Dialog open={showPemakaian} onOpenChange={setShowPemakaian}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Minus className="w-5 h-5 text-red-600" /> Catat Pemakaian</DialogTitle></DialogHeader>
          <PemakaianForm currentSaldo={currentSaldo} user={user} role={role} onClose={() => setShowPemakaian(false)} onSaved={invalidate} />
        </DialogContent>
      </Dialog>

      <Dialog open={showRekonsiliasi} onOpenChange={setShowRekonsiliasi}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Scale className="w-5 h-5 text-primary" /> Rekonsiliasi Saldo</DialogTitle></DialogHeader>
          <RekonsiliasiForm currentSaldo={currentSaldo} user={user} role={role} onClose={() => setShowRekonsiliasi(false)} onSaved={invalidate} />
        </DialogContent>
      </Dialog>

      <Dialog open={showRequestForm} onOpenChange={setShowRequestForm}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Wallet className="w-5 h-5 text-primary" /> Request Kas Kecil</DialogTitle></DialogHeader>
          <RequestForm user={user} role={role} users={users} onClose={() => setShowRequestForm(false)} onSaved={invalidate} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
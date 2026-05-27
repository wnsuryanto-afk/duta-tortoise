import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Wallet, Plus, TrendingDown, CheckCircle2, Clock, XCircle, Banknote } from "lucide-react";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { useCurrentUser } from "@/lib/useCurrentUser";
import { canAccessPettyCash } from "@/lib/permissions";
import AccessDenied from "@/components/common/AccessDenied";
import { toast } from "sonner";

const REQUEST_CATEGORIES = ["Obat", "Vitamin", "Pakan", "Peralatan Kandang", "Transportasi", "Lainnya"];

const STATUS_CONFIG = {
  diajukan:  { label: "Diajukan",  color: "bg-amber-100 text-amber-700" },
  disetujui: { label: "Disetujui", color: "bg-blue-100 text-blue-700" },
  dicairkan: { label: "Dicairkan", color: "bg-green-100 text-green-700" },
  ditolak:   { label: "Ditolak",   color: "bg-red-100 text-red-700" },
};

const CAT_TO_FINANCE = {
  Obat: "obat_perawatan",
  Vitamin: "vitamin_suplemen",
  Pakan: "pakan",
  "Peralatan Kandang": "lainnya",
  Transportasi: "lainnya",
  Lainnya: "lainnya",
};

function formatRp(n) {
  return "Rp " + Number(n || 0).toLocaleString("id-ID");
}

function RequestForm({ user, role, users, onClose, onSaved }) {
  const isKepalaFeeder = role === "kepala_feeder";
  const [form, setForm] = useState({
    keperluan: "",
    amount: "",
    category: "",
    need_date: "",
    notes: "",
    feeder_email: isKepalaFeeder ? user?.email : "",
    feeder_name: isKepalaFeeder ? (user?.full_name || user?.email) : "",
  });
  const [saving, setSaving] = useState(false);

  const kepalaFeeders = (users || []).filter(u => u.role === "kepala_feeder");

  const handleSave = async () => {
    if (!form.keperluan || !form.amount || !form.category || !form.need_date) {
      toast.error("Isi semua field wajib");
      return;
    }
    setSaving(true);
    await base44.entities.PettyCashRequest.create({
      requester_email: form.feeder_email || user?.email,
      requester_name: form.feeder_name || user?.full_name || user?.email,
      reason: form.keperluan,
      amount_requested: Number(form.amount),
      category: form.category,
      need_date: form.need_date,
      notes: form.notes,
      status: "diajukan",
      request_date: new Date().toISOString().split("T")[0],
    });
    setSaving(false);
    onSaved();
    onClose();
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
      <div>
        <Label className="text-xs">Keperluan *</Label>
        <Input value={form.keperluan} onChange={e => setForm(f => ({ ...f, keperluan: e.target.value }))} placeholder="Jelaskan keperluan..." className="mt-1" />
      </div>
      <div>
        <Label className="text-xs">Nominal (Rp) *</Label>
        <Input type="number" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} placeholder="0" className="mt-1" />
      </div>
      <div>
        <Label className="text-xs">Kategori *</Label>
        <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
          <SelectTrigger className="mt-1"><SelectValue placeholder="Pilih kategori..." /></SelectTrigger>
          <SelectContent>
            {REQUEST_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label className="text-xs">Tanggal Butuh *</Label>
        <Input type="date" value={form.need_date} onChange={e => setForm(f => ({ ...f, need_date: e.target.value }))} className="mt-1" />
      </div>
      <div>
        <Label className="text-xs">Keterangan Tambahan</Label>
        <Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Opsional..." className="mt-1 resize-none h-16" />
      </div>
      <div className="flex gap-2 pt-1">
        <Button variant="outline" className="flex-1" onClick={onClose}>Batal</Button>
        <Button className="flex-1" onClick={handleSave}
          disabled={saving || !form.keperluan || !form.amount || !form.category || !form.need_date}>
          {saving ? "Mengirim..." : "Ajukan Request"}
        </Button>
      </div>
    </div>
  );
}

export default function PettyCashPage() {
  const qc = useQueryClient();
  const { role, user } = useCurrentUser();
  const isOwnerOrManajer = ["owner", "admin", "manajer"].includes(role);
  const isFeeder = ["kepala_feeder", "keeper"].includes(role);

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ["petty-cash-requests"],
    queryFn: () => base44.entities.PettyCashRequest.list("-request_date", 200),
  });

  const { data: users = [] } = useQuery({
    queryKey: ["users-all"],
    queryFn: () => base44.entities.User.list(),
  });

  const [showRequestForm, setShowRequestForm] = useState(false);
  const [filterMonth, setFilterMonth] = useState("all");
  const [filterCat, setFilterCat] = useState("all");

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["petty-cash-requests"] });
    qc.invalidateQueries({ queryKey: ["finance-transactions"] });
  };

  const handleApprove = async (req, approved) => {
    await base44.entities.PettyCashRequest.update(req.id, {
      status: approved ? "disetujui" : "ditolak",
      approved_by: user?.full_name || user?.email,
      approved_date: new Date().toISOString().split("T")[0],
    });
    invalidate();
    toast.success(approved ? "Request disetujui" : "Request ditolak");
  };

  const handleDisburse = async (req) => {
    await base44.entities.PettyCashRequest.update(req.id, {
      status: "dicairkan",
      disbursement_date: new Date().toISOString().split("T")[0],
    });
    // Auto-catat ke laporan keuangan
    await base44.entities.FinanceTransaction.create({
      type: "pengeluaran",
      category: CAT_TO_FINANCE[req.category] || "lainnya",
      amount: req.amount_requested,
      date: new Date().toISOString().split("T")[0],
      description: `Kas Kecil — ${req.reason} — ${req.requester_name}`,
      created_by_name: user?.full_name || user?.email,
    });
    invalidate();
    toast.success("Dicairkan & dicatat ke Laba Rugi");
  };

  if (!canAccessPettyCash(role)) return <AccessDenied />;

  const thisMonth = format(new Date(), "yyyy-MM");
  const disbursedThisMonth = requests.filter(r => r.status === "dicairkan" && r.request_date?.startsWith(thisMonth));
  const totalDisbursed = disbursedThisMonth.reduce((s, r) => s + (r.amount_requested || 0), 0);
  const waitingCount = requests.filter(r => r.status === "diajukan").length;

  const activeRequests = requests.filter(r => ["diajukan", "disetujui"].includes(r.status));
  const historyRequests = requests.filter(r => ["dicairkan", "ditolak"].includes(r.status));

  const applyFilters = (list) => list.filter(r => {
    const monthMatch = filterMonth === "all" || r.request_date?.startsWith(filterMonth);
    const catMatch = filterCat === "all" || r.category === filterCat;
    return monthMatch && catMatch;
  });

  const months = [...new Set(requests.map(r => r.request_date?.substring(0, 7)).filter(Boolean))].sort().reverse();

  const RequestCard = ({ req }) => {
    const statusConf = STATUS_CONFIG[req.status] || STATUS_CONFIG.diajukan;
    return (
      <Card className="p-4">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="font-semibold text-sm">{req.requester_name}</span>
              <Badge className={statusConf.color}>{statusConf.label}</Badge>
              {req.category && <Badge variant="outline" className="text-xs">{req.category}</Badge>}
            </div>
            <p className="text-2xl font-bold text-primary">{formatRp(req.amount_requested)}</p>
            <p className="text-sm text-muted-foreground mt-1">{req.reason}</p>
            {req.need_date && <p className="text-xs text-muted-foreground mt-0.5">Butuh: {format(new Date(req.need_date), "d MMM yyyy", { locale: id })}</p>}
            {req.notes && <p className="text-xs text-muted-foreground italic mt-1">{req.notes}</p>}
          </div>
          {isOwnerOrManajer && (
            <div className="flex flex-col gap-1.5">
              {req.status === "diajukan" && (
                <>
                  <Button size="sm" className="gap-1.5 bg-green-600 hover:bg-green-700" onClick={() => handleApprove(req, true)}>
                    <CheckCircle2 className="w-3.5 h-3.5" /> Setujui
                  </Button>
                  <Button size="sm" variant="outline" className="gap-1.5 text-red-600 border-red-200" onClick={() => handleApprove(req, false)}>
                    <XCircle className="w-3.5 h-3.5" /> Tolak
                  </Button>
                </>
              )}
              {req.status === "disetujui" && (
                <Button size="sm" className="gap-1.5" onClick={() => handleDisburse(req)}>
                  <Banknote className="w-3.5 h-3.5" /> Cairkan
                </Button>
              )}
            </div>
          )}
        </div>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-heading font-bold flex items-center gap-2">
            <Wallet className="w-6 h-6 text-primary" /> Kas Kecil
          </h1>
          <p className="text-muted-foreground text-sm mt-1">Request & pencairan kas kecil operasional</p>
        </div>
        {(isOwnerOrManajer || isFeeder) && (
          <Button onClick={() => setShowRequestForm(true)} className="gap-2">
            <Plus className="w-4 h-4" /> Request Kas Kecil
          </Button>
        )}
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <TrendingDown className="w-4 h-4 text-red-500" />
            <p className="text-xs text-muted-foreground">Kas Kecil Bulan Ini</p>
          </div>
          <p className="text-xl font-bold text-red-600">{formatRp(totalDisbursed)}</p>
          <p className="text-xs text-muted-foreground">{disbursedThisMonth.length} transaksi dicairkan</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <Clock className="w-4 h-4 text-amber-500" />
            <p className="text-xs text-muted-foreground">Menunggu Approve</p>
          </div>
          <p className="text-xl font-bold text-amber-600">{waitingCount}</p>
          <p className="text-xs text-muted-foreground">request pending</p>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        <Select value={filterMonth} onValueChange={setFilterMonth}>
          <SelectTrigger className="w-36"><SelectValue placeholder="Bulan" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Bulan</SelectItem>
            {months.map(m => <SelectItem key={m} value={m}>{format(new Date(m + "-01"), "MMM yyyy", { locale: id })}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterCat} onValueChange={setFilterCat}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Kategori" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Kategori</SelectItem>
            {REQUEST_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <Tabs defaultValue="aktif">
        <TabsList>
          <TabsTrigger value="aktif">
            Request Aktif
            {activeRequests.length > 0 && <span className="ml-1.5 bg-red-500 text-white text-[10px] rounded-full px-1.5 py-0.5 font-bold">{activeRequests.length}</span>}
          </TabsTrigger>
          <TabsTrigger value="riwayat">Riwayat</TabsTrigger>
        </TabsList>

        <TabsContent value="aktif" className="mt-4 space-y-3">
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Memuat...</div>
          ) : applyFilters(activeRequests).length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              <Clock className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p>Tidak ada request aktif</p>
            </div>
          ) : (
            applyFilters(activeRequests).map(req => <RequestCard key={req.id} req={req} />)
          )}
        </TabsContent>

        <TabsContent value="riwayat" className="mt-4 space-y-3">
          {applyFilters(historyRequests).length === 0 ? (
            <div className="text-center py-10 text-muted-foreground text-sm">Belum ada riwayat</div>
          ) : (
            applyFilters(historyRequests).map(req => <RequestCard key={req.id} req={req} />)
          )}
        </TabsContent>
      </Tabs>

      {/* Request Form Dialog */}
      <Dialog open={showRequestForm} onOpenChange={setShowRequestForm}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wallet className="w-5 h-5 text-primary" /> Request Kas Kecil
            </DialogTitle>
          </DialogHeader>
          <RequestForm
            user={user}
            role={role}
            users={users}
            onClose={() => setShowRequestForm(false)}
            onSaved={invalidate}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
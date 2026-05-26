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
import { Wallet, Plus, TrendingDown, TrendingUp, AlertCircle, CheckCircle2, Clock } from "lucide-react";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { useCurrentUser } from "@/lib/useCurrentUser";
import { canAccessPettyCash } from "@/lib/permissions";
import AccessDenied from "@/components/common/AccessDenied";

const CATEGORIES = ["pakan", "obat", "peralatan", "operasional", "transport", "lainnya"];

function formatRp(n) {
  return "Rp " + Number(n || 0).toLocaleString("id-ID");
}

function TxForm({ pettyCashId, holderName, onClose, onSaved }) {
  const [form, setForm] = useState({ type: "pengeluaran", amount: "", category: "operasional", description: "", date: new Date().toISOString().split("T")[0] });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!form.amount || !form.description) return;
    setSaving(true);
    await base44.entities.PettyCashTransaction.create({
      petty_cash_id: pettyCashId,
      holder_name: holderName,
      type: form.type,
      amount: Number(form.amount),
      category: form.category,
      description: form.description,
      date: form.date,
    });
    // Update balance
    const pc = await base44.entities.PettyCash.list();
    const current = pc.find(p => p.id === pettyCashId);
    if (current) {
      const delta = form.type === "pemasukan" ? Number(form.amount) : -Number(form.amount);
      await base44.entities.PettyCash.update(pettyCashId, { current_balance: (current.current_balance || 0) + delta });
    }
    setSaving(false);
    onSaved();
    onClose();
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        {["pengeluaran", "pemasukan"].map(t => (
          <button key={t} onClick={() => setForm(f => ({...f, type: t}))}
            className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${form.type === t ? (t === "pengeluaran" ? "bg-red-500 text-white border-red-500" : "bg-green-500 text-white border-green-500") : "bg-background border-border"}`}>
            {t === "pengeluaran" ? "↓ Pengeluaran" : "↑ Pemasukan"}
          </button>
        ))}
      </div>
      <div>
        <Label className="text-xs">Jumlah (Rp) *</Label>
        <Input type="number" value={form.amount} onChange={e => setForm(f=>({...f,amount:e.target.value}))} placeholder="0" className="mt-1" />
      </div>
      <div>
        <Label className="text-xs">Kategori</Label>
        <Select value={form.category} onValueChange={v => setForm(f=>({...f,category:v}))}>
          <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
          <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div>
        <Label className="text-xs">Keterangan *</Label>
        <Textarea value={form.description} onChange={e => setForm(f=>({...f,description:e.target.value}))} placeholder="Detail pengeluaran..." className="mt-1 resize-none h-20" />
      </div>
      <div>
        <Label className="text-xs">Tanggal</Label>
        <Input type="date" value={form.date} onChange={e => setForm(f=>({...f,date:e.target.value}))} className="mt-1" />
      </div>
      <div className="flex gap-2 pt-1">
        <Button variant="outline" className="flex-1" onClick={onClose}>Batal</Button>
        <Button className="flex-1" onClick={handleSave} disabled={saving || !form.amount || !form.description}>
          {saving ? "Menyimpan..." : "Simpan"}
        </Button>
      </div>
    </div>
  );
}

function RequestForm({ userEmail, userName, onClose, onSaved }) {
  const [form, setForm] = useState({ amount_requested: "", reason: "", urgency: "normal", request_date: new Date().toISOString().split("T")[0] });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!form.amount_requested || !form.reason) return;
    setSaving(true);
    await base44.entities.PettyCashRequest.create({
      requester_email: userEmail,
      requester_name: userName,
      amount_requested: Number(form.amount_requested),
      reason: form.reason,
      urgency: form.urgency,
      request_date: form.request_date,
      status: "pending",
    });
    setSaving(false);
    onSaved();
    onClose();
  };

  return (
    <div className="space-y-3">
      <div>
        <Label className="text-xs">Jumlah Diminta (Rp) *</Label>
        <Input type="number" value={form.amount_requested} onChange={e => setForm(f=>({...f,amount_requested:e.target.value}))} placeholder="0" className="mt-1" />
      </div>
      <div>
        <Label className="text-xs">Alasan / Keperluan *</Label>
        <Textarea value={form.reason} onChange={e => setForm(f=>({...f,reason:e.target.value}))} placeholder="Jelaskan kebutuhan..." className="mt-1 resize-none h-20" />
      </div>
      <div>
        <Label className="text-xs">Urgensi</Label>
        <Select value={form.urgency} onValueChange={v => setForm(f=>({...f,urgency:v}))}>
          <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="normal">Normal</SelectItem>
            <SelectItem value="mendesak">🔴 Mendesak</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="flex gap-2 pt-1">
        <Button variant="outline" className="flex-1" onClick={onClose}>Batal</Button>
        <Button className="flex-1" onClick={handleSave} disabled={saving || !form.amount_requested || !form.reason}>
          {saving ? "Mengirim..." : "Kirim Request"}
        </Button>
      </div>
    </div>
  );
}

export default function PettyCashPage() {
  const qc = useQueryClient();
  const { role, user } = useCurrentUser();

  const isOwnerOrManajer = ["owner", "admin", "manajer"].includes(role);
  const isInvestor = role === "investor";
  const isReadOnly = isInvestor;

  const { data: pettyCashes = [], isLoading: pcLoading } = useQuery({
    queryKey: ["petty-cash"],
    queryFn: () => base44.entities.PettyCash.list("-created_date"),
  });

  const { data: transactions = [] } = useQuery({
    queryKey: ["petty-cash-transactions"],
    queryFn: () => base44.entities.PettyCashTransaction.list("-date", 200),
  });

  const { data: requests = [] } = useQuery({
    queryKey: ["petty-cash-requests"],
    queryFn: () => base44.entities.PettyCashRequest.list("-request_date", 100),
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["petty-cash"] });
    qc.invalidateQueries({ queryKey: ["petty-cash-transactions"] });
    qc.invalidateQueries({ queryKey: ["petty-cash-requests"] });
  };

  // Find my petty cash (for kepala_feeder)
  const myPC = pettyCashes.find(p => p.holder_email === user?.email && p.is_active);
  const displayPCs = isOwnerOrManajer ? pettyCashes : (myPC ? [myPC] : []);

  const [showTxForm, setShowTxForm] = useState(false);
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [showCreatePC, setShowCreatePC] = useState(false);
  const [selectedPC, setSelectedPC] = useState(null);
  const [newPCForm, setNewPCForm] = useState({ holder_email: "", holder_name: "", initial_balance: "", max_balance: "" });

  const handleCreatePC = async () => {
    if (!newPCForm.holder_email || !newPCForm.holder_name) return;
    await base44.entities.PettyCash.create({
      ...newPCForm,
      initial_balance: Number(newPCForm.initial_balance) || 0,
      current_balance: Number(newPCForm.initial_balance) || 0,
      max_balance: Number(newPCForm.max_balance) || 0,
      created_date: new Date().toISOString().split("T")[0],
      is_active: true,
    });
    invalidate();
    setShowCreatePC(false);
  };

  const handleApproveRequest = async (req, approved) => {
    await base44.entities.PettyCashRequest.update(req.id, {
      status: approved ? "approved" : "rejected",
      approved_by: user?.full_name || user?.email,
      approved_date: new Date().toISOString().split("T")[0],
    });
    invalidate();
  };

  const handleDisburse = async (req) => {
    await base44.entities.PettyCashRequest.update(req.id, { status: "disbursed", disbursement_date: new Date().toISOString().split("T")[0] });
    // Cari petty cash penerima & tambah balance
    const pc = pettyCashes.find(p => p.holder_email === req.requester_email && p.is_active);
    if (pc) {
      await base44.entities.PettyCash.update(pc.id, { current_balance: (pc.current_balance || 0) + req.amount_requested });
      await base44.entities.PettyCashTransaction.create({
        petty_cash_id: pc.id, holder_name: req.requester_name,
        type: "pemasukan", amount: req.amount_requested, category: "operasional",
        description: `Pencairan request: ${req.reason}`, date: new Date().toISOString().split("T")[0],
      });
    }
    invalidate();
  };

  const pendingRequests = requests.filter(r => r.status === "pending");
  const activePC = selectedPC || displayPCs[0];
  const myTxs = transactions.filter(t => t.petty_cash_id === activePC?.id);

  if (!canAccessPettyCash(role)) return <AccessDenied />;
  if (pcLoading) return <div className="flex items-center justify-center py-20"><div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-heading font-bold flex items-center gap-2">
            <Wallet className="w-6 h-6 text-primary" /> Kas Kecil
          </h1>
          <p className="text-muted-foreground text-sm mt-1">Kelola kas kecil operasional harian</p>
        </div>
        {isOwnerOrManajer && (
          <Button onClick={() => setShowCreatePC(true)} className="gap-2">
            <Plus className="w-4 h-4" /> Buat Kas Kecil Baru
          </Button>
        )}
      </div>

      {displayPCs.length === 0 ? (
        <Card className="py-16 text-center text-muted-foreground">
          <Wallet className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p>Belum ada kas kecil</p>
          {isOwnerOrManajer && <Button className="mt-4 gap-2" onClick={() => setShowCreatePC(true)}><Plus className="w-4 h-4" /> Buat Sekarang</Button>}
        </Card>
      ) : (
        <Tabs defaultValue="kas">
          <TabsList>
            <TabsTrigger value="kas">Kas Kecil</TabsTrigger>
            <TabsTrigger value="request">
              Request Dana
              {pendingRequests.length > 0 && <span className="ml-1.5 bg-red-500 text-white text-[10px] rounded-full px-1.5 py-0.5 font-bold">{pendingRequests.length}</span>}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="kas" className="mt-4 space-y-4">
            {/* PC cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {displayPCs.map(pc => (
                <Card key={pc.id} className={`p-5 cursor-pointer border-2 transition-all ${activePC?.id === pc.id ? "border-primary" : "border-border hover:border-primary/40"}`} onClick={() => setSelectedPC(pc)}>
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-semibold text-sm">{pc.holder_name}</p>
                      <p className="text-xs text-muted-foreground">{pc.holder_email}</p>
                    </div>
                    <Badge className={pc.is_active ? "bg-green-100 text-green-700" : "bg-muted text-muted-foreground"}>
                      {pc.is_active ? "Aktif" : "Nonaktif"}
                    </Badge>
                  </div>
                  <p className="text-3xl font-bold text-primary mt-3">{formatRp(pc.current_balance)}</p>
                  {pc.max_balance > 0 && (
                    <p className="text-xs text-muted-foreground mt-1">Plafon: {formatRp(pc.max_balance)}</p>
                  )}
                </Card>
              ))}
            </div>

            {activePC && (
              <div className="space-y-4">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <h3 className="font-semibold">Riwayat Transaksi — {activePC.holder_name}</h3>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setShowRequestForm(true)}>
                      <TrendingUp className="w-4 h-4" /> Request Tambahan
                    </Button>
                    <Button size="sm" className="gap-1.5" onClick={() => setShowTxForm(true)}>
                      <Plus className="w-4 h-4" /> Catat Transaksi
                    </Button>
                  </div>
                </div>

                {myTxs.length === 0 ? (
                  <p className="text-center py-8 text-muted-foreground text-sm">Belum ada transaksi</p>
                ) : (
                  <div className="space-y-2">
                    {myTxs.map(tx => (
                      <div key={tx.id} className="flex items-center gap-3 p-3 bg-card border border-border rounded-xl">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${tx.type === "pemasukan" ? "bg-green-100" : "bg-red-100"}`}>
                          {tx.type === "pemasukan" ? <TrendingUp className="w-4 h-4 text-green-600" /> : <TrendingDown className="w-4 h-4 text-red-500" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{tx.description}</p>
                          <p className="text-xs text-muted-foreground">{tx.category} · {tx.date && format(new Date(tx.date), "d MMM yyyy", { locale: id })}</p>
                        </div>
                        <p className={`text-sm font-bold flex-shrink-0 ${tx.type === "pemasukan" ? "text-green-600" : "text-red-600"}`}>
                          {tx.type === "pemasukan" ? "+" : "-"}{formatRp(tx.amount)}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </TabsContent>

          <TabsContent value="request" className="mt-4 space-y-3">
            {requests.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">Belum ada request</div>
            ) : (
              requests.map(req => (
                <Card key={req.id} className="p-4">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm">{req.requester_name}</span>
                        <Badge className={req.urgency === "mendesak" ? "bg-red-100 text-red-700" : "bg-muted text-muted-foreground"}>
                          {req.urgency === "mendesak" ? "🔴 Mendesak" : "Normal"}
                        </Badge>
                        <Badge className={req.status === "pending" ? "bg-amber-100 text-amber-700" : req.status === "approved" ? "bg-blue-100 text-blue-700" : req.status === "disbursed" ? "bg-green-100 text-green-700" : "bg-muted text-muted-foreground"}>
                          {req.status}
                        </Badge>
                      </div>
                      <p className="text-2xl font-bold text-primary mt-1">{formatRp(req.amount_requested)}</p>
                      <p className="text-sm text-muted-foreground mt-1">{req.reason}</p>
                      <p className="text-xs text-muted-foreground mt-1">{req.request_date && format(new Date(req.request_date), "d MMM yyyy", { locale: id })}</p>
                    </div>
                    {isOwnerOrManajer && !isReadOnly && (
                      <div className="flex flex-col gap-1.5">
                        {req.status === "pending" && (
                          <>
                            <Button size="sm" className="gap-1.5 bg-green-600 hover:bg-green-700" onClick={() => handleApproveRequest(req, true)}>
                              <CheckCircle2 className="w-3.5 h-3.5" /> Setuju
                            </Button>
                            <Button size="sm" variant="outline" className="gap-1.5 text-red-600 border-red-200" onClick={() => handleApproveRequest(req, false)}>
                              Tolak
                            </Button>
                          </>
                        )}
                        {req.status === "approved" && (
                          <Button size="sm" className="gap-1.5" onClick={() => handleDisburse(req)}>
                            <Wallet className="w-3.5 h-3.5" /> Cairkan
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>
      )}

      {/* Create Petty Cash */}
      <Dialog open={showCreatePC} onOpenChange={setShowCreatePC}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Wallet className="w-5 h-5 text-primary" /> Buat Kas Kecil</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label className="text-xs">Email Pemegang *</Label><Input value={newPCForm.holder_email} onChange={e => setNewPCForm(f=>({...f,holder_email:e.target.value}))} placeholder="email@..." className="mt-1" /></div>
            <div><Label className="text-xs">Nama Pemegang *</Label><Input value={newPCForm.holder_name} onChange={e => setNewPCForm(f=>({...f,holder_name:e.target.value}))} className="mt-1" /></div>
            <div><Label className="text-xs">Saldo Awal (Rp)</Label><Input type="number" value={newPCForm.initial_balance} onChange={e => setNewPCForm(f=>({...f,initial_balance:e.target.value}))} className="mt-1" /></div>
            <div><Label className="text-xs">Plafon Maksimal (Rp)</Label><Input type="number" value={newPCForm.max_balance} onChange={e => setNewPCForm(f=>({...f,max_balance:e.target.value}))} className="mt-1" /></div>
            <div className="flex gap-2 pt-1">
              <Button variant="outline" className="flex-1" onClick={() => setShowCreatePC(false)}>Batal</Button>
              <Button className="flex-1" onClick={handleCreatePC}>Buat</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Transaction Form */}
      <Dialog open={showTxForm} onOpenChange={setShowTxForm}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Plus className="w-5 h-5" /> Catat Transaksi</DialogTitle></DialogHeader>
          {activePC && <TxForm pettyCashId={activePC.id} holderName={activePC.holder_name} onClose={() => setShowTxForm(false)} onSaved={invalidate} />}
        </DialogContent>
      </Dialog>

      {/* Request Form */}
      <Dialog open={showRequestForm} onOpenChange={setShowRequestForm}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><TrendingUp className="w-5 h-5" /> Request Tambahan Dana</DialogTitle></DialogHeader>
          <RequestForm userEmail={user?.email} userName={user?.full_name || user?.email} onClose={() => setShowRequestForm(false)} onSaved={invalidate} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
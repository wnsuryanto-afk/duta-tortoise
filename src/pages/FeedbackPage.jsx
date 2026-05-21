import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { MessageSquare, Plus, CheckCircle2, Clock, RefreshCw, Trash2, Reply } from "lucide-react";
import { useCurrentUser } from "@/lib/useCurrentUser";
import { format } from "date-fns";
import { id } from "date-fns/locale";

const TYPE_COLORS = {
  kritik: "bg-red-100 text-red-700",
  saran: "bg-blue-100 text-blue-700",
  pertanyaan: "bg-yellow-100 text-yellow-700",
};
const STATUS_COLORS = {
  baru: "bg-orange-100 text-orange-700",
  diproses: "bg-blue-100 text-blue-700",
  selesai: "bg-green-100 text-green-700",
};
const STATUS_ICONS = {
  baru: Clock,
  diproses: RefreshCw,
  selesai: CheckCircle2,
};

export default function FeedbackPage() {
  const { user, role } = useCurrentUser();
  const qc = useQueryClient();
  const isAdmin = role === "owner" || role === "admin" || role === "manajer";

  const [showForm, setShowForm] = useState(false);
  const [replyDialog, setReplyDialog] = useState(null);
  const [replyText, setReplyText] = useState("");
  const [form, setForm] = useState({ type: "saran", title: "", content: "", is_anonymous: false });
  const [saving, setSaving] = useState(false);
  const [filterStatus, setFilterStatus] = useState("semua");

  const { data: feedbacks = [], isLoading } = useQuery({
    queryKey: ["feedbacks"],
    queryFn: () => base44.entities.FeedbackSuggestion.list("-created_date", 200),
  });

  const filtered = filterStatus === "semua" ? feedbacks : feedbacks.filter(f => f.status === filterStatus);

  const handleSubmit = async () => {
    if (!form.content.trim()) return;
    setSaving(true);
    await base44.entities.FeedbackSuggestion.create({
      ...form,
      submitted_by_name: form.is_anonymous ? "Anonim" : (user?.full_name || user?.email || ""),
      submitted_by_email: form.is_anonymous ? "" : (user?.email || ""),
    });
    qc.invalidateQueries({ queryKey: ["feedbacks"] });
    setForm({ type: "saran", title: "", content: "", is_anonymous: false });
    setShowForm(false);
    setSaving(false);
  };

  const { data: users = [] } = useQuery({
    queryKey: ["users"],
    queryFn: () => base44.entities.User.list(),
  });
  const { data: bonusRewards = [] } = useQuery({
    queryKey: ["bonus-rewards"],
    queryFn: () => base44.entities.BonusReward.list("-period", 100),
  });

  const handleReply = async () => {
    if (!replyDialog) return;
    await base44.entities.FeedbackSuggestion.update(replyDialog.id, {
      response: replyText,
      status: "selesai",
    });

    // Jika feedback diterima (selesai), beri poin 10 ke pengirim
    if (replyDialog.submitted_by_email && !replyDialog.is_anonymous) {
      const email = replyDialog.submitted_by_email;
      const emp = users.find(u => u.email === email);
      if (emp) {
        const period = format(new Date(), "yyyy-MM");
        const existing = bonusRewards.find(b => b.employee_email === email && b.period === period);
        const FEEDBACK_POINTS = 10;
        if (existing) {
          await base44.entities.BonusReward.update(existing.id, {
            total_points: (existing.total_points || 0) + FEEDBACK_POINTS,
          });
        } else {
          await base44.entities.BonusReward.create({
            employee_email: email,
            employee_name: emp.full_name || emp.email,
            period,
            total_points: FEEDBACK_POINTS,
            notes: "Poin dari kritik/saran diterima",
          });
        }
        qc.invalidateQueries({ queryKey: ["bonus-rewards"] });
      }
    }

    qc.invalidateQueries({ queryKey: ["feedbacks"] });
    setReplyDialog(null);
    setReplyText("");
  };

  const handleStatusChange = async (fb, status) => {
    await base44.entities.FeedbackSuggestion.update(fb.id, { status });
    qc.invalidateQueries({ queryKey: ["feedbacks"] });
  };

  const handleDelete = async (fb) => {
    if (confirm("Hapus feedback ini?")) {
      await base44.entities.FeedbackSuggestion.delete(fb.id);
      qc.invalidateQueries({ queryKey: ["feedbacks"] });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-heading font-bold">Kritik & Saran</h1>
          <p className="text-muted-foreground mt-1">Sampaikan masukan untuk kemajuan peternakan</p>
        </div>
        <Button onClick={() => setShowForm(true)} className="gap-2">
          <Plus className="w-4 h-4" />
          Kirim Masukan
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total", count: feedbacks.length, color: "text-foreground" },
          { label: "Baru", count: feedbacks.filter(f => f.status === "baru").length, color: "text-orange-600" },
          { label: "Diproses", count: feedbacks.filter(f => f.status === "diproses").length, color: "text-blue-600" },
          { label: "Selesai", count: feedbacks.filter(f => f.status === "selesai").length, color: "text-green-600" },
        ].map((s) => (
          <Card key={s.label} className="p-4 text-center">
            <p className={`text-2xl font-bold ${s.color}`}>{s.count}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
          </Card>
        ))}
      </div>

      {/* Filter */}
      <div className="flex gap-2 flex-wrap">
        {["semua", "baru", "diproses", "selesai"].map((s) => (
          <button
            key={s}
            onClick={() => setFilterStatus(s)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-all capitalize ${filterStatus === s ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border text-muted-foreground hover:text-primary"}`}
          >
            {s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <Card className="py-20 text-center text-muted-foreground">
          <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>Belum ada masukan</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((fb) => {
            const StatusIcon = STATUS_ICONS[fb.status] || Clock;
            return (
              <Card key={fb.id} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <Badge className={`text-[11px] ${TYPE_COLORS[fb.type] || ""}`}>{fb.type}</Badge>
                      <Badge className={`text-[11px] ${STATUS_COLORS[fb.status] || ""}`}>
                        <StatusIcon className="w-3 h-3 mr-1" />
                        {fb.status}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {fb.submitted_by_name || "Anonim"} • {fb.created_date ? format(new Date(fb.created_date), "d MMM yyyy", { locale: id }) : ""}
                      </span>
                    </div>
                    {fb.title && <p className="font-semibold text-sm mb-1">{fb.title}</p>}
                    <p className="text-sm text-foreground/80">{fb.content}</p>
                    {fb.response && (
                      <div className="mt-3 pl-3 border-l-2 border-primary/30 bg-primary/5 rounded-r-lg p-2">
                        <p className="text-xs text-muted-foreground font-medium mb-0.5">Balasan Admin:</p>
                        <p className="text-sm">{fb.response}</p>
                      </div>
                    )}
                  </div>
                  {isAdmin && (
                    <div className="flex gap-1 flex-shrink-0">
                      {fb.status !== "selesai" && (
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-primary" title="Balas" onClick={() => { setReplyDialog(fb); setReplyText(fb.response || ""); }}>
                          <Reply className="w-3.5 h-3.5" />
                        </Button>
                      )}
                      {fb.status === "baru" && (
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-600" title="Tandai Diproses" onClick={() => handleStatusChange(fb, "diproses")}>
                          <RefreshCw className="w-3.5 h-3.5" />
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(fb)}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Form kirim */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Kirim Kritik / Saran</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium mb-1 block">Jenis *</label>
                <Select value={form.type} onValueChange={(v) => setForm(p => ({ ...p, type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="kritik">Kritik</SelectItem>
                    <SelectItem value="saran">Saran</SelectItem>
                    <SelectItem value="pertanyaan">Pertanyaan</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-medium mb-1 block">Judul (opsional)</label>
                <Input value={form.title} onChange={(e) => setForm(p => ({ ...p, title: e.target.value }))} placeholder="Judul singkat..." />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium mb-1 block">Isi Pesan *</label>
              <Textarea value={form.content} onChange={(e) => setForm(p => ({ ...p, content: e.target.value }))} className="resize-none h-24 text-sm" placeholder="Tulis kritik atau saran Anda di sini..." />
            </div>
            <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
              <input type="checkbox" checked={form.is_anonymous} onChange={(e) => setForm(p => ({ ...p, is_anonymous: e.target.checked }))} className="rounded" />
              Kirim secara anonim
            </label>
            <div className="flex gap-2 pt-1">
              <Button variant="outline" className="flex-1" onClick={() => setShowForm(false)}>Batal</Button>
              <Button className="flex-1" onClick={handleSubmit} disabled={saving || !form.content.trim()}>
                {saving ? "Mengirim..." : "Kirim"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Reply dialog */}
      <Dialog open={!!replyDialog} onOpenChange={(o) => !o && setReplyDialog(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Balas Feedback</DialogTitle>
          </DialogHeader>
          {replyDialog && (
            <div className="space-y-3 pt-2">
              <div className="bg-muted/50 rounded-lg p-3">
                <p className="text-xs text-muted-foreground mb-1">Pesan dari {replyDialog.submitted_by_name}:</p>
                <p className="text-sm">{replyDialog.content}</p>
              </div>
              <div>
                <label className="text-xs font-medium mb-1 block">Balasan *</label>
                <Textarea value={replyText} onChange={(e) => setReplyText(e.target.value)} className="resize-none h-24 text-sm" placeholder="Tulis balasan..." />
              </div>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setReplyDialog(null)}>Batal</Button>
                <Button className="flex-1" onClick={handleReply} disabled={!replyText.trim()}>Simpan & Selesai</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useCurrentUser } from "@/lib/useCurrentUser";
import { canAccess } from "@/lib/permissions";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import AccessDenied from "@/components/common/AccessDenied";
import { Lightbulb, Send, ThumbsUp, Filter, Star, Clock, CheckCircle, XCircle, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

const TYPE_LABELS = { kritik: "Kritik", saran: "Saran", ide_inovasi: "Ide Inovasi", keluhan: "Keluhan" };
const TYPE_COLORS = { kritik: "bg-red-100 text-red-700", saran: "bg-blue-100 text-blue-700", ide_inovasi: "bg-purple-100 text-purple-700", keluhan: "bg-orange-100 text-orange-700" };
const CAT_LABELS = { operasional: "Operasional", fasilitas: "Fasilitas", manajemen: "Manajemen", kesehatan_hewan: "Kesehatan Hewan", keuangan: "Keuangan", sdm: "SDM", teknologi: "Teknologi", kebersihan: "Kebersihan", keamanan: "Keamanan", lainnya: "Lainnya" };
const STATUS_CONFIG = {
  pending: { label: "Menunggu", color: "bg-yellow-100 text-yellow-700", icon: Clock },
  dipertimbangkan: { label: "Dipertimbangkan", color: "bg-blue-100 text-blue-700", icon: Loader2 },
  diterima: { label: "Diterima", color: "bg-green-100 text-green-700", icon: CheckCircle },
  ditolak: { label: "Ditolak", color: "bg-red-100 text-red-700", icon: XCircle },
  sudah_diimplementasi: { label: "Terimplementasi", color: "bg-emerald-100 text-emerald-700", icon: Star },
  ditunda: { label: "Ditunda", color: "bg-gray-100 text-gray-600", icon: Clock },
};
const PRIO_COLORS = { rendah: "text-green-600", sedang: "text-yellow-600", tinggi: "text-orange-600", mendesak: "text-red-600 font-bold" };

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
  return <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${cfg.color}`}>{cfg.label}</span>;
}

function SaranCard({ item, currentEmail, onUpvote, canUpvote, showFull }) {
  const isOwn = item.submitted_by_email === currentEmail;
  const hasUpvoted = (item.upvoted_by || []).includes(currentEmail);
  const displayName = item.is_anonymous && !isOwn ? "Anonim" : item.submitted_by_name;

  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="bg-card border border-border rounded-xl p-4 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap gap-1.5 mb-1">
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${TYPE_COLORS[item.type]}`}>{TYPE_LABELS[item.type]}</span>
            <span className="px-2 py-0.5 rounded-full text-xs bg-secondary text-secondary-foreground">{CAT_LABELS[item.category] || item.category}</span>
            {item.priority === "mendesak" && <span className="px-2 py-0.5 rounded-full text-xs bg-red-100 text-red-700 font-bold">🔥 Mendesak</span>}
          </div>
          <p className="font-semibold text-foreground">{item.title}</p>
        </div>
        <StatusBadge status={item.status} />
      </div>
      {showFull && <p className="text-sm text-muted-foreground leading-relaxed">{item.description}</p>}
      <div className="flex items-center justify-between pt-1">
        <span className="text-xs text-muted-foreground">
          {displayName} · {item.submit_date ? format(new Date(item.submit_date), "d MMM yyyy", { locale: id }) : "-"}
        </span>
        <div className="flex items-center gap-3">
          {item.points_awarded > 0 && (
            <span className="text-xs font-semibold text-amber-600">+{item.points_awarded} poin</span>
          )}
          {canUpvote && !isOwn && (
            <button
              onClick={() => onUpvote(item)}
              className={`flex items-center gap-1 text-xs px-2 py-1 rounded-lg transition-all ${hasUpvoted ? "bg-primary/10 text-primary font-semibold" : "bg-secondary text-muted-foreground hover:bg-primary/10 hover:text-primary"}`}
            >
              <ThumbsUp className="w-3 h-3" />
              {item.upvotes || 0}
            </button>
          )}
          {!canUpvote && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <ThumbsUp className="w-3 h-3" /> {item.upvotes || 0}
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
}

const EMPTY_FORM = { title: "", description: "", type: "saran", category: "lainnya", priority: "sedang", is_anonymous: false };

export default function KritikSaranPage() {
  const { user, role } = useCurrentUser();
  const qc = useQueryClient();
  const [form, setForm] = useState(EMPTY_FORM);
  const [filterCat, setFilterCat] = useState("semua");
  const [filterStatus, setFilterStatus] = useState("semua");
  const [submitting, setSubmitting] = useState(false);

  const { data: allSaran = [], isLoading } = useQuery({
    queryKey: ["kritik-saran"],
    queryFn: () => base44.entities.KritikSaran.list("-submit_date", 200),
  });

  const canView = canAccess(role, "employees") || ["owner", "manajer", "admin", "kepala_feeder", "keeper"].includes(role);
  if (!canView) return <AccessDenied />;

  const mySaran = allSaran.filter(s => s.submitted_by_email === user?.email);
  const teamSaran = allSaran.filter(s =>
    (s.status !== "pending" && s.status !== "ditolak") || s.submitted_by_email === user?.email
  );

  const filteredTeam = teamSaran.filter(s => {
    const catOk = filterCat === "semua" || s.category === filterCat;
    const statusOk = filterStatus === "semua" || s.status === filterStatus;
    return catOk && statusOk;
  });

  const myPoints = mySaran.reduce((acc, s) => acc + (s.points_awarded || 0), 0);
  const myAccepted = mySaran.filter(s => ["diterima", "sudah_diimplementasi"].includes(s.status)).length;

  const handleSubmit = async () => {
    if (!form.title.trim() || !form.description.trim()) {
      toast.error("Judul dan deskripsi wajib diisi");
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        ...form,
        submitted_by_email: form.is_anonymous ? "anonymous" : user.email,
        submitted_by_name: form.is_anonymous ? "Anonim" : user.full_name,
        submitted_by_role: role,
        submit_date: new Date().toISOString(),
        status: "pending",
        upvotes: 0,
        upvoted_by: [],
        points_awarded: 0,
      };
      if (form.is_anonymous) {
        payload._real_submitter = user.email;
      }
      await base44.entities.KritikSaran.create(payload);
      // Notifikasi ke owner/manajer
      await base44.entities.Notification.create({
        recipient_role: "owner",
        title: form.priority === "mendesak" ? "🔥 Saran MENDESAK Masuk!" : "💡 Saran Baru Masuk",
        message: `"${form.title}" oleh ${form.is_anonymous ? "Anonim" : user.full_name}`,
        type: form.priority === "mendesak" ? "alert" : "info",
        category: "lainnya",
        is_read: false,
        action_url: "/review-saran",
      });
      qc.invalidateQueries({ queryKey: ["kritik-saran"] });
      setForm(EMPTY_FORM);
      toast.success("✅ Saran berhasil dikirim! Terima kasih kontribusimu.");
    } catch (e) {
      toast.error("Gagal mengirim saran");
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpvote = async (item) => {
    if (!user) return;
    const hasVoted = (item.upvoted_by || []).includes(user.email);
    if (hasVoted) return;
    const newBy = [...(item.upvoted_by || []), user.email];
    await base44.entities.KritikSaran.update(item.id, { upvotes: (item.upvotes || 0) + 1, upvoted_by: newBy });
    qc.invalidateQueries({ queryKey: ["kritik-saran"] });
  };

  const pendingCount = allSaran.filter(s => s.status === "pending").length;

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <Lightbulb className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-foreground">Kritik & Saran</h1>
          <p className="text-sm text-muted-foreground">Suarakan idemu untuk kemajuan bersama</p>
        </div>
        {["owner","manajer"].includes(role) && pendingCount > 0 && (
          <Badge className="ml-auto bg-red-500 text-white">{pendingCount} pending</Badge>
        )}
      </div>

      {/* Stats mini untuk karyawan */}
      {!["owner","manajer"].includes(role) && (
        <div className="grid grid-cols-3 gap-3">
          <Card className="p-3 text-center">
            <p className="text-2xl font-bold text-primary">{mySaran.length}</p>
            <p className="text-xs text-muted-foreground">Total Saran</p>
          </Card>
          <Card className="p-3 text-center">
            <p className="text-2xl font-bold text-green-600">{myAccepted}</p>
            <p className="text-xs text-muted-foreground">Diterima</p>
          </Card>
          <Card className="p-3 text-center">
            <p className="text-2xl font-bold text-amber-600">{myPoints}</p>
            <p className="text-xs text-muted-foreground">Total Poin</p>
          </Card>
        </div>
      )}

      <Tabs defaultValue="baru">
        <TabsList className="w-full grid grid-cols-3">
          <TabsTrigger value="saya">Saran Saya</TabsTrigger>
          <TabsTrigger value="baru">Buat Baru</TabsTrigger>
          <TabsTrigger value="tim">Saran Tim</TabsTrigger>
        </TabsList>

        {/* Tab Saran Saya */}
        <TabsContent value="saya" className="space-y-3 mt-4">
          {isLoading ? (
            <div className="text-center py-10 text-muted-foreground">Memuat...</div>
          ) : mySaran.length === 0 ? (
            <div className="text-center py-16 space-y-2">
              <Lightbulb className="w-12 h-12 text-muted-foreground mx-auto opacity-30" />
              <p className="text-muted-foreground">Kamu belum pernah mengirim saran</p>
              <p className="text-xs text-muted-foreground">Yuk, sampaikan idemu!</p>
            </div>
          ) : (
            mySaran.map(item => (
              <SaranCard key={item.id} item={item} currentEmail={user?.email} onUpvote={handleUpvote} canUpvote={false} showFull={true} />
            ))
          )}
        </TabsContent>

        {/* Tab Buat Baru */}
        <TabsContent value="baru" className="mt-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Sampaikan Idemu 💡</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Judul Singkat *</Label>
                <Input placeholder="Contoh: Tambah tempat minum otomatis di kandang A" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <Label>Tipe *</Label>
                  <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(TYPE_LABELS).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Kategori</Label>
                  <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(CAT_LABELS).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Prioritas</Label>
                  <Select value={form.priority} onValueChange={v => setForm(f => ({ ...f, priority: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="rendah">Rendah</SelectItem>
                      <SelectItem value="sedang">Sedang</SelectItem>
                      <SelectItem value="tinggi">Tinggi</SelectItem>
                      <SelectItem value="mendesak">🔥 Mendesak</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>Deskripsi Detail *</Label>
                <Textarea
                  placeholder="Jelaskan secara detail masukan kamu, termasuk masalah yang dihadapi dan solusi yang kamu usulkan..."
                  className="min-h-[120px]"
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="anon"
                  checked={form.is_anonymous}
                  onChange={e => setForm(f => ({ ...f, is_anonymous: e.target.checked }))}
                  className="rounded"
                />
                <label htmlFor="anon" className="text-sm text-muted-foreground cursor-pointer">
                  Submit sebagai anonim (nama tidak ditampilkan ke sesama karyawan)
                </label>
              </div>
              <Button onClick={handleSubmit} disabled={submitting} className="w-full">
                {submitting ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Mengirim...</> : <><Send className="w-4 h-4 mr-2" />Kirim Saran</>}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab Saran Tim */}
        <TabsContent value="tim" className="mt-4 space-y-4">
          <div className="flex flex-wrap gap-2">
            <Select value={filterCat} onValueChange={setFilterCat}>
              <SelectTrigger className="w-40"><SelectValue placeholder="Kategori" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="semua">Semua Kategori</SelectItem>
                {Object.entries(CAT_LABELS).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-40"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="semua">Semua Status</SelectItem>
                {Object.keys(STATUS_CONFIG).map(s => <SelectItem key={s} value={s}>{STATUS_CONFIG[s].label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {filteredTeam.length === 0 ? (
            <div className="text-center py-16 space-y-2">
              <Lightbulb className="w-12 h-12 text-muted-foreground mx-auto opacity-30" />
              <p className="text-muted-foreground">Belum ada saran tim</p>
            </div>
          ) : (
            <AnimatePresence>
              {filteredTeam.map(item => (
                <SaranCard key={item.id} item={item} currentEmail={user?.email} onUpvote={handleUpvote} canUpvote={true} showFull={false} />
              ))}
            </AnimatePresence>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
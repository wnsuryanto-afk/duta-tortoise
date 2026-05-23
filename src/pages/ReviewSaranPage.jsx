import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useCurrentUser } from "@/lib/useCurrentUser";
import { canAccess } from "@/lib/permissions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import AccessDenied from "@/components/common/AccessDenied";
import { ClipboardList, CheckCircle, XCircle, Clock, Star, Loader2, Eye, ChevronDown } from "lucide-react";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { toast } from "sonner";
import { motion } from "framer-motion";

const TYPE_LABELS = { kritik: "Kritik", saran: "Saran", ide_inovasi: "Ide Inovasi", keluhan: "Keluhan" };
const TYPE_COLORS = { kritik: "bg-red-100 text-red-700", saran: "bg-blue-100 text-blue-700", ide_inovasi: "bg-purple-100 text-purple-700", keluhan: "bg-orange-100 text-orange-700" };
const CAT_LABELS = { operasional: "Operasional", fasilitas: "Fasilitas", manajemen: "Manajemen", kesehatan_hewan: "Kesehatan Hewan", keuangan: "Keuangan", sdm: "SDM", teknologi: "Teknologi", kebersihan: "Kebersihan", keamanan: "Keamanan", lainnya: "Lainnya" };
const STATUS_CONFIG = {
  pending: { label: "Menunggu", color: "bg-yellow-100 text-yellow-700" },
  dipertimbangkan: { label: "Dipertimbangkan", color: "bg-blue-100 text-blue-700" },
  diterima: { label: "Diterima", color: "bg-green-100 text-green-700" },
  ditolak: { label: "Ditolak", color: "bg-red-100 text-red-700" },
  sudah_diimplementasi: { label: "Terimplementasi", color: "bg-emerald-100 text-emerald-700" },
  ditunda: { label: "Ditunda", color: "bg-gray-100 text-gray-600" },
};

// Aturan poin
function calculatePoints(status, type, upvotes) {
  let pts = 0;
  if (status === "diterima") pts = 20;
  else if (status === "sudah_diimplementasi") pts = 50;
  else if (status === "ditolak") pts = 5;
  else if (status === "dipertimbangkan") pts = 10;
  if ((upvotes || 0) > 5) pts += 5;
  if (type === "ide_inovasi" && ["diterima", "sudah_diimplementasi"].includes(status)) pts += 30;
  return pts;
}

export default function ReviewSaranPage() {
  const { user, role } = useCurrentUser();
  const qc = useQueryClient();
  const [filterStatus, setFilterStatus] = useState("semua");
  const [selected, setSelected] = useState(null);
  const [reviewNotes, setReviewNotes] = useState("");
  const [implNotes, setImplNotes] = useState("");
  const [processing, setProcessing] = useState(false);

  const { data: allSaran = [], isLoading } = useQuery({
    queryKey: ["kritik-saran"],
    queryFn: () => base44.entities.KritikSaran.list("-submit_date", 300),
  });

  const canReview = ["owner", "manajer", "admin"].includes(role);
  const canDecide = ["owner", "manajer"].includes(role);

  if (!canReview) return <AccessDenied />;

  const filtered = filterStatus === "semua" ? allSaran : allSaran.filter(s => s.status === filterStatus);
  const pendingCount = allSaran.filter(s => s.status === "pending").length;

  const handleAction = async (newStatus) => {
    if (!selected) return;
    setProcessing(true);
    try {
      const pts = calculatePoints(newStatus, selected.type, selected.upvotes);
      const updates = {
        status: newStatus,
        reviewed_by: user.full_name,
        reviewed_date: new Date().toISOString().split("T")[0],
        review_notes: reviewNotes,
        points_awarded: pts,
      };
      if (newStatus === "sudah_diimplementasi") {
        updates.implementation_date = new Date().toISOString().split("T")[0];
        updates.implementation_notes = implNotes;
      }
      await base44.entities.KritikSaran.update(selected.id, updates);

      // Award poin via BonusReward
      if (pts > 0 && selected.submitted_by_email && selected.submitted_by_email !== "anonymous") {
        const period = new Date().toISOString().slice(0, 7);
        await base44.entities.BonusReward.create({
          employee_email: selected.submitted_by_email,
          employee_name: selected.submitted_by_name,
          type: "kinerja",
          amount: pts,
          reason: `Saran "${selected.title}" — ${STATUS_CONFIG[newStatus]?.label}`,
          period,
          status: "approved",
          approved_by: user.full_name,
        });
      }

      // Notifikasi ke submitter
      if (selected.submitted_by_email && selected.submitted_by_email !== "anonymous") {
        const notifMsg = {
          diterima: `🎉 Selamat! Saran "${selected.title}" diterima. +${pts} poin`,
          sudah_diimplementasi: `🏆 Saran "${selected.title}" telah diimplementasi! +${pts} poin`,
          ditolak: `Saran "${selected.title}" tidak bisa diterapkan saat ini. +${pts} poin partisipasi`,
          dipertimbangkan: `💭 Saran "${selected.title}" sedang dipertimbangkan. +${pts} poin`,
          ditunda: `⏸️ Saran "${selected.title}" ditunda untuk saat ini.`,
        };
        await base44.entities.Notification.create({
          recipient_email: selected.submitted_by_email,
          title: "✅ Saran Anda Direspons",
          message: notifMsg[newStatus] || `Status saran "${selected.title}" diperbarui`,
          type: ["diterima", "sudah_diimplementasi"].includes(newStatus) ? "success" : "info",
          category: "lainnya",
          is_read: false,
        });
      }

      qc.invalidateQueries({ queryKey: ["kritik-saran"] });
      setSelected(null);
      setReviewNotes("");
      setImplNotes("");
      toast.success(`Saran berhasil di-${STATUS_CONFIG[newStatus]?.label?.toLowerCase()}`);
    } catch (e) {
      toast.error("Gagal memperbarui saran: " + e.message);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <ClipboardList className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-foreground">Review Kritik & Saran</h1>
          <p className="text-sm text-muted-foreground">Tindak lanjuti masukan dari tim</p>
        </div>
        {pendingCount > 0 && <Badge className="ml-auto bg-red-500 text-white">{pendingCount} pending</Badge>}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Total", val: allSaran.length, color: "text-foreground" },
          { label: "Pending", val: pendingCount, color: "text-yellow-600" },
          { label: "Diterima", val: allSaran.filter(s => s.status === "diterima").length, color: "text-green-600" },
          { label: "Terimplementasi", val: allSaran.filter(s => s.status === "sudah_diimplementasi").length, color: "text-emerald-600" },
        ].map(({ label, val, color }) => (
          <Card key={label} className="p-3 text-center">
            <p className={`text-2xl font-bold ${color}`}>{val}</p>
            <p className="text-xs text-muted-foreground">{label}</p>
          </Card>
        ))}
      </div>

      {/* Filter */}
      <div className="flex gap-2 flex-wrap">
        {["semua", "pending", "dipertimbangkan", "diterima", "ditolak", "sudah_diimplementasi", "ditunda"].map(s => (
          <button
            key={s}
            onClick={() => setFilterStatus(s)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${filterStatus === s ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:bg-primary/10"}`}
          >
            {s === "semua" ? "Semua" : STATUS_CONFIG[s]?.label}
            {s === "pending" && pendingCount > 0 && <span className="ml-1 bg-red-500 text-white px-1.5 py-0.5 rounded-full text-xs">{pendingCount}</span>}
          </button>
        ))}
      </div>

      {/* List */}
      {isLoading ? (
        <div className="text-center py-10 text-muted-foreground">Memuat...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <ClipboardList className="w-12 h-12 text-muted-foreground mx-auto opacity-30 mb-2" />
          <p className="text-muted-foreground">Tidak ada saran</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(item => (
            <motion.div key={item.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => { setSelected(item); setReviewNotes(item.review_notes || ""); }}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap gap-1.5 mb-1">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${TYPE_COLORS[item.type]}`}>{TYPE_LABELS[item.type]}</span>
                        <span className="px-2 py-0.5 rounded-full text-xs bg-secondary text-secondary-foreground">{CAT_LABELS[item.category] || item.category}</span>
                        {item.priority === "mendesak" && <span className="px-2 py-0.5 rounded-full text-xs bg-red-100 text-red-700 font-bold">🔥 Mendesak</span>}
                      </div>
                      <p className="font-semibold text-foreground">{item.title}</p>
                      <p className="text-sm text-muted-foreground line-clamp-2 mt-0.5">{item.description}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_CONFIG[item.status]?.color}`}>{STATUS_CONFIG[item.status]?.label}</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
                    <span>{item.submitted_by_name} ({item.submitted_by_role})</span>
                    <span>{item.submit_date ? format(new Date(item.submit_date), "d MMM yyyy", { locale: id }) : "-"}</span>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {/* Detail Dialog */}
      <Dialog open={!!selected} onOpenChange={o => !o && setSelected(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base">{selected?.title}</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${TYPE_COLORS[selected.type]}`}>{TYPE_LABELS[selected.type]}</span>
                <span className="px-2 py-0.5 rounded-full text-xs bg-secondary text-secondary-foreground">{CAT_LABELS[selected.category]}</span>
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_CONFIG[selected.status]?.color}`}>{STATUS_CONFIG[selected.status]?.label}</span>
              </div>
              <div className="bg-muted/50 rounded-lg p-3 text-sm leading-relaxed">{selected.description}</div>
              <div className="text-xs text-muted-foreground space-y-1">
                <p>Dikirim oleh: <span className="font-medium text-foreground">{selected.submitted_by_name}</span> ({selected.submitted_by_role})</p>
                <p>Tanggal: {selected.submit_date ? format(new Date(selected.submit_date), "d MMM yyyy HH:mm", { locale: id }) : "-"}</p>
                <p>👍 Upvotes: {selected.upvotes || 0}</p>
                {selected.points_awarded > 0 && <p>Poin diberikan: <span className="text-amber-600 font-semibold">+{selected.points_awarded}</span></p>}
                {selected.reviewed_by && <p>Direview oleh: {selected.reviewed_by} ({selected.reviewed_date})</p>}
              </div>

              {canDecide && (
                <>
                  <div>
                    <Label>Catatan Review</Label>
                    <Textarea
                      placeholder="Tuliskan alasan keputusan kamu..."
                      value={reviewNotes}
                      onChange={e => setReviewNotes(e.target.value)}
                      className="min-h-[80px]"
                    />
                  </div>
                  {selected.status !== "sudah_diimplementasi" && (
                    <div>
                      <Label>Catatan Implementasi (opsional)</Label>
                      <Textarea
                        placeholder="Jika sudah diimplementasi, jelaskan langkah yang diambil..."
                        value={implNotes}
                        onChange={e => setImplNotes(e.target.value)}
                      />
                    </div>
                  )}
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    <Button size="sm" variant="outline" onClick={() => handleAction("dipertimbangkan")} disabled={processing}>💭 Pertimbangkan</Button>
                    <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white" onClick={() => handleAction("diterima")} disabled={processing}>✅ Terima</Button>
                    <Button size="sm" variant="destructive" onClick={() => handleAction("ditolak")} disabled={processing}>❌ Tolak</Button>
                    <Button size="sm" variant="outline" onClick={() => handleAction("ditunda")} disabled={processing}>⏸️ Tunda</Button>
                    <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white col-span-2" onClick={() => handleAction("sudah_diimplementasi")} disabled={processing}>🏆 Tandai Terimplementasi</Button>
                  </div>
                  <p className="text-xs text-muted-foreground text-center">
                    Poin otomatis: Diterima +20, Terimplementasi +50, Dipertimbangkan +10, Ditolak +5
                    {selected.type === "ide_inovasi" ? " · Ide Inovasi bonus +30" : ""}
                    {(selected.upvotes || 0) > 5 ? " · Upvote >5 bonus +5" : ""}
                  </p>
                </>
              )}
              {role === "admin" && !canDecide && (
                <p className="text-xs text-muted-foreground bg-muted/50 rounded p-2">Kamu bisa melihat detail saran, tapi hanya Owner/Manajer yang bisa mengambil keputusan final.</p>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
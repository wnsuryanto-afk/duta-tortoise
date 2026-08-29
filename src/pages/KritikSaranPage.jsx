import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useCurrentUser } from "@/lib/useCurrentUser";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { MessageSquare, Send, Loader2, Eye, CheckCircle, XCircle, Filter } from "lucide-react";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { toast } from "sonner";

const STATUS_CONFIG = {
  baru:             { label: "Baru",            color: "bg-yellow-100 text-yellow-700" },
  dibaca:           { label: "Dibaca",           color: "bg-blue-100 text-blue-700" },
  ditindaklanjuti:  { label: "Ditindaklanjuti",  color: "bg-green-100 text-green-700" },
  ditutup:          { label: "Ditutup",          color: "bg-gray-100 text-gray-600" },
};

const TYPE_CONFIG = {
  kritik: { label: "Kritik", color: "bg-red-100 text-red-700" },
  saran:  { label: "Saran",  color: "bg-blue-100 text-blue-700" },
};

// Poin bonus untuk setiap masukan yang ditindaklanjuti owner/manajer.
const POIN_MASUKAN = 10;

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.baru;
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${cfg.color}`}>{cfg.label}</span>;
}

const EMPTY_FORM = { title: "", content: "", type: "saran" };

export default function KritikSaranPage() {
  const { user, role } = useCurrentUser();
  const qc = useQueryClient();
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [selected, setSelected] = useState(null);
  const [filterStatus, setFilterStatus] = useState("semua");
  const [filterType, setFilterType] = useState("semua");
  const [responseText, setResponseText] = useState("");
  const [responding, setResponding] = useState(false);

  const canReview = ["owner", "manajer"].includes(role);
  const canSubmit = ["owner", "manajer", "admin", "kepala_feeder", "keeper"].includes(role);

  const { data: allItems = [], isLoading } = useQuery({
    queryKey: ["feedback-suggestions"],
    queryFn: () => base44.entities.FeedbackSuggestion.list("-submit_date", 200),
  });

  const myItems = allItems.filter(s => s.submitted_by_email === user?.email);

  const reviewItems = allItems.filter(s => {
    const statusOk = filterStatus === "semua" || s.status === filterStatus;
    const typeOk = filterType === "semua" || s.type === filterType;
    return statusOk && typeOk;
  });

  const newCount = allItems.filter(s => s.status === "baru").length;

  const handleSubmit = async () => {
    if (!form.content.trim()) {
      toast.error("Isi kritik/saran wajib diisi");
      return;
    }
    setSubmitting(true);
    try {
      await base44.entities.FeedbackSuggestion.create({
        ...form,
        submitted_by_email: user.email,
        submitted_by_name: user.full_name,
        submit_date: new Date().toISOString(),
        status: "baru",
      });
      // Notif ke owner & manajer.
      //
      // Sebelumnya baris ini hanya mengisi `recipient_role: "owner"` tanpa
      // `recipient_email`. Kedua layar yang membaca notifikasi — lonceng dan
      // halaman Notifikasi — menyaringnya dengan
      // filter({ recipient_email: user.email }), jadi catatan tanpa email
      // tidak pernah cocok dengan siapa pun: setiap masukan yang dikirim
      // membuat notifikasi yang TIDAK PERNAH terlihat oleh siapa pun.
      //
      // Satu notifikasi per orang, seperti yang sudah dilakukan layar lain.
      try {
        const semuaUser = await base44.entities.User.list();
        const penerima = semuaUser.filter((u) => ["owner", "manajer"].includes(u.role));
        await Promise.all(
          penerima.map((u) =>
            base44.entities.Notification.create({
              recipient_email: u.email,
              recipient_role: u.role,
              title: `💬 ${TYPE_CONFIG[form.type]?.label} Baru Masuk`,
              message: `${form.title || form.content.slice(0, 60)} — oleh ${user.full_name}`,
              type: "info",
              category: "lainnya",
              is_read: false,
              action_url: "/kritik-saran",
              created_at: new Date().toISOString(),
            })
          )
        );
      } catch {
        // Masukannya sudah tersimpan. Gagal memberi tahu tidak boleh membuat
        // pengirim mengira masukannya hilang.
      }
      qc.invalidateQueries({ queryKey: ["feedback-suggestions"] });
      setForm(EMPTY_FORM);
      toast.success("Terima kasih! Masukan kamu sudah dikirim.");
    } catch {
      toast.error("Gagal mengirim masukan");
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusChange = async (item, newStatus) => {
    await base44.entities.FeedbackSuggestion.update(item.id, { status: newStatus });
    qc.invalidateQueries({ queryKey: ["feedback-suggestions"] });
    if (selected?.id === item.id) setSelected(prev => ({ ...prev, status: newStatus }));
    toast.success("Status diperbarui");
  };

  const handleRespond = async () => {
    if (!responseText.trim()) return;
    setResponding(true);
    try {
      await base44.entities.FeedbackSuggestion.update(selected.id, {
        response: responseText,
        responded_by: user.full_name,
        responded_date: new Date().toISOString().split("T")[0],
        status: "ditindaklanjuti",
      });
      // Poin bonus untuk masukan yang ditindaklanjuti.
      // Owner tidak memberi poin ke dirinya sendiri.
      let poinDiberi = 0;
      if (selected.submitted_by_email && selected.submitted_by_email !== user?.email) {
        try {
          const period = new Date().toISOString().slice(0, 7); // yyyy-MM
          const existing = await base44.entities.BonusReward.filter({
            employee_email: selected.submitted_by_email,
            period,
          });
          if (existing.length > 0) {
            await base44.entities.BonusReward.update(existing[0].id, {
              total_points: (existing[0].total_points || 0) + POIN_MASUKAN,
              notes: [existing[0].notes, "Poin masukan ditindaklanjuti"].filter(Boolean).join(" | "),
            });
          } else {
            await base44.entities.BonusReward.create({
              employee_email: selected.submitted_by_email,
              employee_name: selected.submitted_by_name || selected.submitted_by_email,
              period,
              total_points: POIN_MASUKAN,
              notes: "Poin masukan ditindaklanjuti",
            });
          }
          poinDiberi = POIN_MASUKAN;
        } catch {
          // Gagal memberi poin tidak boleh membatalkan balasan yang sudah tersimpan.
          poinDiberi = 0;
        }
      }

      // Notif ke submitter
      await base44.entities.Notification.create({
        recipient_email: selected.submitted_by_email,
        title: "✅ Masukan Anda Direspons",
        message: `${selected.title || selected.content.slice(0, 50)} telah direspons oleh ${user.full_name}` +
          (poinDiberi ? ` — kamu mendapat ${poinDiberi} poin bonus.` : ""),
        type: "success",
        category: "lainnya",
        is_read: false,
      });
      qc.invalidateQueries({ queryKey: ["feedback-suggestions"] });
      qc.invalidateQueries({ queryKey: ["bonus-rewards"] });
      setSelected(null);
      setResponseText("");
      toast.success(
        poinDiberi
          ? `Balasan terkirim — ${poinDiberi} poin bonus diberikan.`
          : "Balasan berhasil dikirim"
      );
    } catch {
      toast.error("Gagal mengirim balasan");
    } finally {
      setResponding(false);
    }
  };

  if (!canSubmit && !canReview) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        <MessageSquare className="w-12 h-12 mx-auto opacity-30 mb-3" />
        <p>Anda tidak memiliki akses ke halaman ini.</p>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <MessageSquare className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-foreground">Kotak Masukan</h1>
          <p className="text-sm text-muted-foreground">Kritik & saran untuk kemajuan bersama — masukan yang ditindaklanjuti dapat 10 poin bonus</p>
        </div>
        {canReview && newCount > 0 && (
          <Badge className="ml-auto bg-red-500 text-white">{newCount} baru</Badge>
        )}
      </div>

      {/* Form Submit */}
      {canSubmit && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Kirim Masukan</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs mb-1 block">Tipe *</Label>
                <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="saran">💡 Saran</SelectItem>
                    <SelectItem value="kritik">⚠️ Kritik</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs mb-1 block">Judul (opsional)</Label>
                <Input
                  placeholder="Judul singkat..."
                  value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                />
              </div>
            </div>
            <div>
              <Label className="text-xs mb-1 block">Isi Masukan *</Label>
              <Textarea
                placeholder="Tuliskan kritik atau saranmu di sini..."
                className="min-h-[100px]"
                value={form.content}
                onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
              />
            </div>
            <Button onClick={handleSubmit} disabled={submitting} className="w-full sm:w-auto">
              {submitting
                ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Mengirim...</>
                : <><Send className="w-4 h-4 mr-2" />Kirim</>
              }
            </Button>
          </CardContent>
        </Card>
      )}

      {/* My submissions (non-reviewer) */}
      {!canReview && (
        <div className="space-y-3">
          <h2 className="font-semibold text-sm text-muted-foreground">Masukan Saya ({myItems.length})</h2>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground text-sm">Memuat...</div>
          ) : myItems.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground text-sm">
              <MessageSquare className="w-10 h-10 mx-auto opacity-20 mb-2" />
              Belum ada masukan yang dikirim
            </div>
          ) : (
            myItems.map(item => (
              <Card key={item.id} className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap gap-1.5 mb-1">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${TYPE_CONFIG[item.type]?.color}`}>
                        {TYPE_CONFIG[item.type]?.label}
                      </span>
                      <StatusBadge status={item.status} />
                    </div>
                    {item.title && <p className="font-medium text-sm">{item.title}</p>}
                    <p className="text-sm text-muted-foreground line-clamp-2 mt-0.5">{item.content}</p>
                    {item.response && (
                      <div className="mt-2 bg-green-50 border border-green-200 rounded-lg p-2.5">
                        <p className="text-xs font-medium text-green-700 mb-0.5">Balasan dari {item.responded_by}:</p>
                        <p className="text-xs text-green-800">{item.response}</p>
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground whitespace-nowrap">
                    {item.submit_date ? format(new Date(item.submit_date), "d MMM yy", { locale: id }) : "-"}
                  </p>
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {/* Review Panel (owner/manajer) */}
      {canReview && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2 items-center">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-36 h-8 text-xs">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="semua">Semua Status</SelectItem>
                {Object.entries(STATUS_CONFIG).map(([v, c]) => (
                  <SelectItem key={v} value={v}>{c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-32 h-8 text-xs">
                <SelectValue placeholder="Tipe" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="semua">Semua Tipe</SelectItem>
                <SelectItem value="saran">Saran</SelectItem>
                <SelectItem value="kritik">Kritik</SelectItem>
              </SelectContent>
            </Select>
            <span className="text-xs text-muted-foreground ml-auto">{reviewItems.length} masukan</span>
          </div>

          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground text-sm">Memuat...</div>
          ) : reviewItems.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <MessageSquare className="w-10 h-10 mx-auto opacity-20 mb-2" />
              <p className="text-sm">Tidak ada masukan</p>
            </div>
          ) : (
            <div className="space-y-3">
              {reviewItems.map(item => (
                <Card
                  key={item.id}
                  className="p-4 cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => { setSelected(item); setResponseText(item.response || ""); }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap gap-1.5 mb-1">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${TYPE_CONFIG[item.type]?.color}`}>
                          {TYPE_CONFIG[item.type]?.label}
                        </span>
                        <StatusBadge status={item.status} />
                      </div>
                      {item.title && <p className="font-medium text-sm">{item.title}</p>}
                      <p className="text-sm text-muted-foreground line-clamp-2 mt-0.5">{item.content}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs text-muted-foreground">
                        {item.submit_date ? format(new Date(item.submit_date), "d MMM yy", { locale: id }) : "-"}
                      </p>
                      <p className="text-xs font-medium mt-0.5">{item.submitted_by_name}</p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Detail/Review Dialog */}
      <Dialog open={!!selected} onOpenChange={o => !o && setSelected(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base">
              {selected?.title || TYPE_CONFIG[selected?.type]?.label}
            </DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${TYPE_CONFIG[selected.type]?.color}`}>
                  {TYPE_CONFIG[selected.type]?.label}
                </span>
                <StatusBadge status={selected.status} />
              </div>

              <div className="bg-muted/40 rounded-lg p-3 text-sm leading-relaxed">{selected.content}</div>

              <div className="text-xs text-muted-foreground space-y-0.5">
                <p>Dari: <span className="font-medium text-foreground">{selected.submitted_by_name}</span></p>
                <p>Tanggal: {selected.submit_date ? format(new Date(selected.submit_date), "d MMMM yyyy, HH:mm", { locale: id }) : "-"}</p>
              </div>

              {selected.response && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                  <p className="text-xs font-medium text-green-700 mb-1">Balasan dari {selected.responded_by}:</p>
                  <p className="text-sm text-green-800">{selected.response}</p>
                </div>
              )}

              {canReview && (
                <>
                  {/* Status buttons */}
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm" variant="outline"
                      onClick={() => handleStatusChange(selected, "dibaca")}
                      disabled={selected.status === "dibaca"}
                    >
                      <Eye className="w-3.5 h-3.5 mr-1.5" /> Tandai Dibaca
                    </Button>
                    <Button
                      size="sm"
                      className="bg-green-600 hover:bg-green-700 text-white"
                      onClick={() => handleStatusChange(selected, "ditindaklanjuti")}
                      disabled={selected.status === "ditindaklanjuti"}
                    >
                      <CheckCircle className="w-3.5 h-3.5 mr-1.5" /> Tindak Lanjuti
                    </Button>
                    <Button
                      size="sm" variant="outline"
                      onClick={() => handleStatusChange(selected, "ditutup")}
                      disabled={selected.status === "ditutup"}
                    >
                      <XCircle className="w-3.5 h-3.5 mr-1.5" /> Tutup
                    </Button>
                  </div>

                  {/* Response form */}
                  <div className="space-y-2 border-t pt-3">
                    <Label className="text-sm">Balasan (opsional)</Label>
                    <Textarea
                      placeholder="Tuliskan balasan atau tindak lanjut..."
                      className="min-h-[80px]"
                      value={responseText}
                      onChange={e => setResponseText(e.target.value)}
                    />
                    <Button onClick={handleRespond} disabled={responding || !responseText.trim()} size="sm">
                      {responding
                        ? <><Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />Mengirim...</>
                        : <><Send className="w-3.5 h-3.5 mr-1.5" />Kirim Balasan</>
                      }
                    </Button>
                  </div>
                </>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
/**
 * IncidentalTaskPage — halaman owner/admin/manajer.
 * Daftar semua tugas insidentil + status (belum/dikerjakan/di-approve/dibatalkan).
 * Buat tugas baru (dialog) & batalkan tugas yang belum dikerjakan.
 */
import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useCurrentUser } from "@/lib/useCurrentUser";
import { canAccess, isManagerLevel } from "@/lib/permissions";
import AccessDenied from "@/components/common/AccessDenied";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Plus, Pin, Loader2, Ban } from "lucide-react";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { toast } from "sonner";
import IncidentalTaskForm from "@/components/incidental/IncidentalTaskForm";
import IncidentalTaskUsulanForm from "@/components/incidental/IncidentalTaskUsulanForm";
import IncidentalTaskUsulanSection from "@/components/incidental/IncidentalTaskUsulanSection";
import PageHeader from "@/components/common/PageHeader";
import KeadaanKosong from "@/components/common/KeadaanKosong";
import { TeamArt } from "@/components/common/Illustration";

export default function IncidentalTaskPage() {
  const { user, role } = useCurrentUser();
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [showUsulanForm, setShowUsulanForm] = useState(false);
  const [filterStatus, setFilterStatus] = useState("all");
  const [cancelingId, setCancelingId] = useState(null);

  // Auto-open form jika ada ?buat=1 (dari tombol dashboard)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("buat") === "1") setShowForm(true);
  }, []);

  const today = format(new Date(), "yyyy-MM-dd");

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ["incidental-tasks-all"],
    queryFn: () => base44.entities.IncidentalTask.list("-due_date", 300),
  });

  const { data: checklists = [] } = useQuery({
    queryKey: ["daily-checklists-recent-incidental"],
    queryFn: () => base44.entities.DailyChecklist.list("-date", 200),
    staleTime: 60 * 1000,
  });

  if (!canAccess(role, "tugas-insidentil")) return <AccessDenied />;

  const deriveStatus = (t) => {
    if (t.status === "usulan")
      return { label: "Menunggu Persetujuan", color: "bg-yellow-100 text-yellow-700 border-yellow-200" };
    if (t.status === "cancelled")
      return { label: "Dibatalkan", color: "bg-muted text-muted-foreground border-border" };
    if (t.status === "pending")
      return { label: "Belum dikerjakan", color: "bg-amber-100 text-amber-700 border-amber-200" };
    const cl = checklists.find((c) => c.id === t.daily_checklist_id);
    if (cl?.status === "approved")
      return { label: "Di-approve", color: "bg-green-100 text-green-700 border-green-200" };
    if (cl?.status === "rejected")
      return { label: "Ditolak", color: "bg-red-100 text-red-700 border-red-200" };
    return { label: "Dikerjakan", color: "bg-blue-100 text-blue-700 border-blue-200" };
  };

  const usulanTasks = tasks.filter((t) => t.status === "usulan");
  const rejectedUsulan = tasks.filter((t) => t.status === "cancelled" && t.rejection_reason);
  const resmiTasks = tasks.filter(
    (t) => t.status !== "usulan" && !(t.status === "cancelled" && t.rejection_reason)
  );
  const filtered =
    filterStatus === "all"
      ? resmiTasks
      : resmiTasks.filter((t) => deriveStatus(t).label.toLowerCase().includes(filterStatus));

  const handleCancel = async (t) => {
    setCancelingId(t.id);
    try {
      await base44.entities.IncidentalTask.update(t.id, {
        status: "cancelled",
        is_active: false,
      });
      toast.success("Tugas dibatalkan");
      qc.invalidateQueries({ queryKey: ["incidental-tasks-all"] });
    } catch (e) {
      toast.error("Gagal membatalkan: " + (e.message || e));
    }
    setCancelingId(null);
  };

  const stats = {
    pending: resmiTasks.filter((t) => t.status === "pending").length,
    done: resmiTasks.filter((t) => t.status === "done").length,
    cancelled: resmiTasks.filter((t) => t.status === "cancelled").length,
    usulan: usulanTasks.length,
  };

  const filters = [
    ["all", "Semua"],
    ["belum", "Belum"],
    ["dikerjakan", "Dikerjakan"],
    ["approve", "Di-approve"],
    ["dibatalkan", "Dibatalkan"],
  ];

  return (
    <div className="space-y-6">
      {/* Judul `text-3xl` + kalimat 108 huruf + empat kartu angka memakan 195px
          pertama di ponsel — tugasnya sendiri baru muncul di bawah itu. Angkanya
          pindah jadi chip, kalimat panjangnya diringkas jadi anak judul, dan
          keterangan lengkapnya tetap ada sebagai `description`. */}
      <PageHeader
        title="Tugas Insidentil"
        subtitle="Tugas dadakan di luar checklist harian"
        icon={Pin}
        art={<TeamArt size="md" />}
        description={
          isManagerLevel(role)
            ? "Tugas yang dibuat di sini langsung muncul di \"Tugas Hari Ini\" karyawan dan ikut alur approval poin."
            : "Usulan yang kamu kirim menunggu persetujuan manajer sebelum jadi tugas."
        }
        chips={[
          { key: "belum", label: "Belum", value: stats.pending, tone: stats.pending > 0 ? "warn" : "default" },
          { key: "dikerjakan", label: "Dikerjakan", value: stats.done },
          { key: "batal", label: "Dibatalkan", value: stats.cancelled },
          ...(isManagerLevel(role)
            ? [{ key: "usulan", label: "Menunggu persetujuan", value: stats.usulan, tone: stats.usulan > 0 ? "warn" : "default" }]
            : []),
        ]}
        actions={
          isManagerLevel(role) ? (
            <Button onClick={() => setShowForm(true)} className="gap-1.5">
              <Plus className="w-4 h-4" /> Buat Tugas
            </Button>
          ) : (
            <Button onClick={() => setShowUsulanForm(true)} className="gap-1.5">
              <Plus className="w-4 h-4" /> Usulkan Tugas
            </Button>
          )
        }
      />

      {/* Filter */}
      <div className="flex gap-2 flex-wrap">
        {filters.map(([val, label]) => (
          <Button
            key={val}
            variant={filterStatus === val ? "default" : "outline"}
            size="sm"
            onClick={() => setFilterStatus(val)}
          >
            {label}
          </Button>
        ))}
      </div>

      {/* List */}
      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-7 h-7 text-primary animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <Card className="p-2">
          <KeadaanKosong
            gambar="tim"
            judul="Belum ada tugas insidentil"
            keterangan={
              isManagerLevel(role)
                ? "Tugas dadakan yang kamu buat muncul di sini dan di layar karyawan."
                : "Usulan yang kamu kirim muncul di sini sambil menunggu persetujuan."
            }
            aksi={
              isManagerLevel(role) ? (
                <Button size="sm" onClick={() => setShowForm(true)} className="gap-1.5">
                  <Plus className="w-4 h-4" /> Buat Tugas
                </Button>
              ) : (
                <Button size="sm" onClick={() => setShowUsulanForm(true)} className="gap-1.5">
                  <Plus className="w-4 h-4" /> Usulkan Tugas
                </Button>
              )
            }
          />
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((t) => {
            const st = deriveStatus(t);
            const canCancel = t.status === "pending";
            const isOverdue = t.status === "pending" && t.due_date && t.due_date < today;
            return (
              <Card key={t.id} className={`p-4 ${isOverdue ? "border-red-300 bg-red-50" : ""}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-base">📌</span>
                      <p className="font-semibold text-sm">{t.title}</p>
                      <Badge variant="outline" className={`text-[11px] ${st.color}`}>
                        {st.label}
                      </Badge>
                      <Badge variant="outline" className="text-[11px] text-amber-600">
                        +{t.points} poin
                      </Badge>
                      {t.material_status === "waiting_materials" && (
                        <Badge variant="outline" className="text-[11px] bg-amber-50 text-amber-700 border-amber-200">
                          ⏳ Menunggu Barang
                        </Badge>
                      )}
                      {t.material_status === "ready" && t.required_items?.length > 0 && (
                        <Badge variant="outline" className="text-[11px] bg-green-50 text-green-700 border-green-200">
                          ✅ Siap Dikerjakan
                        </Badge>
                      )}
                      {isOverdue && (
                        <Badge variant="outline" className="text-[11px] bg-red-50 text-red-700 border-red-200">
                          ⚠ Terlambat
                        </Badge>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1.5 text-xs text-muted-foreground">
                      <span>
                        Ditugaskan: <strong className="text-foreground">{t.assigned_to_name || "Siapa saja"}</strong>
                      </span>
                      {t.created_date && (
                        <span>· Sejak: {format(new Date(t.created_date), "d MMM yyyy", { locale: id })}</span>
                      )}
                      <span className={isOverdue ? "text-red-600 font-medium" : ""}>
                        · Tenggat: {t.due_date ? format(new Date(t.due_date + "T00:00:00"), "d MMM yyyy", { locale: id }) : "-"}
                      </span>
                      {t.done_by_name && <span>· Dikerjakan: {t.done_by_name} ({t.done_at})</span>}
                    </div>
                    {t.notes && <p className="text-xs text-muted-foreground mt-1">{t.notes}</p>}
                    {t.photo_url && (
                      <img src={t.photo_url} alt="Acuan" className="mt-1.5 h-16 w-24 object-cover rounded border" />
                    )}
                    {t.done_notes && (
                      <p className="text-xs text-blue-700 mt-1.5 bg-blue-50 rounded-lg px-2 py-1 border border-blue-100">
                        📝 {t.done_notes}
                      </p>
                    )}
                    {t.done_photo_url && (
                      <img src={t.done_photo_url} alt="Bukti selesai" className="mt-1.5 h-20 w-28 object-cover rounded border border-green-200" />
                    )}
                    {t.required_items?.length > 0 && (
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        {t.required_items.map((ri, i) => (
                          <span
                            key={i}
                            className={`text-[11px] px-2 py-0.5 rounded-full border ${
                              ri.is_available
                                ? "bg-green-50 text-green-700 border-green-200"
                                : "bg-red-50 text-red-700 border-red-200"
                            }`}
                          >
                            {ri.is_available ? "✓" : "⏳"} {ri.item_name} ({ri.quantity}
                            {ri.unit ? ` ${ri.unit}` : ""})
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  {canCancel && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleCancel(t)}
                      disabled={cancelingId === t.id}
                      className="text-red-600 border-red-200 hover:bg-red-50 gap-1.5 flex-shrink-0"
                    >
                      {cancelingId === t.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Ban className="w-3.5 h-3.5" />
                      )}
                      Batalkan
                    </Button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <IncidentalTaskUsulanSection
        usulanTasks={usulanTasks}
        rejectedUsulan={rejectedUsulan}
        user={user}
        role={role}
      />

      <IncidentalTaskForm open={showForm} onClose={() => setShowForm(false)} user={user} />
      <IncidentalTaskUsulanForm open={showUsulanForm} onClose={() => setShowUsulanForm(false)} user={user} />
    </div>
  );
}
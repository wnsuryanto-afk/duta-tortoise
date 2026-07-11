/**
 * IncidentalTaskPage — halaman owner/admin/manajer.
 * Daftar semua tugas insidentil + status (belum/dikerjakan/di-approve/dibatalkan).
 * Buat tugas baru (dialog) & batalkan tugas yang belum dikerjakan.
 */
import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useCurrentUser } from "@/lib/useCurrentUser";
import { canAccess } from "@/lib/permissions";
import AccessDenied from "@/components/common/AccessDenied";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Plus, Pin, Loader2, Ban } from "lucide-react";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { toast } from "sonner";
import IncidentalTaskForm from "@/components/incidental/IncidentalTaskForm";

export default function IncidentalTaskPage() {
  const { user, role } = useCurrentUser();
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
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
    if (t.status === "cancelled")
      return { label: "Dibatalkan", color: "bg-gray-100 text-gray-600 border-gray-200" };
    if (t.status === "pending")
      return { label: "Belum dikerjakan", color: "bg-amber-100 text-amber-700 border-amber-200" };
    const cl = checklists.find((c) => c.id === t.daily_checklist_id);
    if (cl?.status === "approved")
      return { label: "Di-approve", color: "bg-green-100 text-green-700 border-green-200" };
    if (cl?.status === "rejected")
      return { label: "Ditolak", color: "bg-red-100 text-red-700 border-red-200" };
    return { label: "Dikerjakan", color: "bg-blue-100 text-blue-700 border-blue-200" };
  };

  const filtered =
    filterStatus === "all" ? tasks : tasks.filter((t) => deriveStatus(t).label.toLowerCase().includes(filterStatus));

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
    pending: tasks.filter((t) => t.status === "pending").length,
    done: tasks.filter((t) => t.status === "done").length,
    cancelled: tasks.filter((t) => t.status === "cancelled").length,
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
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-heading font-bold flex items-center gap-2">
            <Pin className="w-7 h-7 text-orange-500" /> Tugas Insidentil
          </h1>
          <p className="text-muted-foreground mt-1">
            Beri tugas dadakan langsung ke karyawan — muncul di checklist "Tugas Hari Ini" mereka & ikut alur approval poin.
          </p>
        </div>
        <Button onClick={() => setShowForm(true)} className="gap-1.5">
          <Plus className="w-4 h-4" /> Buat Tugas
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="p-4 text-center">
          <p className="text-2xl font-bold text-amber-600">{stats.pending}</p>
          <p className="text-xs text-muted-foreground">Belum Dikerjakan</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-2xl font-bold text-blue-600">{stats.done}</p>
          <p className="text-xs text-muted-foreground">Dikerjakan</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-2xl font-bold text-gray-500">{stats.cancelled}</p>
          <p className="text-xs text-muted-foreground">Dibatalkan</p>
        </Card>
      </div>

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
        <Card className="p-12 text-center text-muted-foreground">
          <Pin className="w-10 h-10 mx-auto mb-2 opacity-20" />
          <p className="font-semibold">Belum ada tugas insidentil</p>
          <p className="text-sm mt-1">Klik "Buat Tugas" untuk memberi tugas dadakan ke karyawan.</p>
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

      <IncidentalTaskForm open={showForm} onClose={() => setShowForm(false)} user={user} />
    </div>
  );
}
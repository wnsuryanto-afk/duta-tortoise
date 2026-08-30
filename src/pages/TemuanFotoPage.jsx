import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { format, subDays } from "date-fns";
import { useCurrentUser } from "@/lib/useCurrentUser";
import { CATEGORIES, categorizeFinding, detectRecurring } from "@/lib/temuanCategorize";
import AccessDenied from "@/components/common/AccessDenied";
import TemuanKategoriSection from "@/components/temuan/TemuanKategoriSection";
import TemuanRingkasanMingguan from "@/components/temuan/TemuanRingkasanMingguan";
import SakitFromTemuanDialog from "@/components/temuan/SakitFromTemuanDialog";
import IncidentalFromTemuanDialog from "@/components/temuan/IncidentalFromTemuanDialog";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Loader2, ScanSearch, CheckCircle2, AlertTriangle, Camera } from "lucide-react";
import { toast } from "sonner";

export default function TemuanFotoPage() {
  const { user, isLoading: userLoading } = useCurrentUser();
  const qc = useQueryClient();
  const now = new Date();
  const today = format(now, "yyyy-MM-dd");
  const weekAgo = format(subDays(now, 6), "yyyy-MM-dd");

  const [showResolved, setShowResolved] = useState(false);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [sakitFinding, setSakitFinding] = useState(null);
  const [incidentalFinding, setIncidentalFinding] = useState(null);

  // ── Fetch checklists 7 hari terakhir (sorted by date desc) ──
  const { data: checklists = [], isLoading } = useQuery({
    queryKey: ["temuan-checklists", weekAgo, today],
    queryFn: () => base44.entities.DailyChecklist.list("-date", 500),
    staleTime: 60 * 1000,
  });

  // ── Fetch PhotoFinding records for resolution status ──
  const { data: findingRecords = [] } = useQuery({
    queryKey: ["photo-findings"],
    queryFn: () => base44.entities.PhotoFinding.list("-date", 500),
    staleTime: 30 * 1000,
  });

  // ── Build finding status map ──
  const findingStatusMap = useMemo(() => {
    const m = {};
    (findingRecords || []).forEach(f => { m[f.finding_key] = f; });
    return m;
  }, [findingRecords]);

  // ── Extract all findings from checklists (7 hari terakhir) ──
  const allFindings = useMemo(() => {
    const result = [];
    (checklists || []).forEach(cl => {
      if (!cl.date) return;
      // Safe date check — only include within 7-day window
      try {
        const d = new Date(cl.date);
        if (isNaN(d.getTime())) return;
        if (cl.date < weekAgo || cl.date > today) return;
      } catch { return; }

      (cl.completed_tasks || []).forEach((t, idx) => {
        if (!t.ai_temuan_penting || !t.ai_temuan_penting.trim()) return;

        const normTitle = (t.task_title || "").trim().toLowerCase();
        const key = `${cl.employee_email || ""}|${cl.date}|${normTitle}`;
        const category = categorizeFinding(t.ai_temuan_penting);
        const statusRec = findingStatusMap[key];

        result.push({
          finding_key: key,
          checklist_id: cl.id,
          date: cl.date,
          task_title: t.task_title || "",
          task_index: idx,
          photo_taken_at: t.photo_taken_at || "",
          employee_email: cl.employee_email || "",
          employee_name: cl.employee_name || "",
          enclosure: t.notes || "",
          photo_url: t.photo_url || "",
          finding_text: t.ai_temuan_penting,
          category,
          status: statusRec?.status || "active",
          resolution_action: statusRec?.resolution_action || "",
          resolved_by: statusRec?.resolved_by || "",
          resolved_at: statusRec?.resolved_at || "",
        });
      });
    });
    return result;
  }, [checklists, findingStatusMap, weekAgo, today]);

  // ── Detect recurring ──
  const recurringKeys = useMemo(() => detectRecurring(allFindings), [allFindings]);

  // ── Active / resolved split ──
  const activeFindings = useMemo(() =>
    allFindings.filter(f => f.status === "active"),
  [allFindings]);
  const resolvedCount = allFindings.length - activeFindings.length;

  // ── Sort: kesehatan first → recurring → date desc ──
  const sortedActive = useMemo(() => {
    return [...activeFindings].sort((a, b) => {
      const aRec = recurringKeys.has(a.finding_key);
      const bRec = recurringKeys.has(b.finding_key);
      if (aRec && !bRec) return -1;
      if (!aRec && bRec) return 1;
      const ap = CATEGORIES[a.category]?.priority || 99;
      const bp = CATEGORIES[b.category]?.priority || 99;
      if (ap !== bp) return ap - bp;
      return (b.date || "").localeCompare(a.date || "");
    });
  }, [activeFindings, recurringKeys]);

  // ── Group by category ──
  const groupedActive = useMemo(() => {
    const groups = {};
    sortedActive.forEach(f => {
      if (!groups[f.category]) groups[f.category] = [];
      groups[f.category].push(f);
    });
    return Object.entries(groups).sort((a, b) => {
      const ap = CATEGORIES[a[0]]?.priority || 99;
      const bp = CATEGORIES[b[0]]?.priority || 99;
      return ap - bp;
    });
  }, [sortedActive]);

  const kesehatanActive = activeFindings.filter(f => f.category === "kesehatan_kura").length;

  // ── Resolve finding (upsert PhotoFinding) ──
  const handleResolve = async (finding, action) => {
    const data = {
      finding_key: finding.finding_key,
      checklist_id: finding.checklist_id,
      date: finding.date,
      task_title: finding.task_title,
      employee_email: finding.employee_email,
      employee_name: finding.employee_name,
      enclosure: finding.enclosure,
      photo_url: finding.photo_url,
      finding_text: finding.finding_text,
      category: finding.category,
      status: "resolved",
      resolution_action: action,
      resolved_by: user?.full_name || user?.email || "",
      resolved_at: new Date().toISOString(),
    };
    try {
      const existing = findingStatusMap[finding.finding_key];
      if (existing?.id) {
        await base44.entities.PhotoFinding.update(existing.id, data);
      } else {
        await base44.entities.PhotoFinding.create(data);
      }
      qc.invalidateQueries({ queryKey: ["photo-findings"] });
      toast.success(action === "ignored" ? "Temuan diabaikan" : "Temuan ditandai selesai");
    } catch (e) {
      toast.error("Gagal: " + (e.message || e));
    }
  };

  const handleIgnore = async (finding) => {
    const data = {
      finding_key: finding.finding_key,
      checklist_id: finding.checklist_id,
      date: finding.date,
      task_title: finding.task_title,
      employee_email: finding.employee_email,
      employee_name: finding.employee_name,
      enclosure: finding.enclosure,
      photo_url: finding.photo_url,
      finding_text: finding.finding_text,
      category: finding.category,
      status: "ignored",
      resolved_by: user?.full_name || user?.email || "",
      resolved_at: new Date().toISOString(),
    };
    try {
      const existing = findingStatusMap[finding.finding_key];
      if (existing?.id) {
        await base44.entities.PhotoFinding.update(existing.id, data);
      } else {
        await base44.entities.PhotoFinding.create(data);
      }
      qc.invalidateQueries({ queryKey: ["photo-findings"] });
      toast.info("Temuan diabaikan");
    } catch (e) {
      toast.error("Gagal: " + (e.message || e));
    }
  };

  if (userLoading || isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const role = user?.role;
  if (!["owner", "manajer", "admin"].includes(role)) {
    return <AccessDenied message="Halaman temuan foto hanya untuk Owner, Manajer, dan Admin." />;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-4 p-4">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold font-heading flex items-center gap-2">
          <ScanSearch className="w-5 h-5 text-purple-600" /> Temuan dari Foto
        </h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          Temuan sampingan ditangkap AI Vision dari foto task harian · 7 hari terakhir
        </p>
      </div>

      {/* Summary bar */}
      <Card>
        <CardContent className="p-3 flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-1.5">
            <AlertTriangle className="w-4 h-4 text-red-500" />
            <span className="text-2xl font-bold text-foreground">{activeFindings.length}</span>
            <span className="text-xs text-muted-foreground">temuan aktif</span>
          </div>
          {kesehatanActive > 0 && (
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-red-50 border border-red-200">
              <span className="text-xs font-semibold text-red-700">🐢 {kesehatanActive} kesehatan kura</span>
            </div>
          )}
          {resolvedCount > 0 && (
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-green-500" />
              <span className="text-xs text-muted-foreground">{resolvedCount} ditangani</span>
            </div>
          )}
          <label className="flex items-center gap-1.5 ml-auto text-xs text-muted-foreground cursor-pointer">
            <Switch checked={showResolved} onCheckedChange={setShowResolved} />
            Tampilkan selesai
          </label>
        </CardContent>
      </Card>

      {/* Active findings grouped by category */}
      {activeFindings.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Camera className="w-10 h-10 text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-sm font-semibold text-foreground">Tidak ada temuan aktif</p>
            <p className="text-xs text-muted-foreground mt-1">Semua temuan sudah ditangani atau belum ada temuan dari AI Vision</p>
          </CardContent>
        </Card>
      ) : (
        groupedActive.map(([cat, findings]) => (
          <TemuanKategoriSection
            key={cat}
            category={cat}
            findings={findings}
            recurringKeys={recurringKeys}
            onPhotoClick={setPhotoPreview}
            onSakit={setSakitFinding}
            onIncidental={setIncidentalFinding}
            onResolve={handleResolve}
            onIgnore={handleIgnore}
          />
        ))
      )}

      {/* Resolved findings (if toggled) */}
      {showResolved && resolvedCount > 0 && (
        <div>
          <h3 className="text-sm font-bold text-muted-foreground mb-2">Riwayat ({resolvedCount})</h3>
          <div className="space-y-2">
            {allFindings.filter(f => f.status !== "active").sort((a, b) =>
              (b.resolved_at || "").localeCompare(a.resolved_at || "")
            ).map((f, i) => (
              <TemuanKategoriSection
                key={`resolved_${i}`}
                category={f.category}
                findings={[f]}
                recurringKeys={recurringKeys}
                onPhotoClick={setPhotoPreview}
                onSakit={() => {}}
                onIncidental={() => {}}
                onResolve={() => {}}
                onIgnore={() => {}}
              />
            ))}
          </div>
        </div>
      )}

      {/* Weekly summary */}
      <TemuanRingkasanMingguan allFindings={allFindings} />

      {/* Photo preview modal */}
      {photoPreview && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setPhotoPreview(null)}
        >
          <img src={photoPreview} alt="Foto besar" className="max-w-full max-h-full rounded-lg" />
        </div>
      )}

      {/* Dialogs */}
      <SakitFromTemuanDialog
        finding={sakitFinding}
        user={user}
        onClose={() => setSakitFinding(null)}
        onResolved={handleResolve}
      />
      <IncidentalFromTemuanDialog
        finding={incidentalFinding}
        user={user}
        onClose={() => setIncidentalFinding(null)}
        onResolved={handleResolve}
      />
    </div>
  );
}
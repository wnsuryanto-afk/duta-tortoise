import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { useCurrentUser } from "@/lib/useCurrentUser";
import { MessageCircle, Loader2 } from "lucide-react";

/**
 * CatatanSaranPage — halaman "💬 Catatan & Saran" untuk keeper/feeder.
 * Kumpulan apresiasi + saran AI dan catatan dari owner beberapa hari terakhir.
 * Penilaian teknis (keyakinan, sesuai/tidak) TIDAK ditampilkan di sini.
 */
export default function CatatanSaranPage() {
  const { user } = useCurrentUser();

  const { data: checklists = [], isLoading } = useQuery({
    queryKey: ["catatan-saran", user?.email],
    queryFn: () => base44.entities.DailyChecklist.filter({ employee_email: user.email }, "-date", 50),
    enabled: !!user?.email,
    staleTime: 60 * 1000,
  });

  const entries = (checklists || [])
    .flatMap(c =>
      (c.completed_tasks || [])
        .filter(t => t.ai_apresiasi || t.ai_saran || t.owner_note)
        .map(t => ({
          date: c.date,
          task: t.task_title,
          apresiasi: t.ai_apresiasi,
          saran: t.ai_saran,
          keyakinan: t.ai_confidence,
          ownerNote: t.owner_note,
        }))
    )
    .sort((a, b) => (b.date || "").localeCompare(a.date || ""));

  // Sembunyikan saran AI jika keyakinan < 60 (hindari teguran keliru)
  // Tapi owner_note selalu tampil
  const visibleEntries = entries.filter(e => {
    const aiVisible = e.keyakinan == null || e.keyakinan >= 60;
    return (aiVisible && (e.apresiasi || e.saran)) || e.ownerNote;
  });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-heading font-bold flex items-center gap-2">
          <MessageCircle className="w-6 h-6 text-primary" /> Catatan & Saran
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Catatan dari AI dan owner untuk bantu kamu bekerja lebih baik.
        </p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="w-6 h-6 text-primary animate-spin" />
        </div>
      ) : visibleEntries.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <MessageCircle className="w-10 h-10 mx-auto mb-2 opacity-30" />
          <p>Belum ada catatan. Kerjakan task dengan foto untuk mendapat saran.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {visibleEntries.map((e, i) => {
            const aiVisible = e.keyakinan == null || e.keyakinan >= 60;
            return (
              <div key={i} className="card-base p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-muted-foreground">{e.task}</span>
                  <span className="text-[10px] text-muted-foreground">·</span>
                  <span className="text-xs text-muted-foreground">
                    {e.date ? format(new Date(e.date), "EEEE, d MMM", { locale: idLocale }) : "-"}
                  </span>
                </div>
                {aiVisible && e.apresiasi && (
                  <p className="text-sm text-green-700">✅ {e.apresiasi}</p>
                )}
                {aiVisible && e.saran && (
                  <p className="text-sm text-blue-700">💡 {e.saran}</p>
                )}
                {e.ownerNote && (
                  <div className="rounded-lg bg-amber-50 border border-amber-200 p-2 space-y-0.5">
                    <p className="text-[10px] font-bold text-amber-600">📣 Dari Owner</p>
                    <p className="text-sm text-amber-800">{e.ownerNote}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
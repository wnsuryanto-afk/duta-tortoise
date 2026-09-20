import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { Clock, ChevronRight } from "lucide-react";
import { format, parseISO } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { useCurrentUser } from "@/lib/useCurrentUser";
import { useCompanySettings } from "@/lib/useCompanySettings";
import { checklistTertunda, peranPenyetuju, bolehMenyetujui } from "@/lib/persetujuanPoin";
import { useActiveUsers } from "@/hooks/useActiveUsers";

/**
 * PengingatPersetujuan — checklist yang sudah lebih dari sehari menunggu.
 *
 * Alasannya ada di data: pada 20 September 2026 ada lima checklist berstatus
 * `submitted`, dua di antaranya dari 18 September. Poin tim untuk hari-hari
 * itu belum jadi apa-apa, dan tidak ada satu pun layar yang menyebutkannya.
 *
 * Hanya menampilkan yang BOLEH disetujui oleh orang yang sedang membuka —
 * mengingatkan seseorang tentang pekerjaan yang tidak berhak ia sentuh hanya
 * memindahkan rasa bersalah tanpa memindahkan kemampuan.
 */
export default function PengingatPersetujuan({ className = "" }) {
  const { user, role } = useCurrentUser();
  const pengaturan = useCompanySettings();
  const { data: users = [] } = useActiveUsers();

  const berhak = peranPenyetuju(pengaturan).includes(role);

  const { data: checklists = [] } = useQuery({
    queryKey: ["checklist-tertunda"],
    queryFn: () => base44.entities.DailyChecklist.filter({ status: "submitted" }, "-date", 200),
    enabled: berhak,
    staleTime: 60 * 1000,
  });

  if (!berhak) return null;

  const hariIni = format(new Date(), "yyyy-MM-dd");
  const peranPemilik = (c) => users.find((u) => u.email === c?.employee_email)?.role || "";

  const tertunda = checklistTertunda(checklists, hariIni).filter(
    (c) =>
      bolehMenyetujui({
        penilai: { ...user, role },
        checklist: { ...c, employee_role: peranPemilik(c) },
        settings: pengaturan,
      }).boleh,
  );

  if (tertunda.length === 0) return null;

  return (
    <Link
      to="/sop"
      className={`block rounded-2xl border border-amber-500/30 bg-amber-500/8 p-4 hover:bg-amber-500/12 transition-colors ${className}`}
    >
      <div className="flex items-start gap-2.5">
        <Clock className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-sm">
            {tertunda.length} checklist menunggu lebih dari sehari
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {tertunda
              .slice(0, 3)
              .map(
                (c) =>
                  `${c.employee_name} ${format(parseISO(c.date), "d MMM", { locale: idLocale })}`,
              )
              .join(" · ")}
            {tertunda.length > 3 ? ` · dan ${tertunda.length - 3} lagi` : ""}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Selama belum disetujui, poinnya belum jadi apa-apa bagi mereka.
          </p>
        </div>
        <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
      </div>
    </Link>
  );
}

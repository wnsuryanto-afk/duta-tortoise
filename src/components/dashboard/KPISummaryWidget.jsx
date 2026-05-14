import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useCurrentUser } from "@/lib/useCurrentUser";
import { Card } from "@/components/ui/card";
import { Star, TrendingUp, CheckCircle2 } from "lucide-react";
import { format } from "date-fns";
import { id } from "date-fns/locale";

export default function KPISummaryWidget() {
  const { user } = useCurrentUser();
  const currentPeriod = format(new Date(), "yyyy-MM");
  const today = format(new Date(), "yyyy-MM-dd");

  const { data: rewards = [] } = useQuery({
    queryKey: ["bonus-rewards-my", user?.email],
    queryFn: () => base44.entities.BonusReward.filter({ employee_email: user.email }),
    enabled: !!user?.email,
  });

  const { data: checklists = [] } = useQuery({
    queryKey: ["checklist-my-month", user?.email, currentPeriod],
    queryFn: async () => {
      const all = await base44.entities.DailyChecklist.filter({ employee_email: user.email });
      return all.filter((c) => c.date?.startsWith(currentPeriod));
    },
    enabled: !!user?.email,
  });

  const currentReward = rewards.find((r) => r.period === currentPeriod);
  // Accumulate approved points from checklists this month if no reward record yet
  const approvedPoints = currentReward?.total_points
    ?? checklists.filter(c => c.status === "approved").reduce((s, c) => s + (c.approved_points || 0), 0);

  const submittedToday = checklists.find((c) => c.date === today);
  const approvedThisMonth = checklists.filter(c => c.status === "approved").length;

  return (
    <Card className="p-4 bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-semibold text-amber-800">KPI Saya — {format(new Date(), "MMMM yyyy", { locale: id })}</p>
        <Star className="w-5 h-5 text-amber-400 fill-current" />
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div className="text-center">
          <p className="text-2xl font-heading font-bold text-amber-700">{approvedPoints}</p>
          <p className="text-[11px] text-amber-600 mt-0.5">Poin Terkumpul</p>
        </div>
        <div className="text-center border-x border-amber-200">
          <p className="text-2xl font-heading font-bold text-amber-700">{approvedThisMonth}</p>
          <p className="text-[11px] text-amber-600 mt-0.5">Hari Disetujui</p>
        </div>
        <div className="text-center">
          {submittedToday ? (
            <>
              <CheckCircle2 className="w-6 h-6 text-green-500 mx-auto" />
              <p className="text-[11px] text-green-600 mt-0.5">Sudah Submit</p>
            </>
          ) : (
            <>
              <TrendingUp className="w-6 h-6 text-amber-400 mx-auto" />
              <p className="text-[11px] text-amber-600 mt-0.5">Belum Submit</p>
            </>
          )}
        </div>
      </div>
    </Card>
  );
}
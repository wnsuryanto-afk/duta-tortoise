import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/card";
import { Egg } from "lucide-react";
import { differenceInDays, parseISO, format } from "date-fns";
import { id } from "date-fns/locale";
import { Link } from "react-router-dom";

export default function HatchReminderAlert() {
  const { data: breedings = [] } = useQuery({
    queryKey: ["breedings"],
    queryFn: () => base44.entities.Breeding.list("-created_date", 200),
  });

  const today = new Date();

  // Cari yang punya estimated_hatch_date, belum menetas, dan <= 10 hari lagi
  const upcoming = breedings.filter(b => {
    if (!b.estimated_hatch_date || b.status === "menetas" || b.status === "gagal" || b.status === "selesai") return false;
    const days = differenceInDays(parseISO(b.estimated_hatch_date), today);
    return days >= 0 && days <= 10;
  }).sort((a, b) => (a.estimated_hatch_date || "").localeCompare(b.estimated_hatch_date || ""));

  if (upcoming.length === 0) return null;

  return (
    <Card className="p-4 border-amber-300 bg-amber-50">
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0">
          <Egg className="w-5 h-5 text-amber-600" />
        </div>
        <div className="flex-1">
          <p className="font-semibold text-amber-800 text-sm">
            🥚 {upcoming.length} Telur Akan Segera Menetas!
          </p>
          <div className="mt-2 space-y-1">
            {upcoming.map(b => {
              const days = differenceInDays(parseISO(b.estimated_hatch_date), today);
              return (
                <div key={b.id} className="flex items-center justify-between text-xs text-amber-700">
                  <span className="font-medium">{b.male_name} × {b.female_name}</span>
                  <span className={`font-semibold ${days <= 3 ? "text-red-600" : "text-amber-600"}`}>
                    {days === 0 ? "Hari ini!" : `${days} hari lagi`}
                    {" "}({format(parseISO(b.estimated_hatch_date), "d MMM", { locale: id })})
                  </span>
                </div>
              );
            })}
          </div>
          <Link to="/breeding" className="text-xs text-amber-700 underline mt-2 inline-block">
            Lihat data breeding →
          </Link>
        </div>
      </div>
    </Card>
  );
}
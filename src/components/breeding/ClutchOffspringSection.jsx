import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Shell, Baby } from "lucide-react";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";

const GENDER_BG = {
  jantan: "bg-blue-100 border-blue-300 text-blue-800",
  betina: "bg-pink-100 border-pink-300 text-pink-800",
  belum_diketahui: "bg-gray-100 border-gray-300 text-gray-700",
};
const GENDER_LABEL = { jantan: "♂ Jantan", betina: "♀ Betina", belum_diketahui: "? Belum Diketahui" };
const STATUS_COLORS = {
  aktif: "bg-green-100 text-green-700",
  baby: "bg-amber-100 text-amber-700",
  sakit: "bg-red-100 text-red-700",
  terjual: "bg-gray-200 text-gray-600",
};

export default function ClutchOffspringSection({ breeding }) {
  const { data: tortoises = [] } = useQuery({
    queryKey: ["tortoises-for-lineage"],
    queryFn: () => base44.entities.Tortoise.list("-created_date", 500),
    staleTime: 5 * 60 * 1000,
  });

  // Ambil anak dari egg_records yang punya tortoise_id
  const registeredIds = (breeding.egg_records || [])
    .filter(e => e.tortoise_id)
    .map(e => e.tortoise_id);

  // Fallback: cari dari parent_male/female = nama induk
  const offspring = tortoises.filter(t =>
    registeredIds.includes(t.id) ||
    (t.last_breeding_id === breeding.id) ||
    (t.parent_male === breeding.male_name && t.parent_female === breeding.female_name && t.source === "hasil_sendiri")
  );

  if (offspring.length === 0) return null;

  return (
    <div className="mt-3 pt-3 border-t">
      <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5 mb-2">
        <Baby className="w-3.5 h-3.5 text-amber-500" />
        Keturunan dari Clutch Ini ({offspring.length})
      </p>
      <div className="flex flex-wrap gap-2">
        {offspring.map(t => (
          <Link
            key={t.id}
            to={`/tortoise?highlight=${t.id}`}
            className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg border bg-amber-50 hover:bg-amber-100 transition-colors border-amber-200"
          >
            {t.photo_url ? (
              <img src={t.photo_url} alt={t.name} className="w-7 h-7 rounded-full object-cover flex-shrink-0" />
            ) : (
              <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Shell className="w-3.5 h-3.5 text-primary" />
              </div>
            )}
            <div className="min-w-0">
              <p className="text-xs font-semibold text-amber-900 truncate">{t.name}</p>
              <p className="text-[9px] text-amber-700">{t.code || ""}</p>
            </div>
            <Badge className={`text-[9px] px-1.5 py-0 border ${GENDER_BG[t.gender] || GENDER_BG.belum_diketahui}`}>
              {t.gender === "jantan" ? "♂" : t.gender === "betina" ? "♀" : "?"}
            </Badge>
            {t.status && (
              <Badge className={`text-[9px] px-1.5 py-0 ${STATUS_COLORS[t.status] || ""}`}>
                {t.status}
              </Badge>
            )}
          </Link>
        ))}
      </div>
    </div>
  );
}
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { petaKura, dariClutch } from "@/lib/silsilah";
import { base44 } from "@/api/base44Client";
import { Shell, Baby } from "lucide-react";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";

const GENDER_BG = {
  jantan: "bg-blue-100 border-blue-300 text-blue-800",
  betina: "bg-pink-100 border-pink-300 text-pink-800",
  belum_diketahui: "bg-muted border-border text-foreground",
};
const GENDER_LABEL = { jantan: "♂ Jantan", betina: "♀ Betina", belum_diketahui: "? Belum Diketahui" };
const STATUS_COLORS = {
  aktif: "bg-green-100 text-green-700",
  baby: "bg-amber-100 text-amber-700",
  sakit: "bg-red-100 text-red-700",
  terjual: "bg-gray-200 text-muted-foreground",
};

export default function ClutchOffspringSection({ breeding }) {
  const { data: tortoises = [] } = useQuery({
    queryKey: ["tortoises-for-lineage"],
    queryFn: () => base44.entities.Tortoise.list("-created_date", 500),
    staleTime: 5 * 60 * 1000,
  });

  // Tiga tautan diperiksa berurutan — nomor telur, clutch terakhir, lalu
  // pasangan induknya — karena jalur pencatatan yang berbeda mengisi tautan
  // yang berbeda. Pencocokan induk lama membandingkan NAMA secara harfiah,
  // sehingga bayi dari dialog "Catat Hasil Menetas" (yang menyimpan ID induk)
  // tidak pernah muncul sebagai keturunan clutch-nya sendiri.
  const peta = useMemo(() => petaKura(tortoises), [tortoises]);
  const offspring = useMemo(
    () => tortoises.filter(t => dariClutch(t, breeding, peta)),
    [tortoises, breeding, peta]
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
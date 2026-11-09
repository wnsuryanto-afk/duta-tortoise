import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/card";
import { Egg } from "lucide-react";
import { parseISO, format } from "date-fns";
import { clutchMendesak } from "@/lib/hitungMundur";
import { id } from "date-fns/locale";
import { Link } from "react-router-dom";

export default function HatchReminderAlert() {
  const { data: breedings = [] } = useQuery({
    queryKey: ["breedings"],
    queryFn: () => base44.entities.Breeding.list("-created_date", 200),
  });

  const today = new Date();

  /*
    Dari clutchMendesak(), bukan disaring di sini.

    Versi lama menghitung mundur ke `estimated_hatch_date`, dan
    hitungMundur.js sudah mencatat bahwa kolom itu berisi tanggal TUTUP
    jendela menetas, bukan tanggal buka. Formulir mengisi jendelanya selebar
    25 hari (bertelur + 80 sampai bertelur + 105), jadi "≤ 10 hari lagi"
    diukur dari ujung yang salah: kartu ini baru menyala sekitar 15 hari
    SESUDAH telurnya benar-benar bisa menetas, dan padam lagi begitu
    perkiraannya terlampaui — justru saat perlu diperiksa.

    Sekarang isinya sama dengan ubin "Clutch perlu dipantau" di beranda
    Owner dan kotak di halaman Breeding: satu angka untuk satu pertanyaan.
  */
  const perlu = clutchMendesak(breedings, today);
  const upcoming = [...perlu.lewat, ...perlu.masa, ...perlu.segera];

  if (upcoming.length === 0) return null;

  return (
    <Card className="p-4 border-amber-300 bg-amber-50">
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0">
          <Egg className="w-5 h-5 text-amber-600" />
        </div>
        <div className="flex-1">
          <p className="font-semibold text-amber-800 text-sm">
            🥚 {upcoming.length} Clutch Perlu Dipantau
          </p>
          <div className="mt-2 space-y-1">
            {upcoming.map(({ breeding: b, mundur }) => {
              const teks =
                mundur.jenis === "lewat" ? `lewat ${mundur.hari} hari`
                : mundur.jenis === "masa" ? "sedang menetas"
                : mundur.hari === 0 ? "Hari ini!"
                : `${mundur.hari} hari lagi`;
              const merah = mundur.jenis === "lewat" || mundur.jenis === "masa" || (mundur.hari ?? 99) <= 3;
              return (
                <div key={b.id} className="flex items-center justify-between text-xs text-amber-700">
                  <span className="font-medium">{b.male_name} × {b.female_name}</span>
                  <span className={`font-semibold ${merah ? "text-red-600" : "text-amber-600"}`}>
                    {teks}
                    {b.estimated_hatch_start
                      ? ` (${format(parseISO(b.estimated_hatch_start), "d MMM", { locale: id })})`
                      : ""}
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
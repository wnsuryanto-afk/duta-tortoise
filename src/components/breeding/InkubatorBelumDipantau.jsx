import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Thermometer } from "lucide-react";
import { format, parseISO } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { pantauInkubator } from "@/lib/pantauInkubator";

/**
 * Penagih pemantauan inkubator.
 *
 * Halaman Inkubator dan formulir pencatatnya sudah lengkap sejak lama, dan
 * isinya dua catatan — keduanya dari Mei/Juni 2026. Sementara itu tujuh clutch
 * berisi 145 telur sedang dierami. Alatnya tidak kurang; yang kurang sesuatu
 * yang mengingatkan bahwa ia ada.
 *
 * Diletakkan di halaman Breeding & Telur, bukan di dasbor: di situlah orang
 * yang mengurus telur sedang berada, dan di situ pula tautannya berguna.
 *
 * Tidak muncul sama sekali ketika tidak ada telur yang dierami — kartu yang
 * selalu ada berhenti dibaca.
 */
export default function InkubatorBelumDipantau({ breedings = [] }) {
  const { data: readings = [] } = useQuery({
    queryKey: ["incubator-readings-pantau"],
    queryFn: () => base44.entities.IncubatorReading.list("-date_time", 100),
  });

  const p = pantauInkubator(breedings, readings);
  if (p.clutch === 0) return null;

  const tgl = (s) => {
    try { return format(parseISO(s), "d MMM yyyy", { locale: idLocale }); } catch { return s; }
  };

  const gawat = p.belumPernahSejakMasuk;

  return (
    <div
      className={`rounded-2xl border p-4 mb-4 ${
        gawat ? "border-amber-500/30 bg-amber-500/8" : "border-border bg-card"
      }`}
    >
      <div className="flex items-start gap-2.5">
        <Thermometer className={`w-5 h-5 flex-shrink-0 mt-0.5 ${gawat ? "text-amber-600" : "text-muted-foreground"}`} />
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-sm break-words">
            {p.telur} telur sedang dierami di {p.clutch} clutch
          </p>
          <p className="text-xs text-muted-foreground mt-0.5 break-words">
            {gawat ? (
              <>
                Belum ada satu pun catatan suhu atau kelembapan sejak telur pertama
                masuk ({tgl(p.sejak)}).{" "}
                {p.pembacaanTerakhir
                  ? `Pembacaan terakhir ${tgl(p.pembacaanTerakhir)} — ${p.hariSejakPembacaan} hari lalu, sebelum kelompok telur ini ada.`
                  : "Inkubator belum pernah dicatat sama sekali."}{" "}
                Sulcata menetas pada 80–105 hari di suhu 31°C; suhu menentukan bukan
                hanya berhasil-tidaknya, tetapi juga lamanya.
              </>
            ) : (
              <>
                Pembacaan terakhir {tgl(p.pembacaanTerakhir)}
                {p.hariSejakPembacaan > 0 ? ` — ${p.hariSejakPembacaan} hari lalu.` : " — hari ini."}
              </>
            )}
          </p>
          <Link
            to="/incubator-readings"
            className="text-xs text-primary hover:underline font-medium mt-1 inline-block"
          >
            Catat suhu &amp; kelembapan sekarang →
          </Link>
        </div>
      </div>
    </div>
  );
}

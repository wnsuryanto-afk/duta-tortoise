/**
 * DaftarPasangan — jawaban atas "pasangan mana kura-kuranya".
 *
 * Satu baris per pasangan, bukan per kejadian: yang ditanyakan adalah siapa
 * berpasangan dengan siapa, bukan berapa kali. Jumlah kejadian tetap
 * ditampilkan kecil di sebelahnya karena pasangan yang terlihat kawin empat
 * kali lebih layak ditunggu telurnya daripada yang sekali.
 *
 * Pasangan yang sudah lewat 45 hari tanpa clutch tercatat ditandai. Sulcata
 * umumnya bertelur 30-60 hari sesudah kawin, jadi lewat 45 hari tanpa catatan
 * berarti salah satu dari dua hal: telurnya belum ketemu, atau telurnya ketemu
 * tetapi tidak tercatat. Keduanya perlu dilihat orang selagi masih bisa
 * dicari, dan keduanya tidak akan pernah terlihat kalau tidak ditandai.
 */
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Heart, Clock } from "lucide-react";
import { format, parseISO } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { ringkasPasangan, hariSejak } from "@/lib/perkawinan";

const BATAS_HARI = 45;

export default function DaftarPasangan({ batas = 0 }) {
  const { data: perkawinan = [], isLoading } = useQuery({
    queryKey: ["perkawinan"],
    queryFn: () => base44.entities.Perkawinan.list("-mating_date", 500),
    staleTime: 60 * 1000,
  });

  const pasangan = ringkasPasangan(perkawinan);
  const tampil = batas > 0 ? pasangan.slice(0, batas) : pasangan;

  if (isLoading) {
    return (
      <div className="rounded-2xl border border-border bg-card p-4 text-sm text-muted-foreground">
        Memuat daftar pasangan…
      </div>
    );
  }

  if (pasangan.length === 0) {
    return (
      <div className="rounded-2xl border border-border bg-card p-6 text-center">
        <Heart className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
        <p className="text-sm font-medium">Belum ada catatan kawin</p>
        <p className="text-xs text-muted-foreground mt-1">
          Begitu ada yang dicatat, pasangannya muncul di sini beserta tanggal terakhirnya.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {tampil.map((p) => {
        const umur = hariSejak(p.terakhir);
        const lewat = umur !== null && umur > BATAS_HARI;
        return (
          <div key={p.kunci}
            className={`rounded-xl border p-3 ${lewat ? "border-amber-500/30 bg-amber-500/8" : "border-border bg-card"}`}>
            <div className="flex items-start justify-between gap-2 flex-wrap">
              <p className="text-sm font-semibold">
                {p.male_name} <span className="text-muted-foreground font-normal">×</span> {p.female_name}
              </p>
              <p className="text-xs text-muted-foreground tabular-nums flex-shrink-0">
                {p.terakhir ? format(parseISO(p.terakhir), "d MMM yyyy", { locale: idLocale }) : "—"}
              </p>
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {p.jumlah}× terlihat{p.kandang ? ` · kandang ${p.kandang}` : ""}
              {umur !== null ? ` · ${umur} hari lalu` : ""}
            </p>
            {lewat && (
              <p className="text-[11px] text-amber-700 dark:text-amber-500 mt-1 flex items-start gap-1">
                <Clock className="w-3 h-3 flex-shrink-0 mt-0.5" />
                Lewat {BATAS_HARI} hari tanpa catatan telur — cek sarangnya, atau telurnya sudah
                ada tapi belum tercatat.
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}

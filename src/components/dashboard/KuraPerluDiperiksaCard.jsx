/**
 * KuraPerluDiperiksaCard — kura yang sistem minta dilihat langsung.
 *
 * Menggabungkan dua sinyal yang selama ini tidak pernah sampai ke satu layar:
 *
 *   1. Temuan dari foto (PhotoFinding berstatus aktif) — hasil pembacaan AI
 *      atas foto bukti kerja yang memang sudah diunggah tiap hari. Ini BUKAN
 *      diagnosis; ia hanya menunjuk foto yang perlu dilihat manusia.
 *   2. Kura yang sudah lama tidak ditimbang — tanpa timbangan berkala, turun
 *      berat (tanda paling awal kura sakit) tidak akan pernah ketahuan.
 *
 * Kartu menghilang sendiri saat tidak ada satu pun yang perlu diperiksa.
 */
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Stethoscope, Camera, Scale } from "lucide-react";
import { Link } from "react-router-dom";
import { diPeternakan } from "@/lib/populasiKura";

const BATAS_HARI_TIMBANG = 30;

export default function KuraPerluDiperiksaCard() {
  const { data: temuan = [] } = useQuery({
    queryKey: ["temuan-foto-aktif"],
    queryFn: () => base44.entities.PhotoFinding.filter({ status: "active", category: "kesehatan_kura" }),
    staleTime: 5 * 60 * 1000,
  });

  const { data: tortoises = [] } = useQuery({
    queryKey: ["tortoises-timbang"],
    queryFn: () => base44.entities.Tortoise.list("name", 2000),
    staleTime: 10 * 60 * 1000,
  });

  const belumDitimbang = useMemo(() => {
    const batas = new Date(Date.now() - BATAS_HARI_TIMBANG * 86400000).toISOString().slice(0, 10);
    return (tortoises || []).filter(
      (t) => diPeternakan(t) && (!t.last_weighed_date || t.last_weighed_date < batas),
    );
  }, [tortoises]);

  if (temuan.length === 0 && belumDitimbang.length === 0) return null;

  return (
    <div className="bg-card rounded-xl border border-border p-4">
      <div className="flex items-center gap-2 mb-3">
        <Stethoscope className="w-4 h-4 text-primary" />
        <h2 className="font-semibold text-sm text-foreground">Kura yang Perlu Diperiksa</h2>
      </div>

      {temuan.length > 0 && (
        <div className="mb-3">
          <div className="flex items-center gap-1.5 mb-1.5">
            <Camera className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
            <p className="text-xs font-semibold text-foreground">
              {temuan.length} temuan dari foto rutin
            </p>
            <Link to="/temuan-foto" className="ml-auto text-xs text-primary hover:underline">
              Lihat →
            </Link>
          </div>
          <div className="space-y-1.5">
            {temuan.slice(0, 4).map((f) => (
              <div
                key={f.id}
                className="p-2.5 rounded-lg bg-amber-50 border border-amber-100 dark:bg-amber-950/30 dark:border-amber-900"
              >
                <p className="text-xs text-amber-800 dark:text-amber-300 leading-snug">
                  <span className="font-semibold">{f.tortoise_code || f.enclosure || f.task_title}</span>
                  {" — "}
                  {f.finding_text}
                </p>
              </div>
            ))}
            {temuan.length > 4 && (
              <p className="text-xs text-muted-foreground">dan {temuan.length - 4} lainnya</p>
            )}
          </div>
          <p className="text-[11px] text-muted-foreground mt-1.5">
            Hasil pembacaan AI atas foto kerja, bukan diagnosis. Perlu dilihat langsung.
          </p>
        </div>
      )}

      {belumDitimbang.length > 0 && (
        <div className={temuan.length > 0 ? "pt-3 border-t border-border" : ""}>
          <div className="flex items-center gap-1.5">
            <Scale className="w-3.5 h-3.5 text-muted-foreground" />
            <p className="text-xs text-muted-foreground">
              <span className="font-semibold text-foreground">{belumDitimbang.length} kura</span> belum
              ditimbang lebih dari {BATAS_HARI_TIMBANG} hari
            </p>
            <Link to="/tortoise" className="ml-auto text-xs text-primary hover:underline">
              Daftar →
            </Link>
          </div>
          <p className="text-[11px] text-muted-foreground mt-1">
            Timbang bergilir 2 ekor/hari sudah aktif — angka ini akan turun sendiri setiap hari.
          </p>
        </div>
      )}
    </div>
  );
}

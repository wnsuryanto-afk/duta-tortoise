import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { CalendarX, Lock, CheckCircle2, Info } from "lucide-react";
import { format, subDays } from "date-fns";
import { tugasNolKali, benarBenarNol, tugasTerkunci } from "@/lib/tugasNolKali";

/**
 * TugasTidakDikerjakan — tugas yang terjadwal tetapi tidak pernah dicentang.
 *
 * ── Kenapa ini perlu layarnya sendiri ──────────────────────────────────────
 *
 * "Tenggat vs jam kerja sebenarnya" menjawab KETERLAMBATAN: pekerjaan
 * dilakukan, hanya lewat jamnya. Layar ini menjawab pertanyaan yang sama
 * sekali berbeda — KETIADAAN — dan pertanyaan itu jauh lebih sulit terlihat,
 * justru karena tugas yang tidak pernah dicentang tidak meninggalkan satu
 * baris pun untuk dibaca. Yang hilang tidak muncul di daftar apa pun.
 *
 * Diukur pada 10-28 September 2026: lima tugas terjadwal 15 kali dan
 * dikerjakan nol kali. Dua di antaranya memupuk kolam azolla, sementara panen
 * azolla sedang terkunci menunggu kolamnya pulih. Tidak ada satu pun layar
 * yang menunjukkan lingkaran itu tidak menutup.
 */
export default function TugasTidakDikerjakan({ hariKeBelakang = 30 }) {
  const sejak = format(subDays(new Date(), hariKeBelakang), "yyyy-MM-dd");
  const sampai = format(new Date(), "yyyy-MM-dd");

  const { data: sopTasks = [] } = useQuery({
    queryKey: ["nolkali-sop-tasks"],
    queryFn: () => base44.entities.SOPTask.filter({ is_active: true }),
    staleTime: 5 * 60 * 1000,
  });

  const { data: logs = [] } = useQuery({
    queryKey: ["nolkali-logs", sejak],
    queryFn: () =>
      base44.entities.MaintenanceLog.filter(
        { enclosure_id: "tugas_harian", period_key: { $gte: sejak } },
        "-period_key",
        1000,
      ),
    staleTime: 5 * 60 * 1000,
  });

  const baris = useMemo(
    () => tugasNolKali(sopTasks, logs, { dari: sejak, sampai }),
    [sopTasks, logs, sejak, sampai],
  );
  const nol = useMemo(() => benarBenarNol(baris), [baris]);
  const terkunci = useMemo(() => tugasTerkunci(sopTasks), [sopTasks]);

  if (baris.length === 0 && terkunci.length === 0) return null;

  const poinNol = nol.reduce((s, b) => s + b.poinTerlewat, 0);
  const kaliNol = nol.reduce((s, b) => s + b.terjadwal, 0);

  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="flex items-start gap-2.5">
          <CalendarX className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
          <div className="min-w-0 flex-1">
            <h3 className="font-heading font-semibold text-[15px] leading-tight">
              Tugas yang tidak pernah dikerjakan
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              {hariKeBelakang} hari terakhir ·{" "}
              {nol.length === 0 ? (
                <span className="font-semibold text-green-700">
                  semua tugas terjadwal pernah dikerjakan
                </span>
              ) : (
                <>
                  <span className="font-semibold text-foreground">{nol.length} tugas</span> terjadwal{" "}
                  <span className="font-semibold text-foreground">{kaliNol} kali</span>, dikerjakan nol kali
                </>
              )}
            </p>
          </div>
        </div>

        <div className="mt-3 rounded-lg bg-muted/40 p-3 flex gap-2">
          <Info className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
          <p className="text-[11px] text-muted-foreground">
            Berbeda dari &quot;Tenggat vs jam kerja&quot;, yang mengukur keterlambatan.
            Yang ini mengukur ketiadaan — dan itu justru paling sulit terlihat, karena
            tugas yang tidak pernah dicentang tidak meninggalkan satu baris pun untuk
            dibaca. Tugas per-kandang dan rotasi timbang tidak ikut: keduanya dicatat
            dengan penanda lain, jadi nol di sini akan berarti salah.
          </p>
        </div>
      </div>

      {nol.length > 0 && (
        <div className="space-y-2">
          {nol.map((b) => (
            <div key={b.id} className="rounded-xl border border-amber-300 bg-amber-50/60 p-3">
              <p className="text-sm font-semibold line-clamp-2 break-words">{b.judul}</p>
              <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs tabular-nums">
                <span className="text-muted-foreground">
                  Jadwal <b className="text-foreground">{b.jadwal}</b>
                </span>
                <span className="text-muted-foreground">
                  Terjadwal <b className="text-foreground">{b.terjadwal}×</b>
                </span>
                <span className="font-semibold text-amber-800">dikerjakan 0×</span>
                {b.poinTerlewat > 0 && (
                  <span className="text-muted-foreground">
                    {b.poinTerlewat} poin tidak keluar
                  </span>
                )}
              </div>
            </div>
          ))}
          {poinNol > 0 && (
            <p className="text-[11px] text-muted-foreground px-1">
              Seluruhnya {poinNol} poin yang tidak pernah keluar karena pekerjaannya tidak
              tercatat.
            </p>
          )}
        </div>
      )}

      {nol.length === 0 && baris.length > 0 && (
        <div className="rounded-xl border border-green-200 bg-green-50 p-3 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
          <p className="text-xs text-green-800">
            Tiap tugas terjadwal pernah dikerjakan setidaknya sekali dalam rentang ini.
          </p>
        </div>
      )}

      {/*
        Kunci bahan dipisahkan, bukan dicampur ke daftar di atas. Tugas
        terkunci memang tidak dikerjakan, tetapi bukan karena dilalaikan —
        bahannya habis dan pemilik sendiri yang menguncinya.

        Yang perlu ditindak justru kuncinya. Sebuah kunci dipasang dengan niat
        dibuka lagi; catatan pada kunci azolla bahkan menuliskannya ("BUKA
        KEMBALI begitu kolam siap panen"). Tetapi sebelum bagian ini ada, tidak
        satu pun tempat di aplikasi mengingatkan bahwa ada kunci yang menunggu
        — dan kunci itu sudah terpasang sepuluh hari tanpa seorang pun ditanya.
      */}
      {terkunci.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 mb-2">
            <Lock className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            <h4 className="font-semibold text-sm">
              {terkunci.length} tugas sedang dikunci
            </h4>
          </div>
          <p className="text-[11px] text-muted-foreground mb-2.5">
            Tugas ini tidak dituntut dari tim dan tidak dibayar poin selama terkunci —
            itu memang benar. Yang perlu diperiksa: apakah sudah waktunya dibuka lagi?
          </p>
          <div className="space-y-2">
            {terkunci.map((k) => (
              <div key={k.id} className="rounded-lg border border-border bg-muted/30 p-2.5">
                <p className="text-sm font-medium line-clamp-2 break-words">{k.judul}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {k.jadwal} · {k.poin} poin
                </p>
                <p className="text-[11px] text-amber-800 mt-1 break-words">{k.alasan}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

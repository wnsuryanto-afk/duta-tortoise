import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Clock, AlertTriangle, CheckCircle2, Loader2, Info } from "lucide-react";
import { format, subDays } from "date-fns";
import { toast } from "sonner";
import { bandingkanTenggat, ringkasTenggat } from "@/lib/tenggatNyata";

/**
 * TenggatVsNyata — tenggat yang DITULIS, dibandingkan jam kerja yang TERJADI.
 *
 * ── Pertanyaan yang dijawab layar ini ──────────────────────────────────────
 *
 * "Kepatuhan SOP rendah, apa yang harus dilakukan supaya naik?"
 *
 * Jawaban yang wajar adalah menambah tekanan. Tapi diukur pada 296
 * pencentangan sepanjang 28 Agustus – 27 September 2026, 83% lewat tenggat —
 * dan sebaran jamnya menunjukkan tim yang justru SANGAT tetap iramanya:
 * "Cuci rumput (pagi)" median 08:28, delapan dari sepuluh hari selesai
 * sebelum 08:32. Empat menit sebaran dalam 26 hari.
 *
 * Yang meleset bukan kerjanya, melainkan tenggatnya. "Beri makan iguana"
 * bertenggat 07:30 dan lewat tenggat 31 dari 31 kali — jam masuk 07:00, dan
 * tugasnya nyatanya selesai median 08:36. Tenggat yang dilanggar 31 dari 31
 * kali bukan aturan yang dilanggar; ia aturan yang mustahil. Orang yang
 * menghadapinya belajar satu hal: tenggat di aplikasi ini tidak usah
 * dipedulikan — dan pelajaran itu terbawa ke tenggat yang benar-benar
 * penting, seperti jam pemberian obat.
 *
 * Maka yang dinaikkan lebih dulu bukan tekanannya, melainkan KEBENARAN
 * tenggatnya. Sesudah tenggat menggambarkan pekerjaan yang memang bisa
 * dilakukan, angka keterlambatan kembali berarti sesuatu.
 *
 * Layar ini tidak mengubah apa pun sendiri. Setiap penyetelan ditekan satu
 * per satu oleh pemilik, dan usulannya selalu ditulis apa adanya di sebelah
 * jam yang dipakai menghitungnya.
 */
export default function TenggatVsNyata({ hariKeBelakang = 30 }) {
  const qc = useQueryClient();
  const [menyimpan, setMenyimpan] = useState(null);
  const sejak = format(subDays(new Date(), hariKeBelakang), "yyyy-MM-dd");

  const { data: sopTasks = [] } = useQuery({
    queryKey: ["tenggat-sop-tasks"],
    queryFn: () => base44.entities.SOPTask.filter({ is_active: true }),
    staleTime: 5 * 60 * 1000,
  });

  const { data: logs = [] } = useQuery({
    queryKey: ["tenggat-logs", sejak],
    queryFn: () =>
      base44.entities.MaintenanceLog.filter(
        { enclosure_id: "tugas_harian", period_key: { $gte: sejak } },
        "-period_key",
        1000,
      ),
    staleTime: 5 * 60 * 1000,
  });

  const baris = useMemo(() => bandingkanTenggat(sopTasks, logs), [sopTasks, logs]);
  const ringkas = useMemo(() => ringkasTenggat(baris), [baris]);

  const setel = async (b) => {
    if (!b.usul || menyimpan) return;
    setMenyimpan(b.id);
    try {
      await base44.entities.SOPTask.update(b.id, { deadline_time: b.usul });
      await qc.invalidateQueries({ queryKey: ["tenggat-sop-tasks"] });
      qc.invalidateQueries({ queryKey: ["sop-tasks-active"] });
      qc.invalidateQueries({ queryKey: ["sop-tasks-active-tugas-hari-ini"] });
      qc.invalidateQueries({ queryKey: ["bonus-sop-tasks"] });
      toast.success(`Tenggat "${b.judul}" disetel ke ${b.usul}`);
    } catch (e) {
      toast.error("Gagal menyetel: " + (e?.message || e));
    } finally {
      setMenyimpan(null);
    }
  };

  if (baris.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">
        Belum ada catatan pengerjaan bertenggat dalam {hariKeBelakang} hari terakhir.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="flex items-start gap-2.5">
          <Clock className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
          <div className="min-w-0 flex-1">
            <h3 className="font-heading font-semibold text-[15px] leading-tight">
              Tenggat vs jam kerja sebenarnya
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              {hariKeBelakang} hari terakhir · {ringkas.total} pencentangan ·{" "}
              <span className="font-semibold text-foreground">{ringkas.persenTelat}% lewat tenggat</span>
            </p>
          </div>
        </div>

        {ringkas.mustahil > 0 && (
          <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 flex gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-amber-800">
              <b>{ringkas.mustahil} tenggat tidak pernah sekali pun terpenuhi.</b> Tenggat yang
              dilanggar setiap kali bukan aturan yang dilanggar — ia aturan yang mustahil, dan yang
              dipelajari orang darinya adalah bahwa tenggat di sini boleh diabaikan. Pelajaran itu
              ikut terbawa ke tenggat yang benar-benar penting.
            </p>
          </div>
        )}

        <div className="mt-3 rounded-lg bg-muted/40 p-3 flex gap-2">
          <Info className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
          <p className="text-[11px] text-muted-foreground">
            Usulan diambil dari jam <b>p80</b> — jam yang sudah mencakup delapan dari sepuluh hari —
            ditambah 10 menit kelonggaran. Tugas yang tenggatnya sudah lebih sering terpenuhi
            daripada dilanggar tidak diusulkan digeser: menurunkan standar pada pekerjaan yang sudah
            jalan bukan perbaikan.
          </p>
        </div>
      </div>

      <div className="space-y-2">
        {baris.map((b) => {
          const perlu = !!b.usul;
          return (
            <div
              key={b.id}
              className={`rounded-xl border p-3 ${
                b.mustahil
                  ? "border-amber-300 bg-amber-50/60"
                  : perlu
                  ? "border-border bg-card"
                  : "border-border bg-card opacity-75"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-semibold min-w-0 flex-1 line-clamp-2 break-words">
                  {b.judul}
                </p>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 whitespace-nowrap ${
                    // Ambangnya disamakan dengan ambang usulan (lebih dari
                    // separuh), supaya warnanya tidak pernah berkata "perlu
                    // perhatian" pada baris yang kalimatnya berkata "sudah
                    // sepadan". Tepat 50% masih hijau — dan memang tidak
                    // diusulkan digeser.
                    b.persenTelat >= 80
                      ? "bg-red-100 text-red-700"
                      : b.persenTelat > 50
                      ? "bg-amber-100 text-amber-800"
                      : "bg-green-100 text-green-700"
                  }`}
                >
                  {b.telat}/{b.jumlah} lewat
                </span>
              </div>

              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs tabular-nums">
                <span className="text-muted-foreground">
                  Tenggat <b className="text-foreground">{b.tenggat}</b>
                </span>
                <span className="text-muted-foreground">
                  Biasanya <b className="text-foreground">{b.median}</b>
                </span>
                <span className="text-muted-foreground">
                  8 dari 10 hari sebelum <b className="text-foreground">{b.p80}</b>
                </span>
              </div>

              {perlu ? (
                <div className="mt-2.5 flex items-center justify-between gap-2 flex-wrap">
                  <p className="text-xs text-muted-foreground min-w-0">
                    Usul tenggat baru: <b className="text-foreground tabular-nums">{b.usul}</b>
                    {b.mentokHariKerja && (
                      <>
                        {" "}— mentok batas hari kerja
                      </>
                    )}
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 flex-shrink-0"
                    disabled={menyimpan === b.id}
                    onClick={() => setel(b)}
                  >
                    {menyimpan === b.id && <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />}
                    Setel ke {b.usul}
                  </Button>
                </div>
              ) : (
                <p className={`mt-2 text-[11px] flex items-start gap-1 ${b.mentokHariKerja ? "text-amber-700" : "text-green-700"}`}>
                  {b.mentokHariKerja ? (
                    <>
                      <AlertTriangle className="w-3 h-3 flex-shrink-0 mt-0.5" />
                      {/* Tenggatnya sudah di batas hari kerja dan pekerjaannya
                          tetap lewat. Yang bisa diperbaiki bukan tenggatnya
                          lagi — menggesernya cuma memindahkan kemustahilan ke
                          sesudah jam pulang. */}
                      <span>
                        Sudah di batas hari kerja dan masih lewat. Yang perlu ditinjau jadwalnya,
                        bukan tenggatnya — pekerjaan ini tidak muat sebelum jam pulang.
                      </span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-3 h-3 flex-shrink-0 mt-0.5" />
                      <span>Tenggatnya sudah sepadan — tidak perlu digeser.</span>
                    </>
                  )}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

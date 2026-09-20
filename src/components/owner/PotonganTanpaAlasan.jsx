import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { FileWarning, Loader2 } from "lucide-react";
import { format, parseISO } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { useCompanySettings } from "@/lib/useCompanySettings";

/**
 * PotonganTanpaAlasan — daftar pemotongan poin yang terjadi SEBELUM alasan
 * diwajibkan.
 *
 * Ini LAPORAN SAJA. Tidak ada satu baris pun yang diubah: keputusan apa yang
 * hendak dilakukan terhadap poin yang sudah hangus adalah keputusan pemilik,
 * bukan keputusan yang boleh diambil diam-diam oleh sebuah pembaruan.
 *
 * Pada 20 September 2026 isinya lima baris, seluruhnya sejak 1 September:
 *
 *     15 Sep  Sholehuddin  206 → 10    (−196)
 *     12 Sep  Angsolo      181 → 15    (−166)
 *     12 Sep  Sholehuddin  206 → 173   (−33)
 *      4 Sep  Sholehuddin  221 → 183   (−38)
 *      4 Sep  Angsolo      196 → 181   (−15)
 *
 * Totalnya 448 poin. Dengan nilai poin Rp 75 dan bonus poin yang menyala, itu
 * Rp 33.600 yang tidak pernah dijelaskan kepada yang kehilangannya.
 */
export default function PotonganTanpaAlasan({ sejak = "2026-09-01" }) {
  const pengaturan = useCompanySettings();

  const { data: checklists = [], isLoading } = useQuery({
    queryKey: ["potongan-tanpa-alasan", sejak],
    queryFn: () => base44.entities.DailyChecklist.filter({ status: "approved" }, "-date", 500),
  });

  const baris = (checklists || [])
    .filter((c) => !c.excluded_from_reports && !c.is_test_data)
    .filter((c) => c.date >= sejak)
    .filter((c) => Number(c.approved_points || 0) < Number(c.total_points_claimed || 0))
    .filter((c) => !String(c.rejection_reason || "").trim())
    .map((c) => ({
      id: c.id,
      tanggal: c.date,
      nama: c.employee_name,
      diklaim: Number(c.total_points_claimed || 0),
      disetujui: Number(c.approved_points || 0),
      oleh: c.approved_by || "—",
    }))
    .sort((a, b) => String(b.tanggal).localeCompare(String(a.tanggal)));

  if (isLoading) {
    return (
      <div className="rounded-xl border border-border bg-card p-4 flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="w-4 h-4 animate-spin" /> Memeriksa riwayat pemotongan…
      </div>
    );
  }

  if (baris.length === 0) return null;

  const totalHilang = baris.reduce((t, b) => t + (b.diklaim - b.disetujui), 0);
  const nilaiPoin = Number(pengaturan?.nilai_per_poin || 0);
  const berupaUang = pengaturan?.poin_bonus_enabled === true && nilaiPoin > 0;

  return (
    <div className="rounded-xl border border-amber-500/30 bg-amber-500/8 p-4">
      <div className="flex items-start gap-2.5">
        <FileWarning className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-sm">
            {baris.length} pemotongan poin tanpa alasan tercatat
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Terjadi sebelum alasan diwajibkan. Total <strong>{totalHilang} poin</strong>
            {berupaUang
              ? ` — setara Rp ${(totalHilang * nilaiPoin).toLocaleString("id-ID")}`
              : ""}
            . Daftar ini hanya melaporkan; tidak ada data yang diubah.
          </p>
        </div>
      </div>

      <div className="mt-3 flex flex-col gap-1.5">
        {baris.map((b) => (
          <div
            key={b.id}
            className="flex items-center gap-3 rounded-lg border border-border bg-card px-3 py-2"
          >
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">{b.nama}</p>
              <p className="text-[11px] text-muted-foreground">
                {format(parseISO(b.tanggal), "EEEE, d MMM", { locale: idLocale })} · oleh {b.oleh}
              </p>
            </div>
            <p className="text-sm tabular-nums flex-shrink-0">
              {b.diklaim} → <strong>{b.disetujui}</strong>
              <span className="text-amber-700 dark:text-amber-500">
                {" "}−{b.diklaim - b.disetujui}
              </span>
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

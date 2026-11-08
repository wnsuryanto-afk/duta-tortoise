import { Card } from "@/components/ui/card";
import { Puzzle } from "lucide-react";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";

/**
 * PanelTelurRetak — telur retak yang masih dierami, dari seluruh clutch.
 *
 * ── Kenapa daftar ini ada ───────────────────────────────────────────────────
 *
 * Permintaannya 8 Nov 2026: telur retak "perlu perlakuan dan perlu pendataan,
 * kita jadi bisa sendirikan supaya ada perhatian lebih".
 *
 * Menandainya saja tidak cukup. Tanda retak hidup di dalam satu clutch, dan
 * clutch dibuka satu per satu — kalau ada telur retak di tiga batch berbeda,
 * tidak ada layar yang pernah menunjukkan ketiganya sekaligus. Yang perlu
 * perhatian justru yang tersebar.
 *
 * ── Yang TIDAK masuk daftar ─────────────────────────────────────────────────
 *
 * Telur retak yang sudah menetas: ia sudah jadi kura, perlakuannya selesai,
 * dan hasilnya sudah tercatat. Telur retak yang sudah dinyatakan gagal atau
 * infertil: tidak ada lagi yang bisa dikerjakan. Dan clutch yang sudah
 * ditutup: telurnya tidak lagi dierami siapa pun.
 *
 * Daftar kerja yang memuat pekerjaan yang sudah selesai adalah daftar kerja
 * yang berhenti dibaca.
 */
export default function PanelTelurRetak({ telur = [] }) {
  if (!telur.length) return null;

  const tgl = (s) => {
    if (!s) return null;
    const d = new Date(s);
    return Number.isNaN(d.getTime()) ? null : format(d, "d MMM yyyy", { locale: localeId });
  };

  return (
    <Card className="p-4 border-orange-300 bg-orange-50 dark:bg-orange-950/30">
      <div className="flex items-start gap-2">
        <Puzzle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-sm text-orange-900 dark:text-orange-200 break-words">
            {telur.length} telur retak masih dierami
          </p>
          <p className="text-xs text-orange-800 dark:text-orange-300 mt-0.5 leading-relaxed">
            Perlu perlakuan dan pemantauan lebih sering. Telur retak tetap bisa
            menetas — statusnya berjalan seperti telur lain.
          </p>
          <div className="mt-3 space-y-2">
            {telur.map((t) => (
              <div
                key={`${t.breeding_id}-${t.egg_number}`}
                className="flex items-start justify-between gap-2 flex-wrap bg-white/70 dark:bg-background/50 rounded-lg p-2.5 border border-orange-200 dark:border-orange-800"
              >
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground break-words">
                    Telur #{t.egg_number}
                    <span className="font-normal text-muted-foreground"> · {t.pasangan}</span>
                  </p>
                  <p className="text-[11px] text-muted-foreground break-words">
                    {t.status === "belum_dicek" ? "belum dicek" : t.status}
                    {t.incubator_name ? ` · ${t.incubator_name}` : ""}
                    {tgl(t.egg_laying_date) ? ` · bertelur ${tgl(t.egg_laying_date)}` : ""}
                  </p>
                  {t.retak_catatan && (
                    <p className="text-[11px] text-foreground mt-0.5 break-words">
                      <span className="text-muted-foreground">Perlakuan:</span> {t.retak_catatan}
                    </p>
                  )}
                </div>
                <a
                  href={`/breeding?tab=telur&open=${t.breeding_id}`}
                  className="text-xs text-primary hover:underline flex-shrink-0 mt-0.5"
                >
                  Buka
                </a>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Card>
  );
}

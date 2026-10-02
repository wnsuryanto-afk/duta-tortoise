import { Link } from "react-router-dom";
import { AlertTriangle, Layers } from "lucide-react";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { clutchTanpaTray, bentrokTrayAktif } from "@/lib/trayTelur";

/**
 * PeringatanTray — telur yang induknya akan hilang saat menetas.
 *
 * ── Kenapa kartu ini ada ───────────────────────────────────────────────────
 *
 * Tray adalah satu-satunya hal yang membedakan telur induk A dari induk B
 * setelah keduanya masuk inkubator yang sama. Seluruh 208 telur yang sedang
 * dierami ada di Inkubator 1.
 *
 * Diperiksa 2 Okt 2026: hanya 41 dari 208 butir (20%) yang induknya pasti
 * bisa ditelusuri. 127 butir traynya kosong, dan 40 butir lagi berbagi tray 8
 * antara dua induk yang berbeda. Menetas pertama 31 Okt.
 *
 * Yang hilang bukan cuma catatan. Aplikasi ini sedang dipakai untuk menjawab
 * "betina mana yang produktif" — dan jawabannya dibangun dari catatan induk
 * per clutch. Telur yang sampai ke penetasan tanpa tray memutus rantai itu
 * tepat di langkah terakhir, dan tidak bisa disambung lagi.
 *
 * Kartunya diam sendiri begitu semua clutch punya tray yang tidak bentrok.
 */
export default function PeringatanTray({ breedings = [] }) {
  const tanpaTray = clutchTanpaTray(breedings);
  const bentrok = bentrokTrayAktif(breedings);
  if (tanpaTray.length === 0 && bentrok.length === 0) return null;

  const butir = (daftar) => daftar.reduce((s, b) => s + (Number(b.egg_count) || 0), 0);
  const tgl = (b) =>
    b.egg_laying_date
      ? format(new Date(b.egg_laying_date), "d MMM", { locale: idLocale })
      : "—";

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-3">
      <div className="flex items-start gap-2.5">
        <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
        <div className="min-w-0">
          <p className="font-semibold text-amber-900 text-sm">
            Telur yang induknya bisa hilang saat menetas
          </p>
          <p className="text-xs text-amber-800 mt-0.5">
            Semua clutch ada di inkubator yang sama, jadi tray adalah satu-satunya
            yang membedakan telur induk satu dari induk lain. Begitu menetas,
            telur tanpa tray tidak bisa lagi dihubungkan ke induknya.
          </p>
        </div>
      </div>

      {tanpaTray.length > 0 && (
        <div className="bg-background/60 rounded-lg p-3">
          <p className="text-xs font-semibold text-amber-900 mb-1.5">
            {tanpaTray.length} clutch belum punya tray &mdash; {butir(tanpaTray)} butir
          </p>
          <div className="flex flex-wrap gap-x-3 gap-y-1">
            {tanpaTray.map((b) => (
              <Link
                key={b.id}
                to={`/breeding-detail?id=${b.id}`}
                className="text-xs text-amber-900 underline underline-offset-2 hover:no-underline"
              >
                {b.female_name || "?"} {tgl(b)} ({b.egg_count || 0})
              </Link>
            ))}
          </div>
        </div>
      )}

      {bentrok.length > 0 && (
        <div className="bg-background/60 rounded-lg p-3">
          <p className="text-xs font-semibold text-amber-900 mb-1.5 flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 flex-shrink-0" />
            {bentrok.length} tray dipakai lebih dari satu induk
          </p>
          {bentrok.map(({ tray, clutch }) => (
            <p key={tray} className="text-xs text-amber-900">
              <span className="font-medium">Tray {tray}:</span>{" "}
              {clutch.map((b) => `${b.female_name || "?"} ${tgl(b)} (${b.egg_count || 0})`).join("  +  ")}
              {" "}&mdash; {butir(clutch)} butir tercampur
            </p>
          ))}
        </div>
      )}

      <p className="text-[11px] text-amber-800">
        Isi traynya lewat Edit pada kartu clutch. Satu clutch boleh memakai lebih
        dari satu tray &mdash; tulis saja &ldquo;1, 2&rdquo;.
      </p>
    </div>
  );
}

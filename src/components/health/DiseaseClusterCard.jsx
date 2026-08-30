/**
 * DiseaseClusterCard — kartu presentasi untuk satu kluster penyakit.
 * Dipakai di kartu peringatan dashboard maupun halaman riwayat kluster.
 * Murni presentasi; tidak mengakses data sendiri.
 */
import { AlertTriangle, X } from "lucide-react";
import { format, parseISO } from "date-fns";
import { id as idLocale } from "date-fns/locale";

export default function DiseaseClusterCard({ cluster: c, onDismiss }) {
  const span = c.span_days;
  const same = c.same_enclosure;
  const enclosureList = c.enclosures.join(", ");
  const tanggal =
    c.start_date === c.end_date
      ? format(parseISO(c.start_date), "d MMM yyyy", { locale: idLocale })
      : `${format(parseISO(c.start_date), "d MMM", { locale: idLocale })} – ${format(parseISO(c.end_date), "d MMM yyyy", { locale: idLocale })}`;

  return (
    <div className="rounded-xl border-2 border-orange-300 bg-orange-50 p-4 animate-fade-in">
      <div className="flex items-start gap-2">
        <AlertTriangle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-orange-800">
            Kemungkinan penyebab bersama — {c.count} kura terkena {c.diagnosis_name.toLowerCase()}{" "}
            {span === 0 ? "pada tanggal yang sama" : `dalam ${span} hari`}
          </p>
          <p className="text-xs text-orange-700 mt-1">
            {same
              ? `Semua di kandang ${c.enclosures[0] || "?"} — periksa kebersihan kandang dan kemungkinan penularan.`
              : `Tersebar di ${c.enclosures.length} kandang berbeda (${enclosureList}) — kemungkinan penyebab bersama dari pakan, air, atau cuaca.`}
          </p>
          <p className="text-xs text-orange-700 mt-0.5">
            Periksa: pergantian jenis pakan, cuaca, atau kualitas air pada tanggal {tanggal}.
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {c.tortoises.map((t, i) => (
              <span
                key={i}
                className="text-[11px] bg-card border border-orange-200 rounded-full px-2 py-0.5 text-orange-800"
              >
                {t.name} · {t.enclosure} · {format(parseISO(t.date), "d MMM", { locale: idLocale })}
              </span>
            ))}
          </div>
        </div>
        {onDismiss && (
          <button
            onClick={onDismiss}
            title="Tandai sudah ditinjau"
            className="flex-shrink-0 p-1 rounded-lg hover:bg-orange-100 text-orange-600"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}
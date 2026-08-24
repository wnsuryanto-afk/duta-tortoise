/**
 * ParentHealthBadges — lencana ringkasan kesehatan induk di kartu/halaman
 * rincian Breeding. Membaca HealthRecord (murni membaca), menampilkan:
 *   - merah "Sedang dalam perawatan" bila induk sedang sakit saat pembiakan dicatat
 *   - kuning "Pernah sakit N hari lalu — [diagnosis]" bila sakit dalam 90 hari
 * Bila tidak ada riwayat, tidak menampilkan apa pun.
 */
import { parentHealthSummary } from "@/lib/parentHealthUtils";

function Badge({ tone, children }) {
  const cls =
    tone === "red"
      ? "bg-red-100 text-red-700 border-red-200"
      : "bg-yellow-100 text-yellow-700 border-yellow-200";
  return (
    <span className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full border ${cls}`}>
      {children}
    </span>
  );
}

function OneParent({ label, summary }) {
  if (!summary) return null;
  if (summary.kind === "sick") {
    return (
      <Badge tone="red">
        {label} · Sedang dalam perawatan
      </Badge>
    );
  }
  return (
    <Badge tone="yellow">
      {label} · Pernah sakit {summary.days} hari lalu — {summary.diagnosis}
    </Badge>
  );
}

export default function ParentHealthBadges({
  maleId,
  femaleId,
  maleName,
  femaleName,
  healthRecords = [],
  refDate,
}) {
  const male = maleId ? parentHealthSummary(maleId, healthRecords, refDate) : null;
  const female = femaleId ? parentHealthSummary(femaleId, healthRecords, refDate) : null;
  if (!male && !female) return null;

  const maleLabel = maleName ? `♂ ${maleName}` : "♂ Jantan";
  const femaleLabel = femaleName ? `♀ ${femaleName}` : "♀ Betina";

  return (
    <div className="flex flex-wrap gap-1.5 mt-1.5">
      <OneParent label={maleLabel} summary={male} />
      <OneParent label={femaleLabel} summary={female} />
    </div>
  );
}
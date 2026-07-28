/**
 * AICatatanCard — kartu "💬 Catatan untuk kamu" untuk keeper/feeder.
 * Menampilkan apresiasi + saran dari AI (bukan penilaian teknis).
 * Jangan tampilkan saran jika keyakinan AI < 60 (hindari teguran keliru).
 * Owner note ("📣 Dari Owner") selalu tampil jika ada.
 */
export default function AICatatanCard({ aiSaran, enabled = true }) {
  if (!aiSaran || !enabled) return null;
  const { apresiasi, saran, keyakinan, ownerNote } = aiSaran;

  // Jangan tampilkan saran AI jika keyakinan < 60 — cukup owner note saja
  const showAI = keyakinan == null || keyakinan >= 60;
  if (!showAI && !ownerNote) return null;

  return (
    <div className="mt-2 space-y-1.5" onClick={e => e.stopPropagation()}>
      {showAI && (apresiasi || saran) && (
        <div className="rounded-lg bg-blue-50 border border-blue-100 p-2.5 space-y-0.5">
          <p className="text-[10px] font-bold text-blue-600">💬 Catatan untuk kamu</p>
          {apresiasi && <p className="text-xs text-blue-800">{apresiasi}</p>}
          {saran && <p className="text-xs text-blue-700 italic">{saran}</p>}
        </div>
      )}
      {ownerNote && (
        <div className="rounded-lg bg-amber-50 border border-amber-200 p-2.5 space-y-0.5">
          <p className="text-[10px] font-bold text-amber-600">📣 Dari Owner</p>
          <p className="text-xs text-amber-800">{ownerNote}</p>
        </div>
      )}
    </div>
  );
}
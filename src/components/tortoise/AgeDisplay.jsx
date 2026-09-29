import { calcAgeCategory, formatAge } from "@/lib/umurKura";

/**
 * Lencana umur di kartu kura.
 *
 * Rumus umurnya sendiri pindah ke lib/umurKura.js. Sebelumnya ia tinggal di
 * berkas komponen ini, dan itulah sebabnya ia hanya pernah dipakai untuk
 * MEWARNAI: yang mengambil keputusan — jadwal timbang, misalnya — tidak akan
 * pernah mengimpor berkas komponen hanya untuk bertanya berapa umur seekor
 * kura. Sekarang keduanya memakai rumus yang sama.
 */
export { calcAgeCategory, formatAge };

export function AgeBadge({ birthDate, className = "" }) {
  if (!birthDate) {
    return (
      <span className={`inline-flex items-center text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground border border-border ${className}`}>
        Umur tidak diketahui
      </span>
    );
  }
  const cat = calcAgeCategory(birthDate);
  const label = formatAge(birthDate);
  const colors = {
    baby: "bg-sky-100 text-sky-700 border-sky-200",
    juvenile: "bg-amber-100 text-amber-700 border-amber-200",
    dewasa: "bg-green-100 text-green-700 border-green-200",
  };
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full border font-medium ${colors[cat] || ""} ${className}`}>
      🐢 {label}
    </span>
  );
}

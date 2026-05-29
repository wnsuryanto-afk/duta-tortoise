/**
 * Helper: hitung age_category dan label umur dari birth_date
 */
export function calcAgeCategory(birthDate) {
  if (!birthDate) return null;
  const birth = new Date(birthDate);
  const now = new Date();
  const diffMs = now - birth;
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  const diffMonths = diffDays / 30.44;
  const diffYears = diffDays / 365.25;

  if (diffYears < 1) return "baby";
  if (diffYears < 3) return "juvenile";
  return "dewasa";
}

export function formatAge(birthDate) {
  if (!birthDate) return null;
  const birth = new Date(birthDate);
  const now = new Date();
  let years = now.getFullYear() - birth.getFullYear();
  let months = now.getMonth() - birth.getMonth();
  if (months < 0) { years--; months += 12; }
  if (years === 0) return `${months} bulan`;
  if (months === 0) return `${years} tahun`;
  return `${years} tahun ${months} bulan`;
}

export function AgeBadge({ birthDate, className = "" }) {
  if (!birthDate) {
    return (
      <span className={`inline-flex items-center text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500 border border-gray-200 ${className}`}>
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
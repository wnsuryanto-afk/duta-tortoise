/**
 * Bobot perkiraan waktu pengerjaan → poin untuk usulan tugas keeper.
 * Keeper memilih bobot (bukan angka poin bebas); sistem menentukan poinnya.
 * Poin akhir masih bisa diubah owner/manajer/admin saat meninjau usulan.
 */
export const BOBOT_OPTIONS = [
  { value: "ringan", label: "Ringan", desc: "di bawah 30 menit", points: 10 },
  { value: "sedang", label: "Sedang", desc: "30 menit – 2 jam", points: 25 },
  { value: "berat", label: "Berat", desc: "lebih dari 2 jam", points: 50 },
];

export const BOBOT_POINTS = BOBOT_OPTIONS.reduce((m, o) => {
  m[o.value] = o.points;
  return m;
}, {});

export function pointsForBobot(bobot) {
  return BOBOT_POINTS[bobot] ?? 10;
}
/**
 * breedingCalendarUtils — perhitungan perkiraan tanggal breeding & deteksi "segera".
 * Durasi khas sulcata: bertelur ±30-45 hari setelah kawin; inkubasi ±80-105 hari setelah bertelur.
 * Semua perkiraan ditandai ± (rentang, bukan tanggal pasti).
 */
import { addDays, differenceInDays, parseISO } from "date-fns";
import { STATUS_ADA_HASIL } from "@/lib/hasilInkubasi";

const EGG_LAY_MIN_DAYS = 30;
const EGG_LAY_MAX_DAYS = 45;
const HATCH_MIN_DAYS = 80;
const HATCH_MAX_DAYS = 105;

const parse = (d) => {
  if (!d) return null;
  try { return typeof d === "string" ? parseISO(d) : d; } catch { return null; }
};

/**
 * Bangun milestone breeding dari record Breeding.
 * Estimasi dihitung hanya jika tanggal pasti belum ada.
 */
export function getBreedingMilestones(b) {
  const mating = parse(b.mating_date);
  const eggLaying = parse(b.egg_laying_date);
  const hatch = parse(b.hatch_date);
  const completed = parse(b.completed_date);

  // Perkiraan bertelur: mating + 30-45 hari (hanya jika belum ada egg_laying_date)
  const estEggLayStart = !eggLaying && mating ? addDays(mating, EGG_LAY_MIN_DAYS) : null;
  const estEggLayEnd = !eggLaying && mating ? addDays(mating, EGG_LAY_MAX_DAYS) : null;

  // Perkiraan menetas: gunakan entity field jika ada, fallback egg_laying + 80-105
  let estHatchStart = parse(b.estimated_hatch_start);
  let estHatchEnd = parse(b.estimated_hatch_end);
  if (!estHatchStart && eggLaying) {
    estHatchStart = addDays(eggLaying, HATCH_MIN_DAYS);
    estHatchEnd = addDays(eggLaying, HATCH_MAX_DAYS);
  } else if (!estHatchStart && estEggLayStart) {
    estHatchStart = addDays(estEggLayStart, HATCH_MIN_DAYS);
    estHatchEnd = addDays(estEggLayEnd, HATCH_MAX_DAYS);
  }

  return {
    mating, eggLaying, hatch, completed,
    estEggLayStart, estEggLayEnd,
    estHatchStart, estHatchEnd,
    hasTimeline: !!(mating || eggLaying),
  };
}

/**
 * Batch "segera" jika perkiraan bertelur atau menetas dalam 14 hari ke depan.
 * Batch sudah menetas/selesai/gagal tidak dianggap segera.
 */
export function isBatchSegera(b, now = new Date()) {
  // Daftarnya dari lib/hasilInkubasi.js — jangan ditulis ulang di sini.
  if (STATUS_ADA_HASIL.includes(b.status)) return false;
  const m = getBreedingMilestones(b);

  const within14 = (start, end) => {
    if (!start) return false;
    const daysToStart = differenceInDays(start, now);
    const daysToEnd = end ? differenceInDays(end, now) : daysToStart;
    return daysToStart <= 14 && daysToEnd >= 0;
  };

  if (b.egg_laying_date) {
    return within14(m.estHatchStart, m.estHatchEnd);
  }
  return within14(m.estEggLayStart, m.estEggLayEnd) || within14(m.estHatchStart, m.estHatchEnd);
}

/**
 * Milestone berikutnya untuk batch aktif (untuk ditampilkan di Ringkasan Pagi).
 */
export function getNextMilestone(b, now = new Date()) {
  const m = getBreedingMilestones(b);
  if (!b.egg_laying_date && m.estEggLayStart) {
    return { label: "Perkiraan bertelur", start: m.estEggLayStart, end: m.estEggLayEnd };
  }
  if (m.estHatchStart && !m.hatch) {
    return { label: "Perkiraan menetas", start: m.estHatchStart, end: m.estHatchEnd };
  }
  return null;
}
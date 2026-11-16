/**
 * beratKandang.js — berat badan per kandang & kebutuhan pakan hariannya.
 *
 * Aturannya 3,5% dari berat badan per hari (dipakai laporan ini apa adanya).
 *
 * ── Kenapa beratnya diambil dari CATATAN TIMBANG, bukan dari kolom di Tortoise
 *
 * Yang dipakai adalah catatan timbang TERBARU tiap kura (MeasurementHistory).
 * Kura yang belum pernah ditimbang TIDAK diisi angka tebakan: ia dihitung
 * sebagai "belum ditimbang" dan dikeluarkan dari jumlah berat. Total berat
 * yang lebih kecil daripada kenyataan masih bisa dipakai; total yang dipenuhi
 * tebakan akan membuat porsi pakan terlihat benar padahal bukan.
 */

export const PORSI_HARIAN = 0.035;

/** Catatan timbang terbaru per kura: Map<tortoise_id, measurement>. */
export function beratTerbaruPerKura(measurements = []) {
  const peta = new Map();
  for (const m of measurements || []) {
    const id = m?.tortoise_id;
    if (!id) continue;
    const berat = Number(m.weight_grams);
    if (!(berat > 0)) continue;
    const lama = peta.get(id);
    if (!lama || String(m.date || "") >= String(lama.date || "")) peta.set(id, m);
  }
  return peta;
}

/**
 * Rekap per kandang.
 * Mengembalikan { baris, total } — `baris` sudah terurut menurut nama kandang.
 */
export function rekapPerKandang({ tortoises = [], measurements = [], enclosures = [] } = {}) {
  const namaKandang = new Map((enclosures || []).map((e) => [e.id, e.name]));
  const terbaru = beratTerbaruPerKura(measurements);
  const peta = new Map();

  const pastikan = (kunci, nama) => {
    if (!peta.has(kunci)) {
      peta.set(kunci, {
        id: kunci === "tanpa_kandang" ? "" : kunci,
        nama,
        jumlahKura: 0,
        jumlahDitimbang: 0,
        belumDitimbang: 0,
        totalBeratGram: 0,
      });
    }
    return peta.get(kunci);
  };

  for (const t of tortoises || []) {
    const kunci = t.enclosure_id || "tanpa_kandang";
    const nama = kunci !== "tanpa_kandang"
      ? (namaKandang.get(kunci) || t.enclosure || kunci)
      : (t.enclosure || "Tanpa kandang");
    const baris = pastikan(kunci, nama);
    baris.jumlahKura += 1;

    const ukur = terbaru.get(t.id);
    const berat = ukur ? Number(ukur.weight_grams) || 0 : 0;
    if (berat > 0) {
      baris.jumlahDitimbang += 1;
      baris.totalBeratGram += berat;
    } else {
      baris.belumDitimbang += 1;
    }
  }

  const baris = [...peta.values()]
    .map((b) => {
      const totalBeratKg = b.totalBeratGram / 1000;
      return { ...b, totalBeratKg, kebutuhanKg: totalBeratKg * PORSI_HARIAN };
    })
    .sort((a, b) => String(a.nama).localeCompare(String(b.nama)));

  const total = baris.reduce(
    (acc, b) => ({
      jumlahKura: acc.jumlahKura + b.jumlahKura,
      jumlahDitimbang: acc.jumlahDitimbang + b.jumlahDitimbang,
      belumDitimbang: acc.belumDitimbang + b.belumDitimbang,
      totalBeratKg: acc.totalBeratKg + b.totalBeratKg,
      kebutuhanKg: acc.kebutuhanKg + b.kebutuhanKg,
    }),
    { jumlahKura: 0, jumlahDitimbang: 0, belumDitimbang: 0, totalBeratKg: 0, kebutuhanKg: 0 },
  );

  return { baris, total };
}
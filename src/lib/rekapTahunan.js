/**
 * rekapTahunan.js — berapa telur per TAHUN, dan bedanya dengan tahun lalu.
 *
 * ── Pertanyaan yang dijawab ──────────────────────────────────────────────
 *
 * "Tahun ini berapa telur, tahun kemarin berapa?" Sampai sekarang angka itu
 * hanya bisa didapat dengan menjumlahkan sendiri dari daftar clutch, dan
 * halaman Statistik hanya pernah menghitung TAHUN BERJALAN — tidak ada
 * pembandingnya.
 *
 * ── Tahun diambil dari TANGGAL BERTELUR, bukan `season_year` ─────────────
 *
 * Keduanya sejalan di data hari ini (keempat belas clutch: 2026), tetapi
 * `season_year` adalah label yang diketik, sedangkan `egg_laying_date`
 * adalah kejadiannya. Label bisa salah ketik; kejadiannya tidak.
 * `season_year` tetap dipakai sebagai cadangan untuk clutch yang tanggalnya
 * belum diisi — tanpa itu catatan baru yang tanggalnya menyusul akan hilang
 * dari rekap.
 *
 * Tahunnya dipotong dari TEKS, bukan lewat `new Date`. Alasannya sama
 * dengan saringan bulan di cariInduk.js: `new Date("2026-01-01")` dibaca
 * tengah malam UTC, dan di zona waktu barat Greenwich tanggal itu jatuh ke
 * 31 Desember tahun sebelumnya — clutch pertama tiap tahun akan terhitung
 * di tahun yang salah.
 *
 * ── Tahun kosong TETAP ditampilkan ──────────────────────────────────────
 *
 * Tahun yang diminta tetapi tidak punya catatan dikembalikan dengan
 * `adaCatatan: false`, bukan dibuang. Bedanya penting: "0 telur" berarti
 * induknya tidak bertelur, sedangkan kenyataannya untuk 2025 adalah
 * aplikasi ini belum dipakai — catatan pertama dibuat 17 Mei 2026.
 * Menampilkan nol tanpa keterangan itu akan terbaca sebagai setahun penuh
 * tanpa seekor pun bertelur.
 */
import { ringkasProduksi } from "@/lib/hasilInkubasi";
import { rapikan } from "@/lib/cariInduk";

/** Tahun sebuah clutch; null bila tidak bisa ditentukan. */
export function tahunClutch(clutch) {
  const m = String(clutch?.egg_laying_date ?? "").match(/^(\d{4})/);
  if (m) return Number(m[1]);
  const musim = Number(clutch?.season_year);
  return Number.isFinite(musim) && musim > 0 ? musim : null;
}

/**
 * Rekap per tahun, terbaru dulu.
 *
 * @param {Array} breedings seluruh catatan pembiakan
 * @param {object} [opsi]
 * @param {number} [opsi.tahunIni]      tahun berjalan (bawaan: hari ini)
 * @param {number} [opsi.minimalTahun]  berapa tahun terakhir yang WAJIB ada
 *                                      di hasil meski kosong (bawaan 2)
 * @returns {Array<{tahun, adaCatatan, clutch, induk, telur, telurAdaHasil,
 *                  telurMasihDierami, menetas, hatchRate, selisihTelur}>}
 */
export function rekapTahunan(breedings = [], opsi = {}) {
  const { tahunIni = new Date().getFullYear(), minimalTahun = 2 } = opsi;

  const perTahun = new Map();
  for (const b of breedings || []) {
    const t = tahunClutch(b);
    if (t === null) continue;
    if (!perTahun.has(t)) perTahun.set(t, []);
    perTahun.get(t).push(b);
  }

  // Tahun berjalan dan beberapa tahun sebelumnya selalu muncul.
  for (let i = 0; i < Math.max(1, minimalTahun); i += 1) {
    const t = tahunIni - i;
    if (!perTahun.has(t)) perTahun.set(t, []);
  }

  const baris = [...perTahun.entries()]
    .map(([tahun, clutches]) => {
      const r = ringkasProduksi(clutches);
      const induk = new Set(clutches.map((c) => rapikan(c?.female_name)).filter(Boolean));
      return {
        tahun,
        adaCatatan: clutches.length > 0,
        clutch: clutches.length,
        induk: induk.size,
        telur: r.totalTelur,
        telurAdaHasil: r.telurAdaHasil,
        telurMasihDierami: r.telurMasihDierami,
        menetas: r.totalMenetas,
        hatchRate: r.hatchRate,
      };
    })
    .sort((a, b) => b.tahun - a.tahun);

  /*
   * Selisih hanya dihitung bila tahun pembandingnya PUNYA catatan.
   * "+304 butir dibanding 2025" untuk tahun yang aplikasinya belum dipakai
   * bukan pertumbuhan — itu hanya tanda kapan pencatatan dimulai.
   */
  return baris.map((b, i) => {
    const sebelum = baris[i + 1];
    return {
      ...b,
      selisihTelur: sebelum && sebelum.adaCatatan && b.adaCatatan ? b.telur - sebelum.telur : null,
    };
  });
}

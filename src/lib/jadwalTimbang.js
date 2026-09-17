/**
 * jadwalTimbang.js — SATU definisi "kura mana yang perlu ditimbang hari ini".
 *
 * Kembarannya di backend: base44/shared/timbang.ts. Dijaga cek-kembar.
 *
 * ── KENAPA ATURANNYA BERUBAH (17-09-2026) ──────────────────────────
 *
 * Sampai hari ini penimbangan berjalan dengan ROTASI: dua kura dewasa
 * dipilih tiap hari, yang paling lama tidak ditimbang lebih dulu, dengan
 * jeda minimal 60 hari. Di atas kertas seluruh kawanan tersapu dalam dua
 * bulan.
 *
 * Yang benar-benar terjadi berbeda. Dari 120 kura dewasa aktif:
 *
 *     44 ekor  berat terakhir 12 Juli 2025   (14 bulan)
 *     ~40 ekor Mei 2026
 *     ~30 ekor Juli 2026
 *      6 ekor  Agustus–September 2026
 *
 * Rotasinya tidak pernah menyelesaikan satu putaran pun. Kura dewasa sulit
 * dipegang — 20–37 kg dan tidak mau diam — jadi tugas itu sering terlewat,
 * dan yang terlewat kembali ke antrean tanpa pernah naik ke atas.
 *
 * Menghentikan rotasi karena itu bukan kehilangan: ia sudah tidak berjalan.
 * Yang diganti adalah janji palsu "semua tersapu tiap 60 hari" dengan
 * pemicu yang benar-benar bisa dikerjakan.
 *
 * ── TIGA PEMICU ────────────────────────────────────────────────────
 *
 *   1. TIDAK MAKAN     — kiper melaporkannya, laporan belum ditutup, dan
 *                        belum ditimbang sesudah laporan itu.
 *   2. SEDANG DIOBATI   — dosis obat dibagi dengan berat; berat 14 bulan
 *                        lalu bukan dasar yang boleh dipakai menghitung
 *                        dosis. Ini satu-satunya pemicu yang menyentuh
 *                        keselamatan langsung.
 *   3. BABY & JUVENILE  — tetap rutin tiap 14 hari. Merekalah yang paling
 *                        cepat berubah, paling mudah dipegang, dan dua
 *                        baby yang turun berat 16-09-2026 ketahuan justru
 *                        karena rutin ini.
 *
 * Kura dewasa yang sehat dan makan tidak lagi masuk daftar sama sekali.
 */

/** Hari antara dua tanggal "YYYY-MM-DD"; null bila tidak terbaca. */
export function selisihHari(dari, sampai) {
  const a = Date.parse(dari);
  const b = Date.parse(sampai);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  return Math.floor((b - a) / 86400000);
}

/** Jeda rutin untuk baby & juvenile, dalam hari. */
export const JEDA_BABY_HARI = 14;

/**
 * Apakah kura ini masih dalam golongan yang ditimbang rutin?
 *
 * Bukan hanya `age_category`: sebagian kura lama tidak punya kolom itu
 * terisi. Panjang tempurung di bawah 20 cm dipakai sebagai cadangan —
 * sulcata sebesar itu masih hatchling atau juvenile muda.
 */
export function golonganRutin(kura) {
  if (kura?.age_category === "baby" || kura?.age_category === "juvenile") return true;
  const p = Number(kura?.shell_length_cm);
  return Number.isFinite(p) && p > 0 && p < 20;
}

/**
 * Alasan kura ini perlu ditimbang hari ini, atau null bila tidak perlu.
 *
 * @param kura           baris Tortoise
 * @param laporanTerbuka laporan "tidak makan" yang masih berlaku untuk kura
 *                       ini (null bila tidak ada)
 * @param hariIni        "YYYY-MM-DD"
 * @returns {{kode: string, teks: string, prioritas: number}|null}
 *   prioritas kecil = lebih mendesak.
 */
export function alasanTimbang(kura, laporanTerbuka, hariIni) {
  if (!kura) return null;

  if (laporanTerbuka) {
    const lama = selisihHari(laporanTerbuka.date, hariIni);
    return {
      kode: "tidak_makan",
      teks: lama && lama > 0
        ? `Tidak makan sejak ${laporanTerbuka.date} (${lama} hari)`
        : "Dilaporkan tidak makan",
      prioritas: 1,
    };
  }

  if (kura.is_currently_sick === true) {
    const jarak = selisihHari(kura.last_weighed_date, hariIni);
    if (jarak === null || jarak >= 7) {
      return {
        kode: "sedang_diobati",
        teks: jarak === null
          ? "Sedang diobati, belum pernah ditimbang"
          : `Sedang diobati, berat terakhir ${jarak} hari lalu`,
        prioritas: 2,
      };
    }
    return null;
  }

  if (golonganRutin(kura)) {
    const jarak = selisihHari(kura.last_weighed_date, hariIni);
    if (jarak === null || jarak >= JEDA_BABY_HARI) {
      return {
        kode: "rutin_baby",
        teks: jarak === null
          ? "Belum pernah ditimbang"
          : `Rutin baby — ${jarak} hari sejak terakhir`,
        prioritas: 3,
      };
    }
  }

  return null;
}

/**
 * Laporan "tidak makan" yang masih terbuka, per kura.
 *
 * Terbuka = baris `tidak_makan` terakhir untuk kura itu BELUM diikuti baris
 * `makan_lagi` yang lebih baru, dan belum ditandai sudah_ditimbang.
 *
 * @param laporan seluruh LaporanMakan (sudah disaring masukLaporan)
 * @returns Map<tortoise_id, laporan>
 */
export function laporanTerbukaPerKura(laporan = []) {
  const urut = (laporan || [])
    .filter((l) => l && l.tortoise_id)
    .slice()
    .sort((a, b) => String(a.date || "").localeCompare(String(b.date || "")));
  const peta = new Map();
  for (const l of urut) {
    if (l.status === "makan_lagi") {
      peta.delete(l.tortoise_id);
    } else if (l.sudah_ditimbang === true) {
      peta.delete(l.tortoise_id);
    } else {
      peta.set(l.tortoise_id, l);
    }
  }
  return peta;
}

/**
 * Daftar kura yang perlu ditimbang hari ini, terurut paling mendesak dulu.
 *
 * Tidak ada batas jumlah: daftar ini seharusnya pendek dengan sendirinya.
 * Kalau ia panjang, itu berita — bukan sesuatu yang perlu dipotong supaya
 * terlihat rapi.
 */
export function perluDitimbang(daftarKura = [], laporan = [], hariIni) {
  const terbuka = laporanTerbukaPerKura(laporan);
  const keluar = [];
  for (const k of daftarKura || []) {
    const alasan = alasanTimbang(k, terbuka.get(k?.id) || null, hariIni);
    if (alasan) keluar.push({ kura: k, ...alasan });
  }
  keluar.sort((a, b) => {
    if (a.prioritas !== b.prioritas) return a.prioritas - b.prioritas;
    return String(a.kura?.last_weighed_date || "").localeCompare(
      String(b.kura?.last_weighed_date || ""),
    );
  });
  return keluar;
}

/**
 * timbang.ts — kembaran backend dari src/lib/jadwalTimbang.js.
 *
 * Deno tidak bisa mengimpor dari src/, jadi aturannya ditulis dua kali.
 * scripts/cek-kembar.mjs membandingkan badan fungsinya; kalau salah satu
 * diubah sendirian, penjaga itu merah.
 *
 * Alasan lengkap kenapa rotasi timbang diganti pemicu ada di berkas
 * frontend-nya — ringkasnya: rotasi 2 ekor/hari tidak pernah menyelesaikan
 * satu putaran, 44 kura dewasa masih memakai berat Juli 2025.
 */

/** Hari antara dua tanggal "YYYY-MM-DD"; null bila tidak terbaca. */
export function selisihHari(dari: string, sampai: string): number | null {
  const a = Date.parse(dari);
  const b = Date.parse(sampai);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  return Math.floor((b - a) / 86400000);
}

/** Jeda rutin untuk baby & juvenile, dalam hari. */
export const JEDA_BABY_HARI = 14;

/** Apakah kura ini masih dalam golongan yang ditimbang rutin? */
export function golonganRutin(kura: any): boolean {
  if (kura?.age_category === "baby" || kura?.age_category === "juvenile") return true;
  const p = Number(kura?.shell_length_cm);
  return Number.isFinite(p) && p > 0 && p < 20;
}

/** Alasan kura ini perlu ditimbang hari ini, atau null bila tidak perlu. */
export function alasanTimbang(
  kura: any,
  laporanTerbuka: any,
  hariIni: string,
): { kode: string; teks: string; prioritas: number } | null {
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

/** Laporan "tidak makan" yang masih terbuka, per kura. */
export function laporanTerbukaPerKura(laporan: any[] = []): Map<string, any> {
  const urut = (laporan || [])
    .filter((l: any) => l && l.tortoise_id)
    .slice()
    .sort((a: any, b: any) => String(a.date || "").localeCompare(String(b.date || "")));
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

/** Daftar kura yang perlu ditimbang hari ini, terurut paling mendesak dulu. */
export function perluDitimbang(daftarKura: any[] = [], laporan: any[] = [], hariIni: string): any[] {
  const terbuka = laporanTerbukaPerKura(laporan);
  const keluar = [];
  for (const k of daftarKura || []) {
    const alasan = alasanTimbang(k, terbuka.get(k?.id) || null, hariIni);
    if (alasan) keluar.push({ kura: k, ...alasan });
  }
  keluar.sort((a: any, b: any) => {
    if (a.prioritas !== b.prioritas) return a.prioritas - b.prioritas;
    return String(a.kura?.last_weighed_date || "").localeCompare(
      String(b.kura?.last_weighed_date || ""),
    );
  });
  return keluar;
}

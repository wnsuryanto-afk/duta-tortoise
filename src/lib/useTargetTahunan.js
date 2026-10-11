import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { hanyaLaporan } from "@/lib/laporan";
import { kemajuanTarget } from "@/lib/targetTahunan";

/**
 * useTargetTahunan — satu sumber angka untuk target tahun berjalan.
 *
 * ── Dua cacat yang diselesaikannya ──────────────────────────────────────────
 *
 * 1. **Angkanya diambil dari daftar yang DIPOTONG.**
 *    AnnualGoalWidget menghitung telur dari prop `breedings` milik beranda
 *    Owner — dan daftar itu `Breeding.list("-created_date", 50)`. Lima puluh
 *    baris terakhir, diurutkan menurut kapan BARISNYA DIBUAT, bukan kapan
 *    telurnya diletakkan. Hari ini 2026 baru punya 18 clutch, jadi kebetulan
 *    masih muat; begitu lewat lima puluh, bilah targetnya mulai menyusut
 *    sendiri tanpa ada yang tahu sebabnya.
 *
 * 2. **Separuh angkanya tidak menyaring data uji.**
 *    Omzet di widget itu memakai `hanyaLaporan`, tetapi telurnya tidak.
 *    Diukur 11 Okt 2026: satu penjualan Rp 9.522.500 bertanda
 *    `excluded_from_reports`, jadi omzet yang BENAR Rp 61,8 juta sementara
 *    hitungan tanpa saringan memberi Rp 71,3 juta — selisih 15%, cukup untuk
 *    memindahkan kesimpulan dari "jauh tertinggal" ke "tertinggal".
 *
 * Karena itu hook ini menanyakan tahunnya langsung ke basis data dengan
 * rentang tanggal, bukan memungut dari daftar yang dibuat untuk keperluan
 * lain, dan menyaring keduanya dengan saringan yang sama.
 *
 * ── Kenapa hook, bukan dihitung di masing-masing layar ──────────────────────
 *
 * Angka ini tampil di dua tempat — ringkas di kepala beranda, lengkap di
 * AnnualGoalWidget. Dua tempat yang menghitung sendiri adalah dua angka yang
 * pelan-pelan berselisih, dan target yang berselisih dengan dirinya sendiri
 * lebih buruk daripada target yang tidak ditampilkan.
 */

/**
 * Batas ambil setahun.
 *
 * Peternakan ini mencatat puluhan clutch dan puluhan penjualan per tahun;
 * seribu memberi ruang belasan tahun ke depan. Dipatok, bukan tanpa batas,
 * supaya satu tahun yang kacau tidak menarik seluruh riwayat ke beranda.
 */
const BATAS = 1000;

export function useTargetTahunan({ hariIni = new Date() } = {}) {
  const tahun = hariIni.getFullYear();
  const dari = `${tahun}-01-01`;
  const sampai = `${tahun}-12-31`;

  const { data: goals = [], isLoading: goalLoading } = useQuery({
    queryKey: ["target-tahunan-goal", tahun],
    queryFn: () => base44.entities.AnnualGoal.filter({ year: tahun }),
    staleTime: 15 * 60 * 1000,
  });

  const { data: telurBaris = [], isLoading: telurLoading } = useQuery({
    queryKey: ["target-tahunan-telur", tahun],
    queryFn: () =>
      base44.entities.Breeding
        .filter({ egg_laying_date: { $gte: dari, $lte: sampai } }, "-egg_laying_date", BATAS)
        .then(hanyaLaporan),
    staleTime: 10 * 60 * 1000,
  });

  const { data: jualBaris = [], isLoading: jualLoading } = useQuery({
    queryKey: ["target-tahunan-omzet", tahun],
    queryFn: () =>
      base44.entities.Sale
        .filter({ sale_date: { $gte: dari, $lte: sampai } }, "-sale_date", BATAS)
        .then(hanyaLaporan),
    staleTime: 10 * 60 * 1000,
  });

  const telur = telurBaris.reduce((j, b) => j + (Number(b.egg_count) || 0), 0);

  /*
    Telur per bulan, dua belas angka.

    Dipotong dari baris yang SUDAH diambil, bukan kueri kedua: hook ini
    memang sudah menarik seluruh clutch tahun ini untuk menjumlahkannya.
    Dipakai tren mungil di kepala beranda, yang menjawab pertanyaan
    berikutnya sesudah "perlu 1,9 telur/hari": apakah lajunya sedang naik
    atau sedang mati.

    Bulan kosong tetap nol dan tetap digambar — Mei sampai Juli 2026 memang
    tidak ada satu butir pun, dan lubang itu adalah musimnya, bukan data
    yang hilang.
  */
  const perBulan = Array(12).fill(0);
  for (const b of telurBaris) {
    const bl = Number(String(b.egg_laying_date || "").slice(5, 7)) - 1;
    if (bl >= 0 && bl < 12) perBulan[bl] += Number(b.egg_count) || 0;
  }
  const omzet = jualBaris.reduce((j, s) => j + (Number(s.price) || 0), 0);
  const goal = goals.find((g) => Number(g.year) === tahun) || null;

  return {
    goal,
    telur,
    omzet,
    perBulan,
    bulanIni: hariIni.getMonth(),
    kemajuan: kemajuanTarget({ goal, telur, omzet, hariIni }),
    memuat: goalLoading || telurLoading || jualLoading,
  };
}

export default useTargetTahunan;

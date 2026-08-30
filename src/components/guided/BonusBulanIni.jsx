/**
 * BonusBulanIni — kartu yang membuat bonus terlihat setiap hari.
 *
 * Kenapa kartu ini ada:
 *
 * Poin sudah dihitung sejak lama, tetapi keeper tidak pernah melihat ke mana
 * poin itu menuju. Target bulanan disimpan di pengaturan dan tidak muncul di
 * layar siapa pun; satu-satunya pengingat otomatis memakai angka yang
 * terlewati dalam dua hari kerja. Akibatnya poin terasa seperti angka yang
 * dikumpulkan tanpa tujuan.
 *
 * Kartu ini menaruh tiga hal di depan mata, tiap hari:
 *   1. Sudah berapa poin bulan ini, dan tinggal berapa ke tingkat berikutnya.
 *   2. Perkiraan rupiah yang sudah dikumpulkan — poin yang bisa dibayangkan
 *      sebagai uang jauh lebih hidup daripada poin sebagai angka.
 *   3. Tugas yang tenggatnya sudah lewat hari ini beserta poin yang hilang
 *      karenanya (B3). Ini satu-satunya bentuk "hukuman" yang dipakai:
 *      poin tidak keluar, dan keeper melihat sendiri sebabnya — bukan
 *      diberitahu belakangan saat gajian.
 *
 * Yang sengaja TIDAK ada di sini: perbandingan antar karyawan. Dengan tim
 * kecil, papan peringkat lebih sering merusak hubungan kerja daripada
 * menaikkan semangat. Yang dibandingkan hanya diri sendiri dengan target.
 */
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { ringkasPoin } from "@/lib/poinChecklist";
import { format } from "date-fns";
import { Star, Trophy, Clock, TrendingUp, Flame } from "lucide-react";

const rupiah = (n) => "Rp " + Math.round(n || 0).toLocaleString("id-ID");

/** Menit sejak tengah malam dari "HH:mm". */
function keMenit(hm) {
  const [h, m] = String(hm || "").split(":").map(Number);
  if (!Number.isFinite(h)) return null;
  return h * 60 + (Number.isFinite(m) ? m : 0);
}

/** Apakah task ini terjadwal hari ini? Mengikuti aturan yang sama dengan daftar tugas. */
function terjadwalHariIni(t, hariNomor, tanggalNomor, bulanNomor) {
  if (t.is_active !== true) return false;
  // Task musiman / dua-bulanan hanya berlaku di bulan yang ditentukan.
  const bulanAktif = Array.isArray(t.bulan_aktif) ? t.bulan_aktif : [];
  if (bulanAktif.length > 0 && !bulanAktif.includes(bulanNomor)) return false;
  if (t.frequency === "harian") return true;
  if (t.frequency === "mingguan") {
    const hari = Array.isArray(t.weekly_days) ? t.weekly_days : [];
    return hari.length === 0 || hari.includes(hariNomor);
  }
  if (t.frequency === "bulanan") {
    const tgl = Array.isArray(t.monthly_dates) ? t.monthly_dates : [];
    return tgl.includes(tanggalNomor);
  }
  return false;
}

export default function BonusBulanIni({ user }) {
  const now = new Date();
  const today = format(now, "yyyy-MM-dd");
  const monthKey = format(now, "yyyy-MM");
  const menitSekarang = now.getHours() * 60 + now.getMinutes();

  const { data: settings } = useQuery({
    queryKey: ["company-settings"],
    queryFn: async () => {
      const res = await base44.entities.CompanySettings.filter({ setting_key: "main" });
      return res[0] || null;
    },
    staleTime: 10 * 60 * 1000,
  });

  const { data: checklists = [] } = useQuery({
    queryKey: ["bonus-checklists", user?.email, monthKey],
    // Diurutkan menurun dan diberi batas yang tertulis. Tanpa urutan, baris
    // mana yang tersisa saat daftarnya terpotong ditentukan sekehendak basis
    // data — dan yang dibutuhkan layar ini justru bulan berjalan. Seorang
    // karyawan menambah sekitar 30 checklist per bulan, jadi batas ini cukup
    // untuk lebih dari setahun sementara bulan berjalan selalu ada di depan.
    queryFn: () => base44.entities.DailyChecklist.filter({ employee_email: user.email }, "-date", 400),
    enabled: !!user?.email,
    staleTime: 3 * 60 * 1000,
  });

  const { data: sopTasks = [] } = useQuery({
    queryKey: ["bonus-sop-tasks"],
    queryFn: () => base44.entities.SOPTask.filter({ is_active: true }),
    staleTime: 10 * 60 * 1000,
  });

  const { data: logsHariIni = [] } = useQuery({
    queryKey: ["bonus-logs", today],
    queryFn: () => base44.entities.MaintenanceLog.filter({ period_key: today }),
    staleTime: 60 * 1000,
    refetchInterval: 3 * 60 * 1000,
  });

  // ── Poin bulan ini ──
  //
  // Hanya poin yang SUDAH DISETUJUI. Sebelum ini klaim yang belum diperiksa
  // ikut dihitung penuh, jadi angka di layar ini naik saat checklist dikirim
  // lalu menyusut lagi setelah pemilik memangkasnya. Urutan itu yang paling
  // merugikan: janji dulu, tarik kemudian. Yang menunggu sekarang disebut
  // terpisah, tidak dihilangkan.
  const { disetujui: poinBulanIni, menunggu: poinMenungguBulan, jumlahMenunggu } = useMemo(
    () => ringkasPoin((checklists || []).filter((c) => String(c.date || "").startsWith(monthKey))),
    [checklists, monthKey],
  );

  // ── Berapa hari berturut-turut mengisi checklist ──
  const streak = useMemo(() => {
    const tanggalTerisi = new Set(
      (checklists || [])
        .filter((c) => Array.isArray(c.completed_tasks) && c.completed_tasks.length > 0)
        .map((c) => c.date),
    );
    let n = 0;
    const cursor = new Date(now);
    // Hari ini boleh belum terisi — hitungan dimulai dari kemarin bila begitu,
    // supaya angkanya tidak jatuh ke nol tiap pagi sebelum orang mulai bekerja.
    if (!tanggalTerisi.has(format(cursor, "yyyy-MM-dd"))) cursor.setDate(cursor.getDate() - 1);
    for (let i = 0; i < 90; i++) {
      if (!tanggalTerisi.has(format(cursor, "yyyy-MM-dd"))) break;
      n++;
      cursor.setDate(cursor.getDate() - 1);
    }
    return n;
  }, [checklists, now]);

  // ── Tingkatan target ──
  const tingkatan = useMemo(() => {
    if (!settings) return [];
    return [
      { nama: "Dasar", target: Number(settings.min_poin_bulanan || 0), bonus: Number(settings.bonus_dasar || 0) },
      { nama: "Bagus", target: Number(settings.target_poin_bagus || 0), bonus: Number(settings.bonus_bagus || 0) },
      { nama: "Luar biasa", target: Number(settings.target_poin_luar_biasa || 0), bonus: Number(settings.bonus_luar_biasa || 0) },
    ]
      .filter((t) => t.target > 0)
      .sort((a, b) => a.target - b.target);
  }, [settings]);

  const tercapai = useMemo(
    () => [...tingkatan].reverse().find((t) => poinBulanIni >= t.target) || null,
    [tingkatan, poinBulanIni],
  );
  const berikut = useMemo(
    () => tingkatan.find((t) => poinBulanIni < t.target) || null,
    [tingkatan, poinBulanIni],
  );

  const nilaiPoin = Number(settings?.nilai_per_poin || 0);
  const upahPoin = poinBulanIni * nilaiPoin;
  const bonusTingkat = tercapai?.bonus || 0;

  // ── Tugas yang tenggatnya sudah lewat hari ini (B3) ──
  const lewatTenggat = useMemo(() => {
    if (!sopTasks.length) return [];
    const hariNomor = now.getDay();
    const tanggalNomor = now.getDate();
    const bulanNomor = now.getMonth() + 1;

    // Task per-kandang sengaja tidak dihitung di sini: jumlahnya bergantung
    // pada berapa kandang yang tersisa, dan angka setengah benar soal poin
    // hilang lebih berbahaya daripada tidak ada angka sama sekali.
    return sopTasks
      .filter((t) => t.task_scope !== "per_kandang")
      .filter((t) => terjadwalHariIni(t, hariNomor, tanggalNomor, bulanNomor))
      .filter((t) => {
        const batas = keMenit(t.deadline_time);
        return batas !== null && menitSekarang > batas;
      })
      .filter((t) => {
        const sudah = (logsHariIni || []).some((l) => {
          if (l.item_id !== `sop_${t.id}`) return false;
          if (t.task_scope === "pribadi") return l.done_by_email === user?.email;
          return true;
        });
        return !sudah;
      })
      .map((t) => ({ id: t.id, judul: t.title, poin: Number(t.points || 0), batas: t.deadline_time }));
  }, [sopTasks, logsHariIni, menitSekarang, user?.email, now]);

  const poinHangus = lewatTenggat.reduce((s, t) => s + t.poin, 0);

  if (!settings || tingkatan.length === 0) return null;

  const targetAkhir = tingkatan[tingkatan.length - 1].target;
  const persen = Math.min(100, (poinBulanIni / targetAkhir) * 100);

  return (
    <div className="rounded-2xl border-2 border-green-200 bg-gradient-to-br from-green-50 to-lime-50 dark:from-green-950/30 dark:to-lime-950/20 dark:border-green-900 overflow-hidden">
      {/* Kepala kartu */}
      <div className="px-4 pt-4 pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-wide text-green-700 dark:text-green-400">
              Bonus bulan ini
            </p>
            <p className="text-2xl font-extrabold text-green-900 dark:text-green-100 leading-tight mt-0.5 tabular-nums">
              {poinBulanIni.toLocaleString("id-ID")}
              <span className="text-sm font-bold text-green-700/70 dark:text-green-400/70"> poin</span>
            </p>
            {nilaiPoin > 0 && (
              <p className="text-xs text-green-800/80 dark:text-green-300/80 mt-0.5">
                ≈ {rupiah(upahPoin)}
                {bonusTingkat > 0 && ` + bonus ${rupiah(bonusTingkat)}`}
              </p>
            )}
            {poinMenungguBulan > 0 && (
              <p className="text-xs text-amber-700 dark:text-amber-400 mt-1">
                ⏳ {poinMenungguBulan.toLocaleString("id-ID")} poin dari {jumlahMenunggu} checklist
                masih menunggu persetujuan — belum masuk hitungan di atas.
              </p>
            )}
          </div>

          <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
            {tercapai ? (
              <span className="inline-flex items-center gap-1 bg-green-600 text-white px-2.5 py-1 rounded-full text-[11px] font-bold">
                <Trophy className="w-3.5 h-3.5" /> {tercapai.nama}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 bg-white/70 dark:bg-white/10 text-green-800 dark:text-green-300 px-2.5 py-1 rounded-full text-[11px] font-bold border border-green-200 dark:border-green-800">
                <TrendingUp className="w-3.5 h-3.5" /> Menuju {tingkatan[0].nama}
              </span>
            )}
            {streak >= 2 && (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-orange-600 dark:text-orange-400">
                <Flame className="w-3.5 h-3.5" /> {streak} hari berturut
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Batang kemajuan dengan penanda tiap tingkat */}
      <div className="px-4 pb-1">
        <div className="relative h-3 rounded-full bg-white/70 dark:bg-white/10 overflow-hidden border border-green-200 dark:border-green-900">
          <div
            className="h-full rounded-full bg-gradient-to-r from-green-500 to-lime-400"
            style={{ width: `${persen}%`, transition: "width .9s cubic-bezier(.16,1,.3,1)" }}
          />
        </div>
        <div className="relative h-5 mt-1">
          {tingkatan.map((t) => {
            const kiri = Math.min(100, (t.target / targetAkhir) * 100);
            const sudah = poinBulanIni >= t.target;
            return (
              <span
                key={t.nama}
                className={`absolute -translate-x-1/2 text-[9.5px] font-bold whitespace-nowrap ${
                  sudah ? "text-green-700 dark:text-green-400" : "text-green-900/40 dark:text-green-100/40"
                }`}
                style={{ left: `${kiri}%` }}
              >
                {sudah ? "✓ " : ""}{t.nama}
              </span>
            );
          })}
        </div>
      </div>

      {/* Sisa menuju tingkat berikutnya */}
      <div className="px-4 pb-3 pt-1">
        {berikut ? (
          <p className="text-sm text-green-900 dark:text-green-100">
            Kurang <strong className="tabular-nums">{(berikut.target - poinBulanIni).toLocaleString("id-ID")} poin</strong> lagi
            ke <strong>{berikut.nama}</strong>
            {berikut.bonus > 0 && <> — bonus {rupiah(berikut.bonus)}</>}.
          </p>
        ) : (
          <p className="text-sm font-semibold text-green-800 dark:text-green-200">
            🎉 Semua tingkat tercapai bulan ini. Terima kasih, kerja Anda kelihatan.
          </p>
        )}
      </div>

      {/* Tugas lewat tenggat — poin yang hangus hari ini */}
      {lewatTenggat.length > 0 && (
        <div className="bg-amber-50 dark:bg-amber-950/30 border-t border-amber-200 dark:border-amber-900 px-4 py-3">
          <div className="flex items-center gap-1.5 mb-1.5">
            <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0" />
            <p className="text-[13px] font-bold text-amber-800 dark:text-amber-300">
              {lewatTenggat.length} tugas lewat tenggat hari ini
              {poinHangus > 0 && <> — {poinHangus} poin belum didapat</>}
            </p>
          </div>
          <ul className="space-y-0.5">
            {lewatTenggat.slice(0, 4).map((t) => (
              <li key={t.id} className="text-xs text-amber-800/90 dark:text-amber-300/90 flex justify-between gap-2">
                <span className="truncate">{t.judul}</span>
                <span className="flex-shrink-0 tabular-nums opacity-70">batas {t.batas}</span>
              </li>
            ))}
            {lewatTenggat.length > 4 && (
              <li className="text-xs text-amber-700/70 dark:text-amber-400/70">
                dan {lewatTenggat.length - 4} lainnya
              </li>
            )}
          </ul>
          <p className="text-[11px] text-amber-700/80 dark:text-amber-400/80 mt-1.5">
            Masih bisa dikerjakan — yang lewat tenggat tetap dicatat, hanya poinnya tidak keluar.
          </p>
        </div>
      )}

      {/* Catatan nilai poin belum diatur */}
      {nilaiPoin === 0 && (
        <div className="px-4 py-2 bg-white/60 dark:bg-white/5 border-t border-green-200 dark:border-green-900">
          <p className="text-[11px] text-green-800/70 dark:text-green-300/70 flex items-center gap-1">
            <Star className="w-3 h-3" /> Nilai rupiah per poin belum diatur owner.
          </p>
        </div>
      )}
    </div>
  );
}

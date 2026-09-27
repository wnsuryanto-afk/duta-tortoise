import { useQuery, useQueryClient } from "@tanstack/react-query";
import { buatAbsenSekali } from "@/lib/checkInSekali";
import { base44 } from "@/api/base44Client";
import { useCurrentUser } from "@/lib/useCurrentUser";
import { terjadwalPada } from "@/lib/kepatuhanSOP";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  LogIn, LogOut, CheckCircle2, Clock, Bell,
  ClipboardList, AlertTriangle, Star, ChevronRight, MapPin
} from "lucide-react";
import { format, differenceInDays, parseISO } from "date-fns";
import { id } from "date-fns/locale";
import { useState } from "react";
import { Link } from "react-router-dom";
import { getCurrentPosition, haversineDistance } from "@/components/attendance/useGPSLocation";
import { barisAbsensiSah, catatCheckOut } from "@/lib/absensi";
import { menitTerlambat, perluAlasan } from "@/lib/keterlambatan";
import AlasanTerlambatDialog from "@/components/attendance/AlasanTerlambatDialog";
import KeteranganMasuk from "@/components/attendance/KeteranganMasuk";
import RumputBelumDicatat from "@/components/rempesan/RumputBelumDicatat";
import HariTanpaChecklist from "@/components/sop/HariTanpaChecklist";
import { useTestMode } from "@/lib/useTestMode";
import KeeperIncubatorWidget from "@/components/dashboard/KeeperIncubatorWidget";
import KeeperAttentionWidget from "@/components/dashboard/KeeperAttentionWidget";
import PakanHarianWidget from "@/components/pakan/PakanHarianWidget";
import MotivasiHarianCard from "@/components/dashboard/MotivasiHarianCard";
import PageHeader from "@/components/common/PageHeader";
import AmbilBarangScan from "@/components/stok/AmbilBarangScan";
import AksiHarianKiper from "@/components/attendance/AksiHarianKiper";
import BonusBulanIni from "@/components/guided/BonusBulanIni";
import { toast } from "sonner";
import { TortoiseArt } from "@/components/common/Illustration";

/**
 * Lama dalam menit, ditulis sebagaimana orang mengucapkannya.
 *
 * "Terlambat 745m" bukan informasi — yang membacanya harus membagi sendiri
 * dengan 60 untuk tahu bahwa itu dua belas jam. Di bawah satu jam menitnya
 * yang penting; di atas itu jamnya.
 */
function lamanya(menit) {
  const n = Math.abs(Math.round(menit));
  if (n < 60) return `${n} menit`;
  // Di atas satu jam, menitnya tidak menambah apa pun yang dipakai orang untuk
  // memutuskan — dan "Lewat 8 jam 55 menit" tidak muat sebaris di layar ponsel,
  // jadi ia pecah di tengah frasa menjadi "Lewat 8 jam 55 / menit".
  return `${Math.round(n / 60)} jam`;
}

function getMinutesUntil(timeStr) {
  if (!timeStr) return null;
  const [h, m] = timeStr.split(":").map(Number);
  const deadline = new Date();
  deadline.setHours(h, m, 0, 0);
  return Math.floor((deadline - new Date()) / 60000);
}

export default function KeeperDashboard() {
  const queryClient = useQueryClient();
  const { user } = useCurrentUser();
  const { testModeTag } = useTestMode();
  const today = format(new Date(), "yyyy-MM-dd");
  const currentPeriod = format(new Date(), "yyyy-MM");
  const [checkLoading, setCheckLoading] = useState(false);
  const [gpsError, setGpsError] = useState(null);
  const [locationWarning, setLocationWarning] = useState(null);
  // Jam masuk yang menunggu alasannya. Dikunci saat dialog dibuka supaya jam
  // yang tersimpan sama persis dengan jam yang ditunjukkan ke orangnya —
  // bukan jam beberapa menit kemudian saat dia selesai memotret rumputnya.
  const [menungguAlasan, setMenungguAlasan] = useState(null);

  // ── Absensi ──
  const { data: todayAttendance } = useQuery({
    queryKey: ["attendance-today", user?.email, today],
    queryFn: async () => {
      const res = await base44.entities.Attendance.filter({ employee_email: user.email, date: today });
      return barisAbsensiSah(res);
    },
    enabled: !!user?.email,
    refetchInterval: 30000,
  });

  // ── SOP tasks & checklist ──
  const { data: tasks = [] } = useQuery({
    queryKey: ["sop-tasks-active"],
    queryFn: () => base44.entities.SOPTask.filter({ is_active: true }),
  });

  const { data: todayChecklist } = useQuery({
    queryKey: ["checklist-today", user?.email, today],
    queryFn: async () => {
      const all = await base44.entities.DailyChecklist.filter({ employee_email: user.email, date: today });
      return all[0] || null;
    },
    enabled: !!user?.email,
    refetchInterval: 60000,
  });

  // ── Company Settings (GPS) ──
  const { data: settings } = useQuery({
    queryKey: ["company-settings"],
    queryFn: async () => {
      const res = await base44.entities.CompanySettings.filter({ setting_key: "main" });
      return res[0] || null;
    },
  });

  const { data: salaryConfig } = useQuery({
    queryKey: ["salary-config", user?.role],
    queryFn: async () => {
      const res = await base44.entities.SalaryConfig.filter({ role: user?.role });
      return res[0] || null;
    },
    enabled: !!user?.role,
  });

  // ── KPI bulan ini ──
  const { data: checklists = [] } = useQuery({
    queryKey: ["checklist-my-month", user?.email, currentPeriod],
    queryFn: async () => {
      const all = await base44.entities.DailyChecklist.filter({ employee_email: user.email });
      return all.filter((c) => c.date?.startsWith(currentPeriod));
    },
    enabled: !!user?.email,
  });

  // ── Pengingat kesehatan ──
  const { data: reminders = [] } = useQuery({
    queryKey: ["health-reminders"],
    queryFn: () => base44.entities.HealthReminder.filter({ is_done: false }),
  });

  // ── Handlers check-in / out ──
  const nowStr = () => format(new Date(), "HH:mm");
  const farmLat = settings?.farm_lat;
  const farmLng = settings?.farm_lng;
  const farmRadius = settings?.farm_location_radius || 200;
  const farmConfigured = !!(farmLat && farmLng);

  const handleCheckIn = async () => {
    if (!user) return;
    const jam = nowStr();
    const mulai = salaryConfig?.shift_start;
    // Alasan ditanyakan DULU, sebelum GPS dan sebelum baris dibuat. Menanyakan
    // sesudah baris tersimpan berarti ada jendela di mana barisnya sudah ada
    // tanpa keterangan, dan orang bisa menutup dialognya begitu saja.
    if (perluAlasan(jam, mulai)) {
      setMenungguAlasan({ jam, menit: menitTerlambat(jam, mulai) });
      return;
    }
    await jalankanCheckIn(jam, null);
  };

  const jalankanCheckIn = async (jam, isianAlasan) => {
    setMenungguAlasan(null);
    setCheckLoading(true);
    setGpsError(null);
    setLocationWarning(null);

    let lat = null, lng = null, verified = false;
    try {
      const pos = await getCurrentPosition();
      lat = pos.lat; lng = pos.lng;
      if (farmConfigured) {
        const dist = Math.round(haversineDistance(lat, lng, farmLat, farmLng));
        if (dist > farmRadius) {
          setLocationWarning(`Anda berada ${dist}m dari lokasi kandang. Check in tetap tercatat tapi ditandai di luar lokasi.`);
        } else {
          verified = true;
        }
      }
    } catch (err) {
      setGpsError(err.message);
    }

    // Lewat penjaga bersama — layar ini dulu tidak memeriksa apa pun sebelum
    // menulis, jadi ketukan kedua selama GPS diambil membuat baris kedua.
    const { dibuat } = await buatAbsenSekali({
      employee_id: user.id,
      employee_name: user.full_name || user.email,
      employee_email: user.email,
      date: today,
      check_in: nowStr(),
      status: "hadir",
      check_in_lat: lat,
      check_in_lng: lng,
      location_verified: verified,
      shift_start: salaryConfig?.shift_start || "08:00",
      shift_end: salaryConfig?.shift_end || "16:00",
    });
    if (!dibuat) setLocationWarning("Kamu sudah check in hari ini — catatannya tidak dibuat dua kali.");
    queryClient.invalidateQueries({ queryKey: ["attendance-today"] });
    setCheckLoading(false);
  };

  const handleCheckOut = async () => {
    if (!todayAttendance) return;
    setCheckLoading(true);
    setGpsError(null);
    setLocationWarning(null);

    let posisi = null;
    if (farmConfigured) {
      // GPS gagal tidak mengunci check out — lihat catatan di GuidedHariIni.
      let pos = null;
      try {
        pos = await getCurrentPosition();
      } catch {
        setLocationWarning("GPS tidak terbaca. Check out tetap dicatat, tapi ditandai tanpa lokasi.");
      }
      if (pos) {
        const dist = Math.round(haversineDistance(pos.lat, pos.lng, farmLat, farmLng));
        if (dist > farmRadius) {
          setGpsError(`Check out harus dilakukan di lokasi kandang. Anda saat ini berada ${dist}m dari kandang. Silakan menuju kandang untuk checkout.`);
          setCheckLoading(false);
          return;
        }
      }
      posisi = pos;
    }

    try {
      const { lembur, lemburKasar, adaBukti } = await catatCheckOut({
        absensi: { ...todayAttendance, shift_end: todayAttendance.shift_end || salaryConfig?.shift_end },
        jam: nowStr(),
        lat: posisi ? posisi.lat : null,
        lng: posisi ? posisi.lng : null,
        adaLokasi: !!posisi,
        checklist: todayChecklist,
        tandaUji: testModeTag,
      });
      if (!adaBukti && lemburKasar > 0 && lembur === 0) {
        setLocationWarning(
          "Kamu pulang lewat jam shift, tapi tidak ada tugas yang tercatat setelah jam itu — jadi lembur belum dihitung. Centang dulu pekerjaan yang kamu kerjakan sore ini.",
        );
      }
    } catch (err) {
      setGpsError(`Check out gagal tersimpan: ${err.message}. Coba lagi.`);
      setCheckLoading(false);
      return;
    }

    await queryClient.invalidateQueries({ queryKey: ["attendance-today"] });
    queryClient.invalidateQueries({ queryKey: ["overtime-logs"] });
    setCheckLoading(false);
  };

  // ── Derived ──
  const hasCheckedIn = !!todayAttendance?.check_in;
  const hasCheckedOut = !!todayAttendance?.check_out;
  const overtime = todayAttendance?.overtime_hours || 0;

  const completedTaskIds = new Set((todayChecklist?.completed_tasks || []).map((t) => t.task_id));

  // `frequency === "harian"` bukan cara mengetahui tugas hari ini: sebagian
  // besar pekerjaan tersimpan sebagai `mingguan` dengan daftar hari. Memakai
  // pintasan itu membuat penyebut di sini (8) jauh lebih kecil daripada yang
  // dipakai layar kepatuhan, sehingga "sudah 6 dari 8" terbaca hampir selesai
  // padahal masih ada tugas terjadwal yang belum tersentuh.
  const tugasHariIni = tasks.filter(
    (t) => t.di_ubin_kandang !== true && terjadwalPada(t, today),
  );
  const totalDailyTasks = tugasHariIni.length;
  const doneCount = tugasHariIni.filter((t) => completedTaskIds.has(t.id)).length;
  const sopSubmitted = todayChecklist?.status === "submitted" || todayChecklist?.status === "approved";

  // Tugas yang belum dikerjakan dan tenggatnya sudah dekat atau sudah lewat.
  //
  // Jendelanya dulu `-30 <= sisa <= 60`: setengah jam sesudah tenggat, tugas
  // yang belum dikerjakan MENGHILANG dari kartu. Yang tersisa cuma kalimat
  // "Tidak ada task mendesak saat ini" — di kartu yang pada baris di atasnya
  // menulis "1 dari 6 task selesai". Pukul 12 siang empat tugas sudah lewat
  // tenggat dan kartunya bilang tidak ada yang mendesak; pukul setengah lima
  // sore, saat kelimanya tidak akan dikerjakan lagi hari itu, kartunya masih
  // bilang hal yang sama.
  //
  // Jendela seperti itu masuk akal untuk NOTIFIKASI — "sebentar lagi jatuh
  // tempo" memang cuma relevan sebentar. Tapi ini bukan notifikasi, ini
  // keadaan hari itu, dan tugas yang lewat tenggat tidak berhenti perlu
  // dikerjakan hanya karena sudah lewat setengah jam.
  //
  // Sekarang yang lewat tenggat tidak pernah pergi, dan ia yang ditaruh di
  // atas. Yang masih di depan tetap dibatasi satu jam ke depan supaya kartunya
  // tidak berubah jadi salinan seluruh daftar SOP — untuk itu ada /sop.
  const belumSelesai = tugasHariIni
    .filter((t) => t.deadline_time && !completedTaskIds.has(t.id))
    .map((t) => ({ ...t, minutesLeft: getMinutesUntil(t.deadline_time) }))
    .filter((t) => t.minutesLeft !== null);

  const lewatTenggat = belumSelesai
    .filter((t) => t.minutesLeft < 0)
    .sort((a, b) => a.minutesLeft - b.minutesLeft);
  const segeraJatuhTempo = belumSelesai
    .filter((t) => t.minutesLeft >= 0 && t.minutesLeft <= 60)
    .sort((a, b) => a.minutesLeft - b.minutesLeft);

  // Paling banyak empat baris di kartu beranda. Sisanya dihitung, bukan
  // didaftar — daftar sepanjang layar membuat orang berhenti membacanya.
  const urgentSOP = [...lewatTenggat, ...segeraJatuhTempo];
  const urgentTampil = urgentSOP.slice(0, 4);

  const upcomingReminders = reminders
    .filter((r) => {
      if (!r?.due_date) return false;
      try {
        const days = differenceInDays(parseISO(r.due_date), parseISO(today));
        return days <= 7;
      } catch { return false; }
    })
    .sort((a, b) => (a.due_date || "").localeCompare(b.due_date || ""))
    .slice(0, 3);

  const approvedPoints = checklists
    .filter((c) => c.status === "approved")
    .reduce((s, c) => s + (c.approved_points || 0), 0);

  const approvedDays = checklists.filter((c) => c.status === "approved").length;

  // Null guard setelah semua hooks — aman untuk React
  if (!user?.email) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-5 max-w-2xl mx-auto">
      {/* Greeting — status absen dan poin bulan ini ikut di kepala halaman,
          karena dua hal itulah yang paling sering dicek keeper. */}
      <PageHeader
        title={`Halo, ${user?.full_name?.split(" ")[0] || "Keeper"} 👋`}
        subtitle={format(new Date(), "EEEE, d MMMM yyyy", { locale: id })}
        art={<TortoiseArt size="md" />}
        chips={[
          {
            key: "absen", icon: Clock, label: "Absen",
            value: hasCheckedOut ? "Selesai" : hasCheckedIn ? `Masuk ${todayAttendance.check_in}` : "Belum",
            tone: hasCheckedIn ? "good" : "warn",
          },
          { key: "poin", icon: Star, label: "Poin disetujui", value: approvedPoints },
          { key: "hari", icon: CheckCircle2, label: "Hari disetujui", value: approvedDays },
        ]}
      />

      {/*
        ── AMBIL BARANG (SCAN) ──
        Pengambilan obat terjadi di depan rak, bukan saat orang sedang membuka
        menu gudang. Selama aplikasi ini berdiri, tidak ada satu pun catatan
        barang keluar — jaraknya ke tombol adalah salah satu sebabnya.
      */}
      <AmbilBarangScan trigger="card" />

      {/* ── 1. CHECK-IN ── */}
      <Card className={`p-5 border-2 ${hasCheckedOut ? "border-green-200 bg-green-50" : hasCheckedIn ? "border-primary/30 bg-primary/5" : "border-dashed border-muted-foreground/30"}`}>
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className={`w-11 h-11 rounded-full flex items-center justify-center ${hasCheckedOut ? "bg-green-100" : "bg-primary/15"}`}>
              <Clock className={`w-5 h-5 ${hasCheckedOut ? "text-green-600" : "text-primary"}`} />
            </div>
            <div>
              <p className="font-semibold text-sm">Absensi Hari Ini</p>
              {hasCheckedIn ? (
                <>
                  <p className="text-xs text-muted-foreground">
                    Masuk: <span className="font-medium text-primary">{todayAttendance.check_in}</span>
                    {hasCheckedOut && <> · Keluar: <span className="font-medium text-green-600">{todayAttendance.check_out}</span></>}
                  </p>
                  {/* Keterangan jam masuk dikembalikan ke orangnya, bukan hanya
                      disimpan diam-diam untuk dilihat pemilik. */}
                  <KeteranganMasuk att={todayAttendance} />
                </>
              ) : (
                <p className="text-xs text-muted-foreground">Belum absen hari ini</p>
              )}
              {farmConfigured && hasCheckedIn && (
                <Badge variant="outline" className={`text-[10px] mt-1 gap-1 ${todayAttendance?.location_verified ? "border-green-300 text-green-700" : "border-yellow-300 text-yellow-700"}`}>
                  <MapPin className="w-2.5 h-2.5" />
                  {todayAttendance?.location_verified ? "Lokasi terverifikasi" : "Di luar area kandang"}
                </Badge>
              )}
            </div>
          </div>
          <div className="flex flex-col gap-2 items-end">
            {hasCheckedOut ? (
              <Badge className="bg-green-100 text-green-700 border-green-200 gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Selesai
              </Badge>
            ) : hasCheckedIn ? (
              <Button size="default" variant="outline" onClick={handleCheckOut} disabled={checkLoading}
                className="border-red-200 text-red-600 hover:bg-red-50 gap-1.5 min-w-[120px]">
                <LogOut className="w-4 h-4" />
                {checkLoading ? "Memproses..." : "Check-out"}
              </Button>
            ) : (
              <Button size="default" onClick={handleCheckIn} disabled={checkLoading} className="gap-1.5 min-w-[120px]">
                <LogIn className="w-4 h-4" />
                {checkLoading ? "Memproses..." : "Check-in"}
              </Button>
            )}
            {farmConfigured && !hasCheckedIn && (
              <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                <MapPin className="w-3 h-3" /> GPS diperlukan
              </p>
            )}
          </div>
        </div>

        {/*
          Tandai libur & trip sayur — komponen yang SAMA dengan layar Guided.

          Sebelum 03-09-2026 keduanya hanya ada di GuidedHariIni, sehingga kiper
          yang menekan "mode normal" kehilangan keduanya tanpa pemberitahuan:
          hari liburnya kembali menjadi hari tanpa catatan, dan trip sayurnya
          tidak terbayar. Dua layar yang menjalankan pekerjaan harian yang sama
          harus menawarkan tindakan yang sama.
        */}
        <AksiHarianKiper
          user={user}
          attendance={todayAttendance}
          hasCheckedIn={hasCheckedIn}
          onPesan={(jenis, teks) => (jenis === "warn" ? toast.error(teks) : toast.success(teks))}
        />

        {/* Rumput yang sudah diambil tapi belum dicatat.
            Ditaruh di layar yang dibuka tiap hari, bukan cuma di halaman
            Rempesan yang jarang dibuka — itulah sebabnya RempesanLog selama ini
            nol isinya meski halaman, formulir, dan tarifnya sudah lengkap. */}
        <RumputBelumDicatat email={user?.email} milikSendiri batas={4} />

        {/* Hari sendiri yang absensinya hadir tapi checklistnya kosong.
            Ditagih besoknya, selagi orangnya masih ingat kerja apa saja. */}
        <HariTanpaChecklist email={user?.email} milikSendiri mundur={14} />

        {/* Lembur info */}
        {hasCheckedOut && overtime > 0 && (
          <div className="mt-3 flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-700">
            <Clock className="w-3.5 h-3.5 flex-shrink-0" />
            <span>Lembur: <strong>{overtime} jam</strong> — tercatat otomatis</span>
          </div>
        )}

        {/* Warning lokasi */}
        {locationWarning && (
          <div className="mt-3 flex items-start gap-2 px-3 py-2 rounded-lg bg-yellow-50 border border-yellow-200 text-xs text-yellow-700">
            <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
            <span>{locationWarning}</span>
          </div>
        )}

        {/* GPS Error */}
        {gpsError && (
          <div className="mt-3 flex items-start gap-2 px-3 py-2 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">
            <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
            <span>{gpsError}</span>
          </div>
        )}
      </Card>

      {/* ── MOTIVASI HARIAN ── */}
      <MotivasiHarianCard />

      {/* ── 2. TARGET SOP HARI INI ── */}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-primary" />
            <h2 className="font-semibold text-base">Target SOP Hari Ini</h2>
          </div>
          <Link to="/sop">
            <Button size="sm" variant="ghost" className="text-xs gap-1 h-7 px-2">
              Lihat semua <ChevronRight className="w-3.5 h-3.5" />
            </Button>
          </Link>
        </div>

        {/* Progress bar */}
        <div className="mb-4">
          <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
            <span>{doneCount} dari {totalDailyTasks} task selesai</span>
            <span className="font-medium">{totalDailyTasks > 0 ? Math.round((doneCount / totalDailyTasks) * 100) : 0}%</span>
          </div>
          <div className="h-2.5 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-500"
              style={{ width: `${totalDailyTasks > 0 ? (doneCount / totalDailyTasks) * 100 : 0}%` }}
            />
          </div>
        </div>

        {sopSubmitted ? (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-green-50 border border-green-200">
            <CheckCircle2 className="w-5 h-5 text-green-500" />
            <p className="text-sm font-medium text-green-700">
              {todayChecklist?.status === "approved" ? "Checklist disetujui ✓" : "Checklist sudah dikirim, menunggu persetujuan"}
            </p>
          </div>
        ) : urgentSOP.length > 0 ? (
          <div className="space-y-2">
            {urgentTampil.map((task) => {
              const isOverdue = task.minutesLeft < 0;
              return (
                // `min-w-0` pada nama dan `flex-shrink-0` pada tenggatnya
                // bukan hiasan: tanpa keduanya nama tugas dan sisa waktunya
                // berebut lebar yang sama, dan di layar 390px yang mengalah
                // adalah tenggatnya — ia pecah di tengah frasa.
                <div key={task.id} className={`flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-sm border ${isOverdue ? "bg-red-50 border-red-200" : "bg-orange-50 border-orange-200"}`}>
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <AlertTriangle className={`w-4 h-4 flex-shrink-0 ${isOverdue ? "text-red-500" : "text-orange-500"}`} />
                    <span className="font-medium line-clamp-2 break-words">{task.title}</span>
                  </div>
                  <span className={`text-xs font-bold flex-shrink-0 whitespace-nowrap ${isOverdue ? "text-red-600" : "text-orange-600"}`}>
                    {isOverdue ? `Lewat ${lamanya(task.minutesLeft)}` : `${lamanya(task.minutesLeft)} lagi`}
                  </span>
                </div>
              );
            })}
            {urgentSOP.length > urgentTampil.length && (
              <Link to="/sop" className="block text-xs text-muted-foreground px-1 hover:text-foreground">
                dan {urgentSOP.length - urgentTampil.length} tugas lagi yang belum dikerjakan →
              </Link>
            )}
          </div>
        ) : totalDailyTasks === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-2">Belum ada task SOP aktif</p>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-2">Tidak ada task mendesak saat ini</p>
        )}
      </Card>

      {/* ── 3. PENGINGAT ── */}
      {upcomingReminders.length > 0 && (
        <Card className="p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Bell className="w-5 h-5 text-blue-500" />
              <h2 className="font-semibold text-base">Pengingat</h2>
            </div>
            <Link to="/health">
              <Button size="sm" variant="ghost" className="text-xs gap-1 h-7 px-2">
                Lihat semua <ChevronRight className="w-3.5 h-3.5" />
              </Button>
            </Link>
          </div>
          <div className="space-y-2">
            {upcomingReminders.map((r) => {
              const days = r.due_date ? differenceInDays(parseISO(r.due_date), parseISO(today)) : 0;
              const isOverdue = days < 0;
              const isToday = days === 0;
              return (
                <div key={r.id} className={`flex items-center justify-between px-3 py-2.5 rounded-lg border text-sm ${isOverdue ? "bg-red-50 border-red-200" : isToday ? "bg-orange-50 border-orange-200" : "bg-muted/40 border-transparent"}`}>
                  <div>
                    <p className="font-medium">{r.title}</p>
                    <p className="text-xs text-muted-foreground">{r.tortoise_name || "Semua Kura-kura"}</p>
                  </div>
                  <span className={`text-xs font-semibold whitespace-nowrap ml-2 ${isOverdue ? "text-red-600" : isToday ? "text-orange-600" : "text-muted-foreground"}`}>
                    {isOverdue ? `${Math.abs(days)}h terlambat` : isToday ? "Hari ini!" : `${days} hari lagi`}
                  </span>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* ── PAKAN HARI INI ── */}
      <PakanHarianWidget />

      {/* ── 3.5 INKUBATOR ── */}
      <KeeperIncubatorWidget />

      {/* ── 3.7 PERLU PERHATIAN ── */}
      <KeeperAttentionWidget />

      {/*
        ── BONUS BULAN INI ──

        Di sini dulu ada kartu "KPI Bulan Ini" berisi dua angka: poin
        terkumpul dan hari disetujui. Keduanya SUDAH tertulis di lencana
        paling atas halaman ini — variabel yang sama persis, `approvedPoints`
        dan `approvedDays` — hanya saja diulang di dasar gulungan, tempat
        keduanya paling tidak berguna. Kartu yang tidak menambah apa pun
        bukan cuma pemborosan ruang; ia membuat orang berhenti membaca kartu.

        Yang menggantikannya menjawab pertanyaan yang benar-benar dipunyai
        orangnya: poin ini menuju ke mana. BonusBulanIni sudah ada dan sudah
        matang — tingkat bonus, perkiraan rupiah, tugas yang lewat tenggat
        beserta poin yang hilang — tetapi selama ini hanya muncul di alur
        "Kerja Hari Ini", bukan di beranda yang dibuka setiap pagi.

        `kurangTim` dipisahkan dari `kurangPribadi` di sana dengan sengaja:
        kalau yang kurang poin TIM, bekerja lebih keras sendirian tidak akan
        menutupnya. Itu justru yang perlu dilihat sejak pagi, bukan di akhir
        bulan.
      */}
      <BonusBulanIni user={user} rinciTugas={false} />

      <AlasanTerlambatDialog
        open={!!menungguAlasan}
        onClose={() => setMenungguAlasan(null)}
        jamMasuk={menungguAlasan?.jam}
        menitTelat={menungguAlasan?.menit}
        namaKaryawan={user?.full_name}
        onSimpan={(isian) => jalankanCheckIn(menungguAlasan.jam, isian)}
      />
    </div>
  );
}
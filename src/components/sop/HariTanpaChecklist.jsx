/**
 * HariTanpaChecklist — hari yang dikerjakan tetapi tidak pernah tercatat.
 *
 * Pada 13, 14 dan 15 Agustus 2026 kedua kiper check-in jam 06:48 dan 06:55,
 * dan tidak ada satu pun checklist untuk ketiga hari itu. Baru ketahuan tiga
 * bulan kemudian, saat target poin dihitung ulang — dan saat itu poinnya sudah
 * hangus, karena tidak ada lagi yang ingat kandang mana yang dibersihkan.
 *
 * Panel ini tidak memperbaiki apa pun sendiri. Ia memendekkan jedanya: besok,
 * bukan tiga bulan lagi.
 *
 * Dua pembaca, satu komponen:
 *   · kiper  (`milikSendiri`) melihat harinya sendiri, dengan tautan ke layar
 *     tugas supaya bisa langsung dikejar;
 *   · pemilik melihat seluruh tim beserta taksiran poin yang hilang.
 *
 * Hari ini tidak pernah ditagih. Kiper masih punya sisa hari untuk mengisinya,
 * dan peringatan yang menyala sejak pagi akan berhenti dibaca.
 */
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { CalendarX, ChevronRight } from "lucide-react";
import { format, parseISO } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { useCompanySettings } from "@/lib/useCompanySettings";
import { hariHadirTanpaChecklist, perkiraanPoinHilang } from "@/lib/hariBolong";

export default function HariTanpaChecklist({ email, milikSendiri = false, mundur = 14 }) {
  const pengaturan = useCompanySettings();

  const { data: absensi = [] } = useQuery({
    queryKey: ["absensi-bolong", email || "semua"],
    queryFn: () =>
      email
        ? base44.entities.Attendance.filter({ employee_email: email }, "-date", 120)
        : base44.entities.Attendance.list("-date", 400),
    staleTime: 5 * 60 * 1000,
  });

  const { data: checklists = [] } = useQuery({
    queryKey: ["checklist-bolong", email || "semua"],
    queryFn: () =>
      email
        ? base44.entities.DailyChecklist.filter({ employee_email: email }, "-date", 120)
        : base44.entities.DailyChecklist.list("-date", 400),
    staleTime: 5 * 60 * 1000,
  });

  const bolong = hariHadirTanpaChecklist(absensi, checklists, { mundur });
  if (bolong.length === 0) return null;

  const nilaiPoin = pengaturan?.poin_bonus_enabled === true
    ? Number(pengaturan?.nilai_per_poin || 0) : 0;
  const { poin, rupiah } = perkiraanPoinHilang(bolong, checklists, nilaiPoin);

  const judul = milikSendiri
    ? `${bolong.length} hari kerjamu belum ada catatannya`
    : `${bolong.length} hari kerja tanpa checklist`;

  const isi = (
    <>
      <div className="flex items-start gap-2.5">
        <CalendarX className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-sm">{judul}</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {milikSendiri
              ? "Absensimu tercatat hadir, tapi checklist hari itu kosong — jadi poinnya belum jadi apa-apa."
              : "Absensi tercatat hadir, checklist hari itu tidak ada sama sekali."}
            {poin > 0 && (
              <>
                {" "}Kira-kira <strong>{poin} poin</strong>
                {rupiah > 0 ? ` (Rp ${rupiah.toLocaleString("id-ID")})` : ""}.
              </>
            )}
          </p>
        </div>
        {milikSendiri && <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />}
      </div>

      <div className="mt-3 flex flex-col gap-1.5">
        {bolong.slice(0, 6).map((b) => (
          <div
            key={`${b.tanggal}-${b.email}`}
            className="flex items-center gap-3 rounded-lg border border-border bg-card px-3 py-2"
          >
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">
                {format(parseISO(b.tanggal), "EEEE, d MMM", { locale: idLocale })}
              </p>
              {!milikSendiri && (
                <p className="text-[11px] text-muted-foreground">{b.nama}</p>
              )}
            </div>
            {b.jamMasuk && (
              <p className="text-xs text-muted-foreground tabular-nums flex-shrink-0">
                masuk {b.jamMasuk}
              </p>
            )}
          </div>
        ))}
        {bolong.length > 6 && (
          <p className="text-[11px] text-muted-foreground">dan {bolong.length - 6} hari lagi</p>
        )}
      </div>
    </>
  );

  const kelas = "block rounded-2xl border border-amber-500/30 bg-amber-500/8 p-4";
  return milikSendiri ? (
    <Link to="/sop" className={`${kelas} hover:bg-amber-500/12 transition-colors`}>{isi}</Link>
  ) : (
    <div className={kelas}>{isi}</div>
  );
}

import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { format } from "date-fns";
import { ChevronRight, AlertTriangle, Check } from "lucide-react";
import InfoHint from "@/components/ui/info-hint";
import { cn } from "@/lib/utils";

/**
 * AlurGaji — penanda tahap untuk rangkaian penggajian.
 *
 * Menggaji satu orang menyentuh beberapa halaman berbeda, dan tidak ada satu
 * pun yang memberi tahu urutannya atau apakah tahap sebelumnya sudah beres.
 * Orang menghitung gaji lebih dulu, baru sadar poinnya belum disetujui.
 *
 * Penyatuan penuh ke satu layar tidak dilakukan dengan sengaja: penerbitan slip
 * menyentuh uang orang, dan menulis ulang logikanya demi kerapian tampilan
 * bukan pertukaran yang sepadan. Yang disatukan di sini adalah urutan dan
 * kesiapannya — tiap tahap tetap di halamannya, tapi tahu posisinya dalam
 * rangkaian dan memberi tahu bila ada yang menghalangi.
 *
 * Angka pada tahap "Poin" bukan hiasan: menghitung gaji sementara masih ada
 * checklist yang menunggu persetujuan menghasilkan gaji yang lebih kecil dari
 * yang seharusnya, dan slip yang sudah terbit tidak ikut berubah sendiri.
 */

const TAHAP = [
  {
    id: "poin",
    path: "/approval-poin",
    label: "Setujui poin",
    urut: 1,
    jelas: "Checklist yang belum disetujui poinnya belum masuk hitungan gaji.",
  },
  {
    id: "masukan",
    path: "/payroll-gaji",
    label: "Lembur, sayur, kasbon",
    urut: 2,
    jelas: "Masukan di luar poin: jam lembur, trip sayur, dan potongan kasbon.",
  },
  {
    id: "hitung",
    path: "/rekap-poin-gaji",
    label: "Hitung & terbitkan slip",
    urut: 3,
    jelas: "Menghitung gaji seluruh karyawan lalu menerbitkan slipnya.",
  },
  {
    id: "slip",
    path: "/salary-slip",
    label: "Slip & pembayaran",
    urut: 4,
    jelas: "Slip yang sudah terbit, untuk dicetak dan ditandai lunas.",
  },
];

export default function AlurGaji({ aktif, periode }) {
  const bulan = periode || format(new Date(), "yyyy-MM");

  // Hanya satu hitungan yang benar-benar menghalangi: poin yang belum disetujui.
  // Sisanya tidak diambil supaya penanda ini tidak menambah beban halaman.
  const { data: menunggu = [] } = useQuery({
    queryKey: ["owner-pending-approval"],
    queryFn: () => base44.entities.DailyChecklist.filter({ status: "submitted" }, "-date", 500),
    staleTime: 60 * 1000,
  });

  const belumDisetujui = menunggu.filter((c) => (c.date || "").startsWith(bulan)).length;

  return (
    <div className="rounded-xl border border-border bg-card p-3 space-y-2">
      <div className="flex items-center gap-1.5">
        <span className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
          Alur penggajian
        </span>
        <InfoHint title="Urutan penggajian" variant="info" size={12}>
          Kerjakan dari kiri ke kanan. Menghitung gaji sebelum poinnya disetujui
          menghasilkan angka yang lebih kecil dari seharusnya, dan slip yang sudah
          terbit tidak ikut berubah bila poinnya disetujui belakangan.
        </InfoHint>
      </div>

      <div className="flex items-center gap-1 overflow-x-auto pb-1 -mx-1 px-1">
        {TAHAP.map((t, i) => {
          const ini = t.id === aktif;
          const menghalangi = t.id === "poin" && belumDisetujui > 0;

          return (
            <div key={t.id} className="flex items-center gap-1 flex-shrink-0">
              {i > 0 && <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/40 flex-shrink-0" />}
              <Link
                to={t.path}
                title={t.jelas}
                aria-current={ini ? "step" : undefined}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs whitespace-nowrap transition-colors",
                  ini
                    ? "bg-primary text-primary-foreground border-primary font-semibold"
                    : menghalangi
                      ? "bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-900 hover:bg-amber-100"
                      : "bg-background border-border text-muted-foreground hover:bg-muted"
                )}
              >
                <span
                  className={cn(
                    "inline-flex items-center justify-center w-4 h-4 rounded-full text-[9px] font-bold flex-shrink-0",
                    ini ? "bg-primary-foreground/20" : "bg-muted-foreground/15"
                  )}
                >
                  {t.urut}
                </span>
                {t.label}
                {menghalangi && (
                  <span className="inline-flex items-center gap-0.5 font-bold tabular">
                    <AlertTriangle className="w-3 h-3" />
                    {belumDisetujui}
                  </span>
                )}
              </Link>
            </div>
          );
        })}
      </div>

      {belumDisetujui > 0 ? (
        <p className="text-[11px] text-amber-700 dark:text-amber-400 flex items-start gap-1.5">
          <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-px" />
          <span>
            <strong>{belumDisetujui} checklist</strong> bulan ini menunggu persetujuan. Poinnya
            belum masuk hitungan gaji — setujui dulu sebelum menerbitkan slip.
          </span>
        </p>
      ) : (
        <p className="text-[11px] text-muted-foreground flex items-start gap-1.5">
          <Check className="w-3.5 h-3.5 text-accent flex-shrink-0 mt-px" />
          <span>Tidak ada poin yang menunggu persetujuan untuk periode ini.</span>
        </p>
      )}
    </div>
  );
}

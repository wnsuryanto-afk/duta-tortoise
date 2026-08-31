import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { TrendingUp, TrendingDown, Minus, HeartPulse, Leaf, Egg } from "lucide-react";
import { Sparkline } from "@/components/ui/sparkline";
import InfoHint from "@/components/ui/info-hint";
import { deretMingguan, bacaArah } from "@/lib/tren";
import { cn } from "@/lib/utils";
import { masukLaporan } from "@/lib/laporan";

/**
 * ArahMingguIni — lapis kedua beranda: ke mana keadaan sedang bergerak.
 *
 * Lapis ini sengaja tidak pernah menuntut tindakan hari ini; itu tugas
 * KeputusanHariIni di atasnya. Tugasnya memberi peringatan dini — biaya pakan
 * yang merangkak naik atau kura sakit yang bertambah tiap minggu jauh lebih
 * berguna diketahui sekarang daripada saat sudah jadi masalah.
 *
 * Dua aturan yang dipegang di sini:
 *
 *   - Tidak ada warna merah. Merah milik lapis keputusan. Kalau arah yang
 *     memburuk ikut merah, dua lapis berteriak sama keras dan yang mendesak
 *     kehilangan bobotnya.
 *   - Deret dengan kurang dari dua minggu terisi tidak digambar sebagai tren.
 *     Menarik garis dari satu titik memberi kesan arah yang belum tentu ada.
 */

const NADA = {
  membaik:          { teks: "text-accent",                            garis: "hsl(var(--accent))" },
  "perlu dilihat":  { teks: "text-amber-600 dark:text-amber-400",     garis: "hsl(35 65% 52%)" },
  sunyi:            { teks: "text-muted-foreground",                  garis: "hsl(var(--muted-foreground))" },
};

function KartuArah({ ikon: Ikon, label, nilai, satuan, hasil, arah, href, penjelasan }) {
  const nada = NADA[arah.nada] || NADA.sunyi;
  // Panah mengikuti gerakan sebenarnya, warnanya mengikuti artinya —
  // naik yang buruk tetap digambar naik, hanya warnanya yang berbeda.
  const Panah = arah.arah === "datar" ? Minus : arah.arah === "naik" ? TrendingUp : TrendingDown;

  return (
    <Link
      to={href}
      className="surface-raised hover-lift group p-3.5 flex flex-col gap-2 min-w-0"
    >
      <div className="flex items-center gap-1.5 min-w-0">
        <Ikon className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
        <span className="text-[11px] font-medium text-muted-foreground truncate">{label}</span>
        <InfoHint title={label} variant="info" size={12} className="flex-shrink-0">
          {penjelasan}
        </InfoHint>
      </div>

      <div className="flex items-end justify-between gap-2">
        <div className="min-w-0">
          <p className="stat-value text-xl text-foreground leading-none">
            {nilai}
            {satuan && <span className="text-xs font-medium text-muted-foreground ml-1">{satuan}</span>}
          </p>
          <p className={cn("text-[11px] mt-1 flex items-center gap-0.5 leading-tight", nada.teks)}>
            <Panah className="w-3 h-3 flex-shrink-0" />
            <span className="truncate">{arah.teks}</span>
          </p>
        </div>

        {hasil.cukupData ? (
          <Sparkline
            data={hasil.deret}
            color={nada.garis}
            width={62}
            height={26}
            className="flex-shrink-0"
          />
        ) : (
          <span className="text-[10px] text-muted-foreground/60 italic flex-shrink-0">
            8 minggu
          </span>
        )}
      </div>
    </Link>
  );
}

export default function ArahMingguIni() {
  // Lapis dua menunggu lapis satu selesai tampil. Tren tidak pernah mendesak,
  // jadi tidak pantas ikut memperlambat hal yang harus diputuskan pagi ini.
  const [siap, setSiap] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setSiap(true), 1200);
    return () => clearTimeout(t);
  }, []);

  // Kunci tersendiri: pemakai lain menarik entitas yang sama dengan batas jauh
  // lebih kecil (50-100 catatan), yang tidak cukup menutup 8 minggu ke belakang.
  const { data: kesehatan = [] } = useQuery({
    queryKey: ["tren-health"],
    queryFn: () => base44.entities.HealthRecord.list("-date", 300),
    enabled: siap,
    staleTime: 10 * 60 * 1000,
  });
  const { data: keuangan = [] } = useQuery({
    queryKey: ["tren-finance"],
    queryFn: () => base44.entities.FinanceTransaction.list("-date", 400),
    enabled: siap,
    staleTime: 10 * 60 * 1000,
  });
  const { data: breeding = [] } = useQuery({
    queryKey: ["tren-breeding"],
    queryFn: () => base44.entities.Breeding.list("-egg_laying_date", 200),
    enabled: siap,
    staleTime: 10 * 60 * 1000,
  });

  if (!siap) return null;

  const sakit = deretMingguan(kesehatan, {
    tanggal: (r) => r.date,
    saring: (r) => r.type === "sakit" && masukLaporan(r),
  });

  const pakan = deretMingguan(keuangan, {
    tanggal: (r) => r.date,
    nilai: (r) => r.amount || 0,
    saring: (r) => r.type === "pengeluaran" && r.category === "pakan" && masukLaporan(r),
  });

  const telur = deretMingguan(breeding, {
    tanggal: (r) => r.egg_laying_date,
    nilai: (r) => r.egg_count || 0,
    saring: masukLaporan,
  });

  // toFixed menghasilkan titik desimal ("2.1"); dalam bahasa Indonesia
  // pemisah desimalnya koma, dan sisa aplikasi memakai toLocaleString("id-ID").
  const rupiahRingkas = (n) => {
    if (n >= 1_000_000) {
      const jt = n / 1_000_000;
      return `${jt.toLocaleString("id-ID", { maximumFractionDigits: n >= 10_000_000 ? 0 : 1 })} jt`;
    }
    if (n >= 1_000) return `${Math.round(n / 1_000).toLocaleString("id-ID")} rb`;
    return Math.round(n).toLocaleString("id-ID");
  };

  // Kalau ketiganya belum punya data sama sekali, lapis ini tidak punya apa pun
  // untuk dikatakan — lebih baik hilang daripada memenuhi layar dengan nol.
  const adaIsi = sakit.cukupData || pakan.cukupData || telur.cukupData;
  if (!adaIsi) return null;

  return (
    <section className="space-y-2.5">
      <div className="flex items-baseline justify-between gap-3 flex-wrap">
        <h2 className="text-sm font-bold font-heading uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
          Arah minggu ini
          <InfoHint title="Arah minggu ini" variant="info" size={13}>
            Membandingkan <b>7 hari terakhir</b> dengan 7 hari sebelumnya, dan menggambar
            8 minggu ke belakang. Tidak ada yang perlu dikerjakan hari ini dari bagian
            ini — tugasnya memberi tahu ke mana keadaan bergerak sebelum jadi masalah.
          </InfoHint>
        </h2>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
        <KartuArah
          ikon={HeartPulse}
          label="Kura sakit baru"
          nilai={sakit.terkini}
          satuan="kasus"
          hasil={sakit}
          arah={bacaArah(sakit, { naikItuBaik: false })}
          href="/health"
          penjelasan="Catatan sakit baru dalam 7 hari terakhir. Kura yang sama dicatat dua kali akan terhitung dua kasus, jadi angkanya mengikuti beban perawatan, bukan jumlah ekor."
        />
        <KartuArah
          ikon={Leaf}
          label="Biaya pakan"
          nilai={`Rp ${rupiahRingkas(pakan.terkini)}`}
          hasil={pakan}
          arah={bacaArah(pakan, { naikItuBaik: false })}
          href="/finance"
          penjelasan="Pengeluaran berkategori pakan dalam 7 hari terakhir. Naik tidak selalu buruk — bisa karena belanja borongan — tapi kenaikan beruntun beberapa minggu layak ditelusuri."
        />
        <KartuArah
          ikon={Egg}
          label="Telur baru"
          nilai={telur.terkini}
          satuan="butir"
          hasil={telur}
          arah={bacaArah(telur, { naikItuBaik: true })}
          href="/breeding"
          penjelasan="Telur yang dicatat bertelur dalam 7 hari terakhir. Ini penanda awal produksi — turunnya terlihat di sini jauh sebelum terlihat di jumlah penetasan."
        />
      </div>
    </section>
  );
}
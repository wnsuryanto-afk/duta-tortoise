import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { TrendingUp, TrendingDown, ChevronRight, Wallet } from "lucide-react";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { useCostPerTortoise } from "@/hooks/useCostPerTortoise";
import { hitungOmzet } from "@/lib/omzet";

const fmt = (n) => `Rp ${Math.round(n || 0).toLocaleString("id-ID")}`;

/**
 * LabaRugiWidget — keuangan bulan berjalan, dengan OMZET sebagai angka utama.
 *
 * ── Kenapa omzet yang paling besar ─────────────────────────────────────────
 *
 * Sebelumnya yang dicetak besar adalah LABA, dan omzet hanya muncul sebagai
 * tulisan kecil "Pemasukan Rp X" di atas batang. Itu membalik urutan yang
 * sebenarnya dipakai orang: omzet menjawab "berapa yang masuk bulan ini",
 * pertanyaan pertama yang ditanyakan siapa pun yang membuka beranda. Laba
 * adalah kesimpulannya, bukan pembukanya — dan laba yang berdiri sendirian
 * tanpa omzet di sebelahnya tidak bisa dibaca: rugi Rp 600.000 pada omzet nol
 * berarti hal yang sama sekali berbeda dari rugi Rp 600.000 pada omzet sepuluh
 * juta.
 *
 * Laba dan pengeluaran tetap ada, satu tingkat di bawahnya.
 *
 * ── Nol yang dikatakan, bukan nol yang dibiarkan ───────────────────────────
 *
 * September 2026 tidak punya satu pun penjualan. Angka besar "Rp 0" tanpa
 * keterangan terbaca seperti layar yang gagal memuat. Maka saat omzetnya nol,
 * kalimat di bawahnya menyebutkan itu apa adanya.
 */
export default function LabaRugiWidget() {
  const now = new Date();
  const monthKey = format(now, "yyyy-MM");
  const namaBulan = format(now, "MMMM", { locale: idLocale });
  const dari = format(startOfMonth(now), "yyyy-MM-dd");
  const sampai = format(endOfMonth(now), "yyyy-MM-dd");

  const costData = useCostPerTortoise(monthKey);

  /*
    Tanpa batas eksplisit — sengaja.

    Kartu ini dulu membaca 200 baris terakhir, sementara lencana "Laba bulan
    ini" di kepala beranda pemilik membaca tanpa batas. Rumus keduanya sama,
    jadi selama tabelnya di bawah 200 baris keduanya sepakat. Pembungkus di
    api/base44Client.js memakai BATAS_AMBIL dan MEMPERINGATKAN saat hasilnya
    pas di batas; limit eksplisit yang lebih kecil mematikan penjagaan itu.
  */
  const { data: finances = [] } = useQuery({
    queryKey: ["widget-labugi-finances", monthKey],
    queryFn: () => base44.entities.FinanceTransaction.list("-date"),
    staleTime: 5 * 60 * 1000,
  });

  const k = useMemo(() => hitungOmzet(finances, { dari, sampai }), [finances, dari, sampai]);

  // Batang perbandingan. Keduanya diukur terhadap yang terbesar, supaya yang
  // lebih besar selalu penuh dan perbandingannya langsung terbaca.
  const maks = Math.max(k.totalMasuk, k.pengeluaran, 1);
  const persenMasuk = Math.round((k.totalMasuk / maks) * 100);
  const persenKeluar = Math.round((k.pengeluaran / maks) * 100);
  const untung = k.laba >= 0;

  return (
    <Card className="p-4 bg-gradient-to-br from-green-50/50 to-white border-green-200">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 min-w-0">
          <Wallet className="w-4 h-4 text-green-700 flex-shrink-0" />
          <p className="font-semibold text-sm truncate">Keuangan {namaBulan}</p>
        </div>
        <Link
          to="/finance"
          className="text-xs text-primary hover:underline flex items-center gap-1 flex-shrink-0"
        >
          Detail <ChevronRight className="w-3 h-3" />
        </Link>
      </div>

      {/* ── Omzet: angka utama ── */}
      <div>
        <p className="text-[11px] font-bold uppercase tracking-wide text-green-700">
          Omzet bulan ini
        </p>
        <p className="text-3xl font-extrabold text-green-900 leading-tight mt-0.5 tabular-nums break-words">
          {fmt(k.omzet)}
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          {k.omzet > 0
            ? `dari ${k.jumlahPenjualan} penjualan`
            : "belum ada penjualan bulan ini"}
          {k.pemasukanLain > 0 && (
            <> · pemasukan lain {fmt(k.pemasukanLain)}</>
          )}
        </p>
      </div>

      {/* ── Perbandingan masuk vs keluar ── */}
      <div className="w-full h-2.5 bg-muted rounded-full overflow-hidden flex mt-3">
        <div
          className="h-full bg-green-500 transition-all"
          style={{ width: `${persenMasuk}%` }}
        />
        <div
          className="h-full bg-red-400 transition-all"
          style={{ width: `${persenKeluar}%` }}
        />
      </div>

      {/* ── Pengeluaran & laba, satu tingkat di bawah omzet ── */}
      <div className="grid grid-cols-2 gap-2 mt-3">
        <div className="rounded-lg bg-white/70 border border-border px-3 py-2">
          <p className="text-[11px] text-muted-foreground">Pengeluaran</p>
          <p className="text-base font-bold text-red-600 tabular-nums break-words leading-tight">
            {fmt(k.pengeluaran)}
          </p>
        </div>
        <div
          className={`rounded-lg px-3 py-2 border ${
            untung ? "bg-green-100/70 border-green-200" : "bg-red-100/70 border-red-200"
          }`}
        >
          <p className="text-[11px] flex items-center gap-1 text-muted-foreground">
            {untung ? (
              <TrendingUp className="w-3 h-3 text-green-600" />
            ) : (
              <TrendingDown className="w-3 h-3 text-red-600" />
            )}
            {untung ? "Laba" : "Rugi"}
          </p>
          <p
            className={`text-base font-bold tabular-nums break-words leading-tight ${
              untung ? "text-green-700" : "text-red-700"
            }`}
          >
            {fmt(Math.abs(k.laba))}
          </p>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between gap-2 text-xs text-muted-foreground">
        <span className="flex-shrink-0">Biaya per ekor/bulan</span>
        <span className="font-semibold tabular-nums text-right">
          {fmt(costData?.biayaPerEkor || 0)}
          {!costData?.isDataAktual && <span className="text-amber-500 ml-1">(estimasi)</span>}
        </span>
      </div>
    </Card>
  );
}

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { TrendingUp, TrendingDown, ChevronRight, Wallet } from "lucide-react";
import { format } from "date-fns";
import { useCostPerTortoise } from "@/hooks/useCostPerTortoise";
import GrafikUang from "@/components/ui/grafik-uang";
import { hitungOmzet, omzetPerBulan, rentangTahun, bulanRugiBeruntun } from "@/lib/omzet";
import { kueriUang } from "@/lib/kueriUang";

const fmt = (n) => `Rp ${Math.round(n || 0).toLocaleString("id-ID")}`;

/**
 * LabaRugiWidget — keuangan SETAHUN, dengan omzet sebagai angka utama.
 *
 * ── Kenapa setahun, bukan sebulan ──────────────────────────────────────────
 *
 * Kartu ini sempat menampilkan bulan berjalan. Untuk September 2026 hasilnya:
 * omzet Rp 0, rugi Rp 662.453. Betul semuanya, dan tetap menyesatkan —
 * peternakan ini menjual Rp 27,9 juta di Juni dan Rp 28,6 juta di Juli.
 * Sebulan terlalu pendek untuk usaha yang penjualannya datang berombak: satu
 * bulan sepi terbaca seperti usaha yang berhenti.
 *
 * Setahun menjawab pertanyaan yang sebenarnya: sepanjang 2026 masuk berapa.
 *
 * ── Kenapa tetap ada grafik bulanan ────────────────────────────────────────
 *
 * Angka tahunan punya kelemahan yang berkebalikan: Rp 58 juta terbaca bagus
 * padahal dua bulan terakhir merugi. Angka tahunan menjawab "sudah sejauh
 * mana", grafiknya menjawab "sedang ke mana" — dan yang kedua itu yang
 * menentukan keputusan belanja minggu depan. Karena itu keduanya ada, dan
 * kalimat di bawah grafik menyebut rentetan bulan rugi terakhir dengan
 * terang-terangan supaya tidak tenggelam di bawah angka besar.
 *
 * Grafiknya memakai <GrafikUang> yang sudah dipakai di layar keuangan —
 * warnanya sian/kuning, bukan hijau/merah, supaya terbaca oleh mata buta
 * warna merah-hijau. Lihat components/ui/grafik-uang.jsx.
 */
export default function LabaRugiWidget() {
  const now = new Date();
  const tahun = now.getFullYear();
  const bulanSekarang = now.getMonth() + 1;
  const monthKey = format(now, "yyyy-MM");
  const { dari, sampai } = rentangTahun(tahun);

  const costData = useCostPerTortoise(monthKey);

  /*
    Kunci cache bersama, tanpa batas baris — alasan lengkapnya di
    lib/kueriUang.js. Ringkasnya: kartu ini dan lencana "Laba <tahun>" di
    kepala beranda pemilik menjumlahkan tabel yang sama, jadi keduanya harus
    membaca salinan yang sama; dan yang dijumlah kini setahun penuh, bukan
    sebulan, sehingga limit eksplisit yang kecil jauh lebih berbahaya.
  */
  const { data: finances = [] } = useQuery(kueriUang);

  const k = useMemo(() => hitungOmzet(finances, { dari, sampai }), [finances, dari, sampai]);
  const perBulan = useMemo(
    () => omzetPerBulan(finances, tahun, bulanSekarang),
    [finances, tahun, bulanSekarang]
  );
  const rugiBeruntun = useMemo(() => bulanRugiBeruntun(perBulan), [perBulan]);

  const untung = k.laba >= 0;

  return (
    <Card className="p-4 bg-gradient-to-br from-green-50/50 to-white border-green-200">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 min-w-0">
          <Wallet className="w-4 h-4 text-green-700 flex-shrink-0" />
          <p className="font-semibold text-sm truncate">Keuangan {tahun}</p>
        </div>
        <Link
          to="/finance"
          className="text-xs text-primary hover:underline flex items-center gap-1 flex-shrink-0"
        >
          Detail <ChevronRight className="w-3 h-3" />
        </Link>
      </div>

      {/* ── Omzet setahun: angka utama ── */}
      <div>
        <p className="text-[11px] font-bold uppercase tracking-wide text-green-700">
          Omzet tahun {tahun}
        </p>
        <p className="text-3xl font-extrabold text-green-900 leading-tight mt-0.5 tabular-nums break-words">
          {fmt(k.omzet)}
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          {k.omzet > 0
            ? `dari ${k.jumlahPenjualan} penjualan`
            : `belum ada penjualan sepanjang ${tahun}`}
          {k.pemasukanLain > 0 && <> · pemasukan lain {fmt(k.pemasukanLain)}</>}
        </p>
      </div>

      {/* ── Naik turunnya per bulan ──
          Kalau tahunnya belum punya satu baris pun, grafiknya tidak digambar
          sama sekali: kotak kosong setinggi 190px tidak menambah apa pun di
          atas kalimat "belum ada penjualan sepanjang 2026" yang sudah ada
          tepat di atasnya. Ini keadaan yang akan terlihat tiap 1 Januari. */}
      {k.jumlahBaris > 0 && (
        <div className="mt-3">
          <GrafikUang data={perBulan} tinggi={190} />
        </div>
      )}

      {/*
        Rentetan bulan rugi terakhir, disebut terang-terangan.

        Ini penyeimbang angka tahunan di atasnya: omzet Rp 58 juta setahun
        tidak boleh menutupi kenyataan bahwa dua bulan terakhir merugi. Kalau
        tidak ada rentetannya, baris ini tidak muncul sama sekali.
      */}
      {rugiBeruntun.length > 0 && (
        <p className="mt-2 text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {rugiBeruntun.length === 1 ? (
            <>
              <span className="font-semibold">{rugiBeruntun[0].label}</span> rugi{" "}
              {fmt(Math.abs(rugiBeruntun[0].laba))}
            </>
          ) : (
            <>
              <span className="font-semibold">
                {rugiBeruntun.length} bulan terakhir rugi
              </span>{" "}
              — {rugiBeruntun.map((b) => `${b.label} ${fmt(Math.abs(b.laba))}`).join(", ")}
            </>
          )}
        </p>
      )}

      {/* ── Pengeluaran & laba setahun, satu tingkat di bawah omzet ── */}
      <div className="grid grid-cols-2 gap-2 mt-3">
        <div className="rounded-lg bg-white/70 border border-border px-3 py-2">
          <p className="text-[11px] text-muted-foreground">Pengeluaran {tahun}</p>
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
            {untung ? "Laba" : "Rugi"} {tahun}
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

      {/* Satu-satunya angka bulanan yang tersisa di kartu ini, dan labelnya
          menyebutkan itu — biaya per ekor memang hanya berarti per bulan. */}
      <div className="mt-3 flex items-center justify-between gap-2 text-xs text-muted-foreground">
        <span className="flex-shrink-0">Biaya per ekor bulan ini</span>
        <span className="font-semibold tabular-nums text-right">
          {fmt(costData?.biayaPerEkor || 0)}
          {!costData?.isDataAktual && <span className="text-amber-500 ml-1">(estimasi)</span>}
        </span>
      </div>
    </Card>
  );
}

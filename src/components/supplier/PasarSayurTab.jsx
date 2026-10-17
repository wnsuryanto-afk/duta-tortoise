import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Carrot, Info, Repeat, TrendingDown } from "lucide-react";
import { base44, BATAS_AMBIL } from "@/api/base44Client";
import TombolWhatsApp from "@/components/common/TombolWhatsApp";
import { kumpulkanPenawaran, barangTersedia, barangSerumpun, penjualTermurah } from "@/lib/pasarSupplier";
import { rupiah } from "@/lib/rupiah";

/**
 * PasarSayurTab — sayur apa yang ada, dari siapa, berapa per kilogram.
 *
 * ── Apa yang dijawabnya, dan apa yang TIDAK ─────────────────────────────────
 *
 * Diminta 17 Okt 2026: "laporan supplier mana yang terbaik atau ranking dan
 * harga yang paling ideal dan sayur apa yang ada".
 *
 * Tiga bisa dijawab sekarang dari tujuh lead yang sudah masuk lewat tangkapan
 * layar: sayur apa, dari siapa, dan berapa per kilogram. Yang keempat —
 * supplier mana yang TERBAIK — tidak, dan layarnya mengatakan itu alih-alih
 * mengarang peringkat. Alasannya ditulis lengkap di lib/pasarSupplier.js:
 * tidak ada satu pun catatan barang masuk yang menunjuk balik ke supplier,
 * jadi tidak ada riwayat untuk diperingkat.
 *
 * Harga yang tidak bisa dibandingkan ("nego", "Obral", "5.000/ikat") TETAP
 * ditampilkan, dengan sebabnya. Menyembunyikannya membuat pilihan terlihat
 * lebih sedikit daripada yang sebenarnya — dan "nego" bukan berarti mahal,
 * ia berarti belum ditanya.
 */

const IRAMA = {
  harian: "tiap hari",
  "2_hari": "tiap 2 hari",
  mingguan: "tiap minggu",
  "2_minggu": "tiap 2 minggu",
  bulanan: "tiap bulan",
  sesuai_pesanan: "sesuai pesanan",
};

export default function PasarSayurTab() {
  const { data: leads = [] } = useQuery({
    queryKey: ["pasar-leads"],
    queryFn: () => base44.entities.SupplierLead.list("-created_date", BATAS_AMBIL),
    staleTime: 5 * 60 * 1000,
  });
  const { data: items = [] } = useQuery({
    queryKey: ["pasar-items"],
    queryFn: () => base44.entities.SupplierItem.list("-created_date", BATAS_AMBIL),
    staleTime: 5 * 60 * 1000,
  });
  const { data: suppliers = [] } = useQuery({
    queryKey: ["pasar-suppliers"],
    queryFn: () => base44.entities.Supplier.list("-created_date", BATAS_AMBIL),
    staleTime: 5 * 60 * 1000,
  });

  const penawaran = useMemo(
    () => kumpulkanPenawaran({ leads, items, suppliers }),
    [leads, items, suppliers],
  );
  /* Digabung per tawaran: satu lead yang menyebut empat sayur adalah satu
     baris, bukan empat baris yang berbunyi sama. Alasannya di lib. */
  const barang = useMemo(() => barangSerumpun(barangTersedia(penawaran)), [penawaran]);
  const penjual = useMemo(() => penjualTermurah(penawaran), [penawaran]);
  const rutin = useMemo(() => suppliers.filter((s) => s.rutin_kirim), [suppliers]);

  if (penawaran.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Carrot className="w-10 h-10 mx-auto mb-3 opacity-20" />
        <p className="text-sm font-medium">Belum ada penawaran untuk dibandingkan</p>
        <p className="text-xs mt-1">
          Tambahkan lead dari tangkapan layar di tab Leads, atau daftar barang di tab Supplier.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-2" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))" }}>
        <div className="rounded-xl border border-border bg-card p-3">
          <p className="text-[11px] text-muted-foreground">Jenis sayur/buah</p>
          <p className="text-xl font-bold text-foreground tabular-nums">{barang.reduce((n, b) => n + b.nama.length, 0)}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-3">
          <p className="text-[11px] text-muted-foreground">Penjual dengan harga</p>
          <p className="text-xl font-bold text-foreground tabular-nums">{penjual.length}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-3">
          <p className="text-[11px] text-muted-foreground">Sanggup kirim rutin</p>
          <p className="text-xl font-bold text-foreground tabular-nums">{rutin.length}</p>
        </div>
      </div>

      {/*
        Yang belum bisa dijawab dikatakan di muka, bukan disembunyikan.
        Peringkat "supplier terbaik" yang dikarang dari rating ketikan sendiri
        akan terlihat tegas dan tidak berdasar apa pun.
      */}
      <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-3">
        <p className="text-xs font-semibold text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
          <Info className="w-3.5 h-3.5 flex-shrink-0" /> Yang diurutkan di sini HARGA, bukan keandalan
        </p>
        <p className="text-[11px] text-amber-900/80 dark:text-amber-200/80 mt-1 leading-relaxed">
          Peringkat "supplier terbaik" perlu riwayat: siapa yang benar-benar mengirim, tepat waktu,
          dengan harga yang dijanjikan. Hari ini barang masuk belum menyimpan supplier-nya, jadi
          riwayat itu belum ada. Yang tampil di bawah murni perbandingan harga dari apa yang mereka
          sebut sendiri.
        </p>
      </div>

      <div>
        <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1.5">
          <TrendingDown className="w-3.5 h-3.5" /> Penjual · termurah dulu
        </p>
        <div className="space-y-2">
          {penjual.map((p) => (
            <div key={p.dari} className="rounded-xl border border-border bg-card p-3">
              <div className="flex items-start justify-between gap-2 flex-wrap">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground">{p.dari}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {p.jumlahBarang} barang · termurah{" "}
                    <span className="font-semibold text-foreground tabular-nums">{rupiah(p.termurah)}/kg</span>
                    {p.rataRata !== p.termurah && <> · rata-rata {rupiah(p.rataRata)}/kg</>}
                  </p>
                  {p.rutin && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-accent mt-1">
                      <Repeat className="w-3 h-3" /> kirim rutin{p.irama ? ` ${IRAMA[p.irama] || p.irama}` : ""}
                    </span>
                  )}
                </div>
                {p.hp && (
                  <TombolWhatsApp
                    nomor={p.hp}
                    pesan={`Halo ${p.dari}, saya dari peternakan kura Duta Tortoise. Mau tanya sayur yang tersedia dan apakah bisa kirim rutin.`}
                    label="WhatsApp"
                    size="sm"
                    variant="outline"
                    className="h-8 px-2.5 text-xs flex-shrink-0"
                  />
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1.5">
          <Carrot className="w-3.5 h-3.5" /> Sayur yang ada · {barang.reduce((n, b) => n + b.nama.length, 0)} jenis
        </p>
        <div className="space-y-2">
          {barang.map((b) => (
            <div key={b.nama.join("|")} className="rounded-xl border border-border bg-card p-3">
              <div className="flex items-baseline justify-between gap-2 flex-wrap">
                <p className="text-sm font-semibold text-foreground capitalize">{b.nama.join(", ")}</p>
                <p className="text-[11px] text-muted-foreground tabular-nums">
                  {b.jumlahPenjual} penjual
                  {/* "mulai" karena angka ini batas BAWAH dari kalimat yang
                      menyebut beberapa harga tanpa memasangkannya dengan
                      barangnya — bukan harga pasti sayur ini. */}
                  {b.termurah && <> · mulai <span className="font-semibold text-foreground">{rupiah(b.termurah.perKg)}/kg</span></>}
                </p>
              </div>
              {/*
                Penjualnya disebut dalam SATU baris, bukan satu paragraf per
                penjual — dan tanpa mengulang kalimat harganya.

                Dua sebab, dan yang kedua lebih penting. Penjual yang menjual
                empat sayur muncul di empat blok, jadi kalimat harganya
                terulang empat kali: penjaga lebar menangkapnya sebagai
                "kalimat yang sama 4×", dan ia benar.

                Tetapi harga itu memang TIDAK BOLEH ditulis di bawah satu
                sayur. Lead "Adinda" menyebut empat sayur dan empat harga
                tanpa memasangkannya, jadi berapa harga tomatnya tidak
                diketahui — menuliskan "Rp 2.000–3.333/kg" di bawah "tomat"
                adalah ketelitian yang tidak dimiliki sumbernya. Harga per
                penjual ada di daftar di atas, tempat ia memang berlaku.
              */}
              <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">
                dari {b.penawaran.map((p) => p.dari).filter((v, i, a) => a.indexOf(v) === i).join(", ")}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

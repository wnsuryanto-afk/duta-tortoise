import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Carrot, Info, Repeat, ShieldCheck, TrendingDown } from "lucide-react";
import { base44, BATAS_AMBIL } from "@/api/base44Client";
import TombolWhatsApp from "@/components/common/TombolWhatsApp";
import { kumpulkanPenawaran, barangTersedia, barangSerumpun, penjualTermurah, keandalanSupplier } from "@/lib/pasarSupplier";
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
 * layar: sayur apa, dari siapa, dan berapa per kilogram.
 *
 * Yang keempat — supplier mana yang TERBAIK — dulu tidak bisa, karena barang
 * masuk tidak menyimpan supplier-nya sama sekali. 18 Okt 2026 `supplier_id`
 * ditambahkan ke StockMovement dan form barang masuk mulai menanyakannya,
 * jadi jalurnya sekarang ADA. Yang belum ada adalah isinya: peringkat
 * keandalan di bawah dihitung dari pengiriman yang benar-benar tercatat, dan
 * sampai beberapa pengiriman terkumpul ia akan jujur mengatakan kosong.
 *
 * Kosong yang jujur lebih berguna daripada peringkat yang dikarang dari
 * `rating` 1-5 yang diketik sendiri saat supplier dibuat — yang bawaannya 5,
 * jadi semua supplier "bintang lima" sebelum satu pun mengirim apa pun.
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
  /* Kunci yang SUDAH dipakai halaman Supplier dan tujuh layar stok lainnya.
     Kunci baru untuk data yang sama berarti daftar ini tetap basi sesudah
     sebuah lead dijadikan supplier — sampai staleTime-nya sendiri habis. */
  const { data: suppliers = [] } = useQuery({
    queryKey: ["suppliers"],
    queryFn: () => base44.entities.Supplier.list("-created_date"),
  });
  const { data: movements = [] } = useQuery({
    queryKey: ["stock-movements", "-date", 500],
    queryFn: () => base44.entities.StockMovement.list("-date", 500),
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
  const keandalan = useMemo(() => keandalanSupplier({ movements, suppliers }), [movements, suppliers]);
  const sudahKirim = useMemo(() => keandalan.filter((k) => k.pengiriman > 0), [keandalan]);

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
        {/* Ubin keempat adalah yang membedakan janji dari kenyataan: ubin di
            sebelahnya menghitung siapa yang MENGATAKAN sanggup kirim rutin,
            yang ini menghitung siapa yang benar-benar pernah datang. Keduanya
            berdampingan supaya selisihnya terbaca sekali lihat. */}
        <div className="rounded-xl border border-border bg-card p-3">
          <p className="text-[11px] text-muted-foreground">Pernah benar-benar kirim</p>
          <p className="text-xl font-bold text-foreground tabular-nums">
            {keandalan.length === 0 ? (
              <span className="text-sm font-normal text-muted-foreground">belum ada supplier</span>
            ) : (
              <>
                {sudahKirim.length}
                <span className="text-xs font-normal text-muted-foreground"> / {keandalan.length}</span>
              </>
            )}
          </p>
        </div>
      </div>

      {/*
        Dua daftar di halaman ini menjawab dua pertanyaan yang berbeda, dan
        menyamakannya adalah kesalahan yang paling mudah dibuat di sini:
        yang murah belum tentu yang datang. Jadi catatan ini berdiri di antara
        keduanya dan menyebutkan mana yang mana.

        Isinya berubah sendiri begitu pengiriman pertama tercatat — sebelum
        itu ia mengatakan daftar keandalannya memang masih kosong, bukan
        menyembunyikan daftarnya.
      */}
      <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-3">
        <p className="text-xs font-semibold text-amber-800 dark:text-amber-300 flex items-start gap-1.5">
          <Info className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
          <span>Yang murah dan yang andal dihitung terpisah</span>
        </p>
        <p className="text-[11px] text-amber-900/80 dark:text-amber-200/80 mt-1 leading-relaxed">
          {sudahKirim.length === 0 ? (
            <>
              Keandalan dihitung dari barang masuk yang menunjuk supplier-nya, dan belum ada satu pun
              yang tercatat. Mulai sekarang form Barang Masuk menanyakan supplier-nya &mdash; pilih di
              sana, dan daftar keandalan di bawah akan terisi sendiri. Harga di bawahnya berasal dari
              apa yang penjual sebut sendiri di postingannya, bukan dari pengiriman.
            </>
          ) : (
            <>
              Daftar keandalan dihitung dari {sudahKirim.length} supplier yang barang masuknya benar-benar
              tercatat. Daftar harga di bawahnya berasal dari apa yang penjual sebut sendiri di
              postingannya &mdash; penjual termurah di sana belum tentu yang paling sering datang.
            </>
          )}
        </p>
      </div>

      {/*
        ── Keandalan ────────────────────────────────────────────────────────

        Pertanyaan pemiliknya yang paling sulit ("supplier mana yang terbaik")
        dijawab di sini, dan hanya dengan yang terekam: berapa kali datang,
        kapan terakhir, dan apakah jedanya sesuai irama yang ia janjikan.

        Mutu barang dan ketepatan jam TIDAK ikut, karena tidak ada yang
        mencatatnya. Supplier yang sudah didaftarkan tetapi belum pernah
        datang tetap ditampilkan di urutan terakhir: itu justru baris yang
        paling perlu dilihat.
      */}
      <div>
        <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5" /> Keandalan &middot; dari pengiriman tercatat
        </p>
        {/*
          Nol supplier terdaftar adalah keadaan 18 Okt 2026: tujuh lead sudah
          masuk, belum satu pun dijadikan supplier. Bagian ini tetap berdiri
          dan mengatakan apa yang kurang — kalau ia hilang begitu saja,
          pemiliknya tidak pernah tahu peringkat yang ia minta sudah ada
          tempatnya dan hanya menunggu satu langkah.
        */}
        {keandalan.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-card/50 p-3">
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Belum ada supplier terdaftar, jadi belum ada yang bisa diperingkat. Lead di tab
              Leads bisa dijadikan supplier lewat tombol &quot;Jadikan Supplier&quot;; sesudah itu
              setiap barang masuk bisa menunjuk ke sana, dan peringkat ini terisi sendiri dari
              pengiriman yang benar-benar terjadi.
            </p>
          </div>
        ) : sudahKirim.length === 0 ? (
          /*
            Semua terdaftar, belum satu pun mengirim — keadaan 18 Okt 2026,
            sesudah enam lead dijadikan supplier.

            Satu baris per supplier di sini berarti enam kartu yang kalimatnya
            sama persis: "Belum ada barang masuk yang menunjuk ke sini."
            Enam baris yang berbunyi sama tidak memuat lebih banyak keterangan
            daripada satu baris, hanya lebih banyak ruang untuk digulung.
            Jadi selama belum ada yang mengirim, namanya saja yang disebut,
            dalam satu kalimat.

            Begitu satu pengiriman tercatat, bentuk per-baris di bawah yang
            dipakai — karena saat itu tiap baris memang berbeda isinya.
          */
          <div className="rounded-xl border border-dashed border-border bg-card/50 p-3">
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              <span className="font-semibold text-foreground">{keandalan.length} supplier terdaftar,
              belum satu pun tercatat mengirim.</span>{" "}
              {keandalan.map((k) => k.nama).join(", ")}.
            </p>
            <p className="text-[11px] text-muted-foreground leading-relaxed mt-1.5">
              Peringkatnya terisi sendiri begitu barang masuk pertama menunjuk salah satu nama di
              atas &mdash; pilih supplier-nya di form Barang Masuk.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {keandalan.map((k) => (
              <div key={k.id} className="rounded-xl border border-border bg-card p-3">
                <div className="flex items-baseline justify-between gap-2 flex-wrap">
                  <p className="text-sm font-semibold text-foreground">{k.nama}</p>
                  <p className="text-[11px] tabular-nums text-muted-foreground">
                    {k.pengiriman === 0 ? "belum pernah kirim" : `${k.pengiriman}× kirim`}
                  </p>
                </div>
                <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">
                  {k.pengiriman === 0 ? (
                    <>
                      Belum ada barang masuk yang menunjuk ke sini
                      {k.rutin && k.irama ? `, padahal ia menyanggupi kirim ${IRAMA[k.irama] || k.irama}` : ""}.
                    </>
                  ) : (
                    <>
                      Terakhir {k.hariSejakTerakhir === 0 ? "hari ini" : `${k.hariSejakTerakhir} hari lalu`}
                      {k.rataJeda != null && <> &middot; rata-rata tiap {k.rataJeda} hari</>}
                      {/* Janji hanya disebut bila memang ada yang dijanjikan DAN
                          cukup pengiriman untuk membandingkannya. Satu kedatangan
                          tidak membuktikan irama apa pun. */}
                      {k.tepatJanji === true && <> &middot; <span className="font-semibold text-accent">sesuai janji {IRAMA[k.irama] || k.irama}</span></>}
                      {k.tepatJanji === false && <> &middot; <span className="font-semibold text-amber-700 dark:text-amber-400">lebih jarang dari janjinya ({IRAMA[k.irama] || k.irama})</span></>}
                      {k.tepatJanji === null && k.rutin && k.irama && k.pengiriman === 1 && (
                        <> &middot; menjanjikan {IRAMA[k.irama] || k.irama}, baru sekali datang</>
                      )}
                    </>
                  )}
                </p>
              </div>
            ))}
          </div>
        )}
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

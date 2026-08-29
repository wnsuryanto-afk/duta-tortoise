import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { Package, AlertTriangle, Check, Loader2, HelpCircle, Merge } from "lucide-react";
import { Button } from "@/components/ui/button";
import InfoHint from "@/components/ui/info-hint";
import { periksaBarangKembar, PENUNJUK_BARANG } from "@/lib/barangKembar";
import { cn } from "@/lib/utils";

/** Sebanyak ini barang yang ditarik sekali jalan. */
const BATAS = 1000;

/** Sebanyak ini baris riwayat yang ditarik per entitas penunjuk. */
const BATAS_RUJUKAN = 2000;

/**
 * BarangKembar — menyatukan barang gudang & pakan yang terdaftar dua kali.
 *
 * Penerimaan barang dulu mencocokkan barang lewat NAMA. Nama yang beda satu
 * spasi atau satu huruf besar dianggap barang lain, lalu dibuatkan barang baru
 * berstok 0 sementara stok yang lama tidak pernah bertambah. Pencocokannya
 * sudah memakai id, jadi yang baru tidak lagi kembar — tetapi barang yang
 * terlanjur ganda masih ada, memecah stok dan riwayatnya jadi dua.
 *
 * Pengaman yang sama dengan alat pemeliharaan lainnya:
 *
 *   1. Laporan lebih dulu, tanpa mengubah apa pun. Jumlah barang, stok
 *      gabungannya, dan berapa baris riwayat yang akan dipindahkan disebutkan
 *      di muka.
 *   2. Hanya yang PASTI yang digabung: nama sama setelah dinormalkan DAN
 *      satuannya sama. Yang satuannya beda dipisah ke daftar RAGU dan tidak
 *      disentuh — menjumlahkan 3 karung dengan 50 kg menghasilkan angka yang
 *      tidak berarti apa-apa.
 *   3. Riwayatnya dipindahkan LEBIH DULU, barangnya dihapus belakangan. Enam
 *      entitas menunjuk ke id barang; bila salah satu pemindahan gagal,
 *      barangnya tidak jadi dihapus sehingga tidak ada riwayat yang menunjuk
 *      ke barang yang sudah tidak ada.
 *   4. Aman diulang. Setelah digabung tidak ada lagi yang kembar.
 */
export default function BarangKembar() {
  const qc = useQueryClient();
  const [sibuk, setSibuk] = useState(null);
  const [hasilAkhir, setHasilAkhir] = useState(null);
  const [buka, setBuka] = useState(false);

  const { data: gudang = [], isLoading: muatGudang } = useQuery({
    queryKey: ["barang-kembar-gudang"],
    queryFn: () => base44.entities.WarehouseItem.list("-created_date", BATAS),
  });
  const { data: pakan = [], isLoading: muatPakan } = useQuery({
    queryKey: ["barang-kembar-pakan"],
    queryFn: () => base44.entities.FeedStock.list("-created_date", BATAS),
  });

  const isLoading = muatGudang || muatPakan;
  const laporan = periksaBarangKembar(gudang, pakan);
  const menyentuhBatas = gudang.length >= BATAS || pakan.length >= BATAS;

  /**
   * Pindahkan seluruh riwayat yang menunjuk ke `dariId` menjadi ke `keId`.
   *
   * `hitung` dinaikkan per baris yang benar-benar berpindah, bukan di akhir.
   * Bila pemindahan gagal di tengah, sebagian baris sudah terlanjur pindah —
   * dan laporan yang menyebut nol akan menutupi kenyataan itu. Yang sudah
   * pindah tidak menimbulkan masalah: barangnya tidak jadi dihapus, stok
   * induknya tidak jadi diubah, dan menjalankan alat ini lagi akan
   * meneruskan sisanya.
   */
  const pindahkanRujukan = async (dariId, keId, namaInduk, hitung) => {
    for (const { entitas, kolom, kolomNama } of PENUNJUK_BARANG) {
      const E = base44.entities[entitas];
      if (!E) continue;
      const baris = await E.filter({ [kolom]: dariId }, "-created_date", BATAS_RUJUKAN);
      for (const b of baris || []) {
        const ubah = { [kolom]: keId };
        if (kolomNama) ubah[kolomNama] = namaInduk;
        await E.update(b.id, ubah);
        hitung.n += 1;
      }
    }
  };

  const jalankan = async () => {
    if (laporan.totalHapus === 0 || sibuk) return;
    setSibuk({ sudah: 0, total: laporan.totalHapus });
    setHasilAkhir(null);

    let digabung = 0;
    let gagal = 0;
    const hitung = { n: 0 };

    for (const grup of laporan.kembar) {
      const Entity = grup.sumber === "pakan" ? base44.entities.FeedStock : base44.entities.WarehouseItem;
      for (const kembar of grup.hapus) {
        try {
          // Urutannya penting: riwayat dipindahkan dulu. Kalau langkah ini
          // gagal, barangnya tidak jadi dihapus dan tidak ada yang yatim.
          await pindahkanRujukan(kembar.id, grup.induk.id, grup.induk.name, hitung);
          await Entity.update(grup.induk.id, { current_stock: grup.stokGabungan });
          await Entity.delete(kembar.id);
          digabung += 1;
        } catch {
          gagal += 1;
        }
        setSibuk({ sudah: digabung + gagal, total: laporan.totalHapus });
      }
    }

    setSibuk(null);
    setHasilAkhir({ digabung, gagal, rujukanPindah: hitung.n });
    ["barang-kembar-gudang", "barang-kembar-pakan", "warehouse-items", "feedstocks", "stock-movements"]
      .forEach((k) => qc.invalidateQueries({ queryKey: [k] }));

    if (gagal === 0) toast.success(`${digabung} barang kembar digabung, ${hitung.n} baris riwayat dipindahkan.`);
    else if (digabung === 0) toast.error(`Gagal menggabung ${gagal} barang. Tidak ada yang dihapus; coba lagi nanti.`);
    else toast.warning(`${digabung} digabung, ${gagal} gagal dan dibiarkan apa adanya.`);
  };

  if (isLoading) return <div className="h-32 rounded-xl shimmer" />;

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-3">
      <div className="flex items-center gap-2">
        <span className="w-8 h-8 rounded-lg bg-primary/12 text-primary flex items-center justify-center flex-shrink-0">
          <Package className="w-4 h-4" />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="font-heading font-semibold text-[15px] leading-tight flex items-center gap-1">
            Satukan barang kembar
            <InfoHint title="Kenapa bisa kembar" variant="info" size={13}>
              Penerimaan barang dulu mencocokkan barang lewat <b>namanya</b>. Nama yang
              beda satu spasi atau satu huruf besar dianggap barang lain, lalu dibuatkan
              barang baru berstok 0 sementara stok yang lama tidak pernah bertambah.
              Pencocokannya sekarang memakai id, jadi yang baru tidak lagi kembar. Alat
              ini membereskan data lama.
            </InfoHint>
          </h3>
          <p className="text-[11px] text-muted-foreground">
            Membereskan data lama · aman diulang · {laporan.diperiksa} barang diperiksa
          </p>
        </div>
      </div>

      <div className="rounded-lg bg-muted/40 border border-border px-3 py-1.5 divide-y divide-border/60">
        <div className="flex items-start gap-2.5 py-1.5">
          <Check className="w-4 h-4 flex-shrink-0 mt-0.5 text-accent" />
          <p className="text-sm min-w-0 flex-1">
            <span className="font-bold tabular">{laporan.diperiksa - laporan.totalHapus}</span>{" "}
            <span className="text-muted-foreground">barang tidak disentuh</span>
          </p>
        </div>

        {laporan.totalHapus > 0 && (
          <div className="flex items-start gap-2.5 py-1.5">
            <Merge className="w-4 h-4 flex-shrink-0 mt-0.5 text-amber-600" />
            <div className="min-w-0 flex-1">
              <p className="text-sm">
                <span className="font-bold tabular">{laporan.totalHapus}</span>{" "}
                <span className="text-muted-foreground">
                  barang kembar akan disatukan, jadi {laporan.kembar.length} barang
                </span>
              </p>
              <p className="text-[11px] text-muted-foreground/80 mt-0.5 leading-snug">
                Stoknya dijumlahkan, dan seluruh riwayatnya dipindahkan ke barang yang
                paling lama — itu yang paling banyak dirujuk, jadi paling sedikit yang
                perlu diubah.
              </p>
            </div>
          </div>
        )}

        {laporan.ragu.length > 0 && (
          <div className="flex items-start gap-2.5 py-1.5">
            <HelpCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-muted-foreground" />
            <div className="min-w-0 flex-1">
              <p className="text-sm">
                <span className="font-bold tabular">{laporan.ragu.length}</span>{" "}
                <span className="text-muted-foreground">nama sama tapi satuannya beda</span>
              </p>
              <p className="text-[11px] text-muted-foreground/80 mt-0.5 leading-snug">
                Tidak disentuh. Menjumlahkan 3 karung dengan 50 kg menghasilkan angka
                yang tidak berarti apa-apa — ini keputusan Anda, lewat halaman Gudang.
              </p>
            </div>
          </div>
        )}

        {menyentuhBatas && (
          <div className="flex items-start gap-2.5 py-1.5">
            <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5 text-amber-600" />
            <p className="text-[11px] text-muted-foreground min-w-0 flex-1 leading-snug">
              Barang yang diperiksa menyentuh batas {BATAS}. Mungkin ada yang belum
              terperiksa — jalankan lagi setelah yang ini selesai.
            </p>
          </div>
        )}
      </div>

      {(laporan.totalHapus > 0 || laporan.ragu.length > 0) && (
        <button
          type="button"
          onClick={() => setBuka((b) => !b)}
          className="text-[11px] text-primary hover:underline"
        >
          {buka ? "Sembunyikan rinciannya" : "Lihat rinciannya"}
        </button>
      )}

      {buka && (
        <div className="space-y-1.5 max-h-64 overflow-y-auto">
          {laporan.kembar.map((k) => (
            <div key={`${k.sumber}-${k.kunci}`} className="text-[11px] rounded-lg border border-border px-2.5 py-1.5">
              <p className="font-medium truncate">
                {k.induk.name}{" "}
                <span className="text-muted-foreground font-normal">
                  ({k.sumber === "pakan" ? "pakan" : "gudang"})
                </span>
              </p>
              <p className="text-muted-foreground">
                {k.hapus.length + 1} entri → 1 · stok jadi{" "}
                <span className="tabular font-medium">{k.stokGabungan}</span> {k.satuan}
              </p>
            </div>
          ))}
          {laporan.ragu.map((r) => (
            <div key={`ragu-${r.sumber}-${r.kunci}`} className="text-[11px] rounded-lg border border-dashed border-border px-2.5 py-1.5">
              <p className="font-medium truncate">{r.daftar[0]?.name}</p>
              <p className="text-muted-foreground">
                satuan beda: {r.daftar.map((x) => `${x.current_stock ?? 0} ${x.unit || "—"}`).join(" vs ")} · dibiarkan
              </p>
            </div>
          ))}
        </div>
      )}

      {hasilAkhir && (
        <p className="text-[11px] text-muted-foreground">
          Selesai: {hasilAkhir.digabung} barang disatukan, {hasilAkhir.rujukanPindah} baris
          riwayat dipindahkan{hasilAkhir.gagal > 0 ? `, ${hasilAkhir.gagal} gagal` : ""}.
        </p>
      )}

      <Button
        onClick={jalankan}
        disabled={laporan.totalHapus === 0 || !!sibuk}
        className={cn("w-full", laporan.totalHapus === 0 && "opacity-60")}
      >
        {sibuk ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Menyatukan {sibuk.sudah}/{sibuk.total}…
          </>
        ) : laporan.totalHapus === 0 ? (
          "Tidak ada barang kembar"
        ) : (
          `Satukan ${laporan.totalHapus} barang kembar`
        )}
      </Button>
    </div>
  );
}

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { Package, AlertTriangle, Check, Loader2, HelpCircle, Merge, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import InfoHint from "@/components/ui/info-hint";
import { cn } from "@/lib/utils";

/**
 * BarangKembar — menyatukan barang gudang & pakan yang terdaftar dua kali.
 *
 * Layar ini TIDAK menghitung apa pun sendiri. Seluruh aturannya ada di fungsi
 * `gabungBarangKembar`, dan layar ini hanya menampilkan laporannya lalu
 * meminta izin menjalankannya.
 *
 * Sempat ada dua alat untuk pekerjaan yang sama: fungsi itu, dan salinan
 * aturan di sisi peramban. Keduanya berbeda dalam hal-hal kecil yang justru
 * berbahaya — daftar entitas penunjuk, cara menormalkan nama, cara
 * menjumlahkan stok saat sebuah barang punya tiga entri. Dua alat untuk satu
 * pekerjaan adalah pola yang sama dengan yang menyebabkan sebagian besar cacat
 * di aplikasi ini, jadi salinannya dihapus.
 *
 * Dijalankan di server juga lebih aman untuk pekerjaan ini: pemindahan riwayat
 * memakai hak service-role, sehingga tidak bisa gagal separuh jalan karena
 * pengguna yang menekan tombolnya tidak punya izin menulis ke salah satu dari
 * sembilan entitas penunjuk itu.
 */
export default function BarangKembar() {
  const qc = useQueryClient();
  const [sibuk, setSibuk] = useState(false);
  const [hasilAkhir, setHasilAkhir] = useState(null);
  const [buka, setBuka] = useState(false);

  // Tanpa `konfirmasi`, fungsinya hanya melapor — tidak mengubah apa pun.
  const { data: laporan, isLoading } = useQuery({
    queryKey: ["barang-kembar-laporan"],
    queryFn: async () => {
      const res = await base44.functions.invoke("gabungBarangKembar", {});
      return res?.data ?? res;
    },
    staleTime: 60 * 1000,
  });

  const jalankan = async () => {
    if (sibuk) return;
    setSibuk(true);
    setHasilAkhir(null);
    try {
      const res = await base44.functions.invoke("gabungBarangKembar", { konfirmasi: true });
      const hasil = res?.data ?? res;
      if (hasil?.error) throw new Error(hasil.error);
      setHasilAkhir(hasil);

      const bagian = [];
      if (hasil.digabung) bagian.push(`${hasil.digabung} digabung`);
      if (hasil.bertanda_dihapus) bagian.push(`${hasil.bertanda_dihapus} bertanda dihapus`);
      toast.success(
        `${bagian.join(", ") || "Tidak ada perubahan"}. ${hasil.rujukan_dipindah || 0} baris riwayat dipindahkan.`
      );

      // invalidateQueries sudah memicu pengambilan ulang; memanggil refetch()
      // lagi hanya menghasilkan dua permintaan untuk data yang sama.
      ["barang-kembar-laporan", "warehouse-items", "feedstocks", "stock-movements"].forEach((k) =>
        qc.invalidateQueries({ queryKey: [k] })
      );
    } catch (e) {
      toast.error("Gagal: " + (e?.message || "tidak diketahui"));
    }
    setSibuk(false);
  };

  if (isLoading) return <div className="h-32 rounded-xl shimmer" />;

  const akanGabung = laporan?.akan_digabung || 0;
  const ragu = laporan?.perlu_keputusan_manusia || 0;
  const bertanda = laporan?.bertanda || [];
  const akanHapusBertanda = laporan?.akan_dihapus_bertanda || 0;
  const totalKerja = akanGabung + akanHapusBertanda;

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
              Penerimaan barang dulu mencocokkan barang lewat <b>namanya</b>. Nama yang beda
              satu spasi atau satu huruf besar dianggap barang lain, lalu dibuatkan barang
              baru berstok 0 sementara stok yang lama tidak pernah bertambah. Pencocokannya
              sekarang memakai id, jadi yang baru tidak lagi kembar. Alat ini membereskan
              data lama.
            </InfoHint>
          </h3>
          <p className="text-[11px] text-muted-foreground">
            Membereskan data lama · aman diulang · dijalankan di server
          </p>
        </div>
      </div>

      <div className="rounded-lg bg-muted/40 border border-border px-3 py-1.5 divide-y divide-border/60">
        {totalKerja === 0 && ragu === 0 && bertanda.length === 0 && (
          <div className="flex items-start gap-2.5 py-1.5">
            <Check className="w-4 h-4 flex-shrink-0 mt-0.5 text-accent" />
            <p className="text-sm text-muted-foreground min-w-0 flex-1">
              Tidak ada barang kembar.
            </p>
          </div>
        )}

        {akanGabung > 0 && (
          <div className="flex items-start gap-2.5 py-1.5">
            <Merge className="w-4 h-4 flex-shrink-0 mt-0.5 text-amber-600" />
            <div className="min-w-0 flex-1">
              <p className="text-sm">
                <span className="font-bold tabular">{akanGabung}</span>{" "}
                <span className="text-muted-foreground">barang kembar akan disatukan</span>
              </p>
              <p className="text-[11px] text-muted-foreground/80 mt-0.5 leading-snug">
                Stoknya dijumlahkan, dan seluruh riwayatnya dipindahkan ke barang yang paling
                lama — itu yang paling banyak dirujuk, jadi paling sedikit yang perlu diubah.
              </p>
            </div>
          </div>
        )}

        {bertanda.length > 0 && (
          <div className="flex items-start gap-2.5 py-1.5">
            <Tag className="w-4 h-4 flex-shrink-0 mt-0.5 text-amber-600" />
            <div className="min-w-0 flex-1">
              <p className="text-sm">
                <span className="font-bold tabular">{bertanda.length}</span>{" "}
                <span className="text-muted-foreground">
                  barang sudah ditandai duplikat
                  {bertanda.length !== akanHapusBertanda
                    ? ` — ${akanHapusBertanda} akan dihapus, sisanya masih berisi`
                    : ""}
                </span>
              </p>
              <p className="text-[11px] text-muted-foreground/80 mt-0.5 leading-snug">
                Tidak ada barang lain bernama sama untuk menampung riwayatnya, jadi yang
                dihapus hanya yang benar-benar tidak membawa apa-apa: stok nol dan tidak
                dirujuk riwayat mana pun.
              </p>
            </div>
          </div>
        )}

        {ragu > 0 && (
          <div className="flex items-start gap-2.5 py-1.5">
            <HelpCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-muted-foreground" />
            <div className="min-w-0 flex-1">
              <p className="text-sm">
                <span className="font-bold tabular">{ragu}</span>{" "}
                <span className="text-muted-foreground">nama sama tapi satuannya beda</span>
              </p>
              <p className="text-[11px] text-muted-foreground/80 mt-0.5 leading-snug">
                Tidak disentuh. Menjumlahkan 3 karung dengan 50 kg menghasilkan angka yang
                tidak berarti apa-apa — ini keputusan Anda, lewat halaman Gudang.
              </p>
            </div>
          </div>
        )}
      </div>

      {(totalKerja > 0 || ragu > 0 || bertanda.length > 0) && (
        <button type="button" onClick={() => setBuka((b) => !b)}
          className="text-[11px] text-primary hover:underline">
          {buka ? "Sembunyikan rinciannya" : "Lihat rinciannya"}
        </button>
      )}

      {buka && (
        <div className="space-y-1.5 max-h-64 overflow-y-auto">
          {(laporan?.rencana_gabung || []).map((r, i) => (
            <div key={`g-${i}`} className="text-[11px] rounded-lg border border-border px-2.5 py-1.5">
              <p className="font-medium truncate">{r.induk?.name}</p>
              <p className="text-muted-foreground">
                menyerap &ldquo;{r.kembar?.name}&rdquo; · stok {r.induk?.stok ?? 0} + {r.kembar?.stok ?? 0} {r.induk?.unit}
              </p>
            </div>
          ))}
          {bertanda.map((b, i) => (
            <div key={`t-${i}`} className="text-[11px] rounded-lg border border-border px-2.5 py-1.5">
              <p className="font-medium truncate">{b.name}</p>
              <p className="text-muted-foreground">
                bertanda duplikat ·{" "}
                {b.stok > 0
                  ? `masih berisi ${b.stok} ${b.unit || ""} — dibiarkan`
                  : "stok kosong — dihapus bila tidak ada riwayat yang menunjuknya"}
              </p>
            </div>
          ))}
          {(laporan?.perlu_keputusan || []).map((r, i) => (
            <div key={`r-${i}`} className="text-[11px] rounded-lg border border-dashed border-border px-2.5 py-1.5">
              <p className="font-medium truncate">{r.induk?.name}</p>
              <p className="text-muted-foreground">
                satuan beda: {r.induk?.stok ?? 0} {r.induk?.unit || "—"} vs {r.kembar?.stok ?? 0} {r.kembar?.unit || "—"} · dibiarkan
              </p>
            </div>
          ))}
        </div>
      )}

      {hasilAkhir && (
        <div className="text-[11px] text-muted-foreground space-y-0.5">
          <p>
            Selesai: {hasilAkhir.digabung || 0} disatukan
            {hasilAkhir.bertanda_dihapus ? `, ${hasilAkhir.bertanda_dihapus} bertanda dihapus` : ""},{" "}
            {hasilAkhir.rujukan_dipindah || 0} baris riwayat dipindahkan.
          </p>
          {(hasilAkhir.bertanda_dibiarkan || []).map((t, i) => (
            <p key={i} className="flex items-start gap-1">
              <AlertTriangle className="w-3 h-3 flex-shrink-0 mt-0.5 text-amber-600" />
              <span>Dibiarkan: {t}</span>
            </p>
          ))}
        </div>
      )}

      <Button onClick={jalankan} disabled={totalKerja === 0 || sibuk}
        className={cn("w-full", totalKerja === 0 && "opacity-60")}>
        {sibuk ? (
          <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Menyatukan…</>
        ) : totalKerja === 0 ? (
          "Tidak ada barang kembar"
        ) : (
          `Bereskan ${totalKerja} barang`
        )}
      </Button>
    </div>
  );
}

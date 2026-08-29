import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { Copy, AlertTriangle, Check, Loader2, HelpCircle, MinusCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import InfoHint from "@/components/ui/info-hint";
import { periksaTransaksiKembar } from "@/lib/transaksiKembar";
import { jalankanMassal, ringkasHasil } from "@/lib/tugasMassal";
import { cn } from "@/lib/utils";

const rp = (n) => "Rp " + Math.round(n || 0).toLocaleString("id-ID");

/** Sebanyak ini catatan yang ditarik sekali jalan. */
const BATAS = 2000;

/**
 * TransaksiKembar — menyapu catatan keuangan yang tercatat lebih dari sekali.
 *
 * Pemasukan sebuah penjualan dulu bisa ditulis dua kali: sekali oleh
 * otomatisasi server saat Sale dibuat, sekali lagi oleh SaleWizard beberapa
 * langkah kemudian. Penulisannya sudah disatukan, jadi yang baru tidak lagi
 * kembar — tetapi catatan lama yang terlanjur ganda masih ada, dan masih
 * menaikkan pemasukan di setiap laporan keuangan.
 *
 * Pengaman yang sama dengan dua alat pemeliharaan lainnya:
 *
 *   1. Laporan lebih dulu, tanpa mengubah apa pun. Nilai rupiah yang akan
 *      hilang dari laporan disebutkan di muka — ini menghapus catatan uang,
 *      jadi pemilik harus tahu persis berapa yang berubah sebelum menekan
 *      tombolnya.
 *   2. Hanya yang PASTI yang disapu: rujukan sama DAN jenis, jumlah, serta
 *      tanggalnya sama persis. Yang salah satunya berbeda bisa jadi dua
 *      catatan yang memang berbeda, dan menghapusnya berarti menghilangkan
 *      uang yang benar-benar keluar.
 *   3. Aman diulang. Setelah disapu tidak ada lagi yang kembar, jadi
 *      menjalankannya dua kali tidak menghapus apa pun lagi.
 */
export default function TransaksiKembar() {
  const qc = useQueryClient();
  const [sibuk, setSibuk] = useState(null);
  const [hasilAkhir, setHasilAkhir] = useState(null);
  const [buka, setBuka] = useState(false);

  const { data: transactions = [], isLoading } = useQuery({
    queryKey: ["transaksi-kembar"],
    queryFn: () => base44.entities.FinanceTransaction.list("-created_date", BATAS),
  });

  const laporan = periksaTransaksiKembar(transactions);

  const jalankan = async () => {
    if (laporan.totalHapus === 0 || sibuk) return;
    const daftarHapus = laporan.kembar.flatMap((k) => k.hapus);
    setSibuk({ sudah: 0, total: daftarHapus.length });
    setHasilAkhir(null);

    const hasil = await jalankanMassal(
      daftarHapus,
      (tx) => base44.entities.FinanceTransaction.delete(tx.id),
      { serentak: 4, onKemajuan: (sudah, t) => setSibuk({ sudah, total: t }) }
    );

    setSibuk(null);
    setHasilAkhir(hasil);
    qc.invalidateQueries({ queryKey: ["transaksi-kembar"] });
    qc.invalidateQueries({ queryKey: ["finance-transactions"] });
    qc.invalidateQueries({ queryKey: ["labarugi-finances"] });

    const { nada, teks } = ringkasHasil(hasil, "catatan");
    if (nada === "berhasil") toast.success(teks);
    else if (nada === "gagal") toast.error(teks);
    else toast.warning(teks);
  };

  if (isLoading) return <div className="h-32 rounded-xl shimmer" />;

  const bersih = laporan.totalHapus === 0 && laporan.ragu.length === 0;

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-3">
      <div className="flex items-center gap-2">
        <span className="w-8 h-8 rounded-lg bg-primary/12 text-primary flex items-center justify-center flex-shrink-0">
          <Copy className="w-4 h-4" />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="font-heading font-semibold text-[15px] leading-tight flex items-center gap-1">
            Sapu catatan keuangan kembar
            <InfoHint title="Kenapa bisa kembar" variant="info" size={13}>
              Pemasukan penjualan dulu ditulis oleh <b>dua pihak</b> yang tidak saling
              tahu — otomatisasi server dan layar penjualan — sehingga satu penjualan
              bisa tercatat dua kali. Penulisannya sudah disatukan, jadi yang baru
              tidak lagi kembar. Alat ini membereskan catatan lama.
            </InfoHint>
          </h3>
          <p className="text-[11px] text-muted-foreground">
            Membereskan data lama · aman diulang · {laporan.diperiksa} catatan diperiksa
          </p>
        </div>
      </div>

      <div className="rounded-lg bg-muted/40 border border-border px-3 py-1.5 divide-y divide-border/60">
        {/* "Tidak ada masalah" akan terlalu percaya diri: jumlah ini juga memuat
            catatan yang RAGU di bawah, yang justru belum tentu benar. Yang bisa
            dijanjikan hanyalah bahwa alat ini tidak akan menyentuhnya. */}
        <div className="flex items-start gap-2.5 py-1.5">
          <Check className="w-4 h-4 flex-shrink-0 mt-0.5 text-accent" />
          <p className="text-sm min-w-0 flex-1">
            <span className="font-bold tabular">
              {laporan.diperiksa - laporan.totalHapus}
            </span>{" "}
            <span className="text-muted-foreground">catatan tidak disentuh</span>
          </p>
        </div>

        {laporan.totalHapus > 0 && (
          <div className="flex items-start gap-2.5 py-1.5">
            <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5 text-amber-600" />
            <div className="min-w-0 flex-1">
              <p className="text-sm">
                <span className="font-bold tabular">{laporan.totalHapus}</span>{" "}
                <span className="text-muted-foreground">
                  catatan kembar akan disapu, dari {laporan.kembar.length} peristiwa
                </span>
              </p>
              <p className="text-[11px] text-muted-foreground/80 mt-0.5 leading-snug">
                Rujukan, jenis, jumlah, dan tanggalnya sama persis. Yang paling baru
                disimpan — itu yang ditunjuk oleh catatan asalnya dan keterangannya
                paling lengkap.
              </p>
            </div>
          </div>
        )}

        {(laporan.nilaiPemasukan > 0 || laporan.nilaiPengeluaran > 0) && (
          <div className="flex items-start gap-2.5 py-1.5">
            <MinusCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-primary" />
            <div className="min-w-0 flex-1">
              <p className="text-sm text-muted-foreground">Setelah disapu, laporan berubah:</p>
              <p className="text-[11px] mt-0.5 leading-snug">
                {laporan.nilaiPemasukan > 0 && (
                  <span className="text-muted-foreground">
                    pemasukan turun <strong className="text-foreground tabular">{rp(laporan.nilaiPemasukan)}</strong>
                  </span>
                )}
                {laporan.nilaiPemasukan > 0 && laporan.nilaiPengeluaran > 0 && " · "}
                {laporan.nilaiPengeluaran > 0 && (
                  <span className="text-muted-foreground">
                    pengeluaran turun <strong className="text-foreground tabular">{rp(laporan.nilaiPengeluaran)}</strong>
                  </span>
                )}
              </p>
            </div>
          </div>
        )}

        {laporan.ragu.length > 0 && (
          <div className="flex items-start gap-2.5 py-1.5">
            <HelpCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-amber-600" />
            <div className="min-w-0 flex-1">
              <p className="text-sm">
                <span className="font-bold tabular">{laporan.ragu.length}</span>{" "}
                <span className="text-muted-foreground">perlu Anda periksa sendiri</span>
              </p>
              <p className="text-[11px] text-muted-foreground/80 mt-0.5 leading-snug">
                Rujukannya sama tetapi jumlah, jenis, atau tanggalnya berbeda — bisa
                jadi memang dua catatan yang berbeda. Sengaja tidak disentuh; periksa
                di Laporan Keuangan lalu hapus manual bila memang keliru.
              </p>
            </div>
          </div>
        )}

        {laporan.tanpaRujukan > 0 && (
          <div className="flex items-start gap-2.5 py-1.5">
            <MinusCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-muted-foreground" />
            <div className="min-w-0 flex-1">
              <p className="text-sm">
                <span className="font-bold tabular">{laporan.tanpaRujukan}</span>{" "}
                <span className="text-muted-foreground">catatan tanpa rujukan</span>
              </p>
              <p className="text-[11px] text-muted-foreground/80 mt-0.5 leading-snug">
                Dicatat manual, tidak berasal dari penjualan atau kas kecil. Tidak bisa
                dibandingkan satu sama lain, jadi tidak ikut diperiksa.
              </p>
            </div>
          </div>
        )}
      </div>

      {laporan.diperiksa >= BATAS && (
        <p className="text-[11px] text-amber-700 dark:text-amber-400 flex items-start gap-1.5">
          <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-px" />
          <span>
            Hanya {BATAS} catatan terbaru yang diperiksa — jumlahnya sudah menyentuh
            batas itu, jadi mungkin masih ada yang kembar di catatan yang lebih lama.
            Jalankan lagi setelah penyapuan ini untuk memeriksa sisanya.
          </span>
        </p>
      )}

      {bersih && (
        <p className="text-[11px] text-accent flex items-center gap-1.5">
          <Check className="w-3.5 h-3.5 flex-shrink-0" />
          Tidak ada catatan kembar. Tidak ada yang perlu dikerjakan.
        </p>
      )}

      {sibuk && (
        <div className="flex items-center gap-3">
          <Loader2 className="w-4 h-4 animate-spin text-primary flex-shrink-0" />
          <span className="text-xs text-muted-foreground flex-1">
            Menyapu… <span className="tabular">{sibuk.sudah}/{sibuk.total}</span>
          </span>
          <div className="w-24 bar-track h-2">
            <div
              className="h-full rounded-full bg-primary transition-all duration-200"
              style={{ width: `${sibuk.total ? (sibuk.sudah / sibuk.total) * 100 : 0}%` }}
            />
          </div>
        </div>
      )}

      {hasilAkhir && !sibuk && (
        <div
          className={cn(
            "rounded-lg border px-3 py-2 text-xs",
            hasilAkhir.gagal.length === 0
              ? "bg-accent/8 border-accent/25 text-accent"
              : "bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-950/30 dark:border-amber-900 dark:text-amber-300"
          )}
        >
          {hasilAkhir.berhasil} catatan kembar disapu
          {hasilAkhir.gagal.length > 0 && (
            <> · {hasilAkhir.gagal.length} gagal: {hasilAkhir.gagal[0].pesan}</>
          )}
        </div>
      )}

      {laporan.totalHapus > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <Button onClick={jalankan} disabled={!!sibuk} className="gap-1.5" size="sm">
            <Copy className="w-3.5 h-3.5" />
            Sapu {laporan.totalHapus} catatan kembar
          </Button>
          <button
            type="button"
            onClick={() => setBuka((v) => !v)}
            className="text-[11px] text-muted-foreground hover:text-foreground underline"
          >
            {buka ? "Sembunyikan rinciannya" : "Lihat dulu apa yang akan dihapus"}
          </button>
        </div>
      )}

      {buka && laporan.kembar.length > 0 && (
        <div className="rounded-lg border border-border divide-y divide-border/60 max-h-64 overflow-y-auto">
          {laporan.kembar.map((k) => (
            <div key={`${k.reference_id}-${k.simpan.id}`} className="px-3 py-2 text-[11px] space-y-0.5">
              <p className="font-medium text-foreground truncate">
                {k.simpan.description || k.simpan.category || k.reference_id}
              </p>
              <p className="text-muted-foreground">
                {k.simpan.date} · {k.simpan.type} · <span className="tabular">{rp(k.simpan.amount)}</span>
              </p>
              <p className="text-amber-700 dark:text-amber-400">
                {k.hapus.length} salinan dihapus, 1 disimpan
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

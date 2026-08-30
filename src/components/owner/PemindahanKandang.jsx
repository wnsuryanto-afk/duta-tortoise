import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { Link2, AlertTriangle, Check, Loader2, HelpCircle, MinusCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import InfoHint from "@/components/ui/info-hint";
import { periksaPemindahan, tulisKandang } from "@/lib/kandang";
import { jalankanMassal, ringkasHasil } from "@/lib/tugasMassal";
import { cn } from "@/lib/utils";
import { recalcEnclosureCountsAman } from "@/lib/enclosureCount";

/**
 * PemindahanKandang — mengisi nomor kandang pada kura yang belum punya.
 *
 * Kura menunjuk kandangnya lewat nama sebagai teks. Nama bukan tautan: begitu
 * kandang diganti nama, semua yang menyalinnya menunjuk sesuatu yang tidak ada
 * lagi. Nomor kandang memperbaiki itu, tapi data lama harus diisi sekali.
 *
 * Alat ini dibuat dengan tiga pengaman:
 *
 *   1. Laporan lebih dulu, tanpa mengubah apa pun. Pemilik melihat persis apa
 *      yang akan terjadi — termasuk yang TIDAK bisa dipindahkan dan kenapa.
 *   2. Hanya yang pasti yang dipindahkan. Nama kandang yang dipakai dua catatan
 *      sekaligus sengaja dilewati, karena menebak salah satunya berarti
 *      memindahkan kura ke kandang yang keliru.
 *   3. Bisa dijalankan berulang. Kura yang nomornya sudah terisi dilewati, jadi
 *      menjalankan dua kali tidak menimbulkan kerusakan.
 *
 * Menjalankan alat ini tidak wajib. Selama nomornya kosong, pencarian kandang
 * jatuh ke nama seperti sebelumnya dan aplikasi tetap berjalan penuh.
 */
export default function PemindahanKandang() {
  const qc = useQueryClient();
  const [sibuk, setSibuk] = useState(null);
  const [hasilAkhir, setHasilAkhir] = useState(null);

  const { data: tortoises = [], isLoading: tLoad } = useQuery({
    queryKey: ["tortoises-pemindahan"],
    queryFn: () => base44.entities.Tortoise.list("-created_date", 1000),
  });
  const { data: enclosures = [], isLoading: eLoad } = useQuery({
    queryKey: ["enclosures"],
    queryFn: () => base44.entities.Enclosure.list(),
  });

  const laporan = periksaPemindahan(tortoises, enclosures);
  const total = tortoises.length;

  const jalankan = async () => {
    if (laporan.siap.length === 0 || sibuk) return;
    setSibuk({ sudah: 0, total: laporan.siap.length });
    setHasilAkhir(null);

    const hasil = await jalankanMassal(
      laporan.siap,
      ({ kura, kandang }) => base44.entities.Tortoise.update(kura.id, tulisKandang(kandang)),
      { serentak: 4, onKemajuan: (sudah, t) => setSibuk({ sudah, total: t }) }
    );

    // Pemindahan massal mengubah penghuni banyak kandang sekaligus dan dulu
    // tidak menyegarkan satu angka pun.
    await recalcEnclosureCountsAman();

    setSibuk(null);
    setHasilAkhir(hasil);
    qc.invalidateQueries({ queryKey: ["tortoises-pemindahan"] });
    qc.invalidateQueries({ queryKey: ["tortoises"] });
    qc.invalidateQueries({ queryKey: ["enclosures"] });

    const { nada, teks } = ringkasHasil(hasil, "kura");
    if (nada === "berhasil") toast.success(teks);
    else if (nada === "gagal") toast.error(teks);
    else toast.warning(teks);
  };

  if (tLoad || eLoad) {
    return <div className="h-32 rounded-xl shimmer" />;
  }

  const perluPerhatian = laporan.ganda.length + laporan.takDikenal.length;

  const Baris = ({ ikon: Ikon, warna, jumlah, label, jelas }) => (
    <div className="flex items-start gap-2.5 py-1.5">
      <Ikon className={cn("w-4 h-4 flex-shrink-0 mt-0.5", warna)} />
      <div className="min-w-0 flex-1">
        <p className="text-sm">
          <span className="font-bold tabular">{jumlah}</span>{" "}
          <span className="text-muted-foreground">{label}</span>
        </p>
        {jelas && <p className="text-[11px] text-muted-foreground/80 mt-0.5 leading-snug">{jelas}</p>}
      </div>
    </div>
  );

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-3">
      <div className="flex items-center gap-2">
        <span className="w-8 h-8 rounded-lg bg-primary/12 text-primary flex items-center justify-center flex-shrink-0">
          <Link2 className="w-4 h-4" />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="font-heading font-semibold text-[15px] leading-tight flex items-center gap-1">
            Sambungkan kura ke nomor kandang
            <InfoHint title="Kenapa perlu" variant="info" size={13}>
              Kura menunjuk kandangnya lewat <b>nama</b>. Begitu kandang diganti nama,
              sambungannya lepas tanpa peringatan. Nomor kandang tidak ikut berubah,
              jadi sambungannya bertahan. Nama tetap disimpan sebagai keterangan.
            </InfoHint>
          </h3>
          <p className="text-[11px] text-muted-foreground">
            Sekali jalan · aman diulang · tidak wajib
          </p>
        </div>
      </div>

      <div className="rounded-lg bg-muted/40 border border-border px-3 py-1.5 divide-y divide-border/60">
        <Baris
          ikon={Check}
          warna="text-accent"
          jumlah={laporan.sudah.length}
          label={`dari ${total} kura sudah tersambung ke nomor kandang`}
        />
        <Baris
          ikon={Link2}
          warna="text-primary"
          jumlah={laporan.siap.length}
          label="siap disambungkan sekarang"
          jelas="Nama kandangnya cocok persis dengan satu kandang terdaftar."
        />
        {laporan.ganda.length > 0 && (
          <Baris
            ikon={AlertTriangle}
            warna="text-amber-600"
            jumlah={laporan.ganda.length}
            label="tidak bisa dipindahkan — nama kandangnya ganda"
            jelas="Ada lebih dari satu kandang dengan nama yang sama. Beri nama berbeda lebih dulu di halaman Kandang, baru jalankan lagi."
          />
        )}
        {laporan.takDikenal.length > 0 && (
          <Baris
            ikon={HelpCircle}
            warna="text-amber-600"
            jumlah={laporan.takDikenal.length}
            label="nama kandangnya tidak terdaftar"
            jelas="Kura menunjuk kandang yang tidak ada di daftar kandang. Daftarkan kandangnya, atau perbaiki kandang kuranya."
          />
        )}
        {laporan.tanpaKandang.length > 0 && (
          <Baris
            ikon={MinusCircle}
            warna="text-muted-foreground"
            jumlah={laporan.tanpaKandang.length}
            label="memang tidak punya kandang"
            jelas="Biasanya kura yang sudah terjual atau mati. Tidak perlu ditindaklanjuti."
          />
        )}
      </div>

      {laporan.namaGanda.length > 0 && (
        <p className="text-[11px] text-amber-700 dark:text-amber-400 flex items-start gap-1.5">
          <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-px" />
          <span>
            Nama kandang yang dipakai lebih dari satu catatan:{" "}
            <strong>{laporan.namaGanda.join(", ")}</strong>. Selama masih ganda, kura di
            kandang itu tidak akan disambungkan.
          </span>
        </p>
      )}

      {sibuk && (
        <div className="flex items-center gap-3">
          <Loader2 className="w-4 h-4 animate-spin text-primary flex-shrink-0" />
          <span className="text-xs text-muted-foreground flex-1">
            Menyambungkan… <span className="tabular">{sibuk.sudah}/{sibuk.total}</span>
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
          {hasilAkhir.berhasil} kura tersambung
          {hasilAkhir.gagal.length > 0 && (
            <> · {hasilAkhir.gagal.length} gagal: {hasilAkhir.gagal[0].pesan}</>
          )}
        </div>
      )}

      <div className="flex items-center gap-2 flex-wrap">
        <Button
          onClick={jalankan}
          disabled={laporan.siap.length === 0 || !!sibuk}
          className="gap-1.5"
          size="sm"
        >
          <Link2 className="w-3.5 h-3.5" />
          {laporan.siap.length === 0
            ? "Tidak ada yang perlu disambungkan"
            : `Sambungkan ${laporan.siap.length} kura`}
        </Button>
        {perluPerhatian > 0 && (
          <span className="text-[11px] text-muted-foreground">
            {perluPerhatian} perlu dibereskan manual lebih dulu
          </span>
        )}
      </div>
    </div>
  );
}

import { Button } from "@/components/ui/button";
import Illustration from "@/components/common/Illustration";
import { cn } from "@/lib/utils";

/**
 * EmptyState — layar "belum ada data".
 *
 * Sebelumnya hanya ikon pudar; sekarang tiap jenis data punya ilustrasinya
 * sendiri plus satu baris petunjuk langkah berikutnya. Layar kosong adalah
 * kesan pertama pengguna baru terhadap sebuah halaman, jadi di sinilah
 * penjelasan paling dibutuhkan.
 */
const emptyStateConfig = {
  tortoise: {
    art: "tortoise",
    title: "Belum ada kura-kura terdaftar",
    description: "Mulai dengan menambahkan kura-kura pertamamu untuk mengelola inventaris peternakan.",
    buttonText: "+ Tambah Kura-kura",
    tip: "Siapkan nama/kode, jenis (morph), jenis kelamin, dan kandangnya.",
  },
  breeding: {
    art: "breeding",
    title: "Belum ada catatan breeding",
    description: "Catat breeding pertama untuk memulai tracking reproduksi kura-kura.",
    buttonText: "+ Catat Breeding",
    tip: "Setelah dicatat, jadwal inkubasi dan perkiraan menetas dihitung otomatis.",
  },
  sale: {
    art: "sale",
    title: "Belum ada transaksi penjualan",
    description: "Catat penjualan pertama untuk mulai tracking omzet dan profit.",
    buttonText: "+ Catat Penjualan",
    tip: "Isi HPP agar margin per ekor ikut terhitung di laporan.",
  },
  health: {
    art: "health",
    title: "Belum ada catatan kesehatan",
    description: "Mulai tracking kesehatan kura-kura dengan catatan pemeriksaan pertama.",
    buttonText: "+ Catat Kesehatan",
    tip: "Foto gejala membantu memantau perkembangan dari hari ke hari.",
  },
  enclosure: {
    art: "warehouse",
    title: "Belum ada kandang",
    description: "Tambahkan kandang pertama untuk mengelola tempat tinggal kura-kura.",
    buttonText: "+ Tambah Kandang",
    tip: "Kandang dipakai untuk deteksi kluster penyakit — beri nama yang konsisten.",
  },
  warehouse: {
    art: "warehouse",
    title: "Gudang masih kosong",
    description: "Tambahkan item pertama untuk mengelola stok obat, vitamin, dan peralatan.",
    buttonText: "+ Tambah Item",
    tip: "Isi stok minimum agar aplikasi mengingatkan sebelum barang habis.",
  },
  employee: {
    art: "employee",
    title: "Belum ada karyawan",
    description: "Tambahkan karyawan pertama untuk mengelola tim peternakan.",
    buttonText: "+ Tambah Karyawan",
    tip: "Data rekening diperlukan sebelum slip gaji bisa diterbitkan.",
  },
  sop: {
    art: "empty",
    title: "Belum ada dokumen SOP",
    description: "Buat SOP pertama untuk standarisasi operasional peternakan.",
    buttonText: "+ Buat SOP",
    tip: "SOP yang jelas memangkas pertanyaan berulang dari tim di lapangan.",
  },
  task: {
    art: "empty",
    title: "Belum ada task template",
    description: "Buat template task pertama untuk otomatisasi tugas harian.",
    buttonText: "+ Buat Template",
    tip: "Template dipakai membuat checklist harian secara otomatis tiap pagi.",
  },
  report: {
    art: "report",
    title: "Belum ada data untuk dilaporkan",
    description: "Grafik akan muncul begitu ada transaksi atau catatan yang bisa dihitung.",
    buttonText: "+ Tambah Data",
    tip: "Laporan jadi lebih akurat bila data dicatat pada hari kejadiannya.",
  },
  default: {
    art: "empty",
    title: "Belum ada data",
    description: "Mulai dengan menambahkan data pertama Anda.",
    buttonText: "+ Tambah Data",
  },
};

export default function EmptyState({
  type = "default",
  onAction,
  customTitle,
  customDescription,
  customButtonText,
  secondaryAction,
  compact = false,
  className,
}) {
  const config = emptyStateConfig[type] || emptyStateConfig.default;

  return (
    <div
      className={cn(
        "relative overflow-hidden text-center px-4 border border-dashed border-border rounded-2xl bg-muted/25 animate-fade-in",
        compact ? "py-8" : "py-12 sm:py-14",
        className
      )}
    >
      <div className="flex justify-center mb-4 animate-float">
        <Illustration name={config.art} size={compact ? "sm" : "lg"} />
      </div>

      <h3 className="font-heading text-base sm:text-lg font-semibold text-foreground mb-1.5">
        {customTitle || config.title}
      </h3>
      <p className="text-[13px] text-muted-foreground max-w-md mx-auto leading-relaxed">
        {customDescription || config.description}
      </p>

      {config.tip && !compact && (
        <p className="text-[11px] text-muted-foreground/80 max-w-sm mx-auto mt-3 px-3 py-1.5 rounded-full bg-card border border-border inline-block">
          💡 {config.tip}
        </p>
      )}

      {(onAction || secondaryAction) && (
        <div className="flex items-center justify-center gap-2 flex-wrap mt-6">
          {onAction && (
            <Button onClick={onAction} className="gap-2 hover-lift">
              {customButtonText || config.buttonText}
            </Button>
          )}
          {secondaryAction}
        </div>
      )}
    </div>
  );
}

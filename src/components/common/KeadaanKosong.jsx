import { cn } from "@/lib/utils";
import {
  TortoiseArt, EggNestArt, EmptyBoxArt, ChartArt,
  HealthArt, WarehouseArt, TeamArt, WalletArt,
} from "@/components/common/Illustration";

/**
 * KeadaanKosong — layar kosong yang bergambar dan punya jalan keluar.
 *
 * Kenapa berkas ini ada:
 *
 * Layar kosong di aplikasi ini hampir semuanya berupa satu kalimat abu-abu di
 * tengah ruang kosong: "Belum ada data kandang. Tambahkan kandang terlebih
 * dahulu." Tidak ada gambar, dan yang lebih penting — tidak ada tombol. Orang
 * yang membacanya tahu ada yang kurang, tetapi harus mencari sendiri ke mana
 * pergi untuk membereskannya.
 *
 * Padahal ilustrasinya sudah digambar dan dibayar ongkos rendernya: dari
 * delapan ilustrasi di Illustration.jsx, EmptyBoxArt dan WarehouseArt tidak
 * dipakai satu layar pun, sementara EggNestArt, ChartArt, dan HealthArt
 * masing-masing hanya sekali.
 *
 * Aturan komponen ini:
 *   · Selalu bergambar — layar kosong adalah tempat paling wajar untuk gambar,
 *     karena memang tidak ada data yang harus diperebutkan ruangnya.
 *   · Judul pendek, maksimal satu baris di ponsel.
 *   · Keterangan satu kalimat, dan hanya bila menambah sesuatu yang tidak
 *     terbaca dari judulnya.
 *   · Bila ada yang bisa dikerjakan, tombolnya ada DI SINI.
 */

const GAMBAR = {
  kura: TortoiseArt,
  telur: EggNestArt,
  kotak: EmptyBoxArt,
  grafik: ChartArt,
  kesehatan: HealthArt,
  gudang: WarehouseArt,
  tim: TeamArt,
  uang: WalletArt,
};

export default function KeadaanKosong({
  gambar = "kotak",
  judul,
  keterangan,
  aksi,
  ukuran = "md",
  className,
}) {
  const Art = GAMBAR[gambar] || EmptyBoxArt;
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center px-6 py-10 gap-1",
        className,
      )}
    >
      <Art size={ukuran} className="mb-1 opacity-90" />
      <p className="font-heading font-semibold text-foreground text-balance">{judul}</p>
      {keterangan && (
        <p className="text-sm text-muted-foreground max-w-xs text-pretty">{keterangan}</p>
      )}
      {aksi && <div className="mt-3 flex flex-wrap justify-center gap-2">{aksi}</div>}
    </div>
  );
}

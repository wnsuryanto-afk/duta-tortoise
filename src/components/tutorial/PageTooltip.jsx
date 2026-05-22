import { HelpCircle } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export const PAGE_TOOLTIPS = {
  dashboard: "Dashboard menampilkan ringkasan seluruh aktivitas peternakan: jumlah tortoise aktif, telur, laporan keuangan, reminder kesehatan, dan absensi karyawan.",
  tortoise: "Halaman ini untuk mendaftarkan dan mengelola semua kura-kura beserta kandangnya. Lengkapi data setiap individu termasuk morph, berat, foto, dan riwayat kesehatan.",
  breeding: "Halaman ini untuk mencatat proses perkawinan kura-kura, monitoring telur, dan mencatat hasil penetasan. Pantau progres inkubasi dan jadwal menetas.",
  treatment: "Halaman ini untuk menjadwalkan dan mencatat perawatan rutin kura-kura. Buat pengingat agar tidak ada sesi perawatan yang terlewat.",
  health: "Halaman ini mencatat riwayat kesehatan dan sakit setiap kura-kura. Rekam diagnosis, obat-obatan, dan tindak lanjut dari dokter hewan.",
  warehouse: "Halaman ini untuk mengelola inventaris gudang: stok pakan, obat-obatan, vitamin, dan perlengkapan. Pantau stok minimum dan expired date.",
  sales: "Halaman ini untuk mencatat setiap transaksi penjualan kura-kura. Kelola data pembeli, metode pengiriman, dan status pembayaran.",
  "sales-report": "Laporan komprehensif performa penjualan: grafik tren, analisis per channel, dan pembeli terbaik.",
  breeding_report: "Laporan statistik breeding: tingkat keberhasilan penetasan, performa pasangan indukan, dan tren per musim.",
  finance: "Laporan keuangan lengkap: pemasukan, pengeluaran, profit/loss, dan arus kas peternakan.",
  hr: "Manajemen Sumber Daya Manusia: absensi harian, slip gaji, kasbon, dan kinerja karyawan.",
  sop: "Standar Operasional Prosedur (SOP) dan Key Performance Indicator (KPI) untuk seluruh tim.",
  notifications: "Pusat notifikasi: atur dan pantau semua pengingat — dari telur menetas, stok habis, hingga jadwal treatment.",
  "family-tree": "Visualisasi silsilah (genealogi) kura-kura untuk melacak garis keturunan dan mencegah inbreeding.",
  crm: "Customer Relationship Management: profil detail setiap pembeli, riwayat transaksi, dan tier loyalitas.",
  "feed-stock": "Manajemen stok pakan harian: sayuran, buah, rumput, dan suplemen. Pantau ketersediaan dan jadwal restok.",
  "incomplete-data": "Daftar semua data yang belum lengkap di seluruh sistem. Lengkapi data untuk memastikan akurasi laporan.",
  marketplace: "Integrasi dengan marketplace eksternal seperti Tokopedia dan Shopee untuk sinkronisasi pesanan.",
  cctv: "Monitoring CCTV real-time untuk pengawasan kandang dan area peternakan.",
  "help-center": "Pusat bantuan dengan video tutorial, FAQ, dan kontak support untuk membantu kamu menggunakan aplikasi.",
};

export default function PageTooltip({ page, className = "" }) {
  const text = PAGE_TOOLTIPS[page];
  if (!text) return null;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-primary/50 hover:text-primary hover:bg-primary/10 transition-colors flex-shrink-0 ${className}`}
          aria-label="Bantuan halaman ini"
        >
          <HelpCircle className="w-4 h-4" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="max-w-xs text-sm leading-relaxed bg-[#1a3a2a] text-white border-[#1a3a2a] shadow-xl rounded-xl"
        side="bottom"
        align="start"
      >
        <p>{text}</p>
      </PopoverContent>
    </Popover>
  );
}
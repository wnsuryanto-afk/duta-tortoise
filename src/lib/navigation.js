/**
 * navigation.js — SUMBER TUNGGAL struktur navigasi aplikasi.
 *
 * Dipakai bersama oleh Sidebar, HubPage, dan CommandPalette.
 * Jangan membuat daftar menu terpisah di file lain.
 *
 * Struktur: 6 area utama. Sidebar hanya menampilkan 6 tautan datar
 * (tanpa accordion). Setiap area punya halaman hub berisi kartu-kartu besar.
 * Halaman yang jarang dipakai tetap ada di hub — tidak ada yang hilang,
 * dan semuanya bisa dijangkau lewat pencarian Ctrl+K.
 *
 * `section` dipakai untuk penyaringan hak akses lewat canAccess(role, section).
 */
import {
  Home, Shell, ClipboardCheck, Package, Wallet, Users,
  Heart, BookOpen, Baby, CalendarRange, GitBranch, Skull, Clock, Thermometer,
  Leaf, Salad, Stethoscope, Calendar, Library, ListTodo, Zap,
  LayoutGrid, ShoppingCart, Wrench, AlertTriangle, Truck, ChefHat,
  TrendingUp, DollarSign, PieChart, BarChart2,
  ShieldAlert, ScanSearch, MessageCircle, Calculator, FileText, Trophy, Star,
  Activity, MessageSquare, UserCog, Egg, Send, QrCode, Receipt,
} from "lucide-react";

export const NAV_SECTIONS = [
  {
    id: "kura",
    label: "Kura",
    hub: "/area/kura",
    icon: Shell,
    color: "text-teal-500",
    blurb: "Populasi, kesehatan, dan pembiakan",
    items: [
      { path: "/tortoise",          section: "tortoise",          label: "Daftar Kura",       icon: Shell,        desc: "Semua kura dan datanya" },
      { path: "/health",            section: "health",            label: "Catatan Sakit",     icon: Heart,        desc: "Riwayat sakit & pengobatan" },
      { path: "/panduan-penyakit",  section: "panduan-penyakit",  label: "Panduan Penyakit",  icon: BookOpen,     desc: "Rujukan gejala & penanganan" },
      { path: "/breeding",          section: "breeding",          label: "Breeding & Telur",  icon: Baby,         desc: "Pasangan, telur, penetasan" },
      { path: "/breeding-calendar", section: "breeding-calendar", label: "Kalender Breeding", icon: CalendarRange,desc: "Jadwal per pasangan" },
      { path: "/breeding-planner",  section: "breeding-planner",  label: "Perencana Breeding",icon: Egg,          desc: "Rencana perkawinan" },
      { path: "/incubator-readings",section: "breeding",          label: "Inkubator",         icon: Thermometer,  desc: "Suhu & kelembapan" },
      { path: "/family-tree",       section: "family-tree",       label: "Silsilah",          icon: GitBranch,    desc: "Garis keturunan" },
      { path: "/label-kura",        section: "tortoise",          label: "Cetak Label QR",    icon: QrCode,       desc: "Label 50×30mm per kandang, dipindai buka paspor" },
      { path: "/death-records",     section: "death-records",     label: "Catatan Kematian",  icon: Skull,        desc: "Riwayat & penyebab" },
      { path: "/kura-diam",         section: "kura-diam",         label: "Deteksi Kura Diam", icon: Clock,        desc: "Kura tanpa aktivitas" },
      { path: "/breeder-ranking",   section: "breeding",          label: "Ranking Indukan",   icon: Trophy,       desc: "Peringkat produksi telur per indukan" },
      { path: "/breeding-report",   section: "breeding-report",   label: "Laporan Breeding",  icon: BarChart2,    desc: "Rekap penetasan" },
    ],
  },
  {
    id: "operasional",
    label: "Operasional",
    hub: "/area/operasional",
    icon: ClipboardCheck,
    color: "text-amber-500",
    blurb: "Kandang, pakan, SOP, dan jadwal harian",
    items: [
      { path: "/sop",                  section: "sop",           label: "SOP Harian & KPI",     icon: ClipboardCheck, desc: "Checklist tugas harian tim" },
      { path: "/enclosure",            section: "enclosure",     label: "Daftar Kandang",       icon: Home,           desc: "Kandang & isinya" },
      { path: "/pakan-harian",         section: "pakan-harian",  label: "Pakan Harian",         icon: Salad,          desc: "Catatan pemberian pakan" },
      { path: "/panduan-pakan",        section: "panduan-pakan", label: "Panduan Pakan",        icon: Leaf,           desc: "Acuan pakan sulcata" },
      { path: "/pellet-recipe",        section: "pellet-recipe", label: "Resep Pelet",          icon: ChefHat,        desc: "Formula & takaran" },
      { path: "/treatment",            section: "treatment",     label: "Jadwal Treatment",     icon: Stethoscope,    desc: "Pengobatan terjadwal" },
      { path: "/maintenance-schedule", section: "maintenance",   label: "Kebersihan Kandang",   icon: Calendar,       desc: "Jadwal & riwayat pembersihan" },
      { path: "/sop-library",          section: "sop-library",   label: "Perpustakaan SOP",     icon: Library,        desc: "Dokumen prosedur" },
      { path: "/task-template",        section: "task-template", label: "Template Tugas Harian",icon: ListTodo,       desc: "Susun tugas yang muncul tiap hari" },
      { path: "/tugas-insidentil",     section: "tugas-insidentil", label: "Tugas Insidentil",  icon: Zap,            desc: "Tugas di luar rutinitas" },
      { path: "/rempesan",          section: "pakan-harian",   label: "Rempesan",          icon: Truck,          desc: "Catat ambil sayur/rumput (dihitung ke gaji)" },
    ],
  },
  {
    id: "stok",
    label: "Stok",
    hub: "/area/stok",
    icon: Package,
    color: "text-blue-500",
    blurb: "Gudang, pembelian, dan alat kerja",
    items: [
      { path: "/pembelian",        section: "daftar-belanja", label: "Belanja",                 icon: ShoppingCart,  desc: "Satu alur: yang kurang → dipesan → diterima → stok & biaya tercatat" },
      { path: "/stok-unified",     section: "stock-gudang",   label: "Stok & Gudang",           icon: LayoutGrid,    desc: "Barang, pakan, dan pergerakan stok" },
      { path: "/harus-dibeli",     section: "harus-dibeli",   label: "Rincian Yang Kurang",     icon: AlertTriangle, desc: "Rincian per sumber — ringkasannya ada di tahap pertama Belanja" },
      { path: "/daftar-belanja",   section: "daftar-belanja", label: "Tugas Menunggu Barang",   icon: ShoppingCart,  desc: "Tugas tim yang tertahan karena barangnya belum ada" },
      { path: "/dashboard-stok",   section: "warehouse",      label: "Ringkasan Stok",          icon: LayoutGrid,    desc: "Nilai & sebaran stok" },
      { path: "/warehouse",        section: "warehouse",      label: "Gudang Gazebo",           icon: Package,       desc: "Barang di gudang gazebo" },
      { path: "/feed-stock",       section: "feed-stock",     label: "Stok Pakan",              icon: Leaf,          desc: "Persediaan pakan" },
      { path: "/alat-kerja",       section: "alat-kerja",     label: "Alat Kerja",              icon: Wrench,        desc: "Peminjaman & kondisi alat" },
      { path: "/supplier",         section: "supplier",       label: "Pemasok",                 icon: Truck,         desc: "Daftar & riwayat pembelian" },
      { path: "/stock-prediction", section: "warehouse",      label: "Prediksi Stok",           icon: AlertTriangle, desc: "Perkiraan kehabisan per barang, lengkap dengan sisa harinya" },
    ],
  },
  {
    id: "uang",
    label: "Uang",
    hub: "/area/uang",
    icon: Wallet,
    color: "text-rose-500",
    blurb: "Penjualan, biaya, dan kas",
    items: [
      { path: "/finance",           section: "finance",           label: "Laporan Keuangan",   icon: TrendingUp, desc: "Pemasukan & pengeluaran" },
      { path: "/sales",             section: "sales",             label: "Penjualan Kura",     icon: DollarSign, desc: "Catatan penjualan" },
      { path: "/crm",               section: "crm",               label: "Data Pembeli",       icon: Users,      desc: "Pembeli & piutang" },
      { path: "/petty-cash",        section: "petty-cash",        label: "Kas Kecil",          icon: Wallet,     desc: "Pengeluaran harian" },
      { path: "/operational-costs", section: "operational-costs", label: "Biaya Operasional",  icon: Zap,        desc: "Listrik, air, dll" },
      { path: "/sales-report",      section: "sales-report",      label: "Laporan Penjualan",  icon: PieChart,   desc: "Rekap & tren" },
    ],
  },
  {
    id: "orang",
    label: "Orang",
    hub: "/area/orang",
    icon: Users,
    color: "text-green-500",
    blurb: "Tim, kinerja, dan gaji",
    items: [
      { path: "/layar-tim",       section: "layar-tim",     label: "Layar Tim",        icon: ScanSearch,    desc: "Aktivitas tim hari ini" },
      { path: "/hr",              section: "hr",            label: "Absensi & SDM",    icon: Users,         desc: "Kehadiran & data karyawan" },
      { path: "/approval-poin",   section: "approval-poin", label: "Approval Poin",    icon: ShieldAlert,   desc: "Setujui checklist & poin" },
      { path: "/temuan-foto",     section: "temuan-foto",   label: "Temuan dari Foto", icon: ScanSearch,    desc: "Hasil pemeriksaan AI" },
      { path: "/catatan-saran",   section: "catatan-saran", label: "Catatan dari Checklist", icon: MessageCircle, desc: "Pesan keeper & balasan owner" },
      { path: "/salary",          section: "salary",        label: "Hitung Gaji",      icon: Calculator,    desc: "Gaji pokok + poin + lembur + sayur − absen − kasbon" },
      { path: "/salary-slip",     section: "salary-slip",   label: "Slip Gaji",        icon: FileText,      desc: "Cetak slip" },
      { path: "/rekap-poin-gaji", section: "salary",        label: "Rekap Poin & Gaji",icon: Calculator,    desc: "Poin per karyawan" },
      { path: "/pengaturan-poin", section: "pengaturan-poin", label: "Pengaturan Poin",  icon: Star,          desc: "Nilai per poin, simulasi dampak biaya, riwayat" },
      { path: "/kasbon",          section: "kasbon",        label: "Kasbon",           icon: Wallet,        desc: "Pinjaman karyawan" },
      { path: "/payroll-gaji",    section: "payroll-gaji",  label: "Penggajian Karyawan", icon: Wallet,     desc: "Proses gaji, lembur, sayur, kasbon" },
      { path: "/payroll",         section: "payroll",       label: "Bonus & Reward",   icon: Trophy,        desc: "Bonus khusus di luar gaji rutin" },
      { path: "/daily-payroll",   section: "payroll",       label: "Gaji Harian",      icon: FileText,      desc: "Rekap upah harian dari absensi" },
      { path: "/users",           section: "users",         label: "Manajemen User",   icon: UserCog,       desc: "Akun & hak akses" },
      { path: "/kritik-saran",    section: "kritik-saran",  label: "Kotak Masukan",    icon: MessageSquare, desc: "Kritik & saran tim — yang ditindaklanjuti dapat 10 poin bonus" },
      { path: "/activity-log",    section: "activity-log",  label: "Activity Log",     icon: Activity,      desc: "Jejak perubahan data" },
      { path: "/pengaturan-whatsapp", section: "pengaturan-whatsapp", label: "Pengaturan WhatsApp", icon: Send,     desc: "Nomor tujuan & pesan otomatis (Fonnte)" },
      { path: "/log-whatsapp",        section: "log-whatsapp",        label: "Log WhatsApp",        icon: MessageSquare, desc: "Riwayat pesan terkirim & gagal" },
    ],
  },
];

// Halaman pengaturan — dipindah ke menu avatar (kanan atas), bukan sidebar.
export const SETTINGS_ITEMS = [
  { path: "/notifications",       section: "notifications",       label: "Notifikasi" },
  { path: "/vet-contacts",        section: "health",              label: "Kontak Dokter Hewan" },
  { path: "/printer-config",      section: "printer-config",      label: "Printer & Label" },
  { path: "/pengaturan-whatsapp", section: "pengaturan-whatsapp", label: "Pengaturan WhatsApp" },
  { path: "/log-whatsapp",        section: "log-whatsapp",        label: "Log WhatsApp" },
  { path: "/system-maintenance",  section: "system-maintenance",  label: "Pemeliharaan Sistem" },
];

// Halaman yang tidak layak masuk menu, tapi harus tetap terjangkau lewat Ctrl+K.
export const EXTRA_DESTINATIONS = [
  { path: "/passport",           section: "tortoise",  label: "Paspor Kura (cetak)",  group: "Kura" },
  { path: "/incomplete-data",    section: "dashboard", label: "Data Belum Lengkap",   group: "Laporan" },
  { path: "/info",               section: "info",      label: "Info & Pengumuman",    group: "Laporan" },
  { path: "/sop-term-condition", section: "sop",       label: "Syarat & Ketentuan SOP", group: "Operasional" },
  { path: "/edit-profil",        section: "dashboard", label: "Edit Profil Saya",     group: "Pengaturan" },
];

/**
 * Cari area induk dari sebuah path, untuk tombol "kembali" yang sadar konteks.
 * Mengembalikan { hub, label } bila halaman berada di dalam sebuah area,
 * atau null bila halaman berdiri sendiri (mis. halaman pengaturan).
 */
export function findParentArea(pathname) {
  if (!pathname || pathname === "/") return null;
  for (const s of NAV_SECTIONS) {
    if (pathname === s.hub) return null; // hub itu sendiri -> kembali ke Beranda
    if (s.items.some((i) => i.path === pathname || pathname.startsWith(i.path + "/"))) {
      return { hub: s.hub, label: s.label };
    }
  }
  return null;
}
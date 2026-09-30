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
import { Shell, ClipboardCheck, Package, Wallet, Users,
  Heart, Baby, Skull,
  Leaf, Salad, Stethoscope, Calendar,
  LayoutGrid, ShoppingCart, Wrench, Truck,
  TrendingUp, DollarSign,
  ShieldAlert, ScanSearch, Calculator, FileText,
  Activity, MessageSquare, UserCog, Egg, QrCode,
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
      { path: "/tortoise",          section: "tortoise",          label: "Daftar Kura",       icon: Shell,        desc: "Semua kura, kandang, karantina, terjual, silsilah, dan deteksi kura diam" },
      { path: "/health",            section: "health",            label: "Catatan Sakit",     icon: Heart,        desc: "Riwayat sakit & pengobatan, plus panduan penanganan penyakit" },
      { path: "/breeding",          section: "breeding",          label: "Breeding & Telur",  icon: Baby,         desc: "Pasangan, telur, penetasan" },
      { path: "/breeding-planner",  section: "breeding-planner",  label: "Produksi Indukan", icon: Egg,          desc: "Betina mana yang berproduksi, peringkat indukan, dan kandang mana yang membuat keturunannya bisa ditelusuri" },
      { path: "/label-kura",        section: "tortoise",          label: "Cetak Label QR",    icon: QrCode,       desc: "Label 50×30mm per kandang, dipindai buka paspor" },
      { path: "/death-records",     section: "death-records",     label: "Catatan Kematian",  icon: Skull,        desc: "Riwayat & penyebab" },
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
      { path: "/pakan-harian",         section: "pakan-harian",  label: "Pakan Harian",         icon: Salad,          desc: "Catatan pemberian pakan" },
      { path: "/panduan-pakan",        section: "panduan-pakan", label: "Panduan Pakan",        icon: Leaf,           desc: "Acuan pakan sulcata" },
      { path: "/treatment",            section: "treatment",     label: "Jadwal Treatment",     icon: Stethoscope,    desc: "Pengobatan terjadwal" },
      { path: "/maintenance-schedule", section: "maintenance",   label: "Kebersihan Kandang",   icon: Calendar,       desc: "Jadwal & riwayat pembersihan" },
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
      { path: "/pembelian",        section: "daftar-belanja", label: "Belanja",                 icon: ShoppingCart,  desc: "Satu alur: yang kurang → prediksi habis → dipesan → diterima → stok & biaya tercatat" },
      { path: "/stok-unified",     section: "stock-gudang",   label: "Stok & Gudang",           icon: LayoutGrid,    desc: "Barang gudang & pakan jadi satu daftar, plus pergerakan, peminjaman, resep, dan ringkasan nilai" },
      { path: "/daftar-belanja",   section: "daftar-belanja", label: "Tugas Menunggu Barang",   icon: ShoppingCart,  desc: "Tugas tim yang tertahan karena barangnya belum ada" },
      { path: "/alat-kerja",       section: "alat-kerja",     label: "Alat Kerja",              icon: Wrench,        desc: "Peminjaman & kondisi alat" },
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
      { path: "/catat-biaya",    section: "finance",       label: "Catat Pengeluaran", icon: Wallet,        desc: "Catat biaya rutin dalam tiga ketukan" },
      { path: "/sales",             section: "sales",             label: "Penjualan Kura",     icon: DollarSign, desc: "Catatan penjualan" },
      { path: "/petty-cash",        section: "petty-cash",        label: "Kas Kecil",          icon: Wallet,     desc: "Pengeluaran harian" },
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
      /*
       * DUA pintu gaji, turun dari empat pada 30-09-2026.
       *
       * "Gaji" milik pengelola: menghitung, menerbitkan, menyetujui kasbon,
       * mencatat lembur & rempesan, membaca laporan, mengatur tarif.
       * "Gaji Saya" milik semua orang termasuk keeper: slip dan kasbonnya
       * sendiri.
       *
       * Pemisahnya bukan selera melainkan hak akses: section "salary-slip"
       * dan "kasbon" memang dibuka keeper dan kepala_feeder, sedangkan
       * "salary" tidak. Melebur keempatnya jadi satu pintu akan mengunci
       * keeper dari slipnya sendiri.
       */
      { path: "/rekap-poin-gaji", section: "salary",        label: "Gaji",             icon: Calculator,    desc: "Terbitkan slip bulanan, kasbon, lembur, rempesan, laporan, tarif" },
      { path: "/salary-slip",     section: "salary-slip",   label: "Gaji Saya",        icon: FileText,      desc: "Slip gaji & kasbon kamu" },
      { path: "/users",           section: "users",         label: "Manajemen User",   icon: UserCog,       desc: "Akun & hak akses" },
      { path: "/kritik-saran",    section: "kritik-saran",  label: "Kotak Masukan",    icon: MessageSquare, desc: "Kritik & saran tim — yang ditindaklanjuti dapat 10 poin bonus" },
      { path: "/activity-log",    section: "activity-log",  label: "Activity Log",     icon: Activity,      desc: "Jejak perubahan data" },
    ],
  },
];

// Halaman pengaturan — dipindah ke menu avatar (kanan atas), bukan sidebar.
export const SETTINGS_ITEMS = [
  { path: "/otomatisasi",         section: "otomatisasi",         label: "Otomatisasi" },
  { path: "/notifications",       section: "notifications",       label: "Notifikasi" },
  { path: "/vet-contacts",        section: "health",              label: "Kontak Dokter Hewan" },
  { path: "/printer-config",      section: "printer-config",      label: "Printer & Label" },
  /* Pengaturan Poin pindah ke sini dari area ORANG pada 30-09-2026: ia
     mengatur nilai per poin, bukan mengerjakan sesuatu. Hak aksesnya tetap
     section "pengaturan-poin" (owner/admin/manajer), dan menu ini disaring
     canAccess yang sama dengan sidebar. */
  { path: "/pengaturan-poin",     section: "pengaturan-poin",     label: "Pengaturan Poin" },
  { path: "/pengaturan-whatsapp", section: "pengaturan-whatsapp", label: "Pengaturan WhatsApp" },
  { path: "/log-whatsapp",        section: "log-whatsapp",        label: "Log WhatsApp" },
  { path: "/system-maintenance",  section: "system-maintenance",  label: "Pemeliharaan Sistem" },
];

// Halaman yang tidak layak masuk menu, tapi harus tetap terjangkau lewat Ctrl+K.
export const EXTRA_DESTINATIONS = [
  /*
   * Lima pintu yang dikeluarkan dari sidebar pada 30-09-2026. Tidak satu pun
   * dihapus — semuanya masih dibuka dengan namanya lewat Ctrl+K.
   *
   *  · "Daftar Kandang" dan "Resep Pelet" bukan halaman: keduanya hanya
   *    <Navigate> ke tab yang SUDAH punya pintu sendiri di menu (tab Kandang
   *    di Daftar Kura, dan Stok & Gudang). Dua pintu ke satu layar.
   *  · "Perpustakaan SOP" dan "Tugas Insidentil" kini tab di SOP & Tugas.
   *  · "Template Tugas Harian" adalah sistem template KEDUA yang bersaing
   *    dengan SOPTask. Tabel DailyTaskTemplate berisi 0 baris sejak aplikasi
   *    ini berdiri, sementara SOPTask berisi 52 baris (33 aktif) dan itulah
   *    yang dipakai tim tiap hari lewat tab "Kelola SOP". Pintunya dikeluarkan
   *    supaya tidak ada yang menuang data ke tabel yang tidak dibaca siapa
   *    pun; halamannya sendiri tidak disentuh.
   */
  { path: "/enclosure",      section: "enclosure",     label: "Daftar Kandang",        group: "Operasional" },
  { path: "/pellet-recipe",  section: "pellet-recipe", label: "Resep Pelet",           group: "Stok" },
  { path: "/sop-library",    section: "sop-library",   label: "Perpustakaan SOP",      group: "Operasional" },
  { path: "/tugas-insidentil", section: "tugas-insidentil", label: "Tugas Insidentil", group: "Operasional" },
  { path: "/task-template",  section: "task-template", label: "Template Tugas Harian (tidak dipakai)", group: "Operasional" },
  /*
   * Pemasok dikeluarkan dari menu 30-09-2026: tabel Supplier dan
   * SupplierItem sama-sama NOL BARIS sejak aplikasi ini berdiri. Pembelian
   * berjalan lewat /pembelian tanpa pernah menyentuhnya.
   *
   * Halamannya tidak dihapus dan datanya tidak disentuh — kalau pemasok mulai
   * didaftarkan, pintunya tinggal dikembalikan ke daftar di atas.
   */
  { path: "/supplier",       section: "supplier",      label: "Pemasok (belum dipakai)", group: "Stok" },
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
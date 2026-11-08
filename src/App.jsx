import { lazy } from 'react';
import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes, Navigate, useLocation } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import { ViewAsProvider } from '@/lib/ViewAsContext';
import { TourProvider } from '@/lib/tourContext';
import { ThemeProvider } from '@/lib/ThemeContext';
import PembesarFoto from '@/components/common/PembesarFoto';
const StockPredictionPage = lazy(() => import('@/pages/StockPredictionPage'));
const PettyCashPage = lazy(() => import('@/pages/PettyCashPage'));
const SupplierPage = lazy(() => import('@/pages/SupplierPage'));
const HargaKuraPage = lazy(() => import('@/pages/HargaKuraPage'));
const IsiHargaBarangPage = lazy(() => import('@/pages/IsiHargaBarangPage'));
const IsiAsalKuraPage = lazy(() => import('@/pages/IsiAsalKuraPage'));
const IsiHargaBeliPage = lazy(() => import('@/pages/IsiHargaBeliPage'));
const SalarySlipPage = lazy(() => import('@/pages/SalarySlipPage'));
const ApprovalPoinPage = lazy(() => import('@/pages/ApprovalPoinPage'));
const DaftarBelanjaPage = lazy(() => import('@/pages/DaftarBelanjaPage'));
const AlatKerjaPage = lazy(() => import('@/pages/AlatKerjaPage'));
const PengaturanWhatsAppPage = lazy(() => import('@/pages/PengaturanWhatsAppPage'));
const WhatsAppLogPage = lazy(() => import('@/pages/WhatsAppLogPage'));
const LayarTimPage = lazy(() => import('@/pages/LayarTimPage'));
const HubPage = lazy(() => import('@/pages/HubPage'));
const PembelianPage = lazy(() => import('@/pages/PembelianPage'));
const TortoiseLabelPage = lazy(() => import('@/pages/TortoiseLabelPage'));
const OtomatisasiPage = lazy(() => import('@/pages/OtomatisasiPage'));
const CatatBiayaPage = lazy(() => import('@/pages/CatatBiayaPage'));

import AppLayout from '@/components/layout/AppLayout';
const Dashboard = lazy(() => import('@/pages/Dashboard'));
const TortoiseList = lazy(() => import('@/pages/TortoiseList.jsx'));
const BreedingAndEggs = lazy(() => import('@/pages/BreedingAndEggs.jsx'));
const BreedingDetailPage = lazy(() => import('@/pages/BreedingDetailPage'));
const HealthList = lazy(() => import('@/pages/HealthList.jsx'));
const SalesList = lazy(() => import('@/pages/SalesList'));
const UserManagement = lazy(() => import('@/pages/UserManagement'));
const SOPPage = lazy(() => import('@/pages/SOPPage'));
const FinancePage = lazy(() => import('@/pages/FinancePage'));
const InfoPage = lazy(() => import('@/pages/InfoPage'));
const TreatmentPage = lazy(() => import('@/pages/TreatmentPage'));
const HRPage = lazy(() => import('@/pages/HRPage'));
const NotificationsPage = lazy(() => import('@/pages/NotificationsPage'));
const BreedingPlannerPage = lazy(() => import('@/pages/BreedingPlannerPage'));
const DailyTaskTemplatePage = lazy(() => import('@/pages/DailyTaskTemplatePage'));
const TermConditionSOPPage = lazy(() => import('@/pages/TermConditionSOPPage'));
const ProfileSetupPage = lazy(() => import('@/pages/ProfileSetupPage.jsx'));
const EditProfilePage = lazy(() => import('@/pages/EditProfilePage.jsx'));
const IncompleteDataPage = lazy(() => import('@/pages/IncompleteDataPage'));
const DeathRecordsPage = lazy(() => import('@/pages/DeathRecordsPage'));
const ActivityLogPage = lazy(() => import('@/pages/ActivityLogPage'));
const SystemMaintenancePage = lazy(() => import('@/pages/SystemMaintenancePage'));
const VetContactPage = lazy(() => import('@/pages/VetContactPage.jsx'));
const MaintenanceSchedulePage = lazy(() => import('@/pages/MaintenanceSchedulePage.jsx'));
const PrinterConfigPage = lazy(() => import('@/pages/PrinterConfigPage'));
const KritikSaranPage = lazy(() => import('@/pages/KritikSaranPage'));
const TemuanFotoPage = lazy(() => import('@/pages/TemuanFotoPage'));
const RekapPoinGajiPage = lazy(() => import('@/pages/RekapPoinGajiPage'));
const DashboardStokPage = lazy(() => import('@/pages/DashboardStokPage'));
const UnifiedStokPage = lazy(() => import('@/pages/UnifiedStokPage'));
const PanduanPakanPage = lazy(() => import('@/pages/PanduanPakanPage'));
const PanduanPenyakitDetailPage = lazy(() => import('@/pages/PanduanPenyakitDetailPage'));
const PakanHarianPage = lazy(() => import('@/pages/PakanHarianPage'));
const TortoisePassport = lazy(() => import('@/pages/TortoisePassport'));
const RiwayatKlusterPage = lazy(() => import('@/pages/RiwayatKlusterPage'));
const PengaturanPoinPage = lazy(() => import('@/pages/PengaturanPoinPage'));
const RempesanPage = lazy(() => import('@/pages/RempesanPage'));


/*
 * Halaman dimuat SAAT RUTENYA DIBUKA, bukan sekaligus di awal.
 *
 * Sampai 8 Nov 2026 ke-58 halaman diimpor statis di berkas ini, jadi Vite
 * menyatukan seluruh aplikasi menjadi SATU berkas JavaScript. Diukur hari
 * itu: 4.605 KB. Siapa pun yang membuka /breeding ikut mengunduh layar
 * Keuangan, Gaji, Penjualan, Kesehatan, dan setiap pustaka yang dipakainya —
 * sebelum satu pun kandang tergambar. Di tablet dengan data seluler, itulah
 * yang terasa sebagai "loading terus".
 *
 * `lazy()` memecahnya per rute. Batas <Suspense>-nya ada DI DALAM AppLayout,
 * membungkus <Outlet /> — bukan di sekeliling <Routes> — supaya menu dan
 * kepala halaman tetap tergambar selagi isi halamannya dimuat. Membungkus
 * <Routes> akan mengosongkan seluruh layar tiap kali pindah halaman.
 *
 * AppLayout sendiri TIDAK ikut dipecah: ia rangka yang harus ada lebih dulu.
 */

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      navigateToLogin();
      return null;
    }
  }

  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/tortoise" element={<PilihTortoiseAtauKematian />} />
        <Route path="/breeding" element={<BreedingAndEggs />} />
        <Route path="/breeding/:id" element={<BreedingDetailPage />} />
        <Route path="/health" element={<HealthList />} />
        <Route path="/sales" element={<SalesList />} />
        <Route path="/users" element={<UserManagement />} />
        <Route path="/sop" element={<SOPPage />} />
        <Route path="/payroll" element={<Navigate to="/rekap-poin-gaji?tab=laporan&laporan=bonus" replace />} />
        {/* Laporan Breeding menyatu ke Ranking Indukan 30-09-2026:
            keduanya membaca sepuluh catatan yang sama dan menjawab
            pertanyaan yang sama. Tautan lama tetap bekerja. */}
        <Route path="/breeding-report" element={<Navigate to="/breeder-ranking" replace />} />
        <Route path="/feed-stock" element={<Navigate to="/stok-unified" replace />} />
        <Route path="/daily-payroll" element={<Navigate to="/rekap-poin-gaji?tab=laporan&laporan=harian" replace />} />
        {/*
          Enam rute di bawah diarahkan, bukan dihapus. Tautan lama dari
          pesan WhatsApp, bookmark, dan halaman lain tetap sampai ke tempat
          yang benar — kalau langsung dihapus, semuanya jadi halaman kosong.
          Isi ketiganya sudah ada di /stok-unified (tab Inventaris & Ringkasan)
          dan /pembelian (tab Yang Kurang & Prediksi Habis).
        */}
        <Route path="/warehouse" element={<Navigate to="/stok-unified" replace />} />
        <Route path="/finance" element={<FinancePage />} />
        <Route path="/info" element={<InfoPage />} />
        <Route path="/treatment" element={<TreatmentPage />} />
        <Route path="/feedback" element={<Navigate to="/kritik-saran" replace />} />
        {/*
          Dua alamat lama dari sebelum modul gaji dilebur (30-09-2026).
          Dibiarkan hidup sebagai pengalihan, bukan dihapus: keduanya sempat
          jadi pintu menu berbulan-bulan, jadi ada yang menyimpannya sebagai
          tautan dan ada yang mengetiknya dari ingatan. Halaman 404 untuk
          alamat yang kemarin masih benar adalah cara paling cepat membuat
          orang berhenti percaya pada menu.
        */}
        <Route path="/kasbon" element={<Navigate to="/salary-slip" replace />} />
        <Route path="/payroll-gaji" element={<Navigate to="/rekap-poin-gaji?tab=catatan" replace />} />
        {/* Silsilah menyatu jadi tab di Daftar Kura 30-09-2026. Tabnya
            dijaga izin `family-tree` — tidak dimiliki kiper. */}
        <Route path="/family-tree" element={<Navigate to="/tortoise?tab=silsilah" replace />} />
        <Route path="/salary" element={<Navigate to="/rekap-poin-gaji?tab=laporan" replace />} />
        {/* Halaman Kandang berdiri sendiri DIHAPUS 29-09-2026 dan digabung ke
            tab "Kandang" di Daftar Kura. Keduanya mengerjakan pekerjaan yang
            sama; satu cacat hitung yang sama sempat harus diperbaiki dua kali.

            Alamatnya dipertahankan sebagai pengalihan: menu masih menautkannya,
            begitu juga beranda pemilik (dua tempat), checklist awal, dan Data
            Belum Lengkap — dan penanda di peramban orang tidak boleh mati. */}
        <Route path="/enclosure" element={<AlihkanKandang />} />
        <Route path="/sales-report" element={<Navigate to="/sales?tab=laporan" replace />} />
        <Route path="/hr" element={<HRPage />} />
        <Route path="/notifications" element={<NotificationsPage />} />
        <Route path="/breeding-planner" element={<BreedingPlannerPage />} />
        <Route path="/sop-library" element={<Navigate to="/sop?tab=perpustakaan" replace />} />
        <Route path="/task-template" element={<DailyTaskTemplatePage />} />
        <Route path="/sop-term-condition" element={<TermConditionSOPPage />} />
        <Route path="/crm" element={<Navigate to="/sales?tab=pembeli" replace />} />
        <Route path="/death-records" element={<DeathRecordsPage />} />
        <Route path="/activity-log" element={<ActivityLogPage />} />
        <Route path="/system-maintenance" element={<SystemMaintenancePage />} />
        <Route path="/vet-contacts" element={<VetContactPage />} />
        <Route path="/maintenance-schedule" element={<MaintenanceSchedulePage />} />
        <Route path="/printer-config" element={<PrinterConfigPage />} />
        {/* Ranking Indukan menyatu jadi tab di Produksi Indukan 30-09-2026:
            per-pasangan dan per-betina adalah dua sudut dari satu
            pertanyaan, dari sepuluh catatan yang sama. */}
        <Route path="/breeder-ranking" element={<Navigate to="/breeding-planner?tab=peringkat" replace />} />
        <Route path="/stock-prediction" element={<Navigate to="/pembelian" replace />} />
        <Route path="/petty-cash" element={<PettyCashPage />} />
        <Route path="/supplier" element={<SupplierPage />} />
        <Route path="/harga-kura" element={<HargaKuraPage />} />
        <Route path="/isi-harga-barang" element={<IsiHargaBarangPage />} />
        <Route path="/isi-asal-kura" element={<IsiAsalKuraPage />} />
        <Route path="/isi-harga-beli" element={<IsiHargaBeliPage />} />
        {/*
          * /pellet-recipe dihapus 17-09-2026, dialihkan seperti /warehouse dan
          * /feed-stock sebelumnya.
          *
          * Halaman itu SALINAN KEDUA dari tab Resep di halaman stok, dan
          * salinan yang lebih buruk: ia mengurangi stok bahan tanpa menulis
          * StockMovement sama sekali dan tanpa menurunkan sisa batch. Artinya
          * produksi pelet lewat halaman itu memakai bahan secara tak terlihat —
          * tidak masuk perkiraan pemakaian, tidak bisa dibatalkan, tidak ada
          * jejaknya. Tab Resep melakukan ketiganya dengan benar.
          *
          * Tidak ada satu pun tautan di aplikasi menuju ke sana, jadi yang
          * tersisa hanya orang yang menyimpan URL-nya — dan merekalah yang
          * justru memakai versi yang rusak. Belum ada kerusakan data: nol
          * produksi pelet pernah tercatat.
          */}
        <Route path="/pellet-recipe" element={<Navigate to="/stok-unified" replace />} />
        <Route path="/operational-costs" element={<Navigate to="/finance?tab=biaya-ops" replace />} />
        <Route path="/salary-slip" element={<SalarySlipPage />} />
        <Route path="/approval-poin" element={<ApprovalPoinPage />} />
        <Route path="/layar-tim" element={<LayarTimPage />} />
        <Route path="/area/:areaId" element={<HubPage />} />
        <Route path="/label-kura" element={<TortoiseLabelPage />} />
        <Route path="/otomatisasi" element={<OtomatisasiPage />} />
        <Route path="/catat-biaya" element={<CatatBiayaPage />} />
        <Route path="/pembelian" element={<PembelianPage />} />
        <Route path="/tugas-insidentil" element={<Navigate to="/sop?tab=insidentil" replace />} />
        <Route path="/daftar-belanja" element={<DaftarBelanjaPage />} />
        <Route path="/harus-dibeli" element={<Navigate to="/pembelian" replace />} />
        <Route path="/alat-kerja" element={<AlatKerjaPage />} />
        <Route path="/pengaturan-whatsapp" element={<PengaturanWhatsAppPage />} />
        <Route path="/log-whatsapp" element={<WhatsAppLogPage />} />
        {/* Monitor Inkubator menyatu ke tab "Inkubator" di Breeding & Telur
            pada 30-09-2026. Setelan dan pembacaan adalah dua paruh dari satu
            hal; memisahkannya membuat pintu yang lebih mudah ditemukan justru
            tidak bisa mencatat apa pun. */}
        <Route path="/incubator-readings" element={<Navigate to="/breeding?tab=inkubator" replace />} />
        <Route path="/kritik-saran" element={<KritikSaranPage />} />
        <Route path="/catatan-saran" element={<Navigate to="/sop?tab=catatan" replace />} />
        <Route path="/temuan-foto" element={<TemuanFotoPage />} />
        <Route path="/stock-gudang" element={<Navigate to="/stok-unified" replace />} />
        <Route path="/rekap-poin-gaji" element={<RekapPoinGajiPage />} />
        <Route path="/dashboard-stok" element={<Navigate to="/stok-unified" replace />} />
        <Route path="/stok-unified" element={<UnifiedStokPage />} />
        <Route path="/panduan-pakan" element={<PanduanPakanPage />} />
        <Route path="/pakan-harian" element={<PakanHarianPage />} />
        {/* Panduan Penyakit menyatu jadi tab di Catatan Sakit 30-09-2026.
            Halaman RINCIAN per penyakit di bawah TIDAK ikut: ia ditautkan dari
            dalam formulir kesehatan dan panel diagnosis, dan tautan itu harus
            membuka halaman penuh, bukan melompat ke tab. */}
        <Route path="/panduan-penyakit" element={<Navigate to="/health?tab=panduan" replace />} />
        <Route path="/panduan-penyakit/:id" element={<PanduanPenyakitDetailPage />} />
        {/* Deteksi Kura Diam menyatu jadi tab di Daftar Kura 30-09-2026.
            Tabnya dijaga izin `kura-diam` — hanya owner/admin/manajer —
            karena `tortoise` dimiliki semua peran. */}
        <Route path="/kura-diam" element={<Navigate to="/tortoise?tab=diam" replace />} />
        {/* Kalender Breeding menyatu jadi tab "Timeline" di Breeding & Telur
            pada 30-09-2026. Isinya tidak tumpang tindih dengan tab lain —
            yang dihapus hanya pintunya yang terpisah di menu. */}
        <Route path="/breeding-calendar" element={<Navigate to="/breeding?tab=timeline" replace />} />
        <Route path="/riwayat-kluster" element={<RiwayatKlusterPage />} />
        <Route path="/pengaturan-poin" element={<PengaturanPoinPage />} />
        <Route path="/rempesan" element={<RempesanPage />} />

        <Route path="/lengkapi-profil" element={<ProfileSetupPage />} />
        <Route path="/edit-profil" element={<EditProfilePage />} />
        <Route path="/incomplete-data" element={<IncompleteDataPage />} />
      </Route>
      <Route path="/passport" element={<TortoisePassport />} />
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};

/**
 * Pengalihan /enclosure → tab Kandang, dengan `?edit=<id>` ikut dibawa.
 *
 * Halaman Data Belum Lengkap menautkan `/enclosure?edit=<id>`. Pengalihan
 * datar akan membuang parameter itu dan formulirnya tidak pernah terbuka —
 * persis keadaan sebelum ini, hanya dengan sebab yang berbeda.
 */
/**
 * `/tortoise?tab=kematian` -> `/death-records`.
 *
 * Tab "Kematian" di Daftar Kura dan halaman Catatan Kematian menampilkan hal
 * yang sama dari sumber yang sama, dan tabnya versi tipis: nama, kandang
 * terakhir, tanggal, penyebab. Halamannya menambahkan spesies, jenis kelamin,
 * tanggal lahir, berat terakhir, riwayat kesehatan, saringan tahun/penyebab,
 * dan satu-satunya formulir untuk MENCATAT kematian.
 *
 * Lebih buruk lagi: tab itu membaca entity `DeathRecord` yang berisi NOL
 * catatan, jadi petanya selalu kosong dan ia selalu jatuh ke kolom di
 * `Tortoise` — kueri yang tidak pernah menghasilkan apa pun, di halaman yang
 * paling sering dibuka.
 *
 * Tabnya dibuang, alamatnya tetap bekerja.
 */
function PilihTortoiseAtauKematian() {
  const { search } = useLocation();
  if (new URLSearchParams(search).get("tab") === "kematian") {
    return <Navigate to="/death-records" replace />;
  }
  return <TortoiseList />;
}

function AlihkanKandang() {
  const { search } = useLocation();
  const id = new URLSearchParams(search).get("edit");
  const tujuan = id
    ? `/tortoise?tab=kandang&edit=${encodeURIComponent(id)}`
    : "/tortoise?tab=kandang";
  return <Navigate to={tujuan} replace />;
}

function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <ThemeProvider>
        <ViewAsProvider>
          <TourProvider>
            {/*
              PembesarFoto dipasang SEKALI di sini, bukan di tiap layar: ia
              mendengarkan klik di tingkat dokumen, jadi setiap gambar di
              seluruh aplikasi bisa diketuk untuk dilihat besar tanpa 95
              perubahan terpisah. Aturannya di lib/fotoBisaDiperbesar.js.
            */}
            <PembesarFoto>
              <Router>
                <AuthenticatedApp />
              </Router>
              <Toaster />
            </PembesarFoto>
          </TourProvider>
        </ViewAsProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App
import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import { ViewAsProvider } from '@/lib/ViewAsContext';
import { TourProvider } from '@/lib/tourContext';
import { ThemeProvider } from '@/lib/ThemeContext';
import BreederRankingPage from '@/pages/BreederRankingPage';
import StockPredictionPage from '@/pages/StockPredictionPage';
import PettyCashPage from '@/pages/PettyCashPage';
import SupplierPage from '@/pages/SupplierPage';
import PelletRecipePage from '@/pages/PelletRecipePage';
import OperationalCostsPage from '@/pages/OperationalCostsPage';
import SalarySlipPage from '@/pages/SalarySlipPage';
import IncubatorReadingPage from '@/pages/IncubatorReadingPage';
import ApprovalPoinPage from '@/pages/ApprovalPoinPage';
import IncidentalTaskPage from '@/pages/IncidentalTaskPage';
import DaftarBelanjaPage from '@/pages/DaftarBelanjaPage';
import HarusDibeliPage from '@/pages/HarusDibeliPage';
import AlatKerjaPage from '@/pages/AlatKerjaPage';
import PengaturanWhatsAppPage from '@/pages/PengaturanWhatsAppPage';
import WhatsAppLogPage from '@/pages/WhatsAppLogPage';
import LayarTimPage from '@/pages/LayarTimPage';
import HubPage from '@/pages/HubPage';
import TortoiseLabelPage from '@/pages/TortoiseLabelPage';

import AppLayout from '@/components/layout/AppLayout';
import Dashboard from '@/pages/Dashboard';
import TortoiseList from '@/pages/TortoiseList.jsx';
import BreedingAndEggs from '@/pages/BreedingAndEggs.jsx';
import BreedingDetailPage from '@/pages/BreedingDetailPage';
import HealthList from '@/pages/HealthList.jsx';
import SalesList from '@/pages/SalesList';
import UserManagement from '@/pages/UserManagement';
import SOPPage from '@/pages/SOPPage';
import PayrollReport from '@/pages/PayrollReport';
import BreedingReport from '@/pages/BreedingReport';
import FeedStockPage from '@/pages/FeedStockPage';
import DailyPayrollReport from '@/pages/DailyPayrollReport';
import WarehousePage from '@/pages/WarehousePage';
import FinancePage from '@/pages/FinancePage';
import InfoPage from '@/pages/InfoPage';
import TreatmentPage from '@/pages/TreatmentPage';
import KasbonPage from '@/pages/KasbonPage';
import PayrollPage from '@/pages/PayrollPage';
import FamilyTreePage from '@/pages/FamilyTreePage';
import MonthlySalaryPage from '@/pages/MonthlySalaryPage';
import EnclosurePage from '@/pages/EnclosurePage';
import SalesReportPage from '@/pages/SalesReportPage';
import HRPage from '@/pages/HRPage';
import NotificationsPage from '@/pages/NotificationsPage';
import BreedingPlannerPage from '@/pages/BreedingPlannerPage';
import SOPLibraryPage from '@/pages/SOPLibraryPage';
import DailyTaskTemplatePage from '@/pages/DailyTaskTemplatePage';
import TermConditionSOPPage from '@/pages/TermConditionSOPPage';
import CRMPage from '@/pages/CRMPage';
import ProfileSetupPage from '@/pages/ProfileSetupPage.jsx';
import EditProfilePage from '@/pages/EditProfilePage.jsx';
import IncompleteDataPage from '@/pages/IncompleteDataPage';
import DeathRecordsPage from '@/pages/DeathRecordsPage';
import ActivityLogPage from '@/pages/ActivityLogPage';
import SystemMaintenancePage from '@/pages/SystemMaintenancePage';
import VetContactPage from '@/pages/VetContactPage.jsx';
import MaintenanceSchedulePage from '@/pages/MaintenanceSchedulePage.jsx';
import PrinterConfigPage from '@/pages/PrinterConfigPage';
import KritikSaranPage from '@/pages/KritikSaranPage';
import CatatanSaranPage from '@/pages/CatatanSaranPage';
import TemuanFotoPage from '@/pages/TemuanFotoPage';
import StockGudangPage from '@/pages/StockGudangPage';
import RekapPoinGajiPage from '@/pages/RekapPoinGajiPage';
import DashboardStokPage from '@/pages/DashboardStokPage';
import UnifiedStokPage from '@/pages/UnifiedStokPage';
import PanduanPakanPage from '@/pages/PanduanPakanPage';
import PanduanPenyakitPage from '@/pages/PanduanPenyakitPage';
import PanduanPenyakitDetailPage from '@/pages/PanduanPenyakitDetailPage';
import KuraDiamPage from '@/pages/KuraDiamPage';
import BreedingCalendarPage from '@/pages/BreedingCalendarPage';
import PakanHarianPage from '@/pages/PakanHarianPage';
import TortoisePassport from '@/pages/TortoisePassport';

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
        <Route path="/tortoise" element={<TortoiseList />} />
        <Route path="/breeding" element={<BreedingAndEggs />} />
        <Route path="/breeding/:id" element={<BreedingDetailPage />} />
        <Route path="/health" element={<HealthList />} />
        <Route path="/sales" element={<SalesList />} />
        <Route path="/users" element={<UserManagement />} />
        <Route path="/sop" element={<SOPPage />} />
        <Route path="/payroll" element={<PayrollReport />} />
        <Route path="/breeding-report" element={<BreedingReport />} />
        <Route path="/feed-stock" element={<FeedStockPage />} />
        <Route path="/daily-payroll" element={<DailyPayrollReport />} />
        <Route path="/warehouse" element={<WarehousePage />} />
        <Route path="/finance" element={<FinancePage />} />
        <Route path="/info" element={<InfoPage />} />
        <Route path="/treatment" element={<TreatmentPage />} />
        <Route path="/feedback" element={<Navigate to="/kritik-saran" replace />} />
        <Route path="/kasbon" element={<KasbonPage />} />
        <Route path="/payroll-gaji" element={<PayrollPage />} />
        <Route path="/family-tree" element={<FamilyTreePage />} />
        <Route path="/salary" element={<MonthlySalaryPage />} />
        <Route path="/enclosure" element={<EnclosurePage />} />
        <Route path="/sales-report" element={<SalesReportPage />} />
        <Route path="/hr" element={<HRPage />} />
        <Route path="/notifications" element={<NotificationsPage />} />
        <Route path="/breeding-planner" element={<BreedingPlannerPage />} />
        <Route path="/sop-library" element={<SOPLibraryPage />} />
        <Route path="/task-template" element={<DailyTaskTemplatePage />} />
        <Route path="/sop-term-condition" element={<TermConditionSOPPage />} />
        <Route path="/crm" element={<CRMPage />} />
        <Route path="/death-records" element={<DeathRecordsPage />} />
        <Route path="/activity-log" element={<ActivityLogPage />} />
        <Route path="/system-maintenance" element={<SystemMaintenancePage />} />
        <Route path="/vet-contacts" element={<VetContactPage />} />
        <Route path="/maintenance-schedule" element={<MaintenanceSchedulePage />} />
        <Route path="/printer-config" element={<PrinterConfigPage />} />
        <Route path="/breeder-ranking" element={<BreederRankingPage />} />
        <Route path="/stock-prediction" element={<StockPredictionPage />} />
        <Route path="/petty-cash" element={<PettyCashPage />} />
        <Route path="/supplier" element={<SupplierPage />} />
        <Route path="/pellet-recipe" element={<PelletRecipePage />} />
        <Route path="/operational-costs" element={<OperationalCostsPage />} />
        <Route path="/salary-slip" element={<SalarySlipPage />} />
        <Route path="/approval-poin" element={<ApprovalPoinPage />} />
        <Route path="/layar-tim" element={<LayarTimPage />} />
        <Route path="/area/:areaId" element={<HubPage />} />
        <Route path="/label-kura" element={<TortoiseLabelPage />} />
        <Route path="/tugas-insidentil" element={<IncidentalTaskPage />} />
        <Route path="/daftar-belanja" element={<DaftarBelanjaPage />} />
        <Route path="/harus-dibeli" element={<HarusDibeliPage />} />
        <Route path="/alat-kerja" element={<AlatKerjaPage />} />
        <Route path="/pengaturan-whatsapp" element={<PengaturanWhatsAppPage />} />
        <Route path="/log-whatsapp" element={<WhatsAppLogPage />} />
        <Route path="/incubator-readings" element={<IncubatorReadingPage />} />
        <Route path="/kritik-saran" element={<KritikSaranPage />} />
        <Route path="/catatan-saran" element={<CatatanSaranPage />} />
        <Route path="/temuan-foto" element={<TemuanFotoPage />} />
        <Route path="/stock-gudang" element={<StockGudangPage />} />
        <Route path="/rekap-poin-gaji" element={<RekapPoinGajiPage />} />
        <Route path="/dashboard-stok" element={<DashboardStokPage />} />
        <Route path="/stok-unified" element={<UnifiedStokPage />} />
        <Route path="/panduan-pakan" element={<PanduanPakanPage />} />
        <Route path="/pakan-harian" element={<PakanHarianPage />} />
        <Route path="/panduan-penyakit" element={<PanduanPenyakitPage />} />
        <Route path="/panduan-penyakit/:id" element={<PanduanPenyakitDetailPage />} />
        <Route path="/kura-diam" element={<KuraDiamPage />} />
        <Route path="/breeding-calendar" element={<BreedingCalendarPage />} />

        <Route path="/lengkapi-profil" element={<ProfileSetupPage />} />
        <Route path="/edit-profil" element={<EditProfilePage />} />
        <Route path="/incomplete-data" element={<IncompleteDataPage />} />
      </Route>
      <Route path="/passport" element={<TortoisePassport />} />
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};

function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <ThemeProvider>
        <ViewAsProvider>
          <TourProvider>
            <Router>
              <AuthenticatedApp />
            </Router>
            <Toaster />
          </TourProvider>
        </ViewAsProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App
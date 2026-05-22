import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import { ViewAsProvider } from '@/lib/ViewAsContext';
import { TourProvider } from '@/lib/tourContext';

import AppLayout from '@/components/layout/AppLayout';
import Dashboard from '@/pages/Dashboard';
import TortoiseList from '@/pages/TortoiseList.jsx';
import BreedingList from '@/pages/BreedingList';
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
import FeedbackPage from '@/pages/FeedbackPage';
import KasbonPage from '@/pages/KasbonPage';
import PayrollPage from '@/pages/PayrollPage';
import FamilyTreePage from '@/pages/FamilyTreePage';
import MonthlySalaryPage from '@/pages/MonthlySalaryPage';
import EnclosurePage from '@/pages/EnclosurePage';
import SalesReportPage from '@/pages/SalesReportPage';
import HRPage from '@/pages/HRPage';
import NotificationsPage from '@/pages/NotificationsPage';
import CCTVPage from '@/pages/CCTVPage';
import MarketplacePage from '@/pages/MarketplacePage';
import BreedingPlannerPage from '@/pages/BreedingPlannerPage';
import SOPLibraryPage from '@/pages/SOPLibraryPage';
import DailyTaskTemplatePage from '@/pages/DailyTaskTemplatePage';
import EnclosureAuditPage from '@/pages/EnclosureAuditPage';
import CRMPage from '@/pages/CRMPage';
import HelpCenterPage from '@/pages/HelpCenterPage';
import IncubatorPage from '@/pages/IncubatorPage';
import ProfileSetupPage from '@/pages/ProfileSetupPage.jsx';

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
        <Route path="/breeding" element={<BreedingList />} />
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
        <Route path="/feedback" element={<FeedbackPage />} />
        <Route path="/kasbon" element={<KasbonPage />} />
        <Route path="/payroll-gaji" element={<PayrollPage />} />
        <Route path="/family-tree" element={<FamilyTreePage />} />
        <Route path="/salary" element={<MonthlySalaryPage />} />
        <Route path="/enclosure" element={<EnclosurePage />} />
        <Route path="/sales-report" element={<SalesReportPage />} />
        <Route path="/hr" element={<HRPage />} />
        <Route path="/notifications" element={<NotificationsPage />} />
        <Route path="/cctv" element={<CCTVPage />} />
        <Route path="/marketplace" element={<MarketplacePage />} />
        <Route path="/breeding-planner" element={<BreedingPlannerPage />} />
        <Route path="/sop-library" element={<SOPLibraryPage />} />
        <Route path="/task-template" element={<DailyTaskTemplatePage />} />
        <Route path="/enclosure-audit" element={<EnclosureAuditPage />} />
        <Route path="/crm" element={<CRMPage />} />
        <Route path="/help" element={<HelpCenterPage />} />
        <Route path="/incubator" element={<IncubatorPage />} />
      <Route path="/lengkapi-profil" element={<ProfileSetupPage />} />
      </Route>
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};

function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <ViewAsProvider>
          <TourProvider>
            <Router>
              <AuthenticatedApp />
            </Router>
            <Toaster />
          </TourProvider>
        </ViewAsProvider>
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App
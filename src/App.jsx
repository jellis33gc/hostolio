import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import ScrollToTop from './components/ScrollToTop';
// Add page imports here
import Dashboard from './pages/Dashboard';
import Jobs from './pages/Jobs';
import Customers from './pages/Customers';
import Properties from './pages/Properties';
import MyJobs from './pages/MyJobs';
import JobDetail from './pages/JobDetail';
import StaffPage from './pages/Staff';
import AvailabilityPage from './pages/Availability';
import Leave from './pages/Leave';
import Documents from './pages/Documents';
import CustomerPortal from './pages/customer/Portal';
import RequestBooking from './pages/customer/RequestBooking';
import CustomerInvoices from './pages/customer/Invoices';
import Disputes from './pages/Disputes';
import Invoices from './pages/Invoices';

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin, user } = useAuth();

  // Show loading spinner while checking app public settings or auth
  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Handle authentication errors
  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      // Redirect to login automatically
      navigateToLogin();
      return null;
    }
  }

  // Render the main app
  const isStaff = user?.role === 'staff';
  const isCustomer = user?.role === 'customer';
  if (isCustomer) {
    return (
      <Routes>
        <Route path="/" element={<Navigate to="/portal" replace />} />
        <Route path="/portal" element={<CustomerPortal />} />
        <Route path="/portal/request" element={<RequestBooking />} />
        <Route path="/portal/invoices" element={<CustomerInvoices />} />
        <Route path="*" element={<Navigate to="/portal" replace />} />
      </Routes>
    );
  }
  return (
    <Routes>
    {/* Add your page Route elements here */}
    <Route path="/" element={<Navigate to={isStaff ? '/my-jobs' : '/dashboard'} replace />} />
    <Route path="/dashboard" element={<Dashboard />} />
    <Route path="/jobs" element={<Jobs />} />
    <Route path="/customers" element={<Customers />} />
    <Route path="/properties" element={<Properties />} />
    <Route path="/my-jobs" element={<MyJobs />} />
    <Route path="/jobs/:id" element={<JobDetail />} />
    <Route path="/staff" element={<StaffPage />} />
    <Route path="/availability" element={<AvailabilityPage />} />
    <Route path="/leave" element={<Leave />} />
    <Route path="/documents" element={<Documents />} />
    <Route path="/disputes" element={<Disputes />} />
    <Route path="/invoices" element={<Invoices />} />
    <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};


function App() {

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <ScrollToTop />
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App
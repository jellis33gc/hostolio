import { Toaster } from "@/components/ui/toaster"
import { useEffect } from 'react';
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import ScrollToTop from './components/ScrollToTop';
// Public pages
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
// Authenticated pages
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
import Disputes from './pages/Disputes';
import Invoices from './pages/Invoices';
import Services from './pages/Services';
import ModuleGate from './components/ModuleGate';
import ModuleManager from './pages/platform/ModuleManager';
import CustomerPortal from './pages/customer/Portal';
import RequestBooking from './pages/customer/RequestBooking';
import CustomerInvoices from './pages/customer/Invoices';
import { AppUser } from '@/api/entities';

// One-time, hardcoded-email bootstrap for the very first platform owner.
// Deliberately NOT a general "first user becomes owner" mechanism — that
// would be a real self-escalation risk for anyone else who signs up first.
// Remove this once the account below has is_platform_owner confirmed set.
const PLATFORM_OWNER_BOOTSTRAP_EMAIL = 'j.ellis33gc@gmail.com';

const PUBLIC_ROUTES = (
  <>
    <Route path="/" element={<Home />} />
    <Route path="/login" element={<Login />} />
    <Route path="/register" element={<Register />} />
    <Route path="/forgot-password" element={<ForgotPassword />} />
    <Route path="/reset-password" element={<ResetPassword />} />
    <Route path="*" element={<Navigate to="/" replace />} />
  </>
);

const AppRoutes = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, isAuthenticated, user } = useAuth();

  useEffect(() => {
    if (isAuthenticated && user && user.email === PLATFORM_OWNER_BOOTSTRAP_EMAIL && !user.is_platform_owner) {
      AppUser.update(user.id, { is_platform_owner: true })
        .then(() => window.location.reload())
        .catch((err) => console.error('Platform owner bootstrap failed:', err));
    }
  }, [isAuthenticated, user]);

  // Show loading spinner while checking app public settings or auth
  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  // A user without an account at all (e.g. Google sign-in not provisioned) —
  // distinct from simply "not logged in yet", which is handled below via the
  // public marketing site + our own Login/Register pages rather than an
  // external redirect.
  if (authError?.type === 'user_not_registered') {
    return <UserNotRegisteredError />;
  }

  // Logged-out visitors see the marketing homepage and our own auth pages,
  // never an automatic external redirect straight into the app.
  if (!isAuthenticated) {
    return <Routes>{PUBLIC_ROUTES}</Routes>;
  }

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
      <Route path="/" element={<Navigate to={isStaff ? '/my-jobs' : '/dashboard'} replace />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/jobs" element={<ModuleGate><Jobs /></ModuleGate>} />
      <Route path="/customers" element={<ModuleGate><Customers /></ModuleGate>} />
      <Route path="/properties" element={<ModuleGate><Properties /></ModuleGate>} />
      <Route path="/my-jobs" element={<MyJobs />} />
      <Route path="/jobs/:id" element={<JobDetail />} />
      <Route path="/staff" element={<ModuleGate><StaffPage /></ModuleGate>} />
      <Route path="/availability" element={<AvailabilityPage />} />
      <Route path="/leave" element={<ModuleGate><Leave /></ModuleGate>} />
      <Route path="/documents" element={<ModuleGate><Documents /></ModuleGate>} />
      <Route path="/disputes" element={<ModuleGate><Disputes /></ModuleGate>} />
      <Route path="/invoices" element={<ModuleGate><Invoices /></ModuleGate>} />
      <Route path="/services" element={<ModuleGate><Services /></ModuleGate>} />
      <Route path="/platform/modules" element={<ModuleManager />} />
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
          <AppRoutes />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App

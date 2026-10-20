import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { useEffect } from 'react';
import { setAuthInitialized } from './redux/slices/authSlice';
import MainLayout from './components/Shared/MainLayout';
import { lazy, Suspense } from 'react';
import ErrorBoundary from './components/Shared/ErrorBoundary';

const Home = lazy(() => import('./pages/Home'));
const Services = lazy(() => import('./pages/Services'));

const Pricing = lazy(() => import('./pages/Pricing'));
const About = lazy(() => import('./pages/About'));
const Contact = lazy(() => import('./pages/Contact'));
const Booking = lazy(() => import('./pages/Booking'));
const Tracking = lazy(() => import('./pages/Tracking'));
const Login = lazy(() => import('./components/Auth/Login'));
const Register = lazy(() => import('./components/Auth/Register'));
const OTPVerification = lazy(() => import('./components/Auth/OTPVerification'));
const CompleteProfile = lazy(() => import('./pages/CompleteProfile'));
const CustomerDashboard = lazy(() => import('./pages/CustomerDashboard'));
const DriverDashboard = lazy(() => import('./pages/DriverDashboard'));

const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const AdminLogin = lazy(() => import('./pages/AdminLogin'));
const Terms = lazy(() => import('./pages/Terms'));
const NotFound = lazy(() => import('./pages/NotFound'));
import CompleteProfileModal from './components/Customer/CompleteProfileModal';
import WebRTCCaller from './components/Shared/WebRTCCaller';
import WebRTCAdminReceiver from './components/Shared/WebRTCAdminReceiver';

const RequireAuth = ({ children, allowedRoles }) => {
  const { isAuthenticated, user, loading, isLoading } = useSelector((state) => state.auth);

  if (loading || isLoading) {
    return <div className="min-h-screen flex items-center justify-center text-loft-200">Loading...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }

  if (allowedRoles && !allowedRoles.includes(user?.role)) {
    return <Navigate to="/" />;
  }

  return children;
};

const ProfileModalWrapper = () => {
  const { isAuthenticated, user } = useSelector((state) => state.auth);
  const location = useLocation();

  const customerRoutes = ['/customer/dashboard', '/book', '/booking', '/wallet'];
  const isCustomerRoute = customerRoutes.some(path => location.pathname.startsWith(path));
  
  
  if (isAuthenticated && user?.role === 'customer' && !user?.isProfileComplete && isCustomerRoute) {
    return <CompleteProfileModal />;
  }
  
  return null;
};

const WebRTCWrapper = () => {
  const { user } = useSelector((state) => state.auth);
  
  if (user?.role === 'admin') {
    return <WebRTCAdminReceiver />;
  }
  
  return null;
};

function App() {
  const dispatch = useDispatch();

  useEffect(() => {
    // In a real application, you would check tokens or fetch /auth/me here
    // We explicitly mark auth initialization as complete to avoid race conditions.
    dispatch(setAuthInitialized());
  }, [dispatch]);

  return (
    <Router>
      <MainLayout>
        <ProfileModalWrapper />
        <WebRTCWrapper />
        <ErrorBoundary>
          <Suspense fallback={<div className="flex h-screen items-center justify-center"><div className="w-12 h-12 border-4 border-copper-500 border-t-transparent rounded-full animate-spin"></div></div>}>
            <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/admin-login" element={<Navigate to="/admin/login" replace />} />
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route path="/register" element={<Register />} />
            <Route path="/otp" element={<OTPVerification />} />
            <Route path="/services" element={<Services />} />

            <Route path="/pricing" element={<Pricing />} />
            <Route path="/about" element={<About />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/booking" element={<Booking />} />
            <Route path="/tracking/:bookingId?" element={<Tracking />} />
            <Route path="/complete-profile" element={
              <RequireAuth>
                 <CompleteProfile />
              </RequireAuth>
            } />
            
            <Route path="/" element={<Home />} />
            
            {/* Dashboards & Wallet */}
            <Route path="/customer/dashboard" element={
              <RequireAuth allowedRoles={['customer']}>
                <CustomerDashboard />
              </RequireAuth>
            } />
            <Route path="/wallet" element={
              <RequireAuth allowedRoles={['customer', 'driver', 'admin']}>
                <CustomerDashboard initialTab="payments" autoOpenTopup={true} />
              </RequireAuth>
            } />
            <Route path="/customer/dashboard/wallet" element={<Navigate to="/wallet" replace />} />
            <Route path="/customer/dashboard/payments" element={<Navigate to="/wallet" replace />} />
            <Route path="/driver/dashboard" element={
              <RequireAuth allowedRoles={['driver']}>
                <DriverDashboard />
              </RequireAuth>
            } />

            <Route path="/admin/dashboard" element={
              <RequireAuth allowedRoles={['admin']}>
                <AdminDashboard />
              </RequireAuth>
            } />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
        </ErrorBoundary>
      </MainLayout>
    </Router>
  );
}

export default App;

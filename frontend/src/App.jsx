import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import MainLayout from './components/Shared/MainLayout';
import { lazy, Suspense } from 'react';

const Home = lazy(() => import('./pages/Home'));
const Services = lazy(() => import('./pages/Services'));
const BusinessContracts = lazy(() => import('./pages/BusinessContracts'));
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
const BusinessDashboard = lazy(() => import('./pages/BusinessDashboard'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const AdminLogin = lazy(() => import('./pages/AdminLogin'));
import CompleteProfileModal from './components/Customer/CompleteProfileModal';

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated } = useSelector((state) => state.auth);

  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }

  return children;
};

const AdminRoute = ({ children }) => {
  const { isAuthenticated, user } = useSelector((state) => state.auth);

  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }

  if (user?.role !== 'admin') {
    return <Navigate to="/" />;
  }

  return children;
};

const ProfileModalWrapper = () => {
  const { isAuthenticated, user } = useSelector((state) => state.auth);
  
  if (isAuthenticated && user?.role === 'customer') {
    return <CompleteProfileModal />;
  }
  
  return null;
};

function App() {
  return (
    <Router>
      <MainLayout>
        <ProfileModalWrapper />
        <Suspense fallback={<div className="flex h-screen items-center justify-center"><div className="w-12 h-12 border-4 border-copper-500 border-t-transparent rounded-full animate-spin"></div></div>}>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/admin-login" element={<Navigate to="/admin/login" replace />} />
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route path="/register" element={<Register />} />
            <Route path="/otp" element={<OTPVerification />} />
            <Route path="/services" element={<Services />} />
            <Route path="/contracts" element={<BusinessContracts />} />
            <Route path="/pricing" element={<Pricing />} />
            <Route path="/about" element={<About />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/booking" element={<Booking />} />
            <Route path="/tracking/:bookingId?" element={<Tracking />} />
            <Route path="/complete-profile" element={
              <ProtectedRoute>
                 <CompleteProfile />
              </ProtectedRoute>
            } />
            
            <Route path="/" element={<Home />} />
            
            {/* Dashboards */}
            <Route path="/customer/dashboard" element={
              <ProtectedRoute>
                <CustomerDashboard />
              </ProtectedRoute>
            } />
            <Route path="/driver/dashboard" element={
              <ProtectedRoute>
                <DriverDashboard />
              </ProtectedRoute>
            } />
            <Route path="/business/dashboard" element={
              <ProtectedRoute>
                <BusinessDashboard />
              </ProtectedRoute>
            } />
            <Route path="/admin/dashboard" element={
              <AdminRoute>
                <AdminDashboard />
              </AdminRoute>
            } />
          </Routes>
        </Suspense>
      </MainLayout>
    </Router>
  );
}

export default App;

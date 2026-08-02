import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import MainLayout from './components/Shared/MainLayout';
import Home from './pages/Home';
import Services from './pages/Services';
import BusinessContracts from './pages/BusinessContracts';
import Pricing from './pages/Pricing';
import About from './pages/About';
import Contact from './pages/Contact';
import Booking from './pages/Booking';
import Tracking from './pages/Tracking';
import Login from './components/Auth/Login';
import Register from './components/Auth/Register';
import OTPVerification from './components/Auth/OTPVerification';
import CompleteProfile from './pages/CompleteProfile';
import CustomerDashboard from './pages/CustomerDashboard';
import DriverDashboard from './pages/DriverDashboard';
import BusinessDashboard from './pages/BusinessDashboard';
import AdminDashboard from './pages/AdminDashboard';
import CompleteProfileModal from './components/Customer/CompleteProfileModal';

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated } = useSelector((state) => state.auth);

  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }

  return children;
};

function App() {
  return (
    <Router>
      <MainLayout>
        <CompleteProfileModal />
        <Routes>
          <Route path="/login" element={<Login />} />
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
            <ProtectedRoute>
              <AdminDashboard />
            </ProtectedRoute>
          } />
        </Routes>
      </MainLayout>
    </Router>
  );
}

export default App;

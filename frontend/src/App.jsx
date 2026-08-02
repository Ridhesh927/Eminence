import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import MainLayout from './components/Shared/MainLayout';
import Home from './pages/Home';
import Login from './components/Auth/Login';
import Register from './components/Auth/Register';
import OTPVerification from './components/Auth/OTPVerification';
import CompleteProfile from './pages/CompleteProfile';
import CustomerDashboard from './pages/CustomerDashboard';
import CompleteProfileModal from './components/Customer/CompleteProfileModal';

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated } = useSelector((state) => state.auth);

  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }

  // We no longer forcefully redirect to /complete-profile route
  // because CompleteProfileModal will handle the UI overlay.
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
          <Route path="/complete-profile" element={
            <ProtectedRoute>
              <CompleteProfile />
            </ProtectedRoute>
          } />
          
          <Route path="/" element={<Home />} />
          
          <Route path="/customer/dashboard" element={
            <ProtectedRoute>
              <CustomerDashboard />
            </ProtectedRoute>
          } />
          {/* Add more protected routes here later */}
        </Routes>
      </MainLayout>
    </Router>
  );
}

export default App;

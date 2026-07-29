import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import MainLayout from './components/Shared/MainLayout';
import Home from './pages/Home';
import Login from './components/Auth/Login';
import Register from './components/Auth/Register';
import OTPVerification from './components/Auth/OTPVerification';
import CompleteProfile from './pages/CompleteProfile';

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, user } = useSelector((state) => state.auth);

  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }

  // If authenticated but profile isn't complete, force them to complete-profile page
  // unless they are already ON the complete-profile page
  if (user && !user.isProfileComplete && window.location.pathname !== '/complete-profile') {
    return <Navigate to="/complete-profile" />;
  }

  return children;
};

function App() {
  return (
    <Router>
      <MainLayout>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/otp" element={<OTPVerification />} />
          <Route path="/complete-profile" element={
            <ProtectedRoute>
              <CompleteProfile />
            </ProtectedRoute>
          } />
          
          <Route path="/" element={
            <ProtectedRoute>
              <Home />
            </ProtectedRoute>
          } />
          {/* Add more protected routes here later */}
        </Routes>
      </MainLayout>
    </Router>
  );
}

export default App;

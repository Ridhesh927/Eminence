import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import MainLayout from './components/Shared/MainLayout';
import Home from './pages/Home';
import Login from './components/Auth/Login';
import Register from './components/Auth/Register';
import OTPVerification from './components/Auth/OTPVerification';

function App() {
  return (
    <Router>
      <MainLayout>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/otp" element={<OTPVerification />} />
          {/* Add more routes here later */}
        </Routes>
      </MainLayout>
    </Router>
  );
}

export default App;

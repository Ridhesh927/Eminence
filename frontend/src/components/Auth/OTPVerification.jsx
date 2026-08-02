import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowRight, ArrowLeft } from 'lucide-react';
import { useDispatch } from 'react-redux';
import { loginSuccess } from '../../redux/slices/authSlice';

const OTPVerification = () => {
  const [otp, setOtp] = useState(['', '', '', '']);
  const [isLoading, setIsLoading] = useState(false);
  const inputRefs = useRef([]);
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const phone = location.state?.phone || 'Unknown Number';
  const isNewUser = location.state?.isNewUser || false;

  useEffect(() => {
    if (!location.state?.phone) {
      navigate('/login');
    }
  }, [location, navigate]);

  const handleChange = (index, value) => {
    if (isNaN(value)) return;
    
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Auto-focus next input
    if (value !== '' && index < 3) {
      inputRefs.current[index + 1].focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1].focus();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const otpValue = otp.join('');
    if (otpValue.length < 4) return;
    
    setIsLoading(true);
    
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/auth/phone-verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, code: otpValue })
      });
      
      const data = await response.json();
      setIsLoading(false);
      
      if (data.success) {
        localStorage.setItem('token', data.token);
        dispatch(loginSuccess({
          id: data.user.id,
          phone: data.user.phone,
          name: data.user.name || (isNewUser ? 'New User' : 'Existing Customer'),
          role: data.user.role || 'customer',
          token: data.token,
          isProfileComplete: data.user.isProfileComplete
        }));
        
        navigate('/customer/dashboard');
      } else {
        alert(data.message || 'Invalid OTP');
      }
    } catch (error) {
      console.error('OTP verify error:', error);
      setIsLoading(false);
      alert('Error verifying OTP');
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 relative">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(232,99,49,0.08),transparent_50%)] pointer-events-none"></div>

      <motion.div 
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-md card p-8 md:p-10 relative z-10"
      >
        <button 
          onClick={() => navigate(-1)}
          className="flex items-center text-loft-400 hover:text-loft-50 text-sm mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-1" /> Back
        </button>

        <div className="mb-8">
          <h2 className="text-3xl font-serif font-bold text-loft-50 mb-2">Verify Number</h2>
          <p className="text-loft-300">
            Enter the 4-digit code sent to <br/>
            <span className="font-medium text-loft-50">{phone}</span>
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="flex justify-between gap-4">
            {otp.map((digit, index) => (
              <input
                key={index}
                ref={(el) => (inputRefs.current[index] = el)}
                type="text"
                maxLength={1}
                className="w-16 h-16 text-center text-2xl font-bold bg-loft-950/80 border border-loft-800/80 rounded-xl focus:outline-none focus:ring-2 focus:ring-copper-500/50 focus:border-copper-500/50 transition-all text-loft-50 shadow-inner"
                value={digit}
                onChange={(e) => handleChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
              />
            ))}
          </div>

          <button
            type="submit"
            disabled={isLoading || otp.join('').length < 4}
            className="btn-primary w-full"
          >
            {isLoading ? (
              <span className="flex items-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Verifying...
              </span>
            ) : (
              <span className="flex items-center">
                Verify & Continue <ArrowRight className="ml-2 w-5 h-5" />
              </span>
            )}
          </button>
        </form>

        <div className="mt-8 text-center text-sm text-loft-300">
          Didn't receive the code?{' '}
          <button className="font-medium text-copper-500 hover:text-copper-400 transition-colors">
            Resend SMS
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default OTPVerification;

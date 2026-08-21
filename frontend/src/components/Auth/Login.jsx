import { useState } from 'react';
import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { ArrowRight, Phone } from 'lucide-react';
import { signInWithPopup } from 'firebase/auth';
import { auth, googleProvider } from '../../config/firebase';
import { loginSuccess } from '../../redux/slices/authSlice';

const GoogleIcon = () => (
  <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
  </svg>
);

const Login = () => {
  const [phone, setPhone] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('customer'); // 'customer', 'driver', 'admin'
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const handlePhoneSubmit = async (e) => {
    e.preventDefault();
    if (phone.length < 10) return;
    
    setIsLoading(true);
    try {
      await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/auth/phone-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone })
      });
      setIsLoading(false);
      navigate('/otp', { state: { phone } });
    } catch (error) {
      console.error('Phone login error:', error);
      setIsLoading(false);
      alert('Error sending OTP. Please try again.');
    }
  };

  const handleDemoLogin = async () => {
    const demoPhone = import.meta.env.VITE_DEMO_PHONE || '9999999999';
    setIsLoading(true);
    try {
      await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/auth/phone-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: demoPhone, role: activeTab })
      });
      setIsLoading(false);
      // Pass autoSubmit: true so the OTP page can bypass automatically
      navigate('/otp', { state: { phone: demoPhone, autoSubmit: true, role: activeTab } });
    } catch (error) {
      console.error('Demo login error:', error);
      setIsLoading(false);
      alert('Error logging in as demo user.');
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      setIsLoading(true);
      const result = await signInWithPopup(auth, googleProvider);
      const idToken = await result.user.getIdToken();
      
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/auth/google-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken })
      });
      
      const data = await response.json();
      setIsLoading(false);
      
      if (data.success) {
        localStorage.setItem('token', data.token);
        dispatch(loginSuccess({
          id: data.user.id,
          phone: data.user.phone,
          name: data.user.name,
          email: data.user.email,
          role: data.user.role || 'customer',
          token: data.token,
          isProfileComplete: data.user.isProfileComplete
        }));
        const userRole = data.user.role || 'customer';
        navigate(`/${userRole}/dashboard`);
      } else {
        alert(data.message || 'Google Login failed on server');
      }
    } catch (error) {
      console.error("Google Sign-In Error", error);
      setIsLoading(false);
      
      if (error.code === 'auth/unauthorized-domain' || error.message.includes('auth/handler')) {
        alert("Firebase Configuration Issue: 'localhost' is not added to your Firebase Authorized Domains.\n\nTo fix this: Go to Firebase Console -> Authentication -> Settings -> Authorized Domains and add 'localhost'.\n\nFor now, please use 'Continue with phone' to sign in!");
      } else {
        alert("Google Sign-In failed due to configuration. Please use 'Continue with phone' to log in for local development.");
      }
    }
  };

  return (
    <div className="min-h-[calc(100vh-5rem)] flex items-center justify-center pt-28 pb-16 px-4 sm:px-6 lg:px-8 relative">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(232,99,49,0.08),transparent_50%)] pointer-events-none"></div>
      
      <motion.div 
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-md card p-8 md:p-10 relative z-10"
      >
        <div className="mb-8 text-center">
          <h2 className="text-3xl font-serif font-bold text-loft-50 mb-2">Welcome back</h2>
          <p className="text-loft-300">Sign in to your Eminence account</p>
        </div>

        {/* Role Selection Tabs */}
        <div className="flex bg-loft-950/50 p-1 rounded-xl mb-8">
          {['customer', 'driver', 'admin'].map((role) => (
            <button
              key={role}
              onClick={() => setActiveTab(role)}
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all capitalize ${
                activeTab === role 
                  ? 'bg-copper-500/20 text-copper-500 shadow-sm border border-copper-500/30' 
                  : 'text-loft-400 hover:text-loft-200 hover:bg-loft-800/50'
              }`}
            >
              {role}
            </button>
          ))}
        </div>

        <button 
          onClick={handleGoogleSignIn}
          disabled={isLoading}
          className="w-full flex items-center justify-center px-4 py-3.5 border border-loft-700 hover:border-loft-600 rounded-xl bg-loft-800/50 hover:bg-loft-800 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-offset-loft-950 focus:ring-copper-500 transition-all duration-200 text-loft-50 font-medium mb-6"
        >
          <GoogleIcon />
          Continue with Google
        </button>

        <div className="relative mb-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-loft-800"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-4 bg-loft-900 text-loft-400">Or continue with phone</span>
          </div>
        </div>

        <form onSubmit={handlePhoneSubmit} className="space-y-6">
          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-loft-200 mb-2">
              Phone Number
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Phone className="h-5 w-5 text-loft-400" />
              </div>
              <input
                id="phone"
                name="phone"
                type="tel"
                required
                className="input-field pl-12"
                placeholder="Enter 10 digit number"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading || phone.length < 10}
            className="btn-primary w-full"
          >
            {isLoading ? (
              <span className="flex items-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Processing...
              </span>
            ) : (
              <span className="flex items-center">
                Sign In <ArrowRight className="ml-2 w-5 h-5" />
              </span>
            )}
          </button>
        </form>

        <div className="mt-8 text-center text-sm text-loft-300">
          Don't have an account?{' '}
          <Link to="/register" className="font-medium text-copper-500 hover:text-copper-400 transition-colors">
            Sign up
          </Link>
        </div>

        {/* Demo Login Button */}
        <div className="mt-6 pt-6 border-t border-loft-800 text-center">
          <button
            onClick={handleDemoLogin}
            disabled={isLoading}
            className="text-sm font-medium text-loft-400 hover:text-copper-400 transition-colors"
          >
            Looking for a quick demo? <span className="underline decoration-copper-500/50 underline-offset-4">Log in as Demo User</span>
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default Login;

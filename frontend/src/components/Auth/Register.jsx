import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { ArrowRight, Phone, User, Eye, EyeOff, Gift, CheckCircle, AlertCircle } from 'lucide-react';
import { signInWithPopup } from 'firebase/auth';
import { auth, googleProvider } from '../../config/firebase';
import { useDispatch } from 'react-redux';
import { loginSuccess } from '../../redux/slices/authSlice';
import TermsModal from '../Common/TermsModal';
import api from '../../services/api';

const GoogleIcon = () => (
  <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
  </svg>
);

const Register = () => {
  const [formData, setFormData] = useState({ name: '', phone: '', email: '', password: '', referralCode: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [isTermsOpen, setIsTermsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successInfo, setSuccessInfo] = useState(null);
  const [activeTab] = useState('customer');
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from;

  const dispatch = useDispatch();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    if (errorMessage) setErrorMessage('');
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.password) return;
    if (!termsAccepted) return;
    
    setIsLoading(true);
    setErrorMessage('');
    try {
      const response = await api.post('/api/auth/register', { 
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        password: formData.password,
        referralCode: formData.referralCode?.trim() || undefined,
        role: activeTab 
      });
      
      setIsLoading(false);
      
      if (response.data.success) {
        setSuccessInfo({
          message: response.data.message || 'Account created successfully! You can now log in to access your dashboard.',
          hasBonus: Boolean(formData.referralCode?.trim())
        });
      }
    } catch (error) {
      console.error('Registration submit error:', error);
      setIsLoading(false);
      setErrorMessage(error.response?.data?.message || 'Error initiating registration. Please try again.');
    }
  };

  const handleGoogleSignUp = async () => {
    try {
      setIsLoading(true);
      setErrorMessage('');
      const result = await signInWithPopup(auth, googleProvider);
      const idToken = await result.user.getIdToken();
      
      const response = await api.post('/api/auth/google-login', { 
        idToken,
        role: activeTab,
        acceptedTerms: termsAccepted
      });
      const data = response.data;
      setIsLoading(false);

      if (data.success) {
        try {
          sessionStorage.removeItem('profile_modal_dismissed');
          if (data.user?.id) {
            sessionStorage.removeItem(`profile_modal_dismissed_${data.user.id}`);
          }
        } catch (_e) {}

        dispatch(loginSuccess({
          ...data.user,
          role: data.user.role || activeTab,
          token: data.token
        }));

        const targetRoute = from || (data.user.role === 'admin'
          ? '/admin/dashboard'
          : data.user.role === 'driver'
            ? '/driver/dashboard'
            : '/customer/dashboard');
        navigate(targetRoute, { state: location.state, replace: true });
      }
    } catch (error) {
      console.error("Google Sign-Up Error", error);
      setIsLoading(false);
      setErrorMessage(error.response?.data?.message || 'Google sign up failed. Please try again.');
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 relative">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(232,99,49,0.08),transparent_50%)] pointer-events-none"></div>

      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-md card p-8 md:p-10 relative z-10"
      >
        <div className="mb-8 text-center">
          <h2 className="text-3xl font-serif font-bold text-loft-50 mb-2">Create Account</h2>
          <p className="text-loft-300">Join Eminence for a seamless booking experience</p>
        </div>

        {/* Notice for Fleet Drivers */}
        <div className="mb-6 p-3 rounded-xl bg-loft-950/60 border border-loft-800 text-center">
          <p className="text-xs text-loft-400">
            Are you a driver? Driver credentials are appointed directly by Fleet Admins. Please log in via the <Link to="/login" className="text-copper-400 font-semibold hover:underline">Sign In</Link> portal.
          </p>
        </div>

        {/* Error Notification */}
        {errorMessage && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm flex items-start gap-3"
          >
            <AlertCircle className="w-5 h-5 flex-shrink-0 text-red-400 mt-0.5" />
            <span className="flex-1 leading-relaxed">{errorMessage}</span>
          </motion.div>
        )}

        <button 
          onClick={handleGoogleSignUp}
          disabled={isLoading}
          className="w-full flex items-center justify-center px-4 py-3.5 border border-loft-700 hover:border-loft-600 rounded-xl bg-loft-800/50 hover:bg-loft-800 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-offset-loft-950 focus:ring-copper-500 transition-all duration-200 text-loft-50 font-medium mb-6"
        >
          <GoogleIcon />
          Sign up with Google
        </button>

        <div className="relative mb-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-loft-800"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-4 bg-loft-900 text-loft-400">Or register with email</span>
          </div>
        </div>

        <form onSubmit={handleRegisterSubmit} className="space-y-5">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-loft-200 mb-2">
              Full Name
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <User className="h-5 w-5 text-loft-400" />
              </div>
              <input
                id="name"
                name="name"
                type="text"
                required
                className="input-field pl-12"
                placeholder="John Doe"
                value={formData.name}
                onChange={handleChange}
              />
            </div>
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-loft-200 mb-2">
              Email Address
            </label>
            <div className="relative">
              <input
                id="email"
                name="email"
                type="email"
                required
                className="input-field pl-4"
                placeholder="john@example.com"
                value={formData.email}
                onChange={handleChange}
              />
            </div>
          </div>

          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-loft-200 mb-2">
              Mobile Number (+91)
            </label>
            <div className="relative flex">
              <div className="flex items-center px-3 rounded-l-xl bg-loft-900 border border-r-0 border-loft-700/60 text-loft-300 text-sm font-medium">
                🇮🇳 +91
              </div>
              <input
                id="phone"
                name="phone"
                type="tel"
                maxLength={10}
                className="input-field rounded-l-none"
                placeholder="10-digit mobile (e.g. 9876543210)"
                value={formData.phone}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, '').slice(0, 10);
                  setFormData({ ...formData, phone: val });
                }}
              />
            </div>
            {formData.phone && formData.phone.length > 0 && !/^[6-9]/.test(formData.phone) && (
              <p className="text-xs text-amber-400 mt-1">Indian mobile numbers must start with 6, 7, 8, or 9</p>
            )}
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-loft-200 mb-2">
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                required
                className="input-field pl-4 pr-12"
                placeholder="••••••••"
                value={formData.password}
                onChange={handleChange}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-4 flex items-center text-loft-400 hover:text-loft-200 focus:outline-none"
              >
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label htmlFor="referralCode" className="block text-sm font-medium text-loft-200">
                Referral Code (Optional)
              </label>
              <span className="text-xs text-copper-400 font-medium">Get ₹100 Welcome Bonus</span>
            </div>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Gift className="h-5 w-5 text-loft-400" />
              </div>
              <input
                id="referralCode"
                name="referralCode"
                type="text"
                className="input-field pl-12 uppercase tracking-wider font-mono placeholder:normal-case placeholder:font-sans"
                placeholder="e.g. EMINENCE-AB12CD"
                value={formData.referralCode}
                onChange={(e) => setFormData({ ...formData, referralCode: e.target.value.toUpperCase() })}
              />
            </div>
          </div>

          {/* Terms & Conditions Agreement Checkbox */}
          <div className="flex items-start gap-3 pt-1">
            <input
              id="terms-checkbox"
              type="checkbox"
              checked={termsAccepted}
              onChange={(e) => setTermsAccepted(e.target.checked)}
              className="mt-1 h-4 w-4 rounded border-loft-700 bg-loft-950 text-copper-500 focus:ring-copper-500 focus:ring-offset-loft-900 cursor-pointer"
            />
            <label htmlFor="terms-checkbox" className="text-xs text-loft-300 leading-relaxed cursor-pointer select-none">
              I have read and agree to the{' '}
              <button
                type="button"
                onClick={() => setIsTermsOpen(true)}
                className="text-copper-400 hover:text-copper-300 font-semibold underline underline-offset-2 focus:outline-none"
              >
                Terms & Conditions
              </button>{' '}
              and consent to GPS telematics and logistics data processing.
            </label>
          </div>

          <button
            type="submit"
            disabled={isLoading || !formData.email || !formData.name || !formData.password || !termsAccepted}
            className="btn-primary w-full mt-2 disabled:opacity-50 disabled:cursor-not-allowed"
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
                Create Account <ArrowRight className="ml-2 w-5 h-5" />
              </span>
            )}
          </button>
        </form>

        <TermsModal
          isOpen={isTermsOpen}
          onClose={() => setIsTermsOpen(false)}
          onAccept={() => setTermsAccepted(true)}
        />

        <div className="mt-8 text-center text-sm text-loft-300">
          Already have an account?{' '}
          <Link to="/login" className="font-medium text-copper-500 hover:text-copper-400 transition-colors">
            Sign in
          </Link>
        </div>
      </motion.div>

      {/* Registration Success Modal Dialog */}
      <AnimatePresence>
        {successInfo && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 16 }}
              className="bg-loft-900 border border-copper-500/40 rounded-2xl shadow-[0_16px_48px_rgba(0,0,0,0.8)] max-w-md w-full p-6 md:p-8 text-center relative overflow-hidden"
            >
              <div className="absolute -top-12 -right-12 w-32 h-32 bg-copper-500/10 rounded-full blur-2xl pointer-events-none" />
              <div className="absolute -bottom-12 -left-12 w-32 h-32 bg-moss-500/10 rounded-full blur-2xl pointer-events-none" />

              <div className="w-16 h-16 rounded-full bg-moss-500/15 border border-moss-500/30 flex items-center justify-center mx-auto mb-5 text-moss-400 shadow-[0_0_20px_rgba(34,197,94,0.15)]">
                <CheckCircle className="w-8 h-8" />
              </div>

              <h3 className="text-2xl font-serif font-bold text-loft-50 mb-2">
                Registration Successful!
              </h3>

              <p className="text-loft-300 text-sm mb-6 leading-relaxed">
                {successInfo.message}
              </p>

              {successInfo.hasBonus && (
                <div className="mb-6 p-3 rounded-xl bg-copper-500/10 border border-copper-500/25 flex items-center justify-center gap-2 text-copper-400 text-xs font-semibold">
                  <Gift className="w-4 h-4" />
                  <span>₹100 Welcome Bonus has been reserved for your wallet!</span>
                </div>
              )}

              <button
                onClick={() => {
                  setSuccessInfo(null);
                  navigate('/login', { state: location.state });
                }}
                className="btn-primary w-full py-3.5 text-base flex items-center justify-center gap-2 shadow-lg"
              >
                Proceed to Sign In
                <ArrowRight className="w-4 h-4" />
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Register;

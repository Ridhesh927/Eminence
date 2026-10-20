import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ArrowRight, Mail, Lock, Eye, EyeOff } from 'lucide-react';
import { useDispatch } from 'react-redux';
import { signInWithPopup } from 'firebase/auth';
import { auth, googleProvider } from '../../config/firebase';
import api from '../../services/api';
import { loginSuccess } from '../../redux/slices/authSlice';

const GoogleIcon = () => (
  <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
  </svg>
);

const AuthModal = ({ isOpen, onClose, onSuccess, initialMode = 'login', message = 'Please log in to proceed with your booking.' }) => {
  const dispatch = useDispatch();
  const [mode, setMode] = useState(initialMode); // 'login' or 'register'
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState('customer');
  const [referralCode, setReferralCode] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    if (!identifier || !password) return;
    setIsLoading(true);
    setError('');
    try {
      const res = await api.post('/api/auth/login', { identifier, password, role });
      const data = res.data;
      setIsLoading(false);
      if (data.success) {
        dispatch(loginSuccess({
          ...data.user,
          token: data.token
        }));
        if (onSuccess) onSuccess(data.user);
        onClose();
      }
    } catch (err) {
      setIsLoading(false);
      setError(err.response?.data?.message || 'Invalid credentials or user not found');
    }
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    if (!name || !email || !password) {
      setError('Please fill in all required fields');
      return;
    }
    if (!termsAccepted) {
      setError('Please accept the Terms & Conditions');
      return;
    }
    setIsLoading(true);
    setError('');
    try {
      const res = await api.post('/api/auth/register', { name, email, phone, password, role, referralCode: referralCode?.trim() || undefined });
      setIsLoading(false);
      if (res.data.success) {
        // Automatically log in after registration
        const loginRes = await api.post('/api/auth/login', { identifier: email, password, role });
        const data = loginRes.data;
        if (data.success) {
          dispatch(loginSuccess({
            ...data.user,
            token: data.token
          }));
          if (onSuccess) onSuccess(data.user);
          onClose();
        } else {
          setMode('login');
          setIdentifier(email);
        }
      }
    } catch (err) {
      setIsLoading(false);
      setError(err.response?.data?.message || 'Registration failed. Please try again.');
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      setIsLoading(true);
      setError('');
      const result = await signInWithPopup(auth, googleProvider);
      const idToken = await result.user.getIdToken();
      const response = await api.post('/api/auth/google-login', { idToken });
      const data = response.data;
      setIsLoading(false);
      if (data.success) {
        dispatch(loginSuccess({
          ...data.user,
          token: data.token
        }));
        if (onSuccess) onSuccess(data.user);
        onClose();
      }
    } catch (err) {
      setIsLoading(false);
      setError(err.response?.data?.message || 'Google sign in failed');
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/80 backdrop-blur-md"
        />

        {/* Modal Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-md bg-loft-900 border border-loft-700/80 rounded-2xl shadow-2xl shadow-black/80 p-6 sm:p-8 z-10"
        >
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-5 right-5 p-2 rounded-lg text-loft-400 hover:text-loft-100 hover:bg-loft-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Header */}
          <div className="mb-6 text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-copper-500/10 border border-copper-500/20 text-copper-400 text-xs font-semibold mb-3">
              ⚡ FAST & SECURE ACCESS
            </div>
            <h3 className="text-2xl font-serif font-bold text-loft-50 mb-1">
              {mode === 'login' ? 'Sign In to Continue' : 'Create an Account'}
            </h3>
            <p className="text-xs sm:text-sm text-loft-300">
              {message}
            </p>
          </div>

          {/* Role selector tabs */}
          {mode === 'login' ? (
            <div className="flex bg-loft-950/60 p-1 rounded-xl mb-5">
              <button
                type="button"
                onClick={() => { setRole('customer'); setError(''); }}
                className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-all ${
                  role === 'customer'
                    ? 'bg-copper-500/20 text-copper-500 border border-copper-500/30'
                    : 'text-loft-400 hover:text-loft-200'
                }`}
              >
                Customer
              </button>
              <button
                type="button"
                onClick={() => { setRole('driver'); setError(''); }}
                className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-all ${
                  role === 'driver'
                    ? 'bg-copper-500/20 text-copper-500 border border-copper-500/30'
                    : 'text-loft-400 hover:text-loft-200'
                }`}
              >
                Driver
              </button>
            </div>
          ) : null}

          {/* Google Sign-in (only for customers) */}
          {role !== 'driver' && (
            <>
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={isLoading}
                className="w-full flex items-center justify-center px-4 py-3 border border-loft-700 hover:border-loft-600 rounded-xl bg-loft-800/60 hover:bg-loft-800 text-loft-50 font-medium text-sm transition-all mb-4"
              >
                <GoogleIcon />
                Continue with Google
              </button>

              <div className="relative mb-5">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-loft-800"></div>
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="px-3 bg-loft-900 text-loft-400">OR WITH CREDENTIALS</span>
                </div>
              </div>
            </>
          )}

          {error && (
            <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs text-center">
              {error}
            </div>
          )}

          {/* Form */}
          {mode === 'login' ? (
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-loft-200 mb-1">Email, Phone, or Username</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-loft-400" />
                  <input
                    type="text"
                    required
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="john@example.com or phone"
                    className="input-field pl-10 text-sm py-2.5"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-loft-200 mb-1">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-loft-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="input-field pl-10 pr-10 text-sm py-2.5"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-loft-400 hover:text-loft-200"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="btn-primary w-full py-3 text-sm mt-2 flex items-center justify-center gap-2"
              >
                {isLoading ? 'Signing In...' : 'Sign In & Continue'}
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          ) : (
            <form onSubmit={handleRegisterSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-medium text-loft-200 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="John Doe"
                  className="input-field text-sm py-2.5"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-loft-200 mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="john@example.com"
                  className="input-field text-sm py-2.5"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-loft-200 mb-1">Mobile Number (+91)</label>
                <div className="relative flex">
                  <div className="flex items-center px-2.5 rounded-l-xl bg-loft-800 border border-r-0 border-loft-700/60 text-loft-300 text-xs font-medium">
                    🇮🇳 +91
                  </div>
                  <input
                    type="tel"
                    maxLength={10}
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    placeholder="10-digit mobile"
                    className="input-field rounded-l-none text-sm py-2.5"
                  />
                </div>
                {phone && phone.length > 0 && !/^[6-9]/.test(phone) && (
                  <p className="text-[10px] text-amber-400 mt-1">Must start with 6, 7, 8, or 9</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-loft-200 mb-1">Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="input-field pr-10 text-sm py-2.5"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-loft-400 hover:text-loft-200"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-medium text-loft-200">Referral Code (Optional)</label>
                  <span className="text-[10px] text-copper-400 font-medium">Get ₹100 Welcome Bonus</span>
                </div>
                <input
                  type="text"
                  value={referralCode}
                  onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                  placeholder="e.g. EMINENCE-AB12CD"
                  className="input-field text-sm py-2.5 uppercase font-mono tracking-wider placeholder:normal-case placeholder:font-sans"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  id="modal-terms"
                  type="checkbox"
                  checked={termsAccepted}
                  onChange={(e) => setTermsAccepted(e.target.checked)}
                  className="h-4 w-4 rounded border-loft-700 bg-loft-950 text-copper-500 focus:ring-copper-500"
                />
                <label htmlFor="modal-terms" className="text-xs text-loft-300">
                  I agree to the Terms & Conditions
                </label>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="btn-primary w-full py-3 text-sm mt-2 flex items-center justify-center gap-2"
              >
                {isLoading ? 'Creating Account...' : 'Create Account & Continue'}
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          )}

          {/* Switch Mode Footer */}
          <div className="mt-5 text-center text-xs text-loft-300">
            {mode === 'login' ? (
              <>
                Don't have an account?{' '}
                <button
                  type="button"
                  onClick={() => { setMode('register'); setError(''); }}
                  className="font-semibold text-copper-500 hover:text-copper-400"
                >
                  Create one now
                </button>
              </>
            ) : (
              <>
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => { setMode('login'); setError(''); }}
                  className="font-semibold text-copper-500 hover:text-copper-400"
                >
                  Sign In
                </button>
              </>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default AuthModal;

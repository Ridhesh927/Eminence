import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { ArrowRight, Phone, Mail, Lock, ShieldAlert, Eye, EyeOff, KeyRound, CheckCircle, AlertCircle, X } from 'lucide-react';
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

const Login = () => {
  const [identifier, setIdentifier] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showAdminPassword, setShowAdminPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({ email: '', password: '' });
  const [activeTab, setActiveTab] = useState('customer'); // 'customer', 'driver', 'admin'
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from;
  const dispatch = useDispatch();
  const { isAuthenticated, user } = useSelector((state) => state.auth);

  // Forgot Password Modal State
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotStep, setForgotStep] = useState(1); // 1: Request OTP, 2: Verify & Reset
  const [forgotMethod, setForgotMethod] = useState('email'); // 'email' or 'phone'
  const [forgotIdentifier, setForgotIdentifier] = useState('');
  const [forgotOtp, setForgotOtp] = useState('');
  const [forgotNewPassword, setForgotNewPassword] = useState('');
  const [forgotConfirmPassword, setForgotConfirmPassword] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotError, setForgotError] = useState('');
  const [forgotSuccess, setForgotSuccess] = useState('');

  const handleRequestForgotOtp = async (e) => {
    e.preventDefault();
    if (!forgotIdentifier) {
      setForgotError(`Please enter your registered ${forgotMethod}`);
      return;
    }
    setForgotLoading(true);
    setForgotError('');
    setForgotSuccess('');
    try {
      const res = await api.post('/api/auth/forgot-password', {
        identifier: forgotIdentifier,
        method: forgotMethod,
        role: activeTab
      });
      setForgotLoading(false);
      setForgotSuccess(res.data?.message || 'OTP sent successfully!');
      setForgotStep(2);
    } catch (err) {
      setForgotLoading(false);
      setForgotError(err.response?.data?.message || 'Failed to send OTP. Please try again.');
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!forgotOtp || !forgotNewPassword) {
      setForgotError('OTP and new password are required');
      return;
    }
    if (forgotNewPassword.length < 6) {
      setForgotError('New password must be at least 6 characters long');
      return;
    }
    if (forgotNewPassword !== forgotConfirmPassword) {
      setForgotError('New passwords do not match');
      return;
    }
    setForgotLoading(true);
    setForgotError('');
    setForgotSuccess('');
    try {
      const res = await api.post('/api/auth/reset-password', {
        identifier: forgotIdentifier,
        method: forgotMethod,
        code: forgotOtp,
        newPassword: forgotNewPassword,
        role: activeTab
      });
      setForgotLoading(false);
      setForgotSuccess(res.data?.message || 'Password reset successfully! You can now log in.');
      setTimeout(() => {
        setShowForgotModal(false);
        setForgotStep(1);
        setForgotOtp('');
        setForgotNewPassword('');
        setForgotConfirmPassword('');
        setForgotSuccess('');
      }, 2000);
    } catch (err) {
      setForgotLoading(false);
      setForgotError(err.response?.data?.message || 'Failed to reset password. Please check OTP code.');
    }
  };

  useEffect(() => {
    if (isAuthenticated && user) {
      if (from) {
        navigate(from, { state: location.state, replace: true });
      } else {
        navigate(`/${user.role || 'customer'}/dashboard`);
      }
    }
  }, [isAuthenticated, user, navigate, from, location.state]);

  const isAdmin = activeTab === 'admin';

  const handleEmailLogin = async (e) => {
    e.preventDefault();
    if (!identifier || !password) return;
    setIsLoading(true);
    setError('');
    setFieldErrors({ email: '', password: '' });
    try {
      const response = await api.post('/api/auth/login', { identifier, password, role: activeTab });
      const data = response.data;
      setIsLoading(false);
      if (data.success) {
        dispatch(loginSuccess({
          ...data.user,
          token: data.token
        }));
        const targetRoute = from || (data.user.role === 'admin' 
          ? '/admin/dashboard' 
          : data.user.role === 'driver' 
            ? '/driver/dashboard' 
            : '/customer/dashboard');
        navigate(targetRoute, { state: location.state, replace: true });
      }
    } catch (err) {
      console.error('Login error:', err);
      setIsLoading(false);
      if (err.response && err.response.data) {
        const data = err.response.data;
        if (data.field) {
          setFieldErrors((prev) => ({ ...prev, [data.field]: data.message }));
        } else {
          setError(data.message || 'Invalid credentials');
        }
      } else {
        setError('Server error. Please try again later.');
      }
    }
  };

  const handleAdminLogin = async (e) => {
    e.preventDefault();
    if (!email || !password) return;
    setIsLoading(true);
    setError('');
    setFieldErrors({ email: '', password: '' });
    try {
      const response = await api.post('/api/admin/login', { email, password });
      const data = response.data;
      setIsLoading(false);
      if (data.success) {
        dispatch(loginSuccess({
          ...data.user,
          token: data.token,
          isProfileComplete: true
        }));
      }
    } catch (err) {
      console.error('Admin login error:', err);
      setIsLoading(false);
      if (err.response && err.response.data) {
        const data = err.response.data;
        if (data.field) {
          setFieldErrors((prev) => ({ ...prev, [data.field]: data.message }));
        } else {
          setError(data.message || 'Invalid credentials');
        }
      } else {
        setError('Server error. Please try again later.');
      }
    }
  };


  const handleGoogleSignIn = async () => {
    try {
      setIsLoading(true);
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
        const targetRoute = from || (data.user.role === 'admin' 
          ? '/admin/dashboard' 
          : data.user.role === 'driver' 
            ? '/driver/dashboard' 
            : '/customer/dashboard');
        navigate(targetRoute, { state: location.state, replace: true });
      }
    } catch (err) {
      console.error('Google sign in error:', err);
      setIsLoading(false);
      if (err.response && err.response.data && err.response.data.message) {
        setError(err.response.data.message);
      } else {
        setError('Failed to sign in with Google. Please try again.');
      }
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 relative">
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
        <div className="flex bg-loft-950/50 p-1 rounded-xl mb-8 overflow-x-auto">
          {['customer', 'driver', 'admin'].map((role) => (
            <button
              key={role}
              onClick={() => { setActiveTab(role); setError(''); setFieldErrors({ email: '', password: '' }); }}
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all capitalize ${
                activeTab === role 
                  ? role === 'admin'
                    ? 'bg-moss-500/20 text-moss-400 shadow-sm border border-moss-500/30'
                    : 'bg-copper-500/20 text-copper-500 shadow-sm border border-copper-500/30'
                  : 'text-loft-400 hover:text-loft-200 hover:bg-loft-800/50'
              }`}
            >
              {role === 'admin' ? '🔐 Admin' : role.charAt(0).toUpperCase() + role.slice(1)}
            </button>
          ))}
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm text-center">
            {error}
          </div>
        )}

        <AnimatePresence mode="wait">
          {isAdmin ? (
            /* ── ADMIN: Email + Password ── */
            <motion.div
              key="admin-form"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
            >
              <div className="flex items-center justify-center mb-6 gap-2 text-moss-400">
                <ShieldAlert className="w-5 h-5" />
                <span className="text-sm font-medium">Authorized personnel only</span>
              </div>

              <form onSubmit={handleAdminLogin} className="space-y-5">
                <div>
                  <label htmlFor="admin-email" className="block text-sm font-medium text-loft-200 mb-2">Admin Email</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <Mail className="h-5 w-5 text-loft-400" />
                    </div>
                    <input
                      id="admin-email"
                      type="email"
                      required
                      autoComplete="email"
                      className={`input-field pl-12 ${fieldErrors.email ? 'border-red-500 ring-1 ring-red-500' : ''}`}
                      placeholder="admin@eminence.com"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        if (fieldErrors.email) setFieldErrors((prev) => ({ ...prev, email: '' }));
                      }}
                    />
                  </div>
                  {fieldErrors.email && (
                    <p className="mt-2 text-sm text-red-500 flex items-center">
                      <span className="mr-1">❌</span> {fieldErrors.email}
                    </p>
                  )}
                </div>

                <div>
                  <label htmlFor="admin-password" className="block text-sm font-medium text-loft-200 mb-2">Password</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <Lock className="h-5 w-5 text-loft-400" />
                    </div>
                    <input
                      id="admin-password"
                      type={showAdminPassword ? "text" : "password"}
                      required
                      autoComplete="current-password"
                      className={`input-field pl-12 pr-12 ${fieldErrors.password ? 'border-red-500 ring-1 ring-red-500' : ''}`}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        if (fieldErrors.password) setFieldErrors((prev) => ({ ...prev, password: '' }));
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowAdminPassword(!showAdminPassword)}
                      className="absolute inset-y-0 right-0 pr-4 flex items-center text-loft-400 hover:text-loft-200"
                    >
                      {showAdminPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                  {fieldErrors.password && (
                    <p className="mt-2 text-sm text-red-500 flex items-center">
                      <span className="mr-1">❌</span> {fieldErrors.password}
                    </p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={isLoading || !email || !password}
                  className="w-full flex items-center justify-center px-6 py-3.5 rounded-xl text-base font-medium text-white bg-moss-600 hover:bg-moss-500 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <span className="flex items-center">
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Authenticating...
                    </span>
                  ) : (
                    <span className="flex items-center">Secure Login <ArrowRight className="ml-2 w-5 h-5" /></span>
                  )}
                </button>


              </form>
            </motion.div>
          ) : (
            /* ── CUSTOMER / DRIVER: Phone + OTP ── */
            <motion.div
              key="phone-form"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
            >
              {activeTab === 'driver' ? (
                <div className="mb-6 p-4 rounded-xl bg-copper-500/10 border border-copper-500/20 text-center">
                  <p className="text-xs text-copper-300 font-medium">
                    🛡️ Fleet Driver Portal: Login with the registered phone/email and credentials assigned to you by your Administrator.
                  </p>
                </div>
              ) : (
                <>
                  <button 
                    onClick={handleGoogleSignIn}
                    disabled={isLoading}
                    className="w-full flex items-center justify-center px-4 py-3.5 border border-loft-700 hover:border-loft-600 rounded-xl bg-loft-800/50 hover:bg-loft-800 transition-all duration-200 text-loft-50 font-medium mb-6"
                  >
                    <GoogleIcon />
                    Continue with Google
                  </button>

                  <div className="relative mb-6">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-loft-800"></div>
                    </div>
                    <div className="relative flex justify-center text-sm">
                      <span className="px-4 bg-loft-900 text-loft-400">Or login with email, username, or phone</span>
                    </div>
                  </div>
                </>
              )}

              <form onSubmit={handleEmailLogin} className="space-y-6">
                <div>
                  <label htmlFor="identifier" className="block text-sm font-medium text-loft-200 mb-2">
                    {activeTab === 'driver' ? 'Driver Phone or Email' : 'Email / Username / Phone'}
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <Mail className="h-5 w-5 text-loft-400" />
                    </div>
                    <input
                      id="identifier"
                      name="identifier"
                      type="text"
                      required
                      className="input-field pl-12"
                      placeholder={activeTab === 'driver' ? '9876543210 or driver@eminence.com' : 'Enter your email, username, or phone'}
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label htmlFor="password" className="block text-sm font-medium text-loft-200">Password</label>
                    <button
                      type="button"
                      onClick={() => {
                        setShowForgotModal(true);
                        setForgotStep(1);
                        setForgotError('');
                        setForgotSuccess('');
                        setForgotIdentifier(identifier || '');
                      }}
                      className="text-xs text-copper-500 hover:text-copper-400 font-medium transition-colors"
                    >
                      Forgot password?
                    </button>
                  </div>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <Lock className="h-5 w-5 text-loft-400" />
                    </div>
                    <input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      required
                      autoComplete="current-password"
                      className="input-field pl-12 pr-12"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-4 flex items-center text-loft-400 hover:text-loft-200"
                    >
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading || !identifier || !password}
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
                    <span className="flex items-center">Login <ArrowRight className="ml-2 w-5 h-5" /></span>
                  )}
                </button>
              </form>

              {activeTab === 'driver' ? (
                <div className="mt-8 text-center text-xs text-loft-400">
                  Need driver access? Contact your Eminence fleet administrator to assign your account.
                </div>
              ) : (
                <div className="mt-8 text-center text-sm text-loft-300">
                  Don't have an account?{' '}
                  <Link to="/register" className="font-medium text-copper-500 hover:text-copper-400 transition-colors">
                    Sign up
                  </Link>
                </div>
              )}

            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Forgot Password Modal */}
      <AnimatePresence>
        {showForgotModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-loft-950/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="card w-full max-w-md p-6 sm:p-8 relative bg-loft-900 border border-loft-700 shadow-2xl"
            >
              <button
                onClick={() => setShowForgotModal(false)}
                className="absolute top-5 right-5 p-2 rounded-lg text-loft-400 hover:text-loft-100 hover:bg-loft-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="text-center mb-6">
                <div className="inline-flex p-3 rounded-full bg-copper-500/10 text-copper-500 mb-3">
                  <KeyRound className="w-6 h-6" />
                </div>
                <h3 className="text-2xl font-bold text-loft-50 mb-1">Reset Password</h3>
                <p className="text-xs text-loft-300">
                  {forgotStep === 1
                    ? 'Choose email or phone OTP verification to reset your password'
                    : `Enter the 6-digit OTP code sent to your ${forgotMethod}`}
                </p>
              </div>

              {forgotError && (
                <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg text-sm flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{forgotError}</span>
                </div>
              )}

              {forgotSuccess && (
                <div className="mb-4 p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-lg text-sm flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{forgotSuccess}</span>
                </div>
              )}

              {forgotStep === 1 ? (
                <form onSubmit={handleRequestForgotOtp} className="space-y-5">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-loft-400 mb-2">
                      Reset Via
                    </label>
                    <div className="grid grid-cols-2 gap-2 bg-loft-950/60 p-1 rounded-xl">
                      <button
                        type="button"
                        onClick={() => { setForgotMethod('email'); setForgotError(''); }}
                        className={`py-2 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-2 ${
                          forgotMethod === 'email'
                            ? 'bg-copper-500 text-white shadow-md'
                            : 'text-loft-400 hover:text-loft-200'
                        }`}
                      >
                        <Mail className="w-3.5 h-3.5" /> Email Address
                      </button>
                      <button
                        type="button"
                        onClick={() => { setForgotMethod('phone'); setForgotError(''); }}
                        className={`py-2 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-2 ${
                          forgotMethod === 'phone'
                            ? 'bg-copper-500 text-white shadow-md'
                            : 'text-loft-400 hover:text-loft-200'
                        }`}
                      >
                        <Phone className="w-3.5 h-3.5" /> Phone Number (OTP)
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-loft-200 mb-1">
                      {forgotMethod === 'email' ? 'Registered Email' : 'Registered Phone'}
                    </label>
                    <input
                      type={forgotMethod === 'email' ? 'email' : 'tel'}
                      required
                      placeholder={forgotMethod === 'email' ? 'yourname@example.com' : 'e.g. 9876543210'}
                      className="input-field"
                      value={forgotIdentifier}
                      onChange={(e) => setForgotIdentifier(e.target.value)}
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={forgotLoading || !forgotIdentifier}
                    className="btn-primary w-full py-3 text-sm disabled:opacity-50"
                  >
                    {forgotLoading ? 'Sending OTP...' : 'Send Verification OTP'}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleResetPassword} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-loft-200 mb-1">
                      Enter 6-Digit OTP
                    </label>
                    <input
                      type="text"
                      required
                      maxLength="6"
                      placeholder="123456"
                      className="input-field text-center font-mono tracking-widest text-lg"
                      value={forgotOtp}
                      onChange={(e) => setForgotOtp(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-loft-200 mb-1">
                      New Password
                    </label>
                    <input
                      type="password"
                      required
                      placeholder="At least 6 characters"
                      className="input-field"
                      value={forgotNewPassword}
                      onChange={(e) => setForgotNewPassword(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-loft-200 mb-1">
                      Confirm New Password
                    </label>
                    <input
                      type="password"
                      required
                      placeholder="Confirm password"
                      className="input-field"
                      value={forgotConfirmPassword}
                      onChange={(e) => setForgotConfirmPassword(e.target.value)}
                    />
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setForgotStep(1)}
                      className="btn-secondary w-1/3 py-2.5 text-xs"
                    >
                      Back
                    </button>
                    <button
                      type="submit"
                      disabled={forgotLoading || !forgotOtp || !forgotNewPassword}
                      className="btn-primary w-2/3 py-2.5 text-sm disabled:opacity-50"
                    >
                      {forgotLoading ? 'Resetting...' : 'Set New Password'}
                    </button>
                  </div>
                </form>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Login;

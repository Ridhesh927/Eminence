import { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { ArrowRight, Mail, Lock, ShieldAlert } from 'lucide-react';
import { loginSuccess } from '../redux/slices/authSlice';

const AdminLogin = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!email || !password) return;
    
    setIsLoading(true);
    setError('');
    
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      
      const data = await response.json();
      setIsLoading(false);
      
      if (data.success) {
        localStorage.setItem('token', data.token);
        dispatch(loginSuccess({
          id: data.user.id,
          email: data.user.email,
          name: data.user.name,
          role: data.user.role,
          token: data.token,
          isProfileComplete: true
        }));
        navigate('/admin/dashboard');
      } else {
        setError(data.message || 'Invalid credentials');
      }
    } catch (err) {
      console.error('Admin login error:', err);
      setIsLoading(false);
      setError('Server error. Please try again later.');
    }
  };

  return (
    <div className="min-h-[calc(100vh-5rem)] flex items-center justify-center pt-28 pb-16 px-4 sm:px-6 lg:px-8 relative bg-loft-950">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(16,185,129,0.05),transparent_50%)] pointer-events-none"></div>
      
      <motion.div 
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-md card p-8 md:p-10 relative z-10 border-t-4 border-t-moss-500"
      >
        <div className="mb-8 text-center flex flex-col items-center">
          <div className="w-16 h-16 rounded-full bg-moss-500/20 flex items-center justify-center mb-4 border border-moss-500/30">
             <ShieldAlert className="w-8 h-8 text-moss-500" />
          </div>
          <h2 className="text-3xl font-serif font-bold text-loft-50 mb-2">Secure Portal</h2>
          <p className="text-loft-300">Authorized personnel only</p>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-sm text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-loft-200 mb-2">
              Admin Email
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Mail className="h-5 w-5 text-loft-400" />
              </div>
              <input
                id="email"
                name="email"
                type="email"
                required
                className="input-field pl-12"
                placeholder="admin@eminence.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-loft-200 mb-2 flex justify-between">
              <span>Password</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Lock className="h-5 w-5 text-loft-400" />
              </div>
              <input
                id="password"
                name="password"
                type="password"
                required
                className="input-field pl-12"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading || !email || !password}
            className="w-full flex items-center justify-center px-6 py-3.5 border border-transparent rounded-xl shadow-lg text-base font-medium text-white bg-moss-600 hover:bg-moss-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-loft-950 focus:ring-moss-500 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
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
              <span className="flex items-center">
                Secure Login <ArrowRight className="ml-2 w-5 h-5" />
              </span>
            )}
          </button>

          <div className="text-center pt-2">
            <button
              type="button"
              onClick={() => {
                setEmail('admin@eminence.com');
                setPassword('adminpassword123');
              }}
              className="text-xs text-moss-400 hover:text-moss-300 underline"
            >
              Fill Demo Admin Credentials (admin@eminence.com)
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

export default AdminLogin;

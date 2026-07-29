import { useState } from 'react';
import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Phone } from 'lucide-react';
import { signInWithPopup } from 'firebase/auth';
import { auth, googleProvider } from '../../config/firebase';

const GoogleIcon = () => (
  <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
  </svg>
);

const Login = () => {
  const [phone, setPhone] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handlePhoneSubmit = (e) => {
    e.preventDefault();
    if (phone.length < 10) return;
    
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      navigate('/otp', { state: { phone } });
    }, 1000);
  };

  const handleGoogleSignIn = async () => {
    try {
      setIsLoading(true);
      const result = await signInWithPopup(auth, googleProvider);
      const token = await result.user.getIdToken();
      
      // TODO: Send this token to the backend `/api/auth/google` to verify and issue our custom JWT
      console.log("Firebase Google Token:", token);
      
      setIsLoading(false);
      // For now, mock navigation to dashboard
      navigate('/customer/dashboard');
    } catch (error) {
      console.error("Google Sign-In Error", error);
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <motion.div 
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-md card p-8 md:p-10"
      >
        <div className="mb-8">
          <h2 className="text-3xl font-serif font-bold text-accent mb-2">Welcome back</h2>
          <p className="text-secondary">Sign in to your Eminence account</p>
        </div>

        <button 
          onClick={handleGoogleSignIn}
          disabled={isLoading}
          className="w-full flex items-center justify-center px-4 py-3 border border-border rounded-xl bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-primary transition-all duration-200 shadow-sm font-medium text-accent mb-6"
        >
          <GoogleIcon />
          Sign in with Google
        </button>

        <div className="relative mb-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-border"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-white text-muted">Or continue with phone</span>
          </div>
        </div>

        <form onSubmit={handlePhoneSubmit} className="space-y-6">
          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-accent mb-2">
              Phone Number
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Phone className="h-5 w-5 text-muted" />
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
                Continue <ArrowRight className="ml-2 w-5 h-5" />
              </span>
            )}
          </button>
        </form>

        <div className="mt-8 text-center text-sm text-secondary">
          Don't have an account?{' '}
          <Link to="/register" className="font-medium text-primary hover:text-primary/80 transition-colors">
            Sign up
          </Link>
        </div>
      </motion.div>
    </div>
  );
};

export default Login;

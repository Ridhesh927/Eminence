import { useState } from 'react';
import { X } from 'lucide-react';
import { useSelector, useDispatch } from 'react-redux';
import axios from 'axios';
import { updateProfileSuccess } from '../../redux/slices/authSlice';
import { MapPin, Phone, Building2, Map, FileText, CheckCircle2, User, Mail } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const CompleteProfileModal = () => {
  const { user } = useSelector((state) => state.auth);
  const dispatch = useDispatch();

  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    address: user?.address || '',
    city: user?.city || '',
    state: user?.state || '',
    governmentId: user?.governmentId || ''
  });

  const [otpType, setOtpType] = useState(null); // 'phone'
  const [otpCode, setOtpCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [isClosed, setIsClosed] = useState(false);

  // If user is not logged in or already complete, don't render the modal
  if (!user || user.isProfileComplete) return null;

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');
    try {
      const token = localStorage.getItem('token');
      const res = await axios.post(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/auth/complete-profile`,
        formData,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      const updatedUser = res.data.user;
      dispatch(updateProfileSuccess(updatedUser));
      
      // If phone wasn't verified, ask for OTP now
      if (!updatedUser.isPhoneVerified && formData.phone) {
        await handleSendOtp('phone', true); // true = called internally, don't manage own loading
      } else if (!updatedUser.isEmailVerified && formData.email) {
        await handleSendOtp('email', true);
      } else if (updatedUser.isProfileComplete) {
        setMessage('Profile completed successfully!');
      } else {
        // Profile saved but nothing to verify — shouldn't happen but surface it
        setMessage('Profile saved. Please verify your phone or email to continue.');
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Error completing profile. Please try again.';
      console.error('Complete profile error:', err.response?.data || err);
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  // internal=true means the caller manages loading state
  const handleSendOtp = async (type, internal = false) => {
    if (!internal) setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/auth/send-otp`,
        { type },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setOtpType(type);
      setMessage(`OTP sent to your ${type}. Check your backend console for the code.`);
    } catch (err) {
      const msg = err.response?.data?.message || `Error sending ${type} OTP`;
      if (internal) throw err; // bubble up to handleSubmit's catch
      setError(msg);
    } finally {
      if (!internal) setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
      const res = await axios.post(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/auth/verify-otp`,
        { type: otpType, code: otpCode },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      dispatch(updateProfileSuccess(res.data.user));
      setOtpType(null);
      setOtpCode('');
      setMessage(`${otpType} verified successfully!`);
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid OTP');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden max-h-[90vh] flex flex-col relative"
        >
          {/* Close button removed to enforce profile completion */}
          <div className="bg-primary p-6 text-white text-center flex-shrink-0 pt-10">
            <h2 className="text-3xl font-serif font-bold mb-2">Complete Your Profile</h2>
            <p className="text-primary-foreground/90">
              We need a few more details to set up your account completely.
            </p>
          </div>

          <div className="p-6 md:p-8 overflow-y-auto flex-grow custom-scrollbar">
            {error && <div className="mb-6 p-4 bg-red-50 text-red-700 border-l-4 border-red-500 rounded-r-md font-medium">{error}</div>}
            {message && <div className="mb-6 p-4 bg-green-50 text-green-700 border-l-4 border-green-500 rounded-r-md font-medium">{message}</div>}

            {!otpType ? (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Name */}
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                      <User className="w-4 h-4 text-primary" />
                      Full Name
                    </label>
                    <input
                      type="text"
                      name="name"
                      required
                      value={formData.name}
                      onChange={handleChange}
                      placeholder="John Doe"
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 text-gray-900 bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none"
                    />
                  </div>

                  {/* Email */}
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                      <Mail className="w-4 h-4 text-primary" />
                      Email Address
                    </label>
                    <input
                      type="email"
                      name="email"
                      required
                      value={formData.email}
                      onChange={handleChange}
                      placeholder="john@example.com"
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 text-gray-900 bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Phone */}
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                      <Phone className="w-4 h-4 text-primary" />
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      name="phone"
                      required
                      value={formData.phone}
                      onChange={handleChange}
                      placeholder="e.g. +1234567890"
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 text-gray-900 bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none"
                    />
                  </div>

                  {/* Government ID */}
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                      <FileText className="w-4 h-4 text-primary" />
                      Government ID (e.g. Aadhar/SSN)
                    </label>
                    <input
                      type="text"
                      name="governmentId"
                      required
                      value={formData.governmentId}
                      onChange={handleChange}
                      placeholder="Enter ID Number"
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 text-gray-900 bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* City */}
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-primary" />
                      City
                    </label>
                    <input
                      type="text"
                      name="city"
                      required
                      value={formData.city}
                      onChange={handleChange}
                      placeholder="e.g. New York"
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 text-gray-900 bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none"
                    />
                  </div>

                  {/* State */}
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                      <Map className="w-4 h-4 text-primary" />
                      State
                    </label>
                    <input
                      type="text"
                      name="state"
                      required
                      value={formData.state}
                      onChange={handleChange}
                      placeholder="e.g. NY"
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 text-gray-900 bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none"
                    />
                  </div>
                </div>

                {/* Address */}
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-primary" />
                    Full Address
                  </label>
                  <textarea
                    name="address"
                    required
                    rows="3"
                    value={formData.address}
                    onChange={handleChange}
                    placeholder="Enter your complete street address"
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 text-gray-900 bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none resize-none"
                  ></textarea>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full btn-primary py-4 text-lg mt-4 shadow-lg hover:shadow-xl transition-all"
                >
                  {loading ? 'Saving...' : 'Save & Continue'}
                </button>
              </form>
            ) : (
              <div className="space-y-6 text-center py-8">
                <div className="w-16 h-16 bg-blue-50 text-primary rounded-full flex items-center justify-center mx-auto mb-4">
                  <Phone className="w-8 h-8" />
                </div>
                <h3 className="text-2xl font-bold text-gray-800">Verify Your Phone</h3>
                <p className="text-gray-500">We've sent a verification code to <br/><span className="font-semibold text-gray-800">{formData.phone}</span></p>
                
                <div className="max-w-xs mx-auto space-y-4 pt-4">
                  <input
                    type="text"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value)}
                    placeholder="Enter 6-digit OTP"
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 text-gray-900 bg-white text-center text-xl tracking-widest focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none"
                    maxLength="6"
                  />
                  
                  <button
                    onClick={handleVerifyOtp}
                    disabled={loading || otpCode.length < 6}
                    className="w-full btn-primary py-3 shadow-md flex justify-center items-center gap-2"
                  >
                    <CheckCircle2 className="w-5 h-5" />
                    Verify & Complete
                  </button>
                  
                  <button
                    onClick={() => setOtpType(null)}
                    disabled={loading}
                    className="w-full px-4 py-3 text-sm font-medium text-gray-500 hover:text-gray-800 transition-colors"
                  >
                    Go Back
                  </button>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

export default CompleteProfileModal;

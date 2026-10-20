import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { useSelector, useDispatch } from 'react-redux';
import api from '../../services/api';
import { updateProfileSuccess } from '../../redux/slices/authSlice';
import { MapPin, Phone, Building2, Map, CheckCircle2, User, Mail, LocateFixed, Loader2, Lock, Eye, EyeOff, Gift } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import TermsModal from '../Common/TermsModal';


const CompleteProfileModal = () => {
  const { user } = useSelector((state) => state.auth);
  const dispatch = useDispatch();

  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    password: '',
    address: user?.address || '',
    city: user?.city || '',
    state: user?.state || '',
    referralCode: ''
  });

  const isEmailLocked = Boolean(user?.googleId || user?.isEmailVerified || (user?.email && user.email.includes('@gmail.com')));
  const isPhoneLocked = Boolean(user?.isPhoneVerified);

  const [termsAccepted, setTermsAccepted] = useState(Boolean(user?.termsAccepted));
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [otpType, setOtpType] = useState(null); // 'phone'
  const [otpCode, setOtpCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const dismissKey = user?.id ? `profile_modal_dismissed_${user.id}` : 'profile_modal_dismissed';
  const [isClosed, setIsClosed] = useState(() => {
    try {
      return sessionStorage.getItem(dismissKey) === 'true';
    } catch (_e) {
      return false;
    }
  });

  const handleDismiss = () => {
    setIsClosed(true);
    try {
      sessionStorage.setItem(dismissKey, 'true');
    } catch (_e) {}
  };
  const [otpCooldown, setOtpCooldown] = useState(0);
  const [detectingLocation, setDetectingLocation] = useState(false);

  useEffect(() => {
    if (otpCooldown > 0) {
      const timer = setTimeout(() => setOtpCooldown(c => c - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [otpCooldown]);

  useEffect(() => {
    if (user) {
      setFormData(prev => ({
        ...prev,
        name: user.name || prev.name,
        email: user.email || prev.email,
        phone: user.phone || prev.phone,
        address: user.address || prev.address,
        city: user.city || prev.city,
        state: user.state || prev.state
      }));
      if (user.termsAccepted) {
        setTermsAccepted(true);
      }
    }
  }, [user]);

  // If user is not logged in or already complete, or modal is dismissed, don't render
  if (!user || user.role !== 'customer' || user.isProfileComplete || isClosed) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === 'phone') {
      // Disallow letters/symbols: only allow digits, spaces, plus sign and hyphens
      const filtered = value.replace(/[^\d+ -]/g, '');
      setFormData({ ...formData, phone: filtered });
      return;
    }
    if (name === 'referralCode') {
      setFormData({ ...formData, referralCode: value.toUpperCase() });
      return;
    }
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');
    try {
      if (formData.phone) {
        const rawPhone = String(formData.phone).trim();
        if (rawPhone.includes('@')) {
          setError('Phone number cannot be an email address.');
          setLoading(false);
          return;
        }
        const cleanPhone = rawPhone.replace(/^(\+91|91)/, '').replace(/\D/g, '');
        if (!/^[6-9]\d{9}$/.test(cleanPhone)) {
          setError('Please enter a valid 10-digit Indian mobile number (e.g. 9876543210).');
          setLoading(false);
          return;
        }
      }

      if (termsAccepted && !user?.termsAccepted) {
        try {
          await api.post('/api/auth/accept-terms', { version: 'v1.0' });
        } catch (e) {
          console.warn('Accept terms in profile completion note:', e.message);
        }
      }

      const cleanPhone = formData.phone ? formData.phone.trim().replace(/^(\+91|91)/, '').replace(/\D/g, '') : formData.phone;
      const payload = { 
        ...formData, 
        phone: cleanPhone,
        referralCode: formData.referralCode?.trim() || undefined
      };

      const res = await api.post('/api/auth/complete-profile', payload);
      
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
    if (otpCooldown > 0 && !internal) return;
    if (!internal) setLoading(true);
    setError('');
    try {
      await api.post('/api/auth/send-otp', { type });
      setOtpType(type);
      setOtpCooldown(60);
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
    if (!otpType) {
      setError('Select an OTP verification method.');
      return;
    }

    const code = otpCode.trim();

    if (!/^\d{6}$/.test(code)) {
      setError('Enter a valid 6-digit OTP.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const res = await api.post('/api/auth/verify-otp', { type: otpType, code });
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

  const handleDetectLocation = () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser');
      return;
    }

    setDetectingLocation(true);
    setError('');
    
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          // Use OpenStreetMap Nominatim for free reverse geocoding
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
          const data = await res.json();
          
          if (data && data.address) {
            setFormData(prev => ({
              ...prev,
              city: data.address.city || data.address.town || data.address.village || data.address.county || '',
              state: data.address.state || '',
              address: data.display_name || ''
            }));
            setMessage('Location detected successfully!');
          }
        } catch (err) {
          setError('Failed to fetch location details.');
        } finally {
          setDetectingLocation(false);
        }
      },
      (err) => {
        setError('Failed to detect location. Please ensure location permissions are granted.');
        setDetectingLocation(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4">
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="bg-loft-900 border border-loft-700/60 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden max-h-[90vh] flex flex-col relative text-loft-50"
        >
          <button 
            onClick={handleDismiss}
            className="absolute top-4 right-4 z-10 p-2 text-loft-400 hover:text-loft-50 bg-loft-950/40 hover:bg-loft-950/70 rounded-full transition-colors border border-loft-700/50"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="bg-gradient-to-r from-copper-600 to-copper-500 p-6 text-white text-center flex-shrink-0 pt-8 relative">
            <h2 className="text-2xl md:text-3xl font-serif font-bold mb-1 tracking-tight">Complete Your Profile</h2>
            <p className="text-white/80 text-sm">
              Add your delivery address and details to complete your account setup.
            </p>
          </div>

          <div className="p-6 md:p-8 overflow-y-auto flex-grow custom-scrollbar">
            {error && <div className="mb-6 p-4 bg-red-500/10 text-red-400 border border-red-500/20 rounded-xl font-medium text-sm">{error}</div>}
            {message && <div className="mb-6 p-4 bg-moss-500/10 text-moss-400 border border-moss-500/20 rounded-xl font-medium text-sm">{message}</div>}

            {!otpType ? (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Name */}
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-loft-200 flex items-center gap-2">
                      <User className="w-4 h-4 text-copper-400" />
                      Full Name
                    </label>
                    <input
                      type="text"
                      name="name"
                      required
                      value={formData.name}
                      onChange={handleChange}
                      placeholder="John Doe"
                      className="input-field"
                    />
                  </div>

                  {/* Email */}
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-loft-200 flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <Mail className="w-4 h-4 text-copper-400" />
                        Email Address
                      </span>
                      {isEmailLocked && (
                        <span className="text-xs font-medium text-moss-400 bg-moss-500/10 px-2 py-0.5 rounded-full border border-moss-500/20">
                          Verified (Locked)
                        </span>
                      )}
                    </label>
                    <input
                      type="email"
                      name="email"
                      required
                      value={formData.email}
                      onChange={handleChange}
                      readOnly={isEmailLocked}
                      disabled={isEmailLocked}
                      placeholder="john@example.com"
                      className={`input-field ${
                        isEmailLocked 
                          ? 'opacity-60 cursor-not-allowed bg-loft-950/80 border-loft-800 select-none' 
                          : ''
                      }`}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Phone */}
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-loft-200 flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <Phone className="w-4 h-4 text-copper-400" />
                        Phone Number
                      </span>
                      {isPhoneLocked && (
                        <span className="text-xs font-medium text-moss-400 bg-moss-500/10 px-2 py-0.5 rounded-full border border-moss-500/20">
                          Verified (Locked)
                        </span>
                      )}
                    </label>
                    <input
                      type="tel"
                      name="phone"
                      required
                      value={formData.phone}
                      onChange={handleChange}
                      readOnly={isPhoneLocked}
                      disabled={isPhoneLocked}
                      placeholder="e.g. 9876543210"
                      pattern="^[0-9+ -]{10,15}$"
                      title="Enter a valid 10-digit mobile number"
                      maxLength="15"
                      className={`input-field ${
                        isPhoneLocked 
                          ? 'opacity-60 cursor-not-allowed bg-loft-950/80 border-loft-800 select-none' 
                          : ''
                      }`}
                    />
                  </div>

                  {/* Account Password Field */}
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-loft-200 flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <Lock className="w-4 h-4 text-copper-400" />
                        Account Password
                      </span>
                      <span className="text-xs text-loft-400 font-normal">
                        Direct login password
                      </span>
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        name="password"
                        value={formData.password}
                        onChange={handleChange}
                        placeholder="Create a password (min 6 chars)"
                        className="input-field pr-11"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-loft-400 hover:text-loft-200 focus:outline-none p-1"
                        aria-label={showPassword ? "Hide password" : "Show password"}
                      >
                        {showPassword ? (
                          <EyeOff className="w-5 h-5" />
                        ) : (
                          <Eye className="w-5 h-5" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Address Section Header with Detect Button */}
                <div className="flex items-center justify-between mt-2 mb-1">
                  <h3 className="text-sm font-bold text-loft-200 uppercase tracking-wider">Location Details</h3>
                  <button
                    type="button"
                    onClick={handleDetectLocation}
                    disabled={detectingLocation}
                    className="flex items-center gap-1.5 text-xs font-semibold text-copper-400 hover:text-copper-300 transition-colors bg-copper-500/10 hover:bg-copper-500/20 px-3 py-1.5 rounded-full border border-copper-500/30"
                  >
                    {detectingLocation ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <LocateFixed className="w-3.5 h-3.5" />}
                    {detectingLocation ? 'Detecting...' : 'Detect Current Location'}
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* City */}
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-loft-200 flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-copper-400" />
                      City
                    </label>
                    <input
                      type="text"
                      name="city"
                      required
                      value={formData.city}
                      onChange={handleChange}
                      placeholder="e.g. Pune"
                      className="input-field"
                    />
                  </div>

                  {/* State */}
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-loft-200 flex items-center gap-2">
                      <Map className="w-4 h-4 text-copper-400" />
                      State
                    </label>
                    <input
                      type="text"
                      name="state"
                      required
                      value={formData.state}
                      onChange={handleChange}
                      placeholder="e.g. Maharashtra"
                      className="input-field"
                    />
                  </div>
                </div>

                {/* Address */}
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-loft-200 flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-copper-400" />
                    Full Address
                  </label>
                  <textarea
                    name="address"
                    required
                    rows="3"
                    value={formData.address}
                    onChange={handleChange}
                    placeholder="Enter your complete street address"
                    className="input-field resize-none"
                  ></textarea>
                </div>

                {/* Referral Code (Optional) */}
                {!user?.referredBy ? (
                  <div className="space-y-2 p-4 bg-loft-950/60 rounded-xl border border-copper-500/30">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-semibold text-loft-100 flex items-center gap-2">
                        <Gift className="w-4 h-4 text-copper-400" />
                        Referral Code (Optional)
                      </label>
                      <span className="text-xs font-semibold text-copper-400 bg-copper-500/10 px-2.5 py-0.5 rounded-full border border-copper-500/20">
                        🎁 Get ₹100 Welcome Bonus
                      </span>
                    </div>
                    <input
                      type="text"
                      name="referralCode"
                      value={formData.referralCode}
                      onChange={handleChange}
                      placeholder="e.g. EMINENCE-AB12CD"
                      className="input-field uppercase font-mono tracking-wider placeholder:normal-case placeholder:font-sans"
                    />
                    <p className="text-xs text-loft-400">
                      Have a friend's referral code? Apply it here to get ₹100 credited directly to your wallet.
                    </p>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-xs font-medium text-moss-400 bg-moss-500/10 px-3.5 py-2.5 rounded-xl border border-moss-500/20">
                    <CheckCircle2 className="w-4 h-4 text-moss-400 flex-shrink-0" />
                    <span>Referral bonus applied with code: <strong>{user.referredBy}</strong></span>
                  </div>
                )}

                {/* Terms Acceptance if not already accepted */}
                {!user?.termsAccepted && (
                  <div className="flex items-start gap-3 p-3 bg-loft-950/40 rounded-xl border border-loft-800">
                    <input
                      id="profile-terms"
                      type="checkbox"
                      checked={termsAccepted}
                      onChange={(e) => setTermsAccepted(e.target.checked)}
                      className="mt-1 h-4 w-4 rounded border-loft-700 bg-loft-950 text-copper-500 focus:ring-copper-500 cursor-pointer"
                    />
                    <label htmlFor="profile-terms" className="text-xs text-loft-300 leading-relaxed cursor-pointer select-none">
                      I accept the{' '}
                      <button
                        type="button"
                        onClick={() => setShowTermsModal(true)}
                        className="text-copper-400 font-semibold underline underline-offset-2 hover:text-copper-300"
                      >
                        Terms & Conditions
                      </button>{' '}
                      and consent to digital freight documentation & tracking.
                    </label>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading || (!user?.termsAccepted && !termsAccepted)}
                  className="w-full btn-primary py-3.5 text-base shadow-lg transition-all"
                >
                  {loading ? 'Saving...' : 'Save & Continue'}
                </button>
              </form>
            ) : (
              <div className="space-y-6 text-center py-6">
                <div className="w-16 h-16 bg-copper-500/10 text-copper-400 rounded-full flex items-center justify-center mx-auto mb-4 border border-copper-500/20">
                  <Phone className="w-8 h-8" />
                </div>
                <h3 className="text-2xl font-serif font-bold text-loft-50">Verify Your Phone</h3>
                <p className="text-loft-300 text-sm">We've sent a verification code to <br/><span className="font-semibold text-loft-100">{formData.phone}</span></p>
                
                <div className="max-w-xs mx-auto space-y-4 pt-2">
                  <input
                    type="text"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value)}
                    placeholder="Enter 6-digit OTP"
                    className="input-field text-center text-xl tracking-widest font-mono"
                    maxLength="6"
                  />
                  
                  <button
                    onClick={handleVerifyOtp}
                    disabled={loading || otpCode.length < 6}
                    className="w-full btn-primary py-3 flex justify-center items-center gap-2"
                  >
                    <CheckCircle2 className="w-5 h-5" />
                    Verify & Complete
                  </button>
                  
                  <button
                    onClick={() => setOtpType(null)}
                    disabled={loading}
                    className="w-full py-2.5 text-sm font-medium text-loft-400 hover:text-loft-200 transition-colors"
                  >
                    Go Back
                  </button>
                </div>
              </div>
            )}
          </div>
        </motion.div>

        <TermsModal
          isOpen={showTermsModal}
          onClose={() => setShowTermsModal(false)}
          onAccept={() => setTermsAccepted(true)}
        />
      </AnimatePresence>
    </div>
  );
};

export default CompleteProfileModal;

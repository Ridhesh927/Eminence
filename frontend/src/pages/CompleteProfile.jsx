import { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { updateProfileSuccess } from '../redux/slices/authSlice';
import MapPicker from '../components/MapPicker';
import { Upload, Scan, CheckCircle, Gift } from 'lucide-react';


const CompleteProfile = () => {
  const { user } = useSelector((state) => state.auth);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [location, setLocation] = useState(user?.location || null);
  const [referralCode, setReferralCode] = useState('');
  const [otpType, setOtpType] = useState(null); // 'email' or 'phone'
  const [otpCode, setOtpCode] = useState('');
  const [otpCooldown, setOtpCooldown] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (otpCooldown <= 0) return;
    const interval = setInterval(() => {
      setOtpCooldown(prev => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [otpCooldown]);

  // OCR Verification State
  const [documentFile, setDocumentFile] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState(null);

  const handleDocumentUpload = async (e) => {
    const file = e.target.files?.[0];

    if (!file) return;

    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'application/pdf',
    ];

    if (!allowedTypes.includes(file.type)) {
      setError('Unsupported document format.');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('Document must be smaller than 5 MB.');
      return;
    }

    setDocumentFile(file);
    const formData = new FormData();
    formData.append('document', file);

    setIsScanning(true);
    setScanResult(null);

    try {
      const response = await api.post(
        '/api/verification/documents',
        formData
      );

      setScanResult(response.data);
      setMessage('Document successfully verified via API.');
    } catch {
      setError('Document verification failed.');
    } finally {
      setIsScanning(false);
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      if (phone) {
        const rawPhone = String(phone).trim();
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

      const cleanPhone = phone ? phone.trim().replace(/^(\+91|91)/, '').replace(/\D/g, '') : phone;
      const res = await api.post('/api/auth/complete-profile', { 
        name, 
        phone: cleanPhone, 
        location,
        referralCode: referralCode.trim() || undefined 
      });
      dispatch(updateProfileSuccess(res.data.user));
      setMessage('Profile updated successfully!');
      navigate(`/${res.data.user?.role || user?.role || 'customer'}/dashboard`);
    } catch (err) {
      setError(err.response?.data?.message || 'Error updating profile');
    } finally {
      setLoading(false);
    }
  };

  const handleSendOtp = async (type) => {
    if (otpCooldown > 0) return;
    setLoading(true);
    setError('');
    setMessage('');
    try {
      await api.post('/api/auth/send-otp', { type });
      setOtpType(type);
      setOtpCooldown(60);
      setMessage(`OTP sent to your ${type}`);
    } catch (err) {
      setError(err.response?.data?.message || `Error sending ${type} OTP`);
    } finally {
      setLoading(false);
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
      const res = await api.post(
        '/api/auth/verify-otp',
        { type: otpType, code: otpCode }
      );
      dispatch(updateProfileSuccess(res.data.user));
      setOtpType(null);
      setOtpCode('');
      setMessage(`${otpType} verified!`);
      navigate(`/${res.data.user?.role || user?.role || 'customer'}/dashboard`);
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid OTP');
    } finally {
      setLoading(false);
    }
  };

  if (!user) return <div>Loading...</div>;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="max-w-md w-full bg-white p-8 rounded-lg shadow-md">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-gray-800">Complete Your Profile</h2>
          <button 
            type="button" 
            onClick={() => navigate(`/${user?.role || 'customer'}/dashboard`)}
            className="text-xs font-semibold text-copper-600 hover:text-copper-700 bg-copper-50 hover:bg-copper-100 px-3 py-1.5 rounded-full transition-colors"
          >
            Skip to Dashboard →
          </button>
        </div>
        <p className="text-xs text-gray-500 mb-6">Optional: Add your location and details or continue straight to your dashboard.</p>
        
        {error && <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">{error}</div>}
        {message && <div className="mb-4 p-3 bg-green-100 text-green-700 rounded">{message}</div>}

        <form onSubmit={handleUpdate} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Indian Mobile Number (+91)</label>
            <div className="relative flex mt-1">
              <div className="flex items-center px-3 rounded-l-md bg-gray-100 border border-r-0 border-gray-300 text-gray-600 text-sm font-medium">
                🇮🇳 +91
              </div>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                className="block w-full rounded-r-md border-gray-300 shadow-sm p-2 border"
                placeholder="10-digit mobile (e.g. 9876543210)"
                maxLength="10"
                required
              />
            </div>
            {phone && phone.length > 0 && !/^[6-9]/.test(phone) && (
              <p className="text-xs text-amber-600 mt-1">Indian mobile numbers must start with 6, 7, 8, or 9</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
            <MapPicker onLocationSelect={setLocation} />
            {location && (
              <p className="text-xs text-green-600 mt-1">
                Location selected: {location.lat.toFixed(4)}, {location.lng.toFixed(4)}
              </p>
            )}
          </div>

          {/* Referral Code (Optional) */}
          {!user?.referredBy ? (
            <div className="bg-orange-50/60 p-3.5 rounded-lg border border-orange-200">
              <div className="flex items-center justify-between mb-1">
                <label className="block text-sm font-semibold text-gray-800 flex items-center gap-1.5">
                  <Gift className="w-4 h-4 text-orange-600" /> Referral Code (Optional)
                </label>
                <span className="text-xs font-semibold text-orange-600 bg-orange-100 px-2 py-0.5 rounded-full border border-orange-200">
                  🎁 Get ₹100 Welcome Bonus
                </span>
              </div>
              <input
                type="text"
                value={referralCode}
                onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                placeholder="e.g. EMINENCE-AB12CD"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border uppercase font-mono tracking-wider placeholder:normal-case placeholder:font-sans"
              />
              <p className="text-xs text-gray-500 mt-1">Enter a friend's referral code to get ₹100 added directly to your wallet.</p>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-xs font-medium text-emerald-700 bg-emerald-50 px-3.5 py-2.5 rounded-lg border border-emerald-200">
              <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span>Referral bonus applied with code: <strong>{user.referredBy}</strong></span>
            </div>
          )}

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2 px-4 border border-transparent rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 font-medium"
            >
              Update Details
            </button>
            <button
              type="button"
              onClick={() => navigate(`/${user?.role || 'customer'}/dashboard`)}
              className="py-2 px-4 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-100 font-medium text-sm"
            >
              Skip
            </button>
          </div>
        </form>

        <div className="mt-8 space-y-4 border-t pt-6">
          <h3 className="text-lg font-semibold text-gray-800">Verification</h3>
          
          <div className="flex justify-between items-center bg-gray-50 p-3 rounded border">
            <span>Email: {user.email}</span>
            {user.isEmailVerified ? (
               <span className="text-green-600 font-semibold">Verified</span>
             ) : (
               <button 
                 onClick={() => handleSendOtp('email')} 
                 disabled={loading || otpCooldown > 0}
                 className="text-blue-600 underline text-sm disabled:text-gray-400"
               >
                 {otpCooldown > 0 ? `Resend in ${otpCooldown}s` : 'Verify'}
               </button>
             )}
           </div>

           <div className="flex justify-between items-center bg-gray-50 p-3 rounded border">
             <span>Phone: {user.phone || 'Not provided'}</span>
             {user.isPhoneVerified ? (
               <span className="text-green-600 font-semibold">Verified</span>
             ) : (
               <button 
                 onClick={() => handleSendOtp('phone')} 
                 disabled={!user.phone || loading || otpCooldown > 0}
                 className="text-blue-600 underline text-sm disabled:text-gray-400"
               >
                 {otpCooldown > 0 ? `Resend in ${otpCooldown}s` : 'Verify'}
               </button>
             )}
           </div>
        </div>

        {/* OCR Verification Section */}
        <div className="mt-8 space-y-4 border-t pt-6">
          <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
            <Scan className="w-5 h-5" /> Smart Document Verification
          </h3>
          <p className="text-sm text-gray-500 mb-4">Upload your License or Aadhar card for instant AI verification.</p>
          
          <div className="border-2 border-dashed border-blue-300 rounded-lg p-6 text-center bg-blue-50/50 relative overflow-hidden">
            {isScanning && (
              <div className="absolute inset-0 bg-blue-600/10 flex flex-col items-center justify-center backdrop-blur-sm z-10">
                <div className="w-full h-1 bg-blue-500 absolute top-0 animate-[scan_2s_ease-in-out_infinite]"></div>
                <Scan className="w-8 h-8 text-blue-600 animate-pulse mb-2" />
                <p className="text-blue-800 font-bold text-sm">Analyzing Document via AI...</p>
              </div>
            )}
            
            {!scanResult ? (
              <>
                <Upload className="w-10 h-10 text-blue-400 mx-auto mb-2" />
                <label className="cursor-pointer bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium inline-block transition-colors">
                  Select Document
                  <input type="file" className="hidden" onChange={handleDocumentUpload} accept="image/*,.pdf" />
                </label>
                {documentFile && <p className="text-xs text-gray-500 mt-2">{documentFile.name}</p>}
              </>
            ) : (
              <div className="text-left bg-white p-4 rounded-md shadow-sm border border-green-200">
                <div className="flex items-center gap-2 text-green-600 font-bold mb-3">
                  <CheckCircle className="w-5 h-5" /> Verified: {scanResult.type}
                </div>
                <div className="space-y-1 text-sm text-gray-700">
                  <p><span className="text-gray-500">Name:</span> {scanResult.extractedName}</p>
                  <p><span className="text-gray-500">ID Number:</span> {scanResult.idNumber}</p>
                  <p><span className="text-gray-500">Valid Till:</span> {scanResult.expiry}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {otpType && (
          <div className="mt-6 p-4 border rounded bg-blue-50">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Enter OTP sent to {otpType}
            </label>
            <input
              type="text"
              value={otpCode}
              onChange={(e) => setOtpCode(e.target.value)}
              className="block w-full rounded-md border-gray-300 shadow-sm p-2 border mb-3"
            />
            <div className="flex space-x-3">
              <button
                onClick={handleVerifyOtp}
                disabled={loading || !otpCode}
                className="flex-1 bg-green-600 text-white p-2 rounded hover:bg-green-700 disabled:opacity-50"
              >
                Submit OTP
              </button>
              <button
                onClick={() => setOtpType(null)}
                className="flex-1 bg-gray-300 text-gray-800 p-2 rounded hover:bg-gray-400"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CompleteProfile;

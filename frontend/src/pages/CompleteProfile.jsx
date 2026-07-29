import { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { updateProfileSuccess } from '../redux/slices/authSlice';

const CompleteProfile = () => {
  const { user } = useSelector((state) => state.auth);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [otpType, setOtpType] = useState(null); // 'email' or 'phone'
  const [otpCode, setOtpCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const handleUpdate = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('token'); // Assuming token is stored here
      const res = await axios.post(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/auth/complete-profile`,
        { name, phone },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      dispatch(updateProfileSuccess(res.data.user));
      setMessage('Profile updated. Please verify email and phone if required.');
      if (res.data.user.isProfileComplete) {
        navigate('/');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Error updating profile');
    } finally {
      setLoading(false);
    }
  };

  const handleSendOtp = async (type) => {
    setLoading(true);
    setError('');
    setMessage('');
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/auth/send-otp`,
        { type },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setOtpType(type);
      setMessage(`OTP sent to your ${type}`);
    } catch (err) {
      setError(err.response?.data?.message || `Error sending ${type} OTP`);
    } finally {
      setLoading(false);
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
      setMessage(`${otpType} verified!`);
      if (res.data.user.isProfileComplete) {
        navigate('/');
      }
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
        <h2 className="text-2xl font-bold mb-6 text-center text-gray-800">Complete Your Profile</h2>
        
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
            <label className="block text-sm font-medium text-gray-700">Phone</label>
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border"
              placeholder="+1234567890"
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
          >
            Update Details
          </button>
        </form>

        <div className="mt-8 space-y-4 border-t pt-6">
          <h3 className="text-lg font-semibold text-gray-800">Verification</h3>
          
          <div className="flex justify-between items-center bg-gray-50 p-3 rounded border">
            <span>Email: {user.email}</span>
            {user.isEmailVerified ? (
              <span className="text-green-600 font-semibold">Verified</span>
            ) : (
              <button onClick={() => handleSendOtp('email')} className="text-blue-600 underline text-sm">
                Verify
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
                disabled={!user.phone}
                className="text-blue-600 underline text-sm disabled:text-gray-400"
              >
                Verify
              </button>
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

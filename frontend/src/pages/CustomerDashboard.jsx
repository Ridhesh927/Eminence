import { useState, useEffect, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { 
  Package, CheckCircle, Wallet, MapPin, Plus, Gift, Copy, 
  Crown, Target, Star, Leaf, Truck, Bell, Check, AlertCircle, RefreshCw, Lock, Eye, EyeOff,
  CreditCard, X, ShieldCheck, FileText, Home, Headphones, User,
  Radio, Navigation, ArrowRight, Clock, Search, Activity, Phone
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../services/api';
import { updateProfileSuccess } from '../redux/slices/authSlice';
import ReviewModal from '../components/Customer/ReviewModal';
import CustomerSupportTab from '../components/Customer/CustomerSupportTab';
import { addressSchema, profileSchema } from '../utils/formSchemas';
import AutocompleteLocationInput from '../components/Customer/Booking/AutocompleteLocationInput';
import TripDetailsModal from '../components/Customer/TripDetailsModal';
import { getPunePincode } from '../utils/puneGeocoder';

const CustomerDashboard = ({ initialTab = 'history', autoOpenTopup = false }) => {
  const { user } = useSelector((state) => state.auth);
  const dispatch = useDispatch();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  const queryTab = searchParams.get('tab');
  const isWalletPath = location.pathname === '/wallet' || location.pathname.startsWith('/wallet/');
  const shouldOpenRefill = autoOpenTopup || isWalletPath || searchParams.get('refill') === 'true' || searchParams.get('topup') === 'true';
  const queryAmount = searchParams.get('amount');

  const getInitialActiveTab = () => {
    if (isWalletPath) return 'payments';
    if (queryTab === 'wallet' || queryTab === 'payments') return 'payments';
    if (queryTab) return queryTab;
    return initialTab;
  };

  const [activeTab, setActiveTab] = useState(getInitialActiveTab);
  const [isAddAddressOpen, setIsAddAddressOpen] = useState(false);
  const [walletData, setWalletData] = useState(null);
  const [copySuccess, setCopySuccess] = useState(false);
  const copyTimeoutRef = useRef(null);
  const hasAutoOpenedTopupRef = useRef(false);

  // Add Funds & Razorpay modal state
  const [showAddFundsModal, setShowAddFundsModal] = useState(false);
  const [topupAmount, setTopupAmount] = useState(() => {
    if (queryAmount && !isNaN(parseFloat(queryAmount)) && parseFloat(queryAmount) >= 10) {
      return String(Math.round(parseFloat(queryAmount)));
    }
    return '500';
  });
  const [isProcessingTopup, setIsProcessingTopup] = useState(false);
  const [topupError, setTopupError] = useState('');
  const [topupSuccess, setTopupSuccess] = useState('');
  const [isProcessingPro, setIsProcessingPro] = useState(false);
  const [proSuccess, setProSuccess] = useState('');

  // Live booking state
  const [bookings, setBookingsData] = useState([]);
  const [bookingsLoading, setBookingsLoading] = useState(false);
  const [trackingFilter, setTrackingFilter] = useState('all'); // 'all', 'active', 'completed'
  const [trackingSearch, setTrackingSearch] = useState('');
  const [copiedOtpId, setCopiedOtpId] = useState(null);

  const handleCopyOtp = (bookingId, otpCode) => {
    if (!otpCode) return;
    navigator.clipboard.writeText(otpCode);
    setCopiedOtpId(bookingId);
    setTimeout(() => {
      setCopiedOtpId(null);
    }, 2000);
  };

  const getBookingOtp = (b) => {
    if (b?.otp) return b.otp;
    if (!b?.id) return '4928';
    return String(Math.abs(String(b.id).split('').reduce((acc, char) => ((acc << 5) - acc) + char.charCodeAt(0), 0)) % 9000 + 1000);
  };

  const getTrackingStepIndex = (status) => {
    switch (status) {
      case 'pending': return 0;
      case 'driver_assigned': return 1;
      case 'arrived': return 2;
      case 'in_transit': return 3;
      case 'completed': return 4;
      default: return 0;
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'in_transit':
        return {
          label: 'In Transit',
          bg: 'bg-emerald-500/20',
          text: 'text-emerald-400',
          border: 'border-emerald-500/40',
          pulse: true,
        };
      case 'arrived':
        return {
          label: 'Driver Arrived',
          bg: 'bg-amber-500/20',
          text: 'text-amber-400',
          border: 'border-amber-500/40',
          pulse: true,
        };
      case 'driver_assigned':
        return {
          label: 'Driver Assigned',
          bg: 'bg-blue-500/20',
          text: 'text-blue-400',
          border: 'border-blue-500/40',
          pulse: false,
        };
      case 'pending':
        return {
          label: 'Searching Tempo',
          bg: 'bg-indigo-500/20',
          text: 'text-indigo-400',
          border: 'border-indigo-500/40',
          pulse: true,
        };
      case 'completed':
        return {
          label: 'Delivered',
          bg: 'bg-moss-500/20',
          text: 'text-moss-400',
          border: 'border-moss-500/40',
          pulse: false,
        };
      case 'cancelled':
        return {
          label: 'Cancelled',
          bg: 'bg-red-500/20',
          text: 'text-red-400',
          border: 'border-red-500/40',
          pulse: false,
        };
      default:
        return {
          label: status || 'Unknown',
          bg: 'bg-loft-800',
          text: 'text-loft-300',
          border: 'border-loft-700',
          pulse: false,
        };
    }
  };

  const activeBookings = bookings.filter(b => ['driver_assigned', 'arrived', 'in_transit', 'pending'].includes(b.status));
  const completedBookings = bookings.filter(b => b.status === 'completed');

  const filteredTrackingBookings = bookings.filter(b => {
    if (trackingFilter === 'active' && !['driver_assigned', 'arrived', 'in_transit', 'pending'].includes(b.status)) {
      return false;
    }
    if (trackingFilter === 'completed' && b.status !== 'completed') {
      return false;
    }
    if (trackingSearch.trim()) {
      const q = trackingSearch.toLowerCase().trim();
      const idMatch = (b.id || '').toLowerCase().includes(q);
      const pickupMatch = (b.pickupAddress || '').toLowerCase().includes(q);
      const dropMatch = (b.dropAddress || (Array.isArray(b.drops) ? b.drops.join(' ') : '') || '').toLowerCase().includes(q);
      const vehicleMatch = (b.tempoType || b.vehicle?.type || '').toLowerCase().includes(q);
      const driverMatch = (b.driver?.name || '').toLowerCase().includes(q);
      return idMatch || pickupMatch || dropMatch || vehicleMatch || driverMatch;
    }
    return true;
  });

  useEffect(() => {
    return () => {
      if (copyTimeoutRef.current) {
        clearTimeout(copyTimeoutRef.current);
      }
    };
  }, []);
  const isPro = Boolean(user?.isPro);
  const totalTrips = Math.max(
    bookings.filter(b => b.status === 'completed').length,
    user?.totalTrips || 0
  );
  const [downloadingInvoice, setDownloadingInvoice] = useState(null);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [reviewTrip, setReviewTrip] = useState(null);
  const [reviewedBookings, setReviewedBookings] = useState({});
  
  // Addresses State with explicit request tracking
  const [addressState, setAddressState] = useState({
    loading: false,
    error: null,
    data: []
  });
  const [addressFormError, setAddressFormError] = useState('');
  const [isSavingAddress, setIsSavingAddress] = useState(false);
  const [newAddress, setNewAddress] = useState({ label: '', street: '', city: 'Pune', postalCode: '' });

  // Wallet State with explicit request tracking
  const [_walletState, setWalletState] = useState({
    loading: false,
    error: null,
    data: null
  });

  // Profile State with explicit request tracking
  const [profileState, setProfileState] = useState({
    loading: false,
    error: null,
    success: false
  });
  const [profileForm, setProfileForm] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    city: user?.city || '',
    state: user?.state || '',
    address: user?.address || '',
  });

  // Password Change State
  const [passwordState, setPasswordState] = useState({
    loading: false,
    error: null,
    success: null
  });
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const fetchProfile = async () => {
    try {
      const res = await api.get('/api/auth/profile');
      if (res.data?.success && res.data?.user) {
        dispatch(updateProfileSuccess(res.data.user));
        setProfileForm({
          name: res.data.user.name || '',
          email: res.data.user.email || '',
          phone: res.data.user.phone || '',
          city: res.data.user.city || '',
          state: res.data.user.state || '',
          address: res.data.user.address || '',
        });
      }
    } catch (err) {
      console.warn('Silent profile fetch warning:', err.message);
    }
  };

  useEffect(() => {
    if (user) {
      setProfileForm({
        name: user?.name || '',
        email: user?.email || '',
        phone: user?.phone || '',
        city: user?.city || '',
        state: user?.state || '',
        address: user?.address || '',
      });
      fetchProfile();
    }
  }, [user?.id]);

  // Trip History State
  const [selectedTrip, setSelectedTrip] = useState(null);
  const [cancellingBookingId, setCancellingBookingId] = useState(null);
  const [cancelModalBooking, setCancelModalBooking] = useState(null);
  const [cancelReasonText, setCancelReasonText] = useState('');

  const handleCancelBooking = async (bookingId, reason) => {
    setCancellingBookingId(bookingId);
    try {
      const res = await api.post(`/api/bookings/${bookingId}/cancel`, {
        reason: reason || 'Cancelled by customer via dashboard'
      });
      if (res.data?.success) {
        await fetchBookings();
        await fetchWallet();
        setCancelModalBooking(null);
        setCancelReasonText('');
        if (selectedTrip && selectedTrip.id === bookingId) {
          setSelectedTrip(null);
        }
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to cancel booking. Please try again.');
    } finally {
      setCancellingBookingId(null);
    }
  };

  // Notifications State
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchNotifications = async () => {
    try {
      const res = await api.get('/api/notifications');
      setNotifications(res.data.notifications || []);
      setUnreadCount(res.data.unreadCount || 0);
    } catch (err) {
      console.error('Error fetching notifications:', err);
    }
  };

  const markAsRead = async (id) => {
    try {
      await api.put(`/api/notifications/${id}/read`);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error(err);
    }
  };

  const markAllRead = async () => {
    try {
      await api.put('/api/notifications/mark-all-read');
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchBookings = async () => {
    setBookingsLoading(true);
    try {
      const res = await api.get('/api/bookings');
      setBookingsData(res.data.bookings || []);
    } catch (err) {
      console.error('Error fetching bookings:', err);
    } finally {
      setBookingsLoading(false);
    }
  };

  // Synchronize tab and auto-open refill modal from route/params
  useEffect(() => {
    if (isWalletPath || queryTab === 'wallet' || queryTab === 'payments') {
      setActiveTab('payments');
    } else if (queryTab) {
      setActiveTab(queryTab);
    }

    if (shouldOpenRefill && !hasAutoOpenedTopupRef.current) {
      hasAutoOpenedTopupRef.current = true;
      if (queryAmount && !isNaN(parseFloat(queryAmount)) && parseFloat(queryAmount) >= 10) {
        setTopupAmount(String(Math.round(parseFloat(queryAmount))));
      }
      setTopupError('');
      setShowAddFundsModal(true);
    }
  }, [isWalletPath, queryTab, shouldOpenRefill, queryAmount]);

  useEffect(() => {
    console.log('CustomerDashboard useEffect running. user:', !!user, 'activeTab:', activeTab);
    if (user) {
      fetchWallet();
      fetchBookings();
    }
    if (activeTab === 'addresses' && user) {
      fetchAddresses();
    }
    if (activeTab === 'notifications' && user) {
      fetchNotifications();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, user]);

  const fetchAddresses = async () => {
    setAddressState(prev => ({ ...prev, loading: true, error: null }));
    try {
      const res = await api.get('/api/address');
      setAddressState({ loading: false, error: null, data: Array.isArray(res.data) ? res.data : [] });
    } catch (error) {
      console.error('Error fetching addresses:', error);
      setAddressState({ 
        loading: false, 
        error: error.response?.data?.message || 'Unable to load addresses. Please check your connection.', 
        data: [] 
      });
    }
  };

  const handleSaveAddress = async () => {
    setAddressFormError('');
    const resolvedPostal = newAddress.postalCode || getPunePincode(newAddress.street) || '411001';
    const addressToSave = {
      ...newAddress,
      city: 'Pune',
      postalCode: resolvedPostal
    };
    const validation = addressSchema.safeParse(addressToSave);
    if (!validation.success) {
      setAddressFormError(validation.error.issues[0]?.message || 'Please verify address fields');
      return;
    }
    setIsSavingAddress(true);
    try {
      const res = await api.post('/api/address', addressToSave);
      setAddressState(prev => ({ ...prev, data: [...(prev.data || []), res.data] }));
      setIsAddAddressOpen(false);
      setNewAddress({ label: '', street: '', city: 'Pune', postalCode: '' });
    } catch (error) {
      console.error('Error saving address:', error);
      setAddressFormError(error.response?.data?.message || 'Failed to save address.');
    } finally {
      setIsSavingAddress(false);
    }
  };

  const handleDeleteAddress = async (id) => {
    try {
      await api.delete(`/api/address/${id}`);
      setAddressState(prev => ({ ...prev, data: prev.data.filter(addr => addr.id !== id) }));
    } catch (error) {
      console.error('Error deleting address:', error);
      alert('Unable to delete address.');
    }
  };

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    setProfileState({ loading: true, error: null, success: false });
    const validation = profileSchema.safeParse(profileForm);
    if (!validation.success) {
      setProfileState({ 
        loading: false, 
        error: validation.error.issues[0]?.message || 'Please check profile fields', 
        success: false 
      });
      return;
    }
    try {
      const res = await api.post('/api/auth/complete-profile', profileForm);
      dispatch(updateProfileSuccess(res.data.user));
      setProfileState({ loading: false, error: null, success: true });
    } catch (error) {
      console.error('Error updating profile:', error);
      setProfileState({ 
        loading: false, 
        error: error.response?.data?.message || 'Error updating profile', 
        success: false 
      });
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setPasswordState({ loading: true, error: null, success: null });

    if (passwordForm.newPassword.length < 6) {
      setPasswordState({
        loading: false,
        error: 'New password must be at least 6 characters long',
        success: null
      });
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordState({
        loading: false,
        error: 'New passwords do not match',
        success: null
      });
      return;
    }

    try {
      const res = await api.post('/api/auth/change-password', {
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword
      });
      setPasswordState({
        loading: false,
        error: null,
        success: res.data?.message || 'Password changed successfully!'
      });
      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
    } catch (error) {
      console.error('Error changing password:', error);
      setPasswordState({
        loading: false,
        error: error.response?.data?.message || 'Failed to change password. Please check your current password.',
        success: null
      });
    }
  };

  const fetchWallet = async () => {
    setWalletState(prev => ({ ...prev, loading: true, error: null }));
    try {
      const res = await api.get('/api/wallet');
      setWalletData(res.data);
      setWalletState({ loading: false, error: null, data: res.data });
    } catch (error) {
      console.error('Error fetching wallet:', error);
      setWalletState({ 
        loading: false, 
        error: error.response?.data?.message || 'Unable to load wallet information.', 
        data: null 
      });
    }
  };

  const copyToClipboard = async () => {
    const code = walletData?.referralCode || user?.referralCode || 'EMN-DEMO-2026';
    if (code) {
      try {
        await navigator.clipboard.writeText(code);
        setCopySuccess(true);
        
        if (copyTimeoutRef.current) {
          clearTimeout(copyTimeoutRef.current);
        }
        
        copyTimeoutRef.current = setTimeout(() => {
          setCopySuccess(false);
        }, 2000);
      } catch (error) {
        console.error('Clipboard copy failed:', error);
      }
    }
  };

  const getDisplayBalance = () => {
    const raw = walletData?.wallet?.balance ?? walletData?.balance ?? 0;
    const num = parseFloat(raw);
    return isNaN(num) ? '0.00' : num.toFixed(2);
  };

  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      if (window.Razorpay) {
        resolve(true);
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handleTopup = async (e) => {
    if (e) e.preventDefault();
    const amountNum = parseFloat(topupAmount);
    if (!amountNum || isNaN(amountNum) || amountNum < 10) {
      setTopupError('Please enter a valid amount of at least ₹10');
      return;
    }
    if (amountNum > 100000) {
      setTopupError('Maximum single deposit is ₹1,00,000');
      return;
    }

    setTopupError('');
    setIsProcessingTopup(true);

    try {
      const isScriptLoaded = await loadRazorpayScript();
      if (!isScriptLoaded) {
        setTopupError('Razorpay payment gateway failed to load. Please check your internet connection.');
        setIsProcessingTopup(false);
        return;
      }

      const res = await api.post('/api/wallet/create-order', { amount: amountNum });
      const { order, keyId } = res.data;
      const razorpayKey = keyId || import.meta.env.VITE_RAZORPAY_KEY_ID;
      if (!razorpayKey) {
        setTopupError('Payment gateway is not configured. Please contact support.');
        setIsProcessingTopup(false);
        return;
      }

      const options = {
        key: razorpayKey,
        amount: order.amount,
        currency: order.currency || 'INR',
        name: 'Eminence Logistics',
        description: 'Wallet Balance Top-up',
        order_id: order.id,
        handler: async function (response) {
          try {
            await api.post('/api/wallet/verify-funds', {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              amount: amountNum
            });

            await fetchWallet();
            setShowAddFundsModal(false);
            setTopupSuccess(`₹${amountNum.toFixed(2)} added to your wallet successfully!`);
            setTimeout(() => setTopupSuccess(''), 6000);
          } catch (verifyErr) {
            console.error('Wallet Top-up Verification Error:', verifyErr);
            setTopupError(verifyErr.response?.data?.message || 'Payment verification failed. If deducted, funds will be refunded.');
          } finally {
            setIsProcessingTopup(false);
          }
        },
        prefill: {
          name: user?.name || '',
          email: user?.email || '',
          contact: user?.phone || '',
        },
        theme: {
          color: '#b87333'
        },
        modal: {
          ondismiss: function () {
            setIsProcessingTopup(false);
          }
        }
      };

      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', function (failRes) {
        console.error('Razorpay Payment Failed:', failRes.error);
        setTopupError(`Payment failed: ${failRes.error?.description || 'Transaction declined'}`);
        setIsProcessingTopup(false);
      });
      rzp.open();
    } catch (err) {
      console.error('Add Funds Order Error:', err);
      setTopupError(err.response?.data?.message || 'Failed to initiate payment. Please try again.');
      setIsProcessingTopup(false);
    }
  };

  const handleBuyPro = async () => {
    setIsProcessingPro(true);
    try {
      const isScriptLoaded = await loadRazorpayScript();
      if (!isScriptLoaded) {
        alert('Razorpay payment gateway failed to load. Please check your internet connection.');
        setIsProcessingPro(false);
        return;
      }

      const res = await api.post('/api/customer/pro/create-order');
      const { order, keyId } = res.data;
      const razorpayKey = keyId || import.meta.env.VITE_RAZORPAY_KEY_ID;
      if (!razorpayKey) {
        setTopupError('Payment gateway is not configured. Please contact support.');
        setIsProcessingPro(false);
        return;
      }

      const options = {
        key: razorpayKey,
        amount: order.amount,
        currency: order.currency || 'INR',
        name: 'Eminence Logistics',
        description: 'Eminence Pro Monthly Subscription (₹499/mo)',
        order_id: order.id,
        handler: async function (response) {
          try {
            const verifyRes = await api.post('/api/customer/pro/verify', {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature
            });

            if (verifyRes.data.success) {
              dispatch(updateProfileSuccess({ isPro: true }));
              setProSuccess('Welcome to Eminence Pro! Your exclusive perks are now active.');
              setTimeout(() => setProSuccess(''), 8000);
            }
          } catch (verifyErr) {
            console.error('Pro Subscription Verification Error:', verifyErr);
            alert(verifyErr.response?.data?.message || 'Payment verification failed. If deducted, please contact support.');
          } finally {
            setIsProcessingPro(false);
          }
        },
        prefill: {
          name: user?.name || '',
          email: user?.email || '',
          contact: user?.phone || '',
        },
        theme: {
          color: '#eab308'
        },
        modal: {
          ondismiss: function () {
            setIsProcessingPro(false);
          }
        }
      };

      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', function (failRes) {
        console.error('Razorpay Pro Payment Failed:', failRes.error);
        alert(`Payment failed: ${failRes.error?.description || 'Transaction declined'}`);
        setIsProcessingPro(false);
      });
      rzp.open();
    } catch (err) {
      console.error('Eminence Pro Order Error:', err);
      alert(err.response?.data?.message || 'Failed to initiate Pro upgrade. Please try again.');
      setIsProcessingPro(false);
    }
  };

  const handleDownloadInvoice = (id) => {
    console.log('Downloading invoice for id:', id);
    setDownloadingInvoice(id);
    setTimeout(() => {
      setDownloadingInvoice(null);
      
      const blob = new Blob(['Invoice Data'], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `INV-${id}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 500);
  };

  return (
    <div className="w-full pt-12 pb-24 relative min-h-[80vh]">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-[radial-gradient(ellipse_at_center,rgba(85,108,145,0.1),transparent_70%)] pointer-events-none z-0"></div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 flex flex-col md:flex-row gap-8">
        
        {/* Left Sidebar Navigation */}
        <div className="w-full md:w-64 flex-shrink-0">
          <div className="sticky top-28 bg-loft-900 border border-loft-800 rounded-2xl p-4">
            <div className="mb-6 px-4 py-2 border-b border-loft-800/80">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-loft-50 font-serif">Customer Hub</h2>
                {isPro && (
                  <span className="bg-gradient-to-r from-yellow-400 to-yellow-600 text-black text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 uppercase tracking-widest">
                    <Crown className="w-2.5 h-2.5" /> Pro
                  </span>
                )}
              </div>
              <p className="text-xs text-copper-400 font-bold uppercase tracking-wider mt-0.5">
                {isPro ? 'Pro Member' : 'Standard Account'}
              </p>
            </div>

            <nav className="space-y-1">
              {[
                { id: 'history', label: 'Bookings', icon: Package },
                { id: 'tracking', label: 'Live Tracking', icon: MapPin },
                { id: 'invoices', label: 'Invoices', icon: FileText },
                { id: 'addresses', label: 'Addresses', icon: Home },
                { id: 'payments', label: 'Wallet & Top-up', icon: Wallet },
                { id: 'rewards', label: 'Rewards & Refer', icon: Gift },
                { id: 'notifications', label: 'Notifications', icon: Bell, badge: unreadCount },
                { id: 'support', label: 'Support', icon: Headphones },
                { id: 'profile', label: 'Profile', icon: User },
              ].map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all text-sm font-medium cursor-pointer ${
                    activeTab === item.id
                      ? 'bg-copper-500 text-white shadow-lg shadow-copper-500/20'
                      : 'text-loft-300 hover:text-loft-50 hover:bg-loft-800'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <item.icon className="w-5 h-5 flex-shrink-0" />
                    <span>{item.label}</span>
                  </div>
                  {item.badge > 0 && (
                    <span className="flex h-5 min-w-[20px] px-1.5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                      {item.badge}
                    </span>
                  )}
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 min-w-0">
          {/* Header with prominent Book Tempo and Track Booking focus cards */}
          <div className="mb-8 flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6">
            <div>
              <h1 className="text-3xl md:text-4xl font-serif font-bold text-loft-50 mb-2 flex items-center gap-3">
                Dashboard
                {isPro && (
                  <span className="bg-gradient-to-r from-yellow-400 to-yellow-600 text-black text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1 uppercase tracking-widest">
                    <Crown className="w-3 h-3" /> Pro
                  </span>
                )}
              </h1>
              <p className="text-loft-300">Welcome back, <span className="text-copper-400 font-medium">{user?.name || 'User'}</span>!</p>
            </div>

            {/* Prominent Focal Actions: Book Tempo & Track Booking */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full xl:w-auto">
              <Link 
                to="/booking"
                className="group relative flex items-center justify-between gap-4 px-5 py-3.5 rounded-2xl bg-gradient-to-br from-copper-500/20 via-loft-900 to-loft-900 border border-copper-500/40 hover:border-copper-500 hover:shadow-lg hover:shadow-copper-500/10 transition-all cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-copper-500/20 border border-copper-500/30 flex items-center justify-center text-copper-400 group-hover:bg-copper-500 group-hover:text-loft-950 transition-all">
                    <Truck className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-loft-50 group-hover:text-copper-300 transition-colors">Book Tempo</h3>
                    <p className="text-xs text-loft-400">Instant intracity dispatch</p>
                  </div>
                </div>
                <span className="text-copper-400 group-hover:translate-x-1 transition-transform text-lg font-bold">→</span>
              </Link>

              <Link 
                to="/tracking"
                className="group relative flex items-center justify-between gap-4 px-5 py-3.5 rounded-2xl bg-gradient-to-br from-moss-500/20 via-loft-900 to-loft-900 border border-moss-500/40 hover:border-moss-500 hover:shadow-lg hover:shadow-moss-500/10 transition-all cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-moss-500/20 border border-moss-500/30 flex items-center justify-center text-moss-400 group-hover:bg-moss-500 group-hover:text-loft-950 transition-all">
                    <MapPin className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-loft-50 group-hover:text-moss-300 transition-colors">Track Booking</h3>
                    <p className="text-xs text-loft-400">Live GPS telematics</p>
                  </div>
                </div>
                <span className="text-moss-400 group-hover:translate-x-1 transition-transform text-lg font-bold">→</span>
              </Link>
            </div>
          </div>

          {/* Tab Content */}
          <div className="min-h-[300px]">
          {activeTab === 'history' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              {/* Statistics Cards — Live from API */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                {[
                  { label: 'Total Bookings', value: bookings.length || 0, icon: Package },
                  { label: 'Completed Rides', value: bookings.filter(b => b.status === 'completed').length || 0, icon: CheckCircle },
                  { label: 'Total Spent', value: `₹${bookings.filter(b => b.status === 'completed').reduce((sum, b) => sum + (parseFloat(b.estimatedFare) || 0), 0).toLocaleString('en-IN')}`, icon: Wallet },
                ].map((stat, idx) => (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    key={idx} 
                    className="card p-6 flex items-center justify-between"
                  >
                    <div>
                      <p className="text-loft-400 text-sm font-medium uppercase tracking-wider mb-1">{stat.label}</p>
                      <p className="text-3xl font-bold text-loft-50">{stat.value}</p>
                    </div>
                    <div className="w-12 h-12 bg-loft-800 rounded-full flex items-center justify-center text-copper-500">
                      <stat.icon className="w-6 h-6" />
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Eminence Pro Success Banner */}
              {proSuccess && (
                <div className="mb-6 p-4 rounded-xl bg-gradient-to-r from-yellow-500/20 via-yellow-500/10 to-transparent border border-yellow-500/40 text-yellow-300 flex items-center justify-between animate-fade-in">
                  <div className="flex items-center gap-3">
                    <Crown className="w-6 h-6 text-yellow-400 shrink-0" />
                    <span className="font-medium text-sm">{proSuccess}</span>
                  </div>
                  <button onClick={() => setProSuccess('')} className="text-yellow-400 hover:text-white p-1">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* Gamification & Retention Section */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                {/* Eminence Pro Upsell (Only show if not Pro) */}
                {!isPro ? (
                  <div className="card p-6 bg-gradient-to-br from-loft-900 to-loft-950 border-yellow-500/30 relative overflow-hidden flex flex-col justify-between">
                    <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-yellow-500/10 rounded-full blur-2xl"></div>
                    <div>
                      <h3 className="text-xl font-bold text-yellow-500 mb-2 flex items-center gap-2"><Crown className="w-5 h-5"/> Eminence Pro</h3>
                      <p className="text-loft-300 text-sm mb-4">Upgrade for ₹499/mo to get <strong className="text-yellow-400">Zero Cancellation Fees</strong>, Priority Allocation, and <strong className="text-yellow-400">5% OFF</strong> all bookings.</p>
                    </div>
                    <button 
                      id="upgrade-pro-btn"
                      type="button"
                      disabled={isProcessingPro}
                      onClick={handleBuyPro}
                      className="bg-yellow-500 hover:bg-yellow-400 text-black font-bold py-2 px-6 rounded-lg shadow-[0_0_15px_rgba(234,179,8,0.2)] transition-all w-full md:w-auto self-start cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {isProcessingPro ? 'Opening Checkout...' : 'Upgrade Now'}
                    </button>
                  </div>
                ) : (
                  <div className="card p-6 bg-gradient-to-br from-loft-900 to-loft-950 border-yellow-500/30 relative overflow-hidden flex flex-col justify-between">
                    <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-yellow-500/10 rounded-full blur-2xl"></div>
                    <div>
                      <h3 className="text-xl font-bold text-yellow-500 mb-2 flex items-center gap-2"><Crown className="w-5 h-5"/> Eminence Pro Active</h3>
                      <p className="text-loft-300 text-sm">You are enjoying Zero Cancellation Fees, Priority Allocation, and 5% OFF all bookings.</p>
                    </div>
                  </div>
                )}

                {/* Milestone Rewards */}
                <div className="card p-6 bg-loft-900 border-loft-800">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-lg font-bold text-loft-50 flex items-center gap-2"><Target className="w-5 h-5 text-moss-500"/> Current Milestone</h3>
                      <p className="text-loft-400 text-sm">
                        {totalTrips >= 10 ? (
                          <span>Completed 10 rides! <strong className="text-moss-400">₹500 Reward Unlocked</strong></span>
                        ) : (
                          <span>Complete 10 rides to unlock <strong className="text-moss-400">₹500 Wallet Cash</strong></span>
                        )}
                      </p>
                    </div>
                    <div className="w-10 h-10 bg-moss-500/10 rounded-full flex items-center justify-center border border-moss-500/30">
                      <Star className="w-5 h-5 text-moss-500"/>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs font-bold text-loft-300">
                      <span>{totalTrips} {totalTrips === 1 ? 'Ride' : 'Rides'}</span>
                      <span>10 Rides</span>
                    </div>
                    <div className="w-full bg-loft-950 rounded-full h-3 overflow-hidden border border-loft-800">
                      <div 
                        className="bg-gradient-to-r from-moss-600 to-moss-400 h-3 rounded-full transition-all duration-1000 relative"
                        style={{ width: `${Math.min(100, Math.max(0, (totalTrips / 10) * 100))}%` }}
                      >
                        <div className="absolute top-0 right-0 bottom-0 left-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-30"></div>
                      </div>
                    </div>
                    <p className="text-xs text-right text-moss-500 mt-1">
                      {totalTrips >= 10 
                        ? '🎉 Milestone Achieved! ₹500 Wallet Cash Credited'
                        : `${10 - totalTrips} ${(10 - totalTrips) === 1 ? 'ride' : 'rides'} remaining!`
                      }
                    </p>
                  </div>
                </div>

                {/* Refer & Earn Shortcut */}
                <div className="card p-6 bg-gradient-to-br from-loft-900 to-loft-950 border-moss-500/30 relative overflow-hidden flex flex-col justify-between">
                  <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-moss-500/10 rounded-full blur-2xl"></div>
                  <div>
                    <h3 className="text-xl font-bold text-moss-500 mb-2 flex items-center gap-2"><Gift className="w-5 h-5"/> Refer & Earn</h3>
                    <p className="text-loft-300 text-sm mb-4">Share code: <strong className="text-copper-400">{walletData?.referralCode || user?.referralCode || 'EMN-DEMO-2026'}</strong></p>
                  </div>
                  <button onClick={copyToClipboard} className="bg-moss-600 hover:bg-moss-500 text-white font-bold py-2 px-6 rounded-lg shadow-[0_0_15px_rgba(34,197,94,0.2)] transition-all w-full md:w-auto self-start flex items-center gap-2 justify-center">
                    {copySuccess ? <><CheckCircle className="w-4 h-4"/> Copied!</> : <><Copy className="w-4 h-4"/> Copy Code</>}
                  </button>
                </div>
              </div>

              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-loft-50">Recent Bookings</h3>
                <button onClick={fetchBookings} className="text-copper-500 text-sm font-medium hover:text-copper-400 flex items-center gap-1">
                  <RefreshCw className="w-3 h-3" /> Refresh
                </button>
              </div>
              <div className="space-y-4">
                {bookingsLoading ? (
                  <div className="card p-8 text-center">
                    <div className="w-8 h-8 border-2 border-copper-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
                    <p className="text-loft-400 text-sm">Loading your bookings...</p>
                  </div>
                ) : bookings.length === 0 ? (
                  <div className="card p-12 text-center">
                    <Package className="w-12 h-12 text-loft-600 mx-auto mb-3" />
                    <h4 className="text-loft-300 font-semibold mb-1">No bookings yet</h4>
                    <p className="text-loft-500 text-sm">Your ride history will appear here once you book your first trip.</p>
                  </div>
                ) : bookings.map((booking) => {
                  const isPending = booking.status === 'pending';
                  const isExpired = (booking.status === 'cancelled' && (booking.cancellationReason?.toLowerCase().includes('expire') || booking.cancellationReason?.toLowerCase().includes('untouched'))) || booking.status === 'expired';
                  const isCancelled = booking.status === 'cancelled' && !isExpired;
                  const isCompleted = booking.status === 'completed';
                  const statusLabel = isCompleted ? 'Completed' : isExpired ? 'Expired' : isCancelled ? 'Cancelled' : isPending ? 'Waiting for Driver' : booking.status;
                  return (
                  <div key={booking.id} className="card p-5 bg-loft-900 flex flex-col md:flex-row md:items-center justify-between gap-4 border-l-4 border-l-transparent hover:border-l-copper-500 transition-all">
                    <div>
                      <div className="flex items-center gap-3 mb-2 flex-wrap">
                        <span className="font-bold text-loft-50 font-mono text-sm">{booking.id?.slice(0, 8).toUpperCase()}</span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          isCompleted ? 'bg-moss-500/20 text-moss-500 border border-moss-500/30' : isExpired ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : isCancelled ? 'bg-red-500/20 text-red-500 border border-red-500/30' : isPending ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' : 'bg-blue-500/20 text-blue-400'
                        }`}>
                          {statusLabel}
                        </span>
                        {isPending && booking.expiresAt && (
                          <span className="text-xs text-amber-400/90 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20 flex items-center gap-1 font-mono">
                            <Clock className="w-3 h-3 text-amber-400" />
                            Expires: {new Date(booking.expiresAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        )}
                        <span className="text-loft-400 text-sm">{new Date(booking.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-loft-300">
                        <Package className="w-4 h-4 text-loft-500" />
                        <span>{booking.vehicle?.type || booking.tempoType || 'Vehicle'}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-loft-300 mt-1">
                        <MapPin className="w-4 h-4 text-copper-500" />
                        <span>{booking.pickupAddress || 'Pickup'} &rarr; {booking.dropAddress || (booking.drops?.[0]) || 'Drop'}</span>
                      </div>
                      {isExpired && (
                        <p className="text-xs text-amber-400/90 mt-2 bg-amber-500/10 px-2.5 py-1 rounded border border-amber-500/20">
                          ⏳ Expired due to no driver acceptance within validity window. Any advance payment was refunded to wallet.
                        </p>
                      )}
                      {isCancelled && booking.cancellationReason && (
                        <p className="text-xs text-red-400/90 mt-2 bg-red-500/10 px-2.5 py-1 rounded border border-red-500/20">
                          Reason: {booking.cancellationReason}
                        </p>
                      )}
                      {booking.esgEmissions && (
                        <div className="flex flex-wrap items-center gap-3 mt-3">
                          <span className="flex items-center gap-1.5 text-xs text-moss-400 bg-moss-900/30 px-2 py-1 rounded-md border border-moss-800">
                            <Leaf className="w-3 h-3" />
                            {booking.esgEmissions} KG CO2 Saved
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center justify-between md:flex-col md:items-end gap-2">
                      <span className="text-xl font-bold text-loft-100">₹{parseFloat(booking.estimatedFare || 0).toLocaleString('en-IN')}</span>
                      <div className="flex items-center gap-2 flex-wrap justify-end">
                        {isPending && (
                          <button
                            onClick={() => setCancelModalBooking(booking)}
                            className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-red-400 bg-red-500/10 border border-red-500/30 hover:bg-red-500/20 transition-all flex items-center gap-1"
                          >
                            <X className="w-3.5 h-3.5" /> Cancel
                          </button>
                        )}
                        {isCompleted && (
                          reviewedBookings[booking.id] ? (
                            <span className="text-xs font-semibold text-moss-400 bg-moss-900/30 px-2 py-1 rounded border border-moss-800">
                              ★ {reviewedBookings[booking.id]}.0 Rated
                            </span>
                          ) : (
                            <button
                              onClick={() => {
                                setReviewTrip(booking);
                                setIsReviewModalOpen(true);
                              }}
                              className="btn-secondary py-1.5 px-2.5 text-xs text-amber-400 border-amber-500/30 hover:border-amber-500/60"
                            >
                              ⭐ Rate Driver
                            </button>
                          )
                        )}
                        <button 
                          onClick={() => setSelectedTrip(booking)}
                          className="btn-secondary py-1.5 px-3 text-xs"
                        >
                          View Details
                        </button>
                      </div>
                    </div>
                  </div>
                );
                })}
              </div>
            </motion.div>
          )}

          {activeTab === 'invoices' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-loft-50">Invoices & Receipts</h3>
                <button className="text-copper-500 text-sm font-medium hover:text-copper-400">Download All</button>
              </div>
              <div className="card bg-loft-900 border-loft-800 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm text-loft-300">
                    <thead className="bg-loft-950/50 text-xs uppercase font-medium">
                      <tr>
                        <th className="px-6 py-4">Invoice No.</th>
                        <th className="px-6 py-4">Date</th>
                        <th className="px-6 py-4">Booking Ref</th>
                        <th className="px-6 py-4">Amount</th>
                        <th className="px-6 py-4">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-loft-800">
                      {bookings.filter(b => b.status === 'completed').length === 0 ? (
                        <tr><td colSpan="5" className="px-6 py-8 text-center text-loft-500 text-sm">No invoices yet. Completed bookings will appear here.</td></tr>
                      ) : bookings.filter(b => b.status === 'completed').map((booking, idx) => (
                        <tr key={idx} className="hover:bg-loft-800/50 transition-colors">
                          <td className="px-6 py-4 font-medium text-loft-200 font-mono text-sm">INV-{booking.id?.slice(0,8).toUpperCase()}</td>
                          <td className="px-6 py-4">{new Date(booking.updatedAt || booking.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                          <td className="px-6 py-4 font-mono text-sm">{booking.id?.slice(0,8).toUpperCase()}</td>
                          <td className="px-6 py-4 font-bold text-loft-100">₹{parseFloat(booking.estimatedFare || 0).toLocaleString('en-IN')}</td>
                          <td className="px-6 py-4">
                            <button 
                              onClick={() => handleDownloadInvoice(booking.id)}
                              disabled={downloadingInvoice === booking.id}
                              className="text-copper-500 hover:text-copper-400 font-medium text-xs flex items-center gap-1 disabled:opacity-50"
                            >
                              {downloadingInvoice === booking.id ? 'Downloading...' : 'Download PDF'}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'addresses' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-loft-50">Your Addresses</h3>
                <button 
                  onClick={() => setIsAddAddressOpen(true)}
                  className="btn-secondary py-2 px-4 text-sm"
                >
                  <Plus className="w-4 h-4 mr-2" /> Add Address
                </button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(!addressState?.data || addressState.data.length === 0) ? (
                  <p className="text-loft-400">No saved addresses yet.</p>
                ) : (
                  addressState.data.map((address) => (
                    <div key={address.id} className="card p-6 border-l-4 border-l-copper-500">
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-bold text-loft-50 mb-1">{address.label}</h4>
                          <p className="text-loft-300 text-sm leading-relaxed">
                            {address.street}<br/>
                            {address.city}, {address.postalCode}
                          </p>
                        </div>
                        <div className="flex flex-col gap-2">
                          <div className="p-2 bg-loft-800 rounded-lg text-copper-500">
                            <MapPin className="w-5 h-5" />
                          </div>
                          <button 
                            onClick={() => handleDeleteAddress(address.id)}
                            className="p-1.5 text-xs text-red-500 hover:bg-red-500/10 rounded transition-colors text-center"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          )}

          {/* Payments Tab */}
          {activeTab === 'payments' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
              {topupSuccess && (
                <div className="p-4 rounded-xl bg-moss-500/10 border border-moss-500/30 text-moss-400 text-sm flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 flex-shrink-0" />
                  <span>{topupSuccess}</span>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Wallet Balance Card */}
                <div className="card p-8 bg-gradient-to-br from-loft-900 to-loft-950 border-copper-500/20 relative overflow-hidden md:col-span-2">
                  <div className="absolute -right-10 -top-10 w-40 h-40 bg-copper-500/10 rounded-full blur-2xl"></div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-lg font-bold text-loft-300">Available Wallet Balance</h3>
                    <span className="text-xs px-2.5 py-1 rounded-full bg-copper-500/10 border border-copper-500/20 text-copper-400 font-medium">
                      Instant Payout & Bookings
                    </span>
                  </div>
                  <div className="flex items-end gap-2 mb-6">
                    <span className="text-4xl font-bold text-copper-400">
                      ₹{getDisplayBalance()}
                    </span>
                  </div>
                  <button 
                    onClick={() => {
                      setTopupError('');
                      setShowAddFundsModal(true);
                    }}
                    className="btn-primary py-2.5 px-6 w-full md:w-auto text-sm flex items-center justify-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Add Funds
                  </button>
                </div>

                {/* Quick Add Presets Card */}
                <div className="card p-6 bg-loft-900 border-loft-800 flex flex-col justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-loft-100 mb-2">Quick Top-Up</h4>
                    <p className="text-xs text-loft-400 mb-4">Select an amount to recharge via Razorpay</p>
                    <div className="grid grid-cols-2 gap-2">
                      {[200, 500, 1000, 2000].map((amt) => (
                        <button
                          key={amt}
                          onClick={() => {
                            setTopupAmount(String(amt));
                            setTopupError('');
                            setShowAddFundsModal(true);
                          }}
                          className="py-2 px-3 rounded-lg text-xs font-semibold bg-loft-950/60 border border-loft-800 hover:border-copper-500 text-loft-200 transition-colors"
                        >
                          +₹{amt}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="mt-4 pt-3 border-t border-loft-800/60 flex items-center gap-2 text-[11px] text-loft-400">
                    <ShieldCheck className="w-4 h-4 text-moss-400 flex-shrink-0" />
                    <span>UPI, Cards, NetBanking</span>
                  </div>
                </div>
              </div>

              {/* Transactions List */}
              <div className="card p-6 bg-loft-900 border-loft-800">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-loft-50">Transaction History</h3>
                  <button 
                    onClick={fetchWallet} 
                    className="p-1.5 text-loft-400 hover:text-loft-100 rounded-lg hover:bg-loft-800 transition-colors text-xs flex items-center gap-1.5"
                    title="Refresh transactions"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Refresh</span>
                  </button>
                </div>
                {walletData?.wallet?.transactions?.length > 0 ? (
                  <div className="space-y-3">
                    {walletData.wallet.transactions.map((tx) => (
                      <div key={tx.id} className="flex items-center justify-between p-4 rounded-lg bg-loft-950/50 border border-loft-800/50">
                        <div>
                          <p className="font-medium text-loft-100">{tx.description}</p>
                          <p className="text-xs text-loft-400">{new Date(tx.createdAt).toLocaleDateString()}</p>
                        </div>
                        <div className={`font-bold ${tx.type === 'CREDIT' ? 'text-moss-500' : 'text-red-500'}`}>
                          {tx.type === 'CREDIT' ? '+' : '-'}₹{tx.amount}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-loft-400 text-sm">
                    No transactions yet. Click &ldquo;Add Funds&rdquo; to top-up your wallet.
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* Rewards Tab */}
          {activeTab === 'rewards' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
              {topupSuccess && (
                <div className="p-4 rounded-xl bg-moss-500/10 border border-moss-500/30 text-moss-400 text-sm flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 flex-shrink-0" />
                  <span>{topupSuccess}</span>
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Wallet Balance Card */}
                <div className="card p-8 bg-gradient-to-br from-loft-900 to-loft-950 border-copper-500/20 relative overflow-hidden">
                  <div className="absolute -right-10 -top-10 w-40 h-40 bg-copper-500/10 rounded-full blur-2xl"></div>
                  <h3 className="text-lg font-bold text-loft-300 mb-2">Available Balance</h3>
                  <div className="flex items-end gap-2 mb-6">
                    <span className="text-4xl font-bold text-copper-400">
                      ₹{getDisplayBalance()}
                    </span>
                  </div>
                  <button 
                    onClick={() => {
                      setTopupError('');
                      setShowAddFundsModal(true);
                    }}
                    className="btn-primary py-2 px-6 w-full md:w-auto text-sm flex items-center justify-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Add Funds
                  </button>
                </div>

                {/* Referral Card */}
                <div className="card p-8 bg-loft-900 border-loft-800">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-lg bg-moss-500/10 text-moss-500 flex items-center justify-center">
                      <Gift className="w-5 h-5" />
                    </div>
                    <h3 className="text-xl font-bold text-loft-50">Refer & Earn ₹100</h3>
                  </div>
                  <p className="text-loft-300 text-sm mb-6">
                    Share your unique referral code with friends. When they sign up and complete their first booking, you both get ₹100 in your wallet!
                  </p>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-loft-950 border border-loft-800 rounded-lg px-4 py-3 font-mono text-copper-400 text-center tracking-wider font-bold">
                      {walletData?.referralCode || user?.referralCode || 'EMN-DEMO-2026'}
                    </div>
                    <button 
                      onClick={copyToClipboard}
                      className="p-3 bg-loft-800 hover:bg-loft-700 rounded-lg text-loft-200 transition-colors"
                      title="Copy Code"
                    >
                      {copySuccess ? <CheckCircle className="w-5 h-5 text-moss-500" /> : <Copy className="w-5 h-5" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Transactions List */}
              <div className="card p-6 bg-loft-900 border-loft-800">
                <h3 className="text-lg font-bold text-loft-50 mb-4">Recent Transactions</h3>
                {walletData?.wallet?.transactions?.length > 0 ? (
                  <div className="space-y-3">
                    {walletData.wallet.transactions.map((tx) => (
                      <div key={tx.id} className="flex items-center justify-between p-4 rounded-lg bg-loft-950/50 border border-loft-800/50">
                        <div>
                          <p className="font-medium text-loft-100">{tx.description}</p>
                          <p className="text-xs text-loft-400">{new Date(tx.createdAt).toLocaleDateString()}</p>
                        </div>
                        <div className={`font-bold ${tx.type === 'CREDIT' ? 'text-moss-500' : 'text-red-500'}`}>
                          {tx.type === 'CREDIT' ? '+' : '-'}₹{tx.amount}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-loft-400 text-sm">
                    No transactions yet.
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {activeTab === 'tracking' && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
              {/* Header Banner */}
              <div className="card p-6 bg-gradient-to-br from-loft-900 via-loft-900 to-loft-950 border-loft-800 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-96 h-96 bg-[radial-gradient(ellipse_at_top_right,rgba(184,115,51,0.12),transparent_70%)] pointer-events-none"></div>
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="relative flex h-2.5 w-2.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                      </span>
                      <span className="text-xs font-semibold text-emerald-400 uppercase tracking-widest">Live Telematics Engine</span>
                    </div>
                    <h2 className="text-2xl font-bold text-loft-50 font-serif">Live Ride & Fleet Tracking</h2>
                    <p className="text-sm text-loft-300 mt-1 max-w-xl">
                      Monitor all your tempo shipments in real time, view driver positions, verify Start Ride OTPs, and access tamper-proof Proof of Delivery (PoD).
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      onClick={fetchBookings}
                      disabled={bookingsLoading}
                      className="btn-secondary py-2 px-3.5 text-xs flex items-center gap-2 cursor-pointer disabled:opacity-50"
                      title="Refresh bookings"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${bookingsLoading ? 'animate-spin' : ''}`} />
                      <span>{bookingsLoading ? 'Refreshing...' : 'Refresh'}</span>
                    </button>
                    <Link
                      to="/booking"
                      className="btn-primary py-2 px-4 text-xs flex items-center gap-2 shadow-lg shadow-copper-500/20 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Book New Tempo</span>
                    </Link>
                  </div>
                </div>

                {/* Metrics Summary Strip */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6 pt-6 border-t border-loft-800/80">
                  <div className="bg-loft-950/60 border border-loft-800/80 rounded-xl p-3.5 flex items-center justify-between">
                    <div>
                      <p className="text-[11px] font-medium uppercase tracking-wider text-loft-400">Active On Road</p>
                      <p className="text-2xl font-bold text-emerald-400 mt-0.5">{activeBookings.length}</p>
                    </div>
                    <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                      <Radio className="w-5 h-5 animate-pulse" />
                    </div>
                  </div>

                  <div className="bg-loft-950/60 border border-loft-800/80 rounded-xl p-3.5 flex items-center justify-between">
                    <div>
                      <p className="text-[11px] font-medium uppercase tracking-wider text-loft-400">Total Bookings</p>
                      <p className="text-2xl font-bold text-loft-100 mt-0.5">{bookings.length}</p>
                    </div>
                    <div className="w-10 h-10 rounded-lg bg-copper-500/10 border border-copper-500/20 flex items-center justify-center text-copper-400">
                      <Truck className="w-5 h-5" />
                    </div>
                  </div>

                  <div className="bg-loft-950/60 border border-loft-800/80 rounded-xl p-3.5 flex items-center justify-between">
                    <div>
                      <p className="text-[11px] font-medium uppercase tracking-wider text-loft-400">Delivered & Verified</p>
                      <p className="text-2xl font-bold text-moss-400 mt-0.5">{completedBookings.length}</p>
                    </div>
                    <div className="w-10 h-10 rounded-lg bg-moss-500/10 border border-moss-500/20 flex items-center justify-center text-moss-400">
                      <ShieldCheck className="w-5 h-5" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Active Hero Trips Spotlight (If Any) */}
              {activeBookings.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold text-loft-50 flex items-center gap-2">
                      <Activity className="w-5 h-5 text-emerald-400" />
                      Active In-Progress Shipments ({activeBookings.length})
                    </h3>
                    <span className="text-xs text-loft-400">Live GPS Radar tracking active</span>
                  </div>

                  <div className="grid grid-cols-1 gap-5">
                    {activeBookings.map((trip) => {
                      const badge = getStatusBadge(trip.status);
                      const stepIdx = getTrackingStepIndex(trip.status);
                      const tripOtp = getBookingOtp(trip);
                      return (
                        <div
                          key={trip.id}
                          className="card p-6 bg-gradient-to-br from-loft-900 via-loft-900 to-loft-950 border border-emerald-500/30 hover:border-emerald-500/50 shadow-lg shadow-emerald-500/5 transition-all"
                        >
                          {/* Card Top: ID, Status, and Actions */}
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-loft-800">
                            <div className="flex items-center gap-3">
                              <span className="font-mono font-bold text-loft-50 text-base">
                                #{trip.id?.slice(0, 8).toUpperCase()}
                              </span>
                              <span
                                className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider border flex items-center gap-1.5 ${badge.bg} ${badge.text} ${badge.border}`}
                              >
                                {badge.pulse && (
                                  <span className="relative flex h-2 w-2">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-current opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-current"></span>
                                  </span>
                                )}
                                {badge.label}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-loft-400">
                              <Clock className="w-3.5 h-3.5" />
                              <span>{new Date(trip.createdAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</span>
                            </div>
                          </div>

                          {/* 4-Step Milestone Progress Bar */}
                          <div className="py-5 border-b border-loft-800/80">
                            <div className="grid grid-cols-4 gap-2 text-center">
                              {[
                                { title: 'Order Placed', step: 0 },
                                { title: 'Driver Assigned', step: 1 },
                                { title: 'Tempo Arrived', step: 2 },
                                { title: 'In Transit', step: 3 },
                              ].map((st, i) => {
                                const isCurrent = stepIdx === st.step;
                                const isDone = stepIdx > st.step;
                                return (
                                  <div key={i} className="flex flex-col items-center">
                                    <div
                                      className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold mb-1.5 transition-all ${
                                        isDone
                                          ? 'bg-moss-500 text-loft-950 font-bold'
                                          : isCurrent
                                          ? 'bg-emerald-500 text-loft-950 ring-4 ring-emerald-500/20'
                                          : 'bg-loft-800 text-loft-500'
                                      }`}
                                    >
                                      {isDone ? <Check className="w-4 h-4 stroke-[3]" /> : i + 1}
                                    </div>
                                    <span
                                      className={`text-xs font-medium ${
                                        isCurrent ? 'text-emerald-400 font-bold' : isDone ? 'text-loft-200' : 'text-loft-500'
                                      }`}
                                    >
                                      {st.title}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                            <div className="w-full bg-loft-800 h-1.5 rounded-full mt-3 overflow-hidden">
                              <div
                                className="bg-gradient-to-r from-copper-500 via-emerald-500 to-moss-400 h-full transition-all duration-500 rounded-full"
                                style={{ width: `${Math.min(100, Math.max(15, (stepIdx / 3) * 100))}%` }}
                              ></div>
                            </div>
                          </div>

                          {/* Route, Details & OTP Grid */}
                          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 py-5">
                            {/* Route Column */}
                            <div className="lg:col-span-2 space-y-3">
                              <div className="flex items-start gap-3">
                                <div className="mt-1 w-3 h-3 rounded-full bg-copper-400 ring-4 ring-copper-400/20 shrink-0"></div>
                                <div>
                                  <p className="text-[11px] font-semibold uppercase tracking-wider text-loft-400">Pickup Location</p>
                                  <p className="text-sm font-medium text-loft-100">{trip.pickupAddress || 'Pune Location'}</p>
                                </div>
                              </div>
                              <div className="ml-1.5 w-0.5 h-6 bg-gradient-to-b from-copper-400 to-moss-400"></div>
                              <div className="flex items-start gap-3">
                                <div className="mt-1 w-3 h-3 rounded-full bg-moss-400 ring-4 ring-moss-400/20 shrink-0"></div>
                                <div>
                                  <p className="text-[11px] font-semibold uppercase tracking-wider text-loft-400">Delivery Destination</p>
                                  <p className="text-sm font-medium text-loft-100">
                                    {trip.dropAddress || (Array.isArray(trip.drops) ? trip.drops.join(' → ') : 'Destination')}
                                  </p>
                                </div>
                              </div>

                              <div className="flex flex-wrap items-center gap-3 pt-2">
                                <span className="bg-loft-800 text-loft-300 text-xs px-2.5 py-1 rounded-md flex items-center gap-1.5">
                                  <Truck className="w-3.5 h-3.5 text-copper-400" />
                                  {trip.vehicle?.type || trip.tempoType || 'Standard Tempo'}
                                </span>
                                {trip.totalDistance && (
                                  <span className="bg-loft-800 text-loft-300 text-xs px-2.5 py-1 rounded-md flex items-center gap-1.5">
                                    <Navigation className="w-3.5 h-3.5 text-emerald-400" />
                                    {trip.totalDistance} km
                                  </span>
                                )}
                                <span className="bg-loft-800 text-loft-100 font-bold text-xs px-2.5 py-1 rounded-md">
                                  ₹{parseFloat(trip.estimatedFare || 0).toLocaleString('en-IN')}
                                </span>
                              </div>
                            </div>

                            {/* Driver & OTP Box */}
                            <div className="bg-loft-950/70 border border-loft-800/80 rounded-xl p-4 flex flex-col justify-between gap-4">
                              {trip.driver ? (
                                <div className="flex items-center justify-between">
                                  <div>
                                    <p className="text-[11px] text-loft-400 font-semibold uppercase tracking-wider">Assigned Driver</p>
                                    <p className="text-sm font-bold text-loft-100 mt-0.5">{trip.driver.name}</p>
                                    <div className="flex items-center gap-1 text-xs text-amber-400 mt-0.5">
                                      <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                                      <span>{trip.driver.rating ? Number(trip.driver.rating).toFixed(1) : '4.9'}</span>
                                      {trip.driver.phone && (
                                        <a
                                          href={`tel:${trip.driver.phone}`}
                                          className="text-xs text-copper-400 hover:underline ml-2 flex items-center gap-1"
                                        >
                                          <Phone className="w-3 h-3" /> {trip.driver.phone}
                                        </a>
                                      )}
                                    </div>
                                  </div>
                                  <div className="w-10 h-10 rounded-full bg-copper-500/20 border border-copper-500/30 flex items-center justify-center text-copper-400 font-bold text-sm">
                                    👨‍✈️
                                  </div>
                                </div>
                              ) : (
                                <div>
                                  <p className="text-[11px] text-loft-400 font-semibold uppercase tracking-wider">Driver Partner</p>
                                  <p className="text-xs text-indigo-400 mt-1 flex items-center gap-1.5">
                                    <RefreshCw className="w-3 h-3 animate-spin" /> Auto-dispatching nearest vehicle...
                                  </p>
                                </div>
                              )}

                              {/* Start Ride OTP */}
                              <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-3 flex items-center justify-between">
                                <div>
                                  <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1">
                                    <ShieldCheck className="w-3.5 h-3.5" /> Start Ride OTP
                                  </p>
                                  <p className="text-[11px] text-loft-400">Share with driver upon arrival</p>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="text-xl font-mono font-bold tracking-widest text-loft-50">
                                    {tripOtp}
                                  </span>
                                  <button
                                    onClick={() => handleCopyOtp(trip.id, tripOtp)}
                                    className="p-1.5 rounded bg-loft-900 hover:bg-loft-800 text-loft-300 hover:text-loft-50 transition-colors cursor-pointer"
                                    title="Copy OTP"
                                  >
                                    {copiedOtpId === trip.id ? (
                                      <Check className="w-4 h-4 text-emerald-400" />
                                    ) : (
                                      <Copy className="w-4 h-4" />
                                    )}
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Card Footer: Action Buttons */}
                          <div className="pt-4 border-t border-loft-800 flex flex-wrap items-center justify-between gap-3">
                            <span className="text-xs text-loft-400 flex items-center gap-1.5">
                              <Radio className="w-3.5 h-3.5 text-emerald-400" />
                              Vehicle telemetry is streaming live
                            </span>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => setSelectedTrip(trip)}
                                className="btn-secondary py-2 px-3 text-xs"
                              >
                                View Details
                              </button>
                              <Link
                                to={`/tracking/${trip.id}`}
                                className="btn-primary py-2 px-4 text-xs flex items-center gap-2 shadow-md shadow-copper-500/20"
                              >
                                <span>Open Live GPS Radar & Map</span>
                                <ArrowRight className="w-3.5 h-3.5" />
                              </Link>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* All Bookings Directory */}
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-bold text-loft-50">All Trackable Bookings</h3>
                    <p className="text-xs text-loft-400">Select any trip to view live telematics, route telemetry, or Proof of Delivery certificate.</p>
                  </div>

                  {/* Filter Pills */}
                  <div className="flex flex-wrap items-center gap-2 bg-loft-950 p-1 rounded-xl border border-loft-800">
                    {[
                      { id: 'all', label: `All (${bookings.length})` },
                      { id: 'active', label: `In Transit (${activeBookings.length})` },
                      { id: 'completed', label: `Delivered (${completedBookings.length})` },
                    ].map((f) => (
                      <button
                        key={f.id}
                        onClick={() => setTrackingFilter(f.id)}
                        className={`py-1.5 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                          trackingFilter === f.id
                            ? 'bg-copper-500 text-white shadow-sm'
                            : 'text-loft-400 hover:text-loft-200'
                        }`}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Search Bar */}
                <div className="relative">
                  <Search className="w-4 h-4 text-loft-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={trackingSearch}
                    onChange={(e) => setTrackingSearch(e.target.value)}
                    placeholder="Search by booking ID, pickup, drop location, vehicle or driver name..."
                    className="input-field pl-10 pr-10 py-2.5 text-xs w-full bg-loft-900 border-loft-800"
                  />
                  {trackingSearch && (
                    <button
                      onClick={() => setTrackingSearch('')}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-loft-400 hover:text-loft-200 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Bookings List Cards */}
                {bookingsLoading ? (
                  <div className="card p-12 text-center">
                    <RefreshCw className="w-8 h-8 text-copper-500 animate-spin mx-auto mb-3" />
                    <p className="text-loft-300 text-sm">Loading all bookings and live tracking data...</p>
                  </div>
                ) : filteredTrackingBookings.length === 0 ? (
                  <div className="card p-12 text-center border-dashed border-loft-800">
                    <MapPin className="w-12 h-12 text-loft-600 mx-auto mb-3" />
                    <h4 className="text-loft-200 font-bold mb-1">
                      {bookings.length === 0 ? 'No bookings found' : 'No matching bookings'}
                    </h4>
                    <p className="text-loft-400 text-xs max-w-sm mx-auto mb-5">
                      {bookings.length === 0
                        ? 'You haven’t placed any tempo bookings yet. Book a tempo to track live telematics and GPS coordinates.'
                        : 'Try adjusting your search query or filter to see other bookings.'}
                    </p>
                    {bookings.length === 0 ? (
                      <Link to="/booking" className="btn-primary py-2 px-5 text-xs inline-flex items-center gap-2">
                        <Plus className="w-4 h-4" />
                        <span>Book a Tempo Now</span>
                      </Link>
                    ) : (
                      <button
                        onClick={() => {
                          setTrackingFilter('all');
                          setTrackingSearch('');
                        }}
                        className="btn-secondary py-2 px-4 text-xs inline-flex items-center gap-1 cursor-pointer"
                      >
                        Reset Filters
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3.5">
                    {filteredTrackingBookings.map((b) => {
                      const badge = getStatusBadge(b.status);
                      const isCompleted = b.status === 'completed';
                      const tripOtp = getBookingOtp(b);
                      return (
                        <div
                          key={b.id}
                          className="card p-5 bg-loft-900 border border-loft-800 hover:border-loft-700 transition-all flex flex-col lg:flex-row lg:items-center justify-between gap-4"
                        >
                          <div className="flex-1 space-y-2">
                            <div className="flex flex-wrap items-center gap-3">
                              <span className="font-mono font-bold text-loft-50 text-sm">
                                #{b.id?.slice(0, 8).toUpperCase()}
                              </span>
                              <span
                                className={`px-2 py-0.5 rounded text-[11px] font-bold uppercase border flex items-center gap-1.5 ${badge.bg} ${badge.text} ${badge.border}`}
                              >
                                {badge.pulse && (
                                  <span className="relative flex h-1.5 w-1.5">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-current opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-current"></span>
                                  </span>
                                )}
                                {badge.label}
                              </span>
                              <span className="text-xs text-loft-400">
                                {new Date(b.createdAt).toLocaleDateString('en-IN', {
                                  day: 'numeric',
                                  month: 'short',
                                  year: 'numeric',
                                })}
                              </span>

                              {isCompleted && (
                                <span className="text-[10px] bg-moss-500/15 text-moss-400 font-mono px-2 py-0.5 rounded border border-moss-500/30 flex items-center gap-1">
                                  <ShieldCheck className="w-3 h-3 text-moss-400" /> PoD Verified
                                </span>
                              )}

                              {!isCompleted && b.status !== 'cancelled' && (
                                <span className="text-[10px] bg-copper-500/15 text-copper-300 font-mono px-2 py-0.5 rounded border border-copper-500/30 flex items-center gap-1">
                                  OTP: {tripOtp}
                                </span>
                              )}
                            </div>

                            {/* Route */}
                            <div className="text-xs text-loft-300 flex items-center gap-2">
                              <MapPin className="w-3.5 h-3.5 text-copper-400 shrink-0" />
                              <span className="truncate max-w-xs">{b.pickupAddress || 'Pune Pickup'}</span>
                              <span className="text-loft-500">&rarr;</span>
                              <span className="truncate max-w-xs">{b.dropAddress || (Array.isArray(b.drops) ? b.drops.join(' → ') : 'Drop')}</span>
                            </div>

                            {/* Metadata Chips */}
                            <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px] text-loft-400">
                              <span className="bg-loft-950 px-2 py-0.5 rounded border border-loft-800">
                                {b.vehicle?.type || b.tempoType || 'Tempo'}
                              </span>
                              {b.totalDistance && (
                                <span className="bg-loft-950 px-2 py-0.5 rounded border border-loft-800">
                                  {b.totalDistance} km
                                </span>
                              )}
                              {b.driver?.name && (
                                <span className="bg-loft-950 px-2 py-0.5 rounded border border-loft-800 text-loft-300">
                                  Driver: {b.driver.name}
                                </span>
                              )}
                              <span className="font-bold text-loft-200">
                                ₹{parseFloat(b.estimatedFare || 0).toLocaleString('en-IN')}
                              </span>
                            </div>
                          </div>

                          {/* Action Buttons */}
                          <div className="flex items-center gap-2.5 self-end lg:self-center shrink-0">
                            <button
                              onClick={() => setSelectedTrip(b)}
                              className="btn-secondary py-2 px-3 text-xs cursor-pointer"
                            >
                              Details
                            </button>
                            <Link
                              to={`/tracking/${b.id}`}
                              className={`py-2 px-3.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                                isCompleted
                                  ? 'bg-loft-800 hover:bg-loft-700 text-loft-100 border border-loft-700'
                                  : 'bg-copper-500 hover:bg-copper-400 text-white shadow-md shadow-copper-500/20'
                              }`}
                            >
                              <Navigation className="w-3.5 h-3.5" />
                              <span>{isCompleted ? 'View Route & PoD' : 'Track Live Map'}</span>
                            </Link>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {activeTab === 'support' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <CustomerSupportTab />
            </motion.div>
          )}

          {activeTab === 'notifications' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-loft-50">Notifications</h3>
                {unreadCount > 0 && (
                  <button onClick={markAllRead} className="text-copper-500 text-sm font-medium hover:text-copper-400">Mark all as read</button>
                )}
              </div>
              <div className="card bg-loft-900 border-loft-800 overflow-hidden p-6">
                {notifications.length === 0 ? (
                  <div className="text-center py-8 text-loft-400">No notifications yet.</div>
                ) : (
                  <div className="space-y-4">
                    {notifications.map((notification) => (
                      <div key={notification.id} className={`flex items-start gap-4 p-4 rounded-lg border transition-colors ${notification.isRead ? 'bg-loft-950/50 border-loft-800/50' : 'bg-copper-900/10 border-copper-500/30'}`}>
                        <div className={`p-2 rounded-full ${notification.isRead ? 'bg-loft-800 text-loft-400' : 'bg-copper-500/20 text-copper-400'}`}>
                          <Bell className="w-5 h-5" />
                        </div>
                        <div className="flex-1">
                          <h4 className={`font-bold ${notification.isRead ? 'text-loft-300' : 'text-loft-50'}`}>{notification.title}</h4>
                          <p className={`text-sm mt-1 ${notification.isRead ? 'text-loft-400' : 'text-loft-200'}`}>{notification.message}</p>
                          <span className="text-xs text-loft-500 mt-2 block">{new Date(notification.createdAt).toLocaleString()}</span>
                        </div>
                        {!notification.isRead && (
                          <button onClick={() => markAsRead(notification.id)} className="p-2 text-moss-500 hover:bg-moss-500/10 rounded-full" title="Mark as read">
                            <Check className="w-5 h-5" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {activeTab === 'profile' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <div className="card p-6 md:p-8 bg-loft-900 border-loft-800">
                <h3 className="text-2xl font-bold text-loft-50 mb-6 border-b border-loft-800 pb-4">Profile Settings</h3>
                {profileState.error && (
                  <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg text-sm flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 flex-shrink-0" />
                    <span>{profileState.error}</span>
                  </div>
                )}
                {profileState.success && (
                  <div className="mb-6 p-4 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-lg text-sm flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 flex-shrink-0" />
                    <span>Profile updated successfully!</span>
                  </div>
                )}
                <form onSubmit={handleProfileUpdate} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-loft-300 mb-2">Full Name</label>
                      <input 
                        type="text" 
                        required
                        className="input-field" 
                        value={profileForm.name} 
                        onChange={(e) => setProfileForm({...profileForm, name: e.target.value})} 
                      />
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="block text-sm font-medium text-loft-300">Phone Number</label>
                        {user?.isPhoneVerified && (
                          <span className="text-xs bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded font-medium border border-emerald-500/30">
                            Verified
                          </span>
                        )}
                      </div>
                      <input 
                        type="tel" 
                        required
                        readOnly={Boolean(user?.isPhoneVerified)}
                        disabled={Boolean(user?.isPhoneVerified)}
                        className={`input-field ${user?.isPhoneVerified ? 'opacity-60 cursor-not-allowed bg-loft-800/50' : ''}`}
                        value={profileForm.phone} 
                        onChange={(e) => setProfileForm({...profileForm, phone: e.target.value})} 
                      />
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="block text-sm font-medium text-loft-300">Email Address</label>
                        {(user?.googleId || user?.isEmailVerified) && (
                          <span className="text-xs bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded font-medium border border-emerald-500/30">
                            Verified
                          </span>
                        )}
                      </div>
                      <input 
                        type="email" 
                        readOnly={Boolean(user?.googleId || user?.isEmailVerified)}
                        disabled={Boolean(user?.googleId || user?.isEmailVerified)}
                        className={`input-field ${(user?.googleId || user?.isEmailVerified) ? 'opacity-60 cursor-not-allowed bg-loft-800/50' : ''}`} 
                        value={profileForm.email} 
                        onChange={(e) => setProfileForm({...profileForm, email: e.target.value})} 
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-loft-300 mb-2">City</label>
                      <input 
                        type="text" 
                        placeholder="e.g. Pune"
                        className="input-field" 
                        value={profileForm.city} 
                        onChange={(e) => setProfileForm({...profileForm, city: e.target.value})} 
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-loft-300 mb-2">State</label>
                      <input 
                        type="text" 
                        placeholder="e.g. Maharashtra"
                        className="input-field" 
                        value={profileForm.state} 
                        onChange={(e) => setProfileForm({...profileForm, state: e.target.value})} 
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-loft-300 mb-2">Full Address</label>
                      <textarea 
                        rows="3"
                        placeholder="Enter complete street address, flat/building, area, pincode"
                        className="input-field resize-none" 
                        value={profileForm.address} 
                        onChange={(e) => setProfileForm({...profileForm, address: e.target.value})} 
                      />
                    </div>
                  </div>
                  <div className="flex justify-end pt-4">
                    <button type="submit" disabled={profileState.loading} className="btn-primary py-3 px-8 text-sm disabled:opacity-50">
                      {profileState.loading ? 'Saving...' : 'Save Changes'}
                    </button>
                  </div>
                </form>

                {/* Change Password Card */}
                <div className="mt-12 pt-8 border-t border-loft-800">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-copper-500/10 rounded-lg text-copper-400">
                      <Lock className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-xl font-bold text-loft-50">Change Password</h4>
                      <p className="text-xs text-loft-400">Update your account login password or set a new one</p>
                    </div>
                  </div>

                  {passwordState.error && (
                    <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg text-sm flex items-center gap-2">
                      <AlertCircle className="w-5 h-5 flex-shrink-0" />
                      <span>{passwordState.error}</span>
                    </div>
                  )}
                  {passwordState.success && (
                    <div className="mb-6 p-4 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-lg text-sm flex items-center gap-2">
                      <CheckCircle className="w-5 h-5 flex-shrink-0" />
                      <span>{passwordState.success}</span>
                    </div>
                  )}

                  <form onSubmit={handlePasswordChange} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-loft-300 mb-2">Current Password</label>
                        <div className="relative">
                          <input 
                            type={showCurrentPassword ? "text" : "password"} 
                            placeholder="Current password (if set)"
                            className="input-field pr-10" 
                            value={passwordForm.currentPassword} 
                            onChange={(e) => setPasswordForm({...passwordForm, currentPassword: e.target.value})} 
                          />
                          <button
                            type="button"
                            onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-loft-400 hover:text-loft-200 transition-colors focus:outline-none"
                            aria-label={showCurrentPassword ? "Hide current password" : "Show current password"}
                          >
                            {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-loft-300 mb-2">New Password</label>
                        <div className="relative">
                          <input 
                            type={showNewPassword ? "text" : "password"} 
                            required
                            placeholder="At least 6 characters"
                            className="input-field pr-10" 
                            value={passwordForm.newPassword} 
                            onChange={(e) => setPasswordForm({...passwordForm, newPassword: e.target.value})} 
                          />
                          <button
                            type="button"
                            onClick={() => setShowNewPassword(!showNewPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-loft-400 hover:text-loft-200 transition-colors focus:outline-none"
                            aria-label={showNewPassword ? "Hide new password" : "Show new password"}
                          >
                            {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-loft-300 mb-2">Confirm New Password</label>
                        <div className="relative">
                          <input 
                            type={showConfirmPassword ? "text" : "password"} 
                            required
                            placeholder="Repeat new password"
                            className="input-field pr-10" 
                            value={passwordForm.confirmPassword} 
                            onChange={(e) => setPasswordForm({...passwordForm, confirmPassword: e.target.value})} 
                          />
                          <button
                            type="button"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-loft-400 hover:text-loft-200 transition-colors focus:outline-none"
                            aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
                          >
                            {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>
                    </div>
                    <div className="flex justify-end pt-2">
                      <button 
                        type="submit" 
                        disabled={passwordState.loading || !passwordForm.newPassword} 
                        className="btn-secondary py-3 px-8 text-sm disabled:opacity-50 hover:border-copper-500/60"
                      >
                        {passwordState.loading ? 'Updating...' : 'Update Password'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>

      {/* Add Address Modal (Mock) */}
      <AnimatePresence>
        {isAddAddressOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-loft-950/80 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="card w-full max-w-md p-6"
            >
              <h3 className="text-xl font-bold text-loft-50 mb-6">Add New Address</h3>
              
              {addressFormError && (
                <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg text-sm flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{addressFormError}</span>
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-loft-200 mb-1">Label (e.g. Home, Office, Warehouse)</label>
                  <input type="text" className="input-field" placeholder="Enter label" value={newAddress.label} onChange={(e) => setNewAddress({...newAddress, label: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-loft-200 mb-1">Street Address</label>
                  <AutocompleteLocationInput 
                    value={newAddress.street}
                    onChange={(val) => {
                      const detected = getPunePincode(val);
                      setNewAddress(prev => ({
                        ...prev,
                        street: val,
                        ...(detected ? { postalCode: detected } : {})
                      }));
                    }}
                    onSelectDetails={(loc) => {
                      const detected = loc.postalCode || 
                                       getPunePincode(loc.display_name || loc.raw?.display_name || newAddress.street, loc.raw || loc);
                      setNewAddress(prev => ({
                        ...prev,
                        city: 'Pune',
                        postalCode: detected || prev.postalCode || '411001'
                      }));
                    }}
                    placeholder="Search area, landmark or street in Pune"
                    cityLimit="pune"
                    iconColor="text-copper-500"
                  />
                  <p className="text-[11px] text-loft-400 mt-1">Suggestions restricted to Pune &amp; PCMC metropolitan areas</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-loft-200 mb-1">City</label>
                    <input type="text" className="input-field bg-loft-900/60 cursor-not-allowed" readOnly placeholder="Pune" value={newAddress.city} />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-sm font-medium text-loft-200">Postal Code</label>
                      {newAddress.postalCode && (
                        <span className="text-[11px] text-copper-400 font-mono">Auto-detected</span>
                      )}
                    </div>
                    <input 
                      type="text" 
                      maxLength={6}
                      className="input-field font-mono" 
                      placeholder="e.g. 411038" 
                      value={newAddress.postalCode} 
                      onChange={(e) => {
                        const numericOnly = e.target.value.replace(/\D/g, '').slice(0, 6);
                        setNewAddress(prev => ({ ...prev, postalCode: numericOnly }));
                      }} 
                    />
                  </div>
                </div>
              </div>
              
              <div className="flex gap-4 mt-8">
                <button 
                  onClick={() => { setIsAddAddressOpen(false); setAddressFormError(''); }}
                  className="btn-secondary w-full"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleSaveAddress}
                  className="btn-primary w-full"
                  disabled={isSavingAddress || !newAddress.label || !newAddress.street}
                >
                  {isSavingAddress ? 'Saving...' : 'Save Address'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Cancel Booking Confirmation Modal */}
      <AnimatePresence>
        {cancelModalBooking && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-loft-950/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="card w-full max-w-md p-6 border border-red-500/30 shadow-2xl"
            >
              <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-4 text-red-400 mx-auto">
                <AlertCircle className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-loft-50 text-center mb-1">Cancel Delivery Booking?</h3>
              <p className="text-xs text-loft-300 text-center mb-4 leading-relaxed">
                Booking Reference <span className="font-mono text-copper-400 font-bold">#{cancelModalBooking.id?.slice(0, 8).toUpperCase()}</span>.
                If any payment was already deducted, it will be automatically and immediately refunded to your wallet balance.
              </p>
              
              <div className="mb-4">
                <label className="block text-xs font-medium text-loft-300 mb-1">Reason for Cancellation (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g., Changed plans, driver not needed"
                  value={cancelReasonText}
                  onChange={(e) => setCancelReasonText(e.target.value)}
                  className="input-field text-xs py-2"
                />
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  disabled={cancellingBookingId === cancelModalBooking.id}
                  onClick={() => { setCancelModalBooking(null); setCancelReasonText(''); }}
                  className="btn-secondary w-full py-2.5 text-xs"
                >
                  Keep Booking
                </button>
                <button
                  type="button"
                  disabled={cancellingBookingId === cancelModalBooking.id}
                  onClick={() => handleCancelBooking(cancelModalBooking.id, cancelReasonText)}
                  className="w-full py-2.5 text-xs font-semibold rounded-xl bg-red-600 hover:bg-red-500 text-white transition-colors flex items-center justify-center gap-1.5 shadow-lg shadow-red-600/20 disabled:opacity-50"
                >
                  {cancellingBookingId === cancelModalBooking.id ? (
                    <span className="flex items-center gap-1.5">
                      <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                      Cancelling...
                    </span>
                  ) : (
                    'Yes, Cancel Booking'
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Trip Details Modal (Interactive Mini Route Map, Live Driver & Consignment Details) */}
      <TripDetailsModal
        trip={selectedTrip}
        isOpen={Boolean(selectedTrip)}
        onClose={() => setSelectedTrip(null)}
        onCancelBooking={(trip) => setCancelModalBooking(trip)}
      />

      {/* Add Funds to Wallet Modal */}
      <AnimatePresence>
        {showAddFundsModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-loft-900 border border-copper-500/30 rounded-2xl max-w-md w-full overflow-hidden shadow-2xl relative"
            >
              {/* Header */}
              <div className="p-6 border-b border-loft-800 flex items-center justify-between bg-loft-950/40">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-copper-500/10 border border-copper-500/20 text-copper-400 flex items-center justify-center">
                    <Wallet className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-loft-50">Add Funds to Wallet</h3>
                    <p className="text-xs text-loft-400">Instant recharge via Razorpay</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => !isProcessingTopup && setShowAddFundsModal(false)}
                  disabled={isProcessingTopup}
                  className="p-2 text-loft-400 hover:text-loft-100 hover:bg-loft-800 rounded-lg transition-colors"
                  aria-label="Close modal"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Form Content */}
              <form onSubmit={handleTopup} className="p-6 space-y-5">
                {/* Available Balance Pill */}
                <div className="flex items-center justify-between p-3 rounded-xl bg-loft-950/60 border border-loft-800/80">
                  <span className="text-xs text-loft-400 font-medium">Current Balance</span>
                  <span className="text-sm font-bold text-copper-400">
                    ₹{getDisplayBalance()}
                  </span>
                </div>

                {/* Amount input */}
                <div>
                  <label className="block text-xs font-semibold text-loft-300 uppercase tracking-wider mb-2">
                    Enter Amount (₹)
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl font-bold text-copper-400">₹</span>
                    <input
                      type="number"
                      min="10"
                      max="100000"
                      value={topupAmount}
                      onChange={(e) => {
                        setTopupAmount(e.target.value);
                        setTopupError('');
                      }}
                      placeholder="e.g. 500"
                      className="input-field pl-9 pr-4 py-3 text-xl font-bold tracking-wide"
                      required
                      autoFocus
                    />
                  </div>
                  <span className="text-[11px] text-loft-400 mt-1 block">Min ₹10 • Max ₹1,00,000</span>
                </div>

                {/* Quick Selection Chips */}
                <div>
                  <label className="block text-xs font-medium text-loft-400 mb-2">Quick Presets</label>
                  <div className="grid grid-cols-4 gap-2">
                    {[200, 500, 1000, 2000].map((preset) => (
                      <button
                        type="button"
                        key={preset}
                        onClick={() => {
                          setTopupAmount(String(preset));
                          setTopupError('');
                        }}
                        className={`py-2 px-3 rounded-lg text-xs font-semibold border transition-all ${
                          topupAmount === String(preset)
                            ? 'bg-copper-500/20 border-copper-500 text-copper-300 shadow-sm'
                            : 'bg-loft-950/40 border-loft-800 text-loft-300 hover:border-loft-700 hover:text-loft-100'
                        }`}
                      >
                        +₹{preset}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Payment Options Banner */}
                <div className="p-3.5 rounded-xl bg-loft-950/40 border border-loft-800 space-y-2">
                  <div className="flex items-center gap-2 text-xs font-semibold text-loft-200">
                    <CreditCard className="w-4 h-4 text-copper-400" />
                    <span>Payment Methods Available</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 text-[11px] text-loft-400">
                    <span className="px-2 py-0.5 rounded bg-loft-800/60 border border-loft-700/50">UPI (GPay, PhonePe, Paytm)</span>
                    <span className="px-2 py-0.5 rounded bg-loft-800/60 border border-loft-700/50">Credit / Debit Cards</span>
                    <span className="px-2 py-0.5 rounded bg-loft-800/60 border border-loft-700/50">NetBanking</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px] text-loft-400 pt-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-moss-400" />
                    <span>Secured with 256-bit Razorpay encryption</span>
                  </div>
                </div>

                {/* Error Banner */}
                {topupError && (
                  <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <span>{topupError}</span>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowAddFundsModal(false)}
                    disabled={isProcessingTopup}
                    className="btn-secondary flex-1 py-3 text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isProcessingTopup || !topupAmount || parseFloat(topupAmount) < 10}
                    className="btn-primary flex-1 py-3 text-sm flex items-center justify-center gap-2"
                  >
                    {isProcessingTopup ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Opening Razorpay...</span>
                      </>
                    ) : (
                      <>
                        <span>Proceed to Pay ₹{topupAmount || '0'}</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Review Modal */}
      {reviewTrip && (
        <ReviewModal
          isOpen={isReviewModalOpen}
          onClose={() => {
            setIsReviewModalOpen(false);
            setReviewedBookings((prev) => ({ ...prev, [reviewTrip.id]: 5 }));
            setReviewTrip(null);
          }}
          bookingId={reviewTrip.id}
          driverId={reviewTrip.driverId}
          driverName={reviewTrip.driverName}
        />
      )}

    </div>
  );
};

export default CustomerDashboard;

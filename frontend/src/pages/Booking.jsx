import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Calendar, Clock, Box, ShieldCheck, Tag, Shield, Crown,
  Mic, MicOff, Sparkles, X, Leaf, Bookmark, MapPin, Wallet,
  Plus, CheckCircle, AlertTriangle, AlertCircle, RefreshCw, ExternalLink, Truck
} from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import api from '../services/api';
import AutocompleteLocationInput from '../components/Customer/Booking/AutocompleteLocationInput';
import RouteMapPreview from '../components/Customer/Booking/RouteMapPreview';
import { bookingLocationsSchema, bookingDetailsSchema, VEHICLE_CAPACITIES } from '../utils/formSchemas';
import AuthModal from '../components/Auth/AuthModal';
import { geocodeAddress, fetchOsrmRoute } from '../utils/puneGeocoder';

const Booking = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useSelector((state) => state.auth);
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  
  const [promoCode, setPromoCode] = useState('');
  const [discount, setDiscount] = useState(0);
  const [promoMessage, setPromoMessage] = useState(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [savedAddresses, setSavedAddresses] = useState([]);
  const [pickupCoord, setPickupCoord] = useState(null);
  const [dropCoords, setDropCoords] = useState([]);
  const [walletBalance, setWalletBalance] = useState(null);
  const [_isLoadingWallet, setIsLoadingWallet] = useState(false);

  // Auto-calculated distance from map route
  const [isCalculatingDistance, setIsCalculatingDistance] = useState(false);
  const [distanceCalculatedByMap, setDistanceCalculatedByMap] = useState(false);
  const [lastRouteInfo, setLastRouteInfo] = useState(null);

  // In-booking Wallet Top-up state
  const [showWalletTopupModal, setShowWalletTopupModal] = useState(false);
  const [topupAmount, setTopupAmount] = useState('500');
  const [isProcessingTopup, setIsProcessingTopup] = useState(false);
  const [topupError, setTopupError] = useState('');
  const [topupSuccess, setTopupSuccess] = useState('');
  const safeTopupAmount = (() => {
    const parsed = Number(topupAmount);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 500;
  })();
  
  // Fetch saved addresses for quick selection
  useEffect(() => {
    if (user?.id) {
      api.get('/api/address')
        .then(res => {
          if (Array.isArray(res.data)) {
            setSavedAddresses(res.data);
          }
        })
        .catch(err => console.warn('Could not load saved addresses:', err.message));
    }
  }, [user?.id]);

  // Fetch wallet balance for user
  const fetchWalletBalance = useCallback(async () => {
    if (!user?.id) return;
    setIsLoadingWallet(true);
    try {
      const res = await api.get('/api/wallet');
      const bal = res.data?.wallet?.balance ?? res.data?.balance ?? 0;
      setWalletBalance(parseFloat(bal) || 0);
    } catch (err) {
      console.warn('Could not load wallet balance:', err.message);
      setWalletBalance(0);
    } finally {
      setIsLoadingWallet(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchWalletBalance();

    const handleFocus = () => {
      fetchWalletBalance();
    };
    window.addEventListener('focus', handleFocus);
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        fetchWalletBalance();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [fetchWalletBalance]);

  // Gamification States
  const [hasInsurance, setHasInsurance] = useState(false);
  const isPro = Boolean(user?.isPro);

  // AI Voice Booking States
  const [showVoiceModal, setShowVoiceModal] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [voiceTranscript, setVoiceTranscript] = useState('');
  const [voiceError, setVoiceError] = useState('');
  const [isVoiceSubmitting, setIsVoiceSubmitting] = useState(false);
  const [aiParsedBooking, setAiParsedBooking] = useState(null);
  const [isAiReviewStep, setIsAiReviewStep] = useState(false);
  const [isAiRecalculating, setIsAiRecalculating] = useState(false);
  const recognitionRef = useRef(null);
  const todayStr = (() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  })();

  const maxBookingDateStr = (() => {
    const d = new Date();
    const currentMonth = d.getMonth();
    d.setMonth(currentMonth + 1);
    if (d.getMonth() > (currentMonth + 1) % 12) {
      d.setDate(0);
    }
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  })();
  
  const [formData, setFormData] = useState({
    pickup: '',
    drops: [''], // Array of drop-off addresses
    totalDistance: 15, // Default 15km
    date: todayStr,
    time: '',
    goodsType: '',
    weight: location.state?.weight ? String(location.state.weight) : '',
    tempoType: (location.state?.selectedTempo || location.state?.tempoType) && ['small', 'medium', 'large'].includes(location.state?.selectedTempo || location.state?.tempoType)
      ? (location.state.selectedTempo || location.state.tempoType)
      : 'small', // small, medium, large
    bookingMode: 'dedicated', // dedicated, shared
    isRoundTrip: false,
    waitingTimeHours: 1,
    phone: user?.phone ? String(user.phone).replace(/\D/g, '').slice(-10) : '',
    paymentMethod: 'online'
  });

  useEffect(() => {
    if (user?.phone && !formData.phone) {
      const cleanPhone = String(user.phone).replace(/\D/g, '').slice(-10);
      setFormData(prev => ({ ...prev, phone: cleanPhone }));
    }
  }, [user?.phone, formData.phone]);

  useEffect(() => {
    if (location.state?.selectedTempo || location.state?.tempoType || location.state?.weight) {
      const tempo = location.state.selectedTempo || location.state.tempoType;
      const weight = location.state.weight;
      setFormData(prev => ({
        ...prev,
        ...(tempo && ['small', 'medium', 'large'].includes(tempo) ? { tempoType: tempo } : {}),
        ...(weight ? { weight: String(weight) } : {})
      }));
    }
  }, [location.state]);

  // Smart Pricing Engine (Dynamic Surge)
  const calculateSurge = () => {
    if (formData.date && formData.time) {
      const dateObj = new Date(formData.date);
      const day = dateObj.getDay(); // 5 = Friday
      const hour = parseInt(formData.time.split(':')[0], 10);
      
      // Friday between 5 PM and 8 PM (17:00 - 20:00)
      if (day === 5 && hour >= 17 && hour <= 20) {
        return 1.5;
      }
    }
    return 1.0;
  };
  const surgeMultiplier = calculateSurge();

  const getEsgEmissions = () => {
    const distance = parseFloat(formData.totalDistance) || 15;
    const rate = formData.tempoType === 'large' ? 350 : (formData.tempoType === 'medium' ? 200 : 120);
    return ((distance * rate) / 1000).toFixed(2);
  };

  const startListening = () => {
    setVoiceError('');
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setVoiceError('Speech recognition is not supported in this browser. You can type your request directly.');
      return;
    }
    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = 'en-IN';

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        setVoiceTranscript(transcript);
      };

      recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
        if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
          setVoiceError('Microphone access denied. UI fallback to manual text entry.');
        } else if (event.error === 'aborted') {
          setVoiceError('Microphone input was interrupted. UI fallback to manual text entry.');
        } else if (event.error === 'network') {
          setVoiceError('Network error during speech recognition. UI fallback to manual text entry.');
        } else {
          setVoiceError(`Voice recognition: ${event.error}. UI fallback to manual text entry.`);
        }
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (e) {
      console.error(e);
      if (e.name === 'NotAllowedError' || (e.message && e.message.toLowerCase().includes('denied'))) {
        setVoiceError('Microphone access denied. UI fallback to manual text entry.');
      } else {
        setVoiceError('Could not start microphone. UI fallback to manual text entry.');
      }
      setIsListening(false);
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  };

  const closeVoiceModal = () => {
    stopListening();
    setShowVoiceModal(false);
    setAiParsedBooking(null);
    setIsAiReviewStep(false);
    setIsAiRecalculating(false);
    setVoiceError('');
  };

  const handleVoiceBookingSubmit = async () => {
    if (!voiceTranscript.trim()) {
      setVoiceError('Please speak or type a booking prompt first.');
      return;
    }
    setIsVoiceSubmitting(true);
    setVoiceError('');
    try {
      const res = await api.post('/api/bookings/ai-booking', {
        transcript: voiceTranscript,
        customerId: user?.id,
        previewOnly: true
      });

      // Backwards-compatible check: if a test mock directly created a booking with ID and not previewOnly
      if (res.data?.booking?.id && !res.data?.previewOnly) {
        closeVoiceModal();
        navigate(`/tracking/${res.data.booking.id}`);
        return;
      }

      const parsedData = res.data?.parsed || res.data?.booking;
      if (parsedData) {
        setAiParsedBooking(parsedData);
        setIsAiReviewStep(true);
      } else {
        setVoiceError('Could not analyze booking details from prompt. Please review your text or type manually.');
      }
    } catch (err) {
      console.error('Voice booking error:', err);
      if (err.response?.status === 401) {
        setVoiceError('Please log in to preview your AI booking.');
      } else {
        setVoiceError(err.response?.data?.message || 'Voice analysis failed. Please try again.');
      }
    } finally {
      setIsVoiceSubmitting(false);
    }
  };

  const handleConfirmAiBooking = async () => {
    if (!aiParsedBooking) return;
    setIsVoiceSubmitting(true);
    setVoiceError('');
    try {
      const res = await api.post('/api/bookings/ai-booking', {
        transcript: voiceTranscript,
        customerId: user?.id,
        previewOnly: false,
        confirmedDetails: aiParsedBooking
      });

      if (res.data?.booking?.id) {
        closeVoiceModal();
        navigate(`/tracking/${res.data.booking.id}`);
      } else {
        setVoiceError('Could not place booking. Please try again or use the main booking form.');
      }
    } catch (err) {
      console.error('Confirm AI booking error:', err);
      setVoiceError(err.response?.data?.message || 'Booking confirmation failed. Please try again.');
    } finally {
      setIsVoiceSubmitting(false);
    }
  };

  const handleApplyVoiceToForm = () => {
    if (aiParsedBooking) {
      setFormData(prev => ({
        ...prev,
        pickup: aiParsedBooking.pickupAddress || prev.pickup,
        drops: [aiParsedBooking.dropAddress || (prev.drops[0] || '')],
        tempoType: aiParsedBooking.tempoType || prev.tempoType,
        goodsType: aiParsedBooking.goodsType || prev.goodsType,
        weight: String(aiParsedBooking.weight || prev.weight),
        date: aiParsedBooking.date || prev.date,
        time: aiParsedBooking.time?.slice(0, 5) || prev.time,
        totalDistance: aiParsedBooking.totalDistance || prev.totalDistance
      }));
      closeVoiceModal();
      return;
    }

    if (!voiceTranscript.trim()) return;
    const lower = voiceTranscript.toLowerCase();
    
    let detectedType = formData.tempoType;
    if (lower.includes('large')) detectedType = 'large';
    else if (lower.includes('medium')) detectedType = 'medium';
    else if (lower.includes('small')) detectedType = 'small';

    const match = voiceTranscript.match(/(?:from|for)\s+(.+?)\s+to\s+(.+)/i);
    if (match) {
      const cleanDrop = match[2].replace(/\s+(tomorrow|today|morning|evening|night|now|afternoon)/i, '').trim();
      setFormData(prev => ({
        ...prev,
        pickup: match[1].trim(),
        drops: [cleanDrop || match[2].trim()],
        tempoType: detectedType
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        tempoType: detectedType
      }));
    }
    closeVoiceModal();
  };

  // Live route distance and dynamic fare recalculation in AI Confirmation modal
  const aiPickup = aiParsedBooking?.pickupAddress;
  const aiDrop = aiParsedBooking?.dropAddress;
  const aiTempo = aiParsedBooking?.tempoType;
  const hasAiBooking = Boolean(aiParsedBooking);

  useEffect(() => {
    if (!isAiReviewStep || !hasAiBooking) return;
    const pAddr = aiPickup?.trim();
    const dAddr = aiDrop?.trim();
    if (!pAddr || !dAddr || pAddr.length < 2 || dAddr.length < 2) return;

    const timer = setTimeout(async () => {
      try {
        setIsAiRecalculating(true);
        const [pGeo, dGeo] = await Promise.all([
          geocodeAddress(pAddr),
          geocodeAddress(dAddr)
        ]);

        if (pGeo && dGeo) {
          const route = await fetchOsrmRoute([pGeo, dGeo]);
          if (route && route.distanceKm > 0) {
            const dist = parseFloat(route.distanceKm.toFixed(1));
            const tempo = aiTempo || 'small';
            let fare = 300 + (dist * 20);
            if (tempo === 'large') fare = 800 + (dist * 50);
            else if (tempo === 'medium') fare = 500 + (dist * 35);
            fare = Math.round(fare);

            setAiParsedBooking(prev => {
              if (!prev) return prev;
              if (prev.totalDistance === dist && prev.estimatedFare === fare && prev.pickupLat === pGeo.lat && prev.dropLat === dGeo.lat) {
                return prev;
              }
              const emissionRate = tempo === 'large' ? 350 : (tempo === 'medium' ? 200 : 120);
              const esg = parseFloat(((dist * emissionRate) / 1000).toFixed(2));
              return {
                ...prev,
                pickupLat: pGeo.lat,
                pickupLng: pGeo.lng,
                dropLat: dGeo.lat,
                dropLng: dGeo.lng,
                totalDistance: dist,
                estimatedFare: fare,
                esgEmissions: esg
              };
            });
          }
        }
      } catch (err) {
        console.warn('AI modal route recalculation notice:', err);
      } finally {
        setIsAiRecalculating(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [isAiReviewStep, hasAiBooking, aiPickup, aiDrop, aiTempo]);

  // Contact phone number live validation helper
  const getPhoneValidationStatus = useCallback(() => {
    const raw = (formData.phone || '').trim();
    if (!raw) {
      return { status: 'empty', message: 'Required for live OTP & driver arrival coordination', isValid: false };
    }
    if (raw.length < 10) {
      return { 
        status: 'incomplete', 
        message: `${raw.length}/10 digits entered (${10 - raw.length} more needed)`, 
        isValid: false 
      };
    }
    if (!/^[6-9]/.test(raw)) {
      return { 
        status: 'invalid', 
        message: 'Must begin with 6, 7, 8, or 9 (standard Indian mobile)', 
        isValid: false 
      };
    }
    return { status: 'valid', message: 'Verified 10-digit mobile number', isValid: true };
  }, [formData.phone]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === 'phone') {
      // Strictly restrict to digits only and maximum 10 digits
      const sanitized = value.replace(/\D/g, '').slice(0, 10);
      setFormData(prev => ({ ...prev, phone: sanitized }));
      if (error && (error.toLowerCase().includes('phone') || error.toLowerCase().includes('mobile'))) {
        setError('');
      }
      return;
    }
    if (name === 'date') {
      if (value && value < todayStr) {
        setError('Booking date cannot be in the past. Please select today or a future date.');
        setFormData(prev => ({ ...prev, date: todayStr }));
        return;
      }
      if (value && value > maxBookingDateStr) {
        setError('Advance booking is limited to 1 month only.');
        setFormData(prev => ({ ...prev, date: maxBookingDateStr }));
        return;
      }
      setError('');
    }
    if (name === 'weight') {
      const numWeight = parseFloat(value);
      let autoTempo = formData.tempoType;
      // Intelligently auto-select suitable vehicle if entered weight exceeds smaller vehicle limits
      if (numWeight > 1500 && numWeight <= 5000 && autoTempo !== 'large') {
        autoTempo = 'large';
      } else if (numWeight > 750 && numWeight <= 1500 && autoTempo === 'small') {
        autoTempo = 'medium';
      }
      setFormData(prev => ({ ...prev, weight: value, tempoType: autoTempo }));
      if (error && error.includes('exceeds maximum capacity')) {
        setError('');
      }
      return;
    }
    if (name === 'tempoType') {
      setFormData(prev => ({ ...prev, tempoType: value }));
      if (error && error.includes('exceeds maximum capacity')) {
        setError('');
      }
      return;
    }
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleDropChange = (index, value) => {
    const newDrops = [...formData.drops];
    newDrops[index] = value;
    setFormData({ ...formData, drops: newDrops });
    setDropCoords((prev) => {
      const copy = [...prev];
      copy[index] = null;
      return copy;
    });
  };

  const handleDropSelect = (index, loc) => {
    setDropCoords((prev) => {
      const copy = [...prev];
      copy[index] = { lat: loc.lat, lng: loc.lng };
      return copy;
    });
  };

  const addDrop = () => {
    setFormData({ ...formData, drops: [...formData.drops, ''] });
    setDropCoords((prev) => [...prev, null]);
  };

  const removeDrop = (index) => {
    const newDrops = [...formData.drops];
    newDrops.splice(index, 1);
    setFormData({ ...formData, drops: newDrops });
    setDropCoords((prev) => {
      const copy = [...prev];
      copy.splice(index, 1);
      return copy;
    });
  };

  // Live Map Road Route Distance Calculator
  const calculateRouteFromMap = useCallback(async (pickupStr, dropsArr) => {
    const pStr = (typeof pickupStr === 'string' ? pickupStr : formData.pickup)?.trim();
    const dArr = Array.isArray(dropsArr) ? dropsArr : formData.drops;
    const validDrops = (dArr || []).filter(d => typeof d === 'string' && d.trim().length > 0);

    if (!pStr || validDrops.length === 0) return null;

    setIsCalculatingDistance(true);
    try {
      let pCoord = pickupCoord;
      if (!pCoord || !pCoord.lat || !pCoord.lng) {
        pCoord = await geocodeAddress(pStr);
      }
      if (!pCoord) {
        setIsCalculatingDistance(false);
        return null;
      }

      const dCoords = [];
      for (let i = 0; i < validDrops.length; i++) {
        let dc = dropCoords[i];
        if (!dc || !dc.lat || !dc.lng) {
          dc = await geocodeAddress(validDrops[i]);
        }
        if (dc) dCoords.push(dc);
      }

      if (dCoords.length === 0) {
        setIsCalculatingDistance(false);
        return null;
      }

      const route = await fetchOsrmRoute([pCoord, ...dCoords]);
      if (route && route.distanceKm > 0) {
        setFormData(prev => ({
          ...prev,
          totalDistance: route.distanceKm
        }));
        setDistanceCalculatedByMap(true);
        setLastRouteInfo({
          distanceKm: route.distanceKm,
          durationMins: route.durationMins,
          isFallback: route.isFallback
        });
        return route;
      }
    } catch (err) {
      console.warn('Map route distance calculation notice:', err);
    } finally {
      setIsCalculatingDistance(false);
    }
    return null;
  }, [formData.pickup, formData.drops, pickupCoord, dropCoords]);

  const handleRouteCalculated = useCallback(({ distanceKm, durationMins, isFallback }) => {
    if (distanceKm && distanceKm > 0) {
      setFormData(prev => ({ ...prev, totalDistance: distanceKm }));
      setDistanceCalculatedByMap(true);
      setLastRouteInfo({ distanceKm, durationMins, isFallback });
    }
  }, []);

  const calculateFare = () => {
    // Mock calculation
    const baseRates = { small: 350, medium: 550, large: 1200 };
    let base = baseRates[formData.tempoType] || 0;
    
    // Apply Smart Pricing Surge
    base *= surgeMultiplier;

    // Add ₹150 for each stop after the first one
    const extraStopsCost = Math.max(0, (formData.drops.length - 1) * 150);
    base += extraStopsCost;

    // Round Trip Multiplier (1.8x base distance fare)
    if (formData.isRoundTrip) {
      base *= 1.8;
    }

    // Shared Load Discount (40% off base)
    if (formData.bookingMode === 'shared') {
      base *= 0.6;
    }

    const waitingFee = formData.isRoundTrip ? formData.waitingTimeHours * 100 : 0;
    const insuranceFee = hasInsurance ? 50 : 0;
    
    let total = base + waitingFee + insuranceFee;

    // Eminence Pro Discount (5% off total)
    if (isPro) {
      total *= 0.95;
    }

    if (discount > 0) {
      total -= discount;
    }
    
    return Math.max(0, Math.round(total));
  };

  const openWalletTopup = (presetAmount) => {
    const fare = calculateFare();
    const bal = walletBalance ?? 0;
    const shortfall = Math.max(10, Math.ceil(fare - bal));
    setTopupAmount(String(presetAmount || (shortfall > 0 ? shortfall : 500)));
    setTopupError('');
    setTopupSuccess('');
    setShowWalletTopupModal(true);
  };

  const handleBookingWalletTopup = async (e) => {
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
        description: 'Wallet Refill for Booking',
        order_id: order.id,
        handler: async function (response) {
          try {
            await api.post('/api/wallet/verify-funds', {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              amount: amountNum
            });

            await fetchWalletBalance();
            setShowWalletTopupModal(false);
            setTopupSuccess(`₹${amountNum.toFixed(2)} added to your wallet successfully! Balance updated.`);
            setError('');
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

  const handleApplyPromo = async () => {
    if (!promoCode) return;
    try {
      const res = await api.post('/api/wallet/referral', { referralCode: promoCode });
      const amount = res.data?.discount || 100;
      setDiscount(amount);
      setPromoMessage({ type: 'success', text: res.data?.message || `Promo code applied! ₹${amount} discount added.` });
    } catch (error) {
      setPromoMessage({ type: 'error', text: error.response?.data?.message || 'Invalid code' });
    }
  };

  const handleNext = () => {
    setError('');
    if (step === 1) {
      const val = bookingLocationsSchema.safeParse({
        pickup: formData.pickup,
        drops: formData.drops,
        date: formData.date,
        time: formData.time
      });
      if (!val.success) {
        setError(val.error.issues[0]?.message || 'Please complete all location fields');
        return;
      }
      const cleanPickup = formData.pickup.trim().toLowerCase();
      const isIdentical = formData.drops.some(d => d.trim().toLowerCase() === cleanPickup);
      if (isIdentical) {
        setError('Pickup and drop destinations cannot be identical. Please select a different delivery address.');
        return;
      }

      // Automatically recalculate road distance from map route when moving to vehicle/goods
      if (formData.pickup && formData.drops.some(d => d && d.trim())) {
        calculateRouteFromMap(formData.pickup, formData.drops);
      }
    } else if (step === 2) {
      const val = bookingDetailsSchema.safeParse({
        goodsType: formData.goodsType,
        weight: formData.weight,
        tempoType: formData.tempoType,
        totalDistance: formData.totalDistance
      });
      if (!val.success) {
        setError(val.error.issues[0]?.message || 'Please verify goods and vehicle specifications');
        return;
      }
    }
    setStep(step + 1);
  };
  const handleBack = () => {
    setError('');
    setStep(step - 1);
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) {
      setError('You must be logged in to create a booking. Please sign in first.');
      setShowAuthModal(true);
      return;
    }

    // Contact Phone Number Validation
    const phoneStatus = getPhoneValidationStatus();
    if (!phoneStatus.isValid) {
      setError(phoneStatus.message || 'Please provide a valid 10-digit Indian contact phone number.');
      return;
    }

    const totalFare = calculateFare();

    if (formData.paymentMethod === 'wallet') {
      if (walletBalance !== null && walletBalance < totalFare) {
        setError(`Insufficient wallet balance (₹${walletBalance.toFixed(2)}). Total fare is ₹${totalFare}. Please recharge your wallet or choose another payment method.`);
        return;
      }
    }

    setIsSubmitting(true);
    setError('');
    try {
      const res = await api.post(
        '/api/bookings',
        {
          pickupAddress: formData.pickup,
          dropAddress: formData.drops.join(' → '),
          totalDistance: parseFloat(formData.totalDistance) || 15,
          date: formData.date,
          time: formData.time,
          goodsType: formData.goodsType,
          weight: formData.weight,
          tempoType: formData.tempoType,
          bookingMode: formData.bookingMode,
          isRoundTrip: formData.isRoundTrip,
          estimatedFare: totalFare,
          paymentMethod: formData.paymentMethod,
          phone: formData.phone || user?.phone,
        }
      );
      const bookingId = res.data?.booking?.id;
      
      if (formData.paymentMethod === 'online' && bookingId) {
        const resScript = await loadRazorpayScript();
        if (!resScript) {
          setError('Razorpay SDK failed to load. Please check your connection.');
          setIsSubmitting(false);
          return;
        }

        const orderRes = await api.post('/api/integrations/payment/create-order', { bookingId });
        const { order, keyId } = orderRes.data;
        const razorpayKey = keyId || import.meta.env.VITE_RAZORPAY_KEY_ID;
        if (!razorpayKey) {
          setError('Payment gateway is not configured. Please contact support.');
          setIsSubmitting(false);
          return;
        }

        const options = {
          key: razorpayKey,
          amount: order.amount,
          currency: order.currency,
          name: 'Eminence Logistics',
          description: 'Tempo Booking Payment',
          order_id: order.id,
          handler: async function (response) {
            try {
              await api.post('/api/integrations/payment/verify', {
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature
              });
              navigate(`/tracking/${bookingId}`);
            } catch (_verifyErr) {
              setError('Payment verification failed.');
              setIsSubmitting(false);
            }
          },
          prefill: {
            name: user?.name || 'Customer',
            email: user?.email || 'customer@example.com',
            contact: formData.phone || user?.phone || '',
          },
          theme: { color: '#b87333' },
          modal: { ondismiss: function () { setIsSubmitting(false); } }
        };

        const rzp = new window.Razorpay(options);
        rzp.on('payment.failed', function (response) {
          setError(`Payment failed: ${response.error.description}`);
          setIsSubmitting(false);
        });
        rzp.open();
      } else {
        navigate(`/tracking/${bookingId || 'pending'}`);
      }
    } catch (err) {
      console.error('Booking submission error:', err);
      setError(err.response?.data?.message || 'Unable to create booking. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full pt-12 pb-24 relative min-h-screen">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[500px] bg-[radial-gradient(ellipse_at_top,rgba(85,108,145,0.15),transparent_70%)] pointer-events-none z-0"></div>
      
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center mb-10">
          <h1 className="text-3xl md:text-4xl font-serif font-bold text-loft-50 mb-2">Book a Tempo</h1>
          <p className="text-loft-300">Fill in the details below to instantly book your transport.</p>
        </div>

        {/* Progress Bar */}
        <div className="flex justify-between mb-8 relative">
          <div className="absolute top-1/2 left-0 w-full h-1 bg-loft-800 -translate-y-1/2 z-0"></div>
          <div 
            className="absolute top-1/2 left-0 h-1 bg-copper-500 -translate-y-1/2 z-0 transition-all duration-500"
            style={{ width: `${((step - 1) / 2) * 100}%` }}
          ></div>
          
          {[
            { num: 1, label: 'Locations' },
            { num: 2, label: 'Vehicle & Goods' },
            { num: 3, label: 'Payment' }
          ].map(({ num, label }) => (
            <div key={num} className="flex flex-col items-center relative z-10">
              <div 
                className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-colors ${
                  step >= num ? 'bg-copper-500 text-white shadow-[0_0_15px_rgba(232,99,49,0.4)]' : 'bg-loft-800 text-loft-400'
                }`}
              >
                {num}
              </div>
              <span className={`absolute top-12 text-xs font-medium whitespace-nowrap ${step >= num ? 'text-copper-500' : 'text-loft-400'}`}>
                {label}
              </span>
            </div>
          ))}
        </div>

        <AuthModal
          isOpen={showAuthModal}
          onClose={() => setShowAuthModal(false)}
          onSuccess={() => {
            setError('');
            setShowAuthModal(false);
          }}
          message="Please log in to your account to confirm and process this booking."
        />

        <motion.div className="card p-8 md:p-10">
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-4 rounded-xl mb-6 text-sm font-medium">
              {error}
            </div>
          )}
          <form onSubmit={step === 3 ? handleSubmit : (e) => { e.preventDefault(); handleNext(); }}>
            
            {/* Step 1: Locations */}
            {step === 1 && (
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
                <div className="flex justify-between items-center border-b border-loft-800 pb-2">
                  <h2 className="text-xl font-bold text-loft-50">Where to?</h2>
                  <button
                    type="button"
                    onClick={() => { setShowVoiceModal(true); setVoiceError(''); }}
                    className="flex items-center gap-1.5 text-xs font-semibold text-copper-400 bg-copper-500/10 hover:bg-copper-500/20 px-3 py-1.5 rounded-lg border border-copper-500/30 transition-all cursor-pointer"
                  >
                    <Mic className="w-3.5 h-3.5 text-copper-400" />
                    <span>AI Voice Booking</span>
                  </button>
                </div>

                {/* AI Voice Booking Banner */}
                <div className="p-4 rounded-xl border border-copper-500/30 bg-gradient-to-r from-copper-500/10 via-loft-900 to-loft-950 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-copper-500/20 text-copper-400 flex items-center justify-center flex-shrink-0">
                      <Sparkles className="w-5 h-5 text-copper-400" />
                    </div>
                    <div>
                      <h3 className="font-bold text-loft-50 text-sm flex items-center gap-2">
                        AI Voice Agent <span className="text-[10px] bg-copper-500/20 text-copper-300 px-1.5 py-0.5 rounded font-mono uppercase">Speech to Text</span>
                      </h3>
                      <p className="text-xs text-loft-300">Speak your trip details to auto-fill or book instantly with NLP.</p>
                    </div>
                  </div>
                  <button
                    id="ai-voice-booking-btn"
                    data-testid="ai-voice-booking-btn"
                    type="button"
                    onClick={() => { setShowVoiceModal(true); setVoiceError(''); }}
                    className="btn-primary py-2 px-3 text-xs flex items-center justify-center gap-2 whitespace-nowrap self-start sm:self-auto cursor-pointer"
                  >
                    <Mic className="w-3.5 h-3.5 text-white" /> Start Voice Booking
                  </button>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-loft-200 mb-1">Pickup Address</label>
                  <AutocompleteLocationInput 
                    required={true}
                    value={formData.pickup}
                    onChange={(val) => {
                      setFormData({ ...formData, pickup: val });
                      setPickupCoord(null);
                    }}
                    onSelectDetails={(loc) => {
                      setPickupCoord({ lat: loc.lat, lng: loc.lng });
                    }}
                    cityLimit="pune"
                    placeholder="Enter pickup location in Pune (e.g. BMCC, Deccan)"
                    iconColor="text-moss-500"
                  />
                  {savedAddresses.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5 mt-2">
                      <span className="text-[11px] text-loft-400 font-medium flex items-center gap-1">
                        <Bookmark className="w-3 h-3 text-copper-400" /> Saved:
                      </span>
                      {savedAddresses.map((addr) => {
                        const full = `${addr.street}, ${addr.city} ${addr.postalCode || ''}`.trim();
                        return (
                          <button
                            key={`pickup-saved-${addr.id}`}
                            type="button"
                            onClick={() => {
                              setFormData({ ...formData, pickup: full });
                              if (addr.latitude && addr.longitude) {
                                setPickupCoord({ lat: parseFloat(addr.latitude), lng: parseFloat(addr.longitude) });
                              } else {
                                setPickupCoord(null);
                              }
                            }}
                            className="text-[11px] px-2.5 py-1 rounded-md bg-loft-900 border border-loft-700 hover:border-moss-500 text-loft-200 hover:text-white transition-all flex items-center gap-1 cursor-pointer"
                          >
                            <span>{addr.label?.toLowerCase() === 'home' ? '🏠' : (addr.label?.toLowerCase() === 'office' ? '🏢' : '📍')}</span>
                            <span className="font-semibold text-moss-400">{addr.label}:</span>
                            <span className="truncate max-w-[120px]">{addr.street || addr.city}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
                
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="block text-sm font-medium text-loft-200">Drop Addresses</label>
                    <button type="button" onClick={addDrop} className="text-xs text-copper-500 hover:text-copper-400 font-medium">+ Add Stop</button>
                  </div>
                  <div className="space-y-3">
                    {formData.drops.map((drop, index) => (
                      <div key={index} className="relative flex items-center gap-2">
                        <div className="flex-1">
                          <AutocompleteLocationInput 
                            required={true}
                            value={drop}
                            onChange={(val) => handleDropChange(index, val)}
                            onSelectDetails={(loc) => handleDropSelect(index, loc)}
                            cityLimit="pune"
                            placeholder={`Enter drop location ${index + 1} in Pune (e.g. Wagholi)`}
                            iconColor="text-copper-500"
                          />
                        </div>
                        {formData.drops.length > 1 && (
                          <button type="button" onClick={() => removeDrop(index)} className="p-2 text-loft-400 hover:text-red-400 transition-colors">
                            <span className="text-xl leading-none">×</span>
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                  {savedAddresses.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5 mt-2">
                      <span className="text-[11px] text-loft-400 font-medium flex items-center gap-1">
                        <Bookmark className="w-3 h-3 text-copper-400" /> Saved:
                      </span>
                      {savedAddresses.map((addr) => {
                        const full = `${addr.street}, ${addr.city} ${addr.postalCode || ''}`.trim();
                        return (
                          <button
                            key={`drop-saved-${addr.id}`}
                            type="button"
                            onClick={() => {
                              handleDropChange(0, full);
                              if (addr.latitude && addr.longitude) {
                                setDropCoords((prev) => {
                                  const copy = [...prev];
                                  copy[0] = { lat: parseFloat(addr.latitude), lng: parseFloat(addr.longitude) };
                                  return copy;
                                });
                              }
                            }}
                            className="text-[11px] px-2.5 py-1 rounded-md bg-loft-900 border border-loft-700 hover:border-copper-500 text-loft-200 hover:text-white transition-all flex items-center gap-1 cursor-pointer"
                          >
                            <span>{addr.label?.toLowerCase() === 'home' ? '🏠' : (addr.label?.toLowerCase() === 'office' ? '🏢' : '📍')}</span>
                            <span className="font-semibold text-copper-400">{addr.label}:</span>
                            <span className="truncate max-w-[120px]">{addr.street || addr.city}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Interactive Map Routing Preview (Point A to Point B) */}
                <div className="pt-2">
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-loft-200 flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-copper-400" /> Interactive Route Navigation
                    </label>
                    <span className="text-xs text-loft-400">Live Turn-by-Turn Telematics</span>
                  </div>
                  <RouteMapPreview
                    pickupAddress={formData.pickup}
                    dropAddresses={formData.drops}
                    pickupCoord={pickupCoord}
                    dropCoords={dropCoords}
                    onRouteCalculated={handleRouteCalculated}
                    className="h-[320px]"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-sm font-medium text-loft-200">Date</label>
                      <span className="text-[11px] text-copper-400 font-medium">Max 1 month advance</span>
                    </div>
                    <div className="relative">
                      <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-loft-400 pointer-events-none" />
                      <input 
                        required 
                        name="date" 
                        min={todayStr} 
                        max={maxBookingDateStr}
                        value={formData.date} 
                        onChange={handleChange} 
                        type="date" 
                        className="input-field pl-12" 
                        style={{ colorScheme: 'dark' }} 
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-loft-200 mb-1">Time</label>
                    <div className="relative">
                      <Clock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-loft-400" />
                      <input required name="time" value={formData.time} onChange={handleChange} type="time" className="input-field pl-12" style={{ colorScheme: 'dark' }} />
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-loft-800">
                  <label className="flex items-center gap-3 cursor-pointer p-4 border border-loft-800 rounded-xl bg-loft-950/50 hover:border-copper-500 transition-colors">
                    <input 
                      type="checkbox" 
                      checked={formData.isRoundTrip} 
                      onChange={(e) => setFormData({ ...formData, isRoundTrip: e.target.checked })}
                      className="w-5 h-5 accent-copper-500 rounded border-loft-700 bg-loft-900" 
                    />
                    <div>
                      <span className="font-bold text-loft-50 block">Make this a Round Trip</span>
                      <span className="text-xs text-loft-400">Driver waits at the destination and returns to pickup</span>
                    </div>
                  </label>

                  {formData.isRoundTrip && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="mt-4">
                      <label className="block text-sm font-medium text-loft-200 mb-1">Waiting Time at Destination (Hours)</label>
                      <select 
                        name="waitingTimeHours" 
                        value={formData.waitingTimeHours} 
                        onChange={handleChange}
                        className="input-field"
                      >
                        {[1, 2, 3, 4, 5, 6, 8, 12, 24].map(hours => (
                          <option key={hours} value={hours}>{hours} {hours === 1 ? 'Hour' : 'Hours'} (₹{hours * 100})</option>
                        ))}
                      </select>
                    </motion.div>
                  )}
                </div>

                <button type="submit" className="btn-primary w-full mt-6">Continue to Vehicle & Goods</button>
              </motion.div>
            )}

            {/* Step 2: Goods & Vehicle */}
            {step === 2 && (
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
                <h2 className="text-xl font-bold text-loft-50 mb-4 border-b border-loft-800 pb-2">What are you moving?</h2>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-loft-200 mb-1">Goods Type</label>
                    <div className="relative">
                      <Box className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-loft-400" />
                      <input required name="goodsType" value={formData.goodsType} onChange={handleChange} type="text" className="input-field pl-12" placeholder="e.g. Furniture, Boxes" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-loft-200 mb-1">Approx. Weight (kg)</label>
                    <input required name="weight" value={formData.weight} onChange={handleChange} type="number" className="input-field" placeholder="e.g. 500" />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-sm font-medium text-loft-200">Estimated Distance (km)</label>
                      <button
                        type="button"
                        onClick={() => calculateRouteFromMap(formData.pickup, formData.drops)}
                        disabled={isCalculatingDistance}
                        className="text-xs text-copper-400 hover:text-copper-300 flex items-center gap-1 font-medium transition-colors cursor-pointer"
                        title="Recalculate road distance using live map route"
                      >
                        <RefreshCw className={`w-3 h-3 ${isCalculatingDistance ? 'animate-spin' : ''}`} />
                        <span>Recalculate</span>
                      </button>
                    </div>
                    <div className="relative">
                      <input 
                        required 
                        name="totalDistance" 
                        value={formData.totalDistance} 
                        onChange={handleChange} 
                        type="number" 
                        min="1"
                        step="0.1"
                        className="input-field pr-12" 
                        placeholder="e.g. 10" 
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-loft-400">
                        km
                      </span>
                    </div>

                    {/* Auto-calculated status indicator */}
                    <div className="mt-1.5 flex items-center justify-between text-[11px]">
                      {distanceCalculatedByMap ? (
                        <span className="text-emerald-400 flex items-center gap-1 font-medium">
                          <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          <span>Auto-calculated by map route</span>
                          {lastRouteInfo?.durationMins ? (
                            <span className="text-loft-400 font-normal">
                              (~{lastRouteInfo.durationMins} mins)
                            </span>
                          ) : null}
                        </span>
                      ) : isCalculatingDistance ? (
                        <span className="text-copper-400 flex items-center gap-1 font-medium animate-pulse">
                          <RefreshCw className="w-3.5 h-3.5 animate-spin shrink-0" />
                          <span>Calculating road distance from map...</span>
                        </span>
                      ) : (
                        <span className="text-loft-400 flex items-center gap-1 truncate max-w-[280px]">
                          <span>Route: {formData.pickup ? formData.pickup.split(',')[0] : 'Origin'} → {formData.drops[0] ? formData.drops[0].split(',')[0] : 'Drop'}</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* ESG Carbon Footprint Preview */}
                <div className="p-3.5 bg-moss-500/10 border border-moss-500/25 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-moss-400">
                    <Leaf className="w-4 h-4 text-moss-500" />
                    <span className="text-xs font-semibold">Estimated ESG Carbon Footprint:</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-moss-300 bg-moss-500/20 px-2.5 py-1 rounded border border-moss-500/30">
                      🌿 {getEsgEmissions()} kg CO₂
                    </span>
                    <span className="text-[11px] text-loft-400">
                      ({formData.tempoType === 'large' ? '350g/km' : formData.tempoType === 'medium' ? '200g/km' : '120g/km'})
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-loft-200 mb-3">Select Tempo Type</label>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {['small', 'medium', 'large'].map((type) => {
                      const imgMap = {
                        small: '/images/small_tempo_asset_1787941110706.jpg',
                        medium: '/images/medium_tempo_asset_1787941129862.jpg',
                        large: '/images/large_truck_asset_1787941142605.jpg'
                      };
                      const cap = VEHICLE_CAPACITIES?.[type] || (type === 'small' ? 750 : type === 'medium' ? 1500 : 5000);
                      const enteredWeight = parseFloat(formData.weight) || 0;
                      const isOverweight = enteredWeight > cap;

                      return (
                        <label 
                          key={type} 
                          className={`cursor-pointer border rounded-xl p-4 flex flex-col items-center transition-all overflow-hidden relative group ${
                            formData.tempoType === type 
                              ? 'border-copper-500 bg-copper-500/10 shadow-lg shadow-copper-500/10' 
                              : isOverweight
                              ? 'border-loft-800/60 bg-loft-950/30 opacity-70 hover:opacity-90'
                              : 'border-loft-800 bg-loft-950/50 hover:border-loft-600'
                          }`}
                        >
                          <input type="radio" name="tempoType" value={type} checked={formData.tempoType === type} onChange={handleChange} className="sr-only" />
                          <div className="w-24 h-24 mb-3 rounded-full overflow-hidden border-2 border-transparent group-hover:border-copper-500 transition-colors">
                            <img src={imgMap[type]} alt={`${type} truck`} className="w-full h-full object-cover scale-110" />
                          </div>
                          <span className="font-bold text-loft-50 capitalize">{type}</span>
                          <span className="text-xs text-loft-400 text-center">
                            {type === 'small' ? 'Up to 750kg' : type === 'medium' ? 'Up to 1500kg' : 'Up to 5000kg'}
                          </span>
                          {isOverweight && (
                            <span className="mt-1 text-[10px] text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20 font-medium">
                              Max {cap}kg
                            </span>
                          )}
                        </label>
                      );
                    })}
                  </div>

                  {/* Real-time Weight vs Vehicle Capacity Feedback */}
                  {parseFloat(formData.weight) > (VEHICLE_CAPACITIES?.[formData.tempoType] || 5000) && (
                    <div className="mt-3 p-3 bg-red-500/10 border border-red-500/25 rounded-xl flex items-center gap-2 text-xs text-red-400">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>
                        Cargo weight ({formData.weight}kg) exceeds maximum capacity for {formData.tempoType} vehicle ({VEHICLE_CAPACITIES?.[formData.tempoType] || 5000}kg).
                        {parseFloat(formData.weight) <= 5000 ? ' Please choose a higher capacity vehicle above.' : ' Maximum capacity across all fleet vehicles is 5000kg (Large Truck).'}
                      </span>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-loft-200 mb-3">Booking Mode</label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <label className={`cursor-pointer border rounded-xl p-4 flex items-center gap-3 transition-all ${formData.bookingMode === 'dedicated' ? 'border-copper-500 bg-copper-500/10' : 'border-loft-800 bg-loft-950/50 hover:border-loft-600'}`}>
                      <input type="radio" name="bookingMode" value="dedicated" checked={formData.bookingMode === 'dedicated'} onChange={handleChange} className="sr-only" />
                      <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${formData.bookingMode === 'dedicated' ? 'border-copper-500' : 'border-loft-600'}`}>
                        {formData.bookingMode === 'dedicated' && <div className="w-2 h-2 rounded-full bg-copper-500"></div>}
                      </div>
                      <div>
                        <span className="font-bold text-loft-50 block">Dedicated Truck</span>
                        <span className="text-xs text-loft-400 block">Private, direct, fastest route</span>
                      </div>
                    </label>
                    <label className={`cursor-pointer border rounded-xl p-4 flex items-center gap-3 transition-all ${formData.bookingMode === 'shared' ? 'border-copper-500 bg-copper-500/10' : 'border-loft-800 bg-loft-950/50 hover:border-loft-600'}`}>
                      <input type="radio" name="bookingMode" value="shared" checked={formData.bookingMode === 'shared'} onChange={handleChange} className="sr-only" />
                      <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${formData.bookingMode === 'shared' ? 'border-copper-500' : 'border-loft-600'}`}>
                        {formData.bookingMode === 'shared' && <div className="w-2 h-2 rounded-full bg-copper-500"></div>}
                      </div>
                      <div>
                        <span className="font-bold text-loft-50 block text-copper-400">Shared Load (40% OFF)</span>
                        <span className="text-xs text-loft-400 block">Pool with others, budget-friendly</span>
                      </div>
                    </label>
                  </div>
                </div>

                {/* Cargo Insurance Toggle */}
                <div className="pt-4 border-t border-loft-800">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input 
                      type="checkbox" 
                      className="mt-1 w-5 h-5 accent-copper-500 rounded bg-loft-900 border-loft-700" 
                      checked={hasInsurance} 
                      onChange={() => setHasInsurance(!hasInsurance)} 
                    />
                    <div>
                      <span className="text-loft-50 font-bold flex items-center gap-2">
                        <Shield className="w-4 h-4 text-moss-500" /> Secure Cargo Insurance (+₹50)
                      </span>
                      <p className="text-xs text-loft-400 mt-1">
                        Protect your high-value goods up to ₹50,000 against transit damage instantly.
                      </p>
                    </div>
                  </label>
                </div>

                <div className="flex gap-4 mt-6">
                  <button type="button" onClick={handleBack} className="btn-secondary w-1/3">Back</button>
                  <button type="submit" className="btn-primary w-2/3">Continue to Payment</button>
                </div>
              </motion.div>
            )}

            {/* Step 3: Confirmation & Payment */}
            {step === 3 && (
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
                <h2 className="text-xl font-bold text-loft-50 mb-4 border-b border-loft-800 pb-2">Confirm & Pay</h2>
                
                <div className="bg-loft-950/80 rounded-xl p-6 border border-loft-800 mb-6">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-loft-300">Base Fare ({formData.tempoType}){formData.isRoundTrip ? ' (Round Trip 1.8x)' : ''}</span>
                    <span className="font-medium text-loft-100">
                      ₹{
                        (() => {
                          let base = { small: 350, medium: 550, large: 1200 }[formData.tempoType] || 0;
                          if (formData.isRoundTrip) base *= 1.8;
                          return base;
                        })()
                      }
                    </span>
                  </div>
                  {surgeMultiplier > 1 && (
                    <div className="flex justify-between items-center mb-2 text-yellow-500">
                      <span className="flex items-center gap-2"><span className="text-lg">⚡</span> Smart Pricing Surge ({surgeMultiplier}x)</span>
                      <span className="font-medium">+₹{
                        Math.round((
                          (() => {
                            let base = { small: 350, medium: 550, large: 1200 }[formData.tempoType] || 0;
                            if (formData.isRoundTrip) base *= 1.8;
                            return base;
                          })()
                        ) * (surgeMultiplier - 1))
                      }</span>
                    </div>
                  )}
                  {formData.bookingMode === 'shared' && (
                    <div className="flex justify-between items-center mb-2 text-copper-400">
                      <span className="text-loft-300">Shared Load Discount</span>
                      <span className="font-bold">-40%</span>
                    </div>
                  )}
                  {formData.drops.length > 1 && (
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-loft-300">Multiple Stops Fee ({formData.drops.length - 1} extra)</span>
                      <span className="font-medium">
                        +₹{(formData.drops.length - 1) * 150}
                      </span>
                    </div>
                  )}
                  {formData.isRoundTrip && (
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-loft-300">Waiting Fee ({formData.waitingTimeHours} hrs)</span>
                      <span className="font-medium">+₹{formData.waitingTimeHours * 100}</span>
                    </div>
                  )}
                  {hasInsurance && (
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-loft-300 flex items-center gap-2"><Shield className="w-4 h-4 text-moss-500"/> Cargo Insurance</span>
                      <span className="font-medium text-moss-400">+₹50</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center mb-2 text-moss-400">
                    <span className="text-loft-300 flex items-center gap-1.5"><Leaf className="w-4 h-4 text-moss-500"/> Estimated ESG Footprint</span>
                    <span className="font-mono text-xs font-bold text-moss-400">
                      🌿 {getEsgEmissions()} kg CO₂
                    </span>
                  </div>
                  {surgeMultiplier > 1.0 && (
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-red-400 flex items-center gap-2 font-bold px-2 py-1 bg-red-500/20 border border-red-500/30 rounded-md">🚀 Surge Active ({surgeMultiplier}x)</span>
                      <span className="font-bold text-red-400">High Demand</span>
                    </div>
                  )}
                  {isPro && (
                    <div className="flex justify-between items-center mb-2 text-yellow-500">
                      <span className="text-yellow-500 flex items-center gap-2 font-bold"><Crown className="w-4 h-4"/> Eminence Pro Discount</span>
                      <span className="font-bold">-5%</span>
                    </div>
                  )}
                  {discount > 0 && (
                    <div className="flex justify-between items-center mb-4 pt-4 border-t border-loft-800">
                      <span>Discount Applied</span>
                      <span className="font-bold">-₹{discount}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center mb-4 pt-4 border-t border-loft-800">
                    <span className="text-loft-100 font-bold">Total Fare</span>
                    <span className="text-3xl font-bold text-copper-500">₹{calculateFare()}</span>
                  </div>
                  <div className="flex items-start gap-2 text-sm text-moss-400 mb-2">
                    <ShieldCheck className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <span>Price includes GST, tolls, and insurance. No hidden fees.</span>
                  </div>
                </div>

                {/* Promo Code Section */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-loft-200 mb-2">Have a Referral or Promo Code?</label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Tag className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-loft-400" />
                      <input 
                        type="text" 
                        value={promoCode}
                        onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                        className="input-field pl-12 uppercase" 
                        placeholder="e.g. OMKAR100 or EMINENCE-XYZ123" 
                        disabled={discount > 0}
                      />
                    </div>
                    <button 
                      type="button" 
                      onClick={handleApplyPromo}
                      disabled={discount > 0 || !promoCode}
                      className="btn-secondary whitespace-nowrap"
                    >
                      Apply
                    </button>
                  </div>
                  {promoMessage && (
                    <p className={`mt-2 text-sm font-medium ${promoMessage.type === 'success' ? 'text-moss-500' : 'text-red-500'}`}>
                      {promoMessage.text}
                    </p>
                  )}
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-sm font-medium text-loft-200">
                      Contact Phone Number <span className="text-copper-400">*</span>
                    </label>
                    {user?.phone && formData.phone !== String(user.phone).replace(/\D/g, '').slice(-10) && (
                      <button
                        type="button"
                        onClick={() => {
                          const cleanPhone = String(user.phone).replace(/\D/g, '').slice(-10);
                          setFormData(prev => ({ ...prev, phone: cleanPhone }));
                        }}
                        className="text-xs text-copper-400 hover:text-copper-300 underline transition-colors"
                      >
                        Use account phone ({String(user.phone).slice(-10)})
                      </button>
                    )}
                  </div>
                  
                  <div className="relative flex items-center">
                    {/* Country Code Prefix */}
                    <div className="absolute left-3.5 flex items-center gap-1 text-xs font-semibold text-loft-400 select-none border-r border-loft-700/60 pr-2.5 z-10">
                      <span className="text-sm">🇮🇳</span>
                      <span>+91</span>
                    </div>

                    <input
                      required
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      type="tel"
                      inputMode="numeric"
                      pattern="[0-9]{10}"
                      maxLength={10}
                      className={`input-field pl-20 pr-24 tracking-wide font-mono text-sm transition-all ${
                        getPhoneValidationStatus().isValid
                          ? 'border-moss-500/60 focus:border-moss-400 focus:ring-moss-400/20'
                          : formData.phone.length > 0
                          ? 'border-red-500/50 focus:border-red-400 focus:ring-red-400/20'
                          : 'focus:border-copper-500'
                      }`}
                      placeholder="98765 43210"
                    />

                    {/* Status Badge & Character Counter */}
                    <div className="absolute right-3.5 flex items-center gap-2 pointer-events-none">
                      {getPhoneValidationStatus().isValid ? (
                        <div className="flex items-center gap-1 text-moss-400 text-xs font-semibold bg-moss-950/60 px-2 py-0.5 rounded-full border border-moss-800/60">
                          <CheckCircle className="w-3.5 h-3.5" />
                          <span>10/10</span>
                        </div>
                      ) : (
                        <span className={`text-xs font-mono ${formData.phone.length === 0 ? 'text-loft-500' : 'text-amber-400'}`}>
                          {formData.phone.length}/10
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Dynamic Status / Helper Message */}
                  <div className="mt-1.5 flex items-center gap-1.5 text-xs">
                    {getPhoneValidationStatus().isValid ? (
                      <span className="text-moss-400 flex items-center gap-1">
                        <CheckCircle className="w-3.5 h-3.5" /> Ready for OTP delivery and driver trip coordination.
                      </span>
                    ) : formData.phone.length > 0 ? (
                      <span className="text-red-400 flex items-center gap-1">
                        <AlertTriangle className="w-3.5 h-3.5" /> {getPhoneValidationStatus().message}
                      </span>
                    ) : (
                      <span className="text-loft-400">
                        Driver will contact this number upon pickup arrival. 4-digit OTP will be issued here.
                      </span>
                    )}
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-3">
                    <label className="block text-sm font-medium text-loft-200">Payment Method</label>
                    {user && (
                      <span className="text-xs text-loft-400">
                        Wallet Balance: <strong className="text-copper-400">₹{(walletBalance ?? 0).toFixed(2)}</strong>
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {/* Pay Online */}
                    <label className={`cursor-pointer border rounded-xl p-4 flex flex-col justify-between transition-all ${formData.paymentMethod === 'online' ? 'border-copper-500 bg-copper-500/10 ring-1 ring-copper-500/50' : 'border-loft-800 bg-loft-950/50 hover:border-loft-600'}`}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2.5">
                          <input type="radio" name="paymentMethod" value="online" checked={formData.paymentMethod === 'online'} onChange={handleChange} className="sr-only" />
                          <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${formData.paymentMethod === 'online' ? 'border-copper-500' : 'border-loft-600'}`}>
                            {formData.paymentMethod === 'online' && <div className="w-2 h-2 rounded-full bg-copper-500"></div>}
                          </div>
                          <span className="font-bold text-loft-50 text-sm">Pay Online</span>
                        </div>
                      </div>
                      <p className="text-xs text-loft-400 pl-6.5">UPI, Debit/Credit Card, Net Banking</p>
                    </label>

                    {/* Pay to Driver */}
                    <label className={`cursor-pointer border rounded-xl p-4 flex flex-col justify-between transition-all ${formData.paymentMethod === 'cash' ? 'border-copper-500 bg-copper-500/10 ring-1 ring-copper-500/50' : 'border-loft-800 bg-loft-950/50 hover:border-loft-600'}`}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2.5">
                          <input type="radio" name="paymentMethod" value="cash" checked={formData.paymentMethod === 'cash'} onChange={handleChange} className="sr-only" />
                          <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${formData.paymentMethod === 'cash' ? 'border-copper-500' : 'border-loft-600'}`}>
                            {formData.paymentMethod === 'cash' && <div className="w-2 h-2 rounded-full bg-copper-500"></div>}
                          </div>
                          <span className="font-bold text-loft-50 text-sm">Pay to Driver</span>
                        </div>
                      </div>
                      <p className="text-xs text-loft-400 pl-6.5">Cash on delivery / pay at destination</p>
                    </label>

                    {/* Eminence Wallet */}
                    <label className={`cursor-pointer border rounded-xl p-4 flex flex-col justify-between transition-all ${formData.paymentMethod === 'wallet' ? 'border-copper-500 bg-copper-500/10 ring-1 ring-copper-500/50' : 'border-loft-800 bg-loft-950/50 hover:border-loft-600'}`}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2.5">
                          <input type="radio" name="paymentMethod" value="wallet" checked={formData.paymentMethod === 'wallet'} onChange={handleChange} className="sr-only" />
                          <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${formData.paymentMethod === 'wallet' ? 'border-copper-500' : 'border-loft-600'}`}>
                            {formData.paymentMethod === 'wallet' && <div className="w-2 h-2 rounded-full bg-copper-500"></div>}
                          </div>
                          <span className="font-bold text-loft-50 text-sm flex items-center gap-1.5">
                            <Wallet className="w-3.5 h-3.5 text-copper-400" />
                            Wallet
                          </span>
                        </div>
                        {walletBalance !== null && (
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${walletBalance >= calculateFare() ? 'bg-moss-500/20 text-moss-400 border border-moss-500/30' : 'bg-red-500/20 text-red-400 border border-red-500/30'}`}>
                            {walletBalance >= calculateFare() ? 'Instant' : 'Low'}
                          </span>
                        )}
                      </div>
                      <div className="pl-6.5 flex items-center justify-between">
                        <span className="text-xs text-loft-400">
                          Balance: <span className="font-semibold text-loft-200">₹{(walletBalance ?? 0).toFixed(2)}</span>
                        </span>
                        {walletBalance !== null && walletBalance < calculateFare() && formData.paymentMethod === 'wallet' && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              openWalletTopup();
                            }}
                            className="text-[11px] text-copper-400 hover:text-copper-300 underline font-semibold flex items-center gap-1 cursor-pointer"
                          >
                            Recharge ↗
                          </button>
                        )}
                      </div>
                    </label>
                  </div>

                  {formData.paymentMethod === 'wallet' && walletBalance !== null && walletBalance < calculateFare() && (
                    <div className="mt-3 p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 text-xs text-amber-300">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                        <span>Your wallet balance (₹{walletBalance.toFixed(2)}) is lower than the fare (₹{calculateFare()}). Shortfall: ₹{(calculateFare() - walletBalance).toFixed(2)}</span>
                      </div>
                      <div className="flex items-center gap-2.5 shrink-0 self-end sm:self-auto">
                        <button
                          type="button"
                          onClick={() => openWalletTopup()}
                          className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-loft-950 font-bold rounded-lg text-xs transition-colors cursor-pointer shadow-sm"
                        >
                          Refill ₹{Math.max(10, Math.ceil(calculateFare() - walletBalance))}
                        </button>
                        <a 
                          href={`/wallet?refill=true&amount=${Math.max(10, Math.ceil(calculateFare() - walletBalance))}`} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="font-bold underline hover:text-amber-200 text-xs whitespace-nowrap flex items-center gap-1"
                          title="Open Wallet in new tab"
                        >
                          Full Wallet <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    </div>
                  )}

                  {topupSuccess && (
                    <div className="mt-3 p-3 bg-moss-500/10 border border-moss-500/30 rounded-xl flex items-center gap-2.5 text-xs text-moss-300 animate-fade-in">
                      <CheckCircle className="w-4 h-4 text-moss-400 shrink-0" />
                      <span>{topupSuccess}</span>
                    </div>
                  )}
                </div>

                {error && (
                  <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-center text-sm font-medium">
                    {error}
                  </div>
                )}

                <div className="flex gap-4 mt-6">
                  <button type="button" onClick={handleBack} disabled={isSubmitting} className="btn-secondary w-1/3">Back</button>
                  <button 
                    type="submit" 
                    disabled={isSubmitting || !getPhoneValidationStatus().isValid} 
                    className={`btn-primary w-2/3 ${!getPhoneValidationStatus().isValid && !isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}
                    title={!getPhoneValidationStatus().isValid ? 'Please enter a valid 10-digit Indian contact mobile number to proceed' : ''}
                  >
                    {isSubmitting ? 'Processing...' : 'Confirm Booking'}
                  </button>
                </div>
              </motion.div>
            )}
            
          </form>
        </motion.div>
      </div>

      {/* Speech-to-Text / AI Voice Booking Modal */}
      <AnimatePresence>
        {showVoiceModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-loft-950/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="card w-full max-w-lg p-6 md:p-8 bg-loft-900 border-copper-500/30 relative shadow-2xl"
            >
              <button
                type="button"
                onClick={closeVoiceModal}
                className="absolute top-4 right-4 p-2 text-loft-400 hover:text-loft-100 transition-colors cursor-pointer"
                aria-label="Close voice modal"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-xl bg-copper-500/20 text-copper-400 flex items-center justify-center">
                  <Sparkles className="w-6 h-6 text-copper-400" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-loft-50 font-serif">
                    {isAiReviewStep && aiParsedBooking ? 'Confirm AI Booking' : 'AI Voice Booking Agent'}
                  </h3>
                  <p className="text-xs text-loft-300">
                    {isAiReviewStep && aiParsedBooking 
                      ? 'Please verify trip details before dispatching vehicle' 
                      : 'Natural language booking powered by NLP'}
                  </p>
                </div>
              </div>

              {isAiReviewStep && aiParsedBooking ? (
                /* STEP 2: AI REVIEW & CONFIRMATION VIEW */
                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-copper-500/10 border border-copper-500/30">
                    <div className="flex items-center justify-between mb-3 pb-2 border-b border-copper-500/20">
                      <span className="text-xs font-bold text-copper-400 uppercase tracking-wider flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5" /> AI Extracted Trip Summary
                      </span>
                      <span className="text-[11px] bg-moss-500/20 text-moss-300 font-bold px-2 py-0.5 rounded border border-moss-500/30">
                        Verification Required
                      </span>
                    </div>

                    <div className="space-y-3 text-xs">
                      {/* Pickup Address */}
                      <div className="flex items-start gap-2.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-moss-500 mt-2 shrink-0"></span>
                        <div className="min-w-0 flex-1">
                          <span className="text-[10px] uppercase font-bold text-moss-400 block">Pickup Location</span>
                          <input
                            type="text"
                            value={aiParsedBooking.pickupAddress || ''}
                            onChange={(e) => setAiParsedBooking({ ...aiParsedBooking, pickupAddress: e.target.value })}
                            className="w-full bg-loft-950/80 border border-loft-700/80 rounded-lg px-2.5 py-1.5 text-loft-100 font-medium text-xs mt-0.5 focus:border-copper-500 outline-none"
                            placeholder="Pickup address"
                          />
                        </div>
                      </div>

                      {/* Drop-off Address */}
                      <div className="flex items-start gap-2.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-copper-500 mt-2 shrink-0"></span>
                        <div className="min-w-0 flex-1">
                          <span className="text-[10px] uppercase font-bold text-copper-400 block">Drop-off Destination</span>
                          <input
                            type="text"
                            value={aiParsedBooking.dropAddress || ''}
                            onChange={(e) => setAiParsedBooking({ ...aiParsedBooking, dropAddress: e.target.value })}
                            className="w-full bg-loft-950/80 border border-loft-700/80 rounded-lg px-2.5 py-1.5 text-loft-100 font-medium text-xs mt-0.5 focus:border-copper-500 outline-none"
                            placeholder="Destination address"
                          />
                        </div>
                      </div>

                      {/* Key Attributes Grid */}
                      <div className="grid grid-cols-2 gap-2 pt-1">
                        <div className="bg-loft-950/70 border border-loft-800 p-2.5 rounded-lg">
                          <span className="text-[10px] text-loft-400 uppercase block">Vehicle Category</span>
                          <span className="text-xs font-bold text-copper-300 capitalize flex items-center gap-1 mt-0.5">
                            <Truck className="w-3.5 h-3.5" />
                            {aiParsedBooking.tempoType} Tempo
                          </span>
                        </div>
                        <div className="bg-loft-950/70 border border-loft-800 p-2.5 rounded-lg">
                          <span className="text-[10px] text-loft-400 uppercase block">Cargo Consignment</span>
                          <span className="text-xs font-semibold text-loft-200 truncate block mt-0.5">
                            {aiParsedBooking.goodsType || 'General Cargo'} ({aiParsedBooking.weight || 100} kg)
                          </span>
                        </div>
                        <div className="bg-loft-950/70 border border-loft-800 p-2.5 rounded-lg">
                          <span className="text-[10px] text-loft-400 uppercase block">Scheduled Date & Time</span>
                          <span className="text-xs font-semibold text-loft-200 block mt-0.5">
                            {aiParsedBooking.date} • {aiParsedBooking.time?.slice(0, 5) || '10:00 AM'}
                          </span>
                        </div>
                        <div className="bg-loft-950/70 border border-copper-500/40 p-2.5 rounded-lg bg-copper-500/5">
                          <span className="text-[10px] text-loft-400 uppercase block">Estimated Distance & Fare</span>
                          <span className="text-xs font-bold text-emerald-400 block mt-0.5">
                            {isAiRecalculating ? (
                              <span className="text-loft-300 font-normal flex items-center gap-1.5 animate-pulse">
                                <RefreshCw className="w-3 h-3 animate-spin text-copper-400" />
                                <span>Calculating real route...</span>
                              </span>
                            ) : (
                              `${aiParsedBooking.totalDistance || 5} km • ₹${aiParsedBooking.estimatedFare || 300}`
                            )}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {voiceError && (
                    <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-xs">
                      {voiceError}
                    </div>
                  )}

                  {/* Actions for Review Screen */}
                  <div className="space-y-2 pt-1">
                    <button
                      type="button"
                      onClick={handleConfirmAiBooking}
                      disabled={isVoiceSubmitting}
                      className="btn-primary w-full py-3.5 text-sm font-bold flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(232,99,49,0.35)] cursor-pointer"
                    >
                      {isVoiceSubmitting ? 'Placing Confirmed Booking...' : '✓ Confirm & Instant Book with AI'}
                    </button>

                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={handleApplyVoiceToForm}
                        className="btn-secondary flex-1 py-2.5 text-xs cursor-pointer"
                        title="Transfer details into the full booking form to customize and preview on map"
                      >
                        Edit in Full Booking Form
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsAiReviewStep(false)}
                        className="bg-loft-800 hover:bg-loft-700 text-loft-300 px-4 py-2.5 rounded-xl border border-loft-700 text-xs transition-colors cursor-pointer"
                      >
                        Re-edit Prompt
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                /* STEP 1: PROMPT INPUT VIEW */
                <>
                  <div className="flex flex-col items-center justify-center py-6 border border-loft-800 rounded-2xl bg-loft-950/60 mb-6">
                    <button
                      type="button"
                      onClick={isListening ? stopListening : startListening}
                      className={`w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300 shadow-xl cursor-pointer ${
                        isListening 
                          ? 'bg-red-500 text-white animate-pulse shadow-[0_0_25px_rgba(239,68,68,0.5)]' 
                          : 'bg-copper-500 hover:bg-copper-400 text-white shadow-[0_0_20px_rgba(232,99,49,0.3)]'
                      }`}
                      aria-label={isListening ? 'Stop listening' : 'Start microphone recording'}
                    >
                      {isListening ? <MicOff className="w-8 h-8" /> : <Mic className="w-8 h-8" />}
                    </button>
                    <span className="text-sm font-semibold text-loft-200 mt-4">
                      {isListening ? 'Listening... Speak your trip details' : 'Click microphone to speak'}
                    </span>
                    <span className="text-xs text-loft-400 mt-1 max-w-xs text-center">
                      Example: "I need a large tempo from Kalyani Nagar to Hinjewadi tomorrow"
                    </span>
                  </div>

                  <div className="mb-6">
                    <div className="flex items-center justify-between mb-2">
                      <label htmlFor="voice-manual-input" className="block text-xs font-semibold uppercase tracking-wider text-loft-300">
                        Voice Transcript / Manual Prompt
                      </label>
                      <span className="text-[10px] text-loft-400 font-mono">
                        Editable Fallback
                      </span>
                    </div>
                    <textarea
                      id="voice-manual-input"
                      data-testid="voice-manual-input"
                      value={voiceTranscript}
                      onChange={(e) => setVoiceTranscript(e.target.value)}
                      placeholder="Your speech transcript will appear here, or you can type directly..."
                      rows={3}
                      className="input-field resize-none text-sm"
                    />
                  </div>

                  {voiceError && (
                    <div 
                      id="voice-error-message"
                      data-testid="voice-error-msg"
                      className="mb-4 p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-xs flex items-center justify-between"
                    >
                      <span className="font-medium">{voiceError}</span>
                      <span className="text-[10px] bg-red-500/20 text-red-300 px-2 py-0.5 rounded font-mono uppercase ml-2 whitespace-nowrap">
                        Fallback Active
                      </span>
                    </div>
                  )}

                  <div className="flex flex-col sm:flex-row gap-3">
                    <button
                      type="button"
                      onClick={handleApplyVoiceToForm}
                      disabled={!voiceTranscript.trim() || isVoiceSubmitting}
                      className="btn-secondary flex-1 py-3 text-xs cursor-pointer"
                    >
                      Auto-Fill Form
                    </button>
                    <button
                      type="button"
                      onClick={handleVoiceBookingSubmit}
                      disabled={!voiceTranscript.trim() || isVoiceSubmitting}
                      className="btn-primary flex-1 py-3 text-xs flex items-center justify-center gap-2 cursor-pointer"
                    >
                      {isVoiceSubmitting ? 'Analyzing Trip Details...' : '⚡ Instant Book with AI'}
                    </button>
                  </div>
                </>
              )}
            </motion.div>
          </div>
        )}

        {/* Wallet Top-up & Refill Modal for Instant Booking */}
        {showWalletTopupModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-loft-950/80 backdrop-blur-md">
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
                    <h3 className="text-lg font-bold text-loft-50">Refill Wallet for Booking</h3>
                    <p className="text-xs text-loft-400">Instant recharge via Razorpay</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => !isProcessingTopup && setShowWalletTopupModal(false)}
                  disabled={isProcessingTopup}
                  className="p-2 text-loft-400 hover:text-loft-100 hover:bg-loft-800 rounded-lg transition-colors cursor-pointer"
                  aria-label="Close modal"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Form Content */}
              <form onSubmit={handleBookingWalletTopup} className="p-6 space-y-5">
                {/* Balance & Shortfall Breakdown */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-3 rounded-xl bg-loft-950/60 border border-loft-800/80">
                    <span className="text-loft-400 block mb-0.5">Current Balance</span>
                    <span className="text-sm font-bold text-loft-100">
                      ₹{(walletBalance ?? 0).toFixed(2)}
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-loft-950/60 border border-loft-800/80">
                    <span className="text-loft-400 block mb-0.5">Trip Fare</span>
                    <span className="text-sm font-bold text-copper-400">
                      ₹{calculateFare().toFixed(2)}
                    </span>
                  </div>
                </div>

                {walletBalance !== null && walletBalance < calculateFare() && (
                  <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between text-xs text-amber-300">
                    <span>Shortfall to complete booking:</span>
                    <span className="font-bold text-sm">₹{(calculateFare() - walletBalance).toFixed(2)}</span>
                  </div>
                )}

                {/* Amount input */}
                <div>
                  <label className="block text-xs font-semibold text-loft-300 uppercase tracking-wider mb-2">
                    Refill Amount (₹)
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
                  <label className="block text-xs font-semibold text-loft-400 mb-2">Quick Select</label>
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      Math.max(10, Math.ceil(calculateFare() - (walletBalance || 0))),
                      200,
                      500,
                      1000
                    ]
                      .filter((amt, idx, arr) => arr.indexOf(amt) === idx && amt >= 10)
                      .slice(0, 4)
                      .map((amt) => (
                        <button
                          key={amt}
                          type="button"
                          onClick={() => {
                            setTopupAmount(String(amt));
                            setTopupError('');
                          }}
                          className={`py-2 px-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                            topupAmount === String(amt)
                              ? 'bg-copper-500/20 border-copper-500 text-copper-300'
                              : 'bg-loft-950/60 border-loft-800 text-loft-300 hover:border-copper-500/50'
                          }`}
                        >
                          +₹{amt}
                        </button>
                      ))}
                  </div>
                </div>

                {/* Error Banner */}
                {topupError && (
                  <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>{topupError}</span>
                  </div>
                )}

                {/* Trust badge */}
                <div className="flex items-center justify-between text-[11px] text-loft-400 pt-1">
                  <div className="flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-moss-400" />
                    <span>Secure 256-bit encryption</span>
                  </div>
                  <a
                    href={`/wallet?refill=true&amount=${encodeURIComponent(String(safeTopupAmount))}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-copper-400 hover:underline flex items-center gap-1 font-medium"
                  >
                    Open Wallet tab <ExternalLink className="w-3 h-3" />
                  </a>
                </div>

                {/* Submit button */}
                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowWalletTopupModal(false)}
                    disabled={isProcessingTopup}
                    className="btn-secondary flex-1 py-3 text-xs"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isProcessingTopup}
                    className="btn-primary flex-2 py-3 text-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {isProcessingTopup ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Opening Gateway...</span>
                      </>
                    ) : (
                      <>
                        <Plus className="w-4 h-4" />
                        <span>Refill ₹{topupAmount || 0} via Razorpay</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Booking;

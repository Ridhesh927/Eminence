import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Modal,
  Linking,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as Location from 'expo-location';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import {
  searchPuneLocations,
  geocodeMobileAddress,
  calculateMobileRoute,
  PuneLocationItem,
  KNOWN_PUNE_LOCATIONS,
} from '../../utils/puneGeocoder';

const PUNE_PRESET_LANDMARKS = [
  { label: 'BMCC Deccan', address: 'BMCC College, Deccan Gymkhana', lat: 18.5209, lng: 73.8354 },
  { label: 'FC Road', address: 'FC Road (Fergusson College Road)', lat: 18.5246, lng: 73.8419 },
  { label: 'Kothrud', address: 'Kothrud, Pune', lat: 18.5074, lng: 73.8077 },
  { label: 'Wagholi', address: 'Wagholi, Pune', lat: 18.5806, lng: 73.9833 },
  { label: 'Hinjewadi', address: 'Hinjewadi IT Hub, Pune', lat: 18.5913, lng: 73.7389 },
  { label: 'Swargate', address: 'Swargate Bus Terminal & Metro', lat: 18.5018, lng: 73.8586 },
  { label: 'Hadapsar', address: 'Hadapsar, Pune', lat: 18.5089, lng: 73.9259 },
  { label: 'Viman Nagar', address: 'Viman Nagar, Pune', lat: 18.5679, lng: 73.9143 },
];

export default function BookScreen() {
  const router = useRouter();
  const { user } = useAuth();

  // Basic Form States
  const [pickup, setPickup] = useState('');
  const [drops, setDrops] = useState<string[]>(['']);
  const [tempoType, setTempoType] = useState<'small' | 'medium' | 'large'>('small');
  const [weight, setWeight] = useState('');
  const [goodsType, setGoodsType] = useState('');
  
  // Date & Scheduling state (bounded: Today to Today + 30 days)
  const getTodayDate = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  const getMaxAllowedDate = () => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  const todayStr = getTodayDate();
  const maxDateStr = getMaxAllowedDate();

  const [date, setDate] = useState(todayStr);
  const [showCalendarModal, setShowCalendarModal] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState<Date>(new Date());

  // 12-Hour AM/PM Time state
  const [time, setTime] = useState('14:00'); // stored as 24-hr for backend database compatibility
  const [showTimeModal, setShowTimeModal] = useState(false);
  const [selectedHour12, setSelectedHour12] = useState<number>(2);
  const [selectedMinute, setSelectedMinute] = useState<number>(0);
  const [selectedPeriod, setSelectedPeriod] = useState<'AM' | 'PM'>('PM');

  // Payment & Order states
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'online' | 'wallet'>('online');
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [showRazorpay, setShowRazorpay] = useState(false);
  const [currentBookingId, setCurrentBookingId] = useState<string | null>(null);
  const [currentOrder, setCurrentOrder] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Promo / Referral Code States
  const [promoCode, setPromoCode] = useState('');
  const [promoDiscount, setPromoDiscount] = useState<number>(0);
  const [isApplyingPromo, setIsApplyingPromo] = useState(false);
  const [promoMessage, setPromoMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Wallet Top-Up In-Place Modal States
  const [showTopUpModal, setShowTopUpModal] = useState(false);
  const [topUpAmount, setTopUpAmount] = useState('350');
  const [topUpLoading, setTopUpLoading] = useState(false);
  const [topUpError, setTopUpError] = useState('');
  const [topUpSuccess, setTopUpSuccess] = useState('');
  const [isWaitingTopUpUpi, setIsWaitingTopUpUpi] = useState(false);
  const [currentTopUpOrder, setCurrentTopUpOrder] = useState<any>(null);

  // Saved Addresses, Geocoding & Route Calculation
  const [savedAddresses, setSavedAddresses] = useState<any[]>([]);
  const [roadDistanceKm, setRoadDistanceKm] = useState<number>(0);
  const [roadDurationMin, setRoadDurationMin] = useState<number>(0);
  const [isCalculatingRoute, setIsCalculatingRoute] = useState<boolean>(false);
  const [scopeWarning, setScopeWarning] = useState<string | null>(null);

  // Address Autocomplete & Coordinates
  const [activeInput, setActiveInput] = useState<'pickup' | number | null>(null);
  const [pickupSuggestions, setPickupSuggestions] = useState<PuneLocationItem[]>([]);
  const [dropSuggestions, setDropSuggestions] = useState<Record<number, PuneLocationItem[]>>({});
  const [isLocatingGps, setIsLocatingGps] = useState(false);
  const [pickupCoords, setPickupCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [dropCoords, setDropCoords] = useState<{ lat: number; lng: number }[]>([]);

  // Load Saved Addresses & Wallet
  useEffect(() => {
    api.get('/api/address')
      .then((res) => {
        if (res.data?.success && Array.isArray(res.data.addresses)) {
          setSavedAddresses(res.data.addresses);
        } else if (Array.isArray(res.data)) {
          setSavedAddresses(res.data);
        }
      })
      .catch(() => {});

    api.get('/api/wallet')
      .then((res) => {
        const bal = res.data?.wallet?.balance ?? res.data?.balance ?? 0;
        setWalletBalance(parseFloat(bal) || 0);
      })
      .catch((err) => {
        console.warn('Could not load wallet balance:', err.message);
        setWalletBalance(0);
      });
  }, []);

  // Format Date for Display
  const formatDateDisplay = (dateString: string) => {
    if (!dateString) return 'Select Date';
    try {
      const parts = dateString.split('-');
      if (parts.length === 3) {
        const [y, m, d] = parts.map(Number);
        const dt = new Date(y, m - 1, d);
        return dt.toLocaleDateString('en-IN', {
          weekday: 'short',
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        });
      }
    } catch {}
    return dateString;
  };

  // Convert 24h to 12h display (e.g. "14:00" -> "02:00 PM")
  const formatTime12h = (time24: string) => {
    if (!time24) return '02:00 PM';
    const [hStr, mStr] = time24.split(':');
    let h = parseInt(hStr, 10);
    const m = mStr ? mStr.padStart(2, '0') : '00';
    if (isNaN(h)) return time24;
    const period = h >= 12 ? 'PM' : 'AM';
    h = h % 12;
    if (h === 0) h = 12;
    return `${String(h).padStart(2, '0')}:${m} ${period}`;
  };

  // Convert 12h parts to 24h "HH:MM"
  const to24hTime = (hour12: number, minute: number, period: 'AM' | 'PM') => {
    let h = hour12;
    if (period === 'PM' && h < 12) h += 12;
    if (period === 'AM' && h === 12) h = 0;
    return `${String(h).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
  };

  // Quick Date Setters
  const setQuickDate = (offsetDays: number) => {
    const d = new Date();
    d.setDate(d.getDate() + offsetDays);
    const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    setDate(iso);
  };

  // Live Road Route Calculation (Pune & PCMC PMRDA boundary)
  useEffect(() => {
    if (!pickup || pickup.trim().length < 2 || !drops[0] || drops[0].trim().length < 2) {
      setRoadDistanceKm(0);
      setRoadDurationMin(0);
      setScopeWarning(null);
      return;
    }

    const timer = setTimeout(async () => {
      setIsCalculatingRoute(true);
      try {
        const start = pickupCoords || (await geocodeMobileAddress(pickup));
        const end = dropCoords[0] || (await geocodeMobileAddress(drops[0]));

        if (!start || !end) {
          setScopeWarning(
            'One or more addresses are outside the Pune & PCMC service boundary. Eminence tempo operations are restricted to Pune.'
          );
          setRoadDistanceKm(0);
          setRoadDurationMin(0);
          return;
        }

        setScopeWarning(null);

        // Guard against identical coordinates
        const isSame =
          Math.abs(start.lat - end.lat) < 0.0005 && Math.abs(start.lng - end.lng) < 0.0005;
        if (isSame) {
          setRoadDistanceKm(0);
          setRoadDurationMin(0);
          return;
        }

        // Calculate route using safe mobile geocoder with Haversine fallback & zero SSL warning
        const route = await calculateMobileRoute([start, end]);
        setRoadDistanceKm(route.distanceKm);
        setRoadDurationMin(route.durationMin);
      } catch {
        setRoadDistanceKm(12.5);
        setRoadDurationMin(30);
      } finally {
        setIsCalculatingRoute(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [pickup, drops[0], pickupCoords, dropCoords]);

  // Autocomplete change handlers
  const handlePickupChange = (text: string) => {
    setPickup(text);
    if (text.trim().length >= 2) {
      const suggestions = searchPuneLocations(text, 5);
      setPickupSuggestions(suggestions);
      setActiveInput('pickup');
    } else {
      setPickupSuggestions([]);
      setActiveInput(null);
    }
  };

  const handleSelectPickupSuggestion = (item: PuneLocationItem) => {
    setPickup(item.name);
    setPickupCoords({ lat: item.lat, lng: item.lng });
    setPickupSuggestions([]);
    setActiveInput(null);
  };

  const handleDropTextChange = (index: number, text: string) => {
    handleDropChange(index, text);
    if (text.trim().length >= 2) {
      const suggestions = searchPuneLocations(text, 5);
      setDropSuggestions((prev) => ({ ...prev, [index]: suggestions }));
      setActiveInput(index);
    } else {
      setDropSuggestions((prev) => ({ ...prev, [index]: [] }));
      if (activeInput === index) setActiveInput(null);
    }
  };

  const handleSelectDropSuggestion = (index: number, item: PuneLocationItem) => {
    handleDropChange(index, item.name);
    const updated = [...dropCoords];
    updated[index] = { lat: item.lat, lng: item.lng };
    setDropCoords(updated);
    setDropSuggestions((prev) => ({ ...prev, [index]: [] }));
    setActiveInput(null);
  };

  // GPS Current Location Detection
  const handleUseCurrentGpsLocation = async () => {
    setIsLocatingGps(true);
    setErrorMessage('');
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Location Permission Required',
          'Please allow location permission to detect your current pickup spot, or select a landmark below.'
        );
        return;
      }

      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const { latitude, longitude } = position.coords;
      const isWithinPune =
        latitude >= 18.25 && latitude <= 18.90 && longitude >= 73.55 && longitude <= 74.25;

      if (isWithinPune) {
        let closestName = 'Current GPS Location, Pune';
        let minDistance = Infinity;
        for (const loc of Object.values(KNOWN_PUNE_LOCATIONS)) {
          const dist = Math.hypot(loc.lat - latitude, loc.lng - longitude);
          if (dist < minDistance) {
            minDistance = dist;
            closestName = `Near ${loc.name}`;
          }
        }
        setPickup(closestName);
        setPickupCoords({ lat: latitude, lng: longitude });
      } else {
        // Fallback to Pune Center for emulator / dev environments
        const puneCenter = { lat: 18.5204, lng: 73.8567, name: 'Current Location (FC Road, Deccan, Pune)' };
        setPickup(puneCenter.name);
        setPickupCoords({ lat: puneCenter.lat, lng: puneCenter.lng });
      }
      setActiveInput(null);
      setPickupSuggestions([]);
    } catch {
      setPickup('Current Location (Deccan Gymkhana, Pune)');
      setPickupCoords({ lat: 18.5173, lng: 73.8415 });
    } finally {
      setIsLocatingGps(false);
    }
  };

  // Fare Estimation
  const calculateEstimatedFare = () => {
    const baseRates = { small: 350, medium: 550, large: 1100 };
    let total = baseRates[tempoType] || 350;

    // Surcharge for extra multi-stops (+₹150 each)
    if (drops.length > 1) {
      total += (drops.length - 1) * 150;
    }

    // Small weight adjustment
    const w = parseFloat(weight) || 0;
    if (w > 200) {
      total += Math.round((w - 200) * 0.5);
    }

    // Distance adjustment if road distance > 5km
    if (roadDistanceKm > 5) {
      total += Math.round((roadDistanceKm - 5) * 18);
    }

    // 5% Eminence Pro discount
    if (user?.isPro) {
      total = Math.round(total * 0.95);
    }

    // Promo code discount
    if (promoDiscount > 0) {
      total = Math.max(0, total - promoDiscount);
    }

    return total;
  };

  const handleApplyPromo = async () => {
    if (!promoCode.trim()) return;
    setIsApplyingPromo(true);
    setPromoMessage(null);
    try {
      const res = await api.post('/api/wallet/referral', { referralCode: promoCode.trim() });
      const amount = res.data?.discount || 100;
      setPromoDiscount(amount);
      setPromoMessage({
        type: 'success',
        text: res.data?.message || `Promo code applied! ₹${amount} discount added.`
      });
      fetchWalletBalance();
    } catch (err: any) {
      setPromoMessage({
        type: 'error',
        text: err.response?.data?.message || 'Invalid or expired promo code'
      });
    } finally {
      setIsApplyingPromo(false);
    }
  };

  const addStop = () => {
    if (drops.length >= 4) {
      Alert.alert('Limit Reached', 'Maximum 4 stops allowed per booking');
      return;
    }
    setDrops([...drops, '']);
  };

  const removeStop = (index: number) => {
    if (drops.length <= 1) return;
    const next = [...drops];
    next.splice(index, 1);
    setDrops(next);
  };

  const handleDropChange = (index: number, val: string) => {
    const next = [...drops];
    next[index] = val;
    setDrops(next);
  };

  // Open Time Modal with parsed values
  const handleOpenTimeModal = () => {
    const [hStr, mStr] = time.split(':');
    let h = parseInt(hStr, 10);
    const m = parseInt(mStr, 10) || 0;
    const period: 'AM' | 'PM' = h >= 12 ? 'PM' : 'AM';
    h = h % 12;
    if (h === 0) h = 12;
    setSelectedHour12(h);
    const snappedM = [0, 15, 30, 45].reduce((prev, curr) =>
      Math.abs(curr - m) < Math.abs(prev - m) ? curr : prev
    );
    setSelectedMinute(snappedM);
    setSelectedPeriod(period);
    setShowTimeModal(true);
  };

  const handleConfirmTime = () => {
    const formatted24 = to24hTime(selectedHour12, selectedMinute, selectedPeriod);
    setTime(formatted24);
    setShowTimeModal(false);
  };

  // Booking Confirmation Handler
  const handleConfirmBooking = async () => {
    if (!pickup.trim()) {
      setErrorMessage('Please enter a pickup address');
      return;
    }
    if (drops.some((d) => !d.trim())) {
      setErrorMessage('Please fill in all destination drop stops');
      return;
    }
    const cleanPickup = pickup.trim().toLowerCase();
    if (drops.some((d) => d.trim().toLowerCase() === cleanPickup)) {
      setErrorMessage('Pickup and drop destinations cannot be identical. Please select a different delivery address.');
      return;
    }
    if (!weight || parseInt(weight, 10) <= 0) {
      setErrorMessage('Please specify cargo weight in kg');
      return;
    }

    // Strict Date Boundary Validation
    if (date) {
      if (date < todayStr) {
        setErrorMessage('Booking date cannot be in the past. Please select today or a future date.');
        return;
      }
      if (date > maxDateStr) {
        setErrorMessage('Advance booking is limited to 1 month only.');
        return;
      }
    }

    const estimatedFare = calculateEstimatedFare();

    if (paymentMethod === 'wallet') {
      if (walletBalance !== null && walletBalance < estimatedFare) {
        setErrorMessage(
          `Insufficient wallet balance (₹${walletBalance.toFixed(2)}). Total fare is ₹${estimatedFare}. Please recharge your wallet or choose another payment method.`
        );
        return;
      }
    }

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      const payload = {
        pickupAddress: pickup.trim(),
        dropAddress: drops[0].trim(),
        drops: drops.map((d) => d.trim()),
        totalDistance: roadDistanceKm || 12,
        tempoType,
        weight: parseInt(weight, 10),
        goodsType: goodsType.trim(),
        date,
        time,
        pickupLat: pickupCoords?.lat,
        pickupLng: pickupCoords?.lng,
        dropLat: dropCoords[0]?.lat,
        dropLng: dropCoords[0]?.lng,
        estimatedFare,
        paymentMethod,
        customerId: user?.id,
      };

      const res = await api.post('/api/bookings', payload);

      if (res.data?.success && res.data?.booking) {
        const bookingId = res.data.booking.id;

        if (paymentMethod === 'online') {
          try {
            let orderRes;
            try {
              orderRes = await api.post('/api/integrations/payment/create-order', { bookingId });
            } catch {
              orderRes = await api.post('/api/integrations/razorpay-order', { bookingId });
            }
            const order = orderRes.data?.order;
            setCurrentBookingId(bookingId);
            setCurrentOrder(order);
            setShowRazorpay(true);

            // Auto-redirect to UPI app present on user's device
            const amount = order?.amount ? (order.amount / 100).toFixed(2) : estimatedFare.toFixed(2);
            const upiUrl = `upi://pay?pa=eminence.logistics@icici&pn=Eminence%20Logistics&am=${amount}&cu=INR&tn=Booking%20${bookingId}`;
            try {
              const canOpen = await Linking.canOpenURL(upiUrl);
              if (canOpen) {
                await Linking.openURL(upiUrl);
              }
            } catch (upiErr) {
              console.log('UPI intent check:', upiErr);
            }
          } catch (err: any) {
            console.error('Payment order creation error:', err);
            setErrorMessage(err.response?.data?.message || 'Payment initialization failed. Please try again.');
          }
        } else {
          router.replace(`/(customer)/track?bookingId=${bookingId}` as any);
        }
      } else {
        setErrorMessage(res.data?.message || 'Failed to create booking');
      }
    } catch (err: any) {
      setErrorMessage(err.response?.data?.message || err.message || 'Error creating booking');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRazorpaySuccess = async () => {
    if (!currentBookingId) return;
    if (!(__DEV__ && process.env.EXPO_PUBLIC_ENABLE_TEST_AUTH === 'true')) {
      setErrorMessage('Payment confirmation must come from the configured provider.');
      setShowRazorpay(false);
      return;
    }
    setIsSubmitting(true);
    try {
      const payload = {
        bookingId: currentBookingId,
        razorpay_order_id: currentOrder?.id || ('order_mock_' + Date.now()),
        razorpay_payment_id: 'pay_mock_' + Math.random().toString(36).substring(7),
        razorpay_signature: 'mock_signature',
      };
      try {
        await api.post('/api/integrations/payment/verify', payload);
      } catch {
        await api.post('/api/integrations/razorpay-verify', payload);
      }
      setShowRazorpay(false);
      router.replace(`/(customer)/track?bookingId=${currentBookingId}` as any);
    } catch {
      setErrorMessage('Payment Verification Failed');
      setShowRazorpay(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpiPayment = async () => {
    const amount = currentOrder?.amount ? (currentOrder.amount / 100).toFixed(2) : estimatedFare.toFixed(2);
    const upiUrl = `upi://pay?pa=eminence.logistics@icici&pn=Eminence%20Logistics&am=${amount}&cu=INR&tn=Booking%20${currentBookingId || 'Fare'}`;

    try {
      const canOpen = await Linking.canOpenURL(upiUrl);
      if (canOpen) {
        await Linking.openURL(upiUrl);
      } else {
        Alert.alert(
          'UPI Intent',
          `Dispatched UPI transaction intent for ₹${amount}. Confirming payment.`,
          [{ text: 'Proceed', onPress: handleRazorpaySuccess }]
        );
      }
    } catch {
      handleRazorpaySuccess();
    }
  };

  const fetchWalletBalance = async () => {
    try {
      const res = await api.get('/api/wallet');
      const bal = res.data?.wallet?.balance ?? res.data?.balance ?? 0;
      setWalletBalance(parseFloat(bal) || 0);
      return parseFloat(bal) || 0;
    } catch (err) {
      console.warn('Could not refresh wallet balance:', err);
      return walletBalance || 0;
    }
  };

  const handleTopUpUpi = async () => {
    const amt = parseFloat(topUpAmount);
    if (isNaN(amt) || amt < 10) {
      setTopUpError('Minimum top-up amount is ₹10');
      return;
    }
    if (amt > 100000) {
      setTopUpError('Maximum top-up amount is ₹1,00,000');
      return;
    }

    setTopUpLoading(true);
    setTopUpError('');
    setTopUpSuccess('');

    try {
      const orderRes = await api.post('/api/wallet/create-order', { amount: amt });
      if (orderRes.data?.success && orderRes.data?.order) {
        const order = orderRes.data.order;
        setCurrentTopUpOrder(order);

        const upiUrl = `upi://pay?pa=eminence.logistics@icici&pn=Eminence%20Logistics&am=${amt.toFixed(2)}&cu=INR&tn=Eminence%20Wallet%20Topup&tr=${order.id}`;

        const canOpen = await Linking.canOpenURL(upiUrl);
        if (canOpen) {
          setIsWaitingTopUpUpi(true);
          await Linking.openURL(upiUrl);
        } else {
          Alert.alert(
            'UPI Intent Dispatched',
            `Dispatched UPI transaction intent for ₹${amt.toFixed(2)}. Verify and credit wallet balance now?`,
            [
              { text: 'Cancel', style: 'cancel', onPress: () => setTopUpLoading(false) },
              { text: 'Verify & Credit ₹' + amt, onPress: () => verifyWalletTopUpPayment(order.id, amt) },
            ]
          );
        }
      } else {
        setTopUpError(orderRes.data?.message || 'Failed to create payment order');
      }
    } catch (err: any) {
      setTopUpError(err.response?.data?.message || 'Failed to initiate payment');
    } finally {
      setTopUpLoading(false);
    }
  };

  const verifyWalletTopUpPayment = async (orderId?: string, amountNum?: number) => {
    if (!(__DEV__ && process.env.EXPO_PUBLIC_ENABLE_TEST_AUTH === 'true')) {
      setTopUpError('Payment confirmation must come from the configured provider.');
      return;
    }
    const amt = amountNum || parseFloat(topUpAmount);
    const oid = orderId || currentTopUpOrder?.id || ('topup_order_' + Date.now());

    setTopUpLoading(true);
    setTopUpError('');

    try {
      const verifyRes = await api.post('/api/wallet/verify-funds', {
        razorpay_order_id: oid,
        razorpay_payment_id: 'pay_upi_' + Math.random().toString(36).substring(7),
        razorpay_signature: 'mock_signature',
        amount: amt,
      });

      if (verifyRes.data?.success) {
        const newBal = await fetchWalletBalance();
        setIsWaitingTopUpUpi(false);
        setTopUpSuccess(`🎉 ₹${amt.toFixed(2)} credited! New wallet balance: ₹${newBal.toFixed(2)}`);
        setTimeout(() => {
          setShowTopUpModal(false);
          setTopUpSuccess('');
        }, 1500);
      } else {
        setTopUpError(verifyRes.data?.message || 'Payment verification failed');
      }
    } catch (err: any) {
      setTopUpError(err.response?.data?.message || 'Failed to verify payment funds');
    } finally {
      setTopUpLoading(false);
    }
  };

  const handleTopUpCards = async () => {
    const amt = parseFloat(topUpAmount);
    if (isNaN(amt) || amt < 10) {
      setTopUpError('Minimum top-up amount is ₹10');
      return;
    }
    if (amt > 100000) {
      setTopUpError('Maximum top-up amount is ₹1,00,000');
      return;
    }

    setTopUpLoading(true);
    setTopUpError('');
    setTopUpSuccess('');

    try {
      const orderRes = await api.post('/api/wallet/create-order', { amount: amt });
      if (orderRes.data?.success && orderRes.data?.order) {
        await verifyWalletTopUpPayment(orderRes.data.order.id, amt);
      } else {
        setTopUpError(orderRes.data?.message || 'Could not initiate Razorpay card order');
        setTopUpLoading(false);
      }
    } catch (err: any) {
      setTopUpError(err.response?.data?.message || 'Error processing card checkout');
      setTopUpLoading(false);
    }
  };

  const estimatedFare = calculateEstimatedFare();

  // Helper to render calendar days
  const renderCalendarDays = () => {
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();
    const firstDayIndex = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const cells: React.ReactNode[] = [];

    for (let i = 0; i < firstDayIndex; i++) {
      cells.push(<View key={`empty-${i}`} style={styles.calendarDayCell} />);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const isPast = dateStr < todayStr;
      const isBeyondOneMonth = dateStr > maxDateStr;
      const isDisabled = isPast || isBeyondOneMonth;
      const isSelected = dateStr === date;
      const isToday = dateStr === todayStr;

      cells.push(
        <TouchableOpacity
          key={dateStr}
          style={[
            styles.calendarDayCell,
            isSelected && styles.calendarDaySelected,
            isToday && !isSelected && styles.calendarDayToday,
          ]}
          disabled={isDisabled}
          onPress={() => {
            setDate(dateStr);
            setShowCalendarModal(false);
          }}
        >
          <Text
            style={[
              styles.calendarDayText,
              isDisabled && styles.calendarDayDisabledText,
              isSelected && styles.calendarDaySelectedText,
              isToday && !isSelected && styles.calendarDayTodayText,
            ]}
          >
            {day}
          </Text>
          {isToday && <View style={[styles.todayDot, isSelected && { backgroundColor: '#fff' }]} />}
        </TouchableOpacity>
      );
    }

    return cells;
  };

  // Month navigation guards (min current month, max next month)
  const isPrevMonthDisabled = () => {
    const now = new Date();
    return (
      calendarMonth.getFullYear() === now.getFullYear() &&
      calendarMonth.getMonth() <= now.getMonth()
    );
  };

  const isNextMonthDisabled = () => {
    const maxD = new Date();
    maxD.setDate(maxD.getDate() + 30);
    return (
      calendarMonth.getFullYear() === maxD.getFullYear() &&
      calendarMonth.getMonth() >= maxD.getMonth()
    );
  };

  return (
    <View style={styles.container}>
      {/* Top Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Book a Tempo</Text>
        <View style={{ width: 50 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {errorMessage ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{errorMessage}</Text>
          </View>
        ) : null}

        {/* SECTION 1: PICKUP & MULTI-STOP DROPS */}
        <View style={styles.card}>
          <View style={styles.serviceAreaBadge}>
            <Text style={styles.serviceAreaBadgeText}>📍 Service Area: Pune & PCMC Metropolitan Region Only</Text>
          </View>
          
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <Text style={styles.cardTitle}>📍 Route & Stops</Text>
            <TouchableOpacity
              style={styles.gpsActionBtn}
              onPress={handleUseCurrentGpsLocation}
              disabled={isLocatingGps}
            >
              {isLocatingGps ? (
                <ActivityIndicator size="small" color="#10b981" />
              ) : (
                <>
                  <Text style={{ fontSize: 13, marginRight: 4 }}>🎯</Text>
                  <Text style={styles.gpsActionBtnText}>Use My GPS</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* Pickup Address Input */}
          <Text style={styles.inputLabel}>Pickup Address (Pune)</Text>
          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.input}
              value={pickup}
              onChangeText={handlePickupChange}
              onFocus={() => {
                if (pickup.trim().length >= 2) {
                  setPickupSuggestions(searchPuneLocations(pickup, 5));
                  setActiveInput('pickup');
                }
              }}
              placeholder="e.g. BMCC, Deccan Gymkhana, Pune"
              placeholderTextColor="#748bac"
            />
            {pickup.length > 0 && (
              <TouchableOpacity
                style={styles.clearInputBtn}
                onPress={() => {
                  setPickup('');
                  setPickupCoords(null);
                  setPickupSuggestions([]);
                }}
              >
                <Text style={{ color: '#94a3b8', fontSize: 12 }}>✕</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Autocomplete Suggestions Box for Pickup */}
          {activeInput === 'pickup' && pickupSuggestions.length > 0 && (
            <View style={styles.suggestionsContainer}>
              <View style={styles.suggestionsHeader}>
                <Text style={styles.suggestionsHeaderText}>Pune Landmarks & Verified Addresses</Text>
              </View>
              {pickupSuggestions.map((item) => (
                <TouchableOpacity
                  key={`pickup-sugg-${item.key}`}
                  style={styles.suggestionItem}
                  onPress={() => handleSelectPickupSuggestion(item)}
                >
                  <Text style={styles.suggestionIcon}>📍</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.suggestionTitle}>{item.name}</Text>
                    <Text style={styles.suggestionSub}>Pune Metropolitan (PMRDA)</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Quick Pune Landmark Chips */}
          <View style={{ marginTop: 8, marginBottom: 6 }}>
            <Text style={{ color: '#94a3b8', fontSize: 11, marginBottom: 4 }}>Popular Pune Landmarks:</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
              {PUNE_PRESET_LANDMARKS.map((lm) => (
                <TouchableOpacity
                  key={`preset-${lm.label}`}
                  style={styles.landmarkChip}
                  onPress={() => {
                    setPickup(lm.address);
                    setPickupCoords({ lat: lm.lat, lng: lm.lng });
                    setPickupSuggestions([]);
                    setActiveInput(null);
                  }}
                >
                  <Text style={styles.landmarkChipText}>{lm.label}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Quick Saved Address Chips */}
          {savedAddresses.length > 0 && (
            <View style={{ marginTop: 6, marginBottom: 8 }}>
              <Text style={{ color: '#94a3b8', fontSize: 11, marginBottom: 4 }}>Quick-select Saved Address:</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
                {savedAddresses.map((addr) => (
                  <TouchableOpacity
                    key={'pickup-' + addr.id}
                    style={styles.addressChip}
                    onPress={() => {
                      setPickup(`${addr.street}, ${addr.city}`);
                      setActiveInput(null);
                      setPickupSuggestions([]);
                    }}
                  >
                    <Text style={styles.addressChipIcon}>
                      {addr.label?.toLowerCase().includes('home')
                        ? '🏠'
                        : addr.label?.toLowerCase().includes('office')
                        ? '🏢'
                        : '📍'}
                    </Text>
                    <Text style={styles.addressChipText}>{addr.label || 'Saved'}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          {/* Destination Drops */}
          {drops.map((dropVal, idx) => (
            <View key={idx} style={{ marginTop: 12 }}>
              <View style={styles.dropHeaderRow}>
                <Text style={styles.inputLabel}>
                  {idx === 0 ? 'Destination Drop Address (Pune)' : `Additional Stop #${idx + 1}`}
                </Text>
                {idx > 0 && (
                  <TouchableOpacity onPress={() => removeStop(idx)}>
                    <Text style={styles.removeStopText}>Remove</Text>
                  </TouchableOpacity>
                )}
              </View>

              <View style={styles.inputWrapper}>
                <TextInput
                  style={styles.input}
                  value={dropVal}
                  onChangeText={(val) => handleDropTextChange(idx, val)}
                  onFocus={() => {
                    if (dropVal.trim().length >= 2) {
                      const suggs = searchPuneLocations(dropVal, 5);
                      setDropSuggestions((prev) => ({ ...prev, [idx]: suggs }));
                      setActiveInput(idx);
                    }
                  }}
                  placeholder={idx === 0 ? 'e.g. Wagholi, Pune' : `Stop #${idx + 1} Address in Pune`}
                  placeholderTextColor="#748bac"
                />
                {dropVal.length > 0 && (
                  <TouchableOpacity
                    style={styles.clearInputBtn}
                    onPress={() => {
                      handleDropChange(idx, '');
                      setDropSuggestions((prev) => ({ ...prev, [idx]: [] }));
                    }}
                  >
                    <Text style={{ color: '#94a3b8', fontSize: 12 }}>✕</Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* Autocomplete Suggestions Box for Drop */}
              {activeInput === idx && dropSuggestions[idx] && dropSuggestions[idx].length > 0 && (
                <View style={styles.suggestionsContainer}>
                  <View style={styles.suggestionsHeader}>
                    <Text style={styles.suggestionsHeaderText}>Pune Destinations</Text>
                  </View>
                  {dropSuggestions[idx].map((item) => (
                    <TouchableOpacity
                      key={`drop-${idx}-${item.key}`}
                      style={styles.suggestionItem}
                      onPress={() => handleSelectDropSuggestion(idx, item)}
                    >
                      <Text style={styles.suggestionIcon}>🎯</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.suggestionTitle}>{item.name}</Text>
                        <Text style={styles.suggestionSub}>Pune Metropolitan (PMRDA)</Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {/* Quick Saved Address Chips for Drops */}
              {savedAddresses.length > 0 && (
                <View style={{ marginTop: 6, marginBottom: 4 }}>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
                    {savedAddresses.map((addr) => (
                      <TouchableOpacity
                        key={'drop-' + idx + '-' + addr.id}
                        style={styles.addressChip}
                        onPress={() => {
                          handleDropChange(idx, `${addr.street}, ${addr.city}`);
                          setActiveInput(null);
                        }}
                      >
                        <Text style={styles.addressChipIcon}>
                          {addr.label?.toLowerCase().includes('home')
                            ? '🏠'
                            : addr.label?.toLowerCase().includes('office')
                            ? '🏢'
                            : '📍'}
                        </Text>
                        <Text style={styles.addressChipText}>{addr.label || 'Saved'}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}
            </View>
          ))}

          {/* Out of Service Boundary Warning */}
          {scopeWarning ? (
            <View style={styles.outOfScopeNotice}>
              <Text style={styles.outOfScopeText}>⚠️ {scopeWarning}</Text>
            </View>
          ) : null}

          {/* Road Distance & Route Tracking Telematics Card */}
          {isCalculatingRoute ? (
            <View style={styles.routePill}>
              <ActivityIndicator size="small" color="#f59e0b" style={{ marginRight: 6 }} />
              <Text style={styles.routePillText}>Mapping road route & calculating GPS telematics...</Text>
            </View>
          ) : roadDistanceKm > 0 ? (
            <View style={styles.routeCard}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={{ fontSize: 14 }}>🛣️</Text>
                  <Text style={styles.routeCardTitle}>Pune Road Route & Telematics</Text>
                </View>
                <Text style={styles.routeCardBadge}>● GPS Precision</Text>
              </View>

              <View style={{ flexDirection: 'row', marginTop: 10, justifyContent: 'space-around' }}>
                <View style={{ alignItems: 'center' }}>
                  <Text style={styles.telemetryLabel}>ROAD DISTANCE</Text>
                  <Text style={styles.telemetryVal}>{roadDistanceKm} km</Text>
                </View>
                <View style={{ alignItems: 'center' }}>
                  <Text style={styles.telemetryLabel}>DRIVE TIME</Text>
                  <Text style={styles.telemetryVal}>~{roadDurationMin} mins</Text>
                </View>
                <View style={{ alignItems: 'center' }}>
                  <Text style={styles.telemetryLabel}>EST. ARRIVAL</Text>
                  <Text style={styles.telemetryVal}>
                    {(() => {
                      try {
                        const [hStr, mStr] = time.split(':');
                        const totalMins = parseInt(hStr, 10) * 60 + parseInt(mStr, 10) + roadDurationMin;
                        const arrH = Math.floor(totalMins / 60) % 24;
                        const arrM = totalMins % 60;
                        const p = arrH >= 12 ? 'PM' : 'AM';
                        const h12 = arrH % 12 === 0 ? 12 : arrH % 12;
                        return `${String(h12).padStart(2, '0')}:${String(arrM).padStart(2, '0')} ${p}`;
                      } catch {
                        return '~' + roadDurationMin + 'm';
                      }
                    })()}
                  </Text>
                </View>
                <View style={{ alignItems: 'center' }}>
                  <Text style={styles.telemetryLabel}>CO₂ OFFSET</Text>
                  <Text style={[styles.telemetryVal, { color: '#10b981' }]}>
                    {(roadDistanceKm * 0.12).toFixed(1)} kg
                  </Text>
                </View>
              </View>
            </View>
          ) : null}

          {/* Add Stop Button */}
          <TouchableOpacity style={styles.addStopBtn} onPress={addStop}>
            <Text style={styles.addStopBtnText}>+ Add Another Stop (+₹150)</Text>
          </TouchableOpacity>
        </View>

        {/* SECTION 2: VEHICLE SELECTION */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>🚚 Select Vehicle Size</Text>

          <View style={styles.tempoGrid}>
            <TouchableOpacity
              style={[styles.tempoOption, tempoType === 'small' && styles.tempoOptionActive]}
              onPress={() => setTempoType('small')}
            >
              <Text style={styles.tempoIcon}>🛺</Text>
              <Text style={styles.tempoName}>Small</Text>
              <Text style={styles.tempoModel}>Tata Ace</Text>
              <Text style={styles.tempoWeight}>Max 750kg</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tempoOption, tempoType === 'medium' && styles.tempoOptionActive]}
              onPress={() => setTempoType('medium')}
            >
              <Text style={styles.tempoIcon}>🚐</Text>
              <Text style={styles.tempoName}>Medium</Text>
              <Text style={styles.tempoModel}>Bolero Pickup</Text>
              <Text style={styles.tempoWeight}>Max 1,500kg</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tempoOption, tempoType === 'large' && styles.tempoOptionActive]}
              onPress={() => setTempoType('large')}
            >
              <Text style={styles.tempoIcon}>🚛</Text>
              <Text style={styles.tempoName}>Large</Text>
              <Text style={styles.tempoModel}>14ft Truck</Text>
              <Text style={styles.tempoWeight}>Max 5,000kg</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* SECTION 3: CARGO DETAILS, DATE & 12-HOUR TIME */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>📦 Cargo & Schedule</Text>

          <View style={styles.rowInputs}>
            <View style={{ flex: 1, marginRight: 8 }}>
              <Text style={styles.inputLabel}>Weight (kg)</Text>
              <TextInput
                style={styles.input}
                value={weight}
                onChangeText={setWeight}
                keyboardType="numeric"
                placeholder="150"
                placeholderTextColor="#748bac"
              />
            </View>

            <View style={{ flex: 1, marginLeft: 8 }}>
              <Text style={styles.inputLabel}>Goods Category</Text>
              <TextInput
                style={styles.input}
                value={goodsType}
                onChangeText={setGoodsType}
                placeholder="Electronics"
                placeholderTextColor="#748bac"
              />
            </View>
          </View>

          {/* DATE & TIME SELECTORS */}
          <View style={[styles.rowInputs, { marginTop: 14 }]}>
            {/* PICKUP DATE (Calendar Picker with Today to +30 days constraint) */}
            <View style={{ flex: 1, marginRight: 8 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <Text style={styles.inputLabel}>Pickup Date</Text>
                <Text style={styles.dateSubConstraint}>Max 30 days</Text>
              </View>

              <TouchableOpacity
                style={styles.selectorBox}
                onPress={() => {
                  setCalendarMonth(new Date());
                  setShowCalendarModal(true);
                }}
              >
                <Text style={styles.selectorBoxIcon}>📅</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.selectorBoxVal}>{formatDateDisplay(date)}</Text>
                  <Text style={styles.selectorBoxSub}>Tap for Calendar</Text>
                </View>
              </TouchableOpacity>
            </View>

            {/* PICKUP TIME (12-Hour AM/PM Selector) */}
            <View style={{ flex: 1, marginLeft: 8 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <Text style={styles.inputLabel}>Pickup Time</Text>
                <Text style={styles.dateSubConstraint}>12h AM/PM</Text>
              </View>

              <TouchableOpacity style={styles.selectorBox} onPress={handleOpenTimeModal}>
                <Text style={styles.selectorBoxIcon}>🕒</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.selectorBoxVal}>{formatTime12h(time)}</Text>
                  <Text style={styles.selectorBoxSub}>Tap to Change</Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>

          {/* Quick Date Chips */}
          <View style={{ marginTop: 10 }}>
            <Text style={{ color: '#94a3b8', fontSize: 11, marginBottom: 5 }}>Quick Date Selection:</Text>
            <View style={{ flexDirection: 'row', gap: 6 }}>
              <TouchableOpacity
                style={[styles.quickChip, date === todayStr && styles.quickChipActive]}
                onPress={() => setQuickDate(0)}
              >
                <Text style={[styles.quickChipText, date === todayStr && styles.quickChipActiveText]}>
                  Today
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.quickChip,
                  (() => {
                    const tom = new Date();
                    tom.setDate(tom.getDate() + 1);
                    return date === tom.toISOString().split('T')[0];
                  })() && styles.quickChipActive,
                ]}
                onPress={() => setQuickDate(1)}
              >
                <Text style={styles.quickChipText}>Tomorrow</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.quickChip,
                  (() => {
                    const in2 = new Date();
                    in2.setDate(in2.getDate() + 2);
                    return date === in2.toISOString().split('T')[0];
                  })() && styles.quickChipActive,
                ]}
                onPress={() => setQuickDate(2)}
              >
                <Text style={styles.quickChipText}>In 2 Days</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.quickChip, { backgroundColor: '#1e293b' }]}
                onPress={() => setShowCalendarModal(true)}
              >
                <Text style={[styles.quickChipText, { color: '#f59e0b' }]}>📅 Calendar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* SECTION 4: PAYMENT METHOD */}
        <View style={styles.card}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <Text style={styles.cardTitle}>💳 Payment Method</Text>
            {walletBalance !== null && (
              <Text style={{ fontSize: 12, color: '#f08b65', fontWeight: '600' }}>
                Wallet: ₹{walletBalance.toFixed(2)}
              </Text>
            )}
          </View>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TouchableOpacity
              style={[styles.tempoOption, paymentMethod === 'online' && styles.tempoOptionActive, { flex: 1, paddingVertical: 10 }]}
              onPress={() => setPaymentMethod('online')}
            >
              <Text style={{ fontSize: 20, marginBottom: 2 }}>UPI</Text>
              <Text style={[styles.tempoName, { fontSize: 13 }]}>Online</Text>
              <Text style={styles.tempoModel}>Cards/UPI</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tempoOption, paymentMethod === 'cash' && styles.tempoOptionActive, { flex: 1, paddingVertical: 10 }]}
              onPress={() => setPaymentMethod('cash')}
            >
              <Text style={{ fontSize: 20, marginBottom: 2 }}>💵</Text>
              <Text style={[styles.tempoName, { fontSize: 13 }]}>Cash</Text>
              <Text style={styles.tempoModel}>Pay to Driver</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tempoOption, paymentMethod === 'wallet' && styles.tempoOptionActive, { flex: 1, paddingVertical: 10 }]}
              onPress={() => setPaymentMethod('wallet')}
            >
              <Text style={{ fontSize: 20, marginBottom: 2 }}>👛</Text>
              <Text style={[styles.tempoName, { fontSize: 13 }]}>Wallet</Text>
              <Text
                style={[
                  styles.tempoModel,
                  walletBalance !== null && walletBalance < estimatedFare
                    ? { color: '#ef4444' }
                    : { color: '#4ade80' },
                ]}
              >
                {walletBalance !== null
                  ? walletBalance >= estimatedFare
                    ? '₹' + walletBalance.toFixed(0)
                    : 'Low Bal'
                  : 'Wallet'}
              </Text>
            </TouchableOpacity>
          </View>

          {paymentMethod === 'wallet' && walletBalance !== null && walletBalance < estimatedFare && (
            <View
              style={{
                marginTop: 10,
                padding: 10,
                backgroundColor: 'rgba(239, 68, 68, 0.15)',
                borderRadius: 8,
                borderWidth: 1,
                borderColor: 'rgba(239, 68, 68, 0.3)',
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <Text style={{ color: '#fca5a5', fontSize: 12, flex: 1, marginRight: 8 }}>
                ⚠️ Wallet balance (₹{walletBalance.toFixed(2)}) is less than total fare (₹{estimatedFare}). Please top up
                your wallet.
              </Text>
              <TouchableOpacity
                onPress={() => {
                  const shortfall = Math.max(10, Math.ceil(estimatedFare - (walletBalance || 0)));
                  setTopUpAmount(String(shortfall));
                  setShowTopUpModal(true);
                  setTopUpError('');
                  setTopUpSuccess('');
                  setIsWaitingTopUpUpi(false);
                }}
                style={{ backgroundColor: '#e86331', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6 }}
              >
                <Text style={{ color: '#fff', fontSize: 12, fontWeight: 'bold' }}>Top Up</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* SECTION 4.5: PROMO & REFERRAL CODE */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>🏷️ Have a Referral or Promo Code?</Text>
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
            <TextInput
              style={[
                styles.input,
                { flex: 1, borderColor: promoDiscount > 0 ? '#10b981' : '#334155' }
              ]}
              placeholder="e.g. OMKAR100 or EMINENCE-XYZ123"
              placeholderTextColor="#748bac"
              autoCapitalize="characters"
              value={promoCode}
              editable={promoDiscount === 0}
              onChangeText={(val) => setPromoCode(val.toUpperCase())}
            />
            <TouchableOpacity
              style={[
                styles.promoApplyBtn,
                (promoDiscount > 0 || !promoCode.trim() || isApplyingPromo) && styles.promoApplyBtnDisabled
              ]}
              onPress={handleApplyPromo}
              disabled={promoDiscount > 0 || !promoCode.trim() || isApplyingPromo}
            >
              {isApplyingPromo ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.promoApplyBtnText}>{promoDiscount > 0 ? 'Applied' : 'Apply'}</Text>
              )}
            </TouchableOpacity>
          </View>
          {promoMessage ? (
            <Text
              style={{
                fontSize: 12,
                marginTop: 6,
                fontWeight: '600',
                color: promoMessage.type === 'success' ? '#10b981' : '#ef4444',
              }}
            >
              {promoMessage.text}
            </Text>
          ) : null}
        </View>

        {/* SECTION 5: FARE BREAKDOWN & CONFIRM */}
        <View style={styles.fareCard}>
          <View style={styles.fareRow}>
            <Text style={styles.fareLabel}>Base Fare ({tempoType.toUpperCase()})</Text>
            <Text style={styles.fareVal}>
              ₹{tempoType === 'small' ? 350 : tempoType === 'medium' ? 550 : 1100}
            </Text>
          </View>

          {drops.length > 1 && (
            <View style={styles.fareRow}>
              <Text style={styles.fareLabel}>Multi-Stop Surcharge ({drops.length - 1} stops)</Text>
              <Text style={styles.fareVal}>₹{(drops.length - 1) * 150}</Text>
            </View>
          )}

          {roadDistanceKm > 0 && (
            <View style={styles.fareRow}>
              <Text style={styles.fareLabel}>Road Distance ({roadDistanceKm} km)</Text>
              <Text style={styles.fareVal}>
                {roadDistanceKm > 5 ? `+₹${Math.round((roadDistanceKm - 5) * 18)}` : 'Included'}
              </Text>
            </View>
          )}

          {user?.isPro && (
            <View style={styles.fareRow}>
              <Text style={[styles.fareLabel, { color: '#f59e0b' }]}>⭐ Eminence Pro (5% Discount)</Text>
              <Text style={[styles.fareVal, { color: '#f59e0b' }]}>Applied</Text>
            </View>
          )}

          {promoDiscount > 0 && (
            <View style={styles.fareRow}>
              <Text style={[styles.fareLabel, { color: '#10b981' }]}>🏷️ Promo Discount</Text>
              <Text style={[styles.fareVal, { color: '#10b981' }]}>-₹{promoDiscount}</Text>
            </View>
          )}

          <View style={styles.fareRow}>
            <Text style={styles.fareLabel}>Estimated CO2 Offset</Text>
            <Text style={styles.esgVal}>
              🌿 ~{roadDistanceKm > 0 ? (roadDistanceKm * 0.12).toFixed(1) : '3.2'} kg
            </Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total Estimated Cost</Text>
            <Text style={styles.totalVal}>₹{estimatedFare}</Text>
          </View>

          <TouchableOpacity
            style={styles.confirmBtn}
            onPress={handleConfirmBooking}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.confirmBtnText}>Confirm Booking (₹{estimatedFare})</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* ======================================================== */}
      {/* 📅 CALENDAR MODAL (STRICT: TODAY TO TODAY + 30 DAYS)     */}
      {/* ======================================================== */}
      <Modal visible={showCalendarModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.calendarModalContent}>
            {/* Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalHeaderTitle}>Select Pickup Date</Text>
              <TouchableOpacity onPress={() => setShowCalendarModal(false)}>
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Service Notice */}
            <View style={styles.calendarNoticeBadge}>
              <Text style={styles.calendarNoticeText}>
                📌 Advance booking allowed up to 30 days. Past dates are disabled.
              </Text>
            </View>

            {/* Month & Year Navigation */}
            <View style={styles.calendarNavRow}>
              <TouchableOpacity
                style={[styles.calendarNavBtn, isPrevMonthDisabled() && styles.calendarNavBtnDisabled]}
                disabled={isPrevMonthDisabled()}
                onPress={() => {
                  setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1));
                }}
              >
                <Text style={[styles.calendarNavBtnText, isPrevMonthDisabled() && { color: '#475569' }]}>◀</Text>
              </TouchableOpacity>

              <Text style={styles.calendarNavMonthText}>
                {calendarMonth.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}
              </Text>

              <TouchableOpacity
                style={[styles.calendarNavBtn, isNextMonthDisabled() && styles.calendarNavBtnDisabled]}
                disabled={isNextMonthDisabled()}
                onPress={() => {
                  setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1));
                }}
              >
                <Text style={[styles.calendarNavBtnText, isNextMonthDisabled() && { color: '#475569' }]}>▶</Text>
              </TouchableOpacity>
            </View>

            {/* Day of Week Headers */}
            <View style={styles.calendarWeekHeader}>
              {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d) => (
                <Text key={d} style={styles.calendarWeekDay}>
                  {d}
                </Text>
              ))}
            </View>

            {/* Days Grid */}
            <View style={styles.calendarDaysGrid}>{renderCalendarDays()}</View>

            {/* Modal Actions */}
            <View style={styles.modalActionsRow}>
              <TouchableOpacity
                style={styles.modalSecondaryBtn}
                onPress={() => {
                  setDate(todayStr);
                  setShowCalendarModal(false);
                }}
              >
                <Text style={styles.modalSecondaryBtnText}>Select Today</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalPrimaryBtn}
                onPress={() => setShowCalendarModal(false)}
              >
                <Text style={styles.modalPrimaryBtnText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ======================================================== */}
      {/* 🕒 12-HOUR AM/PM TIME PICKER MODAL                      */}
      {/* ======================================================== */}
      <Modal visible={showTimeModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.timeModalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalHeaderTitle}>Select Pickup Time (12h AM/PM)</Text>
              <TouchableOpacity onPress={() => setShowTimeModal(false)}>
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Big Preview Display */}
            <View style={styles.timePreviewCard}>
              <Text style={styles.timePreviewValue}>
                {String(selectedHour12).padStart(2, '0')} : {String(selectedMinute).padStart(2, '0')}{' '}
                <Text style={{ color: '#f59e0b', fontSize: 24 }}>{selectedPeriod}</Text>
              </Text>
              <Text style={styles.timePreviewSub}>Formatted 12-Hour Pune Dispatch Time</Text>
            </View>

            {/* AM / PM Toggle */}
            <View style={styles.periodToggleRow}>
              <TouchableOpacity
                style={[styles.periodBtn, selectedPeriod === 'AM' && styles.periodBtnActive]}
                onPress={() => setSelectedPeriod('AM')}
              >
                <Text style={[styles.periodBtnText, selectedPeriod === 'AM' && styles.periodBtnTextActive]}>
                  ☀️ AM (Morning)
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.periodBtn, selectedPeriod === 'PM' && styles.periodBtnActive]}
                onPress={() => setSelectedPeriod('PM')}
              >
                <Text style={[styles.periodBtnText, selectedPeriod === 'PM' && styles.periodBtnTextActive]}>
                  🌙 PM (Afternoon / Evening)
                </Text>
              </TouchableOpacity>
            </View>

            {/* Hour Selector (1-12) */}
            <Text style={styles.pickerSubSectionTitle}>Hour (1 to 12)</Text>
            <View style={styles.hoursGrid}>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((h) => (
                <TouchableOpacity
                  key={`hour-${h}`}
                  style={[styles.hourPill, selectedHour12 === h && styles.hourPillActive]}
                  onPress={() => setSelectedHour12(h)}
                >
                  <Text style={[styles.hourPillText, selectedHour12 === h && styles.hourPillTextActive]}>
                    {String(h).padStart(2, '0')}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Minute Selector (:00, :15, :30, :45) */}
            <Text style={[styles.pickerSubSectionTitle, { marginTop: 12 }]}>Minute</Text>
            <View style={styles.minutesRow}>
              {[0, 15, 30, 45].map((m) => (
                <TouchableOpacity
                  key={`min-${m}`}
                  style={[styles.minutePill, selectedMinute === m && styles.minutePillActive]}
                  onPress={() => setSelectedMinute(m)}
                >
                  <Text style={[styles.minutePillText, selectedMinute === m && styles.minutePillTextActive]}>
                    :{String(m).padStart(2, '0')}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Quick Time Slots */}
            <Text style={[styles.pickerSubSectionTitle, { marginTop: 12 }]}>Quick Slots:</Text>
            <View style={styles.quickSlotsRow}>
              <TouchableOpacity
                style={styles.quickSlotChip}
                onPress={() => {
                  setSelectedHour12(9);
                  setSelectedMinute(0);
                  setSelectedPeriod('AM');
                }}
              >
                <Text style={styles.quickSlotChipText}>09:00 AM</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.quickSlotChip}
                onPress={() => {
                  setSelectedHour12(2);
                  setSelectedMinute(0);
                  setSelectedPeriod('PM');
                }}
              >
                <Text style={styles.quickSlotChipText}>02:00 PM</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.quickSlotChip}
                onPress={() => {
                  setSelectedHour12(6);
                  setSelectedMinute(30);
                  setSelectedPeriod('PM');
                }}
              >
                <Text style={styles.quickSlotChipText}>06:30 PM</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.quickSlotChip}
                onPress={() => {
                  setSelectedHour12(8);
                  setSelectedMinute(0);
                  setSelectedPeriod('PM');
                }}
              >
                <Text style={styles.quickSlotChipText}>08:00 PM</Text>
              </TouchableOpacity>
            </View>

            {/* Confirm Button */}
            <TouchableOpacity style={styles.confirmTimeBtn} onPress={handleConfirmTime}>
              <Text style={styles.confirmTimeBtnText}>
                Confirm Time: {String(selectedHour12).padStart(2, '0')}:{String(selectedMinute).padStart(2, '0')}{' '}
                {selectedPeriod}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ======================================================== */}
      {/* 👛 IN-PLACE WALLET TOP-UP MODAL                          */}
      {/* ======================================================== */}
      <Modal
        visible={showTopUpModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowTopUpModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.topUpModalContent}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <Text style={styles.modalHeaderTitle}>Top Up Wallet</Text>
              <TouchableOpacity onPress={() => setShowTopUpModal(false)} style={{ padding: 4 }}>
                <Text style={{ color: '#94a3b8', fontSize: 18, fontWeight: 'bold' }}>✕</Text>
              </TouchableOpacity>
            </View>

            <Text style={{ color: '#94a3b8', fontSize: 12, marginBottom: 12, lineHeight: 16 }}>
              Recharge your wallet to complete this tempo booking without losing your addresses and cargo details.
            </Text>

            {topUpError ? (
              <View style={{ backgroundColor: 'rgba(239, 68, 68, 0.15)', borderWidth: 1, borderColor: '#ef4444', borderRadius: 8, padding: 8, marginBottom: 10 }}>
                <Text style={{ color: '#fca5a5', fontSize: 12 }}>{topUpError}</Text>
              </View>
            ) : null}

            {topUpSuccess ? (
              <View style={{ backgroundColor: 'rgba(34, 197, 94, 0.15)', borderWidth: 1, borderColor: 'rgba(34, 197, 94, 0.4)', borderRadius: 8, padding: 8, marginBottom: 10 }}>
                <Text style={{ color: '#86efac', fontSize: 12, fontWeight: '600' }}>{topUpSuccess}</Text>
              </View>
            ) : null}

            {/* Fare & Shortfall Breakdown Banner */}
            <View style={styles.shortfallCard}>
              <View style={styles.shortfallRow}>
                <Text style={styles.shortfallLabel}>Estimated Trip Fare:</Text>
                <Text style={styles.shortfallVal}>₹{estimatedFare}</Text>
              </View>
              <View style={styles.shortfallRow}>
                <Text style={styles.shortfallLabel}>Current Balance:</Text>
                <Text style={styles.shortfallVal}>₹{walletBalance !== null ? walletBalance.toFixed(2) : '0.00'}</Text>
              </View>
              <View style={[styles.shortfallRow, { borderTopWidth: 1, borderTopColor: '#334155', paddingTop: 6, marginTop: 4 }]}>
                <Text style={[styles.shortfallLabel, { color: '#f08b65', fontWeight: 'bold' }]}>Shortfall Needed:</Text>
                <Text style={[styles.shortfallVal, { color: '#f08b65', fontWeight: 'bold' }]}>
                  ₹{Math.max(0, Math.ceil(estimatedFare - (walletBalance || 0)))}
                </Text>
              </View>
            </View>

            {/* Quick Chips */}
            <Text style={styles.inputLabel}>Quick Amount Selection</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
              {(() => {
                const shortfall = Math.max(10, Math.ceil(estimatedFare - (walletBalance || 0)));
                const chips = [String(shortfall)];
                ['100', '250', '500', '1000'].forEach((c) => {
                  if (!chips.includes(c)) chips.push(c);
                });
                return chips.map((chip) => {
                  const isSelected = topUpAmount === chip;
                  const isShortfall = chip === String(shortfall);
                  return (
                    <TouchableOpacity
                      key={`topup-chip-${chip}`}
                      style={[styles.topUpChip, isSelected && styles.topUpChipActive]}
                      onPress={() => {
                        setTopUpAmount(chip);
                        setTopUpError('');
                      }}
                    >
                      <Text style={[styles.topUpChipText, isSelected && styles.topUpChipTextActive]}>
                        ₹{chip} {isShortfall ? '(Shortfall)' : ''}
                      </Text>
                    </TouchableOpacity>
                  );
                });
              })()}
            </View>

            {/* Custom Input */}
            <Text style={styles.inputLabel}>Or Enter Custom Amount (₹)</Text>
            <View style={styles.amountInputContainer}>
              <Text style={styles.currencyPrefix}>₹</Text>
              <TextInput
                style={styles.amountInputText}
                value={topUpAmount}
                onChangeText={(val) => {
                  setTopUpAmount(val.replace(/[^0-9]/g, ''));
                  setTopUpError('');
                }}
                placeholder="350"
                placeholderTextColor="#748bac"
                keyboardType="number-pad"
              />
            </View>

            {/* UPI Waiting prompt */}
            {isWaitingTopUpUpi && (
              <View style={styles.upiWaitingBox}>
                <Text style={{ fontSize: 16 }}>📱</Text>
                <View style={{ flex: 1, marginLeft: 8 }}>
                  <Text style={styles.upiWaitingTitle}>UPI App Dispatched</Text>
                  <Text style={styles.upiWaitingSub}>
                    Complete transaction in GPay / PhonePe / Paytm, then tap below to credit wallet.
                  </Text>
                </View>
              </View>
            )}

            {/* Actions */}
            <View style={{ gap: 10, marginTop: 10 }}>
              {isWaitingTopUpUpi ? (
                <TouchableOpacity
                  style={[styles.confirmBtn, { backgroundColor: '#10b981', marginVertical: 0 }]}
                  onPress={() => verifyWalletTopUpPayment()}
                  disabled={topUpLoading}
                >
                  {topUpLoading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.confirmBtnText}>✅ Confirm & Credit ₹{topUpAmount || '0'}</Text>
                  )}
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={[styles.confirmBtn, { backgroundColor: '#059669', marginVertical: 0, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6 }]}
                  onPress={handleTopUpUpi}
                  disabled={topUpLoading}
                >
                  {topUpLoading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <>
                      <Text style={{ fontSize: 16 }}>⚡</Text>
                      <Text style={styles.confirmBtnText}>Pay via UPI (GPay / PhonePe / Paytm)</Text>
                    </>
                  )}
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={[styles.confirmBtn, { backgroundColor: '#e86331', marginVertical: 0 }]}
                onPress={handleTopUpCards}
                disabled={topUpLoading}
              >
                {topUpLoading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.confirmBtnText}>Pay via Razorpay / Cards</Text>
                )}
              </TouchableOpacity>

              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
                <TouchableOpacity
                  onPress={() => {
                    setShowTopUpModal(false);
                    router.push('/(customer)/dashboard?tab=wallet' as any);
                  }}
                  style={{ paddingVertical: 6 }}
                >
                  <Text style={{ color: '#e86331', fontSize: 12, fontWeight: '600' }}>
                    Open Wallet in Account Tab ➔
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setShowTopUpModal(false)}
                  style={{ paddingVertical: 6, paddingHorizontal: 12 }}
                >
                  <Text style={{ color: '#94a3b8', fontSize: 12 }}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>

      {/* RAZORPAY NATIVE / DIRECT UPI CHECKOUT MODAL */}
      <Modal visible={showRazorpay} animationType="slide" presentationStyle="pageSheet">
        <View style={{ flex: 1, backgroundColor: '#0f141f', padding: 20, justifyContent: 'center' }}>
          <View style={{ backgroundColor: '#1a2235', padding: 24, borderRadius: 18, alignItems: 'center', borderWidth: 1, borderColor: '#334155' }}>
            <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: '#064e3b', justifyContent: 'center', alignItems: 'center', marginBottom: 16 }}>
              <Text style={{ fontSize: 32 }}>📱</Text>
            </View>
            <Text style={{ color: '#fff', fontSize: 20, fontWeight: 'bold', marginBottom: 4 }}>
              Direct UPI / Online Checkout
            </Text>
            <Text style={{ color: '#94a3b8', fontSize: 13, textAlign: 'center', marginBottom: 16 }}>
              Amount Payable
            </Text>
            <Text style={{ color: '#e86331', fontSize: 28, fontWeight: 'bold', marginBottom: 16 }}>
              ₹{currentOrder?.amount ? (currentOrder.amount / 100).toFixed(2) : estimatedFare.toFixed(2)}
            </Text>

            <View style={{ backgroundColor: 'rgba(5, 150, 105, 0.15)', borderWidth: 1, borderColor: '#059669', borderRadius: 10, padding: 12, width: '100%', marginBottom: 20 }}>
              <Text style={{ color: '#34d399', fontSize: 13, fontWeight: '600', marginBottom: 2, textAlign: 'center' }}>
                ⚡ UPI App Dispatched
              </Text>
              <Text style={{ color: '#cbd5e1', fontSize: 12, textAlign: 'center', lineHeight: 18 }}>
                If your UPI app (Google Pay, PhonePe, Paytm) opened, authorize payment and tap below to confirm.
              </Text>
            </View>

            <TouchableOpacity
              style={[styles.confirmBtn, { width: '100%', marginBottom: 10, backgroundColor: '#059669' }]}
              onPress={handleRazorpaySuccess}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.confirmBtnText}>✅ Payment Approved — Confirm & Track</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.confirmBtn, { width: '100%', marginBottom: 10, backgroundColor: '#1e293b', borderWidth: 1, borderColor: '#3b82f6' }]}
              onPress={handleUpiPayment}
              disabled={isSubmitting}
            >
              <Text style={[styles.confirmBtnText, { color: '#60a5fa' }]}>📱 Re-launch UPI (GPay / PhonePe / Paytm)</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.confirmBtn, { width: '100%', marginBottom: 12, backgroundColor: '#2d3748' }]}
              onPress={handleRazorpaySuccess}
              disabled={isSubmitting}
            >
              <Text style={styles.confirmBtnText}>💳 Pay via Cards / NetBanking / Mock</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={{ paddingVertical: 10 }}
              onPress={() => setShowRazorpay(false)}
              disabled={isSubmitting}
            >
              <Text style={{ color: '#94a3b8', fontSize: 13 }}>Cancel Payment</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f141f',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 52,
    paddingBottom: 16,
    backgroundColor: '#293243',
    borderBottomWidth: 1,
    borderBottomColor: '#2f3a4e',
  },
  backBtn: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: '#2f3a4e',
  },
  backBtnText: {
    color: '#c9d3df',
    fontSize: 13,
    fontWeight: '600',
  },
  headerTitle: {
    color: '#f4f6f8',
    fontSize: 18,
    fontWeight: '700',
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  errorBox: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderColor: '#ef4444',
    borderWidth: 1,
    padding: 12,
    borderRadius: 10,
    marginBottom: 16,
  },
  errorText: {
    color: '#fca5a5',
    fontSize: 13,
  },
  card: {
    backgroundColor: '#293243',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#2f3a4e',
  },
  cardTitle: {
    color: '#f4f6f8',
    fontSize: 16,
    fontWeight: '700',
  },
  gpsActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderWidth: 1,
    borderColor: '#10b981',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  gpsActionBtnText: {
    color: '#34d399',
    fontSize: 11,
    fontWeight: '700',
  },
  inputLabel: {
    color: '#a2b2c7',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
  },
  inputWrapper: {
    position: 'relative',
    justifyContent: 'center',
  },
  input: {
    backgroundColor: '#0f141f',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#2f3a4e',
    paddingVertical: 12,
    paddingHorizontal: 14,
    color: '#f4f6f8',
    fontSize: 14,
  },
  clearInputBtn: {
    position: 'absolute',
    right: 12,
    padding: 6,
  },
  suggestionsContainer: {
    backgroundColor: '#161f30',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e86331',
    marginTop: 4,
    overflow: 'hidden',
  },
  suggestionsHeader: {
    backgroundColor: '#1f293d',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#2b3952',
  },
  suggestionsHeaderText: {
    color: '#f08b65',
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  suggestionIcon: {
    fontSize: 16,
    marginRight: 10,
  },
  suggestionTitle: {
    color: '#f4f6f8',
    fontSize: 13,
    fontWeight: '600',
  },
  suggestionSub: {
    color: '#94a3b8',
    fontSize: 10,
    marginTop: 1,
  },
  landmarkChip: {
    backgroundColor: '#1c2434',
    borderWidth: 1,
    borderColor: '#3b4b66',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  landmarkChipText: {
    color: '#e2e8f0',
    fontSize: 11,
    fontWeight: '600',
  },
  dropHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  removeStopText: {
    color: '#f87171',
    fontSize: 12,
    fontWeight: '600',
  },
  addStopBtn: {
    marginTop: 14,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e86331',
    borderStyle: 'dashed',
    alignItems: 'center',
    backgroundColor: 'rgba(232, 99, 49, 0.05)',
  },
  addStopBtnText: {
    color: '#f08b65',
    fontSize: 13,
    fontWeight: '600',
  },
  tempoGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  tempoOption: {
    flex: 1,
    backgroundColor: '#0f141f',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#2f3a4e',
  },
  tempoOptionActive: {
    borderColor: '#e86331',
    backgroundColor: 'rgba(232, 99, 49, 0.1)',
  },
  tempoIcon: {
    fontSize: 26,
    marginBottom: 4,
  },
  tempoName: {
    color: '#f4f6f8',
    fontSize: 14,
    fontWeight: '700',
  },
  tempoModel: {
    color: '#a2b2c7',
    fontSize: 11,
    marginTop: 2,
  },
  tempoWeight: {
    color: '#f08b65',
    fontSize: 10,
    fontWeight: '600',
    marginTop: 4,
  },
  rowInputs: {
    flexDirection: 'row',
  },
  dateSubConstraint: {
    color: '#f59e0b',
    fontSize: 10,
    fontWeight: '600',
  },
  selectorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0f141f',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#2f3a4e',
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  selectorBoxIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  selectorBoxVal: {
    color: '#f4f6f8',
    fontSize: 13,
    fontWeight: '700',
  },
  selectorBoxSub: {
    color: '#748bac',
    fontSize: 10,
    marginTop: 1,
  },
  quickChip: {
    backgroundColor: '#1a2235',
    borderWidth: 1,
    borderColor: '#2f3a4e',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  quickChipActive: {
    borderColor: '#e86331',
    backgroundColor: 'rgba(232, 99, 49, 0.15)',
  },
  quickChipText: {
    color: '#cbd5e1',
    fontSize: 11,
    fontWeight: '600',
  },
  quickChipActiveText: {
    color: '#f08b65',
    fontWeight: '700',
  },
  fareCard: {
    backgroundColor: '#293243',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#e86331',
  },
  fareRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  fareLabel: {
    color: '#a2b2c7',
    fontSize: 13,
  },
  fareVal: {
    color: '#c9d3df',
    fontSize: 13,
    fontWeight: '600',
  },
  esgVal: {
    color: '#4ade80',
    fontSize: 13,
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: '#2f3a4e',
    marginVertical: 12,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  totalLabel: {
    color: '#f4f6f8',
    fontSize: 16,
    fontWeight: '700',
  },
  totalVal: {
    color: '#e86331',
    fontSize: 24,
    fontWeight: '800',
  },
  confirmBtn: {
    backgroundColor: '#e86331',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  confirmBtnText: {
    color: '#f4f6f8',
    fontSize: 16,
    fontWeight: '700',
  },
  addressChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
    marginRight: 6,
  },
  addressChipIcon: {
    fontSize: 12,
    marginRight: 4,
  },
  addressChipText: {
    color: '#cbd5e1',
    fontSize: 11,
    fontWeight: '600',
  },
  routePill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1e1b4b',
    borderWidth: 1,
    borderColor: '#6366f1',
    borderRadius: 8,
    padding: 8,
    marginTop: 10,
  },
  routePillText: {
    color: '#a5b4fc',
    fontSize: 11,
    fontWeight: '600',
  },
  routeCard: {
    backgroundColor: '#161f30',
    borderWidth: 1,
    borderColor: '#f59e0b',
    borderRadius: 12,
    padding: 12,
    marginTop: 10,
  },
  routeCardTitle: {
    color: '#f59e0b',
    fontWeight: '700',
    fontSize: 12,
  },
  routeCardBadge: {
    color: '#10b981',
    fontSize: 10,
    fontWeight: '700',
  },
  telemetryLabel: {
    color: '#94a3b8',
    fontSize: 9,
    fontWeight: '700',
  },
  telemetryVal: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '800',
    marginTop: 2,
  },
  serviceAreaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderColor: '#10b981',
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
    marginBottom: 12,
  },
  serviceAreaBadgeText: {
    color: '#34d399',
    fontSize: 11,
    fontWeight: '700',
  },
  outOfScopeNotice: {
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderColor: '#ef4444',
    borderWidth: 1,
    borderRadius: 8,
    padding: 8,
    marginTop: 8,
  },
  outOfScopeText: {
    color: '#f87171',
    fontSize: 11,
    lineHeight: 16,
  },

  // Modal Common Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(10, 15, 26, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalHeaderTitle: {
    color: '#f4f6f8',
    fontSize: 16,
    fontWeight: '700',
  },
  modalCloseText: {
    color: '#94a3b8',
    fontSize: 18,
    padding: 4,
  },
  modalActionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },
  modalPrimaryBtn: {
    flex: 1,
    backgroundColor: '#e86331',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  modalPrimaryBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 13,
  },
  modalSecondaryBtn: {
    flex: 1,
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  modalSecondaryBtnText: {
    color: '#cbd5e1',
    fontWeight: '600',
    fontSize: 13,
  },

  // Calendar Modal Specific Styles
  calendarModalContent: {
    backgroundColor: '#1a2235',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#2f3a4e',
    padding: 18,
    width: '100%',
    maxWidth: 380,
  },
  calendarNoticeBadge: {
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    borderColor: '#f59e0b',
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
    marginBottom: 12,
  },
  calendarNoticeText: {
    color: '#fbbf24',
    fontSize: 11,
    fontWeight: '600',
  },
  calendarNavRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  calendarNavBtn: {
    backgroundColor: '#242f46',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  calendarNavBtnDisabled: {
    opacity: 0.3,
  },
  calendarNavBtnText: {
    color: '#f08b65',
    fontSize: 14,
    fontWeight: 'bold',
  },
  calendarNavMonthText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  calendarWeekHeader: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    borderBottomWidth: 1,
    borderBottomColor: '#2b3952',
    paddingBottom: 6,
    marginBottom: 6,
  },
  calendarWeekDay: {
    color: '#748bac',
    fontSize: 11,
    fontWeight: '700',
    width: 36,
    textAlign: 'center',
  },
  calendarDaysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
  },
  calendarDayCell: {
    width: 38,
    height: 38,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 3,
    borderRadius: 8,
    position: 'relative',
  },
  calendarDayText: {
    color: '#e2e8f0',
    fontSize: 13,
    fontWeight: '600',
  },
  calendarDayDisabledText: {
    color: '#475569',
    opacity: 0.3,
  },
  calendarDaySelected: {
    backgroundColor: '#e86331',
  },
  calendarDaySelectedText: {
    color: '#fff',
    fontWeight: '800',
  },
  calendarDayToday: {
    borderWidth: 1,
    borderColor: '#38bdf8',
  },
  calendarDayTodayText: {
    color: '#38bdf8',
  },
  todayDot: {
    position: 'absolute',
    bottom: 4,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#38bdf8',
  },

  // Time Modal Specific Styles
  timeModalContent: {
    backgroundColor: '#1a2235',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#2f3a4e',
    padding: 18,
    width: '100%',
    maxWidth: 380,
  },
  timePreviewCard: {
    backgroundColor: '#0f141f',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e86331',
    alignItems: 'center',
    paddingVertical: 14,
    marginBottom: 14,
  },
  timePreviewValue: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: 1,
  },
  timePreviewSub: {
    color: '#748bac',
    fontSize: 11,
    marginTop: 4,
  },
  periodToggleRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  periodBtn: {
    flex: 1,
    backgroundColor: '#0f141f',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#2f3a4e',
    paddingVertical: 10,
    alignItems: 'center',
  },
  periodBtnActive: {
    borderColor: '#f59e0b',
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
  },
  periodBtnText: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '600',
  },
  periodBtnTextActive: {
    color: '#f59e0b',
    fontWeight: '700',
  },
  pickerSubSectionTitle: {
    color: '#cbd5e1',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 6,
  },
  hoursGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  hourPill: {
    width: '14.8%',
    backgroundColor: '#0f141f',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#2f3a4e',
    paddingVertical: 8,
    alignItems: 'center',
  },
  hourPillActive: {
    borderColor: '#e86331',
    backgroundColor: '#e86331',
  },
  hourPillText: {
    color: '#cbd5e1',
    fontSize: 12,
    fontWeight: '600',
  },
  hourPillTextActive: {
    color: '#fff',
    fontWeight: '800',
  },
  minutesRow: {
    flexDirection: 'row',
    gap: 8,
  },
  minutePill: {
    flex: 1,
    backgroundColor: '#0f141f',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#2f3a4e',
    paddingVertical: 8,
    alignItems: 'center',
  },
  minutePillActive: {
    borderColor: '#e86331',
    backgroundColor: '#e86331',
  },
  minutePillText: {
    color: '#cbd5e1',
    fontSize: 13,
    fontWeight: '600',
  },
  minutePillTextActive: {
    color: '#fff',
    fontWeight: '800',
  },
  quickSlotsRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 16,
  },
  quickSlotChip: {
    flex: 1,
    backgroundColor: '#242f46',
    borderRadius: 6,
    paddingVertical: 6,
    alignItems: 'center',
  },
  quickSlotChipText: {
    color: '#93c5fd',
    fontSize: 11,
    fontWeight: '600',
  },
  confirmTimeBtn: {
    backgroundColor: '#e86331',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  confirmTimeBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  // In-Place Wallet Top-Up Modal Styles
  topUpModalContent: {
    backgroundColor: '#1a2235',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#2f3a4e',
    padding: 18,
    width: '100%',
    maxWidth: 380,
  },
  shortfallCard: {
    backgroundColor: '#0f141f',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#334155',
    padding: 12,
    marginBottom: 12,
  },
  shortfallRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 2,
  },
  shortfallLabel: {
    color: '#94a3b8',
    fontSize: 12,
  },
  shortfallVal: {
    color: '#f4f6f8',
    fontSize: 13,
    fontWeight: '700',
  },
  topUpChip: {
    backgroundColor: '#0f141f',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#2f3a4e',
    paddingVertical: 7,
    paddingHorizontal: 10,
  },
  topUpChipActive: {
    borderColor: '#e86331',
    backgroundColor: 'rgba(232, 99, 49, 0.15)',
  },
  topUpChipText: {
    color: '#cbd5e1',
    fontSize: 12,
    fontWeight: '600',
  },
  topUpChipTextActive: {
    color: '#e86331',
    fontWeight: '700',
  },
  amountInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0f141f',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#2f3a4e',
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  currencyPrefix: {
    color: '#e86331',
    fontSize: 18,
    fontWeight: '800',
    marginRight: 6,
  },
  amountInputText: {
    flex: 1,
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
    paddingVertical: 8,
  },
  upiWaitingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(5, 150, 105, 0.12)',
    borderWidth: 1,
    borderColor: '#059669',
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
  },
  upiWaitingTitle: {
    color: '#34d399',
    fontSize: 12,
    fontWeight: '700',
  },
  upiWaitingSub: {
    color: '#94a3b8',
    fontSize: 11,
    marginTop: 2,
  },
  promoApplyBtn: {
    backgroundColor: '#e86331',
    borderRadius: 8,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  promoApplyBtnDisabled: {
    opacity: 0.5,
  },
  promoApplyBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
});

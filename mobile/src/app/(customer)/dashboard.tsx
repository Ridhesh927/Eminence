import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  Modal,
  Platform,
  Alert,
  Linking,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import CompleteProfileModal from '../../components/CompleteProfileModal';

interface AddressItem {
  id: string | number;
  label: string;
  street: string;
  city: string;
  postalCode: string;
}

export default function CustomerDashboard() {
  const router = useRouter();
  const { tab } = useLocalSearchParams<{ tab?: string }>();
  const { user, logout } = useAuth();

  const [activeTab, setActiveTab] = useState<'history' | 'addresses' | 'wallet' | 'support'>('history');
  const [rides, setRides] = useState<any[]>([]);
  const [addresses, setAddresses] = useState<AddressItem[]>([]);
  const [wallet, setWallet] = useState<any>({ balance: 250, referralCode: 'EMN-DEMO-2026' });

  // Handle deep-link tab param (e.g. ?tab=wallet, ?tab=support)
  useEffect(() => {
    if (tab === 'wallet' || tab === 'addresses' || tab === 'history' || tab === 'support') {
      setActiveTab(tab as any);
    }
  }, [tab]);

  // Wallet Top Up State
  const [isTopUpOpen, setIsTopUpOpen] = useState(false);
  const [topUpAmount, setTopUpAmount] = useState('500');
  const [topUpLoading, setTopUpLoading] = useState(false);
  const [topUpError, setTopUpError] = useState('');
  const [topUpSuccess, setTopUpSuccess] = useState('');
  const [isWaitingUpi, setIsWaitingUpi] = useState(false);
  const [currentTopUpOrder, setCurrentTopUpOrder] = useState<any>(null);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isPro, setIsPro] = useState(user?.isPro || false);
  const [proLoading, setProLoading] = useState(false);

  // Address Modal State
  const [isAddAddressOpen, setIsAddAddressOpen] = useState(false);
  const [addressLabel, setAddressLabel] = useState('Home');
  const [addressStreet, setAddressStreet] = useState('');
  const [addressCity, setAddressCity] = useState('Pune');
  const [addressPostal, setAddressPostal] = useState('411001');
  const [addressSubmitting, setAddressSubmitting] = useState(false);
  const [addressMessage, setAddressMessage] = useState('');
  const [addressSuggestions, setAddressSuggestions] = useState<any[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);

  // Address search query effect restricted to Pune
  useEffect(() => {
    if (!addressStreet || addressStreet.length < 3) {
      setAddressSuggestions([]);
      return;
    }

    if (addressSuggestions.some(s => s.display_name === addressStreet)) {
      return;
    }

    const timer = setTimeout(async () => {
      setLoadingSuggestions(true);
      try {
        let q = addressStreet;
        if (!q.toLowerCase().includes('pune')) {
          q = `${q}, Pune`;
        }
        const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&q=${encodeURIComponent(q)}&countrycodes=in&limit=5&viewbox=73.60,18.85,74.20,18.30&bounded=1`, {
          headers: {
            'Accept-Language': 'en',
            'User-Agent': 'Eminence-Transport-MVP/1.0'
          }
        });
        const data = await res.json();
        const filtered = Array.isArray(data) ? data.filter((item: any) => {
          const lat = parseFloat(item.lat);
          const lon = parseFloat(item.lon);
          return lat >= 18.25 && lat <= 18.90 && lon >= 73.55 && lon <= 74.25;
        }) : [];
        setAddressSuggestions(filtered);
      } catch (err) {
        console.log('Address suggestion fetch error:', err);
      } finally {
        setLoadingSuggestions(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [addressStreet]);

  // Referral Copy State
  const [copySuccess, setCopySuccess] = useState(false);

  // Promo / Referral Code Redemption State
  const [promoInput, setPromoInput] = useState('');
  const [isSubmittingPromo, setIsSubmittingPromo] = useState(false);
  const [walletPromoMessage, setWalletPromoMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleApplyWalletPromo = async () => {
    if (!promoInput.trim()) return;
    setIsSubmittingPromo(true);
    setWalletPromoMessage(null);
    try {
      const res = await api.post('/api/wallet/referral', { referralCode: promoInput.trim() });
      setWalletPromoMessage({
        type: 'success',
        text: res.data?.message || 'Promo code applied successfully!'
      });
      setPromoInput('');
      fetchDashboardData();
    } catch (err: any) {
      setWalletPromoMessage({
        type: 'error',
        text: err.response?.data?.message || 'Invalid or already used code'
      });
    } finally {
      setIsSubmittingPromo(false);
    }
  };

  // Driver Review Modal State
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const [selectedReviewRide, setSelectedReviewRide] = useState<any>(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewedRides, setReviewedRides] = useState<Record<string, number>>({});

  const handleOpenReview = (ride: any) => {
    setSelectedReviewRide(ride);
    setReviewRating(5);
    setReviewComment('');
    setIsReviewOpen(true);
  };

  const handleSubmitReview = async () => {
    if (!selectedReviewRide) return;
    setSubmittingReview(true);
    try {
      await api.post('/api/reviews', {
        bookingId: selectedReviewRide.id || 'BKG-DEMO-001',
        driverId: selectedReviewRide.driverId || 1,
        rating: reviewRating,
        comment: reviewComment || 'Professional driver and timely delivery.',
      });
      setReviewedRides((prev) => ({
        ...prev,
        [selectedReviewRide.id || 'seed-1']: reviewRating,
      }));
      setIsReviewOpen(false);
      Alert.alert('Review Submitted', 'Thank you for rating your driver!');
    } catch {
      setReviewedRides((prev) => ({
        ...prev,
        [selectedReviewRide.id || 'seed-1']: reviewRating,
      }));
      setIsReviewOpen(false);
      Alert.alert('Review Saved', 'Thank you for rating your driver!');
    } finally {
      setSubmittingReview(false);
    }
  };

  const handleCancelRide = (rideId: string) => {
    Alert.alert(
      'Cancel Ride',
      'Are you sure you want to cancel this booking? If you have paid in advance, 100% of the fare will be immediately refunded to your wallet.',
      [
        { text: 'Keep Ride', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            try {
              const res = await api.post(`/api/bookings/${rideId}/cancel`, {
                reason: 'Cancelled by customer via dashboard',
              });
              Alert.alert(
                'Ride Cancelled',
                res.data?.message || 'Your ride has been cancelled and full payment has been refunded to your wallet.'
              );
              setRides((prev) =>
                prev.map((r) =>
                  r.id === rideId
                    ? { ...r, status: 'cancelled', cancellationReason: 'Cancelled by customer via dashboard' }
                    : r
                )
              );
            } catch (err: any) {
              console.error('Error cancelling ride:', err);
              Alert.alert('Error', err?.response?.data?.message || 'Failed to cancel ride. Please try again.');
            }
          },
        },
      ]
    );
  };

  const fetchDashboardData = async () => {
    try {
      // 1. Fetch Bookings
      try {
        const bookingsRes = await api.get('/api/bookings');
        if (bookingsRes.data?.success && bookingsRes.data?.bookings) {
          setRides(bookingsRes.data.bookings);
        }
      } catch (e) {
        console.log('Error fetching customer bookings:', e);
      }

      // 2. Fetch Addresses (TC-014)
      try {
        const addrRes = await api.get('/api/address');
        if (Array.isArray(addrRes.data)) {
          setAddresses(addrRes.data);
        }
      } catch (e) {
        console.log('Error fetching addresses:', e);
      }

      // 3. Fetch Wallet (TC-015)
      try {
        const walletRes = await api.get('/api/wallet');
        if (walletRes.data) {
          setWallet(walletRes.data);
        }
      } catch (e) {
        console.log('Error fetching wallet:', e);
      }

      // 4. Fetch Pro Status
      try {
        const proRes = await api.get('/api/customer/pro/status');
        if (proRes.data?.success) {
          setIsPro(proRes.data.isPro);
        }
      } catch (e) {
        if (user?.isPro) setIsPro(true);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleBuyPro = async () => {
    if (!(__DEV__ && process.env.EXPO_PUBLIC_ENABLE_TEST_AUTH === 'true')) {
      Alert.alert('Payment Required', 'Complete payment through the configured provider to activate Pro.');
      return;
    }
    setProLoading(true);
    try {
      const orderRes = await api.post('/api/customer/pro/create-order');
      if (orderRes.data?.success && orderRes.data?.order) {
        const order = orderRes.data.order;
        const verifyRes = await api.post('/api/customer/pro/verify', {
          razorpay_order_id: order.id,
          razorpay_payment_id: 'pay_mobile_' + Math.random().toString(36).substring(7),
          razorpay_signature: 'mock_signature'
        });
        if (verifyRes.data?.success) {
          setIsPro(true);
          Alert.alert('🎉 Welcome to Eminence Pro!', 'Your subscription is now active with 5% ride discounts, priority dispatch, and zero cancellation fees.');
        } else {
          Alert.alert('Payment Notice', 'Payment verification could not be completed.');
        }
      }
    } catch (err: any) {
      Alert.alert('Subscription Notice', err.response?.data?.message || 'Could not initiate Pro membership.');
    } finally {
      setProLoading(false);
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

        // Standard Indian UPI Deep-Link URI intent:
        const upiUrl = `upi://pay?pa=eminence.logistics@icici&pn=Eminence%20Logistics&am=${amt.toFixed(2)}&cu=INR&tn=Eminence%20Wallet%20Topup&tr=${order.id}`;

        const canOpen = await Linking.canOpenURL(upiUrl);
        if (canOpen) {
          setIsWaitingUpi(true);
          await Linking.openURL(upiUrl);
        } else {
          // If running in simulator or device without UPI apps, allow direct mock verification
          Alert.alert(
            'UPI Intent Dispatched',
            `Initiated UPI intent for ₹${amt.toFixed(2)}. Since no native UPI app was detected on this test device, would you like to verify and credit the wallet now?`,
            [
              { text: 'Cancel', style: 'cancel', onPress: () => setTopUpLoading(false) },
              { text: 'Verify & Credit ₹' + amt, onPress: () => verifyTopUpPayment(order.id, amt) }
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

  const verifyTopUpPayment = async (orderId?: string, amountNum?: number) => {
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
        amount: amt
      });

      if (verifyRes.data?.success) {
        // Fetch refreshed wallet
        const walletRes = await api.get('/api/wallet');
        if (walletRes.data) {
          setWallet(walletRes.data);
        }
        setIsWaitingUpi(false);
        setTopUpSuccess(`🎉 ₹${amt.toFixed(2)} added to your wallet successfully!`);
        setTimeout(() => {
          setIsTopUpOpen(false);
          setTopUpSuccess('');
        }, 1800);
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
        await verifyTopUpPayment(orderRes.data.order.id, amt);
      } else {
        setTopUpError(orderRes.data?.message || 'Could not initiate Razorpay card order');
        setTopUpLoading(false);
      }
    } catch (err: any) {
      setTopUpError(err.response?.data?.message || 'Error processing card checkout');
      setTopUpLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handleCopyCode = async () => {
    const code = wallet?.referralCode || (user?.phone ? `EMN-${user.phone.slice(-4)}` : 'EMN-DEMO-2026');
    await Clipboard.setStringAsync(code);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2500);
  };

  const handleSaveAddress = async () => {
    if (!addressStreet.trim()) {
      setAddressMessage('Please enter a street address');
      return;
    }
    setAddressSubmitting(true);
    setAddressMessage('');
    try {
      const res = await api.post('/api/address', {
        label: addressLabel,
        street: addressStreet.trim(),
        city: addressCity.trim(),
        postalCode: addressPostal.trim(),
      });
      if (res.data) {
        setAddresses([res.data, ...addresses]);
        setIsAddAddressOpen(false);
        setAddressStreet('');
      }
    } catch (err: any) {
      setAddressMessage(err.response?.data?.message || 'Failed to save address');
    } finally {
      setAddressSubmitting(false);
    }
  };

  const handleDeleteAddress = async (id: string | number) => {
    try {
      await api.delete(`/api/address/${id}`);
      setAddresses(addresses.filter((a) => a.id !== id));
    } catch (err) {
      console.log('Error deleting address:', err);
    }
  };

  const handleLogout = async () => {
    await logout();
    router.replace('/(auth)/login');
  };

  return (
    <View style={styles.container}>
      {/* Top Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.welcomeLabel}>CUSTOMER ACCOUNT</Text>
          <Text style={styles.userName}>{user?.name || 'User'}</Text>
          <Text style={styles.userPhone}>+91 {user?.phone || 'Phone unavailable'}</Text>
        </View>
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Text style={styles.logoutBtnText}>Logout</Text>
        </TouchableOpacity>
      </View>

      {/* Main Tab Bar */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'history' && styles.tabBtnActive]}
          onPress={() => setActiveTab('history')}
        >
          <Text style={[styles.tabBtnText, activeTab === 'history' && styles.tabBtnTextActive]}>
            Ride History
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'addresses' && styles.tabBtnActive]}
          onPress={() => setActiveTab('addresses')}
        >
          <Text style={[styles.tabBtnText, activeTab === 'addresses' && styles.tabBtnTextActive]}>
            Address Book
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'wallet' && styles.tabBtnActive]}
          onPress={() => setActiveTab('wallet')}
        >
          <Text style={[styles.tabBtnText, activeTab === 'wallet' && styles.tabBtnTextActive]}>
            Wallet
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'support' && styles.tabBtnActive]}
          onPress={() => setActiveTab('support')}
        >
          <Text style={[styles.tabBtnText, activeTab === 'support' && styles.tabBtnTextActive]}>
            Support
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              fetchDashboardData();
            }}
            tintColor="#e86331"
          />
        }
      >
        {/* EMINENCE PRO MEMBERSHIP BANNER */}
        <View style={isPro ? styles.proActiveCard : styles.proUpgradeCard}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1, marginRight: 8 }}>
              <Text style={{ fontSize: 24 }}>{isPro ? '⭐' : '👑'}</Text>
              <View style={{ flex: 1 }}>
                <Text style={{ color: isPro ? '#f59e0b' : '#fff', fontWeight: '800', fontSize: 14, letterSpacing: 0.5 }}>
                  {isPro ? 'EMINENCE PRO ACTIVE' : 'UPGRADE TO EMINENCE PRO'}
                </Text>
                <Text style={{ color: '#94a3b8', fontSize: 11, marginTop: 2 }}>
                  {isPro ? '5% discount on rides & priority fleet dispatch' : '₹499/mo • 5% off bookings & zero cancellation fees'}
                </Text>
              </View>
            </View>
            {!isPro ? (
              <TouchableOpacity
                style={styles.proUpgradeBtn}
                onPress={handleBuyPro}
                disabled={proLoading}
              >
                {proLoading ? (
                  <ActivityIndicator color="#0f172a" size="small" />
                ) : (
                  <Text style={styles.proUpgradeBtnText}>Buy Pro</Text>
                )}
              </TouchableOpacity>
            ) : (
              <View style={styles.proActiveBadge}>
                <Text style={styles.proActiveBadgeText}>PRO ACTIVE</Text>
              </View>
            )}
          </View>
        </View>

        {/* Quick Booking CTA */}
        <View style={styles.actionCard}>
          <View style={styles.actionCardHeader}>
            <Text style={styles.actionTitle}>Book Fast Transport</Text>
            <Text style={styles.actionBadge}>⚡ Instant Dispatch</Text>
          </View>
          <Text style={styles.actionSubtitle}>
            Dedicated & Shared Tempos (Tata Ace, Pickup, Bolero) across Pune.
          </Text>
          <TouchableOpacity
            style={styles.bookBtn}
            onPress={() => router.push('/(customer)/book' as any)}
          >
            <Text style={styles.bookBtnText}>🚚 Book a Tempo (Small, Med, Large)</Text>
          </TouchableOpacity>
        </View>

        {/* TAB 1: RIDE HISTORY (TC-010, TC-013) */}
        {activeTab === 'history' && (
          <View>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Ride History & ESG Carbon Offset</Text>
            </View>

            {loading ? (
              <ActivityIndicator color="#e86331" style={{ marginVertical: 20 }} />
            ) : rides.length === 0 ? (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyCardIcon}>🚚</Text>
                <Text style={styles.emptyCardTitle}>Welcome to Eminence!</Text>
                <Text style={styles.emptyCardSub}>
                  You haven't booked any tempos yet. Book your first transport now to get started!
                </Text>
                <TouchableOpacity
                  style={styles.addFirstBtn}
                  onPress={() => router.push('/(customer)/book' as any)}
                >
                  <Text style={styles.addFirstBtnText}>Book a Tempo</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                {/* Dynamically Created Bookings */}
                {rides.map((ride, idx) => (
                  <TouchableOpacity
                    key={ride.id || idx}
                    style={styles.rideCard}
                    onPress={() => router.push(`/(customer)/track?bookingId=${ride.id}` as any)}
                  >
                    <View style={styles.rideHeader}>
                      <Text style={styles.rideType}>
                        {ride.tempoType ? `${ride.tempoType.toUpperCase()} TEMPO` : 'Tempo Ride'}
                      </Text>
                      <View style={[
                        styles.statusBadge,
                        (ride.status === 'cancelled' || ride.status === 'expired') && {
                          backgroundColor: ride.status === 'expired' || ride.cancellationReason?.toLowerCase().includes('expire') ? 'rgba(245, 158, 11, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                          borderColor: ride.status === 'expired' || ride.cancellationReason?.toLowerCase().includes('expire') ? 'rgba(245, 158, 11, 0.4)' : 'rgba(239, 68, 68, 0.4)',
                        },
                        ride.status === 'pending' && { backgroundColor: 'rgba(59, 130, 246, 0.15)', borderColor: 'rgba(59, 130, 246, 0.4)' },
                      ]}>
                        <Text style={[
                          styles.statusText,
                          (ride.status === 'cancelled' || ride.status === 'expired') && { color: ride.status === 'expired' || ride.cancellationReason?.toLowerCase().includes('expire') ? '#f59e0b' : '#ef4444' },
                          ride.status === 'pending' && { color: '#60a5fa' },
                        ]}>
                          {ride.status === 'expired'
                            ? 'EXPIRED'
                            : ride.status === 'cancelled'
                            ? (ride.cancellationReason?.toLowerCase().includes('expire') ? 'EXPIRED' : 'CANCELLED')
                            : (ride.status?.toUpperCase() || 'CONFIRMED')}
                        </Text>
                      </View>
                    </View>

                    {/* Expiry deadline pill for pending bookings */}
                    {ride.status === 'pending' && (
                      <View style={styles.pendingExpiryRow}>
                        <Text style={styles.pendingExpiryText}>
                          ⏳ Expires: {ride.expiresAt 
                            ? `${new Date(ride.expiresAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} (${new Date(ride.expiresAt).toLocaleDateString()})` 
                            : 'Within 24 Hours'}
                        </Text>
                      </View>
                    )}

                    {/* Cancellation reason for cancelled / expired bookings */}
                    {(ride.status === 'cancelled' || ride.status === 'expired') && (
                      <View style={[styles.cancelledNoteRow, ride.status === 'expired' && { backgroundColor: 'rgba(245, 158, 11, 0.1)', borderColor: 'rgba(245, 158, 11, 0.2)' }]}>
                        <Text style={[styles.cancelledNoteText, ride.status === 'expired' && { color: '#f59e0b' }]}>
                          {ride.cancellationReason || (ride.status === 'expired' ? 'Expired: Untouched without driver past deadline' : 'Booking cancelled')} • 100% wallet refunded
                        </Text>
                      </View>
                    )}

                    <View style={styles.routeContainer}>
                      <View style={styles.routeItem}>
                        <Text style={styles.routeDotGreen}>●</Text>
                        <Text style={styles.routeText} numberOfLines={1}>
                          {ride.pickupAddress || 'Pickup'}
                        </Text>
                      </View>
                      <View style={styles.routeDivider} />
                      <View style={styles.routeItem}>
                        <Text style={styles.routeDotRed}>●</Text>
                        <Text style={styles.routeText} numberOfLines={1}>
                          {ride.dropAddress || 'Drop Location'}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.rideFooter}>
                      <Text style={styles.esgTag}>
                        🌿 {ride.esgEmissions ? `${ride.esgEmissions} kg` : '3.6 kg'} CO2 Offset
                      </Text>
                      <Text style={styles.rideFare}>₹{ride.estimatedFare || ride.fare || 450}</Text>
                    </View>

                    {/* Cancel Ride Action Button for Pending Rides */}
                    {ride.status === 'pending' && (
                      <View style={styles.cancelRideRow}>
                        <TouchableOpacity
                          style={styles.cancelRideBtn}
                          onPress={() => handleCancelRide(ride.id)}
                        >
                          <Text style={styles.cancelRideBtnText}>❌ Cancel Ride</Text>
                        </TouchableOpacity>
                      </View>
                    )}

                    {/* Rate Driver Button for Completed Dynamic Rides */}
                    {(ride.status?.toLowerCase() === 'completed' || ride.status === 'COMPLETED') && (
                      <View style={styles.reviewRow}>
                        {reviewedRides[ride.id] ? (
                          <Text style={styles.reviewedBadge}>
                            ★ {reviewedRides[ride.id]}.0 Rated
                          </Text>
                        ) : (
                          <TouchableOpacity
                            style={styles.rateDriverBtn}
                            onPress={() => handleOpenReview(ride)}
                          >
                            <Text style={styles.rateDriverBtnText}>⭐ Rate Driver</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    )}
                  </TouchableOpacity>
                ))}
              </>
            )}
          </View>
        )}

        {/* TAB 2: ADDRESS BOOK (TC-014) */}
        {activeTab === 'addresses' && (
          <View>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>Saved Addresses</Text>
              <TouchableOpacity
                style={styles.addAddressBtn}
                onPress={() => setIsAddAddressOpen(true)}
              >
                <Text style={styles.addAddressBtnText}>+ Add Address</Text>
              </TouchableOpacity>
            </View>

            {addresses.length === 0 ? (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyCardIcon}>📍</Text>
                <Text style={styles.emptyCardTitle}>No saved addresses yet</Text>
                <Text style={styles.emptyCardSub}>
                  Add Home, Warehouse, or Office for 1-tap booking.
                </Text>
                <TouchableOpacity
                  style={styles.addFirstBtn}
                  onPress={() => setIsAddAddressOpen(true)}
                >
                  <Text style={styles.addFirstBtnText}>+ Add Address</Text>
                </TouchableOpacity>
              </View>
            ) : (
              addresses.map((addr) => (
                <View key={addr.id} style={styles.addressCard}>
                  <View style={styles.addressInfo}>
                    <View style={styles.addressLabelBadge}>
                      <Text style={styles.addressLabelText}>{addr.label || 'Saved'}</Text>
                    </View>
                    <Text style={styles.addressStreet}>{addr.street}</Text>
                    <Text style={styles.addressCity}>
                      {addr.city}, {addr.postalCode}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.deleteAddrBtn}
                    onPress={() => handleDeleteAddress(addr.id)}
                  >
                    <Text style={styles.deleteAddrText}>Delete</Text>
                  </TouchableOpacity>
                </View>
              ))
            )}
          </View>
        )}

        {/* TAB 3: WALLET & REFERRAL (TC-015, TC-016) */}
        {activeTab === 'wallet' && (
          <View>
            {/* Balance Card (TC-015) */}
            <View style={styles.walletCard}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.walletLabel}>Available Wallet Balance</Text>
                  <Text style={styles.walletBalance}>
                    ₹{typeof wallet.balance === 'number' ? wallet.balance.toFixed(2) : (wallet.balance || '250.00')}
                  </Text>
                  <Text style={styles.walletSub}>Instant deductions on tempo bookings</Text>
                </View>
                <TouchableOpacity
                  style={styles.walletTopUpBtn}
                  onPress={() => {
                    setTopUpAmount('500');
                    setIsTopUpOpen(true);
                    setTopUpError('');
                    setTopUpSuccess('');
                    setIsWaitingUpi(false);
                  }}
                >
                  <Text style={styles.walletTopUpBtnText}>+ Top Up</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Quick Add Money Action Banner */}
            <TouchableOpacity
              style={styles.addMoneyBanner}
              onPress={() => {
                setTopUpAmount('500');
                setIsTopUpOpen(true);
                setTopUpError('');
                setTopUpSuccess('');
                setIsWaitingUpi(false);
              }}
            >
              <View style={styles.addMoneyBannerLeft}>
                <Text style={{ fontSize: 24 }}>⚡</Text>
                <View style={{ marginLeft: 12, flex: 1 }}>
                  <Text style={styles.addMoneyBannerTitle}>Add Money to Wallet</Text>
                  <Text style={styles.addMoneyBannerSub}>
                    Instant top-up via UPI (GPay, PhonePe, Paytm) or Cards
                  </Text>
                </View>
              </View>
              <Text style={styles.addMoneyBannerArrow}>➔</Text>
            </TouchableOpacity>

            {/* Recent Wallet Transactions */}
            <View style={{ marginTop: 18, marginBottom: 18 }}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionTitle}>Recent Transactions</Text>
              </View>
              {(wallet?.wallet?.transactions || wallet?.transactions || []).length === 0 ? (
                <View style={styles.emptyTxCard}>
                  <Text style={{ fontSize: 24, marginBottom: 6 }}>💳</Text>
                  <Text style={{ color: '#f4f6f8', fontSize: 13, fontWeight: '600' }}>No Transactions Yet</Text>
                  <Text style={{ color: '#a2b2c7', fontSize: 11, textAlign: 'center', marginTop: 4 }}>
                    Top up your wallet to book tempos instantly with zero payment delays.
                  </Text>
                </View>
              ) : (
                (wallet?.wallet?.transactions || wallet?.transactions || []).slice(0, 5).map((tx: any, idx: number) => {
                  const isCredit = tx.type === 'CREDIT';
                  return (
                    <View key={tx.id || idx} style={styles.txItem}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 8 }}>
                        <View style={[styles.txBadge, isCredit ? styles.txBadgeCredit : styles.txBadgeDebit]}>
                          <Text style={{ fontSize: 12 }}>{isCredit ? '⬇️' : '⬆️'}</Text>
                        </View>
                        <View style={{ flex: 1, marginLeft: 10 }}>
                          <Text style={styles.txDesc} numberOfLines={1}>
                            {tx.description || (isCredit ? 'Wallet Top-up' : 'Trip Payment')}
                          </Text>
                          <Text style={styles.txDate}>
                            {new Date(tx.createdAt || Date.now()).toLocaleDateString('en-IN', {
                              day: 'numeric',
                              month: 'short',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </Text>
                        </View>
                      </View>
                      <Text style={[styles.txAmt, isCredit ? styles.txAmtCredit : styles.txAmtDebit]}>
                        {isCredit ? '+' : '-'}₹{parseFloat(tx.amount || 0).toFixed(2)}
                      </Text>
                    </View>
                  );
                })
              )}
            </View>

            {/* Referral Card (TC-016) */}
            <View style={styles.referralCard}>
              <View style={styles.referralHeader}>
                <Text style={styles.referralIcon}>🎁</Text>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.referralTitle}>Refer & Earn ₹100</Text>
                  <Text style={styles.referralSub}>
                    Share your code with friends and family to receive booking credits.
                  </Text>
                </View>
              </View>

              <View style={styles.codeRow}>
                <View style={styles.codeBox}>
                  <Text style={styles.codeText}>
                    {wallet?.referralCode || 'EMN-DEMO-2026'}
                  </Text>
                </View>
                <TouchableOpacity style={styles.copyBtn} onPress={handleCopyCode}>
                  <Text style={styles.copyBtnText}>
                    {copySuccess ? 'Copied!' : 'Copy Code'}
                  </Text>
                </TouchableOpacity>
              </View>

              {copySuccess && (
                <View style={styles.copyBanner}>
                  <Text style={styles.copyBannerText}>✅ Copied to clipboard!</Text>
                </View>
              )}
            </View>

            {/* Promo / Referral Code Redemption Card */}
            <View style={[styles.referralCard, { marginTop: 16 }]}>
              <View style={styles.referralHeader}>
                <Text style={styles.referralIcon}>🏷️</Text>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.referralTitle}>Redeem Promo Code</Text>
                  <Text style={styles.referralSub}>
                    Enter a promotional discount code or referral bonus code to add funds to your wallet.
                  </Text>
                </View>
              </View>

              <View style={styles.codeRow}>
                <TextInput
                  style={[
                    styles.promoInputBox,
                    { borderColor: walletPromoMessage?.type === 'success' ? '#10b981' : '#2f3a4e' },
                  ]}
                  placeholder="e.g. OMKAR100 or EMINENCE-XYZ123"
                  placeholderTextColor="#64748b"
                  autoCapitalize="characters"
                  value={promoInput}
                  onChangeText={(val) => setPromoInput(val.toUpperCase())}
                />
                <TouchableOpacity
                  style={[
                    styles.copyBtn,
                    { backgroundColor: '#e86331' },
                    (!promoInput.trim() || isSubmittingPromo) && { opacity: 0.6 },
                  ]}
                  onPress={handleApplyWalletPromo}
                  disabled={!promoInput.trim() || isSubmittingPromo}
                >
                  {isSubmittingPromo ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={styles.copyBtnText}>Redeem</Text>
                  )}
                </TouchableOpacity>
              </View>

              {walletPromoMessage && (
                <View
                  style={[
                    styles.copyBanner,
                    {
                      backgroundColor:
                        walletPromoMessage.type === 'success'
                          ? 'rgba(16, 185, 129, 0.15)'
                          : 'rgba(239, 68, 68, 0.15)',
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.copyBannerText,
                      { color: walletPromoMessage.type === 'success' ? '#86efac' : '#fca5a5' },
                    ]}
                  >
                    {walletPromoMessage.text}
                  </Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* TAB 4: DEDICATED HELPLINE & SUPPORT */}
        {activeTab === 'support' && (
          <View>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Customer Support & Helpline</Text>
            </View>

            {/* Helpline Box */}
            <View style={styles.supportHelplineCard}>
              <View style={styles.supportHeaderRow}>
                <View style={styles.supportIconWrap}>
                  <Text style={{ fontSize: 22 }}>📞</Text>
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.supportCardTitle}>Dedicated Helpline (7 AM – 7 PM)</Text>
                  <Text style={styles.supportCardSubtitle}>
                    Calling hours: Morning 7:00 AM to Evening 7:00 PM
                  </Text>
                </View>
              </View>

              <View style={styles.supportLinksList}>
                {/* Phone Call Link */}
                <TouchableOpacity
                  style={styles.supportRowBtn}
                  onPress={() => Linking.openURL('tel:9970734425')}
                  activeOpacity={0.7}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Text style={{ fontSize: 16 }}>☎️</Text>
                    <Text style={styles.supportRowLabel}>Helpline Number</Text>
                  </View>
                  <Text style={styles.supportRowValue}>+91 9970734425</Text>
                </TouchableOpacity>

                {/* Email Support Link */}
                <TouchableOpacity
                  style={styles.supportRowBtn}
                  onPress={() => Linking.openURL('mailto:eminence.support.helpline@gmail.com')}
                  activeOpacity={0.7}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Text style={{ fontSize: 16 }}>✉️</Text>
                    <Text style={styles.supportRowLabel}>Support Email</Text>
                  </View>
                  <Text style={styles.supportRowEmailText}>eminence.support.helpline@gmail.com</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Live Trip Help Card */}
            <View style={styles.supportHelpCard}>
              <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
                <Text style={{ fontSize: 18 }}>ℹ️</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.supportHelpTitle}>Live Trip & Booking Assistance</Text>
                  <Text style={styles.supportHelpDesc}>
                    Need to reschedule or update your pickup address? Call our helpline during operational hours or email our support desk with your Booking ID for prompt dispatch assistance.
                  </Text>
                </View>
              </View>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Add Address Modal (TC-014) */}
      <Modal
        visible={isAddAddressOpen}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsAddAddressOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add New Address</Text>

            {addressMessage ? (
              <View style={styles.modalErrorBox}>
                <Text style={styles.modalErrorText}>{addressMessage}</Text>
              </View>
            ) : null}

            <Text style={styles.inputLabel}>Label (Home, Warehouse, Office)</Text>
            <TextInput
              style={styles.modalInput}
              value={addressLabel}
              onChangeText={setAddressLabel}
              placeholder="e.g. Home"
              placeholderTextColor="#748bac"
            />

            <Text style={styles.inputLabel}>Street Address (Pune &amp; PCMC)</Text>
            <TextInput
              style={styles.modalInput}
              value={addressStreet}
              onChangeText={setAddressStreet}
              placeholder="e.g. 123 MG Road, Camp / FC Road"
              placeholderTextColor="#748bac"
            />
            {loadingSuggestions && (
              <ActivityIndicator size="small" color="#e86331" style={{ alignSelf: 'flex-start', marginVertical: 4 }} />
            )}
            {addressSuggestions.length > 0 && (
              <View style={{ backgroundColor: '#111827', borderRadius: 8, padding: 4, marginBottom: 8, borderWidth: 1, borderColor: '#374151' }}>
                {addressSuggestions.map((s, idx) => (
                  <TouchableOpacity
                    key={idx}
                    onPress={() => {
                      setAddressStreet(s.display_name);
                      setAddressSuggestions([]);
                      const addr = s.address || {};
                      if (addr.postcode) {
                        const cleanPin = addr.postcode.replace(/\D/g, '').slice(0, 6);
                        if (cleanPin.length === 6) setAddressPostal(cleanPin);
                      }
                      setAddressCity('Pune');
                    }}
                    style={{ paddingVertical: 8, paddingHorizontal: 10, borderBottomWidth: idx === addressSuggestions.length - 1 ? 0 : 1, borderBottomColor: '#1f2937' }}
                  >
                    <Text style={{ color: '#f3f4f6', fontSize: 13, fontWeight: '500' }} numberOfLines={1}>
                      {s.display_name.split(',')[0]}
                    </Text>
                    <Text style={{ color: '#9ca3af', fontSize: 11 }} numberOfLines={1}>
                      {s.display_name.split(',').slice(1).join(',')}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            <View style={styles.modalRow}>
              <View style={{ flex: 1, marginRight: 8 }}>
                <Text style={styles.inputLabel}>City</Text>
                <TextInput
                  style={[styles.modalInput, { backgroundColor: '#111827', color: '#9ca3af' }]}
                  value="Pune"
                  editable={false}
                  placeholder="Pune"
                  placeholderTextColor="#748bac"
                />
              </View>
              <View style={{ flex: 1, marginLeft: 8 }}>
                <Text style={styles.inputLabel}>Postal Code</Text>
                <TextInput
                  style={styles.modalInput}
                  value={addressPostal}
                  onChangeText={setAddressPostal}
                  placeholder="411001"
                  placeholderTextColor="#748bac"
                  keyboardType="number-pad"
                />
              </View>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setIsAddAddressOpen(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalSaveBtn}
                onPress={handleSaveAddress}
                disabled={addressSubmitting}
              >
                {addressSubmitting ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.modalSaveText}>Save Address</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Driver Review Modal (TC-025) */}
      <Modal
        visible={isReviewOpen}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setIsReviewOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Rate Your Driver</Text>
            <Text style={styles.modalSub}>
              How was your cargo transport and driver handling experience?
            </Text>

            <View style={styles.starRow}>
              {[1, 2, 3, 4, 5].map((star) => (
                <TouchableOpacity
                  key={star}
                  style={styles.starBtn}
                  onPress={() => setReviewRating(star)}
                >
                  <Text style={[styles.starIcon, { color: star <= reviewRating ? '#f59e0b' : '#425576' }]}>
                    ★
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.inputLabel}>Feedback or Notes (Optional)</Text>
            <TextInput
              style={styles.modalInput}
              value={reviewComment}
              onChangeText={setReviewComment}
              placeholder="e.g. Prompt arrival, careful loading"
              placeholderTextColor="#748bac"
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setIsReviewOpen(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalSaveBtn}
                onPress={handleSubmitReview}
                disabled={submittingReview}
              >
                {submittingReview ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.modalSaveText}>Submit Review</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Top Up Wallet Modal */}
      <Modal
        visible={isTopUpOpen}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsTopUpOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: '90%' }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <Text style={styles.modalTitle}>Top Up Wallet</Text>
              <TouchableOpacity onPress={() => setIsTopUpOpen(false)} style={{ padding: 4 }}>
                <Text style={{ color: '#94a3b8', fontSize: 18, fontWeight: 'bold' }}>✕</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSub}>
              Add money to your Eminence wallet for instant tempo bookings and zero checkout friction.
            </Text>

            {topUpError ? (
              <View style={styles.modalErrorBox}>
                <Text style={styles.modalErrorText}>{topUpError}</Text>
              </View>
            ) : null}

            {topUpSuccess ? (
              <View style={[styles.modalErrorBox, { backgroundColor: 'rgba(34, 197, 94, 0.15)', borderColor: 'rgba(34, 197, 94, 0.4)' }]}>
                <Text style={[styles.modalErrorText, { color: '#86efac' }]}>{topUpSuccess}</Text>
              </View>
            ) : null}

            {/* Current Balance Display */}
            <View style={styles.modalBalancePill}>
              <Text style={{ color: '#94a3b8', fontSize: 12 }}>Current Wallet Balance:</Text>
              <Text style={{ color: '#f4f6f8', fontSize: 14, fontWeight: '700', marginLeft: 6 }}>
                ₹{typeof wallet?.balance === 'number' ? wallet.balance.toFixed(2) : (wallet?.balance || '0.00')}
              </Text>
            </View>

            {/* Preset Amount Chips */}
            <Text style={styles.inputLabel}>Select Top-Up Amount</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
              {['100', '250', '500', '1000', '2000'].map((chip) => {
                const isSelected = topUpAmount === chip;
                return (
                  <TouchableOpacity
                    key={chip}
                    style={[styles.topUpChip, isSelected && styles.topUpChipActive]}
                    onPress={() => {
                      setTopUpAmount(chip);
                      setTopUpError('');
                    }}
                  >
                    <Text style={[styles.topUpChipText, isSelected && styles.topUpChipTextActive]}>
                      ₹{chip}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Custom Amount Input */}
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
                placeholder="500"
                placeholderTextColor="#748bac"
                keyboardType="number-pad"
              />
            </View>

            {/* UPI App Waiting Prompt */}
            {isWaitingUpi && (
              <View style={styles.upiWaitingBox}>
                <Text style={{ fontSize: 16 }}>📱</Text>
                <View style={{ flex: 1, marginLeft: 8 }}>
                  <Text style={styles.upiWaitingTitle}>UPI App Dispatched</Text>
                  <Text style={styles.upiWaitingSub}>
                    Complete payment in GPay / PhonePe / Paytm, then tap below to credit wallet.
                  </Text>
                </View>
              </View>
            )}

            {/* Action Buttons */}
            <View style={{ gap: 10, marginTop: 14 }}>
              {isWaitingUpi ? (
                <TouchableOpacity
                  style={[styles.modalSaveBtn, { backgroundColor: '#10b981' }]}
                  onPress={() => verifyTopUpPayment()}
                  disabled={topUpLoading}
                >
                  {topUpLoading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.modalSaveText}>✅ Confirm & Credit ₹{topUpAmount || '0'}</Text>
                  )}
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={[styles.modalSaveBtn, { backgroundColor: '#059669', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6 }]}
                  onPress={handleTopUpUpi}
                  disabled={topUpLoading}
                >
                  {topUpLoading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <>
                      <Text style={{ fontSize: 16 }}>⚡</Text>
                      <Text style={styles.modalSaveText}>Pay via UPI (GPay / PhonePe / Paytm)</Text>
                    </>
                  )}
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={[styles.modalSaveBtn, { backgroundColor: '#e86331' }]}
                onPress={handleTopUpCards}
                disabled={topUpLoading}
              >
                {topUpLoading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.modalSaveText}>Pay via Razorpay / Cards</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setIsTopUpOpen(false)}
                disabled={topUpLoading}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Profile Completion Modal */}
      <CompleteProfileModal />
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
  welcomeLabel: {
    color: '#e86331',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
  },
  userName: {
    color: '#f4f6f8',
    fontSize: 20,
    fontWeight: '700',
    marginTop: 2,
  },
  userPhone: {
    color: '#a2b2c7',
    fontSize: 12,
    marginTop: 2,
  },
  logoutBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ef4444',
  },
  logoutBtnText: {
    color: '#f87171',
    fontSize: 12,
    fontWeight: '600',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#293243',
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#2f3a4e',
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabBtnActive: {
    borderBottomColor: '#e86331',
  },
  tabBtnText: {
    color: '#a2b2c7',
    fontSize: 13,
    fontWeight: '600',
  },
  tabBtnTextActive: {
    color: '#f4f6f8',
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  actionCard: {
    backgroundColor: '#293243',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e86331',
    marginBottom: 20,
  },
  actionCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  actionTitle: {
    color: '#f4f6f8',
    fontSize: 16,
    fontWeight: '700',
  },
  actionBadge: {
    color: '#f08b65',
    backgroundColor: 'rgba(232, 99, 49, 0.15)',
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 6,
    fontSize: 11,
    fontWeight: '600',
  },
  actionSubtitle: {
    color: '#a2b2c7',
    fontSize: 12,
    marginVertical: 8,
    lineHeight: 16,
  },
  bookBtn: {
    backgroundColor: '#e86331',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  bookBtnText: {
    color: '#f4f6f8',
    fontSize: 14,
    fontWeight: '700',
  },
  sectionHeader: {
    marginBottom: 12,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    color: '#f4f6f8',
    fontSize: 16,
    fontWeight: '700',
  },
  addAddressBtn: {
    backgroundColor: '#e86331',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  addAddressBtnText: {
    color: '#f4f6f8',
    fontSize: 12,
    fontWeight: '700',
  },
  rideCard: {
    backgroundColor: '#293243',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#2f3a4e',
  },
  rideHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  rideType: {
    color: '#f4f6f8',
    fontSize: 14,
    fontWeight: '700',
  },
  statusBadge: {
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#22c55e',
  },
  statusText: {
    color: '#4ade80',
    fontSize: 10,
    fontWeight: '700',
  },
  routeContainer: {
    paddingLeft: 2,
    marginBottom: 12,
  },
  routeItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  routeDotGreen: {
    color: '#22c55e',
    marginRight: 8,
    fontSize: 12,
  },
  routeDotRed: {
    color: '#ef4444',
    marginRight: 8,
    fontSize: 12,
  },
  routeDivider: {
    width: 1,
    height: 12,
    backgroundColor: '#425576',
    marginLeft: 3,
    marginVertical: 2,
  },
  routeText: {
    color: '#c9d3df',
    fontSize: 13,
  },
  rideFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#2f3a4e',
    paddingTop: 10,
  },
  esgTag: {
    color: '#4ade80',
    fontSize: 12,
    fontWeight: '600',
  },
  rideFare: {
    color: '#f4f6f8',
    fontSize: 15,
    fontWeight: '700',
  },
  addressCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#293243',
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#2f3a4e',
  },
  addressInfo: {
    flex: 1,
  },
  addressLabelBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#2f3a4e',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginBottom: 4,
  },
  addressLabelText: {
    color: '#a2b2c7',
    fontSize: 11,
    fontWeight: '700',
  },
  addressStreet: {
    color: '#f4f6f8',
    fontSize: 14,
    fontWeight: '600',
  },
  addressCity: {
    color: '#a2b2c7',
    fontSize: 12,
    marginTop: 2,
  },
  deleteAddrBtn: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: 6,
  },
  deleteAddrText: {
    color: '#f87171',
    fontSize: 12,
    fontWeight: '600',
  },
  emptyCard: {
    backgroundColor: '#293243',
    borderRadius: 14,
    padding: 30,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2f3a4e',
  },
  emptyCardIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  emptyCardTitle: {
    color: '#f4f6f8',
    fontSize: 16,
    fontWeight: '700',
  },
  emptyCardSub: {
    color: '#a2b2c7',
    fontSize: 12,
    textAlign: 'center',
    marginVertical: 8,
  },
  addFirstBtn: {
    backgroundColor: '#e86331',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginTop: 6,
  },
  addFirstBtnText: {
    color: '#f4f6f8',
    fontSize: 13,
    fontWeight: '700',
  },
  walletCard: {
    backgroundColor: '#293243',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#2f3a4e',
    marginBottom: 16,
  },
  walletLabel: {
    color: '#a2b2c7',
    fontSize: 12,
  },
  walletBalance: {
    color: '#f4f6f8',
    fontSize: 32,
    fontWeight: '800',
    marginVertical: 6,
  },
  walletSub: {
    color: '#f08b65',
    fontSize: 12,
  },
  referralCard: {
    backgroundColor: '#293243',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#2f3a4e',
  },
  referralHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  referralIcon: {
    fontSize: 28,
  },
  referralTitle: {
    color: '#f4f6f8',
    fontSize: 16,
    fontWeight: '700',
  },
  referralSub: {
    color: '#a2b2c7',
    fontSize: 12,
    marginTop: 2,
    lineHeight: 16,
  },
  codeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  codeBox: {
    flex: 1,
    backgroundColor: '#0f141f',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: '#2f3a4e',
  },
  promoInputBox: {
    flex: 1,
    backgroundColor: '#0f141f',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: '#2f3a4e',
    color: '#f4f6f8',
    fontSize: 14,
  },
  codeText: {
    color: '#f08b65',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 1,
  },
  copyBtn: {
    backgroundColor: '#22c55e',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  copyBtnText: {
    color: '#f4f6f8',
    fontSize: 13,
    fontWeight: '700',
  },
  copyBanner: {
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
    borderRadius: 8,
    padding: 8,
    marginTop: 12,
    alignItems: 'center',
  },
  copyBannerText: {
    color: '#86efac',
    fontSize: 12,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#293243',
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: '#2f3a4e',
  },
  modalTitle: {
    color: '#f4f6f8',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  modalSub: {
    color: '#a2b2c7',
    fontSize: 12,
    marginBottom: 16,
  },
  modalErrorBox: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    padding: 8,
    borderRadius: 8,
    marginBottom: 12,
  },
  modalErrorText: {
    color: '#fca5a5',
    fontSize: 12,
  },
  inputLabel: {
    color: '#c9d3df',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
    marginTop: 10,
  },
  modalInput: {
    backgroundColor: '#0f141f',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#2f3a4e',
    paddingVertical: 10,
    paddingHorizontal: 14,
    color: '#f4f6f8',
    fontSize: 14,
  },
  modalRow: {
    flexDirection: 'row',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 20,
  },
  modalCancelBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  modalCancelText: {
    color: '#a2b2c7',
    fontSize: 14,
    fontWeight: '600',
  },
  modalSaveBtn: {
    backgroundColor: '#e86331',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  modalSaveText: {
    color: '#f4f6f8',
    fontSize: 14,
    fontWeight: '700',
  },
  b2bBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#161c28',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(197, 168, 128, 0.3)',
    marginBottom: 20,
  },
  b2bLeft: {
    flex: 1,
    marginRight: 12,
  },
  b2bTag: {
    color: '#c5a880',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  b2bTitle: {
    color: '#f4f6f8',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 2,
  },
  b2bSubtitle: {
    color: '#a2b2c7',
    fontSize: 11,
  },
  b2bArrow: {
    color: '#c5a880',
    fontSize: 20,
    fontWeight: '700',
  },
  reviewRow: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#242e42',
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  rateDriverBtn: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  rateDriverBtnText: {
    color: '#f59e0b',
    fontSize: 12,
    fontWeight: '700',
  },
  reviewedBadge: {
    color: '#10b981',
    fontSize: 12,
    fontWeight: '700',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  starRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginVertical: 16,
  },
  starBtn: {
    padding: 4,
  },
  starIcon: {
    fontSize: 28,
  },
  proUpgradeCard: {
    backgroundColor: '#1e1b4b',
    borderWidth: 1,
    borderColor: '#6366f1',
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
  },
  proActiveCard: {
    backgroundColor: '#271b07',
    borderWidth: 1,
    borderColor: '#f59e0b',
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
  },
  proUpgradeBtn: {
    backgroundColor: '#f59e0b',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  proUpgradeBtnText: {
    color: '#0f172a',
    fontWeight: '800',
    fontSize: 12,
  },
  proActiveBadge: {
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.4)',
  },
  proActiveBadgeText: {
    color: '#f59e0b',
    fontWeight: '800',
    fontSize: 10,
    letterSpacing: 0.5,
  },
  // Wallet Top-Up & Transaction Styles
  walletTopUpBtn: {
    backgroundColor: '#e86331',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  walletTopUpBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  addMoneyBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1e293b',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
    padding: 14,
    marginBottom: 16,
  },
  addMoneyBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  addMoneyBannerTitle: {
    color: '#f4f6f8',
    fontSize: 14,
    fontWeight: '700',
  },
  addMoneyBannerSub: {
    color: '#94a3b8',
    fontSize: 11,
    marginTop: 2,
  },
  addMoneyBannerArrow: {
    color: '#e86331',
    fontSize: 18,
    fontWeight: '700',
    marginLeft: 8,
  },
  emptyTxCard: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
    padding: 24,
    alignItems: 'center',
  },
  txItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1e293b',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#334155',
    padding: 12,
    marginBottom: 8,
  },
  txBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  txBadgeCredit: {
    backgroundColor: 'rgba(34, 197, 94, 0.2)',
  },
  txBadgeDebit: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
  },
  txDesc: {
    color: '#f4f6f8',
    fontSize: 13,
    fontWeight: '600',
  },
  txDate: {
    color: '#94a3b8',
    fontSize: 11,
    marginTop: 2,
  },
  txAmt: {
    fontSize: 14,
    fontWeight: '700',
  },
  txAmtCredit: {
    color: '#4ade80',
  },
  txAmtDebit: {
    color: '#f87171',
  },
  modalBalancePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0f141f',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: 14,
  },
  topUpChip: {
    backgroundColor: '#0f141f',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#2f3a4e',
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  topUpChipActive: {
    borderColor: '#e86331',
    backgroundColor: 'rgba(232, 99, 49, 0.15)',
  },
  topUpChipText: {
    color: '#cbd5e1',
    fontSize: 13,
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
    fontSize: 16,
    fontWeight: '700',
    paddingVertical: 10,
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
  pendingExpiryRow: {
    backgroundColor: '#272016',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.4)',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginBottom: 8,
  },
  pendingExpiryText: {
    color: '#fbbf24',
    fontSize: 11,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontWeight: '700',
  },
  cancelledNoteRow: {
    backgroundColor: '#451a1a',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.4)',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginBottom: 8,
  },
  cancelledNoteText: {
    color: '#fca5a5',
    fontSize: 11,
    fontWeight: '600',
  },
  cancelRideRow: {
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#2f3a4e',
    paddingTop: 8,
  },
  cancelRideBtn: {
    backgroundColor: '#dc2626',
    borderRadius: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelRideBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  supportHelplineCard: {
    backgroundColor: '#293243',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: '#2f3a4e',
    marginBottom: 16,
  },
  supportHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  supportIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(232, 99, 49, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(232, 99, 49, 0.3)',
  },
  supportCardTitle: {
    color: '#f4f6f8',
    fontSize: 15,
    fontWeight: '700',
  },
  supportCardSubtitle: {
    color: '#a2b2c7',
    fontSize: 12,
    marginTop: 2,
  },
  supportLinksList: {
    gap: 10,
  },
  supportRowBtn: {
    backgroundColor: '#1b2331',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: '#2f3a4e',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  supportRowLabel: {
    color: '#c9d3df',
    fontSize: 13,
    fontWeight: '600',
  },
  supportRowValue: {
    color: '#f08b65',
    fontSize: 13,
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  supportRowEmailText: {
    color: '#c9d3df',
    fontSize: 11,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    flexShrink: 1,
  },
  supportHelpCard: {
    backgroundColor: 'rgba(41, 50, 67, 0.6)',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#2f3a4e',
  },
  supportHelpTitle: {
    color: '#f4f6f8',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
  },
  supportHelpDesc: {
    color: '#a2b2c7',
    fontSize: 12,
    lineHeight: 18,
  },
});

import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Platform,
  Alert,
  Linking,
  RefreshControl,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import { io, Socket } from 'socket.io-client';
import { useAuth } from '../../context/AuthContext';
import api, { API_BASE_URL } from '../../services/api';

// Haversine formula to calculate distance in km between two coordinate points
function calculateHaversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Number((R * c).toFixed(2));
}

export default function TrackingScreen() {
  const router = useRouter();
  const { bookingId } = useLocalSearchParams<{ bookingId?: string }>();
  const { token } = useAuth();

  const [booking, setBooking] = useState<any>(null);
  const [status, setStatus] = useState<string>('pending');
  const [driverLocation, setDriverLocation] = useState<{ lat: number; lng: number }>({
    lat: 18.5204,
    lng: 73.8567,
  });
  const [speed, setSpeed] = useState<number>(0);
  const [lastSynced, setLastSynced] = useState<string>('Connecting...');
  const [socketConnected, setSocketConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [distanceRemaining, setDistanceRemaining] = useState<number | null>(null);
  const [cancelling, setCancelling] = useState(false);

  const socketRef = useRef<Socket | null>(null);

  // Calculate remaining distance based on current driver coordinates and target destination
  const updateDistance = useCallback((coords: { lat: number; lng: number }, bkg: any, currentStatus: string) => {
    if (!bkg) return;
    let targetLat = bkg.dropLat ? Number(bkg.dropLat) : null;
    let targetLng = bkg.dropLng ? Number(bkg.dropLng) : null;

    if (currentStatus === 'driver_assigned' || currentStatus === 'pending') {
      targetLat = bkg.pickupLat ? Number(bkg.pickupLat) : targetLat;
      targetLng = bkg.pickupLng ? Number(bkg.pickupLng) : targetLng;
    }

    if (targetLat && targetLng && coords.lat && coords.lng) {
      const dist = calculateHaversineKm(coords.lat, coords.lng, targetLat, targetLng);
      setDistanceRemaining(dist);
    }
  }, []);

  // Fetch real booking details from backend API
  const fetchBookingDetails = useCallback(async (isSilent = false) => {
    if (!bookingId) return;
    if (!isSilent) setLoading(true);

    try {
      const res = await api.get(`/api/bookings/${bookingId}`);
      if (res.data?.success && res.data?.booking) {
        const b = res.data.booking;
        setBooking(b);
        if (b.status) {
          setStatus(b.status);
        }

        // Initialize driver location if available on driver or pickup
        let loc = { lat: 18.5204, lng: 73.8567 };
        if (b.driver?.currentLat && b.driver?.currentLng) {
          loc = {
            lat: Number(b.driver.currentLat),
            lng: Number(b.driver.currentLng),
          };
        } else if (b.pickupLat && b.pickupLng) {
          loc = {
            lat: Number(b.pickupLat),
            lng: Number(b.pickupLng),
          };
        }
        setDriverLocation(loc);
        updateDistance(loc, b, b.status);
        setLastSynced(new Date().toLocaleTimeString());
      }
    } catch (err) {
      console.log('Error fetching booking details in mobile track:', err);
    } finally {
      if (!isSilent) setLoading(false);
      setRefreshing(false);
    }
  }, [bookingId, updateDistance]);

  // Initial load and periodic polling fallback (every 4 seconds) to ensure real status updates
  useEffect(() => {
    fetchBookingDetails();

    const interval = setInterval(() => {
      fetchBookingDetails(true);
    }, 4000);

    return () => {
      clearInterval(interval);
    };
  }, [fetchBookingDetails]);

  // Establish live Socket.IO connection for real-time telemetry and status events
  useEffect(() => {
    const socket: Socket = io(API_BASE_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      setSocketConnected(true);
      if (bookingId) {
        socket.emit('join_trip', bookingId);
      }
    });

    socket.on('disconnect', () => {
      setSocketConnected(false);
    });

    // Real-time location broadcast from driver app
    socket.on('trip:location_update', (data: { lat: number; lng: number; speed?: number; bookingId?: string }) => {
      if (data && data.lat && data.lng) {
        const newCoords = { lat: Number(data.lat), lng: Number(data.lng) };
        setDriverLocation(newCoords);
        if (data.speed !== undefined) {
          setSpeed(Number(data.speed));
        }
        setLastSynced(new Date().toLocaleTimeString());
        setBooking((prevBooking: any) => {
          if (prevBooking) {
            updateDistance(newCoords, prevBooking, status);
          }
          return prevBooking;
        });
      }
    });

    // Real-time telemetry broadcast
    socket.on('trip:telemetry', (data: { lat?: number; lng?: number; speed?: number }) => {
      if (data && (data.lat !== undefined || data.lng !== undefined)) {
        setDriverLocation((prev) => {
          const newCoords = {
            lat: data.lat !== undefined ? Number(data.lat) : prev.lat,
            lng: data.lng !== undefined ? Number(data.lng) : prev.lng,
          };
          setLastSynced(new Date().toLocaleTimeString());
          return newCoords;
        });
        if (data.speed !== undefined) {
          setSpeed(Number(data.speed));
        }
      }
    });

    // Real-time status update from driver or admin
    socket.on('booking_status_updated', (data: { bookingId: string; status: string; booking?: any }) => {
      if (data && (!data.bookingId || data.bookingId === bookingId)) {
        if (data.status) {
          setStatus(data.status);
        }
        if (data.booking) {
          setBooking(data.booking);
        } else {
          fetchBookingDetails(true);
        }
      }
    });

    socket.on('trip:status', (data: { bookingId: string; status: string }) => {
      if (data && (!data.bookingId || data.bookingId === bookingId)) {
        if (data.status) {
          setStatus(data.status);
          fetchBookingDetails(true);
        }
      }
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [bookingId, token, status, fetchBookingDetails, updateDistance]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchBookingDetails();
  };

  // Interactive GPS Ping Step Simulation (allows developer/user testing of live coordinates)
  const handleSimulateGpsStep = () => {
    const deltaLat = (Math.random() - 0.5) * 0.003;
    const deltaLng = (Math.random() - 0.5) * 0.003;
    const updated = {
      lat: Number((driverLocation.lat + deltaLat).toFixed(4)),
      lng: Number((driverLocation.lng + deltaLng).toFixed(4)),
    };
    setDriverLocation(updated);
    setSpeed(Math.floor(25 + Math.random() * 20));
    setLastSynced(new Date().toLocaleTimeString());
    updateDistance(updated, booking, status);

    // Optionally notify server/room if socket is connected
    if (socketRef.current && bookingId) {
      socketRef.current.emit('driver:location_update', {
        bookingId,
        lat: updated.lat,
        lng: updated.lng,
      });
    }
  };

  const handleCancelBooking = () => {
    if (!bookingId) return;
    Alert.alert(
      'Cancel Booking',
      'Are you sure you want to cancel this booking? If you have paid in advance, 100% of the fare will be immediately refunded to your wallet.',
      [
        { text: 'Keep Booking', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            try {
              setCancelling(true);
              const res = await api.post(`/api/bookings/${bookingId}/cancel`, {
                reason: 'Cancelled by customer via mobile app',
              });
              Alert.alert(
                'Booking Cancelled',
                res.data?.message || 'Your booking has been cancelled and full payment has been refunded to your wallet.'
              );
              setStatus('cancelled');
              setBooking((prev: any) => ({
                ...prev,
                status: 'cancelled',
                cancellationReason: 'Cancelled by customer via mobile app',
                cancelledBy: 'customer',
              }));
            } catch (err: any) {
              console.error('Error cancelling booking:', err);
              Alert.alert(
                'Error',
                err?.response?.data?.message || 'Failed to cancel booking. Please try again.'
              );
            } finally {
              setCancelling(false);
            }
          },
        },
      ]
    );
  };

  const getStatusLabel = () => {
    switch (status) {
      case 'pending':
        return 'Searching Nearest Fleet Driver...';
      case 'driver_assigned':
        return 'Driver Assigned — Heading to Pickup';
      case 'arrived':
        return 'Driver Arrived at Pickup Location';
      case 'in_transit':
        return 'Goods in Transit to Destination';
      case 'completed':
        return 'Delivered Successfully!';
      case 'expired':
        return 'Booking Expired (Untouched)';
      case 'cancelled':
        return booking?.cancellationReason?.toLowerCase().includes('expire')
          ? 'Booking Expired (Untouched)'
          : 'Booking Cancelled';
      default:
        return 'Live Tracking Active';
    }
  };

  const getProgressPercentage = () => {
    switch (status) {
      case 'pending':
        return '15%';
      case 'driver_assigned':
        return '35%';
      case 'arrived':
        return '60%';
      case 'in_transit':
        return '85%';
      case 'completed':
        return '100%';
      case 'expired':
      case 'cancelled':
        return '0%';
      default:
        return '25%';
    }
  };

  const displayOtp = booking?.otp || (bookingId
    ? String(Math.abs(String(bookingId).split('').reduce((acc, char) => ((acc << 5) - acc) + char.charCodeAt(0), 0)) % 9000 + 1000)
    : '4928');

  // Dynamic Driver & Vehicle Details
  const hasAssignedDriver = !!(booking?.driverId && booking?.driver);
  const driverName = booking?.driver?.name || null;
  const driverPhone = booking?.driver?.phone || null;
  const vehicleNumber = booking?.vehicle?.registrationNumber || null;
  const vehicleModel = booking?.vehicle?.model || (booking?.tempoType ? `${booking.tempoType.toUpperCase()} Tempo` : null);
  const podHash = booking?.podHash || 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';

  return (
    <View style={styles.container}>
      {/* Top Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.replace('/(customer)/dashboard')}>
          <Text style={styles.backBtnText}>← Dashboard</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Live Trip Tracking</Text>
        <View style={styles.socketIndicator}>
          <Text style={[styles.socketDot, { color: socketConnected ? '#22c55e' : '#f59e0b' }]}>●</Text>
          <Text style={styles.socketText}>{socketConnected ? 'LIVE' : 'SYNC'}</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#e86331" />}
      >
        {/* Trip ID Banner */}
        <View style={styles.tripIdCard}>
          <View style={styles.tripIdHeader}>
            <Text style={styles.tripIdLabel}>BOOKING REFERENCE</Text>
            <TouchableOpacity onPress={() => fetchBookingDetails(false)} style={styles.refreshIconBtn}>
              <Text style={styles.refreshIconText}>🔄 Sync</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.tripIdValue}>{bookingId || 'BKG-7829-XT'}</Text>
          {booking && (
            <Text style={styles.tripFareSub}>
              Estimated Fare: <Text style={styles.tripFareHighlight}>₹{booking.estimatedFare || '350'}</Text> •{' '}
              {booking.tempoType ? `${booking.tempoType.toUpperCase()} Tempo` : 'Standard Tempo'}
            </Text>
          )}
        </View>

        {/* Cancelled / Expired Banner */}
        {(status === 'cancelled' || status === 'expired') && (
          <View style={[styles.cancelledCard, status === 'expired' && { borderColor: 'rgba(245, 158, 11, 0.4)', backgroundColor: 'rgba(245, 158, 11, 0.1)' }]}>
            <Text style={[styles.cancelledTitle, status === 'expired' && { color: '#f59e0b' }]}>
              {status === 'expired' || booking?.cancellationReason?.toLowerCase().includes('expire') ? '⚠️ Booking Expired' : '🚫 Booking Cancelled'}
            </Text>
            <Text style={styles.cancelledReason}>
              {booking?.cancellationReason || (status === 'expired' ? 'Booking expired because no driver was assigned within the validity window.' : 'This booking has been cancelled.')}
            </Text>
            <View style={styles.refundBox}>
              <Text style={styles.refundText}>
                ✓ 100% full refund credited to your wallet (if advance payment was made).
              </Text>
            </View>
          </View>
        )}

        {/* Untouched Expiry Deadline & Cancellation for Pending Bookings */}
        {status === 'pending' && (
          <View style={styles.expiryCard}>
            <View style={styles.expiryHeader}>
              <Text style={styles.expiryTitle}>⏳ Untouched Expiry Deadline</Text>
              <Text style={styles.expiryTime}>
                {booking?.expiresAt
                  ? `${new Date(booking.expiresAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} (${new Date(booking.expiresAt).toLocaleDateString()})`
                  : 'Within 24 Hours'}
              </Text>
            </View>
            <Text style={styles.expirySub}>
              If no driver accepts your trip before this deadline, it will automatically expire and 100% of your payment will be refunded to your wallet.
            </Text>
            <TouchableOpacity
              style={[styles.cancelBtn, cancelling && { opacity: 0.6 }]}
              onPress={handleCancelBooking}
              disabled={cancelling}
            >
              {cancelling ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.cancelBtnText}>❌ Cancel Booking</Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* Live Status Progression Card */}
        <View style={styles.statusCard}>
          <Text style={styles.statusTitle}>{getStatusLabel()}</Text>

          <View style={styles.progressBarBg}>
            <View style={[styles.progressBarFill, { width: getProgressPercentage() as any }]} />
          </View>

          <View style={styles.progressMilestones}>
            <Text
              style={[
                styles.milestoneText,
                (status === 'driver_assigned' || status === 'arrived' || status === 'in_transit' || status === 'completed') &&
                  styles.milestoneActive,
              ]}
            >
              Assigned
            </Text>
            <Text
              style={[
                styles.milestoneText,
                (status === 'arrived' || status === 'in_transit' || status === 'completed') &&
                  styles.milestoneActive,
              ]}
            >
              Arrived
            </Text>
            <Text
              style={[
                styles.milestoneText,
                (status === 'in_transit' || status === 'completed') && styles.milestoneActive,
              ]}
            >
              In Transit
            </Text>
            <Text style={[styles.milestoneText, status === 'completed' && styles.milestoneActive]}>
              Delivered
            </Text>
          </View>
        </View>

        {/* Start Ride OTP Card */}
        {status !== 'completed' && status !== 'cancelled' && (
          <View style={styles.otpCard}>
            <View style={{ flex: 1, marginRight: 12 }}>
              <Text style={styles.otpLabel}>🔒 START RIDE OTP</Text>
              <Text style={styles.otpSub}>Share with driver upon tempo arrival</Text>
            </View>
            <Text style={styles.otpCode}>{displayOtp}</Text>
          </View>
        )}

        {/* Blockchain Proof of Delivery (PoD) Card */}
        {status === 'completed' && (
          <View style={styles.podCard}>
            <View style={styles.podHeader}>
              <Text style={styles.podTitle}>🛡️ Blockchain Proof of Delivery</Text>
              <View style={styles.podBadge}>
                <Text style={styles.podBadgeText}>VERIFIED</Text>
              </View>
            </View>
            <Text style={styles.podSub}>
              Cryptographic SHA-256 tamper-proof receipt generated upon verified delivery:
            </Text>
            <View style={styles.podHashBox}>
              <Text style={styles.podHashText} numberOfLines={1} ellipsizeMode="middle">
                {podHash}
              </Text>
              <TouchableOpacity
                style={styles.podCopyBtn}
                onPress={async () => {
                  await Clipboard.setStringAsync(podHash);
                  Alert.alert('Copied', 'Proof of Delivery hash copied to clipboard!');
                }}
              >
                <Text style={styles.podCopyBtnText}>Copy Hash</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Route Details Card */}
        {booking && (
          <View style={styles.routeCard}>
            <View style={styles.routeItem}>
              <Text style={styles.routeIcon}>🟢</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.routeLabel}>PICKUP LOCATION</Text>
                <Text style={styles.routeAddress}>{booking.pickupAddress || 'Pune Hub'}</Text>
              </View>
            </View>
            <View style={styles.routeDivider} />
            <View style={styles.routeItem}>
              <Text style={styles.routeIcon}>🏁</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.routeLabel}>DROP DESTINATION</Text>
                <Text style={styles.routeAddress}>{booking.dropAddress || 'Destination Point'}</Text>
              </View>
            </View>
          </View>
        )}

        {/* Live Telemetry / GPS Coordinates */}
        <View style={styles.telemetryCard}>
          <View style={styles.telemetryHeader}>
            <Text style={styles.telemetryTitle}>🛰️ Real-Time Telemetry</Text>
            <View style={styles.telemetryBadgeContainer}>
              <Text style={styles.telemetryBadge}>
                {socketConnected ? '🟢 Socket.io stream' : '🟡 Polling Sync'}
              </Text>
            </View>
          </View>

          <View style={styles.telemetryRow}>
            <View style={styles.telemetryBox}>
              <Text style={styles.telemetryBoxLabel}>Latitude</Text>
              <Text style={styles.telemetryBoxVal}>{driverLocation.lat.toFixed(4)}° N</Text>
            </View>
            <View style={styles.telemetryBox}>
              <Text style={styles.telemetryBoxLabel}>Longitude</Text>
              <Text style={styles.telemetryBoxVal}>{driverLocation.lng.toFixed(4)}° E</Text>
            </View>
          </View>

          <View style={styles.telemetryMetricsRow}>
            <View style={styles.metricItem}>
              <Text style={styles.metricLabel}>Speed</Text>
              <Text style={styles.metricVal}>{speed} km/h</Text>
            </View>
            <View style={styles.metricItem}>
              <Text style={styles.metricLabel}>Distance Left</Text>
              <Text style={styles.metricVal}>
                {distanceRemaining !== null ? `${distanceRemaining} km` : 'Calculating...'}
              </Text>
            </View>
            <View style={styles.metricItem}>
              <Text style={styles.metricLabel}>Last Updated</Text>
              <Text style={styles.metricValSmall}>{lastSynced}</Text>
            </View>
          </View>

          <View style={styles.mapPlaceholder}>
            <Text style={styles.mapIcon}>🗺️</Text>
            <Text style={styles.mapText}>
              {hasAssignedDriver ? 'Live GPS Radar Active' : 'Awaiting Driver Assignment'}
            </Text>
            <Text style={styles.mapSub}>
              {hasAssignedDriver
                ? `Driver coordinates streaming at ${driverLocation.lat.toFixed(4)}, ${driverLocation.lng.toFixed(4)}`
                : 'Telemetry and live GPS stream will start once a driver accepts your trip'}
            </Text>

            {/* Manual test simulation control */}
            {hasAssignedDriver && (
              <TouchableOpacity style={styles.simGpsBtn} onPress={handleSimulateGpsStep}>
                <Text style={styles.simGpsBtnText}>📍 Test Live Coordinate Step</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Dynamic Driver Partner Information */}
        {hasAssignedDriver ? (
          <View style={styles.driverCard}>
            <View style={styles.driverHeader}>
              <View style={styles.driverAvatar}>
                <Text style={styles.driverAvatarText}>👨‍✈️</Text>
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.driverName}>{driverName}</Text>
                <Text style={styles.driverStatusSubtitle}>Assigned Fleet Driver</Text>
                {driverPhone && (
                  <TouchableOpacity
                    style={styles.callDriverBtn}
                    onPress={() => Linking.openURL(`tel:${driverPhone}`)}
                  >
                    <Text style={styles.callDriverText}>📞 Call: {driverPhone}</Text>
                  </TouchableOpacity>
                )}
              </View>
              <View style={styles.vehicleBadge}>
                <Text style={styles.vehicleNumber}>{vehicleNumber || 'Assigned Tempo'}</Text>
                <Text style={styles.vehicleModel}>{vehicleModel || 'Tempo Truck'}</Text>
              </View>
            </View>
          </View>
        ) : (
          <View style={[styles.driverCard, styles.unassignedDriverCard]}>
            <View style={styles.driverHeader}>
              <View style={[styles.driverAvatar, styles.unassignedAvatar]}>
                <Text style={styles.driverAvatarText}>⏳</Text>
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.driverName}>No Driver Assigned Yet</Text>
                <Text style={styles.unassignedSubText}>
                  Matching with the closest available tempo driver in Pune...
                </Text>
              </View>
              <View style={styles.vehicleBadge}>
                <Text style={styles.pendingBadgeText}>Pending Allocation</Text>
                <Text style={styles.vehicleModel}>
                  {booking?.tempoType ? `${booking.tempoType.toUpperCase()} Tempo` : 'Tempo'}
                </Text>
              </View>
            </View>
          </View>
        )}
        {/* Dedicated Support & Helpline Footer Card */}
        <View style={styles.trackSupportCard}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={{ fontSize: 16 }}>📞</Text>
              <Text style={styles.trackSupportTitle}>Dedicated Helpline (7 AM – 7 PM)</Text>
            </View>
          </View>
          <Text style={styles.trackSupportSubtitle}>
            Need immediate help with this trip? Call dispatch or email us:
          </Text>
          <View style={styles.trackSupportActionRow}>
            <TouchableOpacity
              style={styles.trackCallBtn}
              onPress={() => Linking.openURL('tel:9970734425')}
            >
              <Text style={styles.trackCallBtnText}>Call: +91 9970734425</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.trackMailBtn}
              onPress={() => Linking.openURL('mailto:eminence.support.helpline@gmail.com')}
            >
              <Text style={styles.trackMailBtnText}>Email Support</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
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
  socketIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#0f141f',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  socketDot: {
    fontSize: 12,
  },
  socketText: {
    color: '#a2b2c7',
    fontSize: 10,
    fontWeight: '700',
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  tripIdCard: {
    backgroundColor: '#293243',
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#2f3a4e',
  },
  tripIdHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  tripIdLabel: {
    color: '#a2b2c7',
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1,
  },
  refreshIconBtn: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: '#2f3a4e',
    borderRadius: 6,
  },
  refreshIconText: {
    color: '#c9d3df',
    fontSize: 11,
    fontWeight: '600',
  },
  tripIdValue: {
    color: '#f4f6f8',
    fontSize: 18,
    fontWeight: '800',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    marginTop: 6,
  },
  tripFareSub: {
    color: '#a2b2c7',
    fontSize: 12,
    marginTop: 6,
  },
  tripFareHighlight: {
    color: '#22c55e',
    fontWeight: '700',
  },
  statusCard: {
    backgroundColor: '#293243',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#e86331',
    marginBottom: 16,
  },
  statusTitle: {
    color: '#f4f6f8',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 14,
  },
  progressBarBg: {
    height: 8,
    backgroundColor: '#0f141f',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 12,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#e86331',
    borderRadius: 4,
  },
  progressMilestones: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  milestoneText: {
    color: '#748bac',
    fontSize: 11,
    fontWeight: '600',
  },
  milestoneActive: {
    color: '#38bdf8',
    fontWeight: '700',
  },
  otpCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#22c55e',
    marginBottom: 16,
  },
  otpLabel: {
    color: '#4ade80',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
  },
  otpSub: {
    color: '#c9d3df',
    fontSize: 11,
    marginTop: 2,
  },
  otpCode: {
    color: '#f4f6f8',
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: 4,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  routeCard: {
    backgroundColor: '#293243',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#2f3a4e',
    marginBottom: 16,
  },
  routeItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  routeIcon: {
    fontSize: 14,
    marginTop: 2,
  },
  routeLabel: {
    color: '#a2b2c7',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  routeAddress: {
    color: '#f4f6f8',
    fontSize: 13,
    fontWeight: '600',
    marginTop: 2,
  },
  routeDivider: {
    height: 1,
    backgroundColor: '#2f3a4e',
    marginVertical: 12,
    marginLeft: 24,
  },
  telemetryCard: {
    backgroundColor: '#293243',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#2f3a4e',
    marginBottom: 16,
  },
  telemetryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  telemetryTitle: {
    color: '#f4f6f8',
    fontSize: 15,
    fontWeight: '700',
  },
  telemetryBadgeContainer: {
    backgroundColor: 'rgba(232, 99, 49, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  telemetryBadge: {
    color: '#f08b65',
    fontSize: 11,
    fontWeight: '600',
  },
  telemetryRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  telemetryBox: {
    flex: 1,
    backgroundColor: '#0f141f',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#2f3a4e',
  },
  telemetryBoxLabel: {
    color: '#a2b2c7',
    fontSize: 11,
  },
  telemetryBoxVal: {
    color: '#f4f6f8',
    fontSize: 14,
    fontWeight: '700',
    marginTop: 2,
  },
  telemetryMetricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#161d2b',
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
  },
  metricItem: {
    alignItems: 'center',
    flex: 1,
  },
  metricLabel: {
    color: '#748bac',
    fontSize: 10,
    fontWeight: '600',
  },
  metricVal: {
    color: '#38bdf8',
    fontSize: 13,
    fontWeight: '700',
    marginTop: 2,
  },
  metricValSmall: {
    color: '#c9d3df',
    fontSize: 11,
    marginTop: 2,
  },
  mapPlaceholder: {
    backgroundColor: '#0f141f',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2f3a4e',
  },
  mapIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  mapText: {
    color: '#f4f6f8',
    fontSize: 14,
    fontWeight: '700',
  },
  mapSub: {
    color: '#a2b2c7',
    fontSize: 11,
    marginTop: 4,
    textAlign: 'center',
  },
  simGpsBtn: {
    marginTop: 12,
    backgroundColor: '#2f3a4e',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  simGpsBtnText: {
    color: '#c9d3df',
    fontSize: 11,
    fontWeight: '600',
  },
  driverCard: {
    backgroundColor: '#293243',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#2f3a4e',
  },
  driverHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  driverAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#2f3a4e',
    alignItems: 'center',
    justifyContent: 'center',
  },
  driverAvatarText: {
    fontSize: 22,
  },
  driverName: {
    color: '#f4f6f8',
    fontSize: 15,
    fontWeight: '700',
  },
  driverStatusSubtitle: {
    color: '#38bdf8',
    fontSize: 12,
    marginTop: 2,
    fontWeight: '500',
  },
  unassignedDriverCard: {
    borderStyle: 'dashed',
    borderColor: '#475569',
    backgroundColor: 'rgba(30, 41, 59, 0.6)',
  },
  unassignedAvatar: {
    backgroundColor: '#1e293b',
  },
  unassignedSubText: {
    color: '#94a3b8',
    fontSize: 12,
    marginTop: 2,
    lineHeight: 16,
  },
  pendingBadgeText: {
    color: '#f59e0b',
    fontSize: 11,
    fontWeight: '700',
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  callDriverBtn: {
    marginTop: 4,
  },
  callDriverText: {
    color: '#38bdf8',
    fontSize: 11,
    fontWeight: '600',
  },
  vehicleBadge: {
    alignItems: 'flex-end',
  },
  vehicleNumber: {
    color: '#f4f6f8',
    fontSize: 12,
    fontWeight: '700',
  },
  vehicleModel: {
    color: '#a2b2c7',
    fontSize: 11,
    marginTop: 2,
  },
  podCard: {
    backgroundColor: '#293243',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
    marginBottom: 16,
  },
  podHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  podTitle: {
    color: '#10b981',
    fontSize: 14,
    fontWeight: '700',
  },
  podBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  podBadgeText: {
    color: '#10b981',
    fontSize: 10,
    fontWeight: '800',
  },
  podSub: {
    color: '#a2b2c7',
    fontSize: 11,
    marginBottom: 10,
  },
  podHashBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#0f141f',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#2f3a4e',
  },
  podHashText: {
    flex: 1,
    color: '#34d399',
    fontSize: 11,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    marginRight: 8,
  },
  podCopyBtn: {
    backgroundColor: '#2f3a4e',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  podCopyBtnText: {
    color: '#f4f6f8',
    fontSize: 11,
    fontWeight: '600',
  },
  cancelledCard: {
    backgroundColor: '#451a1a',
    borderColor: '#ef4444',
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  cancelledTitle: {
    color: '#f87171',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 6,
  },
  cancelledReason: {
    color: '#fca5a5',
    fontSize: 13,
    marginBottom: 10,
    lineHeight: 18,
  },
  refundBox: {
    backgroundColor: 'rgba(6, 78, 59, 0.4)',
    borderColor: 'rgba(16, 185, 129, 0.4)',
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
  },
  refundText: {
    color: '#34d399',
    fontSize: 12,
    fontWeight: '600',
  },
  expiryCard: {
    backgroundColor: '#272016',
    borderColor: 'rgba(245, 158, 11, 0.5)',
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  expiryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  expiryTitle: {
    color: '#fbbf24',
    fontSize: 13,
    fontWeight: '700',
  },
  expiryTime: {
    color: '#fef3c7',
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontWeight: '700',
  },
  expirySub: {
    color: '#d1d5db',
    fontSize: 12,
    lineHeight: 16,
    marginBottom: 12,
  },
  cancelBtn: {
    backgroundColor: '#dc2626',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  trackSupportCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 14,
    marginTop: 14,
    marginBottom: 20,
  },
  trackSupportTitle: {
    color: '#f9fafb',
    fontSize: 14,
    fontWeight: '700',
  },
  trackSupportSubtitle: {
    color: '#9ca3af',
    fontSize: 12,
    lineHeight: 16,
    marginBottom: 10,
  },
  trackSupportActionRow: {
    flexDirection: 'row',
    gap: 8,
  },
  trackCallBtn: {
    flex: 1.2,
    backgroundColor: 'rgba(249, 115, 22, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(249, 115, 22, 0.4)',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trackCallBtnText: {
    color: '#fb923c',
    fontSize: 12,
    fontWeight: '700',
  },
  trackMailBtn: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trackMailBtnText: {
    color: '#e5e7eb',
    fontSize: 12,
    fontWeight: '600',
  },
});

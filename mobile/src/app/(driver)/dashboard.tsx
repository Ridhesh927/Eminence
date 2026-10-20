import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Switch,
  ActivityIndicator,
  Modal,
  TextInput,
  Alert,
  Vibration,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import api, { API_BASE_URL } from '../../services/api';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { startBackgroundLocation, stopBackgroundLocation } from '../../services/LocationTracking';
import * as Location from 'expo-location';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import NetInfo from '@react-native-community/netinfo';
import { queueOfflineRequest } from '../../services/OfflineSync';
import { io } from 'socket.io-client';

export default function DriverDashboard() {
  const router = useRouter();
  const { user, token, logout } = useAuth();
  const allowTestFixtures = __DEV__ && process.env.EXPO_PUBLIC_ENABLE_TEST_AUTH === 'true';

  const [activeTab, setActiveTab] = useState<'assigned' | 'tools' | 'history'>('assigned');
  const [isOnline, setIsOnline] = useState(true);
  const [loading, setLoading] = useState(false);

  // Incoming Trip State (TC-021)
  const [incomingTrip, setIncomingTrip] = useState<any>(null);

  // Active Trip Progression (TC-022)
  const [activeTrip, setActiveTrip] = useState<any>(null);
  const [queuedTrips, setQueuedTrips] = useState<any[]>([]);
  const [activatingBookingId, setActivatingBookingId] = useState<string | null>(null);
  const [tripStep, setTripStep] = useState<'assigned' | 'arrived' | 'in_transit' | 'arrived_dest' | 'completed'>('assigned');
  const [enteredOtp, setEnteredOtp] = useState('');
  const [isOtpModalOpen, setIsOtpModalOpen] = useState(false);
  const [podHash, setPodHash] = useState<string | null>(null);

  // Camera State
  const [permission, requestPermission] = useCameraPermissions();
  const [showCamera, setShowCamera] = useState(false);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [cameraRef, setCameraRef] = useState<any>(null);

  // TC-KRI-003: Device Wake Lock Management
  const [isWakeLockActive, setIsWakeLockActive] = useState(false);

  useEffect(() => {
    const isNavigatingTrip = !!activeTrip && tripStep !== 'completed';
    if (isNavigatingTrip) {
      activateKeepAwakeAsync('active_trip_navigation')
        .then(() => setIsWakeLockActive(true))
        .catch((err) => console.log('WakeLock activation note:', err?.message));
    } else {
      try {
        deactivateKeepAwake('active_trip_navigation');
      } catch (_e) {}
      setIsWakeLockActive(false);
    }

    return () => {
      try {
        deactivateKeepAwake('active_trip_navigation');
      } catch (_e) {}
    };
  }, [activeTrip, tripStep]);

  // TC-KRI-004: Thermal Degradation Warnings (Simulated)
  const [thermalAlert, setThermalAlert] = useState<{
    active: boolean;
    temperature: number;
    title: string;
    message: string;
  } | null>(null);
  const socketRef = useRef<any>(null);

  const handleThermalDegradation = (temp: number) => {
    if (temp >= 100) {
      setThermalAlert({
        active: true,
        temperature: temp,
        title: 'Coolant Overheating Risk',
        message: `IoT Engine Coolant Sensor has recorded ${temp}°C! Safe operating threshold is 100°C. Immediate risk of engine head gasket failure. Pull over safely.`,
      });
      try {
        Vibration.vibrate([0, 500, 200, 500]);
      } catch (e) {
        console.log('Vibration trigger note:', e);
      }
    } else {
      setThermalAlert(null);
    }
  };

  useEffect(() => {
    const socketUrl = API_BASE_URL;
    const socket = io(socketUrl, {
      transports: ['websocket'],
      auth: { token },
    });
    socketRef.current = socket;

    const vehicleId = (user as any)?.vehicleId || (user as any)?.vehicle?.id;
    if (vehicleId) {
      socket.emit('join_vehicle_telemetry', vehicleId);
    }

    socket.on('telemetry_update', (packet: any) => {
      if (packet && packet.temperature !== undefined) {
        handleThermalDegradation(Number(packet.temperature));
      }
    });

    socket.on('iot:telemetry', (packet: any) => {
      if (packet && packet.temperature !== undefined) {
        handleThermalDegradation(Number(packet.temperature));
      }
    });

    socket.on('dispatch:assigned', (data: any) => {
      if (!data || data.driverId === user?.id || !data.driverId) {
        fetchDriverData();
      }
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [token, user?.id]);

  const [driverMetrics, setDriverMetrics] = useState<any>({
    completedOrders: 0,
    totalEarnings: 0,
    activeOrdersCount: 0,
    completedBookings: [],
  });

  const fetchDriverData = async () => {
    try {
      if (user?.id) {
        const metricsRes = await api.get(`/api/drivers/${user.id}/metrics`);
        if (metricsRes.data?.success && metricsRes.data?.metrics) {
          const metrics = metricsRes.data.metrics;
          setDriverMetrics(metrics);
          setQueuedTrips(metrics.queuedTrips || []);

          if (metrics.activeTrip && !activeTrip) {
            setActiveTrip({
              bookingId: metrics.activeTrip.id,
              pickupAddress: metrics.activeTrip.pickupAddress,
              dropAddress: metrics.activeTrip.dropAddress || 'Multi-stop delivery point',
              fare: Number(metrics.activeTrip.estimatedFare) || 0,
              goodsType: metrics.activeTrip.goodsType || metrics.activeTrip.cargoType || 'Commercial Freight',
              weight: metrics.activeTrip.weight || 'Standard Payload',
              tempoType: metrics.activeTrip.tempoType || (metrics.activeTrip.vehicle?.type) || 'Tempo',
              customerName: metrics.activeTrip.customer?.name || 'Commercial Client',
              customerPhone: metrics.activeTrip.customer?.phone || '',
              queuePosition: metrics.activeTrip.queuePosition || 1,
            });
            if (metrics.activeTrip.status === 'in_transit') {
              setTripStep('in_transit');
            } else if (metrics.activeTrip.status === 'arrived') {
              setTripStep('arrived');
            } else {
              setTripStep('assigned');
            }
          }
        }
      }
    } catch (e) {
      console.log('Using default driver metrics data');
    }
  };

  const handleActivateQueuedTrip = async (bookingId: string) => {
    if (!user?.id || !bookingId) return;
    setActivatingBookingId(bookingId);
    try {
      const res = await api.put(`/api/drivers/${user.id}/queue/activate/${bookingId}`);
      if (res.data?.success) {
        Alert.alert('Priority Updated', 'This delivery has been promoted to your active stop.');
        setActiveTrip(null);
        await fetchDriverData();
      }
    } catch (err: any) {
      console.log('Error activating queued trip:', err);
      Alert.alert('Error', err?.response?.data?.message || 'Could not update queue priority');
    } finally {
      setActivatingBookingId(null);
    }
  };

  useEffect(() => {
    fetchDriverData();
  }, [user]);

  // TC-020: Toggle Driver Duty Status
  const handleToggleDuty = async (val: boolean) => {
    setIsOnline(val);
    try {
      if (user?.id) {
        await api.patch(`/api/drivers/${user.id}/toggle`);
      }
      if (val) {
        await startBackgroundLocation();
      } else {
        await stopBackgroundLocation();
      }
    } catch (err) {
      console.log('Error toggling driver status:', err);
    }
  };

  // TC-021: Accept Incoming Trip
  const handleAcceptTrip = async () => {
    if (!incomingTrip) return;
    setLoading(true);

    try {
      if (incomingTrip.bookingId && incomingTrip.bookingId.length > 20) {
        await api.put(`/api/bookings/${incomingTrip.bookingId}/status`, {
          status: 'driver_assigned',
          driverId: user?.id,
        });
      }
      setActiveTrip({ ...incomingTrip });
      setTripStep('assigned');
      setIncomingTrip(null);
    } catch (err) {
      if (allowTestFixtures) {
        setActiveTrip({ ...incomingTrip });
        setTripStep('assigned');
        setIncomingTrip(null);
      } else {
        Alert.alert('Trip unavailable', 'The booking service could not accept this trip.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDeclineTrip = () => {
    setIncomingTrip(null);
  };

  // Quick Demo Simulation (Mirroring Web Driver Dashboard Simulation)
  const startDemoSimulation = () => {
    if (!allowTestFixtures) return;
    setActiveTrip({
      bookingId: 'DEMO-SIM-' + Math.random().toString(36).substring(2, 8).toUpperCase(),
      pickupAddress: 'Swargate Industrial Depot, Pune',
      dropAddress: 'Viman Nagar Logistics Hub, Pune',
      fare: 850,
      goodsType: 'Automotive Parts & Assemblies',
      weight: '450 kg',
      tempoType: 'Bolero Pickup',
      customerName: 'Tata AutoComp Systems Ltd',
      customerPhone: '+91 98220 54321',
      queuePosition: 1,
    });
    setTripStep('assigned');
  };

  // TC-022: Complete Trip Lifecycle Transitions
  const handleDriverArrived = async () => {
    setLoading(true);
    try {
      if (activeTrip?.bookingId && activeTrip.bookingId.length > 20) {
        await api.put(`/api/bookings/${activeTrip.bookingId}/status`, { status: 'arrived' });
      }
      setTripStep('arrived');
    } catch (err) {
      setTripStep('arrived');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyStartOtp = async () => {
    const trimmedOtp = enteredOtp.trim();
    if (!trimmedOtp || trimmedOtp.length !== 4) {
      Alert.alert('Invalid OTP', 'Please enter the 4-digit security OTP provided by the customer.');
      return;
    }
    setLoading(true);
    try {
      if (activeTrip?.bookingId && activeTrip.bookingId.length > 20) {
        await api.put(`/api/bookings/${activeTrip.bookingId}/status`, {
          status: 'in_transit',
          otp: trimmedOtp,
        });
      }
      setTripStep('in_transit');
      setIsOtpModalOpen(false);
      setEnteredOtp('');
    } catch (err: any) {
      const serverMessage = err?.response?.data?.message;
      if (serverMessage && err?.response?.status === 400) {
        Alert.alert('Verification Failed', serverMessage);
        return;
      }
      setTripStep('in_transit');
      setIsOtpModalOpen(false);
      setEnteredOtp('');
    } finally {
      setLoading(false);
    }
  };

  const handleTakePicture = async () => {
    if (cameraRef) {
      try {
        const photo = await cameraRef.takePictureAsync({ base64: true });
        setPhotoUri(photo.uri);
        setShowCamera(false);
      } catch (err) {
        Alert.alert('Error', 'Failed to take photo');
      }
    }
  };

  const handleCompleteDelivery = async () => {
    if (!photoUri) {
      Alert.alert('Digital PoD Required', 'Please capture a photo of the delivery to complete the trip.');
      return;
    }
    
    setLoading(true);
    try {
      let currentLat = null;
      let currentLng = null;
      try {
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        currentLat = loc.coords.latitude;
        currentLng = loc.coords.longitude;
      } catch (e) {
        console.log("Could not fetch location for PoD:", e);
      }

      const netState = await NetInfo.fetch();
      const payload = { photoUri, lat: currentLat, lng: currentLng };
      
      if (!netState.isConnected) {
        if (!activeTrip?.bookingId && !allowTestFixtures) {
          Alert.alert('Trip unavailable', 'A valid booking is required before completing delivery.');
          return;
        }
        if (activeTrip?.bookingId && activeTrip.bookingId.length > 20) {
          queueOfflineRequest(`/api/bookings/${activeTrip.bookingId}/complete`, 'POST', payload);
        }
        setPodHash(allowTestFixtures ? 'OFFLINE_SYNC_PENDING_' + Math.random().toString(36).substring(7).toUpperCase() : null);
        setTripStep('completed');
        setPhotoUri(null);
        Alert.alert('Offline Mode', 'Delivery saved locally. It will auto-sync when connection is restored.');
      } else {
        if (activeTrip?.bookingId && activeTrip.bookingId.length > 20) {
          const res = await api.post(`/api/bookings/${activeTrip.bookingId}/complete`, payload);
          if (res.data?.booking?.podHash) {
            setPodHash(res.data.booking.podHash);
          }
        } else if (allowTestFixtures) {
          setPodHash('POD-' + Math.random().toString(36).substring(2, 10).toUpperCase());
        } else {
          Alert.alert('Trip unavailable', 'A valid booking is required before completing delivery.');
          return;
        }
        setTripStep('completed');
        setPhotoUri(null);
      }
    } catch (err) {
      if (allowTestFixtures) {
        setPodHash('POD-' + Math.random().toString(36).substring(2, 10).toUpperCase());
        setTripStep('completed');
      } else {
        Alert.alert('Delivery unavailable', 'The booking service could not complete this delivery.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDismissCompletedTrip = () => {
    setActiveTrip(null);
    setTripStep('assigned');
    setPodHash('');
    fetchDriverData();
  };

  const handleLogout = async () => {
    await logout();
    router.replace('/(auth)/login');
  };

  return (
    <View style={styles.container}>
      {/* Header matching Web Driver Portal */}
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <View style={styles.badgeRow}>
            <Text style={styles.pilotBadge}>DRIVER PORTAL</Text>
            <View style={styles.fleetPartnerPill}>
              <Text style={styles.fleetPartnerPillText}>FLEET PARTNER</Text>
            </View>
          </View>
          <Text style={styles.userName}>{user?.name || 'Driver Partner'}</Text>
          <Text style={styles.userPhone}>{user?.vehicleNo || 'Fleet Assigned Vehicle'}</Text>
        </View>
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Text style={styles.logoutBtnText}>Logout</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* TC-020: Online / Offline Duty Switch */}
        <View style={[styles.statusCard, isOnline ? styles.statusCardOnline : styles.statusCardOffline]}>
          <View style={{ flex: 1, marginRight: 10 }}>
            <Text style={styles.statusLabel}>Duty Status</Text>
            <Text style={[styles.statusState, { color: isOnline ? '#22c55e' : '#a2b2c7' }]}>
              {isOnline ? '🟢 ONLINE — Receiving Assigned Trips' : '⚪ OFFLINE — Shift Paused'}
            </Text>
          </View>
          <Switch
            value={isOnline}
            onValueChange={handleToggleDuty}
            thumbColor={isOnline ? '#22c55e' : '#c9d3df'}
            trackColor={{ false: '#2f3a4e', true: 'rgba(34, 197, 94, 0.4)' }}
          />
        </View>

        {/* Driver Performance & Earnings Summary (Matching Web Top Stats Grid) */}
        <View style={styles.metricsRow}>
          <View style={[styles.metricCard, styles.metricCardPrimary]}>
            <Text style={[styles.metricLabel, { color: '#fb923c' }]}>TOTAL EARNED</Text>
            <Text style={[styles.metricValue, { color: '#fb923c' }]}>
              ₹{(driverMetrics.totalEarnings || 0).toLocaleString()}
            </Text>
            <Text style={styles.metricSub}>Direct Fleet Settlement</Text>
          </View>

          <View style={styles.metricCard}>
            <Text style={[styles.metricLabel, { color: '#4ade80' }]}>COMPLETED</Text>
            <Text style={[styles.metricValue, { color: '#4ade80' }]}>
              {driverMetrics.completedOrders || 0}
            </Text>
            <Text style={styles.metricSub}>Delivered Orders</Text>
          </View>

          <View style={styles.metricCard}>
            <Text style={[styles.metricLabel, { color: '#38bdf8' }]}>ASSIGNED</Text>
            <Text style={[styles.metricValue, { color: '#38bdf8' }]}>
              {(driverMetrics.activeOrdersCount || 0) > 1
                ? `1 + ${(driverMetrics.activeOrdersCount || 0) - 1} Q`
                : `${driverMetrics.activeOrdersCount || 0} Active`}
            </Text>
            <Text style={styles.metricSub}>Appointed Work</Text>
          </View>
        </View>

        {/* Tab Switcher (Matching Web Driver Dashboard Tabs) */}
        <View style={styles.tabSwitcher}>
          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'assigned' && styles.tabBtnActive]}
            onPress={() => setActiveTab('assigned')}
          >
            <Text style={[styles.tabBtnText, activeTab === 'assigned' && styles.tabBtnTextActive]}>
              🚚 Assigned Work
            </Text>
            {(driverMetrics.activeOrdersCount || 0) > 0 && (
              <View style={styles.tabBadge}>
                <Text style={styles.tabBadgeText}>{driverMetrics.activeOrdersCount}</Text>
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'tools' && styles.tabBtnActive]}
            onPress={() => setActiveTab('tools')}
          >
            <Text style={[styles.tabBtnText, activeTab === 'tools' && styles.tabBtnTextActive]}>
              📦 Driver Tools
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'history' && styles.tabBtnActive]}
            onPress={() => setActiveTab('history')}
          >
            <Text style={[styles.tabBtnText, activeTab === 'history' && styles.tabBtnTextActive]}>
              📜 Trip History
            </Text>
          </TouchableOpacity>
        </View>

        {/* TAB 1: ASSIGNED WORK / DELIVERIES & QUEUE */}
        {activeTab === 'assigned' && (
          <View>
            {/* TC-021: Incoming Booking Request Alert */}
            {isOnline && incomingTrip && !activeTrip && (
              <View style={styles.incomingCard}>
                <View style={styles.incomingHeader}>
                  <View style={styles.pulsingDot} />
                  <Text style={styles.incomingTitle}>NEW BOOKING REQUEST</Text>
                  <Text style={styles.incomingFare}>₹{incomingTrip.fare}</Text>
                </View>

                <View style={styles.incomingBody}>
                  <Text style={styles.incomingRoute}>
                    📍 {incomingTrip.pickupAddress}
                  </Text>
                  <Text style={[styles.incomingRoute, { marginTop: 4 }]}>
                    🎯 {incomingTrip.dropAddress}
                  </Text>
                  <View style={styles.incomingMetaRow}>
                    <Text style={styles.incomingMeta}>{incomingTrip.tempoType}</Text>
                    <Text style={styles.incomingMeta}>•</Text>
                    <Text style={styles.incomingMeta}>{incomingTrip.weight}</Text>
                    <Text style={styles.incomingMeta}>•</Text>
                    <Text style={styles.incomingMeta}>{incomingTrip.goodsType}</Text>
                  </View>
                </View>

                <View style={styles.incomingActions}>
                  <TouchableOpacity style={styles.declineBtn} onPress={handleDeclineTrip}>
                    <Text style={styles.declineBtnText}>Decline</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.acceptBtn}
                    onPress={handleAcceptTrip}
                    disabled={loading}
                  >
                    {loading ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Text style={styles.acceptBtnText}>ACCEPT TRIP (₹{incomingTrip.fare})</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* TC-022 & TC-KRI-003: Active Appointed Trip & Lifecycle */}
            {activeTrip ? (
              <View style={styles.appointedCard}>
                {/* Header matching Web */}
                <View style={styles.appointedHeaderRow}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
                    <View style={styles.pulsingGreenDot} />
                    <Text style={styles.appointedHeadingText}>Appointed Work Order</Text>
                  </View>
                  <View style={styles.adminDispatchedBadge}>
                    <Text style={styles.adminDispatchedBadgeText}>🛡️ Dispatched by Admin</Text>
                  </View>
                </View>

                {/* Guaranteed Trip Compensation Header */}
                <View style={styles.compensationHeader}>
                  <View>
                    <Text style={styles.compensationSubLabel}>Guaranteed Trip Compensation</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8, marginTop: 4 }}>
                      <Text style={styles.compensationAmount}>
                        ₹{Number(activeTrip.fare).toLocaleString('en-IN')}
                      </Text>
                      <View style={styles.settlementPill}>
                        <Text style={styles.settlementPillText}>Direct Fleet Settlement</Text>
                      </View>
                    </View>
                  </View>
                  <View style={styles.refIdBox}>
                    <Text style={styles.refIdLabel}>Order Ref</Text>
                    <Text style={styles.refIdText}>#{String(activeTrip.bookingId).slice(0, 8)}</Text>
                  </View>
                </View>

                {/* Route Waypoints (Matching Web Design) */}
                <View style={styles.routeContainer}>
                  <View style={styles.routeLine} />

                  {/* Pickup */}
                  <View style={styles.waypointRow}>
                    <View style={[styles.waypointMarker, { backgroundColor: '#22c55e' }]} />
                    <View style={{ flex: 1, paddingLeft: 12 }}>
                      <Text style={styles.waypointTagGreen}>PICKUP LOCATION</Text>
                      <Text style={styles.waypointAddress}>{activeTrip.pickupAddress}</Text>
                      {activeTrip.customerName && (
                        <Text style={styles.consignorText}>
                          Consignor: <Text style={{ color: '#e2e8f0', fontWeight: '600' }}>{activeTrip.customerName}</Text>
                          {activeTrip.customerPhone ? ` • ${activeTrip.customerPhone}` : ''}
                        </Text>
                      )}
                    </View>
                  </View>

                  {/* Destination */}
                  <View style={[styles.waypointRow, { marginTop: 16 }]}>
                    <View style={[styles.waypointMarker, { backgroundColor: '#e86331' }]} />
                    <View style={{ flex: 1, paddingLeft: 12 }}>
                      <Text style={styles.waypointTagOrange}>DESTINATION / DROP-OFF</Text>
                      <Text style={styles.waypointAddress}>{activeTrip.dropAddress}</Text>
                    </View>
                  </View>
                </View>

                {/* Cargo & Payload Meta Grid */}
                <View style={styles.cargoGrid}>
                  <View style={styles.cargoCell}>
                    <Text style={styles.cargoCellLabel}>Consignment Cargo</Text>
                    <Text style={styles.cargoCellValue}>{activeTrip.goodsType || 'Commercial Freight'}</Text>
                  </View>
                  <View style={styles.cargoCell}>
                    <Text style={styles.cargoCellLabel}>Vehicle & Payload</Text>
                    <Text style={styles.cargoCellValue}>
                      {activeTrip.tempoType || 'Tempo'} ({activeTrip.weight || 'Standard Payload'})
                    </Text>
                  </View>
                </View>

                {/* TC-KRI-003: Device Wake Lock Management Badge */}
                <View style={[styles.wakeLockBadge, isWakeLockActive ? styles.wakeLockActive : styles.wakeLockInactive]}>
                  <Text style={styles.wakeLockBadgeText}>
                    {isWakeLockActive 
                      ? '⚡ Screen Kept Awake for Active Transit (Wake Lock Active)' 
                      : '💤 Wake Lock Standby'}
                  </Text>
                </View>

                {/* Step 1: Heading to Pickup */}
                {tripStep === 'assigned' && (
                  <View style={styles.stepBox}>
                    <Text style={styles.stepHeading}>Step 1: Proceed to Pickup Point</Text>
                    <Text style={styles.stepSub}>
                      Navigate to the loading dock and notify warehouse staff upon arrival.
                    </Text>

                    {queuedTrips.length > 0 && (
                      <View style={styles.nextStopPreview}>
                        <Text style={styles.nextStopTitle}>⚡ UP NEXT: STOP #2 IN QUEUE</Text>
                        <Text style={styles.nextStopRoute} numberOfLines={1}>
                          🎯 {queuedTrips[0].dropAddress || queuedTrips[0].pickupAddress}
                        </Text>
                        <Text style={styles.nextStopFare}>
                          Trip Compensation: ₹{queuedTrips[0].estimatedFare || 0} (Direct Settlement)
                        </Text>
                      </View>
                    )}

                    <TouchableOpacity
                      style={styles.stepActionBtn}
                      onPress={handleDriverArrived}
                      disabled={loading}
                    >
                      <Text style={styles.stepActionBtnText}>I Have Arrived at Pickup 📍</Text>
                    </TouchableOpacity>
                  </View>
                )}

                {/* Step 2: Arrived, Load Cargo & Verify OTP */}
                {tripStep === 'arrived' && (
                  <View style={styles.stepBox}>
                    <Text style={styles.stepHeading}>Step 2: Loading & Customer Verification</Text>
                    <Text style={styles.stepSub}>
                      Inspect goods ({activeTrip.goodsType}, {activeTrip.weight}) and ask customer for the 4-digit Start OTP.
                    </Text>

                    {queuedTrips.length > 0 && (
                      <View style={styles.nextStopPreview}>
                        <Text style={styles.nextStopTitle}>⚡ UP NEXT: STOP #2 IN QUEUE</Text>
                        <Text style={styles.nextStopRoute} numberOfLines={1}>
                          🎯 {queuedTrips[0].dropAddress || queuedTrips[0].pickupAddress}
                        </Text>
                        <Text style={styles.nextStopFare}>
                          Trip Compensation: ₹{queuedTrips[0].estimatedFare || 0} (Direct Settlement)
                        </Text>
                      </View>
                    )}

                    <TouchableOpacity
                      style={[styles.stepActionBtn, { backgroundColor: '#f59e0b' }]}
                      onPress={() => setIsOtpModalOpen(true)}
                    >
                      <Text style={styles.stepActionBtnText}>Enter Start Ride OTP 🔑</Text>
                    </TouchableOpacity>
                  </View>
                )}

                {/* Step 3: In-Transit to Destination (Arrived & PoD) */}
                {(tripStep === 'in_transit' || tripStep === 'arrived_dest') && (
                  <View style={styles.stepBox}>
                    <Text style={styles.stepHeading}>Step 3: Goods at Destination 🚚</Text>
                    <Text style={styles.stepAddress}>🎯 Destination: {activeTrip.dropAddress}</Text>

                    <View style={{ marginTop: 12 }}>
                      {!photoUri && !showCamera && (
                        <>
                          <Text style={styles.stepSub}>Capture digital proof of delivery (photo of goods) to proceed.</Text>
                          <TouchableOpacity
                            style={[styles.stepActionBtn, { backgroundColor: '#3b82f6', marginBottom: 12 }]}
                            onPress={() => {
                              if (!permission?.granted) requestPermission();
                              setShowCamera(true);
                            }}
                          >
                            <Text style={styles.stepActionBtnText}>📸 Capture PoD Photo</Text>
                          </TouchableOpacity>
                        </>
                      )}

                      {showCamera && permission?.granted && (
                        <View style={{ height: 280, width: '100%', borderRadius: 12, overflow: 'hidden', marginBottom: 12 }}>
                          <CameraView style={{ flex: 1 }} facing="back" ref={(ref) => setCameraRef(ref)}>
                            <View style={{ flex: 1, justifyContent: 'flex-end', alignItems: 'center', paddingBottom: 20 }}>
                              <TouchableOpacity
                                style={{ width: 60, height: 60, borderRadius: 30, backgroundColor: '#fff', borderWidth: 4, borderColor: '#e86331' }}
                                onPress={handleTakePicture}
                              />
                            </View>
                          </CameraView>
                        </View>
                      )}

                      {photoUri && (
                        <View style={{ marginBottom: 12, padding: 12, backgroundColor: '#1e293b', borderRadius: 8 }}>
                          <Text style={{ color: '#10b981', fontWeight: 'bold', marginBottom: 4 }}>✅ Delivery Photo Captured</Text>
                          <TouchableOpacity onPress={() => setShowCamera(true)}>
                            <Text style={{ color: '#3b82f6', fontSize: 12 }}>Retake Photo</Text>
                          </TouchableOpacity>
                        </View>
                      )}
                    </View>

                    {queuedTrips.length > 0 && (
                      <View style={styles.nextStopPreview}>
                        <Text style={styles.nextStopTitle}>⚡ UP NEXT: STOP #2 IN QUEUE</Text>
                        <Text style={styles.nextStopRoute} numberOfLines={1}>
                          🎯 {queuedTrips[0].dropAddress || queuedTrips[0].pickupAddress}
                        </Text>
                        <Text style={styles.nextStopFare}>
                          Trip Compensation: ₹{queuedTrips[0].estimatedFare || 0} (Direct Settlement)
                        </Text>
                      </View>
                    )}

                    <TouchableOpacity
                      style={[styles.stepActionBtn, { backgroundColor: photoUri ? '#22c55e' : '#475569' }]}
                      onPress={handleCompleteDelivery}
                      disabled={loading || !photoUri}
                    >
                      <Text style={styles.stepActionBtnText}>Mark Delivered & Sign PoD ✅</Text>
                    </TouchableOpacity>
                  </View>
                )}

                {/* Step 4: Completed with Blockchain PoD */}
                {tripStep === 'completed' && (
                  <View style={styles.stepBox}>
                    <Text style={styles.successHeading}>🎉 Delivery Completed Successfully!</Text>
                    <Text style={styles.podText}>
                      Blockchain PoD Hash: {podHash ? podHash.slice(0, 24) + '...' : 'Verified'}
                    </Text>
                    <View style={styles.directSettlementCompletedNotice}>
                      <Text style={styles.directSettlementCompletedText}>
                        💰 ₹{activeTrip.fare} guaranteed compensation recorded for direct fleet settlement.
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={styles.stepActionBtn}
                      onPress={handleDismissCompletedTrip}
                    >
                      <Text style={styles.stepActionBtnText}>Back to Duty Queue</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            ) : !incomingTrip ? (
              /* STANDBY SCREEN WHEN NO ACTIVE TRIP (Matching Web Driver Portal Lines 570-638) */
              <View style={styles.standbyCard}>
                <View style={styles.standbyIconBox}>
                  <Text style={styles.standbyIcon}>🚚</Text>
                  <View style={[styles.standbyDot, isOnline ? styles.standbyDotGreen : styles.standbyDotGrey]} />
                </View>

                <View style={styles.standbyPill}>
                  <Text style={styles.standbyPillText}>
                    {isOnline ? '🟢 Fleet Standby • Available for Work' : '⚪ Duty Paused • Offline'}
                  </Text>
                </View>

                <Text style={styles.standbyTitle}>Awaiting Appointed Work</Text>
                <Text style={styles.standbyDesc}>
                  Fleet administrators appoint bookings directly to your vehicle based on capacity and scheduled routes. As soon as dispatch assigns a delivery, your work order and live route will appear here.
                </Text>

                <View style={styles.standbyActionsRow}>
                  <TouchableOpacity
                    style={styles.standbyRefreshBtn}
                    onPress={fetchDriverData}
                  >
                    <Text style={styles.standbyRefreshBtnText}>🔄 Check Appointed Work</Text>
                  </TouchableOpacity>

                  {allowTestFixtures && (
                    <TouchableOpacity
                      style={styles.standbySimBtn}
                      onPress={startDemoSimulation}
                    >
                      <Text style={styles.standbySimBtnText}>▶️ Launch Tempo Moving Simulation</Text>
                    </TouchableOpacity>
                  )}
                </View>

                {/* Standby Readiness Status Badges */}
                <View style={styles.standbyStatsGrid}>
                  <View style={styles.standbyStatCard}>
                    <Text style={styles.standbyStatLabel}>Shift Duty</Text>
                    <Text style={[styles.standbyStatVal, { color: isOnline ? '#4ade80' : '#a2b2c7' }]}>
                      {isOnline ? 'Active & Ready' : 'Shift Inactive'}
                    </Text>
                  </View>
                  <View style={styles.standbyStatCard}>
                    <Text style={styles.standbyStatLabel}>Appointed Queue</Text>
                    <Text style={[styles.standbyStatVal, { color: '#38bdf8' }]}>
                      {driverMetrics.activeOrdersCount || 0} Orders in Queue
                    </Text>
                  </View>
                  <View style={styles.standbyStatCard}>
                    <Text style={styles.standbyStatLabel}>Deliveries Today</Text>
                    <Text style={[styles.standbyStatVal, { color: '#f4f6f8' }]}>
                      {driverMetrics.completedOrders || 0} Completed
                    </Text>
                  </View>
                </View>

                {/* Fleet Admin Direct Settlement Notice */}
                <View style={styles.settlementNoticeBox}>
                  <Text style={styles.settlementNoticeTitle}>🛡️ Direct Fleet Settlement</Text>
                  <Text style={styles.settlementNoticeDesc}>
                    Driver compensation is disbursed directly by the fleet administrator/owner offline. In-portal payout requests are not required.
                  </Text>
                </View>
              </View>
            ) : null}

            {/* Multi-Delivery Queue Stack */}
            {queuedTrips.length > 0 && (
              <View style={styles.queueContainer}>
                <View style={styles.queueHeaderRow}>
                  <View>
                    <Text style={styles.queueHeaderTitle}>Assigned Delivery Queue</Text>
                    <Text style={styles.queueHeaderSubtitle}>
                      Auto-promotes when current stop finishes
                    </Text>
                  </View>
                  <View style={styles.queueCountBadge}>
                    <Text style={styles.queueCountText}>{queuedTrips.length} Up Next</Text>
                  </View>
                </View>

                {queuedTrips.map((queued: any, idx: number) => (
                  <View key={queued.id} style={styles.queueCard}>
                    <View style={styles.queueCardHeader}>
                      <View style={styles.queueStopBadge}>
                        <Text style={styles.queueStopBadgeText}>
                          Stop #{idx + 2} {idx === 0 ? '(Up Next)' : 'in Queue'}
                        </Text>
                      </View>
                      <Text style={styles.queueId}>#{queued.id.slice(0, 8)}</Text>
                      {queued.tempoType && (
                        <Text style={styles.queueTempo}>{queued.tempoType}</Text>
                      )}
                    </View>

                    <View style={styles.queueAddressBlock}>
                      <View style={styles.queueAddressRow}>
                        <Text style={styles.dotGreen}>●</Text>
                        <Text style={styles.queueAddressText} numberOfLines={1}>
                          {queued.pickupAddress}
                        </Text>
                      </View>
                      <View style={styles.queueAddressRow}>
                        <Text style={styles.dotOrange}>▼</Text>
                        <Text style={[styles.queueAddressText, { color: '#f08b65' }]} numberOfLines={1}>
                          {queued.dropAddress || 'Scheduled Delivery Point'}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.queueMetaRow}>
                      <Text style={styles.queueMetaText}>
                        {queued.customer?.name || 'Commercial Client'} • {queued.cargoType || queued.goodsType || 'Freight'}
                      </Text>
                      <Text style={styles.queueFare}>₹{Number(queued.estimatedFare || 0).toLocaleString()} (Direct)</Text>
                    </View>

                    <TouchableOpacity
                      style={styles.makeActiveBtn}
                      onPress={() => handleActivateQueuedTrip(queued.id)}
                      disabled={activatingBookingId === queued.id}
                    >
                      {activatingBookingId === queued.id ? (
                        <ActivityIndicator size="small" color="#fb923c" />
                      ) : (
                        <Text style={styles.makeActiveBtnText}>Make Active Stop Now ⚡</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        {/* TAB 2: DRIVER TOOLS */}
        {activeTab === 'tools' && (
          <View style={{ marginTop: 4 }}>
            <Text style={styles.sectionTitle}>Driver Tools & Operations</Text>
            <View style={styles.toolsRow}>
              <TouchableOpacity
                style={styles.toolCard}
                onPress={() => router.push('/(driver)/scanner' as any)}
              >
                <Text style={styles.toolIcon}>📦</Text>
                <Text style={styles.toolTitle}>WMS Scanner</Text>
                <Text style={styles.toolSubtitle}>Scan Barcodes & Packages</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.toolCard}
                onPress={() => router.push('/(driver)/heatmap' as any)}
              >
                <Text style={styles.toolIcon}>🔥</Text>
                <Text style={styles.toolTitle}>Demand Heatmap</Text>
                <Text style={styles.toolSubtitle}>High-Surge Dispatch Zones</Text>
              </TouchableOpacity>
            </View>

            {/* QA Sensor & Telemetry Simulator Panel */}
            {allowTestFixtures && (
              <View style={styles.simPanel}>
                <Text style={styles.simPanelTitle}>🧪 QA SENSOR & TELEMETRY SIMULATION</Text>
                <Text style={styles.simPanelDesc}>Inject mock telemetry packets into WebSocket / device drivers</Text>
                <View style={styles.simBtnRow}>
                  <TouchableOpacity 
                    style={[styles.simBtn, { backgroundColor: '#ef4444' }]} 
                    onPress={() => {
                      handleThermalDegradation(110);
                      if (socketRef.current?.connected) {
                        socketRef.current.emit('qa:inject_telemetry', { vehicleId: process.env.EXPO_PUBLIC_TEST_VEHICLE_ID || 'VEH-TEST', temperature: 110 });
                      }
                    }}
                  >
                    <Text style={styles.simBtnText}>🔥 Inject Telemetry (110°C Overheat)</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.simBtn, { backgroundColor: '#10b981' }]} 
                    onPress={() => {
                      handleThermalDegradation(85);
                      if (socketRef.current?.connected) {
                        socketRef.current.emit('qa:inject_telemetry', { vehicleId: process.env.EXPO_PUBLIC_TEST_VEHICLE_ID || 'VEH-TEST', temperature: 85 });
                      }
                    }}
                  >
                    <Text style={styles.simBtnText}>💧 Normal Temp (85°C)</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        )}

        {/* TAB 3: COMPLETED TRIP HISTORY */}
        {activeTab === 'history' && (
          <View style={{ marginTop: 4 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <Text style={styles.sectionTitle}>Completed Delivery History</Text>
              <Text style={{ color: '#a2b2c7', fontSize: 12 }}>
                Total: {driverMetrics.completedOrders || 0} Delivered
              </Text>
            </View>

            {(!driverMetrics.completedBookings || driverMetrics.completedBookings.length === 0) ? (
              <View style={styles.emptyHistoryCard}>
                <Text style={{ fontSize: 32, marginBottom: 8 }}>📋</Text>
                <Text style={styles.emptyHistoryTitle}>No Completed Trips Yet</Text>
                <Text style={styles.emptyHistoryDesc}>
                  Your finished deliveries with cryptographic proof of delivery and fleet compensation will be logged here.
                </Text>
              </View>
            ) : (
              <View style={{ gap: 10 }}>
                {driverMetrics.completedBookings.map((b: any) => (
                  <View key={b.id} style={styles.historyCard}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <View style={styles.historyStatusPill}>
                        <Text style={styles.historyStatusPillText}>Delivered</Text>
                      </View>
                      <Text style={styles.historyFare}>+₹{b.estimatedFare} (Settled)</Text>
                    </View>

                    <Text style={styles.historyRouteText} numberOfLines={1}>
                      {b.pickupAddress} → {b.dropAddress || 'Multi-stop drop'}
                    </Text>

                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
                      <Text style={styles.historyMetaText}>
                        {b.tempoType || 'Tempo'} • {b.goodsType || 'Freight'}
                      </Text>
                      <Text style={styles.historyDateText}>
                        {b.updatedAt ? new Date(b.updatedAt).toLocaleDateString() : 'Recent'}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* High-Priority Thermal Warning Modal */}
      <Modal
        visible={!!thermalAlert?.active}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setThermalAlert(null)}
      >
        <View style={styles.thermalModalOverlay}>
          <View style={styles.thermalModalContent}>
            <View style={styles.thermalAlertHeader}>
              <Text style={styles.thermalAlertTag}>🚨 HIGH-PRIORITY CRITICAL WARNING</Text>
              <Text style={styles.thermalAlertTemp}>{thermalAlert?.temperature}°C</Text>
            </View>
            <Text style={styles.thermalAlertTitle}>{thermalAlert?.title || 'Coolant Overheating Risk'}</Text>
            <Text style={styles.thermalAlertDesc}>{thermalAlert?.message}</Text>
            
            <View style={styles.thermalHapticNotice}>
              <Text style={styles.thermalHapticText}>📳 Distinct Haptic Vibration Warning Dispatched</Text>
            </View>

            <TouchableOpacity
              style={styles.thermalDismissBtn}
              onPress={() => setThermalAlert(null)}
            >
              <Text style={styles.thermalDismissBtnText}>Acknowledge Hazard & Pull Over</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Start Ride OTP Verification Modal */}
      <Modal
        visible={isOtpModalOpen}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsOtpModalOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Enter Start Ride OTP</Text>
            <Text style={styles.modalSubtitle}>
              Ask customer for their 4-digit security code shown on their tracking screen
            </Text>

            <TextInput
              style={styles.otpInput}
              value={enteredOtp}
              onChangeText={setEnteredOtp}
              placeholder="••••"
              placeholderTextColor="#748bac"
              keyboardType="number-pad"
              maxLength={4}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setIsOtpModalOpen(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalVerifyBtn}
                onPress={handleVerifyStartOtp}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.modalVerifyText}>Start Trip 🚀</Text>
                )}
              </TouchableOpacity>
            </View>
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
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pilotBadge: {
    color: '#e86331',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
  },
  fleetPartnerPill: {
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.4)',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  fleetPartnerPillText: {
    color: '#22c55e',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
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
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  statusCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    marginBottom: 16,
  },
  statusCardOnline: {
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    borderColor: '#22c55e',
  },
  statusCardOffline: {
    backgroundColor: '#293243',
    borderColor: '#2f3a4e',
  },
  statusLabel: {
    color: '#a2b2c7',
    fontSize: 12,
    fontWeight: '500',
  },
  statusState: {
    fontSize: 14,
    fontWeight: '700',
    marginTop: 4,
  },
  metricsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  metricCard: {
    flex: 1,
    backgroundColor: '#293243',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#2f3a4e',
  },
  metricCardPrimary: {
    backgroundColor: 'rgba(232, 99, 49, 0.1)',
    borderColor: 'rgba(232, 99, 49, 0.35)',
  },
  metricLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#a2b2c7',
    letterSpacing: 0.5,
  },
  metricValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#f4f6f8',
    marginTop: 4,
    marginBottom: 2,
  },
  metricSub: {
    fontSize: 10,
    color: '#748bac',
  },
  tabSwitcher: {
    flexDirection: 'row',
    backgroundColor: '#1b2230',
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#2f3a4e',
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    gap: 4,
  },
  tabBtnActive: {
    backgroundColor: '#e86331',
  },
  tabBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#a2b2c7',
  },
  tabBtnTextActive: {
    color: '#ffffff',
  },
  tabBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 10,
  },
  tabBadgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '800',
  },
  incomingCard: {
    backgroundColor: '#293243',
    borderRadius: 16,
    padding: 18,
    borderWidth: 2,
    borderColor: '#f59e0b',
    marginBottom: 16,
  },
  incomingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  pulsingDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#f59e0b',
    marginRight: 8,
  },
  incomingTitle: {
    flex: 1,
    color: '#f59e0b',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 1,
  },
  incomingFare: {
    color: '#f4f6f8',
    fontSize: 22,
    fontWeight: '800',
  },
  incomingBody: {
    backgroundColor: '#0f141f',
    borderRadius: 12,
    padding: 14,
    marginBottom: 14,
  },
  incomingRoute: {
    color: '#f4f6f8',
    fontSize: 13,
    fontWeight: '500',
  },
  incomingMetaRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  incomingMeta: {
    color: '#a2b2c7',
    fontSize: 11,
  },
  incomingActions: {
    flexDirection: 'row',
    gap: 10,
  },
  declineBtn: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    alignItems: 'center',
  },
  declineBtnText: {
    color: '#f87171',
    fontWeight: '700',
    fontSize: 13,
  },
  acceptBtn: {
    flex: 1,
    backgroundColor: '#22c55e',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  acceptBtnText: {
    color: '#f4f6f8',
    fontWeight: '800',
    fontSize: 14,
  },
  // APPOINTED WORK ORDER CARD (Matching Web)
  appointedCard: {
    backgroundColor: '#1b2230',
    borderRadius: 18,
    padding: 18,
    borderWidth: 2,
    borderColor: '#e86331',
    marginBottom: 16,
    shadowColor: '#e86331',
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  appointedHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  pulsingGreenDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#22c55e',
  },
  appointedHeadingText: {
    color: '#f4f6f8',
    fontSize: 16,
    fontWeight: '800',
  },
  adminDispatchedBadge: {
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.35)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  adminDispatchedBadgeText: {
    color: '#4ade80',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  compensationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    backgroundColor: '#0f141f',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2f3a4e',
    marginBottom: 14,
  },
  compensationSubLabel: {
    color: '#a2b2c7',
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  compensationAmount: {
    color: '#f4f6f8',
    fontSize: 26,
    fontWeight: '900',
  },
  settlementPill: {
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.4)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  settlementPillText: {
    color: '#4ade80',
    fontSize: 10,
    fontWeight: '800',
  },
  refIdBox: {
    alignItems: 'flex-end',
  },
  refIdLabel: {
    color: '#748bac',
    fontSize: 10,
    textTransform: 'uppercase',
  },
  refIdText: {
    color: '#e2e8f0',
    fontSize: 13,
    fontWeight: '800',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    marginTop: 2,
  },
  routeContainer: {
    backgroundColor: '#0f141f',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2f3a4e',
    marginBottom: 14,
    position: 'relative',
  },
  routeLine: {
    position: 'absolute',
    left: 19,
    top: 24,
    bottom: 24,
    width: 2,
    backgroundColor: '#2f3a4e',
  },
  waypointRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  waypointMarker: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginTop: 3,
  },
  waypointTagGreen: {
    color: '#4ade80',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  waypointTagOrange: {
    color: '#fb923c',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  waypointAddress: {
    color: '#f4f6f8',
    fontSize: 13,
    fontWeight: '600',
    marginTop: 2,
  },
  consignorText: {
    color: '#a2b2c7',
    fontSize: 11,
    marginTop: 3,
  },
  cargoGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  cargoCell: {
    flex: 1,
    backgroundColor: '#0f141f',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#2f3a4e',
  },
  cargoCellLabel: {
    color: '#748bac',
    fontSize: 10,
    textTransform: 'uppercase',
    fontWeight: '700',
  },
  cargoCellValue: {
    color: '#fb923c',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 2,
  },
  stepBox: {
    backgroundColor: '#0f141f',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#2f3a4e',
  },
  stepHeading: {
    color: '#f4f6f8',
    fontSize: 14,
    fontWeight: '800',
  },
  stepSub: {
    color: '#a2b2c7',
    fontSize: 12,
    marginVertical: 8,
  },
  stepAddress: {
    color: '#c9d3df',
    fontSize: 13,
    marginTop: 4,
    marginBottom: 10,
  },
  stepActionBtn: {
    backgroundColor: '#e86331',
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: 'center',
    marginTop: 8,
  },
  stepActionBtnText: {
    color: '#f4f6f8',
    fontWeight: '800',
    fontSize: 14,
  },
  successHeading: {
    color: '#4ade80',
    fontSize: 15,
    fontWeight: '800',
    textAlign: 'center',
  },
  podText: {
    color: '#a2b2c7',
    fontSize: 11,
    textAlign: 'center',
    marginVertical: 8,
  },
  directSettlementCompletedNotice: {
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.35)',
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
  },
  directSettlementCompletedText: {
    color: '#86efac',
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },
  // STANDBY CARD (Matching Web)
  standbyCard: {
    backgroundColor: '#1b2230',
    borderRadius: 18,
    padding: 24,
    borderWidth: 1,
    borderColor: '#2f3a4e',
    alignItems: 'center',
    marginBottom: 16,
    textAlign: 'center',
  },
  standbyIconBox: {
    width: 64,
    height: 64,
    borderRadius: 18,
    backgroundColor: '#0f141f',
    borderWidth: 1,
    borderColor: '#2f3a4e',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
    position: 'relative',
  },
  standbyIcon: {
    fontSize: 30,
  },
  standbyDot: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#1b2230',
  },
  standbyDotGreen: {
    backgroundColor: '#22c55e',
  },
  standbyDotGrey: {
    backgroundColor: '#64748b',
  },
  standbyPill: {
    backgroundColor: '#0f141f',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#2f3a4e',
    marginBottom: 12,
  },
  standbyPillText: {
    color: '#cbd5e1',
    fontSize: 11,
    fontWeight: '700',
  },
  standbyTitle: {
    color: '#f4f6f8',
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 6,
    textAlign: 'center',
  },
  standbyDesc: {
    color: '#a2b2c7',
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
    marginBottom: 18,
  },
  standbyActionsRow: {
    width: '100%',
    gap: 10,
    marginBottom: 18,
  },
  standbyRefreshBtn: {
    backgroundColor: '#e86331',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  standbyRefreshBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800',
  },
  standbySimBtn: {
    backgroundColor: 'rgba(232, 99, 49, 0.12)',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(232, 99, 49, 0.4)',
  },
  standbySimBtnText: {
    color: '#fb923c',
    fontSize: 12,
    fontWeight: '700',
  },
  standbyStatsGrid: {
    flexDirection: 'row',
    gap: 8,
    width: '100%',
    borderTopWidth: 1,
    borderTopColor: '#2f3a4e',
    paddingTop: 14,
    marginBottom: 14,
  },
  standbyStatCard: {
    flex: 1,
    backgroundColor: '#0f141f',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#2f3a4e',
  },
  standbyStatLabel: {
    color: '#748bac',
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  standbyStatVal: {
    fontSize: 12,
    fontWeight: '800',
    marginTop: 4,
  },
  settlementNoticeBox: {
    backgroundColor: 'rgba(232, 99, 49, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(232, 99, 49, 0.25)',
    borderRadius: 10,
    padding: 12,
    width: '100%',
  },
  settlementNoticeTitle: {
    color: '#fb923c',
    fontSize: 11,
    fontWeight: '800',
    marginBottom: 2,
  },
  settlementNoticeDesc: {
    color: '#fed7aa',
    fontSize: 11,
    lineHeight: 16,
  },
  // QUEUE STACK
  queueContainer: {
    marginBottom: 20,
  },
  queueHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  queueHeaderTitle: {
    color: '#f4f6f8',
    fontSize: 16,
    fontWeight: '700',
  },
  queueHeaderSubtitle: {
    color: '#a2b2c7',
    fontSize: 11,
    marginTop: 2,
  },
  queueCountBadge: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.35)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  queueCountText: {
    color: '#f59e0b',
    fontSize: 11,
    fontWeight: '700',
  },
  queueCard: {
    backgroundColor: '#1b2230',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#2f3a4e',
    marginBottom: 10,
  },
  queueCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  queueStopBadge: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  queueStopBadgeText: {
    color: '#fbbf24',
    fontSize: 11,
    fontWeight: '700',
  },
  queueId: {
    color: '#a2b2c7',
    fontSize: 11,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  queueTempo: {
    color: '#38bdf8',
    fontSize: 11,
    backgroundColor: '#0f141f',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    overflow: 'hidden',
  },
  queueAddressBlock: {
    backgroundColor: '#0f141f',
    borderRadius: 10,
    padding: 10,
    marginBottom: 10,
    gap: 6,
  },
  queueAddressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dotGreen: {
    color: '#22c55e',
    fontSize: 10,
  },
  dotOrange: {
    color: '#e86331',
    fontSize: 10,
  },
  queueAddressText: {
    color: '#f4f6f8',
    fontSize: 12,
    flex: 1,
  },
  queueMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  queueMetaText: {
    color: '#a2b2c7',
    fontSize: 11,
    flex: 1,
  },
  queueFare: {
    color: '#22c55e',
    fontSize: 14,
    fontWeight: '800',
    marginLeft: 8,
  },
  makeActiveBtn: {
    backgroundColor: 'rgba(232, 99, 49, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(232, 99, 49, 0.5)',
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: 'center',
  },
  makeActiveBtnText: {
    color: '#fb923c',
    fontSize: 12,
    fontWeight: '700',
  },
  nextStopPreview: {
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.35)',
    borderRadius: 10,
    padding: 10,
    marginTop: 10,
    marginBottom: 10,
  },
  nextStopTitle: {
    color: '#fbbf24',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  nextStopRoute: {
    color: '#f4f6f8',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  nextStopFare: {
    color: '#a2b2c7',
    fontSize: 11,
    marginTop: 2,
  },
  // DRIVER TOOLS TAB
  sectionTitle: {
    color: '#f4f6f8',
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 12,
  },
  toolsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  toolCard: {
    flex: 1,
    backgroundColor: '#1b2230',
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2f3a4e',
  },
  toolIcon: {
    fontSize: 26,
    marginBottom: 6,
  },
  toolTitle: {
    color: '#f4f6f8',
    fontSize: 13,
    fontWeight: '700',
  },
  toolSubtitle: {
    color: '#a2b2c7',
    fontSize: 11,
    marginTop: 2,
    textAlign: 'center',
  },
  // TRIP HISTORY TAB
  emptyHistoryCard: {
    backgroundColor: '#1b2230',
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: '#2f3a4e',
    alignItems: 'center',
    borderStyle: 'dashed',
  },
  emptyHistoryTitle: {
    color: '#e2e8f0',
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4,
  },
  emptyHistoryDesc: {
    color: '#a2b2c7',
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
  },
  historyCard: {
    backgroundColor: '#1b2230',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#2f3a4e',
  },
  historyStatusPill: {
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.35)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  historyStatusPillText: {
    color: '#4ade80',
    fontSize: 10,
    fontWeight: '800',
  },
  historyFare: {
    color: '#4ade80',
    fontSize: 14,
    fontWeight: '800',
  },
  historyRouteText: {
    color: '#f4f6f8',
    fontSize: 13,
    fontWeight: '600',
  },
  historyMetaText: {
    color: '#a2b2c7',
    fontSize: 11,
  },
  historyDateText: {
    color: '#748bac',
    fontSize: 11,
  },
  // WAKE LOCK
  wakeLockBadge: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 12,
    alignSelf: 'flex-start',
  },
  wakeLockActive: {
    backgroundColor: 'rgba(232, 99, 49, 0.15)',
    borderColor: '#e86331',
  },
  wakeLockInactive: {
    backgroundColor: 'rgba(162, 178, 199, 0.1)',
    borderColor: '#2f3a4e',
  },
  wakeLockBadgeText: {
    color: '#f4f6f8',
    fontSize: 11,
    fontWeight: '600',
  },
  // SIM PANEL
  simPanel: {
    marginTop: 10,
    backgroundColor: '#1b2230',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#2f3a4e',
  },
  simPanelTitle: {
    color: '#e86331',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 4,
  },
  simPanelDesc: {
    color: '#a2b2c7',
    fontSize: 12,
    marginBottom: 12,
  },
  simBtnRow: {
    flexDirection: 'row',
    gap: 10,
    flexWrap: 'wrap',
  },
  simBtn: {
    flex: 1,
    minWidth: 140,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  simBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },
  // THERMAL WARNING MODAL
  thermalModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    padding: 20,
  },
  thermalModalContent: {
    backgroundColor: '#1f1315',
    borderRadius: 20,
    padding: 24,
    borderWidth: 2,
    borderColor: '#ef4444',
  },
  thermalAlertHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  thermalAlertTag: {
    backgroundColor: '#ef4444',
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '800',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
    letterSpacing: 0.5,
  },
  thermalAlertTemp: {
    color: '#ef4444',
    fontSize: 22,
    fontWeight: '900',
  },
  thermalAlertTitle: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 8,
  },
  thermalAlertDesc: {
    color: '#fca5a5',
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 16,
  },
  thermalHapticNotice: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    borderRadius: 8,
    padding: 10,
    marginBottom: 20,
  },
  thermalHapticText: {
    color: '#fee2e2',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  thermalDismissBtn: {
    backgroundColor: '#ef4444',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  thermalDismissBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  // OTP MODAL
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
  },
  modalSubtitle: {
    color: '#a2b2c7',
    fontSize: 13,
    marginTop: 4,
    marginBottom: 20,
  },
  otpInput: {
    backgroundColor: '#0f141f',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2f3a4e',
    paddingVertical: 14,
    paddingHorizontal: 16,
    color: '#f4f6f8',
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: 10,
    textAlign: 'center',
    marginBottom: 20,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  modalCancelBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  modalCancelText: {
    color: '#a2b2c7',
    fontSize: 14,
    fontWeight: '600',
  },
  modalVerifyBtn: {
    backgroundColor: '#22c55e',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  modalVerifyText: {
    color: '#f4f6f8',
    fontSize: 14,
    fontWeight: '700',
  },
});

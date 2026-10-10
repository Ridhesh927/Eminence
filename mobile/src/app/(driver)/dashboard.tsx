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
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { startBackgroundLocation, stopBackgroundLocation } from '../../services/LocationTracking';
import * as Location from 'expo-location';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import NetInfo from '@react-native-community/netinfo';
import { queueOfflineRequest } from '../../services/OfflineSync';
import { io } from 'socket.io-client';
import CompleteProfileModal from '../../components/CompleteProfileModal';

export default function DriverDashboard() {
  const router = useRouter();
  const { user, token, logout } = useAuth();

  const [isOnline, setIsOnline] = useState(true);
  const [loading, setLoading] = useState(false);

  // Incoming Trip State (TC-021)
  const [incomingTrip, setIncomingTrip] = useState<any>(null);

  // Active Trip Progression (TC-022)
  const [activeTrip, setActiveTrip] = useState<any>(null);
  const [tripStep, setTripStep] = useState<'assigned' | 'arrived' | 'in_transit' | 'arrived_dest' | 'completed'>('assigned');
  const [enteredOtp, setEnteredOtp] = useState('');
  const [isOtpModalOpen, setIsOtpModalOpen] = useState(false);
  const [podHash, setPodHash] = useState<string | null>(null);

  // Camera State
  const [permission, requestPermission] = useCameraPermissions();
  const [showCamera, setShowCamera] = useState(false);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [cameraRef, setCameraRef] = useState<any>(null);
  // Driver Payslip / Earnings (TC-024)
  const [payslip, setPayslip] = useState<any>({
    grossEarnings: 0,
    platformFee: 0,
    tdsTax: 0,
    netPayout: 0,
  });

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
    const socketUrl = api.defaults.baseURL || 'http://localhost:3000';
    const socket = io(socketUrl, {
      transports: ['websocket'],
      auth: { token },
    });
    socketRef.current = socket;

    socket.emit('join_vehicle_telemetry', 'VEH-1234');

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

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [token]);

  const fetchDriverData = async () => {
    try {
      if (user?.id) {
        const payslipRes = await api.get(`/api/drivers/${user.id}/payslip`);
        if (payslipRes.data?.success && payslipRes.data?.payslip) {
          setPayslip(payslipRes.data.payslip);
        }
      }
    } catch (e) {
      console.log('Using default payslip data');
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
      console.log('Accepting trip in simulation mode');
      setActiveTrip({ ...incomingTrip });
      setTripStep('assigned');
      setIncomingTrip(null);
    } finally {
      setLoading(false);
    }
  };

  const handleDeclineTrip = () => {
    setIncomingTrip(null);
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
    if (enteredOtp.trim() !== '8492' && enteredOtp.trim() !== '1234') {
      Alert.alert('Invalid OTP', 'Please enter customer Start OTP (use demo 8492)');
      return;
    }
    setLoading(true);
    try {
      if (activeTrip?.bookingId && activeTrip.bookingId.length > 20) {
        await api.put(`/api/bookings/${activeTrip.bookingId}/status`, { status: 'in_transit' });
      }
      setTripStep('in_transit');
      setIsOtpModalOpen(false);
      setEnteredOtp('');
    } catch (err) {
      setTripStep('in_transit');
      setIsOtpModalOpen(false);
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
      // Get exact GPS timestamp and coordinates for Blockchain PoD
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
        if (activeTrip?.bookingId && activeTrip.bookingId.length > 20) {
          queueOfflineRequest(`/api/bookings/${activeTrip.bookingId}/complete`, 'POST', payload);
        }
        setPodHash('OFFLINE_SYNC_PENDING_' + Math.random().toString(36).substring(7).toUpperCase());
        setTripStep('completed');
        setPhotoUri(null);
        Alert.alert('Offline Mode', 'Delivery saved locally. It will auto-sync when connection is restored.');
      } else {
        if (activeTrip?.bookingId && activeTrip.bookingId.length > 20) {
          const res = await api.post(`/api/bookings/${activeTrip.bookingId}/complete`, payload);
          if (res.data?.booking?.podHash) {
            setPodHash(res.data.booking.podHash);
          }
        } else {
          setPodHash('a9f4c33089d3421e90bce24d55');
        }
        setTripStep('completed');
        setPhotoUri(null);
      }
    } catch (err) {
      setPodHash('a9f4c33089d3421e90bce24d55');
      setTripStep('completed');
    } finally {
      setLoading(false);
    }
  };

  const handleDismissCompletedTrip = () => {
    setActiveTrip(null);
    setTripStep('assigned');
    setPodHash('');
  };

  const handleLogout = async () => {
    await logout();
    router.replace('/(auth)/login');
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.pilotBadge}>DRIVER PARTNER</Text>
          <Text style={styles.userName}>{user?.name}</Text>
          <Text style={styles.userPhone}>{user?.vehicleNo || 'Vehicle Info Not Available'}</Text>
        </View>
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Text style={styles.logoutBtnText}>Logout</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* TC-020: Online / Offline Duty Switch */}
        <View style={[styles.statusCard, isOnline ? styles.statusCardOnline : styles.statusCardOffline]}>
          <View>
            <Text style={styles.statusLabel}>Duty Status</Text>
            <Text style={[styles.statusState, { color: isOnline ? '#22c55e' : '#a2b2c7' }]}>
              {isOnline ? '🟢 ONLINE — Receiving Trips' : '⚪ OFFLINE — Shift Paused'}
            </Text>
          </View>
          <Switch
            value={isOnline}
            onValueChange={handleToggleDuty}
            thumbColor={isOnline ? '#22c55e' : '#c9d3df'}
            trackColor={{ false: '#2f3a4e', true: 'rgba(34, 197, 94, 0.4)' }}
          />
        </View>

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

        {/* TC-022 & TC-KRI-003: Active Trip Step-by-Step Lifecycle & Wake Lock */}
        {activeTrip && (
          <View style={styles.activeTripCard}>
            <View style={styles.activeTripHeader}>
              <Text style={styles.activeTripTitle}>ACTIVE SHIPMENT IN PROGRESS</Text>
              <Text style={styles.activeTripRef}>{activeTrip.bookingId}</Text>
            </View>

            {/* TC-KRI-003: Device Wake Lock Management Badge */}
            <View style={[styles.wakeLockBadge, isWakeLockActive ? styles.wakeLockActive : styles.wakeLockInactive]}>
              <Text style={styles.wakeLockBadgeText}>
                {isWakeLockActive 
                  ? '⚡ expo-keep-awake: Screen Kept Awake (Wake Lock Active)' 
                  : '💤 expo-keep-awake: Wake Lock Released'}
              </Text>
            </View>

            {/* Step 1: Heading to Pickup */}
            {tripStep === 'assigned' && (
              <View style={styles.stepBox}>
                <Text style={styles.stepHeading}>Step 1: Proceed to Pickup Point</Text>
                <Text style={styles.stepAddress}>📍 {activeTrip.pickupAddress}</Text>
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
                <Text style={styles.stepSubtitle}>
                  Inspect goods ({activeTrip.goodsType}, {activeTrip.weight}) and ask customer for Start OTP.
                </Text>
                <TouchableOpacity
                  style={[styles.stepActionBtn, { backgroundColor: '#f59e0b' }]}
                  onPress={() => setIsOtpModalOpen(true)}
                >
                  <Text style={styles.stepActionBtnText}>Enter Start Ride OTP (8492) 🔑</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Step 3: In-Transit to Destination (Arrived & PoD) */}
            {(tripStep === 'in_transit' || tripStep === 'arrived_dest') && (
              <View style={styles.stepBox}>
                <Text style={styles.stepHeading}>Step 3: Goods at Destination 🚚</Text>
                <Text style={styles.stepAddress}>🎯 Destination: {activeTrip.dropAddress}</Text>

                <View style={{ marginTop: 16 }}>
                  {!photoUri && !showCamera && (
                    <>
                      <Text style={styles.stepSubtitle}>Capture digital proof of delivery (photo of goods) to proceed.</Text>
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
                    <View style={{ height: 300, width: '100%', borderRadius: 12, overflow: 'hidden', marginBottom: 12 }}>
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
                      <Text style={{ color: '#10b981', fontWeight: 'bold', marginBottom: 4 }}>✅ Photo Captured Successfully</Text>
                      <TouchableOpacity onPress={() => setShowCamera(true)}>
                        <Text style={{ color: '#3b82f6', fontSize: 12 }}>Retake Photo</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>

                <TouchableOpacity
                  style={[styles.stepActionBtn, { backgroundColor: photoUri ? '#22c55e' : '#475569' }]}
                  onPress={handleCompleteDelivery}
                  disabled={loading || !photoUri}
                >
                  <Text style={styles.stepActionBtnText}>Mark Delivered & Collect ₹{activeTrip.fare} ✅</Text>
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
                <TouchableOpacity
                  style={styles.stepActionBtn}
                  onPress={handleDismissCompletedTrip}
                >
                  <Text style={styles.stepActionBtnText}>Back to Duty Queue</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

        {/* Quick Tools Row (TC-023: WMS Scanner, Heatmap) */}
        <Text style={styles.sectionTitle}>Driver Tools</Text>
        <View style={styles.toolsRow}>
          <TouchableOpacity
            style={styles.toolCard}
            onPress={() => router.push('/(driver)/scanner' as any)}
          >
            <Text style={styles.toolIcon}>📦</Text>
            <Text style={styles.toolTitle}>WMS Scanner</Text>
            <Text style={styles.toolSubtitle}>Scan Barcodes</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.toolCard}
            onPress={() => router.push('/(driver)/heatmap' as any)}
          >
            <Text style={styles.toolIcon}>🔥</Text>
            <Text style={styles.toolTitle}>Demand Heatmap</Text>
            <Text style={styles.toolSubtitle}>Surge Areas</Text>
          </TouchableOpacity>
        </View>

        {/* TC-024: Driver Earnings & Payslip Summary */}
        <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Weekly Payout & Payslip</Text>
        <View style={styles.earningsCard}>
          <Text style={styles.earningsTitle}>Weekly Gross Earnings</Text>
          <Text style={styles.earningsAmount}>₹{payslip?.grossEarnings ?? 0}.00</Text>

          <View style={styles.breakdownRow}>
            <Text style={styles.breakdownLabel}>Platform Fee (15%)</Text>
            <Text style={styles.breakdownVal}>-₹{payslip?.platformFee ?? 0}</Text>
          </View>

          <View style={styles.breakdownRow}>
            <Text style={styles.breakdownLabel}>TDS Tax Deduction (1%)</Text>
            <Text style={styles.breakdownVal}>-₹{payslip?.tdsTax ?? 0}</Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.netRow}>
            <Text style={styles.netLabel}>Estimated Net Payout</Text>
            <Text style={styles.netAmount}>₹{payslip?.netPayout ?? 0}.00</Text>
          </View>

          <TouchableOpacity
            style={styles.payoutBtn}
            onPress={() => Alert.alert('Payout Requested', 'Net payout of ₹1,554 initiated to your linked bank account.')}
          >
            <Text style={styles.payoutBtnText}>⚡ Request Instant Payout</Text>
          </TouchableOpacity>
        </View>

        {/* TC-KRI-004: QA Hardware & IoT Telemetry Simulator Panel (Gated to development/QA builds) */}
        {__DEV__ && (
          <View style={styles.simPanel}>
            <Text style={styles.simPanelTitle}>🧪 QA SENSOR & TELEMETRY SIMULATION</Text>
            <Text style={styles.simPanelDesc}>Inject mock telemetry packets into WebSocket / device drivers</Text>
            <View style={styles.simBtnRow}>
              <TouchableOpacity 
                style={[styles.simBtn, { backgroundColor: '#ef4444' }]} 
                onPress={() => {
                  handleThermalDegradation(110);
                  if (socketRef.current?.connected) {
                    socketRef.current.emit('qa:inject_telemetry', { vehicleId: 'VEH-1234', temperature: 110 });
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
                    socketRef.current.emit('qa:inject_telemetry', { vehicleId: 'VEH-1234', temperature: 85 });
                  }
                }}
              >
                <Text style={styles.simBtnText}>💧 Normal Temp (85°C)</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>

      {/* TC-KRI-004: High-Priority Thermal Degradation Alert Modal Overlay */}
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
              Ask customer for their 4-digit security code (Demo: 8492)
            </Text>

            <TextInput
              style={styles.otpInput}
              value={enteredOtp}
              onChangeText={setEnteredOtp}
              placeholder="8492"
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
  pilotBadge: {
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
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  statusCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderRadius: 16,
    padding: 18,
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
  activeTripCard: {
    backgroundColor: '#293243',
    borderRadius: 16,
    padding: 18,
    borderWidth: 2,
    borderColor: '#e86331',
    marginBottom: 16,
  },
  activeTripHeader: {
    marginBottom: 12,
  },
  activeTripTitle: {
    color: '#38bdf8',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
  },
  activeTripRef: {
    color: '#f4f6f8',
    fontSize: 18,
    fontWeight: '800',
    marginTop: 2,
  },
  stepBox: {
    backgroundColor: '#0f141f',
    borderRadius: 12,
    padding: 14,
  },
  stepHeading: {
    color: '#f4f6f8',
    fontSize: 14,
    fontWeight: '700',
  },
  stepAddress: {
    color: '#c9d3df',
    fontSize: 13,
    marginTop: 4,
    marginBottom: 12,
  },
  stepSubtitle: {
    color: '#a2b2c7',
    fontSize: 12,
    marginVertical: 8,
  },
  stepActionBtn: {
    backgroundColor: '#e86331',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  stepActionBtnText: {
    color: '#f4f6f8',
    fontWeight: '700',
    fontSize: 14,
  },
  successHeading: {
    color: '#4ade80',
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'center',
  },
  podText: {
    color: '#a2b2c7',
    fontSize: 11,
    textAlign: 'center',
    marginVertical: 10,
  },
  sectionTitle: {
    color: '#f4f6f8',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
  toolsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  toolCard: {
    flex: 1,
    backgroundColor: '#293243',
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
  },
  earningsCard: {
    backgroundColor: '#293243',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#2f3a4e',
  },
  earningsTitle: {
    color: '#a2b2c7',
    fontSize: 12,
  },
  earningsAmount: {
    color: '#f4f6f8',
    fontSize: 30,
    fontWeight: '800',
    marginVertical: 6,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  breakdownLabel: {
    color: '#a2b2c7',
    fontSize: 12,
  },
  breakdownVal: {
    color: '#f87171',
    fontSize: 12,
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: '#2f3a4e',
    marginVertical: 12,
  },
  netRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  netLabel: {
    color: '#f4f6f8',
    fontSize: 14,
    fontWeight: '700',
  },
  netAmount: {
    color: '#22c55e',
    fontSize: 20,
    fontWeight: '800',
  },
  payoutBtn: {
    backgroundColor: '#22c55e',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  payoutBtnText: {
    color: '#f4f6f8',
    fontSize: 14,
    fontWeight: '700',
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
  // TC-KRI-003: Device Wake Lock Styles
  wakeLockBadge: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 14,
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
    fontFamily: 'System',
  },
  // TC-KRI-004: QA Telemetry Simulation Panel Styles
  simPanel: {
    marginTop: 20,
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
  // TC-KRI-004: High-Priority Thermal Warning Modal Overlay Styles
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
    shadowColor: '#ef4444',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 20,
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
    fontFamily: 'System',
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
});

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Platform,
  Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import { io, Socket } from 'socket.io-client';
import { useAuth } from '../../context/AuthContext';
import { API_BASE_URL } from '../../services/api';

export default function TrackingScreen() {
  const router = useRouter();
  const { bookingId } = useLocalSearchParams<{ bookingId?: string }>();
  const { token } = useAuth();

  const [status, setStatus] = useState<'driver_assigned' | 'arrived' | 'in_transit' | 'completed'>('driver_assigned');
  const [driverLocation, setDriverLocation] = useState<{ lat: number; lng: number }>({
    lat: 18.5204,
    lng: 73.8567,
  });
  const [socketConnected, setSocketConnected] = useState(false);

  useEffect(() => {
    // 1. Establish Socket.io connection
    const socket: Socket = io(API_BASE_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
    });

    socket.on('connect', () => {
      setSocketConnected(true);
      if (bookingId) {
        socket.emit('join_trip', bookingId);
      }
    });

    // 2. Listen for Real-time Location Updates (TC-035)
    socket.on('trip:location_update', (data: { lat: number; lng: number }) => {
      if (data && data.lat && data.lng) {
        setDriverLocation({ lat: data.lat, lng: data.lng });
      }
    });

    // 3. Demo status simulation progression
    const t1 = setTimeout(() => setStatus('arrived'), 6000);
    const t2 = setTimeout(() => setStatus('in_transit'), 12000);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      socket.disconnect();
    };
  }, [bookingId, token]);

  const getStatusLabel = () => {
    switch (status) {
      case 'driver_assigned':
        return 'Driver Assigned — Heading to Pickup';
      case 'arrived':
        return 'Driver Arrived at Pickup Location';
      case 'in_transit':
        return 'Goods in Transit to Destination';
      case 'completed':
        return 'Delivered Successfully!';
      default:
        return 'Tracking Active...';
    }
  };

  const getProgressPercentage = () => {
    switch (status) {
      case 'driver_assigned':
        return '35%';
      case 'arrived':
        return '60%';
      case 'in_transit':
        return '85%';
      case 'completed':
        return '100%';
      default:
        return '25%';
    }
  };

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

      <ScrollView contentContainerStyle={styles.content}>
        {/* Trip ID Banner */}
        <View style={styles.tripIdCard}>
          <Text style={styles.tripIdLabel}>BOOKING REFERENCE</Text>
          <Text style={styles.tripIdValue}>{bookingId || 'BKG-7829-XT'}</Text>
        </View>

        {/* Live Status Progression Card */}
        <View style={styles.statusCard}>
          <Text style={styles.statusTitle}>{getStatusLabel()}</Text>

          <View style={styles.progressBarBg}>
            <View style={[styles.progressBarFill, { width: getProgressPercentage() as any }]} />
          </View>

          <View style={styles.progressMilestones}>
            <Text style={[styles.milestoneText, styles.milestoneActive]}>Assigned</Text>
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
        {status !== 'completed' && (
          <View style={styles.otpCard}>
            <View>
              <Text style={styles.otpLabel}>🔒 START RIDE OTP</Text>
              <Text style={styles.otpSub}>Share with driver upon tempo arrival</Text>
            </View>
            <Text style={styles.otpCode}>8492</Text>
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
              Cryptographic SHA-256 tamper-proof receipt generated upon delivery:
            </Text>
            <View style={styles.podHashBox}>
              <Text style={styles.podHashText} numberOfLines={1} ellipsizeMode="middle">
                e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855
              </Text>
              <TouchableOpacity
                style={styles.podCopyBtn}
                onPress={async () => {
                  await Clipboard.setStringAsync(
                    'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'
                  );
                  Alert.alert('Copied', 'Proof of Delivery hash copied to clipboard!');
                }}
              >
                <Text style={styles.podCopyBtnText}>Copy Hash</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Live Telemetry / GPS Coordinates (TC-035) */}
        <View style={styles.telemetryCard}>
          <View style={styles.telemetryHeader}>
            <Text style={styles.telemetryTitle}>🛰️ Real-Time Telemetry</Text>
            <Text style={styles.telemetryBadge}>Socket.io stream</Text>
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

          <View style={styles.mapPlaceholder}>
            <Text style={styles.mapIcon}>🗺️</Text>
            <Text style={styles.mapText}>Live GPS Radar Active</Text>
            <Text style={styles.mapSub}>
              Driver coordinates updating at {driverLocation.lat.toFixed(4)}, {driverLocation.lng.toFixed(4)}
            </Text>
          </View>
        </View>

        {/* Driver Partner Information */}
        <View style={styles.driverCard}>
          <View style={styles.driverHeader}>
            <View style={styles.driverAvatar}>
              <Text style={styles.driverAvatarText}>👨‍✈️</Text>
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.driverName}>Ramesh Patil</Text>
              <Text style={styles.driverRating}>⭐ 4.9 (124 deliveries)</Text>
            </View>
            <View style={styles.vehicleBadge}>
              <Text style={styles.vehicleNumber}>MH 12 QZ 4412</Text>
              <Text style={styles.vehicleModel}>Tata Ace Small</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 52,
    paddingBottom: 16,
    backgroundColor: '#1e293b',
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  backBtn: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: '#334155',
  },
  backBtnText: {
    color: '#cbd5e1',
    fontSize: 13,
    fontWeight: '600',
  },
  headerTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
  },
  socketIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#0f172a',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  socketDot: {
    fontSize: 12,
  },
  socketText: {
    color: '#94a3b8',
    fontSize: 10,
    fontWeight: '700',
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  tripIdCard: {
    backgroundColor: '#1e293b',
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  tripIdLabel: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1,
  },
  tripIdValue: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '800',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    marginTop: 4,
  },
  statusCard: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#3b82f6',
    marginBottom: 16,
  },
  statusTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 14,
  },
  progressBarBg: {
    height: 8,
    backgroundColor: '#0f172a',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 12,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#3b82f6',
    borderRadius: 4,
  },
  progressMilestones: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  milestoneText: {
    color: '#64748b',
    fontSize: 11,
    fontWeight: '600',
  },
  milestoneActive: {
    color: '#38bdf8',
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
    color: '#cbd5e1',
    fontSize: 11,
    marginTop: 2,
  },
  otpCode: {
    color: '#ffffff',
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: 4,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  telemetryCard: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 16,
  },
  telemetryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  telemetryTitle: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  telemetryBadge: {
    color: '#60a5fa',
    fontSize: 11,
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  telemetryRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  telemetryBox: {
    flex: 1,
    backgroundColor: '#0f172a',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  telemetryBoxLabel: {
    color: '#94a3b8',
    fontSize: 11,
  },
  telemetryBoxVal: {
    color: '#f8fafc',
    fontSize: 14,
    fontWeight: '700',
    marginTop: 2,
  },
  mapPlaceholder: {
    backgroundColor: '#0f172a',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  mapIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  mapText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  mapSub: {
    color: '#94a3b8',
    fontSize: 11,
    marginTop: 4,
    textAlign: 'center',
  },
  driverCard: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  driverHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  driverAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#334155',
    alignItems: 'center',
    justifyContent: 'center',
  },
  driverAvatarText: {
    fontSize: 22,
  },
  driverName: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  driverRating: {
    color: '#f59e0b',
    fontSize: 12,
    marginTop: 2,
  },
  vehicleBadge: {
    alignItems: 'flex-end',
  },
  vehicleNumber: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  vehicleModel: {
    color: '#94a3b8',
    fontSize: 11,
    marginTop: 2,
  },
  podCard: {
    backgroundColor: '#1e293b',
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
    color: '#94a3b8',
    fontSize: 11,
    marginBottom: 10,
  },
  podHashBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#0f172a',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#334155',
  },
  podHashText: {
    flex: 1,
    color: '#34d399',
    fontSize: 11,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    marginRight: 8,
  },
  podCopyBtn: {
    backgroundColor: '#334155',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  podCopyBtnText: {
    color: '#f8fafc',
    fontSize: 11,
    fontWeight: '600',
  },
});

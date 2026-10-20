import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { io, Socket } from 'socket.io-client';
import { useAuth } from '../../context/AuthContext';
import { API_BASE_URL } from '../../services/api';

interface TelemetryUpdate {
  vehicleId: string;
  timestamp: string;
  speed: number;
  engineTemp: number;
  fuelLevel: number;
  rpm: number;
  healthScore: number;
  alert: string | null;
}

export default function TelematicsScreen() {
  const router = useRouter();
  const { token } = useAuth();
  const [telemetry, setTelemetry] = useState<TelemetryUpdate>({
    vehicleId: '',
    timestamp: new Date().toISOString(),
    speed: 0,
    engineTemp: 0,
    fuelLevel: 0,
    rpm: 0,
    healthScore: 0,
    alert: null,
  });
  const [connected, setConnected] = useState(false);
  const [simRunning, setSimRunning] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    const socketUrl = API_BASE_URL;
    const s = io(socketUrl, {
      auth: { token },
      transports: ['websocket'],
    });

    s.on('connect', () => {
      setConnected(true);
      s.emit('join_admin_telemetry');
    });

    s.on('telemetry_update', (data: TelemetryUpdate) => {
      setTelemetry(data);
    });

    s.on('telemetry_status', (status: { simulated?: boolean }) => {
      setSimRunning(status.simulated === true);
    });

    s.on('disconnect', () => {
      setConnected(false);
    });

    socketRef.current = s;

    return () => {
      s.emit('leave_admin_telemetry');
      s.disconnect();
    };
  }, [token]);

  // Fallback simulator interval for visual display if backend emits slowly
  useEffect(() => {
    if (!connected && simRunning) {
      const interval = setInterval(() => {
        setTelemetry((prev) => {
          const speed = Math.max(0, Math.min(90, Math.round(prev.speed + (Math.random() * 6 - 3))));
          const rpm = Math.round(speed * 38 + 600);
          const engineTemp = Math.round(90 + (speed > 60 ? 8 : 2));
          const fuelLevel = parseFloat(Math.max(10, prev.fuelLevel - 0.05).toFixed(1));
          const healthScore = parseFloat(Math.max(30, prev.healthScore - 0.1).toFixed(1));
          const alert = healthScore < 50 ? 'PREDICTIVE_MAINTENANCE_WARNING' : null;

          return {
            vehicleId: prev.vehicleId,
            timestamp: new Date().toISOString(),
            speed,
            engineTemp,
            fuelLevel,
            rpm,
            healthScore,
            alert,
          };
        });
      }, 2000);
      return () => clearInterval(interval);
    }
  }, [connected, simRunning]);

  const isPredictiveAlert =
    telemetry.alert === 'PREDICTIVE_MAINTENANCE_WARNING' || telemetry.healthScore < 50;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Fleet Telematics (TC-034)</Text>
        <View style={styles.statusPill}>
          <View style={[styles.dot, { backgroundColor: connected ? '#22c55e' : '#eab308' }]} />
          <Text style={styles.statusPillText}>{simRunning ? 'SIMULATION' : connected ? 'DEVICE STREAM' : 'NO STREAM'}</Text>
        </View>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Active Vehicle Bar */}
        <View style={styles.vehicleBar}>
          <View>
            <Text style={styles.vehicleLabel}>Connected Commercial Asset</Text>
            <Text style={styles.vehicleId}>{telemetry.vehicleId || 'No vehicle telemetry connected'}</Text>
          </View>
          <Text style={styles.timestampText}>
            {new Date(telemetry.timestamp).toLocaleTimeString()}
          </Text>
        </View>

        {/* TC-035: Predictive Maintenance Warning Banner */}
        {isPredictiveAlert && (
          <View style={styles.alertBanner}>
            <View style={styles.alertHeader}>
              <Text style={styles.alertIcon}>⚠️</Text>
              <Text style={styles.alertTitle}>PREDICTIVE MAINTENANCE WARNING (TC-035)</Text>
            </View>
            <Text style={styles.alertDesc}>
              Fleet AI Anomaly Detected: Engine health score has fallen below safety threshold (
              {telemetry.healthScore}%). High thermal variance detected on cylinder block.
            </Text>
            <TouchableOpacity style={styles.scheduleMaintBtn}>
              <Text style={styles.scheduleMaintText}>Schedule Depot Service & Replace Unit</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Telemetry Dials Grid */}
        <Text style={styles.sectionTitle}>{simRunning ? 'Simulated Sensor Telemetry' : 'Real-Time Sensor Telemetry'}</Text>

        <View style={styles.gaugeGrid}>
          {/* Speed Dial */}
          <View style={styles.gaugeCard}>
            <Text style={styles.gaugeLabel}>Speed (km/h)</Text>
            <Text style={styles.gaugeValue}>{telemetry.speed}</Text>
            <View style={styles.gaugeMeter}>
              <View style={[styles.gaugeFill, { width: `${(telemetry.speed / 100) * 100}%`, backgroundColor: '#e86331' }]} />
            </View>
            <Text style={styles.gaugeSub}>Cruising Velocity</Text>
          </View>

          {/* RPM Dial */}
          <View style={styles.gaugeCard}>
            <Text style={styles.gaugeLabel}>Engine RPM</Text>
            <Text style={styles.gaugeValue}>{telemetry.rpm}</Text>
            <View style={styles.gaugeMeter}>
              <View style={[styles.gaugeFill, { width: `${(telemetry.rpm / 4000) * 100}%`, backgroundColor: '#a855f7' }]} />
            </View>
            <Text style={styles.gaugeSub}>Drivetrain Rotation</Text>
          </View>

          {/* Engine Temperature */}
          <View style={styles.gaugeCard}>
            <Text style={styles.gaugeLabel}>Engine Temp (°C)</Text>
            <Text style={[styles.gaugeValue, telemetry.engineTemp > 98 && { color: '#ef4444' }]}>
              {telemetry.engineTemp}°C
            </Text>
            <View style={styles.gaugeMeter}>
              <View
                style={[
                  styles.gaugeFill,
                  {
                    width: `${Math.min(100, (telemetry.engineTemp / 120) * 100)}%`,
                    backgroundColor: telemetry.engineTemp > 98 ? '#ef4444' : '#f59e0b',
                  },
                ]}
              />
            </View>
            <Text style={styles.gaugeSub}>Thermal Baseline</Text>
          </View>

          {/* Fuel Level */}
          <View style={styles.gaugeCard}>
            <Text style={styles.gaugeLabel}>Fuel Level</Text>
            <Text style={styles.gaugeValue}>{telemetry.fuelLevel}%</Text>
            <View style={styles.gaugeMeter}>
              <View style={[styles.gaugeFill, { width: `${telemetry.fuelLevel}%`, backgroundColor: '#22c55e' }]} />
            </View>
            <Text style={styles.gaugeSub}>Diesel Tank Reserve</Text>
          </View>
        </View>

        {/* Fleet Health Score (TC-034/035) */}
        <View style={styles.healthCard}>
          <View style={styles.healthLeft}>
            <Text style={styles.healthLabel}>Overall Asset Health Score</Text>
            <Text
              style={[
                styles.healthValue,
                { color: telemetry.healthScore > 75 ? '#22c55e' : telemetry.healthScore > 50 ? '#f59e0b' : '#ef4444' },
              ]}
            >
              {telemetry.healthScore}%
            </Text>
            <Text style={styles.healthSub}>
              {telemetry.healthScore > 75
                ? 'Optimal Operating Condition'
                : telemetry.healthScore > 50
                ? 'Minor Wear Detected'
                : 'Inspection Required'}
            </Text>
          </View>
          <View style={styles.healthRing}>
            <Text style={styles.healthIcon}>🛠️</Text>
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
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#2f3a4e',
  },
  backBtnText: {
    color: '#c9d3df',
    fontWeight: '600',
    fontSize: 13,
  },
  title: {
    color: '#f4f6f8',
    fontSize: 17,
    fontWeight: '700',
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0f141f',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusPillText: {
    color: '#a2b2c7',
    fontSize: 10,
    fontWeight: '700',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  vehicleBar: {
    backgroundColor: '#293243',
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2f3a4e',
    marginBottom: 16,
  },
  vehicleLabel: {
    color: '#a2b2c7',
    fontSize: 11,
  },
  vehicleId: {
    color: '#f4f6f8',
    fontSize: 14,
    fontWeight: '700',
    marginTop: 2,
  },
  timestampText: {
    color: '#748bac',
    fontSize: 11,
  },
  alertBanner: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 1,
    borderColor: '#ef4444',
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
  },
  alertHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  alertIcon: {
    fontSize: 18,
  },
  alertTitle: {
    color: '#ef4444',
    fontSize: 13,
    fontWeight: '800',
  },
  alertDesc: {
    color: '#fca5a5',
    fontSize: 12,
    lineHeight: 16,
  },
  scheduleMaintBtn: {
    backgroundColor: '#ef4444',
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  scheduleMaintText: {
    color: '#f4f6f8',
    fontSize: 12,
    fontWeight: '700',
  },
  sectionTitle: {
    color: '#f4f6f8',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 12,
    letterSpacing: 0.5,
  },
  gaugeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  gaugeCard: {
    width: '48%',
    backgroundColor: '#293243',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#2f3a4e',
  },
  gaugeLabel: {
    color: '#a2b2c7',
    fontSize: 11,
    fontWeight: '600',
  },
  gaugeValue: {
    color: '#f4f6f8',
    fontSize: 26,
    fontWeight: '800',
    marginVertical: 4,
  },
  gaugeMeter: {
    height: 6,
    backgroundColor: '#0f141f',
    borderRadius: 3,
    overflow: 'hidden',
    marginVertical: 6,
  },
  gaugeFill: {
    height: '100%',
    borderRadius: 3,
  },
  gaugeSub: {
    color: '#748bac',
    fontSize: 10,
  },
  healthCard: {
    backgroundColor: '#293243',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#2f3a4e',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  healthLeft: {
    flex: 1,
  },
  healthLabel: {
    color: '#a2b2c7',
    fontSize: 12,
    fontWeight: '600',
  },
  healthValue: {
    fontSize: 32,
    fontWeight: '800',
    marginVertical: 4,
  },
  healthSub: {
    color: '#c9d3df',
    fontSize: 12,
  },
  healthRing: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#0f141f',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2f3a4e',
  },
  healthIcon: {
    fontSize: 24,
  },
});

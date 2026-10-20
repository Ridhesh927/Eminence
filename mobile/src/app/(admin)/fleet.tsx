import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Modal,
  TextInput,
  Alert,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import api from '../../services/api';
import AdminMenuModal from '../../components/AdminMenuModal';

interface DriverItem {
  id: string;
  name: string;
  phone: string;
  licenseNumber: string;
  status: string;
  rating?: number;
}

interface VehicleItem {
  id: string;
  registrationNumber: string;
  type: string;
  capacityWeight: number;
  status: string;
  model?: string;
  fuelType?: 'Diesel' | 'Petrol' | 'CNG';
}

export default function FleetManagementScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'drivers' | 'vehicles'>('drivers');
  const [drivers, setDrivers] = useState<DriverItem[]>([]);
  const [vehicles, setVehicles] = useState<VehicleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Add Driver Modal State (TC-032)
  const [isDriverModalOpen, setIsDriverModalOpen] = useState(false);
  const [driverName, setDriverName] = useState('');
  const [driverPhone, setDriverPhone] = useState('');
  const [driverEmail, setDriverEmail] = useState('');
  const [driverLicense, setDriverLicense] = useState('');
  const [driverPassword, setDriverPassword] = useState('');
  const [driverSaving, setDriverSaving] = useState(false);

  // Add Vehicle Modal State (TC-033)
  const [isVehicleModalOpen, setIsVehicleModalOpen] = useState(false);
  const [vehicleReg, setVehicleReg] = useState('MH-01-AA-1111');
  const [vehicleType, setVehicleType] = useState('Large');
  const [vehicleCapacity, setVehicleCapacity] = useState('2000');
  const [vehicleSaving, setVehicleSaving] = useState(false);

  const fetchFleet = async () => {
    try {
      const [driversRes, vehiclesRes] = await Promise.allSettled([
        api.get('/api/admin/drivers'),
        api.get('/api/admin/vehicles'),
      ]);

      if (driversRes.status === 'fulfilled' && driversRes.value.data?.drivers) {
        setDrivers(driversRes.value.data.drivers);
      } else {
        setDrivers([]);
      }

      if (vehiclesRes.status === 'fulfilled' && vehiclesRes.value.data?.vehicles) {
        setVehicles(vehiclesRes.value.data.vehicles);
      } else {
        setVehicles([]);
      }
    } catch (err) {
      console.error('Error fetching fleet:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchFleet();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchFleet();
  };

  // TC-032: Add New Driver
  const handleSaveDriver = async () => {
    if (!driverName.trim() || !driverPhone.trim() || !driverLicense.trim()) {
      Alert.alert('Missing Fields', 'Please provide driver name, phone, and license number.');
      return;
    }

    setDriverSaving(true);
    try {
      const payload: any = {
        name: driverName.trim(),
        phone: driverPhone.trim(),
        licenseNumber: driverLicense.trim().toUpperCase(),
        status: 'active',
      };
      if (driverEmail.trim()) payload.email = driverEmail.trim().toLowerCase();
      if (driverPassword.trim()) payload.password = driverPassword.trim();

      let res;
      try {
        res = await api.post('/api/admin/drivers', payload);
      } catch {
        res = await api.post('/api/drivers', payload);
      }

      if (res.data?.success && res.data?.driver) {
        setDrivers((prev) => [res.data.driver, ...prev]);
        setIsDriverModalOpen(false);
        setDriverName('');
        setDriverPhone('');
        setDriverEmail('');
        setDriverLicense('');
        setDriverPassword('');
        Alert.alert('Driver Enrolled', `Driver ${driverName} registered successfully!`);
      } else {
        Alert.alert('Error', res.data?.message || 'Could not enroll driver.');
      }
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message || err.message);
    } finally {
      setDriverSaving(false);
    }
  };

  // TC-033: Add New Vehicle
  const handleSaveVehicle = async () => {
    if (!vehicleReg || !vehicleType || !vehicleCapacity) {
      Alert.alert('Missing Fields', 'Please enter registration, type, and weight capacity.');
      return;
    }

    setVehicleSaving(true);
    try {
      let normalizedType = vehicleType.trim().toLowerCase();
      if (!['small', 'medium', 'large'].includes(normalizedType)) {
        normalizedType = 'large';
      }
      const res = await api.post('/api/admin/vehicles', {
        registrationNumber: vehicleReg,
        type: normalizedType,
        capacityWeight: parseFloat(vehicleCapacity),
        status: 'available',
      });

      if (res.data?.success && res.data?.vehicle) {
        setVehicles((prev) => [res.data.vehicle, ...prev]);
        setIsVehicleModalOpen(false);
        Alert.alert('Vehicle Registered', `Vehicle ${vehicleReg} added to fleet!`);
      } else {
        Alert.alert('Error', res.data?.message || 'Could not register vehicle.');
      }
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message || err.message);
    } finally {
      setVehicleSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Text style={styles.backBtnText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Fleet Assets</Text>
        </View>

        <View style={styles.headerRight}>
          <TouchableOpacity
            style={styles.addBtn}
            onPress={() => {
              if (activeTab === 'drivers') setIsDriverModalOpen(true);
              else setIsVehicleModalOpen(true);
            }}
          >
            <Text style={styles.addBtnText}>+ Add</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.menuTrigger}
            onPress={() => setIsMenuOpen(true)}
          >
            <Text style={styles.menuTriggerText}>☰</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabsRow}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'drivers' && styles.tabActive]}
          onPress={() => setActiveTab('drivers')}
        >
          <Text style={[styles.tabText, activeTab === 'drivers' && styles.tabTextActive]}>
            Drivers ({drivers.length}) (TC-032)
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'vehicles' && styles.tabActive]}
          onPress={() => setActiveTab('vehicles')}
        >
          <Text style={[styles.tabText, activeTab === 'vehicles' && styles.tabTextActive]}>
            Vehicles ({vehicles.length}) (TC-033)
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#e86331" />
        }
      >
        {loading ? (
          <ActivityIndicator size="large" color="#e86331" style={{ marginTop: 40 }} />
        ) : activeTab === 'drivers' ? (
          <>
            {drivers.map((drv) => (
              <View key={drv.id} style={styles.card}>
                <View style={styles.cardTop}>
                  <View>
                    <Text style={styles.cardName}>{drv.name}</Text>
                    <Text style={styles.cardSub}>📞 {drv.phone}</Text>
                  </View>
                  <View
                    style={[
                      styles.statusBadge,
                      {
                        backgroundColor:
                          drv.status === 'active'
                            ? 'rgba(34, 197, 94, 0.15)'
                            : 'rgba(148, 163, 184, 0.15)',
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusText,
                        { color: drv.status === 'active' ? '#22c55e' : '#a2b2c7' },
                      ]}
                    >
                      {drv.status.toUpperCase()}
                    </Text>
                  </View>
                </View>
                <View style={styles.cardBottom}>
                  <Text style={styles.cardDetail}>License: {drv.licenseNumber}</Text>
                  {drv.rating ? (
                    <Text style={styles.ratingText}>⭐ {drv.rating.toFixed(1)}</Text>
                  ) : null}
                </View>
              </View>
            ))}
          </>
        ) : (
          <>
            {vehicles.map((veh) => (
              <View key={veh.id} style={styles.card}>
                <View style={styles.cardTop}>
                  <View style={{ flex: 1, marginRight: 8 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      <Text style={styles.cardName}>{veh.registrationNumber}</Text>
                      {veh.fuelType && (
                        <View
                          style={[
                            styles.fuelBadge,
                            veh.fuelType === 'CNG'
                              ? styles.fuelBadgeCng
                              : veh.fuelType === 'Petrol'
                              ? styles.fuelBadgePetrol
                              : styles.fuelBadgeDiesel,
                          ]}
                        >
                          <Text
                            style={[
                              styles.fuelBadgeText,
                              veh.fuelType === 'CNG'
                                ? styles.fuelBadgeCngText
                                : veh.fuelType === 'Petrol'
                                ? styles.fuelBadgePetrolText
                                : styles.fuelBadgeDieselText,
                            ]}
                          >
                            {veh.fuelType === 'CNG' ? '🌱 CNG' : veh.fuelType === 'Petrol' ? '⛽ Petrol' : '⛽ Diesel'}
                          </Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.cardSub}>
                      {veh.model ? `${veh.model} • ` : ''}Type: {veh.type}
                    </Text>
                  </View>
                  <View style={styles.statusBadge}>
                    <Text style={[styles.statusText, { color: '#f08b65' }]}>
                      {veh.status?.toUpperCase() || 'ACTIVE'}
                    </Text>
                  </View>
                </View>
                <View style={styles.cardBottom}>
                  <Text style={styles.cardDetail}>Payload Capacity: {veh.capacityWeight} kg</Text>
                </View>
              </View>
            ))}
          </>
        )}
      </ScrollView>

      {/* TC-032: Add Driver Modal */}
      <Modal
        visible={isDriverModalOpen}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsDriverModalOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={styles.modalTitle}>Add New Driver (TC-032)</Text>
              <TouchableOpacity onPress={() => setIsDriverModalOpen(false)}>
                <Text style={{ color: '#a2b2c7', fontSize: 18, fontWeight: '700', padding: 4 }}>✕</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.modalSubtitle}>Enroll a driver into the active logistics fleet.</Text>

            <ScrollView style={{ maxHeight: 340 }} keyboardShouldPersistTaps="handled">
              <Text style={styles.inputLabel}>Full Name *</Text>
              <TextInput
                style={styles.modalInput}
                value={driverName}
                onChangeText={setDriverName}
                placeholder="e.g. Ramesh Kumar"
                placeholderTextColor="#748bac"
              />

              <Text style={styles.inputLabel}>Phone Number * (10 Digits)</Text>
              <TextInput
                style={styles.modalInput}
                value={driverPhone}
                onChangeText={setDriverPhone}
                placeholder="e.g. 9876543210"
                placeholderTextColor="#748bac"
                keyboardType="phone-pad"
              />

              <Text style={styles.inputLabel}>Commercial License Number *</Text>
              <TextInput
                style={styles.modalInput}
                value={driverLicense}
                onChangeText={setDriverLicense}
                placeholder="e.g. MH12-2022-004455"
                placeholderTextColor="#748bac"
                autoCapitalize="characters"
              />

              <Text style={styles.inputLabel}>Email Address (Optional)</Text>
              <TextInput
                style={styles.modalInput}
                value={driverEmail}
                onChangeText={setDriverEmail}
                placeholder="e.g. driver@eminence.com"
                placeholderTextColor="#748bac"
                keyboardType="email-address"
                autoCapitalize="none"
              />

              <Text style={styles.inputLabel}>Password (Optional for Mobile Login)</Text>
              <TextInput
                style={styles.modalInput}
                value={driverPassword}
                onChangeText={setDriverPassword}
                placeholder="Enter password (or OTP auth)"
                placeholderTextColor="#748bac"
                secureTextEntry
              />
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setIsDriverModalOpen(false)}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.saveBtn}
                onPress={handleSaveDriver}
                disabled={driverSaving}
              >
                {driverSaving ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.saveBtnText}>Save Driver</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* TC-033: Add Vehicle Modal */}
      <Modal
        visible={isVehicleModalOpen}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsVehicleModalOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={styles.modalTitle}>Add New Vehicle (TC-033)</Text>
              <TouchableOpacity onPress={() => setIsVehicleModalOpen(false)}>
                <Text style={{ color: '#a2b2c7', fontSize: 18, fontWeight: '700', padding: 4 }}>✕</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.modalSubtitle}>Register a commercial vehicle into the dispatch network.</Text>

            <ScrollView style={{ maxHeight: 320 }} keyboardShouldPersistTaps="handled">
              <Text style={styles.inputLabel}>Registration Number</Text>
              <TextInput
                style={styles.modalInput}
                value={vehicleReg}
                onChangeText={setVehicleReg}
                placeholder="e.g. MH-01-AA-1111"
                placeholderTextColor="#748bac"
                autoCapitalize="characters"
              />

              <Text style={styles.inputLabel}>Vehicle Type (Small, Medium, Large)</Text>
              <TextInput
                style={styles.modalInput}
                value={vehicleType}
                onChangeText={setVehicleType}
                placeholder="e.g. Large"
                placeholderTextColor="#748bac"
              />

              <Text style={styles.inputLabel}>Payload Capacity (kg)</Text>
              <TextInput
                style={styles.modalInput}
                value={vehicleCapacity}
                onChangeText={setVehicleCapacity}
                placeholder="e.g. 2000"
                placeholderTextColor="#748bac"
                keyboardType="numeric"
              />
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setIsVehicleModalOpen(false)}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.saveBtn}
                onPress={handleSaveVehicle}
                disabled={vehicleSaving}
              >
                {vehicleSaving ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.saveBtnText}>Save Vehicle</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Unified Admin Navigation Menu */}
      <AdminMenuModal
        visible={isMenuOpen}
        onClose={() => setIsMenuOpen(false)}
        activeRoute="fleet"
        onOpenAddDriver={() => {
          setActiveTab('drivers');
          setIsDriverModalOpen(true);
        }}
        onOpenAddAdmin={() => router.push('/(admin)/admins' as any)}
      />
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
    paddingHorizontal: 16,
    paddingTop: 52,
    paddingBottom: 16,
    backgroundColor: '#20293a',
    borderBottomWidth: 1,
    borderBottomColor: '#2b3648',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  backBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#2b3648',
  },
  backBtnText: {
    color: '#cbd5e1',
    fontWeight: '600',
    fontSize: 13,
  },
  title: {
    color: '#f8fafc',
    fontSize: 18,
    fontWeight: '700',
  },
  addBtn: {
    backgroundColor: '#2563eb',
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  addBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  menuTrigger: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: '#2b3648',
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuTriggerText: {
    color: '#f8fafc',
    fontSize: 18,
    fontWeight: 'bold',
  },
  tabsRow: {
    flexDirection: 'row',
    backgroundColor: '#293243',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#2f3a4e',
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
  },
  tabActive: {
    backgroundColor: '#2563eb',
  },
  tabText: {
    color: '#a2b2c7',
    fontSize: 13,
    fontWeight: '600',
  },
  tabTextActive: {
    color: '#f4f6f8',
    fontWeight: '700',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  card: {
    backgroundColor: '#293243',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#2f3a4e',
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  cardName: {
    color: '#f4f6f8',
    fontSize: 15,
    fontWeight: '700',
  },
  cardSub: {
    color: '#a2b2c7',
    fontSize: 12,
    marginTop: 2,
  },
  statusBadge: {
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 6,
    backgroundColor: 'rgba(96, 165, 250, 0.15)',
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
  },
  cardBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#2f3a4e',
  },
  cardDetail: {
    color: '#c9d3df',
    fontSize: 12,
  },
  ratingText: {
    color: '#f59e0b',
    fontSize: 12,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#293243',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#2f3a4e',
    maxHeight: '85%',
  },
  modalTitle: {
    color: '#f4f6f8',
    fontSize: 18,
    fontWeight: '700',
  },
  modalSubtitle: {
    color: '#a2b2c7',
    fontSize: 12,
    marginTop: 4,
    marginBottom: 16,
  },
  inputLabel: {
    color: '#c9d3df',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 10,
    marginBottom: 6,
  },
  modalInput: {
    backgroundColor: '#0f141f',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#f4f6f8',
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#2f3a4e',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 20,
  },
  cancelBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#2f3a4e',
  },
  cancelBtnText: {
    color: '#c9d3df',
    fontSize: 13,
    fontWeight: '600',
  },
  saveBtn: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    backgroundColor: '#2563eb',
  },
  saveBtnText: {
    color: '#f4f6f8',
    fontSize: 13,
    fontWeight: '700',
  },
  fuelBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
  },
  fuelBadgeCng: {
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
    borderColor: 'rgba(34, 197, 94, 0.4)',
  },
  fuelBadgePetrol: {
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    borderColor: 'rgba(56, 189, 248, 0.4)',
  },
  fuelBadgeDiesel: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderColor: 'rgba(245, 158, 11, 0.4)',
  },
  fuelBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  fuelBadgeCngText: {
    color: '#22c55e',
  },
  fuelBadgePetrolText: {
    color: '#38bdf8',
  },
  fuelBadgeDieselText: {
    color: '#f59e0b',
  },
});

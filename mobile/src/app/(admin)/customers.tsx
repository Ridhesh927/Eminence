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
  Switch,
} from 'react-native';
import { useRouter } from 'expo-router';
import api from '../../services/api';
import AdminMenuModal from '../../components/AdminMenuModal';

interface CustomerItem {
  id: string;
  name: string;
  email: string;
  phone: string;
  city?: string;
  state?: string;
  address?: string;
  isBusiness?: boolean;
  isPhoneVerified?: boolean;
  isEmailVerified?: boolean;
  isProfileComplete?: boolean;
  referralCode?: string;
  createdAt?: string;
}

export default function CustomerManagementScreen() {
  const router = useRouter();
  const [customers, setCustomers] = useState<CustomerItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'b2c' | 'b2b' | 'verified'>('all');
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Add Customer Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newCity, setNewCity] = useState('');
  const [newState, setNewState] = useState('');
  const [newIsBusiness, setNewIsBusiness] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Edit / Details Modal State
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerItem | null>(null);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editCity, setEditCity] = useState('');
  const [editState, setEditState] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editIsBusiness, setEditIsBusiness] = useState(false);
  const [editIsPhoneVerified, setEditIsPhoneVerified] = useState(false);
  const [editIsProfileComplete, setEditIsProfileComplete] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  const fetchCustomers = async (search = '') => {
    try {
      const url = search ? `/api/admin/customers?search=${encodeURIComponent(search)}` : '/api/admin/customers';
      const res = await api.get(url);
      if (res.data?.success && Array.isArray(res.data.customers)) {
        setCustomers(res.data.customers);
      } else {
        setCustomers([]);
      }
    } catch (err) {
      console.warn('Error fetching customers:', err);
      setCustomers([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchCustomers(searchQuery);
  }, [searchQuery]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchCustomers(searchQuery);
  };

  const handleCreateCustomer = async () => {
    if (!newPhone.trim()) {
      Alert.alert('Missing Field', 'Phone number is mandatory for customer accounts.');
      return;
    }

    setIsSaving(true);
    try {
      const res = await api.post('/api/admin/customers', {
        name: newName.trim() || 'New Customer',
        phone: newPhone.trim(),
        email: newEmail.trim() ? newEmail.trim().toLowerCase() : null,
        city: newCity.trim() || 'Pune',
        state: newState.trim() || 'MH',
        isBusiness: newIsBusiness,
        isPhoneVerified: true,
        isProfileComplete: true,
      });

      if (res.data?.success && res.data?.customer) {
        setCustomers((prev) => [res.data.customer, ...prev]);
        setIsAddModalOpen(false);
        setNewName('');
        setNewPhone('');
        setNewEmail('');
        setNewCity('');
        setNewState('');
        setNewIsBusiness(false);
        Alert.alert('Account Created', `Customer ${newPhone} registered successfully!`);
      } else {
        Alert.alert('Creation Failed', res.data?.message || 'Failed to create customer.');
      }
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message || err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const openCustomerDetails = (customer: CustomerItem) => {
    setSelectedCustomer(customer);
    setEditName(customer.name || '');
    setEditPhone(customer.phone || '');
    setEditEmail(customer.email || '');
    setEditCity(customer.city || '');
    setEditState(customer.state || '');
    setEditAddress(customer.address || '');
    setEditIsBusiness(!!customer.isBusiness);
    setEditIsPhoneVerified(!!customer.isPhoneVerified);
    setEditIsProfileComplete(!!customer.isProfileComplete);
  };

  const handleUpdateCustomer = async () => {
    if (!selectedCustomer) return;

    setIsUpdating(true);
    try {
      const res = await api.put(`/api/admin/customers/${selectedCustomer.id}`, {
        name: editName.trim(),
        phone: editPhone.trim(),
        email: editEmail.trim() ? editEmail.trim().toLowerCase() : null,
        city: editCity.trim(),
        state: editState.trim(),
        address: editAddress.trim(),
        isBusiness: editIsBusiness,
        isPhoneVerified: editIsPhoneVerified,
        isProfileComplete: editIsProfileComplete,
      });

      if (res.data?.success && res.data?.customer) {
        setCustomers((prev) =>
          prev.map((c) => (c.id === selectedCustomer.id ? res.data.customer : c))
        );
        setSelectedCustomer(null);
        Alert.alert('Saved', 'Customer account updated successfully.');
      } else {
        Alert.alert('Update Failed', res.data?.message || 'Could not update customer.');
      }
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message || err.message);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteCustomer = (customer: CustomerItem) => {
    Alert.alert(
      'Delete Customer',
      `Are you sure you want to remove account for ${customer.name || customer.phone}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const res = await api.delete(`/api/admin/customers/${customer.id}`);
              if (res.data?.success) {
                setCustomers((prev) => prev.filter((c) => c.id !== customer.id));
                setSelectedCustomer(null);
                Alert.alert('Deleted', 'Customer account removed.');
              } else {
                Alert.alert('Error', res.data?.message || 'Failed to delete customer.');
              }
            } catch (err: any) {
              Alert.alert('Error', err.response?.data?.message || err.message);
            }
          },
        },
      ]
    );
  };

  const filteredCustomers = customers.filter((c) => {
    if (activeFilter === 'b2c' && c.isBusiness) return false;
    if (activeFilter === 'b2b' && !c.isBusiness) return false;
    if (activeFilter === 'verified' && !c.isPhoneVerified) return false;
    return true;
  });

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Text style={styles.backBtnText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Customers</Text>
        </View>

        <View style={styles.headerRight}>
          <TouchableOpacity
            style={styles.addBtn}
            onPress={() => setIsAddModalOpen(true)}
          >
            <Text style={styles.addBtnText}>+ Add User</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.menuTrigger}
            onPress={() => setIsMenuOpen(true)}
          >
            <Text style={styles.menuTriggerText}>☰</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterRow}>
        {(['all', 'b2c', 'b2b', 'verified'] as const).map((filter) => {
          const labels: Record<string, string> = {
            all: 'All Users',
            b2c: 'Retail (B2C)',
            b2b: 'Corporate (B2B)',
            verified: 'Verified',
          };
          const isActive = activeFilter === filter;
          return (
            <TouchableOpacity
              key={filter}
              style={[styles.filterChip, isActive && styles.filterChipActive]}
              onPress={() => setActiveFilter(filter)}
            >
              <Text style={[styles.filterChipText, isActive && styles.filterChipTextActive]}>
                {labels[filter]}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Search Input */}
      <View style={styles.searchRow}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search name, phone (+91), or email..."
          placeholderTextColor="#748bac"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* Customers List */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6366f1" />
        }
      >
        {loading ? (
          <ActivityIndicator size="large" color="#6366f1" style={{ marginVertical: 40 }} />
        ) : filteredCustomers.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyIcon}>👥</Text>
            <Text style={styles.emptyTitle}>No Customers Found</Text>
            <Text style={styles.emptyText}>Tap "+ Add User" above to onboard a customer.</Text>
          </View>
        ) : (
          filteredCustomers.map((cust) => (
            <TouchableOpacity
              key={cust.id}
              style={styles.custCard}
              onPress={() => openCustomerDetails(cust)}
              activeOpacity={0.85}
            >
              <View style={styles.cardHeader}>
                <View
                  style={[
                    styles.avatarBox,
                    cust.isBusiness && { backgroundColor: '#0284c7' },
                  ]}
                >
                  <Text style={styles.avatarText}>
                    {cust.isBusiness
                      ? '🏢'
                      : cust.name
                      ? cust.name.charAt(0).toUpperCase()
                      : 'U'}
                  </Text>
                </View>

                <View style={styles.cardInfo}>
                  <View style={styles.nameRow}>
                    <Text style={styles.custName} numberOfLines={1}>
                      {cust.name || 'Registered User'}
                    </Text>
                    <View
                      style={[
                        styles.accountTag,
                        cust.isBusiness && styles.accountTagB2B,
                      ]}
                    >
                      <Text
                        style={[
                          styles.accountTagText,
                          cust.isBusiness && styles.accountTagTextB2B,
                        ]}
                      >
                        {cust.isBusiness ? 'ENTERPRISE B2B' : 'RETAIL B2C'}
                      </Text>
                    </View>
                  </View>

                  <Text style={styles.custPhone}>📱 {cust.phone || 'No Phone'}</Text>
                  {cust.email && <Text style={styles.custEmail}>✉️ {cust.email}</Text>}

                  <View style={styles.badgeRow}>
                    {cust.isPhoneVerified ? (
                      <View style={styles.verifiedBadge}>
                        <Text style={styles.verifiedBadgeText}>✓ Phone Verified</Text>
                      </View>
                    ) : (
                      <View style={styles.unverifiedBadge}>
                        <Text style={styles.unverifiedBadgeText}>⚠ Unverified</Text>
                      </View>
                    )}

                    {cust.isProfileComplete && (
                      <View style={styles.completeBadge}>
                        <Text style={styles.completeBadgeText}>✓ Complete Profile</Text>
                      </View>
                    )}

                    {cust.city && (
                      <View style={styles.cityBadge}>
                        <Text style={styles.cityBadgeText}>📍 {cust.city}</Text>
                      </View>
                    )}
                  </View>
                </View>
              </View>

              <View style={styles.cardBottom}>
                {cust.referralCode && (
                  <Text style={styles.refText}>Ref: {cust.referralCode}</Text>
                )}
                <Text style={styles.managePrompt}>Manage Details ›</Text>
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      {/* Add Customer Modal */}
      <Modal
        visible={isAddModalOpen}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsAddModalOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Onboard Customer Account</Text>
              <TouchableOpacity onPress={() => setIsAddModalOpen(false)}>
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 380 }} keyboardShouldPersistTaps="handled">
              <Text style={styles.inputLabel}>Full Name / Company Name</Text>
              <TextInput
                style={styles.modalInput}
                value={newName}
                onChangeText={setNewName}
                placeholder="e.g. Rahul Sharma or Acme Logistics"
                placeholderTextColor="#748bac"
              />

              <Text style={styles.inputLabel}>Phone Number * (10 Digits)</Text>
              <TextInput
                style={styles.modalInput}
                value={newPhone}
                onChangeText={setNewPhone}
                placeholder="e.g. 9876543210"
                placeholderTextColor="#748bac"
                keyboardType="phone-pad"
              />

              <Text style={styles.inputLabel}>Email Address</Text>
              <TextInput
                style={styles.modalInput}
                value={newEmail}
                onChangeText={setNewEmail}
                placeholder="e.g. customer@domain.com"
                placeholderTextColor="#748bac"
                keyboardType="email-address"
                autoCapitalize="none"
              />

              <View style={styles.inputRow}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={styles.inputLabel}>City</Text>
                  <TextInput
                    style={styles.modalInput}
                    value={newCity}
                    onChangeText={setNewCity}
                    placeholder="e.g. Pune"
                    placeholderTextColor="#748bac"
                  />
                </View>
                <View style={{ width: 80 }}>
                  <Text style={styles.inputLabel}>State</Text>
                  <TextInput
                    style={styles.modalInput}
                    value={newState}
                    onChangeText={setNewState}
                    placeholder="MH"
                    placeholderTextColor="#748bac"
                    autoCapitalize="characters"
                  />
                </View>
              </View>

              <View style={styles.switchRow}>
                <Text style={styles.switchLabel}>Corporate / Enterprise Account (B2B)</Text>
                <Switch
                  value={newIsBusiness}
                  onValueChange={setNewIsBusiness}
                  trackColor={{ false: '#334155', true: '#2563eb' }}
                  thumbColor={newIsBusiness ? '#ffffff' : '#94a3b8'}
                />
              </View>
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setIsAddModalOpen(false)}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.saveBtn}
                onPress={handleCreateCustomer}
                disabled={isSaving}
              >
                {isSaving ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.saveBtnText}>Save Customer</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Customer Details & Edit Modal */}
      <Modal
        visible={!!selectedCustomer}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setSelectedCustomer(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Customer Account Details</Text>
              <TouchableOpacity onPress={() => setSelectedCustomer(null)}>
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 380 }} keyboardShouldPersistTaps="handled">
              <Text style={styles.inputLabel}>Name</Text>
              <TextInput
                style={styles.modalInput}
                value={editName}
                onChangeText={setEditName}
              />

              <Text style={styles.inputLabel}>Phone Number</Text>
              <TextInput
                style={styles.modalInput}
                value={editPhone}
                onChangeText={setEditPhone}
                keyboardType="phone-pad"
              />

              <Text style={styles.inputLabel}>Email Address</Text>
              <TextInput
                style={styles.modalInput}
                value={editEmail}
                onChangeText={setEditEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />

              <View style={styles.inputRow}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={styles.inputLabel}>City</Text>
                  <TextInput
                    style={styles.modalInput}
                    value={editCity}
                    onChangeText={setEditCity}
                  />
                </View>
                <View style={{ width: 80 }}>
                  <Text style={styles.inputLabel}>State</Text>
                  <TextInput
                    style={styles.modalInput}
                    value={editState}
                    onChangeText={setEditState}
                    autoCapitalize="characters"
                  />
                </View>
              </View>

              <Text style={styles.inputLabel}>Full Address</Text>
              <TextInput
                style={[styles.modalInput, { minHeight: 60 }]}
                value={editAddress}
                onChangeText={setEditAddress}
                multiline
              />

              {/* Status Toggles */}
              <View style={styles.switchRow}>
                <Text style={styles.switchLabel}>Phone Verified (SMS OTP Passed)</Text>
                <Switch
                  value={editIsPhoneVerified}
                  onValueChange={setEditIsPhoneVerified}
                  trackColor={{ false: '#334155', true: '#10b981' }}
                  thumbColor={editIsPhoneVerified ? '#ffffff' : '#94a3b8'}
                />
              </View>

              <View style={styles.switchRow}>
                <Text style={styles.switchLabel}>Profile Complete Status</Text>
                <Switch
                  value={editIsProfileComplete}
                  onValueChange={setEditIsProfileComplete}
                  trackColor={{ false: '#334155', true: '#3b82f6' }}
                  thumbColor={editIsProfileComplete ? '#ffffff' : '#94a3b8'}
                />
              </View>

              <View style={styles.switchRow}>
                <Text style={styles.switchLabel}>Enterprise Corporate (B2B)</Text>
                <Switch
                  value={editIsBusiness}
                  onValueChange={setEditIsBusiness}
                  trackColor={{ false: '#334155', true: '#0284c7' }}
                  thumbColor={editIsBusiness ? '#ffffff' : '#94a3b8'}
                />
              </View>
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.dangerBtn}
                onPress={() => selectedCustomer && handleDeleteCustomer(selectedCustomer)}
              >
                <Text style={styles.dangerBtnText}>Delete User</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.saveBtn}
                onPress={handleUpdateCustomer}
                disabled={isUpdating}
              >
                {isUpdating ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.saveBtnText}>Save Changes</Text>
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
        activeRoute="customers"
        onOpenAddAdmin={() => router.push('/(admin)/admins' as any)}
        onOpenAddDriver={() => router.push('/(admin)/fleet' as any)}
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
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
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
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#161d2b',
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#263347',
  },
  filterChip: {
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: '#20293a',
    borderWidth: 1,
    borderColor: '#2b3648',
  },
  filterChipActive: {
    backgroundColor: '#2563eb',
    borderColor: '#3b82f6',
  },
  filterChipText: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '600',
  },
  filterChipTextActive: {
    color: '#ffffff',
    fontWeight: '700',
  },
  searchRow: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#121824',
  },
  searchInput: {
    backgroundColor: '#1c2434',
    borderWidth: 1,
    borderColor: '#2b3648',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 9,
    color: '#f8fafc',
    fontSize: 13,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  emptyCard: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyTitle: {
    color: '#f8fafc',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 6,
  },
  emptyText: {
    color: '#94a3b8',
    fontSize: 13,
    textAlign: 'center',
  },
  custCard: {
    backgroundColor: '#182030',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#263347',
  },
  cardHeader: {
    flexDirection: 'row',
  },
  avatarBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#475569',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  avatarText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '800',
  },
  cardInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  custName: {
    color: '#f8fafc',
    fontSize: 15,
    fontWeight: '700',
    flex: 1,
    marginRight: 8,
  },
  accountTag: {
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#475569',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  accountTagB2B: {
    backgroundColor: '#0c4a6e',
    borderColor: '#0284c7',
  },
  accountTagText: {
    color: '#cbd5e1',
    fontSize: 9,
    fontWeight: '800',
  },
  accountTagTextB2B: {
    color: '#7dd3fc',
  },
  custPhone: {
    color: '#cbd5e1',
    fontSize: 13,
    marginTop: 2,
  },
  custEmail: {
    color: '#94a3b8',
    fontSize: 12,
    marginTop: 2,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
  },
  verifiedBadge: {
    backgroundColor: '#064e3b',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  verifiedBadgeText: {
    color: '#6ee7b7',
    fontSize: 10,
    fontWeight: '700',
  },
  unverifiedBadge: {
    backgroundColor: '#451a03',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  unverifiedBadgeText: {
    color: '#fcd34d',
    fontSize: 10,
    fontWeight: '700',
  },
  completeBadge: {
    backgroundColor: '#1e3a8a',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  completeBadgeText: {
    color: '#93c5fd',
    fontSize: 10,
    fontWeight: '700',
  },
  cityBadge: {
    backgroundColor: '#273449',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  cityBadgeText: {
    color: '#94a3b8',
    fontSize: 10,
    fontWeight: '600',
  },
  cardBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#243044',
  },
  refText: {
    color: '#64748b',
    fontSize: 11,
    fontWeight: '600',
  },
  managePrompt: {
    color: '#60a5fa',
    fontSize: 12,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 440,
    backgroundColor: '#192233',
    borderRadius: 14,
    padding: 20,
    borderWidth: 1,
    borderColor: '#2b3648',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalTitle: {
    color: '#f8fafc',
    fontSize: 17,
    fontWeight: '700',
  },
  modalCloseText: {
    color: '#94a3b8',
    fontSize: 18,
    fontWeight: '700',
    padding: 4,
  },
  inputLabel: {
    color: '#cbd5e1',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
    marginTop: 10,
  },
  modalInput: {
    backgroundColor: '#121824',
    borderWidth: 1,
    borderColor: '#2b3648',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
    color: '#f8fafc',
    fontSize: 14,
  },
  inputRow: {
    flexDirection: 'row',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#243044',
    marginTop: 6,
  },
  switchLabel: {
    color: '#cbd5e1',
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
    marginRight: 10,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 20,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#2b3648',
  },
  cancelBtn: {
    paddingVertical: 9,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#263347',
  },
  cancelBtnText: {
    color: '#cbd5e1',
    fontSize: 13,
    fontWeight: '600',
  },
  dangerBtn: {
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: 8,
    backgroundColor: '#3b1d24',
  },
  dangerBtnText: {
    color: '#f87171',
    fontSize: 13,
    fontWeight: '600',
  },
  saveBtn: {
    paddingVertical: 9,
    paddingHorizontal: 18,
    borderRadius: 8,
    backgroundColor: '#2563eb',
  },
  saveBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
});

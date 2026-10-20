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
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import api from '../../services/api';
import AdminMenuModal from '../../components/AdminMenuModal';

interface AdminItem {
  id: string;
  name: string;
  email: string;
  createdAt?: string;
}

export default function AdminManagementScreen() {
  const router = useRouter();
  const [admins, setAdmins] = useState<AdminItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Add Admin Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Edit Admin Modal State
  const [editingAdmin, setEditingAdmin] = useState<AdminItem | null>(null);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  const fetchAdmins = async () => {
    try {
      const res = await api.get('/api/admin/admins');
      if (res.data?.success && Array.isArray(res.data.admins)) {
        setAdmins(res.data.admins);
      } else {
        setAdmins([]);
      }
    } catch (err) {
      console.warn('Error fetching admins:', err);
      setAdmins([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAdmins();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchAdmins();
  };

  const handleCreateAdmin = async () => {
    if (!newEmail.trim() || !newPassword.trim()) {
      Alert.alert('Missing Fields', 'Email and initial password are required.');
      return;
    }

    if (newPassword.length < 6) {
      Alert.alert('Weak Password', 'Password must be at least 6 characters.');
      return;
    }

    setIsSaving(true);
    try {
      const res = await api.post('/api/admin/admins', {
        name: newName.trim() || 'Operations Lead',
        email: newEmail.trim().toLowerCase(),
        password: newPassword,
      });

      if (res.data?.success && res.data?.admin) {
        setAdmins((prev) => [res.data.admin, ...prev]);
        setIsAddModalOpen(false);
        setNewName('');
        setNewEmail('');
        setNewPassword('');
        Alert.alert('Success', `Admin account created for ${newEmail}!`);
      } else {
        Alert.alert('Error', res.data?.message || 'Failed to create admin.');
      }
    } catch (err: any) {
      Alert.alert('Creation Failed', err.response?.data?.message || err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateAdmin = async () => {
    if (!editingAdmin) return;
    if (!editEmail.trim()) {
      Alert.alert('Validation Error', 'Email cannot be empty.');
      return;
    }

    setIsUpdating(true);
    try {
      const payload: any = {
        name: editName.trim() || editingAdmin.name,
        email: editEmail.trim().toLowerCase(),
      };
      if (editPassword.trim()) {
        payload.password = editPassword.trim();
      }

      const res = await api.put(`/api/admin/admins/${editingAdmin.id}`, payload);
      if (res.data?.success && res.data?.admin) {
        setAdmins((prev) =>
          prev.map((adm) => (adm.id === editingAdmin.id ? res.data.admin : adm))
        );
        setEditingAdmin(null);
        setEditPassword('');
        Alert.alert('Success', 'Admin details updated successfully.');
      } else {
        Alert.alert('Update Failed', res.data?.message || 'Could not update admin.');
      }
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message || err.message);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteAdmin = (admin: AdminItem) => {
    if (admin.email?.toLowerCase() === 'admin@eminence.com' || (admin as any).isPrimary) {
      Alert.alert('Action Denied', 'The primary Super Administrator account cannot be deleted.');
      return;
    }

    if (admins.length <= 1) {
      Alert.alert('Action Denied', 'Cannot delete the only remaining administrator.');
      return;
    }

    Alert.alert(
      'Confirm Deletion',
      `Are you sure you want to revoke admin privileges for ${admin.name} (${admin.email})?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Admin',
          style: 'destructive',
          onPress: async () => {
            try {
              const res = await api.delete(`/api/admin/admins/${admin.id}`);
              if (res.data?.success) {
                setAdmins((prev) => prev.filter((a) => a.id !== admin.id));
                Alert.alert('Deleted', 'Admin access revoked.');
              } else {
                Alert.alert('Error', res.data?.message || 'Failed to delete admin.');
              }
            } catch (err: any) {
              Alert.alert('Error', err.response?.data?.message || err.message);
            }
          },
        },
      ]
    );
  };

  const filteredAdmins = admins.filter(
    (a) =>
      a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <View style={styles.container}>
      {/* Top Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Text style={styles.backBtnText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Administrators</Text>
        </View>

        <View style={styles.headerRight}>
          <TouchableOpacity
            style={styles.addBtn}
            onPress={() => setIsAddModalOpen(true)}
          >
            <Text style={styles.addBtnText}>+ Add Admin</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.menuTrigger}
            onPress={() => setIsMenuOpen(true)}
          >
            <Text style={styles.menuTriggerText}>☰</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* KPI Bar */}
      <View style={styles.statsBar}>
        <View style={styles.statBox}>
          <Text style={styles.statNum}>{admins.length}</Text>
          <Text style={styles.statLabel}>Active Admins</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statBox}>
          <Text style={[styles.statNum, { color: '#38bdf8' }]}>Full</Text>
          <Text style={styles.statLabel}>Role Access</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statBox}>
          <Text style={[styles.statNum, { color: '#4ade80' }]}>Active</Text>
          <Text style={styles.statLabel}>System State</Text>
        </View>
      </View>

      {/* Search Input */}
      <View style={styles.searchRow}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search admin name or email..."
          placeholderTextColor="#748bac"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* Admins List */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6366f1" />
        }
      >
        {loading ? (
          <ActivityIndicator size="large" color="#6366f1" style={{ marginVertical: 40 }} />
        ) : filteredAdmins.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyIcon}>🛡️</Text>
            <Text style={styles.emptyTitle}>No Administrators Found</Text>
            <Text style={styles.emptyText}>Tap "+ Add Admin" above to register new operations staff.</Text>
          </View>
        ) : (
          filteredAdmins.map((adm) => (
            <View key={adm.id} style={styles.adminCard}>
              <View style={styles.cardHeader}>
                <View style={styles.avatarBox}>
                  <Text style={styles.avatarText}>
                    {adm.name ? adm.name.charAt(0).toUpperCase() : 'A'}
                  </Text>
                </View>
                <View style={styles.cardInfo}>
                  <View style={styles.nameRow}>
                    <Text style={styles.adminName}>{adm.name}</Text>
                    <View style={styles.roleTag}>
                      <Text style={styles.roleTagText}>ADMIN</Text>
                    </View>
                  </View>
                  <Text style={styles.adminEmail}>{adm.email}</Text>
                  {adm.createdAt && (
                    <Text style={styles.metaText}>
                      Enrolled: {new Date(adm.createdAt).toLocaleDateString()}
                    </Text>
                  )}
                </View>
              </View>

              <View style={styles.cardActions}>
                <TouchableOpacity
                  style={styles.editBtn}
                  onPress={() => {
                    setEditingAdmin(adm);
                    setEditName(adm.name);
                    setEditEmail(adm.email);
                    setEditPassword('');
                  }}
                >
                  <Text style={styles.editBtnText}>✏️ Edit</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.deleteBtn}
                  onPress={() => handleDeleteAdmin(adm)}
                >
                  <Text style={styles.deleteBtnText}>🗑️ Revoke</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      {/* Add Admin Modal */}
      <Modal
        visible={isAddModalOpen}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsAddModalOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add New Administrator</Text>
              <TouchableOpacity onPress={() => setIsAddModalOpen(false)}>
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.modalSubtitle}>
              Create an administrative user account with access to the Operations Portal.
            </Text>

            <ScrollView style={{ maxHeight: 360 }} keyboardShouldPersistTaps="handled">
              <Text style={styles.inputLabel}>Full Name</Text>
              <TextInput
                style={styles.modalInput}
                value={newName}
                onChangeText={setNewName}
                placeholder="e.g. Operations Lead"
                placeholderTextColor="#748bac"
              />

              <Text style={styles.inputLabel}>Email Address *</Text>
              <TextInput
                style={styles.modalInput}
                value={newEmail}
                onChangeText={setNewEmail}
                placeholder="e.g. manager@eminence.com"
                placeholderTextColor="#748bac"
                keyboardType="email-address"
                autoCapitalize="none"
              />

              <Text style={styles.inputLabel}>Initial Password * (min 6 chars)</Text>
              <TextInput
                style={styles.modalInput}
                value={newPassword}
                onChangeText={setNewPassword}
                placeholder="Enter secure initial password"
                placeholderTextColor="#748bac"
                secureTextEntry
              />
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
                onPress={handleCreateAdmin}
                disabled={isSaving}
              >
                {isSaving ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.saveBtnText}>Create Admin</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Edit Admin Modal */}
      <Modal
        visible={!!editingAdmin}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setEditingAdmin(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Update Admin Account</Text>
              <TouchableOpacity onPress={() => setEditingAdmin(null)}>
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 360 }} keyboardShouldPersistTaps="handled">
              <Text style={styles.inputLabel}>Full Name</Text>
              <TextInput
                style={styles.modalInput}
                value={editName}
                onChangeText={setEditName}
              />

              <Text style={styles.inputLabel}>Email Address</Text>
              <TextInput
                style={styles.modalInput}
                value={editEmail}
                onChangeText={setEditEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />

              <Text style={styles.inputLabel}>Change Password (leave blank to keep current)</Text>
              <TextInput
                style={styles.modalInput}
                value={editPassword}
                onChangeText={setEditPassword}
                placeholder="Enter new password to reset"
                placeholderTextColor="#748bac"
                secureTextEntry
              />
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setEditingAdmin(null)}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.saveBtn}
                onPress={handleUpdateAdmin}
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
        activeRoute="admins"
        onOpenAddAdmin={() => setIsAddModalOpen(true)}
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
  statsBar: {
    flexDirection: 'row',
    backgroundColor: '#171e2c',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#263347',
    alignItems: 'center',
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
  },
  statNum: {
    color: '#f8fafc',
    fontSize: 18,
    fontWeight: '800',
  },
  statLabel: {
    color: '#94a3b8',
    fontSize: 11,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 24,
    backgroundColor: '#263347',
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
  adminCard: {
    backgroundColor: '#182030',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#263347',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#2563eb',
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
  },
  adminName: {
    color: '#f8fafc',
    fontSize: 15,
    fontWeight: '700',
  },
  roleTag: {
    backgroundColor: '#1e3a8a',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  roleTagText: {
    color: '#93c5fd',
    fontSize: 10,
    fontWeight: '800',
  },
  adminEmail: {
    color: '#94a3b8',
    fontSize: 13,
    marginTop: 2,
  },
  metaText: {
    color: '#64748b',
    fontSize: 11,
    marginTop: 4,
  },
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#243044',
  },
  editBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: '#243044',
    borderRadius: 6,
  },
  editBtnText: {
    color: '#cbd5e1',
    fontSize: 12,
    fontWeight: '600',
  },
  deleteBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: '#3b1d24',
    borderRadius: 6,
  },
  deleteBtnText: {
    color: '#f87171',
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
    maxWidth: 420,
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
    marginBottom: 6,
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
  modalSubtitle: {
    color: '#94a3b8',
    fontSize: 12,
    marginBottom: 16,
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

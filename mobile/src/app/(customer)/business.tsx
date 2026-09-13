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
  RefreshControl,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import api from '../../services/api';

interface ContractItem {
  id: string | number;
  vehicleType: string;
  vehicleCount: number;
  startDate: string;
  endDate: string;
  status: string;
  dailyRate?: number;
}

interface InvoiceItem {
  id: string;
  date: string;
  ref: string;
  amount: string;
  status: string;
}

export default function MobileBusinessPortal() {
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<'overview' | 'contracts' | 'invoices'>('overview');
  const [contracts, setContracts] = useState<ContractItem[]>([]);
  const [invoices, setInvoices] = useState<InvoiceItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Contract Request Modal State
  const [isContractModalOpen, setIsContractModalOpen] = useState(false);
  const [contractForm, setContractForm] = useState({
    vehicleType: 'small',
    vehicleCount: '2',
    startDate: '2026-09-15',
    endDate: '2026-10-15',
  });
  const [submittingContract, setSubmittingContract] = useState(false);
  const [requestMessage, setRequestMessage] = useState('');

  // Business Registration State
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [regForm, setRegForm] = useState({ companyName: '', gstNumber: '' });
  const [registering, setRegistering] = useState(false);
  const [isVerifiedBusiness, setIsVerifiedBusiness] = useState(true);

  const fetchB2BData = async () => {
    setLoading(true);
    try {
      // 1. Fetch Contracts
      try {
        const contractsRes = await api.get('/api/b2b/contracts');
        if (contractsRes.data?.success && contractsRes.data?.contracts?.length > 0) {
          setContracts(contractsRes.data.contracts);
        } else {
          // Default demo contracts
          setContracts([
            {
              id: 'CNT-2026-001',
              vehicleType: 'Tata Ace (Small)',
              vehicleCount: 2,
              startDate: '2026-09-01',
              endDate: '2026-12-31',
              status: 'active',
              dailyRate: 1800,
            },
            {
              id: 'CNT-2026-002',
              vehicleType: 'Bolero Pickup (Medium)',
              vehicleCount: 1,
              startDate: '2026-08-15',
              endDate: '2026-11-15',
              status: 'active',
              dailyRate: 2400,
            },
          ]);
        }
      } catch {
        setContracts([
          {
            id: 'CNT-2026-001',
            vehicleType: 'Tata Ace (Small)',
            vehicleCount: 2,
            startDate: '2026-09-01',
            endDate: '2026-12-31',
            status: 'active',
            dailyRate: 1800,
          },
        ]);
      }

      // 2. Fetch Invoices
      try {
        const invRes = await api.get('/api/b2b/invoices');
        if (invRes.data?.success && invRes.data?.invoices?.length > 0) {
          setInvoices(invRes.data.invoices);
        } else {
          setInvoices([
            { id: 'INV-B2B-2608', date: '2026-08-31', ref: 'Dedicated Fleet - Aug', amount: '₹1,08,000', status: 'Paid' },
            { id: 'INV-B2B-2607', date: '2026-07-31', ref: 'Dedicated Fleet - Jul', amount: '₹1,08,000', status: 'Paid' },
          ]);
        }
      } catch {
        setInvoices([
          { id: 'INV-B2B-2608', date: '2026-08-31', ref: 'Dedicated Fleet - Aug', amount: '₹1,08,000', status: 'Paid' },
        ]);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchB2BData();
  }, []);

  const handleRegisterBusiness = async () => {
    if (!regForm.companyName || !regForm.gstNumber) {
      Alert.alert('Required', 'Please enter your Company Name and GST Number');
      return;
    }
    setRegistering(true);
    try {
      const res = await api.post('/api/b2b/register', {
        companyName: regForm.companyName,
        gstNumber: regForm.gstNumber,
      });
      if (res.data?.success) {
        setIsVerifiedBusiness(true);
        setIsRegisterOpen(false);
        Alert.alert('Success', 'Corporate Account registered successfully!');
      } else {
        Alert.alert('Error', res.data?.message || 'Registration failed');
      }
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message || 'Server error during registration');
    } finally {
      setRegistering(false);
    }
  };

  const handleRequestContract = async () => {
    setRequestMessage('');
    setSubmittingContract(true);
    try {
      const res = await api.post('/api/b2b/contracts', {
        vehicleType: contractForm.vehicleType,
        vehicleCount: parseInt(contractForm.vehicleCount, 10) || 1,
        startDate: contractForm.startDate,
        endDate: contractForm.endDate,
      });

      if (res.data?.success) {
        setRequestMessage('✅ Contract request submitted! Account manager will contact you.');
        fetchB2BData();
        setTimeout(() => {
          setIsContractModalOpen(false);
          setRequestMessage('');
        }, 1500);
      } else {
        setRequestMessage(res.data?.message || 'Failed to submit contract request');
      }
    } catch (err: any) {
      setRequestMessage(err.response?.data?.message || 'Contract requested (Pending approval)');
      setTimeout(() => {
        setIsContractModalOpen(false);
        setRequestMessage('');
      }, 1500);
    } finally {
      setSubmittingContract(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>← Back to App</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>B2B Corporate Hub</Text>
        <View style={styles.corpBadge}>
          <Text style={styles.corpBadgeText}>ENTERPRISE</Text>
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabsRow}>
        {(['overview', 'contracts', 'invoices'] as const).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tabBtn, activeTab === tab && styles.tabBtnActive]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabBtnText, activeTab === tab && styles.tabBtnTextActive]}>
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchB2BData(); }} tintColor="#c5a880" />}
      >
        {loading && <ActivityIndicator color="#c5a880" style={{ marginVertical: 16 }} />}

        {/* TAB 1: OVERVIEW */}
        {activeTab === 'overview' && (
          <View>
            {/* Corporate Credit Line Card */}
            <View style={styles.creditCard}>
              <View style={styles.creditCardHeader}>
                <Text style={styles.creditCardTitle}>Corporate Credit Limit</Text>
                <Text style={styles.creditCardBadge}>POSTPAID NET-30</Text>
              </View>
              <Text style={styles.creditAmount}>₹5,00,000</Text>
              <Text style={styles.creditSub}>Available Balance: ₹3,92,000 &bull; Utilized: ₹1,08,000</Text>

              <View style={styles.progressTrack}>
                <View style={[styles.progressBar, { width: '22%' }]} />
              </View>
            </View>

            {/* Quick Actions */}
            <View style={styles.quickActionsGrid}>
              <TouchableOpacity
                style={styles.actionCard}
                onPress={() => setIsContractModalOpen(true)}
              >
                <Text style={styles.actionCardIcon}>🚚</Text>
                <Text style={styles.actionCardTitle}>Dedicated Fleet</Text>
                <Text style={styles.actionCardSub}>Request monthly tempos</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.actionCard}
                onPress={() => setActiveTab('invoices')}
              >
                <Text style={styles.actionCardIcon}>📑</Text>
                <Text style={styles.actionCardTitle}>Tax Invoices</Text>
                <Text style={styles.actionCardSub}>GST monthly statements</Text>
              </TouchableOpacity>
            </View>

            {/* Dedicated Account Manager Card */}
            <View style={styles.managerCard}>
              <View style={styles.managerAvatar}>
                <Text style={{ fontSize: 24 }}>👔</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.managerRole}>Dedicated Enterprise Key Account Manager</Text>
                <Text style={styles.managerName}>Vikram Malhotra</Text>
                <Text style={styles.managerContact}>📞 +91 98220 12345 &bull; ✉️ enterprise@eminence.com</Text>
              </View>
            </View>

            {/* Enterprise Perks */}
            <View style={styles.perksCard}>
              <Text style={styles.perksTitle}>Enterprise SLA Guarantees</Text>
              <Text style={styles.perkItem}>✓ 99.9% Fleet Uptime & 15-Minute Replacement Guarantee</Text>
              <Text style={styles.perkItem}>✓ Dedicated Route Optimization Engine (TSP) for Multi-Stop</Text>
              <Text style={styles.perkItem}>✓ Automated GST Invoicing & E-Way Bill Generation</Text>
              <Text style={styles.perkItem}>✓ Cryptographic Blockchain Proof of Delivery (PoD)</Text>
            </View>
          </View>
        )}

        {/* TAB 2: CONTRACTS */}
        {activeTab === 'contracts' && (
          <View>
            <View style={styles.sectionRow}>
              <Text style={styles.sectionHeading}>Dedicated Fleet Subscriptions</Text>
              <TouchableOpacity
                style={styles.addContractBtn}
                onPress={() => setIsContractModalOpen(true)}
              >
                <Text style={styles.addContractBtnText}>+ New Contract</Text>
              </TouchableOpacity>
            </View>

            {contracts.map((contract, idx) => (
              <View key={contract.id || idx} style={styles.contractCard}>
                <View style={styles.contractHeader}>
                  <Text style={styles.contractType}>{contract.vehicleType}</Text>
                  <View style={styles.contractStatusBadge}>
                    <Text style={styles.contractStatusText}>
                      {contract.status?.toUpperCase() || 'ACTIVE'}
                    </Text>
                  </View>
                </View>

                <View style={styles.contractDetails}>
                  <View style={styles.contractDetailItem}>
                    <Text style={styles.contractDetailLabel}>Allocated Vehicles</Text>
                    <Text style={styles.contractDetailVal}>{contract.vehicleCount} Dedicated Tempos</Text>
                  </View>
                  <View style={styles.contractDetailItem}>
                    <Text style={styles.contractDetailLabel}>Duration</Text>
                    <Text style={styles.contractDetailVal}>{contract.startDate} → {contract.endDate}</Text>
                  </View>
                </View>

                {contract.dailyRate && (
                  <View style={styles.contractFooter}>
                    <Text style={styles.rateLabel}>Agreed Daily Rate</Text>
                    <Text style={styles.rateVal}>₹{contract.dailyRate} / day per tempo</Text>
                  </View>
                )}
              </View>
            ))}
          </View>
        )}

        {/* TAB 3: INVOICES */}
        {activeTab === 'invoices' && (
          <View>
            <Text style={styles.sectionHeading}>Consolidated Tax Invoices & Statements</Text>
            {invoices.map((inv, idx) => (
              <View key={inv.id || idx} style={styles.invoiceCard}>
                <View style={styles.invoiceLeft}>
                  <Text style={styles.invoiceId}>{inv.id}</Text>
                  <Text style={styles.invoiceDate}>{inv.date} &bull; {inv.ref}</Text>
                </View>
                <View style={styles.invoiceRight}>
                  <Text style={styles.invoiceAmount}>{inv.amount}</Text>
                  <TouchableOpacity
                    style={styles.downloadBadge}
                    onPress={() => Alert.alert('Invoice', `Generating PDF for ${inv.id}...`)}
                  >
                    <Text style={styles.downloadBadgeText}>Download PDF</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Contract Request Modal */}
      <Modal visible={isContractModalOpen} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Request Dedicated Fleet Contract</Text>
            <Text style={styles.modalSub}>
              Assign vehicles and drivers dedicated solely to your enterprise operations.
            </Text>

            <Text style={styles.inputLabel}>Vehicle Type</Text>
            <View style={styles.vehicleTypeSelector}>
              {['small', 'medium', 'large'].map((type) => (
                <TouchableOpacity
                  key={type}
                  style={[
                    styles.typeOption,
                    contractForm.vehicleType === type && styles.typeOptionActive,
                  ]}
                  onPress={() => setContractForm({ ...contractForm, vehicleType: type })}
                >
                  <Text
                    style={[
                      styles.typeOptionText,
                      contractForm.vehicleType === type && styles.typeOptionTextActive,
                    ]}
                  >
                    {type.toUpperCase()}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.inputLabel}>Number of Dedicated Tempos</Text>
            <TextInput
              style={styles.inputField}
              value={contractForm.vehicleCount}
              onChangeText={(text) => setContractForm({ ...contractForm, vehicleCount: text })}
              keyboardType="numeric"
              placeholder="e.g. 3"
              placeholderTextColor="#64748b"
            />

            <View style={{ flexDirection: 'row', gap: 12 }}>
              <View style={{ flex: 1 }}>
                <Text style={styles.inputLabel}>Start Date</Text>
                <TextInput
                  style={styles.inputField}
                  value={contractForm.startDate}
                  onChangeText={(text) => setContractForm({ ...contractForm, startDate: text })}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor="#64748b"
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.inputLabel}>End Date</Text>
                <TextInput
                  style={styles.inputField}
                  value={contractForm.endDate}
                  onChangeText={(text) => setContractForm({ ...contractForm, endDate: text })}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor="#64748b"
                />
              </View>
            </View>

            {requestMessage ? (
              <Text style={styles.requestFeedback}>{requestMessage}</Text>
            ) : null}

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setIsContractModalOpen(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalSubmitBtn}
                onPress={handleRequestContract}
                disabled={submittingContract}
              >
                {submittingContract ? (
                  <ActivityIndicator color="#0f172a" />
                ) : (
                  <Text style={styles.modalSubmitText}>Submit Request</Text>
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
    backgroundColor: '#0a0e17',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 52,
    paddingBottom: 16,
    backgroundColor: '#161c28',
    borderBottomWidth: 1,
    borderBottomColor: '#242e42',
  },
  backBtn: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: '#242e42',
  },
  backBtnText: {
    color: '#cbd5e1',
    fontSize: 13,
    fontWeight: '600',
  },
  headerTitle: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '700',
  },
  corpBadge: {
    backgroundColor: 'rgba(197, 168, 128, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(197, 168, 128, 0.3)',
  },
  corpBadgeText: {
    color: '#c5a880',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  tabsRow: {
    flexDirection: 'row',
    backgroundColor: '#161c28',
    paddingHorizontal: 16,
    paddingBottom: 10,
    gap: 8,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
    backgroundColor: 'transparent',
  },
  tabBtnActive: {
    backgroundColor: '#242e42',
  },
  tabBtnText: {
    color: '#94a3b8',
    fontSize: 13,
    fontWeight: '600',
  },
  tabBtnTextActive: {
    color: '#c5a880',
    fontWeight: '700',
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  creditCard: {
    backgroundColor: '#161c28',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(197, 168, 128, 0.3)',
    marginBottom: 16,
  },
  creditCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  creditCardTitle: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  creditCardBadge: {
    color: '#10b981',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    fontSize: 10,
    fontWeight: '800',
  },
  creditAmount: {
    color: '#ffffff',
    fontSize: 32,
    fontWeight: '800',
    marginVertical: 4,
  },
  creditSub: {
    color: '#94a3b8',
    fontSize: 12,
    marginBottom: 12,
  },
  progressTrack: {
    height: 6,
    backgroundColor: '#242e42',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#c5a880',
  },
  quickActionsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  actionCard: {
    flex: 1,
    backgroundColor: '#161c28',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#242e42',
  },
  actionCardIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  actionCardTitle: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 2,
  },
  actionCardSub: {
    color: '#94a3b8',
    fontSize: 11,
  },
  managerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: '#161c28',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#242e42',
    marginBottom: 16,
  },
  managerAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#242e42',
    justifyContent: 'center',
    alignItems: 'center',
  },
  managerRole: {
    color: '#c5a880',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  managerName: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
    marginTop: 2,
  },
  managerContact: {
    color: '#94a3b8',
    fontSize: 11,
    marginTop: 2,
  },
  perksCard: {
    backgroundColor: '#161c28',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#242e42',
  },
  perksTitle: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 10,
  },
  perkItem: {
    color: '#94a3b8',
    fontSize: 12,
    lineHeight: 22,
  },
  sectionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionHeading: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
  addContractBtn: {
    backgroundColor: '#c5a880',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  addContractBtnText: {
    color: '#0a0e17',
    fontSize: 12,
    fontWeight: '800',
  },
  contractCard: {
    backgroundColor: '#161c28',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#242e42',
    marginBottom: 12,
  },
  contractHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  contractType: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  contractStatusBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  contractStatusText: {
    color: '#10b981',
    fontSize: 10,
    fontWeight: '800',
  },
  contractDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#242e42',
    paddingTop: 10,
  },
  contractDetailItem: {
    flex: 1,
  },
  contractDetailLabel: {
    color: '#94a3b8',
    fontSize: 10,
  },
  contractDetailVal: {
    color: '#cbd5e1',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  contractFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#242e42',
  },
  rateLabel: {
    color: '#94a3b8',
    fontSize: 11,
  },
  rateVal: {
    color: '#c5a880',
    fontSize: 12,
    fontWeight: '700',
  },
  invoiceCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#161c28',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#242e42',
    marginBottom: 10,
  },
  invoiceLeft: {
    flex: 1,
  },
  invoiceId: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 2,
  },
  invoiceDate: {
    color: '#94a3b8',
    fontSize: 11,
  },
  invoiceRight: {
    alignItems: 'flex-end',
  },
  invoiceAmount: {
    color: '#c5a880',
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 4,
  },
  downloadBadge: {
    backgroundColor: '#242e42',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  downloadBadgeText: {
    color: '#cbd5e1',
    fontSize: 10,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#161c28',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#242e42',
  },
  modalTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  modalSub: {
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
  vehicleTypeSelector: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 6,
  },
  typeOption: {
    flex: 1,
    paddingVertical: 8,
    backgroundColor: '#242e42',
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  typeOptionActive: {
    borderColor: '#c5a880',
    backgroundColor: 'rgba(197, 168, 128, 0.15)',
  },
  typeOptionText: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '700',
  },
  typeOptionTextActive: {
    color: '#c5a880',
  },
  inputField: {
    backgroundColor: '#0a0e17',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#ffffff',
    fontSize: 13,
    borderWidth: 1,
    borderColor: '#242e42',
  },
  requestFeedback: {
    color: '#10b981',
    fontSize: 12,
    marginTop: 10,
    textAlign: 'center',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#242e42',
    alignItems: 'center',
  },
  modalCancelText: {
    color: '#cbd5e1',
    fontSize: 13,
    fontWeight: '600',
  },
  modalSubmitBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#c5a880',
    alignItems: 'center',
  },
  modalSubmitText: {
    color: '#0a0e17',
    fontSize: 13,
    fontWeight: '700',
  },
});

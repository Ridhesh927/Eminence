import React, { useEffect, useState } from 'react';
import {
  Modal,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  SafeAreaView
} from 'react-native';
import api from '../services/api';

interface TermSection {
  id: string;
  title: string;
  content: string;
}

interface TermsData {
  version: string;
  effectiveDate: string;
  title: string;
  summary: string;
  sections: TermSection[];
}

const DEFAULT_TERMS: TermsData = {
  version: 'v1.0',
  effectiveDate: 'September 2026',
  title: 'EMINENCE Logistics - Terms & Conditions',
  summary: 'By using the EMINENCE mobile application for logistics, shipping, or fleet management, you accept and agree to all terms described herein.',
  sections: [
    {
      id: 'carrier-liability',
      title: '1. Carrier Liability & Cargo Declaration',
      content: 'Consignors and shippers must accurately declare consignment contents, declared value, weight, and special handling instructions. Hazardous, illicit, or undeclared perishable materials are strictly prohibited.'
    },
    {
      id: 'cancellation-demurrage',
      title: '2. Booking, Cancellation & Demurrage',
      content: 'Bookings cancelled within 30 minutes of scheduled pickup incur zero cancellation fees. Standard free loading and unloading window is 60 minutes per stop, after which standardized demurrage and waiting fees apply.'
    },
    {
      id: 'telematics-privacy',
      title: '3. Telematics & Geolocation Consent',
      content: 'Real-time GPS tracking and geofencing are activated during active trips to provide transit visibility, safety verification, and proof of delivery. Personal and corporate data is securely processed.'
    },
    {
      id: 'driver-conduct',
      title: '4. Driver & Fleet Code of Conduct',
      content: 'All drivers must hold valid commercial driving licenses, vehicle fitness certificates, and transit insurance. Digital Proof of Delivery (e-POD) with consignee OTP or signature is mandatory upon drop-off.'
    },
    {
      id: 'billing-compliance',
      title: '5. Billing & Invoicing',
      content: 'All tariffs, toll charges, waiting fees, and applicable GST are detailed in automated digital invoices. Disputed charges must be raised within 7 calendar days of trip completion.'
    }
  ]
};

interface TermsModalProps {
  visible: boolean;
  onClose: () => void;
  onAccept?: () => void;
  showAcceptButton?: boolean;
}

export default function TermsModal({
  visible,
  onClose,
  onAccept,
  showAcceptButton = true,
}: TermsModalProps) {
  const [terms, setTerms] = useState<TermsData>(DEFAULT_TERMS);
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    if (!visible) return;

    let isMounted = true;
    const fetchTerms = async () => {
      try {
        setLoading(true);
        const res = await api.get('/api/auth/terms');
        if (isMounted && res.data?.success && res.data.terms) {
          setTerms(res.data.terms);
        }
      } catch {
        // Use default fallback
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchTerms();
    return () => {
      isMounted = false;
    };
  }, [visible]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <SafeAreaView style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.headerTitle}>Terms & Conditions</Text>
              <Text style={styles.headerSubtitle}>
                Version {terms.version} • Effective {terms.effectiveDate}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Body Content */}
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#f97316" />
              <Text style={styles.loadingText}>Loading latest terms...</Text>
            </View>
          ) : (
            <ScrollView
              style={styles.scrollContent}
              contentContainerStyle={styles.scrollInner}
              showsVerticalScrollIndicator={true}
            >
              <View style={styles.summaryBox}>
                <Text style={styles.summaryText}>{terms.summary}</Text>
              </View>

              {terms.sections.map((section, idx) => (
                <View key={section.id || idx} style={styles.sectionCard}>
                  <Text style={styles.sectionTitle}>{section.title}</Text>
                  <Text style={styles.sectionBody}>{section.content}</Text>
                </View>
              ))}
            </ScrollView>
          )}

          {/* Footer Actions */}
          <View style={styles.footer}>
            <TouchableOpacity onPress={onClose} style={styles.cancelBtn}>
              <Text style={styles.cancelBtnText}>Close</Text>
            </TouchableOpacity>

            {showAcceptButton && onAccept && (
              <TouchableOpacity
                onPress={() => {
                  onAccept();
                  onClose();
                }}
                style={styles.acceptBtn}
              >
                <Text style={styles.acceptBtnText}>Accept & Continue</Text>
              </TouchableOpacity>
            )}
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#0d1117',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    borderWidth: 1,
    borderColor: '#30363d',
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#21262d',
    backgroundColor: '#161b22',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#f0f6fc',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#8b949e',
    marginTop: 2,
  },
  closeBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: '#21262d',
  },
  closeBtnText: {
    color: '#c9d1d9',
    fontSize: 16,
    fontWeight: 'bold',
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: '#8b949e',
    marginTop: 12,
    fontSize: 14,
  },
  scrollContent: {
    paddingHorizontal: 20,
  },
  scrollInner: {
    paddingVertical: 16,
    gap: 16,
  },
  summaryBox: {
    backgroundColor: '#161b22',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#30363d',
  },
  summaryText: {
    fontSize: 13,
    color: '#8b949e',
    lineHeight: 18,
  },
  sectionCard: {
    backgroundColor: '#161b22',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#21262d',
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#f97316',
    marginBottom: 6,
  },
  sectionBody: {
    fontSize: 13,
    color: '#c9d1d9',
    lineHeight: 20,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#21262d',
    backgroundColor: '#161b22',
    gap: 12,
  },
  cancelBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: '#21262d',
  },
  cancelBtnText: {
    color: '#c9d1d9',
    fontSize: 14,
    fontWeight: '500',
  },
  acceptBtn: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 10,
    backgroundColor: '#f97316',
  },
  acceptBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
});

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  SafeAreaView,
  Alert
} from 'react-native';
import { useRouter } from 'expo-router';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';

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
  title: 'EMINENCE Logistics Platform - Terms & Conditions',
  summary: 'By accessing or using the EMINENCE mobile app, you agree to comply with our transit rules, carrier guidelines, and privacy regulations.',
  sections: [
    {
      id: 'carrier-liability',
      title: '1. Carrier Liability & Cargo Declaration',
      content: 'Consignors and shippers must accurately declare consignment contents, declared value, weight, and special handling instructions. EMINENCE provides transit tracking and intermediary brokerage; carriers and drivers maintain statutory road carriage liability. Hazardous, illicit, or undeclared perishable materials are strictly prohibited.'
    },
    {
      id: 'cancellation-demurrage',
      title: '2. Booking, Cancellation & Demurrage',
      content: 'Bookings cancelled within 30 minutes of scheduled pickup incur zero cancellation fees. Standard free loading and unloading window is 60 minutes per stop, after which standardized demurrage and waiting fees apply.'
    },
    {
      id: 'telematics-privacy',
      title: '3. Telematics & Geolocation Consent',
      content: 'Real-time GPS tracking and geofencing are activated during active trips to provide transit visibility, safety verification, and proof of delivery. Personal and corporate data is securely processed in accordance with privacy laws.'
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
    },
    {
      id: 'consent-audit',
      title: '6. Consent Audit Trail',
      content: 'EMINENCE stores audit logs including timestamps, IP address, and application version upon terms acceptance.'
    }
  ]
};

export default function TermsScreen() {
  const router = useRouter();
  const { user, acceptTerms } = useAuth();
  const [terms, setTerms] = useState<TermsData>(DEFAULT_TERMS);
  const [loading, setLoading] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);

  useEffect(() => {
    let isMounted = true;
    const fetchTerms = async () => {
      try {
        setLoading(true);
        const res = await api.get('/api/auth/terms');
        if (isMounted && res.data?.success && res.data.terms) {
          setTerms(res.data.terms);
        }
      } catch {
        // Use default terms
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchTerms();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleAccept = async () => {
    setSubmitting(true);
    const res = await acceptTerms(terms.version);
    setSubmitting(false);

    if (res.success) {
      Alert.alert('Terms Accepted', 'Your consent has been recorded successfully.', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } else {
      Alert.alert('Notice', res.message || 'Could not record consent at this time.');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Top Bar */}
      <View style={styles.topBar}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>Legal & Policies</Text>
        <View style={{ width: 50 }} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#f97316" />
          <Text style={styles.loadingText}>Loading legal document...</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.contentInner}
          showsVerticalScrollIndicator={true}
        >
          {/* Header Card */}
          <View style={styles.heroCard}>
            <View style={styles.versionBadge}>
              <Text style={styles.versionText}>Version {terms.version}</Text>
            </View>
            <Text style={styles.heroTitle}>{terms.title}</Text>
            <Text style={styles.heroDate}>Effective Date: {terms.effectiveDate}</Text>
            <Text style={styles.heroSummary}>{terms.summary}</Text>
          </View>

          {/* Clauses */}
          {terms.sections.map((section, idx) => (
            <View key={section.id || idx} style={styles.clauseCard}>
              <Text style={styles.clauseTitle}>{section.title}</Text>
              <Text style={styles.clauseBody}>{section.content}</Text>
            </View>
          ))}

          {/* User Consent Status / Action */}
          {user && (
            <View style={styles.actionCard}>
              {user.termsAccepted ? (
                <View style={styles.acceptedRow}>
                  <Text style={styles.checkIcon}>✓</Text>
                  <Text style={styles.acceptedText}>You have accepted Terms Version {user.termsVersion || 'v1.0'}</Text>
                </View>
              ) : (
                <TouchableOpacity
                  onPress={handleAccept}
                  disabled={submitting}
                  style={styles.acceptButton}
                >
                  {submitting ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.acceptButtonText}>Accept Terms & Conditions</Text>
                  )}
                </TouchableOpacity>
              )}
            </View>
          )}

          <View style={styles.footerNote}>
            <Text style={styles.footerNoteText}>
              Questions? Reach our legal desk at legal@eminence-logistics.com
            </Text>
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0d1117',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#21262d',
    backgroundColor: '#161b22',
  },
  backButton: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: '#21262d',
  },
  backButtonText: {
    color: '#f97316',
    fontWeight: '600',
    fontSize: 14,
  },
  topBarTitle: {
    color: '#f0f6fc',
    fontWeight: '700',
    fontSize: 16,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: '#8b949e',
    marginTop: 12,
    fontSize: 14,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  contentInner: {
    paddingVertical: 20,
    gap: 16,
  },
  heroCard: {
    backgroundColor: '#161b22',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: '#30363d',
  },
  versionBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(249, 115, 22, 0.15)',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(249, 115, 22, 0.3)',
  },
  versionText: {
    color: '#f97316',
    fontSize: 11,
    fontWeight: '700',
  },
  heroTitle: {
    color: '#f0f6fc',
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 4,
  },
  heroDate: {
    color: '#8b949e',
    fontSize: 12,
    marginBottom: 10,
  },
  heroSummary: {
    color: '#c9d1d9',
    fontSize: 13,
    lineHeight: 19,
  },
  clauseCard: {
    backgroundColor: '#161b22',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#21262d',
  },
  clauseTitle: {
    color: '#f97316',
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 8,
  },
  clauseBody: {
    color: '#c9d1d9',
    fontSize: 13,
    lineHeight: 20,
  },
  actionCard: {
    backgroundColor: '#161b22',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#30363d',
    marginTop: 8,
  },
  acceptedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  checkIcon: {
    color: '#22c55e',
    fontSize: 18,
    fontWeight: 'bold',
  },
  acceptedText: {
    color: '#22c55e',
    fontSize: 14,
    fontWeight: '600',
  },
  acceptButton: {
    backgroundColor: '#f97316',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  acceptButtonText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 15,
  },
  footerNote: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  footerNoteText: {
    color: '#6e7681',
    fontSize: 12,
  },
});

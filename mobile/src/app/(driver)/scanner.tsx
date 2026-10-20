import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import api from '../../services/api';

interface ScannedItem {
  barcode: string;
  itemName: string;
  status: string;
  timestamp: string;
}

export default function WmsScannerScreen() {
  const router = useRouter();
  const [barcodeInput, setBarcodeInput] = useState('EMN-BOX-001');
  const [loading, setLoading] = useState(false);
  const [flashOn, setFlashOn] = useState(false);
  const [lastScanned, setLastScanned] = useState<ScannedItem | null>(null);
  const [scanHistory, setScanHistory] = useState<ScannedItem[]>([
    {
      barcode: 'EMN-BOX-000-INIT',
      itemName: 'Electronics Batch 4B',
      status: 'Loaded',
      timestamp: '10:14 AM',
    },
  ]);

  const presetBarcodes = ['EMN-BOX-001', 'EMN-PALLET-882', 'EMN-ELEC-304', 'EMN-PARCEL-991'];

  const handleScan = async (codeToScan?: string) => {
    const code = codeToScan || barcodeInput.trim();
    if (!code) {
      Alert.alert('Empty Code', 'Please enter or select a valid barcode.');
      return;
    }

    setLoading(true);
    try {
      const res = await api.post('/api/drivers/scan-inventory', { barcode: code });
      if (res.data?.success && res.data?.item) {
        const item: ScannedItem = {
          barcode: res.data.item.barcode || code,
          itemName: res.data.item.itemName || 'Verified Cargo Package',
          status: res.data.item.status || 'Loaded',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        };
        setLastScanned(item);
        setScanHistory((prev) => [item, ...prev]);
        setBarcodeInput('');
      } else {
        Alert.alert('Scan Failed', res.data?.message || 'Item could not be verified.');
      }
    } catch (err: any) {
      console.error('Scan error:', err);
      if (__DEV__ && process.env.EXPO_PUBLIC_ENABLE_TEST_AUTH === 'true') {
        const fallbackItem: ScannedItem = {
          barcode: code,
          itemName: 'Test Fixture Cargo Container',
          status: 'Loaded',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
        setLastScanned(fallbackItem);
        setScanHistory((prev) => [fallbackItem, ...prev]);
      } else {
        Alert.alert('Scan Unavailable', 'The inventory service could not verify this barcode.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>WMS Barcode Scanner</Text>
        <TouchableOpacity
          style={[styles.flashBtn, flashOn && styles.flashBtnActive]}
          onPress={() => setFlashOn(!flashOn)}
        >
          <Text style={styles.flashBtnText}>{flashOn ? '⚡ ON' : '💡 OFF'}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Optical Viewfinder Simulation */}
        <View style={styles.viewfinder}>
          <View style={styles.cornerTL} />
          <View style={styles.cornerTR} />
          <View style={styles.cornerBL} />
          <View style={styles.cornerBR} />
          <View style={styles.laserLine} />
          <Text style={styles.viewfinderText}>Align barcode inside viewfinder</Text>
        </View>

        {/* Quick Sample Barcodes */}
        <Text style={styles.sectionTitle}>Sample Waybills / Barcodes</Text>
        <View style={styles.presetRow}>
          {presetBarcodes.map((code) => (
            <TouchableOpacity
              key={code}
              style={styles.presetChip}
              onPress={() => {
                setBarcodeInput(code);
                handleScan(code);
              }}
            >
              <Text style={styles.presetChipText}>{code}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Barcode Input & Trigger */}
        <View style={styles.inputCard}>
          <Text style={styles.inputLabel}>Manual Barcode / Waybill Input</Text>
          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              placeholder="e.g. EMN-BOX-001"
              placeholderTextColor="#748bac"
              value={barcodeInput}
              onChangeText={setBarcodeInput}
              autoCapitalize="characters"
            />
            <TouchableOpacity
              style={styles.scanBtn}
              onPress={() => handleScan()}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.scanBtnText}>Verify Scan</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Latest Scanned Item Result */}
        {lastScanned && (
          <View style={styles.resultCard}>
            <View style={styles.resultHeader}>
              <Text style={styles.resultBadge}>✅ VERIFIED & LOADED</Text>
              <Text style={styles.resultTime}>{lastScanned.timestamp}</Text>
            </View>
            <Text style={styles.resultBarcode}>{lastScanned.barcode}</Text>
            <Text style={styles.resultItem}>{lastScanned.itemName}</Text>
            <Text style={styles.resultStatus}>Status: {lastScanned.status} onto Vehicle</Text>
          </View>
        )}

        {/* Scan Log History */}
        <Text style={[styles.sectionTitle, { marginTop: 24 }]}>
          Loaded Cargo Manifest ({scanHistory.length})
        </Text>
        {scanHistory.map((item, index) => (
          <View key={`${item.barcode}-${index}`} style={styles.historyCard}>
            <View style={styles.historyLeft}>
              <Text style={styles.historyBarcode}>📦 {item.barcode}</Text>
              <Text style={styles.historyDesc}>{item.itemName}</Text>
            </View>
            <View style={styles.historyRight}>
              <Text style={styles.historyStatusBadge}>{item.status}</Text>
              <Text style={styles.historyTime}>{item.timestamp}</Text>
            </View>
          </View>
        ))}
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
  flashBtn: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: '#2f3a4e',
  },
  flashBtnActive: {
    backgroundColor: '#eab308',
  },
  flashBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  viewfinder: {
    height: 180,
    backgroundColor: '#020617',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#2f3a4e',
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    overflow: 'hidden',
  },
  cornerTL: {
    position: 'absolute',
    top: 16,
    left: 16,
    width: 24,
    height: 24,
    borderTopWidth: 3,
    borderLeftWidth: 3,
    borderColor: '#e86331',
  },
  cornerTR: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 24,
    height: 24,
    borderTopWidth: 3,
    borderRightWidth: 3,
    borderColor: '#e86331',
  },
  cornerBL: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    width: 24,
    height: 24,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
    borderColor: '#e86331',
  },
  cornerBR: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    width: 24,
    height: 24,
    borderBottomWidth: 3,
    borderRightWidth: 3,
    borderColor: '#e86331',
  },
  laserLine: {
    width: '80%',
    height: 2,
    backgroundColor: '#ef4444',
    shadowColor: '#ef4444',
    shadowOpacity: 0.8,
    shadowRadius: 6,
  },
  viewfinderText: {
    color: '#a2b2c7',
    fontSize: 12,
    marginTop: 12,
    fontWeight: '500',
  },
  sectionTitle: {
    color: '#a2b2c7',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  presetRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  presetChip: {
    backgroundColor: '#293243',
    borderWidth: 1,
    borderColor: '#e86331',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  presetChipText: {
    color: '#f08b65',
    fontSize: 12,
    fontWeight: '600',
  },
  inputCard: {
    backgroundColor: '#293243',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#2f3a4e',
    marginBottom: 16,
  },
  inputLabel: {
    color: '#c9d3df',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 10,
  },
  input: {
    flex: 1,
    backgroundColor: '#0f141f',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#2f3a4e',
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: '#f4f6f8',
    fontSize: 14,
  },
  scanBtn: {
    backgroundColor: '#2563eb',
    borderRadius: 10,
    paddingHorizontal: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanBtnText: {
    color: '#f4f6f8',
    fontWeight: '700',
    fontSize: 13,
  },
  resultCard: {
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#22c55e',
    padding: 16,
    marginBottom: 16,
  },
  resultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  resultBadge: {
    color: '#22c55e',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  resultTime: {
    color: '#a2b2c7',
    fontSize: 11,
  },
  resultBarcode: {
    color: '#f4f6f8',
    fontSize: 18,
    fontWeight: '800',
  },
  resultItem: {
    color: '#e2e8f0',
    fontSize: 14,
    marginTop: 2,
  },
  resultStatus: {
    color: '#86efac',
    fontSize: 12,
    marginTop: 6,
    fontWeight: '600',
  },
  historyCard: {
    backgroundColor: '#293243',
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2f3a4e',
  },
  historyLeft: {
    flex: 1,
  },
  historyBarcode: {
    color: '#f4f6f8',
    fontSize: 14,
    fontWeight: '700',
  },
  historyDesc: {
    color: '#a2b2c7',
    fontSize: 12,
    marginTop: 2,
  },
  historyRight: {
    alignItems: 'flex-end',
  },
  historyStatusBadge: {
    color: '#22c55e',
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 6,
    fontSize: 11,
    fontWeight: '700',
  },
  historyTime: {
    color: '#748bac',
    fontSize: 10,
    marginTop: 4,
  },
});

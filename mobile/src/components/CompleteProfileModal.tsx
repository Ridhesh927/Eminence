import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Modal, StyleSheet, ScrollView, ActivityIndicator, Alert } from 'react-native';
import * as Location from 'expo-location';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

export default function CompleteProfileModal() {
  const { user, updateUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [detectingLocation, setDetectingLocation] = useState(false);
  const [isClosed, setIsClosed] = useState(false);
  
  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    address: '',
    city: '',
    state: '',
    governmentId: ''
  });

  if (!user || user.isProfileComplete || isClosed) return null;

  const handleDetectLocation = async () => {
    setDetectingLocation(true);
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Permission to access location was denied');
        setDetectingLocation(false);
        return;
      }

      let location = await Location.getCurrentPositionAsync({});
      const { latitude, longitude } = location.coords;
      
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
      const data = await res.json();
      
      if (data && data.address) {
        setFormData(prev => ({
          ...prev,
          city: data.address.city || data.address.town || data.address.village || data.address.county || '',
          state: data.address.state || '',
          address: data.display_name || ''
        }));
      }
    } catch (err) {
      Alert.alert('Error', 'Failed to detect location.');
    } finally {
      setDetectingLocation(false);
    }
  };

  const handleSubmit = async () => {
    if (!formData.name || !formData.email || !formData.phone || !formData.address || !formData.city || !formData.state || !formData.governmentId) {
      Alert.alert('Incomplete', 'Please fill all the fields.');
      return;
    }
    setLoading(true);
    try {
      const res = await api.post('/api/auth/complete-profile', formData);
      if (res.data?.user) {
        await updateUser(res.data.user);
      }
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to complete profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={true} transparent={true} animationType="slide">
      <View style={styles.overlay}>
        <View style={styles.container}>
          <TouchableOpacity style={styles.closeBtn} onPress={() => setIsClosed(true)}>
            <Text style={styles.closeBtnText}>✕</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Complete Your Profile</Text>
          <Text style={styles.subtitle}>We need a few more details to set up your account completely.</Text>

          <ScrollView style={styles.scroll}>
            <Text style={styles.label}>Full Name</Text>
            <TextInput
              style={styles.input}
              value={formData.name}
              onChangeText={(text) => setFormData(prev => ({ ...prev, name: text }))}
              placeholder="John Doe"
              placeholderTextColor="#748bac"
            />

            <Text style={styles.label}>Email Address</Text>
            <TextInput
              style={styles.input}
              value={formData.email}
              onChangeText={(text) => setFormData(prev => ({ ...prev, email: text }))}
              placeholder="john@example.com"
              keyboardType="email-address"
              placeholderTextColor="#748bac"
            />

            <Text style={styles.label}>Phone Number</Text>
            <TextInput
              style={styles.input}
              value={formData.phone}
              onChangeText={(text) => setFormData(prev => ({ ...prev, phone: text }))}
              placeholder="+91 1234567890"
              keyboardType="phone-pad"
              placeholderTextColor="#748bac"
            />

            <Text style={styles.label}>Government ID (Aadhar/SSN)</Text>
            <TextInput
              style={styles.input}
              value={formData.governmentId}
              onChangeText={(text) => setFormData(prev => ({ ...prev, governmentId: text }))}
              placeholder="Enter ID Number"
              placeholderTextColor="#748bac"
            />

            <View style={styles.locationHeader}>
              <Text style={styles.label}>Location Details</Text>
              <TouchableOpacity onPress={handleDetectLocation} disabled={detectingLocation} style={styles.detectBtn}>
                {detectingLocation ? <ActivityIndicator size="small" color="#e86331" /> : <Text style={styles.detectBtnText}>Detect Current</Text>}
              </TouchableOpacity>
            </View>

            <View style={styles.row}>
              <View style={styles.flex1}>
                <Text style={styles.label}>City</Text>
                <TextInput
                  style={[styles.input, { marginRight: 8 }]}
                  value={formData.city}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, city: text }))}
                  placeholder="e.g. Pune"
                  placeholderTextColor="#748bac"
                />
              </View>
              <View style={styles.flex1}>
                <Text style={styles.label}>State</Text>
                <TextInput
                  style={[styles.input, { marginLeft: 8 }]}
                  value={formData.state}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, state: text }))}
                  placeholder="e.g. MH"
                  placeholderTextColor="#748bac"
                />
              </View>
            </View>

            <Text style={styles.label}>Full Address</Text>
            <TextInput
              style={[styles.input, { height: 80, textAlignVertical: 'top' }]}
              value={formData.address}
              onChangeText={(text) => setFormData(prev => ({ ...prev, address: text }))}
              placeholder="Enter your complete street address"
              placeholderTextColor="#748bac"
              multiline
            />
          </ScrollView>

          <TouchableOpacity style={styles.saveBtn} onPress={handleSubmit} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Save & Continue</Text>}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    padding: 20,
  },
  container: {
    backgroundColor: '#1f2937',
    borderRadius: 20,
    padding: 20,
    maxHeight: '85%',
  },
  title: {
    color: '#f4f6f8',
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 5,
    textAlign: 'center',
  },
  subtitle: {
    color: '#a2b2c7',
    fontSize: 13,
    marginBottom: 20,
    textAlign: 'center',
  },
  scroll: {
    marginBottom: 10,
  },
  label: {
    color: '#a2b2c7',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 5,
    marginTop: 10,
  },
  locationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
  },
  detectBtn: {
    backgroundColor: 'rgba(232, 99, 49, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
  },
  detectBtnText: {
    color: '#e86331',
    fontSize: 11,
    fontWeight: '700',
  },
  input: {
    backgroundColor: '#0f141f',
    borderWidth: 1,
    borderColor: '#2f3a4e',
    borderRadius: 10,
    color: '#f4f6f8',
    padding: 12,
  },
  row: {
    flexDirection: 'row',
  },
  flex1: {
    flex: 1,
  },
  closeBtn: {
    position: 'absolute',
    top: 15,
    right: 15,
    zIndex: 10,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: {
    color: '#a2b2c7',
    fontSize: 16,
    fontWeight: 'bold',
  },
  saveBtn: {
    backgroundColor: '#e86331',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 10,
  },
  saveBtnText: {
    color: '#f4f6f8',
    fontSize: 16,
    fontWeight: '700',
  },
});

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import { useAuth } from '../../context/AuthContext';
import TermsModal from '../../components/TermsModal';

WebBrowser.maybeCompleteAuthSession();
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';

export default function LoginScreen() {
  const router = useRouter();
  const { sendOtp, verifyOtp, adminLogin, googleLogin } = useAuth();

  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [role, setRole] = useState<'customer' | 'driver' | 'admin'>('customer');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(true);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const [request, response, promptAsync] = Google.useAuthRequest({
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || 'dummy-ios',
    androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID || 'dummy-android',
    webClientId: process.env.EXPO_PUBLIC_WEB_CLIENT_ID || 'dummy-web',
  });

  useEffect(() => {
    if (response?.type === 'success') {
      const { authentication } = response;
      if (authentication?.idToken) {
        handleGoogleSuccess(authentication.idToken);
      }
    } else if (response?.type === 'error') {
      setErrorMessage('Google Sign-In failed or was cancelled.');
    }
  }, [response]);

  const handleGoogleSuccess = async (idToken: string) => {
    setLoading(true);
    setErrorMessage('');
    const res = await googleLogin(idToken);
    setLoading(false);
    if (res.success) {
      if (res.user?.role === 'driver') router.replace('/(driver)/dashboard');
      else router.replace('/(customer)/dashboard');
    } else {
      setErrorMessage(res.message || 'Google login failed');
    }
  };

  useEffect(() => {
    const checkEnrolledUser = async () => {
      try {
        let savedPhone: string | null = null;
        if (Platform.OS !== 'web') {
          savedPhone = await SecureStore.getItemAsync('biometric_phone');
        } else {
          savedPhone = localStorage.getItem('biometric_phone');
        }
        if (savedPhone && !phone) {
          setPhone(savedPhone);
        }
      } catch (e) {
        console.warn('Failed to load saved biometric phone:', e);
      }
    };
    checkEnrolledUser();
  }, []);

  const handleSendOtp = async () => {
    if (!phone || phone.trim().length < 10) {
      setErrorMessage('Please enter a valid 10-digit phone number');
      return;
    }
    if (!termsAccepted) {
      setErrorMessage('Please accept the Terms & Conditions to proceed');
      return;
    }
    setLoading(true);
    setErrorMessage('');
    setSuccessMessage('');

    const res = await sendOtp(phone.trim(), role);
    setLoading(false);

    if (res.success) {
      setStep('otp');
      setSuccessMessage(res.message || 'OTP sent successfully!');
    } else {
      setErrorMessage(res.message);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otp || otp.trim().length < 4) {
      setErrorMessage('Please enter the verification code');
      return;
    }
    setLoading(true);
    setErrorMessage('');

    const res = await verifyOtp(phone.trim(), otp.trim(), role, termsAccepted);
    setLoading(false);

    if (res.success) {
      try {
        if (Platform.OS !== 'web') {
          await SecureStore.setItemAsync('biometric_phone', phone.trim());
          await SecureStore.setItemAsync('biometric_role', role);
        } else {
          localStorage.setItem('biometric_phone', phone.trim());
          localStorage.setItem('biometric_role', role);
        }
      } catch (storeErr) {
        console.warn('Failed to store biometric phone:', storeErr);
      }

      if (role === 'driver') {
        router.replace('/(driver)/dashboard');
      } else {
        router.replace('/(customer)/dashboard');
      }
    } else {
      setErrorMessage(res.message || 'Invalid OTP code');
    }
  };

  const fillDemoCustomer = () => {
    setPhone('1234567890');
    setRole('customer');
    setErrorMessage('');
  };

  const fillDemoOtp = () => {
    setOtp('123456');
    setErrorMessage('');
  };

  const handleBiometricLogin = async () => {
    try {
      let enrolledPhone: string | null = null;
      let enrolledRole: string | null = null;

      if (Platform.OS !== 'web') {
        enrolledPhone = await SecureStore.getItemAsync('biometric_phone');
        enrolledRole = await SecureStore.getItemAsync('biometric_role');
      } else {
        enrolledPhone = localStorage.getItem('biometric_phone');
        enrolledRole = localStorage.getItem('biometric_role');
      }

      if (!enrolledPhone) {
        setErrorMessage('No account enrolled for biometrics on this device. Please log in with OTP first.');
        return;
      }

      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();

      if (!hasHardware || !isEnrolled) {
        setErrorMessage('Biometric authentication is not available or not set up on this device.');
        return;
      }

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Authenticate with FaceID / TouchID',
        fallbackLabel: 'Use Passcode',
      });

      if (result.success) {
        setLoading(true);
        const targetRole = (enrolledRole as 'customer' | 'driver') || role;
        const res = await verifyOtp(enrolledPhone, '123456', targetRole, termsAccepted);
        setLoading(false);
        if (res.success) {
          if (targetRole === 'driver') router.replace('/(driver)/dashboard');
          else router.replace('/(customer)/dashboard');
        } else {
          setErrorMessage(res.message || 'Biometric login failed on server. Please use OTP.');
        }
      }
    } catch (err: any) {
      console.warn('Biometric error:', err);
      setErrorMessage(err?.message || 'Biometric authentication error occurred');
    }
  };

  const handleAdminLogin = async () => {
    if (!email || !password) {
      setErrorMessage('Please enter both email and password');
      return;
    }
    setLoading(true);
    setErrorMessage('');

    const res = await adminLogin(email.trim(), password);
    setLoading(false);

    if (res.success) {
      router.replace('/(admin)/dashboard');
    } else {
      setErrorMessage(res.message || 'Invalid credentials');
    }
  };

  const handleGoogleSignIn = () => {
    if (!request) {
      setErrorMessage('Google Sign-In configuration is loading, please try again in a moment.');
      return;
    }
    promptAsync();
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Brand Header */}
        <View style={styles.header}>
          <View style={styles.logoBadge}>
            <Text style={styles.logoBadgeText}>⚡</Text>
          </View>
          <Text style={styles.title}>EMINENCE</Text>
          <Text style={styles.subtitle}>Smart Transport & Logistics</Text>
        </View>

        {/* Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>
            {step === 'phone' ? 'Sign In / Register' : 'Verify Phone Number'}
          </Text>
          <Text style={styles.cardSubtitle}>
            {step === 'phone'
              ? 'Enter your mobile number to get an instant verification code'
              : `Enter the OTP sent to +91 ${phone}`}
          </Text>

          {/* Role selector (Customer vs Driver vs Admin) */}
          {step === 'phone' && (
            <View style={styles.roleSelector}>
              <TouchableOpacity
                style={[styles.roleBtn, role === 'customer' && styles.roleBtnActive]}
                onPress={() => { setRole('customer'); setErrorMessage(''); }}
              >
                <Text
                  style={[styles.roleBtnText, role === 'customer' && styles.roleBtnTextActive]}
                >
                  Customer
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.roleBtn, role === 'driver' && styles.roleBtnActive]}
                onPress={() => { setRole('driver'); setErrorMessage(''); }}
              >
                <Text
                  style={[styles.roleBtnText, role === 'driver' && styles.roleBtnTextActive]}
                >
                  Driver
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.roleBtn, role === 'admin' && styles.roleBtnActive, { backgroundColor: role === 'admin' ? '#6366f1' : 'transparent' }]}
                onPress={() => { setRole('admin'); setErrorMessage(''); }}
              >
                <Text
                  style={[styles.roleBtnText, role === 'admin' && styles.roleBtnTextActive]}
                >
                  Admin
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Status Banners */}
          {errorMessage ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          ) : null}

          {successMessage ? (
            <View style={styles.successBox}>
              <Text style={styles.successText}>{successMessage}</Text>
            </View>
          ) : null}
          {/* Input Fields */}
          {role === 'admin' ? (
            <View style={styles.inputGroup}>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Admin Email Address</Text>
                <TextInput
                  style={styles.input}
                  placeholder="admin@eminence.com"
                  placeholderTextColor="#a2b2c7"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  value={email}
                  onChangeText={setEmail}
                />
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Password</Text>
                <TextInput
                  style={styles.input}
                  placeholder="••••••••••••"
                  placeholderTextColor="#a2b2c7"
                  secureTextEntry
                  value={password}
                  onChangeText={setPassword}
                />
              </View>
              <TouchableOpacity
                style={[styles.primaryBtn, { backgroundColor: '#6366f1' }]}
                onPress={handleAdminLogin}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.primaryBtnText}>Secure Admin Login</Text>
                )}
              </TouchableOpacity>
            </View>
          ) : step === 'phone' ? (
            <View style={styles.inputGroup}>
              <TouchableOpacity
                style={[styles.primaryBtn, { backgroundColor: '#ffffff', marginBottom: 20, borderWidth: 1, borderColor: '#d1d5db', flexDirection: 'row', alignItems: 'center' }]}
                onPress={handleGoogleSignIn}
                disabled={loading}
              >
                <Text style={{ fontSize: 20, marginRight: 10 }}>G</Text>
                <Text style={[styles.primaryBtnText, { color: '#374151' }]}>Continue with Google</Text>
              </TouchableOpacity>

              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20 }}>
                <View style={{ flex: 1, height: 1, backgroundColor: '#2f3a4e' }} />
                <Text style={{ color: '#a2b2c7', paddingHorizontal: 10, fontSize: 12 }}>OR CONTINUE WITH PHONE</Text>
                <View style={{ flex: 1, height: 1, backgroundColor: '#2f3a4e' }} />
              </View>

              <Text style={styles.label}>Mobile Phone Number</Text>
              <View style={styles.phoneInputRow}>
                <View style={styles.countryCode}>
                  <Text style={styles.countryCodeText}>+91</Text>
                </View>
                <TextInput
                  style={styles.phoneInput}
                  placeholder="10-digit number"
                  placeholderTextColor="#a2b2c7"
                  keyboardType="phone-pad"
                  maxLength={10}
                  value={phone}
                  onChangeText={setPhone}
                />
              </View>

              {/* Terms Agreement */}
              <View style={styles.termsRow}>
                <TouchableOpacity
                  onPress={() => setTermsAccepted(!termsAccepted)}
                  style={[styles.checkbox, termsAccepted && styles.checkboxChecked]}
                  activeOpacity={0.8}
                >
                  {termsAccepted && <Text style={styles.checkmark}>✓</Text>}
                </TouchableOpacity>
                <View style={styles.termsTextContainer}>
                  <Text style={styles.termsText}>
                    I accept the{' '}
                    <Text
                      style={styles.termsLink}
                      onPress={() => setShowTermsModal(true)}
                    >
                      Terms & Conditions
                    </Text>
                    {' '}and telematics privacy rules.
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                style={styles.primaryBtn}
                onPress={handleSendOtp}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.primaryBtnText}>Send Verification Code</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.primaryBtn, { backgroundColor: '#1a1f2e', marginTop: 15, borderWidth: 1, borderColor: '#e86331' }]}
                onPress={handleBiometricLogin}
                disabled={loading}
              >
                <Text style={[styles.primaryBtnText, { color: '#e86331' }]}>FaceID / Fingerprint</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.inputGroup}>
              <Text style={styles.label}>6-Digit OTP</Text>
              <TextInput
                style={styles.otpInput}
                placeholder="• • • • • •"
                placeholderTextColor="#a2b2c7"
                keyboardType="number-pad"
                maxLength={6}
                value={otp}
                onChangeText={setOtp}
              />



              <TouchableOpacity
                style={styles.primaryBtn}
                onPress={handleVerifyOtp}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.primaryBtnText}>Verify & Continue</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.backBtn}
                onPress={() => {
                  setStep('phone');
                  setOtp('');
                  setErrorMessage('');
                }}
              >
                <Text style={styles.backBtnText}>Change Phone Number</Text>
              </TouchableOpacity>
            </View>
          )}



          <TermsModal
            visible={showTermsModal}
            onClose={() => setShowTermsModal(false)}
            onAccept={() => setTermsAccepted(true)}
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f141f',
  },
  scrollContent: {
    flexGrow: 1,
    padding: 24,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logoBadge: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#e86331',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    shadowColor: '#e86331',
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 8,
  },
  logoBadgeText: {
    fontSize: 28,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: '#f4f6f8',
    letterSpacing: 2,
  },
  subtitle: {
    fontSize: 14,
    color: '#a2b2c7',
    marginTop: 4,
  },
  card: {
    backgroundColor: '#293243',
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: '#2f3a4e',
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#f4f6f8',
  },
  cardSubtitle: {
    fontSize: 13,
    color: '#a2b2c7',
    marginTop: 4,
    marginBottom: 20,
  },
  roleSelector: {
    flexDirection: 'row',
    backgroundColor: '#0f141f',
    borderRadius: 12,
    padding: 4,
    marginBottom: 18,
  },
  roleBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  roleBtnActive: {
    backgroundColor: '#e86331',
  },
  roleBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#a2b2c7',
  },
  roleBtnTextActive: {
    color: '#f4f6f8',
  },
  errorBox: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderColor: '#ef4444',
    borderWidth: 1,
    padding: 12,
    borderRadius: 10,
    marginBottom: 16,
  },
  errorText: {
    color: '#fca5a5',
    fontSize: 13,
    fontWeight: '500',
  },
  successBox: {
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
    borderColor: '#22c55e',
    borderWidth: 1,
    padding: 12,
    borderRadius: 10,
    marginBottom: 16,
  },
  successText: {
    color: '#86efac',
    fontSize: 13,
    fontWeight: '500',
  },
  inputGroup: {
    marginBottom: 8,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#c9d3df',
    marginBottom: 8,
  },
  phoneInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0f141f',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2f3a4e',
    overflow: 'hidden',
  },
  countryCode: {
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderRightWidth: 1,
    borderRightColor: '#2f3a4e',
    backgroundColor: '#293243',
  },
  countryCodeText: {
    color: '#c9d3df',
    fontSize: 15,
    fontWeight: '600',
  },
  phoneInput: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: '#f4f6f8',
    fontSize: 16,
  },
  input: {
    backgroundColor: '#0f141f',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2f3a4e',
    paddingVertical: 14,
    paddingHorizontal: 16,
    color: '#f4f6f8',
    fontSize: 15,
  },
  otpInput: {
    backgroundColor: '#0f141f',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2f3a4e',
    paddingVertical: 14,
    paddingHorizontal: 16,
    color: '#f4f6f8',
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: 8,
    textAlign: 'center',
  },
  demoFillBtn: {
    alignSelf: 'flex-start',
    marginTop: 10,
    marginBottom: 16,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    backgroundColor: 'rgba(232, 99, 49, 0.1)',
  },
  demoFillText: {
    color: '#f08b65',
    fontSize: 12,
    fontWeight: '600',
  },
  primaryBtn: {
    backgroundColor: '#e86331',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#e86331',
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryBtnText: {
    color: '#f4f6f8',
    fontSize: 16,
    fontWeight: '700',
  },
  backBtn: {
    alignItems: 'center',
    paddingVertical: 12,
    marginTop: 6,
  },
  backBtnText: {
    color: '#a2b2c7',
    fontSize: 14,
    fontWeight: '500',
  },
  adminDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#2f3a4e',
  },
  dividerText: {
    color: '#748bac',
    paddingHorizontal: 12,
    fontSize: 12,
    fontWeight: '600',
  },
  adminLinkBtn: {
    borderWidth: 1,
    borderColor: '#425576',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  adminLinkText: {
    color: '#c9d3df',
    fontSize: 14,
    fontWeight: '600',
  },
  termsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 12,
    gap: 10,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: '#425576',
    backgroundColor: '#0f141f',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#e86331',
    borderColor: '#e86331',
  },
  checkmark: {
    color: '#f4f6f8',
    fontSize: 12,
    fontWeight: 'bold',
  },
  termsTextContainer: {
    flex: 1,
  },
  termsText: {
    color: '#a2b2c7',
    fontSize: 12,
    lineHeight: 18,
  },
  termsLink: {
    color: '#e86331',
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
});

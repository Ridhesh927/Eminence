import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import api from '../services/api';

export interface User {
  id: number | string;
  name?: string;
  email?: string;
  phone?: string;
  role: 'customer' | 'driver' | 'admin' | 'business';
  isProfileComplete?: boolean;
  isEmailVerified?: boolean;
  isPhoneVerified?: boolean;
  termsAccepted?: boolean;
  termsVersion?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  sendOtp: (phone: string, role?: string) => Promise<{ success: boolean; message: string }>;
  verifyOtp: (phone: string, code: string, role?: string, acceptedTerms?: boolean) => Promise<{ success: boolean; user?: User; message?: string }>;
  acceptTerms: (version?: string) => Promise<{ success: boolean; message?: string }>;
  adminLogin: (email: string, password: string) => Promise<{ success: boolean; user?: User; message?: string }>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Load stored token and user on app startup
  useEffect(() => {
    const loadStoredAuth = async () => {
      try {
        let storedToken: string | null = null;
        let storedUser: string | null = null;

        if (Platform.OS !== 'web') {
          storedToken = await SecureStore.getItemAsync('userToken');
          storedUser = await SecureStore.getItemAsync('userData');
        } else {
          storedToken = localStorage.getItem('userToken');
          storedUser = localStorage.getItem('userData');
        }

        if (storedToken && storedUser) {
          setToken(storedToken);
          setUser(JSON.parse(storedUser));
        }
      } catch (e) {
        console.warn('Failed to load stored auth session:', e);
      } finally {
        setIsLoading(false);
      }
    };

    loadStoredAuth();
  }, []);

  const saveAuthSession = async (jwtToken: string, userData: User) => {
    setToken(jwtToken);
    setUser(userData);

    try {
      if (Platform.OS !== 'web') {
        await SecureStore.setItemAsync('userToken', jwtToken);
        await SecureStore.setItemAsync('userData', JSON.stringify(userData));
      } else {
        localStorage.setItem('userToken', jwtToken);
        localStorage.setItem('userData', JSON.stringify(userData));
      }
    } catch (e) {
      console.warn('Failed to persist auth session:', e);
    }
  };

  const sendOtp = async (phone: string, role: string = 'customer') => {
    try {
      const res = await api.post('/api/auth/phone-login', { phone, role });
      return { success: true, message: res.data.message || 'OTP sent successfully' };
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Failed to send OTP';
      return { success: false, message: msg };
    }
  };

  const verifyOtp = async (phone: string, code: string, role: string = 'customer', acceptedTerms: boolean = false) => {
    try {
      const res = await api.post('/api/auth/phone-verify', { phone, code, role, acceptedTerms });
      if (res.data.success && res.data.token) {
        await saveAuthSession(res.data.token, res.data.user);
        return { success: true, user: res.data.user };
      }
      return { success: false, message: res.data.message || 'Verification failed' };
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Verification error';
      return { success: false, message: msg };
    }
  };

  const acceptTerms = async (version: string = 'v1.0') => {
    try {
      const res = await api.post('/api/auth/accept-terms', { version });
      if (res.data.success) {
        if (user) {
          const updatedUser: User = { ...user, termsAccepted: true, termsVersion: version };
          await saveAuthSession(token || '', updatedUser);
        }
        return { success: true, message: res.data.message };
      }
      return { success: false, message: res.data.message || 'Failed to accept terms' };
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Failed to record terms acceptance';
      return { success: false, message: msg };
    }
  };

  const adminLogin = async (email: string, password: string) => {
    try {
      const res = await api.post('/api/admin/login', { email, password });
      if (res.data.success && res.data.token) {
        await saveAuthSession(res.data.token, res.data.user);
        return { success: true, user: res.data.user };
      }
      return { success: false, message: res.data.message || 'Admin login failed' };
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Invalid credentials';
      return { success: false, message: msg };
    }
  };

  const logout = async () => {
    setUser(null);
    setToken(null);
    try {
      if (Platform.OS !== 'web') {
        await SecureStore.deleteItemAsync('userToken');
        await SecureStore.deleteItemAsync('userData');
      } else {
        localStorage.removeItem('userToken');
        localStorage.removeItem('userData');
      }
    } catch (e) {
      console.warn('Error clearing auth session:', e);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        sendOtp,
        verifyOtp,
        acceptTerms,
        adminLogin,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

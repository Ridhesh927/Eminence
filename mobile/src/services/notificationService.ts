import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import api from './api';

// Configure how foreground notifications behave
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/**
 * Configure High-Priority SOS Emergency Notification Channel for Android
 * Sets max importance, custom vibration pattern (buzz), and bypasses DND where possible.
 */
export async function setupEmergencyNotificationChannel() {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('sos_emergency_channel', {
      name: 'Driver SOS & Emergencies',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 500, 200, 500, 200, 1000],
      lightColor: '#EF4444',
      sound: 'default',
      enableVibrate: true,
      bypassDnd: true,
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    });
  }
}

/**
 * Register Admin Device for Offline Push Notifications and SOS Buzzing
 */
export async function registerAdminPushNotifications(adminPhone?: string): Promise<string | null> {
  try {
    await setupEmergencyNotificationChannel();

    if (!Device.isDevice && Platform.OS !== 'web') {
      console.log('[Push Notification] Running on a simulator/emulator. Push tokens require physical device or web.');
    }

    if (Platform.OS === 'web') {
      return null;
    }

    // Check & request notification permissions
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.warn('[Push Notification] Permission denied for emergency push notifications');
      return null;
    }

    // Obtain Expo Push Token
    const projectId = Constants.expoConfig?.extra?.eas?.projectId || Constants.easConfig?.projectId;
    const tokenData = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined
    );
    const token = tokenData.data;

    // Register token with Eminence Backend Admin profile
    if (token) {
      await api.post('/api/admin/push-token', {
        pushToken: token,
        phone: adminPhone || undefined,
      });
      console.log('[Push Notification] Registered Admin push token successfully:', token);
    }

    return token;
  } catch (error: any) {
    console.warn('[Push Notification] Registration skipped or failed:', error.message);
    return null;
  }
}

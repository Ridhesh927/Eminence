const https = require('https');
const crypto = require('crypto');
const { Notification, Admin } = require('../models');

/**
 * Safely retrieve the initialized Socket.io instance
 */
let getIo = null;
try {
  getIo = require('../socket').getIo;
} catch (_err) {
  // Socket module not yet loaded or in test env
}

/**
 * Safely retrieve the initialized Socket.io instance
 */
const getSocketIo = () => {
  try {
    return getIo ? getIo() : null;
  } catch (_err) {
    return null;
  }
};

/**
 * Dispatch Push Notification via Expo Push API (works out of the box for Expo Mobile apps)
 * Supported for ExponentPushToken[...]
 */
const sendExpoPushNotification = (tokens, { title, body, data }) => {
  if (!tokens || tokens.length === 0) return Promise.resolve(null);

  const messages = tokens.map((token) => ({
    to: token,
    sound: 'default',
    priority: 'high',
    title: title || '🚨 DRIVER SOS EMERGENCY',
    body: body || 'A driver has triggered an emergency alert.',
    data: data || {},
    channelId: 'sos_emergency_channel',
    // Vibration pattern for strong SOS buzz: wait 0ms, buzz 500ms, pause 200ms, buzz 500ms, pause 200ms, buzz 1000ms
    _displayInForeground: true,
  }));

  return new Promise((resolve) => {
    try {
      const dataString = JSON.stringify(messages);
      const req = https.request(
        {
          hostname: 'exp.host',
          path: '/--/api/v2/push/send',
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(dataString),
          },
        },
        (res) => {
          let resData = '';
          res.on('data', (chunk) => (resData += chunk));
          res.on('end', () => {
            try {
              const parsed = JSON.parse(resData);
              console.log('[Push Notification] Expo Push dispatched:', parsed?.data?.length || 0, 'deliveries');
              resolve(parsed);
            } catch {
              resolve(null);
            }
          });
        }
      );
      req.on('error', (err) => {
        console.warn('[Push Notification] Expo Push HTTP failed:', err.message);
        resolve(null);
      });
      req.write(dataString);
      req.end();
    } catch (err) {
      console.warn('[Push Notification] Expo send error:', err.message);
      resolve(null);
    }
  });
};

/**
 * Sends Offline Emergency Buzz & Push Notification to all registered Admin mobile devices
 */
const sendAdminEmergencyPushNotification = async ({ title, body, data, location, driverName }) => {
  try {
    // 1. Fetch all admins who have a device pushToken
    const admins = await Admin.findAll({
      attributes: ['id', 'email', 'name', 'phone', 'pushToken'],
    });

    const expoTokens = [];
    const phoneNumbers = [];

    admins.forEach((admin) => {
      if (admin.pushToken && admin.pushToken.startsWith('ExponentPushToken')) {
        expoTokens.push(admin.pushToken);
      }
      if (admin.phone) {
        phoneNumbers.push(admin.phone);
      }
    });

    // 2. Dispatch High-Priority OS Push Notification with vibration channel
    if (expoTokens.length > 0) {
      console.log(`[Push Notification] Broadcasting SOS buzz to ${expoTokens.length} offline Admin mobile devices...`);
      await sendExpoPushNotification(expoTokens, {
        title: title || `🚨 DRIVER SOS: ${driverName || 'Driver'}`,
        body: body || 'Emergency assistance needed! Tap to open live tracker.',
        data: {
          ...data,
          isSos: true,
          channelId: 'sos_emergency_channel',
          timestamp: new Date().toISOString(),
        },
      });
    } else {
      console.log('[Push Notification] No Admin device push tokens registered yet.');
    }

    // 3. Fast2SMS Offline Emergency SMS Failover (Configured for toggle)
    // As requested: Toggleable via FAST2SMS_ENABLED or FAST2SMS_API_KEY environment variable.
    // Currently OFF to save balance; activates automatically when FAST2SMS_ENABLED=true or during presentation.
    const isFast2SmsActive = process.env.FAST2SMS_ENABLED === 'true' && Boolean(process.env.FAST2SMS_API_KEY);
    const superAdminPhone = process.env.SUPER_ADMIN_PHONE || '9970734425';

    if (isFast2SmsActive) {
      try {
        const { sendSMS } = require('./smsService');
        const recipients = [...new Set([superAdminPhone, ...phoneNumbers])].filter(Boolean);
        const emergencyText = `🚨 EMINENCE SOS ALERT: Driver ${driverName || 'Driver'} triggered emergency at ${location?.address || 'GPS'}. Check admin dashboard immediately!`;

        for (const phone of recipients) {
          console.log(`[SOS SMS FAILOVER] Dispatching urgent SMS to Admin (+91 ${phone})...`);
          await sendSMS(phone, emergencyText);
        }
      } catch (smsErr) {
        console.warn('[SOS SMS FAILOVER] SMS dispatch skipped or failed:', smsErr.message);
      }
    } else {
      console.log(`[SOS SMS FAILOVER] Fast2SMS is currently OFF (Cost saving mode). Ready to activate via FAST2SMS_ENABLED=true for presentation.`);
    }

    return { success: true, pushDelivered: expoTokens.length, smsActive: isFast2SmsActive };
  } catch (error) {
    console.error('[Emergency Push] Error sending offline emergency push to admins:', error.message);
    return { success: false, error: error.message };
  }
};

/**
 * Creates and emits a notification in real-time
 */
const createAndEmitNotification = async ({
  userId = null,
  recipientRole = 'customer',
  title,
  message,
  type = 'system',
  metadata = null,
}) => {
  try {
    if (!title || !message) {
      console.warn('[NotificationService] Missing title or message for notification');
      return null;
    }

    const notification = await Notification.create({
      id: crypto.randomUUID(),
      userId: userId || null,
      recipientRole: recipientRole || 'customer',
      title,
      message,
      type: type || 'system',
      isRead: false,
      metadata: metadata || {},
    });

    const payload = {
      id: notification.id,
      userId: notification.userId,
      recipientRole: notification.recipientRole,
      title: notification.title,
      message: notification.message,
      type: notification.type,
      isRead: false,
      metadata: notification.metadata,
      createdAt: notification.createdAt,
    };

    const io = getSocketIo();
    if (io) {
      if (userId) {
        io.to(`user_${userId}`).emit('new_notification', payload);
        io.to(`user_${userId}`).emit('notification', payload);
      }
      if (recipientRole === 'admin') {
        io.to('admin_notifications').emit('new_notification', payload);
        io.to('admin_notifications').emit('notification', payload);
        io.to('admin_inbox').emit('new_notification', payload);
      }
      if (recipientRole === 'all') {
        io.emit('new_notification', payload);
        io.emit('notification', payload);
      }
    }

    return notification;
  } catch (error) {
    console.warn('[NotificationService] Failed to create or emit notification:', error.message);
    return null;
  }
};

module.exports = {
  createAndEmitNotification,
  sendAdminEmergencyPushNotification,
  sendExpoPushNotification,
  getSocketIo,
};

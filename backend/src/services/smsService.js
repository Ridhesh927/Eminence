const https = require('https');

const apiKey = process.env.FAST2SMS_API_KEY;
const isTestEnv = process.env.NODE_ENV === 'test' || process.env.JEST_WORKER_ID !== undefined;

/**
 * Normalizes an Indian mobile phone number to a clean 10-digit format.
 * Strips '+91', '91', leading '0', and all non-digit characters.
 * @param {string|number} phone
 * @returns {string|null} 10-digit phone string or null if invalid
 */
const normalizeIndianPhone = (phone) => {
  if (!phone) return null;
  const digits = String(phone).replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('91')) {
    return digits.substring(2);
  }
  if (digits.length === 11 && digits.startsWith('0')) {
    return digits.substring(1);
  }
  if (digits.length === 10) {
    return digits;
  }
  return null;
};

/**
 * Validates whether a phone number is a valid 10-digit Indian mobile number.
 * Indian mobile numbers must be 10 digits and start with 6, 7, 8, or 9.
 * @param {string|number} phone
 * @returns {boolean}
 */
const isValidIndianMobile = (phone) => {
  const normalized = normalizeIndianPhone(phone);
  return Boolean(normalized && /^[6-9]\d{9}$/.test(normalized));
};

/**
 * Masks a phone number for privacy in logs (e.g., ******3210)
 */
const maskPhone = (phone) => {
  if (!phone) return '****';
  const str = String(phone);
  if (str.length <= 4) return '*'.repeat(str.length);
  return str.slice(0, -4).replace(/./g, '*') + str.slice(-4);
};

/**
 * Extracts a numeric OTP (4 to 6 digits) from a text message body.
 */
const extractOtp = (text) => {
  if (!text) return null;
  const match = String(text).match(/\b(\d{4,6})\b/);
  return match ? match[1] : null;
};

/**
 * Helper to execute an HTTPS request to Fast2SMS
 */
const callFast2Sms = (path) => {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'www.fast2sms.com',
      path,
      method: 'GET'
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve(parsed);
        } catch {
          resolve({ return: false, raw: data });
        }
      });
    });

    req.on('error', (err) => reject(err));
    req.setTimeout(10000, () => {
      req.destroy();
      reject(new Error('Fast2SMS request timed out (10s)'));
    });
    req.end();
  });
};

/**
 * Send an SMS using Fast2SMS scoped to India (+91)
 * Supports both dedicated Fast2SMS OTP route (route=otp) with auto-fallback to Quick SMS (route=q).
 * 
 * @param {string} to - Recipient phone number (normalized to 10 digits)
 * @param {string} body - SMS body content containing OTP
 * @returns {Promise<{success: boolean, message?: string, data?: any}>}
 */
const sendSMS = async (to, body) => {
  // Allow test fixtures in non-production
  const fixtureMode = process.env.NODE_ENV !== 'production' && process.env.TEST_FIXTURES === 'true';
  const cleanPhone = normalizeIndianPhone(to);

  // Strict India scoping check
  const isFixturePhone = fixtureMode && cleanPhone && cleanPhone === process.env.SEED_PHONE;
  if (!isFixturePhone && (!cleanPhone || !/^[6-9]\d{9}$/.test(cleanPhone))) {
    const err = `Invalid Indian mobile number (+91 ${to}). Fast2SMS requires a 10-digit Indian number starting with 6, 7, 8, or 9.`;
    if (!isTestEnv) console.warn(`[SMS REJECTED] ${err}`);
    return { success: false, message: err };
  }

  const currentApiKey = process.env.FAST2SMS_API_KEY || apiKey;

  // Fallback to mock logging if API key is not configured or in unit test environment
  if (!currentApiKey || currentApiKey === 'your_api_key_here' || currentApiKey === 'your_fast2sms_api_key_here' || isTestEnv) {
    if (process.env.NODE_ENV !== 'production' && !isTestEnv) {
      console.log(`[DEV MOCK SMS SENT TO +91 ${maskPhone(cleanPhone)}]: ${body}`);
    }
    return { success: true, mocked: true, message: 'Mock SMS dispatched' };
  }

  try {
    const otpCode = extractOtp(body);
    let result = null;

    // Strategy 1: If message contains a numeric OTP, attempt route=otp
    if (otpCode) {
      try {
        const otpPath = `/dev/bulkV2?authorization=${currentApiKey}&route=otp&variables_values=${otpCode}&numbers=${cleanPhone}`;
        result = await callFast2Sms(otpPath);
        
        // If route=otp succeeded
        if (result && result.return === true) {
          console.log(`[Fast2SMS OTP SUCCESS] Dispatched OTP ${otpCode} to +91 ${maskPhone(cleanPhone)} (Req ID: ${result.request_id || 'ok'})`);
          return { success: true, route: 'otp', data: result };
        }
      } catch (e) {
        console.warn(`[Fast2SMS OTP Route Attempt] Exception: ${e.message}. Attempting fallback to route=q...`);
      }
    }

    // Strategy 2: Use route=q (Quick SMS) as default or fallback
    const qPath = `/dev/bulkV2?authorization=${currentApiKey}&route=q&message=${encodeURIComponent(body)}&language=english&flash=0&numbers=${cleanPhone}`;
    result = await callFast2Sms(qPath);

    if (result && result.return === true) {
      console.log(`[Fast2SMS SMS SUCCESS] Dispatched to +91 ${maskPhone(cleanPhone)} (Req ID: ${result.request_id || 'ok'})`);
      return { success: true, route: 'q', data: result };
    }

    // Handle Fast2SMS specific error codes
    if (result && result.status_code === 999) {
      console.warn(`[Fast2SMS NOTICE] Error 999: Fast2SMS requires a minimum initial wallet recharge of ₹100 at fast2sms.com to unlock the Dev API.`);
      if (process.env.NODE_ENV !== 'production') {
        console.log(`[DEV OTP FALLBACK CONSOLE] Phone: +91 ${maskPhone(cleanPhone)} | Code: ${otpCode || body}`);
      }
      return { success: false, statusCode: 999, message: 'Fast2SMS Dev API requires a ₹100 wallet recharge to unlock live SMS dispatch.' };
    }

    if (result && result.status_code === 996) {
      console.warn(`[Fast2SMS NOTICE] Error 996: Fast2SMS OTP route requires website verification on your fast2sms.com dashboard.`);
    }

    console.warn(`[Fast2SMS WARNING] Fast2SMS dispatch response:`, result);
    if (process.env.NODE_ENV !== 'production' && otpCode) {
      console.log(`[DEV OTP FALLBACK CONSOLE] Phone: +91 ${maskPhone(cleanPhone)} | Code: ${otpCode}`);
    }
    return { success: false, data: result };
  } catch (error) {
    console.error('[Fast2SMS ERROR] Failed to send SMS to recipient:', error.message);
    if (process.env.NODE_ENV !== 'production') {
      const otpCode = extractOtp(body);
      if (otpCode) console.log(`[DEV OTP FALLBACK CONSOLE] Phone: +91 ${maskPhone(cleanPhone)} | Code: ${otpCode}`);
    }
    return { success: false, error: error.message };
  }
};

module.exports = {
  sendSMS,
  normalizeIndianPhone,
  isValidIndianMobile
};

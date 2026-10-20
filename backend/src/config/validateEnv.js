/**
 * Production Environment Configuration Validator
 *
 * Validates required environment variables at server startup.
 * Prevents production startup with missing or insecure placeholder secrets
 * without exposing secret values in logs or exception outputs.
 */

const validateEnv = () => {
  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction) {
    if (!process.env.JWT_SECRET) {
      console.warn('[SECURITY WARNING] JWT_SECRET is not set. Defaulting to local dev secret. NEVER use in production.');
      process.env.JWT_SECRET = 'eminence_local_dev_jwt_secret_key_32_chars!';
    }
    return;
  }

  const errors = [];

  // 1. Database URL
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl || typeof dbUrl !== 'string' || dbUrl.trim() === '') {
    errors.push('DATABASE_URL is required in production.');
  } else if (!dbUrl.startsWith('postgres://') && !dbUrl.startsWith('postgresql://')) {
    errors.push('DATABASE_URL in production must be a valid PostgreSQL connection URI (e.g. NeonDB).');
  }

  // 2. JWT Secret
  const jwtSecret = process.env.JWT_SECRET;
  const insecurePlaceholders = [
    'your_super_secret_jwt_key_here',
    'fallback_secret',
    'secret',
    'password',
    '123456',
    'eminence_local_dev_jwt_secret_key_32_chars!'
  ];

  if (!jwtSecret || typeof jwtSecret !== 'string' || jwtSecret.trim() === '') {
    errors.push('JWT_SECRET is required in production.');
  } else if (jwtSecret.length < 16) {
    errors.push('JWT_SECRET must be at least 16 characters long for cryptographic security.');
  } else if (insecurePlaceholders.includes(jwtSecret.trim())) {
    errors.push('JWT_SECRET is set to an insecure default placeholder. Please supply a secure random key.');
  }

  // 3. CORS Configuration
  const corsOrigins = process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(',').map(origin => origin.trim()).filter(Boolean)
    : [];
  if (corsOrigins.length === 0) {
    errors.push('CORS_ORIGIN is required in production and must list the deployed frontend origin.');
  } else {
    for (const origin of corsOrigins) {
      try {
        const parsedOrigin = new URL(origin);
        if (!['http:', 'https:'].includes(parsedOrigin.protocol) || parsedOrigin.pathname !== '/' || parsedOrigin.search || parsedOrigin.hash) {
          errors.push('CORS_ORIGIN entries must be absolute HTTP(S) origins without paths or query strings.');
          break;
        }
        if (['localhost', '127.0.0.1', '::1'].includes(parsedOrigin.hostname)) {
          errors.push('CORS_ORIGIN must not contain localhost or loopback origins in production.');
          break;
        }
      } catch {
        errors.push('CORS_ORIGIN contains an invalid HTTP(S) origin.');
        break;
      }
    }
  }

  // 4. Payment gateway credentials
  if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
    errors.push('RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET are required in production.');
  } else if (process.env.RAZORPAY_KEY_ID === 'rzp_test_mock') {
    errors.push('RAZORPAY_KEY_ID must not use the test/mock payment key in production.');
  }

  if (errors.length > 0) {
    console.error('\n========================================================================');
    console.error(' [FATAL] PRODUCTION ENVIRONMENT CONFIGURATION ERRORS:');
    errors.forEach((err, idx) => {
      console.error(`   ${idx + 1}. ${err}`);
    });
    console.error(' Server startup aborted. Please configure these variables in your deployment dashboard.');
    console.error('========================================================================\n');
    throw new Error('Production environment validation failed.');
  }

  console.log('[CONFIG] Production environment variables verified successfully.');
};

module.exports = validateEnv;

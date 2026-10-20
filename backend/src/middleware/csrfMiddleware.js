const crypto = require('crypto');

// Generate a cryptographically secure 32-byte hex string
const generateToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

const csrfProtection = (req, res, next) => {
  // Safe methods do not require CSRF token validation
  const safeMethods = ['GET', 'HEAD', 'OPTIONS'];
  
  // Set XSRF-TOKEN cookie if it doesn't exist
  if (!req.cookies['XSRF-TOKEN']) {
    const isProduction = process.env.NODE_ENV === 'production';
    res.cookie('XSRF-TOKEN', generateToken(), {
      httpOnly: false, // Must be readable by client JS to send back as header
      secure: isProduction,
      sameSite: isProduction ? 'none' : 'lax', // 'none' required for cross-domain Vercel <-> Render cookies
      maxAge: 24 * 60 * 60 * 1000 // 1 day
    });
  }

  // Allow safe methods
  if (safeMethods.includes(req.method)) {
    return next();
  }

  // Bypass CSRF in automated testing environment
  if (process.env.NODE_ENV === 'test' || process.env.JEST_WORKER_ID !== undefined) {
    return next();
  }

  // Bypass CSRF for non-browser clients that don't send Origin or Referer (like mobile apps, automated tests, curl)
  const origin = req.get('Origin');
  const referer = req.get('Referer');
  if (!origin && !referer) {
    return next();
  }

  // Public authentication entry points do not require pre-existing CSRF session
  const path = req.originalUrl.split('?')[0];
  const publicAuthEndpoints = [
    '/api/auth/login',
    '/api/auth/login-password',
    '/api/auth/register',
    '/api/auth/register-password',
    '/api/auth/google-login',
    '/api/auth/phone-login',
    '/api/auth/phone-verify',
    '/api/auth/forgot-password',
    '/api/auth/reset-password',
    '/api/admin/login',
    '/api/admin/auth/login'
  ];
  if (publicAuthEndpoints.includes(path)) {
    return next();
  }

  // Webhook bypass (external systems hitting us via POST)
  if (path.includes('webhook')) {
    return next();
  }

  // Bypass CSRF for local dev servers (Expo Web localhost:8081 and Vite localhost:5173) in development
  if (process.env.NODE_ENV === 'development' && (
    origin === 'http://localhost:8081' || origin === 'http://127.0.0.1:8081' ||
    origin === 'http://localhost:5173' || origin === 'http://127.0.0.1:5173' ||
    (referer && ['http://localhost:5173', 'http://127.0.0.1:5173', 'http://localhost:8081', 'http://127.0.0.1:8081'].some((allowed) => referer === allowed || referer.startsWith(`${allowed}/`)))
  )) {
    return next();
  }

  // Requests using Authorization: Bearer <token> headers are immune to browser-driven CSRF attacks
  // because browsers do not automatically attach custom Authorization headers on cross-site requests.
  const authHeader = req.get('Authorization') || req.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ') && authHeader.length > 20) {
    return next();
  }

  // Validate CSRF token for state-changing requests using cookie authentication
  const cookieToken = req.cookies['XSRF-TOKEN'];
  const headerToken = req.get('x-xsrf-token') || req.get('x-csrf-token');

  if (!cookieToken || !headerToken || cookieToken !== headerToken) {
    return res.status(403).json({
      success: false,
      message: 'CSRF token mismatch or missing. Access denied.'
    });
  }

  next();
};

module.exports = csrfProtection;

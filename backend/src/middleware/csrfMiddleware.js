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
    res.cookie('XSRF-TOKEN', generateToken(), {
      httpOnly: false, // Must be readable by client JS to send back as header
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax', // Keep lax to avoid cross-site issues
      maxAge: 24 * 60 * 60 * 1000 // 1 day
    });
  }

  // Allow safe methods
  if (safeMethods.includes(req.method)) {
    return next();
  }

  // Bypass CSRF for non-browser clients that don't send Origin or Referer (like mobile apps)
  // This is a common pattern for APIs serving both web and mobile, but we must be careful.
  // We'll enforce CSRF strictly if an Origin or Referer is present (indicating a browser).
  const origin = req.get('Origin');
  const referer = req.get('Referer');
  
  // Browsers ALWAYS send Origin or Referer for cross-origin POSTs.
  // If both are missing, this is a non-browser client (Mobile app, cURL, etc).
  if (!origin && !referer) {
     return next();
  }
  
  // Webhook bypass (external systems hitting us via POST)
  if (req.originalUrl.includes('webhook')) {
    return next();
  }

  // Validate CSRF token for state-changing requests
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

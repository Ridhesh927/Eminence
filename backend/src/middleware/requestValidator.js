/**
 * Request Validation and Sanitization Middleware
 * Protects endpoints from injection, stored XSS, and malformed inputs.
 */

// Helper to escape and neutralize dangerous HTML/XSS vectors
const sanitizeString = (str) => {
  if (typeof str !== 'string') return str;
  return str.trim()
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
};

// Safe O(N) linear email validator that prevents polynomial ReDoS (CodeQL js/polynomial-redos)
const isValidEmail = (email) => {
  if (!email || typeof email !== 'string' || email.length > 254) return false;
  const trimmed = email.trim();
  const atIndex = trimmed.indexOf('@');
  if (atIndex <= 0 || atIndex !== trimmed.lastIndexOf('@')) return false;

  const local = trimmed.slice(0, atIndex);
  const domain = trimmed.slice(atIndex + 1);
  if (!domain.includes('.') || domain.startsWith('.') || domain.endsWith('.')) return false;

  return /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+$/.test(local) && /^[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)+$/.test(domain);
};

// Helper to normalize and validate Indian phone numbers
const normalizeIndianPhone = (phone) => {
  if (!phone) return null;
  const digits = String(phone).replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('91')) return digits.substring(2);
  if (digits.length === 11 && digits.startsWith('0')) return digits.substring(1);
  if (digits.length === 10) return digits;
  return null;
};

// Driver Payload Validator
const validateDriver = (req, res, next) => {
  const { name, phone, email, licenseNumber, status } = req.body;

  if (!name || typeof name !== 'string' || name.trim().length < 2) {
    return res.status(400).json({ success: false, message: 'Valid driver name is required (min 2 characters)' });
  }

  const cleanPhone = normalizeIndianPhone(phone);
  if (!cleanPhone || !/^[6-9]\d{9}$/.test(cleanPhone)) {
    return res.status(400).json({ success: false, message: 'Valid 10-digit Indian mobile number is required' });
  }
  req.body.phone = cleanPhone;

  if (!licenseNumber || typeof licenseNumber !== 'string' || licenseNumber.trim().length < 3) {
    return res.status(400).json({ success: false, message: 'Valid license number is required' });
  }

  if (email && !isValidEmail(email)) {
    return res.status(400).json({ success: false, message: 'Invalid email format' });
  }

  if (status && !['active', 'inactive', 'on_trip'].includes(status)) {
    return res.status(400).json({ success: false, message: 'Invalid driver status' });
  }

  if (req.body.password && (typeof req.body.password !== 'string' || req.body.password.length < 6)) {
    return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
  }

  // Sanitize fields
  req.body.name = sanitizeString(name);
  req.body.licenseNumber = sanitizeString(licenseNumber);
  if (email) req.body.email = sanitizeString(email);

  next();
};

// Customer Payload Validator
const validateCustomer = (req, res, next) => {
  const { name, phone, email } = req.body;

  const cleanPhone = normalizeIndianPhone(phone);
  if (!cleanPhone || !/^[6-9]\d{9}$/.test(cleanPhone)) {
    return res.status(400).json({ success: false, message: 'Valid 10-digit Indian mobile number is required' });
  }
  req.body.phone = cleanPhone;

  if (name) {
    req.body.name = sanitizeString(name);
  }

  if (email && !isValidEmail(email)) {
    return res.status(400).json({ success: false, message: 'Invalid email format' });
  }
  if (email) req.body.email = sanitizeString(email);

  if (req.body.city) req.body.city = sanitizeString(req.body.city);
  if (req.body.state) req.body.state = sanitizeString(req.body.state);
  if (req.body.address) req.body.address = sanitizeString(req.body.address);

  next();
};

// Vehicle Payload Validator
const validateVehicle = (req, res, next) => {
  const { registrationNumber, type, capacityWeight, status } = req.body;

  if (!registrationNumber || typeof registrationNumber !== 'string' || registrationNumber.trim().length < 3) {
    return res.status(400).json({ success: false, message: 'Valid registration number is required' });
  }

  if (type && !['small', 'medium', 'large'].includes(type)) {
    return res.status(400).json({ success: false, message: 'Vehicle type must be small, medium, or large' });
  }

  if (capacityWeight !== undefined) {
    const weight = Number(capacityWeight);
    if (isNaN(weight) || weight <= 0) {
      return res.status(400).json({ success: false, message: 'Capacity weight must be a positive number' });
    }
  }

  if (status && !['available', 'busy', 'maintenance'].includes(status)) {
    return res.status(400).json({ success: false, message: 'Invalid vehicle status' });
  }

  req.body.registrationNumber = sanitizeString(registrationNumber);
  if (req.body.model) req.body.model = sanitizeString(req.body.model);

  next();
};

// Chat message content sanitizer
const sanitizeChatMessage = (text) => {
  if (typeof text !== 'string') return '';
  return sanitizeString(text).slice(0, 1000); // max 1000 characters with complete XSS stripping
};

module.exports = {
  sanitizeString,
  isValidEmail,
  validateDriver,
  validateCustomer,
  validateVehicle,
  sanitizeChatMessage
};

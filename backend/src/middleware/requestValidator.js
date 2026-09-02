/**
 * Request Validation and Sanitization Middleware
 * Protects endpoints from injection, stored XSS, and malformed inputs.
 */

// Helper to escape dangerous HTML characters to prevent XSS
const sanitizeString = (str) => {
  if (typeof str !== 'string') return str;
  return str
    .trim()
    .replace(/[<>]/g, ''); // strip angle brackets
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

// Driver Payload Validator
const validateDriver = (req, res, next) => {
  const { name, phone, email, licenseNumber, status } = req.body;

  if (!name || typeof name !== 'string' || name.trim().length < 2) {
    return res.status(400).json({ success: false, message: 'Valid driver name is required (min 2 characters)' });
  }

  const phoneRegex = /^[0-9]{10,15}$/;
  if (!phone || !phoneRegex.test(phone.replace(/\D/g, ''))) {
    return res.status(400).json({ success: false, message: 'Valid phone number is required (10-15 digits)' });
  }

  if (!licenseNumber || typeof licenseNumber !== 'string' || licenseNumber.trim().length < 3) {
    return res.status(400).json({ success: false, message: 'Valid license number is required' });
  }

  if (email && !isValidEmail(email)) {
    return res.status(400).json({ success: false, message: 'Invalid email format' });
  }

  if (status && !['active', 'inactive', 'on_trip'].includes(status)) {
    return res.status(400).json({ success: false, message: 'Invalid driver status' });
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

  const phoneRegex = /^[0-9]{10,15}$/;
  if (!phone || !phoneRegex.test(phone.replace(/\D/g, ''))) {
    return res.status(400).json({ success: false, message: 'Valid phone number is required' });
  }

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
  return text
    .trim()
    .slice(0, 1000) // max 1000 characters
    .replace(/[<>]/g, ''); // strip potential HTML / script tags
};

module.exports = {
  sanitizeString,
  validateDriver,
  validateCustomer,
  validateVehicle,
  sanitizeChatMessage
};

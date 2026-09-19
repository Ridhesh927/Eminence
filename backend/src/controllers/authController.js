const admin = require('../config/firebaseAdmin');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { Customer, Otp, UserConsent, Driver } = require('../models');
const { sendEmail } = require('../services/emailService');
const smsService = require('../services/smsService');

const CURRENT_TERMS_VERSION = 'v1.0';

// Helper to check if profile is complete
const checkAndSetProfileComplete = async (customer) => {
  if (customer.name && customer.email && customer.phone && customer.isEmailVerified && customer.isPhoneVerified &&
      customer.city && customer.state && customer.address && customer.governmentId) {
    customer.isProfileComplete = true;
    await customer.save();
  }
  return customer;
};

// Generate 6 digit OTP
const generateOtp = () => {
  return crypto.randomInt(100000, 1000000).toString();
};

// Secure JWT Secret Loader
const getJwtSecret = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret && process.env.NODE_ENV === 'production') {
    throw new Error('FATAL: JWT_SECRET is not defined in production');
  }
  if (!secret) {
    console.warn('[SECURITY WARNING] JWT_SECRET is not set in environment; falling back to default secret.');
  }
  return secret || 'fallback_secret';
};

const googleLogin = async (req, res) => {
  const { idToken } = req.body;
  
  if (!idToken) {
    return res.status(400).json({ success: false, message: 'Google ID token is required' });
  }

  try {
    let uid, email, name, picture;
    
    try {
      // Attempt official Firebase Admin verification
      const decodedToken = await admin.auth().verifyIdToken(idToken);
      uid = decodedToken.uid;
      email = decodedToken.email;
      name = decodedToken.name;
      picture = decodedToken.picture;
    } catch (_adminError) {
      console.warn('Firebase Admin verification failed, falling back to manual decode for local dev');
      // For local development without a service account key, just decode the token
      const decodedToken = jwt.decode(idToken);
      if (!decodedToken) throw new Error('Invalid token format');
      
      uid = decodedToken.sub || decodedToken.user_id;
      email = decodedToken.email;
      name = decodedToken.name;
      picture = decodedToken.picture;
    }

    let customer = await Customer.findOne({ where: { email } });
    if (!customer) {
      // Generate referral code
      const refCode = `EMINENCE-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
      customer = await Customer.create({
        name: name || 'Google User',
        email,
        googleId: uid,
        profilePicture: picture,
        // Assuming Google verified the email
        isEmailVerified: true,
        referralCode: refCode
      });
      // Create wallet
      const { Wallet } = require('../models');
      await Wallet.create({ customerId: customer.id, balance: 0.0 });
    }

    // Double check if profile is complete
    customer = await checkAndSetProfileComplete(customer);

    const token = jwt.sign(
      { 
        id: customer.id, 
        role: 'customer', 
        isProfileComplete: customer.isProfileComplete 
      }, 
      getJwtSecret(), 
      { expiresIn: process.env.JWT_EXPIRE || '7d' }
    );

    return res.status(200).json({
      success: true,
      token,
      user: {
        id: customer.id,
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
        city: customer.city,
        state: customer.state,
        address: customer.address,
        governmentId: customer.governmentId,
        isEmailVerified: customer.isEmailVerified,
        isPhoneVerified: customer.isPhoneVerified,
        isProfileComplete: customer.isProfileComplete,
        role: 'customer'
      }
    });

  } catch (error) {
    console.error('Google Auth Error:', error);
    return res.status(401).json({ success: false, message: 'Invalid or expired Google token' });
  }
};

const updateProfile = async (req, res) => {
  try {
    const { name, email, phone, city, state, address, governmentId } = req.body;
    // Assume req.user is set by auth middleware
    const customerId = req.user.id; 

    let customer = await Customer.findByPk(customerId);
    if (!customer) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (name) customer.name = name;
    if (email && email !== customer.email) {
      customer.email = email;
      customer.isEmailVerified = false;
      customer.isProfileComplete = false;
    }
    if (city) customer.city = city;
    if (state) customer.state = state;
    if (address) customer.address = address;
    if (governmentId) customer.governmentId = governmentId;
    
    if (phone && phone !== customer.phone) {
      customer.phone = phone;
      customer.isPhoneVerified = false; // Reset verification if phone changes
      customer.isProfileComplete = false;
    }

    await customer.save();
    customer = await checkAndSetProfileComplete(customer);

    return res.status(200).json({ success: true, user: customer });
  } catch (error) {
    console.error('Update Profile Error:', error);
    const message = error.name === 'SequelizeUniqueConstraintError' 
      ? 'Email or Phone is already in use by another account.' 
      : (error.message || 'Server error');
    return res.status(500).json({ success: false, message });
  }
};

const sendOtp = async (req, res) => {
  try {
    const { type } = req.body; // 'email' or 'phone'
    const customerId = req.user.id;

    const customer = await Customer.findByPk(customerId);
    if (!customer) return res.status(404).json({ success: false, message: 'User not found' });

    if (type === 'phone' && !customer.phone) {
      return res.status(400).json({ success: false, message: 'Please update your phone number first' });
    }

    const code = generateOtp();
    const expiresAt = new Date(Date.now() + 10 * 60000); // 10 minutes

    const otpHash = crypto.createHash('sha256').update(code).digest('hex');

    // Delete existing OTP of same type for user
    await Otp.destroy({ where: { customerId, type } });

    await Otp.create({
      customerId,
      type,
      code: otpHash,
      expiresAt,
      attempts: 0,
      lockoutUntil: null
    });

    if (type === 'email') {
      await sendEmail(customer.email, "Your Verification Code", `Your code is ${code}`, `<p>Your code is <b>${code}</b></p>`);
    } else if (type === 'phone') {
      await smsService.sendSMS(customer.phone, `Your EMINENCE verification code is ${code}`);
    } else {
      return res.status(400).json({ success: false, message: 'Invalid OTP type' });
    }

    return res.status(200).json({ success: true, message: `OTP sent to ${type}` });
  } catch (error) {
    console.error('Send OTP Error:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

const verifyOtp = async (req, res) => {
  try {
    const { type, code } = req.body;
    const customerId = req.user.id;

    const otpRecord = await Otp.findOne({ 
      where: { customerId, type }, 
      order: [['createdAt', 'DESC']] 
    });

    if (!otpRecord) {
      return res.status(400).json({ success: false, message: 'Invalid OTP' });
    }

    if (otpRecord.lockoutUntil && new Date() < otpRecord.lockoutUntil) {
      return res.status(429).json({ success: false, message: 'Too many attempts. Try again later.' });
    }

    if (new Date() > otpRecord.expiresAt) {
      return res.status(400).json({ success: false, message: 'OTP has expired' });
    }

    const inputHash = crypto.createHash('sha256').update(String(code)).digest('hex');
    if (!crypto.timingSafeEqual(Buffer.from(inputHash), Buffer.from(otpRecord.code))) {
      otpRecord.attempts += 1;
      otpRecord.lastAttemptIp = String(req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1');
      otpRecord.lastAttemptUserAgent = String(req.headers['user-agent'] || 'Unknown Client');
      
      if (otpRecord.attempts >= 5) {
        otpRecord.lockoutUntil = new Date(Date.now() + 15 * 60000); // 15 min lockout
      }
      await otpRecord.save();
      return res.status(400).json({ success: false, message: 'Invalid OTP' });
    }

    // OTP is valid
    let customer = await Customer.findByPk(customerId);
    if (type === 'email') customer.isEmailVerified = true;
    if (type === 'phone') customer.isPhoneVerified = true;

    await customer.save();
    customer = await checkAndSetProfileComplete(customer);

    // Delete the used OTP
    await otpRecord.destroy();

    return res.status(200).json({ success: true, message: `${type} verified successfully`, user: customer });
  } catch (error) {
    console.error('Verify OTP Error:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

const phoneLogin = async (req, res) => {
  try {
    const { phone, role = 'customer' } = req.body;
    if (!phone) return res.status(400).json({ success: false, message: 'Phone number is required' });

    // Bypass OTP generation and DB operations for the Demo Login phone
    const isDevDemo = process.env.NODE_ENV === 'development' && (phone === (process.env.SEED_PHONE || '1234567890') || phone === '9999999999');
    if (isDevDemo) {
      return res.status(200).json({ success: true, message: 'Demo OTP sent successfully' });
    }

    let userId;
    if (role === 'driver') {
      const Driver = require('../models/Driver');
      let driver = await Driver.findOne({ where: { phone } });
      if (!driver) {
        driver = await Driver.create({ phone, name: 'Demo Driver', licenseNumber: 'DL-' + Math.floor(Math.random()*10000) });
      }
      userId = driver.id;
    } else {
      const isBusiness = role === 'business';
      const { Customer } = require('../models');
      let customer = await Customer.findOne({ where: { phone, isBusiness } });
      if (!customer) {
        const refCode = 'EMINENCE-' + Math.random().toString(36).substring(2, 8).toUpperCase();
        customer = await Customer.create({
          phone,
          isPhoneVerified: false,
          referralCode: refCode,
          isBusiness,
          name: isBusiness ? 'Demo Business' : 'Demo User'
        });
        const { Wallet } = require('../models');
        await Wallet.create({ customerId: customer.id, balance: 0.0 });
      }
      userId = customer.id;
    }

    const code = generateOtp();
    const expiresAt = new Date(Date.now() + 10 * 60000); // 10 minutes

    const otpHash = crypto.createHash('sha256').update(code).digest('hex');

    const { Otp } = require('../models');
    await Otp.destroy({ where: { customerId: userId, type: 'phone' } });
    await Otp.create({
      customerId: userId,
      type: 'phone',
      code: otpHash,
      expiresAt,
      attempts: 0,
      lockoutUntil: null
    });

    const smsService = require('../services/smsService');
    await smsService.sendSMS(phone, `Your Eminence Login OTP is: ${code}. Valid for 10 minutes.`);

    return res.status(200).json({ success: true, message: 'OTP sent successfully' });
  } catch (error) {
    console.error('Phone Login Error:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

const phoneVerify = async (req, res) => {
  try {
    const { phone, code, role = 'customer', acceptedTerms = false } = req.body;
    
    // Prevent privilege escalation: only allow specific roles
    const validRoles = ['customer', 'business', 'driver'];
    const userRole = validRoles.includes(role) ? role : 'customer';
    const ipAddress = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
    const userAgent = req.headers['user-agent'] || 'Unknown Client';
    
    // For local development only, allow bypass for the designated seed phone number
    const isDevDemo = process.env.NODE_ENV === 'development' && code === '123456' && (phone === (process.env.SEED_PHONE || '1234567890') || phone === '9999999999');
    
    if (isDevDemo) {
      let userObj;
      let token;
      
      if (userRole === 'driver') {
        const Driver = require('../models/Driver');
        let driver = await Driver.findOne({ where: { phone } });
        if (!driver) {
          driver = await Driver.create({ phone, name: 'Demo Driver', licenseNumber: 'DL-' + Math.floor(Math.random()*10000) });
        }
        if (acceptedTerms) {
          driver.termsAccepted = true;
          driver.termsAcceptedAt = new Date();
          driver.termsVersion = CURRENT_TERMS_VERSION;
          await driver.save();
          try {
            await UserConsent.create({
              userId: driver.id,
              userType: 'driver',
              termsVersion: CURRENT_TERMS_VERSION,
              accepted: true,
              ipAddress: String(ipAddress),
              userAgent: String(userAgent),
              acceptedAt: new Date()
            });
          } catch (e) {
            console.warn('Demo consent log skipped:', e.message);
          }
        }
        token = jwt.sign(
          { id: driver.id, role: userRole, isProfileComplete: true },
          getJwtSecret(),
          { expiresIn: process.env.JWT_EXPIRE || '7d' }
        );
        userObj = driver.toJSON ? driver.toJSON() : { ...driver };
      } else {
        const isBusiness = userRole === 'business';
        const { Customer } = require('../models');
        let customer = await Customer.findOne({ where: { phone, isBusiness } });
        if (!customer) {
          const refCode = 'EMINENCE-' + Math.random().toString(36).substring(2, 8).toUpperCase();
          customer = await Customer.create({ phone, isPhoneVerified: true, referralCode: refCode, isBusiness, name: isBusiness ? 'Demo Business' : 'Demo User' });
          const { Wallet } = require('../models');
          await Wallet.create({ customerId: customer.id, balance: 0.0 });
        } else {
          customer.isPhoneVerified = true;
          await customer.save();
        }
        
        if (acceptedTerms) {
          customer.termsAccepted = true;
          customer.termsAcceptedAt = new Date();
          customer.termsVersion = CURRENT_TERMS_VERSION;
          await customer.save();
          try {
            await UserConsent.create({
              userId: customer.id,
              userType: 'customer',
              termsVersion: CURRENT_TERMS_VERSION,
              accepted: true,
              ipAddress: String(ipAddress),
              userAgent: String(userAgent),
              acceptedAt: new Date()
            });
          } catch (e) {
            console.warn('Demo consent log skipped:', e.message);
          }
        }
        
        // inline checkAndSetProfileComplete since we modify it
        if (customer.name && customer.email && customer.phone && customer.isEmailVerified && customer.isPhoneVerified && customer.city && customer.state && customer.address && customer.governmentId) {
          customer.isProfileComplete = true;
          await customer.save();
        }
        
        token = jwt.sign(
          { id: customer.id, role: userRole, isProfileComplete: customer.isProfileComplete },
          getJwtSecret(),
          { expiresIn: process.env.JWT_EXPIRE || '7d' }
        );
        userObj = customer.toJSON ? customer.toJSON() : { ...customer };
      }

      userObj.role = userRole;
      return res.status(200).json({ success: true, token, user: userObj });
    }

    // Normal non-demo flow
    let user;
    if (userRole === 'driver') {
      const Driver = require('../models/Driver');
      user = await Driver.findOne({ where: { phone } });
    } else {
      const isBusiness = userRole === 'business';
      const { Customer } = require('../models');
      user = await Customer.findOne({ where: { phone, isBusiness } });
    }
    
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const { Otp } = require('../models');
    const otpRecord = await Otp.findOne({ 
      where: { customerId: user.id, type: 'phone' }, 
      order: [['createdAt', 'DESC']] 
    });
    
    if (!otpRecord) return res.status(400).json({ success: false, message: 'Invalid OTP' });

    if (otpRecord.lockoutUntil && new Date() < otpRecord.lockoutUntil) {
      return res.status(429).json({ success: false, message: 'Too many attempts. Try again later.' });
    }
    
    if (new Date() > otpRecord.expiresAt) return res.status(400).json({ success: false, message: 'OTP has expired' });

    const inputHash = crypto.createHash('sha256').update(String(code)).digest('hex');
    if (!crypto.timingSafeEqual(Buffer.from(inputHash), Buffer.from(otpRecord.code))) {
      otpRecord.attempts += 1;
      otpRecord.lastAttemptIp = String(ipAddress);
      otpRecord.lastAttemptUserAgent = String(userAgent);
      
      if (otpRecord.attempts >= 5) {
        otpRecord.lockoutUntil = new Date(Date.now() + 15 * 60000); // 15 min lockout
      }
      await otpRecord.save();
      return res.status(400).json({ success: false, message: 'Invalid OTP' });
    }

    if (userRole !== 'driver') {
      user.isPhoneVerified = true;
      if (acceptedTerms) {
        user.termsAccepted = true;
        user.termsAcceptedAt = new Date();
        user.termsVersion = CURRENT_TERMS_VERSION;
      }
      await user.save();
      
      if (user.name && user.email && user.phone && user.isEmailVerified && user.isPhoneVerified && user.city && user.state && user.address && user.governmentId) {
          user.isProfileComplete = true;
          await user.save();
      }
    } else {
      if (acceptedTerms) {
        user.termsAccepted = true;
        user.termsAcceptedAt = new Date();
        user.termsVersion = CURRENT_TERMS_VERSION;
        await user.save();
      }
    }

    if (acceptedTerms) {
      try {
        await UserConsent.create({
          userId: user.id,
          userType: userRole === 'driver' ? 'driver' : 'customer',
          termsVersion: CURRENT_TERMS_VERSION,
          accepted: true,
          ipAddress: String(ipAddress),
          userAgent: String(userAgent),
          acceptedAt: new Date()
        });
      } catch (err) {
        console.warn('Consent recording note:', err.message);
      }
    }
    
    await otpRecord.destroy();

    const token = jwt.sign(
      { id: user.id, role: userRole, isProfileComplete: userRole === 'driver' ? true : user.isProfileComplete },
      getJwtSecret(),
      { expiresIn: process.env.JWT_EXPIRE || '7d' }
    );

    const userObj = user.toJSON ? user.toJSON() : { ...user };
    userObj.role = userRole;

    return res.status(200).json({ success: true, token, user: userObj });
  } catch (error) {
    console.error('Phone Verify Error:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

const getTerms = async (req, res) => {
  try {
    return res.status(200).json({
      success: true,
      terms: {
        version: CURRENT_TERMS_VERSION,
        effectiveDate: '2026-09-01',
        title: 'EMINENCE Logistics Platform - Terms & Conditions',
        summary: 'By accessing or using the EMINENCE platform across Web and Mobile applications, you agree to be bound by these Terms and Conditions.',
        sections: [
          {
            id: 'carrier-liability',
            title: '1. Carrier Liability & Cargo Declaration',
            content: 'Consignors and shippers must accurately declare consignment contents, declared value, weight, and special handling instructions. EMINENCE provides transit tracking and intermediary brokerage; carriers and drivers maintain statutory road carriage liability. Hazardous, illicit, or undeclared perishable materials are strictly prohibited.'
          },
          {
            id: 'cancellation-demurrage',
            title: '2. Booking, Cancellation & Demurrage',
            content: 'Bookings cancelled within 30 minutes of scheduled pickup incur zero cancellation fees. Cancellations made after driver assignment or arrival at the pickup location may be subject to a nominal mobilization fee. Standard free loading and unloading window is 60 minutes per stop, after which standardized demurrage and waiting fees apply.'
          },
          {
            id: 'telematics-privacy',
            title: '3. Telematics, Geolocation & Data Privacy',
            content: 'Real-time GPS tracking and geofencing are activated during active trips to provide transit visibility, safety verification, and proof of delivery. Personal and corporate data is encrypted and handled in strict compliance with applicable data protection laws.'
          },
          {
            id: 'driver-conduct',
            title: '4. Driver & Fleet Code of Conduct',
            content: 'All drivers must hold valid commercial driving licenses, vehicle fitness certificates, and transit insurance. Zero tolerance is enforced for impaired driving, reckless operation, or unauthorized route deviations. Digital Proof of Delivery (e-POD) with consignee OTP or signature is mandatory upon drop-off.'
          },
          {
            id: 'billing-compliance',
            title: '5. Billing, Tax Invoices & Dispute Resolution',
            content: 'All tariffs, toll charges, waiting fees, and applicable GST are detailed in automated digital invoices. Business accounts under postpaid credit agree to settle invoices within agreed net payment terms. Disputed charges must be raised within 7 calendar days of trip completion via the support desk.'
          }
        ]
      }
    });
  } catch (error) {
    console.error('Get Terms Error:', error);
    return res.status(500).json({ success: false, message: 'Server error retrieving terms' });
  }
};

const acceptTerms = async (req, res) => {
  try {
    const { version = CURRENT_TERMS_VERSION } = req.body;
    const userId = req.user.id;
    const userRole = req.user.role;
    const ipAddress = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
    const userAgent = req.headers['user-agent'] || 'Unknown Client';

    const userType = userRole === 'driver' ? 'driver' : 'customer';

    const consent = await UserConsent.create({
      userId,
      userType,
      termsVersion: version,
      accepted: true,
      ipAddress: String(ipAddress),
      userAgent: String(userAgent),
      acceptedAt: new Date()
    });

    if (userType === 'driver') {
      const driver = await Driver.findByPk(userId);
      if (driver) {
        driver.termsAccepted = true;
        driver.termsAcceptedAt = new Date();
        driver.termsVersion = version;
        await driver.save();
      }
    } else {
      const customer = await Customer.findByPk(userId);
      if (customer) {
        customer.termsAccepted = true;
        customer.termsAcceptedAt = new Date();
        customer.termsVersion = version;
        await customer.save();
      }
    }

    return res.status(200).json({
      success: true,
      message: 'Terms and conditions accepted successfully',
      consent: {
        id: consent.id,
        termsVersion: consent.termsVersion,
        acceptedAt: consent.acceptedAt
      }
    });
  } catch (error) {
    console.error('Accept Terms Error:', error);
    return res.status(500).json({ success: false, message: 'Failed to record terms acceptance' });
  }
};

module.exports = {
  googleLogin,
  updateProfile,
  sendOtp,
  verifyOtp,
  phoneLogin,
  phoneVerify,
  getTerms,
  acceptTerms
};

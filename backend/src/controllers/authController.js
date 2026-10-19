const admin = require('../config/firebaseAdmin');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { Customer, Otp, UserConsent, Driver, Booking } = require('../models');
const { sendEmail } = require('../services/emailService');
const smsService = require('../services/smsService');

const CURRENT_TERMS_VERSION = 'v1.0';

// Helper to check if profile is complete
const checkAndSetProfileComplete = async (customer) => {
  if (customer.name && (customer.email || customer.phone)) {
    customer.isProfileComplete = true;
    await customer.save();
  }
  return customer;
};

// Generate 6 digit OTP
const generateOtp = () => {
  const otp = crypto.randomInt(100000, 1000000).toString();
  if (process.env.NODE_ENV !== 'production') {
    console.log(`[DEV OTP GENERATED]: ${otp}`);
  }
  return otp;
};

// Secure JWT Secret Loader
const getJwtSecret = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('FATAL: JWT_SECRET environment variable is missing');
  }
  return secret;
};

// Mask sensitive Government ID (Aadhaar / PAN) for DPDP Act privacy compliance
const maskGovernmentId = (id) => {
  if (!id || typeof id !== 'string') return null;
  const trimmed = id.trim();
  if (trimmed.length <= 4) return 'XXXX';
  return trimmed.slice(0, -4).replace(/./g, 'X') + trimmed.slice(-4);
};

const googleLogin = async (req, res) => {
  const { idToken } = req.body;
  
  if (!idToken) {
    return res.status(400).json({ success: false, message: 'Google ID token is required' });
  }

  try {
    let uid, email, name, picture;
    
    try {
      // Enforce official Firebase Admin verification if initialized
      const { getAuth } = require('firebase-admin/auth');
      const decodedToken = await getAuth().verifyIdToken(idToken);
      uid = decodedToken.uid;
      email = decodedToken.email;
      name = decodedToken.name;
      picture = decodedToken.picture;
    } catch (adminError) {
      const allowFixtureTokenDecode = process.env.NODE_ENV !== 'production' &&
        process.env.TEST_FIXTURES === 'true';
      if (!allowFixtureTokenDecode) {
        console.warn('Firebase Admin verification failed:', adminError.message);
        return res.status(401).json({ success: false, message: 'Invalid or expired Google ID token' });
      }
      console.warn('Firebase Admin verification skipped for isolated test fixtures:', adminError.message);
      // Fallback: Manually decode the JWT payload for local testing (No signature verification)
      try {
        const payloadBase64 = idToken.split('.')[1];
        const decoded = JSON.parse(Buffer.from(payloadBase64, 'base64').toString('utf-8'));
        uid = decoded.user_id || decoded.sub;
        email = decoded.email;
        name = decoded.name;
        picture = decoded.picture;
        
        if (!uid || !email) throw new Error("Invalid token payload");
      } catch (decodeErr) {
        return res.status(401).json({ success: false, message: `Invalid Google ID token format.` });
      }
    }

    if (!email) {
      return res.status(400).json({ success: false, message: 'Google account has no associated email address' });
    }

    let customer = await Customer.findOne({ where: { email } });
    if (!customer) {
      // Generate referral code
      const refCode = `EMINENCE-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
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
    } else if (!customer.referralCode) {
      customer.referralCode = `EMINENCE-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
      await customer.save();
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

    res.cookie('accessToken', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

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
        governmentId: maskGovernmentId(customer.governmentId),
        isEmailVerified: customer.isEmailVerified,
        isPhoneVerified: customer.isPhoneVerified,
        isProfileComplete: customer.isProfileComplete,
        googleId: customer.googleId,
        referralCode: customer.referralCode,
        referredBy: customer.referredBy,
        isPro: Boolean(customer.isPro),
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
    
    // Disallow changing Google authenticated email or already verified email
    if (email && email !== customer.email) {
      if (customer.googleId || customer.isEmailVerified) {
        return res.status(400).json({
          success: false,
          message: 'Email address is linked to your verified authentication provider and cannot be changed.'
        });
      }
      customer.email = email;
      customer.isEmailVerified = false;
      customer.isProfileComplete = false;
    }
    
    if (city) customer.city = city;
    if (state) customer.state = state;
    if (address) customer.address = address;
    if (governmentId) customer.governmentId = governmentId;
    
    // Disallow changing verified phone number (e.g. if signed up via phone OTP)
    if (phone && phone !== customer.phone) {
      if (customer.isPhoneVerified) {
        return res.status(400).json({
          success: false,
          message: 'Phone number is verified and cannot be changed.'
        });
      }

      // Validate phone number: strictly reject emails or invalid characters
      const cleanPhone = String(phone).trim().replace(/^(\+91|91)/, '').replace(/\D/g, '');
      if (typeof phone === 'string' && (phone.includes('@') || !/^[6-9]\d{9}$/.test(cleanPhone))) {
        return res.status(400).json({
          success: false,
          message: 'Please enter a valid 10-digit Indian mobile number.'
        });
      }

      customer.phone = cleanPhone;
      customer.isPhoneVerified = false;
      customer.isProfileComplete = false;
    }

    // Set account password if provided (e.g. Google user completing profile)
    if (req.body.password && req.body.password.trim().length >= 6) {
      const salt = await bcryptjs.genSalt(10);
      customer.password = await bcryptjs.hash(req.body.password.trim(), salt);
    }

    // Handle Referral Code if provided during profile completion / user details update
    const rawRefCode = (req.body.referralCode || req.body.referredBy || '').trim().toUpperCase();
    if (rawRefCode) {
      if (customer.referredBy) {
        return res.status(400).json({
          success: false,
          message: 'A referral code has already been applied to your account.'
        });
      }

      if (customer.referralCode && rawRefCode === customer.referralCode.toUpperCase()) {
        return res.status(400).json({
          success: false,
          message: 'You cannot use your own referral code.'
        });
      }

      const referrer = await Customer.findOne({ where: { referralCode: rawRefCode } });
      if (!referrer) {
        return res.status(400).json({
          success: false,
          message: 'Invalid referral code entered. Please check and try again.'
        });
      }

      if (referrer.id === customer.id) {
        return res.status(400).json({
          success: false,
          message: 'You cannot use your own referral code.'
        });
      }

      const { Wallet, Transaction } = require('../models');

      // 1. Credit ₹100 Welcome Bonus to Customer (New User / Referee)
      let customerWallet = await Wallet.findOne({ where: { customerId: customer.id } });
      if (!customerWallet) {
        customerWallet = await Wallet.create({ customerId: customer.id, balance: 100.00 });
      } else {
        customerWallet.balance = (parseFloat(customerWallet.balance || 0) + 100.00).toFixed(2);
        await customerWallet.save();
      }

      await Transaction.create({
        walletId: customerWallet.id,
        amount: 100.00,
        type: 'CREDIT',
        description: `Welcome bonus for applying referral code ${referrer.referralCode}`,
        referenceId: `REF-${referrer.id}`
      });

      // 2. Credit ₹50 Referral Bonus to Referrer (Old User)
      let referrerWallet = await Wallet.findOne({ where: { customerId: referrer.id } });
      if (!referrerWallet) {
        referrerWallet = await Wallet.create({ customerId: referrer.id, balance: 50.00 });
      } else {
        referrerWallet.balance = (parseFloat(referrerWallet.balance || 0) + 50.00).toFixed(2);
        await referrerWallet.save();
      }

      await Transaction.create({
        walletId: referrerWallet.id,
        amount: 50.00,
        type: 'CREDIT',
        description: `Referral bonus for inviting ${customer.name || customer.email || 'a friend'}`,
        referenceId: `REF-${customer.id}`
      });

      customer.referredBy = referrer.referralCode;
    }

    if (!customer.referralCode) {
      customer.referralCode = 'EMINENCE-' + crypto.randomBytes(3).toString('hex').toUpperCase();
    }

    await customer.save();
    customer = await checkAndSetProfileComplete(customer);

    const safeUser = customer.toJSON ? customer.toJSON() : { ...customer };
    if (safeUser.governmentId) {
      safeUser.governmentId = maskGovernmentId(safeUser.governmentId);
    }

    return res.status(200).json({ 
      success: true, 
      user: safeUser,
      message: rawRefCode 
        ? 'Profile updated successfully! ₹100 welcome referral bonus credited to your wallet.' 
        : 'Profile updated successfully'
    });
  } catch (error) {
    console.error('Update Profile Error:', error);
    const message = error.name === 'SequelizeUniqueConstraintError' 
      ? 'Email or Phone is already in use by another account.' 
      : 'Server error';
    return res.status(500).json({ success: false, message });
  }
};

const getProfile = async (req, res) => {
  try {
    const userId = req.user?.id;
    const userRole = req.user?.role || 'customer';

    let user;
    if (userRole === 'driver') {
      user = await Driver.findByPk(userId);
    } else {
      user = await Customer.findByPk(userId);
    }

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (userRole !== 'driver' && !user.referralCode) {
      user.referralCode = `EMINENCE-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
      await user.save();
    }

    const safeUser = user.toJSON ? user.toJSON() : { ...user };
    delete safeUser.password;
    safeUser.role = userRole;

    if (userRole !== 'driver' && userRole !== 'admin') {
      const completedCount = await Booking.count({
        where: { customerId: user.id, status: 'completed' }
      }).catch(() => 0);
      const resolvedTrips = Math.max(user.totalTrips || 0, completedCount);
      if (user.totalTrips !== resolvedTrips) {
        user.totalTrips = resolvedTrips;
        await user.save().catch(() => {});
      }
      safeUser.totalTrips = resolvedTrips;
    }

    if (userRole === 'driver' || userRole === 'admin') {
      safeUser.isProfileComplete = true;
    }
    if (safeUser.governmentId) {
      safeUser.governmentId = maskGovernmentId(safeUser.governmentId);
    }

    return res.status(200).json({ success: true, user: safeUser });
  } catch (error) {
    console.error('Get Profile Error:', error);
    return res.status(500).json({ success: false, message: 'Server error fetching profile' });
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

    const existingOtp = await Otp.findOne({ 
      where: { customerId, type }, 
      order: [['createdAt', 'DESC']] 
    });

    if (existingOtp && (Date.now() - new Date(existingOtp.createdAt).getTime()) < 60000) {
      return res.status(429).json({ success: false, message: 'Please wait 60 seconds before requesting a new OTP' });
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
      const cleanPhone = smsService.normalizeIndianPhone(customer.phone) || customer.phone;
      await smsService.sendSMS(cleanPhone, `Your EMINENCE verification code is ${code}`);
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
    let isValid = false;
    if (otpRecord.code.length !== 64) {
      isValid = (String(code) === otpRecord.code);
    } else {
      isValid = crypto.timingSafeEqual(Buffer.from(inputHash), Buffer.from(otpRecord.code));
    }

    if (!isValid) {
      otpRecord.attempts += 1;
      otpRecord.lastAttemptIp = String(req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1');
      otpRecord.lastAttemptUserAgent = String(req.headers['user-agent'] || 'Unknown Client');
      
      if (otpRecord.attempts >= 5) {
        otpRecord.lockoutUntil = new Date(Date.now() + 15 * 60000); // 15 min lockout
        otpRecord.expiresAt = new Date(Date.now() - 1000); // Invalidate OTP code completely (Issue #158)
        await otpRecord.save();
        return res.status(429).json({ success: false, message: 'Maximum OTP verification attempts exceeded. Please request a new OTP.' });
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

    const fixtureMode = process.env.NODE_ENV !== 'production' && process.env.TEST_FIXTURES === 'true';
    const cleanPhone = smsService.normalizeIndianPhone(phone) || String(phone).trim().replace(/^(\+91|91)/, '').replace(/\D/g, '');
    const fixturePhone = role === 'driver' ? process.env.SEED_DRIVER_PHONE : process.env.SEED_PHONE;
    const isDevDemo = fixtureMode && fixturePhone && process.env.SEED_OTP && cleanPhone === fixturePhone;
    if (isDevDemo) {
      return res.status(200).json({ success: true, message: 'Demo OTP sent successfully' });
    }

    // Validate phone number: strictly reject emails or non-standard phone numbers
    if (typeof phone === 'string' && (phone.includes('@') || !/^[6-9]\d{9}$/.test(cleanPhone))) {
      return res.status(400).json({
        success: false,
        message: 'Please enter a valid 10-digit Indian mobile number.'
      });
    }

    let userId;
    if (role === 'driver') {
      const Driver = require('../models/Driver');
      let driver = await Driver.findOne({ where: { phone: [cleanPhone, String(phone).trim()] } });
      if (!driver) {
        if (!fixtureMode) {
          return res.status(404).json({ success: false, message: 'Driver account not found' });
        }
        driver = await Driver.create({ phone: cleanPhone, name: 'Test Fixture Driver', licenseNumber: `TEST-${crypto.randomBytes(4).toString('hex').toUpperCase()}` });
      }
      userId = driver.id;
    } else {
      const isBusiness = role === 'business';
      const { Customer } = require('../models');
      let customer = await Customer.findOne({ where: { phone: [cleanPhone, String(phone).trim()], isBusiness } });
      if (!customer) {
        const refCode = 'EMINENCE-' + crypto.randomBytes(3).toString('hex').toUpperCase();
        customer = await Customer.create({
          phone: cleanPhone,
          isPhoneVerified: false,
          referralCode: refCode,
          isBusiness,
          name: isBusiness ? 'Business' : 'User'
        });
        const { Wallet } = require('../models');
        await Wallet.create({ customerId: customer.id, balance: 0.0 });
      }
      userId = customer.id;
    }

    const { Otp } = require('../models');

    const existingOtp = await Otp.findOne({ 
      where: { customerId: userId, type: 'phone' }, 
      order: [['createdAt', 'DESC']] 
    });
    
    if (existingOtp && (Date.now() - new Date(existingOtp.createdAt).getTime()) < 60000) {
      return res.status(429).json({ success: false, message: 'Please wait 60 seconds before requesting a new OTP' });
    }

    const code = generateOtp();
    const expiresAt = new Date(Date.now() + 10 * 60000); // 10 minutes

    const otpHash = crypto.createHash('sha256').update(code).digest('hex');

    await Otp.destroy({ where: { customerId: userId, type: 'phone' } });
    await Otp.create({
      customerId: userId,
      type: 'phone',
      code: otpHash,
      expiresAt,
      attempts: 0,
      lockoutUntil: null
    });

    await smsService.sendSMS(cleanPhone, `Your Eminence Login OTP is: ${code}. Valid for 10 minutes.`);

    return res.status(200).json({ success: true, message: 'OTP sent successfully' });
  } catch (error) {
    console.error('Phone Login Error:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

const phoneVerify = async (req, res) => {
  try {
    const { phone, code, role = 'customer', acceptedTerms = false } = req.body;
    const cleanPhone = smsService.normalizeIndianPhone(phone) || String(phone || '').trim().replace(/^(\+91|91)/, '').replace(/\D/g, '');
    const phoneCandidates = [cleanPhone, String(phone || '').trim()].filter(Boolean);
    
    // Prevent privilege escalation: only allow specific roles
    const validRoles = ['customer', 'business', 'driver'];
    const userRole = validRoles.includes(role) ? role : 'customer';
    const ipAddress = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
    const userAgent = req.headers['user-agent'] || 'Unknown Client';
    
    const fixtureMode = process.env.NODE_ENV !== 'production' && process.env.TEST_FIXTURES === 'true';
    const fixturePhones = userRole === 'driver'
      ? [process.env.SEED_DRIVER_PHONE, process.env.SEED_PHONE].filter(Boolean)
      : [process.env.SEED_PHONE].filter(Boolean);
    const isDevDemo = fixtureMode && fixturePhones.some(p => phoneCandidates.includes(p)) && process.env.SEED_OTP &&
      String(code) === String(process.env.SEED_OTP);
    
    if (isDevDemo) {
      let userObj;
      let token;
      
      if (userRole === 'driver') {
        const Driver = require('../models/Driver');
        let driver = await Driver.findOne({ where: { phone: phoneCandidates } });
        if (!driver) {
          driver = await Driver.create({ phone: cleanPhone, name: 'Test Fixture Driver', licenseNumber: `TEST-${crypto.randomBytes(4).toString('hex').toUpperCase()}` });
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
        userObj.isProfileComplete = true;
      } else {
        const isBusiness = userRole === 'business';
        const { Customer } = require('../models');
        let customer = await Customer.findOne({ where: { phone: phoneCandidates, isBusiness: isBusiness ? true : false } });
        if (!customer) {
          customer = await Customer.findOne({ where: { phone: phoneCandidates } });
        }
        if (!customer) {
          const refCode = 'EMINENCE-' + crypto.randomBytes(3).toString('hex').toUpperCase();
          customer = await Customer.create({ phone: cleanPhone, isPhoneVerified: true, referralCode: refCode, isBusiness: isBusiness ? true : false, name: isBusiness ? 'Business' : 'User' });
          const { Wallet } = require('../models');
          await Wallet.create({ customerId: customer.id, balance: 0.0 });
        } else {
          customer.isPhoneVerified = true;
          if (!customer.referralCode) {
            customer.referralCode = `EMINENCE-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
          }
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
        if (customer.name && (customer.email || customer.phone)) {
          customer.isProfileComplete = true;
          await customer.save();
        }
        
        token = jwt.sign(
          { id: customer.id, role: userRole, isProfileComplete: customer.isProfileComplete },
          getJwtSecret(),
          { expiresIn: process.env.JWT_EXPIRE || '7d' }
        );
        userObj = customer.toJSON ? customer.toJSON() : { ...customer };
        if (userObj.governmentId) {
          userObj.governmentId = maskGovernmentId(userObj.governmentId);
        }
      }

      userObj.role = userRole;
    if (userRole === 'driver' || userRole === 'admin') { userObj.isProfileComplete = true; }
      res.cookie('accessToken', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000
      });
      return res.status(200).json({ success: true, token, user: userObj });
    }

    // Normal non-demo flow
    let user;
    if (userRole === 'driver') {
      const Driver = require('../models/Driver');
      user = await Driver.findOne({ where: { phone: phoneCandidates } });
    } else {
      const isBusiness = userRole === 'business';
      const { Customer } = require('../models');
      user = await Customer.findOne({ where: { phone: phoneCandidates, isBusiness } });
      if (!user) {
        user = await Customer.findOne({ where: { phone: phoneCandidates } });
      }
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
    let isValid = false;
    if (otpRecord.code.length !== 64) {
      isValid = (String(code) === otpRecord.code);
    } else {
      isValid = crypto.timingSafeEqual(Buffer.from(inputHash), Buffer.from(otpRecord.code));
    }

    if (!isValid) {
      otpRecord.attempts += 1;
      otpRecord.lastAttemptIp = String(ipAddress);
      otpRecord.lastAttemptUserAgent = String(userAgent);
      
      if (otpRecord.attempts >= 5) {
        otpRecord.lockoutUntil = new Date(Date.now() + 15 * 60000); // 15 min lockout
        otpRecord.expiresAt = new Date(Date.now() - 1000); // Invalidate OTP code completely (Issue #158)
        await otpRecord.save();
        return res.status(429).json({ success: false, message: 'Maximum OTP verification attempts exceeded. Please request a new OTP.' });
      }
      await otpRecord.save();
      return res.status(400).json({ success: false, message: 'Invalid OTP' });
    }

    if (userRole !== 'driver') {
      user.isPhoneVerified = true;
      if (!user.referralCode) {
        user.referralCode = `EMINENCE-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
      }
      if (acceptedTerms) {
        user.termsAccepted = true;
        user.termsAcceptedAt = new Date();
        user.termsVersion = CURRENT_TERMS_VERSION;
      }
      await user.save();
      
      if (user.name && (user.email || user.phone)) {
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
    if (userRole === 'driver' || userRole === 'admin') {
      userObj.isProfileComplete = true;
    }
    if (userObj.governmentId) {
      userObj.governmentId = maskGovernmentId(userObj.governmentId);
    }

    res.cookie('accessToken', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

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

// --- DPDP / GDPR DATA COMPLIANCE ---

// Export all personal data associated with the authenticated user
const exportUserData = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const { Booking, AddressBook, Wallet, Review } = require('../models');

    let profile = null;
    if (req.user.role === 'driver') {
      profile = await Driver.findByPk(userId);
    } else {
      profile = await Customer.findByPk(userId);
    }

    if (!profile) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const [bookings, addresses, wallet, reviews, consents] = await Promise.all([
      Booking.findAll({ where: { [req.user.role === 'driver' ? 'driverId' : 'customerId']: userId } }),
      AddressBook ? AddressBook.findAll({ where: { customerId: userId } }) : [],
      Wallet ? Wallet.findOne({ where: { customerId: userId } }) : null,
      Review ? Review.findAll({ where: { [req.user.role === 'driver' ? 'driverId' : 'customerId']: userId } }) : [],
      UserConsent.findAll({ where: { userId } })
    ]);

    const sanitizedProfile = profile.toJSON ? profile.toJSON() : { ...profile };
    delete sanitizedProfile.password;
    if (sanitizedProfile.governmentId) {
      sanitizedProfile.governmentId = maskGovernmentId(sanitizedProfile.governmentId);
    }

    return res.status(200).json({
      success: true,
      exportTimestamp: new Date().toISOString(),
      compliance: 'DPDP Act 2023 / GDPR Article 20',
      data: {
        profile: sanitizedProfile,
        savedAddresses: addresses,
        bookings,
        wallet,
        reviews,
        consents
      }
    });
  } catch (error) {
    console.error('Export User Data Error:', error);
    return res.status(500).json({ success: false, message: 'Failed to generate data export' });
  }
};

// Anonymize and delete user data (DPDP Right to be Forgotten)
const deleteUserData = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const { AddressBook } = require('../models');

    if (req.user.role === 'driver') {
      const driver = await Driver.findByPk(userId);
      if (driver) {
        driver.name = 'Anonymized Driver';
        driver.phone = `DELETED_${Date.now()}`;
        driver.status = 'inactive';
        await driver.save();
      }
    } else {
      const customer = await Customer.findByPk(userId);
      if (customer) {
        customer.name = 'Anonymized Customer';
        customer.phone = `DELETED_${Date.now()}`;
        customer.email = `anonymized_${userId}@eminence.local`;
        customer.governmentId = null;
        customer.address = null;
        customer.city = null;
        customer.state = null;
        await customer.save();

        if (AddressBook) {
          await AddressBook.destroy({ where: { customerId: userId } });
        }
      }
    }

    // Clear session cookies
    res.clearCookie('accessToken');

    return res.status(200).json({
      success: true,
      message: 'Account personal data anonymized and erased successfully in compliance with DPDP guidelines'
    });
  } catch (error) {
    console.error('Delete User Data Error:', error);
    return res.status(500).json({ success: false, message: 'Failed to delete user data' });
  }
};
const bcryptjs = require('bcryptjs');

const register = async (req, res) => {
  try {
    const { name, email, phone, password, role = 'customer' } = req.body;
    
    if (!email || !password || !phone) {
      return res.status(400).json({ success: false, message: 'Email, phone, and password are required' });
    }

    const cleanPhone = String(phone).trim().replace(/^(\+91|91)/, '').replace(/\D/g, '');
    if (typeof phone === 'string' && (phone.includes('@') || !/^[6-9]\d{9}$/.test(cleanPhone))) {
      return res.status(400).json({
        success: false,
        message: 'Please enter a valid 10-digit Indian mobile number.'
      });
    }

    const salt = await bcryptjs.genSalt(10);
    const hashedPassword = await bcryptjs.hash(password, salt);

    if (role === 'driver') {
      const existingDriver = await Driver.findOne({ where: { phone } });
      if (existingDriver) return res.status(400).json({ success: false, message: 'Phone already registered as Driver' });
      
      const driver = await Driver.create({
        name: name || 'New Driver',
        email,
        phone,
        password: hashedPassword,
        licenseNumber: 'DL-' + Math.floor(Math.random()*10000)
      });
      
      return res.status(201).json({ success: true, message: 'Driver registered successfully' });
    } else {
      const isBusiness = role === 'business';
      const existingCustomer = await Customer.findOne({ where: { email } });
      if (existingCustomer) return res.status(400).json({ success: false, message: 'Email already registered' });
      
      const inputRefCode = (req.body.referralCode || req.body.referredBy || '').trim().toUpperCase();
      let referrer = null;
      if (inputRefCode) {
        referrer = await Customer.findOne({ where: { referralCode: inputRefCode } });
        if (!referrer) {
          return res.status(400).json({
            success: false,
            message: 'Invalid referral code entered. Please check and try again.'
          });
        }
      }

      const ownRefCode = 'EMINENCE-' + crypto.randomBytes(3).toString('hex').toUpperCase();
      const customer = await Customer.create({
        name: name || 'New User',
        email,
        phone: cleanPhone,
        password: hashedPassword,
        referralCode: ownRefCode,
        referredBy: referrer ? referrer.referralCode : null,
        isBusiness
      });
      const { Wallet, Transaction } = require('../models');
      const initialBonus = referrer ? 100.00 : 0.00;
      const customerWallet = await Wallet.create({ customerId: customer.id, balance: initialBonus });

      if (referrer) {
        await Transaction.create({
          walletId: customerWallet.id,
          amount: 100.00,
          type: 'CREDIT',
          description: `Welcome bonus for signing up with referral code ${referrer.referralCode}`,
          referenceId: `REF-${referrer.id}`
        });

        const referrerWallet = await Wallet.findOne({ where: { customerId: referrer.id } });
        if (referrerWallet) {
          referrerWallet.balance = (parseFloat(referrerWallet.balance || 0) + 50.00).toFixed(2);
          await referrerWallet.save();
          await Transaction.create({
            walletId: referrerWallet.id,
            amount: 50.00,
            type: 'CREDIT',
            description: `Referral bonus for inviting ${customer.name || customer.email || 'a friend'}`,
            referenceId: `REF-${customer.id}`
          });
        }
      }
      
      return res.status(201).json({ 
        success: true, 
        message: referrer 
          ? 'Customer registered successfully! ₹100 referral bonus credited to your wallet.' 
          : 'Customer registered successfully' 
      });
    }
  } catch (error) {
    console.error('Registration Error:', error);
    return res.status(500).json({ success: false, message: 'Server error during registration' });
  }
};

const { Op } = require('sequelize');

const login = async (req, res) => {
  try {
    const identifier = req.body.identifier || req.body.email;
    const { password, role = 'customer' } = req.body;
    
    if (!identifier || !password) {
      return res.status(400).json({ success: false, message: 'Identifier and password are required' });
    }

    let user;
    const searchConditions = {
      [Op.or]: [
        { email: identifier },
        { phone: identifier },
        { name: identifier }
      ]
    };

    if (role === 'driver') {
      user = await Driver.findOne({ where: searchConditions });
    } else {
      const isBusiness = role === 'business';
      user = await Customer.findOne({ 
        where: { ...searchConditions, isBusiness } 
      });
    }

    if (!user) {
      return res.status(401).json({ success: false, message: 'No account found with this email or phone number.' });
    }

    if (!user.password) {
      if (user.googleId) {
        return res.status(401).json({ 
          success: false, 
          message: 'This account was created with Google. Please click "Continue with Google" or set a password in your profile.' 
        });
      }
      return res.status(401).json({ 
        success: false, 
        message: 'This account uses OTP/Phone login. Please sign in via Phone OTP or set a password.' 
      });
    }

    const isMatch = await bcryptjs.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Incorrect password. Please try again.' });
    }

    if (role !== 'driver' && !user.referralCode) {
      user.referralCode = `EMINENCE-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
      await user.save();
    }

    const token = jwt.sign(
      { id: user.id, role, isProfileComplete: user.isProfileComplete !== false },
      getJwtSecret(),
      { expiresIn: process.env.JWT_EXPIRE || '7d' }
    );

    res.cookie('accessToken', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    const safeUser = user.toJSON ? user.toJSON() : { ...user };
    delete safeUser.password;
    safeUser.role = role;
    if (role === 'driver' || role === 'admin') { safeUser.isProfileComplete = true; }
    if (safeUser.governmentId) {
      safeUser.governmentId = maskGovernmentId(safeUser.governmentId);
    }

    return res.status(200).json({ success: true, token, user: safeUser });
  } catch (error) {
    console.error('Login Error:', error);
    return res.status(500).json({ success: false, message: 'Server error during login' });
  }
};

const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user?.id;
    const userRole = req.user?.role || 'customer';

    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 6 characters long'
      });
    }

    let user;
    if (userRole === 'driver') {
      user = await Driver.findByPk(userId);
    } else {
      user = await Customer.findByPk(userId);
    }

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // If user already had a password, verify currentPassword
    if (user.password) {
      if (!currentPassword) {
        return res.status(400).json({
          success: false,
          message: 'Current password is required to change password'
        });
      }

      const isMatch = await bcryptjs.compare(currentPassword, user.password);
      if (!isMatch) {
        return res.status(400).json({
          success: false,
          message: 'Incorrect current password'
        });
      }
    }

    const salt = await bcryptjs.genSalt(10);
    const hashedPassword = await bcryptjs.hash(newPassword, salt);
    user.password = hashedPassword;
    await user.save();

    return res.status(200).json({
      success: true,
      message: user.password ? 'Password updated successfully' : 'Password created successfully'
    });
  } catch (error) {
    console.error('Change Password Error:', error);
    return res.status(500).json({ success: false, message: 'Server error changing password' });
  }
};

const forgotPassword = async (req, res) => {
  try {
    const { identifier, method = 'email', role = 'customer' } = req.body; // method: 'email' or 'phone'

    if (!identifier) {
      return res.status(400).json({ success: false, message: 'Email or phone number is required' });
    }

    let user;
    const cleanPhone = method === 'phone' ? (smsService.normalizeIndianPhone(identifier) || String(identifier).trim().replace(/^(\+91|91)/, '').replace(/\D/g, '')) : null;
    const phoneCandidates = method === 'phone' ? [cleanPhone, String(identifier).trim()].filter(Boolean) : null;

    if (role === 'driver') {
      user = await Driver.findOne({
        where: method === 'phone' ? { phone: phoneCandidates } : { email: identifier }
      });
    } else {
      user = await Customer.findOne({
        where: method === 'phone' ? { phone: phoneCandidates } : { email: identifier }
      });
    }

    if (!user) {
      // Security: return success message without leaking account existence
      return res.status(200).json({
        success: true,
        message: `If an account exists with that ${method}, a verification OTP has been sent.`
      });
    }

    const code = generateOtp();
    const expiresAt = new Date(Date.now() + 10 * 60000);
    const otpHash = crypto.createHash('sha256').update(code).digest('hex');

    await Otp.destroy({ where: { customerId: user.id, type: method } });
    await Otp.create({
      customerId: user.id,
      type: method,
      code: otpHash,
      expiresAt,
      attempts: 0,
      lockoutUntil: null
    });

    if (method === 'email') {
      await sendEmail(
        user.email,
        'Eminence Password Reset OTP',
        `Your password reset code is ${code}. Valid for 10 minutes.`,
        `<p>Your Eminence password reset code is: <b>${code}</b></p><p>Valid for 10 minutes.</p>`
      );
    } else {
      const targetPhone = smsService.normalizeIndianPhone(user.phone) || user.phone;
      await smsService.sendSMS(targetPhone, `Your Eminence password reset OTP is ${code}. Valid for 10 minutes.`);
    }

    return res.status(200).json({
      success: true,
      message: `OTP sent successfully to your ${method}.`,
      type: method
    });
  } catch (error) {
    console.error('Forgot Password Error:', error);
    return res.status(500).json({ success: false, message: 'Server error requesting password reset' });
  }
};

const resetPassword = async (req, res) => {
  try {
    const { identifier, method = 'email', code, newPassword, role = 'customer' } = req.body;

    if (!identifier || !code || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Identifier, verification code, and new password are required'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long'
      });
    }

    let user;
    const cleanPhone = method === 'phone' ? (smsService.normalizeIndianPhone(identifier) || String(identifier).trim().replace(/^(\+91|91)/, '').replace(/\D/g, '')) : null;
    const phoneCandidates = method === 'phone' ? [cleanPhone, String(identifier).trim()].filter(Boolean) : null;

    if (role === 'driver') {
      user = await Driver.findOne({
        where: method === 'phone' ? { phone: phoneCandidates } : { email: identifier }
      });
    } else {
      user = await Customer.findOne({
        where: method === 'phone' ? { phone: phoneCandidates } : { email: identifier }
      });
    }

    if (!user) {
      return res.status(404).json({ success: false, message: 'Account not found' });
    }

    // Verify OTP
    const otpHash = crypto.createHash('sha256').update(code.trim()).digest('hex');
    const otpRecord = await Otp.findOne({
      where: { customerId: user.id, type: method },
      order: [['createdAt', 'DESC']]
    });

    if (!otpRecord) {
      return res.status(400).json({ success: false, message: 'No active OTP found. Please request a new code.' });
    }

    if (new Date() > new Date(otpRecord.expiresAt)) {
      await otpRecord.destroy();
      return res.status(400).json({ success: false, message: 'OTP has expired. Please request a new one.' });
    }

    if (otpRecord.code !== otpHash) {
      otpRecord.attempts = (otpRecord.attempts || 0) + 1;
      await otpRecord.save();
      return res.status(400).json({ success: false, message: 'Invalid OTP code' });
    }

    // Hash and update password
    const salt = await bcryptjs.genSalt(10);
    user.password = await bcryptjs.hash(newPassword, salt);
    await user.save();

    await otpRecord.destroy();

    return res.status(200).json({
      success: true,
      message: 'Password has been reset successfully. You can now login with your new password.'
    });
  } catch (error) {
    console.error('Reset Password Error:', error);
    return res.status(500).json({ success: false, message: 'Server error resetting password' });
  }
};

module.exports = {
  googleLogin,
  getProfile,
  updateProfile,
  sendOtp,
  verifyOtp,
  phoneLogin,
  phoneVerify,
  register,
  login,
  changePassword,
  forgotPassword,
  resetPassword,
  getTerms,
  acceptTerms,
  exportUserData,
  deleteUserData
};

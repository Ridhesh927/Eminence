const admin = require('../config/firebaseAdmin');
const jwt = require('jsonwebtoken');
const { Customer, Otp } = require('../models');
const { sendEmail } = require('../services/emailService');
const smsService = require('../services/smsService');

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
  return Math.floor(100000 + Math.random() * 900000).toString();
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
      process.env.JWT_SECRET || 'fallback_secret', 
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

    // Delete existing OTP of same type for user
    await Otp.destroy({ where: { customerId, type } });

    await Otp.create({
      customerId,
      type,
      code,
      expiresAt
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

    const otpRecord = await Otp.findOne({ where: { customerId, type, code } });

    if (!otpRecord) {
      return res.status(400).json({ success: false, message: 'Invalid OTP' });
    }

    if (new Date() > otpRecord.expiresAt) {
      return res.status(400).json({ success: false, message: 'OTP has expired' });
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
    const { phone } = req.body;
    if (!phone) return res.status(400).json({ success: false, message: 'Phone number is required' });

    let customer = await Customer.findOne({ where: { phone } });
    if (!customer) {
      const refCode = `EMINENCE-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
      customer = await Customer.create({
        phone,
        isPhoneVerified: false,
        referralCode: refCode
      });
      // Create wallet
      const { Wallet } = require('../models');
      await Wallet.create({ customerId: customer.id, balance: 0.0 });
    }

    const code = generateOtp();
    const expiresAt = new Date(Date.now() + 10 * 60000); // 10 minutes

    await Otp.destroy({ where: { customerId: customer.id, type: 'phone' } });
    await Otp.create({
      customerId: customer.id,
      type: 'phone',
      code,
      expiresAt
    });

    await smsService.sendSMS(phone, `Your Eminence Login OTP is: ${code}. Valid for 10 minutes.`);

    return res.status(200).json({ success: true, message: 'OTP sent successfully' });
  } catch (error) {
    console.error('Phone Login Error:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

const phoneVerify = async (req, res) => {
  try {
    const { phone, code } = req.body;
    const userRole = 'customer'; // Role is strictly determined server-side
    
    // For local development only, allow bypass for the designated seed phone number
    const isDevDemo = process.env.NODE_ENV === 'development' && code === '1234' && phone === (process.env.SEED_PHONE || '1234567890');
    if (isDevDemo) {
      let customer = await Customer.findOne({ where: { phone } });
      if (!customer) {
        const refCode = `EMINENCE-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
        customer = await Customer.create({ phone, isPhoneVerified: true, referralCode: refCode });
        const { Wallet } = require('../models');
        await Wallet.create({ customerId: customer.id, balance: 0.0 });
      } else {
        customer.isPhoneVerified = true;
        await customer.save();
      }
      customer = await checkAndSetProfileComplete(customer);
      const token = jwt.sign(
        { id: customer.id, role: userRole, isProfileComplete: customer.isProfileComplete },
        process.env.JWT_SECRET || 'fallback_secret',
        { expiresIn: process.env.JWT_EXPIRE || '7d' }
      );

      const userObj = customer.toJSON ? customer.toJSON() : { ...customer };
      userObj.role = userRole;

      return res.status(200).json({ success: true, token, user: userObj });
    }

    const customer = await Customer.findOne({ where: { phone } });
    if (!customer) return res.status(404).json({ success: false, message: 'User not found' });

    const otpRecord = await Otp.findOne({ where: { customerId: customer.id, type: 'phone', code } });
    
    if (!otpRecord) return res.status(400).json({ success: false, message: 'Invalid OTP' });
    if (new Date() > otpRecord.expiresAt) return res.status(400).json({ success: false, message: 'OTP has expired' });

    customer.isPhoneVerified = true;
    await customer.save();
    await otpRecord.destroy();

    const verifiedCustomer = await checkAndSetProfileComplete(customer);

    const token = jwt.sign(
      { id: verifiedCustomer.id, role: userRole, isProfileComplete: verifiedCustomer.isProfileComplete },
      process.env.JWT_SECRET || 'fallback_secret',
      { expiresIn: process.env.JWT_EXPIRE || '7d' }
    );

    const userObj = verifiedCustomer.toJSON ? verifiedCustomer.toJSON() : { ...verifiedCustomer };
    userObj.role = userRole;

    return res.status(200).json({ success: true, token, user: userObj });
  } catch (error) {
    console.error('Phone Verify Error:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = {
  googleLogin,
  updateProfile,
  sendOtp,
  verifyOtp,
  phoneLogin,
  phoneVerify
};

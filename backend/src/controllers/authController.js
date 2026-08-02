const admin = require('../config/firebaseAdmin');
const jwt = require('jsonwebtoken');
const { Customer, Otp } = require('../models');
const { sendEmail } = require('../services/emailService');
const { sendSMS } = require('../services/smsService');
const crypto = require('crypto');

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
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    const { uid, email, name, picture } = decodedToken;

    let customer = await Customer.findOne({ where: { email } });
    if (!customer) {
      customer = await Customer.create({
        name: name || 'Google User',
        email,
        googleId: uid,
        profilePicture: picture,
        // Assuming Google verified the email
        isEmailVerified: true 
      });
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
    const { name, phone, city, state, address, governmentId } = req.body;
    // Assume req.user is set by auth middleware
    const customerId = req.user.id; 

    let customer = await Customer.findByPk(customerId);
    if (!customer) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (name) customer.name = name;
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
    return res.status(500).json({ success: false, message: 'Server error' });
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
      // 🚀 FREE DEPLOYMENT WORKAROUND 🚀
      // Instead of calling Twilio API, we mock the SMS by logging the OTP to the console.
      // Anyone can test this by entering their phone number, and you just check your server logs.
      console.log(`\n\n================================`);
      console.log(`MOCK SMS SENT TO: ${customer.phone}`);
      console.log(`YOUR OTP IS: ${code}`);
      console.log(`================================\n\n`);
      
      // Uncomment this when you upgrade Twilio for production:
      // await sendSMS(customer.phone, `Your EMINENCE verification code is ${code}`);
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

module.exports = {
  googleLogin,
  updateProfile,
  sendOtp,
  verifyOtp
};

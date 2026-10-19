const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const { Admin } = require('../models');

// Secure JWT Secret Loader
const getJwtSecret = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('FATAL: JWT_SECRET environment variable is missing');
  }
  return secret;
};

const adminLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required' });
    }

    const admin = await Admin.findOne({ where: { email } });

    if (!admin) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    const isMatch = await bcrypt.compare(password, admin.password);

    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    const primaryEmail = (process.env.SEED_EMAIL || 'admin@eminence.com').toLowerCase();
    const isPrimary = Boolean(admin.isPrimary || (admin.email && admin.email.toLowerCase() === primaryEmail));
    const adminRole = isPrimary ? 'Superadmin' : (admin.role || 'Support Admin');

    const token = jwt.sign(
      { id: admin.id, role: 'admin', adminRole, isPrimary },
      getJwtSecret(),
      { expiresIn: process.env.JWT_EXPIRE || '1d' }
    );

    res.cookie('accessToken', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000 // 1 day
    });

    return res.status(200).json({
      success: true,
      token,
      user: {
        id: admin.id,
        email: admin.email,
        name: admin.name,
        role: 'admin',
        adminRole,
        isPrimary,
        phone: admin.phone || null
      }
    });

  } catch (error) {
    console.error('Admin Login Error:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

const registerPushToken = async (req, res) => {
  try {
    const adminId = req.user?.id;
    const { pushToken, phone } = req.body;

    if (!adminId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const admin = await Admin.findByPk(adminId);
    if (!admin) {
      return res.status(404).json({ success: false, message: 'Admin not found' });
    }

    if (pushToken !== undefined) {
      admin.pushToken = pushToken ? String(pushToken).trim() : null;
    }
    if (phone !== undefined) {
      admin.phone = phone ? String(phone).trim() : admin.phone;
    }

    await admin.save();

    return res.status(200).json({
      success: true,
      message: 'Admin device push token registered successfully',
      pushToken: admin.pushToken,
      phone: admin.phone
    });
  } catch (error) {
    console.error('Register Admin Push Token Error:', error);
    return res.status(500).json({ success: false, message: 'Server error registering push token' });
  }
};

module.exports = {
  adminLogin,
  registerPushToken
};


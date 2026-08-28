
import process from "node:process";
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { Admin } = require('../models');

const adminLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required' });
    }

    const admin = await Admin.findOne({ where: { email } });

    if (!admin) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, admin.password);

    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: admin.id, role: 'admin' },
      process.env.JWT_SECRET || 'fallback_secret',
      { expiresIn: process.env.JWT_EXPIRE || '1d' }
    );

    return res.status(200).json({
      success: true,
      token,
      user: {
        id: admin.id,
        email: admin.email,
        name: admin.name,
        role: 'admin'
      }
    });

  } catch (error) {
    console.error('Admin Login Error:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = {
  adminLogin
};

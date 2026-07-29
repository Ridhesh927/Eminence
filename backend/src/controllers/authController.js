const admin = require('../config/firebaseAdmin');
const jwt = require('jsonwebtoken');
// const { Customer } = require('../models'); // TODO: Uncomment when models are ready

const googleLogin = async (req, res) => {
  const { idToken } = req.body;
  
  if (!idToken) {
    return res.status(400).json({ success: false, message: 'Google ID token is required' });
  }

  try {
    // 1. Verify the token using Firebase Admin
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    const { uid, email, name, picture } = decodedToken;

    // 2. Find or create the user in our PostgreSQL Database (Mocked for now)
    /*
    let user = await Customer.findOne({ where: { email } });
    if (!user) {
      user = await Customer.create({
        name: name || 'Google User',
        email,
        googleId: uid,
        profilePicture: picture,
      });
    }
    */
    const user = { id: 'mock-id-123', name: name || 'Google User', email, role: 'customer' };

    // 3. Issue our own EMINENCE JWT
    const token = jwt.sign(
      { id: user.id, role: user.role }, 
      process.env.JWT_SECRET || 'fallback_secret', 
      { expiresIn: process.env.JWT_EXPIRE || '7d' }
    );

    return res.status(200).json({
      success: true,
      token,
      user
    });

  } catch (error) {
    console.error('Google Auth Error:', error);
    return res.status(401).json({ success: false, message: 'Invalid or expired Google token' });
  }
};

module.exports = {
  googleLogin
};

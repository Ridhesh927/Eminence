const express = require('express');
const router = express.Router();
const multer = require('multer');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const ivrController = require('../controllers/ivrController');

// Multer memory storage (up to 10MB audio)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype && (file.mimetype.startsWith('audio/') || file.mimetype === 'application/octet-stream')) {
      cb(null, true);
    } else {
      cb(null, true); // Permissive for mobile variations (wav, ogg, webm, mp3)
    }
  }
});

// Soft auth middleware: attaches user if token is present, but allows guest/telephony callers
const optionalAuth = (req, _res, next) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret');
      req.user = decoded;
    } catch (_) {}
  }
  next();
};

const voiceQueryLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 60, // limit each IP to 60 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false
});

// Health & Status
router.get('/health', ivrController.getHealth);

// REST Voice Query (Mobile / Web Support Chat mic recording)
router.post('/voice-query', voiceQueryLimiter, optionalAuth, upload.single('audio'), ivrController.handleVoiceQuery);

// Telephony Webhooks (Twilio / Exotel Inbound Call & Recording)
router.post('/webhook', ivrController.handleIncomingWebhook);
router.get('/webhook', ivrController.handleIncomingWebhook);
router.post('/recording-callback', ivrController.handleRecordingCallback);

module.exports = router;

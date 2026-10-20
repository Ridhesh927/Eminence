const express = require('express');
const { createOrder, verifyPayment, razorpayWebhook } = require('../controllers/paymentController');
const { generateInvoice } = require('../controllers/invoiceController');
const { sendEmail } = require('../services/emailService');
const { apiLimiter, contactLimiter, paymentLimiter, webhookLimiter } = require('../middleware/rateLimiter');
const protect = require('../middleware/authMiddleware');
const crypto = require('crypto');
const { z } = require('zod');

const router = express.Router();

// Razorpay Payment Endpoints (protected by authentication & per-user rate limiting)
router.post('/payment/create-order', paymentLimiter, protect, createOrder);
router.post('/razorpay-order', paymentLimiter, protect, createOrder);
router.post('/payment/verify', paymentLimiter, protect, verifyPayment);
router.post('/razorpay-verify', paymentLimiter, protect, verifyPayment);
router.post('/razorpay-webhook', webhookLimiter, razorpayWebhook);

// Invoices (protected by authentication: requires valid bearer token, cookie, or query token)
router.get('/invoice/:bookingId', apiLimiter, protect, generateInvoice);

// WhatsApp Webhooks
router.get('/whatsapp-webhook', webhookLimiter, (req, res) => {
  const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN;
  if (!verifyToken && process.env.NODE_ENV === 'production') {
    return res.status(500).json({ error: 'WHATSAPP_VERIFY_TOKEN required in production' });
  }
  const tokenToMatch = verifyToken || 'eminence_secret_token';
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode && token) {
    if (mode === 'subscribe' && token === tokenToMatch) {
      if (typeof challenge !== 'string' || !/^[A-Za-z0-9_-]+$/.test(challenge)) {
        return res.status(400).send('Invalid challenge');
      }

      console.log('WhatsApp Webhook Verified!');
      return res.type('text/plain').status(200).send(challenge);
    } else {
      return res.sendStatus(403);
    }
  } else {
    return res.status(400).send('Bad Request');
  }
});

router.post('/whatsapp-webhook', webhookLimiter, (req, res) => {
  const signature = req.headers['x-hub-signature-256'];
  const appSecret = process.env.WHATSAPP_APP_SECRET;

  if (appSecret) {
    if (!signature) {
      return res.status(401).json({ success: false, message: 'Missing webhook signature' });
    }
    const rawPayload = JSON.stringify(req.body);
    const expectedSignature = 'sha256=' + crypto.createHmac('sha256', appSecret).update(rawPayload).digest('hex');
    try {
      if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
        return res.status(403).json({ success: false, message: 'Invalid webhook signature' });
      }
    } catch {
      return res.status(403).json({ success: false, message: 'Invalid webhook signature length' });
    }
  } else if (process.env.NODE_ENV === 'production') {
    return res.status(401).json({ success: false, message: 'WHATSAPP_APP_SECRET required for webhook verification in production' });
  }

  const body = req.body;

  if (body.object) {
    if (body.entry && body.entry[0].changes && body.entry[0].changes[0] && body.entry[0].changes[0].value.messages) {
      const from = body.entry[0].changes[0].value.messages[0].from;
      const msgBody = body.entry[0].changes[0].value.messages[0].text?.body || '';
      console.log(`Incoming WhatsApp message from ${from}: ${msgBody}`);
    } else if (body.entry && body.entry[0].changes && body.entry[0].changes[0].value.statuses) {
      const status = body.entry[0].changes[0].value.statuses[0].status;
      const recipientId = body.entry[0].changes[0].value.statuses[0].recipient_id;
      console.log(`WhatsApp message to ${recipientId} is now ${status}`);
    }
    res.sendStatus(200);
  } else {
    res.sendStatus(404);
  }
});

const escapeHtml = (value) => String(value)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;');

// Reject unexpected fields as well as malformed or oversized contact data.
const contactSchema = z.strictObject({
  name: z.string().trim().min(2).max(100),
  email: z.string().email().max(254),
  message: z.string().trim().min(10).max(5000),
});

const validateContactMessage = (req, res, next) => {
  const result = contactSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ error: 'Invalid contact message.' });
  }
  req.body = result.data;
  next();
};

router.post('/contact-message', contactLimiter, validateContactMessage, async (req, res) => {
  try {
    const { name, email, message } = req.body;

    const subject = `New Contact Form Submission from ${name}`;
    const text = `Name: ${name}\nEmail: ${email}\n\nMessage:\n${message}`;

    // Send to support email (plain text only to prevent HTML injection/XSS alerts)
    await sendEmail('eminence.support.helpline@gmail.com', subject, text);

    // Optionally send an auto-reply to the user
    await sendEmail(
      email,
      'We received your message!',
      'Thank you for reaching out. We will get back to you shortly.',
      '<p>Thank you for reaching out. We will get back to you shortly.</p>'
    );

    res.status(200).json({ success: true, message: 'Message sent successfully' });
  } catch (error) {
    console.error('Error handling contact message:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

module.exports = router;

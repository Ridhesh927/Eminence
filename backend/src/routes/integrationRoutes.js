const express = require('express');
const { createOrder, verifyPayment, razorpayWebhook } = require('../controllers/paymentController');
const { generateInvoice } = require('../controllers/invoiceController');
const { sendEmail } = require('../services/emailService');
const { apiLimiter, authLimiter, contactLimiter } = require('../middleware/rateLimiter');

const router = express.Router();

// Razorpay Payment Endpoints with rate limiting
router.post('/payment/create-order', authLimiter, createOrder);
router.post('/payment/verify', authLimiter, verifyPayment);
router.post('/razorpay-webhook', razorpayWebhook);

// Invoices
router.get('/invoice/:bookingId', apiLimiter, generateInvoice);

// WhatsApp Webhooks
router.get('/whatsapp-webhook', (req, res) => {
  const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN || 'eminence_secret_token';
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode && token) {
    if (mode === 'subscribe' && token === verifyToken) {
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

router.post('/whatsapp-webhook', (req, res) => {
  const body = req.body;

  if (body.object) {
    if (body.entry && body.entry[0].changes && body.entry[0].changes[0] && body.entry[0].changes[0].value.messages) {
      const from = body.entry[0].changes[0].value.messages[0].from;
      const msgBody = body.entry[0].changes[0].value.messages[0].text.body;
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

const { z } = require('zod');

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

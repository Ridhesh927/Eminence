const express = require('express');
const { createOrder, verifyPayment, razorpayWebhook } = require('../controllers/paymentController');
const { generateInvoice } = require('../controllers/invoiceController');

const router = express.Router();

// Razorpay
router.post('/payment/create-order', createOrder);
router.post('/payment/verify', verifyPayment);
router.post('/razorpay-webhook', razorpayWebhook);

// Invoices
router.get('/invoice/:bookingId', generateInvoice);

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

const { sendEmail } = require('../services/emailService');

const escapeHtml = (value) => String(value)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;');

router.post('/contact-message', async (req, res) => {
  try {
    const { name, email, message } = req.body;
    
    if (!name || !email || !message) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    const subject = `New Contact Form Submission from ${name}`;
    const text = `Name: ${name}\nEmail: ${email}\n\nMessage:\n${message}`;
    const safeName = escapeHtml(name);
    const safeEmail = escapeHtml(email);
    const safeMessage = escapeHtml(message).replace(/\n/g, '<br/>');
    const html = `
      <h3>New Contact Message</h3>
      <p><strong>Name:</strong> ${safeName}</p>
      <p><strong>Email:</strong> ${safeEmail}</p>
      <p><strong>Message:</strong><br/>${safeMessage}</p>
    `;

    // Send to support email
    await sendEmail('eminence.support.helpline@gmail.com', subject, text, html);
    
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

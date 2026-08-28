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
      console.log('WhatsApp Webhook Verified!');
      res.status(200).send(challenge);
    } else {
      res.sendStatus(403);
    }
  } else {
    res.status(400).send('Bad Request');
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

module.exports = router;

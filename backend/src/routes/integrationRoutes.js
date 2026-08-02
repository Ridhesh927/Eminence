const express = require('express');
const { createOrder, verifyPayment } = require('../controllers/paymentController');
const { generateInvoice } = require('../controllers/invoiceController');

const router = express.Router();

// Razorpay
router.post('/payment/create-order', createOrder);
router.post('/payment/verify', verifyPayment);

// Invoices
router.get('/invoice/:bookingId', generateInvoice);

module.exports = router;

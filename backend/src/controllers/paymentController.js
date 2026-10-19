const Razorpay = require('razorpay');
const crypto = require('crypto');

const isPaymentFixtureMode = process.env.NODE_ENV !== 'production' && process.env.TEST_FIXTURES === 'true';
const hasRazorpayConfig = Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);
const razorpay = hasRazorpayConfig ? new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
}) : null;

const createOrder = async (req, res) => {
  try {
    const { bookingId, receipt } = req.body;
    if (!bookingId) {
      return res.status(400).json({ success: false, message: 'Booking ID is required' });
    }
    
    const { Booking } = require('../models');
    const booking = await Booking.findByPk(bookingId);
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }
    
    const amount = booking.estimatedFare;
    if (!amount || amount <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid booking amount' });
    }

    const options = {
      amount: Math.round(amount * 100), // amount in smallest currency unit
      currency: "INR",
      receipt: receipt || bookingId
    };
    
    // Fallback logic if keys are mock
    const isMock = isPaymentFixtureMode && (!hasRazorpayConfig || process.env.RAZORPAY_KEY_ID === 'rzp_test_mock');
    if (isMock) {
      if (process.env.NODE_ENV === 'production') {
        return res.status(503).json({
          success: false,
          message: 'Payment gateway is misconfigured or disabled in production mode.'
        });
      }
      console.log('Using Mock Razorpay Order in non-production mode');
      return res.status(200).json({
        success: true,
        order: {
          id: 'order_mock_' + crypto.randomInt(100000, 1000000),
          amount: options.amount,
          currency: 'INR'
        }
      });
    }

    const order = await razorpay.orders.create(options);
    res.status(200).json({ success: true, order });
  } catch (error) {
    console.error('Error creating order:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const verifyPayment = async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, bookingId } = req.body;

    const isMock = isPaymentFixtureMode && (!hasRazorpayConfig || process.env.RAZORPAY_KEY_ID === 'rzp_test_mock');
    if (isMock) {
      if (process.env.NODE_ENV === 'production') {
        return res.status(503).json({
          success: false,
          message: 'Mock payment verification is prohibited in production mode.'
        });
      }
      if (bookingId) {
        try {
          const { Booking } = require('../models');
          await Booking.update({ paymentStatus: 'completed' }, { where: { id: bookingId } });
        } catch (dbErr) {
          console.warn('Could not update booking payment status:', dbErr.message);
        }
      }
      return res.status(200).json({ success: true, message: 'Payment verified (Mock)' });
    }

    const sign = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSign = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(sign.toString())
      .digest("hex");

    if (razorpay_signature === expectedSign) {
      if (bookingId) {
        try {
          const { Booking } = require('../models');
          await Booking.update({ paymentStatus: 'completed' }, { where: { id: bookingId } });
        } catch (dbErr) {
          console.warn('Could not update booking payment status:', dbErr.message);
        }
      }
      return res.status(200).json({ success: true, message: 'Payment verified successfully' });
    } else {
      return res.status(400).json({ success: false, message: 'Invalid signature' });
    }
  } catch (error) {
    console.error('Error verifying payment:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const razorpayWebhook = async (req, res) => {
  try {
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
    if (!secret) {
      console.error('FATAL: RAZORPAY_WEBHOOK_SECRET environment variable is not configured');
      return res.status(500).json({ success: false, message: 'Server configuration error: RAZORPAY_WEBHOOK_SECRET is required' });
    }
    const signature = req.headers['x-razorpay-signature'];
    const body = req.rawBody;

    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(body)
      .digest('hex');

    if (expectedSignature === signature) {
      const event = req.body.event;
      // You would typically use req.body.payload.payment.entity.notes.booking_id here
      
      if (event === 'payment.captured') {
        console.log('[Webhook] Payment captured successfully for Razorpay ID:', req.body.payload.payment.entity.id);
        // Find booking and update paymentStatus = 'completed'
      } else if (event === 'payment.failed') {
        console.log('[Webhook] Payment failed for Razorpay ID:', req.body.payload.payment.entity.id);
        // Find booking and update paymentStatus = 'failed'
      }
      
      return res.status(200).send('OK');
    } else {
      return res.status(400).send('Invalid signature');
    }
  } catch (error) {
    console.error('Error in Razorpay Webhook:', error);
    return res.status(500).send('Server error');
  }
};

module.exports = {
  createOrder,
  verifyPayment,
  razorpayWebhook
};


import process from "node:process";
const Razorpay = require('razorpay');
const crypto = require('crypto');

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || 'rzp_test_mock',
  key_secret: process.env.RAZORPAY_KEY_SECRET || 'mock_secret'
});

const createOrder = async (req, res) => {
  try {
    const { amount, receipt } = req.body;
    const options = {
      amount: amount * 100, // amount in smallest currency unit
      currency: "INR",
      receipt: receipt
    };
    
    // Fallback logic if keys are mock
    if (process.env.RAZORPAY_KEY_ID === 'rzp_test_mock' || !process.env.RAZORPAY_KEY_ID) {
      console.log('Using Mock Razorpay Order');
      return res.status(200).json({
        success: true,
        order: {
          id: 'order_mock_' + Math.floor(Math.random() * 1000000),
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

const verifyPayment = (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    if (process.env.RAZORPAY_KEY_ID === 'rzp_test_mock' || !process.env.RAZORPAY_KEY_ID) {
      return res.status(200).json({ success: true, message: 'Payment verified (Mock)' });
    }

    const sign = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSign = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(sign.toString())
      .digest("hex");

    if (razorpay_signature === expectedSign) {
      return res.status(200).json({ success: true, message: 'Payment verified successfully' });
    } else {
      return res.status(400).json({ success: false, message: 'Invalid signature' });
    }
  } catch (error) {
    console.error('Error verifying payment:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = {
  createOrder,
  verifyPayment
};

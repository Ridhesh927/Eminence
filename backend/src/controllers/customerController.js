const Razorpay = require('razorpay');
const crypto = require('crypto');
const { Customer, Wallet, Transaction, Booking } = require('../models');

const isPaymentFixtureMode = process.env.NODE_ENV !== 'production' && process.env.TEST_FIXTURES === 'true';
const hasRazorpayConfig = Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);
const razorpay = hasRazorpayConfig ? new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
}) : null;

/**
 * Create a Razorpay Order for Eminence Pro subscription (₹499 / mo)
 */
const createProOrder = async (req, res) => {
  try {
    const customerId = req.user?.id;
    const customer = await Customer.findByPk(customerId);
    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer account not found' });
    }

    if (customer.isPro) {
      return res.status(400).json({ success: false, message: 'You already have an active Eminence Pro subscription!' });
    }

    const proAmount = 499; // ₹499
    const isMock = isPaymentFixtureMode && (!hasRazorpayConfig || process.env.RAZORPAY_KEY_ID === 'rzp_test_mock');

    if (isMock) {
      return res.status(200).json({
        success: true,
        keyId: 'rzp_test_mock',
        order: {
          id: `order_pro_${Date.now()}`,
          amount: proAmount * 100,
          currency: 'INR',
          receipt: `rcpt_pro_${customerId.substring(0, 8)}_${Date.now()}`
        }
      });
    }

    const options = {
      amount: proAmount * 100, // in paise
      currency: 'INR',
      receipt: `rcpt_pro_${customerId.substring(0, 8)}_${Date.now()}`,
      notes: {
        customerId,
        plan: 'Eminence Pro Monthly',
        type: 'subscription'
      }
    };

    const order = await razorpay.orders.create(options);
    return res.status(200).json({
      success: true,
      keyId: process.env.RAZORPAY_KEY_ID,
      order
    });
  } catch (error) {
    console.error('Create Pro Order Error:', error);
    return res.status(500).json({ success: false, message: 'Failed to initiate Eminence Pro subscription order' });
  }
};

/**
 * Verify Razorpay payment and activate Eminence Pro subscription
 */
const verifyProSubscription = async (req, res) => {
  try {
    const customerId = req.user?.id;
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    const customer = await Customer.findByPk(customerId);
    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer account not found' });
    }

    const isMock = isPaymentFixtureMode && (!hasRazorpayConfig || process.env.RAZORPAY_KEY_ID === 'rzp_test_mock');

    if (isMock) {
      if (process.env.NODE_ENV === 'production') {
        return res.status(400).json({
          success: false,
          message: 'Mock payment verification is prohibited in production mode.'
        });
      }
    } else {
      if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
        return res.status(400).json({
          success: false,
          message: 'Missing required Razorpay verification credentials'
        });
      }

      const sign = razorpay_order_id + '|' + razorpay_payment_id;
      const expectedSign = crypto
        .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
        .update(sign)
        .digest('hex');

      if (razorpay_signature !== expectedSign) {
        return res.status(400).json({ success: false, message: 'Invalid payment signature. Verification failed.' });
      }
    }

    // Activate Eminence Pro
    customer.isPro = true;
    await customer.save();

    // Log transaction if customer wallet exists
    try {
      const wallet = await Wallet.findOne({ where: { customerId: customer.id } });
      if (wallet) {
        await Transaction.create({
          walletId: wallet.id,
          amount: 499.00,
          type: 'DEBIT',
          description: 'Eminence Pro Subscription (1 Month)',
          referenceId: razorpay_payment_id || `PAY-PRO-${Date.now()}`
        });
      }
    } catch (txErr) {
      console.warn('Pro subscription transaction recording note:', txErr.message);
    }

    return res.status(200).json({
      success: true,
      message: 'Congratulations! Eminence Pro has been activated on your account.',
      isPro: true,
      user: {
        id: customer.id,
        name: customer.name,
        email: customer.email,
        isPro: true
      }
    });
  } catch (error) {
    console.error('Verify Pro Subscription Error:', error);
    return res.status(500).json({ success: false, message: 'Server error verifying Pro subscription payment' });
  }
};

/**
 * Get current Eminence Pro status and perks
 */
const getProStatus = async (req, res) => {
  try {
    const customerId = req.user?.id;
    const customer = await Customer.findByPk(customerId);
    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }

    const completedCount = await Booking.count({
      where: { customerId: customer.id, status: 'completed' }
    }).catch(() => 0);
    const resolvedTrips = Math.max(customer.totalTrips || 0, completedCount);
    if (customer.totalTrips !== resolvedTrips) {
      customer.totalTrips = resolvedTrips;
      await customer.save().catch(() => {});
    }

    return res.status(200).json({
      success: true,
      isPro: Boolean(customer.isPro),
      totalTrips: resolvedTrips,
      perks: {
        discountPercent: 5,
        zeroCancellationFee: true,
        priorityAllocation: true
      }
    });
  } catch (error) {
    console.error('Get Pro Status Error:', error);
    return res.status(500).json({ success: false, message: 'Server error retrieving Pro status' });
  }
};

module.exports = {
  createProOrder,
  verifyProSubscription,
  getProStatus
};

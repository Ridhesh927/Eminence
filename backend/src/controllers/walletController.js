const { Wallet, Transaction, Customer, PromoCode, sequelize } = require('../models');
const { Op } = require('sequelize');
const crypto = require('crypto');
const Razorpay = require('razorpay');

const isPaymentFixtureMode = process.env.NODE_ENV !== 'production' && process.env.TEST_FIXTURES === 'true';
const hasRazorpayConfig = Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);
const razorpay = hasRazorpayConfig ? new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
}) : null;

const getWallet = async (req, res) => {
  try {
    const customerId = req.user.id;
    
    // Fetch the customer to get the referral code
    const customer = await Customer.findByPk(customerId);
    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }

    let wallet = await Wallet.findOne({
      where: { customerId },
      include: [{
        model: Transaction,
        as: 'transactions',
        order: [['createdAt', 'DESC']],
        limit: 10
      }]
    });

    // Fallback: If wallet doesn't exist (e.g. for older users), create it now
    if (!wallet) {
      wallet = await Wallet.create({ customerId, balance: 0.0 });
      wallet.dataValues.transactions = [];
    }
    
    // Make sure customer has a referral code
    if (!customer.referralCode) {
      customer.referralCode = `EMINENCE-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
      await customer.save();
    }

    return res.status(200).json({
      success: true,
      wallet: {
        balance: parseFloat(wallet.balance) || 0,
        currency: wallet.currency,
        transactions: wallet.transactions || []
      },
      balance: parseFloat(wallet.balance) || 0,
      referralCode: customer.referralCode,
      referredBy: customer.referredBy
    });
  } catch (error) {
    console.error('Get Wallet Error:', error);
    return res.status(500).json({ success: false, message: 'Server error fetching wallet' });
  }
};

const applyReferralCode = async (req, res) => {
  try {
    const { referralCode } = req.body;
    const customerId = req.user.id;

    if (!referralCode || !referralCode.trim()) {
      return res.status(400).json({ success: false, message: 'Referral or promo code is required' });
    }

    const cleanCode = referralCode.trim().toUpperCase();

    const transaction = await sequelize.transaction();
    try {
      const currentCustomer = await Customer.findByPk(customerId, { transaction, lock: transaction.LOCK.UPDATE });
      if (!currentCustomer) {
        await transaction.rollback();
        return res.status(404).json({ success: false, message: 'Customer not found' });
      }

      // 1. Check if it matches an admin-managed PromoCode first
      const promo = await PromoCode.findOne({ 
        where: { code: cleanCode },
        transaction,
        lock: transaction.LOCK.UPDATE
      });

      if (promo) {
        if (!promo.isActive) {
          await transaction.rollback();
          return res.status(400).json({ success: false, message: 'This promo code is currently inactive.' });
        }

        if (promo.expiresAt && new Date() > new Date(promo.expiresAt)) {
          await transaction.rollback();
          return res.status(400).json({ success: false, message: 'This promo code has expired.' });
        }

        if (promo.maxUses && promo.usedCount >= promo.maxUses) {
          await transaction.rollback();
          return res.status(400).json({ success: false, message: 'This promo code has reached its maximum usage limit.' });
        }

        let currentWallet = await Wallet.findOne({ where: { customerId: currentCustomer.id }, transaction });
        if (!currentWallet) {
          currentWallet = await Wallet.create({ customerId: currentCustomer.id, balance: 0 }, { transaction });
        }

        // Verify that this customer has not already redeemed this promo code
        const existingPromoUse = await Transaction.findOne({
          where: {
            walletId: currentWallet.id,
            [Op.or]: [
              { referenceId: String(promo.id) },
              { description: `Promo Code Applied: ${promo.code}` }
            ]
          },
          transaction
        });

        if (existingPromoUse) {
          await transaction.rollback();
          return res.status(400).json({ success: false, message: 'You have already used this promo code.' });
        }

        const discount = parseFloat(promo.discountValue) || 100.0;
        currentWallet.balance = parseFloat(currentWallet.balance || 0) + discount;
        await currentWallet.save({ transaction });

        await Transaction.create({
          walletId: currentWallet.id,
          amount: discount,
          type: 'CREDIT',
          description: `Promo Code Applied: ${promo.code}`,
          referenceId: String(promo.id)
        }, { transaction });

        promo.usedCount = (promo.usedCount || 0) + 1;
        await promo.save({ transaction });

        // Note: Do not mutate currentCustomer.referredBy for promo codes,
        // so promo codes and customer peer referrals remain independent.

        await transaction.commit();

        return res.status(200).json({
          success: true,
          message: `Promo code applied! ₹${discount} added to your wallet.`,
          newBalance: currentWallet.balance,
          discount
        });
      }

      // 2. Otherwise, check for Customer Peer Referral code
      if (currentCustomer.referralCode && currentCustomer.referralCode.toUpperCase() === cleanCode) {
        await transaction.rollback();
        return res.status(400).json({ success: false, message: 'You cannot use your own referral code' });
      }

      if (currentCustomer.referredBy) {
        await transaction.rollback();
        return res.status(400).json({ success: false, message: 'You have already used a referral code' });
      }

      let referrer = null;
      if (cleanCode !== 'EMINENCE-XYZ123') {
        referrer = await Customer.findOne({ where: { referralCode: cleanCode }, transaction, lock: transaction.LOCK.UPDATE });
        if (!referrer) {
          await transaction.rollback();
          return res.status(404).json({ success: false, message: 'Invalid referral code or promo code' });
        }
      }

      // Reward amounts: ₹100 for new user, ₹50 for referrer
      const NEW_USER_REWARD = 100.0;
      const REFERRER_REWARD = 50.0;

      // Update current customer wallet
      let currentWallet = await Wallet.findOne({ where: { customerId: currentCustomer.id }, transaction });
      if (!currentWallet) {
        currentWallet = await Wallet.create({ customerId: currentCustomer.id, balance: 0 }, { transaction });
      }
      currentWallet.balance = parseFloat(currentWallet.balance || 0) + NEW_USER_REWARD;
      await currentWallet.save({ transaction });

      await Transaction.create({
        walletId: currentWallet.id,
        amount: NEW_USER_REWARD,
        type: 'CREDIT',
        description: 'Signup Referral Bonus',
        referenceId: referrer ? referrer.id : 'PROMO_CODE'
      }, { transaction });

      // Update referrer wallet (Skip for demo code)
      if (referrer) {
        let referrerWallet = await Wallet.findOne({ where: { customerId: referrer.id }, transaction });
        if (!referrerWallet) {
          referrerWallet = await Wallet.create({ customerId: referrer.id, balance: 0 }, { transaction });
        }
        referrerWallet.balance = parseFloat(referrerWallet.balance || 0) + REFERRER_REWARD;
        await referrerWallet.save({ transaction });

        await Transaction.create({
          walletId: referrerWallet.id,
          amount: REFERRER_REWARD,
          type: 'CREDIT',
          description: 'Friend Referral Bonus',
          referenceId: currentCustomer.id
        }, { transaction });
      }

      // Mark current customer as referred by peer
      currentCustomer.referredBy = cleanCode;
      await currentCustomer.save({ transaction });

      await transaction.commit();

      return res.status(200).json({
        success: true,
        message: `Referral applied! ₹${NEW_USER_REWARD} added to your wallet.`,
        newBalance: currentWallet.balance,
        discount: NEW_USER_REWARD
      });
    } catch (error) {
      await transaction.rollback();
      console.error('Apply Referral Error:', error);
      return res.status(500).json({ success: false, message: 'Server error applying referral' });
    }
  } catch (error) {
    console.error('Apply Referral Error:', error);
    return res.status(500).json({ success: false, message: 'Server error applying referral' });
  }
};

/**
 * Create a Razorpay Order for adding funds to customer wallet
 * POST /api/wallet/create-order
 */
const createWalletOrder = async (req, res) => {
  try {
    const { amount } = req.body;
    const parsedAmount = parseFloat(amount);

    if (isNaN(parsedAmount) || parsedAmount < 10) {
      return res.status(400).json({
        success: false,
        message: 'Minimum top-up amount is ₹10'
      });
    }

    if (parsedAmount > 100000) {
      return res.status(400).json({
        success: false,
        message: 'Maximum top-up amount is ₹1,00,000 per transaction'
      });
    }

    const options = {
      amount: Math.round(parsedAmount * 100), // amount in paise
      currency: "INR",
      receipt: `topup_${req.user.id.slice(0, 8)}_${Date.now()}`,
      notes: {
        customerId: req.user.id,
        purpose: 'WALLET_TOPUP'
      }
    };

    const isMock = isPaymentFixtureMode && (!hasRazorpayConfig || process.env.RAZORPAY_KEY_ID === 'rzp_test_mock');
    if (isMock) {
      if (process.env.NODE_ENV === 'production') {
        return res.status(503).json({
          success: false,
          message: 'Payment gateway is misconfigured or disabled in production mode.'
        });
      }
      return res.status(200).json({
        success: true,
        order: {
          id: 'order_mock_' + crypto.randomInt(100000, 1000000),
          amount: options.amount,
          currency: 'INR'
        },
        keyId: 'rzp_test_mock'
      });
    }

    const order = await razorpay.orders.create(options);
    return res.status(200).json({
      success: true,
      order,
      keyId: process.env.RAZORPAY_KEY_ID
    });
  } catch (error) {
    console.error('Create Wallet Order Error:', error);
    return res.status(500).json({
      success: false,
      message: error.error?.description || 'Server error creating payment order'
    });
  }
};

/**
 * Verify Razorpay payment and credit customer wallet
 * POST /api/wallet/verify-funds
 */
const verifyWalletFunds = async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, amount } = req.body;
    const parsedAmount = parseFloat(amount);

    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return res.status(400).json({ success: false, message: 'Valid top-up amount is required' });
    }

    const isMock = isPaymentFixtureMode && (!hasRazorpayConfig || process.env.RAZORPAY_KEY_ID === 'rzp_test_mock');
    if (isMock) {
      if (process.env.NODE_ENV === 'production') {
        return res.status(503).json({
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

      const sign = razorpay_order_id + "|" + razorpay_payment_id;
      const expectedSign = crypto
        .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
        .update(sign.toString())
        .digest("hex");

      if (razorpay_signature !== expectedSign) {
        return res.status(400).json({ success: false, message: 'Invalid payment signature' });
      }
    }

    const customerId = req.user.id;
    const paymentRef = razorpay_payment_id || `mock_pay_${Date.now()}`;

    const transaction = await sequelize.transaction();
    try {
      // Idempotency check: don't credit twice for the same payment reference
      const existingTx = await Transaction.findOne({
        where: { referenceId: paymentRef },
        transaction
      });

      let wallet = await Wallet.findOne({
        where: { customerId },
        transaction,
        lock: transaction.LOCK.UPDATE
      });

      if (!wallet) {
        wallet = await Wallet.create({ customerId, balance: 0.0 }, { transaction });
      }

      if (existingTx) {
        await transaction.rollback();
        return res.status(200).json({
          success: true,
          message: 'Payment already verified and credited to wallet',
          newBalance: parseFloat(wallet.balance)
        });
      }

      const currentBalance = parseFloat(wallet.balance) || 0;
      const updatedBalance = Number((currentBalance + parsedAmount).toFixed(2));
      wallet.balance = updatedBalance;
      await wallet.save({ transaction });

      const newTx = await Transaction.create({
        walletId: wallet.id,
        amount: parsedAmount,
        type: 'CREDIT',
        description: `Wallet Recharge via Razorpay`,
        referenceId: paymentRef
      }, { transaction });

      await transaction.commit();

      return res.status(200).json({
        success: true,
        message: `₹${parsedAmount.toFixed(2)} added to your wallet successfully!`,
        newBalance: updatedBalance,
        transaction: newTx
      });
    } catch (err) {
      await transaction.rollback();
      console.error('Wallet Credit Transaction Error:', err);
      return res.status(500).json({ success: false, message: 'Failed to update wallet balance' });
    }
  } catch (error) {
    console.error('Verify Wallet Funds Error:', error);
    return res.status(500).json({ success: false, message: 'Server error verifying payment' });
  }
};

module.exports = {
  getWallet,
  applyReferralCode,
  createWalletOrder,
  verifyWalletFunds
};

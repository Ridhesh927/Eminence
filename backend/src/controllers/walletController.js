const { Wallet, Transaction, Customer } = require('../models');

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
      customer.referralCode = `EMINENCE-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
      await customer.save();
    }

    return res.status(200).json({
      success: true,
      wallet: {
        balance: wallet.balance,
        currency: wallet.currency,
        transactions: wallet.transactions || []
      },
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

    if (!referralCode) {
      return res.status(400).json({ success: false, message: 'Referral code is required' });
    }

    const currentCustomer = await Customer.findByPk(customerId);
    if (!currentCustomer) return res.status(404).json({ success: false, message: 'Customer not found' });

    if (currentCustomer.referredBy) {
      return res.status(400).json({ success: false, message: 'You have already used a referral code' });
    }

    if (currentCustomer.referralCode === referralCode) {
      return res.status(400).json({ success: false, message: 'You cannot use your own referral code' });
    }

    // Find the referrer
    const referrer = await Customer.findOne({ where: { referralCode } });
    if (!referrer) {
      return res.status(404).json({ success: false, message: 'Invalid referral code' });
    }

    // Reward amount (can be configured)
    const REWARD_AMOUNT = 100.0;

    // 1. Update current customer wallet
    let currentWallet = await Wallet.findOne({ where: { customerId: currentCustomer.id } });
    if (!currentWallet) {
      currentWallet = await Wallet.create({ customerId: currentCustomer.id, balance: 0 });
    }
    currentWallet.balance += REWARD_AMOUNT;
    await currentWallet.save();

    await Transaction.create({
      walletId: currentWallet.id,
      amount: REWARD_AMOUNT,
      type: 'CREDIT',
      description: 'Signup Referral Bonus',
      referenceId: referrer.id
    });

    // 2. Update referrer wallet
    let referrerWallet = await Wallet.findOne({ where: { customerId: referrer.id } });
    if (!referrerWallet) {
      referrerWallet = await Wallet.create({ customerId: referrer.id, balance: 0 });
    }
    referrerWallet.balance += REWARD_AMOUNT;
    await referrerWallet.save();

    await Transaction.create({
      walletId: referrerWallet.id,
      amount: REWARD_AMOUNT,
      type: 'CREDIT',
      description: 'Friend Referral Bonus',
      referenceId: currentCustomer.id
    });

    // 3. Mark current customer as referred
    currentCustomer.referredBy = referralCode;
    await currentCustomer.save();

    return res.status(200).json({
      success: true,
      message: `Referral applied! ₹${REWARD_AMOUNT} added to your wallet.`,
      newBalance: currentWallet.balance
    });

  } catch (error) {
    console.error('Apply Referral Error:', error);
    return res.status(500).json({ success: false, message: 'Server error applying referral' });
  }
};

module.exports = {
  getWallet,
  applyReferralCode
};

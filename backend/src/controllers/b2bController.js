const { Customer, B2BContract, Invoice } = require('../models');

const registerBusiness = async (req, res) => {
  try {
    const customerId = req.user.id;
    const { companyName, gstNumber } = req.body;

    if (!companyName || !gstNumber) {
      return res.status(400).json({ success: false, message: 'Company Name and GST Number are required' });
    }

    const customer = await Customer.findByPk(customerId);
    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }

    // Set to business and grant initial credit limit (mocking approval process for now)
    customer.isBusiness = true;
    customer.companyName = companyName;
    customer.gstNumber = gstNumber;
    customer.billingMode = 'postpaid';
    customer.creditLimit = 50000.00; // 50,000 INR limit
    customer.creditUsed = 0.00;
    await customer.save();

    return res.status(200).json({
      success: true,
      message: 'Successfully upgraded to Corporate Account',
      data: customer
    });
  } catch (error) {
    console.error('B2B Register Error:', error);
    return res.status(500).json({ success: false, message: 'Server error registering business' });
  }
};

const requestContract = async (req, res) => {
  try {
    const customerId = req.user.id;
    const { vehicleType, vehicleCount, startDate, endDate } = req.body;

    const customer = await Customer.findByPk(customerId);
    if (!customer || !customer.isBusiness) {
      return res.status(403).json({ success: false, message: 'Only verified businesses can request contracts' });
    }

    const contract = await B2BContract.create({
      customerId,
      vehicleType,
      vehicleCount,
      startDate,
      endDate,
      status: 'pending' // Admin must approve and set daily rate
    });

    return res.status(201).json({
      success: true,
      message: 'Contract requested successfully. Our team will contact you with the daily rate.',
      contract
    });
  } catch (error) {
    console.error('Request Contract Error:', error);
    return res.status(500).json({ success: false, message: 'Server error requesting contract' });
  }
};

const getContracts = async (req, res) => {
  try {
    const customerId = req.user.id;
    const contracts = await B2BContract.findAll({
      where: { customerId },
      order: [['createdAt', 'DESC']]
    });

    return res.status(200).json({ success: true, contracts });
  } catch (error) {
    console.error('Get Contracts Error:', error);
    return res.status(500).json({ success: false, message: 'Server error fetching contracts' });
  }
};

const getInvoices = async (req, res) => {
  try {
    const customerId = req.user.id;
    const invoices = await Invoice.findAll({
      where: { customerId },
      order: [['year', 'DESC'], ['month', 'DESC']]
    });

    return res.status(200).json({ success: true, invoices });
  } catch (error) {
    console.error('Fetch Invoices Error:', error);
    return res.status(500).json({ success: false, message: 'Server error fetching invoices' });
  }
};

const batchBookings = async (req, res) => {
  try {
    // In a real implementation, we would parse req.file using multer
    // and map the CSV rows to bulk Booking.bulkCreate() logic.
    // For now, we mock the success response.
    
    // Simulating processing delay
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    return res.status(200).json({
      success: true,
      message: 'Batch bookings scheduled successfully',
      processedCount: 15
    });
  } catch (error) {
    console.error('Batch Bookings Error:', error);
    return res.status(500).json({ success: false, message: 'Server error processing batch bookings' });
  }
};

module.exports = {
  registerBusiness,
  requestContract,
  getContracts,
  getInvoices,
  batchBookings
};

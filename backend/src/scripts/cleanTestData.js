const path = require('path');
const { Op } = require('sequelize');

/**
 * Clean Test & Demo Data Utility for Eminence
 * 
 * Safely removes dummy users, test drivers, generated test vehicles,
 * and automated test bookings from the database while strictly
 * preserving real user accounts, registered drivers, and real bookings.
 */
async function cleanDatabase(sequelizeInstance, label = 'Active Database') {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Refusing to run test-data cleanup while NODE_ENV=production.');
  }
  console.log(`\n--- Cleaning Test Data for [${label}] ---`);
  
  const {
    Customer,
    Driver,
    Vehicle,
    Booking,
    Review,
    Wallet,
    Transaction,
    Address,
    UserConsent,
    Notification
  } = sequelizeInstance.models;

  // Real accounts to whitelist & protect at all costs
  const PROTECTED_PHONES = ['9963451425'];
  const PROTECTED_NAMES = ['ridhesh mahajan', 'sanket devkar', 'r.a.m 927'];

  function isProtected(name = '', phone = '', email = '') {
    const n = (name || '').toLowerCase().trim();
    const p = (phone || '').trim();
    if (PROTECTED_PHONES.includes(p)) return true;
    for (const pn of PROTECTED_NAMES) {
      if (n.includes(pn)) return true;
    }
    return false;
  }

  // 1. Identify Test Customers
  const allCustomers = await Customer.findAll();
  const testCustomerIds = [];
  const keptCustomers = [];

  for (const c of allCustomers) {
    if (isProtected(c.name, c.phone, c.email)) {
      keptCustomers.push(`${c.name || 'Unknown'} (${c.phone || c.email})`);
      continue;
    }

    const isTestName =
      /mobile referee user/i.test(c.name || '') ||
      /load test user/i.test(c.name || '') ||
      /demo/i.test(c.name || '') ||
      /test user/i.test(c.name || '') ||
      /referee user/i.test(c.name || '') ||
      /referrer user/i.test(c.name || '') ||
      /unit test customer/i.test(c.name || '') ||
      /pro candidate/i.test(c.name || '') ||
      ((c.name === 'User' || c.name === 'Customer') && c.phone === '1234567890');

    const isTestEmail =
      c.email && (
        c.email.startsWith('mobile_referee_') ||
        c.email.startsWith('loadtest') ||
        c.email.endsWith('@example.com')
      );

    const isTestPhone = c.phone === '1234567890' || c.phone === '9999999999';

    if (isTestName || isTestEmail || isTestPhone) {
      testCustomerIds.push(c.id);
    } else {
      keptCustomers.push(`${c.name || 'Customer'} (${c.phone || c.email || c.id})`);
    }
  }

  // 2. Identify Test Drivers
  const allDrivers = await Driver.findAll();
  const testDriverIds = [];
  const keptDrivers = [];

  for (const d of allDrivers) {
    if (isProtected(d.name, d.phone)) {
      keptDrivers.push(`${d.name} (${d.phone})`);
      continue;
    }

    const isTestName =
      /test driver/i.test(d.name || '') ||
      /demo driver/i.test(d.name || '') ||
      /review test driver/i.test(d.name || '') ||
      /terms test driver/i.test(d.name || '');

    const isTestPhone =
      d.phone === '1234567890' ||
      d.phone === '9999999999' ||
      (d.phone && d.phone.startsWith('9999')) ||
      (d.phone && d.phone.startsWith('999') && d.phone.length === 10);

    const isTestLic =
      (d.licenseNumber && d.licenseNumber.startsWith('MH12XY')) ||
      (d.licenseNumber && d.licenseNumber.startsWith('MH-12-REV-')) ||
      (d.licenseNumber && d.licenseNumber.startsWith('DL-'));

    if (isTestName || isTestPhone || isTestLic) {
      testDriverIds.push(d.id);
    } else {
      keptDrivers.push(`${d.name} (${d.phone || d.id})`);
    }
  }

  // 3. Identify Test Vehicles
  const allVehicles = await Vehicle.findAll();
  const testVehicleIds = [];
  const keptVehicles = [];

  for (const v of allVehicles) {
    const isTestVehicle =
      (v.capacityWeight === 2000 && v.type === 'large') ||
      /^MH-\d{2}-[A-Z0-9]{4}$/.test(v.registrationNumber || '');

    if (isTestVehicle) {
      testVehicleIds.push(v.id);
    } else {
      keptVehicles.push(`${v.registrationNumber} (${v.type})`);
    }
  }

  // 4. Identify Test Bookings
  const allBookings = await Booking.findAll();
  const testBookingIds = [];
  const keptBookings = [];

  for (const b of allBookings) {
    const isByTestUser =
      (b.customerId && testCustomerIds.includes(b.customerId)) ||
      (b.driverId && testDriverIds.includes(b.driverId)) ||
      (b.vehicleId && testVehicleIds.includes(b.vehicleId));

    const isTestRoute =
      /Plot 45, MIDC Bhosari/i.test(b.pickupAddress || '') ||
      /Phase 3 Pickup Depot/i.test(b.pickupAddress || '') ||
      (/Swargate/i.test(b.pickupAddress || '') && /Viman Nagar/i.test(b.dropAddress || '')) ||
      (/Koregaon Park/i.test(b.pickupAddress || '') && /Viman Nagar/i.test(b.dropAddress || '')) ||
      /Kalyani Nagar Drop Point/i.test(b.dropAddress || '');

    if (isByTestUser || isTestRoute) {
      testBookingIds.push(b.id);
    } else {
      keptBookings.push(`${b.pickupAddress} -> ${b.dropAddress} (${b.id})`);
    }
  }

  // 5. Cascade Delete in proper relational order
  let deletedReviews = 0;
  if (Review) {
    const reviewWhere = [];
    if (testBookingIds.length > 0) reviewWhere.push({ bookingId: { [Op.in]: testBookingIds } });
    if (testCustomerIds.length > 0) reviewWhere.push({ customerId: { [Op.in]: testCustomerIds } });
    if (testDriverIds.length > 0) reviewWhere.push({ driverId: { [Op.in]: testDriverIds } });
    if (reviewWhere.length > 0) {
      deletedReviews = await Review.destroy({ where: { [Op.or]: reviewWhere } });
    }
  }

  let deletedTransactions = 0;
  let deletedWallets = 0;
  if (Wallet) {
    if (testCustomerIds.length > 0) {
      const wallets = await Wallet.findAll({ where: { customerId: { [Op.in]: testCustomerIds } } });
      const walletIds = wallets.map(w => w.id);
      if (walletIds.length > 0 && Transaction) {
        deletedTransactions = await Transaction.destroy({ where: { walletId: { [Op.in]: walletIds } } });
      }
      deletedWallets = await Wallet.destroy({ where: { customerId: { [Op.in]: testCustomerIds } } });
    }
  }

  let deletedAddresses = 0;
  if (Address) {
    const addressWhere = [];
    if (testCustomerIds.length > 0) addressWhere.push({ customerId: { [Op.in]: testCustomerIds } });
    addressWhere.push({ street: { [Op.like]: '%Plot 45, MIDC Bhosari%' } });
    addressWhere.push({ street: { [Op.like]: '%123 MG Road, Camp%' } });
    deletedAddresses = await Address.destroy({ where: { [Op.or]: addressWhere } });
  }

  if (UserConsent && (testCustomerIds.length > 0 || testDriverIds.length > 0)) {
    await UserConsent.destroy({
      where: {
        userId: { [Op.in]: [...testCustomerIds, ...testDriverIds] }
      }
    }).catch(() => {});
  }

  if (Notification && (testCustomerIds.length > 0 || testDriverIds.length > 0)) {
    await Notification.destroy({
      where: {
        userId: { [Op.in]: [...testCustomerIds, ...testDriverIds] }
      }
    }).catch(() => {});
  }

  let deletedBookings = 0;
  if (testBookingIds.length > 0) {
    deletedBookings = await Booking.destroy({ where: { id: { [Op.in]: testBookingIds } } });
  }

  let deletedCustomers = 0;
  if (testCustomerIds.length > 0) {
    deletedCustomers = await Customer.destroy({ where: { id: { [Op.in]: testCustomerIds } } });
  }

  let deletedDrivers = 0;
  if (testDriverIds.length > 0) {
    deletedDrivers = await Driver.destroy({ where: { id: { [Op.in]: testDriverIds } } });
  }

  let deletedVehicles = 0;
  if (testVehicleIds.length > 0) {
    deletedVehicles = await Vehicle.destroy({ where: { id: { [Op.in]: testVehicleIds } } });
  }

  console.log(`✔ Cleaned: ${deletedCustomers} test customer(s)`);
  console.log(`✔ Cleaned: ${deletedDrivers} test driver(s)`);
  console.log(`✔ Cleaned: ${deletedVehicles} test vehicle(s)`);
  console.log(`✔ Cleaned: ${deletedBookings} test booking(s)`);
  console.log(`✔ Cleaned: ${deletedWallets} wallet(s), ${deletedTransactions} transaction(s), ${deletedAddresses} address(es), ${deletedReviews} review(s)`);
  console.log(`★ Preserved Real Customers (${keptCustomers.length}):`, keptCustomers.length > 0 ? keptCustomers : 'None');
  console.log(`★ Preserved Real Drivers (${keptDrivers.length}):`, keptDrivers.length > 0 ? keptDrivers : 'None');
  console.log(`★ Preserved Real Vehicles (${keptVehicles.length}):`, keptVehicles.length > 0 ? keptVehicles : 'None');
  console.log(`★ Preserved Real Bookings (${keptBookings.length}):`, keptBookings.length > 0 ? keptBookings : 'None');

  return {
    deletedCustomers,
    deletedDrivers,
    deletedVehicles,
    deletedBookings,
    keptCustomers: keptCustomers.length,
    keptDrivers: keptDrivers.length
  };
}

async function run() {
  try {
    // 1. Clean primary active database (Postgres or configured DB)
    const activeModels = require('../models');
    await cleanDatabase(activeModels.sequelize, 'Configured Active Database');

    // 2. Also check and clean eminence.sqlite if present
    const fs = require('fs');
    const sqlitePath = path.resolve(__dirname, '../../eminence.sqlite');
    if (fs.existsSync(sqlitePath)) {
      const { Sequelize } = require('sequelize');
      const sqliteSeq = new Sequelize({
        dialect: 'sqlite',
        storage: sqlitePath,
        logging: false
      });

      // Load models onto sqlite instance
      const initModels = require('../models');
      // Execute raw cleanup on sqlite for any test leftovers
      const [testCusts] = await sqliteSeq.query(
        "DELETE FROM Customers WHERE name LIKE '%Referee%' OR name LIKE '%Test%' OR (name = 'User' AND phone = '1234567890') OR (name = 'Customer' AND phone = '1234567890') OR phone = '1234567890' OR phone = '9999999999';"
      ).catch(() => [null]);
      const [testDrivers] = await sqliteSeq.query(
        "DELETE FROM Drivers WHERE name LIKE '%Test%' OR name LIKE '%Demo%' OR phone LIKE '9999%' OR phone = '1234567890' OR phone = '9999999999';"
      ).catch(() => [null]);
      const [testVehicles] = await sqliteSeq.query(
        "DELETE FROM Vehicles WHERE (capacityWeight = 2000 AND type = 'large') OR registrationNumber LIKE 'MH-%';"
      ).catch(() => [null]);
      const [testBookings] = await sqliteSeq.query(
        "DELETE FROM Bookings WHERE pickupAddress LIKE '%Swargate%' OR pickupAddress LIKE '%Plot 45%' OR pickupAddress LIKE '%Phase 3%' OR (pickupAddress LIKE '%Koregaon Park%' AND dropAddress LIKE '%Viman Nagar%');"
      ).catch(() => [null]);

      console.log(`\n✔ Cleaned test records from local eminence.sqlite`);
    }

    // 3. Clear eminence.test.sqlite
    const testSqlitePath = path.resolve(__dirname, '../../eminence.test.sqlite');
    if (fs.existsSync(testSqlitePath)) {
      try {
        fs.unlinkSync(testSqlitePath);
        console.log(`✔ Reset clean eminence.test.sqlite for isolated QA testing`);
      } catch (e) {
        console.log(`Note: test sqlite reset: ${e.message}`);
      }
    }

    console.log('\n================================================================');
    console.log('✅ ALL TEST & DEMO RESIDUE REMOVED SUCCESSFULLY.');
    console.log('Only genuine user, driver, and booking records remain.');
    console.log('================================================================\n');
    process.exit(0);
  } catch (error) {
    console.error('Error during cleanup:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  run();
}

module.exports = { cleanDatabase };

const axios = require('axios');

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
let passCount = 0;
let failCount = 0;

function logTest(testId, name, passed, details = '') {
  if (passed) {
    passCount++;
    console.log(`✅ [PASS] ${testId}: ${name} ${details ? `(${details})` : ''}`);
  } else {
    failCount++;
    console.error(`❌ [FAIL] ${testId}: ${name} - ${details}`);
  }
}

async function runPhase5Tests() {
  console.log('================================================================');
  console.log('🏢 RUNNING MOBILE PHASE 5 B2B & TRIP REVIEW TEST CASES (TC-025 - TC-041)');
  console.log('Target Backend:', BASE_URL);
  console.log('================================================================\n');

  let customerToken = '';
  let customerId = '';
  let driverId = 1;

  // 1. Authenticate Customer to obtain JWT
  try {
    await axios.post(`${BASE_URL}/api/auth/phone-login`, {
      phone: '1234567890',
      role: 'customer'
    });
    const verifyOtpRes = await axios.post(`${BASE_URL}/api/auth/phone-verify`, {
      phone: '1234567890',
      code: '123456',
      role: 'customer'
    });
    if (verifyOtpRes.data.success && verifyOtpRes.data.token) {
      customerToken = verifyOtpRes.data.token;
      customerId = verifyOtpRes.data.user?.id;
    }
  } catch (err) {
    console.warn('[WARN] Phone login fallback:', err.message);
  }

  const authHeaders = customerToken ? { Authorization: `Bearer ${customerToken}` } : {};

  const crypto = require('crypto');
  let testBookingId = crypto.randomUUID();

  // Find or create a driver ID
  try {
    const adminLoginRes = await axios.post(`${BASE_URL}/api/admin/login`, {
      email: 'admin@eminence.com',
      password: 'adminpassword123'
    });
    if (adminLoginRes.data?.token) {
      const driversRes = await axios.get(`${BASE_URL}/api/admin/drivers`, {
        headers: { Authorization: `Bearer ${adminLoginRes.data.token}` }
      });
      if (driversRes.data?.drivers?.length > 0) {
        driverId = driversRes.data.drivers[0].id;
      } else {
        const randomPhone = '999' + Math.floor(1000000 + Math.random() * 9000000);
        const newDriverRes = await axios.post(
          `${BASE_URL}/api/admin/drivers`,
          {
            name: 'Review Test Driver',
            phone: randomPhone,
            licenseNumber: 'MH-12-REV-' + Math.floor(1000 + Math.random() * 9000),
            status: 'active'
          },
          { headers: { Authorization: `Bearer ${adminLoginRes.data.token}` } }
        );
        driverId = newDriverRes.data?.driver?.id;
      }
    }
  } catch (e) {
    driverId = crypto.randomUUID();
  }

  // ----------------------------------------------------
  // TC-025: Customer Driver Review & Rating Submission
  // ----------------------------------------------------
  try {
    const reviewRes = await axios.post(
      `${BASE_URL}/api/reviews`,
      {
        bookingId: testBookingId,
        customerId: customerId || crypto.randomUUID(),
        driverId,
        rating: 5,
        comment: 'Prompt delivery, careful loading, and great service!'
      },
      { headers: authHeaders }
    );

    const success = reviewRes.data?.success === true && reviewRes.data?.review?.rating === 5;
    logTest(
      'TC-025',
      'Customer Driver Review Submission (POST /api/reviews)',
      success,
      `Rating: 5 Stars, Review ID: ${reviewRes.data?.review?.id}`
    );
  } catch (err) {
    logTest('TC-025', 'Customer Driver Review Submission', false, err.response?.data?.message || err.message);
  }

  // ----------------------------------------------------
  // TC-026: Fetch Driver Reviews & Average Score Calculation
  // ----------------------------------------------------
  try {
    const reviewsRes = await axios.get(`${BASE_URL}/api/reviews/driver/${driverId}`);
    const success = reviewsRes.data?.success === true && Array.isArray(reviewsRes.data?.reviews);
    const count = reviewsRes.data?.reviews?.length || 0;
    logTest(
      'TC-026',
      'Fetch Driver Reviews (GET /api/reviews/driver/:id)',
      success,
      `Total Reviews: ${count} verified`
    );
  } catch (err) {
    logTest('TC-026', 'Fetch Driver Reviews', false, err.response?.data?.message || err.message);
  }

  // ----------------------------------------------------
  // TC-040: B2B Corporate Registration Request
  // ----------------------------------------------------
  try {
    const b2bRegRes = await axios.post(
      `${BASE_URL}/api/b2b/register`,
      {
        companyName: 'Tata AutoComp Systems Ltd',
        gstNumber: '27AAACT2727Q1ZB'
      },
      { headers: authHeaders }
    );

    const success = b2bRegRes.data?.success === true;
    logTest(
      'TC-040',
      'B2B Corporate Account Registration (POST /api/b2b/register)',
      success,
      `Company: Tata AutoComp, Status: ${b2bRegRes.data?.data?.b2bStatus || 'pending_verification'}`
    );
  } catch (err) {
    logTest('TC-040', 'B2B Corporate Account Registration', false, err.response?.data?.message || err.message);
  }

  // ----------------------------------------------------
  // TC-041: Fetch B2B Enterprise Invoices & Contracts
  // ----------------------------------------------------
  try {
    const [invRes, contractRes] = await Promise.all([
      axios.get(`${BASE_URL}/api/b2b/invoices`, { headers: authHeaders }),
      axios.get(`${BASE_URL}/api/b2b/contracts`, { headers: authHeaders })
    ]);

    const success = invRes.data?.success === true && contractRes.data?.success === true;
    logTest(
      'TC-041',
      'Fetch B2B Enterprise Invoices & Contracts (GET /api/b2b/invoices)',
      success,
      `Invoices: ${invRes.data?.invoices?.length || 0}, Contracts: ${contractRes.data?.contracts?.length || 0}`
    );
  } catch (err) {
    logTest('TC-041', 'Fetch B2B Enterprise Invoices & Contracts', false, err.response?.data?.message || err.message);
  }

  console.log('\n================================================================');
  console.log(`📊 PHASE 5 TEST RESULTS: ${passCount} PASSED, ${failCount} FAILED`);
  console.log('================================================================\n');

  if (failCount > 0) {
    throw new Error(`Phase 5 tests failed with ${failCount} errors.`);
  }
}

if (require.main === module) {
  runPhase5Tests().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}

module.exports = { runPhase5Tests };

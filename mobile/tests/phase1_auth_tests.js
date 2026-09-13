const axios = require('axios');

const BASE_URL = 'http://localhost:3000';
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

async function runPhase1Tests() {
  console.log('====================================================');
  console.log('🚀 RUNNING MOBILE PHASE 1 AUTH TEST CASES (TC-001 - TC-004)');
  console.log('Target Backend:', BASE_URL);
  console.log('====================================================\n');

  let customerToken = '';
  let adminToken = '';

  // ----------------------------------------------------
  // TC-001: Customer Phone Login (OTP Flow)
  // ----------------------------------------------------
  try {
    const sendOtpRes = await axios.post(`${BASE_URL}/api/auth/phone-login`, {
      phone: '1234567890',
      role: 'customer'
    });
    const otpSent = sendOtpRes.data.success === true;

    const verifyOtpRes = await axios.post(`${BASE_URL}/api/auth/phone-verify`, {
      phone: '1234567890',
      code: '123456',
      role: 'customer'
    });
    
    const verifySuccess = verifyOtpRes.data.success === true && !!verifyOtpRes.data.token;
    customerToken = verifyOtpRes.data.token;
    const userName = verifyOtpRes.data.user?.name;

    logTest('TC-001', 'Customer Phone Login (OTP Flow)', otpSent && verifySuccess, `User: ${userName}`);
  } catch (err) {
    logTest('TC-001', 'Customer Phone Login (OTP Flow)', false, err.response?.data?.message || err.message);
  }

  // ----------------------------------------------------
  // TC-002: Admin Login
  // ----------------------------------------------------
  try {
    const adminRes = await axios.post(`${BASE_URL}/api/admin/login`, {
      email: 'admin@eminence.com',
      password: 'adminpassword123'
    });

    const success = adminRes.data.success === true && !!adminRes.data.token && adminRes.data.user?.role === 'admin';
    adminToken = adminRes.data.token;
    logTest('TC-002', 'Admin Login with valid credentials', success, `Role: ${adminRes.data.user?.role}`);
  } catch (err) {
    logTest('TC-002', 'Admin Login with valid credentials', false, err.response?.data?.message || err.message);
  }

  // ----------------------------------------------------
  // TC-003: Invalid Admin Login
  // ----------------------------------------------------
  try {
    let rejectedAsExpected = false;
    let returnedMessage = '';
    try {
      await axios.post(`${BASE_URL}/api/admin/login`, {
        email: 'admin@eminence.com',
        password: 'wrongpassword999'
      });
    } catch (err) {
      if (err.response && err.response.status === 401) {
        rejectedAsExpected = true;
        returnedMessage = err.response.data?.message;
      }
    }

    logTest('TC-003', 'Invalid Admin Login returns 401 error', rejectedAsExpected, returnedMessage);
  } catch (err) {
    logTest('TC-003', 'Invalid Admin Login returns 401 error', false, err.message);
  }

  // ----------------------------------------------------
  // TC-004: Route Guard (Unauthorized Access)
  // ----------------------------------------------------
  try {
    let unauthBlocked = false;
    let authAllowed = false;

    // 1. Calling protected endpoint without token
    try {
      await axios.get(`${BASE_URL}/api/admin/drivers`);
    } catch (err) {
      if (err.response && (err.response.status === 401 || err.response.status === 403)) {
        unauthBlocked = true;
      }
    }

    // 2. Calling protected endpoint with valid admin token
    if (adminToken) {
      try {
        const authRes = await axios.get(`${BASE_URL}/api/admin/drivers`, {
          headers: { Authorization: `Bearer ${adminToken}` }
        });
        if (authRes.status === 200) {
          authAllowed = true;
        }
      } catch (e) {
        console.error('Error fetching drivers with token:', e.message);
      }
    }

    logTest('TC-004', 'Route Guard & Middleware (Unauthorized Blocked / Authorized Allowed)', unauthBlocked && authAllowed, `Unauth Blocked: ${unauthBlocked}, Auth Allowed: ${authAllowed}`);
  } catch (err) {
    logTest('TC-004', 'Route Guard & Middleware', false, err.message);
  }

  // ----------------------------------------------------
  // TC-005: Terms & Conditions Public Fetch & Acceptance
  // ----------------------------------------------------
  try {
    const termsRes = await axios.get(`${BASE_URL}/api/auth/terms`);
    const termsOk = termsRes.data.success === true && termsRes.data.terms?.version === 'v1.0';

    let acceptOk = false;
    if (customerToken) {
      const acceptRes = await axios.post(
        `${BASE_URL}/api/auth/accept-terms`,
        { version: 'v1.0' },
        { headers: { Authorization: `Bearer ${customerToken}` } }
      );
      acceptOk = acceptRes.data.success === true && acceptRes.data.consent?.termsVersion === 'v1.0';
    }

    logTest('TC-005', 'Terms & Conditions Fetch & Consent Audit', termsOk && acceptOk, `Version: ${termsRes.data.terms?.version}`);
  } catch (err) {
    logTest('TC-005', 'Terms & Conditions Fetch & Consent Audit', false, err.response?.data?.message || err.message);
  }

  console.log('\n====================================================');
  console.log(`SUMMARY: ${passCount} Passed, ${failCount} Failed`);
  console.log('====================================================');

  if (failCount > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runPhase1Tests();

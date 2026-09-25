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

async function runPhase3Tests() {
  console.log('================================================================');
  console.log('🚚 RUNNING MOBILE PHASE 3 DRIVER & LOGISTICS TEST CASES (TC-020 - TC-024)');
  console.log('Target Backend:', BASE_URL);
  console.log('================================================================\n');

  let driverToken = '';
  let driverId = '';
  let customerToken = '';
  let testBookingId = '';

  // 0. Setup: Authenticate Driver & Customer
  try {
    // Authenticate Driver via phone-verify
    const driverAuthRes = await axios.post(`${BASE_URL}/api/auth/phone-verify`, {
      phone: '1234567890',
      code: '123456',
      role: 'driver',
    });
    driverToken = driverAuthRes.data.token;
    driverId = driverAuthRes.data.user.id;

    // Authenticate Customer to create a real test booking
    const custAuthRes = await axios.post(`${BASE_URL}/api/auth/phone-verify`, {
      phone: '1234567890',
      code: '123456',
      role: 'customer',
    });
    customerToken = custAuthRes.data.token;
    customerId = custAuthRes.data.user.id;
  } catch (err) {
    console.error('Setup Auth Failed:', err.response?.data?.message || err.message);
    process.exit(1);
  }

  const driverHeaders = {
    headers: { Authorization: `Bearer ${driverToken}` },
  };
  const customerHeaders = {
    headers: { Authorization: `Bearer ${customerToken}` },
  };

  // ----------------------------------------------------------------
  // TC-020: Driver Dashboard Access & Online/Offline Duty Toggle
  // ----------------------------------------------------------------
  try {
    // 1. Check Driver Profile
    const initialStatusRes = await axios.patch(
      `${BASE_URL}/api/drivers/${driverId}/toggle`,
      {},
      driverHeaders
    );
    const toggled1 = initialStatusRes.data?.success === true;
    const status1 = initialStatusRes.data?.status;

    // Toggle back to active
    const secondStatusRes = await axios.patch(
      `${BASE_URL}/api/drivers/${driverId}/toggle`,
      {},
      driverHeaders
    );
    const toggled2 = secondStatusRes.data?.success === true;
    const status2 = secondStatusRes.data?.status;

    logTest(
      'TC-020',
      'Driver Dashboard Access & Duty Toggle',
      toggled1 && toggled2,
      `Toggled status: ${status1} -> ${status2}`
    );
  } catch (err) {
    logTest('TC-020', 'Driver Dashboard Access & Duty Toggle', false, err.response?.data?.message || err.message);
  }

  // ----------------------------------------------------------------
  // TC-021: AI Demand Surge Heatmap
  // ----------------------------------------------------------------
  try {
    const heatmapRes = await axios.get(`${BASE_URL}/api/drivers/heatmap`, driverHeaders);
    const success = heatmapRes.data?.success === true;
    const hotspots = heatmapRes.data?.data?.hotspots;
    const hasHotspots = Array.isArray(hotspots) && hotspots.length > 0;
    const sample = hasHotspots ? hotspots[0] : null;

    logTest(
      'TC-021',
      'AI Demand Surge Heatmap API',
      success && hasHotspots && !!sample?.lat && !!sample?.surgeMultiplier,
      `Zones: ${hotspots?.length}, Peak Hotspot: ${sample?.name} (${sample?.surgeMultiplier}x)`
    );
  } catch (err) {
    logTest('TC-021', 'AI Demand Surge Heatmap API', false, err.response?.data?.message || err.message);
  }

  // ----------------------------------------------------------------
  // TC-022: Driver Payslip Generation
  // ----------------------------------------------------------------
  try {
    const payslipRes = await axios.get(`${BASE_URL}/api/drivers/${driverId}/payslip`, driverHeaders);
    const payslip = payslipRes.data?.payslip;
    const isValidPayslip =
      payslipRes.data?.success === true &&
      payslip &&
      payslip.grossEarnings === 15000 &&
      payslip.platformFee === 2250 &&
      payslip.tdsTax === 150 &&
      payslip.netPayout === 12600;

    logTest(
      'TC-022',
      'Driver Payslip Generation',
      isValidPayslip,
      `Gross: ₹${payslip?.grossEarnings}, Net: ₹${payslip?.netPayout}`
    );
  } catch (err) {
    logTest('TC-022', 'Driver Payslip Generation', false, err.response?.data?.message || err.message);
  }

  // ----------------------------------------------------------------
  // TC-023: WMS Barcode Scan (Simulation)
  // ----------------------------------------------------------------
  try {
    const scanRes = await axios.post(
      `${BASE_URL}/api/drivers/scan-inventory`,
      {
        barcode: 'EMN-BOX-001',
        expectedStatus: 'Loaded',
      },
      driverHeaders
    );
    const isScanValid =
      scanRes.data?.success === true &&
      scanRes.data?.item?.barcode === 'EMN-BOX-001' &&
      scanRes.data?.item?.status === 'Loaded';

    logTest(
      'TC-023',
      'WMS Barcode Scan (Simulation)',
      isScanValid,
      `Barcode: ${scanRes.data?.item?.barcode}, Status: ${scanRes.data?.item?.status}`
    );
  } catch (err) {
    logTest('TC-023', 'WMS Barcode Scan (Simulation)', false, err.response?.data?.message || err.message);
  }

  // ----------------------------------------------------------------
  // TC-024: Driver Full Trip Lifecycle (Accept -> Arrived -> In-Transit -> PoD Complete)
  // ----------------------------------------------------------------
  try {
    // 1. Create a customer booking to accept
    const bookingRes = await axios.post(
      `${BASE_URL}/api/bookings`,
      {
        pickupAddress: 'Phase 3 Pickup Depot, Pune',
        dropAddress: 'Kalyani Nagar Drop Point, Pune',
        drops: ['Kalyani Nagar Drop Point, Pune'],
        tempoType: 'small',
        weight: 120,
        goodsType: 'Automotive Parts',
        date: new Date().toISOString().split('T')[0],
        time: '11:00',
        estimatedFare: 450,
        paymentMethod: 'online',
        customerId,
      },
      customerHeaders
    );
    testBookingId = bookingRes.data?.booking?.id;

    // 2. Driver Accepts Trip
    const acceptRes = await axios.put(
      `${BASE_URL}/api/bookings/${testBookingId}/status`,
      { status: 'driver_assigned', driverId },
      driverHeaders
    );
    const isAccepted = acceptRes.data?.success === true;

    // 3. Driver Arrived at Pickup
    const arrivedRes = await axios.put(
      `${BASE_URL}/api/bookings/${testBookingId}/status`,
      { status: 'arrived' },
      driverHeaders
    );
    const isArrived = arrivedRes.data?.success === true;

    // 4. Driver Verifies Start OTP & Starts Trip
    const transitRes = await axios.put(
      `${BASE_URL}/api/bookings/${testBookingId}/status`,
      { status: 'in_transit' },
      driverHeaders
    );
    const isTransit = transitRes.data?.success === true;

    // 5. Driver Completes Delivery with Blockchain PoD
    const mockPodHash = '0x8f3c72b109e4a3b8d21c' + Date.now().toString(16);
    const completeRes = await axios.post(
      `${BASE_URL}/api/bookings/${testBookingId}/complete`,
      { podHash: mockPodHash },
      driverHeaders
    );
    const isCompleted = completeRes.data?.success === true;

    logTest(
      'TC-024',
      'Driver Trip Lifecycle (Accept, Arrive, In-Transit, PoD Complete)',
      isAccepted && isArrived && isTransit && isCompleted,
      `Booking ${testBookingId} -> Completed with PoD Hash`
    );
  } catch (err) {
    logTest('TC-024', 'Driver Trip Lifecycle (Accept, Arrive, In-Transit, PoD Complete)', false, err.response?.data?.message || err.message);
  }

  // ----------------------------------------------------------------
  // SUMMARY
  // ----------------------------------------------------------------
  console.log('\n================================================================');
  console.log(`📊 PHASE 3 TEST RESULTS: ${passCount} PASSED, ${failCount} FAILED`);
  console.log('================================================================\n');

  if (failCount > 0) {
    process.exit(1);
  } else {
    console.log('🎉 ALL PHASE 3 DRIVER & LOGISTICS TEST CASES PASSED SUCCESSFULLY!\n');
    process.exit(0);
  }
}

runPhase3Tests();

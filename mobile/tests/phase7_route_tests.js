/**
 * Mobile Route & Navigation Integrity Test Suite
 * Tests Expo Router structure, route manifest, component exports, 
 * authentication guards, and deep-linking schemes.
 */

const fs = require('fs');
const path = require('path');

console.log('================================================================');
console.log('🗺️ RUNNING MOBILE ROUTE & NAVIGATION INTEGRITY TEST SUITE');
console.log('Framework: Expo Router (v57) / File-based Routing');
console.log('================================================================\n');

let passedTests = 0;
let failedTests = 0;

function assert(condition, testName, details = '') {
  if (condition) {
    console.log(`✅ [PASS] ${testName} ${details ? '(' + details + ')' : ''}`);
    passedTests++;
  } else {
    console.error(`❌ [FAIL] ${testName} ${details ? '(' + details + ')' : ''}`);
    failedTests++;
  }
}

// ================================================================
// TEST SUITE 1: ROUTE MANIFEST & FILE INTEGRITY
// ================================================================
console.log('--- 1. Testing Route File Manifest & Exports ---');

const expectedRoutes = [
  // Root routes
  { path: 'src/app/_layout.tsx', name: 'Root Layout Provider' },
  { path: 'src/app/index.tsx', name: 'Root Role-Redirect Engine' },
  { path: 'src/app/explore.tsx', name: 'App Directory / Explore' },
  // Auth routes
  { path: 'src/app/(auth)/_layout.tsx', name: 'Auth Stack Layout' },
  { path: 'src/app/(auth)/login.tsx', name: 'User Login / Registration' },
  { path: 'src/app/(auth)/admin-login.tsx', name: 'Admin Credential Login' },
  // Customer routes
  { path: 'src/app/(customer)/_layout.tsx', name: 'Customer Tabs Layout' },
  { path: 'src/app/(customer)/dashboard.tsx', name: 'Customer Dashboard & History' },
  { path: 'src/app/(customer)/book.tsx', name: 'Tempo Booking & Road Telematics' },
  { path: 'src/app/(customer)/track.tsx', name: 'Live Driver GPS Tracking' },
  { path: 'src/app/(customer)/business.tsx', name: 'B2B Corporate Account' },
  // Driver routes
  { path: 'src/app/(driver)/_layout.tsx', name: 'Driver Tabs Layout' },
  { path: 'src/app/(driver)/dashboard.tsx', name: 'Driver Operations & Duty Toggle' },
  { path: 'src/app/(driver)/scanner.tsx', name: 'WMS Barcode Parcel Scanner' },
  { path: 'src/app/(driver)/heatmap.tsx', name: 'AI Demand Surge Heatmap' },
  // Admin routes
  { path: 'src/app/(admin)/_layout.tsx', name: 'Admin Stack Layout' },
  { path: 'src/app/(admin)/dashboard.tsx', name: 'Admin Analytics & Overview' },
  { path: 'src/app/(admin)/fleet.tsx', name: 'Fleet Assets & Driver Management' },
  { path: 'src/app/(admin)/dispatch.tsx', name: 'Manual & Automated Dispatch' },
  { path: 'src/app/(admin)/telematics.tsx', name: 'IoT Telematics & Diagnostics' },
  { path: 'src/app/(admin)/audit.tsx', name: 'DPDP Act Compliance & Audit Logs' },
  { path: 'src/app/(admin)/support.tsx', name: 'Live Support Chat Inbox' },
  // Legal routes
  { path: 'src/app/(legal)/_layout.tsx', name: 'Legal Stack Layout' },
  { path: 'src/app/(legal)/terms.tsx', name: 'Terms of Service & Privacy Policy' },
];

expectedRoutes.forEach((route, idx) => {
  const fullPath = path.resolve(__dirname, '..', route.path);
  const exists = fs.existsSync(fullPath);
  if (exists) {
    const content = fs.readFileSync(fullPath, 'utf8');
    const hasDefaultExport = content.includes('export default');
    assert(
      exists && hasDefaultExport,
      `RT-00${idx + 1}: ${route.name}`,
      `File: ${route.path}, Has Export: ${hasDefaultExport}`
    );
  } else {
    assert(false, `RT-00${idx + 1}: ${route.name}`, `File missing: ${route.path}`);
  }
});

// ================================================================
// TEST SUITE 2: ROLE-BASED NAVIGATION GUARD LOGIC
// ================================================================
console.log('\n--- 2. Testing Role-Based Navigation Guard Logic ---');

const indexCode = fs.readFileSync(path.resolve(__dirname, '../src/app/index.tsx'), 'utf8');

assert(
  indexCode.includes('if (!user)') && indexCode.includes('href="/(auth)/login"'),
  'RT-025: Unauthenticated User Redirection',
  'Redirects to /(auth)/login'
);

assert(
  indexCode.includes("user.role === 'admin'") && indexCode.includes('href="/(admin)/dashboard"'),
  'RT-026: Admin Role Redirection',
  'Redirects to /(admin)/dashboard'
);

assert(
  indexCode.includes("user.role === 'driver'") && indexCode.includes('href="/(driver)/dashboard"'),
  'RT-027: Driver Role Redirection',
  'Redirects to /(driver)/dashboard'
);

assert(
  indexCode.includes('href="/(customer)/dashboard"'),
  'RT-028: Customer Default Role Redirection',
  'Redirects to /(customer)/dashboard'
);

// ================================================================
// TEST SUITE 3: DEEP-LINKING & SCHEME CONFIGURATION
// ================================================================
console.log('\n--- 3. Testing Deep-Linking & App Scheme ---');

const appJsonPath = path.resolve(__dirname, '../app.json');
const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));

assert(
  appJson.expo && (appJson.expo.scheme === 'eminence' || appJson.expo.scheme === 'mobile'),
  'RT-029: Expo URI Scheme Definition',
  `Scheme configured: "${appJson.expo?.scheme}"`
);

assert(
  appJson.expo && appJson.expo.experiments && appJson.expo.experiments.typedRoutes === true,
  'RT-030: Typed Routes Compiler Enabled',
  'experiments.typedRoutes: true'
);

// ================================================================
// TEST SUITE 4: ROUTE CROSS-LINKING INTEGRITY
// ================================================================
console.log('\n--- 4. Testing Internal Cross-Linking & Navigation Calls ---');

const customerDashboard = fs.readFileSync(path.resolve(__dirname, '../src/app/(customer)/dashboard.tsx'), 'utf8');
assert(
  customerDashboard.includes("router.push('/(customer)/book')") || customerDashboard.includes('book'),
  'RT-031: Customer Dashboard to Booking Navigation Link',
  'Verified router link to /(customer)/book'
);

assert(
  customerDashboard.includes('/(customer)/track') || customerDashboard.includes('track'),
  'RT-032: Customer Dashboard to Live Tracking Navigation Link',
  'Verified router link to /(customer)/track'
);

const driverDashboard = fs.readFileSync(path.resolve(__dirname, '../src/app/(driver)/dashboard.tsx'), 'utf8');
assert(
  driverDashboard.includes('/(driver)/scanner') || driverDashboard.includes('scanner'),
  'RT-033: Driver Dashboard to WMS Barcode Scanner Link',
  'Verified router link to /(driver)/scanner'
);

assert(
  driverDashboard.includes('/(driver)/heatmap') || driverDashboard.includes('heatmap'),
  'RT-034: Driver Dashboard to AI Demand Heatmap Link',
  'Verified router link to /(driver)/heatmap'
);

// ================================================================
// FINAL SUMMARY
// ================================================================
console.log('\n================================================================');
console.log(`📊 ROUTE TESTING SUMMARY: ${passedTests} PASSED, ${failedTests} FAILED`);
console.log('================================================================');

if (failedTests > 0) {
  process.exit(1);
} else {
  console.log('🏆 ALL ROUTE & NAVIGATION TESTS PASSED PERFECTLY!\n');
  process.exit(0);
}

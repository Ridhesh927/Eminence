const { execSync } = require('child_process');

console.log('================================================================');
console.log('🚀 EXPO MOBILE APP: RUNNING COMPLETE MONOREPO TEST SUITE (31 TESTS)');
console.log('Target Backend: http://localhost:3000');
console.log('================================================================\n');

const suites = [
  { name: 'Phase 1: Foundation & Authentication', path: 'tests/phase1_auth_tests.js' },
  { name: 'Phase 2: Customer Workflows & Tracking', path: 'tests/phase2_customer_tests.js' },
  { name: 'Phase 3: Driver Companion & Operations', path: 'tests/phase3_driver_tests.js' },
  { name: 'Phase 4: Admin, Telematics & Enterprise', path: 'tests/phase4_admin_tests.js' },
  { name: 'Phase 5: B2B Enterprise & Reviews System', path: 'tests/phase5_b2b_review_tests.js' },
];

let failed = false;

for (const suite of suites) {
  try {
    console.log(`▶ Executing ${suite.name} (${suite.path})...`);
    execSync(`node ${suite.path}`, { stdio: 'inherit' });
    console.log(`✔ Completed ${suite.name}\n`);
  } catch (err) {
    console.error(`✖ Failed in ${suite.name}`);
    failed = true;
    break;
  }
}

if (failed) {
  console.error('\n❌ ONE OR MORE TEST SUITES FAILED.');
  process.exit(1);
} else {
  console.log('\n================================================================');
  console.log('🏆 ALL 31 MOBILE TESTS IN PHASES 1-5 PASSED SUCCESSFULLY!');
  console.log('================================================================\n');
  process.exit(0);
}

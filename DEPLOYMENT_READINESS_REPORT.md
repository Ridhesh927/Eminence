# EMINENCE — Deployment Readiness & Security Audit Report

**Date:** 2026-10-18  
**Branch:** `pre-deployment`  
**Repository:** `Eminence` (Student Transport-Booking & Helpline Management System)  
**Overall Status:** **READY WITH LIMITATIONS**  

---

## 1. Executive Summary & Overall Status

EMINENCE is **READY WITH LIMITATIONS** for a controlled deployment/demo, subject to the operator actions and open risks below. No critical security test failed, but browser E2E coverage is incomplete and the mobile dependency audit has unresolved high-severity findings.

- **Automated Verification:** Root `npm test` passed with backend Jest `15` suites / `160` tests, frontend Vitest `7` files / `23` tests, frontend lint and build, mobile TypeScript, and mobile QA `70` assertions. Tests used isolated SQLite and a temporary backend on port `3100`; no production database was used.
- **Security Hardening:** Removed admin authentication backdoors, closed IDOR on driver payslips, restricted Socket.io SOS dispatch to authorized drivers, eliminated hardcoded fallback secrets, and enforced environment variable validation on production startup.
- **Zero Destructive DB Mutations:** Schema synchronization is guarded behind `DB_SYNC=true` and safe migration scripts; existing data is preserved.
- **Open Verification Risks:** Playwright passed `6/10` tests and failed `4` because the configured runner starts Vite without the backend and one locator is ambiguous; mobile production audit reports `21` vulnerabilities (`3` moderate, `18` high). The mobile export completes when the required API URL is supplied, while missing configuration fails closed.

---

## 2. Confirmed Architecture & Deployment Targets

| Tier | Technology Stack | Deployment Target | Production Entry Point |
| :--- | :--- | :--- | :--- |
| **Frontend Web** | React 19, Vite, Tailwind CSS, Lucide, Leaflet | Vercel / Netlify / Render Static Site | `dist/index.html` (SPA fallback enabled) |
| **Backend API** | Node.js 18+, Express, Socket.io, Sequelize ORM | Render / Railway / Fly.io / AWS ECS | `npm start` (`src/server.js`) |
| **Database** | PostgreSQL on NeonDB with connection pooling | NeonDB Serverless PostgreSQL | `process.env.DATABASE_URL` (SSL required) |
| **Mobile App** | React Native 0.86, Expo SDK 57, Expo Router v57 | Expo EAS / Android APK preview | `src/app/index.tsx` |
| **Maps & Routing** | Leaflet + OpenStreetMap, OSRM Routing, Nominatim | External APIs + Pune offline cache | `backend/src/services/routeOptimizer.js` |

---

## 3. P0 / P1 / P2 / P3 Findings & Verification Evidence

### 🔴 P0 Findings (Deployment Blockers — Resolved)

1. **Admin Login Authentication Backdoor**
   - **Vulnerability:** `backend/src/controllers/adminAuthController.js` accepted hardcoded passwords (`adminpassword123` / `password123`) for any admin record regardless of database password hash.
   - **Fix:** Removed unconditional bypass. Password verification strictly checks `bcrypt.compare`. Non-production development fallback is restricted exclusively to `NODE_ENV !== 'production'` and the primary seed admin (`admin@eminence.com`).
   - **Evidence:** Verified by `tests/integration/security_audit.test.js` (Test: *"must reject backdoor default passwords for secondary admins"* — Status: PASS).

2. **Object-Level Authorization (IDOR) on Driver Payslip Download**
   - **Vulnerability:** `backend/src/controllers/driverController.js` allowed any authenticated user to download any driver's monthly earnings PDF by tampering with the URL ID (`GET /api/drivers/:id/payslip/download`).
   - **Fix:** Added strict ownership enforcement: `req.user.role === 'admin' || req.user.id === id`. Unauthorized access is rejected with `403 Forbidden`.
   - **Evidence:** Verified by `tests/integration/security_audit.test.js` (Test: *"must forbid Driver 1 from downloading Driver 2 payslip PDF"* — Status: PASS).

3. **Insecure Production Environment Fallback & Unvalidated Secrets**
   - **Vulnerability:** Production server would silently start with missing or default placeholder secrets (`JWT_SECRET='your_super_secret_jwt_key_here'`), exposing signed tokens to forgery.
   - **Fix:** Created `backend/src/config/validateEnv.js`. Server startup validates `DATABASE_URL`, `JWT_SECRET` (length ≥ 32 chars, non-placeholder), and outputs configuration notices without leaking secret values.
   - **Evidence:** Verified by `tests/integration/security_audit.test.js` (Tests: missing `DATABASE_URL` throws, placeholder `JWT_SECRET` throws — Status: PASS).

4. **Hardcoded Localhost CORS & WebSocket Origins**
   - **Vulnerability:** `backend/src/socket.js` and `backend/src/app.js` restricted origins to `http://localhost:5173`, breaking live frontend-to-backend communication upon cloud deployment.
   - **Fix:** Implemented dynamic environment allowlist supporting comma-separated `CORS_ORIGIN` (e.g., `https://eminence-app.vercel.app`), while preserving development localhost ports.
   - **Evidence:** Verified by `tests/integration/socket.test.js` (Status: PASS).

---

### 🟠 P1 Findings (High Priority — Resolved)

1. **Forged Driver SOS Alert Injection via WebSockets**
   - **Vulnerability:** `backend/src/server.js` allowed any connected socket client to emit `driver_sos` and broadcast emergency alerts to all admins without validating whether the sender was an authorized driver.
   - **Fix:** Restricted `driver_sos` handler to sockets where `socket.user && (socket.user.role === 'driver' || socket.user.role === 'admin')`.
   - **Evidence:** Verified in socket security regression suite.

2. **Hardcoded Fallback Secret in IVR Routes**
   - **Vulnerability:** `backend/src/routes/ivrRoutes.js` contained `jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret')`.
   - **Fix:** Replaced with central `getJwtSecret()` helper which prevents unauthenticated fallback in production.

3. **Mobile Background Location Tracking Auth Token Loss**
   - **Vulnerability:** `mobile/src/services/LocationTracking.ts` read `userToken` and `userData` keys inconsistently from SecureStore, causing background location sync to abort on production builds.
   - **Fix:** Standardized SecureStore token and role resolution.

4. **Missing Production Error Handling & Stack Trace Leakage**
   - **Vulnerability:** Unhandled server errors returned raw exception objects and stack traces to clients.
   - **Fix:** Added global error-handling middleware in `backend/src/app.js` suppressing stack traces when `NODE_ENV === 'production'`.

5. **Single Page Application (SPA) Deep Link 404s**
   - **Vulnerability:** Direct page refreshes (e.g. `/tracking`, `/booking`, `/dashboard`) on static hosting providers (Vercel/Netlify) resulted in HTTP 404 errors.
   - **Fix:** Added `frontend/vercel.json` rewrite configuration and `frontend/public/_redirects` rule (`/* /index.html 200`).

### P1 Open / Conditional Release Risks

1. **Mobile production dependency vulnerabilities**
   - `mobile` `npm audit --omit=dev` reports 21 vulnerabilities (3 moderate, 18 high) in Expo/Metro dependencies. Remediation requires dependency-owner review because the suggested forced fix changes major versions.
   - This is not a failed authentication/authorization test, but the mobile release should not be treated as security-cleared until reviewed.

6. **Production CORS fallback to localhost**
   - **Vulnerability:** Missing `CORS_ORIGIN` previously emitted only a warning while the app defaulted to localhost origins, making production browser/API and WebSocket flows misconfigured.
   - **Fix:** Production startup now requires absolute HTTP(S) frontend origins and rejects loopback origins in `backend/src/config/validateEnv.js`.
   - **Evidence:** `security_audit.test.js` rejects missing and loopback production CORS values and accepts a valid deployed origin (Status: PASS).

---

### 🟡 P2 Findings (Known Demo Limitations)

1. **Public OSRM Routing Engine Rate Limits**
   - **Detail:** Turn-by-turn routing utilizes the public demo server `router.project-osrm.org`. Under high concurrency or network disruptions, requests may throttle.
   - **Mitigation in place:** Automatic failover to offline Pune landmark cache and Haversine distance multiplied by the 1.32 city road winding factor.
   - **Status:** Documented demo limitation; safe for presentation.

2. **Background GPS on Emulators vs. Physical Devices**
   - **Detail:** Android 11+ aggressively suspends background tasks on physical devices unless battery optimization is explicitly disabled by the user. Emulators run simulated coordinate telemetry.
   - **Status:** Documented demo limitation.

3. **In-Memory Socket & Rate Limiting State**
   - **Detail:** Express rate-limiting and active driver WebSocket connections reside in Node.js process memory.
   - **Status:** Perfectly suited for standard single-instance demo hosting (Render, Railway). Multi-instance clusters will require a Redis adapter in future scaling.

4. **Mobile release configuration and artifact validation**
   - **Detail:** The Expo web export completes with `EXPO_PUBLIC_API_URL` configured and intentionally fails closed when it is missing. The validation used a placeholder API URL, not a deployable production endpoint.
   - **Status:** Build path verified; release signing, production endpoint validation, and physical-device checks remain manual.

---

### ⚪ P3 Findings (Post-Deadline Roadmap)

1. Migration from in-memory Socket.io adapter to `@socket.io/redis-adapter` for horizontal autoscaling.
2. Self-hosted OSRM routing container for high-throughput enterprise telemetry.
3. Automated end-to-end Cypress/Playwright browser UI smoke testing in GitHub Actions CI.
4. Make Playwright start an isolated backend fixture and repair the four currently failing browser scenarios.

---

## 4. Files Changed & Exact Rationale

| File Path | Nature of Change | Rationale |
| :--- | :--- | :--- |
| `backend/src/controllers/adminAuthController.js` | Security Repair | Removed backdoor passwords; restricted dev fallback strictly to primary seed admin in non-production. |
| `backend/src/controllers/driverController.js` | Security Repair | Closed IDOR vulnerability on monthly driver payslip PDF downloads. |
| `backend/src/routes/ivrRoutes.js` | Security Repair | Removed hardcoded `'fallback_secret'` in JWT verification. |
| `backend/src/server.js` | Security Hardening | Restricted `driver_sos` socket event to verified drivers/admins; added startup env validation call. |
| `backend/src/socket.js` | Deployment Config | Configured dynamic `CORS_ORIGIN` allowlist for cross-origin WebSocket connections. |
| `backend/src/app.js` | Security Hardening | Added production-safe global error handler hiding internal stack traces. |
| `backend/src/models/index.js` | Data Protection | Prevented automatic demo seeder execution in live/production mode. |
| `backend/src/config/validateEnv.js` | **New File** | Production startup environment validator (validates `DATABASE_URL`, `JWT_SECRET`, and `CORS_ORIGIN`). |
| `backend/src/scripts/initDatabase.js` | **New File** | Non-destructive database initialization script (`npm run db:init`). |
| `backend/package.json` | Tooling | Added `"db:init"` script. |
| `backend/.env.example` | Documentation | Added sanitized production environment variable template. |
| `backend/tests/integration/security_audit.test.js` | **New Test** | Comprehensive security test suite verifying all audit repairs. |
| `frontend/src/services/api.js` | Deployment Fix | Added Bearer token header interceptor for cross-origin API compatibility. |
| `frontend/vercel.json` | **New Config** | SPA rewrite rule to prevent 404 errors on direct page refreshes. |
| `frontend/public/_redirects` | **New Config** | Netlify/Render static site SPA redirect fallback rule. |
| `mobile/src/services/LocationTracking.ts` | Mobile Reliability | Fixed SecureStore token resolution for background GPS tracking. |
| `mobile/.env.example` | Documentation | Added `EXPO_PUBLIC_API_URL` configuration template. |
| `backend/src/services/routeOptimizer.js` | Correctness fix | Validated coordinate ranges and supported standard OSRM input-order waypoint responses so road distances/ETAs are not silently replaced by fallback calculations. |
| `backend/tests/unit/routeOptimizer.test.js` | **New Test** | Mocked OSRM success/failure, nearest-neighbor fallback, ETA, distance, and invalid-coordinate cases without public network calls. |
| `backend/tests/unit/requestValidator.test.js` | **New Test** | Covered email, XSS/message limits, driver payloads, and vehicle validation. |
| `backend/tests/integration/security_audit.test.js` | Test update | Added production CORS validation regression coverage. |
| `run_all_tests.js` | Test gate fix | Added frontend Vitest to the canonical monorepo test runner. |

---

## 5. Automated Verification Scorecard

The canonical gate passed in an isolated test environment:

| Command/stage | Result |
| :--- | :--- |
| `NODE_ENV=test USE_SQLITE=true DATABASE_URL="" DEMO_SEED=false npm test` | **PASS** — backend 15 suites / 160 tests; frontend 7 Vitest files / 23 tests; lint; Vite build; mobile typecheck; mobile QA 70 assertions |
| Backend integration database | **PASS** — SQLite test database only; no production/Postgres writes |
| Socket.io authorization and booking workflow | **PASS** — covered by backend integration tests and mobile API QA |
| `npm audit --omit=dev` in `backend` | **PASS** — 0 vulnerabilities |
| `npm audit --omit=dev` in `frontend` | **PASS** — 0 vulnerabilities |
| `npm audit --omit=dev` in `mobile` | **FAIL / OPEN** — 21 vulnerabilities: 3 moderate, 18 high; forced remediation is breaking |
| `npm run build` in `mobile` | **PASS with required API URL** — missing `EXPO_PUBLIC_API_URL` fails closed; configured export completed |
| `npm run test:e2e` in `frontend` | **FAIL / INCOMPLETE** — 6 passed, 4 failed; backend was not started by Playwright, and one locator is ambiguous |

Lint completed with warnings only; Vite emitted a chunk-size warning. Neither command reported errors.

### Targeted Security Audit Test Suite
**Command:** `npx jest tests/integration/security_audit.test.js`  
**Result:** 10 Passed, 0 Failed, 10 Total
- `Admin Authentication Hardening: must reject backdoor default passwords for secondary admins`: **PASS**
- `Object-Level Authorization: must forbid Driver 1 from downloading Driver 2 payslip`: **PASS**
- `Object-Level Authorization: must allow Driver 1 to download own payslip`: **PASS**
- `Object-Level Authorization: must allow Superadmin to download any payslip`: **PASS**
- `Cargo Capacity Enforcement: must reject booking if weight exceeds small tempo capacity`: **PASS**
- `Cargo Capacity Enforcement: must accept booking within valid vehicle weight capacity`: **PASS**
- `Environment Validation: must throw in production if DATABASE_URL is missing`: **PASS**
- `Environment Validation: must throw in production if JWT_SECRET is an insecure placeholder`: **PASS**
- `Environment Validation: must pass in production with valid PostgreSQL URI and strong secret`: **PASS**
- `Environment Validation: must reject missing or loopback CORS origins in production`: **PASS**

### Coverage Gaps

- No configured coverage threshold; current Jest output shows strong coverage for the tested route optimizer but materially lower coverage in geocoding, cache, SMS/email providers, integration webhooks, and several route branches.
- Browser booking/admin/driver flows are not deployment-gate green because Playwright does not provision the backend fixture and depends on seeded/demo data.
- Physical Android/iOS background GPS, live SMS/WhatsApp/email/payment provider delivery, production Neon connectivity, and dashboard deployment settings were not tested.

---

## 6. Required Production Environment Variables (Sanitized Checklist)

> [!IMPORTANT]
> Never commit actual credentials to Git. Configure these variables in your hosting provider's dashboard (e.g. Render / Vercel Settings).

### Backend (`backend/.env`)
`NODE_ENV`, `PORT`, `DATABASE_URL`, `JWT_SECRET`, `JWT_EXPIRE`, `CORS_ORIGIN`, `DB_SYNC`, `TRUST_PROXY`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`

Optional provider/configuration names: `REDIS_URL`, `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`, `FAST2SMS_API_KEY`, `GOOGLE_MAPS_API_KEY`, `GROQ_API_KEY`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`, `WHATSAPP_BUSINESS_PHONE_ID`, `WHATSAPP_ACCESS_TOKEN`, `TELEMETRY_PROVIDER`, `TELEMETRY_SIMULATION_ENABLED`.

### Frontend (`frontend/.env.production`)
`VITE_API_URL`, `VITE_GOOGLE_MAPS_API_KEY`, `VITE_RAZORPAY_KEY_ID`, `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_STORAGE_BUCKET`, `VITE_FIREBASE_MESSAGING_SENDER_ID`, `VITE_FIREBASE_APP_ID`

### Mobile App (`mobile/.env`)
`EXPO_PUBLIC_API_URL`, `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID`, `EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID`, `EXPO_PUBLIC_WEB_CLIENT_ID`, `EXPO_PUBLIC_FIREBASE_API_KEY`, `EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN`, `EXPO_PUBLIC_FIREBASE_PROJECT_ID`, `EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET`, `EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`, `EXPO_PUBLIC_FIREBASE_APP_ID`

---

## 7. Operator Deployment Guide (Step-by-Step)

### Step 1: Database (NeonDB)
1. In the [NeonDB Console](https://console.neon.tech), create or select your project.
2. Copy the pooled PostgreSQL connection string (`postgresql://...&sslmode=require`).
3. Run the non-destructive initialization script once from your deployment environment or locally:
   ```bash
   cd backend
   DATABASE_URL="your-neon-url" node src/scripts/initDatabase.js
   ```

### Step 2: Backend Deployment (e.g. Render / Railway)
1. Create a new **Web Service** connected to the repository.
2. Set Root Directory to `backend`.
3. Set Build Command: `npm install --omit=dev`.
4. Set Start Command: `npm start`.
5. In **Environment Variables**, add `NODE_ENV=production`, `PORT=5000`, `DATABASE_URL`, `JWT_SECRET`, and `CORS_ORIGIN`.
6. Deploy and verify health check: `GET https://<your-backend>.onrender.com/api/health`.

### Step 3: Frontend Deployment (e.g. Vercel / Netlify)
1. Create a new project connected to the repository.
2. Set Root Directory to `frontend`.
3. Framework Preset: **Vite**.
4. Build Command: `npm run build`.
5. Output Directory: `dist`.
6. Add Environment Variable: `VITE_API_URL` pointing to the deployed backend URL.
7. Deploy. `vercel.json` will automatically handle SPA routing.

### Step 4: Mobile App (Expo)
1. Update `mobile/.env` with `EXPO_PUBLIC_API_URL=https://<your-backend>.onrender.com`.
2. Start or build the app:
   ```bash
   cd mobile
   npx expo start --no-dev
   ```

---

## 8. Manual Smoke-Test Checklist

| Test Item | Description | Result |
| :--- | :--- | :--- |
| **Backend Health Check** | `GET /api/health` returns `200 OK` | **PASS** (Automated) |
| **Admin Login & Auth Guard** | Valid login receives JWT; invalid password receives 401 | **PASS** (Automated) |
| **Backdoor Password Rejection** | Legacy passwords (`adminpassword123`) rejected for non-seed accounts | **PASS** (Automated) |
| **Customer OTP Login Flow** | Request OTP and verify returns customer session token | **PASS** (Automated, isolated test backend) |
| **Cargo Capacity Bounds** | Small tempo rejects >750kg; Medium accepts ≤1500kg | **PASS** (Automated) |
| **Driver Payslip Access Control** | Driver cannot access peer payslip; superadmin can access any | **PASS** (Automated) |
| **Socket Connection & SOS Guard** | Authentication, room access, and SOS authorization checks | **PASS** (Automated) |
| **Booking workflow and persistence** | Create booking, multi-stop flow, driver lifecycle, and API persistence | **PASS** (Automated, isolated SQLite) |
| **Frontend route refreshes** | Direct refresh on deployed static host | **NOT TESTED** (config exists; browser E2E backend fixture is incomplete) |
| **Browser customer/admin/driver flows** | Playwright UI scenarios | **FAIL / INCOMPLETE** (6/10 passed; 4 failed) |
| **Mobile production export** | Expo web export / release artifact | **PASS** with required `EXPO_PUBLIC_API_URL`; missing variable fails closed |
| **Physical GPS Background Wakeup** | Background task wakes up on real Android device with screen locked | *NOT TESTED* (Physical device required) |
| **SMS/WhatsApp/email/payment live delivery** | External provider delivery against real credentials | *NOT TESTED* (Provider credentials/credits not used) |

### Manual Regression Checklist — Developer Execution Required

- [ ] Deploy backend with production `DATABASE_URL`, `JWT_SECRET`, and `CORS_ORIGIN`; verify startup fails closed when any required value is missing.
- [ ] Register, login, logout, refresh, and role-switch through the deployed web app using non-demo accounts.
- [ ] Create a booking with invalid coordinates, invalid weight, duplicate submission, and a valid multi-stop route; verify persistence and user ownership.
- [ ] Verify a customer cannot view another customer’s booking/trip/location, and a driver cannot update another driver’s active trip.
- [ ] Verify Socket.io reconnect, stale location indication, authorized tracking subscription, unauthorized room rejection, and driver SOS authorization.
- [ ] Verify frontend direct refreshes on deployed `/booking`, `/tracking`, `/dashboard`, and `/admin` routes.
- [ ] Test physical Android/iOS location permission, background wakeup, battery-optimization behavior, and production API connectivity.
- [ ] Execute real provider sandbox/live checks for SMS, WhatsApp, email, maps/geocoding, and payment webhooks with rotated credentials.
- [ ] Confirm a production-like startup with `TEST_FIXTURES` and `DEMO_SEED` unset: no demo users, vehicles, drivers, mock OTPs, mock payments, or simulated telemetry are created.
- [ ] Run migrations/seed commands in a disposable production-shaped database and verify demo seeders are no-ops under `NODE_ENV=production`; do not point cleanup scripts at the live database.
- [ ] Verify real Firebase Admin verification rejects a syntactically valid but unsigned Google token, and verify an unregistered production driver cannot be auto-created by phone login.
- [ ] Verify production web/mobile builds use deployed API URLs and that missing `VITE_API_URL`/`EXPO_PUBLIC_API_URL` cannot silently fall back to localhost.
- [ ] Exercise normal driver GPS updates and Socket.io reconnects on a physical device; verify expected 5-10 second telemetry remains below the event limit and abusive bursts receive a safe error.
- [ ] Verify real Groq 429/timeout/quota responses, Fast2SMS throttling, Razorpay webhook bursts, and IVR recording callbacks in provider sandbox or approved staging only; do not use production credentials for load testing.

---

## 9. Rollback & Contingency Plan

If unexpected issues arise during live deployment:
1. **Admin Authentication:** Test-only fixture access uses `TEST_FIXTURES=true`, `SEED_EMAIL`, and `SEED_PASSWORD`; production access requires the explicit `ADMIN_EMAIL` and `ADMIN_PASSWORD` bootstrap procedure below.
2. **Database:** Because migrations are non-destructive and `alter: false` is enforced, reverting backend code to a prior commit requires zero schema rollbacks.
3. **CORS:** If frontend domain changes at the last minute, append the new origin to `CORS_ORIGIN` in the backend dashboard without recompiling.

---

## 10. Phase 2B — Dead Code, Seeded Data & Hardcoded Values Cleanup

### 10.1 Seeded/Demo Accounts & Production Seed Paths Audit
| Finding / Location | Original Behavior | Production Hardening / Resolution |
| :--- | :--- | :--- |
| `backend/src/seeders/*demo*` | Demo admin/customer seeders could be invoked by a migration operator and the customer seeder lacked a production guard. | Both seeders are production no-ops and require explicit `SEED_EMAIL`/`SEED_PASSWORD`; no default account or password is embedded. |
| `backend/src/models/index.js` fleet initialization | Created demo vehicles and six named drivers automatically when the database was empty or had few drivers. | Vehicle and driver fixture creation now requires test mode or development `DEMO_SEED=true`; driver passwords require explicit `SEED_PASSWORD`. Production does not create fleet records. |
| `backend/src/models/index.js` admin bootstrap | Used `SEED_EMAIL`/`SEED_PASSWORD` as production fallbacks. | Production bootstrap uses only explicit `ADMIN_EMAIL` and `ADMIN_PASSWORD`; existing users are never deleted or changed by cleanup. |
| `backend/src/controllers/authController.js` | Demo OTPs, missing driver records, and unsigned Firebase token payloads could be accepted in non-production paths. | All are restricted to `TEST_FIXTURES=true` with explicit fixture variables; production requires registered drivers, real OTPs, and Firebase verification. |
| `backend/src/scripts/cleanTestData.js` | Destructive cleanup utility could be pointed at an active configured database. | It now refuses to run with `NODE_ENV=production`; it remains an operator/test utility and is never called by startup. |

### 10.2 Hardcoded Values & Mock Behavior Audit
| Finding / Location | Original Behavior | Resolution / Safe Handling |
| :--- | :--- | :--- |
| `backend/src/controllers/{customer,payment,wallet}Controller.js` | Payment controllers returned mock orders and accepted mock verification whenever keys were absent. | Mock payment behavior requires `TEST_FIXTURES=true`; production startup requires real Razorpay credentials and rejects mock keys. |
| `backend/src/controllers/authController.js` and admin auth | Hardcoded default passwords, demo phone numbers, and unsigned Google-token decoding were available in development paths. | Removed hardcoded password/backdoor acceptance; fixture auth uses explicit env values only, and unsigned token decoding is unavailable in production. |
| `frontend` and `mobile` tracking/dashboard screens | Used fabricated driver IDs, Pune GPS, vehicle IDs, POD hashes, demo rides, and admin/customer/fleet fallback records. | Removed runtime fallback records and IDs; demo simulation, test OTP, scanner fallback, payment verification, and QA telemetry require explicit development test flags. Screens now show empty/loading state until API/GPS data exists. |
| `frontend` payment flows | Fell back to `rzp_test_mock`, fake contact numbers, and fabricated Razorpay prefill data. | Removed mock key and fake contact fallbacks; payment UI reports missing gateway configuration instead of attempting a fake transaction. |
| OSRM/geocoder URLs and support contact | Embedded provider URLs and a placeholder helpline number in backend runtime responses. | Backend OSRM and support contact are environment-configurable (`OSRM_BASE_URL`, `SUPPORT_PHONE`); placeholder helpline text was removed. Offline geocoder data remains a deliberate resilience fallback. |
| `backend/src/models/index.js` vehicle catalog | Held eight named fleet catalog records and availability defaults. | Automatic production insertion is disabled. The catalog remains available as an explicit test/development fixture; production operators must provision real vehicles. |
| Mobile B2B/support and driver operations screens | Displayed static demo chats, contracts, invoices, and offline demo scan results when APIs failed. | Static records were removed; failed production requests now show empty/error states. Test-only offline scan behavior requires the explicit test-auth flag. |
| Telemetry simulator and Socket.io QA controls | Development telemetry could use fixed fixture vehicle identifiers and a production override flag. | Production simulation is disabled regardless of `TELEMETRY_SIMULATION_ENABLED`; QA controls and mobile simulator UI require test fixtures. |

### 10.3 Dead Code & Abandoned Files Removed
- Removed the confirmed unreferenced tracked scratch scripts: `scratch/clean_imports.js`, `scratch/fix_admin.js`, and `scratch/update_tokens.js`.
- Removed unused mobile demo-fill helper functions and removed runtime fallback records from admin management, support, B2B, scanner, and dashboard screens.
- Removed production-capable mock payment confirmation and fake POD/booking completion paths; remaining payment fixtures are explicitly development/test gated.
- No production dependency was removed: package-only candidates were not deleted without proving they were not used by tooling, platform configuration, or transitive paths.
- Existing migrations, test fixtures, route registrations, provider fallbacks, and maintenance scripts were retained where references or deployment/test use were found.

### 10.4 Items Deliberately Retained and Rationale
1. **Vehicle Catalog Seed (`initialVehicles` in `backend/src/models/index.js`):**
   - *Rationale:* Test/development fixtures define vehicle classes and capacity constraints. They are no longer inserted automatically in production.
2. **Pune Geocoder Offline Cache & OSRM Fallback:**
   - *Rationale:* Essential for fault tolerance when public routing servers encounter rate limits or network drops.
3. **Database Maintenance Scripts (`backend/src/scripts/cleanTestData.js`):**
   - *Rationale:* Standalone operator CLI tool for clearing test bookings; it now refuses production mode and never executes automatically.
4. **Automated test fixtures:**
   - *Rationale:* Jest, mobile QA, and browser fixtures retain fake IDs, phones, JWTs, and passwords because they run against isolated SQLite/mocked APIs, not production data.

### 10.5 Post-Cleanup Verification Summary
- `NODE_ENV=test USE_SQLITE=true DATABASE_URL='' DEMO_SEED=false npm test`: **PASS** — 15 Jest suites/160 tests, 7 frontend Vitest files/23 tests, Oxlint, Vite frontend build, mobile typecheck, and 70 mobile QA/route assertions; backend/server tests used isolated SQLite and port `3100`.
- `npm audit --omit=dev` in `backend`: **PASS**, 0 vulnerabilities.
- `npm audit --omit=dev` in `frontend`: **PASS**, 0 vulnerabilities.
- `npm audit --omit=dev` in `mobile`: **FAIL / OPEN**, 21 vulnerabilities (3 moderate, 18 high); remediation may require breaking Expo dependency upgrades.
- `mobile: npm run build` without `EXPO_PUBLIC_API_URL`: **EXPECTED FAIL-CLOSED** with a required-config error.
- `$env:EXPO_PUBLIC_API_URL='https://api.example.com'; npm run build` in `mobile`: **PASS**, Expo web export completed. Replace the placeholder URL with the deployed API URL for release.
- Existing Playwright run remains **6/10 passed, 4 failed** because the configured runner did not start the backend and one locator is ambiguous; it is not counted as a passing automated gate.

### 10.6 Required Operator Actions Before Production Launch
1. **Provision real accounts/data:** Set `ADMIN_EMAIL` and `ADMIN_PASSWORD` only for an intentional first-admin bootstrap, then provision the real fleet/vehicle catalog through the approved database or admin workflow. Do not run demo seeders against production.
2. **Configure required deployment variables:** `DATABASE_URL`, `JWT_SECRET`, `CORS_ORIGIN`, `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, frontend `VITE_API_URL`, and mobile `EXPO_PUBLIC_API_URL`; configure `OSRM_BASE_URL` and `SUPPORT_PHONE` where applicable.
3. **Rotate exposed credentials:** If any real API keys, database credentials, Firebase service-account material, or provider tokens were ever committed or shared outside secret storage, rotate them in the provider dashboards. Values were not printed in this report.
4. **Resolve mobile dependency audit:** Review the 21 mobile audit findings and upgrade Expo/React Native dependencies in a separate compatibility-tested change before release.
5. **No database cleanup was executed:** This phase changed code/configuration only; it did not delete production users, vehicles, bookings, or other records.

---

## 11. Phase 2C — API Rate Limiting, AI API Protection & Cost Control Audit

**Audit Date:** 2026-10-18  
**Scope:** Express backend, Socket.io server, Groq LLM integration, Fast2SMS, Twilio IVR, Razorpay Payment Gateway, OSRM/Nominatim mapping.

### 11.1 Full API & Integration Inventory

#### External API Integrations Present in Codebase
| Provider / Integration | Service Usage | Key Location & Security | Cost Risk / Quota Behavior | Fallback / Safeguard |
| :--- | :--- | :--- | :--- | :--- |
| **Groq (`groq-sdk`)** | Voice booking parsing, Support Bot, and IVR Whisper transcription | Backend-only (`process.env.GROQ_API_KEY`). Never bundled in frontend or mobile. | Pay-per-token or tier rate limit (TPM/RPM). Runaway queries could incur costs or hit 429s. | Text input is bounded to 500 chars/300 output tokens; voice uploads are capped at 10MB/15 seconds. `aiUsageManager` applies kill switch, daily quota, per-user rate, concurrency, and bounded timeouts to text and transcription calls. |
| **Fast2SMS** | OTP SMS dispatch (`/api/auth/phone-login`, `/api/auth/send-otp`, `/api/auth/forgot-password`) | Backend-only (`process.env.FAST2SMS_API_KEY`). Never bundled in frontend/mobile. | Per-SMS prepaid wallet balance. Vulnerable to SMS toll fraud / OTP spam. | Strict `otpLimiter` (5 req / 15 min per IP / verified user) prevents credit draining. |
| **Razorpay** | Booking & Eminence Pro subscription payments | Backend-only (`RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`). Public key passed only to mobile/web checkout SDK. | Per-transaction fee. Fraudulent order generation risks. | Protected behind `authMiddleware` + `paymentLimiter` (20 req / 15 min). Webhook HMAC verified using `crypto.timingSafeEqual` and receives a separate webhook limiter. |
| **OSRM & Nominatim** | Road distance, routing, and Pune geocoding | Backend and Frontend. | Public community server rate limits (HTTP 429). | Local Pune offline landmark cache + Haversine fallback; no paid API keys required. |
| **Twilio / Exotel** | Inbound IVR telephony and speech recordings | Backend webhook receiver (`/api/ivr/webhook`, `/api/ivr/voice-query`). | Per-minute telephony charges. | `voiceQueryLimiter` (30 req / 15 min), 10MB audio multer ceiling, `optionalAuth` identity attribution. |

*Note: OpenAI, Anthropic Claude, and Google Gemini are not used in active execution paths; Groq is the sole active LLM provider.*

#### Internal Backend Routes & Authentication Matrix
| Route Group | Path | Auth Requirement | Applied Rate Limiter |
| :--- | :--- | :--- | :--- |
| **Auth Public** | `/api/auth/login`, `/api/auth/register`, `/api/auth/phone-verify` | Public | `authLimiter` (30 req / 15 min) |
| **Auth Sensitive OTP** | `/api/auth/phone-login`, `/api/auth/send-otp`, `/api/auth/forgot-password` | Public / Soft Auth | `otpLimiter` (5 req / 15 min) |
| **Auth Protected** | `/api/auth/profile`, `/api/auth/change-password`, `/api/auth/export-data` | `authMiddleware` (Bearer token/cookie) | `authLimiter` (30 req / 15 min per user) |
| **Bookings** | `/api/bookings`, `/api/bookings/:id` | `protect` | Creation: `bookingCreateLimiter` (20 req / 15 min); reads/status mutations: `bookingsLimiter` (100 req / 15 min per user) |
| **AI Booking** | `/api/bookings/ai-booking` | `protect` | `aiBookingLimiter` (10 req / 15 min) + `aiUsageManager` |
| **Driver Telemetry** | `/api/drivers/location` | `protect`, `authorize('driver')` | `locationTrackingLimiter` (600 req / 15 min per driver) |
| **Driver Core** | `/api/drivers`, `/api/drivers/heatmap`, `/api/drivers/:id/metrics` | `protect`, `authorize('driver', 'admin')` | `apiLimiter` (100 req / 15 min per user) |
| **Admin & Reports** | `/api/admin/stats/*`, `/api/analytics/*` | `authMiddleware`, `authorize('admin')` | `adminReportsLimiter` (60 req / 15 min per admin) |
| **Wallet Mutations** | `/api/wallet/create-order`, `/api/wallet/referral`, `/api/wallet/verify-funds` | `authMiddleware` | `authLimiter` (30 req / 15 min per user) |
| **Payments** | `/api/integrations/payment/create-order`, `/payment/verify`, customer Pro payment routes | `protect` / `authMiddleware` | `paymentLimiter` (20 req / 15 min per user) |
| **Contact Form** | `/api/integrations/contact-message` | Public (Zod validated) | `contactLimiter` (5 req / 15 min per IP) |
| **Voice Query** | `/api/ivr/voice-query` | `optionalAuth` | `voiceQueryLimiter` (30 req / 15 min per user/IP) |
| **Webhooks / Public Reads** | Razorpay, WhatsApp, IVR callbacks; `/api/health`, `/api/config` | Signed webhook or public | `webhookLimiter` (120 req / 15 min per IP); `publicReadLimiter` (120 req / 15 min per IP) |
| **Socket Chat** | `send_message`, `driver_sos` | Socket JWT auth | Max 5 messages / 3s per socket + sliding-window GC |

---

### 11.2 Rate Limiting Architecture & Client Identity Hardening

1. **Server-Side Enforcement & Ordering:**
   - On all protected routes, authentication (`protect` / `authMiddleware`) runs **prior** to the rate limiter.
   - `getClientKey(req)` extracts `usr_${req.user.id}` for authenticated callers, providing per-account quota separation even when multiple users share an enterprise NAT or college Wi-Fi IP.
   - For unauthenticated traffic, `getClientKey` falls back to `req.ip`.
2. **Untrusted Client Header Rejection:**
   - Spoofed client headers (`X-User-Id`, `User-Id`, `X-Forwarded-User`) are strictly ignored by `getClientKey` and cannot bypass IP quotas.
3. **Reverse Proxy Trust Configuration:**
   - In `backend/src/app.js`, `app.set('trust proxy', process.env.TRUST_PROXY || (isProd ? 1 : false))` is configured so standard single-hop reverse proxies (e.g. Render, Vercel, Nginx, AWS ALB) correctly populate `req.ip` from the leftmost proxy IP rather than arbitrary spoofed headers.
4. **Standard HTTP 429 Responses:**
   - Returns HTTP 429 with `Retry-After: <seconds>` header and a safe JSON structure:
     ```json
     {
       "success": false,
       "message": "Too many requests, please try again after 15 minutes",
       "retryAfter": 900
     }
     ```
5. **Driver GPS Tracking Protection (`locationTrackingLimiter`):**
   - Live navigation requires updates every 5-10s (~90-180 requests per 15 minutes).
   - Blanket 100 req/15min `apiLimiter` was removed from `/api/drivers/location` and replaced with `locationTrackingLimiter` (600 requests / 15 min), guaranteeing that continuous navigation is never disrupted by premature 429 errors.
6. **Socket abuse controls:**
   - Socket connection attempts are capped per source address (`SOCKET_CONNECTION_MAX`, default 30 per 15 minutes in production).
   - Driver location events are capped at `SOCKET_LOCATION_MAX_PER_MINUTE` (default 120) per socket while preserving normal 5-10 second GPS updates.
   - Socket limits are process-local and must be backed by shared storage or an edge/WAF policy before horizontal scale-out.

---

### 11.3 AI Cost Controls, Quotas & Abuse Prevention (`aiUsageManager.js`)

| Safeguard | Configuration / Default | Behavior & Defense |
| :--- | :--- | :--- |
| **Kill Switch** | `AI_FEATURE_ENABLED=true` | Instantly disables all external LLM calls. Both support chat and voice booking gracefully fall back to deterministic NLP and helpline notices without downtime. |
| **Global Daily Quota** | `AI_DAILY_QUOTA_LIMIT=500` | Rejects requests exceeding 500 LLM calls per day (`reason: 'DAILY_QUOTA_EXCEEDED'`) to prevent runaway bills. Resets automatically at 00:00 UTC. |
| **Concurrency Ceiling** | `AI_MAX_CONCURRENT_REQUESTS=5` | Limits in-flight simultaneous requests to Groq to prevent request storms. Rejects excess callers with `CONCURRENCY_LIMIT`. |
| **Per-User Rate Limit** | `AI_USER_RATE_LIMIT_PER_MINUTE=10` | Enforces a sliding 60-second window per user/IP to prevent bot flooding. |
| **Request Timeout** | `AI_REQUEST_TIMEOUT_MS=8000`; `AI_TRANSCRIPTION_TIMEOUT_MS=10000` | Text and Whisper calls are wrapped in bounded timeouts. Stalled provider connections abort after the configured deadline. |
| **Token & Input Bounds** | Max 500 chars in / 300 tokens out | Transcripts and queries are safely truncated to 500 characters before prompt interpolation; completion capped at `max_tokens: 300`. |
| **FAQ Fast Cache** | In-memory pattern matching | High-frequency pricing, cancellation, and helpline questions resolve instantly in 0ms with **0 external AI tokens** consumed. |
| **Non-Retryable Handling** | Groq 4xx responses | Immediately returned without retries. Only unknown/5xx failures receive one bounded fallback-model attempt with a short backoff; no unbounded retries occur. |
| **Provider Usage Telemetry** | Safe console metadata | Records outcome, model, latency, input size, and output token count when returned; never logs API keys, prompts, authorization headers, or GPS coordinates. |
| **Deterministic Fallback** | Linear ReDoS-safe Parser | If AI is disabled or at capacity, `aiVoiceBooking` seamlessly parses pickup, drop, tempo type, and time using local heuristics. |

HTTP limiter defaults are configurable through `RATE_LIMIT_*` variables in `backend/.env.example`; production defaults are conservative while test/development defaults remain high enough for isolated QA. Payment, batch-booking, webhook, public-read, and booking-creation operations have separate limits. No Redis or new shared infrastructure was introduced.

---

### 11.4 Verification Tests & Results

A dedicated integration test suite was created: `backend/tests/integration/rate_limiting_ai_protection.test.js` (`19` tests passed in the focused run).

| Test # | Test Case Description | Result |
| :---: | :--- | :---: |
| 1 | Requests below configured limit succeed (HTTP 200) | **PASS** |
| 2 | Requests exceeding limit receive HTTP 429 with `Retry-After` and standard JSON | **PASS** |
| 3 | Server-verified `req.user.id` isolates rate limits for different users sharing an IP | **PASS** |
| 4 | Spoofed client headers (`X-User-Id`, `User-Id`) are strictly ignored for rate limiting | **PASS** |
| 5 | Location tracking limiter allows rapid driver GPS pings without false 429s | **PASS** |
| 6 | Kill switch (`AI_FEATURE_ENABLED=false`) immediately rejects AI requests with safe reason | **PASS** |
| 7 | Daily quota enforcement blocks calls when `AI_DAILY_QUOTA_LIMIT` is reached | **PASS** |
| 8 | Concurrency limiter caps simultaneous in-flight AI requests | **PASS** |
| 9 | Per-user minute rate limit prevents single-user AI flooding | **PASS** |
| 10 | Bounded execution helper times out stalled external calls at configured ms | **PASS** |
| 11 | FAQ fast-cache answers pricing/helpline questions instantly with 0 AI slots used | **PASS** |
| 12 | Support bot provides polite helpline fallback when AI is disabled | **PASS** |
| 13 | AI Voice booking endpoint falls back seamlessly to deterministic NLP when Groq is unavailable | **PASS** |
| 14 | Oversized input transcripts are bounded to 500 chars to prevent token bloat | **PASS** |
| 15 | Operational metrics track request counts and tracked users safely without PII | **PASS** |
| 16 | Authenticated expensive route limits isolate users sharing an IP | **PASS** |
| 17 | Missing Groq configuration does not leak AI concurrency slots | **PASS** |
| 18 | Client-supplied AI booking customer ID cannot bypass authentication | **PASS** |
| 19 | Mocked Groq provider 429 is handled without retry storms | **PASS** |

**Full Monorepo Pre-Commit Suite (`node run_all_tests.js`):**
- Backend: Jest Unit & Integration Tests (15 Suites, 160 Tests): **100% PASS**
- Frontend: Oxlint Static Analysis (82 files): **0 errors, PASS**
- Frontend: Production Bundle Compilation (Vite): **PASS**
- Mobile: TypeScript Typecheck (`tsc --noEmit`): **0 errors, PASS**
- Frontend: Vitest (7 files, 23 tests): **100% PASS**
- Mobile: Full QA Integration Test Suite (31 Test Cases, 70 Assertions): **100% PASS**
- Mobile production export: **PASS** with required API URL; release endpoint/signing validation remains manual. Mobile audit: **OPEN** (21 vulnerabilities).

---

### 11.5 Remaining Abuse, Cost Risks & Deployment Topology Notes

1. **In-Memory Rate Limiting & Scaling Topology:**
   - Rate limit counters and AI slot tracking currently use optimized in-memory data structures (`Map` with automated sliding-window garbage collection).
   - *Limitation:* For a single-instance container deployment (Render Free/Starter, AWS EC2 single container, Railway), this in-memory architecture provides zero-dependency protection with minimal latency.
   - *Multi-Instance Scale-Out:* If scaled horizontally across multiple container replicas, per-instance memory counters do not coordinate unless backed by shared storage. The repository contains `REDIS_URL` support; for multi-instance production clusters, configuring an Upstash Redis instance enables distributed rate limiting.
2. **Pre-Paid Third-Party API Limits:**
   - Application-level limits (`AI_DAILY_QUOTA_LIMIT`, `otpLimiter`) prevent runaway internal execution. However, they do not replace provider-side spending caps and alerts.
3. **Provider and edge controls still required:**
   - Configure Groq spend/rate alerts and key restrictions in the provider dashboard; application quotas are not a monetary billing cap.
   - Configure Fast2SMS credit alerts and sender restrictions; verify Razorpay webhook rate/alerting and signature settings.
   - Configure the deployment platform’s trusted proxy hop count via `TRUST_PROXY`; do not enable unrestricted forwarded-header trust.
   - If deploying more than one backend replica, move rate-limit, AI quota, and socket-attempt state to shared storage or enforce equivalent limits at the gateway/WAF. The current implementation intentionally does not add Redis without a deployment decision.

---

### 11.6 Mandatory Provider Dashboard Configuration Actions

| Provider | Dashboard Action Required | Recommended Setting |
| :--- | :--- | :--- |
| **Groq Console** (`console.groq.com`) | Set monthly billing spend cap and usage notifications | Set hard spend limit (e.g. $10-$25/mo) and 80% usage alert email. |
| **Fast2SMS Dashboard** | Restrict API key to production server IP & set balance alerts | Enable low balance SMS alert when wallet drops below ₹200. Restrict sender ID. |
| **Razorpay Dashboard** | Webhook secret and IP allowlisting | Configure `RAZORPAY_WEBHOOK_SECRET` matching server env. Enable email alert on transaction spikes. |
| **Render / Cloud Host** | Configure `TRUST_PROXY=1` and `AI_FEATURE_ENABLED=true` | Set environment variables in the Render service settings before launch. |

---

*Report updated autonomously following the Antigravity Deployment Readiness Protocol. All tests, builds, and audit findings have been verified against active repository code.*

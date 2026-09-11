# Eminence Logistics — Manual QA Test Cases

> **Setup**: Ensure `npm run dev` is running in both `backend/` and `frontend/`. Backend: `http://localhost:5000` | Frontend: `http://localhost:5173`  
> **Seeded Credentials**:
> - Admin: `admin@eminence.com` / `adminpassword123`
> - Demo Customer Phone: `1234567890`

---

## 🔐 MODULE 1: Authentication & Authorization

### TC-001 — Customer Phone Login (OTP Flow)
| Field | Details |
|-------|---------|
| **Precondition** | App is running, no user is logged in |
| **Steps** | 1. Go to `http://localhost:5173` → Click "Sign In" / "Get Started" <br> 2. Enter phone number `1234567890` <br> 3. Click "Send OTP" <br> 4. Enter any 6-digit OTP (simulation accepts any) <br> 5. Click "Verify" |
| **Expected Result** | ✅ Redirected to Customer Dashboard. User name "Demo User" visible. |
| **Status** | `[ ] Pass` `[ ] Fail` |

### TC-002 — Admin Login
| Field | Details |
|-------|---------|
| **Precondition** | App is running |
| **Steps** | 1. Navigate to `/admin/login` <br> 2. Enter email: `admin@eminence.com` <br> 3. Enter password: `adminpassword123` <br> 4. Click "Login" |
| **Expected Result** | ✅ Redirected to Admin Dashboard. Overview stats visible. |
| **Status** | `[ ] Pass` `[ ] Fail` |

### TC-003 — Invalid Admin Login
| Field | Details |
|-------|---------|
| **Steps** | 1. Go to Admin login <br> 2. Enter wrong password `wrongpassword` <br> 3. Click "Login" |
| **Expected Result** | ✅ Error message shown. No redirect. |
| **Status** | `[ ] Pass` `[ ] Fail` |

### TC-004 — Route Guard (Unauthorized Access)
| Field | Details |
|-------|---------|
| **Steps** | 1. While logged out, navigate directly to `/dashboard` or `/admin` |
| **Expected Result** | ✅ Redirected to login page. Access denied. |
| **Status** | `[ ] Pass` `[ ] Fail` |

---

## 📱 MODULE 2: Customer Dashboard & Booking

### TC-010 — View Customer Dashboard
| Field | Details |
|-------|---------|
| **Precondition** | Logged in as Demo Customer |
| **Steps** | 1. Log in with phone `1234567890` <br> 2. Navigate to Dashboard |
| **Expected Result** | ✅ Booking history visible with 2 seeded rides (Swargate→Hinjewadi, Pune Station→Kothrud). |
| **Status** | `[ ] Pass` `[ ] Fail` |

### TC-011 — Create a Standard Booking
| Field | Details |
|-------|---------|
| **Precondition** | Logged in as customer |
| **Steps** | 1. Click "Book a Tempo" <br> 2. Fill in: Pickup: `Koregaon Park, Pune`, Drop: `Viman Nagar, Pune` <br> 3. Select tempo type: `Small` <br> 4. Enter weight: `150` kg, Goods: `Electronics` <br> 5. Pick today's date and a time <br> 6. Click "Confirm Booking" |
| **Expected Result** | ✅ Booking created. Confirmation message shown. Appears in ride history. |
| **Status** | `[ ] Pass` `[ ] Fail` |

### TC-012 — Booking with Multi-Stop Addresses
| Field | Details |
|-------|---------|
| **Steps** | 1. Create a booking <br> 2. Add 2 additional stop addresses <br> 3. Confirm |
| **Expected Result** | ✅ Booking saved with multiple drop addresses. |
| **Status** | `[ ] Pass` `[ ] Fail` |

### TC-013 — ESG Emissions Badge in Ride History
| Field | Details |
|-------|---------|
| **Precondition** | TC-011 completed |
| **Steps** | 1. Go to Customer Dashboard → Ride History <br> 2. Find the newly created booking |
| **Expected Result** | ✅ Green 🌿 ESG badge visible showing estimated CO2 kg saved. |
| **Status** | `[ ] Pass` `[ ] Fail` |

### TC-014 — Save Address to Address Book
| Field | Details |
|-------|---------|
| **Steps** | 1. Go to Customer Dashboard → "Address Book" tab <br> 2. Click "Add Address" <br> 3. Fill in Label: `Home`, Street: `123 MG Road`, City: `Pune`, Postal: `411001` <br> 4. Save |
| **Expected Result** | ✅ New address appears in the address book list. |
| **Status** | `[ ] Pass` `[ ] Fail` |

### TC-015 — Wallet Balance View
| Field | Details |
|-------|---------|
| **Steps** | 1. Go to Customer Dashboard → "Wallet" tab |
| **Expected Result** | ✅ Wallet balance shown. Transaction history visible (if any). |
| **Status** | `[ ] Pass` `[ ] Fail` |

### TC-016 — Referral Code Copy
| Field | Details |
|-------|---------|
| **Steps** | 1. On Customer Dashboard, find the referral section <br> 2. Click "Copy Code" button |
| **Expected Result** | ✅ "Copied!" feedback shown. Code copied to clipboard. |
| **Status** | `[ ] Pass` `[ ] Fail` |

---

## 🚚 MODULE 3: Driver Dashboard

### TC-020 — Driver Dashboard Access
| Field | Details |
|-------|---------|
| **Precondition** | A driver account exists (seeded: Ramesh Kumar) |
| **Steps** | 1. Log in as a driver <br> 2. Navigate to Driver Dashboard |
| **Expected Result** | ✅ Driver dashboard loads with earnings summary and incoming requests panel. |
| **Status** | `[ ] Pass` `[ ] Fail` |

### TC-021 — AI Demand Heatmap
| Field | Details |
|-------|---------|
| **Steps** | 1. On Driver Dashboard, navigate to the "Heatmap" section <br> 2. Call `GET http://localhost:5000/api/drivers/heatmap` |
| **Expected Result** | ✅ Surge zone data returned with lat/lng coordinates and demand scores. |
| **Status** | `[ ] Pass` `[ ] Fail` |

### TC-022 — Driver Payslip Generation
| Field | Details |
|-------|---------|
| **Steps** | 1. Find a valid Driver ID from admin panel <br> 2. Call `GET http://localhost:5000/api/drivers/{driverId}/payslip` with a valid token |
| **Expected Result** | ✅ JSON response with `grossEarnings: 15000`, `platformFee: 2250`, `tdsTax: 150`, `netPayout: 12600`. |
| **Status** | `[ ] Pass` `[ ] Fail` |

### TC-023 — WMS Barcode Scan (Simulation)
| Field | Details |
|-------|---------|
| **Steps** | 1. POST `http://localhost:5000/api/drivers/scan-inventory` with body: `{ "barcode": "EMN-BOX-001" }` |
| **Expected Result** | ✅ Response: `{ success: true, item: { barcode: 'EMN-BOX-001', status: 'Loaded' } }` |
| **Status** | `[ ] Pass` `[ ] Fail` |

---

## 🏢 MODULE 4: Admin Dashboard

### TC-030 — Overview Stats Panel
| Field | Details |
|-------|---------|
| **Precondition** | Logged in as Admin |
| **Steps** | 1. Go to Admin Dashboard → Overview tab |
| **Expected Result** | ✅ Cards showing Total Revenue, Active Drivers, Total Vehicles, Total Customers. |
| **Status** | `[ ] Pass` `[ ] Fail` |

### TC-031 — Revenue Chart (Analytics)
| Field | Details |
|-------|---------|
| **Steps** | 1. Admin Dashboard → Analytics tab <br> 2. Observe Revenue chart |
| **Expected Result** | ✅ Line/bar chart rendered with 7-day revenue data (mock fallback if no real data). |
| **Status** | `[ ] Pass` `[ ] Fail` |

### TC-032 — Add New Driver
| Field | Details |
|-------|---------|
| **Steps** | 1. Admin Dashboard → Drivers tab <br> 2. Click "Add Driver" <br> 3. Fill: Name: `Test Driver`, Phone: `9999999999`, License: `MH12XY9999` <br> 4. Save |
| **Expected Result** | ✅ New driver appears in the drivers list. |
| **Status** | `[ ] Pass` `[ ] Fail` |

### TC-033 — Add New Vehicle
| Field | Details |
|-------|---------|
| **Steps** | 1. Admin Dashboard → Vehicles tab <br> 2. Click "Add Vehicle" <br> 3. Fill: Registration: `MH-01-AA-1111`, Type: `Large`, Capacity: `2000` <br> 4. Save |
| **Expected Result** | ✅ New vehicle appears in vehicles list. |
| **Status** | `[ ] Pass` `[ ] Fail` |

### TC-034 — Real-Time Fleet Telematics (IoT)
| Field | Details |
|-------|---------|
| **Steps** | 1. Admin Dashboard → Telematics tab <br> 2. Start a telematics session for a vehicle |
| **Expected Result** | ✅ Live dials for Speed, RPM, Engine Temp, Fuel updating every 2 seconds. `healthScore` field visible. |
| **Status** | `[ ] Pass` `[ ] Fail` |

### TC-035 — Predictive Maintenance Alert
| Field | Details |
|-------|---------|
| **Steps** | 1. Let the telematics simulator run for ~2 minutes <br> 2. Watch the Alert field on the dashboard |
| **Expected Result** | ✅ Eventually emits `PREDICTIVE_MAINTENANCE_WARNING` when healthScore < 50. |
| **Status** | `[ ] Pass` `[ ] Fail` |

### TC-036 — Live Chat Inbox
| Field | Details |
|-------|---------|
| **Steps** | 1. Admin → Live Chat tab <br> 2. Send a message to a customer session |
| **Expected Result** | ✅ Message appears in real-time via Socket.io. |
| **Status** | `[ ] Pass` `[ ] Fail` |

### TC-037 — View Audit Logs
| Field | Details |
|-------|---------|
| **Steps** | 1. Call `GET http://localhost:5000/api/analytics/audit-logs` with Admin token |
| **Expected Result** | ✅ Paginated list of actions performed (e.g., driver creates/updates). |
| **Status** | `[ ] Pass` `[ ] Fail` |

---

## 🚀 MODULE 5: Next-Gen Enterprise APIs

### TC-040 — Blockchain Proof of Delivery
| Field | Details |
|-------|---------|
| **Steps** | 1. Get a valid booking ID from the DB <br> 2. POST `http://localhost:5000/api/bookings/{id}/complete` with Auth token |
| **Expected Result** | ✅ `booking.podHash` field populated with a 64-char SHA-256 hex string. `booking.status` = `completed`. |
| **Status** | `[ ] Pass` `[ ] Fail` |

### TC-041 — 3PL Failover (No Drivers Available)
| Field | Details |
|-------|---------|
| **Steps** | 1. Set all drivers to `inactive` in DB <br> 2. Create a new booking via `POST /api/bookings` |
| **Expected Result** | ✅ `booking.is3plOutsourced = true`, `booking.thirdPartyProvider = 'Delhivery Logistics'`, `status = driver_assigned`. |
| **Status** | `[ ] Pass` `[ ] Fail` |

### TC-042 — ESG Carbon Calculation
| Field | Details |
|-------|---------|
| **Steps** | 1. Create a booking with `tempoType: 'large'` and `totalDistance: 10` (if applicable) |
| **Expected Result** | ✅ `booking.esgEmissions` is populated with a non-zero float value. |
| **Status** | `[ ] Pass` `[ ] Fail` |

### TC-043 — AI Voice Booking (NLP Endpoint)
| Field | Details |
|-------|---------|
| **Steps** | 1. POST `http://localhost:5000/api/bookings/ai-booking` with Auth token <br> Body: `{ "transcript": "I need a large tempo to Mumbai tomorrow morning" }` |
| **Expected Result** | ✅ `{ success: true, booking: { tempoType: 'large', estimatedFare: 1200 } }` |
| **Status** | `[ ] Pass` `[ ] Fail` |

### TC-044 — Dynamic Surge Pricing
| Field | Details |
|-------|---------|
| **Steps** | 1. GET `http://localhost:5000/api/analytics/surge` with Admin token |
| **Expected Result** | ✅ Response with `surgeMultiplier`, `surgeLabel`, `activeBookings`, `availableDrivers`, `demandRatio`. |
| **Status** | `[ ] Pass` `[ ] Fail` |

---

## ⚙️ MODULE 6: Infrastructure & SLA

### TC-050 — Health Check Endpoint
| Field | Details |
|-------|---------|
| **Steps** | 1. GET `http://localhost:5000/api/health` (no auth required) |
| **Expected Result** | ✅ `{ success: true, message: 'EMINENCE API is running', uptimeSeconds: <number>, memoryUsageMb: <number> }` |
| **Status** | `[ ] Pass` `[ ] Fail` |

### TC-051 — SLA Monitoring Endpoint
| Field | Details |
|-------|---------|
| **Steps** | 1. GET `http://localhost:5000/api/analytics/sla` with Admin token |
| **Expected Result** | ✅ `{ sla: { uptimeHours, dbLatencyMs, memoryUsageMb, cacheStats, activeAlerts } }` |
| **Status** | `[ ] Pass` `[ ] Fail` |

### TC-052 — Platform White-Label Config
| Field | Details |
|-------|---------|
| **Steps** | 1. GET `http://localhost:5000/api/config` (no auth) |
| **Expected Result** | ✅ `{ config: { brandName: 'Eminence Logistics', primaryColor: '#b87333' } }` |
| **Status** | `[ ] Pass` `[ ] Fail` |

### TC-053 — Update Platform Config
| Field | Details |
|-------|---------|
| **Steps** | 1. PUT `http://localhost:5000/api/analytics/platform-config` with Admin token <br> Body: `{ "brandName": "Eminence Pro", "primaryColor": "#FF5733" }` |
| **Expected Result** | ✅ Config updated. GET `/api/config` returns new values. |
| **Status** | `[ ] Pass` `[ ] Fail` |

### TC-054 — Export Bookings (Expense Report)
| Field | Details |
|-------|---------|
| **Steps** | 1. GET `http://localhost:5000/api/analytics/export-bookings` with Admin token |
| **Expected Result** | ✅ Array of bookings with `{ id, date, pickup, drop, fare, status, esgEmissions, podHash }`. |
| **Status** | `[ ] Pass` `[ ] Fail` |

---

## ⭐ MODULE 7: Reviews & Ratings

### TC-060 — Submit a Driver Review
| Field | Details |
|-------|---------|
| **Precondition** | Valid `driverId` and `customerId` available |
| **Steps** | 1. POST `http://localhost:5000/api/reviews` <br> Body: `{ "driverId": "<id>", "customerId": "<id>", "rating": 5, "comment": "Excellent service!" }` |
| **Expected Result** | ✅ Review created. Driver's average rating updated in DB. |
| **Status** | `[ ] Pass` `[ ] Fail` |

### TC-061 — Get Driver Reviews
| Field | Details |
|-------|---------|
| **Steps** | 1. GET `http://localhost:5000/api/reviews/driver/<driverId>` |
| **Expected Result** | ✅ List of reviews for that driver returned. |
| **Status** | `[ ] Pass` `[ ] Fail` |

---

## 🏦 MODULE 8: B2B & Payments

### TC-070 — B2B Business Registration
| Field | Details |
|-------|---------|
| **Precondition** | Logged in as customer |
| **Steps** | 1. POST `http://localhost:5000/api/b2b/register` with Auth token <br> Body: `{ "businessName": "Acme Corp", "gstNumber": "29ABCDE1234F1Z5" }` |
| **Expected Result** | ✅ Business registered. Can now access postpaid/credit features. |
| **Status** | `[ ] Pass` `[ ] Fail` |

### TC-071 — B2B Contract Request
| Field | Details |
|-------|---------|
| **Steps** | 1. POST `http://localhost:5000/api/b2b/contracts` with Auth token <br> Body: `{ "vehicleType": "large", "vehicleCount": 2, "startDate": "2026-09-10", "endDate": "2026-10-10" }` |
| **Expected Result** | ✅ Contract created with `status: 'pending'`. |
| **Status** | `[ ] Pass` `[ ] Fail` |

### TC-072 — View Invoices
| Field | Details |
|-------|---------|
| **Steps** | 1. GET `http://localhost:5000/api/b2b/invoices` with Auth token |
| **Expected Result** | ✅ List of invoices returned (empty array if none yet). |
| **Status** | `[ ] Pass` `[ ] Fail` |

---

## 📋 TEST SUMMARY

| Module | Total TCs | Pass | Fail | Blocked |
|--------|-----------|------|------|---------|
| Auth & Authorization | 4 | | | |
| Customer Dashboard | 7 | | | |
| Driver Dashboard | 4 | | | |
| Admin Dashboard | 8 | | | |
| Next-Gen Enterprise | 5 | | | |
| Infrastructure & SLA | 5 | | | |
| Reviews & Ratings | 2 | | | |
| B2B & Payments | 3 | | | |
| **TOTAL** | **38** | | | |

---

## 🐛 Bug Report Template

Use this for any failures found during testing:

```
Bug ID: BUG-XXX
TC Reference: TC-0XX
Severity: Critical / High / Medium / Low
Summary: [One-line description]
Steps to Reproduce:
  1.
  2.
  3.
Expected: 
Actual: 
Screenshot/Log: [Attach if available]
```

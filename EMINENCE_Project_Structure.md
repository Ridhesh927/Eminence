# EMINENCE — Smart Transport Booking & Helpline Management System
## Complete Project Structure & Architecture

**Project Name:** Eminence  
**Team:** Ridhesh, Krishna, Sanket, Pranay  
**Database:** NeonDB (PostgreSQL)  
**Stack:** MERN with PostgreSQL  
**Timeline:** 12 weeks (MVP + Enhancement + Buffer)

---

## 📋 Table of Contents
1. [Project Overview](#project-overview)
2. [Tech Stack](#tech-stack)
3. [Database Choice Analysis](#database-choice-analysis)
4. [Project Directory Structure](#project-directory-structure)
5. [Backend Architecture](#backend-architecture)
6. [Frontend Architecture](#frontend-architecture)
7. [API Endpoints](#api-endpoints)
8. [Database Schema](#database-schema)
9. [Integration Flow](#integration-flow)
10. [Deployment Plan](#deployment-plan)

---

## Project Overview

**Eminence** is a dual-channel transport booking platform that allows customers to book tempos via:
- **Website (React)** — for new/casual customers
- **IVR Helpline (Twilio)** — for repeat customers (no re-entry of details)

**Core Value:** Repeat customers call a helpline number, system recognizes them via caller ID, auto-fetches their saved addresses, and completes booking via voice without them repeating information.

---

## Tech Stack

### **Frontend**
- React.js 18+ (Vite for fast builds)
- HTML5, CSS3, JavaScript (ES6+)
- Axios (HTTP client)
- Redux Toolkit (state management)
- Tailwind CSS (styling)
- React Router v6 (navigation)
- Google Maps API (integration)
- Razorpay SDK (payments)

### **Backend**
- Node.js v18+
- Express.js 4.x
- PostgreSQL (via NeonDB)
- Sequelize ORM (database abstraction)
- JWT (authentication)
- Bcrypt (password hashing)
- Twilio SDK (Voice + SMS)
- Google Maps API (Distance Matrix)
- WhatsApp Business API SDK
- Nodemailer (email notifications)
- Socket.io (real-time updates for GPS tracking)

### **Database**
- **NeonDB** — Serverless PostgreSQL
- Sequel Pro / pgAdmin for management
- Database migrations via Sequelize

### **External APIs**
- Twilio (Voice IVR + SMS confirmations)
- Google Maps (Distance Matrix, Geocoding, Tracking)
- WhatsApp Business API (WhatsApp confirmations)
- Razorpay (Payment gateway)

### **Deployment**
- **Frontend:** Vercel (auto-deploy from GitHub)
- **Backend:** Render.com or Railway.app (Node.js)
- **Database:** NeonDB (hosted PostgreSQL)
- **Version Control:** GitHub

---

## Database Choice Analysis

### **Original Plan: MongoDB**
- ✅ Flexible schema (good for rapid prototyping)
- ✅ Document-based (natural fit for customer profiles + booking history)
- ❌ Overkill for structured relational data (customers → bookings → drivers)
- ❌ No ACID transactions by default (risky for concurrent bookings)
- ❌ More expensive at scale

### **New Choice: NeonDB (PostgreSQL)**

#### **Why NeonDB?**

1. **Serverless Scaling** — Auto-scales with load, pay-per-query
2. **Reliability** — ACID transactions ensure no double-bookings
3. **Cost-Effective** — Free tier covers MVP (~1GB storage, 100k queries/month)
4. **PostgreSQL Power** — Full-text search, JSON support (hybrid relational + document data)
5. **Real-time Sync** — Native support for concurrent booking handling
6. **Easy Deployment** — Vercel + NeonDB integrate seamlessly
7. **Better for Relationships** — Customers → Bookings → Drivers → Vehicles (structured queries)

#### **Does Switching from MongoDB → PostgreSQL Affect the Project?**

**❌ MINIMAL IMPACT** — Here's why:

| Aspect | MongoDB | PostgreSQL (NeonDB) | Impact |
|--------|---------|-------------------|--------|
| **Schema** | Flexible, no upfront design | Structured, migrations needed | Low — Sequelize handles both |
| **Relationships** | Manual joins (complex) | Native foreign keys | ✅ BETTER for booking system |
| **Transactions** | Limited | Full ACID support | ✅ BETTER for concurrent bookings |
| **Query Language** | MongoDB query syntax | SQL | Minor — ORM abstracts it |
| **Scaling** | Horizontal sharding | Vertical + auto-scale | ✅ Better for startup phase |
| **Cost (Free Tier)** | 512MB → paid quickly | 1GB + 100k queries/month | ✅ MUCH BETTER |
| **JSON Support** | Native | JSONB type available | Both work fine |

**The Good News:** Using Sequelize ORM means:
- Models are defined the same way
- If you want to switch back to MongoDB, just swap the dialect
- Query patterns remain similar
- Most business logic is unchanged

**What Changes:**
1. Schema migration syntax (Sequelize handles it)
2. Data validation rules (now in migration files)
3. Complex query syntax (SQL vs MongoDB) — but ORM abstracts this

**Bottom Line:** Switching to PostgreSQL/NeonDB is a **net positive**. You get better concurrency handling, cheaper hosting, and more reliable transactions for a booking system. The migration effort is minimal (~2-3 hours to rewrite schema).

---

## Project Directory Structure

```
eminence/
│
├── frontend/                          # React.js application
│   ├── public/
│   │   ├── index.html
│   │   ├── favicon.ico
│   │   └── manifest.json
│   │
│   ├── src/
│   │   ├── components/
│   │   │   ├── Auth/
│   │   │   │   ├── Login.jsx
│   │   │   │   ├── Register.jsx
│   │   │   │   └── OTPVerification.jsx
│   │   │   │
│   │   │   ├── Booking/
│   │   │   │   ├── BookingForm.jsx         # Dual-input form (address select or manual)
│   │   │   │   ├── FareEstimate.jsx
│   │   │   │   ├── BookingConfirmation.jsx
│   │   │   │   └── BookingStatus.jsx
│   │   │   │
│   │   │   ├── Customer/
│   │   │   │   ├── CustomerDashboard.jsx
│   │   │   │   ├── BookingHistory.jsx
│   │   │   │   ├── SavedAddresses.jsx
│   │   │   │   └── Profile.jsx
│   │   │   │
│   │   │   ├── Driver/
│   │   │   │   ├── DriverDashboard.jsx
│   │   │   │   ├── ActiveBookings.jsx
│   │   │   │   ├── LocationTracking.jsx
│   │   │   │   └── EarningsHistory.jsx
│   │   │   │
│   │   │   ├── Admin/
│   │   │   │   ├── AdminDashboard.jsx
│   │   │   │   ├── AllBookings.jsx
│   │   │   │   ├── DriverManagement.jsx
│   │   │   │   ├── Analytics.jsx
│   │   │   │   └── RevenueReports.jsx
│   │   │   │
│   │   │   ├── Maps/
│   │   │   │   ├── MapComponent.jsx        # Google Maps integration
│   │   │   │   ├── DriverLocationMap.jsx
│   │   │   │   └── RouteMap.jsx
│   │   │   │
│   │   │   ├── Shared/
│   │   │   │   ├── Navbar.jsx
│   │   │   │   ├── Footer.jsx
│   │   │   │   ├── ConfirmationModal.jsx
│   │   │   │   ├── LoadingSpinner.jsx
│   │   │   │   └── ErrorBoundary.jsx
│   │   │   │
│   │   │   └── Payment/
│   │   │       ├── RazorpayCheckout.jsx
│   │   │       └── PaymentStatus.jsx
│   │   │
│   │   ├── pages/
│   │   │   ├── Home.jsx
│   │   │   ├── BookingPage.jsx
│   │   │   ├── UserDashboard.jsx
│   │   │   ├── NotFound.jsx
│   │   │   └── PrivacyPolicy.jsx
│   │   │
│   │   ├── redux/
│   │   │   ├── store.js
│   │   │   ├── slices/
│   │   │   │   ├── authSlice.js
│   │   │   │   ├── bookingSlice.js
│   │   │   │   ├── userSlice.js
│   │   │   │   └── mapSlice.js
│   │   │   └── thunks/
│   │   │       ├── authThunks.js
│   │   │       └── bookingThunks.js
│   │   │
│   │   ├── services/
│   │   │   ├── api.js                 # Axios instance + base URL
│   │   │   ├── authService.js
│   │   │   ├── bookingService.js
│   │   │   ├── mapService.js
│   │   │   └── paymentService.js
│   │   │
│   │   ├── utils/
│   │   │   ├── constants.js
│   │   │   ├── validators.js
│   │   │   ├── formatters.js           # Date, currency formatting
│   │   │   └── helpers.js
│   │   │
│   │   ├── hooks/
│   │   │   ├── useAuth.js
│   │   │   ├── useBooking.js
│   │   │   └── useLocation.js
│   │   │
│   │   ├── styles/
│   │   │   ├── index.css
│   │   │   ├── tailwind.config.js
│   │   │   └── theme.css
│   │   │
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── vite.config.js
│   │
│   ├── package.json
│   ├── .env.example
│   └── .gitignore
│
│
├── backend/                           # Node.js + Express backend
│   ├── src/
│   │   ├── config/
│   │   │   ├── database.js            # NeonDB connection config
│   │   │   ├── env.js                 # Environment variables
│   │   │   └── constants.js
│   │   │
│   │   ├── models/                    # Sequelize ORM models
│   │   │   ├── Customer.js
│   │   │   ├── Booking.js
│   │   │   ├── Driver.js
│   │   │   ├── Vehicle.js
│   │   │   ├── Address.js             # Saved customer addresses
│   │   │   ├── Payment.js
│   │   │   ├── Notification.js
│   │   │   ├── OperatorLog.js         # Helpline operator activity
│   │   │   └── associations.js        # Define model relationships
│   │   │
│   │   ├── controllers/
│   │   │   ├── authController.js      # Register, login, OTP verification
│   │   │   ├── bookingController.js   # Create, update, cancel bookings
│   │   │   ├── driverController.js    # Driver availability, location update
│   │   │   ├── addressController.js   # Save/fetch customer addresses
│   │   │   ├── paymentController.js   # Razorpay integration
│   │   │   ├── notificationController.js # Send SMS/WhatsApp/Voice
│   │   │   ├── analyticsController.js # Reports and stats
│   │   │   ├── adminController.js     # Fleet management
│   │   │   └── ivrController.js       # Twilio IVR logic
│   │   │
│   │   ├── routes/
│   │   │   ├── authRoutes.js          # /api/auth/*
│   │   │   ├── bookingRoutes.js       # /api/bookings/*
│   │   │   ├── driverRoutes.js        # /api/drivers/*
│   │   │   ├── addressRoutes.js       # /api/addresses/*
│   │   │   ├── paymentRoutes.js       # /api/payments/*
│   │   │   ├── notificationRoutes.js  # /api/notifications/*
│   │   │   ├── analyticsRoutes.js     # /api/analytics/*
│   │   │   ├── adminRoutes.js         # /api/admin/*
│   │   │   └── ivrRoutes.js           # /api/ivr/*
│   │   │
│   │   ├── middleware/
│   │   │   ├── auth.js                # JWT verification
│   │   │   ├── roleCheck.js           # Role-based access (customer, driver, admin)
│   │   │   ├── errorHandler.js
│   │   │   ├── requestValidator.js
│   │   │   ├── rateLimiter.js
│   │   │   └── cors.js
│   │   │
│   │   ├── services/
│   │   │   ├── authService.js
│   │   │   ├── bookingService.js      # Core booking logic (sync, allocation)
│   │   │   ├── driverAllocationService.js  # Nearest-driver logic
│   │   │   ├── notificationService.js      # SMS/WhatsApp/Voice via Twilio
│   │   │   ├── ivrService.js               # IVR flow logic
│   │   │   ├── callerRecognitionService.js # Phone → Customer lookup
│   │   │   ├── mapService.js               # Google Maps API wrapper
│   │   │   ├── paymentService.js           # Razorpay integration
│   │   │   ├── analyticsService.js         # Generate reports
│   │   │   └── emailService.js             # Nodemailer setup
│   │   │
│   │   ├── utils/
│   │   │   ├── logger.js              # Winston logging
│   │   │   ├── validators.js
│   │   │   ├── jwt.js                 # Token generation/verification
│   │   │   ├── crypto.js              # Phone encryption for privacy
│   │   │   └── helpers.js
│   │   │
│   │   ├── migrations/                # Sequelize database migrations
│   │   │   ├── 001_create_customers.js
│   │   │   ├── 002_create_drivers.js
│   │   │   ├── 003_create_bookings.js
│   │   │   ├── 004_create_addresses.js
│   │   │   └── ...more migrations
│   │   │
│   │   ├── seeders/                   # Seed initial data (test drivers, vehicles)
│   │   │   ├── 001_seed_drivers.js
│   │   │   └── 002_seed_vehicles.js
│   │   │
│   │   ├── app.js                     # Express app setup
│   │   └── server.js                  # Start server
│   │
│   ├── tests/
│   │   ├── unit/
│   │   │   ├── bookingService.test.js
│   │   │   ├── driverAllocation.test.js
│   │   │   └── authService.test.js
│   │   │
│   │   ├── integration/
│   │   │   ├── bookingFlow.test.js
│   │   │   ├── ivrFlow.test.js
│   │   │   └── paymentFlow.test.js
│   │   │
│   │   └── e2e/                       # End-to-end tests
│   │       └── fullBookingCycle.test.js
│   │
│   ├── logs/                          # Application logs
│   │   ├── app.log
│   │   └── error.log
│   │
│   ├── .env.example
│   ├── .env.local
│   ├── package.json
│   ├── docker-compose.yml             # Optional: for local PostgreSQL
│   ├── .gitignore
│   └── README.md
│
│
├── docs/
│   ├── API_DOCUMENTATION.md           # Full API spec
│   ├── DATABASE_SCHEMA.md
│   ├── DEPLOYMENT.md
│   ├── ARCHITECTURE.md
│   └── TESTING_GUIDE.md
│
├── .github/
│   └── workflows/
│       ├── ci.yml                     # GitHub Actions for tests
│       └── deploy.yml                 # Auto-deploy on push
│
├── README.md                          # Project overview
├── .gitignore
└── package.json                       # Root workspace config (optional)
```

---

## Backend Architecture

### **Core Modules**

#### **1. Authentication Service**
```
User Registration → OTP via SMS → Phone Verification → Login
   ↓
   JWT Token (stored in frontend localStorage)
   ↓
   All subsequent requests authenticated via middleware
```

#### **2. Caller Recognition Engine (IVR)**
```
Customer calls Twilio number
   ↓
Twilio extracts caller phone number (ANI)
   ↓
Backend looks up phone in database
   ↓
IF found → Auto-fetch Customer profile + addresses
IF not found → Welcome message, request details
```

#### **3. Booking Engine (Core)**
```
PARALLEL CHANNELS:
   ├─ Website: Customer fills form → Submit
   └─ IVR: Customer says pickup address (speech-to-text via Twilio)
        ↓
   Both channels → Same booking creation endpoint
        ↓
   Booking record created in NeonDB (ACID transaction)
        ↓
   Driver Allocation Service triggered
```

#### **4. Driver Allocation Service**
```
Booking created
   ↓
Find all AVAILABLE drivers within 5km (using lat/long)
   ↓
Google Maps Distance Matrix API → actual route distance/time
   ↓
Pick nearest driver by ETA
   ↓
Assign driver → Update booking status to "ASSIGNED"
   ↓
Trigger notification pipeline
```

#### **5. Notification Pipeline**
```
Booking confirmed
   ├─ SMS via Twilio SMS API
   ├─ WhatsApp via WhatsApp Business API
   └─ Voice Call via Twilio Voice API
        ↓
   Each notification logged in DB
   ↓
   Real-time UI update via Socket.io (for GPS tracking in Phase 2)
```

---

## Frontend Architecture

### **State Management (Redux)**
```
Redux Store
├── auth slice
│   ├── user { id, phone, email, role, token }
│   ├── isAuthenticated
│   └── loading
│
├── booking slice
│   ├── currentBooking { id, pickupAddress, destination, status, fare }
│   ├── bookingHistory []
│   └── selectedAddresses [] (for repeat customers)
│
├── user slice
│   ├── profile { name, phone, savedAddresses[] }
│   └── preferences
│
└── map slice
    ├── driverLocation { lat, lng }
    └── estimatedArrival
```

### **Component Hierarchy**
```
App
├── Layout (Navbar + Footer)
├── Routes
│   ├── Public Routes
│   │   ├── Home
│   │   ├── Login / Register
│   │   └── OTPVerification
│   │
│   ├── Protected Routes (requires auth)
│   │   ├── /customer
│   │   │   ├── Dashboard
│   │   │   ├── Booking
│   │   │   ├── BookingHistory
│   │   │   └── Profile
│   │   │
│   │   ├── /driver
│   │   │   ├── Dashboard
│   │   │   ├── ActiveBookings
│   │   │   └── Earnings
│   │   │
│   │   └── /admin
│   │       ├── Dashboard
│   │       ├── AllBookings
│   │       └── Analytics
```

---

## API Endpoints

### **Authentication**
```
POST   /api/auth/register          → Register customer
POST   /api/auth/login              → Login (send OTP)
POST   /api/auth/verify-otp         → Verify OTP, return JWT
POST   /api/auth/resend-otp         → Resend OTP
POST   /api/auth/logout             → Invalidate token
GET    /api/auth/me                 → Get current user profile
```

### **Bookings**
```
POST   /api/bookings                → Create new booking (web or IVR)
GET    /api/bookings/:id            → Get booking details
GET    /api/bookings                → Get user's booking history
PUT    /api/bookings/:id            → Update booking (cancel, reschedule)
POST   /api/bookings/:id/rate       → Rate/review booking
```

### **Addresses**
```
GET    /api/addresses               → Get saved addresses for logged-in customer
POST   /api/addresses               → Save new address
PUT    /api/addresses/:id           → Update saved address
DELETE /api/addresses/:id           → Delete saved address
```

### **Driver (Internal)**
```
POST   /api/drivers/register        → Driver registration
PUT    /api/drivers/:id/availability → Set online/offline
PUT    /api/drivers/:id/location    → Update location (lat/lng every 10s)
GET    /api/drivers/:id/earnings    → Get earnings for driver
GET    /api/drivers/:id/history     → Get ride history
```

### **Payments**
```
POST   /api/payments/order          → Create Razorpay order
POST   /api/payments/verify         → Verify payment
GET    /api/payments/history        → Get payment history
```

### **Notifications**
```
POST   /api/notifications/sms       → Send SMS (internal use)
POST   /api/notifications/whatsapp  → Send WhatsApp (internal use)
POST   /api/notifications/voice     → Send voice call (internal use)
GET    /api/notifications/status    → Check notification delivery status
```

### **IVR**
```
POST   /api/ivr/webhook             → Twilio webhook (incoming call)
POST   /api/ivr/gather-speech       → Process speech input from caller
POST   /api/ivr/create-booking-ivr  → Create booking via IVR
```

### **Analytics (Admin)**
```
GET    /api/analytics/bookings      → Total bookings, revenue by date
GET    /api/analytics/drivers       → Driver performance metrics
GET    /api/analytics/peak-hours    → Peak booking times
GET    /api/analytics/reports       → Generate PDF reports
```

### **Admin Management**
```
GET    /api/admin/all-bookings      → View all bookings
GET    /api/admin/all-drivers       → Manage drivers
PUT    /api/admin/drivers/:id/approve → Approve/reject driver
DELETE /api/admin/drivers/:id       → Remove driver
POST   /api/admin/vehicles          → Add vehicle
```

---

## Database Schema (NeonDB / PostgreSQL)

### **Core Tables**

#### **customers** table
```sql
id (PK)           | UUID
phone             | VARCHAR(15) UNIQUE INDEX  -- Primary identifier
email             | VARCHAR(100) UNIQUE
name              | VARCHAR(100)
password_hash     | VARCHAR(255)
is_verified       | BOOLEAN DEFAULT false
role              | ENUM('customer', 'driver', 'admin')
created_at        | TIMESTAMP
updated_at        | TIMESTAMP
phone_encrypted   | VARCHAR(255)  -- Encrypted for privacy
booking_count     | INT DEFAULT 0 -- Denormalized for quick stats
```

#### **addresses** table
```sql
id (PK)           | UUID
customer_id (FK)  | UUID → customers.id
label             | VARCHAR(50)  -- 'Home', 'Work', 'Other'
street            | VARCHAR(255)
city              | VARCHAR(100)
postal_code       | VARCHAR(10)
latitude          | DECIMAL(10, 8)
longitude         | DECIMAL(11, 8)
is_favorite       | BOOLEAN DEFAULT false
created_at        | TIMESTAMP
updated_at        | TIMESTAMP

INDEX: (customer_id, is_favorite)
```

#### **drivers** table
```sql
id (PK)           | UUID
phone             | VARCHAR(15) UNIQUE
name              | VARCHAR(100)
email             | VARCHAR(100)
license_number    | VARCHAR(50) UNIQUE
vehicle_id (FK)   | UUID → vehicles.id
current_latitude  | DECIMAL(10, 8)
current_longitude | DECIMAL(11, 8)
is_available      | BOOLEAN DEFAULT true
last_location_update | TIMESTAMP
rating            | DECIMAL(3, 2) DEFAULT 5.0
total_rides       | INT DEFAULT 0
is_approved       | BOOLEAN DEFAULT false
joined_at         | TIMESTAMP
```

#### **vehicles** table
```sql
id (PK)           | UUID
registration_no   | VARCHAR(50) UNIQUE
vehicle_type      | ENUM('auto', 'mini_truck', 'truck')
make_model        | VARCHAR(100)
capacity_persons  | INT
capacity_weight   | INT  -- kg
is_active         | BOOLEAN DEFAULT true
```

#### **bookings** table
```sql
id (PK)           | UUID
customer_id (FK)  | UUID → customers.id
driver_id (FK)    | UUID → drivers.id (nullable until assigned)
pickup_address_id (FK) | UUID → addresses.id (nullable)
pickup_latitude   | DECIMAL(10, 8)
pickup_longitude  | DECIMAL(11, 8)
destination_latitude | DECIMAL(10, 8)
destination_longitude | DECIMAL(11, 8)
pickup_address_text | VARCHAR(500)  -- If manual entry
destination_text   | VARCHAR(500)
status            | ENUM('pending', 'assigned', 'started', 'completed', 'cancelled')
booking_type      | ENUM('web', 'ivr')  -- Track channel
fare_estimated    | DECIMAL(10, 2)
fare_actual       | DECIMAL(10, 2)
is_paid           | BOOLEAN DEFAULT false
scheduled_time    | TIMESTAMP NULLABLE  -- For future bookings
created_at        | TIMESTAMP
started_at        | TIMESTAMP NULLABLE
completed_at      | TIMESTAMP NULLABLE
cancelled_at      | TIMESTAMP NULLABLE

INDEX: (customer_id, created_at DESC)
INDEX: (driver_id, status)
INDEX: (status)
```

#### **payments** table
```sql
id (PK)           | UUID
booking_id (FK)   | UUID → bookings.id
amount            | DECIMAL(10, 2)
payment_method    | ENUM('online', 'cash')
razorpay_order_id | VARCHAR(100) NULLABLE
razorpay_payment_id | VARCHAR(100) NULLABLE
status            | ENUM('pending', 'success', 'failed')
created_at        | TIMESTAMP
```

#### **notifications** table (Phase 2)
```sql
id (PK)           | UUID
booking_id (FK)   | UUID → bookings.id
customer_id (FK)  | UUID → customers.id
notification_type | ENUM('sms', 'whatsapp', 'voice')
message           | TEXT
status            | ENUM('sent', 'delivered', 'failed')
delivery_time     | TIMESTAMP NULLABLE
created_at        | TIMESTAMP
```

#### **operator_logs** table (Helpline operators — optional)
```sql
id (PK)           | UUID
operator_id (FK)  | UUID → customers.id (operator role)
call_duration     | INT  -- seconds
customer_phone    | VARCHAR(15)
booking_created   | BOOLEAN
status            | ENUM('completed', 'dropped', 'customer_unreachable')
created_at        | TIMESTAMP
```

---

## Integration Flow

### **Web Booking Flow**
```
1. Customer opens website → Login / Register
2. Enters pickup address (saved or manual) + destination
3. System shows fare estimate (Google Maps + pricing logic)
4. Customer confirms → Booking created in DB
5. Driver allocation triggered (within 500ms)
6. Driver assigned → SMS/WhatsApp notification sent to customer
7. Customer sees driver details + real-time location (Phase 2)
8. Driver completes journey → Payment (if online) + Rating
```

### **IVR Booking Flow**
```
1. Repeat customer calls Twilio number
2. Twilio extracts caller phone number
3. Backend recognizes customer → fetches profile + saved addresses
4. IVR prompts: "Welcome back! Which address?"
5. Customer selects from saved addresses (or says new one)
6. IVR confirms pickup and asks destination
7. System calculates fare and confirms
8. Booking created with booking_type='ivr'
9. Driver allocation triggers
10. Customer receives SMS + WhatsApp confirmation (voice pending customer confirmation)
```

### **Real-time Sync (Concurrent Bookings)**
```
Request 1 (Web): Create booking for customer A
Request 2 (IVR): Create booking for customer B
    ↓
Both hit booking creation endpoint simultaneously
    ↓
PostgreSQL ACID transaction ensures:
  - No overbooking (locks prevent duplicate assignment)
  - Both bookings recorded atomically
  - Driver allocation happens independently
```

---

## Deployment Plan

### **Phase 1: MVP Deployment (Week 6)**

**Frontend (Vercel)**
```bash
$ vercel link
$ vercel deploy
# Auto-deploy on every git push to main
```
- Environment: `.env.production`
- Features: Login, Register, Booking form, Booking history
- No GPS/Payments yet

**Backend (Render.com or Railway)**
```bash
$ git push heroku main  # or Railway/Render equivalent
```
- Environment: `.env.production` with NeonDB connection string
- Database: NeonDB (serverless PostgreSQL)
- Features: Auth, Booking, Driver allocation, SMS confirmations

**Database (NeonDB)**
```bash
$ npx sequelize-cli db:migrate --env production
$ npx sequelize-cli db:seed:all --env production
```
- Hosted on NeonDB
- Auto-backups enabled
- Connection pooling via pgbouncer

**Testing Checklist**
- [ ] Web booking works end-to-end
- [ ] IVR booking works (test with real Twilio number)
- [ ] Concurrent bookings don't conflict
- [ ] SMS notifications deliver
- [ ] Driver allocation logic correct

### **Phase 2: Enhancement Deployment (Week 10)**

Add:
- GPS tracking + Socket.io real-time updates
- Razorpay payment integration
- Admin dashboard
- WhatsApp API integration

### **Phase 3: Final Deployment (Week 12)**

- Performance optimization (query indexing, caching)
- Load testing (simulate 100 concurrent bookings)
- Security audit (SQL injection, CSRF, rate limiting)
- Documentation + demo

---

## Environment Variables

### **Backend (.env.production)**
```
NODE_ENV=production
PORT=3000

# Database (NeonDB)
DATABASE_URL=postgresql://user:password@ep-xyz.neon.tech/eminence_db

# JWT
JWT_SECRET=your_super_secret_jwt_key_here
JWT_EXPIRE=7d

# Twilio
TWILIO_ACCOUNT_SID=your_sid_here
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_PHONE_NUMBER=+1234567890
TWILIO_IVR_NUMBER=+1234567890

# Google Maps
GOOGLE_MAPS_API_KEY=your_key_here

# Razorpay (Phase 2)
RAZORPAY_KEY_ID=your_key_id
RAZORPAY_KEY_SECRET=your_key_secret

# WhatsApp (Phase 2)
WHATSAPP_BUSINESS_PHONE_ID=your_phone_id
WHATSAPP_ACCESS_TOKEN=your_token

# Email
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=noreply@eminence.com
SMTP_PASS=app_password_here

# Frontend
REACT_APP_API_URL=https://eminence-api.render.com
REACT_APP_GOOGLE_MAPS_KEY=same_as_backend
```

### **Frontend (.env.production)**
```
REACT_APP_API_URL=https://eminence-api.render.com
REACT_APP_GOOGLE_MAPS_API_KEY=your_key_here
REACT_APP_RAZORPAY_KEY_ID=your_key_id
```

---

## Testing Strategy

### **Unit Tests**
- Driver allocation logic (nearest driver selection)
- Booking creation (concurrent requests)
- OTP generation and verification
- Fare calculation

### **Integration Tests**
- End-to-end booking flow (web + IVR)
- Notification delivery
- Payment gateway (sandbox mode)
- Database transactions

### **E2E Tests (Selenium / Playwright)**
- Full user journey: Register → Book → Track → Rate
- IVR call flow
- Admin dashboard

### **Load Testing**
```bash
$ npm install -g Artillery

# Simulate 100 concurrent bookings
$ artillery run load-test.yml
```

---

## Security Checklist

- [ ] Passwords hashed with bcrypt (min cost 10)
- [ ] All API endpoints require JWT
- [ ] Rate limiting on login attempts (max 5/minute)
- [ ] SQL injection prevention (Sequelize parameterized queries)
- [ ] CSRF tokens on state-changing endpoints
- [ ] HTTPS enforced (Vercel + Render handle this)
- [ ] Sensitive data (phone, passwords) not logged
- [ ] Phone number encrypted in DB (for privacy)
- [ ] API keys rotated monthly
- [ ] Input validation on all endpoints

---

## Monitoring & Logging

### **Backend Logging (Winston)**
```javascript
logger.info(`Booking created: ${bookingId}`);
logger.error(`Driver allocation failed for booking ${bookingId}`);
```

### **Error Tracking (Optional: Sentry)**
```javascript
Sentry.captureException(error);
```

### **Performance Monitoring**
- DB query times (track slow queries)
- API response times (target <200ms)
- Deployment health checks

---

## FAQ: MongoDB → PostgreSQL

**Q: Will switching to PostgreSQL slow down our booking queries?**  
A: No. In fact, PostgreSQL's ACID guarantees and native joins make concurrent booking handling *faster* and more reliable.

**Q: Can we easily switch back to MongoDB?**  
A: Yes. Since we're using Sequelize, switching the dialect is straightforward. But you won't want to — PostgreSQL is objectively better for this use case.

**Q: Is NeonDB reliable for production?**  
A: Absolutely. It's backed by Amazon and used by companies like Vercel, Supabase's clients, etc.

**Q: How much will NeonDB cost?**  
A: Free tier covers 1GB + 100k queries/month. Perfect for MVP. Scale to paid ($9-15/month) once you hit limits.

**Q: Do we need to rewrite all our code?**  
A: No. Sequelize handles both MongoDB and PostgreSQL. Switch the dialect, run migrations, done.

---

## Final Notes

1. **Start with MVP (core features only)** — don't build GPS/Analytics yet
2. **Use NeonDB for reliability and cost** — no regrets
3. **Test concurrent bookings thoroughly** — this is where most issues arise
4. **Deploy early and often** — get real user feedback
5. **Document everything** — your final presentation should reference this file

**Good luck, team! 🚀**


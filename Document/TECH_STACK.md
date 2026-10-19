# 🛠️ Eminence — Technology Stack & Engineering Architecture

> **A comprehensive reference covering the technical stack, architectural patterns, real-time pipelines, AI engines, third-party integrations, testing suites, and development workflows for the Eminence Logistics Platform.**

---

## 📑 Table of Contents

1. [Architectural Overview](#1-architectural-overview)
2. [Backend Engine & Runtime Stack](#2-backend-engine--runtime-stack)
3. [Frontend Web Stack](#3-frontend-web-stack)
4. [Mobile Application Stack](#4-mobile-application-stack)
5. [Database, Caching & State Persistence](#5-database-caching--state-persistence)
6. [Real-Time, Telemetry & Media Communication](#6-real-time-telemetry--media-communication)
7. [Artificial Intelligence, NLP & Forecasting](#7-artificial-intelligence-nlp--forecasting)
8. [Third-Party Integrations & APIs](#8-third-party-integrations--apis)
9. [Security, Privacy & DPDP Compliance](#9-security-privacy--dpdp-compliance)
10. [Testing, QA & Static Analysis Stack](#10-testing-qa--static-analysis-stack)
11. [Development, Workflow & CI/CD Pipelines](#11-development-workflow--cicd-pipelines)

---

## 1. Architectural Overview

Eminence is engineered as a unified monorepo delivering three dedicated operational surfaces:

```
┌────────────────────────────────────────────────────────────────────────┐
│                           EMINENCE PLATFORM                            │
│                                                                        │
│  ┌──────────────────────┐  ┌────────────────────┐  ┌────────────────┐  │
│  │   React 19 Web App   │  │ React Native /     │  │ Admin Dispatch │  │
│  │  (Customer Portal)   │  │ Expo 57 Mobile App │  │ Command Center │  │
│  │   localhost:5173     │  │  (Driver / Ops)    │  │ (Fleet / IoT)  │  │
│  └──────────┬───────────┘  └─────────┬──────────┘  └───────┬────────┘  │
│             │                        │                     │           │
│             └────────────────────────┼─────────────────────┘           │
│                                      │                                 │
│                           ┌──────────▼──────────┐                      │
│                           │   Express 5 API     │                      │
│                           │  (localhost:3000)   │                      │
│                           │                     │                      │
│                           │ REST + Socket.io    │                      │
│                           └──────────┬──────────┘                      │
│                                      │                                 │
│                     ┌────────────────┴────────────────┐                │
│                     │                                 │                │
│           ┌─────────▼──────────┐            ┌─────────▼────────┐       │
│           │ PostgreSQL (Neon)  │            │ Redis Distributed│       │
│           │ / SQLite (Local)   │            │ Cache / Fallback │       │
│           └────────────────────┘            └──────────────────┘       │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Backend Engine & Runtime Stack

The backend API handles trip dispatching, dynamic pricing, real-time vehicle telematics, and asynchronous background queues.

| Technology | Package Version | Category | Purpose & Implementation |
|---|---|---|---|
| **Node.js** | `>=20.0.0` (LTS) | Runtime | Core asynchronous JavaScript runtime powering the server and micro-services. |
| **Express.js** | `^5.2.1` | Web Framework | Routing engine, HTTP request/response pipeline, and controller dispatch layer. |
| **Sequelize ORM** | `^6.37.8` | Data Modeling | Schema definitions, automated migrations, validation hooks, and relational associations. |
| **PostgreSQL (`pg`)** | `^8.23.0` | Database Driver | Production database connection driver supporting connection pooling and SSL modes. |
| **Neon Serverless** | `^1.2.0` | Cloud Database | Edge-compatible serverless PostgreSQL with connection pooling. |
| **SQLite3** | `^6.0.1` | Embedded DB | Zero-config database for instant offline/local development and isolated integration tests. |
| **Redis (`ioredis`)** | `^6.0.0` | In-Memory Cache | Distributed cache for surge multipliers and IP rate-limiting with seamless in-memory fallback. |
| **Socket.io** | `^4.8.3` | Real-Time Engine | Event-driven WebSocket server for GPS streaming, driver SOS, and live chat. |
| **Postgres Adapter** | `^0.5.0` (`@socket.io/postgres-adapter`) | Multi-Node Sockets | Synchronizes WebSocket events across clustered instances via Postgres payload tables. |
| **Node-Cron** | `^4.6.0` | Job Scheduler | Automated cron workers for booking expiry, driver dispatch matching, and ledger reconciliation. |
| **PDFKit** | `^0.19.1` | Document Engine | Generates dynamic, cryptographically hashed PDF invoices, manifests, and driver payslips. |
| **Nodemailer** | `^10.0.16` | Mail Delivery | Transactional email delivery for account verifications, receipts, and system alerts. |
| **Multer** | `^2.4.0` | File Uploads | Multipart form-data processing for Proof of Delivery (PoD) images and documents. |

---

## 3. Frontend Web Stack

The web portal delivers responsive interfaces for customer bookings, B2B enterprise contracts, and the real-time Admin Operations Hub.

| Technology | Package Version | Category | Purpose & Implementation |
|---|---|---|---|
| **React** | `^19.2.7` | UI Framework | Component architecture utilizing modern hooks, Suspense, and state transitions. |
| **Vite** | `^8.1.1` | Build Tool & Bundler | Sub-second Hot Module Replacement (HMR) and optimized tree-shaken production bundles. |
| **React Router** | `^7.18.2` | Client Routing | Declarative nested routing, path param extraction, and role-gated Route guards. |
| **Redux Toolkit** | `^2.12.0` | State Management | Normalized global slices (`auth`, `booking`, `notifications`, `telematics`). |
| **Tailwind CSS v4** | `^4.3.3` | Styling Engine | Modern CSS-in-JS utility framework with custom Dark Loft / Copper design system tokens. |
| **Framer Motion** | `^12.43.0` | UI Motion | Fluid hardware-accelerated animations, layout transitions, and micro-interactions. |
| **React-Leaflet** | `^5.0.0` | Interactive Maps | Vector map rendering, waypoint pins, live driver telemetry icons, and route polylines. |
| **Leaflet** | `^1.9.4` | Mapping Library | OpenStreetMap tile layers, marker animations, and geospatial viewport bounds. |
| **Recharts** | `^3.10.1` | Data Visualization | Admin operational analytics, vehicle telemetry dials, and ESG carbon emissions charts. |
| **Lucide React** | `^1.27.0` | Iconography | High-resolution SVG icon library with clean modern vector paths. |
| **React Hook Form** | `^7.83.0` | Form Management | High-performance uncontrolled form state management with minimal re-renders. |
| **Zod** | `^4.4.3` | Schema Validation | Strict schema validation for booking builders, authentication, and driver registration. |
| **i18next** | `^26.4.2` | Localization | Multi-language internationalization (English, Hindi, Marathi) with auto-detection. |
| **PeerJS** | `^1.5.5` | WebRTC Wrapper | Browser-to-browser peer audio calling for customer support and driver helpline. |

---

## 4. Mobile Application Stack

A production-grade mobile app built for Android and iOS using the Expo ecosystem, acting as the driver companion and field operations tool.

| Technology | Package Version | Category | Purpose & Implementation |
|---|---|---|---|
| **React Native** | `0.86.3` | Native Framework | Cross-platform mobile runtime rendering native Android & iOS UI components. |
| **Expo SDK** | `~57.0.22` | Development Toolchain | Managed mobile environment with uniform access to device hardware APIs. |
| **Expo Router** | `~57.0.21` | Navigation Engine | File-based, typed routing with role-specific tab groups `(customer)`, `(driver)`, `(admin)`, `(auth)`. |
| **Expo Location** | `^57.0.20` | GPS Services | High-precision foreground & background GPS tracking for active driver shifts. |
| **Expo Task Manager** | `~57.0.21` | Background Engine | OS background tasks for continuous driver telemetry streaming while the screen is locked. |
| **Expo Camera** | `~57.0.6` | Imaging & Scanner | Photo capture for Proof of Delivery (PoD) and WMS warehouse QR/barcode scanning. |
| **Expo SQLite** | `~57.0.4` | Offline Database | On-device SQLite database storing queued offline actions and syncing on reconnection. |
| **Expo Secure Store** | `^57.0.4` | Hardware Keychain | AES-encrypted device storage for sensitive auth tokens, JWTs, and biometric credentials. |
| **Expo Notifications** | `~57.0.22` | Push Engine | Native OS push notifications for new trip requests, status alerts, and SOS events. |
| **Reanimated** | `4.5.1` | Native Animations | Smooth 60+ FPS gestures and native driver bottom-sheet modals. |
| **NetInfo** | `^12.0.1` | Network Listener | Detects connectivity loss and orchestrates automated offline synchronization queues. |

---

## 5. Database, Caching & State Persistence

| Layer | Technology | Configuration & Details |
|---|---|---|
| **Primary Relational DB** | PostgreSQL via NeonDB | Cloud serverless database with automated branch scaling and SSL `verify-full`. |
| **Local Development DB** | SQLite3 (`database.sqlite`) | Zero-setup local database configured via `USE_SQLITE=true`. |
| **Distributed Cache** | Redis (`ioredis`) | Surge pricing cache (15s TTL), rate limiting tokens, and distributed pub/sub. |
| **In-Memory Fallback** | Node.js Process Memory | Safe automatic fallback if Redis connection is absent in test/development environments. |
| **Mobile Offline Storage** | SQLite (`expo-sqlite`) | Offline transaction queue for PoD scans and booking completions. |
| **Mobile Secure Storage** | Keychain / Keystore (`expo-secure-store`) | Encrypted client-side storage for JWT access and refresh tokens. |

---

## 6. Real-Time, Telemetry & Media Communication

* **WebSocket Architecture (`Socket.io`)**:
  * **Admin Command Center (`admin_inbox`, `admin_notifications`)**: Real-time aggregated ticket streams, new ride notices, and high-priority driver SOS events.
  * **Driver Telematics (`admin_telemetry`, `vehicle_{id}`)**: Real-time streaming of speed, RPM, engine coolant temperatures, and fuel levels.
  * **Live Trip Tracking (`trip_{bookingId}`)**: Low-latency coordinate streaming between driver GPS and customer map viewports.
  * **Support & Dispatch Chat (`chat_{customerId}`, `ticket_{id}`)**: Full duplex bi-directional communication between customers, drivers, and admin agents.
* **WebRTC Voice Helpline (`PeerJS` + `peer`)**:
  * Peer-to-peer browser voice calling connecting customers directly to helpline dispatchers without media relay lag.
* **Telephony & Automated IVR (`ivrVoiceService.js`)**:
  * Twilio and Fast2SMS integrations supporting automated voice trip confirmations and telephone bookings.

---

## 7. Artificial Intelligence, NLP & Forecasting

Eminence integrates dual-tier AI pipelines optimized for zero downtime and low operational cost:

```
                  ┌───────────────────────────────┐
                  │       Incoming Prompt /       │
                  │       Voice Transcript        │
                  └───────────────┬───────────────┘
                                  │
                 ┌────────────────▼────────────────┐
                 │    Token Budget Check Passed?   │
                 └────────┬───────────────┬────────┘
                    YES   │               │   NO (Quota Exceeded)
                          │               │
        ┌─────────────────▼────────┐      └─────────┐
        │   Primary LLM Engine:    │                │
        │ Google Gemini 2.0 Flash  │                │
        │   / Groq Llama 3.3 70B   │                │
        └─────────────────┬────────┘                │
                          │                         │
               API Error? │ (Fallback)              │
                          ▼                         ▼
        ┌──────────────────────────────────────────────────┐
        │  Deterministic Local Regex / NLP Fallback Engine │
        │        (Zero Latency & 100% Availability)        │
        └──────────────────────────────────────────────────┘
```

1. **Google Gemini AI (`@google/genai` v2.21.0)**:
   * Drives customer support ticket analysis, sentiment classification, and intelligent dispatch bot responses.
2. **Groq Cloud SDK (`groq-sdk` v1.6.0)**:
   * Ultra-fast sub-second LLM inference for voice transcript parsing and localized freight demand forecasting.
3. **AI Usage & Budget Manager (`aiUsageManager.js`)**:
   * Tracks token usage per tenant/role, enforcing hourly rate caps to protect against cost spikes.
4. **Deterministic NLP Fallback Engine**:
   * Rule-based entity extraction guaranteeing that bookings and support interactions succeed even when offline or during API provider outages.

---

## 8. Third-Party Integrations & APIs

| Service | Protocol / SDK | Purpose |
|---|---|---|
| **Razorpay** | REST API + Webhooks (`razorpay` v2.9.8) | Digital payments, UPI, debit/credit cards, and automated refund processing. |
| **Fast2SMS** | HTTPS REST API | High-priority transactional SMS delivery for 6-digit phone verification OTPs. |
| **Firebase Cloud Messaging** | Firebase Admin SDK (`firebase-admin` v14.2.0) | Cross-platform push notification delivery to mobile driver devices. |
| **OpenStreetMap & OSRM** | Geospatial HTTP API | Geocoding, reverse geocoding, distance calculations, and turn-by-turn routing paths. |

---

## 9. Security, Privacy & DPDP Compliance

* **Stateless Authentication**: Signed JWT tokens stored in `HttpOnly`, `SameSite=Lax`, `Secure` cookies with automatic refresh token rotation.
* **Role-Based Access Control (RBAC)**: Strict role middleware enforcing access boundaries across `customer`, `driver`, `admin`, and `superadmin`.
* **Cryptographic Proof of Delivery (PoD)**:
  * Each completed freight drop-off computes a tamper-evident **SHA-256 hash**:
    $$\text{PoD Hash} = \text{SHA-256}(\text{BookingId} + \text{Timestamp} + \text{DriverId} + \text{RecipientSignature})$$
* **HTTP Hardening (`Helmet` v8.3.0)**: Content Security Policy (CSP), Strict-Transport-Security (HSTS), and XSS prevention headers.
* **Strict Rate Limiting (`express-rate-limit` v8.7.0)**: Tiered limiting preventing brute force across `/api/auth/` (10 req/min) and AI endpoints.
* **DPDP Act (Data Protection) Compliance**: PII scrubbers sanitize sensitive attributes (`passwordHash`, `governmentId`, `bankAccountNumber`) from client-facing responses.

---

## 10. Testing, QA & Static Analysis Stack

A multi-tiered testing strategy guarantees platform stability from unit modules to full end-to-end user journeys:

```
┌────────────────────────────────────────────────────────────────────────┐
│                   5-STAGE MONOREPO VALIDATION PIPELINE                 │
│                                                                        │
│  [Stage 1: Backend Jest] ──> Tests controllers, models & socket events │
│  [Stage 2: Frontend Oxlint] ──> Rust-powered ultra-fast static analysis│
│  [Stage 3: Frontend Build] ──> Vite bundle verification & tree-shaking │
│  [Stage 4: Mobile Typecheck] ──> TypeScript compiler (tsc --noEmit)    │
│  [Stage 5: Mobile Integration] ──> 31-case mobile hardware & API suite │
└────────────────────────────────────────────────────────────────────────┘
```

| Tool | Version | Target Area | Description |
|---|---|---|---|
| **Jest** | `^30.4.2` | Backend API | Unit tests for auth, bookings, pricing engines, and database models. |
| **Supertest** | `^7.2.2` | REST Endpoints | Simulates HTTP requests, headers, and cookies against Express routes. |
| **Vitest** | `^5.0.3` | Frontend Web | Vite-native unit test runner for React hooks, reducers, and utilities. |
| **React Testing Library** | `^16.3.3` | Frontend UI | Component behavior, accessibility, and DOM rendering assertions. |
| **Playwright** | `^1.64.0` | End-to-End (E2E) | Automated cross-browser testing for the entire booking and payment journey. |
| **Mobile QA Runner** | Custom | Mobile Companion | 31-case end-to-end suite verifying GPS, offline sync, and biometric bypass. |
| **Oxlint** | `^1.71.0` | Code Quality | Rust-based linter enforcing clean code, React best practices, and zero unused code. |
| **TypeScript Compiler (`tsc`)** | `~6.0.3` | Type Correctness | Static type checking verifying props, navigation routes, and API responses. |

---

## 11. Development, Workflow & CI/CD Pipelines

### Monorepo Scripts Reference

```bash
# === Backend Commands ===
cd backend
npm run dev               # Start Express + Socket.io with nodemon auto-restart
npm test                  # Run full backend Jest test suite
npm run test:unit         # Run isolated unit tests
npm run db:init           # Initialize and seed database models

# === Frontend Commands ===
cd frontend
npm run dev               # Start Vite local development server (port 5173)
npm run build             # Build optimized production bundle
npm run lint              # Run Oxlint static analysis
npm run test              # Run Vitest component unit tests
npm run test:e2e          # Run Playwright end-to-end browser tests

# === Mobile Commands ===
cd mobile
npm start                 # Start Expo Metro bundler
npm run android           # Launch in Android simulator
npm run ios               # Launch in iOS simulator
npm run typecheck         # Run TypeScript static type check
npm test                  # Run 31-case integration suite

# === Full Monorepo Validation ===
node run_all_tests.js     # Executes all 5 testing stages across the entire repo
```

### Git & Branching Strategy
* **Strict Commit Boundaries**: Independent feature branches with descriptive commit scopes (`feat(auth):`, `fix(dispatch):`, `refactor(telematics):`).
* **Pre-Deployment Staging**: Features merge into `pre-deployment` staging branches for integrated testing before release tags.
* **Environment Integrity**: Strict separation between local environment `.env.local` files and production secrets.

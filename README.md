# Eminence 🚚

> **Next-Generation Commercial Freight Logistics, Real-Time Fleet Telematics & B2B Transport Platform**

[![Node.js](https://img.shields.io/badge/Node.js-20%2B-339933?logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![React Native](https://img.shields.io/badge/React_Native-Expo_57-000020?logo=expo&logoColor=white)](https://expo.dev/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-NeonDB-4169E1?logo=postgresql&logoColor=white)](https://neon.tech/)
[![Socket.io](https://img.shields.io/badge/Socket.io-v4-010101?logo=socketdotio&logoColor=white)](https://socket.io/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-v4-38B2AC?logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)

[![Setup Guide](https://img.shields.io/badge/Setup-Guide-green.svg)](CONTRIBUTING.md)
[![Documentation](https://img.shields.io/badge/Docs-Full%20Reference-blue.svg)](DOCUMENTATION.md)
[![Tech Stack](https://img.shields.io/badge/Tech%20Stack-Architecture%20Guide-orange.svg)](TECH_STACK.md)

---

## 📑 Table of Contents

- [Overview](#overview)
- [Key Features & Capabilities](#key-features--capabilities)
  - [1. Customer Booking & Dispatch Experience](#1-customer-booking--dispatch-experience)
  - [2. Driver Companion & Smart Operations](#2-driver-companion--smart-operations)
  - [3. Real-Time Telematics & Predictive Maintenance](#3-real-time-telematics--predictive-maintenance)
  - [4. B2B Enterprise Logistics & Invoicing](#4-b2b-enterprise-logistics--invoicing)
  - [5. Admin Fleet Management & Operations Intelligence](#5-admin-fleet-management--operations-intelligence)
  - [6. Security & Data Protection](#6-security--data-protection)
- [Tech Stack](#tech-stack)
- [Architecture & Monorepo Layout](#architecture--monorepo-layout)
- [Setup & Quick Start](#setup--quick-start)
- [Running Automated Tests](#running-automated-tests)
- [Security & Responsible Disclosure](#security--responsible-disclosure)
- [Detailed Setup Guide](#detailed-setup-guide)

---

## 🎯 Overview

**Eminence** is an end-to-end commercial freight dispatch, real-time vehicle telematics, and B2B enterprise logistics platform. Built to modernize intra-city freight, tempo transport, and commercial carrier fleets, Eminence bridges customers, drivers, and enterprise fleet dispatchers across web and mobile surfaces.

### Core Value Proposition
- **Dual-Surface Accessibility**: High-performance React web portal for dispatchers and enterprise customers, paired with a feature-complete React Native (Expo) mobile companion for drivers and field operations.
- **Dynamic Demand & Surge Engine**: Real-time localized pricing multipliers based on vehicle supply-to-demand density ratios.
- **IoT Telematics Dials**: Continuous low-latency streaming of vehicle speed, RPM, engine temperature, and fuel levels over authenticated WebSocket channels.
- **Proof-of-Delivery (PoD) Cryptographic Chain**: Tamper-evident SHA-256 cryptographic hashes generated at cargo drop-off with simulation-ready WMS barcode scanning.

---

## 🌟 Key Features & Capabilities

### 1. Customer Booking & Dispatch Experience
- **Multi-Stop Trip Builder**: Book pickups with arbitrary intermediate drop destinations, automatic route optimization, and vehicle payload matching (Tata Ace, 2 Ton, 3 Ton Commercial Trucks).
- **Live Driver GPS Tracking**: Real-time geospatial tracking powered by Socket.io and OpenStreetMap/Leaflet integration.
- **ESG Emissions Intelligence**: Dynamic carbon offset and emissions savings computations displayed on ride receipts.
- **Customer Address Book**: Instant auto-fill for frequent commercial drop locations.
- **Dual Payment Rails**: Seamless checkout supporting cash-on-delivery and Razorpay payment integration.

### 2. Driver Companion & Smart Operations
- **Duty State Toggle**: One-tap transition between active and inactive duty states broadcasting availability to dispatch engines.
- **AI Demand Surge Heatmaps**: Visual hotspot discovery highlighting zones with surge multipliers and peak booking velocity.
- **Trip Lifecycle Progression**: Deterministic stage workflow (`Accept` $\to$ `Arrive` $\to$ `In-Transit` $\to$ `Complete`).
- **Warehouse Barcode Scanner**: In-app camera and simulated WMS barcode verification for cargo verification at pickup and unloading.
- **Automated Digital Payslips**: Instant dynamic PDF payslip computation detailing base earnings, incentives, and net payouts.

### 3. Real-Time Telematics & Predictive Maintenance
- **Fleet Telemetry**: WebSocket streaming of vehicle telemetry (speed, RPM, coolant temperature, and fuel). Local development uses an explicitly labeled simulator; production waits for a configured real-device provider.
- **Anomaly Detection**: Anomaly heuristics monitoring asset health degradation, alerting operators to overheating risks and mechanical anomalies.
- **Role-Gated Background GPS**: Native background location tracking exclusively engaged when an authenticated user is on active driver duty, preventing unnecessary battery drain and protecting customer privacy.

### 4. B2B Enterprise Logistics & Invoicing
- **Corporate Account Onboarding**: Corporate registration pipeline with credit term verification and B2B contract lifecycle tracking.
- **Automated Invoicing & Tax Computation**: Dynamic PDF invoice generation with automated GST breakdown and corporate cost-center assignments.
- **Manager Expense Approvals**: Tiered approval flows for corporate ride requests exceeding departmental budget limits.

### 5. Admin Fleet Management & Operations Intelligence
- **Modular Command Dashboard**: Dedicated management tabs for Drivers, Commercial Assets, Users, Corporate Contracts, Real-Time Telematics, Support Inbox, and System Audit Logs.
- **Operational SLA & Health Dials**: Continuous infrastructure monitoring reporting system uptime, process memory footprints, and database connection pool health.
- **Live Support Chat Inbox**: Multi-channel WebSocket customer support inbox connecting operators directly to customer threads.

### 6. Security & Data Protection
- **Zero Insecure Fallbacks**: Strict startup validation preventing execution with default or missing secrets.
- **PostgreSQL TLS Verification**: NeonDB connections strictly enforce TLS certificate verification (`rejectUnauthorized: true`).
- **DPDP Act Compliance**: Government identification and credential hashes are scrubbed from user-facing API payloads.
- **Scoped Cache Invalidation**: Multi-tenant Redis caching prefixed with application namespaces, eliminating destructive global flushes.
- *(For in-depth security implementation details, review [SECURITY.md](SECURITY.md)).*

---

## 💻 Tech Stack Summary

> 📘 **For the deep-dive architectural documentation, package versions, AI models, and testing setup, see [TECH_STACK.md](TECH_STACK.md).**

| Domain | Technologies & Libraries |
|---|---|
| **Backend API** | Node.js (v20+), Express.js 5, Sequelize ORM, Node-Cron, PDFKit, Nodemailer |
| **Databases & Cache** | PostgreSQL (NeonDB Serverless), SQLite3 (Local/Test), Redis (`ioredis`) |
| **Real-Time & Telephony** | Socket.io v4 (`@socket.io/postgres-adapter`), PeerJS (WebRTC Voice Calls), Twilio / Fast2SMS IVR |
| **AI & NLP** | Google Gemini AI (`@google/genai`), Groq Cloud SDK (`groq-sdk`), Deterministic NLP Fallback |
| **Frontend Web** | React 19, Vite 8, Tailwind CSS v4, Redux Toolkit, Leaflet / React-Leaflet, Recharts, Framer Motion |
| **Mobile App** | React Native (0.86), Expo SDK 57, Expo Router 4, Expo Location, Expo Camera, Expo SQLite |
| **Testing & QA** | Jest, Supertest, Vitest, React Testing Library, Playwright E2E, Oxlint, TypeScript (`tsc`) |
| **Security & Privacy** | Helmet, Express Rate Limit, Cookie-Parser, HMAC-SHA256 PoD Hashing, DPDP Data Scrubbers |
| **Third-Party APIs** | Razorpay (Payments), Fast2SMS (OTP Delivery), OpenStreetMap / OSRM (Routing) |

---

## 🏗️ Architecture & Monorepo Layout

```
Eminence/
├── backend/                  # REST API, WebSocket Server & Background Cron Jobs
│   ├── src/
│   │   ├── config/           # Database pools, CORS, and runtime options
│   │   ├── controllers/      # Business logic controllers
│   │   ├── middleware/       # Auth guards, sanitizers, and audit logging
│   │   ├── models/           # Sequelize database entities
│   │   ├── routes/           # REST endpoint definitions
│   │   └── services/         # Telematics simulator, pricing engine, notifications
│   └── tests/                # Jest integration test suites
├── frontend/                 # React 19 + Vite Web Application
│   ├── src/
│   │   ├── components/admin/ # Modular tab components (Overview, Telematics, Fleet)
│   │   ├── hooks/            # Custom state & WebSocket subscription hooks
│   │   ├── pages/            # Admin, Customer, Driver, and Booking pages
│   │   └── services/         # Centralized Axios API configuration
│   └── vite.config.js        # Vite compilation and code-splitting setup
├── mobile/                   # React Native (Expo 57) Universal Application
│   ├── src/
│   │   ├── app/              # File-based routing for mobile screens
│   │   └── services/         # SQLite offline sync, push notifications, GPS telemetry
│   └── tests/                # 31-case automated mobile QA integration test suite
├── TECH_STACK.md             # Complete technical stack and architecture reference
├── run_all_tests.js          # Unified pre-commit test runner (Scorecard)
├── CONTRIBUTING.md           # Complete setup & installation guide
├── SECURITY.md               # Security policy & defense architecture
└── README.md                 # Project overview
```

---

## 🚀 Setup & Quick Start

### Prerequisites
- **Node.js**: v20.0.0 or higher
- **npm**: v9.0.0 or higher
- **Git**: Installed on your system

---

### ⚡ One-Click Startup (Windows)

For a fast and fully automated startup experience on Windows, simply double-click the `startup.bat` file located in the root of the project directory.

Alternatively, run it from your command prompt:
```cmd
.\startup.bat
```
This script will automatically open three separate terminal windows and launch the backend API, frontend web app, and mobile Expo server simultaneously. You don't need to manually run any of the individual start commands below if you use this script!

---

### 1. Backend Setup

```bash
# Navigate to backend directory
cd backend

# Install dependencies
npm install

# Configure environment variables
cp .env.example .env
```

> **Zero-Config Local Development**:  
> In `backend/.env`, leave `USE_SQLITE=true` to immediately run using a local SQLite database with automatic table creation and demo seeding, without needing an external PostgreSQL instance.

Start the backend server:
```bash
npm run dev
```
*Backend runs on `http://localhost:3000` (or `PORT` specified in `.env`).*

---

### 2. Frontend Web Setup

```bash
# In a new terminal, navigate to frontend
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```
*Frontend runs on `http://localhost:5173`.*

---

### 3. Mobile App Setup

```bash
# In a new terminal, navigate to mobile
cd mobile

# Install dependencies
npm install

# Start the Expo development bundler
npx expo start
```
- Press `w` to open in your desktop browser.
- Scan the terminal QR code using **Expo Go** on Android or iOS.

---

## 🧪 Running Automated Tests

Eminence includes a comprehensive five-stage validation pipeline that guarantees code quality, type safety, and integration reliability.

Execute the entire test scorecard from the repository root:

```bash
node run_all_tests.js
```

### Monorepo Validation Scorecard
```
========================================================================
                       PRE-COMMIT SCORECARD                             
========================================================================
 [ PASS ] Backend: Jest Unit & Integration Tests (25 Test Cases)
 [ PASS ] Frontend: Oxlint Static Analysis
 [ PASS ] Frontend: Production Bundle Compilation (Vite)
 [ PASS ] Mobile: TypeScript Typecheck (tsc --noEmit)
 [ PASS ] Mobile: Full QA Integration Test Suite (31 Test Cases across 5 Phases)
========================================================================
```

Individual test targets can also be run directly:
- **Backend Tests**: `cd backend && npm test`
- **Frontend Linting**: `cd frontend && npm run lint`
- **Frontend Build**: `cd frontend && npm run build`
- **Mobile Typecheck**: `cd mobile && npm run typecheck`
- **Mobile QA Suite**: `cd mobile && npm test`

---

## 🛡️ Security & Responsible Disclosure

Security is fundamental to Eminence. Please report any potential vulnerabilities responsibly via private disclosure. For our vulnerability response SLAs, scope, and defense-in-depth architecture, please read our [SECURITY.md](SECURITY.md).

---

## 📖 Detailed Setup Guide

For comprehensive installation instructions, zero-config SQLite mode, production PostgreSQL/NeonDB setup, default demo credentials, and troubleshooting FAQs, please refer to our complete **[Setup Guide](CONTRIBUTING.md)** and **[Full Documentation](DOCUMENTATION.md)**.

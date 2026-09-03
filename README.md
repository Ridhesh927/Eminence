# EMINENCE 🚗

### Smart Transport Booking & Helpline Management System

[![Node.js](https://img.shields.io/badge/Node.js-18%2B-green.svg)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-18%2B-61dafb.svg)](https://react.dev/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-NeonDB-336791.svg)](https://neon.tech/)
[![Twilio](https://img.shields.io/badge/Twilio-Voice%20%26%20SMS-F22F46.svg)](https://www.twilio.com/)

---

## 📋 Table of Contents

- [Overview](#overview)
- [Key Features](#key-features)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Installation](#installation)
- [Configuration](#configuration)
- [Running the Application](#running-the-application)
- [API Documentation](#api-documentation)
- [Database Schema](#database-schema)
- [Deployment](#deployment)
- [Testing](#testing)
- [Contributing](#contributing)
- [Team](#team)

---

## 🎯 Overview

**EMINENCE** is an innovative dual-channel transport booking platform designed for tempo and local transport services in Pune. It revolutionizes how customers book rides by offering two seamless channels:

### **The Problem**

Local transport businesses rely on manual phone bookings with:

- Repeated data entry (customers tell their address every booking)
- No systematic record keeping
- Inefficient fleet management
- Poor customer experience

### **The Solution**

EMINENCE provides:

- 🖥️ **Website Booking** — for new/casual customers
- ☎️ **Voice IVR Helpline** — for repeat customers (no re-entry of details!)
- 🚚 **Smart Driver Allocation** — nearest driver in <500ms
- 📱 **Multi-channel Confirmations** — SMS, WhatsApp, Voice

### **The Magic ✨**

Repeat customers call a helpline number → System recognizes them by phone number → Auto-fetches their saved addresses → They complete booking via voice without repeating any information.

---

## 🌟 Key Features

### **Core Features (MVP)**

- ✅ **Dual-Channel Booking**
  - React.js website for web bookings
  - Twilio IVR helpline for voice bookings
  - Real-time synchronization between channels

- ✅ **Caller Recognition Engine**
  - Phone number-based customer identification
  - Auto-fetch saved addresses and booking history
  - Zero data re-entry for repeat customers

- ✅ **Intelligent Driver Allocation**
  - Real-time nearest-driver matching (Google Maps API)
  - Concurrent booking handling (no overbooking)
  - Automatic fare estimation

- ✅ **Multi-Channel Confirmations**
  - SMS confirmations (Twilio)
  - WhatsApp notifications
  - Voice call confirmations
  - Real-time booking status updates

### **Enhancement Features (Phase 2)**

- 📍 GPS Real-time Trip Tracking
- 💳 Payment Integration (Razorpay)
- 📊 Analytics & Reporting Dashboard
- 🖥️ Admin Fleet Management Panel

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        USERS LAYER                               │
│  New Customers │ Repeat Customers │ Drivers │ Admins            │
└────────┬────────────────────┬──────────────────────┬────────────┘
         │                    │                      │
         ▼                    ▼                      ▼
    ┌─────────────┐     ┌──────────────┐    ┌───────────────┐
    │React Website│     │Twilio IVR    │    │Admin Dashboard│
    │(Vite)      │     │Helpline      │    │(React)       │
    └──────┬──────┘     └──────┬───────┘    └───────┬───────┘
           │                   │                    │
           └───────────────────┼────────────────────┘
                               ▼
        ┌──────────────────────────────────────────┐
        │   EXPRESS.JS BACKEND (Node.js)           │
        ├──────────────────────────────────────────┤
        │ Auth Service                             │
        │ Caller Recognition Engine (IVR)          │
        │ Booking Engine                           │
        │ Driver Allocation Service                │
        │ Notification Pipeline                    │
        │ Payment Service                          │
        │ Analytics Engine                         │
        └──────────────────┬───────────────────────┘
                           ▼
        ┌──────────────────────────────────────────┐
        │   NEONDB (PostgreSQL)                    │
        │   Serverless, ACID Transactions          │
        └──────────────────────────────────────────┘
                           │
                ┌──────────┼──────────┐
                ▼          ▼          ▼
            Customers  Bookings   Drivers
            Addresses  Payments   Vehicles
```

---

## 💻 Tech Stack

### **Frontend**

```
React.js 18+ (Vite)       - UI Framework
Redux Toolkit             - State Management
Tailwind CSS              - Styling
Axios                     - HTTP Client
React Router v6           - Navigation
Google Maps API           - Maps Integration
Razorpay SDK              - Payment (Phase 2)
```

### **Backend**

```
Node.js 18+               - Runtime
Express.js 4.x            - Web Framework
Sequelize                 - ORM
PostgreSQL (NeonDB)       - Database
JWT                       - Authentication
Bcrypt                    - Password Hashing
Twilio SDK                - Voice/SMS
Google Maps API           - Distance & Routing
WhatsApp Business API     - Messaging (Phase 2)
Socket.io                 - Real-time Updates (Phase 2)
```

### **External Services**

```
Twilio                    - Voice & SMS
Google Maps               - Distance Matrix & Geocoding
Firebase                  - Authentication (Google Sign-In)
SMTP                      - Email Notifications (Nodemailer)
Razorpay                  - Payment Gateway
WhatsApp Business API     - Messaging
NeonDB                    - PostgreSQL Hosting
Vercel                    - Frontend Deployment
Render/Railway            - Backend Deployment
```

---

## 📁 Project Structure

```
eminence/
├── frontend/                          # React.js Application
│   ├── src/
│   │   ├── components/
│   │   │   ├── Auth/
│   │   │   ├── Booking/
│   │   │   ├── Customer/
│   │   │   ├── Driver/
│   │   │   ├── Admin/
│   │   │   ├── Maps/
│   │   │   ├── Shared/
│   │   │   └── Payment/
│   │   ├── pages/
│   │   ├── redux/
│   │   ├── services/
│   │   ├── utils/
│   │   ├── hooks/
│   │   └── styles/
│   ├── package.json
│   └── .env.example
│
├── backend/                           # Express.js Application
│   ├── src/
│   │   ├── config/
│   │   ├── models/                    # Sequelize Models
│   │   ├── controllers/
│   │   ├── routes/
│   │   ├── middleware/
│   │   ├── services/
│   │   ├── migrations/
│   │   ├── seeders/
│   │   ├── utils/
│   │   ├── app.js
│   │   └── server.js
│   ├── tests/
│   ├── package.json
│   ├── docker-compose.yml
│   └── .env.example
│
├── docs/
│   ├── API_DOCUMENTATION.md
│   ├── DATABASE_SCHEMA.md
│   ├── DEPLOYMENT.md
│   └── TESTING_GUIDE.md
│
├── .github/workflows/
│   ├── ci.yml
│   └── deploy.yml
│
├── README.md
└── .gitignore
```

---

## 🚀 Getting Started

### **Prerequisites**

- Node.js v18+
- npm or yarn
- PostgreSQL (or NeonDB account)
- Twilio Account (for IVR & SMS)
- Google Maps API Key
- Git

### **Clone the Repository**

```bash
git clone https://github.com/yourusername/eminence.git
cd eminence
```

---

## 📦 Installation

### **Backend Setup**

1. Navigate to backend directory:

```bash
cd backend
```

2. Install dependencies:

```bash
npm install
```

3. Create `.env` file:

```bash
cp .env.example .env.local
```

4. Configure environment variables (see [Configuration](#configuration) below)

5. Run database migrations:

```bash
npx sequelize-cli db:migrate --env development
```

6. Seed sample data (users, drivers, vehicles):

```bash
npx sequelize-cli db:seed:all
# To seed the admin user specifically:
npx sequelize-cli db:seed --seed 20260824000000-demo-admin.js
# Or for a specific environment:
npx sequelize-cli db:seed:all --env development
```

### **Frontend Setup**

1. Navigate to frontend directory:

```bash
cd ../frontend
```

2. Install dependencies:

```bash
npm install
```

3. Create `.env.local` file:

```bash
cp .env.example .env.local
```

4. Configure environment variables (see [Configuration](#configuration) below)

---

## ⚙️ Configuration

### **Backend Environment Variables** (`backend/.env.local`)

```env
# Server
NODE_ENV=development
PORT=3000

# Database (NeonDB)
DATABASE_URL=postgresql://user:password@ep-xyz.neon.tech/eminence_db

# JWT
JWT_SECRET=your_super_secret_key_here_min_32_chars
JWT_EXPIRE=7d

# Twilio
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=+1234567890
TWILIO_IVR_NUMBER=+1234567890

# Google Maps
GOOGLE_MAPS_API_KEY=your_google_maps_key

# Razorpay (Phase 2)
RAZORPAY_KEY_ID=your_key_id
RAZORPAY_KEY_SECRET=your_key_secret

# WhatsApp (Phase 2)
WHATSAPP_BUSINESS_PHONE_ID=your_phone_id
WHATSAPP_ACCESS_TOKEN=your_token

# Email (for notifications)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password

# Frontend URL
FRONTEND_URL=http://localhost:5173
```

### **Frontend Environment Variables** (`frontend/.env.local`)

```env
VITE_API_URL=http://localhost:3000/api
VITE_GOOGLE_MAPS_API_KEY=your_google_maps_key
VITE_RAZORPAY_KEY_ID=your_key_id
```

---

## ▶️ Running the Application

### **Development Mode**

**Terminal 1: Backend**

```bash
cd backend
npm run dev
# Server runs on http://localhost:3000
```

**Terminal 2: Frontend**

```bash
cd frontend
npm run dev
# App runs on http://localhost:5173
```

**Terminal 3: Database (if using local PostgreSQL)**

```bash
cd backend
docker-compose up
# PostgreSQL runs on localhost:5432
```

### **Production Mode**

**Build Frontend:**

```bash
cd frontend
npm run build
# Creates optimized build in dist/
```

**Start Backend (Production):**

```bash
cd backend
NODE_ENV=production npm start
```

---

## 📚 API Documentation

### **Authentication Endpoints**

| Method | Endpoint               | Description               |
| ------ | ---------------------- | ------------------------- |
| POST   | `/api/auth/register`   | Register new customer     |
| POST   | `/api/auth/login`      | Send OTP to phone         |
| POST   | `/api/auth/verify-otp` | Verify OTP, return JWT    |
| POST   | `/api/auth/complete-profile` | Complete user profile |
| POST   | `/api/auth/logout`     | Logout & invalidate token |
| GET    | `/api/auth/me`         | Get current user profile  |

### **Booking Endpoints**

| Method | Endpoint                 | Description         |
| ------ | ------------------------ | ------------------- |
| POST   | `/api/bookings`          | Create new booking  |
| GET    | `/api/bookings`          | Get user's bookings |
| GET    | `/api/bookings/:id`      | Get booking details |
| PUT    | `/api/bookings/:id`      | Update booking      |
| POST   | `/api/bookings/:id/rate` | Rate a booking      |

### **Address Endpoints**

| Method | Endpoint             | Description         |
| ------ | -------------------- | ------------------- |
| GET    | `/api/addresses`     | Get saved addresses |
| POST   | `/api/addresses`     | Save new address    |
| PUT    | `/api/addresses/:id` | Update address      |
| DELETE | `/api/addresses/:id` | Delete address      |

### **B2B / Enterprise Endpoints**

| Method | Endpoint                 | Description         |
| ------ | ------------------------ | ------------------- |
| POST   | `/api/b2b/register`      | Upgrade account to B2B |
| POST   | `/api/b2b/contracts`     | Request dedicated contract |
| GET    | `/api/b2b/contracts`     | View active business contracts |
| POST   | `/api/b2b/batch-bookings`| Schedule bulk booking via CSV |
| GET    | `/api/b2b/invoices`      | View corporate invoices |

### **Admin Endpoints**

| Method | Endpoint                    | Description         |
| ------ | --------------------------- | ------------------- |
| GET    | `/api/admin/contracts`      | List all B2B contracts |
| PUT    | `/api/admin/contracts/:id`  | Approve/Reject B2B contract |
| GET    | `/api/admin/stats`          | Get overall platform stats |

### **IVR Endpoints**

| Method | Endpoint                  | Description                  |
| ------ | ------------------------- | ---------------------------- |
| POST   | `/api/ivr/webhook`        | Twilio incoming call webhook |
| POST   | `/api/ivr/gather-speech`  | Process speech input         |
| POST   | `/api/ivr/create-booking` | Create booking via IVR       |

For complete API documentation, see [API_DOCUMENTATION.md](docs/API_DOCUMENTATION.md)

---

## 🗄️ Database Schema

### **Core Tables**

- **customers** — User accounts with phone-based identification
- **addresses** — Saved addresses for customers
- **drivers** — Driver profiles and availability
- **vehicles** — Vehicle information
- **bookings** — All bookings (web & IVR)
- **payments** — Payment records
- **notifications** — SMS/WhatsApp/Voice delivery logs

### **Key Relationships**

```
customers ──1:N──> addresses
customers ──1:N──> bookings
drivers ──1:N──> bookings
drivers ──1:1──> vehicles
bookings ──1:1──> payments
bookings ──1:N──> notifications
```

For detailed schema, see [DATABASE_SCHEMA.md](docs/DATABASE_SCHEMA.md)

---

## 🌐 Deployment

### **Frontend Deployment (Vercel)**

```bash
# Connect GitHub repo to Vercel
# Auto-deploy on every push to main
vercel link
vercel deploy --prod
```

### **Backend Deployment (Render.com)**

```bash
# Create new web service on Render
# Connect GitHub repo
# Set environment variables in Render dashboard
# Deploy with: git push origin main
```

### **Database Deployment (NeonDB)**

```bash
# Create project on NeonDB (https://neon.tech)
# Get connection string
# Set DATABASE_URL in backend environment
# Run migrations: npx sequelize-cli db:migrate --env production
```

For detailed deployment guide, see [DEPLOYMENT.md](docs/DEPLOYMENT.md)

---

## 🧪 Testing

### **Run Unit Tests**

```bash
cd backend
npm run test:unit
```

### **Run Integration Tests**

```bash
cd backend
npm run test:integration
```

### **Run E2E Tests**

```bash
cd backend
npm run test:e2e
```

### **Load Testing**

```bash
npm install -g artillery
artillery run load-test.yml
```

For testing guide, see [TESTING_GUIDE.md](docs/TESTING_GUIDE.md)

---

## 🔒 Security

### **Implemented Security Measures**

- ✅ Passwords hashed with bcrypt (cost 10+)
- ✅ JWT-based authentication
- ✅ Rate limiting on login attempts
- ✅ SQL injection prevention (Sequelize)
- ✅ CSRF protection
- ✅ Phone number encryption
- ✅ HTTPS enforced (production)
- ✅ API key rotation
- ✅ Input validation on all endpoints
- ✅ Secure session handling

---

## 📊 Project Timeline

| Phase                     | Duration    | Features                                            |
| ------------------------- | ----------- | --------------------------------------------------- |
| **Phase 1 (MVP)**         | Weeks 1-6   | Core booking, IVR, driver allocation, notifications |
| **Phase 2 (Enhancement)** | Weeks 7-10  | GPS tracking, payments, admin dashboard             |
| **Phase 3 (Final)**       | Weeks 10-12 | Testing, optimization, documentation, demo          |

---

## 🤝 Contributing

We welcome contributions! Here's how to get started:

1. **Fork the repository**

```bash
git clone https://github.com/yourusername/eminence.git
```

2. **Create a feature branch**

```bash
git checkout -b feature/your-feature-name
```

3. **Make your changes**

```bash
git add .
git commit -m "Add your feature description"
```

4. **Push to the branch**

```bash
git push origin feature/your-feature-name
```

5. **Open a Pull Request**
   - Describe your changes
   - Reference any related issues
   - Wait for code review

### **Code Style**

- Use ESLint for JavaScript
- Follow Prettier formatting
- Write meaningful commit messages
- Add tests for new features



## 👥 Team

**EMINENCE** is developed by a team of computer science students from Deccan Education Society, Pune:

| Name                           | Role                 | GitHub                          |
| ------------------------------ | -------------------- | ------------------------------- |
| Ridhesh Mahajan (1012412023)   | Full Stack Developer | [@Ridhesh927](https://github.com/Ridhesh927) |
| Krishna Dhamdhere (1012412008) | Full Stack Developer | [@20-Krishna-04](https://github.com/20-Krishna-04) |
| Sanket Devkar (1012412002)     | Full Stack Developer | [@sanket-devkar](https://github.com/sanketdevkar)  |
| Pranay Khodake (1012412009)    | Full Stack Developer | [@pranay-cyberguy](https://github.com/pranay-cyberguy)  |

**Mentor:** [Your Professor Name]  
**University:** Des Pune University, Pune , Maharashtra, India

---

## 📞 Support & Contact

- **Issues:** Please use GitHub Issues for bug reports and feature requests
- **Discussions:** Join our GitHub Discussions for questions and ideas
- **Email:** eminence.support.helpline@gmail.com 

---

## 🙏 Acknowledgments

- Twilio for Voice & SMS APIs
- Google Maps for location services
- NeonDB for serverless PostgreSQL
- Vercel & Render for deployment platforms
- React.js and Node.js communities
- Our mentors and advisors

---

## 📈 Future Roadmap

- [ ] Scheduled bookings (book in advance)
- [ ] Driver ratings & reviews
- [ ] In-app customer support chat
- [ ] Multi-language support (Hindi, Marathi)
- [ ] Franchise management system
- [ ] Advanced analytics & reporting
- [ ] Mobile app (React Native)
- [ ] Expansion to other cities

---

## 🔗 Useful Links

- **Live Demo:** [Coming Soon]
- **Project Board:** [GitHub Projects](https://github.com/ridhesh927eminence/projects)
- **Documentation:** [docs/](docs/)
- **Bug Tracker:** [Issues](https://github.com/ridhesh927eminence/issues)
- **Discussions:** [GitHub Discussions](https://github.com/ridhesh927eminence/discussions)

---

## 📄 Additional Documentation

- [Architecture Overview](docs/ARCHITECTURE.md)
- [API Documentation](docs/API_DOCUMENTATION.md)
- [Database Schema](docs/DATABASE_SCHEMA.md)
- [Deployment Guide](docs/DEPLOYMENT.md)
- [Testing Guide](docs/TESTING_GUIDE.md)
- [Troubleshooting](docs/TROUBLESHOOTING.md)

---

<div align="center">

**Made with ❤️ by the EMINENCE Team**

⭐ If you find this project useful, please consider giving it a star!

[Report Bug](https://github.com/yourusername/eminence/issues) • [Request Feature](https://github.com/yourusername/eminence/issues) • [View Docs](docs/)

</div>

---

**Last Updated:** September 2026  
**Version:** 1.0.0 (MVP)

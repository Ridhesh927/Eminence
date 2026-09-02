# Backend Setup

This is the Node.js and Express backend for the Eminence project, using Sequelize as the ORM and Socket.io for real-time customer support.

## Prerequisites

- Node.js (v18 or higher recommended)
- PostgreSQL (or local SQLite for development)
- npm (or yarn/pnpm)

## Installation

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Environment Configuration:
   - Copy `.env.example` to `.env`:
     ```bash
     cp .env.example .env
     ```
   - Review and set environment variables as needed.

## Database Modes & Environments

The backend supports environment-driven database configuration:

### 1. Local SQLite Mode (Recommended for Local Dev)
Set in `.env`:
```env
USE_SQLITE=true
```
- Automatically initializes a local SQLite file (`eminence.sqlite`).
- Ignored by Git (`.gitignore`) to avoid committing binary files.
- Automatically seeds default demo users, drivers, vehicles, and admin when `NODE_ENV=development`.

### 2. PostgreSQL / NeonDB Mode (Production / Staging)
Set in `.env`:
```env
DATABASE_URL=postgresql://user:password@host/eminence_db
USE_SQLITE=false
```
- Connects to remote PostgreSQL via SSL.
- Safe for production: automated demo seeding is disabled by default to protect live data.

### Seeding Configuration Flag
```env
DEMO_SEED=true   # Explicitly enable demo data seeding on startup
```

### Seeded Development Credentials
- **Admin:** `admin@eminence.com` (Password: `adminpassword123`)
- **Customer Demo Phone:** `1234567890`

## Security & Architecture Features

1. **Authentication & Authorization:**
   - Client-controlled roles are prohibited. Roles are derived server-side from verified database records.
   - Admin routes (`/api/admin/*`, `/api/analytics/*`) require valid JWT and `adminMiddleware` enforcement.
2. **Socket.io Security:**
   - Handshake JWT verification via `io.use()`.
   - Role-based room access control: customers are restricted to their own conversation thread; only admins can join `admin_inbox`.
   - Real-time rate limiting (max 5 messages per 3 seconds per socket) and HTML sanitization.
3. **HTTP Rate Limiting:**
   - Uses `express-rate-limit` across auth, admin, analytics, driver, review, and wallet routes.
4. **Input Validation:**
   - Validates and sanitizes payloads across all CRUD operations via `requestValidator.js`.

## Running the Application

To start the server in development mode:
```bash
npm run dev
```

## Running Automated Tests

Run the full integration test suite (covers health check, admin authentication, CRUD pagination, analytics, and socket access control):

```bash
npm test
```

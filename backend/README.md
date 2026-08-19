# Backend Setup

This is the Node.js and Express backend for the Eminence project, using Sequelize as the ORM.

## Prerequisites

- Node.js (v18 or higher recommended)
- PostgreSQL (or your configured SQL database)
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
   - Copy the example `.env` file:
     ```bash
     cp .env.example .env
     ```
   - Fill in the required database credentials and other configuration values in the `.env` file.

## Database Setup & Migration

Ensure your database service is running and matches the credentials provided in your `.env` file. Then, run the following Sequelize commands to set up your database schema:

```bash
npx sequelize-cli db:create
npx sequelize-cli db:migrate
```

## Database Seeding

To insert initial data into the database, run the seeders:

```bash
npx sequelize-cli db:seed:all
```

### Seeded User Details

After running the seed command, a demo customer will be available in the database with the following details:

- **Email:** `demo@example.com`
- **Phone:** `1234567890`

## Running the Application

To start the server in development mode (using nodemon for automatic restarts):

```bash
npm run dev
```

To run tests:

```bash
npm test
```

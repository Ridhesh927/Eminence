const sequelize = require('../config/database');
const process = require('node:process');
const Customer = require('./Customer');
const Admin = require('./Admin');
const Otp = require('./Otp');
const Driver = require('./Driver');
const Vehicle = require('./Vehicle');
const Booking = require('./Booking');
const Review = require('./Review');
const Wallet = require('./Wallet');
const Transaction = require('./Transaction');
const B2BContract = require('./B2BContract');
const Invoice = require('./Invoice');
const Address = require('./Address');
const Inventory = require('./Inventory');
const AuditLog = require('./AuditLog');
const PlatformConfig = require('./PlatformConfig');
const UserConsent = require('./UserConsent');
const SupportChat = require('./SupportChat');
const SupportTicket = require('./SupportTicket');
const Notification = require('./Notification');
const PromoCode = require('./PromoCode');

// Define Relationships
Customer.hasMany(UserConsent, { foreignKey: 'userId', as: 'consents', constraints: false });
UserConsent.belongsTo(Customer, { foreignKey: 'userId', as: 'customer', constraints: false });
Driver.hasMany(UserConsent, { foreignKey: 'userId', as: 'consents', constraints: false });
UserConsent.belongsTo(Driver, { foreignKey: 'userId', as: 'driver', constraints: false });
Customer.hasMany(Otp, { foreignKey: 'customerId', as: 'otps' });
Otp.belongsTo(Customer, { foreignKey: 'customerId', as: 'customer' });

Customer.hasMany(Booking, { foreignKey: 'customerId', as: 'bookings' });
Booking.belongsTo(Customer, { foreignKey: 'customerId', as: 'customer' });

Driver.hasMany(Booking, { foreignKey: 'driverId', as: 'bookings' });
Booking.belongsTo(Driver, { foreignKey: 'driverId', as: 'driver' });

Vehicle.hasMany(Booking, { foreignKey: 'vehicleId', as: 'bookings' });
Booking.belongsTo(Vehicle, { foreignKey: 'vehicleId', as: 'vehicle' });

Customer.hasMany(Review, { foreignKey: 'customerId', as: 'reviews' });
Review.belongsTo(Customer, { foreignKey: 'customerId', as: 'customer' });

Driver.hasMany(Review, { foreignKey: 'driverId', as: 'reviews' });
Review.belongsTo(Driver, { foreignKey: 'driverId', as: 'driver' });

Booking.hasOne(Review, { foreignKey: 'bookingId', as: 'review' });
Review.belongsTo(Booking, { foreignKey: 'bookingId', as: 'booking' });

Customer.hasOne(Wallet, { foreignKey: 'customerId', as: 'wallet' });
Wallet.belongsTo(Customer, { foreignKey: 'customerId', as: 'customer' });

Wallet.hasMany(Transaction, { foreignKey: 'walletId', as: 'transactions' });
Transaction.belongsTo(Wallet, { foreignKey: 'walletId', as: 'wallet' });

// B2B Associations
Customer.hasMany(B2BContract, { foreignKey: 'customerId', as: 'contracts' });
B2BContract.belongsTo(Customer, { foreignKey: 'customerId', as: 'customer' });

Customer.hasMany(Invoice, { foreignKey: 'customerId', as: 'invoices' });
Invoice.belongsTo(Customer, { foreignKey: 'customerId', as: 'customer' });

Customer.hasMany(Address, { foreignKey: 'customerId', as: 'addresses' });
Address.belongsTo(Customer, { foreignKey: 'customerId', as: 'customer' });

Customer.hasMany(Inventory, { foreignKey: 'customerId', as: 'inventories' });
Inventory.belongsTo(Customer, { foreignKey: 'customerId', as: 'customer' });

const { Client } = require('pg');

const bootstrapDatabase = async () => {
  try {
    const dialect = sequelize.getDialect();
    if (dialect === 'postgres') {
      await sequelize.query(`
        DO $$ 
        BEGIN 
          IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_Customers_b2bStatus') THEN
            CREATE TYPE "enum_Customers_b2bStatus" AS ENUM('none', 'pending_verification', 'approved', 'rejected');
          END IF;
          IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_Customers_billingMode') THEN
            CREATE TYPE "enum_Customers_billingMode" AS ENUM('prepaid', 'postpaid');
          END IF;
        END $$;
      `);

      await sequelize.query(`
        ALTER TABLE "Customers" 
          ADD COLUMN IF NOT EXISTS "password" VARCHAR(255),
          ADD COLUMN IF NOT EXISTS "isPro" BOOLEAN DEFAULT false,
          ADD COLUMN IF NOT EXISTS "totalTrips" INTEGER DEFAULT 0,
          ADD COLUMN IF NOT EXISTS "isBusiness" BOOLEAN DEFAULT false,
          ADD COLUMN IF NOT EXISTS "b2bStatus" "enum_Customers_b2bStatus" DEFAULT 'none',
          ADD COLUMN IF NOT EXISTS "companyName" VARCHAR(255),
          ADD COLUMN IF NOT EXISTS "gstNumber" VARCHAR(255),
          ADD COLUMN IF NOT EXISTS "billingMode" "enum_Customers_billingMode" DEFAULT 'prepaid',
          ADD COLUMN IF NOT EXISTS "creditLimit" DECIMAL(10,2) DEFAULT 0.00,
          ADD COLUMN IF NOT EXISTS "creditUsed" DECIMAL(10,2) DEFAULT 0.00,
          ADD COLUMN IF NOT EXISTS "termsAccepted" BOOLEAN DEFAULT false,
          ADD COLUMN IF NOT EXISTS "termsAcceptedAt" TIMESTAMP WITH TIME ZONE,
          ADD COLUMN IF NOT EXISTS "termsVersion" VARCHAR(255);
      `);

      await sequelize.query(`
        ALTER TABLE "Vehicles" 
          ADD COLUMN IF NOT EXISTS "fuelType" VARCHAR(255) DEFAULT 'Diesel';
      `);

      await sequelize.query(`
        ALTER TABLE "Bookings" 
          ADD COLUMN IF NOT EXISTS "stops" JSONB,
          ADD COLUMN IF NOT EXISTS "totalDistance" DECIMAL(10,2),
          ADD COLUMN IF NOT EXISTS "isRoundTrip" BOOLEAN DEFAULT false,
          ADD COLUMN IF NOT EXISTS "waitingTimeHours" INTEGER,
          ADD COLUMN IF NOT EXISTS "waitingFee" DECIMAL(10,2),
          ADD COLUMN IF NOT EXISTS "insuranceFee" DECIMAL(10,2) DEFAULT 0,
          ADD COLUMN IF NOT EXISTS "scheduledAt" TIMESTAMP WITH TIME ZONE,
          ADD COLUMN IF NOT EXISTS "isB2B" BOOLEAN DEFAULT false,
          ADD COLUMN IF NOT EXISTS "gstAmount" DECIMAL(10,2),
          ADD COLUMN IF NOT EXISTS "esgEmissions" REAL,
          ADD COLUMN IF NOT EXISTS "is3plOutsourced" BOOLEAN DEFAULT false,
          ADD COLUMN IF NOT EXISTS "thirdPartyProvider" VARCHAR(255),
          ADD COLUMN IF NOT EXISTS "podHash" VARCHAR(255),
          ADD COLUMN IF NOT EXISTS "queuePosition" INTEGER DEFAULT 1,
          ADD COLUMN IF NOT EXISTS "vehicleId" UUID,
          ADD COLUMN IF NOT EXISTS "expiresAt" TIMESTAMP WITH TIME ZONE,
          ADD COLUMN IF NOT EXISTS "cancellationReason" VARCHAR(255),
          ADD COLUMN IF NOT EXISTS "cancelledBy" VARCHAR(50);
      `);

      await sequelize.query(`
        ALTER TABLE "Drivers"
          ADD COLUMN IF NOT EXISTS "password" VARCHAR(255),
          ADD COLUMN IF NOT EXISTS "email" VARCHAR(255),
          ADD COLUMN IF NOT EXISTS "isAvailable" BOOLEAN DEFAULT true,
          ADD COLUMN IF NOT EXISTS "termsAccepted" BOOLEAN DEFAULT false,
          ADD COLUMN IF NOT EXISTS "termsAcceptedAt" TIMESTAMP WITH TIME ZONE,
          ADD COLUMN IF NOT EXISTS "termsVersion" VARCHAR(255);
      `);

      await sequelize.query(`
        ALTER TABLE "Admins"
          ADD COLUMN IF NOT EXISTS "role" VARCHAR(50) DEFAULT 'Support Admin',
          ADD COLUMN IF NOT EXISTS "isPrimary" BOOLEAN DEFAULT false,
          ADD COLUMN IF NOT EXISTS "phone" VARCHAR(255),
          ADD COLUMN IF NOT EXISTS "pushToken" VARCHAR(255);
      `);

      // Database-level constraint preventing multiple referral rewards for one customer's wallet
      await sequelize.query(`
        CREATE UNIQUE INDEX IF NOT EXISTS "unique_signup_bonus" ON "Transactions" ("walletId") WHERE description = 'Signup Referral Bonus';
      `);

      // Ensure wallet payment method value exists in PostgreSQL enum
      await sequelize.query(`
        ALTER TYPE "enum_Bookings_paymentMethod" ADD VALUE IF NOT EXISTS 'wallet';
      `).catch(() => {});

      // Ensure expired booking status value exists in PostgreSQL enum
      await sequelize.query(`
        ALTER TYPE "enum_Bookings_status" ADD VALUE IF NOT EXISTS 'expired';
      `).catch(() => {});

      // Normalize untouched past-validity bookings to 'expired'
      await sequelize.query(`
        UPDATE "Bookings"
        SET status = 'expired'
        WHERE status = 'cancelled'
          AND ("cancellationReason" ILIKE '%expire%' OR "cancellationReason" ILIKE '%untouched%');
      `).catch(() => {});

      await sequelize.query(`
        ALTER TABLE "Notifications"
          ALTER COLUMN "userId" DROP NOT NULL,
          ALTER COLUMN "type" TYPE VARCHAR(50) USING "type"::text,
          ADD COLUMN IF NOT EXISTS "recipientRole" VARCHAR(50) DEFAULT 'customer',
          ADD COLUMN IF NOT EXISTS "metadata" JSONB;
      `).catch(() => {});
    } else if (dialect === 'sqlite') {
      // For SQLite test environment, use a similar partial index
      await sequelize.query(`
        CREATE UNIQUE INDEX IF NOT EXISTS "unique_signup_bonus" ON "Transactions" ("walletId") WHERE description = 'Signup Referral Bonus';
      `).catch(() => {});

      const addSqliteColumn = async (table, col, def) => {
        try {
          await sequelize.query(`ALTER TABLE "${table}" ADD COLUMN "${col}" ${def};`);
        } catch (_err) {
          // Column already exists
        }
      };

      await addSqliteColumn('Bookings', 'expiresAt', 'DATETIME');
      await addSqliteColumn('Bookings', 'cancellationReason', 'VARCHAR(255)');
      await addSqliteColumn('Bookings', 'cancelledBy', 'VARCHAR(50)');
      await addSqliteColumn('Admins', 'role', "VARCHAR(50) DEFAULT 'Support Admin'");
      await addSqliteColumn('Admins', 'isPrimary', 'BOOLEAN DEFAULT 0');
      await addSqliteColumn('Admins', 'phone', 'VARCHAR(20)');
      await addSqliteColumn('Admins', 'pushToken', 'VARCHAR(255)');
      await addSqliteColumn('Notifications', 'recipientRole', "VARCHAR(50) DEFAULT 'customer'");
      await addSqliteColumn('Notifications', 'dismissedFromBell', 'BOOLEAN DEFAULT 0');
      await addSqliteColumn('Notifications', 'metadata', 'TEXT');
    }
  } catch (e) {
    console.warn('Bootstrap database note:', e.message);
  }
};

const initializeFleetAndDrivers = async () => {
  try {
    const fixtureMode = process.env.NODE_ENV === 'test' ||
      (process.env.NODE_ENV === 'development' && process.env.DEMO_SEED === 'true');
    const existingVehicles = await Vehicle.count();
    if (existingVehicles === 0 && fixtureMode) {
      console.log('Initializing specific company fleet (8 tempos)...');
      const fleetData = [
        {
          registrationNumber: 'MH-12-BP-1001',
          type: 'large',
          model: 'Mahindra Bolero Pickup',
          fuelType: 'Diesel',
          capacityWeight: 1750,
          status: 'available'
        },
        {
          registrationNumber: 'MH-12-AD-2001',
          type: 'medium',
          model: 'Ashok Leyland Dost',
          fuelType: 'Diesel',
          capacityWeight: 1500,
          status: 'available'
        },
        {
          registrationNumber: 'MH-12-TA-3001',
          type: 'small',
          model: 'Tata Ace Gold (Petrol)',
          fuelType: 'Petrol',
          capacityWeight: 750,
          status: 'available'
        },
        {
          registrationNumber: 'MH-12-TA-3002',
          type: 'small',
          model: 'Tata Ace Gold (CNG)',
          fuelType: 'CNG',
          capacityWeight: 750,
          status: 'available'
        },
        {
          registrationNumber: 'MH-12-TA-3003',
          type: 'small',
          model: 'Tata Ace Gold (CNG)',
          fuelType: 'CNG',
          capacityWeight: 750,
          status: 'available'
        },
        {
          registrationNumber: 'MH-12-TA-3004',
          type: 'small',
          model: 'Tata Ace Gold (CNG)',
          fuelType: 'CNG',
          capacityWeight: 750,
          status: 'available'
        },
        {
          registrationNumber: 'MH-12-CH-4001',
          type: 'small',
          model: 'Mahindra Chotta Hatti',
          fuelType: 'Diesel',
          capacityWeight: 750,
          status: 'available'
        },
        {
          registrationNumber: 'MH-12-CH-4002',
          type: 'small',
          model: 'Mahindra Chotta Hatti',
          fuelType: 'Diesel',
          capacityWeight: 750,
          status: 'available'
        }
      ];

      for (const v of fleetData) {
        await Vehicle.create(v);
      }
      console.log('Seeded 8 dedicated fleet tempos successfully.');
    }

    const driverCount = await Driver.count();
    if (fixtureMode && driverCount < 4 && process.env.SEED_PASSWORD) {
      console.log('Provisioning primary fleet drivers (test fixture)...');
      const bcrypt = require('bcrypt');
      const fixturePassword = await bcrypt.hash(process.env.SEED_PASSWORD, 10);
      const defaultDrivers = [
        { name: 'Ramesh Patil', phone: '9822011001', licenseNumber: 'MH12-2020-001001', email: 'ramesh.driver@eminence.com', status: 'active', rating: 4.9, termsAccepted: true },
        { name: 'Suresh Shinde', phone: '9822011002', licenseNumber: 'MH12-2020-001002', email: 'suresh.driver@eminence.com', status: 'active', rating: 4.8, termsAccepted: true },
        { name: 'Ganesh Jadhav', phone: '9822011003', licenseNumber: 'MH12-2020-001003', email: 'ganesh.driver@eminence.com', status: 'active', rating: 4.9, termsAccepted: true },
        { name: 'Sachin More', phone: '9822011004', licenseNumber: 'MH12-2020-001004', email: 'sachin.driver@eminence.com', status: 'active', rating: 5.0, termsAccepted: true },
        { name: 'Nitin Pawar', phone: '9822011005', licenseNumber: 'MH12-2020-001005', email: 'nitin.driver@eminence.com', status: 'active', rating: 4.7, termsAccepted: true },
        { name: 'Rahul Kadam', phone: '9822011006', licenseNumber: 'MH12-2020-001006', email: 'rahul.driver@eminence.com', status: 'active', rating: 4.9, termsAccepted: true }
      ];

      for (const d of defaultDrivers) {
        const existing = await Driver.findOne({ where: { phone: d.phone } });
        if (!existing) {
          await Driver.create({ ...d, password: fixturePassword });
        }
      }
      console.log('Provisioned fleet drivers successfully.');
    }
  } catch (err) {
    console.warn('Fleet initialization note:', err.message);
  }
};

// Function to sync models
const syncDatabase = async () => {
  try {
    if (process.env.NODE_ENV === 'production' && process.env.DB_SYNC !== 'true') {
      console.log('Production environment detected: Skipping automatic schema alteration. Set DB_SYNC=true or run "npm run db:init" during initial deployment if bootstrapping schema.');
      await sequelize.authenticate();
      return;
    }

    await bootstrapDatabase();
    // Sync schema without expensive alter operations on every start
    await sequelize.sync();
    console.log('Database synced successfully');

    // Ensure dedicated company fleet & qualified drivers exist
    await initializeFleetAndDrivers();

    // Ensure single authoritative admin exists based on environment configuration
    const fixtureMode = process.env.NODE_ENV === 'test' ||
      (process.env.NODE_ENV === 'development' && process.env.DEMO_SEED === 'true');
    if (fixtureMode) {
      const bcrypt = require('bcrypt');
      const seedEmail = process.env.SEED_EMAIL;
      const seedPassword = process.env.SEED_PASSWORD;
      if (!seedEmail || !seedPassword) {
        throw new Error('Test/demo fixture mode requires SEED_EMAIL and SEED_PASSWORD.');
      }
      const hashedSeedPassword = await bcrypt.hash(seedPassword, 10);

      // Clean up legacy admin@example.com if present
      if (seedEmail !== 'admin@example.com') {
        await Admin.destroy({ where: { email: 'admin@example.com' } }).catch(() => {});
      }

      const admin = await Admin.findOne({ where: { email: seedEmail } });
      if (!admin) {
        await Admin.create({
          name: 'Super Admin',
          email: seedEmail,
          password: hashedSeedPassword,
          role: 'Superadmin',
          isPrimary: true
        });
        console.log(`Seeded primary admin: ${seedEmail}`);
      } else {
        admin.password = hashedSeedPassword;
        admin.role = 'Superadmin';
        admin.isPrimary = true;
        await admin.save();
      }
    } else if (process.env.NODE_ENV === 'production') {
      const adminCount = await Admin.count();
      if (adminCount === 0) {
        const adminEmail = process.env.ADMIN_EMAIL;
        const adminPassword = process.env.ADMIN_PASSWORD;
        if (adminEmail && adminPassword) {
          const bcrypt = require('bcrypt');
          const hashedAdminPassword = await bcrypt.hash(adminPassword, 10);
          await Admin.create({
            name: 'Root Administrator',
            email: adminEmail,
            password: hashedAdminPassword,
            role: 'Superadmin',
            isPrimary: true
          });
          console.log(`[BOOTSTRAP] Initialized root administrator account for: ${adminEmail}`);
        } else {
          console.warn('[SECURITY NOTICE] No Admin found in database. Configure ADMIN_EMAIL and ADMIN_PASSWORD in environment to provision the root administrator.');
        }
      }
    }

    const shouldSeed = process.env.NODE_ENV === 'development' && process.env.DEMO_SEED === 'true';

    if (!shouldSeed) {
      console.log('Skipping demo seed data (non-demo / live environment)');
      return;
    }
  } catch (error) {
    console.error('Error syncing database:', error);
  }
};

module.exports = {
  sequelize,
  syncDatabase,
  Customer,
  Admin,
  Otp,
  Driver,
  Vehicle,
  Booking,
  Review,
  Wallet,
  Transaction,
  B2BContract,
  Invoice,
  Address,
  Inventory,
  AuditLog,
  PlatformConfig,
  UserConsent,
  SupportChat,
  SupportTicket,
  Notification,
  PromoCode
};

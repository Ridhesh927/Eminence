const process = require('node:process');
const admin = require('firebase-admin');
const dotenv = require('dotenv');
dotenv.config();

const isTestEnv = process.env.NODE_ENV === 'test' || process.env.JEST_WORKER_ID !== undefined;

// In production, we'll need the service account JSON path or string
// For local development, we expect the path to be in the env
if (process.env.FIREBASE_SERVICE_ACCOUNT_PATH) {
  try {
    const serviceAccount = require(process.env.FIREBASE_SERVICE_ACCOUNT_PATH);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    console.log("Firebase Admin Initialized successfully.");
  } catch (error) {
    console.error("Failed to initialize Firebase Admin:", error);
  }
} else if (!isTestEnv) {
  console.warn("FIREBASE_SERVICE_ACCOUNT_PATH not found in environment. Firebase Admin not initialized.");
}

module.exports = admin;

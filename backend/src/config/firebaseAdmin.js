const process = require('node:process');
const { initializeApp, cert } = require('firebase-admin/app');
const dotenv = require('dotenv');
dotenv.config();

const isTestEnv = process.env.NODE_ENV === 'test' || process.env.JEST_WORKER_ID !== undefined;

let adminApp;

if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON || process.env.FIREBASE_SERVICE_ACCOUNT_PATH) {
  try {
    let serviceAccount;
    if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
      serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
    } else {
      const path = require('path');
      const serviceAccountPath = path.resolve(process.cwd(), process.env.FIREBASE_SERVICE_ACCOUNT_PATH);
      serviceAccount = require(serviceAccountPath);
    }

    // Guard against placeholder / unconfigured service account templates
    const isPlaceholderKey = !serviceAccount.private_key || 
      serviceAccount.private_key.includes('(replace with real key)') ||
      serviceAccount.private_key.includes('dummy') ||
      serviceAccount.private_key.length < 100;

    if (isPlaceholderKey) {
      if (!isTestEnv) {
        console.log("ℹ️  Firebase Admin: Using local dev auth mode (service account private_key is placeholder).");
      }
    } else {
      adminApp = initializeApp({
        credential: cert(serviceAccount)
      });
      console.log("Firebase Admin Initialized successfully.");
    }
  } catch (error) {
    console.error("Failed to initialize Firebase Admin:", error.message || error);
  }
} else if (!isTestEnv) {
  console.warn("FIREBASE_SERVICE_ACCOUNT_JSON or FIREBASE_SERVICE_ACCOUNT_PATH not found in environment. Firebase Admin not initialized.");
}

module.exports = adminApp;

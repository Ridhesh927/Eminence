const twilio = require('twilio');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables (.env.local first, overriding any parent process variables)
dotenv.config({ path: path.resolve(__dirname, '../../.env.local'), override: true });
dotenv.config({ path: path.resolve(__dirname, '../../.env'), override: true });

let client;
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;

if (accountSid && accountSid.startsWith('AC') && authToken && authToken !== 'your_auth_token_here') {
  client = twilio(accountSid, authToken);
} else {
  console.warn("Twilio credentials not configured or using placeholders. SMS sending will be mocked in console.");
}

/**
 * Send an SMS using Twilio
 * @param {string} to - Recipient phone number (E.164 format e.g., +1234567890)
 * @param {string} body - SMS body content
 */
const sendSMS = async (to, body) => {
  if (!client) {
    console.warn("Twilio client is not initialized. Check your TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN.");
    return null;
  }
  
  try {
    const message = await client.messages.create({
      body,
      from: process.env.TWILIO_PHONE_NUMBER,
      to,
    });
    console.log("SMS sent successfully: %s", message.sid);
    return message;
  } catch (error) {
    console.error("Error sending SMS:", error);
    return null;
  }
};

module.exports = {
  sendSMS
};

const twilio = require('twilio');
// Note: dotenv is loaded once in server.js — no need to re-load here

let client;
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;

const isTestEnv = process.env.NODE_ENV === 'test' || process.env.JEST_WORKER_ID !== undefined;

if (accountSid && accountSid.startsWith('AC') && authToken && authToken !== 'your_auth_token_here') {
  client = twilio(accountSid, authToken);
} else if (!isTestEnv) {
  console.warn("Twilio credentials not configured or using placeholders. SMS sending will be mocked in console.");
}

/**
 * Send an SMS using Twilio
 * @param {string} to - Recipient phone number (E.164 format e.g., +1234567890)
 * @param {string} body - SMS body content
 */
const sendSMS = async (to, body) => {
  if (!client) {
    if (process.env.NODE_ENV !== 'development') {
      console.error('Twilio is not configured. Cannot send SMS in non-development environment.');
      return null;
    }

    const maskPhone = (phone) => {
      if (!phone) return phone;
      const str = String(phone);
      if (str.length <= 4) return '*'.repeat(str.length);
      return str.slice(0, -4).replace(/./g, '*') + str.slice(-4);
    };

    console.log(`\n================================`);
    console.log(`MOCK SMS SENT TO: ${maskPhone(to)}`);
    console.log(`BODY: ${body}`);
    console.log(`================================\n`);
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

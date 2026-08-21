const twilio = require('twilio');
const dotenv = require('dotenv');
const process = require('node:process');
dotenv.config();

let client;
const twilioSid = process.env.TWILIO_ACCOUNT_SID;
const twilioToken = process.env.TWILIO_AUTH_TOKEN;

if (twilioSid && twilioSid.startsWith('AC') && twilioToken && twilioToken !== 'your_auth_token_here') {
  client = twilio(twilioSid, twilioToken);
} else {
  console.warn('Twilio not initialized: TWILIO_ACCOUNT_SID or TWILIO_AUTH_TOKEN is missing or contains placeholder values.');
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

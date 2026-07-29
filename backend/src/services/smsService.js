const twilio = require('twilio');
const dotenv = require('dotenv');
dotenv.config();

let client;
if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
  client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
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

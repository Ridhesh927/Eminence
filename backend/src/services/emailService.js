
import process from "node:process";
const nodemailer = require('nodemailer');
const dotenv = require('dotenv');
dotenv.config();

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: process.env.SMTP_PORT || 587,
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

/**
 * Send an email using the configured SMTP transporter
 * @param {string} to - Recipient email
 * @param {string} subject - Email subject
 * @param {string} text - Plain text version
 * @param {string} html - HTML version
 */
const sendEmail = async (to, subject, text, html) => {
  try {
    const info = await transporter.sendMail({
      from: `"EMINENCE Support" <${process.env.SMTP_USER}>`,
      to,
      subject,
      text,
      html,
    });
    console.log("Email successfully sent: %s", info.messageId);
    return info;
  } catch (error) {
    console.error("Error sending email:", error);
    // We don't necessarily want to crash the app if an email fails
    return null; 
  }
};

module.exports = {
  sendEmail,
  transporter
};

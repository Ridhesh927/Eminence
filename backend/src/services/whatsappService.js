const axios = require('axios');

/**
 * Sends a WhatsApp message using the WhatsApp Business API.
 * In development without tokens, it will mock the sending.
 * 
 * @param {string} to - Recipient phone number with country code (e.g., "919876543210")
 * @param {string} templateName - The name of the approved WhatsApp template
 * @param {Array} variables - Array of template variables if required
 */
const sendWhatsAppMessage = async (to, templateName, variables = []) => {
  try {
    const token = process.env.WHATSAPP_TOKEN;
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;

    // Fallback/Mock mode for development
    if (!token || !phoneNumberId) {
      console.log(`\n===========================================`);
      console.log(`MOCK WHATSAPP MESSAGE SENT`);
      console.log(`To: ${to}`);
      console.log(`Template: ${templateName}`);
      console.log(`Variables:`, variables);
      console.log(`===========================================\n`);
      return { success: true, mocked: true };
    }

    const payload = {
      messaging_product: "whatsapp",
      to: to,
      type: "template",
      template: {
        name: templateName,
        language: { code: "en_US" }
      }
    };

    // Add variables if they exist
    if (variables.length > 0) {
      payload.template.components = [
        {
          type: "body",
          parameters: variables.map(val => ({ type: "text", text: val }))
        }
      ];
    }

    const response = await axios.post(
      `https://graph.facebook.com/v17.0/${phoneNumberId}/messages`,
      payload,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log(`WhatsApp message sent successfully to ${to}. Message ID: ${response.data.messages[0].id}`);
    return { success: true, data: response.data };

  } catch (error) {
    console.error('Error sending WhatsApp message:', error.response?.data || error.message);
    // Don't throw, just return failure so it doesn't crash the booking flow
    return { success: false, error: error.message };
  }
};

module.exports = {
  sendWhatsAppMessage
};

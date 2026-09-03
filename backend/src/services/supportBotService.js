const { Booking, Driver, Vehicle } = require('../models');
const Groq = require('groq-sdk');

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY
});

/**
 * Handle incoming support messages from customers using Groq LLM
 * @param {string} customerId - The UUID of the customer
 * @param {string} text - The query text sent by the customer
 * @returns {Promise<string>} The response text from the bot
 */
async function handleSupportMessage(customerId, text) {
  try {
    // 1. Fetch recent context for the LLM
    const bookings = await Booking.findAll({
      where: { customerId },
      include: [
        { model: Driver, as: 'driver', attributes: ['name', 'phone'] },
        { model: Vehicle, as: 'vehicle', attributes: ['registrationNumber', 'type'] }
      ],
      order: [['createdAt', 'DESC']],
      limit: 5
    });

    // 2. Format context for the LLM
    let bookingsContext = "Customer's Recent Bookings Context:\n";
    if (bookings.length === 0) {
      bookingsContext += "The customer has no recent bookings.\n";
    } else {
      bookings.forEach((b, index) => {
        const shortId = b?.id ? String(b.id).substring(0, 8).toUpperCase() : 'N/A';
        bookingsContext += `[Booking ${index + 1}] ID: ${shortId}, From: ${b.pickupAddress || 'N/A'}, To: ${b.dropAddress || 'N/A'}, Status: ${b.status}, Fare: ₹${b.estimatedFare || 0}, Goods: ${b.goodsType || 'N/A'}, Vehicle Type: ${b.tempoType || 'N/A'}\n`;
        if (b.driver) bookingsContext += `  Driver: ${b.driver.name} (Phone: ${b.driver.phone})\n`;
        if (b.vehicle) bookingsContext += `  Vehicle Reg: ${b.vehicle.registrationNumber}\n`;
      });
    }

    // 3. Build the System Prompt
    const systemPrompt = `You are the official Customer Support Assistant for "Eminence", Pune's leading smart transport booking platform for local tempos.
Your tone should be helpful, professional, yet friendly and concise. You may use a few appropriate emojis.

COMPANY INFORMATION:
- Helpline Phone: +1234567890 (IVR System available)
- Support Email: support@eminence.com
- Base Fares: Small Tempo (₹350), Medium Tempo (₹550), Large Tempo (₹1200). Prices may vary by distance.

YOUR CAPABILITIES & RULES:
1. You can answer general queries about Eminence.
2. You can estimate fares based on the base rates provided.
3. You have access to the customer's recent bookings below. If they ask about their bookings, track their ride, or driver details, USE THE CONTEXT below to answer them accurately. Do NOT hallucinate bookings.
4. If they want to cancel a booking, tell them they must contact support or use the "Cancel" button on their dashboard. (You cannot cancel it yourself).
5. If you don't know the answer, politely direct them to call the helpline or email support.

--- CONTEXT INJECTION ---
${bookingsContext}
-------------------------
`;

    // 4. Call Groq LLM
    const chatCompletion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: systemPrompt
        },
        {
          role: "user",
          content: text
        }
      ],
      model: "llama3-70b-8192", // Using the 70B model for high reasoning
      temperature: 0.5,
      max_tokens: 500,
    });

    // 5. Return the response
    return chatCompletion.choices[0]?.message?.content || "I'm sorry, but I couldn't generate a response at this time.";

  } catch (error) {
    console.error('Groq LLM Support Bot Error:', error);
    // Fallback response if API fails
    return "I'm currently experiencing some technical difficulties connecting to my AI brain. Please try again later or contact our human support team at support@eminence.com! 🛠️";
  }
}

module.exports = { handleSupportMessage };

const { Booking, Driver, Vehicle } = require('../models');
let Groq;
let groqClient = null;

const OFF_TOPIC_REFUSAL_MESSAGE = 
  "I am the Eminence Logistics Support Assistant. I can only assist with project-related inquiries such as tracking deliveries, driver details, booking tempos, and platform support. 🚚 How can I help with your shipment or booking today?";

/**
 * Fast-path guardrail to detect obvious off-topic prompts
 * (e.g. coding, math, general trivia, politics, recipes, poems, homework)
 */
function isOffTopicQuery(text) {
  if (!text || typeof text !== 'string') return true;
  const t = text.trim();

  const codingPattern = /\b(python|javascript|typescript|c\+\+|java|html|css|sql|script|function|algorithm|write code|code a|write a program|debug|regex|api key)\b/i;
  const triviaPattern = /\b(president|prime minister|capital of|who wrote|history of|recipe|how to cook|bake a cake|lyrics of|write a poem|write a song|write an essay|solve for x|integral of|derivative of)\b/i;
  const mathPattern = /^\s*\d+(?:[\s+\-*/%]+\d+)+\s*$/;
  const roleplayPattern = /\b(pretend you are|ignore previous instructions|act as a|roleplay as|jailbreak)\b/i;

  if (codingPattern.test(t) || triviaPattern.test(t) || mathPattern.test(t) || roleplayPattern.test(t)) {
    // If query contains 'eminence' or specific transport keywords, allow it
    if (/eminence|tempo|delivery|driver|booking/i.test(t) && !codingPattern.test(t) && !mathPattern.test(t)) {
      return false;
    }
    return true;
  }

  return false;
}

function getGroqClient() {
  if (groqClient) return groqClient;
  if (process.env.GROQ_API_KEY) {
    try {
      Groq = require('groq-sdk');
      groqClient = new Groq({ apiKey: process.env.GROQ_API_KEY });
      return groqClient;
    } catch (err) {
      console.warn('Groq SDK initialization warning:', err.message);
      return null;
    }
  }
  return null;
}

/**
 * Handle incoming support messages from customers using Groq LLM
 * with strict logistics domain guardrails.
 * @param {string} customerId - The UUID of the customer
 * @param {string} text - The query text sent by the customer
 * @returns {Promise<string>} The response text from the bot
 */
async function handleSupportMessage(customerId, text) {
  try {
    // 1. Fast Guardrail Check: Block off-topic queries immediately
    if (isOffTopicQuery(text)) {
      return OFF_TOPIC_REFUSAL_MESSAGE;
    }

    // 2. Fetch recent context for the customer
    let bookings = [];
    if (customerId) {
      try {
        bookings = await Booking.findAll({
          where: { customerId },
          include: [
            { model: Driver, as: 'driver', attributes: ['name'] },
            { model: Vehicle, as: 'vehicle', attributes: ['type'] }
          ],
          order: [['createdAt', 'DESC']],
          limit: 5
        });
      } catch (dbErr) {
        console.warn('Could not fetch customer bookings context:', dbErr.message);
      }
    }

    // 3. Format context for the LLM
    let bookingsContext = "Customer's Recent Bookings Context:\n";
    if (bookings.length === 0) {
      bookingsContext += "The customer has no recent or active bookings recorded.\n";
    } else {
      bookings.forEach((b, index) => {
        const shortId = b?.id ? String(b.id).substring(0, 8).toUpperCase() : 'N/A';
        bookingsContext += `[Booking ${index + 1}] ID: ${shortId}, Status: ${b.status}, Fare: ₹${b.estimatedFare || 0}, Goods: ${b.goodsType || 'General Freight'}, Vehicle Type: ${b.tempoType || 'Tempo'}\n`;
        if (b.driver) {
          bookingsContext += `  Assigned Driver: ${b.driver.name}\n`;
        }
        if (b.vehicle) {
          bookingsContext += `  Vehicle: ${b.vehicle.type}\n`;
        }
      });
    }

    // 4. Build the Strict Guardrail System Prompt
    const systemPrompt = `You are the official Customer Support Assistant for "Eminence", Pune's leading smart transport booking platform for local tempos.
Your tone should be helpful, professional, friendly, and concise.

COMPANY INFORMATION:
- Platform: Eminence Smart Transport & Local Logistics (Pune & Maharashtra)
- Helpline Phone: +1234567890 (24/7 IVR System available)
- Support Email: support@eminence.com
- Base Fares:
  * Small Tempo: ₹350 (payload up to 500kg, e.g. Tata Ace)
  * Medium Tempo: ₹550 (payload up to 1200kg, e.g. Bolero Maxi Truck)
  * Large Tempo: ₹1200 (payload up to 2500kg, e.g. 14ft Eicher)

ALLOWED LOGISTICS TOPICS ONLY:
1. Delivery Tracking: If the customer asks "where is delivery" or asks to track a package, check the context below. If no active booking is present in context, ask them for their Booking ID or guide them to the "Tracking" tab.
2. Driver Information: If the customer asks "who is driver", check the context. If a driver is assigned, state their name. If not assigned, explain that dispatch will appoint a driver shortly.
3. Rates & Fares: Provide the standard base rates (Small ₹350, Medium ₹550, Large ₹1200).
4. Cancellation & Support: Explain that cancellations can be made via the dashboard or by contacting the helpline at +1234567890.

MANDATORY OFF-TOPIC REFUSAL POLICY:
You are strictly forbidden from answering general knowledge, trivia, coding/programming, mathematics, recipes, creative writing, politics, or unrelated topics.
If the query is NOT directly about Eminence logistics, shipments, tempos, drivers, or platform support, you MUST REFUSE and respond ONLY with:
"${OFF_TOPIC_REFUSAL_MESSAGE}"

--- CONTEXT INJECTION ---
${bookingsContext}
-------------------------`;

    // 5. Check if Groq client is available
    const client = getGroqClient();
    if (!client) {
      // Fallback for offline/unconfigured environments
      return "Hello! I am your Eminence Support Assistant. For immediate assistance with bookings, delivery tracking, or driver inquiries, please reach our 24/7 helpline at +1234567890 or email support@eminence.com. 🚚";
    }

    const preferredModel = process.env.GROQ_MODEL || 'qwen/qwen3.8-27b';
    let chatCompletion;
    try {
      chatCompletion = await client.chat.completions.create({
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: text }
        ],
        model: preferredModel,
        temperature: 0.2,
        max_tokens: 350,
      });
    } catch (err) {
      // If preferred model is not found, fallback to gpt-oss-120b
      chatCompletion = await client.chat.completions.create({
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: text }
        ],
        model: 'openai/gpt-oss-120b',
        temperature: 0.2,
        max_tokens: 350,
      });
    }

    const answer = chatCompletion.choices[0]?.message?.content?.trim();
    if (!answer) {
      return "I'm sorry, but I couldn't generate a response at this time. Please contact support@eminence.com.";
    }

    // Safety guardrail: If the model generated code blocks despite rules, reject it
    if (answer.includes('```') || /def\s+\w+\(|function\s+\w+\(/.test(answer)) {
      return OFF_TOPIC_REFUSAL_MESSAGE;
    }

    return answer;

  } catch (error) {
    console.error('Groq LLM Support Bot Error:', error);
    return "I'm currently experiencing some technical difficulties connecting to my AI brain. Please try again later or contact our human support team at support@eminence.com! 🛠️";
  }
}

module.exports = { 
  handleSupportMessage,
  isOffTopicQuery,
  OFF_TOPIC_REFUSAL_MESSAGE
};

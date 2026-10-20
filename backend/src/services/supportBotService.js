const { Booking, Driver, Vehicle } = require('../models');
const { tryAcquireAiSlot, executeWithBoundedTimeout } = require('./aiUsageManager');
let Groq;
let groqClient = null;
const getSupportContact = () => process.env.SUPPORT_PHONE
  ? `call ${process.env.SUPPORT_PHONE}`
  : 'use the in-app support channel';

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

/**
 * Fast-path FAQ cache for high-frequency queries.
 * Returns instant deterministic answers without consuming external LLM tokens or API quotas.
 */
function checkFaqCache(queryText) {
  if (!queryText || typeof queryText !== 'string') return null;
  const q = queryText.toLowerCase().trim();

  // 1. Pricing & Fare rates
  if (/\b(rate|rates|fare|fares|price|prices|pricing|cost|how much)\b/i.test(q) && !/where is|track/i.test(q)) {
    return "EMINENCE Standard Tempo Rates (Pune & Maharashtra):\n" +
      "• Small Tempo (Tata Ace / Chhota Hathi): Base ₹350 (payload up to 500kg)\n" +
      "• Medium Tempo (Bolero Maxi Truck): Base ₹550 (payload up to 1200kg)\n" +
      "• Large Tempo (14ft Eicher): Base ₹1200 (payload up to 2500kg)\n\n" +
      `Standard pricing includes 60 mins loading/unloading window. To book a tempo, please visit the Bookings tab or ${getSupportContact()}. 🚚`;
  }

  // 2. Helpline and Contact numbers
  if (/\b(helpline|customer care|phone number|contact number|support email|call support|emergency)\b/i.test(q)) {
    return "EMINENCE 24/7 Customer Support:\n" +
      `• Support contact: ${getSupportContact()} (24/7 assistance available)\n` +
      "• Support Email: support@eminence.com\n" +
      "• Driver Emergency SOS: Available in the mobile app driver dashboard.";
  }

  // 3. Cancellation Policy
  if (/\b(cancel|cancellation|refund)\b/i.test(q) && !/where is|track/i.test(q)) {
    return "EMINENCE Cancellation & Refund Policy:\n" +
      "• Free Cancellation: Zero charge if cancelled within 30 minutes of scheduled booking.\n" +
      "• Instant Wallet Refund: Any advance payments for cancelled trips are immediately credited back to your Eminence Wallet.\n" +
      `• Once a driver has arrived at the pickup location or the trip is in transit, cancellation must be coordinated via support (${getSupportContact()}).`;
  }

  return null;
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
 * with strict logistics domain guardrails, rate limiting, and cost bounds.
 * @param {string} customerId - The UUID of the customer
 * @param {string} text - The query text sent by the customer
 * @returns {Promise<string>} The response text from the bot
 */
async function handleSupportMessage(customerId, text) {
  // 1. Bound and sanitize input length (max 500 characters)
  const safeText = typeof text === 'string' ? text.trim().slice(0, 500) : '';

  // 2. Fast Guardrail Check: Block off-topic queries immediately
  if (isOffTopicQuery(safeText)) {
    return OFF_TOPIC_REFUSAL_MESSAGE;
  }

  // 3. Fast FAQ Cache Check: Provide instant response without burning LLM quota
  const faqAnswer = checkFaqCache(safeText);
  if (faqAnswer) {
    return faqAnswer;
  }

  // 4. Rate Limiting, Concurrency & Daily Quota Guardrail
  const slot = process.env.GROQ_API_KEY
    ? tryAcquireAiSlot(customerId || 'guest_customer')
    : {
      allowed: false,
      reason: 'AI_NOT_CONFIGURED',
      message: `AI support is temporarily unavailable. Please ${getSupportContact()} for immediate assistance.`
    };
  if (!slot.allowed) {
    return slot.message || `AI support is temporarily at capacity. Please ${getSupportContact()} for immediate assistance. 🚚`;
  }

  const startTime = Date.now();
  let outcome = 'error';
  let outputTokens = 0;

  try {
    // 5. Fetch recent context for the customer
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
          limit: 3
        });
      } catch (dbErr) {
        console.warn('Could not fetch customer bookings context:', dbErr.message);
      }
    }

    // 6. Format context for the LLM
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

    // 7. Build the Strict Guardrail System Prompt
    const systemPrompt = `You are the official Customer Support Assistant for "Eminence", Pune's leading smart transport booking platform for local tempos.
Your tone should be helpful, professional, friendly, and concise.

COMPANY INFORMATION:
- Platform: Eminence Smart Transport & Local Logistics (Pune & Maharashtra)
- Support contact: ${getSupportContact()} (24/7 assistance available)
- Support Email: support@eminence.com
- Base Fares:
  * Small Tempo: ₹350 (payload up to 500kg, e.g. Tata Ace)
  * Medium Tempo: ₹550 (payload up to 1200kg, e.g. Bolero Maxi Truck)
  * Large Tempo: ₹1200 (payload up to 2500kg, e.g. 14ft Eicher)

ALLOWED LOGISTICS TOPICS ONLY:
1. Delivery Tracking: If the customer asks "where is delivery" or asks to track a package, check the context below. If no active booking is present in context, ask them for their Booking ID or guide them to the "Tracking" tab.
2. Driver Information: If the customer asks "who is driver", check the context. If a driver is assigned, state their name. If not assigned, explain that dispatch will appoint a driver shortly.
3. Rates & Fares: Provide the standard base rates (Small ₹350, Medium ₹550, Large ₹1200).
4. Cancellation & Support: Explain that cancellations can be made via the dashboard or by contacting ${getSupportContact()}.

MANDATORY OFF-TOPIC REFUSAL POLICY:
You are strictly forbidden from answering general knowledge, trivia, coding/programming, mathematics, recipes, creative writing, politics, or unrelated topics.
If the query is NOT directly about Eminence logistics, shipments, tempos, drivers, or platform support, you MUST REFUSE and respond ONLY with:
"${OFF_TOPIC_REFUSAL_MESSAGE}"

--- CONTEXT INJECTION ---
${bookingsContext}
-------------------------`;

    // 8. Check if Groq client is configured
    const client = getGroqClient();
    if (!client) {
      outcome = 'offline_fallback';
      return `Hello! I am your Eminence Support Assistant. For immediate assistance with bookings, delivery tracking, or driver inquiries, please ${getSupportContact()} or email support@eminence.com. 🚚`;
    }

    const preferredModel = process.env.GROQ_MODEL || 'qwen/qwen3.8-27b';

    // 9. Execute with bounded timeout (8s max)
    const chatCompletion = await executeWithBoundedTimeout(async () => {
      try {
        return await client.chat.completions.create({
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: safeText }
          ],
          model: preferredModel,
          temperature: 0.2,
          max_tokens: 300,
        });
      } catch (err) {
        // Never retry client/auth/quota failures; retry only an unknown or 5xx provider failure once.
        const status = err.status || err.statusCode;
        if (status >= 400 && status < 500) {
          throw err;
        }
        await new Promise((resolve) => setTimeout(resolve, 100));
        return await client.chat.completions.create({
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: safeText }
          ],
          model: 'openai/gpt-oss-120b',
          temperature: 0.2,
          max_tokens: 300,
        });
      }
    }, { timeoutMs: 8000, model: preferredModel });

    const answer = chatCompletion.choices[0]?.message?.content?.trim();
    outputTokens = Number(chatCompletion.usage?.completion_tokens) || 0;
    if (!answer) {
      outcome = 'empty_response';
      return `I'm sorry, but I couldn't generate a response at this time. Please contact support@eminence.com or ${getSupportContact()}.`;
    }

    // Safety guardrail: If the model generated code blocks despite rules, reject it
    if (answer.includes('```') || /def\s+\w+\(|function\s+\w+\(/.test(answer)) {
      outcome = 'guardrail_rejection';
      return OFF_TOPIC_REFUSAL_MESSAGE;
    }

    outcome = 'success';
    return answer;

  } catch (error) {
    const isRateLimitOrQuota = error.status === 429 || error.status === 402 || (error.message && error.message.includes('rate limit'));
    if (isRateLimitOrQuota) {
      outcome = 'provider_rate_limited';
      return `Our AI Support Assistant is temporarily experiencing high demand. For immediate assistance with bookings or tracking, please ${getSupportContact()}. 🚚`;
    }
    if (error.code === 'AI_TIMEOUT') {
      outcome = 'timeout';
      return `Our AI assistant timed out while generating your response. Please try again or ${getSupportContact()}. 🚚`;
    }

    console.error('Groq LLM Support Bot Error:', error.message || error);
    outcome = 'error';
    return "I'm currently experiencing some technical difficulties connecting to my AI brain. Please try again later or contact our human support team at support@eminence.com! 🛠️";
  } finally {
    const durationMs = Date.now() - startTime;
    slot.release({
      outcome,
      durationMs,
      model: process.env.GROQ_MODEL || 'groq',
      inputChars: safeText.length,
      outputTokens
    });
  }
}

module.exports = { 
  handleSupportMessage,
  isOffTopicQuery,
  checkFaqCache,
  OFF_TOPIC_REFUSAL_MESSAGE
};


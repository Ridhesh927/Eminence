const { Booking, Driver, Vehicle } = require('../models');

/**
 * Handle incoming support messages from customers
 * @param {string} customerId - The UUID of the customer
 * @param {string} text - The query text sent by the customer
 * @returns {Promise<string>} The response text from the bot
 */
async function handleSupportMessage(customerId, text) {
  const query = text.toLowerCase().trim();
  
  // 1. Greetings
  if (query.match(/\b(hi|hello|hey|greetings|yo)\b/)) {
    return `Hello! 👋 I am the Eminence Customer Support Bot. How can I help you today?

Here are some things I can do for you:
• Type **"bookings"** or **"status"** to view your recent ride bookings and their live status.
• Type **"cancel [booking_id]"** to cancel a pending booking.
• Type **"fare [pickup] to [drop] (small/medium/large)"** to estimate your fare.
• Type **"contact"** or **"help"** to get our phone number and support email.
• Or ask me any question about our services!`;
  }
  
  // 2. Help/Contact
  if (query.match(/\b(help|contact|support|phone|email|number|call)\b/)) {
    return `📞 **Eminence Helpline Support:**
• **Phone:** +1234567890 (Twilio IVR Helpline)
• **Email:** support@eminence.com
• **Address:** Pune, Maharashtra, India

Feel free to call our IVR helpline directly from your registered phone number for automatic address recognition and bookings!`;
  }

  // 3. Bookings list / Status
  if (query === 'bookings' || query === 'status' || query.includes('my booking') || query.includes('my bookings') || query.includes('show booking')) {
    try {
      const bookings = await Booking.findAll({
        where: { customerId },
        include: [
          { model: Driver, as: 'driver', attributes: ['name', 'phone'] },
          { model: Vehicle, as: 'vehicle', attributes: ['registrationNumber', 'type'] }
        ],
        order: [['createdAt', 'DESC']],
        limit: 5
      });
      
      if (!bookings || bookings.length === 0) {
        return `You don't have any bookings yet. 🚚
Would you like to book a tempo? Go to the "Book Tempo" page or type **"fare [pickup] to [drop]"** to estimate costs!`;
      }
      
      let response = `Here are your recent bookings (showing up to 5): \n\n`;
      bookings.forEach((b, index) => {
        const shortId = b.id.substring(0, 8).toUpperCase();
        response += `**${index + 1}. Booking ID: ${shortId}**
• **From:** ${b.pickupAddress}
• **To:** ${b.dropAddress}
• **Date/Time:** ${b.date} at ${b.time}
• **Goods:** ${b.goodsType} (${b.weight} kg)
• **Fare:** ₹${b.estimatedFare}
• **Status:** 🔴 ${b.status.toUpperCase().replace(/_/g, ' ')}
`;
        if (b.driver) {
          response += `• **Driver:** ${b.driver.name} (${b.driver.phone})
`;
        }
        if (b.vehicle) {
          response += `• **Vehicle:** ${b.vehicle.registrationNumber} (${b.vehicle.type})
`;
        }
        response += `\n`;
      });
      
      return response;
    } catch (err) {
      console.error('Error fetching bookings for support bot:', err);
      return "Sorry, I had an error fetching your bookings. Please try again later.";
    }
  }
  
  // 4. Cancel booking
  if (query.startsWith('cancel')) {
    const parts = query.split(' ');
    if (parts.length < 2) {
      return `To cancel a booking, please type:
**"cancel [booking_id]"** (e.g., *cancel BKG-1234*)`;
    }
    
    const searchId = parts[1].toUpperCase();
    try {
      // Find bookings for this customer
      const bookings = await Booking.findAll({ where: { customerId } });
      const booking = bookings.find(b => b.id.toUpperCase().startsWith(searchId) || b.id.substring(0, 8).toUpperCase() === searchId);
      
      if (!booking) {
        return `Could not find a booking with ID starting with "${searchId}". Please type **"bookings"** to view your bookings and copy the ID.`;
      }
      
      if (booking.status === 'completed') {
        return `Booking **${booking.id.substring(0, 8).toUpperCase()}** is already completed and cannot be cancelled.`;
      }
      if (booking.status === 'cancelled') {
        return `Booking **${booking.id.substring(0, 8).toUpperCase()}** is already cancelled.`;
      }
      if (booking.status === 'in_transit') {
        return `Booking **${booking.id.substring(0, 8).toUpperCase()}** is currently in transit and cannot be cancelled.`;
      }
      
      // Update status to cancelled
      booking.status = 'cancelled';
      await booking.save();
      
      return `✅ Booking **${booking.id.substring(0, 8).toUpperCase()}** has been successfully cancelled.`;
    } catch (err) {
      console.error('Error cancelling booking in support bot:', err);
      return "An error occurred while trying to cancel your booking. Please try again.";
    }
  }

  // 5. Fare estimate
  // Format: fare [pickup] to [drop] [optional vehicle type]
  if (query.startsWith('fare')) {
    const fareMatch = query.match(/fare\s+(.+?)\s+to\s+(.+)/i);
    if (!fareMatch) {
      return `To estimate a fare, please use the format:
**"fare [pickup] to [drop]"**
*(e.g., "fare Swargate to Hinjewadi")*`;
    }
    
    let pickup = fareMatch[1].trim();
    let drop = fareMatch[2].trim();
    let tempoType = 'small';
    
    // Check if tempo type is specified at the end
    if (drop.includes('large')) {
      tempoType = 'large';
      drop = drop.replace('large', '').trim();
    } else if (drop.includes('medium')) {
      tempoType = 'medium';
      drop = drop.replace('medium', '').trim();
    } else if (drop.includes('small')) {
      tempoType = 'small';
      drop = drop.replace('small', '').trim();
    }
    
    const baseRates = { small: 350, medium: 550, large: 1200 };
    const rate = baseRates[tempoType];
    
    return `Estimated Fare from **${pickup}** to **${drop}**:
• **Tempo Type:** ${tempoType.toUpperCase()}
• **Estimated Base Fare:** ₹${rate}
• **Status:** Available for immediate booking!

To confirm this booking, please use our online "Book Tempo" form.`;
  }
  
  // 6. About Eminence
  if (query.match(/\b(about|eminence|what|info|how|book)\b/)) {
    return `ℹ️ **About Eminence:**
Eminence is Pune's leading smart transport booking platform for local tempos. We offer:
• 🖥️ **Web bookings** with real-time tracking.
• ☎️ **IVR Voice Helpline** where repeat customers can book instantly using their registered phone number without re-entering details.
• 🚚 **Smart Driver Allocation** matching you with the nearest driver.

To book a ride, go to the "Book Tempo" page in the navigation bar, or call our IVR Helpline!`;
  }

  // 7. General queries/fallback
  return `I'm not sure how to answer that. 🤖
Would you like to try one of these options?
• Type **"bookings"** to view your recent rides and status.
• Type **"fare [pickup] to [drop]"** to get a price estimate.
• Type **"contact"** for support email and helpline numbers.
• Type **"about"** to learn more about Eminence.`;
}

module.exports = { handleSupportMessage };

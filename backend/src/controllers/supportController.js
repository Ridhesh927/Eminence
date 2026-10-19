const crypto = require('crypto');
const { SupportTicket, Notification, Customer, Driver, Booking } = require('../models');
const { createAndEmitNotification } = require('../services/notificationService');

// Helper to sanitize strings
const sanitizeString = (str) => {
  if (typeof str !== 'string') return '';
  return str.replace(/[<>]/g, '').trim();
};

const getSocketIo = (req) => {
  try {
    const { getIo } = require('../socket');
    return getIo();
  } catch {
    return req?.app?.get('io') || null;
  }
};

// 1. Create a Support Ticket (Customer or Driver)
exports.createTicket = async (req, res) => {
  try {
    const user = req.user || {};
    const { subject, category, priority, bookingId, message, name, phone } = req.body;

    if (!subject || !subject.trim()) {
      return res.status(400).json({ success: false, message: 'Ticket subject is required' });
    }
    if (!message || !message.trim()) {
      return res.status(400).json({ success: false, message: 'Please provide details or a message for the ticket' });
    }

    const userRole = user.role === 'driver' ? 'driver' : 'customer';
    const userName = sanitizeString(user.name || name || (userRole === 'driver' ? 'Driver' : 'Customer'));
    const userPhone = user.phone || phone || null;
    const customerId = userRole === 'customer' ? user.id : null;
    const driverId = userRole === 'driver' ? user.id : null;

    const randomSuffix = crypto.randomInt(1000, 10000);
    const ticketNumber = `TKT-${randomSuffix}`;

    const initialMessage = {
      id: crypto.randomUUID(),
      sender: userRole,
      text: sanitizeString(message),
      name: userName,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      timestamp: new Date().toISOString()
    };

    const ticket = await SupportTicket.create({
      ticketNumber,
      type: 'ticket',
      customerId,
      driverId,
      bookingId: bookingId || null,
      userName,
      userPhone,
      userRole,
      subject: sanitizeString(subject),
      category: category || 'general',
      priority: priority || 'medium',
      status: 'open',
      messages: [initialMessage],
      metadata: {
        createdVia: 'web_or_mobile',
        bookingId: bookingId || null
      }
    });

    // Notify admins via global Socket.IO if attached
    const io = getSocketIo(req);
    if (io) {
      io.to('admin_inbox').emit('new_ticket', ticket);
      io.to('admin_inbox').emit('chat_list_update', await getAllSupportItems());
    }

    // Persist admin notification and broadcast in real-time
    createAndEmitNotification({
      recipientRole: 'admin',
      title: `New Support Ticket #${ticketNumber}`,
      message: `${userName} raised ticket: "${subject}" [${category || 'General'}]`,
      type: 'support',
      metadata: { ticketId: ticket.id, ticketNumber }
    }).catch(notifErr => console.warn('Could not emit notification for ticket:', notifErr.message));

    res.status(201).json({
      success: true,
      message: 'Support ticket raised successfully. Our dispatch team is on it!',
      ticket
    });
  } catch (error) {
    console.error('Error creating support ticket:', error);
    res.status(500).json({ success: false, message: 'Server error creating support ticket' });
  }
};

// 2. Driver SOS Emergency Alert Trigger
exports.triggerDriverSos = async (req, res) => {
  try {
    const user = req.user || {};
    const { driverId, bookingId, lat, lng, reason, notes, vehicleNumber, tempoType } = req.body;

    const resolvedDriverId = user.id || driverId || null;
    let driverName = user.name || 'Driver';
    let driverPhone = user.phone || 'Emergency Contact';

    if (resolvedDriverId && !user.name) {
      const driver = await Driver.findByPk(resolvedDriverId);
      if (driver) {
        driverName = driver.name || driverName;
        driverPhone = driver.phone || driverPhone;
      }
    }

    const randomSuffix = crypto.randomInt(1000, 10000);
    const ticketNumber = `SOS-${randomSuffix}`;

    const emergencyReason = sanitizeString(reason || 'Urgent Road Emergency');
    const emergencySubject = `🚨 DRIVER SOS: ${driverName} - ${emergencyReason}`;

    const sosMessage = {
      id: crypto.randomUUID(),
      sender: 'driver',
      text: `🚨 [EMERGENCY SOS ALERT] Driver activated emergency alert! Reason: ${emergencyReason}. Location: (${lat || 'Unknown'}, ${lng || 'Unknown'}). Notes: ${sanitizeString(notes) || 'Immediate assistance required.'}`,
      name: driverName,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      timestamp: new Date().toISOString(),
      isAlert: true
    };

    const locationData = {
      lat: lat ? parseFloat(lat) : null,
      lng: lng ? parseFloat(lng) : null,
      address: sanitizeString(req.body.address || 'Live GPS Coordinates captured')
    };

    const ticket = await SupportTicket.create({
      ticketNumber,
      type: 'sos',
      driverId: resolvedDriverId,
      customerId: null,
      bookingId: bookingId || null,
      userName: driverName,
      userPhone: driverPhone,
      userRole: 'driver',
      subject: emergencySubject,
      category: 'emergency',
      priority: 'critical',
      status: 'open',
      location: locationData,
      messages: [sosMessage],
      metadata: {
        isSos: true,
        reason: emergencyReason,
        notes: sanitizeString(notes),
        vehicleNumber: vehicleNumber || null,
        tempoType: tempoType || null,
        bookingId: bookingId || null
      }
    });

    // High-priority real-time broadcast to Admin Support Inbox
    const io = getSocketIo(req);
    const sosPayload = {
      ticketId: ticket.id,
      ticketNumber: ticket.ticketNumber,
      driverId: resolvedDriverId,
      driverName,
      driverPhone,
      location: locationData,
      reason: emergencyReason,
      notes: sanitizeString(notes),
      bookingId: bookingId || null,
      vehicle: vehicleNumber || null,
      timestamp: new Date().toISOString()
    };

    if (io) {
      io.to('admin_inbox').emit('driver_sos_alert', sosPayload);
      io.to('admin_inbox').emit('new_ticket', ticket);
      io.to('admin_inbox').emit('chat_list_update', await getAllSupportItems());
    }

    // Persist urgent Admin Notification and broadcast in real-time
    createAndEmitNotification({
      recipientRole: 'admin',
      title: `🚨 DRIVER SOS: ${driverName}`,
      message: `${emergencyReason} at ${locationData.address || `(${locationData.lat || 'GPS'}, ${locationData.lng || 'GPS'})`}. Ticket #${ticketNumber}`,
      type: 'sos',
      metadata: { ticketId: ticket.id, ticketNumber, driverId: resolvedDriverId, isSos: true, location: locationData }
    }).catch(notifErr => console.warn('Could not emit emergency notification:', notifErr.message));

    res.status(201).json({
      success: true,
      message: '🚨 Emergency SOS broadcasted to Eminence Fleet Dispatch Support & Command Center!',
      ticket,
      emergencyDetails: sosPayload
    });
  } catch (error) {
    console.error('Error triggering driver SOS:', error);
    res.status(500).json({ success: false, message: 'Server error processing SOS alert' });
  }
};

// 3. Get Tickets List (Scoped by Role)
exports.getTickets = async (req, res) => {
  try {
    const user = req.user || {};
    const { status, type, priority } = req.query;

    const whereClause = {};

    if (user.role === 'admin') {
      if (status) whereClause.status = status;
      if (type) whereClause.type = type;
      if (priority) whereClause.priority = priority;
    } else if (user.role === 'driver') {
      whereClause.driverId = user.id;
      if (status) whereClause.status = status;
    } else {
      // Customer
      whereClause.customerId = user.id;
      if (status) whereClause.status = status;
    }

    const tickets = await SupportTicket.findAll({
      where: whereClause,
      order: [
        ['priority', 'DESC'],
        ['createdAt', 'DESC']
      ]
    });

    res.status(200).json({
      success: true,
      count: tickets.length,
      tickets
    });
  } catch (error) {
    console.error('Error fetching tickets:', error);
    res.status(500).json({ success: false, message: 'Server error fetching tickets' });
  }
};

// 4. Get Ticket Details by ID
exports.getTicketById = async (req, res) => {
  try {
    const { id } = req.params;
    const user = req.user || {};

    const ticket = await SupportTicket.findByPk(id);
    if (!ticket) {
      return res.status(404).json({ success: false, message: 'Ticket not found' });
    }

    // Authorization check
    if (user.role !== 'admin' && ticket.customerId !== user.id && ticket.driverId !== user.id) {
      return res.status(403).json({ success: false, message: 'Unauthorized to view this ticket' });
    }

    res.status(200).json({
      success: true,
      ticket
    });
  } catch (error) {
    console.error('Error fetching ticket details:', error);
    res.status(500).json({ success: false, message: 'Server error fetching ticket details' });
  }
};

// 5. Add Message to Ticket Thread
exports.addTicketMessage = async (req, res) => {
  try {
    const { id } = req.params;
    const { text, name } = req.body;
    const user = req.user || {};

    if (!text || !text.trim()) {
      return res.status(400).json({ success: false, message: 'Message text cannot be empty' });
    }

    const ticket = await SupportTicket.findByPk(id);
    if (!ticket) {
      return res.status(404).json({ success: false, message: 'Ticket not found' });
    }

    const sender = user.role === 'admin' ? 'admin' : (user.role === 'driver' ? 'driver' : 'customer');
    const senderName = sanitizeString(name || user.name || (sender === 'admin' ? 'Eminence Support' : 'User'));

    const newMessage = {
      id: crypto.randomUUID(),
      sender,
      text: sanitizeString(text),
      name: senderName,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      timestamp: new Date().toISOString()
    };

    const updatedMessages = [...(ticket.messages || []), newMessage];
    await ticket.update({ messages: updatedMessages });

    // Real-time broadcast
    const io = getSocketIo(req);
    if (io) {
      io.to(`ticket_${ticket.id}`).emit('receive_message', newMessage);
      io.to(`chat_${ticket.customerId || ticket.id}`).emit('receive_message', newMessage);
      io.to('admin_inbox').emit('ticket_updated', { ticketId: ticket.id, message: newMessage });
      io.to('admin_inbox').emit('chat_list_update', await getAllSupportItems());
    }

    if (sender !== 'admin') {
      createAndEmitNotification({
        recipientRole: 'admin',
        title: `Support Message #${ticket.ticketNumber}`,
        message: `${senderName}: ${newMessage.text}`,
        type: 'support',
        metadata: { ticketId: ticket.id, ticketNumber: ticket.ticketNumber }
      }).catch(() => {});
    } else if (ticket.customerId) {
      createAndEmitNotification({
        userId: ticket.customerId,
        recipientRole: 'customer',
        title: 'Support Team Replied',
        message: `Eminence Support: ${newMessage.text}`,
        type: 'support',
        metadata: { ticketId: ticket.id, ticketNumber: ticket.ticketNumber }
      }).catch(() => {});
    }

    res.status(200).json({
      success: true,
      message: 'Message sent successfully',
      newMessage,
      ticket
    });
  } catch (error) {
    console.error('Error adding ticket message:', error);
    res.status(500).json({ success: false, message: 'Server error sending message' });
  }
};

// 6. Update Ticket Status (Admin Only)
exports.updateTicketStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ['open', 'in_progress', 'resolved', 'closed'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid ticket status' });
    }

    const ticket = await SupportTicket.findByPk(id);
    if (!ticket) {
      return res.status(404).json({ success: false, message: 'Ticket not found' });
    }

    const updateFields = { status };
    if (status === 'resolved' || status === 'closed') {
      updateFields.resolvedAt = new Date();
    }

    await ticket.update(updateFields);

    const io = getSocketIo(req);
    if (io) {
      io.to(`ticket_${ticket.id}`).emit('ticket_status_updated', { id, status });
      io.to('admin_inbox').emit('chat_list_update', await getAllSupportItems());
    }

    res.status(200).json({
      success: true,
      message: `Ticket status updated to ${status}`,
      ticket
    });
  } catch (error) {
    console.error('Error updating ticket status:', error);
    res.status(500).json({ success: false, message: 'Server error updating ticket status' });
  }
};

// Helper to assemble active chats + tickets for Admin Inbox
async function getAllSupportItems() {
  try {
    const { SupportChat } = require('../models');
    const legacyChats = await SupportChat.findAll();
    const tickets = await SupportTicket.findAll({
      order: [
        ['priority', 'DESC'],
        ['updatedAt', 'DESC']
      ]
    });

    // Format tickets to match Admin Chat interface seamlessly
    const formattedTickets = tickets.map(t => ({
      customerId: t.id,
      ticketId: t.id,
      ticketNumber: t.ticketNumber,
      type: t.type, // 'ticket' or 'sos'
      customerName: t.type === 'sos' ? `🚨 SOS: ${t.userName}` : `[#${t.ticketNumber}] ${t.userName}`,
      userName: t.userName,
      userPhone: t.userPhone,
      userRole: t.userRole,
      subject: t.subject,
      category: t.category,
      priority: t.priority,
      status: t.status,
      location: t.location,
      bookingId: t.bookingId,
      messages: t.messages || [],
      isTicket: true,
      isSos: t.type === 'sos',
      updatedAt: t.updatedAt
    }));

    return [...formattedTickets, ...legacyChats];
  } catch (err) {
    console.error('Error getting all support items:', err);
    return [];
  }
}

exports.getAllSupportItems = getAllSupportItems;

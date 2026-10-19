import { useState, useEffect, useRef, useCallback } from 'react';
import { 
  LifeBuoy, PlusCircle, MessageSquare, Clock, CheckCircle2, 
  AlertCircle, Send, Phone, Mail, ChevronRight, X, Loader2, ArrowLeft
} from 'lucide-react';
import { io } from 'socket.io-client';
import api from '../../services/api';

const API_BASE_URL = api?.defaults?.baseURL || '';

const CustomerSupportTab = ({ user, token }) => {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [activeTicket, setActiveTicket] = useState(null);
  const [ticketMessages, setTicketMessages] = useState([]);
  const [replyText, setReplyText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [bookings, setBookings] = useState([]);

  // Form State
  const [formData, setFormData] = useState({
    subject: '',
    category: 'booking',
    priority: 'normal',
    bookingId: '',
    message: ''
  });

  const socketRef = useRef(null);
  const messagesEndRef = useRef(null);

  // Fetch Tickets
  const fetchTickets = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get('/api/support/tickets');
      if (res.data?.success) {
        setTickets(res.data.tickets || []);
      }
    } catch (err) {
      console.warn('Error fetching customer tickets:', err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch Customer Bookings for linking
  useEffect(() => {
    const fetchRecentBookings = async () => {
      try {
        const res = await api.get('/api/customer/bookings');
        if (res.data?.success) {
          setBookings(res.data.bookings || []);
        }
      } catch (err) {
        console.warn('Error fetching bookings for support modal:', err.message);
      }
    };
    fetchRecentBookings();
    fetchTickets();
  }, [fetchTickets]);

  // Socket Connection for Active Ticket Chat
  useEffect(() => {
    if (!activeTicket) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      return;
    }

    setTicketMessages(activeTicket.messages || []);

    const socket = io(API_BASE_URL, {
      auth: { token }
    });
    socketRef.current = socket;

    // Join ticket room
    socket.emit('join_room', {
      customerId: activeTicket.id,
      name: user?.name || 'Customer'
    });

    socket.on('chat_history', (data) => {
      const msgs = Array.isArray(data) ? data : (data?.messages || []);
      setTicketMessages(msgs);
    });

    socket.on('receive_message', (msg) => {
      setTicketMessages((prev) => {
        if (msg.id && prev.some(m => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
    });

    socket.on('ticket_status_updated', ({ id, status }) => {
      if (activeTicket?.id === id) {
        setActiveTicket(prev => ({ ...prev, status }));
      }
      setTickets(prev => prev.map(t => t.id === id ? { ...t, status } : t));
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [activeTicket, token, user?.name]);

  // Scroll to bottom of chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [ticketMessages]);

  // Handle Create Ticket Submit
  const handleCreateTicket = async (e) => {
    e.preventDefault();
    if (!formData.subject.trim() || !formData.message.trim()) return;

    try {
      setSubmitting(true);
      const res = await api.post('/api/support/tickets', {
        ...formData,
        name: user?.name,
        phone: user?.phone
      });

      if (res.data?.success) {
        setShowCreateModal(false);
        setFormData({
          subject: '',
          category: 'booking',
          priority: 'normal',
          bookingId: '',
          message: ''
        });
        await fetchTickets();
        if (res.data.ticket) {
          setActiveTicket(res.data.ticket);
        }
      }
    } catch (err) {
      console.error('Failed to create ticket:', err);
      alert(err.response?.data?.message || 'Failed to submit support ticket. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Send Reply in Ticket Thread
  const handleSendReply = async (e) => {
    e.preventDefault();
    if (!replyText.trim() || !activeTicket) return;

    const textToSend = replyText.trim();
    setReplyText('');

    const newMsgObj = {
      id: crypto.randomUUID(),
      sender: 'customer',
      text: textToSend,
      name: user?.name || 'Customer',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      timestamp: new Date().toISOString()
    };

    setTicketMessages(prev => [...prev, newMsgObj]);

    // Socket emission to admin_inbox
    if (socketRef.current) {
      socketRef.current.emit('send_message', {
        customerId: activeTicket.id,
        sender: 'customer',
        text: textToSend,
        name: user?.name || 'Customer'
      });
    }

    // HTTP fallback to save in database
    try {
      await api.post(`/api/support/tickets/${activeTicket.id}/messages`, {
        text: textToSend,
        name: user?.name || 'Customer'
      });
    } catch (err) {
      console.warn('Error saving ticket message via HTTP:', err.message);
    }
  };

  // Counts
  const openCount = tickets.filter(t => t.status === 'open' || t.status === 'in_progress').length;
  const resolvedCount = tickets.filter(t => t.status === 'resolved' || t.status === 'closed').length;

  return (
    <div className="space-y-6">
      {/* Top Banner & Stats */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-loft-900 via-loft-900 to-loft-850 p-6 rounded-2xl border border-loft-800 shadow-lg">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-copper-500/15 border border-copper-500/30 rounded-2xl text-copper-400">
            <LifeBuoy className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-2xl font-bold font-serif text-loft-50">Support & Dispatch Helpdesk</h2>
            <p className="text-xs text-loft-300 mt-1 max-w-xl leading-relaxed">
              Have questions regarding your cargo pickup, live routing, invoices, or driver assignment?
              Raise a support ticket below or chat directly with our Pune fleet dispatch team in real-time.
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="btn-primary py-3 px-5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-copper-500/20 whitespace-nowrap cursor-pointer transition-all hover:scale-105"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Raise Support Ticket</span>
        </button>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card p-4 flex items-center justify-between border-loft-800 bg-loft-900/60">
          <div>
            <p className="text-xs text-loft-400 font-medium">Active Tickets</p>
            <p className="text-2xl font-bold text-copper-400 mt-1 font-mono">{openCount}</p>
          </div>
          <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div className="card p-4 flex items-center justify-between border-loft-800 bg-loft-900/60">
          <div>
            <p className="text-xs text-loft-400 font-medium">Resolved Tickets</p>
            <p className="text-2xl font-bold text-emerald-400 mt-1 font-mono">{resolvedCount}</p>
          </div>
          <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="card p-4 flex items-center justify-between border-loft-800 bg-loft-900/60">
          <div>
            <p className="text-xs text-loft-400 font-medium">Avg Dispatch Response</p>
            <p className="text-2xl font-bold text-loft-100 mt-1">&lt; 5 mins</p>
          </div>
          <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-400">
            <MessageSquare className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Main Content: Tickets List vs Active Chat */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Tickets List */}
        <div className={`${activeTicket ? 'lg:col-span-5' : 'lg:col-span-8'} space-y-4`}>
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-loft-100 font-serif">Your Support Tickets</h3>
            <span className="text-xs text-loft-400">{tickets.length} total</span>
          </div>

          {loading ? (
            <div className="card p-12 text-center text-loft-400 text-xs flex flex-col items-center justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-copper-400 mb-2" />
              Loading your support tickets...
            </div>
          ) : tickets.length === 0 ? (
            <div className="card p-12 text-center flex flex-col items-center justify-center border-dashed border-loft-800">
              <div className="p-3 rounded-2xl bg-loft-800 text-copper-400 mb-3">
                <LifeBuoy className="w-8 h-8" />
              </div>
              <p className="text-sm font-bold text-loft-200">No support tickets raised yet</p>
              <p className="text-xs text-loft-400 max-w-sm mt-1 mb-4">
                Need assistance with a booking or transit delivery? Click the button below to submit a ticket to our 24/7 Pune dispatch team.
              </p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="btn-primary py-2 px-4 rounded-xl text-xs font-semibold cursor-pointer"
              >
                + Raise Your First Ticket
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {tickets.map((ticket) => {
                const isSelected = activeTicket?.id === ticket.id;
                const lastMsg = ticket.messages?.[ticket.messages.length - 1];

                return (
                  <div
                    key={ticket.id}
                    onClick={() => setActiveTicket(ticket)}
                    className={`card p-4 transition-all cursor-pointer border hover:border-copper-500/60 ${
                      isSelected
                        ? 'border-copper-500 bg-loft-900 shadow-md ring-1 ring-copper-500/30'
                        : 'border-loft-800/80 bg-loft-900/50 hover:bg-loft-900/80'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] px-2 py-0.5 rounded-md bg-loft-800 font-mono font-bold text-copper-400 border border-copper-500/20">
                          #{ticket.ticketNumber}
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded-md bg-loft-800/80 font-bold capitalize text-loft-300">
                          {ticket.category || 'General'}
                        </span>
                      </div>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                        ticket.status === 'resolved'
                          ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                          : ticket.status === 'in_progress'
                          ? 'bg-blue-500/15 text-blue-400 border border-blue-500/30'
                          : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                      }`}>
                        {ticket.status}
                      </span>
                    </div>

                    <h4 className="text-sm font-bold text-loft-100 line-clamp-1 mb-1">
                      {ticket.subject}
                    </h4>

                    {lastMsg && (
                      <p className="text-xs text-loft-400 line-clamp-1 mb-2">
                        <span className="font-semibold text-loft-300">{lastMsg.name || lastMsg.sender}:</span> {lastMsg.text}
                      </p>
                    )}

                    <div className="flex items-center justify-between text-[11px] text-loft-400 pt-2 border-t border-loft-800/60">
                      <span>{new Date(ticket.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                      <span className="flex items-center gap-1 text-copper-400 font-semibold group-hover:underline">
                        Open Chat <ChevronRight className="w-3.5 h-3.5" />
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: Active Ticket Chat or Pune Helpline Info */}
        <div className={`${activeTicket ? 'lg:col-span-7' : 'lg:col-span-4'} space-y-4`}>
          {activeTicket ? (
            <div className="card p-0 flex flex-col h-[580px] bg-loft-900 border-loft-800 overflow-hidden shadow-xl">
              {/* Chat Header */}
              <div className="p-4 border-b border-loft-800 bg-loft-950/60 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setActiveTicket(null)}
                    className="p-1.5 rounded-lg hover:bg-loft-800 text-loft-400 hover:text-loft-100 lg:hidden cursor-pointer"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] px-2 py-0.5 rounded-md bg-copper-500/20 text-copper-400 font-mono font-bold">
                        #{activeTicket.ticketNumber}
                      </span>
                      <h4 className="text-sm font-bold text-loft-100 truncate max-w-xs">{activeTicket.subject}</h4>
                    </div>
                    <p className="text-[10px] text-loft-400 mt-0.5">
                      Category: <span className="capitalize text-loft-300">{activeTicket.category}</span> • Status: <span className="uppercase font-bold text-copper-400">{activeTicket.status}</span>
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setActiveTicket(null)}
                  className="p-1 rounded-lg hover:bg-loft-800 text-loft-400 hover:text-loft-200 cursor-pointer hidden lg:block"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Messages Body */}
              <div className="flex-grow p-4 overflow-y-auto space-y-3 bg-loft-950/20">
                {ticketMessages.map((msg, idx) => {
                  const isMe = msg.sender === 'customer';
                  return (
                    <div
                      key={msg.id || idx}
                      className={`max-w-[75%] rounded-2xl p-3 text-xs leading-relaxed ${
                        isMe
                          ? 'bg-copper-600 text-white self-end ml-auto rounded-tr-none shadow-sm'
                          : 'bg-loft-800 text-loft-100 border border-loft-700/80 self-start mr-auto rounded-tl-none shadow-sm'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="font-bold text-[10px] opacity-80">
                          {isMe ? 'You' : msg.name || 'Eminence Support'}
                        </span>
                        <span className="text-[9px] opacity-60">
                          {msg.time || (msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '')}
                        </span>
                      </div>
                      <p className="whitespace-pre-wrap">{msg.text}</p>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              {/* Reply Input */}
              <form onSubmit={handleSendReply} className="p-3 border-t border-loft-800 bg-loft-900 flex gap-2">
                <input
                  type="text"
                  placeholder="Type message to Pune dispatch support..."
                  className="flex-1 input-field py-2.5 px-3 text-xs bg-loft-950 border border-loft-800 rounded-xl text-loft-100 placeholder-loft-500 focus:outline-none focus:border-copper-500"
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                />
                <button
                  type="submit"
                  disabled={!replyText.trim()}
                  className="btn-primary px-4 py-2.5 rounded-xl disabled:opacity-40 cursor-pointer flex items-center gap-1.5 text-xs font-bold"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Pune Dispatch Dedicated Helpline Card */}
              <div className="card p-5 bg-gradient-to-br from-loft-900 to-loft-950 border-loft-800 shadow-md">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2.5 rounded-xl bg-copper-500/10 text-copper-400">
                    <Phone className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-loft-100">Dedicated Helpline (7 AM – 7 PM)</h4>
                    <p className="text-[11px] text-loft-400">Calling hours: Morning 7:00 AM to Evening 7:00 PM</p>
                  </div>
                </div>

                <div className="space-y-2 text-xs">
                  <a
                    href="tel:9970734425"
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 p-3 rounded-xl bg-loft-800/60 hover:bg-copper-500/15 border border-loft-700/60 hover:border-copper-500/40 text-loft-200 hover:text-copper-400 transition-all font-semibold"
                  >
                    <span>Helpline Number</span>
                    <span className="font-mono text-copper-400 font-bold">+91 9970734425</span>
                  </a>

                  <a
                    href="mailto:eminence.support.helpline@gmail.com"
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 p-3 rounded-xl bg-loft-800/60 hover:bg-copper-500/15 border border-loft-700/60 hover:border-copper-500/40 text-loft-200 hover:text-copper-400 transition-all font-semibold"
                  >
                    <span className="flex items-center gap-1.5 flex-shrink-0">
                      <Mail className="w-3.5 h-3.5 text-copper-400" /> Support Email
                    </span>
                    <span className="text-loft-300 font-mono text-[11px] sm:text-xs truncate" title="eminence.support.helpline@gmail.com">
                      eminence.support.helpline@gmail.com
                    </span>
                  </a>
                </div>
              </div>

              {/* Tips / Help Card */}
              <div className="card p-5 bg-loft-900/60 border-loft-800">
                <div className="flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 text-copper-400 flex-shrink-0 mt-0.5" />
                  <div className="text-xs text-loft-300 space-y-1">
                    <p className="font-bold text-loft-100">Live Trip Escalations</p>
                    <p className="text-[11px] text-loft-400 leading-relaxed">
                      If your tempo driver is delayed or you need immediate cargo rerouting, mention your Booking ID in the ticket to trigger automated high-priority routing assistance.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Raise Ticket Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-loft-900 border border-loft-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-loft-800 flex items-center justify-between bg-loft-950/60">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-copper-500/15 text-copper-400">
                  <LifeBuoy className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-loft-50 font-serif">Raise Support Ticket</h3>
                  <p className="text-xs text-loft-400">Connect directly with our 24/7 Pune dispatch command</p>
                </div>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1.5 rounded-lg hover:bg-loft-800 text-loft-400 hover:text-loft-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateTicket} className="p-5 space-y-4 text-xs">
              <div>
                <label className="block text-loft-300 font-semibold mb-1">Ticket Subject *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Package pickup delayed in Akurdi"
                  className="w-full input-field py-2.5 px-3 bg-loft-950 border border-loft-800 rounded-xl text-loft-100 placeholder-loft-500 focus:outline-none focus:border-copper-500"
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-loft-300 font-semibold mb-1">Category</label>
                  <select
                    className="w-full bg-loft-950 border border-loft-800 rounded-xl px-3 py-2.5 text-loft-200 focus:outline-none focus:border-copper-500 cursor-pointer"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  >
                    <option value="booking">Booking & Routing</option>
                    <option value="billing">Billing & Payment</option>
                    <option value="cargo">Cargo Handling</option>
                    <option value="driver">Driver Assigned</option>
                    <option value="technical">Technical / App</option>
                    <option value="other">Other Inquiry</option>
                  </select>
                </div>

                <div>
                  <label className="block text-loft-300 font-semibold mb-1">Priority</label>
                  <select
                    className="w-full bg-loft-950 border border-loft-800 rounded-xl px-3 py-2.5 text-loft-200 focus:outline-none focus:border-copper-500 cursor-pointer"
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                  >
                    <option value="normal">Normal</option>
                    <option value="high">High</option>
                    <option value="urgent">🚨 Urgent (Immediate)</option>
                  </select>
                </div>
              </div>

              {bookings.length > 0 && (
                <div>
                  <label className="block text-loft-300 font-semibold mb-1">Link to Active / Recent Booking (Optional)</label>
                  <select
                    className="w-full bg-loft-950 border border-loft-800 rounded-xl px-3 py-2.5 text-loft-200 focus:outline-none focus:border-copper-500 cursor-pointer"
                    value={formData.bookingId}
                    onChange={(e) => setFormData({ ...formData, bookingId: e.target.value })}
                  >
                    <option value="">-- No specific booking --</option>
                    {bookings.slice(0, 10).map((b) => (
                      <option key={b.id} value={b.id}>
                        #{b.id.slice(0, 8)} • {b.pickupAddress || b.pickup} &rarr; {b.dropAddress || b.dropoff} ({b.status})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-loft-300 font-semibold mb-1">Detailed Message / Description *</label>
                <textarea
                  required
                  rows={4}
                  placeholder="Explain your issue in detail so our dispatchers can resolve it quickly..."
                  className="w-full bg-loft-950 border border-loft-800 rounded-xl p-3 text-loft-100 placeholder-loft-500 focus:outline-none focus:border-copper-500 resize-none"
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-loft-700 text-loft-300 hover:text-loft-100 hover:bg-loft-800 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-primary px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 cursor-pointer shadow-md disabled:opacity-50"
                >
                  {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>Submit Ticket</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerSupportTab;

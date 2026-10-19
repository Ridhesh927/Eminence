import { MessageSquare, Send, AlertTriangle, Phone, MapPin, Clock, ShieldAlert, X } from 'lucide-react';
import { useAdminChat } from '../../hooks/useAdminChat';
import { useRef, useEffect, useState } from 'react';

const ChatInbox = ({ activeTab, token }) => {
  const {
    activeChats,
    selectedChat,
    chatMessages,
    replyText,
    setReplyText,
    selectChatRoom,
    handleSendReply,
    emergencyAlerts,
    dismissEmergencyAlert,
    updateTicketStatus
  } = useAdminChat(activeTab, token);

  const [filterType, setFilterType] = useState('all'); // 'all' | 'tickets' | 'sos' | 'chats'
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, selectedChat]);

  const isChatClosed = (chat) => {
    const s = (chat?.status || '').toLowerCase();
    return s === 'closed' || s === 'resolved';
  };

  const isChatActive = (chat) => !isChatClosed(chat);

  const filteredChats = activeChats.filter((chat) => {
    if (filterType === 'sos') return chat.isSos || chat.type === 'sos';
    if (filterType === 'tickets') return (chat.isTicket || chat.ticketId) && !chat.isSos && chat.type !== 'sos';
    if (filterType === 'chats') return !chat.isTicket && !chat.isSos;
    return true;
  });

  const activeSosCount = activeChats.filter(c => (c.isSos || c.type === 'sos') && isChatActive(c)).length;
  const totalSosCount = activeChats.filter(c => c.isSos || c.type === 'sos').length;
  const activeTicketCount = activeChats.filter(c => (c.isTicket || c.ticketId) && !c.isSos && c.type !== 'sos' && isChatActive(c)).length;
  const totalTicketCount = activeChats.filter(c => (c.isTicket || c.ticketId) && !c.isSos && c.type !== 'sos').length;

  return (
    <div className="space-y-4 h-[82vh] flex flex-col">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-loft-50 font-serif">Support & Dispatch Hub</h1>
          <p className="text-xs text-loft-400">Manage real-time customer support tickets, driver queries, and emergency SOS alerts.</p>
        </div>

        {activeSosCount > 0 && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-red-500/20 border border-red-500/40 text-red-400 text-xs font-bold animate-pulse">
            <ShieldAlert className="w-4 h-4 text-red-400" />
            <span>{activeSosCount} Active Driver SOS Alert{activeSosCount > 1 ? 's' : ''}</span>
          </div>
        )}
      </div>

      {/* Emergency SOS Banner if triggered in real-time */}
      {emergencyAlerts.length > 0 && (
        <div className="space-y-2">
          {emergencyAlerts.map((alert, idx) => (
            <div
              key={alert.ticketId || idx}
              className="p-3.5 bg-red-950/80 border-2 border-red-500/70 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-loft-100 shadow-[0_0_25px_rgba(239,68,68,0.35)] animate-pulse"
            >
              <div className="flex items-start gap-3">
                <div className="p-2 bg-red-600 rounded-xl text-white">
                  <AlertTriangle className="w-5 h-5 animate-bounce" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black uppercase tracking-wider text-red-300">🚨 Critical Driver SOS Alert</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-500 text-white font-mono font-bold">#{alert.ticketNumber || 'SOS-ALERT'}</span>
                  </div>
                  <p className="text-sm font-bold text-white mt-0.5">
                    Driver: {alert.driverName} {alert.driverPhone ? `(${alert.driverPhone})` : ''}
                  </p>
                  <p className="text-xs text-red-200">
                    Reason: <span className="font-semibold">{alert.reason || 'Immediate Assistance Required'}</span>
                    {alert.location?.address ? ` • ${alert.location.address}` : ''}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-center">
                {alert.location?.lat && alert.location?.lng && (
                  <a
                    href={`https://www.google.com/maps?q=${alert.location.lat},${alert.location.lng}`}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-1.5 bg-loft-900 border border-red-500/50 hover:bg-red-900/50 text-red-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all"
                  >
                    <MapPin className="w-3.5 h-3.5 text-red-400" />
                    <span>View GPS</span>
                  </a>
                )}
                {alert.driverPhone && (
                  <a
                    href={`tel:${alert.driverPhone}`}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all"
                  >
                    <Phone className="w-3.5 h-3.5" />
                    <span>Call Driver</span>
                  </a>
                )}
                <button
                  onClick={() => dismissEmergencyAlert(alert.ticketId)}
                  className="p-1.5 hover:bg-red-800/50 text-red-300 hover:text-white rounded-lg transition-colors cursor-pointer"
                  title="Dismiss Banner"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Main Inbox Container */}
      <div className="flex-grow flex bg-loft-900 border border-loft-800 rounded-2xl overflow-hidden min-h-0 shadow-xl">
        {/* Left Side: Conversations List */}
        <div className="w-full sm:w-80 md:w-96 border-r border-loft-800 flex flex-col bg-loft-950/40">
          {/* Filter Pills */}
          <div className="p-3 border-b border-loft-800 bg-loft-950/60 flex items-center gap-1.5 overflow-x-auto text-[11px] font-medium no-scrollbar">
            <button
              onClick={() => setFilterType('all')}
              className={`px-3 py-1.5 rounded-xl transition-all whitespace-nowrap cursor-pointer ${
                filterType === 'all'
                  ? 'bg-copper-500 text-white font-bold shadow-sm'
                  : 'bg-loft-800/60 text-loft-400 hover:text-loft-200'
              }`}
            >
              All ({activeChats.length})
            </button>
            <button
              onClick={() => setFilterType('tickets')}
              className={`px-3 py-1.5 rounded-xl transition-all whitespace-nowrap cursor-pointer ${
                filterType === 'tickets'
                  ? 'bg-copper-500 text-white font-bold shadow-sm'
                  : 'bg-loft-800/60 text-loft-400 hover:text-loft-200'
              }`}
            >
              Tickets ({activeTicketCount > 0 ? activeTicketCount : totalTicketCount})
            </button>
            <button
              onClick={() => setFilterType('sos')}
              className={`px-3 py-1.5 rounded-xl transition-all whitespace-nowrap flex items-center gap-1 cursor-pointer ${
                filterType === 'sos'
                  ? 'bg-red-600 text-white font-bold shadow-sm'
                  : activeSosCount > 0
                  ? 'bg-red-500/20 text-red-400 border border-red-500/30 font-bold'
                  : 'bg-loft-800/60 text-loft-400 hover:text-loft-200'
              }`}
            >
              <AlertTriangle className={`w-3 h-3 ${activeSosCount > 0 ? 'text-red-400' : 'text-loft-400'}`} />
              SOS ({activeSosCount > 0 ? `${activeSosCount} Active` : totalSosCount})
            </button>
          </div>

          {/* Conversations Items */}
          <div className="flex-1 overflow-y-auto divide-y divide-loft-800/40">
            {filteredChats.length === 0 ? (
              <div className="p-8 text-center text-loft-500 text-xs">
                No active {filterType === 'all' ? 'conversations or tickets' : filterType}.
              </div>
            ) : (
              filteredChats.map((chat) => {
                const isSelected = selectedChat?.customerId === chat.customerId;
                const lastMsg = chat.messages?.[chat.messages.length - 1];
                const isSos = chat.isSos || chat.type === 'sos';
                const isTicket = chat.isTicket || chat.ticketId;
                const isClosed = isChatClosed(chat);

                return (
                  <button
                    key={chat.customerId}
                    onClick={() => selectChatRoom(chat)}
                    className={`w-full text-left p-3.5 hover:bg-loft-800/50 transition-all block cursor-pointer relative ${
                      isSelected
                        ? isSos && !isClosed
                          ? 'bg-red-950/40 border-l-4 border-red-500'
                          : 'bg-loft-800/90 border-l-4 border-copper-500'
                        : isSos && !isClosed
                        ? 'bg-red-950/20 hover:bg-red-950/30'
                        : isClosed
                        ? 'opacity-70 hover:opacity-100'
                        : ''
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <div className="flex items-center gap-1.5 min-w-0">
                        {isSos ? (
                          <span className={`p-1 rounded flex-shrink-0 ${
                            isClosed ? 'bg-loft-800 text-loft-400 border border-loft-700' : 'bg-red-500 text-white animate-pulse'
                          }`}>
                            <AlertTriangle className="w-3 h-3" />
                          </span>
                        ) : isTicket ? (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-copper-500/20 text-copper-400 border border-copper-500/30 font-mono font-bold flex-shrink-0">
                            #{chat.ticketNumber || 'TKT'}
                          </span>
                        ) : null}
                        <p className={`font-bold text-xs truncate ${isSos && !isClosed ? 'text-red-300' : 'text-loft-100'}`}>
                          {chat.userName || chat.customerName}
                        </p>
                      </div>

                      {chat.status && (
                        <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase ${
                          chat.status === 'resolved'
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : chat.status === 'closed'
                            ? 'bg-loft-800 text-loft-400 border border-loft-700'
                            : chat.status === 'in_progress'
                            ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                            : isSos
                            ? 'bg-red-500 text-white font-black animate-pulse'
                            : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                        }`}>
                          {chat.status}
                        </span>
                      )}
                    </div>

                    {chat.subject && (
                      <p className="text-[11px] font-semibold text-loft-200 truncate mb-0.5">
                        {chat.subject}
                      </p>
                    )}

                    <p className="text-[10px] text-loft-400 truncate">
                      {lastMsg ? `${lastMsg.name || lastMsg.sender}: ${lastMsg.text}` : 'No messages yet'}
                    </p>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right Side: Conversation Thread */}
        <div className="flex-1 flex flex-col bg-loft-950/20 min-w-0">
          {selectedChat ? (
            <>
              {/* Thread Header */}
              <div className="p-3.5 border-b border-loft-800 bg-loft-950/60 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-xl ${
                    selectedChat.isSos && !isChatClosed(selectedChat)
                      ? 'bg-red-600 text-white animate-pulse'
                      : 'bg-loft-800 text-copper-400'
                  }`}>
                    {selectedChat.isSos ? <AlertTriangle className="w-5 h-5" /> : <MessageSquare className="w-5 h-5" />}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-loft-50 font-serif text-sm">
                        {selectedChat.userName || selectedChat.customerName}
                      </p>
                      {selectedChat.ticketNumber && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-loft-800 text-loft-300 font-mono font-bold">
                          #{selectedChat.ticketNumber}
                        </span>
                      )}
                      {selectedChat.category && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-copper-500/20 text-copper-300 font-bold capitalize">
                          {selectedChat.category}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-loft-400 mt-0.5">
                      {selectedChat.userPhone && (
                        <span className="flex items-center gap-1 text-loft-300">
                          <Phone className="w-3 h-3 text-copper-400" />
                          <a href={`tel:${selectedChat.userPhone}`} className="hover:underline">{selectedChat.userPhone}</a>
                        </span>
                      )}
                      {selectedChat.bookingId && (
                        <span>• Booking: <span className="font-mono text-loft-300">#{selectedChat.bookingId.slice(0, 8)}</span></span>
                      )}
                      {selectedChat.location?.lat && selectedChat.location?.lng && (
                        <a
                          href={`https://www.google.com/maps?q=${selectedChat.location.lat},${selectedChat.location.lng}`}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-0.5 text-red-400 hover:underline font-bold"
                        >
                          <MapPin className="w-3 h-3" />
                          <span>GPS Map</span>
                        </a>
                      )}
                    </div>
                  </div>
                </div>

                {/* Status Switcher (Admin Action) */}
                {selectedChat.isTicket && selectedChat.ticketId && (
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-loft-400 font-medium">Status:</span>
                    <select
                      value={selectedChat.status || 'open'}
                      onChange={(e) => updateTicketStatus(selectedChat.ticketId, e.target.value)}
                      className="bg-loft-800 text-loft-100 text-xs rounded-xl px-2.5 py-1.5 border border-loft-700 focus:outline-none focus:border-copper-500 cursor-pointer"
                    >
                      <option value="open">Open</option>
                      <option value="in_progress">In Progress</option>
                      <option value="resolved">Resolved</option>
                      <option value="closed">Closed</option>
                    </select>
                  </div>
                )}
              </div>

              {/* Thread Messages */}
              <div className="flex-grow p-4 sm:p-6 overflow-y-auto space-y-3.5 flex flex-col min-h-0">
                {chatMessages.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-loft-500 text-xs">
                    <Clock className="w-8 h-8 text-loft-700 mb-2" />
                    No messages recorded in this thread yet.
                  </div>
                ) : (
                  chatMessages.map((msg, index) => {
                    const isMe = msg.sender === 'admin';
                    const isEmergency = msg.isAlert;

                    return (
                      <div
                        key={msg.id || index}
                        className={`max-w-[80%] sm:max-w-[70%] rounded-2xl p-3 text-xs leading-relaxed ${
                          isEmergency
                            ? 'bg-red-950/80 border-2 border-red-500/80 text-red-100 self-center w-full max-w-[95%] shadow-[0_0_15px_rgba(239,68,68,0.2)]'
                            : isMe
                            ? 'bg-copper-600 text-white self-end rounded-tr-none shadow-sm'
                            : 'bg-loft-900 text-loft-100 border border-loft-800 self-start rounded-tl-none shadow-sm'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <p className={`font-bold text-[10px] ${
                            isEmergency ? 'text-red-300 flex items-center gap-1' : isMe ? 'text-white/80' : 'text-copper-400'
                          }`}>
                            {isEmergency && <AlertTriangle className="w-3 h-3 text-red-400" />}
                            {isMe ? 'Admin Support' : msg.name || msg.sender}
                          </p>
                          <span className="text-[9px] opacity-60">
                            {msg.time || (msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '')}
                          </span>
                        </div>
                        <p className="whitespace-pre-wrap">{msg.text}</p>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Reply Form */}
              <form onSubmit={handleSendReply} className="p-3 sm:p-4 border-t border-loft-800 bg-loft-900 flex gap-2">
                <input
                  type="text"
                  placeholder="Type dispatch or support response to customer/driver..."
                  className="flex-1 input-field py-2.5 px-3.5 text-xs bg-loft-950 border border-loft-800 rounded-xl text-loft-100 placeholder-loft-500 focus:outline-none focus:border-copper-500"
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                />
                <button
                  type="submit"
                  disabled={!replyText.trim()}
                  className="btn-primary px-4 py-2.5 rounded-xl disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center gap-1.5 text-xs font-bold transition-all"
                >
                  <Send className="w-4 h-4" />
                  <span className="hidden sm:inline">Send</span>
                </button>
              </form>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-loft-400 text-sm p-6 text-center">
              <div className="p-4 bg-loft-900 rounded-2xl border border-loft-800 mb-3 text-copper-400 shadow-md">
                <MessageSquare className="w-8 h-8" />
              </div>
              <h3 className="text-base font-bold text-loft-200 mb-1">Select a Support Conversation</h3>
              <p className="text-xs text-loft-500 max-w-sm">
                Choose a customer ticket, live query, or driver SOS emergency from the left list to review and respond in real-time.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatInbox;

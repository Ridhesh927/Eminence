import { useState, useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';
import api from '../services/api';

const API_BASE_URL = api.defaults.baseURL;

export const useAdminChat = (activeTab, token) => {
  const [activeChats, setActiveChats] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);
  const [replyText, setReplyText] = useState('');
  const [emergencyAlerts, setEmergencyAlerts] = useState([]);
  
  const socketRef = useRef(null);
  const selectedChatRef = useRef(selectedChat);

  useEffect(() => {
    selectedChatRef.current = selectedChat;
  }, [selectedChat]);

  // Initial HTTP fetch of unified support tickets + chats
  const fetchUnifiedSupport = useCallback(async () => {
    try {
      const res = await api.get('/api/support/unified');
      if (res.data?.success && Array.isArray(res.data?.items)) {
        setActiveChats(res.data.items);
      }
    } catch (err) {
      console.warn('Could not fetch unified support items via HTTP, relying on Socket:', err.message);
    }
  }, []);

  useEffect(() => {
    if (activeTab !== 'chat') {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      setSelectedChat(null);
      setChatMessages([]);
      return;
    }

    fetchUnifiedSupport();

    const socket = io(API_BASE_URL, {
      auth: { token }
    });
    socketRef.current = socket;

    socket.emit('join_admin');

    socket.on('chat_list', (list) => {
      if (Array.isArray(list)) setActiveChats(list);
    });

    socket.on('chat_list_update', (list) => {
      if (Array.isArray(list)) {
        setActiveChats(list);
        if (selectedChatRef.current) {
          const match = list.find(
            (c) =>
              String(c.ticketId || c.id || c.customerId) ===
              String(selectedChatRef.current.ticketId || selectedChatRef.current.id || selectedChatRef.current.customerId)
          );
          if (match && match.status !== selectedChatRef.current.status) {
            setSelectedChat((prev) => ({ ...prev, status: match.status }));
          }
        }
      }
    });

    // Real-time status update broadcast from backend
    socket.on('ticket_status_updated', ({ id, status }) => {
      setActiveChats((prev) =>
        prev.map((c) =>
          String(c.ticketId) === String(id) ||
          String(c.id) === String(id) ||
          String(c.customerId) === String(id)
            ? { ...c, status }
            : c
        )
      );
      if (
        selectedChatRef.current &&
        (String(selectedChatRef.current.ticketId) === String(id) ||
          String(selectedChatRef.current.id) === String(id) ||
          String(selectedChatRef.current.customerId) === String(id))
      ) {
        setSelectedChat((prev) => ({ ...prev, status }));
      }
      if (status === 'closed' || status === 'resolved') {
        setEmergencyAlerts((prev) =>
          prev.filter((a) => String(a.ticketId) !== String(id))
        );
      }
    });

    // High Priority Driver Emergency SOS listener
    socket.on('driver_sos_alert', (sosData) => {
      setEmergencyAlerts((prev) => [sosData, ...prev]);
      // Refetch active chats so the SOS conversation shows up at top
      fetchUnifiedSupport();
    });

    // New Customer Support Ticket listener
    socket.on('new_ticket', (ticket) => {
      fetchUnifiedSupport();
    });

    socket.on('chat_history', (data) => {
      const history = Array.isArray(data) ? data : (data?.messages || []);
      const targetId = data?.customerId;
      if (!targetId || targetId === selectedChatRef.current?.customerId) {
        setChatMessages(history);
      }
    });

    socket.on('receive_message', (msg) => {
      if (msg.customerId === selectedChatRef.current?.customerId) {
        setChatMessages((prev) => {
          if (msg.id && prev.some(m => m.id === msg.id)) return prev;
          return [...prev, msg];
        });
      }
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [activeTab, token, fetchUnifiedSupport]);

  const selectChatRoom = (chat) => {
    const prevId = selectedChat?.customerId;
    setSelectedChat(chat);
    setChatMessages(chat.messages || []);

    if (socketRef.current) {
      socketRef.current.emit('admin_select_chat', {
        customerId: chat.customerId,
        previousCustomerId: prevId
      });
    }
  };

  const handleSendReply = (e) => {
    e?.preventDefault();
    if (!replyText.trim() || !selectedChat) return;

    const messageText = replyText.trim();
    setReplyText('');

    if (socketRef.current) {
      socketRef.current.emit('send_message', {
        customerId: selectedChat.customerId,
        sender: 'admin',
        text: messageText,
        name: 'Admin Support'
      });
    }

    // Also persist via REST endpoint if this is a ticket
    if (selectedChat.isTicket && selectedChat.ticketId) {
      api.post(`/api/support/tickets/${selectedChat.ticketId}/messages`, {
        text: messageText,
        name: 'Admin Support'
      }).catch(err => console.warn('Ticket message POST fallback error:', err.message));
    }
  };

  const updateTicketStatus = async (ticketId, status) => {
    try {
      const res = await api.put(`/api/support/tickets/${ticketId}/status`, { status });
      if (res.data?.success) {
        setActiveChats((prev) =>
          prev.map((c) =>
            String(c.ticketId) === String(ticketId) ||
            String(c.id) === String(ticketId) ||
            String(c.customerId) === String(ticketId)
              ? { ...c, status }
              : c
          )
        );
        if (
          selectedChat &&
          (String(selectedChat.ticketId) === String(ticketId) ||
            String(selectedChat.id) === String(ticketId) ||
            String(selectedChat.customerId) === String(ticketId))
        ) {
          setSelectedChat((prev) => ({ ...prev, status }));
        }
        if (status === 'closed' || status === 'resolved') {
          setEmergencyAlerts((prev) =>
            prev.filter((a) => String(a.ticketId) !== String(ticketId))
          );
        }
      }
    } catch (err) {
      console.error('Failed to update ticket status:', err);
    }
  };

  const dismissEmergencyAlert = (ticketId) => {
    setEmergencyAlerts((prev) => prev.filter(a => a.ticketId !== ticketId));
  };

  return {
    activeChats,
    selectedChat,
    chatMessages,
    replyText,
    setReplyText,
    selectChatRoom,
    handleSendReply,
    emergencyAlerts,
    dismissEmergencyAlert,
    updateTicketStatus,
    fetchUnifiedSupport
  };
};

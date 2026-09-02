import { useState, useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';
import { io } from 'socket.io-client';
import { MessageCircle, X, Send } from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const ChatWidget = () => {
  const { isAuthenticated, user } = useSelector((state) => state.auth);
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const socketRef = useRef(null);
  const messagesEndRef = useRef(null);

  // Auto scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isOpen]);

  useEffect(() => {
    if (!isAuthenticated || !user || !isOpen) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      return;
    }

    // Connect to Socket.io server
    const socket = io(API_BASE_URL);
    socketRef.current = socket;

    socket.emit('join_room', {
      customerId: user.id,
      name: user.name || 'Customer',
      role: 'customer'
    });

    // Listen for incoming messages
    socket.on('receive_message', (msg) => {
      setMessages((prev) => [...prev, msg]);
    });

    return () => {
      if (socket) socket.disconnect();
    };
  }, [isAuthenticated, user, isOpen]);

  if (!isAuthenticated || !user || user.role === 'admin') return null;

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!message.trim() || !socketRef.current) return;

    socketRef.current.emit('send_message', {
      customerId: user.id,
      sender: 'customer',
      text: message,
      name: user.name || 'Customer'
    });

    setMessage('');
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {/* Toggle Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="flex items-center justify-center w-14 h-14 bg-copper-500 hover:bg-copper-600 text-white rounded-full shadow-lg transition-transform duration-200 hover:scale-105 cursor-pointer"
        >
          <MessageCircle className="w-6 h-6" />
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div className="w-80 h-96 bg-loft-900 border border-loft-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
          {/* Header */}
          <div className="bg-loft-950 p-4 border-b border-loft-800 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-moss-500 animate-pulse"></div>
              <h3 className="font-bold text-loft-50 font-serif text-sm">Customer Support</h3>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-loft-400 hover:text-loft-100 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Message List */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3 flex flex-col">
            {messages.length === 0 ? (
              <div className="text-center text-loft-400 text-xs my-auto">
                Hi {user.name || 'there'}! 👋 How can we help you today? Send a message to start chatting with an agent.
              </div>
            ) : (
              messages.map((msg, index) => {
                const isMe = msg.sender === 'customer';
                return (
                  <div
                    key={index}
                    className={`max-w-[75%] rounded-2xl p-3 text-xs leading-relaxed ${
                      isMe
                        ? 'bg-copper-500 text-white self-end rounded-tr-none'
                        : 'bg-loft-800 text-loft-100 self-start rounded-tl-none'
                    }`}
                  >
                    <p className="font-bold mb-0.5 text-[10px] opacity-75">
                      {isMe ? 'You' : msg.name || 'Agent'}
                    </p>
                    <p className="whitespace-pre-wrap">{msg.text}</p>
                    <span className="block text-[8px] opacity-50 mt-1 text-right">
                      {msg.time}
                    </span>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Form Input */}
          <form onSubmit={handleSendMessage} className="p-3 border-t border-loft-800 flex gap-2">
            <input
              type="text"
              placeholder="Type your message..."
              className="flex-1 input-field py-2 text-xs"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
            <button
              type="submit"
              disabled={!message.trim()}
              className="btn-primary p-2 rounded-xl disabled:opacity-50 cursor-pointer"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}
    </div>
  );
};

export default ChatWidget;

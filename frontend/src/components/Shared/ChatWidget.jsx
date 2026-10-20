import { useState, useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';
import { io } from 'socket.io-client';
import { MessageCircle, X, Send, Mic, MicOff, Loader2 } from 'lucide-react';


import { getToken } from '../../services/tokenService';
import api from '../../services/api';

const ChatWidget = () => {
  const { isAuthenticated, user, token } = useSelector((state) => state.auth);
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const socketRef = useRef(null);
  const messagesEndRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

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
    const rawSocketUrl = import.meta.env.VITE_API_URL || api.defaults.baseURL || window.location.origin;
    const socket = io(rawSocketUrl.replace(/\/api\/?$/, ''), {
      withCredentials: true,
      auth: { token: token || user?.token || getToken() }
    });
    socketRef.current = socket;

    socket.emit('join_room', {
      customerId: user.id,
      name: user.name || 'Customer',
      role: 'customer'
    });

    // Listen for existing chat history
    socket.on('chat_history', (data) => {
      const history = Array.isArray(data) ? data : (data?.messages || []);
      setMessages(history);
    });

    // Listen for incoming messages
    socket.on('receive_message', (msg) => {
      setMessages((prev) => {
        if (msg.id && prev.some(m => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
    });

    return () => {
      if (socket) socket.disconnect();
    };
  }, [isAuthenticated, user, token, isOpen]);

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

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        stream.getTracks().forEach((track) => track.stop());

        if (audioBlob.size === 0) return;

        setIsTranscribing(true);
        try {
          const formData = new FormData();
          formData.append('audio', audioBlob, 'voice_query.webm');
          formData.append('customerId', user?.id || '');

          const res = await api.post('/ivr/voice-query', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
          });

          if (res.data?.success && res.data.data?.transcription) {
            const transcript = res.data.data.transcription;
            // Send the transcribed voice message to the chat
            if (socketRef.current) {
              socketRef.current.emit('send_message', {
                customerId: user.id,
                sender: 'customer',
                text: transcript,
                name: user.name || 'Customer'
              });
            }
          }
        } catch (err) {
          console.error('Voice query transcription error:', err);
        } finally {
          setIsTranscribing(false);
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.warn('Microphone permission denied or not supported:', err);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {/* Toggle Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="flex items-center justify-center w-14 h-14 bg-copper-500 hover:bg-copper-600 text-white rounded-full shadow-lg transition-transform duration-200 hover:scale-105 cursor-pointer"
          title="Customer Support Chat"
          aria-label="Customer Support Chat"
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
                Hi {user.name || 'there'}! 👋 How can we help you today? Send a message or tap the 🎙️ mic to speak.
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
            {isTranscribing && (
              <div className="bg-loft-800 text-copper-400 self-start rounded-2xl rounded-tl-none p-2.5 text-xs flex items-center gap-2 animate-pulse">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Transcribing voice with Groq AI...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Recording Status Banner */}
          {isRecording && (
            <div className="bg-red-500/20 text-red-400 text-[11px] px-3 py-1 flex items-center justify-between border-t border-red-500/30 animate-pulse">
              <span className="flex items-center gap-1.5 font-medium">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-ping"></span>
                Recording speech...
              </span>
              <span className="text-[10px] opacity-80">Tap mic to send</span>
            </div>
          )}

          {/* Form Input */}
          <form onSubmit={handleSendMessage} className="p-3 border-t border-loft-800 flex items-center gap-2">
            <input
              type="text"
              placeholder={isRecording ? 'Listening...' : 'Type your message...'}
              disabled={isRecording}
              className="flex-1 input-field py-2 text-xs disabled:opacity-60"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
            {/* Voice Mic Button */}
            <button
              type="button"
              onClick={isRecording ? stopRecording : startRecording}
              disabled={isTranscribing}
              className={`p-2 rounded-xl transition-all cursor-pointer ${
                isRecording
                  ? 'bg-red-600 hover:bg-red-700 text-white animate-pulse'
                  : 'bg-loft-800 hover:bg-loft-700 text-loft-300 hover:text-white'
              }`}
              title={isRecording ? 'Stop and send voice recording' : 'Speak your question (Voice AI)'}
            >
              {isTranscribing ? (
                <Loader2 className="w-4 h-4 animate-spin text-copper-400" />
              ) : isRecording ? (
                <MicOff className="w-4 h-4" />
              ) : (
                <Mic className="w-4 h-4" />
              )}
            </button>
            {/* Text Send Button */}
            <button
              type="submit"
              disabled={!message.trim() || isRecording}
              className="btn-primary p-2 rounded-xl disabled:opacity-50 cursor-pointer"
              title="Send text message"
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

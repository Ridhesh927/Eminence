import { useState, useEffect, useRef, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { 
  Bell, Check, CheckCheck, Trash2, X, ExternalLink, 
  ShieldAlert, MessageSquare, Truck, MapPin, CheckCircle, 
  Clock, AlertTriangle, RefreshCw, Volume2, VolumeX, Sparkles
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { io } from 'socket.io-client';
import api from '../../services/api';
import { getToken } from '../../services/tokenService';

const API_BASE_URL = api?.defaults?.baseURL || (import.meta.env?.DEV ? 'http://localhost:3000' : '');

// Play subtle notification chime safely via Web Audio API without external file dependencies
const playNotificationSound = () => {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15); // A5

    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.35);
  } catch (_e) {
    // Audio autoplay restrictions ignored safely
  }
};

const formatTimeAgo = (dateStr) => {
  if (!dateStr) return 'Just now';
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 45) return 'Just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
};

const NotificationBell = ({ role: overrideRole, variant = 'navbar' }) => {
  const { user, token: reduxToken } = useSelector((state) => state.auth);
  const userRole = overrideRole || user?.role || 'customer';
  const isAdmin = userRole === 'admin';
  const navigate = useNavigate();

  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState('all'); // 'all' | 'unread' | 'sos' | 'support' | 'orders'
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [hasNewAlertAnimation, setHasNewAlertAnimation] = useState(false);

  const containerRef = useRef(null);
  const socketRef = useRef(null);

  // Fetch notifications from backend
  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get('/api/notifications?limit=40&bellOnly=true');
      if (res?.data?.success && Array.isArray(res.data?.notifications)) {
        setNotifications(res.data.notifications);
        setUnreadCount(res.data.unreadCount ?? res.data.notifications.filter(n => !n.isRead).length);
      }
    } catch (err) {
      if (err?.message) {
        console.warn('[NotificationBell] Could not fetch notifications:', err.message);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  // Initialize socket listener for real-time notifications
  useEffect(() => {
    fetchNotifications();

    const token = reduxToken || getToken();
    if (!token) return;

    const socket = io(API_BASE_URL, {
      auth: { token },
      transports: ['websocket', 'polling']
    });
    socketRef.current = socket;

    socket.emit('join_notifications');

    // Generic notification payload handler
    const handleIncomingNotification = (newNotif) => {
      if (!newNotif || !newNotif.id) return;
      
      setNotifications((prev) => {
        // Prevent duplicate IDs
        if (prev.some((n) => n.id === newNotif.id)) return prev;
        return [newNotif, ...prev];
      });
      setUnreadCount((prev) => prev + 1);

      if (soundEnabled) {
        playNotificationSound();
      }

      setHasNewAlertAnimation(true);
      setTimeout(() => setHasNewAlertAnimation(false), 2500);
    };

    socket.on('new_notification', handleIncomingNotification);
    socket.on('notification', handleIncomingNotification);

    // If admin, also handle real-time driver SOS alerts directly
    if (isAdmin) {
      socket.on('driver_sos_alert', (sosPayload) => {
        const notifObj = {
          id: `sos-${sosPayload.ticketId || Date.now()}`,
          title: `🚨 DRIVER SOS: ${sosPayload.driverName || 'Driver'}`,
          message: `${sosPayload.reason || 'Road Emergency'} at ${sosPayload.location?.address || 'GPS Coordinates'}. Immediate action required!`,
          type: 'sos',
          isRead: false,
          createdAt: sosPayload.timestamp || new Date().toISOString(),
          metadata: {
            ticketId: sosPayload.ticketId,
            driverId: sosPayload.driverId,
            isSos: true,
            location: sosPayload.location
          }
        };
        handleIncomingNotification(notifObj);
      });

      socket.on('ticket_status_updated', ({ id, status }) => {
        if (status === 'closed' || status === 'resolved') {
          setNotifications(prev =>
            prev.map(n => {
              if (
                String(n.metadata?.ticketId) === String(id) ||
                n.id === `sos-${id}`
              ) {
                return { ...n, isRead: true, isResolved: true };
              }
              return n;
            })
          );
        }
      });
    }

    // If customer, also listen for direct trip updates
    if (!isAdmin) {
      socket.on('booking_status_updated', (data) => {
        if (!data || !data.bookingId) return;
        const b = data.booking || {};
        const status = data.status || b.status;
        let title = 'Ride Update';
        let message = `Booking #${data.bookingId.slice(0, 8)} status updated to ${status}.`;
        let notifType = 'order';

        if (status === 'driver_assigned') {
          title = 'Driver Assigned!';
          message = `Your driver has accepted booking #${data.bookingId.slice(0, 8)} and is heading to pickup.`;
          notifType = 'driver_assigned';
        } else if (status === 'arrived') {
          title = 'Driver Arrived! 📍';
          message = `Driver has reached your pickup location. Please be ready with your OTP.`;
          notifType = 'arrived';
        } else if (status === 'in_transit') {
          title = 'Trip Started! 🚚';
          message = `Your tempo is now in transit towards destination.`;
          notifType = 'in_transit';
        } else if (status === 'completed') {
          title = 'Delivery Completed! 🎉';
          message = `Your delivery #${data.bookingId.slice(0, 8)} has arrived successfully!`;
          notifType = 'completed';
        } else if (status === 'cancelled') {
          title = 'Booking Cancelled';
          message = `Booking #${data.bookingId.slice(0, 8)} was cancelled: ${data.cancellationReason || 'Cancelled'}.`;
          notifType = 'cancelled';
        }

        const syntheticNotif = {
          id: `trip-status-${data.bookingId}-${status}-${Date.now()}`,
          title,
          message,
          type: notifType,
          isRead: false,
          createdAt: new Date().toISOString(),
          metadata: { bookingId: data.bookingId }
        };
        handleIncomingNotification(syntheticNotif);
      });
    }

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [fetchNotifications, isAdmin, reduxToken, soundEnabled]);

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Mark single notification as read
  const handleMarkAsRead = async (id, e) => {
    if (e) e.stopPropagation();
    try {
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
      await api.put(`/api/notifications/${id}/read`);
    } catch (_err) {
      // Background sync failure handled silently
    }
  };

  // Mark all notifications as read
  const handleMarkAllAsRead = async () => {
    try {
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
      await api.put('/api/notifications/mark-all-read');
    } catch (_err) {
      // Sync error handled silently
    }
  };

  // Clear all read notifications
  const handleClearRead = async () => {
    try {
      setNotifications((prev) => prev.filter((n) => !n.isRead));
      await api.delete('/api/notifications/clear-read');
    } catch (_err) {
      // Silently handled
    }
  };

  // Notification item click navigation
  const handleNotificationClick = async (notif) => {
    if (!notif.isRead) {
      await handleMarkAsRead(notif.id);
    }
    setIsOpen(false);

    const meta = notif.metadata || {};
    const notifType = notif.type || '';

    if (isAdmin) {
      // Admin click routing
      if (notifType.includes('sos') || meta.isSos || notifType.includes('support') || meta.ticketId) {
        navigate('/admin/dashboard?tab=chat');
      } else if (meta.bookingId || notifType.includes('order') || notifType.includes('driver')) {
        navigate('/admin/dashboard?tab=dispatch');
      } else {
        navigate('/admin/dashboard');
      }
    } else {
      // Customer click routing
      if (meta.bookingId) {
        navigate(`/tracking/${meta.bookingId}`);
      } else if (meta.ticketId || notifType === 'support') {
        navigate('/customer/dashboard?tab=support');
      } else {
        navigate('/customer/dashboard');
      }
    }
  };

  // Helper to render type-specific icons and colors
  const getTypeStyling = (type = '') => {
    const t = type.toLowerCase();
    if (t.includes('sos') || t.includes('emergency')) {
      return {
        icon: ShieldAlert,
        colorClass: 'text-red-400 bg-red-500/10 border-red-500/30',
        badgeBg: 'bg-red-500 text-white animate-pulse',
        badgeLabel: 'SOS EMERGENCY',
      };
    }
    if (t.includes('support') || t.includes('ticket')) {
      return {
        icon: MessageSquare,
        colorClass: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30',
        badgeBg: 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40',
        badgeLabel: 'SUPPORT',
      };
    }
    if (t.includes('assigned') || t.includes('driver')) {
      return {
        icon: Truck,
        colorClass: 'text-moss-400 bg-moss-500/10 border-moss-500/30',
        badgeBg: 'bg-moss-500/20 text-moss-300 border border-moss-500/40',
        badgeLabel: 'ACCEPTED',
      };
    }
    if (t.includes('arrived')) {
      return {
        icon: MapPin,
        colorClass: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
        badgeBg: 'bg-amber-500/20 text-amber-300 border border-amber-500/40',
        badgeLabel: 'REACHED',
      };
    }
    if (t.includes('transit')) {
      return {
        icon: Truck,
        colorClass: 'text-copper-400 bg-copper-500/10 border-copper-500/30',
        badgeBg: 'bg-copper-500/20 text-copper-300 border border-copper-500/40',
        badgeLabel: 'IN TRANSIT',
      };
    }
    if (t.includes('completed')) {
      return {
        icon: CheckCircle,
        colorClass: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
        badgeBg: 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40',
        badgeLabel: 'COMPLETED',
      };
    }
    if (t.includes('cancel') || t.includes('expired')) {
      return {
        icon: Clock,
        colorClass: 'text-red-400 bg-red-500/10 border-red-500/30',
        badgeBg: 'bg-red-500/20 text-red-300 border border-red-500/40',
        badgeLabel: t.includes('expired') ? 'EXPIRED' : 'CANCELLED',
      };
    }
    return {
      icon: Bell,
      colorClass: 'text-loft-300 bg-loft-800/40 border-loft-700/50',
      badgeBg: 'bg-loft-800 text-loft-300 border border-loft-700',
      badgeLabel: 'ALERT',
    };
  };

  // Filtered notifications
  const filteredNotifications = notifications.filter((item) => {
    if (filter === 'unread') return !item.isRead;
    if (filter === 'sos') return (item.type || '').toLowerCase().includes('sos');
    if (filter === 'support') return (item.type || '').toLowerCase().includes('support');
    if (filter === 'orders') {
      const t = (item.type || '').toLowerCase();
      return !t.includes('sos') && !t.includes('support');
    }
    return true;
  });

  return (
    <div className="relative inline-block" ref={containerRef}>
      {/* Bell Trigger Button */}
      <button
        onClick={() => {
          setIsOpen(!isOpen);
          if (!isOpen) fetchNotifications();
        }}
        className={`relative p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-center outline-none ${
          variant === 'dashboard'
            ? 'bg-loft-900 border-loft-800 hover:border-copper-500/60 hover:bg-loft-800 text-loft-200'
            : 'bg-loft-900/90 border-loft-700/60 hover:border-copper-500/60 hover:bg-loft-800 text-loft-200'
        } ${hasNewAlertAnimation ? 'ring-2 ring-copper-500 animate-bounce' : ''}`}
        aria-label="Notifications"
        title={isAdmin ? 'Admin Alerts & Dispatch Center' : 'Customer Notifications & Ride Updates'}
      >
        <Bell className={`w-5 h-5 transition-transform ${unreadCount > 0 ? 'text-copper-400' : 'text-loft-400'}`} />

        {/* Counter Badge */}
        {unreadCount > 0 && (
          <span className="absolute -top-1.5 -right-1.5 flex h-5 min-w-[20px] px-1 items-center justify-center rounded-full bg-gradient-to-r from-red-600 to-copper-500 text-[11px] font-bold text-white shadow-[0_0_12px_rgba(239,68,68,0.6)] border-2 border-loft-950">
            <span className="absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-60 animate-ping"></span>
            <span className="relative z-10">{unreadCount > 99 ? '99+' : unreadCount}</span>
          </span>
        )}
      </button>

      {/* Dropdown Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.98 }}
            transition={{ duration: 0.18 }}
            className="absolute right-0 mt-3 w-80 sm:w-96 md:w-[420px] bg-loft-950 border border-loft-800 rounded-2xl shadow-2xl shadow-black/80 z-50 overflow-hidden backdrop-blur-xl"
          >
            {/* Header */}
            <div className="p-4 bg-gradient-to-r from-loft-900 via-loft-900/90 to-loft-950 border-b border-loft-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isAdmin ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-copper-500/20 text-copper-400 border border-copper-500/30'}`}>
                  {isAdmin ? <ShieldAlert className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
                </div>
                <div>
                  <h3 className="font-serif font-bold text-sm text-loft-50 flex items-center gap-2">
                    {isAdmin ? 'Admin Dispatch & SOS Alerts' : 'Order & Trip Alerts'}
                  </h3>
                  <p className="text-[11px] text-loft-400">
                    {unreadCount > 0 ? `${unreadCount} unread notification${unreadCount === 1 ? '' : 's'}` : 'All caught up'}
                  </p>
                </div>
              </div>

              {/* Header Quick Controls */}
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setSoundEnabled(!soundEnabled)}
                  className={`p-1.5 rounded-lg border transition-colors ${soundEnabled ? 'text-copper-400 border-copper-500/30 bg-copper-500/10' : 'text-loft-500 border-loft-800'}`}
                  title={soundEnabled ? 'Chime sound enabled' : 'Muted'}
                >
                  {soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
                </button>
                <button
                  onClick={fetchNotifications}
                  disabled={loading}
                  className="p-1.5 rounded-lg border border-loft-800 text-loft-400 hover:text-loft-100 hover:border-loft-700 transition-colors"
                  title="Refresh"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-copper-400' : ''}`} />
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 rounded-lg border border-loft-800 text-loft-400 hover:text-loft-100 hover:border-loft-700 transition-colors"
                  title="Close"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Filter Pills */}
            <div className="px-4 py-2.5 bg-loft-900/60 border-b border-loft-800/80 flex items-center gap-1.5 overflow-x-auto text-xs scrollbar-none">
              <button
                onClick={() => setFilter('all')}
                className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                  filter === 'all' ? 'bg-copper-500 text-loft-950 font-semibold' : 'text-loft-400 hover:bg-loft-800'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setFilter('unread')}
                className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                  filter === 'unread' ? 'bg-copper-500 text-loft-950 font-semibold' : 'text-loft-400 hover:bg-loft-800'
                }`}
              >
                Unread {unreadCount > 0 && `(${unreadCount})`}
              </button>
              {isAdmin && (
                <>
                  <button
                    onClick={() => setFilter('sos')}
                    className={`px-2.5 py-1 rounded-lg font-medium transition-colors flex items-center gap-1 ${
                      filter === 'sos' ? 'bg-red-500 text-white font-semibold' : 'text-red-400 hover:bg-red-500/10'
                    }`}
                  >
                    🚨 SOS
                  </button>
                  <button
                    onClick={() => setFilter('support')}
                    className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                      filter === 'support' ? 'bg-cyan-500 text-loft-950 font-semibold' : 'text-cyan-400 hover:bg-cyan-500/10'
                    }`}
                  >
                    💬 Support
                  </button>
                  <button
                    onClick={() => setFilter('orders')}
                    className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                      filter === 'orders' ? 'bg-moss-500 text-loft-950 font-semibold' : 'text-moss-400 hover:bg-moss-500/10'
                    }`}
                  >
                    🚚 Trips
                  </button>
                </>
              )}
            </div>

            {/* Notifications Scroll Area */}
            <div className="max-h-[380px] overflow-y-auto divide-y divide-loft-800/50 scrollbar-thin scrollbar-thumb-loft-700">
              {loading && notifications.length === 0 ? (
                <div className="p-8 text-center">
                  <div className="w-7 h-7 border-2 border-copper-500 border-t-transparent rounded-full animate-spin mx-auto mb-2.5"></div>
                  <p className="text-xs text-loft-400">Loading alerts...</p>
                </div>
              ) : filteredNotifications.length === 0 ? (
                <div className="p-10 text-center flex flex-col items-center justify-center">
                  <div className="w-12 h-12 rounded-2xl bg-loft-900 border border-loft-800 flex items-center justify-center text-loft-500 mb-3">
                    <CheckCircle className="w-6 h-6 text-moss-500/70" />
                  </div>
                  <h4 className="text-sm font-semibold text-loft-200 mb-1">No alerts found</h4>
                  <p className="text-xs text-loft-400 max-w-[240px]">
                    {filter === 'unread'
                      ? 'You have read all your notifications.'
                      : isAdmin
                      ? 'No driver SOS, support messages, or trip updates.'
                      : 'You will receive real-time updates as your tempo is accepted, arrives, and completes delivery.'}
                  </p>
                </div>
              ) : (
                filteredNotifications.map((item) => {
                  const styling = getTypeStyling(item.type);
                  const Icon = styling.icon;
                  const isSos = (item.type || '').toLowerCase().includes('sos');

                  return (
                    <div
                      key={item.id}
                      onClick={() => handleNotificationClick(item)}
                      className={`group p-3.5 transition-all cursor-pointer flex items-start gap-3 relative ${
                        !item.isRead ? 'bg-loft-900/60 hover:bg-loft-850' : 'bg-transparent hover:bg-loft-900/40'
                      } ${isSos ? 'border-l-4 border-l-red-500 bg-red-950/20 hover:bg-red-950/30' : ''}`}
                    >
                      {/* Left Icon Badge */}
                      <div className={`w-9 h-9 rounded-xl border flex-shrink-0 flex items-center justify-center ${styling.colorClass}`}>
                        <Icon className="w-4 h-4" />
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0 pr-4">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${styling.badgeBg}`}>
                            {styling.badgeLabel}
                          </span>
                          <span className="text-[11px] text-loft-400 font-mono">
                            {formatTimeAgo(item.createdAt)}
                          </span>
                          {!item.isRead && (
                            <span className="w-2 h-2 rounded-full bg-copper-400 inline-block shadow-[0_0_6px_rgba(245,158,11,0.8)]"></span>
                          )}
                        </div>

                        <h4 className={`text-xs font-bold leading-tight mb-1 truncate ${!item.isRead ? 'text-loft-50 font-semibold' : 'text-loft-300'}`}>
                          {item.title}
                        </h4>
                        <p className="text-xs text-loft-300 leading-snug line-clamp-2">
                          {item.message}
                        </p>
                      </div>

                      {/* Item Quick Mark Read Action */}
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity absolute right-3 top-3">
                        {!item.isRead && (
                          <button
                            onClick={(e) => handleMarkAsRead(item.id, e)}
                            className="p-1 rounded-md bg-loft-800 text-loft-400 hover:text-moss-400 hover:bg-loft-700 transition-colors"
                            title="Mark as read"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <span className="text-loft-500">
                          <ExternalLink className="w-3.5 h-3.5" />
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer Actions */}
            <div className="p-3 bg-loft-900 border-t border-loft-800 flex items-center justify-between text-xs">
              <button
                onClick={handleMarkAllAsRead}
                disabled={unreadCount === 0}
                className="flex items-center gap-1.5 text-copper-400 hover:text-copper-300 disabled:opacity-40 disabled:hover:text-copper-400 font-medium transition-colors cursor-pointer"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                Mark all as read
              </button>

              <button
                onClick={handleClearRead}
                className="flex items-center gap-1.5 text-loft-400 hover:text-red-400 font-medium transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Clear read
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default NotificationBell;

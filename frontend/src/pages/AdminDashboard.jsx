import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { useSelector } from 'react-redux';
import axios from 'axios';
import { io } from 'socket.io-client';
import { 
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, 
  CartesianGrid, Tooltip, BarChart, Bar, Cell 
} from 'recharts';
import { 
  BarChart3, Users, Truck, FileText, Settings, 
  ShieldAlert, Activity, DollarSign, Plus, Edit2, Trash2,
  MessageSquare, Send
} from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const CustomTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-loft-900 border border-loft-800 p-3 rounded-xl shadow-xl">
        <p className="text-xs text-loft-400 font-medium">{payload[0].payload.date}</p>
        <p className="text-sm font-bold text-copper-500 mt-1">₹{payload[0].value.toLocaleString()}</p>
      </div>
    );
  }
  return null;
};

const CustomRouteTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-loft-900 border border-loft-800 p-3 rounded-xl shadow-xl max-w-xs">
        <p className="text-xs text-loft-200 font-bold">{payload[0].payload.route}</p>
        <p className="text-sm font-semibold text-moss-500 mt-1">{payload[0].value} trips completed</p>
      </div>
    );
  }
  return null;
};

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const { user } = useSelector((state) => state.auth);
  const token = user?.token || localStorage.getItem('token');

  // Overview stats & list state
  const [stats, setStats] = useState({
    revenue: '₹0',
    activeDrivers: '0',
    totalVehicles: '0',
    totalCustomers: '0',
    activities: []
  });

  // Analytics states
  const [revenueData, setRevenueData] = useState([]);
  const [routeData, setRouteData] = useState([]);

  // Telematics State
  const [telemetry, setTelemetry] = useState(null);

  // CRUD state
  const [customers, setCustomers] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(false);

  // Chat Inbox states
  const [activeChats, setActiveChats] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null); // chat object
  const [chatMessages, setChatMessages] = useState([]);
  const [replyText, setReplyText] = useState('');
  const socketRef = useRef(null);
  const messagesEndRef = useRef(null);

  // Modal / Form state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState(''); // 'customer', 'driver', 'vehicle'
  const [editMode, setEditMode] = useState(false); // true for update, false for create
  const [currentItem, setCurrentItem] = useState(null); // item being edited
  const [deleteConfirm, setDeleteConfirm] = useState({ isOpen: false, type: '', id: null });

  // Form Fields
  const [customerForm, setCustomerForm] = useState({
    name: '', phone: '', email: '', city: '', state: '', address: '', isPhoneVerified: true, isProfileComplete: true
  });
  const [driverForm, setDriverForm] = useState({
    name: '', phone: '', email: '', licenseNumber: '', status: 'active'
  });
  const [vehicleForm, setVehicleForm] = useState({
    registrationNumber: '', type: 'small', model: '', capacityWeight: 1000, status: 'available'
  });
  const [adminForm, setAdminForm] = useState({
    name: '', email: '', role: 'Support Admin', password: ''
  });

  // Fetch API headers
  const getHeaders = () => ({
    headers: { Authorization: `Bearer ${token}` }
  });

  // Auto scroll in chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, selectedChat]);

  // Fetch Data based on active tab
  useEffect(() => {
    if (activeTab === 'overview' || activeTab === 'analytics') {
      fetchOverviewData();
    } else if (activeTab === 'users') {
      fetchCustomers();
    } else if (activeTab === 'drivers') {
      fetchDrivers();
    } else if (activeTab === 'vehicles') {
      fetchVehicles();
    }
  }, [activeTab]);

  // Selected chat ref to prevent stale closures in socket callbacks
  const selectedChatRef = useRef(selectedChat);
  useEffect(() => {
    selectedChatRef.current = selectedChat;
  }, [selectedChat]);

  // Admin Socket.io connection for Support Inbox
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

    const socket = io(API_BASE_URL, {
      auth: { token }
    });
    socketRef.current = socket;

    // Join admin inbox channel
    socket.emit('join_admin');

    socket.on('chat_list', (list) => {
      setActiveChats(list || []);
    });

    // Update active chats list in sidebar only — never overwrite active thread view
    socket.on('chat_list_update', (list) => {
      setActiveChats(list || []);
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
          // Avoid duplicate messages
          if (msg.id && prev.some(m => m.id === msg.id)) return prev;
          return [...prev, msg];
        });
      }
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [activeTab]);

  // Telematics Socket Connection
  useEffect(() => {
    if (activeTab !== 'telematics') return;
    
    const telemetrySocket = io(API_BASE_URL.replace('/api', ''), {
      withCredentials: true,
    });
    
    telemetrySocket.emit('join_admin_telemetry');
    
    telemetrySocket.on('telemetry_update', (data) => {
      setTelemetry(data);
    });

    return () => {
      telemetrySocket.emit('leave_admin_telemetry');
      telemetrySocket.disconnect();
    };
  }, [activeTab]);

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
    e.preventDefault();
    if (!replyText.trim() || !selectedChat || !socketRef.current) return;

    socketRef.current.emit('send_message', {
      customerId: selectedChat.customerId,
      sender: 'admin',
      text: replyText,
      name: 'Admin Support'
    });

    setReplyText('');
  };

  const fetchOverviewData = async () => {
    try {
      const statsRes = await axios.get(`${API_BASE_URL}/api/admin/stats/overview`, getHeaders());
      if (statsRes.data.success) {
        setStats(prev => ({
          ...prev,
          revenue: statsRes.data.stats.revenue,
          activeDrivers: statsRes.data.stats.activeDrivers,
          totalVehicles: statsRes.data.stats.totalVehicles,
          totalCustomers: statsRes.data.stats.totalCustomers,
          activities: [
            { time: '10:42 AM', event: 'New Booking Created', user: 'Rahul D.', status: 'Processing' },
            { time: '10:39 AM', event: 'Driver Offline (MH 12)', status: 'Completed', user: 'System' },
            { time: '10:30 AM', event: 'B2B Contract Signed', user: 'DMart', status: 'Success' },
            { time: '10:15 AM', event: 'Support Ticket Raised', user: 'Sneha K.', status: 'Pending' }
          ]
        }));
      }
      
      const revRes = await axios.get(`${API_BASE_URL}/api/admin/stats/revenue`, getHeaders());
      if (revRes.data.success) {
        setRevenueData(revRes.data.revenueData);
      }

      const routeRes = await axios.get(`${API_BASE_URL}/api/admin/stats/routes`, getHeaders());
      if (routeRes.data.success) {
        setRouteData(routeRes.data.routeData);
      }
    } catch (err) {
      console.error('Error fetching overview data:', err);
    }
  };

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_BASE_URL}/api/admin/customers`, getHeaders());
      if (res.data.success) {
        setCustomers(res.data.customers);
      }
    } catch (err) {
      console.error('Error fetching customers:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchDrivers = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_BASE_URL}/api/admin/drivers`, getHeaders());
      if (res.data.success) {
        setDrivers(res.data.drivers);
      }
    } catch (err) {
      console.error('Error fetching drivers:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchVehicles = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_BASE_URL}/api/admin/vehicles`, getHeaders());
      if (res.data.success) {
        setVehicles(res.data.vehicles);
      }
    } catch (err) {
      console.error('Error fetching vehicles:', err);
    } finally {
      setLoading(false);
    }
  };

  // --- CRUD Actions ---

  const handleOpenCreateModal = (type) => {
    setModalType(type);
    setEditMode(false);
    setCurrentItem(null);
    if (type === 'customer') {
      setCustomerForm({ name: '', phone: '', email: '', city: '', state: '', address: '', isPhoneVerified: true, isProfileComplete: true });
    } else if (type === 'driver') {
      setDriverForm({ name: '', phone: '', email: '', licenseNumber: '', status: 'active' });
    } else if (type === 'vehicle') {
      setVehicleForm({ registrationNumber: '', type: 'small', model: '', capacityWeight: 1000, status: 'available' });
    } else if (type === 'admin') {
      setAdminForm({ name: '', email: '', role: 'Support Admin', password: '' });
    }
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (type, item) => {
    setModalType(type);
    setEditMode(true);
    setCurrentItem(item);
    if (type === 'customer') {
      setCustomerForm({
        name: item.name || '',
        phone: item.phone || '',
        email: item.email || '',
        city: item.city || '',
        state: item.state || '',
        address: item.address || '',
        isPhoneVerified: item.isPhoneVerified ?? true,
        isProfileComplete: item.isProfileComplete ?? true
      });
    } else if (type === 'driver') {
      setDriverForm({
        name: item.name || '',
        phone: item.phone || '',
        email: item.email || '',
        licenseNumber: item.licenseNumber || '',
        status: item.status || 'active'
      });
    } else if (type === 'vehicle') {
      setVehicleForm({
        registrationNumber: item.registrationNumber || '',
        type: item.type || 'small',
        model: item.model || '',
        capacityWeight: item.capacityWeight || 1000,
        status: item.status || 'available'
      });
    } else if (type === 'admin') {
      setAdminForm({
        name: item.name || '',
        email: item.email || '',
        role: item.role || 'Support Admin',
        password: ''
      });
    }
    setIsModalOpen(true);
  };

  const handleDeleteItem = (type, id) => {
    setDeleteConfirm({ isOpen: true, type, id });
  };

  const executeDelete = async () => {
    const { type, id } = deleteConfirm;
    if (!type || !id) return;
    
    try {
      const endpoint = `${API_BASE_URL}/api/admin/${type === 'customer' ? 'customers' : type + 's'}/${id}`;
      const res = await axios.delete(endpoint, getHeaders());
      if (res.data.success) {
        setDeleteConfirm({ isOpen: false, type: '', id: null });
        if (type === 'customer') fetchCustomers();
        else if (type === 'driver') fetchDrivers();
        else if (type === 'vehicle') fetchVehicles();
      }
    } catch (err) {
      console.error(`Error deleting ${type}:`, err);
      alert(err.response?.data?.message || 'Delete operation failed');
      setDeleteConfirm({ isOpen: false, type: '', id: null });
    }
  };

  const handleSubmitForm = async (e) => {
    e.preventDefault();
    try {
      let endpoint = '';
      let method = 'post';
      let payload = {};

      if (modalType === 'customer') {
        endpoint = `${API_BASE_URL}/api/admin/customers`;
        payload = customerForm;
      } else if (modalType === 'driver') {
        endpoint = `${API_BASE_URL}/api/admin/drivers`;
        payload = driverForm;
      } else if (modalType === 'vehicle') {
        endpoint = `${API_BASE_URL}/api/admin/vehicles`;
        payload = vehicleForm;
      } else if (modalType === 'admin') {
        endpoint = `${API_BASE_URL}/api/admin/admins`;
        payload = adminForm;
      }

      if (editMode && currentItem) {
        endpoint += `/${currentItem.id}`;
        method = 'put';
      }

      const res = await axios[method](endpoint, payload, getHeaders());
      if (res.data.success) {
        alert(`${modalType} ${editMode ? 'updated' : 'created'} successfully`);
        setIsModalOpen(false);
        if (modalType === 'customer') fetchCustomers();
        else if (modalType === 'driver') fetchDrivers();
        else if (modalType === 'vehicle') fetchVehicles();
      }
    } catch (err) {
      console.error('Form submit error:', err);
      alert(err.response?.data?.message || 'Save operation failed');
    }
  };

  return (
    <div className="w-full pt-12 pb-24 relative min-h-screen bg-loft-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 flex flex-col md:flex-row gap-8">
        
        {/* Sidebar */}
        <div className="w-full md:w-64 flex-shrink-0">
          <div className="sticky top-28 bg-loft-900 border border-loft-800 rounded-2xl p-4">
            <div className="mb-8 px-4 py-2">
              <h2 className="text-xl font-bold text-loft-50 font-serif">Admin Control</h2>
              <p className="text-xs text-moss-500 font-bold uppercase tracking-wider">Superadmin</p>
            </div>
            
            <nav className="space-y-1">
              {[
                { id: 'overview', label: 'Overview', icon: Activity },
                { id: 'telematics', label: 'Fleet Telematics', icon: Activity },
                { id: 'users', label: 'Manage Users', icon: Users },
                { id: 'drivers', label: 'Manage Drivers', icon: ShieldAlert },
                { id: 'vehicles', label: 'Manage Vehicles', icon: Truck },
                { id: 'contracts', label: 'Contracts', icon: FileText },
                { id: 'analytics', label: 'Analytics', icon: BarChart3 },
                { id: 'chat', label: 'Support Inbox', icon: MessageSquare },
                { id: 'settings', label: 'Settings', icon: Settings },
              ].map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors text-sm font-medium cursor-pointer ${
                    activeTab === item.id 
                      ? 'bg-copper-500 text-white' 
                      : 'text-loft-300 hover:text-loft-50 hover:bg-loft-800'
                  }`}
                >
                  <item.icon className="w-5 h-5" />
                  {item.label}
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1">
          {activeTab === 'overview' && (
            <div className="space-y-8">
              <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold text-loft-50 font-serif">System Overview</h1>
                <div className="text-sm text-loft-400">Last updated: Just now</div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { label: 'Revenue (Today)', value: stats.revenue, icon: DollarSign, color: 'text-moss-500' },
                  { label: 'Active Drivers', value: stats.activeDrivers, icon: Truck, color: 'text-blue-500' },
                  { label: 'Total Vehicles', value: stats.totalVehicles, icon: FileText, color: 'text-copper-500' },
                  { label: 'Total Customers', value: stats.totalCustomers, icon: Users, color: 'text-red-500' }
                ].map((stat, idx) => (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    key={idx} 
                    className="card p-5 bg-loft-900 border-loft-800"
                  >
                    <div className="flex justify-between items-start mb-4">
                      <p className="text-loft-400 text-xs font-medium uppercase tracking-wider">{stat.label}</p>
                      <stat.icon className={`w-5 h-5 ${stat.color}`} />
                    </div>
                    <p className="text-2xl font-bold text-loft-50">{stat.value}</p>
                  </motion.div>
                ))}
              </div>

              {/* Graphs Container */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="card p-6 bg-loft-900 border-loft-800 h-80 flex flex-col justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-loft-50 font-serif">Revenue Trend</h3>
                    <p className="text-xs text-loft-400">Weekly platform transactions</p>
                  </div>
                  <div className="h-56 w-full mt-4">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={revenueData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <defs>
                          <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#e86331" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#e86331" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#2a2220" />
                        <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} tickLine={false} />
                        <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} />
                        <Tooltip content={<CustomTooltip />} />
                        <Area type="monotone" dataKey="revenue" stroke="#e86331" fillOpacity={1} fill="url(#colorRev)" strokeWidth={2} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="card p-6 bg-loft-900 border-loft-800 h-80 flex flex-col justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-loft-50 font-serif">Popular Routes</h3>
                    <p className="text-xs text-loft-400">Top 5 trip destinations</p>
                  </div>
                  <div className="h-56 w-full mt-4">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={routeData} layout="vertical" margin={{ top: 10, right: 10, left: 30, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#2c2420" horizontal={false} />
                        <XAxis type="number" stroke="#94a3b8" fontSize={11} />
                        <YAxis dataKey="route" type="category" stroke="#94a3b8" fontSize={10} width={120} tickLine={false} />
                        <Tooltip content={<CustomRouteTooltip />} />
                        <Bar dataKey="trips" fill="#229e64" radius={[0, 4, 4, 0]}>
                          {routeData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={index === 0 ? '#e86331' : '#229e64'} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
              
              {/* Recent Activity Table */}
              <div className="card bg-loft-900 border-loft-800 overflow-hidden">
                <div className="p-6 border-b border-loft-800 flex justify-between items-center">
                  <h3 className="text-lg font-bold text-loft-50">Live Platform Activity</h3>
                  <button className="text-copper-500 text-sm font-medium hover:text-copper-400">View All</button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm text-loft-300">
                    <thead className="bg-loft-950/50 text-xs uppercase font-medium">
                      <tr>
                        <th className="px-6 py-4">Time</th>
                        <th className="px-6 py-4">Event</th>
                        <th className="px-6 py-4">User/Driver</th>
                        <th className="px-6 py-4">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-loft-800">
                      {stats.activities.map((row, idx) => (
                        <tr key={idx} className="hover:bg-loft-800/50 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap">{row.time}</td>
                          <td className="px-6 py-4">{row.event}</td>
                          <td className="px-6 py-4 font-medium text-loft-200">{row.user}</td>
                          <td className="px-6 py-4">
                            <span className={`px-2 py-1 rounded text-xs font-bold ${
                              row.status === 'Success' || row.status === 'Completed' ? 'bg-moss-500/10 text-moss-500' :
                              row.status === 'Pending' ? 'bg-red-500/10 text-red-500' : 'bg-copper-500/10 text-copper-500'
                            }`}>
                              {row.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Telematics View */}
          {activeTab === 'telematics' && (
            <div className="space-y-8">
              <div className="flex justify-between items-center">
                <div>
                  <h1 className="text-3xl font-bold text-loft-50 font-serif">Live Fleet Telematics</h1>
                  <p className="text-sm text-loft-400 mt-1">Real-time IoT data stream from active vehicles.</p>
                </div>
                <div className="flex items-center gap-2 bg-moss-500/10 text-moss-500 px-4 py-2 rounded-full border border-moss-500/20">
                  <div className="w-2 h-2 rounded-full bg-moss-500 animate-pulse"></div>
                  <span className="text-xs font-bold uppercase tracking-wider">Live Connection Active</span>
                </div>
              </div>

              {!telemetry ? (
                <div className="card p-12 bg-loft-900 border-loft-800 text-center flex flex-col items-center justify-center">
                  <div className="w-12 h-12 rounded-full border-2 border-copper-500 border-t-transparent animate-spin mb-4"></div>
                  <h3 className="text-xl font-bold text-loft-50">Waiting for Telemetry Signal...</h3>
                  <p className="text-loft-400 mt-2">Connecting to vehicle OBD-II interfaces.</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Alert Banner */}
                  {telemetry.alert && (
                    <motion.div 
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-red-500/10 border border-red-500/50 p-4 rounded-xl flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <ShieldAlert className="w-6 h-6 text-red-500 animate-bounce" />
                        <div>
                          <h4 className="text-red-500 font-bold uppercase tracking-wider text-sm">Critical Alert Triggered</h4>
                          <p className="text-red-400 text-xs">Vehicle {telemetry.vehicleId} reported: {telemetry.alert}</p>
                        </div>
                      </div>
                      <span className="text-red-500 text-xs font-bold">{new Date(telemetry.timestamp).toLocaleTimeString()}</span>
                    </motion.div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Speedometer */}
                    <div className="card p-6 bg-loft-900 border-loft-800 relative overflow-hidden">
                      <div className="absolute -right-4 -top-4 w-24 h-24 bg-blue-500/10 rounded-full blur-2xl"></div>
                      <p className="text-loft-400 text-xs font-bold uppercase tracking-wider mb-4">Current Speed</p>
                      <div className="flex items-end gap-2">
                        <span className="text-5xl font-bold text-loft-50 font-serif">{telemetry.speed}</span>
                        <span className="text-loft-400 mb-1 font-medium">km/h</span>
                      </div>
                      <div className="w-full bg-loft-950 h-2 mt-6 rounded-full overflow-hidden">
                        <motion.div 
                          className={`h-full ${telemetry.speed > 60 ? 'bg-red-500' : 'bg-blue-500'}`}
                          animate={{ width: `${Math.min(100, (telemetry.speed / 120) * 100)}%` }}
                          transition={{ type: 'spring', bounce: 0 }}
                        />
                      </div>
                    </div>

                    {/* RPM */}
                    <div className="card p-6 bg-loft-900 border-loft-800 relative overflow-hidden">
                      <div className="absolute -right-4 -top-4 w-24 h-24 bg-purple-500/10 rounded-full blur-2xl"></div>
                      <p className="text-loft-400 text-xs font-bold uppercase tracking-wider mb-4">Engine RPM</p>
                      <div className="flex items-end gap-2">
                        <span className="text-5xl font-bold text-loft-50 font-serif">{telemetry.rpm}</span>
                        <span className="text-loft-400 mb-1 font-medium">rpm</span>
                      </div>
                      <div className="w-full bg-loft-950 h-2 mt-6 rounded-full overflow-hidden">
                        <motion.div 
                          className="h-full bg-purple-500"
                          animate={{ width: `${Math.min(100, (telemetry.rpm / 6000) * 100)}%` }}
                          transition={{ type: 'spring', bounce: 0 }}
                        />
                      </div>
                    </div>

                    {/* Engine Temp */}
                    <div className="card p-6 bg-loft-900 border-loft-800 relative overflow-hidden">
                      <div className="absolute -right-4 -top-4 w-24 h-24 bg-copper-500/10 rounded-full blur-2xl"></div>
                      <p className="text-loft-400 text-xs font-bold uppercase tracking-wider mb-4">Engine Temp</p>
                      <div className="flex items-end gap-2">
                        <span className={`text-5xl font-bold font-serif ${telemetry.engineTemp > 95 ? 'text-red-500' : 'text-loft-50'}`}>
                          {telemetry.engineTemp}
                        </span>
                        <span className="text-loft-400 mb-1 font-medium">°C</span>
                      </div>
                      <div className="w-full bg-loft-950 h-2 mt-6 rounded-full overflow-hidden">
                        <motion.div 
                          className={`h-full ${telemetry.engineTemp > 95 ? 'bg-red-500' : 'bg-copper-500'}`}
                          animate={{ width: `${Math.min(100, (telemetry.engineTemp / 120) * 100)}%` }}
                          transition={{ type: 'spring', bounce: 0 }}
                        />
                      </div>
                    </div>

                    {/* Fuel Level */}
                    <div className="card p-6 bg-loft-900 border-loft-800 relative overflow-hidden">
                      <div className="absolute -right-4 -top-4 w-24 h-24 bg-moss-500/10 rounded-full blur-2xl"></div>
                      <p className="text-loft-400 text-xs font-bold uppercase tracking-wider mb-4">Fuel Level</p>
                      <div className="flex items-end gap-2">
                        <span className={`text-5xl font-bold font-serif ${telemetry.fuelLevel < 20 ? 'text-red-500' : 'text-loft-50'}`}>
                          {telemetry.fuelLevel}
                        </span>
                        <span className="text-loft-400 mb-1 font-medium">%</span>
                      </div>
                      <div className="w-full bg-loft-950 h-2 mt-6 rounded-full overflow-hidden">
                        <motion.div 
                          className={`h-full ${telemetry.fuelLevel < 20 ? 'bg-red-500' : 'bg-moss-500'}`}
                          animate={{ width: `${telemetry.fuelLevel}%` }}
                          transition={{ type: 'spring', bounce: 0 }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Dedicated Analytics View */}
          {activeTab === 'analytics' && (
            <div className="space-y-8">
              <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold text-loft-50 font-serif">Business Analytics</h1>
                <button 
                  onClick={fetchOverviewData}
                  className="btn-secondary py-2 px-4 text-sm font-semibold rounded-xl cursor-pointer"
                >
                  Refresh Reports
                </button>
              </div>

              <div className="grid grid-cols-1 gap-8">
                <div className="card p-8 bg-loft-900 border-loft-800">
                  <h3 className="text-xl font-bold text-loft-50 font-serif mb-2">Revenue Growth</h3>
                  <p className="text-sm text-loft-400 mb-6">Detailed transaction analytics across standard billing dates.</p>
                  <div className="h-96 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={revenueData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                        <defs>
                          <linearGradient id="colorRevFull" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#e86331" stopOpacity={0.4}/>
                            <stop offset="95%" stopColor="#e86331" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#2a2220" />
                        <XAxis dataKey="date" stroke="#94a3b8" fontSize={12} />
                        <YAxis stroke="#94a3b8" fontSize={12} />
                        <Tooltip content={<CustomTooltip />} />
                        <Area type="monotone" dataKey="revenue" stroke="#e86331" fillOpacity={1} fill="url(#colorRevFull)" strokeWidth={3} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="card p-8 bg-loft-900 border-loft-800">
                  <h3 className="text-xl font-bold text-loft-50 font-serif mb-2">Popular Route Traffic</h3>
                  <p className="text-sm text-loft-400 mb-6">Visual volume representation of peak-loaded routes.</p>
                  <div className="h-96 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={routeData} layout="vertical" margin={{ top: 10, right: 20, left: 40, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#2c2420" horizontal={false} />
                        <XAxis type="number" stroke="#94a3b8" fontSize={12} />
                        <YAxis dataKey="route" type="category" stroke="#94a3b8" fontSize={11} width={150} tickLine={false} />
                        <Tooltip content={<CustomRouteTooltip />} />
                        <Bar dataKey="trips" fill="#229e64" radius={[0, 6, 6, 0]} barSize={24}>
                          {routeData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={index === 0 ? '#e86331' : '#229e64'} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Manage Users Tab */}
          {activeTab === 'users' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold text-loft-50 font-serif">Manage Users</h1>
                <button 
                  onClick={() => handleOpenCreateModal('customer')}
                  className="btn-primary flex items-center gap-2 py-2 px-4 text-sm font-semibold rounded-xl cursor-pointer"
                >
                  <Plus className="w-4 h-4" /> Add User
                </button>
              </div>

              <div className="card bg-loft-900 border-loft-800 overflow-hidden">
                {loading ? (
                  <div className="p-12 text-center text-loft-400">Loading customers...</div>
                ) : customers.length === 0 ? (
                  <div className="p-12 text-center text-loft-400">No users found.</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-loft-300">
                      <thead className="bg-loft-950/50 text-xs uppercase font-medium">
                        <tr>
                          <th className="px-6 py-4">Name</th>
                          <th className="px-6 py-4">Phone</th>
                          <th className="px-6 py-4">Email</th>
                          <th className="px-6 py-4">City</th>
                          <th className="px-6 py-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-loft-800">
                        {customers.map((cust) => (
                          <tr key={cust.id} className="hover:bg-loft-800/50 transition-colors">
                            <td className="px-6 py-4 font-medium text-loft-100">{cust.name || 'N/A'}</td>
                            <td className="px-6 py-4">{cust.phone || 'N/A'}</td>
                            <td className="px-6 py-4">{cust.email || 'N/A'}</td>
                            <td className="px-6 py-4">{cust.city || 'N/A'}</td>
                            <td className="px-6 py-4 text-right flex justify-end gap-2">
                              <button 
                                onClick={() => handleOpenEditModal('customer', cust)}
                                className="p-2 text-loft-400 hover:text-copper-500 rounded-lg hover:bg-loft-800 transition-colors"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button 
                                onClick={() => handleDeleteItem('customer', cust.id)}
                                className="p-2 text-loft-400 hover:text-red-500 rounded-lg hover:bg-loft-800 transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Manage Drivers Tab */}
          {activeTab === 'drivers' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold text-loft-50 font-serif">Manage Drivers</h1>
                <button 
                  onClick={() => handleOpenCreateModal('driver')}
                  className="btn-primary flex items-center gap-2 py-2 px-4 text-sm font-semibold rounded-xl cursor-pointer"
                >
                  <Plus className="w-4 h-4" /> Add Driver
                </button>
              </div>

              <div className="card bg-loft-900 border-loft-800 overflow-hidden">
                {loading ? (
                  <div className="p-12 text-center text-loft-400">Loading drivers...</div>
                ) : drivers.length === 0 ? (
                  <div className="p-12 text-center text-loft-400">No drivers found.</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-loft-300">
                      <thead className="bg-loft-950/50 text-xs uppercase font-medium">
                        <tr>
                          <th className="px-6 py-4">Name</th>
                          <th className="px-6 py-4">Phone</th>
                          <th className="px-6 py-4">License Number</th>
                          <th className="px-6 py-4">Status</th>
                          <th className="px-6 py-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-loft-800">
                        {drivers.map((drv) => (
                          <tr key={drv.id} className="hover:bg-loft-800/50 transition-colors">
                            <td className="px-6 py-4 font-medium text-loft-100">{drv.name}</td>
                            <td className="px-6 py-4">{drv.phone}</td>
                            <td className="px-6 py-4">{drv.licenseNumber}</td>
                            <td className="px-6 py-4">
                              <span className={`px-2 py-1 rounded text-xs font-bold capitalize ${
                                drv.status === 'active' ? 'bg-moss-500/10 text-moss-500' :
                                drv.status === 'on_trip' ? 'bg-copper-500/10 text-copper-500' : 'bg-loft-700 text-loft-400'
                              }`}>
                                {drv.status.replace('_', ' ')}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-right flex justify-end gap-2">
                              <button 
                                onClick={() => handleOpenEditModal('driver', drv)}
                                className="p-2 text-loft-400 hover:text-copper-500 rounded-lg hover:bg-loft-800 transition-colors"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button 
                                onClick={() => handleDeleteItem('driver', drv.id)}
                                className="p-2 text-loft-400 hover:text-red-500 rounded-lg hover:bg-loft-800 transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Manage Vehicles Tab */}
          {activeTab === 'vehicles' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold text-loft-50 font-serif">Manage Vehicles</h1>
                <button 
                  onClick={() => handleOpenCreateModal('vehicle')}
                  className="btn-primary flex items-center gap-2 py-2 px-4 text-sm font-semibold rounded-xl cursor-pointer"
                >
                  <Plus className="w-4 h-4" /> Add Vehicle
                </button>
              </div>

              <div className="card bg-loft-900 border-loft-800 overflow-hidden">
                {loading ? (
                  <div className="p-12 text-center text-loft-400">Loading vehicles...</div>
                ) : vehicles.length === 0 ? (
                  <div className="p-12 text-center text-loft-400">No vehicles found.</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-loft-300">
                      <thead className="bg-loft-950/50 text-xs uppercase font-medium">
                        <tr>
                          <th className="px-6 py-4">Reg Number</th>
                          <th className="px-6 py-4">Type</th>
                          <th className="px-6 py-4">Model</th>
                          <th className="px-6 py-4">Weight (kg)</th>
                          <th className="px-6 py-4">Status</th>
                          <th className="px-6 py-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-loft-800">
                        {vehicles.map((vh) => (
                          <tr key={vh.id} className="hover:bg-loft-800/50 transition-colors">
                            <td className="px-6 py-4 font-medium text-loft-100">{vh.registrationNumber}</td>
                            <td className="px-6 py-4 capitalize">{vh.type}</td>
                            <td className="px-6 py-4">{vh.model || 'N/A'}</td>
                            <td className="px-6 py-4">{vh.capacityWeight}</td>
                            <td className="px-6 py-4">
                              <span className={`px-2 py-1 rounded text-xs font-bold capitalize ${
                                vh.status === 'available' ? 'bg-moss-500/10 text-moss-500' :
                                vh.status === 'on_trip' ? 'bg-copper-500/10 text-copper-500' : 'bg-red-500/10 text-red-500'
                              }`}>
                                {vh.status.replace('_', ' ')}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-right flex justify-end gap-2">
                              <button 
                                onClick={() => handleOpenEditModal('vehicle', vh)}
                                className="p-2 text-loft-400 hover:text-copper-500 rounded-lg hover:bg-loft-800 transition-colors"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button 
                                onClick={() => handleDeleteItem('vehicle', vh.id)}
                                className="p-2 text-loft-400 hover:text-red-500 rounded-lg hover:bg-loft-800 transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Support Inbox Tab (Phase 3) */}
          {activeTab === 'chat' && (
            <div className="space-y-6 h-[75vh] flex flex-col">
              <h1 className="text-3xl font-bold text-loft-50 font-serif">Support Inbox</h1>

              <div className="flex-grow flex bg-loft-900 border border-loft-800 rounded-2xl overflow-hidden min-h-0">
                {/* Left pane: Active Chat list */}
                <div className="w-1/3 border-r border-loft-800 flex flex-col">
                  <div className="p-4 border-b border-loft-800">
                    <p className="text-xs font-bold text-loft-400 uppercase tracking-wider">Active Conversations</p>
                  </div>
                  <div className="flex-1 overflow-y-auto divide-y divide-loft-800/40">
                    {activeChats.length === 0 ? (
                      <div className="p-8 text-center text-loft-400 text-xs">No active tickets.</div>
                    ) : (
                      activeChats.map((chat) => {
                        const isSelected = selectedChat?.customerId === chat.customerId;
                        const lastMsg = chat.messages[chat.messages.length - 1];
                        return (
                          <button
                            key={chat.customerId}
                            onClick={() => selectChatRoom(chat)}
                            className={`w-full text-left p-4 hover:bg-loft-800/50 transition-colors block cursor-pointer ${
                              isSelected ? 'bg-loft-800 border-l-4 border-copper-500' : ''
                            }`}
                          >
                            <p className="font-bold text-loft-100 text-sm truncate">{chat.customerName}</p>
                            <p className="text-xs text-loft-400 truncate mt-1">
                              {lastMsg ? `${lastMsg.name}: ${lastMsg.text}` : 'No messages yet'}
                            </p>
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* Right pane: Message details */}
                <div className="flex-1 flex flex-col bg-loft-950/20">
                  {selectedChat ? (
                    <>
                      {/* Chat Header */}
                      <div className="p-4 border-b border-loft-800 flex items-center justify-between bg-loft-950/40">
                        <div>
                          <p className="font-bold text-loft-50 font-serif text-sm">{selectedChat.customerName}</p>
                          <p className="text-[10px] text-moss-500 font-bold uppercase tracking-wider">Room: {selectedChat.customerId.split('-')[0]}</p>
                        </div>
                      </div>

                      {/* Chat Messages */}
                      <div className="flex-grow p-6 overflow-y-auto space-y-4 flex flex-col min-h-0">
                        {chatMessages.map((msg, index) => {
                          const isMe = msg.sender === 'admin';
                          return (
                            <div
                              key={index}
                              className={`max-w-[70%] rounded-2xl p-3 text-xs leading-relaxed ${
                                isMe
                                  ? 'bg-copper-500 text-white self-end rounded-tr-none'
                                  : 'bg-loft-900 text-loft-100 border border-loft-800 self-start rounded-tl-none'
                              }`}
                            >
                              <p className="font-bold mb-0.5 text-[9px] opacity-75">
                                {isMe ? 'You' : msg.name || 'Customer'}
                              </p>
                              <p className="whitespace-pre-wrap">{msg.text}</p>
                              <span className="block text-[8px] opacity-50 mt-1 text-right">
                                {msg.time}
                              </span>
                            </div>
                          );
                        })}
                        <div ref={messagesEndRef} />
                      </div>

                      {/* Chat Input */}
                      <form onSubmit={handleSendReply} className="p-4 border-t border-loft-800 bg-loft-900 flex gap-3">
                        <input
                          type="text"
                          placeholder="Type your response..."
                          className="flex-1 input-field py-3 text-xs"
                          value={replyText}
                          onChange={(e) => setReplyText(e.target.value)}
                        />
                        <button
                          type="submit"
                          disabled={!replyText.trim()}
                          className="btn-primary p-3 rounded-xl disabled:opacity-50 cursor-pointer"
                        >
                          <Send className="w-5 h-5" />
                        </button>
                      </form>
                    </>
                  ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-loft-400 text-sm">
                      <MessageSquare className="w-12 h-12 text-loft-800 mb-3" />
                      Select a conversation to start chatting in real-time.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Contracts Tab (Placeholder) */}
          {activeTab === 'contracts' && (
             <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="card p-24 bg-loft-900 text-center flex flex-col items-center justify-center border-dashed border-loft-800/80">
              <h3 className="text-2xl font-bold text-loft-200 mb-2 capitalize">Contracts Management</h3>
              <p className="text-loft-400 max-w-md">CRUD operations for contracts will be implemented here connected to the Node.js backend.</p>
            </motion.div>
          )}

          {/* Settings Tab - Roles and Permissions */}
          {activeTab === 'settings' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold text-loft-50 font-serif">Roles & Permissions</h1>
                <button 
                  onClick={() => handleOpenCreateModal('admin')}
                  className="btn-primary flex items-center gap-2 py-2 px-4 text-sm font-semibold rounded-xl cursor-pointer"
                >
                  <Plus className="w-4 h-4" /> Add Admin
                </button>
              </div>

              <div className="card bg-loft-900 border-loft-800 overflow-hidden">
                <div className="p-6 border-b border-loft-800">
                  <h3 className="text-lg font-bold text-loft-50">Admin Users</h3>
                  <p className="text-sm text-loft-400">Manage dashboard access and role-based permissions.</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm text-loft-300">
                    <thead className="bg-loft-950/50 text-xs uppercase font-medium">
                      <tr>
                        <th className="px-6 py-4">Name</th>
                        <th className="px-6 py-4">Email</th>
                        <th className="px-6 py-4">Role</th>
                        <th className="px-6 py-4">Last Login</th>
                        <th className="px-6 py-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-loft-800">
                      {[
                        { name: 'Super Admin', email: 'admin@eminence.com', role: 'Superadmin', login: 'Just now' },
                        { name: 'Priya Sharma', email: 'priya.s@eminence.com', role: 'Finance Admin', login: '2 hrs ago' },
                        { name: 'Rohan Gupta', email: 'rohan.g@eminence.com', role: 'Support Admin', login: '1 day ago' },
                      ].map((admin, idx) => (
                        <tr key={idx} className="hover:bg-loft-800/50 transition-colors">
                          <td className="px-6 py-4 font-medium text-loft-100 flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-copper-500/20 text-copper-500 flex items-center justify-center font-bold">
                              {admin.name.charAt(0)}
                            </div>
                            {admin.name}
                          </td>
                          <td className="px-6 py-4">{admin.email}</td>
                          <td className="px-6 py-4">
                            <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                              admin.role === 'Superadmin' ? 'bg-moss-500/20 text-moss-500 border border-moss-500/30' :
                              admin.role === 'Finance Admin' ? 'bg-blue-500/20 text-blue-500 border border-blue-500/30' :
                              'bg-copper-500/20 text-copper-500 border border-copper-500/30'
                            }`}>
                              {admin.role}
                            </span>
                          </td>
                          <td className="px-6 py-4">{admin.login}</td>
                          <td className="px-6 py-4 text-right flex justify-end gap-2">
                            <button className="p-2 text-loft-400 hover:text-copper-500 rounded-lg hover:bg-loft-800 transition-colors">
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button className="p-2 text-loft-400 hover:text-red-500 rounded-lg hover:bg-loft-800 transition-colors" disabled={admin.role === 'Superadmin'}>
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
                <div className="card p-6 bg-loft-900 border-loft-800">
                  <h4 className="text-moss-500 font-bold mb-2 flex items-center gap-2"><ShieldAlert className="w-5 h-5"/> Superadmin</h4>
                  <p className="text-loft-400 text-sm">Full access to all modules, settings, user management, and financials.</p>
                </div>
                <div className="card p-6 bg-loft-900 border-loft-800">
                  <h4 className="text-blue-500 font-bold mb-2 flex items-center gap-2"><DollarSign className="w-5 h-5"/> Finance Admin</h4>
                  <p className="text-loft-400 text-sm">Access to invoices, business contracts, and overall revenue analytics.</p>
                </div>
                <div className="card p-6 bg-loft-900 border-loft-800">
                  <h4 className="text-copper-500 font-bold mb-2 flex items-center gap-2"><MessageSquare className="w-5 h-5"/> Support Admin</h4>
                  <p className="text-loft-400 text-sm">Limited to the Support Inbox, tracking active trips, and driver management.</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* CRUD Modal Dialog */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-loft-900 border border-loft-800 rounded-2xl max-w-md w-full p-8 relative z-50 shadow-2xl">
            <h2 className="text-2xl font-bold text-loft-50 mb-6 font-serif capitalize">
              {editMode ? 'Edit' : 'Add'} {modalType}
            </h2>

            <form onSubmit={handleSubmitForm} className="space-y-4">
              
              {/* Customer Form Fields */}
              {modalType === 'customer' && (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-loft-300 uppercase tracking-wider mb-2">Name</label>
                    <input 
                      type="text" 
                      required
                      className="input-field" 
                      value={customerForm.name}
                      onChange={(e) => setCustomerForm({ ...customerForm, name: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-loft-300 uppercase tracking-wider mb-2">Phone</label>
                    <input 
                      type="text" 
                      required
                      className="input-field" 
                      value={customerForm.phone}
                      onChange={(e) => setCustomerForm({ ...customerForm, phone: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-loft-300 uppercase tracking-wider mb-2">Email</label>
                    <input 
                      type="email" 
                      className="input-field" 
                      value={customerForm.email}
                      onChange={(e) => setCustomerForm({ ...customerForm, email: e.target.value })}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-loft-300 uppercase tracking-wider mb-2">City</label>
                      <input 
                        type="text" 
                        className="input-field" 
                        value={customerForm.city}
                        onChange={(e) => setCustomerForm({ ...customerForm, city: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-loft-300 uppercase tracking-wider mb-2">State</label>
                      <input 
                        type="text" 
                        className="input-field" 
                        value={customerForm.state}
                        onChange={(e) => setCustomerForm({ ...customerForm, state: e.target.value })}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-loft-300 uppercase tracking-wider mb-2">Address</label>
                    <textarea 
                      rows="2"
                      className="input-field py-2" 
                      value={customerForm.address}
                      onChange={(e) => setCustomerForm({ ...customerForm, address: e.target.value })}
                    />
                  </div>
                </>
              )}

              {/* Driver Form Fields */}
              {modalType === 'driver' && (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-loft-300 uppercase tracking-wider mb-2">Name</label>
                    <input 
                      type="text" 
                      required
                      className="input-field" 
                      value={driverForm.name}
                      onChange={(e) => setDriverForm({ ...driverForm, name: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-loft-300 uppercase tracking-wider mb-2">Phone</label>
                    <input 
                      type="text" 
                      required
                      className="input-field" 
                      value={driverForm.phone}
                      onChange={(e) => setDriverForm({ ...driverForm, phone: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-loft-300 uppercase tracking-wider mb-2">Email</label>
                    <input 
                      type="email" 
                      className="input-field" 
                      value={driverForm.email}
                      onChange={(e) => setDriverForm({ ...driverForm, email: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-loft-300 uppercase tracking-wider mb-2">License Number</label>
                    <input 
                      type="text" 
                      required
                      className="input-field" 
                      value={driverForm.licenseNumber}
                      onChange={(e) => setDriverForm({ ...driverForm, licenseNumber: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-loft-300 uppercase tracking-wider mb-2">Status</label>
                    <select 
                      className="input-field py-3 bg-loft-950" 
                      value={driverForm.status}
                      onChange={(e) => setDriverForm({ ...driverForm, status: e.target.value })}
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                      <option value="on_trip">On Trip</option>
                    </select>
                  </div>
                </>
              )}

              {/* Vehicle Form Fields */}
              {modalType === 'vehicle' && (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-loft-300 uppercase tracking-wider mb-2">Registration Number</label>
                    <input 
                      type="text" 
                      required
                      className="input-field" 
                      value={vehicleForm.registrationNumber}
                      onChange={(e) => setVehicleForm({ ...vehicleForm, registrationNumber: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-loft-300 uppercase tracking-wider mb-2">Model</label>
                    <input 
                      type="text" 
                      className="input-field" 
                      value={vehicleForm.model}
                      onChange={(e) => setVehicleForm({ ...vehicleForm, model: e.target.value })}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-loft-300 uppercase tracking-wider mb-2">Type</label>
                      <select 
                        className="input-field py-3 bg-loft-950" 
                        value={vehicleForm.type}
                        onChange={(e) => setVehicleForm({ ...vehicleForm, type: e.target.value })}
                      >
                        <option value="small">Small</option>
                        <option value="medium">Medium</option>
                        <option value="large">Large</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-loft-300 uppercase tracking-wider mb-2">Capacity (kg)</label>
                      <input 
                        type="number" 
                        required
                        className="input-field" 
                        value={vehicleForm.capacityWeight}
                        onChange={(e) => setVehicleForm({ ...vehicleForm, capacityWeight: parseInt(e.target.value) || 0 })}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-loft-300 uppercase tracking-wider mb-2">Status</label>
                    <select 
                      className="input-field py-3 bg-loft-950" 
                      value={vehicleForm.status}
                      onChange={(e) => setVehicleForm({ ...vehicleForm, status: e.target.value })}
                    >
                      <option value="available">Available</option>
                      <option value="maintenance">Maintenance</option>
                      <option value="on_trip">On Trip</option>
                    </select>
                  </div>
                </>
              )}

              {/* Admin Form Fields */}
              {modalType === 'admin' && (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-loft-300 uppercase tracking-wider mb-2">Name</label>
                    <input 
                      type="text" 
                      required
                      className="input-field" 
                      value={adminForm.name}
                      onChange={(e) => setAdminForm({ ...adminForm, name: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-loft-300 uppercase tracking-wider mb-2">Email</label>
                    <input 
                      type="email" 
                      required
                      className="input-field" 
                      value={adminForm.email}
                      onChange={(e) => setAdminForm({ ...adminForm, email: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-loft-300 uppercase tracking-wider mb-2">
                      {editMode ? 'Reset Password (optional)' : 'Password'}
                    </label>
                    <input 
                      type="password" 
                      required={!editMode}
                      className="input-field" 
                      value={adminForm.password}
                      onChange={(e) => setAdminForm({ ...adminForm, password: e.target.value })}
                      placeholder={editMode ? 'Leave blank to keep current' : 'Enter temporary password'}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-loft-300 uppercase tracking-wider mb-2">Role</label>
                    <select 
                      className="input-field py-3 bg-loft-950" 
                      value={adminForm.role}
                      onChange={(e) => setAdminForm({ ...adminForm, role: e.target.value })}
                    >
                      <option value="Superadmin">Superadmin</option>
                      <option value="Finance Admin">Finance Admin</option>
                      <option value="Support Admin">Support Admin</option>
                    </select>
                  </div>
                </>
              )}

              {/* Form Buttons */}
              <div className="flex justify-end gap-3 pt-6 border-t border-loft-800">
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2.5 bg-transparent border border-loft-700 hover:bg-loft-800 text-loft-300 rounded-xl text-sm font-semibold transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="btn-primary py-2.5 px-5 text-sm font-semibold rounded-xl cursor-pointer"
                >
                  Save Changes
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm.isOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-loft-900 border border-loft-800 rounded-2xl max-w-sm w-full p-6 relative z-50 shadow-2xl text-center">
            <div className="w-16 h-16 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-bold text-loft-50 mb-2 font-serif capitalize">
              Delete {deleteConfirm.type}
            </h2>
            <p className="text-loft-400 text-sm mb-6">
              Are you sure you want to delete this {deleteConfirm.type}? This action cannot be undone.
            </p>
            <div className="flex justify-center gap-3">
              <button 
                onClick={() => setDeleteConfirm({ isOpen: false, type: '', id: null })}
                className="px-5 py-2.5 bg-transparent border border-loft-700 hover:bg-loft-800 text-loft-300 rounded-xl text-sm font-semibold transition-all cursor-pointer flex-1"
              >
                Cancel
              </button>
              <button 
                onClick={executeDelete}
                className="px-5 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-xl text-sm font-semibold transition-all cursor-pointer flex-1"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;

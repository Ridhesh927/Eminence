import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Navigation, Wallet, AlertTriangle, CheckCircle, Clock, MapPin, Fuel, TrendingUp, Map } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import axios from 'axios';
import { io } from 'socket.io-client';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const DriverDashboard = () => {
  const [activeTab, setActiveTab] = useState('today');
  const [isOnline, setIsOnline] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [socket, setSocket] = useState(null);
  const [heatmapData, setHeatmapData] = useState(null);
  
  // WMS Scanning State
  const [scanResult, setScanResult] = useState(null);
  const [isScanning, setIsScanning] = useState(false);

  // Navigation State
  const [isNavigating, setIsNavigating] = useState(false);
  const [activeRide, setActiveRide] = useState(null);
  const [driverPos, setDriverPos] = useState({ lat: 18.5204, lng: 73.8567 });

  useEffect(() => {
    const newSocket = io(API_BASE_URL.replace('/api', ''), {
      withCredentials: true,
    });
    setSocket(newSocket);
    
    newSocket.on('ride_request', (data) => {
      if (isOnline && !isNavigating) {
        setActiveRide({
          bookingId: data.bookingId || 'BKG-NEW',
          fare: data.estimatedFare || 450,
          distance: data.distance || '8.2 km',
          duration: data.duration || '25 Mins',
          pickup: data.pickupAddress || '123 Market Street, Viman Nagar',
          dropoff: data.dropAddress || '456 Industrial Area, Hinjewadi'
        });
      }
    });

    return () => {
      newSocket.off('ride_request');
      newSocket.disconnect();
    };
  }, [isOnline, isNavigating]);

  // Simulate GPS movement
  useEffect(() => {
    if (isNavigating && activeRide && socket) {
      const interval = setInterval(() => {
        setDriverPos(prev => {
          const newPos = { lat: prev.lat + 0.001, lng: prev.lng + 0.001 };
          socket.emit('driver:location_update', {
            bookingId: activeRide.bookingId,
            lat: newPos.lat,
            lng: newPos.lng
          });
          return newPos;
        });
      }, 2000);
      return () => clearInterval(interval);
    }
  }, [isNavigating, activeRide, socket]);

  // Mock Earnings Data
  const weeklyEarnings = [
    { day: 'Mon', amount: 850 },
    { day: 'Tue', amount: 1200 },
    { day: 'Wed', amount: 950 },
    { day: 'Thu', amount: 1500 },
    { day: 'Fri', amount: 2100 },
    { day: 'Sat', amount: 1800 },
    { day: 'Sun', amount: 1250 },
  ];

  const toggleAvailability = async () => {
    setIsLoading(true);
    setTimeout(() => {
      setIsOnline(!isOnline);
      setIsLoading(false);
    }, 500);
  };

  const handleAcceptTrip = async () => {
    try {
      // Note: Assuming driver ID is managed via token on backend
      await axios.put(`${API_BASE_URL}/api/bookings/${activeRide.bookingId}/status`, 
        { status: 'driver_assigned' },
        { withCredentials: true } // or use token from Redux if available
      );
    } catch (err) {
      console.error('Error accepting trip:', err);
    }
    setIsNavigating(true);
  };

  const handleDeclineTrip = async () => {
    try {
      await axios.put(`${API_BASE_URL}/api/bookings/${activeRide.bookingId}/status`, 
        { status: 'rejected' }, // Depending on your state machine
        { withCredentials: true }
      );
    } catch (err) {
      console.error('Error declining trip:', err);
    }
    setActiveRide(null);
  };

  const handleFinishTrip = () => {
    setIsNavigating(false);
  };

  useEffect(() => {
    if (activeTab === 'heatmap') {
      const fetchHeatmap = async () => {
        try {
          const res = await axios.get(`${API_BASE_URL}/api/drivers/heatmap`, {
            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
          });
          if (res.data.success) {
            setHeatmapData(res.data.data);
          }
        } catch (err) {
          console.error("Error fetching heatmap", err);
        }
      };
      fetchHeatmap();
    }
  }, [activeTab]);

  return (
    <div className="w-full pt-12 pb-24 relative min-h-[80vh]">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-[radial-gradient(ellipse_at_center,rgba(85,108,145,0.1),transparent_70%)] pointer-events-none z-0"></div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Header */}
        <div className="mb-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <button 
              onClick={toggleAvailability}
              disabled={isLoading || isNavigating}
              className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full border mb-3 font-bold tracking-wide text-xs transition-colors shadow-lg cursor-pointer ${isOnline ? 'border-moss-500/30 bg-moss-500/15 text-moss-400 shadow-moss-500/20 hover:bg-moss-500/25' : 'border-loft-600/30 bg-loft-800/50 text-loft-400 shadow-none hover:bg-loft-700/50'}`}
            >
              <span className={`w-2.5 h-2.5 rounded-full ${isOnline ? 'bg-moss-500 animate-pulse' : 'bg-loft-500'}`}></span> 
              {isOnline ? 'ONLINE - RECEIVING TRIPS' : 'OFFLINE'}
            </button>
            <h1 className="text-3xl md:text-4xl font-serif font-bold text-loft-50 mb-2">Driver Portal</h1>
            <p className="text-loft-300">Welcome, Ramesh Kumar (MH 12 AB 1234)</p>
          </div>
          <button className="btn-primary py-2.5 px-6 shadow-[0_0_20px_rgba(232,99,49,0.2)] bg-red-600/20 text-red-500 border-red-500/50 hover:bg-red-600/30 hover:border-red-500">
            <AlertTriangle className="w-5 h-5 mr-2" /> SOS / Emergency
          </button>
        </div>
        
        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Today\'s Earnings', value: '₹1,250', icon: Wallet, color: 'text-copper-500', bg: 'bg-copper-500/10' },
            { label: 'Completed Trips', value: '4', icon: CheckCircle, color: 'text-moss-500', bg: 'bg-moss-500/10' },
            { label: 'Online Hours', value: '5.2 hrs', icon: Clock, color: 'text-blue-500', bg: 'bg-blue-500/10' },
            { label: 'Rating', value: '4.8 ⭐', icon: Navigation, color: 'text-yellow-500', bg: 'bg-yellow-500/10' },
          ].map((stat, idx) => (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              key={idx} 
              className="card p-5 flex items-center gap-4"
            >
              <div className={`w-12 h-12 rounded-full flex items-center justify-center ${stat.bg} ${stat.color}`}>
                <stat.icon className="w-6 h-6" />
              </div>
              <div>
                <p className="text-loft-400 text-xs font-medium uppercase tracking-wider mb-1">{stat.label}</p>
                <p className="text-xl font-bold text-loft-50">{stat.value}</p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Tab Navigation */}
        <div className="flex space-x-2 border-b border-loft-800 mb-8 overflow-x-auto hide-scrollbar">
          {['today', 'heatmap', 'wms', 'earnings', 'completed'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              disabled={isNavigating && tab !== 'today'}
              className={`px-6 py-3 font-medium text-sm rounded-t-lg transition-colors whitespace-nowrap capitalize ${
                activeTab === tab
                  ? 'bg-copper-500/15 text-copper-300 border-b-2 border-copper-500'
                  : 'text-loft-400 hover:text-loft-200 hover:bg-loft-900/50 disabled:opacity-50 disabled:cursor-not-allowed'
              }`}
            >
              {tab === 'today' ? "Active Trip" : tab === 'heatmap' ? 'Surge Map' : tab === 'wms' ? 'WMS Scanner' : tab}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="min-h-[400px]">
          
          {/* TAB 1: ACTIVE TRIP & NAVIGATION */}
          {activeTab === 'today' && (
            <AnimatePresence mode="wait">
              {!isNavigating ? (
                <motion.div key="request" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="space-y-4">
                  <h3 className="text-xl font-bold text-loft-50 mb-4 flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-copper-500 animate-pulse"></span>
                    New Ride Request
                  </h3>
                  
                  <div className="card p-6 border border-copper-500/50 shadow-[0_0_30px_rgba(232,99,49,0.1)] relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-copper-500/10 rounded-bl-full pointer-events-none"></div>
                    
                    <div className="flex justify-between items-start mb-6 relative z-10">
                      <div>
                        <span className="bg-copper-500 text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider mb-3 inline-block">Surge 1.5x</span>
                        <p className="text-4xl font-bold text-loft-50">₹{activeRide?.fare || 450}</p>
                        <p className="text-copper-400 text-sm font-medium">Est. Fare (Online Payment)</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-loft-50 text-xl">{activeRide?.distance || '8.2 km'}</p>
                        <p className="text-loft-400 text-sm">{activeRide?.duration || '25 Mins'}</p>
                      </div>
                    </div>

                    <div className="relative pl-6 space-y-6 mb-8 border-t border-loft-800 pt-6">
                      <div className="absolute left-2.5 top-8 bottom-2 w-px bg-loft-800"></div>
                      <div className="relative">
                        <div className="absolute -left-[29px] top-0.5 w-4 h-4 rounded-full bg-moss-500 border-4 border-loft-900"></div>
                        <p className="text-sm font-bold text-loft-200">Pickup (4 mins away)</p>
                        <p className="text-sm text-loft-400">123 Market Street, Viman Nagar</p>
                      </div>
                      <div className="relative">
                        <div className="absolute -left-[29px] top-0.5 w-4 h-4 rounded-full bg-copper-500 border-4 border-loft-900"></div>
                        <p className="text-sm font-bold text-loft-200">Drop-off</p>
                        <p className="text-sm text-loft-400">{activeRide?.dropoff || '456 Industrial Area, Hinjewadi'}</p>
                      </div>
                    </div>

                    <div className="flex gap-4 relative z-10">
                      <button onClick={handleDeclineTrip} className="btn-secondary w-1/3">Decline</button>
                      <button onClick={handleAcceptTrip} className="btn-primary w-2/3 py-4 text-lg animate-pulse shadow-[0_0_15px_rgba(232,99,49,0.4)]">Accept Trip</button>
                    </div>
                  </div>
                </motion.div>
              ) : (
                <motion.div key="nav" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col md:flex-row gap-6">
                  {/* Map Mock */}
                  <div className="flex-1 card overflow-hidden relative min-h-[400px] border-copper-500/30">
                    <div className="absolute inset-0 bg-[#0f1219] bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-20 z-0"></div>
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-sm h-full max-h-[300px]">
                      {/* CSS Mock Route Line */}
                      <svg className="w-full h-full text-copper-500 overflow-visible" viewBox="0 0 100 100" preserveAspectRatio="none">
                        <path d="M10,90 Q40,40 50,20 T90,10" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" className="animate-pulse" />
                        <circle cx="90" cy="10" r="5" fill="#e86331" />
                        {/* Truck Mock */}
                        <g transform="translate(45,28) rotate(-30)">
                          <rect width="14" height="20" rx="2" fill="#fff" />
                          <rect width="14" height="5" rx="1" fill="#888" y="15" />
                        </g>
                      </svg>
                    </div>
                    {/* Floating Info */}
                    <div className="absolute top-4 left-4 right-4 bg-moss-500 text-white rounded-xl p-4 shadow-xl z-10 flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <Navigation className="w-8 h-8 text-white rotate-45" />
                        <div>
                          <h4 className="font-bold text-xl">In 200m, Turn Left</h4>
                          <p className="text-white/80">onto Nagar Road (Highway 5)</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <h4 className="font-bold text-xl">8.2 km</h4>
                        <p className="text-white/80">25 min</p>
                      </div>
                    </div>
                  </div>
                  
                  {/* Trip Controls */}
                  <div className="w-full md:w-80 space-y-4">
                    <div className="card p-6 border-moss-500/20">
                      <h4 className="text-moss-400 font-bold mb-4 uppercase tracking-wider text-sm">Trip Details</h4>
                      <div className="space-y-4">
                        <div>
                          <p className="text-loft-400 text-xs">Customer Name</p>
                          <p className="font-bold text-loft-50">Rahul Sharma</p>
                        </div>
                        <div>
                          <p className="text-loft-400 text-xs">Goods</p>
                          <p className="font-bold text-loft-50">Furniture (400kg)</p>
                        </div>
                        <div className="pt-4 border-t border-loft-800">
                          <button onClick={handleFinishTrip} className="w-full bg-moss-500 hover:bg-moss-400 text-white font-bold py-4 rounded-xl shadow-[0_0_20px_rgba(16,185,129,0.3)] transition-colors">
                            Complete Trip & Collect Fare
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          )}

          {/* TAB 2: SURGE HEATMAP */}
          {activeTab === 'heatmap' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="card overflow-hidden p-0 border border-copper-500/20">
              <div className="p-6 border-b border-loft-800 flex justify-between items-center bg-loft-950">
                <div>
                  <h3 className="text-xl font-bold text-loft-50">Surge Pricing Heatmap</h3>
                  <p className="text-loft-400 text-sm">Drive to highlighted areas to earn up to 2.5x fare.</p>
                </div>
                <div className="flex gap-2">
                  <span className="flex items-center gap-1 text-xs text-loft-300"><span className="w-3 h-3 rounded-full bg-red-500"></span> 2.0x+</span>
                  <span className="flex items-center gap-1 text-xs text-loft-300"><span className="w-3 h-3 rounded-full bg-orange-500"></span> 1.5x</span>
                  <span className="flex items-center gap-1 text-xs text-loft-300"><span className="w-3 h-3 rounded-full bg-yellow-500"></span> 1.2x</span>
                </div>
              </div>
              
              <div className="relative h-[500px] bg-[#1a1e26] w-full flex items-center justify-center overflow-hidden">
                {/* Simulated Map Background */}
                <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cartographer.png')]"></div>
                
                {heatmapData && heatmapData.hotspots.map((spot, index) => {
                  const colors = {
                    'High': 'red',
                    'Medium': 'orange',
                    'Low': 'yellow'
                  };
                  const color = colors[spot.intensity];
                  
                  // Using randomized fixed positions for simulation since we don't have a real map canvas here
                  const positions = [
                    { top: '25%', left: '25%' },
                    { bottom: '33%', right: '25%' },
                    { top: '50%', left: '50%' },
                    { top: '10%', right: '10%' }
                  ];
                  const pos = positions[index % positions.length];

                  return (
                    <div key={spot.id} className="absolute" style={pos}>
                      <div className={`w-48 h-48 bg-${color}-500/40 rounded-full blur-3xl mix-blend-screen animate-pulse`}></div>
                      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                        <MapPin className="text-white w-8 h-8 drop-shadow-lg mb-1" />
                        <span className={`bg-${color}-600 text-white font-bold text-xs px-2 py-1 rounded shadow-lg`}>
                          {spot.surgeMultiplier}x {spot.name}
                        </span>
                      </div>
                    </div>
                  );
                })}
                
                <div className="absolute bottom-6 right-6">
                  <button className="bg-loft-800 text-white p-3 rounded-full shadow-lg border border-loft-700 hover:bg-loft-700">
                    <Map className="w-6 h-6 text-copper-400" />
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {/* TAB: WMS SCANNER */}
          {activeTab === 'wms' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-2xl mx-auto space-y-6">
              <div className="card p-8 border border-moss-500/30 text-center">
                <h3 className="text-2xl font-bold text-loft-50 mb-2">Warehouse Barcode Scanner</h3>
                <p className="text-loft-400 mb-8">Scan inventory QR codes to update the digital manifest automatically.</p>
                
                <div className="relative w-full max-w-sm mx-auto aspect-square bg-[#0a0c10] rounded-2xl border-2 border-dashed border-loft-700 overflow-hidden flex flex-col items-center justify-center">
                  {isScanning ? (
                    <div className="absolute inset-0 bg-black/50 z-10 flex flex-col items-center justify-center">
                      <div className="w-48 h-1 bg-moss-500 rounded-full animate-[bounce_2s_infinite]"></div>
                      <p className="text-moss-400 mt-4 font-bold animate-pulse">Scanning...</p>
                    </div>
                  ) : null}
                  
                  {/* Mock Camera View */}
                  <div className="absolute inset-4 border-2 border-copper-500/50 rounded-xl pointer-events-none">
                    <div className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-copper-500 rounded-tl-lg"></div>
                    <div className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-copper-500 rounded-tr-lg"></div>
                    <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-copper-500 rounded-bl-lg"></div>
                    <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-copper-500 rounded-br-lg"></div>
                  </div>
                  <AlertTriangle className="w-12 h-12 text-loft-700 mb-4" />
                  <p className="text-loft-600 font-medium">Camera Feed Simulated</p>
                </div>
                
                <button 
                  onClick={() => {
                    setIsScanning(true);
                    setScanResult(null);
                    setTimeout(async () => {
                      try {
                        const res = await axios.post(`${API_BASE_URL}/api/drivers/scan-inventory`, { barcode: 'MOCK-BOX-001' }, {
                          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
                        });
                        setIsScanning(false);
                        setScanResult(res.data.item);
                      } catch (err) {
                        setIsScanning(false);
                      }
                    }, 2000);
                  }}
                  disabled={isScanning}
                  className="btn-primary mt-8 py-3 px-8 text-lg disabled:opacity-50"
                >
                  Simulate QR Scan
                </button>
              </div>

              {scanResult && (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="card p-6 bg-moss-500/10 border-moss-500/30 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-moss-500 rounded-full flex items-center justify-center">
                      <CheckCircle className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h4 className="text-moss-400 font-bold uppercase tracking-wider text-sm">Scan Successful</h4>
                      <p className="text-loft-50 font-medium">{scanResult.itemName} ({scanResult.barcode})</p>
                    </div>
                  </div>
                  <span className="bg-moss-500 text-white px-3 py-1 rounded-full text-xs font-bold uppercase">{scanResult.status}</span>
                </motion.div>
              )}
            </motion.div>
          )}

          {/* TAB 3: EARNINGS ANALYTICS */}
          {activeTab === 'earnings' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
              
              {/* Earnings Summary */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="card p-6 border-l-4 border-l-copper-500">
                  <p className="text-loft-400 text-sm mb-1 font-medium flex items-center gap-2"><Wallet className="w-4 h-4"/> Weekly Total</p>
                  <p className="text-3xl font-bold text-loft-50">₹9,650</p>
                  <p className="text-moss-400 text-sm mt-2 flex items-center gap-1"><TrendingUp className="w-3 h-3"/> +12% vs last week</p>
                </div>
                <div className="card p-6 border-l-4 border-l-moss-500">
                  <p className="text-loft-400 text-sm mb-1 font-medium flex items-center gap-2"><CheckCircle className="w-4 h-4"/> Trips Completed</p>
                  <p className="text-3xl font-bold text-loft-50">32</p>
                  <p className="text-loft-400 text-sm mt-2">Target: 40 trips</p>
                </div>
                <div className="card p-6 border-l-4 border-l-red-500">
                  <p className="text-loft-400 text-sm mb-1 font-medium flex items-center gap-2"><Fuel className="w-4 h-4"/> Est. Fuel Expense</p>
                  <p className="text-3xl font-bold text-loft-50">₹2,100</p>
                  <p className="text-loft-400 text-sm mt-2">~22% of revenue</p>
                </div>
              </div>

              {/* Chart */}
              <div className="card p-6">
                <h3 className="text-lg font-bold text-loft-50 mb-6">Earnings Breakdown (Current Week)</h3>
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={weeklyEarnings} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: '#77849e', fontSize: 12 }} dy={10} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fill: '#77849e', fontSize: 12 }} tickFormatter={(val) => `₹${val}`} />
                      <Tooltip 
                        cursor={{ fill: '#1a1e26' }}
                        contentStyle={{ backgroundColor: '#0b0d12', borderColor: '#222939', borderRadius: '8px', color: '#fff' }}
                        itemStyle={{ color: '#e86331', fontWeight: 'bold' }}
                        formatter={(value) => [`₹${value}`, 'Earnings']}
                      />
                      <Bar dataKey="amount" fill="#e86331" radius={[4, 4, 0, 0]} maxBarSize={40} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'completed' && (
             <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="card p-12 text-center flex flex-col items-center justify-center border-dashed border-loft-800/80">
              <h3 className="text-xl font-bold text-loft-200 mb-2 capitalize">Trip History</h3>
              <p className="text-loft-400 max-w-md">Your past completed trips will appear here.</p>
            </motion.div>
          )}
        </div>

      </div>
    </div>
  );
};

export default DriverDashboard;

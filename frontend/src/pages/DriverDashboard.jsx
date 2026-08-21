import { useState } from 'react';
import { motion } from 'framer-motion';
import { Navigation, Wallet, AlertTriangle, CheckCircle, Clock } from 'lucide-react';

const DriverDashboard = () => {
  const [activeTab, setActiveTab] = useState('today');

  return (
    <div className="w-full pt-12 pb-24 relative min-h-[80vh]">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-[radial-gradient(ellipse_at_center,rgba(85,108,145,0.1),transparent_70%)] pointer-events-none z-0"></div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Header */}
        <div className="mb-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-moss-500/20 bg-moss-500/10 text-moss-400 mb-2 font-medium tracking-wide text-xs">
              <span className="w-2 h-2 rounded-full bg-moss-500"></span> ONLINE
            </div>
            <h1 className="text-3xl md:text-4xl font-serif font-bold text-loft-50 mb-2">Driver Portal</h1>
            <p className="text-loft-300">Welcome, Ramesh Kumar (MH 12 AB 1234)</p>
          </div>
          <button className="btn-primary py-2.5 px-6 shadow-[0_0_20px_rgba(232,99,49,0.2)]">
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
          {['today', 'navigation', 'completed', 'earnings', 'fuel', 'vehicle'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-3 font-medium text-sm rounded-t-lg transition-colors whitespace-nowrap capitalize ${
                activeTab === tab
                  ? 'bg-copper-500/15 text-copper-300 border-b-2 border-copper-500'
                  : 'text-loft-400 hover:text-loft-200 hover:bg-loft-900/50'
              }`}
            >
              {tab === 'today' ? "Today's Trips" : tab}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="min-h-[400px]">
          {activeTab === 'today' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
              
              <h3 className="text-xl font-bold text-loft-50 mb-4">Active Request</h3>
              
              <div className="card p-6 border border-copper-500/50 shadow-[0_0_30px_rgba(232,99,49,0.1)] relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-copper-500/10 rounded-bl-full pointer-events-none"></div>
                
                <div className="flex justify-between items-start mb-6 relative z-10">
                  <div>
                    <span className="bg-copper-500 text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider mb-3 inline-block">New Booking</span>
                    <p className="text-3xl font-bold text-loft-50">₹450</p>
                    <p className="text-loft-400 text-sm">Est. Fare (Cash)</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-loft-50">8.2 km</p>
                    <p className="text-loft-400 text-sm">Total Distance</p>
                  </div>
                </div>

                <div className="relative pl-6 space-y-6 mb-8 border-t border-loft-800 pt-6">
                  <div className="absolute left-2.5 top-8 bottom-2 w-px bg-loft-800"></div>
                  
                  <div className="relative">
                    <div className="absolute -left-[29px] top-0.5 w-4 h-4 rounded-full bg-moss-500 border-4 border-loft-900"></div>
                    <p className="text-sm font-bold text-loft-200">Pickup</p>
                    <p className="text-sm text-loft-400">123 Market Street, Viman Nagar</p>
                  </div>
                  
                  <div className="relative">
                    <div className="absolute -left-[29px] top-0.5 w-4 h-4 rounded-full bg-copper-500 border-4 border-loft-900"></div>
                    <p className="text-sm font-bold text-loft-200">Drop</p>
                    <p className="text-sm text-loft-400">456 Industrial Area, Hinjewadi</p>
                  </div>
                </div>

                <div className="flex gap-4 relative z-10">
                  <button className="btn-secondary w-1/3">Decline</button>
                  <button className="btn-primary w-2/3">Accept Trip</button>
                </div>
              </div>

            </motion.div>
          )}

          {activeTab !== 'today' && (
             <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="card p-12 text-center flex flex-col items-center justify-center border-dashed border-loft-800/80">
              <h3 className="text-xl font-bold text-loft-200 mb-2 capitalize">{activeTab}</h3>
              <p className="text-loft-400 max-w-md">This section is currently under development.</p>
            </motion.div>
          )}
        </div>

      </div>
    </div>
  );
};

export default DriverDashboard;

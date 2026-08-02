import { useState } from 'react';
import { useSelector } from 'react-redux';
import { Package, CheckCircle, Wallet, MapPin, Plus, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const CustomerDashboard = () => {
  const { user } = useSelector((state) => state.auth);
  const [activeTab, setActiveTab] = useState('history');
  const [isAddAddressOpen, setIsAddAddressOpen] = useState(false);

  return (
    <div className="w-full pt-12 pb-24 relative min-h-[80vh]">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-[radial-gradient(ellipse_at_center,rgba(85,108,145,0.1),transparent_70%)] pointer-events-none z-0"></div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Header */}
        <div className="mb-10">
          <h1 className="text-3xl md:text-4xl font-serif font-bold text-loft-50 mb-2">Dashboard</h1>
          <p className="text-loft-300">Welcome back, <span className="text-copper-400 font-medium">{user?.name || 'User'}</span>!</p>
        </div>
        
        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {[
            { label: 'Total Bookings', value: '12', icon: Package },
            { label: 'Completed Rides', value: '10', icon: CheckCircle },
            { label: 'Total Spent', value: '₹4,250', icon: Wallet },
          ].map((stat, idx) => (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              key={idx} 
              className="card p-6 flex items-center justify-between"
            >
              <div>
                <p className="text-loft-400 text-sm font-medium uppercase tracking-wider mb-1">{stat.label}</p>
                <p className="text-3xl font-bold text-loft-50">{stat.value}</p>
              </div>
              <div className="w-12 h-12 bg-loft-800 rounded-full flex items-center justify-center text-copper-500">
                <stat.icon className="w-6 h-6" />
              </div>
            </motion.div>
          ))}
        </div>

        {/* Tab Navigation */}
        <div className="flex space-x-2 border-b border-loft-800 mb-8 overflow-x-auto hide-scrollbar">
          <button
            onClick={() => setActiveTab('history')}
            className={`px-6 py-3 font-medium text-sm rounded-t-lg transition-colors whitespace-nowrap ${
              activeTab === 'history'
                ? 'bg-copper-500/15 text-copper-300 border-b-2 border-copper-500'
                : 'text-loft-400 hover:text-loft-200 hover:bg-loft-900/50'
            }`}
          >
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Booking History
            </div>
          </button>
          <button
            onClick={() => setActiveTab('addresses')}
            className={`px-6 py-3 font-medium text-sm rounded-t-lg transition-colors whitespace-nowrap ${
              activeTab === 'addresses'
                ? 'bg-copper-500/15 text-copper-300 border-b-2 border-copper-500'
                : 'text-loft-400 hover:text-loft-200 hover:bg-loft-900/50'
            }`}
          >
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              Saved Addresses
            </div>
          </button>
        </div>

        {/* Tab Content */}
        <div className="min-h-[300px]">
          {activeTab === 'history' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="card p-12 text-center flex flex-col items-center justify-center border-dashed border-loft-800/80"
            >
              <Package className="w-12 h-12 text-loft-600 mb-4" />
              <h3 className="text-xl font-bold text-loft-200 mb-2">No recent bookings</h3>
              <p className="text-loft-400 max-w-md">You haven't booked any tempos recently. When you do, your history will appear here.</p>
            </motion.div>
          )}

          {activeTab === 'addresses' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-loft-50">Your Addresses</h3>
                <button 
                  onClick={() => setIsAddAddressOpen(true)}
                  className="btn-secondary py-2 px-4 text-sm"
                >
                  <Plus className="w-4 h-4 mr-2" /> Add Address
                </button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="card p-6 border-l-4 border-l-copper-500">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-bold text-loft-50 mb-1">Home</h4>
                      <p className="text-loft-300 text-sm leading-relaxed">
                        123 Main Street, Apt 4B<br/>
                        Pune, Maharashtra 411001
                      </p>
                    </div>
                    <div className="p-2 bg-loft-800 rounded-lg text-copper-500">
                      <MapPin className="w-5 h-5" />
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </div>

      </div>

      {/* Add Address Modal (Mock) */}
      <AnimatePresence>
        {isAddAddressOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-loft-950/80 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="card w-full max-w-md p-6"
            >
              <h3 className="text-xl font-bold text-loft-50 mb-6">Add New Address</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-loft-200 mb-1">Label (e.g. Home, Office)</label>
                  <input type="text" className="input-field" placeholder="Enter label" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-loft-200 mb-1">Street Address</label>
                  <textarea className="input-field resize-none h-24" placeholder="Enter full address"></textarea>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-loft-200 mb-1">City</label>
                    <input type="text" className="input-field" placeholder="Pune" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-loft-200 mb-1">Postal Code</label>
                    <input type="text" className="input-field" placeholder="411001" />
                  </div>
                </div>
              </div>
              
              <div className="flex gap-4 mt-8">
                <button 
                  onClick={() => setIsAddAddressOpen(false)}
                  className="btn-secondary w-full"
                >
                  Cancel
                </button>
                <button 
                  onClick={() => setIsAddAddressOpen(false)}
                  className="btn-primary w-full"
                >
                  Save Address
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default CustomerDashboard;

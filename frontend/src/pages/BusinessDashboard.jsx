import { useState } from 'react';
import { motion } from 'framer-motion';
import { Building2, FileText, Truck, Users, CreditCard, HeadphonesIcon } from 'lucide-react';

const BusinessDashboard = () => {
  const [activeTab, setActiveTab] = useState('overview');

  return (
    <div className="w-full pt-12 pb-24 relative min-h-[80vh]">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-[radial-gradient(ellipse_at_center,rgba(85,108,145,0.1),transparent_70%)] pointer-events-none z-0"></div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Header */}
        <div className="mb-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-copper-500/20 bg-copper-500/10 text-copper-400 mb-2 font-medium tracking-wide text-xs uppercase">
              Contract Client
            </div>
            <h1 className="text-3xl md:text-4xl font-serif font-bold text-loft-50 mb-2">Business Portal</h1>
            <p className="text-loft-300">Reliance Smart - Magarpatta Branch</p>
          </div>
          <button className="btn-primary py-2.5 px-6">
            <Truck className="w-4 h-4 mr-2" /> Request Extra Vehicle
          </button>
        </div>
        
        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Active Contracts', value: '2', icon: FileText, color: 'text-moss-500', bg: 'bg-moss-500/10' },
            { label: 'Trips this Month', value: '142', icon: Truck, color: 'text-copper-500', bg: 'bg-copper-500/10' },
            { label: 'Dedicated Drivers', value: '3', icon: Users, color: 'text-blue-500', bg: 'bg-blue-500/10' },
            { label: 'Pending Invoice', value: '₹45,200', icon: CreditCard, color: 'text-red-500', bg: 'bg-red-500/10' },
          ].map((stat, idx) => (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              key={idx} 
              className="card p-5 flex items-center gap-4 border-l-4"
              style={{ borderLeftColor: stat.color.replace('text-', 'var(--') + ')' }} // Hacky mock border color
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
          {['overview', 'contracts', 'trips', 'invoices', 'fleet', 'support'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-3 font-medium text-sm rounded-t-lg transition-colors whitespace-nowrap capitalize ${
                activeTab === tab
                  ? 'bg-copper-500/15 text-copper-300 border-b-2 border-copper-500'
                  : 'text-loft-400 hover:text-loft-200 hover:bg-loft-900/50'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="min-h-[400px]">
          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              {/* Active Contract Info */}
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="md:col-span-2 space-y-6">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="text-xl font-bold text-loft-50">Active Contracts</h3>
                </div>
                
                {[
                  { id: 'CTR-8892-A', type: 'Daily Routine (Morning)', vehicle: 'Large Truck (Eicher 14ft)', driver: 'Suresh M.' },
                  { id: 'CTR-8892-B', type: 'Ad-hoc Warehouse Transfer', vehicle: 'Medium Tempo (Bolero)', driver: 'Amit P.' }
                ].map((contract, idx) => (
                  <div key={idx} className="card p-6 border border-loft-800 flex flex-col md:flex-row justify-between md:items-center gap-4">
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        <span className="font-mono text-sm text-copper-400 bg-copper-500/10 px-2 py-0.5 rounded">{contract.id}</span>
                        <span className="text-xs bg-moss-500/10 text-moss-500 px-2 py-0.5 rounded uppercase font-bold">Active</span>
                      </div>
                      <h4 className="text-lg font-bold text-loft-50 mb-1">{contract.type}</h4>
                      <p className="text-loft-400 text-sm">{contract.vehicle} &bull; Driver: {contract.driver}</p>
                    </div>
                    <div>
                      <button className="text-sm font-medium text-copper-500 hover:text-copper-400 border border-copper-500/30 px-4 py-2 rounded-lg transition-colors">
                        View Details
                      </button>
                    </div>
                  </div>
                ))}
              </motion.div>
              
              {/* Dedicated Manager */}
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="card p-6 h-fit bg-gradient-to-b from-loft-900 to-loft-950">
                <h3 className="text-lg font-bold text-loft-50 mb-6 flex items-center gap-2">
                  <HeadphonesIcon className="w-5 h-5 text-copper-500" /> Dedicated Manager
                </h3>
                
                <div className="flex flex-col items-center text-center mb-6">
                  <div className="w-20 h-20 bg-loft-800 rounded-full mb-3 flex items-center justify-center text-3xl border border-copper-500/30">
                    👩‍💼
                  </div>
                  <h4 className="font-bold text-loft-50 text-lg">Priya Sharma</h4>
                  <p className="text-loft-400 text-sm">Key Account Manager</p>
                </div>
                
                <div className="space-y-3 w-full">
                  <a href="tel:+919876543211" className="w-full flex items-center justify-center gap-2 bg-copper-500 hover:bg-copper-600 text-white py-2 rounded-lg transition-colors text-sm font-bold">
                    Call Priya
                  </a>
                  <button className="w-full flex items-center justify-center gap-2 bg-loft-800 hover:bg-loft-700 text-loft-200 py-2 rounded-lg transition-colors text-sm font-medium">
                    Send Email
                  </button>
                </div>
              </motion.div>

            </div>
          )}

          {activeTab !== 'overview' && (
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

export default BusinessDashboard;

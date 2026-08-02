import { useState } from 'react';
import { motion } from 'framer-motion';
import { BarChart3, Users, Truck, FileText, Settings, ShieldAlert, Activity, DollarSign } from 'lucide-react';

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState('overview');

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
                { id: 'users', label: 'Manage Users', icon: Users },
                { id: 'drivers', label: 'Manage Drivers', icon: ShieldAlert },
                { id: 'vehicles', label: 'Manage Vehicles', icon: Truck },
                { id: 'contracts', label: 'Contracts', icon: FileText },
                { id: 'analytics', label: 'Analytics', icon: BarChart3 },
                { id: 'settings', label: 'Settings', icon: Settings },
              ].map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors text-sm font-medium ${
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
                  { label: 'Revenue (Today)', value: '₹1,24,500', icon: DollarSign, color: 'text-moss-500' },
                  { label: 'Active Drivers', value: '342', icon: Truck, color: 'text-blue-500' },
                  { label: 'Pending Contracts', value: '14', icon: FileText, color: 'text-copper-500' },
                  { label: 'Support Tickets', value: '28', icon: ShieldAlert, color: 'text-red-500' }
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

              {/* Graphs Placeholder */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="card p-6 bg-loft-900 border-loft-800 h-80 flex flex-col items-center justify-center border-dashed">
                  <BarChart3 className="w-12 h-12 text-loft-700 mb-4" />
                  <h3 className="text-lg font-bold text-loft-200">Revenue Chart (Mock)</h3>
                  <p className="text-sm text-loft-400">Will render Recharts/Chart.js here</p>
                </div>
                <div className="card p-6 bg-loft-900 border-loft-800 h-80 flex flex-col items-center justify-center border-dashed">
                  <Activity className="w-12 h-12 text-loft-700 mb-4" />
                  <h3 className="text-lg font-bold text-loft-200">Peak Hours Analysis</h3>
                  <p className="text-sm text-loft-400">Will render heatmap here</p>
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
                      {[
                        { time: '10:42 AM', event: 'New Booking Created', user: 'Rahul D.', status: 'Processing' },
                        { time: '10:39 AM', event: 'Driver Offline', user: 'MH 12 XY 9981', status: 'Completed' },
                        { time: '10:30 AM', event: 'B2B Contract Signed', user: 'DMart (Kalyani Nagar)', status: 'Success' },
                        { time: '10:15 AM', event: 'Support Ticket Raised', user: 'Sneha K.', status: 'Pending' }
                      ].map((row, idx) => (
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

          {activeTab !== 'overview' && (
             <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="card p-24 bg-loft-900 text-center flex flex-col items-center justify-center border-dashed border-loft-800/80">
              <h3 className="text-2xl font-bold text-loft-200 mb-2 capitalize">{activeTab} Management</h3>
              <p className="text-loft-400 max-w-md">CRUD operations for {activeTab} will be implemented here connected to the Node.js backend.</p>
            </motion.div>
          )}
        </div>
        
      </div>
    </div>
  );
};

export default AdminDashboard;

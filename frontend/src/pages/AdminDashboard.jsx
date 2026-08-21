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

          {activeTab === 'users' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-loft-50 font-serif">Manage Users</h2>
                <button className="btn-primary text-sm py-2">Add New User</button>
              </div>
              <div className="card bg-loft-900 border-loft-800 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm text-loft-300">
                    <thead className="bg-loft-950/50 text-xs uppercase font-medium">
                      <tr>
                        <th className="px-6 py-4">Name</th>
                        <th className="px-6 py-4">Phone</th>
                        <th className="px-6 py-4">Total Bookings</th>
                        <th className="px-6 py-4">Status</th>
                        <th className="px-6 py-4">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-loft-800">
                      {[
                        { name: 'Rahul Deshmukh', phone: '+91 9876543210', bookings: 12, status: 'Active' },
                        { name: 'Sneha Kulkarni', phone: '+91 9876543211', bookings: 5, status: 'Active' },
                        { name: 'Amit Patil', phone: '+91 9876543212', bookings: 24, status: 'Inactive' }
                      ].map((user, idx) => (
                        <tr key={idx} className="hover:bg-loft-800/50 transition-colors">
                          <td className="px-6 py-4 font-medium text-loft-200">{user.name}</td>
                          <td className="px-6 py-4">{user.phone}</td>
                          <td className="px-6 py-4">{user.bookings}</td>
                          <td className="px-6 py-4">
                            <span className={`px-2 py-1 rounded text-xs font-bold ${
                              user.status === 'Active' ? 'bg-moss-500/10 text-moss-500' : 'bg-red-500/10 text-red-500'
                            }`}>
                              {user.status}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <button className="text-copper-500 hover:text-copper-400 font-medium text-xs mr-3">Edit</button>
                            <button className="text-red-500 hover:text-red-400 font-medium text-xs">Block</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'drivers' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-loft-50 font-serif">Manage Drivers</h2>
                <button className="btn-primary text-sm py-2">Onboard Driver</button>
              </div>
              <div className="card bg-loft-900 border-loft-800 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm text-loft-300">
                    <thead className="bg-loft-950/50 text-xs uppercase font-medium">
                      <tr>
                        <th className="px-6 py-4">Driver Name</th>
                        <th className="px-6 py-4">Vehicle No.</th>
                        <th className="px-6 py-4">Rating</th>
                        <th className="px-6 py-4">Status</th>
                        <th className="px-6 py-4">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-loft-800">
                      {[
                        { name: 'Suresh Kumar', vehicle: 'MH 12 AB 1234', rating: '4.8', status: 'On Trip' },
                        { name: 'Ramesh Singh', vehicle: 'MH 14 XY 9876', rating: '4.5', status: 'Available' },
                        { name: 'Vikram Jadhav', vehicle: 'MH 12 CD 5678', rating: '4.9', status: 'Offline' }
                      ].map((driver, idx) => (
                        <tr key={idx} className="hover:bg-loft-800/50 transition-colors">
                          <td className="px-6 py-4 font-medium text-loft-200">{driver.name}</td>
                          <td className="px-6 py-4">{driver.vehicle}</td>
                          <td className="px-6 py-4">⭐ {driver.rating}</td>
                          <td className="px-6 py-4">
                            <span className={`px-2 py-1 rounded text-xs font-bold ${
                              driver.status === 'Available' ? 'bg-moss-500/10 text-moss-500' :
                              driver.status === 'On Trip' ? 'bg-copper-500/10 text-copper-500' : 'bg-loft-500/10 text-loft-400'
                            }`}>
                              {driver.status}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <button className="text-copper-500 hover:text-copper-400 font-medium text-xs mr-3">View Profile</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'contracts' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-loft-50 font-serif">Receipts & Contracts</h2>
                <div className="flex gap-2">
                  <button className="btn-secondary text-sm py-2">Export CSV</button>
                  <button className="btn-primary text-sm py-2">Generate Receipt</button>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                 <div className="card p-4 bg-loft-900 border-l-4 border-l-moss-500">
                   <p className="text-loft-400 text-xs font-medium uppercase mb-1">Total Collected</p>
                   <p className="text-2xl font-bold text-loft-50">₹45,200</p>
                 </div>
                 <div className="card p-4 bg-loft-900 border-l-4 border-l-copper-500">
                   <p className="text-loft-400 text-xs font-medium uppercase mb-1">Pending Payments</p>
                   <p className="text-2xl font-bold text-loft-50">₹8,400</p>
                 </div>
                 <div className="card p-4 bg-loft-900 border-l-4 border-l-blue-500">
                   <p className="text-loft-400 text-xs font-medium uppercase mb-1">Invoices Generated</p>
                   <p className="text-2xl font-bold text-loft-50">142</p>
                 </div>
              </div>

              <div className="card bg-loft-900 border-loft-800 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm text-loft-300">
                    <thead className="bg-loft-950/50 text-xs uppercase font-medium">
                      <tr>
                        <th className="px-6 py-4">Receipt ID</th>
                        <th className="px-6 py-4">Date</th>
                        <th className="px-6 py-4">Customer/Business</th>
                        <th className="px-6 py-4">Amount</th>
                        <th className="px-6 py-4">Status</th>
                        <th className="px-6 py-4">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-loft-800">
                      {[
                        { id: 'RCP-2026-0801', date: '21 Aug, 2026', name: 'DMart (Kalyani Nagar)', amount: '₹12,500', status: 'Paid' },
                        { id: 'RCP-2026-0802', date: '21 Aug, 2026', name: 'Rahul Deshmukh', amount: '₹850', status: 'Paid' },
                        { id: 'RCP-2026-0803', date: '20 Aug, 2026', name: 'Reliance Fresh', amount: '₹8,400', status: 'Pending' },
                        { id: 'RCP-2026-0804', date: '19 Aug, 2026', name: 'Sneha Kulkarni', amount: '₹450', status: 'Paid' }
                      ].map((receipt, idx) => (
                        <tr key={idx} className="hover:bg-loft-800/50 transition-colors">
                          <td className="px-6 py-4 font-medium text-loft-200">{receipt.id}</td>
                          <td className="px-6 py-4">{receipt.date}</td>
                          <td className="px-6 py-4">{receipt.name}</td>
                          <td className="px-6 py-4 font-bold text-loft-100">{receipt.amount}</td>
                          <td className="px-6 py-4">
                            <span className={`px-2 py-1 rounded text-xs font-bold ${
                              receipt.status === 'Paid' ? 'bg-moss-500/10 text-moss-500' : 'bg-copper-500/10 text-copper-500'
                            }`}>
                              {receipt.status}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <button className="text-copper-500 hover:text-copper-400 font-medium text-xs flex items-center gap-1">
                              <FileText className="w-3 h-3" /> View PDF
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          )}

          {['vehicles', 'analytics', 'settings'].includes(activeTab) && (
             <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="card p-24 bg-loft-900 text-center flex flex-col items-center justify-center border-dashed border-loft-800/80">
              <h3 className="text-2xl font-bold text-loft-200 mb-2 capitalize">{activeTab} Management</h3>
              <p className="text-loft-400 max-w-md">This section is currently under development.</p>
            </motion.div>
          )}
        </div>
        
      </div>
    </div>
  );
};

export default AdminDashboard;

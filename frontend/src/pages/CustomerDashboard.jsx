import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { Package, CheckCircle, Wallet, MapPin, Plus, Gift, Copy, Crown, Target, Star, Leaf, Truck } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';

const CustomerDashboard = () => {
  const { user, token } = useSelector((state) => state.auth);
  const [activeTab, setActiveTab] = useState('history');
  const [isAddAddressOpen, setIsAddAddressOpen] = useState(false);
  const [walletData, setWalletData] = useState(null);
  const [copySuccess, setCopySuccess] = useState(false);
  const [isPro] = useState(user?.isPro || false); // Mock state for Demo
  const [totalTrips] = useState(user?.totalTrips || 7); // Mock Gamification state
  
  // Addresses State
  const [addresses, setAddresses] = useState([]);
  const [newAddress, setNewAddress] = useState({ label: '', street: '', city: '', postalCode: '' });

  useEffect(() => {
    if (activeTab === 'rewards' && token) {
      fetchWallet();
    }
    if (activeTab === 'addresses' && token) {
      fetchAddresses();
    }
  }, [activeTab, token]);

  const fetchAddresses = async () => {
    try {
      const res = await axios.get('http://localhost:3000/api/address', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAddresses(res.data);
    } catch (error) {
      console.error('Error fetching addresses:', error);
    }
  };

  const handleSaveAddress = async () => {
    try {
      const res = await axios.post('http://localhost:3000/api/address', newAddress, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAddresses([...addresses, res.data]);
      setIsAddAddressOpen(false);
      setNewAddress({ label: '', street: '', city: '', postalCode: '' });
    } catch (error) {
      console.error('Error saving address:', error);
    }
  };

  const fetchWallet = async () => {
    try {
      const res = await axios.get('http://localhost:3000/api/wallet', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setWalletData(res.data);
    } catch (error) {
      console.error('Error fetching wallet:', error);
    }
  };

  const copyToClipboard = () => {
    if (walletData?.referralCode) {
      navigator.clipboard.writeText(walletData.referralCode);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    }
  };

  return (
    <div className="w-full pt-12 pb-24 relative min-h-[80vh]">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-[radial-gradient(ellipse_at_center,rgba(85,108,145,0.1),transparent_70%)] pointer-events-none z-0"></div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Header */}
        <div className="mb-10 flex justify-between items-center">
          <div>
            <h1 className="text-3xl md:text-4xl font-serif font-bold text-loft-50 mb-2 flex items-center gap-3">
              Dashboard
              {isPro && <span className="bg-gradient-to-r from-yellow-400 to-yellow-600 text-black text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1 uppercase tracking-widest"><Crown className="w-3 h-3"/> Pro</span>}
            </h1>
            <p className="text-loft-300">Welcome back, <span className="text-copper-400 font-medium">{user?.name || 'User'}</span>!</p>
          </div>
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

        {/* Gamification & Retention Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
          {/* Eminence Pro Upsell (Only show if not Pro) */}
          {!isPro ? (
            <div className="card p-6 bg-gradient-to-br from-loft-900 to-loft-950 border-yellow-500/30 relative overflow-hidden flex flex-col justify-between">
              <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-yellow-500/10 rounded-full blur-2xl"></div>
              <div>
                <h3 className="text-xl font-bold text-yellow-500 mb-2 flex items-center gap-2"><Crown className="w-5 h-5"/> Eminence Pro</h3>
                <p className="text-loft-300 text-sm mb-4">Upgrade for ₹499/mo to get <strong className="text-yellow-400">Zero Cancellation Fees</strong>, Priority Allocation, and <strong className="text-yellow-400">5% OFF</strong> all bookings.</p>
              </div>
              <button className="bg-yellow-500 hover:bg-yellow-400 text-black font-bold py-2 px-6 rounded-lg shadow-[0_0_15px_rgba(234,179,8,0.2)] transition-all w-full md:w-auto self-start">
                Upgrade Now
              </button>
            </div>
          ) : (
            <div className="card p-6 bg-gradient-to-br from-loft-900 to-loft-950 border-yellow-500/30 relative overflow-hidden flex flex-col justify-between">
              <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-yellow-500/10 rounded-full blur-2xl"></div>
              <div>
                <h3 className="text-xl font-bold text-yellow-500 mb-2 flex items-center gap-2"><Crown className="w-5 h-5"/> Eminence Pro Active</h3>
                <p className="text-loft-300 text-sm">You are enjoying Zero Cancellation Fees, Priority Allocation, and 5% OFF all bookings.</p>
              </div>
            </div>
          )}

          {/* Milestone Rewards */}
          <div className="card p-6 bg-loft-900 border-loft-800">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg font-bold text-loft-50 flex items-center gap-2"><Target className="w-5 h-5 text-moss-500"/> Current Milestone</h3>
                <p className="text-loft-400 text-sm">Complete 10 rides to unlock <strong className="text-moss-400">₹500 Wallet Cash</strong></p>
              </div>
              <div className="w-10 h-10 bg-moss-500/10 rounded-full flex items-center justify-center border border-moss-500/30">
                <Star className="w-5 h-5 text-moss-500"/>
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-bold text-loft-300">
                <span>{totalTrips} Rides</span>
                <span>10 Rides</span>
              </div>
              <div className="w-full bg-loft-950 rounded-full h-3 overflow-hidden border border-loft-800">
                <div 
                  className="bg-gradient-to-r from-moss-600 to-moss-400 h-3 rounded-full transition-all duration-1000 relative"
                  style={{ width: `${(totalTrips / 10) * 100}%` }}
                >
                  <div className="absolute top-0 right-0 bottom-0 left-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-30"></div>
                </div>
              </div>
              <p className="text-xs text-right text-moss-500 mt-1">{10 - totalTrips} rides remaining!</p>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex space-x-2 border-b border-loft-800 mb-8 overflow-x-auto hide-scrollbar">
          {['history', 'tracking', 'invoices', 'addresses', 'payments', 'rewards', 'support', 'profile'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-3 font-medium text-sm rounded-t-lg transition-colors whitespace-nowrap capitalize ${
                activeTab === tab
                  ? 'bg-copper-500/15 text-copper-300 border-b-2 border-copper-500'
                  : 'text-loft-400 hover:text-loft-200 hover:bg-loft-900/50'
              }`}
            >
              {tab === 'history' ? 'Bookings' : tab}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="min-h-[300px]">
          {activeTab === 'history' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-loft-50">Recent Bookings</h3>
                <button className="text-copper-500 text-sm font-medium hover:text-copper-400">View All</button>
              </div>
              <div className="space-y-4">
                {[
                  { id: 'BKG-7829', date: 'Aug 21, 2026', vehicle: 'Tata Ace (Chota Hathi)', from: 'Kalyani Nagar', to: 'Viman Nagar', status: 'Completed', amount: '₹450', esgEmissions: '1.44 KG CO2' },
                  { id: 'BKG-7815', date: 'Aug 18, 2026', vehicle: 'Mahindra Bolero Pickup', from: 'Kothrud', to: 'Deccan Gymkhana', status: 'Completed', amount: '₹600', is3plOutsourced: true, thirdPartyProvider: 'Delhivery Logistics', esgEmissions: '2.50 KG CO2' },
                  { id: 'BKG-7790', date: 'Aug 12, 2026', vehicle: 'Tata Ace', from: 'Shivaji Nagar', to: 'Baner', status: 'Cancelled', amount: '₹0' }
                ].map((booking, idx) => (
                  <div key={idx} className="card p-5 bg-loft-900 flex flex-col md:flex-row md:items-center justify-between gap-4 border-l-4 border-l-transparent hover:border-l-copper-500 transition-all">
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        <span className="font-bold text-loft-50">{booking.id}</span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          booking.status === 'Completed' ? 'bg-moss-500/20 text-moss-500' : 'bg-red-500/20 text-red-500'
                        }`}>
                          {booking.status}
                        </span>
                        <span className="text-loft-400 text-sm">{booking.date}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-loft-300">
                        <Package className="w-4 h-4 text-loft-500" />
                        <span>{booking.vehicle}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-loft-300 mt-1">
                        <MapPin className="w-4 h-4 text-copper-500" />
                        <span>{booking.from} &rarr; {booking.to}</span>
                      </div>
                      {(booking.esgEmissions || booking.is3plOutsourced) && (
                        <div className="flex flex-wrap items-center gap-3 mt-3">
                          {booking.esgEmissions && (
                            <span className="flex items-center gap-1.5 text-xs text-moss-400 bg-moss-900/30 px-2 py-1 rounded-md border border-moss-800">
                              <Leaf className="w-3 h-3" />
                              {booking.esgEmissions} Saved
                            </span>
                          )}
                          {booking.is3plOutsourced && (
                            <span className="flex items-center gap-1.5 text-xs text-blue-400 bg-blue-900/30 px-2 py-1 rounded-md border border-blue-800">
                              <Truck className="w-3 h-3" />
                              3PL Handled: {booking.thirdPartyProvider}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center justify-between md:flex-col md:items-end gap-2">
                      <span className="text-xl font-bold text-loft-100">{booking.amount}</span>
                      <button className="btn-secondary py-1.5 px-3 text-xs">View Details</button>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {activeTab === 'invoices' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-loft-50">Invoices & Receipts</h3>
                <button className="text-copper-500 text-sm font-medium hover:text-copper-400">Download All</button>
              </div>
              <div className="card bg-loft-900 border-loft-800 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm text-loft-300">
                    <thead className="bg-loft-950/50 text-xs uppercase font-medium">
                      <tr>
                        <th className="px-6 py-4">Invoice No.</th>
                        <th className="px-6 py-4">Date</th>
                        <th className="px-6 py-4">Booking Ref</th>
                        <th className="px-6 py-4">Amount</th>
                        <th className="px-6 py-4">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-loft-800">
                      {[
                        { id: 'INV-2608-012', date: 'Aug 21, 2026', ref: 'BKG-7829', amount: '₹450' },
                        { id: 'INV-2608-005', date: 'Aug 18, 2026', ref: 'BKG-7815', amount: '₹600' }
                      ].map((invoice, idx) => (
                        <tr key={idx} className="hover:bg-loft-800/50 transition-colors">
                          <td className="px-6 py-4 font-medium text-loft-200">{invoice.id}</td>
                          <td className="px-6 py-4">{invoice.date}</td>
                          <td className="px-6 py-4">{invoice.ref}</td>
                          <td className="px-6 py-4 font-bold text-loft-100">{invoice.amount}</td>
                          <td className="px-6 py-4">
                            <button className="text-copper-500 hover:text-copper-400 font-medium text-xs flex items-center gap-1">
                              Download PDF
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
                {addresses.length === 0 ? (
                  <p className="text-loft-400">No saved addresses yet.</p>
                ) : (
                  addresses.map((address) => (
                    <div key={address.id} className="card p-6 border-l-4 border-l-copper-500">
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-bold text-loft-50 mb-1">{address.label}</h4>
                          <p className="text-loft-300 text-sm leading-relaxed">
                            {address.street}<br/>
                            {address.city}, {address.postalCode}
                          </p>
                        </div>
                        <div className="p-2 bg-loft-800 rounded-lg text-copper-500">
                          <MapPin className="w-5 h-5" />
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          )}

          {/* Placeholders for new tabs */}
          {activeTab === 'rewards' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Wallet Balance Card */}
                <div className="card p-8 bg-gradient-to-br from-loft-900 to-loft-950 border-copper-500/20 relative overflow-hidden">
                  <div className="absolute -right-10 -top-10 w-40 h-40 bg-copper-500/10 rounded-full blur-2xl"></div>
                  <h3 className="text-lg font-bold text-loft-300 mb-2">Available Balance</h3>
                  <div className="flex items-end gap-2 mb-6">
                    <span className="text-4xl font-bold text-copper-400">
                      ₹{walletData?.wallet?.balance?.toFixed(2) || '0.00'}
                    </span>
                  </div>
                  <button className="btn-primary py-2 px-6 w-full md:w-auto text-sm">
                    Add Funds
                  </button>
                </div>

                {/* Referral Card */}
                <div className="card p-8 bg-loft-900 border-loft-800">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-lg bg-moss-500/10 text-moss-500 flex items-center justify-center">
                      <Gift className="w-5 h-5" />
                    </div>
                    <h3 className="text-xl font-bold text-loft-50">Refer & Earn ₹100</h3>
                  </div>
                  <p className="text-loft-300 text-sm mb-6">
                    Share your unique referral code with friends. When they sign up and complete their first booking, you both get ₹100 in your wallet!
                  </p>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-loft-950 border border-loft-800 rounded-lg px-4 py-3 font-mono text-copper-400 text-center tracking-wider font-bold">
                      {walletData?.referralCode || 'LOADING...'}
                    </div>
                    <button 
                      onClick={copyToClipboard}
                      className="p-3 bg-loft-800 hover:bg-loft-700 rounded-lg text-loft-200 transition-colors"
                      title="Copy Code"
                    >
                      {copySuccess ? <CheckCircle className="w-5 h-5 text-moss-500" /> : <Copy className="w-5 h-5" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Transactions List */}
              <div className="card p-6 bg-loft-900 border-loft-800">
                <h3 className="text-lg font-bold text-loft-50 mb-4">Recent Transactions</h3>
                {walletData?.wallet?.transactions?.length > 0 ? (
                  <div className="space-y-3">
                    {walletData.wallet.transactions.map((tx) => (
                      <div key={tx.id} className="flex items-center justify-between p-4 rounded-lg bg-loft-950/50 border border-loft-800/50">
                        <div>
                          <p className="font-medium text-loft-100">{tx.description}</p>
                          <p className="text-xs text-loft-400">{new Date(tx.createdAt).toLocaleDateString()}</p>
                        </div>
                        <div className={`font-bold ${tx.type === 'CREDIT' ? 'text-moss-500' : 'text-red-500'}`}>
                          {tx.type === 'CREDIT' ? '+' : '-'}₹{tx.amount}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-loft-400 text-sm">
                    No transactions yet.
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {['tracking', 'payments', 'support', 'profile'].includes(activeTab) && (
             <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="card p-12 text-center flex flex-col items-center justify-center border-dashed border-loft-800/80"
            >
              <h3 className="text-xl font-bold text-loft-200 mb-2 capitalize">{activeTab}</h3>
              <p className="text-loft-400 max-w-md">This section is currently under development.</p>
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
                  <input type="text" className="input-field" placeholder="Enter label" value={newAddress.label} onChange={(e) => setNewAddress({...newAddress, label: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-loft-200 mb-1">Street Address</label>
                  <textarea className="input-field resize-none h-24" placeholder="Enter full address" value={newAddress.street} onChange={(e) => setNewAddress({...newAddress, street: e.target.value})}></textarea>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-loft-200 mb-1">City</label>
                    <input type="text" className="input-field" placeholder="Pune" value={newAddress.city} onChange={(e) => setNewAddress({...newAddress, city: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-loft-200 mb-1">Postal Code</label>
                    <input type="text" className="input-field" placeholder="411001" value={newAddress.postalCode} onChange={(e) => setNewAddress({...newAddress, postalCode: e.target.value})} />
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
                  onClick={handleSaveAddress}
                  className="btn-primary w-full"
                  disabled={!newAddress.label || !newAddress.street}
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

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FileText, Truck, Users, CreditCard, HeadphonesIcon, Upload, CheckCircle } from 'lucide-react';
import axios from 'axios';
import { useSelector } from 'react-redux';

const BusinessDashboard = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const { token } = useSelector((state) => state.auth);

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setUploadSuccess(false);
    }
  };

  const [contracts, setContracts] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [loadingContracts, setLoadingContracts] = useState(false);
  const [loadingInvoices, setLoadingInvoices] = useState(false);
  
  const [newContract, setNewContract] = useState({
    vehicleType: '',
    vehicleCount: 1,
    startDate: '',
    endDate: ''
  });
  const [requestingContract, setRequestingContract] = useState(false);

  useEffect(() => {
    if (activeTab === 'contracts') {
      const fetchContracts = async () => {
        setLoadingContracts(true);
        try {
          const res = await axios.get('http://localhost:5000/api/b2b/contracts', {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (res.data.success) {
            setContracts(res.data.contracts);
          }
        } catch (err) {
          console.error('Error fetching contracts:', err);
        } finally {
          setLoadingContracts(false);
        }
      };
      fetchContracts();
    } else if (activeTab === 'invoices') {
      const fetchInvoices = async () => {
        setLoadingInvoices(true);
        try {
          const res = await axios.get('http://localhost:5000/api/b2b/invoices', {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (res.data.success) {
            setInvoices(res.data.invoices);
          }
        } catch (err) {
          console.error('Error fetching invoices:', err);
        } finally {
          setLoadingInvoices(false);
        }
      };
      fetchInvoices();
    }
  }, [activeTab, token]);

  const handleRequestContract = async (e) => {
    e.preventDefault();
    setRequestingContract(true);
    try {
      const res = await axios.post('http://localhost:5000/api/b2b/contracts', newContract, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success) {
        setContracts([res.data.contract, ...contracts]);
        setNewContract({ vehicleType: '', vehicleCount: 1, startDate: '', endDate: '' });
        alert('Contract requested successfully!');
      }
    } catch (err) {
      console.error('Error requesting contract:', err);
      alert('Failed to request contract');
    } finally {
      setRequestingContract(false);
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    
    try {
      await axios.post('http://localhost:5000/api/b2b/batch-bookings', formData, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });
      setUploadSuccess(true);
      setFile(null);
    } catch (err) {
      console.error('Batch upload error:', err);
      alert('Failed to upload batch bookings.');
    } finally {
      setUploading(false);
    }
  };

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

        {/* Tab Navigation */}
        <div className="flex space-x-2 border-b border-loft-800 mb-8 overflow-x-auto hide-scrollbar">
          {['overview', 'contracts', 'bulk-load', 'trips', 'invoices', 'fleet', 'support'].map((tab) => (
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

          {activeTab === 'bulk-load' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="card p-8 bg-loft-900 border-loft-800">
              <div className="flex justify-between items-center mb-6 border-b border-loft-800 pb-4">
                <div>
                  <h3 className="text-xl font-bold text-loft-50">Bulk Load Management</h3>
                  <p className="text-sm text-loft-400 mt-1">Upload a CSV file containing multiple booking requests to schedule them at once.</p>
                </div>
                <button className="text-copper-500 hover:text-copper-400 text-sm font-medium border border-copper-500/30 px-4 py-2 rounded-lg transition-colors">
                  Download Template
                </button>
              </div>

              <div className="mt-8 border-2 border-dashed border-loft-700 hover:border-copper-500 bg-loft-950/50 rounded-xl p-12 text-center transition-colors">
                {!uploadSuccess ? (
                  <>
                    <Upload className="w-12 h-12 text-loft-500 mx-auto mb-4" />
                    <h4 className="text-lg font-bold text-loft-200 mb-2">Drag and drop your CSV here</h4>
                    <p className="text-loft-400 text-sm mb-6">or click to browse from your computer</p>
                    <input 
                      type="file" 
                      accept=".csv"
                      onChange={handleFileChange}
                      className="hidden" 
                      id="csv-upload" 
                    />
                    <label 
                      htmlFor="csv-upload" 
                      className="btn-secondary py-2.5 px-6 inline-block cursor-pointer"
                    >
                      Browse Files
                    </label>
                    {file && (
                      <div className="mt-6 flex items-center justify-center gap-4 bg-loft-900 border border-loft-800 p-3 rounded-lg max-w-sm mx-auto">
                        <FileText className="w-5 h-5 text-copper-500" />
                        <span className="text-sm text-loft-200 flex-1 truncate text-left">{file.name}</span>
                        <button 
                          onClick={handleUpload}
                          disabled={uploading}
                          className="bg-copper-500 hover:bg-copper-600 text-white px-4 py-1.5 rounded-md text-sm font-bold transition-colors disabled:opacity-50"
                        >
                          {uploading ? 'Uploading...' : 'Upload'}
                        </button>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="py-8">
                    <CheckCircle className="w-16 h-16 text-moss-500 mx-auto mb-4" />
                    <h4 className="text-xl font-bold text-moss-400 mb-2">Batch Bookings Scheduled!</h4>
                    <p className="text-loft-300 text-sm mb-6">Your CSV file has been processed successfully and the rides have been dispatched.</p>
                    <button 
                      onClick={() => setUploadSuccess(false)}
                      className="btn-secondary py-2 px-6"
                    >
                      Upload Another File
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {activeTab === 'contracts' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
              <div className="card p-6 bg-loft-900 border-loft-800">
                <h3 className="text-xl font-bold text-loft-50 mb-4">Request New Contract</h3>
                <form onSubmit={handleRequestContract} className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <select 
                    required
                    value={newContract.vehicleType}
                    onChange={(e) => setNewContract({...newContract, vehicleType: e.target.value})}
                    className="input-field bg-loft-950"
                  >
                    <option value="">Select Vehicle Type</option>
                    <option value="small">Small (Tata Ace)</option>
                    <option value="medium">Medium (Bolero)</option>
                    <option value="large">Large (Eicher)</option>
                  </select>
                  <input 
                    type="number" 
                    min="1"
                    required
                    value={newContract.vehicleCount}
                    onChange={(e) => setNewContract({...newContract, vehicleCount: parseInt(e.target.value)})}
                    placeholder="Vehicle Count"
                    className="input-field bg-loft-950"
                  />
                  <input 
                    type="date" 
                    required
                    value={newContract.startDate}
                    onChange={(e) => setNewContract({...newContract, startDate: e.target.value})}
                    className="input-field bg-loft-950"
                  />
                  <input 
                    type="date" 
                    required
                    value={newContract.endDate}
                    onChange={(e) => setNewContract({...newContract, endDate: e.target.value})}
                    className="input-field bg-loft-950"
                  />
                  <div className="md:col-span-4 flex justify-end">
                    <button 
                      type="submit" 
                      disabled={requestingContract}
                      className="btn-primary py-2 px-6 disabled:opacity-50"
                    >
                      {requestingContract ? 'Requesting...' : 'Submit Request'}
                    </button>
                  </div>
                </form>
              </div>

              <div className="card p-6 bg-loft-900 border-loft-800">
                <h3 className="text-xl font-bold text-loft-50 mb-4">Contract History</h3>
                {loadingContracts ? (
                  <p className="text-loft-400">Loading contracts...</p>
                ) : contracts.length === 0 ? (
                  <p className="text-loft-400">No contracts found.</p>
                ) : (
                  <div className="space-y-4">
                    {contracts.map(contract => (
                      <div key={contract.id} className="p-4 border border-loft-800 rounded-lg flex justify-between items-center bg-loft-950">
                        <div>
                          <h4 className="font-bold text-loft-200">Contract #{contract.id.substring(0,8)}</h4>
                          <p className="text-sm text-loft-400 capitalize">{contract.vehicleType} x {contract.vehicleCount}</p>
                          <p className="text-sm text-loft-400">{new Date(contract.startDate).toLocaleDateString()} to {new Date(contract.endDate).toLocaleDateString()}</p>
                        </div>
                        <div>
                          <span className={`text-xs px-2 py-1 rounded font-bold uppercase ${contract.status === 'active' ? 'bg-moss-500/20 text-moss-500' : 'bg-copper-500/20 text-copper-500'}`}>
                            {contract.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {activeTab === 'invoices' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="card p-6 bg-loft-900 border-loft-800">
              <h3 className="text-xl font-bold text-loft-50 mb-4">Invoices & Billing</h3>
              {loadingInvoices ? (
                <p className="text-loft-400">Loading invoices...</p>
              ) : invoices.length === 0 ? (
                <p className="text-loft-400">No invoices found.</p>
              ) : (
                <div className="space-y-4">
                  {invoices.map(invoice => (
                    <div key={invoice.id} className="p-4 border border-loft-800 rounded-lg flex flex-col md:flex-row justify-between md:items-center bg-loft-950 gap-4">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-loft-800 rounded-full flex items-center justify-center">
                          <FileText className="w-6 h-6 text-copper-500" />
                        </div>
                        <div>
                          <h4 className="font-bold text-loft-200">INV-{invoice.id.substring(0,8).toUpperCase()}</h4>
                          <p className="text-sm text-loft-400">{invoice.month} {invoice.year}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-6">
                        <div className="text-right">
                          <p className="font-bold text-loft-50">₹{invoice.totalAmount}</p>
                          <span className={`text-xs px-2 py-0.5 rounded font-bold uppercase ${invoice.status === 'paid' ? 'bg-moss-500/20 text-moss-500' : 'bg-red-500/20 text-red-500'}`}>
                            {invoice.status}
                          </span>
                        </div>
                        <button className="text-sm text-copper-500 hover:text-copper-400 flex items-center gap-1 border border-copper-500/30 px-3 py-1.5 rounded transition-colors">
                          Download PDF
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {activeTab !== 'overview' && activeTab !== 'bulk-load' && activeTab !== 'contracts' && activeTab !== 'invoices' && (
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

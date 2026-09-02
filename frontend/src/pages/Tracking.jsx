import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Phone, MessageSquare, ShieldCheck } from 'lucide-react';
import { motion } from 'framer-motion';
import TrackingMap from '../components/Tracking/TrackingMap';
import ReviewModal from '../components/Customer/ReviewModal';

const Tracking = () => {
  const { bookingId } = useParams();
  const [status, setStatus] = useState('driver_assigned'); // searching, driver_assigned, arrived, in_transit, completed
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  
  // Pune coordinates for mock
  const punePosition = [18.5204, 73.8567];

  // Simulate status progression for demo purposes
  useEffect(() => {
    const timer1 = setTimeout(() => setStatus('arrived'), 5000);
    const timer2 = setTimeout(() => setStatus('in_transit'), 10000);
    const timer3 = setTimeout(() => {
      setStatus('completed');
      setIsReviewModalOpen(true);
    }, 15000);
    return () => { clearTimeout(timer1); clearTimeout(timer2); clearTimeout(timer3); };
  }, []);

  const getStatusText = () => {
    switch(status) {
      case 'searching': return 'Searching for driver...';
      case 'driver_assigned': return 'Driver assigned, on the way to pickup.';
      case 'arrived': return 'Driver has arrived at pickup location.';
      case 'in_transit': return 'Goods in transit to destination.';
      case 'completed': return 'Delivery completed successfully!';
      default: return 'Loading...';
    }
  };

  const getProgressWidth = () => {
    switch(status) {
      case 'searching': return '10%';
      case 'driver_assigned': return '30%';
      case 'arrived': return '50%';
      case 'in_transit': return '80%';
      case 'completed': return '100%';
      default: return '0%';
    }
  };

  return (
    <div className="w-full relative min-h-screen bg-loft-950 flex flex-col md:flex-row">
      
      {/* Map Area (Leaflet) */}
      <div className="flex-1 relative bg-loft-900 border-r border-loft-800 hidden md:block z-0">
        <TrackingMap bookingId={bookingId} initialLat={punePosition[0]} initialLng={punePosition[1]} />
      </div>

      {/* Tracking Details Pane */}
      <div className="w-full md:w-[450px] flex-shrink-0 bg-loft-950 p-6 md:p-8 flex flex-col h-full overflow-y-auto hide-scrollbar">
        
        <div className="mb-8">
          <Link to="/customer/dashboard" className="text-copper-500 text-sm font-bold tracking-wide uppercase hover:text-copper-400 transition-colors">
            &larr; Back to Dashboard
          </Link>
          <h1 className="text-3xl font-serif font-bold text-loft-50 mt-4 mb-1">Track Ride</h1>
          <p className="text-loft-400 text-sm">Booking ID: <span className="text-loft-200 font-mono">{bookingId || 'BKG-XXXX-XX'}</span></p>
        </div>

        {/* Live Status */}
        <div className="card p-6 border-copper-500/30 mb-6 bg-copper-500/5">
          <h2 className="text-xl font-bold text-loft-50 mb-4">{getStatusText()}</h2>
          
          <div className="relative h-2 bg-loft-800 rounded-full mb-2 overflow-hidden">
            <motion.div 
              className="absolute top-0 left-0 h-full bg-copper-500 rounded-full"
              initial={{ width: '0%' }}
              animate={{ width: getProgressWidth() }}
              transition={{ duration: 0.5 }}
            ></motion.div>
          </div>
          
          <div className="flex justify-between text-xs text-loft-400 font-medium">
            <span>Pickup</span>
            <span>Transit</span>
            <span>Drop</span>
          </div>
        </div>

        {/* OTP Section (Only show if not completed) */}
        {status !== 'completed' && (
          <div className="card p-6 mb-6 flex items-center justify-between border-moss-500/30 bg-moss-500/5">
            <div>
              <p className="text-sm text-moss-400 font-medium mb-1 flex items-center gap-1">
                <ShieldCheck className="w-4 h-4" /> Start Ride OTP
              </p>
              <p className="text-xs text-loft-300">Share this with the driver</p>
            </div>
            <div className="text-3xl font-mono font-bold tracking-widest text-loft-50">8492</div>
          </div>
        )}

        {/* Driver Info */}
        <div className="card p-6 mb-6 flex flex-col gap-4">
          <div className="flex items-center gap-4 border-b border-loft-800 pb-4">
            <div className="w-16 h-16 bg-loft-800 rounded-full flex items-center justify-center overflow-hidden border-2 border-copper-500 text-2xl">
              👤
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-loft-50">Ramesh Kumar</h3>
              <div className="flex items-center gap-2 text-sm text-loft-300">
                <span>⭐ 4.8</span>
                <span>&bull;</span>
                <span>Tata Ace (Medium)</span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <div className="bg-loft-800 px-3 py-1 rounded text-lg font-mono font-bold text-loft-50 border border-loft-700">
              MH 12 AB 1234
            </div>
            <div className="flex gap-2">
              <button className="w-10 h-10 rounded-full bg-copper-500/10 border border-copper-500/20 text-copper-500 flex items-center justify-center hover:bg-copper-500/20 transition-colors">
                <MessageSquare className="w-5 h-5" />
              </button>
              <a href="tel:+919876543210" className="w-10 h-10 rounded-full bg-moss-500 text-white flex items-center justify-center shadow-lg shadow-moss-500/20 hover:bg-moss-400 transition-colors">
                <Phone className="w-5 h-5" />
              </a>
            </div>
          </div>
        </div>

        {/* Trip Details */}
        <div className="card p-6 mb-6">
          <h3 className="text-sm font-bold text-loft-400 uppercase tracking-wider mb-4">Trip Details</h3>
          
          <div className="relative pl-6 space-y-6">
            <div className="absolute left-2.5 top-2 bottom-2 w-px bg-loft-800"></div>
            
            <div className="relative">
              <div className="absolute -left-[29px] top-0.5 w-4 h-4 rounded-full bg-moss-500 border-4 border-loft-900"></div>
              <p className="text-sm font-bold text-loft-200">Pickup</p>
              <p className="text-sm text-loft-400">123 Market Street, Viman Nagar, Pune</p>
            </div>
            
            <div className="relative">
              <div className="absolute -left-[29px] top-0.5 w-4 h-4 rounded-full bg-copper-500 border-4 border-loft-900"></div>
              <p className="text-sm font-bold text-loft-200">Drop</p>
              <p className="text-sm text-loft-400">456 Industrial Area, Hinjewadi Phase 1, Pune</p>
            </div>
          </div>
        </div>
        
        {/* Helpline */}
        <div className="mt-auto text-center pt-4">
          <p className="text-sm text-loft-400 mb-2">Need help with this booking?</p>
          <a href="tel:18001234567" className="text-copper-500 font-bold hover:text-copper-400 transition-colors">
            Call Support Helpline
          </a>
        </div>

      </div>

      <ReviewModal 
        isOpen={isReviewModalOpen} 
        onClose={() => setIsReviewModalOpen(false)} 
        bookingId={bookingId} 
        driverId="d1234567-89ab-cdef-0123-456789abcdef" 
        driverName="Ramesh Kumar" 
      />
    </div>
  );
};

export default Tracking;

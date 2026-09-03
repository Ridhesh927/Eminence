import { useState } from 'react';
import { motion } from 'framer-motion';
import { MapPin, Calendar, Clock, Truck, Box, ShieldCheck, Tag } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import axios from 'axios';

const Booking = () => {
  const navigate = useNavigate();
  const { token } = useSelector((state) => state.auth);
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [promoCode, setPromoCode] = useState('');
  const [discount, setDiscount] = useState(0);
  const [promoMessage, setPromoMessage] = useState(null);
  
  // Smart Pricing Engine (Simulated Surge)
  const [surgeMultiplier] = useState(1.4); // e.g. 1.4x due to Rush Hour
  
  const [formData, setFormData] = useState({
    pickup: '',
    drops: [''], // Array of drop-off addresses
    date: '',
    time: '',
    goodsType: '',
    weight: '',
    tempoType: 'small', // small, medium, large
    bookingMode: 'dedicated', // dedicated, shared
    isRoundTrip: false,
    waitingTimeHours: 1,
    phone: '',
    paymentMethod: 'online'
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleDropChange = (index, value) => {
    const newDrops = [...formData.drops];
    newDrops[index] = value;
    setFormData({ ...formData, drops: newDrops });
  };

  const addDrop = () => {
    setFormData({ ...formData, drops: [...formData.drops, ''] });
  };

  const removeDrop = (index) => {
    const newDrops = [...formData.drops];
    newDrops.splice(index, 1);
    setFormData({ ...formData, drops: newDrops });
  };

  const calculateFare = () => {
    // Mock calculation
    const baseRates = { small: 350, medium: 550, large: 1200 };
    let base = baseRates[formData.tempoType] || 0;
    
    // Apply Smart Pricing Surge
    base *= surgeMultiplier;

    // Add ₹150 for each stop after the first one
    const extraStopsCost = Math.max(0, (formData.drops.length - 1) * 150);
    base += extraStopsCost;

    // Round Trip Multiplier (1.8x base distance fare)
    if (formData.isRoundTrip) {
      base *= 1.8;
    }

    // Shared Load Discount (40% off base)
    if (formData.bookingMode === 'shared') {
      base *= 0.6;
    }

    const waitingFee = formData.isRoundTrip ? formData.waitingTimeHours * 100 : 0;
    
    const total = base + waitingFee;
    return Math.max(0, total - discount);
  };

  const handleApplyPromo = async () => {
    if (!promoCode) return;
    try {
      const res = await axios.post(
        'http://localhost:3000/api/wallet/referral',
        { referralCode: promoCode },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setDiscount(100); // 100 Rs discount applied immediately for UI purposes
      setPromoMessage({ type: 'success', text: 'Referral applied! ₹100 discount added.' });
    } catch (error) {
      setPromoMessage({ type: 'error', text: error.response?.data?.message || 'Invalid code' });
    }
  };

  const handleNext = () => setStep(step + 1);
  const handleBack = () => setStep(step - 1);

  const handleSubmit = (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    // Mock API call to create booking
    setTimeout(() => {
      setIsSubmitting(false);
      // Redirect to Tracking page with mock booking ID
      navigate('/tracking/BKG-7829-XT');
    }, 1500);
  };

  return (
    <div className="w-full pt-12 pb-24 relative min-h-screen">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[500px] bg-[radial-gradient(ellipse_at_top,rgba(85,108,145,0.15),transparent_70%)] pointer-events-none z-0"></div>
      
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center mb-10">
          <h1 className="text-3xl md:text-4xl font-serif font-bold text-loft-50 mb-2">Book a Tempo</h1>
          <p className="text-loft-300">Fill in the details below to instantly book your transport.</p>
        </div>

        {/* Progress Bar */}
        <div className="flex justify-between mb-8 relative">
          <div className="absolute top-1/2 left-0 w-full h-1 bg-loft-800 -translate-y-1/2 z-0"></div>
          <div 
            className="absolute top-1/2 left-0 h-1 bg-copper-500 -translate-y-1/2 z-0 transition-all duration-500"
            style={{ width: `${((step - 1) / 2) * 100}%` }}
          ></div>
          
          {[1, 2, 3].map((num) => (
            <div 
              key={num} 
              className={`relative z-10 w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-colors ${
                step >= num ? 'bg-copper-500 text-white shadow-[0_0_15px_rgba(232,99,49,0.4)]' : 'bg-loft-800 text-loft-400'
              }`}
            >
              {num}
            </div>
          ))}
        </div>

        <motion.div className="card p-8 md:p-10">
          <form onSubmit={step === 3 ? handleSubmit : (e) => { e.preventDefault(); handleNext(); }}>
            
            {/* Step 1: Locations */}
            {step === 1 && (
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
                <h2 className="text-xl font-bold text-loft-50 mb-4 border-b border-loft-800 pb-2">Where to?</h2>
                
                <div>
                  <label className="block text-sm font-medium text-loft-200 mb-1">Pickup Address</label>
                  <div className="relative">
                    <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-moss-500" />
                    <input required name="pickup" value={formData.pickup} onChange={handleChange} type="text" className="input-field pl-12" placeholder="Enter pickup location" />
                  </div>
                </div>
                
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="block text-sm font-medium text-loft-200">Drop Addresses</label>
                    <button type="button" onClick={addDrop} className="text-xs text-copper-500 hover:text-copper-400 font-medium">+ Add Stop</button>
                  </div>
                  <div className="space-y-3">
                    {formData.drops.map((drop, index) => (
                      <div key={index} className="relative flex items-center gap-2">
                        <div className="relative flex-1">
                          <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-copper-500" />
                          <input 
                            required 
                            value={drop} 
                            onChange={(e) => handleDropChange(index, e.target.value)} 
                            type="text" 
                            className="input-field pl-12" 
                            placeholder={`Enter drop location ${index + 1}`} 
                          />
                        </div>
                        {formData.drops.length > 1 && (
                          <button type="button" onClick={() => removeDrop(index)} className="p-2 text-loft-400 hover:text-red-400 transition-colors">
                            <span className="text-xl leading-none">×</span>
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-loft-200 mb-1">Date</label>
                    <div className="relative">
                      <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-loft-400" />
                      <input required name="date" value={formData.date} onChange={handleChange} type="date" className="input-field pl-12" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-loft-200 mb-1">Time</label>
                    <div className="relative">
                      <Clock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-loft-400" />
                      <input required name="time" value={formData.time} onChange={handleChange} type="time" className="input-field pl-12" />
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-loft-800">
                  <label className="flex items-center gap-3 cursor-pointer p-4 border border-loft-800 rounded-xl bg-loft-950/50 hover:border-copper-500 transition-colors">
                    <input 
                      type="checkbox" 
                      checked={formData.isRoundTrip} 
                      onChange={(e) => setFormData({ ...formData, isRoundTrip: e.target.checked })}
                      className="w-5 h-5 accent-copper-500 rounded border-loft-700 bg-loft-900" 
                    />
                    <div>
                      <span className="font-bold text-loft-50 block">Make this a Round Trip</span>
                      <span className="text-xs text-loft-400">Driver waits at the destination and returns to pickup</span>
                    </div>
                  </label>

                  {formData.isRoundTrip && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="mt-4">
                      <label className="block text-sm font-medium text-loft-200 mb-1">Waiting Time at Destination (Hours)</label>
                      <select 
                        name="waitingTimeHours" 
                        value={formData.waitingTimeHours} 
                        onChange={handleChange}
                        className="input-field"
                      >
                        {[1, 2, 3, 4, 5, 6, 8, 12, 24].map(hours => (
                          <option key={hours} value={hours}>{hours} {hours === 1 ? 'Hour' : 'Hours'} (₹{hours * 100})</option>
                        ))}
                      </select>
                    </motion.div>
                  )}
                </div>

                <button type="submit" className="btn-primary w-full mt-6">Continue to Details</button>
              </motion.div>
            )}

            {/* Step 2: Goods & Vehicle */}
            {step === 2 && (
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
                <h2 className="text-xl font-bold text-loft-50 mb-4 border-b border-loft-800 pb-2">What are you moving?</h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-loft-200 mb-1">Goods Type</label>
                    <div className="relative">
                      <Box className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-loft-400" />
                      <input required name="goodsType" value={formData.goodsType} onChange={handleChange} type="text" className="input-field pl-12" placeholder="e.g. Furniture, Boxes" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-loft-200 mb-1">Approx. Weight (kg)</label>
                    <input required name="weight" value={formData.weight} onChange={handleChange} type="number" className="input-field" placeholder="e.g. 500" />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-loft-200 mb-3">Select Tempo Type</label>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {['small', 'medium', 'large'].map((type) => (
                      <label key={type} className={`cursor-pointer border rounded-xl p-4 flex flex-col items-center transition-all ${formData.tempoType === type ? 'border-copper-500 bg-copper-500/10' : 'border-loft-800 bg-loft-950/50 hover:border-loft-600'}`}>
                        <input type="radio" name="tempoType" value={type} checked={formData.tempoType === type} onChange={handleChange} className="sr-only" />
                        <Truck className={`w-8 h-8 mb-2 ${formData.tempoType === type ? 'text-copper-500' : 'text-loft-400'}`} />
                        <span className="font-bold text-loft-50 capitalize">{type}</span>
                        <span className="text-xs text-loft-400">{type === 'small' ? 'Up to 750kg' : type === 'medium' ? 'Up to 1500kg' : 'Up to 3000kg'}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-loft-200 mb-3">Booking Mode</label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <label className={`cursor-pointer border rounded-xl p-4 flex items-center gap-3 transition-all ${formData.bookingMode === 'dedicated' ? 'border-copper-500 bg-copper-500/10' : 'border-loft-800 bg-loft-950/50 hover:border-loft-600'}`}>
                      <input type="radio" name="bookingMode" value="dedicated" checked={formData.bookingMode === 'dedicated'} onChange={handleChange} className="sr-only" />
                      <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${formData.bookingMode === 'dedicated' ? 'border-copper-500' : 'border-loft-600'}`}>
                        {formData.bookingMode === 'dedicated' && <div className="w-2 h-2 rounded-full bg-copper-500"></div>}
                      </div>
                      <div>
                        <span className="font-bold text-loft-50 block">Dedicated Truck</span>
                        <span className="text-xs text-loft-400 block">Private, direct, fastest route</span>
                      </div>
                    </label>
                    <label className={`cursor-pointer border rounded-xl p-4 flex items-center gap-3 transition-all ${formData.bookingMode === 'shared' ? 'border-copper-500 bg-copper-500/10' : 'border-loft-800 bg-loft-950/50 hover:border-loft-600'}`}>
                      <input type="radio" name="bookingMode" value="shared" checked={formData.bookingMode === 'shared'} onChange={handleChange} className="sr-only" />
                      <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${formData.bookingMode === 'shared' ? 'border-copper-500' : 'border-loft-600'}`}>
                        {formData.bookingMode === 'shared' && <div className="w-2 h-2 rounded-full bg-copper-500"></div>}
                      </div>
                      <div>
                        <span className="font-bold text-loft-50 block text-copper-400">Shared Load (40% OFF)</span>
                        <span className="text-xs text-loft-400 block">Pool with others, budget-friendly</span>
                      </div>
                    </label>
                  </div>
                </div>

                <div className="flex gap-4 mt-6">
                  <button type="button" onClick={handleBack} className="btn-secondary w-1/3">Back</button>
                  <button type="submit" className="btn-primary w-2/3">Continue to Payment</button>
                </div>
              </motion.div>
            )}

            {/* Step 3: Confirmation & Payment */}
            {step === 3 && (
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
                <h2 className="text-xl font-bold text-loft-50 mb-4 border-b border-loft-800 pb-2">Confirm & Pay</h2>
                
                <div className="bg-loft-950/80 rounded-xl p-6 border border-loft-800 mb-6">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-loft-300">Base Fare ({formData.tempoType}){formData.isRoundTrip ? ' (Round Trip 1.8x)' : ''}</span>
                    <span className="font-medium text-loft-100">
                      ₹{
                        (() => {
                          let base = { small: 350, medium: 550, large: 1200 }[formData.tempoType] || 0;
                          if (formData.isRoundTrip) base *= 1.8;
                          return base;
                        })()
                      }
                    </span>
                  </div>
                  {surgeMultiplier > 1 && (
                    <div className="flex justify-between items-center mb-2 text-yellow-500">
                      <span className="flex items-center gap-2"><span className="text-lg">⚡</span> Smart Pricing Surge ({surgeMultiplier}x)</span>
                      <span className="font-medium">+₹{
                        Math.round((
                          (() => {
                            let base = { small: 350, medium: 550, large: 1200 }[formData.tempoType] || 0;
                            if (formData.isRoundTrip) base *= 1.8;
                            return base;
                          })()
                        ) * (surgeMultiplier - 1))
                      }</span>
                    </div>
                  )}
                  {formData.bookingMode === 'shared' && (
                    <div className="flex justify-between items-center mb-2 text-copper-400">
                      <span className="text-loft-300">Shared Load Discount</span>
                      <span className="font-bold">-40%</span>
                    </div>
                  )}
                  {formData.drops.length > 1 && (
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-loft-300">Multiple Stops Fee ({formData.drops.length - 1} extra)</span>
                      <span className="font-medium text-loft-100">₹{Math.max(0, (formData.drops.length - 1) * 150)}</span>
                    </div>
                  )}
                  {formData.isRoundTrip && (
                    <div className="flex justify-between items-center mb-2 text-copper-400">
                      <span className="text-loft-300">Waiting Fee ({formData.waitingTimeHours} hrs)</span>
                      <span className="font-medium">₹{formData.waitingTimeHours * 100}</span>
                    </div>
                  )}
                  {discount > 0 && (
                    <div className="flex justify-between items-center mb-4 text-moss-500">
                      <span>Discount Applied</span>
                      <span className="font-bold">-₹{discount}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center mb-4 pt-4 border-t border-loft-800">
                    <span className="text-loft-100 font-bold">Total Fare</span>
                    <span className="text-3xl font-bold text-copper-500">₹{calculateFare()}</span>
                  </div>
                  <div className="flex items-start gap-2 text-sm text-moss-400 mb-2">
                    <ShieldCheck className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <span>Price includes GST, tolls, and insurance. No hidden fees.</span>
                  </div>
                </div>

                {/* Promo Code Section */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-loft-200 mb-2">Have a Referral or Promo Code?</label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Tag className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-loft-400" />
                      <input 
                        type="text" 
                        value={promoCode}
                        onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                        className="input-field pl-12 uppercase" 
                        placeholder="e.g. EMINENCE-XYZ123" 
                        disabled={discount > 0}
                      />
                    </div>
                    <button 
                      type="button" 
                      onClick={handleApplyPromo}
                      disabled={discount > 0 || !promoCode}
                      className="btn-secondary whitespace-nowrap"
                    >
                      Apply
                    </button>
                  </div>
                  {promoMessage && (
                    <p className={`mt-2 text-sm font-medium ${promoMessage.type === 'success' ? 'text-moss-500' : 'text-red-500'}`}>
                      {promoMessage.text}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-loft-200 mb-1">Contact Phone Number</label>
                  <input required name="phone" value={formData.phone} onChange={handleChange} type="tel" className="input-field" placeholder="10-digit mobile number" />
                </div>

                <div>
                  <label className="block text-sm font-medium text-loft-200 mb-3">Payment Method</label>
                  <div className="grid grid-cols-2 gap-4">
                    <label className={`cursor-pointer border rounded-xl p-4 flex items-center gap-3 transition-all ${formData.paymentMethod === 'online' ? 'border-copper-500 bg-copper-500/10' : 'border-loft-800 bg-loft-950/50 hover:border-loft-600'}`}>
                      <input type="radio" name="paymentMethod" value="online" checked={formData.paymentMethod === 'online'} onChange={handleChange} className="sr-only" />
                      <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${formData.paymentMethod === 'online' ? 'border-copper-500' : 'border-loft-600'}`}>
                        {formData.paymentMethod === 'online' && <div className="w-2 h-2 rounded-full bg-copper-500"></div>}
                      </div>
                      <span className="font-bold text-loft-50">Pay Online (UPI/Card)</span>
                    </label>
                    <label className={`cursor-pointer border rounded-xl p-4 flex items-center gap-3 transition-all ${formData.paymentMethod === 'cash' ? 'border-copper-500 bg-copper-500/10' : 'border-loft-800 bg-loft-950/50 hover:border-loft-600'}`}>
                      <input type="radio" name="paymentMethod" value="cash" checked={formData.paymentMethod === 'cash'} onChange={handleChange} className="sr-only" />
                      <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${formData.paymentMethod === 'cash' ? 'border-copper-500' : 'border-loft-600'}`}>
                        {formData.paymentMethod === 'cash' && <div className="w-2 h-2 rounded-full bg-copper-500"></div>}
                      </div>
                      <span className="font-bold text-loft-50">Pay to Driver (Cash)</span>
                    </label>
                  </div>
                </div>

                <div className="flex gap-4 mt-6">
                  <button type="button" onClick={handleBack} disabled={isSubmitting} className="btn-secondary w-1/3">Back</button>
                  <button type="submit" disabled={isSubmitting} className="btn-primary w-2/3">
                    {isSubmitting ? 'Processing...' : 'Confirm Booking'}
                  </button>
                </div>
              </motion.div>
            )}
            
          </form>
        </motion.div>
      </div>
    </div>
  );
};

export default Booking;

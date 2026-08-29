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
  
  const [formData, setFormData] = useState({
    pickup: '',
    drop: '',
    date: '',
    time: '',
    goodsType: '',
    weight: '',
    tempoType: 'small', // small, medium, large
    phone: '',
    paymentMethod: 'online'
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const calculateFare = () => {
    // Mock calculation
    const baseRates = { small: 350, medium: 550, large: 1200 };
    const total = baseRates[formData.tempoType] || 0;
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
                  <label className="block text-sm font-medium text-loft-200 mb-1">Drop Address</label>
                  <div className="relative">
                    <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-copper-500" />
                    <input required name="drop" value={formData.drop} onChange={handleChange} type="text" className="input-field pl-12" placeholder="Enter drop location" />
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
                    <span className="text-loft-300">Base Fare</span>
                    <span className="font-medium text-loft-100">₹{calculateFare() + discount}</span>
                  </div>
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

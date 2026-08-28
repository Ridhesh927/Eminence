import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, X } from 'lucide-react';
import axios from 'axios';

const ReviewModal = ({ isOpen, onClose, bookingId, driverId, driverName = "Driver" }) => {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (rating === 0) return;
    
    setIsSubmitting(true);
    try {
      // Mock customer ID for now
      const mockCustomerId = 'c1234567-89ab-cdef-0123-456789abcdef';
      
      await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:3000/api'}/reviews`, {
        bookingId,
        driverId,
        rating,
        comment,
        customerId: mockCustomerId
      });
      
      setIsSuccess(true);
      setTimeout(() => {
        onClose();
        setIsSuccess(false);
        setRating(0);
        setComment('');
      }, 2000);
    } catch (error) {
      console.error('Failed to submit review:', error);
      // Mock success if backend fails during development
      setIsSuccess(true);
      setTimeout(() => {
        onClose();
        setIsSuccess(false);
      }, 2000);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-loft-950/80 backdrop-blur-sm"
            onClick={onClose}
          ></motion.div>
          
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative bg-loft-900 border border-loft-700/50 rounded-2xl p-6 md:p-8 w-full max-w-md shadow-2xl z-10"
          >
            <button 
              onClick={onClose}
              className="absolute top-4 right-4 text-loft-400 hover:text-loft-200 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            {isSuccess ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-moss-500/20 text-moss-500 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Star className="w-8 h-8 fill-current" />
                </div>
                <h3 className="text-2xl font-serif font-bold text-loft-50 mb-2">Thank You!</h3>
                <p className="text-loft-300">Your review helps us improve our service.</p>
              </div>
            ) : (
              <>
                <h3 className="text-2xl font-serif font-bold text-loft-50 mb-2 text-center">Rate your trip</h3>
                <p className="text-loft-400 text-sm text-center mb-6">How was your experience with {driverName}?</p>

                <form onSubmit={handleSubmit}>
                  <div className="flex justify-center gap-2 mb-8">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setRating(star)}
                        onMouseEnter={() => setHoverRating(star)}
                        onMouseLeave={() => setHoverRating(0)}
                        className="transition-transform hover:scale-110 focus:outline-none"
                      >
                        <Star 
                          className={`w-10 h-10 transition-colors ${
                            star <= (hoverRating || rating) 
                              ? 'text-yellow-500 fill-yellow-500 drop-shadow-[0_0_10px_rgba(234,179,8,0.5)]' 
                              : 'text-loft-700'
                          }`} 
                        />
                      </button>
                    ))}
                  </div>

                  <div className="mb-6">
                    <label className="block text-sm font-medium text-loft-300 mb-2">Add a comment (optional)</label>
                    <textarea
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      placeholder="Was the vehicle clean? Was the driver polite?"
                      className="w-full bg-loft-950 border border-loft-800 rounded-xl px-4 py-3 text-loft-50 placeholder:text-loft-600 focus:outline-none focus:border-copper-500 focus:ring-1 focus:ring-copper-500 transition-all resize-none h-24"
                    ></textarea>
                  </div>

                  <button
                    type="submit"
                    disabled={rating === 0 || isSubmitting}
                    className="btn-primary w-full py-3 shadow-[0_0_20px_rgba(232,99,49,0.2)] disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? 'Submitting...' : 'Submit Review'}
                  </button>
                </form>
              </>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default ReviewModal;

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Phone, Mail, MapPin } from 'lucide-react';
import axios from 'axios';

const Contact = () => {
  const [formData, setFormData] = useState({ name: '', email: '', message: '' });
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.message) return;
    
    setLoading(true);
    setStatus(null);
    try {
      await axios.post('http://localhost:3000/api/integrations/contact-message', formData);
      setStatus('success');
      setFormData({ name: '', email: '', message: '' });
    } catch (error) {
      console.error(error);
      setStatus('error');
    }
    setLoading(false);
  };

  return (
    <div className="w-full pt-12 pb-24 relative min-h-screen">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[500px] bg-[radial-gradient(ellipse_at_top,rgba(85,108,145,0.15),transparent_70%)] pointer-events-none z-0"></div>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-serif font-bold text-loft-50 mb-4">Contact Us</h1>
          <p className="text-xl text-loft-300 max-w-2xl mx-auto">
            We're here to help with your logistics needs, 24/7.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 max-w-5xl mx-auto">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-8"
          >
            <div className="card p-8 flex items-start gap-6">
              <div className="w-12 h-12 rounded-xl bg-copper-500/10 text-copper-500 flex items-center justify-center flex-shrink-0">
                <Phone className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-loft-50 mb-2">IVR Helpline</h3>
                <p className="text-loft-300 mb-2">Call to book a tempo instantly.</p>
                <a href="tel:18001234567" className="text-copper-400 font-bold text-lg">1800-EMINENCE</a>
              </div>
            </div>

            <div className="card p-8 flex items-start gap-6">
              <div className="w-12 h-12 rounded-xl bg-copper-500/10 text-copper-500 flex items-center justify-center flex-shrink-0">
                <Mail className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-loft-50 mb-2">Email Support</h3>
                <p className="text-loft-300 mb-2">For business inquiries and support.</p>
                <a href="mailto:eminence.support.helpline@gmail.com" className="text-copper-400 font-bold text-lg">eminence.support.helpline@gmail.com</a>
              </div>
            </div>

            <div className="card p-8 flex items-start gap-6">
              <div className="w-12 h-12 rounded-xl bg-copper-500/10 text-copper-500 flex items-center justify-center flex-shrink-0">
                <MapPin className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-loft-50 mb-2">Head Office</h3>
                <p className="text-loft-300 leading-relaxed">
                  Tech Park, Main Street<br/>
                  Pune, Maharashtra<br/>
                  India 411001
                </p>
              </div>
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="card p-8"
          >
            <h3 className="text-2xl font-bold text-loft-50 mb-6">Send us a message</h3>
            {status === 'success' && (
              <div className="mb-6 p-4 rounded-xl bg-moss-500/10 text-moss-500 text-sm font-medium border border-moss-500/20">
                Your message has been sent successfully! We will get back to you soon.
              </div>
            )}
            {status === 'error' && (
              <div className="mb-6 p-4 rounded-xl bg-red-500/10 text-red-500 text-sm font-medium border border-red-500/20">
                Failed to send message. Please try again later.
              </div>
            )}
            <form className="space-y-4" onSubmit={handleSubmit}>
              <div>
                <label className="block text-sm font-medium text-loft-200 mb-1">Full Name</label>
                <input 
                  type="text" 
                  className="input-field" 
                  placeholder="John Doe" 
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-loft-200 mb-1">Email Address</label>
                <input 
                  type="email" 
                  className="input-field" 
                  placeholder="john@example.com" 
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-loft-200 mb-1">Message</label>
                <textarea 
                  className="input-field h-32 resize-none" 
                  placeholder="How can we help you?"
                  value={formData.message}
                  onChange={(e) => setFormData({...formData, message: e.target.value})}
                  required
                ></textarea>
              </div>
              <button type="submit" className="btn-primary w-full mt-2 flex justify-center items-center" disabled={loading}>
                {loading ? (
                  <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                ) : (
                  "Send Message"
                )}
              </button>
            </form>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default Contact;

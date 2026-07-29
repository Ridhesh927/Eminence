import { motion } from 'framer-motion';
import { ArrowRight, Phone, Shield, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';

const Home = () => {
  return (
    <div className="w-full">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-surface py-20 lg:py-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <h1 className="text-5xl lg:text-7xl font-serif font-bold text-accent leading-tight mb-6">
                Transport Booking, <br/>
                <span className="text-primary">Redefined.</span>
              </h1>
              <p className="text-xl text-secondary mb-10 max-w-lg leading-relaxed">
                Book a tempo seamlessly online, or simply dial our smart IVR helpline. We remember your routes so you don't have to.
              </p>
              <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4">
                <Link to="/register" className="btn-primary text-lg px-8 py-4">
                  Start Booking <ArrowRight className="ml-2 w-5 h-5" />
                </Link>
                <div className="btn-secondary text-lg px-8 py-4 cursor-default">
                  <Phone className="mr-2 w-5 h-5" /> Call 1800-EMINENCE
                </div>
              </div>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="relative hidden lg:block"
            >
              {/* Mockup visualization */}
              <div className="w-full h-[500px] bg-white rounded-3xl shadow-soft border border-border/20 p-8 flex flex-col relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -mr-20 -mt-20"></div>
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-warning/5 rounded-full blur-3xl -ml-20 -mb-20"></div>
                
                <h3 className="text-2xl font-serif font-bold mb-6">Where to?</h3>
                <div className="space-y-4 relative z-10">
                  <div className="p-4 border border-border rounded-xl bg-surface flex items-center">
                    <div className="w-3 h-3 rounded-full bg-accent mr-4"></div>
                    <span className="text-secondary">Current Location</span>
                  </div>
                  <div className="pl-5 border-l-2 border-dashed border-border py-1"></div>
                  <div className="p-4 border border-border rounded-xl bg-white shadow-sm flex items-center">
                    <div className="w-3 h-3 rounded-none bg-primary mr-4"></div>
                    <span className="text-accent font-medium">Enter destination</span>
                  </div>
                </div>
                
                <div className="mt-auto">
                  <div className="h-12 bg-primary text-white rounded-full flex items-center justify-center font-medium shadow-sm">
                    Find Ride
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-serif font-bold text-accent mb-4">Why choose Eminence?</h2>
            <p className="text-secondary text-lg">Premium service meets intelligent automation.</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            {[
              { icon: Phone, title: "Smart IVR Booking", desc: "Repeat customers can book in seconds using their voice. No app required." },
              { icon: Clock, title: "Fast Allocation", desc: "Our system assigns the nearest available driver instantly for minimal wait times." },
              { icon: Shield, title: "Secure & Reliable", desc: "Verified drivers, real-time tracking, and secure digital payments." }
            ].map((feature, idx) => (
              <motion.div 
                key={idx}
                whileHover={{ y: -5 }}
                className="card p-8 transition-transform"
              >
                <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center mb-6 text-primary">
                  <feature.icon className="w-7 h-7" />
                </div>
                <h3 className="text-xl font-bold mb-3">{feature.title}</h3>
                <p className="text-secondary leading-relaxed">{feature.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;

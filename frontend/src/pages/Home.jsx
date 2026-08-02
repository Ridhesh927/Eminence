import { motion } from 'framer-motion';
import { ArrowRight, Phone, MessageSquare, Clock, MapPin, Search, CheckCircle2 } from 'lucide-react';
import { Link } from 'react-router-dom';

const Home = () => {
  return (
    <div className="w-full">
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-24 pb-32">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-[radial-gradient(ellipse_at_center,rgba(232,99,49,0.15),transparent_70%)] pointer-events-none"></div>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: "easeOut" }}
            className="max-w-4xl mx-auto"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-copper-500/20 bg-copper-500/10 text-copper-400 mb-8 font-medium tracking-wide text-sm">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-copper-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-copper-500"></span>
              </span>
              SMART TRANSPORT BOOKING
            </div>
            
            <h1 className="text-5xl md:text-7xl font-serif font-bold text-loft-50 leading-[1.1] mb-8 tracking-tight">
              Move your goods with <br/>
              <span className="glow-text">intelligent precision.</span>
            </h1>
            
            <p className="text-xl text-loft-300 mb-12 max-w-2xl mx-auto leading-relaxed">
              Book a tempo instantly via our web app or simply dial our smart IVR helpline without needing a smartphone.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link to="/booking" className="w-full sm:w-auto btn-primary text-lg px-8 py-4 shadow-[0_0_30px_rgba(232,99,49,0.2)]">
                Book a Tempo <ArrowRight className="ml-2 w-5 h-5" />
              </Link>
              <div className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-4 bg-moss-500/10 border border-moss-500/20 rounded-xl text-moss-300 font-medium">
                <Phone className="w-5 h-5" /> 1800-EMINENCE (IVR)
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 relative border-t border-loft-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h4 className="font-serif text-copper-500 font-bold tracking-widest text-sm uppercase mb-4">Why Eminence</h4>
            <h2 className="text-3xl md:text-5xl font-serif font-bold text-loft-50">Logistics without the friction.</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { icon: Phone, title: "IVR Helpline Booking", desc: "No smartphone? No problem. Call our automated system to book instantly." },
              { icon: CheckCircle2, title: "Never Repeat Details", desc: "Our system remembers your previous routes and preferences." },
              { icon: Clock, title: "Instant Allocation", desc: "Our algorithm finds the nearest available driver to minimize wait times." },
              { icon: MapPin, title: "Live Tracking", desc: "Track your goods in real-time with accurate ETA updates." },
              { icon: Search, title: "Smart Fare Estimates", desc: "Get transparent pricing before you book with zero hidden charges." },
              { icon: MessageSquare, title: "24/7 Support", desc: "Our customer success team is always ready to assist you." }
            ].map((feature, idx) => (
              <motion.div 
                key={idx}
                whileHover={{ y: -5 }}
                className="card p-8 group"
              >
                <div className="w-12 h-12 bg-copper-500/10 border border-copper-500/20 rounded-xl flex items-center justify-center mb-6 text-copper-500 group-hover:bg-copper-500/20 transition-colors">
                  <feature.icon className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-loft-50 mb-3">{feature.title}</h3>
                <p className="text-loft-300 leading-relaxed text-sm">{feature.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section className="py-24 relative border-t border-loft-900 bg-loft-900/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20">
            <h2 className="text-3xl md:text-5xl font-serif font-bold text-loft-50">How it works</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {[
              { num: "01", title: "Enter Details", desc: "Provide pickup and drop locations on web or call." },
              { num: "02", title: "Choose Tempo", desc: "Select the vehicle that fits your load and budget." },
              { num: "03", title: "Get Matched", desc: "We instantly assign the nearest verified driver." },
              { num: "04", title: "Track & Pay", desc: "Follow your goods live and pay securely online." }
            ].map((step, idx) => (
              <div key={idx} className="relative p-6 border-l-2 border-copper-500/30 hover:border-copper-500 transition-colors bg-gradient-to-r from-copper-500/5 to-transparent">
                <div className="absolute -top-4 right-4 text-7xl font-bold text-loft-800/30 z-0">{step.num}</div>
                <div className="relative z-10">
                  <h3 className="text-xl font-bold text-loft-50 mb-3">{step.title}</h3>
                  <p className="text-loft-300">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;

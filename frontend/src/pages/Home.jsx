import { motion } from 'framer-motion';
import { ArrowRight, Phone, MessageSquare, Clock, MapPin, Search, CheckCircle2 } from 'lucide-react';
import { Link } from 'react-router-dom';

const Home = () => {
  const containerVariants = {
    hidden: {},
    visible: {
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { duration: 0.5, ease: "easeOut" }
    }
  };

  return (
    <div className="w-full relative">
      {/* Dynamic Ambient Glowing Orbs */}
      <div className="absolute top-10 left-1/4 w-96 h-96 bg-copper-500/10 blur-[120px] rounded-full pointer-events-none animate-pulse duration-[800px] z-0"></div>
      <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-moss-500/10 blur-[120px] rounded-full pointer-events-none z-0"></div>

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-24 pb-32">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-[radial-gradient(ellipse_at_center,var(--glow-primary),transparent_70%)] pointer-events-none z-0"></div>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: "easeOut" }}
            className="max-w-4xl mx-auto"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-copper-500/20 bg-copper-500/10 text-copper-400 mb-8 font-medium tracking-wide text-sm shadow-[0_2px_10px_var(--glow-primary)]">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-copper-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-copper-500"></span>
              </span>
              SMART TRANSPORT BOOKING
            </div>
            
            <h1 className="text-5xl md:text-7xl font-serif font-bold text-loft-50 leading-[1.1] mb-6 tracking-tight">
              Moving Goods <span className="glow-text bg-gradient-to-r from-copper-400 to-copper-500 bg-clip-text text-transparent drop-shadow-[0_0_15px_var(--glow-primary)]">Made Easy</span>
            </h1>
            
            <p className="text-2xl text-loft-200 font-medium mb-2">
              Book a Tempo Online
            </p>
            <p className="text-lg text-copper-500 font-bold mb-2">OR</p>
            <p className="text-xl text-loft-300 mb-12 max-w-2xl mx-auto leading-relaxed">
              Call Our Helpline for Business Contracts
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
              <Link to="/booking" className="w-full sm:w-auto btn-primary text-lg px-10 py-4 shadow-[0_0_30px_rgba(232,99,49,0.2)] hover:scale-105 transition-all">
                Book Now <ArrowRight className="ml-2 w-5 h-5" />
              </Link>
              <Link to="/contracts" className="w-full sm:w-auto flex items-center justify-center gap-2 px-10 py-4 bg-moss-500/10 border border-moss-500/20 rounded-xl text-moss-300 font-medium hover:bg-moss-500/20 transition-all hover:scale-105">
                <Phone className="w-5 h-5" /> Call Now
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 relative border-t border-loft-900/60">
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
                className="card p-8 group flex flex-col justify-between"
              >
                <div>
                  <div className="w-12 h-12 bg-copper-500/10 border border-copper-500/20 rounded-xl flex items-center justify-center mb-6 text-copper-500 group-hover:bg-copper-500/20 group-hover:scale-110 group-hover:rotate-6 transition-all duration-300">
                    <feature.icon className="w-6 h-6" />
                  </div>
                  <h3 className="text-xl font-bold text-loft-50 mb-3 group-hover:text-copper-400 transition-colors">{feature.title}</h3>
                  <p className="text-loft-300 leading-relaxed text-sm">{feature.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section className="py-24 relative border-t border-loft-900/60 bg-loft-900/10 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20">
            <h2 className="text-3xl md:text-5xl font-serif font-bold text-loft-50">How it works</h2>
          </div>

          <motion.div 
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="grid grid-cols-1 md:grid-cols-4 gap-6 relative"
          >
            {[
              { num: "01", title: "Enter Details", desc: "Provide pickup and drop locations on web or call." },
              { num: "02", title: "Choose Tempo", desc: "Select the vehicle that fits your load and budget." },
              { num: "03", title: "Get Matched", desc: "We instantly assign the nearest verified driver." },
              { num: "04", title: "Track & Pay", desc: "Follow your goods live and pay securely online." }
            ].map((step, idx) => (
              <motion.div 
                key={idx}
                variants={itemVariants}
                className="relative p-8 rounded-2xl border border-loft-800/40 bg-loft-900/20 hover:bg-loft-900/40 transition-all duration-300 group hover:border-copper-500/20 hover:shadow-[0_8px_20px_var(--shadow-hover-color)] overflow-hidden"
              >
                <div className="absolute top-4 right-4 text-6xl font-serif font-bold text-loft-800/20 group-hover:text-copper-500/10 group-hover:scale-110 transition-all select-none z-0">{step.num}</div>
                <div className="relative z-10 flex flex-col h-full justify-between">
                  <div>
                    <span className="inline-block text-xs font-bold text-copper-500 tracking-wider mb-4 uppercase bg-copper-500/10 px-2.5 py-1 rounded-md">Step {step.num}</span>
                    <h3 className="text-xl font-bold text-loft-50 mb-3 group-hover:text-copper-400 transition-colors">{step.title}</h3>
                    <p className="text-loft-300 text-sm leading-relaxed">{step.desc}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>
    </div>
  );
};

export default Home;

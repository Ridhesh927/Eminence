import { motion } from 'framer-motion';
import { PhoneCall, Users, Truck, CheckCircle2 } from 'lucide-react';

const BusinessContracts = () => {
  const clients = [
    "Reliance Smart", "DMart", "Croma", "Vijay Sales", "Metro Cash & Carry", 
    "Local Kirana Stores", "Wholesalers", "Warehouses"
  ];

  return (
    <div className="w-full pt-12 pb-24 relative min-h-screen">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[500px] bg-[radial-gradient(ellipse_at_top,rgba(85,108,145,0.15),transparent_70%)] pointer-events-none z-0"></div>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-moss-500/20 bg-moss-500/10 text-moss-400 mb-6 font-medium tracking-wide text-sm">
            B2B LOGISTICS
          </div>
          <h1 className="text-4xl md:text-6xl font-serif font-bold text-loft-50 mb-6 leading-tight">
            Large companies don't <br/> repeatedly book online.
          </h1>
          <p className="text-xl text-loft-300 max-w-2xl mx-auto">
            Focus on your business while we handle your daily logistics with a dedicated manager and fleet.
          </p>
        </div>

        {/* Process */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-24 relative">
          <div className="hidden md:block absolute top-1/2 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-copper-500/30 to-transparent -translate-y-1/2 -z-10"></div>
          
          {[
            { icon: PhoneCall, title: "1. Call Helpline", desc: "Contact our dedicated B2B support team to express your requirements." },
            { icon: Users, title: "2. Our Team Visits", desc: "We visit your facility to understand your daily logistics load and operations." },
            { icon: Truck, title: "3. Dedicated Vehicle", desc: "We assign a dedicated vehicle and driver specifically for your company." }
          ].map((step, idx) => (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.2 }}
              key={idx} 
              className="card p-8 text-center bg-loft-950/90"
            >
              <div className="w-16 h-16 mx-auto bg-copper-500/10 border border-copper-500/20 rounded-full flex items-center justify-center text-copper-500 mb-6">
                <step.icon className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-loft-50 mb-3">{step.title}</h3>
              <p className="text-loft-300">{step.desc}</p>
            </motion.div>
          ))}
        </div>

        {/* Clients Section */}
        <div className="mb-24">
          <div className="text-center mb-12">
            <h3 className="text-2xl font-serif font-bold text-loft-50 mb-2">Trusted By</h3>
            <p className="text-loft-400">Businesses of all sizes rely on our contract services.</p>
          </div>
          
          <div className="flex flex-wrap justify-center gap-4">
            {clients.map((client, idx) => (
              <div key={idx} className="px-6 py-3 bg-loft-900/50 border border-loft-800 rounded-xl text-loft-200 font-medium">
                {client}
              </div>
            ))}
          </div>
        </div>

        {/* CTA Banner */}
        <div className="card p-10 md:p-16 text-center border-copper-500/30 bg-[radial-gradient(ellipse_at_center,rgba(232,99,49,0.1),transparent_70%)] relative overflow-hidden">
          <h2 className="text-3xl md:text-4xl font-serif font-bold text-loft-50 mb-4">
            Need Regular Transport?
          </h2>
          <p className="text-loft-300 text-lg mb-8 max-w-xl mx-auto">
            Get a dedicated manager and fixed pricing for your daily logistics.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
            <a href="tel:18001234567" className="w-full sm:w-auto btn-primary text-lg px-10 py-4 shadow-[0_0_30px_rgba(232,99,49,0.3)]">
              <PhoneCall className="mr-3 w-6 h-6" />
              Call Now
            </a>
            <div className="text-center sm:text-left">
              <p className="text-copper-400 font-bold text-xl">1800-XXX-XXXX</p>
              <p className="text-loft-400 text-sm">Contract Enquiry</p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default BusinessContracts;

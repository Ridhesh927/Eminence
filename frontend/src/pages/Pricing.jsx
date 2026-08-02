import { motion } from 'framer-motion';
import { Check } from 'lucide-react';

const Pricing = () => {
  const plans = [
    {
      name: "Small Tempo",
      desc: "Piaggio Ape / Tata Ace",
      weight: "Up to 750 kg",
      price: "₹350",
      perKm: "₹15/km",
      features: ["Ideal for small moves", "Fast city navigation", "Verified Driver", "Live Tracking"],
      popular: false
    },
    {
      name: "Medium Tempo",
      desc: "Mahindra Bolero Pickup",
      weight: "Up to 1500 kg",
      price: "₹550",
      perKm: "₹20/km",
      features: ["Perfect for 1 BHK shifting", "Commercial goods", "Verified Driver", "Live Tracking"],
      popular: true
    },
    {
      name: "Large Truck",
      desc: "Eicher 14ft / 17ft",
      weight: "Up to 3000 kg",
      price: "₹1200",
      perKm: "₹30/km",
      features: ["Industrial transport", "Heavy machinery", "Verified Driver", "Live Tracking"],
      popular: false
    }
  ];

  return (
    <div className="w-full pt-12 pb-24 relative min-h-screen">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[500px] bg-[radial-gradient(ellipse_at_top,rgba(85,108,145,0.15),transparent_70%)] pointer-events-none z-0"></div>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-serif font-bold text-loft-50 mb-4">Transparent Pricing</h1>
          <p className="text-xl text-loft-300 max-w-2xl mx-auto">
            No hidden charges. Know exactly what you'll pay before you book.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {plans.map((plan, idx) => (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.1 }}
              key={idx}
              className={`card relative p-8 ${plan.popular ? 'border-copper-500 shadow-[0_0_30px_rgba(232,99,49,0.1)]' : ''}`}
            >
              {plan.popular && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-copper-500 text-white px-4 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
                  Most Popular
                </div>
              )}
              
              <div className="mb-6">
                <h3 className="text-2xl font-bold text-loft-50 mb-1">{plan.name}</h3>
                <p className="text-loft-400 text-sm mb-4">{plan.desc} &bull; {plan.weight}</p>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-bold text-loft-50">{plan.price}</span>
                  <span className="text-loft-400">base fare</span>
                </div>
                <p className="text-copper-400 font-medium mt-1">+ {plan.perKm} after 2km</p>
              </div>
              
              <div className="space-y-4 mb-8">
                {plan.features.map((feature, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-5 h-5 rounded-full bg-moss-500/20 flex items-center justify-center text-moss-400">
                      <Check className="w-3 h-3" />
                    </div>
                    <span className="text-loft-200 text-sm">{feature}</span>
                  </div>
                ))}
              </div>
              
              <button className={`w-full py-3 rounded-xl font-medium transition-colors ${plan.popular ? 'bg-copper-600 hover:bg-copper-500 text-white' : 'bg-loft-800 hover:bg-loft-700 text-loft-50'}`}>
                Book Now
              </button>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Pricing;

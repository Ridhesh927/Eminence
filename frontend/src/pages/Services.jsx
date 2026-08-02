import { motion } from 'framer-motion';
import { Home, Store, Factory, Clock, CheckCircle2 } from 'lucide-react';
import { Link } from 'react-router-dom';

const Services = () => {
  const serviceCategories = [
    {
      title: "Household Shifting",
      icon: Home,
      desc: "Safe and secure transport for your personal belongings.",
      items: ["Beds & Mattresses", "Sofas & Furniture", "Washing Machines", "Refrigerators", "Bike Transport"]
    },
    {
      title: "Commercial Transport",
      icon: Store,
      desc: "Reliable logistics for your business needs.",
      items: ["Retail Shops", "Warehouses", "Kirana Stores", "Mall Deliveries", "Office Relocation"]
    },
    {
      title: "Industrial Transport",
      icon: Factory,
      desc: "Heavy-duty transport for industrial requirements.",
      items: ["Machinery & Equipment", "Raw Materials", "Construction Material", "Hardware Parts"]
    },
    {
      title: "Rental Tempo",
      icon: Clock,
      desc: "Flexible tempo rentals for custom transport needs.",
      items: ["Hourly Rentals", "Half Day (4-6 Hours)", "Full Day (8-12 Hours)"]
    }
  ];

  return (
    <div className="w-full pt-12 pb-24 relative min-h-screen">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[500px] bg-[radial-gradient(ellipse_at_top,rgba(85,108,145,0.15),transparent_70%)] pointer-events-none z-0"></div>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-serif font-bold text-loft-50 mb-4">Our Services</h1>
          <p className="text-xl text-loft-300 max-w-2xl mx-auto">
            Comprehensive transport solutions tailored for individuals and businesses across Pune.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
          {serviceCategories.map((category, idx) => (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.1 }}
              key={idx}
              className="card p-8"
            >
              <div className="flex items-center gap-4 mb-6">
                <div className="w-14 h-14 bg-copper-500/10 border border-copper-500/20 rounded-2xl flex items-center justify-center text-copper-500">
                  <category.icon className="w-7 h-7" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-loft-50">{category.title}</h2>
                  <p className="text-loft-400 text-sm">{category.desc}</p>
                </div>
              </div>
              
              <ul className="space-y-3">
                {category.items.map((item, i) => (
                  <li key={i} className="flex items-center gap-3 text-loft-200">
                    <CheckCircle2 className="w-5 h-5 text-moss-400 flex-shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>

        <div className="text-center">
          <Link to="/booking" className="btn-primary inline-flex px-10 py-4">
            Book a Tempo Now
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Services;

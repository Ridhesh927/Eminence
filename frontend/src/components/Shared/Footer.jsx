import { Link } from 'react-router-dom';
import { Truck, Phone, Mail, MapPin, ArrowRight } from 'lucide-react';

const Footer = () => {
  return (
    <footer className="bg-loft-950 border-t border-loft-900 pt-16 pb-8 relative overflow-hidden">
      {/* Decorative gradient */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-px bg-gradient-to-r from-transparent via-copper-500/50 to-transparent"></div>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Call to Action Banner */}
        <div className="bg-loft-900/60 border border-copper-500/20 rounded-2xl p-8 md:p-12 mb-16 relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(232,99,49,0.15),transparent_70%)] pointer-events-none"></div>
          <div className="relative z-10 max-w-2xl text-center md:text-left">
            <h3 className="text-3xl md:text-4xl font-serif font-bold text-loft-50 mb-4">
              Ready to move your goods?
            </h3>
            <p className="text-loft-300 text-lg">
              Book a tempo instantly or call our automated IVR system without needing a smartphone.
            </p>
          </div>
          <div className="relative z-10 flex-shrink-0 flex gap-4 w-full md:w-auto">
            <Link to="/booking" className="btn-primary py-4 px-8 w-full md:w-auto">
              Book Now <ArrowRight className="w-5 h-5 ml-2" />
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-12 mb-12">
          <div className="md:col-span-5">
            <div className="flex items-center gap-2 mb-6">
              <div className="bg-copper-500/10 p-2 rounded-lg">
                <Truck className="w-6 h-6 text-copper-500" />
              </div>
              <span className="text-2xl font-serif font-bold tracking-tight text-loft-50">
                EMIN<span className="text-copper-500">ENCE</span>
              </span>
            </div>
            <p className="text-loft-300 max-w-sm mb-6 leading-relaxed">
              The smart transport booking and helpline management system. Book your tempo online or simply call our IVR.
            </p>
          </div>
          
          <div className="md:col-span-3 md:col-start-7">
            <h4 className="font-serif font-bold text-loft-50 mb-6 uppercase tracking-wider text-sm">Platform</h4>
            <ul className="space-y-3">
              <li><Link to="/" className="text-loft-300 hover:text-copper-400 transition-colors flex items-center gap-2">Home</Link></li>
              <li><Link to="/services" className="text-loft-300 hover:text-copper-400 transition-colors flex items-center gap-2">Services</Link></li>
              <li><Link to="/contracts" className="text-loft-300 hover:text-copper-400 transition-colors flex items-center gap-2">Business Contracts</Link></li>
              <li><Link to="/pricing" className="text-loft-300 hover:text-copper-400 transition-colors flex items-center gap-2">Pricing</Link></li>
              <li><Link to="/tracking" className="text-loft-300 hover:text-copper-400 transition-colors flex items-center gap-2">Track Booking</Link></li>
            </ul>
          </div>
          
          <div className="md:col-span-3">
            <h4 className="font-serif font-bold text-loft-50 mb-6 uppercase tracking-wider text-sm">Contact</h4>
            <ul className="space-y-4">
              <li className="flex items-start gap-3 text-loft-300">
                <Phone className="w-5 h-5 text-copper-500 flex-shrink-0 mt-0.5" />
                <span>1800-EMINENCE</span>
              </li>
              <li className="flex items-start gap-3 text-loft-300">
                <Mail className="w-5 h-5 text-copper-500 flex-shrink-0 mt-0.5" />
                <span>eminence.support.helpline@gmail.com</span>
              </li>
              <li className="flex items-start gap-3 text-loft-300">
                <MapPin className="w-5 h-5 text-copper-500 flex-shrink-0 mt-0.5" />
                <span>Pune, Maharashtra<br/>India 411001</span>
              </li>
            </ul>
          </div>
        </div>
        
        <div className="border-t border-loft-900 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-loft-400 text-sm">&copy; {new Date().getFullYear()} EMINENCE. All rights reserved.</p>
          <div className="flex gap-4">
            <a href="#" className="text-loft-400 hover:text-loft-50 text-sm transition-colors">Privacy Policy</a>
            <a href="#" className="text-loft-400 hover:text-loft-50 text-sm transition-colors">Terms of Service</a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;

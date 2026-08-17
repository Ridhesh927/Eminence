import { Link } from 'react-router-dom';
import { Menu, Phone, Truck } from 'lucide-react';
import { useSelector } from 'react-redux';
import ThemeToggle from './ThemeToggle';

const Navbar = () => {
  const { isAuthenticated } = useSelector((state) => state.auth);

  return (
    <nav className="sticky top-0 z-50 bg-loft-950/80 backdrop-blur-md border-b border-loft-800/60 transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-20 items-center">
          {/* Left: Logo and Nav Links */}
          <div className="flex items-center gap-8 lg:gap-12">
            <Link to="/" className="flex items-center gap-2 group">
              <div className="bg-copper-500/10 p-2 rounded-lg group-hover:bg-copper-500/20 transition-colors">
                <Truck className="w-6 h-6 text-copper-500" />
              </div>
              <span className="text-2xl font-serif font-bold tracking-tight text-loft-50">
                EMIN<span className="text-copper-500">ENCE</span>
              </span>
            </Link>

            <div className="hidden md:flex items-center space-x-6 lg:space-x-8">
              {isAuthenticated ? (
                <>
                  <Link to="/booking" className="text-loft-300 hover:text-loft-50 font-medium transition-colors">Book Tempo</Link>
                  <Link to="/tracking" className="text-loft-300 hover:text-loft-50 font-medium transition-colors">Track Booking</Link>
                </>
              ) : (
                <>
                  <Link to="/services" className="text-loft-300 hover:text-loft-50 font-medium transition-colors">Services</Link>
                  <Link to="/contracts" className="text-loft-300 hover:text-loft-50 font-medium transition-colors hidden lg:block">Business Contracts</Link>
                  <Link to="/pricing" className="text-loft-300 hover:text-loft-50 font-medium transition-colors hidden lg:block">Pricing</Link>
                  <Link to="/about" className="text-loft-300 hover:text-loft-50 font-medium transition-colors hidden xl:block">About Us</Link>
                  <Link to="/contact" className="text-loft-300 hover:text-loft-50 font-medium transition-colors hidden xl:block">Contact</Link>
                </>
              )}
            </div>
          </div>
          
          {/* Right: Actions */}
          <div className="hidden md:flex items-center space-x-4 lg:space-x-6">
            <ThemeToggle />

            <div className="flex items-center gap-2 px-4 py-2 bg-moss-500/10 border border-moss-500/20 rounded-full text-moss-300 hover:bg-moss-500/20 transition-all cursor-pointer">
              <div className="w-2 h-2 rounded-full bg-moss-400 animate-pulse"></div>
              <Phone className="w-4 h-4" />
              <span className="font-semibold text-sm tracking-wide hidden lg:inline">IVR HELPLINE</span>
              <span className="font-semibold text-sm tracking-wide lg:hidden">IVR</span>
            </div>

            {isAuthenticated ? (
              <Link to="/customer/dashboard" className="btn-secondary rounded-xl py-2.5 px-6 whitespace-nowrap">
                Dashboard
              </Link>
            ) : (
              <div className="flex items-center space-x-4">
                <Link to="/login" className="text-loft-300 hover:text-loft-50 font-medium transition-colors whitespace-nowrap">
                  Sign In
                </Link>
                <Link to="/register" className="btn-primary py-2.5 px-6 shadow-lg shadow-copper-500/20 whitespace-nowrap">
                  Get Started
                </Link>
              </div>
            )}
          </div>

          <div className="md:hidden flex items-center gap-4">
            <ThemeToggle />
            <button className="p-2 text-loft-300 hover:text-loft-50 focus:outline-none bg-loft-900 rounded-lg">
              <Menu className="w-6 h-6" />
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;

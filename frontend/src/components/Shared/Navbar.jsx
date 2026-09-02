import { Link } from 'react-router-dom';
import { Menu, Phone, Truck } from 'lucide-react';
import { useSelector } from 'react-redux';


const Navbar = () => {
  const { isAuthenticated } = useSelector((state) => state.auth);

  return (
    <nav className="sticky top-0 z-50 bg-loft-950/80 backdrop-blur-md border-b border-loft-800/60 transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-20 items-center">
          {/* Left: Logo and Nav Links grouped together */}
          <div className="flex items-center gap-6 lg:gap-8">
            <Link to="/" className="flex items-center gap-2 group">
              <div className="bg-copper-500/10 p-2 rounded-lg group-hover:bg-copper-500/20 transition-colors">
                <Truck className="w-6 h-6 text-copper-500" />
              </div>
              <span className="text-2xl font-serif font-bold tracking-tight text-loft-50">
                EMIN<span className="text-copper-500">ENCE</span>
              </span>
            </Link>

            <div className="hidden md:flex items-center gap-5 lg:gap-6">
              {isAuthenticated ? (
                <>
                  <Link to="/booking" className="text-loft-300 hover:text-loft-50 font-medium transition-colors whitespace-nowrap">Book Tempo</Link>
                  <Link to="/tracking" className="text-loft-300 hover:text-loft-50 font-medium transition-colors whitespace-nowrap">Track Booking</Link>
                </>
              ) : (
                <>
                  <Link to="/services" className="text-loft-300 hover:text-loft-50 font-medium transition-colors whitespace-nowrap">Services</Link>
                  <Link to="/contracts" className="text-loft-300 hover:text-loft-50 font-medium transition-colors hidden lg:block whitespace-nowrap">Business Contracts</Link>
                  <Link to="/pricing" className="text-loft-300 hover:text-loft-50 font-medium transition-colors hidden lg:block whitespace-nowrap">Pricing</Link>
                  <Link to="/about" className="text-loft-300 hover:text-loft-50 font-medium transition-colors hidden xl:block whitespace-nowrap">About Us</Link>
                  <Link to="/contact" className="text-loft-300 hover:text-loft-50 font-medium transition-colors hidden xl:block whitespace-nowrap">Contact</Link>
                </>
              )}
            </div>
          </div>
          
          {/* Right: Actions */}
<<<<<<< HEAD
          <div className="hidden md:flex items-center gap-4 lg:gap-6">
            <ThemeToggle />
=======
>>>>>>> dd2921aa53649c5bee49cc42dece61627f6f1c0b

          <div className="hidden md:flex items-center space-x-4 lg:space-x-6">
            <a href="tel:18001234567" className="flex items-center gap-2 px-4 py-2 bg-moss-500/10 border border-moss-500/20 rounded-full text-moss-300 hover:bg-moss-500/20 transition-all cursor-pointer">
              <Phone className="w-4 h-4" />
              <span className="font-semibold text-sm tracking-wide hidden lg:inline">IVR HELPLINE</span>
              <span className="font-semibold text-sm tracking-wide lg:hidden">IVR</span>
            </a>

            {isAuthenticated ? (
              <Link to="/customer/dashboard" className="btn-secondary rounded-xl py-2.5 px-6 whitespace-nowrap">
                Dashboard
              </Link>
            ) : (
              <div className="flex items-center gap-4">
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

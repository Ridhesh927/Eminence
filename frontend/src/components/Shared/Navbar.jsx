import { Link } from 'react-router-dom';
import { Menu, User, Phone } from 'lucide-react';

const Navbar = () => {
  return (
    <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-border/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-20 items-center">
          <div className="flex items-center">
            <Link to="/" className="text-2xl font-serif font-bold tracking-tight text-primary">
              EMINENCE
            </Link>
          </div>
          
          <div className="hidden md:flex items-center space-x-8">
            <Link to="/" className="text-secondary hover:text-accent font-medium transition-colors">Home</Link>
            <div className="flex items-center text-secondary hover:text-accent font-medium transition-colors cursor-pointer">
              <Phone className="w-4 h-4 mr-2" />
              <span>Helpline: 1800-EMINENCE</span>
            </div>
            <Link to="/login" className="btn-secondary rounded-full py-2 px-5">
              Login
            </Link>
            <Link to="/register" className="btn-primary rounded-full py-2 px-5">
              Sign Up
            </Link>
          </div>

          <div className="md:hidden flex items-center">
            <button className="p-2 text-secondary hover:text-accent focus:outline-none">
              <Menu className="w-6 h-6" />
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;

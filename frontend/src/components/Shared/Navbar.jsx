import { Link, useNavigate } from 'react-router-dom';
import { Menu, Phone, Truck, LogOut } from 'lucide-react';
import { useSelector, useDispatch } from 'react-redux';
import { logout } from '../../redux/slices/authSlice';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

const Navbar = () => {
  const { isAuthenticated, user } = useSelector((state) => state.auth);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [ivrCopied, setIvrCopied] = useState(false);
  const { t, i18n } = useTranslation();

  const handleLanguageChange = (e) => {
    i18n.changeLanguage(e.target.value);
  };

  const handleLogout = () => {
    dispatch(logout());
    localStorage.removeItem('token');
    navigate('/');
  };

  return (
    <nav className="sticky top-0 z-50 bg-loft-950/80 backdrop-blur-md border-b border-loft-800/60 transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-20 items-center">
          {/* Left: Logo and Nav Links grouped together */}
          <div className="flex items-center gap-6 lg:gap-8">
            <Link to="/" className="flex items-center gap-2 group">
              <div className="bg-loft-950 p-1 rounded-lg border border-copper-500/30 group-hover:border-copper-500/60 transition-colors flex items-center justify-center overflow-hidden">
                <img src="/logo.jpg" alt="Eminence Logo" className="w-8 h-8 object-contain rounded-md" />
              </div>
              <span className="text-2xl font-serif font-bold tracking-tight text-loft-50">
                EMIN<span className="text-copper-500">ENCE</span>
              </span>
            </Link>

            <div className="hidden md:flex items-center gap-5 lg:gap-6">
              {isAuthenticated ? (
                <>
                  {(user?.role === 'customer' || user?.role === 'business') && (
                    <>
                      <Link to="/booking" className="text-loft-300 hover:text-loft-50 font-medium transition-colors whitespace-nowrap">{t('navbar.bookTempo')}</Link>
                      <Link to="/tracking" className="text-loft-300 hover:text-loft-50 font-medium transition-colors whitespace-nowrap">{t('navbar.trackBooking')}</Link>
                    </>
                  )}
                </>
              ) : (
                <>
                  <Link to="/services" className="text-loft-300 hover:text-loft-50 font-medium transition-colors whitespace-nowrap">{t('navbar.services')}</Link>
                  <Link to="/contracts" className="text-loft-300 hover:text-loft-50 font-medium transition-colors hidden lg:block whitespace-nowrap">{t('navbar.businessContracts')}</Link>
                  <Link to="/pricing" className="text-loft-300 hover:text-loft-50 font-medium transition-colors hidden lg:block whitespace-nowrap">{t('navbar.pricing')}</Link>
                  <Link to="/about" className="text-loft-300 hover:text-loft-50 font-medium transition-colors hidden xl:block whitespace-nowrap">{t('navbar.aboutUs')}</Link>
                  <Link to="/contact" className="text-loft-300 hover:text-loft-50 font-medium transition-colors hidden xl:block whitespace-nowrap">{t('navbar.contact')}</Link>
                </>
              )}
            </div>
          </div>
          
          {/* Right: Actions */}
          <div className="hidden md:flex items-center space-x-4 lg:space-x-6">
            
            <select 
              className="bg-loft-900 border border-loft-700 text-loft-300 text-sm rounded-lg focus:ring-copper-500 focus:border-copper-500 block p-1.5 cursor-pointer outline-none hover:bg-loft-800 transition-colors"
              value={i18n.language}
              onChange={handleLanguageChange}
            >
              <option value="en">Eng</option>
              <option value="hi">हिंदी</option>
              <option value="mr">मराठी</option>
            </select>

            <button 
              onClick={(e) => {
                e.preventDefault();
                navigator.clipboard.writeText('18001234567');
                setIvrCopied(true);
                setTimeout(() => setIvrCopied(false), 2000);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-moss-500/10 border border-moss-500/20 rounded-full text-moss-300 hover:bg-moss-500/20 transition-all cursor-pointer"
            >
              <Phone className="w-4 h-4" />
              <span className="font-semibold text-sm tracking-wide hidden lg:inline">
                {ivrCopied ? t('navbar.copied') : t('navbar.ivrHelpline')}
              </span>
              <span className="font-semibold text-sm tracking-wide lg:hidden">
                {ivrCopied ? t('navbar.copied') : 'IVR'}
              </span>
            </button>

            {isAuthenticated ? (
              <div className="flex items-center gap-3">
                <Link to={`/${user?.role || 'customer'}/dashboard`} className="btn-secondary rounded-xl py-2.5 px-6 whitespace-nowrap">
                  {t('navbar.dashboard')}
                </Link>
                <button 
                  onClick={handleLogout}
                  className="p-2.5 text-loft-400 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-all"
                  title="Sign Out"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-4">
                <Link to="/login" className="text-loft-300 hover:text-loft-50 font-medium transition-colors whitespace-nowrap">
                  {t('navbar.signIn')}
                </Link>
                <Link to="/register" className="btn-primary py-2.5 px-6 shadow-lg shadow-copper-500/20 whitespace-nowrap">
                  {t('navbar.getStarted')}
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

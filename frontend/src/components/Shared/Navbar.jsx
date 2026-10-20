import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Menu, Phone, LogOut, X } from 'lucide-react';
import { useSelector, useDispatch } from 'react-redux';
import { logout } from '../../redux/slices/authSlice';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import NotificationBell from './NotificationBell';


const Navbar = () => {
  const { isAuthenticated, user } = useSelector((state) => state.auth);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const isDashboard = location.pathname.includes('/dashboard') || location.pathname === '/wallet';
  const [ivrCopied, setIvrCopied] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { t, i18n } = useTranslation();

  const handleLanguageChange = (e) => {
    i18n.changeLanguage(e.target.value);
  };

  const handleLogout = () => {
    dispatch(logout());
    navigate('/');
  };

  return (
    <nav className="sticky top-0 z-50 bg-loft-950/80 backdrop-blur-md border-b border-loft-800/60 transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-20 items-center gap-4">
          {/* Left: Logo and Nav Links */}
          <div className="flex items-center gap-6 lg:gap-8 min-w-0">
            <Link to="/" className="flex items-center gap-2 group flex-shrink-0">
              <div className="bg-loft-950 p-1 rounded-lg border border-copper-500/30 group-hover:border-copper-500/60 transition-colors flex items-center justify-center overflow-hidden">
                <img src="/logo.jpg" alt="Eminence Logo" className="w-8 h-8 object-contain rounded-md" />
              </div>
              <span className="text-2xl font-serif font-bold tracking-tight text-loft-50">
                EMIN<span className="text-copper-500">ENCE</span>
              </span>
            </Link>

            <div className="hidden lg:flex items-center gap-6">
              {isAuthenticated ? (
                <>
                  {(user?.role === 'customer') && (
                    <>
                      <Link to="/booking" className="text-loft-300 hover:text-loft-50 font-medium transition-colors whitespace-nowrap">{t('navbar.bookTempo')}</Link>
                      <Link to="/tracking" className="text-loft-300 hover:text-loft-50 font-medium transition-colors whitespace-nowrap">{t('navbar.trackBooking')}</Link>
                    </>
                  )}
                </>
              ) : (
                <>
                  <Link to="/services" className="text-loft-300 hover:text-loft-50 font-medium transition-colors whitespace-nowrap">{t('navbar.services')}</Link>
                  <Link to="/pricing" className="text-loft-300 hover:text-loft-50 font-medium transition-colors whitespace-nowrap">{t('navbar.pricing')}</Link>
                  <Link to="/about" className="text-loft-300 hover:text-loft-50 font-medium transition-colors whitespace-nowrap">{t('navbar.aboutUs')}</Link>
                  <Link to="/contact" className="text-loft-300 hover:text-loft-50 font-medium transition-colors whitespace-nowrap">{t('navbar.contact')}</Link>
                </>
              )}
            </div>
          </div>
          
          {/* Right: Actions */}
          <div className="hidden md:flex items-center gap-3 lg:gap-5 flex-shrink-0">
            
            <select 
              className="bg-loft-900 border border-loft-700 text-loft-300 text-sm rounded-lg focus:ring-copper-500 focus:border-copper-500 block px-2.5 py-1.5 cursor-pointer outline-none hover:bg-loft-800 transition-colors flex-shrink-0"
              value={i18n.language}
              onChange={handleLanguageChange}
            >
              <option value="en">Eng</option>
              <option value="hi">हिंदी</option>
              <option value="mr">मराठी</option>
            </select>

            {!isDashboard && (
              <button 
                onClick={(e) => {
                  e.preventDefault();
                  navigator.clipboard.writeText('9970734425');
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
            )}

            {isAuthenticated ? (
              <div className="flex items-center gap-3">
                <NotificationBell role={user?.role} />
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

          <div className="md:hidden flex items-center gap-2">
            {isAuthenticated && <NotificationBell role={user?.role} />}
            <button 
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 text-loft-300 hover:text-loft-50 focus:outline-none bg-loft-900 rounded-lg transition-colors"
            >
              {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {isMobileMenuOpen && (
        <div className="md:hidden bg-loft-950 border-b border-loft-800/60 px-4 py-4 space-y-4">
          {isAuthenticated ? (
            <div className="flex flex-col space-y-3">
              {(user?.role === 'customer') && (
                <>
                  <Link to="/booking" onClick={() => setIsMobileMenuOpen(false)} className="text-loft-300 hover:text-loft-50 font-medium">{t('navbar.bookTempo')}</Link>
                  <Link to="/tracking" onClick={() => setIsMobileMenuOpen(false)} className="text-loft-300 hover:text-loft-50 font-medium">{t('navbar.trackBooking')}</Link>
                </>
              )}
              <Link to={`/${user?.role || 'customer'}/dashboard`} onClick={() => setIsMobileMenuOpen(false)} className="text-loft-300 hover:text-loft-50 font-medium">{t('navbar.dashboard')}</Link>
              <button onClick={() => { handleLogout(); setIsMobileMenuOpen(false); }} className="text-left text-red-400 hover:text-red-300 font-medium">Sign Out</button>
            </div>
          ) : (
            <div className="flex flex-col space-y-3">
              <Link to="/services" onClick={() => setIsMobileMenuOpen(false)} className="text-loft-300 hover:text-loft-50 font-medium">{t('navbar.services')}</Link>

              <Link to="/pricing" onClick={() => setIsMobileMenuOpen(false)} className="text-loft-300 hover:text-loft-50 font-medium">{t('navbar.pricing')}</Link>
              <Link to="/about" onClick={() => setIsMobileMenuOpen(false)} className="text-loft-300 hover:text-loft-50 font-medium">{t('navbar.aboutUs')}</Link>
              <Link to="/contact" onClick={() => setIsMobileMenuOpen(false)} className="text-loft-300 hover:text-loft-50 font-medium">{t('navbar.contact')}</Link>
              <div className="h-px bg-loft-800 my-2"></div>
              <Link to="/login" onClick={() => setIsMobileMenuOpen(false)} className="text-loft-300 hover:text-loft-50 font-medium">{t('navbar.signIn')}</Link>
              <Link to="/register" onClick={() => setIsMobileMenuOpen(false)} className="text-copper-500 font-medium">{t('navbar.getStarted')}</Link>
            </div>
          )}
        </div>
      )}
    </nav>
  );
};

export default Navbar;

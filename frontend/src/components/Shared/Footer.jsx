const Footer = () => {
  return (
    <footer className="bg-surface border-t border-border/50 pt-12 pb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          <div className="col-span-1 md:col-span-2">
            <h3 className="text-2xl font-serif font-bold text-primary mb-4">EMINENCE</h3>
            <p className="text-secondary max-w-sm">
              The smart transport booking and helpline management system. Book your tempo online or simply call our IVR.
            </p>
          </div>
          <div>
            <h4 className="font-bold text-accent mb-4">Quick Links</h4>
            <ul className="space-y-2">
              <li><a href="#" className="text-secondary hover:text-primary transition-colors">Home</a></li>
              <li><a href="#" className="text-secondary hover:text-primary transition-colors">Book a Ride</a></li>
              <li><a href="#" className="text-secondary hover:text-primary transition-colors">About Us</a></li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold text-accent mb-4">Support</h4>
            <ul className="space-y-2">
              <li><a href="#" className="text-secondary hover:text-primary transition-colors">Help Center</a></li>
              <li><a href="#" className="text-secondary hover:text-primary transition-colors">Contact</a></li>
              <li><a href="#" className="text-secondary hover:text-primary transition-colors">Privacy Policy</a></li>
            </ul>
          </div>
        </div>
        <div className="border-t border-border/50 pt-8 flex flex-col md:flex-row justify-between items-center">
          <p className="text-muted text-sm">&copy; {new Date().getFullYear()} Eminence. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;

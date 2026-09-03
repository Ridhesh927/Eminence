import Navbar from './Navbar';
import Footer from './Footer';
import ChatWidget from './ChatWidget';

const MainLayout = ({ children }) => {
  return (
    <div className="min-h-screen flex flex-col bg-background font-sans text-accent">
      <Navbar />
      <main className="flex-grow">
        {children}
      </main>
      <ChatWidget />
      <Footer />
    </div>
  );
};

export default MainLayout;

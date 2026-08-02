import { motion } from 'framer-motion';

const About = () => {
  return (
    <div className="w-full pt-12 pb-24 relative min-h-screen">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[500px] bg-[radial-gradient(ellipse_at_top,rgba(85,108,145,0.15),transparent_70%)] pointer-events-none z-0"></div>
      
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
        <h1 className="text-4xl md:text-5xl font-serif font-bold text-loft-50 mb-8">About Eminence</h1>
        
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="card p-8 md:p-12 text-left space-y-6"
        >
          <p className="text-loft-200 text-lg leading-relaxed">
            Eminence is Pune's leading smart transport management platform. We aim to revolutionize the logistics and tempo booking industry by bringing transparency, speed, and reliability to the process.
          </p>
          <p className="text-loft-200 text-lg leading-relaxed">
            Whether you are a student shifting a few bags, a family moving homes, or a large enterprise needing a dedicated fleet of transport vehicles, Eminence handles it all with our vast network of verified drivers.
          </p>
          <p className="text-loft-200 text-lg leading-relaxed">
            Our unique IVR Helpline allows businesses and individuals to book tempos instantly without even needing a smartphone or internet connection, making logistics truly accessible to everyone.
          </p>
        </motion.div>
      </div>
    </div>
  );
};

export default About;

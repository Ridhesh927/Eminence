import { motion } from 'framer-motion';
import { Sun, Moon, Sparkles } from 'lucide-react';
import { useTheme } from '../../utils/ThemeContext';

const ThemeToggle = () => {
  const { theme, setTheme } = useTheme();

  const themes = [
    { id: 'light', icon: Sun, label: 'Light Mode' },
    { id: 'dark', icon: Moon, label: 'Dark Mode' },
  ];

  return (
    <div className="relative flex items-center bg-loft-900/60 backdrop-blur-sm border border-loft-800/80 rounded-full p-1 select-none z-10">
      {themes.map((t) => {
        const Icon = t.icon;
        const isActive = theme === t.id;
        
        return (
          <button
            key={t.id}
            onClick={() => setTheme(t.id)}
            className={`relative flex items-center justify-center w-9 h-9 rounded-full transition-colors z-20 cursor-pointer focus:outline-none ${
              isActive ? 'text-copper-500' : 'text-loft-400 hover:text-loft-100'
            }`}
            title={t.label}
            aria-label={t.label}
          >
            {isActive && (
              <motion.div
                layoutId="activeTheme"
                transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                className="absolute inset-0 bg-loft-800/80 rounded-full border border-loft-700/60 z-0"
              />
            )}
            <Icon className="w-4 h-4 relative z-10 transition-transform duration-300 group-hover:scale-110" />
          </button>
        );
      })}
    </div>
  );
};

export default ThemeToggle;

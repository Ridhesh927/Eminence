import { useState, useEffect } from 'react';
import { ThemeContext } from './themeContextInstance';

export const ThemeProvider = ({ children }) => {
  const [theme, setThemeState] = useState(() => {
    const saved = localStorage.getItem('theme');
    if (saved && ['dark', 'light'].includes(saved)) {
      return saved;
    }
    // Check system preference or default to dark
    const prefersLight = window.matchMedia('(prefers-color-scheme: light)').matches;
    return prefersLight ? 'light' : 'dark';
  });

  const setTheme = (newTheme) => {
    if (['dark', 'light'].includes(newTheme)) {
      setThemeState(newTheme);
      localStorage.setItem('theme', newTheme);
    }
  };

  useEffect(() => {
    const root = document.documentElement;
    // Remove all possible theme attributes/classes if any (here we use data-theme)
    root.setAttribute('data-theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setThemeState((prev) => {
      const nextTheme = prev === 'dark' ? 'light' : 'dark';
      localStorage.setItem('theme', nextTheme);
      return nextTheme;
    });
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};


// src/context/ThemeContext.js
// Theme context provider for light/dark mode

import React, { createContext, useState, useEffect } from 'react';
import config from '../config';

// Create the theme context
export const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState(() => {
    const savedTheme = localStorage.getItem('theme');
    return savedTheme || 'light';
  });

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
  };

  useEffect(() => {
    localStorage.setItem('theme', theme);
    // Remove any existing theme classes first
    document.body.classList.remove('bg-dark', 'bg-light', 'dark-mode');
    // Add the new theme class
    if (theme === 'dark') {
      document.body.classList.add('bg-dark', 'dark-mode');
    } else {
      document.body.classList.add('bg-light');
    }
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

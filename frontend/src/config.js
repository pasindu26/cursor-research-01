// src/config.js
// Centralized configuration file for the application

const config = {
  // API configuration
  api: {
    baseURL: window._env_?.REACT_APP_BACKEND_URL || process.env.REACT_APP_BACKEND_URL || "http://localhost:5000",
    timeout: 30000, // 30 seconds
    retryAttempts: 3,
  },
  
  // Feature flags
  features: {
    enableDarkMode: true,
    enableNotifications: true,
    enableDataExport: true,
  },
  
  // UI configuration
  ui: {
    defaultTheme: 'light',
    animationsEnabled: true,
    tableRowsPerPage: 10,
  },
  
  // Data refresh intervals (in milliseconds)
  refreshIntervals: {
    dashboard: 60000, // 1 minute
    graphs: 300000,   // 5 minutes
    none: 0,          // No auto-refresh
  }
};

export default config;

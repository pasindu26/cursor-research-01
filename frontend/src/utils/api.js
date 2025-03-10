// src/utils/api.js
// Centralized API utility for making HTTP requests

import axios from 'axios';

// Get the backend URL from the injected _env_ variable or fallback to environment variable
// This approach supports both Kubernetes ConfigMap and standard React environment variables
const BASE_URL = window._env_?.REACT_APP_BACKEND_URL || process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000';

// Create an axios instance with default configuration
const api = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  }
});

// Request interceptor for adding auth token
api.interceptors.request.use(
  (config) => {
    // Special debugging for /check endpoint
    const isCheckEndpoint = config.url.endsWith('/check');
    if (isCheckEndpoint) {
      console.log('Making check auth request');
    }
    
    // Get token from session storage
    try {
      const sessionData = JSON.parse(localStorage.getItem('sessionData') || '{}');
      if (sessionData.token) {
        console.log(`Adding token to request: ${config.url} (token: ${sessionData.token.substring(0, 10)}...)`);
        config.headers.Authorization = `Bearer ${sessionData.token}`;
        
        if (isCheckEndpoint) {
          console.log('Full token for check request:', sessionData.token);
        }
      } else {
        console.log(`No token available for request: ${config.url}`);
      }
    } catch (error) {
      console.error('Error parsing session data:', error);
    }
    
    return config;
  },
  (error) => {
    console.error('Request interceptor error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor for handling common errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Log the error for debugging
    console.error('API Error:', {
      status: error.response?.status,
      message: error.message,
      url: error.config?.url,
      method: error.config?.method
    });
    
    // Handle 401 Unauthorized errors (token expired)
    if (error.response?.status === 401) {
      console.warn('Unauthorized access detected. Token may be expired.');
      
      // Only redirect if we're not already on the login page
      if (!window.location.pathname.includes('/login')) {
        // Clear session data
        localStorage.removeItem('sessionData');
        // Redirect with message
        window.location.href = '/login?message=Session expired. Please login again.';
      }
    }
    
    return Promise.reject(error);
  }
);

// API service functions
const apiService = {
  // Auth endpoints
  auth: {
    login: (credentials) => api.post('/login', credentials),
    signup: (userData) => api.post('/register', userData),
    logout: () => api.post('/logout').catch(err => {
      console.warn('Logout failed, but continuing client-side logout', err);
      return Promise.resolve({ data: { success: true } });
    }),
    checkAuth: () => api.get('/check'),
  },
  
  // Data endpoints that match the backend routes
  data: {
    getData: (params) => api.get('/api/data/sensor-data', { params }),
    getSummaryInsights: () => api.get('/api/data/dashboard/stats'),
    getWarnings: () => api.get('/api/data/warnings'),
    getRecentData: () => api.get('/api/data/recent-data'),
    getCorrelationData: (location = 'US') => api.get(`/api/data/correlation-data?location=${location}`),
    getAllData: () => api.get('/api/data/all-data'),
    getSensorData: (params) => api.get('/api/data/sensor-data', { params }),
    createSensorData: (data) => api.post('/api/data/sensor-data', data),
    updateSensorData: (id, data) => api.put(`/api/data/sensor-data/${id}`, data),
    deleteSensorData: (id) => api.delete(`/api/data/sensor-data/${id}`),
    getLast24HoursData: () => api.get('/api/data/last-24-hours'),
    getHighestValues: () => api.get('/api/data/highest-values'),
  },
  
  // Graph endpoints that match the backend routes
  graphs: {
    getGraphData: (params) => api.get('/api/data/graph-data', { params }),
    getCompareGraphData: (params) => api.get('/api/data/compare-graph-data', { params }),
  },
  
  // Admin endpoints
  admin: {
    getAllData: () => api.get('/api/data/sensor-data'),
    getUsers: () => api.get('/api/auth/users'),
    createData: (data) => api.post('/api/data/sensor-data', data),
    createRecord: (data) => api.post('/api/data/sensor-data', data),
    updateRecord: (id, data) => api.put(`/api/data/sensor-data/${id}`, data),
    deleteRecord: (id) => api.delete(`/api/data/sensor-data/${id}`),
  },
};

export default apiService;
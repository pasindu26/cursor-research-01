// src/context/AuthContext.js
// Authentication context provider

import React, { createContext, useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import apiService from '../utils/api';

// Create the auth context
export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [auth, setAuth] = useState({
    loggedIn: false,
    user: null,
    token: null,
    sessionExpiry: null
  });
  
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  // Session duration - 1 hour
  const SESSION_DURATION = 60 * 60 * 1000; // 1 hour
  const SESSION_CHECK_INTERVAL = 5 * 60 * 1000; // 5 minutes
  
  // Function to check if session is expired
  const isSessionExpired = (expiryTime) => {
    if (!expiryTime) return true;
    return new Date().getTime() > expiryTime;
  };

  // Function to set session data
  const setSession = (token, user) => {
    if (!token || !user) {
      console.error('Invalid session data: Token or user is missing');
      return;
    }
    
    const expiryTime = new Date().getTime() + SESSION_DURATION;
    const sessionData = {
      token,
      user,
      expiryTime,
      lastActivity: new Date().getTime()
    };
    
    try {
      console.log('Storing session data:', { 
        token: token.substring(0, 10) + '...', 
        user: user.username,
        expiryTime: new Date(expiryTime).toLocaleTimeString() 
      });
      localStorage.setItem('sessionData', JSON.stringify(sessionData));
      setAuth({
        loggedIn: true,
        user,
        token,
        sessionExpiry: expiryTime
      });
    } catch (error) {
      console.error('Error setting session:', error);
    }
  };

  // Function to clear session
  const clearSession = (message) => {
    try {
      localStorage.removeItem('sessionData');
      
      // Set auth state to logged out
      setAuth({
        loggedIn: false,
        user: null,
        token: null,
        sessionExpiry: null
      });
      
      // Only redirect if:
      // 1. We have a message to show
      // 2. We're not already on the login page
      // 3. We're not in the middle of a navigation
      if (
        message && 
        !location.pathname.includes('/login') &&
        !location.pathname.includes('/signup')
      ) {
        navigate('/login', { 
          state: { message }, 
          replace: true 
        });
      }
    } catch (error) {
      console.error('Error clearing session:', error);
    }
  };

  // Function to update last activity
  const updateLastActivity = useCallback(() => {
    try {
      const sessionData = JSON.parse(localStorage.getItem('sessionData'));
      if (sessionData) {
        sessionData.lastActivity = new Date().getTime();
        localStorage.setItem('sessionData', JSON.stringify(sessionData));
      }
    } catch (error) {
      console.error('Error updating last activity:', error);
    }
  }, []);

  // Initialize auth state from local storage on mount
  useEffect(() => {
    const initializeAuth = () => {
      try {
        const sessionDataStr = localStorage.getItem('sessionData');
        if (!sessionDataStr) {
          console.log('No session data found in localStorage');
          setLoading(false);
          return;
        }
        
        const sessionData = JSON.parse(sessionDataStr);
        if (!sessionData.token || !sessionData.user) {
          console.log('Invalid session data in localStorage');
          localStorage.removeItem('sessionData');
          setLoading(false);
          return;
        }
        
        // Check if session is expired
        if (sessionData.expiryTime && new Date().getTime() > sessionData.expiryTime) {
          console.log('Session expired on load, clearing session');
          localStorage.removeItem('sessionData');
          setLoading(false);
          return;
        }
        
        console.log('Restoring session from localStorage:', {
          user: sessionData.user.username,
          expiry: new Date(sessionData.expiryTime).toLocaleTimeString()
        });
        
        setAuth({
          loggedIn: true,
          user: sessionData.user,
          token: sessionData.token,
          sessionExpiry: sessionData.expiryTime
        });
      } catch (error) {
        console.error('Error initializing auth from localStorage:', error);
        localStorage.removeItem('sessionData');
      } finally {
        setLoading(false);
      }
    };
    
    initializeAuth();
  }, []);

  // Set up session check on mount
  useEffect(() => {
    let mounted = true;
    let checkInProgress = false;
    let sessionCheckInterval;
    let sessionCheckCount = 0;
    const maxConsecutiveFailures = 3;
    let consecutiveFailures = 0;

    const checkSession = async () => {
      // Prevent concurrent checks and limit excessive checks
      if (!mounted || checkInProgress) return;
      
      // Increment check count for debugging
      sessionCheckCount++;
      console.log(`Session check #${sessionCheckCount} started`);
      
      checkInProgress = true;
      
      try {
        // Check if we have session data
        const sessionDataStr = localStorage.getItem('sessionData');
        if (!sessionDataStr) {
          console.log('No session data found, skipping session check');
          checkInProgress = false;
          return;
        }
        
        const sessionData = JSON.parse(sessionDataStr);
        if (!sessionData.token) {
          console.log('No token found in session data, clearing session');
          clearSession();
          checkInProgress = false;
          return;
        }
        
        // Check if session is expired based on expiryTime
        if (sessionData.expiryTime && isSessionExpired(sessionData.expiryTime)) {
          console.log('Session expired based on expiry time');
          clearSession('Session expired. Please login again.');
          checkInProgress = false;
          return;
        }
        
        console.log('Checking session validity with token');
        const response = await apiService.auth.checkAuth();
        console.log('Session check response:', response.data);
        
        if (!response.data || response.data.status !== 'success') {
          console.log('Session check failed, clearing session');
          
          // Increment consecutive failures counter
          consecutiveFailures++;
          
          if (consecutiveFailures >= maxConsecutiveFailures) {
            clearSession('Session expired. Please login again.');
          } else {
            console.log(`Session check failed (${consecutiveFailures}/${maxConsecutiveFailures}), but not clearing yet`);
          }
        } else {
          console.log('Session check successful, user authenticated');
          // Reset consecutive failures counter on success
          consecutiveFailures = 0;
          
          // Update user data if needed
          if (response.data.user && JSON.stringify(response.data.user) !== JSON.stringify(sessionData.user)) {
            console.log('Updating user data from session check');
            setSession(sessionData.token, response.data.user);
          }
        }
      } catch (error) {
        console.error('Session check failed:', error);
        
        // Increment consecutive failures counter
        consecutiveFailures++;
        
        if (consecutiveFailures >= maxConsecutiveFailures) {
          clearSession('Session verification failed. Please login again.');
        } else {
          console.log(`Session check error (${consecutiveFailures}/${maxConsecutiveFailures}), but not clearing yet`);
        }
      } finally {
        checkInProgress = false;
      }
    };
    
    // Run session check immediately and then set up interval
    if (auth.loggedIn) {
      checkSession();
    }
    
    // Set up periodic session checks
    sessionCheckInterval = setInterval(checkSession, SESSION_CHECK_INTERVAL);

    return () => {
      mounted = false;
      clearInterval(sessionCheckInterval);
    };
  }, [auth.loggedIn, navigate, location.pathname, clearSession]);

  // Set up activity listener
  useEffect(() => {
    const activityEvents = ['mousedown', 'keydown', 'scroll', 'touchstart'];
    
    const handleActivity = () => {
      // Only update if the user is logged in
      if (auth.loggedIn) {
        updateLastActivity();
      }
    };

    activityEvents.forEach(event => {
      window.addEventListener(event, handleActivity);
    });

    return () => {
      activityEvents.forEach(event => {
        window.removeEventListener(event, handleActivity);
      });
    };
  }, [updateLastActivity, auth.loggedIn]);

  // Provide auth context to children
  return (
    <AuthContext.Provider value={{ 
      auth, 
      setAuth: (newAuth) => {
        if (newAuth.loggedIn && newAuth.token && newAuth.user) {
          setSession(newAuth.token, newAuth.user);
        } else {
          clearSession();
        }
      },
      clearSession,
      loading,
      updateLastActivity
    }}>
      {children}
    </AuthContext.Provider>
  );
};

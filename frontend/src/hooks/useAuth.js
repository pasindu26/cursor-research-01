// src/hooks/useAuth.js
// Custom hook for authentication functionality

import { useContext, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import apiService from '../utils/api';

const useAuth = () => {
  const { auth, setAuth, clearSession } = useContext(AuthContext);
  const navigate = useNavigate();

  // Login function
  const login = useCallback(async (credentials) => {
    try {
      console.log('Sending login request with credentials:', credentials);
      const response = await apiService.auth.login(credentials);
      console.log('Login response:', response.data);
      
      // Check if the login was successful based on the backend's response format
      if (response.data.status === 'success') {
        // Get token from response - could be in token or access_token field
        const token = response.data.token || response.data.access_token;
        const user = response.data.user;
        
        if (!token || !user) {
          console.error('Missing token or user data in successful response');
          return {
            success: false,
            message: 'Invalid response from server',
          };
        }
        
        console.log('Setting auth with token and user data');
        // Update auth context with session data
        setAuth({
          loggedIn: true,
          user,
          token,
        });

        // Redirect based on user type
        setTimeout(() => {
          navigate(user.user_type === 'admin' ? '/admin' : '/', { replace: true });
        }, 100);
        
        return { success: true };
      } else {
        return {
          success: false,
          message: response.data.message || 'Login failed',
        };
      }
    } catch (error) {
      console.error('Login error:', error);
      return {
        success: false,
        message: error.response?.data?.message || error.message || 'Invalid credentials',
      };
    }
  }, [setAuth, navigate]);

  // Signup function
  const signup = useCallback(async (userData) => {
    try {
      const response = await apiService.auth.signup(userData);
      return { success: true, data: response.data };
    } catch (error) {
      console.error('Signup error:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Signup failed. Please try again.',
      };
    }
  }, []);

  // Logout function
  const logout = useCallback(() => {
    // Try to call logout API but don't wait for it
    try {
      apiService.auth.logout().catch(err => console.warn('Logout API error:', err));
    } catch (error) {
      console.warn('Logout error:', error);
    }
    
    // Always clear the session
    clearSession();
  }, [clearSession]);

  // Check authentication status
  const checkAuthStatus = useCallback(async () => {
    try {
      const token = localStorage.getItem('authToken');
      
      if (!token) {
        setAuth({ loggedIn: false, user: null, token: null });
        return false;
      }
      
      const response = await apiService.auth.checkAuth();
      const { user } = response.data;
      
      setAuth({
        loggedIn: true,
        user,
        token,
      });
      
      return true;
    } catch (error) {
      console.error('Auth check error:', error);
      localStorage.removeItem('authToken');
      setAuth({ loggedIn: false, user: null, token: null });
      return false;
    }
  }, [setAuth]);

  return {
    isAuthenticated: auth.loggedIn,
    user: auth.user,
    login,
    signup,
    logout,
    checkAuthStatus,
  };
};

export default useAuth; 
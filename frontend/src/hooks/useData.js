// src/hooks/useData.js
// Custom hook for data fetching and management

import { useState, useEffect, useCallback } from 'react';
import apiService from '../utils/api';
import config from '../config';

const useData = (initialRefreshInterval = config.refreshIntervals.none) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [refreshInterval, setRefreshInterval] = useState(initialRefreshInterval);
  
  // Function to fetch data with a specific API call
  const fetchData = useCallback(async (apiCall, params = {}) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await apiCall(params);
      setData(response.data);
      return response.data;
    } catch (error) {
      console.error('Data fetch error:', error);
      setError(error.response?.data?.message || 'Failed to fetch data. Please try again.');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);
  
  // Function to fetch summary data
  const fetchSummary = useCallback((location) => {
    return fetchData(apiService.data.getSummary, location);
  }, [fetchData]);
  
  // Function to fetch warnings
  const fetchWarnings = useCallback(() => {
    return fetchData(apiService.data.getWarnings);
  }, [fetchData]);
  
  // Function to fetch recent data
  const fetchRecentData = useCallback((params) => {
    return fetchData(apiService.data.getRecentData, params);
  }, [fetchData]);
  
  // Function to fetch correlation data
  const fetchCorrelationData = useCallback((params) => {
    return fetchData(apiService.data.getCorrelationData, params);
  }, [fetchData]);
  
  // Function to fetch graph data
  const fetchGraphData = useCallback((params) => {
    return fetchData(apiService.graphs.getGraphData, params);
  }, [fetchData]);
  
  // Function to fetch comparison data
  const fetchComparisonData = useCallback((params) => {
    return fetchData(apiService.graphs.getComparisonData, params);
  }, [fetchData]);
  
  // Set up auto-refresh interval
  useEffect(() => {
    let intervalId = null;
    
    if (refreshInterval > 0) {
      intervalId = setInterval(() => {
        // Re-fetch data using the last successful API call
        if (data && !loading) {
          fetchData(data.lastApiCall, data.lastParams);
        }
      }, refreshInterval);
    }
    
    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [refreshInterval, data, loading, fetchData]);
  
  return {
    data,
    loading,
    error,
    fetchSummary,
    fetchWarnings,
    fetchRecentData,
    fetchCorrelationData,
    fetchGraphData,
    fetchComparisonData,
    setRefreshInterval,
    refreshInterval,
  };
};

export default useData; 
// src/utils/axiosConfig.js
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL;

// Flag to prevent multiple redirects
let isRedirecting = false;

// Store modal callback for later use
let sessionExpiredModalCallback = null;

// Function to set modal callback from React component
export const setSessionExpiredModal = (callback) => {
  sessionExpiredModalCallback = callback;
};

// Function to trigger session expired modal
export const showSessionExpiredModal = (message = 'Session expired. Please login again.') => {
  if (sessionExpiredModalCallback) {
    sessionExpiredModalCallback(message);
  }
};

// Create axios instance
const axiosInstance = axios.create({
  baseURL: API_URL,
});

// Request interceptor to add token
axiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle token expiration
axiosInstance.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    const originalRequest = error.config;
    
    // Check if error is due to token expiration (401 Unauthorized)
    if (error.response?.status === 401 && !originalRequest._retry) {
      
      // List of API endpoints that should NOT clear token/session
      // These are APIs that might return 401 for other reasons (invalid credentials, etc.)
      const skipSessionClearPaths = [
        '/admin/shipmozo-test',      // Shipmozo test API - might return 401 for invalid credentials
        '/admin/shipmozo/warehouses', // Shipmozo warehouses API
        '/admin/shipmozo-settings',   // Shipmozo settings API
        '/auth/login',                // Login API
        '/auth/login-with-pin-only',  // PIN login API
      ];
      
      // Check if current URL matches any skip path
      const shouldSkipClear = skipSessionClearPaths.some(path => 
        originalRequest.url?.includes(path)
      );
      
      // For Shipmozo APIs, just return the error without clearing session
      if (shouldSkipClear) {
        console.log('Shipmozo API error - returning error without clearing session');
        return Promise.reject(error);
      }
      
      // For other APIs, handle session expiration
      // Prevent infinite loops
      originalRequest._retry = true;
      
      // Clear all auth data
      localStorage.removeItem('token');
      localStorage.removeItem('userRole');
      localStorage.removeItem('admin_name');
      localStorage.removeItem('admin_email');
      localStorage.removeItem('userId');
      sessionStorage.removeItem('admin_notifications');
      
      // Show modal instead of alert
      showSessionExpiredModal('Session expired. Please login again.');
    }
    
    return Promise.reject(error);
  }
);

export default axiosInstance;
// src/utils/axiosConfig.js
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL;

// Flag to prevent multiple redirects
let isRedirecting = false;

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
      // Prevent infinite loops
      originalRequest._retry = true;
      
      // Clear all auth data
      localStorage.removeItem('token');
      localStorage.removeItem('userRole');
      localStorage.removeItem('admin_name');
      localStorage.removeItem('admin_email');
      localStorage.removeItem('userId');
      sessionStorage.removeItem('admin_notifications');
      
      // Redirect to login if not already redirecting
      if (!isRedirecting && window.location.pathname !== '/admin/login') {
        isRedirecting = true;
        
        // Show toast message if available
        if (window.toast) {
          window.toast.error('Session expired. Please login again.');
        } else {
          alert('Session expired. Please login again.');
        }
        
        // Redirect to login page
        window.location.href = '/admin/login';
        
        // Reset flag after redirect
        setTimeout(() => {
          isRedirecting = false;
        }, 1000);
      }
    }
    
    return Promise.reject(error);
  }
);

export default axiosInstance;
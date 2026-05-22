// src/hooks/useAuthCheck.js
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const useAuthCheck = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const checkAuth = () => {
      const token = localStorage.getItem('token');
      const userRole = localStorage.getItem('userRole');
      
      if (!token || !userRole) {
        navigate('/admin/login', { replace: true });
        return false;
      }
      
      // Optional: Check if token is expired
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        const exp = payload.exp * 1000; // Convert to milliseconds
        
        if (Date.now() >= exp) {
          // Token expired
          localStorage.clear();
          navigate('/admin/login', { replace: true });
          return false;
        }
      } catch (error) {
        console.error('Invalid token:', error);
        localStorage.clear();
        navigate('/admin/login', { replace: true });
        return false;
      }
      
      return true;
    };
    
    checkAuth();
    
    // Set up interval to check token expiration every minute
    const interval = setInterval(checkAuth, 60000);
    
    return () => clearInterval(interval);
  }, [navigate]);
};

export default useAuthCheck;
// src/utils/auth.js
export const logout = (navigate) => {
  // Clear all storage
  localStorage.clear();
  sessionStorage.clear();
  
  // Clear any other stored data
  localStorage.removeItem('token');
  localStorage.removeItem('userRole');
  localStorage.removeItem('admin_name');
  localStorage.removeItem('admin_email');
  localStorage.removeItem('userId');
  sessionStorage.removeItem('admin_notifications');
  
  // Navigate to login
  if (navigate) {
    navigate('/admin/login', { replace: true });
  } else {
    window.location.href = '/admin/login';
  }
};

export const isAuthenticated = () => {
  const token = localStorage.getItem('token');
  const userRole = localStorage.getItem('userRole');
  
  if (!token || !userRole) return false;
  
  // Check token expiration
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    const exp = payload.exp * 1000;
    if (Date.now() >= exp) return false;
  } catch {
    return false;
  }
  
  return true;
};
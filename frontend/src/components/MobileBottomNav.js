import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useUser } from '../context/UserContext';

const MobileBottomNav = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { cartItems, setIsCartOpen } = useCart();
  const { user, setShowLogin } = useUser();
  const token = localStorage.getItem("token");

  const navItems = [
    { icon: "bi bi-shop", label: "Shop", path: "/all-products", action: null },
    { icon: "bi bi-heart", label: "Wishlist", path: "/wishlist", requiresAuth: true },
    { icon: "bi bi-bag", label: "Cart", path: null, action: "cart", hasBadge: true },
    { icon: "bi bi-person", label: "Account", path: "/profile", requiresAuth: true, hasInitials: true }
  ];

  const handleNavigation = (item) => {
    if (item.action === "cart") {
      if (!token) {
        setShowLogin(true);
        return;
      }
      setIsCartOpen(true);
    } else {
      if (item.requiresAuth && !token) {
        setShowLogin(true);
        return;
      }
      if (item.path) {
        navigate(item.path);
      }
    }
  };

  const isActive = (item) => {
    if (item.path) {
      return location.pathname === item.path;
    }
    if (item.action === "cart") {
      return false;
    }
    return false;
  };

  const cartItemCount = cartItems?.length || 0;

  // Get user initials - same logic as desktop navbar
  const getUserInitials = () => {
    if (!token || !user) return null;
    // Try to get first name initial
    let firstInitial = "";
    let lastInitial = "";
    
    if (user.first_name && user.first_name.length > 0) {
      firstInitial = user.first_name[0].toUpperCase();
    } else if (user.name && user.name.length > 0) {
      firstInitial = user.name[0].toUpperCase();
    }
    
    if (user.last_name && user.last_name.length > 0) {
      lastInitial = user.last_name[0].toUpperCase();
    }
    
    if (lastInitial) {
      return `${firstInitial}${lastInitial}`;
    }
    return firstInitial;
  };

  const userInitials = getUserInitials();

  return (
    <div className="mobile-bottom-nav">
      {navItems.map((item, index) => (
        <div
          key={index}
          className={`mobile-bottom-nav-item ${isActive(item) ? 'active' : ''}`}
          onClick={() => handleNavigation(item)}
        >
          <div className={item.hasBadge ? "cart-badge-wrapper" : ""}>
            {item.hasInitials && token && userInitials ? (
              <div className="mobile-user-initials">
                {userInitials}
              </div>
            ) : (
              <i className={item.icon}></i>
            )}
            {item.hasBadge && cartItemCount > 0 && (
              <span className="mobile-cart-badge">{cartItemCount}</span>
            )}
          </div>
          <span>{item.label}</span>
        </div>
      ))}
    </div>
  );
};

export default MobileBottomNav;
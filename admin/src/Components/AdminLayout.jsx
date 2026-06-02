// AdminLayout.js - Sidebar + Mobile Navigation both working
import React, { useState, useEffect } from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";
import MobileNav from "./MobileNav/MobileNav";
import "./AdminLayout.css";

// Import AddProduct component for mobile FAB
import AddProduct from "../Pages/AddProduct";

const AdminLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    const saved = localStorage.getItem("sidebar_collapsed");
    // On mobile, sidebar should be collapsed (hidden) by default
    const isMobile = window.innerWidth <= 768;
    if (isMobile && saved === null) return true;
    return saved ? JSON.parse(saved) : false;
  });

  // State for mobile FAB modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  // Check if device is mobile
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth <= 768;
      setIsMobile(mobile);
      // On mobile, ensure sidebar is collapsed by default
      if (mobile) {
        const saved = localStorage.getItem("sidebar_collapsed");
        if (saved === null) {
          setIsSidebarCollapsed(true);
          localStorage.setItem("sidebar_collapsed", JSON.stringify(true));
        }
      }
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Get unread notification count for mobile badge
  useEffect(() => {
    const getUnreadCount = () => {
      const saved = sessionStorage.getItem("admin_notifications");
      if (saved) {
        const notifications = JSON.parse(saved);
        const unread = notifications.filter(n => n.unread).length;
        setUnreadCount(unread);
      }
    };

    getUnreadCount();
    const interval = setInterval(getUnreadCount, 5000);
    return () => clearInterval(interval);
  }, []);

  // Check token validity on mount and route changes
  useEffect(() => {
    const checkAuth = () => {
      const token = localStorage.getItem("token");
      const userRole = localStorage.getItem("userRole");

      if (!token || !userRole) {
        navigate("/admin/login", { replace: true });
      }
    };

    checkAuth();
  }, [navigate]);

  const toggleSidebar = () => {
    setIsSidebarCollapsed((prev) => {
      const newState = !prev;
      localStorage.setItem("sidebar_collapsed", JSON.stringify(newState));
      return newState;
    });
  };

  // Handle FAB click based on current page
  // Handle FAB click based on current page
  const handleFabClick = () => {
    const path = location.pathname;

    // Profile page - open profile edit on mobile
    if (path.includes("/admin/profile")) {
      window.dispatchEvent(new CustomEvent("openProfileEdit"));
    }
    // Products page - open Add Product modal
    else if (path.includes("/admin/products")) {
      setShowAddModal(true);
    }
    // Categories page - open Add Category modal (via custom event)
    else if (path.includes("/admin/categories")) {
      window.dispatchEvent(new CustomEvent("openAddCategoryModal"));
    }
    // Coupons page - open Add Coupon modal (via custom event)
    else if (path.includes("/admin/coupons")) {
      window.dispatchEvent(new CustomEvent("openAddCouponModal"));
    }
    // Vendor Pickup page - open Add Pickup Address modal
    else if (path.includes("/admin/vendor-pickup")) {
      window.dispatchEvent(new CustomEvent("openAddPickupAddressModal"));
    }
    // Orders page - refresh orders
    else if (path.includes("/admin/orders")) {
      window.dispatchEvent(new CustomEvent("refreshOrders"));
    }
    // Payouts page - open withdrawal request modal
    else if (path.includes("/admin/payouts")) {
      window.dispatchEvent(new CustomEvent("openWithdrawModal"));
    }
    // Wishlist page - refresh wishlist
    else if (path.includes("/admin/wishlist")) {
      window.dispatchEvent(new CustomEvent("refreshWishlist"));
    }
    // Stock Notifications page - refresh stock notifications
    else if (path.includes("/admin/stock-notifications")) {
      window.dispatchEvent(new CustomEvent("refreshStockNotifications"));
    }
    // Returns page - could refresh returns
    else if (path.includes("/admin/returns")) {
      window.dispatchEvent(new CustomEvent("refreshReturns"));
    }
    // Users page - could refresh users
    else if (path.includes("/admin/users")) {
      window.dispatchEvent(new CustomEvent("refreshUsers"));
    }
    // Banners page - could add banner
    else if (path.includes("/admin/banners")) {
      window.dispatchEvent(new CustomEvent("openAddBannerModal"));
    }
    // Default - console log
    else {
      console.log("No add action defined for this page:", path);
    }
  };

  const handleAddModalClose = () => {
    setShowAddModal(false);
    window.dispatchEvent(new CustomEvent("refreshProducts"));
  };

  return (
    <div className="admin-layout">
      {/* Sidebar - Always present, works on all devices */}
      <Sidebar isCollapsed={isSidebarCollapsed} toggleSidebar={toggleSidebar} />

      <div className={`admin-main ${isSidebarCollapsed ? 'collapsed' : ''}`}>
        <Topbar toggleSidebar={toggleSidebar} isSidebarCollapsed={isSidebarCollapsed} />
        <div className="admin-content">
          <Outlet context={{ isMobile }} />
        </div>

        {/* Mobile Navigation - Only visible on mobile devices */}
        {/* Sidebar is still accessible via the menu button in Topbar */}
        {isMobile && (
          <MobileNav onFabClick={handleFabClick} unreadCount={unreadCount} />
        )}
      </div>

      {/* Add Product Modal - triggered by FAB on products page */}
      {showAddModal && (
        <div className="product-modal-overlay" onClick={handleAddModalClose}>
          <div className="product-modal-content" onClick={(e) => e.stopPropagation()}>
            <AddProduct onClose={handleAddModalClose} />
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminLayout;
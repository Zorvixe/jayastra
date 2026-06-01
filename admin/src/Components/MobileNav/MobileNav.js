// MobileNav.jsx - Mobile Bottom Navigation Component
import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "./MobileNav.css";

const MobileNav = ({ onFabClick, unreadCount = 0 }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState("home");

  // Update active tab based on current route
  useEffect(() => {
    const path = location.pathname;
    if (path.includes("/admin/dashboard") || path === "/admin") {
      setActiveTab("home");
    } else if (path.includes("/admin/products")) {
      setActiveTab("products");
    } else if (path.includes("/admin/orders")) {
      setActiveTab("orders");
    } else if (path.includes("/admin/profile")) {
      setActiveTab("account");
    }
  }, [location]);

  const handleNavigation = (tab, path) => {
    setActiveTab(tab);
    navigate(path);
  };

  const navItems = [
    {
      id: "home",
      label: "Home",
      icon: "bi bi-house-door",
      path: "/admin/dashboard"
    },
    {
      id: "products",
      label: "Products",
      icon: "bi bi-box-seam",
      path: "/admin/products"
    },
    {
      id: "fab",
      label: "",
      icon: "bi bi-plus-lg",
      isFab: true
    },
    {
      id: "orders",
      label: "Orders",
      icon: "bi bi-cart-check",
      path: "/admin/orders"
    },
    {
      id: "account",
      label: "Account",
      icon: "bi bi-person-circle",
      path: "/admin/profile"
    }
  ];

  return (
    <div className="mobile-nav-container">
      <div className="mobile-nav">
        {navItems.map((item) => {
          if (item.isFab) {
            return (
              <div key={item.id} className="mobile-fab">
                <button className="fab-button" onClick={onFabClick}>
                  <i className={item.icon}></i>
                </button>
              </div>
            );
          }
          
          return (
            <button
              key={item.id}
              className={`mobile-nav-item ${activeTab === item.id ? "active" : ""}`}
              onClick={() => handleNavigation(item.id, item.path)}
            >
              <i className={item.icon}></i>
              <span>{item.label}</span>
              {item.id === "orders" && unreadCount > 0 && (
                <span className="mobile-nav-badge">{unreadCount > 9 ? "9+" : unreadCount}</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default MobileNav;
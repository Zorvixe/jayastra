// MobileNav.jsx - Mobile Bottom Navigation Component
import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import "./MobileNav.css";

const RAW_API_URL = process.env.REACT_APP_API_URL;
const REACT_APP_API_URL = RAW_API_URL.replace(/['"]/g, '');

const MobileNav = ({ onFabClick, unreadCount = 0 }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState("home");
  const [userInitials, setUserInitials] = useState("U");
  const [userName, setUserName] = useState("");

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

  // Fetch user profile to get initials
  useEffect(() => {
    const fetchUserProfile = async () => {
      const token = localStorage.getItem("token");
      if (!token) return;

      try {
        const res = await axios.get(`${REACT_APP_API_URL}/user/profile`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const user = res.data;
        let initials = "U";

        if (user.first_name && user.last_name) {
          initials = `${user.first_name.charAt(0)}${user.last_name.charAt(0)}`.toUpperCase();
          setUserName(`${user.first_name} ${user.last_name}`);
        } else if (user.name) {
          const nameParts = user.name.split(" ");
          if (nameParts.length >= 2) {
            initials = `${nameParts[0].charAt(0)}${nameParts[1].charAt(0)}`.toUpperCase();
          } else {
            initials = user.name.charAt(0).toUpperCase();
          }
          setUserName(user.name);
        } else if (user.email) {
          initials = user.email.charAt(0).toUpperCase();
          setUserName(user.email);
        }

        setUserInitials(initials);
      } catch (error) {
        console.error("Failed to fetch user profile:", error);
        // Try to get from localStorage as fallback
        const storedName = localStorage.getItem("admin_name");
        if (storedName) {
          const nameParts = storedName.split(" ");
          if (nameParts.length >= 2) {
            setUserInitials(`${nameParts[0].charAt(0)}${nameParts[1].charAt(0)}`.toUpperCase());
          } else {
            setUserInitials(storedName.charAt(0).toUpperCase());
          }
          setUserName(storedName);
        }
      }
    };

    fetchUserProfile();
  }, []);

  const handleNavigation = (tab, path) => {
    setActiveTab(tab);
    navigate(path);
  };

  // Check if we're on home tab to show initials instead of FAB
  const isHomeActive = activeTab === "home";

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
      label: "Wallet",
      icon: "bi bi-cash-coin",
      path: "/admin/payouts"
    }
  ];

  return (
    <div className="mobile-nav-container">
      <div className="mobile-nav">
        {navItems.map((item) => {
          if (item.isFab) {
            if (isHomeActive) {
              return (
                <div key={item.id} className="mobile-fab">
                  <button
                    className="fab-button user-initials-btn"
                    onClick={() => handleNavigation("account", "/admin/profile")}
                    title={userName || "My Account"}
                  >
                    <span className="user-initials">{userInitials}</span>
                  </button>
                </div>
              );
            }

            return (
              <div key={item.id} className="mobile-fab">
                <button
                  className="fab-button"
                  onClick={onFabClick}
                  title={activeTab === "account" ? "Edit Profile" : "Add"}
                >
                  <i className={activeTab === "account" ? "bi bi-pencil" : item.icon}></i>
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
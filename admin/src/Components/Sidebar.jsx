import React, { useState } from "react";
import { NavLink } from "react-router-dom";
import "./Sidebar.css";
import sarry_logo from "../assets/jayastra_banner.png";
import sarry_favicon from "../assets/jayastra-brown-favicon.png";

export const SidebarContext = React.createContext();

const Sidebar = ({ isCollapsed, toggleSidebar }) => {
  const [hoveredItem, setHoveredItem] = useState(null);
  const userRole = localStorage.getItem("userRole") || "user";

  const allMenuItems = [
    { path: "/admin/dashboard", icon: "bi bi-speedometer2", label: "Dashboard", roles: ["super_admin", "admin", "vendor"] },
    { path: "/admin/products", icon: "bi bi-box-seam", label: "Products", roles: ["super_admin", "admin", "vendor"] },
    { path: "/admin/categories", icon: "bi bi-grid", label: "Categories", roles: ["super_admin", "admin", "vendor"] },
    { path: "/admin/navigation", icon: "bi bi-list-ul", label: "Navigation / Menus", roles: ["super_admin"] },
    { path: "/admin/orders", icon: "bi bi-cart-check", label: "Orders", roles: ["super_admin", "admin", "vendor"] },
    { path: "/admin/payouts", icon: "bi bi-cash", label: "Wallet & Payouts", roles: ["super_admin", "admin", "vendor"] },
    { path: "/admin/stock-notifications", icon: "bi bi-bell", label: "Stock Notifications", roles: ["super_admin", "admin", "vendor"] },
    { path: "/admin/wishlist", icon: "bi bi-heart", label: "Wishlists", roles: ["super_admin", "admin", "vendor"] },
    { path: "/admin/returns", icon: "bi bi-arrow-return-left", label: "Returns / Verification", roles: ["super_admin", "admin", "vendor"] },
    { path: "/admin/reviews", icon: "bi bi-chat-left-dots", label: "Customer Reviews", roles: ["super_admin"] },
    { path: "/admin/users", icon: "bi bi-people", label: "Vendors / Users", roles: ["super_admin", "admin", "vendor"] },
    { path: "/admin/coupons", icon: "bi bi-ticket-perforated", label: "Coupons", roles: ["super_admin", "admin", "vendor"] },
    { path: "/admin/banners", icon: "bi bi-image", label: "Banners", roles: ["super_admin"] },
    { path: "/admin/vendor-pickup", icon: "bi bi-building", label: "Shipping", roles: ["super_admin", "admin", "vendor"] },
    { path: "/admin/platform-fee", icon: "bi bi-percent", label: "Platform Fee", roles: ["super_admin"] },
    { path: "/admin/reports", icon: "bi bi-bar-chart", label: "Reports", roles: ["super_admin", "admin", "vendor"] },
    { path: "/admin/settings", icon: "bi bi-gear", label: "Settings", roles: ["super_admin"] }
  ];

  // Filter based on role
  const menuItems = allMenuItems.filter(item => item.roles.includes(userRole));

  return (
    <div className={`admin-sidebar ${isCollapsed ? 'collapsed' : ''}`}>
      <div className="sidebar-logo-container">
        {!isCollapsed ? (
          <>
            <img src={sarry_logo} className="sidebar-logo" alt="Logo" />
            <button className="sidebar-mobile-close" onClick={toggleSidebar}>
              <i className="bi bi-x-lg"></i>
            </button>
          </>
        ) : (
          <img src={sarry_favicon} className="sidebar-favicon" alt="Favicon" />
        )}
      </div>
      <ul className="sidebar-menu">
        {menuItems.map((item) => (
          <li
            key={item.path}
            className="sidebar-menu-item"
            onMouseEnter={() => setHoveredItem(item.path)}
            onMouseLeave={() => setHoveredItem(null)}
          >
            <NavLink to={item.path} className="sidebar-link">
              <i className={item.icon}></i>
              {!isCollapsed && <span>{item.label}</span>}
              {isCollapsed && hoveredItem === item.path && (
                <div className="sidebar-tooltip">{item.label}</div>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default Sidebar;
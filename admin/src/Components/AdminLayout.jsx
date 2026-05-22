// AdminLayout.js - Updated version
import React, { useState, useEffect } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";
import "./AdminLayout.css";

const AdminLayout = () => {
  const navigate = useNavigate();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    const saved = localStorage.getItem("sidebar_collapsed");
    return saved ? JSON.parse(saved) : false;
  });

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

  return (
    <div className="admin-layout">
      <Sidebar isCollapsed={isSidebarCollapsed} toggleSidebar={toggleSidebar} />
      <div className={`admin-main ${isSidebarCollapsed ? 'collapsed' : ''}`}>
        <Topbar toggleSidebar={toggleSidebar} isSidebarCollapsed={isSidebarCollapsed} />
        <div className="admin-content">
          <Outlet />
        </div>
      </div>
    </div>
  );
};

export default AdminLayout;
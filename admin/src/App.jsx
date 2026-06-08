// App.js - Updated
import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

import AdminLayout from "./Components/AdminLayout";
import AdminLogin from "./Pages/AdminLogin";
import Dashboard from "./Pages/Dashboard";
import Products from "./Pages/Products";
import AddProduct from "./Pages/AddProduct";
import Categories from "./Pages/Categories";
import Orders from "./Pages/Orders";
import Payouts from "./Pages/Payouts/Payouts";
import Users from "./Pages/Users";
import Banners from "./Pages/Banners";
import Inventory from "./Pages/Inventory";
import Reports from "./Pages/Reports";
import Settings from "./Pages/Settings";
import EditProduct from "./Pages/EditProduct";
import Coupons from "./Pages/Coupons";
import Returns from "./Pages/Returns";
import Navigation from "./Pages/Navigation";
import Reviews from "./Pages/Reviews";
import StockNotifications from "./Pages/StockNotifications";
import Wishlist from "./Pages/Wishlist";
import VendorPickupAddresses from "./Pages/VendorPickupSettings/VendorPickupAddresses";
import PlatformFeeSettings from "./Pages/PlatformFeeSettings/PlatformFeeSettings";
import Profile from "./Pages/Profile/Profile";
import SessionExpiredModal from "./utils/SessionExpiredModal";
import { setSessionExpiredModal } from "./utils/axiosConfig";
import VendorWhatsAppSettings from "./Pages/VendorWhatsAppSettings/VendorWhatsAppSettings";
import AddCategoryModal from "./Pages/AddCategoryModal";

import NotFound from "./Pages/NotFound/NotFound";

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem("token");
  const userRole = localStorage.getItem("userRole");

  if (!token || !userRole) {
    return <Navigate to="/admin/login" replace />;
  }

  return children;
};

function AppContent() {
  const navigate = useNavigate();
  const [showSessionModal, setShowSessionModal] = useState(false);
  const [sessionModalMessage, setSessionModalMessage] = useState("");

  // Register modal callback with axiosConfig
  useEffect(() => {
    setSessionExpiredModal((message) => {
      setSessionModalMessage(message);
      setShowSessionModal(true);
    });
  }, []);

  const handleSessionExpiredConfirm = () => {
    setShowSessionModal(false);
    navigate("/admin/login", { replace: true });
    window.location.reload(); // Optional: Force reload to clear state
  };

  return (
    <>
      <ToastContainer position="top-right" autoClose={2000} />
      <SessionExpiredModal
        isOpen={showSessionModal}
        message={sessionModalMessage}
        onConfirm={handleSessionExpiredConfirm}
      />
      <Routes>
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route
          path="/admin"
          element={
            <ProtectedRoute>
              <AdminLayout />
            </ProtectedRoute>
          }
        >
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="products" element={<Products />} />
          <Route path="add-product" element={<AddProduct />} />
          <Route path="categories" element={<Categories />} />
          <Route path="orders" element={<Orders />} />
          <Route path="payouts" element={<Payouts />} />
          <Route path="users" element={<Users />} />
          <Route path="banners" element={<Banners />} />
          <Route path="stock-notifications" element={<StockNotifications />} />
          <Route path="wishlist" element={<Wishlist />} />
          <Route path="inventory" element={<Inventory />} />
          <Route path="reports" element={<Reports />} />
          <Route path="settings" element={<Settings />} />
          <Route path="coupons" element={<Coupons />} />
          <Route path="returns" element={<Returns />} />
          <Route path="reviews" element={<Reviews />} />
          <Route path="navigation" element={<Navigation />} />
          <Route path="edit-product/:id" element={<EditProduct />} />
          <Route path="vendor-pickup" element={<VendorPickupAddresses />} />
          <Route path="platform-fee" element={<PlatformFeeSettings />} />
          <Route path="profile" element={<Profile />} />
          <Route path="whatsapp-settings" element={<VendorWhatsAppSettings />} />
          <Route path="add-category" element={<AddCategoryModal />} />
        </Route>

        {/* Default redirect */}
        <Route path="/" element={<Navigate to="/admin/login" />} />
        <Route path="/admin/not-found" element={<NotFound />} />
        <Route path="/404" element={<NotFound />} />
        <Route path="*" element={<Navigate to="/404" replace />} />      </Routes>
    </>
  );
}

function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}

export default App;
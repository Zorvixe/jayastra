// Settings.jsx - Updated version with settings- prefix
import React, { useState, useEffect } from "react";
import axios from 'axios';
import { toast } from 'react-toastify';
import SettingshipRocket from "./ShiprocketSettings/ShiprocketSettings";

import DashBanner from "./DashBanner/DashBanner"

import "./Settings.css";

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const Settings = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({
    // Existing settings
    contactEmail: "",
    phone: "",
    taxPercent: 0,
    shippingCharge: 0,
    online_payment_discount: 0,
    cod_fee: 0,
    // Razorpay settings
    razorpay_key_id: "",
    razorpay_key_secret: "",
    // Platform fee
    platform_fee_percent: 10
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await axios.get(`${API_URL}/settings`);
      if (response.data.success) {
        const s = response.data.settings;
        setSettings({
          contactEmail: s.contactEmail || "",
          phone: s.phone || "",
          taxPercent: parseFloat(s.taxPercent || 0),
          shippingCharge: parseFloat(s.shippingCharge || 0),
          online_payment_discount: parseFloat(s.online_payment_discount || 0),
          cod_fee: parseFloat(s.cod_fee || 0),
          razorpay_key_id: s.razorpay_key_id || "",
          razorpay_key_secret: s.razorpay_key_secret || "",
          platform_fee_percent: parseFloat(s.platform_fee_percent || 10)
        });
      }
    } catch (err) {
      console.error("Failed to fetch settings", err);
      toast.error("Failed to load settings");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setSettings({
      ...settings,
      [name]: value
    });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const token = localStorage.getItem("token");

      // Validate Razorpay keys if provided
      if (settings.razorpay_key_id && settings.razorpay_key_secret) {
        if (settings.razorpay_key_id.length < 10) {
          toast.error("Razorpay Key ID seems invalid (too short)");
          setSaving(false);
          return;
        }
        if (settings.razorpay_key_secret.length < 10) {
          toast.error("Razorpay Key Secret seems invalid (too short)");
          setSaving(false);
          return;
        }
      }

      await axios.put(`${API_URL}/settings`, {
        settings: {
          contactEmail: settings.contactEmail,
          phone: settings.phone,
          taxPercent: settings.taxPercent,
          shippingCharge: settings.shippingCharge,
          online_payment_discount: settings.online_payment_discount,
          cod_fee: settings.cod_fee,
          razorpay_key_id: settings.razorpay_key_id,
          razorpay_key_secret: settings.razorpay_key_secret,
          platform_fee_percent: settings.platform_fee_percent
        }
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      toast.success("Settings Updated Successfully!");

      // Reload settings to confirm
      await fetchSettings();

    } catch (err) {
      console.error("Save error:", err);
      toast.error("Update failed: " + (err.response?.data?.error || err.message));
    } finally {
      setSaving(false);
    }
  };

  const handleResetSystem = async () => {
    if (!window.confirm("⚠️ WARNING: This will delete ALL orders, reviews, and non-admin users. This action CANNOT be undone. Are you sure?")) return;
    if (!window.confirm("FINAL CONFIRMATION: Clear all data and start fresh (keeping only admins and products)?")) return;

    try {
      const token = localStorage.getItem("token");
      await axios.post(`${API_URL}/admin/system/reset`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success("System Reset Successful! All test data has been cleared.");
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (err) {
      toast.error("Reset failed: " + (err.response?.data?.error || err.message));
    }
  };

  if (loading) return (
    <div className="settings-loader-overlay">
      <div className="settings-loader-container">
        <div className="settings-spinner"></div>
      </div>
    </div>
  );

  return (
    <div className="settings-container">
      <h4 className="settings-title">Settings & Configuration</h4>

      <DashBanner />


      <form onSubmit={handleSave} className="settings-form">

        {/* ================= CONTACT ================= */}
        <div className="settings-section">
          <h5 className="settings-section-title"><i className="bi bi-envelope"></i> Contact Information</h5>

          <div className="settings-form-group">
            <label className="settings-label">Contact Email</label>
            <input
              type="email"
              name="contactEmail"
              value={settings.contactEmail}
              onChange={handleChange}
              placeholder="Contact Email"
              className="settings-input"
            />
          </div>

          <div className="settings-form-group">
            <label className="settings-label">Phone Number</label>
            <input
              type="text"
              name="phone"
              value={settings.phone}
              onChange={handleChange}
              placeholder="Phone Number"
              className="settings-input"
            />
          </div>
        </div>

        {/* ================= RAZORPAY PAYMENT ================= */}
        <div className="settings-section">
          <h5 className="settings-section-title"><i className="bi bi-credit-card"></i> Razorpay Payment Gateway</h5>

          <div className="settings-form-group">
            <label className="settings-label">Razorpay Key ID</label>
            <input
              type="text"
              name="razorpay_key_id"
              value={settings.razorpay_key_id}
              onChange={handleChange}
              placeholder="rzp_live_xxxxxxxxxxxxxx or rzp_test_xxxxxxxxxxxxxx"
              className="settings-input"
            />
            <small className="settings-help-text">Your Razorpay Key ID (starts with rzp_)</small>
          </div>

          <div className="settings-form-group">
            <label className="settings-label">Razorpay Key Secret</label>
            <input
              type="password"
              name="razorpay_key_secret"
              value={settings.razorpay_key_secret}
              onChange={handleChange}
              placeholder="Your Razorpay Secret Key"
              className="settings-input"
            />
            <small className="settings-help-text">Your Razorpay Secret Key - keep this secure</small>
          </div>

          {settings.razorpay_key_id && settings.razorpay_key_secret && (
            <div className="settings-success-badge">
              <i className="bi bi-check-circle"></i> Razorpay credentials configured
            </div>
          )}
        </div>

        {/* ================= TAX & SHIPPING ================= */}
        <div className="settings-section">
          <h5 className="settings-section-title"><i className="bi bi-receipt"></i> Tax & Shipping</h5>

          <div className="settings-form-group">
            <label className="settings-label">Tax Percentage (%)</label>
            <input
              type="number"
              name="taxPercent"
              value={settings.taxPercent}
              onChange={handleChange}
              placeholder="Tax %"
              className="settings-input"
              step="0.01"
            />
            <small className="settings-help-text">Tax percentage to be applied on orders</small>
          </div>

          <div className="settings-form-group">
            <label className="settings-label">Shipping Charge (₹)</label>
            <input
              type="number"
              name="shippingCharge"
              value={settings.shippingCharge}
              onChange={handleChange}
              placeholder="Shipping Charge"
              className="settings-input"
              step="0.01"
            />
            <small className="settings-help-text">Flat shipping charge for all orders</small>
          </div>
        </div>

        {/* ================= PAYMENT ADJUSTMENTS ================= */}
        <div className="settings-section">
          <h5 className="settings-section-title"><i className="bi bi-currency-exchange"></i> Payment Adjustments</h5>

          <div className="settings-form-group">
            <label className="settings-label">Online Payment Discount (₹)</label>
            <input
              type="number"
              name="online_payment_discount"
              value={settings.online_payment_discount}
              onChange={handleChange}
              placeholder="e.g. 5"
              className="settings-input"
              step="0.01"
              min="0"
            />
            <small className="settings-help-text">This amount will be reduced from total for prepaid orders.</small>
          </div>

          <div className="settings-form-group">
            <label className="settings-label">Cash on Delivery Fee (₹)</label>
            <input
              type="number"
              name="cod_fee"
              value={settings.cod_fee}
              onChange={handleChange}
              placeholder="e.g. 50"
              className="settings-input"
              step="0.01"
              min="0"
            />
            <small className="settings-help-text">This amount will be added to total for COD orders.</small>
          </div>
        </div>

        {/* ================= PLATFORM FEE ================= */}
        <div className="settings-section">
          <h5 className="settings-section-title"><i className="bi bi-percent"></i> Platform Fee (Vendor Commission)</h5>

          <div className="settings-form-group">
            <label className="settings-label">Platform Fee Percentage (%)</label>
            <input
              type="number"
              name="platform_fee_percent"
              value={settings.platform_fee_percent}
              onChange={handleChange}
              placeholder="10"
              className="settings-input"
              step="0.5"
              min="0"
              max="100"
            />
            <small className="settings-help-text">
              Percentage deducted from each vendor's sale. Default: 10%
            </small>
          </div>
        </div>

        <div className="settings-form-actions">
          <button type="submit" className="settings-save-btn" disabled={saving}>
            <i className="bi bi-check-circle"></i> {saving ? "Saving..." : "Save Settings"}
          </button>
        </div>

      </form>

      <SettingshipRocket />

      {/* ================= DANGER ZONE ================= */}
      <div className="settings-danger-zone">
        <h5 className="settings-danger-title"><i className="bi bi-exclamation-triangle"></i> Danger Zone</h5>
        <p className="settings-danger-text">
          Reset the system to its initial state. This will permanently delete all orders, reviews, and customers while keeping your products and admin accounts.
        </p>
        <button
          className="settings-reset-btn"
          onClick={handleResetSystem}
        >
          Reset System Data
        </button>
      </div>

    </div>
  );
};

export default Settings;
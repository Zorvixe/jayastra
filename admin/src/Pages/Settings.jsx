import React, { useState } from "react";
import axios from '../utils/axiosConfig'; // Adjust path as needed
import "./Settings.css";

const Settings = () => {
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState({
    logo: null,
    logoPreview: "",
    contactEmail: "",
    phone: "",
    razorpayKey: "",
    razorpaySecret: "",
    taxPercent: 0,
    shippingCharge: 0,
    online_payment_discount: 0,
    cod_fee: 0
  });

  React.useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await axios.get(`${process.env.REACT_APP_API_URL}/settings`);
      if (response.data.success) {
        const s = response.data.settings;
        setSettings(prev => ({
          ...prev,
          contactEmail: s.contactEmail || "",
          phone: s.phone || "",
          razorpayKey: s.razorpayKey || "",
          razorpaySecret: s.razorpaySecret || "",
          taxPercent: parseFloat(s.taxPercent || 0),
          shippingCharge: parseFloat(s.shippingCharge || 0),
          online_payment_discount: parseFloat(s.online_payment_discount || 0),
          cod_fee: parseFloat(s.cod_fee || 0),
        }));
      }
    } catch (err) {
      console.error("Failed to fetch settings", err);
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

  const handleLogoUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSettings({
        ...settings,
        logo: file,
        logoPreview: URL.createObjectURL(file)
      });
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem("token");
      await axios.put(`${process.env.REACT_APP_API_URL}/settings`, {
        settings: {
          contactEmail: settings.contactEmail,
          phone: settings.phone,
          razorpayKey: settings.razorpayKey,
          razorpaySecret: settings.razorpaySecret,
          taxPercent: settings.taxPercent,
          shippingCharge: settings.shippingCharge,
          online_payment_discount: settings.online_payment_discount,
          cod_fee: settings.cod_fee
        }
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert("Settings Updated Successfully!");
    } catch (err) {
      alert("Update failed: " + (err.response?.data?.error || err.message));
    }
  };

  const handleResetSystem = async () => {
    if (!window.confirm("⚠️ WARNING: This will delete ALL orders, reviews, and non-admin users. This action CANNOT be undone. Are you sure?")) return;
    if (!window.confirm("FINAL CONFIRMATION: Clear all data and start fresh (keeping only admins and products)?")) return;

    try {
      const token = localStorage.getItem("token");
      await axios.post(`${process.env.REACT_APP_API_URL}/admin/system/reset`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert("System Reset Successful! All test data has been cleared.");
      window.location.reload();
    } catch (err) {
      alert("Reset failed: " + (err.response?.data?.error || err.message));
    }
  };

  if (loading) return <div className="dash-loader-overlay">
    <div className="dash-loader-container">
      <div className="dash-spinner"></div>
    </div>
  </div>;

  return (
    <div className="settings-container">

      <h4>Settings & Configuration</h4>

      <form onSubmit={handleSave} className="settings-form">

        {/* ================= LOGO ================= */}
        <div className="settings-section">
          <h5><i className="bi bi-image"></i> Website Logo</h5>

          <input type="file" onChange={handleLogoUpload} />

          {settings.logoPreview && (
            <div className="logo-preview">
              <img src={settings.logoPreview} alt="Logo Preview" />
            </div>
          )}
        </div>

        {/* ================= CONTACT ================= */}
        <div className="settings-section">
          <h5><i className="bi bi-envelope"></i> Contact Information</h5>

          <input
            type="email"
            name="contactEmail"
            value={settings.contactEmail}
            onChange={handleChange}
            placeholder="Contact Email"
          />

          <input
            type="text"
            name="phone"
            value={settings.phone}
            onChange={handleChange}
            placeholder="Phone Number"
          />
        </div>

        {/* ================= PAYMENT ================= */}
        <div className="settings-section">
          <h5><i className="bi bi-credit-card"></i> Razorpay Settings</h5>

          <input
            type="text"
            name="razorpayKey"
            value={settings.razorpayKey}
            onChange={handleChange}
            placeholder="Razorpay Key"
          />

          <input
            type="password"
            name="razorpaySecret"
            value={settings.razorpaySecret}
            onChange={handleChange}
            placeholder="Razorpay Secret"
          />
        </div>

        {/* ================= TAX & SHIPPING ================= */}
        <div className="settings-section">
          <h5><i className="bi bi-receipt"></i> Tax & Shipping</h5>

          <input
            type="number"
            name="taxPercent"
            value={settings.taxPercent}
            onChange={handleChange}
            placeholder="Tax %"
          />

          <input
            type="number"
            name="shippingCharge"
            value={settings.shippingCharge}
            onChange={handleChange}
            placeholder="Shipping Charge"
          />
        </div>

        {/* ================= PAYMENT ADJUSTMENTS ================= */}
        <div className="settings-section">
          <h5><i className="bi bi-currency-exchange"></i> Payment Adjustments</h5>

          <div className="p-field">
            <label>Online Payment Discount (₹)</label>
            <input
              type="number"
              name="online_payment_discount"
              value={settings.online_payment_discount}
              onChange={handleChange}
              placeholder="e.g. 5"
            />
            <small className="help-text">This amount will be reduced from total for prepaid orders.</small>
          </div>

          <div className="p-field" style={{ marginTop: '15px' }}>
            <label>Cash on Delivery Fee (₹)</label>
            <input
              type="number"
              name="cod_fee"
              value={settings.cod_fee}
              onChange={handleChange}
              placeholder="e.g. 50"
            />
            <small className="help-text">This amount will be added to total for COD orders.</small>
          </div>
        </div>

        <button type="submit" className="save-settings-btn">
          <i className="bi bi-check-circle"></i> Save Settings
        </button>

      </form>

      {/* ================= DANGER ZONE ================= */}
      <div className="danger-zone-section" style={{ marginTop: '50px', borderTop: '2px solid #fee2e2', paddingTop: '30px' }}>
        <h5 style={{ color: '#dc2626' }}><i className="bi bi-exclamation-triangle"></i> Danger Zone</h5>
        <p style={{ color: '#64748b', fontSize: '0.9rem' }}>
          Reset the system to its initial state. This will permanently delete all orders, reviews, and customers while keeping your products and admin accounts.
        </p>
        <button
          className="reset-btn"
          onClick={handleResetSystem}
          style={{
            background: '#fee2e2',
            color: '#dc2626',
            border: '1px solid #fecaca',
            padding: '10px 20px',
            borderRadius: '8px',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'all 0.3s'
          }}
          onMouseEnter={(e) => { e.target.style.background = '#dc2626'; e.target.style.color = '#fff'; }}
          onMouseLeave={(e) => { e.target.style.background = '#fee2e2'; e.target.style.color = '#dc2626'; }}
        >
          Reset System Data
        </button>
      </div>

    </div>
  );
};

export default Settings;

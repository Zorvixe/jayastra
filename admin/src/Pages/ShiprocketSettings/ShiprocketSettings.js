// src/admin/pages/ShiprocketSettings/ShiprocketSettings.jsx
import React, { useState, useEffect } from "react";
import axios from '../../utils/axiosConfig'; // Adjust path as needed
import { toast } from "react-toastify";
import "./ShiprocketSettings.css";

const API_URL = process.env.REACT_APP_API_URL;

const ShiprocketSettings = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [settings, setSettings] = useState({
    shiprocket_email: "",
    shiprocket_password: "",
    shiprocket_pickup_pincode: "",
    shiprocket_webhook_secret: ""
  });

  // For showing/hiding password
  const [showPassword, setShowPassword] = useState(false);
  const [showWebhookSecret, setShowWebhookSecret] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const response = await axios.get(`${API_URL}/admin/shiprocket-settings`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        setSettings({
          shiprocket_email: response.data.settings.shiprocket_email || "",
          shiprocket_password: response.data.settings.shiprocket_password || "",
          shiprocket_pickup_pincode: response.data.settings.shiprocket_pickup_pincode || "581322",
          shiprocket_webhook_secret: response.data.settings.shiprocket_webhook_secret || "JayastraWebhookSecure123"
        });
      }
    } catch (err) {
      console.error("Failed to fetch Shiprocket settings:", err);
      toast.error("Failed to load Shiprocket settings");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setSettings(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      const token = localStorage.getItem("token");
      await axios.put(`${API_URL}/admin/shiprocket-settings`, settings, {
        headers: { Authorization: `Bearer ${token}` }
      });

      toast.success("Shiprocket settings saved successfully!");

      // Refresh to show masked password
      await fetchSettings();
    } catch (err) {
      console.error("Save error:", err);
      toast.error(err.response?.data?.message || "Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  // Update the handleTestCredentials function
  const handleTestCredentials = async () => {
    if (!settings.shiprocket_email || !settings.shiprocket_password || settings.shiprocket_password === '********') {
      toast.error("Please enter valid email and password before testing");
      return;
    }

    setTesting(true);

    try {
      const token = localStorage.getItem("token");
      console.log("Testing credentials with email:", settings.shiprocket_email);

      const response = await axios.post(`${API_URL}/admin/shiprocket-test`, {
        email: settings.shiprocket_email,
        password: settings.shiprocket_password
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        toast.success(response.data.message || "Credentials are valid!");
      }
    } catch (err) {
      console.error("Test error:", err);
      if (err.response?.status === 401) {
        toast.error("Authentication failed. Please logout and login again.");
      } else {
        toast.error(err.response?.data?.message || "Invalid credentials. Please check your Shiprocket login details.");
      }
    } finally {
      setTesting(false);
    }
  };

  if (loading) {
    return (
      <div className="shiprocket-loader-overlay">
        <div className="shiprocket-loader-container">
          <div className="shiprocket-spinner"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="shiprocket-container">
      <h4 className="shiprocket-title">Shiprocket Logistics Settings</h4>
      <p className="shiprocket-description">Configure your Shiprocket account for order shipping and tracking.</p>

      <form onSubmit={handleSave} className="shiprocket-form">

        {/* Shiprocket Credentials Section */}
        <div className="shiprocket-section">
          <h5 className="shiprocket-section-title">
            <i className="bi bi-box-seam"></i> Shiprocket Account Credentials
          </h5>

          <div className="shiprocket-form-group">
            <label className="shiprocket-label">Shiprocket Email</label>
            <input
              type="email"
              name="shiprocket_email"
              value={settings.shiprocket_email}
              onChange={handleChange}
              placeholder="jayastrastore@gmail.com"
              className="shiprocket-input"
              required
            />
            <small className="shiprocket-help-text">Your Shiprocket account email address</small>
          </div>

          <div className="shiprocket-form-group">
            <label className="shiprocket-label">Shiprocket Password</label>
            <div className="shiprocket-password-wrapper">
              <input
                type={showPassword ? "text" : "password"}
                name="shiprocket_password"
                value={settings.shiprocket_password}
                onChange={handleChange}
                placeholder="Enter your Shiprocket password"
                className="shiprocket-input"
                required
              />
              <button
                type="button"
                className="shiprocket-password-toggle"
                onClick={() => setShowPassword(!showPassword)}
              >
                <i className={`bi ${showPassword ? "bi-eye-slash" : "bi-eye"}`}></i>
              </button>
            </div>
            <small className="shiprocket-help-text">Your Shiprocket account password (stored securely)</small>
          </div>

          <div className="shiprocket-form-actions-inline">
            <button
              type="button"
              className="shiprocket-test-btn"
              onClick={handleTestCredentials}
              disabled={testing}
            >
              {testing ? (
                <>
                  <div className="shiprocket-btn-spinner"></div>
                  Testing...
                </>
              ) : (
                <>
                  <i className="bi bi-check-circle"></i>
                  Test Credentials
                </>
              )}
            </button>
          </div>
        </div>

        {/* Shipping Configuration Section */}
        <div className="shiprocket-section">
          <h5 className="shiprocket-section-title">
            <i className="bi bi-geo-alt"></i> Shipping Configuration
          </h5>

          <div className="shiprocket-form-group">
            <label className="shiprocket-label">Default Pickup Pincode</label>
            <input
              type="text"
              name="shiprocket_pickup_pincode"
              value={settings.shiprocket_pickup_pincode}
              onChange={handleChange}
              placeholder="581322"
              className="shiprocket-input"
              maxLength="6"
              pattern="[0-9]{6}"
            />
            <small className="shiprocket-help-text">
              Your default warehouse/store pickup pincode. Used for shipping rate calculations.
            </small>
          </div>

          <div className="shiprocket-form-group">
            <label className="shiprocket-label">Webhook Secret (Optional)</label>
            <div className="shiprocket-password-wrapper">
              <input
                type={showWebhookSecret ? "text" : "password"}
                name="shiprocket_webhook_secret"
                value={settings.shiprocket_webhook_secret}
                onChange={handleChange}
                placeholder="JayastraWebhookSecure123"
                className="shiprocket-input"
              />
              <button
                type="button"
                className="shiprocket-password-toggle"
                onClick={() => setShowWebhookSecret(!showWebhookSecret)}
              >
                <i className={`bi ${showWebhookSecret ? "bi-eye-slash" : "bi-eye"}`}></i>
              </button>
            </div>
            <small className="shiprocket-help-text">
              Secret key used to verify Shiprocket webhook authenticity. Keep this secure.
            </small>
          </div>
        </div>

        {/* Webhook URL Section */}
        <div className="shiprocket-section">
          <h5 className="shiprocket-section-title">
            <i className="bi bi-link"></i> Webhook Configuration
          </h5>

          <div className="shiprocket-info-box">
            <i className="bi bi-info-circle-fill"></i>
            <div>
              <strong>Webhook URL to configure in Shiprocket Dashboard:</strong>
              <code className="shiprocket-webhook-url">
                {`${window.location.origin}/api/webhooks/shiprocket`}
              </code>
              <p className="shiprocket-webhook-help">
                Go to Shiprocket Dashboard → Settings → API → Webhooks. Add this URL and set the
                header <strong>x-api-key</strong> with your webhook secret above.
              </p>
            </div>
          </div>
        </div>

        <div className="shiprocket-form-actions">
          <button type="submit" className="shiprocket-save-btn" disabled={saving}>
            <i className="bi bi-check-circle"></i> {saving ? "Saving..." : "Save Settings"}
          </button>
        </div>
      </form>

      {/* Info Section */}
      <div className="shiprocket-info-section">
        <h5><i className="bi bi-question-circle"></i> Need Help?</h5>
        <ul>
          <li><strong>Shiprocket Account:</strong> Sign up at <a href="https://shiprocket.in" target="_blank" rel="noopener noreferrer">shiprocket.in</a></li>
          <li><strong>API Documentation:</strong> <a href="https://apiv2.shiprocket.in/v1/external" target="_blank" rel="noopener noreferrer">Shiprocket API Docs</a></li>
          <li><strong>Webhook Events:</strong> Configure to receive order status updates automatically</li>
          <li><strong>Pickup Address:</strong> Ensure your default pickup address is set in your Shiprocket account</li>
        </ul>
      </div>
    </div>
  );
};

export default ShiprocketSettings;
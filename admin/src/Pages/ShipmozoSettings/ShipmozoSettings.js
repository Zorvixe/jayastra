// src/admin/pages/ShipmozoSettings/ShipmozoSettings.jsx
import React, { useState, useEffect } from "react";
import axios from '../../utils/axiosConfig';
import { toast } from "react-toastify";
import "./ShipmozoSettings.css";

const API_URL = process.env.REACT_APP_API_URL;

const ShipmozoSettings = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testingWebhook, setTestingWebhook] = useState(false);
  const [fetchingWarehouses, setFetchingWarehouses] = useState(false);
  const [warehouses, setWarehouses] = useState([]);
  const [selectedWarehouse, setSelectedWarehouse] = useState("");
  const [settings, setSettings] = useState({
    shipmozo_username: "",
    shipmozo_password: "",
    shipmozo_pickup_pincode: "",
    shipmozo_webhook_secret: "",
    shipmozo_default_warehouse_id: "",
    shipmozo_default_warehouse_name: ""
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showWebhookSecret, setShowWebhookSecret] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const response = await axios.get(`${API_URL}/admin/shipmozo-settings`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        setSettings({
          shipmozo_username: response.data.settings.shipmozo_username || "",
          shipmozo_password: response.data.settings.shipmozo_password || "",
          shipmozo_pickup_pincode: response.data.settings.shipmozo_pickup_pincode || "518508",
          shipmozo_webhook_secret: response.data.settings.shipmozo_webhook_secret || "",
          shipmozo_default_warehouse_id: response.data.settings.shipmozo_default_warehouse_id || "",
          shipmozo_default_warehouse_name: response.data.settings.shipmozo_default_warehouse_name || ""
        });
        
        if (response.data.settings.shipmozo_default_warehouse_id) {
          setSelectedWarehouse(response.data.settings.shipmozo_default_warehouse_id);
        }
      }
    } catch (err) {
      console.error("Failed to fetch Shipmozo settings:", err);
      toast.error("Failed to load Shipmozo settings");
    } finally {
      setLoading(false);
    }
  };

  const fetchWarehouses = async () => {
    try {
      setFetchingWarehouses(true);
      const token = localStorage.getItem("token");
      const response = await axios.get(`${API_URL}/admin/shipmozo/warehouses`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.data.success && response.data.warehouses) {
        setWarehouses(response.data.warehouses);
        if (response.data.warehouses.length === 0) {
          toast.info("No warehouses found. Please create one in your Shipmozo dashboard first.");
        } else {
          toast.success(`Found ${response.data.warehouses.length} warehouse(s)`);
        }
      } else {
        toast.warning(response.data.message || "Could not fetch warehouses");
      }
    } catch (err) {
      console.error("Failed to fetch warehouses:", err);
      toast.error("Failed to fetch warehouses from Shipmozo");
    } finally {
      setFetchingWarehouses(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setSettings(prev => ({ ...prev, [name]: value }));
  };

  const handleWarehouseChange = (e) => {
    const warehouseId = e.target.value;
    setSelectedWarehouse(warehouseId);
    
    const selectedWarehouseObj = warehouses.find(w => w.id.toString() === warehouseId);
    if (selectedWarehouseObj) {
      setSettings(prev => ({
        ...prev,
        shipmozo_default_warehouse_id: warehouseId,
        shipmozo_default_warehouse_name: selectedWarehouseObj.address_title || selectedWarehouseObj.name
      }));
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      const token = localStorage.getItem("token");
      await axios.put(`${API_URL}/admin/shipmozo-settings`, settings, {
        headers: { Authorization: `Bearer ${token}` }
      });

      toast.success("Shipmozo settings saved successfully!");
      await fetchSettings();
    } catch (err) {
      console.error("Save error:", err);
      toast.error(err.response?.data?.message || "Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const handleTestCredentials = async () => {
    if (!settings.shipmozo_username || !settings.shipmozo_password || settings.shipmozo_password === '********') {
      toast.error("Please enter valid username and password before testing");
      return;
    }

    setTesting(true);

    try {
      const token = localStorage.getItem("token");
      const response = await axios.post(`${API_URL}/admin/shipmozo-test`, {
        username: settings.shipmozo_username,
        password: settings.shipmozo_password
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        toast.success(response.data.message || "Credentials are valid!");
        // After successful test, fetch warehouses
        await fetchWarehouses();
      }
    } catch (err) {
      console.error("Test error:", err);
      toast.error(err.response?.data?.message || "Invalid credentials. Please check your Shipmozo login details.");
    } finally {
      setTesting(false);
    }
  };

  const handleTestWebhook = async () => {
    setTestingWebhook(true);

    try {
      const response = await axios.get(`${API_URL}/webhooks/order-tracking`);

      if (response.data.success) {
        toast.success("✅ Webhook endpoint is reachable!");
      } else {
        toast.error("Webhook endpoint responded but with error");
      }
    } catch (err) {
      console.error("Webhook test error:", err);
      toast.error("❌ Webhook endpoint is not reachable. Please check your server configuration.");
    } finally {
      setTestingWebhook(false);
    }
  };

  // Get webhook URL
  const webhookUrl = `${window.location.origin}/api/webhooks/order-tracking`;

  if (loading) {
    return (
      <div className="notion-loader">
        <div className="notion-spinner"></div>
        <p>Loading settings...</p>
      </div>
    );
  }

  return (
    <div className="notion-settings">
      <div className="notion-header">
        <div className="notion-header-icon">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M3 9L12 3L21 9L12 15L3 9Z" stroke="#ffffff" strokeWidth="1.5" strokeLinejoin="round"/>
            <path d="M5 14L12 19L19 14" stroke="#ffffff" strokeWidth="1.5" strokeLinejoin="round"/>
            <path d="M5 10L12 15L19 10" stroke="#ffffff" strokeWidth="1.5" strokeLinejoin="round"/>
          </svg>
        </div>
        <div>
          <h1 className="notion-title">Shipmozo Integration</h1>
          <p className="notion-description">Connect your Shipmozo account to manage shipping and track orders</p>
        </div>
      </div>

      <form onSubmit={handleSave} className="notion-form">
        {/* Credentials Section */}
        <div className="notion-card">
          <div className="notion-card-header">
            <div className="notion-card-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M20 21V19C20 16.8 18.2 15 16 15H8C5.8 15 4 16.8 4 19V21" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                <circle cx="12" cy="7" r="4" stroke="currentColor" strokeWidth="1.5"/>
              </svg>
            </div>
            <div>
              <h3 className="notion-card-title">Account Credentials</h3>
              <p className="notion-card-subtitle">Enter your Shipmozo API credentials</p>
            </div>
          </div>

          <div className="notion-card-body">
            <div className="notion-field">
              <label className="notion-label">Username</label>
              <input
                type="text"
                name="shipmozo_username"
                value={settings.shipmozo_username}
                onChange={handleChange}
                placeholder="your-username@shipmozo.com"
                className="notion-input"
                required
              />
              <p className="notion-hint">The username used to login to your Shipmozo account</p>
            </div>

            <div className="notion-field">
              <label className="notion-label">Password</label>
              <div className="notion-input-wrapper">
                <input
                  type={showPassword ? "text" : "password"}
                  name="shipmozo_password"
                  value={settings.shipmozo_password}
                  onChange={handleChange}
                  placeholder="Enter your Shipmozo password"
                  className="notion-input"
                  required
                />
                <button
                  type="button"
                  className="notion-input-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
              <p className="notion-hint">Your Shipmozo account password (stored securely)</p>
            </div>

            <div className="notion-button-group">
              <button
                type="button"
                className="notion-button notion-button-secondary"
                onClick={handleTestCredentials}
                disabled={testing}
              >
                {testing ? (
                  <>
                    <span className="notion-spinner-small"></span>
                    Testing...
                  </>
                ) : (
                  "Test Connection"
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Warehouse Section */}
        <div className="notion-card">
          <div className="notion-card-header">
            <div className="notion-card-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 21C15.5 17.4 19 14.2 19 10C19 6.1 15.9 3 12 3C8.1 3 5 6.1 5 10C5 14.2 8.5 17.4 12 21Z" stroke="currentColor" strokeWidth="1.5"/>
                <circle cx="12" cy="10" r="3" stroke="currentColor" strokeWidth="1.5"/>
              </svg>
            </div>
            <div>
              <h3 className="notion-card-title">Warehouse Location</h3>
              <p className="notion-card-subtitle">Select the default warehouse for all shipments</p>
            </div>
          </div>

          <div className="notion-card-body">
            <div className="notion-field">
              <label className="notion-label">Default Warehouse</label>
              <div className="notion-select-wrapper">
                <select
                  value={selectedWarehouse}
                  onChange={handleWarehouseChange}
                  className="notion-select"
                  disabled={warehouses.length === 0}
                >
                  <option value="">Select a warehouse</option>
                  {warehouses.map(warehouse => (
                    <option key={warehouse.id} value={warehouse.id}>
                      {warehouse.address_title || warehouse.name} - {warehouse.city}, {warehouse.state} {warehouse.default === "YES" && "(Default)"}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  className="notion-refresh-btn"
                  onClick={fetchWarehouses}
                  disabled={fetchingWarehouses}
                  title="Refresh warehouses"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M1 12C1 12 4 4 12 4C17 4 19 7 20 9M23 12C23 12 20 20 12 20C7 20 5 17 4 15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                    <path d="M20 3V9H14M4 21V15H10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                </button>
              </div>
              {warehouses.length === 0 && (
                <div className="notion-warning">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 8V12M12 16H12.01M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="currentColor" strokeWidth="1.5"/>
                  </svg>
                  <span>No warehouses found. Click "Test Connection" first, then refresh.</span>
                </div>
              )}
              <p className="notion-hint">
                This warehouse will be used for all orders. Make sure it's created in your Shipmozo dashboard.
              </p>
            </div>

            <div className="notion-field">
              <label className="notion-label">Default Pickup Pincode</label>
              <input
                type="text"
                name="shipmozo_pickup_pincode"
                value={settings.shipmozo_pickup_pincode}
                onChange={handleChange}
                placeholder="518508"
                className="notion-input"
                maxLength="6"
                pattern="[0-9]{6}"
              />
              <p className="notion-hint">Your warehouse pincode for shipping rate calculations</p>
            </div>
          </div>
        </div>

        {/* Webhook Configuration Section */}
        <div className="notion-card">
          <div className="notion-card-header">
            <div className="notion-card-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M18 13V19C18 20.1 17.1 21 16 21H5C3.9 21 3 20.1 3 19V8C3 6.9 3.9 6 5 6H11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                <path d="M15 3H21V9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                <path d="M10 14L21 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </div>
            <div>
              <h3 className="notion-card-title">Webhook Configuration</h3>
              <p className="notion-card-subtitle">Set up webhooks for real-time order updates</p>
            </div>
          </div>

          <div className="notion-card-body">
            <div className="notion-field">
              <label className="notion-label">Webhook URL</label>
              <div className="notion-code-block">
                <code>{webhookUrl}</code>
                <button
                  type="button"
                  className="notion-copy-btn"
                  onClick={() => {
                    navigator.clipboard.writeText(webhookUrl);
                    toast.success("Webhook URL copied to clipboard");
                  }}
                >
                  Copy
                </button>
              </div>
              <p className="notion-hint">
                Add this URL to your Shipmozo dashboard → Settings → API → Webhooks
              </p>
            </div>

            <div className="notion-field">
              <label className="notion-label">Webhook Secret (Optional)</label>
              <div className="notion-input-wrapper">
                <input
                  type={showWebhookSecret ? "text" : "password"}
                  name="shipmozo_webhook_secret"
                  value={settings.shipmozo_webhook_secret}
                  onChange={handleChange}
                  placeholder="Enter a secure secret key"
                  className="notion-input"
                />
                <button
                  type="button"
                  className="notion-input-toggle"
                  onClick={() => setShowWebhookSecret(!showWebhookSecret)}
                >
                  {showWebhookSecret ? "Hide" : "Show"}
                </button>
              </div>
              <p className="notion-hint">
                Used to verify incoming webhook requests. Keep this secure.
              </p>
            </div>

            <div className="notion-button-group">
              <button
                type="button"
                className="notion-button notion-button-secondary"
                onClick={handleTestWebhook}
                disabled={testingWebhook}
              >
                {testingWebhook ? (
                  <>
                    <span className="notion-spinner-small"></span>
                    Testing...
                  </>
                ) : (
                  "Test Webhook Endpoint"
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="notion-footer">
          <button
            type="submit"
            className="notion-button notion-button-primary"
            disabled={saving}
          >
            {saving ? (
              <>
                <span className="notion-spinner-small"></span>
                Saving...
              </>
            ) : (
              "Save Settings"
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ShipmozoSettings;
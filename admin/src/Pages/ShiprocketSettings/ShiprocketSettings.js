// src/admin/pages/ShiprocketSettings/ShiprocketSettings.jsx
import React, { useState, useEffect } from "react";
import axios from '../../utils/axiosConfig';
import { toast } from "react-toastify";
import "./ShiprocketSettings.css";

const API_URL = process.env.REACT_APP_API_URL;

const ShiprocketSettings = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testingWebhook, setTestingWebhook] = useState(false);
  const [fetchingLocations, setFetchingLocations] = useState(false);
  const [debugging, setDebugging] = useState(false);
  const [pickupLocations, setPickupLocations] = useState([]);
  const [selectedPickupLocation, setSelectedPickupLocation] = useState("");
  const [debugInfo, setDebugInfo] = useState(null);
  const [showDebugPanel, setShowDebugPanel] = useState(false);
  const [settings, setSettings] = useState({
    shiprocket_email: "",
    shiprocket_password: "",
    shiprocket_pickup_pincode: "",
    shiprocket_webhook_secret: "",
    shiprocket_default_pickup_id: "",
    shiprocket_default_pickup_name: ""
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
      const response = await axios.get(`${API_URL}/admin/shiprocket-settings`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        setSettings({
          shiprocket_email: response.data.settings.shiprocket_email || "",
          shiprocket_password: response.data.settings.shiprocket_password || "",
          shiprocket_pickup_pincode: response.data.settings.shiprocket_pickup_pincode || "518508",
          shiprocket_webhook_secret: response.data.settings.shiprocket_webhook_secret || "",
          shiprocket_default_pickup_id: response.data.settings.shiprocket_default_pickup_id || "",
          shiprocket_default_pickup_name: response.data.settings.shiprocket_default_pickup_name || ""
        });

        if (response.data.settings.shiprocket_default_pickup_id) {
          setSelectedPickupLocation(response.data.settings.shiprocket_default_pickup_id);
        }
      }
    } catch (err) {
      console.error("Failed to fetch Shiprocket settings:", err);
      toast.error("Failed to load Shiprocket settings");
    } finally {
      setLoading(false);
    }
  };

  const fetchPickupLocations = async () => {
    try {
      setFetchingLocations(true);
      const token = localStorage.getItem("token");
      const response = await axios.get(`${API_URL}/shiprocket/pickup-locations`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      console.log("Pickup locations response:", response.data);

      if (response.data.success) {
        // Check different possible response formats
        let locations = [];
        if (response.data.pickup_locations && Array.isArray(response.data.pickup_locations)) {
          locations = response.data.pickup_locations;
        } else if (response.data.locations && Array.isArray(response.data.locations)) {
          locations = response.data.locations;
        } else if (response.data.data && Array.isArray(response.data.data)) {
          locations = response.data.data;
        }

        setPickupLocations(locations);

        if (locations.length === 0) {
          toast.info("No pickup locations found in Shiprocket. Please create one in your Shiprocket dashboard first.");
        } else {
          toast.success(`Found ${locations.length} pickup location(s)`);

          // Auto-select if there's a default saved
          if (settings.shiprocket_default_pickup_id) {
            const found = locations.find(loc =>
              loc.id === settings.shiprocket_default_pickup_id ||
              loc.pickup_location_id === settings.shiprocket_default_pickup_id
            );
            if (found) {
              setSelectedPickupLocation(found.id || found.pickup_location_id);
            }
          }
        }
      } else {
        toast.warning(response.data.message || "Could not fetch pickup locations");
      }
    } catch (err) {
      console.error("Failed to fetch pickup locations:", err);
      const errorMsg = err.response?.data?.message || err.message || "Failed to fetch pickup locations from Shiprocket";
      toast.error(errorMsg);
    } finally {
      setFetchingLocations(false);
    }
  };

  const runDebug = async () => {
    try {
      setDebugging(true);
      const token = localStorage.getItem("token");
      const response = await axios.get(`${API_URL}/admin/debug/shiprocket-full`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setDebugInfo(response.data);
      setShowDebugPanel(true);

      if (response.data.success) {
        toast.success("Debug info retrieved successfully");
      } else {
        toast.warning(response.data.message || "Issues detected with Shiprocket connection");
      }
    } catch (err) {
      console.error("Debug error:", err);
      toast.error("Failed to run debug");
    } finally {
      setDebugging(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setSettings(prev => ({ ...prev, [name]: value }));
  };

  const handlePickupLocationChange = (e) => {
    const locationId = e.target.value;
    setSelectedPickupLocation(locationId);

    const selectedLocation = pickupLocations.find(loc =>
      (loc.id === locationId) || (loc.pickup_location_id === locationId)
    );

    if (selectedLocation) {
      const locationName = selectedLocation.pickup_location || selectedLocation.name || "Selected Location";
      setSettings(prev => ({
        ...prev,
        shiprocket_default_pickup_id: locationId,
        shiprocket_default_pickup_name: locationName
      }));
    }
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
      await fetchSettings();
    } catch (err) {
      console.error("Save error:", err);
      toast.error(err.response?.data?.message || "Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const handleTestCredentials = async () => {
    if (!settings.shiprocket_email || !settings.shiprocket_email.trim()) {
      toast.error("Please enter your Shiprocket email address");
      return;
    }

    if (!settings.shiprocket_password || settings.shiprocket_password === '********') {
      toast.error("Please enter your Shiprocket password");
      return;
    }

    setTesting(true);

    try {
      const token = localStorage.getItem("token");
      const response = await axios.post(`${API_URL}/admin/shiprocket-test`, {
        email: settings.shiprocket_email,
        password: settings.shiprocket_password
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        toast.success(response.data.message || "✅ Credentials are valid! Shiprocket API is working correctly.");
        // After successful test, fetch pickup locations
        await fetchPickupLocations();
      }
    } catch (err) {
      console.error("Test error:", err);
      const errorMsg = err.response?.data?.message || "Invalid credentials. Please check your Shiprocket login details.";
      toast.error(errorMsg);

      // Show debug button if test fails
      if (!showDebugPanel) {
        toast.info("Click the Debug button below to see detailed connection info");
      }
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
            <path d="M20 7L9 18L4 13" stroke="#8E2139" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <div>
          <h1 className="notion-title">Shiprocket Integration</h1>
          <p className="notion-description">Connect your Shiprocket account to manage shipping and track orders</p>
        </div>
      </div>

      <form onSubmit={handleSave} className="notion-form">
        {/* Credentials Section */}
        <div className="notion-card">
          <div className="notion-card-header">
            <div className="notion-card-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M20 21V19C20 16.8 18.2 15 16 15H8C5.8 15 4 16.8 4 19V21" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                <circle cx="12" cy="7" r="4" stroke="currentColor" strokeWidth="1.5" />
              </svg>
            </div>
            <div>
              <h3 className="notion-card-title">Account Credentials</h3>
              <p className="notion-card-subtitle">Enter your Shiprocket API credentials</p>
            </div>
          </div>

          <div className="notion-card-body">
            <div className="notion-field">
              <label className="notion-label">Email Address</label>
              <input
                type="email"
                name="shiprocket_email"
                value={settings.shiprocket_email}
                onChange={handleChange}
                placeholder="your-email@shiprocket.com"
                className="notion-input"
                required
              />
              <p className="notion-hint">The email address used to login to your Shiprocket account</p>
            </div>

            <div className="notion-field">
              <label className="notion-label">Password</label>
              <div className="notion-input-wrapper">
                <input
                  type={showPassword ? "text" : "password"}
                  name="shiprocket_password"
                  value={settings.shiprocket_password}
                  onChange={handleChange}
                  placeholder="Enter your Shiprocket password"
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
              <p className="notion-hint">Your Shiprocket account password (stored securely)</p>
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
                    Testing Connection...
                  </>
                ) : (
                  "Test Connection"
                )}
              </button>

              <button
                type="button"
                className="notion-button notion-button-debug"
                onClick={runDebug}
                disabled={debugging}
              >
                {debugging ? (
                  <>
                    <span className="notion-spinner-small"></span>
                    Debugging...
                  </>
                ) : (
                  "🔍 Run Debug"
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Debug Panel */}
        {showDebugPanel && debugInfo && (
          <div className="notion-card notion-debug-card">
            <div className="notion-card-header">
              <div className="notion-card-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M20 12V8H16M4 12V8H8M12 4V20M8 8L4 12M16 8L20 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </div>
              <div>
                <h3 className="notion-card-title">Debug Information</h3>
                <p className="notion-card-subtitle">Shiprocket connection diagnostics</p>
              </div>
              <button
                type="button"
                className="notion-close-debug"
                onClick={() => setShowDebugPanel(false)}
              >
                ✕
              </button>
            </div>
            <div className="notion-card-body">
              <div className="debug-section">
                <h4>Credentials Status</h4>
                <div className="debug-status">
                  <span className="debug-label">Email configured:</span>
                  <span className={`debug-value ${debugInfo.debug_info?.credentials_check?.has_email ? 'success' : 'error'}`}>
                    {debugInfo.debug_info?.credentials_check?.has_email ? '✅ Yes' : '❌ No'}
                  </span>
                </div>
                <div className="debug-status">
                  <span className="debug-label">Password configured:</span>
                  <span className={`debug-value ${debugInfo.debug_info?.credentials_check?.has_password ? 'success' : 'error'}`}>
                    {debugInfo.debug_info?.credentials_check?.has_password ? '✅ Yes' : '❌ No'}
                  </span>
                </div>
              </div>

              <div className="debug-section">
                <h4>Authentication Status</h4>
                <div className="debug-status">
                  <span className="debug-label">Authentication:</span>
                  <span className={`debug-value ${debugInfo.debug_info?.authentication?.success ? 'success' : 'error'}`}>
                    {debugInfo.debug_info?.authentication?.success ? '✅ Success' : '❌ Failed'}
                  </span>
                </div>
                {debugInfo.debug_info?.authentication?.message && (
                  <div className="debug-message">{debugInfo.debug_info.authentication.message}</div>
                )}
              </div>

              <div className="debug-section">
                <h4>Pickup Locations</h4>
                <div className="debug-status">
                  <span className="debug-label">Locations found:</span>
                  <span className={`debug-value ${debugInfo.debug_info?.pickup_locations?.locations_count > 0 ? 'success' : 'warning'}`}>
                    {debugInfo.debug_info?.pickup_locations?.locations_count || 0}
                  </span>
                </div>
                {debugInfo.debug_info?.pickup_locations?.locations_count === 0 && (
                  <div className="debug-suggestion">
                    <strong>💡 Suggestion:</strong> No pickup locations found. Please add a pickup location in your Shiprocket dashboard:
                    <br />
                    1. Login to Shiprocket
                    <br />
                    2. Go to Settings → Company Details → Pickup Locations
                    <br />
                    3. Add a new pickup location with complete address (including house/flat/road number)
                    <br />
                    4. Save and then click "Refresh Pickup Locations" here
                  </div>
                )}
              </div>

              {debugInfo.debug_info?.pickup_locations?.response_preview && (
                <div className="debug-section">
                  <h4>API Response Preview</h4>
                  <pre className="debug-json">{debugInfo.debug_info.pickup_locations.response_preview.substring(0, 500)}</pre>
                </div>
              )}

              <div className="debug-recommendation">
                <strong>Recommendation:</strong> {debugInfo.recommendation || "Check your Shiprocket credentials and ensure API access is enabled."}
              </div>
            </div>
          </div>
        )}

        {/* Pickup Location Section */}
        <div className="notion-card">
          <div className="notion-card-header">
            <div className="notion-card-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 21C15.5 17.4 19 14.2 19 10C19 6.1 15.9 3 12 3C8.1 3 5 6.1 5 10C5 14.2 8.5 17.4 12 21Z" stroke="currentColor" strokeWidth="1.5" />
                <circle cx="12" cy="10" r="3" stroke="currentColor" strokeWidth="1.5" />
              </svg>
            </div>
            <div>
              <h3 className="notion-card-title">Pickup Location</h3>
              <p className="notion-card-subtitle">Select the default pickup location for all shipments</p>
            </div>
          </div>

          <div className="notion-card-body">
            <div className="notion-field">
              <label className="notion-label">Default Pickup Location</label>
              <div className="notion-select-wrapper">
                <select
                  value={selectedPickupLocation}
                  onChange={handlePickupLocationChange}
                  className="notion-select"
                  disabled={pickupLocations.length === 0}
                >
                  <option value="">-- Select a pickup location --</option>
                  {pickupLocations.map(loc => (
                    <option key={loc.id || loc.pickup_location_id} value={loc.id || loc.pickup_location_id}>
                      {loc.pickup_location || loc.name || "Unnamed"} - {loc.city}, {loc.state} ({loc.pincode})
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  className="notion-refresh-btn"
                  onClick={fetchPickupLocations}
                  disabled={fetchingLocations}
                  title="Refresh pickup locations"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M1 12C1 12 4 4 12 4C17 4 19 7 20 9M23 12C23 12 20 20 12 20C7 20 5 17 4 15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    <path d="M20 3V9H14M4 21V15H10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                </button>
              </div>
              {fetchingLocations && (
                <div className="notion-loading-hint">
                  <span className="notion-spinner-small"></span>
                  Fetching pickup locations...
                </div>
              )}
              {pickupLocations.length === 0 && !fetchingLocations && (
                <div className="notion-warning">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 8V12M12 16H12.01M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="currentColor" strokeWidth="1.5" />
                  </svg>
                  <span>No pickup locations found. Please click "Test Connection" first to authenticate, then refresh.</span>
                </div>
              )}
              <p className="notion-hint">
                This pickup location will be used for all orders. Make sure it's created in your Shiprocket dashboard.
              </p>
            </div>

            <div className="notion-field">
              <label className="notion-label">Default Pickup Pincode</label>
              <input
                type="text"
                name="shiprocket_pickup_pincode"
                value={settings.shiprocket_pickup_pincode}
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
                <path d="M18 13V19C18 20.1 17.1 21 16 21H5C3.9 21 3 20.1 3 19V8C3 6.9 3.9 6 5 6H11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                <path d="M15 3H21V9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                <path d="M10 14L21 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
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
                Add this URL to your Shiprocket dashboard → Settings → API → Webhooks
              </p>
            </div>

            <div className="notion-field">
              <label className="notion-label">Webhook Secret (Optional)</label>
              <div className="notion-input-wrapper">
                <input
                  type={showWebhookSecret ? "text" : "password"}
                  name="shiprocket_webhook_secret"
                  value={settings.shiprocket_webhook_secret}
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

export default ShiprocketSettings;
import React, { useState, useEffect } from 'react';
import axios from '../../utils/axiosConfig'; // Adjust path as needed
import { toast } from 'react-toastify';

const VendorWhatsAppSettings = () => {
  const [settings, setSettings] = useState({
    enabled: true,
    send_on_new_order: true,
    send_on_status_update: false,
    whatsapp_number: ''
  });
  const [loading, setLoading] = useState(false);
  const [testMessage, setTestMessage] = useState('');
  const [sendingTest, setSendingTest] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('/api/vendor/whatsapp-settings', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success) {
        setSettings(res.data.settings);
      }
    } catch (error) {
      console.error('Failed to fetch settings:', error);
      toast.error('Failed to load WhatsApp settings');
    }
  };

  const updateSettings = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const res = await axios.put('/api/vendor/whatsapp-settings', settings, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success) {
        toast.success('WhatsApp settings updated successfully');
      }
    } catch (error) {
      console.error('Failed to update settings:', error);
      toast.error('Failed to update WhatsApp settings');
    } finally {
      setLoading(false);
    }
  };

  const sendTestNotification = async () => {
    try {
      setSendingTest(true);
      const token = localStorage.getItem('token');
      const res = await axios.post('/api/vendor/whatsapp-test', {
        phone_number: settings.whatsapp_number,
        test_message: testMessage
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success) {
        toast.success('Test WhatsApp message sent! Check your phone.');
        setTestMessage('');
      }
    } catch (error) {
      console.error('Failed to send test:', error);
      toast.error(error.response?.data?.message || 'Failed to send test message');
    } finally {
      setSendingTest(false);
    }
  };

  return (
    <div className="vendor-whatsapp-settings">
      <h3>WhatsApp Notification Settings</h3>
      <p className="settings-desc">Configure WhatsApp notifications for order updates</p>

      <div className="settings-form">
        <div className="form-group">
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={settings.enabled}
              onChange={(e) => setSettings({ ...settings, enabled: e.target.checked })}
            />
            Enable WhatsApp Notifications
          </label>
        </div>

        <div className="form-group">
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={settings.send_on_new_order}
              onChange={(e) => setSettings({ ...settings, send_on_new_order: e.target.checked })}
              disabled={!settings.enabled}
            />
            Send notification on new orders
          </label>
        </div>

        <div className="form-group">
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={settings.send_on_status_update}
              onChange={(e) => setSettings({ ...settings, send_on_status_update: e.target.checked })}
              disabled={!settings.enabled}
            />
            Send notification on order status updates
          </label>
        </div>

        <div className="form-group">
          <label>WhatsApp Number (with country code)</label>
          <input
            type="tel"
            value={settings.whatsapp_number || ''}
            onChange={(e) => setSettings({ ...settings, whatsapp_number: e.target.value })}
            placeholder="e.g., 919876543210"
            disabled={!settings.enabled}
          />
          <small>Enter number without '+' symbol, include country code (91 for India)</small>
        </div>

        <button 
          className="save-settings-btn"
          onClick={updateSettings}
          disabled={loading}
        >
          {loading ? 'Saving...' : 'Save Settings'}
        </button>

        <div className="test-section">
          <h4>Test Notification</h4>
          <div className="test-form">
            <textarea
              value={testMessage}
              onChange={(e) => setTestMessage(e.target.value)}
              placeholder="Optional: Custom test message (leave empty for default)"
              rows="3"
            />
            <button 
              className="test-btn"
              onClick={sendTestNotification}
              disabled={sendingTest || !settings.enabled}
            >
              {sendingTest ? 'Sending...' : 'Send Test WhatsApp'}
            </button>
          </div>
        </div>
      </div>

      <style jsx="true">{`
        .vendor-whatsapp-settings {
          background: white;
          border-radius: 12px;
          padding: 24px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }
        .vendor-whatsapp-settings h3 {
          margin: 0 0 8px 0;
          color: #1e293b;
        }
        .settings-desc {
          color: #64748b;
          margin-bottom: 24px;
        }
        .form-group {
          margin-bottom: 20px;
        }
        .checkbox-label {
          display: flex;
          align-items: center;
          gap: 10px;
          cursor: pointer;
        }
        .form-group label:not(.checkbox-label) {
          display: block;
          margin-bottom: 8px;
          font-weight: 500;
          color: #334155;
        }
        .form-group input[type="tel"] {
          width: 100%;
          padding: 10px 12px;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          font-size: 14px;
        }
        .form-group small {
          display: block;
          margin-top: 5px;
          color: #64748b;
          font-size: 12px;
        }
        .save-settings-btn {
          background: #8E2139;
          color: white;
          border: none;
          padding: 10px 20px;
          border-radius: 8px;
          cursor: pointer;
          font-weight: 500;
          margin-bottom: 30px;
        }
        .save-settings-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        .test-section {
          border-top: 1px solid #e2e8f0;
          padding-top: 24px;
        }
        .test-section h4 {
          margin: 0 0 16px 0;
          color: #1e293b;
        }
        .test-form textarea {
          width: 100%;
          padding: 10px 12px;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          font-size: 14px;
          resize: vertical;
          margin-bottom: 12px;
        }
        .test-btn {
          background: #10b981;
          color: white;
          border: none;
          padding: 10px 20px;
          border-radius: 8px;
          cursor: pointer;
          font-weight: 500;
        }
        .test-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  );
};

export default VendorWhatsAppSettings;
import React, { useState, useEffect } from "react";
import axios from '../../utils/axiosConfig'; // Adjust path as needed
import { toast } from "react-toastify";

const API_URL = process.env.REACT_APP_API_URL;

const PlatformFeeSettings = () => {
  const [fee, setFee] = useState(10);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    fetchFee();
  }, []);

  const fetchFee = async () => {
    try {
      const res = await axios.get(`${API_URL}/settings/platform-fee`);
      if (res.data.success) {
        setFee(res.data.platform_fee_percent);
      }
    } catch (err) {
      toast.error("Failed to load platform fee");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    setUpdating(true);
    try {
      const token = localStorage.getItem("token");
      await axios.put(
        `${API_URL}/admin/settings/platform-fee`,
        { platform_fee_percent: fee },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success("Platform fee updated successfully");
    } catch (err) {
      toast.error(err.response?.data?.message || "Update failed");
    } finally {
      setUpdating(false);
    }
  };

  if (loading) return <div className="dash-loader-overlay"><div className="dash-spinner"></div></div>;

  return (
    <div className="settings-container">
      <h4 className="page-title">Platform Fee Configuration</h4>
     
      <form onSubmit={handleUpdate} className="premium-form">
        <div className="form-group" style={{ maxWidth: "300px" }}>
          <label>Platform Fee (%)</label>
          <input
            type="number"
            step="0.01"
            min="0"
            max="100"
            value={fee}
            onChange={(e) => setFee(parseFloat(e.target.value))}
            required
          />
          <small>Current fee: {fee}% – this applies to all new products.</small>
        </div>
        <div className="form-actions" style={{ marginTop: "20px" }}>
          <button type="submit" className="submit-btn" disabled={updating}>
            {updating ? "Updating..." : "Update Global Fee"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default PlatformFeeSettings;
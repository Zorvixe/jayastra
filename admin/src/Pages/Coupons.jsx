import React, { useEffect, useState } from "react";
import axios from '../utils/axiosConfig'; // Adjust path as needed
import { toast } from "react-toastify";
import "./Coupons.css";

const API_URL = process.env.REACT_APP_API_URL;

const Coupons = () => {
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showFormModal, setShowFormModal] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const token = localStorage.getItem("token");
  const userRole = localStorage.getItem("userRole")?.toLowerCase();

  const [form, setForm] = useState({
    code: "",
    discount_type: "percentage",
    discount_value: "",
    min_order_amount: "",
    max_discount: "",
    is_hidden: false
  });

  const fetchCoupons = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_URL}/admin/coupons`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCoupons(res.data.coupons || []);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to fetch coupons");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchCoupons(); }, []);

  const openAddModal = () => {
    setForm({
      code: "",
      discount_type: "percentage",
      discount_value: "",
      min_order_amount: "",
      max_discount: "",
      is_hidden: false
    });
    setEditingId(null);
    setShowFormModal(true);
  };

  const openEditModal = (coupon) => {
    setForm({
      code: coupon.code,
      discount_type: coupon.discount_type,
      discount_value: coupon.discount_value,
      min_order_amount: coupon.min_order_amount || "",
      max_discount: coupon.max_discount || "",
      is_hidden: coupon.is_hidden
    });
    setEditingId(coupon.id);
    setShowFormModal(true);
  };

  const closeFormModal = () => {
    setShowFormModal(false);
    setEditingId(null);
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm({ ...form, [name]: type === "checkbox" ? checked : value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        await axios.put(`${API_URL}/admin/coupons/${editingId}`, form, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success("Coupon updated successfully");
      } else {
        await axios.post(`${API_URL}/admin/coupons`, form, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success("Coupon added successfully");
      }
      closeFormModal();
      fetchCoupons();
    } catch (err) {
      toast.error(err.response?.data?.message || "Operation failed");
    }
  };

  const executeDeleteCoupon = async () => {
    if (!confirmDeleteId) return;
    try {
      await axios.delete(`${API_URL}/admin/coupons/${confirmDeleteId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success("Deleted successfully");
      fetchCoupons();
      setConfirmDeleteId(null);
    } catch (err) {
      toast.error(err.response?.data?.message || "Delete failed");
      setConfirmDeleteId(null);
    }
  };

  const toggleHide = async (coupon) => {
    try {
      await axios.put(
        `${API_URL}/admin/coupons/${coupon.id}`,
        { ...coupon, is_hidden: !coupon.is_hidden },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success("Visibility updated");
      fetchCoupons();
    } catch (err) {
      toast.error(err.response?.data?.message || "Update failed");
    }
  };

  const toggleStatus = async (coupon) => {
    try {
      await axios.put(
        `${API_URL}/admin/coupons/${coupon.id}`,
        { ...coupon, is_active: !coupon.is_active },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success("Status updated");
      fetchCoupons();
    } catch (err) {
      toast.error(err.response?.data?.message || "Update failed");
    }
  };

  return (
    <div className="coupon-container">
      <div className="coupon-header">
        <h2>🎟️ Coupon Management</h2>
        <button className="add-product-btn" onClick={openAddModal}>
          + Add Coupon
        </button>
      </div>

      {loading ? (
        <div className="dash-loader-overlay">
          <div className="dash-loader-container">
            <div className="dash-spinner"></div>
          </div>
        </div>
      ) : (
        <div className="coupon-table">
          <table>
            <thead>
              <tr>
                <th>Code</th><th>Type</th><th>Value</th><th>Min Order</th><th>Visibility</th><th>Status</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {coupons.length === 0 ? (
                <tr><td colSpan="7" style={{ textAlign: "center" }}>No coupons found</td></tr>
              ) : (
                coupons.map((c) => (
                  <tr key={c.id}>
                    <td><strong>{c.code}</strong></td>
                    <td>{c.discount_type === "percentage" ? "Percentage (%)" : "Flat (₹)"}</td>
                    <td>{c.discount_type === "percentage" ? `${c.discount_value}%` : `₹${c.discount_value}`}</td>
                    <td>{c.min_order_amount ? `₹${c.min_order_amount}` : "None"}</td>
                    <td>
                      <button className={c.is_hidden ? "inactive-btn" : "active-btn"} onClick={() => toggleHide(c)}>
                        {c.is_hidden ? "Hidden" : "Visible"}
                      </button>
                    </td>
                    <td>
                      <button className={c.is_active ? "active-btn" : "inactive-btn"} onClick={() => toggleStatus(c)}>
                        {c.is_active ? "Active" : "Disabled"}
                      </button>
                    </td>
                    <td>
                      <div className="action-buttons">
                        <button className="edit-btn" onClick={() => openEditModal(c)}><i className="bi bi-pencil"></i></button>
                        <button className="delete-btn" onClick={() => setConfirmDeleteId(c.id)}><i className="bi bi-trash"></i></button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Add/Edit Modal - same as before */}
      {showFormModal && (
        <div className="custom-overlay" onClick={closeFormModal}>
          <div className="custom-modal-box" onClick={(e) => e.stopPropagation()}>
            <h3>{editingId ? "Edit Coupon" : "Add New Coupon"}</h3>
            <form onSubmit={handleSubmit} className="modal-form">
              <div className="form-group">
                <label>Coupon Code *</label>
                <input type="text" name="code" placeholder="SUMMER50" value={form.code} onChange={handleChange} required />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Discount Type</label>
                  <select name="discount_type" value={form.discount_type} onChange={handleChange}>
                    <option value="percentage">Percentage (%)</option>
                    <option value="flat">Flat ₹</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Discount Value *</label>
                  <input placeholder="10.00%" type="number" name="discount_value" value={form.discount_value} onChange={handleChange} required />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Min Order Amount</label>
                  <input placeholder="Rs. 1000" type="number" name="min_order_amount" value={form.min_order_amount} onChange={handleChange} />
                </div>
                <div className="form-group">
                  <label>Max Discount Cap</label>
                  <input placeholder="Place 0 for empty" type="number" name="max_discount" value={form.max_discount} onChange={handleChange} />
                </div>
              </div>
              <div className="form-group checkbox-wrap">
                <input type="checkbox" name="is_hidden" id="is_hidden" checked={form.is_hidden} onChange={handleChange} />
                <label htmlFor="is_hidden">Hidden (Promo Code Only)</label>
              </div>
              <div className="modal-actions">
                <button type="button" className="cancel-btn" onClick={closeFormModal}>Cancel</button>
                <button type="submit" className="add-product-btn">{editingId ? "Update Coupon" : "Save Coupon"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {confirmDeleteId && (
        <div className="custom-overlay" onClick={() => setConfirmDeleteId(null)}>
          <div className="custom-confirm-box" onClick={(e) => e.stopPropagation()}>
            <div className="confirm-icon">⚠️</div>
            <h5>Confirm Deletion</h5>
            <p>Are you sure you want to delete this coupon? This action cannot be undone.</p>
            <div className="confirm-actions">
              <button className="confirm-cancel-btn" onClick={() => setConfirmDeleteId(null)}>Cancel</button>
              <button className="confirm-execute-btn" onClick={executeDeleteCoupon}>Yes, Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Coupons;
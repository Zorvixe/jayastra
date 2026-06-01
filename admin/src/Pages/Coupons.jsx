import React, { useEffect, useState } from "react";
import axios from '../utils/axiosConfig';
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

  // Listen for mobile FAB event to open add coupon modal
  useEffect(() => {
    const handleOpenAddCouponModal = () => {
      openAddModal();
    };
    
    window.addEventListener("openAddCouponModal", handleOpenAddCouponModal);
    
    return () => {
      window.removeEventListener("openAddCouponModal", handleOpenAddCouponModal);
    };
  }, []);

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
        <h2 className="coupon-title">🎟️ Coupon Management</h2>
        <button className="coupon-add-btn" onClick={openAddModal}>
          + Add Coupon
        </button>
      </div>

      {loading ? (
        <div className="coupon-loader-overlay">
          <div className="coupon-loader-container">
            <div className="coupon-spinner"></div>
          </div>
        </div>
      ) : (
        <div className="coupon-table-wrapper">
          <table className="coupon-table">
            <thead>
              <tr>
                <th className="coupon-th">Code</th>
                <th className="coupon-th">Type</th>
                <th className="coupon-th">Value</th>
                <th className="coupon-th">Min Order</th>
                <th className="coupon-th">Visibility</th>
                <th className="coupon-th">Status</th>
                <th className="coupon-th">Actions</th>
              </tr>
            </thead>
            <tbody>
              {coupons.length === 0 ? (
                <tr className="coupon-empty-row">
                  <td className="coupon-empty-cell" colSpan="7">No coupons found</td>
                </tr>
              ) : (
                coupons.map((c) => (
                  <tr key={c.id} className="coupon-row">
                    <td className="coupon-cell"><strong>{c.code}</strong></td>
                    <td className="coupon-cell">{c.discount_type === "percentage" ? "Percentage (%)" : "Flat (₹)"}</td>
                    <td className="coupon-cell">{c.discount_type === "percentage" ? `${c.discount_value}%` : `₹${c.discount_value}`}</td>
                    <td className="coupon-cell">{c.min_order_amount ? `₹${c.min_order_amount}` : "None"}</td>
                    <td className="coupon-cell">
                      <button className={c.is_hidden ? "coupon-btn-inactive" : "coupon-btn-active"} onClick={() => toggleHide(c)}>
                        {c.is_hidden ? "Hidden" : "Visible"}
                      </button>
                    </td>
                    <td className="coupon-cell">
                      <button className={c.is_active ? "coupon-btn-active" : "coupon-btn-inactive"} onClick={() => toggleStatus(c)}>
                        {c.is_active ? "Active" : "Disabled"}
                      </button>
                    </td>
                    <td className="coupon-cell">
                      <div className="coupon-action-buttons">
                        <button className="coupon-edit-btn" onClick={() => openEditModal(c)}><i className="bi bi-pencil"></i></button>
                        <button className="coupon-delete-btn" onClick={() => setConfirmDeleteId(c.id)}><i className="bi bi-trash"></i></button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Add/Edit Modal - Mobile Friendly */}
      {showFormModal && (
        <div className="coupon-modal-overlay" onClick={closeFormModal}>
          <div className="coupon-modal-container" onClick={(e) => e.stopPropagation()}>
            <div className="coupon-modal-header">
              <h3 className="coupon-modal-title">{editingId ? "Edit Coupon" : "Add New Coupon"}</h3>
              <button className="coupon-modal-close" onClick={closeFormModal}>
                <i className="bi bi-x-lg"></i>
              </button>
            </div>
            <div className="coupon-modal-body">
              <form onSubmit={handleSubmit} className="coupon-form">
                <div className="coupon-form-group">
                  <label className="coupon-label">Coupon Code *</label>
                  <input type="text" name="code" className="coupon-input" placeholder="SUMMER50" value={form.code} onChange={handleChange} required />
                </div>
                <div className="coupon-form-row">
                  <div className="coupon-form-group">
                    <label className="coupon-label">Discount Type</label>
                    <select name="discount_type" className="coupon-select" value={form.discount_type} onChange={handleChange}>
                      <option value="percentage">Percentage (%)</option>
                      <option value="flat">Flat ₹</option>
                    </select>
                  </div>
                  <div className="coupon-form-group">
                    <label className="coupon-label">Discount Value *</label>
                    <input placeholder="10.00" type="number" step="0.01" name="discount_value" className="coupon-input" value={form.discount_value} onChange={handleChange} required />
                  </div>
                </div>
                <div className="coupon-form-row">
                  <div className="coupon-form-group">
                    <label className="coupon-label">Min Order Amount (₹)</label>
                    <input placeholder="1000" type="number" step="0.01" name="min_order_amount" className="coupon-input" value={form.min_order_amount} onChange={handleChange} />
                    <small className="coupon-hint">Leave empty for no minimum</small>
                  </div>
                  <div className="coupon-form-group">
                    <label className="coupon-label">Max Discount Cap (₹)</label>
                    <input placeholder="500" type="number" step="0.01" name="max_discount" className="coupon-input" value={form.max_discount} onChange={handleChange} />
                    <small className="coupon-hint">Leave empty for no cap</small>
                  </div>
                </div>
                <div className="coupon-checkbox-wrap">
                  <input type="checkbox" name="is_hidden" id="coupon_is_hidden" checked={form.is_hidden} onChange={handleChange} />
                  <label htmlFor="coupon_is_hidden" className="coupon-checkbox-label">Hidden (Promo Code Only - Won't show in cart page)</label>
                </div>
                <div className="coupon-modal-actions">
                  <button type="button" className="coupon-cancel-btn" onClick={closeFormModal}>Cancel</button>
                  <button type="submit" className="coupon-submit-btn">{editingId ? "Update Coupon" : "Save Coupon"}</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {confirmDeleteId && (
        <div className="coupon-modal-overlay" onClick={() => setConfirmDeleteId(null)}>
          <div className="coupon-confirm-container" onClick={(e) => e.stopPropagation()}>
            <div className="coupon-confirm-icon">⚠️</div>
            <h5 className="coupon-confirm-title">Confirm Deletion</h5>
            <p className="coupon-confirm-message">Are you sure you want to delete this coupon? This action cannot be undone.</p>
            <div className="coupon-confirm-actions">
              <button className="coupon-confirm-cancel" onClick={() => setConfirmDeleteId(null)}>Cancel</button>
              <button className="coupon-confirm-delete" onClick={executeDeleteCoupon}>Yes, Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Coupons;
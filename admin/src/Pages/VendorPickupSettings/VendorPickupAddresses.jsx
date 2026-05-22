import React, { useState, useEffect } from "react";
import axios from '../../utils/axiosConfig'; // Adjust path as needed
import { toast } from "react-toastify";
import "./VendorPickupAddresses.css";

const API_URL = process.env.REACT_APP_API_URL;

const VendorPickupAddresses = () => {
  const [addresses, setAddresses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    location_name: "",
    address_line1: "",
    address_line2: "",
    city: "",
    state: "",
    pincode: "",
    is_default: false,
  });
  const [submitting, setSubmitting] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const fetchAddresses = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(`${API_URL}/vendor/pickup-addresses`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAddresses(res.data.addresses);
    } catch (err) {
      toast.error("Failed to load addresses");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAddresses();
  }, []);

  const openModal = (address = null) => {
    if (address) {
      setEditingId(address.id);
      setFormData({
        location_name: address.location_name,
        address_line1: address.address_line1,
        address_line2: address.address_line2 || "",
        city: address.city,
        state: address.state,
        pincode: address.pincode,
        is_default: address.is_default,
      });
    } else {
      setEditingId(null);
      setFormData({
        location_name: "",
        address_line1: "",
        address_line2: "",
        city: "",
        state: "",
        pincode: "",
        is_default: false,
      });
    }
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingId(null);
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === "checkbox" ? checked : value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const token = localStorage.getItem("token");
      if (editingId) {
        await axios.put(`${API_URL}/vendor/pickup-addresses/${editingId}`, formData, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success("Address updated");
      } else {
        await axios.post(`${API_URL}/vendor/pickup-addresses`, formData, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success("Address added");
      }
      fetchAddresses();
      closeModal();
    } catch (err) {
      toast.error(err.response?.data?.message || "Operation failed");
    } finally {
      setSubmitting(false);
    }
  };

  const setDefault = async (id) => {
    try {
      const token = localStorage.getItem("token");
      await axios.put(`${API_URL}/vendor/pickup-addresses/${id}/default`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success("Default address updated");
      fetchAddresses();
    } catch (err) {
      toast.error("Failed to set default");
    }
  };

  const deleteAddress = async () => {
    if (!deleteConfirm) return;
    try {
      const token = localStorage.getItem("token");
      await axios.delete(`${API_URL}/vendor/pickup-addresses/${deleteConfirm}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success("Address deleted");
      fetchAddresses();
      setDeleteConfirm(null);
    } catch (err) {
      toast.error("Delete failed");
    }
  };

  if (loading) return <div className="pickup-loader-overlay"><div className="pickup-spinner"></div></div>;

  return (
    <div className="pickup-container">
      <div className="pickup-header-actions">
        <h4><i className="bi bi-building"></i> Warehouse / Pickup Addresses</h4>
        <button className="pickup-add-address-btn" onClick={() => openModal()}>
          <i className="bi bi-plus-lg"></i> Add New Address
        </button>
      </div>

      {addresses.length === 0 ? (
        <div className="pickup-empty-addresses">
          <i className="bi bi-geo-alt"></i>
          <p>No pickup addresses added yet.</p>
          <button onClick={() => openModal()}>Create your first address</button>
        </div>
      ) : (
        <div className="pickup-addresses-grid">
          {addresses.map(addr => (
            <div key={addr.id} className={`pickup-address-card ${addr.is_default ? "pickup-default" : ""}`}>
              <div className="pickup-card-header">
                <div className="pickup-location-name">
                  <i className="bi bi-geo-alt-fill"></i> {addr.location_name}
                  {addr.is_default && <span className="pickup-default-badge">Default</span>}
                </div>
                <div className="pickup-card-actions">
                  <button className="pickup-icon-btn pickup-edit" onClick={() => openModal(addr)} title="Edit">
                    <i className="bi bi-pencil"></i>
                  </button>
                  <button className="pickup-icon-btn pickup-delete" onClick={() => setDeleteConfirm(addr.id)} title="Delete">
                    <i className="bi bi-trash"></i>
                  </button>
                </div>
              </div>
              <div className="pickup-card-body">
                <p>{addr.address_line1}{addr.address_line2 && `, ${addr.address_line2}`}</p>
                <p>{addr.city}, {addr.state} - {addr.pincode}</p>
              </div>
              {!addr.is_default && (
                <button className="pickup-set-default-btn" onClick={() => setDefault(addr.id)}>
                  Set as Default
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* LARGE MODAL for Add/Edit */}
      {modalOpen && (
        <div className="pickup-modal-backdrop" onClick={closeModal}>
          <div className="pickup-modal-content pickup-large-modal" onClick={e => e.stopPropagation()}>
            <div className="pickup-modal-header">
              <h5>{editingId ? "Edit Pickup Address" : "Add Pickup Address"}</h5>
              <button className="pickup-close-modal" onClick={closeModal}>✕</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="pickup-form-row-two">
                <div className="pickup-form-group">
                  <label>Location Name *</label>
                  <input
                    type="text"
                    name="location_name"
                    value={formData.location_name}
                    onChange={handleChange}
                    placeholder="e.g., Main Warehouse, Mumbai Hub"
                    required
                  />
                  <small>Must match a pickup location name in your Shiprocket account.</small>
                </div>
                <div className="pickup-form-group">
                  <label>Pincode *</label>
                  <input
                    type="text"
                    name="pincode"
                    value={formData.pincode}
                    onChange={handleChange}
                    pattern="[0-9]{6}"
                    maxLength="6"
                    required
                  />
                </div>
              </div>

              <div className="pickup-form-group">
                <label>Address Line 1 *</label>
                <input
                  type="text"
                  name="address_line1"
                  value={formData.address_line1}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="pickup-form-group">
                <label>Address Line 2 (Optional)</label>
                <input
                  type="text"
                  name="address_line2"
                  value={formData.address_line2}
                  onChange={handleChange}
                />
              </div>

              <div className="pickup-form-row">
                <div className="pickup-form-group">
                  <label>City *</label>
                  <input type="text" name="city" value={formData.city} onChange={handleChange} required />
                </div>
                <div className="pickup-form-group">
                  <label>State *</label>
                  <input type="text" name="state" value={formData.state} onChange={handleChange} required />
                </div>
              </div>

              <div className="pickup-form-check">
                <input
                  type="checkbox"
                  name="is_default"
                  checked={formData.is_default}
                  onChange={handleChange}
                  id="pickup_is_default"
                />
                <label htmlFor="pickup_is_default">Set as default pickup address</label>
              </div>

              <div className="pickup-modal-footer">
                <button type="button" className="pickup-cancel-btn" onClick={closeModal}>Cancel</button>
                <button type="submit" className="pickup-submit-btn" disabled={submitting}>
                  {submitting ? "Saving..." : (editingId ? "Update" : "Add")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="pickup-modal-backdrop" onClick={() => setDeleteConfirm(null)}>
          <div className="pickup-confirm-modal" onClick={e => e.stopPropagation()}>
            <div className="pickup-confirm-icon">⚠️</div>
            <h5>Delete Address?</h5>
            <p>Are you sure you want to delete this pickup address? This action cannot be undone.</p>
            <div className="pickup-confirm-actions">
              <button className="pickup-cancel-btn" onClick={() => setDeleteConfirm(null)}>Cancel</button>
              <button className="pickup-delete-btn" onClick={deleteAddress}>Yes, Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VendorPickupAddresses;
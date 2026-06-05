import React, { useState, useEffect } from "react";
import axios from '../../utils/axiosConfig';
import { toast } from "react-toastify";
import "./VendorPickupAddresses.css";

const API_URL = process.env.REACT_APP_API_URL;

const VendorPickupAddresses = () => {
  const [addresses, setAddresses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncingId, setSyncingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingAddress, setEditingAddress] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
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

  const fetchAddresses = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(`${API_URL}/vendor/pickup-addresses`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAddresses(res.data.addresses || []);
    } catch (err) {
      console.error("Fetch addresses error:", err);
      toast.error("Failed to load addresses");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAddresses();
  }, []);

  // Listen for mobile FAB event
  useEffect(() => {
    const handleOpenAddPickupAddressModal = () => {
      setEditingAddress(null);
      setFormData({
        location_name: "",
        address_line1: "",
        address_line2: "",
        city: "",
        state: "",
        pincode: "",
        is_default: false,
      });
      setModalOpen(true);
    };
    window.addEventListener("openAddPickupAddressModal", handleOpenAddPickupAddressModal);
    return () => {
      window.removeEventListener("openAddPickupAddressModal", handleOpenAddPickupAddressModal);
    };
  }, []);

  const openEditModal = (address) => {
    setEditingAddress(address);
    setFormData({
      location_name: address.location_name,
      address_line1: address.address_line1,
      address_line2: address.address_line2 || "",
      city: address.city,
      state: address.state,
      pincode: address.pincode,
      is_default: address.is_default,
    });
    setModalOpen(true);
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
      let response;
      
      if (editingAddress) {
        response = await axios.put(`${API_URL}/vendor/pickup-addresses/${editingAddress.id}`, formData, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        if (response.data.success) {
          if (response.data.shiprocket_updated) {
            toast.success(response.data.message || "Address updated and synced!");
          } else {
            toast.warning(response.data.message || "Address updated but Shiprocket sync failed");
          }
        }
      } else {
        response = await axios.post(`${API_URL}/vendor/pickup-addresses`, formData, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        if (response.data.success) {
          if (response.data.shiprocket_synced) {
            toast.success(response.data.message || "Address created and synced!");
          } else {
            toast.warning(response.data.message || "Address created but Shiprocket sync failed");
          }
        }
      }
      
      await fetchAddresses();
      setModalOpen(false);
      setEditingAddress(null);
      setFormData({
        location_name: "",
        address_line1: "",
        address_line2: "",
        city: "",
        state: "",
        pincode: "",
        is_default: false,
      });
      
    } catch (err) {
      console.error("Submit error:", err);
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
      await fetchAddresses();
    } catch (err) {
      console.error("Set default error:", err);
      toast.error("Failed to set default");
    }
  };

  const syncWithShiprocket = async (addressId) => {
    setSyncingId(addressId);
    try {
      const token = localStorage.getItem("token");
      
      const response = await axios.post(`${API_URL}/vendor/pickup-addresses/${addressId}/sync`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.data.success) {
        toast.success(response.data.message || "Address synced with Shiprocket!");
        await fetchAddresses();
      } else {
        toast.error(response.data.message || "Failed to sync");
      }
    } catch (err) {
      console.error("Sync error:", err);
      toast.error(err.response?.data?.message || "Failed to sync with Shiprocket");
    } finally {
      setSyncingId(null);
    }
  };

  const deleteAddress = async () => {
    if (!deleteConfirm) return;
    setDeletingId(deleteConfirm);
    try {
      const token = localStorage.getItem("token");
      const response = await axios.delete(`${API_URL}/vendor/pickup-addresses/${deleteConfirm}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.data.success) {
        if (response.data.shiprocket_deleted) {
          toast.success(response.data.message || "Address deleted from both systems!");
        } else {
          toast.warning(response.data.message || "Address deleted locally. Shiprocket deletion failed.");
        }
        await fetchAddresses();
      } else {
        toast.error(response.data.message || "Delete failed");
      }
      setDeleteConfirm(null);
    } catch (err) {
      console.error("Delete error:", err);
      toast.error(err.response?.data?.message || "Delete failed");
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) {
    return (
      <div className="pickup-loader-overlay">
        <div className="pickup-loader-container">
          <div className="pickup-spinner"></div>
          <p>Loading addresses...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="pickup-container">
      <div className="pickup-header-actions">
        <div className="pickup-header-title">
          <i className="bi bi-building"></i>
          <h4>Warehouse / Pickup Addresses</h4>
        </div>
        <button 
          className="pickup-add-address-btn" 
          onClick={() => {
            setEditingAddress(null);
            setFormData({
              location_name: "",
              address_line1: "",
              address_line2: "",
              city: "",
              state: "",
              pincode: "",
              is_default: false,
            });
            setModalOpen(true);
          }}
        >
          <i className="bi bi-plus-lg"></i> Add New Address
        </button>
      </div>

      {addresses.length === 0 ? (
        <div className="pickup-empty-addresses">
          <div className="pickup-empty-icon">
            <i className="bi bi-geo-alt"></i>
          </div>
          <p>No pickup addresses added yet.</p>
          <button 
            className="pickup-empty-create-btn"
            onClick={() => {
              setEditingAddress(null);
              setFormData({
                location_name: "",
                address_line1: "",
                address_line2: "",
                city: "",
                state: "",
                pincode: "",
                is_default: false,
              });
              setModalOpen(true);
            }}
          >
            Create your first address
          </button>
        </div>
      ) : (
        <div className="pickup-addresses-grid">
          {addresses.map(addr => (
            <div key={addr.id} className={`pickup-address-card ${addr.is_default ? "pickup-card-default" : ""}`}>
              <div className="pickup-card-header">
                <div className="pickup-location-name">
                  <i className="bi bi-geo-alt-fill"></i> 
                  <span className="pickup-location-text">{addr.location_name}</span>
                  {addr.is_default && (
                    <span className="pickup-default-badge">
                      <i className="bi bi-star-fill"></i> Default
                    </span>
                  )}
                  {addr.shiprocket_synced && addr.shiprocket_pickup_id ? (
                    <span className="pickup-synced-badge" title={`Shiprocket ID: ${addr.shiprocket_pickup_id}`}>
                      <i className="bi bi-cloud-check-fill"></i> Synced
                    </span>
                  ) : (
                    <span className="pickup-not-synced-badge" title="Not synced with Shiprocket">
                      <i className="bi bi-cloud-slash"></i> Not Synced
                    </span>
                  )}
                </div>
                <div className="pickup-card-actions">
                  <button 
                    className="pickup-action-btn pickup-action-edit" 
                    onClick={() => openEditModal(addr)} 
                    title="Edit"
                  >
                    <i className="bi bi-pencil"></i>
                  </button>
                  {!addr.shiprocket_synced && (
                    <button 
                      className="pickup-action-btn pickup-action-sync" 
                      onClick={() => syncWithShiprocket(addr.id)} 
                      title="Sync with Shiprocket"
                      disabled={syncingId === addr.id}
                    >
                      {syncingId === addr.id ? (
                        <div className="pickup-small-spinner"></div>
                      ) : (
                        <i className="bi bi-cloud-upload"></i>
                      )}
                    </button>
                  )}
                  <button 
                    className="pickup-action-btn pickup-action-delete" 
                    onClick={() => setDeleteConfirm(addr.id)} 
                    title="Delete"
                    disabled={deletingId === addr.id}
                  >
                    {deletingId === addr.id ? (
                      <div className="pickup-small-spinner"></div>
                    ) : (
                      <i className="bi bi-trash"></i>
                    )}
                  </button>
                </div>
              </div>
              <div className="pickup-card-body">
                <p className="pickup-address-line">
                  {addr.address_line1}
                  {addr.address_line2 && <>, {addr.address_line2}</>}
                </p>
                <p className="pickup-location-details">
                  {addr.city}, {addr.state} - <strong>{addr.pincode}</strong>
                </p>
              </div>
              {!addr.is_default && (
                <button 
                  className="pickup-set-default-btn" 
                  onClick={() => setDefault(addr.id)}
                >
                  Set as Default
                </button>
              )}
              {addr.is_default && (
                <div className="pickup-default-footer">
                  <i className="bi bi-check-circle-fill"></i>
                  <span>This is your default pickup address</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      {modalOpen && (
        <div className="pickup-modal-backdrop" onClick={() => setModalOpen(false)}>
          <div className="pickup-modal-content pickup-modal-large" onClick={e => e.stopPropagation()}>
            <div className="pickup-modal-header">
              <h5>{editingAddress ? "Edit Pickup Address" : "Add Pickup Address"}</h5>
              <button className="pickup-modal-close" onClick={() => setModalOpen(false)}>✕</button>
            </div>
            <form onSubmit={handleSubmit} className="pickup-modal-form">
              <div className="pickup-form-row-two">
                <div className="pickup-form-group">
                  <label>Location Name <span className="pickup-required">*</span></label>
                  <input
                    type="text"
                    name="location_name"
                    value={formData.location_name}
                    onChange={handleChange}
                    placeholder="e.g., Main Warehouse, Mumbai Hub"
                    className="pickup-input"
                    required
                  />
                  <small className="pickup-hint">This will be used as pickup location name in Shiprocket</small>
                </div>
                <div className="pickup-form-group">
                  <label>Pincode <span className="pickup-required">*</span></label>
                  <input
                    type="text"
                    name="pincode"
                    value={formData.pincode}
                    onChange={handleChange}
                    pattern="[0-9]{6}"
                    maxLength="6"
                    className="pickup-input"
                    required
                  />
                </div>
              </div>

              <div className="pickup-form-group">
                <label>Address Line 1 <span className="pickup-required">*</span></label>
                <input
                  type="text"
                  name="address_line1"
                  value={formData.address_line1}
                  onChange={handleChange}
                  className="pickup-input"
                  required
                />
              </div>

              <div className="pickup-form-group">
                <label>Address Line 2 <span className="pickup-optional">(Optional)</span></label>
                <input
                  type="text"
                  name="address_line2"
                  value={formData.address_line2}
                  onChange={handleChange}
                  className="pickup-input"
                />
              </div>

              <div className="pickup-form-row">
                <div className="pickup-form-group">
                  <label>City <span className="pickup-required">*</span></label>
                  <input 
                    type="text" 
                    name="city" 
                    value={formData.city} 
                    onChange={handleChange} 
                    className="pickup-input"
                    required 
                  />
                </div>
                <div className="pickup-form-group">
                  <label>State <span className="pickup-required">*</span></label>
                  <input 
                    type="text" 
                    name="state" 
                    value={formData.state} 
                    onChange={handleChange} 
                    className="pickup-input"
                    required 
                  />
                </div>
              </div>

              <div className="pickup-form-check">
                <label className="pickup-checkbox-label">
                  <input
                    type="checkbox"
                    name="is_default"
                    checked={formData.is_default}
                    onChange={handleChange}
                  />
                  <span className="pickup-checkbox-text">Set as default pickup address</span>
                </label>
                <small className="pickup-hint pickup-hint-block">
                  Default address will be used for all Shiprocket shipments
                </small>
              </div>

              <div className="pickup-modal-footer">
                <button type="button" className="pickup-cancel-btn" onClick={() => setModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="pickup-submit-btn" disabled={submitting}>
                  {submitting ? (
                    <>
                      <div className="pickup-btn-spinner"></div>
                      Saving...
                    </>
                  ) : (
                    editingAddress ? "Update Address" : "Create Address"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="pickup-modal-backdrop pickup-delete-backdrop" onClick={() => setDeleteConfirm(null)}>
          <div className="pickup-confirm-modal" onClick={e => e.stopPropagation()}>
            <div className="pickup-confirm-icon">
              <i className="bi bi-exclamation-triangle-fill"></i>
            </div>
            <h5>Delete Address?</h5>
            <p>Are you sure you want to delete this pickup address? This will also delete it from Shiprocket if synced.</p>
            <div className="pickup-confirm-actions">
              <button className="pickup-cancel-btn" onClick={() => setDeleteConfirm(null)}>
                Cancel
              </button>
              <button 
                className="pickup-delete-btn" 
                onClick={deleteAddress} 
                disabled={deletingId === deleteConfirm}
              >
                {deletingId === deleteConfirm ? "Deleting..." : "Yes, Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VendorPickupAddresses;
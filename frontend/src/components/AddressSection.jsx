import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom";
import axios from "axios";
import "./Address.css";

const API_URL = process.env.REACT_APP_API_URL;

const AddressSection = () => {
  const [addresses, setAddresses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editId, setEditId] = useState(null);
  const [menuOpenId, setMenuOpenId] = useState(null);
  const [selectedId, setSelectedId] = useState(null);

  // Modal states
  const [showFormModal, setShowFormModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteId, setDeleteId] = useState(null);

  // Form step: "choice" or "form"
  const [locationStep, setLocationStep] = useState("choice");

  const [form, setForm] = useState({
    name: "",
    phone: "",
    address: "",
    city: "",
    state: "",
    pincode: "",
    type: "HOME",
    house_no: "",
    street_area: "",
    landmark: ""
  });

  const [toast, setToast] = useState({ show: false, message: "", type: "success" });

  const showToast = (message, type = "success") => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ ...toast, show: false }), 4000);
  };

  const token = localStorage.getItem("token");

  /* ================= FETCH ================= */
  const fetchAddresses = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_URL}/user/address`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAddresses(res.data);
      if (res.data.length > 0 && !selectedId) {
        setSelectedId(res.data[0].id);
      }
    } catch (error) {
      console.error("Failed to load addresses", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAddresses();
  }, []);

  /* ================= RESET FORM ================= */
  const resetForm = () => {
    setForm({
      name: "",
      phone: "",
      address: "",
      city: "",
      state: "",
      pincode: "",
      type: "HOME",
      house_no: "",
      street_area: "",
      landmark: ""
    });
    setEditId(null);
    setLocationStep("choice");
  };

  /* ================= OPEN ADD MODAL ================= */
  const handleOpenAdd = () => {
    resetForm();
    setShowFormModal(true);
    document.body.classList.add("modal-open");
  };

  /* ================= OPEN EDIT MODAL ================= */
  const handleEditClick = (address) => {
    setEditId(address.id);
    setForm(address);
    setLocationStep("form");
    setShowFormModal(true);
    document.body.classList.add("modal-open");
    setMenuOpenId(null);
  };

  /* ================= CLOSE FORM MODAL ================= */
  const closeFormModal = () => {
    setShowFormModal(false);
    document.body.classList.remove("modal-open");
    resetForm();
  };

  /* ================= SAVE (ADD/UPDATE) ================= */
  const handleSave = async () => {
    try {
      setLoading(true);
      const payload = { ...form };
      if (!payload.address && payload.house_no && payload.street_area) {
        payload.address = `${payload.house_no}, ${payload.street_area}`;
      }

      if (editId) {
        await axios.put(`${API_URL}/user/address/${editId}`, payload, {
          headers: { Authorization: `Bearer ${token}` }
        });
        showToast("Address updated successfully!");
      } else {
        await axios.post(`${API_URL}/user/address`, payload, {
          headers: { Authorization: `Bearer ${token}` }
        });
        showToast("Address added successfully!");
      }

      closeFormModal();
      fetchAddresses();
    } catch (error) {
      showToast("Failed to save address", "error");
    } finally {
      setLoading(false);
    }
  };

  /* ================= DELETE ================= */
  const handleDeleteTrigger = (id) => {
    setDeleteId(id);
    setShowDeleteModal(true);
    document.body.classList.add("modal-open");
    setMenuOpenId(null);
  };

  const closeDeleteModal = () => {
    setShowDeleteModal(false);
    document.body.classList.remove("modal-open");
    setDeleteId(null);
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    try {
      setLoading(true);
      await axios.delete(`${API_URL}/user/address/${deleteId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      closeDeleteModal();
      fetchAddresses();
      showToast("Address deleted successfully!");
    } catch (error) {
      showToast("Failed to delete address", "error");
    } finally {
      setLoading(false);
    }
  };

  /* ================= USE LOCATION ================= */
  const handleUseLocation = () => {
    if (!navigator.geolocation) {
      showToast("Geolocation is not supported by your browser", "error");
      return;
    }
    showToast("Retrieving your location...", "info");
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          const res = await axios.get(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`
          );
          const addr = res.data.address;
          setForm((prev) => ({
            ...prev,
            city: addr.city || addr.town || addr.village || "",
            state: addr.state || "",
            pincode: addr.postcode || "",
            street_area: addr.road || addr.suburb || addr.neighbourhood || "",
            landmark: addr.suburb || "",
            address: res.data.display_name || "",
          }));
          setLocationStep("form");
          showToast("Location retrieved successfully!");
        } catch (err) {
          showToast("Could not fetch location details. Please enter manually.", "error");
          setLocationStep("form");
        }
      },
      (err) => {
        showToast("Location access denied. Switching to manual mode.", "error");
        setLocationStep("form");
      },
      { enableHighAccuracy: true }
    );
  };

  // Handle backdrop click to close modal
  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      closeFormModal();
    }
  };

  const handleDeleteBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      closeDeleteModal();
    }
  };

  // Render modals via portal to avoid container CSS interference
  const renderModals = () => {
    return ReactDOM.createPortal(
      <>
        {/* ================= ADD / EDIT MODAL ================= */}
        <div
          className={`modal fade ${showFormModal ? 'show' : ''}`}
          style={{ display: showFormModal ? 'block' : 'none' }}
          tabIndex="-1"
          onClick={handleBackdropClick}
        >
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">{editId ? "Update Address" : "Add New Address"}</h5>
                <button type="button" className="btn-close" onClick={closeFormModal}></button>
              </div>
              <div className="modal-body">
                {locationStep === "choice" ? (
                  <div className="profile-location-choice-view">
                    <p className="profile-choice-title">How would you like to add your address?</p>
                    <div className="profile-choice-options">
                      <div className="profile-choice-card" onClick={handleUseLocation}>
                        <div className="profile-choice-icon-wrap">
                          <i className="bi bi-geo-alt-fill"></i>
                        </div>
                        <strong>Use Current Location</strong>
                      </div>
                      <div className="profile-choice-card" onClick={() => setLocationStep("form")}>
                        <div className="profile-choice-icon-wrap">
                          <i className="bi bi-pencil-square"></i>
                        </div>
                        <strong>Enter Manually</strong>
                      </div>
                    </div>
                    <div className="profile-cancel-btn-action">
                      <button
                        className="profile-cancel-choice-btn"
                        onClick={closeFormModal}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="profile-address-form-fields">
                    <div className="profile-form-row">
                      <div className="profile-input-field">
                        <label>Full Name</label>
                        <input
                          placeholder="e.g. John Doe"
                          value={form.name}
                          onChange={(e) => setForm({ ...form, name: e.target.value })}
                        />
                      </div>
                      <div className="profile-input-field">
                        <label>Phone Number</label>
                        <input
                          placeholder="10-digit number"
                          value={form.phone}
                          onChange={(e) => setForm({ ...form, phone: e.target.value })}
                        />
                      </div>
                    </div>

                    <div className="profile-form-row">
                      <div className="profile-input-field">
                        <label>House / Flat / Building No *</label>
                        <input
                          placeholder="House No."
                          value={form.house_no}
                          onChange={(e) => setForm({ ...form, house_no: e.target.value })}
                        />
                      </div>
                      <div className="profile-input-field">
                        <label>Road / Area / Street *</label>
                        <input
                          placeholder="Street name"
                          value={form.street_area}
                          onChange={(e) => setForm({ ...form, street_area: e.target.value })}
                        />
                      </div>
                    </div>

                    <div className="profile-input-field">
                      <label>Landmark (Optional)</label>
                      <input
                        placeholder="Near by place"
                        value={form.landmark}
                        onChange={(e) => setForm({ ...form, landmark: e.target.value })}
                      />
                    </div>

                    <div className="profile-form-row">
                      <div className="profile-input-field">
                        <label>City</label>
                        <input
                          placeholder="City"
                          value={form.city}
                          onChange={(e) => setForm({ ...form, city: e.target.value })}
                        />
                      </div>
                      <div className="profile-input-field">
                        <label>State</label>
                        <input
                          placeholder="State"
                          value={form.state}
                          onChange={(e) => setForm({ ...form, state: e.target.value })}
                        />
                      </div>
                    </div>

                    <div className="profile-input-field">
                      <label>Pincode</label>
                      <input
                        placeholder="6-digit pincode"
                        value={form.pincode}
                        onChange={(e) => setForm({ ...form, pincode: e.target.value })}
                      />
                    </div>

                    <div style={{ display: 'none' }}>
                      <input
                        placeholder="Full Address String (Fallback)"
                        value={form.address}
                        onChange={(e) => setForm({ ...form, address: e.target.value })}
                      />
                    </div>

                    <div className="profile-inline-form-actions">
                      <button
                        className="profile-btn-cancel-inline"
                        onClick={closeFormModal}
                      >
                        CANCEL
                      </button>
                      <button
                        className="profile-btn-save-address-new"
                        onClick={handleSave}
                        disabled={loading}
                      >
                        {loading ? "Saving..." : editId ? "UPDATE ADDRESS" : "SAVE ADDRESS"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ================= DELETE CONFIRMATION MODAL ================= */}
        <div
          className={`modal fade ${showDeleteModal ? 'show' : ''}`}
          style={{ display: showDeleteModal ? 'block' : 'none' }}
          tabIndex="-1"
          onClick={handleDeleteBackdropClick}
        >
          <div className="modal-dialog modal-sm modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Delete Address</h5>
                <button type="button" className="btn-close" onClick={closeDeleteModal}></button>
              </div>
              <div className="modal-body text-center">
                <div className="profile-modal-icon">
                  <i className="bi bi-exclamation-triangle-fill"></i>
                </div>
                <h3>Delete Address?</h3>
                <p>Are you sure you want to remove this address? This action cannot be undone.</p>
              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={closeDeleteModal}>
                  CANCEL
                </button>
                <button className="btn btn-danger" onClick={confirmDelete} disabled={loading}>
                  {loading ? "DELETING..." : "DELETE"}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Backdrop overlays */}
        {showFormModal && <div className="modal-backdrop fade show"></div>}
        {showDeleteModal && <div className="modal-backdrop fade show"></div>}
      </>,
      document.body
    );
  };

  return (
    <div className="profile-address-container">
      {/* Header */}
      <div className="profile-add-address-btn">
        <h2>Manage Addresses</h2>
        <div className="profile-add-address-box" onClick={handleOpenAdd}>
          + ADD
        </div>
      </div>

      {/* Custom Toast */}
      {toast.show && (
        <div className={`profile-custom-toast ${toast.type}`}>
          <div className="profile-toast-content">
            <div className={`profile-toast-icon ${toast.type}`}>
              {toast.type === 'success' && <i className="bi bi-check-circle-fill"></i>}
              {toast.type === 'error' && <i className="bi bi-exclamation-circle-fill"></i>}
              {toast.type === 'info' && <i className="bi bi-geo-alt-fill"></i>}
            </div>
            <span className="profile-toast-msg">{toast.message}</span>
            <button className="profile-toast-close" onClick={() => setToast({ ...toast, show: false })}>
              <i className="bi bi-x"></i>
            </button>
          </div>
        </div>
      )}

      {/* Address List with Loader Overlay */}
      <div className="profile-address-list-wrapper">
        {loading && (
          <div className="profile-address-loader-overlay">
            <div className="profile-address-spinner"></div>
          </div>
        )}
        {addresses.map((a) => (
          <div
            key={a.id}
            className={`profile-address-card ${selectedId === a.id ? "selected" : ""}`}
            onClick={() => setSelectedId(a.id)}
          >
            <input
              type="radio"
              className="profile-address-radio"
              checked={selectedId === a.id}
              onChange={() => setSelectedId(a.id)}
            />
            <div className="profile-address-content">
              <div className="profile-address-top">
                <span className="profile-address-type">{a.type || "HOME"}</span>
                <div
                  className="profile-address-menu"
                  onClick={(e) => {
                    e.stopPropagation();
                    setMenuOpenId(menuOpenId === a.id ? null : a.id);
                  }}
                >
                  ⋮
                  {menuOpenId === a.id && (
                    <div className="profile-menu-dropdown">
                      <div onClick={() => handleEditClick(a)}>Edit</div>
                      <div onClick={() => handleDeleteTrigger(a.id)}>Delete</div>
                    </div>
                  )}
                </div>
              </div>
              <div className="profile-address-name">
                {a.name} <span>{a.phone}</span>
              </div>
              <p className="profile-address-text">
                {a.house_no && a.street_area
                  ? `${a.house_no}, ${a.street_area}${a.landmark ? ', ' + a.landmark : ''}`
                  : a.address}
                , {a.city}, {a.state} - <b>{a.pincode}</b>
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Render modals via portal */}
      {renderModals()}
    </div>
  );
};

export default AddressSection;
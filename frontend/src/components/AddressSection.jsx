import React, { useEffect, useState } from "react";
import axios from "axios";
import "./Address.css";

const API_URL = process.env.REACT_APP_API_URL;

const AddressSection = () => {

  const [addresses, setAddresses] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [locationStep, setLocationStep] = useState("choice"); // choice, form

  const [editId, setEditId] = useState(null);
  const [menuOpenId, setMenuOpenId] = useState(null);
  const [selectedId, setSelectedId] = useState(null); // ⭐ selected address

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

  const [deleteId, setDeleteId] = useState(null); 
  const [toast, setToast] = useState({ show: false, message: "", type: "success" });

  const showToast = (message, type = "success") => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ ...toast, show: false }), 4000);
  };

  const token = localStorage.getItem("token");

  /* ================= FETCH ================= */

  const fetchAddresses = async () => {
    try {
      const res = await axios.get(`${API_URL}/user/address`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setAddresses(res.data);

      // ⭐ default select first address
      if (res.data.length > 0 && !selectedId) {
        setSelectedId(res.data[0].id);
      }

    } catch (error) {
      console.error("❌ Failed to load addresses", error);
    }
  };

  useEffect(() => {
    fetchAddresses();
  }, []);

  /* ================= ADD ================= */

  const handleAdd = async () => {
    try {
      setLoading(true);

      const payload = { ...form };
      if (!payload.address && payload.house_no && payload.street_area) {
        payload.address = `${payload.house_no}, ${payload.street_area}`;
      }

      await axios.post(`${API_URL}/user/address`, payload, {
        headers: { Authorization: `Bearer ${token}` }
      });

      showToast("Address added successfully!");

      resetForm();
      setShowForm(false);
      fetchAddresses();

    } catch {
      showToast("Failed to save address", "error");
    } finally {
      setLoading(false);
    }
  };

  /* ================= EDIT ================= */

  const handleEditClick = (a) => {
    setEditId(a.id);
    setForm(a);
    setShowForm(true);
    setMenuOpenId(null);
  };

  const handleUpdate = async () => {
    try {
      setLoading(true);

      const payload = { ...form };
      if (!payload.address && payload.house_no && payload.street_area) {
        payload.address = `${payload.house_no}, ${payload.street_area}`;
      }

      await axios.put(`${API_URL}/user/address/${editId}`, payload, {
        headers: { Authorization: `Bearer ${token}` }
      });

      showToast("Address updated successfully!");

      setEditId(null);
      setShowForm(false);
      resetForm();
      fetchAddresses();

    } catch {
      showToast("Update failed", "error");
    } finally {
      setLoading(false);
    }
  };

  /* ================= DELETE ================= */

  const handleDeleteTrigger = (id) => {
    setDeleteId(id);
    setMenuOpenId(null);
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    try {
      setLoading(true);
      await axios.delete(`${API_URL}/user/address/${deleteId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setDeleteId(null);
      fetchAddresses();
      showToast("Address deleted successfully!");
    } catch {
      showToast("Failed to delete address", "error");
    } finally {
      setLoading(false);
    }
  };

  /* ================= RESET ================= */

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
  };


  const handleUseLocation = () => {
    if (!navigator.geolocation) {
      return showToast("Geolocation is not supported by your browser", "error");
    }

    showToast("Retrieving your location...", "info");

    navigator.geolocation.getCurrentPosition(async (position) => {
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
        setShowForm(true);
        showToast("Location retrieved successfully!");
      } catch (err) {
        showToast("Could not fetch location details automatically. Please enter manual details.", "error");
        setLocationStep("form");
      }
    }, (err) => {
        showToast("Location access denied or unavailable. Switching to manual mode.", "error");
        setLocationStep("form");
        setShowForm(true);
    }, { enableHighAccuracy: true });
  };

  return (
    <div className="address-container">

      <h2>Manage Addresses</h2>

      {/* CUSTOM TOAST NOTIFICATION */}
      {toast.show && (
        <div className={`custom-toast ${toast.type}`}>
          <div className="toast-content">
            <div className={`toast-icon ${toast.type}`}>
               {toast.type === 'success' && <i className="bi bi-check-circle-fill"></i>}
               {toast.type === 'error' && <i className="bi bi-exclamation-circle-fill"></i>}
               {toast.type === 'info' && <i className="bi bi-geo-alt-fill"></i>}
            </div>
            <span className="toast-msg">{toast.message}</span>
            <button className="toast-close" onClick={() => setToast({ ...toast, show: false })}>
                <i className="bi bi-x"></i>
            </button>
          </div>
        </div>
      )}

      {/* ADD BUTTON */}
      {!showForm && (
        <div
          className="add-address-box"
          onClick={() => {
            setShowForm(true);
            setLocationStep("choice");
            setEditId(null);
            resetForm();
          }}
        >
          + ADD A NEW ADDRESS
        </div>
      )}

      {showForm && (
        <div className="inline-address-form-container">
            <div className="inline-form-header">
                <h3>{editId ? "Update Address" : "Add New Address"}</h3>
                <button className="inline-cancel-btn" onClick={() => { setShowForm(false); setEditId(null); }}>
                    <i className="bi bi-x-lg"></i>
                </button>
            </div>

            <div className="inline-form-body">
                {locationStep === "choice" ? (
                  <div className="location-choice-view inline">
                      <p className="choice-title">How would you like to add your address?</p>
                      <div className="choice-options">
                          <div className="choice-card" onClick={handleUseLocation}>
                              <div className="choice-icon-wrap">
                                  <i className="bi bi-geo-alt-fill"></i>
                              </div>
                              <strong>Use Current Location</strong>
                          </div>
                          <div className="choice-card" onClick={() => setLocationStep("form")}>
                              <div className="choice-icon-wrap">
                                  <i className="bi bi-pencil-square"></i>
                              </div>
                              <strong>Enter Manually</strong>
                          </div>
                      </div>
                  </div>
                ) : (
                  <div className="address-form-fields">
                    <div className="form-row">
                      <div className="input-field">
                        <label>Full Name</label>
                        <input
                          placeholder="e.g. John Doe"
                          value={form.name}
                          onChange={(e)=>setForm({...form,name:e.target.value})}
                        />
                      </div>
                      <div className="input-field">
                        <label>Phone Number</label>
                        <input
                          placeholder="10-digit number"
                          value={form.phone}
                          onChange={(e)=>setForm({...form,phone:e.target.value})}
                        />
                      </div>
                    </div>

                    <div className="form-row">
                      <div className="input-field">
                        <label>House / Flat / Building No *</label>
                        <input
                          placeholder="House No."
                          value={form.house_no}
                          onChange={(e)=>setForm({...form, house_no:e.target.value})}
                        />
                      </div>
                      <div className="input-field">
                        <label>Road / Area / Street *</label>
                        <input
                          placeholder="Street name"
                          value={form.street_area}
                          onChange={(e)=>setForm({...form, street_area:e.target.value})}
                        />
                      </div>
                    </div>

                    <div className="input-field">
                        <label>Landmark (Optional)</label>
                        <input
                            placeholder="Near by place"
                            value={form.landmark}
                            onChange={(e)=>setForm({...form, landmark:e.target.value})}
                        />
                    </div>

                    <div className="form-row">
                      <div className="input-field">
                        <label>City</label>
                        <input
                          placeholder="City"
                          value={form.city}
                          onChange={(e)=>setForm({...form,city:e.target.value})}
                        />
                      </div>
                      <div className="input-field">
                        <label>State</label>
                        <input
                          placeholder="State"
                          value={form.state}
                          onChange={(e)=>setForm({...form,state:e.target.value})}
                        />
                      </div>
                    </div>

                    <div className="input-field">
                        <label>Pincode</label>
                        <input
                            placeholder="6-digit pincode"
                            value={form.pincode}
                            onChange={(e)=>setForm({...form,pincode:e.target.value})}
                        />
                    </div>

                    <div style={{display:'none'}}>
                      <input
                          placeholder="Full Address String (Fallback)"
                          value={form.address}
                          onChange={(e)=>setForm({...form,address:e.target.value})}
                      />
                    </div>

                    <div className="inline-form-actions">
                        <button
                          className="btn-save-address-new"
                          onClick={editId ? handleUpdate : handleAdd}
                        >
                          {loading ? "Saving..." : editId ? "UPDATE ADDRESS" : "SAVE ADDRESS"}
                        </button>
                        <button className="btn-cancel-inline" onClick={() => { setShowForm(false); setEditId(null); }}>
                            CANCEL
                        </button>
                    </div>
                  </div>
                )}
            </div>
        </div>
      )}



      {/* ADDRESS LIST */}
      {addresses.map((a) => (
        <div
          key={a.id}
          className={`address-card ${selectedId === a.id ? "selected" : ""}`}
          onClick={() => setSelectedId(a.id)}
        >

          {/* ⭐ RADIO BUTTON */}
          <input
            type="radio"
            className="address-radio"
            checked={selectedId === a.id}
            onChange={() => setSelectedId(a.id)}
          />

          <div className="address-content">

            <div className="address-top">
              <span className="address-type">{a.type || "HOME"}</span>

              <div
                className="address-menu"
                onClick={() =>
                  setMenuOpenId(menuOpenId === a.id ? null : a.id)
                }
              >
                ⋮

                {menuOpenId === a.id && (
                  <div className="menu-dropdown">
                    <div onClick={() => handleEditClick(a)}>Edit</div>
                    <div onClick={() => handleDeleteTrigger(a.id)}>Delete</div>
                  </div>
                )}
              </div>
            </div>

            <div className="address-name">
              {a.name} <span>{a.phone}</span>
            </div>

            <p className="address-text">
                {a.house_no && a.street_area 
                    ? `${a.house_no}, ${a.street_area}${a.landmark ? ', ' + a.landmark : ''}` 
                    : a.address}, {a.city}, {a.state} - <b>{a.pincode}</b>
            </p>

          </div>

        </div>
      ))}

      {/* ⭐ CUSTOM DELETE MODAL ⭐ */}
      {deleteId && (
        <div className="delete-modal-overlay">
          <div className="delete-modal-card">
            <div className="modal-icon">
                <i className="bi bi-exclamation-triangle-fill"></i>
            </div>
            <h3>Delete Address?</h3>
            <p>Are you sure you want to remove this address? This action cannot be undone.</p>
            <div className="modal-actions">
              <button className="cancel-btn" onClick={() => setDeleteId(null)}>CANCEL</button>
              <button className="confirm-delete-btn" onClick={confirmDelete} disabled={loading}>
                {loading ? "DELETING..." : "DELETE"}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default AddressSection;

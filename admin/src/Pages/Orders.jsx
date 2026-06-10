import React, { useEffect, useState } from "react";
import axios from '../utils/axiosConfig';
import { toast } from "react-toastify";

import shiprocketService from '../services/shiprocketService';

import "./Order.css";

const API_URL = process.env.REACT_APP_API_URL;

// Helper: construct absolute image URL
const getImageUrl = (imagePath) => {
  if (!imagePath) return null;
  if (imagePath.startsWith("http")) return imagePath;
  let baseUrl = API_URL.replace(/\/api\/?$/, "");
  if (baseUrl.endsWith("/")) baseUrl = baseUrl.slice(0, -1);
  const cleanPath = imagePath.startsWith("/") ? imagePath : `/${imagePath}`;
  return `${baseUrl}${cleanPath}`;
};

// Helper function to escape HTML to prevent XSS
const escapeHtml = (text) => {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
};

// Address Edit Modal Component
const AddressEditModal = ({ order, isOpen, onClose, onUpdate }) => {
  const [addressForm, setAddressForm] = useState({
    house_no: "",
    street_area: "",
    landmark: "",
    city: "",
    state: "",
    pincode: "",
    address: ""
  });
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    if (order && isOpen) {
      setAddressForm({
        house_no: order.house_no || "",
        street_area: order.street_area || "",
        landmark: order.landmark || "",
        city: order.city || "",
        state: order.state || "",
        pincode: order.pincode || "",
        address: order.address || ""
      });
    }
  }, [order, isOpen]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setAddressForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!addressForm.city.trim()) {
      toast.error("City is required");
      return;
    }
    if (!addressForm.state.trim()) {
      toast.error("State is required");
      return;
    }
    if (!addressForm.pincode.trim() || !/^\d{6}$/.test(addressForm.pincode)) {
      toast.error("Valid 6-digit pincode is required");
      return;
    }

    setUpdating(true);
    const success = await onUpdate(order.id, addressForm);
    setUpdating(false);
    if (success) onClose();
  };

  if (!isOpen || !order) return null;

  return (
    <div className="address-edit-modal-overlay" onClick={onClose}>
      <div className="address-edit-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h4>Edit Shipping Address - Order #{order.id}</h4>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-row">
              <div className="form-group">
                <label>House/Flat No</label>
                <input
                  type="text"
                  name="house_no"
                  value={addressForm.house_no}
                  onChange={handleChange}
                  placeholder="House No / Building"
                />
              </div>
              <div className="form-group">
                <label>Street/Area</label>
                <input
                  type="text"
                  name="street_area"
                  value={addressForm.street_area}
                  onChange={handleChange}
                  placeholder="Street name / Area"
                />
              </div>
            </div>
            <div className="form-group">
              <label>Landmark (Optional)</label>
              <input
                type="text"
                name="landmark"
                value={addressForm.landmark}
                onChange={handleChange}
                placeholder="Nearby landmark"
              />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>City <span className="required">*</span></label>
                <input
                  type="text"
                  name="city"
                  value={addressForm.city}
                  onChange={handleChange}
                  placeholder="City"
                  required
                />
              </div>
              <div className="form-group">
                <label>State <span className="required">*</span></label>
                <input
                  type="text"
                  name="state"
                  value={addressForm.state}
                  onChange={handleChange}
                  placeholder="State"
                  required
                />
              </div>
              <div className="form-group">
                <label>Pincode <span className="required">*</span></label>
                <input
                  type="text"
                  name="pincode"
                  value={addressForm.pincode}
                  onChange={handleChange}
                  placeholder="6-digit pincode"
                  maxLength="6"
                  required
                />
              </div>
            </div>
            <div className="form-group">
              <label>Full Address</label>
              <textarea
                name="address"
                value={addressForm.address}
                onChange={handleChange}
                rows="2"
                placeholder="Complete address"
              />
              <small className="help-text">This will be auto-generated from components above if left empty.</small>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn-cancel" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-save" disabled={updating}>
              {updating ? "Saving..." : "Save Address"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Pickup Location Selector Modal Component
const PickupLocationSelector = ({ isOpen, onClose, onConfirm, orderId, isLoading }) => {
  const [pickupLocations, setPickupLocations] = useState([]);
  const [selectedPickupLocation, setSelectedPickupLocation] = useState("");
  const [fetching, setFetching] = useState(false);
  const token = localStorage.getItem("token");

  useEffect(() => {
    if (isOpen) {
      fetchPickupLocations();
    }
  }, [isOpen]);

  const fetchPickupLocations = async () => {
    setFetching(true);
    try {
      const res = await axios.get(`${API_URL}/shiprocket/pickup-locations`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log("Pickup locations response:", res.data);

      if (res.data.success) {
        let locations = [];
        if (res.data.pickup_locations && Array.isArray(res.data.pickup_locations)) {
          locations = res.data.pickup_locations;
        } else if (res.data.locations && Array.isArray(res.data.locations)) {
          locations = res.data.locations;
        } else if (res.data.data && Array.isArray(res.data.data)) {
          locations = res.data.data;
        }

        setPickupLocations(locations);
        if (locations.length > 0) {
          const firstLocId = locations[0].id || locations[0].pickup_location_id || "";
          setSelectedPickupLocation(String(firstLocId));
        }
      } else {
        setPickupLocations([]);
      }
    } catch (error) {
      console.error("Failed to fetch pickup locations:", error);
      toast.error("Could not fetch pickup locations from Shiprocket");
      setPickupLocations([]);
    } finally {
      setFetching(false);
    }
  };

  const handleConfirm = () => {
    if (!selectedPickupLocation) {
      toast.error("Please select a pickup location");
      return;
    }
    onConfirm(orderId, String(selectedPickupLocation));
  };

  const selectedLocationDetails = pickupLocations.find(loc => {
    const locId = loc.id || loc.pickup_location_id;
    return String(locId) === String(selectedPickupLocation);
  });

  const getSelectedPickupSchedule = (location) => {
    if (!location || typeof location !== 'object') return null;
    const date = location.pickup_date || location.pickup_scheduled_date || location.pickup_date_time || location.schedule_date || location.shipment_pickup_date;
    const timeSlot = location.pickup_slot || location.pickup_time || location.pickup_time_slot || location.pickup_scheduled_time || location.schedule_time || location.shipment_pickup_time;
    if (!date && !timeSlot) return null;
    return {
      date: date || null,
      timeSlot: timeSlot || null,
      display: date && timeSlot ? `${date} ${timeSlot}` : date || timeSlot
    };
  };

  const selectedPickupSchedule = getSelectedPickupSchedule(selectedLocationDetails);

  if (!isOpen) return null;

  return (
    <div className="custom-confirm-overlay" onClick={onClose}>
      <div className="custom-confirm-box pickup-selector-box" onClick={(e) => e.stopPropagation()}>
        <h5>Select Pickup Location</h5>
        <p>Choose a pickup location from Shiprocket for Order #{orderId}</p>

        {selectedLocationDetails && !fetching && (
          <div className="selected-location-card">
            <div className="selected-location-header">
              <i className="bi bi-check-circle-fill"></i>
              <span>Selected Pickup Address</span>
            </div>
            <div className="selected-location-content">
              <div className="selected-location-name">
                <strong>{selectedLocationDetails.pickup_location || selectedLocationDetails.name || "Unnamed"}</strong>
              </div>
              <div className="selected-location-address">
                <i className="bi bi-geo-alt"></i>
                <span>
                  {selectedLocationDetails.address ? `${selectedLocationDetails.address}, ` : ''}
                  {selectedLocationDetails.address_2 ? `${selectedLocationDetails.address_2}, ` : ''}
                  {selectedLocationDetails.city}, {selectedLocationDetails.state} - {selectedLocationDetails.pincode}
                </span>
              </div>
              {selectedPickupSchedule && (
                <div className="selected-location-schedule">
                  <i className="bi bi-clock-history"></i>
                  <span><strong>Pickup Schedule:</strong> {selectedPickupSchedule.display}</span>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="location-dropdown-section">
          <div className="pickup-location-header">
            <label className="dropdown-label">Pickup Location</label>
            <button
              type="button"
              className="notion-refresh-btn-pickup"
              onClick={fetchPickupLocations}
              disabled={fetching}
              title="Refresh pickup locations"
            >
              {fetching ? (
                <div className="notion-spinner-small"></div>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M1 12C1 12 4 4 12 4C17 4 19 7 20 9M23 12C23 12 20 20 12 20C7 20 5 17 4 15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  <path d="M20 3V9H14M4 21V15H10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              )}
            </button>
          </div>
          <div className="notion-select-wrapper">
            <select
              value={selectedPickupLocation}
              onChange={(e) => setSelectedPickupLocation(e.target.value)}
              className="location-dropdown"
              disabled={fetching || pickupLocations.length === 0}
            >
              <option value="">-- Select a pickup location --</option>
              {pickupLocations.map(loc => {
                const id = loc.id || loc.pickup_location_id;
                const displayName = loc.pickup_location || loc.name || "Unnamed";
                return (
                  <option key={id} value={id}>
                    {displayName} - {loc.city}, {loc.state} ({loc.pincode})
                  </option>
                );
              })}
            </select>
          </div>
        </div>

        {pickupLocations.length === 0 && !fetching && (
          <div className="no-pickup-locations">
            <i className="bi bi-geo-alt-slash"></i>
            <p>No pickup locations found</p>
            <p className="small-text">Check your Shiprocket account settings to ensure warehouse addresses are configured.</p>
          </div>
        )}

        <div className="confirm-actions">
          <button className="confirm-cancel-btn" onClick={onClose} disabled={isLoading}>
            Cancel
          </button>
          <button
            className="confirm-execute-btn"
            onClick={handleConfirm}
            disabled={isLoading || fetching || pickupLocations.length === 0 || !selectedPickupLocation}
          >
            {isLoading ? (
              <>
                <div className="btn-spinner"></div>
                Pushing...
              </>
            ) : (
              "Continue"
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

const Orders = () => {
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [orders, setOrders] = useState([]);
  const [previewImage, setPreviewImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [statusUpdatingId, setStatusUpdatingId] = useState(null);
  const [pushLoading, setPushLoading] = useState(false);
  const [showAddressEditModal, setShowAddressEditModal] = useState(false);
  const [showPickupSelector, setShowPickupSelector] = useState(false);
  const [pendingPushOrder, setPendingPushOrder] = useState(null);
  const [checkingAwb, setCheckingAwb] = useState(false);
  const [selectedOrderPickupSchedule, setSelectedOrderPickupSchedule] = useState(null);
  const [loadingPickupSchedule, setLoadingPickupSchedule] = useState(false);
  const [pickupScheduleError, setPickupScheduleError] = useState(null);

  const [deleteConfirmOrder, setDeleteConfirmOrder] = useState(null);
  const [bulkDeleteMode, setBulkDeleteMode] = useState(false);
  const [selectedOrders, setSelectedOrders] = useState([]);
  const [bulkDeleting, setBulkDeleting] = useState(false);

  const [filterDate, setFilterDate] = useState(new Date().toISOString().split('T')[0]);

  const token = localStorage.getItem("token");
  const userRole = localStorage.getItem("userRole");
  const isSuperAdmin = userRole === "super_admin";

  const fetchOrders = async (isSilent = false) => {
    try {
      if (!isSilent) setInitialLoading(true);
      const res = await axios.get(`${API_URL}/admin/orders`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setOrders(res.data.orders || []);

      if (isSilent && selectedOrder) {
        const updatedSelectedOrder = res.data.orders.find(o => o.id === selectedOrder.id);
        if (updatedSelectedOrder) setSelectedOrder(updatedSelectedOrder);
      }
    } catch (err) {
      console.error("Fetch orders error:", err);
      if (!isSilent) toast.error("Failed to load orders");
    } finally {
      if (!isSilent) setInitialLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
    const interval = setInterval(() => {
      fetchOrders(true);
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const loadPickupSchedule = async () => {
      if (!selectedOrder || (!selectedOrder.shiprocket_order_id && !selectedOrder.shiprocket_shipment_id)) {
        setSelectedOrderPickupSchedule(null);
        setPickupScheduleError(null);
        return;
      }

      try {
        setLoadingPickupSchedule(true);
        setPickupScheduleError(null);

        const res = await axios.get(`${API_URL}/admin/orders/${selectedOrder.id}/shiprocket-pickup`, {
          headers: { Authorization: `Bearer ${token}` }
        });

        if (res.data.success) {
          setSelectedOrderPickupSchedule(res.data.schedule || null);
        } else {
          setSelectedOrderPickupSchedule(null);
          setPickupScheduleError(res.data.message || 'Unable to load pickup schedule');
        }
      } catch (err) {
        console.error('Pickup schedule fetch error:', err);
        setSelectedOrderPickupSchedule(null);
        setPickupScheduleError(err.response?.data?.message || 'Failed to load pickup schedule');
      } finally {
        setLoadingPickupSchedule(false);
      }
    };

    loadPickupSchedule();
  }, [selectedOrder]);

  const filteredOrders = orders.filter(order => {
    if (!filterDate) return true;
    const orderDate = new Date(order.created_at).toISOString().split('T')[0];
    return orderDate === filterDate;
  });

  const updateOrderStatus = async (id, status) => {
    try {
      setStatusUpdatingId(id);
      setLoading(true);
      await axios.put(
        `${API_URL}/admin/orders/${id}/status`,
        { status },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success("Order status updated successfully");
      fetchOrders(true);
    } catch (err) {
      console.error("Status update error:", err);
      toast.error("Failed to update order status");
    } finally {
      setStatusUpdatingId(null);
      setLoading(false);
    }
  };

  const updateOrderAddress = async (orderId, addressData) => {
    try {
      setLoading(true);
      const response = await axios.put(`${API_URL}/admin/orders/${orderId}/address`, addressData, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        toast.success("Address updated successfully!");
        await fetchOrders(true);
        if (selectedOrder && selectedOrder.id === orderId) {
          setSelectedOrder(response.data.order);
        }
        return true;
      }
      return false;
    } catch (err) {
      console.error("Address update error:", err);
      toast.error(err.response?.data?.message || "Failed to update address");
      return false;
    } finally {
      setLoading(false);
    }
  };

  const checkAWBStatus = async (orderId) => {
    try {
      setCheckingAwb(true);
      const res = await axios.get(`${API_URL}/admin/orders/${orderId}/awb-status`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.data.success) {
        if (res.data.has_awb) {
          toast.success(`✅ AWB Found: ${res.data.awb_code}`);
          await fetchOrders(true);
          if (selectedOrder && selectedOrder.id === orderId) {
            setSelectedOrder(prev => ({ ...prev, awb_code: res.data.awb_code }));
          }
        } else {
          toast.info(res.data.message || "AWB not assigned yet. It will be generated automatically by Shiprocket.");
          if (res.data.shipment_status) {
            toast.info(`Shipment Status: ${res.data.shipment_status}`);
          }
        }
      }
    } catch (err) {
      console.error("AWB status check error:", err);
      toast.error(err.response?.data?.message || "Failed to check AWB status");
    } finally {
      setCheckingAwb(false);
    }
  };

  const executePushToShiprocket = async (orderId, pickupLocationId) => {
    if (!pickupLocationId) {
      toast.error("Please select a pickup location");
      return;
    }

    try {
      setPushLoading(true);
      const res = await axios.post(`${API_URL}/admin/orders/${orderId}/shiprocket`,
        { pickup_location_id: pickupLocationId },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (res.data.success) {
        if (res.data.awb_code) {
          toast.success(`✅ Order Packed! AWB: ${res.data.awb_code}`);
        } else {
          toast.success("Order Packed! AWB will be generated automatically.");
        }

        await fetchOrders(true);
        setShowPickupSelector(false);
        setPendingPushOrder(null);
      }
    } catch (err) {
      console.error(err);
      const errorMsg = err.response?.data?.message || "Failed to push order to Shiprocket";
      toast.error(errorMsg);
    } finally {
      setPushLoading(false);
    }
  };

  const initiatePushToShiprocket = (order) => {
    const pushCheck = canPushToShiprocket(order);
    if (!pushCheck.canPush) {
      toast.error(pushCheck.reason);
      return;
    }
    setPendingPushOrder(order);
    setShowPickupSelector(true);
  };

  // Helper function to dynamically download files locally without popping open new windows
  const triggerDirectDownload = async (fileUrl, filename) => {
    try {
      const response = await axios.post(`${API_URL}/admin/orders/proxy-download`,
        { url: fileUrl },
        {
          headers: { Authorization: `Bearer ${token}` },
          responseType: 'blob' // Important: capture stream directly as Blob binary
        }
      );
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
    } catch (err) {
      console.error("Direct download failure:", err);
      throw new Error("Unable to download the document directly.");
    }
  };

  // Download Shipping Label (to paste on package)
  const downloadLabel = async (orderId) => {
    try {
      setLoading(true);

      // First check if order is ready for label
      const order = orders.find(o => o.id === orderId);
      const shippedStatuses = ['Placed', 'Processing', 'Shipped'];

      if (!shippedStatuses.includes(order?.order_status)) {
        toast.warning("⚠️ Shipping label is not available yet. Please wait until the order status changes to 'Shipped' or later.");
        return;
      }

      toast.info("Generating shipping label...");
      const res = await axios.post(`${API_URL}/admin/orders/${orderId}/label`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.data.success && res.data.label_url) {
        await triggerDirectDownload(res.data.label_url, `ShippingLabel-ORD${orderId}.pdf`);
        toast.success("Shipping label downloaded successfully.");
      } else {
        toast.error("Label not ready yet. Please try again after some time.");
      }
    } catch (err) {
      console.error("Label download error:", err);
      const backendMessage = err.response?.data?.message || err.response?.data?.error;
      if (backendMessage) {
        toast.error(backendMessage);
      } else if (err.response?.status === 400) {
        toast.error("Label not available. Please wait for Shiprocket to process the shipment.");
      } else {
        toast.error(err.message || "Failed to download label");
      }
    } finally {
      setLoading(false);
    }
  };

  // Download Shiprocket Invoice (Tax Invoice)
  const downloadShiprocketInvoice = async (orderId) => {
    try {
      setLoading(true);
      toast.info("Generating invoice...");
      const res = await axios.post(`${API_URL}/admin/orders/${orderId}/invoice`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success && res.data.invoice_url) {
        await triggerDirectDownload(res.data.invoice_url, `SRInvoice-ORD${orderId}.pdf`);
        toast.success("Invoice downloaded successfully.");
      } else {
        toast.error("Invoice URL not available");
      }
    } catch (err) {
      console.error("Invoice download error:", err);
      toast.error(err.message || "Failed to download invoice");
    } finally {
      setLoading(false);
    }
  };

  const canPushToShiprocket = (order) => {
    const hasCity = order.city && order.city !== '' && order.city !== 'City' && order.city !== 'city';
    const hasState = order.state && order.state !== '' && order.state !== 'State' && order.state !== 'state';
    const hasPincode = order.pincode && order.pincode.toString().length === 6;

    if (!hasCity || !hasState || !hasPincode) {
      const missing = [];
      if (!hasCity) missing.push('City');
      if (!hasState) missing.push('State');
      if (!hasPincode) missing.push('Pincode (6 digits)');

      return {
        canPush: false,
        reason: `Missing delivery address details (${missing.join(', ')}). Please update the order address first.`
      };
    }
    return { canPush: true, reason: null };
  };

  // Download local PDF invoice directly from backend stream
  const downloadLocalInvoice = async (order) => {
    try {
      setLoading(true);
      toast.info("Generating PDF invoice...");

      const response = await axios.get(`${API_URL}/admin/orders/${order.id}/local-pdf`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: "blob" // Handle binary data stream
      });

      // Create blob URL to trigger silent, automatic file download
      const blob = new Blob([response.data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `Invoice-ORD${order.id}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success("Invoice PDF downloaded successfully!");
    } catch (err) {
      console.error("Local PDF download error:", err);
      toast.error("Failed to download PDF invoice");
    } finally {
      setLoading(false);
    }
  };

  const deleteOrder = async (orderId) => {
    if (!isSuperAdmin) {
      toast.warn("Only Super Admin can delete orders");
      setDeleteConfirmOrder(null);
      return;
    }

    try {
      setLoading(true);
      const res = await axios.delete(`${API_URL}/admin/orders/${orderId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success) {
        toast.success(res.data.message);
        await fetchOrders();
        setDeleteConfirmOrder(null);
        if (selectedOrder && selectedOrder.id === orderId) {
          setSelectedOrder(null);
        }
      }
    } catch (err) {
      console.error("Delete order error:", err);
      toast.error(err.response?.data?.message || "Failed to delete order");
    } finally {
      setLoading(false);
    }
  };

  const bulkDeleteOrders = async () => {
    if (!isSuperAdmin) {
      toast.warn("Only Super Admin can bulk delete orders");
      setBulkDeleteMode(false);
      setSelectedOrders([]);
      return;
    }

    if (selectedOrders.length === 0) {
      toast.warning("No orders selected");
      return;
    }

    try {
      setBulkDeleting(true);
      const res = await axios.post(`${API_URL}/admin/orders/bulk-delete`,
        { orderIds: selectedOrders },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.data.success) {
        toast.success(res.data.message);
        await fetchOrders();
        setSelectedOrders([]);
        setBulkDeleteMode(false);
      }
    } catch (err) {
      console.error("Bulk delete error:", err);
      toast.error(err.response?.data?.message || "Failed to delete orders");
    } finally {
      setBulkDeleting(false);
    }
  };

  const toggleOrderSelection = (orderId) => {
    if (!isSuperAdmin) return;

    if (selectedOrders.includes(orderId)) {
      setSelectedOrders(selectedOrders.filter(id => id !== orderId));
    } else {
      setSelectedOrders([...selectedOrders, orderId]);
    }
  };

  const selectAllOrders = () => {
    if (!isSuperAdmin) return;

    const deletableOrders = filteredOrders.filter(order => order.order_status !== 'Delivered');

    if (selectedOrders.length === deletableOrders.length) {
      setSelectedOrders([]);
    } else {
      setSelectedOrders(deletableOrders.map(order => order.id));
    }
  };

  const deletableFilteredOrders = filteredOrders.filter(order => order.order_status !== 'Delivered');
  const allDeletableOrdersSelected = deletableFilteredOrders.length > 0 && selectedOrders.length === deletableFilteredOrders.length;
  const tableColumnCount = 9 + (isSuperAdmin ? 1 : 0);

  return (
    <div className="orders-container">
      {loading && (
        <div className="dash-loader-overlay">
          <div className="dash-loader-container">
            <div className="dash-spinner"></div>
          </div>
        </div>
      )}

      <div className="orders-header-flex">
        <h4>Orders Management</h4>
        <div className="orders-filter-area">
          <div className="date-filter-group">
            <span className="filter-label">Filter by Date:</span>
            <input
              type="date"
              className="admin-date-input"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              disabled={initialLoading}
            />
            {filterDate && (
              <button className="clear-filter-btn" onClick={() => setFilterDate("")} disabled={initialLoading}>
                <i className="bi bi-x-square-fill"></i>
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="orders-table">
        <div className="table-responsive">
          <table className="orders-table-new">
            <thead>
              <tr>
                {isSuperAdmin && bulkDeleteMode && <th style={{ width: '40px' }}><input type="checkbox" checked={allDeletableOrdersSelected} onChange={selectAllOrders} disabled={deletableFilteredOrders.length === 0} /></th>}
                <th>Order ID</th>
                <th>Date</th>
                <th>Customer</th>
                <th>Pickup</th>
                <th>Products</th>
                <th>P.Code</th>
                <th>Total Amount</th>
                <th>Status</th> 
               {isSuperAdmin && <th>Action</th>}
                {isSuperAdmin && !bulkDeleteMode && <th>Delete</th>}
              </tr>
            </thead>
            <tbody>
              {initialLoading ? (
                <tr>
                  <td colSpan={tableColumnCount} style={{ textAlign: 'center', padding: '40px' }}>
                    <div className="cate-loader-overlay" style={{ position: 'relative', height: '100px' }}>
                      <div className="cate-loader-container">
                        <div className="cate-spinner"></div>
                      </div>
                    </div>
                  </td>
                </tr>
              ) : filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={tableColumnCount} style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                    <i className="bi bi-inbox" style={{ fontSize: '2rem', display: 'block', marginBottom: '10px' }}></i>
                    No orders found for {filterDate ? new Date(filterDate).toLocaleDateString() : "the selected period"}
                  </td>
                </tr>
              ) : (
                filteredOrders.map(order => (
                  <tr key={order.id}>
                    {isSuperAdmin && bulkDeleteMode && (
                      <td>
                        <input
                          type="checkbox"
                          checked={selectedOrders.includes(order.id)}
                          onChange={() => toggleOrderSelection(order.id)}
                          disabled={order.order_status === 'Delivered'}
                        />
                      </td>
                    )}
                    <td>ORD{order.id}</td>
                    <td>{new Date(order.created_at).toLocaleDateString()}</td>
                    <td>
                      <div className="cust-info">
                        <strong>{order.customer_name}</strong>
                        <span>{order.phone}</span>
                      </div>
                    </td>
                    <td>
                      <span className="pickup-chip">
                        {order.pickup_schedule_display ? order.pickup_schedule_display : (order.shiprocket_order_id ? 'Pickup pending' : 'Not selected')}
                      </span>
                    </td>
                    <td>
                      <div className="order-thumbs">
                        {order.items && order.items.slice(0, 3).map((item, i) => (
                          <img
                            key={i}
                            src={getImageUrl(item.image) || "/assets/placeholder-product.jpg"}
                            alt={item.name}
                            title={item.name}
                            onClick={() => setPreviewImage(getImageUrl(item.image) || "/assets/placeholder-product.jpg")}
                            className="clickable-thumb"
                            onError={(e) => { e.target.src = "/assets/placeholder-product.jpg"; }}
                          />
                        ))}
                        {order.items && order.items.length > 3 && (
                          <span className="more-count">+{order.items.length - 3}</span>
                        )}
                      </div>
                    </td>
                    <td>
                      <div className="pid-column">
                        {order.items && order.items.map((item, i) => (
                          <span key={i} className="pid-badge">{item.product_code || "N/A"}{i < order.items.length - 1 ? "," : ""} </span>
                        ))}
                      </div>
                    </td>
                    <td>₹{parseFloat(order.total_amount).toFixed(2)}</td>
                    <td>
                      <select
                        value={order.order_status}
                        onChange={(e) => updateOrderStatus(order.id, e.target.value)}
                        className={`status-dropdown-admin ${order.order_status?.toLowerCase().replace(/\s+/g, '-') || ''}`}
                        disabled={statusUpdatingId === order.id}
                      >
                        <option>Placed</option>
                        <option>Processing</option>
                        <option>Shipped</option>
                        <option>Out for Delivery</option>
                        <option>Delivered</option>
                        <option>Returned</option>
                        <option>Cancelled</option>
                      </select>
                      {statusUpdatingId === order.id && (
                        <div className="status-updating-spinner">
                          <div className="inline-spinner"></div>
                        </div>
                      )}
                    </td>
                    <td>
                      <button className="view-btn-admin" onClick={() => setSelectedOrder(order)} disabled={loading}>
                        Details
                      </button>
                    </td>
                    {isSuperAdmin && !bulkDeleteMode && (
                      <td>
                        <button
                          className="delete-order-btn"
                          onClick={() => setDeleteConfirmOrder(order)}
                          disabled={loading || order.order_status === 'Delivered'}
                          title={order.order_status === 'Delivered' ? "Cannot delete delivered orders" : "Delete order"}
                        >
                          <i className="bi bi-trash3"></i>
                        </button>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {isSuperAdmin && (
          <div className="orders-table-toolbar">
            {!bulkDeleteMode ? (
              <button
                className="bulk-delete-mode-btn"
                onClick={() => setBulkDeleteMode(true)}
                disabled={initialLoading || filteredOrders.length === 0}
              >
                <i className="bi bi-trash3"></i> Bulk Delete
              </button>
            ) : (
              <div className="bulk-delete-controls">
                <button className="select-all-btn" onClick={selectAllOrders} disabled={deletableFilteredOrders.length === 0}>
                  <i className={`bi ${allDeletableOrdersSelected ? 'bi-check-square-fill' : 'bi-square'}`}></i>
                  {allDeletableOrdersSelected ? 'Deselect All' : 'Select All'}
                </button>
                <span className="selected-count">{selectedOrders.length} selected</span>
                <button className="execute-bulk-delete-btn" onClick={bulkDeleteOrders} disabled={selectedOrders.length === 0 || bulkDeleting}>
                  {bulkDeleting ? (
                    <><div className="btn-spinner-small"></div>Deleting...</>
                  ) : (
                    <><i className="bi bi-trash3"></i> Delete Selected</>
                  )}
                </button>
                <button className="cancel-bulk-mode-btn" onClick={() => { setBulkDeleteMode(false); setSelectedOrders([]); }}>Cancel</button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {isSuperAdmin && deleteConfirmOrder && (
        <div className="custom-confirm-overlay" onClick={() => setDeleteConfirmOrder(null)}>
          <div className="custom-confirm-box" onClick={(e) => e.stopPropagation()}>
            <div className="confirm-icon delete-icon"><i className="bi bi-trash-fill"></i></div>
            <h5>Delete Order #{deleteConfirmOrder.id}</h5>
            <p>Are you sure you want to delete this order? This action cannot be undone.</p>
            <p className="warning-text">⚠️ This will restore product stock and remove all order records.</p>
            <div className="confirm-actions">
              <button className="confirm-cancel-btn" onClick={() => setDeleteConfirmOrder(null)} disabled={loading}>Cancel</button>
              <button className="confirm-delete-btn" onClick={() => deleteOrder(deleteConfirmOrder.id)} disabled={loading}>
                {loading ? "Deleting..." : "Yes, Delete Order"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pickup Location Selector Modal */}
      <PickupLocationSelector
        isOpen={showPickupSelector}
        onClose={() => {
          setShowPickupSelector(false);
          setPendingPushOrder(null);
        }}
        onConfirm={executePushToShiprocket}
        orderId={pendingPushOrder?.id}
        isLoading={pushLoading}
      />

      {/* Order Details Modal */}
      {selectedOrder && (
        <div className="order-modal-overlay">
          <div className="order-modal-card">
            <div className="modal-header-admin">
              <h4>Order Details #ORD{selectedOrder.id}</h4>
              <button className="close-modal-btn" onClick={() => setSelectedOrder(null)}>✕</button>
            </div>

            <div className="modal-body-admin">
              <div className="modal-grid">
                <div className="cust-details-box">
                  <h5>Customer Information</h5>
                  <p><strong>Name:</strong> {selectedOrder.customer_name}</p>
                  <p><strong>Phone:</strong> {selectedOrder.phone}</p>
                  <p><strong>Email:</strong> {selectedOrder.email || 'N/A'}</p>
                  <p><strong>Address:</strong> {selectedOrder.address}</p>
                  {selectedOrder.city && <p><strong>City:</strong> {selectedOrder.city}</p>}
                  {selectedOrder.state && <p><strong>State:</strong> {selectedOrder.state}</p>}
                  {selectedOrder.pincode && <p><strong>Pincode:</strong> {selectedOrder.pincode}</p>}
                </div>

                <div className="order-summary-box">
                  <h5>Order Summary</h5>
                  <p><strong>Method:</strong> {selectedOrder.payment_method}</p>
                  <p><strong>Status:</strong> {selectedOrder.order_status}</p>
                  <p><strong>Total:</strong> ₹{parseFloat(selectedOrder.total_amount).toFixed(2)}</p>
                  <p><strong>Discount:</strong> ₹{parseFloat(selectedOrder.discount || 0).toFixed(2)}</p>
                  {selectedOrder.awb_code && <p><strong>AWB:</strong> {selectedOrder.awb_code}</p>}
                  {selectedOrder.shiprocket_order_id && <p><strong>SR Order ID:</strong> {selectedOrder.shiprocket_order_id}</p>}
                </div>
              </div>

              <div className="pickup-details-box cust-details-box">
                <h5>Pickup Schedule</h5>
                <p><strong>Pickup Location:</strong> <p className="address-display">
                  {selectedOrder.pickup_address_line1 && <span>{selectedOrder.pickup_address_line1} </span>}
                  {selectedOrder.pickup_address_line2 && <span>{selectedOrder.pickup_address_line2} </span>}
                  {selectedOrder.pickup_city && <span>{selectedOrder.pickup_city} </span>}
                  {selectedOrder.pickup_state && <span>{selectedOrder.pickup_state} </span>}
                  {selectedOrder.pickup_pincode && <span>{selectedOrder.pickup_pincode} </span>}
                </p></p>


                {loadingPickupSchedule && selectedOrder.shiprocket_order_id ? (
                  <p>Loading pickup date and time from Shiprocket...</p>
                ) : selectedOrderPickupSchedule ? (
                  <>
                    {selectedOrderPickupSchedule.display && <p><strong>Pickup:</strong> {selectedOrderPickupSchedule.display}</p>}
                    {!selectedOrderPickupSchedule.display && selectedOrderPickupSchedule.date && <p><strong>Date:</strong> {selectedOrderPickupSchedule.date}</p>}
                    {!selectedOrderPickupSchedule.display && selectedOrderPickupSchedule.time && <p><strong>Time:</strong> {selectedOrderPickupSchedule.time}</p>}
                  </>
                ) : selectedOrder.shiprocket_order_id ? (
                  <p><strong>Pickup Slots:</strong> Shipping is in Processing.</p>
                ) : (
                  <p><strong>Pickup:</strong> Not selected</p>
                )}

                {pickupScheduleError && <p className="error-text">{pickupScheduleError}</p>}
              </div>

              <div className="items-list-admin">
                <h5>Order Items ({selectedOrder.items?.length || 0})</h5>
                {selectedOrder.items && selectedOrder.items.map((item, idx) => {
                  const price = parseFloat(item.price) || 0;
                  const quantity = parseInt(item.quantity) || 0;
                  return (
                    <div key={idx} className="admin-item-row">
                      <img
                        src={getImageUrl(item.image) || "/assets/placeholder-product.jpg"}
                        alt={item.name}
                        onClick={() => setPreviewImage(getImageUrl(item.image) || "/assets/placeholder-product.jpg")}
                        className="clickable-img"
                        onError={(e) => { e.target.src = "/assets/placeholder-product.jpg"; }}
                      />
                      <div className="admin-item-info">
                        <h6>{item.name} <span className="item-pid-small">({item.product_code || "No ID"})</span></h6>
                        <p>Price: ₹{price.toFixed(2)} | Qty: {quantity}</p>
                      </div>
                      <div className="admin-item-total">₹{(price * quantity).toFixed(2)}</div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="modal-footer-admin">
              {/* Push to Shiprocket Button (Packed) */}
              {(() => {
                const pushCheck = canPushToShiprocket(selectedOrder);
                const isPushed = selectedOrder.shiprocket_order_id;
                return (
                  <div className="step-btn-wrapper">
                    <div className="step-number">Step 1</div>
                    <button
                      className="invoice-btn-admin push-btn"
                      onClick={() => initiatePushToShiprocket(selectedOrder)}
                      disabled={isPushed || pushLoading || !pushCheck.canPush}
                      title={!pushCheck.canPush ? pushCheck.reason : (isPushed ? "Already Packed" : "Pack Order")}
                    >
                      {pushLoading && pendingPushOrder?.id === selectedOrder.id ? (
                        <><div className="btn-spinner"></div>Packing...</>
                      ) : (
                        <>
                          <i className="bi bi-box-seam"></i>
                          <div className="btn-text-labels">
                            {isPushed ? "Packed" : "Pack Order"}
                            <span className="btn-subtext">Prepare Shipment</span>
                          </div>
                        </>
                      )}
                    </button>
                  </div>
                );
              })()}

              {/* SR INVOICE BUTTON - Tax invoice for records */}
              {selectedOrder.shiprocket_order_id && (
                <div className="step-btn-wrapper">
                  <div className="step-number">Step 2</div>
                  <button
                    className="invoice-btn-admin shiprocket-invoice-btn"
                    onClick={() => downloadShiprocketInvoice(selectedOrder.id)}
                    disabled={loading}
                  >
                    <i className="bi bi-receipt"></i>
                    <div className="btn-text-labels">
                      SR Invoice
                      <span className="btn-subtext">Inside Package</span>
                    </div>

                  </button>
                </div>
              )}

              {/* SHIPPING LABEL BUTTON - For pasting on package */}
              {selectedOrder.awb_code && (
                <div className="step-btn-wrapper">
                  <div className="step-number">Step 3</div>
                  <button
                    className="invoice-btn-admin label-btn"
                    onClick={() => downloadLabel(selectedOrder.id)}
                    disabled={loading}
                  >
                    <i className="bi bi-upc-scan"></i>
                    <div className="btn-text-labels">
                      Shipping Label
                      <span className="btn-subtext">Outside Package</span>
                    </div>

                  </button>
                </div>
              )}

              {/* Local PDF Invoice Download Button */}
              <div className="step-btn-wrapper">
                <div className="step-number">Step 4</div>
                <button className="invoice-btn-admin local-invoice-btn" onClick={() => downloadLocalInvoice(selectedOrder)} disabled={loading}>
                  <i className="bi bi-file-earmark-pdf"></i>
                  <div className="btn-text-labels">
                    Local Invoice
                    <span className="btn-subtext">Download Record</span>
                  </div>

                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Address Edit Modal */}
      <AddressEditModal order={selectedOrder} isOpen={showAddressEditModal} onClose={() => setShowAddressEditModal(false)} onUpdate={updateOrderAddress} />

      {/* Image Preview Lightbox */}
      {previewImage && (
        <div className="admin-lightbox-overlay" onClick={() => setPreviewImage(null)}>
          <div className="lightbox-content">
            <img src={previewImage} alt="Product Preview" onClick={(e) => e.stopPropagation()} onError={(e) => e.target.src = "/assets/placeholder-product.jpg"} />
            <button className="close-lightbox" onClick={() => setPreviewImage(null)}>✕</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Orders;

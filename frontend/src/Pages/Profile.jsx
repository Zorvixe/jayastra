import React, { useEffect, useState, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import axios from "axios";
import "./Profile.css";
import AddressSection from "../components/AddressSection";
import ExchangeModal from "../components/ExchangeModal";
import { useUser } from "../context/UserContext";

const API_URL = process.env.REACT_APP_API_URL;

const getImageUrl = (imagePath) => {
  if (!imagePath) return null;
  if (imagePath.startsWith("http")) return imagePath;
  let baseUrl = API_URL.replace(/\/api\/?$/, "");
  if (baseUrl.endsWith("/")) baseUrl = baseUrl.slice(0, -1);
  const cleanPath = imagePath.startsWith("/") ? imagePath : `/${imagePath}`;
  return `${baseUrl}${cleanPath}`;
};

// Optimized LazyImage with better loading
const LazyImage = ({ src, alt, className }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);

  return (
    <div className="profile-lazy-image-container" style={{ position: 'relative', width: '100%', height: '100%' }}>
      {isLoading && (
        <div className="profile-image-skeleton">
          <div className="profile-skeleton-shimmer"></div>
        </div>
      )}
      <img
        src={src}
        alt={alt}
        className={`${className} ${isLoading ? 'profile-img-loading' : 'profile-img-loaded'}`}
        style={{
          display: isLoading ? 'none' : 'block',
          width: '100%',
          height: '100%',
          objectFit: 'cover'
        }}
        onLoad={() => setIsLoading(false)}
        onError={() => {
          setError(true);
          setIsLoading(false);
        }}
      />
      {error && (
        <div className="profile-image-error-fallback">
          <i className="bi bi-image"></i>
        </div>
      )}
    </div>
  );
};

// Loading Components
const ProfileFormSkeleton = () => (
  <div className="profile-skeleton-form">
    <div className="profile-input-group-row">
      <div className="profile-form-field">
        <div className="profile-skeleton-line" style={{ width: '80px', height: '12px', marginBottom: '6px' }}></div>
        <div className="profile-skeleton-line" style={{ width: '100%', height: '38px', borderRadius: '6px' }}></div>
      </div>
      <div className="profile-form-field">
        <div className="profile-skeleton-line" style={{ width: '80px', height: '12px', marginBottom: '6px' }}></div>
        <div className="profile-skeleton-line" style={{ width: '100%', height: '38px', borderRadius: '6px' }}></div>
      </div>
    </div>
    <div className="profile-form-field">
      <div className="profile-skeleton-line" style={{ width: '60px', height: '12px', marginBottom: '6px' }}></div>
      <div className="profile-skeleton-line" style={{ width: '100%', height: '38px', borderRadius: '6px' }}></div>
    </div>
    <div className="profile-input-group-row">
      <div className="profile-form-field">
        <div className="profile-skeleton-line" style={{ width: '80px', height: '12px', marginBottom: '6px' }}></div>
        <div className="profile-skeleton-line" style={{ width: '100%', height: '38px', borderRadius: '6px' }}></div>
      </div>
      <div className="profile-form-field">
        <div className="profile-skeleton-line" style={{ width: '80px', height: '12px', marginBottom: '6px' }}></div>
        <div className="profile-skeleton-line" style={{ width: '100%', height: '38px', borderRadius: '6px' }}></div>
      </div>
    </div>
    <div className="profile-skeleton-line" style={{ width: '150px', height: '38px', borderRadius: '6px', marginTop: '8px' }}></div>
  </div>
);

const OrdersSkeleton = () => (
  <div className="profile-orders-skeleton">
    {[1, 2, 3].map((i) => (
      <div key={i} className="profile-order-skeleton-card">
        <div className="profile-skeleton-line" style={{ width: '150px', height: '16px', marginBottom: '12px' }}></div>
        <div className="profile-order-product-skeleton">
          <div className="profile-skeleton-image" style={{ width: '52px', height: '52px', borderRadius: '6px' }}></div>
          <div style={{ flex: 1 }}>
            <div className="profile-skeleton-line" style={{ width: '70%', height: '13px', marginBottom: '6px' }}></div>
            <div className="profile-skeleton-line" style={{ width: '40%', height: '10px' }}></div>
          </div>
        </div>
        <div className="profile-skeleton-line" style={{ width: '120px', height: '18px', marginTop: '12px' }}></div>
      </div>
    ))}
  </div>
);

const ReturnsSkeleton = () => (
  <div className="profile-returns-skeleton">
    {[1, 2].map((i) => (
      <div key={i} className="profile-return-skeleton-card">
        <div className="profile-skeleton-line" style={{ width: '120px', height: '16px', marginBottom: '12px' }}></div>
        <div className="profile-skeleton-line" style={{ width: '100%', height: '100px', borderRadius: '6px', marginBottom: '10px' }}></div>
        <div className="profile-skeleton-line" style={{ width: '60%', height: '11px', marginBottom: '6px' }}></div>
        <div className="profile-skeleton-line" style={{ width: '80%', height: '11px' }}></div>
      </div>
    ))}
  </div>
);

const Profile = () => {
  const { fetchUser } = useUser();
  const location = useLocation();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState(location.state?.activeTab || "profile");
  // ✅ FIX: Initialize all loading flags to false – they will be set to true only when fetching starts.
  const [loading, setLoading] = useState({
    profile: false,
    orders: false,
    returns: false
  });
  const [data, setData] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    gender: "",
  });
  const [orders, setOrders] = useState([]);
  const [returns, setReturns] = useState([]);
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [updatingProfile, setUpdatingProfile] = useState(false);
  const [toast, setToast] = useState({ show: false, message: "", type: "success" });
  // Track which sections have been loaded at least once
  const [loadedTabs, setLoadedTabs] = useState({
    profile: false,
    address: false,
    orders: false,
    returns: false
  });
  // Mobile bottom sheet state
  const [mobileSheetOpen, setMobileSheetOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  // Compute global loading state
  const isLoading = loading.profile || loading.orders || loading.returns;

  const showToast = (message, type = "success") => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: "", type: "success" }), 4000);
  };

  const token = localStorage.getItem("token");

  // Check window resize for mobile detection
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
      if (window.innerWidth > 768) {
        setMobileSheetOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  /* FETCH PROFILE */
  const fetchProfile = useCallback(async () => {
    if (!token) return;
    try {
      setLoading(prev => ({ ...prev, profile: true }));
      const res = await axios.get(`${API_URL}/user/profile`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setData(res.data);
      setLoadedTabs(prev => ({ ...prev, profile: true }));
    } catch (err) {
      console.error("Profile fetch error", err);
    } finally {
      setLoading(prev => ({ ...prev, profile: false }));
    }
  }, [token]);

  const fetchOrders = useCallback(async () => {
    if (!token) return;
    try {
      setLoading(prev => ({ ...prev, orders: true }));
      const res = await axios.get(`${API_URL}/orders`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setOrders(res.data || []);
      setLoadedTabs(prev => ({ ...prev, orders: true }));
    } catch (err) {
      console.error("Orders fetch error", err);
    } finally {
      setLoading(prev => ({ ...prev, orders: false }));
    }
  }, [token]);

  const fetchReturns = useCallback(async () => {
    if (!token) return;
    try {
      setLoading(prev => ({ ...prev, returns: true }));
      const res = await axios.get(`${API_URL}/user/returns`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setReturns(res.data.returns || []);
      setLoadedTabs(prev => ({ ...prev, returns: true }));
    } catch (err) {
      console.error("Returns fetch error", err);
    } finally {
      setLoading(prev => ({ ...prev, returns: false }));
    }
  }, [token]);

  // Initial load: only fetch profile data (always visible in sidebar)
  useEffect(() => {
    if (token) {
      fetchProfile();
      // For the initially active tab, load its data
      if (activeTab === 'orders') {
        fetchOrders();
      } else if (activeTab === 'returns') {
        fetchReturns();
      }
    }
  }, [token, fetchProfile, activeTab, fetchOrders, fetchReturns]);

  // Load data when tab changes, but only if not loaded before
  useEffect(() => {
    if (!token) return;

    if (activeTab === 'orders' && !loadedTabs.orders) {
      fetchOrders();
    } else if (activeTab === 'returns' && !loadedTabs.returns) {
      fetchReturns();
    }
  }, [activeTab, token, loadedTabs, fetchOrders, fetchReturns]);

  /* UPDATE */
  const handleUpdate = async () => {
    try {
      setUpdatingProfile(true);
      await axios.put(`${API_URL}/user/profile`, data, {
        headers: { Authorization: `Bearer ${token}` }
      });
      await fetchUser();
      showToast("Profile updated successfully ✨");
    } catch (err) {
      showToast("Failed to update profile", "error");
    } finally {
      setUpdatingProfile(false);
    }
  };

  // Handle tab click on mobile - open bottom sheet instead of showing content directly
  const handleMobileTabClick = (tab) => {
    setActiveTab(tab);
    setMobileSheetOpen(true);
    // Load data if not loaded
    if (tab === 'orders' && !loadedTabs.orders) {
      fetchOrders();
    } else if (tab === 'returns' && !loadedTabs.returns) {
      fetchReturns();
    }
  };

  // Close bottom sheet
  const closeMobileSheet = () => {
    setMobileSheetOpen(false);
  };

  // Render content for bottom sheet or desktop
  const renderTabContent = () => {
    return (
      <>
        {activeTab === "profile" && (
          <div className="profile-info-section">
            <div className="profile-form-section">
              <div className="profile-input-group-row">
                <div className="profile-form-field">
                  <label>First Name</label>
                  <input
                    value={data.first_name || ""}
                    onChange={(e) => setData({ ...data, first_name: e.target.value })}
                    placeholder="Enter first name"
                  />
                </div>
                <div className="profile-form-field">
                  <label>Last Name</label>
                  <input
                    value={data.last_name || ""}
                    onChange={(e) => setData({ ...data, last_name: e.target.value })}
                    placeholder="Enter last name"
                  />
                </div>
              </div>

              <div className="profile-form-field">
                <label>Gender</label>
                <div className="profile-gender-selector">
                  <div
                    className={`profile-gender-option ${data.gender === "Male" ? "selected" : ""}`}
                    onClick={() => setData({ ...data, gender: "Male" })}
                  >
                    <i className="bi bi-gender-male"></i> Male
                  </div>
                  <div
                    className={`profile-gender-option ${data.gender === "Female" ? "selected" : ""}`}
                    onClick={() => setData({ ...data, gender: "Female" })}
                  >
                    <i className="bi bi-gender-female"></i> Female
                  </div>
                </div>
              </div>

              <div className="profile-input-group-row">
                <div className="profile-form-field">
                  <label>Email Address</label>
                  <input
                    value={data.email || ""}
                    disabled
                    placeholder="Not provided"
                  />
                </div>
                <div className="profile-form-field">
                  <label>Phone Number</label>
                  <input
                    value={data.phone || ""}
                    disabled
                    placeholder="Not provided"
                  />
                </div>
              </div>

              <button className="profile-save-profile-btn" onClick={handleUpdate} disabled={updatingProfile}>
                {updatingProfile ? (
                  <>
                    <i className="bi bi-hourglass-split"></i> Saving...
                  </>
                ) : (
                  "Save Profile Changes"
                )}
              </button>
            </div>
          </div>
        )}

        {activeTab === "address" && (
          <div className="profile-address-section">
            <AddressSection />
          </div>
        )}

        {activeTab === "orders" && (
          <div className="profile-orders-section">
            {orders.length === 0 && !loading.orders && loadedTabs.orders ? (
              <div className="profile-empty-orders">
                <i className="bi bi-bag-x"></i>
                <p>You haven't placed any orders yet.</p>
                <button className="profile-shop-now-btn" onClick={() => navigate("/all-products")}>Shop Now</button>
              </div>
            ) : (
              <div className="profile-orders-list">
                {orders.map(o => (
                  <div key={o.id} className="profile-order-item-card-flip" onClick={() => navigate(`/order/${o.id}`)}>
                    <div className="profile-order-main-header">
                      <div className="profile-order-info-brief">
                        <span className={`profile-status-dot ${o.order_status.toLowerCase()}`}></span>
                        <span className="profile-order-status-text">{o.order_status}</span>
                        <span className="profile-dot-sep">•</span>
                        <span className="profile-order-date-text">{new Date(o.created_at).toLocaleDateString()}</span>
                      </div>
                      <i className="bi bi-chevron-right"></i>
                    </div>

                    <div className="profile-order-products-preview">
                      {o.items && o.items.slice(0, 2).map((item, idx) => (
                        <div key={idx} className="profile-order-product-row">
                          <div className="profile-prod-img">
                            <LazyImage
                              src={getImageUrl(item.image)}
                              alt={item.name}
                              className="profile-order-product-image"
                            />
                          </div>
                          <div className="profile-prod-details">
                            <h4 className="profile-prod-name">{item.name}</h4>
                            <p className="profile-prod-meta">Quantity: {item.quantity} • ₹{item.price}</p>
                          </div>
                        </div>
                      ))}
                      {o.items && o.items.length > 2 && (
                        <div className="profile-more-items">+{o.items.length - 2} more items</div>
                      )}
                    </div>

                    <div className="profile-order-footer">
                      <span className="profile-total-label">Total Amount: <strong>₹{o.total_amount}</strong></span>
                      <span className="profile-view-details-link">View Details <i className="bi bi-arrow-right"></i></span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "returns" && (
          <div className="profile-returns-section">
            {returns.length === 0 && !loading.returns && loadedTabs.returns ? (
              <div className="profile-empty-returns">
                <i className="bi bi-shield-check"></i>
                <p>No active return requests.</p>
              </div>
            ) : (
              <div className="profile-returns-list">
                {returns.map(r => (
                  <div key={r.id} className="profile-return-request-card">
                    <div className="profile-return-header">
                      <span className="profile-order-ref">Order #{r.order_id}</span>
                      <span className={`profile-status-pill ${r.status.toLowerCase()}`}>{r.status}</span>
                    </div>
                    <div className="profile-return-body">
                      <div className="profile-video-container">
                        {r.video_url && (
                          <video
                            src={`${API_URL.replace("/api", "")}${r.video_url}`}
                            className="profile-unboxing-video-preview"
                            controls
                            preload="metadata"
                          />
                        )}
                      </div>
                      <div className="profile-return-info">
                        <p className="label">Reason:</p>
                        <p className="profile-reason-text">{r.reason || "No reason provided"}</p>
                        {r.admin_comment && (
                          <div className="profile-admin-remark">
                            <strong>Admin Reply:</strong>
                            <p>{r.admin_comment}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </>
    );
  };

  // Render loading skeleton for bottom sheet
  const renderLoadingContent = () => {
    if (activeTab === "profile" && loading.profile && !loadedTabs.profile) {
      return <ProfileFormSkeleton />;
    }
    if (activeTab === "orders" && loading.orders && !loadedTabs.orders) {
      return <OrdersSkeleton />;
    }
    if (activeTab === "returns" && loading.returns && !loadedTabs.returns) {
      return <ReturnsSkeleton />;
    }
    return renderTabContent();
  };

  return (
    <div className="profile-container">
      {/* CUSTOM TOAST NOTIFICATION */}
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

      {/* SIDEBAR */}
      <div className="profile-sidebar">
        <div className="profile-user-card">
          <div className="profile-avatar">
            {loading.profile && !data.first_name ? (
              <div className="profile-avatar-skeleton"></div>
            ) : (
              `${data?.first_name?.[0] || ""}${data?.last_name?.[0] || ""}`.toUpperCase() || "J"
            )}
          </div>
          <div className="profile-user-meta">
            <p>Welcome back,</p>
            <h4>{(data.first_name)} {(data.last_name)}</h4>
          </div>
        </div>

        <div className="profile-nav-card">
          <div
            className={`profile-nav-item ${activeTab === "profile" ? "active" : ""}`}
            onClick={() => isMobile ? handleMobileTabClick("profile") : setActiveTab("profile")}
          >
            <div className="profile-nav-item-content">
              <i className="bi bi-person-circle"></i>
              <span>Personal Information</span>
            </div>
            <i className="bi bi-chevron-right profile-chevron-icon"></i>
          </div>
          <div
            className={`profile-nav-item ${activeTab === "address" ? "active" : ""}`}
            onClick={() => isMobile ? handleMobileTabClick("address") : setActiveTab("address")}
          >
            <div className="profile-nav-item-content">
              <i className="bi bi-geo-alt"></i>
              <span>Manage Addresses</span>
            </div>
            <i className="bi bi-chevron-right profile-chevron-icon"></i>
          </div>
          <div
            className={`profile-nav-item ${activeTab === "orders" ? "active" : ""}`}
            onClick={() => isMobile ? handleMobileTabClick("orders") : setActiveTab("orders")}
          >
            <div className="profile-nav-item-content">
              <i className="bi bi-bag"></i>
              <span>My Orders</span>
            </div>
            <i className="bi bi-chevron-right profile-chevron-icon"></i>
          </div>
          <div
            className={`profile-nav-item ${activeTab === "returns" ? "active" : ""}`}
            onClick={() => isMobile ? handleMobileTabClick("returns") : setActiveTab("returns")}
          >
            <div className="profile-nav-item-content">
              <i className="bi bi-arrow-return-left"></i>
              <span>My Returns</span>
            </div>
            <i className="bi bi-chevron-right profile-chevron-icon"></i>
          </div>
          <div
            className="profile-nav-item profile-logout"
            onClick={() => {
              localStorage.removeItem("token");
              window.location.href = "/";
            }}
          >
            <div className="profile-nav-item-content">
              <i className="bi bi-box-arrow-right"></i>
              <span>Logout</span>
            </div>
            <i className="bi bi-chevron-right profile-chevron-icon"></i>
          </div>
        </div>
      </div>

      {/* DESKTOP CONTENT AREA */}
      {!isMobile && (
        <div className="profile-content-area desktop-content">
          <div className="profile-content-header">
            <h2>
              {activeTab === "profile" && "Personal Information"}
              {activeTab === "address" && "Manage Addresses"}
              {activeTab === "orders" && "My Orders History"}
              {activeTab === "returns" && "Exchange Requests"}
            </h2>
            <p>
              {activeTab === "profile" && "Update your personal details here"}
              {activeTab === "address" && "Add, edit or remove your shipping addresses"}
              {activeTab === "orders" && "Track and manage your recent purchases"}
              {activeTab === "returns" && "* Returns are only accepted with unboxing video verification"}
            </p>
          </div>
          <div className="profile-content-wrapper">
            {isLoading && (
              <div className="profile-content-loader-overlay">
                <div className="profile-content-spinner"></div>
              </div>
            )}
            {renderTabContent()}
          </div>
        </div>
      )}

      {/* MOBILE BOTTOM SHEET */}
      {isMobile && (
        <>
          <div
            className={`profile-mobile-sheet-overlay ${mobileSheetOpen ? 'open' : ''}`}
            onClick={closeMobileSheet}
          />
          <div className={`profile-mobile-bottom-sheet ${mobileSheetOpen ? 'open' : ''}`}>
            <div className="profile-sheet-header">
              <div className="profile-sheet-drag-handle"></div>
              <div className="profile-sheet-title-wrapper">
                <h3 className="profile-sheet-title">
                  {activeTab === "profile" && "Personal Information"}
                  {activeTab === "address" && "Manage Addresses"}
                  {activeTab === "orders" && "My Orders"}
                  {activeTab === "returns" && "Exchange Requests"}
                </h3>
                <button className="profile-sheet-close-btn" onClick={closeMobileSheet}>
                  <i className="bi bi-x-lg"></i>
                </button>
              </div>
            </div>
            <div className="profile-sheet-content-wrapper">
              {isLoading && (
                <div className="profile-sheet-loader-overlay">
                  <div className="profile-content-spinner"></div>
                </div>
              )}
              <div className="profile-sheet-content">
                {renderLoadingContent()}
              </div>
            </div>
          </div>
        </>
      )}

      <ExchangeModal
        order={selectedOrder}
        isOpen={showReturnModal}
        onClose={() => setShowReturnModal(false)}
        onSuccess={fetchReturns}
      />
    </div>
  );
};

export default Profile;
import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import axios from "axios";
import "./Profile.css";
import AddressSection from "../components/AddressSection";
import ExchangeModal from "../components/ExchangeModal";
import { useUser } from "../context/UserContext";
import Loader from "../components/Loader"; // ✅ NEW

const API_URL = process.env.REACT_APP_API_URL;

const getImageUrl = (imagePath) => {
  if (!imagePath) return null;
  if (imagePath.startsWith("http")) return imagePath;
  let baseUrl = API_URL.replace(/\/api\/?$/, "");
  if (baseUrl.endsWith("/")) baseUrl = baseUrl.slice(0, -1);
  const cleanPath = imagePath.startsWith("/") ? imagePath : `/${imagePath}`;
  return `${baseUrl}${cleanPath}`;
};

// Image with loading state component
const LazyImage = ({ src, alt, className }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);

  return (
    <div className="lazy-image-container">
      {isLoading && (
        <div className="image-skeleton">
          <div className="skeleton-shimmer"></div>
        </div>
      )}
      <img
        src={src}
        alt={alt}
        className={`${className} ${isLoading ? 'img-loading' : 'img-loaded'}`}
        style={{ display: isLoading ? 'none' : 'block' }}
        onLoad={() => setIsLoading(false)}
        onError={() => {
          setError(true);
          setIsLoading(false);
        }}
      />
      {error && (
        <div className="image-error-fallback">
          <i className="bi bi-image"></i>
          <span>No Image</span>
        </div>
      )}
    </div>
  );
};

const Profile = () => {
  const { fetchUser } = useUser();
  const location = useLocation();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState(location.state?.activeTab || "profile");
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

  const showToast = (message, type = "success") => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: "", type: "success" }), 4000);
  };

  const token = localStorage.getItem("token");

  /* FETCH PROFILE */
  const fetchProfile = async () => {
    if (!token) return;
    try {
      setLoading(prev => ({ ...prev, profile: true }));
      const res = await axios.get(`${API_URL}/user/profile`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setData(res.data);
    } catch (err) {
      console.error("Profile fetch error", err);
    } finally {
      setLoading(prev => ({ ...prev, profile: false }));
    }
  };

  const fetchOrders = async () => {
    if (!token) return;
    try {
      setLoading(prev => ({ ...prev, orders: true }));
      const res = await axios.get(`${API_URL}/orders`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setOrders(res.data || []);
    } catch (err) {
      console.error("Orders fetch error", err);
    } finally {
      setLoading(prev => ({ ...prev, orders: false }));
    }
  };

  const fetchReturns = async () => {
    if (!token) return;
    try {
      setLoading(prev => ({ ...prev, returns: true }));
      const res = await axios.get(`${API_URL}/user/returns`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setReturns(res.data.returns || []);
    } catch (err) {
      console.error("Returns fetch error", err);
    } finally {
      setLoading(prev => ({ ...prev, returns: false }));
    }
  };

  useEffect(() => {
    if (token) {
      fetchProfile();
      fetchOrders();
      fetchReturns();
    }
  }, [token]);

  /* UPDATE */
  const handleUpdate = async () => {
    try {
      setUpdatingProfile(true);
      await axios.put(`${API_URL}/user/profile`, data, {
        headers: { Authorization: `Bearer ${token}` }
      });
      await fetchUser(); // ✅ Refresh Navbar/Sidebar
      showToast("Profile updated successfully ✨");
    } catch (err) {
      showToast("Failed to update profile", "error");
    } finally {
      setUpdatingProfile(false);
    }
  };

  // Loading skeleton for profile form
  const ProfileFormSkeleton = () => (
    <div className="skeleton-form">
      <div className="skeleton-input-group">
        <div className="skeleton-input"></div>
        <div className="skeleton-input"></div>
      </div>
      <div className="skeleton-input full-width"></div>
      <div className="skeleton-input-group">
        <div className="skeleton-input"></div>
        <div className="skeleton-input"></div>
      </div>
      <div className="skeleton-button"></div>
    </div>
  );

  // Loading skeleton for orders
  const OrdersSkeleton = () => (
    <div className="orders-skeleton">
      {[1, 2, 3].map((i) => (
        <div key={i} className="order-skeleton-card">
          <div className="skeleton-header"></div>
          <div className="skeleton-product-row">
            <div className="skeleton-image"></div>
            <div className="skeleton-text"></div>
          </div>
          <div className="skeleton-footer"></div>
        </div>
      ))}
    </div>
  );

  // Loading skeleton for returns
  const ReturnsSkeleton = () => (
    <div className="returns-skeleton">
      {[1, 2].map((i) => (
        <div key={i} className="return-skeleton-card">
          <div className="skeleton-header"></div>
          <div className="skeleton-video"></div>
          <div className="skeleton-text-line"></div>
          <div className="skeleton-text-line short"></div>
        </div>
      ))}
    </div>
  );

  return (
    <div className="profile-container">
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
      {/* SIDEBAR */}
      <div className="profile-sidebar">
        <div className="profile-user-card">
          <div className="profile-avatar">
            {loading.profile ? (
              <div className="avatar-skeleton"></div>
            ) : (
              data.first_name?.[0]?.toUpperCase() || "U"
            )}
          </div>
          <div className="user-meta">
            <p>Welcome back,</p>
            <h4>{loading.profile ? <Loader /> : (data.first_name || "User")}</h4>
          </div>
        </div>

        <div className="profile-nav-card">
          <div
            className={`nav-item ${activeTab === "profile" ? "active" : ""}`}
            onClick={() => setActiveTab("profile")}
          >
            <div className="nav-item-content">
              <i className="bi bi-person-circle"></i>
              <span>Personal Information</span>
            </div>
            <i className="bi bi-chevron-right chevron-icon"></i>
          </div>
          <div
            className={`nav-item ${activeTab === "address" ? "active" : ""}`}
            onClick={() => setActiveTab("address")}
          >
            <div className="nav-item-content">
              <i className="bi bi-geo-alt"></i>
              <span>Manage Addresses</span>
            </div>
            <i className="bi bi-chevron-right chevron-icon"></i>
          </div>
          <div
            className={`nav-item ${activeTab === "orders" ? "active" : ""}`}
            onClick={() => setActiveTab("orders")}
          >
            <div className="nav-item-content">
              <i className="bi bi-bag"></i>
              <span>My Orders</span>
            </div>
            <i className="bi bi-chevron-right chevron-icon"></i>
          </div>
          <div
            className={`nav-item ${activeTab === "returns" ? "active" : ""}`}
            onClick={() => setActiveTab("returns")}
          >
            <div className="nav-item-content">
              <i className="bi bi-arrow-return-left"></i>
              <span>My Returns</span>
            </div>
            <i className="bi bi-chevron-right chevron-icon"></i>
          </div>
          <div
            className="nav-item logout"
            onClick={() => {
              localStorage.removeItem("token");
              window.location.href = "/";
            }}
          >
            <div className="nav-item-content">
              <i className="bi bi-box-arrow-right"></i>
              <span>Logout</span>
            </div>
            <i className="bi bi-chevron-right chevron-icon"></i>
          </div>
        </div>
      </div>

      {/* MAIN CONTENT AREA */}
      <div className="profile-content-area">
        {activeTab === "profile" && (
          <div className="profile-info-section">
            <div className="profile-content-header">
              <h2>Personal Information</h2>
            </div>

            {loading.profile ? (
              <ProfileFormSkeleton />
            ) : (
              <div className="form-section">
                <div className="input-group-row">
                  <div className="form-field">
                    <label>First Name</label>
                    <input
                      value={data.first_name || ""}
                      onChange={(e) => setData({ ...data, first_name: e.target.value })}
                      placeholder="Enter first name"
                    />
                  </div>
                  <div className="form-field">
                    <label>Last Name</label>
                    <input
                      value={data.last_name || ""}
                      onChange={(e) => setData({ ...data, last_name: e.target.value })}
                      placeholder="Enter last name"
                    />
                  </div>
                </div>

                <div className="form-field">
                  <label>Gender</label>
                  <div className="gender-selector">
                    <div
                      className={`gender-option ${data.gender === "Male" ? "selected" : ""}`}
                      onClick={() => setData({ ...data, gender: "Male" })}
                    >
                      <i className="bi bi-gender-male"></i> Male
                    </div>
                    <div
                      className={`gender-option ${data.gender === "Female" ? "selected" : ""}`}
                      onClick={() => setData({ ...data, gender: "Female" })}
                    >
                      <i className="bi bi-gender-female"></i> Female
                    </div>
                  </div>
                </div>

                <div className="input-group-row">
                  <div className="form-field">
                    <label>Email Address</label>
                    <input
                      value={data.email || ""}
                      disabled
                      placeholder="Not provided"
                    />
                  </div>
                  <div className="form-field">
                    <label>Phone Number</label>
                    <input
                      value={data.phone || ""}
                      disabled
                      placeholder="Not provided"
                    />
                  </div>
                </div>

                <button className="save-profile-btn" onClick={handleUpdate} disabled={updatingProfile}>
                  {updatingProfile ? (
                    <>
                      <i className="bi bi-hourglass-split"></i> Saving...
                    </>
                  ) : (
                    "Save Profile Changes"
                  )}
                </button>
              </div>
            )}
          </div>
        )}

        {activeTab === "address" && (
          <div className="profile-address-section">
            <AddressSection />
          </div>
        )}

        {activeTab === "orders" && (
          <div className="profile-orders-section">
            <div className="profile-content-header">
              <h2>My Orders History</h2>
              <p style={{ fontSize: '12px', color: '#878787' }}>Track and manage your recent purchases</p>
            </div>
            {loading.orders ? (
              <OrdersSkeleton />
            ) : orders.length === 0 ? (
              <div className="empty-orders">
                <i className="bi bi-bag-x"></i>
                <p>You haven't placed any orders yet.</p>
              </div>
            ) : (
              <div className="orders-list">
                {orders.map(o => (
                  <div key={o.id} className="order-item-card-flip" onClick={() => navigate(`/order/${o.id}`)}>
                    <div className="order-main-header">
                      <div className="order-info-brief">
                        <span className={`status-dot ${o.order_status.toLowerCase()}`}></span>
                        <span className="order-status-text">{o.order_status}</span>
                        <span className="dot-sep">•</span>
                        <span className="order-date-text">{new Date(o.created_at).toLocaleDateString()}</span>
                      </div>
                      <i className="bi bi-chevron-right"></i>
                    </div>

                    <div className="order-products-preview">
                      {o.items && o.items.map((item, idx) => (
                        <div key={idx} className="order-product-row">
                          <div className="prod-img">
                            <LazyImage 
                              src={getImageUrl(item.image)} 
                              alt={item.name}
                              className="order-product-image"
                            />
                          </div>
                          <div className="prod-details">
                            <h4 className="prod-name">{item.name}</h4>
                            <p className="prod-meta">Quantity: {item.quantity} • ₹{item.price}</p>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="order-footer">
                      <span className="total-label">Total Amount: <strong>₹{o.total_amount}</strong></span>
                      <span className="view-details-link">View Details <i className="bi bi-arrow-right"></i></span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "returns" && (
          <div className="profile-returns-section">
            <div className="profile-content-header">
              <h2>Exchange Requests</h2>
              <p className="policy-note">* Returns are only accepted with unboxing video verification.</p>
            </div>
            {loading.returns ? (
              <ReturnsSkeleton />
            ) : returns.length === 0 ? (
              <div className="empty-returns">
                <i className="bi bi-shield-check"></i>
                <p>No active return requests.</p>
              </div>
            ) : (
              <div className="returns-list">
                {returns.map(r => (
                  <div key={r.id} className="return-request-card">
                    <div className="return-header">
                      <span className="order-ref">Order #{r.order_id}</span>
                      <span className={`status-pill ${r.status.toLowerCase()}`}>{r.status}</span>
                    </div>
                    <div className="return-body">
                      <div className="video-container">
                        {r.video_url && (
                          <video 
                            src={`${API_URL.replace("/api", "")}${r.video_url}`} 
                            className="unboxing-video-preview" 
                            controls 
                            preload="metadata"
                          />
                        )}
                      </div>
                      <div className="return-info">
                        <p className="label">Reason:</p>
                        <p className="reason-text">{r.reason || "No reason provided"}</p>
                        {r.admin_comment && (
                          <div className="admin-remark">
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

        <ExchangeModal
          order={selectedOrder}
          isOpen={showReturnModal}
          onClose={() => setShowReturnModal(false)}
          onSuccess={fetchReturns}
        />
      </div>
    </div>
  );
};

export default Profile;
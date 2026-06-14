import React, { useEffect, useState, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import axios from "axios";
import "./Profile.css";
import AddressSection from "../components/AddressSection";
import ExchangeModal from "../components/ExchangeModal";
import { useUser } from "../context/UserContext";
import { useWishlist } from "../context/WishlistContext";

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
    <div className="lazy-image-container" style={{ position: 'relative', width: '100%', height: '100%' }}>
      {isLoading && (
        <div className="image-skeleton">
          <div className="skeleton-shimmer"></div>
        </div>
      )}
      <img
        src={src}
        alt={alt}
        className={`${className} ${isLoading ? 'img-loading' : 'img-loaded'}`}
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
        <div className="image-error-fallback">
          <i className="bi bi-image"></i>
        </div>
      )}
    </div>
  );
};

// Loading Skeletons
const ProfileFormSkeleton = () => (
  <div className="skeleton-form">
    <div className="skeleton-line" style={{ width: '80px', height: '14px', marginBottom: '8px' }}></div>
    <div className="skeleton-line" style={{ width: '100%', height: '48px', borderRadius: '8px', marginBottom: '16px' }}></div>
    <div className="skeleton-line" style={{ width: '100px', height: '14px', marginBottom: '8px' }}></div>
    <div className="skeleton-line" style={{ width: '100%', height: '48px', borderRadius: '8px', marginBottom: '16px' }}></div>
    <div className="skeleton-line" style={{ width: '60px', height: '14px', marginBottom: '8px' }}></div>
    <div className="skeleton-line" style={{ width: '100%', height: '48px', borderRadius: '8px' }}></div>
  </div>
);

const OrdersSkeleton = () => (
  <div className="orders-skeleton">
    {[1, 2].map((i) => (
      <div key={i} className="order-skeleton-card">
        <div className="skeleton-line" style={{ width: '200px', height: '20px', marginBottom: '16px' }}></div>
        <div className="order-product-skeleton">
          <div className="skeleton-image" style={{ width: '72px', height: '72px', borderRadius: '8px' }}></div>
          <div style={{ flex: 1 }}>
            <div className="skeleton-line" style={{ width: '70%', height: '16px', marginBottom: '8px' }}></div>
            <div className="skeleton-line" style={{ width: '40%', height: '12px' }}></div>
          </div>
        </div>
      </div>
    ))}
  </div>
);

const ReturnsSkeleton = () => (
  <div className="returns-skeleton">
    {[1, 2].map((i) => (
      <div key={i} className="return-skeleton-card">
        <div className="skeleton-line" style={{ width: '150px', height: '20px', marginBottom: '16px' }}></div>
        <div className="skeleton-line" style={{ width: '100%', height: '100px', borderRadius: '8px' }}></div>
      </div>
    ))}
  </div>
);

const Profile = () => {
  const { fetchUser } = useUser();
  const { wishlistItems, fetchWishlist } = useWishlist();
  const location = useLocation();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState(location.state?.activeTab || "overview");
  const [loading, setLoading] = useState({
    profile: true,
    orders: true,
    returns: true
  });
  const [data, setData] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    gender: "",
    balance: 0,
    created_at: null
  });
  const [orders, setOrders] = useState([]);
  const [returns, setReturns] = useState([]);
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [updatingProfile, setUpdatingProfile] = useState(false);
  const [toast, setToast] = useState({ show: false, message: "", type: "success" });
  const [loadedTabs, setLoadedTabs] = useState({
    profile: false,
    address: false,
    orders: false,
    returns: false
  });
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [copiedCode, setCopiedCode] = useState("");

  const showToast = (message, type = "success") => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: "", type: "success" }), 4000);
  };

  const token = localStorage.getItem("token");

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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

  // Initial load
  useEffect(() => {
    if (token) {
      fetchProfile();
      fetchOrders();
      fetchWishlist();
      if (activeTab === 'returns') {
        fetchReturns();
      }
    }
  }, [token, fetchProfile, activeTab, fetchOrders, fetchReturns, fetchWishlist]);

  // Tab dynamic loading
  useEffect(() => {
    if (!token) return;
    if (activeTab === 'returns' && !loadedTabs.returns) {
      fetchReturns();
    }
  }, [activeTab, token, loadedTabs, fetchReturns]);

  const handleUpdate = async () => {
    try {
      setUpdatingProfile(true);
      await axios.put(`${API_URL}/user/profile`, data, {
        headers: { Authorization: `Bearer ${token}` }
      });
      await fetchUser();
      showToast("Profile details updated successfully ✨");
    } catch (err) {
      showToast("Failed to update profile details", "error");
    } finally {
      setUpdatingProfile(false);
    }
  };

  const copyCouponCode = (code) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    showToast(`Coupon code ${code} copied to clipboard!`, "success");
    setTimeout(() => setCopiedCode(""), 3000);
  };

  // Derived metrics
  const walletBalance = parseFloat(data.balance || 0);
  const loyaltyPoints = Math.floor(walletBalance * 1.5) + (orders.length * 120) + 150;
  const nextMilestone = 1000;
  const loyaltyProgress = Math.min(100, (loyaltyPoints / nextMilestone) * 100);
  const userNameInitials = data.first_name?.[0]?.toUpperCase() || "U";
  const userFullName = data.first_name ? `${data.first_name} ${data.last_name || ""}` : "User";

  // Render components inside the right column tab view
  const renderTabContent = () => {
    if (activeTab === "overview") {
      const latestOrder = orders[0];

      return (
        <div className="overview-hub">
          {/* LOYALTY AND WALLET GRID */}
          <div className="overview-grid">
            <div className="overview-card loyalty-card-premium">
              <div className="loyalty-header">
                <div>
                  <span className="badge-loyalty">Royale Club</span>
                  <h3>Loyalty Rewards</h3>
                </div>
                <div className="loyalty-points-display">
                  <span className="points-number">{loyaltyPoints}</span>
                  <span className="points-label">Pts</span>
                </div>
              </div>
              <p className="loyalty-subtext">Unlock Platinum status at {nextMilestone} points</p>
              <div className="loyalty-progress-container">
                <div className="loyalty-progress-bar" style={{ width: `${loyaltyProgress}%` }}></div>
              </div>
              <div className="loyalty-footer">
                <span>{Math.floor(loyaltyProgress)}% Completed</span>
                <span>Tier: Gold Member</span>
              </div>
            </div>

            <div className="overview-card wallet-card-premium">
              <div className="wallet-header">
                <div>
                  <span className="badge-wallet"><i className="bi bi-wallet2"></i> J-Wallet</span>
                  <h3>Store Credits</h3>
                </div>
                <div className="wallet-amount-display">
                  ₹{walletBalance.toLocaleString("en-IN")}
                </div>
              </div>
              <p className="wallet-subtext">Use credits seamlessly at checkout on sarees & lehengas.</p>
              <button className="shop-now-mini-btn" onClick={() => navigate("/all-products")}>
                Shop Now <i className="bi bi-arrow-right-short"></i>
              </button>
            </div>
          </div>

          {/* LATEST ORDER TRACKING */}
          <div className="overview-section-card">
            <div className="section-card-header">
              <h4>Active / Recent Order Tracker</h4>
              {orders.length > 0 && (
                <button className="view-all-link-btn" onClick={() => setActiveTab("orders")}>
                  View All Orders
                </button>
              )}
            </div>

            {orders.length === 0 ? (
              <div className="empty-order-overview">
                <i className="bi bi-cart-x"></i>
                <p>No active or past orders found.</p>
                <button className="shop-btn-elegant" onClick={() => navigate("/all-products")}>
                  Explore Handloom Collections
                </button>
              </div>
            ) : (
              <div className="latest-order-tracker">
                <div className="order-summary-header">
                  <div>
                    <span className="order-id-lbl">Order ID: </span>
                    <span className="order-id-val">#{latestOrder.id}</span>
                  </div>
                  <span className="order-date-val">{new Date(latestOrder.created_at).toLocaleDateString()}</span>
                </div>

                <div className="order-tracker-product-row">
                  <div className="prod-img">
                    <LazyImage 
                      src={getImageUrl(latestOrder.items?.[0]?.image)} 
                      alt={latestOrder.items?.[0]?.name}
                    />
                  </div>
                  <div className="prod-meta-info">
                    <h5>{latestOrder.items?.[0]?.name || "Luxury Saree"}</h5>
                    <p className="price-tag">₹{latestOrder.total_amount} ({latestOrder.items?.length || 1} Item)</p>
                  </div>
                </div>

                {/* TRACKING BAR */}
                <div className="tracking-timeline-container">
                  <div className="timeline-progress-line">
                    <div 
                      className="timeline-progress-active" 
                      style={{
                        width: latestOrder.order_status?.toLowerCase() === "delivered" ? "100%" :
                               latestOrder.order_status?.toLowerCase() === "shipped" ? "66%" :
                               latestOrder.order_status?.toLowerCase() === "processing" ? "33%" : "0%"
                      }}
                    ></div>
                  </div>
                  <div className="timeline-steps">
                    <div className={`step-node active`}>
                      <span className="node-icon"><i className="bi bi-check-lg"></i></span>
                      <span className="node-label">Placed</span>
                    </div>
                    <div className={`step-node ${["processing", "shipped", "delivered"].includes(latestOrder.order_status?.toLowerCase()) ? "active" : ""}`}>
                      <span className="node-icon"><i className="bi bi-gear-fill"></i></span>
                      <span className="node-label">Processing</span>
                    </div>
                    <div className={`step-node ${["shipped", "delivered"].includes(latestOrder.order_status?.toLowerCase()) ? "active" : ""}`}>
                      <span className="node-icon"><i className="bi bi-truck"></i></span>
                      <span className="node-label">Shipped</span>
                    </div>
                    <div className={`step-node ${latestOrder.order_status?.toLowerCase() === "delivered" ? "active" : ""}`}>
                      <span className="node-icon"><i className="bi bi-house-heart-fill"></i></span>
                      <span className="node-label">Delivered</span>
                    </div>
                  </div>
                </div>

                <div className="tracker-footer">
                  <button className="btn-track-action" onClick={() => navigate(`/order/${latestOrder.id}`)}>
                    Detailed Tracking Details <i className="bi bi-chevron-right"></i>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* DYNAMIC TWO COLUMN WIDGETS BELOW (COUPONS & WISHLIST) */}
          <div className="overview-two-columns">
            {/* WISHLIST PEEK */}
            <div className="overview-section-card wishlist-peek-card">
              <div className="section-card-header">
                <h4>My Wishlist Items ({wishlistItems.length})</h4>
                {wishlistItems.length > 0 && (
                  <button className="view-all-link-btn" onClick={() => navigate("/wishlist")}>
                    Go to Wishlist
                  </button>
                )}
              </div>
              {wishlistItems.length === 0 ? (
                <div className="empty-wishlist-peek">
                  <i className="bi bi-heart"></i>
                  <p>Your wishlist is empty</p>
                  <span onClick={() => navigate("/all-products")}>Browse Sarees</span>
                </div>
              ) : (
                <div className="wishlist-peek-list">
                  {wishlistItems.slice(0, 3).map((item) => (
                    <div key={item.id} className="wishlist-peek-item" onClick={() => navigate(`/product/${item.uuid || item.id}/${item.slug || ""}`)}>
                      <div className="wishlist-peek-img">
                        <LazyImage src={getImageUrl(item.main_image_url || item.image)} alt={item.name} />
                      </div>
                      <div className="wishlist-peek-info">
                        <h6>{item.name}</h6>
                        <p>₹{item.price}</p>
                      </div>
                      <i className="bi bi-chevron-right arrow-go"></i>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* EXCLUSIVE COUPONS */}
            <div className="overview-section-card coupons-card">
              <div className="section-card-header">
                <h4>Exclusive Offers For You</h4>
              </div>
              <div className="coupons-list">
                <div className="coupon-item">
                  <div className="coupon-left">
                    <span className="discount-txt">10% OFF</span>
                    <span className="label-txt">Handlooms</span>
                  </div>
                  <div className="coupon-right">
                    <p className="coupon-desc">Use code for flat 10% off on all premium handloom sarees.</p>
                    <button 
                      className={`copy-code-btn ${copiedCode === 'JAYASILK10' ? 'copied' : ''}`}
                      onClick={() => copyCouponCode('JAYASILK10')}
                    >
                      {copiedCode === 'JAYASILK10' ? 'Copied!' : 'JAYASILK10'}
                    </button>
                  </div>
                </div>

                <div className="coupon-item">
                  <div className="coupon-left">
                    <span className="discount-txt">₹500 OFF</span>
                    <span className="label-txt">Wedding</span>
                  </div>
                  <div className="coupon-right">
                    <p className="coupon-desc">Get extra ₹500 off on our designer bridal collection.</p>
                    <button 
                      className={`copy-code-btn ${copiedCode === 'BRIDAL500' ? 'copied' : ''}`}
                      onClick={() => copyCouponCode('BRIDAL500')}
                    >
                      {copiedCode === 'BRIDAL500' ? 'Copied!' : 'BRIDAL500'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    if (activeTab === "orders") {
      return (
        <div className="profile-orders-section">
          {orders.length === 0 && !loading.orders && loadedTabs.orders ? (
            <div className="empty-orders">
              <i className="bi bi-bag-x"></i>
              <p>You haven't placed any orders yet.</p>
              <button className="shop-now-btn" onClick={() => navigate("/all-products")}>Shop Now</button>
            </div>
          ) : (
            <div className="orders-list">
              {orders.map(o => (
                <div key={o.id} className="order-item-card-flip" onClick={() => navigate(`/order/${o.id}`)}>
                  <div className="order-main-header">
                    <div className="order-info-brief">
                      <span className={`status-dot ${o.order_status?.toLowerCase()}`}></span>
                      <span className="order-status-text">{o.order_status}</span>
                      <span className="dot-sep">•</span>
                      <span className="order-date-text">{new Date(o.created_at).toLocaleDateString()}</span>
                    </div>
                    <i className="bi bi-chevron-right"></i>
                  </div>

                  <div className="order-products-preview">
                    {o.items && o.items.slice(0, 2).map((item, idx) => (
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
                    {o.items && o.items.length > 2 && (
                      <div className="more-items">+{o.items.length - 2} more items</div>
                    )}
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
      );
    }

    if (activeTab === "address") {
      return (
        <div className="profile-address-section">
          <AddressSection />
        </div>
      );
    }

    if (activeTab === "returns") {
      return (
        <div className="profile-returns-section">
          <div className="returns-disclaimer">
            <i className="bi bi-info-circle-fill"></i>
            <p>Note: Exchange and return requests are only accepted with unboxing video verification.</p>
          </div>
          {returns.length === 0 && !loading.returns && loadedTabs.returns ? (
            <div className="empty-returns">
              <i className="bi bi-shield-check"></i>
              <p>No active return or exchange requests.</p>
            </div>
          ) : (
            <div className="returns-list">
              {returns.map(r => (
                <div key={r.id} className="return-request-card">
                  <div className="return-header">
                    <span className="order-ref">Order #{r.order_id}</span>
                    <span className={`status-pill ${r.status?.toLowerCase()}`}>{r.status}</span>
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
      );
    }
  };

  const renderLoadingSkeleton = () => {
    if (activeTab === "orders" && loading.orders) return <OrdersSkeleton />;
    if (activeTab === "returns" && loading.returns) return <ReturnsSkeleton />;
    return renderTabContent();
  };

  return (
    <div className="profile-wrapper">
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

      {/* TOP DECORATIVE BANNER */}
      <div className="profile-luxury-banner">
        <div className="banner-overlay-gradient"></div>
        <div className="banner-content-container">
          <div className="banner-user-info">
            <div className="user-avatar-gold">
              {loading.profile && !data.first_name ? (
                <div className="avatar-skeleton"></div>
              ) : (
                userNameInitials
              )}
            </div>
            <div className="user-text-meta">
              <span className="badge-member-tier"><i className="bi bi-gem"></i> Gold Royale</span>
              <h2>Namaste, {loading.profile && !data.first_name ? "User" : data.first_name}!</h2>
              <p className="welcome-tagline">Welcome to your JAYASTRA account dashboard. Explore your handloom legacy.</p>
            </div>
          </div>

          {/* BANNER STATS COUNTER */}
          <div className="banner-stats-counters">
            <div className="stat-glass-item">
              <span className="stat-val">{orders.length}</span>
              <span className="stat-lbl">Orders placed</span>
            </div>
            <div className="stat-glass-item">
              <span className="stat-val">{wishlistItems.length}</span>
              <span className="stat-lbl">Saved Items</span>
            </div>
            <div className="stat-glass-item">
              <span className="stat-val">{loyaltyPoints}</span>
              <span className="stat-lbl">Reward Pts</span>
            </div>
          </div>
        </div>
      </div>

      {/* MAIN LAYOUT WRAPPER */}
      <div className="profile-layout-container">
        
        {/* LEFT COLUMN: USER DETAILS */}
        <div className="layout-column-left">
          <div className="user-details-card">
            <div className="card-header-line">
              <h3>Personal Profile Details</h3>
              <p>Review and update your personal credentials below</p>
            </div>

            {loading.profile && !data.first_name ? (
              <ProfileFormSkeleton />
            ) : (
              <div className="form-section-static">
                <div className="form-field-item">
                  <label>First Name</label>
                  <input
                    value={data.first_name || ""}
                    onChange={(e) => setData({ ...data, first_name: e.target.value })}
                    placeholder="Enter first name"
                    className="premium-input"
                  />
                </div>
                <div className="form-field-item">
                  <label>Last Name</label>
                  <input
                    value={data.last_name || ""}
                    onChange={(e) => setData({ ...data, last_name: e.target.value })}
                    placeholder="Enter last name"
                    className="premium-input"
                  />
                </div>

                <div className="form-field-item">
                  <label>Gender</label>
                  <div className="gender-pill-container">
                    <button
                      type="button"
                      className={`gender-pill-btn ${data.gender === "Male" ? "active" : ""}`}
                      onClick={() => setData({ ...data, gender: "Male" })}
                    >
                      <i className="bi bi-gender-male"></i> Male
                    </button>
                    <button
                      type="button"
                      className={`gender-pill-btn ${data.gender === "Female" ? "active" : ""}`}
                      onClick={() => setData({ ...data, gender: "Female" })}
                    >
                      <i className="bi bi-gender-female"></i> Female
                    </button>
                  </div>
                </div>

                <div className="form-field-item">
                  <label>Email Address</label>
                  <input
                    value={data.email || ""}
                    disabled
                    placeholder="Not registered"
                    className="premium-input disabled"
                  />
                  <span className="input-hint-locked"><i className="bi bi-lock-fill"></i> Email address is verified and locked</span>
                </div>

                <div className="form-field-item">
                  <label>Phone Number</label>
                  <input
                    value={data.phone || ""}
                    disabled
                    placeholder="Not linked"
                    className="premium-input disabled"
                  />
                  <span className="input-hint-locked"><i className="bi bi-lock-fill"></i> Phone number is locked</span>
                </div>

                <button 
                  className="btn-premium-save" 
                  onClick={handleUpdate} 
                  disabled={updatingProfile}
                >
                  {updatingProfile ? (
                    <>
                      <span className="spinner-border-mini"></span> Updating...
                    </>
                  ) : (
                    <>
                      <i className="bi bi-shield-check"></i> Save Profile Changes
                    </>
                  )}
                </button>

                <div 
                  className="btn-logout-sidebar" 
                  onClick={() => {
                    localStorage.removeItem("token");
                    window.location.href = "/";
                  }}
                >
                  <i className="bi bi-box-arrow-right"></i> Sign Out of Account
                </div>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: TABS & CONTENT AREA */}
        <div className="layout-column-right">
          
          {/* TAB NAVIGATION BAR */}
          <div className="premium-tab-nav">
            <button 
              className={`tab-nav-btn ${activeTab === "overview" ? "active" : ""}`}
              onClick={() => setActiveTab("overview")}
            >
              <i className="bi bi-grid-1x2"></i> Overview
            </button>
            <button 
              className={`tab-nav-btn ${activeTab === "orders" ? "active" : ""}`}
              onClick={() => setActiveTab("orders")}
            >
              <i className="bi bi-bag"></i> My Orders
            </button>
            <button 
              className={`tab-nav-btn ${activeTab === "address" ? "active" : ""}`}
              onClick={() => setActiveTab("address")}
            >
              <i className="bi bi-geo-alt"></i> Addresses
            </button>
            <button 
              className={`tab-nav-btn ${activeTab === "returns" ? "active" : ""}`}
              onClick={() => setActiveTab("returns")}
            >
              <i className="bi bi-arrow-return-left"></i> Returns
            </button>
          </div>

          {/* DYNAMIC CONTENT CONTAINER */}
          <div className="premium-tab-content-box">
            <div className="content-pane-header">
              <h2>
                {activeTab === "overview" && "Dashboard Overview"}
                {activeTab === "orders" && "My Orders History"}
                {activeTab === "address" && "Manage Addresses"}
                {activeTab === "returns" && "Exchange Requests"}
              </h2>
              <p>
                {activeTab === "overview" && "Track recent activities, view rewards and exclusive discounts."}
                {activeTab === "orders" && "Review details and track all your boutique purchases."}
                {activeTab === "address" && "Add, edit, or configure your default shipping coordinates."}
                {activeTab === "returns" && "Check status of return requests or file new ones with unboxing video."}
              </p>
            </div>
            {renderLoadingSkeleton()}
          </div>
        </div>

      </div>

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
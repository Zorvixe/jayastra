import React, { useMemo, useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useCart } from "../context/CartContext";
import { useWishlist } from "../context/WishlistContext";
import { useUser } from "../context/UserContext";
import axios from "axios";
import { createPortal } from "react-dom";
import { toast } from "react-toastify";
import "./ProductCard.css";

const API_URL = process.env.REACT_APP_API_URL;

const createSlug = (name) => {
  if (!name) return "product";
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
};

// Reusable Notify Modal
const StockNotificationModal = ({
  product, showNotifyModal, setShowNotifyModal,
  handleNotifySubmit, notifyInfo, setNotifyInfo,
  submitting, isSuccess, setIsSuccess
}) => {
  if (!showNotifyModal) return null;

  const handleClose = () => {
    setShowNotifyModal(false);
    if (setIsSuccess) setIsSuccess(false);
  };

  return createPortal(
    <div className="notify-modal-backdrop" onClick={(e) => { e.stopPropagation(); handleClose(); }}>
      <div className="notify-modal small" onClick={e => e.stopPropagation()}>
        <button className="notify-modal-close" onClick={handleClose}>×</button>

        {isSuccess ? (
          <div style={{ textAlign: 'center', padding: '30px 10px' }}>
            <i className="bi bi-check-circle-fill" style={{ fontSize: '3.5rem', color: '#28a745', display: 'block', marginBottom: '15px' }}></i>
            <h4 style={{ marginBottom: '10px', color: '#333', fontSize: '1.2rem' }}>Thank you for your interest!</h4>
            <p style={{ color: '#666', lineHeight: '1.5', fontSize: '0.95rem' }}>
              We will notify you when <strong>{product.name}</strong> is available.
            </p>
            <button className="notify-submit-btn" style={{ marginTop: '25px' }} onClick={handleClose}>
              Close
            </button>
          </div>
        ) : (
          <>
            <div className="notify-modal-header">
              <h4>Get Notified</h4>
              <p>We'll SMS you as soon as <strong>{product.name}</strong> is back in stock.</p>
            </div>
            <form onSubmit={handleNotifySubmit}>
              <div className="notify-form-group">
                <label>Name</label>
                <input
                  type="text"
                  placeholder="Your Name"
                  value={notifyInfo.name}
                  onChange={e => setNotifyInfo({ ...notifyInfo, name: e.target.value })}
                  required
                />
              </div>
              <div className="notify-form-group">
                <label>Mobile Number</label>
                <input
                  type="tel"
                  placeholder="Your Mobile Number"
                  value={notifyInfo.phone}
                  onChange={e => setNotifyInfo({ ...notifyInfo, phone: e.target.value })}
                  required
                />
              </div>
              <button type="submit" className="notify-submit-btn" disabled={submitting}>
                {submitting ? "Saving..." : "Notify Me"}
              </button>
            </form>
          </>
        )}
      </div>
    </div>,
    document.body
  );
};

// Helper: construct absolute image URL
const getImageUrl = (imagePath) => {
  if (!imagePath) return null;
  if (imagePath.startsWith("http")) return imagePath;
  let baseUrl = API_URL.replace(/\/api\/?$/, "");
  if (baseUrl.endsWith("/")) baseUrl = baseUrl.slice(0, -1);
  const cleanPath = imagePath.startsWith("/") ? imagePath : `/${imagePath}`;
  return `${baseUrl}${cleanPath}`;
};

const ProductCard = ({
  product,
  onQuickView,
  showAddToCart = true,
  showQuickView = true,
  compact = false,
  featured = false,
  showStockBadge = true
}) => {
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const { toggleWishlist, isInWishlist } = useWishlist();
  const { setShowLogin, user } = useUser();
  const token = localStorage.getItem("token");

  const [hasRequestedNotification, setHasRequestedNotification] = useState(false);

  /* ================= REVEAL ON SCROLL ================= */
  const [isVisible, setIsVisible] = useState(false);
  const cardRef = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.unobserve(entry.target);
        }
      },
      { threshold: 0.1 }
    );

    if (cardRef.current) {
      observer.observe(cardRef.current);
    }

    return () => {
      if (cardRef.current) observer.unobserve(cardRef.current);
    };
  }, []);

  useEffect(() => {
    if (token && product?.id) {
      const checkRequested = async () => {
        try {
          const res = await axios.get(`${API_URL}/stock-notification/check/${product.id}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (res.data.success) {
            setHasRequestedNotification(res.data.requested);
          }
        } catch (err) {
          console.error("Check notification error:", err);
        }
      };
      checkRequested();
    }
  }, [token, product?.id]);

  /* ================= CALCULATIONS ================= */

  const isNew = useMemo(() => {
    if (!product.created_at) return false;
    const diffDays = (new Date() - new Date(product.created_at)) / (1000 * 60 * 60 * 24);
    return diffDays <= 60;
  }, [product.created_at]);

  const stockInfo = useMemo(() => {
    const qty = product.stock_quantity || 0;
    if (qty === 0) return { text: "Out of Stock", class: "stock-out", qty };
    if (qty <= 5) return { text: "Low Stock", class: "stock-low", qty };
    return { text: "In Stock", class: "stock-ok", qty };
  }, [product.stock_quantity]);

  const stockPercent = useMemo(() => {
    const MAX_STOCK = 20;
    return Math.min(((MAX_STOCK - stockInfo.qty) / MAX_STOCK) * 100, 100);
  }, [stockInfo.qty]);

  const images = useMemo(() => {
    const mainUrl = getImageUrl(product.main_image_url);
    const hoverUrl = getImageUrl(product.hover_image);
    return {
      main: mainUrl || "/assets/no-image.png",
      hover: hoverUrl || mainUrl || "/assets/no-image.png"
    };
  }, [product.main_image_url, product.hover_image]);

  const [imgLoaded, setImgLoaded] = useState(false);

  const productUrl = useMemo(() => {
    if (!product.uuid || !product.name) return "#";
    const slug = createSlug(product.name);
    return `/product/${product.uuid}/${slug}?product_code=${product.product_code || ""}`;
  }, [product.uuid, product.name, product.product_code]);

  /* ================= NOTIFY ME LOGIC ================= */
  const [showNotifyModal, setShowNotifyModal] = useState(false);
  const [notifyInfo, setNotifyInfo] = useState({ name: "", phone: "" });
  const [submitting, setSubmitting] = useState(false);
  const [isNotifySuccess, setIsNotifySuccess] = useState(false);

  const getUserDisplayName = () => {
    if (!user) return "";
    if (user.name) return user.name;
    if (user.first_name) return user.first_name + (user.last_name ? ` ${user.last_name}` : "");
    return "";
  };

  const getUserPhone = () => {
    if (!user) return "";
    return user.phone || user.mobile || "";
  };

  useEffect(() => {
    if (showNotifyModal && token && user) {
      setNotifyInfo({
        name: getUserDisplayName(),
        phone: getUserPhone()
      });
    } else if (showNotifyModal && token && !user) {
      const storedUser = localStorage.getItem("user") ? JSON.parse(localStorage.getItem("user")) : null;
      if (storedUser) {
        setNotifyInfo({
          name: storedUser.name || storedUser.first_name || "",
          phone: storedUser.phone || storedUser.mobile || ""
        });
      } else {
        setNotifyInfo({ name: "", phone: "" });
      }
    }
  }, [showNotifyModal, token, user]);

  useEffect(() => {
    if (token && user && showNotifyModal) {
      setNotifyInfo({
        name: getUserDisplayName(),
        phone: getUserPhone()
      });
    }
  }, [user, token, showNotifyModal]);

  const handleNotifySubmit = async (e) => {
    if (e) e.preventDefault();
    if (!notifyInfo.name || notifyInfo.name.trim().length < 2) {
      toast.error("Please enter a valid name (at least 2 characters)");
      return;
    }
    if (!notifyInfo.phone || notifyInfo.phone.replace(/\D/g, '').length < 10) {
      toast.error("Please enter a valid 10-digit phone number");
      return;
    }
    setSubmitting(true);
    try {
      const userData = token && user ? user : (localStorage.getItem("user") ? JSON.parse(localStorage.getItem("user")) : null);
      const res = await axios.post(`${API_URL}/stock-notification`, {
        product_id: product.id,
        user_id: userData?.id || null,
        customer_name: notifyInfo.name,
        phone: notifyInfo.phone
      });
      if (res.data.success) {
        setIsNotifySuccess(true);
        setHasRequestedNotification(true);
        setTimeout(() => {
          setShowNotifyModal(false);
          setIsNotifySuccess(false);
        }, 4000);
      }
    } catch (err) {
      console.error("Notify error:", err);
      toast.error("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <StockNotificationModal
        product={product}
        showNotifyModal={showNotifyModal}
        setShowNotifyModal={setShowNotifyModal}
        handleNotifySubmit={handleNotifySubmit}
        notifyInfo={notifyInfo}
        setNotifyInfo={setNotifyInfo}
        submitting={submitting}
        isSuccess={isNotifySuccess}
        setIsSuccess={setIsNotifySuccess}
      />

      <div
        ref={cardRef}
        className={`product-card reveal-on-scroll ${isVisible ? 'is-visible' : ''} ${compact ? 'compact' : ''} ${featured ? 'featured' : ''}`}
        onClick={() => navigate(productUrl)}
      >
        {/* IMAGE WRAPPER */}
        <div className="image-wrapper">
          <div className="badge-container">
            {isNew && <span className="p-badge new">New</span>}
          </div>

          <button
            className={`wish-btn ${isInWishlist(product.id) ? "active" : ""}`}
            onClick={(e) => {
              e.stopPropagation();
              toggleWishlist(product);
            }}
            aria-label="Toggle Wishlist"
          >
            <i className={`bi ${isInWishlist(product.id) ? "bi-heart-fill" : "bi-heart"}`}></i>
          </button>

          <img
            src={images.main}
            alt={product.name}
            className={`p-img main-p-img ${imgLoaded ? "fade-in-image" : ""}`}
            loading="lazy"
            onLoad={() => setImgLoaded(true)}
            onError={(e) => { e.target.src = "/assets/no-image.png"; }}
          />
          <img
            src={images.hover}
            alt={product.name}
            className={`p-img hover-p-img ${imgLoaded ? "fade-in-image" : ""}`}
            loading="lazy"
            onError={(e) => { e.target.src = images.main; }}
          />

          {showQuickView && onQuickView && (
            <button
              className="quick-view-overlay"
              onClick={(e) => { e.stopPropagation(); onQuickView(product); }}
            >
              <span>Quick View</span>
            </button>
          )}
        </div>

        {/* PRODUCT INFO */}
        <div className="product-info-box">
          <h3 className="p-name">{product.name}</h3>

          <div className="p-price-row">
            {product.old_price && <span className="p-price old">₹{product.old_price}</span>}
            <span className="p-price current">₹{product.price}</span>
          </div>

          {showStockBadge && (
            <div className="stock-status-container">
              {stockInfo.qty > 0 && stockInfo.qty <= 5 ? (
                <div className="low-stock-meter">
                  <div className="meter-header">
                    <span className="meter-icon"><i className="bi bi-fire"></i></span>
                    <span className="meter-label">Only {stockInfo.qty} left</span>
                  </div>
                  <div className="meter-bar">
                    <div className="meter-fill" style={{ width: `${stockPercent}%` }}></div>
                  </div>
                </div>
              ) : stockInfo.qty === 0 ? (
                <div className="out-of-stock-status">
                  <div className="status-header">
                    <span className="status-icon"><i className="bi bi-info-circle-fill"></i></span>
                    <span className="status-label">Out of Stock</span>
                  </div>
                  <div className="status-bar empty"></div>
                </div>
              ) : (
                <div className="stock-placeholder"></div>
              )}
            </div>
          )}
        </div>

        {/* ADD TO CART ACTION */}
        {showAddToCart && (
          <div className="cart-action-wrapper" onClick={(e) => e.stopPropagation()}>
            {stockInfo.qty === 0 ? (
              hasRequestedNotification ? (
                <button className="notify-me-btn requested" disabled>
                  <i className="bi bi-check-circle"></i> Requested
                </button>
              ) : (
                <button
                  className="notify-me-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowNotifyModal(true);
                  }}
                >
                  <i className="bi bi-bell"></i> Notify Me
                </button>
              )
            ) : (
              <button
                className={`add-to-cart-action`}
                onClick={(e) => {
                  e.stopPropagation();
                  if (!token) { setShowLogin(true); return; }
                  addToCart(product);
                }}
              >
                Add to Bag
              </button>
            )}
          </div>
        )}
      </div>
    </>
  );
};

export default React.memo(ProductCard);
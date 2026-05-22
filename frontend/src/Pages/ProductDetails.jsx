import { useParams, useNavigate, useSearchParams, Link } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import { useCart } from "../context/CartContext";
import { useWishlist } from "../context/WishlistContext";
import { useUser } from "../context/UserContext";
import axios from "axios";
import { createPortal } from "react-dom";
import RelatedProducts from "../components/RelatedProducts";
import "./ProductDetails.css";
import Loader from "../components/Loader";

const API_URL = process.env.REACT_APP_API_URL;

const getImageUrl = (imagePath) => {
  if (!imagePath) return null;
  if (imagePath.startsWith("http")) return imagePath;
  let baseUrl = API_URL.replace(/\/api\/?$/, "");
  if (baseUrl.endsWith("/")) baseUrl = baseUrl.slice(0, -1);
  const cleanPath = imagePath.startsWith("/") ? imagePath : `/${imagePath}`;
  return `${baseUrl}${cleanPath}`;
};

const createSlug = (name) => {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
};

// Stock Notification Modal
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

// Review Success Modal
const ReviewSuccessModal = ({ show, onClose }) => {
  if (!show) return null;

  useEffect(() => {
    if (show) {
      const timer = setTimeout(() => {
        onClose();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [show, onClose]);

  return createPortal(
    <div className="notify-modal-backdrop" onClick={onClose}>
      <div className="review-success-modal" onClick={e => e.stopPropagation()}>
        <button className="notify-modal-close" onClick={onClose}>×</button>
        <div className="success-content">
          <i className="bi bi-check-circle-fill"></i>
          <h3>Thank You for Your Feedback!</h3>
          <p>Your review will be visible on the website soon after moderation.</p>
          <button className="review-success-close" onClick={onClose}>OK</button>
        </div>
      </div>
    </div>,
    document.body
  );
};

const ProductDetails = () => {
  const { uuid } = useParams();
  const [searchParams] = useSearchParams();
  const productCode = searchParams.get("product_code");
  const navigate = useNavigate();
  const { addToCart, setIsCartOpen } = useCart();
  const { toggleWishlist, isInWishlist } = useWishlist();
  const { setShowLogin, user } = useUser();
  const token = localStorage.getItem("token");

  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [pincode, setPincode] = useState("");
  const [pinResponse, setPinResponse] = useState(null);
  const [pinLoading, setPinLoading] = useState(false);
  const [images, setImages] = useState([]);
  const [activeImg, setActiveImg] = useState("");
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const sliderRef = useRef(null);
  const [coupons, setCoupons] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [canReview, setCanReview] = useState(false);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [avgRating, setAvgRating] = useState(0);
  const [totalReviews, setTotalReviews] = useState(0);
  const [reviewImages, setReviewImages] = useState([]);
  const [lbImages, setLbImages] = useState([]);
  const [lbOpen, setLbOpen] = useState(false);
  const [lbStartIndex, setLbStartIndex] = useState(0);
  const [myReview, setMyReview] = useState(null);
  const [showAllReviews, setShowAllReviews] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notif, setNotif] = useState({ show: false, message: "", type: "success" });
  const [reviewPreviewUrls, setReviewPreviewUrls] = useState([]);
  const [showReviewSuccessModal, setShowReviewSuccessModal] = useState(false);

  // Stock Notification
  const [showNotifyModal, setShowNotifyModal] = useState(false);
  const [notifyInfo, setNotifyInfo] = useState({ name: "", phone: "" });
  const [submitting, setSubmitting] = useState(false);
  const [isNotifySuccess, setIsNotifySuccess] = useState(false);
  const [hasRequestedNotification, setHasRequestedNotification] = useState(false);

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
      setNotifyInfo({ name: getUserDisplayName(), phone: getUserPhone() });
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

  const handleNotifySubmit = async (e) => {
    if (e) e.preventDefault();
    if (!notifyInfo.name || notifyInfo.name.trim().length < 2) {
      showNotification("Please enter a valid name (at least 2 characters)", "error");
      return;
    }
    if (!notifyInfo.phone || notifyInfo.phone.replace(/\D/g, '').length < 10) {
      showNotification("Please enter a valid 10-digit phone number", "error");
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
      showNotification("Something went wrong. Please try again.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const showNotification = (message, type = "success") => {
    setNotif({ show: true, message, type });
    setTimeout(() => setNotif({ show: false, message: "", type: "success" }), 4000);
  };

  const lbScrollRef = useRef(null);
  const thumbListRef = useRef(null);

  useEffect(() => {
    if (isLightboxOpen) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "auto";
    return () => { document.body.style.overflow = "auto"; };
  }, [isLightboxOpen]);

  useEffect(() => {
    if (lbOpen && lbStartIndex !== -1) {
      const timer = setTimeout(() => {
        if (lbScrollRef.current) {
          const children = lbScrollRef.current.querySelectorAll(".lb-slide");
          if (children[lbStartIndex]) {
            children[lbStartIndex].scrollIntoView({ behavior: "auto", block: "start" });
          }
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [lbOpen, lbStartIndex]);

  useEffect(() => {
    if (uuid || productCode) fetchProduct();
  }, [uuid, productCode]);

  // FIXED: Ensure strict ID checking for types so both string & int match properly
  const filterAndSortCoupons = (allCoupons, productVendorId) => {
    if (!allCoupons) return [];
    
    // Safety check for integers
    const vId = productVendorId ? Number(productVendorId) : null;

    // Separate vendor-specific and global coupons
    const vendorCoupons = allCoupons.filter(coupon => coupon.vendor_id && Number(coupon.vendor_id) === vId);
    const globalCoupons = allCoupons.filter(coupon => !coupon.vendor_id);
    
    // Return vendor coupons first, then global coupons
    return [...vendorCoupons, ...globalCoupons];
  };

  // FIXED: Accept vendorId directly to avoid relying on stale state
  const fetchCoupons = async (vendorId) => {
    try {
      const res = await axios.get(`${API_URL}/coupons`);
      const allCoupons = res.data.coupons || [];
      // Filter and sort: vendor coupons first, then global using the directly passed vendorId
      const applicable = filterAndSortCoupons(allCoupons, vendorId);
      setCoupons(applicable);
    } catch (err) {
      console.error("Coupon fetch error:", err);
    }
  };

  const fetchProduct = async () => {
    try {
      setLoading(true);
      let url = `${API_URL}/product/${uuid || ""}`;
      if (productCode) url += `?product_code=${encodeURIComponent(productCode)}`;

      let response = await axios.get(url);

      if (response.data.success) {
        const prod = response.data.product;
        setProduct(prod);

        let allImages = [];
        if (prod.main_image_url) allImages.push(getImageUrl(prod.main_image_url));
        if (prod.images && Array.isArray(prod.images)) {
          allImages.push(...prod.images.map(img => getImageUrl(img)).filter(Boolean));
        }
        setImages(allImages);
        if (allImages.length > 0) setActiveImg(allImages[0]);

        // FIXED: Pass vendor_id directly to fetchCoupons
        fetchCoupons(prod.vendor_id);
        fetchReviews(prod.id);
        if (token) {
          checkCanReview(prod.id);
          fetchMyReview(prod.id);
        }
        fetchReviewSummary(prod.id);
      }
    } catch (error) {
      console.error("Error fetching product:", error);
      if (productCode) {
        try {
          const fallbackRes = await axios.get(`${API_URL}/product/by-code/${productCode}`);
          if (fallbackRes.data && fallbackRes.data.success) {
            const prod = fallbackRes.data.product;
            setProduct(prod);
            let allImages = [];
            if (prod.main_image_url) allImages.push(getImageUrl(prod.main_image_url));
            if (prod.images && Array.isArray(prod.images)) {
              allImages.push(...prod.images.map(img => getImageUrl(img)).filter(Boolean));
            }
            setImages(allImages);
            if (allImages.length > 0) setActiveImg(allImages[0]);
            
            // FIXED: Pass vendor_id directly to fetchCoupons
            fetchCoupons(prod.vendor_id);
            fetchReviews(prod.id);
            if (token) checkCanReview(prod.id);
            fetchReviewSummary(prod.id);
            return;
          }
        } catch (fallbackError) {
          console.error("Fallback product code fetch failed:", fallbackError);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchReviews = async (productId) => {
    try {
      const res = await axios.get(`${API_URL}/reviews/${productId}`);
      setReviews(res.data.reviews || []);
    } catch (err) { console.error("Review fetch error", err); }
  };

  const checkCanReview = async (productId) => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(`${API_URL}/reviews/can-review/${productId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setCanReview(res.data.canReview);
    } catch (err) { console.error(err); }
  };

  const fetchMyReview = async (productId) => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(`${API_URL}/reviews/mine/${productId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.data.success) setMyReview(res.data.review);
    } catch (err) { console.error(err); }
  };

  const submitReview = async () => {
    if (rating === 0) {
      showNotification("Please select a rating", "error");
      return;
    }
    try {
      const token = localStorage.getItem("token");
      const formData = new FormData();
      formData.append("product_id", product.id);
      formData.append("rating", rating);
      formData.append("comment", comment);
      reviewImages.forEach((file) => formData.append("images", file));

      setIsSubmitting(true);
      await axios.post(`${API_URL}/reviews`, formData, {
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "multipart/form-data" },
      });

      setShowReviewSuccessModal(true);
      setShowReviewForm(false);
      setRating(0);
      setComment("");
      setReviewImages([]);
      setReviewPreviewUrls([]);
      fetchReviews(product.id);
      fetchMyReview(product.id);
      fetchReviewSummary(product.id);
    } catch (err) {
      showNotification(err.response?.data?.message || "Submit failed", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReviewClick = () => {
    if (!token) {
      setShowLogin(true);
      return;
    }
    if (myReview && myReview.status === 'pending') {
      showNotification("Your review is currently under moderation. It will be visible once approved!", "info");
      return;
    }
    setShowReviewForm(prev => !prev);
    if (myReview && !showReviewForm) {
      setRating(myReview.rating);
      setComment(myReview.comment);
      setReviewImages([]);
      setReviewPreviewUrls([]);
    }
  };

  const handleReviewImagesChange = (e) => {
    const files = Array.from(e.target.files);
    const totalFiles = [...reviewImages, ...files].slice(0, 3);
    setReviewImages(totalFiles);
    const newPreviewUrls = totalFiles.map(file => URL.createObjectURL(file));
    reviewPreviewUrls.forEach(url => URL.revokeObjectURL(url));
    setReviewPreviewUrls(newPreviewUrls);
  };

  const removeReviewImage = (index) => {
    const newImages = [...reviewImages];
    const newUrls = [...reviewPreviewUrls];
    URL.revokeObjectURL(newUrls[index]);
    newImages.splice(index, 1);
    newUrls.splice(index, 1);
    setReviewImages(newImages);
    setReviewPreviewUrls(newUrls);
  };

  const fetchReviewSummary = async (productId) => {
    try {
      const res = await axios.get(`${API_URL}/reviews/summary/${productId}`);
      setAvgRating(res.data.avg_rating || 0);
      setTotalReviews(res.data.total_reviews || 0);
    } catch (err) { console.error("Summary error", err); }
  };

  const handleAddToCart = () => {
    if (!token) { setShowLogin(true); return; }
    addToCart({ ...product, qty: quantity });
  };

  const handleBuyNow = async () => {
    if (!token) { setShowLogin(true); return; }
    await addToCart({ ...product, qty: quantity });
    setIsCartOpen(false);
    navigate("/checkout");
  };

  const handleShare = () => {
    if (!product) return;
    const discountText = product.old_price && product.old_price > product.price
      ? `🔥 ${Math.round(((product.old_price - product.price) / product.old_price) * 100)}% OFF! `
      : '';
    const shareText = `✨ ${product.name} ✨\n💰 Price: ₹${product.price} ${discountText}\n⭐ Rated ${avgRating.toFixed(1)} by ${totalReviews} customers.\n🛍️ Shop now at JAYASTRA – Premium Handloom Sarees.`;
    const shareData = { title: product.name, text: shareText, url: window.location.href };

    if (navigator.share) {
      navigator.share(shareData).catch((err) => {
        if (err.name !== 'AbortError') { fallbackCopy(); }
      });
    } else { fallbackCopy(); }

    function fallbackCopy() {
      navigator.clipboard.writeText(`${shareText}\n\n${window.location.href}`);
      showNotification("Link and details copied! You can now paste anywhere.");
    }
  };

  if (loading) return <Loader />;
  if (!product) return <div className="error-screen">Product not found.</div>;

  const media = images.map(url => ({ type: "image", url }));
  if (product.video_url) {
    media.push({ type: "video", url: getImageUrl(product.video_url) });
  }

  const handleThumbnailClick = (img, idx) => {
    setActiveImg(img);
    if (sliderRef.current) {
      const width = sliderRef.current.clientWidth;
      sliderRef.current.scrollTo({ left: width * idx, behavior: "smooth" });
    }
  };

  const handleSliderScroll = (e) => {
    if (!e.target) return;
    const scrollLeft = e.target.scrollLeft;
    const width = e.target.clientWidth;
    const idx = Math.round(scrollLeft / width);
    const currentItem = media[idx];
    if (currentItem && currentItem.url !== activeImg) {
      setActiveImg(currentItem.url);
      if (thumbListRef.current) {
        const container = thumbListRef.current;
        const thumb = container.children[idx];
        if (thumb) {
          container.scrollTo({
            left: thumb.offsetLeft - (container.clientWidth / 2) + (thumb.clientWidth / 2),
            behavior: "smooth"
          });
        }
      }
    }
  };

  const checkPincode = async () => {
    if (pincode.length !== 6) {
      showNotification("Please enter a valid 6-digit pincode.", "error");
      return;
    }
    try {
      setPinLoading(true);
      setPinResponse(null);
      const res = await axios.get(`${API_URL}/shiprocket/pincode/${pincode}?weight=${product?.weight || 0.5}`);
      setPinResponse(res.data);
    } catch (err) {
      setPinResponse({ success: false, message: "Could not fetch delivery details." });
    } finally {
      setPinLoading(false);
    }
  };

  return (
    <>
      {lbOpen && (
        <div className="lb-overlay" onClick={() => setLbOpen(false)}>
          <button className="lb-close" onClick={() => setLbOpen(false)}><i className="bi bi-x-lg"></i></button>
          <div className="lb-content" onClick={(e) => e.stopPropagation()}>
            <div className="lb-scroll-container" ref={lbScrollRef}>
              {lbImages.map((img, idx) => (
                <div key={idx} className="lb-slide">
                  <img src={img} alt={`Gallery ${idx}`} className="lb-img" />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="product-page-wrapper">
        <div className="product-container">
          <div className="product-grid">
            <div className="gallery-section">
              <div className="btn-stack-floating">
                <button className="share-btn floating" onClick={handleShare} title="Share">
                  <i className="bi bi-send"></i>
                </button>
                <button
                  className={`wish-btn floating ${isInWishlist(product.id) ? "active" : ""}`}
                  onClick={() => toggleWishlist(product)}
                  title="Add to wishlist"
                >
                  <i className={`bi ${isInWishlist(product.id) ? "bi-heart-fill" : "bi-heart"}`}></i>
                </button>
              </div>

              <div className="main-slider-wrapper">
                <div className="main-image-slider" ref={sliderRef} onScroll={handleSliderScroll}>
                  {media.map((item, idx) => (
                    <div
                      key={idx}
                      className={`main-image-slide ${item.type === "video" ? "video-slide" : ""}`}
                      onClick={() => {
                        if (item.type === "image") {
                          setLbImages(images);
                          setLbStartIndex(images.indexOf(item.url));
                          setLbOpen(true);
                        }
                      }}
                    >
                      {item.type === "video" ? (
                        <video src={item.url} className="main-image" controls playsInline />
                      ) : (
                        <img
                          src={item.url}
                          alt={`${product.name} ${idx}`}
                          className="main-image"
                          onError={(e) => { e.target.src = "/assets/no-image.png"; }}
                        />
                      )}
                    </div>
                  ))}
                </div>
                <div className="zoom-hint">
                  <i className="bi bi-arrows-fullscreen"></i> Tap to enlarge
                </div>
              </div>

              {media.length > 1 && (
                <div className="thumbnail-list" ref={thumbListRef}>
                  {media.map((item, idx) => (
                    <div
                      key={idx}
                      className={`thumb-wrapper ${activeImg === item.url ? "active" : ""} ${item.type === "video" ? "video-thumb" : ""}`}
                      onClick={() => handleThumbnailClick(item.url, idx)}
                    >
                      {item.type === "video" ? (
                        <div className="thumb-video-overlay">
                          <i className="bi bi-play-fill"></i>
                          <video src={item.url} muted />
                        </div>
                      ) : (
                        <img
                          src={item.url}
                          alt={`Thumbnail ${idx}`}
                          onError={(e) => { e.target.src = "/assets/no-image.png"; }}
                        />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="details-section">
              <span className="category-label">{product.category_name || "Exclusive Collection"}</span>
              <h1 className="product-title">{product.name}</h1>

              <div className="rating-wrap">
                <div className="stars">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <i key={star} className={`bi ${avgRating >= star ? "bi-star-fill" : avgRating >= star - 0.5 ? "bi-star-half" : "bi-star"}`}></i>
                  ))}
                </div>
                <span className="review-count">
                  {Number(avgRating || 0).toFixed(1)} ({totalReviews} reviews)
                </span>
              </div>

              {product.product_code && (
                <div className="product-sku">Product Code: <span>{product.product_code}</span></div>
              )}

              <div className="price-wrap">
                {product.old_price && <span className="old-price">₹{product.old_price}</span>}
                <span className="current-price">₹{product.price}</span>
                {product.old_price && Number(product.old_price) > Number(product.price) && (
                  <span className="discount-badge">
                    {Math.round(((Number(product.old_price) - Number(product.price)) / Number(product.old_price)) * 100)}% OFF
                  </span>
                )}
              </div>

              <div className="action-row">
                <div className={`qty-selector ${product.stock_quantity === 0 ? "disabled" : ""}`}>
                  <button disabled={product.stock_quantity === 0} onClick={() => setQuantity((q) => Math.max(1, q - 1))}><i className="bi bi-dash"></i></button>
                  <span>{product.stock_quantity === 0 ? 0 : quantity}</span>
                  <button disabled={product.stock_quantity === 0} onClick={() => setQuantity((q) => q + 1)}><i className="bi bi-plus"></i></button>
                </div>
              </div>

              <p className="shipping-text"><i className="bi bi-truck"></i> Free Shipping Across India</p>
              {/* OFFERS / COUPONS DISPLAY */}
              <div className="offers-box">
                {coupons.length === 0 ? (
                  <div className="offer-item"><i className="bi bi-gift"></i> No offers available</div>
                ) : (
                  coupons.map((c) => (
                    <div key={c.id} className="offer-item">
                      <i className="bi bi-gift"></i> 
                      <strong style={{marginLeft: "5px", marginRight: "5px", color:"#8E2139"}}>{c.code}</strong> - 
                      Get {c.discount_value}{c.discount_type === "percentage" ? "%" : "₹"} off on ₹{c.min_order_amount}
                    </div>
                  ))
                )}
              </div>

              <div className="btn-group">
                {product.stock_quantity === 0 ? (
                  hasRequestedNotification ? (
                    <button className="notify-me-btn detail requested" disabled>
                      <i className="bi bi-check-circle"></i> Already Requested
                    </button>
                  ) : (
                    <button className="notify-me-btn detail" onClick={() => setShowNotifyModal(true)}>
                      <i className="bi bi-bell"></i> I want this
                    </button>
                  )
                ) : (
                  <>
                    <button className="cart-btn" onClick={handleAddToCart}><i className="bi bi-bag"></i> Add to Bag</button>
                    <button className="buy-btn" onClick={handleBuyNow}>Buy Now</button>
                  </>
                )}
              </div>

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

              <div className="features-row">
                <div className="feature"><i className="bi bi-cash-coin"></i> Cash on Delivery</div>
                <div className="feature"><i className="bi bi-arrow-return-left"></i> Exchange Available*</div>
                <div className="feature"><i className="bi bi-patch-check"></i> Quality Assured</div>
              </div>

              <div className="description-box">
                <h4>Product Details</h4>
                <div className="html-desc" dangerouslySetInnerHTML={{ __html: product.description || "<p>No description available.</p>" }} />
              </div>
            </div>
          </div>
        </div>

        {/* RELATED PRODUCTS */}
        <div className="related-wrapper">
          <RelatedProducts category={product.category_name} excludeIds={[product.id]} currentProductUuid={product.uuid} />
        </div>

        {/* REVIEWS SECTION */}
        <div className="reviews-section-container">
          <div className="container">
            <h3 className="customer-reviews-main-title">Customer Reviews</h3>

            <div className="reviews-summary-row">
              <div className="summary-left">
                <div className="stars-and-rating">
                  <div className="summary-stars">
                    {[1, 2, 3, 4, 5].map(s => (
                      <i key={s} className={`bi ${avgRating >= s ? 'bi-star-fill' : avgRating >= s - 0.5 ? 'bi-star-half' : 'bi-star'}`}></i>
                    ))}
                  </div>
                  <span className="rating-out-of">{Number(avgRating || 0).toFixed(2)} out of 5</span>
                </div>
                <div className="based-on">
                  Based on {totalReviews} reviews <i className="bi bi-check-square-fill check-color"></i>
                </div>
              </div>

              <div className="summary-center">
                {[5, 4, 3, 2, 1].map(num => {
                  const count = reviews.filter(r => r.rating === num).length;
                  const percentage = totalReviews > 0 ? (count / totalReviews) * 100 : 0;
                  return (
                    <div key={num} className="rating-bar-row">
                      <div className="stars-label">
                        {[...Array(5)].map((_, i) => <i key={i} className={`bi ${i < num ? 'bi-star-fill' : 'bi-star'}`}></i>)}
                      </div>
                      <div className="bar-bg-new"><div className="bar-fill-new" style={{ width: `${percentage}%` }}></div></div>
                      <span className="count-label">{count}</span>
                    </div>
                  );
                })}
              </div>

              <div className="summary-right">
                <button className={`rate-product-btn-new ${showReviewForm ? 'active' : ''}`} onClick={handleReviewClick}>
                  {showReviewForm ? 'Cancel Review' : 'Write a review'}
                </button>
              </div>
            </div>

            {showReviewForm && (
              <div className="inline-review-form">
                <div className="form-header-flex">
                  <h4>{myReview ? 'Update Your Review' : 'Rate this Product'}</h4>
                </div>
                <div className="rating-input-group">
                  {[1, 2, 3, 4, 5].map(s => (
                    <i key={s} className={`bi ${rating >= s ? 'bi-star-fill' : 'bi-star'}`} onClick={() => setRating(s)}></i>
                  ))}
                  <span className="rating-text">
                    {rating === 1 ? 'Poor' : rating === 2 ? 'Fair' : rating === 3 ? 'Good' : rating === 4 ? 'Very Good' : rating === 5 ? 'Excellent' : 'Select Rating'}
                  </span>
                </div>
                <textarea placeholder="Write your detailed feedback here..." value={comment} onChange={(e) => setComment(e.target.value)} />

                {reviewPreviewUrls.length > 0 && (
                  <div className="review-previews-container">
                    {reviewPreviewUrls.map((url, idx) => (
                      <div key={idx} className="preview-item">
                        <img src={url} alt="Preview" />
                        <button className="remove-preview" onClick={() => removeReviewImage(idx)}><i className="bi bi-x"></i></button>
                      </div>
                    ))}
                    {reviewPreviewUrls.length < 3 && (
                      <label className="add-more-photos">
                        <input type="file" multiple accept="image/*" onChange={handleReviewImagesChange} hidden />
                        <i className="bi bi-plus-lg"></i><span>Add</span>
                      </label>
                    )}
                  </div>
                )}

                <div className="form-actions">
                  {!reviewPreviewUrls.length && (
                    <label className="upload-label">
                      <input type="file" multiple accept="image/*" onChange={handleReviewImagesChange} hidden />
                      <i className="bi bi-camera"></i> Add Photos
                    </label>
                  )}
                  <div style={{ marginLeft: 'auto' }}>
                    <button className="submit-rev-btn" onClick={submitReview} disabled={isSubmitting}>
                      {isSubmitting ? 'Posting...' : 'Post Review'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div className="reviews-list-container">
              {reviews.length > 0 && (
                <div className="reviews-sort-bar">
                  <span className="sort-dropdown">Most Recent <i className="bi bi-chevron-down"></i></span>
                </div>
              )}

              <div className="reviews-items-list-new">
                {reviews.length === 0 ? (
                  <div className="no-reviews-placeholder">
                    <i className="bi bi-chat-dots"></i>
                    <p>No reviews yet. Be the first to share your experience!</p>
                  </div>
                ) : (
                  <>
                    {(showAllReviews ? reviews : reviews.slice(0, 5)).map((r) => (
                      <div key={r.id} className="advanced-review-card-new">
                        <div className="review-top-row">
                          <div className="review-stars-new">
                            {[...Array(5)].map((_, i) => (
                              <i key={i} className={`bi ${i < r.rating ? 'bi-star-fill' : 'bi-star'}`}></i>
                            ))}
                          </div>
                          <span className="rev-date-top">
                            {new Date(r.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                          </span>
                        </div>

                        <div className="review-user-info">
                          <div className="user-avatar-wrapper">
                            <div className="user-avatar-icon"><i className="bi bi-person"></i></div>
                            <i className="bi bi-check-circle-fill avatar-verified-tick"></i>
                          </div>
                          <span className="user-name">{r.name}</span>
                          <span className="verified-badge-new">Verified</span>
                        </div>

                        <h5 className="review-title-text">
                          {r.rating >= 4 ? 'Highly Recommended' : r.rating >= 3 ? 'Good Product' : 'Average'}
                        </h5>

                        <p className="review-text-content">{r.comment}</p>

                        {r.images && r.images.length > 0 && (
                          <div className="review-gallery">
                            {r.images.map((img, idx) => (
                              <img
                                key={idx}
                                src={getImageUrl(img)}
                                alt="User upload"
                                onClick={() => { setLbImages(r.images.map(i => getImageUrl(i))); setLbStartIndex(idx); setLbOpen(true); }}
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                    {reviews.length > 5 && !showAllReviews && (
                      <button className="show-all-reviews-btn" onClick={() => setShowAllReviews(true)}>
                        Show all {reviews.length} reviews <i className="bi bi-chevron-right"></i>
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        <ReviewSuccessModal show={showReviewSuccessModal} onClose={() => setShowReviewSuccessModal(false)} />

        {notif.show && (
          <div className="success-notif-overlay">
            <div className={`success-notif-card ${notif.type === 'error' ? 'error-notif' : notif.type === 'info' ? 'info-notif' : ''}`}>
              <i className={`bi ${notif.type === 'error' ? 'bi-exclamation-circle-fill' : notif.type === 'info' ? 'bi-info-circle-fill' : 'bi-check-circle-fill'}`}></i>
              <span>{notif.message}</span>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default ProductDetails;
import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import axios from "axios";
import ExchangeModal from "../components/ExchangeModal";
import { useUser } from "../context/UserContext";
import "./OrderDetails.css";
import Loader from "../components/Loader";

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

const OrderDetails = () => {
   const { id } = useParams();
   const { user } = useUser();
   const [order, setOrder] = useState(null);
   const [loading, setLoading] = useState(true);

   // Reviews state
   const [userReviews, setUserReviews] = useState({});
   const [reviewFormOpen, setReviewFormOpen] = useState({}); // { [productId]: boolean }
   const [reviewFormData, setReviewFormData] = useState({}); // { [productId]: { rating, comment } }

   // Exchange Modal State
   const [showExchangeModal, setShowExchangeModal] = useState(false);
   const [editingReview, setEditingReview] = useState(null);
   const [activeReviewItem, setActiveReviewItem] = useState(null);
   const [deleteConfirm, setDeleteConfirm] = useState(null);
   const [isSubmitting, setIsSubmitting] = useState(false);
   const [notif, setNotif] = useState({ show: false, message: "", type: "success" });

   // Live Shipment Tracking State
   const [showLiveTracking, setShowLiveTracking] = useState(false);
   const [liveTrackingData, setLiveTrackingData] = useState(null);
   const [trackingLoading, setTrackingLoading] = useState(false);

   const fetchOrderDetails = async () => {
      try {
         const token = localStorage.getItem("token");
         const res = await axios.get(`${API_URL}/orders/${id}`, {
            headers: { Authorization: `Bearer ${token}` }
         });
         if (res.data.success) {
            const fetchedOrder = res.data.order;
            setOrder(fetchedOrder);

            // Fetch reviews for each product after loading the order
            if (fetchedOrder.order_status === "Delivered") {
               fetchedOrder.items.forEach(item => {
                  fetchUserReview(item.product_id);
               });
            }
         }
      } catch (err) {
         console.error("Fetch order error:", err);
      } finally {
         setLoading(false);
      }
   };

   const showNotification = (message, type = "success") => {
      setNotif({ show: true, message, type });
      setTimeout(() => setNotif({ show: false, message: "", type: "success" }), 4000);
   };

   const fetchUserReview = async (productId) => {
      try {
         const token = localStorage.getItem("token");
         const res = await axios.get(`${API_URL}/reviews/mine/${productId}`, {
            headers: { Authorization: `Bearer ${token}` }
         });
         if (res.data.success && res.data.review) {
            setUserReviews(prev => ({ ...prev, [productId]: res.data.review }));
         }
      } catch (err) {
         console.error("Fetch review error:", err);
      }
   };

   // Fetch Tracking Data from Shiprocket backend proxy
   const handleOpenLiveTracking = async () => {
      if (!order || !order.awb_code) return;
      setShowLiveTracking(true);
      setTrackingLoading(true);
      try {
         const token = localStorage.getItem("token");
         const res = await axios.get(`${API_URL}/shiprocket/track/${order.awb_code}`, {
            headers: { Authorization: `Bearer ${token}` }
         });
         if (res.data.success) {
            setLiveTrackingData(res.data.tracking);
         } else {
            showNotification(res.data.message || "Tracking details are not synchronized yet.", "error");
         }
      } catch (err) {
         console.error("Live tracking retrieval error:", err);
         showNotification("Unable to connect with the delivery network. Try again later.", "error");
      } finally {
         setTrackingLoading(false);
      }
   };

   // Handles browser-native sharing or fallback copying of AWB tracking code
   const handleShareAWB = () => {
      if (!liveTrackingData) return;
      if (navigator.share) {
         navigator.share({
            title: `Track Parcel: ${liveTrackingData.awb_code}`,
            text: `Track my JAYASTRA order shipped via ${liveTrackingData.courier_name} with AWB: ${liveTrackingData.awb_code}`,
            url: `https://shiprocket.co/tracking/${liveTrackingData.awb_code}`
         }).catch(err => console.log(err));
      } else {
         navigator.clipboard.writeText(liveTrackingData.awb_code);
         showNotification("Tracking AWB code copied!");
      }
   };

   // Safety helper parsing non-standard ISO formats
   const parseShiprocketDate = (dateStr) => {
      if (!dateStr) return new Date();
      const cleanStr = dateStr.replace(' ', 'T');
      const dt = new Date(cleanStr);
      if (isNaN(dt.getTime())) {
         const parts = dateStr.split(/[- :]/);
         if (parts.length >= 6) {
            return new Date(parts[0], parts[1] - 1, parts[2], parts[3], parts[4], parts[5]);
         }
      }
      return dt;
   };

   // Appends placeholders for upcoming stages if they have not been met yet
   const buildTimeline = () => {
      if (!liveTrackingData || !liveTrackingData.activities) return [];

      const activities = [...liveTrackingData.activities].sort(
         (a, b) => parseShiprocketDate(a.date) - parseShiprocketDate(b.date)
      );

      const currentStatus = (liveTrackingData.current_status || "").toLowerCase();
      const isDelivered = currentStatus.includes("delivered");
      const isOutForDelivery = currentStatus.includes("out for delivery") || currentStatus.includes("out_for_delivery");

      const timelineItems = activities.map((act, index) => {
         const isLatest = index === activities.length - 1;
         return {
            ...act,
            isPlaceholder: false,
            isLatest: isLatest && !isDelivered,
            isCompleted: !isLatest || isDelivered,
         };
      });

      if (!isOutForDelivery && !isDelivered) {
         timelineItems.push({
            isPlaceholder: true,
            isLatest: false,
            isCompleted: false,
            activity: "Out for Delivery",
            status: "Upcoming",
            location: null,
            date: null
         });
      }

      if (!isDelivered) {
         timelineItems.push({
            isPlaceholder: true,
            isLatest: false,
            isCompleted: false,
            activity: "Delivered",
            status: "Upcoming",
            location: null,
            date: null
         });
      }

      return timelineItems;
   };

   const submitReview = async (productId) => {
      const data = reviewFormData[productId];
      if (!data || !data.rating || !data.comment) {
         showNotification("Please provide both a rating and a comment.", "error");
         return;
      }

      setIsSubmitting(true);
      try {
         const token = localStorage.getItem("token");
         const formData = new FormData();
         formData.append("product_id", productId);
         formData.append("rating", data.rating);
         formData.append("comment", data.comment);
         if (data.images) {
            data.images.forEach(img => {
               formData.append("images", img);
            });
         }

         const res = await axios.post(`${API_URL}/reviews`, formData, {
            headers: {
               Authorization: `Bearer ${token}`,
               "Content-Type": "multipart/form-data"
            }
         });

         if (res.data.success) {
            setUserReviews(prev => ({ ...prev, [productId]: res.data.review }));
            setActiveReviewItem(null); // Auto close
            showNotification("Review Submitted Successfully!");
            setReviewFormData(prev => {
               const updated = { ...prev };
               delete updated[productId];
               return updated;
            });
         }
      } catch (err) {
         console.error("Review submit error:", err);
         showNotification(err.response?.data?.message || "Failed to submit review", "error");
      } finally {
         setIsSubmitting(false);
      }
   };

   const handleEditReview = (productId) => {
      const review = userReviews[productId];
      if (review) {
         setEditingReview(review);
         setReviewFormOpen(prev => ({ ...prev, [productId]: true }));
         setReviewFormData(prev => ({
            ...prev,
            [productId]: { rating: review.rating, comment: review.comment }
         }));
      }
   };

   const confirmDelete = async () => {
      if (!deleteConfirm) return;
      const { productId, reviewId } = deleteConfirm;

      try {
         const token = localStorage.getItem("token");
         const res = await axios.delete(`${API_URL}/reviews/${reviewId}`, {
            headers: { Authorization: `Bearer ${token}` }
         });
         if (res.data.success) {
            setUserReviews(prev => {
               const updated = { ...prev };
               delete updated[productId];
               return updated;
            });
            setDeleteConfirm(null);
         }
      } catch (err) {
         console.error("Delete review error:", err);
         setDeleteConfirm(null);
      }
   };

   const closeReviewModal = () => {
      setEditingReview(null);
      setActiveReviewItem(null);
   };

   const handleRatingClick = (productId, ratingVal) => {
      setReviewFormData(prev => ({
         ...prev,
         [productId]: { ...prev[productId], rating: ratingVal }
      }));
   };

   const handleModalImagesChange = (productId, e) => {
      const files = Array.from(e.target.files);
      const currentData = reviewFormData[productId] || {};
      const currentImages = currentData.images || [];
      const currentPreviews = currentData.previewUrls || [];

      // Limit to 3 files
      const totalFiles = [...currentImages, ...files].slice(0, 3);
      const newPreviewUrls = totalFiles.map(file => URL.createObjectURL(file));

      if (currentPreviews.length > 0) {
         currentPreviews.forEach(url => URL.revokeObjectURL(url));
      }

      setReviewFormData(prev => ({
         ...prev,
         [productId]: {
            ...currentData,
            images: totalFiles,
            previewUrls: newPreviewUrls
         }
      }));
   };

   const removeModalImage = (productId, index) => {
      const currentData = reviewFormData[productId] || {};
      const newImages = [...(currentData.images || [])];
      const newUrls = [...(currentData.previewUrls || [])];

      URL.revokeObjectURL(newUrls[index]);
      newImages.splice(index, 1);
      newUrls.splice(index, 1);

      setReviewFormData(prev => ({
         ...prev,
         [productId]: {
            ...currentData,
            images: newImages,
            previewUrls: newUrls
         }
      }));
   };

   useEffect(() => {
      fetchOrderDetails();
      const interval = setInterval(() => {
         fetchOrderDetails();
      }, 5000);

      return () => clearInterval(interval);
   }, [id]);

   if (loading && !order) {
      return <Loader />;
   }

   if (!order) {
      return (
         <div className="order-details-error">
            Order not found or you don't have permission to view it.
         </div>
      );
   }

   // Return dedicated live tracking view matching phone mockup screenshot
   if (showLiveTracking) {
      const timelineItems = buildTimeline();

      return (
         <div className="live-tracking-screen no-print">
            <div className="live-tracking-header">
               <button className="back-to-order-btn" onClick={() => setShowLiveTracking(false)}>
                  <i className="bi bi-chevron-left"></i> SEE ALL UPDATES
               </button>
            </div>

            <div className="live-tracking-body">
               {trackingLoading ? (
                  <div className="live-tracking-loader">
                     <Loader />
                     <p style={{ marginTop: "15px" }}>Loading direct package logs...</p>
                  </div>
               ) : liveTrackingData ? (
                  <>
                     <div className="courier-info-card">
                        <div className="courier-details">
                           <p className="courier-label">Courier: <span className="courier-value">{liveTrackingData.courier_name}</span></p>
                           <p className="tracking-id-label">Tracking ID: <span className="tracking-value">{liveTrackingData.awb_code}</span></p>
                        </div>
                        <button className="share-awb-btn" onClick={handleShareAWB} title="Share updates">
                           <i className="bi bi-share"></i>
                        </button>
                     </div>

                     <div className="live-timeline-container">
                        {timelineItems.length > 0 ? (
                           timelineItems.map((item, index) => {
                              let formattedDate = "";
                              let formattedTime = "";

                              if (item.date) {
                                 const dt = parseShiprocketDate(item.date);
                                 formattedDate = dt.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
                                 formattedTime = dt.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true });
                              }

                              let dotClass = "step-indicator-dot";
                              let dotIcon = null;

                              if (item.isCompleted) {
                                 dotClass += " checked";
                                 dotIcon = <i className="bi bi-check-lg"></i>;
                              } else if (item.isLatest) {
                                 dotClass += " current";
                                 dotIcon = <i className="bi bi-truck"></i>;
                              }

                              return (
                                 <div key={index} className="live-timeline-step">
                                    <div className="step-left">
                                       <span className="step-date">{formattedDate || "Planned"}</span>
                                    </div>
                                    <div className="step-center">
                                       <div className={dotClass}>
                                          {dotIcon}
                                       </div>
                                       {index < timelineItems.length - 1 && (
                                          <div className={`step-indicator-line ${item.isCompleted ? 'active' : ''}`}></div>
                                       )}
                                    </div>
                                    <div className="step-right">
                                       {!item.isPlaceholder && (
                                          <div className="activity-status-pill">{item.status || "In Transit"}</div>
                                       )}
                                       {formattedTime && <span className="step-time">{formattedTime}</span>}
                                       <p className="step-description">{item.activity}</p>
                                       {item.location && <p className="step-location"><i className="bi bi-geo-alt"></i> {item.location}</p>}
                                    </div>
                                 </div>
                              );
                           })
                        ) : (
                           <div className="no-live-activities">
                              <i className="bi bi-box-seam"></i>
                              <p>Order is registered. Tracking updates will show once picked up by our courier partner.</p>
                           </div>
                        )}
                     </div>
                  </>
               ) : (
                  <div className="tracking-error-container">
                     <i className="bi bi-exclamation-triangle"></i>
                     <p>Could not retrieve tracking details. Please try accessing the direct link instead.</p>
                  </div>
               )}
            </div>

            <div className="live-tracking-footer">
               <a 
                  href={`https://shiprocket.co/tracking/${order.awb_code}`} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="btn-open-tracking-link"
               >
                  <i className="bi bi-box-arrow-up-right"></i> Open Tracking Link
               </a>
               <button className="btn-go-back" onClick={() => setShowLiveTracking(false)}>
                  Go Back
               </button>
            </div>
         </div>
      );
   }

   const subTotal = order.items.reduce((acc, item) => acc + (parseFloat(item.price) * item.quantity), 0);
   const discount = parseFloat(order.discount) || 0;

   const getStatusNumber = (status) => {
      const s = status.toLowerCase();
      if (s === "pending" || s === "placed") return 1;
      if (s === "processing" || s === "shipped") return 2;
      if (s === "out for delivery") return 3;
      if (s === "delivered") return 4;
      return 1;
   };

   const currentStep = getStatusNumber(order.order_status);

   const handleDownloadInvoice = () => {
      window.print();
   };

   const getExchangeStatus = () => {
      if (order.order_status !== "Delivered") return null;

      const deliveryDate = new Date(order.updated_at);
      const now = new Date();
      const diffTime = now - deliveryDate;
      const diffHours = diffTime / (1000 * 60 * 60);
      const hoursLeft = 48 - Math.floor(diffHours);

      if (hoursLeft <= 0) {
         return { expired: true, message: "Exchange window expired", icon: "bi-exclamation-octagon" };
      } else if (hoursLeft <= 24) {
         return { expired: false, urgent: true, message: `Exchange: ${hoursLeft}h left`, icon: "bi-clock-history" };
      } else {
         const daysLeft = Math.ceil(hoursLeft / 24);
         return { expired: false, urgent: false, message: `Exchange: ${daysLeft} days left`, icon: "bi-calendar-check" };
      }
   };

   const exchangeInfo = getExchangeStatus();

   return (
      <div className="order-details-wrapper">
         {/* TAX INVOICE PRINT LAYOUT */}
         <div className="invoice-print-layout">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid #8E2139', paddingBottom: '30px', marginBottom: '30px' }}>
               <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
                  <img src="/assets/jayastra_banner.png" alt="JAYASTRA" style={{ height: '80px', objectFit: 'contain' }} />
                  <div>
                     <h1 style={{ margin: 0, fontSize: '28px', letterSpacing: '1px', color: '#8E2139', textTransform: 'uppercase', fontFamily: "'Playfair Display', serif" }}>JAYASTRA</h1>
                     <p style={{ margin: '2px 0 0 0', fontSize: '11px', color: '#555', letterSpacing: '2px', fontWeight: '600' }}>PREMIUM ETHNIC WEAR</p>
                     <div style={{ marginTop: '10px', fontSize: '11px', color: '#444', lineHeight: '1.4' }}>
                        <strong>Jayastra Retails</strong><br />
                        1-125 Bheemavaram, Telangana<br />
                        Email: jayastrastore@gmail.com
                     </div>
                  </div>
               </div>
               <div style={{ textAlign: 'right' }}>
                  <h2 style={{ margin: 0, fontSize: '28px', color: '#333', fontWeight: '300' }}>TAX INVOICE</h2>
                  <p style={{ margin: '10px 0 0 0', fontSize: '14px' }}><strong>Order No:</strong> INV-{order.id.toString().padStart(6, '0')}</p>
                  <p style={{ margin: '5px 0 0 0', fontSize: '14px' }}><strong>Date:</strong> {new Date(order.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                  <p style={{ margin: '5px 0 0 0', fontSize: '14px' }}><strong>Status:</strong> <span style={{ color: '#2e7d32', fontWeight: 'bold' }}>{order.payment_status}</span></p>
               </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '40px' }}>
               <div style={{ width: '45%' }}>
                  <h4 style={{ margin: '0 0 10px 0', borderBottom: '1px solid #ddd', paddingBottom: '5px', color: '#8E2139', textTransform: 'uppercase', fontSize: '14px' }}>Billed To</h4>
                  <p style={{ margin: 0, fontSize: '14px', lineHeight: '1.6', color: '#333' }}>
                     <strong>{order.customer_name}</strong><br />
                     {order.address}<br />
                     Phone: +91 {order.phone}
                  </p>
               </div>
               <div style={{ width: '45%' }}>
                  <h4 style={{ margin: '0 0 10px 0', borderBottom: '1px solid #ddd', paddingBottom: '5px', color: '#8E2139', textTransform: 'uppercase', fontSize: '14px' }}>Shipped To</h4>
                  <p style={{ margin: 0, fontSize: '14px', lineHeight: '1.6', color: '#333' }}>
                     <strong>{order.customer_name}</strong><br />
                     {order.address}<br />
                     Payment Method: {order.payment_method}
                  </p>
               </div>
            </div>

            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '40px', fontSize: '14px' }}>
               <thead>
                  <tr style={{ backgroundColor: '#f9f9f9', borderTop: '2px solid #000', borderBottom: '2px solid #000' }}>
                     <th style={{ textAlign: 'center', padding: '12px 10px', width: '10%' }}>Sl No.</th>
                     <th style={{ textAlign: 'left', padding: '12px 10px', width: '50%' }}>Item Description</th>
                     <th style={{ textAlign: 'center', padding: '12px 10px', width: '10%' }}>Qty</th>
                     <th style={{ textAlign: 'right', padding: '12px 10px', width: '15%' }}>Unit Price</th>
                     <th style={{ textAlign: 'right', padding: '12px 10px', width: '15%' }}>Amount</th>
                  </tr>
               </thead>
               <tbody>
                  {order.items.map((item, idx) => (
                     <tr key={idx} style={{ borderBottom: '1px solid #eee' }}>
                        <td style={{ textAlign: 'center', padding: '12px 10px', color: '#555' }}>{idx + 1}</td>
                        <td style={{ textAlign: 'left', padding: '12px 10px', fontWeight: '500' }}>{item.name}</td>
                        <td style={{ textAlign: 'center', padding: '12px 10px', color: '#555' }}>{item.quantity}</td>
                        <td style={{ textAlign: 'right', padding: '12px 10px', color: '#555' }}>₹{parseFloat(item.price).toFixed(2)}</td>
                        <td style={{ textAlign: 'right', padding: '12px 10px', fontWeight: '600' }}>₹{(item.quantity * parseFloat(item.price)).toFixed(2)}</td>
                     </tr>
                  ))}
               </tbody>
            </table>

            <div style={{ display: 'flex', justifyContent: 'flex-end', fontSize: '14px' }}>
               <div style={{ width: '45%' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #eee' }}>
                     <span style={{ color: '#555' }}>Subtotal:</span>
                     <span>₹{subTotal.toFixed(2)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #eee' }}>
                     <span style={{ color: '#555' }}>Discount:</span>
                     <span style={{ color: '#d32f2f' }}>-₹{discount.toFixed(2)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #000' }}>
                     <span style={{ color: '#555' }}>Shipping & Handling:</span>
                     <span>Free</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '15px 0', backgroundColor: '#f9f9f9', marginTop: '10px', borderRadius: '4px' }}>
                     <strong style={{ fontSize: '18px', paddingLeft: '15px' }}>Grand Total:</strong>
                     <strong style={{ fontSize: '18px', paddingRight: '15px', color: '#8E2139' }}>₹{parseFloat(order.total_amount).toFixed(2)}</strong>
                  </div>
               </div>
            </div>

            <div style={{ marginTop: '70px', paddingTop: '20px', borderTop: '1px solid #ddd', fontSize: '11px', color: '#666', textAlign: 'center', lineHeight: '1.6' }}>
               <p style={{ margin: '0 0 5px 0' }}><strong>Policy Note:</strong> Exchange requests must be submitted within 2 days of delivery of the saree., subject to our unboxing video verification protocol.</p>
               <p style={{ margin: 0 }}>This is a computer-generated tax invoice and does not require a physical signature.</p>
               <strong style={{ display: 'block', marginTop: '12px', color: '#8E2139', letterSpacing: '0.5px' }}>THANK YOU FOR CHOOSING JAYASTRA</strong>
            </div>
         </div>

         <div className="order-details-container no-print">
            <div className="order-left-col">
               <div className="order-products-box">
                  <div className="order-id-meta">
                     <h3>Order ID: #{order.id}</h3>
                     <span>Placed on {new Date(order.created_at).toLocaleDateString()}</span>
                  </div>

                  {order.items.map((item, idx) => {
                     const imageUrl = getImageUrl(item.image) || "/assets/no-image.png";
                     return (
                        <div key={idx} className="order-product-card">
                           <div className="order-product-img">
                              <img
                                 src={imageUrl}
                                 alt={item.name}
                                 onError={(e) => { e.target.src = "/assets/no-image.png"; }}
                              />
                           </div>
                           <div className="order-product-info">
                              <h2>{item.name}</h2>
                              <div className="op-price-row">
                                 <span className="op-price">₹{item.price}</span>
                                 <span style={{ fontSize: '12px', color: '#878787' }}>Qty: {item.quantity}</span>
                              </div>

                              {order.order_status === "Delivered" && (
                                 <div className="order-review-section">
                                    {userReviews[item.product_id] ? (
                                       <div className="user-review-card">
                                          <div className="card-header">
                                             <div className="stars-pill">
                                                {userReviews[item.product_id].rating} <i className="bi bi-star-fill"></i>
                                             </div>
                                             {userReviews[item.product_id].status === 'pending' && (
                                                <span className="mod-badge">Pending</span>
                                             )}
                                             <div className="card-actions">
                                                <button
                                                   className="icon-btn delete"
                                                   onClick={() => setDeleteConfirm({ productId: item.product_id, reviewId: userReviews[item.product_id].id })}
                                                   title="Delete Review"
                                                >
                                                   <i className="bi bi-trash"></i>
                                                </button>
                                             </div>
                                          </div>
                                          <p className="card-comment">{userReviews[item.product_id].comment}</p>
                                       </div>
                                    ) : (
                                       <button
                                          className="btn-rate-action"
                                          onClick={() => setActiveReviewItem(item)}
                                       >
                                          <i className="bi bi-patch-plus"></i> Rate Product
                                       </button>
                                    )}
                                 </div>
                              )}
                           </div>
                        </div>
                     );
                  })}
               </div>

               <div className="order-tracking-box">
                  <span className="tracking-title">Track your order</span>

                  {order.awb_code ? (
                     <div className="live-track-trigger-section">
                        <p className="awb-info-text">
                           Live tracking updates are active with AWB code: <strong>{order.awb_code}</strong>
                        </p>
                        <button 
                           className="btn-track-live" 
                           onClick={handleOpenLiveTracking}
                        >
                           <i className="bi bi-geo-alt-fill"></i> Live Tracking Location
                        </button>
                     </div>
                  ) : (
                     <p className="awb-info-text-pending">
                        Live shipment tracking updates will show here once your parcel is Shipped.
                     </p>
                  )}

                  <div className="tracking-timeline">
                     <div className={`track-step ${currentStep >= 1 ? 'step-active' : ''}`}>
                        <div className="ts-icon"></div>
                        <div className="ts-line"></div>
                        <div className="ts-content">
                           <h4>Order Confirmed</h4>
                           <p>{new Date(order.created_at).toLocaleDateString()}</p>
                        </div>
                     </div>

                     <div className={`track-step ${currentStep >= 2 ? 'step-active' : ''}`}>
                        <div className="ts-icon"></div>
                        <div className="ts-line"></div>
                        <div className="ts-content">
                           <h4>Shipped</h4>
                        </div>
                     </div>

                     <div className={`track-step ${currentStep >= 3 ? 'step-active' : ''}`}>
                        <div className="ts-icon"></div>
                        <div className="ts-line"></div>
                        <div className="ts-content">
                           <h4>Out for Delivery</h4>
                        </div>
                     </div>

                     <div className={`track-step ${currentStep >= 4 ? 'step-active' : ''}`}>
                        <div className="ts-icon"></div>
                        <div className="ts-content">
                           <h4>Delivered</h4>
                           {order.updated_at && currentStep >= 4 && <p>{new Date(order.updated_at).toLocaleDateString()}</p>}
                        </div>
                     </div>
                  </div>
               </div>
            </div>

            <div className="order-right-col">
               <div className="details-card">
                  <h3>Shipping Details</h3>
                  <span className="addr-type">Home</span>
                  <p className="addr-full">{order.address}</p>
                  <p style={{ marginTop: '10px' }}><strong>{order.customer_name}</strong></p>
                  <p>{order.phone}</p>
               </div>

               <div className="details-card">
                  <h3>Price Summary</h3>
                  <div className="price-row">
                     <span>Items Subtotal</span>
                     <span>₹{subTotal}</span>
                  </div>
                  <div className="price-row">
                     <span>Total Discount</span>
                     <span style={{ color: '#26a541' }}>-₹{discount}</span>
                  </div>
                  <div className="price-row total-row">
                     <span>Order Total</span>
                     <span>₹{order.total_amount}</span>
                  </div>

                  <p style={{ fontSize: '13px', color: '#878787', marginTop: '15px' }}>
                     Payment Method: <strong>{order.payment_method}</strong>
                  </p>

                  <button className="btn-invoice" onClick={handleDownloadInvoice}>
                     <i className="bi bi-download"></i> Download Invoice
                  </button>

                  {order.awb_code && (
                     <button 
                        className="btn-invoice btn-track-package-trigger" 
                        onClick={handleOpenLiveTracking}
                        style={{ background: '#3b82f6', color: 'white', borderColor: '#3b82f6', marginTop: '10px' }}
                     >
                        <i className="bi bi-geo-alt-fill"></i> Track Live Location
                     </button>
                  )}

                  {order.order_status === "Delivered" && exchangeInfo && (
                     <div className="exchange-status-container">
                        <div className={`exchange-badge ${exchangeInfo.expired ? 'expired' : (exchangeInfo.urgent ? 'urgent' : 'active')}`}>
                           <i className={`bi ${exchangeInfo.icon}`}></i>
                           <span>{exchangeInfo.message}</span>
                        </div>

                        {!exchangeInfo.expired && (
                           <button
                              className="btn-invoice btn-exchange"
                              onClick={() => setShowExchangeModal(true)}
                              style={{ marginTop: '0', background: '#8E2139', color: 'white', borderColor: '#8E2139' }}
                           >
                              <i className="bi bi-arrow-return-left"></i> Request Exchange
                           </button>
                        )}

                        {exchangeInfo.expired && (
                           <button
                              className="btn-invoice btn-exchange disabled"
                              disabled
                              style={{ marginTop: '0' }}
                           >
                              <i className="bi bi-lock-fill"></i> Exchange Window Closed
                           </button>
                        )}
                     </div>
                  )}
               </div>
            </div>
         </div>

         <ExchangeModal
            order={order}
            isOpen={showExchangeModal}
            onClose={() => setShowExchangeModal(false)}
            onSuccess={fetchOrderDetails}
         />

         {/* MODERN REVIEW MODAL */}
         {activeReviewItem && (
            <div className="review-modal-overlay">
               <div className="review-modal-content">
                  <div className="modal-header">
                     <h3>{editingReview ? 'Edit Your Review' : 'Rate & Review'}</h3>
                     <button className="close-modal" onClick={closeReviewModal}>&times;</button>
                  </div>
                  <div className="modal-body">
                     <div className="item-mini-info">
                        <img src={getImageUrl(activeReviewItem.image)} alt="" />
                        <span>{activeReviewItem.name}</span>
                     </div>

                     <div className="star-input-group">
                        {[1, 2, 3, 4, 5].map(s => (
                           <i
                              key={s}
                              className={`bi ${reviewFormData[activeReviewItem.product_id]?.rating >= s ? 'bi-star-fill' : 'bi-star'}`}
                              onClick={() => setReviewFormData(prev => ({
                                 ...prev,
                                 [activeReviewItem.product_id]: { ...prev[activeReviewItem.product_id], rating: s }
                              }))}
                           ></i>
                        ))}
                     </div>

                     <textarea
                        placeholder="Tell us what you liked or disliked about this product..."
                        value={reviewFormData[activeReviewItem.product_id]?.comment || ""}
                        onChange={(e) => setReviewFormData(prev => ({
                           ...prev,
                           [activeReviewItem.product_id]: { ...prev[activeReviewItem.product_id], comment: e.target.value }
                        }))}
                     />

                     <div className="file-upload-block">
                        <div className="modal-photo-header">
                           <span>Photos ({reviewFormData[activeReviewItem.product_id]?.images?.length || 0}/3)</span>
                        </div>

                        <div className="modal-previews-grid">
                           {(reviewFormData[activeReviewItem.product_id]?.previewUrls || []).map((url, idx) => (
                              <div key={idx} className="modal-preview-item">
                                 <img src={url} alt="Preview" />
                                 <button
                                    className="remove-modal-img"
                                    onClick={() => removeModalImage(activeReviewItem.product_id, idx)}
                                 >
                                    <i className="bi bi-x"></i>
                                 </button>
                              </div>
                           ))}

                           {(!reviewFormData[activeReviewItem.product_id]?.images || reviewFormData[activeReviewItem.product_id].images.length < 3) && (
                              <label className="modal-add-btn">
                                 <input
                                    type="file"
                                    multiple
                                    accept="image/*"
                                    onChange={(e) => handleModalImagesChange(activeReviewItem.product_id, e)}
                                    hidden
                                 />
                                 <i className="bi bi-camera"></i>
                                 <span>Add</span>
                              </label>
                           )}
                        </div>
                     </div>
                  </div>
                  <div className="modal-footer">
                     <button className="btn-cancel" onClick={closeReviewModal}>Cancel</button>
                     <button
                        className="btn-submit"
                        onClick={() => submitReview(activeReviewItem.product_id)}
                        disabled={isSubmitting}
                     >
                        {isSubmitting ? 'Posting...' : 'Post Review'}
                     </button>
                  </div>
               </div>
            </div>
         )}

         {/* CUSTOM DELETE CONFIRM MODAL */}
         {deleteConfirm && (
            <div className="delete-confirm-overlay">
               <div className="delete-confirm-card">
                  <div className="del-icon">
                     <i className="bi bi-exclamation-circle-fill"></i>
                  </div>
                  <h4>Delete Review?</h4>
                  <p>Are you sure you want to permanently delete your review? This action cannot be undone.</p>
                  <div className="confirm-actions">
                     <button className="btn-cancel-del" onClick={() => setDeleteConfirm(null)}>Cancel</button>
                     <button className="btn-confirm-del" onClick={confirmDelete}>Delete</button>
                  </div>
               </div>
            </div>
         )}

         {/* CUSTOM CENTERED NOTIFICATION */}
         {notif.show && (
            <div className="success-notif-overlay">
               <div className={`success-notif-card ${notif.type === 'error' ? 'error-notif' : ''}`}>
                  <i className={`bi ${notif.type === 'error' ? 'bi-exclamation-circle-fill' : 'bi-check-circle-fill'}`}></i>
                  <span>{notif.message}</span>
               </div>
            </div>
         )}
      </div>
   );
};

export default OrderDetails;
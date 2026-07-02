import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import "./OrderSuccessPage.css";

const API_URL = process.env.REACT_APP_API_URL;

const OrderSuccessPage = () => {
    const location = useLocation();
    const navigate = useNavigate();

    const orderId = location.state?.orderId;
    const orderDetails = location.state?.orderDetails;
    const finalPayable = location.state?.finalPayable;
    const paymentMethod = location.state?.paymentMethod;

    // Animation timeline stage: "loading" -> "celebrating" -> "revealing" -> "details"
    const [animationStage, setAnimationStage] = useState("loading");

    useEffect(() => {
        // Redirect to homepage if accessed directly without order data
        if (!orderId) {
            navigate("/", { replace: true });
            return;
        }
        window.scrollTo(0, 0);

        // Timeline matching the video
        const timer1 = setTimeout(() => setAnimationStage("celebrating"), 1200);
        const timer2 = setTimeout(() => setAnimationStage("revealing"), 2500);
        const timer3 = setTimeout(() => setAnimationStage("details"), 3800);

        return () => {
            clearTimeout(timer1);
            clearTimeout(timer2);
            clearTimeout(timer3);
        };
    }, [orderId, navigate]);

    if (!orderId) return null;

    // Generate dynamic confetti parameters using CSS variables for smooth GPU performance
    const confettiParticles = Array.from({ length: 40 }).map((_, i) => {
        const angle = (i / 40) * 360 + (Math.random() * 20 - 10);
        const distance = 80 + Math.random() * 120; // radial distance
        const tx = Math.cos((angle * Math.PI) / 180) * distance;
        const ty = Math.sin((angle * Math.PI) / 180) * distance;
        const rot = Math.random() * 360;
        const size = Math.random() * 6 + 6;
        const delay = Math.random() * 0.3;
        const colors = ["#FF2C55", "#FFD166", "#06D6A0", "#118AB2", "#9B5DE5", "#F15BB5", "#FF9F1C"];
        const shape = Math.random() > 0.5 ? "circle" : "strip";

        return {
            id: i,
            tx: `${tx}px`,
            ty: `${ty}px`,
            rot: `${rot}deg`,
            size: `${size}px`,
            delay: `${delay}s`,
            color: colors[Math.floor(Math.random() * colors.length)],
            shape,
        };
    });

    // Calculate dynamic delivery date (5 days out from purchase)
    const getEstimatedDelivery = () => {
        const date = new Date();
        date.setDate(date.getDate() + 5);
        return date.toLocaleDateString("en-IN", {
            day: "numeric",
            month: "short",
            year: "numeric"
        });
    };

    const getImageUrl = (imagePath) => {
        if (!imagePath) return null;
        if (imagePath.startsWith("http://") || imagePath.startsWith("https://")) {
            return imagePath;
        }
        let baseUrl = API_URL ? API_URL.replace(/\/api\/?$/, "") : "";
        if (!baseUrl) {
            baseUrl = `${window.location.protocol}//${window.location.hostname}${window.location.port ? `:${window.location.port}` : ''}`;
        }
        if (baseUrl.endsWith("/")) {
            baseUrl = baseUrl.slice(0, -1);
        }
        const cleanPath = imagePath.startsWith("/") ? imagePath : `/${imagePath}`;
        return `${baseUrl}${cleanPath}`;
    };

    const handleImageError = (e) => {
        e.target.src = "/placeholder-image.png";
        e.target.onerror = null;
    };

    // ----- All data derived from state, no dummy fallbacks -----
    const deliveryDate = getEstimatedDelivery();

    const itemsList = orderDetails?.cartItems || [];
    const recipientName = orderDetails?.customer_name || "";
    const phoneVal = orderDetails?.phone || "";
    const addressText = orderDetails?.address || "";
    const displayPaymentMethod = paymentMethod === "COD" ? "Cash on Delivery" : "Online";

    const subtotalVal = (Number(orderDetails?.total_amount || 0) + Number(orderDetails?.discount || 0));
    const discountVal = orderDetails?.discount || 0;
    const payableVal = finalPayable ?? orderDetails?.total_amount ?? 0;
    const shippingVal = orderDetails?.shipping_charge || 0;

    // Label for the total row based on payment method
    const amountLabel = paymentMethod === "COD" ? "Amount COD" : "Amount Paid Online";

    return (
        <div className={`order-success-page-wrapper stage-${animationStage}`}>
            {/* CENTRAL ANIMATION SEQUENCES (Stages 1, 2, and 3) */}
            {animationStage !== "details" && (
                <div className="animation-container">
                    {/* Stage 1: Loading Spinner */}
                    <div className={`spinner-circle ${animationStage === "loading" ? "spinning" : "fade-out"}`}></div>

                    {/* Stage 2 & 3: White badge scale pop with drawing checkmark and bursting confetti */}
                    <div className={`success-badge-container ${animationStage !== "loading" ? "pop-in" : ""}`}>
                        <div className="success-white-circle">
                            <svg className="checkmark-svg" viewBox="0 0 52 52">
                                <circle className="checkmark-circle-outline" cx="26" cy="26" r="25" fill="none" />
                                <path className="checkmark-check" fill="none" d="M14.1 27.2l7.1 7.2 16.7-16.8" />
                            </svg>
                        </div>

                        {/* Confetti Explosion */}
                        {animationStage === "celebrating" && (
                            <div className="confetti-holder">
                                {confettiParticles.map((p) => (
                                    <div
                                        key={p.id}
                                        className={`confetti-particle ${p.shape}`}
                                        style={{
                                            "--tx": p.tx,
                                            "--ty": p.ty,
                                            "--rot": p.rot,
                                            "--size": p.size,
                                            "--delay": p.delay,
                                            backgroundColor: p.color,
                                        }}
                                    />
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Stage 3: Order Confirmed text sliding up */}
                    <div className={`order-confirmed-text ${animationStage === "revealing" || animationStage === "celebrating" ? "slide-up" : "hidden"}`}>
                        Order Confirmed!
                    </div>
                </div>
            )}

            {/* STAGE 4: DETAILED ORDER CONFIRMATION SCREEN */}
            {animationStage === "details" && (
                <div className="details-card-wrapper">
                    {/* Overlapping top success badge */}
                    <div className="card-top-success-badge animate-badge-pop">
                        <div className="card-success-circle">
                            <i className="bi bi-check-lg"></i>
                        </div>
                    </div>

                    {/* Main Card Content */}
                    <div className="card-inner-body">
                        <h2 className="card-main-title">ORDER CONFIRMATION</h2>

                        {/* Thank you message alert box */}
                        <div className="thank-you-banner">
                            <div className="banner-top">
                                <span className="banner-check-icon">✓</span>
                                <span className="banner-main-text">Thank you for shopping with us</span>
                            </div>
                            <div className="banner-sub-text">Order ID :{orderId}</div>
                        </div>

                        {/* Estimated delivery banner */}
                        <div className="delivery-row">
                            <div className="delivery-icon-box">
                                <i className="bi bi-bag"></i>
                            </div>
                            <div className="delivery-text-box">
                                Estimated delivery by <span className="delivery-date-highlight">{deliveryDate}</span>
                            </div>
                        </div>

                        {/* Ordered Items list */}
                        <div className="items-container">
                            {itemsList.map((item, index) => {
                                const imageUrl = getImageUrl(
                                    item.image_url || item.image || item.productImage || item.img || null
                                );

                                return (
                                    <div className="item-detail-box" key={item.id || index}>
                                        <div className="item-main-content">
                                            <div className="item-thumbnail-container">
                                                <img
                                                    src={imageUrl || "/placeholder-image.png"}
                                                    alt={item.name || "Product"}
                                                    onError={handleImageError}
                                                    className="item-thumbnail"
                                                />
                                            </div>
                                            <div className="item-info-text">
                                                <h4 className="item-title">{item.name || "Product Item"}</h4>
                                                <p className="item-meta-specs">
                                                    Size: {item.size || "Freesize"} &nbsp;&bull;&nbsp; Qty: {item.quantity || 1}
                                                </p>
                                                <p className="item-display-price">₹{parseFloat(item.price || 0).toFixed(0)}</p>
                                            </div>
                                        </div>
                                        <div className="item-supplier-row">
                                            Product: <span className="supplier-name-bold">{item.name}</span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Shipping details (Delivery Address) */}
                        <div className="info-section-card">
                            <h3 className="section-header">Delivery Address</h3>
                            <div className="address-content-row">
                                <div className="address-text-details">
                                    <p className="address-name-bold">{recipientName}</p>
                                    <p className="address-phone">{phoneVal}</p>
                                    <p className="address-body">{addressText}</p>
                                </div>
                                <div className="address-arrow-action">
                                    <i className="bi bi-chevron-right"></i>
                                </div>
                            </div>
                        </div>

                        {/* Method of Payment details */}
                        <div className="info-section-card">
                            <h3 className="section-header">Payment Method</h3>
                            <div className="payment-content-row">
                                <div className="payment-icon-label">
                                    <i className="bi bi-credit-card-2-front-fill payment-icon"></i>
                                    <span className="payment-text-bold">{displayPaymentMethod}</span>
                                </div>
                            </div>
                        </div>

                        {/* Price Breakdown invoice details */}
                        <div className="info-section-card no-border">
                            <h3 className="section-header">Price Details</h3>
                            <div className="price-breakdown-table">
                                <div className="price-row">
                                    <span className="price-label">Product Charges</span>
                                    <span className="price-val">₹{subtotalVal}</span>
                                </div>
                                <div className="price-row">
                                    <span className="price-label">Delivery Charges</span>
                                    <span className="price-val text-green">
                                        {shippingVal > 0 ? `+₹${shippingVal}` : "FREE"}
                                    </span>
                                </div>
                                {discountVal > 0 && (
                                    <div className="price-row text-green">
                                        <span className="price-label">Discount Applied</span>
                                        <span className="price-val">-₹{discountVal}</span>
                                    </div>
                                )}
                                <div className="price-row total-payable-row">
                                    <span className="total-label">{amountLabel}</span>
                                    <span className="total-val-highlight">₹{payableVal}</span>
                                </div>
                            </div>
                        </div>

                        {/* Sticky Action Footer */}
                        <div className="sticky-action-footer">
                            <button className="btn-meesho-primary" onClick={() => navigate("/")}>
                                Continue Shopping
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default OrderSuccessPage;
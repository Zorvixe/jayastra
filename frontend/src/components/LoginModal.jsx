// LoginModal.js - Coupon Offer on Right Side Top & Reduced Sizes

import React, { useState, useEffect } from "react";
import axios from "axios";
import "./LoginModal.css";
import { GoogleLogin } from "@react-oauth/google";
import { jwtDecode } from "jwt-decode";
import { useCart } from "../context/CartContext";
import { useWishlist } from "../context/WishlistContext";
import { useUser } from "../context/UserContext";

const API_URL = process.env.REACT_APP_API_URL;

// Helper to construct absolute image URL from backend path
const getImageUrl = (imagePath) => {
  if (!imagePath) return null;
  if (imagePath.startsWith("http")) return imagePath;
  let baseUrl = API_URL.replace(/\/api\/?$/, "");
  if (baseUrl.endsWith("/")) baseUrl = baseUrl.slice(0, -1);
  const cleanPath = imagePath.startsWith("/") ? imagePath : `/${imagePath}`;
  return `${baseUrl}${cleanPath}`;
};

const LoginModal = ({ show, setShow }) => {
  const { fetchCart } = useCart();
  const { fetchWishlist } = useWishlist();
  const { fetchUser } = useUser();

  const [isSignup, setIsSignup] = useState(false);
  const [error, setError] = useState("");
  
  // Dynamic Data States
  const [offerText, setOfferText] = useState("Unlock Offers");
  const [couponCode, setCouponCode] = useState("");
  const [modalImage, setModalImage] = useState(null);

  const [formData, setFormData] = useState({
    name: "",
    phone: ""
  });

  // Fetch dynamic image and offers when modal opens
  useEffect(() => {
    if (show) {
      // 1. Fetch currently active coupons/offers
      axios.get(`${API_URL}/coupons`)
        .then(res => {
          const coupons = res.data.coupons || [];
          if (coupons.length > 0) {
            // Find the most attractive coupon (highest value) to show
            const bestCoupon = coupons.reduce((prev, current) => 
              (Number(prev.discount_value) > Number(current.discount_value)) ? prev : current
            );
            
            if (bestCoupon.discount_type === 'flat') {
              setOfferText(`₹${Number(bestCoupon.discount_value)} OFF`);
            } else {
              setOfferText(`${Number(bestCoupon.discount_value)}% OFF`);
            }
            setCouponCode(bestCoupon.code || "WELCOME");
          } else {
            setOfferText("Get Exclusive Offers");
            setCouponCode("JOINNOW");
          }
        })
        .catch(err => console.error("Failed to fetch coupons for modal", err));

      // 2. Fetch random image from backend products
      axios.get(`${API_URL}/products`)
        .then(res => {
          const products = res.data.products || [];
          const productsWithImages = products.filter(p => p.main_image_url);
          
          if (productsWithImages.length > 0) {
            // Pick a random product image
            const randomProd = productsWithImages[Math.floor(Math.random() * productsWithImages.length)];
            setModalImage(getImageUrl(randomProd.main_image_url));
          }
        })
        .catch(err => console.error("Failed to fetch images for modal", err));
    } else {
      // Reset state when closed so it fetches fresh next time
      setError("");
    }
  }, [show]);

  if (!show) return null;

  /* ================= SIMPLE AUTH (Login/Register) ================= */

  const handleSimpleAuth = async (e) => {
    e.preventDefault();
    setError("");

    try {
      const res = await axios.post(`${API_URL}/auth/simple-login`, {
        phone: formData.phone,
        name: isSignup ? formData.name : undefined
      });

      localStorage.setItem("token", res.data.token);
      fetchCart();
      fetchWishlist();
      fetchUser();
      setShow(false);

    } catch (err) {
      setError(err.response?.data?.message || "Authentication failed");
    }
  };

  /* ================= GOOGLE LOGIN ================= */

  const handleGoogleSuccess = async (response) => {
    try {
      const decoded = jwtDecode(response.credential);

      const res = await axios.post(`${API_URL}/auth/google-login`, {
        name: decoded.name,
        email: decoded.email,
      });

      localStorage.setItem("token", res.data.token);
      fetchCart();
      fetchWishlist();
      fetchUser();
      setShow(false);

    } catch (err) {
      console.log(err);
      setError("Google login failed");
    }
  };

  return (
    <div className="login-overlay">
      <div className="login-modal-container">
        
        {/* Left Side: Image Banner */}
        <div className="login-modal-left">
          {modalImage ? (
            <img 
              src={modalImage} 
              alt="Special Offer" 
              onError={(e) => {
                e.target.src = "https://images.unsplash.com/photo-1610030469983-98e550d61dc0?q=80&w=500&auto=format&fit=crop";
              }}
            />
          ) : (
            <div className="offer-text-banner">
              <div className="offer-content">
                <span className="offer-icon">🎁</span>
                <h3>Special Deal</h3>
                <p>Sign up & save big</p>
              </div>
            </div>
          )}
        </div>

        {/* Right Side: Form Content */}
        <div className="login-modal-right">
          <button className="close-btn" onClick={() => setShow(false)}>
            ✕
          </button>

          {/* Coupon Offer Banner - Top Right */}
          <div className="coupon-offer-banner">
            <div className="coupon-icon">🏷️</div>
            <div className="coupon-text">
              <span className="offer-label">Get {offerText}</span>
              <span className="coupon-code">Use code: {couponCode}</span>
            </div>
          </div>

          <div className="login-header">
            <h2>{isSignup ? "Sign Up" : "Welcome Back"}</h2>
            <p>{isSignup ? "Create account & claim your offer" : "Login to continue"}</p>
          </div>

          {error && <p className="auth-error">{error}</p>}

          <form onSubmit={handleSimpleAuth} className="auth-form">
            {isSignup && (
              <input
                type="text"
                placeholder="Full name"
                required
                value={formData.name}
                onChange={(e) => setFormData({
                  ...formData,
                  name: e.target.value
                })}
              />
            )}

            <div className="phone-input-wrapper">
              <div className="country-code">
                <span>🇮🇳 +91</span>
              </div>
              <input
                type="tel"
                placeholder="Phone number"
                required
                value={formData.phone}
                onChange={(e) => setFormData({
                  ...formData,
                  phone: e.target.value
                })}
              />
            </div>

            <button type="submit">
              {isSignup ? "Sign Up" : "Login"}
            </button>

            <div className="divider">
              <span>OR</span>
            </div>

            {/* Google Login Button */}
            <div className="google-btn-container">
              <GoogleLogin
                onSuccess={handleGoogleSuccess}
                onError={() => setError("Google Login Failed")}
              />
            </div>

            <p className="switch-auth">
              {isSignup ? "Have an account?" : "New here?"}{" "}
              <span onClick={() => {
                setIsSignup(!isSignup);
                setError("");
              }}>
                {isSignup ? "Login" : "Sign up"}
              </span>
            </p>

            <p className="terms-text">
              By continuing, you agree to Terms & Privacy
            </p>
          </form>
        </div>

      </div>
    </div>
  );
};

export default LoginModal;
import { useMemo, useEffect, useState } from "react";
import { useCart } from "../context/CartContext";
import { useNavigate } from "react-router-dom";
import { useUser } from "../context/UserContext";
import RelatedProducts from "../components/RelatedProducts";
import "./CartPage.css";
import Loader from "../components/Loader"; // ✅ NEW

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

const createSlug = (name) => {
  if (!name) return "product";
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
};

// Image component with loading state
const LazyImage = ({ src, alt, className, onClick, style }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);

  return (
    <div className="lazy-image-container cart-img-container">
      {isLoading && (
        <Loader />
      )}
      <img
        src={src}
        alt={alt}
        className={`${className} ${isLoading ? 'img-loading' : 'img-loaded'}`}
        style={{ ...style, display: isLoading ? 'none' : 'block' }}
        onClick={onClick}
        onLoad={() => setIsLoading(false)}
        onError={() => {
          setError(true);
          setIsLoading(false);
        }}
      />
      {error && (
        <div className="image-error-fallback cart-image-error">
          <i className="bi bi-image"></i>
          <span>No Image</span>
        </div>
      )}
    </div>
  );
};

const CartPage = () => {
  const { cartItems, updateQty, removeItem, totalPrice, isLoading: cartLoading } = useCart();
  const { setShowLogin } = useUser();
  const navigate = useNavigate();
  const [updatingItemId, setUpdatingItemId] = useState(null);
  const [removingItemId, setRemovingItemId] = useState(null);

  const token = localStorage.getItem("token");

  // Get image URL from cart item
  const getItemImage = (item) => {
    const imgPath = item.image_url || item.main_image_url;
    if (!imgPath) return "/assets/no-image.png";
    const fullUrl = getImageUrl(imgPath);
    return fullUrl || "/assets/no-image.png";
  };

  // Handle quantity update with loading state
  const handleUpdateQty = async (itemId, newQty) => {
    setUpdatingItemId(itemId);
    try {
      await updateQty(itemId, newQty);
    } finally {
      setUpdatingItemId(null);
    }
  };

  // Handle remove item with loading state
  const handleRemoveItem = async (itemId) => {
    setRemovingItemId(itemId);
    try {
      await removeItem(itemId);
    } finally {
      setRemovingItemId(null);
    }
  };

  // Memoize related product data
  const cartProductIds = useMemo(() => 
    cartItems.map(item => item.product_id || item.id),
    [cartItems]
  );

  const cartCategories = useMemo(() => {
    const categories = [
      ...new Set(cartItems.map(item => item.category_name))
    ].filter(Boolean);
    return categories;
  }, [cartItems]);

  // Loading skeleton for cart items
  const CartSkeleton = () => (
    <div className="cart-skeleton">
      {[1, 2, 3].map((i) => (
        <div key={i} className="cart-item-skeleton">
          <div className="skeleton-image"></div>
          <div className="skeleton-details">
            <div className="skeleton-text title"></div>
            <div className="skeleton-text price"></div>
          </div>
          <div className="skeleton-qty"></div>
          <div className="skeleton-total"></div>
          <div className="skeleton-delete"></div>
        </div>
      ))}
    </div>
  );

  // Loading skeleton for order summary
  const SummarySkeleton = () => (
    <div className="order-summary-skeleton">
      <div className="skeleton-title"></div>
      <div className="skeleton-row"></div>
      <div className="skeleton-row total"></div>
      <div className="skeleton-button"></div>
    </div>
  );

  if (cartLoading) {
    return (
      <div className="container cart-page-container">
        <div className="row">
          <div className="col-lg-8">
            <h3 className="cart-title">My Cart</h3>
            <CartSkeleton />
          </div>
          <div className="col-lg-4">
            <SummarySkeleton />
          </div>
        </div>
      </div>
    );
  }

  const getProductUrl = (item) => {
    if (!item.uuid) return `/product/${item.product_id || item.id}`; // fallback
    const slug = createSlug(item.name);
    return `/product/${item.uuid}/${slug}?product_code=${item.product_code || ""}`;
  };

  return (
    <div className="container cart-page-container">
      <div className="row">
        {/* ================= CART ITEMS ================= */}
        <div className="col-lg-8">
          <h3 className="cart-title">My Cart</h3>

          {cartItems.length === 0 && (
            <div className="empty-cart">
              <i className="bi bi-cart-x"></i>
              <p>Your cart is empty</p>
              <button
                className="shop-btn"
                onClick={() => navigate("/all-products")}
              >
                Continue Shopping
              </button>
            </div>
          )}

          {cartItems.map(item => {
            const prodUrl = getProductUrl(item);
            const imageSrc = getItemImage(item);
            const isUpdating = updatingItemId === item.id;
            const isRemoving = removingItemId === item.id;
            
            return (
              <div key={item.id} className={`cart-page-item ${isRemoving ? 'removing' : ''}`}>
                <LazyImage
                  src={imageSrc}
                  alt={item.name}
                  className="cart-page-img"
                  onClick={() => navigate(prodUrl)}
                  style={{ cursor: "pointer" }}
                />
                <div 
                  className="cart-item-info" 
                  onClick={() => navigate(prodUrl)}
                  style={{ cursor: "pointer" }}
                >
                  <h6>{item.name}</h6>
                  <p className="cart-item-price">₹{item.price}</p>
                </div>

                <div className="cart-qty-box">
                  <button 
                    onClick={() => handleUpdateQty(item.id, Math.max(1, item.qty - 1))}
                    disabled={isUpdating}
                  >
                    {isUpdating ? <i className="bi bi-hourglass-split"></i> : "−"}
                  </button>
                  <span className="cart-qty-value">{item.qty}</span>
                  <button 
                    onClick={() => handleUpdateQty(item.id, item.qty + 1)}
                    disabled={isUpdating}
                  >
                    {isUpdating ? <i className="bi bi-hourglass-split"></i> : "+"}
                  </button>
                </div>

                <div className="cart-item-total">₹{item.price * item.qty}</div>
                <button 
                  className="cart-delete-btn" 
                  onClick={() => handleRemoveItem(item.id)}
                  disabled={isRemoving}
                >
                  {isRemoving ? (
                    <i className="bi bi-hourglass-split"></i>
                  ) : (
                    <i className="bi bi-trash-fill"></i>
                  )}
                </button>
              </div>
            );
          })}
        </div>

        {/* ================= SUMMARY ================= */}
        <div className="col-lg-4">
          <div className="order-summary">
            <h4>Order Summary</h4>
            <div className="summary-row">
              <span>Subtotal</span>
              <span>₹{totalPrice}</span>
            </div>
            <div className="summary-row">
              <span>Shipping</span>
              <span>Free</span>
            </div>
            <div className="summary-row summary-total">
              <span>Total</span>
              <span>₹{totalPrice}</span>
            </div>
            <button
              className="checkout-btn w-100"
              onClick={() => navigate("/checkout")}
              disabled={cartItems.length === 0}
            >
              {cartItems.length === 0 ? "Cart is Empty" : "Place Order"}
            </button>
          </div>
        </div>
      </div>

      {/* ================= RELATED PRODUCTS (DYNAMIC) ================= */}
      {cartItems.length > 0 && cartCategories.length > 0 && (
        <RelatedProducts
          categories={cartCategories}
          excludeIds={cartProductIds}
        />
      )}
    </div>
  );
};

export default CartPage;
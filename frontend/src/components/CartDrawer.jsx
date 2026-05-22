import { useCart } from "../context/CartContext";
import { useNavigate } from "react-router-dom";
import "./CartDrawer.css";

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
  if (!name) return "product";
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
};

// Helper to generate product detail URL from a cart item
const getProductUrl = (item) => {
  if (!item.uuid || !item.name) return "#";
  const slug = createSlug(item.name);
  return `/product/${item.uuid}/${slug}?product_code=${item.product_code || ""}`;
};

const CartDrawer = ({ isOpen, setIsOpen }) => {
  const { cartItems, updateQty, removeItem, totalPrice } = useCart();
  const navigate = useNavigate();

  const getItemImage = (item) => {
    const imgPath = item.image_url || item.main_image_url;
    if (!imgPath) return "/assets/no-image.png";
    const fullUrl = getImageUrl(imgPath);
    return fullUrl || "/assets/no-image.png";
  };

  // Navigate to product detail page for a specific item
  const handleNavigateToProduct = (item) => {
    const url = getProductUrl(item);
    if (url !== "#") {
      navigate(url);
      setIsOpen(false);
    }
  };

  return (
    <>
      <div
        className={`cart-overlay ${isOpen ? "show" : ""}`}
        onClick={() => setIsOpen(false)}
      />

      <div className={`cart-drawer ${isOpen ? "open" : ""}`}>
        <div className="cart-header">
          <h4>Cart ({cartItems.length} items)</h4>
          <button onClick={() => setIsOpen(false)}>✕</button>
        </div>

        <div className="cart-body">
          {cartItems.length === 0 && (
            <p className="empty-text">Your cart is empty</p>
          )}

          {cartItems.map((item) => (
            <div key={item.id} className="cart-item">
              <img
                src={getItemImage(item)}
                alt={item.name}
                className="cart-img"
                onClick={() => handleNavigateToProduct(item)}
                style={{ cursor: "pointer" }}
                onError={(e) => {
                  e.target.src = "/assets/no-image.png";
                }}
              />
              <div className="cart-details">
                <p
                  className="item-name"
                  style={{ cursor: "pointer" }}
                  onClick={() => handleNavigateToProduct(item)}
                >
                  {item.name}
                </p>
                <p className="item-price">₹{item.price}</p>
                <div className="qty-box">
                  <button
                    onClick={() =>
                      updateQty(item.id, Math.max(1, item.qty - 1))
                    }
                  >
                    −
                  </button>
                  <span>{item.qty}</span>
                  <button
                    onClick={() => updateQty(item.id, item.qty + 1)}
                  >
                    +
                  </button>
                </div>
                <button
                  className="remove-btn"
                  onClick={() => removeItem(item.id)}
                >
                  Remove
                </button>
              </div>
              <div className="item-total">₹{item.price * item.qty}</div>
            </div>
          ))}
        </div>

        <div className="cart-footer">
          <div className="total-row">
            <span>Estimated total</span>
            <span>₹{totalPrice}</span>
          </div>

          <button
            className="checkout-btn w-100"
            onClick={() => {
              setIsOpen(false);
              navigate("/checkout");
            }}
          >
            Place Order
          </button>

          <button
            className="view-cart-btn"
            onClick={() => {
              navigate("/cart");
              setIsOpen(false);
            }}
          >
            View Cart
          </button>

          <p className="secure-text">🔒 Secure Checkout</p>
        </div>
      </div>
    </>
  );
};

export default CartDrawer;
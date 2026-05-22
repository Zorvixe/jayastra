import { useWishlist } from "../context/WishlistContext";
import { useNavigate } from "react-router-dom";
import "./WishlistPage.css";

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

const WishlistPage = () => {
  const { wishlistItems, toggleWishlist } = useWishlist();
  const navigate = useNavigate();

  // Get image URL from wishlist item
  const getItemImage = (item) => {
    const imgPath = item.image_url || item.main_image_url;
    if (!imgPath) return "/assets/no-image.png";
    const fullUrl = getImageUrl(imgPath);
    return fullUrl || "/assets/no-image.png";
  };

  const getProductUrl = (item) => {
    if (!item.uuid) return `/product/${item.product_id}`; // fallback
    const slug = createSlug(item.name);
    return `/product/${item.uuid}/${slug}?product_code=${item.product_code || ""}`;
  };

  return (
    <div className="wishlist-page container py-5">
      <h2 className="wishlist-title">My Wishlist</h2>

      {/* EMPTY STATE */}
      {wishlistItems.length === 0 && (
        <div className="wishlist-empty">
          <p>Your wishlist is empty</p>
          <button className="shop-btn" onClick={() => navigate("/all-products")}>
            Shop Now
          </button>
        </div>
      )}

      <div className="row g-4">
        {wishlistItems.map(item => {
          const imageSrc = getItemImage(item);
          const productUrl = getProductUrl(item);
          return (
            <div key={item.id} className="col-6 col-md-4 col-lg-3">
              <div 
                className="wishlist-card" 
                onClick={() => navigate(productUrl)}
                style={{ cursor: "pointer" }}
              >
                {/* ❤️ REMOVE */}
                <div className="wishlist-remove-icon" onClick={(e) => { e.stopPropagation(); toggleWishlist(item); }}>
                  <i className="bi bi-heart-fill"></i>
                </div>

                {/* IMAGE */}
                <div className="wishlist-image">
                  <img
                    src={imageSrc}
                    alt={item.name}
                    onError={(e) => {
                      e.target.src = "/assets/no-image.png";
                    }}
                  />
                </div>

                {/* INFO */}
                <div className="wishlist-info">
                  <h6>{item.name}</h6>
                  <p>₹{item.price}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default WishlistPage;
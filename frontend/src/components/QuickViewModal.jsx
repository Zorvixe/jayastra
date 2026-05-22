import React, { useMemo, useState, useEffect, useRef } from "react";
import { useCart } from "../context/CartContext";
import { useNavigate } from "react-router-dom";
import "./QuickView.css";

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

const QuickViewModal = ({ selectedProduct, setSelectedProduct }) => {
  const [quantity, setQuantity] = useState(1);
  const { addToCart } = useCart();
  const navigate = useNavigate();

  useEffect(() => {
    setQuantity(1);
  }, [selectedProduct]);

  // ✅ Move useMemo before any conditional return
  const productUrl = useMemo(() => {
    if (!selectedProduct) return "#";
    if (!selectedProduct.uuid || !selectedProduct.name) return "#";
    const slug = createSlug(selectedProduct.name);
    return `/product/${selectedProduct.uuid}/${slug}?product_code=${selectedProduct.product_code || ""}`;
  }, [selectedProduct]); // Re-run when selectedProduct changes

  // ✅ Now safe to return early – all hooks have been called
  if (!selectedProduct) return null;

  const imageUrl = getImageUrl(selectedProduct.main_image_url) || "/assets/no-image.png";

  const handleAddToCart = () => {
    addToCart({
      ...selectedProduct,
      qty: quantity
    });
    setSelectedProduct(null);
  };

  return (
    <div className="quickview-backdrop" onClick={() => setSelectedProduct(null)}>
      <div className="quickview-modal" onClick={(e) => e.stopPropagation()}>
        <button className="close-btn" onClick={() => setSelectedProduct(null)}>
          ✕
        </button>

        <div className="quickview-content">
          <div className="quickview-image">
            <img
              src={imageUrl}
              alt={selectedProduct.name}
              onError={(e) => {
                e.target.src = "/assets/no-image.png";
              }}
            />
          </div>

          <div className="quickview-details">
            <h4>{selectedProduct.name}</h4>
            <p className="price">₹{selectedProduct.price}</p>
            <small>Taxes Included</small>

            <div className={`quantity-box ${selectedProduct.stock_quantity === 0 ? "disabled" : ""}`}>
              <button
                disabled={selectedProduct.stock_quantity === 0}
                onClick={() => setQuantity(q => Math.max(1, q - 1))}
              >
                −
              </button>
              <span>{selectedProduct.stock_quantity === 0 ? 0 : quantity}</span>
              <button
                disabled={selectedProduct.stock_quantity === 0}
                onClick={() => setQuantity(q => q + 1)}
              >
                +
              </button>
            </div>

            <button
              className={`add-cart-btn ${selectedProduct.stock_quantity === 0 ? "sold-out" : ""}`}
              disabled={selectedProduct.stock_quantity === 0}
              onClick={handleAddToCart}
            >
              {selectedProduct.stock_quantity === 0 ? "Sold Out" : "Add to Bag"}
            </button>

            <div
              className="view-details-link"
              onClick={() => {
                navigate(productUrl);
                setSelectedProduct(null);
              }}
            >
              View More Details →
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuickViewModal;
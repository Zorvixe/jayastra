import React, { useMemo, useState, useEffect, useRef } from "react";
import { getProducts } from "../data/products";
import { shuffleArray } from "../utils/shuffle";
import ProductCard from "./ProductCard";
import "./RelatedProducts.css";

const RelatedProducts = ({
  category,
  categories = [],
  excludeIds = []
}) => {
  const [allProducts, setAllProducts] = useState([]);
  const sliderRef = useRef(null);

  // ✅ Fetch products only once when the component mounts
  useEffect(() => {
    const loadProducts = async () => {
      try {
        const data = await getProducts();
        setAllProducts(data);
      } catch (err) {
        console.error("Failed to load related products", err);
      }
    };
    loadProducts();
  }, []); // empty dependency => runs once

  // ✅ Compute related products with useMemo – only recalculates when dependencies change
  const related = useMemo(() => {
    if (!allProducts.length) return [];

    let suggestedProducts = [];
    if (category) {
      suggestedProducts = allProducts.filter(
        (p) => p.category_name === category && !excludeIds.includes(p.id)
      );
    } else if (categories.length > 0) {
      suggestedProducts = allProducts.filter(
        (p) => categories.includes(p.category_name) && !excludeIds.includes(p.id)
      );
    }

    const shuffled = shuffleArray(suggestedProducts);
    return shuffled.slice(0, 8);
  }, [allProducts, category, categories, excludeIds]);

  const scroll = (direction) => {
    if (sliderRef.current) {
      const { scrollLeft, clientWidth } = sliderRef.current;
      const scrollTo =
        direction === "left"
          ? scrollLeft - clientWidth
          : scrollLeft + clientWidth;
      sliderRef.current.scrollTo({ left: scrollTo, behavior: "smooth" });
    }
  };

  if (related.length === 0) return null;

  return (
    <div className="related-section mt-5">
      <div className="section-header d-flex justify-content-between align-items-center mb-4">
        <h3 className="section-title mb-0">You may also like</h3>
        <div className="slider-nav-btns d-none d-md-flex">
          <button className="nav-btn prev" onClick={() => scroll("left")}>
            <i className="bi bi-chevron-left"></i>
          </button>
          <button className="nav-btn next" onClick={() => scroll("right")}>
            <i className="bi bi-chevron-right"></i>
          </button>
        </div>
      </div>

      <div className="related-slider-container" ref={sliderRef}>
        {related.map((product) => (
          <div key={product.id} className="related-item">
            <ProductCard
              product={product}
              showAddToCart={true}
              showQuickView={false}
              compact={true}
            />
          </div>
        ))}
      </div>
    </div>
  );
};

// ✅ Prevent unnecessary re-renders when parent re-renders with same props
export default React.memo(RelatedProducts);
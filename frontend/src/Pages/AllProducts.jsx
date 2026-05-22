import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import "./AllProducts.css";

import ProductCard from "../components/ProductCard";
import QuickViewModal from "../components/QuickViewModal";
import Loader from "../components/Loader";

import { getProducts } from "../data/products";

const AllProducts = () => {
  const [searchParams] = useSearchParams();
  const categoryParam = searchParams.get("category");
  const maxPriceParam = searchParams.get("maxPrice");
  const minPriceParam = searchParams.get("minPrice");

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState(categoryParam || "All Products");
  const [maxPrice, setMaxPrice] = useState(maxPriceParam ? Number(maxPriceParam) : 10000); 
  const [minPrice, setMinPrice] = useState(minPriceParam ? Number(minPriceParam) : 0);
  const [selectedColors, setSelectedColors] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [sortBy, setSortBy] = useState("newest");
  const [showMobileFilter, setShowMobileFilter] = useState(false);
  const [availableColors, setAvailableColors] = useState([]);

  const [categories, setCategories] = useState(["All Products"]);

  /* ================= URL SYNC ================= */
  useEffect(() => {
    if (categoryParam) {
      setSelectedCategory(categoryParam);
    }
  }, [categoryParam]);

  /* ================= LOAD PRODUCTS ================= */
  useEffect(() => {
    const loadProducts = async () => {
      try {
        const data = await getProducts();
        let productList = Array.isArray(data) ? data : (data?.products || []);
        setProducts(productList);

        /* create category list dynamically */
        const uniqueCategories = [
          "All Products",
          ...new Set(productList.map(p => p.category_name).filter(Boolean))
        ];
        setCategories(uniqueCategories);
        
        /* create color list dynamically */
        const uniqueColors = [
          ...new Set(productList.map(p => p.color?.toLowerCase()).filter(Boolean))
        ];
        setAvailableColors(uniqueColors);
        
        // Find max price for the range input if no URL param was provided
        if (!maxPriceParam) {
           const actualHighest = Math.max(...productList.map(p => Number(p.price) || 0), 10000);
           setMaxPrice(actualHighest);
        }

      } catch (err) {
        console.error("Failed to load products", err);
        setProducts([]);
      } finally {
        // Ensure loader stays for at least 2 seconds for better UX
        setTimeout(() => {
          setLoading(false);
        }, 1000);
      }
    };
    loadProducts();
  }, [maxPriceParam]);

  /* ================= COLOR FILTER ================= */
  const toggleColor = (color) => {
    setSelectedColors(prev => prev.includes(color) ? [] : [color]);
  };

  /* ================= FILTER & SORT PRODUCTS ================= */
  const getFilteredAndSorted = () => {
    let result = (products || []).filter(product => {
      const categoryMatch = selectedCategory === "All Products" || product.category_name === selectedCategory;
      const priceMatch = !product.price || (product.price >= minPrice && product.price <= maxPrice);
      const colorMatch = selectedColors.length === 0 || selectedColors.includes(product.color?.toLowerCase());
      return categoryMatch && priceMatch && colorMatch;
    });

    // Sorting
    if (sortBy === "price-low") result.sort((a, b) => a.price - b.price);
    if (sortBy === "price-high") result.sort((a, b) => b.price - a.price);
    if (sortBy === "newest") result.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));

    return result;
  };

  const finalProducts = getFilteredAndSorted();

  /* ================= UI ================= */
  return (
    <div className="all-products-page">
      <div className="container-fluid products-main-container top-offset">
        <div className="row g-4">
          
          {/* ================= 2. SIDEBAR (FILTERS) ================= */}
          <div className={`col-lg-3 sidebar-container ${showMobileFilter ? 'mobile-visible' : ''}`}>
             <div className="sidebar-header d-lg-none">
                <h5>Filter & Sort</h5>
                <button className="close-filter" onClick={() => setShowMobileFilter(false)}>
                  <i className="bi bi-xl-circle"></i>
                </button>
             </div>

             <div className="sidebar-section">
                <h4 className="sidebar-title">Categories</h4>
                <ul className="category-list">
                  {categories.map(cat => (
                    <li
                      key={cat}
                      className={selectedCategory === cat ? "active" : ""}
                      onClick={() => { setSelectedCategory(cat); setShowMobileFilter(false); }}
                    >
                      {cat}
                    </li>
                  ))}
                </ul>
             </div>

             <div className="sidebar-section">
                <h4 className="sidebar-title">Price Range</h4>
                <div className="price-filter-wrap">
                  <input
                    type="range"
                    min="500"
                    max={Math.max(...products.map(p => Number(p.price) || 0), 10000)}
                    step="500"
                    value={maxPrice}
                    onChange={(e) => setMaxPrice(Number(e.target.value))}
                    className="price-range-slider"
                  />
                  <div className="price-labels">
                    <span>₹500</span>
                    <span>₹{maxPrice}+</span>
                  </div>
                </div>
             </div>

             <div className="sidebar-section">
                <h4 className="sidebar-title">Colors</h4>
                <div className="color-grid">
                  {availableColors.length > 0 ? (
                    availableColors.map(color => (
                      <div
                        key={color}
                        className={`color-pill ${selectedColors.includes(color) ? "active" : ""}`}
                        onClick={() => { toggleColor(color); setShowMobileFilter(false); }}
                        title={color}
                      >
                        <span 
                          className="color-dot" 
                          style={{ 
                            backgroundColor: color === 'multi' || color === 'multicolor' 
                              ? 'linear-gradient(45deg, red, yellow, green, blue)' 
                              : color 
                          }}
                        ></span>
                        <span className="color-name">{color}</span>
                      </div>
                    ))
                  ) : (
                    <p className="no-colors">No color filters available</p>
                  )}
                </div>
             </div>

             <button className="reset-btn" onClick={() => {
               setSelectedCategory("All Products");
               setMaxPrice(Math.max(...products.map(p => Number(p.price) || 0), 10000));
               setSelectedColors([]);
               setShowMobileFilter(false);
             }}>
               Reset All
             </button>
          </div>

          <div className="col-lg-9 content-area">
            
            {/* ================= 3. TOP BAR (STATS & SORT) ================= */}
            <div className="products-top-bar">
              <div className="results-count">
                Showing <span>{finalProducts.length}</span> results
              </div>
              
              <div className="sort-filter-actions">
                <button className="mobile-filter-trigger d-lg-none" onClick={() => setShowMobileFilter(true)}>
                  <i className="bi bi-filter-left"></i> Filters
                </button>

                <div className="sort-wrapper">
                  <label htmlFor="sort-select">Sort by:</label>
                  <select id="sort-select" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                    <option value="newest">Newest First</option>
                    <option value="price-low">Price: Low to High</option>
                    <option value="price-high">Price: High to Low</option>
                  </select>
                </div>
              </div>
            </div>

            {/* ================= 4. PRODUCT GRID ================= */}
            {loading ? (
              <Loader fullPage={false} />
            ) : (
              <div className="row g-4 product-grid-row">
                {finalProducts.length > 0 ? (
                   finalProducts.map(product => (
                    <div key={product.id} className="col-6 col-md-4 col-lg-3">
                       <ProductCard
                        product={product}
                        onQuickView={setSelectedProduct}
                        featured={true}
                      />
                    </div>
                  ))
                ) : (
                  <div className="col-12 empty-state">
                    <i className="bi bi-search no-results-icon"></i>
                    <h3>No products found</h3>
                    <p>Try adjusting your filters or category choice.</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <QuickViewModal
        selectedProduct={selectedProduct}
        setSelectedProduct={setSelectedProduct}
      />
    </div>
  );
};

export default AllProducts;

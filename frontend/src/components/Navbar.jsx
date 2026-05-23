import React, { useState, useEffect } from "react";
import { useCart } from "../context/CartContext";
import { useWishlist } from "../context/WishlistContext";
import CartDrawer from "./CartDrawer";
import { useNavigate, useLocation } from "react-router-dom";
import { getCategories } from "../data/products";
import { useUser } from "../context/UserContext";
import axios from "axios";

const API_URL = process.env.REACT_APP_API_URL;

// Helper to build full image URL
const getImageUrl = (imagePath) => {
  if (!imagePath) return null;
  if (imagePath.startsWith("http")) return imagePath;
  let baseUrl = API_URL.replace(/\/api\/?$/, "");
  if (baseUrl.endsWith("/")) baseUrl = baseUrl.slice(0, -1);
  const cleanPath = imagePath.startsWith("/") ? imagePath : `/${imagePath}`;
  return `${baseUrl}${cleanPath}`;
};

import "./Navbar.css";

const Navbar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { cartItems, clearCart, isCartOpen, setIsCartOpen } = useCart();
  const { wishlistItems, fetchWishlist } = useWishlist();

  const [menuOpen, setMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [categories, setCategories] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [suggestions, setSuggestions] = useState([]); // kept for any fallback
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showMobileSearch, setShowMobileSearch] = useState(false);
  const { user, setShowLogin } = useUser();
  const token = localStorage.getItem("token");

  const [coupons, setCoupons] = useState([]);
  const [currentCouponIndex, setCurrentCouponIndex] = useState(0);
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);

  const [showNav, setShowNav] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  // Scroll handler
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      if (currentScrollY > lastScrollY && currentScrollY > 100) {
        setShowNav(false);
      } else {
        setShowNav(true);
      }
      setLastScrollY(currentScrollY);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [lastScrollY]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    clearCart();
    fetchWishlist();
    setProfileOpen(false);
    setTimeout(() => {
      setShowLogin(true);
    }, 1000);
  };

  // Fetch categories
  // Update the Navbar component to fetch categories from the new endpoint

  // Replace the existing useEffect that fetches categories with this:

  useEffect(() => {
    const fetchNavbarCategories = async () => {
      try {
        const response = await axios.get(`${API_URL}/navbar/categories`);
        if (response.data.success) {
          setCategories(response.data.categories);
        } else {
          // Fallback to regular categories if navbar endpoint fails
          const data = await getCategories();
          setCategories(data || []);
        }
      } catch (error) {
        console.error("Error fetching navbar categories:", error);
        // Fallback to regular categories
        const data = await getCategories();
        setCategories(data || []);
      }
    };
    fetchNavbarCategories();
  }, []);

  // Fetch coupons
  useEffect(() => {
    const fetchCoupons = async () => {
      try {
        const res = await axios.get(`${API_URL}/coupons`);
        setCoupons(res.data.coupons || []);
      } catch (err) {
        console.error("Coupon fetch error:", err);
      }
    };
    fetchCoupons();
  }, []);

  // Animate coupons
  useEffect(() => {
    if (coupons.length > 1) {
      const interval = setInterval(() => {
        setCurrentCouponIndex((prev) => (prev + 1) % coupons.length);
      }, 3500);
      return () => clearInterval(interval);
    }
  }, [coupons]);

  // Product search with debounce
  useEffect(() => {
    const delayDebounce = setTimeout(async () => {
      if (searchTerm.trim().length >= 2) {
        setSearchLoading(true);
        try {
          const res = await axios.get(`${API_URL}/products/search?q=${encodeURIComponent(searchTerm)}`);
          if (res.data.success) {
            setSearchResults(res.data.products);
            setShowSuggestions(true);
          } else {
            setSearchResults([]);
          }
        } catch (err) {
          console.error("Search error:", err);
          setSearchResults([]);
        } finally {
          setSearchLoading(false);
        }
      } else {
        setSearchResults([]);
        setShowSuggestions(false);
      }
    }, 300);

    return () => clearTimeout(delayDebounce);
  }, [searchTerm]);

  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchTerm(value);
    if (value.trim().length === 0) {
      setShowSuggestions(false);
      setSearchResults([]);
    }
  };

  const handleSearchSelect = (product) => {
    setSearchTerm("");
    setShowSuggestions(false);
    setMenuOpen(false);
    setShowMobileSearch(false);
    if (product.uuid) {
      navigate(`/product/${product.uuid}`);
    } else if (product.product_code) {
      navigate(`/product/${product.uuid}?product_code=${product.product_code}`);
    }
  };

  const handleSearchSubmit = (e) => {
    if (e.key === 'Enter' && searchTerm.trim() !== '') {
      setShowSuggestions(false);
      navigate(`/all-products?search=${encodeURIComponent(searchTerm.trim())}`);
    }
  };

  // Typing animation for placeholder
  const typingTexts = [
    "Search silk sarees...",
    "Search wedding sarees...",
    "Search cotton sarees...",
    "Search designer sarees..."
  ];
  const [placeholder, setPlaceholder] = useState("");
  const [textIndex, setTextIndex] = useState(0);
  const [charIndex, setCharIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const currentText = typingTexts[textIndex];
    let typingSpeed = isDeleting ? 50 : 100;
    const timeout = setTimeout(() => {
      if (!isDeleting) {
        setPlaceholder(currentText.substring(0, charIndex + 1));
        setCharIndex(charIndex + 1);
        if (charIndex + 1 === currentText.length) {
          setTimeout(() => setIsDeleting(true), 1200);
        }
      } else {
        setPlaceholder(currentText.substring(0, charIndex - 1));
        setCharIndex(charIndex - 1);
        if (charIndex === 0) {
          setIsDeleting(false);
          setTextIndex((prev) => (prev + 1) % typingTexts.length);
        }
      }
    }, typingSpeed);
    return () => clearTimeout(timeout);
  }, [charIndex, isDeleting, textIndex]);

  const handleProfileClick = () => {
    if (!token) {
      setShowLogin(true);
      return;
    }
    setProfileOpen(!profileOpen);
  };

  const isActiveCategory = (categoryName) => {
    const searchParams = new URLSearchParams(location.search);
    return searchParams.get("category") === categoryName;
  };

  useEffect(() => {
    if (showMobileSearch || menuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
  }, [showMobileSearch, menuOpen]);

  return (
    <>
      <nav className={`custom-navbar ${showNav ? "nav-visible" : "nav-hidden"}`}>
        {/* TOP BAR (unchanged) */}
        <div className="navbar-top-announcement">
          <div className="social-icons">
            <a href="https://wa.me/8328590444" target="_blank" rel="noopener noreferrer" style={{ color: 'inherit', textDecoration: 'none' }}><i className="bi bi-whatsapp"></i></a>
            <a href="tel:+918328590444" style={{ color: 'inherit', textDecoration: 'none' }}><i className="bi bi-telephone"></i></a>
            <a href="https://www.instagram.com/jayastra?igsh=b293OXJ0aXh6Y24=" target="_blank" rel="noopener noreferrer" style={{ color: 'inherit', textDecoration: 'none' }}><i className="bi bi-instagram"></i></a>
          </div>
          <div className="announcement-text-wrapper">
            {coupons.length > 0 ? (
              <div key={currentCouponIndex} className="announcement-text premium-slide">
                Get {coupons[currentCouponIndex].discount_value}
                {coupons[currentCouponIndex].discount_type === "percentage" ? "%" : "₹"} off on ₹{coupons[currentCouponIndex].min_order_amount}+
              </div>
            ) : (
              <div className="announcement-text">Welcome to our premium store</div>
            )}
          </div>
          <div className="store-locator-text">
            <a href="https://maps.google.com/?q=165/1,+Priya+Swaroop,+11th+cross,+beside+RAINEO+STUDIO,+Modi+Hospital+Rd,+Model+LIC+Colony,+Basaveshwar+Nagar,+Bengaluru,+Karnataka+560079" target="_blank" rel="noopener noreferrer" style={{ color: 'inherit', textDecoration: 'none' }}>
              <i className="bi bi-geo-alt"></i> Location
            </a>
          </div>
        </div>

        {/* MAIN BODY */}
        <div className="navbar-main-content">
          <div className="navbar-middle">
            {/* Left: Mobile Toggle & Desktop Search */}
            <div className="nav-middle-left">
              <div className="mobile-toggle" onClick={() => setMenuOpen(!menuOpen)}>
                <i className="bi bi-list"></i>
              </div>

              {/* DESKTOP SEARCH */}
              <div className="desktop-search-container">
                <div className="desktop-search-inline">
                  <i className="bi bi-search"></i>
                  <input
                    type="text"
                    placeholder={placeholder}
                    value={searchTerm}
                    onChange={handleSearchChange}
                    onKeyDown={handleSearchSubmit}
                    onFocus={() => searchTerm.length > 0 && setShowSuggestions(true)}
                    onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                  />
                </div>

                {showSuggestions && (
                  <div className="search-results-dropdown search-results-wide">
                    {searchLoading ? (
                      <div className="search-loading">Searching...</div>
                    ) : searchResults.length > 0 ? (
                      searchResults.map((product) => (
                        <div
                          key={product.id}
                          className="search-result-item product-item"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            handleSearchSelect(product);
                          }}
                        >
                          <img
                            src={getImageUrl(product.main_image_url) || "/assets/no-image.png"}
                            alt={product.name}
                            className="search-product-img"
                          />
                          <div className="search-product-info">
                            <div className="search-product-name">{product.name}</div>
                            <div className="search-product-code">Code: {product.product_code}</div>
                            <div className="search-product-price">₹{product.price}</div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="no-search-results">No products found</div>
                    )}
                  </div>
                )}
              </div>

              <div className="mobile-search-icon" onClick={() => setShowMobileSearch(!showMobileSearch)}>
                <i className="bi bi-search"></i>
              </div>
            </div>

            {/* Logo */}
            <div className="logo-box" onClick={() => navigate("/")}>
              <img src="/assets/jayastra_banner.png" alt="Logo" className="jayastra-banner-nav" />
            </div>

            {/* Right Icons */}
            <div className="nav-middle-right">
              <div className="nav-icons-right">
                <div className="icon-box" onClick={() => {
                  if (!token) { setShowLogin(true); return; }
                  navigate("/wishlist");
                }}>
                  <i className="bi bi-heart"></i>
                  {wishlistItems.length > 0 && <span className="badge-icon">{wishlistItems.length}</span>}
                </div>

                <div className="icon-box cart-icon-box" onClick={() => {
                  if (!token) { setShowLogin(true); return; }
                  setIsCartOpen(true);
                }}>
                  <div className="bag-icon-wrapper">
                    <i className="bi bi-bag"></i>
                    {cartItems.length > 0 && <span className="bag-badge">{cartItems.length}</span>}
                  </div>
                </div>

                <div className="icon-box profile-box" onClick={handleProfileClick}>
                  {token && user ? (
                    <div className="user-initials">
                      {user.first_name?.[0]?.toUpperCase() || user.name?.[0]?.toUpperCase() || "U"}
                    </div>
                  ) : (
                    <i className="bi bi-person"></i>
                  )}
                  {profileOpen && token && (
                    <div className="profile-dropdown">
                      <div className="dropdown-user-info">
                        <strong>Hi, {user?.first_name || user?.name || "User"}{user?.last_name && ` ${user.last_name}`}</strong>
                        <p>{user?.phone}</p>
                      </div>
                      <div onClick={() => navigate("/profile")} className="dropdown-item">
                        <i className="bi bi-person-circle"></i> Profile
                      </div>
                      <div onClick={handleLogout} className="dropdown-item logout">
                        <i className="bi bi-box-arrow-right"></i> Logout
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Categories */}
          <div className="navbar-bottom-menu">
            <div className="bottom-menu-links">
              <span className={`nav-link-item ${location.pathname === "/" ? "active" : ""}`} onClick={() => navigate("/")}>Home</span>
              {categories.map((cat) => (
                <span key={cat.id} className={`nav-link-item has-dropdown ${isActiveCategory(cat.name) ? "active" : ""}`} onClick={() => navigate(`/all-products?category=${encodeURIComponent(cat.name)}`)}>
                  {cat.name}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* MOBILE SEARCH (overlay) */}
        {showMobileSearch && (
          <div className="mobile-search-wrapper">
            <div className="search-overlay" onClick={() => setShowMobileSearch(false)}></div>
            <div className="mobile-search-bar">
              <div className="mobile-search-input-wrapper">
                <i className="bi bi-search search-icon-inside"></i>
                <input
                  type="text"
                  placeholder="Search products..."
                  value={searchTerm}
                  onChange={handleSearchChange}
                  onKeyDown={handleSearchSubmit}
                  autoFocus
                />
                <i className="bi bi-x-lg close-search-mobile" onClick={() => setShowMobileSearch(false)}></i>
              </div>

              {/* Mobile search results (product-based) */}
              {searchTerm && searchResults.length > 0 && (
                <div className="search-results-dropdown mobile-search-dropdown search-results-wide">
                  {searchResults.map((product) => (
                    <div
                      key={product.id}
                      className="search-result-item product-item"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        handleSearchSelect(product);
                      }}
                    >
                      <img
                        src={getImageUrl(product.main_image_url) || "/assets/no-image.png"}
                        alt={product.name}
                        className="search-product-img"
                      />
                      <div className="search-product-info">
                        <div className="search-product-name">{product.name}</div>
                        <div className="search-product-code">Code: {product.product_code}</div>
                        <div className="search-product-price">₹{product.price}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {searchTerm && searchResults.length === 0 && !searchLoading && (
                <div className="no-search-results">No products found</div>
              )}
            </div>
          </div>
        )}

        {/* MOBILE MENU */}
        <div className={`mobile-menu ${menuOpen ? "open" : ""}`}>
          <div className="mobile-menu-header">
            <span className="mobile-menu-title">Menu</span>
            <i className="bi bi-x-lg close-menu" onClick={() => setMenuOpen(false)}></i>
          </div>
          <div className="mobile-menu-links">
            <span onClick={() => { navigate("/"); setMenuOpen(false); }}>Home</span>
            {categories.map(cat => (
              <span key={cat.id} onClick={() => { navigate(`/all-products?category=${encodeURIComponent(cat.name)}`); setMenuOpen(false); }}>
                {cat.name}
              </span>
            ))}
          </div>
        </div>
      </nav>

      <div className="navbar-spacer"></div>
      <CartDrawer isOpen={isCartOpen} setIsOpen={setIsCartOpen} />
    </>
  );
};

export default Navbar;
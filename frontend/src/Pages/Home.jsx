import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { motion, AnimatePresence } from "framer-motion";
import "./Home.css";
import akshayaBanner from "../assets/akshayaT.jpeg";

const API_URL = process.env.REACT_APP_API_URL;

import ExploreCollection from "../components/ExploreCollection";
import ProductCard from "../components/ProductCard";
import QuickViewModal from "../components/QuickViewModal";

import { getProducts } from "../data/products";
import Loader from "../components/Loader";
import "../components/Loader.css";

// Loading skeleton for New Arrivals
const NewArrivalsSkeleton = () => {
  const [itemsPerSlide, setItemsPerSlide] = useState(3);
  
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 640) setItemsPerSlide(2);
      else if (window.innerWidth < 1024) setItemsPerSlide(3);
      else setItemsPerSlide(3);
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <section className="new-arrivals-section">
      <div className="arrival-marquee">
        <div className="marquee-track">
          {[1, 2].map((key) => (
            <div key={key} className="marquee-content">
              <span><i className="bi bi-truck"></i> Free Shipping Across India</span>
              <span><i className="bi bi-patch-check"></i> 100% Authentic Handloom</span>
              <span><i className="bi bi-shield-lock"></i> Secure Payments</span>
              <span><i className="bi bi-arrow-repeat"></i> Easy Returns</span>
              <span><i className="bi bi-gem"></i> Premium Quality Sarees</span>
              <span><i className="bi bi-heart"></i> Loved by 10,000+ Customers</span>
            </div>
          ))}
        </div>
      </div>

      <div className="container">
        <div className="section-header">
          <div className="skeleton-title-short"></div>
          <div className="skeleton-subtitle-short"></div>
        </div>

        <div className="arrival-carousel">
          <div className="arrival-viewport">
            <div className="arrival-track-skeleton">
              {[...Array(itemsPerSlide)].map((_, index) => (
                <div key={index} className="arrival-item-skeleton" style={{ flex: `0 0 ${100 / itemsPerSlide}%` }}>
                  <div className="product-card-skeleton">
                    <div className="skeleton-product-image"></div>
                    <div className="skeleton-product-info">
                      <div className="skeleton-text-line"></div>
                      <div className="skeleton-text-line short"></div>
                      <div className="skeleton-price"></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

// Loading skeleton for Shop Products
const ShopProductsSkeleton = () => {
  return (
    <section className="py-5 shop-section">
      <div className="container-fluid shop-container">
        <div className="text-center mb-5">
          <div className="skeleton-title-shop"></div>
        </div>

        <div className="row g-3">
          {[...Array(8)].map((_, index) => (
            <div key={index} className="col-6 col-md-4 col-lg-3">
              <div className="product-card-skeleton">
                <div className="skeleton-product-image"></div>
                <div className="skeleton-product-info">
                  <div className="skeleton-text-line"></div>
                  <div className="skeleton-text-line short"></div>
                  <div className="skeleton-price"></div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="text-center mt-5">
          <div className="skeleton-button"></div>
        </div>
      </div>
    </section>
  );
};

// Loading skeleton for Mosaic Banners
const MosaicBannersSkeleton = () => {
  return (
    <section className="wedding-3d-slider-section">
      <div className="container">
        <div className="text-center mb-5">
          <div className="skeleton-badge"></div>
          <div className="skeleton-title-mosaic"></div>
        </div>
      </div>
      <div className="slider-3d-container">
        <div className="slider-3d-inner" style={{ display: 'flex', gap: '20px', justifyContent: 'center' }}>
          <div className="slider-3d-card side skeleton-video" style={{ opacity: 0.5, scale: 0.8 }}></div>
          <div className="slider-3d-card center skeleton-video" style={{ scale: 1.1 }}></div>
          <div className="slider-3d-card side skeleton-video" style={{ opacity: 0.5, scale: 0.8 }}></div>
        </div>
      </div>
    </section>
  );
};

/* ================= NEW ARRIVALS COMPONENT ================= */
const NewArrivals = React.memo(({ newArrivals = [], onQuickView, loading }) => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [itemsPerSlide, setItemsPerSlide] = useState(3);
  const viewportRef = useRef(null);

  useEffect(() => {
    const handleResize = () => {
      // Show exactly 2 items on mobile, 3 on desktop
      if (window.innerWidth <= 768) setItemsPerSlide(2); 
      else setItemsPerSlide(3);
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Update currentSlide based on scroll position for dots
  const handleScroll = (e) => {
    const viewport = e.target;
    const scrollLeft = viewport.scrollLeft;
    const itemWidth = viewport.offsetWidth / itemsPerSlide;
    const newIndex = Math.round(scrollLeft / itemWidth);
    if (newIndex !== currentSlide) {
      setCurrentSlide(newIndex);
    }
  };

  const scrollToSlide = (index) => {
    if (viewportRef.current) {
      const itemWidth = viewportRef.current.offsetWidth / itemsPerSlide;
      viewportRef.current.scrollTo({
        left: index * itemWidth,
        behavior: "smooth"
      });
    }
  };

  const totalSlides = Math.max(0, newArrivals.length - itemsPerSlide + 1);

  return (
    <section className="new-arrivals-section">
      <div className="arrival-marquee">
        <div className="marquee-track">
          {[1, 2].map((key) => (
            <div key={key} className="marquee-content">
              <span><i className="bi bi-truck"></i> Free Shipping Across India</span>
              <span><i className="bi bi-patch-check"></i> 100% Authentic Handloom</span>
              <span><i className="bi bi-shield-lock"></i> Secure Payments</span>
              <span><i className="bi bi-arrow-repeat"></i> Easy Returns</span>
              <span><i className="bi bi-gem"></i> Premium Quality Sarees</span>
              <span><i className="bi bi-heart"></i> Loved by 10,000+ Customers</span>
            </div>
          ))}
        </div>
      </div>

      <div className="container">
        <div className="section-header">
          <h2 className="section-title">New Arrivals</h2>
          <p className="section-subtitle">
            Discover the latest additions to our exclusive boutique collection.
          </p>
        </div>

        <div className="arrival-carousel">
          <button
            className="nav-btn left"
            onClick={() => scrollToSlide(currentSlide - 1)}
            disabled={currentSlide === 0}
          >
            <i className="bi bi-chevron-left"></i>
          </button>

          <div 
            className="arrival-viewport"
            ref={viewportRef}
            onScroll={handleScroll}
          >
            <div className="arrival-track">
              {newArrivals.map((product) => (
                <div
                  key={product.id}
                  className="arrival-item"
                >
                  <ProductCard
                    product={product}
                    onQuickView={onQuickView}
                    showAddToCart={false}
                    compact={true}
                    showStockBadge={false}
                  />
                </div>
              ))}
            </div>
          </div>

          <button
            className="nav-btn right"
            onClick={() => scrollToSlide(currentSlide + 1)}
            disabled={currentSlide >= totalSlides - 1}
          >
            <i className="bi bi-chevron-right"></i>
          </button>
        </div>

        {totalSlides > 1 && (
          <div className="arrival-indicators">
            {Array.from({ length: Math.min(newArrivals.length, 10) }).map((_, index) => {
               // Limit dots for many products, or just show for available logical slides
               if (index >= newArrivals.length - itemsPerSlide + 1) return null;
               return (
                <span
                  key={index}
                  className={index === currentSlide ? "active" : ""}
                  onClick={() => scrollToSlide(index)}
                ></span>
               );
            })}
          </div>
        )}
      </div>
    </section>
  );
});

/* ================= SHOP BY PRICE COMPONENT ================= */
const ShopByPrice = React.memo(() => {
  const navigate = useNavigate();
  
  const priceCategories = [
    { label: "Under", price: "499", min: 0, max: 499 },
    { label: "Under", price: "999", min: 0, max: 999 },
    { label: "Under", price: "2999", min: 0, max: 2999 },
    { label: "above", price: "2999", min: 3000, max: 100000 },
  ];

  return (
    <section className="shop-by-price-section">
      <div className="container">
        <h2 className="section-title text-center mb-5" style={{color: 'var(--saree-maroon)'}}>Shop By Price</h2>
        
        <div className="price-cards-container">
          {priceCategories.map((cat, index) => (
            <div 
              key={index} 
              className="price-card-wrapper"
              onClick={() => navigate(`/all-products?minPrice=${cat.min}&maxPrice=${cat.max}`)}
            >
              <div className="price-card">
                <div className="price-card-label">{cat.label}</div>
                <div className="price-card-value">₹{cat.price}</div>
                <div className="price-card-arrow"><i className="bi bi-chevron-right"></i></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
});

/* ================= HOME COMPONENT ================= */
const Home = () => {
  const navigate = useNavigate();

  const [scale, setScale] = useState(1);
  const [selectedProduct, setSelectedProduct] = useState(null);

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newArrivalsLoading, setNewArrivalsLoading] = useState(true);
  const [shopProductsLoading, setShopProductsLoading] = useState(true);
  const [mosaicLoading, setMosaicLoading] = useState(true);

  const scrollRef = useRef(null);

  /* ================= LOAD PRODUCTS ================= */
  useEffect(() => {
    const loadProducts = async () => {
      try {
        setNewArrivalsLoading(true);
        setShopProductsLoading(true);
        
        const data = await getProducts();

        let productsArray = [];
        if (Array.isArray(data)) {
          productsArray = data;
          setProducts(data);
        } else if (data?.products) {
          productsArray = data.products;
          setProducts(data.products);
        } else {
          productsArray = [];
          setProducts([]);
        }
      } catch (err) {
        console.error("Product load error:", err);
        setProducts([]);
      } finally {
        setNewArrivalsLoading(false);
        setShopProductsLoading(false);
        setLoading(false);
      }
    };

    loadProducts();
  }, []);

  /* ================= HERO SCROLL ================= */
  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY;
      const newScale = Math.max(0.85, 1 - scrollY / 600);
      setScale(newScale);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const images = [akshayaBanner, "/assets/hero28.jpeg"];

  const [currentSlide, setCurrentSlide] = useState(0);

  const prevHeroSlide = (e) => {
    e.stopPropagation();
    setCurrentSlide((prev) => (prev > 0 ? prev - 1 : images.length - 1));
  };

  const nextHeroSlide = (e) => {
    e.stopPropagation();
    setCurrentSlide((prev) => (prev + 1) % images.length);
  };

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % images.length);
    }, 5000);

    return () => clearInterval(interval);
  }, [images.length]);

  /* ================= SHOP ================= */
  const shopProducts = (products || []).slice(0, 16);

  /* ================= BANNERS (DYNAMIC MOSAIC) ================= */
  const [mosaicBanners, setMosaicBanners] = useState([]);

  useEffect(() => {
    const fetchBanners = async () => {
      try {
        setMosaicLoading(true);
        const res = await axios.get(`${API_URL}/banners`);
        const mosaic = (res.data.banners || [])
          .filter(b => b.type === 'mosaic' && b.is_active)
          .sort((a, b) => Number(a.position) - Number(b.position));
        setMosaicBanners(mosaic);
      } catch (err) {
        console.error("Banner fetch error:", err);
      } finally {
        setMosaicLoading(false);
      }
    };
    fetchBanners();
  }, []);

  /* ================= DRAG ================= */
  const handleMouseDown = (e) => {
    const slider = scrollRef.current;
    if(!slider) return;
    slider.isDown = true;
    slider.startX = e.pageX - slider.offsetLeft;
    slider.scrollLeftStart = slider.scrollLeft;
  };

  const handleMouseLeave = () => {
    if (scrollRef.current) scrollRef.current.isDown = false;
  };

  const handleMouseUp = () => {
    if (scrollRef.current) scrollRef.current.isDown = false;
  };

  const handleMouseMove = (e) => {
    const slider = scrollRef.current;
    if (!slider || !slider.isDown) return;

    e.preventDefault();
    const x = e.pageX - slider.offsetLeft;
    const walk = (x - slider.startX) * 1.5;
    slider.scrollLeft = slider.scrollLeftStart - walk;
  };

  if (loading) return <Loader />;

  return (
    <>
      <section className="hero-section">
        <div className="hero-carousel">
          {images.map((img, index) => {
            const heroTexts = [
              { 
                smallTop: "GRAND LAUNCH SALE",
                title: "NEW BEGINNINGS",
                subtitle: "FLAT 15% OFF ON ALL SAREES",
                desc: "CELEBRATE OUR GRAND LAUNCH WITH EXCLUSIVE HANDLOOM COLLECTION"
              },
              { 
                smallTop: "LAUNCH OFFERS",
                title: "LUXURY SILKS",
                subtitle: "TRADITION FOR GENERATIONS",
                desc: "RARE WEAVES, FRESH DESIGNS, AND EXCLUSIVES YOU SIMPLY WON'T FIND ANYWHERE ELSE",
                align: "right"
              },
            ];

            return (
              <div
                key={index}
                className={`hero-slide ${
                  index === currentSlide ? "active" : ""
                }`}
                onClick={() => {
                   if(window.innerWidth <= 768) navigate("/all-products");
                }}
                style={{ cursor: "pointer" }}
              >
                <div className="hero-img-container">
                  <img src={img} className="hero-img" alt="Luxury Saree Collection" />
                </div>
                <div className="hero-overlay"></div>

                <div className={`hero-content ${heroTexts[index].align === 'right' ? 'align-right' : ''}`}>
                  <span className="hero-tagline">{heroTexts[index].smallTop}</span>
                  <h1
                    className="hero-title"
                    style={{ transform: `scale(${scale})` }}
                  >
                    {heroTexts[index].title}
                  </h1>
                  <h3 className="hero-subtitle">{heroTexts[index].subtitle}</h3>
                  <p className="hero-description">
                    {heroTexts[index].desc}
                  </p>
                  <div className="hero-buttons">
                    <button className="btn-hero-primary" onClick={() => navigate("/all-products")}>
                      Shop Collection
                      <span className="btn-icon"><i className="bi bi-arrow-right"></i></span>
                    </button>
                    <button className="btn-hero-secondary" onClick={() => navigate("/about")}>
                      Our Story
                    </button>
                  </div>
                </div>
              </div>
            );
          })}

          <button className="hero-nav-arrow left" onClick={prevHeroSlide}>
            <i className="bi bi-arrow-left"></i>
          </button>
          
          <button className="hero-nav-arrow right" onClick={nextHeroSlide}>
            <i className="bi bi-arrow-right"></i>
          </button>

          <div className="hero-number-indicators">
            {images.map((_, index) => (
              <span
                key={index}
                className={`number-item ${index === currentSlide ? "active" : ""}`}
                onClick={(e) => { e.stopPropagation(); setCurrentSlide(index); }}
              >
                *
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* NEW ARRIVALS */}
      <NewArrivals 
        newArrivals={products} 
        onQuickView={setSelectedProduct} 
        loading={newArrivalsLoading}
      />

      {/* SHOP BY PRICE */}
      {/* <ShopByPrice /> */}
      
      {/* EXPLORE */}
      <ExploreCollection />

      {/* SHOP */}
      {shopProductsLoading ? (
        <ShopProductsSkeleton />
      ) : (
        <section className="py-5 shop-section">
          <div className="container-fluid shop-container">
            <div className="text-center mb-5">
              <h2 className="shop-heading">Shop Now</h2>
            </div>

            <div className="row g-3">
              {shopProducts.map((product) => (
                <div key={product.id} className="col-6 col-md-4 col-lg-3">
                  <ProductCard
                    product={product}
                    onQuickView={setSelectedProduct}
                    featured={true}
                  />
                </div>
              ))}
            </div>

            <div className="text-center mt-5">
              <button
                className="view-all-btn"
                onClick={() => navigate("/all-products")}
              >
                View All Products
              </button>
            </div>
          </div>
        </section>
      )}

      {/* QUICK VIEW */}
      <QuickViewModal
        selectedProduct={selectedProduct}
        setSelectedProduct={setSelectedProduct}
      />

      {/* GRAND LAUNCH SALE BANNER */}
      <section className="full-banner-section festive-banner">
        <div className="banner-overlay-gradient"></div>
        <div className="container-fluid banner-container-fluid">
          <div className="banner-content">
            <h1 className="banner-heading festive-text">Grand Launch Sale</h1>
            <p className="banner-price-tag">Launch Offer: <span>Flat 15% OFF</span></p>
            <button 
              className="btn-shop-now"
              onClick={() => navigate("/all-products")}
            >
              SHOP NOW
            </button>
          </div>
        </div>
      </section>

      {/* 3D WEDDING COLLECTION SLIDER */}
      {mosaicLoading ? (
        <MosaicBannersSkeleton />
      ) : (
        mosaicBanners.length > 0 && <WeddingVideoSlider banners={mosaicBanners} />
      )}
    </>
  );
};

const WeddingVideoSlider = ({ banners }) => {
  const [index, setIndex] = useState(0);
  const navigate = useNavigate();

  // Helper function to get full video URL
  const getFullVideoUrl = (videoUrl) => {
    if (!videoUrl) return "";
    if (videoUrl.startsWith("http")) return videoUrl;
    // Remove /api from API_URL if present and add the videoUrl
    const baseUrl = API_URL.replace(/\/api$/, "");
    return `${baseUrl}${videoUrl}`;
  };

  const handleNext = () => setIndex((prev) => (prev + 1) % banners.length);
  const handlePrev = () => setIndex((prev) => (prev - 1 + banners.length) % banners.length);

  return (
    <section className="wedding-3d-slider-section">
      <div className="container">
        <div className="text-center mb-1">
          <span className="video-header-badge">Our Legacy In Motion</span>
          <h2 className="shop-heading">The Wedding Collection</h2>
        </div>
      </div>

      <div className="slider-3d-container">
        <div className="slider-3d-inner">
          <AnimatePresence initial={false}>
            {[-1, 0, 1].map((offset) => {
              const itemIndex = (index + offset + banners.length) % banners.length;
              const item = banners[itemIndex];
              
              const isCenter = offset === 0;
              const isLeft = offset === -1;
              const isRight = offset === 1;

              // Get the correct video URL
              const videoUrl = getFullVideoUrl(item.video_url);

              return (
                <motion.div
                  key={`${item.id}-${offset}`}
                  className={`slider-3d-card ${isCenter ? 'center' : ''}`}
                  initial={{ opacity: 0, scale: 0.8, x: offset * 300, rotateY: offset * 45, zIndex: 1 }}
                  animate={{ 
                    opacity: isCenter ? 1 : 0.6, 
                    scale: isCenter ? 1.15 : 0.85, 
                    x: offset * (window.innerWidth < 768 ? 95 : 450), 
                    y: isCenter ? -10 : 15,
                    rotateY: offset * -25, 
                    zIndex: isCenter ? 20 : 10,
                    filter: isCenter ? "blur(0px) brightness(1.15)" : "blur(3px) brightness(0.6)"
                  }}
                  transition={{ duration: 0.6, ease: "circOut" }}
                  onClick={() => isCenter ? navigate(item.link || "/all-products") : (isLeft ? handlePrev() : handleNext())}
                  drag="x"
                  dragConstraints={{ left: 0, right: 0 }}
                  onDragEnd={(e, { offset, velocity }) => {
                    if (offset.x > 50) handlePrev();
                    else if (offset.x < -50) handleNext();
                  }}
                  style={{
                    position: "absolute",
                    left: "50%",
                    marginLeft: window.innerWidth < 768 ? "-100px" : "-200px"
                  }}
                >
                  {videoUrl && (
                    <video 
                      src={videoUrl}
                      muted 
                      autoPlay 
                      loop 
                      playsInline 
                      preload="auto"
                    />
                  )}
                  {isCenter && (
                    <div className="card-3d-overlay">
                      <button className="btn-shop-3d">View Collection</button>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </div>

      <div className="slider-controls">
        <button className="ctrl-btn prev" onClick={handlePrev}><i className="bi bi-arrow-left-short"></i></button>
        <div className="slider-dots">
          {banners.map((_, i) => (
            <span key={i} className={`dot ${i === index ? 'active' : ''}`} onClick={() => setIndex(i)}></span>
          ))}
        </div>
        <button className="ctrl-btn next" onClick={handleNext}><i className="bi bi-arrow-right-short"></i></button>
      </div>
    </section>
  );
};

export default Home;
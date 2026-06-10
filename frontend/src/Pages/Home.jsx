import React, { useEffect, useState, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { motion, AnimatePresence } from "framer-motion";
import "./Home.css";
import banner_2 from "../assets/banner_2.png";
import banner_1 from "../assets/banner_1.png";
import CategoriesScroll from "../components/CategoriesScroll/CategoriesScroll";
import ServiceFeatures from "../components/ServiceFeatures/ServiceFeatures";
import WorkWithUsMarquee from "../components/WorkWithUsMarquee/WorkWithUsMarquee";



const API_URL = process.env.REACT_APP_API_URL;

import ExploreCollection from "../components/ExploreCollection";
import ProductCard from "../components/ProductCard";
import QuickViewModal from "../components/QuickViewModal";

import { getProducts } from "../data/products";
import { shuffleArray } from "../utils/shuffle";
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

// Loading skeleton for Shop Products (limited to 2 rows = 8 items)
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
        <h2 className="section-title text-center mb-5" style={{ color: 'var(--saree-maroon)' }}>Shop By Price</h2>

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

  const [heroBanners, setHeroBanners] = useState([]);
  const [mosaicBanners, setMosaicBanners] = useState([]);
  const [currentSlide, setCurrentSlide] = useState(0);

  // Helper function to get full media URL
  const getFullMediaUrl = (mediaUrl) => {
    if (!mediaUrl) return "";
    if (mediaUrl.startsWith("http")) return mediaUrl;
    const baseUrl = API_URL.replace(/\/api$/, "");
    return `${baseUrl}${mediaUrl}`;
  };

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

  /* ================= BANNERS (DYNAMIC HERO & MOSAIC) ================= */
  useEffect(() => {
    const fetchBanners = async () => {
      try {
        setMosaicLoading(true);
        const res = await axios.get(`${API_URL}/banners`);
        const allBanners = res.data.banners || [];

        const mosaic = allBanners
          .filter(b => b.type === 'mosaic' && b.is_active)
          .sort((a, b) => Number(a.position) - Number(b.position));
        setMosaicBanners(mosaic);

        const hero = allBanners
          .filter(b => b.type === 'hero' && b.is_active)
          .sort((a, b) => Number(a.position) - Number(b.position));
        setHeroBanners(hero);
      } catch (err) {
        console.error("Banner fetch error:", err);
      } finally {
        setMosaicLoading(false);
      }
    };
    fetchBanners();
  }, []);

  /* ================= COMPOSE SLIDES ================= */
  // Fallback slides in case DB has no active hero banners
  const defaultHeroSlides = [
    {
      image_url: banner_2,
      title: "NEW BEGINNINGS",
      subtitle: "FLAT 15% OFF ON ALL SAREES",
      button_text: "Shop Collection",
      link: "/all-products",
      tagline: "GRAND LAUNCH SALE",
      description: "CELEBRATE OUR GRAND LAUNCH WITH EXCLUSIVE HANDLOOM COLLECTION",
      align: "left",
      isDbBanner: false
    },
    {
      image_url: "/assets/banner_1.png",
      title: "LUXURY SILKS",
      subtitle: "TRADITION FOR GENERATIONS",
      button_text: "Shop Collection",
      link: "/all-products",
      tagline: "LAUNCH OFFERS",
      description: "RARE WEAVES, FRESH DESIGNS, AND EXCLUSIVES YOU SIMPLY WON'T FIND ANYWHERE ELSE",
      align: "right",
      isDbBanner: false
    }
  ];

  const displaySlides = heroBanners.length > 0
    ? heroBanners.map((b, index) => ({
      image_url: getFullMediaUrl(b.image_url),
      title: b.title || "",
      subtitle: b.subtitle || "",
      button_text: b.button_text || "Shop Now",
      link: b.link || "/all-products",
      tagline: b.subtitle || "",
      description: b.description || "",
      align: index % 2 === 0 ? "left" : "right",
      isDbBanner: true
    }))
    : defaultHeroSlides;

  const prevHeroSlide = (e) => {
    e.stopPropagation();
    setCurrentSlide((prev) => (prev > 0 ? prev - 1 : displaySlides.length - 1));
  };

  const nextHeroSlide = (e) => {
    e.stopPropagation();
    setCurrentSlide((prev) => (prev + 1) % displaySlides.length);
  };

  useEffect(() => {
    if (displaySlides.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % displaySlides.length);
    }, 5000);

    return () => clearInterval(interval);
  }, [displaySlides.length]);

  /* ================= SHOP ================= */
  // Limit to exactly 2 rows (on desktop: 2 rows of 4 = 8 items)
  // On mobile: 2 rows of 2 = 4 items, but we'll show 8 and let the grid handle the rows
  const shuffledProducts = useMemo(() => shuffleArray(products || []), [products]);
  const shopProducts = shuffledProducts.slice(0, 8);

  /* ================= DRAG ================= */
  const handleMouseDown = (e) => {
    const slider = scrollRef.current;
    if (!slider) return;
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
          {displaySlides.map((slide, index) => {
            // Only overlay standard details if title is populated, or if it is the static fallback
            const showOverlayContent = !slide.isDbBanner || slide.title;

            return (
              <div
                key={index}
                className={`hero-slide ${index === currentSlide ? "active" : ""
                  }`}
                onClick={() => {
                  navigate(slide.link || "/all-products");
                }}
                style={{ cursor: "pointer" }}
              >
                <div className="hero-img-container">
                  <img src={slide.image_url} className="hero-img" alt={slide.title || "Luxury Saree Collection"} />
                </div>
                <div className="hero-overlay"></div>

                {showOverlayContent && (
                  <div className={`hero-content ${slide.align === 'right' ? 'align-right' : ''}`}>
                    {slide.tagline && <span className="hero-tagline">{slide.tagline}</span>}
                    <h1
                      className="hero-title"
                      style={{ transform: `scale(${scale})` }}
                    >
                      {slide.title}
                    </h1>
                    {slide.subtitle && <h3 className="hero-subtitle">{slide.subtitle}</h3>}
                    {slide.description && <p className="hero-description">{slide.description}</p>}

                    <div className="hero-buttons">
                      <button
                        className="btn-hero-primary"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(slide.link || "/all-products");
                        }}
                      >
                        {slide.button_text}
                        <span className="btn-icon"><i className="bi bi-arrow-right"></i></span>
                      </button>

                      {!slide.isDbBanner && (
                        <button
                          className="btn-hero-secondary"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate("/about");
                          }}
                        >
                          Our Story
                        </button>
                      )}
                    </div>
                  </div>
                )}
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
            {displaySlides.map((_, index) => (
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

      {/* Categories Section */}
      <CategoriesScroll />

      {/* NEW ARRIVALS */}
      <NewArrivals
        newArrivals={shuffledProducts}
        onQuickView={setSelectedProduct}
        loading={newArrivalsLoading}
      />

      {/* EXPLORE */}
      <ExploreCollection />

      {/* SHOP NOW - LIMITED TO 2 ROWS ONLY */}
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

      <WorkWithUsMarquee />

      <ServiceFeatures />

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
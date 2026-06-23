// src/components/CategoriesScroll.jsx
import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "./CategoriesScroll.css";

const API_URL = process.env.REACT_APP_API_URL;

const CategoriesScroll = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showScrollButtons, setShowScrollButtons] = useState(false);
  const scrollContainerRef = useRef(null);
  const navigate = useNavigate();

  // Helper function to get full image URL
  const getFullImageUrl = (imageUrl) => {
    if (!imageUrl) return "";
    if (imageUrl.startsWith("http")) return imageUrl;
    const baseUrl = API_URL?.replace(/\/api$/, "") || "";
    return `${baseUrl}${imageUrl}`;
  };

  // Fetch categories from API
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await axios.get(`${API_URL}/categories`);
        if (response.data.success && response.data.categories) {
          setCategories(response.data.categories);
        }
      } catch (error) {
        console.error("Error fetching categories:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchCategories();
  }, []);

  // Check if scroll buttons should be shown
  useEffect(() => {
    const checkScroll = () => {
      if (scrollContainerRef.current) {
        const { scrollWidth, clientWidth } = scrollContainerRef.current;
        setShowScrollButtons(scrollWidth > clientWidth);
      }
    };
    
    checkScroll();
    window.addEventListener('resize', checkScroll);
    return () => window.removeEventListener('resize', checkScroll);
  }, [categories]);

  const scroll = (direction) => {
    if (scrollContainerRef.current) {
      const scrollAmount = direction === 'left' ? -400 : 400;
      scrollContainerRef.current.scrollBy({ left: scrollAmount, behavior: "smooth" });
    }
  };

  if (loading) {
    return (
      <div className="categories-scroll-section">
        <div className="container">
          <div className="categories-scroll-header">
            <h2 className="categories-scroll-title">Shop by Category</h2>
            <div className="categories-scroll-line"></div>
          </div>
          <div className="categories-skeleton-wrapper">
            <div className="categories-skeleton">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="category-skeleton-item">
                  <div className="skeleton-circle"></div>
                  <div className="skeleton-text"></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (categories.length === 0) return null;

  return (
    <section className="categories-scroll-section">
      <div className="container">
        <div className="categories-scroll-header">
          <h2 className="categories-scroll-title">Shop by Category</h2>
          <div className="categories-scroll-line"></div>
          <p className="categories-scroll-subtitle">
            Explore our curated collection by category
          </p>
        </div>

        <div className="categories-scroll-wrapper">
         
          
          <div 
            className={`categories-scroll-container ${!showScrollButtons ? 'centered' : ''}`}
            ref={scrollContainerRef}
          >
            {categories.map((category) => (
              <div
                key={category.id}
                className="category-item"
                onClick={() => navigate(`/all-products?category=${encodeURIComponent(category.name)}`)}
              >
                <div className="category-circle">
                  {category.image_url ? (
                    <img
                      src={getFullImageUrl(category.image_url)}
                      alt={category.name}
                      className="category-image"
                      loading="lazy"
                    />
                  ) : (
                    <div className="category-placeholder">
                      <i className="bi bi-tags"></i>
                    </div>
                  )}
                </div>
                <h3 className="category-name">{category.name}</h3>
              </div>
            ))}
          </div>

          
        </div>
      </div>
    </section>
  );
};

export default CategoriesScroll;
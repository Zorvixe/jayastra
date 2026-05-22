import React from "react";
import { Link } from "react-router-dom";
import "./ExploreCollection.css";

import bestSellerLeft from "../assets/best-selelr-left.webp";
import bestSellerRight from "../assets/best-selelr-right.webp";

const ExploreCollection = () => {
  return (
    <section className="two-posters-section">
      {/* Top Decorative Border */}
      <div className="pattern-border"></div>

      <div className="posters-container">
        {/* Poster 1 - Best Seller */}
        <Link to="#" className="poster-link">
          <div className="poster-card">
            <img 
              src={bestSellerLeft} 
              alt="Best Seller - Join the trendsetters" 
              className="poster-image"
             
            />
          </div>
        </Link>

        {/* Poster 2 - Exclusive Collections */}
        <Link to="#" className="poster-link">
          <div className="poster-card">
            <img 
              src={bestSellerRight} 
              alt="Our Exclusive Collections" 
              className="poster-image"
              
            />
          </div>
        </Link>
      </div>

      {/* Bottom Decorative Border */}
      <div className="pattern-border"></div>
    </section>
  );
};

export default ExploreCollection;
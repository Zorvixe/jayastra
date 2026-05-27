// src/components/WorkWithUsMarquee.jsx
import React from "react";
import "./WorkWithUsMarquee.css";

const WorkWithUsMarquee = () => {
  return (
    <div className="work-with-us-marquee">
      <div className="marquee-track-special">
        <div className="marquee-content-special">
          <span className="special-icon">✨</span>
          <span className="special-text">If you want to sell your products or work with us</span>
          <span className="special-icon">🤝</span>
          <span className="special-text">Contact us now:</span>
          <span className="special-phone">📞 +91 83285 90444</span>
          <span className="special-icon">💫</span>
          <span className="special-text">Limited slots available for exclusive partnerships!</span>
          <span className="special-icon">⭐</span>
        </div>
        {/* Duplicate for seamless loop */}
        <div className="marquee-content-special">
          <span className="special-icon">✨</span>
          <span className="special-text">If you want to sell your products or work with us</span>
          <span className="special-icon">🤝</span>
          <span className="special-text">Contact us now:</span>
          <span className="special-phone">📞 +91 83285 90444</span>
          <span className="special-icon">💫</span>
          <span className="special-text">Limited slots available for exclusive partnerships!</span>
          <span className="special-icon">⭐</span>
        </div>
      </div>
    </div>
  );
};

export default WorkWithUsMarquee;
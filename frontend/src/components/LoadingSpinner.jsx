import React from "react";
import "./LoadingSpinner.css"; // Updated import to match the CSS file name

const LoadingSpinner = ({ fullPage = true }) => {
  return (
    <div className={fullPage ? "load-init-overlay" : "load-init-container"}>
      <div className="load-init-luxury-spinner">
        <div className="load-init-spinner-circle"></div>
        <div className="load-init-spinner-logo-text">J</div>
      </div>
    </div>
  );
};

export default LoadingSpinner;
import React from "react";
import "./Loader.css";

const Loader = ({ fullPage = true }) => {
  return (
    <div className={fullPage ? "loader-overlay" : "loader-container"}>
      <div className="luxury-spinner">
        <div className="spinner-circle"></div>
        <img src="/assets/jayastra-brown-favicon.png" alt="JAYASTRA Logo" className="spinner-logo-img" />
      </div>
    </div>
  );
};

export default Loader;

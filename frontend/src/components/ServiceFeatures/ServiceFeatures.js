// src/components/ServiceFeatures.jsx
import React from "react";
import "./ServiceFeatures.css";

// Import your images - update these paths to your actual image locations
import shippingImg from "../../assets/bikes-free-shipping.svg";
import exchangeImg from "../../assets/bikes-return.svg";
import supportImg from "../../assets/bikes-24-support.svg";
import paymentImg from "../../assets/bikes-payment.svg";

const ServiceFeatures = () => {
  const features = [
    {
      id: 1,
      title: "FREE SHIPPING",
      description: "Enjoy free shipping on all orders across India, making your shopping experience more affordable, convenient, and hassle-free from start to finish.",
      image: shippingImg,
      alt: "Free Shipping",
      color: "#8E2139"
    },
    {
      id: 2,
      title: "EXCHANGE & RETURN",
      description: "We offer exchanges within 7 working days only for damaged products. Refunds and returns are not available under any circumstances. Once Order is placed there is no cancellation and refund.",
      image: exchangeImg,
      alt: "Exchange & Return",
      color: "#D4AF37"
    },
    {
      id: 3,
      title: "CUSTOMER SERVICE",
      description: "Our customer service is available Monday to Saturday, from 10 AM to 7 PM, ensuring prompt support for all your needs.",
      image: supportImg,
      alt: "Customer Service",
      color: "#8E2139"
    },
    {
      id: 4,
      title: "INSTANT PAYMENTS",
      description: "Receive instant payments securely, ensuring fast transactions, improved cash flow, and a smooth experience for both buyers and sellers every time.",
      image: paymentImg,
      alt: "Instant Payments",
      color: "#D4AF37"
    }
  ];

  return (
    <section className="service-features-section">
      <div className="container">
        <div className="service-features-header">
          <h2 className="service-features-title">Why Choose Us</h2>
          <div className="service-features-line"></div>
          <p className="service-features-subtitle">
            Experience the best of online shopping with our premium services
          </p>
        </div>

        <div className="service-features-grid">
          {features.map((feature, index) => (
            <div 
              key={feature.id} 
              className="service-feature-card"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className="feature-image-wrapper">
                <img 
                  src={feature.image} 
                  alt={feature.alt} 
                  className="feature-image"
                  loading="lazy"
                />
              </div>
              <h3 className="feature-title">{feature.title}</h3>
              <p className="feature-description">{feature.description}</p>
              <div className="feature-shine"></div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ServiceFeatures;
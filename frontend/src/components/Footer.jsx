import { useNavigate } from "react-router-dom";
import "./Footer.css";

const Footer = () => {
  const navigate = useNavigate();

  return (
    <footer className="footer-custom">
      <div className="container">
        <div className="row gy-5">
          {/* COLUMN 1: Brand & Desc */}
          <div className="col-12 col-lg-3 footer-col brand-col">
            <div className="footer-logo-wrap">
              <img src="/assets/jayastra_banner.png" alt="Logo" className="footer-brand-logo" onError={(e) => { e.target.style.display = 'none'; }} />
            </div>
            <p className="footer-desc">
              <strong>JAYASTRA</strong> — Bengaluru's premier destination for premium ethnic & contemporary fashion. Every piece tells a story of style, comfort, and elegance, crafted to celebrate your unique personality. <br /><br />
              <em>Redefining fashion. Redefining you.</em>
            </p>
          </div>

          {/* COLUMN 2: Quick Links */}
          <div className="col-12 col-sm-6 col-lg-2 footer-col">
            <h4 className="footer-heading">Quick Links</h4>
            <ul className="footer-links">
              <li><span onClick={() => navigate("/about")}>About Us</span></li>
              <li><span onClick={() => navigate("/all-products")}>Products</span></li>
              <li><span onClick={() => navigate("/contact")}>Contact Us</span></li>
            </ul>
          </div>

          {/* COLUMN 3: Useful Links */}
          <div className="col-12 col-sm-6 col-lg-3 footer-col">
            <h4 className="footer-heading">Useful Links</h4>
            <ul className="footer-links">
              <li><span onClick={() => navigate("/privacy-policy")}>Privacy Policy</span></li>
              <li><span onClick={() => navigate("/exchange-policy")}>Exchange Policy</span></li>
              <li><span onClick={() => navigate("/terms-and-conditions")}>Terms & Conditions</span></li>
              <li><span onClick={() => navigate("/shipping-policy")}>Shipping Policy</span></li>
            </ul>
          </div>

          {/* COLUMN 4: Contact Info */}
          <div className="col-12 col-lg-4 footer-col contact-col">
            <h4 className="footer-heading">Contact Info</h4>
            <ul className="footer-contact-list">
              <li><strong>Phone:</strong> +91 8328590444  / +91 9652896180</li>
              <li><strong>Email:</strong> jayastrastore@gmail.com</li>
              <li><strong>Address:</strong> 165/1, Priya Swaroop, 11th cross, beside RAINEO STUDIO, Modi Hospital Rd, Model LIC Colony, Basaveshwar Nagar, Bengaluru, Karnataka 560079</li>
            </ul>

            <div className="footer-social-icons">
              <a href="tel:+919019397278" aria-label="Phone" className="social-icon ph"><i className="bi bi-telephone"></i></a>
              <a href="https://www.instagram.com/jayastrastore?igsh=b293OXJ0aXh6Y24=" target="_blank" rel="noopener noreferrer" aria-label="Instagram" className="social-icon ig"><i className="bi bi-instagram"></i></a>
              <a href="https://maps.google.com/?q=165/1,+Priya+Swaroop,+11th+cross,+beside+RAINEO+STUDIO,+Modi+Hospital+Rd,+Model+LIC+Colony,+Basaveshwar+Nagar,+Bengaluru,+Karnataka+560079" target="_blank" rel="noopener noreferrer" aria-label="Location" className="social-icon loc"><i className="bi bi-geo-alt"></i></a>
            </div>
          </div>
        </div>

        {/* WhatsApp Enquire Row */}
        <div className="footer-bottom-row">
          <a href="https://wa.me/8328590444" target="_blank" rel="noopener noreferrer" className="whatsapp-enquire-btn">
            <i className="bi bi-whatsapp"></i> Enquire on WhatsApp
          </a>
        </div>

        {/* Copyright */}
        <div className="footer-copyright">
          &copy; 2026 JAYASTRA. All rights reserved.
          <div className="developer-credit">
            Developed and Maintained by <a href="https://www.zorvixetechnologies.com/" target="_blank" rel="noopener noreferrer">Zorvixe Technologies</a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
import React, { useState } from "react";
import "./Contact.css";

const Contact = () => {
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    message: ""
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Construct WhatsApp Message
    const whatsappNum = "919113657841"; // The number provided in footer
    const text = `*New Inquiry from Website*%0A%0A*Name:* ${formData.firstName} ${formData.lastName}%0A*Email:* ${formData.email}%0A*Phone:* ${formData.phone}%0A*Message:* ${formData.message}`;
    
    const waUrl = `https://wa.me/${whatsappNum}?text=${text}`;
    window.open(waUrl, "_blank");
  };

  return (
    <div className="contact-page">
      {/* HERO */}
      <section className="contact-hero">
        <div className="container">
          <h1 className="hero-heading">Get In Touch</h1>
          <p className="hero-sub">We Are Here To Help You Find Your Perfect Drape</p>
        </div>
      </section>

      {/* CONTACT CONTENT */}
      <section className="contact-body py-5">
        <div className="container">
          <div className="row g-5">
            {/* CONTACT FORM */}
            <div className="col-lg-7">
              <div className="form-wrapper card p-5 border-0 shadow-sm">
                <h2 className="section-title mb-4">Send Us a Message</h2>
                <form className="contact-form" onSubmit={handleSubmit}>
                  <div className="row g-3">
                    <div className="col-md-6">
                      <label className="form-label">First Name</label>
                      <input 
                        type="text" 
                        name="firstName"
                        className="form-control" 
                        placeholder="Jane" 
                        value={formData.firstName}
                        onChange={handleChange}
                        required 
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Last Name</label>
                      <input 
                        type="text" 
                        name="lastName"
                        className="form-control" 
                        placeholder="Doe" 
                        value={formData.lastName}
                        onChange={handleChange}
                        required 
                      />
                    </div>
                    <div className="col-12">
                      <label className="form-label">Email Address</label>
                      <input 
                        type="email" 
                        name="email"
                        className="form-control" 
                        placeholder="jane@example.com" 
                        value={formData.email}
                        onChange={handleChange}
                        required 
                      />
                    </div>
                    <div className="col-12">
                      <label className="form-label">Phone Number</label>
                      <input 
                        type="tel" 
                        name="phone"
                        className="form-control" 
                        placeholder="+91 96526XXXXX" 
                        value={formData.phone}
                        onChange={handleChange}
                        required 
                      />
                    </div>
                    <div className="col-12">
                      <label className="form-label">How can we help?</label>
                      <textarea 
                        name="message"
                        className="form-control" 
                        rows="5" 
                        placeholder="Tell us about your requirement..."
                        value={formData.message}
                        onChange={handleChange}
                        required
                      ></textarea>
                    </div>
                    <div className="col-12 mt-4">
                      <button type="submit" className="submit-btn primary-btn w-100 py-3">Send via WhatsApp <i className="bi bi-whatsapp ms-2"></i></button>
                    </div>
                  </div>
                </form>
              </div>
            </div>

            {/* CONTACT INFO CARD */}
            <div className="col-lg-5">
              <div className="info-wrapper p-4 h-100">
                <h2 className="section-title mb-4">Visit Our Store</h2>
                <div className="divider-left"></div>
                
                <div className="contact-info-list mt-4">
                  <div className="info-item mb-4">
                    <div className="info-icon">
                      <i className="bi bi-geo-alt"></i>
                    </div>
                    <div className="info-text">
                      <h4>Address</h4>
                      <p>165/1, Priya Swaroop, 11th cross, beside RAINEO STUDIO, Modi Hospital Rd, Model LIC Colony, Basaveshwar Nagar, Bengaluru, Karnataka 560079</p>
                    </div>
                  </div>

                  <div className="info-item mb-4">
                    <div className="info-icon">
                      <i className="bi bi-telephone"></i>
                    </div>
                    <div className="info-text">
                      <h4>Call Us</h4>
                      <p>+91 8328590444</p>
                    </div>
                  </div>

                  <div className="info-item mb-4">
                    <div className="info-icon">
                      <i className="bi bi-envelope"></i>
                    </div>
                    <div className="info-text">
                      <h4>Email Support</h4>
                      <p>jayastrastore@gmail.com</p>
                    </div>
                  </div>

                  <div className="info-item mb-4">
                    <div className="info-icon">
                      <i className="bi bi-clock"></i>
                    </div>
                    <div className="info-text">
                      <h4>Store Hours</h4>
                      <p>Monday - Sunday: 10:30 AM - 9:30 PM</p>
                    </div>
                  </div>
                </div>

                {/* SOCIALS */}
                <div className="mt-5">
                  <h4 className="mb-3">Follow Us</h4>
                  <div className="social-box d-flex gap-3">
                    <a href="tel:+918328590444" className="social-link ph text-primary"><i className="bi bi-telephone"></i></a>
                    <a href="https://wa.me/918328590444" target="_blank" rel="noopener noreferrer" className="social-link wa text-success"><i className="bi bi-whatsapp"></i></a>
                    <a href="https://instagram.com/jayastra" target="_blank" rel="noopener noreferrer" className="social-link ig text-danger"><i className="bi bi-instagram"></i></a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* EMBEDDED MAP (Statically Placed) */}
      <section className="contact-map">
        <iframe 
          title="Store Location"
          src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d15550.57539656133!2d77.5300!3d12.9850!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3bae3d95c276378b%3A0xc2038562!2sBasaveshwar%20Nagar%2C%20Bengaluru%2C%20Karnataka!5e0!3m2!1sen!2sin!4v1712398432321!5m2!1sen!2sin" 
          width="100%" 
          height="450" 
          style={{ border: 0 }} 
          allowFullScreen="" 
          loading="lazy" 
          referrerPolicy="no-referrer-when-downgrade">
        </iframe>
      </section>
    </div>
  );
};

export default Contact;

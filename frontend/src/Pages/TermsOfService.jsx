import React from "react";
import "./Policy.css";

const TermsOfService = () => {
  return (
    <div className="policy-page">
      <div className="container">
        <h1>Terms & Conditions</h1>
        <p className="last-updated">Last Updated: April 2026</p>

        <section className="premium-policy-text">
          <p>
            “By using our website, you agree to <strong>JAYASTRA</strong> terms and policies. All products, prices, and offers are subject to availability. We reserve the right to update or modify our policies at any time without prior notice.”
          </p>
        </section>

        <section>
          <h2>1. Logistics & Fulfillment</h2>
          <p>
            To ensure a seamless and reliable delivery experience for our luxury drapes, we have partnered with <strong>Shiprocket</strong>. All nationwide shipping, real-time tracking, and doorstep deliveries are managed through their advanced logistics infrastructure.
          </p>
        </section>

        <section>
          <h2>2. Product Availability & Pricing</h2>
          <p>
            All products listed on the site are subject to availability. While we strive for accuracy, JAYASTRA reserves the right to correct any pricing errors or cancel orders if an item is out of stock.
          </p>
        </section>

        <section>
          <h2>3. Intellectual Property</h2>
          <p>
            All original photography, designs, and branding for our premium saree collections are the property of JAYASTRA. Unauthorized reproduction or use of these assets is strictly prohibited.
          </p>
        </section>

        <section>
          <h2>4. Jurisdiction</h2>
          <p>
            Any disputes regarding purchases or website use shall be subject to the exclusive jurisdiction of the courts located in <strong>Bengaluru, Karnataka</strong>.
          </p>
        </section>
      </div>
    </div>
  );
};

export default TermsOfService;

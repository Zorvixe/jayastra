import React from "react";
import "./Policy.css";

const ShippingPolicy = () => {
  return (
    <div className="policy-page">
      <div className="container">
        <h1>Shipping Policy</h1>
        <p className="last-updated">Last Updated: April 2026</p>

        <section>
          <h2>1. Logistics Partner</h2>
          <p>
            At <strong>JAYASTRA</strong>, we are committed to delivering your luxury sarees safely and on time. We have partnered with <strong>Shiprocket</strong>, India's leading logistics aggregator, to provide reliable nationwide shipping and real-time tracking.
          </p>
        </section>

        <section>
          <h2>2. Processing & Dispatch</h2>
          <p>
            Standard orders are typically dispatched within <strong>24 to 48 hours</strong> of order confirmation. For hand-worked or customized drapes, dispatch may take 3-5 business days. We do not ship on Sundays or National Holidays.
          </p>
        </section>

        <section>
          <h2>3. Shipping Charges & Delivery</h2>
          <p>
            Once dispatched, your elegant drape should reach you within:
          </p>
          <ul>
            <li><strong>Metro Cities:</strong> 3-5 business days.</li>
            <li><strong>Rest of India:</strong> 5-7 business days.</li>
          </ul>
          <p>Shipping charges, if applicable, will be calculated at checkout based on your delivery location and order value.</p>
        </section>

        <section>
          <h2>4. Real-Time Tracking</h2>
          <p>
            Once your order is picked up by our courier partner, you will receive an SMS and WhatsApp notification from <strong>Shiprocket</strong> containing your unique tracking ID and a link to monitor your package's journey.
          </p>
        </section>

        <section>
          <h2>5. Undelivered Shipments</h2>
          <p>
            If a package is returned to us due to an incorrect address or the customer's absence, we will attempt to contact you for a re-delivery. Please note that additional shipping costs may apply for the second attempt.
          </p>
        </section>
      </div>
    </div>
  );
};

export default ShippingPolicy;

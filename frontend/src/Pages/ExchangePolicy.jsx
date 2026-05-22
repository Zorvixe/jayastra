import React from "react";
import "./Policy.css";

const ExchangePolicy = () => {
  return (
    <div className="policy-page">
      <div className="container">
        <h1>Exchange Policy</h1>
        <p className="last-updated">Last Updated: April 2026</p>

        <section className="premium-policy-text">
          <p>
            “At <strong>JAYASTRA</strong>, we offer exchange options to ensure your satisfaction. Exchanges are accepted only if an unboxing video is recorded and shared. The product must be unused and in original condition. Requests without a proper opening video will not be accepted.”
          </p>
        </section>

        <section>
          <h2>1. Eligibility for Exchange</h2>
          <p>Exchanges are strictly accepted only in the following cases:</p>
          <ul>
            <li>Products damaged during shipping.</li>
            <li>Manufacturing defects in the weave or fabric.</li>
            <li>Incorrect item sent (different from your order).</li>
          </ul>
          <p><strong>Timeframe:</strong> Exchange requests must be submitted within <strong>2 days</strong> of delivery of the saree.</p>
        </section>

        <section>
          <h2>2. Non-Acceptable Reasons</h2>
          <p>Exchanges are <strong>not</strong> accepted for:</p>
          <ul>
            <li>Change of mind.</li>
            <li>Minor color variations (due to screen resolution or lighting).</li>
            <li>Size or personal preference.</li>
            <li>General dissatisfaction with the product.</li>
          </ul>
        </section>

        <section>
          <h2>3. Shipping Policy for Exchanges</h2>
          <ul>
            <li><strong>First Exchange:</strong> We provide <strong>Free Shipping</strong> for the first exchange request of an order.</li>
            <li><strong>Subsequent Exchanges:</strong> Any further exchange requests for the same order will incur applicable shipping charges.</li>
          </ul>
        </section>

        <section className="highlight-box">
          <h2>4. Essential Requirements</h2>
          <p>To process any return or exchange request, you must provide:</p>
          <ul>
            <li><strong>Unboxing Video:</strong> A continuous video clearly showing the package being opened and the damage at the time of opening.</li>
            <li><strong>Photographs:</strong> Clear photographs of the damaged or defective product.</li>
            <li><strong>Order Details:</strong> Your Order Number and Product Code.</li>
          </ul>
          <div className="alert-important">
            <i className="bi bi-exclamation-triangle-fill"></i> <strong>Important:</strong> Requests without a clear, edited unboxing video will <strong>not</strong> be not considered for exchange.
          </div>
        </section>
      </div>
    </div>
  );
};

export default ExchangePolicy;

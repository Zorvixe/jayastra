import React from "react";
import "./Policy.css";

const PrivacyPolicy = () => {
  return (
    <div className="policy-page">
      <div className="container">
        <h1>Privacy Policy</h1>
        <p className="last-updated">Last Updated: April 2026</p>

        <section className="premium-policy-text">
          <p>
            “At <strong>JAYASTRA</strong>, your privacy is our priority. We ensure that all your personal information is securely protected and used only to enhance your shopping experience. Your details are never shared with third parties without your consent.”
          </p>
        </section>

        <section>
          <h2>1. Information We Collect</h2>
          <p>
            To provide a seamless shopping experience, we collect essential details such as your name, shipping address, contact number, and email. This information is collected only when you place an order, sign up for our newsletter, or contact our support team.
          </p>
        </section>

        <section>
          <h2>2. How We Use Your Data</h2>
          <p>
            Your data is used to process transactions, manage deliveries via our logistics partners, and provide personalized saree recommendations. We may also use your contact details to share exclusive previews of our new handloom collections.
          </p>
        </section>

        <section>
          <h2>3. Cookies and Tracking</h2>
          <p>
            We use cookies to remember your preferences and items in your shopping bag. This helps us ensure that your journey across our website is smooth and tailored to your tastes.
          </p>
        </section>

        <section>
          <h2>4. Third-Party Services</h2>
          <p>
            We partner with secure payment gateways (like Razorpay) and trusted shipping providers to complete your orders. These partners only receive the information necessary to fulfill their specific service role.
          </p>
        </section>

        <section>
          <h2>5. Data Protection Commitment</h2>
          <p>
            We implement industry-standard security measures, including high-level SSL encryption, to ensure your financial and personal data is kept safe during every interaction with our website.
          </p>
        </section>
      </div>
    </div>
  );
};

export default PrivacyPolicy;

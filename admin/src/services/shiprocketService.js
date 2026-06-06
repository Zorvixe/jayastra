// src/admin/services/shiprocketService.js

const API_URL = process.env.REACT_APP_API_URL;

const shiprocketService = {
  // Get courier recommendation
  getCourierRecommendation: async (pincode, amount, isCOD, weight = 0.5) => {
    try {
      const response = await fetch(
        `${API_URL}/shiprocket/courier-recommendation?delivery_pincode=${pincode}&amount=${amount}&is_cod=${isCOD}&weight=${weight}`
      );
      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Courier recommendation error:", error);
      return { success: false, serviceable: false, message: error.message };
    }
  },

  // Check pincode serviceability
  checkPincodeServiceability: async (pincode, weight = 0.5) => {
    try {
      const response = await fetch(
        `${API_URL}/shiprocket/pincode/${pincode}?weight=${weight}`
      );
      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Pincode check error:", error);
      return { success: false, serviceable: false, message: error.message };
    }
  },

  // Track shipment by AWB
  trackShipment: async (awb) => {
    try {
      const response = await fetch(`${API_URL}/shiprocket/track/${awb}`);
      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Tracking error:", error);
      return { success: false, message: error.message };
    }
  },

  // Get shipping rates
  getShippingRates: async (deliveryPincode, weight = 0.5, isCOD = false) => {
    try {
      const response = await fetch(
        `${API_URL}/shiprocket/shipping-rates?delivery_pincode=${deliveryPincode}&weight=${weight}&cod=${isCOD}`
      );
      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Shipping rates error:", error);
      return { success: false, rates: [], message: error.message };
    }
  }
};

export default shiprocketService;
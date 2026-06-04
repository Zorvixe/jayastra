// src/services/shiprocketService.js
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5005/api';

class ShiprocketService {
  /**
   * Get courier recommendation for an order (Admin use)
   */
  async getCourierRecommendation(deliveryPincode, amount, isCOD = false, weight = 0.5) {
    try {
      const response = await axios.get(`${API_URL}/shiprocket/courier-recommendation`, {
        params: {
          delivery_pincode: deliveryPincode,
          amount: amount,
          is_cod: isCOD,
          weight: weight
        }
      });
      return response.data;
    } catch (error) {
      console.error("Failed to get courier recommendation:", error);
      return { success: false, serviceable: false };
    }
  }

  /**
   * Check if pincode is serviceable
   */
  async isPincodeServiceable(pincode) {
    try {
      const response = await axios.get(`${API_URL}/shiprocket/pincode/${pincode}`);
      return response.data;
    } catch (error) {
      console.error("Pincode check failed:", error);
      return { success: false, serviceable: false };
    }
  }

  /**
   * Track shipment by AWB number
   */
  async trackShipment(awbCode) {
    try {
      const response = await axios.get(`${API_URL}/shiprocket/track/${awbCode}`);
      return response.data;
    } catch (error) {
      console.error("Tracking failed:", error);
      return { success: false };
    }
  }
}

export default new ShiprocketService();
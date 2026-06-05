// src/admin/services/shipmozoService.js
import axios from '../utils/axiosConfig';

const API_URL = process.env.REACT_APP_API_URL;

const getAuthHeaders = () => {
  const token = localStorage.getItem("token");
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json"
  };
};

const shipmozoService = {
  // Get courier recommendation for a pincode
  getCourierRecommendation: async (deliveryPincode, amount, isCOD, weight = 0.5) => {
    try {
      const response = await axios.get(`${API_URL}/shipmozo/courier-recommendation`, {
        params: {
          delivery_pincode: deliveryPincode,
          amount: amount || 0,
          is_cod: isCOD,
          weight: weight
        }
      });
      return response.data;
    } catch (error) {
      console.error("Courier recommendation error:", error);
      throw error;
    }
  },

  // Check pincode serviceability
  checkPincodeServiceability: async (deliveryPincode, pickupPincode = null) => {
    try {
      const params = { delivery_pincode: deliveryPincode };
      if (pickupPincode) params.pickup_pincode = pickupPincode;
      
      const response = await axios.get(`${API_URL}/shipmozo/serviceability`, { params });
      return response.data;
    } catch (error) {
      console.error("Serviceability check error:", error);
      throw error;
    }
  },

  // Get shipping rates
  getShippingRates: async (deliveryPincode, weight = 0.5, orderAmount = 0, paymentType = "PREPAID") => {
    try {
      const response = await axios.get(`${API_URL}/shipmozo/shipping-rates`, {
        params: {
          delivery_pincode: deliveryPincode,
          weight: weight * 1000, // Convert to grams
          order_amount: orderAmount,
          payment_type: paymentType
        }
      });
      return response.data;
    } catch (error) {
      console.error("Shipping rates error:", error);
      throw error;
    }
  },

  // Track order by AWB number
  trackOrder: async (awbNumber) => {
    try {
      const response = await axios.get(`${API_URL}/shipmozo/track/${awbNumber}`);
      return response.data;
    } catch (error) {
      console.error("Tracking error:", error);
      throw error;
    }
  },

  // Get order label by AWB number
  getOrderLabel: async (awbNumber) => {
    try {
      const response = await axios.get(`${API_URL}/shipmozo/label/${awbNumber}`, {
        headers: getAuthHeaders()
      });
      return response.data;
    } catch (error) {
      console.error("Label fetch error:", error);
      throw error;
    }
  },

  // Cancel order in Shipmozo
  cancelOrder: async (orderId, awbNumber) => {
    try {
      const response = await axios.post(`${API_URL}/shipmozo/cancel-order/${orderId}`, {
        awb_number: awbNumber
      }, {
        headers: getAuthHeaders()
      });
      return response.data;
    } catch (error) {
      console.error("Cancel order error:", error);
      throw error;
    }
  },

  // Get warehouses list
  getWarehouses: async () => {
    try {
      const response = await axios.get(`${API_URL}/admin/shipmozo/warehouses`, {
        headers: getAuthHeaders()
      });
      return response.data;
    } catch (error) {
      console.error("Get warehouses error:", error);
      throw error;
    }
  },

  // Create warehouse
  createWarehouse: async (warehouseData) => {
    try {
      const response = await axios.post(`${API_URL}/admin/shipmozo/warehouses`, warehouseData, {
        headers: getAuthHeaders()
      });
      return response.data;
    } catch (error) {
      console.error("Create warehouse error:", error);
      throw error;
    }
  }
};

export default shipmozoService;
import React, { useState } from "react";
import axios from "axios";
import "./ExchangeModal.css";

const API_URL = process.env.REACT_APP_API_URL;

const ExchangeModal = ({ order, isOpen, onClose, onSuccess }) => {
  const [video, setVideo] = useState(null);
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async () => {
    if (!video) return alert("Please upload unboxing video");
    
    setIsSubmitting(true);
    try {
      const token = localStorage.getItem("token");
      const formData = new FormData();
      formData.append("video", video);
      formData.append("reason", reason);
      
      const res = await axios.post(`${API_URL}/user/orders/${order.id}/return`, formData, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });
      
      if(res.data) {
        alert("Exchange request submitted successfully! ✨");
        if (onSuccess) onSuccess();
        onClose();
        // Reset local state for next use
        setVideo(null);
        setReason(reason);
      }
    } catch (err) {
      alert("Submission failed. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="od-exchange-modal-overlay">
      <div className="od-exchange-modal-card">
        <header className="od-modal-header">
           <h3>Request Exchange for Order #{order?.id}</h3>
           <button className="od-close-modal" onClick={onClose}>×</button>
        </header>
        
        <div className="od-modal-alert">
           <i className="bi bi-shield-lock-fill"></i>
           <span>Strict Policy: You MUST upload an unboxing video to process your exchange request.</span>
        </div>
        
        <div className="od-modal-body">
          <div className="od-field">
            <label>Unboxing Video (Required)</label>
            <div className="od-file-input-wrapper">
              <input 
                type="file" 
                accept="video/*" 
                id="exchange-vid-comp" 
                onChange={(e) => setVideo(e.target.files[0])} 
              />
              <label htmlFor="exchange-vid-comp" className="od-custom-file-label">
                 <i className="bi bi-film"></i>
                 <span>{video ? video.name : "Select Video File"}</span>
              </label>
            </div>
          </div>
          
          <div className="od-field">
            <label>Reason for Exchange</label>
            <textarea 
              placeholder="Tell us about the issue with the product..." 
              value={reason} 
              onChange={(e) => setReason(e.target.value)} 
            />
          </div>

          <div className="od-modal-footer">
            <button className="od-cancel-btn" onClick={onClose}>Keep Product</button>
            <button 
              className="od-submit-btn" 
              disabled={isSubmitting} 
              onClick={handleSubmit}
            >
              {isSubmitting ? "Submitting..." : "Confirm Exchange"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExchangeModal;

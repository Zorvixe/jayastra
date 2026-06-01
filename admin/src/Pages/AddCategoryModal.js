// AddCategoryModal.jsx - Modal for adding categories from mobile FAB
import React, { useState, useEffect } from "react";
import axios from '../utils/axiosConfig';
import { toast } from "react-toastify";

const API_URL = process.env.REACT_APP_API_URL;

const AddCategoryModal = ({ onClose, onCategoryAdded }) => {
  const [form, setForm] = useState({
    name: "",
    description: "",
    is_active: true
  });
  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const token = localStorage.getItem("token");

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImage(file);
      setPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error("Category name is required");
      return;
    }

    try {
      setLoading(true);
      const formData = new FormData();
      formData.append("name", form.name);
      formData.append("description", form.description);
      formData.append("is_active", form.is_active);
      if (image) formData.append("image", image);

      await axios.post(`${API_URL}/admin/categories`, formData, {
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "multipart/form-data" }
      });
      
      toast.success("Category created successfully");
      if (onCategoryAdded) onCategoryAdded();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to create category");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="product-modal-overlay" onClick={onClose}>
      <div className="product-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="add-product-container" style={{ maxHeight: "90vh", overflow: "auto" }}>
          <div className="form-header">
            <h2 className="page-title">Add New Category</h2>
            <button type="button" className="back-btn" onClick={onClose}>✕</button>
          </div>

          <form onSubmit={handleSubmit} className="premium-form">
            <div className="form-section">
              <div className="form-group">
                <label>Category Name <span className="required">*</span></label>
                <input
                  type="text"
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  placeholder="e.g., Electronics, Clothing"
                  required
                />
              </div>

              <div className="form-group">
                <label>Description</label>
                <textarea
                  name="description"
                  value={form.description}
                  onChange={handleChange}
                  placeholder="Write a short description..."
                  rows="4"
                />
              </div>

              <div className="form-group">
                <label>Category Image</label>
                <div className="image-upload-grid">
                  <div className="upload-box main-upload">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      id="modal-category-image"
                      hidden
                    />
                    <label htmlFor="modal-category-image" className="preview-label">
                      {preview ? (
                        <div className="image-preview-wrapper">
                          <img src={preview} alt="Preview" className="preview-img" />
                          <button
                            type="button"
                            className="remove-image-btn"
                            onClick={() => {
                              setImage(null);
                              setPreview(null);
                            }}
                          >
                            <i className="bi bi-x-circle"></i>
                          </button>
                        </div>
                      ) : (
                        <div className="upload-placeholder">
                          <i className="bi bi-cloud-arrow-up"></i>
                          <span>Select Category Image</span>
                          <small>JPG, PNG, WEBP (Max 2MB)</small>
                        </div>
                      )}
                    </label>
                  </div>
                </div>
              </div>

              <div className="toggle-group">
                <label className="toggle-item">
                  <input
                    type="checkbox"
                    name="is_active"
                    checked={form.is_active}
                    onChange={handleChange}
                  />
                  <span>Active on Website</span>
                </label>
              </div>
            </div>

            <div className="form-actions">
              <button type="submit" className="submit-btn" disabled={loading}>
                {loading ? "Creating..." : "Create Category"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AddCategoryModal;
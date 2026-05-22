import React, { useState, useEffect } from "react";
import axios from '../utils/axiosConfig'; // Adjust path as needed
import { toast } from "react-toastify";
import "./Banners.css";

const API_URL = process.env.REACT_APP_API_URL;

const Banners = () => {
  const [activeTab, setActiveTab] = useState("hero");
  const [editingId, setEditingId] = useState(null);
  const [banner, setBanner] = useState({
    image: null,
    imagePreview: "",
    video: null,
    videoPreview: "",
    buttonLink: "/all-products",
    status: true,
    type: "hero",
    categoryId: "",
    position: ""
  });

  const [categories, setCategories] = useState([]);
  const [bannersList, setBannersList] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const token = localStorage.getItem("token");

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const catRes = await axios.get(`${API_URL}/admin/categories`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setCategories(catRes.data.categories || []);
        fetchBanners();
      } catch (err) {
        console.error("Initial fetch error", err);
      }
    };
    fetchInitialData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const fetchBanners = async () => {
    try {
      const res = await axios.get(`${API_URL}/admin/banners`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setBannersList(res.data.banners || []);
    } catch (err) {
      console.error("Fetch list error", err);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    const newValue = type === "checkbox" ? checked : value;

    setBanner(prev => {
      const updated = { ...prev, [name]: newValue };
      if (name === "categoryId" && value) {
        updated.buttonLink = `/all-products?category=${value}`;
      } else if (name === "categoryId" && !value) {
        updated.buttonLink = "/all-products";
      }
      return updated;
    });
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setBanner({ ...banner, image: file, imagePreview: URL.createObjectURL(file) });
    }
  };

  const handleVideoUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setBanner({ ...banner, video: file, videoPreview: URL.createObjectURL(file) });
    }
  };

  const handleEdit = (b) => {
    setEditingId(b.id);
    setActiveTab(b.type);
    setBanner({
      image: null,
      imagePreview: b.image_url ? `${API_URL.replace(/\/api$/, "")}${b.image_url}` : "",
      video: null,
      videoPreview: b.video_url ? `${API_URL.replace(/\/api$/, "")}${b.video_url}` : "",
      buttonLink: b.link || "",
      status: b.is_active,
      type: b.type,
      categoryId: b.category_id || "",
      position: b.position || ""
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const resetForm = () => {
    setEditingId(null);
    setBanner({
      image: null,
      imagePreview: "",
      video: null,
      videoPreview: "",
      buttonLink: "/all-products",
      status: true,
      type: activeTab,
      categoryId: "",
      position: ""
    });
  };

  const toggleStatus = async (id) => {
    try {
      await axios.put(`${API_URL}/admin/banner/${id}/toggle`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchBanners();
    } catch (err) {
      toast.error("Toggle failed");
    }
  };

  const deleteBanner = async (id) => {
    if(!window.confirm("Delete this banner?")) return;
    try {
      await axios.delete(`${API_URL}/admin/banner/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchBanners();
    } catch (err) {
      toast.error("❌ Delete failed");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const formData = new FormData();
      if (banner.image) formData.append("image", banner.image);
      if (banner.video) formData.append("video", banner.video);
      
      formData.append("title", "");
      formData.append("button_text", "");
      formData.append("link", banner.buttonLink);
      formData.append("is_active", banner.status);
      formData.append("type", activeTab);
      formData.append("position", banner.position);
      formData.append("category_id", banner.categoryId || "");

      if (editingId) {
        await axios.put(`${API_URL}/admin/banner/${editingId}`, formData, {
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "multipart/form-data" }
        });
        toast.success("✅ Banner updated successfully!");
      } else {
        await axios.post(`${API_URL}/admin/banner`, formData, {
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "multipart/form-data" }
        });
        toast.success("✅ Banner saved successfully!");
      }

      fetchBanners();
      resetForm();

    } catch (err) {
      console.error(err);
      toast.error(`❌ Failed to save banner: ${err.response?.data?.message || err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="banners-container">
      <div className="banners-header">
        <h4>Banner Management System</h4>
        <div className="tab-switcher">
          <button className={activeTab === 'hero' ? 'active' : ''} onClick={() => { setActiveTab('hero'); resetForm(); }}>
            <i className="bi bi-image-fill"></i> Hero Carousel
          </button>
          <button className={activeTab === 'mosaic' ? 'active' : ''} onClick={() => { setActiveTab('mosaic'); resetForm(); }}>
            <i className="bi bi-grid-3x3-gap-fill"></i> Wedding Mosaic
          </button>
        </div>
      </div>

      <div className="banner-grid">
        <div className="banner-form-section">
          <div className="form-card">
            <h5>{editingId ? "Edit Banner" : "Add New Banner"}</h5>
            <form onSubmit={handleSubmit} className="banner-form">
              
              <div className="form-group">
                <label><i className="bi bi-sort-numeric-down"></i> Display Order</label>
                <input 
                  type="number" 
                  name="position" 
                  value={banner.position} 
                  onChange={handleChange} 
                  placeholder="e.g. 1" 
                  required 
                />
                <small className="form-text-muted">Banners will appear in this sequence on the frontend.</small>
              </div>

              {activeTab === 'hero' ? (
                <div className="form-group">
                  <label><i className="bi bi-image"></i> Media: Image</label>
                  <input type="file" accept="image/*" onChange={handleImageUpload} required={!editingId && !banner.imagePreview} />
                </div>
              ) : (
                <div className="form-group">
                  <label><i className="bi bi-play-btn"></i> Media: Mosaic Video</label>
                  <input type="file" accept="video/*" onChange={handleVideoUpload} required={!editingId && !banner.videoPreview} />
                </div>
              )}

              <div className="form-group">
                <label><i className="bi bi-tags"></i> Link to Category</label>
                <select name="categoryId" value={banner.categoryId} onChange={handleChange}>
                  <option value="">No Category Link</option>
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Button Link</label>
                <input type="text" name="buttonLink" value={banner.buttonLink} onChange={handleChange} />
              </div>

              <div className="form-check-group">
                <label className="switch">
                  <input type="checkbox" name="status" checked={banner.status} onChange={handleChange} />
                  <span className="slider round"></span>
                </label>
                <span>Active</span>
              </div>

              <div className="form-actions-admin">
                <button type="submit" className="save-btn-new" disabled={submitting}>
                  {submitting ? (
                    <><span className="spinner-border spinner-border-sm me-2"></span> {editingId ? "Updating..." : "Creating..."}</>
                  ) : (
                    editingId ? "Update Banner" : "Create Banner"
                  )}
                </button>
                {editingId && <button type="button" className="cancel-btn" onClick={resetForm}>Cancel</button>}
              </div>
            </form>
          </div>
        </div>

        <div className="banner-preview-section">
          <h5>Live Preview</h5>
          <div className={`preview-wrapper ${activeTab === 'mosaic' ? 'mosaic-mode' : 'hero-mode'}`}>
            <div className="preview-container">
              {activeTab === 'hero' ? (
                banner.imagePreview ? <img src={banner.imagePreview} alt="Preview" /> : <div className="placeholder">No Image Loaded</div>
              ) : (
                banner.videoPreview ? <video src={banner.videoPreview} muted loop autoPlay /> : <div className="placeholder">No Video Loaded</div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="manage-section">
        <div className="manage-header">
          <h5>Existing {activeTab === 'hero' ? 'Hero Banners' : 'Wedding Mosaic'}</h5>
        </div>
        
        <div className="banners-table-view">
          {bannersList.filter(b => b.type === activeTab).length === 0 ? (
            <div className="empty-state">No {activeTab} banners found. Click 'Add New' above.</div>
          ) : (
            <div className="banners-table-responsive">
              <table className="modern-table">
                <thead>
                  <tr>
                    <th>Order/Slot</th>
                    <th>Media</th>
                    <th>Link</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {bannersList.filter(b => b.type === activeTab).sort((a,b) => a.position - b.position).map(b => (
                    <tr key={b.id}>
                      <td className="slot-cell">#{b.position}</td>
                      <td className="media-cell">
                        {b.video_url ? (
                          <div className="media-thumb vid">
                            <video src={`${API_URL.replace(/\/api$/, "")}${b.video_url}#t=0.1`} muted preload="metadata" />
                            <div className="vid-overlay"><i className="bi bi-play-fill"></i></div>
                          </div>
                        ) : (
                          <img src={`${API_URL.replace(/\/api$/, "")}${b.image_url}`} alt="thumb" />
                        )}
                      </td>
                      <td>
                        <div className="info-cell">
                          <span className="link-text">{b.link}</span>
                        </div>
                      </td>
                      <td>
                        <button className={`status-pill ${b.is_active ? 'active' : 'inactive'}`} onClick={() => toggleStatus(b.id)}>
                          {b.is_active ? 'Enabled' : 'Disabled'}
                        </button>
                      </td>
                      <td className="actions-cell">
                        <button className="edit-icon-btn" onClick={() => handleEdit(b)} title="Edit">
                          <i className="bi bi-pencil-square"></i>
                        </button>
                        <button className="delete-icon-btn" onClick={() => deleteBanner(b.id)} title="Delete">
                          <i className="bi bi-trash3"></i>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Banners;
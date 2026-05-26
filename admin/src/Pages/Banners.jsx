import React, { useState, useEffect, useCallback } from "react";
import axios from '../utils/axiosConfig';
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
    title: "",
    subtitle: "",
    buttonText: "",
    buttonLink: "/all-products",
    status: true,
    type: "hero",
    categoryId: "",
    position: ""
  });

  const [categories, setCategories] = useState([]);
  const [bannersList, setBannersList] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const token = localStorage.getItem("token");

  // Helper function to get full URL with cache busting
  const getFullUrl = (url, includeTimestamp = true) => {
    if (!url) return "";
    if (url.startsWith("http")) return url;
    const baseUrl = API_URL.replace(/\/api$/, "");
    const finalUrl = `${baseUrl}${url}`;
    if (includeTimestamp) {
      const separator = finalUrl.includes('?') ? '&' : '?';
      return `${finalUrl}${separator}_t=${Date.now()}`;
    }
    return finalUrl;
  };

  const fetchBanners = useCallback(async (forceRefresh = false) => {
    try {
      let url = `${API_URL}/admin/banners`;
      if (forceRefresh) {
        url += `?_t=${Date.now()}`;
      }
      const res = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` },
        params: { _t: Date.now() }
      });
      setBannersList(res.data.banners || []);
      setRefreshKey(prev => prev + 1);
    } catch (err) {
      console.error("Fetch list error", err);
      toast.error("Failed to fetch banners");
    }
  }, [token]);

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const catRes = await axios.get(`${API_URL}/admin/categories`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setCategories(catRes.data.categories || []);
        await fetchBanners();
      } catch (err) {
        console.error("Initial fetch error", err);
        toast.error("Failed to load initial data");
      }
    };
    fetchInitialData();
  }, [token, fetchBanners]);

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
      if (!file.type.startsWith('image/')) {
        toast.error("Please upload a valid image file");
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Image size should be less than 5MB");
        return;
      }
      setBanner({ ...banner, image: file, imagePreview: URL.createObjectURL(file) });
    }
  };

  const handleVideoUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (!file.type.startsWith('video/')) {
        toast.error("Please upload a valid video file");
        return;
      }
      if (file.size > 100 * 1024 * 1024) {
        toast.error("Video size should be less than 100MB");
        return;
      }
      setBanner({ ...banner, video: file, videoPreview: URL.createObjectURL(file) });
    }
  };

  const handleEdit = (b) => {
    setEditingId(b.id);
    setActiveTab(b.type);
    setBanner({
      image: null,
      imagePreview: b.image_url ? getFullUrl(b.image_url, false) : "",
      video: null,
      videoPreview: b.video_url ? getFullUrl(b.video_url, false) : "",
      title: b.title || "",
      subtitle: b.subtitle || "",
      buttonText: b.button_text || "",
      buttonLink: b.link || "/all-products",
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
      title: "",
      subtitle: "",
      buttonText: "",
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
      await fetchBanners(true);
      toast.success("Status updated successfully!");
    } catch (err) {
      console.error("Toggle error:", err);
      toast.error("Failed to update status");
    }
  };

  const deleteBanner = async (id) => {
    if (!window.confirm("Are you sure you want to delete this banner?")) return;
    try {
      await axios.delete(`${API_URL}/admin/banner/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      await fetchBanners(true);
      toast.success("Banner deleted successfully!");
      if (editingId === id) {
        resetForm();
      }
    } catch (err) {
      console.error("Delete error:", err);
      toast.error("Failed to delete banner");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const formData = new FormData();

      // Only append media if new files are selected
      if (banner.image) {
        formData.append("image", banner.image);
      }
      if (banner.video) {
        formData.append("video", banner.video);
      }

      // Always send text fields (they will be properly handled by backend)
      formData.append("title", banner.title || "");
      formData.append("subtitle", banner.subtitle || "");
      formData.append("button_text", banner.buttonText || "");
      formData.append("link", banner.buttonLink || "/all-products");
      formData.append("is_active", banner.status);
      formData.append("type", activeTab);
      formData.append("position", banner.position || "0");
      formData.append("category_id", banner.categoryId || "");

      let response;
      if (editingId) {
        response = await axios.put(`${API_URL}/admin/banner/${editingId}`, formData, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "multipart/form-data"
          }
        });
        toast.success("Banner updated successfully!");
      } else {
        // For create, validate media is present
        if (activeTab === 'hero' && !banner.image) {
          toast.error("Please upload an image for hero banner");
          setSubmitting(false);
          return;
        }
        if (activeTab === 'mosaic' && !banner.video) {
          toast.error("Please upload a video for mosaic banner");
          setSubmitting(false);
          return;
        }

        response = await axios.post(`${API_URL}/admin/banner`, formData, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "multipart/form-data"
          }
        });
        toast.success("Banner created successfully!");
      }

      // Force refresh banners after successful operation
      await fetchBanners(true);

      // Clear any URL object previews
      if (banner.imagePreview && banner.imagePreview.startsWith('blob:')) {
        URL.revokeObjectURL(banner.imagePreview);
      }
      if (banner.videoPreview && banner.videoPreview.startsWith('blob:')) {
        URL.revokeObjectURL(banner.videoPreview);
      }

      resetForm();

    } catch (err) {
      console.error("Submit error:", err);
      const errorMessage = err.response?.data?.message || err.message || "Failed to save banner";
      toast.error(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  // Get media thumbnail URL for display
  const getMediaThumbnail = (bannerItem) => {
    if (bannerItem.video_url) {
      return getFullUrl(bannerItem.video_url);
    }
    if (bannerItem.image_url) {
      return getFullUrl(bannerItem.image_url);
    }
    return "";
  };

  // Clean up object URLs on unmount
  useEffect(() => {
    return () => {
      if (banner.imagePreview && banner.imagePreview.startsWith('blob:')) {
        URL.revokeObjectURL(banner.imagePreview);
      }
      if (banner.videoPreview && banner.videoPreview.startsWith('blob:')) {
        URL.revokeObjectURL(banner.videoPreview);
      }
    };
  }, [banner.imagePreview, banner.videoPreview]);

  // Filter banners by type and sort by position
  const filteredBanners = bannersList
    .filter(b => b.type === activeTab)
    .sort((a, b) => (a.position || 0) - (b.position || 0));

  return (
    <div className="sett-banners-container" key={refreshKey}>
      <div className="sett-banners-header">
        <div className="sett-banners-title-wrapper">
          <h4 className="sett-banners-title">Banner Management System</h4>
          <button
            className="wallet-refresh-btn"
            onClick={() => fetchBanners(true)}
            title="Refresh banners"
          >
            <i className="bi bi-arrow-repeat"></i>
          </button>
        </div>
        <div className="sett-tab-switcher">
          <button
            className={`sett-tab-btn ${activeTab === 'hero' ? 'active' : ''}`}
            onClick={() => { setActiveTab('hero'); resetForm(); }}
          >
            <i className="bi bi-image-fill"></i> Hero Carousel
          </button>
          <button
            className={`sett-tab-btn ${activeTab === 'mosaic' ? 'active' : ''}`}
            onClick={() => { setActiveTab('mosaic'); resetForm(); }}
          >
            <i className="bi bi-grid-3x3-gap-fill"></i> Wedding Mosaic
          </button>
        </div>

      </div>

      <div className="sett-banner-grid">
        <div className="sett-banner-form-section">
          <div className="sett-form-card">
            <h5 className="sett-form-title">{editingId ? "Edit Banner" : "Add New Banner"}</h5>
            <form onSubmit={handleSubmit} className="sett-banner-form">

              <div className="sett-form-group">
                <label className="sett-label"><i className="bi bi-sort-numeric-down"></i> Display Order</label>
                <input
                  type="number"
                  name="position"
                  value={banner.position}
                  onChange={handleChange}
                  placeholder="e.g. 1"
                  className="sett-input"
                  required
                />
                <small className="sett-help-text">Banners will appear in this sequence on the frontend.</small>
              </div>

              {activeTab === 'hero' ? (
                <>
                  <div className="sett-form-group">
                    <label className="sett-label"><i className="bi bi-image"></i> Media: Image</label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="sett-file-input"
                    />
                    {banner.imagePreview && (
                      <div className="sett-media-preview">
                        <img src={banner.imagePreview} alt="Preview" />
                      </div>
                    )}
                    {editingId && !banner.image && banner.imagePreview && (
                      <small className="sett-help-text">Current image will be kept if no new file is selected</small>
                    )}
                  </div>

                  <div className="sett-form-group">
                    <label className="sett-label"><i className="bi bi-heading"></i> Title</label>
                    <input
                      type="text"
                      name="title"
                      value={banner.title}
                      onChange={handleChange}
                      placeholder="e.g., NEW BEGINNINGS"
                      className="sett-input"
                    />
                  </div>

                  <div className="sett-form-group">
                    <label className="sett-label"><i className="bi bi-text-paragraph"></i> Subtitle</label>
                    <input
                      type="text"
                      name="subtitle"
                      value={banner.subtitle}
                      onChange={handleChange}
                      placeholder="e.g., FLAT 15% OFF ON ALL SAREES"
                      className="sett-input"
                    />
                  </div>
                </>
              ) : (
                <div className="sett-form-group">
                  <label className="sett-label"><i className="bi bi-play-btn"></i> Media: Mosaic Video</label>
                  <input
                    type="file"
                    accept="video/*"
                    onChange={handleVideoUpload}
                    className="sett-file-input"
                  />
                  {banner.videoPreview && (
                    <div className="sett-media-preview">
                      <video src={banner.videoPreview} muted playsInline controls />
                    </div>
                  )}
                  {editingId && !banner.video && banner.videoPreview && (
                    <small className="sett-help-text">Current video will be kept if no new file is selected</small>
                  )}
                </div>
              )}

              <div className="sett-form-group">
                <label className="sett-label"><i className="bi bi-tags"></i> Link to Category</label>
                <select
                  name="categoryId"
                  value={banner.categoryId}
                  onChange={handleChange}
                  className="sett-select"
                >
                  <option value="">No Category Link</option>
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>

              <div className="sett-form-group">
                <label className="sett-label"><i className="bi bi-link"></i> Button Link (override)</label>
                <input
                  type="text"
                  name="buttonLink"
                  value={banner.buttonLink}
                  onChange={handleChange}
                  className="sett-input"
                />
                <small className="sett-help-text">Custom URL for the button (leave as default to use category link)</small>
              </div>

              <div className="sett-form-group">
                <label className="sett-label"><i className="bi bi-hand-index-thumb"></i> Button Text</label>
                <input
                  type="text"
                  name="buttonText"
                  value={banner.buttonText}
                  onChange={handleChange}
                  placeholder="Shop Now"
                  className="sett-input"
                />
              </div>

              <div className="sett-form-check-group">
                <label className="sett-switch">
                  <input type="checkbox" name="status" checked={banner.status} onChange={handleChange} />
                  <span className="sett-slider"></span>
                </label>
                <span className="sett-label">Active</span>
              </div>

              <div className="sett-form-actions">
                <button type="submit" className="sett-save-btn" disabled={submitting}>
                  {submitting ? (
                    <><span className="sett-spinner-border me-2"></span> {editingId ? "Updating..." : "Creating..."}</>
                  ) : (
                    editingId ? "Update Banner" : "Create Banner"
                  )}
                </button>
                {editingId && (
                  <button type="button" className="sett-cancel-btn" onClick={resetForm}>
                    Cancel
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>

        <div className="sett-banner-preview-section">
          <h5 className="sett-preview-title">Live Preview</h5>
          <div className={`sett-preview-wrapper ${activeTab === 'mosaic' ? 'mosaic-mode' : 'hero-mode'}`}>
            <div className="sett-preview-container">
              {activeTab === 'hero' ? (
                banner.imagePreview ? (
                  <img src={banner.imagePreview} alt="Preview" />
                ) : (
                  <div className="sett-placeholder">
                    <i className="bi bi-image"></i>
                    <span>No Image Loaded</span>
                  </div>
                )
              ) : (
                banner.videoPreview ? (
                  <video src={banner.videoPreview} muted loop autoPlay playsInline />
                ) : (
                  <div className="sett-placeholder">
                    <i className="bi bi-play-btn"></i>
                    <span>No Video Loaded</span>
                  </div>
                )
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="sett-manage-section">
        <div className="sett-manage-header">
          <h5 className="sett-manage-title">Existing {activeTab === 'hero' ? 'Hero Banners' : 'Wedding Mosaic'}</h5>
        </div>

        <div className="sett-banners-table-responsive">
          {filteredBanners.length === 0 ? (
            <div className="sett-empty-state">
              <i className="bi bi-image"></i>
              <div>No {activeTab} banners found. Click 'Create Banner' above to start.</div>
            </div>
          ) : (
            <table className="sett-modern-table">
              <thead>
                <tr>
                  <th>Order/Slot</th>
                  <th>Media</th>
                  <th>Title/Text</th>
                  <th>Link</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredBanners.map(b => (
                  <tr key={b.id}>
                    <td className="sett-slot-cell">#{b.position || '—'}</td>
                    <td className="sett-media-cell">
                      {b.video_url ? (
                        <div className="sett-media-thumb vid">
                          <video src={getMediaThumbnail(b)} muted preload="metadata" />
                          <div className="sett-vid-overlay"><i className="bi bi-play-fill"></i></div>
                        </div>
                      ) : b.image_url ? (
                        <div className="sett-media-thumb">
                          <img src={getMediaThumbnail(b)} alt="thumb" />
                        </div>
                      ) : (
                        <div className="sett-no-media">No media</div>
                      )}
                    </td>
                    <td className="sett-title-cell">
                      <div><strong>{b.title || '—'}</strong></div>
                      <small>{b.subtitle || b.button_text || ''}</small>
                    </td>
                    <td>
                      <span className="sett-link-text">{b.link || '-'}</span>
                    </td>
                    <td>
                      <button
                        className={`sett-status-pill ${b.is_active ? 'active' : 'inactive'}`}
                        onClick={() => toggleStatus(b.id)}
                      >
                        {b.is_active ? 'Enabled' : 'Disabled'}
                      </button>
                    </td>
                    <td className="sett-actions-cell">
                      <button className="sett-edit-icon-btn" onClick={() => handleEdit(b)} title="Edit">
                        <i className="bi bi-pencil-square"></i>
                      </button>
                      <button className="sett-delete-icon-btn" onClick={() => deleteBanner(b.id)} title="Delete">
                        <i className="bi bi-trash3"></i>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

export default Banners;
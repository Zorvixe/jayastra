import React, { useState, useEffect } from "react";
import axios from '../../utils/axiosConfig';
import { toast } from "react-toastify";

const API_URL = process.env.REACT_APP_API_URL;

const DashBanner = () => {
  const [banner, setBanner] = useState({
    url: '',
    alt: 'Dashboard Banner',
    link: ''
  });
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const userRole = localStorage.getItem("userRole");

  useEffect(() => {
    fetchBanner();
  }, []);

  const fetchBanner = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const response = await axios.get(`${API_URL}/admin/settings/dashboard-banner`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        const bannerData = response.data.banner;
        
        // Prepend backend host if it's a relative path
        if (bannerData.url && bannerData.url.startsWith("/uploads")) {
          const backendBase = API_URL ? API_URL.replace(/\/api$/, '') : '';
          bannerData.url = `${backendBase}${bannerData.url}`;
        }
        setBanner(bannerData);
      }
    } catch (error) {
      console.error("Failed to fetch banner:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error("Please upload an image file");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image size should be less than 5MB");
      return;
    }

    const formData = new FormData();
    formData.append('image', file);

    setUploading(true);
    try {
      const token = localStorage.getItem("token");
      const response = await axios.post(`${API_URL}/admin/settings/dashboard-banner/upload`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });

      if (response.data.success) {
        let uploadedUrl = response.data.url;
        
        // Format relative path for state/preview
        if (uploadedUrl && uploadedUrl.startsWith("/uploads")) {
          const backendBase = API_URL ? API_URL.replace(/\/api$/, '') : '';
          uploadedUrl = `${backendBase}${uploadedUrl}`;
        }
        
        setBanner(prev => ({ ...prev, url: uploadedUrl }));
        toast.success("Banner uploaded successfully");
      } else {
        toast.error(response.data.message || "Upload failed");
      }
    } catch (error) {
      console.error("Upload error:", error);
      toast.error(error.response?.data?.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const token = localStorage.getItem("token");
      
      // Before sending to backend, strip the base URL if present to keep stored relative path clean
      const cleanBanner = { ...banner };
      if (cleanBanner.url && API_URL) {
        const backendBase = API_URL.replace(/\/api$/, '');
        if (cleanBanner.url.startsWith(backendBase)) {
          cleanBanner.url = cleanBanner.url.replace(backendBase, '');
        }
      }

      const response = await axios.put(`${API_URL}/admin/settings/dashboard-banner`, cleanBanner, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        toast.success("Banner settings saved successfully");
      } else {
        toast.error(response.data.message || "Save failed");
      }
    } catch (error) {
      console.error("Save error:", error);
      toast.error(error.response?.data?.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async () => {
    if (!window.confirm("Are you sure you want to remove the dashboard banner?")) return;

    try {
      const token = localStorage.getItem("token");
      const response = await axios.delete(`${API_URL}/admin/settings/dashboard-banner`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        setBanner({ url: '', alt: 'Dashboard Banner', link: '' });
        toast.success("Banner removed successfully");
      } else {
        toast.error(response.data.message || "Remove failed");
      }
    } catch (error) {
      console.error("Remove error:", error);
      toast.error(error.response?.data?.message || "Remove failed");
    }
  };

  if (userRole !== 'super_admin') {
    return null;
  }

  if (loading) {
    return (
      <div className="settings-section">
        <h5 className="settings-section-title">
          <i className="bi bi-image"></i> Dashboard Banner
        </h5>
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <div className="settings-spinner"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="settings-section">
      <h5 className="settings-section-title">
        <i className="bi bi-image"></i> Dashboard Banner
      </h5>

      <div className="dashboard-banner-preview" style={{ marginBottom: '20px' }}>
        <label className="settings-label">Current Banner Preview</label>
        <div className="banner-preview-container" style={{
          border: '1px solid #e0e0e0',
          borderRadius: '8px',
          padding: '10px',
          background: '#f9f9f9',
          textAlign: 'center'
        }}>
          {banner.url ? (
            <img
              src={banner.url}
              alt={banner.alt}
              style={{
                maxWidth: '100%',
                maxHeight: '200px',
                objectFit: 'contain',
                borderRadius: '4px'
              }}
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="100" viewBox="0 0 200 100"%3E%3Crect width="200" height="100" fill="%23f0f0f0"/%3E%3Ctext x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle" fill="%23999"%3EImage not found%3C/text%3E%3C/svg%3E';
              }}
            />
          ) : (
            <div style={{
              padding: '60px 20px',
              color: '#999',
              textAlign: 'center',
              border: '2px dashed #ddd',
              borderRadius: '8px'
            }}>
              <i className="bi bi-image" style={{ fontSize: '48px' }}></i>
              <p>No banner uploaded</p>
              <p style={{ fontSize: '12px', marginTop: '10px' }}>
                Upload a banner to customize your dashboard header
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="settings-form-group">
        <label className="settings-label">Upload Banner Image</label>
        <input
          type="file"
          accept="image/*"
          onChange={handleImageUpload}
          disabled={uploading}
          className="settings-input"
          style={{ padding: '10px' }}
        />
        <small className="settings-help-text">
          Recommended size: 1200 x 300 pixels. Max size: 5MB. Supported formats: JPG, PNG, WEBP, GIF
        </small>
        {uploading && (
          <div style={{ marginTop: '10px', color: '#666' }}>
            <i className="bi bi-arrow-repeat spin"></i> Uploading...
          </div>
        )}
      </div>

      <div className="settings-form-group">
        <label className="settings-label">Banner Alt Text (SEO)</label>
        <input
          type="text"
          value={banner.alt}
          onChange={(e) => setBanner({ ...banner, alt: e.target.value })}
          placeholder="Dashboard Banner"
          className="settings-input"
        />
        <small className="settings-help-text">Alternative text for accessibility and SEO</small>
      </div>

      <div className="settings-form-group">
        <label className="settings-label">Banner Link (Optional)</label>
        <input
          type="url"
          value={banner.link}
          onChange={(e) => setBanner({ ...banner, link: e.target.value })}
          placeholder="https://example.com/promotion"
          className="settings-input"
        />
        <small className="settings-help-text">
          Add a link to make the banner clickable (e.g., to a promotion page)
        </small>
      </div>

      <div className="settings-form-actions" style={{ gap: '10px'}}>
        <button
          className="settings-save-btn"
          onClick={handleSave}
          disabled={saving}
        >
          <i className="bi bi-check-circle"></i> {saving ? "Saving..." : "Save Banner"}
        </button>

        {banner.url && (
          <button
            className="settings-reset-btn"
            onClick={handleRemove}
          >
            <i className="bi bi-trash"></i> Remove Banner
          </button>
        )}
      </div>

      <style jsx="true">{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .spin {
          animation: spin 1s linear infinite;
          display: inline-block;
        }
      `}</style>
    </div>
  );
};

export default DashBanner;
import React, { useState, useEffect } from "react";
import axios from '../utils/axiosConfig'; // Adjust path as needed
import "./Categories.css";
import { toast } from "react-toastify";

const API_URL = process.env.REACT_APP_API_URL;

// Helper: construct absolute image URL
const getImageUrl = (imagePath) => {
  if (!imagePath) return null;
  if (imagePath.startsWith("http")) return imagePath;
  let baseUrl = API_URL.replace(/\/api\/?$/, "");
  if (baseUrl.endsWith("/")) baseUrl = baseUrl.slice(0, -1);
  const cleanPath = imagePath.startsWith("/") ? imagePath : `/${imagePath}`;
  return `${baseUrl}${cleanPath}`;
};

const Categories = () => {
  const token = localStorage.getItem("token");

  const [categories, setCategories] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState(null);
  const [draggedItem, setDraggedItem] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  const [pagination, setPagination] = useState({
    totalCount: 0,
    totalPages: 1,
    currentPage: 1,
    limit: 10
  });

  const [search, setSearch] = useState("");

  const [form, setForm] = useState({
    name: "",
    description: "",
    is_active: true
  });

  const fetchCategories = async (pageOverride) => {
    try {
      setInitialLoading(true);
      const pageToFetch = pageOverride || pagination.currentPage || 1;
      const res = await axios.get(`${API_URL}/admin/categories`, {
        params: {
          page: pageToFetch,
          limit: pagination.limit || 10,
          search: search
        },
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      setCategories(
        (res.data.categories || []).map(c => ({
          ...c,
          is_active: c.is_active !== false // defaults to true
        }))
      );
      if (res.data.pagination) {
        setPagination(res.data.pagination);
      }
    } catch (err) {
      toast.error("Failed to load categories");
    } finally {
      setInitialLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories(pagination.currentPage);
  }, [pagination.currentPage]);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (pagination.currentPage !== 1) {
        setPagination(prev => ({ ...prev, currentPage: 1 }));
      } else {
        fetchCategories(1);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [search]);

  const handleDragStart = (e, index) => {
    setDraggedItem(categories[index]);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/html", e.target.parentNode);
    // Hide the default drag image slightly
    e.dataTransfer.setDragImage(e.target, 20, 20);
  };

  const handleDragOver = (index) => {
    const draggedOverItem = categories[index];
    if (draggedItem === draggedOverItem) return;
    let items = categories.filter(item => item !== draggedItem);
    items.splice(index, 0, draggedItem);
    setCategories(items);
  };

  const handleDragEnd = async () => {
    setDraggedItem(null);
    try {
      setLoading(true);
      const orderData = categories.map((cat, index) => ({
        id: cat.id,
        display_order: index
      }));
      await axios.put(`${API_URL}/admin/categories/reorder`, { order: orderData }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success("Order updated successfully");
    } catch (err) {
      toast.error("Failed to save order");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setForm({
      name: "",
      description: "",
      is_active: true
    });
    setEditId(null);
    setImage(null);
    setPreview(null);
  };

  const handleOpenAddModal = () => {
    resetForm();
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    resetForm();
  };

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

  const toggleActive = () => {
    setForm(prev => ({ ...prev, is_active: !prev.is_active }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append("name", form.name);
    formData.append("description", form.description);
    formData.append("is_active", form.is_active);
    if (image) formData.append("image", image);

    try {
      setLoading(true);
      if (editId) {
        await axios.put(`${API_URL}/admin/categories/${editId}`, formData, {
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "multipart/form-data" }
        });
        toast.success("Category updated successfully");
      } else {
        await axios.post(`${API_URL}/admin/categories`, formData, {
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "multipart/form-data" }
        });
        toast.success("Category created successfully");
      }
      fetchCategories();
      handleCloseModal();
    } catch (err) {
      toast.error(err.response?.data?.message || "Operation failed");
    } finally {
      setLoading(false);
    }
  };

  const executeDeleteCategory = async () => {
    if (!confirmDeleteId) return;
    try {
      setLoading(true);
      await axios.delete(`${API_URL}/admin/categories/${confirmDeleteId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success("Category deleted successfully");
      fetchCategories();
      setConfirmDeleteId(null);
    } catch (err) {
      toast.error("Delete failed");
      setConfirmDeleteId(null);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (cat) => {
    setEditId(cat.id);
    setForm({
      name: cat.name,
      description: cat.description || "",
      is_active: cat.is_active !== false
    });
    if (cat.image_url) {
      setPreview(getImageUrl(cat.image_url));
    } else {
      setPreview(null);
    }
    setShowModal(true);
  };

  return (
    <div className="cate-container">
      {/* Loader Overlay for actions */}
      {loading && (
        <div className="dash-loader-overlay">
          <div className="dash-loader-container">
            <div className="dash-spinner"></div>
          </div>
        </div>
      )}

      {/* HEADER & TOP ACTIONS */}
      <div className="cate-top d-flex justify-content-between align-items-center flex-wrap gap-3">
        <div>
          <h2 className="cate-page-title">Categories</h2>
          <p className="cate-page-subtitle text-muted mb-0">Manage and organize your product categories.</p>
        </div>

        <div className="d-flex align-items-center gap-3 flex-wrap">
          {/* Search Box */}
          <div className="admin-search-box" style={{ minWidth: '250px' }}>
            <i className="bi bi-search me-2 text-muted"></i>
            <input
              type="text"
              placeholder="Search categories..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="border-0 bg-transparent outline-none"
              style={{ outline: 'none', fontSize: '0.9rem' }}
            />
          </div>

          <div className="cate-drag-hint no-print">
            <i className="bi bi-arrows-move me-2"></i>Drag to reorder
          </div>
          <button className="cate-add-main-btn" onClick={handleOpenAddModal}>
            <i className="bi bi-plus-lg me-1"></i> Add Category
          </button>
        </div>
      </div>

      {/* TABLE SECTION */}
      <div className="cate-table-wrapper">
        <table className="cate-table">
          <thead>
            <tr>
              <th style={{ width: '50px' }} className="text-center"></th>
              <th style={{ width: '80px' }}>Image</th>
              <th>Name</th>
              <th>Description</th>
              <th style={{ width: '120px' }}>Status</th>
              <th style={{ width: '120px' }} className="text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {initialLoading ? (
              <tr>
                <td colSpan="6">
                  <div className="table-loader-inline py-5 text-center">
                    <div className="dash-spinner mx-auto mb-2"></div>
                    <p className="text-muted small"></p>
                  </div>
                </td>
              </tr>
            ) : categories.length === 0 ? (
              <tr className="cate-empty-row">
                <td colSpan="6">
                  <div className="cate-empty-state">
                    <i className="bi bi-folder-x mb-2 d-block"></i>
                    <p className="m-0">No categories found.</p>
                  </div>
                </td>
              </tr>
            ) : (
              categories.map((main, index) => (
                <tr
                  key={main.id}
                  className={`cate-main-row ${draggedItem === main ? 'dragging' : ''}`}
                  draggable={!search && pagination.totalPages === 1}
                  onDragStart={(e) => handleDragStart(e, index)}
                  onDragOver={(e) => { e.preventDefault(); handleDragOver(index); }}
                  onDragEnd={handleDragEnd}
                >
                  <td className="cate-drag-handle text-center">
                    {(!search && pagination.totalPages === 1) && <i className="bi bi-grid-3x2-gap-fill"></i>}
                  </td>
                  <td className="cate-image-cell">
                    {main.image_url ? (
                      <img
                        src={getImageUrl(main.image_url)}
                        alt={main.name}
                        className="cate-img-preview"
                        onError={(e) => { e.target.src = "/assets/placeholder-category.jpg"; }}
                      />
                    ) : (
                      <div className="cate-no-img-placeholder">
                        <i className="bi bi-image text-muted"></i>
                      </div>
                    )}
                  </td>
                  <td className="cate-name-cell">
                    <span className="cate-name">{main.name}</span>
                  </td>
                  <td className="cate-desc-cell">
                    <span className="cate-description">{main.description || "No description provided."}</span>
                  </td>
                  <td className="cate-status-cell">
                    <span className={`cate-badge ${main.is_active ? "cate-badge-active" : "cate-badge-inactive"}`}>
                      <span className="status-dot"></span>
                      {main.is_active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="cate-actions-cell text-center">
                    <div className="cate-action-btns">
                      <button className="cate-icon-btn edit" onClick={() => handleEdit(main)} title="Edit">
                        <i className="bi bi-pencil"></i>
                      </button>
                      <button className="cate-icon-btn delete" onClick={() => setConfirmDeleteId(main.id)} title="Delete">
                        <i className="bi bi-trash"></i>
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* Pagination Controls */}
        {!initialLoading && pagination && pagination.totalPages > 0 && (
          <div className="pagination-wrapper mt-4">
            <div className="pagination-info">
              Showing <b>{((pagination.currentPage || 1) - 1) * (pagination.limit || 10) + 1}</b> to <b>{Math.min((pagination.currentPage || 1) * (pagination.limit || 10), (pagination.totalCount || 0))}</b> of <b>{pagination.totalCount || 0}</b> categories
            </div>
            <div className="pagination-controls">
              <button
                disabled={(pagination.currentPage || 1) === 1}
                onClick={() => setPagination(prev => ({ ...prev, currentPage: (prev.currentPage || 1) - 1 }))}
              >
                <i className="bi bi-chevron-left"></i> Previous
              </button>

              {[...Array(pagination.totalPages || 1)].map((_, i) => (
                <button
                  key={i + 1}
                  className={(pagination.currentPage || 1) === i + 1 ? "active" : ""}
                  onClick={() => setPagination(prev => ({ ...prev, currentPage: i + 1 }))}
                >
                  {i + 1}
                </button>
              ))}

              <button
                disabled={(pagination.currentPage || 1) === (pagination.totalPages || 1)}
                onClick={() => setPagination(prev => ({ ...prev, currentPage: (prev.currentPage || 1) + 1 }))}
              >
                Next <i className="bi bi-chevron-right"></i>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ADD/EDIT MODAL */}
      {showModal && (
        <>
          <div className="cate-modal-backdrop" onClick={handleCloseModal}></div>
          <div className="cate-modal-wrapper">
            <div className="cate-modal-content cate-modal-lg">
              <div className="cate-modal-header">
                <div>
                  <h5 className="cate-modal-title">{editId ? "Edit Category" : "New Category"}</h5>
                  <p className="cate-modal-subtitle m-0 text-muted">{editId ? "Update the details of your category." : "Fill in the details to create a new category."}</p>
                </div>
                <button type="button" className="cate-modal-close" onClick={handleCloseModal}>
                  <i className="bi bi-x-lg"></i>
                </button>
              </div>

              <form onSubmit={handleSubmit} className="cate-modal-form">
                <div className="cate-modal-body">
                  {/* LEFT COLUMN – Form Fields */}
                  <div className="cate-fields-col">
                    <div className="cate-form-row">
                      <div className="cate-form-group flex-grow-1">
                        <label className="cate-form-label">Category Name <span className="text-danger">*</span></label>
                        <input
                          type="text"
                          name="name"
                          className="cate-form-control"
                          placeholder="e.g. Electronics, Clothing"
                          value={form.name}
                          onChange={handleChange}
                          required
                          disabled={loading}
                        />
                      </div>

                      <div className="cate-form-group">
                        <label className="cate-form-label">Visibility Status</label>
                        <div className="cate-toggle-box" onClick={!loading ? toggleActive : undefined}>
                          <div className={`cate-toggle-switch ${form.is_active ? 'active' : ''}`}>
                            <div className="cate-toggle-knob"></div>
                          </div>
                          <span className={`cate-toggle-text ${form.is_active ? 'text-success' : 'text-secondary'}`}>
                            {form.is_active ? 'Active' : 'Hidden'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="cate-form-group mt-3">
                      <label className="cate-form-label">Description <span className="text-muted fw-normal">(Optional)</span></label>
                      <textarea
                        name="description"
                        className="cate-form-control"
                        placeholder="Write a short description..."
                        value={form.description}
                        onChange={handleChange}
                        rows="5"
                        disabled={loading}
                      />
                    </div>
                  </div>

                  {/* RIGHT COLUMN – Category Image (fills remaining width & full height) */}
                  <div className="cate-image-col">
                    <label className="cate-form-label">Category Image</label>
                    <div className="cate-upload-zone">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileChange}
                        id="cate-image-input"
                        className="d-none"
                        disabled={loading}
                      />
                      <label htmlFor="cate-image-input" className={`cate-upload-label ${loading ? 'disabled' : ''}`}>
                        {preview ? (
                          <div className="cate-preview-wrap">
                            <img src={preview} alt="Preview" className="cate-preview-img" />
                            <div className="cate-preview-overlay">
                              <i className="bi bi-camera"></i>
                              <span>Change Photo</span>
                            </div>
                          </div>
                        ) : (
                          <div className="cate-upload-empty">
                            <div className="cate-upload-icon"><i className="bi bi-cloud-arrow-up"></i></div>
                            <span className="cate-upload-text">Click to browse or drag image here</span>
                            <span className="cate-upload-hint">Supports JPG, PNG, WEBP (Max 2MB)</span>
                          </div>
                        )}
                      </label>
                    </div>
                  </div>
                </div>

                <div className="cate-modal-footer">
                  <button type="button" className="cate-btn cate-btn-light" onClick={handleCloseModal} disabled={loading}>
                    Cancel
                  </button>
                  <button type="submit" className="cate-btn cate-btn-primary" disabled={loading}>
                    {loading ? (
                      <>
                        <span className="cate-btn-spinner"></span>
                        {editId ? "Saving..." : "Creating..."}
                      </>
                    ) : (
                      editId ? "Save Changes" : "Create Category"
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </>
      )}

      {/* CONFIRM DELETE MODAL */}
      {confirmDeleteId && (
        <>
          <div className="cate-modal-backdrop confirm-backdrop" onClick={() => setConfirmDeleteId(null)}></div>
          <div className="cate-confirm-wrapper">
            <div className="cate-confirm-box">
              <div className="cate-confirm-header">
                <div className="cate-confirm-icon-wrap">
                  <i className="bi bi-exclamation-triangle"></i>
                </div>
              </div>
              <h4 className="cate-confirm-title">Delete Category?</h4>
              <p className="cate-confirm-desc">This action cannot be undone. All data associated with this category might be affected.</p>
              <div className="cate-confirm-actions">
                <button className="cate-btn cate-btn-light w-100" onClick={() => setConfirmDeleteId(null)} disabled={loading}>
                  Cancel
                </button>
                <button className="cate-btn cate-btn-danger w-100" onClick={executeDeleteCategory} disabled={loading}>
                  {loading ? "Deleting..." : "Yes, Delete"}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Categories;
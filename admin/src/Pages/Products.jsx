// Products.js
import React, { useState, useEffect } from "react";
import axios from '../utils/axiosConfig'; // Adjust path as needed
import "./AdminProducts.css";
import { toast } from "react-toastify";
import AddProduct from "./AddProduct";
import EditProduct from "./EditProduct";

const API_URL = process.env.REACT_APP_API_URL;

const getImageUrl = (imagePath) => {
  if (!imagePath) return null;
  if (imagePath.startsWith("http")) return imagePath;
  let baseUrl = API_URL.replace(/\/api\/?$/, "");
  if (baseUrl.endsWith("/")) baseUrl = baseUrl.slice(0, -1);
  const cleanPath = imagePath.startsWith("/") ? imagePath : `/${imagePath}`;
  return `${baseUrl}${cleanPath}`;
};

const Products = () => {
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState([]);
  const [previewImage, setPreviewImage] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false);

  // Modal States
  const [showAddModal, setShowAddModal] = useState(false);
  const [editProductId, setEditProductId] = useState(null);

  const [pagination, setPagination] = useState({
    totalCount: 0,
    totalPages: 1,
    currentPage: 1,
    limit: 10,
  });

  useEffect(() => {
    fetchProducts(pagination.currentPage);
  }, [pagination.currentPage, filter]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (pagination.currentPage !== 1) {
        setPagination((prev) => ({ ...prev, currentPage: 1 }));
      } else {
        fetchProducts(1);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [search]);

  const fetchProducts = async (pageOverride) => {
    try {
      const token = localStorage.getItem("token");
      setLoading(true);
      const pageToFetch = pageOverride || pagination.currentPage || 1;

      const res = await axios.get(`${API_URL}/admin/products`, {
        params: {
          page: pageToFetch,
          limit: pagination.limit || 10,
          search: search,
          filter: filter,
        },
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.data.success) {
        setProducts(res.data.products || []);
        if (res.data.pagination) setPagination(res.data.pagination);
      }
    } catch (err) {
      console.error("Fetch products error:", err);
      toast.error("Failed to load products");
    } finally {
      setLoading(false);
    }
  };

  const executeDeleteProduct = async () => {
    if (!confirmDeleteId) return;
    try {
      const token = localStorage.getItem("token");
      const res = await axios.delete(`${API_URL}/admin/products/${confirmDeleteId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.data.success) {
        toast.success(res.data.message);
        fetchProducts(); 
      } else {
        toast.error(res.data.message || "Delete failed");
      }
      setConfirmDeleteId(null);
    } catch (err) {
      toast.error(err.response?.data?.message || "Delete failed");
      setConfirmDeleteId(null);
    }
  };

  const executeBulkDelete = async () => {
    try {
      const token = localStorage.getItem("token");
      await axios.post(
        `${API_URL}/admin/products/bulk-delete`,
        { ids: selected },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success(`${selected.length} products processed`);
      setSelected([]);
      fetchProducts();
      setConfirmBulkDelete(false);
    } catch (err) {
      toast.error("Bulk delete failed");
      setConfirmBulkDelete(false);
    }
  };

  const toggleSelect = (id) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const getStockStatus = (qty) => {
    if (qty === 0) return { text: "Out", class: "stock-out" };
    if (qty <= 5) return { text: "Low", class: "stock-low" };
    return { text: "OK", class: "stock-ok" };
  };

  const filteredProducts = products;

  return (
    <div className="products-container">
      <div className="products-top">
        <h2 className="page-title">Product Catalog</h2>
        <div className="actions-cluster">
          <button
            className="add-product-btn"
            onClick={() => setShowAddModal(true)}
          >
            <i className="bi bi-plus-lg"></i> Add Product
          </button>
        </div>
      </div>

      {selected.length > 0 && (
        <div className="selection-bar">
          <div className="selection-info">
            <span className="count">{selected.length}</span>
            <span className="text">products selected</span>
          </div>
          <div className="selection-actions">
            <button className="cancel-selection" onClick={() => setSelected([])}>
              Cancel
            </button>
            <button
              className="delete-selected"
              onClick={() => setConfirmBulkDelete(true)}
            >
              <i className="bi bi-trash"></i> Delete Selected
            </button>
          </div>
        </div>
      )}

      <div className="filters">
        <div className="search-box">
          <i className="bi bi-search"></i>
          <input
            type="text"
            placeholder="Search by name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          className="status-filter"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        >
          <option value="all">Status: All</option>
          <option value="active">Active Only</option>
          <option value="inactive">Inactive Only</option>
          <option value="instock">Stock: In Stock</option>
          <option value="lowstock">Stock: Low Stock</option>
          <option value="outofstock">Stock: Out of Stock</option>
        </select>
      </div>

      <div className="products-table">
        {loading ? (
          <div className="dash-loader-overlay">
            <div className="dash-loader-container">
              <div className="dash-spinner"></div>
            </div>
          </div>
        ) : (
          <>
            <div className="products-table-responsive">
              <table>
                <thead>
                  <tr>
                    <th>
                      <input
                        type="checkbox"
                        onChange={(e) => {
                          if (e.target.checked)
                            setSelected(filteredProducts.map((p) => p.id));
                          else setSelected([]);
                        }}
                      />
                    </th>
                    <th>Product</th>
                    <th>Category</th>
                    <th>Price</th>
                    <th>Potential Total Earnings</th>
                    <th>Stock</th>
                    <th>Featured</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProducts.map((product) => {
                    const stock = getStockStatus(product.stock_quantity);
                    const imageUrl = getImageUrl(product.main_image_url);
                    const feePercent = product.platform_fee_percent || 10;
                    const validPrice = Number(product.price) || 0;
                    const perUnitNet = validPrice * (1 - feePercent / 100);
                    const totalPotential = perUnitNet * (Number(product.stock_quantity) || 0);
                    return (
                      <tr key={product.id}>
                        <td>
                          <input
                            type="checkbox"
                            checked={selected.includes(product.id)}
                            onChange={() => toggleSelect(product.id)}
                          />
                        </td>
                        <td className="product-info-cell">
                          <div className="product-img-cell">
                            <img
                              src={imageUrl || "/assets/placeholder-product.jpg"}
                              alt={product.name}
                              onClick={() =>
                                setPreviewImage(
                                  imageUrl || "/assets/placeholder-product.jpg"
                                )
                              }
                              className="clickable-admin-img"
                              onError={(e) => {
                                e.target.src = "/assets/placeholder-product.jpg";
                              }}
                            />
                            <span className="product-name">{product.name}</span>
                          </div>
                        </td>
                        <td>
                          <span className="admin-category-pill">
                            {product.category_name || "Uncategorized"}
                          </span>
                        </td>
                        <td className="price-text">₹{product.price}</td>
                        <td className="potential-earn">
                          ₹{totalPotential.toFixed(2)}
                        </td>
                        <td>
                          <span className={`stock-badge ${stock.class}`}>
                            {product.stock_quantity} ({stock.text})
                          </span>
                        </td>
                        <td>
                          {product.is_featured ? (
                            <span style={{ color: "#fbbf24" }}>
                              <i className="bi bi-star-fill"></i>
                            </span>
                          ) : (
                            <span style={{ color: "#cbd5e1" }}>
                              <i className="bi bi-star"></i>
                            </span>
                          )}
                        </td>
                        <td>
                          <span
                            className={`status-badge ${
                              product.is_active ? "active" : "inactive"
                            }`}
                          >
                            {product.is_active ? "Active" : "Hidden"}
                          </span>
                        </td>
                        <td>
                          <div className="actions">
                            <button
                              className="edit-btn"
                              onClick={() => setEditProductId(product.id)}
                              title="Edit"
                            >
                              <i className="bi bi-pencil"></i>
                            </button>
                            <button
                              className="delete-btn"
                              onClick={() => setConfirmDeleteId(product.id)}
                              title="Delete"
                            >
                              <i className="bi bi-trash"></i>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {pagination && (
              <div className="pagination-wrapper">
                <div className="pagination-info">
                  Showing{" "}
                  <b>
                    {(pagination.currentPage - 1) * pagination.limit + 1}
                  </b>{" "}
                  to{" "}
                  <b>
                    {Math.min(
                      pagination.currentPage * pagination.limit,
                      pagination.totalCount
                    )}
                  </b>{" "}
                  of <b>{pagination.totalCount}</b> products
                </div>
                <div className="pagination-controls">
                  <button
                    disabled={pagination.currentPage === 1}
                    onClick={() =>
                      setPagination((prev) => ({
                        ...prev,
                        currentPage: prev.currentPage - 1,
                      }))
                    }
                  >
                    <i className="bi bi-chevron-left"></i> Previous
                  </button>
                  {[...Array(pagination.totalPages)].map((_, i) => (
                    <button
                      key={i + 1}
                      className={
                        pagination.currentPage === i + 1 ? "active" : ""
                      }
                      onClick={() =>
                        setPagination((prev) => ({
                          ...prev,
                          currentPage: i + 1,
                        }))
                      }
                    >
                      {i + 1}
                    </button>
                  ))}
                  <button
                    disabled={pagination.currentPage === pagination.totalPages}
                    onClick={() =>
                      setPagination((prev) => ({
                        ...prev,
                        currentPage: prev.currentPage + 1,
                      }))
                    }
                  >
                    Next <i className="bi bi-chevron-right"></i>
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Lightbox for Images */}
      {previewImage && (
        <div
          className="admin-lightbox-overlay"
          onClick={() => setPreviewImage(null)}
        >
          <div className="lightbox-content">
            <img
              src={previewImage}
              alt="Product Preview"
              onClick={(e) => e.stopPropagation()}
              onError={(e) => (e.target.src = "/assets/placeholder-product.jpg")}
            />
            <button
              className="close-lightbox"
              onClick={() => setPreviewImage(null)}
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {(confirmDeleteId || confirmBulkDelete) && (
        <div
          className="custom-confirm-overlay"
          onClick={() => {
            setConfirmDeleteId(null);
            setConfirmBulkDelete(false);
          }}
        >
          <div
            className="custom-confirm-box"
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="confirm-icon"
              style={{ color: "#b91c1c", background: "#fee2e2" }}
            >
              ⚠️
            </div>
            <h5>Confirm Deletion</h5>
            <p>
              {confirmBulkDelete
                ? `Are you sure you want to delete ${selected.length} products? This action cannot be undone.`
                : `Are you sure you want to delete this product? This action cannot be undone.`}
            </p>
            <div className="confirm-actions">
              <button
                className="confirm-cancel-btn"
                onClick={() => {
                  setConfirmDeleteId(null);
                  setConfirmBulkDelete(false);
                }}
              >
                Cancel
              </button>
              <button
                className="confirm-execute-btn"
                style={{ background: "#b91c1c" }}
                onClick={
                  confirmBulkDelete ? executeBulkDelete : executeDeleteProduct
                }
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Product Modal Component Overlay */}
      {showAddModal && (
        <div className="product-modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="product-modal-content" onClick={(e) => e.stopPropagation()}>
            <AddProduct 
              onClose={() => {
                setShowAddModal(false);
                fetchProducts();
              }} 
            />
          </div>
        </div>
      )}

      {/* Edit Product Modal Component Overlay */}
      {editProductId && (
        <div className="product-modal-overlay" onClick={() => setEditProductId(null)}>
          <div className="product-modal-content" onClick={(e) => e.stopPropagation()}>
            <EditProduct 
              id={editProductId} 
              onClose={() => {
                setEditProductId(null);
                fetchProducts();
              }} 
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default Products;
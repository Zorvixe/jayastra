// Products.js
import React, { useState, useEffect, useRef } from "react";
import axios from '../utils/axiosConfig';
import "./AdminProducts.css";
import { toast } from "react-toastify";
import AddProduct from "./AddProduct";
import EditProduct from "./EditProduct";

import noItemImg from "../assets/no_items.png";

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
  const userRole = localStorage.getItem("userRole")?.toLowerCase();

  const [showTransferModal, setShowTransferModal] = useState(false);
  const [transferProductId, setTransferProductId] = useState(null);
  const [selectedVendorId, setSelectedVendorId] = useState("");
  const [vendors, setVendors] = useState([]);
  const [loadingVendors, setLoadingVendors] = useState(false);


  // Frontend pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Mobile slide‑down states
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const searchRef = useRef(null);
  const filterRef = useRef(null);

  // Modal States
  const [showAddModal, setShowAddModal] = useState(false);
  const [editProductId, setEditProductId] = useState(null);

  // Close panels when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setIsSearchOpen(false);
      }
      if (filterRef.current && !filterRef.current.contains(event.target)) {
        setIsFilterOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Fetch all products once on mount
  useEffect(() => {
    fetchAllProducts();
  }, []);

  // Reset to page 1 when search or filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [search, filter]);

  const fetchAllProducts = async () => {
    try {
      const token = localStorage.getItem("token");
      setLoading(true);

      // Fetch all products – set a high limit to get everything
      const res = await axios.get(`${API_URL}/admin/products`, {
        params: {
          page: 1,
          limit: 9999, // large enough to get all products
        },
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.data.success) {
        setProducts(res.data.products || []);
      } else {
        toast.error("Failed to load products");
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
        fetchAllProducts(); // re-fetch to refresh list
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
      fetchAllProducts();
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

  const toggleSearch = () => {
    setIsSearchOpen(!isSearchOpen);
    setIsFilterOpen(false);
  };

  const toggleFilter = () => {
    setIsFilterOpen(!isFilterOpen);
    setIsSearchOpen(false);
  };

  // ----- Frontend filtering -----
  const filteredProducts = products.filter((product) => {
    const searchTerm = search.toLowerCase().trim();

    // Search match
    const matchesSearch =
      product.name?.toLowerCase().includes(searchTerm) ||
      product.sku_code?.toLowerCase().includes(searchTerm) ||
      product.product_code?.toLowerCase().includes(searchTerm) ||
      product.category_name?.toLowerCase().includes(searchTerm) ||
      product.vendor_name?.toLowerCase().includes(searchTerm) ||
      product.price?.toString().includes(searchTerm) ||
      product.stock_quantity?.toString().includes(searchTerm) ||
      product.description?.toLowerCase().includes(searchTerm);

    if (!matchesSearch) return false;

    // Filter match
    switch (filter) {
      case "active":
        return product.is_active === true;
      case "inactive":
        return product.is_active === false;
      case "instock":
        return product.stock_quantity > 0;
      case "lowstock":
        return product.stock_quantity > 0 && product.stock_quantity <= 5;
      case "outofstock":
        return product.stock_quantity === 0;
      default:
        return true;
    }
  });

  // ----- Frontend pagination -----
  const totalItems = filteredProducts.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, totalItems);
  const currentItems = filteredProducts.slice(startIndex, endIndex);


  const openTransferModal = async (productId) => {
    setTransferProductId(productId);
    setShowTransferModal(true);
    setSelectedVendorId("");
    setLoadingVendors(true);
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(`${API_URL}/admin/vendors`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setVendors(res.data.users || []);
    } catch (err) {
      toast.error("Failed to fetch vendors");
    } finally {
      setLoadingVendors(false);
    }
  };

  // Function to execute transfer
  const handleTransfer = async () => {
    if (!selectedVendorId) {
      toast.error("Please select a vendor");
      return;
    }
    try {
      const token = localStorage.getItem("token");
      await axios.put(
        `${API_URL}/admin/products/${transferProductId}/transfer`,
        { vendor_id: selectedVendorId },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success("Product transferred successfully");
      setShowTransferModal(false);
      fetchAllProducts(); // refresh list
    } catch (err) {
      toast.error(err.response?.data?.message || "Transfer failed");
    }
  };

  // ----- Render -----
  return (
    <div className="products-container">
      <div className="products-top">
        <h2 className="page-title">Products</h2>
        <div className="prod-mobile-filter">
          <button
            className="mobile-icon-btn search-toggle"
            onClick={toggleSearch}
            aria-label="Search"
          >
            <i className="bi bi-search"></i>
          </button>
          <button
            className="mobile-icon-btn filter-toggle"
            onClick={toggleFilter}
            aria-label="Filter"
          >
            <i className="bi bi-sliders2"></i>
          </button>
        </div>
        <div className="actions-cluster">
          <div className="filters-prod">
            {/* Desktop search & filter */}
            <div className="desktop-search">
              <i className="bi bi-search"></i>
              <input
                type="text"
                placeholder="Search Name, SKU, Product Code, Price..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div>
              <select
                className="desktop-filter"
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
          </div>
          <button
            className="add-product-btn"
            onClick={() => setShowAddModal(true)}
          >
            <i className="bi bi-plus-lg"></i>
            <span className="add-btn-text">Add Product</span>
          </button>
        </div>
      </div>

      {/* Mobile Search Slide‑down */}
      {isSearchOpen && (
        <div className="mobile-search-slide" ref={searchRef}>
          <div className="slide-content">
            <i className="bi bi-search"></i>
            <input
              type="text"
              placeholder="Search Name, SKU, Product Code, Price..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <button className="slide-close" onClick={() => setIsSearchOpen(false)}>
              <i className="bi bi-x-lg"></i>
            </button>
          </div>
        </div>
      )}

      {/* Mobile Filter Slide‑down */}
      {isFilterOpen && (
        <div className="mobile-filter-slide" ref={filterRef}>
          <div className="slide-content">
            <i className="bi bi-funnel"></i>
            <select
              value={filter}
              onChange={(e) => {
                setFilter(e.target.value);
                setIsFilterOpen(false);
              }}
            >
              <option value="all">All</option>
              <option value="active">Active Only</option>
              <option value="inactive">Inactive Only</option>
              <option value="instock">In Stock</option>
              <option value="lowstock">Low Stock</option>
              <option value="outofstock">Out of Stock</option>
            </select>
            <button className="slide-close" onClick={() => setIsFilterOpen(false)}>
              <i className="bi bi-x-lg"></i>
            </button>
          </div>
        </div>
      )}

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

      <div className="products-table">
        {loading ? (
          <div className="dash-loader-overlay">
            <div className="dash-loader-container">
              <div className="dash-spinner"></div>
            </div>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="no-products-state">
            <img src={noItemImg} alt="No products" className="no-products-image" />
            <div className="no-products-message">
              <h3>No products found</h3>
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
                            setSelected(currentItems.map((p) => p.id));
                          else setSelected([]);
                        }}
                        checked={currentItems.every((p) => selected.includes(p.id))}
                      />
                    </th>
                    <th>Product</th>
                    <th>Name</th>
                    {userRole === 'super_admin' && <th>Owner</th>}
                    <th>Category</th>
                    <th>Price</th>
                    <th>Earnings</th>
                    <th>Stock</th>
                    <th>Featured</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {currentItems.map((product) => {
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

                          </div>
                        </td>
                        <td>
                          <span className="product-name">{product.name}</span>
                        </td>
                        {userRole === 'super_admin' && (
                          <td>
                            <span className="vendor-pill">
                              {product.vendor_name || "Unknown Vendor"}
                            </span>
                          </td>
                        )}
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
                            className={`status-badge ${product.is_active ? "active" : "inactive"}`}
                          >
                            {product.is_active ? "Active" : "Inactive"}
                          </span>
                        </td>
                        <td>
                          <div className="actions">
                            <button
                              className="edit-btn-prod"
                              onClick={() => setEditProductId(product.id)}
                              title="Edit"
                            >
                              <i className="bi bi-pencil"></i>
                            </button>
                            <button
                              className="delete-btn-prod"
                              onClick={() => setConfirmDeleteId(product.id)}
                              title="Delete"
                            >
                              <i className="bi bi-trash"></i>
                            </button>
                            {userRole === 'super_admin' && (
                              <button
                                className="transfer-btn-prod"
                                onClick={() => openTransferModal(product.id)}
                                title="Transfer Ownership"
                              >
                                <i className="bi bi-arrow-left-right"></i>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Transfer Modal */}
            {showTransferModal && (
              <div className="custom-confirm-overlay" onClick={() => setShowTransferModal(false)}>
                <div className="custom-confirm-box" onClick={(e) => e.stopPropagation()}>
                  <div className="confirm-icon" style={{ color: "#2563eb", background: "#dbeafe" }}>
                    <i className="bi bi-arrow-left-right"></i>
                  </div>
                  <h5>Transfer Product Ownership</h5>
                  <p>Select the new vendor for this product. This action will change the product's ownership.</p>
                  {loadingVendors ? (
                    <div className="dash-loader-container" style={{ padding: "20px" }}>
                      <div className="dash-spinner"></div>
                    </div>
                  ) : (
                    <>
                      <select
                        value={selectedVendorId}
                        onChange={(e) => setSelectedVendorId(e.target.value)}
                        className="transfer-vendor-select"
                      >
                        <option value="">-- Select Vendor --</option>
                        {vendors.map((vendor) => (
                          <option key={vendor.id} value={vendor.id}>
                            {vendor.store_name || vendor.name} ({vendor.email})
                          </option>
                        ))}
                      </select>
                      <div className="confirm-actions" style={{ marginTop: "20px" }}>
                        <button className="confirm-cancel-btn" onClick={() => setShowTransferModal(false)}>
                          Cancel
                        </button>
                        <button
                          className="confirm-execute-btn"
                          style={{ background: "#2563eb" }}
                          onClick={handleTransfer}
                          disabled={!selectedVendorId}
                        >
                          Transfer
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Frontend Pagination */}
            {totalItems > 0 && (
              <div className="pagination-wrapper">
                <div className="pagination-info">
                  Showing <b>{startIndex + 1}</b> to <b>{endIndex}</b> of{" "}
                  <b>{totalItems}</b> products
                </div>
                <div className="pagination-controls">
                  <button
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage((prev) => prev - 1)}
                  >
                    <i className="bi bi-chevron-left"></i> Previous
                  </button>
                  {[...Array(totalPages)].map((_, i) => (
                    <button
                      key={i + 1}
                      className={currentPage === i + 1 ? "active" : ""}
                      onClick={() => setCurrentPage(i + 1)}
                    >
                      {i + 1}
                    </button>
                  ))}
                  <button
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage((prev) => prev + 1)}
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

      {/* Add Product Modal */}
      {showAddModal && (
        <div className="product-modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="product-modal-content" onClick={(e) => e.stopPropagation()}>
            <AddProduct
              onClose={() => {
                setShowAddModal(false);
                fetchAllProducts();
              }}
            />
          </div>
        </div>
      )}

      {/* Edit Product Modal */}
      {editProductId && (
        <div className="product-modal-overlay" onClick={() => setEditProductId(null)}>
          <div className="product-modal-content" onClick={(e) => e.stopPropagation()}>
            <EditProduct
              id={editProductId}
              onClose={() => {
                setEditProductId(null);
                fetchAllProducts();
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default Products;
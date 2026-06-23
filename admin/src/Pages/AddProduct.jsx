// AddProduct.js - Complete with category creation modal
import React, { useState, useEffect } from "react";
import axios from '../utils/axiosConfig';
import "./AddProduct.css";
import { toast } from "react-toastify";
import RichTextEditor from "./RichTextEditor";

const API_URL = process.env.REACT_APP_API_URL;

const AddProduct = ({ onClose }) => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [description, setDescription] = useState("");

  const [skuAvailable, setSkuAvailable] = useState(true);
  const [skuChecking, setSkuChecking] = useState(false);
  const [skuMessage, setSkuMessage] = useState("");

  const [productCodeAvailable, setProductCodeAvailable] = useState(true);
  const [productCodeChecking, setProductCodeChecking] = useState(false);
  const [productCodeMessage, setProductCodeMessage] = useState("");
  const [isSkuManuallyEdited, setIsSkuManuallyEdited] = useState(false);
  const [globalPlatformFee, setGlobalPlatformFee] = useState(10.00);

  // Category modal states
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [categoryForm, setCategoryForm] = useState({
    name: "",
    description: "",
    is_active: true
  });
  const [categoryImage, setCategoryImage] = useState(null);
  const [categoryPreview, setCategoryPreview] = useState(null);
  const [categoryLoading, setCategoryLoading] = useState(false);

  const [product, setProduct] = useState({
    name: "",
    description: "",
    price: "",
    old_price: "",
    category_id: "",
    stock_quantity: "",
    sku: "",
    product_code: "",
    is_featured: false,
    is_active: true,
    color: "",
    weight: "",
    length: "",
    width: "",
    height: "",
    platform_fee_percent: 10.00,
  });

  const [mainImage, setMainImage] = useState(null);
  const [mainPreview, setMainPreview] = useState(null);
  const [video, setVideo] = useState(null);
  const [videoPreview, setVideoPreview] = useState(null);
  const [galleryImages, setGalleryImages] = useState([]);
  const [galleryPreview, setGalleryPreview] = useState([]);

  const [suggestingSku, setSuggestingSku] = useState(false);
  const [suggestingCode, setSuggestingCode] = useState(false);

  useEffect(() => {
    const fetchGlobalFee = async () => {
      try {
        const res = await axios.get(`${API_URL}/settings/platform-fee`);
        if (res.data.success) {
          setGlobalPlatformFee(res.data.platform_fee_percent);
          setProduct(prev => ({ ...prev, platform_fee_percent: res.data.platform_fee_percent }));
        }
      } catch (err) {
        console.error("Failed to fetch platform fee", err);
      }
    };
    fetchGlobalFee();
    fetchCategories();
    fetchNextPID();
  }, []);

  useEffect(() => {
    if (!isSkuManuallyEdited && product.name && product.name.trim().length > 0) {
      const timer = setTimeout(() => {
        suggestUniqueSku(true);
      }, 600);
      return () => clearTimeout(timer);
    }
  }, [product.name, isSkuManuallyEdited]);

  const fetchNextPID = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(`${API_URL}/admin/products/next-available-code`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.data.success && res.data.nextId) {
        setProduct((prev) => ({ ...prev, product_code: res.data.nextId }));
      } else {
        setProduct((prev) => ({ ...prev, product_code: "JAYA-001" }));
      }
    } catch (err) {
      console.error("PID fetch error", err);
      setProduct((prev) => ({ ...prev, product_code: "JAYA-001" }));
    }
  };

  const suggestUniqueSku = async (silent = false) => {
    setSuggestingSku(true);
    try {
      const token = localStorage.getItem("token");
      let base = product.name
        ? product.name.substring(0, 6).toUpperCase().replace(/[^A-Z]/g, "")
        : "SKU";
      if (base.length < 2) base = "SKU";
      const res = await axios.get(`${API_URL}/admin/products/suggest-sku`, {
        params: { base },
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.data.success && res.data.suggestedSku) {
        const newSku = res.data.suggestedSku;
        setProduct((prev) => ({ ...prev, sku: newSku }));
        checkSkuAvailability(newSku);
        if (!silent) toast.info(`Suggested SKU: ${newSku}`);
      } else if (!silent) {
        toast.error("Could not generate a unique SKU");
      }
    } catch (err) {
      if (!silent) toast.error("Failed to suggest SKU");
    } finally {
      setSuggestingSku(false);
    }
  };

  const suggestUniqueProductCode = async () => {
    setSuggestingCode(true);
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(`${API_URL}/admin/products/next-available-code`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.data.success && res.data.nextId) {
        const newCode = res.data.nextId;
        setProduct((prev) => ({ ...prev, product_code: newCode }));
        checkProductCodeAvailability(newCode);
        toast.info(`Suggested Product Code: ${newCode}`);
      } else {
        toast.error("Could not generate a unique product code");
      }
    } catch (err) {
      toast.error("Failed to suggest product code");
    } finally {
      setSuggestingCode(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(`${API_URL}/admin/categories`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { limit: 100 }
      });
      setCategories(res.data.categories || []);
    } catch (err) {
      toast.error("Failed to load categories");
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setProduct((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleDescriptionChange = (value) => {
    setDescription(value);
    setProduct((prev) => ({ ...prev, description: value }));
  };

  const handleMainImage = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file");
      return;
    }
    
    setMainImage(file);
    setMainPreview(URL.createObjectURL(file));
  };

  const handleVideo = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith("video/")) {
      toast.error("Please upload a video file");
      return;
    }
    
    setVideo(file);
    setVideoPreview(URL.createObjectURL(file));
  };

  const handleGalleryImages = (e) => {
    const files = Array.from(e.target.files);
    if (galleryImages.length + files.length > 10) {
      toast.warning("You can upload up to 10 images. Please select fewer.");
      return;
    }
    const validFiles = files.filter((file) => {
      if (!file.type.startsWith("image/")) {
        toast.error(`${file.name} is not an image file`);
        return false;
      }
     
      return true;
    });
    setGalleryImages((prev) => [...prev, ...validFiles]);
    const previews = validFiles.map((file) => URL.createObjectURL(file));
    setGalleryPreview((prev) => [...prev, ...previews]);
  };

  const removeGalleryImage = (index) => {
    setGalleryImages((prev) => prev.filter((_, i) => i !== index));
    setGalleryPreview((prev) => prev.filter((_, i) => i !== index));
  };

  const removeMainImage = () => {
    setMainImage(null);
    if (mainPreview) {
      URL.revokeObjectURL(mainPreview);
    }
    setMainPreview(null);
  };

  const removeVideo = () => {
    setVideo(null);
    if (videoPreview) {
      URL.revokeObjectURL(videoPreview);
    }
    setVideoPreview(null);
  };

  // Category Modal Handlers
  const handleOpenCategoryModal = () => {
    setCategoryForm({
      name: "",
      description: "",
      is_active: true
    });
    setCategoryImage(null);
    setCategoryPreview(null);
    setShowCategoryModal(true);
  };

  const handleCloseCategoryModal = () => {
    setShowCategoryModal(false);
    setCategoryForm({
      name: "",
      description: "",
      is_active: true
    });
    setCategoryImage(null);
    setCategoryPreview(null);
  };

  const handleCategoryChange = (e) => {
    const { name, value, type, checked } = e.target;
    setCategoryForm(prev => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value
    }));
  };

  const handleCategoryImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (!file.type.startsWith("image/")) {
        toast.error("Please upload an image file");
        return;
      }
      
      setCategoryImage(file);
      setCategoryPreview(URL.createObjectURL(file));
    }
  };

  const toggleCategoryActive = () => {
    setCategoryForm(prev => ({ ...prev, is_active: !prev.is_active }));
  };

  const handleCreateCategory = async (e) => {
    e.preventDefault();
    
    if (!categoryForm.name.trim()) {
      toast.error("Category name is required");
      return;
    }

    try {
      setCategoryLoading(true);
      const token = localStorage.getItem("token");
      const formData = new FormData();
      formData.append("name", categoryForm.name.trim());
      formData.append("description", categoryForm.description);
      formData.append("is_active", categoryForm.is_active);
      if (categoryImage) formData.append("image", categoryImage);

      const res = await axios.post(`${API_URL}/admin/categories`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data"
        }
      });

      if (res.data.success || res.data.category) {
        const newCategory = res.data.category || res.data;
        toast.success(`Category "${newCategory.name}" created successfully! This category is now available globally.`);
        
        // Refresh categories list
        await fetchCategories();
        
        // Auto-select the newly created category
        setProduct(prev => ({ ...prev, category_id: newCategory.id }));
        
        // Close modal
        handleCloseCategoryModal();
      } else {
        toast.error("Failed to create category");
      }
    } catch (err) {
      console.error("Category creation error:", err);
      toast.error(err.response?.data?.message || "Failed to create category");
    } finally {
      setCategoryLoading(false);
    }
  };

  const checkSkuAvailability = async (skuValue) => {
    if (!skuValue || skuValue.trim() === "") {
      setSkuAvailable(true);
      setSkuMessage("");
      return;
    }
    setSkuChecking(true);
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(`${API_URL}/admin/products/check-sku`, {
        params: { sku: skuValue.trim() },
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.data.exists) {
        setSkuAvailable(false);
        setSkuMessage("❌ SKU already exists.");
      } else {
        setSkuAvailable(true);
        setSkuMessage("✅ SKU is available.");
      }
    } catch (err) {
      setSkuAvailable(false);
      setSkuMessage("⚠️ Error checking SKU availability.");
    } finally {
      setSkuChecking(false);
    }
  };

  const checkProductCodeAvailability = async (codeValue) => {
    if (!codeValue || codeValue.trim() === "") {
      setProductCodeAvailable(true);
      setProductCodeMessage("");
      return;
    }
    setProductCodeChecking(true);
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(`${API_URL}/admin/products/check-product-code`, {
        params: { code: codeValue.trim() },
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.data.exists) {
        setProductCodeAvailable(false);
        setProductCodeMessage("❌ Product Code already exists.");
      } else {
        setProductCodeAvailable(true);
        setProductCodeMessage("✅ Product Code is available.");
      }
    } catch (err) {
      setProductCodeAvailable(false);
      setProductCodeMessage("⚠️ Error checking product code.");
    } finally {
      setProductCodeChecking(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!product.name.trim()) return toast.error("Product name is required");
    if (!mainImage) return toast.error("Main image is required");
    if (!product.category_id) return toast.error("Category is required");
    if (!product.price || product.price <= 0)
      return toast.error("Valid price is required");
    if (!product.sku.trim()) return toast.error("SKU is required");
    if (!product.product_code.trim())
      return toast.error("Product code is required");
    if (!skuAvailable) {
      toast.error("Please choose a different SKU. The current SKU is already taken.");
      return;
    }
    if (!productCodeAvailable) {
      toast.error(
        "Please choose a different Product Code. The current code is already taken."
      );
      return;
    }

    try {
      setLoading(true);
      const token = localStorage.getItem("token");

      const formData = new FormData();
      formData.append("name", product.name.trim());
      formData.append("description", product.description || "");
      formData.append("price", Number(product.price));
      formData.append("category_id", Number(product.category_id));
      formData.append("sku", product.sku.trim());
      formData.append("product_code", product.product_code.trim());
      if (product.old_price)
        formData.append("old_price", Number(product.old_price));
      if (product.stock_quantity)
        formData.append("stock_quantity", Number(product.stock_quantity));
      formData.append("is_featured", product.is_featured);
      formData.append("is_active", product.is_active);
      formData.append("image", mainImage);
      if (video) formData.append("video", video);
      formData.append("color", product.color || "");
      if (product.weight) formData.append("weight", product.weight);
      if (product.length) formData.append("length", product.length);
      if (product.width) formData.append("width", product.width);
      if (product.height) formData.append("height", product.height);
      formData.append(
        "platform_fee_percent",
        product.platform_fee_percent || 10
      );

      const res = await axios.post(`${API_URL}/admin/products`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data",
        },
      });

      if (galleryImages.length > 0) {
        const productId = res.data.product.id;
        const imgData = new FormData();
        galleryImages.forEach((img) => imgData.append("images", img));
        await axios.post(`${API_URL}/admin/products/${productId}/images`, imgData, {
          headers: { Authorization: `Bearer ${token}` },
        });
      }

      toast.success("Product added successfully");
      onClose();
    } catch (err) {
      console.error("Product creation error:", err);
      toast.error(err.response?.data?.message || "Product creation failed");
    } finally {
      setLoading(false);
    }
  };

  const feePercent = Number(product.platform_fee_percent) || 0;
  const priceVal = Number(product.price) || 0;
  const stockVal = Number(product.stock_quantity) || 0;
  const perUnitPlatformFee = (priceVal * feePercent) / 100;
  const perUnitVendorEarning = priceVal - perUnitPlatformFee;
  const totalPlatformFee = perUnitPlatformFee * stockVal;
  const totalVendorEarning = perUnitVendorEarning * stockVal;

  return (
    <>
      <div className="add-prod-container">
        <div className="add-prod-form-header">
          <h2 className="add-prod-page-title">Add New Product</h2>
          <button type="button" className="add-prod-back-btn" onClick={onClose}>
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="add-prod-premium-form">
          <div className="add-prod-form-section">
            <h4 className="add-prod-section-title">General Information</h4>
            <div className="add-prod-form-group">
              <label>Product Name <span className="add-prod-required">*</span></label>
              <input
                type="text"
                name="name"
                placeholder="e.g. Premium Silk Saree"
                value={product.name}
                onChange={handleChange}
                required
              />
            </div>

            <div className="add-prod-form-row">
              <div className="add-prod-form-group" style={{ position: "relative" }}>
                <div className="add-prod-code-rows">
                  <label>SKU (Stock Keeping Unit) <span className="add-prod-required">*</span></label>
                  <div>
                    {skuChecking && <small className="add-prod-text-muted">Checking...</small>}
                    {!skuChecking && skuMessage && (
                      <small
                        className={skuAvailable ? "add-prod-text-success" : "add-prod-text-danger"}
                        style={{ display: "block", marginTop: "5px" }}
                      >
                        {skuMessage}
                      </small>
                    )}
                  </div>
                </div>
                <div style={{ display: "flex", gap: "8px" }}>
                  <input
                    type="text"
                    name="sku"
                    value={product.sku}
                    onChange={(e) => {
                      handleChange(e);
                      setIsSkuManuallyEdited(true);
                      checkSkuAvailability(e.target.value);
                    }}
                    onBlur={(e) => checkSkuAvailability(e.target.value)}
                    required
                    style={{ flex: 1 }}
                  />
                  <button
                    type="button"
                    className="add-prod-btn-suggest"
                    onClick={() => suggestUniqueSku(false)}
                    disabled={suggestingSku || !product.name}
                    title="Generate a unique SKU based on product name"
                  >
                    {suggestingSku ? (
                      <i className="bi bi-hourglass-split"></i>
                    ) : (
                      <i className="bi bi-magic"></i>
                    )}{" "}
                    Suggest
                  </button>
                </div>
              </div>

              <div className="add-prod-form-group" style={{ position: "relative" }}>
                <div className="add-prod-code-rows">
                  <label>Product Code (Serial) <span className="add-prod-required">*</span></label>
                  <div>
                    {productCodeChecking && <small className="add-prod-text-muted">Checking...</small>}
                    {!productCodeChecking && productCodeMessage && (
                      <small
                        className={productCodeAvailable ? "add-prod-text-success" : "add-prod-text-danger"}
                        style={{ display: "block", marginTop: "5px" }}
                      >
                        {productCodeMessage}
                      </small>
                    )}
                  </div>
                </div>
                <div style={{ display: "flex", gap: "8px" }}>
                  <input
                    type="text"
                    name="product_code"
                    value={product.product_code}
                    onChange={(e) => {
                      handleChange(e);
                      checkProductCodeAvailability(e.target.value);
                    }}
                    onBlur={(e) => checkProductCodeAvailability(e.target.value)}
                    required
                    style={{ flex: 1 }}
                  />
                  <button
                    type="button"
                    className="add-prod-btn-suggest"
                    onClick={suggestUniqueProductCode}
                    disabled={suggestingCode}
                    title="Get next available product code"
                  >
                    {suggestingCode ? (
                      <i className="bi bi-hourglass-split"></i>
                    ) : (
                      <i className="bi bi-magic"></i>
                    )}{" "}
                    Suggest
                  </button>
                </div>
              </div>
            </div>

            <div className="add-prod-form-row">
              <div className="add-prod-form-group">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                  <label>Category <span className="add-prod-required">*</span></label>
                  <button
                    type="button"
                    className="add-prod-btn-suggest"
                    onClick={handleOpenCategoryModal}
                    style={{ padding: "4px 12px", fontSize: "12px" }}
                  >
                    <i className="bi bi-plus-lg"></i> New Category
                  </button>
                </div>
                <select
                  name="category_id"
                  value={product.category_id}
                  onChange={handleChange}
                  required
                >
                  <option value="">Select Category</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name} {!cat.is_active && "(Inactive)"}
                    </option>
                  ))}
                </select>
                <small className="add-prod-text-muted" style={{ display: "block", marginTop: "5px" }}>
                  <i className="bi bi-info-circle"></i> Categories are global and shared across all vendors.
                </small>
              </div>
              <div className="add-prod-form-group">
                <label>Color</label>
                <input
                  type="text"
                  name="color"
                  placeholder="e.g. Red, Blue, Multicolor"
                  value={product.color}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div className="add-prod-form-group">
              <label>Description</label>
              <RichTextEditor
                value={description}
                onChange={handleDescriptionChange}
                placeholder="Write a detailed description of the product..."
                height={300}
              />
            </div>
          </div>

          <div className="add-prod-form-section">
            <h4 className="add-prod-section-title">Pricing, Commission & Stock</h4>
            <div className="add-prod-form-row">
              <div className="add-prod-form-group">
                <label>Selling Price (₹) <span className="add-prod-required">*</span></label>
                <input
                  type="number"
                  step="0.01"
                  name="price"
                  placeholder="0.00"
                  value={product.price}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="add-prod-form-group">
                <label>Old Price (₹)</label>
                <input
                  type="number"
                  step="0.01"
                  name="old_price"
                  placeholder="0.00"
                  value={product.old_price}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div className="add-prod-form-row">
              <div className="add-prod-form-group">
                <label>Platform Fee (%) <span className="add-prod-required">*</span></label>
                <input
                  type="text"
                  value={`${globalPlatformFee}.00%`}
                  disabled
                  className="add-prod-platform-fee-display"
                />
              </div>
              <div className="add-prod-form-group">
                <label>Stock Quantity</label>
                <input
                  type="number"
                  name="stock_quantity"
                  placeholder="0"
                  value={product.stock_quantity}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div className="add-prod-earning-breakdown">
              <div className="add-prod-form-row">
                <div className="add-prod-form-group">
                  <label>Platform Fee per unit</label>
                  <input
                    type="text"
                    value={`₹${perUnitPlatformFee.toFixed(2)}`}
                    disabled
                    className="add-prod-fee-input"
                  />
                </div>
                <div className="add-prod-form-group">
                  <label>Your Earnings per unit</label>
                  <input
                    type="text"
                    value={`₹${perUnitVendorEarning.toFixed(2)}`}
                    disabled
                    className="add-prod-earn-input"
                  />
                </div>
              </div>

              <div className="add-prod-form-row add-prod-total-row">
                <div className="add-prod-form-group">
                  <label>Total Platform Fee (for all stock)</label>
                  <input
                    type="text"
                    value={`₹${totalPlatformFee.toFixed(2)}`}
                    disabled
                    className="add-prod-fee-total"
                  />
                </div>
                <div className="add-prod-form-group">
                  <label>Total Your Earnings (for all stock)</label>
                  <input
                    type="text"
                    value={`₹${totalVendorEarning.toFixed(2)}`}
                    disabled
                    className="add-prod-earn-total"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="add-prod-form-section">
            <h4 className="add-prod-section-title">Shipping Details (Shiprocket)</h4>
            <p className="add-prod-section-subtitle">
              Leave blank to use defaults (0.7kg, 30x20x5cm)
            </p>
            <div className="add-prod-form-row">
              <div className="add-prod-form-group">
                <label>Weight (kg)</label>
                <input
                  type="number"
                  step="0.01"
                  name="weight"
                  placeholder="0.7"
                  value={product.weight}
                  onChange={handleChange}
                />
              </div>
              <div className="add-prod-form-group">
                <label>Length (cm)</label>
                <input
                  type="number"
                  step="0.1"
                  name="length"
                  placeholder="30"
                  value={product.length}
                  onChange={handleChange}
                />
              </div>
            </div>
            <div className="add-prod-form-row">
              <div className="add-prod-form-group">
                <label>Width (cm)</label>
                <input
                  type="number"
                  step="0.1"
                  name="width"
                  placeholder="20"
                  value={product.width}
                  onChange={handleChange}
                />
              </div>
              <div className="add-prod-form-group">
                <label>Height (cm)</label>
                <input
                  type="number"
                  step="0.1"
                  name="height"
                  placeholder="5"
                  value={product.height}
                  onChange={handleChange}
                />
              </div>
            </div>
          </div>

          <div className="add-prod-form-section">
            <h4 className="add-prod-section-title">Images & Video</h4>

            <div className="add-prod-form-row">
              <div className="add-prod-form-group">
                <label>Main Image <span className="add-prod-required">*</span></label>
                <div className="add-prod-image-upload-grid">
                  <div className="add-prod-upload-box add-prod-main-upload">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleMainImage}
                      id="main-image-input"
                      hidden
                    />
                    <label htmlFor="main-image-input" className="add-prod-preview-label">
                      {mainPreview ? (
                        <div className="add-prod-image-preview-wrapper">
                          <img src={mainPreview} alt="Preview" className="add-prod-preview-img" />
                          <button
                            type="button"
                            className="add-prod-remove-image-btn"
                            onClick={removeMainImage}
                          >
                            <i className="bi bi-x-circle"></i>
                          </button>
                        </div>
                      ) : (
                        <div className="add-prod-upload-placeholder">
                          <i className="bi bi-cloud-arrow-up"></i>
                          <span>Select Main Image</span>
                          <small>JPG, PNG, WEBP (Max 5MB)</small>
                        </div>
                      )}
                    </label>
                  </div>
                </div>
              </div>

              <div className="add-prod-form-group">
                <label>Product Video (Optional)</label>
                <div className="add-prod-image-upload-grid">
                  <div className="add-prod-upload-box add-prod-main-upload">
                    <input
                      type="file"
                      accept="video/*"
                      onChange={handleVideo}
                      id="video-input"
                      hidden
                    />
                    <label htmlFor="video-input" className="add-prod-preview-label">
                      {videoPreview ? (
                        <div className="add-prod-video-preview-wrapper">
                          <video src={videoPreview} className="add-prod-preview-img" muted />
                          <div className="add-prod-video-overlay">
                            <i className="bi bi-play-circle"></i>
                          </div>
                          <button
                            type="button"
                            className="add-prod-remove-video-btn"
                            onClick={removeVideo}
                          >
                            <i className="bi bi-x-circle"></i>
                          </button>
                        </div>
                      ) : (
                        <div className="add-prod-upload-placeholder">
                          <i className="bi bi-play-btn"></i>
                          <span>Select Video</span>
                          <small>MP4, WebM (Max 50MB)</small>
                        </div>
                      )}
                    </label>
                  </div>
                </div>
              </div>
            </div>

            <div className="add-prod-form-group">
              <label>Gallery Images (Optional - Max 10 images)</label>
              <div className="add-prod-image-upload-grid add-prod-gallery-grid">
                {galleryPreview.map((img, index) => (
                  <div key={index} className="add-prod-gallery-item">
                    <img src={img} alt={`Gallery ${index + 1}`} />
                    <button
                      type="button"
                      className="add-prod-remove-img"
                      onClick={() => removeGalleryImage(index)}
                    >
                      <i className="bi bi-x-circle"></i>
                    </button>
                  </div>
                ))}
                {galleryPreview.length < 10 && (
                  <div className="add-prod-upload-box">
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={handleGalleryImages}
                      id="gallery-image-input"
                      hidden
                    />
                    <label htmlFor="gallery-image-input" className="add-prod-upload-placeholder">
                      <i className="bi bi-plus-lg"></i>
                      <span>Add Images</span>
                      <small>{galleryPreview.length}/10</small>
                    </label>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="add-prod-form-section">
            <h4 className="add-prod-section-title">Visibility & Status</h4>
            <div className="add-prod-toggle-group">
              <label className="add-prod-toggle-item">
                <input
                  type="checkbox"
                  name="is_featured"
                  checked={product.is_featured}
                  onChange={handleChange}
                />
                <span>Mark as Featured</span>
              </label>
              <label className="add-prod-toggle-item">
                <input
                  type="checkbox"
                  name="is_active"
                  checked={product.is_active}
                  onChange={handleChange}
                />
                <span>Active on Website</span>
              </label>
            </div>
          </div>

          <div className="add-prod-form-actions">
            <button type="submit" className="add-prod-submit-btn" disabled={loading}>
              {loading ? (
                <>
                  <i className="bi bi-hourglass-split"></i> Creating Product...
                </>
              ) : (
                <>Create Product</>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Category Creation Modal */}
      {showCategoryModal && (
        <>
          <div className="add-prod-cate-modal-backdrop" onClick={handleCloseCategoryModal}></div>
          <div className="add-prod-cate-modal-wrapper">
            <div className="add-prod-cate-modal-content add-prod-cate-modal-lg">
              <div className="add-prod-cate-modal-header">
                <div>
                  <h5 className="add-prod-cate-modal-title">Create New Category</h5>
                  <p className="add-prod-cate-modal-subtitle add-prod-m-0 add-prod-text-muted">
                    Create a new global category. This will be available to all vendors.
                  </p>
                </div>
                <button type="button" className="add-prod-cate-modal-close" onClick={handleCloseCategoryModal}>
                  <i className="bi bi-x-lg"></i>
                </button>
              </div>

              <form onSubmit={handleCreateCategory} className="add-prod-cate-modal-form">
                <div className="add-prod-cate-modal-body">
                  <div className="add-prod-cate-fields-col">
                    <div className="add-prod-cate-form-row">
                      <div className="add-prod-cate-form-group add-prod-flex-grow-1">
                        <label className="add-prod-cate-form-label">Category Name <span className="add-prod-text-danger">*</span></label>
                        <input
                          type="text"
                          name="name"
                          className="add-prod-cate-form-control"
                          placeholder="e.g. Electronics, Clothing"
                          value={categoryForm.name}
                          onChange={handleCategoryChange}
                          required
                          disabled={categoryLoading}
                        />
                      </div>

                      <div className="add-prod-cate-form-group">
                        <label className="add-prod-cate-form-label">Visibility Status</label>
                        <div className="add-prod-cate-toggle-box" onClick={!categoryLoading ? toggleCategoryActive : undefined}>
                          <div className={`add-prod-cate-toggle-switch ${categoryForm.is_active ? 'add-prod-active' : ''}`}>
                            <div className="add-prod-cate-toggle-knob"></div>
                          </div>
                          <span className={`add-prod-cate-toggle-text ${categoryForm.is_active ? 'add-prod-text-success' : 'add-prod-text-secondary'}`}>
                            {categoryForm.is_active ? 'Active' : 'Hidden'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="add-prod-cate-form-group add-prod-mt-3">
                      <label className="add-prod-cate-form-label">Description <span className="add-prod-text-muted add-prod-fw-normal">(Optional)</span></label>
                      <textarea
                        name="description"
                        className="add-prod-cate-form-control"
                        placeholder="Write a short description..."
                        value={categoryForm.description}
                        onChange={handleCategoryChange}
                        rows="5"
                        disabled={categoryLoading}
                      />
                    </div>
                  </div>

                  <div className="add-prod-cate-image-col">
                    <label className="add-prod-cate-form-label">Category Image</label>
                    <div className="add-prod-cate-upload-zone">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleCategoryImageChange}
                        id="cate-image-input"
                        className="add-prod-d-none"
                        disabled={categoryLoading}
                      />
                      <label htmlFor="cate-image-input" className={`add-prod-cate-upload-label ${categoryLoading ? 'add-prod-disabled' : ''}`}>
                        {categoryPreview ? (
                          <div className="add-prod-cate-preview-wrap">
                            <img src={categoryPreview} alt="Preview" className="add-prod-cate-preview-img" />
                            <div className="add-prod-cate-preview-overlay">
                              <i className="bi bi-camera"></i>
                              <span>Change Photo</span>
                            </div>
                          </div>
                        ) : (
                          <div className="add-prod-cate-upload-empty">
                            <div className="add-prod-cate-upload-icon"><i className="bi bi-cloud-arrow-up"></i></div>
                            <span className="add-prod-cate-upload-text">Click to browse or drag image here</span>
                            <span className="add-prod-cate-upload-hint">Supports JPG, PNG, WEBP (Max 2MB)</span>
                          </div>
                        )}
                      </label>
                    </div>
                  </div>
                </div>

                <div className="add-prod-cate-modal-footer">
                  <button type="button" className="add-prod-cate-btn add-prod-cate-btn-light" onClick={handleCloseCategoryModal} disabled={categoryLoading}>
                    Cancel
                  </button>
                  <button type="submit" className="add-prod-cate-btn add-prod-cate-btn-primary" disabled={categoryLoading}>
                    {categoryLoading ? (
                      <>
                        <span className="add-prod-cate-btn-spinner"></span>
                        Creating...
                      </>
                    ) : (
                      "Create Category"
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </>
      )}
    </>
  );
};

export default AddProduct;
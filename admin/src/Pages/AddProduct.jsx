// AddProduct.js
import React, { useState, useEffect } from "react";
import axios from '../utils/axiosConfig';
import "./AdminProducts.css";
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
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image size should be less than 5MB");
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
    if (file.size > 50 * 1024 * 1024) {
      toast.error("Video size should be less than 50MB");
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
      if (file.size > 5 * 1024 * 1024) {
        toast.error(`${file.name} size should be less than 5MB`);
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
      if (file.size > 2 * 1024 * 1024) {
        toast.error("Image size should be less than 2MB");
        return;
      }
      setCategoryImage(file);
      setCategoryPreview(URL.createObjectURL(file));
    }
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
        toast.success("Category created successfully!");
        
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

  const feePercent = Number(product.platform_fee_percent) || 0;
  const priceVal = Number(product.price) || 0;
  const stockVal = Number(product.stock_quantity) || 0;
  const perUnitPlatformFee = (priceVal * feePercent) / 100;
  const perUnitVendorEarning = priceVal - perUnitPlatformFee;
  const totalPlatformFee = perUnitPlatformFee * stockVal;
  const totalVendorEarning = perUnitVendorEarning * stockVal;

  return (
    <>
      <div className="add-product-container">
        <div className="form-header">
          <h2 className="page-title">Add New Product</h2>
          <button type="button" className="back-btn" onClick={onClose}>
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="premium-form">
          <div className="form-section">
            <h4 className="section-title">General Information</h4>
            <div className="form-group">
              <label>Product Name <span className="required">*</span></label>
              <input
                type="text"
                name="name"
                placeholder="e.g. Premium Silk Saree"
                value={product.name}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-row">
              <div className="form-group" style={{ position: "relative" }}>
                <div className="code-rows">
                  <label>SKU (Stock Keeping Unit) <span className="required">*</span></label>
                  <div>
                    {skuChecking && <small className="text-muted">Checking...</small>}
                    {!skuChecking && skuMessage && (
                      <small
                        className={skuAvailable ? "text-success" : "text-danger"}
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
                    className="btn-suggest"
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

              <div className="form-group" style={{ position: "relative" }}>
                <div className="code-rows">
                  <label>Product Code (Serial) <span className="required">*</span></label>
                  <div>
                    {productCodeChecking && <small className="text-muted">Checking...</small>}
                    {!productCodeChecking && productCodeMessage && (
                      <small
                        className={productCodeAvailable ? "text-success" : "text-danger"}
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
                    className="btn-suggest"
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

            <div className="form-row">
              <div className="form-group">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                  <label>Category <span className="required">*</span></label>
                  <button
                    type="button"
                    className="btn-suggest"
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
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
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

            <div className="form-group">
              <label>Description</label>
              <RichTextEditor
                value={description}
                onChange={handleDescriptionChange}
                placeholder="Write a detailed description of the product..."
                height={300}
              />
            </div>
          </div>

          <div className="form-section">
            <h4 className="section-title">Pricing, Commission & Stock</h4>
            <div className="form-row">
              <div className="form-group">
                <label>Selling Price (₹) <span className="required">*</span></label>
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
              <div className="form-group">
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

            <div className="form-row">
              <div className="form-group">
                <label>Platform Fee (%) <span className="required">*</span></label>
                <input
                  type="text"
                  value={`${globalPlatformFee}.00%`}
                  disabled
                  style={{ background: "#f0fdf4", color: "#166534", fontWeight: "bold" }}
                />
              </div>
              <div className="form-group">
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

            <div className="earning-breakdown">
              <div className="form-row">
                <div className="form-group">
                  <label>Platform Fee per unit</label>
                  <input
                    type="text"
                    value={`₹${perUnitPlatformFee.toFixed(2)}`}
                    disabled
                    className="fee-input"
                  />
                </div>
                <div className="form-group">
                  <label>Your Earnings per unit</label>
                  <input
                    type="text"
                    value={`₹${perUnitVendorEarning.toFixed(2)}`}
                    disabled
                    className="earn-input"
                  />
                </div>
              </div>

              <div className="form-row total-row">
                <div className="form-group">
                  <label>Total Platform Fee (for all stock)</label>
                  <input
                    type="text"
                    value={`₹${totalPlatformFee.toFixed(2)}`}
                    disabled
                    className="fee-total"
                  />
                </div>
                <div className="form-group">
                  <label>Total Your Earnings (for all stock)</label>
                  <input
                    type="text"
                    value={`₹${totalVendorEarning.toFixed(2)}`}
                    disabled
                    className="earn-total"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="form-section">
            <h4 className="section-title">Shipping Details (Shiprocket)</h4>
            <p className="section-subtitle">
              Leave blank to use defaults (0.7kg, 30x20x5cm)
            </p>
            <div className="form-row">
              <div className="form-group">
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
              <div className="form-group">
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
            <div className="form-row">
              <div className="form-group">
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
              <div className="form-group">
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

          <div className="form-section">
            <h4 className="section-title">Images & Video</h4>

            <div className="form-row">
              <div className="form-group">
                <label>Main Image <span className="required">*</span></label>
                <div className="image-upload-grid">
                  <div className="upload-box main-upload">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleMainImage}
                      id="main-image-input"
                      hidden
                    />
                    <label htmlFor="main-image-input" className="preview-label">
                      {mainPreview ? (
                        <div className="image-preview-wrapper">
                          <img src={mainPreview} alt="Preview" className="preview-img" />
                          <button
                            type="button"
                            className="remove-image-btn"
                            onClick={removeMainImage}
                          >
                            <i className="bi bi-x-circle"></i>
                          </button>
                        </div>
                      ) : (
                        <div className="upload-placeholder">
                          <i className="bi bi-cloud-arrow-up"></i>
                          <span>Select Main Image</span>
                          <small>JPG, PNG, WEBP (Max 5MB)</small>
                        </div>
                      )}
                    </label>
                  </div>
                </div>
              </div>

              <div className="form-group">
                <label>Product Video (Optional)</label>
                <div className="image-upload-grid">
                  <div className="upload-box main-upload">
                    <input
                      type="file"
                      accept="video/*"
                      onChange={handleVideo}
                      id="video-input"
                      hidden
                    />
                    <label htmlFor="video-input" className="preview-label">
                      {videoPreview ? (
                        <div className="video-preview-wrapper">
                          <video src={videoPreview} className="preview-img" muted />
                          <div className="video-overlay">
                            <i className="bi bi-play-circle"></i>
                          </div>
                          <button
                            type="button"
                            className="remove-video-btn"
                            onClick={removeVideo}
                          >
                            <i className="bi bi-x-circle"></i>
                          </button>
                        </div>
                      ) : (
                        <div className="upload-placeholder">
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

            <div className="form-group">
              <label>Gallery Images (Optional - Max 10 images)</label>
              <div className="image-upload-grid gallery-grid">
                {galleryPreview.map((img, index) => (
                  <div key={index} className="gallery-item">
                    <img src={img} alt={`Gallery ${index + 1}`} />
                    <button
                      type="button"
                      className="remove-img"
                      onClick={() => removeGalleryImage(index)}
                    >
                      <i className="bi bi-x-circle"></i>
                    </button>
                  </div>
                ))}
                {galleryPreview.length < 10 && (
                  <div className="upload-box">
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={handleGalleryImages}
                      id="gallery-image-input"
                      hidden
                    />
                    <label htmlFor="gallery-image-input" className="upload-placeholder">
                      <i className="bi bi-plus-lg"></i>
                      <span>Add Images</span>
                      <small>{galleryPreview.length}/10</small>
                    </label>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="form-section">
            <h4 className="section-title">Visibility & Status</h4>
            <div className="toggle-group">
              <label className="toggle-item">
                <input
                  type="checkbox"
                  name="is_featured"
                  checked={product.is_featured}
                  onChange={handleChange}
                />
                <span>Mark as Featured</span>
              </label>
              <label className="toggle-item">
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

          <div className="form-actions">
            <button type="submit" className="submit-btn" disabled={loading}>
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
          <div className="cate-modal-backdrop" onClick={handleCloseCategoryModal}></div>
          <div className="cate-modal-wrapper">
            <div className="cate-modal-content cate-modal-lg">
              <div className="cate-modal-header">
                <div>
                  <h5 className="cate-modal-title">Create New Category</h5>
                  <p className="cate-modal-subtitle m-0 text-muted">Fill in the details to create a new category.</p>
                </div>
                <button type="button" className="cate-modal-close" onClick={handleCloseCategoryModal}>
                  <i className="bi bi-x-lg"></i>
                </button>
              </div>

              <form onSubmit={handleCreateCategory} className="cate-modal-form">
                <div className="cate-modal-body">
                  <div className="cate-fields-col">
                    <div className="cate-form-row">
                      <div className="cate-form-group flex-grow-1">
                        <label className="cate-form-label">Category Name <span className="text-danger">*</span></label>
                        <input
                          type="text"
                          name="name"
                          className="cate-form-control"
                          placeholder="e.g. Electronics, Clothing"
                          value={categoryForm.name}
                          onChange={handleCategoryChange}
                          required
                          disabled={categoryLoading}
                        />
                      </div>

                      <div className="cate-form-group">
                        <label className="cate-form-label">Visibility Status</label>
                        <div className="cate-toggle-box" onClick={!categoryLoading ? () => setCategoryForm(prev => ({ ...prev, is_active: !prev.is_active })) : undefined}>
                          <div className={`cate-toggle-switch ${categoryForm.is_active ? 'active' : ''}`}>
                            <div className="cate-toggle-knob"></div>
                          </div>
                          <span className={`cate-toggle-text ${categoryForm.is_active ? 'text-success' : 'text-secondary'}`}>
                            {categoryForm.is_active ? 'Active' : 'Hidden'}
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
                        value={categoryForm.description}
                        onChange={handleCategoryChange}
                        rows="5"
                        disabled={categoryLoading}
                      />
                    </div>
                  </div>

                  <div className="cate-image-col">
                    <label className="cate-form-label">Category Image</label>
                    <div className="cate-upload-zone">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleCategoryImageChange}
                        id="cate-image-input"
                        className="d-none"
                        disabled={categoryLoading}
                      />
                      <label htmlFor="cate-image-input" className={`cate-upload-label ${categoryLoading ? 'disabled' : ''}`}>
                        {categoryPreview ? (
                          <div className="cate-preview-wrap">
                            <img src={categoryPreview} alt="Preview" className="cate-preview-img" />
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
                  <button type="button" className="cate-btn cate-btn-light" onClick={handleCloseCategoryModal} disabled={categoryLoading}>
                    Cancel
                  </button>
                  <button type="submit" className="cate-btn cate-btn-primary" disabled={categoryLoading}>
                    {categoryLoading ? (
                      <>
                        <span className="cate-btn-spinner"></span>
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
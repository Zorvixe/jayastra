import { useCart } from "../context/CartContext";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useUser } from "../context/UserContext";
import axios from "axios";
import "./CheckoutPage.css";

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

const CheckoutPage = () => {
    const { cartItems, totalPrice, updateQty, removeItem, totalItems } = useCart();
    const { setShowLogin } = useUser();
    const navigate = useNavigate();
    const token = localStorage.getItem("token");

    // Redirect to home if not logged in
    useEffect(() => {
        if (!token) {
            setShowLogin(true);
            navigate("/");
        }
    }, [token, setShowLogin, navigate]);

    const [addresses, setAddresses] = useState([]);
    const [selectedAddressId, setSelectedAddressId] = useState(null);
    const [isEditingAddress, setIsEditingAddress] = useState(false);
    const [toast, setToast] = useState({ show: false, message: "", type: "success" });

    const showToast = (message, type = "success") => {
        setToast({ show: true, message, type });
        setTimeout(() => setToast({ ...toast, show: false }), 4000);
    };

    const [editForm, setEditForm] = useState({
        name: "", phone: "", address: "", city: "", state: "", pincode: "", type: "HOME",
        house_no: "", street_area: "", landmark: ""
    });

    const [coupons, setCoupons] = useState([]);
    const [selectedCoupon, setSelectedCoupon] = useState(null);
    const [currentStep, setCurrentStep] = useState(2);
    const [locationStep, setLocationStep] = useState("choice");
    const [couponDiscount, setCouponDiscount] = useState(0);
    const [showCouponModal, setShowCouponModal] = useState(false);
    const [couponMessage, setCouponMessage] = useState({ type: "", text: "" });
    const [manualCoupon, setManualCoupon] = useState("");
    const [settings, setSettings] = useState({ online_payment_discount: 0, cod_fee: 0 });
    const [processingOrder, setProcessingOrder] = useState(false);

    const fetchAddresses = async () => {
        try {
            const res = await axios.get(`${API_URL}/user/address`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setAddresses(res.data || []);
            if (res.data.length > 0 && !selectedAddressId) {
                setSelectedAddressId(res.data[0].id);
            }
        } catch (err) { console.error("Address fetch error", err); }
    };

    const fetchSettings = async () => {
        try {
            const res = await axios.get(`${API_URL}/settings`);
            if (res.data.success) {
                setSettings({
                    online_payment_discount: Number(res.data.settings.online_payment_discount || 0),
                    cod_fee: Number(res.data.settings.cod_fee || 0)
                });
            }
        } catch (err) { console.error("Settings fetch error", err); }
    };

    useEffect(() => {
        if (token) fetchAddresses();
        fetchSettings();
    }, [token]);

    // Helper to fetch coupons filtered by vendor IDs in cart
    const fetchAndFilterCoupons = async () => {
        try {
            const res = await axios.get(`${API_URL}/coupons`);
            let allCoupons = res.data.coupons || [];

            // Get unique vendor IDs from cart items (vendor_id must exist)
            const vendorIdsInCart = [...new Set(cartItems.map(item => item.vendor_id).filter(Boolean))];

            let filteredCoupons;
            if (vendorIdsInCart.length === 0) {
                // If cart empty or no vendor IDs, show only global coupons (vendor_id = null)
                filteredCoupons = allCoupons.filter(c => !c.vendor_id);
            } else {
                filteredCoupons = allCoupons.filter(c => !c.vendor_id || vendorIdsInCart.includes(c.vendor_id));
            }
            setCoupons(filteredCoupons);
        } catch (err) {
            console.error("Coupon fetch error", err);
        }
    };

    // Open modal and fetch filtered coupons
    const openCouponModal = () => {
        fetchAndFilterCoupons();
        setShowCouponModal(true);
    };

    // Apply coupon – send cart items with vendor_id to backend
    const handleApplyCoupon = async (coupon) => {
        setCouponMessage({ type: "", text: "" });
        try {
            const cartItemsForCoupon = cartItems.map(item => ({
                product_id: item.product_id || item.id,
                quantity: item.qty,
                price: parseFloat(item.price),
                vendor_id: item.vendor_id
            }));

            const res = await axios.post(`${API_URL}/coupons/apply`, {
                code: coupon.code,
                totalAmount: parseFloat(totalPrice),
                cartItems: cartItemsForCoupon
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (res.data.success) {
                const discountAmount = parseFloat(res.data.discount);
                setSelectedCoupon({
                    ...res.data.coupon,
                    id: res.data.couponId || res.data.coupon.id
                });
                setCouponDiscount(discountAmount);
                setCouponMessage({ type: "success", text: `Coupon applied! You saved ₹${discountAmount} ✨` });

                // Close modal after successful application
                setTimeout(() => {
                    setShowCouponModal(false);
                    setCouponMessage({ type: "", text: "" });
                }, 1500);
            }
        } catch (err) {
            console.error("Coupon apply error:", err);
            setCouponMessage({ type: "error", text: err.response?.data?.message || "Coupon ineligible" });
        }
    };

    // Manual coupon entry
    const handleManualCouponApply = async () => {
        if (!manualCoupon.trim()) {
            setCouponMessage({ type: "error", text: "Please enter a coupon code" });
            return;
        }
        const fakeCoupon = { code: manualCoupon.trim().toUpperCase() };
        await handleApplyCoupon(fakeCoupon);
    };

    // Get final amount after all discounts
    const getFinalAmount = () => {
        let total = parseFloat(totalPrice);
        const couponDisc = parseFloat(couponDiscount);
        if (!isNaN(couponDisc) && couponDisc > 0) {
            total = total - couponDisc;
        }
        return Math.max(0, total);
    };

    // Updated proceed to payment function with complete address details
    const handleProceedToPayment = () => {
        if (!selectedAddressId) {
            showToast("Please select a delivery address", "error");
            return;
        }
        
        const selectedAddress = addresses.find(a => a.id === selectedAddressId);
        if (!selectedAddress) {
            showToast("Selected address not found", "error");
            return;
        }

        const finalAmount = getFinalAmount();

        // Build complete order data with all address components
        const orderData = {
            customer_name: selectedAddress.name,
            email: localStorage.getItem("userEmail") || "",
            phone: selectedAddress.phone,
            // Full address string for display
            address: `${selectedAddress.house_no ? selectedAddress.house_no + ', ' : ''}${selectedAddress.street_area ? selectedAddress.street_area + ', ' : ''}${selectedAddress.city ? selectedAddress.city + ', ' : ''}${selectedAddress.state ? selectedAddress.state : ''}${selectedAddress.pincode ? ' - ' + selectedAddress.pincode : ''}`,
            // Individual address components for Shiprocket
            house_no: selectedAddress.house_no || "",
            street_area: selectedAddress.street_area || "",
            landmark: selectedAddress.landmark || "",
            city: selectedAddress.city || "",
            state: selectedAddress.state || "",
            pincode: selectedAddress.pincode || "",
            country: "India",
            // Order details
            total_amount: finalAmount,
            discount: couponDiscount,
            coupon_id: selectedCoupon?.id || null,
            payment_method: "COD", // Default, will be overridden in payment page
            cartItems: cartItems.map(item => ({
                product_id: item.product_id || item.id,
                name: item.name,
                price: item.price,
                quantity: item.qty,
                image: item.main_image_url || item.image_url,
                product_code: item.product_code,
                vendor_id: item.vendor_id,
                weight: item.weight || 0.5
            }))
        };

        navigate("/payment", { state: { orderDetails: orderData } });
    };

    // USE CURRENT LOCATION (GPS)
    const handleUseLocation = () => {
        if (!navigator.geolocation) {
            return showToast("Geolocation is not supported by your browser", "error");
        }
        showToast("Detecting your location...", "info");
        navigator.geolocation.getCurrentPosition(async (position) => {
            try {
                const { latitude, longitude } = position.coords;
                const res = await axios.get(
                    `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`
                );
                const addr = res.data.address;
                setEditForm((prev) => ({
                    ...prev,
                    city: addr.city || addr.town || addr.village || "",
                    state: addr.state || "",
                    pincode: addr.postcode || "",
                    street_area: addr.road || addr.suburb || addr.neighbourhood || "",
                    landmark: addr.suburb || "",
                    address: res.data.display_name || "",
                }));
                setLocationStep("form");
                setIsEditingAddress(true);
                showToast("Location retrieved! Please verify details. ✨");
            } catch (err) {
                showToast("Could not fetch location details automatically. Try manual entry.", "error");
                setLocationStep("form");
            }
        }, (err) => {
            showToast("Permission denied or GPS unavailable. Let's enter it manually.", "error");
            setLocationStep("form");
            setIsEditingAddress(true);
        }, { enableHighAccuracy: true });
    };

    const getItemImage = (item) => {
        const imgPath = item.main_image_url || item.image_url;
        if (!imgPath) return "/assets/no-image.png";
        const fullUrl = getImageUrl(imgPath);
        return fullUrl || "/assets/no-image.png";
    };

    const saveAddressEdit = async () => {
        try {
            const payload = { ...editForm };
            
            // Build full address string from components
            if (!payload.address && payload.house_no && payload.street_area) {
                payload.address = `${payload.house_no}, ${payload.street_area}`;
            }

            if (payload.id) {
                await axios.put(`${API_URL}/user/address/${payload.id}`, payload, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                showToast("Address Updated Successfully!");
            } else {
                const res = await axios.post(`${API_URL}/user/address`, payload, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setSelectedAddressId(res.data.address.id);
                showToast("Address Added Successfully!");
            }
            fetchAddresses();
            setIsEditingAddress(false);
            setLocationStep("choice");
            setEditForm({
                name: "", phone: "", address: "", city: "", state: "", pincode: "", type: "HOME",
                house_no: "", street_area: "", landmark: ""
            });
        } catch (err) {
            showToast("Failed to save address", "error");
        }
    };

    const totalMRP = cartItems.reduce((acc, item) => acc + (Number(item.old_price || item.price) * item.qty), 0);
    const mrpDiscount = Number(totalMRP) - Number(totalPrice);
    const finalAmount = Number(totalPrice) - Number(couponDiscount);
    const totalSavings = Number(mrpDiscount) + Number(couponDiscount);
    const selectedAddress = addresses.find(a => a.id === selectedAddressId);

    // SHOW BEAUTIFUL EMPTY STATE INSTEAD OF BLANK SCREEN
    if (cartItems.length === 0) {
        return (
            <div className="empty-checkout-container">
                <div className="empty-checkout-content">
                    <i className="bi bi-cart-x"></i>
                    <h2>Your Cart is Empty!</h2>
                    <p>Looks like you haven't added anything to your cart yet.</p>
                    <button className="btn-shop-now" onClick={() => navigate("/")}>
                        Start Shopping
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="checkout-page-container">
            <div className="checkout-stepper-outer">
                <div className="container">
                    <div className="checkout-stepper-new">
                        <div className="step-new completed">
                            <div className="circle"><i className="bi bi-check"></i></div>
                            <span>LOGIN</span>
                        </div>
                        <div className="line active"></div>
                        <div className={`step-new ${currentStep >= 2 ? 'active' : ''} ${currentStep > 2 ? 'completed' : ''}`}>
                            <div className="circle">{currentStep > 2 ? <i className="bi bi-check"></i> : "2"}</div>
                            <span>DELIVERY</span>
                        </div>
                        <div className={`line ${currentStep > 2 ? 'active' : ''}`}></div>
                        <div className={`step-new ${currentStep >= 3 ? 'active' : ''}`}>
                            <div className="circle">3</div>
                            <span>SUMMARY</span>
                        </div>
                        <div className="line"></div>
                        <div className="step-new">
                            <div className="circle">4</div>
                            <span>PAYMENT</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* CUSTOM TOAST NOTIFICATION */}
            {toast.show && (
                <div className={`custom-toast ${toast.type}`}>
                    <div className="toast-content">
                        <div className={`toast-icon ${toast.type}`}>
                            {toast.type === 'success' && <i className="bi bi-check-circle-fill"></i>}
                            {toast.type === 'error' && <i className="bi bi-exclamation-circle-fill"></i>}
                            {toast.type === 'info' && <i className="bi bi-geo-alt-fill"></i>}
                        </div>
                        <span className="toast-msg">{toast.message}</span>
                        <button className="toast-close" onClick={() => setToast({ ...toast, show: false })}>
                            <i className="bi bi-x"></i>
                        </button>
                    </div>
                </div>
            )}

            <div className="container py-4">
                <div className="row g-4">
                    <div className="col-lg-8">
                        {/* STEP 2: DELIVERY ADDRESS */}
                        <div className={`checkout-step-box mb-3 ${currentStep < 2 ? 'dimmed' : ''} ${currentStep !== 2 ? 'minimized' : ''}`}>
                            <div className="step-header">
                                <div className="step-info">
                                    <span className="step-count">2</span>
                                    <h6>DELIVERY ADDRESS</h6>
                                    {selectedAddress && currentStep > 2 && (
                                        <div className="selection-preview">
                                            <span>{selectedAddress.name}</span>
                                            <p>{selectedAddress.house_no}, {selectedAddress.street_area}, {selectedAddress.city}</p>
                                        </div>
                                    )}
                                </div>
                                {currentStep > 2 && <button className="change-btn" onClick={() => setCurrentStep(2)}>CHANGE</button>}
                            </div>

                            {currentStep === 2 && (
                                <div className="step-content">
                                    {isEditingAddress && (
                                        <div className="address-form-overlay" onClick={() => {
                                            setIsEditingAddress(false);
                                            setLocationStep("choice");
                                        }}>
                                            <div className="address-form-modal" onClick={e => e.stopPropagation()}>
                                                <div className="form-header-new">
                                                    <h6>{editForm.id ? "Edit Address" : "Add New Address"}</h6>
                                                    <button onClick={() => {
                                                        setIsEditingAddress(false);
                                                        setLocationStep("choice");
                                                    }}><i className="bi bi-x-lg"></i></button>
                                                </div>

                                                {locationStep === "choice" ? (
                                                    <div className="location-choice-view">
                                                        <p className="mb-4 text-center">How would you like to add your address?</p>
                                                        <div className="choice-cards-new">
                                                            <div className="choice-card-new" onClick={handleUseLocation}>
                                                                <i className="bi bi-geo-alt-fill"></i>
                                                                <strong>Use GPS</strong>
                                                                <span>Auto-detect</span>
                                                            </div>
                                                            <div className="choice-card-new" onClick={() => setLocationStep("form")}>
                                                                <i className="bi bi-pencil-square"></i>
                                                                <strong>Manual</strong>
                                                                <span>Type details</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="address-fields-scroll">
                                                        <div className="row g-3">
                                                            <div className="col-md-6">
                                                                <div className="form-floating mb-2">
                                                                    <input 
                                                                        type="text" 
                                                                        className="form-control" 
                                                                        placeholder="Full Name" 
                                                                        value={editForm.name} 
                                                                        onChange={e => setEditForm({ ...editForm, name: e.target.value })} 
                                                                        required
                                                                    />
                                                                    <label>Full Name *</label>
                                                                </div>
                                                            </div>
                                                            <div className="col-md-6">
                                                                <div className="form-floating mb-2">
                                                                    <input 
                                                                        type="tel" 
                                                                        className="form-control" 
                                                                        placeholder="Phone" 
                                                                        value={editForm.phone} 
                                                                        onChange={e => setEditForm({ ...editForm, phone: e.target.value })} 
                                                                        required
                                                                    />
                                                                    <label>Phone Number *</label>
                                                                </div>
                                                            </div>
                                                            <div className="col-md-6">
                                                                <div className="form-floating mb-2">
                                                                    <input 
                                                                        type="text" 
                                                                        className="form-control" 
                                                                        placeholder="House No" 
                                                                        value={editForm.house_no} 
                                                                        onChange={e => setEditForm({ ...editForm, house_no: e.target.value })} 
                                                                        required
                                                                    />
                                                                    <label>House / Flat No *</label>
                                                                </div>
                                                            </div>
                                                            <div className="col-md-6">
                                                                <div className="form-floating mb-2">
                                                                    <input 
                                                                        type="text" 
                                                                        className="form-control" 
                                                                        placeholder="Street" 
                                                                        value={editForm.street_area} 
                                                                        onChange={e => setEditForm({ ...editForm, street_area: e.target.value })} 
                                                                        required
                                                                    />
                                                                    <label>Area / Street *</label>
                                                                </div>
                                                            </div>
                                                            <div className="col-md-12">
                                                                <div className="form-floating mb-2">
                                                                    <input 
                                                                        type="text" 
                                                                        className="form-control" 
                                                                        placeholder="Landmark" 
                                                                        value={editForm.landmark} 
                                                                        onChange={e => setEditForm({ ...editForm, landmark: e.target.value })} 
                                                                    />
                                                                    <label>Landmark (Optional)</label>
                                                                </div>
                                                            </div>
                                                            <div className="col-md-4">
                                                                <input 
                                                                    type="text" 
                                                                    className="form-control p-3 mb-2" 
                                                                    placeholder="City *" 
                                                                    value={editForm.city} 
                                                                    onChange={e => setEditForm({ ...editForm, city: e.target.value })} 
                                                                    required
                                                                />
                                                            </div>
                                                            <div className="col-md-4">
                                                                <input 
                                                                    type="text" 
                                                                    className="form-control p-3 mb-2" 
                                                                    placeholder="State *" 
                                                                    value={editForm.state} 
                                                                    onChange={e => setEditForm({ ...editForm, state: e.target.value })} 
                                                                    required
                                                                />
                                                            </div>
                                                            <div className="col-md-4">
                                                                <input 
                                                                    type="text" 
                                                                    className="form-control p-3 mb-2" 
                                                                    placeholder="Pincode *" 
                                                                    value={editForm.pincode} 
                                                                    onChange={e => setEditForm({ ...editForm, pincode: e.target.value })} 
                                                                    maxLength="6"
                                                                    required
                                                                />
                                                            </div>
                                                        </div>
                                                        <button 
                                                            className="btn-save-address-new w-100 mt-4" 
                                                            onClick={saveAddressEdit}
                                                            disabled={!editForm.name || !editForm.phone || !editForm.house_no || !editForm.street_area || !editForm.city || !editForm.state || !editForm.pincode}
                                                        >
                                                            SAVE AND DELIVER HERE
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                    {!isEditingAddress && (
                                        <div className="address-selector">
                                            {addresses.map(a => (
                                                <div key={a.id} className={`address-card-new ${selectedAddressId === a.id ? 'active' : ''}`} onClick={() => setSelectedAddressId(a.id)}>
                                                    <div className="radio-dot"></div>
                                                    <div className="card-info">
                                                        <div className="top">
                                                            <span className="name">{a.name}</span>
                                                            <span className="tag">{a.type}</span>
                                                            <span className="phone">{a.phone}</span>
                                                        </div>
                                                        <p className="address-text">
                                                            {a.house_no && `${a.house_no}, `}
                                                            {a.street_area && `${a.street_area}, `}
                                                            {a.city && `${a.city}, `}
                                                            {a.state && `${a.state} - `}
                                                            {a.pincode}
                                                        </p>
                                                        {selectedAddressId === a.id && (
                                                            <button className="btn-deliver-here mt-3" onClick={() => setCurrentStep(3)}>DELIVER HERE</button>
                                                        )}
                                                    </div>
                                                    <button className="edit-link" onClick={(e) => {
                                                        e.stopPropagation();
                                                        setEditForm(a);
                                                        setIsEditingAddress(true);
                                                        setLocationStep("form");
                                                    }}>EDIT</button>
                                                </div>
                                            ))}
                                            <button className="add-address-btn-new" onClick={() => {
                                                setEditForm({ 
                                                    name: "", phone: "", address: "", city: "", state: "", pincode: "", type: "HOME", 
                                                    house_no: "", street_area: "", landmark: "", id: null 
                                                });
                                                setIsEditingAddress(true);
                                                setLocationStep("choice");
                                            }}>+ ADD A NEW ADDRESS</button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* STEP 3: ORDER SUMMARY */}
                        <div className={`checkout-step-box mb-3 ${currentStep < 3 ? 'dimmed' : ''} ${currentStep !== 3 ? 'minimized' : ''}`}>
                            <div className="step-header">
                                <div className="step-info">
                                    <span className="step-count">3</span>
                                    <h6>ORDER SUMMARY</h6>
                                </div>
                            </div>
                            {currentStep === 3 && (
                                <div className="step-content p-0">
                                    <div className="order-items-review">
                                        {cartItems.map(item => (
                                            <div key={item.id} className="review-item">
                                                <div className="img-box" onClick={() => navigate(`/product/${item.product_id || item.id}`)}>
                                                    <img
                                                        src={getItemImage(item)}
                                                        alt={item.name}
                                                        onError={(e) => { e.target.src = "/assets/no-image.png"; }}
                                                    />
                                                </div>
                                                <div className="info-box">
                                                    <h6 className="name" onClick={() => navigate(`/product/${item.product_id || item.id}`)} style={{ cursor: 'pointer' }}>{item.name}</h6>
                                                    <div className="price-info d-flex align-items-center flex-wrap">
                                                        <span className="price">₹{item.price}</span>
                                                        {item.old_price && Number(item.old_price) > Number(item.price) && (
                                                            <span className="old-price" style={{ textDecoration: 'line-through', color: '#9ca3af', fontSize: '13px', marginLeft: '8px' }}>₹{item.old_price}</span>
                                                        )}
                                                        {/* QTY CONTROLS IN SUMMARY */}
                                                        <div className="qty-wrap ms-4">
                                                            <button className="qty-btn" onClick={() => updateQty(item.id, item.qty - 1)} disabled={item.qty <= 1}>-</button>
                                                            <span className="mx-2">{item.qty}</span>
                                                            <button className="qty-btn" onClick={() => updateQty(item.id, item.qty + 1)}>+</button>
                                                        </div>
                                                        <button className="remove-btn ms-auto" onClick={() => removeItem(item.id)}>REMOVE</button>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="summary-footer d-none d-lg-flex">
                                        <button 
                                            className="btn-continue-to-payment" 
                                            onClick={handleProceedToPayment}
                                            disabled={!selectedAddressId}
                                        >
                                            CONTINUE
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="col-lg-4">
                        <div className="price-sidebar">
                            <h6 className="title">PRICE DETAILS</h6>
                            <div className="price-rows">
                                <div className="p-row"><span>Price ({totalItems} items)</span><span>₹{totalMRP.toFixed(2)}</span></div>
                                <div className="p-row green"><span>Discount</span><span>− ₹{mrpDiscount.toFixed(2)}</span></div>
                                <div className="p-row green"><span>Delivery Charges</span><span>FREE</span></div>
                                {selectedCoupon && <div className="p-row green"><span>Coupon Discount</span><span>− ₹{couponDiscount.toFixed(2)}</span></div>}
                                <div className="coupon-box" onClick={openCouponModal}>
                                    <i className="bi bi-patch-check"></i>
                                    <span>{selectedCoupon ? `Applied: ${selectedCoupon.code}` : "Apply Coupons"}</span>
                                    <i className="bi bi-chevron-right"></i>
                                </div>
                                <div className="p-total">
                                    <span>Total Amount</span>
                                    <span>₹{finalAmount.toFixed(2)}</span>
                                </div>
                                {settings.online_payment_discount > 0 && (
                                    <div className="p-row text-success fw-bold mt-2" style={{ borderTop: '1px dashed #22c55e', paddingTop: '10px' }}>
                                        <span><span><i className="bi bi-lightning-fill"></i> Pay Online & Save EXTRA</span></span>
                                        <span>₹{settings.online_payment_discount}</span>
                                    </div>
                                )}
                            </div>
                            {totalSavings > 0 && (
                                <div className="savings-msg">You will save ₹{totalSavings.toFixed(2)} on this order</div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* MOBILE STICKY FOOTER FOR CHECKOUT */}
            <div className="mobile-checkout-footer d-lg-none">
                <div className="price-info">
                    <span className="label">Total Amount</span>
                    <span className="val">₹{finalAmount.toFixed(2)}</span>
                </div>
                <button
                    className="btn-footer-continue"
                    onClick={handleProceedToPayment}
                    disabled={!selectedAddressId}
                >
                    CONTINUE
                </button>
            </div>

            {/* COUPON MODAL with filtered coupons */}
            {showCouponModal && (
                <div className="modal-overlay" onClick={() => setShowCouponModal(false)}>
                    <div className="modal-content-new" onClick={e => e.stopPropagation()}>
                        <div className="modal-head"><h6>Apply Coupon</h6><button onClick={() => setShowCouponModal(false)}>✕</button></div>
                        <div className="modal-body-new">
                            {couponMessage.text && <div className={`alert alert-${couponMessage.type === 'success' ? 'success' : 'danger'} mb-3`}>{couponMessage.text}</div>}

                            <div className="flipkart-coupon-input position-relative mb-4">
                                <input
                                    type="text"
                                    className="form-control"
                                    placeholder="Enter Coupon Code"
                                    value={manualCoupon}
                                    onChange={(e) => setManualCoupon(e.target.value.toUpperCase())}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && manualCoupon.trim()) {
                                            handleManualCouponApply();
                                        }
                                    }}
                                    style={{ textTransform: 'uppercase', paddingRight: '90px', height: '48px', border: '1px solid #e0e0e0', borderRadius: '4px', fontSize: '15px' }}
                                />
                                <button
                                    className="btn position-absolute top-50 end-0 translate-middle-y"
                                    onClick={handleManualCouponApply}
                                    disabled={!manualCoupon.trim()}
                                    style={{
                                        color: manualCoupon.trim() ? '#8E2139' : '#ccc',
                                        background: 'transparent',
                                        border: 'none',
                                        fontWeight: '600',
                                        paddingRight: '15px',
                                        fontSize: '14px',
                                        zIndex: 10
                                    }}
                                >
                                    APPLY
                                </button>
                            </div>

                            {coupons.length > 0 && <h6 className="available-coupons-title mb-3" style={{ fontSize: '0.9rem', color: '#666', fontWeight: 600 }}>Available Offers</h6>}

                            {coupons.map(c => {
                                const discountAmount = c.discount_type === 'percentage' 
                                    ? (totalPrice * c.discount_value / 100).toFixed(2) 
                                    : c.discount_value;
                                return (
                                    <div key={c.id} className="coupon-item" onClick={() => handleApplyCoupon(c)}>
                                        <div className="code-wrap"><div className="code">{c.code}</div><button>APPLY</button></div>
                                        <p className="desc">Save ₹{discountAmount} on this order</p>
                                        {c.min_order_amount > 0 && (
                                            <small className="text-muted">Min. order: ₹{c.min_order_amount}</small>
                                        )}
                                    </div>
                                );
                            })}

                            {/* BEAUTIFUL EMPTY STATE FOR COUPONS */}
                            {coupons.length === 0 && (
                                <div className="empty-coupon-state">
                                    <i className="bi bi-ticket-detailed empty-icon"></i>
                                    <h6>No Offers Available</h6>
                                    <p>There are currently no active coupons for the items in your cart.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CheckoutPage;
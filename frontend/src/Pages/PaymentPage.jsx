import { useLocation, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { useCart } from "../context/CartContext";
import axios from "axios";
import { toast } from "react-toastify";
import "./CheckoutPage.css";

import "./PaymentPage.css";


const API_URL = process.env.REACT_APP_API_URL;

const PaymentPage = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const { clearCart } = useCart();

    // Data passed from checkout
    const orderDetails = location.state?.orderDetails;
    const [isPlacingOrder, setIsPlacingOrder] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState("COD");
    const [settings, setSettings] = useState({ online_payment_discount: 0, cod_fee: 0 });
    const [razorpayKey, setRazorpayKey] = useState(null);

    // ✅ Add this line
    const [currentStep, setCurrentStep] = useState(4);

    const token = localStorage.getItem("token");

    useEffect(() => {
        if (!orderDetails) {
            navigate("/cart");
        }
        window.scrollTo(0, 0);
        fetchSettings();
    }, [orderDetails, navigate]);

    const fetchSettings = async () => {
        try {
            const res = await axios.get(`${API_URL}/settings`);
            if (res.data.success) {
                setSettings({
                    online_payment_discount: Number(res.data.settings.online_payment_discount || 0),
                    cod_fee: Number(res.data.settings.cod_fee || 0)
                });
            }
        } catch (err) {
            console.error("Error fetching settings:", err);
        }
    };

    useEffect(() => {
        // Fetch Razorpay key from settings
        const fetchRazorpayKey = async () => {
            try {
                const res = await axios.get(`${API_URL}/settings`);
                if (res.data.success && res.data.settings.razorpay_key_id) {
                    setRazorpayKey(res.data.settings.razorpay_key_id);
                } else {
                    console.error("Razorpay key not configured");
                    toast.error("Payment gateway not configured. Please contact support.");
                }
            } catch (err) {
                console.error("Failed to fetch Razorpay key:", err);
            }
        };

        fetchRazorpayKey();
    }, []);

    // Calculate Adjusted Total
    const getAdjustedTotal = () => {
        let total = Number(orderDetails?.total_amount || 0);
        if (paymentMethod === 'COD') {
            total += settings.cod_fee;
        } else {
            total -= settings.online_payment_discount;
        }
        return Math.max(0, total);
    };

    const finalPayable = getAdjustedTotal();

    const handlePlaceOrder = async () => {
        if (paymentMethod === "COD") {
            setIsPlacingOrder(true);
            try {
                // Ensure cartItems have correct quantity field name
                const cartItemsWithCorrectQty = (orderDetails.cartItems || []).map(item => ({
                    ...item,
                    quantity: item.quantity || item.qty || 1
                }));

                const finalOrderData = {
                    ...orderDetails,
                    cartItems: cartItemsWithCorrectQty,
                    total_amount: parseFloat(orderDetails.total_amount),
                    payment_method: paymentMethod
                };

                console.log("Placing COD order:", finalOrderData);

                const res = await axios.post(`${API_URL}/orders`, finalOrderData, {
                    headers: { Authorization: `Bearer ${token}` }
                });

                if (res.data.success) {
                    clearCart();
                    navigate("/order-success", {
                        state: {
                            orderId: res.data.orderId,
                            orderDetails: finalOrderData,
                            finalPayable: finalPayable,
                            paymentMethod: "COD"
                        }
                    });
                }
            } catch (err) {
                console.error("Order error:", err);
                toast.error(err.response?.data?.message || "Order placement failed");
            } finally {
                setIsPlacingOrder(false);
            }
        } else {
            handleRazorpayPayment();
        }
    };

    const handleRazorpayPayment = async () => {
        if (!razorpayKey) {
            toast.error("Payment gateway not configured. Please try COD or contact support.");
            return;
        }
        try {
            setIsPlacingOrder(true);

            // Ensure cartItems have correct quantity field name
            const cartItemsWithCorrectQty = (orderDetails.cartItems || []).map(item => ({
                ...item,
                quantity: item.quantity || item.qty || 1
            }));

            const amountToPay = parseFloat(orderDetails.total_amount);

            console.log("Razorpay payment amount:", amountToPay);

            // 1. Create Razorpay Order in Backend
            const orderRes = await axios.post(`${API_URL}/razorpay/order`, {
                amount: amountToPay
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (!orderRes.data.success) {
                throw new Error(orderRes.data.message || "Failed to create order");
            }

            const { order } = orderRes.data;

            // 2. Open Razorpay Modal
            const options = {
                key: razorpayKey,
                amount: order.amount,
                currency: order.currency,
                name: "JAYASTRA",
                description: `Purchase of Premium Products`,
                order_id: order.id,
                handler: async (response) => {
                    try {
                        toast.info("Verifying payment...");

                        const finalPayload = {
                            ...orderDetails,
                            cartItems: cartItemsWithCorrectQty,
                            total_amount: amountToPay,
                            payment_method: "RAZORPAY"
                        };

                        const verifyRes = await axios.post(`${API_URL}/razorpay/verify`, {
                            razorpay_order_id: response.razorpay_order_id,
                            razorpay_payment_id: response.razorpay_payment_id,
                            razorpay_signature: response.razorpay_signature,
                            orderDetails: finalPayload
                        }, {
                            headers: { Authorization: `Bearer ${token}` }
                        });

                        if (verifyRes.data.success) {
                            clearCart();
                            toast.success("Payment successful! Order placed.");
                            navigate("/order-success", {
                                state: {
                                    orderId: verifyRes.data.orderId,
                                    orderDetails: finalPayload,
                                    finalPayable: finalPayable,
                                    paymentMethod: "RAZORPAY"
                                }
                            });
                        } else {
                            toast.error(verifyRes.data.message || "Payment verification failed");
                        }
                    } catch (err) {
                        console.error("Verification error:", err);
                        toast.error(err.response?.data?.message || "Payment verification failed");
                    } finally {
                        setIsPlacingOrder(false);
                    }
                },
                modal: {
                    ondismiss: () => {
                        setIsPlacingOrder(false);
                        toast.info("Payment cancelled");
                    }
                },
                prefill: {
                    name: orderDetails.customer_name,
                    email: orderDetails.email,
                    contact: orderDetails.phone
                },
                theme: {
                    color: "#8E2139"
                }
            };

            const rzp = new window.Razorpay(options);

            rzp.on('payment.failed', function (response) {
                console.error("Payment failed:", response.error);
                toast.error(response.error.description || "Payment failed. Please try again.");
                setIsPlacingOrder(false);
            });

            rzp.open();

        } catch (err) {
            console.error("Razorpay error:", err);
            toast.error(err.message || "Failed to initialize payment");
            setIsPlacingOrder(false);
        }
    };

    if (!orderDetails) return null;

    return (
        <div className="payment-page">
            {/* 1. Progress Stepper */}
            <div className="checkout-stepper-outer">
                <div className="container">
                    <div className="checkout-stepper-new">
                        <div className="checkout-step-new checkout-completed">
                            <div className="checkout-circle"><i className="bi bi-check"></i></div>
                            <span>LOGIN</span>
                        </div>
                        <div className="checkout-line checkout-active"></div>
                        <div className={`checkout-step-new ${currentStep >= 2 ? 'checkout-active' : ''} ${currentStep > 2 ? 'checkout-completed' : ''}`}>
                            <div className="checkout-circle">{currentStep > 2 ? <i className="bi bi-check"></i> : "2"}</div>
                            <span>DELIVERY</span>
                        </div>
                        <div className="checkout-line checkout-active"></div>
                        <div className={`checkout-step-new ${currentStep >= 3 ? 'checkout-active' : ''} ${currentStep > 3 ? 'checkout-completed' : ''}`}>
                            <div className="checkout-circle">{currentStep > 3 ? <i className="bi bi-check"></i> : "3"}</div>
                            <span>SUMMARY</span>
                        </div>
                        <div className={`checkout-line ${currentStep >= 4 ? 'checkout-active' : ''}`}></div>
                        <div className={`checkout-step-new ${currentStep >= 4 ? 'checkout-active' : ''}`}>
                            <div className="checkout-circle">4</div>
                            <span>PAYMENT</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="payment-layout">
                {/* 2. Left: Payment Methods */}
                <div className="payment-options-section">
                    <div className="payment-section-card">
                        <div className="section-header">
                            <span className="num">4</span>
                            <h5>Payment Options</h5>
                        </div>

                        <div className="payment-method-list">
                            {/* UPI */}
                            <div
                                className={`method-item ${paymentMethod === 'UPI' ? 'selected' : ''}`}
                                onClick={() => setPaymentMethod('UPI')}
                            >
                                <div className="radio-circle"></div>
                                <div className="method-details">
                                    <div className="method-title">
                                        <i className="bi bi-phone"></i> UPI (PhonePe, Google Pay, BHIM)
                                    </div>
                                    <div className="method-subtitle">Powered by Razorpay</div>
                                    {settings.online_payment_discount > 0 && (
                                        <div className="text-success fw-bold" style={{ fontSize: '0.85rem' }}>
                                            Applied: ₹{settings.online_payment_discount} Online Discount
                                        </div>
                                    )}
                                    {paymentMethod === 'UPI' && (
                                        <div className="payment-action-area d-none d-lg-block">
                                            <button
                                                className="btn-continue-checkout"
                                                disabled={isPlacingOrder}
                                                onClick={handlePlaceOrder}
                                            >
                                                {isPlacingOrder ? "PROCESSING..." : `PAY ₹${finalPayable} & PLACE ORDER`}
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Cards */}
                            <div
                                className={`method-item ${paymentMethod === 'CARD' ? 'selected' : ''}`}
                                onClick={() => setPaymentMethod('CARD')}
                            >
                                <div className="radio-circle"></div>
                                <div className="method-details">
                                    <div className="method-title">
                                        <i className="bi bi-credit-card"></i> Credit / Debit / ATM Card
                                    </div>
                                    <div className="method-subtitle">Visa, Mastercard, RuPay & more</div>
                                    {settings.online_payment_discount > 0 && (
                                        <div className="text-success fw-bold" style={{ fontSize: '0.85rem' }}>
                                            Applied: ₹{settings.online_payment_discount} Online Discount
                                        </div>
                                    )}
                                    {paymentMethod === 'CARD' && (
                                        <div className="payment-action-area d-none d-lg-block">
                                            <button
                                                className="btn-continue-checkout"
                                                disabled={isPlacingOrder}
                                                onClick={handlePlaceOrder}
                                            >
                                                {isPlacingOrder ? "PROCESSING..." : `PAY ₹${finalPayable} & PLACE ORDER`}
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Net Banking */}
                            <div
                                className={`method-item ${paymentMethod === 'NETBANKING' ? 'selected' : ''}`}
                                onClick={() => setPaymentMethod('NETBANKING')}
                            >
                                <div className="radio-circle"></div>
                                <div className="method-details">
                                    <div className="method-title">
                                        <i className="bi bi-bank"></i> Net Banking
                                    </div>
                                    <div className="method-subtitle">All major Indian banks supported</div>
                                    {settings.online_payment_discount > 0 && (
                                        <div className="text-success fw-bold" style={{ fontSize: '0.85rem' }}>
                                            Applied: ₹{settings.online_payment_discount} Online Discount
                                        </div>
                                    )}
                                    {paymentMethod === 'NETBANKING' && (
                                        <div className="payment-action-area d-none d-lg-block">
                                            <button
                                                className="btn-continue-checkout"
                                                disabled={isPlacingOrder}
                                                onClick={handlePlaceOrder}
                                            >
                                                {isPlacingOrder ? "PROCESSING..." : `PAY ₹${finalPayable} & PLACE ORDER`}
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* COD */}
                            <div
                                className={`method-item ${paymentMethod === 'COD' ? 'selected' : ''}`}
                                onClick={() => setPaymentMethod('COD')}
                            >
                                <div className="radio-circle"></div>
                                <div className="method-details">
                                    <div className="method-title">
                                        <i className="bi bi-cash-stack"></i> Cash on Delivery
                                    </div>
                                    <div className="method-subtitle">Pay when you receive the package</div>
                                    {settings.cod_fee > 0 && (
                                        <div className="text-danger fw-bold" style={{ fontSize: '0.85rem' }}>
                                            +₹{settings.cod_fee} COD Handling Fee
                                        </div>
                                    )}
                                    {paymentMethod === 'COD' && (
                                        <div className="payment-action-area d-none d-lg-block">
                                            <button
                                                className="btn-continue-checkout"
                                                disabled={isPlacingOrder}
                                                onClick={handlePlaceOrder}
                                            >
                                                {isPlacingOrder ? "PLACING ORDER..." : `CONFIRM ORDER (₹${finalPayable})`}
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 3. Right: Price Details */}
                <div className="payment-sidebar-section">
                    <div className="price-details-card">
                        <div className="price-header">Price Details</div>
                        <div className="price-body">
                            <div className="price-row">
                                <span>Price ({(orderDetails.items || orderDetails.cartItems)?.length || 0} items)</span>
                                <span>₹{(Number(orderDetails.total_amount) + Number(orderDetails.discount)).toFixed(2)}</span>
                            </div>
                            <div className="price-row discount">
                                <span>Coupon Discount</span>
                                <span className="val">-₹{orderDetails.discount}</span>
                            </div>

                            {/* Payment specific adjustments */}
                            {paymentMethod === 'COD' ? (
                                settings.cod_fee > 0 && (
                                    <div className="price-row">
                                        <span>COD Fee</span>
                                        <span className="val">+₹{settings.cod_fee}</span>
                                    </div>
                                )
                            ) : (
                                settings.online_payment_discount > 0 && (
                                    <div className="price-row text-success fw-bold">
                                        <span>Online Payment Discount</span>
                                        <span className="val">-₹{settings.online_payment_discount}</span>
                                    </div>
                                )
                            )}

                            <div className="price-row">
                                <span>Delivery Charges</span>
                                <span className="text-success val">FREE</span>
                            </div>
                            <div className="price-total">
                                <div className="price-row mb-0">
                                    <strong>Amount Payable</strong>
                                    <strong className="fs-5">₹{finalPayable}</strong>
                                </div>
                            </div>

                            {paymentMethod !== 'COD' && settings.online_payment_discount > 0 ? (
                                <div className="savings-hint text-success">
                                    Applied: Online Payment Discount ₹{settings.online_payment_discount}
                                </div>
                            ) : (
                                (orderDetails.discount > 0) && (
                                    <div className="savings-hint">
                                        Your total savings on this order ₹{orderDetails.discount}
                                    </div>
                                )
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* MOBILE STICKY FOOTER FOR PAYMENT */}
            <div className="mobile-checkout-footer d-lg-none">
                <div className="price-info">
                    <span className="label">Amount Payable</span>
                    <span className="val">₹{finalPayable}</span>
                </div>
                <button
                    className="btn-footer-continue"
                    onClick={handlePlaceOrder}
                    disabled={isPlacingOrder}
                >
                    {isPlacingOrder ? "PROCESSING..." : `PAY ₹${finalPayable}`}
                </button>
            </div>
        </div>
    );
};

export default PaymentPage;
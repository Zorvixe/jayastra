// AdminProfile.js - Complete Updated Version with PIN Management
import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import axios from "axios";
import { toast } from "react-toastify";
import "./Profile.css";

const API_URL = process.env.REACT_APP_API_URL;

const Profile = () => {
    const navigate = useNavigate();
    const outletContext = useOutletContext();
    const isMobile = outletContext?.isMobile;
    const [loading, setLoading] = useState(true);
    const [updating, setUpdating] = useState(false);
    const [userRole, setUserRole] = useState(null);
    const [activeTab, setActiveTab] = useState("personal");
    const [pickupAddresses, setPickupAddresses] = useState([]);
    const [showAddressModal, setShowAddressModal] = useState(false);
    const [editingAddress, setEditingAddress] = useState(null);
    const [errorDetails, setErrorDetails] = useState(null);
    const [showErrorModal, setShowErrorModal] = useState(false);
    const [isEditingPhone, setIsEditingPhone] = useState(false);
    const [tempPhone, setTempPhone] = useState("");
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [confirmAction, setConfirmAction] = useState(null);
    const [confirmData, setConfirmData] = useState(null);
    const [isEditingPersonal, setIsEditingPersonal] = useState(false);
    const [isEditingVendor, setIsEditingVendor] = useState(false);

    // PIN Management States
    const [hasPin, setHasPin] = useState(false);
    const [showPinSetup, setShowPinSetup] = useState(false);
    const [showPinReset, setShowPinReset] = useState(false);
    const [pin, setPin] = useState(["", "", "", ""]);
    const [confirmPin, setConfirmPin] = useState(["", "", "", ""]);
    const [pinSetupStep, setPinSetupStep] = useState(1);
    const [pinLoading, setPinLoading] = useState(false);
    const [pinError, setPinError] = useState("");
    const [currentPassword, setCurrentPassword] = useState("");
    const [resetPinLoading, setResetPinLoading] = useState(false);

    const pinInputRefs = [useRef(), useRef(), useRef(), useRef()];
    const confirmPinInputRefs = [useRef(), useRef(), useRef(), useRef()];

    const [addressForm, setAddressForm] = useState({
        location_name: "",
        address_line1: "",
        address_line2: "",
        city: "",
        state: "",
        pincode: "",
        is_default: false
    });

    const [formData, setFormData] = useState({
        first_name: "",
        last_name: "",
        gender: "",
        address: "",
        city: "",
        state: "",
        pincode: "",
        phone: "",
        email: "",
        store_name: "",
        gst_number: "",
        pickup_address_line1: "",
        pickup_address_line2: "",
        pickup_city: "",
        pickup_state: "",
        pickup_pincode: "",
        pickup_location_name: ""
    });

    useEffect(() => {
        const role = localStorage.getItem("userRole");
        setUserRole(role);
        fetchProfile();
        checkPinStatus();
        if (role === 'vendor' || role === 'admin') {
            fetchPickupAddresses();
        }
    }, []);

    useEffect(() => {
        const handleOpenProfileEdit = () => {
            if (activeTab === 'personal') {
                setIsEditingPersonal(true);
            } else if (activeTab === 'vendor') {
                setIsEditingVendor(true);
            }
        };

        window.addEventListener("openProfileEdit", handleOpenProfileEdit);
        return () => window.removeEventListener("openProfileEdit", handleOpenProfileEdit);
    }, [activeTab]);

    // Auto-focus PIN inputs
    useEffect(() => {
        if (showPinSetup && pinSetupStep === 1) {
            setTimeout(() => pinInputRefs[0]?.current?.focus(), 100);
        } else if (showPinSetup && pinSetupStep === 2) {
            setTimeout(() => confirmPinInputRefs[0]?.current?.focus(), 100);
        }
    }, [showPinSetup, pinSetupStep]);

    const checkPinStatus = async () => {
        const token = localStorage.getItem("token");
        if (!token) return;

        try {
            const response = await axios.get(`${API_URL}/auth/pin-status`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setHasPin(response.data.hasPin);
        } catch (error) {
            console.error("Failed to check PIN status:", error);
        }
    };

    const fetchProfile = async () => {
        const token = localStorage.getItem("token");
        if (!token) {
            navigate("/admin/login");
            return;
        }

        try {
            const response = await axios.get(`${API_URL}/user/profile`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setFormData({
                first_name: response.data.first_name || "",
                last_name: response.data.last_name || "",
                gender: response.data.gender || "",
                address: response.data.address || "",
                city: response.data.city || "",
                state: response.data.state || "",
                pincode: response.data.pincode || "",
                phone: response.data.phone || "",
                email: response.data.email || "",
                store_name: response.data.store_name || "",
                gst_number: response.data.gst_number || "",
                pickup_address_line1: response.data.pickup_address_line1 || "",
                pickup_address_line2: response.data.pickup_address_line2 || "",
                pickup_city: response.data.pickup_city || "",
                pickup_state: response.data.pickup_state || "",
                pickup_pincode: response.data.pickup_pincode || "",
                pickup_location_name: response.data.pickup_location_name || ""
            });
            setTempPhone(response.data.phone || "");
        } catch (error) {
            console.error("Failed to fetch profile:", error);
            const errorMsg = error.response?.data?.message || error.message || "Failed to load profile data";
            toast.error(errorMsg);
            setErrorDetails({
                title: "Profile Fetch Error",
                message: errorMsg,
                details: error.response?.data || error.message,
                type: "error"
            });
            setShowErrorModal(true);
        } finally {
            setLoading(false);
        }
    };

    const fetchPickupAddresses = async () => {
        const token = localStorage.getItem("token");
        try {
            const response = await axios.get(`${API_URL}/vendor/pickup-addresses`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (response.data.success) {
                setPickupAddresses(response.data.addresses || []);
            }
        } catch (error) {
            console.error("Failed to fetch pickup addresses:", error);
            setErrorDetails({
                title: "Pickup Addresses Error",
                message: error.response?.data?.message || "Could not load pickup addresses",
                details: error.response?.data || error.message,
                type: "warning"
            });
            setShowErrorModal(true);
        }
    };

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    const handleAddressFormChange = (e) => {
        setAddressForm({
            ...addressForm,
            [e.target.name]: e.target.value
        });
    };

    const handlePinChange = (index, value, isConfirm = false) => {
        if (value && !/^\d*$/.test(value)) return;

        if (isConfirm) {
            const newPin = [...confirmPin];
            newPin[index] = value.slice(0, 1);
            setConfirmPin(newPin);
            if (value && index < 3) {
                confirmPinInputRefs[index + 1]?.current?.focus();
            }
        } else {
            const newPin = [...pin];
            newPin[index] = value.slice(0, 1);
            setPin(newPin);
            if (value && index < 3) {
                pinInputRefs[index + 1]?.current?.focus();
            }
        }

        if (pinError) setPinError("");
    };

    const handlePinKeyDown = (index, e, isConfirm = false) => {
        const currentPin = isConfirm ? confirmPin : pin;
        const prevRefs = isConfirm ? confirmPinInputRefs : pinInputRefs;

        if (e.key === 'Backspace' && !currentPin[index] && index > 0) {
            prevRefs[index - 1]?.current?.focus();
        }

        if (e.key === 'Enter' && currentPin.join('').length === 4) {
            if (isConfirm) {
                handleCreatePin();
            } else if (pinSetupStep === 1) {
                handleGoToConfirm();
            }
        }
    };

    const handleGoToConfirm = () => {
        const pinCode = pin.join('');
        if (pinCode.length !== 4) {
            setPinError('Please enter complete 4-digit PIN');
            return;
        }
        setPinError('');
        setPinSetupStep(2);
    };

    const handleCreatePin = async () => {
        const pinCode = pin.join('');
        const confirmPinCode = confirmPin.join('');

        if (pinCode.length !== 4) {
            setPinError('Please enter complete 4-digit PIN');
            return;
        }

        if (pinCode !== confirmPinCode) {
            setPinError('PINs do not match');
            return;
        }

        setPinLoading(true);
        setPinError('');

        const token = localStorage.getItem("token");

        try {
            await axios.post(`${API_URL}/auth/create-pin`, { pin: pinCode }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            toast.success("PIN created successfully! You can now use PIN for quick login.");
            setShowPinSetup(false);
            setHasPin(true);
            setPin(["", "", "", ""]);
            setConfirmPin(["", "", "", ""]);
            setPinSetupStep(1);
        } catch (error) {
            setPinError(error.response?.data?.message || 'Failed to create PIN');
        } finally {
            setPinLoading(false);
        }
    };

    const handleResetPin = async () => {
        if (!currentPassword) {
            setPinError("Please enter your current password");
            return;
        }

        const newPinCode = pin.join('');
        if (newPinCode.length !== 4) {
            setPinError('PIN must be exactly 4 digits');
            return;
        }

        if (newPinCode !== confirmPin.join('')) {
            setPinError('PINs do not match');
            return;
        }

        setResetPinLoading(true);
        setPinError('');

        const token = localStorage.getItem("token");

        try {
            await axios.post(`${API_URL}/auth/reset-pin`, {
                password: currentPassword,
                newPin: newPinCode
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            toast.success("PIN reset successfully!");
            setShowPinReset(false);
            setCurrentPassword("");
            setPin(["", "", "", ""]);
            setConfirmPin(["", "", "", ""]);
            setPinSetupStep(1);
        } catch (error) {
            setPinError(error.response?.data?.message || 'Failed to reset PIN');
        } finally {
            setResetPinLoading(false);
        }
    };

    const handleDisablePin = () => {
        setConfirmAction(() => () => executeDisablePin());
        setConfirmData({ type: "disable_pin" });
        setShowConfirmModal(true);
    };

    const executeDisablePin = async () => {
        const token = localStorage.getItem("token");
        try {
            await axios.delete(`${API_URL}/auth/disable-pin`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            toast.success("PIN login disabled successfully");
            setHasPin(false);
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to disable PIN');
        } finally {
            setShowConfirmModal(false);
        }
    };

    const validatePersonalForm = () => {
        const errors = [];
        if (!formData.first_name.trim()) errors.push("First name is required");
        if (!formData.last_name.trim()) errors.push("Last name is required");
        if (formData.pincode && !/^\d{6}$/.test(formData.pincode)) errors.push("Pincode must be 6 digits");
        return errors;
    };

    const validatePhoneNumber = (phone) => {
        const phoneRegex = /^[6-9]\d{9}$/;
        if (!phoneRegex.test(phone)) {
            return "Phone number must be 10 digits and start with 6,7,8, or 9";
        }
        return null;
    };

    const validateVendorForm = () => {
        const errors = [];
        if (formData.gst_number && !/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(formData.gst_number)) {
            errors.push("Invalid GST number format");
        }
        if (formData.pickup_pincode && !/^\d{6}$/.test(formData.pickup_pincode)) {
            errors.push("Pickup pincode must be 6 digits");
        }
        return errors;
    };

    const handleUpdatePhone = async () => {
        const phoneError = validatePhoneNumber(tempPhone);
        if (phoneError) {
            setErrorDetails({
                title: "Invalid Phone Number",
                message: phoneError,
                type: "warning"
            });
            setShowErrorModal(true);
            return;
        }

        setUpdating(true);
        const token = localStorage.getItem("token");

        try {
            const response = await axios.put(
                `${API_URL}/user/profile/phone`,
                { phone: tempPhone },
                { headers: { Authorization: `Bearer ${token}` } }
            );

            if (response.data.success) {
                setFormData(prev => ({ ...prev, phone: tempPhone }));
                localStorage.setItem("user_phone", tempPhone);
                toast.success("Phone number updated successfully!");
                setIsEditingPhone(false);
            }
        } catch (error) {
            console.error("Phone update error:", error);
            const errorMsg = error.response?.data?.message || error.message || "Failed to update phone number";
            setErrorDetails({
                title: "Phone Update Failed",
                message: errorMsg,
                details: error.response?.data || error.message,
                type: "error"
            });
            setShowErrorModal(true);
        } finally {
            setUpdating(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        const errors = validatePersonalForm();
        if (errors.length > 0) {
            setErrorDetails({
                title: "Validation Error",
                message: errors.join("\n"),
                type: "warning"
            });
            setShowErrorModal(true);
            return;
        }

        setUpdating(true);
        const token = localStorage.getItem("token");
        if (!token) {
            setErrorDetails({
                title: "Session Expired",
                message: "Please login again to continue.",
                type: "error"
            });
            setShowErrorModal(true);
            setTimeout(() => navigate("/admin/login"), 2000);
            return;
        }

        try {
            await axios.put(
                `${API_URL}/user/profile`,
                {
                    first_name: formData.first_name,
                    last_name: formData.last_name,
                    gender: formData.gender,
                    address: formData.address,
                    city: formData.city,
                    state: formData.state,
                    pincode: formData.pincode
                },
                { headers: { Authorization: `Bearer ${token}` } }
            );

            const fullName = `${formData.first_name} ${formData.last_name}`.trim();
            localStorage.setItem("admin_name", fullName);
            toast.success("Profile updated successfully!");

            setIsEditingPersonal(false);
        } catch (error) {
            console.error("Profile update error:", error);
            const errorMsg = error.response?.data?.message || error.message || "Failed to update profile";

            setErrorDetails({
                title: "Profile Update Failed",
                message: errorMsg,
                details: error.response?.data || error.message,
                status: error.response?.status,
                endpoint: "/user/profile",
                type: "error"
            });
            setShowErrorModal(true);
        } finally {
            setUpdating(false);
        }
    };

    const handleVendorSubmit = async (e) => {
        e.preventDefault();

        const errors = validateVendorForm();
        if (errors.length > 0) {
            setErrorDetails({
                title: "Validation Error",
                message: errors.join("\n"),
                type: "warning"
            });
            setShowErrorModal(true);
            return;
        }

        setUpdating(true);
        const token = localStorage.getItem("token");
        if (!token) {
            setErrorDetails({
                title: "Session Expired",
                message: "Please login again to continue.",
                type: "error"
            });
            setShowErrorModal(true);
            setTimeout(() => navigate("/admin/login"), 2000);
            return;
        }

        try {
            const updateData = {
                store_name: formData.store_name,
                gst_number: formData.gst_number,
                pickup_address_line1: formData.pickup_address_line1,
                pickup_address_line2: formData.pickup_address_line2,
                pickup_city: formData.pickup_city,
                pickup_state: formData.pickup_state,
                pickup_pincode: formData.pickup_pincode,
                pickup_location_name: formData.pickup_location_name
            };

            const response = await axios.put(
                `${API_URL}/user/profile/vendor`,
                updateData,
                { headers: { Authorization: `Bearer ${token}` } }
            );

            if (response.data.success) {
                toast.success("Vendor details updated successfully!");
                setIsEditingVendor(false);
                await fetchProfile();
            }
        } catch (error) {
            console.error("Vendor update error:", error);

            let errorMsg = "Failed to update vendor details";
            let suggestion = null;

            if (error.response) {
                errorMsg = error.response.data?.message || errorMsg;

                if (error.response.status === 401) {
                    errorMsg = "Session expired. Please login again.";
                    setTimeout(() => navigate("/admin/login"), 2000);
                } else if (error.response.status === 403) {
                    errorMsg = "You don't have permission to update vendor details.";
                } else if (error.response.status === 500) {
                    errorMsg = "Server error. Our team has been notified.";
                }

                if (error.response.data?.message?.includes("column") && error.response.data?.message?.includes("does not exist")) {
                    errorMsg = "Database schema issue detected";
                    suggestion = "Please contact administrator to add missing 'updated_at' column to users table.";
                }
            } else if (error.request) {
                errorMsg = "Network error. Please check your internet connection.";
            }

            setErrorDetails({
                title: "Vendor Update Failed",
                message: errorMsg,
                suggestion: suggestion,
                details: error.response?.data || error.message,
                type: "error"
            });
            setShowErrorModal(true);
        } finally {
            setUpdating(false);
        }
    };

    const handleAddAddress = async () => {
        const token = localStorage.getItem("token");
        const validationErrors = [];

        if (!addressForm.location_name.trim()) validationErrors.push("Location name is required");
        if (!addressForm.address_line1.trim()) validationErrors.push("Address line 1 is required");
        if (!addressForm.city.trim()) validationErrors.push("City is required");
        if (!addressForm.state.trim()) validationErrors.push("State is required");
        if (!addressForm.pincode.trim() || !/^\d{6}$/.test(addressForm.pincode)) validationErrors.push("Valid 6-digit pincode is required");

        if (validationErrors.length > 0) {
            setErrorDetails({
                title: "Validation Error",
                message: validationErrors.join("\n"),
                type: "warning"
            });
            setShowErrorModal(true);
            return;
        }

        try {
            const response = await axios.post(
                `${API_URL}/vendor/pickup-addresses`,
                addressForm,
                { headers: { Authorization: `Bearer ${token}` } }
            );
            if (response.data.success) {
                toast.success("Pickup address added successfully!");
                setShowAddressModal(false);
                setAddressForm({
                    location_name: "",
                    address_line1: "",
                    address_line2: "",
                    city: "",
                    state: "",
                    pincode: "",
                    is_default: false
                });
                fetchPickupAddresses();
            }
        } catch (error) {
            console.error("Add address error:", error);
            setErrorDetails({
                title: "Add Address Failed",
                message: error.response?.data?.message || "Failed to add address",
                details: error.response?.data || error.message,
                type: "error"
            });
            setShowErrorModal(true);
        }
    };

    const handleEditAddress = (address) => {
        setEditingAddress(address);
        setAddressForm({
            location_name: address.location_name,
            address_line1: address.address_line1,
            address_line2: address.address_line2 || "",
            city: address.city,
            state: address.state,
            pincode: address.pincode,
            is_default: address.is_default
        });
        setShowAddressModal(true);
    };

    const handleUpdateAddress = async () => {
        const token = localStorage.getItem("token");
        const validationErrors = [];

        if (!addressForm.location_name.trim()) validationErrors.push("Location name is required");
        if (!addressForm.address_line1.trim()) validationErrors.push("Address line 1 is required");
        if (!addressForm.city.trim()) validationErrors.push("City is required");
        if (!addressForm.state.trim()) validationErrors.push("State is required");
        if (!addressForm.pincode.trim() || !/^\d{6}$/.test(addressForm.pincode)) validationErrors.push("Valid 6-digit pincode is required");

        if (validationErrors.length > 0) {
            setErrorDetails({
                title: "Validation Error",
                message: validationErrors.join("\n"),
                type: "warning"
            });
            setShowErrorModal(true);
            return;
        }

        try {
            const response = await axios.put(
                `${API_URL}/vendor/pickup-addresses/${editingAddress.id}`,
                addressForm,
                { headers: { Authorization: `Bearer ${token}` } }
            );
            if (response.data.success) {
                toast.success("Pickup address updated successfully!");
                setShowAddressModal(false);
                setEditingAddress(null);
                setAddressForm({
                    location_name: "",
                    address_line1: "",
                    address_line2: "",
                    city: "",
                    state: "",
                    pincode: "",
                    is_default: false
                });
                fetchPickupAddresses();
            }
        } catch (error) {
            console.error("Update address error:", error);
            setErrorDetails({
                title: "Update Address Failed",
                message: error.response?.data?.message || "Failed to update address",
                details: error.response?.data || error.message,
                type: "error"
            });
            setShowErrorModal(true);
        }
    };

    const confirmDeleteAddress = (id) => {
        setConfirmAction(() => () => handleDeleteAddress(id));
        setConfirmData({ id, type: "address" });
        setShowConfirmModal(true);
    };

    const handleDeleteAddress = async (id) => {
        const token = localStorage.getItem("token");
        try {
            const response = await axios.delete(
                `${API_URL}/vendor/pickup-addresses/${id}`,
                { headers: { Authorization: `Bearer ${token}` } }
            );
            if (response.data.success) {
                toast.success("Address deleted successfully!");
                fetchPickupAddresses();
            }
        } catch (error) {
            console.error("Delete address error:", error);
            setErrorDetails({
                title: "Delete Address Failed",
                message: error.response?.data?.message || "Failed to delete address",
                details: error.response?.data || error.message,
                type: "error"
            });
            setShowErrorModal(true);
        }
        setShowConfirmModal(false);
    };

    const handleSetDefaultAddress = async (id) => {
        const token = localStorage.getItem("token");
        try {
            const response = await axios.put(
                `${API_URL}/vendor/pickup-addresses/${id}/default`,
                {},
                { headers: { Authorization: `Bearer ${token}` } }
            );
            if (response.data.success) {
                toast.success("Default address updated!");
                fetchPickupAddresses();
            }
        } catch (error) {
            console.error("Set default address error:", error);
            setErrorDetails({
                title: "Set Default Failed",
                message: error.response?.data?.message || "Failed to set default address",
                details: error.response?.data || error.message,
                type: "error"
            });
            setShowErrorModal(true);
        }
    };

    if (loading) {
        return (
            <div className="dash-loader-overlay">
                <div className="dash-loader-container">
                    <div className="dash-spinner"></div>
                </div>
            </div>
        );
    }

    const isVendor = userRole === 'vendor' || userRole === 'admin';

    return (
        <div className="prof-container">
            {/* PIN Setup Modal */}
            {showPinSetup && (
                <div className={`prof-modal-overlay ${isMobile ? 'prof-mobile-sheet-overlay' : ''}`} onClick={() => setShowPinSetup(false)}>
                    <div className={`prof-modal-content prof-pin-setup-modal ${isMobile ? 'prof-mobile-sheet-content' : ''}`} onClick={(e) => e.stopPropagation()}>
                        {isMobile && <div className="prof-sheet-handle"></div>}
                        <div className="prof-modal-header">
                            <h3>Set Up PIN for Quick Login</h3>
                            <button className="prof-modal-close" onClick={() => setShowPinSetup(false)}>
                                <i className="bi bi-x-lg"></i>
                            </button>
                        </div>
                        <div className="prof-modal-body">
                            <div className="prof-pin-setup-content">
                                <div className="prof-pin-icon-large">🔐</div>
                                <p>Create a 4-digit PIN to login quickly next time</p>

                                {pinSetupStep === 1 ? (
                                    <>
                                        <div className="prof-pin-inputs">
                                            {pin.map((digit, index) => (
                                                <input
                                                    key={index}
                                                    ref={el => pinInputRefs[index] = el}
                                                    type="password"
                                                    maxLength="1"
                                                    value={digit}
                                                    onChange={(e) => handlePinChange(index, e.target.value, false)}
                                                    onKeyDown={(e) => handlePinKeyDown(index, e, false)}
                                                    className={`prof-pin-digit ${pinError ? 'prof-pin-error-border' : ''}`}
                                                    inputMode="numeric"
                                                    pattern="\d*"
                                                    autoComplete="off"
                                                />
                                            ))}
                                        </div>
                                        {pinError && <div className="prof-pin-error-message">{pinError}</div>}
                                        <button
                                            className="prof-btn-submit"
                                            onClick={handleGoToConfirm}
                                            disabled={pin.join('').length !== 4}
                                            style={{ width: '100%', marginTop: '20px' }}
                                        >
                                            Continue
                                        </button>
                                    </>
                                ) : (
                                    <>
                                        <div className="prof-pin-inputs">
                                            {confirmPin.map((digit, index) => (
                                                <input
                                                    key={index}
                                                    ref={el => confirmPinInputRefs[index] = el}
                                                    type="password"
                                                    maxLength="1"
                                                    value={digit}
                                                    onChange={(e) => handlePinChange(index, e.target.value, true)}
                                                    onKeyDown={(e) => handlePinKeyDown(index, e, true)}
                                                    className={`prof-pin-digit ${pinError ? 'prof-pin-error-border' : ''}`}
                                                    inputMode="numeric"
                                                    pattern="\d*"
                                                    autoComplete="off"
                                                />
                                            ))}
                                        </div>
                                        {pinError && <div className="prof-pin-error-message">{pinError}</div>}
                                        <div className="prof-pin-buttons">
                                            <button className="prof-btn-cancel" onClick={() => setPinSetupStep(1)}>
                                                Back
                                            </button>
                                            <button
                                                className="prof-btn-submit"
                                                onClick={handleCreatePin}
                                                disabled={pinLoading || confirmPin.join('').length !== 4}
                                            >
                                                {pinLoading ? 'Creating...' : 'Create PIN'}
                                            </button>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* PIN Reset Modal */}
            {showPinReset && (
                <div className={`prof-modal-overlay ${isMobile ? 'prof-mobile-sheet-overlay' : ''}`} onClick={() => setShowPinReset(false)}>
                    <div className={`prof-modal-content prof-pin-setup-modal ${isMobile ? 'prof-mobile-sheet-content' : ''}`} onClick={(e) => e.stopPropagation()}>
                        {isMobile && <div className="prof-sheet-handle"></div>}
                        <div className="prof-modal-header">
                            <h3>Reset PIN</h3>
                            <button className="prof-modal-close" onClick={() => setShowPinReset(false)}>
                                <i className="bi bi-x-lg"></i>
                            </button>
                        </div>
                        <div className="prof-modal-body">
                            <div className="prof-pin-setup-content">
                                <p>Reset your 4-digit PIN</p>

                                <div className="prof-form-group" style={{ marginTop: '15px', display: 'flex', flexDirection: 'column' }}>
                                    <label>Current Password</label>
                                    <input
                                        type="password"
                                        value={currentPassword}
                                        onChange={(e) => setCurrentPassword(e.target.value)}
                                        placeholder="Enter your current password"
                                        className={pinError ? 'error-input' : ''}
                                        style={{ marginBottom: '20px' }}
                                    />
                                </div>

                                <div className="prof-pin-inputs" style={{ marginTop: '15px', display: 'flex', flexDirection: 'column' }}>
                                    <label>New Pin</label>

                                    <div className="prof-pin-digit-con">
                                        {pin.map((digit, index) => (
                                            <input
                                                key={index}
                                                ref={el => pinInputRefs[index] = el}
                                                type="password"
                                                maxLength="1"
                                                value={digit}
                                                onChange={(e) => handlePinChange(index, e.target.value, false)}
                                                onKeyDown={(e) => handlePinKeyDown(index, e, false)}
                                                className={`prof-pin-digit ${pinError ? 'prof-pin-error-border' : ''}`}
                                                inputMode="numeric"
                                                pattern="\d*"
                                                autoComplete="off"
                                            />
                                        ))}
                                    </div>
                                </div>

                                <div className="prof-pin-inputs" style={{ marginTop: '15px', display: 'flex', flexDirection: 'column' }}>
                                    <label>Confirm New Pin</label>

                                    <div className="prof-pin-digit-con">
                                        {confirmPin.map((digit, index) => (
                                            <input
                                                key={index}
                                                ref={el => confirmPinInputRefs[index] = el}
                                                type="password"
                                                maxLength="1"
                                                value={digit}
                                                onChange={(e) => handlePinChange(index, e.target.value, true)}
                                                onKeyDown={(e) => handlePinKeyDown(index, e, true)}
                                                className={`prof-pin-digit ${pinError ? 'prof-pin-error-border' : ''}`}
                                                inputMode="numeric"
                                                pattern="\d*"
                                                autoComplete="off"
                                            />
                                        ))}
                                    </div>
                                </div>

                                {pinError && <div className="prof-pin-error-message" style={{ marginTop: '15px' }}>{pinError}</div>}

                                <div className="prof-pin-buttons" style={{ marginTop: '20px' }}>
                                    <button className="prof-btn-cancel" onClick={() => setShowPinReset(false)}>
                                        Cancel
                                    </button>
                                    <button
                                        className="prof-btn-submit"
                                        onClick={handleResetPin}
                                        disabled={resetPinLoading || !currentPassword || pin.join('').length !== 4 || confirmPin.join('').length !== 4}
                                    >
                                        {resetPinLoading ? 'Resetting...' : 'Reset PIN'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Confirmation Modal */}
            {showConfirmModal && (
                <div className={`prof-modal-overlay ${isMobile ? 'prof-mobile-sheet-overlay' : ''}`} onClick={() => setShowConfirmModal(false)}>
                    <div className={`prof-modal-content prof-confirm-modal ${isMobile ? 'prof-mobile-sheet-content' : ''}`} onClick={(e) => e.stopPropagation()}>
                        {isMobile && <div className="prof-sheet-handle"></div>}
                        <div className="prof-modal-header prof-confirm-header">
                            <div className="prof-confirm-icon">
                                <i className="bi bi-question-circle-fill"></i>
                            </div>
                            <h3>Confirm Action</h3>
                            <button className="prof-modal-close" onClick={() => setShowConfirmModal(false)}>
                                <i className="bi bi-x-lg"></i>
                            </button>
                        </div>
                        <div className="prof-modal-body">
                            {confirmData?.type === "disable_pin" ? (
                                <>
                                    <p>Are you sure you want to disable PIN login?</p>
                                    <p className="prof-confirm-warning">You will need to use your password to login next time.</p>
                                </>
                            ) : (
                                <>
                                    <p>Are you sure you want to delete this address?</p>
                                    <p className="prof-confirm-warning">This action cannot be undone.</p>
                                </>
                            )}
                        </div>
                        <div className="prof-modal-footer">
                            <button className="prof-btn-cancel" onClick={() => setShowConfirmModal(false)}>
                                Cancel
                            </button>
                            <button
                                className={confirmData?.type === "disable_pin" ? "prof-btn-submit" : "prof-btn-danger"}
                                onClick={confirmAction}
                            >
                                {confirmData?.type === "disable_pin" ? (
                                    <><i className="bi bi-shield-slash"></i> Disable PIN</>
                                ) : (
                                    <><i className="bi bi-trash"></i> Delete</>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Error Modal */}
            {showErrorModal && errorDetails && (
                <div className="prof-error-modal-overlay" onClick={() => setShowErrorModal(false)}>
                    <div className="prof-error-modal-container" onClick={(e) => e.stopPropagation()}>
                        <div className={`prof-error-modal-header ${errorDetails.type === 'error' ? 'prof-error' : 'prof-warning'}`}>
                            <div className="prof-error-icon">
                                <i className={`bi ${errorDetails.type === 'error' ? 'bi-exclamation-triangle-fill' : 'bi-info-circle-fill'}`}></i>
                            </div>
                            <h3>{errorDetails.title}</h3>
                        </div>

                        <div className="prof-error-modal-body">
                            <div className="prof-error-message-box">
                                <strong>Message:</strong>
                                <p>{errorDetails.message}</p>
                            </div>

                            {errorDetails.suggestion && (
                                <div className="prof-error-suggestion-box">
                                    <strong>💡 Suggestion:</strong>
                                    <p>{errorDetails.suggestion}</p>
                                </div>
                            )}

                            {errorDetails.details && (
                                <div className="prof-error-details-box">
                                    <strong>📋 Technical Details:</strong>
                                    <pre>{typeof errorDetails.details === 'object'
                                        ? JSON.stringify(errorDetails.details, null, 2)
                                        : errorDetails.details}
                                    </pre>
                                </div>
                            )}

                            {errorDetails.status && (
                                <div className="prof-error-status">
                                    <span className="prof-status-badge">Status Code: {errorDetails.status}</span>
                                    {errorDetails.endpoint && (
                                        <span className="prof-endpoint-badge">Endpoint: {errorDetails.endpoint}</span>
                                    )}
                                </div>
                            )}
                        </div>

                        <div className="prof-error-modal-footer">
                            <button
                                className="prof-error-copy-btn"
                                onClick={() => {
                                    const errorText = `
Error: ${errorDetails.title}
Message: ${errorDetails.message}
${errorDetails.suggestion ? `Suggestion: ${errorDetails.suggestion}` : ''}
${errorDetails.details ? `Details: ${typeof errorDetails.details === 'object' ? JSON.stringify(errorDetails.details, null, 2) : errorDetails.details}` : ''}
Timestamp: ${new Date().toLocaleString()}
                  `;
                                    navigator.clipboard.writeText(errorText);
                                    toast.success("Error details copied to clipboard");
                                }}
                            >
                                <i className="bi bi-clipboard"></i> Copy Error
                            </button>
                            <button
                                className="prof-error-close-btn"
                                onClick={() => setShowErrorModal(false)}
                            >
                                <i className="bi bi-check-lg"></i> Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="prof-card">
                <div className="prof-header">
                    <div className="prof-avatar-large">
                        <h2>{(() => {
                            const fn = formData.first_name?.trim();
                            const ln = formData.last_name?.trim();
                            if (fn && ln) return (fn.charAt(0) + ln.charAt(0)).toUpperCase();
                            if (fn) return fn.charAt(0).toUpperCase();
                            if (ln) return ln.charAt(0).toUpperCase();
                            return "U";
                        })()}</h2>
                    </div>
                    <div>
                        <h2>{formData.first_name} {formData.last_name}</h2>
                        <p>{formData.email || "Not provided"}</p>
                        <p>{formData.phone || "Not provided"}</p>
                    </div>
                </div>

                <div className="prof-tabs">
                    <button
                        className={`prof-tab-btn ${activeTab === 'personal' ? 'prof-active' : ''}`}
                        onClick={() => setActiveTab('personal')}
                    >
                        <i className="bi bi-person"></i> Personal Info
                    </button>
                    <button
                        className={`prof-tab-btn ${activeTab === 'security' ? 'prof-active' : ''}`}
                        onClick={() => setActiveTab('security')}
                    >
                        <i className="bi bi-shield-lock"></i> Security
                    </button>
                    {isVendor && (
                        <>
                            <button
                                className={`prof-tab-btn ${activeTab === 'vendor' ? 'prof-active' : ''}`}
                                onClick={() => setActiveTab('vendor')}
                            >
                                <i className="bi bi-shop"></i> Vendor Details
                            </button>
                            {/* <button
                                className={`prof-tab-btn ${activeTab === 'pickup' ? 'prof-active' : ''}`}
                                onClick={() => setActiveTab('pickup')}
                            >
                                <i className="bi bi-geo-alt"></i> Pickup Addresses
                            </button> */}
                        </>
                    )}
                </div>

                <div className="prof-content">
                    {/* Personal Information Tab */}
                    {activeTab === 'personal' && (
                        <>
                            {!isEditingPersonal ? (
                                <div className="prof-details-view">
                                    <div className="prof-details-header">
                                        <h3>Personal Information</h3>
                                        {!isMobile && (
                                            <button
                                                className="prof-btn-submit"
                                                onClick={() => setIsEditingPersonal(true)}
                                            >
                                                <i className="bi bi-pencil"></i> Edit
                                            </button>
                                        )}
                                    </div>
                                    <div className="prof-details-grid">
                                        <div className="prof-detail-item">
                                            <label>First Name</label>
                                            <p>{formData.first_name || "Not provided"}</p>
                                        </div>
                                        <div className="prof-detail-item">
                                            <label>Last Name</label>
                                            <p>{formData.last_name || "Not provided"}</p>
                                        </div>
                                        <div className="prof-detail-item">
                                            <label>Gender</label>
                                            <p>{formData.gender || "Not provided"}</p>
                                        </div>
                                        <div className="prof-detail-item">
                                            <label>City</label>
                                            <p>{formData.city || "Not provided"}</p>
                                        </div>
                                        <div className="prof-detail-item">
                                            <label>State</label>
                                            <p>{formData.state || "Not provided"}</p>
                                        </div>
                                        <div className="prof-detail-item">
                                            <label>Pincode</label>
                                            <p>{formData.pincode || "Not provided"}</p>
                                        </div>
                                        <div className="prof-detail-item prof-detail-item-full">
                                            <label>Address</label>
                                            <p>{formData.address || "Not provided"}</p>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <form onSubmit={handleSubmit} className="prof-form">
                                    <div className="prof-form-header">
                                        <h3>Edit Personal Information</h3>
                                        <button
                                            type="button"
                                            className="prof-modal-close"
                                            onClick={() => setIsEditingPersonal(false)}
                                        >
                                            <i className="bi bi-x-lg"></i>
                                        </button>
                                    </div>
                                    <div className="prof-form-row">
                                        <div className="prof-form-group">
                                            <label>First Name *</label>
                                            <input
                                                type="text"
                                                name="first_name"
                                                value={formData.first_name}
                                                onChange={handleChange}
                                                placeholder="Enter first name"
                                                required
                                            />
                                        </div>
                                        <div className="prof-form-group">
                                            <label>Last Name *</label>
                                            <input
                                                type="text"
                                                name="last_name"
                                                value={formData.last_name}
                                                onChange={handleChange}
                                                placeholder="Enter last name"
                                                required
                                            />
                                        </div>
                                    </div>

                                    <div className="prof-form-row">
                                        <div className="prof-form-group">
                                            <label>Email</label>
                                            <input
                                                type="email"
                                                value={formData.email}
                                                disabled
                                                className="prof-readonly-field"
                                            />
                                            <small>Email cannot be changed</small>
                                        </div>
                                        <div className="prof-form-group">
                                            <label>Phone Number</label>
                                            {!isEditingPhone ? (
                                                <div className="prof-phone-display">
                                                    <input
                                                        type="tel"
                                                        value={formData.phone || "Not set"}
                                                        disabled
                                                        className="prof-readonly-field"
                                                    />
                                                    <button
                                                        type="button"
                                                        className="prof-edit-phone-btn"
                                                        onClick={() => {
                                                            setTempPhone(formData.phone || "");
                                                            setIsEditingPhone(true);
                                                        }}
                                                    >
                                                        <i className="bi bi-pencil"></i> Edit
                                                    </button>
                                                </div>
                                            ) : (
                                                <div className="prof-phone-edit">
                                                    <input
                                                        type="tel"
                                                        value={tempPhone}
                                                        onChange={(e) => setTempPhone(e.target.value)}
                                                        placeholder="Enter 10-digit mobile number"
                                                        maxLength="10"
                                                        className="prof-phone-input"
                                                    />
                                                    <div className="prof-phone-edit-actions">
                                                        <button
                                                            type="button"
                                                            className="prof-btn-save-phone"
                                                            onClick={handleUpdatePhone}
                                                            disabled={updating}
                                                        >
                                                            {updating ? "Saving..." : "Save"}
                                                        </button>
                                                        <button
                                                            type="button"
                                                            className="prof-btn-cancel-phone"
                                                            onClick={() => {
                                                                setIsEditingPhone(false);
                                                                setTempPhone(formData.phone || "");
                                                            }}
                                                        >
                                                            Cancel
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                            <small>10-digit mobile number (used for login)</small>
                                        </div>
                                    </div>

                                    <div className="prof-form-row">
                                        <div className="prof-form-group">
                                            <label>Gender</label>
                                            <select name="gender" value={formData.gender} onChange={handleChange}>
                                                <option value="">Select Gender</option>
                                                <option value="Male">Male</option>
                                                <option value="Female">Female</option>
                                                <option value="Other">Other</option>
                                            </select>
                                        </div>

                                        <div className="prof-form-group">
                                            <label>Pincode</label>
                                            <input
                                                type="text"
                                                name="pincode"
                                                value={formData.pincode}
                                                onChange={handleChange}
                                                placeholder="Enter pincode"
                                                maxLength="6"
                                            />
                                            <small>6-digit pincode</small>
                                        </div>
                                    </div>

                                    <div className="prof-form-row">
                                        <div className="prof-form-group">
                                            <label>City</label>
                                            <input
                                                type="text"
                                                name="city"
                                                value={formData.city}
                                                onChange={handleChange}
                                                placeholder="Enter city"
                                            />
                                        </div>
                                        <div className="prof-form-group">
                                            <label>State</label>
                                            <input
                                                type="text"
                                                name="state"
                                                value={formData.state}
                                                onChange={handleChange}
                                                placeholder="Enter state"
                                            />
                                        </div>
                                    </div>

                                    <div className="prof-form-group">
                                        <label>Address</label>
                                        <textarea
                                            name="address"
                                            value={formData.address}
                                            onChange={handleChange}
                                            placeholder="Enter your full address"
                                            rows="3"
                                        />
                                    </div>

                                    <div className="prof-form-actions">
                                        <button
                                            type="button"
                                            className="prof-btn-cancel"
                                            onClick={() => {
                                                setIsEditingPersonal(false);
                                                fetchProfile();
                                            }}
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="submit"
                                            className="prof-btn-submit"
                                            disabled={updating}
                                        >
                                            {updating ? (
                                                <><i className="bi bi-hourglass-split"></i> Updating...</>
                                            ) : (
                                                <><i className="bi bi-check-lg"></i> Update Profile</>
                                            )}
                                        </button>
                                    </div>
                                </form>
                            )}
                        </>
                    )}

                    {/* Security Tab - PIN Management */}
                    {activeTab === 'security' && (
                        <div className="prof-security-section">
                            <div className="prof-section-header">
                                <h3><i className="bi bi-shield-lock"></i> Security Settings</h3>
                            </div>

                            <div className="prof-security-card">
                                <div className="prof-security-icon">
                                    <i className="bi bi-key"></i>
                                </div>
                                <div className="prof-security-info">
                                    <h4>PIN Login</h4>
                                    <p>Use a 4-digit PIN for quick and secure login</p>
                                    {hasPin ? (
                                        <>
                                            <div className="prof-security-badge active">
                                                <i className="bi bi-check-circle-fill"></i> PIN Enabled
                                            </div>
                                            <div className="prof-security-actions">
                                                <button
                                                    className="prof-security-btn secondary"
                                                    onClick={() => setShowPinReset(true)}
                                                >
                                                    <i className="bi bi-arrow-repeat"></i> Reset PIN
                                                </button>
                                                <button
                                                    className="prof-security-btn danger"
                                                    onClick={handleDisablePin}
                                                >
                                                    <i className="bi bi-trash"></i> Disable PIN
                                                </button>
                                            </div>
                                        </>
                                    ) : (
                                        <>
                                            <div className="prof-security-badge disabled">
                                                <i className="bi bi-x-circle-fill"></i> PIN Disabled
                                            </div>
                                            <div className="prof-security-actions">
                                                <button
                                                    className="prof-security-btn primary"
                                                    onClick={() => setShowPinSetup(true)}
                                                >
                                                    <i className="bi bi-plus-circle"></i> Set Up PIN
                                                </button>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>

                            <div className="prof-security-note">
                                <i className="bi bi-info-circle"></i>
                                <div>
                                    <strong>Note:</strong>
                                    <ul>
                                        <li>PIN must be exactly 4 digits</li>
                                        <li>After 5 failed attempts, account will be locked for 15 minutes</li>
                                        <li>You can still login using your password</li>
                                        <li>Reset PIN requires password verification</li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Vendor Details Tab */}
                    {activeTab === 'vendor' && isVendor && (
                        <>
                            {!isEditingVendor ? (
                                <div className="prof-details-view">
                                    <div className="prof-details-header">
                                        <h3>Vendor Details</h3>
                                        {!isMobile && (
                                            <button
                                                className="prof-btn-submit"
                                                onClick={() => setIsEditingVendor(true)}
                                            >
                                                <i className="bi bi-pencil"></i> Edit
                                            </button>
                                        )}
                                    </div>
                                    <div className="prof-details-grid">
                                        <div className="prof-detail-item">
                                            <label>Store Name</label>
                                            <p>{formData.store_name || "Not provided"}</p>
                                        </div>
                                        <div className="prof-detail-item">
                                            <label>GST Number</label>
                                            <p>{formData.gst_number || "Not provided"}</p>
                                        </div>
                                        <div className="prof-detail-item prof-detail-item-full">
                                            <label>Pickup Location Name</label>
                                            <p>{formData.pickup_location_name || "Not provided"}</p>
                                        </div>
                                        <div className="prof-detail-item">
                                            <label>Pickup City</label>
                                            <p>{formData.pickup_city || "Not provided"}</p>
                                        </div>
                                        <div className="prof-detail-item">
                                            <label>Pickup State</label>
                                            <p>{formData.pickup_state || "Not provided"}</p>
                                        </div>
                                        <div className="prof-detail-item">
                                            <label>Pickup Pincode</label>
                                            <p>{formData.pickup_pincode || "Not provided"}</p>
                                        </div>
                                        <div className="prof-detail-item prof-detail-item-full">
                                            <label>Pickup Address Line 1</label>
                                            <p>{formData.pickup_address_line1 || "Not provided"}</p>
                                        </div>
                                        <div className="prof-detail-item prof-detail-item-full">
                                            <label>Pickup Address Line 2</label>
                                            <p>{formData.pickup_address_line2 || "Not provided"}</p>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <form onSubmit={handleVendorSubmit} className="prof-form">
                                    <div className="prof-form-header">
                                        <h3>Edit Vendor Details</h3>
                                        <button
                                            type="button"
                                            className="prof-modal-close"
                                            onClick={() => setIsEditingVendor(false)}
                                        >
                                            <i className="bi bi-x-lg"></i>
                                        </button>
                                    </div>
                                    <div className="prof-form-row">
                                        <div className="prof-form-group">
                                            <label>Store Name</label>
                                            <input
                                                type="text"
                                                name="store_name"
                                                value={formData.store_name}
                                                onChange={handleChange}
                                                placeholder="Enter your store name"
                                            />
                                            <small>Your business/store name</small>
                                        </div>

                                        <div className="prof-form-group">
                                            <label>GST Number</label>
                                            <input
                                                type="text"
                                                name="gst_number"
                                                value={formData.gst_number}
                                                onChange={handleChange}
                                                placeholder="Enter GST number"
                                                maxLength="15"
                                            />
                                            <small>15-character GSTIN (e.g., 22AAAAA0000A1Z)</small>
                                        </div>
                                    </div>

                                    <div className="prof-form-section-title">
                                        <i className="bi bi-truck"></i> Default Pickup Location
                                        <small>Used for Shiprocket order processing</small>
                                    </div>

                                    <div className="prof-form-row">
                                        <div className="prof-form-group">
                                            <label>Pickup Location Name</label>
                                            <input
                                                type="text"
                                                name="pickup_location_name"
                                                value={formData.pickup_location_name}
                                                onChange={handleChange}
                                                placeholder="e.g., Main Warehouse, Store Front"
                                            />
                                        </div>

                                        <div className="prof-form-group">
                                            <label>Pincode</label>
                                            <input
                                                type="text"
                                                name="pickup_pincode"
                                                value={formData.pickup_pincode}
                                                onChange={handleChange}
                                                placeholder="Pincode"
                                                maxLength="6"
                                            />
                                            <small>6-digit pincode</small>
                                        </div>
                                    </div>

                                    <div className="prof-form-row">
                                        <div className="prof-form-group">
                                            <label>City</label>
                                            <input
                                                type="text"
                                                name="pickup_city"
                                                value={formData.pickup_city}
                                                onChange={handleChange}
                                                placeholder="City"
                                            />
                                        </div>
                                        <div className="prof-form-group">
                                            <label>State</label>
                                            <input
                                                type="text"
                                                name="pickup_state"
                                                value={formData.pickup_state}
                                                onChange={handleChange}
                                                placeholder="State"
                                            />
                                        </div>
                                    </div>

                                    <div className="prof-form-group">
                                        <label>Address Line 1</label>
                                        <textarea
                                            name="pickup_address_line1"
                                            value={formData.pickup_address_line1}
                                            onChange={handleChange}
                                            placeholder="Street address, building number"
                                            rows="2"
                                        />
                                    </div>

                                    <div className="prof-form-group">
                                        <label>Address Line 2 (Optional)</label>
                                        <textarea
                                            name="pickup_address_line2"
                                            value={formData.pickup_address_line2}
                                            onChange={handleChange}
                                            placeholder="Apartment, suite, unit"
                                            rows="2"
                                        />
                                    </div>

                                    <div className="prof-form-actions">
                                        <button
                                            type="button"
                                            className="prof-btn-cancel"
                                            onClick={() => {
                                                setIsEditingVendor(false);
                                                fetchProfile();
                                            }}
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="submit"
                                            className="prof-btn-submit"
                                            disabled={updating}
                                        >
                                            {updating ? (
                                                <><i className="bi bi-hourglass-split"></i> Saving...</>
                                            ) : (
                                                <><i className="bi bi-save"></i> Save Vendor Details</>
                                            )}
                                        </button>
                                    </div>
                                </form>
                            )}
                        </>
                    )}

                    {/* Pickup Addresses Tab */}
                    {/* {activeTab === 'pickup' && isVendor && (
                        <div className="prof-pickup-section">
                            <div className="prof-section-header">
                                <h3><i className="bi bi-geo-alt"></i> Pickup Locations</h3>
                                <button
                                    className="prof-btn-add-address"
                                    onClick={() => {
                                        setEditingAddress(null);
                                        setAddressForm({
                                            location_name: "",
                                            address_line1: "",
                                            address_line2: "",
                                            city: "",
                                            state: "",
                                            pincode: "",
                                            is_default: false
                                        });
                                        setShowAddressModal(true);
                                    }}
                                >
                                    <i className="bi bi-plus-lg"></i> Add New
                                </button>
                            </div>

                            {pickupAddresses.length === 0 ? (
                                <div className="prof-no-addresses">
                                    <i className="bi bi-geo-alt"></i>
                                    <p>No pickup addresses added yet</p>
                                    <button onClick={() => setShowAddressModal(true)}>
                                        Add Your First Address
                                    </button>
                                </div>
                            ) : (
                                <div className="prof-addresses-grid">
                                    {pickupAddresses.map((address) => (
                                        <div key={address.id} className={`prof-address-card ${address.is_default ? 'prof-default' : ''}`}>
                                            {address.is_default && (
                                                <div className="prof-default-badge">
                                                    <i className="bi bi-star-fill"></i> Default
                                                </div>
                                            )}
                                            <div className="prof-address-card-content">
                                                <h4>{address.location_name}</h4>
                                                <p>{address.address_line1}</p>
                                                {address.address_line2 && <p>{address.address_line2}</p>}
                                                <p>{address.city}, {address.state} - {address.pincode}</p>
                                            </div>
                                            <div className="prof-address-card-actions">
                                                {!address.is_default && (
                                                    <button
                                                        className="prof-action-btn prof-set-default"
                                                        onClick={() => handleSetDefaultAddress(address.id)}
                                                        title="Set as default"
                                                    >
                                                        <i className="bi bi-star"></i> Set Default
                                                    </button>
                                                )}
                                                <button
                                                    className="prof-action-btn prof-edit"
                                                    onClick={() => handleEditAddress(address)}
                                                    title="Edit"
                                                >
                                                    <i className="bi bi-pencil"></i> Edit
                                                </button>
                                                <button
                                                    className="prof-action-btn prof-delete"
                                                    onClick={() => confirmDeleteAddress(address.id)}
                                                    title="Delete"
                                                >
                                                    <i className="bi bi-trash"></i> Delete
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )} */}
                </div>
            </div>

            {/* Address Modal */}
            {/* {showAddressModal && (
                <div className={`prof-modal-overlay ${isMobile ? 'prof-mobile-sheet-overlay' : ''}`} onClick={() => setShowAddressModal(false)}>
                    <div className={`prof-modal-content ${isMobile ? 'prof-mobile-sheet-content' : ''}`} onClick={(e) => e.stopPropagation()}>
                        {isMobile && <div className="prof-sheet-handle"></div>}
                        <div className="prof-modal-header">
                            <h3>{editingAddress ? 'Edit Address' : 'Add New Pickup Address'}</h3>
                            <button className="prof-modal-close" onClick={() => setShowAddressModal(false)}>
                                <i className="bi bi-x-lg"></i>
                            </button>
                        </div>
                        <div className="prof-modal-body">
                            <div className="prof-form-group">
                                <label>Location Name *</label>
                                <input
                                    type="text"
                                    name="location_name"
                                    value={addressForm.location_name}
                                    onChange={handleAddressFormChange}
                                    placeholder="e.g., Main Warehouse, Store Front"
                                    required
                                />
                            </div>
                            <div className="prof-form-group">
                                <label>Address Line 1 *</label>
                                <input
                                    type="text"
                                    name="address_line1"
                                    value={addressForm.address_line1}
                                    onChange={handleAddressFormChange}
                                    placeholder="Street address, building number"
                                    required
                                />
                            </div>
                            <div className="prof-form-group">
                                <label>Address Line 2 (Optional)</label>
                                <input
                                    type="text"
                                    name="address_line2"
                                    value={addressForm.address_line2}
                                    onChange={handleAddressFormChange}
                                    placeholder="Apartment, suite, unit"
                                />
                            </div>
                            <div className="prof-form-row">
                                <div className="prof-form-group">
                                    <label>City *</label>
                                    <input
                                        type="text"
                                        name="city"
                                        value={addressForm.city}
                                        onChange={handleAddressFormChange}
                                        required
                                    />
                                </div>
                                <div className="prof-form-group">
                                    <label>State *</label>
                                    <input
                                        type="text"
                                        name="state"
                                        value={addressForm.state}
                                        onChange={handleAddressFormChange}
                                        required
                                    />
                                </div>
                                <div className="prof-form-group">
                                    <label>Pincode *</label>
                                    <input
                                        type="text"
                                        name="pincode"
                                        value={addressForm.pincode}
                                        onChange={handleAddressFormChange}
                                        maxLength="6"
                                        required
                                    />
                                    <small>6-digit pincode</small>
                                </div>
                            </div>
                            <div className="prof-form-group prof-checkbox-group">
                                <label>
                                    <input
                                        type="checkbox"
                                        name="is_default"
                                        checked={addressForm.is_default}
                                        onChange={(e) => setAddressForm({ ...addressForm, is_default: e.target.checked })}
                                    />
                                    Set as default pickup address
                                </label>
                            </div>
                        </div>
                        <div className="prof-modal-footer">
                            <button className="prof-btn-cancel" onClick={() => setShowAddressModal(false)}>
                                Cancel
                            </button>
                            <button
                                className="prof-btn-submit"
                                onClick={editingAddress ? handleUpdateAddress : handleAddAddress}
                            >
                                {editingAddress ? 'Update Address' : 'Add Address'}
                            </button>
                        </div>
                    </div>
                </div>
            )} */}
        </div>
    );
};

export default Profile;
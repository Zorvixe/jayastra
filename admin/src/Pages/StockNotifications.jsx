import React, { useState, useEffect } from "react";
import axios from '../utils/axiosConfig'; // Adjust path as needed
import { toast } from "react-toastify";
import "./StockNotifications.css";

const API_URL = process.env.REACT_APP_API_URL;

// Custom Confirmation Modal Component
const ConfirmDeleteModal = ({ isOpen, onClose, onConfirm, productName }) => {
    if (!isOpen) return null;

    return (
        <div className="modal-backdrop" onClick={onClose}>
            <div className="confirm-modal" onClick={(e) => e.stopPropagation()}>
                <div className="confirm-modal-header">
                    <i className="bi bi-exclamation-triangle-fill"></i>
                    <h4>Confirm Delete</h4>
                </div>
                <div className="confirm-modal-body">
                    <p>Are you sure you want to delete the notification for</p>
                    <strong>"{productName}"</strong>
                    <p>This action cannot be undone.</p>
                </div>
                <div className="confirm-modal-footer">
                    <button className="btn-cancel" onClick={onClose}>Cancel</button>
                    <button className="btn-confirm" onClick={onConfirm}>Delete</button>
                </div>
            </div>
        </div>
    );
};

const StockNotifications = () => {
    const [notifications, setNotifications] = useState([]);
    const [topRequested, setTopRequested] = useState([]);
    const [loading, setLoading] = useState(true);
    const [deleteModal, setDeleteModal] = useState({ isOpen: false, id: null, productName: "" });

    const fetchNotifications = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem("token");
            const res = await axios.get(`${API_URL}/stock-notification/admin`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.data.success) {
                setNotifications(res.data.notifications || []);
                setTopRequested(res.data.topRequested || []);
            } else {
                setNotifications([]);
                setTopRequested([]);
            }
        } catch (error) {
            console.error("Fetch notifications error:", error);
            toast.error("Failed to load notifications");
            setNotifications([]);
            setTopRequested([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchNotifications();
    }, []);

    const openDeleteModal = (id, productName) => {
        setDeleteModal({ isOpen: true, id, productName });
    };

    const closeDeleteModal = () => {
        setDeleteModal({ isOpen: false, id: null, productName: "" });
    };

    const confirmDelete = async () => {
        const { id } = deleteModal;
        if (!id) return;
        try {
            const token = localStorage.getItem("token");
            const res = await axios.delete(`${API_URL}/stock-notification/admin/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.data.success) {
                toast.success("Notification deleted");
                fetchNotifications();
            }
        } catch (error) {
            console.error("Delete error:", error);
            toast.error("Failed to delete");
        } finally {
            closeDeleteModal();
        }
    };

    const getImageUrl = (imagePath) => {
        if (!imagePath) return null;
        if (imagePath.startsWith("http")) return imagePath;
        let baseUrl = API_URL.replace(/\/api\/?$/, "");
        if (baseUrl.endsWith("/")) baseUrl = baseUrl.slice(0, -1);
        const cleanPath = imagePath.startsWith("/") ? imagePath : `/${imagePath}`;
        return `${baseUrl}${cleanPath}`;
    };

    if (loading) return <div className="dash-loader-overlay">
        <div className="dash-loader-container">
            <div className="dash-spinner"></div>
        </div>
    </div>;

    return (
        <div className="stock-notif-container">
            <div className="admin-header">
                <h3><i className="bi bi-bell-fill"></i> Stock Notifications</h3>
                <p>Manage products that customers are waiting for</p>
            </div>

            {/* TOP REQUESTED CARDS */}
            <div className="top-requested-section">
                <h4 className="section-subtitle">Most Requested Products</h4>
                {topRequested.length === 0 ? (
                    <div className="empty-state-card">
                        <i className="bi bi-inbox"></i>
                        <p>No requested products yet</p>
                        <span>When customers request out‑of‑stock products, they will appear here</span>
                    </div>
                ) : (
                    <div className="top-requested-grid">
                        {topRequested.map((item) => (
                            <div key={item.id} className="request-card">
                                <div className="card-img">
                                    <img src={getImageUrl(item.main_image_url)} alt={item.name} />
                                    <div className="req-count-badge">{item.request_count} Requests</div>
                                </div>
                                <div className="card-info">
                                    <h5>{item.name}</h5>
                                    <p className="price">₹{item.price}</p>
                                    <span className={`stock-badge ${item.stock_quantity === 0 ? 'out' : 'low'}`}>
                                        Stock: {item.stock_quantity}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* NOTIFICATIONS TABLE */}
            <div className="notifications-table-section">
                <h4 className="section-subtitle">All Notification Requests</h4>
                {notifications.length === 0 ? (
                    <div className="empty-state-card table-empty">
                        <i className="bi bi-envelope-open"></i>
                        <p>No notification requests</p>
                        <span>Customers haven't requested any stock alerts yet</span>
                    </div>
                ) : (
                    <div className="admin-table-container">
                        <table className="admin-table">
                            <thead>
                                <tr>
                                    <th>Product</th>
                                    <th>Customer</th>
                                    <th>Requested On</th>
                                    <th>Status</th>
                                    <th>User Requests<br />(for this product)</th>
                                    <th>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {notifications.map((notif) => (
                                    <tr key={notif.id}>
                                        <td>
                                            <div className="product-table-cell">
                                                <img src={getImageUrl(notif.main_image_url)} alt="" className="table-thumb" />
                                                <div className="prod-meta">
                                                    <span className="name">{notif.product_name}</span>
                                                    <span className="sku">{notif.sku}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td>
                                            <div className="user-meta">
                                                <span className="uname">{notif.customer_name || notif.user_name || "Guest"}</span>
                                                <span className="uinfo">{notif.email || notif.user_email || notif.phone || notif.user_phone || "No info"}</span>
                                            </div>
                                        </td>
                                        <td>{new Date(notif.created_at).toLocaleDateString()}</td>
                                        <td>
                                            <span className={`status-pill ${notif.stock_quantity > 0 ? 'available' : 'waiting'}`}>
                                                {notif.stock_quantity > 0 ? "In Stock" : "Waiting"}
                                            </span>
                                        </td>
                                        <td>
                                            <span className="request-count-badge">
                                                {notif.user_request_count || 1}
                                            </span>
                                        </td>
                                        <td>
                                            <button
                                                className="delete-table-btn"
                                                onClick={() => openDeleteModal(notif.id, notif.product_name)}
                                            >
                                                <i className="bi bi-trash"></i>
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* CUSTOM CONFIRMATION MODAL */}
            <ConfirmDeleteModal
                isOpen={deleteModal.isOpen}
                onClose={closeDeleteModal}
                onConfirm={confirmDelete}
                productName={deleteModal.productName}
            />
        </div>
    );
};

export default StockNotifications;
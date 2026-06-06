import React, { useEffect, useState } from "react";
import axios from '../utils/axiosConfig'; // Adjust path as needed
import { toast } from "react-toastify";
import "./Returns.css";

const API_URL = process.env.REACT_APP_API_URL;

const Returns = () => {
    const [returns, setReturns] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedRequest, setSelectedRequest] = useState(null);
    const [adminComment, setAdminComment] = useState("");
    const [isUpdating, setIsUpdating] = useState(false);
    const [userRole, setUserRole] = useState(null);
    const [vendorId, setVendorId] = useState(null);
    const [showVideoModal, setShowVideoModal] = useState(false);
    const [currentVideoUrl, setCurrentVideoUrl] = useState("");

    const token = localStorage.getItem("token");

    // Get user role from localStorage or decode from token
    useEffect(() => {
        const role = localStorage.getItem("userRole");
        const storedVendorId = localStorage.getItem("vendorId");
        setUserRole(role);
        if (storedVendorId) setVendorId(storedVendorId);
        
        // Try to decode role from token if not in localStorage
        if (!role && token) {
            try {
                const payload = JSON.parse(atob(token.split('.')[1]));
                setUserRole(payload.role);
                if (payload.id) setVendorId(payload.id);
            } catch (e) {
                console.error("Failed to decode token", e);
            }
        }
    }, [token]);

    const fetchReturns = async () => {
        try {
            setLoading(true);
            const res = await axios.get(`${API_URL}/admin/returns`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setReturns(res.data.returns || []);
        } catch (err) {
            toast.error("Failed to fetch returns");
            console.error("Fetch returns error:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (token) {
            fetchReturns();
        }
    }, [token]);

    const handleUpdateStatus = async (id, status) => {
        if (!adminComment) {
            toast.warn("Please provide an admin comment/remark");
            return;
        }

        setIsUpdating(true);
        try {
            await axios.put(`${API_URL}/admin/returns/${id}/status`,
                { status, admin_comment: adminComment },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            toast.success(`Return request ${status.toLowerCase()} successfully`);
            setAdminComment("");
            setSelectedRequest(null);
            fetchReturns();
        } catch (err) {
            toast.error(err.response?.data?.message || "Update failed");
        } finally {
            setIsUpdating(false);
        }
    };

    const openVideoModal = (videoUrl) => {
        const fullVideoUrl = `${API_URL.replace("/api", "")}${videoUrl}`;
        setCurrentVideoUrl(fullVideoUrl);
        setShowVideoModal(true);
    };

    const closeVideoModal = () => {
        setShowVideoModal(false);
        setCurrentVideoUrl("");
    };

    // Helper to check if user can update this return (vendor isolation)
    const canUpdateReturn = (returnItem) => {
        if (userRole === 'super_admin') return true;
        return true; // Backend will handle authorization
    };

    if (loading) return (
        <div className="dash-loader-overlay">
            <div className="dash-loader-container">
                <div className="dash-spinner"></div>
            </div>
        </div>
    );

    // Get role display name
    const getRoleDisplay = () => {
        if (userRole === 'super_admin') return "Super Admin View - All Vendors";
        if (userRole === 'admin') return "Admin View";
        if (userRole === 'vendor') return "Vendor View - Your Products Only";
        return "Returns Verification";
    };

    // Get full video URL
    const getFullVideoUrl = (videoUrl) => {
        if (!videoUrl) return null;
        if (videoUrl.startsWith('http')) return videoUrl;
        return `${API_URL.replace("/api", "")}${videoUrl}`;
    };

    return (
        <div className="return-modern">
            <div className="return-header">
                <div className="return-header-content">
                    <h1>Return Verification</h1>
                    <p>Review customer unboxing videos and manage return requests</p>
                    <div className="role-badge" style={{ marginTop: '8px', fontSize: '12px', opacity: 0.8 }}>
                        <i className="bi bi-shield-lock"></i> {getRoleDisplay()}
                    </div>
                </div>
                <div className="return-stats">
                    <div className="return-stat-card">
                        <span className="return-stat-value">{returns.length}</span>
                        <span className="return-stat-label">Total Requests</span>
                    </div>
                    <div className="return-stat-card">
                        <span className="return-stat-value">{returns.filter(r => r.status === 'Pending').length}</span>
                        <span className="return-stat-label">Pending</span>
                    </div>
                    {userRole === 'super_admin' && (
                        <div className="return-stat-card">
                            <span className="return-stat-value">{returns.filter(r => r.status === 'Approved').length}</span>
                            <span className="return-stat-label">Approved</span>
                        </div>
                    )}
                </div>
            </div>

            <div className="return-workspace">
                {/* Requests Table */}
                <div className="return-requests-section">
                    <div className="return-section-title">
                        <i className="bi bi-inbox"></i> Return Requests
                    </div>
                    <div className="return-table-wrapper">
                        <table className="return-modern-table">
                            <thead>
                                <tr>
                                    <th>Order ID</th>
                                    <th>Customer</th>
                                    <th>Reason</th>
                                    <th>Status</th>
                                    <th>Date</th>
                                    {userRole === 'super_admin' && <th>Vendor</th>}
                                    <th>Video</th>
                                    <th>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {returns.length === 0 ? (
                                    <td><td colSpan={userRole === 'super_admin' ? 8 : 7} className="return-empty">No return requests found</td></td>
                                ) : (
                                    returns.map(r => (
                                        <tr key={r.id} className={`return-row ${selectedRequest?.id === r.id ? 'active' : ''}`}>
                                            <td data-label="Order ID">#{r.order_id}</td>
                                            <td data-label="Customer">
                                                <strong>{r.user_name || r.customer_name}</strong>
                                                <small>{r.phone}</small>
                                            </td>
                                            <td data-label="Reason">{r.reason || '—'}</td>
                                            <td data-label="Status">
                                                <span className={`return-badge return-badge-${r.status.toLowerCase()}`}>
                                                    {r.status}
                                                </span>
                                            </td>
                                            <td data-label="Date">{new Date(r.created_at).toLocaleDateString()}</td>
                                            {userRole === 'super_admin' && (
                                                <td data-label="Vendor">
                                                    <span className="vendor-tag">
                                                        <i className="bi bi-shop"></i> Vendor #{r.vendor_id || 'N/A'}
                                                    </span>
                                                </td>
                                            )}
                                            <td data-label="Video">
                                                {r.video_url ? (
                                                    <button 
                                                        className="view-video-btn"
                                                        onClick={() => openVideoModal(r.video_url)}
                                                    >
                                                        <i className="bi bi-play-circle"></i> Play Video
                                                    </button>
                                                ) : (
                                                    <span className="no-video-tag">No video</span>
                                                )}
                                            </td>
                                            <td data-label="Action">
                                                <button
                                                    className={`return-review-btn ${selectedRequest?.id === r.id ? 'active' : ''}`}
                                                    onClick={() => setSelectedRequest(r)}
                                                >
                                                    {selectedRequest?.id === r.id ? 'Reviewing' : 'Review Request'}
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Verification Panel - only shows when a request is selected */}
                {selectedRequest && (
                    <div className="return-verification-panel">
                        <div className="return-panel-header">
                            <div>
                                <h3>Verification Panel</h3>
                                <p>Order #{selectedRequest.order_id}</p>
                                {userRole === 'super_admin' && selectedRequest.vendor_id && (
                                    <small style={{ display: 'block', color: '#8E2139', marginTop: '4px' }}>
                                        <i className="bi bi-shop"></i> Vendor ID: {selectedRequest.vendor_id}
                                    </small>
                                )}
                            </div>
                            <button className="return-panel-close" onClick={() => setSelectedRequest(null)}>
                                <i className="bi bi-x-lg"></i>
                            </button>
                        </div>

                        <div className="return-video-card">
                            <div className="return-video-label">
                                <i className="bi bi-camera-reels"></i> Unboxing Evidence
                            </div>
                            {selectedRequest.video_url ? (
                                <div className="video-thumbnail-container" onClick={() => openVideoModal(selectedRequest.video_url)}>
                                    <video
                                        src={getFullVideoUrl(selectedRequest.video_url)}
                                        className="return-video-thumbnail"
                                        preload="metadata"
                                    />
                                    <div className="video-play-overlay">
                                        <i className="bi bi-play-circle-fill"></i>
                                        <span>Click to play full video</span>
                                    </div>
                                </div>
                            ) : (
                                <div className="no-video-placeholder">
                                    <i className="bi bi-film"></i>
                                    <p>No video uploaded</p>
                                </div>
                            )}
                        </div>

                        <div className="return-remark-card">
                            <label>Admin Decision Remarks</label>
                            <textarea
                                value={adminComment}
                                onChange={(e) => setAdminComment(e.target.value)}
                                placeholder="Explain why you approve or reject this return..."
                                rows="4"
                            />
                        </div>

                        <div className="return-action-buttons">
                            <button
                                className="return-action reject"
                                disabled={isUpdating || selectedRequest.status !== 'Pending'}
                                onClick={() => handleUpdateStatus(selectedRequest.id, 'Rejected')}
                            >
                                <i className="bi bi-x-circle"></i> Reject Return
                            </button>
                            <button
                                className="return-action approve"
                                disabled={isUpdating || selectedRequest.status !== 'Pending'}
                                onClick={() => handleUpdateStatus(selectedRequest.id, 'Approved')}
                            >
                                <i className="bi bi-check-circle"></i> Approve Return
                            </button>
                        </div>
                        
                        {selectedRequest.status !== 'Pending' && (
                            <div className="return-status-info">
                                <i className="bi bi-info-circle"></i>
                                This request has already been {selectedRequest.status.toLowerCase()}.
                                {selectedRequest.admin_comment && (
                                    <div className="previous-comment">
                                        <strong>Previous comment:</strong> {selectedRequest.admin_comment}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Video Modal */}
            {showVideoModal && (
                <div className="video-modal-overlay" onClick={closeVideoModal}>
                    <div className="video-modal-container" onClick={(e) => e.stopPropagation()}>
                        <div className="video-modal-header">
                            <h4>Unboxing Video</h4>
                            <button className="video-modal-close" onClick={closeVideoModal}>
                                <i className="bi bi-x-lg"></i>
                            </button>
                        </div>
                        <div className="video-modal-body">
                            <video
                                src={currentVideoUrl}
                                controls
                                autoPlay
                                className="video-modal-player"
                            />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Returns;
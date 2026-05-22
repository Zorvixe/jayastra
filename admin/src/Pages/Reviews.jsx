import React, { useEffect, useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import "./Reviews.css";

const API_URL = process.env.REACT_APP_API_URL;

// Confirmation Modal Component for Delete
const ConfirmDeleteModal = ({ isOpen, onClose, onConfirm, reviewId, productName }) => {
    if (!isOpen) return null;

    return (
        <div className="modal-backdrop" onClick={onClose}>
            <div className="confirm-modal" onClick={(e) => e.stopPropagation()}>
                <div className="confirm-modal-header">
                    <i className="bi bi-exclamation-triangle-fill"></i>
                    <h4>Delete Review</h4>
                </div>
                <div className="confirm-modal-body">
                    <p>Are you sure you want to delete this review for</p>
                    <strong>"{productName}"</strong>
                    <p>This action cannot be undone.</p>
                </div>
                <div className="confirm-modal-footer">
                    <button className="btn-cancel" onClick={onClose}>Cancel</button>
                    <button className="btn-confirm" onClick={() => onConfirm(reviewId)}>Delete</button>
                </div>
            </div>
        </div>
    );
};

// Comment Detail Modal Component
const CommentDetailModal = ({ isOpen, onClose, review }) => {
    if (!isOpen || !review) return null;

    const getImageUrl = (imagePath) => {
        if (!imagePath) return "/assets/no-image.png";
        if (imagePath.startsWith("http")) return imagePath;
        let baseUrl = API_URL.replace(/\/api\/?$/, "");
        return `${baseUrl}${imagePath}`;
    };

    return (
        <div className="modal-backdrop" onClick={onClose}>
            <div className="comment-modal" onClick={(e) => e.stopPropagation()}>
                <button className="modal-close-btn" onClick={onClose}>
                    <i className="bi bi-x-lg"></i>
                </button>
                <div className="comment-modal-header">
                    <div className="comment-modal-product">
                        <img src={getImageUrl(review.main_image_url)} alt={review.product_name} />
                        <div>
                            <h5>{review.product_name}</h5>
                            <span className="comment-modal-user">by {review.user_name}</span>
                        </div>
                    </div>
                    <div className="comment-modal-stars">
                        {[...Array(5)].map((_, i) => (
                            <i key={i} className={`bi ${i < review.rating ? "bi-star-fill" : "bi-star"}`}></i>
                        ))}
                    </div>
                </div>
                <div className="comment-modal-body">
                    <p className="full-comment">{review.comment}</p>
                    {review.images && review.images.length > 0 && (
                        <div className="comment-modal-images">
                            {review.images.map((img, idx) => (
                                <img
                                    key={idx}
                                    src={getImageUrl(img)}
                                    alt="Review attachment"
                                    className="comment-modal-img"
                                    onClick={() => window.open(getImageUrl(img), '_blank')}
                                />
                            ))}
                        </div>
                    )}
                </div>
                <div className="comment-modal-footer">
                    <span className="comment-modal-date">
                        {new Date(review.created_at).toLocaleDateString('en-US', {
                            month: 'long',
                            day: 'numeric',
                            year: 'numeric'
                        })}
                    </span>
                    <span className={`status-pill ${review.status}`}>{review.status}</span>
                </div>
            </div>
        </div>
    );
};

const Reviews = () => {
    const [reviews, setReviews] = useState([]);
    const [loading, setLoading] = useState(false);
    const [initialLoading, setInitialLoading] = useState(true);
    const [filter, setFilter] = useState("all");
    const [deleteModal, setDeleteModal] = useState({ isOpen: false, id: null, productName: "" });
    const [commentModal, setCommentModal] = useState({ isOpen: false, review: null });
    const token = localStorage.getItem("token");

    const fetchReviews = async () => {
        try {
            setInitialLoading(true);
            const res = await axios.get(`${API_URL}/admin/reviews`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.data.success) {
                setReviews(res.data.reviews);
            }
        } catch (err) {
            toast.error("Failed to fetch reviews");
        } finally {
            setInitialLoading(false);
        }
    };

    const updateStatus = async (id, status) => {
        try {
            setLoading(true);
            const res = await axios.put(`${API_URL}/admin/reviews/${id}/status`, { status }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.data.success) {
                toast.success(`Review ${status} successfully`);
                fetchReviews();
            }
        } catch (err) {
            toast.error("Failed to update status");
        } finally {
            setLoading(false);
        }
    };

    const openDeleteModal = (id, productName) => {
        setDeleteModal({ isOpen: true, id, productName });
    };

    const closeDeleteModal = () => {
        setDeleteModal({ isOpen: false, id: null, productName: "" });
    };

    const confirmDelete = async (id) => {
        try {
            setLoading(true);
            const res = await axios.delete(`${API_URL}/admin/reviews/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.data.success) {
                toast.success("Review deleted successfully");
                fetchReviews();
            }
        } catch (err) {
            toast.error(err.response?.data?.message || "Failed to delete review");
        } finally {
            setLoading(false);
            closeDeleteModal();
        }
    };

    const openCommentModal = (review) => {
        setCommentModal({ isOpen: true, review });
    };

    const closeCommentModal = () => {
        setCommentModal({ isOpen: false, review: null });
    };

    useEffect(() => {
        fetchReviews();
    }, []);

    const filteredReviews = reviews.filter(r => {
        if (filter === "all") return true;
        return r.status === filter;
    });

    const getImageUrl = (imagePath) => {
        if (!imagePath) return "/assets/no-image.png";
        if (imagePath.startsWith("http")) return imagePath;
        let baseUrl = API_URL.replace(/\/api\/?$/, "");
        return `${baseUrl}${imagePath}`;
    };

    return (
        <div className="admin-reviews-page">
            <div className="reviews-header">
                <div className="reviews-header-text">
                    <h4>Customer Reviews</h4>
                    <p>Moderate and manage product reviews submitted by users.</p>
                </div>
                <div className="filter-tabs">
                    {["all", "pending", "approved", "rejected"].map(t => (
                        <button
                            key={t}
                            className={`filter-btn ${filter === t ? "active" : ""}`}
                            onClick={() => setFilter(t)}
                        >
                            {t.toUpperCase()}
                        </button>
                    ))}
                </div>
            </div>

            <div className="reviews-table-card">
                {initialLoading ? (
                    <div className="dash-loader-overlay">
                        <div className="dash-loader-container">
                            <div className="dash-spinner"></div>
                        </div>
                    </div>
                ) : filteredReviews.length === 0 ? (
                    <div className="rev-empty-state">
                        <i className="bi bi-chat-square-text"></i>
                        <p>No reviews found in this category.</p>
                    </div>
                ) : (
                    <div className="reviews-table-responsive">
                        <table className="admin-reviews-table">
                            <thead>
                                <tr>
                                    <th>Product</th>
                                    <th>Customer</th>
                                    <th>Rating</th>
                                    <th>Comment</th>
                                    <th>Photos</th>
                                    <th>Date</th>
                                    <th>Status</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredReviews.map(r => (
                                    <tr key={r.id}>
                                        <td className="prod-col">
                                            <div className="prod-info">
                                                <img src={getImageUrl(r.main_image_url)} alt="product" onError={(e) => e.target.src = '/assets/placeholder-product.jpg'} />
                                                <span className="prod-name" title={r.product_name}>{r.product_name}</span>
                                            </div>
                                        </td>
                                        <td>
                                            <div className="user-info">
                                                <strong>{r.user_name}</strong>
                                                <small>{r.user_email}</small>
                                            </div>
                                        </td>
                                        <td className="rating-col">
                                            <div className="admin-stars">
                                                {[...Array(5)].map((_, i) => (
                                                    <i key={i} className={`bi ${i < r.rating ? "bi-star-fill" : "bi-star"}`}></i>
                                                ))}
                                            </div>
                                        </td>
                                        <td className="comment-col">
                                            <p
                                                className="comment-text clickable"
                                                title="Click to read full review"
                                                onClick={() => openCommentModal(r)}
                                            >
                                                {r.comment}
                                            </p>
                                        </td>
                                        <td>
                                            <div className="rev-photos">
                                                {r.images && r.images.length > 0 ? (
                                                    r.images.map((img, i) => (
                                                        <img key={i} src={getImageUrl(img)} alt="review" className="rev-img-thumb" onError={(e) => e.target.style.display = 'none'} />
                                                    ))
                                                ) : <span className="no-photos">-</span>}
                                            </div>
                                        </td>
                                        <td className="date-col">
                                            {new Date(r.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                        </td>
                                        <td className="status-col">
                                            <span className={`status-pill ${r.status}`}>
                                                {r.status}
                                            </span>
                                        </td>
                                        <td className="rev-actions-col">
                                            <div className="rev-actions">
                                                <div>
                                                    {r.status !== 'approved' && (
                                                        <button className="approve-btn" onClick={() => updateStatus(r.id, 'approved')} disabled={loading}>
                                                            <i className="bi bi-check-lg"></i> Approve
                                                        </button>
                                                    )}
                                                </div>
                                                <div>
                                                    {r.status !== 'rejected' && (
                                                        <button className="reject-btn" onClick={() => updateStatus(r.id, 'rejected')} disabled={loading}>
                                                            <i className="bi bi-x-lg"></i> Reject
                                                        </button>
                                                    )}
                                                </div>
                                                <div>
                                                    <button
                                                        className="delete-review-btn"
                                                        onClick={() => openDeleteModal(r.id, r.product_name)}
                                                        disabled={loading}
                                                        title="Delete review"
                                                    >
                                                        <i className="bi bi-trash"></i>
                                                    </button>
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Delete Confirmation Modal */}
            <ConfirmDeleteModal
                isOpen={deleteModal.isOpen}
                onClose={closeDeleteModal}
                onConfirm={confirmDelete}
                reviewId={deleteModal.id}
                productName={deleteModal.productName}
            />

            {/* Comment Detail Modal */}
            <CommentDetailModal
                isOpen={commentModal.isOpen}
                onClose={closeCommentModal}
                review={commentModal.review}
            />
        </div>
    );
};

export default Reviews;
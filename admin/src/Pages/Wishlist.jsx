import React, { useState, useEffect, useRef, useCallback } from "react";
import axios from '../utils/axiosConfig';
import { toast } from "react-toastify";

import wishlistImage from "../assets/empty-wishlist.png";
import "./Wishlist.css";

const API_URL = process.env.REACT_APP_API_URL;

const Wishlist = () => {
    const [wishlistData, setWishlistData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");

    // Mobile search slide-down state
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const searchRef = useRef(null);

    // Frontend pagination
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    // Fetch all wishlist items once
    const fetchWishlist = useCallback(async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem("token");
            // Fetch all – we do not send search or pagination params
            const res = await axios.get(`${API_URL}/admin/wishlist`, {
                headers: { Authorization: `Bearer ${token}` }
                // Optionally add a high limit if the backend supports it:
                // params: { limit: 9999 }
            });
            if (res.data.success) {
                setWishlistData(res.data.wishlist || []);
            }
        } catch (error) {
            console.error("Fetch wishlist error:", error);
            toast.error("Failed to load wishlist data");
        } finally {
            setLoading(false);
        }
    }, []);

    const handleDelete = async (id) => {
        if (!window.confirm("Are you sure you want to remove this entry?")) return;
        try {
            const token = localStorage.getItem("token");
            const res = await axios.delete(`${API_URL}/admin/wishlist/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.data.success) {
                toast.success("Entry removed");
                fetchWishlist(); // re-fetch to refresh list
            }
        } catch (error) {
            console.error("Delete wishlist error:", error);
            toast.error("Failed to delete entry");
        }
    };

    // Close search panel when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (searchRef.current && !searchRef.current.contains(event.target)) {
                setIsSearchOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    useEffect(() => {
        fetchWishlist();
    }, [fetchWishlist]);

    // Reset page when search changes
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm]);

    const getImageUrl = (imagePath) => {
        if (!imagePath) return null;
        if (imagePath.startsWith("http")) return imagePath;
        let baseUrl = API_URL.replace(/\/api\/?$/, "");
        if (baseUrl.endsWith("/")) baseUrl = baseUrl.slice(0, -1);
        const cleanPath = imagePath.startsWith("/") ? imagePath : `/${imagePath}`;
        return `${baseUrl}${cleanPath}`;
    };

    const toggleSearch = () => {
        setIsSearchOpen(!isSearchOpen);
    };

    // ----- Frontend filtering -----
    const filteredWishlist = wishlistData.filter(item =>
        (item.user_name && item.user_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (item.user_phone && item.user_phone.includes(searchTerm)) ||
        (item.product_name && item.product_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (item.product_id && item.product_id.toString().includes(searchTerm))
    );

    // ----- Frontend pagination -----
    const totalItems = filteredWishlist.length;
    const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = Math.min(startIndex + itemsPerPage, totalItems);
    const currentItems = filteredWishlist.slice(startIndex, endIndex);

    if (loading) return (
        <div className="dash-loader-overlay">
            <div className="dash-loader-container">
                <div className="dash-spinner"></div>
            </div>
        </div>
    );

    return (
        <div className="admin-wishlist-container">
            <div className="admin-header">
                <div className="header-titles-wishlist">
                    <h3>Wishlist</h3>
                    {/* Mobile search icon */}
                    <button
                        className="mobile-icon-btn search-toggle"
                        onClick={toggleSearch}
                        aria-label="Search"
                    >
                        <i className="bi bi-search"></i>
                    </button>
                </div>
                <div className="header-actions">
                    <button className="refresh-btn-big" onClick={fetchWishlist} title="Refresh Data">
                        <i className="bi bi-arrow-clockwise"></i>
                    </button>

                    {/* Desktop search (hidden on mobile) */}
                    <div className="search-box desktop-search-wish">
                        <i className="bi bi-search"></i>
                        <input
                            type="text"
                            placeholder="Search user, phone, product..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>
            </div>

            {/* Mobile Search Slide‑down */}
            {isSearchOpen && (
                <div className="mobile-search-slide" ref={searchRef}>
                    <div className="slide-content">
                        <i className="bi bi-search"></i>
                        <input
                            type="text"
                            placeholder="Search user, phone, product..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            autoFocus
                        />
                        <button className="slide-close" onClick={() => setIsSearchOpen(false)}>
                            <i className="bi bi-x-lg"></i>
                        </button>
                    </div>
                </div>
            )}

            {/* Empty state: no items at all */}
            {wishlistData.length === 0 ? (
                <div className="wishlist-empty-state">
                    <img src={wishlistImage} alt="Empty wishlist" className="empty-wishlist-image" />
                    <h4>No wishlist items yet</h4>
                </div>
            ) : (
                <>
                    <div className="admin-table-container">
                        <div className="table-responsive">
                            <table className="admin-table">
                                <thead>
                                    <tr>
                                        <th>Product ID</th>
                                        <th>Image</th>
                                        <th>Product Name</th>
                                        <th>Price</th>
                                        <th>Stock</th>
                                        <th>Customer</th>
                                        <th>Phone</th>
                                        <th>Added On</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {currentItems.length > 0 ? (
                                        currentItems.map((item) => (
                                            <tr key={item.wishlist_entry_id}>
                                                <td><span className="id-badge">#{item.product_id}</span></td>
                                                <td>
                                                    <div className="table-img-container">
                                                        <img
                                                            src={getImageUrl(item.product_image)}
                                                            alt={item.product_name}
                                                            className="table-thumb"
                                                            onError={(e) => { e.target.src = "/assets/placeholder-product.jpg"; }}
                                                        />
                                                    </div>
                                                </td>
                                                <td>
                                                    <span className="prod-name">{item.product_name}</span>
                                                </td>
                                                <td>
                                                    <span className="price-text">₹{item.price}</span>
                                                </td>
                                                <td>
                                                    <span className={`stock-badge ${item.stock_quantity > 0 ? 'in-stock' : 'out-of-stock'}`}>
                                                        {item.stock_quantity > 0 ? `${item.stock_quantity} in stock` : 'Out of Stock'}
                                                    </span>
                                                </td>
                                                <td>
                                                    <span className="user-name-text">{item.user_name}</span>
                                                </td>
                                                <td>
                                                    <span className="phone-text">{item.user_phone || "N/A"}</span>
                                                </td>
                                                <td>
                                                    <span className="date-text">{new Date(item.created_at).toLocaleDateString()}</span>
                                                </td>
                                                <td>
                                                    <button className="delete-btn" onClick={() => handleDelete(item.wishlist_entry_id)} title="Remove Entry">
                                                        <i className="bi bi-trash"></i>
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan="9" className="empty-table-msg">
                                                {searchTerm ? "No matching wishlist items found" : "No wishlist items found"}
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination Controls */}
                        {totalPages > 1 && (
                            <div className="pagination-container">
                                <button
                                    className="page-btn"
                                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                    disabled={currentPage === 1}
                                >
                                    <i className="bi bi-chevron-left"></i> Prev
                                </button>

                                <div className="page-numbers">
                                    {[...Array(totalPages)].map((_, index) => (
                                        <button
                                            key={index + 1}
                                            onClick={() => setCurrentPage(index + 1)}
                                            className={`page-btn num-btn ${currentPage === index + 1 ? "active" : ""}`}
                                        >
                                            {index + 1}
                                        </button>
                                    ))}
                                </div>

                                <button
                                    className="page-btn"
                                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                    disabled={currentPage === totalPages}
                                >
                                    Next <i className="bi bi-chevron-right"></i>
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Stats Cards */}
                    <div className="wishlist-stats">
                        <div className="stat-card">
                            <i className="bi bi-people"></i>
                            <div className="stat-info">
                                <h4>{new Set(wishlistData.map(w => w.user_id)).size}</h4>
                                <span>Unique Users</span>
                            </div>
                        </div>
                        <div className="stat-card">
                            <i className="bi bi-bag-heart"></i>
                            <div className="stat-info">
                                <h4>{wishlistData.length}</h4>
                                <span>Total Items</span>
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default Wishlist;
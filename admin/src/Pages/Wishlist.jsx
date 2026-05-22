import React, { useState, useEffect } from "react";
import axios from '../utils/axiosConfig'; // Adjust path as needed
import { toast } from "react-toastify";
import "./Wishlist.css";

const API_URL = process.env.REACT_APP_API_URL;

const Wishlist = () => {
    const [wishlistData, setWishlistData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    
    // Pagination States
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(10); // You can change this to show more/less items per page

    const fetchWishlist = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem("token");
            const res = await axios.get(`${API_URL}/admin/wishlist`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.data.success) {
                setWishlistData(res.data.wishlist);
            }
        } catch (error) {
            console.error("Fetch wishlist error:", error);
            toast.error("Failed to load wishlist data");
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Are you sure you want to remove this entry?")) return;
        try {
            const token = localStorage.getItem("token");
            const res = await axios.delete(`${API_URL}/admin/wishlist/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.data.success) {
                toast.success("Entry removed");
                fetchWishlist();
            }
        } catch (error) {
            console.error("Delete wishlist error:", error);
            toast.error("Failed to delete entry");
        }
    };

    useEffect(() => {
        fetchWishlist();
    }, []);

    // Reset to page 1 when search term changes
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

    const filteredWishlist = wishlistData.filter(item =>
        (item.user_name && item.user_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (item.user_phone && item.user_phone.includes(searchTerm)) ||
        (item.product_name && item.product_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (item.product_id && item.product_id.toString().includes(searchTerm))
    );

    // Pagination Logic
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentItems = filteredWishlist.slice(indexOfFirstItem, indexOfLastItem);
    const totalPages = Math.ceil(filteredWishlist.length / itemsPerPage);

    const paginate = (pageNumber) => setCurrentPage(pageNumber);

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
                <div className="header-titles">
                    <h3><i className="bi bi-heart-fill"></i> User Wishlists</h3>
                    <p>View products that customers have added to their wishlist</p>
                </div>
                <div className="header-actions">
                    <button className="refresh-btn-big" onClick={fetchWishlist} title="Refresh Data">
                        <i className="bi bi-arrow-clockwise"></i>
                    </button>
                    <div className="search-box">
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
                                                <img src={getImageUrl(item.product_image)} alt={item.product_name} className="table-thumb" />
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
                            onClick={() => paginate(currentPage - 1)} 
                            disabled={currentPage === 1}
                        >
                            <i className="bi bi-chevron-left"></i> Prev
                        </button>
                        
                        <div className="page-numbers">
                            {[...Array(totalPages)].map((_, index) => (
                                <button
                                    key={index + 1}
                                    onClick={() => paginate(index + 1)}
                                    className={`page-btn num-btn ${currentPage === index + 1 ? "active" : ""}`}
                                >
                                    {index + 1}
                                </button>
                            ))}
                        </div>

                        <button 
                            className="page-btn" 
                            onClick={() => paginate(currentPage + 1)} 
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
        </div>
    );
};

export default Wishlist;
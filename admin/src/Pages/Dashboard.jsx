import React, { useState, useEffect } from "react";
import axios from '../utils/axiosConfig';
import { useNavigate } from "react-router-dom";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import { Line } from "react-chartjs-2";
import "./Dashboard.css";

import noOrdersImg from "../assets/no_orders.png";
import dashBoardBanner from "../assets/dash_banner_long.png";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
  Filler
);

const Dashboard = () => {
  const [stats, setStats] = useState({
    totalProducts: 0,
    totalOrders: 0,
    totalUsers: 0,
    totalRevenue: 0,
    stockNotificationCount: 0,
  });

  const [orderOverview, setOrderOverview] = useState({
    pending: 0,
    onTheWay: 0,
    delivered: 0,
    cancelled: 0
  });

  const [pendingPayment, setPendingPayment] = useState({
    count: 0,
    amount: 0,
    supplierName: "",
    issueDate: "",
    status: "",
    requestId: null
  });

  const [dashboardBanner, setDashboardBanner] = useState({
    url: '',
    alt: 'Dashboard Banner',
    link: ''
  });

  // New state for user profile
  const [userProfile, setUserProfile] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    role: "",
    store_name: "",
    address: "",
    city: "",
    state: "",
    pincode: "",
    avatar: ""
  });

  // Store toggle states
  const [storeActive, setStoreActive] = useState(true);
  const [togglingStore, setTogglingStore] = useState(false);
  const [showStoreWarningModal, setShowStoreWarningModal] = useState(false);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);

  const userRole = localStorage.getItem("userRole");
  const [recentOrders, setRecentOrders] = useState([]);
  const [dailySales, setDailySales] = useState([]);
  const [loading, setLoading] = useState(true);

  const [todayStats, setTodayStats] = useState({
    todayOrders: 0,
    todayEarnings: 0,
  });

  const navigate = useNavigate();
  const [selectedDate, setSelectedDate] = useState("");
  const API_URL = process.env.REACT_APP_API_URL;

  // IMPORTANT: Define showStoreToggle BEFORE any useEffect that uses it
  const showStoreToggle = userRole && userRole !== 'user';

  const formatDate = (date) => date.toISOString().split("T")[0];
  const formatDisplayDate = (date) => {
    return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  useEffect(() => {
    const today = new Date();
    setSelectedDate(formatDate(today));
  }, []);

  useEffect(() => {
    if (selectedDate) {
      fetchDashboardData(selectedDate);
    }
    fetchDashboardBanner();
    fetchUserProfile(); // Fetch user profile on mount
  }, [selectedDate]);

  // Store warning modal effect - showStoreToggle is now defined before this
  useEffect(() => {
    if (loading || !showStoreToggle || storeActive) {
      setShowStoreWarningModal(false);
      return undefined;
    }

    setShowStoreWarningModal(true);
    const warningInterval = setInterval(() => {
      setShowStoreWarningModal(true);
    }, 30000);

    return () => clearInterval(warningInterval);
  }, [loading, showStoreToggle, storeActive]);

  // New function to fetch user profile
  const fetchUserProfile = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(`${API_URL}/user/profile`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setUserProfile({
        first_name: response.data.first_name || "",
        last_name: response.data.last_name || "",
        email: response.data.email || "",
        phone: response.data.phone || "",
        role: localStorage.getItem("userRole") || "",
        store_name: response.data.store_name || "",
        address: response.data.address || "",
        city: response.data.city || "",
        state: response.data.state || "",
        pincode: response.data.pincode || "",
        avatar: response.data.avatar || ""
      });

      // Set store active status from profile
      setStoreActive(typeof response.data.store_active === 'boolean' ? response.data.store_active : true);
    } catch (error) {
      console.error("Failed to fetch user profile:", error);
    }
  };

  // Update store status function
  const updateStoreStatus = async (nextStoreActive) => {
    const token = localStorage.getItem("token");
    if (!token) return;

    try {
      setTogglingStore(true);
      const res = await axios.put(
        `${API_URL}/user/profile/all`,
        { store_active: nextStoreActive },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const updated = res.data?.user?.store_active;
      setStoreActive(typeof updated === 'boolean' ? updated : nextStoreActive);
    } catch (error) {
      console.error("Failed to toggle store status:", error);
    } finally {
      setTogglingStore(false);
    }
  };

  const handleStoreToggle = (e) => {
    if (e) e.stopPropagation();
    updateStoreStatus(!storeActive);
  };

  const handleTurnStoreOn = () => {
    updateStoreStatus(true);
  };

  // Add this function to fetch dashboard banner
  const fetchDashboardBanner = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(`${API_URL}/admin/settings/dashboard-banner`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success && response.data.banner.url) {
        let bannerUrl = String(response.data.banner.url || "").trim();

        // Resolve relative paths from the backend server
        if (bannerUrl.startsWith("/uploads")) {
          const backendBase = API_URL ? API_URL.replace(/\/api$/, '') : '';
          bannerUrl = `${backendBase}${bannerUrl}`;
        }

        setDashboardBanner({
          ...response.data.banner,
          url: bannerUrl,
        });
      } else {
        // Fallback to default banner
        setDashboardBanner({
          url: dashBoardBanner,
          alt: 'Dashboard Banner',
          link: ''
        });
      }
    } catch (error) {
      console.error("Failed to fetch dashboard banner:", error);
      // Fallback to default banner
      setDashboardBanner({
        url: dashBoardBanner,
        alt: 'Dashboard Banner',
        link: ''
      });
    }
  };

  // Fetch withdrawal/payment data
  const fetchPaymentData = async () => {
    try {
      const token = localStorage.getItem("token");
      const role = userRole?.toLowerCase();

      const res = await axios.get(`${API_URL}/admin/payouts`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.data.success) {
        const payouts = res.data.payouts || [];

        if (role === 'vendor' || role === 'admin') {
          const pendingWithdrawals = payouts.filter(p => p.status === 'Pending');
          const totalPendingAmount = pendingWithdrawals.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);

          if (pendingWithdrawals.length > 0) {
            const latest = pendingWithdrawals[0];
            setPendingPayment({
              count: pendingWithdrawals.length,
              amount: totalPendingAmount,
              supplierName: "My Withdrawal Request",
              issueDate: latest.requested_at ? new Date(latest.requested_at).toLocaleDateString('en-IN', {
                day: 'numeric', month: 'short', year: 'numeric'
              }) : "",
              status: "Pending",
              requestId: latest.id
            });
          } else {
            const completedWithdrawals = payouts.filter(p => p.status === 'Paid');
            if (completedWithdrawals.length > 0) {
              const latest = completedWithdrawals[0];
              setPendingPayment({
                count: completedWithdrawals.length,
                amount: parseFloat(latest.amount) || 0,
                supplierName: latest.status === 'Paid' ? "Withdrawal Completed" : "Withdrawal " + latest.status,
                issueDate: latest.requested_at ? new Date(latest.requested_at).toLocaleDateString('en-IN', {
                  day: 'numeric', month: 'short', year: 'numeric'
                }) : "",
                status: latest.status,
                requestId: latest.id
              });
            } else {
              setPendingPayment({
                count: 0,
                amount: 0,
                supplierName: "No withdrawals yet",
                issueDate: "",
                status: "",
                requestId: null
              });
            }
          }
        } else if (role === 'super_admin') {
          const pendingWithdrawals = payouts.filter(p => p.status === 'Pending');
          const totalPendingAmount = pendingWithdrawals.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);

          if (pendingWithdrawals.length > 0) {
            const latest = pendingWithdrawals[0];
            setPendingPayment({
              count: pendingWithdrawals.length,
              amount: totalPendingAmount,
              supplierName: latest.store_name || latest.vendor_name || "Vendor",
              issueDate: latest.requested_at ? new Date(latest.requested_at).toLocaleDateString('en-IN', {
                day: 'numeric', month: 'short', year: 'numeric'
              }) : "",
              status: "Pending Approval",
              requestId: latest.id
            });
          } else {
            setPendingPayment({
              count: 0,
              amount: 0,
              supplierName: "No pending withdrawals",
              issueDate: "",
              status: "",
              requestId: null
            });
          }
        }
      }
    } catch (err) {
      console.error("Failed to fetch payment data:", err);
    }
  };

  const fetchDashboardData = async (date) => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");

      // Main dashboard data - includes stats, orderOverview, recentOrders, dailySales
      const dashboardRes = await axios.get(`${API_URL}/admin/dashboard/stats-by-date`, {
        params: { date: date },
        headers: { Authorization: `Bearer ${token}` },
      });

      // Today's stats
      const todayRes = await axios.get(`${API_URL}/admin/dashboard/today-stats`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (dashboardRes.data.success) {
        setStats(dashboardRes.data.stats);
        setOrderOverview(dashboardRes.data.orderOverview);
        setRecentOrders(dashboardRes.data.recentOrders);
        setDailySales(dashboardRes.data.dailySales);

        // Update pending payment if returned from stats-by-date
        if (dashboardRes.data.pendingPayment) {
          setPendingPayment(prev => ({
            ...prev,
            ...dashboardRes.data.pendingPayment
          }));
        }
      }

      if (todayRes.data.success) {
        setTodayStats({
          todayOrders: todayRes.data.todayOrders,
          todayEarnings: todayRes.data.todayEarnings,
        });
      }

      // Fetch additional payment/withdrawal data
      await fetchPaymentData();

    } catch (error) {
      console.error("Dashboard Data Fetch Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const chartData = {
    labels: dailySales.map((d) => d.day),
    datasets: [
      {
        label: "Sales (₹)",
        data: dailySales.map((d) => d.amount),
        borderColor: "#044e36",
        backgroundColor: "rgba(4, 78, 54, 0.05)",
        tension: 0.4,
        fill: true,
        pointRadius: 4,
        pointHoverRadius: 6,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: "#fff",
        titleColor: "#000",
        bodyColor: "#000",
        borderColor: "#eee",
        borderWidth: 1,
        padding: 10,
        displayColors: false,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: { color: "#f5f5f5" },
        ticks: { callback: (value) => "₹" + value },
      },
      x: { grid: { display: false } },
    },
  };

  const handleDateChange = (e) => setSelectedDate(e.target.value);
  const handleTodayClick = () => {
    const today = new Date();
    setSelectedDate(formatDate(today));
  };
  const handleSavedWishlistClick = () => {
    navigate("/admin/wishlist");
  };
  const handleViewAllClick = () => {
    navigate("/admin/payouts");
  };

  // Navigate to profile page
  const handleViewProfile = () => {
    navigate("/admin/profile");
    setShowProfileDropdown(false);
  };

  const handleEditProfile = () => {
    // Trigger edit mode in profile page
    window.dispatchEvent(new CustomEvent("openProfileEdit"));
    navigate("/admin/profile");
    setShowProfileDropdown(false);
  };

  const getStatusBadgeClass = () => {
    const status = pendingPayment.status?.toLowerCase();
    if (status === 'pending' || status === 'pending approval') return 'status-pending';
    if (status === 'paid' || status === 'completed') return 'status-completed';
    if (status === 'rejected') return 'status-rejected';
    if (status === 'cancelled') return 'status-cancelled';
    return '';
  };

  // Get user initials for avatar
  const getUserInitials = () => {
    const first = userProfile.first_name?.charAt(0) || '';
    const last = userProfile.last_name?.charAt(0) || '';
    return (first + last).toUpperCase() || 'U';
  };

  // Get full name
  const getFullName = () => {
    return `${userProfile.first_name} ${userProfile.last_name}`.trim() || 'User';
  };

  // Get role display name
  const getRoleDisplay = () => {
    const role = userProfile.role?.toLowerCase();
    if (role === 'super_admin') return 'Super Administrator';
    if (role === 'admin') return 'Administrator';
    if (role === 'vendor') return 'Vendor Partner';
    return userProfile.role || 'User';
  };

  if (loading) {
    return (
      <div className="dash-loader-overlay">
        <div className="dash-spinner"></div>
      </div>
    );
  }

  return (
    <div className="dash-container">

      <div className="dash-banner-top-sec">

        {/* User Profile Section */}
        <div className="dash-profile-section">
          <div
            className="dash-profile-card"
            onClick={() => setShowProfileDropdown(!showProfileDropdown)}
          >
            <div className="dash-profile-avatar">
              {userProfile.avatar ? (
                <img src={userProfile.avatar} alt="Profile" />
              ) : (
                <span className="dash-profile-initials">{getUserInitials()}</span>
              )}
            </div>
            <div className="dash-profile-info">
              <h3 className="dash-profile-name">{getFullName()}</h3>
              {/* <p className="dash-profile-role">{getRoleDisplay()}</p> */}
              <div className="dash-profile-contact">
                <span><i className="bi bi-envelope"></i> {userProfile.email}</span>
                {userProfile.phone && <span><i className="bi bi-phone"></i> {userProfile.phone}</span>}
              </div>
              <div className="dash-profile-dropdown-icon">
                <i className={`bi bi-chevron-${showProfileDropdown ? 'up' : 'down'}`}></i>
              </div>
            </div>

            {/* <div>
              {showStoreToggle && (
                <div className="dash-store-button">
                  <span>{storeActive ? 'Store On' : 'Store Off'}</span>
                  <button
                    type="button"
                    className={`dash-dropdown-store-switch ${storeActive ? 'active' : ''}`}
                    onClick={handleStoreToggle}
                    disabled={togglingStore}
                    aria-pressed={storeActive}
                    aria-label={storeActive ? 'Turn store off' : 'Turn store on'}
                    title={storeActive ? 'Turn store off' : 'Turn store on'}
                  >
                    <span className="dash-dropdown-store-switch-thumb"></span>
                  </button>
                </div>
              )}
            </div> */}
          </div>

          {/* Dropdown Menu */}
          {showProfileDropdown && (
            <div className="dash-profile-dropdown">
              <div className="dash-profile-dropdown-header">
                <div className="dash-dropdown-avatar">
                  {userProfile.avatar ? (
                    <img src={userProfile.avatar} alt="Profile" />
                  ) : (
                    <span>{getUserInitials()}</span>
                  )}
                </div>
                <div className="dash-dropdown-info">
                  <strong>{getFullName()}</strong>
                  <small>{userProfile.email}</small>
                </div>
              </div>
              <div className="dash-profile-dropdown-divider"></div>
              <button className="dash-dropdown-item" onClick={handleViewProfile}>
                <i className="bi bi-person-circle"></i>
                <span>View Profile</span>
              </button>
              <button className="dash-dropdown-item" onClick={handleEditProfile}>
                <i className="bi bi-pencil-square"></i>
                <span>Edit Profile</span>
              </button>
              {userProfile.store_name && (
                <>
                  <div className="dash-profile-dropdown-divider"></div>
                  <div className="dash-dropdown-store-info">
                    <i className="bi bi-shop"></i>
                    <div>
                      <small>Store</small>
                      <span>{userProfile.store_name}</span>
                    </div>
                  </div>
                </>
              )}
              {userProfile.address && (
                <div className="dash-dropdown-address">
                  <i className="bi bi-geo-alt"></i>
                  <div>
                    <small>Address</small>
                    <span>
                      {userProfile.address}
                      {userProfile.city && `, ${userProfile.city}`}
                      {userProfile.state && `, ${userProfile.state}`}
                      {userProfile.pincode && ` - ${userProfile.pincode}`}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="dash-banner">
          {dashboardBanner.link ? (
            <a href={dashboardBanner.link} target="_blank" rel="noopener noreferrer">
              <img src={dashboardBanner.url} alt={dashboardBanner.alt} />
            </a>
          ) : (
            <img src={dashboardBanner.url} alt={dashboardBanner.alt} />
          )}
        </div>

      </div>

      <div className="ash-banner-bottom-sec">

        <div className="dash-date-filter-bar">
          <div className="dash-today-date" onClick={handleTodayClick} style={{ cursor: 'pointer' }}>
            <div className="dash-today-label">Today</div>
          </div>
          <div className="dash-date-range-controls">
            <div className="dash-date-input-group">
              <input type="date" value={selectedDate} onChange={handleDateChange} />
            </div>
          </div>
        </div>

        <div className="dash-pending-payment-container">
          <div className="dash-payment-header">
            <div className="dash-payment-title-group">
              <span className="dash-payment-tag">
                {userRole?.toLowerCase() === 'vendor' || userRole?.toLowerCase() === 'admin' ? 'WITHDRAWAL STATUS' : 'PENDING PAYMENT'}
              </span>
              <h2>₹ {pendingPayment.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</h2>
            </div>
            <div className="dash-payment-info-group">
              <span className="dash-payment-count">{pendingPayment.count} {pendingPayment.count === 1 ? 'Request' : 'Requests'}</span>
              <a href="#/payouts" className="dash-view-all-link" onClick={(e) => { e.preventDefault(); handleViewAllClick(); }}>
                VIEW ALL <i className="bi bi-chevron-right"></i>
              </a>
            </div>
          </div>

          <div className="dash-payment-inner-card">
            <div className="dash-inner-card-row">
              <div className="dash-inner-field">
                <div className="dash-supplier-title-row">
                  <span className="dash-field-label">
                    {userRole?.toLowerCase() === 'vendor' || userRole?.toLowerCase() === 'admin' ? 'Request Details' : 'Vendor Name'}
                  </span>
                  <span className={`dash-due-badge ${getStatusBadgeClass()}`}>
                    {pendingPayment.status || (pendingPayment.amount > 0 ? 'PENDING' : 'NO REQUESTS')}
                  </span>
                </div>
                <span className="dash-field-value-strong">
                  {pendingPayment.supplierName || (pendingPayment.amount > 0 ? 'Withdrawal Request' : 'No active withdrawals')}
                </span>
                {pendingPayment.requestId && (
                  <div style={{ fontSize: '11px', color: '#666', marginTop: '4px' }}>
                    Request ID: WD-{String(pendingPayment.requestId).padStart(6, '0')}
                  </div>
                )}
              </div>
              <div className="dash-inner-field text-right">
                <span className="dash-field-label">
                  {userRole?.toLowerCase() === 'vendor' || userRole?.toLowerCase() === 'admin' ? 'Request Amount' : 'Due Balance'}
                </span>
                <span className="dash-field-value-currency">₹{pendingPayment.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>
            <div className="dash-inner-card-footer">
              <div className="dash-payment-date">
                <span className="dash-field-label">
                  {pendingPayment.issueDate ? 'Request Date: ' : ''}
                </span>
                <span className="dash-field-value">{pendingPayment.issueDate}</span>
              </div>
              <button className="dash-pay-now-btn" onClick={handleViewAllClick}>
                {userRole?.toLowerCase() === 'vendor' || userRole?.toLowerCase() === 'admin' ? 'Track Request' : 'View Details'}
              </button>
            </div>
          </div>
        </div>

        <div className="dash-order-overview-container">
          <div className="dash-overview-header">
            <h3>Order Overview</h3>
            <div className="dash-time-selector">
              <span>30 Days</span>
              <i className="bi bi-chevron-down"></i>
            </div>
          </div>

          <div className="dash-overview-grid">
            <div className="dash-overview-item item-pending">
              <div className="dash-overview-icon icon-pending">
                <i className="bi bi-box-seam"></i>
              </div>
              <div className="dash-overview-content">
                <span className="dash-overview-label">Pending Order</span>
                <h4 className="dash-overview-count">{orderOverview.pending} Orders</h4>
              </div>
            </div>

            <div className="dash-overview-item item-onway">
              <div className="dash-overview-icon icon-onway">
                <i className="bi bi-truck"></i>
              </div>
              <div className="dash-overview-content">
                <span className="dash-overview-label">On the Way</span>
                <h4 className="dash-overview-count">{orderOverview.onTheWay} Orders</h4>
              </div>
            </div>

            <div className="dash-overview-item item-delivered">
              <div className="dash-overview-icon icon-delivered">
                <i className="bi bi-check2-circle"></i>
              </div>
              <div className="dash-overview-content">
                <span className="dash-overview-label">Delivered Order</span>
                <h4 className="dash-overview-count">{orderOverview.delivered} Orders</h4>
              </div>
            </div>

            <div className="dash-overview-item item-cancelled">
              <div className="dash-overview-icon icon-cancelled">
                <i className="bi bi-x-circle"></i>
              </div>
              <div className="dash-overview-content">
                <span className="dash-overview-label">Cancelled Order</span>
                <h4 className="dash-overview-count">{orderOverview.cancelled} Orders</h4>
              </div>
            </div>
          </div>
        </div>

        <div className="dash-manage-shopping-container">
          <h3 className="dash-block-title">Manage Shopping List</h3>
          <div className="dash-shopping-list-card">
            <div className="dash-shopping-section" onClick={handleSavedWishlistClick}>
              <div className="dash-shopping-icon-wrap inline-heart">
                <i className="bi bi-heart"></i>
                <span className="dash-icon-plus-badge">+</span>
              </div>
              <span className="dash-shopping-text">Saved Product <i className="bi bi-arrow-right-short"></i></span>
            </div>
            <div className="dash-shopping-divider"></div>
            <div className="dash-shopping-section">
              <div className="dash-shopping-icon-wrap inline-notes">
                <i className="bi bi-file-earmark-text"></i>
                <span className="dash-icon-plus-badge">+</span>
              </div>
              <span className="dash-shopping-text">Product Notes <i className="bi bi-arrow-right-short"></i></span>
            </div>
          </div>
        </div>

        <div className="dash-reorder-promo-banner">
          <div className="dash-promo-content">
            <h3>Reorder Your Regular Items</h3>
            <p>Saves time and efforts</p>
            <button className="dash-promo-btn">Reorder Now</button>
          </div>
          <div className="dash-promo-graphics">
            <div className="dash-promo-bubble bubble-apple">🍏</div>
            <div className="dash-promo-bubble bubble-milk">🥛</div>
            <div className="dash-promo-bubble bubble-grain">🌾</div>
            <svg className="dash-dotted-lines" width="100" height="80">
              <path d="M 15 65 Q 15 45, 10 25" fill="none" stroke="#22c55e" strokeWidth="1.5" strokeDasharray="3 3" />
              <path d="M 45 65 Q 45 35, 45 15" fill="none" stroke="#22c55e" strokeWidth="1.5" strokeDasharray="3 3" />
              <path d="M 75 65 Q 75 45, 80 25" fill="none" stroke="#22c55e" strokeWidth="1.5" strokeDasharray="3 3" />
            </svg>
            <div className="dash-promo-box">
              <div className="dash-promo-box-lid"></div>
              <div className="dash-promo-box-body"></div>
            </div>
          </div>
        </div>

        <div className="dash-extra-content-grid">
          <div className="dash-stats-row">
            <div className="dash-section-card dash-stat-card">
              <div className="dash-stat-content">
                <div className="dash-stat-icon">
                  <i className="bi bi-cart"></i>
                </div>
                <div>
                  <p className="dash-stat-label">Today's Orders</p>
                  <h3 className="dash-stat-value">{todayStats.todayOrders}</h3>
                </div>
              </div>
            </div>

            <div className="dash-section-card dash-stat-card">
              <div className="dash-stat-content">
                <div className="dash-stat-icon">
                  <i className="bi bi-currency-rupee"></i>
                </div>
                <div>
                  <p className="dash-stat-label">Today's Earnings</p>
                  <h3 className="dash-stat-value">
                    ₹{todayStats.todayEarnings.toLocaleString("en-IN", {
                      minimumFractionDigits: 2,
                    })}
                  </h3>
                </div>
              </div>
            </div>
          </div>

          <div className="dash-chart">
            <div className="dash-chart-header">
              <h5 className="dahs-table-headings">
                Sales Overview (₹) <span className="dahs-table-headspan">– Last 7 Days</span>
              </h5>
            </div>
            <div className="dash-chart-canvas-wrap">
              <Line data={chartData} options={options} />
            </div>
          </div>

          <div className="dash-table">
            <h5 className="dahs-table-headings">
              Recent Orders{" "}
              <span className="dahs-table-headspan">
                ({formatDisplayDate(new Date(selectedDate))})
              </span>
            </h5>

            <div className="dash-table-responsive">
              <table className="dash-orders-table">
                {recentOrders.length === 0 ? (
                  <tbody>
                    <tr>
                      <td colSpan="6">
                        <div style={{ textAlign: "center", padding: "40px" }}>
                          <img
                            src={noOrdersImg}
                            alt="No orders"
                            className="no-orders-image"
                          />
                          <p style={{ color: "#666", marginTop: "10px" }}>
                            No orders.
                          </p>
                        </div>
                      </td>
                    </tr>
                  </tbody>
                ) : (
                  <>
                    <thead>
                      <tr>
                        <th>Order ID</th>
                        <th>Customer</th>
                        <th>Pickup</th>
                        <th>Date</th>
                        <th>Amount</th>
                        <th>Status</th>
                      </tr>
                    </thead>

                    <tbody>
                      {recentOrders.map((order) => (
                        <tr key={order.id}>
                          <td>#{order.id}</td>
                          <td>
                            {order.user_name ||
                              order.customer_name ||
                              "Guest"}
                          </td>
                          <td>
                            {order.pickup_schedule_display ||
                              (order.shiprocket_order_id
                                ? "Pickup pending"
                                : "Not selected")}
                          </td>
                          <td>
                            {new Date(order.created_at).toLocaleDateString()}
                          </td>
                          <td>
                            ₹{parseFloat(order.total_amount).toLocaleString()}
                          </td>
                          <td>
                            <span
                              className={`dash-status dash-status-${(
                                order.order_status || "Pending"
                              ).toLowerCase()}`}
                            >
                              {order.order_status || "Pending"}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </>
                )}
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Store Warning Modal */}
      {showStoreWarningModal && (
        <div className="store-warning-modal-overlay" onClick={() => setShowStoreWarningModal(false)}>
          <div className="store-warning-modal" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="store-warning-close"
              onClick={() => setShowStoreWarningModal(false)}
              aria-label="Close store warning"
            >
              <i className="bi bi-x-lg"></i>
            </button>
            <div className="store-warning-icon">
              <i className="bi bi-exclamation-triangle"></i>
            </div>
            <div className="store-warning-content">
              <h3>Store is off</h3>
              <p>Warning: you are in off mode. Turn on your store to sell your products.</p>
            </div>
            <button
              type="button"
              className="store-warning-action"
              onClick={handleTurnStoreOn}
              disabled={togglingStore}
            >
              {togglingStore ? 'Turning on...' : 'Turn On Store'}
            </button>
          </div>
        </div>
      )}

      <style jsx="true">{`
        .status-pending {
          background: #f59e0b !important;
          color: #fff !important;
        }
        .status-completed {
          background: #10b981 !important;
          color: #fff !important;
        }
        .status-rejected {
          background: #ef4444 !important;
          color: #fff !important;
        }
        .status-cancelled {
          background: #6b7280 !important;
          color: #fff !important;
        }
      `}</style>
    </div>
  );
};

export default Dashboard;
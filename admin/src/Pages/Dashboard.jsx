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
    status: "",        // withdrawal status: Pending, Approved, Rejected
    requestId: null    // withdrawal request ID
  });

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
  }, [selectedDate]);

  // Fetch withdrawal/payment data based on user role
  const fetchPaymentData = async () => {
    try {
      const token = localStorage.getItem("token");
      const role = userRole?.toLowerCase();
      
      if (role === 'vendor' || role === 'admin') {
        // For vendors: fetch their withdrawal requests
        const res = await axios.get(`${API_URL}/admin/payouts`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        if (res.data.success) {
          const payouts = res.data.payouts || [];
          // Get pending withdrawal requests
          const pendingWithdrawals = payouts.filter(p => p.status === 'Pending');
          const totalPendingAmount = pendingWithdrawals.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
          
          if (pendingWithdrawals.length > 0) {
            const latestWithdrawal = pendingWithdrawals[0];
            setPendingPayment({
              count: pendingWithdrawals.length,
              amount: totalPendingAmount,
              supplierName: "My Withdrawal Request",
              issueDate: latestWithdrawal.requested_at ? new Date(latestWithdrawal.requested_at).toLocaleDateString('en-IN', {
                day: 'numeric', month: 'short', year: 'numeric'
              }) : "",
              status: "Pending",
              requestId: latestWithdrawal.id
            });
          } else {
            // Check if there are any completed/rejected withdrawals
            const anyWithdrawals = payouts.filter(p => p.status === 'Paid' || p.status === 'Rejected' || p.status === 'Cancelled');
            if (anyWithdrawals.length > 0) {
              const latest = anyWithdrawals[0];
              setPendingPayment({
                count: anyWithdrawals.length,
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
        }
      } else if (role === 'super_admin') {
        // For super admin: fetch pending vendor withdrawals
        const res = await axios.get(`${API_URL}/admin/payouts`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        if (res.data.success) {
          const payouts = res.data.payouts || [];
          const pendingWithdrawals = payouts.filter(p => p.status === 'Pending');
          const totalPendingAmount = pendingWithdrawals.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
          
          if (pendingWithdrawals.length > 0) {
            const latestWithdrawal = pendingWithdrawals[0];
            const vendorName = latestWithdrawal.store_name || latestWithdrawal.vendor_name || "Vendor";
            setPendingPayment({
              count: pendingWithdrawals.length,
              amount: totalPendingAmount,
              supplierName: vendorName,
              issueDate: latestWithdrawal.requested_at ? new Date(latestWithdrawal.requested_at).toLocaleDateString('en-IN', {
                day: 'numeric', month: 'short', year: 'numeric'
              }) : "",
              status: "Pending Approval",
              requestId: latestWithdrawal.id
            });
          } else {
            // Check recent completed withdrawals
            const completedWithdrawals = payouts.filter(p => p.status === 'Paid');
            if (completedWithdrawals.length > 0) {
              const latest = completedWithdrawals[0];
              setPendingPayment({
                count: completedWithdrawals.length,
                amount: parseFloat(latest.amount) || 0,
                supplierName: latest.store_name || latest.vendor_name || "Vendor",
                issueDate: latest.processed_at ? new Date(latest.processed_at).toLocaleDateString('en-IN', {
                  day: 'numeric', month: 'short', year: 'numeric'
                }) : "",
                status: "Completed",
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
      }
    } catch (err) {
      console.error("Failed to fetch payment data:", err);
    }
  };

  const fetchDashboardData = async (date) => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");

      const res = await axios.get(`${API_URL}/api/admin/dashboard/stats-by-date`, {
        params: { date: date },
        headers: { Authorization: `Bearer ${token}` },
      });

      const todayRes = await axios.get(`${API_URL}/api/admin/dashboard/today-stats`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.data.success) {
        setStats(res.data.stats);
        setOrderOverview(res.data.orderOverview);
        setRecentOrders(res.data.recentOrders);
        setDailySales(res.data.dailySales);
      }

      if (todayRes.data.success) {
        setTodayStats({
          todayOrders: todayRes.data.todayOrders,
          todayEarnings: todayRes.data.todayEarnings,
        });
      }

      // Fetch payment/withdrawal data
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

  // Get status badge class
  const getStatusBadgeClass = () => {
    const status = pendingPayment.status?.toLowerCase();
    if (status === 'pending' || status === 'pending approval') return 'status-pending';
    if (status === 'paid' || status === 'completed') return 'status-completed';
    if (status === 'rejected') return 'status-rejected';
    if (status === 'cancelled') return 'status-cancelled';
    return '';
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
          <h5 className="dahs-table-headings">Recent Orders <span className="dahs-table-headspan">({formatDisplayDate(new Date(selectedDate))})</span></h5>
          <div className="dash-table-responsive">
            <table className="dash-orders-table">
              <thead>
                <tr>
                  <th>Order ID</th>
                  <th>Customer</th>
                  <th>Date</th>
                  <th>Amount</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {recentOrders.map((order) => (
                  <tr key={order.id}>
                    <td>#{order.id}</td>
                    <td>{order.user_name || order.customer_name || "Guest"}</td>
                    <td>{new Date(order.created_at).toLocaleDateString()}</td>
                    <td>₹{parseFloat(order.total_amount).toLocaleString()}</td>
                    <td>
                      <span
                        className={`dash-status dash-status-${(order.order_status || 'Pending').toLowerCase()}`}
                      >
                        {order.order_status || 'Pending'}
                      </span>
                    </td>
                  </tr>
                ))}
                {recentOrders.length === 0 && (
                  <tr>
                    <td colSpan="5" className="dash-text-center">
                      No orders for this date
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

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
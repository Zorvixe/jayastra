import React, { useState, useEffect } from "react";
import axios from '../utils/axiosConfig'; // Adjust path as needed

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
    issueDate: ""
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

  // Single date filter state
  const [selectedDate, setSelectedDate] = useState("");



  const API_URL = process.env.REACT_APP_API_URL;

  // Helper: format date as YYYY-MM-DD
  const formatDate = (date) => date.toISOString().split("T")[0];

  // Helper: format date as "DD MMM, YYYY" for display (e.g., "08 Jun, 2026")
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



  const fetchDashboardData = async (date) => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");

      // Fetch data for the selected date
      const res = await axios.get(`${API_URL}/admin/dashboard/stats-by-date`, {
        params: { date: date },
        headers: { Authorization: `Bearer ${token}` },
      });

      const todayRes = await axios.get(`${API_URL}/admin/dashboard/today-stats`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.data.success) {
        setStats(res.data.stats || {});
        setOrderOverview(res.data.orderOverview || { pending: 0, onTheWay: 0, delivered: 0, cancelled: 0 });
        setPendingPayment(res.data.pendingPayment || { count: 0, amount: 0, supplierName: "", issueDate: "" });
        setRecentOrders(res.data.recentOrders || []);
        setDailySales(res.data.dailySales || []);
      }

      if (todayRes.data.success) {
        setTodayStats({
          todayOrders: todayRes.data.todayOrders || 0,
          todayEarnings: todayRes.data.todayEarnings || 0,
        });
      }
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
        borderColor: "#8E2139",
        backgroundColor: "rgba(142, 33, 57, 0.05)",
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
  }

  if (loading)
    return (
      <div className="dash-loader-overlay">
        <div className="dash-spinner"></div>
      </div>
    );

  return (
    <div className="dash-container">
      {/* ================= DATE FILTER BAR - SINGLE DATE PICKER ================= */}
      <div className="dash-date-filter-bar">
        <div className="dash-today-date" onClick={handleTodayClick} style={{ cursor: 'pointer' }}>
          <div className="dash-today-label">Today</div>

        </div>

        <div className="dash-date-range-controls">
          <div className="dash-date-input-group">
            <input
              type="date"
              value={selectedDate}
              onChange={handleDateChange}
            />
          </div>
        </div>
      </div>


      {/* ================= PENDING PAYMENT BANNER ================= */}
      {
        pendingPayment.amount > 0 && (
          <div className="dash-pending-payment">
            <div className="dash-payment-header">
              <div className="dash-payment-title-group">
                <span className="dash-payment-tag">PENDING PAYMENT</span>
                <h2>₹ {pendingPayment.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</h2>
              </div>
              <div className="dash-payment-info">
                <span>{pendingPayment.count} Invoice Pending</span>
                <a href="#/payouts" className="dash-view-all-link">VIEW ALL <i className="bi bi-chevron-right"></i></a>
              </div>
            </div>

            <div className="dash-payment-body-card">
              <div className="dash-payment-details">
                <div className="dash-payment-field">
                  <span className="dash-field-label">Supplier Name</span>
                  <div className="dash-supplier-wrapper">
                    <span className="dash-field-value-strong">{pendingPayment.supplierName || "Pran Group Limited"}</span>
                    <span className="dash-due-badge">UPCOMING DUE</span>
                  </div>
                </div>
                <div className="dash-payment-field">
                  <span className="dash-field-label">Due Balance</span>
                  <span className="dash-field-value-currency">₹{pendingPayment.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
              </div>
              <div className="dash-payment-footer">
                <div className="dash-payment-date">
                  <span className="dash-field-label">Issue Date:</span>
                  <span className="dash-field-value">{pendingPayment.issueDate || "29 Aug, 2025"}</span>
                </div>
                <button className="dash-pay-now-btn">Pay Now</button>
              </div>
            </div>
          </div>
        )
      }

      {/* ================= ORDER OVERVIEW (MOCKUP STYLE) ================= */}
      <div className="dash-section-card">
        <div className="dash-section-header">
          <h3>Order Overview</h3>
          <div className="dash-period-selector">
            <span>{formatDisplayDate(new Date(selectedDate))}</span>
            <i className="bi bi-calendar"></i>
          </div>
        </div>

        <div className="dash-overview-grid">
          <div className="dash-overview-item item-pending">
            <div className="dash-overview-icon">
              <i className="bi bi-box"></i>
            </div>
            <div className="dash-overview-content">
              <p className="dash-overview-label">Pending Order</p>
              <h4 className="dash-overview-count">{orderOverview.pending} Orders</h4>
            </div>
          </div>

          <div className="dash-overview-item item-onway">
            <div className="dash-overview-icon">
              <i className="bi bi-truck"></i>
            </div>
            <div className="dash-overview-content">
              <p className="dash-overview-label">On the Way</p>
              <h4 className="dash-overview-count">{orderOverview.onTheWay} Orders</h4>
            </div>
          </div>

          <div className="dash-overview-item item-delivered">
            <div className="dash-overview-icon">
              <i className="bi bi-check2-circle"></i>
            </div>
            <div className="dash-overview-content">
              <p className="dash-overview-label">Delivered Order</p>
              <h4 className="dash-overview-count">{orderOverview.delivered} Orders</h4>
            </div>
          </div>

          <div className="dash-overview-item item-cancelled">
            <div className="dash-overview-icon">
              <i className="bi bi-x-circle"></i>
            </div>
            <div className="dash-overview-content">
              <p className="dash-overview-label">Cancelled Order</p>
              <h4 className="dash-overview-count">{orderOverview.cancelled} Orders</h4>
            </div>
          </div>
        </div>
      </div>

      {/* ================= MANAGE SHOPPING LIST ================= */}
      <div className="dash-section-card">
        <div className="dash-section-header">
          <h3>Manage Shopping List</h3>
        </div>
        <div className="dash-shopping-actions">
          <button className="dash-action-tile" onClick={handleSavedWishlistClick}>
            <div className="dash-action-icon icon-heart">
              <i className="bi bi-heart"></i>
              <span className="dash-plus-badge">+</span>
            </div>
            <span>Saved Product <i className="bi bi-arrow-right"></i></span>
          </button>

          <button className="dash-action-tile">
            <div className="dash-action-icon icon-notes">
              <i className="bi bi-journal-text"></i>
              <span className="dash-plus-badge">+</span>
            </div>
            <span>Product Notes <i className="bi bi-arrow-right"></i></span>
          </button>
        </div>
      </div>

      {/* ================= REORDER PROMO BANNER ================= */}
      <div className="dash-reorder-promo">
        <div className="dash-reorder-text">
          <h3>Reorder Your Regular Items</h3>
          <p>Saves time and efforts</p>
          <button className="dash-reorder-now-btn">Reorder Now</button>
        </div>
        <div className="dash-reorder-graphics">
          <div className="dash-graphic-circle apple">🍏</div>
          <div className="dash-graphic-circle milk">🥛</div>
          <div className="dash-graphic-circle flour">🌾</div>
          <div className="dash-graphic-box">
            <div className="dash-box-lid shadow"></div>
            <div className="dash-box-body"></div>
          </div>
        </div>
      </div>

      {/* ================= SALES CHART ================= */}
      <div className="dash-chart">
        <div className="dash-chart-header">
          <h5 className="dahs-table-headings">
            Sales Overview (₹) <span className="dahs-table-headspan">– {formatDisplayDate(new Date(selectedDate))}</span>
          </h5>
        </div>
        <div className="dash-chart-canvas-wrap">
          <Line data={chartData} options={options} />
        </div>
      </div>

      {/* ================= RECENT ORDERS ================= */}
      <div className="dash-table">
        <h5 className="dahs-table-headings">Recent Orders <span className="dahs-table-headspan">({formatDisplayDate(new Date(selectedDate))})</span> </h5>
        <div className="dash-table-responsive">
          <table>
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
                  <td>{order.user_name || "Guest"}</td>
                  <td>{new Date(order.created_at).toLocaleDateString()}</td>
                  <td>₹{parseFloat(order.total_amount).toLocaleString()}</td>
                  <td>
                    <span
                      className={`dash-status dash-status-${order.order_status?.toLowerCase()}`}
                    >
                      {order.order_status}
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
    </div >
  );
};

export default Dashboard;
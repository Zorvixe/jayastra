// Dashboard.js
import React, { useState, useEffect } from "react";
import axios from '../utils/axiosConfig'; // Adjust path as needed
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
  });
  const userRole = localStorage.getItem("userRole");
  const [recentOrders, setRecentOrders] = useState([]);
  const [dailySales, setDailySales] = useState([]);
  const [loading, setLoading] = useState(true);

  // Date filter state
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const API_URL = process.env.REACT_APP_API_URL;

  // Set default dates (last 30 days) on mount
  useEffect(() => {
    const today = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(today.getDate() - 30);

    const formatDate = (date) => date.toISOString().split("T")[0];
    setStartDate(formatDate(thirtyDaysAgo));
    setEndDate(formatDate(today));
  }, []);

  // Fetch data whenever startDate or endDate changes
  useEffect(() => {
    if (startDate && endDate) {
      fetchDashboardData(startDate, endDate);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startDate, endDate]);

  const fetchDashboardData = async (start, end) => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const res = await axios.get(`${API_URL}/admin/dashboard/stats`, {
        params: { startDate: start, endDate: end },
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.data.success) {
        // FALLBACKS ADDED HERE TO PREVENT UNDEFINED ARRAYS
        setStats(res.data.stats || {});
        setRecentOrders(res.data.recentOrders || []);
        setDailySales(res.data.dailySales || []);
      }
    } catch (error) {
      console.error("Dashboard Data Fetch Error:", error);
    } finally {
      setLoading(false);
    }
  };

  // Chart data (daily sales from the filtered period)
  const chartData = {
    labels: dailySales.map((d) => d.day),
    datasets: [
      {
        label: "Sales (₹)",
        data: dailySales.map((d) => d.amount),
        borderColor: "#8E2139",
        backgroundColor: "rgba(142, 33, 57, 0.1)",
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
        grid: { color: "#f0f0f0" },
        ticks: { callback: (value) => "₹" + value },
      },
      x: { grid: { display: false } },
    },
  };

  // Handlers for date inputs
  const handleStartDateChange = (e) => setStartDate(e.target.value);
  const handleEndDateChange = (e) => setEndDate(e.target.value);
  const handleReset = () => {
    const today = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(today.getDate() - 30);
    setStartDate(thirtyDaysAgo.toISOString().split("T")[0]);
    setEndDate(today.toISOString().split("T")[0]);
  };

  if (loading)
    return (
      <div className="dash-loader-overlay">
        <div className="dash-loader-container">
          <div className="dash-spinner"></div>
        </div>
      </div>
    );

  return (
    <div className="dash-container">
      {/* ================= DATE FILTER ================= */}
      <div className="dash-date-filter-bar">
        <div className="dash-today-date">
          <span className="dash-today-label">📅 Today</span>
          <span className="dash-today-value">
            {new Date().toLocaleDateString("en-IN", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </span>
        </div>
        <div className="dash-date-range-controls">
          <div className="dash-date-input-group">
            <label>From</label>
            <input
              type="date"
              value={startDate}
              onChange={handleStartDateChange}
            />
          </div>
          <div className="dash-date-input-group">
            <label>To</label>
            <input type="date" value={endDate} onChange={handleEndDateChange} />
          </div>
          <button onClick={handleReset} className="dash-reset-btn">
            ↺ Reset to 30 days
          </button>
        </div>
      </div>

      {/* ================= SUMMARY CARDS ================= */}
      <div className="dash-cards">
        <div className="dash-card dash-card-products">
          <div className="dash-card-icon">
            <i className="bi bi-box-seam"></i>
          </div>
          <div className="dash-card-content">
            <p>Total Products</p>
            <h4>{stats.totalProducts}</h4>
          </div>
        </div>
        <div className="dash-card dash-card-orders">
          <div className="dash-card-icon">
            <i className="bi bi-cart-check"></i>
          </div>
          <div className="dash-card-content">
            <p>Total Orders</p>
            <h4>{stats.totalOrders}</h4>
          </div>
        </div>

        {userRole !== 'vendor' && (
        <div className="dash-card dash-card-users">
          <div className="dash-card-icon">
            <i className="bi bi-people"></i>
          </div>
          <div className="dash-card-content">
            <p>Total Users</p>
            <h4>{stats.totalUsers}</h4>
          </div>
        </div>
        )}

        <div className="dash-card dash-card-revenue">
          <div className="dash-card-icon">
            <i className="bi bi-currency-rupee"></i>
          </div>
          <div className="dash-card-content">
           <p>{userRole === 'vendor' ? 'Your Earnings' : 'Total Revenue'}</p>
            {/* Safe fallback in case totalRevenue is undefined */}
            <h4>₹{(stats.totalRevenue ?? 0).toLocaleString()}</h4>
          </div>
        </div>
        <div className="dash-card dash-card-notifications">
          <div className="dash-card-icon">
            <i className="bi bi-bell"></i>
          </div>
          <div className="dash-card-content">
            <p>Stock Requests</p>
            <h4>{stats.stockNotificationCount || 0}</h4>
          </div>
        </div>
      </div>

      {/* ================= SALES CHART ================= */}
      <div className="dash-chart">
        <div className="dash-chart-header">
          <h5>
            Sales Overview (₹) <span className="dash-period-text">– {startDate} to {endDate}</span>
          </h5>
        </div>
        <div className="dash-chart-canvas-wrap">
          <Line data={chartData} options={options} />
        </div>
      </div>

      {/* ================= RECENT ORDERS ================= */}
      <div className="dash-table">
        <h5>Orders ({startDate} to {endDate})</h5>
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
                    No orders in this period
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
import React, { useState, useEffect } from "react";
import axios from '../utils/axiosConfig'; // Adjust path as needed
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
  BarChart,
  Bar
} from "recharts";
import "./Reports.css";

const Reports = () => {

  const [filter, setFilter] = useState("7");
  const [reportData, setReportData] = useState({
    salesData: [],
    topProducts: [],
    summary: { total_revenue: 0, total_orders: 0 }
  });
  const [loading, setLoading] = useState(true);

  const API_URL = process.env.REACT_APP_API_URL;

  useEffect(() => {
    fetchReportData();
  }, [filter]);

  const fetchReportData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(`${API_URL}/admin/reports?days=${filter}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.data.success) {
        setReportData({
          salesData: res.data.salesData,
          topProducts: res.data.topProducts,
          summary: res.data.summary
        });
      }
    } catch (error) {
      console.error("Report Data Fetch Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const { salesData, topProducts, summary } = reportData;

  const totalRevenue = summary.total_revenue || 0;
  const totalOrders = summary.total_orders || 0;
  const avgOrderValue = totalOrders > 0 ? Math.floor(totalRevenue / totalOrders) : 0;

  return (
    <div className="reports-container">
      <div className="report-header">

        <h4>Reports & Analytics</h4>

        {/* ================= FILTER ================= */}
        <div className="report-filter">
          <select value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option value="7">Last 7 Days</option>
            <option value="30">Last 30 Days</option>
            <option value="365">Last Year</option>
          </select>
        </div>
      </div>

      {/* ================= SUMMARY CARDS ================= */}
      <div className="report-cards">

        <div className="report-card revenue">
          <i className="bi bi-currency-rupee"></i>
          <div>
            <p>Total Revenue</p>
            <h3>₹{totalRevenue.toLocaleString()}</h3>
          </div>
        </div>

        <div className="report-card orders">
          <i className="bi bi-cart-check"></i>
          <div>
            <p>Total Orders</p>
            <h3>{totalOrders}</h3>
          </div>
        </div>

        <div className="report-card avg">
          <i className="bi bi-graph-up"></i>
          <div>
            <p>Average Order Value</p>
            <h3>₹{avgOrderValue.toLocaleString()}</h3>
          </div>
        </div>

      </div>

      {loading ? (
        <div className="dash-loader-overlay">
          <div className="dash-loader-container">
            <div className="dash-spinner"></div>
          </div>
        </div>
      ) : (
        <>
          {/* ================= REVENUE GRAPH ================= */}
          <div className="chart-section">
            <h5>Revenue Trend</h5>
            {salesData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={salesData}>
                  <CartesianGrid stroke="#eee" />
                  <XAxis dataKey="date" />
                  <YAxis tickFormatter={(val) => `₹${val}`} />
                  <Tooltip formatter={(value) => `₹${value}`} />
                  <Line type="monotone" dataKey="revenue" stroke="#2563eb" strokeWidth={3} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="no-data-msg">No sales data available for this period.</div>
            )}
          </div>

          {/* ================= ORDER SUMMARY BAR CHART ================= */}
          <div className="chart-section">
            <h5>Orders by Day</h5>
            {salesData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={salesData}>
                  <CartesianGrid stroke="#eee" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="orders" fill="#10b981" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="no-data-msg">No order data available for this period.</div>
            )}
          </div>

          {/* ================= PRODUCT PERFORMANCE ================= */}
          <div className="performance-section">

            <h5>Top Performing Products</h5>

            {topProducts.length > 0 ? (
              <table>
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Units Sold</th>
                    <th>Revenue</th>
                  </tr>
                </thead>

                <tbody>
                  {topProducts.map((product, index) => (
                    <tr key={index}>
                      <td>{product.name}</td>
                      <td>{product.sold}</td>
                      <td>₹{product.revenue.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>

              </table>
            ) : (
              <div className="no-data-msg text-center p-3">No product data available.</div>
            )}

          </div>
        </>
      )}

    </div>
  );
};

export default Reports;

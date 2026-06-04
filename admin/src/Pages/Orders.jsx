import React, { useEffect, useState } from "react";
import axios from '../utils/axiosConfig';
import { toast } from "react-toastify";

import shiprocketService from '../services/shiprocketService';

import "./Order.css";


const API_URL = process.env.REACT_APP_API_URL;

// Helper: construct absolute image URL
const getImageUrl = (imagePath) => {
  if (!imagePath) return null;
  if (imagePath.startsWith("http")) return imagePath;
  let baseUrl = API_URL.replace(/\/api\/?$/, "");
  if (baseUrl.endsWith("/")) baseUrl = baseUrl.slice(0, -1);
  const cleanPath = imagePath.startsWith("/") ? imagePath : `/${imagePath}`;
  return `${baseUrl}${cleanPath}`;
};

const Orders = () => {

  const [selectedOrder, setSelectedOrder] = useState(null);
  const [orders, setOrders] = useState([]);
  const [previewImage, setPreviewImage] = useState(null);
  const [confirmPushOrderId, setConfirmPushOrderId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [statusUpdatingId, setStatusUpdatingId] = useState(null);
  const [pushLoading, setPushLoading] = useState(false);

  // Date filter state - default to today
  const [filterDate, setFilterDate] = useState(new Date().toISOString().split('T')[0]);

  const token = localStorage.getItem("token");

  // ================= FETCH ORDERS (WITH SILENT MODE FOR AUTO-SYNC) =================
  const fetchOrders = async (isSilent = false) => {
    try {
      if (!isSilent) setInitialLoading(true);
      const res = await axios.get(`${API_URL}/admin/orders`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      setOrders(res.data.orders || []);

      if (isSilent && selectedOrder) {
        const updatedSelectedOrder = res.data.orders.find(o => o.id === selectedOrder.id);
        if (updatedSelectedOrder) setSelectedOrder(updatedSelectedOrder);
      }
    } catch (err) {
      console.error("Fetch orders error:", err);
      if (!isSilent) toast.error("Failed to load orders");
    } finally {
      if (!isSilent) setInitialLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
    const interval = setInterval(() => {
      fetchOrders(true);
    }, 10000);
    return () => clearInterval(interval);
  }, [filterDate]);

  const filteredOrders = orders.filter(order => {
    if (!filterDate) return true;
    const orderDate = new Date(order.created_at).toISOString().split('T')[0];
    return orderDate === filterDate;
  });

  // ================= UPDATE STATUS =================
  const updateOrderStatus = async (id, status) => {
    try {
      setStatusUpdatingId(id);
      setLoading(true);
      await axios.put(
        `${API_URL}/admin/orders/${id}/status`,
        { status },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success("Order status updated successfully");
      fetchOrders(true);
    } catch (err) {
      console.error("Status update error:", err);
      toast.error("Failed to update order status");
    } finally {
      setStatusUpdatingId(null);
      setLoading(false);
    }
  };

  // ================= PUSH TO SHIPROCKET =================
  const executePushToShiprocket = async () => {
    if (!confirmPushOrderId) return;
    try {
      setPushLoading(true);
      setLoading(true);
      const res = await axios.post(`${API_URL}/admin/orders/${confirmPushOrderId}/shiprocket`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success) {
        toast.success("Order successfully pushed to Shiprocket! 🚀");
        fetchOrders(true);
        setConfirmPushOrderId(null);
      }
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || "Failed to push to Shiprocket");
      setConfirmPushOrderId(null);
    } finally {
      setPushLoading(false);
      setLoading(false);
    }
  };

  // ================= SHIPROCKET GENERATORS =================
  const generateAWB = async (orderId) => {
    try {
      setLoading(true);
      const res = await axios.post(`${API_URL}/admin/orders/${orderId}/awb`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success) {
        toast.success("AWB Generated Successfully!");
        fetchOrders(true);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to generate AWB");
    } finally {
      setLoading(false);
    }
  };

  const downloadLabel = async (orderId) => {
    try {
      setLoading(true);
      const res = await axios.post(`${API_URL}/admin/orders/${orderId}/label`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success && res.data.label_url) {
        window.open(res.data.label_url, "_blank");
      } else {
        toast.error("Label URL not available");
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to download label");
    } finally {
      setLoading(false);
    }
  };

  const downloadShiprocketInvoice = async (orderId) => {
    try {
      setLoading(true);
      const res = await axios.post(`${API_URL}/admin/orders/${orderId}/invoice`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success && res.data.invoice_url) {
        window.open(res.data.invoice_url, "_blank");
      } else {
        toast.error("Invoice URL not available");
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to download Shiprocket invoice");
    } finally {
      setLoading(false);
    }
  };

  // Helper function to escape HTML to prevent XSS
  const escapeHtml = (text) => {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  };

  // Add this function to your Orders component
  const checkCourierAvailability = async (order) => {
    const pinMatch = order.address?.match(/\b\d{6}\b/);
    const pincode = pinMatch ? pinMatch[0] : null;

    if (!pincode) {
      toast.warning("No pincode found in address");
      return;
    }

    try {
      const totalWeight = order.items?.reduce((sum, item) => {
        const itemWeight = parseFloat(item.weight) || 0.5;
        return sum + (itemWeight * item.quantity);
      }, 0) || 0.5;

      const result = await shiprocketService.getCourierRecommendation(
        pincode,
        order.total_amount,
        order.payment_method === 'COD',
        totalWeight
      );

      if (result.serviceable && result.recommended_courier) {
        toast.success(`Recommended: ${result.recommended_courier.courier_name} - ₹${result.recommended_courier.rate} (Est. ${Math.ceil(result.recommended_courier.etd_hours / 24)} days)`);
      } else {
        toast.warning(result.message || "No courier available for this pincode");
      }
    } catch (error) {
      toast.error("Failed to check courier availability");
    }
  };

  // ================= PRINT LOCAL INVOICE (FIXED VERSION WITH BANNER) =================
  // ================= PRINT LOCAL INVOICE (FIXED VERSION WITH BANNER) =================
  const handlePrint = (order) => {
    const printWindow = window.open("", "_blank", "width=800,height=900");

    const totalAmount = parseFloat(order.total_amount) || 0;
    const discount = parseFloat(order.discount) || 0;
    const subtotal = totalAmount + discount;

    // Use the correct URL for logo from public folder
    // Since the logo is in public folder, it's served from the root of your React app
    const bannerUrl = `${window.location.origin}/jayastra_banner.png`;

    // Also create a fallback data URL in case the image fails to load
    const fallbackLogo = `
    <svg width="200" height="50" viewBox="0 0 200 50" xmlns="http://www.w3.org/2000/svg">
      <text x="0" y="35" font-family="Arial, sans-serif" font-size="28" font-weight="bold" fill="#8E2139">JAYASTRA</text>
    </svg>
  `;

    const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Invoice - ORD${order.id}</title>
        <meta charset="utf-8">
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          body { 
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
            padding: 40px; 
            color: #1e293b; 
            line-height: 1.5; 
            background: #f8fafc;
          }
          .invoice-box { 
            max-width: 900px; 
            margin: 0 auto; 
            background: white;
            border-radius: 16px;
            box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.05), 0 10px 10px -5px rgba(0, 0, 0, 0.01);
            overflow: hidden;
          }
          .invoice-inner {
            padding: 40px;
          }
          .header { 
            display: flex; 
            justify-content: space-between; 
            align-items: flex-start;
            border-bottom: 2px solid #e2e8f0; 
            padding-bottom: 24px; 
            margin-bottom: 32px; 
          }
          .logo { 
            display: flex;
            flex-direction: column;
          }
          .logo-img { 
            max-height: 60px; 
            width: auto;
            object-fit: contain;
            margin-bottom: 8px;
          }
          .logo-text {
            font-size: 28px;
            font-weight: 800;
            color: #8E2139;
            letter-spacing: -0.5px;
          }
          .logo p {
            color: #64748b;
            font-size: 12px;
            margin-top: 4px;
          }
          .title h2 { 
            font-size: 20px; 
            color: #475569; 
            font-weight: 500;
            margin: 0;
          }
          .title p {
            font-size: 12px;
            color: #94a3b8;
            margin-top: 4px;
            text-align: right;
          }
          .meta { 
            display: grid; 
            grid-template-columns: 1fr 1fr; 
            gap: 40px; 
            margin-bottom: 40px; 
            padding: 20px;
            border-radius: 12px;
          }
          .meta h5 { 
            margin: 0 0 12px 0; 
            color: #64748b; 
            text-transform: uppercase; 
            font-size: 11px; 
            letter-spacing: 0.5px;
            font-weight: 600;
          }
          .meta p { 
            margin: 6px 0; 
            font-size: 14px; 
          }
          .meta strong {
            color: #1e293b;
          }
          table { 
            width: 100%; 
            border-collapse: collapse; 
            margin-bottom: 40px; 
          }
          th { 
            background: #f1f5f9; 
            text-align: left; 
            padding: 14px 12px; 
            border-bottom: 2px solid #e2e8f0; 
            font-size: 12px; 
            text-transform: uppercase; 
            letter-spacing: 0.5px;
            font-weight: 600;
            color: #475569;
          }
          td { 
            padding: 14px 12px; 
            border-bottom: 1px solid #e2e8f0; 
            font-size: 14px; 
          }
          .totals { 
            margin-left: auto; 
            width: 300px; 
            margin-top: 20px;
          }
          .total-row { 
            display: flex; 
            justify-content: space-between; 
            padding: 8px 0; 
            font-size: 14px;
          }
          .total-row.grand { 
            border-top: 2px solid #e2e8f0; 
            margin-top: 8px; 
            padding-top: 12px; 
            font-weight: 700; 
            font-size: 18px; 
            color: #8E2139;
          }
          .footer { 
            text-align: center; 
            margin-top: 40px; 
            padding-top: 24px;
            font-size: 11px; 
            color: #94a3b8; 
            border-top: 1px solid #e2e8f0; 
          }
          .thank-you {
            text-align: center;
            margin-top: 24px;
            padding: 16px;
            background: #fef2f2;
            border-radius: 8px;
            color: #8E2139;
            font-weight: 500;
          }
          @media print {
            body {
              background: white;
              padding: 0;
            }
            .invoice-box {
              box-shadow: none;
              border-radius: 0;
            }
            .meta {
              background: none;
              border: 1px solid #e2e8f0;
            }
          }
        </style>
      </head>
      <body>
        <div class="invoice-box">
          <div class="invoice-inner">
            <div class="header">
              <div class="logo">
                <img 
                  src="${bannerUrl}" 
                  alt="JAYASTRA" 
                  class="logo-img"
                  onerror="this.style.display='none'; this.nextElementSibling.style.display='block';"
                />
                <div class="logo-text" style="display: none;">JAYASTRA</div>
                <p>Premium Products | Since 2026</p>
              </div>
              <div class="title">
                <h2>TAX INVOICE</h2>
                <p>GSTIN: 29ABCDE1234F1Z5</p>
              </div>
            </div>

            <div class="meta">
              <div>
                <h5>BILLED TO:</h5>
                <p><strong>${escapeHtml(order.customer_name)}</strong></p>
                <p>${escapeHtml(order.address)}</p>
                <p>📞 ${order.phone || 'N/A'}</p>
                <p>✉️ ${order.email || 'N/A'}</p>
              </div>
              <div>
                <h5>ORDER DETAILS:</h5>
                <p><strong>Order ID:</strong> #ORD${order.id}</p>
                <p><strong>Order Date:</strong> ${new Date(order.created_at).toLocaleDateString('en-IN')}</p>
                <p><strong>Payment Method:</strong> ${order.payment_method || 'COD'}</p>
                <p><strong>Order Status:</strong> ${order.order_status || 'Placed'}</p>
              </div>
            </div>

            <table>
              <thead>
                <tr>
                  <th>SL No.</th>
                  <th>Product ID</th>
                  <th>Item Description</th>
                  <th>Price (₹)</th>
                  <th>Qty</th>
                  <th>Total (₹)</th>
                </tr>
              </thead>
              <tbody>
                ${order.items && order.items.map((item, index) => {
      const price = parseFloat(item.price) || 0;
      const quantity = parseInt(item.quantity) || 0;
      const itemTotal = price * quantity;
      return `
                    <tr>
                      <td>${index + 1}</td>
                      <td>${escapeHtml(item.product_code || 'N/A')}</td>
                      <td>${escapeHtml(item.name)}</td>
                      <td>₹${price.toFixed(2)}</td>
                      <td>${quantity}</td>
                      <td>₹${itemTotal.toFixed(2)}</td>
                    </tr>
                  `;
    }).join('')}
              </tbody>
            </table>

            <div class="totals">
              <div class="total-row">
                <span>Subtotal:</span>
                <span>₹${subtotal.toFixed(2)}</span>
              </div>
              ${discount > 0 ? `
                <div class="total-row">
                  <span>Discount:</span>
                  <span>- ₹${discount.toFixed(2)}</span>
                </div>
              ` : ''}
              <div class="total-row grand">
                <span>Grand Total:</span>
                <span>₹${totalAmount.toFixed(2)}</span>
              </div>
            </div>

            ${order.payment_method === 'COD' ? `
              <div class="thank-you">
                💰 Cash on Delivery - Pay ₹${totalAmount.toFixed(2)} at the time of delivery
              </div>
            ` : `
              <div class="thank-you">
                ✅ Payment Successful via ${order.payment_method}
              </div>
            `}

            <div class="footer">
              <p>Thank you for shopping with JAYASTRA!</p>
              <p>This is a computer generated invoice and does not require a physical signature.</p>
              <p>For any queries, contact us at jayastrastore@gmail.com | 📞 +91 9652896180</p>
            </div>
          </div>
        </div>
        <script>
          window.onload = function() { 
            window.print(); 
            window.onafterprint = function() { 
              window.close(); 
            }; 
          };
        </script>
      </body>
    </html>
  `;

    printWindow.document.write(html);
    printWindow.document.close();
  };

  return (
    <div className="orders-container">
      {loading && (
        <div className="dash-loader-overlay">
          <div className="dash-loader-container">
            <div className="dash-spinner"></div>
          </div>
        </div>
      )}

      <div className="orders-header-flex">
        <h4>Orders Management</h4>

        <div className="orders-filter-area">
          <div className="date-filter-group">
            <span className="filter-label">Filter by Date:</span>
            <input
              type="date"
              className="admin-date-input"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              disabled={initialLoading}
            />
            {filterDate && (
              <button className="clear-filter-btn" onClick={() => setFilterDate("")} disabled={initialLoading}>
                <i className="bi bi-x-square-fill"></i>
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="orders-table">
        <table>
          <thead>
            <tr>
              <th>Order ID</th>
              <th>Date</th>
              <th>Customer</th>
              <th>Products</th>
              <th>P.Code</th>
              <th>Total Amount</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>

          <tbody>
            {initialLoading ? (
              <tr>
                <td colSpan="8" style={{ textAlign: 'center', padding: '40px' }}>
                  <div className="cate-loader-overlay" style={{ position: 'relative', height: '100px' }}>
                    <div className="cate-loader-container">
                      <div className="cate-spinner"></div>
                    </div>
                  </div>
                </td>
              </tr>
            ) : filteredOrders.length === 0 ? (
              <tr>
                <td colSpan="8" style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                  <i className="bi bi-inbox" style={{ fontSize: '2rem', display: 'block', marginBottom: '10px' }}></i>
                  No orders found for {filterDate ? new Date(filterDate).toLocaleDateString() : "the selected period"}
                </td>
              </tr>
            ) : (
              filteredOrders.map(order => (
                <tr key={order.id}>
                  <td>ORD{order.id}</td>
                  <td>{new Date(order.created_at).toLocaleDateString()}</td>
                  <td>
                    <div className="cust-info">
                      <strong>{order.customer_name}</strong>
                      <span>{order.phone}</span>
                    </div>
                  </td>
                  <td>
                    <div className="order-thumbs">
                      {order.items && order.items.slice(0, 3).map((item, i) => (
                        <img
                          key={i}
                          src={getImageUrl(item.image) || "/assets/placeholder-product.jpg"}
                          alt={item.name}
                          title={item.name}
                          onClick={() => setPreviewImage(getImageUrl(item.image) || "/assets/placeholder-product.jpg")}
                          className="clickable-thumb"
                          onError={(e) => { e.target.src = "/assets/placeholder-product.jpg"; }}
                        />
                      ))}
                      {order.items && order.items.length > 3 && (
                        <span className="more-count">+{order.items.length - 3}</span>
                      )}
                    </div>
                  </td>
                  <td>
                    <div className="pid-column">
                      {order.items && order.items.map((item, i) => (
                        <span key={i} className="pid-badge">{item.product_code || "N/A"}{i < order.items.length - 1 ? "," : ""} </span>
                      ))}
                    </div>
                  </td>
                  <td>₹{parseFloat(order.total_amount).toFixed(2)}</td>
                  <td>
                    <select
                      value={order.order_status}
                      onChange={(e) => updateOrderStatus(order.id, e.target.value)}
                      className={`status-dropdown-admin ${order.order_status?.toLowerCase().replace(/\s+/g, '-') || ''}`}
                      disabled={statusUpdatingId === order.id}
                    >
                      <option>Placed</option>
                      <option>Processing</option>
                      <option>Shipped</option>
                      <option>Out for Delivery</option>
                      <option>Delivered</option>
                      <option>Returned</option>
                      <option>Cancelled</option>
                    </select>
                    {statusUpdatingId === order.id && (
                      <div className="status-updating-spinner">
                        <div className="inline-spinner"></div>
                      </div>
                    )}
                  </td>
                  <td>
                    <button
                      className="view-btn-admin"
                      onClick={() => setSelectedOrder(order)}
                      disabled={loading}
                    >
                      Details
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* ================= MODAL ================= */}
      {selectedOrder && (
        <div className="order-modal-overlay">
          <div className="order-modal-card">

            <div className="modal-header-admin">
              <h4>Order Details #ORD{selectedOrder.id}</h4>
              <button className="close-modal-btn" onClick={() => setSelectedOrder(null)}>✕</button>
            </div>

            <div className="modal-body-admin">
              <div className="modal-grid">
                <div className="cust-details-box">
                  <h5>Customer Information</h5>
                  <p><strong>Name:</strong> {selectedOrder.customer_name}</p>
                  <p><strong>Phone:</strong> {selectedOrder.phone}</p>
                  <p><strong>Email:</strong> {selectedOrder.email || 'N/A'}</p>
                  <p><strong>Address:</strong> {selectedOrder.address}</p>
                </div>
                <div className="order-summary-box">
                  <h5>Order Summary</h5>
                  <p><strong>Method:</strong> {selectedOrder.payment_method}</p>
                  <p><strong>Status:</strong> {selectedOrder.order_status}</p>
                  <p><strong>Total:</strong> ₹{parseFloat(selectedOrder.total_amount).toFixed(2)}</p>
                  <p><strong>Discount:</strong> ₹{parseFloat(selectedOrder.discount || 0).toFixed(2)}</p>
                  {selectedOrder.awb_code && (
                    <p><strong>AWB:</strong> {selectedOrder.awb_code}</p>
                  )}
                  {selectedOrder.shiprocket_order_id && (
                    <p><strong>SR Order ID:</strong> {selectedOrder.shiprocket_order_id}</p>
                  )}
                </div>
              </div>

              <div className="items-list-admin">
                <h5>Order Items ({selectedOrder.items?.length || 0})</h5>
                {selectedOrder.items && selectedOrder.items.map((item, idx) => {
                  const price = parseFloat(item.price) || 0;
                  const quantity = parseInt(item.quantity) || 0;
                  return (
                    <div key={idx} className="admin-item-row">
                      <img
                        src={getImageUrl(item.image) || "/assets/placeholder-product.jpg"}
                        alt={item.name}
                        onClick={() => setPreviewImage(getImageUrl(item.image) || "/assets/placeholder-product.jpg")}
                        className="clickable-img"
                        onError={(e) => { e.target.src = "/assets/placeholder-product.jpg"; }}
                      />
                      <div className="admin-item-info">
                        <h6>{item.name} <span className="item-pid-small">({item.product_code || "No ID"})</span></h6>
                        <p>Price: ₹{price.toFixed(2)} | Qty: {quantity}</p>
                      </div>
                      <div className="admin-item-total">
                        ₹{(price * quantity).toFixed(2)}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="modal-footer-admin">
              <button
                className="invoice-btn-admin check-courier-btn"
                onClick={() => checkCourierAvailability(selectedOrder)}
                disabled={loading}
                style={{ background: '#10b981', color: 'white' }}
              >
                <i className="bi bi-search"></i> Check Courier
              </button>
              <button
                className="invoice-btn-admin push-btn"
                onClick={() => setConfirmPushOrderId(selectedOrder.id)}
                disabled={selectedOrder.shiprocket_order_id || pushLoading}
              >
                {pushLoading && confirmPushOrderId === selectedOrder.id ? (
                  <>
                    <div className="btn-spinner"></div>
                    Pushing...
                  </>
                ) : (
                  <>
                    <i className="bi bi-box-seam"></i>
                    {selectedOrder.shiprocket_order_id ? "Pushed to Shiprocket" : "Push to Shiprocket"}
                  </>
                )}
              </button>

              {selectedOrder.shiprocket_order_id && !selectedOrder.awb_code && (
                <button
                  className="invoice-btn-admin generate-awb-btn"
                  onClick={() => generateAWB(selectedOrder.id)}
                  disabled={loading}
                >
                  <i className="bi bi-upc-scan"></i> Generate AWB
                </button>
              )}

              {selectedOrder.awb_code && (
                <button
                  className="invoice-btn-admin label-btn"
                  onClick={() => downloadLabel(selectedOrder.id)}
                  disabled={loading}
                >
                  <i className="bi bi-tag-fill"></i> Label (AWB: {selectedOrder.awb_code})
                </button>
              )}

              {selectedOrder.awb_code && (
                <button
                  className="invoice-btn-admin shiprocket-invoice-btn"
                  onClick={() => downloadShiprocketInvoice(selectedOrder.id)}
                  disabled={loading}
                >
                  <i className="bi bi-receipt"></i> SR Invoice
                </button>
              )}

              <button
                className="invoice-btn-admin local-invoice-btn"
                onClick={() => handlePrint(selectedOrder)}
                disabled={loading}
              >
                <i className="bi bi-printer"></i> Local Invoice
              </button>


            </div>

          </div>
        </div>
      )}

      {previewImage && (
        <div className="admin-lightbox-overlay" onClick={() => setPreviewImage(null)}>
          <div className="lightbox-content">
            <img
              src={previewImage}
              alt="Product Preview"
              onClick={(e) => e.stopPropagation()}
              onError={(e) => e.target.src = "/assets/placeholder-product.jpg"}
            />
            <button className="close-lightbox" onClick={() => setPreviewImage(null)}>✕</button>
          </div>
        </div>
      )}

      {confirmPushOrderId && (
        <div className="custom-confirm-overlay" onClick={() => setConfirmPushOrderId(null)}>
          <div className="custom-confirm-box" onClick={(e) => e.stopPropagation()}>
            <div className="confirm-icon">🚀</div>
            <h5>Push to Logistics</h5>
            <p>Are you sure you want to push Order #ORD{confirmPushOrderId} to Shiprocket? A shipment will be initiated.</p>
            <div className="confirm-actions">
              <button className="confirm-cancel-btn" onClick={() => setConfirmPushOrderId(null)} disabled={pushLoading}>Cancel</button>
              <button className="confirm-execute-btn" onClick={executePushToShiprocket} disabled={pushLoading}>
                {pushLoading ? "Pushing..." : "Yes, Push Now"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Orders;
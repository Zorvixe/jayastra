import React, { useEffect, useState } from "react";
import axios from '../utils/axiosConfig'; // Adjust path as needed
import { toast } from "react-toastify";
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
      
      // If a modal is open, silently update its data too so the modal shows the live status
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
    fetchOrders(); // Initial loud load with spinner

    // 🚀 AUTO-SYNC: Silently fetch orders every 10 seconds to catch Shiprocket webhook updates
    const interval = setInterval(() => {
      fetchOrders(true); // 'true' means silent load (no spinner)
    }, 10000);

    return () => clearInterval(interval);
    // eslint-disable-next-line
  }, [filterDate]); // Re-bind if date filter changes

  // Filter orders based on date
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
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );
      toast.success("Order status updated successfully");
      fetchOrders(true); // Silent refresh
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
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to download Shiprocket invoice");
    } finally {
      setLoading(false);
    }
  };

  // ================= PRINT INVOICE =================
  const handlePrint = (order) => {
    const printWindow = window.open("", "_blank", "width=800,height=900");

    const html = `
      <html>
        <head>
          <title>Invoice - ${order.id}</title>
          <style>
            body { font-family: 'Inter', sans-serif; padding: 40px; color: #333; line-height: 1.6; }
            .invoice-box { max-width: 800px; margin: auto; }
            .header { display: flex; justify-content: space-between; border-bottom: 2px solid #eee; padding-bottom: 20px; margin-bottom: 30px; }
            .logo { font-size: 28px; font-weight: bold; color: #111; }
            .title { font-size: 20px; color: #666; text-transform: uppercase; }
            .meta { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-bottom: 40px; }
            .meta h5 { margin: 0 0 10px 0; color: #888; text-transform: uppercase; font-size: 12px; }
            .meta p { margin: 2px 0; font-size: 14px; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 40px; }
            th { background: #f9f9f9; text-align: left; padding: 12px; border-bottom: 2px solid #eee; font-size: 13px; text-transform: uppercase; }
            td { padding: 12px; border-bottom: 1px solid #eee; font-size: 14px; }
            .totals { margin-left: auto; width: 250px; }
            .total-row { display: flex; justify-content: space-between; padding: 5px 0; }
            .total-row.grand { border-top: 2px solid #eee; margin-top: 10px; padding-top: 10px; font-weight: bold; font-size: 18px; color: #000; }
            .footer { text-align: center; margin-top: 60px; font-size: 12px; color: #999; border-top: 1px solid #eee; padding-top: 20px; }
            @media print { .no-print { display: none; } }
          </style>
        </head>
        <body>
          <div class="invoice-box">
            <div class="header">
              <div class="logo">JAYASTRA</div>
              <div class="title">Tax Invoice</div>
            </div>

            <div class="meta">
              <div>
                <h5>Billed To:</h5>
                <p><strong>${order.customer_name}</strong></p>
                <p>${order.address}</p>
                <p>Phone: ${order.phone}</p>
                <p>Email: ${order.email}</p>
              </div>
              <div>
                <h5>Order Details:</h5>
                <p>Order ID: #ORD${order.id}</p>
                <p>Order Date: ${new Date(order.created_at).toLocaleDateString()}</p>
                <p>Payment Method: ${order.payment_method}</p>
                <p>Status: ${order.order_status}</p>
              </div>
            </div>

            <table>
              <thead>
                <tr>
                  <th>Product ID</th>
                  <th>Item Description</th>
                  <th>Price</th>
                  <th>Qty</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                ${order.items.map(item => `
                  <tr>
                    <td>${item.product_code || 'N/A'}</td>
                    <td>${item.name}</td>
                    <td>₹${item.price}</td>
                    <td>${item.quantity}</td>
                    <td>₹${item.price * item.quantity}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>

            <div class="totals">
              <div class="total-row"><span>Subtotal:</span> <span>₹${order.total_amount + (order.discount || 0)}</span></div>
              <div class="total-row"><span>Discount:</span> <span>-₹${order.discount || 0}</span></div>
              <div class="total-row grand"><span>Total:</span> <span>₹${order.total_amount}</span></div>
            </div>

            <div class="footer">
              <p>Thank you for shopping with JAYASTRA!</p>
              <p>This is a computer generated invoice and does not require a physical signature.</p>
            </div>
          </div>
          <script>
            window.onload = function() { window.print(); window.onafterprint = function() { window.close(); }; };
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
              <div className="cate-loader-overlay">
                <div className="cate-loader-container">
                  <div className="cate-spinner"></div>
                </div>
              </div>
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
                  <td>₹{order.total_amount}</td>

                  <td>
                    <select
                      value={order.order_status}
                      onChange={(e) => updateOrderStatus(order.id, e.target.value)}
                      className={`status-dropdown-admin ${order.order_status.toLowerCase().replace(/\s+/g, '-')}`}
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
                  <p><strong>Email:</strong> {selectedOrder.email}</p>
                  <p><strong>Address:</strong> {selectedOrder.address}</p>
                </div>
                <div className="order-summary-box">
                  <h5>Order Summary</h5>
                  <p><strong>Method:</strong> {selectedOrder.payment_method}</p>
                  <p><strong>Status:</strong> {selectedOrder.order_status}</p>
                  <p><strong>Total:</strong> ₹{selectedOrder.total_amount}</p>
                  <p><strong>Discount:</strong> ₹{selectedOrder.discount || 0}</p>
                </div>
              </div>

              <div className="items-list-admin">
                <h5>Order Items ({selectedOrder.items?.length})</h5>
                {selectedOrder.items && selectedOrder.items.map((item, idx) => (
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
                      <p>Price: ₹{item.price} | Qty: {item.quantity}</p>
                    </div>
                    <div className="admin-item-total">
                      ₹{item.price * item.quantity}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="modal-footer-admin">
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
                <button className="invoice-btn-admin" onClick={() => generateAWB(selectedOrder.id)} style={{ background: '#eab308', color: 'white', border: 'none' }} disabled={loading}>
                  <i className="bi bi-upc-scan"></i> Generate AWB
                </button>
              )}

              {selectedOrder.awb_code && (
                <>
                  <button className="invoice-btn-admin" onClick={() => downloadLabel(selectedOrder.id)} style={{ background: '#16a34a', color: 'white', border: 'none' }} disabled={loading}>
                    <i className="bi bi-tag-fill"></i> Label (AWB: {selectedOrder.awb_code})
                  </button>
                  <button className="invoice-btn-admin" onClick={() => downloadShiprocketInvoice(selectedOrder.id)} style={{ background: '#2563eb', color: 'white', border: 'none' }} disabled={loading}>
                    <i className="bi bi-receipt"></i> SR Invoice
                  </button>
                </>
              )}

              <button className="invoice-btn-admin" onClick={() => handlePrint(selectedOrder)} disabled={loading}>
                <i className="bi bi-printer"></i> Local Invoice
              </button>
            </div>

          </div>
        </div>
      )}

      {previewImage && (
        <div className="admin-lightbox-overlay" onClick={() => setPreviewImage(null)}>
          <div className="lightbox-content">
            <img src={previewImage} alt="Product Preview" onClick={(e) => e.stopPropagation()} onError={(e) => e.target.src = "/assets/placeholder-product.jpg"} />
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
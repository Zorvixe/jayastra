import React, { useState } from "react";
import "./Inventory.css";

const Inventory = () => {

  const [products, setProducts] = useState([
    {
      id: 1,
      name: "Premium Tent",
      sku: "TENT-001",
      stock: 25,
      lowStockLimit: 5
    },
    {
      id: 2,
      name: "Wedding Pavilion",
      sku: "TENT-002",
      stock: 4,
      lowStockLimit: 5
    },
    {
      id: 3,
      name: "Luxury Safari Tent",
      sku: "TENT-003",
      stock: 0,
      lowStockLimit: 5
    }
  ]);

  const [history, setHistory] = useState([]);

  const [adjustData, setAdjustData] = useState({
    productId: null,
    quantity: "",
    reason: ""
  });

  // 📌 Determine Stock Status
  const getStatus = (product) => {
    if (product.stock === 0) return "out";
    if (product.stock <= product.lowStockLimit) return "low";
    return "in";
  };

  // 📌 Handle Adjustment
  const handleAdjust = () => {
    if (!adjustData.quantity) return;

    const qty = parseInt(adjustData.quantity);

    const updatedProducts = products.map(p => {
      if (p.id === adjustData.productId) {
        const newStock = Math.max(0, p.stock + qty);

        // Save History
        setHistory(prev => [
          {
            id: Date.now(),
            product: p.name,
            change: qty,
            reason: adjustData.reason,
            date: new Date().toLocaleString()
          },
          ...prev
        ]);

        return { ...p, stock: newStock };
      }
      return p;
    });

    setProducts(updatedProducts);

    setAdjustData({
      productId: null,
      quantity: "",
      reason: ""
    });
  };

  return (
    <div className="inventory-container">

      <h4>Inventory Management</h4>

      {/* ================= INVENTORY TABLE ================= */}
      <div className="inventory-table">
        <table>
          <thead>
            <tr>
              <th>Product</th>
              <th>SKU</th>
              <th>Stock</th>
              <th>Status</th>
              <th>Adjust</th>
            </tr>
          </thead>

          <tbody>
            {products.map(product => {
              const status = getStatus(product);

              return (
                <tr key={product.id}>
                  <td>{product.name}</td>
                  <td>{product.sku}</td>
                  <td>{product.stock}</td>

                  <td>
                    <span className={`stock-badge ${status}`}>
                      {status === "in" && "In Stock"}
                      {status === "low" && "Low Stock"}
                      {status === "out" && "Out of Stock"}
                    </span>
                  </td>

                  <td>
                    <button
                      className="adjust-btn"
                      onClick={() =>
                        setAdjustData({ ...adjustData, productId: product.id })
                      }
                    >
                      <i className="bi bi-pencil-square"></i> Adjust
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ================= ADJUSTMENT PANEL ================= */}
      {adjustData.productId && (
        <div className="adjust-panel">

          <h5>Stock Adjustment</h5>

          <input
            type="number"
            placeholder="Enter + / - quantity"
            value={adjustData.quantity}
            onChange={(e) =>
              setAdjustData({ ...adjustData, quantity: e.target.value })
            }
          />

          <input
            type="text"
            placeholder="Reason (e.g. New Stock / Damage)"
            value={adjustData.reason}
            onChange={(e) =>
              setAdjustData({ ...adjustData, reason: e.target.value })
            }
          />

          <div className="adjust-actions">
            <button className="save-btn" onClick={handleAdjust}>
              <i className="bi bi-check-circle"></i> Save
            </button>

            <button
              className="cancel-btn"
              onClick={() =>
                setAdjustData({ productId: null, quantity: "", reason: "" })
              }
            >
              Cancel
            </button>
          </div>

        </div>
      )}

      {/* ================= HISTORY SECTION ================= */}
      <div className="history-section">

        <h5>Inventory History</h5>

        <table>
          <thead>
            <tr>
              <th>Product</th>
              <th>Change</th>
              <th>Reason</th>
              <th>Date</th>
            </tr>
          </thead>

          <tbody>
            {history.length === 0 ? (
              <tr>
                <td colSpan="4" className="no-data">
                  No history available
                </td>
              </tr>
            ) : (
              history.map(log => (
                <tr key={log.id}>
                  <td>{log.product}</td>
                  <td className={log.change > 0 ? "increase" : "decrease"}>
                    {log.change > 0 ? `+${log.change}` : log.change}
                  </td>
                  <td>{log.reason}</td>
                  <td>{log.date}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>

      </div>

    </div>
  );
};

export default Inventory;

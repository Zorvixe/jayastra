// components/admin/Navigation.jsx
import React, { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd";
import "./Navigation.css";

const API_URL = process.env.REACT_APP_API_URL;

const Navigation = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const token = localStorage.getItem("token");

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");

      if (!token) {
        toast.error("Please login to manage navigation");
        setLoading(false);
        return;
      }

      const res = await axios.get(`${API_URL}/admin/navbar/categories`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (res.data.success) {
        setCategories(res.data.categories);
      } else {
        toast.error(res.data.message || "Failed to load categories");
      }
    } catch (err) {
      console.error("Fetch categories error:", err);
      if (err.response?.status === 401) {
        toast.error("Session expired. Please login again.");
        // Optionally redirect to login
      } else if (err.response?.status === 403) {
        toast.error("You don't have permission to manage navigation");
      } else {
        toast.error(err.response?.data?.message || "Failed to load categories");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDragEnd = (result) => {
    if (!result.destination) return;

    const items = Array.from(categories);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    // Update nav_order for all items
    const updatedItems = items.map((item, index) => ({
      ...item,
      nav_order: index
    }));

    setCategories(updatedItems);
  };

  const handleSaveOrder = async () => {
    try {
      setSaving(true);
      const orderData = categories.map((cat, index) => ({
        id: cat.id,
        nav_order: index
      }));

      await axios.put(`${API_URL}/admin/navbar/categories/reorder`,
        { categories: orderData },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      toast.success("Navbar order saved successfully!");
    } catch (err) {
      toast.error("Failed to save order");
    } finally {
      setSaving(false);
    }
  };

  const toggleVisibility = async (id, currentStatus) => {
    try {
      const res = await axios.put(
        `${API_URL}/admin/navbar/categories/${id}/visibility`,
        { show_in_navbar: !currentStatus },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setCategories(categories.map(cat =>
        cat.id === id ? { ...cat, show_in_navbar: !currentStatus } : cat
      ));

      toast.success(`Category ${!currentStatus ? "shown" : "hidden"} in navbar`);
    } catch (err) {
      toast.error("Failed to update visibility");
    }
  };

  const handleBulkVisibility = async (show) => {
    const visibleCategories = categories.filter(cat => cat.show_in_navbar === !show);
    if (visibleCategories.length === 0) {
      toast.warning("No categories to update");
      return;
    }

    try {
      const categoryIds = visibleCategories.map(cat => cat.id);
      await axios.post(
        `${API_URL}/admin/navbar/categories/bulk-visibility`,
        { categoryIds, show_in_navbar: show },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setCategories(categories.map(cat =>
        categoryIds.includes(cat.id) ? { ...cat, show_in_navbar: show } : cat
      ));

      toast.success(`${visibleCategories.length} categories ${show ? "shown" : "hidden"} in navbar`);
    } catch (err) {
      toast.error("Bulk update failed");
    }
  };

  if (loading) {
    return <div className="navbar-manager-loading">Loading categories...</div>;
  }

  const visibleCount = categories.filter(c => c.show_in_navbar).length;
  const hiddenCount = categories.filter(c => !c.show_in_navbar).length;

  return (
    <div className="navbar-category-manager">
      <div className="manager-header">
        <div>
          <h2>Navigation Menu Manager</h2>
          <p className="subtitle">Control which categories appear in your navbar and their order</p>
        </div>
        <div className="header-stats">
          <span className="stat-badge visible">Visible: {visibleCount}</span>
          <span className="stat-badge hidden">Hidden: {hiddenCount}</span>
        </div>
      </div>

      <div className="bulk-actions">
        <button onClick={() => handleBulkVisibility(true)} className="bulk-show-btn">
          <i className="bi bi-eye"></i> Show All
        </button>
        <button onClick={() => handleBulkVisibility(false)} className="bulk-hide-btn">
          <i className="bi bi-eye-slash"></i> Hide All
        </button>
        <button onClick={handleSaveOrder} className="save-order-btn" disabled={saving}>
          {saving ? <i className="bi bi-hourglass-split"></i> : <i className="bi bi-check-lg"></i>}
          {saving ? "Saving..." : "Save Order"}
        </button>
      </div>

      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="categories">
          {(provided) => (
            <div
              {...provided.droppableProps}
              ref={provided.innerRef}
              className="categories-list"
            >
              {categories.map((category, index) => (
                <Draggable key={category.id} draggableId={String(category.id)} index={index}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      className={`category-item ${snapshot.isDragging ? "dragging" : ""} ${!category.show_in_navbar ? "hidden" : ""}`}
                    >
                      <div className="drag-handle" {...provided.dragHandleProps}>
                        <i className="bi bi-grip-vertical"></i>
                      </div>
                      <div className="category-info">
                        <div className="category-name">{category.name}</div>
                        <div className="category-slug">/{category.slug || category.name.toLowerCase().replace(/\s+/g, '-')}</div>
                      </div>
                      <div className="category-actions">
                        <button
                          onClick={() => toggleVisibility(category.id, category.show_in_navbar)}
                          className={`visibility-toggle ${category.show_in_navbar ? "visible" : "hidden"}`}
                          title={category.show_in_navbar ? "Hide from navbar" : "Show in navbar"}
                        >
                          <i className={`bi bi-eye${category.show_in_navbar ? "" : "-slash"}`}></i>
                        </button>
                        <div className="order-number">#{index + 1}</div>
                      </div>
                    </div>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>

      <div className="manager-footer">
        <div className="preview-section">
          <h4>Live Preview:</h4>
          <div className="navbar-preview">
            {categories.filter(c => c.show_in_navbar).slice(0, 8).map((cat, idx) => (
              <span key={cat.id} className="preview-item">
                {cat.name}
                {idx < categories.filter(c => c.show_in_navbar).slice(0, 8).length - 1 && " • "}
              </span>
            ))}
            {categories.filter(c => c.show_in_navbar).length > 8 && (
              <span className="preview-more">+{categories.filter(c => c.show_in_navbar).length - 8} more</span>
            )}
          </div>
        </div>
        <div className="help-text">
          <i className="bi bi-info-circle"></i>
          Drag and drop to reorder categories. Only visible categories will appear in the navbar.
        </div>
      </div>
    </div>
  );
};

export default Navigation;
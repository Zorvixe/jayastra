import React, { useState, useEffect } from "react";
import axios from '../utils/axiosConfig'; // Adjust path as needed
import { toast } from "react-toastify";
import "./Navigation.css";

const API_URL = process.env.REACT_APP_API_URL;

const Navigation = () => {
  const token = localStorage.getItem("token");
  const [menus, setMenus] = useState([]);
  const [selectedMenu, setSelectedMenu] = useState(null);
  const [menuItems, setMenuItems] = useState([]);
  const [loading, setLoading] = useState(false);

  // Form states
  const [newMenu, setNewMenu] = useState({ name: "", slug: "" });
  const [newItem, setNewItem] = useState({ title: "", link: "", position: 0 });
  const [editingItem, setEditingItem] = useState(null);

  useEffect(() => {
    fetchMenus();
  }, []);

  useEffect(() => {
    if (selectedMenu) {
      fetchMenuItems(selectedMenu.id);
    }
  }, [selectedMenu]);

  const fetchMenus = async () => {
    try {
      const res = await axios.get(`${API_URL}/admin/menus`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMenus(res.data.menus);
      if (res.data.menus.length > 0 && !selectedMenu) {
        setSelectedMenu(res.data.menus[0]);
      }
    } catch (err) {
      toast.error("Failed to load menus");
    }
  };

  const fetchMenuItems = async (menuId) => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_URL}/admin/menus/${menuId}/items`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMenuItems(res.data.items);
    } catch (err) {
      toast.error("Failed to load menu items");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateMenu = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post(`${API_URL}/admin/menus`, newMenu, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success("Menu created successfully");
      setNewMenu({ name: "", slug: "" });
      fetchMenus();
    } catch (err) {
      toast.error("Failed to create menu");
    }
  };

  const handleDeleteMenu = async (id) => {
    if (!window.confirm("Are you sure? This will delete all items in this menu.")) return;
    try {
      await axios.delete(`${API_URL}/admin/menus/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success("Menu deleted");
      if (selectedMenu?.id === id) setSelectedMenu(null);
      fetchMenus();
    } catch (err) {
      toast.error("Failed to delete menu");
    }
  };

  const handleAddItem = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API_URL}/admin/menus/${selectedMenu.id}/items`, newItem, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success("Item added");
      setNewItem({ title: "", link: "", position: menuItems.length + 1 });
      fetchMenuItems(selectedMenu.id);
    } catch (err) {
      toast.error("Failed to add item");
    }
  };

  const handleUpdateItem = async (e) => {
    e.preventDefault();
    try {
      await axios.put(`${API_URL}/admin/menu-items/${editingItem.id}`, editingItem, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success("Item updated");
      setEditingItem(null);
      fetchMenuItems(selectedMenu.id);
    } catch (err) {
      toast.error("Update failed");
    }
  };

  const handleDeleteItem = async (id) => {
    try {
      await axios.delete(`${API_URL}/admin/menu-items/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success("Item removed");
      fetchMenuItems(selectedMenu.id);
    } catch (err) {
      toast.error("Delete failed");
    }
  };

  return (
    <div className="navigation-container">
      <div className="navigation-header">
        <h2 className="page-title">Navigation & Menus</h2>
        <p className="subtitle">Manage your website's main, footer, and sidebar links</p>
      </div>

      <div className="navigation-grid">
        {/* LEFT: MENU LIST */}
        <div className="menu-list-card">
          <div className="card-header">
            <h4>Menus</h4>
          </div>
          <div className="menus-stack">
            {menus.map(m => (
              <div 
                key={m.id} 
                className={`menu-pill ${selectedMenu?.id === m.id ? 'active' : ''}`}
                onClick={() => setSelectedMenu(m)}
              >
                <div className="pill-content">
                    <span className="m-name">{m.name}</span>
                    <span className="m-slug">/{m.slug}</span>
                </div>
                <button className="del-m-btn" onClick={(e) => { e.stopPropagation(); handleDeleteMenu(m.id); }}>✕</button>
              </div>
            ))}
          </div>

          <form className="add-menu-form" onSubmit={handleCreateMenu}>
            <h5>Create New Menu</h5>
            <input 
              type="text" 
              placeholder="e.g. Main Menu" 
              value={newMenu.name}
              onChange={(e) => setNewMenu({...newMenu, name: e.target.value})}
              required
            />
            <input 
              type="text" 
              placeholder="e.g. main-menu" 
              value={newMenu.slug}
              onChange={(e) => setNewMenu({...newMenu, slug: e.target.value})}
              required
            />
            <button type="submit" className="confirm-btn">Create</button>
          </form>
        </div>

        {/* RIGHT: MENU ITEMS */}
        <div className="menu-items-card">
          {selectedMenu ? (
            <>
              <div className="card-header items-header">
                <h4>Items in "{selectedMenu.name}"</h4>
                <div className="header-actions">
                    <button className="reorder-btn" onClick={() => fetchMenuItems(selectedMenu.id)}>
                      <i className="bi bi-arrow-repeat"></i> Refresh
                    </button>
                </div>
              </div>

              <div className="items-list">
                {loading ? (
                  <div className="loader">Loading items...</div>
                ) : menuItems.length === 0 ? (
                  <div className="empty-items">No items in this menu yet. Add your first link below!</div>
                ) : (
                  <div className="items-stack">
                    {menuItems.map(item => (
                      <div key={item.id} className="item-row">
                        <div className="item-details">
                          <span className="item-title">{item.title}</span>
                          <code className="item-link">{item.link}</code>
                        </div>
                        <div className="item-actions">
                          <button className="edit-i-btn" onClick={() => setEditingItem(item)}>✏️</button>
                          <button className="del-i-btn" onClick={() => handleDeleteItem(item.id)}>🗑</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* MODAL FOR EDITING */}
              {editingItem && (
                <div className="item-edit-overlay">
                    <div className="edit-modal">
                        <h3>Edit Menu Item</h3>
                        <div className="form-group">
                            <label>Title</label>
                            <input 
                                type="text" 
                                value={editingItem.title} 
                                onChange={(e) => setEditingItem({...editingItem, title: e.target.value})}
                            />
                        </div>
                        <div className="form-group">
                            <label>Link (URL)</label>
                            <input 
                                type="text" 
                                value={editingItem.link} 
                                onChange={(e) => setEditingItem({...editingItem, link: e.target.value})}
                            />
                        </div>
                        <div className="form-group">
                            <label>Position</label>
                            <input 
                                type="number" 
                                value={editingItem.position} 
                                onChange={(e) => setEditingItem({...editingItem, position: parseInt(e.target.value)})}
                            />
                        </div>
                        <div className="modal-actions">
                            <button className="save-m-btn" onClick={handleUpdateItem}>Save Changes</button>
                            <button className="cancel-m-btn" onClick={() => setEditingItem(null)}>Cancel</button>
                        </div>
                    </div>
                </div>
              )}

              <form className="add-item-bar" onSubmit={handleAddItem}>
                <h5>Add Link</h5>
                <div className="bar-row">
                    <input 
                        type="text" 
                        placeholder="Link Title (e.g. All Sarees)" 
                        value={newItem.title}
                        onChange={(e) => setNewItem({...newItem, title: e.target.value})}
                        required
                    />
                    <input 
                        type="text" 
                        placeholder="URL (e.g. /shop/all)" 
                        value={newItem.link}
                        onChange={(e) => setNewItem({...newItem, link: e.target.value})}
                        required
                    />
                    <button type="submit" className="add-btn">+ Add Item</button>
                </div>
              </form>
            </>
          ) : (
            <div className="select-prompt">Please select or create a menu from the left to manage items.</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Navigation;

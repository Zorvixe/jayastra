import React, { useState, useEffect } from "react";
import axios from '../utils/axiosConfig'; // Adjust path as needed
import { toast } from "react-toastify";
import "./Users.css";

const API_URL = process.env.REACT_APP_API_URL;

const Users = () => {
  // Role from localStorage (set during login)
  const userRole = localStorage.getItem("userRole") || "user";
  const token = localStorage.getItem("token");

  // Tab state (only those the user is allowed to see)
  const allowedTabs = [];
  if (userRole === "super_admin") {
    allowedTabs.push("admins", "vendors", "customers");
  } else if (userRole === "admin") {
    allowedTabs.push("admins");   // admin can see admins list (but not create)
    // could also show customers if backend permits
  } else if (userRole === "vendor") {
    allowedTabs.push("customers"); // vendor sees customers
  }
  const [activeTab, setActiveTab] = useState(allowedTabs[0] || "admins");

  const [admins, setAdmins] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [customers, setCustomers] = useState([]);

  const [search, setSearch] = useState("");
  const [selectedUser, setSelectedUser] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [modalRole, setModalRole] = useState("admin");
  const [showPassword, setShowPassword] = useState(false);
  const [newUser, setNewUser] = useState({ name: "", email: "", password: "", phone: "", store_name: "" });

  const [loading, setLoading] = useState(false);          // global (modal & delete)
  const [tabLoading, setTabLoading] = useState(false);    // while fetching list
  const [actionInProgress, setActionInProgress] = useState(null);

  // -------------------- Data fetching --------------------
  const fetchAdmins = async () => {
    try {
      setTabLoading(true);
      const res = await axios.get(`${API_URL}/admin/admins`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAdmins(res.data.users);
    } catch (err) {
      toast.error("Failed to load admin users");
      if (err.response?.status === 403) {
        toast.warn("You don't have permission to view admins");
      }
    } finally {
      setTabLoading(false);
    }
  };

  const fetchVendors = async () => {
    try {
      setTabLoading(true);
      const res = await axios.get(`${API_URL}/admin/vendors`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setVendors(res.data.users);
    } catch (err) {
      toast.error("Failed to load vendors");
      if (err.response?.status === 403) {
        toast.warn("You don't have permission to view vendors");
      }
    } finally {
      setTabLoading(false);
    }
  };

  const fetchCustomers = async () => {
    try {
      setTabLoading(true);
      const endpoint = userRole === "vendor" ? "/vendor/customers" : "/admin/customers";
      const res = await axios.get(`${API_URL}${endpoint}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCustomers(res.data.users);
    } catch (err) {
      toast.error("Failed to load customers");
    } finally {
      setTabLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === "admins") fetchAdmins();
    else if (activeTab === "vendors") fetchVendors();
    else if (activeTab === "customers") fetchCustomers();
  }, [activeTab]);

  // -------------------- Actions (only when allowed) --------------------
  const toggleStatus = async (id) => {
    if (userRole !== "super_admin") {
      toast.warn("Only Super Admin can change user status");
      return;
    }
    try {
      setActionInProgress({ type: 'status', id });
      await axios.put(`${API_URL}/admin/users/status/${id}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success("User status updated");
      await fetchCustomers(); // only customers have status toggle
    } catch (err) {
      toast.error("Status update failed");
    } finally {
      setActionInProgress(null);
    }
  };

  const toggleRole = async (id) => {
    if (userRole !== "super_admin") {
      toast.warn("Only Super Admin can promote customers to admin");
      return;
    }
    try {
      setActionInProgress({ type: 'role', id });
      await axios.put(`${API_URL}/admin/users/role/${id}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success("Role updated");
      await fetchAdmins();
      await fetchCustomers();
    } catch (err) {
      toast.error("Role update failed");
    } finally {
      setActionInProgress(null);
    }
  };

  const deleteUser = async (id, role) => {
    if (userRole !== "super_admin") {
      toast.warn("Only Super Admin can delete users");
      return;
    }
    if (!window.confirm(`Are you sure you want to delete this ${role}?`)) return;
    try {
      setLoading(true);
      await axios.delete(`${API_URL}/admin/admins/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success(`${role} deleted`);
      if (role === 'admin') await fetchAdmins();
      else if (role === 'vendor') await fetchVendors();
    } catch (err) {
      toast.error(err.response?.data?.message || "Delete failed");
    } finally {
      setLoading(false);
    }
  };

  const handleAddUser = async (e) => {
    e.preventDefault();
    if (userRole !== "super_admin") {
      toast.warn("Only Super Admin can create new users");
      return;
    }
    try {
      setLoading(true);
      const payload = {
        ...newUser,
        role: modalRole,
        store_name: modalRole === 'vendor' ? newUser.store_name : undefined,
      };
      const res = await axios.post(`${API_URL}/admin/users/create-admin`, payload, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success) {
        toast.success(`${modalRole === 'admin' ? 'Admin' : 'Vendor'} added successfully`);
        setShowAddModal(false);
        setNewUser({ name: "", email: "", password: "", phone: "", store_name: "" });
        if (modalRole === 'admin') await fetchAdmins();
        else await fetchVendors();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to add user");
    } finally {
      setLoading(false);
    }
  };

  // -------------------- Helpers --------------------
  const getListForTab = () => {
    if (activeTab === "admins") return admins;
    if (activeTab === "vendors") return vendors;
    return customers;
  };

  const filteredList = getListForTab().filter(user => {
    const name = (user.name || '').toLowerCase();
    const email = (user.email || '').toLowerCase();
    const searchTerm = search.toLowerCase();
    return name.includes(searchTerm) || email.includes(searchTerm);
  });

  // -------------------- Render --------------------
  return (
    <div className="users-container">
      {/* Global overlay (modal & delete) */}
      {loading && (
        <div className="dash-loader-overlay">
          <div className="dash-loader-container">
            <div className="dash-spinner"></div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="users-header">
        <h4>User Management</h4>
        <div className="header-actions">
          <div className="search-box">
            <i className="bi bi-search"></i>
            <input
              type="text"
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          {userRole === "super_admin" && (
            <div className="create-buttons">
              <button className="add-admin-btn" onClick={() => { setModalRole('admin'); setShowAddModal(true); }} disabled={loading}>
                <i className="bi bi-person-plus"></i> Add Admin
              </button>
              <button className="add-vendor-btn" onClick={() => { setModalRole('vendor'); setShowAddModal(true); }} disabled={loading}>
                <i className="bi bi-shop"></i> Add Vendor
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Tabs (only allowed ones) */}
      <div className="users-tabs">
        {allowedTabs.includes("admins") && (
          <button
            className={`tab-btn ${activeTab === "admins" ? "active" : ""}`}
            onClick={() => setActiveTab("admins")}
          >
            <i className="bi bi-shield-lock"></i> Admin Users
          </button>
        )}
        {allowedTabs.includes("vendors") && (
          <button
            className={`tab-btn ${activeTab === "vendors" ? "active" : ""}`}
            onClick={() => setActiveTab("vendors")}
          >
            <i className="bi bi-bag-check"></i> Vendors
          </button>
        )}
        {allowedTabs.includes("customers") && (
          <button
            className={`tab-btn ${activeTab === "customers" ? "active" : ""}`}
            onClick={() => setActiveTab("customers")}
          >
            <i className="bi bi-people"></i> Customers
          </button>
        )}
      </div>

      {/* Table */}
      <div className="users-table">
        {tabLoading ? (
          <div className="table-loading-placeholder">
            <div className="dash-spinner"></div>
            <p>Loading {activeTab}...</p>
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Phone</th>
                {activeTab === "customers" && (
                  <>
                    <th>Total Orders</th>
                    <th>Total Purchase</th>
                  </>
                )}
                {activeTab === "vendors" && <th>Store Name</th>}
                <th>Role</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredList.length === 0 ? (
                <tr className="users-empty-row">
                  <td colSpan={
                    activeTab === "customers" ? 8 :
                      activeTab === "vendors" ? 7 : 6
                  }>
                    <div className="users-empty-state">
                      <i className="bi bi-people"></i>
                      <p>No users found</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredList.map(user => (
                  <tr key={user.id}>
                    <td>{user.name}</td>
                    <td>{user.email}</td>
                    <td>{user.phone || "-"}</td>
                    {activeTab === "customers" && (
                      <>
                        <td>{user.total_orders || 0}</td>
                        <td>₹{(user.total_purchase || 0).toLocaleString()}</td>
                      </>
                    )}
                    {activeTab === "vendors" && <td>{user.store_name || "-"}</td>}
                    <td>
                      <span className={`role-badge ${user.role}`}>
                        {user.role}
                      </span>
                    </td>
                    <td>
                      <span className={`status-badge ${user.status === "Active" ? "active" : "blocked"}`}>
                        {user.status}
                      </span>
                    </td>
                    <td className="actions">
                      <button className="view-btn" onClick={() => setSelectedUser(user)} title="View Details">
                        <i className="bi bi-eye"></i>
                      </button>

                      {activeTab !== "customers" && userRole === "super_admin" && (
                        <button
                          className="delete-btn"
                          onClick={() => deleteUser(user.id, activeTab === "admins" ? "admin" : "vendor")}
                          disabled={loading}
                          title="Delete"
                        >
                          <i className="bi bi-trash"></i>
                        </button>
                      )}

                      {activeTab === "customers" && userRole === "super_admin" && (
                        <>
                          <button
                            className="role-btn"
                            onClick={() => toggleRole(user.id)}
                            disabled={actionInProgress?.type === 'role' && actionInProgress?.id === user.id}
                            title="Promote to Admin"
                          >
                            {actionInProgress?.type === 'role' && actionInProgress?.id === user.id ? (
                              <div className="btn-inline-spinner"></div>
                            ) : (
                              <i className="bi bi-shield-plus"></i>
                            )}
                          </button>

                          <button
                            className={user.status === "Active" ? "block-btn" : "unblock-btn"}
                            onClick={() => toggleStatus(user.id)}
                            disabled={actionInProgress?.type === 'status' && actionInProgress?.id === user.id}
                            title={user.status === "Active" ? "Block User" : "Unblock User"}
                          >
                            {actionInProgress?.type === 'status' && actionInProgress?.id === user.id ? (
                              <div className="btn-inline-spinner"></div>
                            ) : (
                              <i className={`bi ${user.status === "Active" ? "bi-person-x" : "bi-person-check"}`}></i>
                            )}
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* User Details Modal */}
      {selectedUser && (
        <div className="user-modal">
          <div className="modal-content">
            <div className="modal-header">
              <h5>User Details</h5>
              <button onClick={() => setSelectedUser(null)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="user-detail-item">
                <span className="detail-label">Name:</span>
                <span>{selectedUser.name}</span>
              </div>
              <div className="user-detail-item">
                <span className="detail-label">Email:</span>
                <span>{selectedUser.email}</span>
              </div>
              <div className="user-detail-item">
                <span className="detail-label">Phone:</span>
                <span>{selectedUser.phone || "-"}</span>
              </div>
              {activeTab === "vendors" && (
                <div className="user-detail-item">
                  <span className="detail-label">Store Name:</span>
                  <span>{selectedUser.store_name || "-"}</span>
                </div>
              )}
              {activeTab === "customers" && (
                <>
                  <div className="user-detail-item">
                    <span className="detail-label">Total Orders:</span>
                    <span>{selectedUser.total_orders || 0}</span>
                  </div>
                  <div className="user-detail-item">
                    <span className="detail-label">Total Purchase:</span>
                    <span>₹{(selectedUser.total_purchase || 0).toLocaleString()}</span>
                  </div>
                </>
              )}
              <div className="user-detail-item">
                <span className="detail-label">Role:</span>
                <span>{selectedUser.role}</span>
              </div>
              <div className="user-detail-item">
                <span className="detail-label">Status:</span>
                <span>{selectedUser.status}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Admin/Vendor Modal (Super Admin only) */}
      {showAddModal && userRole === "super_admin" && (
        <div className="user-modal">
          <div className="modal-content">
            <div className="modal-header">
              <h5>Add {modalRole === 'admin' ? 'Admin' : 'Vendor'}</h5>
              <button onClick={() => setShowAddModal(false)}>✕</button>
            </div>
            <form onSubmit={handleAddUser} className="modal-body">
              <div className="form-group mb-3">
                <label>Full Name <span className="required-star">*</span></label>
                <input type="text" className="form-control" required value={newUser.name} onChange={(e) => setNewUser({ ...newUser, name: e.target.value })} disabled={loading} />
              </div>
              <div className="form-group mb-3">
                <label>Email <span className="required-star">*</span></label>
                <input type="email" className="form-control" required value={newUser.email} onChange={(e) => setNewUser({ ...newUser, email: e.target.value })} disabled={loading} />
              </div>
              <div className="form-group mb-3">
                <label>Password <span className="required-star">*</span></label>
                <div className="password-input-wrapper">
                  <input type={showPassword ? "text" : "password"} className="form-control" required value={newUser.password} onChange={(e) => setNewUser({ ...newUser, password: e.target.value })} disabled={loading} />
                  <i className={`bi ${showPassword ? "bi-eye-slash" : "bi-eye"}`} onClick={() => setShowPassword(!showPassword)}></i>
                </div>
              </div>
              <div className="form-group mb-3">
                <label>Phone (Optional)</label>
                <input type="text" className="form-control" value={newUser.phone} onChange={(e) => setNewUser({ ...newUser, phone: e.target.value })} disabled={loading} />
              </div>
              {modalRole === 'vendor' && (
                <div className="form-group mb-3">
                  <label>Store Name (Optional)</label>
                  <input type="text" className="form-control" value={newUser.store_name} onChange={(e) => setNewUser({ ...newUser, store_name: e.target.value })} disabled={loading} />
                </div>
              )}
              <button type="submit" className="btn-submit w-100" disabled={loading}>
                {loading ? <><div className="btn-spinner"></div> Creating...</> : `Create ${modalRole === 'admin' ? 'Admin' : 'Vendor'}`}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Users;
import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { io } from "socket.io-client";
import axios from "axios";
import "./Topbar.css";

const RAW_API_URL = process.env.REACT_APP_API_URL;
const REACT_APP_API_URL = RAW_API_URL.replace(/['"]/g, '');
const SOCKET_URL = REACT_APP_API_URL.replace(/\/api\/?$/, "");

const Topbar = ({ toggleSidebar, isSidebarCollapsed }) => {
  const [openProfile, setOpenProfile] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [notifications, setNotifications] = useState(() => {
    const saved = sessionStorage.getItem("admin_notifications");
    return saved ? JSON.parse(saved) : [];
  });

  // State for user profile
  const [adminName, setAdminName] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPhone, setAdminPhone] = useState("");
  const [storeName, setStoreName] = useState("");
  const [storeActive, setStoreActive] = useState(true);
  const [togglingStore, setTogglingStore] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(true);

  // State for wallet balance
  const [walletBalance, setWalletBalance] = useState(0);
  const [platformRevenue, setPlatformRevenue] = useState(0);
  const [loadingBalance, setLoadingBalance] = useState(true);
  const [refreshingBalance, setRefreshingBalance] = useState(false);
  const [userRole, setUserRole] = useState(null);
  const [isMobile, setIsMobile] = useState(false);

  const navigate = useNavigate();
  const audioRef = useRef(null);
  const profileRef = useRef(null);
  const notificationRef = useRef(null);
  const token = localStorage.getItem("token");

  const checkTokenAndRedirect = () => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/admin/login', { replace: true });
      return false;
    }
    return true;
  };

  // Check if device is mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Get user role from localStorage
  useEffect(() => {
    const role = localStorage.getItem("userRole");
    setUserRole(role);
  }, []);

  // Fetch user profile from backend
  useEffect(() => {
    if (!token) {
      setLoadingProfile(false);
      return;
    }

    const fetchProfile = async () => {
      if (!checkTokenAndRedirect()) return;

      try {
        const res = await axios.get(`${REACT_APP_API_URL}/user/profile`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const user = res.data;
        setAdminName(user.first_name && user.last_name ? `${user.first_name} ${user.last_name}` : user.name || "Admin");
        setAdminEmail(user.email || "");
        setAdminPhone(user.phone || "");
        setStoreName(user.store_name || "");
        setStoreActive(typeof user.store_active === 'boolean' ? user.store_active : true);
      } catch (error) {
        console.error("Failed to fetch profile:", error);
        setAdminName(localStorage.getItem("admin_name") || "Admin");
        setAdminEmail(localStorage.getItem("admin_email") || "admin@Jayastra.com");
        setStoreName(localStorage.getItem("storeName") || "");
      } finally {
        setLoadingProfile(false);
      }
    };

    fetchProfile();
  }, [token]);

  // Fetch wallet balance for vendor/admin
  const fetchWalletBalance = async (showRefreshLoader = false) => {
    if (!checkTokenAndRedirect()) return;
    if (!token) return;

    try {
      if (showRefreshLoader) {
        setRefreshingBalance(true);
      }
      const res = await axios.get(`${REACT_APP_API_URL}/admin/payouts`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data && typeof res.data.balance !== 'undefined') {
        setWalletBalance(res.data.balance);
      }
    } catch (error) {
      console.error("Failed to fetch wallet balance:", error);
    } finally {
      if (showRefreshLoader) {
        setRefreshingBalance(false);
      }
      setLoadingBalance(false);
    }
  };

  // Fetch platform revenue for super admin
  const fetchPlatformRevenue = async (showRefreshLoader = false) => {
    if (!checkTokenAndRedirect()) return;
    if (!token || userRole !== 'super_admin') return;

    try {
      if (showRefreshLoader) {
        setRefreshingBalance(true);
      }
      const res = await axios.get(`${REACT_APP_API_URL}/admin/payouts`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.data && res.data.payouts) {
        const ordersRes = await axios.get(`${REACT_APP_API_URL}/admin/orders`, {
          headers: { Authorization: `Bearer ${token}` }
        });

        let totalPlatformFee = 0;
        if (ordersRes.data && ordersRes.data.orders) {
          ordersRes.data.orders.forEach(order => {
            if (order.items) {
              order.items.forEach(item => {
                const platformFeePercent = 10;
                const itemTotal = parseFloat(item.price) * item.quantity;
                const platformFee = itemTotal * (platformFeePercent / 100);
                totalPlatformFee += platformFee;
              });
            }
          });
        }

        setPlatformRevenue(totalPlatformFee);
      }
    } catch (error) {
      console.error("Failed to fetch platform revenue:", error);
    } finally {
      if (showRefreshLoader) {
        setRefreshingBalance(false);
      }
      setLoadingBalance(false);
    }
  };

  // Fetch balance on mount only (no automatic periodic updates)
  useEffect(() => {
    if (userRole === 'super_admin') {
      fetchPlatformRevenue(true);
    } else {
      fetchWalletBalance(true);
    }
  }, [token, userRole]);

  // Socket.io for new order notifications (no auto balance refresh)
  useEffect(() => {
    const socket = io(SOCKET_URL);

    socket.on("newOrder", (order) => {
      const newNotif = {
        id: order.id,
        customer: order.customer_name,
        amount: order.total_amount,
        time: new Date().toLocaleTimeString(),
        unread: true
      };

      setNotifications((prev) => {
        const updated = [newNotif, ...prev].slice(0, 10);
        sessionStorage.setItem("admin_notifications", JSON.stringify(updated));
        return updated;
      });

      if (audioRef.current) {
        audioRef.current.play().catch(e => console.log("Audio play blocked", e));
      }
    });

    return () => socket.disconnect();
  }, [token, userRole]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setOpenProfile(false);
      }
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("admin_name");
    localStorage.removeItem("admin_email");
    localStorage.removeItem("userRole");
    sessionStorage.removeItem("admin_notifications");
    navigate("/admin/login", { replace: true });
  };

  const markAllRead = (e) => {
    e.stopPropagation();
    const updated = notifications.map(n => ({ ...n, unread: false }));
    setNotifications(updated);
    sessionStorage.setItem("admin_notifications", JSON.stringify(updated));
  };

  const clearAllNotifications = (e) => {
    e.stopPropagation();
    setNotifications([]);
    sessionStorage.removeItem("admin_notifications");
  };

  const unreadCount = notifications.filter(n => n.unread).length;

  // Display name or loading/fallback
  const displayName = loadingProfile ? "Loading..." : (adminName || "Admin");

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount || 0);
  };

  const showWalletBalance = userRole === 'vendor' || userRole === 'admin';
  const showPlatformRevenue = userRole === 'super_admin';
  const showStoreToggle = userRole && userRole !== 'user';

  // Handle wallet card click for mobile
  const handleWalletClick = () => {
    if (isMobile) {
      setShowWalletModal(true);
    }
  };

  // Handle manual refresh with loader
  const handleManualRefresh = (e) => {
    e.stopPropagation();
    if (showPlatformRevenue) {
      fetchPlatformRevenue(true);
    } else {
      fetchWalletBalance(true);
    }
  };

  const handleStoreToggle = async (e) => {
    e.stopPropagation();
    if (!token || !checkTokenAndRedirect()) return;

    try {
      setTogglingStore(true);
      const res = await axios.put(
        `${REACT_APP_API_URL}/user/profile/all`,
        { store_active: !storeActive },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const updated = res.data?.user?.store_active;
      setStoreActive(typeof updated === 'boolean' ? updated : !storeActive);
    } catch (error) {
      console.error("Failed to toggle store status:", error);
    } finally {
      setTogglingStore(false);
    }
  };

  // Get current balance value
  const currentBalance = showPlatformRevenue ? platformRevenue : walletBalance;

  // Determine if we should show the main loader (only on initial load)
  const showMainLoader = loadingBalance && !refreshingBalance;

  return (
    <div className={`admin-topbar ${isSidebarCollapsed ? 'collapsed' : ''}`}>
      <audio ref={audioRef} src="https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3" preload="auto" />

      <div className="topbar-left">
        <button className="toggle-btn" onClick={toggleSidebar}>
          <i className={`bi ${isSidebarCollapsed ? 'bi-chevron-right' : 'bi-list'}`}></i>
        </button>
        <h1 className="page-title">Jayastra</h1>
      </div>

      {/* Center - Wallet Balance for Vendors/Admins */}
      {showWalletBalance && (
        <div className="topbar-center">
          <div className="wallet-balance-card" onClick={handleWalletClick}>
            <div className="wallet-icon">
              <i className="bi bi-wallet2"></i>
            </div>
            <div className="wallet-info">
              <span className="wallet-label">Wallet Balance</span>
              <span className="wallet-amount">
                {showMainLoader ? (
                  <div className="mini-loader"></div>
                ) : (
                  formatCurrency(walletBalance)
                )}
              </span>
            </div>
            <button
              className="wallet-refresh-btn"
              onClick={handleManualRefresh}
              title="Refresh balance"
              disabled={refreshingBalance}
            >
              <i className={`bi ${refreshingBalance ? 'bi-arrow-repeat spinner' : 'bi-arrow-repeat'}`}></i>
            </button>
          </div>
        </div>
      )}

      {/* Center - Platform Revenue for Super Admin */}
      {showPlatformRevenue && (
        <div className="topbar-center">
          <div className="wallet-balance-card" onClick={handleWalletClick}>
            <div className="wallet-icon">
              <i className="bi bi-wallet2"></i>
            </div>
            <div className="wallet-info">
              <span className="wallet-label">Platform Revenue</span>
              <span className="wallet-amount">
                {showMainLoader ? (
                  <div className="mini-loader"></div>
                ) : (
                  formatCurrency(platformRevenue)
                )}
              </span>
            </div>
            <button
              className="wallet-refresh-btn"
              onClick={handleManualRefresh}
              title="Refresh revenue"
              disabled={refreshingBalance}
            >
              <i className={`bi ${refreshingBalance ? 'bi-arrow-repeat spinner' : 'bi-arrow-repeat'}`}></i>
            </button>
          </div>
        </div>
      )}

      <div className="topbar-right">
        {/* Notifications Dropdown */}
        <div className="topbar-icon-wrap" ref={notificationRef}>
          <div className="topbar-icon" onClick={() => setShowNotifications(!showNotifications)}>
            <i className="bi bi-bell"></i>
            {unreadCount > 0 && <span className="notification-badge">{unreadCount}</span>}
          </div>

          {showNotifications && (
            <div className="notification-dropdown">
              <div className="notif-header">
                <h6>
                  <i className="bi bi-bell-fill"></i> Notifications
                  {unreadCount > 0 && <span className="unread-count-badge">{unreadCount} new</span>}
                </h6>
                <div className="notif-actions">
                  {notifications.length > 0 && (
                    <>
                      <button onClick={markAllRead} className="mark-read-btn">
                        <i className="bi bi-check2-all"></i> Mark all read
                      </button>
                      <button onClick={clearAllNotifications} className="clear-all-btn">
                        <i className="bi bi-trash"></i> Clear all
                      </button>
                    </>
                  )}
                </div>
              </div>
              <div className="notif-list">
                {notifications.length === 0 ? (
                  <div className="no-notif">
                    <i className="bi bi-bell-slash"></i>
                    <p>No new notifications</p>
                  </div>
                ) : (
                  notifications.map((n) => (
                    <div
                      key={n.id}
                      className={`notif-item ${n.unread ? 'unread' : ''}`}
                      onClick={() => {
                        navigate('/admin/orders');
                        setShowNotifications(false);
                      }}
                    >
                      <div className="notif-dot"></div>
                      <div className="notif-content">
                        <strong>New Order #{n.id}</strong>
                        <p>From: {n.customer} | Amount: ₹{n.amount}</p>
                        <small>{n.time}</small>
                      </div>
                    </div>
                  ))
                )}
              </div>
              {notifications.length > 0 && (
                <div className="notif-footer" onClick={() => {
                  navigate('/admin/orders');
                  setShowNotifications(false);
                }}>
                  View All Orders <i className="bi bi-arrow-right"></i>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Profile Dropdown */}
        <div className="admin-profile" ref={profileRef}>
          <div className="profile-trigger" onClick={() => setOpenProfile(!openProfile)}>
            <div className="profile-avatar">
              <i className="bi bi-person-circle"></i>
            </div>
            <div className="profile-info">
              <span className="profile-name">{displayName}</span>
              <span className="profile-role">{adminPhone}</span>
            </div>
            <i className={`bi bi-chevron-down dropdown-icon ${openProfile ? 'rotated' : ''}`}></i>
          </div>

          {openProfile && (
            <div className="profile-dropdown">
              <div className="dropdown-header">
                <div className="dropdown-avatar">
                  <i className="bi bi-person-circle"></i>
                </div>
                <div className="dropdown-user-info">
                  <div className="dropdown-user-name">{adminName}</div>
                  <div className="dropdown-user-store-name">{storeName}</div>

                  <div className="dropdown-user-email">{adminEmail}</div>

                  {showStoreToggle && (
                    <div className="dropdown-store-toggle-row">
                      <span>{storeActive ? 'Store On' : 'Store Off'}</span>
                      <button
                        type="button"
                        className={`dropdown-store-switch ${storeActive ? 'active' : ''}`}
                        onClick={handleStoreToggle}
                        disabled={togglingStore}
                        aria-pressed={storeActive}
                        aria-label={storeActive ? 'Turn store off' : 'Turn store on'}
                        title={storeActive ? 'Turn store off' : 'Turn store on'}
                      >
                        <span className="dropdown-store-switch-thumb"></span>
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className="dropdown-divider"></div>

              <div className="dropdown-menu-items">
                <div className="dropdown-item" onClick={() => {
                  navigate('/admin/profile');
                  setOpenProfile(false);
                }}>
                  <i className="bi bi-person"></i>
                  <span>My Profile</span>
                </div>

                <div className="dropdown-item" onClick={() => {
                  navigate('/admin/orders');
                  setOpenProfile(false);
                }}>
                  <i className="bi bi-box-seam"></i>
                  <span>My Orders</span>
                </div>

                {showWalletBalance && (
                  <div className="dropdown-item" onClick={() => {
                    navigate('/admin/payouts');
                    setOpenProfile(false);
                  }}>
                    <i className="bi bi-wallet2"></i>
                    <span>My Wallet</span>
                  </div>
                )}
              </div>

              <div className="dropdown-divider"></div>

              <div className="dropdown-item logout-item" onClick={handleLogout}>
                <i className="bi bi-box-arrow-right"></i>
                <span>Logout</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Wallet Modal */}
      {showWalletModal && (
        <div className="mobile-wallet-modal-overlay" onClick={() => setShowWalletModal(false)}>
          <div className="mobile-wallet-modal" onClick={(e) => e.stopPropagation()}>
            <div className="mobile-wallet-header">
              <h3>Wallet Balance</h3>
              <button className="mobile-wallet-close" onClick={() => setShowWalletModal(false)}>
                <i className="bi bi-x-lg"></i>
              </button>
            </div>
            <div className="mobile-wallet-body">
              <div className="mobile-wallet-icon">
                <i className="bi bi-wallet2"></i>
              </div>
              <div className="mobile-wallet-amount">
                {refreshingBalance ? (
                  <div className="mini-loader"></div>
                ) : (
                  formatCurrency(currentBalance)
                )}
              </div>
              <div className="mobile-wallet-label">
                {showPlatformRevenue ? 'Platform Revenue' : 'Available Balance'}
              </div>
              <button
                className="mobile-wallet-refresh"
                onClick={handleManualRefresh}
                disabled={refreshingBalance}
              >
                <i className={`bi ${refreshingBalance ? 'bi-arrow-repeat spinner' : 'bi-arrow-repeat'}`}></i> Refresh
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Topbar;

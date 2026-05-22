import React, { useState, useEffect } from "react";
import axios from '../../utils/axiosConfig'; // Adjust path as needed
import { toast } from "react-toastify";
import WithdrawalInvoice from "./WithdrawalInvoice";
import "./Payouts.css";

const API_URL = process.env.REACT_APP_API_URL;

// Transaction Details Modal Component
const TransactionDetailsModal = ({ transaction, onClose }) => {
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2
    }).format(amount || 0);
  };

  const formatDate = (date) => {
    if (!date) return '-';
    return new Date(date).toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getTransactionIcon = (type, status) => {
    if (type === 'credit') return 'bi-arrow-down-circle-fill';
    return 'bi-arrow-up-circle-fill';
  };

  const getTransactionColor = (type, status) => {
    if (status === 'cancelled') return '#dc2626';
    if (status === 'pending') return '#eab308';
    if (type === 'credit') return '#15803d';
    return '#dc2626';
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'completed': return { color: '#15803d', bg: '#dcfce7', icon: 'bi-check-circle-fill', text: 'Completed' };
      case 'pending': return { color: '#d97706', bg: '#fef3c7', icon: 'bi-clock-fill', text: 'Pending' };
      case 'cancelled': return { color: '#dc2626', bg: '#fee2e2', icon: 'bi-x-circle-fill', text: 'Cancelled' };
      default: return { color: '#6b7280', bg: '#f3f4f6', icon: 'bi-question-circle-fill', text: status };
    }
  };

  const statusInfo = getStatusBadge(transaction.status);

  return (
    <div className="invoice-modal-overlay" onClick={onClose}>
      <div className="invoice-modal-container" style={{ maxWidth: '550px' }} onClick={(e) => e.stopPropagation()}>
        <div className="invoice-modal-header">
          <h3>
            <i className={`bi ${getTransactionIcon(transaction.transaction_type, transaction.status)}`} 
               style={{ color: getTransactionColor(transaction.transaction_type, transaction.status) }}></i>
            Transaction Details
          </h3>
          <div className="invoice-modal-actions">
            <button className="btn-close-modal" onClick={onClose}>
              <i className="bi bi-x-lg"></i>
            </button>
          </div>
        </div>
        
        <div className="invoice-modal-content" style={{ padding: '20px' }}>
          <div className="transaction-details-card">
            <div className={`transaction-status-banner ${transaction.status}`}>
              <i className={`bi ${statusInfo.icon}`}></i>
              <span>{statusInfo.text}</span>
            </div>

            <div className="transaction-amount-section">
              <div className="amount-label">
                {transaction.transaction_type === 'credit' ? 'Amount Credited' : 'Amount Debited'}
              </div>
              <div className={`amount-value ${transaction.transaction_type}`}>
                {transaction.transaction_type === 'credit' ? '+' : '-'} {formatCurrency(transaction.amount)}
              </div>
            </div>

            <div className="transaction-description">
              <i className="bi bi-info-circle-fill"></i>
              <span>{transaction.description}</span>
            </div>

            {(transaction.original_amount || transaction.platform_fee > 0 || transaction.coupon_discount_applied > 0) && (
              <div className="transaction-breakdown">
                <h4>Breakdown Details</h4>
                <div className="breakdown-row">
                  <span>Original Amount:</span>
                  <span>{formatCurrency(transaction.original_amount)}</span>
                </div>
                {transaction.platform_fee > 0 && (
                  <div className="breakdown-row text-danger">
                    <span>Platform Fee ({((transaction.platform_fee / transaction.original_amount) * 100).toFixed(0)}%):</span>
                    <span>-{formatCurrency(transaction.platform_fee)}</span>
                  </div>
                )}
                {transaction.coupon_discount_applied > 0 && (
                  <div className="breakdown-row text-warning">
                    <span>Coupon Discount:</span>
                    <span>-{formatCurrency(transaction.coupon_discount_applied)}</span>
                  </div>
                )}
                <div className="breakdown-divider"></div>
                <div className="breakdown-row total">
                  <span>Final Amount:</span>
                  <span>{formatCurrency(transaction.amount)}</span>
                </div>
              </div>
            )}

            <div className="transaction-info-grid">
              <div className="info-item">
                <span className="info-label">Transaction ID:</span>
                <span className="info-value">TXN-{String(transaction.id).padStart(8, '0')}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Date & Time:</span>
                <span className="info-value">{formatDate(transaction.created_at)}</span>
              </div>
              {transaction.order_id && (
                <div className="info-item">
                  <span className="info-label">Order ID:</span>
                  <span className="info-value">#{transaction.order_id}</span>
                </div>
              )}
              {transaction.payout_id && (
                <div className="info-item">
                  <span className="info-label">Payout ID:</span>
                  <span className="info-value">PYT-{String(transaction.payout_id).padStart(6, '0')}</span>
                </div>
              )}
              <div className="info-item">
                <span className="info-label">Transaction Type:</span>
                <span className="info-value" style={{ textTransform: 'capitalize' }}>
                  {transaction.transaction_type}
                </span>
              </div>
            </div>

            {transaction.vendor_name && (
              <div className="vendor-info-section">
                <h4>Vendor Information</h4>
                <div className="info-item">
                  <span className="info-label">Vendor Name:</span>
                  <span className="info-value">{transaction.vendor_name}</span>
                </div>
                {transaction.store_name && (
                  <div className="info-item">
                    <span className="info-label">Store Name:</span>
                    <span className="info-value">{transaction.store_name}</span>
                  </div>
                )}
              </div>
            )}

            <div className="transaction-footer">
              <i className="bi bi-receipt"></i>
              <span>This is a record of your wallet transaction. For any discrepancies, please contact support.</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const Payouts = () => {
  // Navigation & UI States
  const [activeMenu, setActiveMenu] = useState("settlement");
  const [walletTab, setWalletTab] = useState("all");
  const [settlementTab, setSettlementTab] = useState("all");
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedBankAccount, setSelectedBankAccount] = useState("");
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [selectedPayoutForCancel, setSelectedPayoutForCancel] = useState(null);
  const [cancellationReason, setCancellationReason] = useState("");
  const [selectedPayoutForInvoice, setSelectedPayoutForInvoice] = useState(null);
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  // Data States
  const [payouts, setPayouts] = useState([]);
  const [balance, setBalance] = useState(0);
  const [amount, setAmount] = useState("");
  const [bankDetails, setBankDetails] = useState("");
  const [savedBankAccounts, setSavedBankAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [requesting, setRequesting] = useState(false);
  const [summary, setSummary] = useState({ total_pending: 0, total_paid: 0, total_requested: 0 });
  const [vendorTotals, setVendorTotals] = useState({ total_pending: 0, total_paid: 0, total_requested: 0 });
  const [invoices, setInvoices] = useState([]);
  const [walletTransactionsList, setWalletTransactionsList] = useState([]);
  const [walletLoading, setWalletLoading] = useState(false);
  const [earningStats, setEarningStats] = useState({
    current_month: 0,
    last_month: 0,
    total_earned: 0,
    pending_settlement: 0
  });

  // Filter States
  const [selectedVendor, setSelectedVendor] = useState("");
  const [vendors, setVendors] = useState([]);
  const [vendorBalances, setVendorBalances] = useState([]);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  const token = localStorage.getItem("token");
  const userRole = localStorage.getItem("userRole")?.toLowerCase();

  const getHeaders = () => ({
    headers: { Authorization: `Bearer ${token}` }
  });

  // Helper function to safely parse amount
  const safeParseAmount = (amount) => {
    if (!amount) return 0;
    const parsed = parseFloat(amount);
    return isNaN(parsed) ? 0 : parsed;
  };

  // Fetch wallet transactions
  const fetchWalletTransactions = async () => {
    try {
      setWalletLoading(true);
      const res = await axios.get(`${API_URL}/admin/wallet-transactions`, getHeaders());
      if (res.data.success) {
        setWalletTransactionsList(res.data.transactions || []);
      }
    } catch (err) {
      console.error("Failed to fetch wallet transactions:", err);
    } finally {
      setWalletLoading(false);
    }
  };

  // Fetch all payouts
  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_URL}/admin/payouts`, getHeaders());
      setPayouts(res.data.payouts || []);
      setBalance(safeParseAmount(res.data.balance || 0));

      if (userRole === "super_admin" && res.data.payouts) {
        const vendorMap = new Map();
        res.data.payouts.forEach(p => {
          const vendorId = p.vendor_id;
          const vendorName = p.store_name || p.email || `Vendor ${vendorId}`;
          if (!vendorMap.has(vendorId)) {
            vendorMap.set(vendorId, { id: vendorId, name: vendorName, email: p.email });
          }
        });
        setVendors(Array.from(vendorMap.values()));
      }
    } catch (err) {
      toast.error("Failed to load payout data");
    } finally {
      setLoading(false);
      setIsInitialLoad(false);
    }
  };

  const fetchSavedBankAccounts = async () => {
    if (userRole === "super_admin") return;
    try {
      const res = await axios.get(`${API_URL}/admin/payouts/saved-accounts`, getHeaders());
      if (res.data.success) {
        setSavedBankAccounts(res.data.accounts);
      }
    } catch (err) {
      console.error("Failed to fetch saved bank accounts", err);
    }
  };

  const saveBankAccount = async (bankDetailsToSave) => {
    if (userRole === "super_admin") return;
    try {
      await axios.post(`${API_URL}/admin/payouts/save-account`,
        { bank_details: bankDetailsToSave },
        getHeaders()
      );
    } catch (err) {
      console.error("Failed to save bank account", err);
    }
  };

  const fetchSummary = async () => {
    if (userRole !== "super_admin") return;
    try {
      const res = await axios.get(`${API_URL}/admin/payouts/summary`, getHeaders());
      if (res.data.success) {
        setSummary({
          total_pending: safeParseAmount(res.data.summary.total_pending),
          total_paid: safeParseAmount(res.data.summary.total_paid),
          total_requested: safeParseAmount(res.data.summary.total_requested)
        });
      }
    } catch (err) {
      console.error("Failed to fetch summary", err);
    }
  };

  const fetchEarningStats = async () => {
    try {
      const res = await axios.get(`${API_URL}/admin/payouts/earning-stats`, getHeaders());
      if (res.data.success) {
        setEarningStats({
          current_month: safeParseAmount(res.data.stats.current_month),
          last_month: safeParseAmount(res.data.stats.last_month),
          total_earned: safeParseAmount(res.data.stats.total_earned),
          pending_settlement: safeParseAmount(res.data.stats.pending_settlement)
        });
      }
    } catch (err) {
      console.error("Failed to fetch earning stats", err);
    }
  };

  const fetchVendorTotals = async (vendorId) => {
    if (!vendorId) return;
    try {
      const res = await axios.get(`${API_URL}/admin/payouts/vendor-summary/${vendorId}`, getHeaders());
      if (res.data.success) {
        setVendorTotals({
          total_pending: safeParseAmount(res.data.summary.total_pending),
          total_paid: safeParseAmount(res.data.summary.total_paid),
          total_requested: safeParseAmount(res.data.summary.total_requested)
        });
      }
    } catch (err) {
      console.error("Failed to fetch vendor totals", err);
    }
  };

  const fetchVendorBalances = async () => {
    if (userRole !== "super_admin") return;
    try {
      const res = await axios.get(`${API_URL}/admin/vendor-balances`, getHeaders());
      if (res.data.success) {
        setVendorBalances(res.data.vendors.map(v => ({
          ...v,
          balance: safeParseAmount(v.balance)
        })));
      }
    } catch (err) {
      console.error("Failed to fetch vendor balances", err);
    }
  };

  const fetchInvoices = async () => {
    try {
      const res = await axios.get(`${API_URL}/admin/invoices`, getHeaders());
      if (res.data.success) {
        setInvoices(res.data.invoices.map(inv => ({
          ...inv,
          amount: safeParseAmount(inv.amount)
        })));
      }
    } catch (err) {
      console.error("Failed to fetch invoices", err);
    }
  };

  useEffect(() => {
    const loadAllData = async () => {
      setLoading(true);
      await Promise.all([
        fetchData(),
        fetchSummary(),
        fetchVendorBalances(),
        fetchEarningStats(),
        fetchInvoices(),
        fetchSavedBankAccounts(),
        fetchWalletTransactions()
      ]);
      setLoading(false);
    };
    loadAllData();
  }, []);

  useEffect(() => {
    if (userRole === "super_admin" && selectedVendor) {
      fetchVendorTotals(selectedVendor);
    } else if (userRole === "super_admin") {
      setVendorTotals({ total_pending: 0, total_paid: 0, total_requested: 0 });
    }
  }, [selectedVendor]);

  const handleRequestPayout = async (e) => {
    e.preventDefault();
    const requestedAmount = safeParseAmount(amount);
    if (requestedAmount > balance) return toast.error("Insufficient balance");
    if (requestedAmount <= 0) return toast.error("Enter a valid amount");
    if (!bankDetails.trim()) return toast.error("Please provide bank details");

    try {
      setRequesting(true);
      await axios.post(`${API_URL}/admin/payouts/request`, { amount: requestedAmount, bank_details: bankDetails }, getHeaders());
      toast.success("Withdrawal requested successfully");

      await saveBankAccount(bankDetails);
      await fetchSavedBankAccounts();

      setAmount("");
      setBankDetails("");
      setSelectedBankAccount("");
      setShowWithdrawModal(false);

      await Promise.all([
        fetchData(),
        fetchSummary(),
        fetchEarningStats(),
        fetchInvoices(),
        fetchWalletTransactions()
      ]);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to request payout");
    } finally {
      setRequesting(false);
    }
  };

  const handleBankAccountSelect = (account) => {
    if (account === "new") {
      setBankDetails("");
      setSelectedBankAccount("new");
    } else {
      setBankDetails(account.bank_details);
      setSelectedBankAccount(account.id);
    }
  };

  const handleDeleteBankAccount = async (accountId) => {
    if (!window.confirm("Are you sure you want to delete this saved bank account?")) return;
    try {
      await axios.delete(`${API_URL}/admin/payouts/saved-account/${accountId}`, getHeaders());
      toast.success("Bank account deleted successfully");
      fetchSavedBankAccounts();
      if (selectedBankAccount === accountId) {
        setBankDetails("");
        setSelectedBankAccount("");
      }
    } catch (err) {
      toast.error("Failed to delete bank account");
    }
  };

  const handleApprove = async (id) => {
    if (!window.confirm("Mark this settlement as Done/Paid?")) return;
    try {
      setRequesting(true);
      await axios.put(`${API_URL}/admin/payouts/${id}/approve`, {}, getHeaders());
      toast.success("Settlement Approved");

      await Promise.all([
        fetchData(),
        fetchSummary(),
        fetchEarningStats(),
        fetchInvoices(),
        fetchWalletTransactions()
      ]);
    } catch (err) {
      toast.error("Failed to approve");
    } finally {
      setRequesting(false);
    }
  };

  const handleCancelRequest = async () => {
    if (!selectedPayoutForCancel) return;
    if (!cancellationReason.trim()) {
      toast.error("Please provide a reason for cancellation");
      return;
    }

    try {
      setRequesting(true);
      await axios.put(`${API_URL}/admin/payouts/${selectedPayoutForCancel.id}/cancel`,
        { reason: cancellationReason },
        getHeaders()
      );
      toast.success("Withdrawal request cancelled successfully");
      setShowCancelModal(false);
      setSelectedPayoutForCancel(null);
      setCancellationReason("");

      await Promise.all([
        fetchData(),
        fetchSummary(),
        fetchEarningStats(),
        fetchWalletTransactions()
      ]);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to cancel request");
    } finally {
      setRequesting(false);
    }
  };

  const handleRejectRequest = async (id, reason) => {
    if (!reason || !reason.trim()) {
      toast.error("Please provide a reason for rejection");
      return;
    }

    try {
      setRequesting(true);
      await axios.put(`${API_URL}/admin/payouts/${id}/reject`,
        { reason: reason },
        getHeaders()
      );
      toast.success("Withdrawal request rejected");

      await Promise.all([
        fetchData(),
        fetchSummary(),
        fetchEarningStats(),
        fetchWalletTransactions()
      ]);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to reject request");
    } finally {
      setRequesting(false);
    }
  };

  const handleViewInvoice = (payout) => {
    setSelectedPayoutForInvoice(payout);
  };

  const handleCloseInvoice = () => {
    setSelectedPayoutForInvoice(null);
  };

  const handleTransactionClick = (transaction) => {
    setSelectedTransaction(transaction.fullData || transaction);
  };

  const handleCloseTransactionModal = () => {
    setSelectedTransaction(null);
  };

  const handleDownloadSettlementReport = async () => {
    try {
      const params = new URLSearchParams();
      if (selectedVendor) params.append('vendor_id', selectedVendor);
      if (dateFrom) params.append('from', dateFrom);
      if (dateTo) params.append('to', dateTo);

      const response = await axios.get(`${API_URL}/admin/payouts/report/download?${params.toString()}`, {
        ...getHeaders(),
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `settlement_report_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success("Report downloaded successfully");
    } catch (err) {
      toast.error("Failed to download report");
    }
  };

  // Filter payouts based on selected tab and filters
  const getFilteredPayouts = () => {
    if (!payouts || payouts.length === 0) return [];

    let filtered = selectedVendor
      ? payouts.filter(p => p.vendor_id === parseInt(selectedVendor))
      : [...payouts];

    if (dateFrom) {
      filtered = filtered.filter(p => new Date(p.requested_at) >= new Date(dateFrom));
    }
    if (dateTo) {
      filtered = filtered.filter(p => new Date(p.requested_at) <= new Date(dateTo));
    }

    if (searchTerm) {
      filtered = filtered.filter(p =>
        p.id.toString().includes(searchTerm) ||
        (p.store_name && p.store_name.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    return filtered;
  };

  const getAllPayoutsCounts = () => {
    const basePayouts = selectedVendor
      ? payouts.filter(p => p.vendor_id === parseInt(selectedVendor))
      : payouts;

    return {
      all: basePayouts.length,
      pending: basePayouts.filter(p => p.status === 'Pending').length,
      paid: basePayouts.filter(p => p.status === 'Paid').length,
      rejected: basePayouts.filter(p => p.status === 'Rejected').length,
      cancelled: basePayouts.filter(p => p.status === 'Cancelled').length
    };
  };

  const getDisplayPayouts = () => {
    let filtered = getFilteredPayouts();

    if (settlementTab === "paid") {
      filtered = filtered.filter(p => p.status === 'Paid');
    } else if (settlementTab === "pending") {
      filtered = filtered.filter(p => p.status === 'Pending');
    } else if (settlementTab === "rejected") {
      filtered = filtered.filter(p => p.status === 'Rejected');
    } else if (settlementTab === "cancelled") {
      filtered = filtered.filter(p => p.status === 'Cancelled');
    }

    return filtered;
  };

  const getWalletTotals = () => {
    const basePayouts = selectedVendor
      ? payouts.filter(p => p.vendor_id === parseInt(selectedVendor))
      : payouts;

    const totalCredit = 0;
    const totalDebitAll = basePayouts.reduce((sum, p) => {
      const amount = safeParseAmount(p.amount);
      return sum + amount;
    }, 0);

    const totalDebitPaid = basePayouts
      .filter(p => p.status === 'Paid')
      .reduce((sum, p) => {
        const amount = safeParseAmount(p.amount);
        return sum + amount;
      }, 0);

    return { totalCredit, totalDebitAll, totalDebitPaid };
  };

  const getWalletTransactions = () => {
    let transactions = [];
    
    // Add wallet transactions (credits from orders)
    walletTransactionsList.forEach(t => {
      transactions.push({
        id: t.id,
        date: t.created_at,
        transaction_id: `TXN-${String(t.id).padStart(8, '0')}`,
        type: t.transaction_type,
        amount: safeParseAmount(t.amount),
        status: t.status,
        description: t.description,
        charge_type: t.transaction_type === 'credit' ? 'Order Earnings' : 'Withdrawal',
        original_amount: t.original_amount,
        platform_fee: t.platform_fee,
        coupon_discount: t.coupon_discount_applied,
        order_id: t.order_id,
        payout_id: t.payout_id,
        fullData: t
      });
    });
    
    // Add payouts as debit transactions if not already in wallet transactions
    const basePayouts = selectedVendor
      ? payouts.filter(p => p.vendor_id === parseInt(selectedVendor))
      : payouts;
    
    basePayouts.forEach(p => {
      // Check if this payout already exists in wallet transactions
      const exists = transactions.some(t => t.payout_id === p.id);
      if (!exists) {
        transactions.push({
          id: `payout_${p.id}`,
          date: p.requested_at,
          transaction_id: `TXN-${p.id}`,
          type: 'debit',
          amount: safeParseAmount(p.amount),
          status: p.status,
          description: `Withdrawal request ${p.status === 'Paid' ? 'completed' : p.status === 'Pending' ? 'pending approval' : p.status.toLowerCase()}`,
          charge_type: 'Withdrawal',
          payout_id: p.id,
          fullData: { ...p, transaction_type: 'debit', vendor_name: p.store_name || p.vendor_name }
        });
      }
    });
    
    transactions.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    if (walletTab === 'credit') {
      transactions = transactions.filter(t => t.type === 'credit');
    } else if (walletTab === 'debit') {
      transactions = transactions.filter(t => t.type === 'debit');
    }
    
    return transactions;
  };

  const displayPayouts = getDisplayPayouts();
  const walletTransactions = getWalletTransactions();
  const counts = getAllPayoutsCounts();
  const walletTotals = getWalletTotals();

  const currentSummary = selectedVendor && vendorTotals ? vendorTotals : summary;
  const currentBalance = userRole === "super_admin"
    ? (selectedVendor
      ? (vendorBalances.find(v => v.id === parseInt(selectedVendor))?.balance || 0)
      : vendorBalances.reduce((sum, v) => sum + (v.balance || 0), 0))
    : safeParseAmount(balance);

  const formatCurrency = (amount) => {
    const num = safeParseAmount(amount);
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(num);
  };

  const formatDate = (date) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const formatBankDetailsShort = (details) => {
    if (!details) return '';
    const accountMatch = details.match(/\b\d{9,18}\b/);
    if (accountMatch) {
      const last4 = accountMatch[0].slice(-4);
      return `••••${last4}`;
    }
    const upiMatch = details.match(/[\w\.\-_]+@[\w\.\-_]+/);
    if (upiMatch) {
      return upiMatch[0];
    }
    return details.substring(0, 30) + '...';
  };

  if (loading && isInitialLoad) {
    return (
      <div className="payments-layout">
        <div className="payments-sidebar">
          <ul className="payments-nav">
            <li><i className="bi bi-calculator-fill"></i> Settlement</li>
            <li><i className="bi bi-wallet2"></i> Wallet</li>
            <li><i className="bi bi-receipt"></i> Billing</li>
          </ul>
        </div>
        <div className="payments-content">
          <div className="loading-skeleton">
            <div className="skeleton-banner"></div>
            <div className="skeleton-stats"></div>
            <div className="skeleton-table"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="payments-layout">
      {requesting && (
        <div className="dash-loader-overlay">
          <div className="dash-spinner"></div>
        </div>
      )}

      <div className="payments-sidebar">
        <ul className="payments-nav">
          <li className={activeMenu === "settlement" ? "active" : ""} onClick={() => setActiveMenu("settlement")}>
            <i className="bi bi-calculator-fill"></i>
            Settlement
          </li>
          <li className={activeMenu === "wallet" ? "active" : ""} onClick={() => setActiveMenu("wallet")}>
            <i className="bi bi-wallet2"></i>
            Wallet
          </li>
          <li className={activeMenu === "billing" ? "active" : ""} onClick={() => setActiveMenu("billing")}>
            <i className="bi bi-receipt"></i>
            Billing
          </li>
        </ul>
      </div>

      <div className="payments-content">
        <div className="info-banner">
          <div className="info-text">
            <i className="bi bi-info-circle-fill"></i>
            {userRole === "super_admin"
              ? "Manage vendor settlements, track wallet balances, and handle billing"
              : "Withdrawals your way! Request payouts."}
          </div>
          {(userRole === "vendor" || userRole === "admin") && balance > 0 && (
            <button className="btn-resume-onboard" onClick={() => setShowWithdrawModal(true)}>
              <i className="bi bi-plus-circle"></i> Withdraw Funds
            </button>
          )}
        </div>

        {userRole === "super_admin" && vendors.length > 0 && (
          <div className="super-admin-filter-bar">
            <div className="filter-group">
              <label>Filter by Vendor:</label>
              <select value={selectedVendor} onChange={(e) => setSelectedVendor(e.target.value)}>
                <option value="">All Vendors ({vendors.length})</option>
                {vendors.map(v => (
                  <option key={v.id} value={v.id}>{v.name}</option>
                ))}
              </select>
            </div>
            {selectedVendor && (
              <button className="clear-filter-btn" onClick={() => setSelectedVendor("")}>
                <i className="bi bi-x-circle"></i> Clear
              </button>
            )}
            <div className="filter-group">
              <label>From:</label>
              <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
            </div>
            <div className="filter-group">
              <label>To:</label>
              <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
            </div>
            <button className="btn-reset-filters" onClick={() => { setDateFrom(""); setDateTo(""); setSearchTerm(""); }}>
              <i className="bi bi-arrow-repeat"></i> Reset
            </button>
          </div>
        )}

        {activeMenu === "wallet" && (
          <div className="view-container">
            <div className="view-header">
              <div>
                <h2 className="view-title">Wallet Transactions</h2>
                <span className="view-subtitle">Track all your credits and debits</span>
              </div>
              <div className="filter-controls">
                <div className="date-range-display">
                  <span>{dateFrom || "Start"} → {dateTo || "End"}</span>
                  <i className="bi bi-calendar"></i>
                </div>
                <div className="search-box">
                  <input
                    type="text"
                    placeholder="Transaction ID..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                  <button><i className="bi bi-search"></i></button>
                </div>
              </div>
            </div>

            <div className="stats-equation-row">
              <div className="tabs-column">
                <div className="tab-group-container">
                  <span className="tab-group-label">All Transactions</span>
                  <div className={`stat-tab ${walletTab === 'all' ? 'active' : ''}`} onClick={() => setWalletTab('all')}>
                    All <span>{walletTransactions.length}</span>
                  </div>
                </div>
                <div className="tab-group-container">
                  <span className="tab-group-label">Transaction Type</span>
                  <div className="sub-tabs-flex">
                    <div className={`stat-tab ${walletTab === 'credit' ? 'active' : ''}`} onClick={() => setWalletTab('credit')}>
                      Credit <span>{formatCurrency(walletTotals.totalCredit)}</span>
                    </div>
                    <div className={`stat-tab ${walletTab === 'debit' ? 'active' : ''}`} onClick={() => setWalletTab('debit')}>
                      Debit <span>{formatCurrency(walletTotals.totalDebitAll)}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="equation-column">
                <div className="eq-box">
                  <span className="eq-label">Total Balance</span>
                  <span className="eq-value">{formatCurrency(currentBalance)}</span>
                </div>
                <span className="eq-symbol">=</span>
                <div className="eq-box">
                  <span className="eq-label">Total Credit</span>
                  <span className="eq-value" style={{ color: '#15803d' }}>{formatCurrency(walletTotals.totalCredit)}</span>
                </div>
                <span className="eq-symbol">-</span>
                <div className="eq-box">
                  <span className="eq-label">Total Debit (Paid)</span>
                  <span className="eq-value" style={{ color: '#dc2626' }}>{formatCurrency(walletTotals.totalDebitPaid)}</span>
                </div>
              </div>
            </div>

            <div className="table-toolbar">
              <h3>
                {walletTab === 'all' ? 'All Transactions' :
                  walletTab === 'credit' ? 'Credit Transactions' : 'Debit Transactions'}
              </h3>
              <div className="toolbar-actions">
                <i className="bi bi-download action-icon" onClick={handleDownloadSettlementReport}></i>
                <i className="bi bi-arrow-clockwise action-icon" onClick={() => { fetchData(); fetchEarningStats(); fetchWalletTransactions(); }}></i>
                <button className="btn-clear-filters" onClick={() => { setDateFrom(""); setDateTo(""); setSearchTerm(""); setWalletTab("all"); }}>
                  Clear
                </button>
              </div>
            </div>

            <div className="ekart-table-wrapper">
              <table className="ekart-table">
                <thead>
                  <tr>
                    <th><input type="checkbox" /></th>
                    <th>Transaction Date</th>
                    <th>Transaction ID</th>
                    <th>Charge Type</th>
                    <th>Type</th>
                    <th>Amount</th>
                    <th>Status</th>
                    <th>Description</th>
                    {userRole === "super_admin" && <th>Action</th>}
                  </tr>
                </thead>
                <tbody>
                  {walletTransactions.length === 0 ? (
                    <tr className="empty-row">
                      <td colSpan="9">
                        <div className="empty-state">
                          <i className="bi bi-inbox"></i>
                          <p>No transactions found</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    walletTransactions.map(t => (
                      <tr key={t.id} className="transaction-row clickable" onClick={() => handleTransactionClick(t)} style={{ cursor: 'pointer' }}>
                        <td><input type="checkbox" onClick={(e) => e.stopPropagation()} /></td>
                        <td>{formatDate(t.date)}</td>
                        <td className="text-blue">{t.transaction_id}</td>
                        <td>{t.charge_type}</td>
                        <td>
                          <span className={`type-badge ${t.type}`}>
                            {t.type === 'credit' ? 'Credit' : 'Debit'}
                          </span>
                        </td>
                        <td className={`amount-cell ${t.type}`}>{formatCurrency(t.amount)}</td>
                        <td>
                          <span className={`status-dot ${t.status?.toLowerCase() || 'pending'}`}></span>
                          {t.status === 'completed' ? 'Completed' : t.status === 'pending' ? 'Pending' : t.status === 'cancelled' ? 'Cancelled' : t.status || 'Pending'}
                         </td>
                        <td className="desc-text">{t.description}</td>
                        {userRole === "super_admin" && (
                          <td>
                            {t.status === 'Pending' && t.payout_id && (
                              <button className="table-btn-approve" onClick={(e) => { e.stopPropagation(); handleApprove(t.payout_id); }}>
                                Approve
                              </button>
                            )}
                           </td>
                        )}
                       </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeMenu === "settlement" && (
          <div className="view-container">
            <div className="view-header">
              <h2 className="view-title">Settlement Dashboard</h2>
              <div className="filter-controls">
                <div className="date-range-display">
                  <span>{dateFrom || "Start"} → {dateTo || "End"}</span>
                  <i className="bi bi-calendar"></i>
                </div>
                <div className="search-box">
                  <input
                    type="text"
                    placeholder="Settlement ID"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                  <button><i className="bi bi-search"></i></button>
                </div>
              </div>
            </div>

            <div className="stats-equation-row">
              <div className="tabs-column">
                <div className="tab-group-container">
                  <span className="tab-group-label">Settlement Status</span>
                  <div className="sub-tabs-flex">
                    <div className={`stat-tab ${settlementTab === 'all' ? 'active' : ''}`} onClick={() => setSettlementTab('all')}>
                      All <span>{counts.all}</span>
                    </div>
                    <div className={`stat-tab ${settlementTab === 'pending' ? 'active' : ''}`} onClick={() => setSettlementTab('pending')}>
                      Pending <span>{counts.pending}</span>
                    </div>
                    <div className={`stat-tab ${settlementTab === 'paid' ? 'active' : ''}`} onClick={() => setSettlementTab('paid')}>
                      Completed <span>{counts.paid}</span>
                    </div>
                    <div className={`stat-tab ${settlementTab === 'rejected' ? 'active' : ''}`} onClick={() => setSettlementTab('rejected')}>
                      Rejected <span>{counts.rejected}</span>
                    </div>
                    <div className={`stat-tab ${settlementTab === 'cancelled' ? 'active' : ''}`} onClick={() => setSettlementTab('cancelled')}>
                      Cancelled <span>{counts.cancelled}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="equation-column no-math">
                <div className="eq-box">
                  <span className="eq-label">Pending Settlement</span>
                  <span className="eq-value">{formatCurrency(currentSummary?.total_pending || 0)}</span>
                </div>
                <div className="eq-box">
                  <span className="eq-label">Completed Settlement</span>
                  <span className="eq-value">{formatCurrency(currentSummary?.total_paid || 0)}</span>
                </div>
                <div className="eq-box">
                  <span className="eq-label">Total Requested</span>
                  <span className="eq-value">{formatCurrency(currentSummary?.total_requested || 0)}</span>
                </div>
              </div>
            </div>

            <div className="table-toolbar">
              <h3>
                {settlementTab === 'all' ? 'All Settlements' :
                  settlementTab === 'paid' ? 'Completed Settlements' :
                    settlementTab === 'pending' ? 'Pending Settlements' :
                      settlementTab === 'rejected' ? 'Rejected Requests' : 'Cancelled Requests'}
              </h3>
              <div className="toolbar-actions">
                <button className="btn-blue-outline" onClick={handleDownloadSettlementReport}>
                  <i className="bi bi-download"></i> Download Report
                </button>
                <i className="bi bi-arrow-clockwise action-icon" onClick={() => { fetchData(); fetchSummary(); }}></i>
                <button className="btn-clear-filters" onClick={() => { setDateFrom(""); setDateTo(""); setSearchTerm(""); setSettlementTab("all"); }}>
                  Clear
                </button>
              </div>
            </div>

            <div className="ekart-table-wrapper">
              <table className="ekart-table">
                <thead>
                  <tr>
                    <th><input type="checkbox" /></th>
                    <th>Settlement ID</th>
                    {userRole === "super_admin" && <th>Vendor</th>}
                    <th>Type</th>
                    <th>Requested Amount</th>
                    <th>Settlement Amount</th>
                    <th>Requested Date</th>
                    <th>Settlement/Updated Date</th>
                    <th>Bank Details</th>
                    <th>Status</th>
                    <th>Reason</th>
                    {userRole === "super_admin" && (settlementTab === "pending" || settlementTab === "all") && <th>Actions</th>}
                    {(userRole === "vendor" || userRole === "admin") && settlementTab === "pending" && <th>Actions</th>}
                    {(settlementTab === "paid" || settlementTab === "all") && <th>Invoice</th>}
                  </tr>
                </thead>
                <tbody>
                  {displayPayouts.length === 0 ? (
                    <tr className="empty-row">
                      <td colSpan="12">
                        <div className="empty-state">
                          <i className="bi bi-inbox"></i>
                          <p>No settlements found</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    displayPayouts.map(p => (
                      <tr key={p.id}>
                        <td><input type="checkbox" /></td>
                        <td className="text-blue">STL-{String(p.id).padStart(6, '0')}</td>
                        {userRole === "super_admin" && <td>{p.store_name || p.email}</td>}
                        <td>Withdrawal</td>
                        <td>{formatCurrency(p.amount)}</td>
                        <td>{p.status === 'Paid' ? formatCurrency(p.amount) : '-'}</td>
                        <td>{formatDate(p.requested_at)}</td>
                        <td>{p.processed_at ? formatDate(p.processed_at) : (p.updated_at ? formatDate(p.updated_at) : formatDate(p.requested_at))}</td>
                        <td className="desc-text">{p.bank_details?.substring(0, 40)}...</td>
                        <td>
                          <span className={`status-badge ${p.status.toLowerCase()}`}>
                            {p.status === 'Rejected' && <i className="bi bi-x-circle-fill"></i>}
                            {p.status === 'Cancelled' && <i className="bi bi-ban-fill"></i>}
                            {p.status === 'Pending' && <i className="bi bi-hourglass-split"></i>}
                            {p.status === 'Paid' && <i className="bi bi-check-circle-fill"></i>}
                            {p.status}
                          </span>
                        </td>
                        <td className="desc-text">{p.rejection_reason || p.cancellation_reason || '-'}</td>
                        {userRole === "super_admin" && (settlementTab === "pending" || settlementTab === "all") && p.status === 'Pending' && (
                          <td>
                            <div className="action-buttons">
                              <button className="table-btn-approve" onClick={() => handleApprove(p.id)}>
                                <i className="bi bi-check-lg"></i> Approve
                              </button>
                              <button className="table-btn-reject" onClick={() => {
                                const reason = prompt("Enter reason for rejection:");
                                if (reason) handleRejectRequest(p.id, reason);
                              }}>
                                <i className="bi bi-x-lg"></i> Reject
                              </button>
                            </div>
                          </td>
                        )}
                        {(userRole === "vendor" || userRole === "admin") && settlementTab === "pending" && p.status === 'Pending' && (
                          <td>
                            <button className="table-btn-cancel" onClick={() => {
                              setSelectedPayoutForCancel(p);
                              setShowCancelModal(true);
                            }}>
                              <i className="bi bi-ban"></i> Cancel
                            </button>
                          </td>
                        )}
                        {(settlementTab === "paid" || settlementTab === "all") && p.status === 'Paid' && (
                          <td>
                            <button
                              className="btn-view-invoice"
                              onClick={() => handleViewInvoice(p)}
                            >
                              <i className="bi bi-receipt"></i> Invoice
                            </button>
                          </td>
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeMenu === "billing" && (
          <div className="view-container">
            <div className="view-header">
              <h2 className="view-title">Invoices & Billing</h2>
              <div className="filter-controls">
                <div className="date-range-display">
                  <span>{dateFrom || "Start"} → {dateTo || "End"}</span>
                  <i className="bi bi-calendar"></i>
                </div>
                <div className="search-box">
                  <input
                    type="text"
                    placeholder="Invoice number"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                  <button><i className="bi bi-search"></i></button>
                </div>
              </div>
            </div>

            <div className="stats-equation-row">
              <div className="tabs-column">
                <div className="tab-group-container">
                  <span className="tab-group-label">Total Invoices</span>
                  <div className="stat-tab active">
                    Total <span>{invoices.length}</span>
                  </div>
                </div>
              </div>
              <div className="equation-column no-math">
                <div className="eq-box">
                  <span className="eq-label">Total Billed Amount</span>
                  <span className="eq-value">{formatCurrency(invoices.reduce((sum, inv) => sum + (inv.amount || 0), 0))}</span>
                </div>
                <div className="eq-box">
                  <span className="eq-label">Paid Amount</span>
                  <span className="eq-value">{formatCurrency(invoices.reduce((sum, inv) => sum + (inv.amount || 0), 0))}</span>
                </div>
              </div>
            </div>

            <div className="table-toolbar">
              <h3>Invoice History</h3>
              <div className="toolbar-actions">
                <i className="bi bi-arrow-clockwise action-icon" onClick={fetchInvoices}></i>
                <button className="btn-clear-filters" onClick={() => { setDateFrom(""); setDateTo(""); setSearchTerm(""); }}>
                  Clear
                </button>
              </div>
            </div>

            <div className="ekart-table-wrapper">
              <table className="ekart-table">
                <thead>
                  <tr>
                    <th><input type="checkbox" /></th>
                    <th>Invoice #</th>
                    <th>Date</th>
                    <th>Amount</th>
                    <th>Status</th>
                    <th>Description</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.length === 0 ? (
                    <tr className="empty-row">
                      <td colSpan="7">
                        <div className="empty-state">
                          <i className="bi bi-inbox"></i>
                          <p>No invoices found</p>
                          <span className="empty-subtext">Invoices will appear here once settlements are completed</span>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    invoices.map(inv => (
                      <tr key={inv.id}>
                        <td><input type="checkbox" /></td>
                        <td className="text-blue">INV-{String(inv.id).padStart(6, '0')}</td>
                        <td>{formatDate(inv.processed_at || inv.created_at)}</td>
                        <td>{formatCurrency(inv.amount)}</td>
                        <td>
                          <span className={`status-dot paid`}></span>
                          Paid
                        </td>
                        <td className="desc-text">{inv.description || 'Withdrawal Settlement Invoice'}</td>
                        <td>
                          <button
                            className="btn-view-invoice"
                            onClick={() => handleViewInvoice(inv)}
                          >
                            <i className="bi bi-receipt"></i> View Invoice
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Withdraw Modal */}
      {showWithdrawModal && (
        <div className="withdraw-modal-overlay" onClick={() => setShowWithdrawModal(false)}>
          <div className="withdraw-modal-large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header-large">
              <h3>Request Withdrawal</h3>
              <button className="modal-close-large" onClick={() => setShowWithdrawModal(false)}>
                <i className="bi bi-x-lg"></i>
              </button>
            </div>

            <div className="modal-body-split">
              <div className="modal-left-balance">
                <div className="balance-card-large">
                  <div className="balance-icon">
                    <i className="bi bi-wallet2"></i>
                  </div>
                  <div className="balance-amount-large">
                    <span>Available Balance</span>
                    <h2>{formatCurrency(balance)}</h2>
                  </div>
                </div>

                <div className="withdrawal-info">
                  <div className="info-item">
                    <i className="bi bi-clock-history"></i>
                    <div>
                      <strong>Processing Time</strong>
                      <p>2-3 business days</p>
                    </div>
                  </div>
                  <div className="info-item">
                    <i className="bi bi-shield-check"></i>
                    <div>
                      <strong>Secure Transaction</strong>
                      <p>128-bit encrypted</p>
                    </div>
                  </div>
                  <div className="info-item">
                    <i className="bi bi-graph-up"></i>
                    <div>
                      <strong>Minimum Withdrawal</strong>
                      <p>₹100</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="modal-right-form">
                <form onSubmit={handleRequestPayout} className="withdraw-form-scrollable">
                  {savedBankAccounts.length > 0 && (
                    <div className="form-section">
                      <label className="form-label">
                        <i className="bi bi-bank"></i> Saved Bank Accounts
                      </label>
                      <div className="saved-accounts-list-scrollable">
                        {savedBankAccounts.map((account, index) => (
                          <div
                            key={account.id}
                            className={`saved-account-card ${selectedBankAccount === account.id ? 'selected' : ''}`}
                            onClick={() => handleBankAccountSelect(account)}
                          >
                            <div className="account-radio">
                              <input
                                type="radio"
                                name="savedAccount"
                                checked={selectedBankAccount === account.id}
                                onChange={() => handleBankAccountSelect(account)}
                              />
                            </div>
                            <div className="account-details">
                              <div className="account-bank-name">
                                <i className="bi bi-bank"></i>
                                <strong>Account {index + 1}</strong>
                              </div>
                              <div className="account-info">
                                {formatBankDetailsShort(account.bank_details)}
                              </div>
                              <div className="account-full-details">
                                {account.bank_details.substring(0, 80)}...
                              </div>
                            </div>
                            <button
                              type="button"
                              className="delete-account-btn"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteBankAccount(account.id);
                              }}
                              title="Delete this account"
                            >
                              <i className="bi bi-trash"></i>
                            </button>
                          </div>
                        ))}
                        <div
                          className={`saved-account-card new-account-card ${selectedBankAccount === 'new' ? 'selected' : ''}`}
                          onClick={() => handleBankAccountSelect({ id: 'new', bank_details: '' })}
                        >
                          <div className="account-radio">
                            <input
                              type="radio"
                              name="savedAccount"
                              checked={selectedBankAccount === 'new'}
                              onChange={() => handleBankAccountSelect({ id: 'new', bank_details: '' })}
                            />
                          </div>
                          <div className="account-details">
                            <i className="bi bi-plus-circle"></i>
                            <span>Use New Bank Account</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="form-section">
                    <label className="form-label">
                      <i className="bi bi-currency-rupee"></i> Amount to Withdraw
                    </label>
                    <div className="amount-input-wrapper-large">
                      <span className="currency-symbol-large">₹</span>
                      <input
                        type="number"
                        value={amount}
                        onChange={e => setAmount(e.target.value)}
                        max={balance}
                        min="100"
                        step="100"
                        required
                        placeholder="Enter amount"
                      />
                    </div>
                    <div className="quick-amount-buttons">
                      <button type="button" onClick={() => setAmount(Math.min(1000, balance))}>₹1,000</button>
                      <button type="button" onClick={() => setAmount(Math.min(5000, balance))}>₹5,000</button>
                      <button type="button" onClick={() => setAmount(Math.min(10000, balance))}>₹10,000</button>
                      <button type="button" onClick={() => setAmount(Math.min(25000, balance))}>₹25,000</button>
                      <button type="button" onClick={() => setAmount(balance)}>Full Balance</button>
                    </div>
                    <small className="field-hint">Minimum withdrawal: ₹100 | Maximum: {formatCurrency(balance)}</small>
                  </div>

                  <div className="form-section">
                    <label className="form-label">
                      <i className="bi bi-credit-card"></i> Bank Account / UPI Details
                    </label>
                    <textarea
                      className="withdrawl-textarea"
                      value={bankDetails}
                      onChange={e => setBankDetails(e.target.value)}
                      required
                      placeholder="Enter Account Holder Name | Account Number | IFSC Code | Bank Name | UPI ID"
                      rows="4"
                    ></textarea>
                    <small className="field-hint">
                      <i className="bi bi-info-circle"></i>
                      This account will be saved for faster future withdrawals
                    </small>
                  </div>

                  <div className="form-footer">
                    <button type="button" className="btn-cancel-large" onClick={() => setShowWithdrawModal(false)}>
                      Cancel
                    </button>
                    <button type="submit" className="btn-submit-large" disabled={requesting || balance <= 0 || !bankDetails.trim()}>
                      {requesting ? (
                        <>
                          <span className="btn-spinner"></span> Processing...
                        </>
                      ) : (
                        <>
                          <i className="bi bi-check-lg"></i> Submit Withdrawal Request
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Request Modal */}
      {showCancelModal && selectedPayoutForCancel && (
        <div className="modal-overlay" onClick={() => { setShowCancelModal(false); setCancellationReason(""); }}>
          <div className="modal-container" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Cancel Withdrawal Request</h3>
              <button className="modal-close" onClick={() => { setShowCancelModal(false); setCancellationReason(""); }}>
                ✕
              </button>
            </div>
            <div className="modal-body">
              <div className="cancel-info">
                <div className="cancel-amount">
                  <span>Request Amount:</span>
                  <strong>{formatCurrency(selectedPayoutForCancel.amount)}</strong>
                </div>
                <div className="cancel-date">
                  <span>Requested on:</span>
                  <strong>{formatDate(selectedPayoutForCancel.requested_at)}</strong>
                </div>
              </div>
              <div className="form-group">
                <label>Reason for Cancellation *</label>
                <textarea
                  value={cancellationReason}
                  onChange={e => setCancellationReason(e.target.value)}
                  placeholder="Please provide a reason for cancelling this withdrawal request..."
                  rows="4"
                  required
                ></textarea>
              </div>
              <div className="warning-note">
                <i className="bi bi-exclamation-triangle-fill"></i>
                <span>This action cannot be undone. The amount will be credited back to your wallet.</span>
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn-cancel" onClick={() => { setShowCancelModal(false); setCancellationReason(""); }}>
                Close
              </button>
              <button type="button" className="btn-danger" onClick={handleCancelRequest} disabled={requesting || !cancellationReason.trim()}>
                {requesting ? (
                  <>
                    <span className="btn-spinner"></span> Processing...
                  </>
                ) : (
                  "Confirm Cancellation"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Withdrawal Invoice Modal */}
      {selectedPayoutForInvoice && (
        <WithdrawalInvoice
          payout={selectedPayoutForInvoice}
          onClose={handleCloseInvoice}
        />
      )}

      {/* Transaction Details Modal */}
      {selectedTransaction && (
        <TransactionDetailsModal
          transaction={selectedTransaction}
          onClose={handleCloseTransactionModal}
        />
      )}
    </div>
  );
};

export default Payouts;
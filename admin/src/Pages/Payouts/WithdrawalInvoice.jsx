import React, { useRef } from 'react';
import './WithdrawalInvoice.css';

const WithdrawalInvoice = ({ payout, onClose }) => {
  const printRef = useRef();

  const handlePrint = () => {
    const printContent = printRef.current;
    const originalTitle = document.title;
    document.title = `Withdrawal_INV-${String(payout.id).padStart(6, '0')}`;
    
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head>
          <title>Withdrawal Invoice INV-${String(payout.id).padStart(6, '0')}</title>
          <link href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.1/font/bootstrap-icons.css" rel="stylesheet">
          <style>
            ${getPrintStyles()}
          </style>
        </head>
        <body>
          ${printContent.innerHTML}
          <script>
            window.onload = () => {
              window.print();
              window.onafterprint = () => window.close();
            };
          </scr` + `ipt>
        </body>
      </html>
    `);
    printWindow.document.close();
    document.title = originalTitle;
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2
    }).format(amount || 0);
  };

  const formatDate = (date) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    });
  };

  const formatDateTime = (date) => {
    if (!date) return '-';
    return new Date(date).toLocaleString('en-IN', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const numberToWords = (num) => {
    const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
    const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
    
    if (num === 0) return 'Zero';
    
    function convert(n) {
      if (n < 10) return ones[n];
      if (n < 20) return teens[n - 10];
      if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? ' ' + ones[n % 10] : '');
      if (n < 1000) return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' ' + convert(n % 100) : '');
      if (n < 100000) return convert(Math.floor(n / 1000)) + ' Thousand' + (n % 1000 ? ' ' + convert(n % 1000) : '');
      if (n < 10000000) return convert(Math.floor(n / 100000)) + ' Lakh' + (n % 100000 ? ' ' + convert(n % 100000) : '');
      return convert(Math.floor(n / 10000000)) + ' Crore' + (n % 10000000 ? ' ' + convert(n % 10000000) : '');
    }
    
    return convert(num);
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'paid': return '#15803d';
      case 'pending': return '#d97706';
      case 'rejected': return '#dc2626';
      case 'cancelled': return '#6b7280';
      default: return '#6b7280';
    }
  };

  const getStatusIcon = (status) => {
    switch (status?.toLowerCase()) {
      case 'paid': return 'bi-check-circle-fill';
      case 'pending': return 'bi-clock-fill';
      case 'rejected': return 'bi-x-circle-fill';
      case 'cancelled': return 'bi-ban-fill';
      default: return 'bi-question-circle-fill';
    }
  };

  return (
    <div className="invoice-modal-overlay" onClick={onClose}>
      <div className="invoice-modal-container" onClick={(e) => e.stopPropagation()}>
        <div className="invoice-modal-header">
          <h3>
            <i className="bi bi-receipt"></i> 
            Invoice
          </h3>
          <div className="invoice-modal-actions">
            <button className="btn-print" onClick={handlePrint}>
              <i className="bi bi-printer"></i> Print / Save PDF
            </button>
            <button className="btn-close-modal" onClick={onClose}>
              <i className="bi bi-x-lg"></i>
            </button>
          </div>
        </div>
        
        <div className="invoice-modal-content" ref={printRef}>
          <div className="payment-invoice">
            {/* Header */}
            <div className="invoice-header">
              <div className="company-info">
                <div className="company-logo">
                  <h1>JAYASTRA</h1>
                  <span>STORE</span>
                </div>
                <div className="company-address">
                  <p><i className="bi bi-geo-alt"></i> 123 Business Street, Tech Park</p>
                  <p>Bangalore - 560001, Karnataka, India</p>
                  <p><i className="bi bi-envelope"></i> accounts@jayastra.com | <i className="bi bi-telephone"></i> +91 98765 43210</p>
                </div>
              </div>
              <div className="invoice-title-area">
                <div className="payment-badge">PAYMENT INVOICE</div>
                <div className="invoice-number">#INV-{String(payout.id).padStart(6, '0')}</div>
              </div>
            </div>

            <div className="divider"></div>

            {/* Status Banner */}
            <div className={`status-banner ${payout.status?.toLowerCase()}`}>
              <i className={`bi ${getStatusIcon(payout.status)}`}></i>
              <span>Payment {payout.status}</span>
            </div>

            {/* Vendor & Payment Details */}
            <div className="details-grid">
              <div className="details-card">
                <h4><i className="bi bi-person-badge"></i> Vendor Details</h4>
                <div className="detail-row">
                  <span>Store Name:</span>
                  <strong>{payout.store_name || payout.vendor_name || 'N/A'}</strong>
                </div>
                <div className="detail-row">
                  <span>Vendor Name:</span>
                  <span>{payout.vendor_name || 'N/A'}</span>
                </div>
                <div className="detail-row">
                  <span>Email:</span>
                  <span>{payout.vendor_email || 'N/A'}</span>
                </div>
                <div className="detail-row">
                  <span>Phone:</span>
                  <span>{payout.vendor_phone || 'N/A'}</span>
                </div>
              </div>

              <div className="details-card">
                <h4><i className="bi bi-credit-card"></i> Payment Details</h4>
                <div className="detail-row">
                  <span>Invoice Date:</span>
                  <span>{formatDate(payout.processed_at || payout.updated_at || payout.requested_at)}</span>
                </div>
                <div className="detail-row">
                  <span>Payment Date:</span>
                  <span>{formatDate(payout.processed_at || payout.updated_at)}</span>
                </div>
                <div className="detail-row">
                  <span>Transaction ID:</span>
                  <span className="text-mono">PYT-{String(payout.id).padStart(6, '0')}</span>
                </div>
                <div className="detail-row">
                  <span>Request ID:</span>
                  <span className="text-mono">REQ-{String(payout.id).padStart(6, '0')}</span>
                </div>
              </div>
            </div>

            {/* Amount Section */}
            <div className="amount-section">
              <div className="amount-card">
                <div className="amount-label">Withdrawal Amount</div>
                <div className="amount-value">{formatCurrency(payout.amount)}</div>
                <div className="amount-words">
                  {numberToWords(Math.floor(payout.amount))} Rupees Only
                </div>
              </div>
            </div>

            {/* Bank Details */}
            <div className="bank-details-section">
              <h4><i className="bi bi-bank2"></i> Credited To Bank Account</h4>
              <div className="bank-details-card">
                {payout.bank_details ? (
                  <div className="bank-details-content">
                    {payout.bank_details.split('\n').map((line, idx) => (
                      <p key={idx}>{line}</p>
                    ))}
                  </div>
                ) : (
                  <p className="no-details">Bank details not available</p>
                )}
              </div>
            </div>

            {/* Payment Timeline */}
            <div className="timeline-section">
              <h4><i className="bi bi-clock-history"></i> Payment Timeline</h4>
              <div className="timeline">
                <div className="timeline-item">
                  <div className="timeline-icon">
                    <i className="bi bi-calendar-plus"></i>
                  </div>
                  <div className="timeline-content">
                    <div className="timeline-title">Request Submitted</div>
                    <div className="timeline-date">{formatDateTime(payout.requested_at)}</div>
                  </div>
                </div>
                
                {payout.processed_at && (
                  <div className="timeline-item completed">
                    <div className="timeline-icon">
                      <i className="bi bi-check-circle-fill"></i>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="invoice-footer">
              <div className="footer-note">
                <p><i className="bi bi-check-circle"></i> This is a system generated payment invoice and requires no signature.</p>
                <p><i className="bi bi-envelope-paper"></i> For any queries, please contact accounts@jayastra.com</p>
              </div>
              <div className="footer-generated">
                <p>Generated on: {formatDateTime(new Date())}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const getPrintStyles = () => `
  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }
  
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
    background: white;
    padding: 20px;
  }
  
  .payment-invoice {
    max-width: 800px;
    margin: 0 auto;
    background: white;
    border-radius: 16px;
    padding: 30px;
  }
  
  @media print {
    body {
      padding: 0;
      margin: 0;
    }
    .payment-invoice {
      padding: 20px;
      box-shadow: none;
    }
    .invoice-modal-actions {
      display: none;
    }
  }
  
  .invoice-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 20px;
    flex-wrap: wrap;
    gap: 20px;
  }
  
  .company-logo h1 {
    color: #8E2139;
    font-size: 28px;
    margin: 0;
    letter-spacing: 2px;
  }
  
  .company-logo span {
    color: #666;
    font-size: 11px;
    letter-spacing: 3px;
  }
  
  .company-address {
    margin-top: 8px;
    font-size: 11px;
    color: #666;
    line-height: 1.5;
  }
  
  .company-address p {
    margin: 2px 0;
  }
  
  .company-address i {
    font-size: 10px;
    margin-right: 4px;
    color: #8E2139;
  }
  
  .invoice-title-area {
    text-align: right;
  }
  
  .payment-badge {
    background: #8E2139;
    color: white;
    padding: 6px 18px;
    border-radius: 30px;
    font-size: 12px;
    font-weight: 600;
    letter-spacing: 1px;
    margin-bottom: 8px;
  }
  
  .invoice-number {
    font-size: 16px;
    font-weight: 600;
    color: #333;
  }
  
  .divider {
    height: 2px;
    background: linear-gradient(90deg, #8E2139, #e0e0e0);
    margin: 20px 0;
  }
  
  .status-banner {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    padding: 12px;
    border-radius: 10px;
    margin-bottom: 25px;
    font-weight: 600;
    font-size: 14px;
  }
  
  .status-banner.paid {
    background: #f0fdf4;
    color: #15803d;
    border: 1px solid #86efac;
  }
  
  .status-banner.pending {
    background: #fffbeb;
    color: #d97706;
    border: 1px solid #fde68a;
  }
  
  .status-banner.rejected {
    background: #fef2f2;
    color: #dc2626;
    border: 1px solid #fecaca;
  }
  
  .status-banner.cancelled {
    background: #f3f4f6;
    color: #6b7280;
    border: 1px solid #d1d5db;
  }
  
  .status-banner i {
    font-size: 18px;
  }
  
  .details-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 20px;
    margin-bottom: 25px;
  }
  
  .details-card {
    background: #f8fafc;
    border-radius: 12px;
    padding: 16px;
  }
  
  .details-card h4 {
    color: #8E2139;
    font-size: 14px;
    margin-bottom: 12px;
    display: flex;
    align-items: center;
    gap: 6px;
  }
  
  .detail-row {
    display: flex;
    justify-content: space-between;
    padding: 6px 0;
    font-size: 12px;
    border-bottom: 1px dashed #e2e8f0;
  }
  
  .detail-row:last-child {
    border-bottom: none;
  }
  
  .detail-row span:first-child {
    color: #64748b;
  }
  
  .detail-row strong,
  .detail-row span:last-child {
    color: #1e293b;
    font-weight: 500;
  }
  
  .text-mono {
    font-family: monospace;
    font-size: 11px;
  }
  
  .amount-section {
    margin-bottom: 25px;
  }
  
  .amount-card {
    background: linear-gradient(135deg, #8E2139 0%, #6b192b 100%);
    border-radius: 16px;
    padding: 24px;
    text-align: center;
    color: white;
  }
  
  .amount-label {
    font-size: 13px;
    opacity: 0.8;
    margin-bottom: 8px;
    letter-spacing: 1px;
  }
  
  .amount-value {
    font-size: 36px;
    font-weight: 700;
    margin-bottom: 10px;
  }
  
  .amount-words {
    font-size: 11px;
    opacity: 0.8;
    border-top: 1px solid rgba(255,255,255,0.2);
    padding-top: 10px;
    margin-top: 5px;
  }
  
  .bank-details-section {
    margin-bottom: 25px;
  }
  
  .bank-details-section h4 {
    color: #1e293b;
    font-size: 14px;
    margin-bottom: 12px;
    display: flex;
    align-items: center;
    gap: 6px;
  }
  
  .bank-details-card {
    background: #f0f9ff;
    border-radius: 12px;
    padding: 16px;
    border: 1px solid #bae6fd;
  }
  
  .bank-details-content p {
    font-size: 13px;
    margin: 5px 0;
    color: #075985;
    font-family: monospace;
  }
  
  .no-details {
    color: #94a3b8;
    font-style: italic;
    font-size: 12px;
  }
  
  .timeline-section {
    margin-bottom: 25px;
  }
  
  .timeline-section h4 {
    color: #1e293b;
    font-size: 14px;
    margin-bottom: 15px;
    display: flex;
    align-items: center;
    gap: 6px;
  }
  
  .timeline {
    position: relative;
    padding-left: 30px;
  }
  
  .timeline::before {
    content: '';
    position: absolute;
    left: 10px;
    top: 0;
    bottom: 0;
    width: 2px;
    background: #e2e8f0;
  }
  
  .timeline-item {
    position: relative;
    padding-bottom: 20px;
    display: flex;
    gap: 15px;
  }
  
  .timeline-item:last-child {
    padding-bottom: 0;
  }
  
  .timeline-icon {
    position: absolute;
    left: -30px;
    width: 24px;
    height: 24px;
    background: white;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #94a3b8;
    font-size: 12px;
  }
  
  .timeline-item.completed .timeline-icon {
    color: #15803d;
  }
  
  .timeline-content {
    flex: 1;
  }
  
  .timeline-title {
    font-size: 13px;
    font-weight: 600;
    color: #1e293b;
    margin-bottom: 4px;
  }
  
  .timeline-date {
    font-size: 11px;
    color: #64748b;
  }
  
  .invoice-footer {
    margin-top: 25px;
    padding-top: 20px;
    border-top: 1px solid #e2e8f0;
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: 15px;
  }
  
  .footer-note p {
    font-size: 10px;
    color: #94a3b8;
    margin: 3px 0;
  }
  
  .footer-note i {
    font-size: 10px;
    margin-right: 4px;
  }
  
  .footer-generated p {
    font-size: 9px;
    color: #cbd5e1;
  }
  
  @media (max-width: 600px) {
    .payment-invoice {
      padding: 20px;
    }
    
    .details-grid {
      grid-template-columns: 1fr;
      gap: 15px;
    }
    
    .invoice-header {
      flex-direction: column;
      text-align: center;
    }
    
    .invoice-title-area {
      text-align: center;
    }
    
    .company-address {
      text-align: center;
    }
    
    .amount-value {
      font-size: 28px;
    }
    
    .invoice-footer {
      flex-direction: column;
      text-align: center;
    }
  }
`;

export default WithdrawalInvoice;
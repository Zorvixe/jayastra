import axios from 'axios';

// Evolution API configuration - SINGLE INSTANCE for all vendors
const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL || 'http://localhost:8080';
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY || 'JAYASTRA_SECRET_KEY_2026';
const EVOLUTION_INSTANCE = process.env.EVOLUTION_INSTANCE || 'jayastra_business';

// Send WhatsApp message to ANY phone number using your single business instance
const sendWhatsAppViaEvolution = async (toNumber, message) => {
  try {
    // Format phone number (support any Indian number)
    let formattedNumber = toNumber.toString().replace(/\D/g, '');
    if (formattedNumber.length === 10) {
      formattedNumber = `91${formattedNumber}`;
    }
    
    console.log(`Sending WhatsApp from business number to: ${formattedNumber}`);
    console.log(`Message preview: ${message.substring(0, 100)}...`);
    
    const response = await axios({
      method: 'POST',
      url: `${EVOLUTION_API_URL}/message/send`,
      headers: {
        'apikey': EVOLUTION_API_KEY,
        'Content-Type': 'application/json',
      },
      data: {
        instanceName: EVOLUTION_INSTANCE,
        number: formattedNumber,
        textMessage: message
      }
    });
    
    if (response.data && response.data.status === 'success') {
      console.log(`✅ WhatsApp sent successfully to ${toNumber}`);
      return { success: true, messageId: response.data.key?.id };
    } else {
      console.log('Evolution API response:', response.data);
      throw new Error(response.data?.error || 'Unknown error');
    }
  } catch (error) {
    console.error('❌ Evolution API error:', error.response?.data || error.message);
    return { success: false, error: error.message };
  }
};

// Main WhatsApp sending function - NOW WORKS WITH ANY VENDOR NUMBER
export const sendWhatsAppNotification = async (toNumber, message) => {
  if (!toNumber) {
    return { success: false, error: 'No phone number provided' };
  }
  
  if (EVOLUTION_API_URL && EVOLUTION_API_KEY) {
    return await sendWhatsAppViaEvolution(toNumber, message);
  } else {
    console.warn('⚠️ Evolution API not configured - using test mode');
    console.log(`📱 [TEST MODE] Would send WhatsApp to ${toNumber}: ${message.substring(0, 100)}...`);
    return { success: true, error: null, testMode: true };
  }
};

// Check instance connection status
export const checkWhatsAppConnection = async () => {
  try {
    const response = await axios({
      method: 'GET',
      url: `${EVOLUTION_API_URL}/instance/connectionState/${EVOLUTION_INSTANCE}`,
      headers: { 'apikey': EVOLUTION_API_KEY }
    });
    return response.data;
  } catch (error) {
    console.error('Connection check failed:', error.message);
    return { connected: false };
  }
};

// Send order notification to vendor - NO INSTANCE CREATION NEEDED
export const sendVendorOrderNotification = async (orderId, vendorId, orderDetails) => {
  try {
    console.log(`Processing WhatsApp notification for Vendor ${vendorId}, Order #${orderId}`);
    
    // Check if vendor has WhatsApp notifications enabled
    const settingsResult = await pool.query(
      `SELECT enabled, send_on_new_order, send_on_status_update, whatsapp_number 
       FROM vendor_whatsapp_settings 
       WHERE vendor_id = $1`,
      [vendorId]
    );
    
    let shouldSend = true;
    let vendorPhone = null;
    
    // Get vendor's phone number
    const vendorResult = await pool.query(
      'SELECT phone, store_name, name FROM users WHERE id = $1',
      [vendorId]
    );
    
    if (vendorResult.rows.length === 0) {
      console.log(`Vendor ${vendorId} not found`);
      return { success: false, error: 'Vendor not found' };
    }
    
    vendorPhone = vendorResult.rows[0].phone;
    const vendor = vendorResult.rows[0];
    
    if (!vendorPhone) {
      console.log(`Vendor ${vendorId} has no phone number`);
      return { success: false, error: 'Vendor phone number missing' };
    }
    
    console.log(`Vendor phone: ${vendorPhone}`);
    
    // Check settings if exist
    if (settingsResult.rows.length > 0) {
      const settings = settingsResult.rows[0];
      shouldSend = settings.enabled;
      
      if (orderDetails.status && !settings.send_on_status_update) {
        shouldSend = false;
        console.log(`Vendor ${vendorId} disabled status update notifications`);
      }
      if (!orderDetails.status && !settings.send_on_new_order) {
        shouldSend = false;
        console.log(`Vendor ${vendorId} disabled new order notifications`);
      }
    }
    
    if (!shouldSend) {
      console.log(`Vendor ${vendorId} has disabled WhatsApp notifications`);
      return { success: false, error: 'Notifications disabled' };
    }
    
    // Create message based on notification type
    let message = '';
    
    if (orderDetails.status) {
      // Status update notification
      let statusIcon = '';
      let statusMessage = '';
      
      switch(orderDetails.status) {
        case 'Processing':
          statusIcon = '⚙️';
          statusMessage = 'Your order is being processed. We will update you once it is shipped.';
          break;
        case 'Shipped':
          statusIcon = '🚚';
          statusMessage = 'Great news! Your order has been shipped and is on its way to the customer.';
          break;
        case 'Out for Delivery':
          statusIcon = '🚛';
          statusMessage = 'The order is out for delivery and will reach the customer soon.';
          break;
        case 'Delivered':
          statusIcon = '✅';
          statusMessage = 'The order has been successfully delivered to the customer. Earnings have been added to your wallet.';
          break;
        default:
          statusIcon = '📦';
          statusMessage = `Order status updated to: ${orderDetails.status}`;
      }
      
      const itemsList = orderDetails.items.map(item => 
        `• ${item.product_name || item.name}${item.product_code ? ` (${item.product_code})` : ''} x ${item.quantity} = ₹${(parseFloat(item.price) * parseInt(item.quantity)).toFixed(2)}`
      ).join('\n');
      
      message = `${statusIcon} *ORDER STATUS UPDATE* ${statusIcon}

Dear *${vendor.store_name || vendor.name}*,

Order #${orderId} status has been updated to: *${orderDetails.status}*

${statusMessage}

📋 *Order Details:*
${itemsList}

💰 *Order Total:* ₹${orderDetails.vendor_order_amount?.toFixed(2) || '0.00'}
👤 *Customer:* ${orderDetails.customer_name || 'N/A'}
📞 *Customer Contact:* ${orderDetails.customer_phone || 'N/A'}

${orderDetails.status === 'Delivered' ? '💵 *Earnings have been credited to your wallet balance.*' : ''}

Thank you for being a valued seller on JAYASTRA!

---
JAYASTRA Store Support`;
    } else {
      // New order notification
      const itemsList = orderDetails.items.map(item => 
        `• ${item.name} x ${item.quantity} = ₹${(item.price * item.quantity).toFixed(2)}`
      ).join('\n');
      
      message = `🛍️ *NEW ORDER ALERT!* 🛍️

Dear *${vendor.store_name || vendor.name}*,

You have received a new order!

📦 *Order ID:* #${orderId}
💰 *Your Products Total:* ₹${orderDetails.vendor_order_amount?.toFixed(2) || '0.00'}
📅 *Date:* ${new Date().toLocaleString('en-IN')}

🛒 *Items from your store:*
${itemsList}

${orderDetails.customer_name ? `👤 *Customer:* ${orderDetails.customer_name}` : ''}
${orderDetails.customer_phone ? `📞 *Customer Phone:* ${orderDetails.customer_phone}` : ''}

Please log in to your vendor dashboard to process this order.

Thank you,
JAYASTRA Team`;
    }

    // Send WhatsApp message - USING SINGLE BUSINESS NUMBER TO SEND TO VENDOR
    const result = await sendWhatsAppNotification(vendorPhone, message);
    
    // Log notification
    await pool.query(
      `INSERT INTO whatsapp_notifications (order_id, vendor_id, phone_number, message, status, sent_at, error)
       VALUES ($1, $2, $3, $4, $5, NOW(), $6)`,
      [orderId, vendorId, vendorPhone, message, result.success ? 'sent' : 'failed', result.error || null]
    );

    console.log(`WhatsApp notification result for vendor ${vendorId}: ${result.success ? 'SUCCESS' : 'FAILED - ' + result.error}`);
    return result;
  } catch (error) {
    console.error('Vendor order notification error:', error);
    return { success: false, error: error.message };
  }
};

// Send order notification to all vendors in an order
export const sendOrderNotificationsToVendors = async (orderId, orderItems) => {
  console.log(`Starting WhatsApp notifications for order #${orderId} with ${orderItems.length} items`);
  
  // Group items by vendor
  const vendorItemsMap = new Map();
  
  for (const item of orderItems) {
    if (item.vendor_id) {
      if (!vendorItemsMap.has(item.vendor_id)) {
        vendorItemsMap.set(item.vendor_id, []);
      }
      vendorItemsMap.get(item.vendor_id).push(item);
    }
  }

  console.log(`Sending notifications to ${vendorItemsMap.size} vendors for order #${orderId}`);
  
  // Send notification to each vendor (using the same business WhatsApp number)
  const results = [];
  for (const [vendorId, items] of vendorItemsMap) {
    const vendorOrderAmount = items.reduce((sum, item) => sum + (parseFloat(item.price) * parseInt(item.quantity)), 0);
    
    const result = await sendVendorOrderNotification(orderId, vendorId, {
      items,
      vendor_order_amount: vendorOrderAmount,
      customer_name: items[0]?.customer_name,
      customer_phone: items[0]?.customer_phone
    });
    
    results.push({ vendorId, ...result });
  }
  
  console.log(`Completed WhatsApp notifications for order #${orderId}`);
  return results;
};
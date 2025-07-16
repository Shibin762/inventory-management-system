// backend/src/services/emailService.js
const sgMail = require('@sendgrid/mail');
const logger = require('../middleware/logger');

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const emailService = {
  sendLowStockAlert: async (product) => {
    const msg = {
      to: process.env.MANAGER_EMAIL,
      from: 'inventory@techsupplypro.com',
      subject: `Low Stock Alert: ${product.name}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #dc3545;">Low Stock Alert</h2>
          <p>The following product is running low on stock:</p>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px; border: 1px solid #ddd;"><strong>Product:</strong></td>
              <td style="padding: 8px; border: 1px solid #ddd;">${product.name}</td>
            </tr>
            <tr>
              <td style="padding: 8px; border: 1px solid #ddd;"><strong>SKU:</strong></td>
              <td style="padding: 8px; border: 1px solid #ddd;">${product.sku}</td>
            </tr>
            <tr>
              <td style="padding: 8px; border: 1px solid #ddd;"><strong>Current Stock:</strong></td>
              <td style="padding: 8px; border: 1px solid #ddd;">${product.quantity_in_stock}</td>
            </tr>
            <tr>
              <td style="padding: 8px; border: 1px solid #ddd;"><strong>Reorder Level:</strong></td>
              <td style="padding: 8px; border: 1px solid #ddd;">${product.reorder_level}</td>
            </tr>
          </table>
          <p style="margin-top: 20px;">
            <a href="${process.env.APP_URL}/products/${product.id}" 
               style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px;">
              View Product
            </a>
          </p>
        </div>
      `
    };
    
    try {
      await sgMail.send(msg);
      logger.info(`Low stock alert sent for product: ${product.sku}`);
    } catch (error) {
      logger.error(`Failed to send low stock alert: ${error.message}`);
    }
  },
  
  sendOrderConfirmation: async (order, recipient) => {
    const msg = {
      to: recipient,
      from: 'inventory@techsupplypro.com',
      subject: `Order Confirmation: ${order.order_number}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #28a745;">Order Confirmation</h2>
          <p>Your purchase order has been created successfully.</p>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px; border: 1px solid #ddd;"><strong>Order Number:</strong></td>
              <td style="padding: 8px; border: 1px solid #ddd;">${order.order_number}</td>
            </tr>
            <tr>
              <td style="padding: 8px; border: 1px solid #ddd;"><strong>Supplier:</strong></td>
              <td style="padding: 8px; border: 1px solid #ddd;">${order.supplier_name}</td>
            </tr>
            <tr>
              <td style="padding: 8px; border: 1px solid #ddd;"><strong>Total Amount:</strong></td>
              <td style="padding: 8px; border: 1px solid #ddd;">$${order.total_amount}</td>
            </tr>
            <tr>
              <td style="padding: 8px; border: 1px solid #ddd;"><strong>Expected Delivery:</strong></td>
              <td style="padding: 8px; border: 1px solid #ddd;">${order.expected_delivery}</td>
            </tr>
          </table>
        </div>
      `
    };
    
    try {
      await sgMail.send(msg);
      logger.info(`Order confirmation sent for: ${order.order_number}`);
    } catch (error) {
      logger.error(`Failed to send order confirmation: ${error.message}`);
    }
  },
  
  sendDailyReport: async (reportData) => {
    const msg = {
      to: process.env.MANAGER_EMAIL,
      from: 'inventory@techsupplypro.com',
      subject: `Daily Inventory Report - ${new Date().toLocaleDateString()}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Daily Inventory Report</h2>
          <h3>Summary</h3>
          <ul>
            <li>Total Products: ${reportData.totalProducts}</li>
            <li>Low Stock Items: ${reportData.lowStockItems}</li>
            <li>Out of Stock Items: ${reportData.outOfStockItems}</li>
            <li>Total Inventory Value: $${reportData.totalInventoryValue.toFixed(2)}</li>
          </ul>
          <h3>Actions Required</h3>
          ${reportData.lowStockProducts.length > 0 ? `
            <p>The following products need reordering:</p>
            <ul>
              ${reportData.lowStockProducts.map(p => `
                <li>${p.name} (${p.sku}) - Current: ${p.quantity_in_stock}, Reorder Level: ${p.reorder_level}</li>
              `).join('')}
            </ul>
          ` : '<p>No immediate actions required.</p>'}
        </div>
      `
    };
    
    try {
      await sgMail.send(msg);
      logger.info('Daily report sent successfully');
    } catch (error) {
      logger.error(`Failed to send daily report: ${error.message}`);
    }
  }
};

module.exports = emailService;
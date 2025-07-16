const { WebClient } = require('@slack/web-api');
const logger = require('../middleware/logger');

const slack = new WebClient(process.env.SLACK_TOKEN);
const channel = process.env.SLACK_CHANNEL || '#inventory-alerts';

const slackService = {
  sendAlert: async (message, type = 'info') => {
    const colors = {
      info: '#0099ff',
      warning: '#ffcc00',
      error: '#ff0000',
      success: '#00ff00'
    };
    
    try {
      await slack.chat.postMessage({
        channel: channel,
        attachments: [{
          color: colors[type] || colors.info,
          text: message,
          footer: 'Inventory Management System',
          ts: Math.floor(Date.now() / 1000)
        }]
      });
      logger.info(`Slack alert sent: ${message}`);
    } catch (error) {
      logger.error(`Failed to send Slack alert: ${error.message}`);
    }
  },
  
  sendLowStockAlert: async (product) => {
    const message = `Low Stock Alert: ${product.name} (${product.sku}) - Current stock: ${product.quantity_in_stock}, Reorder level: ${product.reorder_level}`;
    await slackService.sendAlert(message, 'warning');
  },
  
  sendOrderNotification: async (order) => {
    const message = `New Purchase Order Created: ${order.order_number} - Supplier: ${order.supplier_name}, Total: $${order.total_amount}`;
    await slackService.sendAlert(message, 'info');
  },
  
  sendSystemAlert: async (error) => {
    const message = `System Error: ${error.message}`;
    await slackService.sendAlert(message, 'error');
  }
};

module.exports = slackService;

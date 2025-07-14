const emailService = require('./emailService');
const slackService = require('./slackService');
const logger = require('../middleware/logger');

const alertService = {
  sendLowStockAlert: async (product) => {
    try {
      // Send via multiple channels
      await Promise.all([
        emailService.sendLowStockAlert(product),
        slackService.sendLowStockAlert(product)
      ]);
      
      logger.info(`Low stock alerts sent for product: ${product.sku}`);
    } catch (error) {
      logger.error(`Alert service error: ${error.message}`);
    }
  },
  


  
  sendOrderAlert: async (order) => {
    try {
      await Promise.all([
        emailService.sendOrderConfirmation(order, order.supplier_email),
        slackService.sendOrderNotification(order)
      ]);
      
      logger.info(`Order alerts sent for: ${order.order_number}`);
    } catch (error) {
      logger.error(`Order alert error: ${error.message}`);
    }
  },
  
  sendSystemAlert: async (error, context) => {
    try {
      await slackService.sendSystemAlert({
        message: error.message,
        context: context,
        stack: error.stack
      });
      
      logger.error(`System alert sent: ${error.message}`);
    } catch (alertError) {
      logger.error(`Failed to send system alert: ${alertError.message}`);
    }
  }
};



module.exports = alertService;
// This could be run as a cron job
const db = require('../config/database');
const emailService = require('../services/emailService');
const { calculateStockValue } = require('../utils/stockCalculations');

async function generateDailyReport() {
  try {
    // Get statistics
    const stats = {};
    
    // Total products
    const productCount = await new Promise((resolve, reject) => {
      db.get('SELECT COUNT(*) as count FROM products WHERE is_active = 1', (err, row) => {
        if (err) reject(err);
        else resolve(row.count);
      });
    });
    stats.totalProducts = productCount;
    
    // Low stock items
    const lowStockProducts = await new Promise((resolve, reject) => {
      db.all(
        'SELECT * FROM products WHERE is_active = 1 AND quantity_in_stock <= reorder_level',
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });
    stats.lowStockItems = lowStockProducts.length;
    stats.lowStockProducts = lowStockProducts;
    
    // Out of stock items
    const outOfStockCount = await new Promise((resolve, reject) => {
      db.get(
        'SELECT COUNT(*) as count FROM products WHERE is_active = 1 AND quantity_in_stock = 0',
        (err, row) => {
          if (err) reject(err);
          else resolve(row.count);
        }
      );
    });
    stats.outOfStockItems = outOfStockCount;
    
    // Total inventory value
    const products = await new Promise((resolve, reject) => {
      db.all('SELECT unit_price, quantity_in_stock FROM products WHERE is_active = 1', (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
    stats.totalInventoryValue = calculateStockValue(products);
    
    // Send email report
    await emailService.sendDailyReport(stats);
    
    console.log('Daily report sent successfully');
  } catch (error) {
    console.error('Error generating daily report:', error);
  }
}

// Run if called directly
if (require.main === module) {
  generateDailyReport().then(() => {
    process.exit(0);
  });
}

module.exports = generateDailyReport;
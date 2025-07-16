const db = require('../config/database');
const { calculateStockValue } = require('../utils/stockCalculations');

exports.getStats = async (req, res, next) => {
  try {
    const stats = {};
    
    // Total products
    const productCount = await new Promise((resolve, reject) => {
      db.get('SELECT COUNT(*) as count FROM products WHERE is_active = 1', (err, row) => {
        if (err) reject(err);
        else resolve(row ? row.count : 0);
      });
    });
    stats.totalProducts = productCount;
    
    // Low stock items
    const lowStockCount = await new Promise((resolve, reject) => {
      db.get(
        'SELECT COUNT(*) as count FROM products WHERE is_active = 1 AND quantity_in_stock <= reorder_level',
        (err, row) => {
          if (err) reject(err);
          else resolve(row ? row.count : 0);
        }
      );
    });
    stats.lowStockItems = lowStockCount;
    
    // Out of stock items
    const outOfStockCount = await new Promise((resolve, reject) => {
      db.get(
        'SELECT COUNT(*) as count FROM products WHERE is_active = 1 AND quantity_in_stock = 0',
        (err, row) => {
          if (err) reject(err);
          else resolve(row ? row.count : 0);
        }
      );
    });
    stats.outOfStockItems = outOfStockCount;
    
    // Total inventory value
    const products = await new Promise((resolve, reject) => {
      db.all('SELECT unit_price, quantity_in_stock FROM products WHERE is_active = 1', (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      });
    });
    stats.totalInventoryValue = calculateStockValue(products);
    
    // Active suppliers
    const supplierCount = await new Promise((resolve, reject) => {
      db.get('SELECT COUNT(*) as count FROM suppliers WHERE is_active = 1', (err, row) => {
        if (err) reject(err);
        else resolve(row ? row.count : 0);
      });
    });
    stats.activeSuppliers = supplierCount;
    
    // Pending orders
    const pendingOrderCount = await new Promise((resolve, reject) => {
      db.get(
        'SELECT COUNT(*) as count FROM purchase_orders WHERE status = ?',
        ['pending'],
        (err, row) => {
          if (err) reject(err);
          else resolve(row ? row.count : 0);
        }
      );
    });
    stats.pendingOrders = pendingOrderCount;
    
    // Recent activity
    const recentActivity = await new Promise((resolve, reject) => {
      db.all(
        `SELECT 'Stock Movement' as type, sm.created_at, p.name as item_name, u.username
         FROM stock_movements sm
         JOIN products p ON sm.product_id = p.id
         JOIN users u ON sm.created_by = u.id
         ORDER BY sm.created_at DESC
         LIMIT 10`,
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows || []);
        }
      );
    });
    stats.recentActivity = recentActivity;
    
    res.json(stats);
  } catch (error) {
    next(error);
  }
};

exports.getChartData = async (req, res, next) => {
  try {
    const { type } = req.query;
    
    switch (type) {
      case 'stock-levels':
        db.all(
          `SELECT c.name as category, SUM(p.quantity_in_stock) as total_stock
           FROM products p
           JOIN categories c ON p.category_id = c.id
           WHERE p.is_active = 1
           GROUP BY c.id`,
          (err, rows) => {
            if (err) return next(err);
            res.json(rows || []);
          }
        );
        break;
        
      case 'monthly-orders':
        db.all(
          `SELECT strftime('%Y-%m', order_date) as month, COUNT(*) as order_count, SUM(total_amount) as total_value
           FROM purchase_orders
           WHERE order_date >= date('now', '-12 months')
           GROUP BY month
           ORDER BY month`,
          (err, rows) => {
            if (err) return next(err);
            res.json(rows || []);
          }
        );
        break;
        
      default:
        res.status(400).json({ error: 'Invalid chart type' });
    }
  } catch (error) {
    next(error);
  }
};
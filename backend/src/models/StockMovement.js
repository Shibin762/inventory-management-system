const db = require('../config/database');

class StockMovement {
  static async create(movementData) {
    const { product_id, movement_type, quantity, reference_type, reference_id, notes, created_by } = movementData;
    
    return new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO stock_movements (product_id, movement_type, quantity, reference_type, reference_id, notes, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [product_id, movement_type, quantity, reference_type, reference_id, notes, created_by],
        function(err) {
          if (err) reject(err);
          else resolve({ id: this.lastID, ...movementData });
        }
      );
    });
  }
  
  static async findByProduct(productId, limit = 100) {
    return new Promise((resolve, reject) => {
      db.all(
        `SELECT sm.*, u.username as created_by_name
         FROM stock_movements sm
         JOIN users u ON sm.created_by = u.id
         WHERE sm.product_id = ?
         ORDER BY sm.created_at DESC
         LIMIT ?`,
        [productId, limit],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });
  }
  
  static async getRecent(limit = 50) {
    return new Promise((resolve, reject) => {
      db.all(
        `SELECT sm.*, p.name as product_name, p.sku, u.username as created_by_name
         FROM stock_movements sm
         JOIN products p ON sm.product_id = p.id
         JOIN users u ON sm.created_by = u.id
         ORDER BY sm.created_at DESC
         LIMIT ?`,
        [limit],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });
  }
}

module.exports = StockMovement;
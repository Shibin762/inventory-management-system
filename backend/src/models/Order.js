const db = require('../config/database');
const { generateOrderNumber } = require('../utils/helpers');

class Order {
  static async findAll(filters = {}) {
    let query = `
      SELECT po.*, s.name as supplier_name, u.username as created_by_name
      FROM purchase_orders po
      JOIN suppliers s ON po.supplier_id = s.id
      JOIN users u ON po.created_by = u.id
      WHERE 1=1
    `;
    const params = [];
    
    if (filters.status) {
      query += ' AND po.status = ?';
      params.push(filters.status);
    }
    
    if (filters.supplier_id) {
      query += ' AND po.supplier_id = ?';
      params.push(filters.supplier_id);
    }
    
    query += ' ORDER BY po.order_date DESC';
    
    return new Promise((resolve, reject) => {
      db.all(query, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }
  
  static async findById(id) {
    return new Promise((resolve, reject) => {
      db.get(
        `SELECT po.*, s.name as supplier_name, u.username as created_by_name
         FROM purchase_orders po
         JOIN suppliers s ON po.supplier_id = s.id
         JOIN users u ON po.created_by = u.id
         WHERE po.id = ?`,
        [id],
        (err, order) => {
          if (err) reject(err);
          else if (!order) resolve(null);
          else {
            // Get order items
            db.all(
              `SELECT oi.*, p.name as product_name, p.sku
               FROM order_items oi
               JOIN products p ON oi.product_id = p.id
               WHERE oi.order_id = ?`,
              [id],
              (err, items) => {
                if (err) reject(err);
                else {
                  order.items = items;
                  resolve(order);
                }
              }
            );
          }
        }
      );
    });
  }
  
  static async create(orderData, userId) {
    const { supplier_id, expected_delivery, notes, items } = orderData;
    const orderNumber = generateOrderNumber();
    const totalAmount = items.reduce((sum, item) => sum + (item.quantity * item.unit_cost), 0);
    
    return new Promise((resolve, reject) => {
      db.serialize(() => {
        db.run('BEGIN TRANSACTION');
        
        db.run(
          `INSERT INTO purchase_orders (order_number, supplier_id, expected_delivery, total_amount, notes, created_by)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [orderNumber, supplier_id, expected_delivery, totalAmount, notes, userId],
          function(err) {
            if (err) {
              db.run('ROLLBACK');
              return reject(err);
            }
            
            const orderId = this.lastID;
            
            // Add order items
            const stmt = db.prepare(
              'INSERT INTO order_items (order_id, product_id, quantity, unit_cost, total_cost) VALUES (?, ?, ?, ?, ?)'
            );
            
            for (const item of items) {
              const totalCost = item.quantity * item.unit_cost;
              stmt.run(orderId, item.product_id, item.quantity, item.unit_cost, totalCost);
            }
            
            stmt.finalize((err) => {
              if (err) {
                db.run('ROLLBACK');
                return reject(err);
              }
              
              db.run('COMMIT');
              resolve({ id: orderId, order_number: orderNumber });
            });
          }
        );
      });
    });
  }
  
  static async updateStatus(id, status) {
    return new Promise((resolve, reject) => {
      db.run(
        'UPDATE purchase_orders SET status = ? WHERE id = ?',
        [status, id],
        function(err) {
          if (err) reject(err);
          else resolve(this.changes > 0);
        }
      );
    });
  }
}

module.exports = Order;
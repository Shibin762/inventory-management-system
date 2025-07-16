// backend/src/models/Product.js
const db = require('../config/database');

class Product {
  static async findAll(filters = {}) {
    let query = 'SELECT * FROM products WHERE is_active = 1';
    const params = [];
    
    if (filters.category_id) {
      query += ' AND category_id = ?';
      params.push(filters.category_id);
    }
    
    if (filters.lowStock) {
      query += ' AND quantity_in_stock <= reorder_level';
    }
    
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
        'SELECT * FROM products WHERE id = ? AND is_active = 1',
        [id],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });
  }
  
  static async findBySku(sku) {
    return new Promise((resolve, reject) => {
      db.get(
        'SELECT * FROM products WHERE sku = ? AND is_active = 1',
        [sku],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });
  }
  
  static async create(productData) {
    const { sku, name, description, category_id, unit_price, quantity_in_stock, reorder_level, reorder_quantity } = productData;
    
    return new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO products (sku, name, description, category_id, unit_price, quantity_in_stock, reorder_level, reorder_quantity)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [sku, name, description, category_id, unit_price, quantity_in_stock || 0, reorder_level || 10, reorder_quantity || 50],
        function(err) {
          if (err) reject(err);
          else resolve({ id: this.lastID, ...productData });
        }
      );
    });
  }
  
  static async update(id, updates) {
    const fields = Object.keys(updates);
    const values = Object.values(updates);
    values.push(id);
    
    const query = `
      UPDATE products 
      SET ${fields.map(f => `${f} = ?`).join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND is_active = 1
    `;
    
    return new Promise((resolve, reject) => {
      db.run(query, values, function(err) {
        if (err) reject(err);
        else resolve(this.changes > 0);
      });
    });
  }
  
  static async adjustStock(id, quantity, type = 'adjustment') {
    return new Promise((resolve, reject) => {
      db.run(
        'UPDATE products SET quantity_in_stock = quantity_in_stock + ? WHERE id = ?',
        [quantity, id],
        function(err) {
          if (err) reject(err);
          else resolve(this.changes > 0);
        }
      );
    });
  }
  
  static async getLowStock() {
    return new Promise((resolve, reject) => {
      db.all(
        'SELECT * FROM products WHERE is_active = 1 AND quantity_in_stock <= reorder_level ORDER BY quantity_in_stock ASC',
        [],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });
  }
}

module.exports = Product;

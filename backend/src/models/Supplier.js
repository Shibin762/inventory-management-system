// backend/src/models/Supplier.js
const db = require('../config/database');

class Supplier {
  static async findAll(filters = {}) {
    let query = 'SELECT * FROM suppliers WHERE 1=1';
    const params = [];
    
    if (filters.active !== undefined) {
      query += ' AND is_active = ?';
      params.push(filters.active ? 1 : 0);
    }
    
    query += ' ORDER BY name ASC';
    
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
        'SELECT * FROM suppliers WHERE id = ?',
        [id],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });
  }
  
  static async create(supplierData) {
    const { name, contact_person, email, phone, address } = supplierData;
    
    return new Promise((resolve, reject) => {
      db.run(
        'INSERT INTO suppliers (name, contact_person, email, phone, address) VALUES (?, ?, ?, ?, ?)',
        [name, contact_person, email, phone, address],
        function(err) {
          if (err) reject(err);
          else resolve({ id: this.lastID, ...supplierData });
        }
      );
    });
  }
  
  static async update(id, updates) {
    const fields = Object.keys(updates);
    const values = Object.values(updates);
    values.push(id);
    
    const query = `UPDATE suppliers SET ${fields.map(f => `${f} = ?`).join(', ')} WHERE id = ?`;
    
    return new Promise((resolve, reject) => {
      db.run(query, values, function(err) {
        if (err) reject(err);
        else resolve(this.changes > 0);
      });
    });
  }
  
  static async getProducts(supplierId) {
    return new Promise((resolve, reject) => {
      db.all(
        `SELECT p.*, ps.cost_price, ps.supplier_sku, ps.lead_time_days
         FROM products p
         JOIN product_suppliers ps ON p.id = ps.product_id
         WHERE ps.supplier_id = ? AND p.is_active = 1`,
        [supplierId],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });
  }
  
  static async linkProduct(supplierId, productId, linkData) {
    const { supplier_sku, cost_price, lead_time_days } = linkData;
    
    return new Promise((resolve, reject) => {
      db.run(
        `INSERT OR REPLACE INTO product_suppliers (product_id, supplier_id, supplier_sku, cost_price, lead_time_days)
         VALUES (?, ?, ?, ?, ?)`,
        [productId, supplierId, supplier_sku, cost_price, lead_time_days],
        function(err) {
          if (err) reject(err);
          else resolve(this.changes > 0);
        }
      );
    });
  }
}

module.exports = Supplier;
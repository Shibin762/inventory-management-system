// backend/src/controllers/supplierController.js
const db = require('../config/database');
const { parsePaginationParams } = require('../utils/helpers');

exports.getSuppliers = (req, res, next) => {
  const { page, limit, offset } = parsePaginationParams(req.query);
  const { search, active } = req.query;
  
  let query = 'SELECT * FROM suppliers WHERE 1=1';
  const params = [];
  
  if (active !== undefined) {
    query += ' AND is_active = ?';
    params.push(active === 'true' ? 1 : 0);
  }
  
  if (search) {
    query += ' AND (name LIKE ? OR contact_person LIKE ? OR email LIKE ?)';
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }
  
  // Count total
  const countQuery = query.replace('SELECT *', 'SELECT COUNT(*) as total');
  
  db.get(countQuery, params, (err, count) => {
    if (err) return next(err);
    
    query += ' ORDER BY name ASC LIMIT ? OFFSET ?';
    params.push(limit, offset);
    
    db.all(query, params, (err, rows) => {
      if (err) return next(err);
      
      res.json({
        suppliers: rows,
        pagination: {
          current_page: page,
          total_pages: Math.ceil(count.total / limit),
          total_items: count.total,
          items_per_page: limit
        }
      });
    });
  });
};

exports.getSupplier = (req, res, next) => {
  db.get(
    'SELECT * FROM suppliers WHERE id = ?',
    [req.params.id],
    (err, row) => {
      if (err) return next(err);
      if (!row) return res.status(404).json({ error: 'Supplier not found' });
      res.json(row);
    }
  );
};

exports.createSupplier = (req, res, next) => {
  const { name, contact_person, email, phone, address } = req.body;
  
  db.run(
    'INSERT INTO suppliers (name, contact_person, email, phone, address) VALUES (?, ?, ?, ?, ?)',
    [name, contact_person, email, phone, address],
    function(err) {
      if (err) return next(err);
      
      // Log to audit
      db.run(
        'INSERT INTO audit_log (table_name, record_id, action, new_values, user_id) VALUES (?, ?, ?, ?, ?)',
        ['suppliers', this.lastID, 'insert', JSON.stringify(req.body), req.user.id]
      );
      
      res.status(201).json({
        id: this.lastID,
        message: 'Supplier created successfully'
      });
    }
  );
};

exports.updateSupplier = (req, res, next) => {
  const supplierId = req.params.id;
  const updates = req.body;
  
  // Get current supplier
  db.get('SELECT * FROM suppliers WHERE id = ?', [supplierId], (err, oldSupplier) => {
    if (err) return next(err);
    if (!oldSupplier) return res.status(404).json({ error: 'Supplier not found' });
    
    const fields = Object.keys(updates).filter(key => 
      ['name', 'contact_person', 'email', 'phone', 'address', 'is_active'].includes(key)
    );
    
    if (fields.length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }
    
    const query = `UPDATE suppliers SET ${fields.map(f => `${f} = ?`).join(', ')} WHERE id = ?`;
    const values = fields.map(f => updates[f]);
    values.push(supplierId);
    
    db.run(query, values, function(err) {
      if (err) return next(err);
      
      // Log to audit
      db.run(
        'INSERT INTO audit_log (table_name, record_id, action, old_values, new_values, user_id) VALUES (?, ?, ?, ?, ?, ?)',
        ['suppliers', supplierId, 'update', JSON.stringify(oldSupplier), JSON.stringify(updates), req.user.id]
      );
      
      res.json({ message: 'Supplier updated successfully' });
    });
  });
};

exports.deleteSupplier = (req, res, next) => {
  const supplierId = req.params.id;
  
  // Soft delete
  db.run('UPDATE suppliers SET is_active = 0 WHERE id = ?', [supplierId], function(err) {
    if (err) return next(err);
    
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Supplier not found' });
    }
    
    // Log deletion
    db.run(
      'INSERT INTO audit_log (table_name, record_id, action, user_id) VALUES (?, ?, ?, ?)',
      ['suppliers', supplierId, 'delete', req.user.id]
    );
    
    res.json({ message: 'Supplier deleted successfully' });
  });
};

exports.getSupplierProducts = (req, res, next) => {
  const query = `
    SELECT p.*, ps.cost_price, ps.supplier_sku, ps.lead_time_days
    FROM products p
    JOIN product_suppliers ps ON p.id = ps.product_id
    WHERE ps.supplier_id = ? AND p.is_active = 1
  `;
  
  db.all(query, [req.params.id], (err, rows) => {
    if (err) return next(err);
    res.json(rows);
  });
};

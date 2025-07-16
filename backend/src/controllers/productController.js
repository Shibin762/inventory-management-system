// backend/src/controllers/productController.js - FIXED VERSION
const db = require('../config/database');
const { parsePaginationParams } = require('../utils/helpers');
const { getStockStatus } = require('../utils/stockCalculations');
const alertService = require('../services/alertService');

exports.getProducts = (req, res, next) => {
  const { page, limit, offset } = parsePaginationParams(req.query);
  const { search, category, lowStock, sortBy = 'name', sortOrder = 'ASC' } = req.query;
  
  let query = `
    SELECT p.*, c.name as category_name 
    FROM products p
    LEFT JOIN categories c ON p.category_id = c.id
    WHERE p.is_active = 1
  `;
  
  const params = [];
  
  if (search) {
    query += ` AND (p.name LIKE ? OR p.description LIKE ? OR p.sku LIKE ?)`;
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }
  
  if (category) {
    query += ` AND p.category_id = ?`;
    params.push(category);
  }
  
  if (lowStock === 'true') {
    query += ` AND p.quantity_in_stock <= p.reorder_level`;
  }
  
  // Count total items - Fixed query
  const countQuery = query.replace(/SELECT.*FROM/, 'SELECT COUNT(*) as total FROM');
  
  db.get(countQuery, params, (err, count) => {
    if (err) return next(err);
    
    // Handle case where count might be null or undefined
    const totalCount = count && count.total ? count.total : 0;
    
    // Add sorting and pagination
    const allowedSortFields = ['name', 'sku', 'unit_price', 'quantity_in_stock', 'created_at'];
    const sortField = allowedSortFields.includes(sortBy) ? sortBy : 'name';
    const order = sortOrder.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';
    
    query += ` ORDER BY p.${sortField} ${order} LIMIT ? OFFSET ?`;
    params.push(limit, offset);
    
    db.all(query, params, (err, rows) => {
      if (err) return next(err);
      
      // Add stock status to each product
      const products = (rows || []).map(product => ({
        ...product,
        stock_status: getStockStatus(product)
      }));
      
      res.json({
        products,
        pagination: {
          current_page: page,
          total_pages: Math.ceil(totalCount / limit),
          total_items: totalCount,
          items_per_page: limit
        }
      });
    });
  });
};

exports.getProduct = (req, res, next) => {
  const query = `
    SELECT p.*, c.name as category_name 
    FROM products p
    LEFT JOIN categories c ON p.category_id = c.id
    WHERE p.id = ? AND p.is_active = 1
  `;
  
  db.get(query, [req.params.id], (err, row) => {
    if (err) return next(err);
    if (!row) return res.status(404).json({ error: 'Product not found' });
    
    row.stock_status = getStockStatus(row);
    res.json(row);
  });
};

exports.createProduct = (req, res, next) => {
  const { sku, name, description, category_id, unit_price, quantity_in_stock, reorder_level, reorder_quantity } = req.body;
  
  // Validation
  if (!sku || !name || unit_price === undefined || unit_price === null) {
    return res.status(400).json({ error: 'SKU, name, and unit price are required' });
  }
  
  if (unit_price < 0 || (quantity_in_stock !== undefined && quantity_in_stock < 0)) {
    return res.status(400).json({ error: 'Price and quantity must be non-negative' });
  }
  
  const query = `
    INSERT INTO products (sku, name, description, category_id, unit_price, quantity_in_stock, reorder_level, reorder_quantity)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `;
  
  db.run(
    query,
    [sku, name, description, category_id, unit_price, quantity_in_stock || 0, reorder_level || 10, reorder_quantity || 50],
    function(err) {
      if (err) {
        if (err.code === 'SQLITE_CONSTRAINT') {
          return res.status(400).json({ error: 'SKU already exists' });
        }
        return next(err);
      }
      
      const productId = this.lastID;
      
      // Log to audit table
      db.run(
        'INSERT INTO audit_log (table_name, record_id, action, new_values, user_id) VALUES (?, ?, ?, ?, ?)',
        ['products', productId, 'insert', JSON.stringify(req.body), req.user.id],
        (err) => {
          if (err) console.error('Audit log error:', err);
        }
      );
      
      // Create initial stock movement if quantity > 0
      if (quantity_in_stock > 0) {
        db.run(
          'INSERT INTO stock_movements (product_id, movement_type, quantity, reference_type, notes, created_by) VALUES (?, ?, ?, ?, ?, ?)',
          [productId, 'in', quantity_in_stock, 'initial', 'Initial stock', req.user.id],
          (err) => {
            if (err) console.error('Stock movement error:', err);
          }
        );
      }
      
      res.status(201).json({
        id: productId,
        message: 'Product created successfully'
      });
      
      // Check if low stock alert needed
      if (quantity_in_stock <= reorder_level) {
        // Only send alert if alertService exists
        if (alertService && typeof alertService.sendLowStockAlert === 'function') {
          alertService.sendLowStockAlert({ 
            id: productId, 
            name, 
            sku, 
            quantity_in_stock, 
            reorder_level 
          }).catch(err => console.error('Alert service error:', err));
        }
      }
    }
  );
};

exports.updateProduct = (req, res, next) => {
  const productId = req.params.id;
  const updates = req.body;
  
  // Get current product for comparison
  db.get('SELECT * FROM products WHERE id = ? AND is_active = 1', [productId], (err, oldProduct) => {
    if (err) return next(err);
    if (!oldProduct) return res.status(404).json({ error: 'Product not found' });
    
    // Build update query
    const fields = Object.keys(updates).filter(key => 
      ['name', 'description', 'category_id', 'unit_price', 'quantity_in_stock', 'reorder_level', 'reorder_quantity'].includes(key)
    );
    
    if (fields.length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }
    
    const query = `
      UPDATE products 
      SET ${fields.map(f => `${f} = ?`).join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND is_active = 1
    `;
    
    const values = fields.map(f => updates[f]);
    values.push(productId);
    
    db.run(query, values, function(err) {
      if (err) return next(err);
      
      if (this.changes === 0) {
        return res.status(404).json({ error: 'Product not found' });
      }
      
      // Log to audit
      db.run(
        'INSERT INTO audit_log (table_name, record_id, action, old_values, new_values, user_id) VALUES (?, ?, ?, ?, ?, ?)',
        ['products', productId, 'update', JSON.stringify(oldProduct), JSON.stringify(updates), req.user.id],
        (err) => {
          if (err) console.error('Audit log error:', err);
        }
      );
      
      // Handle stock changes
      if (updates.quantity_in_stock !== undefined && updates.quantity_in_stock !== oldProduct.quantity_in_stock) {
        const difference = updates.quantity_in_stock - oldProduct.quantity_in_stock;
        const movementType = difference > 0 ? 'in' : 'out';
        
        db.run(
          'INSERT INTO stock_movements (product_id, movement_type, quantity, reference_type, notes, created_by) VALUES (?, ?, ?, ?, ?, ?)',
          [productId, movementType, Math.abs(difference), 'adjustment', 'Manual stock adjustment', req.user.id],
          (err) => {
            if (err) console.error('Stock movement error:', err);
          }
        );
      }
      
      res.json({ message: 'Product updated successfully' });
      
      // Check for low stock alert
      const newQuantity = updates.quantity_in_stock !== undefined ? updates.quantity_in_stock : oldProduct.quantity_in_stock;
      const reorderLevel = updates.reorder_level !== undefined ? updates.reorder_level : oldProduct.reorder_level;
      
      if (newQuantity <= reorderLevel) {
        // Only send alert if alertService exists
        if (alertService && typeof alertService.sendLowStockAlert === 'function') {
          alertService.sendLowStockAlert({
            id: productId,
            name: updates.name || oldProduct.name,
            sku: oldProduct.sku,
            quantity_in_stock: newQuantity,
            reorder_level: reorderLevel
          }).catch(err => console.error('Alert service error:', err));
        }
      }
    });
  });
};

exports.deleteProduct = (req, res, next) => {
  const productId = req.params.id;
  
  db.run('UPDATE products SET is_active = 0 WHERE id = ?', [productId], function(err) {
    if (err) return next(err);
    
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }
    
    // Log deletion
    db.run(
      'INSERT INTO audit_log (table_name, record_id, action, user_id) VALUES (?, ?, ?, ?)',
      ['products', productId, 'delete', req.user.id],
      (err) => {
        if (err) console.error('Audit log error:', err);
      }
    );
    
    res.json({ message: 'Product deleted successfully' });
  });
};

exports.getLowStockProducts = (req, res, next) => {
  const query = `
    SELECT p.*, c.name as category_name,
           CASE 
             WHEN p.reorder_level = 0 THEN 0
             ELSE (p.quantity_in_stock * 1.0 / p.reorder_level)
           END as stock_ratio
    FROM products p
    LEFT JOIN categories c ON p.category_id = c.id
    WHERE p.is_active = 1 AND p.quantity_in_stock <= p.reorder_level
    ORDER BY stock_ratio ASC
  `;
  
  db.all(query, [], (err, rows) => {
    if (err) return next(err);
    
    const products = (rows || []).map(product => ({
      ...product,
      stock_status: getStockStatus(product)
    }));
    
    res.json(products);
  });
};

exports.bulkImport = (req, res, next) => {
  // This would handle CSV/Excel import
  // Implementation depends on multer for file upload
  res.json({ message: 'Bulk import endpoint - to be implemented' });
};

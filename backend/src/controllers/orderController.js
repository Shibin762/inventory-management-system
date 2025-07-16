// backend/src/controllers/orderController.js - FIXED VERSION
const db = require('../config/database');
const { generateOrderNumber, calculateTotal, parsePaginationParams } = require('../utils/helpers');
const { ORDER_STATUS } = require('../utils/constants');

exports.getOrders = (req, res, next) => {
  const { page, limit, offset } = parsePaginationParams(req.query);
  const { status, supplier_id, from_date, to_date } = req.query;
  
  let query = `
    SELECT po.*, s.name as supplier_name, u.username as created_by_name
    FROM purchase_orders po
    JOIN suppliers s ON po.supplier_id = s.id
    JOIN users u ON po.created_by = u.id
    WHERE 1=1
  `;
  
  const params = [];
  
  if (status) {
    query += ' AND po.status = ?';
    params.push(status);
  }
  
  if (supplier_id) {
    query += ' AND po.supplier_id = ?';
    params.push(supplier_id);
  }
  
  if (from_date) {
    query += ' AND po.order_date >= ?';
    params.push(from_date);
  }
  
  if (to_date) {
    query += ' AND po.order_date <= ?';
    params.push(to_date);
  }
  
  // Count total - Fixed query
  const countQuery = query.replace(/SELECT.*FROM/, 'SELECT COUNT(*) as total FROM');
  
  db.get(countQuery, params, (err, count) => {
    if (err) return next(err);
    
    // Handle case where count might be null or undefined
    const totalCount = count && count.total ? count.total : 0;
    
    query += ' ORDER BY po.order_date DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);
    
    db.all(query, params, (err, rows) => {
      if (err) return next(err);
      
      res.json({
        orders: rows || [],
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

exports.getOrder = (req, res, next) => {
  const orderId = req.params.id;
  
  // Get order details
  db.get(
    `SELECT po.*, s.name as supplier_name, u.username as created_by_name
     FROM purchase_orders po
     JOIN suppliers s ON po.supplier_id = s.id
     JOIN users u ON po.created_by = u.id
     WHERE po.id = ?`,
    [orderId],
    (err, order) => {
      if (err) return next(err);
      if (!order) return res.status(404).json({ error: 'Order not found' });
      
      // Get order items
      db.all(
        `SELECT oi.*, p.name as product_name, p.sku
         FROM order_items oi
         JOIN products p ON oi.product_id = p.id
         WHERE oi.order_id = ?`,
        [orderId],
        (err, items) => {
          if (err) return next(err);
          
          order.items = items || [];
          res.json(order);
        }
      );
    }
  );
};

exports.createOrder = (req, res, next) => {
  const { supplier_id, expected_delivery, notes, items } = req.body;
  
  // Validate items
  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Order must contain at least one item' });
  }
  
  const orderNumber = generateOrderNumber();
  const totalAmount = calculateTotal(items);
  
  db.serialize(() => {
    db.run('BEGIN TRANSACTION');
    
    // Create order
    db.run(
      `INSERT INTO purchase_orders (order_number, supplier_id, expected_delivery, total_amount, notes, created_by)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [orderNumber, supplier_id, expected_delivery, totalAmount, notes, req.user.id],
      function(err) {
        if (err) {
          db.run('ROLLBACK');
          return next(err);
        }
        
        const orderId = this.lastID;
        let itemsProcessed = 0;
        let hasError = false;
        
        // Add order items
        items.forEach((item, index) => {
          if (hasError) return;
          
          const totalCost = item.quantity * item.unit_cost;
          
          db.run(
            'INSERT INTO order_items (order_id, product_id, quantity, unit_cost, total_cost) VALUES (?, ?, ?, ?, ?)',
            [orderId, item.product_id, item.quantity, item.unit_cost, totalCost],
            (err) => {
              if (err) {
                hasError = true;
                db.run('ROLLBACK');
                return next(err);
              }
              
              itemsProcessed++;
              
              // If all items processed successfully
              if (itemsProcessed === items.length && !hasError) {
                // Log to audit
                db.run(
                  'INSERT INTO audit_log (table_name, record_id, action, new_values, user_id) VALUES (?, ?, ?, ?, ?)',
                  ['purchase_orders', orderId, 'insert', JSON.stringify(req.body), req.user.id],
                  (err) => {
                    if (err) console.error('Audit log error:', err);
                  }
                );
                
                db.run('COMMIT', (err) => {
                  if (err) {
                    db.run('ROLLBACK');
                    return next(err);
                  }
                  
                  res.status(201).json({
                    id: orderId,
                    order_number: orderNumber,
                    message: 'Order created successfully'
                  });
                });
              }
            }
          );
        });
      }
    );
  });
};

exports.updateOrderStatus = (req, res, next) => {
  const orderId = req.params.id;
  const { status } = req.body;
  
  // Validate status
  const validStatuses = ['pending', 'confirmed', 'delivered', 'cancelled'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: 'Invalid status. Must be one of: ' + validStatuses.join(', ') });
  }
  
  db.get('SELECT * FROM purchase_orders WHERE id = ?', [orderId], (err, order) => {
    if (err) return next(err);
    if (!order) return res.status(404).json({ error: 'Order not found' });
    
    db.run(
      'UPDATE purchase_orders SET status = ? WHERE id = ?',
      [status, orderId],
      function(err) {
        if (err) return next(err);
        
        if (this.changes === 0) {
          return res.status(404).json({ error: 'Order not found' });
        }
        
        // Log status change
        db.run(
          'INSERT INTO audit_log (table_name, record_id, action, old_values, new_values, user_id) VALUES (?, ?, ?, ?, ?, ?)',
          ['purchase_orders', orderId, 'update', JSON.stringify({ status: order.status }), JSON.stringify({ status }), req.user.id],
          (err) => {
            if (err) console.error('Audit log error:', err);
          }
        );
        
        res.json({ message: 'Order status updated successfully' });
      }
    );
  });
};

exports.receiveOrder = (req, res, next) => {
  const orderId = req.params.id;
  
  db.serialize(() => {
    db.run('BEGIN TRANSACTION');
    
    // Get order and verify it's confirmed
    db.get(
      'SELECT * FROM purchase_orders WHERE id = ? AND status = ?',
      [orderId, 'confirmed'],
      (err, order) => {
        if (err) {
          db.run('ROLLBACK');
          return next(err);
        }
        if (!order) {
          db.run('ROLLBACK');
          return res.status(400).json({ error: 'Order not found or not in confirmed status' });
        }
        
        // Get order items
        db.all(
          'SELECT * FROM order_items WHERE order_id = ?',
          [orderId],
          (err, items) => {
            if (err) {
              db.run('ROLLBACK');
              return next(err);
            }
            
            if (!items || items.length === 0) {
              db.run('ROLLBACK');
              return res.status(400).json({ error: 'No items found in order' });
            }
            
            let itemsProcessed = 0;
            let hasError = false;
            
            // Update product quantities and create stock movements
            items.forEach((item) => {
              if (hasError) return;
              
              // Update product quantity
              db.run(
                'UPDATE products SET quantity_in_stock = quantity_in_stock + ? WHERE id = ?',
                [item.quantity, item.product_id],
                (err) => {
                  if (err) {
                    hasError = true;
                    db.run('ROLLBACK');
                    return next(err);
                  }
                  
                  // Create stock movement
                  db.run(
                    'INSERT INTO stock_movements (product_id, movement_type, quantity, reference_type, reference_id, notes, created_by) VALUES (?, ?, ?, ?, ?, ?, ?)',
                    [
                      item.product_id,
                      'in',
                      item.quantity,
                      'purchase_order',
                      orderId,
                      `Received from PO ${order.order_number}`,
                      req.user.id
                    ],
                    (err) => {
                      if (err) {
                        hasError = true;
                        db.run('ROLLBACK');
                        return next(err);
                      }
                      
                      itemsProcessed++;
                      
                      // If all items processed
                      if (itemsProcessed === items.length && !hasError) {
                        // Update order status
                        db.run(
                          'UPDATE purchase_orders SET status = ? WHERE id = ?',
                          ['delivered', orderId],
                          (err) => {
                            if (err) {
                              db.run('ROLLBACK');
                              return next(err);
                            }
                            
                            db.run('COMMIT', (err) => {
                              if (err) {
                                db.run('ROLLBACK');
                                return next(err);
                              }
                              
                              res.json({ message: 'Order received successfully' });
                            });
                          }
                        );
                      }
                    }
                  );
                }
              );
            });
          }
        );
      }
    );
  });
};

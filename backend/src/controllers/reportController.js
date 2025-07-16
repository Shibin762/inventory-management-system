// backend/src/controllers/reportController.js
const db = require('../config/database');
const { formatCurrency } = require('../utils/helpers');

exports.getInventoryReport = (req, res, next) => {
  const query = `
    SELECT 
      p.sku,
      p.name,
      c.name as category,
      p.quantity_in_stock,
      p.unit_price,
      (p.quantity_in_stock * p.unit_price) as stock_value,
      p.reorder_level,
      CASE 
        WHEN p.quantity_in_stock = 0 THEN 'Out of Stock'
        WHEN p.quantity_in_stock <= p.reorder_level THEN 'Low Stock'
        ELSE 'In Stock'
      END as status
    FROM products p
    LEFT JOIN categories c ON p.category_id = c.id
    WHERE p.is_active = 1
    ORDER BY p.name
  `;
  
  db.all(query, [], (err, rows) => {
    if (err) return next(err);
    
    const totalValue = rows.reduce((sum, row) => sum + row.stock_value, 0);
    
    res.json({
      report: rows,
      summary: {
        total_items: rows.length,
        total_value: totalValue,
        out_of_stock: rows.filter(r => r.status === 'Out of Stock').length,
        low_stock: rows.filter(r => r.status === 'Low Stock').length
      }
    });
  });
};

exports.getSupplierPerformance = (req, res, next) => {
  const query = `
    SELECT 
      s.id,
      s.name,
      COUNT(DISTINCT po.id) as total_orders,
      SUM(po.total_amount) as total_spent,
      AVG(CASE 
        WHEN po.status = 'delivered' 
        THEN julianday(po.updated_at) - julianday(po.order_date) 
        ELSE NULL 
      END) as avg_delivery_days,
      COUNT(DISTINCT ps.product_id) as products_supplied
    FROM suppliers s
    LEFT JOIN purchase_orders po ON s.id = po.supplier_id
    LEFT JOIN product_suppliers ps ON s.id = ps.supplier_id
    WHERE s.is_active = 1
    GROUP BY s.id
    ORDER BY total_spent DESC
  `;
  
  db.all(query, [], (err, rows) => {
    if (err) return next(err);
    res.json(rows);
  });
};

exports.getReorderSuggestions = (req, res, next) => {
  const query = `
    SELECT 
      p.*,
      c.name as category_name,
      ps.supplier_id,
      s.name as supplier_name,
      ps.cost_price,
      ps.lead_time_days,
      (p.reorder_quantity * ps.cost_price) as estimated_cost
    FROM products p
    LEFT JOIN categories c ON p.category_id = c.id
    LEFT JOIN product_suppliers ps ON p.id = ps.product_id
    LEFT JOIN suppliers s ON ps.supplier_id = s.id
    WHERE p.is_active = 1 
      AND p.quantity_in_stock <= p.reorder_level
      AND ps.supplier_id IS NOT NULL
    ORDER BY (p.quantity_in_stock * 1.0 / p.reorder_level) ASC
  `;
  
  db.all(query, [], (err, rows) => {
    if (err) return next(err);
    
    // Group by product to handle multiple suppliers
    const suggestions = {};
    rows.forEach(row => {
      if (!suggestions[row.id]) {
        suggestions[row.id] = {
          product_id: row.id,
          sku: row.sku,
          name: row.name,
          category: row.category_name,
          current_stock: row.quantity_in_stock,
          reorder_level: row.reorder_level,
          reorder_quantity: row.reorder_quantity,
          suppliers: []
        };
      }
      
      if (row.supplier_id) {
        suggestions[row.id].suppliers.push({
          supplier_id: row.supplier_id,
          supplier_name: row.supplier_name,
          cost_price: row.cost_price,
          lead_time_days: row.lead_time_days,
          estimated_cost: row.estimated_cost
        });
      }
    });
    
    res.json(Object.values(suggestions));
  });
};

exports.getStockMovementReport = (req, res, next) => {
  const { product_id, from_date, to_date, movement_type } = req.query;
  
  let query = `
    SELECT 
      sm.*,
      p.name as product_name,
      p.sku,
      u.username as created_by_name
    FROM stock_movements sm
    JOIN products p ON sm.product_id = p.id
    JOIN users u ON sm.created_by = u.id
    WHERE 1=1
  `;
  
  const params = [];
  
  if (product_id) {
    query += ' AND sm.product_id = ?';
    params.push(product_id);
  }
  
  if (from_date) {
    query += ' AND sm.created_at >= ?';
    params.push(from_date);
  }
  
  if (to_date) {
    query += ' AND sm.created_at <= ?';
    params.push(to_date);
  }
  
  if (movement_type) {
    query += ' AND sm.movement_type = ?';
    params.push(movement_type);
  }
  
  query += ' ORDER BY sm.created_at DESC';
  
  db.all(query, params, (err, rows) => {
    if (err) return next(err);
    res.json(rows);
  });
};

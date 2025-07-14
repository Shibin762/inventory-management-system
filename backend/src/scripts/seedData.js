const db = require('../config/database');

console.log('Seeding sample data...');

// Get category IDs
db.all('SELECT id, name FROM categories', [], (err, categories) => {
  if (err) {
    console.error('Error fetching categories:', err);
    return;
  }
  
  const categoryMap = {};
  categories.forEach(cat => {
    categoryMap[cat.name] = cat.id;
  });
  
  // Sample products
  const sampleProducts = [
    {
      sku: 'LAP-001',
      name: 'Dell Latitude 5520',
      description: '15.6" Business Laptop, Intel i5, 16GB RAM, 512GB SSD',
      category_id: categoryMap['Laptops'],
      unit_price: 1299.99,
      quantity_in_stock: 15,
      reorder_level: 5,
      reorder_quantity: 10
    },
    {
      sku: 'LAP-002',
      name: 'HP ProBook 450 G8',
      description: '15.6" Professional Laptop, Intel i7, 16GB RAM, 1TB SSD',
      category_id: categoryMap['Laptops'],
      unit_price: 1599.99,
      quantity_in_stock: 8,
      reorder_level: 5,
      reorder_quantity: 10
    },
    {
      sku: 'MON-001',
      name: 'LG 27" 4K Monitor',
      description: '27" IPS 4K UHD Monitor, HDR10, USB-C',
      category_id: categoryMap['Monitors'],
      unit_price: 449.99,
      quantity_in_stock: 20,
      reorder_level: 10,
      reorder_quantity: 15
    },
    {
      sku: 'MON-002',
      name: 'Dell UltraSharp 24"',
      description: '24" Full HD IPS Monitor, USB Hub',
      category_id: categoryMap['Monitors'],
      unit_price: 279.99,
      quantity_in_stock: 3,
      reorder_level: 10,
      reorder_quantity: 20
    },
    {
      sku: 'KEY-001',
      name: 'Logitech MX Keys',
      description: 'Advanced Wireless Illuminated Keyboard',
      category_id: categoryMap['Keyboards'],
      unit_price: 119.99,
      quantity_in_stock: 25,
      reorder_level: 15,
      reorder_quantity: 30
    },
    {
      sku: 'MOU-001',
      name: 'Logitech MX Master 3',
      description: 'Advanced Wireless Mouse for Mac and Windows',
      category_id: categoryMap['Mice'],
      unit_price: 99.99,
      quantity_in_stock: 30,
      reorder_level: 15,
      reorder_quantity: 25
    },
    {
      sku: 'CAB-001',
      name: 'USB-C to HDMI Cable',
      description: '6ft USB-C to HDMI 2.0 Cable, 4K@60Hz',
      category_id: categoryMap['Cables'],
      unit_price: 24.99,
      quantity_in_stock: 50,
      reorder_level: 25,
      reorder_quantity: 50
    },
    {
      sku: 'CAB-002',
      name: 'Ethernet Cable Cat6',
      description: '25ft Cat6 Ethernet Cable, Blue',
      category_id: categoryMap['Cables'],
      unit_price: 14.99,
      quantity_in_stock: 5,
      reorder_level: 20,
      reorder_quantity: 40
    }
  ];
  
  // Insert products
  const stmt = db.prepare(
    `INSERT OR IGNORE INTO products (sku, name, description, category_id, unit_price, quantity_in_stock, reorder_level, reorder_quantity)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  );
  
  sampleProducts.forEach(product => {
    stmt.run(
      product.sku,
      product.name,
      product.description,
      product.category_id,
      product.unit_price,
      product.quantity_in_stock,
      product.reorder_level,
      product.reorder_quantity,
      (err) => {
        if (err) console.error(`Error inserting product ${product.sku}:`, err);
        else console.log(`Product ${product.sku} inserted`);
      }
    );
  });
  
  stmt.finalize();
  
  // Link products to suppliers
  db.all('SELECT id FROM suppliers LIMIT 3', [], (err, suppliers) => {
    if (err || !suppliers.length) {
      console.error('Error fetching suppliers:', err);
      return;
    }
    
    db.all('SELECT id FROM products', [], (err, products) => {
      if (err || !products.length) {
        console.error('Error fetching products:', err);
        return;
      }
      
      const linkStmt = db.prepare(
        `INSERT OR IGNORE INTO product_suppliers (product_id, supplier_id, supplier_sku, cost_price, lead_time_days)
         VALUES (?, ?, ?, ?, ?)`
      );
      
      products.forEach((product, index) => {
        const supplierId = suppliers[index % suppliers.length].id;
        const costPrice = Math.floor(Math.random() * 50) + 50; // Random cost between 50-100
        const leadTime = Math.floor(Math.random() * 7) + 3; // Random lead time 3-10 days
        
        linkStmt.run(
          product.id,
          supplierId,
          `SUP-${product.id}`,
          costPrice,
          leadTime
        );
      });
      
      linkStmt.finalize();
      console.log('Product-supplier links created');
    });
  });
});

console.log('Sample data seeding initiated!');

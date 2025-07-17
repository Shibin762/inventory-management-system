// backend/src/config/database.js
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const dbPath = process.env.DB_PATH || path.join(__dirname, '../../../database/inventory.db');
const dbDir = path.dirname(dbPath);

// Create database directory if it doesn't exist
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Database connection error:', err);
    process.exit(1);
  } else {
    console.log('Connected to SQLite database');
    initializeDatabase();
  }
});

// Enable foreign keys
db.run('PRAGMA foreign_keys = ON');

function initializeDatabase() {
  const schema = `
    -- Users table
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT CHECK(role IN ('admin', 'manager', 'staff')) NOT NULL,
      is_active BOOLEAN DEFAULT 1,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      last_login TIMESTAMP
    );

    -- Categories table
    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      description TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- Products table
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sku TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      category_id INTEGER,
      unit_price DECIMAL(10,2) NOT NULL,
      quantity_in_stock INTEGER DEFAULT 0,
      reorder_level INTEGER DEFAULT 10,
      reorder_quantity INTEGER DEFAULT 50,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      is_active BOOLEAN DEFAULT 1,
      FOREIGN KEY (category_id) REFERENCES categories(id)
    );

    -- Suppliers table
    CREATE TABLE IF NOT EXISTS suppliers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      contact_person TEXT,
      email TEXT,
      phone TEXT,
      address TEXT,
      is_active BOOLEAN DEFAULT 1,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- Product_Suppliers junction table
    CREATE TABLE IF NOT EXISTS product_suppliers (
      product_id INTEGER,
      supplier_id INTEGER,
      supplier_sku TEXT,
      cost_price DECIMAL(10,2),
      lead_time_days INTEGER,
      PRIMARY KEY (product_id, supplier_id),
      FOREIGN KEY (product_id) REFERENCES products(id),
      FOREIGN KEY (supplier_id) REFERENCES suppliers(id)
    );

    -- Purchase_Orders table
    CREATE TABLE IF NOT EXISTS purchase_orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_number TEXT UNIQUE NOT NULL,
      supplier_id INTEGER,
      order_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      expected_delivery DATE,
      status TEXT CHECK(status IN ('pending', 'confirmed', 'delivered', 'cancelled')) DEFAULT 'pending',
      total_amount DECIMAL(10,2),
      notes TEXT,
      created_by INTEGER,
      FOREIGN KEY (supplier_id) REFERENCES suppliers(id),
      FOREIGN KEY (created_by) REFERENCES users(id)
    );

    -- Order_Items table
    CREATE TABLE IF NOT EXISTS order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER,
      product_id INTEGER,
      quantity INTEGER NOT NULL,
      unit_cost DECIMAL(10,2) NOT NULL,
      total_cost DECIMAL(10,2) NOT NULL,
      FOREIGN KEY (order_id) REFERENCES purchase_orders(id) ON DELETE CASCADE,
      FOREIGN KEY (product_id) REFERENCES products(id)
    );

    -- Stock_Movements table
    CREATE TABLE IF NOT EXISTS stock_movements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER,
      movement_type TEXT CHECK(movement_type IN ('in', 'out', 'adjustment')) NOT NULL,
      quantity INTEGER NOT NULL,
      reference_type TEXT,
      reference_id INTEGER,
      notes TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      created_by INTEGER,
      FOREIGN KEY (product_id) REFERENCES products(id),
      FOREIGN KEY (created_by) REFERENCES users(id)
    );

    -- Audit_Log table
    CREATE TABLE IF NOT EXISTS audit_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      table_name TEXT NOT NULL,
      record_id INTEGER,
      action TEXT CHECK(action IN ('insert', 'update', 'delete')) NOT NULL,
      old_values TEXT,
      new_values TEXT,
      user_id INTEGER,
      timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    -- Create indexes
    CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);
    CREATE INDEX IF NOT EXISTS idx_products_name ON products(name);
    CREATE INDEX IF NOT EXISTS idx_products_stock ON products(quantity_in_stock);
    CREATE INDEX IF NOT EXISTS idx_stock_movements_product ON stock_movements(product_id);
    CREATE INDEX IF NOT EXISTS idx_audit_log_timestamp ON audit_log(timestamp);
    CREATE INDEX IF NOT EXISTS idx_purchase_orders_status ON purchase_orders(status);
  `;

  db.exec(schema, (err) => {
    if (err) {
      console.error('Database initialization error:', err);
      process.exit(1);
    } else {
      console.log('Database tables initialized');
      createDefaultData();
    }
  });
}

function createDefaultData() {
  const bcrypt = require('bcryptjs');
  
  // Create default admin user
  bcrypt.hash('admin123', 10, (err, hash) => {
    if (err) {
      console.error('Password hash error:', err);
      return;
    }
    
    db.run(
      `INSERT OR IGNORE INTO users (username, email, password_hash, role) 
       VALUES (?, ?, ?, ?)`,
      ['admin', 'admin@techsupplypro.com', hash, 'admin'],
      (err) => {
        if (err) {
          console.error('Default user creation error:', err);
        } else {
          console.log('Default admin user created (username: admin, password: admin123)');
        }
      }
    );
  });

  // Create default categories
  const categories = [
    ['Electronics', 'Electronic devices and components'],
    ['Accessories', 'Device accessories and peripherals'],
    ['Storage', 'Storage devices and media'],
    ['Networking', 'Network equipment and cables'],
    ['Software', 'Software licenses and subscriptions']
  ];

  categories.forEach(([name, description]) => {
    db.run(
      'INSERT OR IGNORE INTO categories (name, description) VALUES (?, ?)',
      [name, description]
    );
  });
}

module.exports = db;

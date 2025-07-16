const db = require('../config/database');
const bcrypt = require('bcrypt');

console.log('Initializing database...');

// The database initialization is handled in config/database.js
// This script can be used for additional setup if needed

// Create additional sample data
const sampleCategories = [
  ['Laptops', 'Portable computers and notebooks'],
  ['Monitors', 'Display screens and monitors'],
  ['Keyboards', 'Computer keyboards and accessories'],
  ['Mice', 'Computer mice and pointing devices'],
  ['Cables', 'Various cables and connectors']
];

const sampleSuppliers = [
  ['TechDistributor Inc', 'John Smith', 'john@techdist.com', '+1-555-0123', '123 Tech Street, Silicon Valley, CA'],
  ['Global Electronics', 'Sarah Johnson', 'sarah@globalelec.com', '+1-555-0124', '456 Electronic Ave, New York, NY'],
  ['CompSupply Co', 'Mike Davis', 'mike@compsupply.com', '+1-555-0125', '789 Supply Road, Austin, TX']
];

// Insert sample categories
sampleCategories.forEach(([name, description]) => {
  db.run(
    'INSERT OR IGNORE INTO categories (name, description) VALUES (?, ?)',
    [name, description],
    (err) => {
      if (err) console.error(`Error inserting category ${name}:`, err);
      else console.log(`Category ${name} inserted`);
    }
  );
});

// Insert sample suppliers
sampleSuppliers.forEach(([name, contact, email, phone, address]) => {
  db.run(
    'INSERT OR IGNORE INTO suppliers (name, contact_person, email, phone, address) VALUES (?, ?, ?, ?, ?)',
    [name, contact, email, phone, address],
    (err) => {
      if (err) console.error(`Error inserting supplier ${name}:`, err);
      else console.log(`Supplier ${name} inserted`);
    }
  );
});

// Create sample users
const users = [
  { username: 'manager', email: 'manager@techsupplypro.com', password: 'manager123', role: 'manager' },
  { username: 'staff', email: 'staff@techsupplypro.com', password: 'staff123', role: 'staff' }
];

users.forEach(user => {
  bcrypt.hash(user.password, 10, (err, hash) => {
    if (err) {
      console.error('Error hashing password:', err);
      return;
    }
    
    db.run(
      'INSERT OR IGNORE INTO users (username, email, password_hash, role) VALUES (?, ?, ?, ?)',
      [user.username, user.email, hash, user.role],
      (err) => {
        if (err) console.error(`Error creating user ${user.username}:`, err);
        else console.log(`User ${user.username} created`);
      }
    );
  });
});

console.log('Database initialization complete!');
console.log('\nDefault users:');
console.log('- Username: admin, Password: admin123 (Admin)');
console.log('- Username: manager, Password: manager123 (Manager)');
console.log('- Username: staff, Password: staff123 (Staff)');

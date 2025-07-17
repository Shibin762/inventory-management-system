// backend/src/models/User.js
const db = require('../config/database');
const bcrypt = require('bcryptjs');
const { saltRounds } = require('../config/auth');

class User {
  static async findById(id) {
    return new Promise((resolve, reject) => {
      db.get(
        'SELECT id, username, email, role, created_at, last_login FROM users WHERE id = ? AND is_active = 1',
        [id],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });
  }
  
  static async findByUsername(username) {
    return new Promise((resolve, reject) => {
      db.get(
        'SELECT * FROM users WHERE username = ? AND is_active = 1',
        [username],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });
  }
  
  static async create(userData) {
    const { username, email, password, role = 'staff' } = userData;
    const passwordHash = await bcrypt.hash(password, saltRounds);
    
    return new Promise((resolve, reject) => {
      db.run(
        'INSERT INTO users (username, email, password_hash, role) VALUES (?, ?, ?, ?)',
        [username, email, passwordHash, role],
        function(err) {
          if (err) reject(err);
          else resolve({ id: this.lastID, username, email, role });
        }
      );
    });
  }
  
  static async updateLastLogin(id) {
    return new Promise((resolve, reject) => {
      db.run(
        'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?',
        [id],
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });
  }
  
  static async verifyPassword(user, password) {
    return bcrypt.compare(password, user.password_hash);
  }
}

module.exports = User;
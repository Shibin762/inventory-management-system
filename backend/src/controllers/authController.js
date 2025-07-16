const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../config/database');
const { jwtSecret, jwtExpire, saltRounds } = require('../config/auth');
const { validateUser } = require('../utils/validators');

exports.register = async (req, res, next) => {
  try {
    const { username, email, password, role = 'staff' } = req.body;
    
    // Validate input
    const validation = validateUser({ username, password, role });
    if (!validation.isValid) {
      return res.status(400).json({ error: validation.errors.join(', ') });
    }
    
    // Hash password
    const passwordHash = await bcrypt.hash(password, saltRounds);
    
    // Insert user
    db.run(
      'INSERT INTO users (username, email, password_hash, role) VALUES (?, ?, ?, ?)',
      [username, email, passwordHash, role],
      function(err) {
        if (err) {
          if (err.code === 'SQLITE_CONSTRAINT') {
            return res.status(400).json({ error: 'Username or email already exists' });
          }
          return next(err);
        }
        
        res.status(201).json({
          id: this.lastID,
          message: 'User registered successfully'
        });
      }
    );
  } catch (error) {
    next(error);
  }
};

exports.login = async (req, res, next) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }
    
    // Find user
    db.get(
      'SELECT * FROM users WHERE username = ? AND is_active = 1',
      [username],
      async (err, user) => {
        if (err) return next(err);
        
        if (!user) {
          return res.status(401).json({ error: 'Invalid credentials' });
        }
        
        // Verify password
        const isValid = await bcrypt.compare(password, user.password_hash);
        if (!isValid) {
          return res.status(401).json({ error: 'Invalid credentials' });
        }
        
        // Generate token
        const token = jwt.sign(
          { id: user.id, username: user.username, role: user.role },
          jwtSecret,
          { expiresIn: jwtExpire }
        );
        
        // Update last login
        db.run(
          'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?',
          [user.id]
        );
        
        res.json({
          token,
          user: {
            id: user.id,
            username: user.username,
            email: user.email,
            role: user.role
          }
        });
      }
    );
  } catch (error) {
    next(error);
  }
};

exports.getProfile = (req, res, next) => {
  db.get(
    'SELECT id, username, email, role, created_at, last_login FROM users WHERE id = ?',
    [req.user.id],
    (err, user) => {
      if (err) return next(err);
      if (!user) return res.status(404).json({ error: 'User not found' });
      res.json(user);
    }
  );
};

exports.changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current and new passwords required' });
    }
    
    if (newPassword.length < 8) {
      return res.status(400).json({ error: 'New password must be at least 8 characters' });
    }
    
    // Get user
    db.get(
      'SELECT password_hash FROM users WHERE id = ?',
      [req.user.id],
      async (err, user) => {
        if (err) return next(err);
        
        // Verify current password
        const isValid = await bcrypt.compare(currentPassword, user.password_hash);
        if (!isValid) {
          return res.status(401).json({ error: 'Current password is incorrect' });
        }
        
        // Hash new password
        const newHash = await bcrypt.hash(newPassword, saltRounds);
        
        // Update password
        db.run(
          'UPDATE users SET password_hash = ? WHERE id = ?',
          [newHash, req.user.id],
          (err) => {
            if (err) return next(err);
            res.json({ message: 'Password changed successfully' });
          }
        );
      }
    );
  } catch (error) {
    next(error);
  }
};

// backend/src/config/auth.js
module.exports = {
  jwtSecret: process.env.JWT_SECRET || 'your-secret-key',
  jwtExpire: process.env.JWT_EXPIRE || '24h',
  saltRounds: 10
};


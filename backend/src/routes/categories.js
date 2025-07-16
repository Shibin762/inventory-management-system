// backend/src/routes/categories.js - NEW FILE
const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

router.use(authenticateToken);

router.get('/', (req, res, next) => {
  db.all('SELECT * FROM categories ORDER BY name', [], (err, rows) => {
    if (err) return next(err);
    res.json(rows);
  });
});

module.exports = router;

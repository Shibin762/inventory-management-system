// backend/src/routes/auth.js
const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticateToken, authorize } = require('../middleware/auth');

router.post('/register', authenticateToken, authorize(['admin']), authController.register);
router.post('/login', authController.login);
router.get('/profile', authenticateToken, authController.getProfile);
router.post('/change-password', authenticateToken, authController.changePassword);

module.exports = router;



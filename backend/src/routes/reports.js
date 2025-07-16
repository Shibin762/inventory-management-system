// backend/src/routes/reports.js
const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const { authenticateToken } = require('../middleware/auth');

router.use(authenticateToken);

router.get('/inventory', reportController.getInventoryReport);
router.get('/supplier-performance', reportController.getSupplierPerformance);
router.get('/reorder-suggestions', reportController.getReorderSuggestions);
router.get('/stock-movements', reportController.getStockMovementReport);

module.exports = router;
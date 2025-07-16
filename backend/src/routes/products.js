// backend/src/routes/products.js
const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const { authenticateToken, authorize } = require('../middleware/auth');
const { validateProduct } = require('../middleware/validation');

// All routes require authentication
router.use(authenticateToken);

router.get('/', productController.getProducts);
router.get('/low-stock', productController.getLowStockProducts);
router.get('/:id', productController.getProduct);
router.post('/', authorize(['admin', 'manager']), validateProduct, productController.createProduct);
router.put('/:id', authorize(['admin', 'manager']), validateProduct, productController.updateProduct);
router.delete('/:id', authorize(['admin']), productController.deleteProduct);
router.post('/import', authorize(['admin', 'manager']), productController.bulkImport);

module.exports = router;

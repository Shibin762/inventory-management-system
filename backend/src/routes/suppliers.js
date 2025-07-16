// backend/src/routes/suppliers.js
const express = require('express');
const router = express.Router();
const supplierController = require('../controllers/supplierController');
const { authenticateToken, authorize } = require('../middleware/auth');
const { validateSupplier } = require('../middleware/validation');

router.use(authenticateToken);

router.get('/', supplierController.getSuppliers);
router.get('/:id', supplierController.getSupplier);
router.get('/:id/products', supplierController.getSupplierProducts);
router.post('/', authorize(['admin', 'manager']), validateSupplier, supplierController.createSupplier);
router.put('/:id', authorize(['admin', 'manager']), validateSupplier, supplierController.updateSupplier);
router.delete('/:id', authorize(['admin']), supplierController.deleteSupplier);

module.exports = router;
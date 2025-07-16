// backend/src/routes/orders.js
const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const { authenticateToken, authorize } = require('../middleware/auth');
const { validateOrder } = require('../middleware/validation');

router.use(authenticateToken);

router.get('/', orderController.getOrders);
router.get('/:id', orderController.getOrder);
router.post('/', authorize(['admin', 'manager']), validateOrder, orderController.createOrder);
router.put('/:id/status', authorize(['admin', 'manager']), orderController.updateOrderStatus);
router.post('/:id/receive', authorize(['admin', 'manager']), orderController.receiveOrder);

module.exports = router;
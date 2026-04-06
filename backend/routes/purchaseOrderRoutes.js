const express = require('express');
const router = express.Router();
const poController = require('../controllers/purchaseOrderController');
const requireAuth = require('../middleware/requireAuth');
const adminOnly = require('../middleware/adminOnly');

router.use(requireAuth, adminOnly);

router.get('/', poController.getPOs);
router.post('/', poController.createPO);
router.patch('/:id', poController.updatePO);
router.post('/:id/receive', poController.receivePO);
router.delete('/:id', poController.deletePO);

module.exports = router;

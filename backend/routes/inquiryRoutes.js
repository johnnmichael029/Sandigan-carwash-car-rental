const express = require('express');
const router = express.Router();
const inquiryController = require('../controllers/inquiryController');
const requireAuth = require('../middleware/requireAuth');
const requirePermission = require('../middleware/requirePermission');

// Public endpoint for submitting contact messages from website
router.post('/', inquiryController.submitInquiry);

// Protected endpoints for Admin/Staff
router.get('/', requireAuth, requirePermission('Clientele', 'read', ['employee', 'detailer']), inquiryController.getAllInquiries);
router.patch('/:id/status', requireAuth, requirePermission('Clientele', 'update', ['employee', 'detailer']), inquiryController.updateInquiryStatus);
router.delete('/:id', requireAuth, requirePermission('Clientele', 'delete'), inquiryController.deleteInquiry);

module.exports = router;

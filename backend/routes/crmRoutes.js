const express = require('express');
const router = express.Router();
const crmController = require('../controllers/crmController');
const requireAuth = require('../middleware/requireAuth');

// Tag Management Routes — MUST come BEFORE /:id to avoid route conflicts
router.get('/tags/all', requireAuth, crmController.getAllTags);
router.post('/tags', requireAuth, crmController.createTag);
router.put('/tags/:tagId', requireAuth, crmController.updateTag);
router.delete('/tags/:tagId', requireAuth, crmController.deleteTag);

// Customer CRUD Routes
router.get('/', requireAuth, crmController.getAllCustomers);
router.post('/', requireAuth, crmController.createCustomer);
router.post('/sync', requireAuth, crmController.syncBookingsToCRM);
router.get('/validate-smc/:smcId', requireAuth, crmController.validateSMC); // Must be before /:id
router.get('/:id', requireAuth, crmController.getCustomerStats);
router.put('/:id', requireAuth, crmController.updateCustomerCRM);
router.delete('/:id', requireAuth, crmController.deleteCustomer);
router.get('/booking/:bookingId/smc', requireAuth, crmController.getSMCForBooking);
router.get('/memberships/all', requireAuth, crmController.getAllMemberships);
router.post('/renew/:smcId', requireAuth, crmController.renewSMC);
router.get('/card/:smcId', requireAuth, crmController.getSMCByCardId); // Fetch by direct Card ID
router.get('/config/smc', requireAuth, crmController.getSMCConfig);
router.post('/:id/smc', requireAuth, crmController.issueSMC);


module.exports = router;


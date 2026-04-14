const express = require('express');
const router = express.Router();
const crmController = require('../controllers/crmController');
const requireAuth = require('../middleware/requireAuth');
const cache = require('../middleware/cacheMiddleware');
const { invalidatePrefixes } = require('../utils/cache');

const invalidateCRM = (req, res, next) => { invalidatePrefixes('crm'); next(); };

// Tag Management
router.get('/tags/all', requireAuth, cache('crm', 300), crmController.getAllTags);
router.post('/tags', requireAuth, invalidateCRM, crmController.createTag);
router.put('/tags/:tagId', requireAuth, invalidateCRM, crmController.updateTag);
router.delete('/tags/:tagId', requireAuth, invalidateCRM, crmController.deleteTag);

// Customer CRUD
router.get('/', requireAuth, cache('crm', 90), crmController.getAllCustomers);
router.post('/', requireAuth, invalidateCRM, crmController.createCustomer);
router.post('/sync', requireAuth, invalidateCRM, crmController.syncBookingsToCRM);
router.get('/validate-smc/:smcId', requireAuth, cache('crm', 60), crmController.validateSMC);
router.get('/:id', requireAuth, cache('crm', 60), crmController.getCustomerStats);
router.put('/:id', requireAuth, invalidateCRM, crmController.updateCustomerCRM);
router.delete('/:id', requireAuth, invalidateCRM, crmController.deleteCustomer);
router.get('/booking/:bookingId/smc', requireAuth, cache('crm', 60), crmController.getSMCForBooking);
router.get('/memberships/all', requireAuth, cache('crm', 90), crmController.getAllMemberships);
router.post('/renew/:smcId', requireAuth, invalidateCRM, crmController.renewSMC);
router.get('/card/:smcId', requireAuth, cache('crm', 60), crmController.getSMCByCardId);
router.get('/config/smc', requireAuth, cache('crm', 300), crmController.getSMCConfig);
router.post('/:id/smc', requireAuth, invalidateCRM, crmController.issueSMC);

module.exports = router;

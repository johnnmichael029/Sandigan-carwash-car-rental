const express = require('express');
const router = express.Router();
const crmController = require('../controllers/crmController');
const requireAuth = require('../middleware/requireAuth');
<<<<<<< HEAD
const requirePermission = require('../middleware/requirePermission');
=======
>>>>>>> b1d1b6bc1ab4fe98040e5c50349f87e080246976
const cache = require('../middleware/cacheMiddleware');
const { invalidatePrefixes } = require('../utils/cache');

const invalidateCRM = (req, res, next) => { invalidatePrefixes('crm'); next(); };

// Tag Management
<<<<<<< HEAD
router.get('/tags/all', requireAuth, requirePermission('Clientele', 'read'), cache('crm', 300), crmController.getAllTags);
router.post('/tags', requireAuth, requirePermission('Clientele', 'create'), invalidateCRM, crmController.createTag);
router.put('/tags/:tagId', requireAuth, requirePermission('Clientele', 'update'), invalidateCRM, crmController.updateTag);
router.delete('/tags/:tagId', requireAuth, requirePermission('Clientele', 'delete'), invalidateCRM, crmController.deleteTag);

// Customer CRUD
router.get('/', requireAuth, requirePermission('Clientele', 'read'), cache('crm', 90), crmController.getAllCustomers);
router.post('/', requireAuth, requirePermission('Clientele', 'create'), invalidateCRM, crmController.createCustomer);
router.post('/sync', requireAuth, requirePermission('Clientele', 'create'), invalidateCRM, crmController.syncBookingsToCRM);
router.get('/validate-smc/:smcId', requireAuth, requirePermission('Clientele', 'read'), cache('crm', 60), crmController.validateSMC);
router.get('/:id', requireAuth, requirePermission('Clientele', 'read'), crmController.getCustomerStats);

router.put('/:id', requireAuth, requirePermission('Clientele', 'update'), invalidateCRM, crmController.updateCustomerCRM);
router.delete('/:id', requireAuth, requirePermission('Clientele', 'delete'), invalidateCRM, crmController.deleteCustomer);
router.get('/booking/:bookingId/smc', requireAuth, requirePermission('Clientele', 'read'), cache('crm', 60), crmController.getSMCForBooking);
router.get('/memberships/all', requireAuth, requirePermission('Clientele', 'read'), cache('crm', 90), crmController.getAllMemberships);
router.post('/renew/:smcId', requireAuth, requirePermission('Clientele', 'update'), invalidateCRM, crmController.renewSMC);
router.get('/card/:smcId', requireAuth, requirePermission('Clientele', 'read'), cache('crm', 60), crmController.getSMCByCardId);
router.get('/config/smc', requireAuth, requirePermission('Clientele', 'read'), cache('crm', 300), crmController.getSMCConfig);
router.post('/:id/smc', requireAuth, requirePermission('Clientele', 'create'), invalidateCRM, crmController.issueSMC);
router.post('/:id/loyalty', requireAuth, requirePermission('Clientele', 'create'), invalidateCRM, crmController.issueLoyaltyCard);

module.exports = router;

=======
router.get('/tags/all', requireAuth, cache('crm', 300), crmController.getAllTags);
router.post('/tags', requireAuth, invalidateCRM, crmController.createTag);
router.put('/tags/:tagId', requireAuth, invalidateCRM, crmController.updateTag);
router.delete('/tags/:tagId', requireAuth, invalidateCRM, crmController.deleteTag);

// Customer CRUD
router.get('/', requireAuth, cache('crm', 90), crmController.getAllCustomers);
router.post('/', requireAuth, invalidateCRM, crmController.createCustomer);
router.post('/sync', requireAuth, invalidateCRM, crmController.syncBookingsToCRM);
router.get('/validate-smc/:smcId', requireAuth, cache('crm', 60), crmController.validateSMC);
router.get('/:id', requireAuth, crmController.getCustomerStats);

router.put('/:id', requireAuth, invalidateCRM, crmController.updateCustomerCRM);
router.delete('/:id', requireAuth, invalidateCRM, crmController.deleteCustomer);
router.get('/booking/:bookingId/smc', requireAuth, cache('crm', 60), crmController.getSMCForBooking);
router.get('/memberships/all', requireAuth, cache('crm', 90), crmController.getAllMemberships);
router.post('/renew/:smcId', requireAuth, invalidateCRM, crmController.renewSMC);
router.get('/card/:smcId', requireAuth, cache('crm', 60), crmController.getSMCByCardId);
router.get('/config/smc', requireAuth, cache('crm', 300), crmController.getSMCConfig);
router.post('/:id/smc', requireAuth, invalidateCRM, crmController.issueSMC);

module.exports = router;
>>>>>>> b1d1b6bc1ab4fe98040e5c50349f87e080246976

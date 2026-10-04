const express = require('express');
const router = express.Router();
const requireAuth = require('../middleware/requireAuth');
const exportController = require('../controllers/exportController');

router.get('/datasets', requireAuth, exportController.getAvailableDatasets);
router.get('/:datasetKey', requireAuth, exportController.exportSingleDataset);
router.post('/multi', requireAuth, exportController.exportMultiDatasets);

module.exports = router;

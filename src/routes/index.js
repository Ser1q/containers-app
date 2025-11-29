const express = require('express');
const router = express.Router();
const zoneController = require('../controllers/zoneController');
const containerController = require('../controllers/containerController');
const asyncWrapper = require('../utils/asyncWrapper');

// zones
router.get('/zones', asyncWrapper(zoneController.list));
router.get('/zones/:id', asyncWrapper(zoneController.getById));
router.post('/zones', asyncWrapper(zoneController.create));
router.patch('/zones/:id', asyncWrapper(zoneController.update));

// containers
router.get('/containers', asyncWrapper(containerController.list));
router.get('/containers/:id', asyncWrapper(containerController.getById));
router.post('/containers', asyncWrapper(containerController.create));
router.patch('/containers/:id', asyncWrapper(containerController.update));

// assign container to zone
router.post('/zones/:zoneId/assign', asyncWrapper(zoneController.assignContainer));

module.exports = router;
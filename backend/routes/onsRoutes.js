const express = require('express');
const router = express.Router();
const onsController = require('../controllers/onsController');

router.get('/patients', onsController.getONSPatients);
router.get('/history/:id', onsController.getPatientONSHistory);
router.post('/add-entry', onsController.addONSEntry);
router.get('/inventory', onsController.getInventory);
router.post('/inventory/add', onsController.addInventoryItem);
router.put('/inventory/edit/:id', onsController.updateInventoryItem);
router.get('/prep-tasks', onsController.getPrepTasks);
router.patch('/mark-prepared/:id', onsController.markPrepared);
router.patch('/mark-served/:id', onsController.markServed);



module.exports = router;
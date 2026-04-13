const express = require('express');
const router = express.Router();
const patientListController = require('../controllers/patientListController');

// This will now work because getPatientList is defined in the controller
router.get('/patients', patientListController.getPatientList); 

router.post('/serve-patient', patientListController.servePatient);

module.exports = router;
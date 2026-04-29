const express = require('express');
const router = express.Router();
const patientListController = require('../controllers/patientListController');
const menuController = require('../controllers/menuController');

// All these now start with /api/patients/... because of app.use('/api', ...) in server.js

// GET http://localhost:5000/api/patients
router.get('/patients', patientListController.getPatientList); 

// POST http://localhost:5000/api/patients/serve-patient
router.post('/serve-patient', patientListController.servePatient);

// POST http://localhost:5000/api/patients/add-mock
router.post('/patients/add-mock', patientListController.addMockPatients);

// DELETE http://localhost:5000/api/patients/clear-all
router.delete('/patients/clear-all', patientListController.clearPatients);

// URL: GET http://localhost:5000/api/menu/events
router.get('/menu/events', menuController.getEvents); 

// URL: POST http://localhost:5000/api/menu/save-event
router.post('/menu/save-event', menuController.saveEvent); 


router.patch('/menu/status/:id', menuController.updateMenuStatus);

router.get('/patients/:id/profile', patientListController.getPatientProfile);

// PATCH http://localhost:5000/api/patients/:hospitalNumber/precaution
router.patch('/patients/:hospitalNumber/precaution', patientListController.updatePrecaution);


module.exports = router;
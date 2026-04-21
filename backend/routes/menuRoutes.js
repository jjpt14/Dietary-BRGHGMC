const express = require('express');
const router = express.Router();
const menuController = require('../controllers/menuController');

// --- DAILY MASTER MENU ROUTES ---
router.post('/save-menu', menuController.saveMenu);
router.get('/history', menuController.getMenuHistory);
router.patch('/status/:id', menuController.updateMenuStatus); // Fixed to match axios.patch('/status/:id')
router.delete('/:id', menuController.deleteMenu); // Fixed to match axios.delete('/:id')

// --- SPECIAL EVENT ROUTES ---
router.post('/save-event', menuController.saveEvent); // Added missing route
router.get('/events', menuController.getEvents);      // Added missing route
router.patch('/event-status/:id', menuController.updateEventStatus);
router.delete('/event/:id', menuController.deleteEvent); // Added missing route

module.exports = router;
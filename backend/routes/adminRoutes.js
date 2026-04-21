const express = require('express');
const adminController = require('../controllers/adminController');

const router = express.Router();


router.get('/dashboard', adminController.getDashboard);
router.get('/users', adminController.getUsers);
router.post('/users', adminController.createUser);
router.put('/users/:id', adminController.updateUser);
router.delete('/users/:id', adminController.deleteUser);
router.get('/logs', adminController.getAuditLogs);

module.exports = router;

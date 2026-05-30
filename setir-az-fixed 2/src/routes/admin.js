const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const authMiddleware = require('../middleware/auth');

// Admin üçün istifadəçi siyahısı linki: /api/admin/users
// Öncə authMiddleware işləyir, sonra məlumatlar gəlir
router.get('/users', authMiddleware, adminController.getAllUsers);

module.exports = router;
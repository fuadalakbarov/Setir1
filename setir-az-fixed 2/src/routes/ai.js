const express = require('express');
const router = express.Router();
const aiController = require('../controllers/aiController');
const authMiddleware = require('../middleware/auth');

// Süni intellekt emalı linki: /api/ai/process
// Bu linkə sorğu göndərilməzdən əvvəl authMiddleware işləyir və təhlükəsizliyi yoxlayır
router.post('/process', authMiddleware, aiController.processText);

module.exports = router;
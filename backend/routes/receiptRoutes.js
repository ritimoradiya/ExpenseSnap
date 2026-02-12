const express = require('express');
const router = express.Router();
const { uploadReceipt, processReceipt, getReceipt } = require('../controllers/receiptController');
const authMiddleware = require('../middleware/auth');
const upload = require('../config/multer');

// All routes require authentication
router.use(authMiddleware);

// Upload receipt image
router.post('/upload', upload.single('receipt'), uploadReceipt);

// Process receipt with OCR
router.post('/process', processReceipt);

// Get receipt by ID
router.get('/:id', getReceipt);

module.exports = router;
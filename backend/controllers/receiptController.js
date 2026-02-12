const pool = require('../config/database');
const Tesseract = require('tesseract.js');
const fs = require('fs').promises;
const path = require('path');

// Upload receipt image
const uploadReceipt = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No image file uploaded'
      });
    }

    const userId = req.user.id;
    const imagePath = req.file.path;
    const imageUrl = `/uploads/${req.file.filename}`;

    res.status(200).json({
      success: true,
      message: 'Receipt uploaded successfully',
      data: {
        imageUrl,
        imagePath,
        filename: req.file.filename
      }
    });
  } catch (error) {
    console.error('Error uploading receipt:', error);
    res.status(500).json({
      success: false,
      message: 'Error uploading receipt'
    });
  }
};

// Process receipt with OCR
const processReceipt = async (req, res) => {
  try {
    const { imagePath } = req.body;

    if (!imagePath) {
      return res.status(400).json({
        success: false,
        message: 'Image path is required'
      });
    }

    // Get full path
    const fullPath = path.join(__dirname, '..', imagePath);

    console.log('Starting OCR processing...');
    
    // Run Tesseract OCR
    const result = await Tesseract.recognize(fullPath, 'eng', {
      logger: info => console.log(info)
    });

    const extractedText = result.data.text;
    const confidence = result.data.confidence;

    console.log('OCR Complete!');
    console.log('Extracted Text:', extractedText);
    console.log('Confidence:', confidence);

    // Parse the extracted text
    const parsedData = parseReceiptText(extractedText);
    parsedData.ocrConfidence = confidence;

    res.status(200).json({
      success: true,
      message: 'OCR processing complete',
      data: {
        rawText: extractedText,
        parsed: parsedData,
        confidence: confidence
      }
    });
  } catch (error) {
    console.error('Error processing receipt:', error);
    res.status(500).json({
      success: false,
      message: 'Error processing receipt with OCR'
    });
  }
};

// Parse receipt text to extract merchant, amount, date
const parseReceiptText = (text) => {
  const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  
  let merchant = null;
  let amount = null;
  let date = null;
  let confidence = 0;

  // Extract merchant name (usually first line or line with caps)
  if (lines.length > 0) {
    merchant = lines[0];
    confidence += 33;
  }

  // Extract total amount (look for TOTAL, $ patterns)
  const amountRegex = /(?:total|amount|sum)[:\s]*\$?(\d+\.?\d{0,2})/i;
  const dollarRegex = /\$(\d+\.?\d{0,2})/;
  
  for (const line of lines) {
    const amountMatch = line.match(amountRegex) || line.match(dollarRegex);
    if (amountMatch) {
      amount = parseFloat(amountMatch[1]);
      confidence += 33;
      break;
    }
  }

  // Extract date (MM/DD/YYYY, MM-DD-YYYY, etc.)
  const dateRegex = /(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/;
  for (const line of lines) {
    const dateMatch = line.match(dateRegex);
    if (dateMatch) {
      date = dateMatch[1];
      confidence += 34;
      break;
    }
  }

  return {
    merchant,
    amount,
    date,
    confidence: Math.round(confidence),
    success: confidence >= 60
  };
};

// Get receipt by ID
const getReceipt = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const result = await pool.query(
      `SELECT r.*, t.amount, t.merchant_name, t.transaction_date 
       FROM receipts r
       LEFT JOIN transactions t ON r.transaction_id = t.id
       WHERE r.id = $1 AND t.user_id = $2`,
      [id, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Receipt not found'
      });
    }

    res.status(200).json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error fetching receipt:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching receipt'
    });
  }
};

module.exports = {
  uploadReceipt,
  processReceipt,
  getReceipt
};
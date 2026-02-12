const pool = require('../config/database');
const Tesseract = require('tesseract.js');
const sharp = require('sharp');
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

// Process receipt with OCR - Enhanced with image preprocessing
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

    console.log('Starting image preprocessing...');
    
    // Preprocess image for better OCR accuracy
    const processedPath = fullPath.replace(/\.(jpg|jpeg|png|gif)$/i, '-processed.png');
    
    await sharp(fullPath)
      .grayscale()                          // Convert to grayscale
      .normalize()                          // Enhance contrast
      .sharpen()                            // Sharpen text edges
      .resize(2000, 2000, {                 // Increase resolution
        fit: 'inside',
        withoutEnlargement: false
      })
      .threshold(128)                       // Convert to black & white
      .toFile(processedPath);

    console.log('Image preprocessed successfully!');
    console.log('Starting OCR processing...');
    
    // Run Tesseract OCR on PREPROCESSED image
    const result = await Tesseract.recognize(processedPath, 'eng', {
      logger: info => console.log(info)
    });

    const extractedText = result.data.text;
    const confidence = result.data.confidence;

    console.log('OCR Complete!');
    console.log('Extracted Text:', extractedText);
    console.log('Confidence:', confidence);

    // Parse the extracted text with enhanced algorithm
    const parsedData = parseReceiptText(extractedText);
    parsedData.ocrConfidence = confidence;

    // Clean up processed image
    try {
      await fs.unlink(processedPath);
      console.log('Cleaned up processed image');
    } catch (cleanupError) {
      console.log('Note: Could not clean up processed image');
    }

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

// Enhanced parsing algorithm - handles paper receipts, digital receipts, and various formats
const parseReceiptText = (text) => {
  const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  
  let merchant = null;
  let amount = null;
  let date = null;
  let confidence = 0;

  // 1. MERCHANT: First meaningful line (usually store name)
  if (lines.length > 0) {
    for (const line of lines) {
      // Skip common header words, look for actual merchant name
      if (line.length > 3 && 
          /[A-Za-z]/.test(line) && 
          !/(receipt|original|customer|copy)/i.test(line)) {
        merchant = line;
        confidence += 33;
        break;
      }
    }
  }

  // 2. AMOUNT: Multi-strategy keyword-based approach with priority ordering
  const reversedLines = [...lines].reverse();
  
  // Priority 1: "TOTAL" keyword (highest priority - NOT subtotal)
  if (!amount) {
    for (const line of reversedLines) {
      // Match "Total" but NOT "Subtotal" or "Items Subtotal"
      const totalPatterns = [
        // Standard TOTAL pattern (excluding subtotal)
        /(?:^|[^a-z])total[:\s]+\$?(\d+\.?\d{0,2})(?:\s|$)/i,
        // TOTAL with transaction ID: "ID # 283 TOTAL 34.43"
        /(?:id|trans|transaction)[\s#]*\d+\s+total[:\s]*\$?(\d+\.?\d{0,2})/i,
        // TOTAL at end of line
        /total[:\s]*\$?(\d+\.?\d{0,2})$/i,
      ];
      
      // Skip if line contains "subtotal" or "items"
      if (/subtotal|items\s+subtotal/i.test(line)) {
        continue;
      }
      
      for (const pattern of totalPatterns) {
        const match = line.match(pattern);
        if (match) {
          const potentialAmount = parseFloat(match[1]);
          if (potentialAmount > 0 && potentialAmount < 100000) {
            amount = potentialAmount;
            confidence += 34;
            break;
          }
        }
      }
      if (amount) break;
    }
  }
  
  // Priority 2: "Grand Total" or "Amount Due" (high priority)
  if (!amount) {
    for (const line of reversedLines) {
      const patterns = [
        /(?:grand total|amount due|balance due|order total)[:\s]*\$?(\d+\.?\d{0,2})/i,
        /(?:total amount|final total)[:\s]*\$?(\d+\.?\d{0,2})/i,
      ];
      
      for (const pattern of patterns) {
        const match = line.match(pattern);
        if (match) {
          const potentialAmount = parseFloat(match[1]);
          if (potentialAmount > 0 && potentialAmount < 100000) {
            amount = potentialAmount;
            confidence += 32;
            break;
          }
        }
      }
      if (amount) break;
    }
  }
  
  // Priority 3: "Subtotal" as fallback (lower priority)
  if (!amount) {
    for (const line of reversedLines) {
      const subtotalPattern = /(?:subtotal|sub total)[:\s]*\$?(\d+\.?\d{0,2})/i;
      const match = line.match(subtotalPattern);
      
      if (match) {
        const potentialAmount = parseFloat(match[1]);
        if (potentialAmount > 0 && potentialAmount < 100000) {
          amount = potentialAmount;
          confidence += 25; // Lower confidence for subtotal
          break;
        }
      }
    }
  }
  
  // Priority 4: Dollar amount in last 10 lines (isolated amounts)
  if (!amount) {
    const lastLines = lines.slice(-10);
    for (const line of lastLines.reverse()) {
      // Look for isolated dollar amounts (likely totals)
      const matches = [
        line.match(/\$(\d+\.\d{2})$/),              // $XX.XX at end of line
        line.match(/\$(\d+\.\d{2})\s*$/),           // $XX.XX with whitespace
        line.match(/^[\s\$]*(\d+\.\d{2})\s*$/),     // Just the number
        line.match(/[\s]+(\d+\.\d{2})$/),           // Spaces then amount at end
      ];
      
      for (const match of matches) {
        if (match) {
          const potentialAmount = parseFloat(match[1]);
          // Must be reasonable amount
          if (potentialAmount > 1 && potentialAmount < 100000) {
            amount = potentialAmount;
            confidence += 15;
            break;
          }
        }
      }
      if (amount) break;
    }
  }
  
  // Priority 5: Any dollar amount as last resort (very low confidence)
  if (!amount) {
    // Find all dollar amounts
    const allAmounts = text.match(/\$?(\d+\.\d{2})/g);
    if (allAmounts && allAmounts.length > 0) {
      // Take one from the last few amounts found
      const lastAmount = allAmounts[allAmounts.length - 1];
      const potentialAmount = parseFloat(lastAmount.replace('$', ''));
      if (potentialAmount > 0 && potentialAmount < 100000) {
        amount = potentialAmount;
        confidence += 10;
      }
    }
  }

  // 3. DATE: Multiple patterns with validation
  const datePatterns = [
    /(\d{2}\/\d{2}\/\d{4})/,                        // MM/DD/YYYY
    /(\d{2}\/\d{2}\/\d{2})/,                        // MM/DD/YY
    /(\d{2}-\d{2}-\d{2,4})/,                        // MM-DD-YY or MM-DD-YYYY
    /(\d{1,2}\/\d{1,2}\/\d{2,4})/,                  // M/D/YY or M/D/YYYY
    /Date[:\s]*(\d{2}\/\d{2}\/\d{2,4})/i,           // Date: MM/DD/YY
    /(\d{4}-\d{2}-\d{2})/,                          // YYYY-MM-DD (ISO format)
  ];
  
  for (const line of lines) {
    for (const pattern of datePatterns) {
      const dateMatch = line.match(pattern);
      if (dateMatch) {
        const potentialDate = dateMatch[1];
        
        // Validate date logic
        const parts = potentialDate.split(/[\/\-]/);
        let month, day, year;
        
        // Handle different date formats
        if (parts[0].length === 4) {
          // YYYY-MM-DD format
          year = parseInt(parts[0]);
          month = parseInt(parts[1]);
          day = parseInt(parts[2]);
        } else {
          // MM/DD/YY or MM/DD/YYYY format
          month = parseInt(parts[0]);
          day = parseInt(parts[1]);
          year = parseInt(parts[2]);
        }
        
        // Basic validation: reasonable month and day
        if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
          date = potentialDate;
          confidence += 33;
          break;
        }
      }
    }
    if (date) break;
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
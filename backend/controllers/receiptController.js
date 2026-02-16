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

// Process receipt with OCR
const processReceipt = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No image file uploaded'
      });
    }

    const imagePath = req.file.path;
    const fullPath = path.resolve(imagePath);

    console.log('Starting image preprocessing...');
    console.log('Image path:', fullPath);
    
    // Preprocess image
    const processedPath = fullPath.replace(/\.(jpg|jpeg|png|gif)$/i, '-processed.png');
    
    await sharp(fullPath)
      .grayscale()
      .normalize()
      .sharpen()
      .resize(2000, 2000, {
        fit: 'inside',
        withoutEnlargement: false
      })
      .threshold(128)
      .toFile(processedPath);

    console.log('Image preprocessed successfully!');
    console.log('Starting OCR processing...');
    
    // Run Tesseract OCR
    const result = await Tesseract.recognize(processedPath, 'eng', {
      logger: info => console.log(info)
    });

    const extractedText = result.data.text;
    const confidence = result.data.confidence;

    console.log('OCR Complete!');
    console.log('Extracted Text:', extractedText);
    console.log('Confidence:', confidence);

    // Parse the text
    const parsedData = parseReceiptText(extractedText);
    parsedData.ocrConfidence = confidence;

    // Clean up
    try {
      await fs.unlink(processedPath);
      console.log('Cleaned up processed image');
    } catch (cleanupError) {
      console.log('Note: Could not clean up processed image');
    }

    // IMPROVED: Smart category detection with fuzzy matching
    let suggestedCategory = 'Other';
    const merchantLower = (parsedData.merchant || '').toLowerCase();
    const fullTextLower = extractedText.toLowerCase();

    // Check both merchant name AND full text for better accuracy
    if (merchantLower.includes('grocery') || 
        merchantLower.includes('siddhi') ||
        fullTextLower.includes('grocery') ||
        merchantLower.includes('market') || 
        merchantLower.includes('supermarket') ||
        merchantLower.includes('walmart') ||
        merchantLower.includes('target')) {
      suggestedCategory = 'Grocery';
    }
    else if (merchantLower.includes('restaurant') || 
             merchantLower.includes('cafe') || 
             merchantLower.includes('coffee') ||
             merchantLower.includes('starbucks') ||
             merchantLower.includes('mcdonald')) {
      suggestedCategory = 'Food & Dining';
    }
    else if (merchantLower.includes('gas') ||
             merchantLower.includes('shell') ||
             merchantLower.includes('chevron') ||
             merchantLower.includes('uber') ||
             merchantLower.includes('lyft')) {
      suggestedCategory = 'Transportation';
    }

    console.log('Suggested Category:', suggestedCategory);

    // IMPROVED: Smart currency detection - prioritize $ count
    let detectedCurrency = 'USD';
    const hasRupee = extractedText.includes('₹') || extractedText.includes('Rs') || /INR|rupee/i.test(extractedText);
    const hasEuro = extractedText.includes('€') && /EUR|euro/i.test(extractedText);
    const hasPound = extractedText.includes('£') && /GBP|pound/i.test(extractedText);
    
    // Count dollar signs (most reliable indicator for USD)
    const dollarCount = (extractedText.match(/\$/g) || []).length;
    
    console.log('Dollar signs found:', dollarCount);
    
    if (hasRupee) {
      detectedCurrency = 'INR';
    } else if (hasEuro) {
      detectedCurrency = 'EUR';
    } else if (hasPound && dollarCount === 0) {
      detectedCurrency = 'GBP';
    } else if (dollarCount > 0) {
      detectedCurrency = 'USD';
    }

    console.log('Detected Currency:', detectedCurrency);

    // Return data
    res.status(200).json({
      success: true,
      message: 'OCR processing complete',
      merchant_name: parsedData.merchant || '',
      total: parsedData.amount || '',
      date: parsedData.date || new Date().toISOString().split('T')[0],
      category: suggestedCategory,
      currency: detectedCurrency,
      rawText: extractedText,
      confidence: confidence,
      parsed: parsedData
    });
  } catch (error) {
    console.error('Error processing receipt:', error);
    res.status(500).json({
      success: false,
      message: 'Error processing receipt with OCR',
      error: error.message
    });
  }
};

// Enhanced parsing
const parseReceiptText = (text) => {
  const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  
  let merchant = null;
  let amount = null;
  let date = null;
  let confidence = 0;

  // 1. MERCHANT: Look for lines with actual store names (avoid garbage)
  if (lines.length > 0) {
    for (const line of lines) {
      // Skip lines with random characters, look for clean merchant names
      const cleanLine = line.replace(/[^\w\s]/g, ''); // Remove special chars
      
      if (cleanLine.length > 5 && 
          cleanLine.length < 50 &&
          /[A-Za-z]{3,}/.test(cleanLine) && 
          !/(receipt|original|customer|copy|cashier|date|time)/i.test(cleanLine) &&
          !/^\d/.test(cleanLine)) { // Don't start with number
        merchant = cleanLine.trim();
        confidence += 33;
        break;
      }
    }
  }

  // 2. AMOUNT: Multi-strategy approach with SKIP for CHANGE/CASH
  const reversedLines = [...lines].reverse();
  
  // Priority 1: "TOTAL" keyword (highest priority)
  if (!amount) {
    for (const line of reversedLines) {
      const totalPatterns = [
        /(?:^|[^a-z])total[:\s]+\$?(\d+\.?\d{0,2})(?:\s|$)/i,
        /total[:\s]*\$?(\d+\.?\d{0,2})$/i,
      ];
      
      // SKIP these lines - they're not the total we want!
      if (/subtotal|items\s+subtotal|change|cash/i.test(line)) {
        continue;
      }
      
      for (const pattern of totalPatterns) {
        const match = line.match(pattern);
        if (match) {
          const potentialAmount = parseFloat(match[1]);
          if (potentialAmount > 0 && potentialAmount < 100000) {
            amount = potentialAmount;
            confidence += 34;
            console.log('Found TOTAL amount:', amount, 'from line:', line);
            break;
          }
        }
      }
      if (amount) break;
    }
  }
  
  // Fallback: Find amounts in last 15 lines (but skip CHANGE/CASH)
  if (!amount) {
    const lastLines = lines.slice(-15);
    for (const line of lastLines.reverse()) {
      // Skip CHANGE and CASH lines
      if (/change|cash/i.test(line)) {
        continue;
      }
      
      const matches = [
        line.match(/\$(\d+\.\d{2})/),
        line.match(/(\d+\.\d{2})/),
      ];
      
      for (const match of matches) {
        if (match) {
          const potentialAmount = parseFloat(match[1]);
          if (potentialAmount > 1 && potentialAmount < 100000) {
            amount = potentialAmount;
            confidence += 15;
            console.log('Found fallback amount:', amount, 'from line:', line);
            break;
          }
        }
      }
      if (amount) break;
    }
  }

  // 3. DATE: Enhanced patterns
  const datePatterns = [
    /(\d{1,2}\/\d{1,2}\/\d{2,4})/g,
    /(\d{1,2}-\d{1,2}-\d{2,4})/g,
    /Date[:\s]*(\d{1,2}\/\d{1,2}\/\d{2,4})/gi,
  ];

  for (const pattern of datePatterns) {
    const matches = text.match(pattern);
    if (matches) {
      for (const match of matches) {
        const cleanMatch = match.replace(/Date[:\s]*/i, '');
        const parts = cleanMatch.split(/[\/\-]/);
        
        let month = parseInt(parts[0]);
        let day = parseInt(parts[1]);
        let year = parseInt(parts[2]);
        
        // Handle 2-digit year
        if (year < 100) {
          year = year > 50 ? 1900 + year : 2000 + year;
        }
        
        // Validate
        if (month >= 1 && month <= 12 && 
            day >= 1 && day <= 31 && 
            year >= 2020 && year <= 2030) {
          // Format as YYYY-MM-DD
          date = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          confidence += 33;
          console.log('Parsed date:', cleanMatch, '→', date);
          break;
        }
      }
    }
    if (date) break;
  }

  // Fallback to today
  if (!date) {
    const today = new Date();
    date = today.toISOString().split('T')[0];
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
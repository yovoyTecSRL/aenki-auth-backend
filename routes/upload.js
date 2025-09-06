// /routes/upload.js
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(__dirname, '..', 'uploads');
    await fs.mkdir(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
    files: 5 // Max 5 files
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'text/plain',
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'image/jpeg',
      'image/png'
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`File type not supported: ${file.mimetype}`));
    }
  }
});

/**
 * Upload and process files
 * POST /api/upload
 */
router.post('/', upload.array('files', 5), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        error: 'No files uploaded',
        code: 'NO_FILES'
      });
    }

    const results = [];
    
    for (const file of req.files) {
      try {
        console.log(`📁 Processing file: ${file.originalname}`);
        
        const extractedContent = await extractContent(file);
        
        if (extractedContent.success) {
          // Train AeNKI with extracted content
          const personaService = require('../services/persona');
          const trainingResult = await personaService.trainAenki(extractedContent.content, {
            source: 'file',
            filename: file.originalname,
            mimetype: file.mimetype,
            size: file.size,
            type: 'document'
          });

          results.push({
            file: file.originalname,
            success: true,
            content_length: extractedContent.content.length,
            training: trainingResult
          });
        } else {
          results.push({
            file: file.originalname,
            success: false,
            error: extractedContent.error
          });
        }

        // Clean up uploaded file
        await fs.unlink(file.path);

      } catch (error) {
        results.push({
          file: file.originalname,
          success: false,
          error: error.message
        });
      }
    }

    const successful = results.filter(r => r.success).length;
    
    res.json({
      success: successful > 0,
      results,
      summary: {
        uploaded: req.files.length,
        processed: successful,
        failed: req.files.length - successful
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Upload error:', error.message);
    res.status(500).json({
      error: 'File upload failed',
      code: 'UPLOAD_ERROR',
      details: error.message
    });
  }
});

/**
 * Extract content from uploaded file
 */
async function extractContent(file) {
  try {
    const filePath = file.path;
    const mimetype = file.mimetype;

    switch (mimetype) {
      case 'text/plain':
        return await extractTextFile(filePath);
      
      case 'application/pdf':
        return await extractPDF(filePath);
      
      case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
        return await extractDocx(filePath);
      
      case 'application/vnd.ms-excel':
      case 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':
        return await extractExcel(filePath);
      
      case 'image/jpeg':
      case 'image/png':
        return await extractImage(filePath);
      
      default:
        return {
          success: false,
          error: `Unsupported file type: ${mimetype}`
        };
    }
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

async function extractTextFile(filePath) {
  try {
    const content = await fs.readFile(filePath, 'utf8');
    return {
      success: true,
      content: content.substring(0, 10000) // Limit to 10k chars
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function extractPDF(filePath) {
  try {
    const pdfParse = require('pdf-parse');
    const buffer = await fs.readFile(filePath);
    const data = await pdfParse(buffer);
    
    return {
      success: true,
      content: data.text.substring(0, 10000)
    };
  } catch (error) {
    return { success: false, error: 'PDF extraction failed' };
  }
}

async function extractDocx(filePath) {
  try {
    const mammoth = require('mammoth');
    const buffer = await fs.readFile(filePath);
    const result = await mammoth.extractRawText({ buffer });
    
    return {
      success: true,
      content: result.value.substring(0, 10000)
    };
  } catch (error) {
    return { success: false, error: 'DOCX extraction failed' };
  }
}

async function extractExcel(filePath) {
  try {
    const XLSX = require('xlsx');
    const workbook = XLSX.readFile(filePath);
    let content = '';
    
    workbook.SheetNames.forEach(sheetName => {
      const sheet = workbook.Sheets[sheetName];
      content += XLSX.utils.sheet_to_txt(sheet) + '\n';
    });
    
    return {
      success: true,
      content: content.substring(0, 10000)
    };
  } catch (error) {
    return { success: false, error: 'Excel extraction failed' };
  }
}

async function extractImage(filePath) {
  try {
    const Tesseract = require('tesseract.js');
    const { data: { text } } = await Tesseract.recognize(filePath, 'spa+eng');
    
    return {
      success: true,
      content: text.substring(0, 10000)
    };
  } catch (error) {
    return { success: false, error: 'OCR extraction failed' };
  }
}

module.exports = router;

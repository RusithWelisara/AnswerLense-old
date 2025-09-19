import express from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'path';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept images only
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  }
});

// API Routes

/**
 * POST /api/upload
 * Handles image upload for future AI analysis
 * Currently returns mock response
 */
app.post('/api/upload', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No image file provided'
      });
    }

    // Mock response - In production, this would process the image
    const mockResponse = {
      success: true,
      message: 'Image uploaded successfully',
      data: {
        fileId: `img_${Date.now()}`,
        filename: req.file.filename,
        originalName: req.file.originalname,
        size: req.file.size,
        uploadedAt: new Date().toISOString(),
        status: 'ready_for_analysis'
      }
    };

    res.json(mockResponse);
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to upload image'
    });
  }
});

/**
 * POST /api/analyze
 * Analyzes uploaded image content
 * Currently returns mock AI analysis
 */
app.post('/api/analyze', async (req, res) => {
  try {
    const { fileId, subject, difficulty } = req.body;

    if (!fileId) {
      return res.status(400).json({
        success: false,
        error: 'File ID is required'
      });
    }

    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Mock AI analysis response
    const mockAnalysis = {
      success: true,
      data: {
        analysisId: `analysis_${Date.now()}`,
        fileId: fileId,
        extractedText: "Sample extracted text from the image...",
        subject: subject || 'general',
        difficulty: difficulty || 'intermediate',
        explanations: [
          {
            id: 1,
            topic: "Key Concept Explanation",
            content: "This appears to be related to [subject matter]. The main concept here involves...",
            confidence: 0.92,
            type: "concept_explanation"
          },
          {
            id: 2,
            topic: "Step-by-Step Solution",
            content: "To solve this problem, follow these steps: 1) First, identify the given information... 2) Apply the relevant formula... 3) Calculate the result...",
            confidence: 0.88,
            type: "solution_steps"
          },
          {
            id: 3,
            topic: "Related Topics",
            content: "This concept is related to other topics you might want to study: [Topic A], [Topic B], [Topic C]",
            confidence: 0.85,
            type: "related_topics"
          }
        ],
        insights: [
          "This is a fundamental concept in the subject",
          "Practice similar problems to reinforce understanding",
          "Consider reviewing prerequisite topics if this seems challenging"
        ],
        studyTips: [
          "Create flashcards for key terms",
          "Practice with similar examples",
          "Connect this concept to real-world applications"
        ],
        analyzedAt: new Date().toISOString(),
        processingTime: "2.1 seconds"
      }
    };

    res.json(mockAnalysis);
  } catch (error) {
    console.error('Analysis error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to analyze content'
    });
  }
});

/**
 * GET /api/analysis/:id
 * Retrieves a specific analysis by ID
 */
app.get('/api/analysis/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Mock response - In production, this would fetch from database
    const mockAnalysis = {
      success: true,
      data: {
        analysisId: id,
        status: 'completed',
        createdAt: new Date().toISOString(),
        // ... other analysis data
      }
    };

    res.json(mockAnalysis);
  } catch (error) {
    console.error('Fetch analysis error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch analysis'
    });
  }
});

/**
 * POST /api/waitlist
 * Handles waitlist signups
 */
app.post('/api/waitlist', async (req, res) => {
  try {
    const { name, email } = req.body;

    if (!name || !email) {
      return res.status(400).json({
        success: false,
        error: 'Name and email are required'
      });
    }

    // Mock response - In production, this would save to database
    const mockResponse = {
      success: true,
      message: 'Successfully added to waitlist',
      data: {
        id: `waitlist_${Date.now()}`,
        name: name,
        email: email,
        position: Math.floor(Math.random() * 1000) + 1,
        joinedAt: new Date().toISOString()
      }
    };

    console.log('Waitlist signup:', { name, email });
    res.json(mockResponse);
  } catch (error) {
    console.error('Waitlist error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to join waitlist'
    });
  }
});

/**
 * GET /api/health
 * Health check endpoint
 */
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'AnswerLens API is running',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Error handling middleware
app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('API Error:', error);
  
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        error: 'File too large. Maximum size is 10MB.'
      });
    }
  }

  res.status(500).json({
    success: false,
    error: 'Internal server error'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found'
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`AnswerLens API server running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/api/health`);
});

export default app;
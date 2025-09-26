# AnswerLense Backend

A complete backend system for AnswerLense - an AI-powered document analysis platform that processes exam papers and study documents using OCR and Gemini AI.

## 🚀 Features

- **File Upload & Processing**: Support for PDF, JPG, PNG files up to 20MB
- **OCR Text Extraction**: Tesseract.js with multi-language support and retry logic
- **AI Analysis**: Google Gemini API integration for academic feedback
- **MongoDB Storage**: Persistent storage for analyses, feedback, and logs
- **Rate Limiting**: IP-based protection against abuse
- **Comprehensive Logging**: Winston logging with file rotation
- **Docker Support**: Full containerization with Docker Compose
- **Production Ready**: Error handling, security, and monitoring

## 📋 Prerequisites

- Node.js 18+ 
- MongoDB 6.0+
- Google Gemini API key
- Docker (optional, for containerized deployment)

## 🛠️ Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd answerlense
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment setup**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` with your configuration:
   ```env
   MONGODB_URI=mongodb://localhost:27017/answerlense
   GEMINI_API_KEY=your_gemini_api_key_here
   PORT=3001
   NODE_ENV=development
   ```

4. **Start MongoDB** (if running locally)
   ```bash
   mongod
   ```

5. **Run the application**
   ```bash
   # Development (with frontend)
   npm run dev
   
   # Backend only
   npm run dev:server
   
   # Production
   npm start
   ```

## 🐳 Docker Deployment

1. **Using Docker Compose** (recommended)
   ```bash
   # Set your Gemini API key
   export GEMINI_API_KEY=your_api_key_here
   
   # Start all services
   npm run docker:run
   
   # View logs
   npm run docker:logs
   
   # Stop services
   npm run docker:stop
   ```

2. **Manual Docker build**
   ```bash
   npm run docker:build
   docker run -p 3001:3001 answerlense-api
   ```

## 📚 API Documentation

### Upload Document
```http
POST /api/upload
Content-Type: multipart/form-data

file: [PDF/JPG/PNG file]
```

**Response:**
```json
{
  "status": "success",
  "analysisId": "64f8a1b2c3d4e5f6a7b8c9d0",
  "original_text": "Extracted text...",
  "analysis": "AI analysis...",
  "suggestions": [
    {
      "category": "grammar",
      "priority": "high",
      "suggestion": "Fix this issue...",
      "location": "paragraph 2"
    }
  ],
  "metadata": {
    "fileInfo": {...},
    "ocrConfidence": 95.2,
    "processingTime": 3500
  }
}
```

### Get Analysis Results
```http
GET /api/results/:id
```

### Submit Feedback
```http
POST /api/feedback
Content-Type: application/json

{
  "analysisId": "64f8a1b2c3d4e5f6a7b8c9d0",
  "rating": 5,
  "feedback": "Very helpful analysis!",
  "categories": ["accuracy", "helpfulness"]
}
```

### Health Check
```http
GET /health
```

## 🏗️ Architecture

```
server/
├── config/
│   └── database.js          # MongoDB connection
├── models/
│   ├── Analysis.js          # Analysis schema
│   ├── Feedback.js          # Feedback schema
│   └── ApiLog.js           # API logging schema
├── routes/
│   ├── upload.js           # File upload & processing
│   ├── results.js          # Analysis retrieval
│   └── feedback.js         # Feedback submission
├── utils/
│   ├── ocrProcessor.js     # Tesseract OCR handling
│   ├── aiProcessor.js      # Gemini AI integration
│   ├── fileProcessor.js    # File validation & processing
│   └── logger.js           # Winston logging setup
├── middleware/
│   ├── rateLimiter.js      # Rate limiting configs
│   └── apiLogger.js        # Request logging middleware
├── app.js                  # Express app setup
└── server.js              # Server startup & config
```

## 🔧 Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | `3001` |
| `NODE_ENV` | Environment | `development` |
| `MONGODB_URI` | MongoDB connection string | Required |
| `GEMINI_API_KEY` | Google Gemini API key | Required |
| `FRONTEND_URL` | Production frontend URL | - |
| `DEV_FRONTEND_URL` | Development frontend URL | `http://localhost:5173` |
| `RATE_LIMIT_WINDOW_MS` | Rate limit window | `900000` (15 min) |
| `RATE_LIMIT_MAX_REQUESTS` | Max requests per window | `100` |
| `MAX_FILE_SIZE` | Maximum file size | `20971520` (20MB) |
| `UPLOAD_DIR` | Upload directory | `uploads/` |

### Rate Limits

- **General API**: 100 requests per 15 minutes
- **File Upload**: 10 uploads per hour
- **Feedback**: 5 submissions per 5 minutes

## 🔍 Monitoring & Logging

- **Winston Logging**: Structured logs with rotation
- **API Request Logging**: All requests logged to MongoDB
- **Health Checks**: `/health` endpoint for monitoring
- **Error Tracking**: Comprehensive error handling and logging

## 🛡️ Security Features

- **CORS Protection**: Configured for specific origins
- **Rate Limiting**: IP-based request limiting
- **Helmet**: Security headers
- **Input Validation**: File type, size, and content validation
- **Error Sanitization**: No sensitive data in error responses

## 🚀 Deployment Options

### Heroku
```bash
# Add buildpack for Tesseract
heroku buildpacks:add https://github.com/heroku/heroku-buildpack-apt
heroku buildpacks:add heroku/nodejs

# Set environment variables
heroku config:set GEMINI_API_KEY=your_key
heroku config:set MONGODB_URI=your_mongodb_uri
```

### Railway/Render
- Set environment variables in dashboard
- Deploy from GitHub repository
- Ensure MongoDB addon is configured

### Firebase Functions
- Adapt for serverless deployment
- Configure Cloud Storage for file uploads
- Use Firestore instead of MongoDB

## 🧪 Testing

```bash
# Test file upload
curl -X POST http://localhost:3001/api/upload \
  -F "file=@test-document.jpg"

# Test health check
curl http://localhost:3001/health
```

## 📈 Performance

- **OCR Processing**: ~2-5 seconds per page
- **AI Analysis**: ~3-8 seconds depending on text length
- **File Size Limit**: 20MB maximum
- **Concurrent Uploads**: Handled via rate limiting
- **Memory Usage**: ~100-200MB base, scales with file processing

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For issues and questions:
- Check the logs: `tail -f logs/combined.log`
- Review error responses from API endpoints
- Ensure all environment variables are set correctly
- Verify MongoDB connection and Gemini API key

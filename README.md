# AnswerLense Backend

A complete backend system for AnswerLense - an AI-powered document analysis platform that processes uploaded exam papers and documents using OCR and GPT-4 to provide structured feedback and suggestions.

## Features

### 🔧 **Core Functionality**
- **File Upload**: Support for PDF, JPG, PNG files up to 20MB
- **OCR Processing**: Tesseract.js integration with multi-language support
- **AI Analysis**: GPT-4 powered document analysis and feedback
- **Database Storage**: MongoDB with Mongoose for session and result management
- **Rate Limiting**: IP-based rate limiting for API protection

### 📊 **API Endpoints**
- `POST /api/upload` - Upload and analyze documents
- `GET /api/results/:id` - Retrieve analysis results
- `POST /api/feedback` - Save user feedback on AI responses
- `GET /api/health` - Health check endpoint

### 🛡️ **Security & Performance**
- CORS protection with configurable origins
- Helmet.js security headers
- Request rate limiting
- Comprehensive error handling
- API request logging

### 🔍 **Advanced Features**
- Multi-page document processing
- Text chunking for long documents
- OCR confidence scoring
- Automatic text cleanup
- Feedback analytics

## Quick Start

### Prerequisites
- Node.js 18+ 
- MongoDB
- OpenAI API key

### Installation

1. **Clone and install dependencies:**
```bash
git clone <repository>
cd answerlense-backend
npm install
```

2. **Environment setup:**
```bash
cp .env.example .env
# Edit .env with your configuration
```

3. **Start MongoDB:**
```bash
# Local MongoDB
mongod

# Or using Docker
docker run -d -p 27017:27017 --name mongodb mongo:6.0
```

4. **Run the application:**
```bash
# Development
npm run dev

# Production
npm start
```

## Environment Variables

```env
# Server Configuration
PORT=3001
NODE_ENV=development

# Database
MONGODB_URI=mongodb://localhost:27017/answerlense

# OpenAI API
OPENAI_API_KEY=your_openai_api_key_here

# CORS Configuration
FRONTEND_URL=https://answerlense.netlify.app

# File Upload Configuration
MAX_FILE_SIZE=20971520
UPLOAD_DIR=uploads

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Logging
LOG_LEVEL=info
```

## Docker Deployment

### Using Docker Compose (Recommended)

```bash
# Build and start all services
npm run docker:run

# View logs
npm run docker:logs

# Stop services
npm run docker:stop
```

### Manual Docker Build

```bash
# Build image
npm run docker:build

# Run container
docker run -d \
  -p 3001:3001 \
  -e MONGODB_URI=mongodb://host.docker.internal:27017/answerlense \
  -e OPENAI_API_KEY=your_key_here \
  answerlense-backend
```

## API Usage Examples

### Upload Document

```javascript
const formData = new FormData();
formData.append('document', file);
formData.append('language', 'eng');
formData.append('documentType', 'academic document');

const response = await fetch('/api/upload', {
  method: 'POST',
  body: formData
});

const result = await response.json();
```

### Get Results

```javascript
const response = await fetch(`/api/results/${analysisId}`);
const analysis = await response.json();
```

### Submit Feedback

```javascript
const response = await fetch('/api/feedback', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    analysisId: 'analysis_id_here',
    rating: 5,
    comment: 'Great analysis!'
  })
});
```

## Architecture

### File Processing Pipeline
1. **Upload Validation** - File type, size, and format validation
2. **File Processing** - PDF text extraction or image preprocessing
3. **OCR Processing** - Tesseract.js text extraction with retry logic
4. **Text Cleanup** - Remove artifacts, normalize formatting
5. **AI Analysis** - GPT-4 analysis with chunking for long documents
6. **Database Storage** - Save results and metadata
7. **Response** - Return structured analysis and suggestions

### Database Schema

**Analysis Collection:**
- File metadata (name, type, size)
- Extracted and cleaned text
- AI analysis and suggestions
- Processing metrics
- User feedback

**API Logs Collection:**
- Request/response logging
- Performance metrics
- Error tracking

## Monitoring & Logging

### Winston Logging
- Structured JSON logging
- Multiple log levels (error, warn, info, debug)
- File rotation and cleanup
- Console output in development

### Health Checks
- `/health` endpoint for monitoring
- Docker health checks
- Database connection monitoring

### Performance Metrics
- Processing time tracking
- OCR confidence scoring
- API response times
- Rate limiting statistics

## Error Handling

### File Upload Errors
- File size limits (20MB)
- Unsupported file types
- Corrupted files
- OCR processing failures

### AI Processing Errors
- OpenAI API failures
- Token limit exceeded
- Insufficient text content
- Network timeouts

### Database Errors
- Connection failures
- Validation errors
- Storage limits

## Security Features

### Input Validation
- File type validation
- Size limits
- Content sanitization
- SQL injection prevention

### Rate Limiting
- IP-based limiting
- Endpoint-specific limits
- Configurable windows
- Graceful degradation

### CORS Protection
- Origin validation
- Credential handling
- Method restrictions

## Development

### Project Structure
```
server/
├── config/          # Database configuration
├── models/          # Mongoose schemas
├── routes/          # API route handlers
├── middleware/      # Custom middleware
├── utils/           # Utility functions
├── logs/            # Log files
└── uploads/         # Temporary file storage
```

### Adding New Features
1. Create route handlers in `routes/`
2. Add middleware in `middleware/`
3. Update database models in `models/`
4. Add utility functions in `utils/`
5. Update API documentation

### Testing
```bash
# Run tests (when implemented)
npm test

# Health check
curl http://localhost:3001/health
```

## Production Deployment

### Environment Setup
1. Set `NODE_ENV=production`
2. Configure production MongoDB
3. Set up proper logging
4. Configure reverse proxy (nginx)
5. Set up SSL certificates
6. Configure monitoring

### Performance Optimization
- Enable MongoDB indexes
- Configure connection pooling
- Set up caching (Redis)
- Optimize image processing
- Enable compression

### Scaling Considerations
- Horizontal scaling with load balancer
- Database sharding
- File storage optimization
- CDN for static assets
- Queue system for heavy processing

## Troubleshooting

### Common Issues

**OCR Processing Fails:**
- Check image quality and resolution
- Verify Tesseract.js installation
- Check memory limits

**AI Analysis Errors:**
- Verify OpenAI API key
- Check token limits
- Monitor rate limits

**Database Connection Issues:**
- Verify MongoDB is running
- Check connection string
- Verify network connectivity

### Debug Mode
```bash
LOG_LEVEL=debug npm run dev
```

## Contributing

1. Fork the repository
2. Create feature branch
3. Make changes with tests
4. Update documentation
5. Submit pull request

## License

MIT License - see LICENSE file for details.

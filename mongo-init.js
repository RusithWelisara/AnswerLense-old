// MongoDB initialization script
// This script runs when the MongoDB container starts for the first time

db = db.getSiblingDB('answerlense');

// Create collections with validation
db.createCollection('analyses', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['originalText', 'analysis', 'status'],
      properties: {
        originalText: {
          bsonType: 'string',
          maxLength: 50000
        },
        analysis: {
          bsonType: 'string',
          maxLength: 20000
        },
        suggestions: {
          bsonType: 'array',
          items: {
            bsonType: 'object',
            required: ['category', 'suggestion'],
            properties: {
              category: {
                enum: ['grammar', 'clarity', 'structure', 'content', 'formatting']
              },
              priority: {
                enum: ['high', 'medium', 'low']
              },
              suggestion: {
                bsonType: 'string',
                maxLength: 1000
              }
            }
          }
        },
        status: {
          enum: ['processing', 'completed', 'failed']
        }
      }
    }
  }
});

db.createCollection('feedbacks', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['analysisId', 'rating', 'feedback'],
      properties: {
        rating: {
          bsonType: 'int',
          minimum: 1,
          maximum: 5
        },
        feedback: {
          bsonType: 'string',
          maxLength: 2000
        }
      }
    }
  }
});

db.createCollection('apilogs');

// Create indexes for better performance
db.analyses.createIndex({ createdAt: -1 });
db.analyses.createIndex({ status: 1 });
db.feedbacks.createIndex({ analysisId: 1 });
db.feedbacks.createIndex({ rating: 1 });
db.feedbacks.createIndex({ createdAt: -1 });
db.apilogs.createIndex({ timestamp: 1 }, { expireAfterSeconds: 2592000 }); // 30 days TTL
db.apilogs.createIndex({ endpoint: 1, timestamp: -1 });

print('AnswerLense database initialized successfully');
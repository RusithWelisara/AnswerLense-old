// MongoDB initialization script
db = db.getSiblingDB('answerlense');

// Create collections with validation
db.createCollection('analyses', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['originalFilename', 'fileType', 'extractedText', 'analysis'],
      properties: {
        originalFilename: { bsonType: 'string' },
        fileType: { bsonType: 'string', enum: ['pdf', 'jpg', 'jpeg', 'png'] },
        extractedText: { bsonType: 'string' },
        analysis: { bsonType: 'string' },
        suggestions: { bsonType: 'array' },
        processingTime: { bsonType: 'number' }
      }
    }
  }
});

db.createCollection('apilogs', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['method', 'url', 'statusCode', 'responseTime', 'ipAddress'],
      properties: {
        method: { bsonType: 'string' },
        url: { bsonType: 'string' },
        statusCode: { bsonType: 'number' },
        responseTime: { bsonType: 'number' },
        ipAddress: { bsonType: 'string' }
      }
    }
  }
});

// Create indexes for better performance
db.analyses.createIndex({ createdAt: -1 });
db.analyses.createIndex({ ipAddress: 1, createdAt: -1 });
db.apilogs.createIndex({ timestamp: -1 });
db.apilogs.createIndex({ timestamp: 1 }, { expireAfterSeconds: 2592000 }); // 30 days

print('Database initialized successfully');
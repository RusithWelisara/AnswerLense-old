import OpenAI from 'openai';
import logger from './logger.js';
import environment from '../config/environment.js';

/**
 * AI Processing utility for content analysis using OpenAI
 * Based on Replit OpenAI integration blueprint
 */

// the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
const OPENAI_MODEL = environment.OPENAI_MODEL || 'gpt-5';

class AIProcessor {
  constructor() {
    if (!environment.OPENAI_API_KEY) {
      throw new Error('OpenAI API key is required');
    }
    
    this.openai = new OpenAI({
      apiKey: environment.OPENAI_API_KEY,
    });
    
    this.defaultModel = OPENAI_MODEL;
    this.maxTokens = 4000;
    this.temperature = 0.7;
    this.maxBase64ImageSize = 20 * 1024 * 1024; // 20MB limit for base64 images
  }

  /**
   * Analyze extracted text content using AI
   * @param {string} extractedText - Text extracted from OCR
   * @param {Object} options - Analysis options
   * @returns {Promise<Object>} AI analysis result
   */
  async analyzeContent(extractedText, options = {}) {
    const startTime = Date.now();
    
    try {
      const {
        subject = 'general',
        difficulty = 'intermediate',
        language = 'en',
        includeImages = false,
        customPrompt = null,
      } = options;
      
      logger.info(`Starting AI analysis for ${subject} content (${difficulty} level)`);
      
      // Build the analysis prompt
      const prompt = customPrompt || this.buildAnalysisPrompt(extractedText, subject, difficulty, language);
      
      // Prepare messages for the AI
      const messages = [
        {
          role: 'system',
          content: this.getSystemPrompt(subject, difficulty, language),
        },
        {
          role: 'user',
          content: prompt,
        },
      ];
      
      // Make the API call
      const response = await this.openai.chat.completions.create({
        model: this.defaultModel,
        messages: messages,
        max_tokens: this.maxTokens,
        temperature: this.temperature,
        response_format: { type: "json_object" },
      });
      
      const processingTime = Date.now() - startTime;
      
      // Parse the AI response with error handling
      const aiResponse = this.parseJSONResponse(response.choices[0]?.message?.content);
      
      // Guard against missing usage data
      const tokensUsed = {
        input: response.usage?.prompt_tokens || 0,
        output: response.usage?.completion_tokens || 0,
      };
      
      // Structure the result
      const result = {
        summary: aiResponse.summary || 'No summary provided',
        explanations: this.formatExplanations(aiResponse.explanations || []),
        insights: aiResponse.insights || [],
        studyTips: aiResponse.study_tips || aiResponse.studyTips || [],
        relatedConcepts: aiResponse.related_concepts || aiResponse.relatedConcepts || [],
        model: this.defaultModel,
        modelVersion: 'latest',
        processingTime: processingTime,
        tokensUsed: tokensUsed,
        metadata: {
          subject: subject,
          difficulty: difficulty,
          language: language,
          totalTokens: response.usage?.total_tokens || tokensUsed.input + tokensUsed.output,
        },
      };
      
      logger.info(`AI analysis completed in ${processingTime}ms, used ${result.tokensUsed.input + result.tokensUsed.output} tokens`);
      
      return result;
      
    } catch (error) {
      const processingTime = Date.now() - startTime;
      logger.error('AI analysis failed:', error);
      
      throw new Error(`AI analysis failed: ${error.message}`);
    }
  }

  /**
   * Build analysis prompt based on content and parameters
   * @param {string} text - Extracted text to analyze
   * @param {string} subject - Subject area
   * @param {string} difficulty - Difficulty level
   * @param {string} language - Response language
   * @returns {string} Formatted prompt
   */
  buildAnalysisPrompt(text, subject, difficulty, language) {
    return `
Please analyze the following ${subject} content at a ${difficulty} level and provide a comprehensive educational analysis.

Text to analyze:
"""
${text}
"""

Please provide your analysis in JSON format with the following structure:
{
  "summary": "A clear, concise summary of the main concepts or content",
  "explanations": [
    {
      "id": "1",
      "topic": "Main concept or topic name",
      "content": "Detailed explanation of the concept",
      "confidence": 0.95,
      "type": "concept_explanation"
    }
  ],
  "insights": ["Key insights or important points"],
  "study_tips": ["Practical study recommendations"],
  "related_concepts": ["Related topics to explore"]
}

Explanation types can be: "concept_explanation", "solution_steps", "related_topics", "practical_application", "historical_context", "key_points"

Please ensure:
1. Content is appropriate for ${difficulty} level
2. Explanations are clear and educational
3. Include practical study tips
4. Suggest related concepts for further learning
5. Respond in ${language === 'en' ? 'English' : language}
`;
  }

  /**
   * Get system prompt based on subject and parameters
   * @param {string} subject - Subject area
   * @param {string} difficulty - Difficulty level
   * @param {string} language - Response language
   * @returns {string} System prompt
   */
  getSystemPrompt(subject, difficulty, language) {
    return `You are an expert educational AI assistant specializing in ${subject}. Your role is to analyze content and provide comprehensive, educational explanations suitable for ${difficulty} level learners.

Key responsibilities:
1. Provide accurate, well-structured analysis
2. Adapt explanations to the ${difficulty} difficulty level
3. Focus on educational value and clarity
4. Include practical learning recommendations
5. Maintain academic integrity and accuracy
6. Respond in valid JSON format only

Always provide educational content that helps students understand concepts better.`;
  }

  /**
   * Parse JSON response with error handling and schema validation
   * @param {string} content - JSON content to parse
   * @returns {Object} Parsed response or safe fallback
   */
  parseJSONResponse(content) {
    if (!content) {
      logger.warn('Empty response content from AI');
      return this.getEmptyResponse();
    }
    
    try {
      const parsed = JSON.parse(content);
      
      // Basic schema validation
      if (typeof parsed !== 'object' || parsed === null) {
        throw new Error('Response is not a valid object');
      }
      
      return parsed;
    } catch (error) {
      logger.error('Failed to parse AI response JSON:', error);
      logger.debug('Malformed content:', content.substring(0, 500));
      
      // Return safe fallback response
      return this.getEmptyResponse();
    }
  }
  
  /**
   * Get empty/fallback response structure
   * @returns {Object} Safe fallback response
   */
  getEmptyResponse() {
    return {
      summary: 'Analysis could not be completed due to processing error',
      explanations: [],
      insights: ['Please try again with different content'],
      study_tips: ['Content may need to be clearer or shorter'],
      related_concepts: []
    };
  }
  
  /**
   * Validate base64 image size and format
   * @param {string} base64Image - Base64 encoded image
   * @returns {Object} Validation result
   */
  validateBase64Image(base64Image) {
    const validation = {
      isValid: true,
      errors: [],
      size: 0
    };
    
    if (!base64Image || typeof base64Image !== 'string') {
      validation.isValid = false;
      validation.errors.push('Invalid base64 image format');
      return validation;
    }
    
    // Calculate approximate size (base64 is ~33% larger than binary)
    const sizeEstimate = (base64Image.length * 3) / 4;
    validation.size = sizeEstimate;
    
    if (sizeEstimate > this.maxBase64ImageSize) {
      validation.isValid = false;
      validation.errors.push(`Image size (${Math.round(sizeEstimate / 1024 / 1024)}MB) exceeds maximum allowed (${Math.round(this.maxBase64ImageSize / 1024 / 1024)}MB)`);
    }
    
    // Basic base64 format validation
    if (!/^[A-Za-z0-9+/]*={0,2}$/.test(base64Image)) {
      validation.isValid = false;
      validation.errors.push('Invalid base64 encoding format');
    }
    
    return validation;
  }

  /**
   * Format explanations to ensure consistent structure
   * @param {Array} explanations - Raw explanations from AI
   * @returns {Array} Formatted explanations
   */
  formatExplanations(explanations) {
    return explanations.map((exp, index) => ({
      id: exp.id || (index + 1).toString(),
      topic: exp.topic || 'Unnamed Topic',
      content: exp.content || exp.explanation || '',
      confidence: Math.min(Math.max(exp.confidence || 0.8, 0), 1),
      type: exp.type || 'concept_explanation',
    }));
  }

  /**
   * Analyze image content directly (if image analysis is needed)
   * @param {string} base64Image - Base64 encoded image
   * @param {Object} options - Analysis options
   * @returns {Promise<Object>} Image analysis result
   */
  async analyzeImage(base64Image, options = {}) {
    const startTime = Date.now();
    
    try {
      // Validate base64 image first
      const validation = this.validateBase64Image(base64Image);
      if (!validation.isValid) {
        throw new Error(`Image validation failed: ${validation.errors.join(', ')}`);
      }
      
      const {
        subject = 'general',
        difficulty = 'intermediate',
        language = 'en',
      } = options;
      
      logger.info(`Starting direct image analysis with AI (${Math.round(validation.size / 1024)}KB)`);
      
      const response = await this.openai.chat.completions.create({
        model: this.defaultModel,
        messages: [
          {
            role: 'system',
            content: this.getSystemPrompt(subject, difficulty, language),
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `Analyze this ${subject} image at a ${difficulty} level. Extract and explain any text, diagrams, equations, or educational content. Provide your analysis in the same JSON format as text analysis.`,
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:image/jpeg;base64,${base64Image}`,
                },
              },
            ],
          },
        ],
        max_tokens: this.maxTokens,
        temperature: this.temperature,
        response_format: { type: "json_object" },
      });
      
      const processingTime = Date.now() - startTime;
      const aiResponse = this.parseJSONResponse(response.choices[0]?.message?.content);
      
      // Guard against missing usage data
      const tokensUsed = {
        input: response.usage?.prompt_tokens || 0,
        output: response.usage?.completion_tokens || 0,
      };
      
      const result = {
        summary: aiResponse.summary || 'No summary provided',
        explanations: this.formatExplanations(aiResponse.explanations || []),
        insights: aiResponse.insights || [],
        studyTips: aiResponse.study_tips || aiResponse.studyTips || [],
        relatedConcepts: aiResponse.related_concepts || aiResponse.relatedConcepts || [],
        extractedText: aiResponse.extracted_text || '',
        model: this.defaultModel,
        modelVersion: 'latest',
        processingTime: processingTime,
        tokensUsed: tokensUsed,
      };
      
      logger.info(`Image analysis completed in ${processingTime}ms`);
      return result;
      
    } catch (error) {
      logger.error('Image analysis failed:', error);
      throw new Error(`Image analysis failed: ${error.message}`);
    }
  }

  /**
   * Generate study questions based on content
   * @param {string} content - Content to generate questions for
   * @param {Object} options - Question generation options
   * @returns {Promise<Array>} Generated questions
   */
  async generateStudyQuestions(content, options = {}) {
    try {
      const { subject = 'general', difficulty = 'intermediate', count = 5 } = options;
      
      const response = await this.openai.chat.completions.create({
        model: this.defaultModel,
        messages: [
          {
            role: 'system',
            content: `You are an educational content creator. Generate ${count} study questions based on the provided content for ${difficulty} level ${subject} students.`,
          },
          {
            role: 'user',
            content: `Generate study questions for this content:\n\n${content}\n\nProvide response in JSON format: {"questions": [{"question": "...", "type": "multiple_choice|short_answer|essay", "difficulty": "easy|medium|hard"}]}`,
          },
        ],
        response_format: { type: "json_object" },
      });
      
      const result = this.parseJSONResponse(response.choices[0]?.message?.content);
      return result.questions || [];
      
    } catch (error) {
      logger.error('Question generation failed:', error);
      throw new Error(`Question generation failed: ${error.message}`);
    }
  }

  /**
   * Get AI model information and capabilities
   * @returns {Object} Model information
   */
  getModelInfo() {
    return {
      model: this.defaultModel,
      maxTokens: this.maxTokens,
      temperature: this.temperature,
      capabilities: [
        'text_analysis',
        'image_analysis',
        'educational_content',
        'question_generation',
        'multi_language',
        'json_output',
      ],
      supportedSubjects: [
        'mathematics',
        'physics',
        'chemistry',
        'biology',
        'computer_science',
        'history',
        'literature',
        'geography',
        'economics',
        'psychology',
        'general',
      ],
    };
  }

  /**
   * Test AI connectivity and basic functionality
   * @returns {Promise<Object>} Test result
   */
  async testConnection() {
    try {
      const response = await this.openai.chat.completions.create({
        model: this.defaultModel,
        messages: [
          {
            role: 'user',
            content: 'Respond with {"status": "ok", "message": "AI processor is working correctly"} in JSON format.',
          },
        ],
        max_tokens: 50,
        response_format: { type: "json_object" },
      });
      
      return this.parseJSONResponse(response.choices[0]?.message?.content);
    } catch (error) {
      logger.error('AI connection test failed:', error);
      throw error;
    }
  }
}

export default new AIProcessor();
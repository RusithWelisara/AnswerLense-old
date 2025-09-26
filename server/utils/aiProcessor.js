import { GoogleGenerativeAI } from '@google/generative-ai';
import { logger } from './logger.js';

class AIProcessor {
  constructor() {
    this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    this.model = this.genAI.getGenerativeModel({ model: 'gemini-pro' });
    this.maxTokensPerChunk = 8000; // Conservative limit for Gemini
    this.temperature = 0.3;
  }

  /**
   * Generate academic analysis using Gemini
   * @param {string} text - Extracted text from document
   * @param {Object} options - Analysis options
   * @returns {Promise<Object>} Analysis results
   */
  async analyzeText(text, options = {}) {
    try {
      const startTime = Date.now();
      logger.info('Starting AI analysis with Gemini');

      // Check if text needs to be chunked
      const chunks = this.chunkText(text);
      logger.info(`Text split into ${chunks.length} chunks for analysis`);

      let analysis, suggestions;

      if (chunks.length === 1) {
        // Single chunk analysis
        const result = await this.analyzeSingleChunk(chunks[0]);
        analysis = result.analysis;
        suggestions = result.suggestions;
      } else {
        // Multi-chunk analysis
        const result = await this.analyzeMultipleChunks(chunks);
        analysis = result.analysis;
        suggestions = result.suggestions;
      }

      const processingTime = Date.now() - startTime;
      logger.info(`AI analysis completed in ${processingTime}ms`);

      return {
        analysis,
        suggestions,
        processingTime,
        chunkCount: chunks.length,
        success: true
      };

    } catch (error) {
      logger.error('AI analysis failed:', error);
      return {
        analysis: 'Analysis failed due to technical error. Please try again.',
        suggestions: [],
        processingTime: 0,
        error: error.message,
        success: false
      };
    }
  }

  /**
   * Analyze a single text chunk
   * @param {string} text - Text chunk to analyze
   * @returns {Promise<Object>} Analysis result
   */
  async analyzeSingleChunk(text) {
    const prompt = this.buildAnalysisPrompt(text);
    
    const result = await this.model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: this.temperature,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 2048,
      }
    });

    const response = result.response.text();
    return this.parseAnalysisResponse(response);
  }

  /**
   * Analyze multiple text chunks and combine results
   * @param {Array<string>} chunks - Text chunks to analyze
   * @returns {Promise<Object>} Combined analysis result
   */
  async analyzeMultipleChunks(chunks) {
    const chunkAnalyses = [];

    // Analyze each chunk
    for (let i = 0; i < chunks.length; i++) {
      logger.info(`Analyzing chunk ${i + 1}/${chunks.length}`);
      try {
        const result = await this.analyzeSingleChunk(chunks[i]);
        chunkAnalyses.push({
          ...result,
          chunkIndex: i,
          chunkText: chunks[i].substring(0, 100) + '...'
        });
      } catch (error) {
        logger.error(`Failed to analyze chunk ${i + 1}:`, error);
        chunkAnalyses.push({
          analysis: `Chunk ${i + 1} analysis failed`,
          suggestions: [],
          chunkIndex: i,
          error: error.message
        });
      }
    }

    // Combine results
    return this.combineChunkAnalyses(chunkAnalyses);
  }

  /**
   * Build analysis prompt for Gemini
   * @param {string} text - Text to analyze
   * @returns {string} Formatted prompt
   */
  buildAnalysisPrompt(text) {
    return `You are an expert academic writing assistant. Analyze the following student document for correctness, clarity, grammar, and improvements. Provide actionable feedback.

Document Text:
"""
${text}
"""

Please provide your analysis in the following JSON format:
{
  "analysis": "Overall analysis of the document (2-3 paragraphs)",
  "suggestions": [
    {
      "category": "grammar|clarity|structure|content|formatting",
      "priority": "high|medium|low",
      "suggestion": "Specific actionable suggestion",
      "location": "Where in the document this applies (optional)"
    }
  ]
}

Focus on:
1. Grammar and language usage
2. Clarity and coherence
3. Structure and organization
4. Content accuracy and completeness
5. Formatting and presentation

Provide constructive, specific, and actionable feedback. Be encouraging while pointing out areas for improvement.`;
  }

  /**
   * Parse Gemini response into structured format
   * @param {string} response - Raw Gemini response
   * @returns {Object} Parsed analysis and suggestions
   */
  parseAnalysisResponse(response) {
    try {
      // Try to extract JSON from response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          analysis: parsed.analysis || 'Analysis completed successfully.',
          suggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions : []
        };
      }
    } catch (error) {
      logger.warn('Failed to parse JSON response, using fallback parsing');
    }

    // Fallback parsing if JSON extraction fails
    return {
      analysis: response || 'Analysis completed successfully.',
      suggestions: this.extractSuggestionsFromText(response)
    };
  }

  /**
   * Extract suggestions from unstructured text response
   * @param {string} text - Response text
   * @returns {Array} Extracted suggestions
   */
  extractSuggestionsFromText(text) {
    const suggestions = [];
    const lines = text.split('\n');
    
    for (const line of lines) {
      if (line.includes('suggest') || line.includes('improve') || line.includes('consider')) {
        suggestions.push({
          category: 'general',
          priority: 'medium',
          suggestion: line.trim(),
          location: ''
        });
      }
    }

    return suggestions.slice(0, 10); // Limit to 10 suggestions
  }

  /**
   * Combine analyses from multiple chunks
   * @param {Array} chunkAnalyses - Individual chunk analyses
   * @returns {Object} Combined analysis
   */
  combineChunkAnalyses(chunkAnalyses) {
    const validAnalyses = chunkAnalyses.filter(a => !a.error);
    
    if (validAnalyses.length === 0) {
      return {
        analysis: 'Unable to analyze document due to processing errors.',
        suggestions: []
      };
    }

    // Combine analyses
    const combinedAnalysis = validAnalyses
      .map((a, i) => `Section ${i + 1}: ${a.analysis}`)
      .join('\n\n');

    // Combine and deduplicate suggestions
    const allSuggestions = validAnalyses.flatMap(a => a.suggestions);
    const uniqueSuggestions = this.deduplicateSuggestions(allSuggestions);

    return {
      analysis: `Document Analysis (${validAnalyses.length} sections):\n\n${combinedAnalysis}`,
      suggestions: uniqueSuggestions
    };
  }

  /**
   * Remove duplicate suggestions
   * @param {Array} suggestions - Array of suggestions
   * @returns {Array} Deduplicated suggestions
   */
  deduplicateSuggestions(suggestions) {
    const seen = new Set();
    return suggestions.filter(suggestion => {
      const key = `${suggestion.category}-${suggestion.suggestion.substring(0, 50)}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }

  /**
   * Split text into manageable chunks for AI processing
   * @param {string} text - Text to chunk
   * @returns {Array<string>} Text chunks
   */
  chunkText(text) {
    if (text.length <= this.maxTokensPerChunk) {
      return [text];
    }

    const chunks = [];
    const paragraphs = text.split('\n\n');
    let currentChunk = '';

    for (const paragraph of paragraphs) {
      if ((currentChunk + paragraph).length <= this.maxTokensPerChunk) {
        currentChunk += (currentChunk ? '\n\n' : '') + paragraph;
      } else {
        if (currentChunk) {
          chunks.push(currentChunk);
          currentChunk = paragraph;
        } else {
          // Paragraph is too long, split by sentences
          const sentences = paragraph.split('. ');
          for (const sentence of sentences) {
            if ((currentChunk + sentence).length <= this.maxTokensPerChunk) {
              currentChunk += (currentChunk ? '. ' : '') + sentence;
            } else {
              if (currentChunk) {
                chunks.push(currentChunk);
                currentChunk = sentence;
              } else {
                // Even single sentence is too long, force split
                chunks.push(sentence);
              }
            }
          }
        }
      }
    }

    if (currentChunk) {
      chunks.push(currentChunk);
    }

    return chunks.filter(chunk => chunk.trim().length > 0);
  }
}

export default new AIProcessor();
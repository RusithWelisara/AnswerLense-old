import OpenAI from 'openai';
import logger from './logger.js';

class AIProcessor {
  constructor() {
    this.openai = null; // Initialize lazily
    this.maxTokens = 4000; // GPT-4 context limit consideration
    this.temperature = 0.3; // Deterministic academic feedback
  }

  /**
   * Get OpenAI instance, initializing it if needed
   * @returns {OpenAI} OpenAI instance
   */
  getOpenAI() {
    if (!this.openai) {
      if (!process.env.OPENAI_API_KEY) {
        throw new Error('OpenAI API key is required. Please set OPENAI_API_KEY environment variable.');
      }
      this.openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY
      });
    }
    return this.openai;
  }

  /**
   * Analyze document text with AI
   * @param {string} text - Extracted text from document
   * @param {Object} options - Analysis options
   * @returns {Promise<Object>} AI analysis results
   */
  async analyzeDocument(text, options = {}) {
    const startTime = Date.now();
    
    try {
      logger.info('Starting AI analysis of document');

      // Validate input
      if (!text || text.trim().length < 50) {
        throw new Error('Insufficient text content for analysis');
      }

      // Handle long documents by chunking
      const chunks = this.chunkText(text);
      let analysis, suggestions;

      if (chunks.length === 1) {
        // Single chunk analysis
        const result = await this.analyzeSingleChunk(chunks[0], options);
        analysis = result.analysis;
        suggestions = result.suggestions;
      } else {
        // Multi-chunk analysis with summarization
        const result = await this.analyzeMultipleChunks(chunks, options);
        analysis = result.analysis;
        suggestions = result.suggestions;
      }

      const processingTime = Date.now() - startTime;
      logger.info(`AI analysis completed in ${processingTime}ms`);

      return {
        analysis,
        suggestions,
        processingTime,
        chunksProcessed: chunks.length
      };

    } catch (error) {
      const processingTime = Date.now() - startTime;
      logger.error(`AI analysis failed after ${processingTime}ms:`, error);
      throw new Error(`AI analysis failed: ${error.message}`);
    }
  }

  /**
   * Chunk text into manageable pieces for AI processing
   * @param {string} text - Input text
   * @returns {Array<string>} Text chunks
   */
  chunkText(text) {
    const maxChunkLength = 3000; // Conservative limit for GPT-4
    const chunks = [];
    
    if (text.length <= maxChunkLength) {
      return [text];
    }

    // Split by paragraphs first
    const paragraphs = text.split(/\n\s*\n/);
    let currentChunk = '';

    for (const paragraph of paragraphs) {
      if ((currentChunk + paragraph).length <= maxChunkLength) {
        currentChunk += (currentChunk ? '\n\n' : '') + paragraph;
      } else {
        if (currentChunk) {
          chunks.push(currentChunk);
          currentChunk = paragraph;
        } else {
          // Paragraph is too long, split by sentences
          const sentences = paragraph.split(/[.!?]+/);
          let sentenceChunk = '';
          
          for (const sentence of sentences) {
            if ((sentenceChunk + sentence).length <= maxChunkLength) {
              sentenceChunk += (sentenceChunk ? '. ' : '') + sentence;
            } else {
              if (sentenceChunk) {
                chunks.push(sentenceChunk);
                sentenceChunk = sentence;
              } else {
                // Even single sentence is too long, force split
                chunks.push(sentence.substring(0, maxChunkLength));
                sentenceChunk = sentence.substring(maxChunkLength);
              }
            }
          }
          
          if (sentenceChunk) {
            currentChunk = sentenceChunk;
          }
        }
      }
    }

    if (currentChunk) {
      chunks.push(currentChunk);
    }

    logger.info(`Text split into ${chunks.length} chunks for processing`);
    return chunks;
  }

  /**
   * Analyze a single text chunk
   * @param {string} text - Text chunk
   * @param {Object} options - Analysis options
   * @returns {Promise<Object>} Analysis result
   */
  async analyzeSingleChunk(text, options) {
    const prompt = this.buildAnalysisPrompt(text, options);
    
    const response = await this.openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: 'You are an expert academic reviewer and writing coach. Provide detailed, constructive feedback on academic documents, focusing on correctness, clarity, grammar, structure, and areas for improvement.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: this.temperature,
      max_tokens: this.maxTokens
    });

    return this.parseAIResponse(response.choices[0].message.content);
  }

  /**
   * Analyze multiple text chunks and synthesize results
   * @param {Array<string>} chunks - Text chunks
   * @param {Object} options - Analysis options
   * @returns {Promise<Object>} Combined analysis result
   */
  async analyzeMultipleChunks(chunks, options) {
    logger.info(`Analyzing ${chunks.length} chunks separately`);
    
    // Analyze each chunk
    const chunkAnalyses = await Promise.all(
      chunks.map((chunk, index) => 
        this.analyzeSingleChunk(chunk, { ...options, chunkIndex: index + 1 })
      )
    );

    // Synthesize results
    const synthesisPrompt = this.buildSynthesisPrompt(chunkAnalyses, chunks.length);
    
    const response = await this.openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: 'You are an expert academic reviewer. Synthesize multiple chunk analyses into a coherent overall assessment.'
        },
        {
          role: 'user',
          content: synthesisPrompt
        }
      ],
      temperature: this.temperature,
      max_tokens: this.maxTokens
    });

    return this.parseAIResponse(response.choices[0].message.content);
  }

  /**
   * Build analysis prompt for AI
   * @param {string} text - Text to analyze
   * @param {Object} options - Analysis options
   * @returns {string} Formatted prompt
   */
  buildAnalysisPrompt(text, options) {
    const { chunkIndex, documentType = 'academic document' } = options;
    
    let prompt = `Please analyze the following ${documentType}${chunkIndex ? ` (part ${chunkIndex})` : ''} and provide detailed feedback in the following JSON format:

{
  "analysis": "Overall assessment of the document's quality, strengths, and areas for improvement",
  "suggestions": [
    {
      "category": "grammar|structure|content|clarity|style",
      "content": "Specific suggestion for improvement",
      "priority": "high|medium|low"
    }
  ]
}

Focus on:
1. **Correctness**: Factual accuracy, logical consistency, proper citations
2. **Clarity**: Clear expression of ideas, appropriate vocabulary, coherent flow
3. **Grammar**: Spelling, punctuation, sentence structure, word choice
4. **Structure**: Organization, paragraph development, transitions
5. **Academic Standards**: Appropriate tone, evidence support, critical analysis

Document text:
"""
${text}
"""

Provide constructive, specific feedback that will help improve the document's quality.`;

    return prompt;
  }

  /**
   * Build synthesis prompt for multiple chunk analyses
   * @param {Array<Object>} analyses - Individual chunk analyses
   * @param {number} totalChunks - Total number of chunks
   * @returns {string} Synthesis prompt
   */
  buildSynthesisPrompt(analyses, totalChunks) {
    const analysesText = analyses.map((analysis, index) => 
      `Chunk ${index + 1} Analysis:\n${JSON.stringify(analysis, null, 2)}`
    ).join('\n\n');

    return `Based on the following ${totalChunks} individual chunk analyses of a document, provide a comprehensive overall assessment in JSON format:

${analysesText}

Synthesize these analyses into:
{
  "analysis": "Comprehensive overall assessment that considers patterns across all chunks",
  "suggestions": [
    {
      "category": "grammar|structure|content|clarity|style",
      "content": "Consolidated suggestion based on patterns across chunks",
      "priority": "high|medium|low"
    }
  ]
}

Focus on:
- Overall document coherence and flow
- Recurring issues across chunks
- Document-wide structural concerns
- Prioritized recommendations for improvement`;
  }

  /**
   * Parse AI response into structured format
   * @param {string} response - Raw AI response
   * @returns {Object} Parsed analysis and suggestions
   */
  parseAIResponse(response) {
    try {
      // Try to parse as JSON first
      const parsed = JSON.parse(response);
      
      return {
        analysis: parsed.analysis || 'Analysis not provided',
        suggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions : []
      };
    } catch (error) {
      logger.warn('Failed to parse AI response as JSON, attempting text extraction');
      
      // Fallback: extract analysis and suggestions from text
      const analysis = this.extractAnalysisFromText(response);
      const suggestions = this.extractSuggestionsFromText(response);
      
      return { analysis, suggestions };
    }
  }

  /**
   * Extract analysis from unstructured text response
   * @param {string} text - AI response text
   * @returns {string} Extracted analysis
   */
  extractAnalysisFromText(text) {
    // Look for analysis section
    const analysisMatch = text.match(/analysis['":]?\s*['"](.*?)['"]/is) ||
                         text.match(/overall.*?assessment['":]?\s*['"](.*?)['"]/is) ||
                         text.match(/^(.*?)(?:suggestions?|recommendations?)/is);
    
    return analysisMatch ? analysisMatch[1].trim() : text.substring(0, 500) + '...';
  }

  /**
   * Extract suggestions from unstructured text response
   * @param {string} text - AI response text
   * @returns {Array<Object>} Extracted suggestions
   */
  extractSuggestionsFromText(text) {
    const suggestions = [];
    
    // Look for numbered or bulleted suggestions
    const suggestionMatches = text.match(/(?:\d+\.|[-*])\s*(.+?)(?=\d+\.|[-*]|$)/gs);
    
    if (suggestionMatches) {
      suggestionMatches.forEach(match => {
        const content = match.replace(/^\d+\.|\s*[-*]\s*/, '').trim();
        if (content.length > 10) {
          suggestions.push({
            category: 'general',
            content,
            priority: 'medium'
          });
        }
      });
    }
    
    return suggestions;
  }
}

export default new AIProcessor();
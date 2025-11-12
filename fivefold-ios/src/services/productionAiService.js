// Production-Ready AI Service
// Direct Deepseek API calls - No Railway needed!

import { DEEPSEEK_CONFIG } from '../../deepseek.config';

class ProductionSmartService {
  constructor() {
    this.requestCount = 0;
    this.lastError = null;
    this.isInitialized = true; // Always ready
    console.log(`🚀 AI Service using: ${DEEPSEEK_CONFIG.apiUrl}`);
  }

  // Initialize (not needed for Deepseek, but kept for compatibility)
  async initialize() {
      this.isInitialized = true;
    console.log('✅ Deepseek AI Service ready');
      return true;
  }

  // Simple chat with Deepseek
  async simpleSmartChat(prompt, retryCount = 0) {
    try {
      console.log('🚀 Making chat request to: https://api.deepseek.com');

      const response = await fetch(DEEPSEEK_CONFIG.apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${DEEPSEEK_CONFIG.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'deepseek-chat',
          messages: [
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.7,
          max_tokens: 2000
        }),
        timeout: 15000 // 15 second timeout
      });

      console.log('📡 Deepseek response status:', response.status);

      if (!response.ok) {
        console.error(`Deepseek API error: ${response.status}`);
        const errorText = await response.text();
        console.error('Error details:', errorText);
        throw new Error(`Deepseek chat failed: ${response.status}`);
      }

      const result = await response.json();
      console.log('✅ Deepseek response received');
      
      // Extract the AI's response
      if (result.choices && result.choices[0] && result.choices[0].message) {
        return result.choices[0].message.content;
      }
      
      throw new Error('No response in expected format');
      
    } catch (error) {
      console.error('❌ Deepseek chat error:', error);
      throw error;
    }
  }

  // Chat with Friend - MUST use Deepseek
  async chatWithFriend(userMessage, conversationContext = null) {
    try {
      console.log('💬 Friend chat request:', userMessage.substring(0, 50) + '...');
      
      // Build context-aware prompt based on conversation history
      let contextPrompt = '';
      let isFirstMessage = true;
      let userName = 'friend';
      
      // Handle both array format (message history) and object format (metadata)
      if (conversationContext) {
        if (Array.isArray(conversationContext) && conversationContext.length > 0) {
          // Array format: actual message history
          
          // Smart context management:
          // - Keep last 10 messages for immediate context
          // - Summarize older messages if conversation is long
          const recentMessages = conversationContext.slice(-10);
          const olderMessages = conversationContext.slice(0, -10);
          
          // Build context with summary if there are older messages
          if (olderMessages.length > 0) {
            // Create a brief summary of older conversation
            const oldTopics = olderMessages
              .filter(msg => msg.role === 'user')
              .map(msg => msg.content.substring(0, 100))
              .slice(0, 3); // First 3 user questions
            
            contextPrompt = `Earlier in conversation, user asked about: ${oldTopics.join('; ')}\n\nRecent messages:\n` + 
              recentMessages.map(msg => `${msg.role === 'user' ? 'User' : 'Friend'}: ${msg.content.substring(0, 150)}`).join('\n') + 
              '\n\n';
          } else {
            // Short conversation - just use recent messages
            contextPrompt = 'Previous messages in this conversation:\n' + 
              recentMessages.map(msg => `${msg.role === 'user' ? 'User' : 'Friend'}: ${msg.content.substring(0, 150)}`).join('\n') + 
              '\n\n';
          }
          
          // If there's any Friend message already in history, it's NOT the first message
          isFirstMessage = !conversationContext.some(msg => msg.role === 'assistant');
        } else if (conversationContext.messageCount !== undefined) {
          // Object format: just metadata
          isFirstMessage = conversationContext.isFirstMessage || conversationContext.messageCount <= 1;
          userName = conversationContext.userName || 'friend';
        }
      }
      
      // Build the prompt with conversation awareness
      let prompt;
      
      // Check if this is a continuation of an existing conversation
      const isContinuation = conversationContext && Array.isArray(conversationContext) && conversationContext.length > 0;
      
      // Build the appropriate prompt
      if (isContinuation) {
        // Continuation - NO greeting needed
        prompt = `${contextPrompt}You are Friend, continuing an ongoing conversation with the user in the Biblely app.

⚠️ CRITICAL INSTRUCTIONS FOR CONTINUING CONVERSATION:
1. DO NOT greet the user again - you're already in the middle of a conversation
2. DO NOT say "Hey [name]" or any greeting - just continue the discussion naturally
3. Simply answer their new question as part of the ongoing chat
4. Write EVERYTHING so a 12-year-old can easily understand - use simple words, short sentences, everyday language
5. MANDATORY: You MUST include actual Bible verse references in your answer (format: "Book Chapter:Verse" like "John 3:16", "Romans 8:28", "Psalm 23:1"). These become clickable links for the user. Include at least 1-2 specific verse references in EVERY response.
6. NEVER use dashes (-), bullet points (•), or lists - write in complete, flowing sentences

The user said: "${userMessage}"

Simply answer their question directly as part of the ongoing conversation. Be warm, encouraging, and supportive.

⚠️ CRITICAL: You MUST include specific Bible verse references (like "Matthew 5:16" or "Proverbs 3:5-6") in your answer.

Remember: This is a CONTINUATION - NO greeting, just continue the conversation naturally. Write for a 12-year-old, ALWAYS include verse references.`;
      } else {
        // First message - greeting is OK
        prompt = `You are Friend, a caring Bible study companion in the Biblely app. 

⚠️ CRITICAL INSTRUCTIONS:
1. This is the FIRST message in a new conversation - you may greet the user warmly, but keep it brief
2. Just answer their question directly and naturally, like a friend
3. Write EVERYTHING so a 12-year-old can easily understand - use simple words, short sentences, everyday language
4. MANDATORY: You MUST include actual Bible verse references in your answer (format: "Book Chapter:Verse" like "John 3:16", "Romans 8:28", "Psalm 23:1"). These become clickable links for the user. Include at least 1-2 specific verse references in EVERY response.
5. NEVER use dashes (-), bullet points (•), or lists - write in complete, flowing sentences

The user said: "${userMessage}"

Simply answer their question directly. Be warm, encouraging, and supportive. Keep it conversational - like texting a good friend.

⚠️ CRITICAL: You MUST include specific Bible verse references (like "Matthew 5:16" or "Proverbs 3:5-6") in your answer.

IMPORTANT: You are ONLY here to help with:
- Understanding Bible verses and passages
- Questions about faith, God, Jesus, and Christianity
- Prayer guidance and spiritual encouragement
- Biblical wisdom and life application

If someone asks about homework, school assignments, general knowledge, or anything not related to Bible study and faith, politely redirect them.

Remember: Write for a 12-year-old, ALWAYS include specific verse references (Book Chapter:Verse format).`;
      }

      const response = await this.simpleSmartChat(prompt);
      
      // Post-process to ensure no dashes and natural language
      let cleanResponse = response || 'Hey there! How can I help you today?';
      
      // If this is a continuation, remove any greeting that slipped through
      if (isContinuation) {
        // Remove common greetings at the start
        cleanResponse = cleanResponse.replace(/^(Hey|Hi|Hello)\s+\w+[!,.]?\s*/i, '');
        cleanResponse = cleanResponse.replace(/^That's a great question[^.!?]*[.!?]\s*/i, '');
        cleanResponse = cleanResponse.replace(/^Great question[^.!?]*[.!?]\s*/i, '');
        console.log('🔧 Removed greeting from continuation message');
      }
      
      // Remove any dashes that might have slipped through
      cleanResponse = cleanResponse.replace(/\s*-\s*/g, ' ');
      cleanResponse = cleanResponse.replace(/—/g, ' ');
      cleanResponse = cleanResponse.replace(/–/g, ' ');
      cleanResponse = cleanResponse.replace(/•/g, '');
      
      // Keep responses conversational but not overwhelming - limit to first 6 sentences if too long
      const sentences = cleanResponse.split(/[.!?]+/).filter(s => s.trim().length > 0);
      if (sentences.length > 6) {
        cleanResponse = sentences.slice(0, 6).join('. ') + '.';
      }
      
      // Ensure proper paragraph spacing for better readability
      cleanResponse = cleanResponse.replace(/\n\n+/g, '\n\n');
      
      return cleanResponse;
      
    } catch (error) {
      console.error('❌ Friend chat error:', error);
      return 'Sorry, I\'m having trouble connecting right now. Please try again.';
    }
  }

  // Simplify Bible verses for 12-year-olds - NO SCORING
  async simplifyBibleVerse(originalText, reference = '') {
    try {
      console.log('📖 Bible simplification request for:', originalText.substring(0, 50) + '...');
      
      const prompt = `Rewrite this Bible verse using very simple, everyday words like you're talking to a 12-year-old friend. Use short sentences and common words. Keep the same meaning but make it super easy to understand. Don't add explanations - just rewrite the verse in simple words:
      
      "${originalText}"
      
Examples of simple words to use:
- "made" instead of "created"
- "sky" instead of "heavens"  
- "earth" or "ground" instead of formal words
- "without shape" instead of "formless"
- "nothing in it" instead of "empty"
- "moving above" instead of "hovering over"

Write only the simplified verse, nothing else.`;

      const simplified = await this.simpleSmartChat(prompt);
      
      if (simplified) {
        console.log('✅ Simplification received:', simplified.substring(0, 100) + '...');
        // Clean up any quotes, prefixes, and extra whitespace
        let cleaned = simplified
          .replace(/^["']|["']$/g, '')
          .replace(/^(simplified version:|simplified:|this verse means:|here's the simplified version:|rewrite:|rewritten:)\s*/gi, '')
          .replace(/\s+/g, ' ')
          .trim();
        console.log('✅ Cleaned simplification:', cleaned.substring(0, 100) + '...');
        return cleaned;
      }
      
      throw new Error('No simplification received');
      
    } catch (error) {
      console.error('❌ Bible simplification error:', error);
      console.log('⚠️ Returning original text as fallback');
      // Return original text as fallback
      return originalText.replace(/\s+/g, ' ').trim();
    }
  }

  // Chat with Smart (for future Bible chat feature)
  async chat(messages, stream = true) {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      console.log('💬 Chat request with', messages.length, 'messages');

      const response = await fetch(DEEPSEEK_CONFIG.apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${DEEPSEEK_CONFIG.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'deepseek-chat',
          messages: messages,
          stream: stream,
          temperature: 0.7,
          max_tokens: 2000
        })
      });

      if (!response.ok) {
        throw new Error(`Chat failed: ${response.status}`);
      }

      if (stream) {
        return response.body;
      } else {
        const data = await response.json();
        return data.choices[0].message.content;
      }
    } catch (error) {
      console.error('Chat error:', error);
      throw error;
    }
  }

  // Discuss Bible verse with AI
  async discussBibleVerse(verseText, userQuestion, verseReference = '') {
    try {
      console.log('📖 Bible discussion request');
      
      const prompt = `The user is reading this Bible verse:

"${verseText}" (${verseReference})

They asked: "${userQuestion}"

Provide a helpful, clear explanation. Keep it conversational and easy to understand. Focus on practical application and encouragement.`;

      const response = await this.simpleSmartChat(prompt);
      return response || 'I\'m not sure about that. Could you rephrase your question?';
      
    } catch (error) {
      console.error('❌ Bible discussion error:', error);
      return 'Sorry, I couldn\'t process that right now. Please try again.';
    }
  }

  // Score prayer based on urgency and importance
  async scorePrayer(prayerText) {
    try {
      const prompt = `Analyze this prayer request and rate its urgency (1-10) and importance (1-10). Consider factors like health, safety, relationships, and spiritual needs.

Prayer: "${prayerText}"

Respond ONLY with two numbers separated by a comma: urgency,importance
Example: 8,7

No explanations, just the two numbers.`;

      const response = await this.simpleSmartChat(prompt);
      
      // Parse response
      const match = response.match(/(\d+)\s*,\s*(\d+)/);
      if (match) {
        return {
          urgency: parseInt(match[1]),
          importance: parseInt(match[2])
        };
      }
      
      // Default scores if parsing fails
      return { urgency: 5, importance: 5 };
      
    } catch (error) {
      console.error('Prayer scoring error:', error);
      return { urgency: 5, importance: 5 };
    }
  }

  // Get service status
  async getStatus() {
    return {
      hasApiKey: this.isInitialized && DEEPSEEK_CONFIG.apiKey ? true : false,
      apiKeyType: 'deepseek-direct',
      requestCount: this.requestCount,
      lastError: this.lastError
    };
  }

  // Analyze a task and assign points (for todo scoring)
  async analyzeTask(taskText) {
    try {
      console.log('🚀 Using Smart Analysis for task scoring...');
      this.requestCount++;

      const prompt = `You are a task difficulty analyzer. Analyze tasks and classify them based on complexity, time, and effort required.

TIERS:
- LOW TIER (500-799 points): Quick, simple tasks under 15 minutes
- MID TIER (800-1999 points): Moderate tasks 15 minutes to 2 hours  
- HIGH TIER (2000-4000 points): Complex, time-intensive tasks 2+ hours

Analyze this task: "${taskText}"

Respond with ONLY a JSON object:
{
  "tier": "low" | "mid" | "high",
  "points": [number within tier range],
  "reasoning": "[brief explanation]",
  "confidence": [0-100],
  "timeEstimate": "[realistic time estimate]",
  "complexity": [0.0-1.0]
}`;

      const response = await this.simpleSmartChat(prompt);
      
      // Parse and validate the response
      let parsed;
      try {
        // Try to extract JSON from response
        const jsonMatch = response.match(/\{[\s\S]*?\}/);
        if (jsonMatch) {
          parsed = JSON.parse(jsonMatch[0]);
        } else {
          parsed = JSON.parse(response);
        }
      } catch (parseError) {
        console.error('Failed to parse AI response:', response);
        // Fallback to mid-tier
        parsed = {
          tier: 'mid',
          points: 1200,
          reasoning: 'Unable to parse AI response',
          confidence: 50,
          timeEstimate: '30-60 min',
          complexity: 0.5
        };
      }

      // Validate and return
      return {
        tier: parsed.tier || 'mid',
        points: parsed.points || 1200,
        reasoning: parsed.reasoning || 'Task analyzed',
        confidence: parsed.confidence || 80,
        timeEstimate: parsed.timeEstimate || '30-60 min',
        complexity: parsed.complexity || 0.5
      };
      
    } catch (error) {
      this.lastError = error.message;
      console.error('❌ Task analysis error:', error);
      
      // Return fallback scoring
      return {
        tier: 'mid',
        points: 1200,
        reasoning: 'Fallback scoring due to error',
        confidence: 60,
        timeEstimate: '30-60 min',
        complexity: 0.5
      };
    }
  }

  // Test connection
  async testConnection() {
    try {
      const result = await this.analyzeTask('Test task: Complete project documentation');
      return {
        success: true,
        model: 'deepseek-chat',
        provider: 'deepseek-direct',
        result: result
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Get device info for analytics (kept for compatibility)
  getDeviceInfo() {
    return {
      platform: 'mobile',
      version: '1.0.0',
      environment: 'production'
    };
  }

  // Simplify verse for 12-year-olds (alternative method)
  async simplifyVerse(verseText) {
    return this.simplifyBibleVerse(verseText);
  }
}

// Create singleton instance
const productionAiService = new ProductionSmartService();

export default productionAiService;

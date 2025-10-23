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
      
      // Build context-aware prompt
      let contextPrompt = '';
      if (conversationContext && conversationContext.length > 0) {
        const recentMessages = conversationContext.slice(-3);
        contextPrompt = 'Recent conversation:\n' + 
          recentMessages.map(msg => `${msg.role}: ${msg.content}`).join('\n') + 
          '\n\n';
      }
      
      const prompt = `${contextPrompt}You are Friend, a caring Bible study companion in the Biblely app. Your purpose is to help people understand the Bible, grow in their faith, and answer questions about God, Jesus, prayer, and spiritual matters.

The user said: "${userMessage}"

IMPORTANT: You are ONLY here to help with:
- Understanding Bible verses and passages
- Questions about faith, God, Jesus, and Christianity
- Prayer guidance and spiritual encouragement
- Biblical wisdom and life application

If someone asks about homework, school assignments, general knowledge, or anything not related to Bible study and faith, politely redirect them by saying something like: "I'm here to help with Bible study and faith questions. Is there a Bible verse or spiritual topic I can help you understand?"

Respond in a warm, conversational way. Be encouraging and supportive. Keep it natural and friendly - like texting a good friend who loves helping people understand the Bible. Don't use bullet points or lists. Just have a normal conversation.

Important: NEVER use dashes (-) or bullet points in your response. Write in complete, flowing sentences like you're talking to a friend.`;

      const response = await this.simpleSmartChat(prompt);
      
      // Post-process to ensure no dashes and natural language
      let cleanResponse = response || 'Hey there! How can I help you today?';
      
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

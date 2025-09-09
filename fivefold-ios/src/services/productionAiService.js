// Production-Ready AI Service
// Automatically switches between local development and production servers

import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

// Always use the cloud proxy (Railway)
const getProxyUrl = () => {
  // ALWAYS use Railway cloud proxy - no more local proxy
  return 'https://fivefold-proxy-production.up.railway.app';
};

const PROXY_BASE_URL = getProxyUrl();
let authToken = null;

class ProductionAIService {
  constructor() {
    this.requestCount = 0;
    this.lastError = null;
    this.isInitialized = false;
    console.log(`🌐 AI Service using: ${PROXY_BASE_URL}`);
  }

  // Initialize the service and get auth token
  async initialize() {
    try {
      console.log('🔄 Initializing AI service...');
      console.log('📍 Proxy URL:', PROXY_BASE_URL);
      
      // Clear any existing token first to force refresh
      await AsyncStorage.removeItem('proxy_auth_token');
      authToken = null;
      
      console.log('🔑 Getting new auth token...');
      // Get a new token from the proxy server
      const tokenResponse = await fetch(`${PROXY_BASE_URL}/auth/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          app: 'fivefold',
          timestamp: Date.now(),
          platform: Platform.OS,
          version: Constants.expoConfig?.version || '1.0.0'
        }),
        timeout: 10000 // 10 second timeout
      });

      console.log('📡 Token response status:', tokenResponse.status);

      if (!tokenResponse.ok) {
        const errorText = await tokenResponse.text();
        console.error('Token error details:', errorText);
        throw new Error(`Failed to get auth token: ${tokenResponse.status}`);
      }

      const tokenData = await tokenResponse.json();
      authToken = tokenData.token;
      
      if (!authToken) {
        throw new Error('No token received from server');
      }
      
      console.log('✅ Auth token received');
      
      // Store the token
      await AsyncStorage.setItem('proxy_auth_token', authToken);

      // Verify the proxy server is healthy
      console.log('🏥 Checking server health...');
      const healthResponse = await fetch(`${PROXY_BASE_URL}/health`, {
        timeout: 5000
      });
      
      if (!healthResponse.ok) {
        throw new Error(`Proxy server health check failed: ${healthResponse.status}`);
      }

      this.isInitialized = true;
      console.log('✅ Production AI Service initialized successfully');
      return true;
    } catch (error) {
      console.error('❌ Failed to initialize Production AI Service:', error);
      this.lastError = error.message;
      
      // If production server fails, still allow app to work with local scoring
      if (PROXY_BASE_URL.includes('railway.app')) {
        console.warn('⚠️ Production server unavailable, falling back to local mode');
        this.isInitialized = false;
      }
      
      return false;
    }
  }

  // Get service status
  async getStatus() {
    return {
      hasApiKey: this.isInitialized && !!authToken,
      apiKeyType: 'secure-proxy',
      requestCount: this.requestCount,
      lastError: this.lastError,
      proxyUrl: PROXY_BASE_URL,
      environment: __DEV__ ? 'development' : 'production'
    };
  }

  // Analyze a task using the secure proxy
  async analyzeTask(taskText) {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      if (!authToken || !this.isInitialized) {
        console.warn('⚠️ Smart Analysis not available');
        throw new Error('Smart Analysis unavailable. Please check your internet connection.');
      }

      console.log('🚀 Using Smart Analysis for task scoring...');
      this.requestCount++;

      // Add instruction for lenient scoring in the request
      const response = await fetch(`${PROXY_BASE_URL}/api/analyze-task`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          taskText: taskText,
          instructions: 'Be lenient and supportive! For example, if the task is "go gym", imagine the user is someone who rarely goes to the gym, so going right now is a huge positive change - rate it as mid or high tier. Always consider that any task could be a big step for the user. Give short supportive messages that celebrate their effort. Be generous with points and encouraging with your analysis.'
        }),
        timeout: 10000 // 10 second timeout
      });

      console.log('📡 Proxy response status:', response.status);

      if (response.status === 401) {
        // Token expired, try to refresh
        console.log('🔄 Token expired, refreshing...');
        await AsyncStorage.removeItem('proxy_auth_token');
        authToken = null;
        await this.initialize();
        
        // Retry the request once
        return this.analyzeTask(taskText);
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Proxy error: ${response.status}`);
      }

      const result = await response.json();
      console.log('✅ Smart Analysis complete:', result);
      
      return result;
    } catch (error) {
      this.lastError = error.message;
      console.error('❌ Smart analysis error:', error);
      
      // Don't fallback - show unavailable instead
      console.log('⚠️ Smart Analysis unavailable');
      throw new Error('Smart Analysis unavailable. Please check your connection.');
    }
  }

  // Local fallback analysis (doesn't use AI) - Be encouraging and lenient! 
  localTaskAnalysis(taskText) {
    const textLower = taskText.toLowerCase();
    const wordCount = taskText.split(' ').length;
    
    // Personal care and self-improvement are BIG achievements!
    const personalCareKeywords = ['gym', 'exercise', 'workout', 'walk', 'run', 'jog', 'bike', 'swim', 
                                  'meditate', 'pray', 'clean', 'shower', 'cook', 'meal', 'eat', 
                                  'sleep', 'rest', 'relax', 'self-care', 'selfcare', 'health',
                                  'doctor', 'dentist', 'therapy', 'appointment'];
    const simpleKeywords = ['reply', 'text', 'call', 'email', 'quick', 'check', 'remind', 'send'];
    const complexKeywords = ['project', 'presentation', 'study', 'exam', 'test', 'report', 
                            'research', 'build', 'create', 'design', 'plan', 'organize', 'complete'];
    
    // Check task type
    const isPersonalCare = personalCareKeywords.some(keyword => textLower.includes(keyword));
    const isSimple = simpleKeywords.some(keyword => textLower.includes(keyword));
    const isComplex = complexKeywords.some(keyword => textLower.includes(keyword));
    
    let tier = 'mid';
    let points = 150;
    let reasoning = '';
    let timeEstimate = '';
    
    // Special recognition for gym and exercise - these ARE big deals!
    if (textLower.includes('gym') || textLower.includes('workout') || textLower.includes('exercise')) {
      // Sometimes gym is a huge achievement!
      const randomBoost = Math.random();
      if (randomBoost > 0.7) {
        tier = 'high';
        points = 300;
        reasoning = 'Getting to the gym is a huge win! Your dedication to health is inspiring.';
        timeEstimate = '45-90 min';
      } else if (randomBoost > 0.3) {
        tier = 'mid';
        points = 200;
        reasoning = 'Great job prioritizing fitness! Every gym session counts.';
        timeEstimate = '30-60 min';
      } else {
        tier = 'mid';
        points = 150;
        reasoning = 'Nice work staying active! Consistency is key.';
        timeEstimate = '30-45 min';
      }
    } else if (isPersonalCare) {
      tier = 'mid';
      points = 150;
      reasoning = 'Taking care of yourself is important and worth celebrating!';
      timeEstimate = '20-45 min';
    } else if (isSimple && !isComplex) {
      tier = 'low';
      points = 50;
      reasoning = 'Quick win! These small tasks add up.';
      timeEstimate = '5-15 min';
    } else if (isComplex) {
      tier = 'high';
      points = 300;
      reasoning = 'This takes real focus and dedication. You\'ve got this!';
      timeEstimate = '1-2 hours';
    } else if (wordCount > 8) {
      tier = 'mid';
      points = 200;
      reasoning = 'Good detailed planning! Breaking it down helps.';
      timeEstimate = '30-60 min';
    } else {
      // Default: be encouraging and generous with points!
      tier = 'mid';
      points = 150;
      reasoning = 'Every task completed is progress. Keep going!';
      timeEstimate = '20-40 min';
    }
    
    return {
      tier,
      points,
      confidence: 85, // Higher confidence - we believe in you!
      reasoning,
      timeEstimate,
      complexity: tier === 'low' ? 0.3 : tier === 'mid' ? 0.5 : 0.8,
      isLocal: true // Flag to show this was local scoring
    };
  }

  // Simple AI chat - NO SCORING, just AI response
  async simpleAIChat(prompt, retryCount = 0) {
    try {
      if (!this.isInitialized) {
        console.log('🔄 Initializing AI service...');
        await this.initialize();
      }

      if (!authToken || !this.isInitialized) {
        throw new Error('AI service not available');
      }

      console.log('🚀 Making chat request to:', PROXY_BASE_URL);

      // Use the proper chat endpoint with messages format
      const response = await fetch(`${PROXY_BASE_URL}/api/chat`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [
            {
              role: 'user',
              content: prompt
            }
          ],
          stream: false,  // Don't stream for simplicity
          model: 'deepseek-chat'
        }),
        timeout: 15000 // 15 second timeout
      });

      console.log('📡 Chat response status:', response.status);

      if (response.status === 401) {
        console.log('🔄 Token expired, clearing and retrying...');
        // Token expired, clear it and retry once
        await AsyncStorage.removeItem('proxy_auth_token');
        authToken = null;
        this.isInitialized = false;
        
        if (retryCount < 1) {
          return await this.simpleAIChat(prompt, retryCount + 1);
        } else {
          throw new Error('Authentication failed after retry');
        }
      }

      if (!response.ok) {
        console.error(`Chat API error: ${response.status}`);
        const errorText = await response.text();
        console.error('Error details:', errorText);
        throw new Error(`AI chat failed: ${response.status}`);
      }

      const result = await response.json();
      console.log('✅ Chat response received');
      
      // Extract the AI's response
      if (result.choices && result.choices[0] && result.choices[0].message) {
        return result.choices[0].message.content;
      }
      
      throw new Error('No AI response in expected format');
      
    } catch (error) {
      console.error('❌ Simple AI chat error:', error);
      throw error;
    }
  }

  // Chat with Friend - MUST use AI
  async chatWithFriend(userMessage, conversationContext = null) {
    try {
      // Check if this is a verse interpretation request
      const isVerseInterpretation = userMessage.toLowerCase().includes('bible verse') || 
                                   userMessage.toLowerCase().includes('understand this') ||
                                   userMessage.includes('"') && userMessage.includes('-');
      
      // Extract user's name from the message if provided
      let userName = 'friend';
      const nameMatch = userMessage.match(/my name is (\w+)/i) || userMessage.match(/\(My name is (\w+)\)/i);
      if (nameMatch) {
        userName = nameMatch[1];
      }

      // Determine if this is the first message in the conversation
      const isFirstMessage = conversationContext?.isFirstMessage ?? true;
      const messageCount = conversationContext?.messageCount ?? 0;
      
      let prompt;
      if (isVerseInterpretation) {
        if (isFirstMessage) {
          prompt = `You are a warm, caring Christian friend having a personal conversation with ${userName}. The user is asking about a Bible verse: "${userMessage}"

          Respond as a close friend would, using their name "${userName}" naturally. Keep your response conversational but substantial - about 4-6 sentences that flow naturally.

          1. Start with a warm greeting using their name "${userName}"
          2. Give the main meaning in simple, relatable language with a brief example
          3. Share why this verse is encouraging or meaningful
          4. End with a thoughtful question to keep the conversation going

          IMPORTANT: When mentioning Bible verses, always use the format "Book Chapter:Verse" (like "Matthew 1:1" or "John 3:16") so they can be easily found and searched.

          Be warm, personal, and engaging. Never use dashes or bullet points. Sound like a caring friend who has time to chat properly but isn't writing an essay. Make it feel like a real, meaningful conversation.`;
        } else {
          prompt = `You are continuing a conversation with your friend ${userName}. They're asking about a Bible verse: "${userMessage}"

          Continue the conversation naturally - don't greet them again since you're already talking. Give the main meaning in simple, relatable language with a brief example. Share why this verse is encouraging or meaningful and end with a thoughtful question.

          IMPORTANT: When mentioning Bible verses, always use the format "Book Chapter:Verse" (like "Matthew 1:1" or "John 3:16") so they can be easily found and searched.

          Keep it conversational - about 4-6 sentences. Never use dashes or bullet points. Sound like you're continuing a natural chat with ${userName}.`;
        }
      } else {
        if (isFirstMessage) {
          prompt = `You are a warm Christian friend having a personal conversation with ${userName}. The user says: "${userMessage}"
          
          Respond naturally as a caring friend would, using their name "${userName}" in your response. Keep it conversational - about 3-5 sentences that feel natural and engaging.
          
          If they say hey, greet them warmly with their name and show genuine interest. Ask follow-up questions and share brief thoughts to keep the conversation flowing naturally.
          
          IMPORTANT: When mentioning Bible verses, always use the format "Book Chapter:Verse" (like "Matthew 1:1" or "John 3:16") so they can be easily found and searched.
          
          Never use dashes. Sound like a real person having a good chat with a close friend named ${userName}. Be warm, encouraging, and genuinely interested.`;
        } else {
          prompt = `You are continuing a conversation with your friend ${userName}. They just said: "${userMessage}"
          
          Continue the conversation naturally - don't greet them again since you're already chatting. Respond as a caring friend would. Keep it conversational - about 3-5 sentences that feel natural and engaging.
          
          IMPORTANT: When mentioning Bible verses, always use the format "Book Chapter:Verse" (like "Matthew 1:1" or "John 3:16") so they can be easily found and searched.
          
          Ask follow-up questions and share brief thoughts to keep the conversation flowing naturally. Never use dashes. Sound like you're continuing a natural chat with ${userName}.`;
        }
      }

      const response = await this.simpleAIChat(prompt);
      
      // Post-process to ensure no dashes and natural language
      let cleanResponse = response || 'Hey there! How can I help you today?';
      
      // Remove any dashes that might have slipped through
      cleanResponse = cleanResponse.replace(/\s*-\s*/g, ' ');
      cleanResponse = cleanResponse.replace(/—/g, ' ');
      cleanResponse = cleanResponse.replace(/–/g, ' ');
      cleanResponse = cleanResponse.replace(/•/g, '');
      
      // Replace "AI" references with more natural language [[memory:7174238]]
      cleanResponse = cleanResponse.replace(/\bAI\b/gi, 'I');
      cleanResponse = cleanResponse.replace(/artificial intelligence/gi, 'my understanding');
      
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
      console.log('📖 Bible simplification request');
      
      const prompt = `Rewrite this Bible verse so a 12-year-old can understand it. 
      Keep the same meaning but use simple words:
      
      "${originalText}"
      
      Write ONLY the simplified verse, nothing else.`;

      const simplified = await this.simpleAIChat(prompt);
      
      if (simplified) {
        // Clean up any quotes
        return simplified.replace(/^["']|["']$/g, '').trim();
      }
      
      throw new Error('No simplification received');
      
    } catch (error) {
      console.error('❌ Bible simplification error:', error);
      throw error;
    }
  }

  // Chat with AI (for future Bible chat feature)
  async chat(messages, stream = true) {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      if (!authToken) {
        throw new Error('Chat feature requires connection to server');
      }

      const response = await fetch(`${PROXY_BASE_URL}/api/chat`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages,
          stream
        })
      });

      if (response.status === 401) {
        // Token expired, refresh and retry
        await AsyncStorage.removeItem('proxy_auth_token');
        authToken = null;
        await this.initialize();
        return this.chat(messages, stream);
      }

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Proxy error: ${response.status}`);
      }

      if (stream) {
        // Handle streaming response
        return response.body;
      } else {
        return await response.json();
      }
    } catch (error) {
      this.lastError = error.message;
      console.error('❌ Chat error:', error);
      throw error;
    }
  }

  // Test connection to proxy server
  async testConnection() {
    try {
      const startTime = Date.now();
      
      if (!this.isInitialized) {
        await this.initialize();
      }

      const result = await this.analyzeTask('Test task: Complete project documentation');
      const responseTime = Date.now() - startTime;
      
      return {
        success: true,
        model: result.isLocal ? 'local-fallback' : 'deepseek-chat',
        provider: PROXY_BASE_URL,
        environment: __DEV__ ? 'development' : 'production',
        responseTime: `${responseTime}ms`,
        result: result
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        provider: PROXY_BASE_URL,
        environment: __DEV__ ? 'development' : 'production'
      };
    }
  }

  // Simplify verse for 12-year-olds
  async simplifyVerse(verseText) {
    try {
      await this.initialize();
      
      const prompt = `Please simplify this Bible verse so that a 12-year-old can easily understand it. Keep the meaning the same but use simple words and shorter sentences:

"${verseText}"

Please respond with only the simplified version, no explanations or extra text.`;

      const response = await fetch(`${PROXY_BASE_URL}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          message: prompt,
          model: 'groq',
          temperature: 0.3
        }),
        timeout: 30000
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.success && data.response) {
        return data.response.trim();
      } else {
        throw new Error(data.error || 'Failed to simplify verse');
      }
    } catch (error) {
      console.error('Error simplifying verse:', error);
      // Return a fallback simplified version
      return `This verse means: ${verseText}`;
    }
  }
}

// Create singleton instance
const productionAiService = new ProductionAIService();

// Auto-initialize when imported
productionAiService.initialize().catch(error => {
  console.warn('⚠️ Production AI Service initialization deferred:', error.message);
});

export default productionAiService;

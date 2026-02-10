// Secure AI Service - Uses proxy server for API calls
// This replaces the old aiService.js which had the API key exposed

import userStorage from '../utils/userStorage';

// Proxy server configuration
// Use your computer's IP address so the phone can reach it
const PROXY_BASE_URL = 'http://192.168.1.121:3001'; // Your laptop's IP
let authToken = null;

class SecureAIService {
  constructor() {
    this.requestCount = 0;
    this.lastError = null;
    this.isInitialized = false;
  }

  // Initialize the service and get auth token
  async initialize() {
    try {
      // Check if we have a stored token
      authToken = await userStorage.getRaw('proxy_auth_token');
      
      if (!authToken) {
        // Get a new token from the proxy server
        const response = await fetch(`${PROXY_BASE_URL}/auth/token`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            app: 'fivefold',
            timestamp: Date.now()
          })
        });

        if (!response.ok) {
          throw new Error('Failed to get auth token');
        }

        const data = await response.json();
        authToken = data.token;
        
        // Store the token
        await userStorage.setRaw('proxy_auth_token', authToken);
      }

      // Verify the proxy server is healthy
      const healthResponse = await fetch(`${PROXY_BASE_URL}/health`);
      if (!healthResponse.ok) {
        throw new Error('Proxy server is not healthy');
      }

      this.isInitialized = true;
      console.log('✅ Secure AI Service initialized successfully');
      return true;
    } catch (error) {
      console.error('❌ Failed to initialize Secure AI Service:', error);
      this.lastError = error.message;
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
      proxyUrl: PROXY_BASE_URL
    };
  }

  // Analyze a task using the secure proxy
  async analyzeTask(taskText) {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      if (!authToken) {
        throw new Error('Not authenticated with proxy server');
      }

      console.log('🚀 Using Secure Smart Analysis for task scoring...');
      this.requestCount++;

      const response = await fetch(`${PROXY_BASE_URL}/api/analyze-task`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          taskText: taskText
        })
      });

      console.log('📡 Proxy response status:', response.status);

      if (response.status === 401) {
        // Token expired, try to refresh
        console.log('🔄 Token expired, refreshing...');
        await userStorage.remove('proxy_auth_token');
        authToken = null;
        await this.initialize();
        
        // Retry the request
        return this.analyzeTask(taskText);
      }

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Proxy error: ${response.status}`);
      }

      const result = await response.json();
      console.log('✅ Secure Smart Analysis complete:', result);
      
      return result;
    } catch (error) {
      this.lastError = error.message;
      console.error('❌ Secure analyzeTask error:', error);
      
      // Fallback to local scoring if proxy fails
      console.log('⚠️ Falling back to local scoring');
      return this.localTaskAnalysis(taskText);
    }
  }

  // Local fallback analysis (doesn't use AI)
  localTaskAnalysis(taskText) {
    const lowKeywords = ['simple', 'quick', 'easy', 'basic', 'minor', 'small'];
    const highKeywords = ['complex', 'difficult', 'major', 'research', 'design', 'architecture'];
    
    const textLower = taskText.toLowerCase();
    const wordCount = taskText.split(' ').length;
    
    let tier = 'mid';
    let points = 1200;
    
    if (lowKeywords.some(keyword => textLower.includes(keyword)) || wordCount < 5) {
      tier = 'low';
      points = 650;
    } else if (highKeywords.some(keyword => textLower.includes(keyword)) || wordCount > 15) {
      tier = 'high';
      points = 3000;
    }
    
    return {
      tier,
      points,
      confidence: 60, // Lower confidence for local analysis
      reasoning: 'Local analysis based on keywords',
      timeEstimate: tier === 'low' ? '5-15 min' : tier === 'mid' ? '30-60 min' : '2+ hours',
      complexity: tier === 'low' ? 0.3 : tier === 'mid' ? 0.6 : 0.9
    };
  }

  // Chat with AI (for future Bible chat feature)
  async chat(messages, stream = true) {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      if (!authToken) {
        throw new Error('Not authenticated with proxy server');
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
        await userStorage.remove('proxy_auth_token');
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
      console.error('❌ Secure chat error:', error);
      throw error;
    }
  }

  // Test connection to proxy server
  async testConnection() {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      const result = await this.analyzeTask('Test task: Complete project documentation');
      return {
        success: true,
        model: 'deepseek-chat (via secure proxy)',
        provider: 'secure-proxy',
        result: result
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
}

// Create singleton instance
const secureAiService = new SecureAIService();

// Auto-initialize when imported
secureAiService.initialize().catch(error => {
  console.warn('⚠️ Secure AI Service initialization failed:', error);
});

export default secureAiService;

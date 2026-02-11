// Secure AI Service - DISABLED for production
// This was a development-only proxy service. Production uses productionAiService.js instead.
// Kept as minimal stub to prevent import errors.

class SecureAIService {
  constructor() {
    this.isInitialized = false;
    this.lastError = 'Proxy service disabled — use productionAiService instead';
  }

  async initialize() {
    return false;
  }

  async getStatus() {
    return {
      hasApiKey: false,
      apiKeyType: 'none',
      requestCount: 0,
      lastError: this.lastError,
      proxyUrl: null,
    };
  }

  async analyzeTask(taskText) {
    // Local-only fallback — no network requests
    return this.localTaskAnalysis(taskText);
  }

  localTaskAnalysis(taskText) {
    const lowKeywords = ['simple', 'quick', 'easy', 'basic', 'minor', 'small'];
    const highKeywords = ['complex', 'difficult', 'major', 'research', 'design', 'architecture'];

    const textLower = taskText.toLowerCase();
    const wordCount = taskText.split(' ').length;

    let tier = 'mid';
    let points = 92;

    if (lowKeywords.some(k => textLower.includes(k)) || wordCount < 5) {
      tier = 'low';
      points = 52;
    } else if (highKeywords.some(k => textLower.includes(k)) || wordCount > 15) {
      tier = 'high';
      points = 230;
    }

    return {
      tier,
      points,
      confidence: 60,
      reasoning: 'Local analysis based on keywords',
      timeEstimate: tier === 'low' ? '5-15 min' : tier === 'mid' ? '30-60 min' : '2+ hours',
      complexity: tier === 'low' ? 0.3 : tier === 'mid' ? 0.6 : 0.9,
    };
  }

  async chat() {
    throw new Error('Chat is not available via proxy. Use productionAiService instead.');
  }

  async testConnection() {
    return { success: false, error: 'Proxy service disabled for production' };
  }
}

const secureAiService = new SecureAIService();
export default secureAiService;

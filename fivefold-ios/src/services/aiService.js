// AI Service - Production Ready
// This file wraps the production AI service for backward compatibility
// Automatically switches between development and production servers

import productionAiService from './productionAiService';

class AIService {
  constructor() {
    // Delegate to production service
    this.secureService = productionAiService;
  }

  async getStatus() {
    return await this.secureService.getStatus();
  }

  async getApiKey() {
    // No longer expose API keys
    console.warn('⚠️ Direct API key access is deprecated for security');
    return null;
  }

  async analyzeTask(taskText) {
    return await this.secureService.analyzeTask(taskText);
  }

  async testConnection() {
    return await this.secureService.testConnection();
  }

  // Friend chat - conversational AI
  async chatWithFriend(userMessage, conversationContext = null) {
    return await this.secureService.chatWithFriend(userMessage, conversationContext);
  }

  // For future chat features
  async chat(messages, stream = true) {
    return await this.secureService.chat(messages, stream);
  }
}

// Create singleton instance
const aiService = new AIService();

export default aiService;
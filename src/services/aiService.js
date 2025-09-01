// Real AI-powered task analysis using Groq API for React Native
// Provides intelligent todo difficulty scoring with true understanding

import AsyncStorage from '@react-native-async-storage/async-storage';

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

// Get API key securely from AsyncStorage
const getApiKey = async () => {
  try {
    return await AsyncStorage.getItem('fivefold_groq_api_key');
  } catch (error) {
    console.error('Error getting API key:', error);
    return null;
  }
};

// AI prompt for intelligent task analysis
const TASK_ANALYSIS_PROMPT = `You are an expert task analyzer. Analyze the given todo task and classify it into one of three difficulty tiers based on real understanding, not just keywords.

Consider these factors:
- ACTUAL time required to complete
- Mental/physical effort needed  
- Skill level required
- Preparation needed
- Stress/importance level
- Context and implications

TIERS:
LOW TIER (10-89 points): Quick, simple tasks under 15 minutes
- Physical actions like "jump 3 times", "drink water"
- Basic device operations like "turn off TV", "save file"
- Quick communications like "send text", "make quick call"

MID TIER (100-299 points): Moderate tasks 15 minutes to 2 hours  
- Household tasks like "clean room", "cook dinner"
- Moderate work like "write email", "review document"
- Errands like "grocery shopping", "pick up package"

HIGH TIER (500-799 points): Complex, time-intensive tasks 2+ hours
- Major academic work like "study for final exams", "write thesis"
- Complex projects like "job application", "prepare presentation"
- Significant life tasks like "plan wedding", "research major purchase"

IMPORTANT: Really understand the context. "Study" alone might be mid-tier, but "study for final exams" is clearly high-tier because of the stakes and preparation required.

Respond with ONLY a JSON object:
{
  "tier": "low" | "mid" | "high",
  "points": [number within tier range],
  "confidence": [0-100],
  "reasoning": "[explain why this tier, focusing on actual effort/time/complexity]",
  "timeEstimate": "[realistic time estimate]",
  "complexity": [0.0-1.0]
}

Task to analyze:`;

class AIService {
  constructor() {
    this.isAvailable = false;
    this.requestCount = 0;
    this.lastError = null;
    this.workingModel = null;
    this.checkApiKey();
  }

  async checkApiKey() {
    const key = await getApiKey();
    this.isAvailable = !!key;
    return this.isAvailable;
  }

  async findWorkingModel(apiKey) {
    // List of models to try in order of preference (updated Dec 2024)
    const modelsToTry = [
      'llama-3.3-70b-versatile',
      'llama-3.1-70b-versatile', 
      'llama-3.1-8b-instant',
      'mixtral-8x7b-32768',
      'gemma2-9b-it',
      'llama3-groq-70b-8192-tool-use-preview',
      'llama3-groq-8b-8192-tool-use-preview',
      'llama-3.2-11b-vision-preview',
      'llama-3.2-3b-preview',
      'llama-3.2-1b-preview'
    ];

    for (const model of modelsToTry) {
      try {
        const testResponse = await fetch(GROQ_API_URL, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: model,
            messages: [{ role: 'user', content: 'test' }],
            max_tokens: 5
          })
        });

        if (testResponse.ok) {
          this.workingModel = model;
          console.log(`🤖 Found working model: ${model}`);
          return model;
        }
      } catch (error) {
        console.log(`Model ${model} failed, trying next...`);
      }
    }
    
    throw new Error('No working models found');
  }

  async analyzeTask(taskText) {
    try {
      const apiKey = await getApiKey();
      if (!apiKey) {
        throw new Error('No API key available');
      }

      // Find working model if we don't have one
      if (!this.workingModel) {
        await this.findWorkingModel(apiKey);
      }

      this.requestCount++;
      
      const response = await fetch(GROQ_API_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.workingModel,
          messages: [
            {
              role: 'user',
              content: `${TASK_ANALYSIS_PROMPT}\n\n"${taskText}"`
            }
          ],
          temperature: 0.1,
          max_tokens: 200,
          top_p: 0.9
        })
      });

      if (!response.ok) {
        // If this model failed, try to find a new working model
        if (response.status === 400) {
          console.log(`Model ${this.workingModel} failed, trying to find new model...`);
          this.workingModel = null;
          await this.findWorkingModel(apiKey);
          // Retry with new model
          return this.analyzeTask(taskText);
        }
        const errorText = await response.text();
        throw new Error(`Groq API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      const aiResponse = data.choices[0]?.message?.content?.trim();

      if (!aiResponse) {
        throw new Error('Empty response from AI');
      }

      // Parse JSON response
      let analysis;
      try {
        const jsonStr = aiResponse.replace(/```json\n?|\n?```/g, '').trim();
        analysis = JSON.parse(jsonStr);
      } catch (parseError) {
        console.error('Failed to parse AI response:', aiResponse);
        throw new Error('Invalid JSON response from AI');
      }

      // Validate response
      if (!analysis.tier || !analysis.points || !analysis.reasoning) {
        throw new Error('Incomplete AI analysis response');
      }

      // Ensure points are within tier ranges
      const tierRanges = {
        low: { min: 10, max: 89 },
        mid: { min: 100, max: 299 },
        high: { min: 500, max: 799 }
      };

      const range = tierRanges[analysis.tier];
      if (range) {
        analysis.points = Math.max(range.min, Math.min(range.max, analysis.points));
      }

      this.lastError = null;
      return analysis; // Return analysis directly

    } catch (error) {
      console.error('AI Service error:', error);
      this.lastError = error.message;
      throw error; // Re-throw to be caught by todoScorer
    }
  }

  async setApiKey(key) {
    if (key && key.trim()) {
      try {
        await AsyncStorage.setItem('fivefold_groq_api_key', key.trim());
        this.isAvailable = true;
        this.lastError = null;
        this.workingModel = null; // Reset working model to force re-detection
        return true;
      } catch (error) {
        console.error('Error saving API key:', error);
        return false;
      }
    }
    return false;
  }

  async removeApiKey() {
    try {
      await AsyncStorage.removeItem('fivefold_groq_api_key');
      this.isAvailable = false;
      this.workingModel = null; // Clear working model
    } catch (error) {
      console.error('Error removing API key:', error);
    }
  }

  async getStatus() {
    const hasApiKey = !!(await getApiKey());
    return {
      isAvailable: this.isAvailable,
      requestCount: this.requestCount,
      lastError: this.lastError,
      hasApiKey: hasApiKey,
      workingModel: this.workingModel
    };
  }
}

// Create singleton instance
const aiService = new AIService();

export default aiService;

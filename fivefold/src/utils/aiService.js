// Real AI-powered task analysis using Groq API
// Provides intelligent todo difficulty scoring with true understanding

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

// Get API key securely 
const getApiKey = () => {
  return localStorage.getItem('fivefold_groq_api_key');
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
    this.checkApiKey();
  }

  checkApiKey() {
    const key = getApiKey();
    this.isAvailable = !!key;
  }

  async analyzeTask(taskText) {
    try {
      const apiKey = getApiKey();
      if (!apiKey) {
        throw new Error('No API key available');
      }

      this.requestCount++;
      
      const response = await fetch(GROQ_API_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'mixtral-8x7b-32768',
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
      return {
        success: true,
        analysis: analysis,
        source: 'ai',
        requestCount: this.requestCount
      };

    } catch (error) {
      console.error('AI Service error:', error);
      this.lastError = error.message;
      
      return {
        success: false,
        error: error.message,
        source: 'ai_failed',
        requestCount: this.requestCount
      };
    }
  }

  async analyzeTaskWithFallback(taskText, localAnalyzer) {
    // Try AI first if available
    if (this.isAvailable) {
      const aiResult = await this.analyzeTask(taskText);
      
      if (aiResult.success) {
        return {
          ...aiResult.analysis,
          source: 'ai',
          aiEnabled: true
        };
      } else {
        console.log('AI failed, using local analysis:', aiResult.error);
      }
    }

    // Fall back to local analysis
    const localResult = localAnalyzer(taskText);
    
    return {
      ...localResult,
      source: 'local_fallback',
      aiEnabled: false,
      aiError: this.lastError
    };
  }

  setApiKey(key) {
    if (key && key.trim()) {
      localStorage.setItem('fivefold_groq_api_key', key.trim());
      this.isAvailable = true;
      this.lastError = null;
      return true;
    }
    return false;
  }

  removeApiKey() {
    localStorage.removeItem('fivefold_groq_api_key');
    this.isAvailable = false;
  }

  getStatus() {
    return {
      isAvailable: this.isAvailable,
      requestCount: this.requestCount,
      lastError: this.lastError,
      hasApiKey: !!getApiKey()
    };
  }
}

// Create singleton instance
const aiService = new AIService();

export default aiService;

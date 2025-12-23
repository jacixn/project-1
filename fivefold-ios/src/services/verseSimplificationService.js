import { getStoredData } from '../utils/localStorage';

class VerseSimplificationService {
  static async simplifyVerse(verse) {
    try {
      // Get the stored API key
      const apiKey = await getStoredData('groqApiKey');
      
      if (!apiKey) {
        return {
          success: false,
          error: 'API key not configured. Please set up your AI service in Settings.',
          simplified: null,
          original: verse
        };
      }

      const prompt = `Please simplify this Bible verse so that a 12-year-old child can easily understand it. Keep the core meaning but use simple words and concepts:

Verse: "${verse.text}"
Reference: ${verse.reference}

Please provide:
1. A simplified version using words a 12-year-old would understand
2. A brief explanation of what it means in their daily life

Format your response as a friendly explanation that starts with "This verse means..."`;

      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'llama-3.1-8b-instant',
          messages: [
            {
              role: 'system',
              content: 'You are a friendly Bible teacher who explains verses to children in simple, loving ways. Always be encouraging and use age-appropriate language.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          max_tokens: 300,
          temperature: 0.7,
        }),
      });

      if (!response.ok) {
        return {
          success: false,
          error: `API request failed: ${response.status}`,
          simplified: null,
          original: verse
        };
      }

      const data = await response.json();
      const simplifiedText = data.choices[0]?.message?.content || 'Could not simplify this verse. Please try again.';
      
      return {
        success: true,
        simplified: simplifiedText,
        original: verse
      };
    } catch (error) {
      return {
        success: false,
        simplified: null,
        original: verse,
        error: error.message
      };
    }
  }

  static async getVerseInsight(verse) {
    try {
      const apiKey = await getStoredData('groqApiKey');
      
      if (!apiKey) {
        throw new Error('API key not configured');
      }

      const prompt = `Provide a brief, encouraging insight about this Bible verse for someone who wants to understand it better:

"${verse.text}" - ${verse.reference}

Please provide a short, practical insight about how this verse can help in daily life. Keep it under 100 words and make it encouraging.`;

      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'llama-3.1-8b-instant',
          messages: [
            {
              role: 'system',
              content: 'You are a wise, encouraging Bible teacher who provides practical insights for daily living.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          max_tokens: 150,
          temperature: 0.7,
        }),
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`);
      }

      const data = await response.json();
      return data.choices[0]?.message?.content || 'This verse contains wisdom for your life journey.';
    } catch (error) {
      console.error('Error getting verse insight:', error);
      return 'This verse contains God\'s wisdom and love for you.';
    }
  }
}

export default VerseSimplificationService;

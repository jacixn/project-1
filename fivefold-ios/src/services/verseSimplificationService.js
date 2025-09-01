import { getStoredData } from '../utils/localStorage';

class VerseSimplificationService {
  static async simplifyVerse(verse) {
    try {
      // Get the stored API key
      const apiKey = await getStoredData('groqApiKey');
      
      if (!apiKey) {
        throw new Error('API key not configured. Please set up your AI service in Settings.');
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
        throw new Error(`API request failed: ${response.status}`);
      }

      const data = await response.json();
      const simplifiedText = data.choices[0]?.message?.content || 'Could not simplify this verse. Please try again.';
      
      return {
        success: true,
        simplified: simplifiedText,
        original: verse
      };
    } catch (error) {
      console.error('Error simplifying verse:', error);
      
      // Fallback simplified explanations for common verses
      const fallbackSimplifications = {
        'Jeremiah 29:11': 'This verse means God has good plans for your life! He wants you to be happy and successful, and He will help you have hope for the future. It\'s like having a loving parent who always wants the best for you.',
        'Proverbs 3:5-6': 'This verse means you should trust God completely, even when you don\'t understand everything. It\'s like following a GPS - even if you don\'t know the way, God does! When you trust Him, He will guide you on the right path.',
        'Joshua 1:9': 'This verse means you can be brave because God is always with you! You don\'t have to be scared or worried because God is like the strongest, most loving friend who never leaves your side.',
        '1 Peter 5:7': 'This verse means when you\'re worried or scared about something, you can tell God about it and He will take care of you. It\'s like giving your heavy backpack to a strong adult who can carry it for you.',
        'Romans 8:28': 'This verse means that even when bad things happen, God can turn them into something good for people who love Him. It\'s like how a puzzle piece might look weird by itself, but it fits perfectly in the big picture.'
      };

      const fallback = fallbackSimplifications[verse.reference] || 
        `This verse means God loves you very much! Even though we couldn't get a detailed explanation right now, remember that every Bible verse teaches us about God's love and care for us.`;

      return {
        success: false,
        simplified: fallback,
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

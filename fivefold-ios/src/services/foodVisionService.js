/**
 * foodVisionService.js
 *
 * Integrates Google Gemini Vision API for food photo analysis.
 * Takes a food photo (base64), sends it to Gemini 1.5 Flash,
 * and returns estimated nutritional information.
 */

let GEMINI_CONFIG = null;

try {
  GEMINI_CONFIG = require('../../gemini.config').GEMINI_CONFIG;
} catch (e) {
  console.warn('[FoodVision] gemini.config.js not found — food photo analysis will be unavailable');
}

// Use the auto-updating "latest" alias so the app always calls the newest
// stable Flash model and never breaks when Google retires an older version.
const GEMINI_ENDPOINT = 'https://generativelanguage.googleapis.com/v1/models/gemini-flash-latest:generateContent';

const ANALYSIS_PROMPT = `You are a nutrition expert. Analyze the food in this photo and provide nutritional estimates.

Rules:
- Return ONLY valid JSON, no markdown, no explanation, no backticks.
- JSON format: {"name":"<food name, short and clear>","description":"<1 sentence describing the dish and a brief nutrition insight, warm and friendly tone, no dashes>","calories":<number>,"protein":<grams as number>,"carbs":<grams as number>,"fat":<grams as number>,"portionSize":"<estimated portion, e.g. '1 plate', '200g', '1 bowl'>"}
- Estimate for the visible portion in the photo.
- If multiple foods are visible, combine them into one entry with a descriptive name (e.g. "Chicken Rice Bowl").
- Be reasonable with calorie estimates. A typical meal is 400-800 calories.
- Round all numbers to the nearest whole number.
- If you cannot identify the food clearly, still give your best estimate.
- The description should be helpful and insightful (e.g. "A hearty pasta dish with good protein from the chicken, though the creamy sauce adds extra fat.").`;

class FoodVisionService {
  /**
   * Analyze a food photo using Gemini Vision.
   * @param {string} base64Image – base64-encoded image data (no prefix)
   * @param {string} [mimeType] – image MIME type, defaults to 'image/jpeg'
   * @returns {Promise<Object|null>} { name, calories, protein, carbs, fat, portionSize }
   */
  async analyzeFood(base64Image, mimeType = 'image/jpeg') {
    if (!GEMINI_CONFIG || !GEMINI_CONFIG.apiKey || GEMINI_CONFIG.apiKey === 'YOUR_GEMINI_API_KEY_HERE') {
      console.warn('[FoodVision] No valid API key configured');
      return null;
    }

    try {
      console.log('[FoodVision] Analyzing food photo...');

      const url = `${GEMINI_ENDPOINT}?key=${GEMINI_CONFIG.apiKey}`;

      const body = {
        contents: [
          {
            parts: [
              { text: ANALYSIS_PROMPT },
              {
                inline_data: {
                  mime_type: mimeType,
                  data: base64Image,
                },
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.4,
          maxOutputTokens: 300,
        },
      };

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.warn(`[FoodVision] API error ${response.status}:`, errorText);
        // Common causes: 404 = model deprecated/shut down, 400 = bad request, 403 = invalid API key
        if (response.status === 404) {
          console.warn('[FoodVision] Model may have been shut down — check https://ai.google.dev/gemini-api/docs/deprecations');
        }
        return null;
      }

      const result = await response.json();
      let text = result?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

      if (!text) {
        console.warn('[FoodVision] Empty response from Gemini');
        return null;
      }

      // Strip markdown fences if present
      text = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();

      const nutrition = JSON.parse(text);

      // Validate structure
      if (!nutrition.name || typeof nutrition.calories !== 'number') {
        console.warn('[FoodVision] Invalid response structure:', nutrition);
        return null;
      }

      // Sanitize
      return {
        name: nutrition.name,
        description: nutrition.description || '',
        calories: Math.round(nutrition.calories || 0),
        protein: Math.round(nutrition.protein || 0),
        carbs: Math.round(nutrition.carbs || 0),
        fat: Math.round(nutrition.fat || 0),
        portionSize: nutrition.portionSize || '',
      };
    } catch (error) {
      console.warn('[FoodVision] Analysis failed:', error.message);
      return null;
    }
  }

  /**
   * Estimate nutrition from a text description (fallback when no photo).
   * Uses the same Gemini API but text-only.
   */
  async estimateFromText(description) {
    if (!GEMINI_CONFIG || !GEMINI_CONFIG.apiKey || GEMINI_CONFIG.apiKey === 'YOUR_GEMINI_API_KEY_HERE') {
      console.warn('[FoodVision] No valid API key configured');
      return null;
    }

    try {
      console.log('[FoodVision] Estimating nutrition from text:', description);

      const url = `${GEMINI_ENDPOINT}?key=${GEMINI_CONFIG.apiKey}`;

      const prompt = `Estimate the nutritional content of this food: "${description}"

Rules:
- Return ONLY valid JSON, no markdown, no explanation, no backticks.
- JSON format: {"name":"<cleaned up food name>","calories":<number>,"protein":<grams>,"carbs":<grams>,"fat":<grams>,"portionSize":"<typical portion>"}
- Assume a standard single serving unless specified otherwise.
- Round all numbers to the nearest whole number.`;

      const body = {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 200,
        },
      };

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        console.warn('[FoodVision] Text estimation API error:', response.status);
        return null;
      }

      const result = await response.json();
      let text = result?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
      if (!text) return null;

      text = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
      const nutrition = JSON.parse(text);

      if (!nutrition.name || typeof nutrition.calories !== 'number') return null;

      return {
        name: nutrition.name,
        calories: Math.round(nutrition.calories || 0),
        protein: Math.round(nutrition.protein || 0),
        carbs: Math.round(nutrition.carbs || 0),
        fat: Math.round(nutrition.fat || 0),
        portionSize: nutrition.portionSize || '',
      };
    } catch (error) {
      console.warn('[FoodVision] Text estimation failed:', error.message);
      return null;
    }
  }

  /**
   * Check if the Gemini API key is configured.
   */
  isConfigured() {
    return !!(GEMINI_CONFIG && GEMINI_CONFIG.apiKey && GEMINI_CONFIG.apiKey !== 'YOUR_GEMINI_API_KEY_HERE');
  }
}

export default new FoodVisionService();

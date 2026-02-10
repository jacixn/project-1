// Production-Ready AI Service
// Direct Deepseek API calls - No Railway needed!

import { DEEPSEEK_CONFIG } from '../../deepseek.config';

// Helper to perform a Deepseek request with primary key, then fallback on 401
async function deepseekFetchWithFallback(body) {
  const makeRequest = async (key) => {
    return fetch(DEEPSEEK_CONFIG.apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body,
      timeout: 15000, // 15s timeout
    });
  };

  // Try primary
  let response = await makeRequest(DEEPSEEK_CONFIG.apiKey);
  if (response.status === 401 && DEEPSEEK_CONFIG.fallbackApiKey) {
    console.warn('Deepseek 401 with primary key, retrying with fallback key...');
    response = await makeRequest(DEEPSEEK_CONFIG.fallbackApiKey);
  }
  return response;
}

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

      const response = await deepseekFetchWithFallback(JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 2000
      }));

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
      
      // Build context-aware prompt based on conversation history
      let contextPrompt = '';
      let isFirstMessage = true;
      let userName = 'friend';
      
      // Handle both array format (message history) and object format (metadata)
      if (conversationContext) {
        if (Array.isArray(conversationContext) && conversationContext.length > 0) {
          // Array format: actual message history
          
          // Smart context management:
          // - Keep last 60 messages for immediate context
          // - Summarize older messages if conversation is long
          const recentMessages = conversationContext.slice(-60);
          const olderMessages = conversationContext.slice(0, -60);
          
          // Build context with summary if there are older messages
          if (olderMessages.length > 0) {
            // Create a brief summary of older conversation
            const oldTopics = olderMessages
              .filter(msg => msg.role === 'user')
              .map(msg => msg.content.substring(0, 100))
              .slice(0, 3); // First 3 user questions
            
            contextPrompt = `Earlier in conversation, user asked about: ${oldTopics.join('; ')}\n\nRecent messages:\n` + 
              recentMessages.map(msg => `${msg.role === 'user' ? 'User' : 'Friend'}: ${msg.content.substring(0, 150)}`).join('\n') + 
              '\n\n';
          } else {
            // Short conversation - just use recent messages
            contextPrompt = 'Previous messages in this conversation:\n' + 
              recentMessages.map(msg => `${msg.role === 'user' ? 'User' : 'Friend'}: ${msg.content.substring(0, 150)}`).join('\n') + 
              '\n\n';
          }
          
          // If there's any Friend message already in history, it's NOT the first message
          isFirstMessage = !conversationContext.some(msg => msg.role === 'assistant');
        } else if (conversationContext.messageCount !== undefined) {
          // Object format: just metadata
          isFirstMessage = conversationContext.isFirstMessage || conversationContext.messageCount <= 1;
          userName = conversationContext.userName || 'friend';
        }
      }
      
      // Build the prompt with conversation awareness
      let prompt;
      
      // Check if this is a continuation of an existing conversation
      const isContinuation = conversationContext && Array.isArray(conversationContext) && conversationContext.length > 0;
      
      // Build the appropriate prompt
      if (isContinuation) {
        // Continuation - NO greeting needed
        prompt = `${contextPrompt}You are Friend, continuing an ongoing conversation with the user in the Biblely app.

⚠️ CRITICAL INSTRUCTIONS FOR CONTINUING CONVERSATION:
1. DO NOT greet the user again - you're already in the middle of a conversation
2. DO NOT say "Hey [name]" or any greeting - just continue the discussion naturally
3. Simply answer their new question as part of the ongoing chat
4. Write EVERYTHING so a 12-year-old can easily understand - use simple words, short sentences, everyday language
5. MANDATORY: You MUST include actual Bible verse references in your answer (format: "Book Chapter:Verse" like "John 3:16", "Romans 8:28", "Psalm 23:1"). These become clickable links for the user. Include at least 1-2 specific verse references in EVERY response.
6. NEVER use dashes (-), bullet points (•), or lists - write in complete, flowing sentences
7. If the user asks for a specific word count (like "100 words"), you MUST write EXACTLY that many words or very close to it

The user said: "${userMessage}"

Simply answer their question directly as part of the ongoing conversation. Be warm, encouraging, and supportive.

⚠️ CRITICAL: You MUST include specific Bible verse references (like "Matthew 5:16" or "Proverbs 3:5-6") in your answer.
⚠️ CRITICAL: If user requests a specific word count, you MUST meet that word count exactly.

Remember: This is a CONTINUATION - NO greeting, just continue the conversation naturally. Write for a 12-year-old, ALWAYS include verse references, ALWAYS respect word count requests.`;
      } else {
        // First message - greeting is OK
        prompt = `You are Friend, a caring Bible study companion in the Biblely app. 

⚠️ CRITICAL INSTRUCTIONS:
1. This is the FIRST message in a new conversation - you may greet the user warmly, but keep it brief
2. Just answer their question directly and naturally, like a friend
3. Write EVERYTHING so a 12-year-old can easily understand - use simple words, short sentences, everyday language
4. MANDATORY: You MUST include actual Bible verse references in your answer (format: "Book Chapter:Verse" like "John 3:16", "Romans 8:28", "Psalm 23:1"). These become clickable links for the user. Include at least 1-2 specific verse references in EVERY response.
5. NEVER use dashes (-), bullet points (•), or lists - write in complete, flowing sentences
6. If the user asks for a specific word count (like "100 words"), you MUST write EXACTLY that many words or very close to it - this is REQUIRED

The user said: "${userMessage}"

Simply answer their question directly. Be warm, encouraging, and supportive. Keep it conversational - like texting a good friend.

⚠️ CRITICAL: You MUST include specific Bible verse references (like "Matthew 5:16" or "Proverbs 3:5-6") in your answer.
⚠️ CRITICAL: If user requests a specific word count, you MUST meet that word count exactly.

IMPORTANT: You are ONLY here to help with:
- Understanding Bible verses and passages
- Questions about faith, God, Jesus, and Christianity
- Prayer guidance and spiritual encouragement
- Biblical wisdom and life application

If someone asks about homework, school assignments, general knowledge, or anything not related to Bible study and faith, politely redirect them.

Remember: Write for a 12-year-old, ALWAYS include specific verse references (Book Chapter:Verse format), and ALWAYS respect word count requests.`;
      }

      const response = await this.simpleSmartChat(prompt);
      
      // Post-process to ensure no dashes and natural language
      let cleanResponse = response || 'Hey there! How can I help you today?';
      
      // If this is a continuation, remove any greeting that slipped through
      if (isContinuation) {
        // Remove common greetings at the start
        cleanResponse = cleanResponse.replace(/^(Hey|Hi|Hello)\s+\w+[!,.]?\s*/i, '');
        cleanResponse = cleanResponse.replace(/^That's a great question[^.!?]*[.!?]\s*/i, '');
        cleanResponse = cleanResponse.replace(/^Great question[^.!?]*[.!?]\s*/i, '');
        console.log('🔧 Removed greeting from continuation message');
      }
      
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

      const response = await deepseekFetchWithFallback(JSON.stringify({
        model: 'deepseek-chat',
        messages: messages,
        stream: stream,
        temperature: 0.7,
        max_tokens: 2000
      }));

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

  // Get service status
  async getStatus() {
    return {
      hasApiKey: this.isInitialized && DEEPSEEK_CONFIG.apiKey ? true : false,
      apiKeyType: 'deepseek-direct',
      requestCount: this.requestCount,
      lastError: this.lastError
    };
  }

  // Analyze a task and assign points (for todo scoring)
  async analyzeTask(taskText) {
    try {
      console.log('🚀 Using Smart Analysis for task scoring...');
      this.requestCount++;

      const prompt = `You are a task difficulty analyzer. Analyze tasks and classify them based on complexity, time, and effort required.

TIERS:
- LOW TIER (35-69 points): Quick, simple tasks under 15 minutes
- MID TIER (69-173 points): Moderate tasks 15 minutes to 2 hours  
- HIGH TIER (173-345 points): Complex, time-intensive tasks 2+ hours

Analyze this task: "${taskText}"

Respond with ONLY a JSON object:
{
  "tier": "low" | "mid" | "high",
  "points": [number within tier range],
  "reasoning": "[brief explanation]",
  "confidence": [0-100],
  "timeEstimate": "[realistic time estimate]",
  "complexity": [0.0-1.0]
}`;

      const response = await this.simpleSmartChat(prompt);
      
      // Parse and validate the response
      let parsed;
      try {
        // Try to extract JSON from response
        const jsonMatch = response.match(/\{[\s\S]*?\}/);
        if (jsonMatch) {
          parsed = JSON.parse(jsonMatch[0]);
        } else {
          parsed = JSON.parse(response);
        }
      } catch (parseError) {
        console.error('Failed to parse AI response:', response);
        // Fallback to mid-tier
        parsed = {
          tier: 'mid',
          points: 92,
          reasoning: 'Unable to parse AI response',
          confidence: 50,
          timeEstimate: '30-60 min',
          complexity: 0.5
        };
      }

      // Validate and return
      // Clamp AI points to valid tier ranges (35-345)
      const clampedPoints = Math.max(35, Math.min(345, parsed.points || 92));
      return {
        tier: parsed.tier || 'mid',
        points: clampedPoints,
        reasoning: parsed.reasoning || 'Task analyzed',
        confidence: parsed.confidence || 80,
        timeEstimate: parsed.timeEstimate || '30-60 min',
        complexity: parsed.complexity || 0.5
      };
      
    } catch (error) {
      this.lastError = error.message;
      console.error('❌ Task analysis error:', error);
      
      // Return fallback scoring
      return {
        tier: 'mid',
        points: 92,
        reasoning: 'Fallback scoring due to error',
        confidence: 60,
        timeEstimate: '30-60 min',
        complexity: 0.5
      };
    }
  }

  // Test connection
  async testConnection() {
    try {
      const result = await this.analyzeTask('Test task: Complete project documentation');
      return {
        success: true,
        model: 'deepseek-chat',
        provider: 'deepseek-direct',
        result: result
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
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

  /**
   * Generate a smart workout plan based on the user's physique data.
   * Returns a structured workout with exercises picked from the real exercise list.
   *
   * @param {Object} params
   * @param {number}  params.overallScore
   * @param {Array}   params.weakestMuscles  – [{name, score}]
   * @param {Array}   params.strongestMuscles – [{name, score}]
   * @param {Object}  params.groupAverages   – {push, pull, legs, core}
   * @param {number}  params.totalWorkouts
   * @param {Array}   params.exerciseNames   – list of available exercise names (pre-filtered)
   * @returns {Promise<Object|null>} { name, reason, exercises: [{name, sets, reps}] }
   */
  async generateSmartWorkout({ overallScore, weakestMuscles, strongestMuscles, groupAverages, totalWorkouts, exerciseNames, exerciseCount, dailyCalories, goal, currentWeight, targetWeight }) {
    try {
      console.log('[AI Workout] Generating smart workout…');

      const hasNutrition = dailyCalories && goal;
      const nutritionRule = hasNutrition
        ? `\n- The user's nutrition data is provided. Consider their calorie intake and weight goal when suggesting intensity. For users losing weight (calorie deficit), favor moderate weights with higher reps (10-15) to preserve muscle. For users gaining weight (calorie surplus), favor progressive overload with heavier weights and lower reps (6-10).`
        : '';

      const weightRule = hasNutrition
        ? `,"weight":"<suggested weight in kg as string, e.g. '20' or '40'>"`
        : '';

      const exerciseCountRule = exerciseCount
        ? `- Pick exactly ${exerciseCount} exercises from the provided list ONLY. Never invent exercise names.`
        : `- Pick 4 to 6 exercises from the provided list ONLY. Never invent exercise names.
- For beginners (overallScore < 20), keep it simple with 4 exercises and 3 sets each.
- For intermediate (20-50), use 5 exercises with 3-4 sets.
- For advanced (50+), use 5-6 exercises with 3-4 sets.`;

      const systemPrompt = `You are a smart workout planner inside a fitness app. Your job is to create a single, focused workout session that addresses the user's weak points while keeping things balanced.

Rules:
- Return ONLY valid JSON, no markdown, no explanation, no backticks.
- JSON format: {"name":"<workout name>","reason":"<1 sentence why this workout is good for them, 15-25 words, encouraging>","exercises":[{"name":"<exact exercise name from the provided list>","sets":<number 3-4>,"reps":"<reps as string, e.g. '10' or '8-12'>"${weightRule}}]}
${exerciseCountRule}
- The workout should primarily target the user's weakest muscle groups.
- Mix compound and isolation movements.
- Order exercises logically: big compound movements first, isolation later.
- The workout name should be short and catchy (2-4 words), like "Back & Bicep Blast" or "Leg Day Focus".
- The reason should feel personal and motivating, no dashes, no emojis.${nutritionRule}`;

      let nutritionBlock = '';
      if (hasNutrition) {
        nutritionBlock = `\nNutrition: ${dailyCalories} cal/day, goal: ${goal}${currentWeight ? `, current weight: ${currentWeight}kg` : ''}${targetWeight ? `, target: ${targetWeight}kg` : ''}`;
      }

      const userPrompt = `User physique data:
Overall score: ${overallScore}/100
Total workouts: ${totalWorkouts}
Weakest muscles: ${weakestMuscles.map(m => `${m.name} (${m.score})`).join(', ') || 'None'}
Strongest muscles: ${strongestMuscles.map(m => `${m.name} (${m.score})`).join(', ') || 'None'}
Group averages: Push ${groupAverages.push}, Pull ${groupAverages.pull}, Legs ${groupAverages.legs}, Core ${groupAverages.core}${nutritionBlock}

Available exercises (pick ONLY from this list):
${exerciseNames.join('\n')}

Generate a workout JSON.`;

      const response = await deepseekFetchWithFallback(JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user',   content: userPrompt },
        ],
        temperature: 0.8,
        max_tokens: 500,
      }));

      if (!response.ok) {
        console.warn('[AI Workout] API error:', response.status);
        return null;
      }

      const result = await response.json();
      let text = result?.choices?.[0]?.message?.content?.trim();
      if (!text) return null;

      // Strip markdown code fences if the model wraps in ```json ... ```
      text = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();

      const workout = JSON.parse(text);

      // Validate structure
      if (!workout.name || !workout.exercises || !Array.isArray(workout.exercises) || workout.exercises.length === 0) {
        console.warn('[AI Workout] Invalid structure:', workout);
        return null;
      }

      // Validate each exercise name exists in the provided list
      const nameSet = new Set(exerciseNames.map(n => n.toLowerCase()));
      workout.exercises = workout.exercises.filter(ex => nameSet.has(ex.name.toLowerCase()));

      if (workout.exercises.length === 0) {
        console.warn('[AI Workout] No valid exercises after filtering');
        return null;
      }

      console.log('[AI Workout] Generated:', workout.name, `(${workout.exercises.length} exercises)`);
      return workout;
    } catch (error) {
      console.warn('[AI Workout] Failed:', error.message);
      return null;
    }
  }

  /**
   * Generate personalised physique/balance coach feedback using AI.
   * Returns a single encouraging paragraph (50-70 words).
   *
   * @param {Object} params
   * @param {number} params.overallScore  – 0-100 overall physique score
   * @param {Array}  params.strongest     – top muscles [{id, name, score}]
   * @param {Array}  params.weakest       – bottom muscles [{id, name, score}]
   * @param {Object} params.groupAverages – {push, pull, legs, core}
   * @param {number} params.totalWorkouts – total workouts in history
   * @returns {Promise<string>}
   */
  async generatePhysiqueCoachFeedback({ overallScore, strongest, weakest, groupAverages, totalWorkouts }) {
    try {
      console.log('[AI Coach] Generating physique feedback…');

      const strongNames = strongest.map(m => `${m.name} (${m.score})`).join(', ');
      const weakNames   = weakest.map(m => `${m.name} (${m.score})`).join(', ');

      const systemPrompt = `You are a world-class personal trainer and motivational fitness coach inside a workout app called Biblely. Your job is to give the user a short, warm, personalised training insight every time they check their physique screen.

Rules:
- Write EXACTLY one paragraph, between 50 and 70 words. Never exceed 70 words.
- Start with a genuine, specific compliment about something the user is doing well (mention a muscle name or pattern).
- Then give ONE clear, actionable suggestion for improvement — mention the specific weak area.
- Tone: upbeat, encouraging, conversational — like a friend who also happens to be a coach. Use "you" and "your".
- No bullet points, no lists, no headings, no emojis, no hashtags, no dashes of any kind (no hyphens, en-dashes, or em-dashes). Use commas instead.
- Keep language simple — a 14-year-old should understand every word.
- Never say "I" — you are speaking directly to the user.
- Do NOT include any greeting, sign-off, or label like "Coach says:".`;

      const userPrompt = `Here is the user's current physique data:

Overall score: ${overallScore}/100
Total workouts logged: ${totalWorkouts}
Strongest muscles: ${strongNames || 'None yet'}
Weakest muscles: ${weakNames || 'None yet'}
Group averages — Push: ${groupAverages.push}, Pull: ${groupAverages.pull}, Legs: ${groupAverages.legs}, Core: ${groupAverages.core}

Write one paragraph of feedback (50-70 words).`;

      const response = await deepseekFetchWithFallback(JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user',   content: userPrompt },
        ],
        temperature: 0.85,
        max_tokens: 200,
      }));

      if (!response.ok) {
        console.warn('[AI Coach] API error:', response.status);
        return null;
      }

      const result = await response.json();
      const text = result?.choices?.[0]?.message?.content?.trim();
      if (!text) return null;

      console.log('[AI Coach] Feedback generated ✅');
      return text;
    } catch (error) {
      console.warn('[AI Coach] Failed to generate feedback:', error.message);
      return null; // caller will fall back to rule-based suggestions
    }
  }

  /**
   * Generate personalised daily nutrition targets using AI analysis.
   * Takes the user's body profile and returns optimised calorie/macro targets.
   *
   * @param {Object} params
   * @param {string} params.gender
   * @param {number} params.age
   * @param {number} params.heightCm
   * @param {number} params.weightKg
   * @param {number} [params.bodyFatPercent]
   * @param {number} params.targetWeightKg
   * @param {string} params.goal          – 'lose' | 'gain' | 'maintain'
   * @param {string} params.activityLevel – sedentary | light | moderate | active | veryActive
   * @param {number} params.baseTDEE      – the Mifflin-St Jeor TDEE as a starting point
   * @returns {Promise<Object|null>} { dailyCalories, protein, carbs, fat, explanation }
   */
  async generateNutritionPlan({ gender, age, heightCm, weightKg, bodyFatPercent, targetWeightKg, goal, activityLevel, baseTDEE }) {
    try {
      console.log('[AI Nutrition] Generating personalised plan…');

      const bfLine = bodyFatPercent ? `Body fat: ${bodyFatPercent}%` : 'Body fat: unknown';
      const weightDiff = Math.abs(weightKg - targetWeightKg);

      const systemPrompt = `You are an expert sports nutritionist inside a fitness app. The user has entered their body profile. Your job is to return an optimised daily calorie and macro plan.

Rules:
- Return ONLY valid JSON, no markdown, no explanation, no backticks.
- JSON format: {"dailyCalories":<number>,"protein":<grams>,"carbs":<grams>,"fat":<grams>,"explanation":"<1-2 sentences, warm and personal, no dashes or bullet points>"}
- Base your calculation on the provided TDEE but adjust it intelligently:
  * For weight loss: deficit of 300-600 cal depending on how much weight they need to lose. Larger deficit for people with more to lose, smaller for those close to target.
  * For weight gain: surplus of 200-400 cal. Lean bulk approach.
  * For maintenance: stay close to TDEE.
- Protein: prioritise muscle preservation. For weight loss, aim for 1.8-2.2g per kg of body weight. For muscle gain, 1.6-2.0g/kg. For maintenance, 1.4-1.8g/kg.
- Fat: never go below 0.8g per kg body weight for hormonal health. Typically 25-35% of calories.
- Carbs: fill the remaining calories after protein and fat are set.
- Consider age: older users need more protein, younger users can handle more carbs.
- Consider body fat if provided: higher body fat can tolerate a slightly larger deficit.
- Safety: never go below 1200 cal for women or 1400 for men.
- The explanation should be encouraging and mention one specific insight about their plan.
- Round all numbers to the nearest whole number.`;

      const userPrompt = `User profile:
Gender: ${gender}
Age: ${age}
Height: ${heightCm} cm
Current weight: ${weightKg} kg
Target weight: ${targetWeightKg} kg
${bfLine}
Goal: ${goal} (weight difference: ${weightDiff} kg)
Activity level: ${activityLevel}
Base TDEE (Mifflin-St Jeor): ${baseTDEE} cal

Generate an optimised nutrition plan JSON.`;

      const response = await deepseekFetchWithFallback(JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user',   content: userPrompt },
        ],
        temperature: 0.5,
        max_tokens: 300,
      }));

      if (!response.ok) {
        console.warn('[AI Nutrition] API error:', response.status);
        return null;
      }

      const result = await response.json();
      let text = result?.choices?.[0]?.message?.content?.trim();
      if (!text) return null;

      text = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
      const plan = JSON.parse(text);

      if (!plan.dailyCalories || typeof plan.dailyCalories !== 'number') {
        console.warn('[AI Nutrition] Invalid structure:', plan);
        return null;
      }

      console.log('[AI Nutrition] Plan generated:', plan.dailyCalories, 'cal');
      return {
        dailyCalories: Math.round(plan.dailyCalories),
        protein: Math.round(plan.protein || 0),
        carbs: Math.round(plan.carbs || 0),
        fat: Math.round(plan.fat || 0),
        explanation: plan.explanation || '',
      };
    } catch (error) {
      console.warn('[AI Nutrition] Failed:', error.message);
      return null;
    }
  }
}

// Create singleton instance
const productionAiService = new ProductionSmartService();

export default productionAiService;

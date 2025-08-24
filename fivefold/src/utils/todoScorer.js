// 3-tier todo scoring system with AI understanding + local fallback
import aiService from './aiService';

const difficultyTiers = {
  low: { 
    name: 'Low Tier', 
    minPoints: 10, 
    maxPoints: 89, 
    color: '#4CAF50',
    icon: '🟢',
    description: 'Quick & simple tasks'
  },
  mid: { 
    name: 'Mid Tier', 
    minPoints: 100, 
    maxPoints: 299, 
    color: '#FF9800',
    icon: '🟡',
    description: 'Moderate effort required'
  },
  high: { 
    name: 'High Tier', 
    minPoints: 500, 
    maxPoints: 799, 
    color: '#f44336',
    icon: '🔴',
    description: 'Complex & time-intensive'
  }
};

// Keywords and patterns for intelligent task analysis
const taskAnalysis = {
  // Physical actions (usually quick)
  physicalActions: {
    weight: 0.1,
    keywords: ['jump', 'walk', 'run', 'sit', 'stand', 'drink', 'eat', 'sleep', 'wake up', 'stretch', 'exercise quickly']
  },
  
  // Simple device operations
  simpleActions: {
    weight: 0.15,
    keywords: ['turn on', 'turn off', 'click', 'open', 'close', 'save', 'delete', 'copy', 'paste', 'download', 'test']
  },
  
  // Communication tasks
  communication: {
    weight: 0.3,
    keywords: ['call', 'text', 'email', 'message', 'reply', 'send', 'post', 'comment', 'share']
  },
  
  // Household tasks
  household: {
    weight: 0.25,
    keywords: ['clean', 'wash', 'cook', 'make bed', 'tidy', 'vacuum', 'dishes', 'laundry', 'organize room']
  },
  
  // Shopping/errands
  errands: {
    weight: 0.3,
    keywords: ['buy', 'shop', 'grocery', 'pick up', 'return', 'get', 'fetch', 'collect']
  },
  
  // Work/study tasks (medium to high complexity)
  workStudy: {
    weight: 0.6,
    keywords: ['study', 'read', 'write', 'research', 'analyze', 'review', 'prepare', 'plan', 'design', 'code', 'work on']
  },
  
  // Learning and skill development
  learning: {
    weight: 0.7,
    keywords: ['learn', 'practice', 'master', 'understand', 'memorize', 'train', 'develop', 'improve']
  },
  
  // Creative tasks
  creative: {
    weight: 0.65,
    keywords: ['create', 'build', 'make', 'design', 'draw', 'paint', 'compose', 'craft', 'invent']
  },
  
  // Administrative/bureaucratic tasks
  administrative: {
    weight: 0.5,
    keywords: ['apply', 'register', 'file', 'submit', 'complete forms', 'paperwork', 'tax', 'insurance', 'appointment']
  },
  
  // Major life events/complex tasks
  majorTasks: {
    weight: 0.9,
    keywords: ['final exam', 'finals', 'presentation', 'interview', 'move house', 'job application', 'thesis', 'project', 'assignment']
  }
};

// Time indicators
const timeIndicators = {
  quick: { modifier: -0.3, keywords: ['quick', 'quickly', 'fast', 'brief', 'short'] },
  long: { modifier: 0.4, keywords: ['long', 'lengthy', 'extended', 'thorough', 'detailed', 'comprehensive'] },
  daily: { modifier: -0.2, keywords: ['daily', 'routine', 'regular', 'usual'] },
  intensive: { modifier: 0.5, keywords: ['intensive', 'deep', 'intense', 'focused', 'concentrated'] }
};

// Complexity indicators
const complexityIndicators = {
  simple: { modifier: -0.4, keywords: ['simple', 'easy', 'basic', 'straightforward', 'quick'] },
  complex: { modifier: 0.6, keywords: ['complex', 'complicated', 'difficult', 'challenging', 'hard', 'advanced'] },
  multiple: { modifier: 0.3, keywords: ['multiple', 'several', 'various', 'many', 'all', 'everything'] }
};

// Smart AI-like task analysis and scoring
const analyzeTask = (task) => {
  const taskLower = task.toLowerCase().trim();
  const words = taskLower.split(/\s+/);
  
  let baseComplexity = 0.3; // neutral starting point
  let matchedCategories = [];
  let appliedModifiers = [];
  
  // Analyze task categories
  for (const [category, data] of Object.entries(taskAnalysis)) {
    const matched = data.keywords.some(keyword => {
      // Check for exact phrase matches and partial matches
      return taskLower.includes(keyword.toLowerCase());
    });
    
    if (matched) {
      baseComplexity = Math.max(baseComplexity, data.weight);
      matchedCategories.push(category);
    }
  }
  
  // Apply time modifiers
  for (const [type, data] of Object.entries(timeIndicators)) {
    const matched = data.keywords.some(keyword => taskLower.includes(keyword));
    if (matched) {
      baseComplexity += data.modifier;
      appliedModifiers.push(`${type} (${data.modifier > 0 ? '+' : ''}${data.modifier})`);
    }
  }
  
  // Apply complexity modifiers
  for (const [type, data] of Object.entries(complexityIndicators)) {
    const matched = data.keywords.some(keyword => taskLower.includes(keyword));
    if (matched) {
      baseComplexity += data.modifier;
      appliedModifiers.push(`${type} (${data.modifier > 0 ? '+' : ''}${data.modifier})`);
    }
  }
  
  // Task length analysis (more sophisticated)
  const wordCount = words.length;
  if (wordCount === 1 || wordCount === 2) {
    baseComplexity -= 0.1; // very short tasks are usually simple
  } else if (wordCount > 8) {
    baseComplexity += 0.15; // detailed descriptions suggest complexity
  }
  
  // Special pattern recognition
  if (taskLower.includes('for') && (taskLower.includes('exam') || taskLower.includes('test'))) {
    baseComplexity = Math.max(baseComplexity, 0.8); // studying for exams is always high tier
  }
  
  if (taskLower.match(/\d+\s*(hour|hr|min|minute)/)) {
    baseComplexity += 0.2; // tasks with time estimates are usually more involved
  }
  
  if (taskLower.includes('project') || taskLower.includes('assignment')) {
    baseComplexity = Math.max(baseComplexity, 0.7); // academic/work projects are complex
  }
  
  // Clamp final result
  const finalComplexity = Math.max(0.05, Math.min(0.95, baseComplexity));
  
  return {
    complexity: finalComplexity,
    matchedCategories,
    appliedModifiers,
    wordCount
  };
};

// Determine tier based on complexity score
const getTierForComplexity = (complexity) => {
  if (complexity <= 0.33) {
    return 'low';
  } else if (complexity <= 0.66) {
    return 'mid';
  } else {
    return 'high';
  }
};

// Calculate points within tier range with much better variation
const calculatePointsInTier = (tier, complexity, taskText) => {
  const tierData = difficultyTiers[tier];
  const { minPoints, maxPoints } = tierData;
  
  // Start with base complexity position within tier
  let tierPosition;
  
  if (tier === 'low') {
    // For low tier (0-0.33), map to position in range
    tierPosition = (complexity / 0.33);
  } else if (tier === 'mid') {
    // For mid tier (0.33-0.66), map to position in range  
    tierPosition = ((complexity - 0.33) / 0.33);
  } else {
    // For high tier (0.66-1.0), map to position in range
    tierPosition = ((complexity - 0.66) / 0.34);
  }
  
  // Add variation based on task characteristics
  const taskLower = taskText.toLowerCase();
  let pointMultiplier = 1.0;
  
  // Effort indicators that increase points within tier
  const effortBoosts = {
    'very': 0.2,
    'really': 0.15,
    'super': 0.2,
    'extremely': 0.25,
    'completely': 0.15,
    'thoroughly': 0.2,
    'carefully': 0.15,
    'properly': 0.1,
    'detailed': 0.2,
    'comprehensive': 0.25
  };
  
  // Time-based modifiers
  const timeModifiers = {
    'urgent': 0.3,
    'asap': 0.25,
    'immediately': 0.2,
    'tonight': 0.15,
    'tomorrow': 0.1,
    'weekend': -0.1,
    'when i have time': -0.2,
    'eventually': -0.15
  };
  
  // Apply effort boosts
  for (const [word, boost] of Object.entries(effortBoosts)) {
    if (taskLower.includes(word)) {
      pointMultiplier += boost;
    }
  }
  
  // Apply time modifiers
  for (const [phrase, modifier] of Object.entries(timeModifiers)) {
    if (taskLower.includes(phrase)) {
      pointMultiplier += modifier;
    }
  }
  
  // Add some randomness based on task length and word patterns
  const wordCount = taskText.split(' ').length;
  
  // More detailed descriptions get slight point boost
  if (wordCount > 5) {
    pointMultiplier += 0.1;
  }
  if (wordCount > 10) {
    pointMultiplier += 0.15;
  }
  
  // Tasks with numbers (quantities, time estimates) get variation
  if (taskLower.match(/\d+/)) {
    const numbers = taskLower.match(/\d+/g);
    const avgNumber = numbers.reduce((sum, num) => sum + parseInt(num), 0) / numbers.length;
    
    if (avgNumber > 10) {
      pointMultiplier += 0.1; // higher numbers suggest more work
    }
    if (avgNumber > 100) {
      pointMultiplier += 0.2;
    }
  }
  
  // Questions get slight boost (they require thinking)
  if (taskLower.includes('?')) {
    pointMultiplier += 0.1;
  }
  
  // Multiple tasks in one get boost
  if (taskLower.includes(' and ') || taskLower.includes(' & ') || taskLower.includes(', ')) {
    pointMultiplier += 0.15;
  }
  
  // Add a small random element for natural variation (but deterministic based on task)
  const taskHash = taskText.split('').reduce((a, b) => {
    a = ((a << 5) - a) + b.charCodeAt(0);
    return a & a;
  }, 0);
  
  const randomFactor = 0.85 + (Math.abs(taskHash % 100) / 100) * 0.3; // 0.85 to 1.15
  pointMultiplier *= randomFactor;
  
  // Ensure multiplier stays reasonable
  pointMultiplier = Math.max(0.7, Math.min(1.4, pointMultiplier));
  
  // Calculate final points with all the variation
  const pointRange = maxPoints - minPoints;
  const basePoints = minPoints + (pointRange * tierPosition);
  const finalPoints = Math.round(basePoints * pointMultiplier);
  
  return Math.max(minPoints, Math.min(maxPoints, finalPoints));
};

// Local analysis function for fallback
const performLocalAnalysis = (taskText) => {
  const analysis = analyzeTask(taskText);
  const { complexity, matchedCategories, appliedModifiers } = analysis;
  
  const tier = getTierForComplexity(complexity);
  const tierData = difficultyTiers[tier];
  const points = calculatePointsInTier(tier, complexity, taskText);
  
  let rationale = `${tierData.icon} ${tierData.name}: `;
  
  if (matchedCategories.length > 0) {
    rationale += `Detected as ${matchedCategories.join(', ')} task. `;
  }
  
  if (appliedModifiers.length > 0) {
    rationale += `Modifiers: ${appliedModifiers.join(', ')}. `;
  }
  
  rationale += `Complexity: ${(complexity * 100).toFixed(0)}%`;
  
  return {
    tier,
    tierData,
    points,
    complexity,
    rationale,
    matchedCategories,
    appliedModifiers
  };
};

export const scoreTodo = async (taskText) => {
  try {
    // Check if AI is available
    if (!aiService.getStatus().hasApiKey) {
      // No API key - ask user to set one up
      throw new Error('Please enable AI in Settings to get smart task scoring!');
    }

    const aiResult = await aiService.analyzeTask(taskText);
    console.log('🤖 AI result:', aiResult);
    console.log('🔍 AI tier specifically:', aiResult.tier);
    console.log('🔍 AI tier type:', typeof aiResult.tier);
    
    // Use AI result with proper tier data
    const tierData = difficultyTiers[aiResult.tier] || difficultyTiers.mid;
    
    console.log('📊 TierData for', aiResult.tier, ':', tierData);
    console.log('🗂️ Available tiers:', Object.keys(difficultyTiers));
    
    return {
      // Legacy compatibility  
      difficulty: aiResult.complexity || 0.5,
      band: aiResult.tier,
      basePoints: aiResult.points,
      points: aiResult.points,
      
      // New 3-tier system data
      tier: aiResult.tier,               // AI says: low/mid/high
      tierData: tierData,                // Get proper tier display data
      complexity: aiResult.complexity || 0.5,
      rationale: `${tierData.icon} ${tierData.name}: ${aiResult.reasoning}`,
      
      // AI-specific data
      aiEnabled: true,
      confidence: aiResult.confidence,
      timeEstimate: aiResult.timeEstimate,
      reasoning: aiResult.reasoning,
      source: 'ai'
    };
    
  } catch (error) {
    console.error('AI scoring failed:', error);
    // Re-throw the error so the UI can handle it
    throw error;
  }
};

// Export tier data for UI components
export const getDifficultyTiers = () => difficultyTiers;

// 3-tier todo scoring system with enhanced local analysis

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
    keywords: ['turn on', 'turn off', 'click', 'open', 'close', 'save', 'delete', 'copy', 'paste', 'download']
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

// Calculate points within tier range
const calculatePointsInTier = (tier, complexity) => {
  const tierData = difficultyTiers[tier];
  const { minPoints, maxPoints } = tierData;
  
  // Use complexity to determine position within tier range
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
  
  // Calculate final points within the tier range
  const pointRange = maxPoints - minPoints;
  const points = Math.round(minPoints + (pointRange * tierPosition));
  
  return Math.max(minPoints, Math.min(maxPoints, points));
};

// Local analysis function for fallback
const performLocalAnalysis = (taskText) => {
  const analysis = analyzeTask(taskText);
  const { complexity, matchedCategories, appliedModifiers } = analysis;
  
  const tier = getTierForComplexity(complexity);
  const tierData = difficultyTiers[tier];
  const points = calculatePointsInTier(tier, complexity);
  
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
    // Use enhanced local analysis
    const result = performLocalAnalysis(taskText);
    
    return {
      // Legacy compatibility
      difficulty: result.complexity,
      band: result.tier,
      basePoints: result.points,
      points: result.points,
      
      // New 3-tier system data
      tier: result.tier,
      tierData: result.tierData,
      complexity: result.complexity,
      rationale: result.rationale,
      
      // Local analysis data
      aiEnabled: false,
      analysis: result,
      source: 'local'
    };
    
  } catch (error) {
    console.error('Error scoring todo:', error);
    
    // Final fallback
    return {
      difficulty: 0.3,
      band: 'mid',
      basePoints: 150,
      points: 150,
      tier: 'mid',
      tierData: difficultyTiers.mid,
      complexity: 0.3,
      rationale: '🟡 Mid Tier: Default scoring (system error)',
      aiEnabled: false,
      source: 'error_fallback'
    };
  }
};

// Export tier data for UI components
export const getDifficultyTiers = () => difficultyTiers;

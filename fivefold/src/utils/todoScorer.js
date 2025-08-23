// AI-powered todo difficulty scoring
// In production, this would use a real AI API

// Training examples for AI scoring validation (future use)
// const scoringExamples = [
//   { task: "turn tv off", difficulty: 0.05 },
//   { task: "make coffee", difficulty: 0.10 },
//   { task: "send email", difficulty: 0.15 },
//   { task: "clean room", difficulty: 0.35 },
//   { task: "workout", difficulty: 0.45 },
//   { task: "study for exams", difficulty: 0.78 },
//   { task: "prepare presentation", difficulty: 0.88 },
//   { task: "apply to jobs", difficulty: 0.72 },
//   { task: "write report", difficulty: 0.65 },
//   { task: "learn new skill", difficulty: 0.85 }
// ];

const difficultyBands = {
  tiny: { min: 0.0, max: 0.20, basePoints: 5 },
  small: { min: 0.20, max: 0.40, basePoints: 10 },
  medium: { min: 0.40, max: 0.65, basePoints: 25 },
  big: { min: 0.65, max: 0.85, basePoints: 60 },
  epic: { min: 0.85, max: 1.00, basePoints: 120 }
};

// Simple keyword-based scoring (mock AI)
const calculateDifficulty = (task) => {
  const taskLower = task.toLowerCase();
  
  // Check for time indicators
  const timeKeywords = {
    quick: -0.2,
    fast: -0.2,
    simple: -0.15,
    easy: -0.15,
    hard: 0.3,
    difficult: 0.3,
    complex: 0.4,
    long: 0.3,
    hours: 0.4,
    'all day': 0.5
  };
  
  // Check for action complexity
  const actionKeywords = {
    turn: 0.05,
    send: 0.15,
    write: 0.5,
    create: 0.6,
    build: 0.7,
    study: 0.7,
    learn: 0.75,
    prepare: 0.65,
    clean: 0.35,
    organize: 0.4,
    plan: 0.5,
    research: 0.6,
    analyze: 0.65,
    develop: 0.75
  };
  
  let difficulty = 0.3; // Base difficulty
  
  // Adjust based on keywords
  for (const [keyword, adjustment] of Object.entries(timeKeywords)) {
    if (taskLower.includes(keyword)) {
      difficulty += adjustment;
    }
  }
  
  for (const [keyword, value] of Object.entries(actionKeywords)) {
    if (taskLower.includes(keyword)) {
      difficulty = value;
      break;
    }
  }
  
  // Adjust based on task length (longer tasks tend to be more complex)
  const wordCount = task.split(' ').length;
  if (wordCount > 10) difficulty += 0.2;
  if (wordCount > 20) difficulty += 0.3;
  
  // Clamp between 0 and 1
  return Math.max(0.05, Math.min(0.95, difficulty));
};

const getBandForDifficulty = (difficulty) => {
  for (const [band, range] of Object.entries(difficultyBands)) {
    if (difficulty >= range.min && difficulty <= range.max) {
      return { band, basePoints: range.basePoints };
    }
  }
  return { band: 'medium', basePoints: 25 };
};

export const scoreTodo = async (taskText) => {
  // Calculate difficulty
  const difficulty = calculateDifficulty(taskText);
  
  // Get band and base points
  const { band, basePoints } = getBandForDifficulty(difficulty);
  
  // Calculate final points with bonuses
  const urgencyBonus = 1.0; // Could be dynamic based on due date
  const streakBonus = 1.0; // Could be based on user's streak
  const latenessPenalty = 1.0; // Could penalize overdue tasks
  
  const finalPoints = Math.round(basePoints * urgencyBonus * streakBonus * latenessPenalty);
  
  return {
    difficulty,
    band,
    basePoints,
    points: Math.min(finalPoints, 180), // Cap at 180 points
    rationale: `Difficulty: ${(difficulty * 100).toFixed(0)}% - ${band} task`
  };
};

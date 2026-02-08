/**
 * Exercise-to-Muscle Group Mapping
 * 
 * Maps exercises to their primary and secondary muscle groups.
 * Used by the Physique scoring system to calculate muscle freshness.
 */

// All muscle group IDs used in the physique system
export const MUSCLE_GROUPS = {
  chest:      { id: 'chest',      name: 'Chest',       shortName: 'Chest',    view: 'front' },
  frontDelts: { id: 'frontDelts', name: 'Front Delts', shortName: 'F. Delts', view: 'front' },
  sideDelts:  { id: 'sideDelts',  name: 'Side Delts',  shortName: 'S. Delts', view: 'both' },
  rearDelts:  { id: 'rearDelts',  name: 'Rear Delts',  shortName: 'R. Delts', view: 'back' },
  traps:      { id: 'traps',      name: 'Traps',       shortName: 'Traps',    view: 'back' },
  lats:       { id: 'lats',       name: 'Lats',        shortName: 'Lats',     view: 'back' },
  upperBack:  { id: 'upperBack',  name: 'Upper Back',  shortName: 'Up. Back', view: 'back' },
  lowerBack:  { id: 'lowerBack',  name: 'Lower Back',  shortName: 'Lo. Back', view: 'back' },
  biceps:     { id: 'biceps',     name: 'Biceps',      shortName: 'Biceps',   view: 'front' },
  triceps:    { id: 'triceps',    name: 'Triceps',     shortName: 'Triceps',  view: 'back' },
  forearms:   { id: 'forearms',   name: 'Forearms',    shortName: 'Forearms', view: 'both' },
  abs:        { id: 'abs',        name: 'Abs',         shortName: 'Abs',      view: 'front' },
  obliques:   { id: 'obliques',   name: 'Obliques',    shortName: 'Obliques', view: 'front' },
  glutes:     { id: 'glutes',     name: 'Glutes',      shortName: 'Glutes',   view: 'back' },
  quads:      { id: 'quads',      name: 'Quads',       shortName: 'Quads',    view: 'front' },
  hamstrings: { id: 'hamstrings', name: 'Hamstrings',  shortName: 'Hams',     view: 'back' },
  calves:     { id: 'calves',     name: 'Calves',      shortName: 'Calves',   view: 'both' },
};

export const MUSCLE_GROUP_IDS = Object.keys(MUSCLE_GROUPS);

// Color thresholds for scores
export const SCORE_COLORS = {
  neutral: { min: 0,  max: 9,  color: '#8B8095', label: 'Untrained' },
  red:    { min: 10, max: 34, color: '#EF4444', label: 'Low' },
  amber:  { min: 35, max: 69, color: '#F59E0B', label: 'Moderate' },
  green:  { min: 70, max: 100, color: '#10B981', label: 'Consistent' },
};

// Get color for a score value
export const getScoreColor = (score) => {
  if (score >= 70) return SCORE_COLORS.green.color;
  if (score >= 35) return SCORE_COLORS.amber.color;
  if (score >= 10) return SCORE_COLORS.red.color;
  return SCORE_COLORS.neutral.color;
};

// Get label for a score value
export const getScoreLabel = (score) => {
  if (score >= 70) return 'Consistent';
  if (score >= 35) return 'Moderate';
  if (score >= 10) return 'Low';
  return 'Untrained';
};

/**
 * Maps exercise target field (from exercises.json) to muscle groups.
 * Format: target -> { primary: [muscleIds], secondary: [muscleIds] }
 */
const TARGET_TO_MUSCLES = {
  'pectorals':      { primary: ['chest'],      secondary: ['frontDelts', 'triceps'] },
  'biceps':         { primary: ['biceps'],      secondary: ['forearms'] },
  'triceps':        { primary: ['triceps'],     secondary: ['chest', 'frontDelts'] },
  'delts':          { primary: ['frontDelts', 'sideDelts'], secondary: ['traps'] },
  'abs':            { primary: ['abs'],         secondary: ['obliques'] },
  'quads':          { primary: ['quads'],       secondary: ['glutes', 'hamstrings'] },
  'hamstrings':     { primary: ['hamstrings'],  secondary: ['glutes', 'lowerBack'] },
  'calves':         { primary: ['calves'],      secondary: [] },
  'lats':           { primary: ['lats'],        secondary: ['biceps', 'upperBack'] },
  'upper back':     { primary: ['upperBack', 'traps'], secondary: ['lats', 'rearDelts'] },
  'lower back':     { primary: ['lowerBack'],   secondary: ['glutes', 'hamstrings'] },
  'glutes':         { primary: ['glutes'],      secondary: ['hamstrings', 'quads'] },
  'traps':          { primary: ['traps'],       secondary: ['upperBack', 'rearDelts'] },
  'forearms':       { primary: ['forearms'],    secondary: ['biceps'] },
  'cardiovascular': { primary: [],              secondary: ['quads', 'hamstrings', 'calves'] },
  'full body':      { primary: ['quads', 'chest', 'lats'], secondary: ['hamstrings', 'glutes', 'frontDelts', 'triceps', 'abs'] },
};

/**
 * Specific exercise name overrides for more accurate mapping.
 * Exercise names (lowercase) -> { primary, secondary }
 */
const EXERCISE_NAME_OVERRIDES = {
  // Chest
  'bench press':          { primary: ['chest'], secondary: ['frontDelts', 'triceps'] },
  'incline bench press':  { primary: ['chest', 'frontDelts'], secondary: ['triceps'] },
  'decline bench press':  { primary: ['chest'], secondary: ['triceps'] },
  'dumbbell fly':         { primary: ['chest'], secondary: ['frontDelts'] },
  'cable crossover':      { primary: ['chest'], secondary: ['frontDelts'] },
  'push-up':              { primary: ['chest'], secondary: ['frontDelts', 'triceps', 'abs'] },
  'push up':              { primary: ['chest'], secondary: ['frontDelts', 'triceps', 'abs'] },
  'chest dip':            { primary: ['chest'], secondary: ['triceps', 'frontDelts'] },
  'dumbbell press':       { primary: ['chest'], secondary: ['frontDelts', 'triceps'] },

  // Back
  'pull-up':              { primary: ['lats'], secondary: ['biceps', 'upperBack'] },
  'pull up':              { primary: ['lats'], secondary: ['biceps', 'upperBack'] },
  'chin-up':              { primary: ['lats', 'biceps'], secondary: ['upperBack'] },
  'chin up':              { primary: ['lats', 'biceps'], secondary: ['upperBack'] },
  'lat pulldown':         { primary: ['lats'], secondary: ['biceps', 'upperBack'] },
  'barbell row':          { primary: ['lats', 'upperBack'], secondary: ['biceps', 'rearDelts'] },
  'bent over row':        { primary: ['lats', 'upperBack'], secondary: ['biceps', 'rearDelts'] },
  'dumbbell row':         { primary: ['lats'], secondary: ['biceps', 'upperBack', 'rearDelts'] },
  'cable row':            { primary: ['lats', 'upperBack'], secondary: ['biceps'] },
  'seated row':           { primary: ['upperBack', 'lats'], secondary: ['biceps', 'rearDelts'] },
  'face pull':            { primary: ['rearDelts', 'upperBack'], secondary: ['traps'] },
  't-bar row':            { primary: ['lats', 'upperBack'], secondary: ['biceps', 'traps'] },

  // Shoulders
  'overhead press':       { primary: ['frontDelts', 'sideDelts'], secondary: ['triceps', 'traps'] },
  'shoulder press':       { primary: ['frontDelts', 'sideDelts'], secondary: ['triceps', 'traps'] },
  'military press':       { primary: ['frontDelts'], secondary: ['sideDelts', 'triceps'] },
  'lateral raise':        { primary: ['sideDelts'], secondary: ['traps'] },
  'front raise':          { primary: ['frontDelts'], secondary: ['sideDelts'] },
  'rear delt fly':        { primary: ['rearDelts'], secondary: ['upperBack'] },
  'arnold press':         { primary: ['frontDelts', 'sideDelts'], secondary: ['triceps'] },
  'upright row':          { primary: ['traps', 'sideDelts'], secondary: ['frontDelts', 'biceps'] },

  // Arms
  'barbell curl':         { primary: ['biceps'], secondary: ['forearms'] },
  'dumbbell curl':        { primary: ['biceps'], secondary: ['forearms'] },
  'hammer curl':          { primary: ['biceps', 'forearms'], secondary: [] },
  'preacher curl':        { primary: ['biceps'], secondary: ['forearms'] },
  'concentration curl':   { primary: ['biceps'], secondary: [] },
  'tricep pushdown':      { primary: ['triceps'], secondary: [] },
  'tricep extension':     { primary: ['triceps'], secondary: [] },
  'skull crusher':        { primary: ['triceps'], secondary: [] },
  'close grip bench':     { primary: ['triceps'], secondary: ['chest'] },
  'dip':                  { primary: ['triceps', 'chest'], secondary: ['frontDelts'] },
  'wrist curl':           { primary: ['forearms'], secondary: [] },

  // Legs
  'squat':                { primary: ['quads', 'glutes'], secondary: ['hamstrings', 'lowerBack', 'abs'] },
  'back squat':           { primary: ['quads', 'glutes'], secondary: ['hamstrings', 'lowerBack'] },
  'front squat':          { primary: ['quads'], secondary: ['glutes', 'abs'] },
  'leg press':            { primary: ['quads'], secondary: ['glutes', 'hamstrings'] },
  'leg extension':        { primary: ['quads'], secondary: [] },
  'leg curl':             { primary: ['hamstrings'], secondary: ['calves'] },
  'romanian deadlift':    { primary: ['hamstrings', 'glutes'], secondary: ['lowerBack'] },
  'deadlift':             { primary: ['lowerBack', 'hamstrings', 'glutes'], secondary: ['quads', 'traps', 'forearms', 'lats'] },
  'lunge':                { primary: ['quads', 'glutes'], secondary: ['hamstrings'] },
  'walking lunge':        { primary: ['quads', 'glutes'], secondary: ['hamstrings'] },
  'bulgarian split squat':{ primary: ['quads', 'glutes'], secondary: ['hamstrings'] },
  'hip thrust':           { primary: ['glutes'], secondary: ['hamstrings'] },
  'calf raise':           { primary: ['calves'], secondary: [] },
  'standing calf raise':  { primary: ['calves'], secondary: [] },
  'seated calf raise':    { primary: ['calves'], secondary: [] },
  'goblet squat':         { primary: ['quads', 'glutes'], secondary: ['abs'] },
  'hack squat':           { primary: ['quads'], secondary: ['glutes'] },
  'step up':              { primary: ['quads', 'glutes'], secondary: ['hamstrings'] },
  'sumo squat':           { primary: ['quads', 'glutes'], secondary: ['hamstrings'] },

  // Core
  'plank':                { primary: ['abs'], secondary: ['obliques', 'lowerBack'] },
  'crunch':               { primary: ['abs'], secondary: [] },
  'sit-up':               { primary: ['abs'], secondary: ['obliques'] },
  'sit up':               { primary: ['abs'], secondary: ['obliques'] },
  'russian twist':        { primary: ['obliques'], secondary: ['abs'] },
  'leg raise':            { primary: ['abs'], secondary: ['obliques'] },
  'hanging leg raise':    { primary: ['abs'], secondary: ['obliques', 'forearms'] },
  'mountain climber':     { primary: ['abs'], secondary: ['obliques', 'quads', 'frontDelts'] },
  'bicycle crunch':       { primary: ['abs', 'obliques'], secondary: [] },
  'ab wheel rollout':     { primary: ['abs'], secondary: ['lats', 'triceps'] },
  'side plank':           { primary: ['obliques'], secondary: ['abs'] },
  'cable woodchop':       { primary: ['obliques'], secondary: ['abs'] },

  // Traps
  'shrug':                { primary: ['traps'], secondary: [] },
  'barbell shrug':        { primary: ['traps'], secondary: ['forearms'] },
  'dumbbell shrug':       { primary: ['traps'], secondary: ['forearms'] },
  'farmer walk':          { primary: ['traps', 'forearms'], secondary: ['abs'] },
  'farmer carry':         { primary: ['traps', 'forearms'], secondary: ['abs'] },

  // Compound / Full body
  'clean':                { primary: ['quads', 'traps', 'glutes'], secondary: ['hamstrings', 'frontDelts', 'forearms'] },
  'clean and jerk':       { primary: ['quads', 'frontDelts', 'traps'], secondary: ['glutes', 'triceps'] },
  'snatch':               { primary: ['quads', 'traps', 'frontDelts'], secondary: ['glutes', 'hamstrings'] },
  'burpee':               { primary: ['quads', 'chest'], secondary: ['triceps', 'abs', 'frontDelts'] },
  'thruster':             { primary: ['quads', 'frontDelts'], secondary: ['glutes', 'triceps'] },
  'kettlebell swing':     { primary: ['glutes', 'hamstrings'], secondary: ['lowerBack', 'abs', 'frontDelts'] },
};

/**
 * Get muscle mapping for an exercise.
 * Checks name overrides first, then target field, then bodyPart fallback.
 * 
 * @param {string} exerciseName - The exercise name
 * @param {string} target - The target field from exercise data
 * @param {string} bodyPart - The bodyPart field from exercise data
 * @returns {{ primary: string[], secondary: string[] }}
 */
export const getMusclesForExercise = (exerciseName, target, bodyPart) => {
  // 1. Check name overrides (most accurate)
  const nameLower = (exerciseName || '').toLowerCase().trim();
  
  // Try exact match first
  if (EXERCISE_NAME_OVERRIDES[nameLower]) {
    return EXERCISE_NAME_OVERRIDES[nameLower];
  }
  
  // Try partial match (e.g., "Barbell Bench Press" contains "bench press")
  for (const [key, mapping] of Object.entries(EXERCISE_NAME_OVERRIDES)) {
    if (nameLower.includes(key) || key.includes(nameLower)) {
      return mapping;
    }
  }
  
  // 2. Check target field
  const targetLower = (target || '').toLowerCase().trim();
  if (TARGET_TO_MUSCLES[targetLower]) {
    return TARGET_TO_MUSCLES[targetLower];
  }
  
  // 3. Fallback: use bodyPart field
  const bodyPartLower = (bodyPart || '').toLowerCase().trim();
  const BODY_PART_FALLBACK = {
    'chest':     { primary: ['chest'], secondary: ['frontDelts', 'triceps'] },
    'back':      { primary: ['lats', 'upperBack'], secondary: ['biceps'] },
    'shoulders': { primary: ['frontDelts', 'sideDelts'], secondary: ['traps'] },
    'arms':      { primary: ['biceps', 'triceps'], secondary: ['forearms'] },
    'legs':      { primary: ['quads', 'hamstrings'], secondary: ['glutes', 'calves'] },
    'core':      { primary: ['abs'], secondary: ['obliques'] },
    'full body': { primary: ['quads', 'chest', 'lats'], secondary: ['abs', 'glutes'] },
    'cardio':    { primary: [], secondary: ['quads', 'hamstrings', 'calves'] },
  };
  
  if (BODY_PART_FALLBACK[bodyPartLower]) {
    return BODY_PART_FALLBACK[bodyPartLower];
  }
  
  // 4. Final fallback: no muscles (skip scoring)
  return { primary: [], secondary: [] };
};

export default {
  MUSCLE_GROUPS,
  MUSCLE_GROUP_IDS,
  SCORE_COLORS,
  getScoreColor,
  getScoreLabel,
  getMusclesForExercise,
};

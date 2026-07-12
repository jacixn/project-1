/**
 * Muscle suggestion engine for custom exercises.
 *
 * Reads an exercise name (plus equipment/body part) and proposes primary and
 * secondary muscle groups. Deterministic token rules — no network, no model.
 * The user always sees the result as editable chips; this only saves typing.
 *
 * Design: a movement pattern decides the muscles ("curl" -> biceps), and
 * modifiers refine it ("incline" -> upper chest, "hammer" -> + forearms,
 * "reverse" on a curl -> forearm-dominant). Rules are ordered most-specific
 * first, and the first pattern that matches wins.
 */

import { MUSCLE_GROUPS } from './exerciseMuscleMap';

// Regions used to group the picker chips. Order matters (UI renders in order).
// `bodyPart` ties each region to the Body Part the user picks, so the muscles
// on offer can never contradict it (Arms must not offer Glutes).
export const MUSCLE_REGIONS = [
  { id: 'chest',     name: 'Chest',     bodyPart: 'Chest',     muscles: ['upperChest', 'midChest', 'lowerChest'] },
  { id: 'back',      name: 'Back',      bodyPart: 'Back',      muscles: ['lats', 'upperBack', 'lowerBack', 'traps'] },
  { id: 'shoulders', name: 'Shoulders', bodyPart: 'Shoulders', muscles: ['frontDelts', 'sideDelts', 'rearDelts'] },
  { id: 'arms',      name: 'Arms',      bodyPart: 'Arms',      muscles: ['biceps', 'triceps', 'forearms'] },
  { id: 'core',      name: 'Core',      bodyPart: 'Core',      muscles: ['abs', 'obliques'] },
  { id: 'legs',      name: 'Legs',      bodyPart: 'Legs',      muscles: ['quads', 'hamstrings', 'glutes', 'calves'] },
];

// 'Full Body' unlocks everything; anything unrecognised unlocks nothing.
export const regionsForBodyParts = (bodyParts = []) => {
  if (bodyParts.includes('Full Body')) return MUSCLE_REGIONS;
  return MUSCLE_REGIONS.filter((r) => bodyParts.includes(r.bodyPart));
};

export const musclesForBodyParts = (bodyParts = []) =>
  regionsForBodyParts(bodyParts).flatMap((r) => r.muscles);

// Which body parts a set of muscles implies (used to keep the two in step when
// the name suggestion fills muscles in for you)
export const bodyPartsForMuscles = (muscleIds = []) => {
  const parts = MUSCLE_REGIONS
    .filter((r) => r.muscles.some((m) => muscleIds.includes(m)))
    .map((r) => r.bodyPart);
  return [...new Set(parts)];
};

// Drop anything the chosen body parts don't cover
export const constrainMuscles = (muscles, bodyParts) => {
  const allowed = new Set(musclesForBodyParts(bodyParts));
  return {
    primary: (muscles.primary || []).filter((m) => allowed.has(m)),
    secondary: (muscles.secondary || []).filter((m) => allowed.has(m)),
  };
};

const has = (tokens, word) => tokens.includes(word);
const hasAny = (tokens, words) => words.some((w) => tokens.includes(w));

// Normalise "Cable Curls" -> ['cable','curl'] (plural stripped, punctuation to
// space). Length > 2 so "ups" -> "up" ("Chin Ups"); "press"/"ss" words are safe.
export const tokenize = (name) =>
  String(name || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .map((t) => (t.length > 2 && t.endsWith('s') && !t.endsWith('ss') ? t.slice(0, -1) : t));

/**
 * Pattern rules. `match` receives the token list; `muscles` may be a function
 * of the tokens so a pattern can refine itself from modifiers.
 */
const PATTERNS = [
  // ---- Curls (the reported case: "cable curls" must NOT hit triceps) ----
  {
    id: 'curl',
    match: (t) => has(t, 'curl') && !hasAny(t, ['leg', 'hamstring', 'nordic']),
    muscles: (t) => {
      // Reverse / wrist curls are forearm-dominant
      if (hasAny(t, ['wrist', 'reverse'])) {
        return { primary: ['forearms'], secondary: ['biceps'] };
      }
      // Hammer grip recruits brachioradialis meaningfully
      if (hasAny(t, ['hammer', 'rope', 'cross', 'body'])) {
        return { primary: ['biceps', 'forearms'], secondary: [] };
      }
      return { primary: ['biceps'], secondary: ['forearms'] };
    },
  },
  { id: 'leg-curl', match: (t) => has(t, 'curl') && hasAny(t, ['leg', 'hamstring', 'nordic']),
    muscles: () => ({ primary: ['hamstrings'], secondary: ['calves', 'glutes'] }) },
  // Glute-ham raise / GHR / nordic — hamstring work that never says "curl"
  { id: 'ghr', match: (t) => has(t, 'ghr') || has(t, 'nordic') || ((has(t, 'glute') || has(t, 'ham')) && has(t, 'raise')),
    muscles: () => ({ primary: ['hamstrings', 'glutes'], secondary: ['lowerBack', 'calves'] }) },

  // ---- Triceps ----
  { id: 'pushdown', match: (t) => hasAny(t, ['pushdown', 'pressdown', 'kickback']),
    muscles: () => ({ primary: ['triceps'], secondary: [] }) },
  { id: 'skullcrusher', match: (t) => hasAny(t, ['skullcrusher', 'skull']) || (has(t, 'lying') && has(t, 'extension')),
    muscles: () => ({ primary: ['triceps'], secondary: [] }) },
  { id: 'tricep-ext', match: (t) => has(t, 'extension') && hasAny(t, ['tricep', 'triceps', 'overhead']),
    muscles: () => ({ primary: ['triceps'], secondary: [] }) },
  { id: 'close-grip', match: (t) => has(t, 'close') && has(t, 'grip') && hasAny(t, ['bench', 'press']),
    muscles: () => ({ primary: ['triceps'], secondary: ['midChest', 'frontDelts'] }) },

  // ---- Legs ----
  { id: 'leg-extension', match: (t) => has(t, 'extension') && has(t, 'leg'),
    muscles: () => ({ primary: ['quads'], secondary: [] }) },
  { id: 'calf', match: (t) => hasAny(t, ['calf', 'calve']),
    muscles: () => ({ primary: ['calves'], secondary: [] }) },
  { id: 'hip-thrust', match: (t) => hasAny(t, ['thrust', 'bridge']),
    muscles: () => ({ primary: ['glutes'], secondary: ['hamstrings'] }) },
  { id: 'rdl', match: (t) => (has(t, 'romanian') || has(t, 'stiff')) && hasAny(t, ['deadlift', 'dl']),
    muscles: () => ({ primary: ['hamstrings', 'glutes'], secondary: ['lowerBack'] }) },
  { id: 'deadlift', match: (t) => hasAny(t, ['deadlift']),
    muscles: () => ({ primary: ['lowerBack', 'hamstrings', 'glutes'], secondary: ['quads', 'traps', 'forearms', 'lats'] }) },
  { id: 'squat', match: (t) => hasAny(t, ['squat']),
    muscles: (t) => (hasAny(t, ['front', 'hack', 'sissy'])
      ? { primary: ['quads'], secondary: has(t, 'sissy') ? [] : ['glutes', 'abs'] }
      : { primary: ['quads', 'glutes'], secondary: ['hamstrings', 'lowerBack'] }) },
  { id: 'lunge', match: (t) => hasAny(t, ['lunge', 'split', 'step']),
    muscles: () => ({ primary: ['quads', 'glutes'], secondary: ['hamstrings'] }) },
  { id: 'leg-press', match: (t) => has(t, 'leg') && has(t, 'press'),
    muscles: () => ({ primary: ['quads'], secondary: ['glutes', 'hamstrings'] }) },

  // ---- Chest (incline/decline modifiers pick the head) ----
  {
    id: 'fly',
    // "Reverse Fly" / "Reverse Pec Deck" are rear-delt work, not chest
    match: (t) => hasAny(t, ['fly', 'flye', 'crossover', 'pec']) && !hasAny(t, ['rear', 'reverse']),
    muscles: (t) => {
      if (has(t, 'incline') || (has(t, 'low') && has(t, 'high'))) return { primary: ['upperChest'], secondary: ['frontDelts'] };
      if (has(t, 'decline') || (has(t, 'high') && has(t, 'low'))) return { primary: ['lowerChest'], secondary: ['midChest'] };
      return { primary: ['midChest'], secondary: ['upperChest', 'frontDelts'] };
    },
  },
  { id: 'rear-fly', match: (t) => hasAny(t, ['fly', 'flye', 'pec', 'raise']) && hasAny(t, ['rear', 'reverse']),
    muscles: () => ({ primary: ['rearDelts'], secondary: ['upperBack'] }) },
  // "Incline Dumbbell Press" names no bench, but the angle names the head.
  // Shoulder/overhead presses are excluded — an incline there is still delts.
  {
    id: 'angled-press',
    match: (t) => has(t, 'press')
      && hasAny(t, ['incline', 'decline'])
      && !hasAny(t, ['shoulder', 'overhead', 'military', 'arnold', 'leg']),
    muscles: (t) => (has(t, 'incline')
      ? { primary: ['upperChest'], secondary: ['frontDelts', 'triceps'] }
      : { primary: ['lowerChest'], secondary: ['midChest', 'triceps'] }),
  },
  {
    id: 'bench',
    match: (t) => hasAny(t, ['bench', 'chest']) && hasAny(t, ['press', 'push']),
    muscles: (t) => {
      if (has(t, 'incline')) return { primary: ['upperChest'], secondary: ['frontDelts', 'triceps'] };
      if (has(t, 'decline')) return { primary: ['lowerChest'], secondary: ['midChest', 'triceps'] };
      return { primary: ['midChest'], secondary: ['upperChest', 'frontDelts', 'triceps'] };
    },
  },
  { id: 'pushup', match: (t) => (has(t, 'push') && has(t, 'up')) || has(t, 'pushup'),
    muscles: () => ({ primary: ['midChest'], secondary: ['frontDelts', 'triceps', 'abs'] }) },
  { id: 'dip', match: (t) => has(t, 'dip'),
    muscles: (t) => (has(t, 'tricep') || has(t, 'bench')
      ? { primary: ['triceps'], secondary: ['lowerChest', 'frontDelts'] }
      : { primary: ['lowerChest', 'triceps'], secondary: ['frontDelts'] }) },

  // ---- Shoulders ----
  { id: 'lateral-raise', match: (t) => hasAny(t, ['lateral', 'side']) && has(t, 'raise'),
    muscles: () => ({ primary: ['sideDelts'], secondary: ['traps'] }) },
  { id: 'front-raise', match: (t) => has(t, 'front') && has(t, 'raise'),
    muscles: () => ({ primary: ['frontDelts'], secondary: [] }) },
  { id: 'face-pull', match: (t) => has(t, 'face') && has(t, 'pull'),
    muscles: () => ({ primary: ['rearDelts', 'upperBack'], secondary: ['traps'] }) },
  { id: 'upright-row', match: (t) => has(t, 'upright') && has(t, 'row'),
    muscles: () => ({ primary: ['traps', 'sideDelts'], secondary: ['biceps'] }) },
  { id: 'ohp', match: (t) => hasAny(t, ['overhead', 'shoulder', 'military', 'arnold']) && hasAny(t, ['press']),
    muscles: () => ({ primary: ['frontDelts', 'sideDelts'], secondary: ['triceps', 'traps'] }) },
  { id: 'shrug', match: (t) => has(t, 'shrug'),
    muscles: () => ({ primary: ['traps'], secondary: ['forearms'] }) },

  // ---- Back ----
  { id: 'pullover', match: (t) => has(t, 'pullover'),
    muscles: () => ({ primary: ['lats'], secondary: ['midChest', 'triceps'] }) },
  { id: 'pulldown', match: (t) => has(t, 'pulldown') || (has(t, 'lat') && has(t, 'pull')),
    muscles: () => ({ primary: ['lats'], secondary: ['biceps', 'upperBack'] }) },
  { id: 'pullup', match: (t) => (hasAny(t, ['pull', 'chin']) && has(t, 'up')) || hasAny(t, ['pullup', 'chinup']),
    muscles: (t) => (has(t, 'chin') || has(t, 'chinup')
      ? { primary: ['lats', 'biceps'], secondary: ['upperBack'] }
      : { primary: ['lats'], secondary: ['biceps', 'upperBack'] }) },
  { id: 'row', match: (t) => has(t, 'row'),
    muscles: () => ({ primary: ['lats', 'upperBack'], secondary: ['biceps', 'rearDelts'] }) },
  { id: 'back-extension', match: (t) => has(t, 'extension') && hasAny(t, ['back', 'hyper']),
    muscles: () => ({ primary: ['lowerBack'], secondary: ['glutes', 'hamstrings'] }) },
  { id: 'good-morning', match: (t) => has(t, 'good') && has(t, 'morning'),
    muscles: () => ({ primary: ['hamstrings', 'lowerBack'], secondary: ['glutes'] }) },

  // ---- Core ----
  { id: 'oblique', match: (t) => hasAny(t, ['oblique', 'twist', 'woodchop', 'chop']) || (has(t, 'side') && has(t, 'plank')),
    muscles: () => ({ primary: ['obliques'], secondary: ['abs'] }) },
  { id: 'plank', match: (t) => has(t, 'plank'),
    muscles: () => ({ primary: ['abs'], secondary: ['obliques', 'lowerBack'] }) },
  { id: 'abs', match: (t) => hasAny(t, ['crunch', 'situp', 'ab', 'rollout']) || (has(t, 'leg') && has(t, 'raise')) || (has(t, 'sit') && has(t, 'up')),
    muscles: () => ({ primary: ['abs'], secondary: ['obliques'] }) },

  // ---- Carries / conditioning ----
  { id: 'carry', match: (t) => hasAny(t, ['carry', 'walk']) && hasAny(t, ['farmer', 'suitcase']),
    muscles: () => ({ primary: ['traps', 'forearms'], secondary: ['abs'] }) },
  { id: 'swing', match: (t) => has(t, 'swing'),
    muscles: () => ({ primary: ['glutes', 'hamstrings'], secondary: ['lowerBack', 'abs'] }) },

  // ---- Generic press/raise fallbacks (after the specific ones) ----
  { id: 'generic-press', match: (t) => has(t, 'press'),
    muscles: () => ({ primary: ['midChest', 'frontDelts'], secondary: ['triceps'] }) },
];

// Equipment nudges: a strict-form machine isolates, free weights add stabilisers
const EQUIPMENT_SECONDARY = {
  Barbell: ['forearms'],
  Dumbbell: ['forearms'],
  Kettlebell: ['forearms', 'abs'],
  'Body Weight': ['abs'],
};

const dedupe = (list) => [...new Set(list)].filter((m) => !!MUSCLE_GROUPS[m]);

/**
 * Suggest muscles for an exercise.
 * @returns {{ primary: string[], secondary: string[], matched: string|null }}
 *          `matched` is the rule id (null when nothing matched, i.e. no guess).
 */
export const suggestMuscles = (name, equipment = '', bodyPart = '') => {
  const tokens = tokenize(name);
  if (tokens.length === 0) return { primary: [], secondary: [], matched: null };

  for (const rule of PATTERNS) {
    if (!rule.match(tokens)) continue;
    const base = rule.muscles(tokens);
    let secondary = [...base.secondary];

    // Machines and cables hold the path for you: drop stabiliser credit
    const freeWeight = !['Machine', 'Smith Machine', 'Cable'].includes(equipment);
    if (freeWeight && EQUIPMENT_SECONDARY[equipment]) {
      secondary = [...secondary, ...EQUIPMENT_SECONDARY[equipment]];
    }

    const primary = dedupe(base.primary);
    return {
      primary,
      secondary: dedupe(secondary).filter((m) => !primary.includes(m)),
      matched: rule.id,
    };
  }

  return { primary: [], secondary: [], matched: null };
};

export default {
  suggestMuscles,
  tokenize,
  MUSCLE_REGIONS,
  regionsForBodyParts,
  musclesForBodyParts,
  bodyPartsForMuscles,
  constrainMuscles,
};

/**
 * BodyMap2D — Professional front & back anatomical body map.
 * Uses react-native-body-highlighter for realistic SVG anatomy.
 * Props: scores, gender, selectedMuscle, onMusclePress, height
 */

import React, { memo, useMemo, useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import Body from 'react-native-body-highlighter';
import { getScoreColor } from '../data/exerciseMuscleMap';

const UNTRAINED_FILL = '#3A3650';
const HIGHLIGHT_STROKE = '#5B9BF5';
const HIGHLIGHT_STROKE_WIDTH = 3;

/**
 * Some library slugs map to multiple of our muscle IDs.
 * For colouring we pick the best score across all related muscles.
 * For tapping we use context (front vs back view) to pick the right one.
 */
const SLUG_MUSCLE_GROUPS = {
  chest:        ['chest'],
  biceps:       ['biceps'],
  triceps:      ['triceps'],
  deltoids:     ['frontDelts', 'sideDelts', 'rearDelts'],
  forearm:      ['forearms'],
  abs:          ['abs'],
  obliques:     ['obliques'],
  quadriceps:   ['quads'],
  hamstring:    ['hamstrings'],
  calves:       ['calves'],
  trapezius:    ['traps'],
  'upper-back': ['upperBack', 'lats'],
  'lower-back': ['lowerBack'],
  gluteal:      ['glutes'],
  tibialis:     ['calves'],
  adductors:    ['quads'],
  knees:        ['quads'],
  neck:         ['traps'],
};

const MUSCLE_TO_SLUGS = {};
Object.entries(SLUG_MUSCLE_GROUPS).forEach(([slug, muscleIds]) => {
  muscleIds.forEach((id) => {
    if (!MUSCLE_TO_SLUGS[id]) MUSCLE_TO_SLUGS[id] = [];
    if (!MUSCLE_TO_SLUGS[id].includes(slug)) MUSCLE_TO_SLUGS[id].push(slug);
  });
});

const FRONT_TAP_MAP = {
  chest: 'chest', biceps: 'biceps', deltoids: 'frontDelts',
  forearm: 'forearms', abs: 'abs', obliques: 'obliques',
  quadriceps: 'quads', calves: 'calves', tibialis: 'calves',
  adductors: 'quads', knees: 'quads', trapezius: 'traps',
  'upper-back': 'upperBack', 'lower-back': 'lowerBack',
  triceps: 'triceps', hamstring: 'hamstrings', gluteal: 'glutes',
  neck: 'traps', head: null, hair: null, hands: null, feet: null, ankles: null,
};

const BACK_TAP_MAP = {
  ...FRONT_TAP_MAP,
  deltoids: 'rearDelts',
  'upper-back': 'lats',
};

function bestScore(scores, muscleIds) {
  let best = -1;
  for (const id of muscleIds) {
    const d = scores[id];
    if (d && d.score !== undefined && d.score > best) best = d.score;
  }
  return best;
}

function buildData(scores, selectedMuscle) {
  const data = [];
  const seen = new Set();

  const selectedSlugs = new Set();
  if (selectedMuscle && MUSCLE_TO_SLUGS[selectedMuscle]) {
    MUSCLE_TO_SLUGS[selectedMuscle].forEach((s) => selectedSlugs.add(s));
  }

  Object.entries(SLUG_MUSCLE_GROUPS).forEach(([slug, muscleIds]) => {
    if (seen.has(slug)) return;
    seen.add(slug);

    const score = bestScore(scores, muscleIds);
    const isSelected = selectedSlugs.has(slug);
    const hasTrained = score >= 10;

    if (!hasTrained && !isSelected) return;

    const partStyles = { fill: hasTrained ? getScoreColor(score) : UNTRAINED_FILL };
    if (isSelected) {
      partStyles.stroke = HIGHLIGHT_STROKE;
      partStyles.strokeWidth = HIGHLIGHT_STROKE_WIDTH;
    }

    data.push({ slug, intensity: 1, styles: partStyles });
  });

  return data;
}

const BodyMap2D = memo(({ scores = {}, gender = 'male', selectedMuscle, onMusclePress, height = 500 }) => {
  const data = useMemo(() => buildData(scores, selectedMuscle), [scores, selectedMuscle]);
  const scale = height / 390;

  const handleFrontPress = useCallback((bodyPart) => {
    if (!bodyPart?.slug || !onMusclePress) return;
    const muscleId = FRONT_TAP_MAP[bodyPart.slug];
    if (muscleId) onMusclePress(muscleId);
  }, [onMusclePress]);

  const handleBackPress = useCallback((bodyPart) => {
    if (!bodyPart?.slug || !onMusclePress) return;
    const muscleId = BACK_TAP_MAP[bodyPart.slug];
    if (muscleId) onMusclePress(muscleId);
  }, [onMusclePress]);

  return (
    <View style={[styles.container, { height }]}>
      <View style={styles.figureWrap}>
        <Body
          data={data}
          gender={gender}
          side="front"
          scale={scale}
          onBodyPartPress={handleFrontPress}
          border="none"
          defaultFill={UNTRAINED_FILL}
        />
      </View>
      <View style={styles.figureWrap}>
        <Body
          data={data}
          gender={gender}
          side="back"
          scale={scale}
          onBodyPartPress={handleBackPress}
          border="none"
          defaultFill={UNTRAINED_FILL}
        />
      </View>
    </View>
  );
});

BodyMap2D.displayName = 'BodyMap2D';

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  figureWrap: {
    flex: 1,
    alignItems: 'center',
  },
});

export default BodyMap2D;

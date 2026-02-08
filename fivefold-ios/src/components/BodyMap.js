/**
 * BodyMap Component
 * 
 * Anatomical SVG body visualization with tappable muscle groups.
 * Supports male and female body types, front and back views.
 * Uses react-native-svg for smooth, organic shapes.
 */

import React, { useRef, useEffect } from 'react';
import { View, Animated, StyleSheet, Dimensions } from 'react-native';
import Svg, { Path, Ellipse, G } from 'react-native-svg';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const BODY_COLOR = 'rgba(255,255,255,0.04)';  // Subtle body silhouette
const JOINT_COLOR = 'rgba(255,255,255,0.03)'; // Joints/connectors

// ============================================
//  MALE BODY — FRONT VIEW
// ============================================
const MALE_FRONT_BODY = {
  head: { type: 'ellipse', cx: 100, cy: 35, rx: 19, ry: 24 },
  neck: { type: 'path', d: 'M87,57 L113,57 L115,68 Q108,72 100,72 Q92,72 85,68 Z' },
  torso: { type: 'path', d: 'M82,68 Q70,72 60,80 Q50,88 48,100 L50,128 Q50,150 48,172 Q46,192 50,202 L60,220 Q72,234 88,238 L100,240 L112,238 Q128,234 140,220 L150,202 Q154,192 152,172 Q150,150 150,128 L152,100 Q150,88 140,80 Q130,72 118,68 Z' },
  leftArm: { type: 'path', d: 'M60,80 Q48,78 42,84 C36,92 32,108 32,128 C32,148 28,166 24,184 Q20,198 18,210 Q16,222 20,228 Q26,232 30,228 C34,220 38,202 40,186 C44,168 46,150 48,132 C50,116 52,102 54,92 Z' },
  rightArm: { type: 'path', d: 'M140,80 Q152,78 158,84 C164,92 168,108 168,128 C168,148 172,166 176,184 Q180,198 182,210 Q184,222 180,228 Q174,232 170,228 C166,220 162,202 160,186 C156,168 154,150 152,132 C150,116 148,102 146,92 Z' },
  leftLeg: { type: 'path', d: 'M60,220 Q54,232 54,248 C52,268 54,290 56,310 Q58,328 58,345 C58,365 56,385 54,405 Q52,422 52,438 Q52,450 56,455 L68,458 Q74,455 74,448 Q74,434 72,420 C68,400 66,380 66,360 Q66,342 68,325 C70,305 72,285 72,265 C72,250 70,238 68,228 Z' },
  rightLeg: { type: 'path', d: 'M140,220 Q146,232 146,248 C148,268 146,290 144,310 Q142,328 142,345 C142,365 144,385 146,405 Q148,422 148,438 Q148,450 144,455 L132,458 Q126,455 126,448 Q126,434 128,420 C132,400 134,380 134,360 Q134,342 132,325 C130,305 128,285 128,265 C128,250 130,238 132,228 Z' },
};

const MALE_FRONT_MUSCLES = [
  // Traps
  { id: 'traps', d: 'M86,68 L96,66 L100,74 L94,80 L82,78 Z' },
  { id: 'traps', d: 'M114,68 L104,66 L100,74 L106,80 L118,78 Z' },
  // Front Delts
  { id: 'frontDelts', d: 'M44,84 Q46,76 54,74 Q62,72 68,76 L68,94 Q60,98 52,96 Q46,94 44,88 Z' },
  { id: 'frontDelts', d: 'M156,84 Q154,76 146,74 Q138,72 132,76 L132,94 Q140,98 148,96 Q154,94 156,88 Z' },
  // Chest
  { id: 'chest', d: 'M72,86 Q80,82 94,84 L98,84 L98,126 Q92,130 84,128 Q76,124 72,114 Z' },
  { id: 'chest', d: 'M128,86 Q120,82 106,84 L102,84 L102,126 Q108,130 116,128 Q124,124 128,114 Z' },
  // Biceps
  { id: 'biceps', type: 'ellipse', cx: 40, cy: 118, rx: 9, ry: 22 },
  { id: 'biceps', type: 'ellipse', cx: 160, cy: 118, rx: 9, ry: 22 },
  // Abs
  { id: 'abs', d: 'M88,128 L112,128 Q116,128 116,132 L116,196 Q116,200 112,200 L88,200 Q84,200 84,196 L84,132 Q84,128 88,128 Z' },
  // Obliques
  { id: 'obliques', d: 'M72,132 L82,128 L82,190 L72,182 Z' },
  { id: 'obliques', d: 'M128,132 L118,128 L118,190 L128,182 Z' },
  // Forearms
  { id: 'forearms', type: 'ellipse', cx: 32, cy: 172, rx: 7, ry: 22 },
  { id: 'forearms', type: 'ellipse', cx: 168, cy: 172, rx: 7, ry: 22 },
  // Quads
  { id: 'quads', d: 'M62,228 Q68,220 80,218 L88,220 Q90,230 90,248 Q90,274 88,298 Q86,318 80,330 Q74,334 68,330 Q62,322 60,308 Q56,288 56,268 Q56,248 62,228 Z' },
  { id: 'quads', d: 'M138,228 Q132,220 120,218 L112,220 Q110,230 110,248 Q110,274 112,298 Q114,318 120,330 Q126,334 132,330 Q138,322 140,308 Q144,288 144,268 Q144,248 138,228 Z' },
  // Calves
  { id: 'calves', d: 'M56,350 Q60,340 64,342 Q70,346 70,365 Q70,388 68,408 Q66,418 62,422 Q58,424 56,418 Q53,408 53,388 Q53,365 56,350 Z' },
  { id: 'calves', d: 'M144,350 Q140,340 136,342 Q130,346 130,365 Q130,388 132,408 Q134,418 138,422 Q142,424 144,418 Q147,408 147,388 Q147,365 144,350 Z' },
];

// ============================================
//  MALE BODY — BACK VIEW
// ============================================
const MALE_BACK_MUSCLES = [
  // Traps (larger from back)
  { id: 'traps', d: 'M84,68 L116,68 Q124,74 120,84 L80,84 Q76,74 84,68 Z' },
  // Rear Delts
  { id: 'rearDelts', d: 'M44,84 Q46,76 54,74 Q62,72 68,76 L68,94 Q60,98 52,96 Q46,94 44,88 Z' },
  { id: 'rearDelts', d: 'M156,84 Q154,76 146,74 Q138,72 132,76 L132,94 Q140,98 148,96 Q154,94 156,88 Z' },
  // Lats
  { id: 'lats', d: 'M68,88 Q66,84 72,80 L80,84 L84,84 L84,115 Q82,128 76,135 Q72,138 68,130 Q65,118 66,104 Z' },
  { id: 'lats', d: 'M132,88 Q134,84 128,80 L120,84 L116,84 L116,115 Q118,128 124,135 Q128,138 132,130 Q135,118 134,104 Z' },
  // Upper Back
  { id: 'upperBack', d: 'M86,84 L114,84 L114,115 L86,115 Z' },
  // Triceps
  { id: 'triceps', type: 'ellipse', cx: 40, cy: 118, rx: 9, ry: 22 },
  { id: 'triceps', type: 'ellipse', cx: 160, cy: 118, rx: 9, ry: 22 },
  // Lower Back
  { id: 'lowerBack', d: 'M78,130 Q82,118 100,118 Q118,118 122,130 L122,185 Q110,192 100,192 Q90,192 78,185 Z' },
  // Forearms
  { id: 'forearms', type: 'ellipse', cx: 32, cy: 172, rx: 7, ry: 22 },
  { id: 'forearms', type: 'ellipse', cx: 168, cy: 172, rx: 7, ry: 22 },
  // Glutes
  { id: 'glutes', d: 'M60,200 Q68,195 82,196 Q90,198 92,208 Q94,218 90,228 Q84,236 74,234 Q64,230 58,222 Q56,212 60,200 Z' },
  { id: 'glutes', d: 'M140,200 Q132,195 118,196 Q110,198 108,208 Q106,218 110,228 Q116,236 126,234 Q136,230 142,222 Q144,212 140,200 Z' },
  // Hamstrings
  { id: 'hamstrings', d: 'M62,228 Q68,220 80,218 L88,220 Q90,230 90,248 Q90,274 88,298 Q86,318 80,330 Q74,334 68,330 Q62,322 60,308 Q56,288 56,268 Q56,248 62,228 Z' },
  { id: 'hamstrings', d: 'M138,228 Q132,220 120,218 L112,220 Q110,230 110,248 Q110,274 112,298 Q114,318 120,330 Q126,334 132,330 Q138,322 140,308 Q144,288 144,268 Q144,248 138,228 Z' },
  // Calves
  { id: 'calves', d: 'M56,350 Q60,340 64,342 Q70,346 70,365 Q70,388 68,408 Q66,418 62,422 Q58,424 56,418 Q53,408 53,388 Q53,365 56,350 Z' },
  { id: 'calves', d: 'M144,350 Q140,340 136,342 Q130,346 130,365 Q130,388 132,408 Q134,418 138,422 Q142,424 144,418 Q147,408 147,388 Q147,365 144,350 Z' },
];

// ============================================
//  FEMALE BODY (adjusted proportions)
// ============================================
const FEMALE_FRONT_BODY = {
  head: { type: 'ellipse', cx: 100, cy: 35, rx: 18, ry: 23 },
  neck: { type: 'path', d: 'M89,56 L111,56 L113,66 Q107,70 100,70 Q93,70 87,66 Z' },
  torso: { type: 'path', d: 'M84,66 Q74,70 66,78 Q58,86 56,98 L58,126 Q56,148 54,168 Q52,188 54,198 L62,218 Q74,234 88,240 L100,242 L112,240 Q126,234 138,218 L146,198 Q148,188 146,168 Q144,148 142,126 L144,98 Q142,86 134,78 Q126,70 116,66 Z' },
  leftArm: { type: 'path', d: 'M66,78 Q54,76 48,82 C42,90 38,106 38,126 C38,146 34,164 30,182 Q26,196 24,208 Q22,220 26,226 Q32,230 36,226 C40,218 44,200 46,184 C50,166 52,148 54,130 C56,114 58,100 60,90 Z' },
  rightArm: { type: 'path', d: 'M134,78 Q146,76 152,82 C158,90 162,106 162,126 C162,146 166,164 170,182 Q174,196 176,208 Q178,220 174,226 Q168,230 164,226 C160,218 156,200 154,184 C150,166 148,148 146,130 C144,114 142,100 140,90 Z' },
  leftLeg: { type: 'path', d: 'M62,218 Q54,232 52,248 C50,268 52,290 54,310 Q56,328 56,345 C56,365 54,385 52,405 Q50,422 50,438 Q50,450 54,455 L66,458 Q72,455 72,448 Q72,434 70,420 C66,400 64,380 64,360 Q64,342 66,325 C68,305 70,285 70,265 C70,250 68,238 66,228 Z' },
  rightLeg: { type: 'path', d: 'M138,218 Q146,232 148,248 C150,268 148,290 146,310 Q144,328 144,345 C144,365 146,385 148,405 Q150,422 150,438 Q150,450 146,455 L134,458 Q128,455 128,448 Q128,434 130,420 C134,400 136,380 136,360 Q136,342 134,325 C132,305 130,285 130,265 C130,250 132,238 134,228 Z' },
};

const FEMALE_FRONT_MUSCLES = [
  // Traps (smaller on female)
  { id: 'traps', d: 'M88,66 L96,64 L100,72 L94,78 L84,76 Z' },
  { id: 'traps', d: 'M112,66 L104,64 L100,72 L106,78 L116,76 Z' },
  // Front Delts (narrower)
  { id: 'frontDelts', d: 'M50,82 Q52,75 58,73 Q66,70 72,74 L72,92 Q64,96 56,94 Q50,92 50,86 Z' },
  { id: 'frontDelts', d: 'M150,82 Q148,75 142,73 Q134,70 128,74 L128,92 Q136,96 144,94 Q150,92 150,86 Z' },
  // Chest (less pronounced, more unified)
  { id: 'chest', d: 'M74,86 Q82,82 94,84 L98,84 L98,120 Q92,124 84,122 Q78,118 74,108 Z' },
  { id: 'chest', d: 'M126,86 Q118,82 106,84 L102,84 L102,120 Q108,124 116,122 Q122,118 126,108 Z' },
  // Biceps
  { id: 'biceps', type: 'ellipse', cx: 46, cy: 116, rx: 8, ry: 20 },
  { id: 'biceps', type: 'ellipse', cx: 154, cy: 116, rx: 8, ry: 20 },
  // Abs
  { id: 'abs', d: 'M88,124 L112,124 Q116,124 116,128 L116,198 Q116,202 112,202 L88,202 Q84,202 84,198 L84,128 Q84,124 88,124 Z' },
  // Obliques
  { id: 'obliques', d: 'M74,130 L82,126 L82,190 L74,182 Z' },
  { id: 'obliques', d: 'M126,130 L118,126 L118,190 L126,182 Z' },
  // Forearms
  { id: 'forearms', type: 'ellipse', cx: 38, cy: 170, rx: 6, ry: 20 },
  { id: 'forearms', type: 'ellipse', cx: 162, cy: 170, rx: 6, ry: 20 },
  // Quads (slightly wider hips)
  { id: 'quads', d: 'M58,228 Q66,220 78,218 L86,220 Q90,230 90,248 Q90,274 88,298 Q86,318 80,330 Q74,334 66,330 Q60,322 56,308 Q52,288 52,268 Q52,248 58,228 Z' },
  { id: 'quads', d: 'M142,228 Q134,220 122,218 L114,220 Q110,230 110,248 Q110,274 112,298 Q114,318 120,330 Q126,334 134,330 Q140,322 144,308 Q148,288 148,268 Q148,248 142,228 Z' },
  // Calves
  { id: 'calves', d: 'M54,350 Q58,340 62,342 Q68,346 68,365 Q68,388 66,408 Q64,418 60,422 Q56,424 54,418 Q51,408 51,388 Q51,365 54,350 Z' },
  { id: 'calves', d: 'M146,350 Q142,340 138,342 Q132,346 132,365 Q132,388 134,408 Q136,418 140,422 Q144,424 146,418 Q149,408 149,388 Q149,365 146,350 Z' },
];

const FEMALE_BACK_MUSCLES = [
  // Traps (larger from back)
  { id: 'traps', d: 'M86,66 L114,66 Q120,72 118,80 L82,80 Q80,72 86,66 Z' },
  // Rear Delts
  { id: 'rearDelts', d: 'M50,82 Q52,75 58,73 Q66,70 72,74 L72,92 Q64,96 56,94 Q50,92 50,86 Z' },
  { id: 'rearDelts', d: 'M150,82 Q148,75 142,73 Q134,70 128,74 L128,92 Q136,96 144,94 Q150,92 150,86 Z' },
  // Lats
  { id: 'lats', d: 'M72,86 Q68,82 74,78 L82,80 L86,80 L86,112 Q84,125 78,132 Q74,134 72,128 Q68,116 70,102 Z' },
  { id: 'lats', d: 'M128,86 Q132,82 126,78 L118,80 L114,80 L114,112 Q116,125 122,132 Q126,134 128,128 Q132,116 130,102 Z' },
  // Upper Back
  { id: 'upperBack', d: 'M88,80 L112,80 L112,112 L88,112 Z' },
  // Triceps
  { id: 'triceps', type: 'ellipse', cx: 46, cy: 116, rx: 8, ry: 20 },
  { id: 'triceps', type: 'ellipse', cx: 154, cy: 116, rx: 8, ry: 20 },
  // Lower Back
  { id: 'lowerBack', d: 'M80,125 Q84,114 100,114 Q116,114 120,125 L120,185 Q110,192 100,192 Q90,192 80,185 Z' },
  // Forearms
  { id: 'forearms', type: 'ellipse', cx: 38, cy: 170, rx: 6, ry: 20 },
  { id: 'forearms', type: 'ellipse', cx: 162, cy: 170, rx: 6, ry: 20 },
  // Glutes (wider on female)
  { id: 'glutes', d: 'M56,200 Q66,194 80,196 Q90,198 92,210 Q94,220 90,232 Q84,240 72,238 Q62,234 56,224 Q52,214 56,200 Z' },
  { id: 'glutes', d: 'M144,200 Q134,194 120,196 Q110,198 108,210 Q106,220 110,232 Q116,240 128,238 Q138,234 144,224 Q148,214 144,200 Z' },
  // Hamstrings
  { id: 'hamstrings', d: 'M58,228 Q66,220 78,218 L86,220 Q90,230 90,248 Q90,274 88,298 Q86,318 80,330 Q74,334 66,330 Q60,322 56,308 Q52,288 52,268 Q52,248 58,228 Z' },
  { id: 'hamstrings', d: 'M142,228 Q134,220 122,218 L114,220 Q110,230 110,248 Q110,274 112,298 Q114,318 120,330 Q126,334 134,330 Q140,322 144,308 Q148,288 148,268 Q148,248 142,228 Z' },
  // Calves
  { id: 'calves', d: 'M54,350 Q58,340 62,342 Q68,346 68,365 Q68,388 66,408 Q64,418 60,422 Q56,424 54,418 Q51,408 51,388 Q51,365 54,350 Z' },
  { id: 'calves', d: 'M146,350 Q142,340 138,342 Q132,346 132,365 Q132,388 134,408 Q136,418 140,422 Q144,424 146,418 Q149,408 149,388 Q149,365 146,350 Z' },
];

const DEFAULT_COLOR = 'rgba(124, 58, 237, 0.3)';

// Render a single body part (background silhouette)
const BodyPart = ({ shape }) => {
  if (shape.type === 'ellipse') {
    return <Ellipse cx={shape.cx} cy={shape.cy} rx={shape.rx} ry={shape.ry} fill={BODY_COLOR} />;
  }
  return <Path d={shape.d} fill={BODY_COLOR} />;
};

const BodyMap = ({
  view = 'front',
  gender = 'male',
  scores = {},
  onMusclePress,
  selectedMuscle,
  containerWidth,
}) => {
  const targetWidth = containerWidth || Math.min(SCREEN_WIDTH - 40, 340);
  const scale = targetWidth / 200;
  const containerHeight = 460 * scale;

  // Glow animation for recently trained muscles
  const glowAnim = useRef(new Animated.Value(0.3)).current;
  useEffect(() => {
    Animated.loop(Animated.sequence([
      Animated.timing(glowAnim, { toValue: 0.7, duration: 1200, useNativeDriver: false }),
      Animated.timing(glowAnim, { toValue: 0.3, duration: 1200, useNativeDriver: false }),
    ])).start();
  }, []);

  // Select body data based on gender and view
  const bodyParts = gender === 'female' ? FEMALE_FRONT_BODY : MALE_FRONT_BODY;
  const muscles = gender === 'female'
    ? (view === 'front' ? FEMALE_FRONT_MUSCLES : FEMALE_BACK_MUSCLES)
    : (view === 'front' ? MALE_FRONT_MUSCLES : MALE_BACK_MUSCLES);

  const getColor = (muscleId) => scores[muscleId]?.color || DEFAULT_COLOR;
  const isRecent = (muscleId) => scores[muscleId]?.recentlyTrained || false;
  const isSelected = (muscleId) => selectedMuscle === muscleId;

  return (
    <View style={[styles.container, { width: targetWidth, height: containerHeight }]}>
      <Svg
        width={targetWidth}
        height={containerHeight}
        viewBox="0 0 200 460"
        preserveAspectRatio="xMidYMid meet"
      >
        {/* Body silhouette (background) */}
        <G opacity={1}>
          {Object.values(bodyParts).map((shape, i) => (
            <BodyPart key={`body-${i}`} shape={shape} />
          ))}
        </G>

        {/* Muscle groups (foreground, colored) */}
        {muscles.map((muscle, i) => {
          const color = getColor(muscle.id);
          const selected = isSelected(muscle.id);
          const strokeColor = selected ? '#FFFFFF' : 'rgba(0,0,0,0.15)';
          const strokeWidth = selected ? 1.5 : 0.3;

          if (muscle.type === 'ellipse') {
            return (
              <Ellipse
                key={`muscle-${i}`}
                cx={muscle.cx}
                cy={muscle.cy}
                rx={muscle.rx}
                ry={muscle.ry}
                fill={color}
                stroke={strokeColor}
                strokeWidth={strokeWidth}
                onPress={() => onMusclePress?.(muscle.id)}
              />
            );
          }

          return (
            <Path
              key={`muscle-${i}`}
              d={muscle.d}
              fill={color}
              stroke={strokeColor}
              strokeWidth={strokeWidth}
              onPress={() => onMusclePress?.(muscle.id)}
            />
          );
        })}
      </Svg>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignSelf: 'center',
  },
});

export default BodyMap;

import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Platform,
  KeyboardAvoidingView,
  Alert,
  Animated as RNAnimated,
  PanResponder,
  Dimensions,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { hapticFeedback } from '../utils/haptics';
import { suggestMuscles, bodyPartsForMuscles, constrainMuscles } from '../data/muscleSuggest';
import MuscleSelector from './MuscleSelector';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const BODY_PARTS = [
  'Arms',
  'Back',
  'Chest',
  'Core',
  'Full Body',
  'Legs',
  'Shoulders',
];

const CATEGORIES = [
  'Strength',
  'Cardio',
  'Bodyweight',
  'Olympic',
  'Plyometric',
];

const EQUIPMENT_TYPES = [
  'Barbell',
  'Dumbbell',
  'Cable',
  'Machine',
  'Smith Machine',
  'Body Weight',
  'Kettlebell',
  'Medicine Ball',
  'Box',
  'Jump Rope',
  'Ab Wheel',
];

const PICKER_CONFIG = {
  bodyPart: { title: 'Select Body Part', items: BODY_PARTS, icon: 'fitness-center', accent: '#6366F1' },
  category: { title: 'Select Category', items: CATEGORIES, icon: 'category', accent: '#8B5CF6' },
  equipment: { title: 'Select Equipment', items: EQUIPMENT_TYPES, icon: 'sports-gymnastics', accent: '#10B981' },
};

const EMPTY_MUSCLES = { primary: [], secondary: [] };

const AddExerciseModal = ({ visible, onClose, onAdd, initialName = '' }) => {
  const { theme, isDark } = useTheme();
  const [exerciseName, setExerciseName] = useState('');
  // An exercise can span regions (a row is Back + Arms), so this is a set
  const [selectedBodyParts, setSelectedBodyParts] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedEquipment, setSelectedEquipment] = useState('');
  const [muscles, setMuscles] = useState(EMPTY_MUSCLES);
  // Which rule produced the current suggestion (drives the "filled in" banner)
  const [suggestedFrom, setSuggestedFrom] = useState(null);
  // Once the user edits the chips, stop overwriting their choice
  const touchedMusclesRef = useRef(false);

  // Seed the name when opened from a search that found nothing ("Create ...").
  useEffect(() => {
    if (visible) setExerciseName(initialName || '');
  }, [visible, initialName]);

  // Suggest muscles from the name + equipment as the user types, and select the
  // body parts those muscles live in so the two can never contradict each other.
  // Only ever overwrites a suggestion, never a hand-picked set.
  useEffect(() => {
    if (!visible || touchedMusclesRef.current) return;
    const guess = suggestMuscles(exerciseName, selectedEquipment, '');
    if (guess.matched) {
      setMuscles({ primary: guess.primary, secondary: guess.secondary });
      setSelectedBodyParts(bodyPartsForMuscles([...guess.primary, ...guess.secondary]));
      setSuggestedFrom(guess.matched);
    } else {
      setMuscles(EMPTY_MUSCLES);
      setSuggestedFrom(null);
    }
  }, [visible, exerciseName, selectedEquipment]);

  const handleMusclesChange = (next) => {
    touchedMusclesRef.current = true;
    setSuggestedFrom(null);
    setMuscles(next);
  };

  // Toggling a body part off must take its muscles with it, otherwise you could
  // save an "Arms" exercise that trains glutes.
  const toggleBodyPart = (part) => {
    hapticFeedback.light();
    touchedMusclesRef.current = true;
    setSuggestedFrom(null);
    const next = selectedBodyParts.includes(part)
      ? selectedBodyParts.filter((p) => p !== part)
      : [...selectedBodyParts, part];
    setSelectedBodyParts(next);
    // Deselecting a region takes its muscles with it (no Arms + Glutes)
    setMuscles((current) => constrainMuscles(current, next));
  };

  // Kept for storage/filter compatibility: those compare bodyPart with ===
  const primaryBodyPart = selectedBodyParts.length === 1
    ? selectedBodyParts[0]
    : (selectedBodyParts.length > 1 ? 'Full Body' : '');

  // Layered picker state (Add-Food popup style)
  const [activePicker, setActivePicker] = useState(null);
  const [pickerMounted, setPickerMounted] = useState(false);
  const pickerBackdropAnim = useRef(new RNAnimated.Value(0)).current;
  const pickerSlideAnim = useRef(new RNAnimated.Value(1)).current;
  const pickerDragY = useRef(new RNAnimated.Value(0)).current;

  const pickerPanResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => false,
    onMoveShouldSetPanResponder: (_, gs) =>
      gs.dy > 8 && Math.abs(gs.dy) > Math.abs(gs.dx) * 1.2,
    onPanResponderGrant: () => {
      pickerDragY.setValue(0);
    },
    onPanResponderMove: RNAnimated.event(
      [null, { dy: pickerDragY }],
      { useNativeDriver: false }
    ),
    onPanResponderRelease: (_, gs) => {
      if (gs.dy > 100 || gs.vy > 0.5) {
        RNAnimated.parallel([
          RNAnimated.timing(pickerDragY, { toValue: SCREEN_HEIGHT, duration: 250, useNativeDriver: true }),
          RNAnimated.timing(pickerBackdropAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
        ]).start(() => {
          setActivePicker(null);
          setPickerMounted(false);
          pickerDragY.setValue(0);
          pickerSlideAnim.setValue(1);
        });
      } else {
        RNAnimated.spring(pickerDragY, { toValue: 0, damping: 25, stiffness: 300, useNativeDriver: true }).start();
      }
    },
  }), []);

  const openPicker = (type) => {
    hapticFeedback.light();
    pickerDragY.setValue(0);
    setPickerMounted(true);
    setActivePicker(type);
    requestAnimationFrame(() => {
      RNAnimated.parallel([
        RNAnimated.timing(pickerBackdropAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
        RNAnimated.spring(pickerSlideAnim, { toValue: 0, damping: 28, stiffness: 300, mass: 0.8, useNativeDriver: true }),
      ]).start();
    });
  };

  const closePicker = (onClosed) => {
    RNAnimated.parallel([
      RNAnimated.timing(pickerBackdropAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
      RNAnimated.timing(pickerSlideAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
    ]).start(() => {
      setActivePicker(null);
      setPickerMounted(false);
      pickerDragY.setValue(0);
      pickerSlideAnim.setValue(1);
      if (typeof onClosed === 'function') onClosed();
    });
  };

  const handleAdd = () => {
    if (!exerciseName.trim()) {
      Alert.alert('Missing Information', 'Please enter an exercise name');
      return;
    }
    if (selectedBodyParts.length === 0) {
      Alert.alert('Missing Information', 'Please select at least one body part');
      return;
    }
    if (!selectedCategory) {
      Alert.alert('Missing Information', 'Please select a category');
      return;
    }
    if (!selectedEquipment) {
      Alert.alert('Missing Information', 'Please select equipment type');
      return;
    }
    if (muscles.primary.length === 0) {
      Alert.alert(
        'Pick a primary muscle',
        'Physique needs to know which muscle this exercise trains, or it will guess from the body part and light up the wrong one.'
      );
      return;
    }

    const newExercise = {
      name: exerciseName.trim(),
      // Single string for the existing filters (they compare with ===); the
      // full set rides alongside it
      bodyPart: primaryBodyPart,
      bodyParts: selectedBodyParts,
      category: selectedCategory,
      equipment: selectedEquipment,
      target: '',
      // The whole point: Physique scores these exactly, no name guessing
      muscles: { primary: muscles.primary, secondary: muscles.secondary },
    };

    onAdd(newExercise);
    resetForm();
  };

  const resetForm = () => {
    setExerciseName('');
    setSelectedBodyParts([]);
    setSelectedCategory('');
    setSelectedEquipment('');
    setMuscles(EMPTY_MUSCLES);
    setSuggestedFrom(null);
    touchedMusclesRef.current = false;
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  // Body part is chosen inline (multi-select) because it decides which muscles
  // the picker below may offer
  const pickerFieldConfig = [
    { key: 'category', label: 'Category', value: selectedCategory, placeholder: 'Select category', ...PICKER_CONFIG.category, setValue: setSelectedCategory },
    { key: 'equipment', label: 'Equipment', value: selectedEquipment, placeholder: 'Select equipment', ...PICKER_CONFIG.equipment, setValue: setSelectedEquipment },
  ];

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={[styles.container, { backgroundColor: theme.background }]}
      >
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: theme.border }]}>
          <TouchableOpacity
            onPress={() => { hapticFeedback.light(); handleClose(); }}
            style={styles.cancelButton}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Text style={[styles.cancelText, { color: theme.primary }]}>Cancel</Text>
          </TouchableOpacity>
          <Text style={[styles.title, { color: theme.text }]}>Add Exercise</Text>
          <TouchableOpacity
            onPress={() => { hapticFeedback.light(); handleAdd(); }}
            style={styles.addButton}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Text style={[styles.addText, { color: theme.primary }]}>Add</Text>
          </TouchableOpacity>
        </View>

        {/* Form */}
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          {/* Exercise Name */}
          <View style={styles.section}>
            <Text style={[styles.label, { color: theme.text }]}>Exercise Name</Text>
            <TextInput
              style={[styles.input, {
                backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#F9FAFB',
                color: theme.text,
                borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
              }]}
              placeholder="e.g., Cable Chest Fly"
              placeholderTextColor={theme.textSecondary}
              value={exerciseName}
              onChangeText={setExerciseName}
              autoCapitalize="words"
            />
          </View>

          {/* Body parts — multi-select, and they gate the muscle chips below */}
          <View style={styles.section}>
            <Text style={[styles.label, { color: theme.text }]}>Body Part</Text>
            <Text style={[styles.sublabel, { color: theme.textSecondary }]}>
              Pick every region this exercise trains. A row is Back and Arms.
            </Text>
            <View style={styles.bodyPartRow}>
              {BODY_PARTS.map((part) => {
                const active = selectedBodyParts.includes(part);
                return (
                  <TouchableOpacity
                    key={part}
                    onPress={() => toggleBodyPart(part)}
                    activeOpacity={0.8}
                    style={[styles.bodyPartChip, {
                      backgroundColor: active ? `${PICKER_CONFIG.bodyPart.accent}22` : (isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.025)'),
                      borderColor: active ? PICKER_CONFIG.bodyPart.accent : (isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'),
                    }]}
                  >
                    {active && (
                      <MaterialIcons name="check" size={15} color={PICKER_CONFIG.bodyPart.accent} />
                    )}
                    <Text style={[styles.bodyPartChipText, {
                      color: active ? PICKER_CONFIG.bodyPart.accent : theme.text,
                      fontWeight: active ? '700' : '500',
                    }]}>
                      {part}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Picker fields */}
          {pickerFieldConfig.map((field) => (
            <View key={field.key} style={styles.section}>
              <Text style={[styles.label, { color: theme.text }]}>{field.label}</Text>
              <TouchableOpacity
                style={[styles.pickerField, {
                  backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#F9FAFB',
                  borderColor: field.value
                    ? field.accent + '55'
                    : (isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'),
                }]}
                onPress={() => openPicker(field.key)}
                activeOpacity={0.7}
              >
                <View style={[styles.pickerFieldIcon, { backgroundColor: field.accent + (field.value ? '22' : '14') }]}>
                  <MaterialIcons name={field.icon} size={20} color={field.accent} />
                </View>
                <Text style={[
                  styles.pickerFieldText,
                  { color: field.value ? theme.text : theme.textSecondary },
                ]}>
                  {field.value || field.placeholder}
                </Text>
                <MaterialIcons name="chevron-right" size={22} color={theme.textSecondary} />
              </TouchableOpacity>
            </View>
          ))}

          {/* Muscles — what Physique actually scores */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: theme.text }]}>Muscles Trained</Text>
            <Text style={[styles.sublabel, { color: theme.textSecondary }]}>
              This is what lights up on your Physique after you train.
            </Text>
            <MuscleSelector
              muscles={muscles}
              onChange={handleMusclesChange}
              suggestedFrom={suggestedFrom}
              bodyParts={selectedBodyParts}
            />
          </View>

          <View style={[styles.infoBox, {
            backgroundColor: isDark ? 'rgba(99,102,241,0.08)' : 'rgba(99,102,241,0.06)',
            borderColor: isDark ? 'rgba(99,102,241,0.18)' : 'rgba(99,102,241,0.16)',
          }]}>
            <MaterialIcons name="info-outline" size={20} color="#6366F1" />
            <Text style={[styles.infoText, { color: theme.textSecondary }]}>
              Your custom exercise will be saved locally and appear alongside default exercises
            </Text>
          </View>
        </ScrollView>

        {/* Layered Picker Popup (Add Food style) */}
        {pickerMounted && activePicker && (() => {
          const cfg = PICKER_CONFIG[activePicker];
          const field = pickerFieldConfig.find(f => f.key === activePicker);
          if (!cfg || !field) return null;

          return (
            <View style={styles.pickerOverlayAbsolute} pointerEvents={activePicker ? 'auto' : 'none'}>
              <RNAnimated.View
                style={[styles.pickerBackdrop, {
                  opacity: RNAnimated.multiply(
                    pickerBackdropAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 0.45] }),
                    pickerDragY.interpolate({ inputRange: [0, 300], outputRange: [1, 0.2], extrapolate: 'clamp' }),
                  ),
                }]}
              >
                <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={() => closePicker()} />
              </RNAnimated.View>

              <View style={styles.pickerKeyboardWrap} pointerEvents="box-none">
                <RNAnimated.View
                  style={[
                    styles.pickerSheet,
                    {
                      backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF',
                      transform: [{
                        translateY: RNAnimated.add(
                          pickerSlideAnim.interpolate({ inputRange: [0, 1], outputRange: [0, SCREEN_HEIGHT] }),
                          pickerDragY.interpolate({ inputRange: [-1, 0, SCREEN_HEIGHT], outputRange: [0, 0, SCREEN_HEIGHT], extrapolate: 'clamp' }),
                        ),
                      }],
                    },
                  ]}
                >
                  <View {...pickerPanResponder.panHandlers}>
                    <View style={[styles.pickerHandle, { backgroundColor: isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.12)' }]} />
                    <View style={styles.pickerHeader}>
                      <Text style={[styles.pickerTitle, { color: theme.text }]}>{cfg.title}</Text>
                      <TouchableOpacity
                        style={[styles.pickerCloseBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#F3F4F6' }]}
                        onPress={() => closePicker()}
                      >
                        <MaterialIcons name="close" size={18} color={theme.textSecondary} />
                      </TouchableOpacity>
                    </View>
                  </View>

                  <ScrollView showsVerticalScrollIndicator={false} style={styles.pickerScroll} bounces={false}>
                    <View style={styles.pickerList}>
                      {cfg.items.map((item) => {
                        const isSelected = item === field.value;
                        return (
                          <TouchableOpacity
                            key={item}
                            activeOpacity={0.7}
                            onPress={() => {
                              hapticFeedback.light();
                              field.setValue(item);
                              closePicker();
                            }}
                            style={[
                              styles.pickerCard,
                              {
                                backgroundColor: isSelected
                                  ? cfg.accent + '14'
                                  : (isDark ? 'rgba(255,255,255,0.05)' : '#F9FAFB'),
                                borderColor: isSelected
                                  ? cfg.accent + '55'
                                  : (isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)'),
                              },
                            ]}
                          >
                            <View style={[styles.pickerCardIcon, { backgroundColor: cfg.accent + (isSelected ? '22' : '14') }]}>
                              <MaterialIcons name={cfg.icon} size={22} color={cfg.accent} />
                            </View>
                            <Text style={[
                              styles.pickerCardText,
                              { color: isSelected ? cfg.accent : theme.text },
                            ]} numberOfLines={1}>
                              {item}
                            </Text>
                            {isSelected && (
                              <MaterialIcons name="check-circle" size={22} color={cfg.accent} />
                            )}
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </ScrollView>
                </RNAnimated.View>
              </View>
            </View>
          );
        })()}
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 60 : 20,
    paddingBottom: 16,
    borderBottomWidth: 0.5,
  },
  cancelButton: {
    padding: 4,
  },
  cancelText: {
    fontSize: 17,
  },
  title: {
    fontSize: 17,
    fontWeight: '600',
  },
  addButton: {
    padding: 4,
  },
  addText: {
    fontSize: 17,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
    padding: 20,
  },
  section: {
    marginBottom: 22,
  },
  label: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 8,
  },
  sublabel: {
    fontSize: 13,
    fontWeight: '500',
    marginTop: -4,
    marginBottom: 12,
  },
  bodyPartRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  bodyPartChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  bodyPartChipText: { fontSize: 14 },
  input: {
    height: 52,
    borderRadius: 14,
    paddingHorizontal: 16,
    fontSize: 16,
    borderWidth: 1,
  },
  pickerField: {
    height: 64,
    borderRadius: 14,
    paddingHorizontal: 12,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  pickerFieldIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickerFieldText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 14,
    borderRadius: 14,
    marginTop: 8,
    gap: 12,
    borderWidth: 1,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },

  // Layered Picker Popup styles
  pickerOverlayAbsolute: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 100,
  },
  pickerBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000000',
  },
  pickerKeyboardWrap: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  pickerSheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '85%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 20,
  },
  pickerHandle: {
    width: 40,
    height: 5,
    borderRadius: 3,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 6,
  },
  pickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  pickerTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  pickerCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pickerScroll: {
    paddingHorizontal: 20,
  },
  pickerList: {
    gap: 10,
    paddingBottom: 20,
  },
  pickerCard: {
    borderRadius: 16,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderWidth: 1,
  },
  pickerCardIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickerCardText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
  },
});

export default AddExerciseModal;

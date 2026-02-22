import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  StyleSheet,
  Animated,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { hapticFeedback } from '../utils/haptics';
import { CATEGORIES, addVision } from '../services/visionService';
import notificationService from '../services/notificationService';

const STEPS = [
  {
    timeframe: '10yr',
    question: 'Where do you see yourself in 10 years?',
    placeholder: 'e.g. Running my own business, leading a ministry...',
  },
  {
    timeframe: '5yr',
    question: 'How about in 5 years?',
    placeholder: 'e.g. Finished my degree, bought a home...',
  },
  {
    timeframe: '1yr',
    question: 'And in 1 year?',
    placeholder: 'e.g. Got promoted, started a new habit...',
  },
];

const VisionSetupModal = ({ visible, onClose, onComplete }) => {
  const { theme, isDark } = useTheme();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState(['', '', '']);
  const [categories, setCategories] = useState(['other', 'other', 'other']);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      setStep(0);
      setAnswers(['', '', '']);
      setCategories(['other', 'other', 'other']);
      fadeAnim.setValue(1);
      slideAnim.setValue(0);
    }
  }, [visible]);

  const animateTransition = (next) => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 0, duration: 150, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: -30, duration: 150, useNativeDriver: true }),
    ]).start(() => {
      setStep(next);
      slideAnim.setValue(30);
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
      ]).start();
    });
  };

  const handleNext = () => {
    hapticFeedback.light();
    if (step < STEPS.length - 1) {
      animateTransition(step + 1);
    } else {
      handleFinish();
    }
  };

  const handleSkip = () => {
    hapticFeedback.light();
    if (step < STEPS.length - 1) {
      animateTransition(step + 1);
    } else {
      handleFinish();
    }
  };

  const handleFinish = async () => {
    hapticFeedback.success();
    const created = [];
    for (let i = 0; i < STEPS.length; i++) {
      const text = answers[i]?.trim();
      if (text) {
        const result = await addVision({
          title: text,
          timeframe: STEPS[i].timeframe,
          category: categories[i],
        });
        created.push(result.vision);
      }
    }
    if (created.length > 0) {
      notificationService.scheduleVisionCheckIn().catch(() => {});
    }
    onComplete?.(created);
    onClose();
  };

  const updateAnswer = (text) => {
    const copy = [...answers];
    copy[step] = text;
    setAnswers(copy);
  };

  const updateCategory = (catId) => {
    const copy = [...categories];
    copy[step] = catId;
    setCategories(copy);
  };

  const currentStep = STEPS[step];
  const hasText = answers[step]?.trim().length > 0;
  const isLast = step === STEPS.length - 1;

  return (
    <Modal
      visible={visible}
      transparent={false}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <View style={[styles.container, { backgroundColor: isDark ? '#000' : '#f5f5f5' }]}>
        <SafeAreaView style={{ flex: 1 }}>
          <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          >
            {/* Header */}
            <View style={styles.header}>
              <TouchableOpacity
                onPress={onClose}
                hitSlop={{ top: 16, bottom: 16, left: 16, right: 16 }}
                style={[styles.closeBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)' }]}
              >
                <MaterialIcons name="close" size={22} color={isDark ? '#fff' : '#333'} />
              </TouchableOpacity>
              <Text style={[styles.headerTitle, { color: isDark ? '#fff' : '#111' }]}>
                Set Your Vision
              </Text>
              <View style={{ width: 44 }} />
            </View>

            {/* Progress dots */}
            <View style={styles.dots}>
              {STEPS.map((_, i) => (
                <View
                  key={i}
                  style={[
                    styles.dot,
                    {
                      backgroundColor:
                        i <= step ? theme.primary : isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)',
                      width: i === step ? 24 : 8,
                    },
                  ]}
                />
              ))}
            </View>

            <ScrollView
              contentContainerStyle={styles.content}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <Animated.View
                style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}
              >
                {/* Scripture quote on first step */}
                {step === 0 && (
                  <View style={[styles.verseCard, { backgroundColor: isDark ? 'rgba(99,102,241,0.12)' : 'rgba(99,102,241,0.08)' }]}>
                    <Text style={[styles.verseText, { color: isDark ? 'rgba(255,255,255,0.8)' : 'rgba(0,0,0,0.6)' }]}>
                      "Where there is no vision, the people perish."
                    </Text>
                    <Text style={[styles.verseRef, { color: theme.primary }]}>
                      Proverbs 29:18 KJV
                    </Text>
                  </View>
                )}

                {/* Question */}
                <Text style={[styles.question, { color: isDark ? '#fff' : '#111' }]}>
                  {currentStep.question}
                </Text>

                {/* Text input */}
                <TextInput
                  style={[
                    styles.input,
                    {
                      color: isDark ? '#fff' : '#111',
                      backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                      borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
                    },
                  ]}
                  placeholder={currentStep.placeholder}
                  placeholderTextColor={isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)'}
                  value={answers[step]}
                  onChangeText={updateAnswer}
                  multiline
                  maxLength={200}
                  textAlignVertical="top"
                  autoFocus={step === 0}
                />

                {/* Category picker */}
                {hasText && (
                  <View style={styles.categorySection}>
                    <Text style={[styles.categoryLabel, { color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.4)' }]}>
                      CATEGORY (optional)
                    </Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                      <View style={styles.categoryRow}>
                        {CATEGORIES.map((cat) => {
                          const selected = categories[step] === cat.id;
                          return (
                            <TouchableOpacity
                              key={cat.id}
                              onPress={() => {
                                hapticFeedback.light();
                                updateCategory(cat.id);
                              }}
                              style={[
                                styles.categoryChip,
                                {
                                  backgroundColor: selected
                                    ? `${theme.primary}20`
                                    : isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                                  borderColor: selected ? theme.primary : 'transparent',
                                },
                              ]}
                            >
                              <MaterialIcons
                                name={cat.icon}
                                size={16}
                                color={selected ? theme.primary : isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.4)'}
                              />
                              <Text
                                style={[
                                  styles.categoryChipText,
                                  { color: selected ? theme.primary : isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.5)' },
                                ]}
                              >
                                {cat.label}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    </ScrollView>
                  </View>
                )}
              </Animated.View>
            </ScrollView>

            {/* Bottom buttons */}
            <View style={styles.bottomBar}>
              <TouchableOpacity onPress={handleSkip} style={styles.skipBtn}>
                <Text style={[styles.skipText, { color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.4)' }]}>
                  {isLast ? 'Finish' : 'Skip'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleNext}
                disabled={!hasText}
                style={[
                  styles.nextBtn,
                  {
                    backgroundColor: hasText ? theme.primary : isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
                  },
                ]}
              >
                <Text style={[styles.nextText, { color: hasText ? '#fff' : isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)' }]}>
                  {isLast ? 'Done' : 'Next'}
                </Text>
                <MaterialIcons
                  name={isLast ? 'check' : 'arrow-forward'}
                  size={20}
                  color={hasText ? '#fff' : isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)'}
                />
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </View>
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
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 12,
  },
  closeBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    paddingBottom: 20,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
  content: {
    paddingHorizontal: 24,
    paddingBottom: 40,
    flexGrow: 1,
  },
  verseCard: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 28,
  },
  verseText: {
    fontSize: 16,
    fontStyle: 'italic',
    lineHeight: 24,
    marginBottom: 8,
  },
  verseRef: {
    fontSize: 13,
    fontWeight: '600',
  },
  question: {
    fontSize: 26,
    fontWeight: '700',
    lineHeight: 34,
    marginBottom: 24,
  },
  input: {
    minHeight: 100,
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    fontSize: 17,
    lineHeight: 24,
  },
  categorySection: {
    marginTop: 20,
  },
  categoryLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
    marginBottom: 10,
  },
  categoryRow: {
    flexDirection: 'row',
    gap: 8,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1.5,
    gap: 6,
  },
  categoryChipText: {
    fontSize: 13,
    fontWeight: '600',
  },
  bottomBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  skipBtn: {
    paddingVertical: 14,
    paddingHorizontal: 20,
  },
  skipText: {
    fontSize: 16,
    fontWeight: '500',
  },
  nextBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 28,
    gap: 8,
  },
  nextText: {
    fontSize: 16,
    fontWeight: '600',
  },
});

export default VisionSetupModal;

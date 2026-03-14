import React, { useState, useCallback, useRef, useImperativeHandle, forwardRef, useEffect } from 'react';
import {
  Animated,
  Dimensions,
  Keyboard,
  Modal,
  PanResponder,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { hapticFeedback } from '../utils/haptics';
import feedbackService from '../services/feedbackService';

const IMPROVEMENT_TAGS = [
  'Bible Reading',
  'Workouts',
  'Tasks & Habits',
  'Design',
  'Speed',
  'Notifications',
];

const SCREEN_HEIGHT = Dimensions.get('window').height;
const BOTTOM_INSET = SCREEN_HEIGHT >= 812 ? 34 : 0;
const DISMISS_THRESHOLD = 120;

const FeedbackModal = forwardRef((_, ref) => {
  const { theme, isDark } = useTheme();

  const [visible, setVisible] = useState(false);
  const [rating, setRating] = useState(0);
  const [selectedTags, setSelectedTags] = useState([]);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const submittingLock = useRef(false);

  const scaleAnims = useRef([1, 2, 3, 4, 5].map(() => new Animated.Value(1))).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const sheetTranslateY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const keyboardOffset = useRef(new Animated.Value(0)).current;
  const dragY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const onShow = (e) => {
      Animated.timing(keyboardOffset, {
        toValue: -e.endCoordinates.height,
        duration: Platform.OS === 'ios' ? e.duration : 250,
        useNativeDriver: true,
      }).start();
    };
    const onHide = (e) => {
      Animated.timing(keyboardOffset, {
        toValue: 0,
        duration: Platform.OS === 'ios' ? e.duration : 250,
        useNativeDriver: true,
      }).start();
    };

    const sub1 = Keyboard.addListener(showEvent, onShow);
    const sub2 = Keyboard.addListener(hideEvent, onHide);
    return () => { sub1.remove(); sub2.remove(); };
  }, [keyboardOffset]);

  const animateIn = useCallback(() => {
    dragY.setValue(0);
    Animated.parallel([
      Animated.timing(overlayOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
      Animated.spring(sheetTranslateY, { toValue: 0, tension: 65, friction: 11, useNativeDriver: true }),
    ]).start();
  }, [overlayOpacity, sheetTranslateY, dragY]);

  const animateOut = useCallback((cb) => {
    Animated.parallel([
      Animated.timing(overlayOpacity, { toValue: 0, duration: 200, useNativeDriver: true }),
      Animated.timing(sheetTranslateY, { toValue: SCREEN_HEIGHT, duration: 250, useNativeDriver: true }),
    ]).start(() => cb?.());
  }, [overlayOpacity, sheetTranslateY]);

  useEffect(() => {
    if (visible) animateIn();
  }, [visible, animateIn]);

  useImperativeHandle(ref, () => ({
    show: () => {
      setRating(0);
      setSelectedTags([]);
      setComment('');
      setSubmitted(false);
      setSubmitting(false);
      submittingLock.current = false;
      overlayOpacity.setValue(0);
      sheetTranslateY.setValue(SCREEN_HEIGHT);
      keyboardOffset.setValue(0);
      dragY.setValue(0);
      setVisible(true);
    },
    hide: () => {
      animateOut(() => setVisible(false));
    },
  }));

  const handleStarPress = useCallback((star) => {
    hapticFeedback.selection();
    setRating(star);
    Animated.sequence([
      Animated.timing(scaleAnims[star - 1], { toValue: 1.35, duration: 120, useNativeDriver: true }),
      Animated.timing(scaleAnims[star - 1], { toValue: 1, duration: 120, useNativeDriver: true }),
    ]).start();
  }, [scaleAnims]);

  const toggleTag = useCallback((tag) => {
    hapticFeedback.selection();
    setSelectedTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  }, []);

  const handleSubmit = useCallback(async () => {
    if (submittingLock.current || rating === 0) return;
    submittingLock.current = true;
    setSubmitting(true);

    try {
      const result = await feedbackService.submitFeedback({
        rating,
        improvements: selectedTags,
        comment: comment.trim(),
      });

      if (!result.success) {
        hapticFeedback.error();
        return;
      }

      await feedbackService.markPromptShown();
      hapticFeedback.success();
      Keyboard.dismiss();
      setSubmitted(true);
      setTimeout(() => animateOut(() => setVisible(false)), 1800);
    } catch {
      hapticFeedback.error();
    } finally {
      setSubmitting(false);
      submittingLock.current = false;
    }
  }, [rating, selectedTags, comment, animateOut]);

  const handleDismiss = useCallback(() => {
    hapticFeedback.buttonPress();
    Keyboard.dismiss();
    feedbackService.markPromptShown();
    animateOut(() => setVisible(false));
  }, [animateOut]);

  const dismissRef = useRef(null);
  dismissRef.current = handleDismiss;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, { dy, dx }) =>
        !submittingLock.current && dy > 8 && Math.abs(dy) > Math.abs(dx) * 1.2,
      onPanResponderGrant: () => { dragY.setValue(0); },
      onPanResponderMove: Animated.event(
        [null, { dy: dragY }],
        { useNativeDriver: false }
      ),
      onPanResponderRelease: (_, { dy, vy }) => {
        if (dy > DISMISS_THRESHOLD || vy > 0.5) {
          dismissRef.current?.();
        } else {
          Animated.spring(dragY, {
            toValue: 0,
            tension: 65,
            friction: 11,
            useNativeDriver: true,
          }).start();
        }
      },
    })
  ).current;

  const bg = isDark ? '#1C1C1E' : '#FFFFFF';
  const cardBg = isDark ? '#2C2C2E' : '#F2F2F7';
  const textColor = isDark ? '#FFFFFF' : '#000000';
  const textSecondary = isDark ? '#AEAEB2' : '#8E8E93';
  const accentColor = '#FF9500';

  if (!visible) return null;

  if (submitted) {
    return (
      <Modal visible transparent animationType="none" statusBarTranslucent>
        <Animated.View style={[styles.overlay, { opacity: overlayOpacity }]}>
          <Animated.View style={[styles.sheetWrap, { transform: [{ translateY: sheetTranslateY }] }]}>
            <View style={[styles.sheet, { backgroundColor: bg, paddingBottom: BOTTOM_INSET + 20 }]}>
              <View style={styles.thanksContainer}>
                <MaterialIcons name="favorite" size={48} color={accentColor} />
                <Text style={[styles.thanksTitle, { color: textColor }]}>Thank you</Text>
                <Text style={[styles.thanksSubtitle, { color: textSecondary }]}>
                  Your feedback helps us improve Biblely for everyone.
                </Text>
              </View>
            </View>
          </Animated.View>
        </Animated.View>
      </Modal>
    );
  }

  return (
    <Modal visible transparent animationType="none" statusBarTranslucent>
      <TouchableWithoutFeedback onPress={handleDismiss}>
        <Animated.View style={[styles.overlay, { opacity: overlayOpacity }]}>
          <Animated.View
            {...panResponder.panHandlers}
            style={[styles.sheetWrap, {
              transform: [
                { translateY: sheetTranslateY },
                { translateY: keyboardOffset },
                { translateY: dragY.interpolate({
                  inputRange: [-1, 0, 400],
                  outputRange: [0, 0, 400],
                  extrapolate: 'clamp',
                })},
              ],
            }]}
            onStartShouldSetResponder={() => true}
          >
              <View style={[styles.sheet, { backgroundColor: bg, paddingBottom: BOTTOM_INSET + 20 }]}>
                <View style={styles.dragZone}>
                  <View style={styles.handle} />
                  <MaterialIcons name="chat-bubble" size={28} color={accentColor} />
                  <Text style={[styles.title, { color: textColor }]}>Rate your experience</Text>
                </View>

                <View style={styles.starsRow}>
                  {[1, 2, 3, 4, 5].map((star) => {
                    const filled = star <= rating;
                    const groupBg = rating > 0 && star <= rating
                      ? (rating <= 2 ? '#FF3B30' : rating <= 3 ? accentColor : '#34C759')
                      : 'transparent';

                    return (
                      <TouchableOpacity key={star} onPress={() => handleStarPress(star)} activeOpacity={0.7}>
                        <Animated.View style={[
                          styles.starWrap,
                          { transform: [{ scale: scaleAnims[star - 1] }] },
                          star === 1 && rating > 0 && { borderTopLeftRadius: 12, borderBottomLeftRadius: 12 },
                          star === rating && { borderTopRightRadius: 12, borderBottomRightRadius: 12 },
                          filled && { backgroundColor: groupBg },
                          !filled && { backgroundColor: cardBg },
                        ]}>
                          <MaterialIcons
                            name={filled ? 'star' : 'star-border'}
                            size={32}
                            color={filled ? '#FFFFFF' : textSecondary}
                          />
                        </Animated.View>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {rating > 0 && rating <= 3 && (
                  <>
                    <Text style={[styles.sectionTitle, { color: textSecondary }]}>What can be improved?</Text>
                    <View style={styles.tagsRow}>
                      {IMPROVEMENT_TAGS.map((tag) => {
                        const active = selectedTags.includes(tag);
                        return (
                          <TouchableOpacity
                            key={tag}
                            style={[styles.tag, { backgroundColor: active ? accentColor : cardBg }]}
                            onPress={() => toggleTag(tag)}
                            activeOpacity={0.7}
                          >
                            <Text style={[styles.tagText, { color: active ? '#fff' : textColor }]}>{tag}</Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </>
                )}

                {rating > 0 && (
                  <View style={[styles.commentRow, { backgroundColor: cardBg }]}>
                    <MaterialIcons name="edit" size={18} color={textSecondary} style={{ marginTop: 2 }} />
                    <TextInput
                      style={[styles.commentInput, { color: textColor }]}
                      placeholder="Write a comment"
                      placeholderTextColor={textSecondary}
                      value={comment}
                      onChangeText={setComment}
                      multiline
                      maxLength={500}
                    />
                  </View>
                )}

                <TouchableOpacity
                  style={[styles.submitBtn, rating === 0 && { opacity: 0.4 }]}
                  onPress={handleSubmit}
                  disabled={rating === 0 || submitting}
                  activeOpacity={0.8}
                >
                  <Text style={styles.submitText}>{submitting ? 'Submitting...' : 'Submit'}</Text>
                </TouchableOpacity>
              </View>
          </Animated.View>
        </Animated.View>
      </TouchableWithoutFeedback>
    </Modal>
  );
});

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  sheetWrap: {
    width: '100%',
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 12,
  },
  handle: {
    width: 40,
    height: 5,
    borderRadius: 3,
    backgroundColor: 'rgba(128,128,128,0.4)',
    alignSelf: 'center',
    marginBottom: 16,
  },
  dragZone: {
    paddingBottom: 4,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    marginTop: 4,
    marginBottom: 16,
  },
  starsRow: {
    flexDirection: 'row',
    alignSelf: 'flex-start',
    gap: 0,
    marginBottom: 20,
  },
  starWrap: {
    width: 52,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 12,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  tag: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  tagText: {
    fontSize: 14,
    fontWeight: '600',
  },
  commentRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    borderRadius: 14,
    padding: 14,
    marginBottom: 20,
  },
  commentInput: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    minHeight: 36,
    maxHeight: 100,
  },
  submitBtn: {
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 8,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  submitText: {
    fontSize: 17,
    fontWeight: '800',
    color: '#000000',
  },
  thanksContainer: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 12,
  },
  thanksTitle: {
    fontSize: 24,
    fontWeight: '800',
  },
  thanksSubtitle: {
    fontSize: 15,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 22,
  },
});

export default FeedbackModal;

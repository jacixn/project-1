import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TextInput,
  TouchableOpacity,
  Animated,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import {
  GestureHandlerRootView,
  PanGestureHandler,
  State,
} from 'react-native-gesture-handler';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../contexts/ThemeContext';
import { hapticFeedback } from '../utils/haptics';

const ITEM_HEIGHT = 44;
const VISIBLE_ITEMS = 5;
const WHEEL_HEIGHT = ITEM_HEIGHT * VISIBLE_ITEMS;

const HOURS = Array.from({ length: 12 }, (_, i) => i + 1);
const MINUTES = Array.from({ length: 60 }, (_, i) => i);
const PERIODS = ['AM', 'PM'];

const WheelItem = ({ item, index, scrollY, format, color }) => {
  const inputRange = [
    (index - 2) * ITEM_HEIGHT,
    (index - 1) * ITEM_HEIGHT,
    index * ITEM_HEIGHT,
    (index + 1) * ITEM_HEIGHT,
    (index + 2) * ITEM_HEIGHT,
  ];
  const opacity = scrollY.interpolate({
    inputRange,
    outputRange: [0.25, 0.55, 1, 0.55, 0.25],
    extrapolate: 'clamp',
  });
  const scale = scrollY.interpolate({
    inputRange,
    outputRange: [0.8, 0.92, 1, 0.92, 0.8],
    extrapolate: 'clamp',
  });
  return (
    <Animated.View style={[styles.wheelItem, { opacity, transform: [{ scale }] }]}>
      <Text style={[styles.wheelItemText, { color }]}>
        {format ? format(item) : item}
      </Text>
    </Animated.View>
  );
};

const WheelPicker = ({ data, value, onChange, format, theme }) => {
  const scrollRef = useRef(null);
  const scrollY = useRef(new Animated.Value(0)).current;
  const valueRef = useRef(value);
  valueRef.current = value;
  const readyRef = useRef(false);

  const scrollToValue = (v, animated = false) => {
    const idx = data.indexOf(v);
    if (idx < 0 || !scrollRef.current) return;
    scrollRef.current.scrollTo({ y: idx * ITEM_HEIGHT, animated });
  };

  useEffect(() => {
    if (!readyRef.current) return;
    scrollToValue(value);
  }, [value]);

  const handleContentSizeChange = () => {
    if (readyRef.current) return;
    readyRef.current = true;
    scrollToValue(valueRef.current);
  };

  const handleMomentumEnd = (e) => {
    const offsetY = e.nativeEvent.contentOffset.y;
    const idx = Math.round(offsetY / ITEM_HEIGHT);
    const clamped = Math.max(0, Math.min(data.length - 1, idx));
    const next = data[clamped];
    if (next !== valueRef.current) {
      hapticFeedback.light();
      onChange(next);
    }
    if (clamped * ITEM_HEIGHT !== offsetY) {
      scrollRef.current?.scrollTo({ y: clamped * ITEM_HEIGHT, animated: true });
    }
  };

  return (
    <View style={styles.wheelColumn}>
      <Animated.ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        snapToInterval={ITEM_HEIGHT}
        decelerationRate="fast"
        bounces={false}
        contentContainerStyle={{ paddingVertical: ITEM_HEIGHT * 2 }}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true }
        )}
        scrollEventThrottle={16}
        onMomentumScrollEnd={handleMomentumEnd}
        onContentSizeChange={handleContentSizeChange}
      >
        {data.map((item, index) => (
          <WheelItem
            key={String(item)}
            item={item}
            index={index}
            scrollY={scrollY}
            format={format}
            color={theme.text}
          />
        ))}
      </Animated.ScrollView>
    </View>
  );
};

const AddPrayerModal = ({ visible, onClose, onSave }) => {
  const { theme, isDark } = useTheme();
  const [prayerName, setPrayerName] = useState('');
  const [selectedHour, setSelectedHour] = useState(9);
  const [selectedMinute, setSelectedMinute] = useState(0);
  const [selectedPeriod, setSelectedPeriod] = useState('AM');
  const [prayerType, setPrayerType] = useState('persistent');
  const [inputFocused, setInputFocused] = useState(false);

  const slideAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const gestureY = useRef(new Animated.Value(0)).current;

  const accent = theme.primary;
  const accentSoft = `${accent}${isDark ? '22' : '14'}`;
  const surfaceColor = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.025)';
  const borderColor = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';
  const fadeColor = theme.background;

  useEffect(() => {
    if (!visible) {
      setTimeout(() => {
        setPrayerName('');
        setSelectedHour(9);
        setSelectedMinute(0);
        setSelectedPeriod('AM');
        setPrayerType('persistent');
        setInputFocused(false);
        gestureY.setValue(0);
        slideAnim.setValue(0);
      }, 100);
    }
  }, [visible]);

  const onGestureEvent = Animated.event(
    [{ nativeEvent: { translationY: gestureY } }],
    { useNativeDriver: true }
  );

  const onHandlerStateChange = (event) => {
    if (event.nativeEvent.oldState === State.ACTIVE) {
      const { translationY, velocityY } = event.nativeEvent;
      if (translationY > 120 || velocityY > 800) {
        hapticFeedback.success();
        onClose();
      } else {
        Animated.spring(gestureY, {
          toValue: 0,
          tension: 100,
          friction: 10,
          useNativeDriver: true,
        }).start();
      }
    }
  };

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 1,
          tension: 65,
          friction: 9,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  const convertTo24Hour = () => {
    let hour = selectedHour;
    if (selectedPeriod === 'PM' && hour !== 12) hour += 12;
    else if (selectedPeriod === 'AM' && hour === 12) hour = 0;
    return `${hour.toString().padStart(2, '0')}:${selectedMinute
      .toString()
      .padStart(2, '0')}`;
  };

  const handleSave = () => {
    if (!prayerName.trim()) {
      hapticFeedback.error();
      return;
    }
    hapticFeedback.success();
    onSave({
      name: prayerName.trim(),
      time: convertTo24Hour(),
      type: prayerType,
    });
  };

  const modalTranslateY = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [600, 0],
  });
  const clampedGestureY = gestureY.interpolate({
    inputRange: [-1, 0, 600],
    outputRange: [0, 0, 600],
    extrapolate: 'clamp',
  });
  const combinedTranslateY = Animated.add(modalTranslateY, clampedGestureY);

  const handleBackdropClose = () => {
    hapticFeedback.light();
    onClose();
  };

  const pad = (n) => n.toString().padStart(2, '0');

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="none"
      onRequestClose={handleBackdropClose}
      statusBarTranslucent={true}
    >
      <GestureHandlerRootView style={{ flex: 1 }}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
        <View style={StyleSheet.absoluteFill}>
          <TouchableOpacity
            style={styles.backdrop}
            activeOpacity={0.7}
            onPress={handleBackdropClose}
          />
        </View>

        <Animated.View
          style={[
            styles.modalContainer,
            {
              transform: [{ translateY: combinedTranslateY }],
              opacity: fadeAnim,
              backgroundColor: theme.background,
            },
          ]}
        >
          <PanGestureHandler
            onGestureEvent={onGestureEvent}
            onHandlerStateChange={onHandlerStateChange}
            activeOffsetY={10}
            failOffsetX={[-20, 20]}
          >
            <Animated.View style={styles.dragArea}>
              <View
                style={[
                  styles.dragHandle,
                  {
                    backgroundColor: isDark
                      ? 'rgba(255,255,255,0.25)'
                      : 'rgba(0,0,0,0.15)',
                  },
                ]}
              />
            </Animated.View>
          </PanGestureHandler>

          <ScrollView
            style={styles.scrollView}
            showsVerticalScrollIndicator={false}
            bounces={true}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
          >
            {/* Header */}
            <View style={styles.headerSection}>
              <Text style={[styles.headerTitle, { color: theme.text }]}>
                New Prayer
              </Text>
              <Text
                style={[
                  styles.headerSubtitle,
                  { color: theme.textSecondary },
                ]}
              >
                Add to your daily routine
              </Text>
            </View>

            {/* Prayer Name */}
            <View style={styles.section}>
              <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>
                NAME
              </Text>
              <View
                style={[
                  styles.inputBox,
                  {
                    backgroundColor: surfaceColor,
                    borderColor: inputFocused ? accent : borderColor,
                    borderWidth: 1.5,
                  },
                ]}
              >
                <TextInput
                  style={[styles.textInput, { color: theme.text }]}
                  placeholder="Morning Prayer"
                  placeholderTextColor={
                    isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)'
                  }
                  value={prayerName}
                  onChangeText={setPrayerName}
                  onFocus={() => setInputFocused(true)}
                  onBlur={() => setInputFocused(false)}
                  autoCorrect={false}
                />
              </View>
            </View>

            {/* Prayer Time - Wheel */}
            <View style={styles.section}>
              <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>
                TIME
              </Text>

              <View
                style={[
                  styles.timeCard,
                  {
                    backgroundColor: surfaceColor,
                    borderColor: borderColor,
                  },
                ]}
              >
                {/* Center selection band */}
                <View
                  pointerEvents="none"
                  style={[
                    styles.wheelHighlight,
                    {
                      backgroundColor: accentSoft,
                      borderColor: `${accent}30`,
                    },
                  ]}
                />

                <View style={styles.wheelRow}>
                  <WheelPicker
                    data={HOURS}
                    value={selectedHour}
                    onChange={setSelectedHour}
                    format={pad}
                    theme={theme}
                    isDark={isDark}
                  />
                  <Text style={[styles.wheelColon, { color: theme.text }]}>:</Text>
                  <WheelPicker
                    data={MINUTES}
                    value={selectedMinute}
                    onChange={setSelectedMinute}
                    format={pad}
                    theme={theme}
                    isDark={isDark}
                  />
                  <WheelPicker
                    data={PERIODS}
                    value={selectedPeriod}
                    onChange={setSelectedPeriod}
                    theme={theme}
                    isDark={isDark}
                  />
                </View>

                {/* Top/bottom fade overlays */}
                <LinearGradient
                  pointerEvents="none"
                  colors={[fadeColor, `${fadeColor}00`]}
                  style={[styles.wheelFade, { top: 0 }]}
                />
                <LinearGradient
                  pointerEvents="none"
                  colors={[`${fadeColor}00`, fadeColor]}
                  style={[styles.wheelFade, { bottom: 0 }]}
                />
              </View>
            </View>

            {/* Prayer Type - segmented */}
            <View style={styles.section}>
              <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>
                TYPE
              </Text>

              <View
                style={[
                  styles.segmentWrap,
                  { backgroundColor: surfaceColor, borderColor },
                ]}
              >
                <TouchableOpacity
                  style={[
                    styles.segmentBtn,
                    prayerType === 'persistent' && {
                      backgroundColor: accent,
                    },
                  ]}
                  onPress={() => {
                    setPrayerType('persistent');
                    hapticFeedback.light();
                  }}
                  activeOpacity={0.8}
                >
                  <MaterialIcons
                    name="all-inclusive"
                    size={16}
                    color={
                      prayerType === 'persistent' ? '#fff' : theme.textSecondary
                    }
                  />
                  <Text
                    style={[
                      styles.segmentText,
                      {
                        color:
                          prayerType === 'persistent'
                            ? '#fff'
                            : theme.textSecondary,
                      },
                    ]}
                  >
                    Daily
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.segmentBtn,
                    prayerType === 'one-time' && {
                      backgroundColor: accent,
                    },
                  ]}
                  onPress={() => {
                    setPrayerType('one-time');
                    hapticFeedback.light();
                  }}
                  activeOpacity={0.8}
                >
                  <MaterialIcons
                    name="check-circle-outline"
                    size={16}
                    color={
                      prayerType === 'one-time' ? '#fff' : theme.textSecondary
                    }
                  />
                  <Text
                    style={[
                      styles.segmentText,
                      {
                        color:
                          prayerType === 'one-time'
                            ? '#fff'
                            : theme.textSecondary,
                      },
                    ]}
                  >
                    One-Time
                  </Text>
                </TouchableOpacity>
              </View>

              <Text
                style={[styles.typeHint, { color: theme.textTertiary || theme.textSecondary }]}
              >
                {prayerType === 'persistent'
                  ? 'Resets every day in your list.'
                  : 'Removed automatically when complete.'}
              </Text>
            </View>

            {/* Footer */}
            <View style={styles.footer}>
              <TouchableOpacity
                style={[
                  styles.cancelBtn,
                  {
                    backgroundColor: surfaceColor,
                    borderColor,
                  },
                ]}
                onPress={handleBackdropClose}
                activeOpacity={0.7}
              >
                <Text
                  style={[styles.cancelBtnText, { color: theme.textSecondary }]}
                >
                  Cancel
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.saveBtn,
                  {
                    backgroundColor: accent,
                    opacity: prayerName.trim() ? 1 : 0.4,
                  },
                ]}
                onPress={handleSave}
                disabled={!prayerName.trim()}
                activeOpacity={0.85}
              >
                <Text style={styles.saveBtnText}>Create Prayer</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </Animated.View>
        </KeyboardAvoidingView>
      </GestureHandlerRootView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  modalContainer: {
    height: '86%',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 16,
  },
  dragArea: {
    paddingTop: 14,
    paddingBottom: 14,
    alignItems: 'center',
  },
  dragHandle: {
    width: 40,
    height: 5,
    borderRadius: 3,
  },
  scrollView: { flex: 1 },
  scrollContent: { paddingBottom: 32 },

  // Header
  headerSection: {
    paddingHorizontal: 24,
    paddingTop: 18,
    paddingBottom: 22,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 15,
    fontWeight: '500',
  },

  // Sections
  section: {
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.4,
    marginBottom: 10,
  },

  // Name input
  inputBox: {
    borderRadius: 14,
  },
  textInput: {
    fontSize: 17,
    fontWeight: '500',
    paddingVertical: 16,
    paddingHorizontal: 16,
  },

  // Wheel time
  timeCard: {
    borderRadius: 18,
    borderWidth: 1,
    height: WHEEL_HEIGHT + 24,
    overflow: 'hidden',
    position: 'relative',
    justifyContent: 'center',
  },
  wheelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: WHEEL_HEIGHT,
  },
  wheelColumn: {
    width: 70,
    height: WHEEL_HEIGHT,
  },
  wheelItem: {
    height: ITEM_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wheelItemText: {
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: 0.5,
    fontVariant: ['tabular-nums'],
  },
  wheelColon: {
    fontSize: 24,
    fontWeight: '700',
    marginHorizontal: 4,
    marginBottom: 2,
  },
  wheelHighlight: {
    position: 'absolute',
    left: 12,
    right: 12,
    top: '50%',
    height: ITEM_HEIGHT,
    marginTop: -ITEM_HEIGHT / 2,
    borderRadius: 12,
    borderWidth: 1,
  },
  wheelFade: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: ITEM_HEIGHT * 1.6,
  },

  // Type segmented
  segmentWrap: {
    flexDirection: 'row',
    borderRadius: 12,
    borderWidth: 1,
    padding: 4,
    gap: 4,
  },
  segmentBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 9,
    gap: 6,
  },
  segmentText: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  typeHint: {
    marginTop: 10,
    marginLeft: 2,
    fontSize: 13,
    fontWeight: '500',
  },

  // Footer
  footer: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 24,
    paddingTop: 4,
  },
  cancelBtn: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 14,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelBtnText: {
    fontSize: 15,
    fontWeight: '600',
  },
  saveBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 6,
  },
  saveBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});

export default AddPrayerModal;

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
  PanResponder,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../contexts/ThemeContext';
import { hapticFeedback } from '../utils/haptics';

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
  const panY = useRef(new Animated.Value(0)).current;

  const accentGradient = [theme.primary, theme.primaryLight || theme.primary];

  useEffect(() => {
    if (!visible) {
      setTimeout(() => {
        setPrayerName('');
        setSelectedHour(9);
        setSelectedMinute(0);
        setSelectedPeriod('AM');
        setPrayerType('persistent');
        setInputFocused(false);
        panY.setValue(0);
        slideAnim.setValue(0);
      }, 100);
    }
  }, [visible]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return gestureState.dy > 10 && Math.abs(gestureState.dy) > Math.abs(gestureState.dx);
      },
      onPanResponderGrant: () => {
        hapticFeedback.light();
      },
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy > 0) {
          panY.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > 150) {
          hapticFeedback.success();
          onClose();
        } else {
          hapticFeedback.light();
          Animated.spring(panY, {
            toValue: 0,
            tension: 100,
            friction: 10,
            useNativeDriver: true,
          }).start();
        }
      },
    })
  ).current;

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
    return `${hour.toString().padStart(2, '0')}:${selectedMinute.toString().padStart(2, '0')}`;
  };

  const handleSave = () => {
    if (!prayerName.trim()) {
      hapticFeedback.error();
      return;
    }
    hapticFeedback.success();
    onSave({ name: prayerName.trim(), time: convertTo24Hour(), type: prayerType });
  };

  const modalTranslateY = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [600, 0],
  });
  const combinedTranslateY = Animated.add(modalTranslateY, panY);

  const handleBackdropClose = () => {
    hapticFeedback.light();
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="none"
      onRequestClose={handleBackdropClose}
      statusBarTranslucent={true}
    >
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
            }
          ]}
        >
          {/* Drag Handle */}
          <View {...panResponder.panHandlers} style={styles.dragArea}>
            <View style={[styles.dragHandle, { 
              backgroundColor: isDark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.2)' 
            }]} />
          </View>

          <ScrollView 
            style={styles.scrollView}
            showsVerticalScrollIndicator={false}
            bounces={true}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
          >
            {/* Header */}
            <View style={styles.headerSection}>
              <LinearGradient
                colors={[`${theme.primary}18`, `${theme.primary}08`, 'transparent']}
                style={StyleSheet.absoluteFill}
              />
              <LinearGradient
                colors={accentGradient}
                style={styles.headerIconCircle}
              >
                <MaterialIcons name="add" size={28} color="#fff" />
              </LinearGradient>
              <Text style={[styles.headerTitle, { color: theme.text }]}>
                Create New Prayer
              </Text>
              <Text style={[styles.headerSubtitle, { color: theme.textSecondary }]}>
                Add a prayer to your daily routine
              </Text>
            </View>

            {/* Prayer Name */}
            <View style={styles.section}>
              <View style={styles.sectionLabelRow}>
                <MaterialIcons name="edit" size={16} color={theme.primary} />
                <Text style={[styles.sectionLabel, { color: theme.text }]}>Prayer Name</Text>
              </View>
              <View style={[styles.inputBox, { 
                backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#FAFBFF',
                borderColor: inputFocused ? theme.primary : (isDark ? 'rgba(255,255,255,0.1)' : `${theme.primary}18`),
                borderWidth: inputFocused ? 2 : 1,
              }]}>
                {/* Accent strip */}
                <LinearGradient
                  colors={accentGradient}
                  style={styles.inputAccentStrip}
                />
                <TextInput
                  style={[styles.textInput, { color: theme.text }]}
                  placeholder="e.g., Morning Prayer, Gratitude"
                  placeholderTextColor={isDark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.3)'}
                  value={prayerName}
                  onChangeText={setPrayerName}
                  onFocus={() => setInputFocused(true)}
                  onBlur={() => setInputFocused(false)}
                  autoCorrect={false}
                />
              </View>
            </View>

            {/* Prayer Time */}
            <View style={styles.section}>
              <View style={styles.sectionLabelRow}>
                <MaterialIcons name="schedule" size={16} color={theme.primary} />
                <Text style={[styles.sectionLabel, { color: theme.text }]}>Prayer Time</Text>
              </View>

              <View style={[styles.timeCard, { 
                backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#FAFBFF',
                borderColor: isDark ? 'rgba(255,255,255,0.1)' : `${theme.primary}18`,
              }]}>
                <LinearGradient
                  colors={accentGradient}
                  style={styles.inputAccentStrip}
                />
                <View style={styles.timeInner}>
                  {/* Time display */}
                  <View style={styles.timeRow}>
                    {/* Hour */}
                    <View style={styles.timeColumn}>
                      <TouchableOpacity 
                        onPress={() => { setSelectedHour(p => p === 12 ? 1 : p + 1); hapticFeedback.light(); }}
                        style={styles.timeArrow}
                        activeOpacity={0.6}
                      >
                        <MaterialIcons name="keyboard-arrow-up" size={26} color={theme.primary} />
                      </TouchableOpacity>
                      <View style={[styles.timeValueBox, { backgroundColor: `${theme.primary}0D` }]}>
                        <Text style={[styles.timeValue, { color: theme.text }]}>
                          {selectedHour.toString().padStart(2, '0')}
                        </Text>
                      </View>
                      <TouchableOpacity 
                        onPress={() => { setSelectedHour(p => p === 1 ? 12 : p - 1); hapticFeedback.light(); }}
                        style={styles.timeArrow}
                        activeOpacity={0.6}
                      >
                        <MaterialIcons name="keyboard-arrow-down" size={26} color={theme.primary} />
                      </TouchableOpacity>
                    </View>

                    <Text style={[styles.timeSeparator, { color: theme.primary }]}>:</Text>

                    {/* Minute */}
                    <View style={styles.timeColumn}>
                      <TouchableOpacity 
                        onPress={() => { setSelectedMinute(p => p === 59 ? 0 : p + 1); hapticFeedback.light(); }}
                        style={styles.timeArrow}
                        activeOpacity={0.6}
                      >
                        <MaterialIcons name="keyboard-arrow-up" size={26} color={theme.primary} />
                      </TouchableOpacity>
                      <View style={[styles.timeValueBox, { backgroundColor: `${theme.primary}0D` }]}>
                        <Text style={[styles.timeValue, { color: theme.text }]}>
                          {selectedMinute.toString().padStart(2, '0')}
                        </Text>
                      </View>
                      <TouchableOpacity 
                        onPress={() => { setSelectedMinute(p => p === 0 ? 59 : p - 1); hapticFeedback.light(); }}
                        style={styles.timeArrow}
                        activeOpacity={0.6}
                      >
                        <MaterialIcons name="keyboard-arrow-down" size={26} color={theme.primary} />
                      </TouchableOpacity>
                    </View>

                    {/* AM/PM */}
                    <View style={styles.periodColumn}>
                      <TouchableOpacity 
                        onPress={() => { setSelectedPeriod('AM'); hapticFeedback.light(); }}
                        activeOpacity={0.7}
                      >
                        <LinearGradient
                          colors={selectedPeriod === 'AM' ? accentGradient : ['transparent', 'transparent']}
                          style={[styles.periodBtn, {
                            borderWidth: selectedPeriod === 'AM' ? 0 : 1,
                            borderColor: isDark ? 'rgba(255,255,255,0.12)' : `${theme.primary}25`,
                          }]}
                        >
                          <Text style={[styles.periodText, {
                            color: selectedPeriod === 'AM' ? '#fff' : theme.textSecondary
                          }]}>
                            AM
                          </Text>
                        </LinearGradient>
                      </TouchableOpacity>
                      <TouchableOpacity 
                        onPress={() => { setSelectedPeriod('PM'); hapticFeedback.light(); }}
                        activeOpacity={0.7}
                      >
                        <LinearGradient
                          colors={selectedPeriod === 'PM' ? accentGradient : ['transparent', 'transparent']}
                          style={[styles.periodBtn, {
                            borderWidth: selectedPeriod === 'PM' ? 0 : 1,
                            borderColor: isDark ? 'rgba(255,255,255,0.12)' : `${theme.primary}25`,
                          }]}
                        >
                          <Text style={[styles.periodText, {
                            color: selectedPeriod === 'PM' ? '#fff' : theme.textSecondary
                          }]}>
                            PM
                          </Text>
                        </LinearGradient>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              </View>
            </View>

            {/* Prayer Type */}
            <View style={styles.section}>
              <View style={styles.sectionLabelRow}>
                <MaterialIcons name="repeat" size={16} color={theme.primary} />
                <Text style={[styles.sectionLabel, { color: theme.text }]}>Prayer Type</Text>
              </View>

              {/* Persistent */}
              <TouchableOpacity
                style={[styles.typeCard, { 
                  backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#FAFBFF',
                  borderColor: prayerType === 'persistent' ? theme.primary : (isDark ? 'rgba(255,255,255,0.1)' : `${theme.primary}18`),
                  borderWidth: prayerType === 'persistent' ? 2 : 1,
                }]}
                onPress={() => { setPrayerType('persistent'); hapticFeedback.light(); }}
                activeOpacity={0.7}
              >
                {prayerType === 'persistent' && (
                  <LinearGradient colors={accentGradient} style={styles.inputAccentStrip} />
                )}
                <View style={styles.typeInner}>
                  <View style={[styles.radioOuter, { 
                    borderColor: prayerType === 'persistent' ? theme.primary : (isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.2)')
                  }]}>
                    {prayerType === 'persistent' && (
                      <LinearGradient colors={accentGradient} style={styles.radioInner} />
                    )}
                  </View>
                  <View style={styles.typeTextContent}>
                    <Text style={[styles.typeTitle, { color: theme.text }]}>Daily Prayer</Text>
                    <Text style={[styles.typeDesc, { color: theme.textSecondary }]}>
                      Stays in your list and resets every day
                    </Text>
                  </View>
                  <View style={[styles.typeIconBg, { backgroundColor: `${theme.primary}10` }]}>
                    <MaterialIcons name="all-inclusive" size={20} color={theme.primary} />
                  </View>
                </View>
              </TouchableOpacity>

              {/* One-time */}
              <TouchableOpacity
                style={[styles.typeCard, { 
                  backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#FAFBFF',
                  borderColor: prayerType === 'one-time' ? theme.primary : (isDark ? 'rgba(255,255,255,0.1)' : `${theme.primary}18`),
                  borderWidth: prayerType === 'one-time' ? 2 : 1,
                }]}
                onPress={() => { setPrayerType('one-time'); hapticFeedback.light(); }}
                activeOpacity={0.7}
              >
                {prayerType === 'one-time' && (
                  <LinearGradient colors={accentGradient} style={styles.inputAccentStrip} />
                )}
                <View style={styles.typeInner}>
                  <View style={[styles.radioOuter, { 
                    borderColor: prayerType === 'one-time' ? theme.primary : (isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.2)')
                  }]}>
                    {prayerType === 'one-time' && (
                      <LinearGradient colors={accentGradient} style={styles.radioInner} />
                    )}
                  </View>
                  <View style={styles.typeTextContent}>
                    <Text style={[styles.typeTitle, { color: theme.text }]}>One-Time Prayer</Text>
                    <Text style={[styles.typeDesc, { color: theme.textSecondary }]}>
                      Removed automatically after you complete it
                    </Text>
                  </View>
                  <View style={[styles.typeIconBg, { backgroundColor: `${theme.primary}10` }]}>
                    <MaterialIcons name="check-circle-outline" size={20} color={theme.primary} />
                  </View>
                </View>
              </TouchableOpacity>
            </View>

            {/* Footer buttons */}
            <View style={styles.footer}>
              <TouchableOpacity
                style={[styles.cancelBtn, { 
                  backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)',
                  borderColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)',
                }]}
                onPress={handleBackdropClose}
                activeOpacity={0.7}
              >
                <Text style={[styles.cancelBtnText, { color: theme.textSecondary }]}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.saveBtn, { opacity: prayerName.trim() ? 1 : 0.4 }]}
                onPress={handleSave}
                disabled={!prayerName.trim()}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={accentGradient}
                  style={styles.saveBtnGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  <MaterialIcons name="check" size={20} color="#fff" />
                  <Text style={styles.saveBtnText}>Create Prayer</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </Animated.View>
      </KeyboardAvoidingView>
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
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContainer: {
    height: '88%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 16,
  },
  dragArea: {
    paddingTop: 14,
    paddingBottom: 6,
    alignItems: 'center',
  },
  dragHandle: {
    width: 40,
    height: 5,
    borderRadius: 3,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },

  // Header
  headerSection: {
    alignItems: 'center',
    paddingTop: 4,
    paddingBottom: 24,
    paddingHorizontal: 20,
    overflow: 'hidden',
  },
  headerIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: 0.3,
    marginBottom: 6,
  },
  headerSubtitle: {
    fontSize: 14,
    textAlign: 'center',
  },

  // Sections
  section: {
    paddingHorizontal: 20,
    marginBottom: 22,
  },
  sectionLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginBottom: 10,
  },
  sectionLabel: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.2,
  },

  // Input
  inputBox: {
    borderRadius: 14,
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  inputAccentStrip: {
    width: 4,
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    paddingVertical: 16,
    paddingHorizontal: 18,
    paddingLeft: 18,
  },

  // Time picker
  timeCard: {
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  timeInner: {
    padding: 18,
    paddingLeft: 18,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  timeColumn: {
    alignItems: 'center',
    gap: 6,
  },
  timeArrow: {
    padding: 4,
  },
  timeValueBox: {
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 12,
    minWidth: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeValue: {
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  timeSeparator: {
    fontSize: 28,
    fontWeight: '800',
    marginHorizontal: 2,
  },
  periodColumn: {
    gap: 8,
    marginLeft: 12,
  },
  periodBtn: {
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 52,
  },
  periodText: {
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.5,
  },

  // Type cards
  typeCard: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  typeInner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    paddingLeft: 18,
    gap: 14,
  },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  typeTextContent: {
    flex: 1,
  },
  typeTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 3,
  },
  typeDesc: {
    fontSize: 13,
    lineHeight: 18,
  },
  typeIconBg: {
    width: 36,
    height: 36,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Footer
  footer: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 20,
    paddingTop: 8,
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
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  saveBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    gap: 8,
  },
  saveBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});

export default AddPrayerModal;

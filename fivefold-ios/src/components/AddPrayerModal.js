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
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { useTheme } from '../contexts/ThemeContext';
import { hapticFeedback } from '../utils/haptics';

const AddPrayerModal = ({ visible, onClose, onSave }) => {
  const { theme, isDark } = useTheme();
  const [prayerName, setPrayerName] = useState('');
  const [selectedHour, setSelectedHour] = useState(9);
  const [selectedMinute, setSelectedMinute] = useState(0);
  const [selectedPeriod, setSelectedPeriod] = useState('AM');
  const [prayerType, setPrayerType] = useState('persistent'); // 'persistent' or 'one-time'
  
  // Animation refs
  const slideAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const panY = useRef(new Animated.Value(0)).current;

  // Reset form and animations when modal closes
  useEffect(() => {
    if (!visible) {
      // Small delay to ensure smooth close animation completes first
      setTimeout(() => {
        setPrayerName('');
        setSelectedHour(9);
        setSelectedMinute(0);
        setSelectedPeriod('AM');
        setPrayerType('persistent');
        panY.setValue(0); // Reset pan position
        slideAnim.setValue(0); // Reset slide animation
      }, 100);
    }
  }, [visible]);

  // Pan gesture handler for swipe-to-dismiss - simpler approach
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        // Only respond to downward swipes
        return gestureState.dy > 10 && Math.abs(gestureState.dy) > Math.abs(gestureState.dx);
      },
      onPanResponderGrant: () => {
        hapticFeedback.light();
      },
      onPanResponderMove: (_, gestureState) => {
        // Only allow downward dragging
        if (gestureState.dy > 0) {
          panY.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        // If dragged down more than 150px, close the modal
        if (gestureState.dy > 150) {
          hapticFeedback.success();
          // Just close, let parent handle the animation
          onClose();
        } else {
          // Snap back to original position
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

  // Animate in/out
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
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 65,
          friction: 9,
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
        Animated.spring(scaleAnim, {
          toValue: 0.9,
          tension: 65,
          friction: 9,
          useNativeDriver: true,
        }),
        ]).start();
    }
  }, [visible]);

  // Convert 12-hour format to 24-hour format
  const convertTo24Hour = () => {
    let hour = selectedHour;
    if (selectedPeriod === 'PM' && hour !== 12) {
      hour += 12;
    } else if (selectedPeriod === 'AM' && hour === 12) {
      hour = 0;
    }
    return `${hour.toString().padStart(2, '0')}:${selectedMinute.toString().padStart(2, '0')}`;
  };

  const handleSave = () => {
    if (!prayerName.trim()) {
      hapticFeedback.error();
      return;
    }

    hapticFeedback.success();
    
    const time24Hour = convertTo24Hour();
    
    onSave({
      name: prayerName.trim(),
      time: time24Hour,
      type: prayerType,
    });
  };

  const modalTranslateY = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [600, 0],
  });

  // Combine slide animation with pan gesture
  const combinedTranslateY = Animated.add(modalTranslateY, panY);

  // Handle backdrop tap - just close, let parent handle animations
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
        {/* Backdrop - Transparent, just for tap-to-close */}
        <View style={styles.backdrop}>
              <TouchableOpacity 
            style={styles.backdropTouchable}
            activeOpacity={0.7}
            onPress={handleBackdropClose}
          />
              </View>
              
        {/* Modal Content */}
            <Animated.View 
              style={[
            styles.modalContainer,
                {
              transform: [
                { translateY: combinedTranslateY },
                { scale: scaleAnim }
              ],
                  opacity: fadeAnim,
            }
          ]}
        >
          <BlurView 
            intensity={95} 
            tint={isDark ? "dark" : "light"} 
            style={[styles.blurContainer, {
              backgroundColor: isDark 
                ? 'rgba(20, 20, 20, 0.75)' 
                : 'rgba(255, 255, 255, 0.75)'
            }]}
          >
            <SafeAreaView style={styles.safeArea} edges={['top']}>
              <ScrollView 
                style={styles.scrollView}
                showsVerticalScrollIndicator={false}
                bounces={false}
              >
                {/* Header with Drag Handle */}
                <View style={styles.header}>
                  <View 
                    style={styles.dragHandleContainer}
                    {...panResponder.panHandlers}
                  >
                    <View style={[styles.dragHandle, { 
                      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.15)' 
                    }]} />
                  </View>
                  <View 
                    style={styles.headerContent}
                    {...panResponder.panHandlers}
                  >
                    <Text style={[styles.title, { color: theme.text }]}>
                      Create New Prayer
                    </Text>
                    <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
                      Add a prayer to your daily routine
                    </Text>
                  </View>
                  </View>
                  
                {/* Form Content */}
                <View style={styles.content}>
                  {/* Prayer Name */}
                  <View style={styles.inputGroup}>
                    <Text style={[styles.label, { color: theme.text }]}>
                      Prayer Name
                    </Text>
                    <View style={[styles.inputContainer, { 
                      backgroundColor: theme.card,
                      borderColor: isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.1)'
                    }]}>
                      <MaterialIcons 
                        name="edit" 
                        size={20} 
                        color={theme.textSecondary} 
                      />
                      <TextInput
                        style={[styles.textInput, { color: theme.text }]}
                        placeholder="e.g., Morning Prayer, Gratitude"
                        placeholderTextColor={theme.textSecondary}
                        value={prayerName}
                        onChangeText={setPrayerName}
                      />
                    </View>
                  </View>

                  {/* Prayer Time */}
                  <View style={styles.inputGroup}>
                    <Text style={[styles.label, { color: theme.text }]}>
                      Prayer Time
                    </Text>
                    
                    <View style={[styles.timePickerContainer, { 
                      backgroundColor: theme.card,
                      borderColor: isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.1)'
                    }]}>
                      <MaterialIcons 
                        name="access-time" 
                        size={24} 
                        color={theme.text} 
                        style={styles.timeIcon}
                      />
                      
                      <View style={styles.timeSelectors}>
                        {/* Hour Selector */}
                        <View style={styles.timePickerColumn}>
                          <TouchableOpacity 
                            onPress={() => {
                              setSelectedHour(prev => prev === 12 ? 1 : prev + 1);
                              hapticFeedback.light();
                            }}
                            style={styles.timeArrow}
                          >
                            <MaterialIcons name="keyboard-arrow-up" size={24} color={theme.textSecondary} />
                          </TouchableOpacity>
                          
                          <View style={[styles.timeValueContainer, { 
                            backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.04)'
                          }]}>
                            <Text style={[styles.timeValue, { color: theme.text }]}>
                              {selectedHour.toString().padStart(2, '0')}
                            </Text>
                          </View>
                          
                          <TouchableOpacity 
                            onPress={() => {
                              setSelectedHour(prev => prev === 1 ? 12 : prev - 1);
                              hapticFeedback.light();
                            }}
                            style={styles.timeArrow}
                          >
                            <MaterialIcons name="keyboard-arrow-down" size={24} color={theme.textSecondary} />
                          </TouchableOpacity>
                        </View>

                        <Text style={[styles.timeSeparator, { color: theme.text }]}>:</Text>

                        {/* Minute Selector */}
                        <View style={styles.timePickerColumn}>
                          <TouchableOpacity 
                            onPress={() => {
                              setSelectedMinute(prev => prev === 59 ? 0 : prev + 1);
                              hapticFeedback.light();
                            }}
                            style={styles.timeArrow}
                          >
                            <MaterialIcons name="keyboard-arrow-up" size={24} color={theme.textSecondary} />
                          </TouchableOpacity>
                          
                          <View style={[styles.timeValueContainer, { 
                            backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.04)'
                          }]}>
                            <Text style={[styles.timeValue, { color: theme.text }]}>
                              {selectedMinute.toString().padStart(2, '0')}
                            </Text>
                          </View>
                          
                          <TouchableOpacity 
                            onPress={() => {
                              setSelectedMinute(prev => prev === 0 ? 59 : prev - 1);
                              hapticFeedback.light();
                            }}
                            style={styles.timeArrow}
                          >
                            <MaterialIcons name="keyboard-arrow-down" size={24} color={theme.textSecondary} />
                          </TouchableOpacity>
                        </View>

                        {/* AM/PM Selector */}
                        <View style={styles.periodSelector}>
                          <TouchableOpacity 
                            onPress={() => {
                              setSelectedPeriod('AM');
                              hapticFeedback.light();
                            }}
                            style={[styles.periodButton, {
                              backgroundColor: selectedPeriod === 'AM' 
                                ? (isDark ? '#ffffff' : '#000000')
                                : 'transparent'
                            }]}
                          >
                            <Text style={[styles.periodText, {
                              color: selectedPeriod === 'AM' 
                                ? (isDark ? '#000000' : '#ffffff')
                                : theme.textSecondary
                            }]}>
                              AM
                            </Text>
                          </TouchableOpacity>
                          
                          <TouchableOpacity 
                            onPress={() => {
                              setSelectedPeriod('PM');
                              hapticFeedback.light();
                            }}
                            style={[styles.periodButton, {
                              backgroundColor: selectedPeriod === 'PM' 
                                ? (isDark ? '#ffffff' : '#000000')
                                : 'transparent'
                            }]}
                          >
                            <Text style={[styles.periodText, {
                              color: selectedPeriod === 'PM' 
                                ? (isDark ? '#000000' : '#ffffff')
                                : theme.textSecondary
                            }]}>
                              PM
                            </Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    </View>
                  </View>
                  
                  {/* Prayer Type */}
                  <View style={styles.inputGroup}>
                    <Text style={[styles.label, { color: theme.text }]}>
                      Prayer Type
                      </Text>

                    {/* Persistent Option */}
                    <TouchableOpacity
                      style={[styles.optionCard, { 
                        backgroundColor: theme.card,
                        borderColor: prayerType === 'persistent' 
                          ? (isDark ? 'rgba(255, 255, 255, 0.4)' : 'rgba(0, 0, 0, 0.3)')
                          : (isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)'),
                          borderWidth: prayerType === 'persistent' ? 2 : 1,
                      }]}
                      onPress={() => {
                        setPrayerType('persistent');
                        hapticFeedback.light();
                      }}
                      activeOpacity={0.7}
                    >
                      <View style={styles.optionHeader}>
                        <View style={[styles.radioOuter, { 
                          borderColor: prayerType === 'persistent' 
                            ? theme.text 
                            : theme.textSecondary 
                        }]}>
                          {prayerType === 'persistent' && (
                            <View style={[styles.radioInner, { backgroundColor: theme.text }]} />
                          )}
                        </View>
                        <View style={styles.optionTextContainer}>
                          <Text style={[styles.optionTitle, { color: theme.text }]}>
                            Persistent Prayer
                          </Text>
                          <Text style={[styles.optionDescription, { color: theme.textSecondary }]}>
                            This prayer will stay in your list until you manually delete it
                          </Text>
                        </View>
                        <MaterialIcons 
                          name="all-inclusive" 
                          size={24} 
                          color={prayerType === 'persistent' ? theme.text : theme.textSecondary} 
                        />
                      </View>
                    </TouchableOpacity>

                    {/* One-Time Option */}
                          <TouchableOpacity 
                      style={[styles.optionCard, { 
                        backgroundColor: theme.card,
                        borderColor: prayerType === 'one-time' 
                          ? (isDark ? 'rgba(255, 255, 255, 0.4)' : 'rgba(0, 0, 0, 0.3)')
                          : (isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)'),
                        borderWidth: prayerType === 'one-time' ? 2 : 1,
                            }]}
                            onPress={() => {
                        setPrayerType('one-time');
                              hapticFeedback.light();
                            }}
                      activeOpacity={0.7}
                    >
                      <View style={styles.optionHeader}>
                        <View style={[styles.radioOuter, { 
                          borderColor: prayerType === 'one-time' 
                            ? theme.text 
                            : theme.textSecondary 
                        }]}>
                          {prayerType === 'one-time' && (
                            <View style={[styles.radioInner, { backgroundColor: theme.text }]} />
                          )}
                        </View>
                        <View style={styles.optionTextContainer}>
                          <Text style={[styles.optionTitle, { color: theme.text }]}>
                            One-Time Prayer
                        </Text>
                          <Text style={[styles.optionDescription, { color: theme.textSecondary }]}>
                            This prayer will automatically delete after you complete it once
                            </Text>
                        </View>
                        <MaterialIcons 
                          name="done" 
                          size={24} 
                          color={prayerType === 'one-time' ? theme.text : theme.textSecondary} 
                        />
                      </View>
                    </TouchableOpacity>
                      </View>
                    </View>
                    
                {/* Action Buttons */}
                <View style={styles.footer}>
                  <TouchableOpacity
                    style={[styles.button, styles.cancelButton, { 
                      backgroundColor: theme.card,
                      borderColor: isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.1)'
                    }]}
                    onPress={handleBackdropClose}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.cancelButtonText, { color: theme.text }]}>
                      Cancel
                        </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.button, styles.saveButton, { 
                      backgroundColor: isDark ? '#ffffff' : '#000000',
                      opacity: prayerName.trim() ? 1 : 0.3
                    }]}
                    onPress={handleSave}
                    disabled={!prayerName.trim()}
                    activeOpacity={0.7}
                  >
                    <MaterialIcons name="check" size={20} color={isDark ? '#000000' : '#ffffff'} />
                    <Text style={[styles.saveButtonText, { color: isDark ? '#000000' : '#ffffff' }]}>
                      Create Prayer
                        </Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
          </SafeAreaView>
      </BlurView>
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
    backgroundColor: 'transparent',
  },
  backdropTouchable: {
    flex: 1,
  },
  modalContainer: {
    maxHeight: '90%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 24,
  },
  blurContainer: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
  },
  safeArea: {
    maxHeight: '100%',
  },
  scrollView: {
    maxHeight: '100%',
  },
  header: {
    alignItems: 'center',
    paddingTop: 12,
    paddingBottom: 24,
  },
  dragHandleContainer: {
    paddingVertical: 16,
    paddingHorizontal: 100,
    marginBottom: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dragHandle: {
    width: 40,
    height: 5,
    borderRadius: 3,
  },
  headerContent: {
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 8,
    letterSpacing: 0.3,
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
  },
  content: {
    paddingHorizontal: 20,
  },
  inputGroup: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    letterSpacing: 0.2,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
  },
  timePickerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 20,
    gap: 16,
  },
  timeIcon: {
    marginRight: 4,
  },
  timeSelectors: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  timePickerColumn: {
    alignItems: 'center',
    gap: 8,
  },
  timeArrow: {
    padding: 4,
  },
  timeValueContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    minWidth: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeValue: {
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  timeSeparator: {
    fontSize: 28,
    fontWeight: '700',
    marginHorizontal: 4,
  },
  periodSelector: {
    gap: 8,
    marginLeft: 8,
  },
  periodButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 50,
  },
  periodText: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  optionCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  optionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  radioOuter: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  optionTextContainer: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
    letterSpacing: 0.2,
  },
  optionDescription: {
    fontSize: 13,
    lineHeight: 18,
  },
  footer: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
  },
  button: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
    borderRadius: 16,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cancelButton: {
    borderWidth: 1,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  saveButton: {
    flex: 1.2,
  },
  saveButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});

export default AddPrayerModal;

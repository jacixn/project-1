import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Animated,
  ScrollView,
  Platform,
  PanResponder,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { hapticFeedback } from '../utils/haptics';

const PrayerDetailModal = ({ 
  visible, 
  onClose, 
  prayer, 
  canComplete,
  onComplete,
  onSimplify,
  onDiscuss,
  simpleVerseText,
  loadingSimple,
  timeUntilAvailable,
  fetchedVerses = {},
  bibleVersion = 'KJV',
  loadingVerses = false
}) => {
  const { theme, isDark } = useTheme();
  
  // Animation refs
  const slideAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const panY = useRef(new Animated.Value(0)).current;

  // Reset panY when modal closes
  useEffect(() => {
    if (!visible) {
      panY.setValue(0);
    }
  }, [visible]);

  // Pan gesture handler for swipe-to-dismiss
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
        if (gestureState.dy > 150 || gestureState.vy > 0.5) {
          hapticFeedback.success();
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
          ]).start(() => {
            onClose();
          });
        } else {
          hapticFeedback.light();
          Animated.spring(panY, {
            toValue: 0,
            tension: 65,
            friction: 11,
            useNativeDriver: true,
          }).start();
        }
      },
    })
  ).current;

  // Animate in/out
  useEffect(() => {
    if (visible) {
      // Ensure we start from closed position
      slideAnim.setValue(0);
      fadeAnim.setValue(0);
      
      // Small delay to ensure layout is ready
      requestAnimationFrame(() => {
      Animated.parallel([
          Animated.spring(slideAnim, {
          toValue: 1,
            tension: 65,
            friction: 11,
          useNativeDriver: true,
        }),
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
      });
    } else {
      // Reset to closed position
      slideAnim.setValue(0);
      fadeAnim.setValue(0);
    }
  }, [visible]);

  const modalTranslateY = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1000, 0], // Start from below screen
  });

  const combinedTranslateY = Animated.add(modalTranslateY, panY);

  const handleBackdropClose = () => {
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
    ]).start(() => {
      onClose();
    });
  };

  // FIXED: Don't render modal if prayer is not set (prevents race condition issues)
  if (!prayer || !visible) return null;

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="none"
      onRequestClose={handleBackdropClose}
      statusBarTranslucent={true}
    >
      <View style={[styles.modalOverlay, { justifyContent: 'flex-end' }]}>
        {/* Backdrop */}
        <Animated.View style={{ ...StyleSheet.absoluteFillObject, opacity: fadeAnim }}>
          <TouchableOpacity 
            style={styles.backdrop}
            activeOpacity={1}
            onPress={handleBackdropClose}
          />
        </Animated.View>

        {/* Modal Content */}
          <Animated.View 
            style={[
            styles.modalContainer,
              {
              transform: [{ translateY: combinedTranslateY }],
                opacity: fadeAnim,
              backgroundColor: theme.background,
              height: '94%',
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              overflow: 'hidden',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: -4 },
              shadowOpacity: 0.3,
              shadowRadius: 12,
              elevation: 10
            }
          ]}
        >
          <View style={styles.safeArea}>
              <ScrollView 
                style={styles.scrollView}
                showsVerticalScrollIndicator={false}
                bounces={false}
              >
                {/* Header with Drag Handle */}
                <View style={styles.header}>
                  <View 
                    style={[styles.dragHandleContainer, { paddingTop: 12, paddingBottom: 4 }]}
                    {...panResponder.panHandlers}
                  >
                    <View style={[styles.dragHandle, { 
                      width: 40,
                      height: 5,
                      borderRadius: 3,
                      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.4)' : 'rgba(0, 0, 0, 0.3)' 
                    }]} />
                    </View>
                  <View 
                    style={styles.headerContent}
                    {...panResponder.panHandlers}
                  >
                    <Text style={[styles.title, { color: theme.text }]}>
                      {prayer.name}
                    </Text>
                    <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
                        {prayer.time}
                      </Text>
                    </View>
                  </View>

              {/* Verses Section */}
                <View style={styles.content}>
                  <View style={styles.versesSectionHeader}>
                    <MaterialIcons name="menu-book" size={22} color={theme.text} />
                    <Text style={[styles.versesSectionTitle, { color: theme.text }]}>
                      Today's Verses
                    </Text>
                  </View>
                  
                  {prayer.verses && prayer.verses.map((verse, index) => {
                    return (
                      <View key={`${prayer.id}-${index}`} style={[styles.verseCard, { 
                        backgroundColor: isDark 
                          ? 'rgba(255, 255, 255, 0.08)' 
                          : 'rgba(0, 0, 0, 0.04)',
                        borderWidth: 1,
                        borderColor: isDark 
                          ? 'rgba(255, 255, 255, 0.12)' 
                          : 'rgba(0, 0, 0, 0.08)',
                      }]}>
                        <View style={styles.verseHeader}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                            <View style={[styles.verseNumber, { 
                              backgroundColor: theme.primary + '15',
                              borderWidth: 1.5,
                              borderColor: theme.primary + '40'
                            }]}>
                              <Text style={[styles.verseNumberText, { 
                                color: theme.primary
                              }]}>{index + 1}</Text>
                            </View>
                            <Text style={[styles.verseReference, { color: theme.text }]}>
                              {verse.reference}
                            </Text>
                          </View>
                          <Text style={[styles.versionBadge, { 
                            color: theme.primary,
                            backgroundColor: isDark 
                              ? `${theme.primary}15` 
                              : `${theme.primary}10`,
                            borderColor: `${theme.primary}30`
                          }]}>
                            {bibleVersion}
                          </Text>
              </View>

                        <Text style={[styles.verseText, { color: theme.text }]}>
                          {loadingVerses 
                            ? 'Loading verse...' 
                            : (fetchedVerses[verse.reference]?.text || verse.text || '').replace(/\s+/g, ' ').trim()}
                        </Text>

                        <View style={[styles.verseActions, { 
                          borderTopColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.1)',
                          borderTopWidth: 1
                        }]}>
                          <TouchableOpacity
                            style={[styles.verseActionButton, { 
                              backgroundColor: isDark 
                                ? 'rgba(255, 255, 255, 0.12)' 
                                : 'rgba(0, 0, 0, 0.08)',
                              borderWidth: 1.5,
                              borderColor: isDark 
                                ? 'rgba(255, 255, 255, 0.2)' 
                                : 'rgba(0, 0, 0, 0.15)'
                            }]}
                            onPress={(e) => {
                              if (e) e.stopPropagation();
                              onDiscuss(verse);
                            }}
                            activeOpacity={0.7}
                          >
                            <MaterialIcons name="chat" size={16} color={theme.text} />
                            <Text style={[styles.verseActionText, { color: theme.text }]}>
                              Discuss
                            </Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    );
                  })}

                  {/* Prayer Completion Section */}
              <View style={[styles.completionSection, {
                    backgroundColor: isDark 
                      ? 'rgba(255, 255, 255, 0.08)' 
                      : 'rgba(0, 0, 0, 0.04)',
                    borderWidth: 1,
                    borderColor: isDark 
                      ? 'rgba(255, 255, 255, 0.12)' 
                      : 'rgba(0, 0, 0, 0.08)',
                  }]}>
                  <View style={styles.completionHeader}>
                      <MaterialIcons name="auto-awesome" size={20} color={theme.text} />
                    <Text style={[styles.completionTitle, { color: theme.text }]}>
                        Ready to Complete?
                    </Text>
                  </View>
                  
                  <Text style={[styles.completionSubtitle, { color: theme.textSecondary }]}>
                      Take a moment to reflect on these verses and complete your prayer when ready.
                  </Text>

                  <TouchableOpacity
                    style={[styles.completeButton, {
                        backgroundColor: canComplete 
                          ? theme.primary
                          : (isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.15)'),
                        opacity: canComplete ? 1 : 0.6,
                        borderWidth: canComplete ? 0 : 1,
                        borderColor: isDark ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.2)'
                      }]}
                      onPress={onComplete}
                      disabled={!canComplete}
                  >
                    <MaterialIcons 
                        name="check-circle" 
                      size={24} 
                        color={canComplete ? '#ffffff' : theme.textSecondary} 
                      />
                      <Text style={[styles.completeButtonText, { 
                        color: canComplete ? '#ffffff' : theme.textSecondary 
                      }]}>
                        {canComplete ? 'Complete Prayer' : 
                         timeUntilAvailable || 'Not Available'}
                      </Text>
                      {canComplete && (
                        <View style={[styles.pointsBadge, { 
                          backgroundColor: 'rgba(255, 255, 255, 0.25)' 
                        }]}>
                          <Text style={[styles.pointsText, { color: '#ffffff' }]}>
                            +500 pts
                    </Text>
                      </View>
                    )}
                  </TouchableOpacity>
                  </View>
              </View>
            </ScrollView>
          </View>
          </Animated.View>
        </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContainer: {
    // Styles moved inline for theme support
  },
  safeArea: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
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
    marginBottom: 4,
    letterSpacing: 0.3,
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 32,
  },
  versesSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  versesSectionTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  verseCard: {
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  verseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  verseNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  verseNumberText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  verseReference: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  versionBadge: {
    fontSize: 11,
    fontWeight: '700',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  verseText: {
    fontSize: 15,
    lineHeight: 22,
    fontStyle: 'italic',
  },
  simpleLoadingBox: {
    marginTop: 14,
    padding: 18,
    borderRadius: 14,
    alignItems: 'center',
  },
  simpleTextBox: {
    marginTop: 14,
    padding: 18,
    borderRadius: 14,
  },
  simpleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 8,
  },
  simpleLabel: {
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  simpleText: {
    fontSize: 15,
    lineHeight: 22,
    fontStyle: 'italic',
  },
  verseActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 18,
    paddingTop: 18,
  },
  verseActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 22,
    gap: 7,
  },
  verseActionText: {
    fontSize: 14,
    fontWeight: '600',
  },
  completionSection: {
    padding: 22,
    borderRadius: 18,
    marginTop: 24,
  },
  completionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  completionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  completionSubtitle: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 20,
    textAlign: 'center',
  },
  completeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 18,
    borderRadius: 18,
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 6,
  },
  completeButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  pointsBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  pointsText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
});

export default PrayerDetailModal;

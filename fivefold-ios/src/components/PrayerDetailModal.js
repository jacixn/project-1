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
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../contexts/ThemeContext';
import { hapticFeedback } from '../utils/haptics';
import bibleAudioService from '../services/bibleAudioService';
import chatterboxService from '../services/chatterboxService';
import googleTtsService from '../services/googleTtsService';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const PrayerDetailModal = ({ 
  visible, 
  onClose, 
  prayer, 
  canComplete,
  onComplete,
  onSimplify,
  onDiscuss,
  onNavigateToBible = () => {},
  simpleVerseText,
  loadingSimple,
  timeUntilAvailable,
  fetchedVerses = {},
  bibleVersion = 'KJV',
  loadingVerses = false
}) => {
  const { theme, isDark } = useTheme();
  
  const slideAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const panY = useRef(new Animated.Value(0)).current;

  // Audio state
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speakingVerseIndex, setSpeakingVerseIndex] = useState(null);
  const [isLoadingAudio, setIsLoadingAudio] = useState(false);
  const [loadingAudioVerseIndex, setLoadingAudioVerseIndex] = useState(null);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    if (!visible) {
      panY.setValue(0);
      stopAllAudio();
    }
  }, [visible]);

  // TTS state listeners
  useEffect(() => {
    const handleChatterboxState = (state) => {
      if (state === 'finished' || state === 'stopped' || state === 'error') {
        setIsSpeaking(false);
        setSpeakingVerseIndex(null);
        setIsLoadingAudio(false);
        setLoadingAudioVerseIndex(null);
        setIsPaused(false);
      } else if (state === 'playing') {
        setIsLoadingAudio(false);
        setLoadingAudioVerseIndex(null);
        setIsSpeaking(true);
      } else if (state === 'loading') {
        setIsLoadingAudio(true);
      }
    };

    const handleGoogleTtsState = (state) => {
      if (state === 'finished' || state === 'stopped' || state === 'error') {
        setIsSpeaking(false);
        setSpeakingVerseIndex(null);
        setIsLoadingAudio(false);
        setLoadingAudioVerseIndex(null);
        setIsPaused(false);
      } else if (state === 'playing') {
        setIsLoadingAudio(false);
        setLoadingAudioVerseIndex(null);
        setIsSpeaking(true);
      } else if (state === 'loading') {
        setIsLoadingAudio(true);
      }
    };

    chatterboxService.onStateChange = handleChatterboxState;
    googleTtsService.onStateChange = handleGoogleTtsState;

    return () => {
      chatterboxService.onStateChange = null;
      googleTtsService.onStateChange = null;
    };
  }, []);

  const stopAllAudio = async () => {
    try {
      await chatterboxService.stop();
      await googleTtsService.stop();
    } catch (e) {}
    setIsSpeaking(false);
    setSpeakingVerseIndex(null);
    setIsLoadingAudio(false);
    setLoadingAudioVerseIndex(null);
    setIsPaused(false);
  };

  const speakVerse = async (verseText, verseRef, verseIndex) => {
    try {
      if ((isSpeaking && speakingVerseIndex === verseIndex) ||
          (isLoadingAudio && loadingAudioVerseIndex === verseIndex)) {
        await stopAllAudio();
        return;
      }

      await stopAllAudio();

      const cleanText = `${verseRef}. ${verseText}`
        .replace(/\*\*/g, '')
        .replace(/\n\n+/g, '. ')
        .replace(/\n/g, ' ')
        .trim();

      setIsLoadingAudio(true);
      setLoadingAudioVerseIndex(verseIndex);
      setSpeakingVerseIndex(verseIndex);
      hapticFeedback.light();

      await new Promise(resolve => setTimeout(resolve, 100));

      const useGoogleTts = bibleAudioService.isUsingGoogleTTS();

      if (useGoogleTts) {
        const success = await googleTtsService.speak(cleanText);
        if (!success) {
          setIsLoadingAudio(false);
          setLoadingAudioVerseIndex(null);
          setIsSpeaking(false);
          setSpeakingVerseIndex(null);
        }
      } else {
        const success = await chatterboxService.speak(cleanText);
        if (!success) {
          setIsLoadingAudio(false);
          setLoadingAudioVerseIndex(null);
          setIsSpeaking(false);
          setSpeakingVerseIndex(null);
        }
      }
    } catch (error) {
      console.error('Error speaking verse:', error);
      await stopAllAudio();
    }
  };

  const pauseAudio = async () => {
    try {
      await googleTtsService.pause();
      setIsPaused(true);
      hapticFeedback.light();
    } catch (e) {}
  };

  const resumeAudio = async () => {
    try {
      await googleTtsService.resume();
      setIsPaused(false);
      hapticFeedback.light();
    } catch (e) {}
  };

  const stopAudio = async () => {
    hapticFeedback.light();
    await stopAllAudio();
  };

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

  useEffect(() => {
    if (visible) {
      slideAnim.setValue(0);
      fadeAnim.setValue(0);
      
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
      slideAnim.setValue(0);
      fadeAnim.setValue(0);
    }
  }, [visible]);

  const modalTranslateY = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1000, 0],
  });

  const combinedTranslateY = Animated.add(modalTranslateY, panY);

  const handleBackdropClose = () => {
    stopAllAudio();
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

  const handleGoToVersePress = (verseRef) => {
    hapticFeedback.medium();
    stopAllAudio();
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
      setTimeout(() => {
        try {
          onNavigateToBible(verseRef);
        } catch (e) {
          console.error('onNavigateToBible failed', e);
        }
      }, 50);
    });
  };

  const [guideMode, setGuideMode] = useState('how');

  const actsItems = [
    { key: 'A', title: 'Acknowledging', text: 'Start by praising God for who He is and what He has done.', icon: 'wb-sunny' },
    { key: 'C', title: 'Confession', text: 'Be honest about your sins and shortcomings. Ask for forgiveness.', icon: 'favorite-border' },
    { key: 'T', title: 'Thanksgiving', text: 'Thank God for specific blessings and His faithfulness today.', icon: 'emoji-events' },
    { key: 'S', title: 'Supplication', text: 'Bring your needs and the needs of others before God.', icon: 'people' },
  ];

  const howToPrayItems = [
    { key: '1', title: 'Address God', ref: 'Matthew 6:9', text: 'Start by acknowledging God as your Father and honoring His name.', icon: 'person' },
    { key: '2', title: 'Praise and Worship', ref: 'Psalm 100:4', text: 'Enter His presence with thanksgiving and praise for who He is.', icon: 'music-note' },
    { key: '3', title: 'Confess', ref: '1 John 1:9', text: 'Be honest about your sins and ask for forgiveness.', icon: 'healing' },
    { key: '4', title: 'Present Requests', ref: 'Philippians 4:6', text: 'Share your needs with God with gratitude.', icon: 'mail-outline' },
    { key: '5', title: 'Thank Him', ref: '1 Thessalonians 5:18', text: 'Give thanks in all circumstances — He is faithful.', icon: 'volunteer-activism' },
    { key: '6', title: 'Listen', ref: 'John 10:27', text: 'Be still, listen for His guidance, and respond in faith.', icon: 'hearing' },
  ];

  if (!prayer || !visible) return null;

  const renderAudioButton = (verseIndex) => {
    const isThisVerseSpeaking = isSpeaking && speakingVerseIndex === verseIndex;
    const isThisVerseLoading = isLoadingAudio && loadingAudioVerseIndex === verseIndex;

    if (isThisVerseLoading) {
      return (
        <TouchableOpacity
          onPress={() => stopAudio()}
          style={[styles.audioButton, { backgroundColor: theme.primary }]}
          activeOpacity={0.7}
        >
          <ActivityIndicator size={14} color="#fff" />
          <Text style={styles.audioButtonTextActive}>Loading...</Text>
        </TouchableOpacity>
      );
    }

    if (isThisVerseSpeaking) {
      return (
        <View style={{ flexDirection: 'row', gap: 6 }}>
          <TouchableOpacity
            onPress={isPaused ? resumeAudio : pauseAudio}
            style={[styles.audioButton, { backgroundColor: theme.primary }]}
            activeOpacity={0.7}
          >
            <MaterialIcons name={isPaused ? 'play-arrow' : 'pause'} size={15} color="#fff" />
            <Text style={styles.audioButtonTextActive}>{isPaused ? 'Resume' : 'Pause'}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={stopAudio}
            style={[styles.audioButton, { 
              backgroundColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)',
            }]}
            activeOpacity={0.7}
          >
            <MaterialIcons name="stop" size={15} color={theme.text} />
            <Text style={[styles.audioButtonText, { color: theme.text }]}>Stop</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return null;
  };

  const accentGradient = [theme.primary, theme.primaryLight || theme.primary];

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="none"
      onRequestClose={handleBackdropClose}
      statusBarTranslucent={true}
    >
      <View style={[styles.modalOverlay, { justifyContent: 'flex-end' }]}>
        <Animated.View style={{ ...StyleSheet.absoluteFillObject, opacity: fadeAnim }}>
          <TouchableOpacity 
            style={styles.backdrop}
            activeOpacity={0.7}
            onPress={handleBackdropClose}
          />
        </Animated.View>

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
          >
            {/* Header */}
            <View style={styles.headerSection}>
              <LinearGradient
                colors={[`${theme.primary}18`, `${theme.primary}08`, 'transparent']}
                style={styles.headerGradientBg}
              />
              <View style={[styles.headerIconCircle, { backgroundColor: `${theme.primary}15` }]}>
                <MaterialIcons name="favorite" size={28} color={theme.primary} />
              </View>
              <Text style={[styles.headerTitle, { color: theme.text }]}>
                {prayer.name}
              </Text>
              <View style={styles.headerMeta}>
                <View style={[styles.headerTimePill, { backgroundColor: `${theme.primary}12`, borderColor: `${theme.primary}30` }]}>
                  <MaterialIcons name="schedule" size={14} color={theme.primary} />
                  <Text style={[styles.headerTimeText, { color: theme.primary }]}>
                    {prayer.time}
                  </Text>
                </View>
              </View>
            </View>

            {/* Verses Section */}
            <View style={styles.sectionContainer}>
              <View style={styles.sectionHeader}>
                <LinearGradient
                  colors={accentGradient}
                  style={styles.sectionIconBg}
                >
                  <MaterialIcons name="auto-stories" size={16} color="#fff" />
                </LinearGradient>
                <Text style={[styles.sectionTitle, { color: theme.text }]}>
                  Today's Verses
                </Text>
              </View>
              
              {prayer.verses && prayer.verses.map((verse, index) => {
                const verseDisplayText = loadingVerses 
                  ? 'Loading verse...' 
                  : (fetchedVerses[verse.reference]?.text || verse.text || '').replace(/\s+/g, ' ').trim();

                return (
                  <View key={`${prayer.id}-${index}`} style={[styles.verseCard, { 
                    backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#FAFBFF',
                    borderColor: isDark ? 'rgba(255,255,255,0.1)' : `${theme.primary}18`,
                  }]}>
                    {/* Accent strip */}
                    <LinearGradient
                      colors={accentGradient}
                      style={styles.verseAccentStrip}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 0, y: 1 }}
                    />

                    <View style={styles.verseInner}>
                      {/* Verse header */}
                      <View style={styles.verseHeader}>
                        <View style={styles.verseHeaderLeft}>
                          <LinearGradient
                            colors={accentGradient}
                            style={styles.verseNumberBadge}
                          >
                            <Text style={styles.verseNumberText}>{index + 1}</Text>
                          </LinearGradient>
                          <View>
                            <Text style={[styles.verseReference, { color: theme.text }]}>
                              {verse.reference}
                            </Text>
                          </View>
                        </View>
                        <View style={[styles.versionBadge, { 
                          backgroundColor: `${theme.primary}10`,
                          borderColor: `${theme.primary}25`
                        }]}>
                          <Text style={[styles.versionBadgeText, { color: theme.primary }]}>
                            {bibleVersion}
                          </Text>
                        </View>
                      </View>

                      {/* Verse text */}
                      <Text style={[styles.verseText, { color: isDark ? 'rgba(255,255,255,0.88)' : '#2D3748' }]}>
                        {verseDisplayText}
                      </Text>

                      {/* Action buttons — equal-width row */}
                      <View style={[styles.verseActions, {
                        borderTopColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
                      }]}>
                        {/* Listen */}
                        <TouchableOpacity
                          style={[styles.actionBtn, { 
                            backgroundColor: (isSpeaking && speakingVerseIndex === index)
                              ? theme.primary
                              : (isDark ? 'rgba(255,255,255,0.08)' : `${theme.primary}0D`),
                          }]}
                          onPress={() => speakVerse(verseDisplayText, verse.reference, index)}
                          activeOpacity={0.7}
                        >
                          <MaterialIcons 
                            name={(isSpeaking && speakingVerseIndex === index) ? 'graphic-eq' : 'volume-up'} 
                            size={16} 
                            color={(isSpeaking && speakingVerseIndex === index) ? '#fff' : theme.primary} 
                          />
                          <Text style={[styles.actionBtnText, { 
                            color: (isSpeaking && speakingVerseIndex === index) ? '#fff' : theme.primary
                          }]}>
                            Listen
                          </Text>
                        </TouchableOpacity>

                        {/* Discuss */}
                        <TouchableOpacity
                          style={[styles.actionBtn, { 
                            backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : `${theme.primary}0D`,
                          }]}
                          onPress={(e) => {
                            if (e) e.stopPropagation();
                            const displayedText = loadingVerses
                              ? ''
                              : (fetchedVerses[verse.reference]?.text || verse.text || '').replace(/\s+/g, ' ').trim();
                            const displayedVersion =
                              fetchedVerses[verse.reference]?.version || bibleVersion || 'KJV';
                            onDiscuss({
                              ...verse,
                              text: displayedText,
                              content: displayedText,
                              reference: verse.reference,
                              version: displayedVersion,
                            });
                          }}
                          activeOpacity={0.7}
                        >
                          <MaterialIcons name="chat-bubble-outline" size={16} color={theme.primary} />
                          <Text style={[styles.actionBtnText, { color: theme.primary }]}>
                            Discuss
                          </Text>
                        </TouchableOpacity>

                        {/* Go to Verse */}
                        <TouchableOpacity
                          style={[styles.actionBtn, { 
                            backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : `${theme.primary}0D`,
                          }]}
                          onPress={(e) => {
                            if (e) e.stopPropagation();
                            handleGoToVersePress(verse.reference);
                          }}
                          activeOpacity={0.7}
                        >
                          <MaterialIcons name="menu-book" size={16} color={theme.primary} />
                          <Text style={[styles.actionBtnText, { color: theme.primary }]}>
                            Open
                          </Text>
                        </TouchableOpacity>
                      </View>

                      {/* Audio playback controls */}
                      {((isSpeaking && speakingVerseIndex === index) || (isLoadingAudio && loadingAudioVerseIndex === index)) && (
                        <View style={styles.audioControlsRow}>
                          {renderAudioButton(index)}
                        </View>
                      )}
                    </View>
                  </View>
                );
              })}
            </View>

            {/* Prayer Guide Section */}
            <View style={styles.sectionContainer}>
              {/* Guide toggle pills */}
              <View style={styles.guidePillRow}>
                <TouchableOpacity
                  style={[
                    styles.guidePill,
                    guideMode === 'acts' && { backgroundColor: `${theme.primary}15`, borderColor: `${theme.primary}40` },
                    { borderColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)' }
                  ]}
                  onPress={() => setGuideMode('acts')}
                  activeOpacity={0.8}
                >
                  <MaterialIcons name="flare" size={14} color={guideMode === 'acts' ? theme.primary : theme.textSecondary} />
                  <Text style={[
                    styles.guidePillText,
                    { color: guideMode === 'acts' ? theme.primary : theme.textSecondary }
                  ]}>
                    A.C.T.S.
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.guidePill,
                    guideMode === 'how' && { backgroundColor: `${theme.primary}15`, borderColor: `${theme.primary}40` },
                    { borderColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)' }
                  ]}
                  onPress={() => setGuideMode('how')}
                  activeOpacity={0.8}
                >
                  <MaterialIcons name="lightbulb-outline" size={14} color={guideMode === 'how' ? theme.primary : theme.textSecondary} />
                  <Text style={[
                    styles.guidePillText,
                    { color: guideMode === 'how' ? theme.primary : theme.textSecondary }
                  ]}>
                    How to Pray
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Guide content card */}
              <View style={[styles.guideCard, { 
                backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#FAFBFF',
                borderColor: isDark ? 'rgba(255,255,255,0.1)' : `${theme.primary}15`,
              }]}>
                <View style={styles.guideCardHeader}>
                  <LinearGradient
                    colors={accentGradient}
                    style={styles.sectionIconBg}
                  >
                    <MaterialIcons 
                      name={guideMode === 'acts' ? 'flare' : 'lightbulb-outline'} 
                      size={16} 
                      color="#fff" 
                    />
                  </LinearGradient>
                  <Text style={[styles.guideCardTitle, { color: theme.text }]}>
                    {guideMode === 'acts' ? 'Pray with A.C.T.S.' : 'How to Pray'}
                  </Text>
                </View>

                {(guideMode === 'acts' ? actsItems : howToPrayItems).map((item) => (
                  <View key={item.key} style={[styles.guideRow, {
                    borderBottomColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
                  }]}>
                    <View style={[styles.guideStepBadge, { 
                      backgroundColor: `${theme.primary}10`,
                      borderColor: `${theme.primary}25`
                    }]}>
                      <MaterialIcons name={item.icon} size={18} color={theme.primary} />
                    </View>
                    <View style={styles.guideStepContent}>
                      <Text style={[styles.guideStepTitle, { color: theme.text }]}>
                        {guideMode === 'acts' ? item.title : `${item.key}. ${item.title}`}
                      </Text>
                      <Text style={[styles.guideStepText, { color: theme.textSecondary }]}>
                        {item.text}
                      </Text>
                      {item.ref ? (
                        <TouchableOpacity
                          onPress={() => handleGoToVersePress(item.ref)}
                          activeOpacity={0.7}
                          style={styles.guideRefTouch}
                        >
                          <MaterialIcons name="open-in-new" size={12} color={theme.primary} />
                          <Text style={[styles.guideRefText, { color: theme.primary }]}>
                            {item.ref}
                          </Text>
                        </TouchableOpacity>
                      ) : null}
                    </View>
                  </View>
                ))}
              </View>
            </View>

            {/* Completion Section */}
            <View style={[styles.completionCard, {
              backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#FAFBFF',
              borderColor: isDark ? 'rgba(255,255,255,0.1)' : `${theme.primary}18`,
            }]}>
              <View style={styles.completionHeader}>
                <LinearGradient
                  colors={accentGradient}
                  style={styles.sectionIconBg}
                >
                  <MaterialIcons name="check-circle-outline" size={16} color="#fff" />
                </LinearGradient>
                <Text style={[styles.completionTitle, { color: theme.text }]}>
                  Ready to Complete?
                </Text>
              </View>
              
              <Text style={[styles.completionSubtitle, { color: theme.textSecondary }]}>
                Take a moment to reflect on these verses and complete your prayer when you're ready.
              </Text>

              <TouchableOpacity
                style={[styles.completeButton, {
                  opacity: canComplete ? 1 : 0.5,
                }]}
                onPress={onComplete}
                disabled={!canComplete}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={canComplete ? accentGradient : [
                    isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)',
                    isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)',
                  ]}
                  style={styles.completeButtonGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  <MaterialIcons 
                    name="check-circle" 
                    size={22} 
                    color={canComplete ? '#fff' : theme.textSecondary} 
                  />
                  <Text style={[styles.completeButtonText, { 
                    color: canComplete ? '#fff' : theme.textSecondary 
                  }]}>
                    {canComplete ? 'Complete Prayer' : 
                     timeUntilAvailable || 'Not Available'}
                  </Text>
                  {canComplete && (
                    <View style={styles.pointsBadge}>
                      <Text style={styles.pointsText}>+175 pts</Text>
                    </View>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </ScrollView>
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
    height: '94%',
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
    paddingTop: 8,
    paddingBottom: 24,
    paddingHorizontal: 20,
    position: 'relative',
    overflow: 'hidden',
  },
  headerGradientBg: {
    ...StyleSheet.absoluteFillObject,
  },
  headerIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: 0.3,
    marginBottom: 8,
    textAlign: 'center',
  },
  headerMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTimePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  headerTimeText: {
    fontSize: 13,
    fontWeight: '600',
  },

  // Section generic
  sectionContainer: {
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 10,
  },
  sectionIconBg: {
    width: 30,
    height: 30,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 19,
    fontWeight: '700',
    letterSpacing: 0.2,
  },

  // Verse cards
  verseCard: {
    borderRadius: 18,
    marginBottom: 16,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
    flexDirection: 'row',
  },
  verseAccentStrip: {
    width: 4,
  },
  verseInner: {
    flex: 1,
    padding: 18,
  },
  verseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  verseHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  verseNumberBadge: {
    width: 28,
    height: 28,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
  },
  verseNumberText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '800',
  },
  verseReference: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  versionBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  versionBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  verseText: {
    fontSize: 16,
    lineHeight: 25,
    fontStyle: 'italic',
    fontWeight: '400',
    letterSpacing: 0.1,
  },
  verseActions: {
    flexDirection: 'row',
    marginTop: 16,
    paddingTop: 14,
    borderTopWidth: 1,
    gap: 8,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 12,
    gap: 6,
  },
  actionBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },

  // Audio controls
  audioControlsRow: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  audioButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 16,
    gap: 5,
  },
  audioButtonText: {
    fontSize: 12,
    fontWeight: '600',
  },
  audioButtonTextActive: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },

  // Guide pills
  guidePillRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  guidePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 14,
    borderWidth: 1,
  },
  guidePillText: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.3,
  },

  // Guide card
  guideCard: {
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    marginBottom: 16,
  },
  guideCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  guideCardTitle: {
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  guideRow: {
    flexDirection: 'row',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    alignItems: 'flex-start',
  },
  guideStepBadge: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  guideStepContent: {
    flex: 1,
  },
  guideStepTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 3,
  },
  guideStepText: {
    fontSize: 14,
    lineHeight: 20,
  },
  guideRefTouch: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 5,
  },
  guideRefText: {
    fontSize: 13,
    fontWeight: '700',
  },

  // Completion
  completionCard: {
    marginHorizontal: 20,
    padding: 22,
    borderRadius: 18,
    borderWidth: 1,
    marginBottom: 16,
  },
  completionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  completionTitle: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  completionSubtitle: {
    fontSize: 14,
    lineHeight: 21,
    marginBottom: 18,
  },
  completeButton: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  completeButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    gap: 10,
  },
  completeButtonText: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  pointsBadge: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  pointsText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
  },
});

export default PrayerDetailModal;

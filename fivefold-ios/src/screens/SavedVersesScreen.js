/**
 * Saved Verses Screen
 * 
 * Displays user's saved Bible verses with search, sort, and actions.
 * Extracted from ProfileTab modal for stack navigation support.
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Platform,
  Alert,
  Animated,
  StyleSheet,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { useTheme } from '../contexts/ThemeContext';
import userStorage from '../utils/userStorage';
import { hapticFeedback } from '../utils/haptics';
import verseByReferenceService from '../services/verseByReferenceService';

const SavedVersesScreen = ({ navigation }) => {
  const { theme, isDark } = useTheme();
  
  const [savedVersesList, setSavedVersesList] = useState([]);
  const [savedVersesSearch, setSavedVersesSearch] = useState('');
  const [savedVersesSort, setSavedVersesSort] = useState('desc');
  const [refreshingSavedVerses, setRefreshingSavedVerses] = useState(false);
  const [currentBibleVersion, setCurrentBibleVersion] = useState('nlt');

  const modalTextColor = isDark ? '#FFFFFF' : '#1A1A2E';
  const modalTextSecondaryColor = isDark ? 'rgba(255,255,255,0.65)' : 'rgba(0,0,0,0.55)';
  const modalTextTertiaryColor = isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.35)';

  // Scroll animation for search bar
  const savedVersesSearchAnim = useRef(new Animated.Value(1)).current;
  const lastScrollY = useRef(0);
  const scrollDirection = useRef('up');

  const handleSavedVersesScroll = (event) => {
    const currentScrollY = event.nativeEvent.contentOffset.y;
    const direction = currentScrollY > lastScrollY.current ? 'down' : 'up';
    
    if (direction !== scrollDirection.current && Math.abs(currentScrollY - lastScrollY.current) > 10) {
      scrollDirection.current = direction;
      
      Animated.timing(savedVersesSearchAnim, {
        toValue: direction === 'down' ? 0 : 1,
        duration: 250,
        useNativeDriver: false,
      }).start();
    }
    
    lastScrollY.current = currentScrollY;
  };

  const loadSavedVersesQuick = async () => {
    try {
      const savedVersesData = await userStorage.getRaw('savedBibleVerses');
      if (savedVersesData) {
        const verses = JSON.parse(savedVersesData);
        setSavedVersesList(verses);
      } else {
        setSavedVersesList([]);
      }
      
      const version = await userStorage.getRaw('selectedBibleVersion') || 'nlt';
      setCurrentBibleVersion(version);
    } catch (error) {
      console.error('Error quick loading saved verses:', error);
    }
  };

  const loadSavedVerses = async (refreshAll = false) => {
    try {
      const savedVersesData = await userStorage.getRaw('savedBibleVerses');
      if (savedVersesData) {
        const verses = JSON.parse(savedVersesData);
        setSavedVersesList(verses);
        
        const preferredVersion = await userStorage.getRaw('selectedBibleVersion') || 'nlt';
        setCurrentBibleVersion(preferredVersion);
        
        const BATCH_SIZE = refreshAll ? verses.length : 15;
        const versesToFetch = verses.slice(0, BATCH_SIZE);
        const updatedVerses = [...verses];
        let refreshedCount = 0;
        
        for (let i = 0; i < versesToFetch.length; i++) {
          const verse = versesToFetch[i];
          try {
            if (verse.version === 'KEY_VERSES') continue;
            
            const { text, version } = await verseByReferenceService.getVerseByReference(
              verse.reference,
              preferredVersion
            );
              
            updatedVerses[i] = {
              ...verse,
              text: text,
              version: version.toLowerCase(),
              originalVersion: verse.originalVersion || verse.version,
            };
            refreshedCount++;
          } catch (fetchError) {
            console.log(`Could not fetch verse:`, verse.reference);
          }
        }
        
        setSavedVersesList(updatedVerses);
        
        if (refreshedCount > 0) {
          await userStorage.setRaw('savedBibleVerses', JSON.stringify(updatedVerses));
        }
      } else {
        setSavedVersesList([]);
      }
    } catch (error) {
      console.error('Error loading saved verses:', error);
    }
  };

  const refreshSavedVerses = async () => {
    setRefreshingSavedVerses(true);
    await loadSavedVerses(true);
    setRefreshingSavedVerses(false);
  };

  const handleNavigateToVerse = (verseRef) => {
    hapticFeedback.medium();
    navigation.navigate('BibleReader', { verseRef });
  };

  const handleDiscussVerse = (verse) => {
    hapticFeedback.medium();
    navigation.navigate('FriendChat', {
      initialVerse: {
        text: verse.text || verse.content,
        reference: verse.reference,
      },
    });
  };

  useEffect(() => {
    loadSavedVersesQuick();
  }, []);

  // Compute filtered count for header subtitle
  const filteredCount = savedVersesList.filter(v => {
    if (!savedVersesSearch.trim()) return true;
    const searchLower = savedVersesSearch.toLowerCase();
    const text = (v.text || v.content || '').toLowerCase();
    const ref = (v.reference || '').toLowerCase();
    return text.includes(searchLower) || ref.includes(searchLower);
  }).length;

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      {/* Content - ScrollView starts from top */}
      <ScrollView 
        style={{ flex: 1 }} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ 
          paddingHorizontal: 16,
          paddingBottom: 40,
        }}
        onScroll={handleSavedVersesScroll}
        scrollEventThrottle={16}
      >
        {/* Animated spacer that shrinks with search bar */}
        <Animated.View style={{
          height: savedVersesSearchAnim.interpolate({
            inputRange: [0, 1],
            outputRange: [Platform.OS === 'ios' ? 115 : 95, Platform.OS === 'ios' ? 173 : 143],
          }),
        }} />

        {savedVersesList.length === 0 ? (
          <View style={{
            alignItems: 'center',
            justifyContent: 'center',
            paddingVertical: 60
          }}>
            <View style={{
              width: 80,
              height: 80,
              borderRadius: 40,
              backgroundColor: `${theme.primary}15`,
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 20
            }}>
              <MaterialIcons name="bookmark-border" size={40} color={theme.primary} />
            </View>
            <Text style={{
              fontSize: 20,
              fontWeight: '700',
              color: modalTextColor,
              marginBottom: 8
            }}>
              No Saved Verses Yet
            </Text>
            <Text style={{
              fontSize: 15,
              color: modalTextSecondaryColor,
              textAlign: 'center',
              lineHeight: 22
            }}>
              Tap the bookmark icon on any verse{'\n'}to save it for later
            </Text>
          </View>
        ) : (
          (() => {
            const filteredVerses = savedVersesList.filter(v => {
              if (!savedVersesSearch.trim()) return true;
              const searchLower = savedVersesSearch.toLowerCase();
              const text = (v.text || v.content || '').toLowerCase();
              const ref = (v.reference || '').toLowerCase();
              return text.includes(searchLower) || ref.includes(searchLower);
            });
            
            const sortedVerses = savedVersesSort === 'desc' ? [...filteredVerses].reverse() : filteredVerses;
            
            if (sortedVerses.length === 0 && savedVersesSearch) {
              return (
                <View style={{
                  alignItems: 'center',
                  justifyContent: 'center',
                  paddingVertical: 40
                }}>
                  <MaterialIcons name="search-off" size={48} color={theme.textTertiary} />
                  <Text style={{
                    fontSize: 16,
                    fontWeight: '600',
                    color: modalTextSecondaryColor,
                    marginTop: 16
                  }}>
                    No results for "{savedVersesSearch}"
                  </Text>
                </View>
              );
            }
            
            return sortedVerses.map((verse, index) => (
              <View 
                key={verse.id || index} 
                style={{
                  backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#FFFFFF',
                  borderRadius: 20,
                  padding: 20,
                  marginBottom: 14,
                  shadowColor: theme.primary,
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: isDark ? 0.15 : 0.08,
                  shadowRadius: 12,
                  elevation: 4,
                  borderWidth: isDark ? 1 : 0,
                  borderColor: 'rgba(255,255,255,0.08)'
                }}
              >
                {/* Header Row */}
                <View style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  marginBottom: 14
                }}>
                  <View style={{
                    width: 42,
                    height: 42,
                    borderRadius: 21,
                    backgroundColor: `${theme.primary}15`,
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginRight: 12
                  }}>
                    <MaterialIcons name="bookmark" size={22} color={theme.primary} />
                  </View>
                  
                  <View style={{ flex: 1 }}>
                    <Text style={{
                      fontSize: 17,
                      fontWeight: '700',
                      color: theme.primary,
                      letterSpacing: 0.3
                    }}>
                      {verse.reference}
                    </Text>
                    <Text style={{
                      fontSize: 12,
                      fontWeight: '600',
                      color: modalTextTertiaryColor,
                      marginTop: 2,
                      textTransform: 'uppercase',
                      letterSpacing: 0.5
                    }}>
                      {currentBibleVersion?.toUpperCase() || verse.version?.toUpperCase() || 'NLT'}
                    </Text>
                  </View>
                </View>
                
                {/* Verse Text */}
                <Text style={{
                  fontSize: 16,
                  color: modalTextColor,
                  lineHeight: 26,
                  marginBottom: 18,
                  fontWeight: '500'
                }}>
                  {verse.text || verse.content}
                </Text>
              
                {/* Action Buttons Row */}
                <View style={{
                  flexDirection: 'row',
                  gap: 10
                }}>
                  {/* Remove Button */}
                  <TouchableOpacity
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 22,
                      backgroundColor: `${theme.error}15`,
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                    onPress={() => {
                      hapticFeedback.light();
                      Alert.alert(
                        'Remove Saved Verse',
                        `Are you sure you want to remove "${verse.reference}" from your saved verses?`,
                        [
                          { text: 'Cancel', style: 'cancel' },
                          {
                            text: 'Remove',
                            style: 'destructive',
                            onPress: async () => {
                              hapticFeedback.medium();
                              const newList = savedVersesList.filter(v => v.id !== verse.id);
                              setSavedVersesList(newList);
                              await userStorage.setRaw('savedBibleVerses', JSON.stringify(newList));
                              const stats = await userStorage.getRaw('userStats');
                              const userStatsObj = stats ? JSON.parse(stats) : {};
                              userStatsObj.savedVerses = newList.length;
                              await userStorage.setRaw('userStats', JSON.stringify(userStatsObj));
                            }
                          }
                        ]
                      );
                    }}
                    activeOpacity={0.7}
                    delayPressIn={0}
                  >
                    <MaterialIcons name="delete-outline" size={20} color={theme.error} />
                  </TouchableOpacity>

                  {/* Discuss Button */}
                  <TouchableOpacity
                    style={{
                      flex: 1,
                      height: 44,
                      borderRadius: 22,
                      backgroundColor: theme.primary,
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6,
                      shadowColor: theme.primary,
                      shadowOffset: { width: 0, height: 4 },
                      shadowOpacity: 0.3,
                      shadowRadius: 8
                    }}
                    onPress={() => handleDiscussVerse(verse)}
                    activeOpacity={0.7}
                    delayPressIn={0}
                  >
                    <MaterialIcons name="forum" size={18} color="#FFFFFF" />
                    <Text style={{
                      fontSize: 14,
                      fontWeight: '700',
                      color: '#FFFFFF'
                    }}>
                      Discuss
                    </Text>
                  </TouchableOpacity>

                  {/* Go to Verse Button */}
                  <TouchableOpacity
                    style={{
                      flex: 1,
                      height: 44,
                      borderRadius: 22,
                      backgroundColor: theme.success,
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6,
                      shadowColor: theme.success,
                      shadowOffset: { width: 0, height: 4 },
                      shadowOpacity: 0.3,
                      shadowRadius: 8
                    }}
                    onPress={() => handleNavigateToVerse(verse.reference)}
                    activeOpacity={0.7}
                    delayPressIn={0}
                  >
                    <MaterialIcons name="menu-book" size={18} color="#FFFFFF" />
                    <Text style={{
                      fontSize: 14,
                      fontWeight: '700',
                      color: '#FFFFFF'
                    }}>
                      Read
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            ));
          })()
        )}
      </ScrollView>

      {/* Premium Transparent Header — matches Achievements */}
      <BlurView 
        intensity={50} 
        tint={isDark ? 'dark' : 'light'} 
        style={{ 
          position: 'absolute', 
          top: 0, 
          left: 0, 
          right: 0, 
          zIndex: 1000,
        }}
      >
        <View style={{ height: Platform.OS === 'ios' ? 54 : 24 }} />
        
        <Animated.View style={{ paddingHorizontal: 16, paddingBottom: 4 }}>
          {/* Title row */}
          <View style={{ 
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}>
            <TouchableOpacity
              onPress={() => navigation.canGoBack() ? navigation.goBack() : navigation.navigate('Main')}
              style={{ 
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 1,
              }}
              activeOpacity={0.7}
            >
              <MaterialIcons name="arrow-back-ios-new" size={18} color={theme.primary} />
            </TouchableOpacity>
              
            <View style={{ 
              position: 'absolute',
              left: 0,
              right: 0,
              alignItems: 'center',
            }}>
              <Text style={{ 
                color: theme.text, 
                fontSize: 17, 
                fontWeight: '700',
                letterSpacing: 0.3,
              }}>
                Saved Verses
              </Text>
              <Text style={{ color: theme.textSecondary, fontSize: 12, marginTop: 2 }}>
                {filteredCount} verse{filteredCount !== 1 ? 's' : ''}{savedVersesSearch.trim() ? ' found' : ''}
              </Text>
            </View>
              
            <TouchableOpacity
              onPress={() => {
                hapticFeedback.selection();
                setSavedVersesSort(prev => prev === 'desc' ? 'asc' : 'desc');
              }}
              style={{ 
                width: 36,
                height: 36,
                borderRadius: 18,
                backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 1,
              }}
              activeOpacity={0.7}
            >
              <MaterialIcons 
                name={savedVersesSort === 'desc' ? 'arrow-downward' : 'arrow-upward'} 
                size={20} 
                color={theme.primary} 
              />
            </TouchableOpacity>
          </View>
          
          {/* Collapsible Search bar */}
          <Animated.View style={{
            height: savedVersesSearchAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [0, 58],
            }),
            opacity: savedVersesSearchAnim,
            overflow: 'hidden',
          }}>
            <View style={{
              backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)',
              borderRadius: 14,
              paddingHorizontal: 14,
              paddingVertical: 11,
              flexDirection: 'row',
              alignItems: 'center',
              borderWidth: 1,
              borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)',
              marginTop: 16,
            }}>
              <MaterialIcons name="search" size={20} color={theme.textTertiary} />
              <TextInput
                value={savedVersesSearch}
                onChangeText={setSavedVersesSearch}
                placeholder="Search verses or references..."
                placeholderTextColor={theme.textTertiary}
                style={{
                  flex: 1,
                  fontSize: 15,
                  color: theme.text,
                  marginLeft: 10,
                  paddingVertical: 2,
                }}
              />
              {savedVersesSearch.length > 0 && (
                <TouchableOpacity
                  onPress={() => setSavedVersesSearch('')}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: 12,
                    backgroundColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <MaterialIcons name="close" size={14} color={theme.text} />
                </TouchableOpacity>
              )}
            </View>
          </Animated.View>
        </Animated.View>
      </BlurView>
    </View>
  );
};

export default SavedVersesScreen;

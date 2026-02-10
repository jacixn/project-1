/**
 * Highlights Screen
 * 
 * Displays highlighted Bible verses grouped by color with rename support.
 * Extracted from ProfileTab modal for stack navigation support.
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Platform,
  Alert,
  KeyboardAvoidingView,
  DeviceEventEmitter,
  StyleSheet,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../contexts/ThemeContext';
import userStorage from '../utils/userStorage';
import { hapticFeedback } from '../utils/haptics';
import VerseDataManager from '../utils/verseDataManager';
import verseByReferenceService from '../services/verseByReferenceService';

const HighlightsScreen = ({ navigation }) => {
  const { theme, isDark } = useTheme();
  
  const [highlightedVerses, setHighlightedVerses] = useState([]);
  const [selectedHighlightColor, setSelectedHighlightColor] = useState(null);
  const [highlightVersesWithText, setHighlightVersesWithText] = useState([]);
  const [customHighlightNames, setCustomHighlightNames] = useState({});
  const [highlightViewMode, setHighlightViewMode] = useState('compact');
  const [currentBibleVersion, setCurrentBibleVersion] = useState('nlt');
  
  // Rename state
  const [showRenameHighlight, setShowRenameHighlight] = useState(false);
  const [renameHighlightColor, setRenameHighlightColor] = useState(null);
  const [renameHighlightText, setRenameHighlightText] = useState('');

  const textColor = isDark ? '#FFFFFF' : '#1A1A2E';
  const textSecondaryColor = isDark ? 'rgba(255,255,255,0.65)' : 'rgba(0,0,0,0.55)';
  const textTertiaryColor = isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.35)';

  // Default color names lookup
  const defaultColorNames = {
    '#FFE135': 'Yellow', '#FF6B6B': 'Red', '#4DABF7': 'Blue', '#51CF66': 'Green',
    '#FFA94D': 'Orange', '#B197FC': 'Purple', '#F783AC': 'Pink', '#38D9A9': 'Teal',
    '#A9E34B': 'Lime', '#9775FA': 'Lavender', '#FFD43B': 'Gold', '#74C0FC': 'Sky',
    '#63E6BE': 'Mint', '#FFC078': 'Peach', '#DA77F2': 'Plum',
    '#FFF9C4': 'Yellow', '#C8E6C9': 'Green', '#BBDEFB': 'Blue', '#F8BBD0': 'Pink',
    '#FFE0B2': 'Orange', '#E1BEE7': 'Purple', '#FFCCCB': 'Red', '#B5EAD7': 'Mint',
    '#FFDAB9': 'Peach', '#E6E6FA': 'Lavender', '#D4F1A9': 'Lime', '#87CEEB': 'Sky',
    '#FFD1DC': 'Rose', '#C9DED4': 'Sage', '#FBCEB1': 'Apricot', '#C8A2C8': 'Lilac',
    '#FFF44F': 'Lemon', '#7FDBFF': 'Aqua', '#E0B0FF': 'Mauve', '#FFFDD0': 'Cream',
    '#B2DFDB': 'Teal', '#FFB3B3': 'Salmon', '#CCCCFF': 'Periwinkle', '#F7E7CE': 'Champagne',
    '#AFEEEE': 'Turquoise', '#FFE4E1': 'Blush', '#98FF98': 'Mint Green', '#89CFF0': 'Baby Blue',
    '#FFB6C1': 'Powder', '#FFFFCC': 'Butter', '#93E9BE': 'Seafoam', '#DA70D6': 'Orchid',
    '#FFD700': 'Honey', '#C1E1EC': 'Ice Blue', '#DE3163': 'Cherry', '#93C572': 'Pistachio',
    '#DDA0DD': 'Plum', '#FFCC00': 'Tangerine', '#F5DEB3': 'Sand', '#7FFFD4': 'Cyan',
    '#FF77FF': 'Magenta', '#FFDEAD': 'Melon', '#C4C3D0': 'Iris', '#FFE5B4': 'Gold',
    '#AFE1AF': 'Celadon', '#C9A0DC': 'Wisteria', '#FFEA00': 'Citrus', '#B0E0E6': 'Azure',
    '#F3E5AB': 'Vanilla', '#50C878': 'Emerald', '#9966CC': 'Amethyst', '#F0EAD6': 'Pearl',
    '#00A86B': 'Jade'
  };

  const getColorName = (hexColor) => {
    if (customHighlightNames[hexColor]) return customHighlightNames[hexColor];
    return defaultColorNames[hexColor] || 'Custom';
  };

  const getDefaultColorName = (hexColor) => {
    return defaultColorNames[hexColor] || 'Custom';
  };

  const groupHighlightsByColor = () => {
    const grouped = {};
    highlightedVerses.forEach(verse => {
      if (!grouped[verse.color]) grouped[verse.color] = [];
      grouped[verse.color].push(verse);
    });
    return grouped;
  };

  const loadHighlights = async () => {
    try {
      const allData = await VerseDataManager.getAllVerseData();
      const highlights = [];
      
      Object.entries(allData).forEach(([verseId, data]) => {
        if (data.highlights && data.highlights.length > 0) {
          const latestHighlight = data.highlights[data.highlights.length - 1];
          highlights.push({
            verseId,
            color: latestHighlight.color,
            verseReference: latestHighlight.verseReference || verseId,
            timestamp: latestHighlight.createdAt
          });
        }
      });
      
      setHighlightedVerses(highlights);
      
      const names = await VerseDataManager.getHighlightNames();
      setCustomHighlightNames(names);
      
      const mode = await userStorage.getRaw('highlightViewMode');
      if (mode) setHighlightViewMode(mode);
      
      const version = await userStorage.getRaw('selectedBibleVersion') || 'nlt';
      setCurrentBibleVersion(version);
    } catch (error) {
      console.error('Error loading highlights:', error);
    }
  };

  const loadVersesForColor = async (color) => {
    try {
      const versesInColor = highlightedVerses.filter(v => v.color === color);
      const versesWithText = [];
      
      for (const verse of versesInColor) {
        try {
          const verseData = await verseByReferenceService.getVerseByReference(verse.verseReference);
          const verseText = typeof verseData === 'string' ? verseData : (verseData?.text || 'Verse text not available');
          versesWithText.push({ ...verse, text: verseText });
        } catch (error) {
          versesWithText.push({ ...verse, text: 'Verse text not available' });
        }
      }
      
      setHighlightVersesWithText(versesWithText);
      setSelectedHighlightColor(color);
    } catch (error) {
      console.error('Error loading verses for color:', error);
    }
  };

  const saveHighlightViewMode = async (mode) => {
    try {
      await userStorage.setRaw('highlightViewMode', mode);
      setHighlightViewMode(mode);
      hapticFeedback.light();
    } catch (error) {
      console.error('Error saving highlight view mode:', error);
    }
  };

  const handleRenameHighlight = async () => {
    if (!renameHighlightColor || !renameHighlightText.trim()) return;
    try {
      hapticFeedback.success();
      await VerseDataManager.setHighlightName(renameHighlightColor, renameHighlightText.trim());
      setCustomHighlightNames(prev => ({ ...prev, [renameHighlightColor]: renameHighlightText.trim() }));
      setShowRenameHighlight(false);
      setRenameHighlightColor(null);
      setRenameHighlightText('');
    } catch (error) {
      console.error('Error renaming highlight:', error);
      Alert.alert('Error', 'Failed to rename highlight. Please try again.');
    }
  };

  const handleResetHighlightName = async (hexColor) => {
    try {
      hapticFeedback.light();
      await VerseDataManager.removeHighlightName(hexColor);
      setCustomHighlightNames(prev => {
        const updated = { ...prev };
        delete updated[hexColor];
        return updated;
      });
    } catch (error) {
      console.error('Error resetting highlight name:', error);
    }
  };

  const handleNavigateToVerse = (verseRef) => {
    hapticFeedback.medium();
    navigation.goBack();
    setTimeout(() => {
      DeviceEventEmitter.emit('openBibleFromScreen', { verseRef });
    }, 100);
  };

  const handleDiscussVerse = (verse) => {
    hapticFeedback.medium();
    navigation.goBack();
    setTimeout(() => {
      DeviceEventEmitter.emit('openAiChatFromScreen', {
        text: verse.text,
        reference: verse.verseReference
      });
    }, 100);
  };

  useEffect(() => {
    loadHighlights();
  }, []);

  const handleClose = () => {
    if (selectedHighlightColor) {
      setSelectedHighlightColor(null);
      setHighlightVersesWithText([]);
      hapticFeedback.light();
    } else {
      navigation.goBack();
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      {/* Content - ScrollView starts from top */}
      <ScrollView 
        style={{ flex: 1 }} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ 
          paddingHorizontal: 16, 
          paddingBottom: 40,
          paddingTop: Platform.OS === 'ios' ? 120 : 100,
        }}
      >
        {highlightedVerses.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialIcons name="palette" size={64} color={theme.textTertiary} />
            <Text style={[styles.emptyStateText, { color: textSecondaryColor, fontSize: 20, fontWeight: '700', marginTop: 24 }]}>
              No Highlights Yet
            </Text>
            <Text style={[styles.emptyStateSubtext, { color: textTertiaryColor, fontSize: 15, marginTop: 12, lineHeight: 22 }]}>
              Long-press any verse in the Bible and choose a color to highlight it
            </Text>
          </View>
        ) : !selectedHighlightColor ? (
          <View>
            {highlightViewMode === 'compact' && (
              <Text style={{
                fontSize: 12,
                fontWeight: '600',
                color: textTertiaryColor,
                marginBottom: 12,
                textTransform: 'uppercase',
                letterSpacing: 1
              }}>
                {Object.keys(groupHighlightsByColor()).length} Categories
              </Text>
            )}
            {Object.entries(groupHighlightsByColor()).map(([color, verses], index) => (
              highlightViewMode === 'compact' ? (
                <TouchableOpacity
                  key={color}
                  style={{
                    backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#FFFFFF',
                    borderRadius: 20,
                    paddingVertical: 16,
                    paddingHorizontal: 18,
                    marginBottom: 12,
                    flexDirection: 'row',
                    alignItems: 'center',
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: isDark ? 0.25 : 0.08,
                    shadowRadius: 6,
                    elevation: 3,
                    borderWidth: isDark ? 1 : 0,
                    borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'transparent',
                  }}
                  onPress={() => {
                    hapticFeedback.medium();
                    loadVersesForColor(color);
                  }}
                  onLongPress={() => {
                    hapticFeedback.medium();
                    setRenameHighlightColor(color);
                    setRenameHighlightText(getColorName(color));
                    setShowRenameHighlight(true);
                  }}
                  activeOpacity={0.8}
                  delayPressIn={0}
                >
                  <View style={{
                    width: 48, height: 48, borderRadius: 24,
                    backgroundColor: color, marginRight: 16,
                    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: isDark ? 0.3 : 0.15, shadowRadius: 4, elevation: 3,
                    justifyContent: 'center', alignItems: 'center'
                  }}>
                    <MaterialIcons name="format-paint" size={20} color="rgba(255,255,255,0.9)" />
                  </View>
                  
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 17, fontWeight: '700', color: textColor, letterSpacing: 0.3 }}>
                      {getColorName(color)}
                    </Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                      {customHighlightNames[color] && (
                        <Text style={{ fontSize: 12, fontWeight: '500', color: textSecondaryColor, marginRight: 8 }}>
                          {getDefaultColorName(color)} •
                        </Text>
                      )}
                      <Text style={{ fontSize: 13, fontWeight: '600', color: color }}>
                        {verses.length} {verses.length === 1 ? 'verse' : 'verses'}
                      </Text>
                    </View>
                  </View>
                  
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <TouchableOpacity
                      onPress={() => {
                        hapticFeedback.light();
                        setRenameHighlightColor(color);
                        setRenameHighlightText(getColorName(color));
                        setShowRenameHighlight(true);
                      }}
                      style={{
                        width: 36, height: 36, borderRadius: 18,
                        backgroundColor: `${color}20`, alignItems: 'center', justifyContent: 'center'
                      }}
                      activeOpacity={0.7} delayPressIn={0}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <MaterialIcons name="edit" size={16} color={color} />
                    </TouchableOpacity>
                    
                    <View style={{
                      width: 36, height: 36, borderRadius: 18,
                      backgroundColor: `${color}15`, alignItems: 'center', justifyContent: 'center'
                    }}>
                      <MaterialIcons name="arrow-forward-ios" size={14} color={color} />
                    </View>
                  </View>
                </TouchableOpacity>
              ) : (
                <View key={color} style={{
                  marginBottom: 16, borderRadius: 28, overflow: 'hidden',
                  shadowColor: '#000', shadowOffset: { width: 0, height: 3 },
                  shadowOpacity: isDark ? 0.25 : 0.1, shadowRadius: 8, elevation: 4
                }}>
                  <LinearGradient
                    colors={[`${color}${isDark ? '40' : '25'}`, `${color}${isDark ? '20' : '10'}`]}
                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                    style={{ padding: 24, alignItems: 'center', borderWidth: 2, borderColor: `${color}40`, borderRadius: 28 }}
                  >
                    <TouchableOpacity
                      style={{ width: '100%', alignItems: 'center' }}
                      onPress={() => { hapticFeedback.medium(); loadVersesForColor(color); }}
                      onLongPress={() => {
                        hapticFeedback.medium();
                        setRenameHighlightColor(color);
                        setRenameHighlightText(getColorName(color));
                        setShowRenameHighlight(true);
                      }}
                      activeOpacity={0.8} delayPressIn={0}
                    >
                      <TouchableOpacity
                        style={{
                          position: 'absolute', top: 0, right: 0,
                          width: 40, height: 40, borderRadius: 20,
                          backgroundColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.8)',
                          alignItems: 'center', justifyContent: 'center',
                          shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4
                        }}
                        onPress={() => {
                          hapticFeedback.light();
                          setRenameHighlightColor(color);
                          setRenameHighlightText(getColorName(color));
                          setShowRenameHighlight(true);
                        }}
                        activeOpacity={0.7} delayPressIn={0}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      >
                        <MaterialIcons name="edit" size={18} color={color} />
                      </TouchableOpacity>
                      
                      <View style={{
                        width: 72, height: 72, borderRadius: 36,
                        backgroundColor: color, marginBottom: 16,
                        shadowColor: '#000', shadowOffset: { width: 0, height: 3 },
                        shadowOpacity: isDark ? 0.3 : 0.15, shadowRadius: 6, elevation: 4,
                        justifyContent: 'center', alignItems: 'center',
                        borderWidth: 3, borderColor: 'rgba(255,255,255,0.3)'
                      }}>
                        <MaterialIcons name="format-paint" size={28} color="rgba(255,255,255,0.95)" />
                      </View>
                      
                      <Text style={{ fontSize: 22, fontWeight: '800', color: textColor, marginBottom: 8, letterSpacing: 0.5 }}>
                        {getColorName(color)}
                      </Text>
                      
                      {customHighlightNames[color] && (
                        <Text style={{ fontSize: 13, fontWeight: '500', color: textSecondaryColor, marginBottom: 8 }}>
                          Originally: {getDefaultColorName(color)}
                        </Text>
                      )}
                      
                      <View style={{
                        backgroundColor: color, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20,
                        shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: isDark ? 0.25 : 0.12, shadowRadius: 4
                      }}>
                        <Text style={{ fontSize: 14, fontWeight: '700', color: '#FFFFFF', letterSpacing: 0.5 }}>
                          {verses.length} {verses.length === 1 ? 'verse' : 'verses'}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  </LinearGradient>
                </View>
              )
            ))}
          </View>
        ) : (
          highlightVersesWithText.map((verse, index) => (
            <View key={verse.verseId + index} style={{
              marginBottom: 16, borderRadius: 24, overflow: 'hidden',
              shadowColor: selectedHighlightColor, shadowOffset: { width: 0, height: 6 },
              shadowOpacity: isDark ? 0.4 : 0.2, shadowRadius: 16, elevation: 6
            }}>
              <LinearGradient
                colors={[
                  isDark ? `${selectedHighlightColor}30` : `${selectedHighlightColor}18`,
                  isDark ? `${selectedHighlightColor}20` : `${selectedHighlightColor}12`
                ]}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                style={{ padding: 22, borderWidth: 2, borderColor: `${selectedHighlightColor}50`, borderRadius: 24 }}
              >
                <View style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 6, backgroundColor: selectedHighlightColor }} />
                
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16, paddingLeft: 8 }}>
                  <View style={{
                    width: 36, height: 36, borderRadius: 18,
                    backgroundColor: selectedHighlightColor, alignItems: 'center', justifyContent: 'center',
                    shadowColor: selectedHighlightColor, shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.4, shadowRadius: 6, elevation: 3
                  }}>
                    <MaterialIcons name="auto-stories" size={20} color="#FFFFFF" />
                  </View>
                  <View style={{ marginLeft: 12, flex: 1 }}>
                    <Text style={{ fontSize: 18, fontWeight: '800', color: textColor }}>
                      {verse.verseReference}
                    </Text>
                    <Text style={{ fontSize: 12, fontWeight: '600', color: textSecondaryColor, marginTop: 2, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                      {currentBibleVersion.toUpperCase()}
                    </Text>
                  </View>
                </View>
                
                <Text style={{ fontSize: 16, color: textColor, lineHeight: 28, marginBottom: 18, paddingLeft: 8, fontWeight: '500' }}>
                  {verse.text}
                </Text>
              
                <View style={{ flexDirection: 'row', gap: 10, marginTop: 8, paddingLeft: 8 }}>
                  <TouchableOpacity
                    style={{
                      width: 50, height: 50, borderRadius: 16,
                      backgroundColor: `${theme.error}20`, alignItems: 'center', justifyContent: 'center',
                      borderWidth: 1.5, borderColor: `${theme.error}30`
                    }}
                    onPress={() => {
                      Alert.alert('Remove Highlight', 'Are you sure you want to remove this highlight?', [
                        { text: 'Cancel', style: 'cancel' },
                        {
                          text: 'Remove', style: 'destructive',
                          onPress: async () => {
                            hapticFeedback.light();
                            await VerseDataManager.removeHighlight(verse.verseId);
                            await loadHighlights();
                            setHighlightVersesWithText(prev => prev.filter(v => v.verseId !== verse.verseId));
                            if (highlightVersesWithText.length === 1) setSelectedHighlightColor(null);
                            DeviceEventEmitter.emit('highlightsChanged');
                          }
                        }
                      ]);
                    }}
                    activeOpacity={0.8}
                  >
                    <MaterialIcons name="delete-outline" size={24} color={theme.error} />
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={{
                      flex: 1, paddingVertical: 12, paddingHorizontal: 14, borderRadius: 16,
                      backgroundColor: theme.primary, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
                      shadowColor: theme.primary, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.3, shadowRadius: 6, elevation: 3
                    }}
                    onPress={() => handleDiscussVerse(verse)}
                    activeOpacity={0.8}
                  >
                    <MaterialIcons name="forum" size={18} color="#FFFFFF" />
                    <Text style={{ fontSize: 14, fontWeight: '700', color: '#FFFFFF', marginLeft: 6 }}>Discuss</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={{
                      flex: 1, paddingVertical: 12, paddingHorizontal: 14, borderRadius: 16,
                      backgroundColor: theme.success, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
                      shadowColor: theme.success, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.3, shadowRadius: 6, elevation: 3
                    }}
                    onPress={() => handleNavigateToVerse(verse.verseReference)}
                    activeOpacity={0.8}
                  >
                    <MaterialIcons name="menu-book" size={18} color="#FFFFFF" />
                    <Text style={{ fontSize: 14, fontWeight: '700', color: '#FFFFFF', marginLeft: 6 }}>Go to Verse</Text>
                  </TouchableOpacity>
                </View>
              </LinearGradient>
            </View>
          ))
        )}
      </ScrollView>

      {/* Premium Transparent Header */}
      <BlurView 
        intensity={50} tint={isDark ? 'dark' : 'light'} 
        style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 1000 }}
      >
        <View style={{ height: Platform.OS === 'ios' ? 54 : 24 }} />
        <View style={{ paddingHorizontal: 16, paddingBottom: 16 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <TouchableOpacity
              onPress={handleClose}
              style={{ 
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
                alignItems: 'center',
                justifyContent: 'center',
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
              <Text style={{ color: textColor, fontSize: 17, fontWeight: '700', letterSpacing: 0.3 }}>
                {selectedHighlightColor ? getColorName(selectedHighlightColor) : 'Highlights'}
              </Text>
              <View style={{ 
                width: 50, height: 3, 
                backgroundColor: selectedHighlightColor || theme.primary, 
                borderRadius: 2, marginTop: 6,
              }} />
            </View>
              
            {!selectedHighlightColor ? (
              <TouchableOpacity
                onPress={() => saveHighlightViewMode(highlightViewMode === 'compact' ? 'expanded' : 'compact')}
                style={{ 
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                activeOpacity={0.7}
              >
                <MaterialIcons 
                  name={highlightViewMode === 'compact' ? 'view-agenda' : 'view-list'} 
                  size={18} color={theme.primary} 
                />
              </TouchableOpacity>
            ) : (
              <View style={{ width: 40 }} />
            )}
          </View>
        </View>
      </BlurView>

      {/* Rename Highlight Overlay */}
      {showRenameHighlight && (
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 2000 }}
        >
          <TouchableOpacity
            style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 24 }}
            activeOpacity={1}
            onPress={() => { setShowRenameHighlight(false); setRenameHighlightColor(null); setRenameHighlightText(''); }}
          >
            <TouchableOpacity 
              activeOpacity={1}
              style={{
                backgroundColor: theme.card, borderRadius: 24, padding: 24,
                width: '100%', maxWidth: 340,
                shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.3, shadowRadius: 20, elevation: 10
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20 }}>
                <View style={{
                  width: 44, height: 44, borderRadius: 22,
                  backgroundColor: renameHighlightColor || theme.primary,
                  alignItems: 'center', justifyContent: 'center', marginRight: 14,
                  shadowColor: renameHighlightColor || theme.primary,
                  shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.4, shadowRadius: 6
                }}>
                  <MaterialIcons name="edit" size={22} color="#fff" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 18, fontWeight: '700', color: textColor }}>Rename Highlight</Text>
                  <Text style={{ fontSize: 13, color: textSecondaryColor, marginTop: 2 }}>
                    {getDefaultColorName(renameHighlightColor)}
                  </Text>
                </View>
              </View>

              <TextInput
                value={renameHighlightText}
                onChangeText={setRenameHighlightText}
                placeholder="Enter custom name"
                placeholderTextColor={theme.textTertiary}
                style={{
                  backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
                  borderRadius: 14, padding: 16, fontSize: 16, color: textColor,
                  borderWidth: 2, borderColor: renameHighlightColor || theme.primary, marginBottom: 20
                }}
                autoFocus={true}
                selectTextOnFocus={true}
              />

              <View style={{ flexDirection: 'row', gap: 12 }}>
                {customHighlightNames[renameHighlightColor] && (
                  <TouchableOpacity
                    style={{
                      flex: 1, backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
                      borderRadius: 14, padding: 14, alignItems: 'center'
                    }}
                    onPress={() => {
                      handleResetHighlightName(renameHighlightColor);
                      setShowRenameHighlight(false);
                      setRenameHighlightColor(null);
                      setRenameHighlightText('');
                    }}
                    activeOpacity={0.7} delayPressIn={0}
                  >
                    <Text style={{ fontSize: 15, fontWeight: '600', color: textSecondaryColor }}>Reset</Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  style={{
                    flex: customHighlightNames[renameHighlightColor] ? 1.5 : 1,
                    backgroundColor: renameHighlightColor || theme.primary,
                    borderRadius: 14, padding: 14, alignItems: 'center',
                    shadowColor: renameHighlightColor || theme.primary,
                    shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8
                  }}
                  onPress={() => {
                    handleRenameHighlight();
                  }}
                  activeOpacity={0.7} delayPressIn={0}
                  disabled={!renameHighlightText.trim()}
                >
                  <Text style={{ fontSize: 15, fontWeight: '700', color: '#fff' }}>Save Name</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyStateText: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
  },
  emptyStateSubtext: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
  },
});

export default HighlightsScreen;

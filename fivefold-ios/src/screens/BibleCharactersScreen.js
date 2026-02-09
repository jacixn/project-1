/**
 * Bible Characters Screen
 * 
 * Renders the Bible Characters section from BibleStudyModal as a standalone screen
 * for stack navigation with swipe-back support.
 * 
 * Uses the renderSectionModalOverlay content directly without a Modal wrapper.
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Platform,
  StatusBar,
  RefreshControl,
  Image,
  ActivityIndicator,
  Animated,
  Dimensions,
  StyleSheet,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Audio } from 'expo-av';
import { useTheme } from '../contexts/ThemeContext';
import { hapticFeedback } from '../utils/haptics';
import bibleCharactersService from '../services/bibleCharactersService';

const { width } = Dimensions.get('window');

// Animated Character Group Card
const AnimatedCharacterCard = ({ group, isDark, theme, onPress }) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }], width: (width - 48) / 2, marginBottom: 16 }}>
      <TouchableOpacity
        onPress={onPress}
        onPressIn={() => Animated.spring(scaleAnim, { toValue: 0.96, useNativeDriver: true }).start()}
        onPressOut={() => Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true }).start()}
        activeOpacity={0.9}
      >
        <LinearGradient
          colors={[group.color + 'F2', group.color + 'E6', group.color + 'D9']}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={{ borderRadius: 20, padding: 20, minHeight: 180, justifyContent: 'flex-end' }}
        >
          <View style={{ position: 'absolute', top: 16, left: 16, width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' }}>
            <MaterialIcons name="people" size={28} color="#FFFFFF" />
          </View>
          <Text style={{ fontSize: 17, fontWeight: '800', color: '#FFFFFF', marginBottom: 8 }}>{group.title}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 }}>
              <MaterialIcons name="people" size={14} color="#FFFFFF" />
              <Text style={{ fontSize: 12, fontWeight: '700', color: '#FFFFFF', marginLeft: 4 }}>{group.characters.length}</Text>
            </View>
            <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' }}>
              <MaterialIcons name="chevron-right" size={18} color="#FFFFFF" />
            </View>
          </View>
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
};

// Animated Individual Character Card
const AnimatedIndividualCharacterCard = ({ character, group, index, isDark, theme, onPress }) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <TouchableOpacity
        onPress={onPress}
        onPressIn={() => Animated.spring(scaleAnim, { toValue: 0.97, useNativeDriver: true }).start()}
        onPressOut={() => Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true }).start()}
        activeOpacity={0.9}
        style={{
          flexDirection: 'row', alignItems: 'center',
          backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#FFFFFF',
          borderRadius: 16, padding: 16, marginBottom: 10,
          shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
          shadowOpacity: isDark ? 0.2 : 0.06, shadowRadius: 6, elevation: 2,
        }}
      >
        <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: (group?.color || theme.primary) + '20', alignItems: 'center', justifyContent: 'center', marginRight: 14 }}>
          <MaterialIcons name="person" size={24} color={group?.color || theme.primary} />
        </View>
        <Text style={{ flex: 1, fontSize: 16, fontWeight: '600', color: isDark ? '#FFFFFF' : theme.text }}>{character.name}</Text>
        {character.available && (
          <>
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: group?.color || theme.primary, marginRight: 12 }} />
            <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: (group?.color || theme.primary) + '15', alignItems: 'center', justifyContent: 'center' }}>
              <MaterialIcons name="chevron-right" size={20} color={group?.color || theme.primary} />
            </View>
          </>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
};

const BibleCharactersScreen = ({ navigation }) => {
  const { theme, isDark } = useTheme();
  
  const [characterGroups, setCharacterGroups] = useState([]);
  const [characterProfiles, setCharacterProfiles] = useState({});
  const [charactersLoading, setCharactersLoading] = useState(true);
  const [charactersRefreshing, setCharactersRefreshing] = useState(false);
  const [selectedCharacterGroup, setSelectedCharacterGroup] = useState(null);
  const [selectedCharacter, setSelectedCharacter] = useState(null);
  
  // Audio state
  const [characterSound, setCharacterSound] = useState(null);
  const [isCharacterAudioPlaying, setIsCharacterAudioPlaying] = useState(false);
  const [isCharacterAudioLoading, setIsCharacterAudioLoading] = useState(false);
  
  const characterDetailScrollRef = useRef(null);
  const characterGroupDetailScrollRef = useRef(null);

  const getCardColors = () => {
    // Use theme colors so cards match the active theme
    const p = theme.primary || '#667eea';
    const pL = theme.primaryLight || theme.accent || p;
    const pD = theme.primaryDark || p;
    if (isDark) {
      return [p, pD, pD, pL, p, pD, pD, pD];
    } else {
      return [pL, p, pD, pL, pL, p, pD, pD];
    }
  };

  useEffect(() => {
    const loadCharacterData = async () => {
      try {
        setCharactersLoading(true);
        await bibleCharactersService.refresh();
        const profiles = bibleCharactersService.getCharacters();
        const groups = bibleCharactersService.getCharacterGroups();
        
        const processedProfiles = {};
        Object.keys(profiles).forEach(key => {
          const profile = profiles[key];
          processedProfiles[key] = { ...profile, image: profile.imageUrl ? { uri: profile.imageUrl } : null };
        });
        
        const colors = getCardColors();
        const groupsWithColors = groups.map((group, index) => ({
          ...group, color: colors[index % colors.length],
        }));
        
        setCharacterProfiles(processedProfiles);
        setCharacterGroups(groupsWithColors);
      } catch (error) {
        console.error('Error loading character data:', error);
      } finally {
        setCharactersLoading(false);
      }
    };
    loadCharacterData();
  }, []);

  useEffect(() => {
    if (selectedCharacter && characterDetailScrollRef.current) {
      setTimeout(() => characterDetailScrollRef.current?.scrollTo({ y: 0, animated: true }), 100);
    }
  }, [selectedCharacter]);

  useEffect(() => {
    if (selectedCharacterGroup && characterGroupDetailScrollRef.current) {
      setTimeout(() => characterGroupDetailScrollRef.current?.scrollTo({ y: 0, animated: false }), 50);
    }
  }, [selectedCharacterGroup]);

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      if (characterSound) {
        characterSound.unloadAsync();
      }
    };
  }, [characterSound]);

  const onRefreshCharacters = async () => {
    setCharactersRefreshing(true);
    hapticFeedback.light();
    try {
      await bibleCharactersService.refresh();
      const profiles = bibleCharactersService.getCharacters();
      const groups = bibleCharactersService.getCharacterGroups();
      const processedProfiles = {};
      Object.keys(profiles).forEach(key => {
        const profile = profiles[key];
        processedProfiles[key] = { ...profile, image: profile.imageUrl ? { uri: profile.imageUrl } : null };
      });
      const colors = getCardColors();
      const groupsWithColors = groups.map((group, index) => ({ ...group, color: colors[index % colors.length] }));
      setCharacterProfiles(processedProfiles);
      setCharacterGroups(groupsWithColors);
    } catch (error) {
      console.error('Error refreshing characters:', error);
    } finally {
      setCharactersRefreshing(false);
    }
  };

  const playCharacterAudio = async (audioUrl) => {
    try {
      setIsCharacterAudioLoading(true);
      if (characterSound) await characterSound.unloadAsync();
      const { sound } = await Audio.Sound.createAsync({ uri: audioUrl }, { shouldPlay: true });
      setCharacterSound(sound);
      setIsCharacterAudioPlaying(true);
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.didJustFinish) { setIsCharacterAudioPlaying(false); }
      });
    } catch (error) {
      console.error('Error playing audio:', error);
    } finally {
      setIsCharacterAudioLoading(false);
    }
  };

  const pauseCharacterAudio = async () => {
    if (characterSound) { await characterSound.pauseAsync(); setIsCharacterAudioPlaying(false); }
  };
  const resumeCharacterAudio = async () => {
    if (characterSound) { await characterSound.playAsync(); setIsCharacterAudioPlaying(true); }
  };
  const restartCharacterAudio = async () => {
    if (characterSound) { await characterSound.setPositionAsync(0); await characterSound.playAsync(); setIsCharacterAudioPlaying(true); }
  };

  const handleBack = () => {
    if (selectedCharacter) {
      hapticFeedback.light();
      setSelectedCharacter(null);
    } else if (selectedCharacterGroup) {
      hapticFeedback.light();
      setSelectedCharacterGroup(null);
    } else {
      navigation.goBack();
    }
  };

  const renderCharacterGroups = () => (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingTop: Platform.OS === 'ios' ? 130 : 100 }}
      refreshControl={
        <RefreshControl refreshing={charactersRefreshing} onRefresh={onRefreshCharacters} tintColor={theme.primary} progressViewOffset={Platform.OS === 'ios' ? 110 : 80} />
      }
    >
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', paddingHorizontal: 16 }}>
        {characterGroups.map((group, index) => (
          <AnimatedCharacterCard key={group.id} group={group} isDark={isDark} theme={theme}
            onPress={() => { hapticFeedback.light(); setSelectedCharacterGroup(group); }}
          />
        ))}
      </View>
      <View style={{ height: 40 }} />
    </ScrollView>
  );

  const renderGroupDetail = () => {
    const group = selectedCharacterGroup;
    return (
      <ScrollView ref={characterGroupDetailScrollRef} showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: Platform.OS === 'ios' ? 130 : 100 }}
      >
        <View style={{ paddingHorizontal: 16 }}>
          <View style={{ borderRadius: 24, overflow: 'hidden', marginBottom: 20 }}>
            <LinearGradient colors={[group.color + 'F2', group.color + 'E6', group.color + 'D9']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ padding: 28, alignItems: 'center' }}>
              <View style={{ position: 'absolute', top: 16, left: 16 }}>
                <TouchableOpacity onPress={() => { hapticFeedback.light(); setSelectedCharacterGroup(null); }}
                  style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' }}>
                  <MaterialIcons name="arrow-back" size={20} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
              <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                <MaterialIcons name="people" size={40} color="#FFFFFF" />
              </View>
              <Text style={{ fontSize: 24, fontWeight: '900', color: '#FFFFFF', marginBottom: 12, textAlign: 'center' }}>{group.title}</Text>
              <View style={{ backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 16, flexDirection: 'row', alignItems: 'center' }}>
                <MaterialIcons name="people" size={16} color="#FFFFFF" />
                <Text style={{ fontSize: 14, fontWeight: '700', color: '#FFFFFF', marginLeft: 6 }}>{group.characters.length} Biblical Characters</Text>
              </View>
            </LinearGradient>
          </View>
          {group.characters.map((character, index) => (
            <AnimatedIndividualCharacterCard key={index}
              character={{ name: character, available: !!characterProfiles[character] }}
              group={group} index={index} isDark={isDark} theme={theme}
              onPress={() => { hapticFeedback.light(); if (characterProfiles[character]) setSelectedCharacter(character); }}
            />
          ))}
        </View>
        <View style={{ height: 40 }} />
      </ScrollView>
    );
  };

  const renderCharacterDetail = () => {
    const character = characterProfiles[selectedCharacter];
    if (!character) {
      return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 }}>
          <MaterialIcons name="person-outline" size={80} color={theme.textTertiary} />
          <Text style={{ color: theme.text, fontSize: 18, marginTop: 20, textAlign: 'center' }}>
            {charactersLoading ? 'Loading character...' : 'Character profile not available yet'}
          </Text>
          <TouchableOpacity onPress={() => setSelectedCharacter(null)} style={{ marginTop: 20, padding: 12, backgroundColor: theme.primary, borderRadius: 12 }}>
            <Text style={{ color: '#FFFFFF', fontWeight: '600' }}>Go Back</Text>
          </TouchableOpacity>
        </View>
      );
    }
    const characterGroup = characterGroups.find(g => g.characters.includes(selectedCharacter));
    const themeColor = characterGroup?.color || theme.primary;

    return (
      <ScrollView ref={characterDetailScrollRef} showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: Platform.OS === 'ios' ? 130 : 100 }}
      >
        <View style={{ paddingHorizontal: 16 }}>
          {/* Hero */}
          <View style={{ borderRadius: 24, overflow: 'hidden', marginBottom: 20 }}>
            <LinearGradient colors={[themeColor + 'F2', themeColor + 'E6', themeColor + 'D9']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ padding: 28, alignItems: 'center' }}>
              <View style={{ width: 100, height: 100, borderRadius: 50, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                {character.image ? (
                  <Image source={character.image} style={{ width: 90, height: 90, borderRadius: 45 }} resizeMode="cover" />
                ) : (
                  <MaterialIcons name="person" size={60} color="rgba(255,255,255,0.5)" />
                )}
              </View>
              <Text style={{ fontSize: 24, fontWeight: '900', color: '#FFFFFF', marginBottom: 4, textAlign: 'center' }}>{character.name.split(' - ')[0]}</Text>
              {character.name.split(' - ')[1] && <Text style={{ fontSize: 14, color: 'rgba(255,255,255,0.8)', marginBottom: 12 }}>{character.name.split(' - ')[1]}</Text>}
              
              {character.audioUrl && (
                <TouchableOpacity onPress={() => {
                  if (isCharacterAudioPlaying) pauseCharacterAudio();
                  else if (characterSound) resumeCharacterAudio();
                  else playCharacterAudio(character.audioUrl);
                }} style={{ backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20, flexDirection: 'row', alignItems: 'center', marginTop: 8 }}>
                  {isCharacterAudioLoading ? <ActivityIndicator size="small" color="#FFFFFF" /> : <MaterialIcons name={isCharacterAudioPlaying ? 'pause' : 'play-arrow'} size={20} color="#FFFFFF" />}
                  <Text style={{ fontSize: 14, fontWeight: '700', color: '#FFFFFF', marginLeft: 6 }}>{isCharacterAudioLoading ? 'Loading...' : isCharacterAudioPlaying ? 'Pause' : 'Listen to Story'}</Text>
                </TouchableOpacity>
              )}
            </LinearGradient>
          </View>

          {/* Story */}
          <View style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#FFFFFF', borderRadius: 20, padding: 20, marginBottom: 14, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 14, backgroundColor: themeColor + '15', borderRadius: 12, padding: 10 }}>
              <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: themeColor + '25', alignItems: 'center', justifyContent: 'center', marginRight: 10 }}>
                <MaterialIcons name="auto-stories" size={18} color={themeColor} />
              </View>
              <Text style={{ fontSize: 16, fontWeight: '700', color: isDark ? '#FFFFFF' : theme.text }}>Biblical Story</Text>
            </View>
            <Text selectable style={{ fontSize: 15, color: isDark ? 'rgba(255,255,255,0.9)' : theme.text, lineHeight: 24 }}>{character.story}</Text>
          </View>

          {/* Themes */}
          <View style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#FFFFFF', borderRadius: 20, padding: 20, marginBottom: 14 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 14, backgroundColor: themeColor + '15', borderRadius: 12, padding: 10 }}>
              <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: themeColor + '25', alignItems: 'center', justifyContent: 'center', marginRight: 10 }}>
                <MaterialIcons name="psychology" size={18} color={themeColor} />
              </View>
              <Text style={{ fontSize: 16, fontWeight: '700', color: isDark ? '#FFFFFF' : theme.text }}>Key Themes</Text>
            </View>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {character.themes.map((t, i) => (
                <View key={i} style={{ backgroundColor: themeColor + '20', borderColor: themeColor + '40', borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8, flexDirection: 'row', alignItems: 'center' }}>
                  <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: themeColor, marginRight: 8 }} />
                  <Text selectable style={{ fontSize: 14, color: isDark ? '#FFFFFF' : theme.text }}>{t}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Cultural Impact */}
          <View style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#FFFFFF', borderRadius: 20, padding: 20, marginBottom: 14 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 14, backgroundColor: themeColor + '15', borderRadius: 12, padding: 10 }}>
              <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: themeColor + '25', alignItems: 'center', justifyContent: 'center', marginRight: 10 }}>
                <MaterialIcons name="palette" size={18} color={themeColor} />
              </View>
              <Text style={{ fontSize: 16, fontWeight: '700', color: isDark ? '#FFFFFF' : theme.text }}>Cultural Impact</Text>
            </View>
            <Text selectable style={{ fontSize: 15, color: isDark ? 'rgba(255,255,255,0.9)' : theme.text, lineHeight: 24 }}>{character.culturalImpact}</Text>
          </View>

          {/* Key Verses */}
          <View style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#FFFFFF', borderRadius: 20, padding: 20, marginBottom: 14 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 14, backgroundColor: themeColor + '15', borderRadius: 12, padding: 10 }}>
              <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: themeColor + '25', alignItems: 'center', justifyContent: 'center', marginRight: 10 }}>
                <MaterialIcons name="menu-book" size={18} color={themeColor} />
              </View>
              <Text style={{ fontSize: 16, fontWeight: '700', color: isDark ? '#FFFFFF' : theme.text }}>Key Verses</Text>
            </View>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {character.verses.map((v, i) => (
                <View key={i} style={{ backgroundColor: themeColor + '20', borderColor: themeColor + '40', borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 8, flexDirection: 'row', alignItems: 'center' }}>
                  <MaterialIcons name="bookmark" size={14} color={themeColor} style={{ marginRight: 6 }} />
                  <Text style={{ fontSize: 14, color: isDark ? '#FFFFFF' : theme.text }}>{v}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>
        <View style={{ height: 40 }} />
      </ScrollView>
    );
  };

  const renderContent = () => {
    if (charactersLoading) {
      return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={{ color: theme.textSecondary, marginTop: 12 }}>Loading characters...</Text>
        </View>
      );
    }
    if (selectedCharacter) return renderCharacterDetail();
    if (selectedCharacterGroup) return renderGroupDetail();
    return renderCharacterGroups();
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      {renderContent()}

      {/* Header */}
      <BlurView intensity={30} tint={isDark ? 'dark' : 'light'}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 1000, borderBottomLeftRadius: 20, borderBottomRightRadius: 20, overflow: 'hidden' }}
      >
        <View style={{ height: Platform.OS === 'ios' ? 60 : 30 }} />
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 12 }}>
          <TouchableOpacity onPress={handleBack}
            style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)', alignItems: 'center', justifyContent: 'center', zIndex: 1 }}
            activeOpacity={0.7}
          >
            <MaterialIcons name="arrow-back-ios-new" size={18} color={theme.primary} />
          </TouchableOpacity>
          <View style={{ position: 'absolute', left: 0, right: 0, alignItems: 'center' }}>
            <Text style={{ color: theme.text, fontSize: 18, fontWeight: '600' }}>Bible Characters</Text>
          </View>
          <View style={{ width: 40 }} />
        </View>
      </BlurView>
    </View>
  );
};

export default BibleCharactersScreen;

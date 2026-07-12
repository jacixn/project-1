/**
 * Bible Character Screen
 *
 * One character presented as its own sheet over the group sheet. Its root IS
 * the character, so back / pull-down dismisses it straight back to the group.
 *
 * Params: { characterName, color }
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Platform,
  StatusBar,
  Image,
  ActivityIndicator,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Audio } from 'expo-av';
import { useTheme } from '../contexts/ThemeContext';
import { StaticBackButton } from '../components/ScreenHeader';
import bibleCharactersService from '../services/bibleCharactersService';
import CustomLoadingIndicator from '../components/CustomLoadingIndicator';
import { cachedCharacterProfiles, ensureCharacterProfiles } from '../components/BibleCharacterCards';

const BibleCharacterScreen = ({ navigation, route }) => {
  const { theme, isDark } = useTheme();
  const characterName = route?.params?.characterName || null;
  const themeColor = route?.params?.color || theme.primary;

  // The group sheet only opens characters it already has a profile for, so the
  // warm cache renders this sheet immediately rather than through a spinner
  const [character, setCharacter] = useState(() => cachedCharacterProfiles()[characterName] || null);
  const [profilesLoading, setProfilesLoading] = useState(() => !cachedCharacterProfiles()[characterName]);
  const [generatingProfile, setGeneratingProfile] = useState(false);
  const [generationFailed, setGenerationFailed] = useState(false);
  const [charImageFailed, setCharImageFailed] = useState(false);

  // Audio state
  const [characterSound, setCharacterSound] = useState(null);
  const [isCharacterAudioPlaying, setIsCharacterAudioPlaying] = useState(false);
  const [isCharacterAudioLoading, setIsCharacterAudioLoading] = useState(false);

  // Load this character's profile, generating a richer one when the cached
  // entry is still the generic placeholder
  useEffect(() => {
    if (!characterName) return undefined;
    let cancelled = false;

    (async () => {
      let profiles = {};
      try {
        profiles = await ensureCharacterProfiles();
      } catch (error) {
        console.error('Error loading character profiles:', error);
      }
      if (cancelled) return;

      const cached = profiles[characterName] || null;
      setCharacter(cached);
      setProfilesLoading(false);
      if (!cached || !bibleCharactersService.isGenericProfile(cached)) return;

      setGeneratingProfile(true);
      const enhanced = await bibleCharactersService.getEnhancedCharacter(characterName);
      if (cancelled) return;
      if (enhanced && !bibleCharactersService.isGenericProfile(enhanced)) {
        setCharacter((prev) => ({ ...prev, ...enhanced }));
        setGeneratingProfile(false);
        return;
      }

      const profile = await bibleCharactersService.generateAndCacheProfile(characterName);
      if (cancelled) return;
      if (profile) {
        setCharacter((prev) => ({ ...prev, ...profile }));
      } else {
        setGenerationFailed(true);
      }
      setGeneratingProfile(false);
    })();

    return () => { cancelled = true; };
  }, [characterName]);

  // Stop and release audio when this sheet is dismissed
  useEffect(() => {
    return () => {
      if (characterSound) {
        characterSound.unloadAsync();
      }
    };
  }, [characterSound]);

  const playCharacterAudio = async (char) => {
    if (!char) return;
    const audioUrl = char.audioUrl;
    const storyText = char.story;
    const name = char.name?.split(' - ')[0] || characterName;
    if (!audioUrl && !storyText) return;
    try {
      setIsCharacterAudioLoading(true);
      if (characterSound) await characterSound.unloadAsync();
      const characterAudioService = (await import('../services/characterAudioService')).default;
      const localPath = await characterAudioService.getAudioPath(audioUrl, name, storyText);
      if (!localPath) {
        setIsCharacterAudioLoading(false);
        return;
      }
      const { sound } = await Audio.Sound.createAsync({ uri: localPath }, { shouldPlay: true });
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

  const close = () => navigation.goBack();

  const cardBackground = isDark ? 'rgba(255,255,255,0.08)' : '#FFFFFF';
  const cardTextColor = isDark ? '#FFFFFF' : theme.text;

  const renderSectionHeader = (icon, title) => (
    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 14, backgroundColor: themeColor + '15', borderRadius: 12, padding: 10 }}>
      <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: themeColor + '25', alignItems: 'center', justifyContent: 'center', marginRight: 10 }}>
        <MaterialIcons name={icon} size={18} color={themeColor} />
      </View>
      <Text style={{ fontSize: 16, fontWeight: '700', color: cardTextColor }}>{title}</Text>
    </View>
  );

  const renderContent = () => {
    if (profilesLoading) {
      return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <CustomLoadingIndicator color={theme.primary} />
          <Text style={{ color: theme.textSecondary, marginTop: 12 }}>Loading character...</Text>
        </View>
      );
    }

    if (!character) {
      return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 }}>
          <MaterialIcons name="person-outline" size={80} color={theme.textTertiary} />
          <Text style={{ color: theme.text, fontSize: 18, marginTop: 20, textAlign: 'center' }}>
            This character profile couldn't be loaded. Please check your connection and try again.
          </Text>
          <TouchableOpacity onPress={close} style={{ marginTop: 20, padding: 12, backgroundColor: theme.primary, borderRadius: 12 }}>
            <Text style={{ color: '#FFFFFF', fontWeight: '600' }}>Go Back</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: Platform.OS === 'ios' ? 90 : 100 }}
      >
        <View style={{ paddingHorizontal: 16 }}>
          {/* Hero */}
          <View style={{ borderRadius: 24, overflow: 'hidden', marginBottom: 20 }}>
            <LinearGradient colors={[themeColor + 'F2', themeColor + 'E6', themeColor + 'D9']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ padding: 28, alignItems: 'center' }}>
              <View style={{ width: 100, height: 100, borderRadius: 50, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                {character.image && !charImageFailed ? (
                  <Image source={character.image} style={{ width: 90, height: 90, borderRadius: 45 }} resizeMode="cover" onError={() => setCharImageFailed(true)} />
                ) : (
                  <MaterialIcons name="person" size={50} color="rgba(255,255,255,0.6)" />
                )}
              </View>
              <Text style={{ fontSize: 24, fontWeight: '900', color: '#FFFFFF', marginBottom: 4, textAlign: 'center' }}>{(character.name || characterName).split(' - ')[0]}</Text>
              {(character.name || '').split(' - ')[1] && <Text style={{ fontSize: 14, color: 'rgba(255,255,255,0.8)', marginBottom: 12 }}>{character.name.split(' - ')[1]}</Text>}

              {(character.audioUrl || character.story) && (
                <TouchableOpacity
                  onPress={() => {
                    if (isCharacterAudioPlaying) pauseCharacterAudio();
                    else if (characterSound) resumeCharacterAudio();
                    else playCharacterAudio(character);
                  }}
                  style={{ backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20, flexDirection: 'row', alignItems: 'center', marginTop: 8 }}
                >
                  {isCharacterAudioLoading ? <ActivityIndicator size="small" color="#FFFFFF" /> : <MaterialIcons name={isCharacterAudioPlaying ? 'pause' : 'play-arrow'} size={20} color="#FFFFFF" />}
                  <Text style={{ fontSize: 14, fontWeight: '700', color: '#FFFFFF', marginLeft: 6 }}>{isCharacterAudioLoading ? 'Loading...' : isCharacterAudioPlaying ? 'Pause' : 'Listen to Story'}</Text>
                </TouchableOpacity>
              )}
            </LinearGradient>
          </View>

          {generatingProfile ? (
            <View style={{ backgroundColor: cardBackground, borderRadius: 20, padding: 28, marginBottom: 14, alignItems: 'center' }}>
              <ActivityIndicator size="large" color={themeColor} style={{ marginBottom: 16 }} />
              <Text style={{ fontSize: 15, fontWeight: '600', color: cardTextColor, marginBottom: 6 }}>Generating accurate profile...</Text>
              <Text style={{ fontSize: 13, color: theme.textSecondary, textAlign: 'center' }}>Sourcing biblical details for {characterName}</Text>
            </View>
          ) : generationFailed ? (
            <View style={{ backgroundColor: cardBackground, borderRadius: 20, padding: 28, marginBottom: 14, alignItems: 'center' }}>
              <MaterialIcons name="wifi-off" size={40} color={theme.textTertiary} style={{ marginBottom: 12 }} />
              <Text style={{ fontSize: 15, fontWeight: '600', color: cardTextColor, marginBottom: 6 }}>Couldn't load profile</Text>
              <Text style={{ fontSize: 13, color: theme.textSecondary, textAlign: 'center', marginBottom: 16 }}>Check your connection and try again.</Text>
              <TouchableOpacity
                onPress={() => {
                  setGeneratingProfile(true);
                  setGenerationFailed(false);
                  bibleCharactersService.generateAndCacheProfile(characterName).then((profile) => {
                    if (profile) {
                      setCharacter((prev) => ({ ...prev, ...profile }));
                    } else {
                      setGenerationFailed(true);
                    }
                    setGeneratingProfile(false);
                  });
                }}
                style={{ backgroundColor: themeColor, paddingHorizontal: 24, paddingVertical: 10, borderRadius: 12 }}
              >
                <Text style={{ color: '#FFFFFF', fontWeight: '600' }}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              {/* Story */}
              <View style={{ backgroundColor: cardBackground, borderRadius: 20, padding: 20, marginBottom: 14, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6 }}>
                {renderSectionHeader('auto-stories', 'Biblical Story')}
                <Text selectable style={{ fontSize: 15, color: isDark ? 'rgba(255,255,255,0.9)' : theme.text, lineHeight: 24 }}>{character.story}</Text>
              </View>

              {/* Themes */}
              <View style={{ backgroundColor: cardBackground, borderRadius: 20, padding: 20, marginBottom: 14 }}>
                {renderSectionHeader('psychology', 'Key Themes')}
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {(character.themes || []).map((t, i) => (
                    <View key={i} style={{ backgroundColor: themeColor + '20', borderColor: themeColor + '40', borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8, flexDirection: 'row', alignItems: 'center' }}>
                      <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: themeColor, marginRight: 8 }} />
                      <Text selectable style={{ fontSize: 14, color: cardTextColor }}>{t}</Text>
                    </View>
                  ))}
                </View>
              </View>

              {/* Cultural Impact */}
              <View style={{ backgroundColor: cardBackground, borderRadius: 20, padding: 20, marginBottom: 14 }}>
                {renderSectionHeader('palette', 'Cultural Impact')}
                <Text selectable style={{ fontSize: 15, color: isDark ? 'rgba(255,255,255,0.9)' : theme.text, lineHeight: 24 }}>{character.culturalImpact}</Text>
              </View>

              {/* Key Verses */}
              <View style={{ backgroundColor: cardBackground, borderRadius: 20, padding: 20, marginBottom: 14 }}>
                {renderSectionHeader('menu-book', 'Key Verses')}
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {(character.verses || []).map((v, i) => (
                    <View key={i} style={{ backgroundColor: themeColor + '20', borderColor: themeColor + '40', borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 8, flexDirection: 'row', alignItems: 'center' }}>
                      <MaterialIcons name="bookmark" size={14} color={themeColor} style={{ marginRight: 6 }} />
                      <Text style={{ fontSize: 14, color: cardTextColor }}>{v}</Text>
                    </View>
                  ))}
                </View>
              </View>
            </>
          )}
        </View>
        <View style={{ height: 40 }} />
      </ScrollView>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      <StaticBackButton onBack={close} topOffset={24} />
      {renderContent()}
    </View>
  );
};

export default BibleCharacterScreen;

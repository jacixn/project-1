/**
 * Bible Character Group Screen
 *
 * A story group (e.g. "Noah's Ark & The Great Flood") presented as its own
 * sheet over the groups list. Picking a character pushes the character sheet
 * on top of this one.
 *
 * Params: { group } — the group object, carrying its resolved card colour.
 */

import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, Platform, StatusBar } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../contexts/ThemeContext';
import { hapticFeedback } from '../utils/haptics';
import { StaticBackButton } from '../components/ScreenHeader';
import AchievementService from '../services/achievementService';
import {
  AnimatedIndividualCharacterCard,
  cachedCharacterProfiles,
  ensureCharacterProfiles,
} from '../components/BibleCharacterCards';

const BibleCharacterGroupScreen = ({ navigation, route }) => {
  const { theme, isDark } = useTheme();
  const group = route?.params?.group || null;

  // Seeded from the warm cache so the cards are pressable on the first frame;
  // the effect only matters when this sheet somehow mounts cold
  const [characterProfiles, setCharacterProfiles] = useState(cachedCharacterProfiles);

  useEffect(() => {
    if (Object.keys(characterProfiles).length > 0) return undefined;
    let cancelled = false;
    ensureCharacterProfiles()
      .then((profiles) => { if (!cancelled) setCharacterProfiles(profiles); })
      .catch((error) => console.error('Error loading character profiles:', error));
    return () => { cancelled = true; };
  }, []);

  const close = () => {
    hapticFeedback.light();
    navigation.goBack();
  };

  if (!group) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.background }}>
        <StaticBackButton onBack={close} topOffset={24} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      <StaticBackButton onBack={close} topOffset={24} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: Platform.OS === 'ios' ? 90 : 100 }}
      >
        <View style={{ paddingHorizontal: 16 }}>
          <View style={{ borderRadius: 24, overflow: 'hidden', marginBottom: 20 }}>
            <LinearGradient
              colors={[group.color + 'F2', group.color + 'E6', group.color + 'D9']}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              style={{ padding: 28, alignItems: 'center' }}
            >
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
            <AnimatedIndividualCharacterCard
              key={index}
              character={{ name: character, available: !!characterProfiles[character] }}
              group={group}
              index={index}
              isDark={isDark}
              theme={theme}
              onPress={() => {
                if (!characterProfiles[character]) return;
                hapticFeedback.light();
                AchievementService.incrementStat('charactersRead');
                navigation.navigate('BibleCharacter', { characterName: character, color: group.color });
              }}
            />
          ))}
        </View>
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
};

export default BibleCharacterGroupScreen;

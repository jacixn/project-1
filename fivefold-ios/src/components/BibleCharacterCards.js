/**
 * Cards shared by the Bible Characters sheets (groups list, group detail).
 * Each level is its own presentation:'modal' screen, so these render in more
 * than one place and live here rather than inside a screen file.
 */

import React, { useRef } from 'react';
import { View, Text, TouchableOpacity, Animated, Dimensions } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import bibleCharactersService from '../services/bibleCharactersService';

const { width } = Dimensions.get('window');

const withImages = (profiles) => {
  const processed = {};
  Object.keys(profiles || {}).forEach((key) => {
    const profile = profiles[key];
    processed[key] = { ...profile, image: profile.imageUrl ? { uri: profile.imageUrl } : null };
  });
  return processed;
};

// The service cache is warm once the groups sheet has loaded, so a sheet
// stacked on top can seed its state synchronously and render its availability
// dots on the first frame instead of a tick later (a tap in that gap was
// silently ignored)
export const cachedCharacterProfiles = () => withImages(bibleCharactersService.getCharacters());

// Loads the character profiles, refreshing the service only when its cache is
// cold (each sheet mounts independently and must not assume a warm cache)
export const ensureCharacterProfiles = async () => {
  let profiles = bibleCharactersService.getCharacters();
  if (!profiles || Object.keys(profiles).length === 0) {
    await bibleCharactersService.refresh();
    profiles = bibleCharactersService.getCharacters();
  }
  return withImages(profiles);
};

// Two alternating colours that match the active theme
export const getCardColors = (theme) => {
  const a = theme.primary || '#667eea';
  const b = theme.primaryLight || theme.accent || theme.primaryDark || a;
  return [a, b];
};

export const AnimatedCharacterCard = ({ group, isDark, theme, onPress }) => {
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

export const AnimatedIndividualCharacterCard = ({ character, group, index, isDark, theme, onPress }) => {
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

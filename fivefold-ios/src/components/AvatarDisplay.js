import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const IMAGE_PRESETS = {
  preset_1:  require('../assets/avatars/preset_1.jpg'),
  preset_2:  require('../assets/avatars/preset_2.jpg'),
  preset_3:  require('../assets/avatars/preset_3.jpg'),
  preset_4:  require('../assets/avatars/preset_4.jpg'),
  preset_5:  require('../assets/avatars/preset_5.jpg'),
  preset_6:  require('../assets/avatars/preset_6.jpg'),
  preset_7:  require('../assets/avatars/preset_7.jpg'),
  preset_8:  require('../assets/avatars/preset_8.jpg'),
  preset_9:  require('../assets/avatars/preset_9.jpg'),
  preset_10: require('../assets/avatars/preset_10.jpg'),
  preset_11: require('../assets/avatars/preset_11.jpg'),
  preset_12: require('../assets/avatars/preset_12.jpg'),
  preset_13: require('../assets/avatars/preset_13.jpg'),
  preset_14: require('../assets/avatars/preset_14.jpg'),
  preset_15: require('../assets/avatars/preset_15.jpg'),
  preset_16: require('../assets/avatars/preset_16.jpg'),
  preset_17: require('../assets/avatars/preset_17.jpg'),
  preset_18: require('../assets/avatars/preset_18.jpg'),
  preset_19: require('../assets/avatars/preset_19.jpg'),
  preset_20: require('../assets/avatars/preset_20.jpg'),
  preset_21: require('../assets/avatars/preset_21.jpg'),
  preset_22: require('../assets/avatars/preset_22.jpg'),
  preset_23: require('../assets/avatars/preset_23.jpg'),
  preset_24: require('../assets/avatars/preset_24.jpg'),
  preset_25: require('../assets/avatars/preset_25.jpg'),
};

const LEGACY_PRESETS = {
  avatar_cross:    { icon: '\u271D',  colors: ['#6C63FF', '#4834DF'] },
  avatar_dove:     { icon: '\uD83D\uDD4A',  colors: ['#74b9ff', '#0984e3'] },
  avatar_mountain: { icon: '\u26F0',  colors: ['#55efc4', '#00b894'] },
  avatar_sun:      { icon: '\u2600',  colors: ['#ffeaa7', '#fdcb6e'] },
  avatar_heart:    { icon: '\u2665',  colors: ['#fd79a8', '#e84393'] },
  avatar_star:     { icon: '\u2B50',  colors: ['#f9ca24', '#f0932b'] },
  avatar_pray:     { icon: '\uD83D\uDE4F', colors: ['#a29bfe', '#6c5ce7'] },
  avatar_book:     { icon: '\uD83D\uDCD6', colors: ['#81ecec', '#00cec9'] },
  avatar_leaf:     { icon: '\uD83C\uDF3F', colors: ['#badc58', '#6ab04c'] },
  avatar_flame:    { icon: '\uD83D\uDD25', colors: ['#ff7675', '#d63031'] },
  avatar_water:    { icon: '\uD83D\uDCA7', colors: ['#74b9ff', '#0652DD'] },
  avatar_crown:    { icon: '\uD83D\uDC51', colors: ['#f8a5c2', '#c44569'] },
};

const INITIALS_GRADIENTS = [
  ['#6C63FF', '#4834DF'],
  ['#fd79a8', '#e84393'],
  ['#00cec9', '#0984e3'],
  ['#fdcb6e', '#e17055'],
  ['#55efc4', '#00b894'],
  ['#a29bfe', '#6c5ce7'],
  ['#ffeaa7', '#f0932b'],
  ['#74b9ff', '#0652DD'],
  ['#ff7675', '#d63031'],
  ['#81ecec', '#00cec9'],
  ['#badc58', '#6ab04c'],
  ['#f8a5c2', '#c44569'],
];

function getInitials(name) {
  if (!name || !name.trim()) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return parts[0].substring(0, 2).toUpperCase();
}

function getGradientForName(name) {
  if (!name) return INITIALS_GRADIENTS[0];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return INITIALS_GRADIENTS[Math.abs(hash) % INITIALS_GRADIENTS.length];
}

function isUrl(value) {
  return value && (value.startsWith('http://') || value.startsWith('https://') || value.startsWith('file://'));
}

const PRESET_IDS = Object.keys(IMAGE_PRESETS);

const AvatarDisplay = ({ profilePicture, displayName, size = 40, style }) => {
  const iconFontSize = size * 0.48;
  const initialsFontSize = size * 0.38;

  if (profilePicture && profilePicture.startsWith('preset_') && IMAGE_PRESETS[profilePicture]) {
    return (
      <Image
        source={IMAGE_PRESETS[profilePicture]}
        style={[{ width: size, height: size, borderRadius: size / 2 }, styles.center, style]}
      />
    );
  }

  if (profilePicture && profilePicture.startsWith('avatar_') && LEGACY_PRESETS[profilePicture]) {
    const preset = LEGACY_PRESETS[profilePicture];
    return (
      <LinearGradient
        colors={preset.colors}
        style={[{ width: size, height: size, borderRadius: size / 2 }, styles.center, style]}
      >
        <Text style={{ fontSize: iconFontSize, textAlign: 'center' }}>{preset.icon}</Text>
      </LinearGradient>
    );
  }

  if (isUrl(profilePicture)) {
    return (
      <Image
        source={{ uri: profilePicture }}
        style={[{ width: size, height: size, borderRadius: size / 2 }, style]}
        onError={() => console.log('[AvatarDisplay] Image failed to load')}
      />
    );
  }

  const gradient = getGradientForName(displayName);
  const initials = getInitials(displayName);
  return (
    <LinearGradient
      colors={gradient}
      style={[{ width: size, height: size, borderRadius: size / 2 }, styles.center, style]}
    >
      <Text style={[styles.initials, { fontSize: initialsFontSize }]}>{initials}</Text>
    </LinearGradient>
  );
};

export { IMAGE_PRESETS, PRESET_IDS, LEGACY_PRESETS, getInitials, getGradientForName, isUrl };
export default AvatarDisplay;

const styles = StyleSheet.create({
  center: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  initials: {
    color: '#FFFFFF',
    fontWeight: '700',
    textAlign: 'center',
  },
});

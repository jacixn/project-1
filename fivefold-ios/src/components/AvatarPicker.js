import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { hapticFeedback } from '../utils/haptics';
import { isEmailVerified } from '../services/authService';
import AvatarDisplay, { PRESET_IDS } from './AvatarDisplay';

const COLUMNS = 5;
const SCREEN_WIDTH = Dimensions.get('window').width;
const GRID_PADDING = 4;
const GAP = 6;
const BORDER_SPACE = 8;
// Parent Edit Profile modal has 20pt padding on each side (total 40pt).
const PARENT_HORIZONTAL_PADDING = 40;
const AVATAR_SIZE = Math.floor((SCREEN_WIDTH - PARENT_HORIZONTAL_PADDING - GRID_PADDING * 2 - GAP * (COLUMNS - 1) - BORDER_SPACE * COLUMNS) / COLUMNS);

// Custom photos go straight from the picker to storage. There is no
// scan, no cooldown and no attempt counter: the only gate on the
// upload button is a verified email.
const AvatarPicker = ({ currentAvatar, displayName, onAvatarSelected, onUploadPhoto }) => {
  const { theme } = useTheme();

  const handleSelect = (avatarId) => {
    hapticFeedback.buttonPress();
    if (onAvatarSelected) onAvatarSelected(avatarId);
  };

  const handleUploadPress = () => {
    hapticFeedback.buttonPress();
    if (onUploadPhoto) onUploadPhoto();
  };

  const isSelected = (id) => currentAvatar === id;
  const isInitialsSelected = !currentAvatar || (!currentAvatar.startsWith('preset_') && !currentAvatar.startsWith('avatar_') && !currentAvatar.startsWith('http'));
  const isCustomPhotoSelected = currentAvatar && (currentAvatar.startsWith('http://') || currentAvatar.startsWith('https://'));

  const verified = isEmailVerified();

  const selectedStyle = { borderColor: theme.primary, borderWidth: 2.5 };

  return (
    <View style={styles.container}>
      <Text style={[styles.label, { color: theme.textSecondary }]}>Choose your avatar</Text>

      <View style={styles.grid}>
        {/* Initials option */}
        <TouchableOpacity
          onPress={() => handleSelect(null)}
          style={[styles.option, isInitialsSelected && selectedStyle]}
          activeOpacity={0.7}
        >
          <AvatarDisplay profilePicture={null} displayName={displayName} size={AVATAR_SIZE} />
        </TouchableOpacity>

        {/* Custom photo (if user has one selected, show it in the grid) */}
        {isCustomPhotoSelected && (
          <TouchableOpacity style={[styles.option, selectedStyle]} activeOpacity={1}>
            <AvatarDisplay profilePicture={currentAvatar} displayName={displayName} size={AVATAR_SIZE} />
          </TouchableOpacity>
        )}

        {/* 25 image presets */}
        {PRESET_IDS.map((id) => (
          <TouchableOpacity
            key={id}
            onPress={() => handleSelect(id)}
            style={[styles.option, isSelected(id) && selectedStyle]}
            activeOpacity={0.7}
          >
            <AvatarDisplay profilePicture={id} displayName={displayName} size={AVATAR_SIZE} />
          </TouchableOpacity>
        ))}
      </View>

      {/* Upload Your Own section */}
      <View style={styles.uploadSection}>
        {!verified ? (
          <View style={[styles.uploadBanner, { backgroundColor: `${theme.textSecondary}10` }]}>
            <MaterialIcons name="lock" size={18} color={theme.textSecondary} />
            <Text style={[styles.uploadBannerText, { color: theme.textSecondary }]}>
              Verify your email to upload your own photo
            </Text>
          </View>
        ) : (
          <TouchableOpacity
            onPress={handleUploadPress}
            style={[styles.uploadButton, { backgroundColor: `${theme.primary}15`, borderColor: `${theme.primary}40` }]}
            activeOpacity={0.7}
          >
            <MaterialIcons name="photo-camera" size={20} color={theme.primary} />
            <Text style={[styles.uploadButtonText, { color: theme.primary }]}>Upload Your Own Photo</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

export default AvatarPicker;

const styles = StyleSheet.create({
  container: {
    marginTop: 8,
  },
  label: {
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 10,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: GAP,
    paddingVertical: 4,
    paddingHorizontal: GRID_PADDING,
  },
  option: {
    borderRadius: 999,
    borderWidth: 2,
    borderColor: 'transparent',
    padding: 2,
  },
  uploadSection: {
    marginTop: 14,
  },
  uploadBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
  },
  uploadBannerText: {
    fontSize: 13,
    fontWeight: '500',
    flex: 1,
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  uploadButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
});

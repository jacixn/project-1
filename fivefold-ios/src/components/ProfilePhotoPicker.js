import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActionSheetIOS,
  Platform,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { useTheme } from '../contexts/ThemeContext';
import { hapticFeedback } from '../utils/haptics';

const ProfilePhotoPicker = ({ onImageSelected }) => {
  const { theme } = useTheme();

  /**
   * Copy image from temp location to permanent app storage
   * This ensures the image persists across app restarts
   */
  const saveImagePermanently = async (tempUri) => {
    try {
      // Create a permanent filename with timestamp to avoid conflicts
      const filename = `profile_${Date.now()}.jpg`;
      const permanentPath = `${FileSystem.documentDirectory}${filename}`;
      
      console.log('[ProfilePhoto] Copying image to permanent storage...');
      console.log('[ProfilePhoto] From:', tempUri);
      console.log('[ProfilePhoto] To:', permanentPath);
      
      // Delete old profile picture if exists (clean up)
      try {
        const existingFiles = await FileSystem.readDirectoryAsync(FileSystem.documentDirectory);
        const oldProfilePics = existingFiles.filter(f => f.startsWith('profile_'));
        for (const oldFile of oldProfilePics) {
          await FileSystem.deleteAsync(`${FileSystem.documentDirectory}${oldFile}`, { idempotent: true });
          console.log('[ProfilePhoto] Deleted old profile pic:', oldFile);
        }
      } catch (cleanupError) {
        // Non-critical, continue
        console.log('[ProfilePhoto] Cleanup note:', cleanupError.message);
      }
      
      // Copy the temp file to permanent location
      await FileSystem.copyAsync({
        from: tempUri,
        to: permanentPath,
      });
      
      console.log('[ProfilePhoto] Image saved permanently:', permanentPath);
      return permanentPath;
    } catch (error) {
      console.error('[ProfilePhoto] Failed to save image permanently:', error);
      // Return original URI as fallback (will work for current session at least)
      return tempUri;
    }
  };

  const requestCameraPermissions = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert(
          'Camera Permission Required',
          'Please allow camera access in your device settings to take photos.',
          [{ text: 'OK' }]
        );
        return false;
      }
      return true;
    } catch (error) {
      console.error('Error requesting camera permissions:', error);
      return false;
    }
  };

  const requestMediaLibraryPermissions = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert(
          'Photo Library Permission Required',
          'Please allow photo library access in your device settings to select photos.',
          [{ text: 'OK' }]
        );
        return false;
      }
      return true;
    } catch (error) {
      console.error('Error requesting media library permissions:', error);
      return false;
    }
  };

  const pickImageFromCamera = async () => {
    try {
      hapticFeedback.buttonPress();
      
      const hasPermissions = await requestCameraPermissions();
      if (!hasPermissions) return;

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const tempUri = result.assets[0].uri;
        console.log('[ProfilePhoto] Camera photo selected (temp):', tempUri);
        
        // Save to permanent storage
        const permanentUri = await saveImagePermanently(tempUri);
        
        hapticFeedback.photoCapture();
        onImageSelected(permanentUri);
      }
    } catch (error) {
      console.error('Camera error:', error);
      Alert.alert('Error', 'Failed to take photo. Please try again.');
    }
  };

  const pickImageFromGallery = async () => {
    try {
      hapticFeedback.buttonPress();
      
      const hasPermissions = await requestMediaLibraryPermissions();
      if (!hasPermissions) return;

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const tempUri = result.assets[0].uri;
        console.log('[ProfilePhoto] Gallery photo selected (temp):', tempUri);
        
        // Save to permanent storage
        const permanentUri = await saveImagePermanently(tempUri);
        
        hapticFeedback.photoCapture();
        onImageSelected(permanentUri);
      }
    } catch (error) {
      console.error('Gallery error:', error);
      Alert.alert('Error', 'Failed to select photo. Please try again.');
    }
  };

  const showImagePickerOptions = () => {
    if (Platform.OS === 'ios') {
      // Use iOS ActionSheet
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Cancel', 'Take Photo', 'Choose from Gallery'],
          cancelButtonIndex: 0,
        },
        (buttonIndex) => {
          if (buttonIndex === 1) {
            pickImageFromCamera();
          } else if (buttonIndex === 2) {
            pickImageFromGallery();
          }
        }
      );
    } else {
      // Use Android Alert
      Alert.alert(
        'Select Profile Photo',
        'Choose how you want to add your profile photo',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Take Photo', onPress: pickImageFromCamera },
          { text: 'Choose from Gallery', onPress: pickImageFromGallery },
        ]
      );
    }
  };

  return (
    <TouchableOpacity
      style={[styles.photoButton, { backgroundColor: theme.primary + '15' }]}
      onPress={showImagePickerOptions}
      activeOpacity={0.8}
    >
      <MaterialIcons name="camera-alt" size={20} color={theme.primary} />
      <Text style={[styles.photoButtonText, { color: theme.primary }]}>
        Change Photo
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  photoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    marginTop: 12,
  },
  photoButtonText: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
});

export default ProfilePhotoPicker;

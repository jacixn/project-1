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
import { useTheme } from '../contexts/ThemeContext';
import { hapticFeedback } from '../utils/haptics';
import { persistProfileImage } from '../utils/profileImageStorage';

const ProfilePhotoPicker = ({ onImageSelected }) => {
  const { theme } = useTheme();


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
        mediaTypes: ['images'], // Updated API for expo-image-picker v17+
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const tempUri = result.assets[0].uri;
        console.log('[ProfilePhoto] Camera photo selected (temp):', tempUri);
        
        // Save to permanent storage
        const permanentUri = await persistProfileImage(tempUri);
        
        hapticFeedback.photoCapture();
        if (onImageSelected) {
          onImageSelected(permanentUri);
        }
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
        mediaTypes: ['images'], // Updated API for expo-image-picker v17+
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const tempUri = result.assets[0].uri;
        console.log('[ProfilePhoto] Gallery photo selected (temp):', tempUri);
        
        // Save to permanent storage
        const permanentUri = await persistProfileImage(tempUri);
        
        hapticFeedback.photoCapture();
        if (onImageSelected) {
          onImageSelected(permanentUri);
        }
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

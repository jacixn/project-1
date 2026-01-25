import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Image,
  Alert,
  Keyboard,
  Platform,
  Dimensions,
  Pressable,
  TouchableWithoutFeedback,
  ScrollView,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { BlurView } from 'expo-blur';
import { useTheme } from '../contexts/ThemeContext';
import { hapticFeedback } from '../utils/haptics';
import { persistProfileImage } from '../utils/profileImageStorage';

const { width, height } = Dimensions.get('window');

const SimpleProfileScreen = ({ 
  onNext, 
  onBack, 
  userName, 
  setUserName, 
  profileImage, 
  setProfileImage,
  selectedCountry,
  setSelectedCountry,
  onCountryPress,
  t 
}) => {
  const { theme } = useTheme();
  const nameInputRef = useRef(null);
  const [isFocused, setIsFocused] = useState(false);
  const [keyboardVisible, setKeyboardVisible] = useState(false);

  // Auto-focus name input when screen mounts
  useEffect(() => {
    const focusTimer = setTimeout(() => {
      if (nameInputRef.current) {
        nameInputRef.current.focus();
      }
    }, 500);

    // Keyboard listeners
    const keyboardDidShow = Keyboard.addListener('keyboardDidShow', () => {
      setKeyboardVisible(true);
    });
    
    const keyboardDidHide = Keyboard.addListener('keyboardDidHide', () => {
      setKeyboardVisible(false);
    });

    return () => {
      clearTimeout(focusTimer);
      keyboardDidShow.remove();
      keyboardDidHide.remove();
    };
  }, []);

  const pickImage = async () => {
    hapticFeedback.selection();
    
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permission Required', 
        'We need camera roll permission to set your profile picture.'
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled) {
      const tempUri = result.assets[0].uri;
      const permanentUri = await persistProfileImage(tempUri);
      setProfileImage(permanentUri);
      hapticFeedback.success();
    }
  };

  const handleContinue = () => {
    if (!userName.trim()) {
      hapticFeedback.error();
      Alert.alert(
        'Name Required',
        'Please enter your name to continue.'
      );
      return;
    }
    Keyboard.dismiss();
    onNext();
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <View style={styles.container}>
        <ScrollView 
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.scrollContent}
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={[styles.title, { color: theme.text }]}>
              Create Your Profile
            </Text>
            <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
              Let's personalize your experience
            </Text>
          </View>

          {/* Content */}
          <View style={[styles.content, { paddingBottom: keyboardVisible ? 20 : 0 }]}>
        
        {/* Profile Picture Section */}
        <View style={styles.photoSection}>
          <Pressable 
            onPress={pickImage} 
            style={({ pressed }) => [
              styles.photoContainer,
              { opacity: pressed ? 0.7 : 1 }
            ]}
          >
            {profileImage ? (
              <Image source={{ uri: profileImage }} style={styles.photo} />
            ) : (
              <View style={[styles.photoPlaceholder, { backgroundColor: theme.surface }]}>
                <MaterialIcons name="person" size={50} color={theme.primary} />
              </View>
            )}
            <View style={[styles.cameraIcon, { backgroundColor: theme.primary }]}>
              <MaterialIcons name="camera-alt" size={18} color="#FFFFFF" />
            </View>
          </Pressable>
          <Text style={[styles.photoHint, { color: theme.textSecondary }]}>
            Tap to add a photo
          </Text>
        </View>

        {/* Name Input Section */}
        <View style={styles.inputSection}>
          <Text style={[styles.inputLabel, { color: theme.text }]}>
            What should we call you?
          </Text>
          
          <BlurView
            intensity={18}
            style={[
              styles.inputWrapper,
              {
                borderColor: isFocused ? theme.primary : theme.border,
                borderWidth: isFocused ? 2 : 1,
              }
            ]}
          >
            <Pressable
              onPress={() => nameInputRef.current?.focus()}
              style={styles.inputPressable}
            >
              <TextInput
                ref={nameInputRef}
                style={[styles.input, { color: theme.text }]}
                placeholder="Enter your name"
                placeholderTextColor={theme.textSecondary}
                value={userName}
                onChangeText={setUserName}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                autoCapitalize="words"
                autoCorrect={false}
                maxLength={30}
                returnKeyType="done"
                onSubmitEditing={handleContinue}
                blurOnSubmit={true}
                clearButtonMode="while-editing"
                textAlign="center"
              />
              {userName.trim() && (
                <View style={styles.checkIcon}>
                  <MaterialIcons name="check-circle" size={22} color={theme.success} />
                </View>
              )}
            </Pressable>
          </BlurView>
          
          {userName.trim() && (
            <Text style={[styles.validationText, { color: theme.success }]}>
              ✓ Looks good!
            </Text>
          )}
        </View>

        {/* Country Selection */}
        <View style={styles.inputSection}>
          <Text style={[styles.inputLabel, { color: theme.text }]}>
            Where are you from?
          </Text>
          
          <BlurView
            intensity={18}
            style={[
              styles.countryButton,
              {
                borderColor: selectedCountry ? theme.primary : theme.border,
                borderWidth: selectedCountry ? 2 : 1,
              }
            ]}
          >
            <TouchableOpacity
              onPress={onCountryPress}
              activeOpacity={0.7}
              style={styles.countryPressable}
            >
              {selectedCountry ? (
                <>
                  <Text style={styles.flag}>{selectedCountry.flag}</Text>
                  <Text style={[styles.countryName, { color: theme.text }]}>
                    {selectedCountry.name}
                  </Text>
                  <MaterialIcons name="check-circle" size={22} color={theme.success} />
                </>
              ) : (
                <>
                  <Text style={[styles.countryPlaceholder, { color: theme.textSecondary }]}>
                    Select your country
                  </Text>
                  <MaterialIcons name="chevron-right" size={24} color={theme.textSecondary} />
                </>
              )}
            </TouchableOpacity>
          </BlurView>
        </View>

        {/* Preview */}
        {userName.trim() && selectedCountry && (
          <BlurView intensity={18} style={styles.preview}>
            <Text style={[styles.previewText, { color: theme.textSecondary }]}>
              You'll appear as: {userName} {selectedCountry.flag}
            </Text>
          </BlurView>
        )}
        </View>
      </ScrollView>

      {/* Bottom Navigation */}
      <BlurView 
        intensity={18}
        style={[
          styles.navigation,
          { marginBottom: keyboardVisible ? 10 : 30 }
        ]}
      >
        <TouchableOpacity
          onPress={onBack}
          style={[styles.backButton, { borderColor: theme.border }]}
        >
          <MaterialIcons name="chevron-left" size={24} color={theme.textSecondary} />
          <Text style={[styles.backText, { color: theme.textSecondary }]}>
            Back
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleContinue}
          style={[
            styles.continueButton,
            { 
              backgroundColor: userName.trim() ? theme.primary : theme.border,
              opacity: userName.trim() ? 1 : 0.5
            }
          ]}
          disabled={!userName.trim()}
        >
          <Text style={styles.continueText}>
            Continue
          </Text>
          <MaterialIcons name="chevron-right" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </BlurView>
    </View>
  </TouchableWithoutFeedback>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 24,
  },
  scrollContent: {
    flexGrow: 1,
  },
  header: {
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 30,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
  },
  content: {
    flex: 1,
  },
  photoSection: {
    alignItems: 'center',
    marginBottom: 35,
  },
  photoContainer: {
    position: 'relative',
    marginBottom: 10,
  },
  photo: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  photoPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraIcon: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  photoHint: {
    fontSize: 14,
    fontWeight: '500',
  },
  inputSection: {
    marginBottom: 25,
  },
  inputLabel: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 12,
  },
  inputWrapper: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  inputPressable: {
    paddingHorizontal: 16,
    paddingVertical: Platform.OS === 'ios' ? 16 : 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    fontSize: 16,
    minHeight: 24,
    paddingVertical: 0,
  },
  checkIcon: {
    marginLeft: 8,
  },
  validationText: {
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
    marginTop: 8,
  },
  countryButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  countryPressable: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  flag: {
    fontSize: 24,
    marginRight: 12,
  },
  countryName: {
    flex: 1,
    fontSize: 16,
  },
  countryPlaceholder: {
    flex: 1,
    fontSize: 16,
    textAlign: 'center',
  },
  preview: {
    padding: 12,
    borderRadius: 8,
    marginTop: 10,
    overflow: 'hidden',
  },
  previewText: {
    fontSize: 14,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  navigation: {
    flexDirection: 'row',
    gap: 12,
    paddingVertical: 16,
    paddingHorizontal: 20,
    marginHorizontal: 80,
    borderRadius: 16,
    overflow: 'hidden',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 1,
  },
  backText: {
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 4,
  },
  continueButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
  },
  continueText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginRight: 4,
  },
});

export default SimpleProfileScreen;

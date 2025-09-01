import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  SafeAreaView,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Dimensions,
  Modal,
  FlatList,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '../contexts/ThemeContext';
import { hapticFeedback } from '../utils/haptics';
import { countries } from '../data/countries';

const { width, height } = Dimensions.get('window');

const SimpleOnboarding = ({ onComplete }) => {
  const { theme, isDark } = useTheme();
  const [currentScreen, setCurrentScreen] = useState(0);
  const [userName, setUserName] = useState('');
  const [profileImage, setProfileImage] = useState(null);
  const [selectedCountry, setSelectedCountry] = useState(null);
  const [showCountryPicker, setShowCountryPicker] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Simple screen data - NAME COMES LAST!
  const screens = [
    { type: 'intro' },      // Just welcome, no input
    { type: 'features' },   // Show features
    { type: 'setup' },      // THEN ask for name
    { type: 'complete' }    // Done
  ];

  // Handle next screen
  const handleNext = async () => {
    console.log('✅ Next button pressed, current screen:', currentScreen);
    console.log('✅ User name:', userName);
    
    if (currentScreen === 2) {
      // On SETUP screen (where name is entered)
      if (!userName.trim()) {
        Alert.alert('Name Required', 'Please enter your name to continue.');
        return;
      }
      
      // Save user profile
      try {
        const profileData = {
          name: userName.trim(),
          profilePicture: profileImage,
          country: selectedCountry,
          joinedDate: new Date().toISOString(),
        };
        await AsyncStorage.setItem('userProfile', JSON.stringify(profileData));
        console.log('✅ Profile saved:', profileData);
      } catch (error) {
        console.error('Failed to save profile:', error);
      }
    }
    
    if (currentScreen < screens.length - 1) {
      setCurrentScreen(currentScreen + 1);
    } else {
      // Complete onboarding
      await AsyncStorage.setItem('onboardingCompleted', 'true');
      onComplete();
    }
  };

  // Skip onboarding
  const handleSkip = async () => {
    console.log('✅ Skip pressed');
    await AsyncStorage.setItem('onboardingCompleted', 'true');
    await AsyncStorage.setItem('userProfile', JSON.stringify({
      name: 'Friend',
      profilePicture: null,
      joinedDate: new Date().toISOString(),
    }));
    onComplete();
  };

  // Pick image
  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled) {
      setProfileImage(result.assets[0].uri);
    }
  };

  // Intro Screen - NO INPUT, just welcome
  const IntroScreen = () => (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <TouchableOpacity onPress={handleSkip} style={styles.skipButton}>
        <Text style={[styles.skipText, { color: theme.textSecondary }]}>Skip</Text>
      </TouchableOpacity>

      <View style={styles.content}>
        <Image 
          source={require('../../assets/logo.png')} 
          style={styles.logo}
          resizeMode="contain"
        />
        
        <Text style={[styles.title, { color: theme.text }]}>
          Welcome to Biblely!
        </Text>
        
        <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
          Your spiritual companion for daily growth
        </Text>
        
        <Text style={[styles.description, { color: theme.textSecondary }]}>
          Track tasks, read scripture, pray daily, and grow in faith
        </Text>
      </View>

      <TouchableOpacity 
        onPress={handleNext}
        style={[styles.button, { backgroundColor: theme.primary }]}
      >
        <Text style={styles.buttonText}>Let's Go!</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );

  // Setup Screen - Edit Profile Style UI
  const SetupScreen = () => (
    <SafeAreaView style={[styles.container, { backgroundColor: isDark ? '#1F2937' : '#F8F9FA' }]}>
      {/* Header */}
      <View style={[styles.editHeader, { borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={handleSkip}>
          <Text style={[styles.headerButton, { color: theme.primary }]}>Skip</Text>
        </TouchableOpacity>
        
        <Text style={[styles.headerTitle, { color: theme.text }]}>Set Up Profile</Text>
        
        <TouchableOpacity 
          onPress={handleNext}
          disabled={!userName.trim()}
        >
          <Text style={[styles.headerButton, { 
            color: userName.trim() ? theme.primary : theme.textSecondary,
            opacity: userName.trim() ? 1 : 0.5
          }]}>
            Save
          </Text>
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.editContent}
      >
        <ScrollView 
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Profile Picture Section */}
          <View style={styles.editSection}>
            <Text style={[styles.editSectionTitle, { color: theme.text }]}>
              Profile Picture
            </Text>
            
            <View style={styles.profileImageSection}>
              <TouchableOpacity onPress={pickImage}>
                {profileImage ? (
                  <Image source={{ uri: profileImage }} style={styles.editProfileImage} />
                ) : (
                  <View style={[styles.editImagePlaceholder, { backgroundColor: theme.surface }]}>
                    <MaterialIcons name="person" size={60} color={theme.textSecondary} />
                  </View>
                )}
              </TouchableOpacity>
              
              <TouchableOpacity 
                onPress={pickImage}
                style={[styles.changePhotoButton, { backgroundColor: theme.primary + '20' }]}
              >
                <MaterialIcons name="camera-alt" size={20} color={theme.primary} />
                <Text style={[styles.changePhotoText, { color: theme.primary }]}>
                  Change Photo
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Name Input Section */}
          <View style={styles.editSection}>
            <Text style={[styles.editSectionTitle, { color: theme.text }]}>
              Display Name
            </Text>
            
            <View style={[styles.editInputContainer, { backgroundColor: theme.surface }]}>
              <TextInput
                style={[styles.editInput, { color: theme.text }]}
                placeholder="Enter your name"
                placeholderTextColor={theme.textSecondary}
                value={userName}
                onChangeText={setUserName}
                maxLength={30}
                autoCapitalize="words"
                autoCorrect={false}
                returnKeyType="done"
              />
            </View>
          </View>

          {/* Country Selection Section */}
          <View style={styles.editSection}>
            <Text style={[styles.editSectionTitle, { color: theme.text }]}>
              Your Country
            </Text>
            
            <TouchableOpacity 
              style={[styles.editInputContainer, { backgroundColor: theme.surface }]}
              onPress={() => {
                hapticFeedback.selection();
                setShowCountryPicker(true);
              }}
            >
              <View style={styles.countrySelector}>
                {selectedCountry ? (
                  <>
                    <Text style={styles.countryFlag}>{selectedCountry.flag}</Text>
                    <Text style={[styles.countryName, { color: theme.text }]}>
                      {selectedCountry.name}
                    </Text>
                  </>
                ) : (
                  <Text style={[styles.countryPlaceholder, { color: theme.textSecondary }]}>
                    Select your country
                  </Text>
                )}
                <MaterialIcons name="chevron-right" size={24} color={theme.textSecondary} />
              </View>
            </TouchableOpacity>
            
            {selectedCountry && (
              <Text style={[styles.previewText, { color: theme.textSecondary }]}>
                Your name will appear as: {userName || 'Your Name'} {selectedCountry.flag}
              </Text>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Country Picker Modal */}
      <Modal
        visible={showCountryPicker}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={[styles.modalContainer, { backgroundColor: theme.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: theme.border }]}>
            <TouchableOpacity onPress={() => setShowCountryPicker(false)}>
              <Text style={[styles.modalButton, { color: theme.primary }]}>Cancel</Text>
            </TouchableOpacity>
            
            <Text style={[styles.modalTitle, { color: theme.text }]}>Select Country</Text>
            
            <View style={{ width: 60 }} />
          </View>

          {/* Search Bar */}
          <View style={[styles.searchContainer, { backgroundColor: theme.surface }]}>
            <MaterialIcons name="search" size={20} color={theme.textSecondary} />
            <TextInput
              style={[styles.searchInput, { color: theme.text }]}
              placeholder="Search countries..."
              placeholderTextColor={theme.textSecondary}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCorrect={false}
            />
          </View>

          {/* Country List */}
          <FlatList
            data={countries.filter(country => 
              country.name.toLowerCase().includes(searchQuery.toLowerCase())
            )}
            keyExtractor={(item) => item.code}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[styles.countryItem, { borderBottomColor: theme.border }]}
                onPress={() => {
                  hapticFeedback.selection();
                  setSelectedCountry(item);
                  setShowCountryPicker(false);
                  setSearchQuery('');
                }}
              >
                <Text style={styles.countryItemFlag}>{item.flag}</Text>
                <Text style={[styles.countryItemName, { color: theme.text }]}>
                  {item.name}
                </Text>
                {selectedCountry?.code === item.code && (
                  <MaterialIcons name="check" size={20} color={theme.primary} />
                )}
              </TouchableOpacity>
            )}
          />
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );

  // Features Screen
  const FeaturesScreen = () => (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <TouchableOpacity onPress={handleSkip} style={styles.skipButton}>
        <Text style={[styles.skipText, { color: theme.textSecondary }]}>Skip</Text>
      </TouchableOpacity>

      <View style={styles.content}>
        <Text style={[styles.title, { color: theme.text }]}>
          What You Can Do 📋
        </Text>
        
        <View style={styles.featureList}>
          <View style={styles.feature}>
            <MaterialIcons name="task-alt" size={30} color={theme.primary} />
            <Text style={[styles.featureText, { color: theme.text }]}>
              Track daily tasks with smart scoring
            </Text>
          </View>
          
          <View style={styles.feature}>
            <MaterialIcons name="menu-book" size={30} color={theme.primary} />
            <Text style={[styles.featureText, { color: theme.text }]}>
              Read scripture with simple translations
            </Text>
          </View>
          
          <View style={styles.feature}>
            <MaterialIcons name="chat" size={30} color={theme.primary} />
            <Text style={[styles.featureText, { color: theme.text }]}>
              Chat with Friend for biblical wisdom
            </Text>
          </View>
          
          <View style={styles.feature}>
            <MaterialIcons name="favorite" size={30} color={theme.primary} />
            <Text style={[styles.featureText, { color: theme.text }]}>
              Daily prayers and reflections
            </Text>
          </View>
        </View>
      </View>

      <TouchableOpacity 
        onPress={handleNext}
        style={[styles.button, { backgroundColor: theme.primary }]}
      >
        <Text style={styles.buttonText}>Next</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );

  // Complete Screen
  const CompleteScreen = () => (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.content}>
        <Text style={styles.emoji}>🎉</Text>
        
        <Text style={[styles.title, { color: theme.text }]}>
          You're All Set!
        </Text>
        
        <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
          Welcome to your spiritual journey, {userName || 'Friend'}!
        </Text>
      </View>

      <TouchableOpacity 
        onPress={handleNext}
        style={[styles.button, { backgroundColor: theme.primary }]}
      >
        <Text style={styles.buttonText}>Start Using App</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );

  // Render current screen
  if (currentScreen === 0) return <IntroScreen />;
  if (currentScreen === 1) return <FeaturesScreen />;
  if (currentScreen === 2) return <SetupScreen />;
  if (currentScreen === 3) return <CompleteScreen />;
  
  return <IntroScreen />;
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  // Edit Profile Style
  editHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
  },
  headerButton: {
    fontSize: 17,
    fontWeight: '500',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
  },
  editContent: {
    flex: 1,
  },
  editSection: {
    paddingVertical: 20,
    paddingHorizontal: 20,
  },
  editSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 15,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  profileImageSection: {
    alignItems: 'center',
    gap: 15,
  },
  editProfileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  editImagePlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  changePhotoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 8,
  },
  changePhotoText: {
    fontSize: 15,
    fontWeight: '500',
  },
  editInputContainer: {
    borderRadius: 10,
    paddingHorizontal: 15,
    paddingVertical: 12,
  },
  editInput: {
    fontSize: 16,
  },
  countrySelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  countryFlag: {
    fontSize: 24,
    marginRight: 10,
  },
  countryName: {
    fontSize: 16,
    flex: 1,
  },
  countryPlaceholder: {
    fontSize: 16,
    flex: 1,
  },
  previewText: {
    fontSize: 13,
    marginTop: 8,
    fontStyle: 'italic',
  },
  // Modal Styles
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
  },
  modalButton: {
    fontSize: 17,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '600',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 15,
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 10,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
  },
  countryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 0.5,
  },
  countryItemFlag: {
    fontSize: 28,
    marginRight: 15,
  },
  countryItemName: {
    fontSize: 16,
    flex: 1,
  },
  skipButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 10,
    padding: 10,
  },
  skipText: {
    fontSize: 16,
    fontWeight: '500',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 30,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingVertical: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 40,
  },
  description: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 20,
    paddingHorizontal: 20,
    lineHeight: 20,
  },
  logo: {
    width: 80,
    height: 80,
    alignSelf: 'center',
    marginBottom: 20,
  },
  imageContainer: {
    alignSelf: 'center',
    marginBottom: 10,
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  imagePlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageLabel: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 30,
  },
  inputLabel: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 15,
  },
  input: {
    borderWidth: 2,
    borderRadius: 10,
    padding: 15,
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
  },
  button: {
    marginHorizontal: 30,
    marginBottom: 40,
    padding: 18,
    borderRadius: 10,
    alignItems: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  featureList: {
    marginTop: 20,
  },
  feature: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 25,
    gap: 15,
  },
  featureText: {
    fontSize: 16,
    flex: 1,
  },
});

export default SimpleOnboarding;

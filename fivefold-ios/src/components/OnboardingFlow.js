import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Alert,
  Image,
  Dimensions,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  SafeAreaView,
  FlatList,
} from 'react-native';
import userStorage from '../utils/userStorage';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Notifications from 'expo-notifications';
import { useTheme } from '../contexts/ThemeContext';
import { hapticFeedback } from '../utils/haptics';
import { bibleVersions } from '../data/bibleVersions';
import { countries } from '../data/countries';
import { persistProfileImage } from '../utils/profileImageStorage';
import { checkUsernameAvailability } from '../services/authService';
import { auth, db } from '../config/firebase';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';

const onboardingImage = require('../../assets/logo.png');

const slidesConfig = [
  { key: 'hero', type: 'hero' },
  { key: 'identity', type: 'identity' },
  { key: 'features', type: 'features' },
  { key: 'theme', type: 'theme' },
  { key: 'bible', type: 'bible' },
  { key: 'weight', type: 'weight' },
  { key: 'photo', type: 'photo' },
  { key: 'notifications', type: 'notifications' },
  { key: 'summary', type: 'summary' },
];

const featureCards = [
  { icon: 'task-alt', title: 'Habits that stick', desc: 'Tasks, streaks, and points that make discipline satisfying.' },
  { icon: 'menu-book', title: 'Crystal-clear Bible', desc: '44 translations plus simplified verses and thematic guides.' },
  { icon: 'chat', title: 'Friend insights', desc: 'Ask and reflect with grounded spiritual answers when you need them.' },
  { icon: 'fitness-center', title: 'Faith + fitness', desc: 'Track workouts, set weight units, and see progress that aligns body and spirit.' },
];

const palette = {
  bg: '#0B1021',
  card: '#121832',
  panel: '#0F1429',
  accent: '#F7C948',
  accentSoft: '#F7C94833',
  surface: '#1A2142',
};

const OnboardingFlow = ({ onComplete }) => {
  const { theme, isDark, changeTheme, toggleDarkMode, availableThemes } = useTheme();
  const [step, setStep] = useState(0);
  const [userName, setUserName] = useState('');
  const [username, setUsername] = useState('');
  const [usernameError, setUsernameError] = useState('');
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState(null);
  const [countrySearch, setCountrySearch] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState('en');
  const [selectedBibleVersion, setSelectedBibleVersion] = useState('niv');
  const [selectedTheme, setSelectedTheme] = useState('cresvia');
  const [selectedMode, setSelectedMode] = useState('dark');
  const [weightUnit, setWeightUnit] = useState('kg');
  const [profileImage, setProfileImage] = useState(null);
  const [notificationsRequested, setNotificationsRequested] = useState(false);
  const [showAllVersions, setShowAllVersions] = useState(false);
  const [featureIndex, setFeatureIndex] = useState(0);
  const featureScrollX = useRef(new Animated.Value(0)).current;
  const featureListRef = useRef(null);
  const [featureWidth, setFeatureWidth] = useState(0);
  
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 240, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 240, useNativeDriver: true }),
    ]).start();
    const current = slidesConfig[step];
    if (current.type === 'features') {
      setFeatureIndex(0);
      if (featureListRef.current && featureWidth > 0) {
        featureListRef.current.scrollToOffset({ offset: 0, animated: false });
      }
    }
  }, [step]);

  const progress = (step + 1) / slidesConfig.length;

  const requestNotifications = async () => {
    try {
      const { status } = await Notifications.requestPermissionsAsync();
      setNotificationsRequested(true);
      return status === 'granted';
    } catch (e) {
      console.warn('Notification permission error', e);
      return false;
    }
  };

  const pickImage = async () => {
    hapticFeedback.buttonPress();
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please allow photo access to add your picture.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
    });

    if (!result.canceled) {
      const tempUri = result.assets[0].uri;
      const permanentUri = await persistProfileImage(tempUri);
      setProfileImage(permanentUri);
      hapticFeedback.success();
    }
  };

  const handleNext = async () => {
    hapticFeedback.buttonPress();
    const current = slidesConfig[step];

    if (current.type === 'identity') {
      if (!userName.trim()) {
        Alert.alert('Your name', 'Add your name to personalize your journey.');
        return;
      }
      const trimmedUsername = username.toLowerCase().trim();
      if (!trimmedUsername) {
        Alert.alert('Username required', 'Pick a username so friends can find you.');
        return;
      }
      if (trimmedUsername.length < 3) {
        setUsernameError('Username must be at least 3 characters');
        return;
      }
      if (trimmedUsername.length > 20) {
        setUsernameError('Username must be less than 20 characters');
        return;
      }
      if (!/^[a-z0-9_]+$/.test(trimmedUsername)) {
        setUsernameError('Only letters, numbers, and underscores allowed');
        return;
      }
      // Check availability before proceeding
      setCheckingUsername(true);
      setUsernameError('');
      try {
        const isAvailable = await checkUsernameAvailability(trimmedUsername);
        if (!isAvailable) {
          setUsernameError('Username is already taken');
          setCheckingUsername(false);
          return;
        }
      } catch (e) {
        setUsernameError('Could not check username. Please try again.');
        setCheckingUsername(false);
        return;
      }
      setCheckingUsername(false);
    }
    if (current.type === 'bible' && !selectedBibleVersion) {
      Alert.alert('Bible version', 'Choose your go-to translation.');
        return;
      }
    // On features step, Next now advances to the next onboarding step (swipe to view all features)
    if (current.type === 'notifications' && !notificationsRequested) {
      await requestNotifications();
    }

    if (step < slidesConfig.length - 1) {
      fadeAnim.setValue(0);
      slideAnim.setValue(12);
      setStep(step + 1);
        return;
    }

    await finishOnboarding();
  };

  const handleBack = () => {
    hapticFeedback.selection();
    const current = slidesConfig[step];
    if (current.type === 'features' && featureIndex > 0) {
      // Back on features goes to previous onboarding step
      fadeAnim.setValue(0);
      slideAnim.setValue(-12);
      setStep(step - 1);
      return;
    }
    if (step === 0) return;
    fadeAnim.setValue(0);
    slideAnim.setValue(-12);
    setStep(step - 1);
  };

  const finishOnboarding = async () => {
    try {
      const trimmedUsername = username.toLowerCase().trim();
      const profile = {
          name: userName.trim() || 'Friend',
        username: trimmedUsername || null,
        country: selectedCountry?.name || null,
        countryCode: selectedCountry?.code || null,
        countryFlag: selectedCountry?.flag || null,
        language: selectedLanguage,
          bibleVersion: selectedBibleVersion,
          theme: selectedTheme,
          mode: selectedMode,
        weightUnit,
        profilePicture: profileImage,
        joinedDate: new Date().toISOString(),
        onboardingCompleted: true,
      };
      
      await userStorage.setRaw('userProfile', JSON.stringify(profile));
        await userStorage.setRaw('selectedBibleVersion', selectedBibleVersion);
        await userStorage.setRaw('selectedLanguage', selectedLanguage);
      await userStorage.setRaw('weightUnit', weightUnit);
      await userStorage.setRaw('onboardingCompleted', 'true');

      // Reserve the username in Firestore so no one else can take it
      if (trimmedUsername && auth.currentUser) {
        try {
          await setDoc(doc(db, 'usernames', trimmedUsername), {
            userId: auth.currentUser.uid,
            createdAt: serverTimestamp(),
          });
          console.log('[Onboarding] Reserved username:', trimmedUsername);
        } catch (e) {
          console.error('[Onboarding] Failed to reserve username:', e.message);
        }
      }
        
        await changeTheme(selectedTheme);
      if (selectedMode === 'dark' && !isDark) await toggleDarkMode();
      if (selectedMode === 'light' && isDark) await toggleDarkMode();
      
      hapticFeedback.success();
      onComplete();
    } catch (e) {
      console.error('Onboarding save failed', e);
      onComplete();
    }
  };

  const themesByMode = useMemo(() => {
    const lightOnly = ['blush-bloom', 'eterna', 'faith', 'sailormoon'];
    const darkOnly = ['cresvia', 'spiderman'];
    return selectedMode === 'light'
      ? availableThemes.filter((t) => lightOnly.includes(t.id))
      : availableThemes.filter((t) => darkOnly.includes(t.id));
  }, [availableThemes, selectedMode]);

  const renderHero = () => (
    <LinearGradient colors={['#0B1021', '#0F1630', '#0B1021']} style={styles.hero}>
      <View style={styles.heroLogoCard}>
        <View style={styles.heroLogoGlow} />
        <Image source={onboardingImage} style={styles.heroLogo} resizeMode="contain" />
      </View>
      <Text style={styles.heroTitle}>Welcome to Biblely</Text>
      <Text style={styles.heroSubtitle}>Clarity for faith, focus, and fitness — crafted for you.</Text>
      <TouchableOpacity style={styles.primaryCTA} onPress={handleNext} accessibilityRole="button">
        <Text style={styles.primaryCTAText}>Begin</Text>
        <MaterialIcons name="arrow-forward" size={18} color={palette.bg} />
      </TouchableOpacity>
          </LinearGradient>
  );

  const renderIdentity = () => {
    const filtered = countrySearch.trim()
      ? countries.filter((c) => c.name.toLowerCase().includes(countrySearch.toLowerCase()))
      : countries.slice(0, 40);

    return (
      <View style={styles.panel}>
        <Text style={styles.panelTitle}>Lets get to know you</Text>
        <Text style={styles.panelSubtitle}>Name and country keep things personal and relevant.</Text>

        <View style={styles.inputRow}> 
          <MaterialIcons name="person" size={20} color={palette.accent} />
          <TextInput
            style={styles.input}
            placeholder="Your name"
            placeholderTextColor="#8A90A8"
            value={userName}
            onChangeText={setUserName}
          />
          {userName ? (
            <TouchableOpacity onPress={() => setUserName('')}>
              <MaterialIcons name="close" size={18} color="#8A90A8" />
            </TouchableOpacity>
          ) : null}
        </View>

        <View style={styles.inputRow}> 
          <MaterialIcons name="alternate-email" size={20} color={palette.accent} />
          <TextInput
            style={styles.input}
            placeholder="Username"
            placeholderTextColor="#8A90A8"
            value={username}
            onChangeText={(text) => {
              setUsername(text.toLowerCase().replace(/[^a-z0-9_]/g, ''));
              setUsernameError('');
            }}
            autoCapitalize="none"
            autoCorrect={false}
            maxLength={20}
          />
          {username ? (
            <TouchableOpacity onPress={() => { setUsername(''); setUsernameError(''); }}>
              <MaterialIcons name="close" size={18} color="#8A90A8" />
            </TouchableOpacity>
          ) : null}
        </View>
        {usernameError ? (
          <Text style={{ color: '#FF6B6B', fontSize: 12, marginTop: -4, marginBottom: 8, marginLeft: 8 }}>{usernameError}</Text>
        ) : username.trim().length >= 3 ? (
          <Text style={{ color: '#8A90A8', fontSize: 12, marginTop: -4, marginBottom: 8, marginLeft: 8 }}>Friends will find you as @{username.toLowerCase().trim()}</Text>
        ) : null}

        <View style={styles.inputRow}> 
          <MaterialIcons name="travel-explore" size={20} color={palette.accent} />
          <TextInput
            style={styles.input}
            placeholder="Search country"
            placeholderTextColor="#8A90A8"
            value={countrySearch}
            onChangeText={setCountrySearch}
          />
          {countrySearch ? (
            <TouchableOpacity onPress={() => setCountrySearch('')}>
              <MaterialIcons name="close" size={18} color="#8A90A8" />
          </TouchableOpacity>
          ) : null}
      </View>

        <ScrollView style={styles.countryList} showsVerticalScrollIndicator={false}>
          {filtered.map((c) => {
            const active = selectedCountry?.code === c.code;
            return (
              <TouchableOpacity
                key={c.code}
                style={[styles.countryItem, active && { borderColor: palette.accent, backgroundColor: palette.accentSoft }]}
                onPress={() => setSelectedCountry(c)}
              >
                <Text style={styles.countryFlag}>{c.flag}</Text>
                <Text style={styles.countryName}>{c.name}</Text>
                {active ? <MaterialIcons name="check-circle" size={18} color={palette.accent} /> : null}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
        </View>
    );
  };

  const renderFeatures = () => {
    return (
      <View style={styles.panel}>
        <Text style={styles.panelTitle}>What you get</Text>
        <Text style={styles.panelSubtitle}>Swipe through highlights one by one.</Text>
        <Animated.FlatList
          ref={featureListRef}
          data={featureCards}
          keyExtractor={(item) => item.title}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          snapToAlignment="center"
          decelerationRate="fast"
          onLayout={(e) => setFeatureWidth(e.nativeEvent.layout.width)}
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { x: featureScrollX } } }],
            { useNativeDriver: false }
          )}
          onMomentumScrollEnd={(ev) => {
            const pageW =
              featureWidth ||
              (ev.nativeEvent.layoutMeasurement && ev.nativeEvent.layoutMeasurement.width) ||
              Dimensions.get('window').width;
            const idx = Math.round(
              ev.nativeEvent.contentOffset.x /
                (pageW || 1)
            );
            setFeatureIndex(Math.max(0, Math.min(idx, featureCards.length - 1)));
          }}
          renderItem={({ item }) => {
            return (
              <View style={[styles.featurePage, { width: featureWidth || Dimensions.get('window').width - 40 }]}>
          <LinearGradient
                  colors={[palette.surface, palette.panel]}
                  style={styles.featureCardPager}
                >
                  <View style={styles.featureIconWrapLarge}>
                    <MaterialIcons name={item.icon} size={28} color={palette.bg} />
            </View>
                  <Text style={styles.featureTileTitle}>{item.title}</Text>
                  <Text style={styles.featureTileDesc}>{item.desc}</Text>
          </LinearGradient>
      </View>
            );
          }}
        />
        <View style={styles.featureStepper}>
          {featureCards.map((card, idx) => (
            <View
              key={card.title}
            style={[
                styles.featureDot,
                idx === featureIndex
                  ? { backgroundColor: palette.accent, width: 18 }
                  : { backgroundColor: '#2D3657' },
              ]}
            />
          ))}
      </View>
      </View>
    );
  };

  const renderTheme = () => (
    <View style={styles.panel}>
      <Text style={styles.panelTitle}>Pick your vibe</Text>
      <Text style={styles.panelSubtitle}>Switch light/dark and choose a theme you like.</Text>

      <View style={styles.modeToggle}>
        {['light', 'dark'].map((mode) => {
          const active = selectedMode === mode;
          return (
          <TouchableOpacity 
              key={mode}
              style={[styles.modePill, active && { backgroundColor: palette.accent }]}
          onPress={() => {
                setSelectedMode(mode);
                setSelectedTheme(mode === 'light' ? 'blush-bloom' : 'cresvia');
              }}
            >
              <MaterialIcons name={mode === 'light' ? 'light-mode' : 'dark-mode'} size={18} color={active ? palette.bg : '#D7DEFF'} />
              <Text style={[styles.modePillText, active && { color: palette.bg }]}>{mode === 'light' ? 'Light' : 'Dark'}</Text>
          </TouchableOpacity>
          );
        })}
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.themeRow}>
        {themesByMode.map((t) => {
          const active = selectedTheme === t.id;
          const paletteTheme = t.theme[selectedMode] || t.theme;
          return (
        <TouchableOpacity 
              key={t.id}
              style={[styles.themeCard, { borderColor: active ? palette.accent : '#2D3657', borderWidth: active ? 2 : 1 }]}
              onPress={() => setSelectedTheme(t.id)}
            >
              <LinearGradient colors={paletteTheme.gradient || [paletteTheme.primary, paletteTheme.primaryLight || paletteTheme.primary]} style={styles.themeSwatch} />
              <Text style={styles.themeName}>{t.name}</Text>
              {active ? <MaterialIcons name="check-circle" size={18} color={palette.accent} /> : null}
        </TouchableOpacity>
          );
        })}
      </ScrollView>
        </View>
  );

  const renderBible = () => {
    const popular = bibleVersions.filter((v) => ['niv', 'esv', 'kjv', 'nlt'].includes(v.id));
    const others = bibleVersions.filter((v) => !['niv', 'esv', 'kjv', 'nlt'].includes(v.id));
    return (
      <View style={styles.panel}>
        <Text style={styles.panelTitle}>Choose your Bible version</Text>
        <Text style={styles.panelSubtitle}>Change anytime in settings.</Text>
        {popular.map((v) => {
          const active = selectedBibleVersion === v.id;
          return (
            <TouchableOpacity
              key={v.id}
              style={[styles.listItem, active && { borderColor: palette.accent, backgroundColor: palette.accentSoft }]}
              onPress={() => setSelectedBibleVersion(v.id)}
            >
              <View>
                <Text style={styles.listTitle}>{v.name}</Text>
                <Text style={styles.listSubtitle}>{v.abbreviation} · {v.category}</Text>
              </View>
              {active ? <MaterialIcons name="check-circle" size={20} color={palette.accent} /> : null}
            </TouchableOpacity>
          );
        })}

        <TouchableOpacity style={styles.showAllButton} onPress={() => setShowAllVersions(!showAllVersions)}>
          <Text style={styles.showAllText}>{showAllVersions ? 'Hide all versions' : 'Show all versions'}</Text>
          <MaterialIcons name={showAllVersions ? 'expand-less' : 'expand-more'} size={18} color={palette.accent} />
          </TouchableOpacity>

          {showAllVersions && (
          <ScrollView style={{ maxHeight: 240 }} showsVerticalScrollIndicator={false}>
            {others.map((v) => {
              const active = selectedBibleVersion === v.id;
              return (
                <TouchableOpacity
                  key={v.id}
                  style={[styles.listItem, active && { borderColor: palette.accent, backgroundColor: palette.accentSoft }]}
                  onPress={() => setSelectedBibleVersion(v.id)}
                >
                  <View>
                    <Text style={styles.listTitle}>{v.name}</Text>
                    <Text style={styles.listSubtitle}>{v.abbreviation} · {v.category}</Text>
        </View>
                  {active ? <MaterialIcons name="check-circle" size={20} color={palette.accent} /> : null}
                </TouchableOpacity>
              );
            })}
      </ScrollView>
        )}
        </View>
    );
  };

  const renderWeight = () => (
    <View style={styles.panel}>
      <Text style={styles.panelTitle}>Weight unit</Text>
      <Text style={styles.panelSubtitle}>Pick how you track your lifts.</Text>
      <View style={styles.weightRow}>
        {['kg', 'lbs'].map((unit) => {
          const active = weightUnit === unit;
          return (
            <TouchableOpacity
              key={unit}
              style={[styles.weightCard, active && { borderColor: palette.accent, backgroundColor: palette.accentSoft }]}
              onPress={() => setWeightUnit(unit)}
            >
              <Text style={styles.weightText}>{unit.toUpperCase()}</Text>
              <Text style={styles.weightSub}>{unit === 'kg' ? 'Metric' : 'Imperial'}</Text>
            </TouchableOpacity>
          );
        })}
                </View>
                  </View>
  );

  const renderPhoto = () => (
    <View style={styles.panel}>
      <Text style={styles.panelTitle}>Add your photo</Text>
      <Text style={styles.panelSubtitle}>Optional, but it feels more personal.</Text>
      <TouchableOpacity style={styles.photoFrame} onPress={pickImage}>
        {profileImage ? (
          <Image source={{ uri: profileImage }} style={styles.photo} />
        ) : (
          <View style={styles.photoPlaceholder}>
            <MaterialIcons name="add-a-photo" size={30} color={palette.accent} />
            <Text style={styles.photoPlaceholderText}>Tap to add</Text>
                  </View>
                )}
            </TouchableOpacity>
      <TouchableOpacity onPress={handleNext} style={styles.secondaryButton}>
        <Text style={styles.secondaryButtonText}>Skip for now</Text>
        </TouchableOpacity>
      </View>
  );

  const renderNotifications = () => (
    <View style={styles.panel}>
      <Text style={styles.panelTitle}>Stay on track</Text>
      <Text style={styles.panelSubtitle}>Enable reminders for prayers, tasks, and verse of the day.</Text>
      <View style={[styles.listItem, { borderColor: palette.accentSoft, backgroundColor: palette.panel }]}> 
        <MaterialIcons name="notifications-active" size={20} color={palette.accent} />
        <View style={{ flex: 1 }}>
          <Text style={styles.listTitle}>Allow notifications</Text>
          <Text style={styles.listSubtitle}>Only for what you enable.</Text>
      </View>
      </View>
      <TouchableOpacity style={styles.primaryCTA} onPress={handleNext}>
        <Text style={styles.primaryCTAText}>Allow & continue</Text>
        <MaterialIcons name="arrow-forward" size={18} color={palette.bg} />
              </TouchableOpacity>
        </View>
  );

  const renderSummary = () => (
    <View style={styles.panel}>
      <Text style={styles.panelTitle}>Ready to go</Text>
      <Text style={styles.panelSubtitle}>Heres your setup. You can change anything later.</Text>
      <View style={styles.summaryRow}><Text style={styles.summaryLabel}>Name</Text><Text style={styles.summaryValue}>{userName || 'Friend'}</Text></View>
      <View style={styles.summaryRow}><Text style={styles.summaryLabel}>Username</Text><Text style={styles.summaryValue}>@{username.toLowerCase().trim() || '—'}</Text></View>
      <View style={styles.summaryRow}><Text style={styles.summaryLabel}>Country</Text><Text style={styles.summaryValue}>{selectedCountry?.name || 'Not set'}</Text></View>
      <View style={styles.summaryRow}><Text style={styles.summaryLabel}>Language</Text><Text style={styles.summaryValue}>{selectedLanguage.toUpperCase()}</Text></View>
      <View style={styles.summaryRow}><Text style={styles.summaryLabel}>Bible</Text><Text style={styles.summaryValue}>{selectedBibleVersion.toUpperCase()}</Text></View>
      <View style={styles.summaryRow}><Text style={styles.summaryLabel}>Theme</Text><Text style={styles.summaryValue}>{selectedTheme}</Text></View>
      <View style={styles.summaryRow}><Text style={styles.summaryLabel}>Mode</Text><Text style={styles.summaryValue}>{selectedMode}</Text></View>
      <View style={styles.summaryRow}><Text style={styles.summaryLabel}>Weight</Text><Text style={styles.summaryValue}>{weightUnit.toUpperCase()}</Text></View>
      <TouchableOpacity style={styles.primaryCTA} onPress={finishOnboarding}>
        <Text style={styles.primaryCTAText}>Enter Biblely</Text>
        <MaterialIcons name="check" size={18} color={palette.bg} />
        </TouchableOpacity>
      </View>
  );

  const currentSlide = slidesConfig[step];

  const renderSlide = () => {
    switch (currentSlide.type) {
      case 'hero':
        return renderHero();
      case 'identity':
        return renderIdentity();
      case 'features':
        return renderFeatures();
      case 'theme':
        return renderTheme();
      case 'bible':
        return renderBible();
      case 'weight':
        return renderWeight();
      case 'photo':
        return renderPhoto();
      case 'notifications':
        return renderNotifications();
      case 'summary':
        return renderSummary();
        default:
          return null;
    }
  };

  const showProgress = currentSlide.type !== 'hero';
  const showNav = currentSlide.type !== 'hero';

  const primaryLabel = (() => {
    if (checkingUsername) return 'Checking...';
    if (currentSlide.type === 'notifications') return 'Allow & continue';
    if (currentSlide.type === 'summary') return 'Finish';
    return 'Next';
  })();

    return (
    <SafeAreaView style={{ flex: 1, backgroundColor: palette.bg }}>
      <View style={[styles.container, { backgroundColor: palette.bg }]}>
      {showProgress && (
        <View style={styles.progressDots}>
          {slidesConfig.map((_, idx) => (
            <View
              key={idx}
              style={[
                styles.progressDot,
                { backgroundColor: idx === step ? palette.accent : '#2D3657' },
              ]}
            />
          ))}
                </View>
              )}
      <Animated.View style={{ flex: 1, opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
        {renderSlide()}
      </Animated.View>
      {showNav && (
        <View style={styles.navRow}>
          <TouchableOpacity onPress={handleBack} disabled={step === 0}>
            <Text style={[styles.navText, { color: step === 0 ? '#576083' : '#D7DEFF' }]}>Back</Text>
                  </TouchableOpacity>
          <TouchableOpacity onPress={handleNext} style={[styles.primaryNavButton, checkingUsername && { opacity: 0.6 }]} disabled={checkingUsername}>
            <Text style={styles.primaryNavText}>{primaryLabel}</Text>
            <MaterialIcons name="arrow-forward" size={18} color={palette.bg} />
        </TouchableOpacity>
        </View>
      )}
    </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 20, paddingTop: 24, paddingBottom: 16 },
  progressDots: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: 12 },
  progressDot: { width: 8, height: 8, borderRadius: 999 },
  navRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12 },
  navText: { fontSize: 16, fontWeight: '700' },
  primaryNavButton: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: palette.accent, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 14 },
  primaryNavText: { fontSize: 16, fontWeight: '800', color: palette.bg },

  hero: { flex: 1, borderRadius: 28, padding: 28, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  heroLogoCard: { width: 140, height: 140, borderRadius: 36, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 18 },
  heroLogoGlow: { position: 'absolute', width: 180, height: 180, borderRadius: 48, backgroundColor: '#F7C94833', shadowColor: '#F7C948', shadowOpacity: 0.35, shadowRadius: 30 },
  heroLogo: { width: 90, height: 90 },
  heroTitle: { fontSize: 32, fontWeight: '900', color: '#FFFFFF', marginTop: 20 },
  heroSubtitle: { fontSize: 16, fontWeight: '600', color: '#D7DEFF', textAlign: 'center', marginTop: 12, lineHeight: 22 },
  primaryCTA: { marginTop: 22, alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: palette.accent, borderRadius: 16, paddingHorizontal: 20, paddingVertical: 12 },
  primaryCTAText: { fontSize: 16, fontWeight: '800', color: palette.bg },

  panel: { flex: 1, backgroundColor: palette.card, borderRadius: 24, padding: 20, borderWidth: 1, borderColor: '#1F2848', shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 12 },
  panelTitle: { fontSize: 24, fontWeight: '900', color: '#FFFFFF' },
  panelSubtitle: { fontSize: 14, fontWeight: '600', color: '#B5C0E0', marginTop: 6 },

  inputRow: { marginTop: 14, borderWidth: 1, borderRadius: 14, borderColor: '#2D3657', paddingHorizontal: 12, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: palette.surface },
  input: { flex: 1, fontSize: 15, fontWeight: '700', color: '#FFFFFF' },

  countryList: { marginTop: 12, maxHeight: 260 },
  countryItem: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#2D3657', backgroundColor: palette.surface, marginBottom: 8 },
  countryFlag: { fontSize: 18 },
  countryName: { fontSize: 15, fontWeight: '800', color: '#FFFFFF' },

  featurePage: { width: '100%', paddingVertical: 12 },
  featureCardPager: { borderRadius: 20, padding: 16, borderWidth: 1, borderColor: '#2D3657', minHeight: 220, justifyContent: 'flex-start', gap: 12 },
  featureIconWrap: { width: 36, height: 36, borderRadius: 10, backgroundColor: palette.accent, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  featureIconWrapLarge: { width: 48, height: 48, borderRadius: 14, backgroundColor: palette.accent, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  featureTileTitle: { fontSize: 18, fontWeight: '900', color: '#FFFFFF', marginBottom: 6 },
  featureTileDesc: { fontSize: 14, fontWeight: '600', color: '#C5CEE9', lineHeight: 20 },

  modeToggle: { flexDirection: 'row', gap: 10, marginTop: 12 },
  modePill: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, borderWidth: 1, borderColor: '#2D3657' },
  modePillText: { fontSize: 14, fontWeight: '800', color: '#D7DEFF' },

  themeRow: { gap: 10, paddingVertical: 12 },
  themeCard: { width: 150, padding: 10, borderRadius: 14, backgroundColor: palette.surface, gap: 8 },
  themeSwatch: { height: 80, borderRadius: 10 },
  themeName: { fontSize: 14, fontWeight: '800', color: '#FFFFFF' },

  listItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: 14, borderRadius: 12, borderWidth: 1, borderColor: '#2D3657', backgroundColor: palette.surface, marginTop: 10 },
  listTitle: { fontSize: 15, fontWeight: '800', color: '#FFFFFF' },
  listSubtitle: { fontSize: 13, fontWeight: '600', color: '#B5C0E0' },
  showAllButton: { marginTop: 12, flexDirection: 'row', alignItems: 'center', gap: 6, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#2D3657', backgroundColor: palette.surface },
  showAllText: { fontSize: 14, fontWeight: '800', color: '#FFFFFF' },

  weightRow: { flexDirection: 'row', gap: 12, marginTop: 12 },
  weightCard: { flex: 1, padding: 14, borderRadius: 14, borderWidth: 1, borderColor: '#2D3657', backgroundColor: palette.surface, alignItems: 'center', gap: 6 },
  weightText: { fontSize: 18, fontWeight: '900', color: '#FFFFFF' },
  weightSub: { fontSize: 13, fontWeight: '700', color: '#B5C0E0' },

  photoFrame: { height: 220, borderRadius: 16, borderWidth: 1, borderColor: '#2D3657', backgroundColor: palette.surface, alignItems: 'center', justifyContent: 'center', marginTop: 14, overflow: 'hidden' },
  photo: { width: '100%', height: '100%' },
  photoPlaceholder: { alignItems: 'center', gap: 6 },
  photoPlaceholderText: { fontSize: 14, fontWeight: '700', color: '#C5CEE9' },
  secondaryButton: { marginTop: 12, alignSelf: 'center' },
  secondaryButtonText: { fontSize: 14, fontWeight: '800', color: '#B5C0E0' },

  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8 },
  summaryLabel: { fontSize: 14, fontWeight: '700', color: '#B5C0E0' },
  summaryValue: { fontSize: 14, fontWeight: '900', color: '#FFFFFF' },
});

export default OnboardingFlow;

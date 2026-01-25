import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Platform,
  Image,
  StatusBar,
  Animated,
  Dimensions,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Audio } from 'expo-av';
import { useTheme } from '../contexts/ThemeContext';
import { hapticFeedback } from '../utils/haptics';
import bibleCharactersService from '../services/bibleCharactersService';
import BibleTimeline from './BibleTimeline';
import InteractiveBibleMaps from './InteractiveBibleMaps';
import ThematicGuides from './ThematicGuides';
import KeyVerses from './KeyVerses';
import BibleFastFacts from './BibleFastFacts';
import QuizGames from './QuizGames';
import AudioLearning from './AudioLearning';

// Animated Study Section Card Component (follows Rules of Hooks)
const AnimatedStudySectionCard = ({ section, onPress, isDark, theme, index }) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.96,
      useNativeDriver: true,
      tension: 300,
      friction: 10,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      tension: 300,
      friction: 10,
    }).start();
  };

  return (
    <Animated.View
      style={{
        transform: [{ scale: scaleAnim }],
        marginBottom: 16,
      }}
    >
      <TouchableOpacity
        style={[styles.sectionCard, { 
          backgroundColor: isDark ? theme.card : (theme.surface || 'rgba(255,255,255,0.9)'),
          borderWidth: isDark ? 0 : 1,
          borderColor: isDark ? 'transparent' : (theme.border || 'rgba(0,0,0,0.08)'),
        }]}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={0.7}
      >
        <LinearGradient
          colors={isDark ? 
            [`${section.color}FF`, `${section.color}CC`, `${section.color}99`] :
            [`${section.color}FF`, `${section.color}CC`, `${section.color}99`]
          }
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.sectionGradient}
        >
          <View style={[styles.sectionIconContainer, { 
            backgroundColor: 'rgba(255, 255, 255, 0.25)',
            borderWidth: 2,
            borderColor: 'rgba(255, 255, 255, 0.35)',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.15,
            shadowRadius: 4,
            elevation: 4,
          }]}>
            <MaterialIcons 
              name={section.icon} 
              size={30} 
              color="#FFFFFF"
              style={{ 
                fontWeight: 'bold',
                textShadowColor: 'rgba(0,0,0,0.3)',
                textShadowOffset: { width: 0, height: 1 },
                textShadowRadius: 3
              }}
            />
          </View>
          
          <View style={styles.sectionContent}>
            <Text style={[styles.sectionTitle, { 
              color: '#FFFFFF',
              fontWeight: '800',
              fontSize: 18,
              letterSpacing: -0.3
            }]}>
              {section.title}
            </Text>
            <Text style={[styles.sectionDescription, { 
              color: '#FFFFFF',
              fontWeight: '500',
              fontSize: 14,
              lineHeight: 20
            }]}>
              {section.description}
            </Text>
            
            <View style={styles.featuresContainer}>
              {section.features.slice(0, 2).map((feature, idx) => (
                <View key={idx} style={[styles.featureTag, {
                  backgroundColor: 'rgba(255, 255, 255, 0.25)',
                  borderWidth: 1,
                  borderColor: 'rgba(255, 255, 255, 0.4)',
                }]}>
                  <Text style={[styles.featureText, { 
                    color: '#FFFFFF',
                    fontWeight: '700',
                    fontSize: 12,
                    letterSpacing: 0.2
                  }]}>
                    {feature}
                  </Text>
                </View>
              ))}
            </View>
          </View>

          <View style={[styles.sectionArrowContainer, {
            backgroundColor: isDark ? `${section.color}40` : `${section.color}35`,
            borderWidth: 1,
            borderColor: isDark ? `${section.color}60` : `${section.color}50`,
            shadowColor: section.color,
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.2,
            shadowRadius: 2,
            elevation: 2,
          }]}>
            <MaterialIcons 
              name="chevron-right" 
              size={24} 
              color={section.color}
              style={{ 
                fontWeight: 'bold',
                textShadowColor: isDark ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.6)',
                textShadowOffset: { width: 0, height: 1 },
                textShadowRadius: 1
              }}
            />
          </View>
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
};

// Animated Individual Character Card Component (follows Rules of Hooks)
const AnimatedIndividualCharacterCard = ({ character, section, group, onPress, isDark, theme, index }) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const shimmerAnim = useRef(new Animated.Value(0)).current;
  const isAvailable = character.available !== false;

  useEffect(() => {
    // Shimmer effect with delay based on index
    const timeout = setTimeout(() => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(shimmerAnim, {
            toValue: 1,
            duration: 2500,
            useNativeDriver: true,
          }),
          Animated.timing(shimmerAnim, {
            toValue: 0,
            duration: 2500,
            useNativeDriver: true,
          }),
        ])
      ).start();
    }, index * 100);

    return () => clearTimeout(timeout);
  }, [index]);

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.97,
      useNativeDriver: true,
      tension: 400,
      friction: 10,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      tension: 400,
      friction: 10,
    }).start();
  };

  return (
    <Animated.View
      style={{
        transform: [{ scale: scaleAnim }],
        marginBottom: 12,
      }}
    >
      <TouchableOpacity
        style={[styles.modernCharacterCard, { 
          backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.95)',
          shadowColor: isAvailable ? section.color : theme.textTertiary,
          borderWidth: isDark ? 0 : 1,
          borderColor: isDark ? 'transparent' : (theme.border || 'rgba(0,0,0,0.08)'),
          width: '100%',
        }]}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={0.7}
        disabled={!isAvailable}
      >
        {/* Shimmer overlay */}
        <Animated.View 
          style={[
            styles.characterShimmer,
            {
              opacity: shimmerAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [0, 0.15]
              }),
              transform: [{
                translateX: shimmerAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [-150, 150]
                })
              }]
            }
          ]}
        >
          <LinearGradient
            colors={['transparent', 'rgba(255, 255, 255, 0.5)', 'transparent']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>

        {/* Background gradient accent */}
        <LinearGradient
          colors={isAvailable ? 
            [group.color + '18', group.color + '08', 'transparent'] :
            ['rgba(128,128,128,0.08)', 'rgba(128,128,128,0.04)', 'transparent']
          }
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.characterCardGradient}
        />

        <View style={styles.characterCardContent}>
          {/* Avatar with gradient */}
          <View style={[styles.characterAvatar, {
            backgroundColor: isAvailable ? group.color + '25' : 'rgba(128,128,128,0.15)',
            borderWidth: 2,
            borderColor: isAvailable ? group.color + '40' : 'rgba(128,128,128,0.25)',
          }]}>
            <LinearGradient
              colors={isAvailable ? 
                [group.color + '30', group.color + '20'] :
                ['rgba(128,128,128,0.2)', 'rgba(128,128,128,0.1)']
              }
              style={styles.avatarGradient}
            >
              <MaterialIcons 
                name={isAvailable ? "person" : "lock"} 
                size={22} 
                color={isAvailable ? group.color : theme.textTertiary} 
              />
            </LinearGradient>
          </View>

          {/* Name */}
          <Text style={[styles.characterNameText, { 
            color: isAvailable ? (isDark ? '#FFFFFF' : theme.text) : theme.textTertiary,
          }]}>
            {character.name}
          </Text>

          {/* Status indicator */}
          {isAvailable && (
            <View style={[styles.characterDot, { backgroundColor: group.color }]} />
          )}
          
          {/* Arrow */}
          <View style={[styles.characterArrow, {
            backgroundColor: isAvailable ? group.color + '20' : 'rgba(128,128,128,0.15)',
          }]}>
            <MaterialIcons 
              name="arrow-forward-ios" 
              size={14} 
              color={isAvailable ? group.color : theme.textTertiary} 
            />
            </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

// Animated Character Card Component (follows Rules of Hooks)
const AnimatedCharacterCard = ({ group, section, onPress, isDark, theme }) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Continuous shimmer animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, {
          toValue: 1,
          duration: 3000,
          useNativeDriver: true,
        }),
        Animated.timing(shimmerAnim, {
          toValue: 0,
          duration: 3000,
          useNativeDriver: true,
        }),
      ])
    ).start();

  }, []);

  const handlePressIn = () => {
    Animated.parallel([
    Animated.spring(scaleAnim, {
        toValue: 0.94,
      useNativeDriver: true,
        tension: 400,
      friction: 10,
      }),
      Animated.spring(rotateAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 400,
        friction: 10,
      }),
    ]).start();
  };

  const handlePressOut = () => {
    Animated.parallel([
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
        tension: 400,
      friction: 10,
      }),
      Animated.spring(rotateAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 400,
        friction: 10,
      }),
    ]).start();
  };

  const rotateInterpolate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '-2deg']
  });

  return (
    <Animated.View
      style={{
        transform: [
          { scale: scaleAnim },
          { rotate: rotateInterpolate }
        ],
        width: '48%',
        marginBottom: 16,
      }}
    >
      <TouchableOpacity
        style={[styles.characterGroupCard, { 
          shadowColor: group.color,
          shadowOpacity: 0.25,
          width: '100%',
        }]}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={0.7}
      >
        {/* Animated shimmer overlay */}
        <Animated.View 
          style={[
            styles.shimmerEffect,
            {
              opacity: shimmerAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [0, 0.2]
              }),
              transform: [{
                translateX: shimmerAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [-200, 200]
                })
              }]
            }
          ]}
        >
          <LinearGradient
            colors={['transparent', 'rgba(255, 255, 255, 0.4)', 'transparent']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>

        {/* Main gradient background */}
        <LinearGradient
          colors={[group.color + 'E6', group.color + 'CC', group.color + 'B3']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.cardGradientBackground}
        >
          <View style={styles.cardOverlay}>
            {/* Icon */}
            <View style={styles.iconCircle}>
              <LinearGradient
                colors={['rgba(255, 255, 255, 0.25)', 'rgba(255, 255, 255, 0.1)']}
                style={styles.iconCircleGradient}
              >
                <MaterialIcons name="people" size={22} color="#FFFFFF" />
              </LinearGradient>
            </View>
            
          {/* Content */}
            <View style={styles.cardTextContent}>
              <Text style={styles.modernCharacterGroupTitle}>
              {group.title}
            </Text>
            
              <View style={styles.modernCountBadge}>
                <MaterialIcons name="people" size={14} color="#FFFFFF" />
                <Text style={styles.modernCountText}>
                  {group.characters.length}
                </Text>
            </View>
          </View>

            {/* Arrow */}
            <View style={styles.modernArrowContainer}>
              <MaterialIcons name="arrow-forward-ios" size={16} color="#FFFFFF" />
          </View>
        </View>
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
};


const BibleStudyModal = ({ visible, onClose, onNavigateToVerse, onDiscussVerse }) => {
  const { theme, isDark, isBlushTheme, isCresviaTheme, isEternaTheme, isSpidermanTheme, isFaithTheme, isSailormoonTheme } = useTheme();
  const [selectedSection, setSelectedSection] = useState('main');
  const [selectedCharacterGroup, setSelectedCharacterGroup] = useState(null);
  const [selectedCharacter, setSelectedCharacter] = useState(null);
  const [showTimeline, setShowTimeline] = useState(false);
  
  // Ref for character detail ScrollView
  const characterDetailScrollRef = useRef(null);
  // Ref for character group detail ScrollView (so it always opens at the top)
  const characterGroupDetailScrollRef = useRef(null);
  
  // Character data state
  const [characterProfiles, setCharacterProfiles] = useState({});
  const [characterGroups, setCharacterGroups] = useState([]);
  const [charactersLoading, setCharactersLoading] = useState(true);
  const [charactersRefreshing, setCharactersRefreshing] = useState(false);
  
  // Modal overlay states for each section
  const [showTimelineModal, setShowTimelineModal] = useState(false);
  const [showCharactersModal, setShowCharactersModal] = useState(false);
  const [showMapsModal, setShowMapsModal] = useState(false);
  const [showVersesModal, setShowVersesModal] = useState(false);
  const [showKeyVersesModal, setShowKeyVersesModal] = useState(false);
  const [showFactsModal, setShowFactsModal] = useState(false);
  const [showThemesModal, setShowThemesModal] = useState(false);
  const [showParallelsModal, setShowParallelsModal] = useState(false);
  const [showAudioModal, setShowAudioModal] = useState(false);
  const [showQuizModal, setShowQuizModal] = useState(false);
  
  // Character audio state
  const [characterSound, setCharacterSound] = useState(null);
  const [isCharacterAudioPlaying, setIsCharacterAudioPlaying] = useState(false);
  const [isCharacterAudioLoading, setIsCharacterAudioLoading] = useState(false);
  const [characterAudioError, setCharacterAudioError] = useState(null);

  // Load character data from GitHub on mount
  useEffect(() => {
    const loadCharacterData = async () => {
      try {
        setCharactersLoading(true);
        
        // Force refresh to get latest data from GitHub
        await bibleCharactersService.refresh();
        
        const profiles = bibleCharactersService.getCharacters();
        const groups = bibleCharactersService.getCharacterGroups();
        
        console.log('📥 Raw profiles from service:', Object.keys(profiles));
        console.log('📥 Sample profile:', profiles['Adam']);
        
        // Process profiles to use GitHub images with local fallback
        const processedProfiles = {};
        Object.keys(profiles).forEach(key => {
          const profile = profiles[key];
          const imageSource = profile.imageUrl ? { uri: profile.imageUrl } : getLocalImage(key);
          processedProfiles[key] = {
            ...profile,
            // Use GitHub image URL if available, otherwise fallback to local
            image: imageSource,
          };
          console.log(`📸 ${key} image:`, imageSource);
        });
        
        // Add theme-aware colors to character groups
        const colors = cardColors;
        const groupsWithColors = groups.map((group, index) => ({
          ...group,
          color: colors[index % colors.length],
        }));
        
        setCharacterProfiles(processedProfiles);
        setCharacterGroups(groupsWithColors);
        console.log(`✅ Loaded ${Object.keys(processedProfiles).length} characters and ${groupsWithColors.length} groups`);
      } catch (error) {
        console.error('Error loading character data:', error);
        // Fallback to empty state
        setCharacterProfiles({});
        setCharacterGroups([]);
      } finally {
        setCharactersLoading(false);
      }
    };

    loadCharacterData();
  }, []);

  // Scroll to top when character is selected
  useEffect(() => {
    if (selectedCharacter && characterDetailScrollRef.current) {
      // Add a small delay to ensure ScrollView and content are fully mounted
      setTimeout(() => {
        characterDetailScrollRef.current?.scrollTo({ y: 0, animated: true });
      }, 100);
    }
  }, [selectedCharacter]);

  // Always start group detail at the top (prevents inheriting prior scroll position)
  useEffect(() => {
    if (selectedCharacterGroup && characterGroupDetailScrollRef.current) {
      // Small delay to ensure hero card/layout mounts before scrolling
      setTimeout(() => {
        characterGroupDetailScrollRef.current?.scrollTo({ y: 0, animated: false });
      }, 50);
    }
  }, [selectedCharacterGroup]);

  // Pull to refresh handler for Bible Characters
  const onRefreshCharacters = async () => {
    setCharactersRefreshing(true);
    hapticFeedback.light();
    try {
      // Force refresh from GitHub
      await bibleCharactersService.refresh();
      
      const profiles = bibleCharactersService.getCharacters();
      const groups = bibleCharactersService.getCharacterGroups();
      
      // Process profiles to use GitHub images with local fallback
      const processedProfiles = {};
      Object.keys(profiles).forEach(key => {
        const profile = profiles[key];
        const imageSource = profile.imageUrl ? { uri: profile.imageUrl } : getLocalImage(key);
        processedProfiles[key] = {
          ...profile,
          image: imageSource,
        };
      });
      
      // Add theme-aware colors to character groups
      const colors = cardColors;
      const groupsWithColors = groups.map((group, index) => ({
        ...group,
        color: colors[index % colors.length],
      }));
      
      setCharacterProfiles(processedProfiles);
      setCharacterGroups(groupsWithColors);
    } catch (error) {
      console.error('Error refreshing characters:', error);
    } finally {
      setCharactersRefreshing(false);
    }
  };

  // Character audio playback functions
  const playCharacterAudio = async (audioUrl) => {
    if (!audioUrl) {
      setCharacterAudioError('No audio available for this character');
      return;
    }
    
    try {
      setIsCharacterAudioLoading(true);
      setCharacterAudioError(null);
      hapticFeedback.light();
      
      // Stop any existing audio
      if (characterSound) {
        await characterSound.stopAsync();
        await characterSound.unloadAsync();
        setCharacterSound(null);
      }
      
      // Configure audio mode
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        shouldDuckAndroid: true,
      });
      
      // Load and play audio from GitHub
      const { sound } = await Audio.Sound.createAsync(
        { uri: audioUrl },
        { shouldPlay: true },
        onCharacterAudioStatusUpdate
      );
      
      setCharacterSound(sound);
      setIsCharacterAudioPlaying(true);
    } catch (error) {
      console.error('Error playing character audio:', error);
      setCharacterAudioError('Failed to load audio');
    } finally {
      setIsCharacterAudioLoading(false);
    }
  };

  const onCharacterAudioStatusUpdate = (status) => {
    if (status.didJustFinish) {
      setIsCharacterAudioPlaying(false);
    }
  };

  const pauseCharacterAudio = async () => {
    if (characterSound) {
      hapticFeedback.light();
      await characterSound.pauseAsync();
      setIsCharacterAudioPlaying(false);
    }
  };

  const resumeCharacterAudio = async () => {
    if (characterSound) {
      hapticFeedback.light();
      await characterSound.playAsync();
      setIsCharacterAudioPlaying(true);
    }
  };

  const restartCharacterAudio = async () => {
    if (characterSound) {
      hapticFeedback.medium();
      await characterSound.setPositionAsync(0);
      await characterSound.playAsync();
      setIsCharacterAudioPlaying(true);
    }
  };

  const stopCharacterAudio = async () => {
    if (characterSound) {
      try {
        await characterSound.stopAsync();
        await characterSound.unloadAsync();
      } catch (e) {
        console.log('Error stopping audio:', e);
      }
      setCharacterSound(null);
      setIsCharacterAudioPlaying(false);
    }
  };

  // Cleanup audio when character changes or modal closes
  useEffect(() => {
    return () => {
      if (characterSound) {
        characterSound.unloadAsync();
      }
    };
  }, [characterSound]);

  // Stop audio when leaving character detail view
  useEffect(() => {
    if (!selectedCharacter) {
      stopCharacterAudio();
    }
  }, [selectedCharacter]);

  // Helper to get local images (fallback when GitHub images aren't available)
  const getLocalImage = (characterName) => {
    try {
      const imageMap = {
        'Adam': require('../assets/adam.png'),
        'Eve': require('../assets/eve.png'),
        'Cain': require('../assets/cain.png'),
        'Abel': require('../assets/abel.png'),
      };
      const image = imageMap[characterName];
      if (image) {
        console.log(`✅ Using local image for ${characterName}`);
        return image;
      }
      console.log(`⚠️ No local image found for ${characterName}`);
      return null;
    } catch (error) {
      console.error(`❌ Error loading local image for ${characterName}:`, error);
      return null;
    }
  };

  // Generate theme-appropriate colors for study sections
  const getThemeColors = () => {
    const baseColors = [
      theme.primary,
      theme.primaryLight,
      theme.primaryDark,
      theme.success,
      theme.warning,
      theme.info,
      theme.error,
    ];
    
    // Create variations of theme colors for different sections
    const variations = [];
    baseColors.forEach(color => {
      variations.push(color);
      // Add slight variations by adjusting opacity or mixing
      if (color.includes('#')) {
        variations.push(color + 'CC'); // Add transparency
        variations.push(color + '99'); // More transparency
      }
    });
    
    return variations;
  };

  const themeColors = getThemeColors();

  const studySections = [
    {
      id: 'quiz',
      title: 'Quiz & Games',
      icon: 'quiz',
      description: 'Test your Bible knowledge',
      color: '#673AB7', // Deep Purple
      features: ['Interactive quizzes', 'Memory games', 'Progress tracking', 'Achievement badges']
    },
    {
      id: 'characters',
      title: 'Bible Characters',
      icon: 'people',
      description: 'Explore profiles of key Bible figures',
      color: '#E91E63', // Vibrant Pink
      features: ['Character profiles', 'Family trees', 'Key events', 'Life lessons']
    },
    {
      id: 'timeline',
      title: 'Bible Timeline',
      icon: 'timeline',
      description: 'Journey through Biblical history',
      color: '#1E40AF', // Deep Dark Blue for better readability
      features: ['Chronological events', 'Historical dates', 'Quick verse links', 'Era overview']
    },
    {
      id: 'maps',
      title: 'Interactive Maps',
      icon: 'map',
      description: 'Discover Biblical locations',
      color: '#4CAF50', // Vibrant Green
      features: ['Key locations', 'Journey routes', 'Historical context', 'Character connections']
    },
    {
      id: 'themes',
      title: 'Thematic Guides',
      icon: 'category',
      description: 'Study by topics and themes',
      color: '#9C27B0', // Vibrant Purple
      features: ['Faith stories', 'Leadership lessons', 'Miracles', 'Prophecies']
    },
    {
      id: 'verses',
      title: 'Key Verses',
      icon: 'book',
      description: 'Essential verses by topic',
      color: '#FF9800', // Vibrant Orange
      features: ['Topical verses', 'Memory verses', 'Life guidance', 'Inspirational quotes']
    },
    {
      id: 'facts',
      title: 'Fast Facts',
      icon: 'lightbulb',
      description: 'Did you know? Bible trivia',
      color: '#795548', // Rich Brown
      features: ['Amazing facts', 'Quick summaries', 'Fun trivia', 'Historical insights']
    },
    {
      id: 'audio',
      title: 'Audio Learning',
      icon: 'headset',
      description: 'Listen and learn',
      color: '#FF5722', // Deep Orange
      features: ['Name pronunciation', 'Story summaries', 'Audio guides', 'Listening plans']
    }
  ];

  // Define theme-aware colors for character groups
  const getCardColors = () => {
    if (isBlushTheme) {
      return ['#FFB6C1', '#FF69B4', '#FF1493', '#FFC0CB', '#FFB3D9', '#FF8DC7', '#FF6BB5', '#FF4DA6'];
    } else if (isCresviaTheme) {
      return ['#9370DB', '#8A2BE2', '#6A0DAD', '#BA55D3', '#9932CC', '#8B7AB8', '#7B68EE', '#6A5ACD'];
    } else if (isEternaTheme) {
      return ['#663399', '#4B0082', '#2E0854', '#8B008B', '#9400D3', '#800080', '#9370DB', '#8A2BE2'];
    } else if (isSpidermanTheme) {
      return ['#E31E24', '#C70000', '#FF4444', '#B30000', '#E31E24', '#C70000', '#FF2020', '#A00000'];
    } else if (isFaithTheme) {
      return ['#4A90E2', '#5BA3F5', '#2979FF', '#90CAF9', '#4A90E2', '#5BA3F5', '#64B5F6', '#42A5F5'];
    } else if (isSailormoonTheme) {
      return ['#C8A2D0', '#B8A4D9', '#FFB6D9', '#E0C4E8', '#C8A2D0', '#9B7BA8', '#E8D4F0', '#B8A4D9'];
    } else if (isDark) {
      return ['#3B82F6', '#2563EB', '#1D4ED8', '#60A5FA', '#3B82F6', '#2563EB', '#1E40AF', '#1E3A8A'];
    } else {
      return ['#60A5FA', '#3B82F6', '#2563EB', '#93C5FD', '#60A5FA', '#3B82F6', '#2563EB', '#1D4ED8'];
    }
  };

  const cardColors = getCardColors();

  // characterGroups is now loaded dynamically from state (see useEffect above)

  const handleSectionPress = (sectionId) => {
    hapticFeedback.light();
    
    // Open modal overlays instead of changing selectedSection
    switch(sectionId) {
      case 'timeline':
        setShowTimelineModal(true);
        break;
      case 'characters':
        setShowCharactersModal(true);
        break;
      case 'maps':
        setShowMapsModal(true);
        break;
      case 'verses':
        setShowKeyVersesModal(true);
        break;
      case 'facts':
        setShowFactsModal(true);
        break;
      case 'themes':
        setShowThemesModal(true);
        break;
      case 'parallels':
        setShowParallelsModal(true);
        break;
      case 'audio':
        setShowAudioModal(true);
        break;
      default:
        // Fallback to old behavior for any unhandled sections
        setSelectedSection(sectionId);
    }
  };

  const renderMainMenu = () => (
    <ScrollView 
      style={styles.content} 
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingTop: Platform.OS === 'ios' ? 110 : 80 }}
    >
      <View style={styles.headerContainer}>
          {/* Title text removed but container kept for spacing */}
      </View>

      <View style={styles.sectionsGrid}>
        {studySections.map((section, index) => (
          <AnimatedStudySectionCard
            key={section.id}
            section={section}
            index={index}
            isDark={isDark}
            theme={theme}
            onPress={() => handleSectionPress(section.id)}
          />
        ))}
      </View>

      {/* Coming Soon message removed - features are now available */}
    </ScrollView>
  );

  // Create modal overlay for each section (keeping all existing content)
  const renderSectionModalOverlay = (sectionId, showModal, setShowModal) => {
    const section = studySections.find(s => s.id === sectionId);
    if (!section) return null;

    return (
      <Modal visible={showModal} animationType="slide" presentationStyle="fullScreen" onRequestClose={() => {}}>
        <View style={{ flex: 1, backgroundColor: theme.background }}>
          <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor="transparent" translucent={true} />
          
          {/* Header DELETED for characters */}
          
          <View style={{ flex: 1, backgroundColor: theme.background, paddingTop: 0, paddingBottom: 0 }}>

          {/* Special handling for characters section */}
          {sectionId === 'characters' && renderCharactersSection(section)}
          
          {/* Render actual content for each section */}
          {sectionId === 'timeline' && <BibleTimeline />}
          {sectionId === 'maps' && <InteractiveBibleMaps />}
          {sectionId === 'themes' && <ThematicGuides />}
          {sectionId === 'verses' && <KeyVerses />}
          
          {/* For other sections, show basic content instead of "Coming Soon" */}
          {!['characters', 'timeline', 'maps', 'themes', 'verses'].includes(sectionId) && (
            <ScrollView 
              style={styles.content} 
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingTop: Platform.OS === 'ios' ? 110 : 80 }}
            >
              <View style={styles.comingSoonContainer}>
                <BlurView intensity={20} style={styles.comingSoonCard}>
                  <MaterialIcons name={section.icon} size={32} color={section.color} />
                  <Text style={[styles.comingSoonTitle, { color: theme.text }]}>
                    {section.title}
                  </Text>
                  <Text style={[styles.comingSoonText, { color: theme.textSecondary }]}>
                    This feature is available! Explore the {section.title.toLowerCase()} section.
                  </Text>
                </BlurView>
              </View>
            </ScrollView>
          )}
          </View>
          
          {/* NEW: Transparent Blurry Header for Bible Characters */}
          {sectionId === 'characters' && (
            <BlurView 
              intensity={30} 
              tint={isDark ? 'dark' : 'light'} 
              style={{ 
                position: 'absolute', 
                top: 0, 
                left: 0, 
                right: 0, 
                zIndex: 1000,
                borderBottomLeftRadius: 20,
                borderBottomRightRadius: 20,
                overflow: 'hidden',
              }}
            >
              <View style={{ height: Platform.OS === 'ios' ? 60 : 30 }} />
              
              <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingHorizontal: 20,
                paddingVertical: 12,
              }}>
                <TouchableOpacity 
                  onPress={() => setShowModal(false)} 
                  style={{ 
                    backgroundColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)',
                    paddingHorizontal: 16, 
                    paddingVertical: 8,
                    borderRadius: 20,
                  }}
                >
                  <Text style={{ color: theme.primary, fontSize: 16, fontWeight: '600' }}>
                    Back
                  </Text>
                </TouchableOpacity>
                
                <Text style={{ color: theme.text, fontSize: 18, fontWeight: '600', textAlign: 'center' }}>
                  Bible Characters
                </Text>
                
                <View style={{ width: 60 }} />
              </View>
            </BlurView>
          )}

          {/* Transparent Blurred Header for Fast Facts - Same as Bible Timeline */}
          {sectionId === 'facts' && (
            <BlurView 
              intensity={20} 
              tint={isDark ? 'dark' : 'light'} 
              style={{ 
                position: 'absolute', 
                top: 0, 
                left: 0, 
                right: 0, 
                zIndex: 1000,
                backgroundColor: 'transparent',
                borderBottomLeftRadius: 20,
                borderBottomRightRadius: 20,
                overflow: 'hidden',
              }}
            >
              <View style={{ height: Platform.OS === 'ios' ? 60 : 30, backgroundColor: 'transparent' }} />
              <View style={[styles.solidHeader, { backgroundColor: 'transparent', borderBottomWidth: 0, paddingTop: 8, paddingBottom: 12 }]}>
                <TouchableOpacity
                  onPress={() => setShowModal(false)}
                  style={{ 
                    backgroundColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)',
                    paddingHorizontal: 16, 
                    paddingVertical: 8,
                    borderRadius: 20,
                  }}
                >
                  <Text style={[{ color: theme.primary, fontSize: 16, fontWeight: '600' }]} numberOfLines={1}>Back</Text>
                </TouchableOpacity>
                <Text style={[styles.solidHeaderTitle, { color: theme.text }]}>
                  Fast Facts
                </Text>
                <View style={{ width: 60 }} />
              </View>
            </BlurView>
          )}
        </View>
      </Modal>
    );
  };

  const renderSectionDetail = () => {
    const section = studySections.find(s => s.id === selectedSection);
    if (!section) return null;

    // Special handling for characters section
    if (selectedSection === 'characters') {
      return renderCharactersSection(section);
    }

    // Special handling for timeline section
    if (selectedSection === 'timeline') {
      return (
        <BibleTimeline
          visible={true}
          onClose={() => setSelectedSection('main')}
          onNavigateToVerse={(verse) => {
            // Future: Navigate to Bible verse
            console.log('Navigate to verse:', verse);
          }}
        />
      );
    }

    // Special handling for quiz section - open full screen modal
    if (selectedSection === 'quiz') {
      setShowQuizModal(true);
      setSelectedSection('main');
      return null;
    }

    return (
      <ScrollView 
        style={styles.content} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: Platform.OS === 'ios' ? 110 : 80 }}
      >
        <View style={styles.detailHeader}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => {
              hapticFeedback.light();
              setSelectedSection('main');
            }}
          >
            <MaterialIcons name="arrow-back" size={24} color={theme.text} />
          </TouchableOpacity>
          
          <View style={styles.detailTitleContainer}>
            <View style={[styles.detailIcon, { backgroundColor: `${section.color}20` }]}>
              <MaterialIcons name={section.icon} size={32} color={section.color} />
            </View>
            <Text style={[styles.detailTitle, { color: theme.text }]}>
              {section.title}
            </Text>
            <Text style={[styles.detailDescription, { color: theme.textSecondary }]}>
              {section.description}
            </Text>
          </View>
        </View>

        <View style={styles.comingSoonContainer}>
          <BlurView intensity={20} style={styles.comingSoonCard}>
            <MaterialIcons name="build" size={32} color={section.color} />
            <Text style={[styles.comingSoonTitle, { color: theme.text }]}>
              {section.title} - In Development
            </Text>
            <Text style={[styles.comingSoonText, { color: theme.textSecondary }]}>
              This section will include:
            </Text>
            
            <View style={styles.featuresList}>
              {section.features.map((feature, idx) => (
                <View key={idx} style={styles.featureItem}>
                  <MaterialIcons name="check-circle" size={16} color={section.color} />
                  <Text style={[styles.featureItemText, { color: theme.text }]}>
                    {feature}
                  </Text>
                </View>
              ))}
            </View>
          </BlurView>
        </View>
      </ScrollView>
    );
  };

  const renderCharactersSection = (section) => {
    if (selectedCharacter) {
      return renderCharacterDetail();
    }
    
    if (selectedCharacterGroup) {
      return renderCharacterGroupDetail();
    }

    return (
      <ScrollView 
        style={styles.content} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: 0 }}
        refreshControl={
          <RefreshControl
            refreshing={charactersRefreshing}
            onRefresh={onRefreshCharacters}
            tintColor={theme.primary}
            colors={[theme.primary]}
            title="Pull to refresh..."
            titleColor={theme.textSecondary}
            progressViewOffset={Platform.OS === 'ios' ? 110 : 80}
          />
        }
      >
        {/* Spacer for header */}
        <View style={{ height: Platform.OS === 'ios' ? 130 : 100 }} />

        {/* Character Group Cards - 2 per row with Micro-Interactions */}
        <View style={styles.characterGroupsGrid}>
          {characterGroups.map((group, index) => (
            <AnimatedCharacterCard
              key={group.id}
              group={group}
              section={section}
              isDark={isDark}
              theme={theme}
              onPress={() => {
                hapticFeedback.light();
                setSelectedCharacterGroup(group);
              }}
            />
          ))}
        </View>
      </ScrollView>
    );
  };

  const renderCharacterGroupDetail = () => {
    const group = selectedCharacterGroup;
    const section = studySections.find(s => s.id === 'characters');

    return (
      <ScrollView 
        ref={characterGroupDetailScrollRef}
        style={styles.content} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: Platform.OS === 'ios' ? 110 : 80 }}
      >
        {/* Floating Back Button */}
        <View style={styles.floatingBackButton}>
          <TouchableOpacity 
            style={[styles.backButtonContainer, {
              backgroundColor: isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(255, 255, 255, 0.9)',
              borderWidth: 1,
              borderColor: isDark ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.1)',
            }]}
            onPress={() => {
              hapticFeedback.light();
              setSelectedCharacterGroup(null);
            }}
          >
            <MaterialIcons name="arrow-back" size={22} color={group.color} />
          </TouchableOpacity>
        </View>

        {/* Stunning Hero Card with Gradient */}
        <View style={styles.stunningHeroContainer}>
            <LinearGradient
            colors={[group.color + 'F2', group.color + 'E6', group.color + 'D9']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.stunningHeroGradient}
          >
            {/* Animated floating particles */}
            <View style={[styles.floatingParticle1, { backgroundColor: 'rgba(255, 255, 255, 0.15)' }]} />
            <View style={[styles.floatingParticle2, { backgroundColor: 'rgba(255, 255, 255, 0.1)' }]} />
            <View style={[styles.floatingParticle3, { backgroundColor: 'rgba(255, 255, 255, 0.08)' }]} />
            
            <View style={styles.heroContent}>
              {/* Large Icon with Glow */}
              <View style={styles.heroIconContainer}>
                <LinearGradient
                  colors={['rgba(255, 255, 255, 0.3)', 'rgba(255, 255, 255, 0.15)']}
                  style={styles.heroIconGradient}
                >
                  <MaterialIcons name="people" size={56} color="#FFFFFF" />
                </LinearGradient>
              </View>
              
              {/* Title */}
              <Text style={styles.heroTitle}>{group.title}</Text>
              
              {/* Badge */}
              <View style={styles.heroBadge}>
                <MaterialIcons name="people" size={16} color="#FFFFFF" />
                <Text style={styles.heroBadgeText}>
                    {group.characters.length} Biblical Characters
            </Text>
                </View>
              </View>
            </LinearGradient>
        </View>

        {/* Character List with Beautiful Cards */}
        <View style={styles.characterListSection}>
          {group.characters.map((character, index) => {
            const isAvailable = characterProfiles[character];
            
            return (
              <AnimatedIndividualCharacterCard
                key={index}
                character={{ name: character, available: isAvailable }}
                section={section}
                group={group}
                index={index}
                isDark={isDark}
                theme={theme}
                onPress={() => {
                  hapticFeedback.light();
                  if (isAvailable) {
                    setSelectedCharacter(character);
                  }
                }}
              />
            );
          })}
        </View>

        {/* Bottom Spacing */}
        <View style={{ height: 40 }} />
      </ScrollView>
    );
  };

  const renderCharacterDetail = () => {
    const character = characterProfiles[selectedCharacter];
    const section = studySections.find(s => s.id === 'characters');
    
    // Show loading or error if character not found
    if (!character) {
      return (
        <View style={[styles.content, { justifyContent: 'center', alignItems: 'center', padding: 40 }]}>
          <MaterialIcons name="person-outline" size={80} color={theme.textTertiary} />
          <Text style={[{ color: theme.text, fontSize: 18, marginTop: 20, textAlign: 'center' }]}>
            {charactersLoading ? 'Loading character...' : 'Character profile not available yet'}
          </Text>
          <TouchableOpacity 
            onPress={() => setSelectedCharacter(null)}
            style={{ marginTop: 20, padding: 12, backgroundColor: theme.primary, borderRadius: 12 }}
          >
            <Text style={{ color: '#FFFFFF', fontWeight: '600' }}>Go Back</Text>
          </TouchableOpacity>
        </View>
      );
    }
    
    // Get the group for this character to use its theme color
    const characterGroup = characterGroups.find(g => 
      g.characters.includes(selectedCharacter)
    );
    const themeColor = characterGroup?.color || section.color;

    return (
      <ScrollView 
        ref={characterDetailScrollRef}
        style={styles.content} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: Platform.OS === 'ios' ? 110 : 80 }}
      >
        {/* Floating Back Button */}
        <View style={styles.floatingBackButton}>
          <TouchableOpacity 
            style={[styles.backButtonContainer, {
              backgroundColor: isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(255, 255, 255, 0.9)',
              borderWidth: 1,
              borderColor: isDark ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.1)',
            }]}
            onPress={() => {
              hapticFeedback.light();
              setSelectedCharacter(null);
            }}
          >
            <MaterialIcons name="arrow-back" size={22} color={themeColor} />
          </TouchableOpacity>
        </View>

        {/* Stunning Hero Card with Full Gradient */}
        <View style={styles.characterDetailHero}>
          <LinearGradient
            colors={[themeColor + 'F2', themeColor + 'E6', themeColor + 'D9']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.characterHeroGradient}
          >
            {/* Floating particles */}
            <View style={[styles.floatingParticle1, { backgroundColor: 'rgba(255, 255, 255, 0.15)' }]} />
            <View style={[styles.floatingParticle2, { backgroundColor: 'rgba(255, 255, 255, 0.1)' }]} />
            <View style={[styles.floatingParticle3, { backgroundColor: 'rgba(255, 255, 255, 0.08)' }]} />
            
            {/* Profile Image with Beautiful Ring */}
            <View style={styles.characterImageContainer}>
              <View style={styles.characterImageRing}>
                <LinearGradient
                  colors={['rgba(255, 255, 255, 0.3)', 'rgba(255, 255, 255, 0.15)']}
                  style={styles.characterImageRingGradient}
                >
                  {character.image ? (
                    <Image
                      source={character.image}
                      style={styles.characterImage}
                      resizeMode="cover"
                      onError={(e) => console.log('Image load error:', e.nativeEvent.error)}
                    />
                  ) : (
                    <MaterialIcons name="person" size={80} color="rgba(255, 255, 255, 0.5)" />
                  )}
                </LinearGradient>
                    </View>
                  </View>
            
            {/* Character Info */}
            <View style={styles.characterInfo}>
              <View style={styles.characterDivider} />
              <Text style={styles.characterDetailName}>
                {character.name.split(' - ')[0]}
              </Text>
              <Text style={styles.characterDetailSubtitle}>
                {character.name.split(' - ')[1]}
              </Text>
              <View style={styles.characterDivider} />
            </View>

            {/* Badge */}
            <View style={styles.characterBadgeContainer}>
              <View style={styles.characterBadge}>
                <MaterialIcons name="auto-stories" size={16} color="#FFFFFF" />
                <Text style={styles.characterBadgeText}>Biblical Figure</Text>
              </View>
            </View>

            {/* Listen to Story Button */}
            {character.audioUrl && (
              <View style={styles.characterAudioContainer}>
                {isCharacterAudioLoading ? (
                  <View style={styles.characterAudioButton}>
                    <ActivityIndicator size="small" color="#FFFFFF" />
                    <Text style={styles.characterAudioButtonText}>Loading...</Text>
                  </View>
                ) : isCharacterAudioPlaying ? (
                  <View style={styles.characterAudioButtonRow}>
                    <TouchableOpacity 
                      style={styles.characterAudioButton}
                      onPress={pauseCharacterAudio}
                    >
                      <MaterialIcons name="pause" size={20} color="#FFFFFF" />
                      <Text style={styles.characterAudioButtonText}>Pause</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={styles.characterAudioRestartButton}
                      onPress={restartCharacterAudio}
                    >
                      <MaterialIcons name="replay" size={20} color="#FFFFFF" />
                    </TouchableOpacity>
                  </View>
                ) : characterSound ? (
                  <View style={styles.characterAudioButtonRow}>
                    <TouchableOpacity 
                      style={styles.characterAudioButton}
                      onPress={resumeCharacterAudio}
                    >
                      <MaterialIcons name="play-arrow" size={20} color="#FFFFFF" />
                      <Text style={styles.characterAudioButtonText}>Resume</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={styles.characterAudioRestartButton}
                      onPress={restartCharacterAudio}
                    >
                      <MaterialIcons name="replay" size={20} color="#FFFFFF" />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity 
                    style={styles.characterAudioButton}
                    onPress={() => playCharacterAudio(character.audioUrl)}
                  >
                    <MaterialIcons name="play-arrow" size={20} color="#FFFFFF" />
                    <Text style={styles.characterAudioButtonText}>Listen to Story</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </LinearGradient>
        </View>

        {/* Modern Content Cards */}
        <View style={styles.modernContentContainer}>
          {/* Story Card */}
          <View style={[styles.modernCard, {
            backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : '#FFFFFF',
            shadowColor: themeColor,
          }]}>
            <View style={[styles.modernCardHeader, { backgroundColor: themeColor + '15' }]}>
              <View style={[styles.modernIconCircle, { backgroundColor: themeColor + '25' }]}>
                <MaterialIcons name="auto-stories" size={22} color={themeColor} />
                </View>
              <Text style={[styles.modernCardTitle, { color: isDark ? '#FFFFFF' : theme.text }]}>
                  Biblical Story
                </Text>
              </View>
              
              <Text 
              style={[styles.modernStoryText, { color: isDark ? 'rgba(255, 255, 255, 0.9)' : theme.text }]}
                selectable={true}
              >
                {character.story}
              </Text>
        </View>

          {/* Themes Card */}
          <View style={[styles.modernCard, {
            backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : '#FFFFFF',
            shadowColor: themeColor,
          }]}>
            <View style={[styles.modernCardHeader, { backgroundColor: themeColor + '15' }]}>
              <View style={[styles.modernIconCircle, { backgroundColor: themeColor + '25' }]}>
                <MaterialIcons name="psychology" size={22} color={themeColor} />
                </View>
              <Text style={[styles.modernCardTitle, { color: isDark ? '#FFFFFF' : theme.text }]}>
                  Key Themes
                </Text>
              </View>
              
            <View style={styles.modernThemesGrid}>
                {character.themes.map((themeText, index) => (
                <View key={index} style={[styles.modernThemeTag, { 
                  backgroundColor: themeColor + '20',
                  borderColor: themeColor + '40',
                }]}>
                  <View style={[styles.modernThemeDot, { backgroundColor: themeColor }]} />
                    <Text 
                    style={[styles.modernThemeText, { color: isDark ? '#FFFFFF' : theme.text }]}
                      selectable={true}
                    >
                      {themeText}
                    </Text>
                  </View>
                ))}
          </View>
        </View>

        {/* Cultural Impact Card */}
          <View style={[styles.modernCard, {
            backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : '#FFFFFF',
            shadowColor: themeColor,
          }]}>
            <View style={[styles.modernCardHeader, { backgroundColor: themeColor + '15' }]}>
              <View style={[styles.modernIconCircle, { backgroundColor: themeColor + '25' }]}>
                <MaterialIcons name="palette" size={22} color={themeColor} />
                </View>
              <Text style={[styles.modernCardTitle, { color: isDark ? '#FFFFFF' : theme.text }]}>
                  Cultural Impact
                </Text>
              </View>
              
              <Text 
              style={[styles.modernStoryText, { color: isDark ? 'rgba(255, 255, 255, 0.9)' : theme.text }]}
                selectable={true}
              >
                {character.culturalImpact}
              </Text>
        </View>

          {/* Key Verses Card */}
          <View style={[styles.modernCard, {
            backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : '#FFFFFF',
            shadowColor: themeColor,
          }]}>
            <View style={[styles.modernCardHeader, { backgroundColor: themeColor + '15' }]}>
              <View style={[styles.modernIconCircle, { backgroundColor: themeColor + '25' }]}>
                <MaterialIcons name="menu-book" size={22} color={themeColor} />
                </View>
              <Text style={[styles.modernCardTitle, { color: isDark ? '#FFFFFF' : theme.text }]}>
                  Key Verses
                </Text>
              </View>
              
            <View style={styles.modernVersesContainer}>
                {character.verses.map((verse, index) => (
                  <TouchableOpacity
                    key={index}
                  style={[styles.modernVerseChip, { 
                    backgroundColor: themeColor + '20',
                    borderColor: themeColor + '40',
                  }]}
                    onPress={() => {
                      hapticFeedback.light();
                      // Future: Navigate to Bible verse
                    }}
                    activeOpacity={0.7}
                  >
                  <View style={[styles.modernVerseIconCircle, { backgroundColor: themeColor + '30' }]}>
                    <MaterialIcons name="bookmark" size={14} color={themeColor} />
                  </View>
                  <Text style={[styles.modernVerseText, { color: isDark ? '#FFFFFF' : theme.text }]}>
                      {verse}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
          </View>
        </View>

        {/* Bottom Spacing */}
        <View style={{ height: 40 }} />
      </ScrollView>
    );
  };

  return (
    <Modal 
      visible={visible} 
      animationType="slide" 
      presentationStyle="fullScreen"
      statusBarTranslucent={false}
    >
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor="transparent" translucent={true} />
        
        {/* Main Content - Scrolls from top */}
        <View style={{ flex: 1 }}>
          {selectedSection === 'main' ? renderMainMenu() : renderSectionDetail()}
        </View>
        
        {/* Header - Hide for Bible Characters section completely */}
        {selectedSection !== 'characters' && (
          <BlurView
            intensity={20}
            tint={isDark ? 'dark' : 'light'}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              zIndex: 1000,
              borderBottomLeftRadius: 30,
              borderBottomRightRadius: 30,
              overflow: 'hidden',
            }}
          >
            <View style={{ height: Platform.OS === 'ios' ? 60 : 30, backgroundColor: 'transparent' }} />
            
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingHorizontal: 20,
              paddingTop: 8,
              paddingBottom: 20,
              backgroundColor: 'transparent',
            }}>
              <TouchableOpacity 
                onPress={selectedSection === 'main' ? onClose : () => setSelectedSection('main')} 
                style={{ 
                  backgroundColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)',
                  paddingHorizontal: 18, 
                  paddingVertical: 10,
                  borderRadius: 25,
                  shadowColor: '#000000',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.1,
                  shadowRadius: 4,
                  elevation: 2,
                }}
              >
                <Text style={{ color: theme.primary, fontSize: 16, fontWeight: '700' }}>
                  {selectedSection === 'main' ? 'Close' : 'Back'}
                </Text>
              </TouchableOpacity>
              
              <Text style={{ 
                color: theme.text, 
                fontSize: 20, 
                fontWeight: '800', 
                textAlign: 'center',
                letterSpacing: 0.5,
              }}>
                {selectedSection === 'maps' ? 'Bible Maps' :
                 selectedSection === 'themes' ? 'Thematic Guides' :
                 selectedSection === 'keyverses' ? 'Key Verses' :
                 'Bible Study'}
              </Text>
              
              <View style={{ width: 70 }} />
            </View>
          </BlurView>
        )}
      </View>

      {/* Timeline Modal Overlay */}
      <BibleTimeline
        visible={showTimelineModal}
        onClose={() => setShowTimelineModal(false)}
        onNavigateToVerse={(verse) => {
          console.log('Navigate to verse:', verse);
        }}
      />

      {/* Interactive Bible Maps */}
      <InteractiveBibleMaps
        visible={showMapsModal}
        onClose={() => setShowMapsModal(false)}
      />

      {/* Thematic Guides - Custom Component */}
      <ThematicGuides
        visible={showThemesModal}
        onClose={() => setShowThemesModal(false)}
        onNavigateToVerse={(verse) => {
          // Handle verse navigation if needed
          console.log('Navigate to verse:', verse);
        }}
      />

      {/* Key Verses - Custom Component */}
      <KeyVerses
        visible={showKeyVersesModal}
        onClose={() => setShowKeyVersesModal(false)}
        onNavigateToVerse={(reference) => {
          setShowKeyVersesModal(false);
          onNavigateToVerse?.(reference);
        }}
        onDiscussVerse={(payload) => {
          setShowKeyVersesModal(false);
          onDiscussVerse?.(payload);
        }}
      />

      {/* Bible Fast Facts - Custom Component */}
      <BibleFastFacts
        visible={showFactsModal}
        onClose={() => setShowFactsModal(false)}
      />

      {/* Quiz & Games - Custom Component */}
      <QuizGames
        visible={showQuizModal}
        onClose={() => setShowQuizModal(false)}
      />


      {/* All Other Section Modal Overlays */}
      {renderSectionModalOverlay('characters', showCharactersModal, setShowCharactersModal)}
      {renderSectionModalOverlay('facts', showFactsModal, setShowFactsModal)}
      {renderSectionModalOverlay('parallels', showParallelsModal, setShowParallelsModal)}
      
      {/* Audio Learning - Custom Component */}
      <AudioLearning
        visible={showAudioModal}
        onClose={() => setShowAudioModal(false)}
      />
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 10 : 15,
    paddingBottom: 15,
    borderBottomWidth: 1,
  },
  closeButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  solidHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
  },
  solidHeaderButton: {
    padding: 4,
    width: 48,
    alignItems: 'center',
  },
  solidHeaderTitle: {
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
  },
  content: {
    flex: 1,
  },
  headerContainer: {
    padding: 12,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 22,
  },
  sectionsGrid: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  sectionCard: {
    marginBottom: 16,
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  sectionGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  sectionIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  sectionContent: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  sectionDescription: {
    fontSize: 14,
    marginBottom: 8,
    lineHeight: 20,
  },
  featuresContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  featureTag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  featureText: {
    fontSize: 11,
    fontWeight: '500',
  },
  comingSoonContainer: {
    padding: 20,
  },
  comingSoonCard: {
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
  },
  comingSoonTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginTop: 12,
    marginBottom: 8,
  },
  comingSoonText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  detailHeader: {
    padding: 20,
  },
  backButton: {
    alignSelf: 'flex-start',
    padding: 8,
    marginBottom: 16,
  },
  detailTitleContainer: {
    alignItems: 'center',
  },
  detailIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  detailTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  detailDescription: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 22,
  },
  featuresList: {
    marginTop: 16,
    alignSelf: 'stretch',
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    paddingHorizontal: 8,
  },
  featureItemText: {
    fontSize: 14,
    marginLeft: 12,
    flex: 1,
  },
  // Character Groups Styles
  characterGroupsContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  characterGroupCard: {
    marginBottom: 12,
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  characterGroupGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  characterGroupIcon: {
    fontSize: 32,
    marginRight: 16,
  },
  characterGroupContent: {
    flex: 1,
  },
  characterGroupTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  characterGroupCount: {
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 4,
  },
  characterGroupPreview: {
    fontSize: 12,
    lineHeight: 16,
  },
  characterGroupDetailIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  // Character Cards Styles
  charactersGrid: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  characterCard: {
    marginBottom: 8,
    borderRadius: 8,
    overflow: 'hidden',
  },
  characterCardGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
  },
  characterName: {
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  // Available Profiles Styles
  availableProfilesContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  availableProfilesTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  profilePreviewCard: {
    marginBottom: 8,
    borderRadius: 8,
    overflow: 'hidden',
  },
  profilePreviewGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  profilePreviewName: {
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
    marginLeft: 12,
  },
  // Character Detail Styles
  profileImageContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  profileImageGradient: {
    borderRadius: 80,
    padding: 4,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  profileImage: {
    width: 150,
    height: 150,
    borderRadius: 75,
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.9)',
  },
  characterDetailTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  characterSection: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  characterSectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  characterSectionText: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'justify',
  },
  themeItem: {
    flexDirection: 'row',
    marginBottom: 8,
    paddingRight: 8,
  },
  themeBullet: {
    fontSize: 16,
    fontWeight: 'bold',
    marginRight: 8,
    marginTop: 2,
  },
  themeText: {
    fontSize: 14,
    lineHeight: 20,
    flex: 1,
  },
  versesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  verseCard: {
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 8,
  },
  verseCardGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
  },
  verseText: {
    fontSize: 13,
    fontWeight: '500',
    marginLeft: 8,
  },
  // Professional UI Styles
  professionalHeader: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 10,
  },
  modernBackButton: {
    alignSelf: 'flex-start',
  },
  backButtonCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  heroSection: {
    paddingHorizontal: 20,
    paddingVertical: 30,
    marginBottom: 20,
  },
  heroGradient: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  heroImageContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  imageRing: {
    width: 180,
    height: 180,
    borderRadius: 90,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
  },
  imageRingInner: {
    width: 165,
    height: 165,
    borderRadius: 82.5,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  heroImage: {
    width: 155,
    height: 155,
    borderRadius: 77.5,
  },
  imageGlow: {
    position: 'absolute',
    width: 155,
    height: 155,
    borderRadius: 77.5,
    opacity: 0.3,
  },
  nameContainer: {
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  decorativeLine: {
    width: 60,
    height: 3,
    borderRadius: 1.5,
    marginVertical: 12,
  },
  characterHeroTitle: {
    fontSize: 32,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  characterSubtitle: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 4,
    letterSpacing: 0.3,
  },
  cardContainer: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  storyCard: {
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 4,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  themesCard: {
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 4,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  culturalCard: {
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 4,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  versesCard: {
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 4,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  cardGradient: {
    padding: 20,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '700',
    flex: 1,
  },
  storyText: {
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'left',
  },
  themesGrid: {
    gap: 12,
  },
  themeCard: {
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  themeIndicator: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginTop: 8,
    marginRight: 12,
  },
  themeCardText: {
    fontSize: 15,
    lineHeight: 20,
    flex: 1,
    fontWeight: '500',
  },
  culturalText: {
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'left',
  },
  versesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  verseChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 4,
  },
  verseChipText: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },

  // ===== MODERN CHARACTER GROUP STYLES =====
  
  // Modern Group Header
  modernGroupHeader: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 10,
  },
  modernGroupBackButton: {
    alignSelf: 'flex-start',
  },
  
  // Modern Group Hero Section
  modernGroupHeroSection: {
    paddingHorizontal: 20,
    paddingBottom: 25,
  },
  groupHeroCard: {
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.1,
        shadowRadius: 20,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  groupHeroGradient: {
    paddingVertical: 28,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  modernGroupIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    ...Platform.select({
      ios: {
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  modernGroupIcon: {
    fontSize: 36,
  },
  modernGroupTitleContainer: {
    alignItems: 'center',
    gap: 12,
  },
  modernGroupTitle: {
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: -0.3,
    lineHeight: 30,
  },
  groupSubtitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    gap: 6,
  },
  modernGroupSubtitle: {
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 0.1,
  },

  // Modern Character List
  modernCharacterListContainer: {
    paddingHorizontal: 20,
    gap: 8,
  },
  modernCharacterItem: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 8,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  characterItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  modernCharacterName: {
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.1,
    flex: 1,
  },
  characterStatusContainer: {
    marginLeft: 12,
  },
  modernAvailableBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  availableDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  modernComingSoonBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glassyHeader: {
    borderRadius: 20,
    overflow: 'hidden',
    marginHorizontal: 15,
    marginTop: 10,
    marginBottom: 20,
  },
  glassyHeaderContent: {
    alignItems: 'center',
    paddingVertical: 25,
    paddingHorizontal: 20,
  },
  glassyHeaderContentHorizontal: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  glassyCloseButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ===== NEW MODERN UI STYLES =====
  
  // Hero Header Styles
  heroHeader: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 30,
  },
  heroContent: {
    alignItems: 'center',
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'System',
  },
  heroSubtitle: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 22,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'System',
  },

  // Character Group Cards - 2 per row
  characterGroupsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 20,
    paddingBottom: 30,
    justifyContent: 'space-between',
  },
  
  characterGroupCard: {
    borderRadius: 20,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowOffset: { width: 0, height: 12 },
        shadowRadius: 25,
      },
      android: {
        elevation: 15,
      },
    }),
  },
  shimmerEffect: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: 100,
    zIndex: 2,
  },
  cardGradientBackground: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  cardOverlay: {
    padding: 18,
    minHeight: 140,
    justifyContent: 'space-between',
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    marginBottom: 12,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  iconCircleGradient: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  groupIcon: {
    fontSize: 28,
  },
  cardTextContent: {
    flex: 1,
    marginBottom: 8,
  },
  modernCharacterGroupTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 10,
    lineHeight: 22,
    letterSpacing: -0.2,
  },
  modernCountBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  modernCountText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  modernArrowContainer: {
    position: 'absolute',
    bottom: 18,
    right: 18,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  alternatingCardGradient: {
    padding: 16, // Back to original compact size
    minHeight: 80, // Back to original height to match your image
    position: 'relative',
    justifyContent: 'space-between',
  },
  alternatingIconContainer: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  alternatingCharacterGroupIcon: {
    fontSize: 20,
  },
  alternatingCardContent: {
    flex: 1,
    paddingRight: 60,
  },
  alternatingCharacterGroupTitle: {
    fontSize: 18,
    fontWeight: '800', // Bolder for more impact
    marginBottom: 12, // More space below title
    lineHeight: 24,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'System',
    letterSpacing: -0.3, // Tighter letter spacing for modern look
  },
  alternatingStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  alternatingCountBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6, // More padding for better proportions
    borderRadius: 12,
    gap: 6, // Space between icon and text
  },
  alternatingCountText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'System',
  },
  alternatingCharacterPreview: {
    fontSize: 13,
    lineHeight: 18,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'System',
  },
  alternatingArrowContainer: {
    position: 'absolute',
    bottom: 16, // Back to original position to match your image
    right: 16,
    width: 30, // Back to original size to match your image
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    // Keep subtle shadow for depth
    ...Platform.select({
      ios: {
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  alternatingDecorativeCircle1: {
    position: 'absolute',
    top: -8,
    left: -8,
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  alternatingDecorativeCircle2: {
    position: 'absolute',
    bottom: -12,
    left: 25,
    width: 48,
    height: 48,
    borderRadius: 24,
  },

  // Alternating Character List
  alternatingCharacterListContainer: {
    paddingHorizontal: 20,
    paddingBottom: 30,
  },
  alternatingCharacterCard: {
    borderRadius: 16,
    overflow: 'hidden',
    // Width, marginBottom, and positioning now controlled by AnimatedIndividualCharacterCard
    ...Platform.select({
      ios: {
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  alternatingCharacterCardGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    minHeight: 70,
    position: 'relative',
  },
  alternatingCharacterAvatarContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    marginRight: 12,
  },
  alternatingCharacterName: {
    fontSize: 15,
    fontWeight: '600',
    flex: 1,
  },
  alternatingCharacterStatusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 16,
    marginRight: 8,
  },
  alternatingCharacterPulseDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  alternatingCharacterArrowContainer: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Epic Character Profile Hero
  epicHeroSection: {
    marginHorizontal: 20,
    marginBottom: 30,
    borderRadius: 30,
    overflow: 'hidden',
    minHeight: 350,
  },
  epicHeroGradient: {
    padding: 30,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 350,
    position: 'relative',
  },
  floatingElement1: {
    position: 'absolute',
    top: 20,
    left: 20,
    width: 80,
    height: 80,
    borderRadius: 40,
    opacity: 0.3,
  },
  floatingElement2: {
    position: 'absolute',
    bottom: 30,
    right: 30,
    width: 60,
    height: 60,
    borderRadius: 30,
    opacity: 0.2,
  },
  floatingElement3: {
    position: 'absolute',
    top: 60,
    right: 60,
    width: 40,
    height: 40,
    borderRadius: 20,
    opacity: 0.15,
  },
  epicImageContainer: {
    marginBottom: 30,
  },
  imageGlowRing: {
    width: 140,
    height: 140,
    borderRadius: 70,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 25,
      },
      android: {
        elevation: 15,
      },
    }),
  },
  imageOuterRing: {
    width: 130,
    height: 130,
    borderRadius: 65,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageInnerRing: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 2,
    overflow: 'hidden',
    position: 'relative',
  },
  epicHeroImage: {
    width: '100%',
    height: '100%',
  },
  imageOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  epicNameContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  titleAccent: {
    width: 40,
    height: 3,
    borderRadius: 1.5,
    marginVertical: 10,
  },
  epicCharacterTitle: {
    fontSize: 32,
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  epicCharacterSubtitle: {
    fontSize: 18,
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  infoBadgesContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  infoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  badgeText: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'System',
  },
  
  // Section Arrow Container
  sectionArrowContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },

  // New Stunning Hero Styles
  floatingBackButton: {
    position: 'absolute',
    top: 135,
    left: 20,
    zIndex: 100,
  },
  backButtonContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  stunningHeroContainer: {
    marginHorizontal: 20,
    marginTop: 20,
    marginBottom: 24,
    borderRadius: 28,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
      },
      android: {
        elevation: 16,
      },
    }),
  },
  stunningHeroGradient: {
    padding: 28,
    minHeight: 240,
    borderRadius: 28,
    position: 'relative',
  },
  floatingParticle1: {
    position: 'absolute',
    top: 30,
    right: 40,
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  floatingParticle2: {
    position: 'absolute',
    bottom: 40,
    left: 30,
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  floatingParticle3: {
    position: 'absolute',
    top: 100,
    left: 50,
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  heroContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroIconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    marginBottom: 20,
    overflow: 'hidden',
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 16,
      },
      android: {
        elevation: 12,
      },
    }),
  },
  heroIconGradient: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroIcon: {
    fontSize: 52,
  },
  heroTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 16,
    letterSpacing: -0.5,
    lineHeight: 32,
    paddingHorizontal: 20,
  },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  heroBadgeText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
  characterListSection: {
    paddingHorizontal: 20,
    paddingTop: 8,
    gap: 12,
  },

  // Modern Character Card Styles
  modernCharacterCard: {
    borderRadius: 20,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.15,
        shadowRadius: 14,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  characterShimmer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: 80,
    zIndex: 3,
  },
  characterCardGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  characterCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 14,
  },
  characterAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    overflow: 'hidden',
  },
  avatarGradient: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  characterNameText: {
    fontSize: 17,
    fontWeight: '600',
    flex: 1,
    letterSpacing: -0.3,
  },
  characterDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 10,
  },
  characterArrow: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Character Detail Hero Styles
  characterDetailHero: {
    marginHorizontal: 20,
    marginTop: 20,
    marginBottom: 20,
    borderRadius: 32,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 16 },
        shadowOpacity: 0.35,
        shadowRadius: 24,
      },
      android: {
        elevation: 18,
      },
    }),
  },
  characterHeroGradient: {
    padding: 32,
    paddingTop: 48,
    paddingBottom: 36,
    borderRadius: 32,
  },
  characterImageContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  characterImageRing: {
    width: 140,
    height: 140,
    borderRadius: 70,
    padding: 4,
    overflow: 'hidden',
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
      },
      android: {
        elevation: 14,
      },
    }),
  },
  characterImageRingGradient: {
    width: '100%',
    height: '100%',
    borderRadius: 66,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  characterImage: {
    width: '100%',
    height: '100%',
    borderRadius: 66,
  },
  characterInfo: {
    alignItems: 'center',
    marginBottom: 20,
  },
  characterDivider: {
    width: 50,
    height: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    borderRadius: 2,
    marginVertical: 12,
  },
  characterDetailName: {
    fontSize: 32,
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
    letterSpacing: -0.8,
    marginBottom: 8,
  },
  characterDetailSubtitle: {
    fontSize: 18,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    letterSpacing: -0.2,
  },
  characterBadgeContainer: {
    alignItems: 'center',
  },
  characterBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.35)',
  },
  characterBadgeText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  
  // Character Audio Button Styles
  characterAudioContainer: {
    alignItems: 'center',
    marginTop: 12,
  },
  characterAudioButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  characterAudioButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  characterAudioButtonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  characterAudioRestartButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    padding: 12,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },

  // Modern Content Cards
  modernContentContainer: {
    paddingHorizontal: 20,
  },
  modernCard: {
    borderRadius: 24,
    marginBottom: 16,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.15,
        shadowRadius: 16,
      },
      android: {
        elevation: 10,
      },
    }),
  },
  modernCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 18,
    paddingBottom: 14,
  },
  modernIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modernCardTitle: {
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.4,
  },
  modernStoryText: {
    fontSize: 16,
    lineHeight: 26,
    paddingHorizontal: 18,
    paddingBottom: 20,
    letterSpacing: -0.2,
  },
  modernThemesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: 18,
    paddingBottom: 18,
  },
  modernThemeTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 16,
    borderWidth: 1.5,
  },
  modernThemeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  modernThemeText: {
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: -0.1,
  },
  modernVersesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: 18,
    paddingBottom: 18,
  },
  modernVerseChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 16,
    borderWidth: 1.5,
  },
  modernVerseIconCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modernVerseText: {
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: -0.1,
  },
});

export default BibleStudyModal;

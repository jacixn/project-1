import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Platform,
  Dimensions,
  Alert,
  Animated,
  ActivityIndicator,
  TextInput,
  Switch,
  RefreshControl,
  DeviceEventEmitter,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GestureHandlerRootView, PanGestureHandler } from 'react-native-gesture-handler';
import MapView, { Marker, Polyline, Circle, PROVIDER_GOOGLE, PROVIDER_APPLE } from 'react-native-maps';
import { MaterialIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../contexts/ThemeContext';
import { hapticFeedback } from '../utils/haptics';
import userStorage from '../utils/userStorage';
import AchievementService from '../services/achievementService';
import SimplePercentageLoader from './SimplePercentageLoader';
import {
  LiquidGlassView,
  isLiquidGlassSupported,
} from '../utils/liquidGlassSafe';

const { width, height } = Dimensions.get('window');

// Remote Bible Maps Configuration
const MAPS_CONFIG = {
  GITHUB_USERNAME: 'jacixn',
  REPO_NAME: 'project-1',
  BRANCH: 'main',
  FILE_PATH: 'fivefold-ios/bible-maps.json',
  get URL() {
    if (this.GITHUB_USERNAME === 'YOUR_USERNAME') return null;
    return `https://raw.githubusercontent.com/${this.GITHUB_USERNAME}/${this.REPO_NAME}/${this.BRANCH}/${this.FILE_PATH}`;
  },
  CACHE_KEY: 'bible_maps_data_v4', // Changed to v4 - verified accurate biblical data
  CACHE_TIMESTAMP_KEY: 'bible_maps_timestamp_v4', // Changed to v4
  CACHE_DURATION: 24 * 60 * 60 * 1000, // 24 hours
};

const InteractiveBibleMaps = ({ visible, onClose, asScreen = false }) => {
  const { theme, isDark } = useTheme();
  const mapRef = useRef(null);
  
  // Core state
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [selectedJourney, setSelectedJourney] = useState(null);
  const [showJourneyRoutes, setShowJourneyRoutes] = useState(false);
  const [activeEra, setActiveEra] = useState('all');
  
  // Animated value for modal swipe gesture
  const modalTranslateY = useRef(new Animated.Value(0)).current;
  const [activeFilter, setActiveFilter] = useState('all');
  const [bookmarkedLocations, setBookmarkedLocations] = useState([]);
  const [animatedRouteIndex, setAnimatedRouteIndex] = useState(0);
  const [isPlayingJourney, setIsPlayingJourney] = useState(false);
  const routeAnimation = useRef(new Animated.Value(0)).current;
  const journeyTimeouts = useRef([]);
  const isPlayingRef = useRef(false);

  // Remote data state
  const [mapsData, setMapsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  // Essential features only - NO GAMES
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [visitedLocations, setVisitedLocations] = useState([]);
  const [showStats, setShowStats] = useState(false);
  const [showConnections, setShowConnections] = useState(false);
  const [showPaths, setShowPaths] = useState(true);

  // Liquid glass setting
  const [liquidGlassEnabled, setLiquidGlassEnabled] = useState(true);

  // Function to stop journey and clear all timeouts
  const stopJourney = () => {
    setIsPlayingJourney(false);
    isPlayingRef.current = false;
    setShowJourneyRoutes(false); // Hide the route path when stopping
    // Clear all pending timeouts
    journeyTimeouts.current.forEach(timeoutId => clearTimeout(timeoutId));
    journeyTimeouts.current = [];
  };

  // Cache management functions
  const isCacheValid = async () => {
    try {
      const timestamp = await userStorage.getRaw(MAPS_CONFIG.CACHE_TIMESTAMP_KEY);
      if (!timestamp) return false;
      
      const cacheAge = Date.now() - parseInt(timestamp);
      return cacheAge < MAPS_CONFIG.CACHE_DURATION;
    } catch (error) {
      console.error('Error checking cache validity:', error);
      return false;
    }
  };

  const fetchMapsFromRemote = async () => {
    try {
      const url = MAPS_CONFIG.URL;
      if (!url) {
        throw new Error('Remote URL not configured');
      }

      console.log('📍 Fetching Bible maps from:', url);
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      // Cache the data
      await userStorage.setRaw(MAPS_CONFIG.CACHE_KEY, JSON.stringify(data));
      await userStorage.setRaw(MAPS_CONFIG.CACHE_TIMESTAMP_KEY, Date.now().toString());
      
      console.log('✅ Successfully fetched and cached Bible maps');
      return data;
    } catch (error) {
      console.error('Error fetching Bible maps from remote:', error);
      throw error;
    }
  };

  const loadFallbackData = () => {
    // Minimal fallback data
    return {
      version: '1.0',
      biblicalLocations: [],
      biblicalJourneys: [],
      filterCategories: [
        { id: 'all', name: 'All Locations', icon: 'map' }
      ],
      eraFilters: [
        { id: 'all', name: 'All Eras', icon: 'history' }
      ],
      initialRegion: {
        latitude: 31.7683,
        longitude: 35.2137,
        latitudeDelta: 8.0,
        longitudeDelta: 8.0
      }
    };
  };

  const loadMapsData = async () => {
    try {
      // Check cache first
      if (await isCacheValid()) {
        const cachedData = await userStorage.getRaw(MAPS_CONFIG.CACHE_KEY);
        if (cachedData) {
          const data = JSON.parse(cachedData);
          setMapsData(data);
          setLoading(false);
          console.log('✅ Loaded Bible maps from cache');
          return;
        }
      }

      // Fetch from remote
      const data = await fetchMapsFromRemote();
      setMapsData(data);
      setLoading(false);
    } catch (error) {
      console.error('❌ Error loading Bible maps:', error);
      
      // Try to use cached data even if expired
      try {
        const cachedData = await userStorage.getRaw(MAPS_CONFIG.CACHE_KEY);
        if (cachedData) {
          console.log('⚠️ Using expired cache due to fetch failure');
          const data = JSON.parse(cachedData);
          setMapsData(data);
          setError('Using offline data');
        } else {
          throw new Error('No cached data available');
        }
      } catch (cacheError) {
        console.log('📍 Using fallback map data');
        setMapsData(loadFallbackData());
        setError('Using limited offline data');
      }
      
      setLoading(false);
    }
  };

  // Pull to refresh handler
  const onRefresh = async () => {
    setRefreshing(true);
    hapticFeedback.light();
    try {
      await userStorage.remove(MAPS_CONFIG.CACHE_KEY);
      await userStorage.remove(MAPS_CONFIG.CACHE_TIMESTAMP_KEY);
      const data = await fetchMapsFromRemote();
      setMapsData(data);
      setError(null);
    } catch (error) {
      console.error('Error refreshing maps:', error);
    } finally {
      setRefreshing(false);
    }
  };

  // Load maps data on mount
  useEffect(() => {
    if (visible) {
      loadMapsData();
    }
  }, [visible]);

  // Cleanup on component unmount
  useEffect(() => {
    return () => {
      // Clear all timeouts when component unmounts
      journeyTimeouts.current.forEach(timeoutId => clearTimeout(timeoutId));
      journeyTimeouts.current = [];
    };
  }, []);

  // Load liquid glass setting
  useEffect(() => {
    const loadLiquidGlass = async () => {
      try {
        const setting = await userStorage.getRaw('fivefold_liquidGlass');
        if (setting !== null) {
          setLiquidGlassEnabled(setting === 'true');
        }
      } catch (e) {
        // default stays true
      }
    };
    loadLiquidGlass();

    // Listen for changes from settings
    const sub = DeviceEventEmitter.addListener('liquidGlassChanged', (enabled) => {
      setLiquidGlassEnabled(enabled);
    });
    return () => sub.remove();
  }, []);

  // Load user data on mount
  useEffect(() => {
    const loadUserData = async () => {
      try {
        const visited = await userStorage.getRaw('bible_maps_visited');
        const bookmarks = await userStorage.getRaw('bible_maps_bookmarks');
        
        if (visited) setVisitedLocations(JSON.parse(visited));
        if (bookmarks) setBookmarkedLocations(JSON.parse(bookmarks));
      } catch (error) {
        console.log('Error loading user data:', error);
      }
    };
    
    if (visible) {
      loadUserData();
    }
  }, [visible]);

  // Auto-save user data
  useEffect(() => {
    const saveUserData = async () => {
      try {
        await userStorage.setRaw('bible_maps_visited', JSON.stringify(visitedLocations));
        await userStorage.setRaw('bible_maps_bookmarks', JSON.stringify(bookmarkedLocations));
      } catch (error) {
        console.log('Error saving user data:', error);
      }
    };
    
    if (visible && visitedLocations.length > 0) {
      saveUserData();
    }
  }, [visitedLocations, bookmarkedLocations, visible]);

  // Get data from remote or fallback
  const biblicalLocations = mapsData?.biblicalLocations || [];
  const biblicalJourneys = mapsData?.biblicalJourneys || [];
  const filterCategories = mapsData?.filterCategories || [
    { id: 'all', name: 'All Locations', icon: 'map', color: theme.primary }
  ];
  const eraFilters = mapsData?.eraFilters || [
    { id: 'all', name: 'All Eras', icon: 'history', color: theme.primary }
  ];
  const initialRegion = mapsData?.initialRegion || {
    latitude: 31.7683,
    longitude: 35.2137,
    latitudeDelta: 8.0,
    longitudeDelta: 8.0
  };

  // Show loading state
  if (loading) {
    return (
      <Modal
        visible={visible}
        animationType="fade"
        presentationStyle="fullScreen"
        onRequestClose={onClose}
      >
        <View style={[styles.fullScreenContainer, { backgroundColor: theme.background, justifyContent: 'center', alignItems: 'center' }]}>
          <SimplePercentageLoader 
            message="Loading Bible Maps..."
            subMessage="Preparing interactive locations..."
          />
        </View>
      </Modal>
    );
  }

  // Handle modal swipe gesture
  const handleModalPanGesture = (event) => {
    const { translationY, velocityY, state } = event.nativeEvent;
    
    // Only allow downward swipes
    if (translationY > 0) {
      modalTranslateY.setValue(translationY);
    }
    
    // On gesture end, determine if should dismiss
    if (state === 5) { // State.END
      if (translationY > 150 || velocityY > 1000) {
        // Dismiss modal
        Animated.timing(modalTranslateY, {
          toValue: height,
          duration: 250,
          useNativeDriver: true,
        }).start(() => {
          setSelectedLocation(null);
          modalTranslateY.setValue(0);
        });
      } else {
        // Snap back
        Animated.spring(modalTranslateY, {
          toValue: 0,
          useNativeDriver: true,
          friction: 8,
        }).start();
      }
    }
  };

  // Get filtered locations based on active era and filter
  const getFilteredLocations = () => {
    let filtered = biblicalLocations;
    
    // Filter by era
    if (activeEra !== 'all') {
      filtered = filtered.filter(location => location.era.includes(activeEra));
    }
    
    // Filter by category
    if (activeFilter !== 'all') {
      filtered = filtered.filter(location => location.category === activeFilter);
    }
    
    return filtered;
  };

  // Get filtered journeys based on active era
  const getFilteredJourneys = () => {
    if (activeEra === 'all') return biblicalJourneys;
    return biblicalJourneys.filter(journey => journey.era === activeEra);
  };

  // Handle location marker press with enhanced details
  const handleLocationPress = (location) => {
    hapticFeedback.light();
    setSelectedLocation(location);
    
    // Animate to location
    if (mapRef.current) {
      mapRef.current.animateToRegion({
        ...location.coordinate,
        latitudeDelta: 0.5,
        longitudeDelta: 0.5,
      }, 1000);
    }
  };

  // Handle journey selection with animation
  const handleJourneyPress = (journey) => {
    hapticFeedback.light();
    setSelectedJourney(journey);
    // Don't show route path for "View Route" - only for "Play Journey"
    
    // Animate to journey bounds
    if (mapRef.current && journey.route && journey.route.length > 0) {
      mapRef.current.fitToCoordinates(journey.route, {
        edgePadding: { top: 50, right: 50, bottom: 50, left: 50 },
        animated: true,
      });
    }
  };

  // Enhanced journey route animation with waypoint details
  const animateJourneyRoute = (journey) => {
    if (!journey || !journey.route) return;
    
    hapticFeedback.light();
    // Clear any existing timeouts first
    journeyTimeouts.current.forEach(timeoutId => clearTimeout(timeoutId));
    journeyTimeouts.current = [];
    
    setIsPlayingJourney(true);
    isPlayingRef.current = true;
    setSelectedJourney(journey);
    setShowJourneyRoutes(true); // Show the route path when playing
    setAnimatedRouteIndex(0);
    
    // Animate to each coordinate (which represents points of interest)
    const animateToNextPoint = (coordinateIndex) => {
      if (!isPlayingRef.current || !journey.route || coordinateIndex >= journey.route.length) {
        setIsPlayingJourney(false);
        isPlayingRef.current = false;
        setShowJourneyRoutes(false); // Hide route path when journey completes
        journeyTimeouts.current = [];
        return;
      }
      
      const coordinate = journey.route[coordinateIndex];
      
      // Animate to coordinate location (point of interest)
      if (mapRef.current && coordinate) {
        mapRef.current.animateToRegion({
          ...coordinate,
          latitudeDelta: 0.5,
          longitudeDelta: 0.5,
        }, 2000);
      }
      
      setAnimatedRouteIndex(coordinateIndex);
      
      // Continue to next point after delay
      const timeoutId = setTimeout(() => {
        // Check if journey is still playing before continuing
        if (isPlayingRef.current) {
          animateToNextPoint(coordinateIndex + 1);
        }
      }, 3500);
      
      journeyTimeouts.current.push(timeoutId);
    };
    
    animateToNextPoint(0);
  };

  // Show journey details modal
  const showJourneyDetails = (journey) => {
    const versesText = journey.verses && journey.verses.length > 0 
      ? `\n\nScriptures: ${journey.verses.join(', ')}`
      : '';
    
    Alert.alert(
      `${journey.name}`,
      `${journey.description}\n\nDistance: ${journey.distance || 'Not specified'}\nDuration: ${journey.duration || 'Unknown'}${versesText}`,
      [
        { text: 'Play Journey', onPress: () => animateJourneyRoute(journey) },
        { text: 'View Route', onPress: () => handleJourneyPress(journey) },
        { text: 'Close', style: 'cancel' }
      ]
    );
  };

  // Enhanced location details with more context
  const showLocationDetails = (location) => {
    // Directly show the detailed view instead of the alert popup
    handleLocationPress(location);
  };

  // Get statistics for current filter
  const getFilterStats = () => {
    const locations = getFilteredLocations();
    const journeys = getFilteredJourneys();
    
    // Count miracles based on category (miracle or battle_miracle)
    const miracleCount = locations.filter(loc => 
      loc.category === 'miracle' || loc.category === 'battle_miracle'
    ).length;
    
    return {
      locationCount: locations.length,
      journeyCount: journeys.length,
      miracleCount: miracleCount,
      totalDistance: journeys.reduce((sum, journey) => {
        const distance = parseInt(journey.distance?.replace(/[^\d]/g, '') || '0');
        return sum + distance;
      }, 0)
    };
  };

  // Toggle bookmark for location
  const toggleBookmark = (locationId) => {
    hapticFeedback.light();
    setBookmarkedLocations(prev => 
      prev.includes(locationId) 
        ? prev.filter(id => id !== locationId)
        : [...prev, locationId]
    );
  };

  // Get marker color based on category
  const getMarkerColor = (location) => {
    const categoryColors = {
      divine_encounter: '#FFD700',
      miracle: '#FF6B6B', 
      covenant_moment: '#4ECDC4',
      battle_miracle: '#E74C3C',
      prophecy_foreshadowing: '#9B59B6',
      passion_resurrection: '#FF1744',
      conversion: '#00E676',
      mercy_forgiveness: '#00BCD4',
      altar_worship: '#FF9800',
      liberation: '#8BC34A',
      journey_start: '#795548',
      ministry_center: '#2196F3',
      church_center: '#009688',
      exile_miracles: '#607D8B'
    };
    
    return categoryColors[location.category] || theme.primary;
  };

  // NEW FEATURE FUNCTIONS

  // 1. SEARCH FUNCTIONALITY
  const getSearchResults = () => {
    if (!searchQuery.trim()) return [];
    const query = searchQuery.toLowerCase();
    return biblicalLocations.filter(loc => 
      loc.name.toLowerCase().includes(query) ||
      loc.description.toLowerCase().includes(query) ||
      loc.characters?.some(c => c.toLowerCase().includes(query)) ||
      loc.events?.some(e => e.toLowerCase().includes(query))
    );
  };

  const handleSearchSelect = (location) => {
    setSearchQuery('');
    setShowSearch(false);
    handleLocationPress(location);
  };

  // 2. DISTANCE CALCULATOR
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Earth radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  const getTotalMeasuredDistance = () => {
    if (measurePoints.length < 2) return 0;
    let total = 0;
    for (let i = 0; i < measurePoints.length - 1; i++) {
      total += calculateDistance(
        measurePoints[i].latitude,
        measurePoints[i].longitude,
        measurePoints[i + 1].latitude,
        measurePoints[i + 1].longitude
      );
    }
    return total.toFixed(2);
  };

  // 3. QUIZ MODE
  const generateQuizQuestion = () => {
    const locations = getFilteredLocations();
    if (locations.length === 0) return null;
    
    const randomLoc = locations[Math.floor(Math.random() * locations.length)];
    const questionTypes = [
      {
        question: `Where did ${randomLoc.events?.[0] || 'this event'} happen?`,
        answer: randomLoc.name,
        options: [randomLoc.name, ...getRandomLocations(3).map(l => l.name)]
      },
      {
        question: `What happened at ${randomLoc.name}?`,
        answer: randomLoc.events?.[0] || randomLoc.description,
        options: [randomLoc.events?.[0] || randomLoc.description, ...getRandomEvents(3)]
      },
      {
        question: `Which character is associated with ${randomLoc.name}?`,
        answer: randomLoc.characters?.[0] || 'Unknown',
        options: [randomLoc.characters?.[0] || 'Unknown', ...getRandomCharacters(3)]
      }
    ];
    
    const q = questionTypes[Math.floor(Math.random() * questionTypes.length)];
    q.options = [...q.options].sort(() => Math.random() - 0.5).slice(0, 4);
    return q;
  };

  const getRandomLocations = (count) => {
    const locations = getFilteredLocations();
    const shuffled = [...locations].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count);
  };

  const getRandomEvents = (count) => {
    const events = biblicalLocations.flatMap(l => l.events || []);
    const shuffled = [...events].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count);
  };

  const getRandomCharacters = (count) => {
    const characters = biblicalLocations.flatMap(l => l.characters || []);
    const shuffled = [...characters].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count);
  };

  const startQuiz = () => {
    hapticFeedback.medium();
    setQuizMode(true);
    setQuizScore(0);
    setCurrentQuizQuestion(generateQuizQuestion());
  };

  const answerQuiz = (answer) => {
    hapticFeedback.light();
    if (answer === currentQuizQuestion.answer) {
      setQuizScore(prev => prev + 1);
      hapticFeedback.success();
      Alert.alert('Correct!', 'Great job!', [
        { text: 'Next Question', onPress: () => setCurrentQuizQuestion(generateQuizQuestion()) }
      ]);
    } else {
      hapticFeedback.error();
      Alert.alert('Incorrect', `The correct answer was: ${currentQuizQuestion.answer}`, [
        { text: 'Try Again', onPress: () => setCurrentQuizQuestion(generateQuizQuestion()) }
      ]);
    }
  };

  // LOCATION VISIT TRACKING
  const markLocationVisited = (locationId) => {
    if (!visitedLocations.includes(locationId)) {
      setVisitedLocations(prev => {
        const updated = [...prev, locationId];
        AchievementService.setStat('mapsVisited', updated.length);
        return updated;
      });
    }
  };

  // CHARACTER FILTER
  const getAllCharacters = () => {
    const chars = new Set();
    biblicalLocations.forEach(loc => {
      loc.characters?.forEach(char => chars.add(char));
    });
    return Array.from(chars).sort();
  };

  const filterByCharacterFunc = (character) => {
    setFilterByCharacter(character);
    setSelectedCharacter(character);
  };

  const getLocationsForCharacter = (character) => {
    return biblicalLocations.filter(loc => 
      loc.characters?.includes(character)
    );
  };

  // 8. COMPARISON MODE
  const toggleCompareLocation = (locationId) => {
    if (selectedLocations.includes(locationId)) {
      setSelectedLocations(prev => prev.filter(id => id !== locationId));
    } else if (selectedLocations.length < 4) {
      setSelectedLocations(prev => [...prev, locationId]);
    } else {
      Alert.alert('Maximum Reached', 'You can compare up to 4 locations at once');
    }
  };

  const getComparisonData = () => {
    return selectedLocations.map(id => 
      biblicalLocations.find(loc => loc.id === id)
    ).filter(Boolean);
  };

  // 9. GUIDED TOUR
  const startGuidedTour = (era) => {
    hapticFeedback.medium();
    const tourLocations = biblicalLocations.filter(loc => 
      loc.era.includes(era)
    ).sort((a, b) => {
      // Sort by historical timeline if available
      return 0;
    });
    
    if (tourLocations.length > 0) {
      setTourMode(true);
      setCurrentTourStep(0);
      setSelectedLocations(tourLocations.map(l => l.id).slice(0, 10));
      handleLocationPress(tourLocations[0]);
    }
  };

  const nextTourStep = () => {
    const nextIndex = currentTourStep + 1;
    if (nextIndex < selectedLocations.length) {
      setCurrentTourStep(nextIndex);
      const nextLoc = biblicalLocations.find(l => l.id === selectedLocations[nextIndex]);
      if (nextLoc) handleLocationPress(nextLoc);
    } else {
      setTourMode(false);
      Alert.alert('Tour Complete', 'You have completed the guided tour');
    }
  };

  const previousTourStep = () => {
    const prevIndex = currentTourStep - 1;
    if (prevIndex >= 0) {
      setCurrentTourStep(prevIndex);
      const prevLoc = biblicalLocations.find(l => l.id === selectedLocations[prevIndex]);
      if (prevLoc) handleLocationPress(prevLoc);
    }
  };

  // 10. USER NOTES
  const addNoteToLocation = (locationId, note) => {
    setUserNotes(prev => ({
      ...prev,
      [locationId]: [...(prev[locationId] || []), {
        text: note,
        date: new Date().toISOString(),
      }]
    }));
  };

  // 11. MAP TYPE SWITCHER
  const getMapTypeForRN = () => {
    return 'standard'; // Always use standard map type
  };

  // 12. STATISTICS
  const getDetailedStats = () => {
    const stats = {
      totalLocations: biblicalLocations.length,
      totalJourneys: biblicalJourneys.length,
      visitedCount: visitedLocations.length,
      bookmarkedCount: bookmarkedLocations.length,
      locationsPerEra: {},
      locationsPerCategory: {},
      mostCommonCharacters: {},
      totalDistance: 0,
    };

    biblicalLocations.forEach(loc => {
      loc.era.forEach(era => {
        stats.locationsPerEra[era] = (stats.locationsPerEra[era] || 0) + 1;
      });
      stats.locationsPerCategory[loc.category] = (stats.locationsPerCategory[loc.category] || 0) + 1;
      
      loc.characters?.forEach(char => {
        stats.mostCommonCharacters[char] = (stats.mostCommonCharacters[char] || 0) + 1;
      });
    });

    biblicalJourneys.forEach(journey => {
      const dist = parseInt(journey.distance?.replace(/[^\d]/g, '') || '0');
      stats.totalDistance += dist;
    });

    return stats;
  };

  // 13. CONNECT LOCATIONS (Show relationships)
  const getConnectedLocations = (locationId) => {
    const location = biblicalLocations.find(l => l.id === locationId);
    if (!location) return [];
    
    // Find locations with shared characters
    return biblicalLocations.filter(loc => 
      loc.id !== locationId &&
      loc.characters?.some(char => location.characters?.includes(char))
    );
  };

  // 14. JOURNEY FAVORITES
  const toggleFavoriteJourney = (journeyId) => {
    if (favoriteJourneys.includes(journeyId)) {
      setFavoriteJourneys(prev => prev.filter(id => id !== journeyId));
    } else {
      setFavoriteJourneys(prev => [...prev, journeyId]);
    }
  };

  // 15. RESET TO OVERVIEW
  const resetMapView = () => {
    hapticFeedback.light();
    setSelectedLocation(null);
    setSelectedJourney(null);
    setShowJourneyRoutes(false);
    stopJourney();
    if (mapRef.current) {
      mapRef.current.animateToRegion(initialRegion, 1000);
    }
  };

  // Liquid Glass wrapper — uses LiquidGlassView when supported, falls back to BlurView
  const MapGlassContainer = ({ children, style, blurIntensity = 60, bgColor = 'rgba(0,0,0,0.2)' }) => {
    if (!isLiquidGlassSupported || !liquidGlassEnabled) {
      return (
        <BlurView
          intensity={isDark ? blurIntensity : Math.round(blurIntensity * 0.5)}
          tint={isDark ? 'dark' : 'light'}
          style={[style, { backgroundColor: bgColor }]}
        >
          {children}
        </BlurView>
      );
    }

    return (
      <LiquidGlassView
        interactive={true}
        effect="clear"
        colorScheme="system"
        tintColor="rgba(255, 255, 255, 0.08)"
        style={[style, { backgroundColor: 'transparent' }]}
      >
        {children}
      </LiquidGlassView>
    );
  };

  const content = (
      <View style={[styles.fullScreenContainer, { backgroundColor: theme.background }]}>
        {/* Full Screen Map Background */}
        <View style={styles.fullScreenMapContainer}>
          <MapView
            ref={mapRef}
            style={styles.fullScreenMap}
            initialRegion={initialRegion}
            mapType="standard"
            provider={Platform.OS === 'ios' ? PROVIDER_APPLE : PROVIDER_GOOGLE}
            showsUserLocation={false}
            showsMyLocationButton={false}
            showsCompass={true}
            showsScale={true}
            showsBuildings={false}
            showsTraffic={false}
            onPress={(e) => {
              // Map press handler
            }}
          >
            {/* Enhanced Location Markers */}
            {getFilteredLocations().map((location) => {
              const isVisited = visitedLocations.includes(location.id);
              const isBookmarked = bookmarkedLocations.includes(location.id);
              const isSelected = selectedLocation?.id === location.id;
              
              return (
              <Marker
                key={location.id}
                coordinate={location.coordinate}
                title={location.name}
                description={location.description}
                  onPress={() => {
                    showLocationDetails(location);
                    markLocationVisited(location.id);
                  }}
                pinColor={getMarkerColor(location)}
              >
                <View style={[
                  styles.customMarker,
                  { 
                    backgroundColor: getMarkerColor(location),
                    borderColor: theme.surface,
                      borderWidth: isBookmarked ? 3 : 2,
                      opacity: isVisited ? 1.0 : 0.7,
                      transform: [{ scale: isSelected ? 1.4 : isBookmarked ? 1.2 : 1.0 }],
                    shadowColor: getMarkerColor(location),
                      shadowOpacity: isSelected ? 0.8 : 0.4,
                      shadowRadius: isSelected ? 10 : 5,
                  }
                ]}>
                  <MaterialIcons 
                    name={location.icon} 
                      size={isSelected ? 26 : 20} 
                    color="white" 
                  />
                    {/* Visited checkmark */}
                    {isVisited && (
                      <View style={styles.visitedIndicator}>
                        <MaterialIcons name="check-circle" size={12} color="#00E676" />
                      </View>
                    )}
                  {location.miracleCount && location.miracleCount > 0 && (
                    <View style={[styles.miracleIndicator, { backgroundColor: getMarkerColor(location) }]}>
                      <Text style={styles.miracleIndicatorText}>{location.miracleCount}</Text>
                    </View>
                  )}
                </View>
              </Marker>
              );
            })}

            {/* Connection Lines */}
            {showConnections && selectedLocation && getConnectedLocations(selectedLocation.id).map((connectedLoc) => (
              <Polyline
                key={`connection-${selectedLocation.id}-${connectedLoc.id}`}
                coordinates={[selectedLocation.coordinate, connectedLoc.coordinate]}
                strokeColor="rgba(255, 215, 0, 0.4)"
                strokeWidth={2}
                lineDashPattern={[10, 5]}
              />
            ))}

            {/* Journey Routes */}
            {showJourneyRoutes && selectedJourney && selectedJourney.route && showPaths && (
              <Polyline
                coordinates={selectedJourney.route}
                strokeColor={selectedJourney.color || theme.primary}
                strokeWidth={3}
                lineCap="round"
                lineJoin="round"
              />
            )}

            {/* All Journey Routes (faded) */}
            {!showJourneyRoutes && showPaths && getFilteredJourneys().map((journey) => (
              <Polyline
                key={journey.id}
                coordinates={journey.route || []}
                strokeColor={`${journey.color || theme.primary}66`}
                strokeWidth={2}
                lineCap="round"
                lineJoin="round"
                onPress={() => handleJourneyPress(journey)}
              />
            ))}
          </MapView>
        </View>

        {/* Overlay UI Elements */}
        <View style={styles.overlayContainer} pointerEvents="box-none">
          <View style={styles.safeAreaContainer} pointerEvents="box-none">
            {/* Header */}
            <MapGlassContainer style={[styles.headerBlur, { marginTop: 60 }]} blurIntensity={80} bgColor="rgba(0,0,0,0.3)">
              <View style={styles.headerContent}>
                <TouchableOpacity
                  onPress={onClose}
                  style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.12)', alignItems: 'center', justifyContent: 'center', zIndex: 1 }}
                  activeOpacity={0.7}
                >
                  <MaterialIcons name="arrow-back-ios-new" size={18} color="#1A1A2E" />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { 
                  color: '#1A1A2E',
                  fontWeight: '800',
                  textShadowColor: 'rgba(255,255,255,0.6)',
                  textShadowOffset: { width: 0, height: 0 },
                  textShadowRadius: 4,
                }]}>
                  Interactive Bible Maps
                </Text>
                {/* Bookmark removed */}
                <View style={styles.bookmarkButton} />
              </View>
            </MapGlassContainer>

            {/* Era Filters */}
            <MapGlassContainer style={styles.eraFiltersBlur} blurIntensity={60} bgColor="rgba(0,0,0,0.2)">
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.eraFiltersContent}
              >
                {eraFilters.map((era) => (
                  <TouchableOpacity
                    key={era.id}
                    style={[
                      styles.eraTab,
                      {
                        backgroundColor: activeEra === era.id ? era.color + '25' : 'rgba(0,0,0,0.06)',
                        borderColor: activeEra === era.id ? era.color : 'rgba(0,0,0,0.15)',
                      }
                    ]}
                    onPress={() => {
                      hapticFeedback.light();
                      setActiveEra(era.id);
                    }}
                  >
                    <MaterialIcons 
                      name={era.icon} 
                      size={16} 
                      color={activeEra === era.id ? era.color : '#1A1A2E'} 
                    />
                    <Text style={[
                      styles.eraTabText,
                      { 
                        color: activeEra === era.id ? era.color : '#1A1A2E',
                        fontWeight: '700',
                      }
                    ]}>
                      {era.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </MapGlassContainer>

            {/* Thematic Filters */}
            <MapGlassContainer style={styles.thematicFiltersBlur} blurIntensity={60} bgColor="rgba(0,0,0,0.2)">
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.filtersContent}
              >
                {filterCategories.map((filter) => (
                  <TouchableOpacity
                    key={filter.id}
                    style={[
                      styles.filterTab,
                      {
                        backgroundColor: activeFilter === filter.id ? filter.color + '25' : 'rgba(0,0,0,0.06)',
                        borderColor: activeFilter === filter.id ? filter.color : 'rgba(0,0,0,0.15)',
                      }
                    ]}
                    onPress={() => {
                      hapticFeedback.light();
                      setActiveFilter(filter.id);
                    }}
                  >
                    <MaterialIcons 
                      name={filter.icon} 
                      size={14} 
                      color={activeFilter === filter.id ? filter.color : '#1A1A2E'} 
                    />
                    <Text style={[
                      styles.filterTabText,
                      { 
                        color: activeFilter === filter.id ? filter.color : '#1A1A2E',
                        fontWeight: '700',
                      }
                    ]}>
                      {filter.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              
              {/* Statistics Display */}
              <View style={styles.statsContainer}>
                {(() => {
                  const stats = getFilterStats();
                  return (
                    <>
                      <View style={styles.statItem}>
                        <Text style={[styles.statNumber, { color: theme.primary }]}>{stats.locationCount}</Text>
                        <Text style={[styles.statLabel, { color: '#3A3A4A' }]}>Locations</Text>
                      </View>
                      <View style={styles.statItem}>
                        <Text style={[styles.statNumber, { color: theme.success }]}>{stats.journeyCount}</Text>
                        <Text style={[styles.statLabel, { color: '#3A3A4A' }]}>Journeys</Text>
                      </View>
                      <View style={styles.statItem}>
                        <Text style={[styles.statNumber, { color: theme.warning }]}>{stats.miracleCount}</Text>
                        <Text style={[styles.statLabel, { color: '#3A3A4A' }]}>Miracles</Text>
                      </View>
                      {stats.totalDistance > 0 && (
                        <View style={styles.statItem}>
                          <Text style={[styles.statNumber, { color: theme.info }]}>{stats.totalDistance.toLocaleString()}</Text>
                          <Text style={[styles.statLabel, { color: '#3A3A4A' }]}>Miles</Text>
                        </View>
                      )}
                    </>
                  );
                })()}
              </View>
            </MapGlassContainer>

            {/* Journey Controls */}
            <MapGlassContainer style={styles.journeyControlsBlur} blurIntensity={80} bgColor="rgba(0,0,0,0.3)">
              <View style={styles.journeyControlsContent}>
                <View style={styles.journeyHeaderRow}>
                  <Text style={[
                    styles.journeyTitle,
                    { 
                      color: '#1A1A2E',
                      fontWeight: '800',
                      textShadowColor: 'rgba(255,255,255,0.5)',
                      textShadowOffset: { width: 0, height: 0 },
                      textShadowRadius: 3,
                    }
                  ]}>
                    Biblical Journeys
                  </Text>
                  {isPlayingJourney && (
                    <TouchableOpacity
                      style={[styles.stopJourneyButton, { backgroundColor: theme.error }]}
                      onPress={stopJourney}
                    >
                      <MaterialIcons name="stop" size={16} color="white" />
                      <Text style={styles.stopJourneyText}>Stop Journey</Text>
                    </TouchableOpacity>
                  )}
                </View>
                <ScrollView 
                  horizontal 
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.journeyButtonsContainer}
                >
                  {getFilteredJourneys().map((journey) => (
                    <TouchableOpacity
                      key={journey.id}
                      style={[
                        styles.journeyButton,
                        {
                          backgroundColor: selectedJourney?.id === journey.id ? journey.color + '25' : 'rgba(0,0,0,0.06)',
                          borderColor: selectedJourney?.id === journey.id ? journey.color : 'rgba(0,0,0,0.15)',
                        }
                      ]}
                      onPress={() => showJourneyDetails(journey)}
                      onLongPress={() => animateJourneyRoute(journey)}
                    >
                      <View style={styles.journeyButtonContent}>
                        <Text style={[
                          styles.journeyButtonText,
                          { 
                            color: selectedJourney?.id === journey.id ? journey.color : '#1A1A2E',
                            fontWeight: '700'
                          }
                        ]}>
                          {journey.name}
                        </Text>
                        {journey.miracleCount && (
                          <View style={[styles.miracleBadge, { backgroundColor: journey.color }]}>
                            <Text style={styles.miracleBadgeText}>{journey.miracleCount}</Text>
                          </View>
                        )}
                      </View>
                      <Text style={[
                        styles.journeyDistance,
                        { 
                          color: selectedJourney?.id === journey.id ? journey.color : '#3A3A4A',
                          fontWeight: '600'
                        }
                      ]}>
                        {journey.totalDistance}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </MapGlassContainer>
          </View>
        </View>

        {/* Location Detail Modal */}
        {selectedLocation && (
          <Modal
            visible={!!selectedLocation}
            animationType="slide"
            presentationStyle="overFullScreen"
            onRequestClose={() => setSelectedLocation(null)}
            transparent={true}
          >
            <GestureHandlerRootView style={{ flex: 1 }}>
              <View style={styles.modalOverlay}>
                <PanGestureHandler onGestureEvent={handleModalPanGesture} onHandlerStateChange={handleModalPanGesture}>
                  <Animated.View 
                    style={[
                      styles.modalContent, 
                      { 
                        backgroundColor: theme.background,
                        transform: [{ translateY: modalTranslateY }]
                      }
                    ]}
                  >
                    {/* Swipe indicator */}
                    <View style={styles.swipeIndicatorContainer}>
                      <View style={[styles.swipeIndicator, { backgroundColor: theme.border }]} />
                    </View>
                    
              <View style={[styles.detailHeader, { borderBottomColor: theme.border }]}>
                <TouchableOpacity
                  onPress={() => setSelectedLocation(null)}
                  style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)', alignItems: 'center', justifyContent: 'center', zIndex: 1 }}
                  activeOpacity={0.7}
                >
                  <MaterialIcons name="arrow-back-ios-new" size={18} color={theme.primary} />
                </TouchableOpacity>
                <Text style={[styles.detailTitle, { color: theme.text }]}>
                  {selectedLocation.name}
                </Text>
                {/* Bookmark removed */}
                <View style={styles.detailBookmarkButton} />
              </View>

              <ScrollView 
                style={styles.detailContent} 
                showsVerticalScrollIndicator={false}
                refreshControl={
                  <RefreshControl
                    refreshing={refreshing}
                    onRefresh={onRefresh}
                    tintColor={theme.primary}
                    colors={[theme.primary]}
                    title="Pull to refresh..."
                    titleColor={theme.textSecondary}
                  />
                }
              >
                {/* Location Info Card */}
                <View style={[styles.detailCard, { backgroundColor: theme.card }]}>
                  <View style={styles.detailCardHeader}>
                    <View style={[styles.detailIcon, { backgroundColor: getMarkerColor(selectedLocation) + '20' }]}>
                      <MaterialIcons 
                        name={selectedLocation.icon} 
                        size={24} 
                        color={getMarkerColor(selectedLocation)} 
                      />
                    </View>
                    <View style={styles.detailCardTitle}>
                      <Text style={[styles.detailCardName, { color: theme.text }]}>
                        {selectedLocation.name}
                      </Text>
                      <Text style={[styles.detailCardType, { color: theme.textSecondary }]}>
                        {selectedLocation.type} • {selectedLocation.era.join(', ')}
                      </Text>
                    </View>
                  </View>
                  
                  <Text style={[styles.detailDescription, { color: theme.textSecondary }]}>
                    {selectedLocation.description}
                  </Text>
                  
                  <Text style={[styles.detailSignificance, { color: theme.text }]}>
                    {selectedLocation.significance}
                  </Text>
                </View>

                {/* Characters Card */}
                {selectedLocation.characters && selectedLocation.characters.length > 0 && (
                  <View style={[styles.detailCard, { backgroundColor: theme.card }]}>
                    <Text style={[styles.detailSectionTitle, { color: theme.text }]}>
                      Key Biblical Figures
                    </Text>
                    <View style={styles.charactersContainer}>
                      {selectedLocation.characters.map((character, index) => (
                        <View key={index} style={[styles.characterTag, { backgroundColor: theme.primary + '20' }]}>
                          <Text style={[styles.characterText, { color: theme.primary }]}>
                            {character}
                          </Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}

                {/* Events Card */}
                {selectedLocation.events && selectedLocation.events.length > 0 && (
                  <View style={[styles.detailCard, { backgroundColor: theme.card }]}>
                    <Text style={[styles.detailSectionTitle, { color: theme.text }]}>
                      Major Events
                    </Text>
                    {selectedLocation.events.map((event, index) => (
                      <View key={index} style={styles.eventItem}>
                        <View style={[styles.eventDot, { backgroundColor: getMarkerColor(selectedLocation) }]} />
                        <Text style={[styles.eventText, { color: theme.text }]}>
                          {event}
                        </Text>
                      </View>
                    ))}
                  </View>
                )}

                {/* Scripture References Card */}
                {selectedLocation.verses && selectedLocation.verses.length > 0 && (
                  <View style={[styles.detailCard, { backgroundColor: theme.card }]}>
                    <Text style={[styles.detailSectionTitle, { color: theme.text }]}>
                      Scripture References
                    </Text>
                    <View style={styles.versesContainer}>
                      {selectedLocation.verses.map((verse, index) => (
                        <TouchableOpacity 
                          key={index} 
                          style={[styles.verseTag, { backgroundColor: theme.success + '20' }]}
                          onPress={() => {
                            hapticFeedback.light();
                            // Future: Open Bible app or verse lookup
                          }}
                        >
                          <MaterialIcons name="auto-stories" size={14} color={theme.success} />
                          <Text style={[styles.verseText, { color: theme.success }]}>
                            {verse}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                )}
              </ScrollView>
                </Animated.View>
              </PanGestureHandler>
              </View>
            </GestureHandlerRootView>
          </Modal>
        )}
      </View>
  );

  if (asScreen) {
    return content;
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      {content}
    </Modal>
  );
};

const styles = StyleSheet.create({
  fullScreenContainer: {
    flex: 1,
  },
  fullScreenMapContainer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 0,
  },
  fullScreenMap: {
    flex: 1,
  },
  overlayContainer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 1,
  },
  safeAreaContainer: {
    flex: 1,
  },
  headerBlur: {
    borderRadius: 20,
    overflow: 'hidden',
    marginHorizontal: 15,
    marginTop: 5,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bookmarkButton: {
    width: 40,
    height: 40,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
  },
  eraFiltersBlur: {
    paddingVertical: 5,
    marginHorizontal: 15,
    marginTop: 10,
    borderRadius: 20,
    overflow: 'hidden',
  },
  eraFiltersContent: {
    paddingHorizontal: 15,
  },
  eraTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 25,
    marginRight: 10,
    borderWidth: 1,
  },
  eraTabText: {
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 6,
  },
  thematicFiltersBlur: {
    paddingVertical: 5,
    marginHorizontal: 15,
    marginTop: 5,
    borderRadius: 20,
    overflow: 'hidden',
  },
  filtersContent: {
    paddingHorizontal: 15,
  },
  filterTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
  },
  filterTabText: {
    fontSize: 10,
    fontWeight: '500',
    marginLeft: 4,
  },
  journeyControlsBlur: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    overflow: 'hidden',
  },
  journeyControlsContent: {
    paddingHorizontal: 20,
    paddingTop: 15,
    paddingBottom: 15,
  },
  journeyTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 10,
  },
  journeyHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  stopJourneyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  stopJourneyText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  journeyButtonsContainer: {
    paddingRight: 20,
    flexDirection: 'row',
  },
  journeyButton: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
    marginRight: 10,
    borderWidth: 1,
    minWidth: 120,
    maxWidth: 200,
    alignSelf: 'flex-start',
  },
  journeyButtonText: {
    fontSize: 12,
    fontWeight: '500',
  },
  customMarker: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  detailContainer: {
    flex: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'transparent',
    justifyContent: 'flex-end',
  },
  modalContent: {
    height: '90%',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 10,
  },
  swipeIndicatorContainer: {
    paddingTop: 8,
    paddingBottom: 4,
    alignItems: 'center',
  },
  swipeIndicator: {
    width: 40,
    height: 4,
    borderRadius: 2,
    opacity: 0.3,
  },
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
  },
  detailCloseButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailBookmarkButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailTitle: {
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
  },
  detailContent: {
    flex: 1,
    padding: 20,
  },
  detailCard: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  detailCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  detailIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  detailCardTitle: {
    flex: 1,
  },
  detailCardName: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 2,
  },
  detailCardType: {
    fontSize: 14,
    textTransform: 'capitalize',
  },
  detailDescription: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 12,
  },
  detailSignificance: {
    fontSize: 15,
    lineHeight: 22,
    fontStyle: 'italic',
  },
  detailSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  charactersContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  characterTag: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  characterText: {
    fontSize: 12,
    fontWeight: '500',
  },
  eventItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  eventDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 7,
    marginRight: 12,
  },
  eventText: {
    fontSize: 14,
    lineHeight: 20,
    flex: 1,
  },
  versesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  verseTag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  verseText: {
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 4,
  },
  
  // Enhanced Journey Button Styles
  journeyButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 2,
  },
  journeyDistance: {
    fontSize: 10,
    fontWeight: '400',
    opacity: 0.8,
  },
  miracleBadge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 6,
  },
  miracleBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: 'white',
  },
  
  // Enhanced Marker Styles
  bookmarkIndicator: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.8)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  miracleIndicator: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'white',
  },
  miracleIndicatorText: {
    fontSize: 9,
    fontWeight: '700',
    color: 'white',
  },
  
  // Statistics Display Styles
  statsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 20,
    paddingVertical: 8,
    marginTop: 5,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 16,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '500',
    marginTop: 2,
  },
  
  // New Feature Styles
  visitedIndicator: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 2,
  },
  measurePoint: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'white',
  },
  measurePointText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '700',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginHorizontal: 16,
    marginTop: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#FFFFFF',
    marginLeft: 8,
  },
  searchResults: {
    backgroundColor: 'rgba(0,0,0,0.9)',
    marginHorizontal: 16,
    borderRadius: 12,
    marginTop: 8,
    maxHeight: 200,
  },
  searchResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  searchResultText: {
    color: '#FFFFFF',
    fontSize: 14,
    marginLeft: 12,
  },
  quizContainer: {
    position: 'absolute',
    bottom: 100,
    left: 16,
    right: 16,
    backgroundColor: 'rgba(0,0,0,0.95)',
    borderRadius: 16,
    padding: 20,
  },
  quizQuestion: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 16,
  },
  quizOption: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
  quizOptionText: {
    color: '#FFFFFF',
    fontSize: 14,
  },
  quizScore: {
    color: '#00E676',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  tourControls: {
    position: 'absolute',
    bottom: 40,
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(0,0,0,0.9)',
    borderRadius: 16,
    padding: 16,
  },
  tourButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  tourButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  tourProgress: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  measureInfo: {
    position: 'absolute',
    top: 120,
    right: 16,
    backgroundColor: 'rgba(0,0,0,0.9)',
    borderRadius: 12,
    padding: 12,
  },
  measureText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  achievementBadge: {
    position: 'absolute',
    top: 120,
    left: 16,
    backgroundColor: '#FFD700',
    borderRadius: 12,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  achievementText: {
    color: '#000',
    fontSize: 12,
    fontWeight: '700',
    marginLeft: 6,
  },
});

export default InteractiveBibleMaps;

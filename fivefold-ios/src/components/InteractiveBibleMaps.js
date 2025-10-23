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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE, PROVIDER_APPLE } from 'react-native-maps';
import { MaterialIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../contexts/ThemeContext';
import { hapticFeedback } from '../utils/haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import SimplePercentageLoader from './SimplePercentageLoader';

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
  CACHE_KEY: 'bible_maps_data_v1',
  CACHE_TIMESTAMP_KEY: 'bible_maps_timestamp_v1',
  CACHE_DURATION: 24 * 60 * 60 * 1000, // 24 hours
};

const InteractiveBibleMaps = ({ visible, onClose }) => {
  const { theme, isDark } = useTheme();
  const mapRef = useRef(null);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [selectedJourney, setSelectedJourney] = useState(null);
  const [showJourneyRoutes, setShowJourneyRoutes] = useState(false);
  const [activeEra, setActiveEra] = useState('all');
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
      const timestamp = await AsyncStorage.getItem(MAPS_CONFIG.CACHE_TIMESTAMP_KEY);
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
      await AsyncStorage.setItem(MAPS_CONFIG.CACHE_KEY, JSON.stringify(data));
      await AsyncStorage.setItem(MAPS_CONFIG.CACHE_TIMESTAMP_KEY, Date.now().toString());
      
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
        const cachedData = await AsyncStorage.getItem(MAPS_CONFIG.CACHE_KEY);
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
        const cachedData = await AsyncStorage.getItem(MAPS_CONFIG.CACHE_KEY);
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
    if (mapRef.current && journey.coordinates.length > 0) {
      mapRef.current.fitToCoordinates(journey.coordinates, {
        edgePadding: { top: 50, right: 50, bottom: 50, left: 50 },
        animated: true,
      });
    }
  };

  // Enhanced journey route animation with waypoint details
  const animateJourneyRoute = (journey) => {
    if (!journey || !journey.coordinates) return;
    
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
      if (!isPlayingRef.current || !journey.coordinates || coordinateIndex >= journey.coordinates.length) {
        setIsPlayingJourney(false);
        isPlayingRef.current = false;
        setShowJourneyRoutes(false); // Hide route path when journey completes
        journeyTimeouts.current = [];
        return;
      }
      
      const coordinate = journey.coordinates[coordinateIndex];
      
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
    Alert.alert(
      `${journey.name}`,
      `${journey.description}\n\nDistance: ${journey.totalDistance}\nDuration: ${journey.duration}\nSignificance: ${journey.significance}\n\nMiracles: ${journey.miracleCount || 0}\nThemes: ${journey.keyThemes ? journey.keyThemes.join(', ') : 'Various'}`,
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
    
    return {
      locationCount: locations.length,
      journeyCount: journeys.length,
      miracleCount: locations.reduce((sum, loc) => sum + (loc.miracleCount || 0), 0) + 
                   journeys.reduce((sum, journey) => sum + (journey.miracleCount || 0), 0),
      totalDistance: journeys.reduce((sum, journey) => {
        const distance = parseInt(journey.totalDistance?.replace(/[^\d]/g, '') || '0');
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

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <View style={[styles.fullScreenContainer, { backgroundColor: theme.background }]}>
        {/* Full Screen Map Background */}
        <View style={styles.fullScreenMapContainer}>
          <MapView
            ref={mapRef}
            style={styles.fullScreenMap}
            initialRegion={initialRegion}
            provider={Platform.OS === 'ios' ? PROVIDER_APPLE : PROVIDER_GOOGLE}
            showsUserLocation={false}
            showsMyLocationButton={false}
            showsCompass={true}
            showsScale={true}
          >
            {/* Enhanced Location Markers */}
            {getFilteredLocations().map((location) => (
              <Marker
                key={location.id}
                coordinate={location.coordinate}
                title={location.name}
                description={location.description}
                onPress={() => showLocationDetails(location)}
                pinColor={getMarkerColor(location)}
              >
                <View style={[
                  styles.customMarker,
                  { 
                    backgroundColor: getMarkerColor(location),
                    borderColor: theme.surface,
                    transform: [{ scale: selectedLocation?.id === location.id ? 1.3 : bookmarkedLocations.includes(location.id) ? 1.1 : 1.0 }],
                    shadowColor: getMarkerColor(location),
                    shadowOpacity: selectedLocation?.id === location.id ? 0.6 : 0.3,
                    shadowRadius: selectedLocation?.id === location.id ? 8 : 4,
                  }
                ]}>
                  <MaterialIcons 
                    name={location.icon} 
                    size={selectedLocation?.id === location.id ? 24 : 20} 
                    color="white" 
                  />
                  {/* Bookmark indicator removed */}
                  {location.miracleCount && location.miracleCount > 0 && (
                    <View style={[styles.miracleIndicator, { backgroundColor: getMarkerColor(location) }]}>
                      <Text style={styles.miracleIndicatorText}>{location.miracleCount}</Text>
                    </View>
                  )}
                </View>
              </Marker>
            ))}

            {/* Journey Routes */}
            {showJourneyRoutes && getFilteredJourneys().map((journey) => (
              <Polyline
                key={journey.id}
                coordinates={journey.coordinates}
                strokeColor={journey.color}
                strokeWidth={selectedJourney?.id === journey.id ? 4 : 2}
                strokePattern={selectedJourney?.id === journey.id ? [10, 5] : undefined}
              />
            ))}
          </MapView>
        </View>

        {/* Overlay UI Elements */}
        <View style={styles.overlayContainer} pointerEvents="box-none">
          <View style={styles.safeAreaContainer} pointerEvents="box-none">
            {/* Header */}
            <BlurView intensity={isDark ? 80 : 40} style={[styles.headerBlur, { backgroundColor: 'rgba(0,0,0,0.3)', marginTop: 60 }]}>
              <View style={styles.headerContent}>
                <TouchableOpacity onPress={onClose} style={[styles.closeButton, { minWidth: 60, alignItems: 'center' }]}>
                  <Text style={[{ color: '#FFFFFF', fontSize: 16, fontWeight: '600' }]} numberOfLines={1}>Close</Text>
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { 
                  color: '#FFFFFF',
                  fontWeight: '700'
                }]}>
                  Interactive Bible Maps
                </Text>
                {/* Bookmark removed */}
                <View style={styles.bookmarkButton} />
              </View>
            </BlurView>

            {/* Era Filters */}
            <BlurView intensity={isDark ? 60 : 30} style={[styles.eraFiltersBlur, { backgroundColor: 'rgba(0,0,0,0.2)' }]}>
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
                        backgroundColor: activeEra === era.id ? era.color + '20' : 'transparent',
                        borderColor: activeEra === era.id ? era.color : theme.border,
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
                      color={activeEra === era.id ? era.color : '#FFFFFF'} 
                    />
                    <Text style={[
                      styles.eraTabText,
                      { 
                        color: activeEra === era.id ? era.color : '#FFFFFF',
                        fontWeight: '600'
                      }
                    ]}>
                      {era.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </BlurView>

            {/* Thematic Filters */}
            <BlurView intensity={isDark ? 60 : 30} style={[styles.thematicFiltersBlur, { backgroundColor: 'rgba(0,0,0,0.2)' }]}>
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
                        backgroundColor: activeFilter === filter.id ? filter.color + '20' : 'transparent',
                        borderColor: activeFilter === filter.id ? filter.color : theme.border,
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
                      color={activeFilter === filter.id ? filter.color : '#FFFFFF'} 
                    />
                    <Text style={[
                      styles.filterTabText,
                      { 
                        color: activeFilter === filter.id ? filter.color : '#FFFFFF',
                        fontWeight: '600'
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
                        <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Locations</Text>
                      </View>
                      <View style={styles.statItem}>
                        <Text style={[styles.statNumber, { color: theme.success }]}>{stats.journeyCount}</Text>
                        <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Journeys</Text>
                      </View>
                      <View style={styles.statItem}>
                        <Text style={[styles.statNumber, { color: theme.warning }]}>{stats.miracleCount}</Text>
                        <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Miracles</Text>
                      </View>
                      {stats.totalDistance > 0 && (
                        <View style={styles.statItem}>
                          <Text style={[styles.statNumber, { color: theme.info }]}>{stats.totalDistance.toLocaleString()}</Text>
                          <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Miles</Text>
                        </View>
                      )}
                    </>
                  );
                })()}
              </View>
            </BlurView>

            {/* Journey Controls */}
            <BlurView intensity={isDark ? 80 : 40} style={[styles.journeyControlsBlur, { backgroundColor: 'rgba(0,0,0,0.3)' }]}>
              <View style={styles.journeyControlsContent}>
                <View style={styles.journeyHeaderRow}>
                  <Text style={[
                    styles.journeyTitle,
                    { 
                      color: '#FFFFFF',
                      fontWeight: '700'
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
                          backgroundColor: selectedJourney?.id === journey.id ? journey.color + '20' : 'rgba(255,255,255,0.1)',
                          borderColor: selectedJourney?.id === journey.id ? journey.color : 'rgba(255,255,255,0.3)',
                        }
                      ]}
                      onPress={() => showJourneyDetails(journey)}
                      onLongPress={() => animateJourneyRoute(journey)}
                    >
                      <View style={styles.journeyButtonContent}>
                        <Text style={[
                          styles.journeyButtonText,
                          { 
                            color: selectedJourney?.id === journey.id ? journey.color : '#FFFFFF',
                            fontWeight: '600'
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
                          color: selectedJourney?.id === journey.id ? journey.color : 'rgba(255,255,255,0.8)',
                          fontWeight: '500'
                        }
                      ]}>
                        {journey.totalDistance}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </BlurView>
          </View>
        </View>

        {/* Location Detail Modal */}
        {selectedLocation && (
          <Modal
            visible={!!selectedLocation}
            animationType="slide"
            presentationStyle="pageSheet"
            onRequestClose={() => setSelectedLocation(null)}
          >
            <SafeAreaView style={[styles.detailContainer, { backgroundColor: theme.background }]}>
              <View style={[styles.detailHeader, { borderBottomColor: theme.border }]}>
                <TouchableOpacity onPress={() => setSelectedLocation(null)} style={[styles.detailCloseButton, { minWidth: 60, alignItems: 'center' }]}>
                  <Text style={[{ color: theme.primary, fontSize: 16, fontWeight: '600' }]} numberOfLines={1}>Close</Text>
                </TouchableOpacity>
                <Text style={[styles.detailTitle, { color: theme.text }]}>
                  {selectedLocation.name}
                </Text>
                {/* Bookmark removed */}
                <View style={styles.detailBookmarkButton} />
              </View>

              <ScrollView style={styles.detailContent} showsVerticalScrollIndicator={false}>
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
            </SafeAreaView>
          </Modal>
        )}
      </View>
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
});

export default InteractiveBibleMaps;

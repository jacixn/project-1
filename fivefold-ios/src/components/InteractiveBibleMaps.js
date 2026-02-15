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
  PanResponder,
} from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE, PROVIDER_APPLE } from 'react-native-maps';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { hapticFeedback } from '../utils/haptics';
import userStorage from '../utils/userStorage';
import AchievementService from '../services/achievementService';
import { pushToCloud } from '../services/userSyncService';
import SimplePercentageLoader from './SimplePercentageLoader';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
// LiquidGlassView/BlurView removed from map overlays — causes native crashes with MapView

const { width, height } = Dimensions.get('window');

// =============================================
// Map overlay container — uses a plain semi-transparent View
// instead of BlurView to avoid native crashes on MapView overlays.
// BlurView + MapView marker re-renders is a known iOS crash source.
// =============================================
const MapGlassContainer = React.memo(({ children, style, bgColor = 'rgba(255,255,255,0.85)' }) => (
  <View style={[style, { backgroundColor: bgColor }]}>
    {children}
  </View>
));

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
  CACHE_KEY: 'bible_maps_data_v4',
  CACHE_TIMESTAMP_KEY: 'bible_maps_timestamp_v4',
  CACHE_DURATION: 24 * 60 * 60 * 1000, // 24 hours
};

const InteractiveBibleMaps = ({ visible, onClose, asScreen = false }) => {
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const mapRef = useRef(null);

  // Core state
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [selectedJourney, setSelectedJourney] = useState(null);
  const [showJourneyRoutes, setShowJourneyRoutes] = useState(false);
  const [activeEra, setActiveEra] = useState('all');
  const [activeFilter, setActiveFilter] = useState('all');
  const [bookmarkedLocations, setBookmarkedLocations] = useState([]);
  const [visitedLocations, setVisitedLocations] = useState([]);
  const [showPaths, setShowPaths] = useState(true);
  const [showConnections, setShowConnections] = useState(false);

  // Journey animation state
  const [animatedRouteIndex, setAnimatedRouteIndex] = useState(0);
  const [isPlayingJourney, setIsPlayingJourney] = useState(false);
  const journeyTimeouts = useRef([]);
  const isPlayingRef = useRef(false);

  // Remote data state
  const [mapsData, setMapsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  // Animated value for detail modal swipe gesture
  const modalTranslateY = useRef(new Animated.Value(0)).current;
  const dismissHapticFired = useRef(false);

  // =============================================
  // JOURNEY CONTROLS
  // =============================================

  const stopJourney = () => {
    setIsPlayingJourney(false);
    isPlayingRef.current = false;
    setShowJourneyRoutes(false);
    journeyTimeouts.current.forEach(timeoutId => clearTimeout(timeoutId));
    journeyTimeouts.current = [];
  };

  // =============================================
  // DATA LAYER
  // =============================================

  const isCacheValid = async () => {
    try {
      const timestamp = await userStorage.getRaw(MAPS_CONFIG.CACHE_TIMESTAMP_KEY);
      if (!timestamp) return false;
      const cacheAge = Date.now() - parseInt(timestamp);
      return cacheAge < MAPS_CONFIG.CACHE_DURATION;
    } catch (err) {
      console.error('Error checking cache validity:', err);
      return false;
    }
  };

  const fetchMapsFromRemote = async () => {
    try {
      const url = MAPS_CONFIG.URL;
      if (!url) throw new Error('Remote URL not configured');

      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);

      const data = await response.json();
      await userStorage.setRaw(MAPS_CONFIG.CACHE_KEY, JSON.stringify(data));
      await userStorage.setRaw(MAPS_CONFIG.CACHE_TIMESTAMP_KEY, Date.now().toString());
      return data;
    } catch (err) {
      console.error('Error fetching Bible maps from remote:', err);
      throw err;
    }
  };

  const loadFallbackData = () => ({
    version: '1.0',
    biblicalLocations: [],
    biblicalJourneys: [],
    filterCategories: [{ id: 'all', name: 'All Locations', icon: 'map' }],
    eraFilters: [{ id: 'all', name: 'All Eras', icon: 'history' }],
    initialRegion: { latitude: 31.7683, longitude: 35.2137, latitudeDelta: 8.0, longitudeDelta: 8.0 },
  });

  const loadMapsData = async () => {
    try {
      if (await isCacheValid()) {
        const cachedData = await userStorage.getRaw(MAPS_CONFIG.CACHE_KEY);
        if (cachedData) {
          setMapsData(JSON.parse(cachedData));
          setLoading(false);
          return;
        }
      }
      const data = await fetchMapsFromRemote();
      setMapsData(data);
      setLoading(false);
    } catch (err) {
      console.error('Error loading Bible maps:', err);
      try {
        const cachedData = await userStorage.getRaw(MAPS_CONFIG.CACHE_KEY);
        if (cachedData) {
          setMapsData(JSON.parse(cachedData));
          setError('Using offline data');
        } else {
          throw new Error('No cached data available');
        }
      } catch (_) {
        setMapsData(loadFallbackData());
        setError('Using limited offline data');
      }
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    hapticFeedback.light();
    try {
      await userStorage.remove(MAPS_CONFIG.CACHE_KEY);
      await userStorage.remove(MAPS_CONFIG.CACHE_TIMESTAMP_KEY);
      const data = await fetchMapsFromRemote();
      setMapsData(data);
      setError(null);
    } catch (err) {
      console.error('Error refreshing maps:', err);
    } finally {
      setRefreshing(false);
    }
  };

  // =============================================
  // EFFECTS
  // =============================================

  useEffect(() => {
    if (visible) loadMapsData();
  }, [visible]);

  useEffect(() => {
    return () => {
      journeyTimeouts.current.forEach(timeoutId => clearTimeout(timeoutId));
      journeyTimeouts.current = [];
    };
  }, []);

  useEffect(() => {
    const loadUserData = async () => {
      try {
        const visited = await userStorage.getRaw('bible_maps_visited');
        const bookmarks = await userStorage.getRaw('bible_maps_bookmarks');
        if (visited) setVisitedLocations(JSON.parse(visited));
        if (bookmarks) setBookmarkedLocations(JSON.parse(bookmarks));
      } catch (err) {
        console.log('Error loading user data:', err);
      }
    };
    if (visible) loadUserData();
  }, [visible]);

  useEffect(() => {
    const saveUserData = async () => {
      try {
        await userStorage.setRaw('bible_maps_visited', JSON.stringify(visitedLocations));
        await userStorage.setRaw('bible_maps_bookmarks', JSON.stringify(bookmarkedLocations));
        pushToCloud('bibleMapsVisited', visitedLocations);
        pushToCloud('bibleMapsBookmarks', bookmarkedLocations);
      } catch (err) {
        console.log('Error saving user data:', err);
      }
    };
    if (visible && (visitedLocations.length > 0 || bookmarkedLocations.length > 0)) {
      saveUserData();
    }
  }, [visitedLocations, bookmarkedLocations, visible]);

  // =============================================
  // DERIVED DATA
  // =============================================

  const biblicalLocations = mapsData?.biblicalLocations || [];
  const biblicalJourneys = mapsData?.biblicalJourneys || [];
  const filterCategories = mapsData?.filterCategories || [
    { id: 'all', name: 'All Locations', icon: 'map', color: theme.primary },
  ];
  const eraFilters = mapsData?.eraFilters || [
    { id: 'all', name: 'All Eras', icon: 'history', color: theme.primary },
  ];
  const initialRegion = mapsData?.initialRegion || {
    latitude: 31.7683, longitude: 35.2137, latitudeDelta: 8.0, longitudeDelta: 8.0,
  };

  // =============================================
  // FILTERS & HELPERS
  // =============================================

  const getFilteredLocations = () => {
    let filtered = biblicalLocations;
    if (activeEra !== 'all') {
      filtered = filtered.filter(loc => loc.era?.includes(activeEra));
    }
    if (activeFilter !== 'all') {
      filtered = filtered.filter(loc => loc.category === activeFilter);
    }
    return filtered;
  };

  const getFilteredJourneys = () => {
    if (activeEra === 'all') return biblicalJourneys;
    return biblicalJourneys.filter(journey => journey.era === activeEra);
  };

  const getFilterStats = () => {
    const locations = getFilteredLocations();
    const journeys = getFilteredJourneys();
    const miracleCount = locations.filter(loc =>
      loc.category === 'miracle' || loc.category === 'battle_miracle'
    ).length;

    return {
      locationCount: locations.length,
      journeyCount: journeys.length,
      miracleCount,
      totalDistance: journeys.reduce((sum, journey) => {
        const distance = parseInt(journey.distance?.replace(/[^\d]/g, '') || '0');
        return sum + distance;
      }, 0),
    };
  };

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
      exile_miracles: '#607D8B',
    };
    return categoryColors[location.category] || theme.primary;
  };

  const getConnectedLocations = (locationId) => {
    const location = biblicalLocations.find(l => l.id === locationId);
    if (!location) return [];
    return biblicalLocations.filter(loc =>
      loc.id !== locationId &&
      loc.characters?.some(char => location.characters?.includes(char))
    );
  };

  // =============================================
  // INTERACTION HANDLERS
  // =============================================

  const handleLocationPress = (location) => {
    hapticFeedback.light();
    modalTranslateY.setValue(height); // Start off-screen at bottom
    setSelectedLocation(location);

    // Slide up with spring
    Animated.spring(modalTranslateY, {
      toValue: 0,
      tension: 65,
      friction: 11,
      useNativeDriver: true,
    }).start();

    if (mapRef.current) {
      mapRef.current.animateToRegion({
        ...location.coordinate,
        latitudeDelta: 0.5,
        longitudeDelta: 0.5,
      }, 1000);
    }
  };

  const markLocationVisited = (locationId) => {
    if (!visitedLocations.includes(locationId)) {
      setVisitedLocations(prev => {
        const updated = [...prev, locationId];
        AchievementService.setStat('mapsVisited', updated.length);
        return updated;
      });
    }
  };

  const handleJourneyPress = (journey) => {
    hapticFeedback.light();
    setSelectedJourney(journey);
    if (mapRef.current && journey.route && journey.route.length > 0) {
      mapRef.current.fitToCoordinates(journey.route, {
        edgePadding: { top: 50, right: 50, bottom: 50, left: 50 },
        animated: true,
      });
    }
  };

  const animateJourneyRoute = (journey) => {
    if (!journey || !journey.route) return;
    hapticFeedback.light();
    journeyTimeouts.current.forEach(id => clearTimeout(id));
    journeyTimeouts.current = [];

    setIsPlayingJourney(true);
    isPlayingRef.current = true;
    setSelectedJourney(journey);
    setShowJourneyRoutes(true);
    setAnimatedRouteIndex(0);

    const animateToNextPoint = (idx) => {
      if (!isPlayingRef.current || !journey.route || idx >= journey.route.length) {
        setIsPlayingJourney(false);
        isPlayingRef.current = false;
        setShowJourneyRoutes(false);
        journeyTimeouts.current = [];
        return;
      }
      const coordinate = journey.route[idx];
      if (mapRef.current && coordinate) {
        mapRef.current.animateToRegion({
          ...coordinate,
          latitudeDelta: 0.5,
          longitudeDelta: 0.5,
        }, 2000);
      }
      setAnimatedRouteIndex(idx);
      const timeoutId = setTimeout(() => {
        if (isPlayingRef.current) animateToNextPoint(idx + 1);
      }, 3500);
      journeyTimeouts.current.push(timeoutId);
    };

    animateToNextPoint(0);
  };

  const showJourneyDetails = (journey) => {
    const versesText = journey.verses?.length > 0
      ? `\n\nScriptures: ${journey.verses.join(', ')}`
      : '';
    Alert.alert(
      journey.name,
      `${journey.description}\n\nDistance: ${journey.distance || 'Not specified'}\nDuration: ${journey.duration || 'Unknown'}${versesText}`,
      [
        { text: 'Play Journey', onPress: () => animateJourneyRoute(journey) },
        { text: 'View Route', onPress: () => handleJourneyPress(journey) },
        { text: 'Close', style: 'cancel' },
      ]
    );
  };

  const toggleBookmark = (locationId) => {
    hapticFeedback.light();
    setBookmarkedLocations(prev =>
      prev.includes(locationId)
        ? prev.filter(id => id !== locationId)
        : [...prev, locationId]
    );
  };

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

  // =============================================
  // DETAIL MODAL — pull-down-to-dismiss
  // =============================================

  const closeDetailModal = () => {
    hapticFeedback.light();
    Animated.timing(modalTranslateY, {
      toValue: height,
      duration: 250,
      useNativeDriver: true,
    }).start(() => {
      setSelectedLocation(null);
      // Do NOT reset modalTranslateY here — it causes a flash.
      // handleLocationPress already sets it to `height` before opening.
    });
  };

  const detailPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gs) => gs.dy > 8,
      onPanResponderGrant: () => {
        dismissHapticFired.current = false;
        hapticFeedback.light();
      },
      onPanResponderMove: (_, gs) => {
        if (gs.dy < 0) return;
        modalTranslateY.setValue(gs.dy);
        if (gs.dy > 150 && !dismissHapticFired.current) {
          dismissHapticFired.current = true;
          hapticFeedback.medium();
        } else if (gs.dy <= 150 && dismissHapticFired.current) {
          dismissHapticFired.current = false;
          hapticFeedback.light();
        }
      },
      onPanResponderRelease: (_, gs) => {
        if (gs.dy > 150 || gs.vy > 0.5) {
          hapticFeedback.success();
          Animated.timing(modalTranslateY, {
            toValue: height,
            duration: 250,
            useNativeDriver: true,
          }).start(() => {
            setSelectedLocation(null);
          });
        } else {
          Animated.spring(modalTranslateY, {
            toValue: 0,
            tension: 65,
            friction: 11,
            useNativeDriver: true,
          }).start();
        }
      },
    })
  ).current;

  // MapGlassContainer defined at top of file — plain View, no BlurView

  // =============================================
  // LOADING STATE
  // =============================================

  if (loading) {
    const loader = (
      <View style={[styles.fullScreenContainer, { backgroundColor: theme.background, justifyContent: 'center', alignItems: 'center' }]}>
        <SimplePercentageLoader
          isVisible={true}
          loadingText="Loading Bible Maps..."
        />
      </View>
    );

    if (asScreen) return loader;

    return (
      <Modal visible={visible} animationType="fade" presentationStyle="fullScreen" onRequestClose={onClose}>
        {loader}
      </Modal>
    );
  }

  // =============================================
  // OVERLAY TEXT COLOR — adapts to map brightness
  // =============================================
  // Map is always light-colored, so overlay text must always be dark for readability
  const overlayText = '#1A1A2E';
  const overlayTextMuted = '#3A3A4A';

  // =============================================
  // MAIN RENDER
  // =============================================

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
        >
          {/* Location Markers */}
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
                  handleLocationPress(location);
                  markLocationVisited(location.id);
                }}
                pinColor={getMarkerColor(location)}
              >
                <View
                  style={[
                    styles.customMarker,
                    {
                      backgroundColor: getMarkerColor(location),
                      borderColor: '#FFFFFF',
                      borderWidth: isBookmarked ? 3 : 2,
                      opacity: isVisited ? 1.0 : 0.7,
                      transform: [{ scale: isSelected ? 1.4 : isBookmarked ? 1.2 : 1.0 }],
                      shadowColor: getMarkerColor(location),
                      shadowOpacity: isSelected ? 0.8 : 0.4,
                      shadowRadius: isSelected ? 10 : 5,
                    },
                  ]}
                >
                  <MaterialIcons
                    name={location.icon}
                    size={isSelected ? 26 : 20}
                    color="white"
                  />
                  {isVisited && (
                    <View style={styles.visitedIndicator}>
                      <MaterialIcons name="check-circle" size={12} color="#00E676" />
                    </View>
                  )}
                  {location.miracleCount > 0 && (
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

          {/* Active Journey Route */}
          {showJourneyRoutes && selectedJourney?.route && showPaths && (
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
          <MapGlassContainer style={[styles.headerBlur, { marginTop: insets.top + 8 }]} bgColor="rgba(255,255,255,0.92)">
            <View style={styles.headerContent}>
              <TouchableOpacity
                onPress={onClose}
                style={styles.headerBackBtn}
                activeOpacity={0.7}
              >
                <MaterialIcons name="arrow-back-ios-new" size={18} color={overlayText} />
              </TouchableOpacity>
              <Text style={[styles.headerTitle, { color: overlayText }]}>
                Interactive Bible Maps
              </Text>
              <View style={{ width: 40 }} />
            </View>
          </MapGlassContainer>

          {/* Era Filters */}
          <MapGlassContainer style={styles.eraFiltersBlur} bgColor="rgba(255,255,255,0.88)">
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
                      backgroundColor: activeEra === era.id ? (era.color || theme.primary) + '25' : 'rgba(0,0,0,0.06)',
                      borderColor: activeEra === era.id ? (era.color || theme.primary) : 'rgba(0,0,0,0.15)',
                    },
                  ]}
                  onPress={() => {
                    hapticFeedback.light();
                    setActiveEra(era.id);
                  }}
                >
                  <MaterialIcons
                    name={era.icon}
                    size={16}
                    color={activeEra === era.id ? (era.color || theme.primary) : overlayText}
                  />
                  <Text
                    style={[
                      styles.eraTabText,
                      {
                        color: activeEra === era.id ? (era.color || theme.primary) : overlayText,
                        fontWeight: '700',
                      },
                    ]}
                  >
                    {era.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </MapGlassContainer>

          {/* Thematic Filters */}
          <MapGlassContainer style={styles.thematicFiltersBlur} bgColor="rgba(255,255,255,0.88)">
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
                      backgroundColor: activeFilter === filter.id ? (filter.color || theme.primary) + '25' : 'rgba(0,0,0,0.06)',
                      borderColor: activeFilter === filter.id ? (filter.color || theme.primary) : 'rgba(0,0,0,0.15)',
                    },
                  ]}
                  onPress={() => {
                    hapticFeedback.light();
                    setActiveFilter(filter.id);
                  }}
                >
                  <MaterialIcons
                    name={filter.icon}
                    size={14}
                    color={activeFilter === filter.id ? (filter.color || theme.primary) : overlayText}
                  />
                  <Text
                    style={[
                      styles.filterTabText,
                      {
                        color: activeFilter === filter.id ? (filter.color || theme.primary) : overlayText,
                        fontWeight: '700',
                      },
                    ]}
                  >
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
                      <Text style={[styles.statLabel, { color: overlayTextMuted }]}>Locations</Text>
                    </View>
                    <View style={styles.statItem}>
                      <Text style={[styles.statNumber, { color: '#4CAF50' }]}>{stats.journeyCount}</Text>
                      <Text style={[styles.statLabel, { color: overlayTextMuted }]}>Journeys</Text>
                    </View>
                    <View style={styles.statItem}>
                      <Text style={[styles.statNumber, { color: '#FF9800' }]}>{stats.miracleCount}</Text>
                      <Text style={[styles.statLabel, { color: overlayTextMuted }]}>Miracles</Text>
                    </View>
                    {stats.totalDistance > 0 && (
                      <View style={styles.statItem}>
                        <Text style={[styles.statNumber, { color: '#2196F3' }]}>{stats.totalDistance.toLocaleString()}</Text>
                        <Text style={[styles.statLabel, { color: overlayTextMuted }]}>Miles</Text>
                      </View>
                    )}
                  </>
                );
              })()}
            </View>
          </MapGlassContainer>

          {/* Journey Controls — pinned at bottom */}
          <MapGlassContainer style={styles.journeyControlsBlur} bgColor="rgba(255,255,255,0.92)">
            <View style={[styles.journeyControlsContent, { paddingBottom: Math.max(insets.bottom, 15) }]}>
              <View style={styles.journeyHeaderRow}>
                <Text style={[styles.journeyTitle, { color: overlayText }]}>
                  Biblical Journeys
                </Text>
                {isPlayingJourney && (
                  <TouchableOpacity
                    style={[styles.stopJourneyButton, { backgroundColor: '#EF4444' }]}
                    onPress={stopJourney}
                  >
                    <MaterialIcons name="stop" size={16} color="white" />
                    <Text style={styles.stopJourneyText}>Stop</Text>
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
                        backgroundColor: selectedJourney?.id === journey.id ? (journey.color || theme.primary) + '25' : 'rgba(0,0,0,0.06)',
                        borderColor: selectedJourney?.id === journey.id ? (journey.color || theme.primary) : 'rgba(0,0,0,0.15)',
                      },
                    ]}
                    onPress={() => showJourneyDetails(journey)}
                    onLongPress={() => animateJourneyRoute(journey)}
                  >
                    <View style={styles.journeyButtonContent}>
                      <Text
                        style={[
                          styles.journeyButtonText,
                          {
                            color: selectedJourney?.id === journey.id ? (journey.color || theme.primary) : overlayText,
                            fontWeight: '700',
                          },
                        ]}
                      >
                        {journey.name}
                      </Text>
                    </View>
                    {journey.distance ? (
                      <Text
                        style={[
                          styles.journeyDistance,
                          {
                            color: selectedJourney?.id === journey.id ? (journey.color || theme.primary) : overlayTextMuted,
                          },
                        ]}
                      >
                        {journey.distance}
                      </Text>
                    ) : null}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </MapGlassContainer>
        </View>
      </View>

      {/* Location Detail Modal */}
      {selectedLocation && (
        <View style={[StyleSheet.absoluteFill, { zIndex: 10 }]} pointerEvents="box-none">
          {/* Dimmed overlay */}
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={closeDetailModal}
          />

          {/* Sheet */}
          <Animated.View
            style={[
              styles.modalContent,
              {
                backgroundColor: theme.background,
                transform: [{ translateY: modalTranslateY }],
              },
            ]}
          >
            {/* Drag handle — pull down to dismiss */}
            <View {...detailPanResponder.panHandlers} style={styles.swipeIndicatorContainer}>
              <View style={[styles.swipeIndicator, { backgroundColor: isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.15)' }]} />
            </View>

            {/* Header — centred title, no back arrow (pull down to dismiss) */}
            <View style={[styles.detailHeader, { borderBottomColor: theme.border }]}>
              <Text style={[styles.detailTitle, { color: theme.text, textAlign: 'center', flex: 1 }]} numberOfLines={1}>
                {selectedLocation.name}
              </Text>
            </View>

            {/* Content */}
            <ScrollView style={styles.detailContent} showsVerticalScrollIndicator={false}>
              {/* Location Info Card */}
              <View style={[styles.detailCard, { backgroundColor: theme.card }]}>
                <View style={styles.detailCardHeader}>
                  <View style={[styles.detailIcon, { backgroundColor: getMarkerColor(selectedLocation) + '20' }]}>
                    <MaterialIcons name={selectedLocation.icon} size={24} color={getMarkerColor(selectedLocation)} />
                  </View>
                  <View style={styles.detailCardTitle}>
                    <Text style={[styles.detailCardName, { color: theme.text }]}>
                      {selectedLocation.name}
                    </Text>
                    <Text style={[styles.detailCardType, { color: theme.textSecondary }]}>
                      {selectedLocation.type} {selectedLocation.era ? `\u2022 ${selectedLocation.era.join(', ')}` : ''}
                    </Text>
                  </View>
                </View>
                <Text style={[styles.detailDescription, { color: theme.textSecondary }]}>
                  {selectedLocation.description}
                </Text>
                {selectedLocation.significance ? (
                  <Text style={[styles.detailSignificance, { color: theme.text }]}>
                    {selectedLocation.significance}
                  </Text>
                ) : null}
              </View>

              {/* Characters Card */}
              {selectedLocation.characters?.length > 0 && (
                <View style={[styles.detailCard, { backgroundColor: theme.card }]}>
                  <Text style={[styles.detailSectionTitle, { color: theme.text }]}>
                    Key Biblical Figures
                  </Text>
                  <View style={styles.tagsContainer}>
                    {selectedLocation.characters.map((character, index) => (
                      <View key={index} style={[styles.tag, { backgroundColor: theme.primary + '20' }]}>
                        <Text style={[styles.tagText, { color: theme.primary }]}>{character}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {/* Events Card */}
              {selectedLocation.events?.length > 0 && (
                <View style={[styles.detailCard, { backgroundColor: theme.card }]}>
                  <Text style={[styles.detailSectionTitle, { color: theme.text }]}>
                    Major Events
                  </Text>
                  {selectedLocation.events.map((event, index) => (
                    <View key={index} style={styles.eventItem}>
                      <View style={[styles.eventDot, { backgroundColor: getMarkerColor(selectedLocation) }]} />
                      <Text style={[styles.eventText, { color: theme.text }]}>{event}</Text>
                    </View>
                  ))}
                </View>
              )}

              {/* Scripture References Card */}
              {selectedLocation.verses?.length > 0 && (
                <View style={[styles.detailCard, { backgroundColor: theme.card }]}>
                  <Text style={[styles.detailSectionTitle, { color: theme.text }]}>
                    Scripture References
                  </Text>
                  <View style={styles.tagsContainer}>
                    {selectedLocation.verses.map((verse, index) => (
                      <View key={index} style={[styles.tag, { backgroundColor: '#4CAF50' + '20' }]}>
                        <MaterialIcons name="auto-stories" size={14} color="#4CAF50" />
                        <Text style={[styles.tagText, { color: '#4CAF50', marginLeft: 4 }]}>{verse}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              <View style={{ height: 40 }} />
            </ScrollView>
          </Animated.View>
        </View>
      )}
    </View>
  );

  if (asScreen) return content;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen" onRequestClose={onClose}>
      {content}
    </Modal>
  );
};

// =============================================
// STYLES
// =============================================

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

  // ---- Header ----
  headerBlur: {
    borderRadius: 20,
    overflow: 'hidden',
    marginHorizontal: 15,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerBackBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    flex: 1,
    textAlign: 'center',
    letterSpacing: 0.3,
  },

  // ---- Era Filters ----
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

  // ---- Thematic Filters ----
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

  // ---- Stats ----
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

  // ---- Journey Controls ----
  journeyControlsBlur: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    overflow: 'hidden',
  },
  journeyControlsContent: {
    paddingHorizontal: 20,
    paddingTop: 15,
  },
  journeyHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  journeyTitle: {
    fontSize: 16,
    fontWeight: '800',
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
  journeyButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginBottom: 2,
  },
  journeyButtonText: {
    fontSize: 12,
    fontWeight: '500',
  },
  journeyDistance: {
    fontSize: 10,
    fontWeight: '600',
    opacity: 0.8,
  },

  // ---- Map Markers ----
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
  visitedIndicator: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 2,
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

  // ---- Detail Modal ----
  modalOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  modalContent: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '85%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 10,
  },
  swipeIndicatorContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 36,
  },
  swipeIndicator: {
    width: 40,
    height: 5,
    borderRadius: 2.5,
  },
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  detailCloseButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailTitle: {
    fontSize: 18,
    fontWeight: '700',
    flex: 1,
    textAlign: 'center',
    letterSpacing: 0.3,
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
    fontWeight: '700',
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
    fontWeight: '700',
    marginBottom: 12,
  },

  // ---- Tags (characters, verses) ----
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  tagText: {
    fontSize: 12,
    fontWeight: '600',
  },

  // ---- Events ----
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
});

export default InteractiveBibleMaps;

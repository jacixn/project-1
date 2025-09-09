import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Platform,
  Dimensions,
  Alert,
  Animated,
} from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE, PROVIDER_APPLE } from 'react-native-maps';
import { MaterialIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../contexts/ThemeContext';
import { hapticFeedback } from '../utils/haptics';

const { width, height } = Dimensions.get('window');

const InteractiveBibleMaps = ({ visible, onClose }) => {
  const { theme, isDark } = useTheme();
  const mapRef = useRef(null);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [selectedJourney, setSelectedJourney] = useState(null);
  const [showJourneyRoutes, setShowJourneyRoutes] = useState(false);
  const [activeEra, setActiveEra] = useState('all');
  const [bookmarkedLocations, setBookmarkedLocations] = useState([]);
  const [animatedRouteIndex, setAnimatedRouteIndex] = useState(0);
  const routeAnimation = useRef(new Animated.Value(0)).current;

  // Biblical Locations Data
  const biblicalLocations = [
    {
      id: 'jerusalem',
      name: 'Jerusalem',
      coordinate: { latitude: 31.7683, longitude: 35.2137 },
      era: ['ot', 'nt'],
      type: 'city',
      icon: 'location-city',
      description: 'The Holy City - Center of Jewish worship and site of the Temple',
      significance: 'Capital of ancient Israel, location of Solomon\'s Temple, site of Jesus\' crucifixion and resurrection',
      characters: ['David', 'Solomon', 'Jesus', 'Paul'],
      verses: ['2 Chronicles 6:6', 'Matthew 21:10', 'Acts 1:8'],
      events: [
        'David conquers the city',
        'Solomon builds the Temple', 
        'Jesus\' triumphal entry',
        'Crucifixion and Resurrection',
        'Pentecost'
      ]
    },
    {
      id: 'bethlehem',
      name: 'Bethlehem',
      coordinate: { latitude: 31.7054, longitude: 35.2024 },
      era: ['ot', 'nt'],
      type: 'city',
      icon: 'star',
      description: 'City of David - Birthplace of King David and Jesus Christ',
      significance: 'Birthplace of David and Jesus, fulfillment of Messianic prophecy',
      characters: ['Ruth', 'David', 'Jesus', 'Mary', 'Joseph'],
      verses: ['Ruth 1:19', 'Micah 5:2', 'Matthew 2:1', 'Luke 2:4'],
      events: [
        'Ruth and Naomi arrive',
        'David born and anointed',
        'Jesus born',
        'Visit of the Magi'
      ]
    },
    {
      id: 'nazareth',
      name: 'Nazareth',
      coordinate: { latitude: 32.7009, longitude: 35.2035 },
      era: ['nt'],
      type: 'city',
      icon: 'home',
      description: 'Jesus\' hometown in Galilee where He grew up',
      significance: 'Where Jesus was raised, site of the Annunciation',
      characters: ['Jesus', 'Mary', 'Joseph'],
      verses: ['Matthew 2:23', 'Luke 1:26', 'Luke 4:16'],
      events: [
        'Annunciation to Mary',
        'Jesus grows up',
        'Jesus rejected in hometown'
      ]
    },
    {
      id: 'capernaum',
      name: 'Capernaum',
      coordinate: { latitude: 32.8809, longitude: 35.5731 },
      era: ['nt'],
      type: 'city',
      icon: 'waves',
      description: 'Jesus\' ministry headquarters by the Sea of Galilee',
      significance: 'Center of Jesus\' Galilean ministry, many miracles performed here',
      characters: ['Jesus', 'Peter', 'Matthew'],
      verses: ['Matthew 4:13', 'Matthew 9:1', 'Mark 2:1'],
      events: [
        'Jesus calls disciples',
        'Healing of centurion\'s servant',
        'Many miracles and teachings'
      ]
    },
    {
      id: 'mount-sinai',
      name: 'Mount Sinai',
      coordinate: { latitude: 28.5392, longitude: 33.9734 },
      era: ['ot'],
      type: 'mountain',
      icon: 'terrain',
      description: 'Sacred mountain where Moses received the Ten Commandments',
      significance: 'Location of the giving of the Law, God\'s covenant with Israel',
      characters: ['Moses', 'Aaron'],
      verses: ['Exodus 19:20', 'Exodus 20:1', 'Deuteronomy 5:4'],
      events: [
        'Moses receives Ten Commandments',
        'God appears in fire and smoke',
        'Covenant established'
      ]
    },
    {
      id: 'babylon',
      name: 'Babylon',
      coordinate: { latitude: 32.5355, longitude: 44.4275 },
      era: ['ot'],
      type: 'city',
      icon: 'account-balance',
      description: 'Ancient city where Israelites were exiled',
      significance: 'Site of Jewish exile, Daniel\'s ministry, prophetic significance',
      characters: ['Daniel', 'Shadrach', 'Meshach', 'Abednego', 'Ezekiel'],
      verses: ['2 Kings 25:11', 'Daniel 1:1', 'Psalm 137:1'],
      events: [
        'Jewish exile begins',
        'Daniel interprets dreams',
        'Fiery furnace miracle'
      ]
    },
    {
      id: 'damascus',
      name: 'Damascus',
      coordinate: { latitude: 33.5138, longitude: 36.2765 },
      era: ['ot', 'nt'],
      type: 'city',
      icon: 'flash-on',
      description: 'Ancient city where Paul was converted',
      significance: 'Site of Paul\'s dramatic conversion on the road',
      characters: ['Paul', 'Ananias'],
      verses: ['Acts 9:3', 'Acts 22:6', '2 Corinthians 11:32'],
      events: [
        'Paul\'s conversion',
        'Ananias heals Paul\'s blindness',
        'Paul escapes in basket'
      ]
    },
    {
      id: 'rome',
      name: 'Rome',
      coordinate: { latitude: 41.9028, longitude: 12.4964 },
      era: ['nt'],
      type: 'city',
      icon: 'account-balance',
      description: 'Capital of the Roman Empire, Paul\'s final destination',
      significance: 'Center of the Roman world, Paul\'s imprisonment and ministry',
      characters: ['Paul'],
      verses: ['Acts 28:16', 'Romans 1:7', 'Romans 1:15'],
      events: [
        'Paul arrives as prisoner',
        'Paul preaches under house arrest',
        'Letter to Romans written'
      ]
    }
  ];

  // Biblical Journey Routes
  const biblicalJourneys = [
    {
      id: 'exodus',
      name: 'The Exodus',
      description: 'Israel\'s journey from Egypt to the Promised Land',
      era: 'ot',
      character: 'Moses',
      color: theme.primary,
      coordinates: [
        { latitude: 30.0444, longitude: 31.2357 }, // Egypt
        { latitude: 29.3759, longitude: 32.8990 }, // Crossing point
        { latitude: 28.5392, longitude: 33.9734 }, // Mount Sinai
        { latitude: 30.3285, longitude: 35.4444 }, // Kadesh Barnea
        { latitude: 31.7683, longitude: 35.2137 }, // Jerusalem area
      ],
      verses: ['Exodus 12:37', 'Exodus 19:1', 'Numbers 20:1'],
      duration: '40 years',
      distance: '~400 miles'
    },
    {
      id: 'paul-first-journey',
      name: 'Paul\'s First Missionary Journey',
      description: 'Paul and Barnabas spread the Gospel across Asia Minor',
      era: 'nt',
      character: 'Paul',
      color: theme.success,
      coordinates: [
        { latitude: 36.1612, longitude: 36.2044 }, // Antioch
        { latitude: 35.1264, longitude: 33.4299 }, // Cyprus
        { latitude: 36.7201, longitude: 30.5234 }, // Perga
        { latitude: 38.7312, longitude: 30.5569 }, // Antioch of Pisidia
        { latitude: 37.8746, longitude: 32.4932 }, // Iconium
        { latitude: 37.6411, longitude: 32.1853 }, // Lystra
        { latitude: 37.7765, longitude: 32.6204 }, // Derbe
        { latitude: 36.1612, longitude: 36.2044 }, // Return to Antioch
      ],
      verses: ['Acts 13:4', 'Acts 13:14', 'Acts 14:6'],
      duration: '~2 years',
      distance: '~1,400 miles'
    },
    {
      id: 'jesus-ministry',
      name: 'Jesus\' Ministry in Galilee',
      description: 'Jesus\' travels throughout Galilee during His ministry',
      era: 'nt',
      character: 'Jesus',
      color: theme.warning,
      coordinates: [
        { latitude: 32.7009, longitude: 35.2035 }, // Nazareth
        { latitude: 32.8809, longitude: 35.5731 }, // Capernaum
        { latitude: 32.8154, longitude: 35.5185 }, // Sea of Galilee
        { latitude: 33.2774, longitude: 35.5951 }, // Caesarea Philippi
        { latitude: 32.4427, longitude: 35.3956 }, // Mount Tabor
        { latitude: 31.7683, longitude: 35.2137 }, // Jerusalem
      ],
      verses: ['Matthew 4:23', 'Mark 1:39', 'Luke 8:1'],
      duration: '~3 years',
      distance: '~300 miles'
    }
  ];

  // Era filters
  const eras = [
    { id: 'all', name: 'All Eras', icon: 'history' },
    { id: 'ot', name: 'Old Testament', icon: 'menu-book' },
    { id: 'nt', name: 'New Testament', icon: 'auto-stories' },
  ];

  // Get filtered locations based on active era
  const getFilteredLocations = () => {
    if (activeEra === 'all') return biblicalLocations;
    return biblicalLocations.filter(location => location.era.includes(activeEra));
  };

  // Get filtered journeys based on active era
  const getFilteredJourneys = () => {
    if (activeEra === 'all') return biblicalJourneys;
    return biblicalJourneys.filter(journey => journey.era === activeEra);
  };

  // Handle location marker press
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

  // Handle journey selection
  const handleJourneyPress = (journey) => {
    hapticFeedback.light();
    setSelectedJourney(journey);
    setShowJourneyRoutes(true);
    
    // Animate route drawing
    animateRoute(journey);
    
    // Fit map to journey coordinates
    if (mapRef.current && journey.coordinates.length > 0) {
      mapRef.current.fitToCoordinates(journey.coordinates, {
        edgePadding: { top: 100, right: 100, bottom: 100, left: 100 },
        animated: true,
      });
    }
  };

  // Animate route drawing
  const animateRoute = (journey) => {
    routeAnimation.setValue(0);
    setAnimatedRouteIndex(0);
    
    Animated.timing(routeAnimation, {
      toValue: journey.coordinates.length - 1,
      duration: 3000,
      useNativeDriver: false,
    }).start();
    
    // Update route index for animated drawing
    const listener = routeAnimation.addListener(({ value }) => {
      setAnimatedRouteIndex(Math.floor(value));
    });
    
    return () => routeAnimation.removeListener(listener);
  };

  // Toggle bookmark
  const toggleBookmark = (locationId) => {
    hapticFeedback.light();
    setBookmarkedLocations(prev => 
      prev.includes(locationId) 
        ? prev.filter(id => id !== locationId)
        : [...prev, locationId]
    );
  };

  // Get marker color based on era and type
  const getMarkerColor = (location) => {
    if (location.era.includes('nt')) return theme.primary;
    if (location.era.includes('ot')) return theme.success;
    return theme.info;
  };

  // Initial map region (centered on Holy Land)
  const initialRegion = {
    latitude: 31.5,
    longitude: 35.0,
    latitudeDelta: 8.0,
    longitudeDelta: 8.0,
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
            mapType="standard"
            loadingEnabled={true}
            loadingIndicatorColor={theme.primary}
            loadingBackgroundColor={theme.background}
          >
            {/* Location Markers */}
            {getFilteredLocations().map((location) => (
              <Marker
                key={location.id}
                coordinate={location.coordinate}
                title={location.name}
                description={location.description}
                pinColor={getMarkerColor(location)}
                onPress={() => handleLocationPress(location)}
              >
                <View style={[
                  styles.customMarker,
                  { backgroundColor: getMarkerColor(location) }
                ]}>
                  <MaterialIcons 
                    name={location.icon} 
                    size={20} 
                    color="#FFFFFF" 
                  />
                </View>
              </Marker>
            ))}

            {/* Journey Routes */}
            {showJourneyRoutes && selectedJourney && (
              <Polyline
                coordinates={selectedJourney.coordinates.slice(0, animatedRouteIndex + 1)}
                strokeColor={selectedJourney.color}
                strokeWidth={4}
                lineDashPattern={[10, 5]}
              />
            )}
          </MapView>
        </View>

        {/* Overlay Content with SafeAreaView */}
        <SafeAreaView style={styles.overlayContainer}>
        {/* Header with Blur Background */}
        <BlurView intensity={80} style={[styles.headerBlur, { borderBottomColor: `${theme.border}30` }]}>
          <View style={styles.headerContent}>
            <TouchableOpacity
              style={[styles.closeButton, { backgroundColor: `${theme.primary}20` }]}
              onPress={onClose}
              activeOpacity={0.7}
            >
              <MaterialIcons name="close" size={24} color={theme.primary} />
            </TouchableOpacity>
            
            <Text style={[styles.headerTitle, { color: theme.text, textShadowColor: 'rgba(0,0,0,0.3)', textShadowOffset: {width: 0, height: 1}, textShadowRadius: 2 }]}>
              Interactive Bible Maps
            </Text>
            
            <TouchableOpacity
              style={[styles.bookmarkButton, { backgroundColor: `${theme.warning}20` }]}
              onPress={() => Alert.alert('Bookmarks', `${bookmarkedLocations.length} locations saved`)}
              activeOpacity={0.7}
            >
              <MaterialIcons name="bookmark" size={24} color={theme.warning} />
            </TouchableOpacity>
          </View>
        </BlurView>

        {/* Era Filter Tabs with Blur Background */}
        <BlurView intensity={60} style={styles.eraFiltersBlur}>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            style={styles.eraFilters}
            contentContainerStyle={styles.eraFiltersContent}
          >
            {eras.map((era) => (
              <TouchableOpacity
                key={era.id}
                style={[
                  styles.eraTab,
                  { 
                    backgroundColor: activeEra === era.id ? theme.primary : `${theme.card}90`,
                    borderColor: activeEra === era.id ? theme.primary : `${theme.border}50`,
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.2,
                    shadowRadius: 4,
                    elevation: 3,
                  }
                ]}
                onPress={() => {
                  hapticFeedback.light();
                  setActiveEra(era.id);
                  setSelectedJourney(null);
                  setShowJourneyRoutes(false);
                }}
                activeOpacity={0.7}
              >
                <MaterialIcons 
                  name={era.icon} 
                  size={18} 
                  color={activeEra === era.id ? '#FFFFFF' : theme.text} 
                />
                <Text style={[
                  styles.eraTabText,
                  { 
                    color: activeEra === era.id ? '#FFFFFF' : theme.text,
                    textShadowColor: activeEra === era.id ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.8)',
                    textShadowOffset: {width: 0, height: 1},
                    textShadowRadius: 1
                  }
                ]}>
                  {era.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </BlurView>

        {/* Journey Controls with Enhanced Readability */}
        <BlurView intensity={80} style={[styles.journeyControlsBlur]}>
          <View style={styles.journeyControlsContent}>
            <Text style={[styles.journeyTitle, { 
              color: theme.text,
              textShadowColor: 'rgba(0,0,0,0.3)',
              textShadowOffset: {width: 0, height: 1},
              textShadowRadius: 2
            }]}>
              Biblical Journeys
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {getFilteredJourneys().map((journey) => (
                <TouchableOpacity
                  key={journey.id}
                  style={[
                    styles.journeyButton,
                    { 
                      backgroundColor: selectedJourney?.id === journey.id ? journey.color : `${theme.card}90`,
                      borderColor: selectedJourney?.id === journey.id ? journey.color : `${journey.color}60`,
                      shadowColor: '#000',
                      shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: 0.2,
                      shadowRadius: 4,
                      elevation: 3,
                    }
                  ]}
                  onPress={() => handleJourneyPress(journey)}
                  activeOpacity={0.7}
                >
                  <Text style={[
                    styles.journeyButtonText,
                    { 
                      color: selectedJourney?.id === journey.id ? '#FFFFFF' : theme.text,
                      textShadowColor: selectedJourney?.id === journey.id ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.8)',
                      textShadowOffset: {width: 0, height: 1},
                      textShadowRadius: 1
                    }
                  ]}>
                    {journey.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </BlurView>
        </SafeAreaView>
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
                <TouchableOpacity
                  style={[styles.detailCloseButton, { backgroundColor: `${theme.primary}15` }]}
                  onPress={() => setSelectedLocation(null)}
                  activeOpacity={0.7}
                >
                  <MaterialIcons name="close" size={20} color={theme.primary} />
                </TouchableOpacity>
                
                <Text style={[styles.detailTitle, { color: theme.text }]}>
                  {selectedLocation.name}
                </Text>
                
                <TouchableOpacity
                  style={[
                    styles.bookmarkIconButton,
                    { backgroundColor: bookmarkedLocations.includes(selectedLocation.id) ? `${theme.warning}20` : `${theme.warning}10` }
                  ]}
                  onPress={() => toggleBookmark(selectedLocation.id)}
                  activeOpacity={0.7}
                >
                  <MaterialIcons 
                    name={bookmarkedLocations.includes(selectedLocation.id) ? "bookmark" : "bookmark-border"} 
                    size={20} 
                    color={theme.warning} 
                  />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.detailContent} showsVerticalScrollIndicator={false}>
                {/* Description */}
                <View style={[styles.detailSection, { backgroundColor: theme.card }]}>
                  <Text style={[styles.sectionTitle, { color: theme.text }]}>Description</Text>
                  <Text style={[styles.sectionText, { color: theme.textSecondary }]}>
                    {selectedLocation.description}
                  </Text>
                </View>

                {/* Significance */}
                <View style={[styles.detailSection, { backgroundColor: theme.card }]}>
                  <Text style={[styles.sectionTitle, { color: theme.text }]}>Biblical Significance</Text>
                  <Text style={[styles.sectionText, { color: theme.textSecondary }]}>
                    {selectedLocation.significance}
                  </Text>
                </View>

                {/* Key Characters */}
                <View style={[styles.detailSection, { backgroundColor: theme.card }]}>
                  <Text style={[styles.sectionTitle, { color: theme.text }]}>Key Biblical Figures</Text>
                  <View style={styles.charactersContainer}>
                    {selectedLocation.characters.map((character, index) => (
                      <View key={index} style={[styles.characterChip, { backgroundColor: `${theme.primary}15` }]}>
                        <Text style={[styles.characterText, { color: theme.primary }]}>
                          {character}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>

                {/* Key Events */}
                <View style={[styles.detailSection, { backgroundColor: theme.card }]}>
                  <Text style={[styles.sectionTitle, { color: theme.text }]}>Major Events</Text>
                  {selectedLocation.events.map((event, index) => (
                    <View key={index} style={styles.eventItem}>
                      <MaterialIcons name="radio-button-checked" size={16} color={theme.primary} />
                      <Text style={[styles.eventText, { color: theme.textSecondary }]}>
                        {event}
                      </Text>
                    </View>
                  ))}
                </View>

                {/* Bible Verses */}
                <View style={[styles.detailSection, { backgroundColor: theme.card }]}>
                  <Text style={[styles.sectionTitle, { color: theme.text }]}>Related Verses</Text>
                  <View style={styles.versesContainer}>
                    {selectedLocation.verses.map((verse, index) => (
                      <TouchableOpacity 
                        key={index} 
                        style={[styles.verseChip, { backgroundColor: `${theme.success}15`, borderColor: theme.success }]}
                        activeOpacity={0.7}
                      >
                        <MaterialIcons name="menu-book" size={14} color={theme.success} />
                        <Text style={[styles.verseText, { color: theme.success }]}>
                          {verse}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </ScrollView>
            </SafeAreaView>
          </Modal>
        )}
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  fullScreenContainer: {
    flex: 1,
    position: 'relative',
  },
  overlayContainer: {
    flex: 1,
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'transparent',
    zIndex: 1, // Above the map
    pointerEvents: 'box-none', // Allow touches to pass through to map
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
  },
  headerBlur: {
    borderBottomWidth: 1,
    paddingTop: 10,
    borderRadius: 20,
    overflow: 'hidden',
    marginHorizontal: 15,
    marginTop: 10,
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
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'System',
  },
  bookmarkButton: {
    width: 40,
    height: 40,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  eraFilters: {
    maxHeight: 60,
  },
  eraFiltersContent: {
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  eraFiltersBlur: {
    paddingVertical: 5,
    marginHorizontal: 15,
    marginTop: 10,
    borderRadius: 20,
    overflow: 'hidden',
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
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 6,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'System',
  },
  mapContainer: {
    flex: 1,
    position: 'relative',
  },
  map: {
    flex: 1,
    width: '100%',
    height: '100%',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  fullScreenMapContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 0, // Behind overlay content
  },
  fullScreenMap: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
  },
  customMarker: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  journeyControls: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 40 : 20, // Account for iOS home indicator
    left: 20,
    right: 20,
    borderRadius: 15,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 1000, // Ensure it's above the map
  },
  journeyControlsBlur: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 40 : 20,
    left: 20,
    right: 20,
    borderRadius: 15,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 10,
  },
  journeyControlsContent: {
    padding: 15,
  },
  journeyTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 10,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'System',
  },
  journeyButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 25,
    marginRight: 10,
    borderWidth: 1,
  },
  journeyButtonText: {
    fontSize: 14,
    fontWeight: '500',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'System',
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
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailTitle: {
    fontSize: 20,
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'System',
  },
  bookmarkIconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailContent: {
    flex: 1,
    padding: 20,
  },
  detailSection: {
    borderRadius: 15,
    padding: 20,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 10,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'System',
  },
  sectionText: {
    fontSize: 16,
    lineHeight: 24,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'System',
  },
  charactersContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  characterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
  },
  characterText: {
    fontSize: 14,
    fontWeight: '500',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'System',
  },
  eventItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  eventText: {
    fontSize: 15,
    marginLeft: 10,
    flex: 1,
    lineHeight: 22,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'System',
  },
  versesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  verseChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 15,
    borderWidth: 1,
  },
  verseText: {
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 6,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'System',
  },
});

export default InteractiveBibleMaps;

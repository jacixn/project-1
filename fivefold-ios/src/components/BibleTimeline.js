import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
  Dimensions,
} from 'react-native';
import { PanGestureHandler, GestureHandlerRootView } from 'react-native-gesture-handler';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useTheme } from '../contexts/ThemeContext';
import { hapticFeedback } from '../utils/haptics';

const { width, height } = Dimensions.get('window');

const BibleTimeline = ({ visible, onClose, onNavigateToVerse }) => {
  const { theme, isDark } = useTheme();
  const [selectedEra, setSelectedEra] = useState(null);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [timelinePosition, setTimelinePosition] = useState(0);
  const [showEventDetail, setShowEventDetail] = useState(false);
  const scrollY = useRef(new Animated.Value(0)).current;
  const timelineScrollRef = useRef(null);

  // Stunning Timeline Eras - Each one is a visual journey!
  const timelineEras = [
    {
      id: 'creation',
      title: '🌍 THE BEGINNING',
      subtitle: 'God Creates Everything',
      period: '? - 2000 BC',
      color: '#E91E63',
      gradient: ['#FF6B9D', '#E91E63', '#AD1457'],
      icon: '🌱',
      bgEmoji: '🌟',
      description: 'In the beginning, God spoke and BOOM! The universe exploded into existence! Stars, planets, animals, and humans - all created with just His voice. But then came the forbidden fruit...',
      events: ['creation', 'fall', 'cain_abel', 'noah_flood', 'tower_babel']
    },
    {
      id: 'patriarchs',
      title: '⭐ CHOSEN FAMILY',
      subtitle: 'Abraham\'s Adventure',
      period: '2000 - 1600 BC',
      color: '#FF9800',
      gradient: ['#FFB74D', '#FF9800', '#F57C00'],
      icon: '🏃‍♂️',
      bgEmoji: '✨',
      description: 'God tells Abraham "Pack your bags, we\'re going on an adventure!" At 75 years old, Abraham becomes the ultimate road tripper, following God to a new land and starting the most important family in history!',
      events: ['abraham_call', 'isaac_birth', 'jacob_ladder', 'joseph_egypt']
    },
    {
      id: 'exodus',
      title: '🔥 THE GREAT ESCAPE',
      subtitle: 'Freedom from Slavery',
      period: '1600 - 1400 BC',
      color: '#F44336',
      gradient: ['#FF6B6B', '#F44336', '#D32F2F'],
      icon: '⚡',
      bgEmoji: '🌊',
      description: 'Moses vs Pharaoh in the ultimate showdown! Plagues, miracles, and the most epic escape scene ever - the Red Sea literally splits in half! Plus 40 years of desert survival training.',
      events: ['burning_bush', 'ten_plagues', 'red_sea', 'ten_commandments', 'golden_calf']
    },
    {
      id: 'conquest',
      title: '⚔️ EPIC BATTLES',
      subtitle: 'Heroes & Legends',
      period: '1400 - 1000 BC',
      color: '#4CAF50',
      gradient: ['#66BB6A', '#4CAF50', '#388E3C'],
      icon: '🏆',
      bgEmoji: '⚔️',
      description: 'Time for the most epic battles ever! Walls fall down from shouting, the sun stops moving, 300 warriors defeat thousands, and a guy kills a lion with his bare hands. This is superhero-level stuff!',
      events: ['jericho', 'sun_stands_still', 'gideon_300', 'samson_strength', 'ruth_love']
    },
    {
      id: 'kingdom',
      title: '👑 KINGS & GLORY',
      subtitle: 'Golden Age Power',
      period: '1000 - 586 BC',
      color: '#2196F3',
      gradient: ['#42A5F5', '#2196F3', '#1976D2'],
      icon: '💎',
      bgEmoji: '🏰',
      description: 'David slays Goliath and becomes king! Solomon gets unlimited wisdom and builds a temple covered in GOLD. But then things get messy with evil kings and amazing prophets calling down fire from heaven!',
      events: ['david_goliath', 'solomon_temple', 'elijah_fire', 'divided_kingdom']
    },
    {
      id: 'jesus',
      title: '✝️ THE MESSIAH',
      subtitle: 'God Becomes Human',
      period: '4 BC - 30 AD',
      color: '#9C27B0',
      gradient: ['#BA68C8', '#9C27B0', '#7B1FA2'],
      icon: '👑',
      bgEmoji: '✨',
      description: 'The moment everyone was waiting for! God becomes a human baby, grows up, performs mind-blowing miracles, teaches with epic stories, dies for our sins, and RISES FROM THE DEAD! Game changer!',
      events: ['jesus_birth', 'jesus_baptism', 'feeding_5000', 'walking_water', 'crucifixion', 'resurrection']
    }
  ];

  // Epic Bible Events with teenage-friendly descriptions
  const epicEvents = {
    creation: {
      title: '🌍 GOD CREATES EVERYTHING',
      date: '? BC',
      summary: 'Day 1: "Let there be light!" BOOM! Day 6: Humans! God looks at everything and says "This is AWESOME!"',
      verses: ['Genesis 1:1', 'Genesis 1:31'],
      funFact: 'God created light before the sun - that\'s some serious power! 💡'
    },
    fall: {
      title: '🍎 THE FORBIDDEN FRUIT',
      date: '? BC',
      summary: 'One rule: Don\'t eat THAT fruit. Guess what happens? Yep, they eat it. Sin enters the world, but God promises a Savior!',
      verses: ['Genesis 3:6', 'Genesis 3:15'],
      funFact: 'The Bible never says it was an apple - could have been any fruit! 🤔'
    },
    noah_flood: {
      title: '🚢 NOAH\'S EPIC ARK',
      date: '? BC',
      summary: 'God tells Noah to build a MASSIVE boat. People laugh... until it starts raining for 40 days straight!',
      verses: ['Genesis 7:17', 'Genesis 8:20'],
      funFact: 'The ark was 1.5 football fields long and housed 2+ of every animal! 🦁🐘🦒'
    },
    abraham_call: {
      title: '🗺️ ABRAHAM\'S ROAD TRIP',
      date: '2000 BC',
      summary: 'God: "Abraham, pack up and follow Me!" Abraham: "Where?" God: "I\'ll tell you when we get there!" Ultimate trust fall!',
      verses: ['Genesis 12:1', 'Genesis 12:4'],
      funFact: 'Abraham was 75 when he started this adventure - never too old to follow God! 🏃‍♂️'
    },
    red_sea: {
      title: '🌊 RED SEA SPLITS IN HALF',
      date: '1446 BC',
      summary: 'Moses raises his staff and the sea SPLITS! 2 million people walk through on dry ground with walls of water on both sides!',
      verses: ['Exodus 14:21', 'Exodus 14:29'],
      funFact: 'The water walls were probably 300+ feet tall - like walking between skyscrapers! 🏢'
    },
    jericho: {
      title: '🎺 WALLS FALL FROM SHOUTING',
      date: '1406 BC',
      summary: 'March around the city, blow trumpets, SHOUT... and the massive walls collapse! No siege weapons needed!',
      verses: ['Joshua 6:20', 'Joshua 6:27'],
      funFact: 'They marched 13 times total - imagine the workout! 🚶‍♂️💪'
    },
    david_goliath: {
      title: '🎯 TEEN DEFEATS GIANT',
      date: '1025 BC',
      summary: 'Teenage shepherd boy David faces 9-foot giant Goliath. One stone, one shot, GIANT DOWN! Ultimate underdog victory!',
      verses: ['1 Samuel 17:49-50'],
      funFact: 'Goliath\'s spear tip alone weighed 15 pounds - heavier than a bowling ball! 🎳'
    },
    jesus_birth: {
      title: '👶 GOD BECOMES A BABY',
      date: '4 BC',
      summary: 'The Creator of the universe becomes a helpless baby! Angels announce it, shepherds visit, wise men bring gifts!',
      verses: ['Luke 2:7', 'Matthew 2:11'],
      funFact: 'Jesus was probably born in a cave, not a wooden stable! 🕳️'
    },
    feeding_5000: {
      title: '🍞 ULTIMATE FOOD HACK',
      date: '29 AD',
      summary: 'Boy brings 5 loaves + 2 fish. Jesus feeds 5,000 people with 12 baskets LEFT OVER! Best meal multiplication ever!',
      verses: ['John 6:11-13'],
      funFact: 'They ended up with MORE food than they started with! 🤯'
    },
    resurrection: {
      title: '💥 JESUS DEFEATS DEATH',
      date: '30 AD',
      summary: 'Jesus dies on Friday, buried in tomb with 4,000-pound stone. Sunday morning: EMPTY TOMB! Death = defeated!',
      verses: ['Matthew 28:6', 'Luke 24:6'],
      funFact: 'The Roman guards were so scared they became "like dead men"! ⚰️'
    }
  };

  const handleEraPress = (era) => {
    hapticFeedback.medium();
    setSelectedEra(era);
    setSelectedEvent(null);
    setShowEventDetail(false);
    
    // Animate to era
    Animated.spring(scrollY, {
      toValue: 1,
      useNativeDriver: true,
      tension: 100,
      friction: 8,
    }).start();
  };

  const handleEventPress = (eventId) => {
    hapticFeedback.light();
    setSelectedEvent(epicEvents[eventId]);
    setShowEventDetail(true);
  };

  const closeEventDetail = () => {
    hapticFeedback.light();
    setShowEventDetail(false);
    setSelectedEvent(null);
  };

  const renderTimelineRail = () => (
    <View style={styles.timelineRailContainer}>
      <ScrollView 
        ref={timelineScrollRef}
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.timelineRailContent}
        decelerationRate="fast"
        snapToInterval={120}
        snapToAlignment="center"
      >
        {timelineEras.map((era, index) => (
          <TouchableOpacity
            key={era.id}
            style={styles.eraNodeContainer}
            onPress={() => handleEraPress(era)}
            activeOpacity={0.8}
          >
            <Animated.View
              style={[
                styles.eraNode,
                {
                  transform: [
                    {
                      scale: selectedEra?.id === era.id 
                        ? scrollY.interpolate({
                            inputRange: [0, 1],
                            outputRange: [1, 1.2],
                          })
                        : 1
                    }
                  ]
                }
              ]}
            >
              <LinearGradient
                colors={era.gradient}
                style={styles.eraNodeGradient}
              >
                <Text style={styles.eraNodeIcon}>{era.icon}</Text>
                <Text style={styles.eraNodeBg}>{era.bgEmoji}</Text>
              </LinearGradient>
            </Animated.View>
            <Text style={[styles.eraNodeTitle, { color: theme.text }]}>
              {era.title}
            </Text>
            <Text style={[styles.eraNodePeriod, { color: theme.textSecondary }]}>
              {era.period}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
      
      {/* Connecting Line */}
      <View style={[styles.timelineConnector, { backgroundColor: theme.border }]} />
    </View>
  );

  const renderSelectedEra = () => {
    if (!selectedEra) return null;

    return (
      <Animated.View
        style={[
          styles.selectedEraContainer,
          {
            opacity: scrollY.interpolate({
              inputRange: [0, 1],
              outputRange: [0, 1],
            }),
            transform: [
              {
                translateY: scrollY.interpolate({
                  inputRange: [0, 1],
                  outputRange: [50, 0],
                })
              }
            ]
          }
        ]}
      >
        <BlurView intensity={20} style={styles.selectedEraCard}>
          <LinearGradient
            colors={[`${selectedEra.color}20`, `${selectedEra.color}10`, 'transparent']}
            style={styles.selectedEraGradient}
          >
            {/* Era Header */}
            <View style={styles.selectedEraHeader}>
              <View style={[styles.selectedEraIconContainer, { backgroundColor: `${selectedEra.color}30` }]}>
                <Text style={styles.selectedEraIcon}>{selectedEra.icon}</Text>
                <Text style={styles.selectedEraBgEmoji}>{selectedEra.bgEmoji}</Text>
              </View>
              <View style={styles.selectedEraTitleContainer}>
                <Text style={[styles.selectedEraTitle, { color: theme.text }]}>
                  {selectedEra.title}
                </Text>
                <Text style={[styles.selectedEraSubtitle, { color: selectedEra.color }]}>
                  {selectedEra.subtitle}
                </Text>
                <Text style={[styles.selectedEraPeriod, { color: theme.textSecondary }]}>
                  {selectedEra.period}
                </Text>
              </View>
            </View>

            {/* Era Description */}
            <Text style={[styles.selectedEraDescription, { color: theme.text }]}>
              {selectedEra.description}
            </Text>

            {/* Events in Era - Interactive Bubbles */}
            <View style={styles.eventsSection}>
              <Text style={[styles.eventsSectionTitle, { color: selectedEra.color }]}>
                🎬 EPIC EVENTS
              </Text>
              <View style={styles.eventBubblesContainer}>
                {selectedEra.events.map((eventId, index) => {
                  const event = epicEvents[eventId];
                  if (!event) return null;
                  
                  return (
                    <TouchableOpacity
                      key={eventId}
                      style={[styles.eventBubble, { backgroundColor: `${selectedEra.color}15`, borderColor: `${selectedEra.color}40` }]}
                      onPress={() => handleEventPress(eventId)}
                      activeOpacity={0.7}
                    >
                      <LinearGradient
                        colors={[`${selectedEra.color}20`, `${selectedEra.color}10`]}
                        style={styles.eventBubbleGradient}
                      >
                        <Text style={[styles.eventBubbleTitle, { color: theme.text }]}>
                          {event.title}
                        </Text>
                        <Text style={[styles.eventBubbleDate, { color: selectedEra.color }]}>
                          {event.date}
                        </Text>
                      </LinearGradient>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </LinearGradient>
        </BlurView>
      </Animated.View>
    );
  };

  const renderEventDetail = () => {
    if (!selectedEvent || !showEventDetail) return null;

    return (
      <Animated.View style={styles.eventDetailOverlay}>
        <BlurView intensity={30} style={styles.eventDetailBlur}>
          <TouchableOpacity 
            style={styles.eventDetailBackdrop}
            onPress={closeEventDetail}
            activeOpacity={1}
          >
            <View style={[styles.eventDetailCard, { backgroundColor: theme.card }]}>
              <LinearGradient
                colors={[`${selectedEra?.color}20`, `${selectedEra?.color}10`, 'transparent']}
                style={styles.eventDetailGradient}
              >
                {/* Close Button */}
                <TouchableOpacity 
                  style={styles.eventDetailClose}
                  onPress={closeEventDetail}
                >
                  <View style={[styles.closeButtonCircle, { backgroundColor: `${selectedEra?.color}20` }]}>
                    <MaterialIcons name="close" size={20} color={selectedEra?.color} />
                  </View>
                </TouchableOpacity>

                {/* Event Content */}
                <Text style={[styles.eventDetailTitle, { color: theme.text }]}>
                  {selectedEvent.title}
                </Text>
                
                <View style={[styles.eventDetailDateBadge, { backgroundColor: `${selectedEra?.color}20` }]}>
                  <Text style={[styles.eventDetailDate, { color: selectedEra?.color }]}>
                    {selectedEvent.date}
                  </Text>
                </View>

                <Text style={[styles.eventDetailSummary, { color: theme.text }]}>
                  {selectedEvent.summary}
                </Text>

                <View style={styles.eventDetailFunFact}>
                  <Text style={[styles.funFactText, { color: selectedEra?.color }]}>
                    🤯 {selectedEvent.funFact}
                  </Text>
                </View>

                {/* Verses */}
                <View style={styles.eventDetailVerses}>
                  <Text style={[styles.versesTitle, { color: theme.text }]}>
                    📖 Read the Full Story:
                  </Text>
                  <View style={styles.versesGrid}>
                    {selectedEvent.verses.map((verse, index) => (
                      <TouchableOpacity
                        key={index}
                        style={[styles.verseButton, { backgroundColor: `${selectedEra?.color}15`, borderColor: `${selectedEra?.color}40` }]}
                        onPress={() => {
                          hapticFeedback.light();
                          if (onNavigateToVerse) onNavigateToVerse(verse);
                          closeEventDetail();
                        }}
                        activeOpacity={0.7}
                      >
                        <MaterialIcons name="auto-stories" size={16} color={selectedEra?.color} />
                        <Text style={[styles.verseButtonText, { color: selectedEra?.color }]}>
                          {verse}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </LinearGradient>
            </View>
          </TouchableOpacity>
        </BlurView>
      </Animated.View>
    );
  };

  return (
    <GestureHandlerRootView style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.background }]}>
        <TouchableOpacity onPress={onClose} style={styles.backButton}>
          <View style={[styles.backButtonCircle, { backgroundColor: theme.primary + '20' }]}>
            <MaterialIcons name="arrow-back" size={20} color={theme.primary} />
          </View>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>
          📅 Bible Timeline
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView 
        style={styles.content} 
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: false }
        )}
      >
        {/* Hero Section */}
        <LinearGradient
          colors={isDark ? ['#1a1a2e', '#16213e', '#0f3460'] : ['#667eea', '#764ba2', '#f093fb']}
          style={styles.heroSection}
        >
          <Text style={styles.heroTitle}>
            🌟 Journey Through Bible History
          </Text>
          <Text style={styles.heroSubtitle}>
            Explore 4,000+ years of epic adventures, miracles, and God's amazing plan!
          </Text>
          <View style={styles.heroStats}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>12</Text>
              <Text style={styles.statLabel}>Epic Eras</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>100+</Text>
              <Text style={styles.statLabel}>Amazing Events</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>∞</Text>
              <Text style={styles.statLabel}>Mind = Blown</Text>
            </View>
          </View>
        </LinearGradient>

        {/* Interactive Timeline Rail */}
        <View style={styles.timelineSection}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>
            🎯 Tap Any Era to Explore
          </Text>
          {renderTimelineRail()}
        </View>

        {/* Selected Era Details */}
        {renderSelectedEra()}

        {/* Coming Soon Features */}
        <View style={styles.comingSoonSection}>
          <BlurView intensity={20} style={styles.comingSoonCard}>
            <Text style={styles.comingSoonEmoji}>🚀</Text>
            <Text style={[styles.comingSoonTitle, { color: theme.text }]}>
              Even More Epic Features Coming!
            </Text>
            <Text style={[styles.comingSoonText, { color: theme.textSecondary }]}>
              Interactive maps, zoomable timelines, character connections, prophecy threads, and mind-blowing visualizations!
            </Text>
          </BlurView>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Event Detail Modal */}
      {renderEventDetail()}
    </GestureHandlerRootView>
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
    paddingTop: 15,
    paddingBottom: 15,
  },
  backButton: {
    padding: 4,
  },
  backButtonCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    flex: 1,
    textAlign: 'center',
  },
  content: {
    flex: 1,
  },
  
  // Hero Section
  heroSection: {
    paddingHorizontal: 20,
    paddingVertical: 40,
    alignItems: 'center',
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 12,
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  heroSubtitle: {
    fontSize: 16,
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 22,
    opacity: 0.9,
  },
  heroStats: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 20,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  statLabel: {
    fontSize: 12,
    color: '#FFFFFF',
    opacity: 0.8,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: 'rgba(255,255,255,0.3)',
    marginHorizontal: 20,
  },
  
  // Timeline Section
  timelineSection: {
    paddingVertical: 30,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 20,
  },
  timelineRailContainer: {
    position: 'relative',
    paddingVertical: 20,
  },
  timelineRailContent: {
    paddingHorizontal: 40,
    alignItems: 'center',
  },
  timelineConnector: {
    position: 'absolute',
    height: 4,
    left: 40,
    right: 40,
    top: 70,
    borderRadius: 2,
    opacity: 0.3,
  },
  eraNodeContainer: {
    alignItems: 'center',
    marginHorizontal: 20,
  },
  eraNode: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 12,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  eraNodeGradient: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  eraNodeIcon: {
    fontSize: 32,
    zIndex: 2,
  },
  eraNodeBg: {
    position: 'absolute',
    fontSize: 60,
    opacity: 0.2,
    zIndex: 1,
  },
  eraNodeTitle: {
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 4,
  },
  eraNodePeriod: {
    fontSize: 10,
    textAlign: 'center',
    fontWeight: '500',
  },
  
  // Selected Era
  selectedEraContainer: {
    paddingHorizontal: 20,
    marginBottom: 30,
  },
  selectedEraCard: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  selectedEraGradient: {
    padding: 24,
  },
  selectedEraHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  selectedEraIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 20,
    position: 'relative',
  },
  selectedEraIcon: {
    fontSize: 36,
    zIndex: 2,
  },
  selectedEraBgEmoji: {
    position: 'absolute',
    fontSize: 60,
    opacity: 0.3,
    zIndex: 1,
  },
  selectedEraTitleContainer: {
    flex: 1,
  },
  selectedEraTitle: {
    fontSize: 24,
    fontWeight: '900',
    marginBottom: 4,
  },
  selectedEraSubtitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  selectedEraPeriod: {
    fontSize: 14,
    fontWeight: '500',
  },
  selectedEraDescription: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 24,
  },
  
  // Events Section
  eventsSection: {
    marginTop: 10,
  },
  eventsSectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
  },
  eventBubblesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  eventBubble: {
    borderRadius: 16,
    borderWidth: 2,
    overflow: 'hidden',
    minWidth: 140,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  eventBubbleGradient: {
    padding: 12,
    alignItems: 'center',
  },
  eventBubbleTitle: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 4,
  },
  eventBubbleDate: {
    fontSize: 11,
    fontWeight: '500',
  },
  
  // Event Detail Modal
  eventDetailOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
  },
  eventDetailBlur: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  eventDetailBackdrop: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  eventDetailCard: {
    width: '100%',
    maxWidth: 350,
    borderRadius: 20,
    overflow: 'hidden',
    elevation: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
  },
  eventDetailGradient: {
    padding: 24,
  },
  eventDetailClose: {
    alignSelf: 'flex-end',
    marginBottom: 12,
  },
  closeButtonCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  eventDetailTitle: {
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 12,
  },
  eventDetailDateBadge: {
    alignSelf: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginBottom: 16,
  },
  eventDetailDate: {
    fontSize: 12,
    fontWeight: '600',
  },
  eventDetailSummary: {
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
    marginBottom: 16,
  },
  eventDetailFunFact: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    padding: 12,
    borderRadius: 12,
    marginBottom: 20,
  },
  funFactText: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 20,
  },
  eventDetailVerses: {
    marginTop: 8,
  },
  versesTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
    textAlign: 'center',
  },
  versesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
  },
  verseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
  },
  verseButtonText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 6,
  },
  
  // Coming Soon
  comingSoonSection: {
    paddingHorizontal: 20,
    paddingVertical: 30,
  },
  comingSoonCard: {
    padding: 24,
    borderRadius: 20,
    alignItems: 'center',
  },
  comingSoonEmoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  comingSoonTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 12,
    textAlign: 'center',
  },
  comingSoonText: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
});

export default BibleTimeline;
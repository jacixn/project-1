import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
  Dimensions,
  PanResponder,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useTheme } from '../contexts/ThemeContext';
import { hapticFeedback } from '../utils/haptics';

const { width, height } = Dimensions.get('window');

const BibleTimeline = ({ visible, onClose, onNavigateToVerse }) => {
  const { theme, isDark } = useTheme();
  const [selectedEra, setSelectedEra] = useState(null);
  const [panX] = useState(new Animated.Value(0));
  const [panY] = useState(new Animated.Value(0));
  const [scale] = useState(new Animated.Value(1));
  const [bubbleAnimations] = useState(
    Array.from({ length: 12 }, () => ({
      float: new Animated.Value(0),
      pulse: new Animated.Value(1),
      rotate: new Animated.Value(0),
    }))
  );

  // EPIC VISUAL MINDMAP DATA - Like a cosmic journey!
  const timelineData = [
    {
      id: 'creation',
      title: 'CREATION',
      subtitle: 'The Big Bang of Faith',
      emoji: '🌌',
      bgEmoji: '✨',
      color: '#E91E63',
      gradient: ['#FF6B9D', '#E91E63', '#C2185B'],
      position: { x: width * 0.5, y: 120 },
      size: 100,
      description: 'God speaks and BOOM! Universe created in 6 days!',
      events: ['🌍 Day 1: Light!', '🌊 Day 2: Sky!', '🌱 Day 3: Plants!', '☀️ Day 4: Sun & Moon!', '🐟 Day 5: Sea Life!', '🦁 Day 6: Animals & Humans!'],
      connections: ['patriarchs']
    },
    {
      id: 'patriarchs',
      title: 'PATRIARCHS',
      subtitle: 'God\'s Chosen Squad',
      emoji: '👨‍👩‍👧‍👦',
      bgEmoji: '⭐',
      color: '#FF9800',
      gradient: ['#FFB74D', '#FF9800', '#F57C00'],
      position: { x: width * 0.2, y: 220 },
      size: 90,
      description: 'Abraham, Isaac, Jacob - the ultimate family adventure!',
      events: ['🏃‍♂️ Abraham\'s Journey', '👶 Isaac\'s Miracle Birth', '🪜 Jacob\'s Ladder', '🌈 Joseph\'s Coat', '🇪🇬 Move to Egypt'],
      connections: ['exodus']
    },
    {
      id: 'exodus',
      title: 'EXODUS',
      subtitle: 'The Great Escape',
      emoji: '🌊',
      bgEmoji: '⚡',
      color: '#F44336',
      gradient: ['#FF6B6B', '#F44336', '#D32F2F'],
      position: { x: width * 0.8, y: 200 },
      size: 95,
      description: 'Moses vs Pharaoh! Plagues, miracles, Red Sea splits!',
      events: ['🔥 Burning Bush', '🐸 10 Plagues', '🌊 Red Sea Parts', '⛰️ Mount Sinai', '🐄 Golden Calf'],
      connections: ['conquest']
    },
    {
      id: 'conquest',
      title: 'CONQUEST',
      subtitle: 'Epic Battle Mode',
      emoji: '⚔️',
      bgEmoji: '🏆',
      color: '#4CAF50',
      gradient: ['#66BB6A', '#4CAF50', '#388E3C'],
      position: { x: width * 0.3, y: 340 },
      size: 85,
      description: 'Walls fall, sun stops, giants defeated!',
      events: ['🎺 Jericho Falls', '☀️ Sun Stops', '💪 Samson\'s Power', '👸 Ruth\'s Love', '⚖️ Judges Rule'],
      connections: ['kingdom']
    },
    {
      id: 'kingdom',
      title: 'KINGDOM',
      subtitle: 'Kings & Glory',
      emoji: '👑',
      bgEmoji: '💎',
      color: '#2196F3',
      gradient: ['#42A5F5', '#2196F3', '#1976D2'],
      position: { x: width * 0.7, y: 360 },
      size: 92,
      description: 'David slays Goliath, Solomon builds golden temple!',
      events: ['🎯 David vs Goliath', '🏛️ Solomon\'s Temple', '🔥 Elijah\'s Fire', '💔 Kingdom Splits', '📢 Prophets Warn'],
      connections: ['exile']
    },
    {
      id: 'exile',
      title: 'EXILE',
      subtitle: 'Babylon Prison',
      emoji: '🏺',
      bgEmoji: '🦁',
      color: '#795548',
      gradient: ['#8D6E63', '#795548', '#5D4037'],
      position: { x: width * 0.15, y: 480 },
      size: 80,
      description: 'Captured! But Daniel survives lions, friends walk through fire!',
      events: ['🔥 Fiery Furnace', '🦁 Daniel & Lions', '👁️ Ezekiel\'s Visions', '✍️ Writing on Wall', '😭 Jerusalem Falls'],
      connections: ['return']
    },
    {
      id: 'return',
      title: 'RETURN',
      subtitle: 'Coming Home',
      emoji: '🏠',
      bgEmoji: '🔨',
      color: '#607D8B',
      gradient: ['#78909C', '#607D8B', '#455A64'],
      position: { x: width * 0.85, y: 500 },
      size: 75,
      description: 'Freedom! Rebuilding temple, walls, and hope!',
      events: ['🗽 Cyrus\' Freedom', '🏛️ Temple Rebuilt', '🧱 Nehemiah\'s Wall', '👸 Queen Esther', '📚 Ezra Teaches'],
      connections: ['jesus']
    },
    {
      id: 'jesus',
      title: 'JESUS',
      subtitle: 'GOD BECOMES HUMAN',
      emoji: '✝️',
      bgEmoji: '👑',
      color: '#9C27B0',
      gradient: ['#BA68C8', '#9C27B0', '#7B1FA2'],
      position: { x: width * 0.5, y: 620 },
      size: 110,
      description: 'The ultimate plot twist! God becomes a baby, performs miracles, dies, RISES AGAIN!',
      events: ['👶 Born in Bethlehem', '🕊️ Baptism & Ministry', '🍞 Feeds 5,000', '🚶‍♂️ Walks on Water', '💀 Dies on Cross', '🌅 RESURRECTION!'],
      connections: ['church']
    },
    {
      id: 'church',
      title: 'CHURCH',
      subtitle: 'Spirit Power!',
      emoji: '🔥',
      bgEmoji: '🌍',
      color: '#00BCD4',
      gradient: ['#26C6DA', '#00BCD4', '#0097A7'],
      position: { x: width * 0.25, y: 760 },
      size: 88,
      description: 'Holy Spirit comes! Church explodes across the world!',
      events: ['💨 Pentecost Wind', '🗣️ Speaking Languages', '⚡ Paul\'s Conversion', '🚢 Missionary Journeys', '📜 Letters Written'],
      connections: []
    }
  ];

  // Floating animation for bubbles
  useEffect(() => {
    const animations = bubbleAnimations.map((anim, index) => {
      const floatAnimation = Animated.loop(
        Animated.sequence([
          Animated.timing(anim.float, {
            toValue: 1,
            duration: 3000 + (index * 200),
            useNativeDriver: true,
          }),
          Animated.timing(anim.float, {
            toValue: 0,
            duration: 3000 + (index * 200),
            useNativeDriver: true,
          }),
        ])
      );

      const pulseAnimation = Animated.loop(
        Animated.sequence([
          Animated.timing(anim.pulse, {
            toValue: 1.05,
            duration: 2000 + (index * 150),
            useNativeDriver: true,
          }),
          Animated.timing(anim.pulse, {
            toValue: 1,
            duration: 2000 + (index * 150),
            useNativeDriver: true,
          }),
        ])
      );

      const rotateAnimation = Animated.loop(
        Animated.timing(anim.rotate, {
          toValue: 1,
          duration: 20000 + (index * 1000),
          useNativeDriver: true,
        })
      );

      floatAnimation.start();
      pulseAnimation.start();
      rotateAnimation.start();

      return { floatAnimation, pulseAnimation, rotateAnimation };
    });

    return () => {
      animations.forEach(({ floatAnimation, pulseAnimation, rotateAnimation }) => {
        floatAnimation.stop();
        pulseAnimation.stop();
        rotateAnimation.stop();
      });
    };
  }, []);

  const handleBubblePress = (era) => {
    hapticFeedback.medium();
    setSelectedEra(era);
    
    // Epic selection animation
    Animated.sequence([
      Animated.timing(scale, {
        toValue: 1.2,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(scale, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const renderConnectionLine = (from, to) => {
    const fromEra = timelineData.find(era => era.id === from);
    const toEra = timelineData.find(era => era.id === to);
    if (!fromEra || !toEra) return null;

    const angle = Math.atan2(
      toEra.position.y - fromEra.position.y,
      toEra.position.x - fromEra.position.x
    );

    return (
      <View
        key={`${from}-${to}`}
        style={[
          styles.connectionLine,
          {
            left: fromEra.position.x,
            top: fromEra.position.y + fromEra.size / 2,
            width: Math.sqrt(
              Math.pow(toEra.position.x - fromEra.position.x, 2) +
              Math.pow(toEra.position.y - fromEra.position.y, 2)
            ),
            transform: [{ rotate: `${angle}rad` }],
            backgroundColor: fromEra.color + '40',
          },
        ]}
      />
    );
  };

  const renderTimelineBubble = (era, index) => {
    const anim = bubbleAnimations[index];
    const isSelected = selectedEra?.id === era.id;

    return (
      <Animated.View
        key={era.id}
        style={[
          styles.timelineBubbleContainer,
          {
            left: era.position.x - era.size / 2,
            top: era.position.y,
            transform: [
              {
                translateY: anim.float.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, -15],
                }),
              },
              {
                scale: anim.pulse.interpolate({
                  inputRange: [1, 1.05],
                  outputRange: [isSelected ? 1.1 : 1, isSelected ? 1.15 : 1.05],
                }),
              },
              {
                rotate: anim.rotate.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['0deg', '360deg'],
                }),
              },
            ],
          },
        ]}
      >
        <TouchableOpacity
          style={[styles.timelineBubble, { width: era.size, height: era.size }]}
          onPress={() => handleBubblePress(era)}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={era.gradient}
            style={[styles.bubbleGradient, { width: era.size, height: era.size, borderRadius: era.size / 2 }]}
          >
            {/* Background Emoji */}
            <Text style={[styles.bubbleBgEmoji, { fontSize: era.size * 0.8 }]}>
              {era.bgEmoji}
            </Text>
            
            {/* Main Emoji */}
            <Text style={[styles.bubbleEmoji, { fontSize: era.size * 0.4 }]}>
              {era.emoji}
            </Text>
            
            {/* Glowing Ring Effect */}
            {isSelected && (
              <View style={[styles.glowRing, { 
                width: era.size + 20, 
                height: era.size + 20, 
                borderRadius: (era.size + 20) / 2,
                borderColor: era.color + '60'
              }]} />
            )}
          </LinearGradient>
        </TouchableOpacity>
        
        {/* Floating Title */}
        <Animated.View
          style={[
            styles.bubbleTitle,
            {
              transform: [
                {
                  translateY: anim.float.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, -5],
                  }),
                },
              ],
            },
          ]}
        >
          <BlurView intensity={15} style={styles.titleBlur}>
            <Text style={[styles.titleText, { color: theme.text }]}>
              {era.title}
            </Text>
            <Text style={[styles.subtitleText, { color: era.color }]}>
              {era.subtitle}
            </Text>
          </BlurView>
        </Animated.View>
      </Animated.View>
    );
  };

  const renderSelectedEraDetail = () => {
    if (!selectedEra) return null;

    return (
      <Animated.View
        style={[
          styles.eraDetailContainer,
          {
            opacity: selectedEra ? 1 : 0,
            transform: [
              {
                translateY: selectedEra ? 0 : 50,
              },
            ],
          },
        ]}
      >
        <BlurView intensity={25} style={styles.eraDetailCard}>
          <LinearGradient
            colors={[`${selectedEra.color}25`, `${selectedEra.color}15`, 'transparent']}
            style={styles.eraDetailGradient}
          >
            {/* Header */}
            <View style={styles.eraDetailHeader}>
              <View style={[styles.eraDetailIcon, { backgroundColor: `${selectedEra.color}30` }]}>
                <Text style={styles.eraDetailEmoji}>{selectedEra.emoji}</Text>
                <Text style={styles.eraDetailBgEmoji}>{selectedEra.bgEmoji}</Text>
              </View>
              <View style={styles.eraDetailTitles}>
                <Text style={[styles.eraDetailTitle, { color: theme.text }]}>
                  {selectedEra.title}
                </Text>
                <Text style={[styles.eraDetailSubtitle, { color: selectedEra.color }]}>
                  {selectedEra.subtitle}
                </Text>
              </View>
            </View>

            {/* Description */}
            <Text style={[styles.eraDetailDescription, { color: theme.text }]}>
              {selectedEra.description}
            </Text>

            {/* Events Grid - Like Achievement Badges */}
            <View style={styles.eventsGrid}>
              <Text style={[styles.eventsTitle, { color: selectedEra.color }]}>
                🏆 EPIC MOMENTS
              </Text>
              <View style={styles.eventBadgesContainer}>
                {selectedEra.events.map((event, index) => (
                  <Animated.View
                    key={index}
                    style={[
                      styles.eventBadge,
                      {
                        backgroundColor: `${selectedEra.color}20`,
                        borderColor: `${selectedEra.color}40`,
                        transform: [
                          {
                            scale: new Animated.Value(0).interpolate({
                              inputRange: [0, 1],
                              outputRange: [0, 1],
                            }),
                          },
                        ],
                      },
                    ]}
                  >
                    <Text style={[styles.eventBadgeText, { color: theme.text }]}>
                      {event}
                    </Text>
                  </Animated.View>
                ))}
              </View>
            </View>

            {/* Close Button */}
            <TouchableOpacity
              style={[styles.closeButton, { backgroundColor: `${selectedEra.color}20` }]}
              onPress={() => {
                hapticFeedback.light();
                setSelectedEra(null);
              }}
            >
              <MaterialIcons name="close" size={20} color={selectedEra.color} />
            </TouchableOpacity>
          </LinearGradient>
        </BlurView>
      </Animated.View>
    );
  };

  // Pan responder for dragging the mindmap
  const panResponder = PanResponder.create({
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: () => {
      hapticFeedback.light();
    },
    onPanResponderMove: (evt, gestureState) => {
      panX.setValue(gestureState.dx);
      panY.setValue(gestureState.dy);
    },
    onPanResponderRelease: () => {
      Animated.spring(panX, {
        toValue: 0,
        useNativeDriver: true,
      }).start();
      Animated.spring(panY, {
        toValue: 0,
        useNativeDriver: true,
      }).start();
    },
  });

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Epic Header */}
      <LinearGradient
        colors={isDark ? ['#1a1a2e', '#16213e'] : ['#667eea', '#764ba2']}
        style={styles.header}
      >
        <TouchableOpacity onPress={onClose} style={styles.backButton}>
          <BlurView intensity={20} style={styles.backButtonBlur}>
            <MaterialIcons name="arrow-back" size={24} color="#FFFFFF" />
          </BlurView>
        </TouchableOpacity>
        
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>
            🌟 BIBLE TIMELINE
          </Text>
          <Text style={styles.headerSubtitle}>
            Explore 4,000 Years of Epic Adventures
          </Text>
        </View>
        
        <TouchableOpacity style={styles.helpButton}>
          <BlurView intensity={20} style={styles.helpButtonBlur}>
            <MaterialIcons name="help" size={24} color="#FFFFFF" />
          </BlurView>
        </TouchableOpacity>
      </LinearGradient>

      {/* Interactive Mindmap */}
      <View style={styles.mindmapContainer} {...panResponder.panHandlers}>
        <Animated.View
          style={[
            styles.mindmapContent,
            {
              transform: [
                { translateX: panX },
                { translateY: panY },
                { scale: scale },
              ],
            },
          ]}
        >
          {/* Connection Lines */}
          <View style={styles.connectionsContainer}>
            {timelineData.map((era) =>
              era.connections.map((connectionId) =>
                renderConnectionLine(era.id, connectionId)
              )
            )}
          </View>

          {/* Floating Bubbles */}
          {timelineData.map((era, index) => renderTimelineBubble(era, index))}
          
          {/* Floating Particles */}
          <View style={styles.particlesContainer}>
            {Array.from({ length: 20 }).map((_, index) => (
              <Animated.View
                key={index}
                style={[
                  styles.particle,
                  {
                    left: Math.random() * width,
                    top: Math.random() * height,
                    backgroundColor: timelineData[index % timelineData.length]?.color + '30',
                    transform: [
                      {
                        translateY: bubbleAnimations[index % bubbleAnimations.length]?.float.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0, -30],
                        }) || 0,
                      },
                    ],
                  },
                ]}
              />
            ))}
          </View>
        </Animated.View>
      </View>

      {/* Era Detail Panel */}
      {renderSelectedEraDetail()}

      {/* Instructions */}
      <View style={styles.instructionsContainer}>
        <BlurView intensity={15} style={styles.instructionsCard}>
          <Text style={[styles.instructionsText, { color: theme.text }]}>
            🎯 Tap bubbles to explore • 👆 Drag to move around • 🔍 Discover epic Bible adventures!
          </Text>
        </BlurView>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  
  // Epic Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 15,
    paddingBottom: 20,
  },
  backButton: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  backButtonBlur: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerContent: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: '#FFFFFF',
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#FFFFFF',
    opacity: 0.9,
    marginTop: 4,
  },
  helpButton: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  helpButtonBlur: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  // Interactive Mindmap
  mindmapContainer: {
    flex: 1,
    position: 'relative',
  },
  mindmapContent: {
    flex: 1,
    position: 'relative',
  },
  
  // Connection Lines
  connectionsContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  connectionLine: {
    position: 'absolute',
    height: 3,
    borderRadius: 1.5,
    opacity: 0.6,
  },
  
  // Timeline Bubbles
  timelineBubbleContainer: {
    position: 'absolute',
    alignItems: 'center',
  },
  timelineBubble: {
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  bubbleGradient: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  bubbleBgEmoji: {
    position: 'absolute',
    opacity: 0.3,
    zIndex: 1,
  },
  bubbleEmoji: {
    zIndex: 2,
  },
  glowRing: {
    position: 'absolute',
    borderWidth: 3,
    opacity: 0.8,
    zIndex: 0,
  },
  bubbleTitle: {
    marginTop: 12,
    alignItems: 'center',
  },
  titleBlur: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    alignItems: 'center',
  },
  titleText: {
    fontSize: 12,
    fontWeight: '800',
    textAlign: 'center',
  },
  subtitleText: {
    fontSize: 10,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 2,
  },
  
  // Floating Particles
  particlesContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    pointerEvents: 'none',
  },
  particle: {
    position: 'absolute',
    width: 6,
    height: 6,
    borderRadius: 3,
    opacity: 0.6,
  },
  
  // Era Detail Panel
  eraDetailContainer: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
  },
  eraDetailCard: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  eraDetailGradient: {
    padding: 20,
  },
  eraDetailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  eraDetailIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
    position: 'relative',
  },
  eraDetailEmoji: {
    fontSize: 24,
    zIndex: 2,
  },
  eraDetailBgEmoji: {
    position: 'absolute',
    fontSize: 40,
    opacity: 0.3,
    zIndex: 1,
  },
  eraDetailTitles: {
    flex: 1,
  },
  eraDetailTitle: {
    fontSize: 20,
    fontWeight: '900',
    marginBottom: 4,
  },
  eraDetailSubtitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  eraDetailDescription: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 20,
  },
  
  // Events Grid
  eventsGrid: {
    marginBottom: 16,
  },
  eventsTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
  eventBadgesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  eventBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 4,
  },
  eventBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  
  // Close Button
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  // Instructions
  instructionsContainer: {
    position: 'absolute',
    top: 100,
    left: 20,
    right: 20,
  },
  instructionsCard: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 16,
    alignItems: 'center',
  },
  instructionsText: {
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
    opacity: 0.8,
  },
});

export default BibleTimeline;
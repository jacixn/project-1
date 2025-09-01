import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Modal,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { GlassCard } from './GlassEffect';
import { 
  BallVerticalBounce,
  CirclePulseMultiple,
  CircleStrokeSpin,
  QuintupleDotDance,
  CircleRippleMultiple,
  SquareCircuitSnake,
  ProgressHUDOverlay
} from './ProgressHUDAnimations';
import { hapticFeedback } from '../utils/haptics';
// Removed InteractiveSwipeBack import

const AnimationDemo = ({ visible, onClose }) => {
  const { theme, isDark } = useTheme();
  const [showOverlay, setShowOverlay] = useState(false);
  const [overlayType, setOverlayType] = useState('CircleStrokeSpin');

  const animations = [
    {
      id: 'ball',
      name: 'Ball Vertical Bounce',
      description: 'Bouncing balls animation',
      component: <BallVerticalBounce size={50} />,
      overlayType: 'BallVerticalBounce',
    },
    {
      id: 'pulse',
      name: 'Circle Pulse Multiple',
      description: 'Multiple expanding circles',
      component: <CirclePulseMultiple size={60} />,
      overlayType: 'CirclePulseMultiple',
    },
    {
      id: 'spin',
      name: 'Circle Stroke Spin',
      description: 'Spinning circle stroke',
      component: <CircleStrokeSpin size={50} />,
      overlayType: 'CircleStrokeSpin',
    },
    {
      id: 'dance',
      name: 'Quintuple Dot Dance',
      description: 'Five dancing dots',
      component: <QuintupleDotDance size={60} />,
      overlayType: 'QuintupleDotDance',
    },
    {
      id: 'ripple',
      name: 'Circle Ripple Multiple',
      description: 'Ripple effect with center dot',
      component: <CircleRippleMultiple size={70} />,
      overlayType: 'CircleRippleMultiple',
    },
    {
      id: 'snake',
      name: 'Square Circuit Snake',
      description: 'Snake moving in circuit',
      component: <SquareCircuitSnake size={50} />,
      overlayType: 'SquareCircuitSnake',
    },
  ];

  const showFullScreenDemo = (type) => {
    hapticFeedback.buttonPress();
    setOverlayType(type);
    setShowOverlay(true);
    
    // Auto-hide after 3 seconds
    setTimeout(() => {
      setShowOverlay(false);
    }, 3000);
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen">
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: theme.border }]}>
          <TouchableOpacity 
            onPress={() => {
              hapticFeedback.light();
              onClose();
            }}
            style={styles.backButton}
          >
            <MaterialIcons name="arrow-back" size={24} color={theme.text} />
          </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { color: theme.text }]}>
            ProgressHUD Animations
          </Text>
          <Text style={[styles.headerSubtitle, { color: theme.textSecondary }]}>
            Inspired by ProgressHUD library
          </Text>
        </View>
        <View style={styles.headerRight} />
      </View>

      {/* Animations Grid */}
      <ScrollView 
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <Text style={[styles.sectionTitle, { color: theme.text }]}>
          Beautiful Loading Animations
        </Text>
        <Text style={[styles.sectionDesc, { color: theme.textSecondary }]}>
          Tap any animation to see it in full-screen overlay mode
        </Text>

        {animations.map((item, index) => (
          <TouchableOpacity
            key={item.id}
            onPress={() => showFullScreenDemo(item.overlayType)}
            activeOpacity={0.8}
          >
            <GlassCard 
              intensity={15} 
              shadow={true}
              style={[styles.animationCard, { marginBottom: 16 }]}
            >
              <View style={styles.cardContent}>
                <View style={styles.animationContainer}>
                  {item.component}
                </View>
                
                <View style={styles.textContainer}>
                  <Text style={[styles.animationName, { color: theme.text }]}>
                    {item.name}
                  </Text>
                  <Text style={[styles.animationDesc, { color: theme.textSecondary }]}>
                    {item.description}
                  </Text>
                  
                  <View style={[styles.tryButton, { backgroundColor: theme.primary + '20' }]}>
                    <MaterialIcons name="play-arrow" size={16} color={theme.primary} />
                    <Text style={[styles.tryButtonText, { color: theme.primary }]}>
                      Try Full Screen
                    </Text>
                  </View>
                </View>
              </View>
            </GlassCard>
          </TouchableOpacity>
        ))}

        <GlassCard intensity={10} shadow={true} style={styles.infoCard}>
          <Text style={[styles.infoTitle, { color: theme.text }]}>
            About These Animations
          </Text>
          <Text style={[styles.infoText, { color: theme.textSecondary }]}>
            These animations are inspired by the amazing ProgressHUD library for iOS, 
            recreated in React Native with smooth 60fps performance and beautiful 
            glass effects that match your app's theme.
          </Text>
          
          <View style={[styles.linkButton, { backgroundColor: theme.primary + '10' }]}>
            <MaterialIcons name="open-in-new" size={16} color={theme.primary} />
            <Text style={[styles.linkText, { color: theme.primary }]}>
              Original: github.com/relatedcode/ProgressHUD
            </Text>
          </View>
        </GlassCard>
      </ScrollView>

      {/* Full Screen Overlay Demo */}
      <ProgressHUDOverlay
        visible={showOverlay}
        text="Beautiful Animation Demo"
        animationType={overlayType}
        onDismiss={() => setShowOverlay(false)}
      />
    </SafeAreaView>
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
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  headerSubtitle: {
    fontSize: 14,
    marginTop: 2,
  },
  headerRight: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  sectionDesc: {
    fontSize: 16,
    marginBottom: 24,
    lineHeight: 22,
  },
  animationCard: {
    padding: 20,
    borderRadius: 16,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  animationContainer: {
    width: 80,
    height: 80,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  textContainer: {
    flex: 1,
  },
  animationName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  animationDesc: {
    fontSize: 14,
    marginBottom: 12,
    lineHeight: 20,
  },
  tryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  tryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
  },
  infoCard: {
    padding: 20,
    borderRadius: 16,
    marginTop: 8,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  infoText: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
  },
  linkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  linkText: {
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 4,
  },
  // Removed preview styles
});

export default AnimationDemo;

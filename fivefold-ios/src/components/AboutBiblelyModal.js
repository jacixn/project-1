import React, { useEffect, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Animated,
  Easing,
  Platform,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { hapticFeedback } from '../utils/haptics';

const AboutBiblelyModal = ({ visible, onClose }) => {
  const { theme, isDark } = useTheme();

  const cardShimmer = useRef(new Animated.Value(0)).current;
  const modalFadeAnim = useRef(new Animated.Value(0)).current;
  const modalSlideAnim = useRef(new Animated.Value(50)).current;
  const shimmerLoopRef = useRef(null);

  useEffect(() => {
    if (visible) {
      modalFadeAnim.setValue(0);
      modalSlideAnim.setValue(50);

      Animated.parallel([
        Animated.timing(modalFadeAnim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.spring(modalSlideAnim, {
          toValue: 0,
          tension: 60,
          friction: 8,
          useNativeDriver: true,
        }),
      ]).start();

      shimmerLoopRef.current = Animated.loop(
        Animated.sequence([
          Animated.timing(cardShimmer, {
            toValue: 1,
            duration: 2000,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: false,
          }),
          Animated.timing(cardShimmer, {
            toValue: 0,
            duration: 2000,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: false,
          }),
        ])
      );
      shimmerLoopRef.current.start();
    } else {
      shimmerLoopRef.current?.stop();
      shimmerLoopRef.current = null;
    }

    return () => {
      shimmerLoopRef.current?.stop();
      shimmerLoopRef.current = null;
    };
  }, [visible]);

  const textColor = theme.text;
  const textSecondaryColor = theme.textSecondary;

  return (
    <Modal
      visible={visible}
      animationType="none"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <LinearGradient
        colors={
          isDark
            ? ['#0F0F23', '#1A1A2E', '#16213E']
            : ['#F0F4FF', '#E8EEFF', '#DDE6FF']
        }
        style={styles.aboutModal}
      >
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

        {/* Animated background circles */}
        <Animated.View
          style={[
            styles.bgCircle1,
            {
              opacity: cardShimmer.interpolate({
                inputRange: [0, 1],
                outputRange: [0.3, 0.6],
              }),
              transform: [
                {
                  scale: cardShimmer.interpolate({
                    inputRange: [0, 1],
                    outputRange: [1, 1.2],
                  }),
                },
              ],
            },
          ]}
        />
        <Animated.View
          style={[
            styles.bgCircle2,
            {
              opacity: cardShimmer.interpolate({
                inputRange: [0, 1],
                outputRange: [0.4, 0.7],
              }),
            },
          ]}
        />

        {/* Close Button */}
        <TouchableOpacity
          style={[
            styles.closeButtonFloating,
            {
              backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
            },
          ]}
          onPress={() => {
            hapticFeedback.medium();
            onClose?.();
          }}
        >
          <BlurView
            intensity={20}
            tint={isDark ? 'dark' : 'light'}
            style={styles.closeButtonBlur}
          >
            <MaterialIcons name="close" size={24} color={theme.text} />
          </BlurView>
        </TouchableOpacity>

        {/* Content */}
        <Animated.ScrollView
          style={styles.aboutContent}
          contentContainerStyle={styles.aboutContentContainer}
          showsVerticalScrollIndicator={false}
          opacity={modalFadeAnim}
        >
          {/* Hero Title */}
          <Animated.View style={{ transform: [{ translateY: modalSlideAnim }] }}>
            <LinearGradient
              colors={[theme.primary, theme.primaryLight, theme.primaryDark]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.heroGradient}
            >
              <Text style={styles.heroTitle}>About Biblely</Text>
              <MaterialIcons
                name="stars"
                size={28}
                color="#FFFFFF"
                style={styles.heroIcon}
              />
            </LinearGradient>
          </Animated.View>

          {/* Creator Card */}
          <Animated.View
            style={{
              transform: [{ translateY: modalSlideAnim }],
              opacity: modalFadeAnim,
            }}
          >
            <BlurView
              intensity={30}
              tint={isDark ? 'dark' : 'light'}
              style={styles.creatorCard}
            >
              <LinearGradient
                colors={
                  isDark
                    ? ['rgba(255,255,255,0.08)', 'rgba(255,255,255,0.03)']
                    : ['rgba(255,255,255,0.9)', 'rgba(255,255,255,0.6)']
                }
                style={styles.creatorCardInner}
              >
                {/* Avatar */}
                <Animated.View
                  style={[
                    styles.creatorIconContainer,
                    {
                      transform: [
                        {
                          scale: cardShimmer.interpolate({
                            inputRange: [0, 1],
                            outputRange: [1, 1.05],
                          }),
                        },
                      ],
                    },
                  ]}
                >
                  <LinearGradient
                    colors={[theme.primary, theme.primaryLight]}
                    style={styles.avatarGradient}
                  >
                    <Image
                      source={require('../../assets/animated-icon.png')}
                      style={styles.avatarLogo}
                      resizeMode="contain"
                    />
                  </LinearGradient>
                  <Animated.View
                    style={[
                      styles.glowRing,
                      {
                        borderColor: theme.primary,
                        opacity: cardShimmer.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0.3, 0.8],
                        }),
                      },
                    ]}
                  />
                </Animated.View>

                <Text style={[styles.creatorName, { color: textColor }]}>
                  Hi, I'm Jason 👋
                </Text>
                <View style={styles.badgeContainer}>
                  <LinearGradient
                    colors={[theme.primary + '40', theme.primary + '20']}
                    style={styles.badge}
                  >
                    <MaterialIcons name="school" size={14} color={theme.primary} />
                    <Text style={[styles.badgeText, { color: theme.primary }]}>
                      CS & CF Graduate
                    </Text>
                  </LinearGradient>
                  <LinearGradient
                    colors={[
                      (theme.success || '#10B981') + '40',
                      (theme.success || '#10B981') + '20',
                    ]}
                    style={styles.badge}
                  >
                    <MaterialIcons
                      name="code"
                      size={14}
                      color={theme.success || '#10B981'}
                    />
                    <Text
                      style={[
                        styles.badgeText,
                        { color: theme.success || '#10B981' },
                      ]}
                    >
                      Software Engineer
                    </Text>
                  </LinearGradient>
                </View>
              </LinearGradient>
            </BlurView>
          </Animated.View>

          {/* Story Section */}
          <BlurView
            intensity={30}
            tint={isDark ? 'dark' : 'light'}
            style={styles.storyCard}
          >
            <LinearGradient
              colors={
                isDark
                  ? ['rgba(255,255,255,0.08)', 'rgba(255,255,255,0.03)']
                  : ['rgba(255,255,255,0.9)', 'rgba(255,255,255,0.6)']
              }
              style={styles.storyCardInner}
            >
              <LinearGradient
                colors={[theme.primary + '30', theme.primary + '10']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.storyHeaderGradient}
              >
                <MaterialIcons
                  name="auto-stories"
                  size={24}
                  color={theme.primary}
                />
                <Text style={[styles.storyTitle, { color: textColor }]}>
                  Why I Built This
                </Text>
              </LinearGradient>

              <Text style={[styles.storyText, { color: textColor }]}>
                I'm Jason, a CS and CF graduate and Software Engineer who loves reading the Bible. I wanted an app to help me read daily, so I tried a few popular Bible apps.
              </Text>

              <Text style={[styles.storyText, { color: textColor }]}>
                Some had paywalls, others just weren't what I was looking for. I wanted something simple that combined faith, productivity, and wellness in one place.
              </Text>

              <Text style={[styles.storyText, { color: textColor }]}>
                So I built Biblely. It's got everything I wanted - Bible reading, daily prayers, tasks to stay productive, and even fitness tracking. All completely free.
              </Text>

              <Text style={[styles.storyText, { color: textColor }]}>
                I made this for myself, but I hope it helps you too. No subscriptions, no paywalls, just a simple app to help you grow.
              </Text>
            </LinearGradient>
          </BlurView>

          {/* Thank You Section */}
          <BlurView
            intensity={30}
            tint={isDark ? 'dark' : 'light'}
            style={styles.thankYouCard}
          >
            <LinearGradient
              colors={
                isDark
                  ? ['rgba(255,255,255,0.08)', 'rgba(255,255,255,0.03)']
                  : ['rgba(255,255,255,0.9)', 'rgba(255,255,255,0.6)']
              }
              style={styles.thankYouCardInner}
            >
              <Animated.View
                style={{
                  transform: [
                    {
                      scale: cardShimmer.interpolate({
                        inputRange: [0, 1],
                        outputRange: [1, 1.1],
                      }),
                    },
                  ],
                }}
              >
                <LinearGradient
                  colors={['#FF6B6B', '#EE5A6F']}
                  style={styles.heartContainer}
                >
                  <MaterialIcons name="favorite" size={32} color="#FFFFFF" />
                </LinearGradient>
              </Animated.View>

              <Text style={[styles.thankYouTitle, { color: textColor }]}>
                Thanks for being here
              </Text>
              <Text style={[styles.thankYouText, { color: textSecondaryColor }]}>
                Hope Biblely helps you out. If you've got any ideas or feedback, I'd love to hear them.
              </Text>

              <View style={styles.contactInfo}>
                <View style={styles.contactItem}>
                  <MaterialIcons name="email" size={18} color={theme.primary} />
                  <Text style={[styles.contactText, { color: textColor }]}>
                    biblelyios@gmail.com
                  </Text>
                </View>
              </View>

              <View style={styles.signatureContainer}>
                <View style={styles.signatureLine} />
                <Text style={[styles.signature, { color: textSecondaryColor }]}>
                  Jason
                </Text>
              </View>
            </LinearGradient>
          </BlurView>
        </Animated.ScrollView>
      </LinearGradient>
    </Modal>
  );
};

const styles = StyleSheet.create({
  aboutModal: {
    flex: 1,
  },
  bgCircle1: {
    position: 'absolute',
    width: Dimensions.get('window').width * 1.2,
    height: Dimensions.get('window').width * 1.2,
    borderRadius: Dimensions.get('window').width * 0.6,
    backgroundColor: '#667eea',
    top: -Dimensions.get('window').width * 0.4,
    right: -Dimensions.get('window').width * 0.2,
  },
  bgCircle2: {
    position: 'absolute',
    width: Dimensions.get('window').width * 0.8,
    height: Dimensions.get('window').width * 0.8,
    borderRadius: Dimensions.get('window').width * 0.4,
    backgroundColor: '#764ba2',
    bottom: -Dimensions.get('window').width * 0.3,
    left: -Dimensions.get('window').width * 0.2,
  },
  closeButtonFloating: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 40,
    right: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    overflow: 'hidden',
    zIndex: 1000,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  closeButtonBlur: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  aboutContent: {
    flex: 1,
    paddingTop: Platform.OS === 'ios' ? 115 : 90,
  },
  aboutContentContainer: {
    padding: 20,
    paddingBottom: 60,
  },
  heroGradient: {
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  heroIcon: {
    opacity: 0.9,
  },
  creatorCard: {
    borderRadius: 24,
    marginBottom: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  creatorCardInner: {
    padding: 24,
    alignItems: 'center',
  },
  creatorIconContainer: {
    marginBottom: 16,
  },
  avatarGradient: {
    width: 90,
    height: 90,
    borderRadius: 45,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },
  avatarLogo: {
    width: 70,
    height: 70,
  },
  glowRing: {
    position: 'absolute',
    width: 104,
    height: 104,
    borderRadius: 52,
    borderWidth: 2,
    top: -7,
    left: -7,
  },
  creatorName: {
    fontSize: 26,
    fontWeight: '700',
    marginBottom: 12,
    letterSpacing: 0.3,
  },
  badgeContainer: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 6,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
  },
  badgeText: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  storyCard: {
    borderRadius: 24,
    marginBottom: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  storyCardInner: {
    padding: 24,
  },
  storyHeaderGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderRadius: 16,
    marginBottom: 20,
  },
  storyTitle: {
    fontSize: 20,
    fontWeight: '700',
    flex: 1,
  },
  storyText: {
    fontSize: 16,
    lineHeight: 26,
    marginBottom: 16,
    fontWeight: '400',
  },
  thankYouCard: {
    borderRadius: 24,
    marginBottom: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  thankYouCardInner: {
    padding: 32,
    alignItems: 'center',
  },
  heartContainer: {
    width: 70,
    height: 70,
    borderRadius: 35,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#FF6B6B',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  thankYouTitle: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 12,
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  thankYouText: {
    fontSize: 15,
    lineHeight: 24,
    textAlign: 'center',
    marginBottom: 24,
    fontWeight: '400',
  },
  contactInfo: {
    width: '100%',
    gap: 12,
    marginTop: 20,
    marginBottom: 28,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    justifyContent: 'center',
  },
  contactText: {
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  signatureContainer: {
    alignItems: 'center',
  },
  signatureLine: {
    width: 100,
    height: 2,
    backgroundColor: 'rgba(0,0,0,0.2)',
    marginBottom: 12,
  },
  signature: {
    fontSize: 20,
    fontWeight: '600',
    fontStyle: 'italic',
    letterSpacing: 0.3,
  },
});

export default AboutBiblelyModal;

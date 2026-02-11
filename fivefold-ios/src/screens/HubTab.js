/**
 * HubTab - Twitter-like feed where users can post and view content
 * 
 * Features:
 * - Global feed showing posts from all users
 * - Token-based posting (1 token per day, random time 6am-6pm)
 * - Friends & Leaderboard accessible from header
 * - Like and interact with posts
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  RefreshControl,
  ActivityIndicator,
  Modal,
  TextInput,
  Alert,
  Animated,
  Dimensions,
  Platform,
  KeyboardAvoidingView,
  AppState,
  Easing,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { MaterialIcons, Ionicons, FontAwesome5 } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';

import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { useWorkout } from '../contexts/WorkoutContext';
import bibleAudioService from '../services/bibleAudioService';
import { GlassHeader } from '../components/GlassEffect';
import { getFeedPosts, createPost, viewPost, deletePost, formatTimeAgo, enrichPostsWithProfiles, invalidateAuthorCache } from '../services/feedService';
import { isEmailVerified, sendVerificationCode, refreshEmailVerificationStatus } from '../services/authService';
import { getTokenStatus, useToken, getTimeUntilToken, checkAndDeliverToken, forceRefreshTokenFromFirebase } from '../services/tokenService';
import { getTotalUnreadCount, subscribeToConversations } from '../services/messageService';
import { getChallenges, subscribeToChallenges } from '../services/challengeService';
import LottieView from 'lottie-react-native';
import AchievementService from '../services/achievementService';
import userStorage from '../utils/userStorage';
import { getReferralCount } from '../services/referralService';
import ReportBlockModal from '../components/ReportBlockModal';
// FriendsScreen is now accessed via stack navigator in RootNavigator
// LeaderboardScreen is now accessed via stack navigator in RootNavigator

const BADGE_REFERRAL_GATES = { country: null, streak: null, verified: 1, biblely: 70 };

const getStreakAnimSource = (animId) => {
  switch (animId) {
    case 'fire2':     return require('../../assets/Fire2.json');
    case 'redcar':    return require('../../assets/Red-Car.json');
    case 'bulb':      return require('../../assets/Bulb Transparent.json');
    case 'amongus':   return require('../../assets/Loading 50 _ Among Us.json');
    case 'lightning':  return require('../../assets/Lightning.json');
    default:          return require('../../assets/fire-animation.json');
  }
};

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Format large numbers nicely (1.8K, 29K, 1.2M, etc.)
const formatNumber = (num) => {
  if (!num || num < 1000) return num?.toString() || '0';
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
  }
  return num.toString();
};

const HubTab = () => {
  const { theme, isDark } = useTheme();
  const { user, userProfile } = useAuth();
  const { hasActiveWorkout } = useWorkout();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  
  // State
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tokenStatus, setTokenStatus] = useState({ hasToken: false });
  const [timeUntilToken, setTimeUntilToken] = useState(null);
  const [showComposer, setShowComposer] = useState(false);
  const [postContent, setPostContent] = useState('');
  const [posting, setPosting] = useState(false);
  const [postingSuccess, setPostingSuccess] = useState(false);
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  
  const [totalUnreadMessages, setTotalUnreadMessages] = useState(0);
  const [pendingChallengesCount, setPendingChallengesCount] = useState(0);
  const [expandedPost, setExpandedPost] = useState(null);
  const [reportTarget, setReportTarget] = useState(null);
  
  // Badge display state for current user
  const [myBadgeToggles, setMyBadgeToggles] = useState({});
  const [myReferralCount, setMyReferralCount] = useState(0);
  const [myStreakAnim, setMyStreakAnim] = useState('fire1');
  
  // Expanded post animations
  const expandAnim = useRef(new Animated.Value(0)).current;
  const expandScale = useRef(new Animated.Value(0.8)).current;
  const expandRotate = useRef(new Animated.Value(0)).current;
  const glowPulse = useRef(new Animated.Value(0)).current;
  
  // Animation refs
  const fabScale = useRef(new Animated.Value(1)).current;
  const tokenPulse = useRef(new Animated.Value(1)).current;
  const headerGlow = useRef(new Animated.Value(0)).current;
  const iconBounce1 = useRef(new Animated.Value(0)).current;
  const iconBounce2 = useRef(new Animated.Value(0)).current;
  
  // Posting overlay animations
  const postingOverlayAnim = useRef(new Animated.Value(0)).current;
  const postingIconSpin = useRef(new Animated.Value(0)).current;
  const postingScale = useRef(new Animated.Value(0.3)).current;
  
  // Header glow animation
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(headerGlow, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: false,
        }),
        Animated.timing(headerGlow, {
          toValue: 0,
          duration: 2000,
          useNativeDriver: false,
        }),
      ])
    ).start();
    
    // Staggered icon bounce
    Animated.loop(
      Animated.sequence([
        Animated.delay(0),
        Animated.spring(iconBounce1, { toValue: 1, tension: 300, friction: 10, useNativeDriver: true }),
        Animated.spring(iconBounce1, { toValue: 0, tension: 300, friction: 10, useNativeDriver: true }),
      ])
    ).start();
    
    Animated.loop(
      Animated.sequence([
        Animated.delay(200),
        Animated.spring(iconBounce2, { toValue: 1, tension: 300, friction: 10, useNativeDriver: true }),
        Animated.spring(iconBounce2, { toValue: 0, tension: 300, friction: 10, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  // Track audio player visibility so FAB can dodge it
  useEffect(() => {
    const checkAudio = () => {
      const state = bibleAudioService.getPlaybackState?.();
      const playing = !!(state && (state.isPlaying || state.isPaused) && state.currentVerse);
      setIsAudioPlaying(playing);
    };
    checkAudio();
    const interval = setInterval(checkAudio, 1000);
    return () => clearInterval(interval);
  }, []);
  
  // Load badge toggles + referral count for current user badge display
  useEffect(() => {
    userStorage.getRaw('fivefold_badge_toggles').then(raw => {
      if (raw) setMyBadgeToggles(JSON.parse(raw));
    }).catch(() => {});
    getReferralCount().then(c => setMyReferralCount(c)).catch(() => {});
    userStorage.getRaw('fivefold_streak_animation').then(v => { if (v) setMyStreakAnim(v); }).catch(() => {});
  }, []);

  // Load posts (one-time fetch, no real-time listener to save Firestore costs)
  const loadPosts = async () => {
    try {
      const result = await getFeedPosts();
      setPosts(result.posts);
    } catch (error) {
      console.error('[Hub] Error loading posts:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user) return;
    
    // One-time fetch of posts (no real-time listener)
    loadPosts();
    
    // Delay initial token check to allow cloud data to download first
    const tokenCheckDelay = setTimeout(() => {
      console.log('[HubTab] Initial token check (delayed) - syncing from Firebase');
      checkTokenStatus(true);
    }, 1500);
    
    // Refresh token status when app comes to foreground
    // (e.g. user taps notification saying token arrived)
    const appStateListener = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        console.log('[HubTab] App came to foreground, checking token status');
        checkTokenStatus(true);
      }
    });
    
    return () => {
      clearTimeout(tokenCheckDelay);
      appStateListener?.remove();
    };
  }, [user]);
  
  // Real-time listeners for notification badges (much more efficient than polling)
  useEffect(() => {
    if (!user) return;
    
    // Subscribe to conversations for unread message count
    const unsubConversations = subscribeToConversations(user.uid, (conversations) => {
      let totalUnread = 0;
      conversations.forEach(conv => {
        // unreadCount is already extracted as a number by subscribeToConversations
        totalUnread += conv.unreadCount || 0;
      });
      setTotalUnreadMessages(totalUnread);
    });
    
    // Subscribe to challenges for pending count
    const unsubChallenges = subscribeToChallenges(user.uid, (challenges) => {
      const pendingCount = challenges.filter(c => 
        (c.status === 'pending' && c.challengedId === user.uid) ||
        (c.status === 'accepted' && (
          (c.challengerId === user.uid && (c.challengerScore === null || c.challengerScore === undefined)) ||
          (c.challengedId === user.uid && (c.challengedScore === null || c.challengedScore === undefined))
        ))
      ).length;
      setPendingChallengesCount(pendingCount);
    });
    
    // Cleanup listeners on unmount
    return () => {
      unsubConversations();
      unsubChallenges();
    };
  }, [user]);
  
  // Listen for user data downloaded (after sign-in) to reload token status
  useEffect(() => {
    const { DeviceEventEmitter } = require('react-native');
    const subscription = DeviceEventEmitter.addListener('userDataDownloaded', async () => {
      console.log('[HubTab] User data downloaded - syncing token from Firebase');
      await checkTokenStatus(true); // Force Firebase sync
    });

    // When the user changes their profile picture, invalidate the author cache
    // so the feed re-fetches the fresh picture for all their posts
    const picSub = DeviceEventEmitter.addListener('profileImageChanged', () => {
      if (user?.uid) {
        invalidateAuthorCache(user.uid);
        console.log('[HubTab] Profile image changed - cache invalidated, will refresh on next load');
      }
    });

    return () => {
      subscription.remove();
      picSub.remove();
    };
  }, [user, userProfile]);
  
  // Token pulse animation when available
  useEffect(() => {
    if (tokenStatus.hasToken) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(tokenPulse, {
            toValue: 1.1,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(tokenPulse, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      tokenPulse.setValue(1);
    }
  }, [tokenStatus.hasToken]);
  
  const checkTokenStatus = async (forceFirebaseSync = false) => {
    if (!user) return;
    
    // Check both displayName and username for test user detection
    // Try username first (more reliable), then displayName
    const displayName = userProfile?.displayName || null;
    const username = userProfile?.username || null;
    // Pass username first since it's cleaner (no emojis), fallback to displayName
    const nameToCheck = username || displayName;
    
    // Use Firebase sync on initial load to get admin-set schedules
    let status;
    if (forceFirebaseSync) {
      status = await forceRefreshTokenFromFirebase(user.uid, nameToCheck);
      console.log('[HubTab] Token synced from Firebase');
    } else {
      status = await checkAndDeliverToken(user.uid, nameToCheck);
    }
    setTokenStatus(status);
    
    if (!status.hasToken && status.willArriveToday) {
      const timeUntil = await getTimeUntilToken();
      setTimeUntilToken(timeUntil);
    } else {
      setTimeUntilToken(null);
    }
  };
  
  const handleRefresh = async () => {
    setRefreshing(true);
    
    // Refresh posts
    await loadPosts();
    
    // Force refresh token from Firebase (for admin testing)
    if (user) {
      const status = await forceRefreshTokenFromFirebase(user.uid, userProfile?.username);
      setTokenStatus(status);
      
      if (status.syncedFromFirebase) {
        console.log('[Hub] Token synced from Firebase:', status.arrivalTime);
      }
      
      // Update time until token
      const timeInfo = await getTimeUntilToken();
      setTimeUntilToken(timeInfo);
    }
    
    setRefreshing(false);
  };
  
  const handleFabPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    if (!tokenStatus.hasToken) {
      // Show friendly message about token
      if (tokenStatus.tokenDelivered) {
        Alert.alert(
          'Come Back Tomorrow',
          'You\'ve already shared today. Your next token will arrive sometime tomorrow - keep an eye out for the notification!',
          [{ text: 'Got it' }]
        );
      } else {
        Alert.alert(
          'Token On Its Way',
          'Your posting token hasn\'t arrived yet today. It\'ll show up sometime between 6 AM and 6 PM - we\'ll notify you when it\'s ready!',
          [{ text: 'Sounds good' }]
        );
      }
      return;
    }
    
    // Animate FAB
    Animated.sequence([
      Animated.timing(fabScale, { toValue: 0.9, duration: 100, useNativeDriver: true }),
      Animated.timing(fabScale, { toValue: 1, duration: 100, useNativeDriver: true }),
    ]).start();
    
    setShowComposer(true);
  };
  
  const handlePost = async () => {
    // Guard against double-tap immediately
    if (posting) return;
    
    if (!postContent.trim()) {
      Alert.alert('Empty Post', 'Please write something to share.');
      return;
    }
    
    if (postContent.length > 280) {
      Alert.alert('Too Long', 'Posts must be 280 characters or less.');
      return;
    }
    
    // Lock posting state BEFORE any async work
    setPosting(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    // Start overlay animation
    postingOverlayAnim.setValue(0);
    postingIconSpin.setValue(0);
    postingScale.setValue(0.3);
    Animated.parallel([
      Animated.timing(postingOverlayAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.spring(postingScale, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
    ]).start();
    // Continuous spin animation
    const spinLoop = Animated.loop(
      Animated.timing(postingIconSpin, {
        toValue: 1,
        duration: 1200,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    spinLoop.start();
    
    // Refresh & check email verification (reload user to get latest status)
    const verified = await refreshEmailVerificationStatus();
    if (!verified) {
      spinLoop.stop();
      setPosting(false);
      Alert.alert(
        'Verify Your Email',
        'Please verify your email address before posting.',
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Verify Now', 
            onPress: () => {
              navigation.navigate('EmailVerification', { fromSignup: false });
            }
          },
        ]
      );
      return;
    }
    
    // Use the token
    const username = userProfile?.displayName || userProfile?.username || null;
    const tokenResult = await useToken(user.uid, username);
    if (!tokenResult.success) {
      spinLoop.stop();
      Alert.alert('Error', tokenResult.error || 'Failed to use token');
      setPosting(false);
      return;
    }
    
    // Use cached profile from AuthContext (no extra Firestore read needed)
    const profileToUse = userProfile;
    
    // Create the post
    const result = await createPost(user.uid, postContent, profileToUse);
    
    spinLoop.stop();
    
    if (result.success) {
      // Show success state briefly
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setPostingSuccess(true);
      
      // Wait for success animation to show
      await new Promise(resolve => setTimeout(resolve, 800));
      
      // Fade out overlay
      Animated.timing(postingOverlayAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
      
      await new Promise(resolve => setTimeout(resolve, 300));
      
      setPostContent('');
      setShowComposer(false);
      setPostingSuccess(false);
      setPosting(false);
      await loadPosts(); // Refresh feed with new post
      await checkTokenStatus(true); // Refresh token status from Firebase
    } else {
      // Fade out overlay on error
      Animated.timing(postingOverlayAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
      await new Promise(resolve => setTimeout(resolve, 200));
      setPosting(false);
      Alert.alert('Error', result.error || 'Failed to create post');
    }
  };
  
  const handleDeletePost = async (postId) => {
    Alert.alert(
      'Delete Post',
      'Are you sure you want to delete this post?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            await deletePost(postId, user.uid);
          },
        },
      ]
    );
  };
  
  // Expand post with stunning animation
  const handleExpandPost = (post) => {
    setExpandedPost(post);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    
    // Reset animations
    expandAnim.setValue(0);
    expandScale.setValue(0.3);
    expandRotate.setValue(-15);
    glowPulse.setValue(0);
    
    // Slower, more dramatic entrance animation
    Animated.sequence([
      // First: fade in backdrop slowly
      Animated.timing(expandAnim, {
        toValue: 0.5,
        duration: 250,
        useNativeDriver: true,
      }),
      // Then: bring in the card with a slow, elegant spring
      Animated.parallel([
        Animated.timing(expandAnim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.spring(expandScale, {
          toValue: 1,
          tension: 35,  // Lower tension = slower
          friction: 7,  // Higher friction = less bouncy
          useNativeDriver: true,
        }),
        Animated.spring(expandRotate, {
          toValue: 0,
          tension: 30,
          friction: 6,
          useNativeDriver: true,
        }),
      ]),
    ]).start();
    
    // Delayed glow pulse - starts after card appears
    setTimeout(() => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(glowPulse, {
            toValue: 1,
            duration: 2000,
            useNativeDriver: true,
          }),
          Animated.timing(glowPulse, {
            toValue: 0,
            duration: 2000,
            useNativeDriver: true,
          }),
        ])
      ).start();
    }, 600);
  };
  
  // Collapse post with animation
  const handleCollapsePost = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    Animated.parallel([
      Animated.timing(expandAnim, {
        toValue: 0,
        duration: 350,
        useNativeDriver: true,
      }),
      Animated.timing(expandScale, {
        toValue: 0.8,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setExpandedPost(null);
    });
  };
  
  // Batched view tracking - accumulates views and flushes to Firestore periodically
  const pendingViewsRef = useRef({});
  const viewFlushTimerRef = useRef(null);
  
  const flushViews = useCallback(async () => {
    const pending = { ...pendingViewsRef.current };
    pendingViewsRef.current = {};
    
    const postIds = Object.keys(pending);
    if (postIds.length === 0) return;
    
    for (const postId of postIds) {
      try {
        await viewPost(postId, user?.uid);
      } catch (e) {
        console.log('[Views] Failed to flush view for', postId);
      }
    }
    console.log(`[Views] Flushed ${postIds.length} view counts`);
  }, [user]);
  
  // Flush views when component unmounts or every 30 seconds
  useEffect(() => {
    viewFlushTimerRef.current = setInterval(flushViews, 30000);
    return () => {
      clearInterval(viewFlushTimerRef.current);
      flushViews(); // Flush remaining on unmount
    };
  }, [flushViews]);

  const trackView = useCallback((postId) => {
    if (!pendingViewsRef.current[postId]) {
      pendingViewsRef.current[postId] = true;
    }
  }, []);
  
  const renderPost = ({ item }) => {
    const isOwner = item.userId === user?.uid;
    
    // Track view - batch and flush periodically (not per-scroll)
    if (user?.uid && item.id && !isOwner && !pendingViewsRef.current[item.id]) {
      trackView(item.id);
    }
    
    return (
      <TouchableOpacity
        activeOpacity={0.9}
        onLongPress={() => handleExpandPost(item)}
        delayLongPress={400}
        style={[styles.postCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#FFFFFF' }]}
      >
        {/* Author Row */}
        <View style={styles.postHeader}>
          <View style={styles.authorInfo}>
            {/* Use enriched data (already merged by feedService), with own-profile fallback */}
            {(() => {
              // For own posts, also check live userProfile as an extra fallback
              const photoUrl = isOwner
                ? (item.authorPhoto || userProfile?.profilePicture)
                : item.authorPhoto;
              return photoUrl ? (
                <Image source={{ uri: photoUrl }} style={styles.authorAvatar} />
              ) : null;
            })()}
            {!(isOwner ? (item.authorPhoto || userProfile?.profilePicture) : item.authorPhoto) && (
              <LinearGradient
                colors={['#8B5CF6', '#6366F1']}
                style={styles.authorAvatar}
              >
                <Text style={styles.avatarText}>
                  {(item.authorName || 'A').charAt(0).toUpperCase()}
                </Text>
              </LinearGradient>
            )}
            <View style={styles.authorDetails}>
              {/* Time above name */}
              <Text style={[styles.postTimeTop, { color: theme.textTertiary }]}>
                {formatTimeAgo(item.createdAt)}
              </Text>
              
              <View style={styles.authorNameRow}>
                <Text style={[styles.authorName, { color: theme.text }]}>
                  {isOwner ? (item.authorName || userProfile?.displayName) : item.authorName}
                </Text>
                {/* Country flag — respect toggle for own posts */}
                {(() => {
                  const flag = isOwner ? (item.authorCountry || userProfile?.countryFlag) : item.authorCountry;
                  const hidden = isOwner && myBadgeToggles.country === false;
                  if (!flag || hidden) return null;
                  return <Text style={styles.authorCountry}>{flag}</Text>;
                })()}
                {/* Streak animation badge (current user only) */}
                {isOwner && myBadgeToggles.streak !== false && (
                  <LottieView source={getStreakAnimSource(myStreakAnim)} autoPlay loop style={{ width: 18, height: 18, marginLeft: 4 }} />
                )}
                {/* Profile badges — gated only by referrals + toggles, no achievements */}
                {(() => {
                  const toggles = isOwner ? myBadgeToggles : (item.badgeToggles || {});
                  const refCount = isOwner ? myReferralCount : (item.referralCount || 0);
                  return AchievementService.PROFILE_BADGES
                    .filter(badge => {
                      if (toggles[badge.id] === false) return false;
                      const req = BADGE_REFERRAL_GATES[badge.id];
                      if (req != null && refCount < req) return false;
                      return true;
                    })
                    .map(badge => badge.image
                      ? <Image key={badge.id} source={badge.image} style={{ width: 16, height: 16, marginLeft: 4, borderRadius: 4 }} resizeMode="contain" />
                      : <MaterialIcons key={badge.id} name={badge.icon} size={16} color={badge.color} style={{ marginLeft: 4 }} />
                    );
                })()}
              </View>
              {(item.authorUsername || (isOwner && userProfile?.username)) && (
                <Text style={[styles.authorUsername, { color: theme.textSecondary }]}>
                  @{item.authorUsername || (isOwner ? userProfile?.username : '')}
                </Text>
              )}
            </View>
          </View>
          
          {isOwner ? (
            <TouchableOpacity
              onPress={() => handleDeletePost(item.id)}
              style={styles.moreButton}
            >
              <MaterialIcons name="more-horiz" size={20} color={theme.textSecondary} />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              onPress={() => setReportTarget(item)}
              style={styles.moreButton}
            >
              <MaterialIcons name="more-horiz" size={20} color={theme.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
        
        {/* Post Content */}
        <Text style={[styles.postContent, { color: theme.text }]}>
          {item.content}
        </Text>
        
        {/* Views Count */}
        {(item.views || 0) > 0 && (
          <View style={styles.viewsRow}>
            <Ionicons name="eye-outline" size={14} color={theme.textTertiary} />
            <Text style={[styles.viewsText, { color: theme.textTertiary }]}>
              {formatNumber(item.views)} {item.views === 1 ? 'view' : 'views'}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };
  
  const renderHeader = () => {
    // Animated gradient colors
    const glowOpacity = headerGlow.interpolate({
      inputRange: [0, 1],
      outputRange: [0.4, 0.8],
    });
    
    const shimmerTranslate = headerGlow.interpolate({
      inputRange: [0, 1],
      outputRange: [-100, SCREEN_WIDTH + 100],
    });
    
    return (
      <View style={{ overflow: 'hidden' }}>
        {/* Stunning gradient background */}
        <LinearGradient
          colors={isDark 
            ? ['#2D1B69', '#11998e', '#38ef7d'] 
            : ['#FF6B6B', '#4ECDC4', '#45B7D1']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.premiumHeader, { paddingTop: insets.top }]}
        >
          {/* Shimmer effect */}
          <Animated.View 
            style={[
              styles.shimmerEffect, 
              { transform: [{ translateX: shimmerTranslate }] }
            ]} 
          />
          
          {/* Floating orbs for depth - more vibrant */}
          <Animated.View style={[styles.floatingOrb, styles.orb1, { opacity: glowOpacity }]} />
          <Animated.View style={[styles.floatingOrb, styles.orb2, { opacity: glowOpacity }]} />
          <Animated.View style={[styles.floatingOrb, styles.orb3, { opacity: glowOpacity }]} />
          
          {/* Decorative circles */}
          <View style={styles.decorCircle1} />
          <View style={styles.decorCircle2} />
          
          {/* Main content */}
          <View style={styles.premiumHeaderContent}>
            {/* Left side - Title with emoji and glow */}
            <View style={styles.titleContainer}>
              <View style={styles.titleRow}>
                <Text style={styles.premiumTitle}>Hub</Text>
                <Text style={styles.titleEmoji}>✨</Text>
              </View>
              <Animated.View 
                style={[
                  styles.titleGlow,
                  { opacity: glowOpacity }
                ]} 
              />
            </View>
            
            {/* Right side - Premium action buttons */}
            <View style={styles.premiumHeaderButtons}>
              {/* Friends Button */}
              <Animated.View style={{ transform: [{ translateY: iconBounce1.interpolate({ inputRange: [0, 1], outputRange: [0, -4] }) }] }}>
                <TouchableOpacity
                  style={styles.premiumIconButton}
                  onPress={async () => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    const verified = await refreshEmailVerificationStatus();
                    if (!verified) {
                      Alert.alert(
                        'Verify Your Email',
                        'Please verify your email to access messaging and connect with friends.',
                        [
                          { text: 'Later', style: 'cancel' },
                          { text: 'Verify Now', onPress: () => navigation.navigate('EmailVerification', { fromSignup: false }) },
                        ]
                      );
                      return;
                    }
                    navigation.navigate('Friends');
                  }}
                  activeOpacity={0.7}
                >
                  <LinearGradient
                    colors={['#667eea', '#764ba2']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.iconGradient}
                  >
                    <Ionicons name="people" size={20} color="#FFFFFF" />
                  </LinearGradient>
                  {/* Unread messages badge */}
                  {totalUnreadMessages > 0 && (
                    <View style={styles.headerNotificationBadge}>
                      <Text style={styles.headerNotificationBadgeText}>
                        {totalUnreadMessages > 9 ? '9+' : totalUnreadMessages}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              </Animated.View>
              
              {/* Leaderboard Button */}
              <Animated.View style={{ transform: [{ translateY: iconBounce2.interpolate({ inputRange: [0, 1], outputRange: [0, -4] }) }] }}>
                <TouchableOpacity
                  style={styles.premiumIconButton}
                  onPress={async () => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    const verified = await refreshEmailVerificationStatus();
                    if (!verified) {
                      Alert.alert(
                        'Verify Your Email',
                        'Please verify your email to access the leaderboard and challenges.',
                        [
                          { text: 'Later', style: 'cancel' },
                          { text: 'Verify Now', onPress: () => navigation.navigate('EmailVerification', { fromSignup: false }) },
                        ]
                      );
                      return;
                    }
                    navigation.navigate('Leaderboard');
                  }}
                  activeOpacity={0.7}
                >
                  <LinearGradient
                    colors={['#f093fb', '#f5576c']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.iconGradient}
                  >
                    <Ionicons name="trophy" size={20} color="#FFFFFF" />
                  </LinearGradient>
                  {/* Pending challenges badge */}
                  {pendingChallengesCount > 0 && (
                    <View style={[styles.headerNotificationBadge, { backgroundColor: '#F59E0B' }]}>
                      <Text style={styles.headerNotificationBadgeText}>
                        {pendingChallengesCount > 9 ? '9+' : pendingChallengesCount}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              </Animated.View>
            </View>
          </View>
        </LinearGradient>
        
        {/* Curved bottom edge */}
        <View style={[styles.curvedEdge, { backgroundColor: theme.background }]} />
      </View>
    );
  };
  
  
  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <LinearGradient
        colors={['#8B5CF6', '#6366F1']}
        style={styles.emptyIcon}
      >
        <Ionicons name="chatbubbles" size={40} color="#FFFFFF" />
      </LinearGradient>
      <Text style={[styles.emptyTitle, { color: theme.text }]}>No Posts Yet</Text>
      <Text style={[styles.emptySubtitle, { color: theme.textSecondary }]}>
        Be the first to share something with the world!
      </Text>
    </View>
  );
  
  if (!user) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={styles.signInPrompt}>
          <Text style={[styles.signInText, { color: theme.text }]}>
            Sign in to access the Hub
          </Text>
        </View>
      </View>
    );
  }
  
  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {renderHeader()}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      ) : (
        <FlatList
          data={posts}
          renderItem={renderPost}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[
            styles.listContent,
            posts.length === 0 && styles.emptyListContent,
          ]}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={theme.primary}
            />
          }
          ListEmptyComponent={renderEmpty}
          showsVerticalScrollIndicator={false}
        />
      )}
      
      {/* Floating Action Button - moves up when mini players are active */}
      <Animated.View
        style={[
          styles.fabContainer,
          { 
            bottom: insets.bottom + 100
              + (hasActiveWorkout ? 70 : 0)
              + (isAudioPlaying ? 70 : 0),
            transform: [{ scale: fabScale }],
          },
        ]}
      >
        <TouchableOpacity onPress={handleFabPress} activeOpacity={0.9}>
          <LinearGradient
            colors={tokenStatus.hasToken ? ['#10B981', '#059669'] : ['#6B7280', '#4B5563']}
            style={styles.fab}
          >
            <Ionicons name="add" size={28} color="#FFFFFF" />
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>
      
      {/* Composer Modal - Ultra Premium Theme-Aware Design */}
      <Modal
        visible={showComposer}
        animationType="fade"
        presentationStyle="fullScreen"
        onRequestClose={() => setShowComposer(false)}
      >
        <View style={[styles.composerFullScreen, { backgroundColor: theme.background }]}>
          {/* Animated Background Gradient - Theme Aware */}
          <LinearGradient
            colors={isDark 
              ? [theme.primary + '40', theme.primary + '20', theme.background]
              : [theme.primary + '30', theme.primary + '15', theme.background]
            }
            style={styles.composerBgGradient}
          />
          
          {/* Floating Orbs for Depth */}
          <View style={[styles.floatingOrb1, { backgroundColor: theme.primary + '20' }]} />
          <View style={[styles.floatingOrb2, { backgroundColor: theme.primary + '15' }]} />
          <View style={[styles.floatingOrb3, { backgroundColor: theme.primary + '10' }]} />
          
          {/* Safe Area Header */}
          <View style={{ paddingTop: insets.top + 10, paddingHorizontal: 20 }}>
            {/* Top Bar */}
            <View style={styles.composerTopBar}>
              <TouchableOpacity 
                onPress={() => setShowComposer(false)}
                style={[styles.composerCloseBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]}
              >
                <Ionicons name="close" size={22} color={theme.text} />
              </TouchableOpacity>
              
              <TouchableOpacity
                onPress={handlePost}
                disabled={posting || !postContent.trim()}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={posting || !postContent.trim() 
                    ? [theme.textSecondary, theme.textSecondary]
                    : [theme.primary, theme.primary + 'CC']
                  }
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.composerPostBtnGradient}
                >
                  {posting ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <Text style={styles.composerPostBtnText}>Share</Text>
                      <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </View>
            
            {/* User Profile Section */}
            <View style={styles.composerProfileSection}>
              <View style={[styles.composerAvatarRing, { borderColor: theme.primary + '40' }]}>
                {userProfile?.profilePicture ? (
                  <Image source={{ uri: userProfile.profilePicture }} style={styles.composerAvatarLarge} />
                ) : (
                  <LinearGradient
                    colors={[theme.primary, theme.primary + 'AA']}
                    style={styles.composerAvatarLarge}
                  >
                    <Text style={styles.composerAvatarLetter}>
                      {(userProfile?.displayName || 'A').charAt(0).toUpperCase()}
                    </Text>
                  </LinearGradient>
                )}
              </View>
              <View style={styles.composerProfileInfo}>
                <Text style={[styles.composerProfileName, { color: theme.text }]}>
                  {userProfile?.displayName || 'Anonymous'}
                </Text>
                <View style={[styles.composerPublicBadge, { backgroundColor: theme.primary + '15' }]}>
                  <Ionicons name="earth" size={12} color={theme.primary} />
                  <Text style={[styles.composerPublicText, { color: theme.primary }]}>Everyone can see</Text>
                </View>
              </View>
            </View>
          </View>
          
          {/* Main Content Area */}
          <KeyboardAvoidingView 
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.composerMainContent}
            keyboardVerticalOffset={0}
          >
            {/* Text Input Card */}
            <View style={[styles.composerInputCard, { 
              backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#FFFFFF',
              borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
            }]}>
              <TextInput
                style={[styles.composerTextInput, { color: theme.text }]}
                placeholder="What would you like to share today?"
                placeholderTextColor={theme.textSecondary}
                value={postContent}
                onChangeText={setPostContent}
                multiline
                maxLength={280}
                autoFocus
                textAlignVertical="top"
              />
            </View>
            
            {/* Bottom Section */}
            <View style={styles.composerBottomSection}>
              {/* Character Counter */}
              <View style={styles.composerCharSection}>
                <View style={[styles.composerCharCircle, { borderColor: theme.primary + '30' }]}>
                  <View 
                    style={[
                      styles.composerCharFill,
                      { 
                        backgroundColor: postContent.length > 260 ? '#EF4444' : postContent.length > 200 ? '#F59E0B' : theme.primary,
                        height: `${Math.min((postContent.length / 280) * 100, 100)}%`,
                      }
                    ]}
                  />
                </View>
                <Text style={[
                  styles.composerCharNumber,
                  { color: postContent.length > 260 ? '#EF4444' : postContent.length > 200 ? '#F59E0B' : theme.textSecondary }
                ]}>
                  {280 - postContent.length}
                </Text>
              </View>
              
              {/* Inspiration Quote */}
              <View style={[styles.composerInspirationCard, { backgroundColor: theme.primary + '10' }]}>
                <Ionicons name="bulb" size={18} color={theme.primary} />
                <Text style={[styles.composerInspirationText, { color: theme.text }]}>
                  {postContent.length === 0 
                    ? "Share a thought that matters to you"
                    : postContent.length < 50 
                      ? "Keep going, you're doing great!"
                      : postContent.length < 150
                        ? "Nice! Your message is taking shape"
                        : "Almost there, wrap it up beautifully!"}
                </Text>
              </View>
              
              {/* 7 Day Notice */}
              <View style={styles.expiryNotice}>
                <Ionicons name="time-outline" size={14} color={theme.textTertiary} />
                <Text style={[styles.expiryNoticeText, { color: theme.textTertiary }]}>
                  Posts disappear after 7 days
                </Text>
              </View>
            </View>
          </KeyboardAvoidingView>
          
          {/* Full-screen posting overlay */}
          {posting && (
            <Animated.View
              style={{
                ...StyleSheet.absoluteFillObject,
                backgroundColor: isDark ? 'rgba(0,0,0,0.85)' : 'rgba(255,255,255,0.92)',
                justifyContent: 'center',
                alignItems: 'center',
                zIndex: 999,
                opacity: postingOverlayAnim,
              }}
              pointerEvents="auto"
            >
              <Animated.View style={{
                transform: [{ scale: postingScale }],
                alignItems: 'center',
              }}>
                {postingSuccess ? (
                  <>
                    <View style={{
                      width: 80,
                      height: 80,
                      borderRadius: 40,
                      backgroundColor: '#10B981',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginBottom: 20,
                      shadowColor: '#10B981',
                      shadowOffset: { width: 0, height: 4 },
                      shadowOpacity: 0.4,
                      shadowRadius: 12,
                    }}>
                      <Ionicons name="checkmark" size={40} color="#FFFFFF" />
                    </View>
                    <Text style={{
                      fontSize: 24,
                      fontWeight: '700',
                      color: isDark ? '#FFFFFF' : '#1a1a2e',
                      marginBottom: 8,
                    }}>Shared!</Text>
                    <Text style={{
                      fontSize: 15,
                      color: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.5)',
                    }}>Your post is now live</Text>
                  </>
                ) : (
                  <>
                    <Animated.View style={{
                      width: 80,
                      height: 80,
                      borderRadius: 40,
                      backgroundColor: theme.primary + '20',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginBottom: 20,
                      transform: [{
                        rotate: postingIconSpin.interpolate({
                          inputRange: [0, 1],
                          outputRange: ['0deg', '360deg'],
                        }),
                      }],
                    }}>
                      <Ionicons name="paper-plane" size={32} color={theme.primary} />
                    </Animated.View>
                    <Text style={{
                      fontSize: 24,
                      fontWeight: '700',
                      color: isDark ? '#FFFFFF' : '#1a1a2e',
                      marginBottom: 8,
                    }}>Sharing...</Text>
                    <Text style={{
                      fontSize: 15,
                      color: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.5)',
                    }}>Sending your post to the world</Text>
                  </>
                )}
              </Animated.View>
            </Animated.View>
          )}
        </View>
      </Modal>
      
      {/* Expanded Post Overlay - Stunning Pop-out Effect */}
      {expandedPost && (
        <TouchableOpacity
          activeOpacity={1}
          onPress={handleCollapsePost}
          style={styles.expandedOverlay}
        >
          <Animated.View 
            style={[
              styles.expandedBackdrop,
              { opacity: expandAnim }
            ]}
          />
          
          {/* Floating particles/orbs for extra magic */}
          <Animated.View style={[styles.floatingOrb, styles.expandOrb1, { 
            opacity: expandAnim,
            transform: [
              { translateY: glowPulse.interpolate({ inputRange: [0, 1], outputRange: [0, -20] }) },
              { scale: glowPulse.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1.2] }) },
            ]
          }]} />
          <Animated.View style={[styles.floatingOrb, styles.expandOrb2, { 
            opacity: expandAnim,
            transform: [
              { translateY: glowPulse.interpolate({ inputRange: [0, 1], outputRange: [0, 15] }) },
              { scale: glowPulse.interpolate({ inputRange: [0, 1], outputRange: [1, 0.7] }) },
            ]
          }]} />
          <Animated.View style={[styles.floatingOrb, styles.expandOrb3, { 
            opacity: expandAnim,
            transform: [
              { translateX: glowPulse.interpolate({ inputRange: [0, 1], outputRange: [-10, 10] }) },
              { scale: glowPulse.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1.1] }) },
            ]
          }]} />
          
          {/* The expanded post card */}
          <Animated.View
            style={[
              styles.expandedCard,
              {
                backgroundColor: isDark ? '#1a1a2e' : '#FFFFFF',
                transform: [
                  { scale: expandScale },
                  { rotate: expandRotate.interpolate({
                    inputRange: [-10, 0],
                    outputRange: ['-3deg', '0deg'],
                  })},
                ],
                opacity: expandAnim,
              }
            ]}
          >
            {/* Glowing border effect */}
            <Animated.View style={[
              styles.expandedGlow,
              { 
                opacity: glowPulse.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.3, 0.8],
                })
              }
            ]} />
            
            {/* Author section */}
            <View style={styles.expandedHeader}>
              {expandedPost.authorPhoto ? (
                <Image source={{ uri: expandedPost.authorPhoto }} style={styles.expandedAvatar} />
              ) : (
                <LinearGradient
                  colors={['#8B5CF6', '#6366F1']}
                  style={styles.expandedAvatar}
                >
                  <Text style={styles.expandedAvatarText}>
                    {(expandedPost.authorName || 'A').charAt(0).toUpperCase()}
                  </Text>
                </LinearGradient>
              )}
              <View style={styles.expandedAuthorInfo}>
                <Text style={[styles.expandedAuthorName, { color: theme.text }]}>
                  {expandedPost.authorName} {expandedPost.authorCountry}
                </Text>
                <Text style={[styles.expandedUsername, { color: theme.textSecondary }]}>
                  @{expandedPost.authorUsername}
                </Text>
              </View>
              <Text style={[styles.expandedTime, { color: theme.textTertiary }]}>
                {formatTimeAgo(expandedPost.createdAt)}
              </Text>
            </View>
            
            {/* Content - Big and beautiful */}
            <Text style={[styles.expandedContent, { color: theme.text }]}>
              {expandedPost.content}
            </Text>
            
            {/* Stats row */}
            <View style={styles.expandedStats}>
              <View style={styles.expandedStatItem}>
                <Ionicons name="eye" size={18} color={theme.primary} />
                <Text style={[styles.expandedStatText, { color: theme.text }]}>
                  {formatNumber(expandedPost.views || 0)} views
                </Text>
              </View>
            </View>
            
            {/* Tap to close hint */}
            <Text style={[styles.expandedHint, { color: theme.textTertiary }]}>
              Tap anywhere to close
            </Text>
          </Animated.View>
        </TouchableOpacity>
      )}
      
      {/* Friends - now navigated via stack navigator for swipe-back support */}
      
      {/* Leaderboard - now navigated via stack navigator for swipe-back support */}

      <ReportBlockModal
        visible={!!reportTarget}
        onClose={() => setReportTarget(null)}
        contentType="post"
        contentId={reportTarget?.id}
        reportedUserId={reportTarget?.userId}
        currentUserId={user?.uid}
        displayName={reportTarget?.authorName || 'this user'}
        onBlock={() => {
          setPosts(prev => prev.filter(p => p.userId !== reportTarget?.userId));
          setReportTarget(null);
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  // Premium Header Styles
  premiumHeader: {
    paddingBottom: 30,
    position: 'relative',
    overflow: 'hidden',
  },
  shimmerEffect: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 100,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    transform: [{ skewX: '-20deg' }],
  },
  premiumHeaderContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 12,
    zIndex: 10,
  },
  titleContainer: {
    position: 'relative',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  premiumTitle: {
    fontSize: 38,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -1,
    textShadowColor: 'rgba(0, 0, 0, 0.4)',
    textShadowOffset: { width: 0, height: 3 },
    textShadowRadius: 6,
  },
  titleEmoji: {
    fontSize: 24,
  },
  titleGlow: {
    position: 'absolute',
    top: -15,
    left: -15,
    right: -15,
    bottom: -15,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: 25,
    zIndex: -1,
  },
  premiumHeaderButtons: {
    flexDirection: 'row',
    gap: 14,
  },
  premiumIconButton: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 10,
    position: 'relative',
  },
  headerNotificationBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#EF4444',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 5,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  headerNotificationBadgeText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '700',
  },
  iconGradient: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2.5,
    borderColor: 'rgba(255, 255, 255, 0.4)',
  },
  floatingOrb: {
    position: 'absolute',
    borderRadius: 100,
  },
  orb1: {
    width: 150,
    height: 150,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    top: -50,
    right: -40,
    borderRadius: 75,
  },
  orb2: {
    width: 100,
    height: 100,
    backgroundColor: 'rgba(255, 215, 0, 0.25)',
    bottom: -30,
    left: 40,
    borderRadius: 50,
  },
  orb3: {
    width: 70,
    height: 70,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    top: 10,
    left: -25,
    borderRadius: 35,
  },
  decorCircle1: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    top: -100,
    right: -50,
  },
  decorCircle2: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    bottom: -40,
    left: -30,
  },
  curvedEdge: {
    height: 20,
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    marginTop: -20,
  },
  // Legacy header styles (keep for compatibility)
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 15,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  headerButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  headerButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 120,
  },
  emptyListContent: {
    flex: 1,
  },
  postCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  postHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  authorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  authorAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  authorDetails: {
    marginLeft: 12,
    flex: 1,
  },
  authorNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  authorName: {
    fontSize: 15,
    fontWeight: '700',
  },
  authorCountry: {
    fontSize: 14,
  },
  postTimeTop: {
    fontSize: 11,
    fontWeight: '500',
    marginBottom: 2,
  },
  authorUsername: {
    fontSize: 13,
    marginTop: 2,
  },
  moreButton: {
    padding: 4,
  },
  postContent: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 12,
  },
  viewsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  viewsText: {
    fontSize: 13,
    fontWeight: '500',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
  },
  fabContainer: {
    position: 'absolute',
    right: 20,
  },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  // Ultra Premium Composer Styles
  composerFullScreen: {
    flex: 1,
    overflow: 'hidden',
  },
  composerBgGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 350,
  },
  floatingOrb1: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    top: -50,
    right: -50,
  },
  floatingOrb2: {
    position: 'absolute',
    width: 150,
    height: 150,
    borderRadius: 75,
    top: 100,
    left: -40,
  },
  floatingOrb3: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    top: 200,
    right: 30,
  },
  composerTopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 30,
  },
  composerCloseBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  composerPostBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  composerPostBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  composerProfileSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  composerAvatarRing: {
    padding: 3,
    borderRadius: 35,
    borderWidth: 2,
  },
  composerAvatarLarge: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  composerAvatarLetter: {
    fontSize: 26,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  composerProfileInfo: {
    marginLeft: 16,
    flex: 1,
  },
  composerProfileName: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 6,
  },
  composerPublicBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    gap: 5,
  },
  composerPublicText: {
    fontSize: 12,
    fontWeight: '600',
  },
  composerMainContent: {
    flex: 1,
    paddingHorizontal: 20,
  },
  composerInputCard: {
    flex: 1,
    borderRadius: 28,
    padding: 24,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 8,
  },
  composerTextInput: {
    flex: 1,
    fontSize: 19,
    lineHeight: 30,
    fontWeight: '400',
  },
  composerBottomSection: {
    paddingVertical: 20,
    gap: 12,
  },
  composerCharSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  composerCharCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 3,
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  composerCharFill: {
    width: '100%',
    borderRadius: 18,
  },
  composerCharNumber: {
    fontSize: 15,
    fontWeight: '700',
  },
  composerInspirationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 16,
    gap: 10,
  },
  composerInspirationText: {
    fontSize: 13,
    fontWeight: '500',
    flex: 1,
  },
  expiryNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 12,
  },
  expiryNoticeText: {
    fontSize: 12,
    fontWeight: '500',
  },
  signInPrompt: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  signInText: {
    fontSize: 16,
  },
  // Expanded Post Overlay Styles
  expandedOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  expandedBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
  },
  floatingOrb: {
    position: 'absolute',
    borderRadius: 999,
  },
  expandOrb1: {
    width: 120,
    height: 120,
    backgroundColor: 'rgba(139, 92, 246, 0.3)',
    top: '15%',
    left: '10%',
  },
  expandOrb2: {
    width: 80,
    height: 80,
    backgroundColor: 'rgba(236, 72, 153, 0.25)',
    top: '25%',
    right: '5%',
  },
  expandOrb3: {
    width: 60,
    height: 60,
    backgroundColor: 'rgba(34, 211, 238, 0.3)',
    bottom: '20%',
    left: '15%',
  },
  expandedCard: {
    width: SCREEN_WIDTH - 40,
    maxWidth: 400,
    borderRadius: 24,
    padding: 24,
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.5,
    shadowRadius: 40,
    elevation: 25,
    overflow: 'hidden',
  },
  expandedGlow: {
    position: 'absolute',
    top: -2,
    left: -2,
    right: -2,
    bottom: -2,
    borderRadius: 26,
    borderWidth: 2,
    borderColor: '#8B5CF6',
  },
  expandedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  expandedAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: 'rgba(139, 92, 246, 0.5)',
  },
  expandedAvatarText: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '700',
  },
  expandedAuthorInfo: {
    flex: 1,
    marginLeft: 14,
  },
  expandedAuthorName: {
    fontSize: 18,
    fontWeight: '700',
  },
  expandedUsername: {
    fontSize: 14,
    marginTop: 2,
  },
  expandedTime: {
    fontSize: 13,
    fontWeight: '500',
  },
  expandedContent: {
    fontSize: 22,
    lineHeight: 32,
    fontWeight: '500',
    marginBottom: 24,
  },
  expandedStats: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(139, 92, 246, 0.2)',
  },
  expandedStatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  expandedStatText: {
    fontSize: 15,
    fontWeight: '600',
  },
  expandedHint: {
    textAlign: 'center',
    marginTop: 20,
    fontSize: 12,
    fontStyle: 'italic',
  },
});

export default HubTab;

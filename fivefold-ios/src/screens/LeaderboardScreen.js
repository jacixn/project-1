/**
 * Leaderboard Screen - Premium Edition
 * 
 * Stunning UI with:
 * - Animated gradient header with glow effects
 * - Beautiful podium with crowns and medals
 * - Glass morphism cards with shimmer
 * - Smooth animations throughout
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  Image,
  Dimensions,
  Animated,
  ScrollView,
} from 'react-native';
import { MaterialIcons, FontAwesome5, Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { getFriendsWithStats } from '../services/friendsService';
import { syncUserStatsToCloud } from '../services/userSyncService';
import { 
  collection, 
  query, 
  where, 
  limit, 
  getDocs 
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { hapticFeedback } from '../utils/haptics';
import LottieView from 'lottie-react-native';
import AchievementService from '../services/achievementService';
import { getReferralCount } from '../services/referralService';
import userStorage from '../utils/userStorage';

// Must match CustomisationScreen BADGE_REFERRAL_GATES exactly
const BADGE_REFERRAL_GATES = { country: null, streak: 6, verified: 3, biblely: 10 };

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

const { width, height } = Dimensions.get('window');

const LeaderboardScreen = ({ navigation, onClose }) => {
  const { theme, isDark } = useTheme();
  const { user, userProfile } = useAuth();
  const insets = useSafeAreaInsets();
  
  // Badge toggles for current user
  const [badgeToggles, setBadgeToggles] = useState({});
  const [myReferralCount, setMyReferralCount] = useState(0);
  const [myStreakAnim, setMyStreakAnim] = useState('fire1');
  useEffect(() => {
    userStorage.getRaw('fivefold_badge_toggles').then(raw => {
      if (raw) {
        setBadgeToggles(JSON.parse(raw));
      } else {
        // Fallback to old key
        userStorage.getRaw('fivefold_bluetick_enabled').then(val => {
          setBadgeToggles({ verified: val !== 'false' });
        });
      }
    });
    getReferralCount().then(c => setMyReferralCount(c)).catch(() => {});
    userStorage.getRaw('fivefold_streak_animation').then(v => { if (v) setMyStreakAnim(v); }).catch(() => {});
  }, []);
  
  // State
  const [activeTab, setActiveTab] = useState('friends');
  const [sortBy, setSortBy] = useState('points');
  const [friendsLeaderboard, setFriendsLeaderboard] = useState([]);
  const [globalLeaderboard, setGlobalLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Animations
  const headerAnim = useRef(new Animated.Value(0)).current;
  const podiumAnim = useRef(new Animated.Value(0)).current;
  const listAnim = useRef(new Animated.Value(0)).current;
  const crownBounce = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;
  
  // Start animations
  useEffect(() => {
    Animated.parallel([
      Animated.timing(headerAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(podiumAnim, {
        toValue: 1,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
        delay: 200,
      }),
      Animated.timing(listAnim, {
        toValue: 1,
        duration: 500,
        delay: 400,
        useNativeDriver: true,
      }),
    ]).start();
    
    // Crown bounce animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(crownBounce, {
          toValue: 1.1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(crownBounce, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();
    
    // Glow animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(glowAnim, {
          toValue: 0,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);
  
  // Load data on mount and when tab/sort changes
  useEffect(() => {
    if (user) {
      loadData();
    } else {
      setLoading(false);
    }
  }, [user, activeTab, sortBy]);
  
  const loadData = async () => {
    if (!user) return;
    
    try {
      // Sync local points to Firebase in the BACKGROUND — don't block leaderboard display
      syncUserStatsToCloud(user.uid).catch(err => 
        console.warn('[Leaderboard] Background sync failed:', err?.message)
      );
      
      if (activeTab === 'friends') {
        await loadFriendsLeaderboard();
      } else {
        await loadGlobalLeaderboard();
      }
    } catch (error) {
      console.error('Error loading leaderboard:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };
  
  const loadFriendsLeaderboard = async () => {
    const friends = await getFriendsWithStats(user.uid);
    
    // Read points from single source of truth: total_points key
    let freshTotalPoints = 0;
    let freshStreak = 0;
    
    try {
      // Single source of truth for points
      const totalPointsStr = await userStorage.getRaw('total_points');
      if (totalPointsStr) {
        freshTotalPoints = parseInt(totalPointsStr, 10) || 0;
      }
      
      // Streak from app_open_streak (AppStreakManager's key)
      const appStreakStr = await userStorage.getRaw('app_open_streak');
      if (appStreakStr) {
        const appStreakData = JSON.parse(appStreakStr);
        freshStreak = appStreakData.currentStreak || 0;
      }
      
      console.log('[Leaderboard] Fresh data:', { freshTotalPoints, freshStreak });
    } catch (err) {
      console.warn('Error getting fresh points:', err);
    }
    
    // Get local stats for badge display
    let localBadgeStats = {};
    try {
      const mergedStats = await AchievementService.getStats();
      localBadgeStats = mergedStats || {};
    } catch (e) {}

    // Add current user to the list with fresh data
    const currentUserEntry = {
      uid: user.uid,
      displayName: userProfile?.displayName || user.displayName || 'You',
      username: userProfile?.username || 'you',
      profilePicture: userProfile?.profilePicture || '',
      countryFlag: userProfile?.countryFlag || '',
      totalPoints: freshTotalPoints,
      currentStreak: freshStreak,
      isCurrentUser: true,
      prayersCompleted: localBadgeStats.prayersCompleted || userProfile?.prayersCompleted || 0,
    };
    
    const allUsers = [currentUserEntry, ...friends];
    
    // Sort by selected metric
    const sorted = allUsers.sort((a, b) => {
      if (sortBy === 'points') {
        return (b.totalPoints || 0) - (a.totalPoints || 0);
      } else if (sortBy === 'streak') {
        return (b.currentStreak || 0) - (a.currentStreak || 0);
      } else if (sortBy === 'workouts') {
        return (b.workoutsCompleted || 0) - (a.workoutsCompleted || 0);
      } else if (sortBy === 'tasks') {
        return (b.tasksCompleted || 0) - (a.tasksCompleted || 0);
      }
      return 0;
    });
    
    // Add rank
    const ranked = sorted.map((u, index) => ({
      ...u,
      rank: index + 1,
    }));
    
    setFriendsLeaderboard(ranked);
  };
  
  const loadGlobalLeaderboard = async () => {
    try {
      const usersRef = collection(db, 'users');
      
      // Simple query without orderBy to avoid needing composite index
      // We'll sort in memory instead
      const q = query(
        usersRef,
        where('isPublic', '==', true),
        limit(100)
      );
      
      const querySnapshot = await getDocs(q);
      const users = [];
      
      querySnapshot.forEach((doc) => {
        users.push({
          uid: doc.id,
          ...doc.data(),
          isCurrentUser: doc.id === user.uid,
        });
      });
      
      // Read points from single source of truth: total_points key
      let freshTotalPoints = 0;
      let freshStreak = 0;
      
      try {
        // Single source of truth for points
        const totalPointsStr = await userStorage.getRaw('total_points');
        if (totalPointsStr) {
          freshTotalPoints = parseInt(totalPointsStr, 10) || 0;
        }
        
        // Streak from app_open_streak (AppStreakManager's key)
        const appStreakStr = await userStorage.getRaw('app_open_streak');
        if (appStreakStr) {
          const appStreakData = JSON.parse(appStreakStr);
          freshStreak = appStreakData.currentStreak || 0;
        }
      } catch (err) {
        console.warn('[Global Leaderboard] Error getting fresh local points:', err);
      }
      
      // Update current user's entry with fresh local data
      const currentUserIndex = users.findIndex(u => u.uid === user.uid);
      if (currentUserIndex !== -1) {
        // User is in global list, update with fresh local points (single source of truth)
        users[currentUserIndex].totalPoints = freshTotalPoints;
        users[currentUserIndex].currentStreak = freshStreak;
      } else if (userProfile?.isPublic) {
        // User should be in global but isn't in query results, add them
        // Get local stats for badge display
        let localBadgeStats2 = {};
        try {
          const mergedStats2 = await AchievementService.getStats();
          localBadgeStats2 = mergedStats2 || {};
        } catch (e) {}

        users.push({
          uid: user.uid,
          displayName: userProfile?.displayName || user.displayName || 'You',
          username: userProfile?.username || 'you',
          profilePicture: userProfile?.profilePicture || '',
          countryFlag: userProfile?.countryFlag || '',
          totalPoints: freshTotalPoints,
          currentStreak: freshStreak,
          isCurrentUser: true,
          isPublic: true,
          prayersCompleted: localBadgeStats2.prayersCompleted || userProfile?.prayersCompleted || 0,
        });
      }
      
      // Sort in memory based on selected metric
      const sortFieldMap = {
        points: 'totalPoints',
        streak: 'currentStreak',
        workouts: 'workoutsCompleted',
        tasks: 'tasksCompleted',
      };
      const sortField = sortFieldMap[sortBy] || 'totalPoints';
      users.sort((a, b) => (b[sortField] || 0) - (a[sortField] || 0));
      
      // Add rank
      const ranked = users.map((u, index) => ({
        ...u,
        rank: index + 1,
      }));
      
      setGlobalLeaderboard(ranked);
    } catch (error) {
      console.error('Error loading global leaderboard:', error);
      setGlobalLeaderboard([]);
    }
  };
  
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadData();
  }, [user, activeTab, sortBy]);
  
  const formatNumber = (num) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num?.toLocaleString() || '0';
  };
  
  const getScoreValue = (item) => {
    switch (sortBy) {
      case 'points':
        return item.totalPoints || 0;
      case 'streak':
        return item.currentStreak || 0;
      case 'workouts':
        return item.workoutsCompleted || 0;
      case 'tasks':
        return item.tasksCompleted || 0;
      default:
        return item.totalPoints || 0;
    }
  };
  
  const getScoreLabel = () => {
    switch (sortBy) {
      case 'points':
        return 'pts';
      case 'streak':
        return 'days';
      case 'workouts':
        return 'done';
      case 'tasks':
        return 'done';
      default:
        return 'pts';
    }
  };
  
  const getScoreIcon = () => {
    switch (sortBy) {
      case 'points':
        return { name: 'star', color: '#FFD700' };
      case 'streak':
        return { name: 'local-fire-department', color: '#FF6B35' };
      case 'workouts':
        return { name: 'fitness-center', color: '#10B981' };
      case 'tasks':
        return { name: 'check-circle', color: '#8B5CF6' };
      default:
        return { name: 'star', color: '#FFD700' };
    }
  };
  
  // Render single user card (for when there's only 1-2 users)
  const renderUserCard = (item, index) => {
    const isFirst = item.rank === 1;
    const isSecond = item.rank === 2;
    const isThird = item.rank === 3;
    
    const rankColors = {
      1: ['#FFD700', '#FFA500'],
      2: ['#C0C0C0', '#A8A8A8'],
      3: ['#CD7F32', '#B8860B'],
    };
    
    const gradientColors = rankColors[item.rank] || [theme.primary, theme.primary];
    
    return (
      <Animated.View
        key={item.uid}
        style={[
          styles.userCard,
          {
            backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.9)',
            borderWidth: item.isCurrentUser ? 2 : 0,
            borderColor: item.isCurrentUser ? theme.primary : 'transparent',
            transform: [{
              translateY: listAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [50, 0],
              }),
            }],
            opacity: listAnim,
          }
        ]}
      >
        {/* Rank Badge */}
        <LinearGradient
          colors={gradientColors}
          style={styles.rankBadge}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          {isFirst ? (
            <FontAwesome5 name="crown" size={14} color="#FFF" />
          ) : isSecond || isThird ? (
            <FontAwesome5 name="medal" size={14} color="#FFF" />
          ) : (
            <Text style={styles.rankBadgeText}>{item.rank}</Text>
          )}
        </LinearGradient>
        
        {/* Avatar */}
        <View style={[styles.cardAvatar, { borderColor: gradientColors[0] }]}>
          {item.profilePicture ? (
            <Image source={{ uri: item.profilePicture }} style={styles.cardAvatarImage} />
          ) : (
            <LinearGradient
              colors={[theme.primary + '40', theme.primary + '20']}
              style={styles.cardAvatarPlaceholder}
            >
              <MaterialIcons name="person" size={28} color={theme.primary} />
            </LinearGradient>
          )}
        </View>
        
        {/* Info */}
        <View style={styles.cardInfo}>
          <View style={styles.cardNameRow}>
            <Text style={[styles.cardName, { color: theme.text }]} numberOfLines={1}>
              {item.displayName || 'User'}
            </Text>
            {/* Country flag or globe — respect toggle for current user */}
            {!(item.isCurrentUser && badgeToggles.country === false) && (
              item.countryFlag ? (
                <Text style={{ fontSize: 14, marginLeft: 2 }}>{item.countryFlag}</Text>
              ) : (
                <MaterialIcons name="public" size={14} color={theme.textSecondary} style={{ marginLeft: 2, opacity: 0.5 }} />
              )
            )}
            {/* Streak animation badge — gated by 6 referrals + toggle */}
            {item.isCurrentUser && badgeToggles.streak !== false && myReferralCount >= 6 && (
              <LottieView source={getStreakAnimSource(myStreakAnim)} autoPlay loop style={{ width: 18, height: 18, marginLeft: 4 }} />
            )}
            {/* Profile badges — gated only by referrals + toggles, no achievements */}
            {AchievementService.PROFILE_BADGES
              .filter(badge => {
                const toggles = item.isCurrentUser ? badgeToggles : (item.badgeToggles || {});
                if (toggles[badge.id] === false) return false;
                const req = BADGE_REFERRAL_GATES[badge.id];
                const refCount = item.isCurrentUser ? myReferralCount : (item.referralCount || 0);
                if (req != null && refCount < req) return false;
                return true;
              })
              .map(badge => (
              badge.image
                ? <Image key={badge.id} source={badge.image} style={{ width: 16, height: 16, marginLeft: 4, borderRadius: 4 }} resizeMode="contain" />
                : <MaterialIcons key={badge.id} name={badge.icon} size={16} color={badge.color} style={{ marginLeft: 4 }} />
            ))}
            {item.isCurrentUser && (
              <View style={[styles.youBadge, { backgroundColor: theme.primary + '20' }]}>
                <Text style={[styles.youBadgeText, { color: theme.primary }]}>You</Text>
              </View>
            )}
          </View>
          <Text style={[styles.cardUsername, { color: theme.textSecondary }]}>
            @{item.username || 'unknown'}
          </Text>
        </View>
        
        {/* Score */}
        <View style={styles.cardScore}>
          <Text style={[styles.cardScoreValue, { color: theme.text }]}>
            {formatNumber(getScoreValue(item))}
          </Text>
          <View style={styles.cardScoreLabel}>
            <MaterialIcons name={getScoreIcon().name} size={12} color={getScoreIcon().color} />
            <Text style={[styles.cardScoreLabelText, { color: theme.textSecondary }]}>
              {getScoreLabel()}
            </Text>
          </View>
        </View>
      </Animated.View>
    );
  };
  
  // Render podium (only when 3+ users)
  const renderPodium = () => {
    const data = activeTab === 'friends' ? friendsLeaderboard : globalLeaderboard;
    if (data.length < 3) return null;
    
    const first = data[0];
    const second = data[1];
    const third = data[2];
    
    const glowOpacity = glowAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [0.3, 0.8],
    });
    
    return (
      <Animated.View 
        style={[
          styles.podiumContainer,
          {
            transform: [{
              scale: podiumAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [0.8, 1],
              }),
            }],
            opacity: podiumAnim,
          }
        ]}
      >
        {/* Background glow */}
        <Animated.View style={[styles.podiumGlow, { opacity: glowOpacity }]}>
          <LinearGradient
            colors={['transparent', '#FFD700' + '20', 'transparent']}
            style={StyleSheet.absoluteFill}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
          />
        </Animated.View>
        
        {/* Second Place */}
        <View style={styles.podiumItem}>
          <View style={styles.podiumAvatarContainer}>
            <LinearGradient
              colors={['#C0C0C0', '#A8A8A8']}
              style={styles.podiumAvatarBorder}
            >
              <View style={[styles.podiumAvatar, styles.podiumAvatarSmall]}>
                {second.profilePicture ? (
                  <Image source={{ uri: second.profilePicture }} style={styles.podiumAvatarImage} />
                ) : (
                  <View style={[styles.podiumAvatarPlaceholder, { backgroundColor: '#C0C0C0' + '30' }]}>
                    <MaterialIcons name="person" size={26} color="#C0C0C0" />
                  </View>
                )}
              </View>
            </LinearGradient>
            <View style={styles.podiumMedalContainer}>
              <LinearGradient
                colors={['#C0C0C0', '#A8A8A8']}
                style={styles.podiumMedal}
              >
                <Text style={styles.podiumMedalText}>2</Text>
              </LinearGradient>
            </View>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
            <Text style={[styles.podiumName, { color: theme.text }]} numberOfLines={1}>
              {second.displayName?.split(' ')[0] || 'User'}
            </Text>
            {!(second.isCurrentUser && badgeToggles.country === false) && second.countryFlag ? (
              <Text style={{ fontSize: 12, marginLeft: 4 }}>{second.countryFlag}</Text>
            ) : null}
            {second.isCurrentUser && badgeToggles.streak !== false && myReferralCount >= 6 && (
              <LottieView source={getStreakAnimSource(myStreakAnim)} autoPlay loop style={{ width: 16, height: 16, marginLeft: 3 }} />
            )}
            {AchievementService.PROFILE_BADGES
              .filter(badge => {
                const toggles = second.isCurrentUser ? badgeToggles : (second.badgeToggles || {});
                if (toggles[badge.id] === false) return false;
                const req = BADGE_REFERRAL_GATES[badge.id];
                const refCount = second.isCurrentUser ? myReferralCount : (second.referralCount || 0);
                if (req != null && refCount < req) return false;
                return true;
              })
              .map(badge => (
              badge.image
                ? <Image key={badge.id} source={badge.image} style={{ width: 14, height: 14, marginLeft: 3, borderRadius: 3 }} resizeMode="contain" />
                : <MaterialIcons key={badge.id} name={badge.icon} size={14} color={badge.color} style={{ marginLeft: 3 }} />
            ))}
          </View>
          <Text style={[styles.podiumScore, { color: theme.textSecondary }]}>
            {formatNumber(getScoreValue(second))}
          </Text>
          <LinearGradient
            colors={['#C0C0C0', '#A8A8A8']}
            style={[styles.podiumBar, styles.podiumBarSecond]}
          />
        </View>
        
        {/* First Place - Center */}
        <View style={[styles.podiumItem, styles.podiumItemFirst]}>
          <Animated.View style={{ transform: [{ scale: crownBounce }] }}>
            <FontAwesome5 name="crown" size={28} color="#FFD700" style={styles.crown} />
          </Animated.View>
          <View style={styles.podiumAvatarContainer}>
            <LinearGradient
              colors={['#FFD700', '#FFA500']}
              style={[styles.podiumAvatarBorder, styles.podiumAvatarBorderFirst]}
            >
              <View style={[styles.podiumAvatar, styles.podiumAvatarFirst]}>
                {first.profilePicture ? (
                  <Image source={{ uri: first.profilePicture }} style={styles.podiumAvatarImage} />
                ) : (
                  <View style={[styles.podiumAvatarPlaceholder, { backgroundColor: '#FFD700' + '30' }]}>
                    <MaterialIcons name="person" size={36} color="#FFD700" />
                  </View>
                )}
              </View>
            </LinearGradient>
            <View style={styles.podiumMedalContainer}>
              <LinearGradient
                colors={['#FFD700', '#FFA500']}
                style={[styles.podiumMedal, styles.podiumMedalFirst]}
              >
                <Text style={[styles.podiumMedalText, styles.podiumMedalTextFirst]}>1</Text>
              </LinearGradient>
            </View>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
            <Text style={[styles.podiumName, styles.podiumNameFirst, { color: theme.text }]} numberOfLines={1}>
              {first.displayName?.split(' ')[0] || 'User'}
            </Text>
            {!(first.isCurrentUser && badgeToggles.country === false) && first.countryFlag ? (
              <Text style={{ fontSize: 14, marginLeft: 4 }}>{first.countryFlag}</Text>
            ) : null}
            {first.isCurrentUser && badgeToggles.streak !== false && myReferralCount >= 6 && (
              <LottieView source={getStreakAnimSource(myStreakAnim)} autoPlay loop style={{ width: 18, height: 18, marginLeft: 3 }} />
            )}
            {AchievementService.PROFILE_BADGES
              .filter(badge => {
                const toggles = first.isCurrentUser ? badgeToggles : (first.badgeToggles || {});
                if (toggles[badge.id] === false) return false;
                const req = BADGE_REFERRAL_GATES[badge.id];
                const refCount = first.isCurrentUser ? myReferralCount : (first.referralCount || 0);
                if (req != null && refCount < req) return false;
                return true;
              })
              .map(badge => (
              badge.image
                ? <Image key={badge.id} source={badge.image} style={{ width: 16, height: 16, marginLeft: 3, borderRadius: 4 }} resizeMode="contain" />
                : <MaterialIcons key={badge.id} name={badge.icon} size={16} color={badge.color} style={{ marginLeft: 3 }} />
            ))}
          </View>
          <Text style={[styles.podiumScore, styles.podiumScoreFirst, { color: '#FFD700' }]}>
            {formatNumber(getScoreValue(first))}
          </Text>
          <LinearGradient
            colors={['#FFD700', '#FFA500']}
            style={[styles.podiumBar, styles.podiumBarFirst]}
          />
        </View>
        
        {/* Third Place */}
        <View style={styles.podiumItem}>
          <View style={styles.podiumAvatarContainer}>
            <LinearGradient
              colors={['#CD7F32', '#B8860B']}
              style={styles.podiumAvatarBorder}
            >
              <View style={[styles.podiumAvatar, styles.podiumAvatarSmall]}>
                {third.profilePicture ? (
                  <Image source={{ uri: third.profilePicture }} style={styles.podiumAvatarImage} />
                ) : (
                  <View style={[styles.podiumAvatarPlaceholder, { backgroundColor: '#CD7F32' + '30' }]}>
                    <MaterialIcons name="person" size={26} color="#CD7F32" />
                  </View>
                )}
              </View>
            </LinearGradient>
            <View style={styles.podiumMedalContainer}>
              <LinearGradient
                colors={['#CD7F32', '#B8860B']}
                style={styles.podiumMedal}
              >
                <Text style={styles.podiumMedalText}>3</Text>
              </LinearGradient>
            </View>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
            <Text style={[styles.podiumName, { color: theme.text }]} numberOfLines={1}>
              {third.displayName?.split(' ')[0] || 'User'}
            </Text>
            {!(third.isCurrentUser && badgeToggles.country === false) && third.countryFlag ? (
              <Text style={{ fontSize: 12, marginLeft: 4 }}>{third.countryFlag}</Text>
            ) : null}
            {third.isCurrentUser && badgeToggles.streak !== false && myReferralCount >= 6 && (
              <LottieView source={getStreakAnimSource(myStreakAnim)} autoPlay loop style={{ width: 16, height: 16, marginLeft: 3 }} />
            )}
            {AchievementService.PROFILE_BADGES
              .filter(badge => {
                const toggles = third.isCurrentUser ? badgeToggles : (third.badgeToggles || {});
                if (toggles[badge.id] === false) return false;
                const req = BADGE_REFERRAL_GATES[badge.id];
                const refCount = third.isCurrentUser ? myReferralCount : (third.referralCount || 0);
                if (req != null && refCount < req) return false;
                return true;
              })
              .map(badge => (
              badge.image
                ? <Image key={badge.id} source={badge.image} style={{ width: 14, height: 14, marginLeft: 3, borderRadius: 3 }} resizeMode="contain" />
                : <MaterialIcons key={badge.id} name={badge.icon} size={14} color={badge.color} style={{ marginLeft: 3 }} />
            ))}
          </View>
          <Text style={[styles.podiumScore, { color: theme.textSecondary }]}>
            {formatNumber(getScoreValue(third))}
          </Text>
          <LinearGradient
            colors={['#CD7F32', '#B8860B']}
            style={[styles.podiumBar, styles.podiumBarThird]}
          />
        </View>
      </Animated.View>
    );
  };
  
  // Render all remaining users after podium
  const renderRemainingUsers = () => {
    const data = activeTab === 'friends' ? friendsLeaderboard : globalLeaderboard;
    const remaining = data.length >= 3 ? data.slice(3) : [];
    
    if (remaining.length === 0) return null;
    
    return (
      <View style={styles.remainingContainer}>
        <Text style={[styles.remainingTitle, { color: theme.textSecondary }]}>
          Leaderboard
        </Text>
        {remaining.map((item, index) => renderUserCard(item, index))}
      </View>
    );
  };
  
  // Empty state with beautiful design
  const renderEmptyState = () => {
    const data = activeTab === 'friends' ? friendsLeaderboard : globalLeaderboard;
    
    // If we have data (even just current user), show them!
    if (data.length > 0 && data.length < 3) {
      return (
        <View style={styles.soloContainer}>
          <Text style={[styles.soloTitle, { color: theme.text }]}>
            Your Ranking
          </Text>
          <Text style={[styles.soloSubtitle, { color: theme.textSecondary }]}>
            {activeTab === 'friends' 
              ? 'Add friends to compete and climb the leaderboard!'
              : 'More users will appear as they join'}
          </Text>
          {data.map((item, index) => renderUserCard(item, index))}
        </View>
      );
    }
    
    // True empty state
    return (
      <View style={styles.emptyContainer}>
        <LinearGradient
          colors={[theme.primary + '20', theme.primary + '05']}
          style={styles.emptyIconContainer}
        >
          <MaterialIcons name="emoji-events" size={64} color={theme.primary} />
        </LinearGradient>
        <Text style={[styles.emptyTitle, { color: theme.text }]}>
          {activeTab === 'friends' ? 'No Friends Yet' : 'Be the First'}
        </Text>
        <Text style={[styles.emptySubtitle, { color: theme.textSecondary }]}>
          {activeTab === 'friends' 
            ? 'Add friends to compete and see who can earn the most points!'
            : 'Make your profile public to appear on the global leaderboard'}
        </Text>
        
        {activeTab !== 'friends' && (
          <TouchableOpacity
            style={styles.emptyButton}
            onPress={() => navigation?.navigate('Profile')}
          >
            <LinearGradient
              colors={[theme.primary, theme.primary + 'DD']}
              style={styles.emptyButtonGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <MaterialIcons name="settings" size={20} color="#FFF" />
              <Text style={styles.emptyButtonText}>Go to Settings</Text>
            </LinearGradient>
          </TouchableOpacity>
        )}
      </View>
    );
  };
  
  // Not logged in state
  if (!user) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <LinearGradient
          colors={[theme.primary + '30', theme.background]}
          style={styles.headerGradient}
        />
        <View style={styles.signInContainer}>
          <LinearGradient
            colors={[theme.primary + '20', theme.primary + '05']}
            style={styles.signInIconContainer}
          >
            <MaterialIcons name="emoji-events" size={80} color={theme.primary} />
          </LinearGradient>
          <Text style={[styles.signInTitle, { color: theme.text }]}>
            Join the Competition
          </Text>
          <Text style={[styles.signInSubtitle, { color: theme.textSecondary }]}>
            Sign in to compete with friends and climb the global leaderboard
          </Text>
          <TouchableOpacity
            style={styles.signInButton}
            onPress={() => navigation.navigate('Auth')}
          >
            <LinearGradient
              colors={[theme.primary, theme.primary + 'DD']}
              style={styles.signInButtonGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Text style={styles.signInButtonText}>Sign In</Text>
              <MaterialIcons name="arrow-forward" size={20} color="#FFF" />
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    );
  }
  
  const currentData = activeTab === 'friends' ? friendsLeaderboard : globalLeaderboard;
  
  return (
    <View style={[styles.container, { backgroundColor: theme.background, paddingTop: insets.top }]}>
      {/* Header Gradient */}
      <LinearGradient
        colors={[theme.primary + '40', theme.primary + '10', 'transparent']}
        style={styles.headerGradient}
      />
      
      {/* Header */}
      <Animated.View 
        style={[
          styles.header,
          {
            transform: [{
              translateY: headerAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [-20, 0],
              }),
            }],
            opacity: headerAnim,
          }
        ]}
      >
        <TouchableOpacity 
          onPress={() => onClose ? onClose() : navigation?.goBack()} 
          style={[styles.backButton, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]}
        >
          <MaterialIcons name="arrow-back" size={22} color={theme.text} />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <MaterialIcons name="emoji-events" size={24} color="#FFD700" />
          <Text style={[styles.headerTitle, { color: theme.text }]}>Leaderboard</Text>
        </View>
        <View style={{ width: 44 }} />
      </Animated.View>
      
      {/* Tabs - Premium pill style */}
      <Animated.View 
        style={[
          styles.tabsContainer,
          { opacity: headerAnim }
        ]}
      >
        <View style={[styles.tabs, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' }]}>
          {[
            { key: 'friends', label: 'Friends', icon: 'people' },
            { key: 'global', label: 'Global', icon: 'public' },
          ].map(tab => (
            <TouchableOpacity
              key={tab.key}
              style={[styles.tab]}
              onPress={() => {
                hapticFeedback.light();
                setActiveTab(tab.key);
                setLoading(true);
              }}
            >
              {activeTab === tab.key ? (
                <LinearGradient
                  colors={[theme.primary, theme.primary + 'DD']}
                  style={styles.tabActiveGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <MaterialIcons name={tab.icon} size={18} color="#FFF" />
                  <Text style={styles.tabTextActive}>{tab.label}</Text>
                </LinearGradient>
              ) : (
                <View style={styles.tabInactive}>
                  <MaterialIcons name={tab.icon} size={18} color={theme.textSecondary} />
                  <Text style={[styles.tabText, { color: theme.textSecondary }]}>{tab.label}</Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>
      </Animated.View>
      
      {/* Sort Options - Compact Icon Style */}
      <Animated.View 
        style={[
          styles.sortContainer,
          { opacity: headerAnim }
        ]}
      >
        <View style={[styles.sortWrapper, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }]}>
          {[
            { key: 'points', label: 'Points', icon: 'star', color: '#FFD700' },
            { key: 'streak', label: 'Streak', icon: 'local-fire-department', color: '#FF6B35' },
          ].map(option => (
            <TouchableOpacity
              key={option.key}
              onPress={() => {
                hapticFeedback.light();
                setSortBy(option.key);
                setLoading(true);
              }}
              style={styles.sortOptionButton}
            >
              {sortBy === option.key ? (
                <View style={[styles.sortOptionActive, { backgroundColor: option.color + '20' }]}>
                  <MaterialIcons name={option.icon} size={18} color={option.color} />
                  <Text style={[styles.sortOptionTextActive, { color: option.color }]}>{option.label}</Text>
                </View>
              ) : (
                <View style={styles.sortOptionInactive}>
                  <MaterialIcons name={option.icon} size={18} color={theme.textTertiary} />
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>
      </Animated.View>
      
      {/* Content */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={[styles.loadingText, { color: theme.textSecondary }]}>
            Loading rankings...
          </Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl 
              refreshing={refreshing} 
              onRefresh={onRefresh}
              tintColor={theme.primary}
            />
          }
          showsVerticalScrollIndicator={false}
        >
          {currentData.length >= 3 ? (
            <>
              {renderPodium()}
              {renderRemainingUsers()}
            </>
          ) : (
            renderEmptyState()
          )}
          
          {/* Bottom spacing */}
          <View style={{ height: 40 }} />
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 200,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 16,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  tabsContainer: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  tabs: {
    flexDirection: 'row',
    borderRadius: 16,
    padding: 4,
  },
  tab: {
    flex: 1,
  },
  tabActiveGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 6,
  },
  tabInactive: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 6,
  },
  tabTextActive: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '600',
  },
  tabText: {
    fontSize: 15,
    fontWeight: '500',
  },
  sortContainer: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  sortWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 16,
    padding: 6,
  },
  sortOptionButton: {
    flex: 1,
  },
  sortOptionActive: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 12,
    gap: 6,
  },
  sortOptionTextActive: {
    fontSize: 13,
    fontWeight: '700',
  },
  sortOptionInactive: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 16,
  },
  podiumContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-end',
    paddingTop: 40,
    paddingBottom: 30,
    marginBottom: 10,
  },
  podiumGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  podiumItem: {
    alignItems: 'center',
    flex: 1,
  },
  podiumItemFirst: {
    marginTop: -20,
  },
  crown: {
    marginBottom: 8,
    textShadowColor: '#FFD700',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  podiumAvatarContainer: {
    position: 'relative',
  },
  podiumAvatarBorder: {
    padding: 3,
    borderRadius: 35,
  },
  podiumAvatarBorderFirst: {
    padding: 4,
    borderRadius: 45,
  },
  podiumAvatar: {
    overflow: 'hidden',
  },
  podiumAvatarFirst: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  podiumAvatarSmall: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  podiumAvatarImage: {
    width: '100%',
    height: '100%',
  },
  podiumAvatarPlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  podiumMedalContainer: {
    position: 'absolute',
    bottom: -8,
    left: '50%',
    marginLeft: -14,
  },
  podiumMedal: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  podiumMedalFirst: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginLeft: -2,
  },
  podiumMedalText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '800',
  },
  podiumMedalTextFirst: {
    fontSize: 16,
  },
  podiumName: {
    marginTop: 16,
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    maxWidth: 90,
  },
  podiumNameFirst: {
    fontSize: 16,
    fontWeight: '700',
  },
  podiumScore: {
    marginTop: 4,
    fontSize: 13,
    fontWeight: '500',
  },
  podiumScoreFirst: {
    fontSize: 15,
    fontWeight: '700',
  },
  podiumBar: {
    width: '85%',
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    marginTop: 12,
  },
  podiumBarFirst: {
    height: 80,
  },
  podiumBarSecond: {
    height: 55,
  },
  podiumBarThird: {
    height: 35,
  },
  remainingContainer: {
    marginTop: 10,
  },
  remainingTitle: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 12,
    marginLeft: 4,
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 16,
    marginBottom: 10,
  },
  rankBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  rankBadgeText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '800',
  },
  cardAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    overflow: 'hidden',
  },
  cardAvatarImage: {
    width: '100%',
    height: '100%',
  },
  cardAvatarPlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardInfo: {
    flex: 1,
    marginLeft: 12,
  },
  cardNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  cardName: {
    fontSize: 16,
    fontWeight: '600',
    flexShrink: 1,
  },
  youBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  youBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  cardUsername: {
    fontSize: 13,
    marginTop: 2,
  },
  cardScore: {
    alignItems: 'flex-end',
  },
  cardScoreValue: {
    fontSize: 20,
    fontWeight: '800',
  },
  cardScoreLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 2,
  },
  cardScoreLabelText: {
    fontSize: 11,
    fontWeight: '500',
  },
  soloContainer: {
    paddingTop: 20,
  },
  soloTitle: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
  },
  soloSubtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  addFriendsButton: {
    marginTop: 20,
    alignSelf: 'center',
  },
  addFriendsGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 25,
    gap: 8,
  },
  addFriendsText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingTop: 60,
  },
  emptyIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 12,
  },
  emptySubtitle: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
  emptyButton: {
    borderRadius: 25,
    overflow: 'hidden',
  },
  emptyButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 28,
    paddingVertical: 16,
    gap: 10,
  },
  emptyButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 14,
  },
  signInContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  signInIconContainer: {
    width: 140,
    height: 140,
    borderRadius: 70,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
  },
  signInTitle: {
    fontSize: 26,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 12,
  },
  signInSubtitle: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 40,
  },
  signInButton: {
    borderRadius: 28,
    overflow: 'hidden',
  },
  signInButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 36,
    paddingVertical: 18,
    gap: 12,
  },
  signInButtonText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '700',
  },
});

export default LeaderboardScreen;

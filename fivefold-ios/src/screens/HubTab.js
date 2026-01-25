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
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { MaterialIcons, Ionicons, FontAwesome5 } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';

import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { GlassHeader } from '../components/GlassEffect';
import { subscribeToPosts, createPost, viewPost, deletePost, formatTimeAgo, cleanupOldPosts } from '../services/feedService';
import { getUserProfile } from '../services/authService';
import { getTokenStatus, useToken, getTimeUntilToken, checkAndDeliverToken } from '../services/tokenService';
import FriendsScreen from './FriendsScreen';
import LeaderboardScreen from './LeaderboardScreen';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const HubTab = () => {
  const { theme, isDark } = useTheme();
  const { user, userProfile } = useAuth();
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
  const [showFriends, setShowFriends] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  
  // Animation refs
  const fabScale = useRef(new Animated.Value(1)).current;
  const tokenPulse = useRef(new Animated.Value(1)).current;
  
  // Load posts and token status
  useEffect(() => {
    if (!user) return;
    
    // Subscribe to posts
    const unsubscribe = subscribeToPosts((newPosts) => {
      setPosts(newPosts);
      setLoading(false);
    });
    
    // Check token status
    checkTokenStatus();
    
    // Check token every minute
    const tokenInterval = setInterval(checkTokenStatus, 60000);
    
    // Clean up old posts (older than 7 days) to save storage costs
    cleanupOldPosts().then((result) => {
      if (result.deleted > 0) {
        console.log(`[Hub] Cleaned up ${result.deleted} old posts`);
      }
    });
    
    return () => {
      unsubscribe();
      clearInterval(tokenInterval);
    };
  }, [user]);
  
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
  
  const checkTokenStatus = async () => {
    if (!user) return;
    
    // Check both displayName and username for test user detection
    // Try username first (more reliable), then displayName
    const displayName = userProfile?.displayName || null;
    const username = userProfile?.username || null;
    // Pass username first since it's cleaner (no emojis), fallback to displayName
    const nameToCheck = username || displayName;
    const status = await checkAndDeliverToken(user.uid, nameToCheck);
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
    await checkTokenStatus();
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
    if (!postContent.trim()) {
      Alert.alert('Empty Post', 'Please write something to share.');
      return;
    }
    
    if (postContent.length > 280) {
      Alert.alert('Too Long', 'Posts must be 280 characters or less.');
      return;
    }
    
    setPosting(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    // Use the token
    const username = userProfile?.displayName || userProfile?.username || null;
    const tokenResult = await useToken(user.uid, username);
    if (!tokenResult.success) {
      Alert.alert('Error', tokenResult.error || 'Failed to use token');
      setPosting(false);
      return;
    }
    
    // Fetch fresh profile from Firestore to ensure we have latest country/photo
    let profileToUse = userProfile;
    try {
      const freshProfile = await getUserProfile(user.uid);
      if (freshProfile) {
        profileToUse = freshProfile;
      }
    } catch (err) {
      console.log('[Hub] Using cached profile for post');
    }
    
    // Create the post
    const result = await createPost(user.uid, postContent, profileToUse);
    
    if (result.success) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setPostContent('');
      setShowComposer(false);
      await checkTokenStatus(); // Refresh token status
    } else {
      Alert.alert('Error', result.error || 'Failed to create post');
    }
    
    setPosting(false);
  };
  
  const handleView = async (postId) => {
    if (!user) return;
    await viewPost(postId, user.uid);
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
  
  // Track last view time per post (0.1 second cooldown)
  const lastViewTimeRef = useRef({});
  
  const renderPost = ({ item }) => {
    const isOwner = item.userId === user?.uid;
    
    // Track view - but don't count the original poster's views on their own post
    if (user?.uid && item.id && !isOwner) {
      const now = Date.now();
      const lastView = lastViewTimeRef.current[item.id] || 0;
      
      const randomCooldown = 70 + Math.floor(Math.random() * 31); // Random 70-100ms
      if (now - lastView > randomCooldown) {
        lastViewTimeRef.current[item.id] = now;
        handleView(item.id);
      }
    }
    
    return (
      <View style={[styles.postCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#FFFFFF' }]}>
        {/* Author Row */}
        <View style={styles.postHeader}>
          <View style={styles.authorInfo}>
            {item.authorPhoto ? (
              <Image source={{ uri: item.authorPhoto }} style={styles.authorAvatar} />
            ) : (
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
              <View style={styles.authorNameRow}>
                <Text style={[styles.authorName, { color: theme.text }]}>
                  {item.authorName}
                </Text>
                {item.authorCountry && (
                  <Text style={[styles.authorFromText, { color: theme.textSecondary }]}> from </Text>
                )}
                {item.authorCountry && (
                  <Text style={styles.authorCountry}>{item.authorCountry}</Text>
                )}
                <Text style={[styles.authorSharedText, { color: theme.textSecondary }]}> has shared</Text>
                <Text style={[styles.postTimeDot, { color: theme.textSecondary }]}> · </Text>
                <Text style={[styles.postTime, { color: theme.textSecondary }]}>
                  {formatTimeAgo(item.createdAt)}
                </Text>
              </View>
              {item.authorUsername && (
                <Text style={[styles.authorUsername, { color: theme.textSecondary }]}>
                  @{item.authorUsername}
                </Text>
              )}
            </View>
          </View>
          
          {isOwner && (
            <TouchableOpacity
              onPress={() => handleDeletePost(item.id)}
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
              {item.views} {item.views === 1 ? 'view' : 'views'}
            </Text>
          </View>
        )}
      </View>
    );
  };
  
  const renderHeader = () => (
    <GlassHeader 
      intensity={30}
      absolute={false}
    >
      <View style={[styles.headerContent, { paddingTop: insets.top + 10 }]}>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Hub</Text>
        
        <View style={styles.headerButtons}>
          <TouchableOpacity
            style={[styles.headerButton, { 
              backgroundColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.06)',
              borderWidth: 1,
              borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
            }]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setShowFriends(true);
            }}
          >
            <Ionicons name="people" size={20} color={theme.primary} />
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.headerButton, { 
              backgroundColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.06)',
              borderWidth: 1,
              borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
            }]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setShowLeaderboard(true);
            }}
          >
            <MaterialIcons name="leaderboard" size={20} color="#F59E0B" />
          </TouchableOpacity>
        </View>
      </View>
    </GlassHeader>
  );
  
  
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
      
      {/* Floating Action Button */}
      <Animated.View
        style={[
          styles.fabContainer,
          { 
            bottom: insets.bottom + 100,
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
        </View>
      </Modal>
      
      {/* Friends Modal */}
      <Modal
        visible={showFriends}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowFriends(false)}
      >
        <FriendsScreen navigation={navigation} onClose={() => setShowFriends(false)} />
      </Modal>
      
      {/* Leaderboard Modal */}
      <Modal
        visible={showLeaderboard}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowLeaderboard(false)}
      >
        <LeaderboardScreen navigation={navigation} onClose={() => setShowLeaderboard(false)} />
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
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
  authorFromText: {
    fontSize: 14,
  },
  authorCountry: {
    fontSize: 14,
  },
  authorSharedText: {
    fontSize: 14,
  },
  postTimeDot: {
    fontSize: 14,
  },
  postTime: {
    fontSize: 13,
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
});

export default HubTab;

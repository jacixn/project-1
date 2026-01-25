/**
 * Friends Screen - Premium Edition
 * 
 * Stunning UI with:
 * - Animated gradient header
 * - Beautiful friend cards with stats
 * - Premium search with glass effect
 * - Smooth animations throughout
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Image,
  Animated,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { MaterialIcons, FontAwesome5, Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import {
  searchUsers,
  getFriendsWithStats,
  getPendingRequestsWithDetails,
  sendFriendRequest,
  acceptFriendRequest,
  declineFriendRequest,
  removeFriend,
  getFriendshipStatus,
} from '../services/friendsService';
import { hapticFeedback } from '../utils/haptics';
import CreateChallengeModal from '../components/CreateChallengeModal';

const { width, height } = Dimensions.get('window');

const FriendsScreen = ({ navigation, onClose }) => {
  const { theme, isDark } = useTheme();
  const { user, userProfile } = useAuth();
  
  // State
  const [activeTab, setActiveTab] = useState('friends');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [friends, setFriends] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [prayerPartner, setPrayerPartner] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState({});
  const [challengeModalVisible, setChallengeModalVisible] = useState(false);
  const [challengeFriend, setChallengeFriend] = useState(null);
  
  // Animations
  const headerAnim = useRef(new Animated.Value(0)).current;
  const listAnim = useRef(new Animated.Value(0)).current;
  const searchAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  
  // Search debounce
  const searchTimeout = useRef(null);
  
  // Start animations
  useEffect(() => {
    Animated.parallel([
      Animated.timing(headerAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.timing(listAnim, {
        toValue: 1,
        duration: 600,
        delay: 200,
        useNativeDriver: true,
      }),
    ]).start();
    
    // Pulse animation for pending requests badge
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.2,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);
  
  // Search animation
  useEffect(() => {
    Animated.spring(searchAnim, {
      toValue: activeTab === 'search' ? 1 : 0,
      tension: 50,
      friction: 10,
      useNativeDriver: true,
    }).start();
  }, [activeTab]);
  
  // Load data on mount
  useEffect(() => {
    if (user) {
      loadData();
    } else {
      setLoading(false);
    }
  }, [user]);
  
  // Search with debounce
  useEffect(() => {
    if (searchTimeout.current) {
      clearTimeout(searchTimeout.current);
    }
    
    if (!searchQuery || searchQuery.length < 2) {
      setSearchResults([]);
      setSearching(false);
      return;
    }
    
    setSearching(true);
    searchTimeout.current = setTimeout(async () => {
      try {
        const results = await searchUsers(searchQuery, user?.uid);
        
        const resultsWithStatus = await Promise.all(
          results.map(async (result) => {
            const status = await getFriendshipStatus(user?.uid, result.uid);
            return { ...result, friendshipStatus: status };
          })
        );
        
        setSearchResults(resultsWithStatus);
      } catch (error) {
        console.error('Search error:', error);
      } finally {
        setSearching(false);
      }
    }, 500);
    
    return () => {
      if (searchTimeout.current) {
        clearTimeout(searchTimeout.current);
      }
    };
  }, [searchQuery, user]);
  
  const loadData = async () => {
    if (!user) return;
    
    try {
      const [friendsData, requestsData] = await Promise.all([
        getFriendsWithStats(user.uid),
        getPendingRequestsWithDetails(user.uid),
      ]);
      
      setFriends(friendsData);
      setPendingRequests(requestsData);
      
      // Load prayer partner
      try {
        const { getPrayerPartner } = await import('../services/prayerSocialService');
        const partner = await getPrayerPartner(user.uid);
        setPrayerPartner(partner);
      } catch (err) {
        console.log('Could not load prayer partner:', err);
      }
    } catch (error) {
      console.error('Error loading friends data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };
  
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadData();
  }, [user]);
  
  const handleSendRequest = async (userId) => {
    setActionLoading(prev => ({ ...prev, [userId]: true }));
    hapticFeedback.light();
    
    try {
      const result = await sendFriendRequest(user.uid, userId);
      if (result.success) {
        hapticFeedback.success();
        setSearchResults(prev =>
          prev.map(u =>
            u.uid === userId ? { ...u, friendshipStatus: 'requested' } : u
          )
        );
      } else {
        Alert.alert('Oops', result.message);
      }
    } catch (error) {
      hapticFeedback.error();
      Alert.alert('Error', 'Failed to send friend request');
    } finally {
      setActionLoading(prev => ({ ...prev, [userId]: false }));
    }
  };
  
  const handleAcceptRequest = async (fromUserId) => {
    setActionLoading(prev => ({ ...prev, [fromUserId]: true }));
    hapticFeedback.light();
    
    try {
      const result = await acceptFriendRequest(user.uid, fromUserId);
      if (result.success) {
        hapticFeedback.success();
        loadData();
      } else {
        Alert.alert('Error', result.message);
      }
    } catch (error) {
      hapticFeedback.error();
      Alert.alert('Error', 'Failed to accept request');
    } finally {
      setActionLoading(prev => ({ ...prev, [fromUserId]: false }));
    }
  };
  
  const handleDeclineRequest = async (fromUserId) => {
    setActionLoading(prev => ({ ...prev, [fromUserId]: true }));
    hapticFeedback.light();
    
    try {
      const result = await declineFriendRequest(user.uid, fromUserId);
      if (result.success) {
        hapticFeedback.success();
        setPendingRequests(prev => prev.filter(r => r.fromUserId !== fromUserId));
      } else {
        Alert.alert('Error', result.message);
      }
    } catch (error) {
      hapticFeedback.error();
      Alert.alert('Error', 'Failed to decline request');
    } finally {
      setActionLoading(prev => ({ ...prev, [fromUserId]: false }));
    }
  };
  
  const handleRemoveFriend = async (friendId, friendName) => {
    Alert.alert(
      'Remove Friend',
      `Are you sure you want to remove ${friendName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            setActionLoading(prev => ({ ...prev, [friendId]: true }));
            hapticFeedback.light();
            
            try {
              const result = await removeFriend(user.uid, friendId);
              if (result.success) {
                hapticFeedback.success();
                setFriends(prev => prev.filter(f => f.uid !== friendId));
              } else {
                Alert.alert('Error', result.message);
              }
            } catch (error) {
              hapticFeedback.error();
              Alert.alert('Error', 'Failed to remove friend');
            } finally {
              setActionLoading(prev => ({ ...prev, [friendId]: false }));
            }
          },
        },
      ]
    );
  };
  
  const formatNumber = (num) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num?.toLocaleString() || '0';
  };
  
  // Render friend card
  const renderFriendCard = ({ item, index }) => {
    const isLoading = actionLoading[item.uid];
    
    return (
      <Animated.View
        style={[
          styles.friendCard,
          {
            backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.9)',
            transform: [{
              translateX: listAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [-50, 0],
              }),
            }],
            opacity: listAnim,
          }
        ]}
      >
        {/* Rank indicator for top friends */}
        {index < 3 && (
          <View style={[styles.rankIndicator, { backgroundColor: index === 0 ? '#FFD700' : index === 1 ? '#C0C0C0' : '#CD7F32' }]}>
            <Text style={styles.rankText}>{index + 1}</Text>
          </View>
        )}
        
        {/* Avatar */}
        <View style={styles.avatarContainer}>
          {item.profilePicture ? (
            <Image source={{ uri: item.profilePicture }} style={styles.avatar} />
          ) : (
            <LinearGradient
              colors={[theme.primary + '60', theme.primary + '30']}
              style={styles.avatarPlaceholder}
            >
              <MaterialIcons name="person" size={32} color={theme.primary} />
            </LinearGradient>
          )}
          {/* Online indicator (placeholder) */}
          <View style={[styles.onlineIndicator, { backgroundColor: '#10B981' }]} />
        </View>
        
        {/* Info */}
        <View style={styles.friendInfo}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={[styles.friendName, { color: theme.text }]} numberOfLines={1}>
              {item.displayName || 'Friend'}
          </Text>
            {/* Country flag or globe */}
            {item.countryFlag ? (
              <Text style={{ fontSize: 14, marginLeft: 6 }}>{item.countryFlag}</Text>
            ) : (
              <MaterialIcons name="public" size={14} color={theme.textTertiary} style={{ marginLeft: 6, opacity: 0.5 }} />
            )}
          </View>
          <Text style={[styles.friendUsername, { color: theme.textSecondary }]}>
            @{item.username || 'unknown'}
          </Text>
          
          {/* Stats row */}
            <View style={styles.statsRow}>
            <View style={styles.statBadge}>
              <MaterialIcons name="star" size={14} color="#FFD700" />
              <Text style={[styles.statText, { color: theme.text }]}>
                {formatNumber(item.totalPoints || 0)}
                </Text>
              </View>
            <View style={styles.statBadge}>
              <MaterialIcons name="local-fire-department" size={14} color="#FF6B35" />
              <Text style={[styles.statText, { color: theme.text }]}>
                  {item.currentStreak || 0}
                </Text>
              </View>
            </View>
        </View>
        
        {/* Actions */}
        <View style={styles.friendActions}>
          {/* Message */}
                <TouchableOpacity
            style={[styles.friendActionButton, { backgroundColor: theme.primary + '20' }]}
            onPress={() => {
              if (navigation) {
                // Close modal first if opened from Hub, then navigate
                if (onClose) {
                  onClose();
                  // Small delay to let modal close before navigating
                  setTimeout(() => {
                    navigation.navigate('Chat', { otherUser: item, otherUserId: item.uid });
                  }, 100);
                } else {
                  navigation.navigate('Chat', { otherUser: item, otherUserId: item.uid });
                }
              }
            }}
          >
            <Ionicons name="chatbubble" size={16} color={theme.primary} />
          </TouchableOpacity>
          
          {/* Challenge */}
          <TouchableOpacity
            style={[styles.friendActionButton, { backgroundColor: '#F59E0B20' }]}
            onPress={() => {
              setChallengeFriend(item);
              setChallengeModalVisible(true);
            }}
          >
            <FontAwesome5 name="trophy" size={14} color="#F59E0B" />
          </TouchableOpacity>
          
          {/* More */}
          <TouchableOpacity
            style={styles.moreButton}
            onPress={() => handleRemoveFriend(item.uid, item.displayName)}
                  disabled={isLoading}
                >
                  {isLoading ? (
              <ActivityIndicator size="small" color={theme.textSecondary} />
                  ) : (
              <MaterialIcons name="more-vert" size={20} color={theme.textSecondary} />
                  )}
                </TouchableOpacity>
        </View>
      </Animated.View>
    );
  };
  
  // Render request card
  const renderRequestCard = ({ item }) => {
    const isLoading = actionLoading[item.fromUserId];
    const userData = item.user || item;
    
    return (
      <Animated.View
        style={[
          styles.requestCard,
          {
            backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.9)',
            borderLeftColor: theme.primary,
          }
        ]}
      >
        {/* Avatar */}
        <View style={styles.avatarContainer}>
          {userData.profilePicture ? (
            <Image source={{ uri: userData.profilePicture }} style={styles.avatar} />
          ) : (
            <LinearGradient
              colors={[theme.primary + '60', theme.primary + '30']}
              style={styles.avatarPlaceholder}
            >
              <MaterialIcons name="person" size={32} color={theme.primary} />
            </LinearGradient>
          )}
                </View>
        
        {/* Info */}
        <View style={styles.requestInfo}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={[styles.friendName, { color: theme.text }]} numberOfLines={1}>
              {userData.displayName || 'User'}
            </Text>
            {/* Country flag or globe */}
            {userData.countryFlag ? (
              <Text style={{ fontSize: 14, marginLeft: 6 }}>{userData.countryFlag}</Text>
            ) : (
              <MaterialIcons name="public" size={14} color={theme.textTertiary} style={{ marginLeft: 6, opacity: 0.5 }} />
            )}
          </View>
          <Text style={[styles.friendUsername, { color: theme.textSecondary }]}>
            @{userData.username || 'unknown'}
          </Text>
          <Text style={[styles.requestTime, { color: theme.textTertiary }]}>
            Sent you a friend request
          </Text>
        </View>
        
        {/* Action buttons */}
        <View style={styles.requestActions}>
                <TouchableOpacity
            style={styles.declineButton}
            onPress={() => handleDeclineRequest(item.fromUserId)}
                  disabled={isLoading}
          >
            <MaterialIcons name="close" size={20} color={theme.textSecondary} />
          </TouchableOpacity>
          
          <TouchableOpacity
            onPress={() => handleAcceptRequest(item.fromUserId)}
            disabled={isLoading}
          >
            <LinearGradient
              colors={[theme.primary, theme.primary + 'CC']}
              style={styles.acceptButton}
                >
                  {isLoading ? (
                <ActivityIndicator size="small" color="#FFF" />
                  ) : (
                <MaterialIcons name="check" size={20} color="#FFF" />
                  )}
            </LinearGradient>
                </TouchableOpacity>
        </View>
      </Animated.View>
    );
  };
  
  // Render search result card
  const renderSearchCard = ({ item }) => {
    const isLoading = actionLoading[item.uid];
    
    return (
      <View
        style={[
          styles.searchCard,
          { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.9)' }
        ]}
      >
        {/* Avatar */}
        <View style={styles.avatarContainer}>
          {item.profilePicture ? (
            <Image source={{ uri: item.profilePicture }} style={styles.avatar} />
          ) : (
            <LinearGradient
              colors={[theme.primary + '60', theme.primary + '30']}
              style={styles.avatarPlaceholder}
            >
              <MaterialIcons name="person" size={32} color={theme.primary} />
            </LinearGradient>
          )}
                </View>
        
        {/* Info */}
        <View style={styles.friendInfo}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={[styles.friendName, { color: theme.text }]} numberOfLines={1}>
              {item.displayName || 'User'}
            </Text>
            {/* Country flag or globe */}
            {item.countryFlag ? (
              <Text style={{ fontSize: 14, marginLeft: 6 }}>{item.countryFlag}</Text>
            ) : (
              <MaterialIcons name="public" size={14} color={theme.textTertiary} style={{ marginLeft: 6, opacity: 0.5 }} />
            )}
          </View>
          <Text style={[styles.friendUsername, { color: theme.textSecondary }]}>
            @{item.username || 'unknown'}
          </Text>
        </View>
        
        {/* Action button based on status */}
        {item.friendshipStatus === 'none' && (
              <TouchableOpacity
            onPress={() => handleSendRequest(item.uid)}
                disabled={isLoading}
          >
            <LinearGradient
              colors={[theme.primary, theme.primary + 'CC']}
              style={styles.addButton}
              >
                {isLoading ? (
                <ActivityIndicator size="small" color="#FFF" />
                ) : (
                <>
                  <MaterialIcons name="person-add" size={18} color="#FFF" />
                  <Text style={styles.addButtonText}>Add</Text>
                </>
                )}
            </LinearGradient>
              </TouchableOpacity>
        )}
        
        {item.friendshipStatus === 'requested' && (
          <View style={[styles.statusPill, { backgroundColor: theme.textSecondary + '20' }]}>
            <MaterialIcons name="schedule" size={14} color={theme.textSecondary} />
            <Text style={[styles.statusText, { color: theme.textSecondary }]}>Pending</Text>
          </View>
        )}
        
        {item.friendshipStatus === 'pending' && (
              <TouchableOpacity
            onPress={() => handleAcceptRequest(item.uid)}
                disabled={isLoading}
              >
            <LinearGradient
              colors={['#10B981', '#059669']}
              style={styles.addButton}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <>
                  <MaterialIcons name="check" size={18} color="#FFF" />
                  <Text style={styles.addButtonText}>Accept</Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
        )}
        
        {item.friendshipStatus === 'friends' && (
          <View style={[styles.statusPill, { backgroundColor: '#10B981' + '20' }]}>
            <MaterialIcons name="check-circle" size={14} color="#10B981" />
            <Text style={[styles.statusText, { color: '#10B981' }]}>Friends</Text>
          </View>
        )}
      </View>
    );
  };
  
  // Empty states
  const renderEmptyState = (type) => {
    const configs = {
      friends: {
        icon: 'people-outline',
        title: 'No Friends Yet',
        subtitle: 'Search for friends by their username to connect and compete together!',
        buttonText: 'Find Friends',
        buttonAction: () => setActiveTab('search'),
      },
      requests: {
        icon: 'mail-outline',
        title: 'No Pending Requests',
        subtitle: 'When someone sends you a friend request, it will appear here.',
        buttonText: null,
      },
      search: {
        icon: 'search',
        title: 'Find Your Friends',
        subtitle: 'Enter a username to search for friends and send them a request.',
        buttonText: null,
      },
      noResults: {
        icon: 'search-off',
        title: 'No Users Found',
        subtitle: 'Try a different username or check the spelling.',
        buttonText: null,
      },
    };
    
    const config = configs[type];
    
    return (
      <View style={styles.emptyContainer}>
        <LinearGradient
          colors={[theme.primary + '20', theme.primary + '05']}
          style={styles.emptyIconContainer}
        >
          <MaterialIcons name={config.icon} size={56} color={theme.primary} />
        </LinearGradient>
        <Text style={[styles.emptyTitle, { color: theme.text }]}>{config.title}</Text>
        <Text style={[styles.emptySubtitle, { color: theme.textSecondary }]}>{config.subtitle}</Text>
        
        {config.buttonText && (
          <TouchableOpacity onPress={config.buttonAction}>
            <LinearGradient
              colors={[theme.primary, theme.primary + 'CC']}
              style={styles.emptyButton}
            >
              <Text style={styles.emptyButtonText}>{config.buttonText}</Text>
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
            <MaterialIcons name="people" size={80} color={theme.primary} />
          </LinearGradient>
          <Text style={[styles.signInTitle, { color: theme.text }]}>
            Connect with Friends
          </Text>
          <Text style={[styles.signInSubtitle, { color: theme.textSecondary }]}>
            Sign in to add friends and compete on leaderboards together
          </Text>
          <TouchableOpacity onPress={() => navigation?.navigate('Auth')}>
            <LinearGradient
              colors={[theme.primary, theme.primary + 'CC']}
              style={styles.signInButton}
          >
            <Text style={styles.signInButtonText}>Sign In</Text>
              <MaterialIcons name="arrow-forward" size={20} color="#FFF" />
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    );
  }
  
  return (
    <KeyboardAvoidingView 
      style={[styles.container, { backgroundColor: theme.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Header Gradient */}
      <LinearGradient
        colors={[theme.primary + '30', theme.primary + '10', 'transparent']}
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
          <MaterialIcons name="people" size={24} color={theme.primary} />
        <Text style={[styles.headerTitle, { color: theme.text }]}>Friends</Text>
      </View>
        <View style={{ width: 44 }} />
      </Animated.View>
      
      {/* Tabs */}
      <Animated.View 
        style={[styles.tabsContainer, { opacity: headerAnim }]}
      >
        <View style={[styles.tabs, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' }]}>
          {[
            { key: 'friends', label: 'Friends', icon: 'people', count: friends.length },
            { key: 'requests', label: 'Requests', icon: 'mail', count: pendingRequests.length },
            { key: 'search', label: '', icon: 'search', count: 0 },
        ].map(tab => (
          <TouchableOpacity
            key={tab.key}
              style={styles.tab}
            onPress={() => {
              hapticFeedback.light();
              setActiveTab(tab.key);
            }}
          >
              {activeTab === tab.key ? (
                <LinearGradient
                  colors={[theme.primary, theme.primary + 'CC']}
                  style={styles.tabActive}
                >
                  <MaterialIcons name={tab.icon} size={18} color="#FFF" />
                  {tab.label && <Text style={styles.tabTextActive}>{tab.label}</Text>}
                  {tab.count > 0 && tab.key !== 'search' && (
                    <View style={styles.tabBadge}>
                      <Text style={styles.tabBadgeText}>{tab.count}</Text>
                    </View>
                  )}
                </LinearGradient>
              ) : (
                <View style={styles.tabInactive}>
                  <MaterialIcons name={tab.icon} size={18} color={theme.textSecondary} />
                  {tab.label && (
                    <Text style={[styles.tabText, { color: theme.textSecondary }]}>{tab.label}</Text>
                  )}
                  {tab.count > 0 && tab.key === 'requests' && (
                    <Animated.View 
                      style={[
                        styles.tabBadgeNotification,
                        { backgroundColor: '#EF4444', transform: [{ scale: pulseAnim }] }
                      ]}
                    >
                      <Text style={styles.tabBadgeText}>{tab.count}</Text>
                    </Animated.View>
                  )}
                </View>
            )}
          </TouchableOpacity>
        ))}
      </View>
      </Animated.View>
      
      {/* Search Input */}
      {activeTab === 'search' && (
        <Animated.View 
          style={[
            styles.searchContainer,
            {
              transform: [{
                translateY: searchAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [-20, 0],
                }),
              }],
              opacity: searchAnim,
            }
          ]}
        >
          <View style={[
            styles.searchInputContainer,
            { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' }
          ]}>
            <MaterialIcons name="search" size={22} color={theme.textSecondary} />
            <TextInput
              style={[styles.searchInput, { color: theme.text }]}
              placeholder="Search by username..."
              placeholderTextColor={theme.textTertiary}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCapitalize="none"
              autoCorrect={false}
              autoFocus
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity 
                onPress={() => setSearchQuery('')}
                style={styles.clearButton}
              >
                <MaterialIcons name="close" size={18} color={theme.textSecondary} />
              </TouchableOpacity>
            )}
          </View>
        </Animated.View>
      )}
      
      {/* Content */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={[styles.loadingText, { color: theme.textSecondary }]}>
            Loading friends...
          </Text>
        </View>
      ) : (
        <>
          {/* Friends Tab */}
          {activeTab === 'friends' && (
            <FlatList
              data={friends}
              keyExtractor={(item) => item.uid}
              renderItem={renderFriendCard}
              contentContainerStyle={styles.listContent}
              refreshControl={
                <RefreshControl 
                  refreshing={refreshing} 
                  onRefresh={onRefresh}
                  tintColor={theme.primary}
                />
              }
              showsVerticalScrollIndicator={false}
              ListEmptyComponent={renderEmptyState('friends')}
              ListHeaderComponent={() => (
                <View>
                  {/* Prayer Partner */}
                  {prayerPartner && (
                    <LinearGradient
                      colors={[theme.primary + '20', theme.primary + '10']}
                      style={styles.prayerPartnerCard}
                    >
                      <View style={styles.prayerPartnerContent}>
                        <View style={styles.prayerPartnerIcon}>
                          <FontAwesome5 name="praying-hands" size={18} color={theme.primary} />
                        </View>
                        <View style={styles.prayerPartnerInfo}>
                          <Text style={[styles.prayerPartnerLabel, { color: theme.textSecondary }]}>
                            Today's Prayer Partner
                          </Text>
                          <Text style={[styles.prayerPartnerName, { color: theme.text }]}>
                            {prayerPartner.displayName || 'Friend'} {prayerPartner.countryFlag || ''}
                  </Text>
                </View>
                        <TouchableOpacity
                          style={[styles.prayerPartnerButton, { backgroundColor: theme.primary }]}
                          onPress={() => {
                            if (navigation) {
                              // Close modal first if opened from Hub, then navigate
                              if (onClose) {
                                onClose();
                                setTimeout(() => {
                                  navigation.navigate('Chat', { otherUser: prayerPartner, otherUserId: prayerPartner.partnerId });
                                }, 100);
                              } else {
                                navigation.navigate('Chat', { otherUser: prayerPartner, otherUserId: prayerPartner.partnerId });
                              }
                            }
                          }}
                        >
                          <Text style={styles.prayerPartnerButtonText}>Pray</Text>
                        </TouchableOpacity>
                      </View>
                    </LinearGradient>
                  )}
                  
                  {/* Friends Count */}
                  {friends.length > 0 && (
                    <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>
                      {friends.length} {friends.length === 1 ? 'Friend' : 'Friends'}
                    </Text>
                  )}
                </View>
              )}
            />
          )}
          
          {/* Requests Tab */}
          {activeTab === 'requests' && (
            <FlatList
              data={pendingRequests}
              keyExtractor={(item) => item.fromUserId}
              renderItem={renderRequestCard}
              contentContainerStyle={styles.listContent}
              refreshControl={
                <RefreshControl 
                  refreshing={refreshing} 
                  onRefresh={onRefresh}
                  tintColor={theme.primary}
                />
              }
              showsVerticalScrollIndicator={false}
              ListEmptyComponent={renderEmptyState('requests')}
              ListHeaderComponent={pendingRequests.length > 0 ? (
                <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>
                  {pendingRequests.length} Pending {pendingRequests.length === 1 ? 'Request' : 'Requests'}
                  </Text>
              ) : null}
            />
          )}
          
          {/* Search Tab */}
          {activeTab === 'search' && (
            <FlatList
              data={searchResults}
              keyExtractor={(item) => item.uid}
              renderItem={renderSearchCard}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
              ListEmptyComponent={
                searching ? (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={theme.primary} />
                    <Text style={[styles.loadingText, { color: theme.textSecondary }]}>
                      Searching...
                    </Text>
                  </View>
                ) : searchQuery.length >= 2 ? (
                  renderEmptyState('noResults')
                ) : (
                  renderEmptyState('search')
                )
              }
            />
          )}
        </>
      )}
      
      {/* Challenge Modal */}
      <CreateChallengeModal
        visible={challengeModalVisible}
        onClose={() => {
          setChallengeModalVisible(false);
          setChallengeFriend(null);
        }}
        onCloseAll={() => {
          // Close challenge modal and Friends modal (if opened from Hub)
          setChallengeModalVisible(false);
          setChallengeFriend(null);
          if (onClose) onClose();
        }}
        friend={challengeFriend}
        navigation={navigation}
        onChallengeSent={() => {
          setChallengeModalVisible(false);
          setChallengeFriend(null);
        }}
      />
    </KeyboardAvoidingView>
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
    paddingTop: 20,
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
  tabActive: {
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
    fontSize: 14,
    fontWeight: '600',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
  },
  tabBadge: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    marginLeft: 4,
  },
  tabBadgeNotification: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    marginLeft: 4,
  },
  tabBadgeText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '700',
  },
  searchContainer: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    paddingHorizontal: 16,
    height: 52,
    gap: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    height: '100%',
  },
  clearButton: {
    padding: 4,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
    flexGrow: 1,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 12,
  },
  // Social Actions
  socialActionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  socialActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 14,
    gap: 6,
  },
  socialActionText: {
    fontSize: 12,
    fontWeight: '600',
  },
  // Prayer Partner
  prayerPartnerCard: {
    borderRadius: 16,
    marginBottom: 16,
    overflow: 'hidden',
  },
  prayerPartnerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
  },
  prayerPartnerIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  prayerPartnerInfo: {
    flex: 1,
    marginLeft: 12,
  },
  prayerPartnerLabel: {
    fontSize: 11,
    fontWeight: '500',
  },
  prayerPartnerName: {
    fontSize: 15,
    fontWeight: '700',
    marginTop: 2,
  },
  prayerPartnerButton: {
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 16,
  },
  prayerPartnerButtonText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '600',
  },
  friendCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 20,
    marginBottom: 12,
    position: 'relative',
  },
  rankIndicator: {
    position: 'absolute',
    top: -6,
    left: 20,
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rankText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '800',
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  avatarPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: '#000',
  },
  friendInfo: {
    flex: 1,
    marginLeft: 14,
  },
  friendName: {
    fontSize: 17,
    fontWeight: '600',
  },
  friendUsername: {
    fontSize: 14,
    marginTop: 2,
  },
  statsRow: {
    flexDirection: 'row',
    marginTop: 8,
    gap: 12,
  },
  statBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: 13,
    fontWeight: '600',
  },
  friendActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  friendActionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  moreButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  requestCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 20,
    marginBottom: 12,
    borderLeftWidth: 4,
  },
  requestInfo: {
    flex: 1,
    marginLeft: 14,
  },
  requestTime: {
    fontSize: 12,
    marginTop: 4,
  },
  requestActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  declineButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
  },
  acceptButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 20,
    marginBottom: 12,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    gap: 6,
  },
  addButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    gap: 4,
  },
  statusText: {
    fontSize: 13,
    fontWeight: '500',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingTop: 60,
  },
  emptyIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 12,
  },
  emptySubtitle: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  emptyButton: {
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 25,
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
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 36,
    paddingVertical: 18,
    borderRadius: 28,
    gap: 12,
  },
  signInButtonText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '700',
  },
});

export default FriendsScreen;

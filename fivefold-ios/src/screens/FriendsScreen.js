/**
 * Friends Screen
 * 
 * Displays:
 * - Search for users by username
 * - Pending friend requests
 * - Current friends list with stats
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
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
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

const { width } = Dimensions.get('window');

const FriendsScreen = ({ navigation }) => {
  const { theme, isDark } = useTheme();
  const { user, userProfile } = useAuth();
  
  // State
  const [activeTab, setActiveTab] = useState('friends'); // 'friends', 'requests', 'search'
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [friends, setFriends] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState({});
  
  // Search debounce
  const searchTimeout = useRef(null);
  
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
        
        // Get friendship status for each result
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
        // Update search results
        setSearchResults(prev =>
          prev.map(u =>
            u.uid === userId ? { ...u, friendshipStatus: 'requested' } : u
          )
        );
      } else {
        Alert.alert('Error', result.message);
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
        loadData(); // Refresh lists
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
      `Are you sure you want to remove ${friendName} from your friends?`,
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
  
  const renderUserCard = ({ item, type }) => {
    const isLoading = actionLoading[item.uid || item.fromUserId];
    
    return (
      <View style={[
        styles.userCard,
        { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)' }
      ]}>
        {/* Avatar */}
        <View style={[styles.avatar, { backgroundColor: theme.primary + '30' }]}>
          {item.profilePicture || item.user?.profilePicture ? (
            <Image
              source={{ uri: item.profilePicture || item.user?.profilePicture }}
              style={styles.avatarImage}
            />
          ) : (
            <MaterialIcons name="person" size={28} color={theme.primary} />
          )}
        </View>
        
        {/* User Info */}
        <View style={styles.userInfo}>
          <Text style={[styles.displayName, { color: theme.text }]}>
            {item.displayName || item.user?.displayName || 'User'}
          </Text>
          <Text style={[styles.username, { color: theme.textSecondary }]}>
            @{item.username || item.user?.username || 'unknown'}
          </Text>
          {type === 'friend' && (
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <MaterialIcons name="star" size={14} color={theme.warning || '#F59E0B'} />
                <Text style={[styles.statText, { color: theme.textSecondary }]}>
                  {item.totalPoints || 0}
                </Text>
              </View>
              <View style={styles.statItem}>
                <MaterialIcons name="local-fire-department" size={14} color={theme.error || '#EF4444'} />
                <Text style={[styles.statText, { color: theme.textSecondary }]}>
                  {item.currentStreak || 0}
                </Text>
              </View>
            </View>
          )}
        </View>
        
        {/* Actions */}
        <View style={styles.actionButtons}>
          {type === 'search' && (
            <>
              {item.friendshipStatus === 'none' && (
                <TouchableOpacity
                  style={[styles.actionButton, { backgroundColor: theme.primary }]}
                  onPress={() => handleSendRequest(item.uid)}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <MaterialIcons name="person-add" size={20} color="#FFFFFF" />
                  )}
                </TouchableOpacity>
              )}
              {item.friendshipStatus === 'requested' && (
                <View style={[styles.statusBadge, { backgroundColor: theme.textSecondary + '30' }]}>
                  <Text style={[styles.statusText, { color: theme.textSecondary }]}>Pending</Text>
                </View>
              )}
              {item.friendshipStatus === 'pending' && (
                <TouchableOpacity
                  style={[styles.actionButton, { backgroundColor: theme.success || '#10B981' }]}
                  onPress={() => handleAcceptRequest(item.uid)}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <MaterialIcons name="check" size={20} color="#FFFFFF" />
                  )}
                </TouchableOpacity>
              )}
              {item.friendshipStatus === 'friends' && (
                <View style={[styles.statusBadge, { backgroundColor: theme.success + '30' }]}>
                  <MaterialIcons name="check-circle" size={16} color={theme.success || '#10B981'} />
                  <Text style={[styles.statusText, { color: theme.success || '#10B981' }]}>Friends</Text>
                </View>
              )}
            </>
          )}
          
          {type === 'request' && (
            <>
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: theme.success || '#10B981' }]}
                onPress={() => handleAcceptRequest(item.fromUserId)}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <MaterialIcons name="check" size={20} color="#FFFFFF" />
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: theme.error || '#EF4444', marginLeft: 8 }]}
                onPress={() => handleDeclineRequest(item.fromUserId)}
                disabled={isLoading}
              >
                <MaterialIcons name="close" size={20} color="#FFFFFF" />
              </TouchableOpacity>
            </>
          )}
          
          {type === 'friend' && (
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: 'transparent' }]}
              onPress={() => handleRemoveFriend(item.uid, item.displayName)}
              disabled={isLoading}
            >
              <MaterialIcons name="more-vert" size={24} color={theme.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };
  
  // Not logged in state
  if (!user) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={styles.emptyState}>
          <MaterialIcons name="people" size={64} color={theme.textTertiary} />
          <Text style={[styles.emptyTitle, { color: theme.text }]}>Sign in to connect</Text>
          <Text style={[styles.emptySubtitle, { color: theme.textSecondary }]}>
            Create an account to add friends and compete on leaderboards
          </Text>
          <TouchableOpacity
            style={[styles.signInButton, { backgroundColor: theme.primary }]}
            onPress={() => navigation.navigate('Auth')}
          >
            <Text style={styles.signInButtonText}>Sign In</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }
  
  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <MaterialIcons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Friends</Text>
        <View style={{ width: 40 }} />
      </View>
      
      {/* Tabs */}
      <View style={[styles.tabs, { borderBottomColor: theme.border || theme.separator }]}>
        {[
          { key: 'friends', label: 'Friends', count: friends.length },
          { key: 'requests', label: 'Requests', count: pendingRequests.length },
          { key: 'search', label: 'Search', icon: 'search' },
        ].map(tab => (
          <TouchableOpacity
            key={tab.key}
            style={[
              styles.tab,
              activeTab === tab.key && [styles.tabActive, { borderBottomColor: theme.primary }]
            ]}
            onPress={() => {
              hapticFeedback.light();
              setActiveTab(tab.key);
            }}
          >
            {tab.icon ? (
              <MaterialIcons 
                name={tab.icon} 
                size={20} 
                color={activeTab === tab.key ? theme.primary : theme.textSecondary} 
              />
            ) : (
              <Text style={[
                styles.tabText,
                { color: activeTab === tab.key ? theme.primary : theme.textSecondary }
              ]}>
                {tab.label}
                {tab.count > 0 && ` (${tab.count})`}
              </Text>
            )}
          </TouchableOpacity>
        ))}
      </View>
      
      {/* Search Input (only in search tab) */}
      {activeTab === 'search' && (
        <View style={styles.searchContainer}>
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
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <MaterialIcons name="close" size={20} color={theme.textSecondary} />
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}
      
      {/* Content */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      ) : (
        <>
          {/* Friends Tab */}
          {activeTab === 'friends' && (
            <FlatList
              data={friends}
              keyExtractor={(item) => item.uid}
              renderItem={({ item }) => renderUserCard({ item, type: 'friend' })}
              contentContainerStyle={styles.listContent}
              refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
              }
              ListEmptyComponent={
                <View style={styles.emptyState}>
                  <MaterialIcons name="people-outline" size={48} color={theme.textTertiary} />
                  <Text style={[styles.emptyTitle, { color: theme.text }]}>No friends yet</Text>
                  <Text style={[styles.emptySubtitle, { color: theme.textSecondary }]}>
                    Search for friends by their username
                  </Text>
                </View>
              }
            />
          )}
          
          {/* Requests Tab */}
          {activeTab === 'requests' && (
            <FlatList
              data={pendingRequests}
              keyExtractor={(item) => item.fromUserId}
              renderItem={({ item }) => renderUserCard({ item: { ...item, ...item.user }, type: 'request' })}
              contentContainerStyle={styles.listContent}
              refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
              }
              ListEmptyComponent={
                <View style={styles.emptyState}>
                  <MaterialIcons name="mail-outline" size={48} color={theme.textTertiary} />
                  <Text style={[styles.emptyTitle, { color: theme.text }]}>No pending requests</Text>
                  <Text style={[styles.emptySubtitle, { color: theme.textSecondary }]}>
                    Friend requests will appear here
                  </Text>
                </View>
              }
            />
          )}
          
          {/* Search Tab */}
          {activeTab === 'search' && (
            <FlatList
              data={searchResults}
              keyExtractor={(item) => item.uid}
              renderItem={({ item }) => renderUserCard({ item, type: 'search' })}
              contentContainerStyle={styles.listContent}
              ListEmptyComponent={
                searching ? (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={theme.primary} />
                  </View>
                ) : searchQuery.length >= 2 ? (
                  <View style={styles.emptyState}>
                    <MaterialIcons name="search-off" size={48} color={theme.textTertiary} />
                    <Text style={[styles.emptyTitle, { color: theme.text }]}>No users found</Text>
                    <Text style={[styles.emptySubtitle, { color: theme.textSecondary }]}>
                      Try a different username
                    </Text>
                  </View>
                ) : (
                  <View style={styles.emptyState}>
                    <MaterialIcons name="search" size={48} color={theme.textTertiary} />
                    <Text style={[styles.emptyTitle, { color: theme.text }]}>Search for friends</Text>
                    <Text style={[styles.emptySubtitle, { color: theme.textSecondary }]}>
                      Enter a username to find people
                    </Text>
                  </View>
                )
              }
            />
          )}
        </>
      )}
    </View>
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
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 16,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  tabs: {
    flexDirection: 'row',
    borderBottomWidth: 1,
  },
  tab: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomWidth: 2,
  },
  tabText: {
    fontSize: 15,
    fontWeight: '500',
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 48,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    height: '100%',
  },
  listContent: {
    padding: 16,
    flexGrow: 1,
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    marginBottom: 10,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  userInfo: {
    flex: 1,
    marginLeft: 12,
  },
  displayName: {
    fontSize: 16,
    fontWeight: '600',
  },
  username: {
    fontSize: 14,
    marginTop: 2,
  },
  statsRow: {
    flexDirection: 'row',
    marginTop: 6,
    gap: 12,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: 13,
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
  },
  statusText: {
    fontSize: 13,
    fontWeight: '500',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 60,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingTop: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 20,
  },
  signInButton: {
    marginTop: 24,
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
  },
  signInButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default FriendsScreen;
